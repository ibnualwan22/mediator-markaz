import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

/**
 * Wajib dipanggil di awal setiap API route /api/admin/*.
 * Mengembalikan null bila session admin valid, atau NextResponse 401 bila tidak.
 *
 * Contoh:
 *   const unauthorized = await requireAdmin();
 *   if (unauthorized) return unauthorized;
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
