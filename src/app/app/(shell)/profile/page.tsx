"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAppData } from "@/components/app/app-data";
import { useAppTheme } from "@/components/app/theme";
import { Button, Card, HustleDot, TextField } from "@/components/app/ui";
import { nextHustleColor } from "@/lib/app/model";
import { createClient } from "@/lib/supabase/client";

const CURRENCIES = ["CHF", "EUR", "USD", "GBP"];

/** Profile — name, currency, hustles, theme, sign out. */
export default function ProfilePage() {
  const router = useRouter();
  const { profile, hustles, saveProfile, saveHustles } = useAppData();
  const { isDark, toggle } = useAppTheme();

  const [name, setName] = useState(profile?.name ?? "");
  const [currency, setCurrency] = useState(profile?.currency ?? "CHF");
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  async function persistProfile(patch: { name?: string; currency?: string }) {
    setStatus("saving");
    try {
      await saveProfile(patch);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 1800);
    } catch {
      setStatus("idle");
    }
  }

  async function addHustle() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    await saveHustles([
      ...hustles.map((h) => ({ id: h.id, name: h.name, color: h.color })),
      { id: String(Date.now()), name: trimmed, color: nextHustleColor(hustles.length) },
    ]);
    setDraft("");
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/app/login");
    router.refresh();
  }

  return (
    <div className="px-5 pt-8">
      <header>
        <h1 className="text-[30px] font-extrabold tracking-[-0.5px]">Profile</h1>
      </header>

      {/* Basics */}
      <Card className="mt-6">
        <div className="flex flex-col gap-5">
          <TextField
            label="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => name.trim() !== profile?.name && persistProfile({ name: name.trim() })}
          />

          <div>
            <p className="mb-2 text-[13px] font-bold">Currency</p>
            <div className="flex flex-wrap gap-2.5">
              {CURRENCIES.map((cur) => (
                <button
                  key={cur}
                  type="button"
                  onClick={() => {
                    setCurrency(cur);
                    void persistProfile({ currency: cur });
                  }}
                  aria-pressed={cur === currency}
                  className={`rounded-full border-[1.5px] px-[18px] py-[11px] text-sm font-bold transition-colors ${
                    cur === currency
                      ? "border-[var(--bb-brand)] bg-[var(--bb-brand)] text-[var(--bb-on-brand)]"
                      : "border-[var(--bb-border)] bg-[var(--bb-surface)] text-[var(--bb-ink-600)]"
                  }`}
                >
                  {cur}
                </button>
              ))}
            </div>
          </div>

          {status !== "idle" && (
            <p className="text-sm font-bold text-[var(--bb-brand)]">
              {status === "saving" ? "Saving …" : "Saved ✓"}
            </p>
          )}
        </div>
      </Card>

      {/* Hustles */}
      <section className="mt-7">
        <h2 className="text-lg font-extrabold">Your hustles</h2>
        <Card className="mt-3">
          <div className="flex flex-col gap-3">
            {hustles.length === 0 && (
              <p className="text-sm text-[var(--bb-ink-400)]">
                No hustles yet — add one below.
              </p>
            )}
            {hustles.map((h) => (
              <div key={h.id} className="flex items-center gap-3">
                <HustleDot name={h.name} color={h.color} size={36} />
                <p className="flex-1 truncate font-bold">{h.name}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-start gap-2.5">
            <div className="flex-1">
              <TextField
                placeholder="Add another hustle"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void addHustle();
                  }
                }}
              />
            </div>
            <Button size="sm" className="h-[54px]" disabled={!draft.trim()} onClick={addHustle}>
              Add
            </Button>
          </div>
        </Card>
      </section>

      {/* Modules */}
      <section className="mt-7">
        <h2 className="text-lg font-extrabold">Modules</h2>
        <Card className="mt-3">
          <Link href="/app/modules" className="flex items-center justify-between gap-3">
            <span>
              <span className="block font-bold">Connections &amp; imports</span>
              <span className="mt-0.5 block text-sm text-[var(--bb-ink-600)]">
                Connect a shop, mirror to a spreadsheet, share with your accountant.
              </span>
            </span>
            <span aria-hidden className="text-xl text-[var(--bb-ink-400)]">
              ›
            </span>
          </Link>
        </Card>
      </section>

      {/* Preferences */}
      <section className="mt-7">
        <h2 className="text-lg font-extrabold">Preferences</h2>
        <Card className="mt-3">
          <button
            type="button"
            onClick={toggle}
            className="flex w-full items-center justify-between"
          >
            <span className="font-bold">Dark mode</span>
            <span
              className={`relative h-7 w-12 rounded-full transition-colors ${
                isDark ? "bg-[var(--bb-brand)]" : "bg-[var(--bb-track)]"
              }`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${
                  isDark ? "left-6" : "left-1"
                }`}
              />
            </span>
          </button>
        </Card>
      </section>

      <div className="mt-7">
        <Button variant="danger" fullWidth onClick={signOut}>
          Sign out
        </Button>
        <p className="mt-4 text-center text-[13px] text-[var(--bb-ink-400)]">
          Signed in as {profile?.name || "you"} · byeBills web
        </p>
      </div>
    </div>
  );
}
