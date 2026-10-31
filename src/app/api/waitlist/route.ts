import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { track } from "@/server/analytics";
import { enforceRateLimit } from "@/server/rate-limit";
import { joinWaitlist } from "@/server/waitlist";
import { parseWaitlistInput } from "@/server/waitlist-input";

// Public endpoint: anyone can join the waitlist. Writes with the service role
// (server-side only) so the table stays locked down.
export async function POST(request: NextRequest) {
  try {
    await enforceRateLimit(request.headers, { bucket: "waitlist", max: 5, windowSeconds: 600 });

    const body = await request.json().catch(() => ({}));
    const input = parseWaitlistInput(body);
    if (!input) {
      return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
    }

    await joinWaitlist(input);
    await track(
      input.email,
      "waitlist_signup_server",
      { source: "landing" },
      { email: input.email, name: input.name ?? undefined }
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err, "waitlist");
  }
}
