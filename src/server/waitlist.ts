import { createAdminClient } from "./auth";
import { AppError } from "./errors";
import type { WaitlistInput } from "./waitlist-input";

/** Idempotent: re-signing up with the same email never errors. */
export async function joinWaitlist(input: WaitlistInput) {
  const { error } = await createAdminClient()
    .from("waitlist")
    .upsert({ email: input.email, name: input.name, source: "landing" }, { onConflict: "email" });
  if (error) {
    console.error("[waitlist] upsert failed", error);
    throw new AppError(500, "Something went wrong. Try again.");
  }
}

/** Only the number of signups, never any emails. */
export async function getWaitlistCount(): Promise<number> {
  const { count, error } = await createAdminClient()
    .from("waitlist")
    .select("*", { count: "exact", head: true });
  if (error) {
    console.error("[waitlist] count failed", error);
    throw new Error("count failed");
  }
  return count ?? 0;
}
