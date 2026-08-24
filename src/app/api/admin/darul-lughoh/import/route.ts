import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as xlsx from "xlsx";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "File Excel harus dipilih" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = xlsx.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const rawData = xlsx.utils.sheet_to_json<any>(worksheet);
    
    if (!rawData || rawData.length === 0) {
      return NextResponse.json(
        { error: "File Excel kosong atau format tidak sesuai" },
        { status: 400 }
      );
    }

    const errors = [];
    let successCount = 0;
    let failedCount = 0;

    // Process each row
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const nis = row["NIS"];
      const nama = row["Nama Santri"];
      const rowNum = i + 2;

      if (!nama) {
        errors.push(`Baris ${rowNum}: Nama Santri wajib diisi`);
        failedCount++;
        continue;
      }

      try {
        let santri = null;

        if (nis) {
          santri = await prisma.santri.findUnique({
            where: { noPendaftaran: String(nis) }
          });
        }
        
        if (!santri && nama) {
          const matchedSantris = await prisma.santri.findMany({
            where: { namaLengkap: String(nama) }
          });

          if (matchedSantris.length === 1) {
            santri = matchedSantris[0];
          } else if (matchedSantris.length > 1) {
            errors.push(`Baris ${rowNum}: Ditemukan lebih dari satu santri dengan nama "${nama}". Harap cantumkan NIS.`);
            failedCount++;
            continue;
          }
        }

        if (!santri) {
          errors.push(`Baris ${rowNum}: Santri dengan nama "${nama}" ${nis ? `atau NIS "${nis}"` : ""} tidak ditemukan`);
          failedCount++;
          continue;
        }

        // Check levels
        const levels = [1, 2, 3, 4, 5, 6];
        for (const lvl of levels) {
          const colVal = row[`Level ${lvl}`];
          if (colVal && String(colVal).toUpperCase().trim() === "LULUS") {
            const existingDL = await prisma.darulLughohSantri.findFirst({
              where: {
                santriId: santri.id,
                level: lvl
              },
              orderBy: { percobaan: 'desc' }
            });

            if (existingDL) {
              if (existingDL.statusUjian !== "LULUS") {
                await prisma.darulLughohSantri.update({
                  where: { id: existingDL.id },
                  data: {
                    statusUjian: "LULUS",
                    isLunas: true,
                    nominalDibayar: existingDL.nominalHarus,
                    catatan: "Diimport otomatis"
                  }
                });
              }
            } else {
              // Create new passed record
              await prisma.darulLughohSantri.create({
                data: {
                  santriId: santri.id,
                  level: lvl,
                  percobaan: 1,
                  statusUjian: "LULUS",
                  nominalHarus: 0,
                  nominalDibayar: 0,
                  isLunas: true,
                  catatan: "Terlewati (Import)"
                }
              });
            }
          }
        }

        successCount++;
      } catch (err: any) {
        console.error(`Gagal import baris ${rowNum}:`, err);
        errors.push(`Baris ${rowNum}: Gagal memproses data ${nama}`);
        failedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        total: rawData.length,
        success: successCount,
        failed: failedCount,
        errors
      }
    });

  } catch (error: any) {
    console.error("Import Excel Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan sistem saat memproses file." },
      { status: 500 }
    );
  }
}
