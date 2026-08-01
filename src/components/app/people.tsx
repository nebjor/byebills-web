"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAppData } from "@/components/app/app-data";
import { Button, Card, EmptyState, TextField } from "@/components/app/ui";
import type { ShareRole } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/client";

/**
 * Who can see your books — and whose books you can see.
 *
 * Invites are email-bound: accepting requires signing in with the invited
 * address, so a forwarded link doesn't hand over someone's financial records.
 */

type Share = {
  id: string;
  invite_email: string;
  role: ShareRole;
  status: "pending" | "accepted" | "revoked";
  token: string;
  accepted_at: string | null;
};

type SharedBook = { owner_user_id: string; owner_name: string; role: ShareRole };

export default function People({
  userId,
  initialShares,
  sharedBooks,
}: {
  userId: string;
  initialShares: Share[];
  sharedBooks: SharedBook[];
}) {
  const router = useRouter();
  const { ownerId } = useAppData();

  const [shares, setShares] = useState<Share[]>(initialShares);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ShareRole>("viewer");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const viewingOwnBooks = ownerId === userId;

  async function invite() {
    const address = email.trim().toLowerCase();
    if (!address) return;
    setBusy(true);
    setError("");

    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("app_shares")
      .insert({ owner_user_id: userId, invite_email: address, role })
      .select("id,invite_email,role,status,token,accepted_at")
      .single();

    if (insertError || !data) {
      setError(
        insertError?.code === "23505"
          ? "You've already invited that address."
          : (insertError?.message ?? "Could not create the invite."),
      );
      setBusy(false);
      return;
    }

    setShares((prev) => [data as Share, ...prev]);
    setEmail("");
    setBusy(false);
    router.refresh();
  }

  async function revoke(id: string) {
    const before = shares;
    setShares((prev) => prev.filter((s) => s.id !== id));

    const supabase = createClient();
    const { error: revokeError } = await supabase
      .from("app_shares")
      .update({ status: "revoked" })
      .eq("id", id)
      .eq("owner_user_id", userId);

    if (revokeError) {
      setShares(before);
      setError(revokeError.message);
      return;
    }
    router.refresh();
  }

  async function copyLink(share: Share) {
    const url = `${window.location.origin}/app/join/${share.token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(share.id);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard blocked (insecure context, or the user declined) — show the
      // link so it can still be copied by hand rather than failing silently.
      setError(url);
    }
  }

  return (
    <div className="px-5 pt-8">
      <header>
        <h1 className="text-[30px] font-extrabold tracking-[-0.5px]">People</h1>
        <p className="mt-2 text-base text-[var(--bb-ink-600)]">
          Give your accountant, your co-founder or your club&apos;s auditors access to these
          books.
        </p>
      </header>

      {!viewingOwnBooks && (
        <div className="mt-5 rounded-2xl bg-[var(--bb-warning-tint)] px-4 py-3.5">
          <p className="text-sm font-bold text-[var(--bb-warn-ink)]">
            You&apos;re viewing shared books. This page manages access to <em>your own</em>{" "}
            books.
          </p>
        </div>
      )}

      {/* Invite */}
      <Card className="mt-6">
        <h2 className="text-base font-extrabold">Invite someone</h2>
        <div className="mt-4 flex flex-col gap-4">
          <TextField
            label="Their email"
            type="email"
            placeholder="name@treuhand.ch"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            hint="They'll need to sign in with this exact address."
          />

          <div>
            <p className="mb-2 text-[13px] font-bold">What they can do</p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { key: "viewer", label: "View only", note: "Accountant, auditor" },
                  { key: "editor", label: "View & edit", note: "Partner, co-founder" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setRole(opt.key)}
                  aria-pressed={role === opt.key}
                  className={`rounded-2xl border-[1.5px] px-4 py-2.5 text-left transition-colors ${
                    role === opt.key
                      ? "border-[var(--bb-brand)] bg-[var(--bb-selected-tint)]"
                      : "border-[var(--bb-border)]"
                  }`}
                >
                  <span className="block text-sm font-bold">{opt.label}</span>
                  <span className="block text-[12px] text-[var(--bb-ink-600)]">{opt.note}</span>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="rounded-2xl bg-[var(--bb-error-tint)] px-4 py-3 text-sm font-semibold break-all text-[var(--bb-err-ink)]">
              {error}
            </p>
          )}

          <Button size="sm" disabled={!email.trim() || busy} onClick={invite}>
            {busy ? "Inviting …" : "Send invite"}
          </Button>
        </div>
      </Card>

      {/* Existing */}
      <section className="mt-7">
        <h2 className="text-lg font-extrabold">Has access</h2>
        {shares.length === 0 ? (
          <Card className="mt-3" padded={false}>
            <EmptyState emoji="🔑" title="Nobody yet" body="Only you can see these books." />
          </Card>
        ) : (
          <Card className="mt-3">
            <div className="flex flex-col gap-4">
              {shares.map((s) => (
                <div key={s.id} className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{s.invite_email}</p>
                    <p className="mt-0.5 text-[13px] text-[var(--bb-ink-600)]">
                      {s.role === "viewer" ? "View only" : "View & edit"} ·{" "}
                      {s.status === "accepted" ? "Active" : "Invite pending"}
                    </p>
                    {s.status === "pending" && (
                      <button
                        type="button"
                        onClick={() => copyLink(s)}
                        className="mt-1.5 text-[13px] font-bold text-[var(--bb-brand)] hover:underline"
                      >
                        {copied === s.id ? "Link copied ✓" : "Copy invite link"}
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => revoke(s.id)}
                    className="shrink-0 text-[13px] font-bold text-[var(--bb-err-ink)] hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </Card>
        )}
        <p className="mt-3 text-[13px] text-[var(--bb-ink-400)]">
          We don&apos;t email invites yet — copy the link and send it yourself.
        </p>
      </section>

      {/* Books shared with me */}
      {sharedBooks.length > 0 && (
        <section className="mt-7">
          <h2 className="text-lg font-extrabold">Books shared with you</h2>
          <Card className="mt-3">
            <div className="flex flex-col gap-3">
              {sharedBooks.map((b) => (
                <Link
                  key={b.owner_user_id}
                  href={`/app?books=${b.owner_user_id}`}
                  className="flex items-center justify-between gap-3 rounded-2xl px-1 py-1.5 hover:bg-[var(--bb-subtle)]"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold">{b.owner_name}</span>
                    <span className="block text-[13px] text-[var(--bb-ink-600)]">
                      {b.role === "viewer" ? "View only" : "View & edit"}
                    </span>
                  </span>
                  <span aria-hidden className="text-xl text-[var(--bb-ink-400)]">
                    ›
                  </span>
                </Link>
              ))}
            </div>
          </Card>
        </section>
      )}
    </div>
  );
}
