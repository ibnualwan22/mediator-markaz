import { Info } from "lucide-react";

// Seksi informatif "Tata Cara Pembayaran" — dipakai di halaman sukses
// pendaftaran dan halaman cek status.
export default function TataCaraPembayaran() {
  const langkah = [
    "Klik tombol \"Bayar Sekarang via Midtrans\" di halaman ini.",
    "Pilih metode pembayaran: QRIS, Virtual Account bank, atau GoPay.",
    "Selesaikan pembayaran sesuai instruksi yang tampil.",
    "Status pembayaran otomatis berubah menjadi LUNAS — tidak perlu mengirim bukti transfer atau konfirmasi manual ke admin.",
  ];
  return (
    <div className="mt-8 p-6 bg-primary/5 rounded-2xl border border-primary/20">
      <div className="flex items-center gap-2 font-heading font-bold text-text-primary mb-4">
        <Info size={20} className="text-primary" />
        Tata Cara Pembayaran
      </div>
      <ol className="space-y-2.5">
        {langkah.map((s, i) => (
          <li key={i} className="flex gap-3 text-sm text-text-secondary">
            <span className="shrink-0 w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
              {i + 1}
            </span>
            <span className="pt-0.5">{s}</span>
          </li>
        ))}
      </ol>
      <p className="text-xs text-text-secondary mt-4 pt-3 border-t border-primary/10">
        Simpan Nomor Pendaftaran Anda — gunakan untuk memantau status
        pembayaran kapan saja melalui halaman Cek Status.
      </p>
    </div>
  );
}
