import { useState, useEffect } from "react";
import { UploadCloud } from "lucide-react";

// Batas upload yang berlaku di hosting live saat ini (Vercel, Serverless
// Function 4,5 MB). Dipakai di sini supaya santri tidak gagal diam-diam
// saat mengunggah bukti — batas ini hilang setelah hosting pindah ke VPS.
const MAX_BUKTI_SIZE = 4.5 * 1024 * 1024;

export default function Step4Pembayaran({
  initialData,
  onNext,
  onBack,
  onDataChange
}: {
  initialData: { gelombangId?: string; riwayatAkademik?: string; namaLengkap?: string; fileBuktiPembayaran?: string },
  onNext: (data: { fileBuktiPembayaran: string }) => void,
  onBack: (data: { fileBuktiPembayaran: string }) => void,
  onDataChange?: (data: { fileBuktiPembayaran: string }) => void
}) {
  const [formData, setFormData] = useState({
    fileBuktiPembayaran: initialData.fileBuktiPembayaran || "",
  });

  const [uploading, setUploading] = useState(false);

  // File yang baru dipilih — pratinjau langsung tampil dan unggah otomatis
  // dimulai (tidak ada lagi tombol "Unggah" eksplisit).
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  // Info file yang BARU diunggah di sesi ini — dipertahankan agar gambar
  // tetap terlihat sesudah unggah otomatis.
  const [uploadedPreview, setUploadedPreview] = useState<{ name: string; size: string; type: string } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Nominal booking (Tahap 1) dari paket gelombang yang dipilih.
  const [biaya, setBiaya] = useState<{ nominal: number; poinNama: string; tahapNama: string } | null>(null);
  // Tanpa gelombang terpilih, nominal memang tidak bisa dimuat — langsung
  // tampilkan catatan fallback (bukan lewat effect).
  const [biayaError, setBiayaError] = useState(!initialData.gelombangId);

  useEffect(() => {
    const gelombangId = initialData.gelombangId;
    if (!gelombangId) return;
    const params = new URLSearchParams({ gelombangId });
    if (initialData.riwayatAkademik) params.set("riwayatAkademik", initialData.riwayatAkademik);
    fetch(`/api/pendaftaran/biaya?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("gagal memuat biaya");
        const data = await res.json();
        setBiaya({ nominal: data.nominal, poinNama: data.poinNama, tahapNama: data.tahapNama });
      })
      .catch(() => setBiayaError(true));
    // Hanya saat step dibuka (gelombang + riwayat sudah final dari Step 1 & 3).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatSize = (size: number) =>
    size >= 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)} MB` : `${(size / 1024).toFixed(0)} KB`;

  const formatRupiah = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

  const clearSelection = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSelectedFile(null);
    setUploadError(null);
  };

  // Hapus bukti yang sudah terunggah: lepas URL Drive + pratinjau lokal.
  const clearUploaded = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setUploadedPreview(null);
    setFormData({ fileBuktiPembayaran: "" });
    onDataChange?.({ fileBuktiPembayaran: "" });
  };

  // Pilih file → pratinjau langsung tampil dan unggah otomatis dimulai.
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    if (file.size > MAX_BUKTI_SIZE) {
      alert("Ukuran file terlalu besar. Maksimal 4,5 MB — silakan kompres dulu (mis. foto bukti transfer dari galeri biasanya cukup kecil).");
      return;
    }

    clearSelection();
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    void handleFileUpload(file);
  };

  // Unggah otomatis saat file dipilih; bisa dipanggil ulang saat gagal.
  const handleFileUpload = async (fileArg?: File) => {
    const file = fileArg ?? selectedFile;
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    try {
      // === GOOGLE DRIVE LOGIC ===
      const fd = new FormData();
      fd.append("file", file);
      fd.append("santriName", initialData.namaLengkap || "Tanpa Nama");
      fd.append("documentName", "Bukti Pembayaran");
      // Gelombang yang dipilih pendaftar di Step 1 — supaya berkas masuk
      // folder gelombang yang benar, bukan folder gelombang aktif.
      if (initialData.gelombangId) fd.append("gelombangId", initialData.gelombangId);

      const driveRes = await fetch('/api/upload-drive', {
        method: "POST",
        body: fd
      });

      if (!driveRes.ok) {
        const errDesc = await driveRes.json().catch(() => ({}));
        throw new Error(errDesc.error || "Gagal mengunggah ke Google Drive");
      }

      const data = await driveRes.json();
      setFormData({ fileBuktiPembayaran: data.secure_url });
      // Simpan langsung ke cache wizard agar URL tidak hilang saat refresh.
      onDataChange?.({ fileBuktiPembayaran: data.secure_url });
      // Sukses: pratinjau lokal DIPERTAHANKAN agar gambar tetap terlihat;
      // hanya status "pending" yang dibersihkan supaya tidak menghalangi submit.
      setSelectedFile(null);
      setUploadedPreview({ name: file.name, size: formatSize(file.size), type: file.type });
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : "Gagal mengunggah.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (uploading) {
      alert("Harap tunggu hingga proses unggah selesai.");
      return;
    }
    if (selectedFile) {
      alert("Bukti pembayaran masih gagal diunggah atau sedang diproses. Silakan tunggu, klik \"Coba lagi\", atau ganti pilihannya.");
      return;
    }
    if (!formData.fileBuktiPembayaran) {
      alert("Silakan upload bukti pembayaran (transfer booking) terlebih dahulu.");
      return;
    }
    onNext(formData);
  };

  const isImage = (typeOrUrl: string) =>
    typeOrUrl.startsWith("image/") || /\.(jpeg|jpg|gif|png|webp)$/i.test(typeOrUrl) || typeOrUrl.startsWith("data:image");

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-2xl font-heading font-bold text-text-primary mb-6">4. Pembayaran</h2>

      {/* Info transfer */}
      <div className="bg-bg-cream rounded-2xl p-6 border border-primary-light/30 space-y-4">
        <p className="text-sm text-text-secondary">
          Silakan transfer biaya booking (Tahap 1) ke rekening berikut, lalu unggah bukti transfernya di bawah ini.
        </p>
        <div className="flex justify-between items-center">
          <span className="text-text-secondary">Rekening tujuan</span>
          <span className="font-bold text-text-primary text-right">BRI 055501049030500<br /><span className="text-sm font-medium">a.n. Markaz Arabiyah</span></span>
        </div>
        <div className="flex justify-between items-center pt-3 border-t border-primary-light/20">
          <span className="text-text-secondary">{biaya ? biaya.tahapNama : "Biaya booking (Tahap 1)"}</span>
          {biaya ? (
            <span className="text-2xl font-bold text-primary">{formatRupiah(biaya.nominal)}</span>
          ) : (
            <span className="text-sm text-text-secondary text-right max-w-xs">
              {biayaError
                ? "Nominal mengikuti paket gelombang yang dipilih; admin akan mengonfirmasi jumlahnya."
                : "Memuat nominal…"}
            </span>
          )}
        </div>
        {biaya && (
          <p className="text-xs text-text-secondary">Keterangan: {biaya.poinNama}. Pastikan nominal transfer sama persis agar mudah diverifikasi admin.</p>
        )}
      </div>

      {/* Upload bukti */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-text-secondary block">
          Bukti Pembayaran (Transfer Booking) <span className="text-danger">*</span>
          <span className="block font-normal text-xs mt-1">(Format PDF/JPG. Maksimal 4,5 MB)</span>
        </label>
        <div className="border-2 border-dashed border-primary-light/50 rounded-xl p-6 text-center hover:bg-primary-bg transition-colors">
          {formData.fileBuktiPembayaran ? (
            <div className="flex flex-col items-center gap-2">
              {uploadedPreview && isImage(uploadedPreview.type) && previewUrl ? (
                <div className="w-24 h-32 bg-gray-100 rounded-lg overflow-hidden border border-primary-light/30 shadow-sm relative">
                  <a href={previewUrl} target="_blank" rel="noopener noreferrer" title="Buka pratinjau ukuran penuh">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewUrl} alt="Pratinjau bukti pembayaran" className="w-full h-full object-cover" />
                  </a>
                </div>
              ) : isImage(formData.fileBuktiPembayaran) ? (
                <div className="w-24 h-32 bg-gray-100 rounded-lg overflow-hidden border border-primary-light/30 shadow-sm relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={formData.fileBuktiPembayaran} alt="Preview bukti pembayaran" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-24 h-32 bg-gray-100 rounded-lg border border-primary-light/30 shadow-sm flex items-center justify-center text-text-secondary">
                  <span className="text-xs font-bold uppercase">Dokumen</span>
                </div>
              )}
              <span className="text-success font-medium">✅ File berhasil diunggah</span>
              <span className="text-xs text-text-secondary overflow-hidden text-ellipsis w-full max-w-xs">{uploadedPreview ? uploadedPreview.name : formData.fileBuktiPembayaran.split('/').pop()}</span>
              <a href={formData.fileBuktiPembayaran} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">Lihat dokumen</a>
              <button type="button" onClick={clearUploaded} className="text-xs text-danger underline mt-2">Hapus &amp; Ganti</button>
            </div>
          ) : selectedFile ? (
            <div className="flex flex-col items-center gap-2">
              {selectedFile.type.startsWith("image/") ? (
                <div className="w-24 h-32 bg-gray-100 rounded-lg overflow-hidden border border-primary-light/30 shadow-sm relative">
                  <a href={previewUrl ?? undefined} target="_blank" rel="noopener noreferrer" title="Buka pratinjau ukuran penuh">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewUrl ?? undefined} alt="Pratinjau bukti pembayaran" className="w-full h-full object-cover" />
                  </a>
                </div>
              ) : (
                <div className="w-24 h-32 bg-gray-100 rounded-lg border border-primary-light/30 shadow-sm flex flex-col items-center justify-center text-text-secondary gap-1 p-2">
                  <span className="text-xs font-bold uppercase">Dokumen</span>
                  <a href={previewUrl ?? undefined} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">Lihat dokumen</a>
                </div>
              )}
              <span className="text-sm font-medium break-all max-w-xs">{selectedFile.name}</span>
              <span className="text-xs text-text-secondary">{formatSize(selectedFile.size)}</span>
              {uploading ? (
                <span className="text-sm text-primary font-medium mt-1">Sedang mengunggah…</span>
              ) : uploadError ? (
                <>
                  <span className="text-xs text-danger mt-1">Gagal mengunggah: {uploadError}</span>
                  <div className="flex gap-2 mt-1">
                    <button type="button" onClick={() => handleFileUpload()} className="px-4 py-1.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-light">Coba lagi</button>
                    <button type="button" onClick={clearSelection} className="px-4 py-1.5 text-sm text-danger underline">Ganti</button>
                  </div>
                </>
              ) : (
                <div className="flex gap-2 mt-1">
                  <button type="button" onClick={clearSelection} className="px-4 py-1.5 text-sm text-danger underline">Ganti</button>
                </div>
              )}
            </div>
          ) : (
            <label className="cursor-pointer flex flex-col items-center">
              <UploadCloud size={32} className="text-primary-light mb-2" />
              <span className="text-sm font-medium">Klik untuk pilih file</span>
              <input
                type="file"
                accept=".pdf,image/jpeg,image/jpg"
                className="hidden"
                onChange={handleFileSelect}
              />
            </label>
          )}
        </div>
        <p className="text-xs text-text-secondary">
          Bukti akan diperiksa admin. Bila ada yang kurang jelas, admin akan menghubungi Anda via WhatsApp.
        </p>
      </div>

      <div className="flex justify-between pt-6 border-t border-primary-light/20">
        <button
          type="button"
          onClick={() => onBack(formData)}
          className="px-6 py-2.5 text-text-secondary font-medium hover:text-primary transition-colors"
        >
          &larr; Kembali
        </button>
        <button
          type="submit"
          className="px-6 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary-light transition-colors"
        >
          Daftar Sekarang &rarr;
        </button>
      </div>
    </form>
  );
}
