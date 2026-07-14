"use client";

import { useState } from "react";
import Link from "next/link";
import InvoiceDrop from "@/components/invoice-drop";
import BooksSummary from "@/components/books-summary";
import type { Entry } from "@/lib/extraction";

/* Warm palette — matches the landing page */
const CREAM = "#FBF4E6";
const INK = "#15181D";
const MUTED = "#5C6570";

export default function DropPage() {
  const [entries, setEntries] = useState<Entry[]>([]);

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

        <InvoiceDrop onChange={setEntries} />

        {entries.length > 0 && <BooksSummary entries={entries} />}
      </div>
    </div>
  );
}
