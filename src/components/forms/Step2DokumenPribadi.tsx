import { useState } from "react";
import { UploadCloud, Info } from "lucide-react";

type UploadField = 'fileAkteLahir' | 'fileKtp' | 'fileKK' | 'filePasFoto' | 'filePaspor';

const DOCUMENT_NAMES: Record<UploadField, string> = {
  fileAkteLahir: "Akte Kelahiran",
  fileKtp: "KTP",
  fileKK: "Kartu Keluarga",
  filePasFoto: "Pas Foto",
  filePaspor: "Paspor",
};

export default function Step2DokumenPribadi({
  initialData,
  onNext,
  onBack,
  onDataChange
}: {
  initialData: any,
  onNext: (data: any) => void,
  onBack: (data: any) => void,
  onDataChange?: (data: any) => void
}) {
  const [formData, setFormData] = useState<Record<UploadField, string>>({
    fileAkteLahir: initialData.fileAkteLahir || "",
    fileKtp: initialData.fileKtp || "",
    fileKK: initialData.fileKK || "",
    filePasFoto: initialData.filePasFoto || "",
    filePaspor: initialData.filePaspor || "",
  });

  const [isUploading, setIsUploading] = useState<Record<UploadField, boolean>>({
    fileAkteLahir: false,
    fileKtp: false,
    fileKK: false,
    filePasFoto: false,
    filePaspor: false,
  });

  // File yang baru dipilih — pratinjau langsung tampil dan unggah otomatis
  // dimulai (tidak ada lagi tombol "Unggah" eksplisit).
  const [selectedFile, setSelectedFile] = useState<Partial<Record<UploadField, File>>>({});
  const [previewUrl, setPreviewUrl] = useState<Partial<Record<UploadField, string>>>({});
  // Info file yang BARU diunggah di sesi ini — dipertahankan agar gambar
  // tetap terlihat sesudah unggah otomatis (object URL hanya hidup selama
  // halaman ini dibuka; sesudah refresh, tampil kotak Dokumen biasa).
  const [uploadedPreview, setUploadedPreview] = useState<Partial<Record<UploadField, { name: string; size: string; type: string }>>>({});
  const [uploadError, setUploadError] = useState<Partial<Record<UploadField, string>>>({});

  const formatSize = (size: number) =>
    size >= 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)} MB` : `${(size / 1024).toFixed(0)} KB`;

  const clearSelection = (field: UploadField) => {
    setPreviewUrl(prev => {
      if (prev[field]) URL.revokeObjectURL(prev[field]!);
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setSelectedFile(prev => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setUploadError(prev => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  // Hapus dokumen yang sudah terunggah: lepas URL Drive + pratinjau lokal.
  const clearUploaded = (field: UploadField) => {
    setPreviewUrl(prev => {
      if (prev[field]) URL.revokeObjectURL(prev[field]!);
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setUploadedPreview(prev => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setFormData(f => ({ ...f, [field]: "" }));
    onDataChange?.({ [field]: "" });
  };

  // Pilih file → pratinjau langsung tampil dan unggah otomatis dimulai.
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, field: UploadField) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    if (field === 'filePasFoto' && !file.type.includes('jpeg') && !file.type.includes('jpg')) {
      alert("Pas foto harus berformat JPG/JPEG");
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(`Ukuran file terlalu besar. Maksimal 10MB.`);
      return;
    }

    clearSelection(field);
    setSelectedFile(prev => ({ ...prev, [field]: file }));
    setPreviewUrl(prev => ({ ...prev, [field]: URL.createObjectURL(file) }));
    void handleFileUpload(field, file);
  };

  // Unggah otomatis saat file dipilih; bisa dipanggil ulang saat gagal.
  const handleFileUpload = async (field: UploadField, fileArg?: File) => {
    const file = fileArg ?? selectedFile[field];
    if (!file) return;

    setIsUploading(prev => ({ ...prev, [field]: true }));
    setUploadError(prev => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
    try {
      // === GOOGLE DRIVE LOGIC ===
      const fd = new FormData();
      fd.append("file", file);
      fd.append("santriName", initialData.namaLengkap || "Tanpa Nama");
      fd.append("documentName", DOCUMENT_NAMES[field]);

      const driveRes = await fetch('/api/upload-drive', {
        method: "POST",
        body: fd
      });

      if (!driveRes.ok) {
        const errDesc = await driveRes.json().catch(() => ({}));
        throw new Error(errDesc.error || "Gagal mengunggah ke Google Drive");
      }

      const data = await driveRes.json();

      setFormData(prev => ({
        ...prev,
        [field]: data.secure_url
      }));
      // Simpan langsung ke cache wizard agar URL tidak hilang saat refresh.
      onDataChange?.({ [field]: data.secure_url });
      // Sukses: pratinjau lokal DIPERTAHANKAN agar gambar tetap terlihat;
      // hanya status "pending" yang dibersihkan supaya tidak menghalangi submit.
      setSelectedFile(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
      setUploadedPreview(prev => ({
        ...prev,
        [field]: { name: file.name, size: formatSize(file.size), type: file.type },
      }));
    } catch (e: any) {
      setUploadError(prev => ({ ...prev, [field]: e.message }));
    } finally {
      setIsUploading(prev => ({ ...prev, [field]: false }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.values(isUploading).some(Boolean)) {
      alert("Harap tunggu hingga proses unggah selesai.");
      return;
    }
    if (Object.values(selectedFile).some(Boolean)) {
      alert("Masih ada dokumen yang gagal diunggah atau sedang diproses. Silakan tunggu, klik \"Coba lagi\", atau ganti pilihannya.");
      return;
    }
    if (!formData.fileAkteLahir || !formData.fileKtp || !formData.filePasFoto) {
      alert("Silakan upload semua dokumen yang diwajibkan.");
      return;
    }
    // Upload paspor wajib hanya jika pendaftar menyatakan punya paspor di Step 1
    if (initialData.punyaPaspor && !formData.filePaspor) {
      alert("Anda menyatakan sudah memiliki paspor. Silakan upload scan paspor.");
      return;
    }
    onNext(formData);
  };

  const renderUploadBox = (
    field: UploadField,
    label: string,
    opts: { required?: boolean; accept?: string; hint?: string; notice?: string } = {}
  ) => {
    const { required = true, accept = ".pdf,image/jpeg,image/jpg", hint = "(Format PDF/JPG. Maksimal 10MB)", notice } = opts;
    const pending = selectedFile[field];
    const pendingPreview = previewUrl[field];
    const pendingSize = pending ? formatSize(pending.size) : "";
    const justUploaded = uploadedPreview[field];
    return (
      <div className="space-y-3">
        <label className="text-sm font-medium text-text-secondary block">
          {label} {required && <span className="text-danger">*</span>}
          <span className="block font-normal text-xs mt-1">{hint}</span>
        </label>
        {notice && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            <Info size={16} className="shrink-0 mt-0.5" />
            <span>{notice}</span>
          </div>
        )}
        <div className="border-2 border-dashed border-primary-light/50 rounded-xl p-6 text-center hover:bg-primary-bg transition-colors">
          {formData[field] ? (
            <div className="flex flex-col items-center gap-2">
              {justUploaded && justUploaded.type.startsWith("image/") && previewUrl[field] ? (
                <div className="w-24 h-32 bg-gray-100 rounded-lg overflow-hidden border border-primary-light/30 shadow-sm relative">
                  <a href={previewUrl[field]} target="_blank" rel="noopener noreferrer" title="Buka pratinjau ukuran penuh">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewUrl[field]} alt={`Pratinjau ${label}`} className="w-full h-full object-cover" />
                  </a>
                </div>
              ) : formData[field].match(/\.(jpeg|jpg|gif|png|webp)$/i) || formData[field].startsWith("data:image") ? (
                <div className="w-24 h-32 bg-gray-100 rounded-lg overflow-hidden border border-primary-light/30 shadow-sm relative">
                   {/* eslint-disable-next-line @next/next/no-img-element */}
                   <img src={formData[field]} alt={`Preview ${label}`} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-24 h-32 bg-gray-100 rounded-lg border border-primary-light/30 shadow-sm flex items-center justify-center text-text-secondary">
                  <span className="text-xs font-bold uppercase">Dokumen</span>
                </div>
              )}
              <span className="text-success font-medium">✅ File berhasil diunggah</span>
              <span className="text-xs text-text-secondary overflow-hidden text-ellipsis w-full max-w-xs">{justUploaded ? justUploaded.name : formData[field].split('/').pop()}</span>
              <a href={formData[field]} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">Lihat dokumen</a>
              <button type="button" onClick={() => clearUploaded(field)} className="text-xs text-danger underline mt-2">Hapus & Ganti</button>
            </div>
          ) : pending ? (
            <div className="flex flex-col items-center gap-2">
              {pending.type.startsWith("image/") ? (
                <div className="w-24 h-32 bg-gray-100 rounded-lg overflow-hidden border border-primary-light/30 shadow-sm relative">
                  <a href={pendingPreview} target="_blank" rel="noopener noreferrer" title="Buka pratinjau ukuran penuh">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={pendingPreview} alt={`Pratinjau ${label}`} className="w-full h-full object-cover" />
                  </a>
                </div>
              ) : (
                <div className="w-24 h-32 bg-gray-100 rounded-lg border border-primary-light/30 shadow-sm flex flex-col items-center justify-center text-text-secondary gap-1 p-2">
                  <span className="text-xs font-bold uppercase">Dokumen</span>
                  <a href={pendingPreview} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">Lihat dokumen</a>
                </div>
              )}
              <span className="text-sm font-medium break-all max-w-xs">{pending.name}</span>
              <span className="text-xs text-text-secondary">{pendingSize}</span>
              {isUploading[field] ? (
                <span className="text-sm text-primary font-medium mt-1">Sedang mengunggah…</span>
              ) : uploadError[field] ? (
                <>
                  <span className="text-xs text-danger mt-1">Gagal mengunggah: {uploadError[field]}</span>
                  <div className="flex gap-2 mt-1">
                    <button type="button" onClick={() => handleFileUpload(field)} className="px-4 py-1.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-light">Coba lagi</button>
                    <button type="button" onClick={() => clearSelection(field)} className="px-4 py-1.5 text-sm text-danger underline">Ganti</button>
                  </div>
                </>
              ) : (
                <div className="flex gap-2 mt-1">
                  <button type="button" onClick={() => clearSelection(field)} className="px-4 py-1.5 text-sm text-danger underline">Ganti</button>
                </div>
              )}
            </div>
          ) : (
            <label className="cursor-pointer flex flex-col items-center">
              <UploadCloud size={32} className="text-primary-light mb-2" />
              <span className="text-sm font-medium">Klik untuk pilih file</span>
              <input
                type="file"
                accept={accept}
                className="hidden"
                onChange={(e) => handleFileSelect(e, field)}
              />
            </label>
          )}
        </div>
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-2xl font-heading font-bold text-text-primary mb-6">2. Dokumen Pribadi</h2>
      
      <div className="space-y-8">
        {renderUploadBox('fileAkteLahir', 'Scan Akte Kelahiran')}
        {renderUploadBox('fileKtp', 'Scan/Foto KTP')}
        {renderUploadBox('fileKK', 'Scan Kartu Keluarga (KK)')}
        {renderUploadBox('filePasFoto', 'Pas Foto (Background Putih)', {
          accept: "image/jpeg,image/jpg",
          hint: "(Hanya format JPG. Maksimal 10MB)",
          notice: "Pas foto wajib menggunakan background putih.",
        })}
        {renderUploadBox('filePaspor', 'Scan Paspor', { 
          required: !!initialData.punyaPaspor,
          notice: initialData.punyaPaspor 
            ? undefined 
            : "Wajib diisi jika Anda sudah memiliki paspor (centang di Step 1).",
        })}
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
          Lanjut ke Akademik &rarr;
        </button>
      </div>
    </form>
  );
}
