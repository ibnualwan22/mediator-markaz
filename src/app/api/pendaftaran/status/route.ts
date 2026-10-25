import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/pendaftaran/status?no=MA-2026-0001&tgl=2010-05-01
//   -> data status lengkap (butuh nomor + tanggal lahir).
// GET /api/pendaftaran/status?email=x@y.z
//   -> hanya daftar nomor + nama (untuk tombol dari halaman sukses).
//     Data lengkap tetap butuh tanggal lahir, jadi email saja tidak
//     membuka data sensitif apa pun.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const no = (searchParams.get("no") || "").trim();
  const tgl = (searchParams.get("tgl") || "").trim();
  const email = (searchParams.get("email") || "").trim();

  if (email && !no) {
    const list = await prisma.santri.findMany({
      where: { email },
      select: { noPendaftaran: true, namaLengkap: true },
      orderBy: { createdAt: "asc" },
    });
    if (list.length === 0) {
      return NextResponse.json(
        { error: "Email tidak ditemukan." },
        { status: 404 }
      );
    }
    return NextResponse.json({ hasil: list });
  }

  if (!no || !tgl) {
    return NextResponse.json(
      { error: "Nomor pendaftaran dan tanggal lahir wajib diisi." },
      { status: 400 }
    );
  }

  const santri = await prisma.santri.findUnique({
    where: { noPendaftaran: no },
    select: {
      noPendaftaran: true,
      nis: true,
      namaLengkap: true,
      tanggalLahir: true,
      tempatLahir: true,
      gender: true,
      noWaSantri: true,
      email: true,
      createdAt: true,
      isVerified: true,
      isWithdrawn: true,
      withdrawnNote: true,
      gelombang: {
        select: { nama: true, periode: { select: { nama: true } } },
      },
      pembayaranSantri: {
        include: {
          poinTahap: {
            select: {
              nama: true,
              tahapPaket: { select: { urutan: true, nama: true } },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      legacyPembayaran: { orderBy: { tahap: "asc" } },
    },
  });

  if (!santri) {
    return NextResponse.json(
      { error: "Data tidak ditemukan. Periksa kembali nomor pendaftaran." },
      { status: 404 }
    );
  }

  // Verifikasi tanggal lahir (bandingkan tanggalnya saja).
  // tanggalLahir disimpan sebagai UTC midnight dari input "YYYY-MM-DD",
  // jadi potongan ISO-nya sama dengan yang dimasukkan pendaftar.
  const lahirISO = santri.tanggalLahir
    ? santri.tanggalLahir.toISOString().slice(0, 10)
    : null;
  if (!lahirISO || lahirISO !== tgl) {
    return NextResponse.json(
      { error: "Tanggal lahir tidak cocok." },
      { status: 403 }
    );
  }

  const items = santri.pembayaranSantri.map((p) => ({
    tahap: p.poinTahap.tahapPaket.urutan,
    tahapNama: p.poinTahap.tahapPaket.nama,
    poin: p.poinTahap.nama,
    nominalHarus: p.nominalHarus,
    nominalDibayar: p.nominalDibayar,
    sisa: Math.max(0, p.nominalHarus - p.nominalDibayar),
    isLunas: p.isLunas,
    tanggalLunas: p.tanggalLunas ? p.tanggalLunas.toISOString() : null,
  }));
  const totalHarus = items.reduce((a, b) => a + b.nominalHarus, 0);
  const totalDibayar = items.reduce((a, b) => a + b.nominalDibayar, 0);

  return NextResponse.json({
    nama: santri.namaLengkap,
    noPendaftaran: santri.noPendaftaran,
    nis: santri.nis,
    tanggalLahir: lahirISO,
    tempatLahir: santri.tempatLahir,
    gender: santri.gender,
    noWaSantri: santri.noWaSantri,
    email: santri.email,
    tanggalDaftar: santri.createdAt.toISOString(),
    gelombang: santri.gelombang.nama,
    periode: santri.gelombang.periode.nama,
    isVerified: santri.isVerified,
    isWithdrawn: santri.isWithdrawn,
    withdrawnNote: santri.withdrawnNote,
    tagihan:
      items.length > 0
        ? {
            items,
            totalHarus,
            totalDibayar,
            totalSisa: Math.max(0, totalHarus - totalDibayar),
            semuaLunas: items.every((i) => i.isLunas),
          }
        : null,
    legacy: santri.legacyPembayaran.map((l) => ({
      tahap: l.tahap,
      nominal: l.nominal,
      status: l.status,
      tanggalBayar: l.tanggalBayar ? l.tanggalBayar.toISOString() : null,
    })),
  });
}
