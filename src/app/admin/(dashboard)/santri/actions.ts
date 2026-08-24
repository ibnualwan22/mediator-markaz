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

  // Resolve default paket
  let paket = await prisma.paketPembayaran.findFirst({
    where: { isDefault: true },
    include: {
      tahapPaket: {
        include: { poinTahap: true }
      }
    }
  });

  if (!paket) {
    paket = await prisma.paketPembayaran.findFirst({
      include: {
        tahapPaket: {
          include: { poinTahap: true }
        }
      }
    });
  }

  const isAgama = santri.riwayatAkademik === 'MA' || santri.riwayatAkademik === 'IJAZAH_PESANTREN';

  // Build pembayaran records if paket exists
  const pembayaranRecords: any[] = [];
  if (paket) {
    for (const tahap of paket.tahapPaket) {
      for (const poin of tahap.poinTahap) {
        const nominalActive = (tahap.isIjazahBased && isAgama && poin.nominalIjazah !== null) ? poin.nominalIjazah : poin.nominal;
        pembayaranRecords.push({
          santriId,
          poinTahapId: poin.id,
          nominalHarus: nominalActive,
          nominalDibayar: 0,
          isLunas: nominalActive === 0
        });
      }
    }
  }

  await prisma.santri.update({
    where: { id: santriId },
    data: {
      isVerified: true,
      nis: generatedNis,
      paketPembayaranId: paket?.id || null
    }
  });

  if (pembayaranRecords.length > 0) {
    await prisma.pembayaranSantri.createMany({
      data: pembayaranRecords
    });
  }

  revalidatePath(`/admin/santri/${santriId}`);
  revalidatePath("/admin/santri");
  revalidatePath("/admin/pembayaran");

  
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

export async function updateSantriData(santriId: string, data: any) {
  try {
    await prisma.santri.update({
      where: { id: santriId },
      data: {
        namaLengkap: data.namaLengkap,
        namaArab: data.namaArab,
        email: data.email,
        asalProvinsi: data.asalProvinsi,
        noWaSantri: data.noWaSantri,
        namaWali: data.namaWali,
        noWaWali: data.noWaWali,
        nomorPaspor: data.nomorPaspor,
      }
    });

    revalidatePath(`/admin/santri/${santriId}`);
    revalidatePath("/admin/santri");
    
    return { success: true };
  } catch (error: any) {
    console.error("Update Santri Error:", error);
    return { success: false, error: "Gagal menyimpan perubahan data santri." };
  }
}
