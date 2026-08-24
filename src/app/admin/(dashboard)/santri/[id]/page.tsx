import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, User, FileText, GraduationCap, Globe, CheckCircle2 } from "lucide-react";
import DocumentViewer from "@/components/admin/DocumentViewer";
import DeleteSantriButton from "@/components/admin/DeleteSantriButton";
import EditSantriModal from "@/components/admin/EditSantriModal";
import { redirect } from "next/navigation";

export default async function AdminSantriDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const santri = await prisma.santri.findUnique({
    where: { id: resolvedParams.id },
    include: {
      gelombang: { include: { periode: true } }
    }
  });

  if (!santri) {
    redirect("/admin/santri");
  }

  const DataGroup = ({ title, icon, children }: any) => (
    <div className="bg-white rounded-2xl border border-primary-light/20 shadow-sm overflow-hidden mb-6">
      <div className="bg-bg-cream border-b border-primary-light/20 px-6 py-4 flex items-center gap-3">
        <div className="text-primary">{icon}</div>
        <h3 className="font-heading font-bold text-text-primary text-lg">{title}</h3>
      </div>
      <div className="p-6">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
          {children}
        </dl>
      </div>
    </div>
  );

  const DataItem = ({ label, value, isFile = false }: any) => (
    <div className="sm:col-span-1">
      <dt className="text-sm font-medium text-text-secondary">{label}</dt>
      <dd className="mt-1 text-sm text-text-primary font-semibold">
        {isFile && value ? (
          <DocumentViewer url={value} label={label} />
        ) : (
          value || <span className="text-text-secondary/50 italic">Kosong</span>
        )}
      </dd>
    </div>
  );

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-start gap-4">
          <Link href="/admin/santri" className="p-2 border border-primary-light/40 rounded-lg bg-white text-text-primary hover:bg-bg-cream transition-colors mt-1">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-heading font-bold text-text-primary flex items-center gap-3">
              Detail Santri
              {santri.nis ? (
                <span className="px-3 py-1 bg-success/10 text-success text-sm font-bold rounded-full font-mono">
                  NIS: {santri.nis}
                </span>
              ) : (
                <span className="px-3 py-1 bg-warning/10 text-warning text-sm font-bold rounded-full">
                  Menunggu Lunas Tahap 1
                </span>
              )}
            </h1>
            <p className="text-text-secondary mt-1">Nomor Pendaftaran: {santri.noPendaftaran}</p>
          </div>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <EditSantriModal santri={santri} />
          <DeleteSantriButton santriId={santri.id} namaLengkap={santri.namaLengkap} />
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 pt-4">
        <div className="md:col-span-2 space-y-6">
          <DataGroup title="1. Data Pribadi" icon={<User size={20} />}>
            <DataItem label="Nama Lengkap" value={santri.namaLengkap} />
            <DataItem label="Nama Arab" value={santri.namaArab} />
            <DataItem label="Asal Provinsi" value={santri.asalProvinsi} />
            <DataItem label="Email" value={santri.email} />
            <DataItem label="Gender" value={santri.gender === 'LAKI_LAKI' ? 'Laki-laki' : 'Perempuan'} />
            <DataItem label="Nomor WA Santri" value={santri.noWaSantri} />
            <DataItem label="Nama Wali" value={santri.namaWali} />
            <DataItem label="Nomor WA Wali" value={santri.noWaWali} />
          </DataGroup>

          <DataGroup title="3. Riwayat Akademik" icon={<GraduationCap size={20} />}>
            <DataItem label="Pendidikan Terakhir" value={santri.riwayatAkademik === 'LAINNYA' ? santri.riwayatAkademikLainnya : santri.riwayatAkademik} />
            <DataItem label="Tahun Kelulusan" value={santri.tahunKelulusan} />
            <DataItem label="Scan Ijazah" value={santri.fileIjazah} isFile />
          </DataGroup>

          <DataGroup title="4. Paspor & Konfirmasi" icon={<Globe size={20} />}>
            <DataItem label="Nomor Paspor" value={santri.nomorPaspor} />
            <DataItem label="Tanggal Kadaluarsa" value={santri.tanggalKadaluarsaPaspor ? new Date(santri.tanggalKadaluarsaPaspor).toLocaleDateString() : null} />
            <DataItem label="File Paspor" value={santri.filePaspor} isFile />
            <div className="sm:col-span-2 mt-4">
              <dt className="text-sm font-medium text-text-secondary">Persetujuan Investasi</dt>
              <dd className="mt-1 flex items-center gap-2 text-sm text-text-primary font-semibold">
                <CheckCircle2 size={18} className={santri.setujuInvestasi ? "text-success" : "text-danger"} />
                {santri.setujuInvestasi ? "Telah Disetujui" : "Belum Disetujui"}
              </dd>
            </div>
          </DataGroup>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-primary-light/20 shadow-sm overflow-hidden p-6 text-center">
            {santri.filePasFoto && (
              <div className="w-32 h-40 bg-gray-100 rounded-lg border border-primary-light/30 mx-auto mb-4 overflow-hidden shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={santri.filePasFoto} alt="Pas Foto" className="w-full h-full object-cover" />
              </div>
            )}
            <h3 className="font-bold text-lg text-text-primary">{santri.namaLengkap}</h3>
            <p className="text-sm font-medium text-text-secondary mt-1">{santri.gelombang.periode.nama} - {santri.gelombang.nama}</p>
          </div>

          <DataGroup title="2. Dokumen Pribadi" icon={<FileText size={20} />}>
            <DataItem label="Scan Akte Kelahiran" value={santri.fileAkteLahir} isFile />
            <DataItem label="Pas Foto" value={santri.filePasFoto} isFile />
          </DataGroup>
        </div>
      </div>
    </div>
  );
}
