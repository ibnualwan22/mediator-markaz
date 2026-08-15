import { useState } from "react";
import { UploadCloud, AlertCircle } from "lucide-react";

export default function Step4Paspor({ 
  initialData, 
  onSubmit,
  onBack,
  isSubmitting
}: { 
  initialData: any, 
  onSubmit: (data: any) => void,
  onBack: (data: any) => void,
  isSubmitting: boolean
}) {
  const [formData, setFormData] = useState({
    nomorPaspor: initialData.nomorPaspor || "",
    tanggalKadaluarsaPaspor: initialData.tanggalKadaluarsaPaspor || "",
    filePaspor: initialData.filePaspor || "",
    setujuInvestasi: initialData.setujuInvestasi || false,
  });

  const [isUploading, setIsUploading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
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
        filePaspor: reader.result as string 
      }));
      setIsUploading(false);
    };
    reader.onerror = () => {
      alert("Gagal memuat file");
      setIsUploading(false);
    }
    reader.readAsDataURL(file);
  };

  const hasPassport = formData.nomorPaspor.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasPassport && (!formData.tanggalKadaluarsaPaspor || !formData.filePaspor)) {
      alert("Karena Anda mengisi Nomor Paspor, silakan lengkapi Tanggal Kadaluarsa dan Upload File Paspor.");
      return;
    }
    
    // Parse date if exists
    const finalData = {
      ...formData,
      tanggalKadaluarsaPaspor: hasPassport && formData.tanggalKadaluarsaPaspor 
        ? new Date(formData.tanggalKadaluarsaPaspor).toISOString() 
        : null
    };

    onSubmit(finalData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-2xl font-heading font-bold text-text-primary mb-6">4. Paspor & Konfirmasi</h2>
      
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium text-text-secondary block">
            Nomor Paspor 
            <span className="block font-normal text-xs mt-1 text-text-secondary/70">(Kosongkan jika belum memiliki paspor)</span>
          </label>
          <input 
            type="text" 
            name="nomorPaspor"
            value={formData.nomorPaspor}
            onChange={handleChange}
            className="w-full px-4 py-2.5 rounded-lg border border-primary-light/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            placeholder="Contoh: A1234567"
          />
        </div>

        {hasPassport && (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary">Tanggal Kadaluarsa Paspor <span className="text-danger">*</span></label>
              <input 
                required={hasPassport}
                type="date" 
                name="tanggalKadaluarsaPaspor"
                value={formData.tanggalKadaluarsaPaspor}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-primary-light/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
            </div>

            <div className="space-y-3 md:col-span-2 mt-2">
              <label className="text-sm font-medium text-text-secondary block">
                File Paspor <span className="text-danger">*</span>
                <span className="block font-normal text-xs mt-1">(Format PDF/JPG. Maksimal 5MB)</span>
              </label>
              <div className="border-2 border-dashed border-primary-light/50 rounded-xl p-6 text-center hover:bg-primary-bg transition-colors">
                {formData.filePaspor ? (
                  <div className="flex flex-col items-center gap-2">
                    {formData.filePaspor.startsWith("data:image") ? (
                      <div className="w-24 h-32 bg-gray-100 rounded-lg overflow-hidden border border-primary-light/30 shadow-sm relative">
                         {/* eslint-disable-next-line @next/next/no-img-element */}
                         <img src={formData.filePaspor} alt="Preview Paspor" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-24 h-32 bg-gray-100 rounded-lg border border-primary-light/30 shadow-sm flex items-center justify-center text-text-secondary">
                        <span className="text-xs font-bold uppercase">Dokumen</span>
                      </div>
                    )}
                    <span className="text-success font-medium">✅ File berhasil diunggah</span>
                    <span className="text-xs text-text-secondary overflow-hidden text-ellipsis w-full max-w-xs">{formData.filePaspor}</span>
                    <button type="button" onClick={() => setFormData(f => ({...f, filePaspor: ""}))} className="text-xs text-danger underline mt-2">Hapus & Ganti</button>
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
          </>
        )}
      </div>

      <div className="mt-8 bg-warning/10 border border-warning/30 rounded-xl p-6">
        <div className="flex gap-4 items-start mb-4">
          <AlertCircle className="text-warning flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-bold text-text-primary mb-2">Keterangan Investasi Pendidikan</h3>
            <ul className="list-disc pl-5 space-y-2 text-sm text-text-secondary">
              <li>Investasi dana untuk fiksasi pendaftaran adalah senilai <strong>Rp. 1.000.000</strong> terlebih dahulu untuk booking kuota peserta.</li>
              <li>Investasi tersebut <strong>tidak bisa di-refund</strong> dengan alasan apapun.</li>
              <li>Kuota sangat terbatas. Pendaftaran ditutup jika kuota telah habis.</li>
              <li>Biaya pendaftaran ditransfer ke rekening resmi:<br/>
                <strong className="text-primary text-base inline-block mt-1">BRI 055501049030500 a.n. Markaz Arabiyah</strong>
              </li>
            </ul>
          </div>
        </div>

        <label className="flex items-start gap-3 mt-6 cursor-pointer p-4 bg-white/60 rounded-lg border border-warning/20">
          <input 
            type="checkbox" 
            required
            name="setujuInvestasi"
            checked={formData.setujuInvestasi}
            onChange={handleChange}
            className="mt-1 w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
          />
          <span className="text-sm font-medium text-text-primary">
            Saya telah membaca, memahami, dan menyetujui ketentuan pembayaran investasi pendidikan di atas.
          </span>
        </label>
      </div>

      <div className="flex justify-between pt-6 border-t border-primary-light/20">
        <button 
          type="button" 
          onClick={() => onBack(formData)}
          className="px-6 py-2.5 text-text-secondary font-medium hover:text-primary transition-colors"
          disabled={isSubmitting}
        >
          &larr; Kembali
        </button>
        <button 
          type="submit" 
          disabled={isSubmitting}
          className="px-8 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary-light transition-all shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Memproses..." : "Selesaikan Pendaftaran \u2714"}
        </button>
      </div>
    </form>
  );
}
