import { useState } from "react";

const PROVINSI_INDONESIA = [
  "Aceh", "Sumatera Utara", "Sumatera Barat", "Riau", "Jambi", "Sumatera Selatan", "Bengkulu", "Lampung", "Kepulauan Bangka Belitung", "Kepulauan Riau",
  "DKI Jakarta", "Jawa Barat", "Jawa Tengah", "DI Yogyakarta", "Jawa Timur", "Banten", "Bali", "Nusa Tenggara Barat", "Nusa Tenggara Timur",
  "Kalimantan Barat", "Kalimantan Tengah", "Kalimantan Selatan", "Kalimantan Timur", "Kalimantan Utara",
  "Sulawesi Utara", "Sulawesi Tengah", "Sulawesi Selatan", "Sulawesi Tenggara", "Gorontalo", "Sulawesi Barat",
  "Maluku", "Maluku Utara", "Papua", "Papua Barat", "Papua Selatan", "Papua Tengah", "Papua Pegunungan", "Papua Barat Daya"
];

export default function Step1DataPribadi({ initialData, onNext }: { initialData: any, onNext: (data: any) => void }) {
  const [formData, setFormData] = useState({
    namaLengkap: initialData.namaLengkap || "",
    namaArab: initialData.namaArab || "",
    asalProvinsi: initialData.asalProvinsi || "",
    noWaSantri: initialData.noWaSantri || "",
    gender: initialData.gender || "",
    email: initialData.email || "",
    namaWali: initialData.namaWali || "",
    noWaWali: initialData.noWaWali || "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-2xl font-heading font-bold text-text-primary mb-6">1. Data Pribadi</h2>
      
      <div className="grid md:grid-cols-2 gap-6">
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
            pattern="^(08|\+628)[0-9]{8,12}$"
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
            pattern="^(08|\+628)[0-9]{8,12}$"
            className="w-full px-4 py-2.5 rounded-lg border border-primary-light/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            placeholder="Contoh: 08123456789"
          />
        </div>
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
