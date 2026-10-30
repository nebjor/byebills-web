import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getPostHogClient } from "@/lib/posthog-server";

// Server-side profile creation endpoint — called after client-side signup
export async function POST() {
  const supabase = await createClient();

  // Verify the user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Upsert user profile using service role (bypasses RLS)
  const admin = createServiceClient();
  // the generated types resolve this table to never, so cast for now
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from("users") as any).upsert(
    { id: user.id, email: user.email ?? null },
    { onConflict: "id" }
  );

  if (error) {
    return NextResponse.json({ error: "Failed to create profile" }, { status: 500 });
  }

  const posthog = getPostHogClient();
  posthog.identify({ distinctId: user.id, properties: { email: user.email } });
  posthog.capture({ distinctId: user.id, event: "user_signed_up" });
  await posthog.shutdown();

  return NextResponse.json({ ok: true });
}
