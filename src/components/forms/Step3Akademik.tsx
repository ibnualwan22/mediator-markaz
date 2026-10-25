import { useState, useMemo } from "react";
import { UploadCloud } from "lucide-react";

type UploadField = 'fileIjazah' | 'fileTranskrip';

export default function Step3Akademik({
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
  const [formData, setFormData] = useState({
    riwayatAkademik: initialData.riwayatAkademik || "",
    riwayatAkademikLainnya: initialData.riwayatAkademikLainnya || "",
    tahunKelulusan: initialData.tahunKelulusan || "",
    fileIjazah: initialData.fileIjazah || "",
    fileTranskrip: initialData.fileTranskrip || "",
  });

  const [uploading, setUploading] = useState<Record<UploadField, boolean>>({
    fileIjazah: false,
    fileTranskrip: false,
  });

  // File yang baru dipilih tapi BELUM diupload — ditampilkan sebagai
  // pratinjau agar bisa direview dulu sebelum diunggah.
  const [selectedFile, setSelectedFile] = useState<Partial<Record<UploadField, File>>>({});
  const [previewUrl, setPreviewUrl] = useState<Partial<Record<UploadField, string>>>({});

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
  };

  // Kalkulasi tahun kelulusan dinamis (CurrentYear - 2 s/d CurrentYear + 1)
  // Berdasarkan spec: dibuka 2026, opsi 2024-2027
  const years = useMemo(() => {
    const baseYear = 2026; 
    return [baseYear - 2, baseYear - 1, baseYear, baseYear + 1];
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Simpan langsung ke cache wizard agar isian tidak hilang saat refresh
    // (Step 3 adalah step terakhir — tidak ada tombol Next yang menyimpan).
    onDataChange?.({ [name]: value });
  };

  const documentNames: Record<UploadField, string> = {
    fileIjazah: "Ijazah Asli",
    fileTranskrip: "Transkrip Nilai",
  };

  // Pilih file → hanya pratinjau, BELUM upload.
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, field: UploadField) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(`Ukuran file terlalu besar. Maksimal 10MB.`);
      return;
    }

    clearSelection(field);
    setSelectedFile(prev => ({ ...prev, [field]: file }));
    setPreviewUrl(prev => ({ ...prev, [field]: URL.createObjectURL(file) }));
  };

  // Upload file yang sudah dipilih & direview.
  const handleFileUpload = async (field: UploadField) => {
    const file = selectedFile[field];
    if (!file) return;

    setUploading(prev => ({ ...prev, [field]: true }));
    try {
      // === GOOGLE DRIVE LOGIC ===
      const fd = new FormData();
      fd.append("file", file);
      fd.append("santriName", initialData.namaLengkap || "Tanpa Nama");
      fd.append("documentName", documentNames[field]);

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
      clearSelection(field);
    } catch (e: any) {
      alert("Error upload file: " + e.message);
    } finally {
      setUploading(prev => ({ ...prev, [field]: false }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const anyUploading = Object.values(uploading).some(Boolean);
    if (anyUploading) {
      alert("Harap tunggu hingga proses unggah selesai.");
      return;
    }
    if (Object.values(selectedFile).some(Boolean)) {
      alert("Masih ada dokumen yang dipilih tapi belum diunggah. Silakan klik \"Unggah\" pada dokumen tersebut, atau ganti pilihannya.");
      return;
    }
    if (!formData.fileIjazah) {
      alert("Silakan upload scan ijazah.");
      return;
    }
    if (!formData.fileTranskrip) {
      alert("Silakan upload scan transkrip nilai.");
      return;
    }
    if (formData.riwayatAkademik === "LAINNYA" && !formData.riwayatAkademikLainnya) {
      alert("Silakan isi field Riwayat Akademik Lainnya.");
      return;
    }
    // Parse tahun to integer
    const finalData = {
      ...formData,
      tahunKelulusan: parseInt(formData.tahunKelulusan, 10),
    };
    onNext(finalData);
  };

  const renderUploadBox = (
    field: UploadField,
    label: string,
    required: boolean = true
  ) => {
    const pending = selectedFile[field];
    const pendingPreview = previewUrl[field];
    const pendingSize = pending
      ? (pending.size >= 1024 * 1024
        ? `${(pending.size / 1024 / 1024).toFixed(1)} MB`
        : `${(pending.size / 1024).toFixed(0)} KB`)
      : "";
    return (
    <div className="space-y-3 md:col-span-2 mt-4">
      <label className="text-sm font-medium text-text-secondary block">
        {label} {required && <span className="text-danger">*</span>}
        <span className="block font-normal text-xs mt-1">(Format PDF/JPG. Maksimal 10MB)</span>
      </label>
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
            <a href={formData[field]} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">Lihat dokumen</a>
            <button type="button" onClick={() => { setFormData(f => ({...f, [field]: ""})); onDataChange?.({ [field]: "" }); }} className="text-xs text-danger underline mt-2">Hapus & Ganti</button>
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
            <div className="flex gap-2 mt-1">
              <button type="button" onClick={() => handleFileUpload(field)} disabled={uploading[field]} className="px-4 py-1.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-light disabled:opacity-50">
                {uploading[field] ? "Sedang Mengunggah..." : "Unggah"}
              </button>
              <button type="button" onClick={() => clearSelection(field)} className="px-4 py-1.5 text-sm text-danger underline">Ganti</button>
            </div>
            <span className="text-xs text-text-secondary">Periksa dulu dokumennya sebelum diunggah.</span>
          </div>
        ) : (
          <label className="cursor-pointer flex flex-col items-center">
            <UploadCloud size={32} className="text-primary-light mb-2" />
            <span className="text-sm font-medium">Klik untuk pilih file</span>
            <input
              type="file"
              accept=".pdf,image/jpeg,image/jpg"
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
      <h2 className="text-2xl font-heading font-bold text-text-primary mb-6">3. Riwayat Akademik</h2>
      
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium text-text-secondary">Riwayat Pendidikan Terakhir <span className="text-danger">*</span></label>
          <select 
            required
            name="riwayatAkademik"
            value={formData.riwayatAkademik}
            onChange={handleChange}
            className="w-full px-4 py-2.5 rounded-lg border border-primary-light/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-white"
          >
            <option value="">Pilih Riwayat Pendidikan</option>
            <option value="MA">MA (Madrasah Aliyah)</option>
            <option value="IJAZAH_PESANTREN">Ijazah Pesantren</option>
            <option value="SMA">SMA</option>
            <option value="PAKET_C">Paket C</option>
            <option value="LAINNYA">Lainnya...</option>
          </select>
        </div>

        {formData.riwayatAkademik === "LAINNYA" && (
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-text-secondary">Sebutkan Pendidikan Lainnya <span className="text-danger">*</span></label>
            <input 
              required
              type="text" 
              name="riwayatAkademikLainnya"
              value={formData.riwayatAkademikLainnya}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-lg border border-primary-light/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              placeholder="Contoh: D3 Bahasa Arab"
            />
          </div>
        )}

        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium text-text-secondary">Tahun Kelulusan <span className="text-danger">*</span></label>
          <select 
            required
            name="tahunKelulusan"
            value={formData.tahunKelulusan}
            onChange={handleChange}
            className="w-full px-4 py-2.5 rounded-lg border border-primary-light/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-white md:w-1/2"
          >
            <option value="">Pilih Tahun</option>
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {renderUploadBox('fileIjazah', 'Scan Ijazah Asli')}
        {renderUploadBox('fileTranskrip', 'Scan Transkrip Nilai')}
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
          Lanjut ke Konfirmasi &rarr;
        </button>
      </div>
    </form>
  );
}
