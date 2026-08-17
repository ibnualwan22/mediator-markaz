import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "./prisma";

const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "fallback-secret");

export interface SantriSession {
  santriId: string;
  nis: string;
  nama: string;
}

export async function getSantriSession(): Promise<SantriSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("santri-token")?.value;

    if (!token) return null;

    const { payload } = await jwtVerify(token, SECRET);
    return {
      santriId: payload.santriId as string,
      nis: payload.nis as string,
      nama: payload.nama as string,
    };
  } catch {
    return null;
  }
}

export async function getSantriWithSession() {
  const session = await getSantriSession();
  if (!session) return null;

  const santri = await prisma.santri.findUnique({
    where: { id: session.santriId },
    include: {
      gelombang: { include: { periode: true } },
    },
  });

  return santri;
}
