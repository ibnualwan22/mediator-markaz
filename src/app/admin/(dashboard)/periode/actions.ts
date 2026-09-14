"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createPeriode(data: { nama: string; tahunDibuka: number }) {
  await prisma.periode.create({
    data: {
      nama: data.nama,
      tahunDibuka: data.tahunDibuka,
    }
  });
  revalidatePath("/admin/periode");
}

export async function setPeriodeActive(id: string) {
  await prisma.$transaction([
    prisma.periode.updateMany({ data: { isActive: false } }),
    prisma.periode.update({ where: { id }, data: { isActive: true } })
  ]);
  revalidatePath("/admin/periode");
}

export async function createGelombang(data: { nama: string; periodeId: string; start: string; end: string }) {
  await prisma.gelombang.create({
    data: {
      nama: data.nama,
      periodeId: data.periodeId,
      tanggalBuka: new Date(data.start),
      tanggalTutup: new Date(data.end),
    }
  });
  revalidatePath("/admin/periode");
}

export async function toggleGelombangActive(id: string, currentStatus: boolean, periodeId: string) {
  if (!currentStatus) {
    const activeCount = await prisma.gelombang.count({ where: { periodeId, isActive: true } });
    if (activeCount >= 3) {
      throw new Error("Maksimal 3 gelombang yang dapat diaktifkan bersamaan dalam satu periode.");
    }
  }
  
  await prisma.gelombang.update({ 
    where: { id }, 
    data: { isActive: !currentStatus } 
  });
  
  revalidatePath("/admin/periode");
  return { success: true };
}

export async function deletePeriode(id: string) {
  await prisma.periode.delete({ where: { id } });
  revalidatePath("/admin/periode");
}

export async function editPeriode(id: string, newName: string) {
  await prisma.periode.update({ where: { id }, data: { nama: newName } });
  revalidatePath("/admin/periode");
}

export async function deleteGelombang(id: string) {
  await prisma.gelombang.delete({ where: { id } });
  revalidatePath("/admin/periode");
}

export async function editGelombang(id: string, newName: string) {
  await prisma.gelombang.update({ where: { id }, data: { nama: newName } });
  revalidatePath("/admin/periode");
}
