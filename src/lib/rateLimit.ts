// Rate limiter sederhana in-memory per IP (atau key bebas).
// Untuk endpoint publik agar tidak bisa di-spam.

const buckets = new Map<string, number[]>();

export function isRateLimited(
  key: string,
  max: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const attempts = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (attempts.length >= max) {
    buckets.set(key, attempts);
    return true;
  }
  attempts.push(now);
  buckets.set(key, attempts);
  return false;
}

export function getClientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
