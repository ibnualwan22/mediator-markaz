"use client";

import { useState, useRef } from "react";
import { UploadCloud, Loader2 } from "lucide-react";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";

// Tombol upload untuk dokumen FORM di portal santri (seksi Dokumen
// Pendaftaran). Berbeda dengan PemberkasanUploadButton (item admin):
// berkas disimpan ke field Santri yang sama dengan form pendaftaran
// (fileAkteLahir, fileIjazah, dst), bukan ke PemberkasanSantri.
export default function DokumenFormUploadButton({ field, label, hasFile }: { field: string; label: string; hasFile: boolean }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) { // max 50MB
      Swal.fire("Gagal", "Ukuran dokumen maksimal 50MB.", "error");
      return;
    }

    setIsUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("field", field);

    try {
      const res = await fetch("/api/santri/pemberkasan/upload", {
        method: "POST",
        body: fd,
      });

      if (res.ok) {
        Swal.fire({
          title: "Berhasil!",
          text: `${label} berhasil diupload ke Google Drive.`,
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });
        router.refresh();
      } else {
        const data = await res.json();
        throw new Error(data.error);
      }
    } catch (err: any) {
      Swal.fire("Gagal", err.message || "Gagal mengupload dokumen", "error");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-lg text-xs font-bold hover:bg-primary hover:text-white transition-all disabled:opacity-50"
      >
        {isUploading ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
        {isUploading ? "Mengupload..." : hasFile ? "Ganti Dokumen" : "Upload Dokumen"}
      </button>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleUpload}
        className="hidden"
        accept="application/pdf,image/*"
      />
    </>
  );
}
