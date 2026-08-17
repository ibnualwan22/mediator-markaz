import { getSantriSession } from "@/lib/santri-auth";
import { redirect } from "next/navigation";
import SantriSidebar from "@/components/santri/Sidebar";

export default async function SantriDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSantriSession();

  if (!session) {
    redirect("/santri/login");
  }

  return (
    <div className="min-h-screen bg-bg-cream flex">
      <SantriSidebar nama={session.nama} nis={session.nis} />

      {/* Main Content - responsive padding */}
      <main className="flex-1 lg:ml-64 pt-18 lg:pt-0 p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
