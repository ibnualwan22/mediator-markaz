import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { SignJWT } from "jose";

const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "fallback-secret");

export async function POST(req: Request) {
  try {
    const { nis, password } = await req.json();

    if (!nis || !password) {
      return NextResponse.json({ error: "NIS dan Password wajib diisi" }, { status: 400 });
    }

    const santri = await prisma.santri.findUnique({
      where: { nis },
    });

    if (!santri) {
      return NextResponse.json({ error: "NIS tidak ditemukan" }, { status: 401 });
    }

    // Password default = NIS santri (untuk testing)
    if (password !== santri.nis) {
      return NextResponse.json({ error: "Password salah" }, { status: 401 });
    }

    // Create JWT token
    const token = await new SignJWT({
      santriId: santri.id,
      nis: santri.nis,
      nama: santri.namaLengkap,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("30d")
      .sign(SECRET);

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set("santri-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
    });

    return NextResponse.json({ success: true, nama: santri.namaLengkap });
  } catch (error) {
    console.error("Santri Auth Error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan sistem" }, { status: 500 });
  }
}
