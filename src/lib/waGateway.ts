// Integrasi WA Multi Session (wa-multi-session.amtsilatipusat.com)
// Pola diadaptasi dari siakad-markaz-v2/src/lib/whatsapp.ts.
// Session: WA_SESSION_ID2 (fallback WA_SESSION_ID, lalu "default").
// Endpoint yang dipakai:
//   POST /api/v1/sessions/{id}/send          -> { to, message } (teks)
//   POST /api/v1/sessions/{id}/send/image    -> { to, image(base64), filename, caption }
//   POST /api/v1/sessions/{id}/send/document -> { to, document(base64)|document_url, filename, caption }
// Format `to` untuk media: "628xxx@s.whatsapp.net" (lihat slip-digital/pkg/whatsapp).

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
    const res = await fetch(
      `${WA_API_URL}/sessions/${getSessionId()}/send`,
      {
        method: "POST",
        headers: {
          "X-API-Key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ to: target, message }),
      }
    );
    const data = await res.json().catch(() => ({}));
    if (res.ok) return { success: true };
    return {
      success: false,
      detail: data.message || data.error || `HTTP ${res.status}`,
    };
  } catch (e: any) {
    return { success: false, detail: e?.message || "Network error" };
  }
}

// Kirim dokumen (PDF) sebagai lampiran WA + caption.
// Dipakai untuk bukti lunas: PDF di-generate server-side (isomorphic),
// lalu dikirim langsung dari webhook tanpa tergantung browser camaba.
export async function kirimDokumenWa(
  to: string,
  caption: string,
  fileBytes: Uint8Array,
  filename: string
): Promise<{ success: boolean; detail?: string }> {
  const apiKey = process.env.WA_API_KEY;
  if (!apiKey) {
    return { success: false, detail: "WA_API_KEY belum dikonfigurasi" };
  }
  let target = normalisasiNomorWa(to);
  if (!target) {
    return { success: false, detail: "Nomor tujuan kosong" };
  }
  if (!target.includes("@")) target += "@s.whatsapp.net";
  const document = Buffer.from(fileBytes).toString("base64");

  // Retry 3x: blokir sesaat (mis. 403 Cloudflare yang transient) sering
  // lolos pada percobaan berikutnya. 400/401 = kesalahan permanen, tidak di-retry.
  const maxAttempts = 3;
  let lastDetail = "unknown error";
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(
        `${WA_API_URL}/sessions/${getSessionId()}/send/document`,
        {
          method: "POST",
          headers: {
            "X-API-Key": apiKey,
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ to: target, document, filename, caption }),
        }
      );
      const rawBody = await res.text().catch(() => "");
      let data: any = {};
      try {
        data = JSON.parse(rawBody);
      } catch {
        // Non-JSON (mis. halaman blokir Cloudflare) — biarkan data kosong.
      }
      if (res.ok) return { success: true };
      lastDetail = data.message || data.error || `HTTP ${res.status}`;
      const bodySnippet =
        rawBody && !data.message && !data.error
          ? ` | body: ${rawBody.slice(0, 300).replace(/\s+/g, " ")}`
          : "";
      console.warn(
        `kirimDokumenWa percobaan ${attempt}/${maxAttempts} gagal: ${lastDetail}${bodySnippet}`
      );
      if (res.status === 400 || res.status === 401) break;
    } catch (e: any) {
      lastDetail = e?.message || "Network error";
      console.warn(
        `kirimDokumenWa percobaan ${attempt}/${maxAttempts} network error: ${lastDetail}`
      );
    }
    if (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, attempt * 2000));
    }
  }
  return { success: false, detail: lastDetail };
}

// Base URL publik aplikasi (untuk link di pesan WA).
export function getAppBaseUrl(): string {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "";
}

export interface PesanLunasOpts {
  nama: string;
  noPendaftaran: string;
  tanggalLahir: string; // YYYY-MM-DD (untuk deep link cek status)
  nis?: string | null;
  totalBayar: number;
  metodeLabel: string;
}

// Template pesan WA saat pembayaran Midtrans sukses.
export function formatPesanLunas(o: PesanLunasOpts): string {
  const base = getAppBaseUrl();
  const linkBukti = base
    ? `${base}/cek-status?no=${encodeURIComponent(o.noPendaftaran)}&tgl=${encodeURIComponent(o.tanggalLahir)}`
    : "";
  const linkPortal = base ? `${base}/santri/login` : "";

  const lines: string[] = [];
  lines.push(`Assalamu'alaikum *${o.nama}*,`);
  lines.push("");
  lines.push(
    `Alhamdulillah, pembayaran *Biaya Pendaftaran* Anda sebesar *Rp ${o.totalBayar.toLocaleString("id-ID")}* (${o.metodeLabel}) telah kami terima — status *LUNAS* ✅`
  );
  lines.push("");
  lines.push(`🧾 *Bukti lunas (PDF)* terlampir pada pesan ini.`);
  if (linkBukti) lines.push(`🔗 *Cek Status:* ${linkBukti}`);
  if (o.nis) {
    lines.push(`🆔 *NIS Anda:* *${o.nis}*`);
    if (linkPortal) {
      lines.push(`🔑 *Portal Camaba:* ${linkPortal}`);
      lines.push(`Masuk dengan NIS sebagai username & password.`);
    }
  }
  lines.push("");
  lines.push(`Simpan pesan ini baik-baik. Jazakumullahu khairan.`);
  lines.push("");
  lines.push(`_ℹ️ Pesan otomatis dari Mediator Markaz Arabiyah._`);
  return lines.join("\n");
}
