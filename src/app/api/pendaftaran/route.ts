import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveBiayaPendaftaran } from "@/lib/midtrans";

// Rate limit sederhana: maks 5 pendaftaran per IP per 10 menit.
// (In-memory; cukup untuk pola traffic form publik di Vercel serverless.)
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const rateLimitMap = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const attempts = (rateLimitMap.get(ip) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (attempts.length >= RATE_LIMIT_MAX) {
    rateLimitMap.set(ip, attempts);
    return true;
  }
  attempts.push(now);
  rateLimitMap.set(ip, attempts);
  // Bersihkan entri kadaluarsa agar map tidak membesar tanpa batas.
  if (rateLimitMap.size > 10000) {
    for (const [key, val] of rateLimitMap) {
      if (val.every((t) => now - t >= RATE_LIMIT_WINDOW_MS)) rateLimitMap.delete(key);
    }
  }
  return false;
}

export async function POST(req: Request) {
  try {
    // Rate limiting per IP.
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Terlalu banyak percobaan. Silakan coba lagi dalam beberapa menit." },
        { status: 429 }
      );
    }

    const body = await req.json();

    // Normalisasi nomor WA ke format 628xxx (untuk otomatisasi).
    // Terima 08xxx, 628xxx, +628xxx, dengan/tanpa spasi & strip.
    const normalizePhone = (phone: any): string => {
      const digits = String(phone || "").replace(/\D/g, "");
      if (digits.startsWith("08")) return "62" + digits.slice(1);
      if (digits.startsWith("8")) return "62" + digits;
      return digits;
    };

    // Check if the applicant selected a Gelombang
    if (!body.gelombangId) {
      return NextResponse.json({ error: "Silakan pilih gelombang pendaftaran terlebih dahulu." }, { status: 400 });
    }

    // Find requested Gelombang
    const activeGelombang = await prisma.gelombang.findFirst({
      where: { id: body.gelombangId, isActive: true },
      include: { periode: true }
    });

    if (!activeGelombang) {
      return NextResponse.json({ error: "Gelombang tidak valid atau saat ini sedang ditutup." }, { status: 400 });
    }

    const santriData = {
      gelombangId: activeGelombang.id,

      namaLengkap: body.namaLengkap,
      namaArab: body.namaArab,
      tempatLahir: body.tempatLahir || null,
      tanggalLahir: body.tanggalLahir ? new Date(body.tanggalLahir) : null,
      asalProvinsi: body.asalProvinsi,
      noWaSantri: normalizePhone(body.noWaSantri),
      gender: body.gender,
      email: body.email,
      namaWali: body.namaWali,
      noWaWali: normalizePhone(body.noWaWali),

      fileAkteLahir: body.fileAkteLahir,
      fileKtp: body.fileKtp || null,
      fileKK: body.fileKK || null,
      filePasFoto: body.filePasFoto,

      riwayatAkademik: body.riwayatAkademik,
      riwayatAkademikLainnya: body.riwayatAkademikLainnya,
      tahunKelulusan: body.tahunKelulusan,
      fileIjazah: body.fileIjazah,
      fileTranskrip: body.fileTranskrip || null,

      nomorPaspor: body.nomorPaspor || null,
      kantorPenerbitPaspor: body.kantorPenerbitPaspor || null,
      tanggalPembuatanPaspor: body.tanggalPembuatanPaspor ? new Date(body.tanggalPembuatanPaspor) : null,
      tanggalKadaluarsaPaspor: body.tanggalKadaluarsaPaspor ? new Date(body.tanggalKadaluarsaPaspor) : null,
      filePaspor: body.filePaspor || null,

      setujuInvestasi: body.setujuInvestasi,
    };

    // Generate No Pendaftaran: MA-[Tahun]-XXXX dengan retry anti-duplikat.
    // Nomor dihitung dari nomor TERBESAR yang sudah ada (+1), bukan dari count,
    // karena count bisa menabrak nomor yang sudah ada bila ada data yang dihapus.
    // Tiap retry menaikkan nomor (+attempt) sehingga tidak pernah mencoba nomor
    // yang sama dua kali.
    const currentYear = new Date().getFullYear();
    const MAX_RETRY = 5;
    let santri: any = null;
    let noPendaftaran = "";
    let lastError: any = null;

    const lastSantri = await prisma.santri.findFirst({
      where: {
        noPendaftaran: { startsWith: `MA-${currentYear}-` }
      },
      orderBy: { noPendaftaran: "desc" },
      select: { noPendaftaran: true }
    });
    const baseNum = lastSantri
      ? parseInt(lastSantri.noPendaftaran.split("-")[2], 10) || 0
      : 0;

    for (let attempt = 0; attempt < MAX_RETRY; attempt++) {
      const nextNum = baseNum + 1 + attempt;
      const paddingCount = String(nextNum).padStart(4, '0');
      noPendaftaran = `MA-${currentYear}-${paddingCount}`;

      try {
        santri = await prisma.santri.create({
          data: {
            noPendaftaran,
            ...santriData,
          }
        });
        lastError = null;
        break;
      } catch (err: any) {
        // Retry hanya untuk duplikat noPendaftaran; error lain langsung dilempar.
        const target = JSON.stringify(err?.meta?.target ?? "");
        if (err?.code === "P2002" && target.includes("noPendaftaran")) {
          lastError = err;
          continue;
        }
        throw err;
      }
    }

    if (!santri) {
      console.error("Pendaftaran Error: gagal membuat noPendaftaran unik setelah retry", lastError);
      return NextResponse.json({
        error: "Gagal membuat nomor pendaftaran. Silakan coba lagi."
      }, { status: 500 });
    }

    // Generation of Tahap 1 pembayaran is now handled by PembayaranSantri system during verification.

    // Buat tagihan Tahap 1 (Biaya Pendaftaran) sejak awal agar bisa dibayar
    // via payment gateway tanpa menunggu verifikasi admin. Idempoten per
    // (santriId, poinTahapId); verifikasi admin melewati record yang sudah ada.
    let pembayaranSantriId: string | null = null;
    try {
      const biaya = await resolveBiayaPendaftaran(prisma, santri.id);
      if (biaya) {
        const existing = await prisma.pembayaranSantri.findUnique({
          where: {
            santriId_poinTahapId: {
              santriId: santri.id,
              poinTahapId: biaya.poinTahapId,
            },
          },
          select: { id: true },
        });
        if (existing) {
          pembayaranSantriId = existing.id;
        } else {
          const ps = await prisma.pembayaranSantri.create({
            data: {
              santriId: santri.id,
              poinTahapId: biaya.poinTahapId,
              nominalHarus: biaya.nominal,
              nominalDibayar: 0,
              isLunas: biaya.nominal === 0,
            },
            select: { id: true },
          });
          pembayaranSantriId = ps.id;
        }
      }
    } catch (e) {
      // Kegagalan membuat tagihan tidak menggagalkan pendaftaran;
      // admin tetap bisa membuatkan tagihan saat verifikasi.
      console.error("Pendaftaran: gagal membuat tagihan Tahap 1", e);
    }

    return NextResponse.json({ success: true, id: santri.id, noPendaftaran, pembayaranSantriId });
  } catch (error: any) {
    console.error("Pendaftaran Error:", error);
    return NextResponse.json({
      error: "Terjadi kesalahan sistem saat menyimpan data.",
      details: error.message
    }, { status: 500 });
  }
}
