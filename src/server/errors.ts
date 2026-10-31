/**
 * An error whose message is safe to show to API clients.
 * Anything that is NOT an AppError is treated as internal: it is logged on the
 * server and the client only gets a generic message (see `toErrorResponse`).
 */
export class AppError extends Error {
  readonly status: number;
  readonly extra?: Record<string, unknown>;

  constructor(status: number, publicMessage: string, extra?: Record<string, unknown>) {
    super(publicMessage);
    this.name = "AppError";
    this.status = status;
    this.extra = extra;
  }
}

export interface ErrorBody {
  status: number;
  body: Record<string, unknown>;
}

/** Maps any thrown value to a client-safe response; logs internals server-side. */
export function toErrorResponse(err: unknown, scope: string): ErrorBody {
  if (err instanceof AppError) {
    return { status: err.status, body: { error: err.message, ...err.extra } };
  }
  console.error(`[${scope}] unexpected error`, err);
  return { status: 500, body: { error: "Internal server error" } };
}
