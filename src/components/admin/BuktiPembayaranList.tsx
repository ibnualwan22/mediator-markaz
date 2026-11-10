"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, MessageCircle, ExternalLink } from "lucide-react";
import { konfirmasiBuktiPembayaran, tolakBuktiPembayaran } from "@/app/admin/(dashboard)/pembayaran/actions";

export type BuktiPembayaranItem = {
  id: string;
  namaLengkap: string;
  noPendaftaran: string;
  noWaSantri: string;
  gelombangNama: string;
  isVerified: boolean;
  fileBuktiPembayaran: string;
  buktiPembayaranStatus: string | null;
  createdAt: string; // ISO
  bookingStatus: "LUNAS" | "BELUM" | "TANPA_TAGIHAN";
  bookingNominal: number | null;
};

const fmt = (num: number) => `Rp ${num.toLocaleString("id-ID")}`;

function statusBadge(status: string | null) {
  if (status === "DITERIMA")
    return <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">Diterima</span>;
  if (status === "DITOLAK")
    return <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">Ditolak</span>;
  return <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">Menunggu Konfirmasi</span>;
}

export default function BuktiPembayaranList({ items }: { items: BuktiPembayaranItem[] }) {
  const [busyId, setBusyId] = useState<string | null>(null);

  const menunggu = items.filter((i) => i.buktiPembayaranStatus !== "DITERIMA" && i.buktiPembayaranStatus !== "DITOLAK").length;

  const handleKonfirmasi = async (item: BuktiPembayaranItem) => {
    if (!window.confirm(`Konfirmasi bukti pembayaran ${item.namaLengkap} (${item.noPendaftaran})? Tagihan booking akan ditandai LUNAS.`)) return;
    setBusyId(item.id);
    try {
      const res = await konfirmasiBuktiPembayaran(item.id);
      if (!res.success) alert(res.error || "Gagal mengonfirmasi bukti.");
    } finally {
      setBusyId(null);
    }
  };

  const handleTolak = async (item: BuktiPembayaranItem) => {
    if (!window.confirm(`Tolak bukti pembayaran ${item.namaLengkap} (${item.noPendaftaran})? Santri perlu dihubungi via WhatsApp untuk mengunggah ulang / menjelaskan.`)) return;
    setBusyId(item.id);
    try {
      const res = await tolakBuktiPembayaran(item.id);
      if (!res.success) alert(res.error || "Gagal menolak bukti.");
    } finally {
      setBusyId(null);
    }
  };

  if (items.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-primary-light/20 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-primary-light/20 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-heading font-bold text-text-primary dark:text-gray-100">Bukti Transfer Booking (Tahap 1)</h2>
          <p className="text-xs text-text-secondary dark:text-gray-400 mt-0.5">
            Bukti yang diunggah santri di form pendaftaran. Konfirmasi setelah memeriksa transfer ke BRI 055501049030500.
          </p>
        </div>
        {menunggu > 0 && (
          <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full whitespace-nowrap">
            {menunggu} menunggu
          </span>
        )}
      </div>

      <div className="divide-y divide-primary-light/10">
        {items.map((item) => {
          const isMenunggu =
            item.buktiPembayaranStatus !== "DITERIMA" && item.buktiPembayaranStatus !== "DITOLAK";
          const busy = busyId === item.id;
          return (
            <div key={item.id} className="px-5 py-4 flex flex-col md:flex-row md:items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-text-primary dark:text-gray-100">{item.namaLengkap}</span>
                  <span className="text-xs text-text-secondary">{item.noPendaftaran}</span>
                  <span className="text-xs text-text-secondary">· {item.gelombangNama}</span>
                  {!item.isVerified && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-bold rounded-full">Belum terverifikasi</span>
                  )}
                  {statusBadge(item.buktiPembayaranStatus)}
                </div>
                <p className="text-xs text-text-secondary mt-1">
                  Diunggah {new Date(item.createdAt).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  {" · "}Tagihan booking:{" "}
                  {item.bookingStatus === "LUNAS" ? (
                    <span className="font-semibold text-emerald-600">LUNAS{item.bookingNominal !== null ? ` (${fmt(item.bookingNominal)})` : ""}</span>
                  ) : item.bookingStatus === "BELUM" ? (
                    <span className="font-semibold text-amber-600">Belum lunas{item.bookingNominal !== null ? ` (${fmt(item.bookingNominal)})` : ""}</span>
                  ) : (
                    <span className="text-text-secondary">Belum ada tagihan (dibuat saat verifikasi)</span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <a
                  href={item.fileBuktiPembayaran}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary border border-primary-light/50 rounded-lg hover:bg-primary-bg transition-colors"
                >
                  <ExternalLink size={14} /> Lihat Bukti
                </a>
                <a
                  href={`https://wa.me/${item.noWaSantri}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors"
                >
                  <MessageCircle size={14} /> WA Santri
                </a>
                {isMenunggu && (
                  <>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleKonfirmasi(item)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle2 size={14} /> {busy ? "Memproses…" : "Konfirmasi"}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleTolak(item)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      <XCircle size={14} /> Tolak
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
