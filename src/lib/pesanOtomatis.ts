// Pesan otomatis WA untuk alur main (teks saja, tanpa gateway payment).
// Aturan: kegagalan kirim TIDAK PERNAH menggagalkan proses utama —
// hanya dicatat ke log server (Vercel logs) agar admin bisa menindaklanjuti.
// Link cek status hanya memakai nomor (tanpa tanggal lahir) supaya
// tautan yang tersebar tidak membuka data siapa pun; tanggal lahir
// tetap diminta di halaman cek status sebagai faktor kedua.

import { kirimPesanWa, getAppBaseUrl } from "./waGateway";

const formatRp = (n: number) => "Rp " + n.toLocaleString("id-ID");

function linkCekStatus(noPendaftaran: string): string {
  const base = getAppBaseUrl();
  if (!base) return "";
  return `\n\nCek status pendaftaran Anda di sini:\n${base}/cek-status?no=${noPendaftaran}`;
}

// 1. Sesudah pendaftaran berhasil (POST /api/pendaftaran).
export async function kirimPesanPendaftaran(santri: {
  namaLengkap: string;
  noPendaftaran: string;
  noWaSantri: string;
}): Promise<void> {
  const pesan =
    `Assalamu'alaikum ${santri.namaLengkap}. Alhamdulillah, pendaftaran Anda di Mediator Markaz Arabiyah telah kami terima.` +
    `\n\nNomor Pendaftaran: ${santri.noPendaftaran}` +
    `\nTahap 1 - Investasi Fiksasi/Booking Kuota: ${formatRp(1000000)} (BELUM DIBAYAR)` +
    `\nTransfer ke: BRI 055501049030500 a.n. Markaz Arabiyah` +
    linkCekStatus(santri.noPendaftaran) +
    `\n\nMasukkan tanggal lahir Anda di halaman tersebut untuk melihat status.` +
    `\nJazakumullah khairan.`;
  const hasil = await kirimPesanWa(santri.noWaSantri, pesan);
  if (!hasil.success) {
    console.warn(
      `Pesan otomatis pendaftaran ${santri.noPendaftaran} gagal: ${hasil.detail}`
    );
  }
}

// 2. Sesudah admin verifikasi di halaman Daftar Pendaftaran
//    (verifySantri: isVerified + NIS terbit + Tahap 1 auto-lunas bila ada paket).
export async function kirimPesanVerifikasi(
  santri: {
    namaLengkap: string;
    noPendaftaran: string;
    noWaSantri: string;
  },
  nis: string,
  tahap1Lunas: boolean
): Promise<void> {
  const lunasLine = tahap1Lunas
    ? `\nTahap 1 (Booking Kuota ${formatRp(1000000)}): LUNAS`
    : `\nTagihan selengkapnya akan tampil di halaman cek status.`;
  const pesan =
    `Assalamu'alaikum ${santri.namaLengkap}. Alhamdulillah, pendaftaran Anda telah DIVERIFIKASI.` +
    `\n\nNIS/NIC Anda: ${nis}` +
    lunasLine +
    linkCekStatus(santri.noPendaftaran) +
    `\n\nJazakumullah khairan.`;
  const hasil = await kirimPesanWa(santri.noWaSantri, pesan);
  if (!hasil.success) {
    console.warn(
      `Pesan otomatis verifikasi ${santri.noPendaftaran} gagal: ${hasil.detail}`
    );
  }
}
