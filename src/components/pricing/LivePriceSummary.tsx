'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadedDoc } from '../upload/DocumentDropzone';
import { calculateOrderTotal, ShopPricingRates } from '@/lib/pricing';
import { IndianRupee, Tag, ShieldCheck, Zap, Sparkles } from 'lucide-react';
import { sounds } from '@/lib/sound-effects';

interface PricingProps {
  documents: UploadedDoc[];
  rates: ShopPricingRates;
  onProceedToCheckout: () => void;
  isSubmitting?: boolean;
  submittingText?: string | null;
  isCombinedMultiUp?: boolean;
  isMergedDocument?: boolean;
}

export function LivePriceSummary({
  documents,
  rates,
  onProceedToCheckout,
  isSubmitting,
  submittingText,
  isCombinedMultiUp = false,
  isMergedDocument = false,
}: PricingProps) {
  const isCombined = isCombinedMultiUp && documents.length > 1;
  const isMerged = isMergedDocument && !isCombinedMultiUp && documents.length > 1;
  const firstDoc = documents[0];
  const combinedNUp = firstDoc?.config?.nUp || 9;
  const combinedSheets = Math.ceil(documents.length / combinedNUp);
  const totalCombinedPages = documents.reduce((sum, d) => sum + (d.pageCount || 1), 0);

  const configs = isCombined
    ? [
        {
          pageCount: documents.length,
          copies: firstDoc?.config?.copies || 1,
          colorMode: firstDoc?.config?.colorMode || 'BW',
          sides: firstDoc?.config?.sides || 'SINGLE',
          paperSize: firstDoc?.config?.paperSize || 'A4',
          nUp: combinedNUp,
        },
      ]
    : isMerged
    ? [
        {
          pageCount: totalCombinedPages,
          copies: firstDoc?.config?.copies || 1,
          colorMode: firstDoc?.config?.colorMode || 'BW',
          sides: firstDoc?.config?.sides || 'SINGLE',
          paperSize: firstDoc?.config?.paperSize || 'A4',
          nUp: firstDoc?.config?.nUp || 1,
        },
      ]
    : documents.map((doc) => ({
        pageCount: doc.pageCount,
        copies: doc.config.copies,
        colorMode: doc.config.colorMode,
        sides: doc.config.sides,
        paperSize: doc.config.paperSize,
        nUp: doc.config.nUp,
      }));

  const orderTotal = calculateOrderTotal(configs, rates, rates.serviceFee || 0);

  const handleCheckoutClick = () => {
    sounds.playSuccess();
    onProceedToCheckout();
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="glass-card rounded-3xl p-6 space-y-4 relative overflow-hidden"
    >
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <IndianRupee className="w-4 h-4" />
          </div>
          <h3 className="font-black text-slate-900 text-base">Live Price Summary</h3>
        </div>
        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full flex items-center space-x-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Verified Shop Rates</span>
        </span>
      </div>

      {documents.length === 0 ? (
        <div className="py-8 text-center space-y-2">
          <p className="text-xs text-slate-400">
            Upload documents above to see real-time price calculation
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="wait">
            {isCombined ? (
              <motion.div 
                key="combined"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-xs border-b border-slate-100 pb-2 space-y-1"
              >
                <div className="flex items-center justify-between font-bold text-slate-900">
                  <span className="truncate max-w-[200px]">Collab Mode ({documents.length} photos on 1 sheet)</span>
                  <span className="font-mono text-sm">₹{orderTotal.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>
                    {firstDoc?.config?.colorMode === 'BW' ? 'B&W' : 'Colour'} • {firstDoc?.config?.sides} • Collab grid on A4
                  </span>
                  <span className="font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                    {combinedSheets} sheet{combinedSheets > 1 ? 's' : ''} • Save fee
                  </span>
                </div>
              </motion.div>
            ) : isMerged ? (
              <motion.div 
                key="merged"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-xs border-b border-slate-100 pb-2 space-y-1"
              >
                <div className="flex items-center justify-between font-bold text-slate-900">
                  <span className="truncate max-w-[200px]">Merged Document ({documents.length} files)</span>
                  <span className="font-mono text-sm">₹{orderTotal.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>
                    {firstDoc?.config?.colorMode} • {firstDoc?.config?.sides} • {totalCombinedPages} pages total
                  </span>
                  <span>
                    {orderTotal.jobBreakdowns[0]?.printedSheets || totalCombinedPages} sheet{(orderTotal.jobBreakdowns[0]?.printedSheets || totalCombinedPages) > 1 ? 's' : ''} × {firstDoc?.config?.copies || 1} cop{(firstDoc?.config?.copies || 1) > 1 ? 'ies' : 'y'}
                  </span>
                </div>
              </motion.div>
            ) : (
              documents.map((doc, idx) => {
                const breakdown = orderTotal.jobBreakdowns[idx];
                if (!breakdown) return null;

                return (
                  <motion.div 
                    key={doc.id} 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs border-b border-slate-100 pb-2 space-y-1"
                  >
                    <div className="flex items-center justify-between font-bold text-slate-900">
                      <span className="truncate max-w-[200px]">{doc.name}</span>
                      <span className="font-mono">₹{breakdown.total.toFixed(2)}</span>
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
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>

          <div className="pt-2 space-y-1.5 text-xs text-slate-600 font-medium">
            <div className="flex items-center justify-between">
              <span>Printing Subtotal</span>
              <span className="font-mono font-bold text-slate-800">₹{orderTotal.subtotal.toFixed(2)}</span>
            </div>
            {orderTotal.serviceFee > 0 && (
              <div className="flex items-center justify-between text-slate-500">
                <span>Handling / Convenience Fee</span>
                <span className="font-mono">₹{orderTotal.serviceFee.toFixed(2)}</span>
              </div>
            )}
            {orderTotal.minOrderFloorApplied && (
              <div className="flex items-center justify-between text-amber-700 bg-amber-50 p-2 rounded-xl text-[11px] font-bold border border-amber-200/80">
                <span>Minimum Order Floor Applied</span>
                <span className="font-mono">₹{rates.minOrderAmount.toFixed(2)}</span>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <div>
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Payable</span>
              <motion.span 
                key={orderTotal.finalAmount}
                initial={{ scale: 0.95, opacity: 0.8 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-3xl font-black text-slate-900 tracking-tight font-mono"
              >
                ₹{orderTotal.finalAmount.toFixed(2)}
              </motion.span>
            </div>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleCheckoutClick}
              disabled={isSubmitting || documents.length === 0}
              className="px-7 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-sky-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-sm transition shadow-lg shadow-blue-500/30 disabled:opacity-50 flex items-center space-x-2 cursor-pointer relative overflow-hidden group"
            >
              <div className="absolute inset-0 w-1/2 h-full bg-white/20 skew-x-12 -translate-x-full group-hover:translate-x-[300%] transition-transform duration-1000 ease-in-out" />
              <Zap className="w-4 h-4 fill-white" />
              <span>{isSubmitting ? (submittingText || 'Sending to Printer...') : 'Pay & Print Instantly'}</span>
            </motion.button>
          </div>
        </div>
      )}

      <div className="pt-2 flex items-center justify-center space-x-2 text-[11px] text-slate-400 font-medium">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
        <span>Instant Silent Hardware Spooling • 100% Zero-Touch</span>
      </div>
    </motion.div>
  );
}
