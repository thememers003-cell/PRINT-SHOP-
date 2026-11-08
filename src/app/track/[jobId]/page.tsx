'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Printer, 
  Store, 
  MapPin, 
  Phone, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  CreditCard,
  ArrowLeft
} from 'lucide-react';
import { TrackingTimeline } from '@/components/tracking/TrackingTimeline';
import { DigitalReceipt } from '@/components/tracking/DigitalReceipt';
import { PrintBroLogo } from '@/components/brand/PrintBroLogo';

export default function OrderTrackingPage() {
  const params = useParams();
  const jobId = params?.jobId as string;

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/orders/${jobId}`);
      if (!res.ok) {
        throw new Error('Order not found');
      }
      const data = await res.json();
      setOrder(data);

      // Auto-trigger payment confirmation in express kiosk mode
      if (data?.paymentStatus === 'INITIATED' && !paying) {
        setTimeout(() => {
          handleSimulatePayment();
        }, 600);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!jobId) return;

    fetchOrder();

    // Connect to Server-Sent Events (SSE)
    const eventSource = new EventSource(`/api/orders/${jobId}/events`);

    eventSource.addEventListener('statusUpdate', (event) => {
      try {
        const update = JSON.parse(event.data);
        setOrder((prev: any) => (prev ? { ...prev, status: update.status, paymentStatus: update.paymentStatus } : prev));
      } catch (e) {
        console.error('Error parsing SSE update:', e);
      }
    });

    eventSource.onerror = () => {
      // EventSource reconnects automatically
    };

    return () => {
      eventSource.close();
    };
  }, [jobId]);

  const handleSimulatePayment = async () => {
    try {
      setPaying(true);
      const res = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          transactionId: `TXN_SIM_${Date.now()}`,
          signature: 'sig_mock_success',
        }),
      });
      if (!res.ok) {
        alert('Payment verification failed');
        return;
      }
      await fetchOrder();
    } catch (e) {
      console.error(e);
      alert('Error verifying payment.');
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-slate-600">Retrieving order details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 text-center shadow-sm space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 mx-auto flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Order Not Found</h2>
          <p className="text-sm text-slate-500">
            No active printing job matching <span className="font-mono text-slate-800">{jobId}</span> was found.
          </p>
          <Link
            href="/"
            className="inline-block mt-4 px-5 py-2.5 rounded-xl bg-slate-900 text-white font-medium text-sm hover:bg-slate-800 transition"
          >
            Go to Print Bro Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Tracking Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <PrintBroLogo size="sm" />
            <div className="border-l border-slate-200 pl-3">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Live Tracking</span>
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight font-mono">
                {order.jobId}
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={fetchOrder}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
              title="Refresh Status"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <Link
              href={`/shop/${order.shopSlug}`}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition hidden sm:inline-flex items-center space-x-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Shop</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Tracking Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 space-y-8">
        {/* Payment Pending Alert Banner if not yet paid */}
        {order.paymentStatus === 'INITIATED' && (
          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-900">Payment Pending</h3>
                <p className="text-xs text-amber-700">
                  Please complete the payment of <span className="font-bold">₹{order.totalAmount?.toFixed(2)}</span> to queue your job at the printer.
                </p>
              </div>
            </div>
            <button
              onClick={handleSimulatePayment}
              disabled={paying}
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition shadow-md shadow-amber-600/20 disabled:opacity-50"
            >
              {paying ? 'Verifying...' : 'Pay with UPI / PhonePe (Instant Simulation)'}
            </button>
          </div>
        )}

        {/* Shop Location Banner */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 font-bold">
              {order.shopName.charAt(0)}
            </div>
            <div>
              <span className="text-xs text-slate-400 font-semibold uppercase">Printing At</span>
              <h2 className="text-base font-bold text-slate-900">{order.shopName}</h2>
              <p className="text-xs text-slate-500 flex items-center space-x-1 mt-0.5">
                <MapPin className="w-3 h-3 text-slate-400" />
                <span>{order.shopAddress}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <a
              href={`tel:${order.shopPhone}`}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition flex items-center space-x-1.5"
            >
              <Phone className="w-3.5 h-3.5 text-slate-500" />
              <span>Call Counter: {order.shopPhone}</span>
            </a>
          </div>
        </div>

        {/* 2-Column Layout: Timeline (left) and Receipt / Summary (right) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <TrackingTimeline status={order.status} paymentStatus={order.paymentStatus} />
          <DigitalReceipt order={order} />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white py-6 text-center text-xs text-slate-400">
        <p>© 2026 Print Bro. Live Real-Time Customer Order Tracking.</p>
      </footer>
    </div>
  );
}

