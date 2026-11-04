'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Printer, 
  Store, 
  Play, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  RefreshCw, 
  Search, 
  ExternalLink,
  Sliders,
  DollarSign,
  AlertTriangle,
  RotateCcw,
  Layers,
  FileText
} from 'lucide-react';

export default function ShopOwnerDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/shop-owner/orders');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();

    // Auto-refresh order queue every 10 seconds
    const interval = setInterval(() => {
      fetchDashboard();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const handlePrintNow = async (orderId: string) => {
    try {
      setActionLoading(orderId);
      const res = await fetch('/api/shop-owner/print-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          shopId: data.shop.id,
        }),
      });
      if (!res.ok) {
        alert('Failed to dispatch print job');
        return;
      }
      await fetchDashboard();
    } catch (e) {
      console.error(e);
      alert('Error dispatching job.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateStatus = async (orderId: string, status: string) => {
    try {
      setActionLoading(orderId);
      const res = await fetch('/api/shop-owner/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          shopId: data.shop.id,
          status,
        }),
      });
      if (!res.ok) {
        alert('Failed to update status');
        return;
      }
      await fetchDashboard();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleTogglePrintMode = async () => {
    if (!data?.shop) return;
    const nextMode = data.shop.printMode === 'MANUAL' ? 'AUTO' : 'MANUAL';
    try {
      await fetch(`/api/admin/shops/${data.shop.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ printMode: nextMode }),
      });
      await fetchDashboard();
    } catch (e) {
      console.error(e);
    }
  };

  const shop = data?.shop;
  const metrics = data?.metrics;
  const orders = data?.orders || [];

  const filteredOrders = orders.filter((order: any) => {
    const matchesFilter =
      statusFilter === 'ALL' ||
      (statusFilter === 'PENDING' && ['PAID', 'QUEUED'].includes(order.status)) ||
      (statusFilter === 'PRINTING' && order.status === 'PRINTING') ||
      (statusFilter === 'COMPLETED' && order.status === 'COMPLETED');

    const matchesSearch =
      order.jobId.toLowerCase().includes(search.toLowerCase()) ||
      (order.customerName && order.customerName.toLowerCase().includes(search.toLowerCase())) ||
      (order.customerPhone && order.customerPhone.includes(search));

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-8">
      {/* Top POS Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {shop?.name || 'Counter Order Queue'}
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              POS Terminal
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 flex items-center space-x-2">
            <span>Customer Link:</span>
            <Link
              href={`/shop/${shop?.slug || ''}`}
              target="_blank"
              className="font-mono text-emerald-400 hover:underline inline-flex items-center space-x-1"
            >
              <span>/shop/{shop?.slug}</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </p>
        </div>

        {/* Printing Mode Toggle */}
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchDashboard}
            className="p-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
            title="Refresh Orders"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleTogglePrintMode}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center space-x-2 border shadow-lg ${
              shop?.printMode === 'AUTO'
                ? 'bg-blue-600/20 text-blue-400 border-blue-500/40 shadow-blue-500/10'
                : 'bg-emerald-600/20 text-emerald-400 border-emerald-500/40 shadow-emerald-500/10'
            }`}
            title="Click to toggle between Manual Counter and Automatic Daemon"
          >
            <Printer className="w-4 h-4" />
            <span>Mode: {shop?.printMode === 'AUTO' ? 'Express Auto-Print (Daemon)' : 'Manual (Click to Print)'}</span>
          </button>
        </div>
      </div>

      {/* POS Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider">Today&apos;s Orders</span>
          <div className="mt-2 text-2xl font-black text-white">{metrics?.todayOrdersCount ?? 0}</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider">Paid In Queue</span>
          <div className="mt-2 text-2xl font-black text-blue-400">{metrics?.paidOrders ?? 0}</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider">Printing Now</span>
          <div className="mt-2 text-2xl font-black text-purple-400">{metrics?.printingInProgress ?? 0}</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider">Today&apos;s Earnings</span>
          <div className="mt-2 text-2xl font-black text-emerald-400">₹{metrics?.todayEarnings ?? 0}</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 col-span-2 lg:col-span-1">
          <span className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider">Total Pages Printed</span>
          <div className="mt-2 text-2xl font-black text-amber-400">{metrics?.totalPagesPrinted ?? 0}</div>
        </div>
      </div>

      {/* Connected Printers Hardware Status */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center space-x-2">
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>Connected Physical Hardware Printers</span>
          </h2>
          <span className="text-xs text-slate-400">
            {shop?.printers?.length || 0} registered printer{shop?.printers?.length > 1 ? 's' : ''}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {shop?.printers?.map((p: any) => (
            <div key={p.id} className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-white block">{p.name}</span>
                <span className="text-[11px] text-slate-400">
                  {p.supportsColor ? 'Color' : 'Monochrome'} • {p.paperSizes}
                </span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                p.status === 'ONLINE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-slate-700 text-slate-400'
              }`}>
                {p.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Order Queue Management Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden space-y-4">
        {/* Controls Toolbar */}
        <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            {['ALL', 'PENDING', 'PRINTING', 'COMPLETED'].map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  statusFilter === filter
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search Job ID or Customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Orders Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Job ID & Customer</th>
                <th className="px-6 py-4">Uploaded Document</th>
                <th className="px-6 py-4">Print Configuration</th>
                <th className="px-6 py-4">Payment & Price</th>
                <th className="px-6 py-4">Print Status</th>
                <th className="px-6 py-4 text-right">Counter Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500 text-xs">
                    No printing orders in queue.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order: any) => {
                  const job = order.jobs?.[0];
                  const doc = order.documents?.[0];
                  const isQueuedOrPaid = ['PAID', 'QUEUED'].includes(order.status);
                  const isPrinting = order.status === 'PRINTING';

                  return (
                    <tr key={order.id} className="hover:bg-slate-800/30 transition">
                      {/* Job ID & Customer */}
                      <td className="px-6 py-4">
                        <Link
                          href={`/track/${order.jobId}`}
                          target="_blank"
                          className="font-mono font-bold text-blue-400 hover:underline flex items-center space-x-1"
                        >
                          <span>{order.jobId}</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                        <div className="text-xs font-semibold text-white mt-1">
                          {order.customerName || 'Walk-in'}
                        </div>
                        {order.customerPhone && (
                          <div className="text-[11px] text-slate-400 font-mono">
                            {order.customerPhone}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {new Date(order.createdAt).toLocaleTimeString()}
                        </div>
                      </td>

                      {/* Document Details */}
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="font-medium text-white truncate max-w-[180px]">
                            {doc?.originalFilename || 'Document'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {doc?.pageCount || 1} pages • {order.documents?.length || 1} file{order.documents?.length > 1 ? 's' : ''}
                        </div>
                        {order.notes && (
                          <div className="text-[11px] text-amber-400 italic mt-1">
                            &quot;{order.notes}&quot;
                          </div>
                        )}
                      </td>

                      {/* Print Configuration */}
                      <td className="px-6 py-4">
                        <div className="text-xs text-slate-300 font-semibold space-x-1">
                          <span className={job?.colorMode === 'COLOR' ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                            {job?.colorMode}
                          </span>
                          <span>•</span>
                          <span>{job?.sides}</span>
                          <span>•</span>
                          <span>{job?.paperSize}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Copies: <span className="font-bold text-white">{job?.copies || 1}</span>
                          {job?.nUp > 1 ? ` • ${job.nUp}-up grid` : ''}
                        </div>
                      </td>

                      {/* Payment & Price */}
                      <td className="px-6 py-4">
                        <div className="font-bold text-emerald-400 text-sm">
                          ₹{order.totalAmount?.toFixed(2)}
                        </div>
                        <div className="text-[11px] font-semibold uppercase text-slate-400">
                          {order.paymentStatus}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                          order.status === 'COMPLETED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : order.status === 'PRINTING'
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30 animate-pulse'
                            : isQueuedOrPaid
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                            : 'bg-slate-700 text-slate-300'
                        }`}>
                          {order.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right space-x-2">
                        {order.status === 'PAID' && (
                          <button
                            onClick={() => handlePrintNow(order.id)}
                            disabled={actionLoading === order.id}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition inline-flex items-center space-x-1 shadow-md shadow-emerald-600/20"
                          >
                            <Play className="w-3.5 h-3.5 fill-white" />
                            <span>Print Now</span>
                          </button>
                        )}

                        {order.status === 'QUEUED' && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'PRINTING')}
                            disabled={actionLoading === order.id}
                            className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition"
                          >
                            <span>Mark Printing</span>
                          </button>
                        )}

                        {order.status === 'PRINTING' && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'COMPLETED')}
                            disabled={actionLoading === order.id}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition inline-flex items-center space-x-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Mark Done</span>
                          </button>
                        )}

                        {order.status === 'COMPLETED' && (
                          <button
                            onClick={() => handlePrintNow(order.id)}
                            disabled={actionLoading === order.id}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition inline-flex items-center space-x-1"
                            title="Reprint order"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reprint</span>
                          </button>
                        )}

                        {!['COMPLETED', 'CANCELLED', 'FAILED'].includes(order.status) && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'FAILED')}
                            disabled={actionLoading === order.id}
                            className="px-2 py-1 rounded-lg text-slate-500 hover:text-rose-400 text-xs transition"
                            title="Report Print Failed"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

