import crypto from "crypto";

// ============ KONFIGURASI ============
// Diisi via env var di Vercel (jangan hardcode key di kode).
// Untuk Preview: pakai sandbox key. Production: key production + IS_PRODUCTION=true.

export function isMidtransEnabled(): boolean {
  return process.env.MIDTRANS_ENABLED === "true";
}

export function isMidtransProduction(): boolean {
  return process.env.MIDTRANS_IS_PRODUCTION === "true";
}

export function getServerKey(): string {
  return process.env.MIDTRANS_SERVER_KEY || "";
}

export function getClientKey(): string {
  return process.env.MIDTRANS_CLIENT_KEY || "";
}

export function getServiceFee(): number {
  const v = parseInt(process.env.MIDTRANS_SERVICE_FEE || "5000", 10);
  return Number.isFinite(v) && v >= 0 ? v : 5000;
}

export function getSnapApiBase(): string {
  return isMidtransProduction()
    ? "https://app.midtrans.com"
    : "https://app.sandbox.midtrans.com";
}

export function getSnapJsUrl(): string {
  return `${getSnapApiBase()}/snap/snap.js`;
}

// ============ BUAT TRANSAKSI SNAP ============

export interface SnapTransactionParams {
  orderId: string;
  grossAmount: number;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  itemName: string;
  itemPrice: number; // nominal kewajiban (tanpa fee)
  serviceFee: number;
}

export interface SnapTransactionResult {
  token: string;
  redirectUrl: string;
}

export async function createSnapTransaction(
  params: SnapTransactionParams
): Promise<SnapTransactionResult> {
  const serverKey = getServerKey();
  if (!serverKey) {
    throw new Error("MIDTRANS_SERVER_KEY belum dikonfigurasi.");
  }

  const items: Array<{ id: string; price: number; quantity: number; name: string }> = [
    {
      id: "BIAYA-PENDAFTARAN",
      price: params.itemPrice,
      quantity: 1,
      name: params.itemName,
    },
  ];
  if (params.serviceFee > 0) {
    items.push({
      id: "BIAYA-LAYANAN",
      price: params.serviceFee,
      quantity: 1,
      name: "Biaya layanan pembayaran",
    });
  }

  const res = await fetch(`${getSnapApiBase()}/snap/v1/transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Basic ${Buffer.from(serverKey + ":").toString("base64")}`,
    },
    body: JSON.stringify({
      transaction_details: {
        order_id: params.orderId,
        gross_amount: params.grossAmount,
      },
      customer_details: {
        first_name: params.customerName,
        email: params.customerEmail || undefined,
        phone: params.customerPhone || undefined,
      },
      item_details: items,
      // Batasi ke metode yang umum dipakai santri; bisa diubah sesuai kebutuhan.
      // Kosongkan array ini untuk mengizinkan semua metode.
      enabled_payments: ["qris", "gopay", "bank_transfer", "echannel"],
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.token) {
    const msg =
      (data.error_messages && data.error_messages.join("; ")) ||
      `Midtrans API error (HTTP ${res.status})`;
    throw new Error(msg);
  }

  return { token: data.token, redirectUrl: data.redirect_url };
}

// ============ VERIFIKASI WEBHOOK ============
// signature_key = SHA512(order_id + status_code + gross_amount + serverKey)

export function verifyWebhookSignature(payload: {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
}): boolean {
  const serverKey = getServerKey();
  if (!serverKey) return false;
  const expected = crypto
    .createHash("sha512")
    .update(
      payload.order_id + payload.status_code + payload.gross_amount + serverKey
    )
    .digest("hex");
  return expected === payload.signature_key;
}

export type WebhookOutcome = "SUCCESS" | "PENDING" | "FAILED" | "EXPIRED";

// Mapping status notifikasi Midtrans ke status internal.
export function mapTransactionStatus(
  transactionStatus: string,
  fraudStatus?: string
): WebhookOutcome {
  if (transactionStatus === "capture") {
    // Kartu kredit: capture + challenge = butuh review manual.
    return fraudStatus === "accept" ? "SUCCESS" : "PENDING";
  }
  if (transactionStatus === "settlement") return "SUCCESS";
  if (transactionStatus === "pending") return "PENDING";
  if (transactionStatus === "deny" || transactionStatus === "cancel")
    return "FAILED";
  if (transactionStatus === "expire") return "EXPIRED";
  return "PENDING";
}

// Resolve nominal "Biaya Pendaftaran" (Tahap 1, Poin 1) untuk seorang santri.
// Mengembalikan null bila paket default tidak ditemukan.
export async function resolveBiayaPendaftaran(
  prisma: any,
  santriId: string
): Promise<{ poinTahapId: string; nominal: number } | null> {
  const santri = await prisma.santri.findUnique({
    where: { id: santriId },
    select: { gelombangId: true, riwayatAkademik: true },
  });
  if (!santri) return null;

  const gelombang = await prisma.gelombang.findUnique({
    where: { id: santri.gelombangId },
    select: { periodeId: true },
  });
  if (!gelombang) return null;

  const paket = await prisma.paketPembayaran.findFirst({
    where: {
      periodeId: gelombang.periodeId,
      isDefault: true,
      isActive: true,
    },
    include: {
      tahapPaket: {
        where: { urutan: 1 },
        include: { poinTahap: { orderBy: { urutan: "asc" } } },
      },
    },
  });

  const tahap1 = paket?.tahapPaket?.[0];
  const poin = tahap1?.poinTahap?.[0];
  if (!poin) return null;

  const isAgama =
    santri.riwayatAkademik === "MA" ||
    santri.riwayatAkademik === "IJAZAH_PESANTREN";
  const nominal =
    tahap1.isIjazahBased && isAgama && poin.nominalIjazah != null
      ? poin.nominalIjazah
      : poin.nominal;

  return { poinTahapId: poin.id, nominal };
}

// ============ CEK STATUS KE MIDTRANS ============
// Untuk tombol "Sinkronkan Status": tanya langsung ke API Midtrans
// (bukan cuma database) sebagai cadangan kalau webhook telat/hilang.
export function getCoreApiBase(): string {
  return isMidtransProduction()
    ? "https://api.midtrans.com"
    : "https://api.sandbox.midtrans.com";
}

export interface MidtransStatusResult {
  transaction_status: string;
  fraud_status?: string;
  payment_type?: string;
  order_id: string;
  gross_amount: string;
  transaction_id?: string;
}

export async function getTransactionStatus(
  orderId: string
): Promise<MidtransStatusResult> {
  const serverKey = getServerKey();
  if (!serverKey) throw new Error("MIDTRANS_SERVER_KEY belum dikonfigurasi.");
  const res = await fetch(
    `${getCoreApiBase()}/v2/${encodeURIComponent(orderId)}/status`,
    {
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${Buffer.from(serverKey + ":").toString("base64")}`,
      },
    }
  );
  if (!res.ok) {
    throw new Error(`Midtrans status API: HTTP ${res.status}`);
  }
  return res.json();
}
