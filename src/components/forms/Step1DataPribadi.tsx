import { useState } from "react";

const PROVINSI_INDONESIA = [
  "Aceh", "Sumatera Utara", "Sumatera Barat", "Riau", "Jambi", "Sumatera Selatan", "Bengkulu", "Lampung", "Kepulauan Bangka Belitung", "Kepulauan Riau",
  "DKI Jakarta", "Jawa Barat", "Jawa Tengah", "DI Yogyakarta", "Jawa Timur", "Banten", "Bali", "Nusa Tenggara Barat", "Nusa Tenggara Timur",
  "Kalimantan Barat", "Kalimantan Tengah", "Kalimantan Selatan", "Kalimantan Timur", "Kalimantan Utara",
  "Sulawesi Utara", "Sulawesi Tengah", "Sulawesi Selatan", "Sulawesi Tenggara", "Gorontalo", "Sulawesi Barat",
  "Maluku", "Maluku Utara", "Papua", "Papua Barat", "Papua Selatan", "Papua Tengah", "Papua Pegunungan", "Papua Barat Daya"
];

export default function Step1DataPribadi({ initialData, activeGelombangs = [], onNext }: { initialData: any, activeGelombangs?: any[], onNext: (data: any) => void }) {
  const [formData, setFormData] = useState({
    namaLengkap: initialData.namaLengkap || "",
    namaArab: initialData.namaArab || "",
    tempatLahir: initialData.tempatLahir || "",
    tanggalLahir: initialData.tanggalLahir || "",
    asalProvinsi: initialData.asalProvinsi || "",
    noWaSantri: initialData.noWaSantri || "",
    gender: initialData.gender || "",
    email: initialData.email || "",
    namaWali: initialData.namaWali || "",
    noWaWali: initialData.noWaWali || "",
    gelombangId: initialData.gelombangId || "",
    punyaPaspor: initialData.punyaPaspor || false,
    nomorPaspor: initialData.nomorPaspor || "",
    kantorPenerbitPaspor: initialData.kantorPenerbitPaspor || "",
    tanggalPembuatanPaspor: initialData.tanggalPembuatanPaspor || "",
    tanggalKadaluarsaPaspor: initialData.tanggalKadaluarsaPaspor || "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  // Normalisasi nomor WA ke format 628xxx (untuk otomatisasi)
  const normalizePhone = (phone: string): string => {
    const digits = phone.replace(/\D/g, "");
    if (digits.startsWith("08")) return "62" + digits.slice(1);
    if (digits.startsWith("8")) return "62" + digits;
    return digits;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext({
      ...formData,
      noWaSantri: normalizePhone(formData.noWaSantri),
      noWaWali: normalizePhone(formData.noWaWali),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-2xl font-heading font-bold text-text-primary mb-6">1. Data Pribadi</h2>
      
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium text-text-secondary">Pilih Gelombang Pendaftaran <span className="text-danger">*</span></label>
          <select 
            required
            name="gelombangId"
            value={formData.gelombangId}
            onChange={handleChange}
            className="w-full px-4 py-2.5 rounded-lg border border-primary-light/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-white font-medium text-primary"
          >
            <option value="">-- Pilih Gelombang yang Tersedia --</option>
            {activeGelombangs.map((g: any) => (
              <option key={g.id} value={g.id}>
                {g.periode.nama} - {g.nama}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-text-secondary">Nama Lengkap (Indonesia) <span className="text-danger">*</span></label>
          <input 
            required
            type="text" 
            name="namaLengkap"
            value={formData.namaLengkap}
            onChange={handleChange}
            className="w-full px-4 py-2.5 rounded-lg border border-primary-light/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            placeholder="Sesuai KTP/Akte"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-text-secondary">Nama Arab <span className="text-danger">*</span></label>
          <input 
            required
            type="text" 
            name="namaArab"
            dir="rtl"
            value={formData.namaArab}
            onChange={handleChange}
            className="w-full px-4 py-2.5 rounded-lg border border-primary-light/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none font-arabic text-lg"
            placeholder="الاسم باللغة العربية"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-text-secondary">Tempat Lahir <span className="text-danger">*</span></label>
          <input 
            required
            type="text" 
            name="tempatLahir"
            value={formData.tempatLahir}
            onChange={handleChange}
            className="w-full px-4 py-2.5 rounded-lg border border-primary-light/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            placeholder="Kota tempat lahir"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-text-secondary">Tanggal Lahir <span className="text-danger">*</span></label>
          <input 
            required
            type="date" 
            name="tanggalLahir"
            value={formData.tanggalLahir}
            onChange={handleChange}
            className="w-full px-4 py-2.5 rounded-lg border border-primary-light/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-white"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-text-secondary">Asal Provinsi <span className="text-danger">*</span></label>
          <select 
            required
            name="asalProvinsi"
            value={formData.asalProvinsi}
            onChange={handleChange}
            className="w-full px-4 py-2.5 rounded-lg border border-primary-light/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-white"
          >
            <option value="">Pilih Provinsi</option>
            {PROVINSI_INDONESIA.map(prov => (
              <option key={prov} value={prov}>{prov}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-text-secondary">Gender <span className="text-danger">*</span></label>
          <select 
            required
            name="gender"
            value={formData.gender}
            onChange={handleChange}
            className="w-full px-4 py-2.5 rounded-lg border border-primary-light/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-white"
          >
            <option value="">Pilih Gender</option>
            <option value="LAKI_LAKI">Laki-laki</option>
            <option value="PEREMPUAN">Perempuan</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-text-secondary">Nomor WhatsApp Santri <span className="text-danger">*</span></label>
          <input 
            required
            type="tel" 
            name="noWaSantri"
            value={formData.noWaSantri}
            onChange={handleChange}
            pattern="[0-9+\- ]{9,20}"
            className="w-full px-4 py-2.5 rounded-lg border border-primary-light/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            placeholder="Contoh: 08123456789"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-text-secondary">Alamat Email <span className="text-danger">*</span></label>
          <input 
            required
            type="email" 
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-4 py-2.5 rounded-lg border border-primary-light/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            placeholder="contoh@ahlan.com"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-text-secondary">Nama Wali <span className="text-danger">*</span></label>
          <input 
            required
            type="text" 
            name="namaWali"
            value={formData.namaWali}
            onChange={handleChange}
            className="w-full px-4 py-2.5 rounded-lg border border-primary-light/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            placeholder="Nama Ayah/Ibu/Wali"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-text-secondary">Nomor WhatsApp Wali <span className="text-danger">*</span></label>
          <input 
            required
            type="tel" 
            name="noWaWali"
            value={formData.noWaWali}
            onChange={handleChange}
            pattern="[0-9+\- ]{9,20}"
            className="w-full px-4 py-2.5 rounded-lg border border-primary-light/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            placeholder="Contoh: 08123456789"
          />
        </div>
      </div>

      {/* Data Paspor (opsional) */}
      <div className="pt-4 border-t border-primary-light/20">
        <h3 className="text-lg font-heading font-bold text-text-primary mb-4">Data Paspor</h3>
        <label className="flex items-center gap-3 cursor-pointer p-4 bg-white/60 rounded-lg border border-primary-light/20 mb-4">
          <input
            type="checkbox"
            name="punyaPaspor"
            checked={!!formData.punyaPaspor}
            onChange={handleChange}
            className="w-5 h-5 accent-primary"
          />
          <span className="text-sm font-medium text-text-primary">Saya sudah memiliki paspor</span>
        </label>

        {formData.punyaPaspor && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">Nomor Paspor <span className="text-danger">*</span></label>
            <input 
              required={!!formData.punyaPaspor}
              type="text" 
              name="nomorPaspor"
              value={formData.nomorPaspor}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-lg border border-primary-light/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              placeholder="Contoh: X1234567"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">Kantor yang Mengeluarkan Paspor <span className="text-danger">*</span></label>
            <input 
              required={!!formData.punyaPaspor}
              type="text" 
              name="kantorPenerbitPaspor"
              value={formData.kantorPenerbitPaspor}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-lg border border-primary-light/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              placeholder="Contoh: Kanim Jakarta Selatan"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">Tanggal Terbit Paspor <span className="text-danger">*</span></label>
            <input 
              required={!!formData.punyaPaspor}
              type="date" 
              name="tanggalPembuatanPaspor"
              value={formData.tanggalPembuatanPaspor}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-lg border border-primary-light/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-white"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">Tanggal Expired Paspor <span className="text-danger">*</span></label>
            <input 
              required={!!formData.punyaPaspor}
              type="date" 
              name="tanggalKadaluarsaPaspor"
              value={formData.tanggalKadaluarsaPaspor}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-lg border border-primary-light/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-white"
            />
          </div>
        </div>
        )}
      </div>

      <div className="flex justify-end pt-4">
        <button 
          type="submit" 
          className="px-6 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary-light transition-colors"
        >
          Lanjut ke Dokumen &rarr;
        </button>
      </div>
    </form>
  );
}
