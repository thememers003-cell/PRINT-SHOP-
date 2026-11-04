'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  DollarSign, 
  Download, 
  CheckCircle2, 
  Clock, 
  Store, 
  RefreshCw, 
  Search, 
  ArrowUpRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

export default function AdminSettlementsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedShop, setSelectedShop] = useState<any>(null);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchSettlements = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/settlements');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettlements();
  }, []);

  const handleSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShop || !payoutAmount) return;

    try {
      setSubmitting(true);
      const res = await fetch('/api/admin/settlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopId: selectedShop.shopId,
          amount: parseFloat(payoutAmount),
          transactionRef: transactionRef.trim() || `UTR_${Date.now()}`,
        }),
      });

      if (!res.ok) {
        alert('Failed to record settlement');
        return;
      }

      setSelectedShop(null);
      setPayoutAmount('');
      setTransactionRef('');
      await fetchSettlements();
    } catch (err) {
      console.error(err);
      alert('Error recording payout.');
    } finally {
      setSubmitting(false);
    }
  };

  const ledgers = data?.shopLedgers || [];
  const filteredLedgers = ledgers.filter((l: any) =>
    l.shopName.toLowerCase().includes(search.toLowerCase()) ||
    l.ownerName.toLowerCase().includes(search.toLowerCase())
  );

  const totalPendingAll = ledgers.reduce((sum: number, l: any) => sum + l.pendingBalance, 0);
  const totalSettledAll = ledgers.reduce((sum: number, l: any) => sum + l.settledAmount, 0);
  const totalCommissionAll = ledgers.reduce((sum: number, l: any) => sum + l.platformCommission, 0);

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Revenue Settlements & Payouts
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Reconcile shop balances, approve bank payouts, and audit commission splits.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchSettlements}
            className="p-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <a
            href="/api/admin/settlements/export"
            download
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs transition flex items-center space-x-2 border border-slate-700"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV Report</span>
          </a>
        </div>
      </div>

      {/* Aggregate Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Total Pending Payouts</span>
          <div className="mt-4">
            <span className="text-3xl font-black text-amber-400">₹{totalPendingAll.toFixed(2)}</span>
            <span className="ml-2 text-xs text-slate-400">owed to shops</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Total Settled to Date</span>
          <div className="mt-4">
            <span className="text-3xl font-black text-emerald-400">₹{totalSettledAll.toFixed(2)}</span>
            <span className="ml-2 text-xs text-slate-400">disbursed</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Platform Gross Commission</span>
          <div className="mt-4">
            <span className="text-3xl font-black text-blue-400">₹{totalCommissionAll.toFixed(2)}</span>
            <span className="ml-2 text-xs text-slate-400">Print Bro profit</span>
          </div>
        </div>
      </div>

      {/* Shop Settlements Ledger Table */}
      <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white">Shop Payout Ledgers</h2>
            <p className="text-xs text-slate-400">Individual earnings, commission withholdings, and pending transfers.</p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search shop or owner..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/60 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-700/60">
              <tr>
                <th className="px-6 py-4">Shop & Owner</th>
                <th className="px-6 py-4">Total Orders</th>
                <th className="px-6 py-4">Gross Sales</th>
                <th className="px-6 py-4">Platform Fee</th>
                <th className="px-6 py-4">Net Earned</th>
                <th className="px-6 py-4">Pending Balance</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/40">
              {filteredLedgers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500 text-xs">
                    No shop settlement ledgers found.
                  </td>
                </tr>
              ) : (
                filteredLedgers.map((item: any) => (
                  <tr key={item.shopId} className="hover:bg-slate-700/20 transition">
                    <td className="px-6 py-4">
                      <div className="font-bold text-white">{item.shopName}</div>
                      <div className="text-xs text-slate-400">{item.ownerName} • {item.commissionRate}% comm.</div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-white">
                      {item.totalOrders}
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      ₹{item.totalGross.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-blue-400 font-semibold">
                      ₹{item.platformCommission.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-emerald-400 font-bold">
                      ₹{item.shopEarnings.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      {item.pendingBalance > 0 ? (
                        <span className="font-bold text-amber-400 text-sm">
                          ₹{item.pendingBalance.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500 font-medium">All Settled</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {item.pendingBalance > 0 ? (
                        <button
                          onClick={() => {
                            setSelectedShop(item);
                            setPayoutAmount(String(item.pendingBalance));
                          }}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition inline-flex items-center space-x-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Settle Payout</span>
                        </button>
                      ) : (
                        <span className="text-xs text-emerald-500 font-semibold inline-flex items-center space-x-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Settled</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Settle Payout Modal */}
      {selectedShop && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">Record Shop Payout</h3>
                <p className="text-xs text-slate-400">{selectedShop.shopName}</p>
              </div>
              <button
                onClick={() => setSelectedShop(null)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSettle} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Disbursement Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Bank UTR / Transaction Reference *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UTR2026110488912"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 font-mono text-xs"
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setSelectedShop(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                >
                  {submitting ? 'Recording...' : 'Confirm & Mark Settled'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

