import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as xlsx from "xlsx";

export async function GET(req: Request) {
  try {
    const searchParams = new URL(req.url).searchParams;
    const search = searchParams.get("search") || "";
    const gelombangId = searchParams.get("gelombangId") || "";
    const periodeId = searchParams.get("periodeId") || "";

    // Build Prisma query based on filters
    const whereClause: any = {};
    if (search) {
      whereClause.OR = [
        { namaLengkap: { contains: search, mode: "insensitive" } },
        { noPendaftaran: { contains: search, mode: "insensitive" } },
        { nis: { contains: search, mode: "insensitive" } },
      ];
    }
    if (gelombangId) {
      whereClause.gelombangId = gelombangId;
    } else if (periodeId) {
      whereClause.gelombang = {
        periodeId: periodeId
      };
    }

    // Ambil data dari database
    const santriData = await prisma.santri.findMany({
      where: whereClause,
      include: {
        gelombang: {
          include: {
            periode: true
          }
        }
      },
      orderBy: { namaLengkap: "asc" }
    });

    const wb = xlsx.utils.book_new();

    // Mapping header sama persis dengan template Import Bio
    const wsData: any[][] = [
      [
        "NIC", "Nama Lengkap", "Nama Arab", "Gender", "Asal Provinsi", "No. WA Santri", 
        "Email", "Nama Wali", "No. WA Wali", "Riwayat Akademik", "Tahun Kelulusan", "Nomor Paspor", "Tanggal Pembuatan Paspor", "Tanggal Kadaluarsa Paspor", "Pilihan Jurusan"
      ]
    ];

    // Format fungsi riwayat akademik
    function formatRiwayatAkademik(ra: string) {
      if (ra === "MA") return "Madrasah Aliyah (MA)";
      if (ra === "IJAZAH_PESANTREN") return "Ijazah Pesantren";
      if (ra === "PAKET_C") return "Paket C / Setara";
      if (ra === "SMA") return "SMA";
      if (ra === "SMK") return "SMK";
      return ra;
    }

    function formattanggal(dateString: any) {
      if (!dateString) return "-";
      const d = new Date(dateString);
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    }

    function formatJurusan(j: any) {
      if (j === "LUGHAH") return "Lughah";
      if (j === "SYARIAH") return "Syariah wal qonun";
      if (j === "SYARIAH_ISLAMIYYAH") return "Syariah Islamiyyah";
      if (j === "USHULUDDIN") return "Ushuluddin";
      if (j === "DIRASAT") return "Dirosat Islamiyah";
      if (j === "ULUM") return "Kulliyatul Ulum";
      return j || "";
    }

    santriData.forEach(s => {
      wsData.push([
        s.nis || "",
        s.namaLengkap || "",
        s.namaArab || "-",
        s.gender || "",
        s.asalProvinsi || "-",
        s.noWaSantri || "-",
        s.email || "-",
        s.namaWali || "-",
        s.noWaWali || "-",
        s.riwayatAkademik ? formatRiwayatAkademik(s.riwayatAkademik) : "-",
        s.tahunKelulusan || "",
        s.nomorPaspor || "-",
        formattanggal(s.tanggalPembuatanPaspor),
        formattanggal(s.tanggalKadaluarsaPaspor),
        formatJurusan(s.jurusan)
      ]);
    });

    const ws = xlsx.utils.aoa_to_sheet(wsData);

    ws['!cols'] = [
      { wch: 15 }, // NIC
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
      { wch: 20 }, // Nomor Paspor
      { wch: 25 }, // Tanggal Pembuatan Paspor
      { wch: 25 }, // Tanggal Kadaluarsa Paspor
      { wch: 20 }  // Pilihan Jurusan
    ];

    xlsx.utils.book_append_sheet(wb, ws, "Data Santri");

    const buf = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Disposition": 'attachment; filename="Export_Data_Santri.xlsx"',
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (error: any) {
    console.error("Export Excel Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat memproses data export." },
      { status: 500 }
    );
  }
}
