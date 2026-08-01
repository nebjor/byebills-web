import { redirect } from "next/navigation";

import Onboarding from "@/components/app/onboarding";
import { createClient } from "@/lib/supabase/server";

/**
 * The web twin of the mobile onboarding (name.tsx -> setup.tsx).
 *
 * Anyone who already finished it — on either device — is sent straight to the
 * dashboard, because completion is stored server-side in app_profiles.
 */
export default async function OnboardingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/app/login");

  const { data: profile } = await supabase
    .from("app_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profile?.onboarded_at) redirect("/app");

  const { data: hustles } = await supabase
    .from("app_hustles")
    .select("*")
    .eq("user_id", user.id);

  // The signup trigger prefills the name from the OAuth profile; fall back to
  // the raw metadata in case this account predates the trigger.
  const suggestedName =
    profile?.name ||
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    "";

  return (
    <Onboarding
      userId={user.id}
      initialName={suggestedName}
      initialCurrency={profile?.currency ?? "CHF"}
      initialHustles={(hustles ?? []).map((h) => ({ id: h.id, name: h.name, color: h.color }))}
    />
  );
}
