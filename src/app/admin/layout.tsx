'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, Store, DollarSign, Home, LogOut, Loader2, User, KeyRound } from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.push('/login?role=admin');
          return;
        }
        const data = await res.json();
        if (!data.authenticated || data.user?.role !== 'SUPER_ADMIN') {
          router.push('/login?role=admin');
          return;
        }
        setAdminUser(data.user);
        setCheckingAuth(false);
      } catch (err) {
        console.error('Admin layout auth check error:', err);
        router.push('/login?role=admin');
      }
    }

    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login?role=admin');
    } catch (err) {
      console.error('Logout error:', err);
      router.push('/login?role=admin');
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 animate-pulse shadow-xl shadow-purple-600/10">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <div className="text-center space-y-1">
          <p className="font-bold text-white text-base">Verifying Super Admin Access</p>
          <p className="text-xs text-slate-400">Authenticating master cryptographic session...</p>
        </div>
        <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
      </div>
    );
  }

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

          <nav className="flex items-center space-x-1 sm:space-x-3">
            <Link
              href="/admin"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center space-x-1.5 ${
                pathname === '/admin'
                  ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Store className="w-4 h-4" />
              <span className="hidden sm:inline">Shops & Metrics</span>
            </Link>
            <Link
              href="/admin/settlements"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center space-x-1.5 ${
                pathname === '/admin/settlements'
                  ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span className="hidden sm:inline">Settlements</span>
            </Link>
            <Link
              href="/"
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition flex items-center space-x-1"
              title="Portal Home"
            >
              <Home className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Portal Home</span>
            </Link>

            {/* Admin identity badge & logout */}
            <div className="pl-2 border-l border-slate-800 flex items-center space-x-2">
              <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
                <User className="w-3.5 h-3.5 text-purple-400" />
                <span className="font-mono text-[11px] truncate max-w-[150px]">{adminUser?.email || 'admin'}</span>
              </div>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold transition flex items-center space-x-1.5 disabled:opacity-50"
                title="Log out of Super Admin"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{loggingOut ? 'Exiting...' : 'Logout'}</span>
              </button>
            </div>
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
