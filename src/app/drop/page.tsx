"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import InvoiceDrop from "@/components/invoice-drop";
import BooksSummary from "@/components/books-summary";
import type { Entry } from "@/lib/extraction";

/* Warm palette — matches the landing page */
const CREAM = "#FBF4E6";
const CARD = "#FFFDF8";
const INK = "#15181D";
const MUTED = "#5C6570";
const BORDER = "#EFE6D2";

const KEY_STORAGE = "drop-demo-key";

export default function DropPage() {
  const [accessKey, setAccessKey] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [locked, setLocked] = useState(false); // true after a wrong-password bounce
  const [entries, setEntries] = useState<Entry[]>([]);

  // Restore a previously entered password within this tab.
  useEffect(() => {
    const saved = sessionStorage.getItem(KEY_STORAGE);
    // sessionStorage only exists in the browser, so this has to run after mount
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved) setAccessKey(saved);
  }, []);

  function unlock(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    sessionStorage.setItem(KEY_STORAGE, input.trim());
    setAccessKey(input.trim());
    setLocked(false);
  }

  function handleUnauthorized() {
    sessionStorage.removeItem(KEY_STORAGE);
    setAccessKey(null);
    setLocked(true);
    setEntries([]);
  }

  function lock() {
    sessionStorage.removeItem(KEY_STORAGE);
    setAccessKey(null);
    setInput("");
    setLocked(false);
    setEntries([]);
  }

  return (
    <div
      style={{ backgroundColor: CREAM, color: INK, fontFamily: "var(--font-nunito)" }}
      className="min-h-screen"
    >
      <div className="mx-auto max-w-3xl px-6 py-10">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span
              className="inline-flex h-9 w-9 items-center justify-center rounded-[10px]"
              style={{ backgroundColor: "#8B5CF6" }}
            >
              <img src="/billie.png" alt="" className="h-7 w-7 object-contain" />
            </span>
            <span className="text-[18px] font-bold">byeBills</span>
          </Link>

          {accessKey && (
            <button
              onClick={lock}
              className="text-sm font-medium hover:underline"
              style={{ color: MUTED }}
            >
              Passwort ändern
            </button>
          )}
        </div>

        <div className="mb-8 text-center">
          <h1 className="text-[30px] font-extrabold tracking-[-1px]">
            Drop your invoices
          </h1>
          <p className="mt-2 text-[17px]" style={{ color: MUTED }}>
            Rechnungen, Fotos, PDFs — alle auf einmal reinziehen. Billie liest
            sie parallel aus und macht die Einnahmen-/Ausgaben-Abrechnung,
            fertig zum Export für Steuern &amp; Buchhaltung.
          </p>
        </div>

        {!accessKey ? (
          <form
            onSubmit={unlock}
            className="mx-auto max-w-sm rounded-2xl border p-6 text-center"
            style={{ backgroundColor: CARD, borderColor: BORDER }}
          >
            <p className="text-[17px] font-bold">Passwort</p>
            <p className="mt-1.5 mb-4 text-[14px]" style={{ color: MUTED }}>
              Diese Demo ist passwortgeschützt.
            </p>
            {locked && (
              <p className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-red-600">
                Falsches Passwort.
              </p>
            )}
            <input
              type="password"
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Passwort eingeben"
              className="mb-3 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand"
              style={{ borderColor: BORDER, backgroundColor: "#fff", color: INK }}
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover"
            >
              Entsperren
            </button>
          </form>
        ) : (
          <>
            <InvoiceDrop
              accessKey={accessKey}
              onChange={setEntries}
              onUnauthorized={handleUnauthorized}
            />
            {entries.length > 0 && <BooksSummary entries={entries} />}
          </>
        )}
      </div>
    </div>
  );
}
