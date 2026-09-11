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
      },
    });

    return NextResponse.json({ success: true, santri });
  } catch (error: any) {
    console.error("Update Profile Error:", error);
    return NextResponse.json({ error: error.message || "Gagal mengupdate profil" }, { status: 500 });
  }
}
