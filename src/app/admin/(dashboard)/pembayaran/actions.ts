"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";

export async function generateTahap(santriId: string, tahap: number) {
  const santri = await prisma.santri.findUnique({ where: { id: santriId } });
  if (!santri) return { success: false, error: "Santri tidak ada" };

  let nominal = 0;
  let keterangan = "";

  switch(tahap) {
    case 2:
      nominal = 1200000;
      keterangan = "Sebelum Pelaksanaan Tes Tahdid Mustawa";
      break;
    case 3:
      nominal = (santri.riwayatAkademik === 'MA' || santri.riwayatAkademik === 'IJAZAH_PESANTREN') ? 3850000 : 4850000;
      keterangan = "Menjelang Pelaksanaan Ujian Mu'adalah";
      break;
    case 4:
      nominal = 6500000;
      keterangan = "Sebelum Pengajuan Visa";
      break;
    case 5:
      nominal = 16250000;
      keterangan = "Sebelum Pemberangkatan";
      break;
    case 6:
      nominal = 10000000;
      keterangan = "Asrama 1 Tahun";
      break;
    default:
      return { success: false, error: "Tahap tidak valid" };
  }

  await prisma.pembayaran.create({
    data: {
      santriId,
      tahap,
      nominal,
      keterangan,
      status: "BELUM_BAYAR"
    }
  });

  revalidatePath(`/admin/pembayaran/${santriId}`);
  revalidatePath(`/admin/pembayaran`);
  return { success: true };
}

import { verifySantri } from "../santri/actions";

export async function updateStatusBayar(pembayaranId: string, status: string) {
  const pembayaran = await prisma.pembayaran.findUnique({
    where: { id: pembayaranId },
    include: { santri: true }
  });

  if (!pembayaran) {
    return { success: false, error: "Data pembayaran tidak ditemukan" };
  }

  await prisma.pembayaran.update({
    where: { id: pembayaranId },
    data: { status: status as any } // as StatusPembayaran
  });

  // Jika tahap 1 dilunasi dan santri belum terverifikasi, otomatis verifikasi
  if (pembayaran.tahap === 1 && status === 'LUNAS' && !pembayaran.santri.isVerified) {
    await verifySantri(pembayaran.santriId);
  }

  revalidatePath(`/admin/pembayaran`);
  revalidatePath(`/admin/pembayaran/[santriId]`, 'page');
  return { success: true };
}
