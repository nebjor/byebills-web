"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import InvoiceDrop from "@/components/invoice-drop";

/* Warm palette — matches the landing page */
const CREAM = "#FBF4E6";
const CARD = "#FFFDF8";
const INK = "#15181D";
const MUTED = "#5C6570";
const BORDER = "#EFE6D2";

type Business = { id: string; name: string; currency: string };
type LoadState = "loading" | "unauthenticated" | "no-business" | "ready";

export default function DropPage() {
  const [state, setState] = useState<LoadState>("loading");
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [businessId, setBusinessId] = useState<string>("");
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setState("unauthenticated");
        return;
      }
      const { data } = await supabase
        .from("businesses")
        .select("id, name, currency")
        .eq("archived", false)
        .order("created_at", { ascending: true });

      const list = (data ?? []) as Business[];
      if (list.length === 0) {
        setState("no-business");
        return;
      }
      setBusinesses(list);
      setBusinessId(list[0].id);
      setState("ready");
    })();
  }, []);

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

          {state === "ready" && businesses.length > 1 && (
            <select
              value={businessId}
              onChange={(e) => setBusinessId(e.target.value)}
              className="rounded-lg border px-3 py-1.5 text-sm font-semibold"
              style={{ borderColor: BORDER, backgroundColor: CARD, color: INK }}
            >
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="mb-8 text-center">
          <h1 className="text-[30px] font-extrabold tracking-[-1px]">
            Drop your invoices
          </h1>
          <p className="mt-2 text-[17px]" style={{ color: MUTED }}>
            Alle auf einmal — Billie liest sie parallel aus und verbucht sie
            direkt in deine Buchhaltung.
          </p>
        </div>

        {/* States */}
        {state === "loading" && (
          <p className="py-16 text-center text-sm" style={{ color: MUTED }}>
            Lädt …
          </p>
        )}

        {state === "unauthenticated" && (
          <Info
            title="Bitte einloggen"
            body="Zum Ablegen von Rechnungen musst du angemeldet sein."
          />
        )}

        {state === "no-business" && (
          <Info
            title="Kein Business gefunden"
            body="Lege zuerst ein Business an, dann kannst du hier Rechnungen ablegen."
          />
        )}

        {state === "ready" && (
          <>
            <InvoiceDrop
              businessId={businessId}
              onComplete={(results) =>
                setSavedCount(
                  (c) => c + results.filter((r) => r.status === "saved").length
                )
              }
            />
            {savedCount > 0 && (
              <p className="mt-6 text-center text-sm" style={{ color: MUTED }}>
                {savedCount} {savedCount === 1 ? "Beleg" : "Belege"} in dieser
                Sitzung verbucht.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Info({ title, body }: { title: string; body: string }) {
  return (
    <div
      className="mx-auto max-w-md rounded-2xl border p-6 text-center"
      style={{ backgroundColor: CARD, borderColor: BORDER }}
    >
      <p className="text-[17px] font-bold">{title}</p>
      <p className="mt-1.5 text-[15px]" style={{ color: MUTED }}>
        {body}
      </p>
    </div>
  );
}
