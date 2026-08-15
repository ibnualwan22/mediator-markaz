export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-bg-white">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-primary-light/20"></div>
        <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
      </div>
      <p className="mt-4 text-text-secondary font-medium font-heading animate-pulse">Mohon tunggu sebentar...</p>
    </div>
  );
}
