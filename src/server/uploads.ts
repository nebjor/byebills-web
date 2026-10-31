// Pure upload validation (no imports: unit-testable with the plain Node runner).

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

export const ALLOWED_UPLOAD_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
] as const;

export type UploadCheck =
  | { ok: true; mimeType: string }
  | { ok: false; status: number; error: string };

/**
 * Checks size and MIME type of an uploaded file.
 * `defaultMime` is used when the client sends no type at all (the mobile app
 * historically relies on a image/jpeg fallback).
 */
export function checkUpload(
  file: { size: number; type: string } | null | undefined,
  opts: { defaultMime?: string } = {}
): UploadCheck {
  if (!file) return { ok: false, status: 400, error: "No file provided" };
  if (file.size === 0) return { ok: false, status: 400, error: "Empty file" };
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, status: 413, error: "File too large (max 10 MB)" };
  }
  const mimeType = (file.type || opts.defaultMime || "").toLowerCase();
  if (!(ALLOWED_UPLOAD_MIME as readonly string[]).includes(mimeType)) {
    return {
      ok: false,
      status: 415,
      error: "Unsupported file type (allowed: JPEG, PNG, WebP, HEIC, PDF)",
    };
  }
  return { ok: true, mimeType };
}
