import { getSantriSession } from "@/lib/santri-auth";
import { redirect } from "next/navigation";
import SantriSidebar from "@/components/santri/Sidebar";
import { prisma } from "@/lib/prisma";

export default async function SantriDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSantriSession();

  if (!session) {
    redirect("/santri/login");
  }

  const santri = await prisma.santri.findUnique({
    where: { id: session.santriId },
    select: { fotoProfil: true }
  });

  return (
    <div className="min-h-screen bg-bg-cream flex">
      <SantriSidebar nama={session.nama} nis={session.nis} foto={santri?.fotoProfil || null} />

      {/* Main Content - responsive padding */}
      <main className="flex-1 lg:ml-64 pt-18 lg:pt-0 p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
