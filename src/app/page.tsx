import Link from "next/link";
import { ArrowRight, BookOpen, Globe2, Sparkles, MapPin } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Navbar Minimalis */}
      <header className="sticky top-0 z-50 w-full border-b border-primary-light/30 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xl font-heading">
              م
            </div>
            <span className="font-heading font-bold text-xl text-primary">Markaz Arabiyah</span>
          </div>
          <nav className="hidden md:flex gap-6">
            <Link href="#tentang" className="text-sm font-medium text-text-secondary hover:text-primary transition-colors">Tentang</Link>
            <Link href="#program" className="text-sm font-medium text-text-secondary hover:text-primary transition-colors">Program</Link>
            <Link href="#kontak" className="text-sm font-medium text-text-secondary hover:text-primary transition-colors">Kontak</Link>
          </nav>
          <div>
            <Link 
              href="/daftar" 
              className="px-5 py-2 rounded-full bg-primary text-white text-sm font-medium hover:bg-primary-light transition-colors flex items-center gap-2 shadow-sm"
            >
              Daftar Sekarang <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-bg-cream pt-20 pb-28 md:pt-32 md:pb-40">
          {/* Ornamen Latar - Subtle */}
          <div className="absolute top-0 right-0 opacity-5 pointer-events-none transform translate-x-1/3 -translate-y-1/4">
            <svg width="400" height="400" viewBox="0 0 100 100" className="text-primary fill-current">
              <path d="M50 0L62 38L100 50L62 62L50 100L38 62L0 50L38 38Z" />
            </svg>
          </div>
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl mx-auto text-center space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary-light/50 bg-primary/5 text-primary text-sm font-medium mb-4">
                <Sparkles size={14} />
                <span>Penerimaan Camaba Baru Terbuka</span>
              </div>
              
              <h1 className="text-4xl md:text-6xl font-bold font-heading text-text-primary leading-tight">
                Langkah Awal Anda Menuju <br/>
                <span className="text-primary italic">Pendidikan di Mesir</span>
              </h1>
              
              <p className="text-lg text-text-secondary font-sans max-w-2xl mx-auto leading-relaxed">
                Mediator Markaz Arabiyah memfasilitasi pendaftaran, pemberkasan, dan progres bagi calon pelajar yang ingin memperdalam ilmu bahasa Arab langsung di sumbernya.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <Link 
                  href="/daftar" 
                  className="px-8 py-3.5 rounded-full bg-primary text-white font-medium hover:bg-primary-light transition-all hover:-translate-y-0.5 shadow-md hover:shadow-lg w-full sm:w-auto"
                >
                  Mulai Pendaftaran
                </Link>
                <Link 
                  href="/cek-status" 
                  className="px-8 py-3.5 rounded-full bg-white text-primary font-medium border border-primary-light/50 hover:bg-primary-bg transition-all w-full sm:w-auto"
                >
                  Cek Status
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Info Cards Section */}
        <section className="py-20 bg-background" id="tentang">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-bg-cream rounded-2xl p-8 border border-primary-light/20 hover:border-primary/40 transition-colors group">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
                  <BookOpen size={24} />
                </div>
                <h3 className="text-xl font-heading font-bold mb-3">Persiapan Akademik</h3>
                <p className="text-text-secondary text-sm leading-relaxed">
                  Kami membimbing Anda dari nol hingga siap melewati uji masuk (Tahdid Mustawa) dan Mu'adalah.
                </p>
              </div>
              
              <div className="bg-bg-cream rounded-2xl p-8 border border-primary-light/20 hover:border-primary/40 transition-colors group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full" />
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
                  <Globe2 size={24} />
                </div>
                <h3 className="text-xl font-heading font-bold mb-3">Fiksasi Legalitas</h3>
                <p className="text-text-secondary text-sm leading-relaxed">
                  Pengurusan berkas Indonesia & legalisir KBRI Mesir dilakukan secara profesional dan terpusat.
                </p>
              </div>

              <div className="bg-bg-cream rounded-2xl p-8 border border-primary-light/20 hover:border-primary/40 transition-colors group">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
                  <MapPin size={24} />
                </div>
                <h3 className="text-xl font-heading font-bold mb-3">Asrama Spesial</h3>
                <p className="text-text-secondary text-sm leading-relaxed">
                  Setibanya di Mesir, Anda dapat menempati asrama eksklusif Markaz Arabiyah (+ fasilitas 1 tahun).
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer Minimalis */}
      <footer className="bg-text-primary text-bg-cream py-12 border-t-4 border-primary">
        <div className="container mx-auto px-4 text-center space-y-4">
          <div className="font-heading font-bold text-2xl text-primary-light">Markaz Arabiyah</div>
          <p className="text-sm text-text-secondary max-w-md mx-auto">
            Platform resmi pelayanan pendaftaran pelajar Indonesia untuk belajar di Mesir melalui Markaz Arabiyah.
          </p>
          <div className="pt-8 text-xs text-text-secondary/70">
            &copy; {new Date().getFullYear()} Markaz Arabiyah. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
