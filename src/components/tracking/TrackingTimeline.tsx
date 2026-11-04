'use client';

import React from 'react';
import { 
  CheckCircle2, 
  Clock, 
  Printer, 
  Store, 
  ShieldCheck, 
  AlertCircle,
  FileText
} from 'lucide-react';

interface TimelineProps {
  status: string;
  paymentStatus: string;
}

export function TrackingTimeline({ status, paymentStatus }: TimelineProps) {
  // Define the canonical 6-stage workflow
  // Order status workflow: UPLOADED → CONFIGURED → PAYMENT_PENDING → PAID → QUEUED → PRINTING → COMPLETED
  const stages = [
    { key: 'UPLOADED', label: 'Document Uploaded', desc: 'Securely received by Print Bro', icon: FileText },
    { key: 'CONFIGURED', label: 'Printing Configured', desc: 'Paper, duplex & color settings locked', icon: ShieldCheck },
    { key: 'PAID', label: 'Payment Successful', desc: 'Payment verified via gateway', icon: CheckCircle2 },
    { key: 'QUEUED', label: 'Received by Shop', desc: 'Added to shop counter queue', icon: Store },
    { key: 'PRINTING', label: 'Printing in Progress', desc: 'Transmitted to physical printer spooler', icon: Printer },
    { key: 'COMPLETED', label: 'Printing Completed', desc: 'Ready for pickup at the counter', icon: CheckCircle2 },
  ];

  const getStageIndex = (currentStatus: string) => {
    switch (currentStatus) {
      case 'UPLOADED':
        return 0;
      case 'CONFIGURED':
      case 'PAYMENT_PENDING':
        return 1;
      case 'PAID':
        return 2;
      case 'QUEUED':
        return 3;
      case 'PRINTING':
        return 4;
      case 'COMPLETED':
        return 5;
      default:
        return 2;
    }
  };

  const currentIndex = getStageIndex(status);
  const isFailed = status === 'FAILED' || status === 'CANCELLED';

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Live Order Status Timeline</h2>
          <p className="text-xs text-slate-500">Real-time updates via secure background sync</p>
        </div>
        {status === 'COMPLETED' ? (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center space-x-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Ready for Pickup</span>
          </span>
        ) : isFailed ? (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 flex items-center space-x-1">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{status}</span>
          </span>
        ) : (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 animate-pulse flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Processing</span>
          </span>
        )}
      </div>

      {/* Stepper Timeline List */}
      <div className="space-y-6 relative before:absolute before:inset-0 before:left-5 before:h-full before:w-0.5 before:bg-slate-200">
        {stages.map((stage, idx) => {
          const isDone = idx <= currentIndex;
          const isCurrent = idx === currentIndex;
          const Icon = stage.icon;

          let iconBg = 'bg-slate-100 text-slate-400 border-slate-200';
          let textColor = 'text-slate-400';
          let descColor = 'text-slate-400';

          if (isDone) {
            iconBg = 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20';
            textColor = 'text-slate-900 font-bold';
            descColor = 'text-slate-600';
          }
          if (isCurrent && !isFailed && status !== 'COMPLETED') {
            iconBg = 'bg-blue-600 text-white border-blue-600 ring-4 ring-blue-100 animate-bounce';
          }
          if (idx === 5 && status === 'COMPLETED') {
            iconBg = 'bg-emerald-600 text-white border-emerald-600 ring-4 ring-emerald-100';
            textColor = 'text-emerald-700 font-black';
            descColor = 'text-emerald-600';
          }

          return (
            <div key={stage.key} className="flex items-start space-x-4 relative">
              <div className={`w-10 h-10 rounded-2xl border-2 flex items-center justify-center shrink-0 z-10 transition-all ${iconBg}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="pt-1">
                <p className={`text-sm tracking-tight ${textColor}`}>{stage.label}</p>
                <p className={`text-xs ${descColor}`}>{stage.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
