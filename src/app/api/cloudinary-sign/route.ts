import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const timestamp = Math.round((new Date).getTime() / 1000);
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    
    if (!apiSecret) {
      console.error("CLOUDINARY_API_SECRET is missing in environment variables");
      return NextResponse.json({ error: "Konfigurasi Cloudinary belum lengkap di Server" }, { status: 500 });
    }

    // Mengamankan upload dengan Signature SHA-1 berdasarkan API Secret (Wajib untuk Signed Uploads)
    const signature = crypto
      .createHash("sha1")
      .update(`timestamp=${timestamp}${apiSecret}`)
      .digest("hex");
    
    return NextResponse.json({ 
      timestamp, 
      signature,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME,
    });
  } catch (error) {
    console.error("Cloudinary Sign Error:", error);
    return NextResponse.json({ error: "Gagal membuat signature Cloudinary" }, { status: 500 });
  }
}
