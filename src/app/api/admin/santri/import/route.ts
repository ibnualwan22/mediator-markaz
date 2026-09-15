import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as xlsx from "xlsx";

function levenshteinDistance(s: string, t: string): number {
  if (!s.length) return t.length;
  if (!t.length) return s.length;
  const arr: number[][] = [];
  for (let i = 0; i <= t.length; i++) {
    arr[i] = [i];
    for (let j = 1; j <= s.length; j++) {
      arr[i][j] =
        i === 0
          ? j
          : Math.min(
              arr[i - 1][j] + 1,
              arr[i][j - 1] + 1,
              arr[i - 1][j - 1] + (s[j - 1] === t[i - 1] ? 0 : 1)
            );
    }
  }
  return arr[t.length][s.length];
}

function parseExcelDate(val: any): Date | null {
  if (val === undefined || val === null || val === '') return null;
  if (typeof val === 'number') {
    return new Date(Math.round((val - 25569) * 86400 * 1000));
  }
  const str = String(val).trim();
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    }
  }
  const date = new Date(val);
  return isNaN(date.getTime()) ? null : date;
}

// Removed unused normalizeName

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
    const errors: string[] = [];
    const successLogs: string[] = [];
    let successCount = 0;
    let failedCount = 0;

    // Ambil semua santri yang memiliki NIS (NIC)
    const allSantri = await prisma.santri.findMany({
      where: { nis: { not: null } },
      select: { id: true, namaLengkap: true, noPendaftaran: true, nis: true }
    });

    // Buat lookup map: nis -> santri record
    const santriMap = new Map<string, typeof allSantri[0]>();
    for (const s of allSantri) {
      if (s.nis) santriMap.set(s.nis, s);
    }

    // Process each row
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const nic = row["NIC"];
      const namaLengkap = row["Nama Lengkap"];
      
      const rowNum = i + 2; // +1 untuk header, +1 karena array 0-indexed

      // Validation
      if (!nic && !namaLengkap) {
        errors.push(`Baris ${rowNum}: NIC dan Nama Lengkap kosong`);
        failedCount++;
        continue;
      }

      // Match berdasarkan NIC atau Nama (Fallback)
      let matchedSantri = null;
      let matchedBy = "";
      
      if (nic && santriMap.has(String(nic).trim())) {
        matchedSantri = santriMap.get(String(nic).trim());
        matchedBy = `NIC ${nic}`;
      } else if (namaLengkap) {
        // Fallback fuzzy search by namaLengkap
        let bestMatch = null;
        let bestDist = Infinity;
        const TARGET = String(namaLengkap).trim().toLowerCase();
        
        for (const s of allSantri) {
          if (!s.namaLengkap) continue;
          const sName = String(s.namaLengkap).trim().toLowerCase();
          const dist = levenshteinDistance(TARGET, sName);
          if (dist < bestDist) {
            bestDist = dist;
            bestMatch = s;
          }
        }
        
        // threshold: misal maksimum 3 typo
        // toleransi 80% mirip -> distance max 20% dari length
        const maxAllowedDist = Math.max(2, Math.floor(TARGET.length * 0.2)); 
        if (bestMatch && bestDist <= maxAllowedDist) {
          matchedSantri = bestMatch;
          matchedBy = bestDist === 0 ? "Nama Persis" : `Nama mirip`;
        }
      }

      if (!matchedSantri) {
        errors.push(`Baris ${rowNum}: Santri tidak ditemukan (NIC salah dan Nama tidak cocok: ${namaLengkap || nic})`);
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

      if (hasValue(row["Tanggal Pembuatan Paspor"])) {
        const parsedDate = parseExcelDate(row["Tanggal Pembuatan Paspor"]);
        if (parsedDate) {
          updateData.tanggalPembuatanPaspor = parsedDate;
        } else {
          errors.push(`Baris ${rowNum}: Format Tanggal Pembuatan Paspor tidak valid untuk ${namaLengkap}`);
          failedCount++;
          continue;
        }
      }

      if (hasValue(row["Tanggal Kadaluarsa Paspor"])) {
        const parsedDate = parseExcelDate(row["Tanggal Kadaluarsa Paspor"]);
        if (parsedDate) {
          updateData.tanggalKadaluarsaPaspor = parsedDate;
        } else {
          errors.push(`Baris ${rowNum}: Format Tanggal Kadaluarsa Paspor tidak valid untuk ${namaLengkap}`);
          failedCount++;
          continue;
        }
      }

      if (hasValue(row["Pilihan Jurusan"])) {
        const jurusanStr = String(row["Pilihan Jurusan"]).toUpperCase().trim();
        if (jurusanStr.includes("LUGHAH")) {
          updateData.jurusan = "LUGHAH";
        } else if (jurusanStr.includes("SYARIAH ISLAMIYYAH") || jurusanStr.includes("ISLAMIYAH") && jurusanStr.includes("SYARIAH")) {
          updateData.jurusan = "SYARIAH_ISLAMIYYAH";
        } else if (jurusanStr.includes("SYARIAH") || jurusanStr.includes("QONUN")) {
          updateData.jurusan = "SYARIAH";
        } else if (jurusanStr.includes("USHULUDDIN") || jurusanStr.includes("USULUDIN")) {
          updateData.jurusan = "USHULUDDIN";
        } else if (jurusanStr.includes("DIRASAT") || jurusanStr.includes("DIROSAT")) {
          updateData.jurusan = "DIRASAT";
        } else if (jurusanStr.includes("ULUM")) {
          updateData.jurusan = "ULUM";
        } else {
          errors.push(`Baris ${rowNum}: Format Pilihan Jurusan tidak valid untuk ${namaLengkap}. Harus Lughah, Syariah, Ushuluddin, Dirasat, atau Ulum`);
          failedCount++;
          continue;
        }
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
        successLogs.push(`Baris ${rowNum}: Berhasil update ${matchedSantri.namaLengkap} (Cocok via ${matchedBy})`);
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
        errors,
        successLogs
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
