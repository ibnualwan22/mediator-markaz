"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckCircle2, XCircle, MessageCircle, ExternalLink, FileText, X, Loader2 } from "lucide-react";
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
  // ID santri yang thumbnail-nya gagal dimuat (mis. buktinya PDF, bukan gambar).
  const [thumbFailed, setThumbFailed] = useState<Set<string>>(new Set());

  // State modal pratinjau.
  const [previewItem, setPreviewItem] = useState<BuktiPembayaranItem | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const menunggu = items.filter((i) => i.buktiPembayaranStatus !== "DITERIMA" && i.buktiPembayaranStatus !== "DITOLAK").length;

  const closePreview = useCallback(() => {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setPreviewItem(null);
    setPreviewType(null);
    setPreviewError(null);
    setPreviewLoading(false);
  }, []);

  // Buka pratinjau: ambil isi file lewat proxy admin (sekali), lalu tampilkan
  // sebagai gambar atau PDF dari blob URL — tanpa pindah halaman.
  const openPreview = async (item: BuktiPembayaranItem) => {
    closePreview();
    setPreviewItem(item);
    setPreviewLoading(true);
    try {
      const res = await fetch(`/api/admin/santri/${item.id}/bukti`);
      if (!res.ok) throw new Error("Gagal memuat bukti.");
      const blob = await res.blob();
      setPreviewType(blob.type);
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (e: unknown) {
      setPreviewError(e instanceof Error ? e.message : "Gagal memuat bukti.");
    } finally {
      setPreviewLoading(false);
    }
  };

  // Tutup modal dengan tombol Escape; kunci scroll halaman saat modal terbuka.
  useEffect(() => {
    if (!previewItem) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePreview();
    };
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [previewItem, closePreview]);

  const handleKonfirmasi = async (item: BuktiPembayaranItem) => {
    if (!window.confirm(`Konfirmasi bukti pembayaran ${item.namaLengkap} (${item.noPendaftaran})? Tagihan booking akan ditandai LUNAS.`)) return;
    setBusyId(item.id);
    try {
      const res = await konfirmasiBuktiPembayaran(item.id);
      if (!res.success) {
        alert(res.error || "Gagal mengonfirmasi bukti.");
      } else if (previewItem?.id === item.id) {
        closePreview();
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleTolak = async (item: BuktiPembayaranItem) => {
    if (!window.confirm(`Tolak bukti pembayaran ${item.namaLengkap} (${item.noPendaftaran})? Santri perlu dihubungi via WhatsApp untuk mengunggah ulang / menjelaskan.`)) return;
    setBusyId(item.id);
    try {
      const res = await tolakBuktiPembayaran(item.id);
      if (!res.success) {
        alert(res.error || "Gagal menolak bukti.");
      } else if (previewItem?.id === item.id) {
        closePreview();
      }
    } finally {
      setBusyId(null);
    }
  };

  if (items.length === 0) return null;

  const previewIsMenunggu =
    previewItem !== null &&
    previewItem.buktiPembayaranStatus !== "DITERIMA" &&
    previewItem.buktiPembayaranStatus !== "DITOLAK";
  const previewIsImage = previewType !== null && previewType.startsWith("image/");

  return (
    <>
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-primary-light/20 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-primary-light/20 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-heading font-bold text-text-primary dark:text-gray-100">Bukti Transfer Booking (Tahap 1)</h2>
            <p className="text-xs text-text-secondary dark:text-gray-400 mt-0.5">
              Bukti yang diunggah santri di form pendaftaran. Klik gambar untuk pratinjau; konfirmasi setelah memeriksa transfer ke BRI 055501049030500.
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
            const thumbBroken = thumbFailed.has(item.id);
            return (
              <div key={item.id} className="px-5 py-4 flex flex-col md:flex-row md:items-center gap-3">
                {/* Thumbnail — klik untuk pratinjau */}
                <button
                  type="button"
                  onClick={() => openPreview(item)}
                  title="Klik untuk pratinjau"
                  className="shrink-0 w-16 h-20 bg-gray-100 rounded-lg overflow-hidden border border-primary-light/30 shadow-sm relative hover:ring-2 hover:ring-primary/50 transition-shadow"
                >
                  {thumbBroken ? (
                    <span className="w-full h-full flex flex-col items-center justify-center text-text-secondary gap-1">
                      <FileText size={20} />
                      <span className="text-[10px] font-bold uppercase">Dokumen</span>
                    </span>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/admin/santri/${item.id}/bukti`}
                      alt={`Bukti pembayaran ${item.namaLengkap}`}
                      loading="lazy"
                      className="w-full h-full object-cover"
                      onError={() =>
                        setThumbFailed((prev) => {
                          const next = new Set(prev);
                          next.add(item.id);
                          return next;
                        })
                      }
                    />
                  )}
                </button>

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
                  <button
                    type="button"
                    onClick={() => openPreview(item)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary border border-primary-light/50 rounded-lg hover:bg-primary-bg transition-colors"
                  >
                    <ExternalLink size={14} /> Lihat Bukti
                  </button>
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

      {/* Modal pratinjau — tetap di halaman yang sama */}
      {previewItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
          onClick={closePreview}
          role="dialog"
          aria-modal="true"
          aria-label={`Pratinjau bukti pembayaran ${previewItem.namaLengkap}`}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-primary-light/20">
              <div className="min-w-0">
                <p className="font-semibold text-text-primary dark:text-gray-100 truncate">
                  {previewItem.namaLengkap} <span className="text-sm font-normal text-text-secondary">· {previewItem.noPendaftaran}</span>
                </p>
                <p className="text-xs text-text-secondary">Bukti transfer booking (Tahap 1) · {previewItem.gelombangNama}</p>
              </div>
              {/* Tombol X untuk keluar dari pratinjau */}
              <button
                type="button"
                onClick={closePreview}
                aria-label="Tutup pratinjau"
                title="Tutup (Esc)"
                className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full text-text-secondary hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-text-primary transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 min-h-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-auto">
              {previewLoading ? (
                <span className="flex items-center gap-2 py-16 text-text-secondary">
                  <Loader2 size={20} className="animate-spin" /> Memuat bukti…
                </span>
              ) : previewError || !previewUrl ? (
                <span className="py-16 px-6 text-sm text-danger text-center">
                  {previewError || "Bukti tidak dapat dimuat."}
                </span>
              ) : previewIsImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt={`Bukti pembayaran ${previewItem.namaLengkap}`}
                  className="max-w-full max-h-[65vh] w-auto h-auto object-contain"
                />
              ) : (
                <iframe
                  src={previewUrl}
                  title={`Bukti pembayaran ${previewItem.namaLengkap}`}
                  className="w-full h-[65vh] bg-white"
                />
              )}
            </div>

            <div className="flex items-center justify-between gap-2 flex-wrap px-5 py-3 border-t border-primary-light/20">
              <a
                href={previewItem.fileBuktiPembayaran}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary underline"
              >
                <ExternalLink size={14} /> Buka di Drive
              </a>
              {previewIsMenunggu && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={busyId === previewItem.id}
                    onClick={() => handleTolak(previewItem)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    <XCircle size={14} /> Tolak
                  </button>
                  <button
                    type="button"
                    disabled={busyId === previewItem.id}
                    onClick={() => handleKonfirmasi(previewItem)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle2 size={14} /> {busyId === previewItem.id ? "Memproses…" : "Konfirmasi"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
