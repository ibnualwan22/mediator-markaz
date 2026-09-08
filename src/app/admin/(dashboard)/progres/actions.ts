"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { deleteFileFromDrive } from "@/lib/googleDrive";

export async function toggleCheckboxProgres(progresSantriId: string, status: boolean) {
  try {
    await prisma.progresSantri.update({
      where: { id: progresSantriId },
      data: { 
        selesai: status,
        tanggalSelesai: status ? new Date() : null
      }
    });

    revalidatePath("/admin/progres");
    return { success: true };
  } catch (error) {
    console.error("Error toggle progres:", error);
    return { success: false };
  }
}

export async function updateProgresFileUrl(id: string, fileUrl: string | null) {
  try {
    if (fileUrl === null) {
      const record = await prisma.progresSantri.findUnique({ where: { id } });
      if (record?.fileUrl) {
         const match = record.fileUrl.match(/\/d\/([a-zA-Z0-9_-]+)\//);
         if (match) {
             await deleteFileFromDrive(match[1]).catch(e => console.error("Drive delete error", e));
         }
      }
    }

    await prisma.progresSantri.update({
      where: { id },
      data: { fileUrl }
    });
    revalidatePath("/admin/progres");
    return { success: true };
  } catch (error) {
    console.error("Error updating progres file url:", error);
    return { success: false };
  }
}

export async function createTahapProgres(data: { nama: string; urutan: number; periodeId: string }) {
  try {
    await prisma.tahapProgres.create({
      data: {
        nama: data.nama,
        urutan: data.urutan,
        periodeId: data.periodeId,
        isActive: true
      }
    });
    revalidatePath("/admin/progres/master");
    return { success: true };
  } catch (error) {
    console.error("Error creating tahap progres:", error);
    return { success: false };
  }
}

export async function updateTahapProgres(id: string, data: { nama: string; urutan: number; isActive: boolean }) {
  try {
    await prisma.tahapProgres.update({
      where: { id },
      data: {
        nama: data.nama,
        urutan: data.urutan,
        isActive: data.isActive
      }
    });
    revalidatePath("/admin/progres/master");
    return { success: true };
  } catch (error) {
    console.error("Error updating tahap progres:", error);
    return { success: false };
  }
}

export async function deleteTahapProgres(id: string) {
  try {
    await prisma.tahapProgres.delete({
      where: { id }
    });
    revalidatePath("/admin/progres/master");
    return { success: true };
  } catch (error) {
    console.error("Error deleting tahap progres:", error);
    return { success: false };
  }
}

export async function duplicateTahapProgresFromPeriode(sourcePeriodeId: string, currentPeriodeId: string) {
  try {
    const sourceTahaps = await prisma.tahapProgres.findMany({
      where: { periodeId: sourcePeriodeId },
      orderBy: { urutan: 'asc' }
    });

    if (sourceTahaps.length === 0) {
      return { success: false, error: 'Tidak ada tahap progres di periode sumber.' };
    }

    await prisma.$transaction(async (tx) => {
      for (const tahap of sourceTahaps) {
        await tx.tahapProgres.create({
          data: {
            periodeId: currentPeriodeId,
            nama: tahap.nama,
            urutan: tahap.urutan,
            isActive: tahap.isActive
          }
        });
      }
    });

    revalidatePath("/admin/progres/master");
    return { success: true };
  } catch (error) {
    console.error("Error duplicating tahap progres:", error);
    return { success: false, error: 'Kesusahan menduplikasi tahap.' };
  }
}

/**
 * Searches for Santri across all Gelombang in a given Periode.
 * Uses a basic custom fuzzy match for typo-tolerance (e.g. "ahmd" matches "Ahmad").
 */
export async function searchSantriGlobal(query: string, periodeId: string) {
  if (!query || query.length < 2) return [];

  // 1. Fetch all verified santri for the current periode, returning minimal fields
  // If periode is empty, return empty (or search all periods, but typically we want the active one).
  const santriList = await prisma.santri.findMany({
    where: {
      isVerified: true,
      isWithdrawn: false,
      gelombang: periodeId ? { periodeId: periodeId } : undefined,
    },
    select: {
      id: true,
      namaLengkap: true,
      nis: true,
      gelombangId: true,
      gelombang: {
        select: { nama: true }
      }
    }
  });

  const queryLower = query.toLowerCase().replace(/\s+/g, "");

  // 2. Perform in-memory fuzzy/substring matching
  const matched = santriList.filter(s => {
    // Exact/Substring match first
    const nameLower = s.namaLengkap.toLowerCase();
    const nisLower = s.nis?.toLowerCase() || "";
    
    if (nameLower.includes(query.toLowerCase()) || nisLower.includes(query.toLowerCase())) return true;
    
    // Fuzzy logic (subsequence match): check if query letters appear in order within the name
    let qIdx = 0;
    const nameNoSpaces = nameLower.replace(/\s+/g, "");
    for (let i = 0; i < nameNoSpaces.length; i++) {
      if (nameNoSpaces[i] === queryLower[qIdx]) {
        qIdx++;
      }
      if (qIdx === queryLower.length) return true;
    }
    
    return false;
  });

  // Limit to 10 results to keep the UI snappy
  return matched.slice(0, 10).map(s => ({
    id: s.id,
    namaLengkap: s.namaLengkap,
    nis: s.nis,
    gelombangId: s.gelombangId,
    gelombangNama: s.gelombang?.nama || "Unknown"
  }));
}
