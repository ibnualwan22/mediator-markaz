import { NextResponse } from "next/server";
import * as xlsx from "xlsx";

export async function GET() {
  try {
    // Buat format workbook baru
    const wb = xlsx.utils.book_new();

    // Data header template dan 1 contoh data
    const wsData = [
      ["Nama Lengkap", "Nama Arab", "Gender"],
      ["Fulan bin Fulan", "فلان بن فلان", "LAKI_LAKI"],
      ["Fulanah binti Fulan", "فلانة بنت فلان", "PEREMPUAN"]
    ];

    // Konversi array ke worksheet
    const ws = xlsx.utils.aoa_to_sheet(wsData);

    // Atur lebar kolom agar rapi
    ws['!cols'] = [
      { wch: 30 }, // Nama Lengkap
      { wch: 30 }, // Nama Arab
      { wch: 15 }  // Gender
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
