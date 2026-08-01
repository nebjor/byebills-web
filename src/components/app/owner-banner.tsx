import Link from "next/link";

import { switchBooksHref } from "@/lib/app/books";
import type { ShareRole } from "@/lib/database.types";

/**
 * Persistent reminder that you're in someone else's books.
 *
 * Without it the most likely mistake is scanning a personal receipt into a
 * client's accounts and never noticing — the UI is otherwise identical.
 */
export default function OwnerBanner({ name, role }: { name: string; role: ShareRole }) {
  return (
    <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-[var(--bb-border)] bg-[var(--bb-purple-tint)] px-5 py-2.5">
      <span className="min-w-0 flex-1 text-[13px] font-bold text-[var(--bb-purple-ink)]">
        <span className="truncate">Viewing {name}</span>
        <span className="ml-2 rounded-full bg-[var(--bb-purple)] px-2 py-0.5 text-[10px] font-extrabold tracking-[0.4px] text-white">
          {role === "viewer" ? "READ ONLY" : "CAN EDIT"}
        </span>
      </span>
      <Link
        href={switchBooksHref("mine")}
        prefetch={false}
        className="shrink-0 text-[13px] font-bold text-[var(--bb-purple-ink)] underline underline-offset-2"
      >
        Back to mine
      </Link>
    </div>
  );
}
