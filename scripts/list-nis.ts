import { prisma } from "../src/lib/prisma";

async function main() {
  const santriList = await prisma.santri.findMany({
    where: { nis: { not: null } },
    include: { gelombang: true },
    orderBy: [{ gelombangId: "asc" }, { nis: "asc" }],
  });

  const grouped = new Map<string, { nama: string; nis: string }[]>();
  for (const s of santriList) {
    const key = s.gelombang.nama;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push({ nama: s.namaLengkap, nis: s.nis! });
  }

  for (const [gelombang, list] of grouped) {
    console.log(`\n## ${gelombang}\n`);
    console.log("| No | Nama | NIS |");
    console.log("|---|---|---|");
    list.forEach((s, i) => {
      console.log(`| ${i + 1} | ${s.nama} | ${s.nis} |`);
    });
  }
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
