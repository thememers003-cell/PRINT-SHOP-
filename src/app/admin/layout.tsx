import Link from 'next/link';
import { ShieldCheck, Store, DollarSign, Settings, Home } from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-purple-600 text-white p-2 rounded-xl shadow-md shadow-purple-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white">Print Bro <span className="text-purple-400">Super Admin</span></span>
              <span className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Multi-Tenant Platform Control</span>
            </div>
          </div>

          <nav className="flex items-center space-x-1 sm:space-x-4">
            <Link
              href="/admin"
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition flex items-center space-x-1.5"
            >
              <Store className="w-4 h-4" />
              <span>Shops & Metrics</span>
            </Link>
            <Link
              href="/admin/settlements"
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition flex items-center space-x-1.5"
            >
              <DollarSign className="w-4 h-4" />
              <span>Settlements</span>
            </Link>
            <Link
              href="/"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition flex items-center space-x-1"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Portal Home</span>
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}

