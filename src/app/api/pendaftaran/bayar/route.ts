import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  isMidtransEnabled,
  getClientKey,
  getSnapJsUrl,
  isMidtransProduction,
  createSnapTransaction,
  resolveBiayaPendaftaran,
  hitungTotalDibayar,
  hitungFee,
  getMetodeBayar,
  METODE_BAYAR,
} from "@/lib/midtrans";
import { isRateLimited, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// Rate limit: pembuatan transaksi Snap memanggil API Midtrans,
// batasi 10x per 10 menit per IP.
const BAYAR_LIMIT_MAX = 10;
const BAYAR_LIMIT_WINDOW_MS = 10 * 60 * 1000;

// POST /api/pendaftaran/bayar
// Body: { noPendaftaran: string, metode?: "qris" | "gopay" | "bank_transfer" }
// Membuat (atau memakai ulang) transaksi Snap Midtrans untuk tagihan
// Tahap 1 (Biaya Pendaftaran) santri. Hanya aktif bila MIDTRANS_ENABLED=true.
//
// Pembayaran kumulatif: bila sudah ada pembayaran SUCCESS sebelumnya,
// order baru dibuat hanya untuk SISA tagihan (nominalHarus - totalDibayar).
// Fee dihitung EXACT per metode yang dipilih user.
export async function POST(req: Request) {
  try {
    if (!isMidtransEnabled()) {
      return NextResponse.json(
        { error: "Pembayaran online belum diaktifkan." },
        { status: 403 }
      );
    }

    const ip = getClientIp(req);
    if (isRateLimited(ip, BAYAR_LIMIT_MAX, BAYAR_LIMIT_WINDOW_MS)) {
      return NextResponse.json(
        { error: "Terlalu banyak percobaan. Coba lagi beberapa menit." },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const noPendaftaran = String(body.noPendaftaran || "").trim();
    if (!noPendaftaran) {
      return NextResponse.json(
        { error: "Nomor pendaftaran wajib diisi." },
        { status: 400 }
      );
    }

    // Validasi metode bayar (default: qris).
    const metodeId = String(body.metode || "qris").trim();
    const metode = getMetodeBayar(metodeId);
    if (!metode) {
      return NextResponse.json(
        {
          error: "Metode pembayaran tidak valid.",
          pilihan: METODE_BAYAR.map((m) => m.id),
        },
        { status: 400 }
      );
    }

    const santri = await prisma.santri.findUnique({
      where: { noPendaftaran },
      select: {
        id: true,
        namaLengkap: true,
        email: true,
        noWaSantri: true,
        noPendaftaran: true,
      },
    });
    if (!santri) {
      return NextResponse.json(
        { error: "Nomor pendaftaran tidak ditemukan." },
        { status: 404 }
      );
    }

    // Cari atau buat tagihan Tahap 1 (Biaya Pendaftaran).
    const biaya = await resolveBiayaPendaftaran(prisma, santri.id);
    if (!biaya) {
      return NextResponse.json(
        { error: "Tagihan pendaftaran belum tersedia. Hubungi admin." },
        { status: 422 }
      );
    }

    let pembayaran = await prisma.pembayaranSantri.findUnique({
      where: {
        santriId_poinTahapId: {
          santriId: santri.id,
          poinTahapId: biaya.poinTahapId,
        },
      },
    });
    if (!pembayaran) {
      pembayaran = await prisma.pembayaranSantri.create({
        data: {
          santriId: santri.id,
          poinTahapId: biaya.poinTahapId,
          nominalHarus: biaya.nominal,
          nominalDibayar: 0,
          isLunas: biaya.nominal === 0,
        },
      });
    }

    // B4/B5: hitung sisa dari pembayaran kumulatif.
    const totalDibayar = await hitungTotalDibayar(prisma, pembayaran.id);
    const sisa = pembayaran.nominalHarus - totalDibayar;

    if (sisa <= 0) {
      return NextResponse.json({
        alreadyPaid: true,
        totalDibayar,
        nominal: pembayaran.nominalHarus,
      });
    }

    // B6: fee exact per metode, dihitung dari SISA tagihan.
    const serviceFee = hitungFee(metode.id, sisa);
    const grossAmount = sisa + serviceFee;

    // Tandai transaksi PENDING lama sebagai REPLACED agar hanya ada
    // satu transaksi aktif dalam satu waktu (mencegah token basi).
    await prisma.transaksiMidtrans.updateMany({
      where: { pembayaranSantriId: pembayaran.id, status: "PENDING" },
      data: { status: "REPLACED" },
    });

    const orderId = `MED-${santri.noPendaftaran}-${Date.now()}`;
    const isSisa = totalDibayar > 0;

    const snap = await createSnapTransaction({
      orderId,
      grossAmount,
      customerName: santri.namaLengkap,
      customerEmail: santri.email,
      customerPhone: santri.noWaSantri,
      itemName: isSisa
        ? `Sisa Biaya Pendaftaran ${santri.noPendaftaran}`
        : `Biaya Pendaftaran ${santri.noPendaftaran}`,
      itemPrice: sisa,
      serviceFee,
      enabledPayments: metode.snapPayments,
    });

    await prisma.transaksiMidtrans.create({
      data: {
        orderId,
        pembayaranSantriId: pembayaran.id,
        snapToken: snap.token,
        grossAmount,
        serviceFee,
        status: "PENDING",
      },
    });

    return NextResponse.json({
      snapToken: snap.token,
      snapJsUrl: getSnapJsUrl(),
      clientKey: getClientKey(),
      isProduction: isMidtransProduction(),
      orderId,
      grossAmount,
      nominal: pembayaran.nominalHarus,
      sudahDibayar: totalDibayar,
      sisa,
      serviceFee,
      metode: { id: metode.id, label: metode.label },
    });
  } catch (error: any) {
    console.error("Bayar Error:", error);
    return NextResponse.json(
      { error: error?.message || "Gagal membuat transaksi pembayaran." },
      { status: 500 }
    );
  }
}
