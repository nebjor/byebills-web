"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, HustleDot, TextField } from "@/components/app/ui";
import { nextHustleColor } from "@/lib/app/model";
import { createClient } from "@/lib/supabase/client";

/**
 * Two steps, ported from the mobile app:
 *   1. name.tsx  — your name + currency  ("STEP 1 OF 2")
 *   2. setup.tsx — add your hustles      ("STEP 2 OF 2")
 *
 * Unlike mobile (which writes AsyncStorage), completion is written to
 * app_profiles.onboarded_at so it counts on every device.
 */

const CURRENCIES = ["CHF", "EUR", "USD", "GBP"];

type Hustle = { id: string; name: string; color: string };

export default function Onboarding({
  userId,
  initialName,
  initialCurrency,
  initialHustles,
}: {
  userId: string;
  initialName: string;
  initialCurrency: string;
  initialHustles: Hustle[];
}) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState(initialName);
  const [currency, setCurrency] = useState(initialCurrency);
  const [hustles, setHustles] = useState<Hustle[]>(initialHustles);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function addHustle() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setHustles((prev) => [
      ...prev,
      // Date.now() matches the id scheme the mobile app uses for local hustles.
      { id: String(Date.now()), name: trimmed, color: nextHustleColor(prev.length) },
    ]);
    setDraft("");
  }

  async function finish() {
    setSaving(true);
    setError("");
    const supabase = createClient();
    const now = new Date().toISOString();

    try {
      const { error: profileError } = await supabase.from("app_profiles").upsert(
        {
          user_id: userId,
          name: name.trim(),
          currency,
          onboarded_at: now,
          updated_at: now,
        },
        { onConflict: "user_id" },
      );
      if (profileError) throw new Error(profileError.message);

      if (hustles.length) {
        const { error: hustleError } = await supabase.from("app_hustles").upsert(
          hustles.map((h) => ({
            user_id: userId,
            id: h.id,
            name: h.name,
            color: h.color,
            updated_at: now,
          })),
          { onConflict: "user_id,id" },
        );
        if (hustleError) throw new Error(hustleError.message);
      }

      // The shell layout reads onboarded_at on the server, so refresh the RSC
      // cache before navigating or it will bounce us straight back here.
      router.replace("/app");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col px-5 py-8">
      {step === 1 ? (
        <>
          <header>
            <p className="text-xs font-extrabold tracking-[0.6px] text-[var(--bb-brand)]">
              STEP 1 OF 2
            </p>
            <h1 className="mt-2 text-[30px] font-extrabold tracking-[-0.5px]">
              First, the basics
            </h1>
            <p className="mt-2 text-base text-[var(--bb-ink-600)]">
              So Billie can greet you and format your money the right way.
            </p>
          </header>

          <div className="mt-8 flex flex-col gap-6">
            <TextField
              label="Your name"
              placeholder="e.g. Joris"
              value={name}
              autoFocus
              autoCapitalize="words"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim()) setStep(2);
              }}
            />

            <div>
              <p className="mb-2 text-[13px] font-bold text-[var(--bb-ink)]">Currency</p>
              <div className="flex flex-wrap gap-2.5">
                {CURRENCIES.map((cur) => {
                  const active = cur === currency;
                  return (
                    <button
                      key={cur}
                      type="button"
                      onClick={() => setCurrency(cur)}
                      aria-pressed={active}
                      className={`rounded-full border-[1.5px] px-[18px] py-[11px] text-sm font-bold transition-colors ${
                        active
                          ? "border-[var(--bb-brand)] bg-[var(--bb-brand)] text-[var(--bb-on-brand)]"
                          : "border-[var(--bb-border)] bg-[var(--bb-surface)] text-[var(--bb-ink-600)]"
                      }`}
                    >
                      {cur}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-auto pt-8">
            <Button fullWidth disabled={!name.trim()} onClick={() => setStep(2)}>
              Continue
            </Button>
          </div>
        </>
      ) : (
        <>
          <header>
            <p className="text-xs font-extrabold tracking-[0.6px] text-[var(--bb-brand)]">
              STEP 2 OF 2
            </p>
            <h1 className="mt-2 text-[30px] font-extrabold tracking-[-0.5px]">
              Add your hustles
            </h1>
            <p className="mt-2 text-base text-[var(--bb-ink-600)]">
              Give each one a name. Billie keeps their income, expenses and totals separate. You
              can add more anytime.
            </p>
          </header>

          <div className="mt-6 flex items-start gap-2.5">
            <div className="flex-1">
              <TextField
                placeholder="e.g. Freelance design"
                value={draft}
                autoCapitalize="words"
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addHustle();
                  }
                }}
              />
            </div>
            <Button size="sm" className="h-[54px]" disabled={!draft.trim()} onClick={addHustle}>
              Add
            </Button>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            {hustles.length === 0 ? (
              <p className="mt-6 text-center text-sm text-[var(--bb-ink-400)]">
                No hustles yet — add your first above.
              </p>
            ) : (
              hustles.map((h) => (
                <div
                  key={h.id}
                  className="bb-rise flex items-center gap-3.5 rounded-2xl border-[1.5px] border-[var(--bb-border)] bg-[var(--bb-surface)] p-3.5"
                >
                  <HustleDot name={h.name} color={h.color} size={44} />
                  <p className="flex-1 text-lg font-bold">{h.name}</p>
                  <button
                    type="button"
                    onClick={() => setHustles((prev) => prev.filter((x) => x.id !== h.id))}
                    aria-label={`Remove ${h.name}`}
                    className="px-2 text-lg text-[var(--bb-ink-400)] hover:text-[var(--bb-error)]"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>

          {error && (
            <p className="mt-4 rounded-2xl bg-[var(--bb-error-tint)] px-4 py-3 text-sm font-semibold text-[var(--bb-err-ink)]">
              {error}
            </p>
          )}

          <div className="mt-auto flex flex-col gap-3 border-t border-[var(--bb-divider)] pt-5">
            <Button
              fullWidth
              variant={hustles.length ? "primary" : "secondary"}
              disabled={saving}
              onClick={finish}
            >
              {saving
                ? "Setting up …"
                : hustles.length
                  ? `Continue with ${hustles.length}`
                  : "Skip for now"}
            </Button>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-sm font-bold text-[var(--bb-ink-600)] hover:underline"
            >
              Back
            </button>
          </div>
        </>
      )}
    </div>
  );
}
