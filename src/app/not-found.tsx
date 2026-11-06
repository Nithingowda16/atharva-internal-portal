import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center p-6 text-[#1D1D1F]">
      <div className="bg-[#FFFFFF] p-8 md:p-10 rounded-[28px] border border-[#E5E5EA] shadow-apple-card max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-[#FFFFFF] border border-[#E5E5EA] p-2 mx-auto flex items-center justify-center shadow-xs">
          <img src="/logo.png" alt="Atharva Travels" className="w-full h-full object-contain" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-2xl font-bold tracking-tight text-[#1D1D1F]">Page Not Found</h2>
          <p className="text-xs text-[#86868B]">
            The requested page, finance statement or record is not available.
          </p>
        </div>
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center px-6 py-2.5 bg-[#007AFF] hover:bg-[#0062CC] text-white rounded-full text-xs font-semibold shadow-apple-btn transition-all active:scale-[0.98]"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
