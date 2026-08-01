import Link from "next/link";
import { redirect } from "next/navigation";

import { switchBooksHref } from "@/lib/app/books";
import { createClient } from "@/lib/supabase/server";

/**
 * Invite acceptance.
 *
 * Sits outside the (shell) group deliberately: the visitor has no books of
 * their own to load yet, and the shell would try to onboard them first.
 *
 * accept_share() enforces that the signed-in email matches the invited one —
 * a forwarded or leaked link must not hand over someone's financial records.
 */
export default async function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware covers /app/**, so an anonymous visitor is already bounced to
  // login with ?next= pointing back here.
  if (!user) redirect(`/app/login?next=/app/join/${token}`);

  const { data, error } = await supabase.rpc("accept_share", { p_token: token }).single();

  if (!error && data?.ok && data.owner_user_id) {
    // Via the switch route so the active-books cookie actually gets set.
    redirect(switchBooksHref(data.owner_user_id));
  }

  const reason = data?.message ?? error?.message ?? "invalid_token";

  const COPY: Record<string, { title: string; body: string }> = {
    invalid_token: {
      title: "This invite link isn't valid",
      body: "It may have been mistyped, or replaced by a newer one. Ask for a fresh link.",
    },
    revoked: {
      title: "This invite was withdrawn",
      body: "The owner removed access. Ask them to invite you again if that wasn't intended.",
    },
    email_mismatch: {
      title: "Wrong account",
      body: `The invite was sent to a different email address than ${user.email}. Sign in with the invited address, or ask for an invite to this one.`,
    },
    cannot_share_with_self: {
      title: "These are already your books",
      body: "No invite needed — just open the app.",
    },
  };

  const copy = COPY[reason] ?? COPY.invalid_token;

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/billie.png" alt="" className="mx-auto h-20 w-20 object-contain" />
        <h1 className="mt-4 text-[24px] font-extrabold tracking-[-0.5px]">{copy.title}</h1>
        <p className="mt-2 text-base text-[var(--bb-ink-600)]">{copy.body}</p>
        <Link
          href="/app"
          className="mt-6 inline-block rounded-2xl bg-[var(--bb-brand)] px-5 py-3 text-base font-bold text-[var(--bb-on-brand)]"
        >
          Go to my books
        </Link>
      </div>
    </div>
  );
}
