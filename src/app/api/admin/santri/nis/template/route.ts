import { NextResponse } from "next/server";
import * as xlsx from "xlsx";

export async function GET() {
  try {
    const templateData = [
      {
        "Nama Lengkap": "Ahmad Fais",
        "Nomor Urut": "01",
      },
      {
        "Nama Lengkap": "Muhammad Zaid",
        "Nomor Urut": "02",
      }
    ];

    const worksheet = xlsx.utils.json_to_sheet(templateData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Template Nomor Urut");

    // Adjust column widths
    worksheet["!cols"] = [
      { wch: 30 }, // Nama Lengkap
      { wch: 15 }, // Nomor Urut
    ];

    const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Disposition": 'attachment; filename="Template_Import_Nomor_Urut.xlsx"',
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (error) {
    console.error("Template Gen Error:", error);
    return NextResponse.json({ error: "Gagal membuat template" }, { status: 500 });
  }
}
