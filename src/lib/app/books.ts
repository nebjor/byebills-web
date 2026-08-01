/**
 * Which books the app is currently showing.
 *
 * Stored in a cookie rather than a query param because the data provider lives
 * in the (shell) layout, and Next.js only passes `searchParams` to pages — a
 * layout would never see it.
 *
 * The cookie is a PREFERENCE, not a grant: the layout re-checks access against
 * shared_books() on every render, so a tampered value just falls back to your
 * own books. RLS is the real boundary either way.
 */
export const ACTIVE_BOOKS_COOKIE = "bb_books";

/** Link target for switching. "mine" clears the cookie. */
export function switchBooksHref(ownerId: string): string {
  return `/app/switch/${ownerId}`;
}
