import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "./errors";
import { parseBearerToken } from "./bearer";

/** A client scoped to the caller's JWT so auth.uid() resolves inside RPCs/RLS. */
export function createTokenClient(token: string): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
}

/** Verifies a bearer token. Throws 401 AppError when missing/invalid. */
export async function authenticateBearer(header: string | null | undefined) {
  const token = parseBearerToken(header);
  if (!token) throw new AppError(401, "Missing bearer token");
  const supabase = createTokenClient(token);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new AppError(401, "Unauthorized");
  return { supabase, user };
}

/** Service-role client (bypasses RLS). Server-side only. */
export function createAdminClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/** Creates/updates the profile row for the authenticated user (post-signup). */
export async function ensureUserProfile(user: { id: string; email?: string | null }) {
  const { error } = await createAdminClient()
    .from("users")
    .upsert({ id: user.id, email: user.email ?? null }, { onConflict: "id" });
  if (error) {
    console.error("[signup] profile upsert failed", error);
    throw new AppError(500, "Failed to create profile");
  }
}
