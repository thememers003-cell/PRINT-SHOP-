'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Store, 
  ShieldCheck, 
  Lock, 
  Mail, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles 
} from 'lucide-react';
import { sounds } from '@/lib/sound-effects';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = searchParams.get('role') === 'admin' ? 'SUPER_ADMIN' : 'SHOP_OWNER';

  const [activeTab, setActiveTab] = useState<'SHOP_OWNER' | 'SUPER_ADMIN'>(initialRole);
  const [email, setEmail] = useState(
    initialRole === 'SUPER_ADMIN' ? 'admin@printbro.online' : 'owner@ganeshxerox.com'
  );
  const [password, setPassword] = useState('PASS@123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const roleParam = searchParams.get('role');
    if (roleParam === 'admin') {
      setActiveTab('SUPER_ADMIN');
      setEmail('admin@printbro.online');
      setPassword('PASS@123');
    } else if (roleParam === 'shop') {
      setActiveTab('SHOP_OWNER');
      setEmail('owner@ganeshxerox.com');
      setPassword('PASS@123');
    }
  }, [searchParams]);

  const handleTabSwitch = (tab: 'SHOP_OWNER' | 'SUPER_ADMIN') => {
    sounds.playTap();
    setActiveTab(tab);
    setError(null);
    if (tab === 'SUPER_ADMIN') {
      setEmail('admin@printbro.online');
      setPassword('PASS@123');
    } else {
      setEmail('owner@ganeshxerox.com');
      setPassword('PASS@123');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    sounds.playTap();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          role: activeTab,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed. Please verify credentials.');
      }

      sounds.playSuccess();
      router.push(data.redirectUrl || (activeTab === 'SUPER_ADMIN' ? '/admin' : '/dashboard'));
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f4f9] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Subtle Gradient Blobs */}
      <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 px-4">
        {/* Brand Mascot Logo */}
        <div className="flex justify-center mb-4">
          <Link href="/" className="transition hover:scale-105 active:scale-95 inline-block">
            <img
              src="/images/printbro-logo.jpg"
              alt="PrintBro"
              className="h-16 w-auto object-contain drop-shadow-md rounded-2xl"
            />
          </Link>
        </div>

        <h2 className="text-center text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          {activeTab === 'SUPER_ADMIN' ? 'PrintBro Super Admin' : 'Shop Owner Portal'}
        </h2>
        <p className="mt-1 text-center text-xs sm:text-sm text-slate-500 font-medium">
          {activeTab === 'SUPER_ADMIN'
            ? 'Unified Cloud Fleet Governance & Settlement Engine'
            : 'POS Counter Printing Queue & Shop Orders'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl shadow-slate-200/80 rounded-3xl border border-slate-200/80 space-y-6">
          {/* Portal Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-100 border border-slate-200/80">
            <button
              type="button"
              onClick={() => handleTabSwitch('SHOP_OWNER')}
              className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all ${
                activeTab === 'SHOP_OWNER'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Store className="w-4 h-4" />
              <span>Shop Owner</span>
            </button>
            <button
              type="button"
              onClick={() => handleTabSwitch('SUPER_ADMIN')}
              className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all ${
                activeTab === 'SUPER_ADMIN'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Super Admin</span>
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          {/* Login Form */}
          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {activeTab === 'SUPER_ADMIN' ? 'Admin Email' : 'Shop Owner Email / ID'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={activeTab === 'SUPER_ADMIN' ? 'admin@printbro.online' : 'owner@ganeshxerox.com'}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-11 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Quick Helper Credentials Badge */}
            <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-100 text-[11px] text-blue-900 space-y-1">
              <div className="flex items-center space-x-1.5 font-bold">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Verified Credentials Ready:</span>
              </div>
              <div className="font-mono text-slate-600 flex flex-wrap gap-x-2">
                <span>Email: <strong className="text-slate-800">{email}</strong></span>
                <span>Pass: <strong className="text-blue-600">{password}</strong></span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-2xl bg-[#0095ff] hover:bg-blue-600 text-white font-extrabold text-sm shadow-md shadow-blue-500/25 transition active:scale-95 flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : `Sign In to ${activeTab === 'SUPER_ADMIN' ? 'Super Admin' : 'Shop Dashboard'}`}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Bottom Link */}
          <div className="text-center pt-2">
            <Link
              href="/"
              className="text-xs font-semibold text-slate-400 hover:text-blue-600 transition"
            >
              ← Back to Customer Upload Portal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <LoginContent />
    </React.Suspense>
  );
}


