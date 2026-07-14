"use client";

import { useCallback, useRef, useState } from "react";
import posthog from "posthog-js";

/**
 * Bulk "drop everything" zone. Every dropped file runs IN PARALLEL through
 * /api/extract, then is auto-saved via /api/transactions — hands-off, so a
 * whole stack of invoices becomes booked Milchbüechli entries in one go.
 *
 * Single-file verify/edit still lives in <ScanModal />; this is the bulk path.
 */

type ExtractionData = {
  type: "income" | "expense";
  document_type: "invoice" | "bill";
  status: "pending" | "paid" | "unpaid";
  counterparty: string | null;
  description: string | null;
  amount: number;
  currency: string;
  payment_method: string | null;
  document_ref: string | null;
  document_date: string | null;
  due_date: string | null;
  vat_amount: number | null;
  vat_rate: number | null;
};

type DropStatus =
  | "queued"
  | "extracting"
  | "saving"
  | "saved"
  | "duplicate"
  | "error";

interface DropFile {
  id: string;
  file: File;
  status: DropStatus;
  error?: string;
  data?: ExtractionData;
}

export interface DropResult {
  fileName: string;
  status: DropStatus;
  data?: ExtractionData;
  error?: string;
}

export default function InvoiceDrop({
  businessId,
  onComplete,
}: {
  businessId: string;
  onComplete?: (results: DropResult[]) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<DropFile[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  const patch = useCallback((id: string, next: Partial<DropFile>) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...next } : f)));
  }, []);

  const processOne = useCallback(
    async (item: DropFile): Promise<DropResult> => {
      // 1) Extract
      patch(item.id, { status: "extracting" });
      const form = new FormData();
      form.append("file", item.file);
      form.append("business_id", businessId);

      let extraction: ExtractionData;
      let duplicateHash: string | null = null;
      try {
        const res = await fetch("/api/extract", { method: "POST", body: form });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || `HTTP ${res.status}`);
        extraction = result.extraction as ExtractionData;
        duplicateHash = result.duplicateHash ?? null;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Extraction failed";
        patch(item.id, { status: "error", error: msg });
        return { fileName: item.file.name, status: "error", error: msg };
      }

      // 2) Auto-save
      patch(item.id, { status: "saving", data: extraction });
      try {
        const res = await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...extraction,
            business_id: businessId,
            duplicate_hash: duplicateHash,
          }),
        });
        if (res.status === 409) {
          patch(item.id, { status: "duplicate", data: extraction });
          return { fileName: item.file.name, status: "duplicate", data: extraction };
        }
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || `HTTP ${res.status}`);
        patch(item.id, { status: "saved", data: extraction });
        return { fileName: item.file.name, status: "saved", data: extraction };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Save failed";
        patch(item.id, { status: "error", error: msg, data: extraction });
        return { fileName: item.file.name, status: "error", error: msg };
      }
    },
    [businessId, patch]
  );

  const handleFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const incoming = Array.from(fileList);
      if (incoming.length === 0) return;

      posthog.capture("bulk_drop_started", { count: incoming.length });

      const newItems: DropFile[] = incoming.map((file) => ({
        id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
        file,
        status: "queued",
      }));
      setFiles((prev) => [...prev, ...newItems]);

      // Fire every file through extract + save in parallel.
      const results = await Promise.all(newItems.map(processOne));
      posthog.capture("bulk_drop_finished", {
        count: results.length,
        saved: results.filter((r) => r.status === "saved").length,
        duplicates: results.filter((r) => r.status === "duplicate").length,
        errors: results.filter((r) => r.status === "error").length,
      });
      onComplete?.(results);
    },
    [processOne, onComplete]
  );

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const clearFinished = useCallback(() => {
    setFiles((prev) =>
      prev.filter(
        (f) =>
          f.status !== "saved" &&
          f.status !== "duplicate" &&
          f.status !== "error"
      )
    );
  }, []);

  const onDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragDepth.current += 1;
    setIsDragging(true);
  };
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragDepth.current -= 1;
    if (dragDepth.current <= 0) setIsDragging(false);
  };
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragDepth.current = 0;
    setIsDragging(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  };

  const busy = files.some(
    (f) => f.status === "extracting" || f.status === "saving"
  );

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div
        role="button"
        tabIndex={0}
        aria-label="Rechnungen hier ablegen"
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        className={[
          "flex cursor-pointer select-none flex-col items-center justify-center",
          "rounded-2xl border-2 border-dashed px-8 py-16 text-center outline-none transition-colors",
          isDragging
            ? "border-brand bg-brand-light"
            : "border-zinc-300 bg-white/60 hover:border-brand",
        ].join(" ")}
      >
        <p className="text-lg font-bold text-zinc-800">Drop everything</p>
        <p className="mt-1 text-sm text-zinc-500">Billie takes care of the rest.</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {files.length > 0 && (
        <>
          <div className="mb-2 mt-4 flex items-center justify-between px-1">
            <span className="text-xs text-zinc-400">
              {files.length} {files.length === 1 ? "Datei" : "Dateien"}
            </span>
            {files.some(
              (f) =>
                f.status === "saved" ||
                f.status === "duplicate" ||
                f.status === "error"
            ) && (
              <button
                onClick={clearFinished}
                className="text-xs font-medium text-zinc-500 hover:text-red-600"
              >
                Erledigte löschen
              </button>
            )}
          </div>
          <ul className="space-y-2">
            {files.map((f) => (
              <li
                key={f.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-zinc-700">
                    {f.file.name}
                  </p>
                  {f.data && (
                    <p className="truncate text-xs text-zinc-400">
                      {f.data.counterparty ?? "—"} ·{" "}
                      <span
                        className={
                          f.data.type === "income"
                            ? "text-brand"
                            : "text-red-500"
                        }
                      >
                        {f.data.type === "income" ? "+" : "−"}
                        {f.data.amount.toFixed(2)} {f.data.currency}
                      </span>
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge status={f.status} error={f.error} />
                  <button
                    onClick={() => removeFile(f.id)}
                    aria-label={`${f.file.name} entfernen`}
                    title="Entfernen"
                    className="flex h-6 w-6 items-center justify-center rounded-md text-lg leading-none text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-red-600"
                  >
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {busy && (
        <p className="mt-3 text-center text-xs text-zinc-400">
          Billie liest &amp; verbucht …
        </p>
      )}
    </div>
  );
}

function StatusBadge({ status, error }: { status: DropStatus; error?: string }) {
  const map: Record<DropStatus, { label: string; className: string }> = {
    queued: { label: "Queued", className: "text-zinc-400" },
    extracting: { label: "Liest …", className: "text-brand" },
    saving: { label: "Speichert …", className: "text-brand" },
    saved: { label: "Verbucht", className: "text-green-600" },
    duplicate: { label: "Duplikat", className: "text-amber-600" },
    error: { label: error || "Fehler", className: "text-red-600" },
  };
  const { label, className } = map[status];
  return <span className={`shrink-0 font-medium ${className}`}>{label}</span>;
}
