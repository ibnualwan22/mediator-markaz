import { NextResponse } from "next/server";
import * as xlsx from "xlsx";

export async function GET() {
  try {
    const wb = xlsx.utils.book_new();
    const wsData = [
      ["NIS", "Nama Lengkap", "Nomor Paspor"],
      ["MA-2026-0001", "Fulan bin Fulan", "A1234567"]
    ];
    const ws = xlsx.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 15 }, { wch: 30 }, { wch: 20 }];
    xlsx.utils.book_append_sheet(wb, ws, "Paspor Santri");
    const buf = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Disposition": 'attachment; filename="Template_Import_Paspor.xlsx"',
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
