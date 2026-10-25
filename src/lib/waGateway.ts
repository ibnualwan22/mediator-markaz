// Integrasi WA Multi Session (wa-multi-session.amtsilatipusat.com).
// Versi main: hanya kirim TEKS (tanpa gambar/dokumen).
// Pola diadaptasi dari branch sandbox (src/lib/waGateway.ts).
// Env: WA_API_KEY (wajib), WA_SESSION_ID2 || WA_SESSION_ID || "default".
// Bila WA_API_KEY belum dipasang, kirim dilewati (success: false) —
// pemanggil TIDAK BOLEH menggagalkan proses utama karena WA.

const WA_API_URL = "https://wa-multi-session.amtsilatipusat.com/api/v1";

function getSessionId(): string {
  return (
    process.env.WA_SESSION_ID2 || process.env.WA_SESSION_ID || "default"
  );
}

// Normalisasi nomor Indonesia ke format 628xx (tanpa +).
export function normalisasiNomorWa(no: string): string {
  const digits = (no || "").replace(/\D/g, "");
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  return digits;
}

export async function kirimPesanWa(
  to: string,
  message: string
): Promise<{ success: boolean; detail?: string }> {
  const apiKey = process.env.WA_API_KEY;
  if (!apiKey) {
    return { success: false, detail: "WA_API_KEY belum dikonfigurasi" };
  }
  const target = normalisasiNomorWa(to);
  if (!target) {
    return { success: false, detail: "Nomor tujuan kosong" };
  }
  try {
    const res = await fetch(`${WA_API_URL}/sessions/${getSessionId()}/send`, {
      method: "POST",
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to: target, message }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return { success: true };
    return {
      success: false,
      detail: data.message || data.error || `HTTP ${res.status}`,
    };
  } catch (e: unknown) {
    return {
      success: false,
      detail: e instanceof Error ? e.message : "Network error",
    };
  }
}

// Base URL publik aplikasi (untuk link di pesan WA).
export function getAppBaseUrl(): string {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "";
}
