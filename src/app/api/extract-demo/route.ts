import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { AppError } from "@/server/errors";
import { extractDemo } from "@/server/extraction/service";
import { demoPasswordMatches } from "@/server/demo";
import { rateLimitAllows } from "@/server/rate-limit";

// Public demo extraction: NO auth, NO database. Runs the LLM on one file
// and returns the extracted fields. Used by the standalone /drop demo.
export const maxDuration = 60;

// Overall request cap per IP, plus a strict cap on WRONG passwords per IP.
const OVERALL = { bucket: "demo", max: 60, windowSeconds: 600 };
const FAILURES = { bucket: "demo-fail", max: 10, windowSeconds: 900 };

export async function POST(request: NextRequest) {
  try {
    const expected = process.env.DROP_DEMO_PASSWORD;
    if (!expected) {
      return NextResponse.json({ error: "Demo ist deaktiviert." }, { status: 503 });
    }

    if (
      !(await rateLimitAllows(request.headers, OVERALL)) ||
      !(await rateLimitAllows(request.headers, FAILURES, 0)) // peek: already locked out?
    ) {
      throw new AppError(429, "Zu viele Anfragen. Bitte später erneut versuchen.");
    }

    const formData = await request.formData();

    // Sent in the body (not a header) so any Unicode password works.
    if (!demoPasswordMatches(formData.get("key"), expected)) {
      await rateLimitAllows(request.headers, FAILURES); // count the failure
      return NextResponse.json({ error: "Falsches Passwort." }, { status: 401 });
    }

    const file = formData.get("file") as File | null;
    return NextResponse.json(await extractDemo(file));
  } catch (err) {
    return errorResponse(err, "extract-demo");
  }
}
