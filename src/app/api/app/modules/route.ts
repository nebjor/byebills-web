import { NextRequest, NextResponse } from "next/server";

import { moduleByType } from "@/lib/app/modules";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Connect (or reconfigure) a module.
 *
 * This goes through the server rather than straight from the browser for one
 * reason: API keys. `app_integrations.config` is readable by the client under
 * RLS, so anything secret must land in `app_integration_secrets`, which has RLS
 * on and no policies — service role only. The browser posts the key once and
 * can never read it back.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    type?: string;
    hustle_id?: string | null;
    config?: Record<string, string>;
    secrets?: Record<string, string>;
    active?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const def = body.type ? moduleByType(body.type) : undefined;
  if (!def) {
    return NextResponse.json({ error: "Unknown module" }, { status: 400 });
  }

  // Only accept keys the module actually declares — an arbitrary blob from the
  // client shouldn't become config.
  const allowed = new Set(def.fields.map((f) => f.key));
  const config: Record<string, string> = {};
  for (const [k, v] of Object.entries(body.config ?? {})) {
    if (allowed.has(k) && typeof v === "string") config[k] = v;
  }
  const secrets: Record<string, string> = {};
  for (const [k, v] of Object.entries(body.secrets ?? {})) {
    if (allowed.has(k) && typeof v === "string") secrets[k] = v;
  }

  const missing = def.fields
    .filter((f) => f.required)
    .filter((f) => !config[f.key] && !secrets[f.key]);
  if (missing.length) {
    return NextResponse.json(
      { error: `Missing: ${missing.map((f) => f.label).join(", ")}` },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();

  // The integration row is the user's own, so write it as them — RLS then
  // guarantees it can't be attached to somebody else's account.
  const { data: row, error } = await supabase
    .from("app_integrations")
    .upsert(
      {
        user_id: user.id,
        type: def.type,
        hustle_id: body.hustle_id ?? null,
        config,
        active: body.active ?? true,
        status: "idle",
        last_error: null,
        updated_at: now,
      },
      { onConflict: "user_id,type,hustle_id" },
    )
    .select("id")
    .single();

  if (error || !row) {
    return NextResponse.json(
      { error: error?.message ?? "Could not save the module" },
      { status: 500 },
    );
  }

  // Secrets bypass RLS deliberately — this table has no policies at all.
  if (Object.keys(secrets).length) {
    const admin = createServiceClient();
    const { error: secretError } = await admin
      .from("app_integration_secrets")
      .upsert(
        { integration_id: row.id, secrets, updated_at: now },
        { onConflict: "integration_id" },
      );

    if (secretError) {
      // Don't leave a row claiming to be connected when its credentials didn't
      // save — it would fail on every run with a confusing error.
      await supabase.from("app_integrations").update({ active: false }).eq("id", row.id);
      return NextResponse.json({ error: "Could not store credentials" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, id: row.id });
}
