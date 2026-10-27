import { NextResponse } from "next/server";

// Endpoint ini SUDAH TIDAK DIGUNAKAN: jalur upload paspor pindah ke
// Google Drive (/api/upload-drive) dan pemakaian terakhirnya di
// Step4Paspor sudah di-comment. Stub 410 ini menggantikan penandatangan
// lama yang tanpa auth dan hanya menandatangani timestamp — siapa pun
// bisa memintanya lalu mengunggah ke akun Cloudinary.
// Bila Cloudinary dipakai lagi suatu hari, endpoint ini harus ditulis
// ulang dengan auth + parameter upload yang ikut ditandatangani.
export async function POST() {
  return NextResponse.json(
    { error: "Endpoint sudah tidak digunakan." },
    { status: 410 }
  );
}
