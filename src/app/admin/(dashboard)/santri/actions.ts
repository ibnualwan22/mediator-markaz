"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function verifySantri(santriId: string) {
  const santri = await prisma.santri.findUnique({
    where: { id: santriId },
    include: { gelombang: true }
  });

  if (!santri || santri.isVerified) {
    return { success: false, error: "Santri tidak ditemukan atau sudah terverifikasi." };
  }

  // 1. Dapatkan angka gelombang (ekstrak dari nama gelombang)
  const gelombangMatch = santri.gelombang.nama.match(/\d+/);
  const gelombangNum = gelombangMatch ? parseInt(gelombangMatch[0]) : 1;
  const kodeGelombang = String(gelombangNum).padStart(2, '0');

  // 2. Dapatkan DDMMYY dari tanggal mendaftar (createdAt)
  const regDate = santri.createdAt;
  const dd = String(regDate.getDate()).padStart(2, '0');
  const mm = String(regDate.getMonth() + 1).padStart(2, '0');
  const yy = String(regDate.getFullYear()).slice(-2);
  const tanggalMendaftar = `${dd}${mm}${yy}`;

  // 3. Dapatkan nomor urut santri dalam gelombang ini saja
  const latestVerifiedCount = await prisma.santri.count({
    where: {
      isVerified: true,
      gelombangId: santri.gelombangId
    }
  });
  const nomorUrut = String(latestVerifiedCount + 1).padStart(3, '0');

  // Gabungkan format: [Gelombang(2)][Tanggal(6)][Urutan(3)]
  const generatedNis = `${kodeGelombang}${tanggalMendaftar}${nomorUrut}`;

  await prisma.santri.update({
    where: { id: santriId },
    data: {
      isVerified: true,
      nis: generatedNis
    }
  });

  const isAgama = santri.riwayatAkademik === 'MA' || santri.riwayatAkademik === 'IJAZAH_PESANTREN';
  const nominalTahap3 = isAgama ? 3850000 : 4850000;

  // Otomatis terbitkan tagihan tahap 2 sampai 5 (kecuali tahap 6)
  await prisma.pembayaran.createMany({
    data: [
      { santriId, tahap: 2, nominal: 1200000, status: "BELUM_BAYAR", keterangan: "Sebelum Pelaksanaan Tes Tahdid Mustawa" },
      { santriId, tahap: 3, nominal: nominalTahap3, status: "BELUM_BAYAR", keterangan: "Menjelang Pelaksanaan Ujian Mu'adalah" },
      { santriId, tahap: 4, nominal: 6500000, status: "BELUM_BAYAR", keterangan: "Sebelum Pengajuan Visa" },
      { santriId, tahap: 5, nominal: 16250000, status: "BELUM_BAYAR", keterangan: "Sebelum Pemberangkatan" }
    ]
  });


  revalidatePath(`/admin/santri/${santriId}`);
  revalidatePath("/admin/santri");
  
  return { success: true, nis: generatedNis };
}

export async function deleteSantri(santriId: string) {
  try {
    await prisma.santri.delete({
      where: { id: santriId }
    });
    revalidatePath("/admin/santri");
    revalidatePath("/admin/pembayaran");
    return { success: true };
  } catch (error: any) {
    console.error("Delete Santri Error:", error);
    return { success: false, error: "Gagal menghapus santri. Silakan coba lagi." };
  }
}
