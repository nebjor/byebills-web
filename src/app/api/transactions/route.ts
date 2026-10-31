import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { errorResponse } from "@/lib/http";
import { track } from "@/server/analytics";
import { parseCreateTransaction } from "@/server/transactions/schema";
import { createTransaction } from "@/server/transactions/service";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsed = parseCreateTransaction(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const transaction = await createTransaction(supabase, user.id, parsed.data);

    // TODO: Trigger sync to Google Sheets / other integrations here

    await track(user.id, "transaction_created", {
      transaction_type: parsed.data.type,
      document_type: parsed.data.document_type,
      currency: parsed.data.currency,
      payment_method: parsed.data.payment_method,
    });

    return NextResponse.json({ transaction });
  } catch (err) {
    return errorResponse(err, "transactions");
  }
}
