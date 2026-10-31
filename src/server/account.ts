import { createAdminClient } from "./auth";
import { AppError } from "./errors";

/** Deletes the user's data (tables + receipt images) and the auth record. */
export async function deleteAccount(userId: string) {
  const admin = createAdminClient();

  // Delete all user-owned rows before removing the auth record.
  await admin.from("app_transactions").delete().eq("user_id", userId);
  await admin.from("app_hustles").delete().eq("user_id", userId);
  await admin.from("extraction_usage").delete().eq("user_id", userId);
  await admin.from("user_entitlements").delete().eq("user_id", userId);

  // Remove the user's receipt images from Storage.
  const { data: files } = await admin.storage.from("receipts").list(userId);
  if (files?.length) {
    await admin.storage.from("receipts").remove(files.map((f) => `${userId}/${f.name}`));
  }

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    console.error("[account] deleteUser failed", error);
    throw new AppError(500, "Could not delete account");
  }
}
