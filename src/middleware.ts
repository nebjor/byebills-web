import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // ONLY the hidden web app. The landing page, /drop, /privacy, /terms and the
  // API routes deliberately never hit this middleware — adding paths here will
  // change what anonymous visitors see on the marketing site.
  matcher: ["/app/:path*"],
};
