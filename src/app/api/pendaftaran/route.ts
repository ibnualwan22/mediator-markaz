import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Find Active Gelombang
    const activeGelombang = await prisma.gelombang.findFirst({
      where: { isActive: true },
      include: { periode: true }
    });

    if (!activeGelombang) {
      return NextResponse.json({ error: "Pendaftaran saat ini sedang ditutup. Tidak ada gelombang aktif." }, { status: 400 });
    }

    // Generate No Pendaftaran: MA-[Tahun]-XXXX
    const currentYear = new Date().getFullYear();
    const count = await prisma.santri.count({
      where: {
        noPendaftaran: { startsWith: `MA-${currentYear}-` }
      }
    });
    const paddingCount = String(count + 1).padStart(4, '0');
    const noPendaftaran = `MA-${currentYear}-${paddingCount}`;

    // Insert Santri Data
    const santri = await prisma.santri.create({
      data: {
        noPendaftaran,
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
        filePasFoto: body.filePasFoto,

        riwayatAkademik: body.riwayatAkademik,
        riwayatAkademikLainnya: body.riwayatAkademikLainnya,
        tahunKelulusan: body.tahunKelulusan,
        fileIjazah: body.fileIjazah,

        nomorPaspor: body.nomorPaspor || null,
        tanggalKadaluarsaPaspor: body.tanggalKadaluarsaPaspor ? new Date(body.tanggalKadaluarsaPaspor) : null,
        filePaspor: body.filePaspor || null,

        setujuInvestasi: body.setujuInvestasi,
      }
    });

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
