import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as xlsx from "xlsx";
import { requireAdmin } from "@/lib/requireAdmin";

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

// Helper: Cek apakah value dari Excel terisi (bukan kosong / placeholder)
function hasValue(val: any): boolean {
  if (val === undefined || val === null) return false;
  const str = String(val).trim();
  return str !== '' && str !== '-';
}

// Normalisasi nomor WA ke format 628xxx — sama seperti API pendaftaran online.
function normalizePhone(phone: any): string {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.startsWith("08")) return "62" + digits.slice(1);
  if (digits.startsWith("8")) return "62" + digits;
  return digits;
}

// Parse Gender ke enum. Null = tidak dikenali.
function parseGender(val: any): "LAKI_LAKI" | "PEREMPUAN" | null {
  const s = String(val).toUpperCase().trim();
  if (s.includes("LAKI") || s === "L") return "LAKI_LAKI";
  if (s.includes("PEREMPUAN") || s === "P" || s.includes("WANITA")) return "PEREMPUAN";
  return null;
}

// Parse Riwayat Akademik ke enum. Null = tidak dikenali.
// Urutan penting: "MA" adalah substring paling longgar ("SMA" mengandung
// "MA"), jadi MA/Madrasah Aliyah diperiksa PALING AKHIR.
function parseRiwayatAkademik(val: any): string | null {
  const s = String(val).toUpperCase().trim();
  if (s.includes("PESANTREN") || s.includes("IJAZAH_PESANTREN")) return "IJAZAH_PESANTREN";
  if (s.includes("LAINNYA") || s === "LAIN") return "LAINNYA";
  if (s.includes("SMA")) return "SMA";
  if (s.includes("SMK")) return "SMK";
  if (s.includes("PAKET")) return "PAKET_C";
  if (s.includes("MA") || s.includes("MADRASAH ALIYAH")) return "MA";
  return null;
}

