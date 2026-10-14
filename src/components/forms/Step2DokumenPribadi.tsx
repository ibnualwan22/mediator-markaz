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
  onBack
}: { 
  initialData: any, 
  onNext: (data: any) => void,
  onBack: (data: any) => void
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: UploadField) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (field === 'filePasFoto' && !file.type.includes('jpeg') && !file.type.includes('jpg')) {
      alert("Pas foto harus berformat JPG/JPEG");
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(`Ukuran file terlalu besar. Maksimal 10MB.`);
      return;
    }

    setIsUploading(prev => ({ ...prev, [field]: true }));
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
    } catch (e: any) {
      alert("Error upload file: " + e.message);
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
              {formData[field].match(/\.(jpeg|jpg|gif|png|webp)$/i) || formData[field].startsWith("data:image") ? (
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
              <span className="text-xs text-text-secondary overflow-hidden text-ellipsis w-full max-w-xs">{formData[field].split('/').pop()}</span>
              <button type="button" onClick={() => setFormData(f => ({...f, [field]: ""}))} className="text-xs text-danger underline mt-2">Hapus & Ganti</button>
            </div>
          ) : (
            <label className="cursor-pointer flex flex-col items-center">
              <UploadCloud size={32} className="text-primary-light mb-2" />
              <span className="text-sm font-medium">{isUploading[field] ? "Sedang Mengunggah..." : "Klik untuk pilih file"}</span>
              <input 
                type="file" 
                accept={accept}
                className="hidden" 
                onChange={(e) => handleFileUpload(e, field)}
                disabled={isUploading[field]}
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
