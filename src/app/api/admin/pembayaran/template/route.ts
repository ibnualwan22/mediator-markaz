import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as xlsx from "xlsx";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const paketId = searchParams.get("paketId");

    if (!paketId || paketId === "all") {
      return NextResponse.json(
        { error: "Pilih / filter salah satu Paket Pembayaran terlebih dahulu sebelum mengunduh template." },
        { status: 400 }
      );
    }

    const paket = await prisma.paketPembayaran.findUnique({
      where: { id: paketId },
      include: {
        tahapPaket: {
          orderBy: { urutan: 'asc' },
          include: { poinTahap: { orderBy: { urutan: 'asc' } } }
        }
      }
    });

    if (!paket) {
      return NextResponse.json({ error: "Paket Pembayaran tidak ditemukan" }, { status: 404 });
    }

    const customHeaders = ["NIS", "Nama Santri"];
    
    paket.tahapPaket.forEach(tahap => {
      tahap.poinTahap.forEach(poin => {
        customHeaders.push(`${tahap.nama} - ${poin.nama} (${poin.id})`);
      });
    });

    const worksheetData = [customHeaders];

    // Optional: Include sample rows so it's easier to copy-paste.
    const santriList = await prisma.santri.findMany({
      where: {
        paketPembayaranId: paketId,
        isVerified: true
      },
      select: {
        nis: true,
        namaLengkap: true,
        nomorUrut: true
      },
      orderBy: [
        { nomorUrut: 'asc' },
        { namaLengkap: 'asc' }
      ]
    });

    if (santriList.length > 0) {
      santriList.forEach(s => {
        const row = [
          s.nis || "",
          s.namaLengkap || "",
        ];
        customHeaders.slice(2).forEach(() => {
          row.push(""); // Kosongkan kolom nominal
        });
        worksheetData.push(row);
      });
    }

    const worksheet = xlsx.utils.aoa_to_sheet(worksheetData);
    
    // Set column widths
    const colWidths = [
      { wch: 15 }, // NIS
      { wch: 30 }, // Nama Santri
    ];
    customHeaders.slice(2).forEach(() => colWidths.push({ wch: 25 }));
    worksheet["!cols"] = colWidths;

    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, `Template ${paket.nama}`);

    const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="Template_Import_Pembayaran_${paket.nama.replace(/\s+/g, '_')}.xlsx"`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });

  } catch (error: any) {
    console.error("Template Gen Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server saat membuat template" },
      { status: 500 }
    );
  }
}
