'use client';

import React from 'react';
import { Download, Printer, CheckCircle } from 'lucide-react';

interface ReceiptProps {
  order: any;
}

export function DigitalReceipt({ order }: ReceiptProps) {
  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Digital Tax Receipt</h3>
          <p className="text-xs text-slate-500">Official Xerox Proof of Payment</p>
        </div>
        <button
          onClick={handlePrintReceipt}
          className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition flex items-center space-x-1.5"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print Receipt</span>
        </button>
      </div>

      <div className="bg-slate-50 rounded-2xl p-4 sm:p-6 font-mono text-xs text-slate-700 space-y-3 border border-slate-200/60">
        <div className="flex items-center justify-between border-b border-dashed border-slate-300 pb-3">
          <div>
            <span className="font-bold text-slate-900 block text-sm">{order.shopName}</span>
            <span className="text-[11px] text-slate-500">{order.shopAddress}</span>
            <span className="text-[11px] text-slate-500 block">Phone: {order.shopPhone}</span>
          </div>
          <div className="text-right">
            <span className="font-bold text-blue-600 block text-sm">{order.jobId}</span>
            <span className="text-[10px] text-slate-400">{new Date(order.createdAt).toLocaleString()}</span>
          </div>
        </div>

        <div className="space-y-1.5 py-2">
          {order.documents?.map((doc: any, i: number) => {
            const job = order.jobs?.[i];
            return (
              <div key={doc.id} className="flex items-center justify-between">
                <div>
                  <span className="font-semibold">{doc.name}</span>
                  <span className="text-[10px] text-slate-500 block">
                    {doc.pages} pages • {job?.colorMode} • {job?.sides} • {job?.copies}x
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-dashed border-slate-300 pt-3 space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px]">
            <span>Payment Status</span>
            <span className="text-emerald-600 font-bold uppercase">{order.paymentStatus}</span>
          </div>
          <div className="flex items-center justify-between text-slate-500 text-[11px]">
            <span>Transaction ID</span>
            <span>{order.transactionId || 'TXN_VERIFIED'}</span>
          </div>
          <div className="flex items-center justify-between font-bold text-sm text-slate-900 pt-1">
            <span>Total Paid</span>
            <span>₹{order.totalAmount?.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

