"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { Button } from "@/components/app/ui";
import { createClient } from "@/lib/supabase/client";

/**
 * App sign-in.
 *
 * The mobile app uses native Google/Apple sign-in and hands Supabase an ID
 * token (signInWithIdToken). The web can't do that, so it uses the OAuth
 * redirect flow instead — different mechanism, SAME Supabase project, so the
 * resulting auth.uid() is identical and the phone and the browser see the same
 * rows. That identity match is the whole basis of the cross-device sync.
 */

function LoginInner() {
  const params = useSearchParams();
  const [busy, setBusy] = useState<"google" | "apple" | null>(null);
  const [error, setError] = useState(params.get("error") ?? "");

  async function signIn(provider: "google" | "apple") {
    setBusy(provider);
    setError("");

    const supabase = createClient();
    const next = params.get("next") ?? "/app";
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        // Always show the account chooser — the mobile app force-signs-out of
        // Google for the same reason, so switching accounts is possible.
        queryParams: provider === "google" ? { prompt: "select_account" } : undefined,
      },
    });

    if (authError) {
      setError(authError.message);
      setBusy(null);
    }
    // On success the browser navigates away to the provider.
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[var(--bb-purple)]">
      {/* The cream "hill" Billie lands on — same composition as the app's sign-in. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[52svh] aspect-square w-[200vw] -translate-x-1/2 rounded-full bg-[var(--bb-cream)]"
      />

      <div className="absolute left-0 right-0 top-[calc(37svh-6rem)] flex justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/billie.png"
          alt="Billie, the flying invoice"
          className="bb-rise h-40 w-40 object-contain drop-shadow-2xl sm:h-48 sm:w-48"
        />
      </div>

      <div className="relative mt-auto flex flex-col items-center px-7 pb-10 pt-[calc(52svh+3rem)]">
        <div className="w-full max-w-[420px] text-center">
          <h1 className="text-[30px] font-extrabold tracking-[-0.5px] text-[var(--bb-ink)]">
            Hey, I&apos;m Billie!
          </h1>
          <p className="mt-2.5 text-xl font-bold text-[var(--bb-brand)]">
            Your flying invoice assistant
          </p>
          <p className="mx-auto mt-4 max-w-[360px] text-[22px] leading-8 text-[var(--bb-ink-600)]">
            Snap your receipts — I&apos;ll do the bookkeeping automatically.
          </p>

          {error && (
            <p className="mt-5 rounded-2xl bg-[var(--bb-error-tint)] px-4 py-3 text-sm font-semibold text-[var(--bb-err-ink)]">
              {error}
            </p>
          )}

          <Button
            fullWidth
            className="mt-6"
            disabled={busy !== null}
            onClick={() => signIn("google")}
          >
            <GoogleMark />
            {busy === "google" ? "Opening Google …" : "Continue with Google"}
          </Button>

          <Button
            variant="secondary"
            fullWidth
            className="mt-3"
            disabled={busy !== null}
            onClick={() => signIn("apple")}
          >
            {busy === "apple" ? "Opening Apple …" : "Continue with Apple"}
          </Button>

          <p className="mt-6 text-[13px] text-[var(--bb-ink-400)]">
            Same account as the byeBills app — your scans sync automatically.
          </p>
        </div>
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.02-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.98 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.02-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.02 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

export default function AppLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--bb-purple)]" />}>
      <LoginInner />
    </Suspense>
  );
}
