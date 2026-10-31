import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { track } from "@/server/analytics";
import { deleteAccount } from "@/server/account";
import { authenticateBearer } from "@/server/auth";

// Deletes the calling user's account and data. The app sends the user's
// Authorization: Bearer <access token>; we verify it, then delete with the
// service role.
export async function POST(request: NextRequest) {
  try {
    const { user } = await authenticateBearer(request.headers.get("authorization"));
    await deleteAccount(user.id);
    await track(user.id, "account_deleted");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err, "account-delete");
  }
}
