import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { 
  Printer, 
  Store, 
  ShieldCheck, 
  ArrowRight, 
  Zap, 
  Clock, 
  Smartphone, 
  MapPin, 
  PlusCircle,
  FileText,
  UploadCloud
} from 'lucide-react';
import { PrintBroLogo } from '@/components/brand/PrintBroLogo';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const shops = await prisma.shop.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50">
      {/* Navigation */}
      <header className="border-b bg-white/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <PrintBroLogo size="md" showTagline />
          </div>
          <div className="flex items-center space-x-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-blue-600 transition"
            >
              Sign In
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
      <main className="flex-1 max-w-7xl mx-auto px-4 py-12 flex flex-col items-center text-center justify-center">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold uppercase tracking-wide mb-6">
          <Zap className="w-3.5 h-3.5 text-blue-600" />
          <span>Modernizing India&apos;s Xerox Ecosystem</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl">
          Zero-Queue Printing & Automated Shop Management
        </h1>
        <p className="mt-4 text-lg sm:text-xl text-slate-600 max-w-2xl">
          Connect physical Xerox shops to customers online. Upload PDF, JPG, and PNG files with live WYSIWYG preview, auto-calculate prices, collect payments, and print directly to Windows printers.
        </p>

        {/* Portals Grid */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl text-left">
          {/* Customer Fast Upload */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/5 transition group flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition">
                <UploadCloud className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Instant File Upload</h3>
              <p className="mt-2 text-sm text-slate-500">
                Upload up to 10 files (PDF, DOCX, JPG, PNG). Instant auto-merge into standard A4 with live WYSIWYG preview.
              </p>
            </div>
            <div className="mt-6">
              {shops.length > 0 && (
                <Link
                  href={`/shop/${shops[0].slug}`}
                  className="inline-flex items-center text-sm font-semibold text-blue-600 group-hover:translate-x-1 transition"
                >
                  <span>Upload &amp; Print Now</span>
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Link>
              )}
            </div>
          </div>

          {/* Super Admin */}
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
                Create new Xerox shops, configure pricing &amp; commissions, inspect Print Agent keys, and manage settlements.
              </p>
            </div>
            <div className="mt-6 flex items-center text-sm font-semibold text-purple-600 group-hover:translate-x-1 transition">
              <span>Onboard &amp; Manage Shops</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </div>
          </Link>

          {/* Customer Printing */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500 hover:shadow-xl hover:shadow-emerald-500/5 transition group flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 transition">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Customer Tracking</h3>
              <p className="mt-2 text-sm text-slate-500">
                Pay online via UPI, track your print job live with 6-digit release code, and pick up directly with zero counter wait time.
              </p>
            </div>
            <div className="mt-6">
              <span className="text-xs font-semibold text-emerald-600 flex items-center">
                <span>Zero-Queue Kiosk Verification</span>
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Registered Shops Directory */}
        <div className="mt-12 w-full max-w-4xl text-left bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Registered Xerox Shops</h2>
              <p className="text-xs text-slate-500">Select any shop to upload documents, or onboard a new one.</p>
            </div>
            <Link
              href="/admin"
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Create New Shop</span>
            </Link>
          </div>

          {shops.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p className="text-sm">No shops currently onboarded.</p>
              <Link href="/admin" className="text-blue-600 text-xs font-semibold hover:underline mt-1 inline-block">
                Click here to create your first Xerox Shop in Admin →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {shops.map((s) => (
                <div
                  key={s.id}
                  className="p-4 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition bg-slate-50/50 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <h4 className="font-bold text-slate-900 text-base">{s.name}</h4>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                        {s.printMode}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 flex items-center">
                      <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" />
                      <span>{s.city}, {s.state}</span>
                    </p>
                    <p className="text-[11px] font-mono text-slate-400 mt-0.5">/shop/{s.slug}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200/60">
                    <Link
                      href={`/shop/${s.slug}`}
                      className="w-full justify-center py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white font-bold text-xs transition flex items-center space-x-1.5"
                    >
                      <span>Upload &amp; Print Document</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white py-6 text-center text-sm text-slate-500">
        <p>© 2026 Print Bro. Production-ready multi-shop printing infrastructure.</p>
      </footer>
    </div>
  );
}
