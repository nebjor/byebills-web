"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Bottom tab bar — the same five destinations as the mobile app's tab layout
 * (Home, History, Scan, Reports, Profile), with Scan raised in the middle.
 */

const TABS = [
  { href: "/app", label: "Home", icon: HomeIcon },
  { href: "/app/transactions", label: "History", icon: ListIcon },
  { href: "/app/scan", label: "Scan", icon: ScanIcon, center: true },
  { href: "/app/reports", label: "Reports", icon: ChartIcon },
  { href: "/app/profile", label: "Profile", icon: UserIcon },
];

export default function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="bb-safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-[var(--bb-border)] bg-[var(--bb-surface)]/95 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-stretch justify-around px-2 py-1.5">
        {TABS.map((tab) => {
          const active =
            tab.href === "/app" ? pathname === "/app" : pathname.startsWith(tab.href);

          if (tab.center) {
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className="-mt-6 flex flex-col items-center gap-1"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--bb-brand)] shadow-lg transition-transform active:scale-95">
                  <tab.icon className="h-7 w-7 text-[var(--bb-on-brand)]" />
                </span>
                <span className="text-[10px] font-bold text-[var(--bb-brand)]">{tab.label}</span>
              </Link>
            );
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 transition-colors ${
                active
                  ? "text-[var(--bb-brand)]"
                  : "text-[var(--bb-ink-400)] hover:text-[var(--bb-ink-600)]"
              }`}
            >
              <tab.icon className="h-6 w-6" />
              <span className="text-[10px] font-bold">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

type IconProps = { className?: string };

function HomeIcon({ className }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" />
    </svg>
  );
}

function ListIcon({ className }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.008v.008H3.75V6.75zM3.75 12h.008v.008H3.75V12zm0 5.25h.008v.008H3.75v-.008z" />
    </svg>
  );
}

function ScanIcon({ className }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.04l-.821 1.315z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
    </svg>
  );
}

function ChartIcon({ className }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}

function UserIcon({ className }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}
