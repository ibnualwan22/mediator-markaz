"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { verifikasiCamaba } from "@/lib/verifikasiCamaba";

// Verifikasi manual oleh admin (tombol "Verifikasi & Generate NIS").
// Inti logika ada di lib/verifikasiCamaba agar dipakai bersama
// auto-verifikasi saat pembayaran Midtrans sukses.
export async function verifySantri(santriId: string) {
  const hasil = await verifikasiCamaba(santriId);
  if (!hasil.success) {
    return { success: false, error: hasil.error || "Gagal verifikasi." };
  }
  revalidatePath(`/admin/santri/${santriId}`);
  revalidatePath("/admin/santri");
  revalidatePath("/admin/pembayaran");
  return { success: true, nis: hasil.nis };
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
    const parseDate = (dString: any) => dString ? new Date(dString) : null;
    
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
        gender: data.gender,
        nomorPaspor: data.nomorPaspor,
        tanggalPembuatanPaspor: parseDate(data.tanggalPembuatanPaspor),
        tanggalKadaluarsaPaspor: parseDate(data.tanggalKadaluarsaPaspor),
        nis: data.nis,
        nomorUrut: data.nomorUrut,
        jurusan: data.jurusan || null,
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

export async function withdrawSantri(santriId: string, note: string) {
  try {
    await prisma.santri.update({
      where: { id: santriId },
      data: {
        isWithdrawn: true,
        withdrawnAt: new Date(),
        withdrawnNote: note,
      }
    });
    revalidatePath("/admin/santri");
    revalidatePath(`/admin/santri/${santriId}`);
    revalidatePath("/admin/pembayaran");
    revalidatePath("/admin/pemberkasan");
    return { success: true };
  } catch (error: any) {
    console.error("Withdraw Santri Error:", error);
    return { success: false, error: "Gagal merubah status santri." };
  }
}

export async function reactivateSantri(santriId: string) {
  try {
    await prisma.santri.update({
      where: { id: santriId },
      data: {
        isWithdrawn: false,
        withdrawnAt: null,
        withdrawnNote: null,
      }
    });
    revalidatePath("/admin/santri");
    revalidatePath(`/admin/santri/${santriId}`);
    revalidatePath("/admin/pembayaran");
    revalidatePath("/admin/pemberkasan");
    revalidatePath("/admin/darul-lughoh");
    revalidatePath("/admin/progres");
    return { success: true };
  } catch (error: any) {
    console.error("Reactivate Santri Error:", error);
    return { success: false, error: "Gagal mengaktifkan kembali santri." };
  }
}

export async function transferSantriToGelombang(santriId: string, targetGelombangId: string) {
  try {
    const santri = await prisma.santri.findUnique({
      where: { id: santriId },
      include: {
        pembayaranSantri: { include: { poinTahap: true } },
        paketPembayaran: true
      }
    });

    if (!santri) throw new Error("Santri tidak ditemukan");

    // Generate new NIS for the target gelombang
    const targetGelombang = await prisma.gelombang.findUnique({
      where: { id: targetGelombangId }
    });
    if (!targetGelombang) throw new Error("Gelombang tujuan tidak ditemukan");

    let newNis = santri.nis;
    const gelombangMatch = targetGelombang.nama.match(/\d+/);
    const kodeGelombang = String(gelombangMatch ? parseInt(gelombangMatch[0]) : 1).padStart(2, '0');
    
    const dd = String(santri.createdAt.getDate()).padStart(2, '0');
    const mm = String(santri.createdAt.getMonth() + 1).padStart(2, '0');
    const yy = String(santri.createdAt.getFullYear()).slice(-2);
    const tanggalMendaftar = `${dd}${mm}${yy}`;
    
    const latestVerifiedCount = await prisma.santri.count({
      where: { isVerified: true, gelombangId: targetGelombangId }
    });
    const nomorUrut = String(latestVerifiedCount + 1).padStart(3, '0');
    newNis = `${kodeGelombang}${tanggalMendaftar}${nomorUrut}`;

    // Determine target Paket Pembayaran (match by name or use default)
    let targetPaketId = santri.paketPembayaranId;
    if (santri.paketPembayaran && targetGelombang.periodeId !== santri.paketPembayaran.periodeId) {
      const matchingPaket = await prisma.paketPembayaran.findFirst({
        where: { periodeId: targetGelombang.periodeId, nama: santri.paketPembayaran.nama }
      });
      if (matchingPaket) {
        targetPaketId = matchingPaket.id;
      } else {
        const defaultPaket = await prisma.paketPembayaran.findFirst({
          where: { periodeId: targetGelombang.periodeId, isDefault: true }
        });
        if (defaultPaket) targetPaketId = defaultPaket.id;
      }
    }

    let totalPaid = 0;
    let newPembayaranRecords: any[] = [];
    let deleteOld = false;

    // Check if period/paket is changing
    if (targetPaketId && targetPaketId !== santri.paketPembayaranId) {
      deleteOld = true;
      // Sum all previously paid Tahap
      totalPaid = santri.pembayaranSantri.reduce((sum, p) => sum + p.nominalDibayar, 0);

      // Fetch the new paket structure
      const targetPaket = await prisma.paketPembayaran.findUnique({
        where: { id: targetPaketId },
        include: {
          tahapPaket: {
            orderBy: { urutan: 'asc' },
            include: {
              poinTahap: { orderBy: { urutan: 'asc' } }
            }
          }
        }
      });

      if (targetPaket) {
        const isAgama = santri.riwayatAkademik === 'MA' || santri.riwayatAkademik === 'IJAZAH_PESANTREN';
        let remainingBalance = totalPaid;

        for (const tahap of targetPaket.tahapPaket) {
          for (const poin of tahap.poinTahap) {
            const nominalHarus = (tahap.isIjazahBased && isAgama && poin.nominalIjazah !== null) ? poin.nominalIjazah : poin.nominal;
            const toPay = Math.min(remainingBalance, nominalHarus);
            remainingBalance -= toPay;

            let isLunas = toPay >= nominalHarus && nominalHarus > 0;
            if (nominalHarus === 0 && !poin.isBebas) isLunas = true; // Auto-lunas if it is genuinely free

            newPembayaranRecords.push({
              santriId,
              poinTahapId: poin.id,
              nominalHarus,
              nominalDibayar: toPay,
              isLunas
            });
          }
        }
      }
    }

    // Wrap in transaction for safety
    await prisma.$transaction(async (tx) => {
      // 1. If paket changed, migrate payments
      if (deleteOld) {
        await tx.pembayaranSantri.deleteMany({
          where: { santriId }
        });
        if (newPembayaranRecords.length > 0) {
          await tx.pembayaranSantri.createMany({
            data: newPembayaranRecords
          });
        }
      }

      // 2. Update santri gelombang and paket and NIS
      await tx.santri.update({
        where: { id: santriId },
        data: {
          gelombangId: targetGelombangId,
          paketPembayaranId: targetPaketId,
          nis: newNis,
          isWithdrawn: false,
          withdrawnAt: null,
          withdrawnNote: null,
        }
      });
    });

    revalidatePath("/admin/santri");
    revalidatePath(`/admin/santri/${santriId}`);
    revalidatePath("/admin/pembayaran");
    revalidatePath("/admin/pemberkasan");
    
    return { success: true };
  } catch (error: any) {
    console.error("Transfer Gelombang Error:", error);
    return { success: false, error: "Gagal memindahkan santri." };
  }
}
