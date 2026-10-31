"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/* Warm palette — matches the landing page */
const CREAM = "#FBF4E6";
const CARD = "#FFFDF8";
const INK = "#15181D";
const MUTED = "#5C6570";
const BORDER = "#EFE6D2";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push("/drop");
    router.refresh();
  }

  return (
    <div
      style={{ backgroundColor: CREAM, color: INK, fontFamily: "var(--font-nunito)" }}
      className="flex min-h-screen items-center justify-center px-6"
    >
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2.5">
          <span
            className="inline-flex h-9 w-9 items-center justify-center rounded-[10px]"
            style={{ backgroundColor: "#8B5CF6" }}
          >
            <img src="/billie.png" alt="" className="h-7 w-7 object-contain" />
          </span>
          <span className="text-[18px] font-bold">byeBills</span>
        </Link>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border p-6"
          style={{ backgroundColor: CARD, borderColor: BORDER }}
        >
          <h1 className="mb-1 text-[22px] font-extrabold tracking-[-0.5px]">
            Einloggen
          </h1>
          <p className="mb-5 text-[14px]" style={{ color: MUTED }}>
            Melde dich mit deinem byeBills-Konto an.
          </p>

          {error && (
            <p className="mb-4 rounded-lg bg-red-50 p-2.5 text-sm text-red-600">
              {error}
            </p>
          )}

          <label className="mb-3 block">
            <span className="mb-1 block text-[13px] font-semibold" style={{ color: MUTED }}>
              E-Mail
            </span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand"
              style={{ borderColor: BORDER, backgroundColor: "#fff", color: INK }}
            />
          </label>

          <label className="mb-5 block">
            <span className="mb-1 block text-[13px] font-semibold" style={{ color: MUTED }}>
              Passwort
            </span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand"
              style={{ borderColor: BORDER, backgroundColor: "#fff", color: INK }}
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:opacity-60"
          >
            {loading ? "Einloggen …" : "Einloggen"}
          </button>
        </form>
      </div>
    </div>
  );
}
