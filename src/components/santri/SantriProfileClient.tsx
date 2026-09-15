"use client";

import { useState, useRef } from "react";
import { User, GraduationCap, Globe, CheckCircle2, Shield, MapPin, Phone, Mail, Calendar, Hash, Edit2, X, Save, Camera, Loader2, UploadCloud, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
const DataGroup = ({ title, icon, children }: any) => (
  <div className="bg-white rounded-2xl border border-primary-light/20 shadow-sm overflow-hidden mb-6">
    <div className="bg-bg-cream border-b border-primary-light/20 px-6 py-4 flex items-center gap-3">
      <div className="text-primary">{icon}</div>
      <h3 className="font-heading font-bold text-text-primary text-lg">{title}</h3>
    </div>
    <div className="p-6">
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-6">
        {children}
      </dl>
    </div>
  </div>
);

const DataItem = ({ label, field, icon, value, isEditing, formData, setFormData }: { label: string; field?: keyof any; icon?: React.ReactNode; value?: any; isEditing?: boolean; formData?: any; setFormData?: any }) => {
  const isArabic = field === 'namaArab';
  return (
    <div className="sm:col-span-1">
      <dt className="text-xs font-medium text-text-secondary uppercase tracking-wider flex items-center gap-1.5 mb-2">
        {icon}
        {label}
      </dt>
      <dd className="text-sm text-text-primary font-semibold">
        {isEditing && field && formData && setFormData ? (
          <input
            type="text"
            className={`w-full px-3 py-2.5 border border-primary-light/30 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-normal ${isArabic ? 'font-arabic text-xl text-right' : ''}`}
            dir={isArabic ? 'rtl' : 'ltr'}
            value={formData[field] as string}
            onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
            placeholder={`Masukkan ${label}`}
          />
        ) : (
          value || <span className="text-text-secondary/40 italic font-normal">Belum diisi</span>
        )}
      </dd>
    </div>
  )
};

export default function SantriProfileClient({ santriData }: { santriData: any }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [formData, setFormData] = useState({
    namaLengkap: santriData.namaLengkap || "",
    namaArab: santriData.namaArab || "",
    email: santriData.email || "",
    noWaSantri: santriData.noWaSantri || "",
    asalProvinsi: santriData.asalProvinsi || "",
    namaWali: santriData.namaWali || "",
    noWaWali: santriData.noWaWali || "",
    riwayatAkademik: santriData.riwayatAkademik || "SMA",
    riwayatAkademikLainnya: santriData.riwayatAkademikLainnya || "",
    tahunKelulusan: santriData.tahunKelulusan || new Date().getFullYear(),
    jurusan: santriData.jurusan || "",
    nomorPaspor: santriData.nomorPaspor || "",
    tanggalPembuatanPaspor: santriData.tanggalPembuatanPaspor ? new Date(santriData.tanggalPembuatanPaspor).toISOString().split('T')[0] : "",
    tanggalKadaluarsaPaspor: santriData.tanggalKadaluarsaPaspor ? new Date(santriData.tanggalKadaluarsaPaspor).toISOString().split('T')[0] : "",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/santri/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (res.ok) {
        Swal.fire({
          title: "Berhasil!",
          text: "Profil Anda telah diperbarui.",
          icon: "success",
          confirmButtonColor: "#1d4ed8",
        });
        setIsEditing(false);
        router.refresh(); // refresh the server component data
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      Swal.fire({
        title: "Gagal",
        text: err.message || "Gagal memperbarui profil.",
        icon: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      Swal.fire("Gagal", "File foto profil harus berupa gambar, bukan dokumen/PDF.", "error");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      Swal.fire("Gagal", "Ukuran foto maksimal 5MB.", "error");
      return;
    }

    setIsUploadingPhoto(true);
    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("/api/santri/profile/photo", {
        method: "POST",
        body: fd,
      });

      if (res.ok) {
        router.refresh();
        Swal.fire({
          title: "Berhasil",
          text: "Foto profil berhasil diubah.",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        const error = await res.json();
        throw new Error(error.error);
      }
    } catch (err: any) {
      Swal.fire("Gagal", err.message || "Gagal mengupload foto", "error");
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };


  return (
    <div className="space-y-6 pb-20 max-w-4xl">
      {/* Action Bar */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-primary-light/20 shadow-sm">
        <div>
          <h2 className="font-heading font-bold text-xl text-text-primary">Profil Camaba</h2>
          <p className="text-text-secondary text-sm">Lengkapi data diri Anda dengan benar</p>
        </div>
        <div>
          {isEditing ? (
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-lg bg-bg-cream text-text-secondary font-medium hover:bg-gray-200 transition-colors flex items-center gap-2"
                disabled={isSaving}
              >
                <X size={16} /> Batal
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary-light transition-colors flex items-center gap-2"
                disabled={isSaving}
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Simpan Profil
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 rounded-lg bg-bg-cream text-primary font-medium hover:bg-primary-light hover:text-white border border-primary/20 transition-all flex items-center gap-2"
            >
              <Edit2 size={16} /> Edit Data Pribadi
            </button>
          )}
        </div>
      </div>

      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-primary-light/20 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-primary/5 via-primary-light/5 to-transparent p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Photo */}
            <div
              className="relative group cursor-pointer"
              onClick={() => {
                if (!isUploadingPhoto) fileInputRef.current?.click();
              }}
            >
              {santriData.fotoProfil && santriData.fotoProfil !== "-" ? (
                <div className="w-24 h-28 sm:w-28 sm:h-32 rounded-2xl border-2 border-primary-light/30 overflow-hidden shadow-lg relative bg-bg-cream">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/santri/profile/photo/image?v=${encodeURIComponent(String(santriData.fotoProfil).slice(-15))}`} alt="Foto Profil" className="w-full h-full object-cover" />

                  {isUploadingPhoto && (
                    <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                      <Loader2 className="animate-spin text-primary w-8 h-8" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-24 h-28 sm:w-28 sm:h-32 rounded-2xl border-2 border-primary-light/30 bg-bg-cream flex items-center justify-center shadow-lg relative">
                  {isUploadingPhoto ? (
                    <Loader2 className="animate-spin text-primary w-8 h-8" />
                  ) : (
                    <User size={40} className="text-primary-light/50" />
                  )}
                </div>
              )}

              {/* Permanent Edit Icon */}
              <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm border border-primary-light/30 text-primary shadow-sm w-7 h-7 rounded-full flex justify-center items-center z-10 transition-transform group-hover:scale-110">
                <Edit2 size={13} />
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handlePhotoUpload}
                accept="image/*"
                className="hidden"
              />

              {santriData.isVerified && (
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-success rounded-full flex items-center justify-center shadow-md border-2 border-white z-0">
                  <Shield size={14} className="text-white" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 mt-2 sm:mt-0">
              <h1 className="text-2xl sm:text-3xl font-heading font-bold text-text-primary">{santriData.namaLengkap}</h1>
              {santriData.namaArab && santriData.namaArab !== "-" && (
                <p className="text-lg font-arabic text-primary-light mt-0.5" dir="rtl">{santriData.namaArab}</p>
              )}
              <div className="flex flex-wrap gap-2 mt-3">
                {santriData.nis && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-success/10 text-success text-sm font-bold rounded-full font-mono">
                    <Hash size={12} />
                    NIC: {santriData.nis}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full">
                  {santriData.gelombang.periode.nama}
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-light/15 text-primary-light text-sm font-medium rounded-full">
                  {santriData.gelombang.nama}
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-2 font-mono">No. Pendaftaran: {santriData.noPendaftaran}</p>
            </div>
          </div>
        </div>
      </div>

      <DataGroup title="Data Pribadi" icon={<User size={20} />}>
        <DataItem label="Nama Lengkap" field="namaLengkap" value={santriData.namaLengkap} isEditing={isEditing} formData={formData} setFormData={setFormData} />
        <DataItem label="Nama Arab" field="namaArab" value={santriData.namaArab !== "-" ? santriData.namaArab : null} isEditing={isEditing} formData={formData} setFormData={setFormData} />
        <DataItem label="Asal Provinsi" field="asalProvinsi" icon={<MapPin size={10} />} value={santriData.asalProvinsi !== "-" ? santriData.asalProvinsi : null} isEditing={isEditing} formData={formData} setFormData={setFormData} />
        <DataItem label="Email" field="email" icon={<Mail size={10} />} value={santriData.email !== "-" ? santriData.email : null} isEditing={isEditing} formData={formData} setFormData={setFormData} />
        <DataItem label="No. WA Santri" field="noWaSantri" icon={<Phone size={10} />} value={santriData.noWaSantri !== "-" ? santriData.noWaSantri : null} isEditing={isEditing} formData={formData} setFormData={setFormData} />
        <DataItem label="Nama Wali" field="namaWali" value={santriData.namaWali !== "-" ? santriData.namaWali : null} isEditing={isEditing} formData={formData} setFormData={setFormData} />
        <DataItem label="No. WA Wali" field="noWaWali" icon={<Phone size={10} />} value={santriData.noWaWali !== "-" ? santriData.noWaWali : null} isEditing={isEditing} formData={formData} setFormData={setFormData} />
        <DataItem label="Gender" value={santriData.gender === "LAKI_LAKI" ? "Laki-laki" : "Perempuan"} />
      </DataGroup>


      {/* Riwayat Akademik */}
      <DataGroup title="Riwayat Akademik" icon={<GraduationCap size={20} />}>
        <div className="sm:col-span-1">
          <dt className="text-xs font-medium text-text-secondary uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
            Pesan Jurusan / Program Studi
          </dt>
          <dd className="text-sm text-text-primary font-semibold">
            {isEditing ? (
              <select
                value={formData.jurusan}
                onChange={(e) => setFormData({ ...formData, jurusan: e.target.value })}
                className="w-full px-3 py-2 border border-primary-light/30 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-normal bg-white"
              >
                <option value="">Pilih Jurusan</option>
                <option value="LUGHAH">Lughah</option>
                <option value="SYARIAH">Syariah wal qonun</option>
                <option value="SYARIAH_ISLAMIYYAH">Syariah Islamiyyah</option>
                <option value="USHULUDDIN">Ushuluddin</option>
                <option value="DIRASAT">Dirosat Islamiyah</option>
                <option value="ULUM">Kulliyatul Ulum</option>
              </select>
            ) : (
              santriData.jurusan === "LUGHAH" ? "Lughah" :
                santriData.jurusan === "SYARIAH" ? "Syariah wal qonun" :
                  santriData.jurusan === "SYARIAH_ISLAMIYYAH" ? "Syariah Islamiyyah" :
                    santriData.jurusan === "USHULUDDIN" ? "Ushuluddin" :
                      santriData.jurusan === "DIRASAT" ? "Dirosat Islamiyah" :
                        santriData.jurusan === "ULUM" ? "Kulliyatul Ulum" :
                        <span className="text-text-secondary/40 italic font-normal">Belum diisi</span>
            )}
          </dd>
        </div>

        <div className="sm:col-span-1">
          <dt className="text-xs font-medium text-text-secondary uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
            Pendidikan Terakhir
          </dt>
          <dd className="text-sm text-text-primary font-semibold">
            {isEditing ? (
              <div className="space-y-2">
                <select
                  value={formData.riwayatAkademik}
                  onChange={(e) => setFormData({ ...formData, riwayatAkademik: e.target.value })}
                  className="w-full px-3 py-2 border border-primary-light/30 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-normal bg-white"
                >
                  <option value="MA">Madrasah Aliyah (MA)</option>
                  <option value="IJAZAH_PESANTREN">Ijazah Pesantren</option>
                  <option value="SMA">SMA</option>
                  <option value="SMK">SMK</option>
                  <option value="PAKET_C">Paket C</option>
                  <option value="LAINNYA">Lainnya</option>
                </select>
                {formData.riwayatAkademik === "LAINNYA" && (
                  <input
                    type="text"
                    value={formData.riwayatAkademikLainnya}
                    onChange={(e) => setFormData({ ...formData, riwayatAkademikLainnya: e.target.value })}
                    className="w-full px-3 py-2 border border-primary-light/30 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-normal"
                    placeholder="Sebutkan pendidikan terakhir"
                  />
                )}
              </div>
            ) : (
              santriData.riwayatAkademik === "LAINNYA" ? santriData.riwayatAkademikLainnya : santriData.riwayatAkademik
            )}
          </dd>
        </div>

        <div className="sm:col-span-1">
          <dt className="text-xs font-medium text-text-secondary uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
            <Calendar size={10} />
            Tahun Kelulusan
          </dt>
          <dd className="text-sm text-text-primary font-semibold">
            {isEditing ? (
              <input
                type="number"
                value={formData.tahunKelulusan}
                onChange={(e) => setFormData({ ...formData, tahunKelulusan: e.target.value })}
                className="w-full px-3 py-2 border border-primary-light/30 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-normal"
                placeholder="2024"
              />
            ) : (
              santriData.tahunKelulusan
            )}
          </dd>
        </div>
      </DataGroup>

      {/* Data Paspor */}
      <DataGroup title="Data Paspor" icon={<Globe size={20} />}>
        <div className="sm:col-span-1">
          <dt className="text-xs font-medium text-text-secondary uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
            Nomor Paspor
          </dt>
          <dd className="text-sm text-text-primary font-semibold font-mono">
            {isEditing ? (
              <input
                type="text"
                value={formData.nomorPaspor}
                onChange={(e) => setFormData({ ...formData, nomorPaspor: e.target.value })}
                className="w-full px-3 py-2 border border-primary-light/30 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-normal font-sans"
                placeholder="A1234567"
              />
            ) : (
              santriData.nomorPaspor || <span className="text-text-secondary/40 italic font-normal font-sans">Belum diisi</span>
            )}
          </dd>
        </div>
        <div className="sm:col-span-1"></div>

        <div className="sm:col-span-1">
          <dt className="text-xs font-medium text-text-secondary uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
            <Calendar size={10} />
            Tanggal Kadaluarsa
          </dt>
          <dd className="text-sm text-text-primary font-semibold">
            {isEditing ? (
              <input
                type="date"
                value={formData.tanggalKadaluarsaPaspor}
                onChange={(e) => setFormData({ ...formData, tanggalKadaluarsaPaspor: e.target.value })}
                className="w-full px-3 py-2 border border-primary-light/30 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-normal"
              />
            ) : (
              santriData.tanggalKadaluarsaPaspor ? new Date(santriData.tanggalKadaluarsaPaspor).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : "-"
            )}
          </dd>
        </div>
      </DataGroup>

      {/* Status Verifikasi */}
    </div>
  );
}
