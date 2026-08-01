import { NextRequest, NextResponse } from "next/server";

import { connectorFor } from "@/lib/connectors";
import { importedTransactionId } from "@/lib/app/modules";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Run one module's import.
 *
 * Authorisation and execution are deliberately split:
 *   · the USER's client proves they own the integration (RLS does the work)
 *   · the SERVICE client reads the credentials and writes the entries
 * Credentials live in app_integration_secrets, which has RLS on and no
 * policies — unreachable from the browser by construction.
 */
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { integration_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.integration_id) {
    return NextResponse.json({ error: "integration_id required" }, { status: 400 });
  }

  // Read it as the user: if it isn't theirs, RLS returns nothing.
  const { data: integration } = await supabase
    .from("app_integrations")
    .select("id,type,hustle_id,config,active,cursor,user_id")
    .eq("id", body.integration_id)
    .maybeSingle();

  if (!integration) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!integration.active) {
    return NextResponse.json({ error: "This module is switched off" }, { status: 400 });
  }

  const connector = connectorFor(integration.type);
  if (!connector) {
    return NextResponse.json({ error: "No connector for this module" }, { status: 400 });
  }

  const admin = createServiceClient();
  const startedAt = new Date().toISOString();

  const { data: secretRow } = await admin
    .from("app_integration_secrets")
    .select("secrets")
    .eq("integration_id", integration.id)
    .maybeSingle();

  const ctx = {
    config: (integration.config ?? {}) as Record<string, string>,
    secrets: (secretRow?.secrets ?? {}) as Record<string, string>,
    cursor: integration.cursor,
  };

  try {
    const result = await connector.fetch(ctx);

    // A hustle must exist for the entries to land in. Fall back to the user's
    // first one rather than failing an otherwise-good import.
    let hustleId = integration.hustle_id;
    if (!hustleId) {
      const { data: firstHustle } = await admin
        .from("app_hustles")
        .select("id")
        .eq("user_id", integration.user_id)
        .limit(1)
        .maybeSingle();
      hustleId = firstHustle?.id ?? "default";
    }

    const rows = result.entries.map((e) => ({
      user_id: integration.user_id,
      // Deterministic id: re-running an import, or a replayed webhook, collides
      // on the primary key instead of booking the same payout twice.
      id: importedTransactionId(integration.type, e.externalId),
      title: e.title,
      meta: e.meta,
      amount: e.amount,
      status: "paid",
      hustle_id: hustleId,
      date: e.date,
      image_path: null,
      updated_at: new Date().toISOString(),
    }));

    let imported = 0;
    if (rows.length) {
      // ignoreDuplicates: an already-imported payout must not be overwritten —
      // the user may have recategorised it since.
      //
      // .select() is required, not cosmetic: PostgREST only returns rows (and a
      // count) when a representation is requested. Without it the response is
      // empty and every import reports "Nothing new". With ON CONFLICT DO
      // NOTHING only the genuinely-new rows come back, which is the number we
      // want.
      const { data: inserted, error: insertError } = await admin
        .from("app_transactions")
        .upsert(rows, { onConflict: "user_id,id", ignoreDuplicates: true })
        .select("id");

      if (insertError) throw new Error(insertError.message);
      imported = inserted?.length ?? 0;
    }

    await admin
      .from("app_integrations")
      .update({
        status: "ok",
        last_sync_at: new Date().toISOString(),
        last_error: null,
        cursor: result.cursor ?? integration.cursor,
        updated_at: new Date().toISOString(),
      })
      .eq("id", integration.id);

    await admin.from("app_integration_runs").insert({
      integration_id: integration.id,
      user_id: integration.user_id,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      ok: true,
      imported,
      message: `${result.entries.length} entries fetched, ${imported} new`,
    });

    return NextResponse.json({ ok: true, fetched: result.entries.length, imported });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Import failed";

    // Record the failure on the row so the settings screen can say something
    // true instead of showing a green dot that means nothing.
    await admin
      .from("app_integrations")
      .update({ status: "error", last_error: message, updated_at: new Date().toISOString() })
      .eq("id", integration.id);

    await admin.from("app_integration_runs").insert({
      integration_id: integration.id,
      user_id: integration.user_id,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      ok: false,
      imported: 0,
      message,
    });

    return NextResponse.json({ error: message }, { status: 502 });
  }
}
