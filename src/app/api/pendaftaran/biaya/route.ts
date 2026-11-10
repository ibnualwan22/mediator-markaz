import { NextResponse } from "next/server";
import { resolveBiayaPendaftaran } from "@/lib/biayaPendaftaran";

// Dipakai Step 4 form pendaftaran untuk menampilkan nominal booking
// (Tahap 1) sebelum santri transfer. Hanya baca; tanpa data sensitif.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const gelombangId = searchParams.get("gelombangId") || "";
    const riwayatAkademik = searchParams.get("riwayatAkademik") || null;

    if (!gelombangId) {
      return NextResponse.json({ error: "gelombangId wajib diisi." }, { status: 400 });
    }

    const biaya = await resolveBiayaPendaftaran(gelombangId, riwayatAkademik);
    if (!biaya) {
      return NextResponse.json(
        { error: "Biaya pendaftaran belum dapat ditentukan. Hubungi admin." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, ...biaya });
  } catch (error: unknown) {
    console.error("Biaya Pendaftaran Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan sistem saat menghitung biaya." },
      { status: 500 }
    );
  }
}
