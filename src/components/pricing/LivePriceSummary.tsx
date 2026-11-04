'use client';

import React from 'react';
import { UploadedDoc } from '../upload/DocumentDropzone';
import { calculateOrderTotal, ShopPricingRates } from '@/lib/pricing';
import { IndianRupee, Tag, ShieldCheck, Zap } from 'lucide-react';

interface PricingProps {
  documents: UploadedDoc[];
  rates: ShopPricingRates;
  onProceedToCheckout: () => void;
  isSubmitting?: boolean;
}

export function LivePriceSummary({
  documents,
  rates,
  onProceedToCheckout,
  isSubmitting,
}: PricingProps) {
  const configs = documents.map((doc) => ({
    pageCount: doc.pageCount,
    copies: doc.config.copies,
    colorMode: doc.config.colorMode,
    sides: doc.config.sides,
    paperSize: doc.config.paperSize,
    nUp: doc.config.nUp,
  }));

  const orderTotal = calculateOrderTotal(configs, rates, rates.serviceFee || 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h3 className="font-bold text-slate-900 text-base">Live Price Breakdown</h3>
        <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
          Shop Verified Rates
        </span>
      </div>

      {documents.length === 0 ? (
        <p className="text-xs text-slate-400 py-4 text-center">
          Upload documents to calculate printing total
        </p>
      ) : (
        <div className="space-y-3">
          {documents.map((doc, idx) => {
            const breakdown = orderTotal.jobBreakdowns[idx];
            if (!breakdown) return null;

            return (
              <div key={doc.id} className="text-xs border-b border-slate-50 pb-2 space-y-1">
                <div className="flex items-center justify-between font-semibold text-slate-800">
                  <span className="truncate max-w-[200px]">{doc.name}</span>
                  <span>₹{breakdown.total.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>
                    {doc.config.colorMode} • {doc.config.sides} • {doc.config.paperSize}
                    {doc.config.nUp > 1 ? ` (${doc.config.nUp}-up)` : ''}
                  </span>
                  <span>
                    {breakdown.printedSheets} sheet{breakdown.printedSheets > 1 ? 's' : ''} × {doc.config.copies} cop{doc.config.copies > 1 ? 'ies' : 'y'}
                  </span>
                </div>
              </div>
            );
          })}

          <div className="pt-2 space-y-1.5 text-xs text-slate-600">
            <div className="flex items-center justify-between">
              <span>Subtotal</span>
              <span>₹{orderTotal.subtotal.toFixed(2)}</span>
            </div>
            {orderTotal.serviceFee > 0 && (
              <div className="flex items-center justify-between text-slate-500">
                <span>Shop Service Fee</span>
                <span>₹{orderTotal.serviceFee.toFixed(2)}</span>
              </div>
            )}
            {orderTotal.minOrderFloorApplied && (
              <div className="flex items-center justify-between text-amber-600 text-[11px]">
                <span>Min Order Amount Applied</span>
                <span>₹{rates.minOrderAmount.toFixed(2)}</span>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <div>
              <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Payable</span>
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                ₹{orderTotal.finalAmount.toFixed(2)}
              </span>
            </div>

            <button
              onClick={onProceedToCheckout}
              disabled={isSubmitting || documents.length === 0}
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center space-x-1.5"
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>{isSubmitting ? 'Processing...' : 'Pay & Print Now'}</span>
            </button>
          </div>
        </div>
      )}

      <div className="pt-2 flex items-center justify-center space-x-2 text-[11px] text-slate-400">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
        <span>Instant UPI / Card Checkout • Zero Registration Required</span>
      </div>
    </div>
  );
}

