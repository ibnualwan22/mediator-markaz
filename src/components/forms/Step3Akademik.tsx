import { useState, useMemo } from "react";
import { UploadCloud } from "lucide-react";

export default function Step3Akademik({ 
  initialData, 
  onNext,
  onBack
}: { 
  initialData: any, 
  onNext: (data: any) => void,
  onBack: (data: any) => void
}) {
  const [formData, setFormData] = useState({
    riwayatAkademik: initialData.riwayatAkademik || "",
    riwayatAkademikLainnya: initialData.riwayatAkademikLainnya || "",
    tahunKelulusan: initialData.tahunKelulusan || "",
    fileIjazah: initialData.fileIjazah || "",
  });

  const [isUploading, setIsUploading] = useState(false);

  // Kalkulasi tahun kelulusan dinamis (CurrentYear - 2 s/d CurrentYear + 1)
  // Berdasarkan spec: dibuka 2026, opsi 2024-2027
  const years = useMemo(() => {
    // Ideally this comes from Periode.tahunDibuka fetched from backend
    // For now we assume the current year or explicit 2026 if it's currently 2026
    const baseYear = 2026; 
    return [baseYear - 2, baseYear - 1, baseYear, baseYear + 1];
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Ukuran file terlalu besar. Maksimal 5MB.");
      return;
    }

    setIsUploading(true);
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      setFormData(prev => ({ 
        ...prev, 
        fileIjazah: reader.result as string 
      }));
      setIsUploading(false);
    };
    reader.onerror = () => {
      alert("Gagal memuat file");
      setIsUploading(false);
    }
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fileIjazah) {
      alert("Silakan upload scan ijazah.");
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
            <optgroup label="Kelompok A (Biaya Tahap 3: Rp 3.850.000)">
              <option value="MA">MA (Madrasah Aliyah)</option>
              <option value="IJAZAH_PESANTREN">Ijazah Pesantren</option>
            </optgroup>
            <optgroup label="Kelompok B (Biaya Tahap 3: Rp 4.850.000)">
              <option value="SMA">SMA</option>
              <option value="SMK">SMK</option>
              <option value="PAKET_C">Paket C</option>
              <option value="LAINNYA">Lainnya...</option>
            </optgroup>
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

        <div className="space-y-3 md:col-span-2 mt-4">
          <label className="text-sm font-medium text-text-secondary block">
            Scan Ijazah <span className="text-danger">*</span>
            <span className="block font-normal text-xs mt-1">(Format PDF/JPG. Maksimal 5MB)</span>
          </label>
          <div className="border-2 border-dashed border-primary-light/50 rounded-xl p-6 text-center hover:bg-primary-bg transition-colors">
            {formData.fileIjazah ? (
              <div className="flex flex-col items-center gap-2">
                {formData.fileIjazah.startsWith("data:image") ? (
                  <div className="w-24 h-32 bg-gray-100 rounded-lg overflow-hidden border border-primary-light/30 shadow-sm relative">
                     {/* eslint-disable-next-line @next/next/no-img-element */}
                     <img src={formData.fileIjazah} alt="Preview Ijazah" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-24 h-32 bg-gray-100 rounded-lg border border-primary-light/30 shadow-sm flex items-center justify-center text-text-secondary">
                    <span className="text-xs font-bold uppercase">Dokumen</span>
                  </div>
                )}
                <span className="text-success font-medium">✅ File berhasil diunggah</span>
                <span className="text-xs text-text-secondary overflow-hidden text-ellipsis w-full max-w-xs">{formData.fileIjazah}</span>
                <button type="button" onClick={() => setFormData(f => ({...f, fileIjazah: ""}))} className="text-xs text-danger underline mt-2">Hapus & Ganti</button>
              </div>
            ) : (
              <label className="cursor-pointer flex flex-col items-center">
                <UploadCloud size={32} className="text-primary-light mb-2" />
                <span className="text-sm font-medium">{isUploading ? "Sedang Mengunggah..." : "Klik untuk pilih file"}</span>
                <input 
                  type="file" 
                  accept=".pdf,image/jpeg,image/jpg" 
                  className="hidden" 
                  onChange={handleFileUpload}
                  disabled={isUploading}
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
          Lanjut ke Konfirmasi &rarr;
        </button>
      </div>
    </form>
  );
}
