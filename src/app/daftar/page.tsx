import RegistrationWizard from "@/components/forms/RegistrationWizard";

export default function DaftarPage() {
  return (
    <div className="min-h-screen bg-bg-cream flex flex-col py-10 px-4 md:py-16">
      <div className="max-w-4xl mx-auto w-full">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold font-heading text-text-primary mb-3">
            Form Pendaftaran Santri
          </h1>
          <p className="text-text-secondary max-w-2xl mx-auto">
            Lengkapi data-data berikut untuk mendaftar di Mediator Markaz Arabiyah. Proses ini terdiri dari 4 langkah utama.
          </p>
        </div>
        
        <div className="bg-white rounded-3xl shadow-sm border border-primary-light/20 p-6 md:p-10">
          <RegistrationWizard />
        </div>
      </div>
    </div>
  );
}
