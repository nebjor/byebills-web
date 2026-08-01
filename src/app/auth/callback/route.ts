import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * OAuth redirect target. Supabase sends the browser here with `?code=…`;
 * we swap that for a session cookie and drop the user into the app.
 *
 * The provider redirect URL must be allow-listed in the Supabase dashboard
 * (Authentication → URL Configuration → Redirect URLs):
 *   http://localhost:3000/auth/callback
 *   https://www.byebills.app/auth/callback
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const error = searchParams.get("error_description") ?? searchParams.get("error");

  // Only allow relative redirects — an absolute `next` would be an open redirect.
  const requested = searchParams.get("next") ?? "/app";
  const next = requested.startsWith("/") && !requested.startsWith("//") ? requested : "/app";

  if (error) {
    return NextResponse.redirect(`${origin}/app/login?error=${encodeURIComponent(error)}`);
  }
  if (!code) {
    return NextResponse.redirect(`${origin}/app/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    return NextResponse.redirect(
      `${origin}/app/login?error=${encodeURIComponent(exchangeError.message)}`,
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}
