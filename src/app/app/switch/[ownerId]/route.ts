import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { ACTIVE_BOOKS_COOKIE } from "@/lib/app/books";
import { createClient } from "@/lib/supabase/server";

/**
 * Switch which books the app is showing.
 *
 * This exists because Next.js passes `searchParams` to PAGES ONLY — a layout
 * receives `params` and `children` and nothing else. The data provider lives in
 * the (shell) layout, so a `?books=` query param would silently never reach it.
 * A cookie does, via cookies().
 *
 * Access is re-validated in the layout on every render, so this cookie is a
 * preference, not a grant — tampering with it just shows your own books.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ownerId: string }> },
) {
  const { ownerId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/app/login", request.url));
  }

  const jar = await cookies();

  // "mine" is the explicit way back to your own books.
  if (ownerId === "mine" || ownerId === user.id) {
    jar.delete(ACTIVE_BOOKS_COOKIE);
    return NextResponse.redirect(new URL("/app", request.url));
  }

  const { data: shared } = await supabase.rpc("shared_books");
  const allowed = (shared ?? []).some(
    (s: { owner_user_id: string }) => s.owner_user_id === ownerId,
  );

  if (!allowed) {
    // No access (or it was revoked) — fall back rather than erroring.
    jar.delete(ACTIVE_BOOKS_COOKIE);
    return NextResponse.redirect(new URL("/app", request.url));
  }

  jar.set(ACTIVE_BOOKS_COOKIE, ownerId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return NextResponse.redirect(new URL("/app", request.url));
}
