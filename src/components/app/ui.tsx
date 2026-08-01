"use client";

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

/**
 * The app's primitives — the web counterparts of byebills-app/src/components
 * (Button, Card, TextField, Badge). Kept deliberately small: every colour comes
 * from a --bb-* token so light/dark is automatic and the two clients match.
 */

// ---------- Button ----------

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  fullWidth?: boolean;
  children?: ReactNode;
};

export function Button({
  label,
  variant = "primary",
  size = "md",
  fullWidth,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-2xl font-bold transition-all " +
    "active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 " +
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--bb-brand)]";

  const sizes = size === "sm" ? "px-4 py-2.5 text-sm" : "px-5 py-3.5 text-base";

  const variants: Record<string, string> = {
    primary: "bg-[var(--bb-brand)] text-[var(--bb-on-brand)] hover:bg-[var(--bb-brand-pressed)]",
    secondary:
      "bg-[var(--bb-surface)] text-[var(--bb-ink)] border-[1.5px] border-[var(--bb-border)] hover:border-[var(--bb-control-border)]",
    ghost: "text-[var(--bb-ink-600)] hover:bg-[var(--bb-subtle)]",
    danger: "bg-[var(--bb-error-tint)] text-[var(--bb-err-ink)] hover:brightness-95",
  };

  return (
    <button
      className={`${base} ${sizes} ${variants[variant]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {children ?? label}
    </button>
  );
}

// ---------- Card ----------

export function Card({
  children,
  className = "",
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={`rounded-3xl border border-[var(--bb-border)] bg-[var(--bb-surface)] ${
        padded ? "p-5" : ""
      } ${className}`}
      style={{ boxShadow: "var(--bb-shadow)" }}
    >
      {children}
    </div>
  );
}

// ---------- TextField ----------

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
};

export function TextField({ label, hint, className = "", ...rest }: FieldProps) {
  return (
    <label className="block">
      {label && (
        <span className="mb-2 block text-[13px] font-bold text-[var(--bb-ink)]">{label}</span>
      )}
      <input
        className={`w-full rounded-2xl border-[1.5px] border-[var(--bb-border)] bg-[var(--bb-surface)] px-4 py-3.5 text-base text-[var(--bb-ink)] outline-none transition-colors placeholder:text-[var(--bb-ink-400)] focus:border-[var(--bb-brand)] ${className}`}
        {...rest}
      />
      {hint && <span className="mt-1.5 block text-[13px] text-[var(--bb-ink-600)]">{hint}</span>}
    </label>
  );
}

// ---------- Badge ----------

const STATUS_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  paid: { bg: "var(--bb-success-tint)", fg: "var(--bb-brand-ink)", label: "Paid" },
  pending: { bg: "var(--bb-warning-tint)", fg: "var(--bb-warn-ink)", label: "Pending" },
  overdue: { bg: "var(--bb-error-tint)", fg: "var(--bb-err-ink)", label: "Overdue" },
  draft: { bg: "var(--bb-subtle)", fg: "var(--bb-ink-600)", label: "Draft" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.draft;
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-extrabold tracking-[0.4px] uppercase"
      style={{ backgroundColor: s.bg, color: s.fg }}
    >
      {s.label}
    </span>
  );
}

// ---------- Hustle avatar ----------

export function HustleDot({
  name,
  color,
  size = 40,
}: {
  name: string;
  color: string;
  size?: number;
}) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-extrabold text-white"
      style={{ backgroundColor: color, width: size, height: size, fontSize: size * 0.4 }}
      aria-hidden
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

// ---------- Empty state ----------

export function EmptyState({
  emoji,
  title,
  body,
  action,
}: {
  emoji: string;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-[var(--bb-brand-tint)] text-3xl">
        {emoji}
      </div>
      <p className="text-lg font-extrabold text-[var(--bb-ink)]">{title}</p>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-[var(--bb-ink-600)]">{body}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
