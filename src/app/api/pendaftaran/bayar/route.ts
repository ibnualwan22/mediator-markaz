import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  isMidtransEnabled,
  getClientKey,
  getServiceFee,
  getSnapJsUrl,
  isMidtransProduction,
  createSnapTransaction,
  resolveBiayaPendaftaran,
} from "@/lib/midtrans";

export const dynamic = "force-dynamic";

// POST /api/pendaftaran/bayar
// Body: { noPendaftaran: string }
// Membuat (atau memakai ulang) transaksi Snap Midtrans untuk tagihan
// Tahap 1 (Biaya Pendaftaran) santri. Hanya aktif bila MIDTRANS_ENABLED=true.
export async function POST(req: Request) {
  try {
    if (!isMidtransEnabled()) {
      return NextResponse.json(
        { error: "Pembayaran online belum diaktifkan." },
        { status: 403 }
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

    if (pembayaran.isLunas) {
      return NextResponse.json({ alreadyPaid: true });
    }

    const serviceFee = getServiceFee();
    const grossAmount = pembayaran.nominalHarus + serviceFee;

    // Tandai transaksi PENDING lama sebagai REPLACED agar hanya ada
    // satu transaksi aktif dalam satu waktu (mencegah token basi).
    await prisma.transaksiMidtrans.updateMany({
      where: { pembayaranSantriId: pembayaran.id, status: "PENDING" },
      data: { status: "REPLACED" },
    });

    const orderId = `MED-${santri.noPendaftaran}-${Date.now()}`;

    const snap = await createSnapTransaction({
      orderId,
      grossAmount,
      customerName: santri.namaLengkap,
      customerEmail: santri.email,
      customerPhone: santri.noWaSantri,
      itemName: `Biaya Pendaftaran ${santri.noPendaftaran}`,
      itemPrice: pembayaran.nominalHarus,
      serviceFee,
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
      serviceFee,
    });
  } catch (error: any) {
    console.error("Bayar Error:", error);
    return NextResponse.json(
      { error: error?.message || "Gagal membuat transaksi pembayaran." },
      { status: 500 }
    );
  }
}
