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

export async function setGelombangActive(id: string, periodeId: string) {
  await prisma.$transaction([
    prisma.gelombang.updateMany({ where: { periodeId }, data: { isActive: false } }),
    prisma.gelombang.update({ where: { id }, data: { isActive: true } })
  ]);
  revalidatePath("/admin/periode");
}
