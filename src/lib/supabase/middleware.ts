import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Session refresh + auth gate for the web app.
 *
 * Deliberately scoped to /app/** by the matcher in src/middleware.ts. The
 * marketing site (/, /privacy, /terms) and the standalone /drop demo must stay
 * completely untouched — the app is hidden, not launched.
 */

/** Paths under /app a signed-out visitor may reach. */
function isPublicAppPath(pathname: string) {
  return pathname === "/app/login" || pathname.startsWith("/app/login/");
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // IMPORTANT: getUser() revalidates the token with Supabase and refreshes the
  // cookie. Don't swap it for getSession(), which trusts the cookie as-is.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && !isPublicAppPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/app/login";
    url.search = "";
    // Remember where they were headed so login can send them back.
    if (pathname !== "/app") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && isPublicAppPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
