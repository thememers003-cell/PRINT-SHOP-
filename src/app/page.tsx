import Link from 'next/link';
import { Printer, Store, ShieldCheck, ArrowRight, Zap, Clock, Smartphone } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col justify-between">
      {/* Navigation */}
      <header className="border-b bg-white/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 text-white p-2 rounded-xl shadow-md shadow-blue-500/20">
              <Printer className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-900">Print <span className="text-blue-600">Bro</span></span>
              <span className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Multi-Shop Xerox SaaS</span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Link
              href="/dashboard"
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-blue-600 transition"
            >
              Shop Owner POS
            </Link>
            <Link
              href="/admin"
              className="px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
            >
              Super Admin
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-4 py-16 flex flex-col items-center text-center justify-center">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold uppercase tracking-wide mb-6">
          <Zap className="w-3.5 h-3.5 text-blue-600" />
          <span>Modernizing India&apos;s Xerox Ecosystem</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl">
          Zero-Queue Printing & Automated Shop Management
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl">
          Connect your Xerox shop to customers online. Accept document uploads, render instant WYSIWYG previews, auto-calculate prices, collect payments, and print directly to physical printers.
        </p>

        {/* Demo Portals Grid */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl text-left">
          <Link
            href="/shop/sri-ganesh-xerox"
            className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/5 transition group flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Customer Printing Portal</h3>
              <p className="mt-2 text-sm text-slate-500">
                Test the dedicated shop experience for <span className="font-semibold text-slate-700">Sri Ganesh Xerox</span>. Upload, preview, configure, and checkout.
              </p>
            </div>
            <div className="mt-6 flex items-center text-sm font-semibold text-blue-600 group-hover:translate-x-1 transition">
              <span>Try Customer Portal</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </div>
          </Link>

          <Link
            href="/dashboard"
            className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500 hover:shadow-xl hover:shadow-emerald-500/5 transition group flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 transition">
                <Store className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Shop Owner POS</h3>
              <p className="mt-2 text-sm text-slate-500">
                Manage live orders, monitor printer agents, toggle manual vs. automatic printing, and track daily earnings.
              </p>
            </div>
            <div className="mt-6 flex items-center text-sm font-semibold text-emerald-600 group-hover:translate-x-1 transition">
              <span>Open POS Dashboard</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </div>
          </Link>

          <Link
            href="/admin"
            className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-purple-500 hover:shadow-xl hover:shadow-purple-500/5 transition group flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Super Admin SaaS</h3>
              <p className="mt-2 text-sm text-slate-500">
                Platform-wide control: onboard Xerox shops, configure commission splits, review financial ledgers, and execute settlements.
              </p>
            </div>
            <div className="mt-6 flex items-center text-sm font-semibold text-purple-600 group-hover:translate-x-1 transition">
              <span>Launch Admin</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </div>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white py-6 text-center text-sm text-slate-500">
        <p>© 2026 Print Bro. Production-ready multi-shop printing infrastructure.</p>
      </footer>
    </div>
  );
}

