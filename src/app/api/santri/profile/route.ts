import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSantriSession } from "@/lib/santri-auth";

export async function POST(req: Request) {
  try {
    const session = await getSantriSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();

    const santri = await prisma.santri.update({
      where: { id: session.santriId },
      data: {
        namaLengkap: data.namaLengkap,
        namaArab: data.namaArab,
        email: data.email,
        noWaSantri: data.noWaSantri,
        asalProvinsi: data.asalProvinsi,
        namaWali: data.namaWali,
        noWaWali: data.noWaWali,
        filePasFoto: data.filePasFoto !== undefined ? data.filePasFoto : undefined,
        riwayatAkademik: data.riwayatAkademik,
        riwayatAkademikLainnya: data.riwayatAkademikLainnya,
        tahunKelulusan: data.tahunKelulusan ? parseInt(data.tahunKelulusan, 10) : undefined,
        jurusan: data.jurusan,
        nomorPaspor: data.nomorPaspor !== undefined ? data.nomorPaspor : undefined,
        tanggalPembuatanPaspor: data.tanggalPembuatanPaspor ? new Date(data.tanggalPembuatanPaspor) : data.tanggalPembuatanPaspor === "" ? null : undefined,
        tanggalKadaluarsaPaspor: data.tanggalKadaluarsaPaspor ? new Date(data.tanggalKadaluarsaPaspor) : data.tanggalKadaluarsaPaspor === "" ? null : undefined,
      },
    });

    const isAgama = santri.riwayatAkademik === 'MA' || santri.riwayatAkademik === 'IJAZAH_PESANTREN';
    
    // Tarik pembayaran yang terpengaruh ijazah
    const pembayaranSantriToUpdate = await prisma.pembayaranSantri.findMany({
      where: { santriId: santri.id },
      include: {
        poinTahap: {
          include: { tahapPaket: true }
        }
      }
    });

    for (const p of pembayaranSantriToUpdate) {
      const poin = p.poinTahap;
      // Tambahkan @ts-ignore jika isBebas belum digenerate type-nya
      // @ts-ignore
      if (poin.isBebas) continue;

      if (poin.tahapPaket.isIjazahBased && poin.nominalIjazah !== null) {
        const nominalHarus = isAgama ? poin.nominalIjazah : poin.nominal;
        if (p.nominalHarus !== nominalHarus) {
          const isLunas = p.nominalDibayar >= nominalHarus;
          await prisma.pembayaranSantri.update({
            where: { id: p.id },
            data: { nominalHarus, isLunas }
          });
        }
      }
    }

    return NextResponse.json({ success: true, santri });
  } catch (error: any) {
    console.error("Update Profile Error:", error);
    return NextResponse.json({ error: error.message || "Gagal mengupdate profil" }, { status: 500 });
  }
}
