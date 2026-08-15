import { useState } from "react";
import { UploadCloud } from "lucide-react";

// Helper component for Cloudinary File Upload will be integrated later
// For now, this is a skeleton accepting string URLs after mock upload

export default function Step2DokumenPribadi({ 
  initialData, 
  onNext,
  onBack
}: { 
  initialData: any, 
  onNext: (data: any) => void,
  onBack: (data: any) => void
}) {
  const [formData, setFormData] = useState({
    fileAkteLahir: initialData.fileAkteLahir || "",
    filePasFoto: initialData.filePasFoto || "",
  });

  const [isUploading, setIsUploading] = useState({
    akte: false,
    foto: false
  });

  // Mock Upload Function - to be replaced with actual Cloudinary Logic
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'fileAkteLahir' | 'filePasFoto', uploadKey: 'akte' | 'foto') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type for pas foto
    if (fieldName === 'filePasFoto' && !file.type.includes('jpeg') && !file.type.includes('jpg')) {
      alert("Pas foto harus berformat JPG/JPEG");
      return;
    }

    // Validate size (5MB for all)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(`Ukuran file terlalu besar. Maksimal ${maxSize / (1024*1024)}MB.`);
      return;
    }

    setIsUploading(prev => ({ ...prev, [uploadKey]: true }));
    
    // Konversi file ke format Base64 secara instan untuk kebutuhan testing lokal
    // (Akan otomatis bisa dirender langsung oleh tag <img> di form pendaftaran maupun Dasbor Admin)
    const reader = new FileReader();
    reader.onload = () => {
      setFormData(prev => ({ 
        ...prev, 
        [fieldName]: reader.result as string 
      }));
      setIsUploading(prev => ({ ...prev, [uploadKey]: false }));
    };
    reader.onerror = () => {
      alert("Gagal memuat file");
      setIsUploading(prev => ({ ...prev, [uploadKey]: false }));
    }
    // Baca file sungguhan & jadikan base64 text
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fileAkteLahir || !formData.filePasFoto) {
      alert("Silakan upload semua dokumen yang diwajibkan.");
      return;
    }
    onNext(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-2xl font-heading font-bold text-text-primary mb-6">2. Dokumen Pribadi</h2>
      
      <div className="space-y-8">
        <div className="space-y-3">
          <label className="text-sm font-medium text-text-secondary block">
            Scan Akte Kelahiran <span className="text-danger">*</span>
            <span className="block font-normal text-xs mt-1">(Format PDF/JPG. Maksimal 5MB)</span>
          </label>
          <div className="border-2 border-dashed border-primary-light/50 rounded-xl p-6 text-center hover:bg-primary-bg transition-colors">
            {formData.fileAkteLahir ? (
              <div className="flex flex-col items-center gap-2">
                {formData.fileAkteLahir.startsWith("data:image") ? (
                  <div className="w-24 h-32 bg-gray-100 rounded-lg overflow-hidden border border-primary-light/30 shadow-sm relative">
                     {/* eslint-disable-next-line @next/next/no-img-element */}
                     <img src={formData.fileAkteLahir} alt="Preview Akte" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-24 h-32 bg-gray-100 rounded-lg border border-primary-light/30 shadow-sm flex items-center justify-center text-text-secondary">
                    <span className="text-xs font-bold uppercase">Dokumen</span>
                  </div>
                )}
                <span className="text-success font-medium">✅ File berhasil diunggah</span>
                <span className="text-xs text-text-secondary overflow-hidden text-ellipsis w-full max-w-xs">{formData.fileAkteLahir}</span>
                <button type="button" onClick={() => setFormData(f => ({...f, fileAkteLahir: ""}))} className="text-xs text-danger underline mt-2">Hapus & Ganti</button>
              </div>
            ) : (
              <label className="cursor-pointer flex flex-col items-center">
                <UploadCloud size={32} className="text-primary-light mb-2" />
                <span className="text-sm font-medium">{isUploading.akte ? "Sedang Mengunggah..." : "Klik untuk pilih file"}</span>
                <input 
                  type="file" 
                  accept=".pdf,image/jpeg,image/jpg" 
                  className="hidden" 
                  onChange={(e) => handleFileUpload(e, 'fileAkteLahir', 'akte')}
                  disabled={isUploading.akte}
                />
              </label>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium text-text-secondary block">
            Pas Foto (Background Merah) <span className="text-danger">*</span>
            <span className="block font-normal text-xs mt-1">(Hanya format JPG. Maksimal 5MB)</span>
          </label>
          <div className="border-2 border-dashed border-primary-light/50 rounded-xl p-6 text-center hover:bg-primary-bg transition-colors">
            {formData.filePasFoto ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-24 h-32 bg-gray-100 rounded-lg overflow-hidden border border-primary-light/30 shadow-sm relative">
                   {/* eslint-disable-next-line @next/next/no-img-element */}
                   <img src={formData.filePasFoto} alt="Preview Pas Foto" className="w-full h-full object-cover" />
                </div>
                <span className="text-success font-medium">✅ File berhasil diunggah</span>
                <span className="text-xs text-text-secondary overflow-hidden text-ellipsis w-full max-w-xs">{formData.filePasFoto}</span>
                <button type="button" onClick={() => setFormData(f => ({...f, filePasFoto: ""}))} className="text-xs text-danger underline mt-2">Hapus & Ganti</button>
              </div>
            ) : (
              <label className="cursor-pointer flex flex-col items-center">
                <UploadCloud size={32} className="text-primary-light mb-2" />
                <span className="text-sm font-medium">{isUploading.foto ? "Sedang Mengunggah..." : "Klik untuk pilih file"}</span>
                <input 
                  type="file" 
                  accept="image/jpeg,image/jpg" 
                  className="hidden" 
                  onChange={(e) => handleFileUpload(e, 'filePasFoto', 'foto')}
                  disabled={isUploading.foto}
                />
              </label>
            )}
          </div>
        </div>
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
