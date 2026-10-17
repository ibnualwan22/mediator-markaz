import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  isMidtransEnabled,
  getTransactionStatus,
  mapTransactionStatus,
} from "@/lib/midtrans";
import { prosesPembayaranSukses } from "@/lib/pembayaranSukses";
import { isRateLimited, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// Rate limit: tiap panggilan query ke API Midtrans, batasi 10x/10mnt/IP.
const SINKRON_LIMIT_MAX = 10;
const SINKRON_LIMIT_WINDOW_MS = 10 * 60 * 1000;

// POST /api/pendaftaran/sinkron-status
// Body: { noPendaftaran, tgl } (tgl = tanggal lahir YYYY-MM-DD).
// Menanyakan status LANGSUNG ke API Midtrans untuk transaksi PENDING
// terbaru santri — cadangan kalau webhook telat/hilang. Verifikasi
// noPendaftaran + tanggal lahir sama seperti /api/pendaftaran/status.
export async function POST(req: Request) {
  try {
    if (!isMidtransEnabled()) {
      return NextResponse.json(
        { error: "Pembayaran online belum diaktifkan." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    const no = (body?.noPendaftaran || "").trim();
    const tgl = (body?.tgl || "").trim();
    if (!no || !tgl) {
      return NextResponse.json(
        { error: "Nomor pendaftaran dan tanggal lahir wajib diisi." },
        { status: 400 }
      );
    }

    const ip = getClientIp(req);
    if (isRateLimited(ip, SINKRON_LIMIT_MAX, SINKRON_LIMIT_WINDOW_MS)) {
      return NextResponse.json(
        { error: "Terlalu banyak percobaan. Coba lagi beberapa menit." },
        { status: 429 }
      );
    }

    const santri = await prisma.santri.findUnique({
      where: { noPendaftaran: no },
      select: {
        id: true,
        tanggalLahir: true,
        pembayaranSantri: {
          select: {
            id: true,
            isLunas: true,
            transaksiMidtrans: {
              where: { status: "PENDING" },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });
    if (!santri) {
      return NextResponse.json(
        { error: "Data tidak ditemukan." },
        { status: 404 }
      );
    }

    const lahir = santri.tanggalLahir ? new Date(santri.tanggalLahir) : null;
    const input = new Date(tgl);
    const cocok =
      lahir &&
      !isNaN(input.getTime()) &&
      lahir.getUTCFullYear() === input.getUTCFullYear() &&
      lahir.getUTCMonth() === input.getUTCMonth() &&
      lahir.getUTCDate() === input.getUTCDate();
    if (!cocok) {
      return NextResponse.json(
        { error: "Tanggal lahir tidak cocok." },
        { status: 403 }
      );
    }

    // Sudah lunas semua? Tidak ada yang perlu disinkronkan.
    const belumLunas = santri.pembayaranSantri.filter((p) => !p.isLunas);
    if (belumLunas.length === 0) {
      return NextResponse.json({ lunas: true, disinkron: false });
    }

    const pendingTx = belumLunas
      .flatMap((p) => p.transaksiMidtrans)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
    if (!pendingTx) {
      return NextResponse.json({
        lunas: false,
        disinkron: false,
        pesan: "Belum ada transaksi online untuk disinkronkan.",
      });
    }

    const mid = await getTransactionStatus(pendingTx.orderId);
    const outcome = mapTransactionStatus(
      mid.transaction_status,
      mid.fraud_status
    );

    // Verifikasi nominal: harus cocok dengan yang tercatat di DB.
    if (Number(mid.gross_amount) !== pendingTx.grossAmount) {
      console.error(
        `Sinkron-status: gross_amount tidak cocok order=${pendingTx.orderId} ` +
          `midtrans=${mid.gross_amount} db=${pendingTx.grossAmount}`
      );
      return NextResponse.json(
        { error: "Nominal transaksi tidak cocok. Hubungi admin." },
        { status: 422 }
      );
    }

    if (outcome === "SUCCESS") {
      await prosesPembayaranSukses(
        mid.order_id,
        mid.payment_type || null,
        mid as any
      );
      return NextResponse.json({ lunas: true, disinkron: true });
    }

    if (outcome !== "PENDING") {
      await prisma.transaksiMidtrans.update({
        where: { id: pendingTx.id },
        data: { status: outcome, paymentType: mid.payment_type || null },
      });
    }

    return NextResponse.json({
      lunas: false,
      disinkron: true,
      statusMidtrans: mid.transaction_status,
    });
  } catch (error: any) {
    console.error("Sinkron status error:", error);
    return NextResponse.json(
      { error: "Gagal menyinkronkan status." },
      { status: 500 }
    );
  }
}
