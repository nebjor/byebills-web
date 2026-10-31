import Link from "next/link";

import HeadlineExperiment from "@/components/headline-experiment";
import WaitlistForm from "@/components/waitlist-form";

/* Warm palette (kept local so the app's dark theme elsewhere is untouched) */
const CREAM = "#FBF4E6";
const CARD = "#FFFDF8";
const INK = "#15181D";
const MUTED = "#5C6570";
const BORDER = "#EFE6D2";

function Candle() {
  // Small byeBills icon tile
  return (
    <span className="inline-flex h-9 w-9 items-center justify-center rounded-[10px]" style={{ backgroundColor: "#8B5CF6" }}>
      <img src="/billie.png" alt="" className="h-7 w-7 object-contain" />
    </span>
  );
}

export default function Home() {
  return (
    <div style={{ backgroundColor: CREAM, color: INK, fontFamily: "var(--font-nunito)" }} className="min-h-screen">
      {/* ===== HERO (full viewport) ===== */}
      <section className="mx-auto flex min-h-[100svh] max-w-6xl items-center px-6 py-12">
        <div className="grid w-full grid-cols-1 items-center gap-12 lg:grid-cols-2">
          {/* Left */}
          <div>
            <div className="mb-6 flex items-center gap-2.5">
              <Candle />
              <span className="text-[18px] font-bold">byeBills</span>
            </div>

            <HeadlineExperiment />

            <p className="mt-6 max-w-[460px] text-[22px] leading-relaxed" style={{ color: MUTED }}>
              Snap a receipt. Billie does the rest.
            </p>

            <div
              className="mt-5 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[14px] font-bold"
              style={{ borderColor: BORDER, color: INK, backgroundColor: CARD }}
            >
              🇨🇭 Swiss-made · your data stays on Swiss servers
            </div>

            <div id="waitlist" className="mt-8 max-w-[540px]">
              <WaitlistForm />
              <p className="mt-4 text-[14px]" style={{ color: MUTED }}>
                Early access + a launch discount. No spam — unsubscribe anytime. See our{" "}
                <Link href="/privacy" className="font-semibold text-[color:var(--color-brand)]">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          </div>

          {/* Right — phone mockup + Billie */}
          <div className="relative flex justify-center">
            <PhoneMock />
            {/* Billie peeking at the bottom-left of the phone */}
            <img
              src="/billie.png"
              alt="Billie the flying invoice"
              className="absolute -bottom-4 left-2 h-28 w-28 object-contain drop-shadow-xl sm:left-6"
            />
          </div>
        </div>
      </section>

      {/* ===== SIMPLE BY DESIGN ===== */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <h2 className="text-[30px] font-extrabold tracking-[-1px] sm:text-[38px]">Simple by design</h2>
        <p className="mt-2 text-[17px]" style={{ color: MUTED }}>
          Everything you need to stay on top of your books. Nothing you don&apos;t.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
          <FeatureCard
            preview={<ScanPreview />}
            title="Scan your receipts & bills"
            desc="Point your camera at any receipt or invoice. Billie reads the amount, date and vendor in seconds."
          />
          <FeatureCard
            preview={<BooksPreview />}
            title="Let Billie do your books"
            desc="Every scan is sorted into income and expenses automatically — across all of your side hustles."
          />
          <FeatureCard
            preview={<ExportPreview />}
            title="Export for taxes & more"
            desc="Download a clean CSV with your receipt photos, ready for your accountant or the tax office."
          />
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer style={{ borderColor: BORDER }} className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="text-[16px] font-extrabold">byeBills</span>
            <span className="text-[14px]" style={{ color: MUTED }}>
              · Your books, sorted
            </span>
          </div>
          <div className="flex items-center gap-6 text-[14px]" style={{ color: MUTED }}>
            <Link href="/privacy" className="transition hover:text-[color:var(--color-brand)]">
              Privacy Policy
            </Link>
            <Link href="/terms" className="transition hover:text-[color:var(--color-brand)]">
              Terms of Use
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ---------- pieces ---------- */

function FeatureCard({
  preview,
  title,
  desc,
}: {
  preview: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div style={{ backgroundColor: CARD, borderColor: BORDER }} className="rounded-3xl border p-5">
      <div
        style={{ backgroundColor: CREAM, borderColor: BORDER }}
        className="mb-5 flex h-44 items-center justify-center overflow-hidden rounded-2xl border"
      >
        {preview}
      </div>
      <h3 className="text-[19px] font-bold">{title}</h3>
      <p className="mt-1.5 text-[15px] leading-relaxed" style={{ color: MUTED }}>
        {desc}
      </p>
    </div>
  );
}

function PhoneMock() {
  return (
    <div className="w-[320px] rounded-[46px] border-[10px] border-[#0f1116] bg-[#0f1116] shadow-2xl">
      <div style={{ backgroundColor: CREAM }} className="flex h-[600px] flex-col overflow-hidden rounded-[36px]">
        {/* Status bar with Dynamic Island + signal / wifi / battery */}
        <div className="relative pt-2.5">
          <div className="absolute left-1/2 top-2.5 h-6 w-24 -translate-x-1/2 rounded-full bg-[#0f1116]" />
          <div className="flex items-center justify-between px-6 pt-1.5" style={{ color: INK }}>
            <span className="text-[14px] font-bold">9:41</span>
            <div className="flex items-center gap-1.5">
              {/* cellular */}
              <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor" aria-hidden>
                <rect x="0" y="8" width="3" height="4" rx="1" />
                <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
                <rect x="10" y="3" width="3" height="9" rx="1" />
                <rect x="15" y="0" width="3" height="12" rx="1" />
              </svg>
              {/* wifi */}
              <svg width="17" height="12" viewBox="0 0 17 12" fill="currentColor" aria-hidden>
                <path d="M8.5 2C5.6 2 3 3.1 1 5l1.4 1.5C4 5 6.2 4 8.5 4s4.5 1 6.1 2.5L16 5C14 3.1 11.4 2 8.5 2z" />
                <path d="M8.5 6c-1.6 0-3.1.6-4.2 1.7L5.7 9.2C6.5 8.5 7.4 8.1 8.5 8.1s2 .4 2.8 1.1l1.4-1.5C11.6 6.6 10.1 6 8.5 6z" />
                <circle cx="8.5" cy="10.8" r="1.2" />
              </svg>
              {/* battery */}
              <svg width="26" height="13" viewBox="0 0 26 13" fill="none" aria-hidden>
                <rect x="0.5" y="0.5" width="21" height="12" rx="3.5" stroke="currentColor" opacity="0.4" />
                <rect x="2" y="2" width="18" height="9" rx="2" fill="currentColor" />
                <rect x="23" y="4" width="2.5" height="5" rx="1.2" fill="currentColor" opacity="0.4" />
              </svg>
            </div>
          </div>
        </div>
        <div className="flex-1 px-4 pb-2 pt-3">
          {/* header + avatar */}
          <div className="flex items-start justify-between px-1">
            <div>
              <p className="text-[12px] font-semibold" style={{ color: MUTED }}>
                Welcome back
              </p>
              <p className="flex items-center gap-1.5 text-[18px] font-extrabold">
                Hi there <img src="/billie.png" alt="Billie" className="h-6 w-6 object-contain" />
              </p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-bold text-white" style={{ backgroundColor: "#8B5CF6" }}>
              J
            </span>
          </div>

          {/* hustle chips */}
          <div className="mt-3 flex gap-2 overflow-hidden">
            <span className="whitespace-nowrap rounded-full bg-brand px-3 py-1.5 text-[11px] font-bold text-white">All hustles</span>
            <span className="flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px] font-bold" style={{ borderColor: BORDER, color: INK }}>
              <span className="h-1.5 w-1.5 rounded-full bg-brand" /> Baby sitting
            </span>
            <span className="flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px] font-bold" style={{ borderColor: BORDER, color: INK }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "#8B5CF6" }} /> 3D printing
            </span>
          </div>

          {/* NET */}
          <div style={{ backgroundColor: CARD, borderColor: BORDER }} className="mt-3 rounded-2xl border p-4">
            <p className="text-[10px] font-bold tracking-wider" style={{ color: MUTED }}>
              NET
            </p>
            <p className="mt-0.5 text-[24px] font-extrabold">CHF 1,240</p>
            <span className="mt-1.5 inline-block rounded-full bg-brand/15 px-2.5 py-0.5 text-[10px] font-bold text-brand">
              All hustles
            </span>
          </div>

          {/* income / expenses with icons */}
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <div style={{ backgroundColor: CARD, borderColor: BORDER }} className="rounded-2xl border p-3">
              <span className="mb-1.5 flex h-7 w-7 items-center justify-center rounded-lg bg-brand/15 text-[13px] font-bold text-brand">↗</span>
              <p className="text-[10px]" style={{ color: MUTED }}>
                Income
              </p>
              <p className="text-[13px] font-bold text-brand">+CHF 2.1k</p>
            </div>
            <div style={{ backgroundColor: CARD, borderColor: BORDER }} className="rounded-2xl border p-3">
              <span className="mb-1.5 flex h-7 w-7 items-center justify-center rounded-lg text-[13px] font-bold" style={{ backgroundColor: "#FBE3E3", color: "#E5484D" }}>↘</span>
              <p className="text-[10px]" style={{ color: MUTED }}>
                Expenses
              </p>
              <p className="text-[13px] font-bold text-[#E5484D]">-CHF 860</p>
            </div>
          </div>

          {/* cashflow chart */}
          <div style={{ backgroundColor: CARD, borderColor: BORDER }} className="mt-3 rounded-2xl border p-4">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-bold">Cashflow</p>
              <p className="text-[10px]" style={{ color: MUTED }}>
                Last 6 months
              </p>
            </div>
            <div className="mt-3 flex h-16 items-end justify-between gap-2">
              {[18, 14, 22, 16, 60, 12].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded"
                  style={{ height: h, backgroundColor: i === 4 ? "#E5484D" : "rgba(16,185,129,0.35)" }}
                />
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[9px] font-semibold" style={{ color: MUTED }}>
              {["Feb", "Mar", "Apr", "May", "Jun", "Jul"].map((m) => (
                <span key={m} className="flex-1 text-center">
                  {m}
                </span>
              ))}
            </div>
          </div>

          {/* recent activity */}
          <div className="mt-4 flex items-center justify-between px-1">
            <p className="text-[13px] font-bold">Recent activity</p>
            <span className="text-[11px] font-bold text-brand">See all</span>
          </div>
          <p className="mt-2 px-1 text-[10px] font-bold tracking-wider" style={{ color: MUTED }}>
            JUN 30
          </p>
          <div style={{ backgroundColor: CARD, borderColor: BORDER }} className="mt-1.5 flex items-center gap-2.5 rounded-2xl border p-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-bold text-white" style={{ backgroundColor: "#22C55E" }}>
              A
            </span>
            <div className="flex-1">
              <p className="text-[12px] font-bold">ALDI</p>
              <p className="text-[10px]" style={{ color: MUTED }}>
                Grocery shopping
              </p>
            </div>
            <span className="text-[12px] font-bold text-[#E5484D]">-44.70</span>
          </div>
        </div>

        {/* Bottom tab bar — the green + is the scan action, the core feature */}
        <div style={{ borderColor: BORDER }} className="flex items-center justify-around border-t px-5 pb-3 pt-2 text-[14px]">
          <span>🏠</span>
          <span>🧾</span>
          <span className="-mt-6 flex h-11 w-11 items-center justify-center rounded-2xl bg-brand text-[24px] font-bold text-white shadow-lg">
            +
          </span>
          <span>📊</span>
          <span>👤</span>
        </div>
      </div>
    </div>
  );
}

function ScanPreview() {
  return (
    <div className="relative flex h-24 w-16 items-center justify-center rounded-md bg-white shadow-sm">
      <div className="space-y-1.5">
        <div className="h-1 w-9 rounded bg-[#0f1116]" />
        <div className="h-1 w-6 rounded bg-[#cbd5d1]" />
        <div className="h-1 w-8 rounded bg-[#cbd5d1]" />
        <div className="h-1 w-5 rounded bg-[#cbd5d1]" />
        <div className="mt-2 h-2 w-7 rounded bg-[#0f1116]" />
      </div>
      {/* scan frame corners */}
      <div className="absolute -inset-2 rounded-lg border-2 border-brand/70" />
      <div className="absolute inset-x-2 top-1/2 h-0.5 bg-brand" />
    </div>
  );
}

function BooksPreview() {
  return (
    <div className="flex items-center gap-3">
      <img src="/billie.png" alt="" className="h-16 w-16 object-contain" />
      <div className="flex items-end gap-1.5">
        <div className="h-10 w-3 rounded bg-brand" />
        <div className="h-16 w-3 rounded bg-brand" />
        <div className="h-8 w-3 rounded bg-[#E5484D]" />
        <div className="h-12 w-3 rounded bg-brand" />
      </div>
    </div>
  );
}

function ExportPreview() {
  return (
    <div className="relative flex h-24 w-20 flex-col rounded-md bg-white p-2 shadow-sm">
      <div className="mb-1 h-1.5 w-10 rounded bg-brand" />
      {[10, 8, 11, 7, 9].map((w, i) => (
        <div key={i} className="my-[3px] flex justify-between">
          <div className="h-1 rounded bg-[#cbd5d1]" style={{ width: w * 2 }} />
          <div className="h-1 w-3 rounded bg-[#cbd5d1]" />
        </div>
      ))}
      <span className="absolute -bottom-3 -right-3 flex h-9 w-9 items-center justify-center rounded-full bg-brand text-white shadow-md">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </div>
  );
}
