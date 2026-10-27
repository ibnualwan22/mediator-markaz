// Pembatas laju in-memory, pola yang sama dengan /api/pendaftaran.
//
// Catatan: di Vercel serverless, map ini hidup per-instans — cukup sebagai
// penghambat spam/flood, bukan jaminan keras. Batas keras lintas instans
// butuh store bersama (mis. Redis) bila suatu hari diperlukan.

const buckets = new Map<string, number[]>();

export function isRateLimited(
  key: string,
  max: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const attempts = (buckets.get(key) || []).filter(
    (t) => now - t < windowMs
  );
  if (attempts.length >= max) {
    buckets.set(key, attempts);
    return true;
  }
  attempts.push(now);
  buckets.set(key, attempts);
  // Bersihkan entri kadaluarsa agar map tidak membesar tanpa batas.
  if (buckets.size > 10000) {
    for (const [k, v] of buckets) {
      if (v.every((t) => now - t >= windowMs)) buckets.delete(k);
    }
  }
  return false;
}

export function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}
