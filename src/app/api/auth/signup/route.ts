import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { errorResponse } from "@/lib/http";
import { track } from "@/server/analytics";
import { ensureUserProfile } from "@/server/auth";
import { enforceRateLimit } from "@/server/rate-limit";

// Server-side profile creation endpoint, called after client-side signup
export async function POST(request: NextRequest) {
  try {
    await enforceRateLimit(request.headers, { bucket: "signup", max: 10, windowSeconds: 3600 });

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureUserProfile(user);
    await track(user.id, "user_signed_up", undefined, { email: user.email });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err, "signup");
  }
}
