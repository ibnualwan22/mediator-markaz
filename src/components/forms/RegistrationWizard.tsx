"use client";

import { useState, useEffect } from "react";
import { Check } from "lucide-react";
import Step1DataPribadi from "./Step1DataPribadi";
import Step2DokumenPribadi from "./Step2DokumenPribadi";
import Step3Akademik from "./Step3Akademik";
import Step4Paspor from "./Step4Paspor";

const STEPS = [
  "Data Pribadi",
  "Dokumen Pribadi",
  "Riwayat Akademik",
  "Paspor & Konfirmasi",
];

export default function RegistrationWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const savedData = localStorage.getItem("ma_registration_data");
    const savedStep = localStorage.getItem("ma_registration_step");
    if (savedData) {
      try { setFormData(JSON.parse(savedData)); } catch(e) {}
    }
    if (savedStep) {
      try { setCurrentStep(parseInt(savedStep, 10)); } catch(e) {}
    }
    setIsMounted(true);
  }, []);

  const saveToCache = (data: any, step: number) => {
    const { fileAkteLahir, filePasFoto, fileIjazah, filePaspor, ...lightweightData } = data;
    try {
      localStorage.setItem("ma_registration_data", JSON.stringify(lightweightData));
      localStorage.setItem("ma_registration_step", step.toString());
    } catch (error) {
      console.warn("Gagal menyimpan cache lokal:", error);
    }
  };

  const handleNext = (stepData: any) => {
    const newData = { ...formData, ...stepData };
    setFormData(newData);
    if (currentStep < 4) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      saveToCache(newData, nextStep);
      window.scrollTo(0, 0);
    }
  };

  const handleBack = (stepData: any) => {
    const newData = { ...formData, ...stepData };
    setFormData(newData);
    if (currentStep > 1) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      saveToCache(newData, prevStep);
      window.scrollTo(0, 0);
    }
  };

  const handleSubmit = async (finalData: any) => {
    const completeData = { ...formData, ...finalData };
    
    // Validasi final sebelum fetch (melindungi dari data bolong akibat refresh halaman)
    if (!completeData.fileAkteLahir || !completeData.filePasFoto || !completeData.fileIjazah) {
      alert("⚠️ DATA DOKUMEN HILANG: Karena Anda baru memuat ulang (refresh) halaman, silakan kembali (Back) ke Step 2 & 3 untuk mengunggah ulang dokumen/foto Anda sebelum mencetak invoice.");
      return;
    }

    setIsSubmitting(true);
    
    try {
      // POST to /api/pendaftaran
      const res = await fetch("/api/pendaftaran", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(completeData),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Gagal mendaftar");
      }

      const result = await res.json();
      
      // Bersihkan cache jika berhasil
      localStorage.removeItem("ma_registration_data");
      localStorage.removeItem("ma_registration_step");

      window.location.href = `/daftar/sukses?id=${result.id}`;
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isMounted) return (
    <div className="w-full h-96 flex items-center justify-center bg-primary-light/5 rounded-2xl animate-pulse">
      Menyiapkan form...
    </div>
  );

  return (
    <>
      {/* Stepper */}
      <div className="mb-8">
        <div className="flex items-center justify-between relative">
          {/* Progress bar line */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-primary-light/20 -z-10 rounded-full"></div>
          <div 
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary -z-10 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
          ></div>
          
          {STEPS.map((step, index) => {
            const stepNumber = index + 1;
            const isActive = currentStep === stepNumber;
            const isPast = currentStep > stepNumber;
            
            return (
              <div key={step} className="flex flex-col items-center gap-2">
                <div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors border-2
                    ${isActive ? "bg-bg-cream border-primary text-primary shadow-sm" : 
                      isPast ? "bg-primary border-primary text-white" : 
                      "bg-white border-primary-light/30 text-text-secondary/50"}`}
                >
                  {isPast ? <Check size={18} /> : stepNumber}
                </div>
                <span className={`text-xs md:text-sm font-medium hidden sm:block ${isActive || isPast ? "text-text-primary" : "text-text-secondary/50"}`}>
                  {step}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Form Content */}
      <div className="mt-8">
        {currentStep === 1 && <Step1DataPribadi initialData={formData} onNext={handleNext} />}
        {currentStep === 2 && <Step2DokumenPribadi initialData={formData} onNext={handleNext} onBack={handleBack} />}
        {currentStep === 3 && <Step3Akademik initialData={formData} onNext={handleNext} onBack={handleBack} />}
        {currentStep === 4 && <Step4Paspor initialData={formData} onSubmit={handleSubmit} onBack={handleBack} isSubmitting={isSubmitting} />}
      </div>
    </>
  );
}
