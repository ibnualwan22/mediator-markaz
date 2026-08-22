"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

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
