import { NextResponse } from "next/server";
import * as xlsx from "xlsx";

export async function GET() {
  try {
    // Buat format workbook baru
    const wb = xlsx.utils.book_new();

    // Data header template dan 1 contoh data
    const wsData = [
      [
        "Nama Lengkap", "Nama Arab", "Gender", "Asal Provinsi", "No. WA Santri", 
        "Email", "Nama Wali", "No. WA Wali", "Riwayat Akademik", "Tahun Kelulusan", "Nomor Paspor"
      ],
      [
        "Fulan bin Fulan", "فلان بن فلان", "LAKI_LAKI", "Jawa Barat", "08123456789", 
        "fulan@example.com", "Bapak Fulan", "08987654321", "Madrasah Aliyah (MA)", 2026, "A1234567"
      ],
      [
        "Fulanah binti Fulan", "فلانة بنت فلان", "PEREMPUAN", "Jawa Tengah", "08129876543", 
        "fulanah@example.com", "Bapak Fulan", "08987654321", "Ijazah Pesantren", 2026, ""
      ]
    ];

    // Konversi array ke worksheet
    const ws = xlsx.utils.aoa_to_sheet(wsData);

    // Atur lebar kolom agar rapi
    ws['!cols'] = [
      { wch: 30 }, // Nama Lengkap
      { wch: 30 }, // Nama Arab
      { wch: 15 }, // Gender
      { wch: 20 }, // Asal Provinsi
      { wch: 15 }, // No. WA Santri
      { wch: 25 }, // Email
      { wch: 25 }, // Nama Wali
      { wch: 15 }, // No. WA Wali
      { wch: 20 }, // Riwayat Akademik
      { wch: 15 }, // Tahun Kelulusan
      { wch: 20 }  // Nomor Paspor
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
