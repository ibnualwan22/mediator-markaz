import { NextResponse } from "next/server";
import * as xlsx from "xlsx";
import { requireAdmin } from "@/lib/requireAdmin";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  try {
    // Buat format workbook baru
    const wb = xlsx.utils.book_new();

    // Data header template dan contoh data.
    // Kolom mengikuti seluruh isian form pendaftaran (Step 1 & Step 3),
    // kecuali dokumen unggahan yang tidak bisa dibawa file Excel.
    // NIC diisi bila camaba SUDAH punya NIC (format standar 11 digit:
    // kode gelombang + tanggal lahir DDMMYY + nomor urut, terbit saat
    // verifikasi). Camaba baru dari pendaftaran offline: kosongkan NIC,
    // data akan dibuat sebagai camaba baru, dan NIC terbit otomatis saat
    // diverifikasi.
    // Kolom Gelombang khusus untuk camaba BARU: isi nomor/nama gelombang
    // tujuannya (mis. "Gelombang 1"); sistem mencocokkan angkanya ke
    // gelombang yang sedang AKTIF. Untuk camaba yang sudah ada di web
    // kolom ini diabaikan (pindah gelombang ada jalurnya sendiri).
    const wsData = [
      [
        "NIC", "Gelombang", "Nama Lengkap", "Nama Arab", "Gender", "Tempat Lahir", "Tanggal Lahir", "Asal Provinsi", "No. WA Santri",
        "Email", "Nama Wali", "No. WA Wali", "Riwayat Akademik", "Riwayat Akademik Lainnya", "Tahun Kelulusan", "Nomor Paspor", "Kantor Penerbit Paspor", "Tanggal Pembuatan Paspor", "Tanggal Kadaluarsa Paspor"
      ],
      [
        "01150508001", "Gelombang 1", "Fulan bin Fulan", "فلان بن فلان", "LAKI_LAKI", "Jakarta", "15/05/2008", "Jawa Barat", "08123456789",
        "fulan@example.com", "Bapak Fulan", "08987654321", "Madrasah Aliyah (MA)", "", 2026, "A1234567", "Kantor Imigrasi Jakarta Selatan", "01/01/2023", "01/01/2028"
      ],
      [
        "", "Gelombang 2", "Fulanah binti Fulan", "فلانة بنت فلان", "PEREMPUAN", "Semarang", "20/03/2008", "Jawa Tengah", "08129876543",
        "fulanah@example.com", "Bapak Fulan", "08987654321", "Lainnya", "D3 Bahasa Arab", 2026, "", "", "", ""
      ]
    ];

    // Konversi array ke worksheet
    const ws = xlsx.utils.aoa_to_sheet(wsData);

    // Atur lebar kolom agar rapi
    ws['!cols'] = [
      { wch: 15 }, // NIC
      { wch: 15 }, // Gelombang
      { wch: 30 }, // Nama Lengkap
      { wch: 30 }, // Nama Arab
      { wch: 15 }, // Gender
      { wch: 20 }, // Tempat Lahir
      { wch: 15 }, // Tanggal Lahir
      { wch: 20 }, // Asal Provinsi
      { wch: 15 }, // No. WA Santri
      { wch: 25 }, // Email
      { wch: 25 }, // Nama Wali
      { wch: 15 }, // No. WA Wali
      { wch: 22 }, // Riwayat Akademik
      { wch: 25 }, // Riwayat Akademik Lainnya
      { wch: 15 }, // Tahun Kelulusan
      { wch: 20 }, // Nomor Paspor
      { wch: 30 }, // Kantor Penerbit Paspor
      { wch: 25 }, // Tanggal Pembuatan Paspor
      { wch: 25 }  // Tanggal Kadaluarsa Paspor
    ];

    // Tambahkan worksheet ke workbook
    xlsx.utils.book_append_sheet(wb, ws, "Data Santri");

    // Generate buffer untuk didownload
    const buf = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });

    // Return sebagai file download
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Disposition": 'attachment; filename="Template_Import_Santri.xlsx"',
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (error: any) {
    console.error("Template Download Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat membuat template Excel" },
      { status: 500 }
    );
  }
}
