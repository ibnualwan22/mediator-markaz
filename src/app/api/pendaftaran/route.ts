import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();

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
      asalProvinsi: body.asalProvinsi,
      noWaSantri: body.noWaSantri,
      gender: body.gender,
      email: body.email,
      namaWali: body.namaWali,
      noWaWali: body.noWaWali,

      fileAkteLahir: body.fileAkteLahir,
      fileKtp: body.fileKtp || null,
      filePasFoto: body.filePasFoto,

      riwayatAkademik: body.riwayatAkademik,
      riwayatAkademikLainnya: body.riwayatAkademikLainnya,
      tahunKelulusan: body.tahunKelulusan,
      fileIjazah: body.fileIjazah,

      nomorPaspor: body.nomorPaspor || null,
      tanggalPembuatanPaspor: body.tanggalPembuatanPaspor ? new Date(body.tanggalPembuatanPaspor) : null,
      tanggalKadaluarsaPaspor: body.tanggalKadaluarsaPaspor ? new Date(body.tanggalKadaluarsaPaspor) : null,
      filePaspor: body.filePaspor || null,

      setujuInvestasi: body.setujuInvestasi,
    };

    // Generate No Pendaftaran: MA-[Tahun]-XXXX dengan retry anti-duplikat.
    // Nomor dihitung dari count+1 sehingga dua pendaftar yang submit hampir
    // bersamaan bisa mendapat nomor yang sama; bila duplikat (P2002 pada
    // noPendaftaran), hitung ulang nomornya dan coba lagi.
    const currentYear = new Date().getFullYear();
    const MAX_RETRY = 5;
    let santri: any = null;
    let noPendaftaran = "";
    let lastError: any = null;

    for (let attempt = 0; attempt < MAX_RETRY; attempt++) {
      const count = await prisma.santri.count({
        where: {
          noPendaftaran: { startsWith: `MA-${currentYear}-` }
        }
      });
      const paddingCount = String(count + 1).padStart(4, '0');
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

    return NextResponse.json({ success: true, id: santri.id, noPendaftaran });
  } catch (error: any) {
    console.error("Pendaftaran Error:", error);
    return NextResponse.json({
      error: "Terjadi kesalahan sistem saat menyimpan data.",
      details: error.message
    }, { status: 500 });
  }
}
