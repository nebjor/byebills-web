import { NextResponse } from "next/server";
import { getWaitlistCount } from "@/server/waitlist";

// Public: returns ONLY the number of waitlist signups (never any emails).
// Used by the landing page to show "X of 12 free spots left".
export const dynamic = "force-dynamic"; // always live, never cached

export async function GET() {
  try {
    return NextResponse.json({ count: await getWaitlistCount() });
  } catch {
    return NextResponse.json({ count: null }, { status: 500 });
  }
}
