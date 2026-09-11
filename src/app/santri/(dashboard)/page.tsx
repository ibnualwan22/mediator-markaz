import { getSantriWithSession } from "@/lib/santri-auth";
import { redirect } from "next/navigation";
import SantriProfileClient from "@/components/santri/SantriProfileClient";

export default async function SantriProfilPage() {
  const santri = await getSantriWithSession();

  if (!santri) {
    redirect("/santri/login");
  }

  return (
    <SantriProfileClient santriData={santri} />
  );
}
