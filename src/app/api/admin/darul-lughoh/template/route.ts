import { NextResponse } from "next/server";
import * as xlsx from "xlsx";

export async function GET() {
  try {
    const wb = xlsx.utils.book_new();
    const wsData = [
      ["NIS", "Nama Santri", "Level 1", "Level 2", "Level 3", "Level 4", "Level 5", "Level 6"],
      ["MA-2026-0001", "Fulan bin Fulan", "LULUS", "", "", "", "", ""]
    ];

    const ws = xlsx.utils.aoa_to_sheet(wsData);

    ws['!cols'] = [
      { wch: 15 }, // NIS
      { wch: 30 }, // Nama Santri
      { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }
    ];

    xlsx.utils.book_append_sheet(wb, ws, "Darul Lughoh");
    const buf = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Disposition": 'attachment; filename="Template_Import_DL.xlsx"',
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
