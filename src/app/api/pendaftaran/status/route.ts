import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isMidtransEnabled, getServiceFee } from "@/lib/midtrans";

export const dynamic = "force-dynamic";

// Rate limit sederhana untuk endpoint publik.
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const rateLimitMap = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const attempts = (rateLimitMap.get(ip) || []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  );
  if (attempts.length >= RATE_LIMIT_MAX) {
    rateLimitMap.set(ip, attempts);
    return true;
  }
  attempts.push(now);
  rateLimitMap.set(ip, attempts);
  return false;
}

// GET /api/pendaftaran/status?no=MA-2026-0001&tgl=2005-03-14
// Mengembalikan data TERBATAS untuk halaman cek status publik.
// Verifikasi: nomor pendaftaran + tanggal lahir harus cocok.
export async function GET(req: Request) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Terlalu banyak percobaan. Coba lagi nanti." },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(req.url);
    const no = (searchParams.get("no") || "").trim();
    const tgl = (searchParams.get("tgl") || "").trim();
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
        noPendaftaran: true,
        nis: true,
        namaLengkap: true,
        tanggalLahir: true,
        tempatLahir: true,
        gender: true,
        noWaSantri: true,
        email: true,
        createdAt: true,
        isVerified: true,
        gelombang: { select: { nama: true, periode: { select: { nama: true } } } },
        pembayaranSantri: {
          include: {
            poinTahap: {
              select: {
                nama: true,
                tahapPaket: { select: { urutan: true, nama: true } },
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!santri) {
      return NextResponse.json(
        { error: "Data tidak ditemukan. Periksa kembali nomor pendaftaran." },
        { status: 404 }
      );
    }

    // Verifikasi tanggal lahir (bandingkan komponen tanggal saja).
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

    // Tagihan Tahap 1 (untuk tombol bayar).
    const tagihanTahap1 = santri.pembayaranSantri.find(
      (p) => p.poinTahap.tahapPaket.urutan === 1
    );

    // Transaksi Midtrans sukses (untuk bukti lunas).
    let transaksiSukses: {
      orderId: string;
      paymentType: string | null;
      paidAt: string | null;
      raw: any;
    } | null = null;
    if (tagihanTahap1?.isLunas) {
      const tx = await prisma.transaksiMidtrans.findFirst({
        where: {
          pembayaranSantriId: tagihanTahap1.id,
          status: "SUCCESS",
        },
        orderBy: { paidAt: "desc" },
        select: {
          orderId: true,
          paymentType: true,
          paidAt: true,
          rawNotification: true,
        },
      });
      if (tx) {
        transaksiSukses = {
          orderId: tx.orderId,
          paymentType: tx.paymentType,
          paidAt: tx.paidAt ? tx.paidAt.toISOString() : null,
          raw: tx.rawNotification,
        };
      }
    }

    return NextResponse.json({
      nama: santri.namaLengkap,
      noPendaftaran: santri.noPendaftaran,
      nis: santri.nis,
      tanggalLahir: santri.tanggalLahir
        ? new Date(santri.tanggalLahir).toISOString().slice(0, 10)
        : null,
      tempatLahir: santri.tempatLahir,
      gender: santri.gender,
      noWaSantri: santri.noWaSantri,
      email: santri.email,
      tanggalDaftar: santri.createdAt.toISOString(),
      gelombang: santri.gelombang.nama,
      periode: santri.gelombang.periode.nama,
      isVerified: santri.isVerified,
      midtransEnabled: isMidtransEnabled(),
      serviceFee: getServiceFee(),
      tagihan: tagihanTahap1
        ? {
            nama: tagihanTahap1.poinTahap.nama,
            nominalHarus: tagihanTahap1.nominalHarus,
            nominalDibayar: tagihanTahap1.nominalDibayar,
            sisa:
              tagihanTahap1.nominalHarus - tagihanTahap1.nominalDibayar,
            isLunas: tagihanTahap1.isLunas,
          }
        : null,
      transaksiSukses,
    });
  } catch (error: any) {
    console.error("Status Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan sistem." },
      { status: 500 }
    );
  }
}