export async function POST(req: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const gelombangId = (formData.get("gelombangId") as string) || "";

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
    let createdCount = 0;
    let updatedCount = 0;
    let failedCount = 0;

    // Gelombang penempatan untuk camaba BARU (dipilih di jendela import).
    // Hanya dipakai bila ada baris yang perlu dibuat baru.
    let gelombangForCreate: { id: string } | null = null;
    if (gelombangId) {
      gelombangForCreate = await prisma.gelombang.findUnique({
        where: { id: gelombangId },
        select: { id: true }
      });
    }

    // Penomoran No. Pendaftaran untuk camaba baru: lanjutkan dari nomor
    // terbesar yang sudah ada (pola sama seperti API pendaftaran online).
    const lastSantri = await prisma.santri.findFirst({
      where: { noPendaftaran: { startsWith: `MA-${currentYear}-` } },
      orderBy: { noPendaftaran: "desc" },
      select: { noPendaftaran: true }
    });
    let nextNoUrut = lastSantri
      ? (parseInt(lastSantri.noPendaftaran.split("-")[2], 10) || 0) + 1
      : 1;
    const makeNoPendaftaran = () =>
      `MA-${currentYear}-${String(nextNoUrut++).padStart(4, "0")}`;

    // Ambil SEMUA santri untuk pencocokan (termasuk yang belum punya NIS,
    // mis. pendaftar online yang belum diverifikasi) agar import tidak
    // menggandakan data yang sebenarnya sudah ada.
    const allSantri = await prisma.santri.findMany({
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
      const nic = hasValue(row["NIC"]) ? String(row["NIC"]).trim() : "";
      const namaLengkap = hasValue(row["Nama Lengkap"]) ? String(row["Nama Lengkap"]).trim() : "";

      const rowNum = i + 2; // +1 untuk header, +1 karena array 0-indexed

      // Validation
      if (!nic && !namaLengkap) {
        errors.push(`Baris ${rowNum}: NIC dan Nama Lengkap kosong`);
        failedCount++;
        continue;
      }

      // ---- Parse field bersama (dipakai jalur update & buat-baru) ----
      // Format tidak valid -> baris gagal dengan pesan jelas (konsisten
      // dengan perilaku lama untuk gender & tanggal paspor).
      let gender: string | undefined;
      if (hasValue(row["Gender"])) {
        const parsedGender = parseGender(row["Gender"]);
        if (!parsedGender) {
          errors.push(`Baris ${rowNum}: Format Gender tidak valid untuk ${namaLengkap}. Harus LAKI_LAKI atau PEREMPUAN`);
          failedCount++;
          continue;
        }
        gender = parsedGender;
      }

      let tanggalLahir: Date | undefined;
      if (hasValue(row["Tanggal Lahir"])) {
        const parsedDate = parseExcelDate(row["Tanggal Lahir"]);
        if (!parsedDate) {
          errors.push(`Baris ${rowNum}: Format Tanggal Lahir tidak valid untuk ${namaLengkap}`);
          failedCount++;
          continue;
        }
        tanggalLahir = parsedDate;
      }

      let riwayatAkademik: string | undefined;
      if (hasValue(row["Riwayat Akademik"])) {
        const parsedRiwayat = parseRiwayatAkademik(row["Riwayat Akademik"]);
        if (!parsedRiwayat) {
          errors.push(`Baris ${rowNum}: Format Riwayat Akademik tidak valid untuk ${namaLengkap}. Harus MA, Ijazah Pesantren, SMA, SMK, Paket C, atau Lainnya`);
          failedCount++;
          continue;
        }
        riwayatAkademik = parsedRiwayat;
      }

      let tahunKelulusan: number | undefined;
      if (hasValue(row["Tahun Kelulusan"])) {
        const parsed = parseInt(row["Tahun Kelulusan"]);
        if (!isNaN(parsed)) tahunKelulusan = parsed;
      }

      let tanggalPembuatanPaspor: Date | undefined;
      if (hasValue(row["Tanggal Pembuatan Paspor"])) {
        const parsedDate = parseExcelDate(row["Tanggal Pembuatan Paspor"]);
        if (!parsedDate) {
          errors.push(`Baris ${rowNum}: Format Tanggal Pembuatan Paspor tidak valid untuk ${namaLengkap}`);
          failedCount++;
          continue;
        }
        tanggalPembuatanPaspor = parsedDate;
      }

      let tanggalKadaluarsaPaspor: Date | undefined;
      if (hasValue(row["Tanggal Kadaluarsa Paspor"])) {
        const parsedDate = parseExcelDate(row["Tanggal Kadaluarsa Paspor"]);
        if (!parsedDate) {
          errors.push(`Baris ${rowNum}: Format Tanggal Kadaluarsa Paspor tidak valid untuk ${namaLengkap}`);
          failedCount++;
          continue;
        }
        tanggalKadaluarsaPaspor = parsedDate;
      }

      const str = (header: string) => hasValue(row[header]) ? String(row[header]) : undefined;

      // Match berdasarkan NIC atau Nama (Fallback)
      let matchedSantri = null;
      let matchedBy = "";

      if (nic && santriMap.has(nic)) {
        matchedSantri = santriMap.get(nic);
        matchedBy = `NIC ${nic}`;
      } else if (namaLengkap) {
        // Fallback fuzzy search by namaLengkap
        let bestMatch = null;
        let bestDist = Infinity;
        const TARGET = namaLengkap.toLowerCase();

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

      // ================= JALUR UPDATE =================
      if (matchedSantri) {
        // Build update data — hanya field yang TERISI di Excel yang akan di-update
        const updateData: any = {};

        if (str("Nama Arab") !== undefined) updateData.namaArab = str("Nama Arab");
        if (gender !== undefined) updateData.gender = gender;
        if (str("Tempat Lahir") !== undefined) updateData.tempatLahir = str("Tempat Lahir");
        if (tanggalLahir !== undefined) updateData.tanggalLahir = tanggalLahir;
        if (str("Asal Provinsi") !== undefined) updateData.asalProvinsi = str("Asal Provinsi");
        if (str("No. WA Santri") !== undefined) updateData.noWaSantri = str("No. WA Santri");
        if (str("Email") !== undefined) updateData.email = str("Email");
        if (str("Nama Wali") !== undefined) updateData.namaWali = str("Nama Wali");
        if (str("No. WA Wali") !== undefined) updateData.noWaWali = str("No. WA Wali");
        if (riwayatAkademik !== undefined) updateData.riwayatAkademik = riwayatAkademik;
        if (str("Riwayat Akademik Lainnya") !== undefined) updateData.riwayatAkademikLainnya = str("Riwayat Akademik Lainnya");
        if (tahunKelulusan !== undefined) updateData.tahunKelulusan = tahunKelulusan;
        if (str("Nomor Paspor") !== undefined) updateData.nomorPaspor = str("Nomor Paspor");
        if (str("Kantor Penerbit Paspor") !== undefined) updateData.kantorPenerbitPaspor = str("Kantor Penerbit Paspor");
        if (tanggalPembuatanPaspor !== undefined) updateData.tanggalPembuatanPaspor = tanggalPembuatanPaspor;
        if (tanggalKadaluarsaPaspor !== undefined) updateData.tanggalKadaluarsaPaspor = tanggalKadaluarsaPaspor;

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
          updatedCount++;
          successLogs.push(`Baris ${rowNum}: Berhasil update ${matchedSantri.namaLengkap} (Cocok via ${matchedBy})`);
          newSantriList.push({ id: santri.id, namaLengkap: santri.namaLengkap, noPendaftaran: santri.noPendaftaran });
        } catch (err: any) {
          console.error(`Gagal import baris ${rowNum}:`, err);
          errors.push(`Baris ${rowNum}: Gagal menyimpan data ${namaLengkap}`);
          failedCount++;
        }
        continue;
      }

      // ================= JALUR BUAT BARU =================
      // Tidak ditemukan di data existing -> buat camaba baru, meniru
      // API pendaftaran online. Data wajib mengikuti form pendaftaran.
      const missing: string[] = [];
      if (!namaLengkap) missing.push("Nama Lengkap");
      if (str("Nama Arab") === undefined) missing.push("Nama Arab");
      if (gender === undefined) missing.push("Gender");
      if (str("Asal Provinsi") === undefined) missing.push("Asal Provinsi");
      if (str("No. WA Santri") === undefined) missing.push("No. WA Santri");
      if (str("Email") === undefined) missing.push("Email");
      if (str("Nama Wali") === undefined) missing.push("Nama Wali");
      if (str("No. WA Wali") === undefined) missing.push("No. WA Wali");
      if (riwayatAkademik === undefined) missing.push("Riwayat Akademik");
      if (riwayatAkademik === "LAINNYA" && str("Riwayat Akademik Lainnya") === undefined) missing.push("Riwayat Akademik Lainnya");
      if (tahunKelulusan === undefined) missing.push("Tahun Kelulusan");

      if (missing.length > 0) {
        errors.push(`Baris ${rowNum}: Camaba baru tidak dibuat untuk ${namaLengkap || nic} — data wajib belum lengkap: ${missing.join(", ")}`);
        failedCount++;
        continue;
      }

      if (!gelombangForCreate) {
        errors.push(`Baris ${rowNum}: Camaba baru tidak dibuat untuk ${namaLengkap} — pilih gelombang penempatan yang valid di jendela import`);
        failedCount++;
        continue;
      }

      // NIC terisi di Excel = camaba sudah punya NIC format standar ->
      // simpan sebagai NIS-nya. Kosong = NIS terbit saat verifikasi,
      // sama seperti pendaftar online.
      const createData: any = {
        gelombangId: gelombangForCreate.id,
        namaLengkap,
        namaArab: str("Nama Arab"),
        tempatLahir: str("Tempat Lahir") ?? null,
        tanggalLahir: tanggalLahir ?? null,
        asalProvinsi: str("Asal Provinsi"),
        noWaSantri: normalizePhone(str("No. WA Santri")),
        gender,
        email: str("Email"),
        namaWali: str("Nama Wali"),
        noWaWali: normalizePhone(str("No. WA Wali")),
        // Dokumen unggahan tidak bisa dibawa Excel; tiga file yang wajib
        // di database diisi kosong dulu untuk dilengkapi admin kemudian.
        fileAkteLahir: "",
        fileKtp: null,
        fileKK: null,
        filePasFoto: "",
        riwayatAkademik,
        riwayatAkademikLainnya: str("Riwayat Akademik Lainnya") ?? null,
        tahunKelulusan,
        fileIjazah: "",
        fileTranskrip: null,
        nomorPaspor: str("Nomor Paspor") ?? null,
        kantorPenerbitPaspor: str("Kantor Penerbit Paspor") ?? null,
        tanggalPembuatanPaspor: tanggalPembuatanPaspor ?? null,
        tanggalKadaluarsaPaspor: tanggalKadaluarsaPaspor ?? null,
        filePaspor: null,
        nis: nic || null,
      };

      let createdSantri = null;
      let lastCreateError: any = null;
      for (let attempt = 0; attempt < 3 && !createdSantri; attempt++) {
        try {
          createdSantri = await prisma.santri.create({
            data: { ...createData, noPendaftaran: makeNoPendaftaran() }
          });
        } catch (err: any) {
          lastCreateError = err;
          // Hanya tabrakan noPendaftaran yang boleh dicoba lagi dengan
          // nomor berikutnya; error lain (mis. NIS ganda) langsung gagal.
          const target = err?.meta?.target;
          const targetStr = Array.isArray(target) ? target.join(",") : String(target || "");
          if (!(err?.code === "P2002" && targetStr.includes("noPendaftaran"))) break;
        }
      }

      if (!createdSantri) {
        console.error(`Gagal import baris ${rowNum}:`, lastCreateError);
        const target = lastCreateError?.meta?.target;
        const targetStr = Array.isArray(target) ? target.join(",") : String(target || "");
        if (lastCreateError?.code === "P2002" && targetStr.includes("nis")) {
          errors.push(`Baris ${rowNum}: NIC ${nic} sudah dipakai santri lain`);
        } else {
          errors.push(`Baris ${rowNum}: Gagal membuat camaba baru ${namaLengkap}`);
        }
        failedCount++;
        continue;
      }

      successCount++;
      createdCount++;
      successLogs.push(`Baris ${rowNum}: Camaba baru dibuat: ${createdSantri.namaLengkap} (${createdSantri.noPendaftaran})`);
      newSantriList.push({ id: createdSantri.id, namaLengkap: createdSantri.namaLengkap, noPendaftaran: createdSantri.noPendaftaran });
      // Daftarkan ke peta pencocokan agar baris duplikat di file yang sama
      // memperbarui data ini, bukan membuat data ganda.
      allSantri.push({ id: createdSantri.id, namaLengkap: createdSantri.namaLengkap, noPendaftaran: createdSantri.noPendaftaran, nis: createdSantri.nis });
      if (createdSantri.nis) {
        santriMap.set(createdSantri.nis, { id: createdSantri.id, namaLengkap: createdSantri.namaLengkap, noPendaftaran: createdSantri.noPendaftaran, nis: createdSantri.nis });
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        total: rawData.length,
        success: successCount,
        created: createdCount,
        updated: updatedCount,
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
