// Validasi upload berbasis ISI file (magic bytes), bukan klaim browser.
//
// file.type dan ekstensi nama file bisa dipalsukan/dikosongkan penyerang,
// jadi keduanya TIDAK dipercaya: tipe ditentukan dari header byte file,
// dan ekstensi nama file hasil upload diambil dari tipe yang terdeteksi.
// SVG/HTML/EXE dan format lain di luar allowlist tidak cocok dengan satu
// pun signature di bawah sehingga otomatis ditolak — termasuk SVG yang
// lolos dari cek `image/*` karena MIME-nya memang `image/svg+xml`.

export const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10MB

export type DetectedFileType = "jpeg" | "png" | "webp" | "pdf";

const SIGNATURES: {
  type: DetectedFileType;
  ext: string;
  match: (b: Buffer) => boolean;
}[] = [
  {
    type: "jpeg",
    ext: "jpg",
    match: (b) =>
      b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    type: "png",
    ext: "png",
    match: (b) =>
      b.length >= 8 &&
      b[0] === 0x89 &&
      b[1] === 0x50 &&
      b[2] === 0x4e &&
      b[3] === 0x47 &&
      b[4] === 0x0d &&
      b[5] === 0x0a &&
      b[6] === 0x1a &&
      b[7] === 0x0a,
  },
  {
    type: "webp",
    ext: "webp",
    match: (b) =>
      b.length >= 12 &&
      b.toString("ascii", 0, 4) === "RIFF" &&
      b.toString("ascii", 8, 12) === "WEBP",
  },
  {
    type: "pdf",
    ext: "pdf",
    match: (b) => b.length >= 5 && b.toString("ascii", 0, 5) === "%PDF-",
  },
];

const MIME_BY_TYPE: Record<DetectedFileType, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
};

export function detectFileType(
  buffer: Buffer
): { type: DetectedFileType; ext: string } | null {
  for (const sig of SIGNATURES) {
    if (sig.match(buffer)) return { type: sig.type, ext: sig.ext };
  }
  return null;
}

export function validateUploadBuffer(
  buffer: Buffer,
  opts: { allowPdf: boolean }
):
  | { ok: true; type: DetectedFileType; ext: string; mime: string }
  | { ok: false; error: string } {
  if (buffer.length === 0) {
    return { ok: false, error: "File kosong." };
  }
  if (buffer.length > MAX_UPLOAD_SIZE) {
    return { ok: false, error: "Ukuran file maksimal 10MB." };
  }
  const detected = detectFileType(buffer);
  if (!detected) {
    return {
      ok: false,
      error: "Tipe file tidak diizinkan. Hanya JPG, PNG, WebP, dan PDF.",
    };
  }
  if (detected.type === "pdf" && !opts.allowPdf) {
    return {
      ok: false,
      error: "File harus berupa gambar (JPG/PNG/WebP), bukan PDF/Dokumen.",
    };
  }
  return { ok: true, ...detected, mime: MIME_BY_TYPE[detected.type] };
}

// Sanitasi bagian nama file/folder: Drive bukan filesystem sehingga `/`
// bukan traversal, tapi karakter ini tetap dibersihkan agar nama tidak
// bisa mengecoh tampilan atau query (termasuk `\` dan karakter kontrol).
export function sanitizeFileNamePart(name: string): string {
  const cleaned = name
    .replace(/[/\\]/g, "-")
    .replace(/[\x00-\x1f\x7f]/g, "")
    .trim()
    .slice(0, 100);
  return cleaned || "Tanpa Nama";
}
