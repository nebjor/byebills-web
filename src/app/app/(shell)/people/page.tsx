import { redirect } from "next/navigation";

import People from "@/components/app/people";
import type { ShareRole } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

/**
 * Fetched on the server like every other screen in the app — the client
 * component only mutates and calls router.refresh(), so there's no
 * fetch-on-mount effect to get wrong.
 */
export default async function PeoplePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/app/login");

  const [sharesRes, booksRes] = await Promise.all([
    supabase
      .from("app_shares")
      .select("id,invite_email,role,status,token,accepted_at")
      .eq("owner_user_id", user.id)
      .neq("status", "revoked")
      .order("created_at", { ascending: false }),
    supabase.rpc("shared_books"),
  ]);

  return (
    <People
      userId={user.id}
      initialShares={
        (sharesRes.data ?? []) as {
          id: string;
          invite_email: string;
          role: ShareRole;
          status: "pending" | "accepted" | "revoked";
          token: string;
          accepted_at: string | null;
        }[]
      }
      sharedBooks={
        (booksRes.data ?? []) as {
          owner_user_id: string;
          owner_name: string;
          role: ShareRole;
        }[]
      }
    />
  );
}
