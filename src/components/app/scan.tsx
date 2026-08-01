"use client";

import { useCallback, useRef, useState } from "react";

import { useAppData } from "@/components/app/app-data";
import { Button, Card, HustleDot } from "@/components/app/ui";
import { extractionToRow, money, nextHustleColor } from "@/lib/app/model";
import type { ExtractionData } from "@/lib/extraction";
import { createClient } from "@/lib/supabase/client";

/**
 * The app's InvoiceDrop: drag in a pile of receipts, they extract in parallel,
 * you check them, they save.
 *
 * Saving writes to app_transactions and uploads the image to the private
 * `receipts` bucket at <user_id>/<tx_id>.jpg. Storing the object PATH (not a
 * device-local file:// URI, which is what mobile does today) is what lets the
 * photo follow the row onto another device.
 */

type Status = "queued" | "reading" | "ready" | "error";

type Item = {
  id: string;
  file: File;
  status: Status;
  error?: string;
  data?: ExtractionData;
  hustleId?: string;
};

const REQUEST_TIMEOUT_MS = 60_000;

/** Shrink big photos before upload — faster, cheaper, and easier for the model. */
async function downscale(file: File, maxDim = 2000, quality = 0.85): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  if (file.type === "image/heic" || file.type === "image/heif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    if (scale >= 1) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export default function Scan() {
  const { profile, hustles, addTransaction, userId, saveHustles } = useAppData();
  const currency = profile?.currency ?? "CHF";

  const [items, setItems] = useState<Item[]>([]);
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(0);
  const [quotaError, setQuotaError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  const defaultHustle = hustles[0]?.id ?? "";

  const patch = useCallback((id: string, next: Partial<Item>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...next } : i)));
  }, []);

  const processOne = useCallback(
    async (item: Item) => {
      patch(item.id, { status: "reading", error: undefined });

      const prepared = await downscale(item.file);
      const form = new FormData();
      form.append("file", prepared);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const res = await fetch("/api/app/extract", {
          method: "POST",
          body: form,
          signal: controller.signal,
        });
        const result = await res.json();

        if (res.status === 402) {
          // Trial over or daily cap hit — the server already refused to spend.
          setQuotaError(
            result.reason === "daily_cap"
              ? `Daily scan limit reached (${result.used}/${result.cap}). Try again tomorrow.`
              : "Your free trial has ended. Upgrade to keep scanning.",
          );
          patch(item.id, { status: "error", error: result.error ?? "Scan limit reached" });
          return;
        }
        if (!res.ok) throw new Error(result.error || `HTTP ${res.status}`);

        patch(item.id, {
          status: "ready",
          data: result.extraction as ExtractionData,
          hustleId: defaultHustle,
        });
      } catch (err) {
        const isAbort = err instanceof DOMException && err.name === "AbortError";
        patch(item.id, {
          status: "error",
          error: isAbort ? "Timed out" : err instanceof Error ? err.message : "Couldn't read it",
        });
      } finally {
        clearTimeout(timer);
      }
    },
    [patch, defaultHustle],
  );

  const handleFiles = useCallback(
    (list: FileList | File[]) => {
      const incoming: Item[] = Array.from(list)
        .filter((f) => f.type.startsWith("image/") || f.type === "application/pdf")
        .map((file, i) => ({
          id: `${Date.now()}-${i}-${file.name}`,
          file,
          status: "queued" as const,
        }));
      if (!incoming.length) return;
      setItems((prev) => [...prev, ...incoming]);
      setSaved(0);
      // Fire them all off at once — each is an independent request.
      incoming.forEach((item) => void processOne(item));
    },
    [processOne],
  );

  async function saveAll() {
    const ready = items.filter((i) => i.status === "ready" && i.data);
    if (!ready.length) return;

    setSaving(true);
    const supabase = createClient();
    let count = 0;

    // If the user never created a hustle, make one so entries have a home.
    let hustleId = defaultHustle;
    if (!hustleId) {
      hustleId = String(Date.now());
      await saveHustles([
        ...hustles.map((h) => ({ id: h.id, name: h.name, color: h.color })),
        { id: hustleId, name: "My hustle", color: nextHustleColor(hustles.length) },
      ]);
    }

    for (const item of ready) {
      const txId = crypto.randomUUID();
      let imagePath: string | null = null;

      // Upload the receipt photo first; a failure here must not lose the entry.
      if (item.file.type.startsWith("image/")) {
        const path = `${userId}/${txId}.jpg`;
        const prepared = await downscale(item.file);
        const { error } = await supabase.storage
          .from("receipts")
          .upload(path, prepared, { contentType: prepared.type, upsert: true });
        if (!error) imagePath = path;
      }

      try {
        await addTransaction(
          extractionToRow(item.data as ExtractionData, {
            userId,
            hustleId: item.hustleId || hustleId,
            id: txId,
            imagePath,
          }),
        );
        count += 1;
        setItems((prev) => prev.filter((i) => i.id !== item.id));
      } catch {
        patch(item.id, { status: "error", error: "Couldn't save — try again" });
      }
    }

    setSaved(count);
    setSaving(false);
  }

  const readyCount = items.filter((i) => i.status === "ready").length;
  const busyCount = items.filter((i) => i.status === "queued" || i.status === "reading").length;

  return (
    <div className="px-5 pt-8">
      <header>
        <h1 className="text-[30px] font-extrabold tracking-[-0.5px]">Scan</h1>
        <p className="mt-2 text-base text-[var(--bb-ink-600)]">
          Drop receipts, invoices or PDFs — all at once. Billie reads them in parallel.
        </p>
      </header>

      {quotaError && (
        <div className="mt-5 rounded-2xl bg-[var(--bb-warning-tint)] px-4 py-3.5">
          <p className="text-sm font-bold text-[var(--bb-warn-ink)]">{quotaError}</p>
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragEnter={(e) => {
          e.preventDefault();
          dragDepth.current += 1;
          setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          dragDepth.current -= 1;
          if (dragDepth.current <= 0) setDragging(false);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          dragDepth.current = 0;
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`mt-6 rounded-3xl border-2 border-dashed p-8 text-center transition-colors ${
          dragging
            ? "border-[var(--bb-brand)] bg-[var(--bb-selected-tint)]"
            : "border-[var(--bb-control-border)] bg-[var(--bb-surface)]"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/billie.png" alt="" className="mx-auto h-16 w-16 object-contain" />
        <p className="mt-3 text-lg font-extrabold">Drop them here</p>
        <p className="mt-1 text-sm text-[var(--bb-ink-600)]">JPG, PNG or PDF · up to 10 MB each</p>

        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Button size="sm" onClick={() => inputRef.current?.click()}>
            Choose files
          </Button>
          {/* capture="environment" opens the camera directly on a phone. */}
          <Button size="sm" variant="secondary" onClick={() => cameraRef.current?.click()}>
            Take a photo
          </Button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {saved > 0 && items.length === 0 && (
        <div className="bb-rise mt-6 rounded-2xl bg-[var(--bb-brand-tint)] px-4 py-3.5 text-center">
          <p className="font-extrabold text-[var(--bb-brand-ink)]">
            Saved {saved} {saved === 1 ? "entry" : "entries"} ✓
          </p>
          <p className="mt-0.5 text-sm text-[var(--bb-brand-ink)]">
            They&apos;re on your phone too.
          </p>
        </div>
      )}

      {/* Queue */}
      {items.length > 0 && (
        <section className="mt-6 flex flex-col gap-3">
          {items.map((item) => (
            <Card key={item.id} className="bb-rise">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{item.file.name}</p>

                  {item.status === "queued" && (
                    <p className="mt-1 text-sm text-[var(--bb-ink-400)]">Queued …</p>
                  )}
                  {item.status === "reading" && (
                    <p className="mt-1 flex items-center gap-2 text-sm text-[var(--bb-ink-600)]">
                      <Spinner /> Billie is reading it …
                    </p>
                  )}
                  {item.status === "error" && (
                    <p className="mt-1 text-sm font-semibold text-[var(--bb-err-ink)]">
                      {item.error}
                    </p>
                  )}

                  {item.status === "ready" && item.data && (
                    <>
                      <p className="mt-1 text-lg font-extrabold">
                        {item.data.counterparty || "Unknown"}
                      </p>
                      <p className="text-sm text-[var(--bb-ink-600)]">
                        {item.data.description || "—"}
                        {item.data.document_date ? ` · ${item.data.document_date}` : ""}
                      </p>

                      {hustles.length > 1 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {hustles.map((h) => {
                            const active = (item.hustleId || defaultHustle) === h.id;
                            return (
                              <button
                                key={h.id}
                                type="button"
                                onClick={() => patch(item.id, { hustleId: h.id })}
                                className={`flex items-center gap-1.5 rounded-full border-[1.5px] px-3 py-1.5 text-[13px] font-bold transition-colors ${
                                  active
                                    ? "border-[var(--bb-brand)] bg-[var(--bb-selected-tint)] text-[var(--bb-brand-ink)]"
                                    : "border-[var(--bb-border)] text-[var(--bb-ink-600)]"
                                }`}
                              >
                                <HustleDot name={h.name} color={h.color} size={16} />
                                {h.name}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="flex shrink-0 flex-col items-end gap-2">
                  {item.status === "ready" && item.data && (
                    <p
                      className="text-lg font-extrabold tabular-nums"
                      style={{
                        color:
                          item.data.type === "income" ? "var(--bb-brand)" : "var(--bb-ink)",
                      }}
                    >
                      {item.data.type === "income" ? "+" : "−"}
                      {money(Math.abs(item.data.amount), item.data.currency || currency)}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => setItems((prev) => prev.filter((i) => i.id !== item.id))}
                    aria-label={`Remove ${item.file.name}`}
                    className="text-[var(--bb-ink-400)] hover:text-[var(--bb-error)]"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </Card>
          ))}

          <Button
            fullWidth
            className="mt-2"
            disabled={!readyCount || saving}
            onClick={saveAll}
          >
            {saving
              ? "Saving …"
              : busyCount
                ? `Reading ${busyCount} more …`
                : `Save ${readyCount} ${readyCount === 1 ? "entry" : "entries"}`}
          </Button>
        </section>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <span
      className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--bb-track)] border-t-[var(--bb-brand)]"
      aria-hidden
    />
  );
}
