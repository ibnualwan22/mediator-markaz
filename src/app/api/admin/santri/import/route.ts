import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as xlsx from "xlsx";

// Helper: Normalisasi nama untuk fuzzy matching
// Menghapus simbol, tanda baca, spasi berlebih, dan lowercase
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, '') // hapus simbol & tanda baca
    .replace(/\s+/g, ' ')          // hapus spasi berlebih
    .trim();
}

// Helper: Cek apakah value dari Excel terisi (bukan kosong / placeholder)
function hasValue(val: any): boolean {
  if (val === undefined || val === null) return false;
  const str = String(val).trim();
  return str !== '' && str !== '-';
}

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

    // Ambil semua santri sekali untuk fuzzy matching (efisien)
    const allSantri = await prisma.santri.findMany({
      select: { id: true, namaLengkap: true, noPendaftaran: true }
    });

    // Buat lookup map: normalized name -> santri record
    const santriMap = new Map<string, typeof allSantri[0]>();
    for (const s of allSantri) {
      santriMap.set(normalizeName(s.namaLengkap), s);
    }

    // Process each row
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const namaLengkap = row["Nama Lengkap"];
      
      const rowNum = i + 2; // +1 untuk header, +1 karena array 0-indexed

      // Validation
      if (!namaLengkap) {
        errors.push(`Baris ${rowNum}: Nama Lengkap wajib diisi`);
        failedCount++;
        continue;
      }

      // Fuzzy match: cari santri berdasarkan nama yang sudah dinormalisasi
      const normalizedInput = normalizeName(String(namaLengkap));
      const matchedSantri = santriMap.get(normalizedInput);

      if (!matchedSantri) {
        errors.push(`Baris ${rowNum}: Santri dengan nama "${namaLengkap}" tidak ditemukan`);
        failedCount++;
        continue;
      }

      // Build update data — hanya field yang TERISI di Excel yang akan di-update
      const updateData: any = {};

      if (hasValue(row["Nama Arab"])) {
        updateData.namaArab = String(row["Nama Arab"]);
      }

      // Gender
      let genderStr = row["Gender"];
      if (genderStr) {
        genderStr = String(genderStr).toUpperCase().trim();
        if (genderStr.includes("LAKI") || genderStr === "L") {
          updateData.gender = "LAKI_LAKI";
        } else if (genderStr.includes("PEREMPUAN") || genderStr === "P" || genderStr.includes("WANITA")) {
          updateData.gender = "PEREMPUAN";
        } else {
          errors.push(`Baris ${rowNum}: Format Gender tidak valid untuk ${namaLengkap}. Harus LAKI_LAKI atau PEREMPUAN`);
          failedCount++;
          continue;
        }
      }

      if (hasValue(row["Asal Provinsi"])) {
        updateData.asalProvinsi = String(row["Asal Provinsi"]);
      }

      if (hasValue(row["No. WA Santri"])) {
        updateData.noWaSantri = String(row["No. WA Santri"]);
      }

      if (hasValue(row["Email"])) {
        updateData.email = String(row["Email"]);
      }

      if (hasValue(row["Nama Wali"])) {
        updateData.namaWali = String(row["Nama Wali"]);
      }

      if (hasValue(row["No. WA Wali"])) {
        updateData.noWaWali = String(row["No. WA Wali"]);
      }

      if (hasValue(row["Riwayat Akademik"])) {
        const riwayatStr = String(row["Riwayat Akademik"]).toUpperCase();
        if (riwayatStr.includes("MA") || riwayatStr.includes("MADRASAH ALIYAH")) {
          updateData.riwayatAkademik = "MA";
        } else if (riwayatStr.includes("PESANTREN") || riwayatStr.includes("IJAZAH_PESANTREN")) {
          updateData.riwayatAkademik = "IJAZAH_PESANTREN";
        } else if (riwayatStr.includes("SMA")) {
          updateData.riwayatAkademik = "SMA";
        } else if (riwayatStr.includes("SMK")) {
          updateData.riwayatAkademik = "SMK";
        } else if (riwayatStr.includes("PAKET") || riwayatStr.includes("PAKET_C") || riwayatStr.includes("PAKET C")) {
          updateData.riwayatAkademik = "PAKET_C";
        }
      }

      if (hasValue(row["Tahun Kelulusan"])) {
        const parsed = parseInt(row["Tahun Kelulusan"]);
        if (!isNaN(parsed)) updateData.tahunKelulusan = parsed;
      }

      if (hasValue(row["Nomor Paspor"])) {
        updateData.nomorPaspor = String(row["Nomor Paspor"]);
      }

      // Jika tidak ada field yang terisi, skip
      if (Object.keys(updateData).length === 0) {
        errors.push(`Baris ${rowNum}: Tidak ada data yang perlu diupdate untuk ${namaLengkap}`);
        failedCount++;
        continue;
      }

      try {
        const santri = await prisma.santri.update({
          where: { id: matchedSantri.id },
          data: updateData
        });
        successCount++;
        newSantriList.push({ id: santri.id, namaLengkap: santri.namaLengkap, noPendaftaran: santri.noPendaftaran });
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
