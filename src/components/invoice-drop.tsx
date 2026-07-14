"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Entry, ExtractionData } from "@/lib/extraction";

/**
 * Standalone "drop everything" zone (demo — no login, no database).
 * Every dropped file runs IN PARALLEL through /api/extract-demo. Successful
 * extractions are reported to the parent via onChange, which rebuilds the
 * income/expense statement live. Deleting a file also updates the statement.
 */

type DropStatus = "queued" | "reading" | "done" | "error";

interface DropFile {
  id: string;
  file: File;
  status: DropStatus;
  error?: string;
  data?: ExtractionData;
}

export default function InvoiceDrop({
  accessKey,
  onChange,
  onUnauthorized,
}: {
  accessKey: string;
  onChange?: (entries: Entry[]) => void;
  onUnauthorized?: () => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<DropFile[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  // Report successful entries to the parent whenever the list changes.
  useEffect(() => {
    if (!onChange) return;
    const entries: Entry[] = files
      .filter((f) => f.status === "done" && f.data)
      .map((f) => ({ ...(f.data as ExtractionData), id: f.id, fileName: f.file.name }));
    onChange(entries);
  }, [files, onChange]);

  const patch = useCallback((id: string, next: Partial<DropFile>) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...next } : f)));
  }, []);

  const processOne = useCallback(
    async (item: DropFile) => {
      patch(item.id, { status: "reading" });
      const form = new FormData();
      form.append("file", item.file);
      try {
        const res = await fetch("/api/extract-demo", {
          method: "POST",
          headers: { "x-drop-key": accessKey },
          body: form,
        });
        if (res.status === 401) {
          patch(item.id, { status: "error", error: "Falsches Passwort" });
          onUnauthorized?.();
          return;
        }
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || `HTTP ${res.status}`);
        patch(item.id, { status: "done", data: result.extraction as ExtractionData });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Extraction failed";
        patch(item.id, { status: "error", error: msg });
      }
    },
    [patch, accessKey, onUnauthorized]
  );

  const handleFiles = useCallback(
    (fileList: FileList | File[]) => {
      const incoming = Array.from(fileList);
      if (incoming.length === 0) return;
      const newItems: DropFile[] = incoming.map((file) => ({
        id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
        file,
        status: "queued",
      }));
      setFiles((prev) => [...prev, ...newItems]);
      // Fire everything at the extractor in parallel.
      newItems.forEach((item) => void processOne(item));
    },
    [processOne]
  );

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const clearAll = useCallback(() => setFiles([]), []);

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

  const busy = files.some((f) => f.status === "reading");

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
            <button
              onClick={clearAll}
              className="text-xs font-medium text-zinc-500 hover:text-red-600"
            >
              Alle löschen
            </button>
          </div>
          <ul className="space-y-2">
            {files.map((f) => (
              <li
                key={f.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-zinc-700">{f.file.name}</p>
                  {f.data && (
                    <p className="truncate text-xs text-zinc-400">
                      {f.data.counterparty ?? "—"} ·{" "}
                      <span
                        className={f.data.type === "income" ? "text-brand" : "text-red-500"}
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
        <p className="mt-3 text-center text-xs text-zinc-400">Billie liest …</p>
      )}
    </div>
  );
}

function StatusBadge({ status, error }: { status: DropStatus; error?: string }) {
  const map: Record<DropStatus, { label: string; className: string }> = {
    queued: { label: "Queued", className: "text-zinc-400" },
    reading: { label: "Liest …", className: "text-brand" },
    done: { label: "Erledigt", className: "text-green-600" },
    error: { label: error || "Fehler", className: "text-red-600" },
  };
  const { label, className } = map[status];
  return <span className={`shrink-0 font-medium ${className}`}>{label}</span>;
}
