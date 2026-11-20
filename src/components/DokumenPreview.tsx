"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Loader2, ExternalLink, Download, FileText } from "lucide-react";

// Tombol + modal pratinjau dokumen Drive, dipakai bersama oleh halaman
// pemberkasan santri dan spreadsheet admin. Isi file diambil lewat route
// proxy (bukan tautan Drive langsung) supaya gambar/PDF tampil di dalam
// halaman; tautan "Buka di Drive" tetap disediakan di footer modal.
// Dengan prop thumbnail, pemicunya berupa gambar kecil dokumen itu sendiri
// (lazy loading): foto tampil langsung, PDF tampil sebagai kartu "PDF"
// karena PDF tidak bisa dirender sebagai <img>. Diklik, membuka modal
// pratinjau yang sama.
export default function DokumenPreview({ title, previewUrl, driveUrl, trigger, triggerTitle, className, thumbnail }: {
  title: string;
  previewUrl: string;
  driveUrl?: string | null;
  trigger?: React.ReactNode;
  triggerTitle?: string;
  className?: string;
  thumbnail?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thumbFailed, setThumbFailed] = useState(false);

  const downloadUrl = `${previewUrl}${previewUrl.includes("?") ? "&" : "?"}download=1`;

  const close = useCallback(() => {
    setBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setOpen(false);
    setMimeType(null);
    setError(null);
    setLoading(false);
  }, []);

  const openPreview = async () => {
    close();
    setOpen(true);
    setLoading(true);
    try {
      const res = await fetch(previewUrl);
      if (!res.ok) throw new Error("Gagal memuat dokumen.");
      const blob = await res.blob();
      setMimeType(blob.type);
      setBlobUrl(URL.createObjectURL(blob));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Gagal memuat dokumen.");
    } finally {
      setLoading(false);
    }
  };

  // Tutup modal dengan tombol Escape; kunci scroll halaman saat modal terbuka.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close]);

  const isImage = mimeType !== null && mimeType.startsWith("image/");
  const isPdf = mimeType === "application/pdf";

  return (
    <>
      {thumbnail ? (
        <button
          type="button"
          onClick={openPreview}
          title={triggerTitle ?? `Lihat pratinjau ${title}`}
          className={`overflow-hidden ${className ?? ""}`}
        >
          {thumbFailed ? (
            <span className="w-full h-full flex flex-col items-center justify-center gap-0.5 bg-red-50 text-red-600">
              <FileText size={18} />
              <span className="text-[10px] font-bold">PDF</span>
            </span>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt={title}
              loading="lazy"
              decoding="async"
              onError={() => setThumbFailed(true)}
              className="w-full h-full object-cover"
            />
          )}
        </button>
      ) : (
        <button type="button" onClick={openPreview} title={triggerTitle} className={className}>
          {trigger}
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label={`Pratinjau ${title}`}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-primary-light/20">
              <div className="min-w-0">
                <p className="font-semibold text-text-primary dark:text-gray-100 truncate">{title}</p>
                <p className="text-xs text-text-secondary">Pratinjau dokumen — tanpa pindah ke Google Drive</p>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Tutup pratinjau"
                title="Tutup (Esc)"
                className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full text-text-secondary hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-text-primary transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 min-h-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-auto">
              {loading ? (
                <span className="flex items-center gap-2 py-16 text-text-secondary">
                  <Loader2 size={20} className="animate-spin" /> Memuat dokumen…
                </span>
              ) : error || !blobUrl ? (
                <span className="py-16 px-6 text-sm text-danger text-center">
                  {error || "Dokumen tidak dapat dimuat."}
                </span>
              ) : isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={blobUrl}
                  alt={title}
                  className="max-w-full max-h-[65vh] w-auto h-auto object-contain"
                />
              ) : isPdf ? (
                <iframe
                  src={blobUrl}
                  title={title}
                  className="w-full h-[65vh] bg-white"
                />
              ) : (
                <span className="py-16 px-6 text-sm text-text-secondary text-center">
                  Format dokumen ini tidak bisa dipratinjau. Silakan unduh untuk melihatnya.
                </span>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 flex-wrap px-5 py-3 border-t border-primary-light/20">
              {driveUrl ? (
                <a
                  href={driveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary underline"
                >
                  <ExternalLink size={14} /> Buka di Drive
                </a>
              ) : (
                <span />
              )}
              <a
                href={downloadUrl}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary border border-primary-light/50 rounded-lg hover:bg-primary-bg transition-colors"
              >
                <Download size={14} /> Download
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
