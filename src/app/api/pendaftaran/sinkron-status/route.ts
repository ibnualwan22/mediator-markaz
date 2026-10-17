import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  isMidtransEnabled,
  getTransactionStatus,
  mapTransactionStatus,
} from "@/lib/midtrans";
import { prosesPembayaranSukses } from "@/lib/pembayaranSukses";

export const dynamic = "force-dynamic";

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
