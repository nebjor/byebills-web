import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import AppNav from "@/components/app/nav";
import { AppDataProvider } from "@/components/app/app-data";
import { createClient } from "@/lib/supabase/server";

/**
 * Signed-in shell: loads the user's data on the server, then hands it to the
 * realtime provider on the client.
 *
 * Onboarding is gated on app_profiles.onboarded_at — SERVER state, not
 * localStorage. Someone who set up their hustles on the phone must land
 * straight on the dashboard here; being asked to onboard again would be the
 * cross-device promise breaking on first contact.
 */
export default async function ShellLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The middleware already redirected anonymous visitors; this is belt-and-braces
  // (and narrows the type).
  if (!user) redirect("/app/login");

  const [profileRes, hustlesRes, txRes] = await Promise.all([
    supabase.from("app_profiles").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("app_hustles").select("*").eq("user_id", user.id).order("name"),
    supabase
      .from("app_transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(500),
  ]);

  const profile = profileRes.data ?? null;
  if (!profile?.onboarded_at) redirect("/app/onboarding");

  return (
    <AppDataProvider
      userId={user.id}
      initialProfile={profile}
      initialHustles={hustlesRes.data ?? []}
      initialTransactions={txRes.data ?? []}
    >
      <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col">
        <main className="flex-1 pb-32">{children}</main>
        <AppNav />
      </div>
    </AppDataProvider>
  );
}
