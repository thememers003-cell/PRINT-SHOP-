import Link from 'next/link';
import { Store, Printer, DollarSign, Settings, Home, ExternalLink } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top POS Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-emerald-600 text-white p-2 rounded-xl shadow-md shadow-emerald-500/20">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white">Print Bro <span className="text-emerald-400">Shop POS</span></span>
              <span className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Counter Order Dispatch & Hardware Spooler</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition flex items-center space-x-1"
            >
              <Home className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Portal Home</span>
            </Link>
            <Link
              href="/admin"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-purple-300 hover:text-white hover:bg-slate-700 transition"
            >
              Super Admin
            </Link>
          </div>
        </div>
      </header>

      {/* Main POS Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}

