import { getSantriSession } from "@/lib/santri-auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { FolderCheck, CheckCircle2, AlertCircle, Download, FileText } from "lucide-react";
import CollapsibleCategory from "@/components/santri/CollapsibleCategory";
import PemberkasanUploadButton from "@/components/santri/PemberkasanUploadButton";
import DokumenFormUploadButton from "@/components/santri/DokumenFormUploadButton";

export default async function PemberkasanSantriPage() {
  const session = await getSantriSession();
  if (!session) redirect("/santri/login");

  const santri = await prisma.santri.findUnique({
    where: { id: session.santriId },
    include: {
      pemberkasan: true,
      gelombang: {
        include: {
          periode: true
        }
      }
    }
  });

  if (!santri) redirect("/santri/login");

  // ===== Bagian utama: dokumen dari form pendaftaran — otomatis terisi =====
  const dokumenPendaftaran = [
    { field: "fileAkteLahir", label: "Scan Akte Kelahiran", url: santri.fileAkteLahir },
    { field: "fileKK", label: "Scan Kartu Keluarga (KK)", url: santri.fileKK },
    { field: "fileKtp", label: "Scan/Foto KTP", url: santri.fileKtp },
    { field: "filePasFoto", label: "Pas Foto", url: santri.filePasFoto },
    { field: "fileIjazah", label: "Scan Ijazah Asli", url: santri.fileIjazah },
    { field: "fileTranskrip", label: "Scan Transkrip Nilai", url: santri.fileTranskrip },
    { field: "filePaspor", label: "Scan Paspor", url: santri.filePaspor },
  ];
  const dokTerkumpul = dokumenPendaftaran.filter(d => d.url).length;
  const dokPercent = Math.round((dokTerkumpul / dokumenPendaftaran.length) * 100);

  // ===== Bagian kondisional: item tambahan yang dibuat admin =====
  const items = await prisma.itemPemberkasan.findMany({
    where: { periodeId: santri.gelombang.periode.id, isActive: true },
    orderBy: [
      { kategori: 'asc' },
      { urutan: 'asc' }
    ]
  });

  const mappedItems = items.map(item => {
    const record = santri.pemberkasan.find(p => p.itemPemberkasanId === item.id);
    const sudahDikumpulkan = record?.sudahDikumpulkan ?? false;
    const catatan = record?.catatan ?? null;
    const fileUrl = record?.fileUrl ?? null;
    return { ...item, sudahDikumpulkan, catatan, fileUrl };
  });

  const tambahanTerkumpul = mappedItems.filter(i => i.sudahDikumpulkan).length;
  const tambahanPercent = items.length > 0 ? Math.round((tambahanTerkumpul / items.length) * 100) : 0;
  const tambahanLengkap = items.length > 0 && tambahanTerkumpul === items.length;

  const groupedItems = {
    INDONESIA: mappedItems.filter(i => i.kategori === 'INDONESIA'),
  };

  return (
    <div className="max-w-7xl space-y-6 pb-20">
      <div>
        <h1 className="text-3xl font-heading font-bold text-text-primary">Status Pemberkasan</h1>
        <p className="text-text-secondary mt-1">Dokumen pendaftaran terisi otomatis dari form. Berkas tambahan ditentukan oleh admin bila ada.</p>
      </div>

      {/* Summary Card */}
      <div className="bg-white rounded-2xl border border-primary-light/20 shadow-sm overflow-hidden p-6 sm:p-8 relative">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative z-10">
          <div className="flex flex-col">
            <span className="text-sm text-text-secondary font-medium mb-1 flex items-center gap-1.5">
              <FileText size={16} /> Dokumen Pendaftaran
            </span>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-bold text-primary">{dokTerkumpul}</span>
              <span className="text-text-secondary text-lg mb-1">/ {dokumenPendaftaran.length}</span>
            </div>
            <div className="mt-3 h-2.5 w-full bg-bg-cream rounded-full overflow-hidden border border-primary/10">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary-light rounded-full transition-all duration-1000"
                style={{ width: `${dokPercent}%` }}
              />
            </div>
          </div>

          {items.length > 0 && (
            <div className="flex flex-col">
              <span className="text-sm text-text-secondary font-medium mb-1 flex items-center gap-1.5">
                <FolderCheck size={16} /> Berkas Tambahan (Admin)
              </span>
              <div className="flex items-end gap-2">
                <span className={`text-4xl font-bold ${tambahanLengkap ? 'text-success' : 'text-primary'}`}>
                  {tambahanTerkumpul}
                </span>
                <span className="text-text-secondary text-lg mb-1">/ {items.length}</span>
                {tambahanLengkap && (
                  <span className="inline-flex items-center gap-1 mb-1.5 text-success text-sm font-bold bg-success/10 w-max px-2.5 py-1 rounded-full">
                    <CheckCircle2 size={14} /> Lengkap
                  </span>
                )}
              </div>
              <div className="mt-3 h-2.5 w-full bg-bg-cream rounded-full overflow-hidden border border-primary/10">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${tambahanLengkap ? 'bg-success' : 'bg-gradient-to-r from-primary to-primary-light'}`}
                  style={{ width: `${tambahanPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dokumen yang diupload saat pendaftaran — selalu tampil */}
      <CollapsibleCategory
        kategori="DOKUMEN PENDAFTARAN"
        isComplete={dokTerkumpul === dokumenPendaftaran.length}
        collected={dokTerkumpul}
        total={dokumenPendaftaran.length}
        defaultOpen={true}
      >
        <div className="grid grid-cols-1">
          {dokumenPendaftaran.map((doc) => (
            <div key={doc.field} className="p-4 sm:p-5 flex gap-4 hover:bg-bg-cream/50 transition-colors border-b border-primary-light/10">
              <div className="mt-0.5 relative shrink-0">
                <div className={`w-6 h-6 flex items-center justify-center rounded-full border-2 transition-colors ${
                  doc.url
                    ? 'bg-success border-success text-white'
                    : 'bg-bg-subtle border-text-secondary/30 text-transparent'
                }`}>
                  <CheckCircle2 size={14} className={doc.url ? 'opacity-100' : 'opacity-0'} />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-medium ${doc.url ? 'text-text-primary' : 'text-text-secondary'}`}>
                  {doc.label}
                </p>
                <div className="mt-2 flex gap-2 flex-wrap">
                  {doc.url && (
                    <>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 border border-blue-100 transition-colors"
                      >
                        Lihat Dokumen
                      </a>
                      <a
                        href={doc.url.replace('export=view', 'export=download')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-bg-cream text-text-secondary rounded-lg text-xs font-bold hover:bg-primary-light/20 border border-primary-light/20 transition-colors"
                      >
                        <Download size={14} /> Download
                      </a>
                    </>
                  )}
                  <DokumenFormUploadButton field={doc.field} label={doc.label} hasFile={!!doc.url} />
                </div>
              </div>
              <div className="shrink-0 text-xs font-medium uppercase tracking-wider">
                {doc.url ? (
                  <span className="text-success bg-success/10 px-2 py-1 rounded">Ada</span>
                ) : (
                  <span className="text-text-secondary bg-bg-cream px-2 py-1 rounded">Kosong</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CollapsibleCategory>

      {/* Berkas tambahan dari admin — hanya tampil bila ada */}
      {items.length > 0 && Object.entries(groupedItems).map(([kategori, kItems]) => {
        if (kItems.length === 0) return null;

        const kCount = kItems.length;
        const kCollected = kItems.filter(i => i.sudahDikumpulkan).length;
        const kComplete = kCount === kCollected;

        return (
          <CollapsibleCategory
            key={kategori}
            kategori={`BERKAS TAMBAHAN${kategori !== 'INDONESIA' ? ` — ${kategori}` : ''}`}
            isComplete={kComplete}
            collected={kCollected}
            total={kCount}
            defaultOpen={true}
          >
            <div className="grid grid-cols-1">
              {kItems.map((item) => (
                <div key={item.id} className={`p-4 sm:p-5 flex gap-4 hover:bg-bg-cream/50 transition-colors border-b border-primary-light/10`}>
                  <div className="mt-0.5 relative shrink-0">
                    <div className={`w-6 h-6 flex items-center justify-center rounded-full border-2 transition-colors ${
                      item.sudahDikumpulkan
                        ? 'bg-success border-success text-white'
                        : 'bg-bg-subtle border-text-secondary/30 text-transparent'
                    }`}>
                      <CheckCircle2 size={14} className={item.sudahDikumpulkan ? 'opacity-100' : 'opacity-0'} />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium ${item.sudahDikumpulkan ? 'text-text-primary' : 'text-text-secondary'}`}>
                      {item.nama}
                    </p>
                    {item.fileUrl && (
                      <div className="mt-2">
                        <a
                          href={item.fileUrl.replace('export=view', 'export=download')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 border border-blue-100 transition-colors"
                        >
                          <Download size={14} /> Download Dokumen
                        </a>
                      </div>
                    )}
                    {item.catatan && (
                      <div className="mt-2 bg-warning/10 border border-warning/30 rounded-lg p-3 text-sm flex gap-2 items-start">
                        <AlertCircle size={16} className="text-warning shrink-0 mt-0.5" />
                        <div className="text-text-primary">
                          <span className="font-bold text-warning text-xs uppercase tracking-wider block mb-0.5">Catatan Admin</span>
                          {item.catatan}
                        </div>
                      </div>
                    )}
                    {!item.sudahDikumpulkan && (
                      <div className="mt-2">
                        <PemberkasanUploadButton itemPemberkasanId={item.id} />
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 text-xs font-medium uppercase tracking-wider">
                    {item.sudahDikumpulkan ? (
                      <span className="text-success bg-success/10 px-2 py-1 rounded">Terkumpul</span>
                    ) : (
                      <span className="text-text-secondary bg-bg-cream px-2 py-1 rounded">Belum</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleCategory>
        );
      })}
    </div>
  );
}
