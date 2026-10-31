import { NextResponse } from "next/server";
import { toErrorResponse } from "@/server/errors";

/** Client-safe error response; internal details are logged, never returned. */
export function errorResponse(err: unknown, scope: string) {
  const { status, body } = toErrorResponse(err, scope);
  return NextResponse.json(body, { status });
}
