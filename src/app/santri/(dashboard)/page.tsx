import { getSantriWithSession } from "@/lib/santri-auth";
import { redirect } from "next/navigation";
import {
  User,
  FileText,
  GraduationCap,
  Globe,
  CheckCircle2,
  Shield,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Hash,
} from "lucide-react";

export default async function SantriProfilPage() {
  const santri = await getSantriWithSession();

  if (!santri) {
    redirect("/santri/login");
  }

  const DataGroup = ({ title, icon, children }: any) => (
    <div className="bg-white rounded-2xl border border-primary-light/20 shadow-sm overflow-hidden">
      <div className="bg-bg-cream border-b border-primary-light/20 px-6 py-4 flex items-center gap-3">
        <div className="text-primary">{icon}</div>
        <h3 className="font-heading font-bold text-text-primary text-lg">{title}</h3>
      </div>
      <div className="p-6">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
          {children}
        </dl>
      </div>
    </div>
  );

  const DataItem = ({ label, value, icon }: { label: string; value: any; icon?: React.ReactNode }) => (
    <div className="sm:col-span-1">
      <dt className="text-xs font-medium text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
        {icon}
        {label}
      </dt>
      <dd className="mt-1.5 text-sm text-text-primary font-semibold">
        {value || <span className="text-text-secondary/40 italic font-normal">Belum diisi</span>}
      </dd>
    </div>
  );

  return (
    <div className="space-y-6 pb-20 max-w-4xl">
      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-primary-light/20 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-primary/5 via-primary-light/5 to-transparent p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Photo */}
            <div className="relative">
              {santri.filePasFoto && santri.filePasFoto !== "-" ? (
                <div className="w-24 h-28 sm:w-28 sm:h-32 rounded-2xl border-2 border-primary-light/30 overflow-hidden shadow-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={santri.filePasFoto} alt="Pas Foto" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-24 h-28 sm:w-28 sm:h-32 rounded-2xl border-2 border-primary-light/30 bg-bg-cream flex items-center justify-center shadow-lg">
                  <User size={40} className="text-primary-light/50" />
                </div>
              )}
              {santri.isVerified && (
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-success rounded-full flex items-center justify-center shadow-md border-2 border-white">
                  <Shield size={14} className="text-white" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-heading font-bold text-text-primary">{santri.namaLengkap}</h1>
              {santri.namaArab && santri.namaArab !== "-" && (
                <p className="text-lg font-arabic text-primary-light mt-0.5" dir="rtl">{santri.namaArab}</p>
              )}
              <div className="flex flex-wrap gap-2 mt-3">
                {santri.nis && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-success/10 text-success text-sm font-bold rounded-full font-mono">
                    <Hash size={12} />
                    NIC: {santri.nis}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full">
                  {santri.gelombang.periode.nama}
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-light/15 text-primary-light text-sm font-medium rounded-full">
                  {santri.gelombang.nama}
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-2 font-mono">No. Pendaftaran: {santri.noPendaftaran}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Data Pribadi */}
      <DataGroup title="Data Pribadi" icon={<User size={20} />}>
        <DataItem label="Nama Lengkap" value={santri.namaLengkap} />
        <DataItem label="Nama Arab" value={santri.namaArab !== "-" ? santri.namaArab : null} />
        <DataItem label="Gender" value={santri.gender === "LAKI_LAKI" ? "Laki-laki" : "Perempuan"} />
        <DataItem label="Asal Provinsi" icon={<MapPin size={10} />} value={santri.asalProvinsi !== "-" ? santri.asalProvinsi : null} />
        <DataItem label="Email" icon={<Mail size={10} />} value={santri.email !== "-" ? santri.email : null} />
        <DataItem label="No. WA Santri" icon={<Phone size={10} />} value={santri.noWaSantri !== "-" ? santri.noWaSantri : null} />
        <DataItem label="Nama Wali" value={santri.namaWali !== "-" ? santri.namaWali : null} />
        <DataItem label="No. WA Wali" icon={<Phone size={10} />} value={santri.noWaWali !== "-" ? santri.noWaWali : null} />
      </DataGroup>

      {/* Riwayat Akademik */}
      <DataGroup title="Riwayat Akademik" icon={<GraduationCap size={20} />}>
        <DataItem
          label="Pendidikan Terakhir"
          value={santri.riwayatAkademik === "LAINNYA" ? santri.riwayatAkademikLainnya : santri.riwayatAkademik}
        />
        <DataItem label="Tahun Kelulusan" icon={<Calendar size={10} />} value={santri.tahunKelulusan} />
      </DataGroup>

      {/* Paspor */}
      <DataGroup title="Data Paspor" icon={<Globe size={20} />}>
        <DataItem label="Nomor Paspor" value={santri.nomorPaspor} />
        <DataItem
          label="Tanggal Kadaluarsa"
          icon={<Calendar size={10} />}
          value={
            santri.tanggalKadaluarsaPaspor
              ? new Date(santri.tanggalKadaluarsaPaspor).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              : null
          }
        />
      </DataGroup>

      {/* Status Verifikasi */}
      <div className="bg-white rounded-2xl border border-primary-light/20 shadow-sm overflow-hidden p-6">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${santri.isVerified ? "bg-success/10" : "bg-warning/10"}`}>
            <CheckCircle2 size={20} className={santri.isVerified ? "text-success" : "text-warning"} />
          </div>
          <div>
            <p className="font-semibold text-text-primary">
              Status: {santri.isVerified ? "Terverifikasi" : "Menunggu Verifikasi"}
            </p>
            <p className="text-xs text-text-secondary">
              {santri.isVerified
                ? "Akun Anda telah diverifikasi oleh admin"
                : "Akun Anda masih dalam proses verifikasi"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
