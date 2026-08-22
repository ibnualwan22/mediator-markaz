import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as xlsx from "xlsx";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const gelombangId = formData.get("gelombangId") as string;
    const overwriteExisting = formData.get("overwriteExisting") === "true";

    if (!file || !gelombangId) {
      return NextResponse.json(
        { error: "File Excel dan Gelombang harus dipilih" },
        { status: 400 }
      );
    }

    // Pastikan gelombang valid
    const gelombang = await prisma.gelombang.findUnique({
      where: { id: gelombangId }
    });

    if (!gelombang) {
      return NextResponse.json(
        { error: "Gelombang tidak ditemukan" },
        { status: 400 }
      );
    }

    // Parse Excel File
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = xlsx.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Konversi sheet ke object JS array
    const rawData = xlsx.utils.sheet_to_json<any>(worksheet);
    
    if (!rawData || rawData.length === 0) {
      return NextResponse.json(
        { error: "File Excel kosong atau format tidak sesuai" },
        { status: 400 }
      );
    }

    const currentYear = new Date().getFullYear();
    const newSantriList = [];
    const errors = [];
    let successCount = 0;
    let failedCount = 0;

    // Get current last number for MA-YYYY-XXXX to ensure uniqueness within loop
    let lastSantri = await prisma.santri.findFirst({
      where: { noPendaftaran: { startsWith: `MA-${currentYear}-` } },
      orderBy: { noPendaftaran: 'desc' }
    });
    
    let currentNumber = 0;
    if (lastSantri) {
      const match = lastSantri.noPendaftaran.match(/MA-\d{4}-(\d{4})/);
      if (match && match[1]) {
        currentNumber = parseInt(match[1]);
      }
    }

    // Process each row
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const namaLengkap = row["Nama Lengkap"];
      const namaArab = row["Nama Arab"] || "-";
      let genderStr = row["Gender"];
      
      const rowNum = i + 2; // +1 untuk header, +1 karena array 0-indexed

      // Validation
      if (!namaLengkap) {
        errors.push(`Baris ${rowNum}: Nama Lengkap wajib diisi`);
        failedCount++;
        continue;
      }
      
      let gender: "LAKI_LAKI" | "PEREMPUAN" = "LAKI_LAKI";
      if (genderStr) {
        genderStr = String(genderStr).toUpperCase().trim();
        if (genderStr.includes("LAKI") || genderStr === "L") {
          gender = "LAKI_LAKI";
        } else if (genderStr.includes("PEREMPUAN") || genderStr === "P" || genderStr.includes("WANITA")) {
          gender = "PEREMPUAN";
        } else {
          errors.push(`Baris ${rowNum}: Format Gender tidak valid untuk ${namaLengkap}. Harus LAKI_LAKI atau PEREMPUAN`);
          failedCount++;
          continue;
        }
      } else {
        errors.push(`Baris ${rowNum}: Gender wajib diisi untuk ${namaLengkap}`);
        failedCount++;
        continue;
      }

      // Generate nomor pendaftaran
      currentNumber++;
      const paddingCount = String(currentNumber).padStart(4, '0');
      const noPendaftaran = `MA-${currentYear}-${paddingCount}`;

      try {
        let existingSantri = null;

        if (overwriteExisting) {
          existingSantri = await prisma.santri.findFirst({
            where: {
              namaLengkap: String(namaLengkap),
              gelombangId: gelombangId
            }
          });
        }

        if (existingSantri) {
          // Update data yang ada
          const santri = await prisma.santri.update({
            where: { id: existingSantri.id },
            data: {
              namaArab: String(namaArab),
              gender: gender,
            }
          });
          successCount++;
          newSantriList.push({ id: santri.id, namaLengkap: santri.namaLengkap, noPendaftaran: santri.noPendaftaran });
        } else {
          // Buat data baru
          const santri = await prisma.santri.create({
            data: {
              noPendaftaran,
              gelombangId: gelombangId,
              
              namaLengkap: String(namaLengkap),
              namaArab: String(namaArab),
              gender: gender,
              
              // Placeholder wajib
              asalProvinsi: "-",
              noWaSantri: "-",
              email: "-",
              namaWali: "-",
              noWaWali: "-",
              fileAkteLahir: "-",
              filePasFoto: "-",
              fileIjazah: "-",
              riwayatAkademik: "SMA",
              tahunKelulusan: currentYear,
              setujuInvestasi: false
            }
          });
          successCount++;
          newSantriList.push({ id: santri.id, namaLengkap: santri.namaLengkap, noPendaftaran: santri.noPendaftaran });
        }
      } catch (err: any) {
        console.error(`Gagal import baris ${rowNum}:`, err);
        errors.push(`Baris ${rowNum}: Gagal menyimpan data ${namaLengkap}`);
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
      },
      data: newSantriList
    });

  } catch (error: any) {
    console.error("Import Excel Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan sistem saat memproses file." },
      { status: 500 }
    );
  }
}
