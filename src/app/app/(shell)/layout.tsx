import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import AppNav from "@/components/app/nav";
import { AppDataProvider } from "@/components/app/app-data";
import OwnerBanner from "@/components/app/owner-banner";
import { ACTIVE_BOOKS_COOKIE } from "@/lib/app/books";
import type { AccessRole, ShareRole } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

/**
 * Signed-in shell: loads the books on the server, then hands them to the
 * realtime provider on the client.
 *
 * Two identities matter here and must not be conflated:
 *   · user.id  — who is signed in
 *   · ownerId  — whose books are on screen
 * They differ when viewing books shared with you. Every query below is keyed
 * to ownerId, and access is re-validated here on every render — so a tampered
 * cookie falls back to your own books, and RLS would return nothing regardless.
 *
 * Onboarding is gated on app_profiles.onboarded_at — SERVER state, not
 * localStorage, so onboarding on the phone counts here too.
 */
export default async function ShellLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The middleware already redirected anonymous visitors; this narrows the type.
  if (!user) redirect("/app/login");

  // Set by /app/switch/[ownerId]. NOT a query param: Next.js gives
  // `searchParams` to pages only, so a layout would never receive it and owner
  // switching would silently never activate.
  const jar = await cookies();
  const requested = jar.get(ACTIVE_BOOKS_COOKIE)?.value;

  // Books shared with this user — both for the switcher and to validate the
  // cookie against current access, so a revoked share stops working at once.
  const { data: shared } = await supabase.rpc("shared_books");
  const sharedList = (shared ?? []) as {
    owner_user_id: string;
    owner_name: string;
    role: ShareRole;
  }[];

  let ownerId = user.id;
  let role: AccessRole = "owner";

  if (requested && requested !== user.id) {
    const match = sharedList.find((s) => s.owner_user_id === requested);
    // Silently fall back to your own books rather than erroring — a stale link
    // after access was revoked shouldn't be a dead end.
    if (match) {
      ownerId = match.owner_user_id;
      role = match.role;
    }
  }

  const [profileRes, hustlesRes, txRes] = await Promise.all([
    supabase.from("app_profiles").select("*").eq("user_id", ownerId).maybeSingle(),
    supabase.from("app_hustles").select("*").eq("user_id", ownerId).order("name"),
    supabase
      .from("app_transactions")
      .select("*")
      .eq("user_id", ownerId)
      .order("date", { ascending: false })
      .limit(500),
  ]);

  const profile = profileRes.data ?? null;

  // Only gate onboarding on your OWN books — an accountant opening a client's
  // books must never be dropped into that client's setup flow.
  if (role === "owner" && !profile?.onboarded_at) redirect("/app/onboarding");

  const ownerName =
    role === "owner"
      ? ""
      : (sharedList.find((s) => s.owner_user_id === ownerId)?.owner_name ?? "Shared books");

  return (
    <AppDataProvider
      userId={user.id}
      ownerId={ownerId}
      role={role}
      initialProfile={profile}
      initialHustles={hustlesRes.data ?? []}
      initialTransactions={txRes.data ?? []}
    >
      <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col">
        {role !== "owner" && <OwnerBanner name={ownerName} role={role} />}
        <main className="flex-1 pb-32">{children}</main>
        <AppNav />
      </div>
    </AppDataProvider>
  );
}
