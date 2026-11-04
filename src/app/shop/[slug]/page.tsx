'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Printer, 
  Store, 
  MapPin, 
  Phone, 
  Clock, 
  Zap, 
  ShieldCheck, 
  ChevronRight, 
  FileText,
  AlertCircle
} from 'lucide-react';
import { DocumentDropzone, UploadedDoc } from '@/components/upload/DocumentDropzone';
import { PdfLivePreview } from '@/components/preview/PdfLivePreview';
import { LivePriceSummary } from '@/components/pricing/LivePriceSummary';

export default function CustomerShopPortal() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [shopData, setShopData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Customer documents & active selection
  const [documents, setDocuments] = useState<UploadedDoc[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  // Customer optional details
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadShop() {
      try {
        setLoading(true);
        const res = await fetch(`/api/shops/${slug}`);
        if (!res.ok) {
          throw new Error('This shop is currently inactive or does not exist.');
        }
        const data = await res.json();
        setShopData(data.shop);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    if (slug) {
      loadShop();
    }
  }, [slug]);

  const selectedDoc = documents.find((d) => d.id === selectedDocId) || null;

  const updateSelectedDocConfig = (partialConfig: Partial<UploadedDoc['config']>) => {
    if (!selectedDocId) return;
    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id === selectedDocId) {
          return {
            ...doc,
            config: {
              ...doc.config,
              ...partialConfig,
            },
          };
        }
        return doc;
      })
    );
  };

  const handleCheckout = async () => {
    if (documents.length === 0) return;

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/orders/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopSlug: slug,
          customerName: customerName.trim() || 'Walk-in Customer',
          customerPhone: customerPhone.trim() || undefined,
          notes: notes.trim() || undefined,
          jobs: documents.map((doc) => ({
            documentName: doc.name,
            pageCount: doc.pageCount,
            fileSize: doc.size,
            copies: doc.config.copies,
            colorMode: doc.config.colorMode,
            sides: doc.config.sides,
            orientation: doc.config.orientation,
            paperSize: doc.config.paperSize,
            pageRange: doc.config.pageRange,
            nUp: doc.config.nUp,
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Checkout error: ${err.error}`);
        return;
      }

      const { order } = await res.json();
      // Redirect to live order tracking view
      router.push(`/track/${order.jobId}`);
    } catch (err) {
      console.error(err);
      alert('Failed to initiate order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-slate-600">Connecting to shop...</p>
        </div>
      </div>
    );
  }

  if (error || !shopData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 text-center shadow-sm space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 mx-auto flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Shop Unavailable</h2>
          <p className="text-sm text-slate-500">{error || 'This Xerox shop is currently offline.'}</p>
          <Link
            href="/"
            className="inline-block mt-4 px-5 py-2.5 rounded-xl bg-slate-900 text-white font-medium text-sm hover:bg-slate-800 transition"
          >
            Return to Print Bro Home
          </Link>
        </div>
      </div>
    );
  }

  const pricingRates = shopData.pricing || {
    bwSingle: 2.0,
    bwDuplex: 1.5,
    colorSingle: 10.0,
    colorDuplex: 9.0,
    a3Multiplier: 2.0,
    a5Multiplier: 0.8,
    letterMultiplier: 1.0,
    legalMultiplier: 1.2,
    minOrderAmount: 5.0,
    serviceFee: 0.0,
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Shop Branding Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 font-bold text-lg">
              {shopData.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  {shopData.name}
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
                  Online
                </span>
              </div>
              <p className="text-xs text-slate-500 flex items-center space-x-2">
                <span className="flex items-center"><MapPin className="w-3 h-3 mr-0.5 text-slate-400" /> {shopData.city}</span>
                <span>•</span>
                <span className="flex items-center"><Clock className="w-3 h-3 mr-0.5 text-slate-400" /> {shopData.printMode === 'AUTO' ? 'Express Auto-Print' : 'Counter Print'}</span>
              </p>
            </div>
          </div>

          <div className="text-right hidden sm:block">
            <span className="text-xs text-slate-400">Powered by</span>
            <span className="block font-bold text-sm text-slate-800">Print <span className="text-blue-600">Bro</span></span>
          </div>
        </div>
      </header>

      {/* Main 3-Step Customer Printing Workflow */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 space-y-8">
        {/* Step Indicator Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center space-x-2 sm:space-x-4 text-xs sm:text-sm font-semibold">
            <span className="flex items-center text-blue-600">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs mr-1.5">1</span>
              Upload
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
            <span className={`flex items-center ${documents.length > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs mr-1.5 ${documents.length > 0 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>2</span>
              Configure & Preview
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
            <span className="flex items-center text-slate-400">
              <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs mr-1.5">3</span>
              Instant Pay
            </span>
          </div>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Upload & Live Preview (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Step 1: Document Dropzone */}
            <DocumentDropzone
              documents={documents}
              onDocumentsChange={setDocuments}
              selectedDocId={selectedDocId}
              onSelectDoc={setSelectedDocId}
            />

            {/* Step 2: Live Preview */}
            {documents.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800">WYSIWYG Live Preview</h3>
                  <span className="text-[11px] text-slate-500">Updates dynamically with settings</span>
                </div>
                <PdfLivePreview
                  document={selectedDoc}
                  onConfigChange={(newCfg) => updateSelectedDocConfig(newCfg)}
                />
              </div>
            )}
          </div>

          {/* Right Column: Print Configuration & Price Calculation (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {selectedDoc ? (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-5">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-slate-900 text-base">Print Configuration</h3>
                  <p className="text-xs text-slate-500">Fine-tune settings for <span className="font-semibold text-slate-700">{selectedDoc.name}</span></p>
                </div>

                {/* Color Mode Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Color Mode</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => updateSelectedDocConfig({ colorMode: 'BW' })}
                      className={`p-3 rounded-xl border text-xs font-bold text-left transition flex items-center justify-between ${
                        selectedDoc.config.colorMode === 'BW'
                          ? 'border-blue-600 bg-blue-50/50 text-blue-700 ring-1 ring-blue-600'
                          : 'border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <span>Black & White</span>
                      <span className="text-[10px] text-slate-500 font-normal">₹{pricingRates.bwSingle}/side</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateSelectedDocConfig({ colorMode: 'COLOR' })}
                      className={`p-3 rounded-xl border text-xs font-bold text-left transition flex items-center justify-between ${
                        selectedDoc.config.colorMode === 'COLOR'
                          ? 'border-blue-600 bg-blue-50/50 text-blue-700 ring-1 ring-blue-600'
                          : 'border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-rose-600">Full Colour</span>
                      <span className="text-[10px] text-slate-500 font-normal">₹{pricingRates.colorSingle}/side</span>
                    </button>
                  </div>
                </div>

                {/* Print Sides (Single vs Duplex) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Sides</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => updateSelectedDocConfig({ sides: 'SINGLE' })}
                      className={`p-3 rounded-xl border text-xs font-bold text-left transition flex items-center justify-between ${
                        selectedDoc.config.sides === 'SINGLE'
                          ? 'border-blue-600 bg-blue-50/50 text-blue-700 ring-1 ring-blue-600'
                          : 'border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <span>Single-Sided</span>
                      <span className="text-[10px] text-slate-500 font-normal">1 sheet/page</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateSelectedDocConfig({ sides: 'DUPLEX' })}
                      className={`p-3 rounded-xl border text-xs font-bold text-left transition flex items-center justify-between ${
                        selectedDoc.config.sides === 'DUPLEX'
                          ? 'border-blue-600 bg-blue-50/50 text-blue-700 ring-1 ring-blue-600'
                          : 'border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <span>Double-Sided (Duplex)</span>
                      <span className="text-[10px] text-emerald-600 font-semibold">Save paper</span>
                    </button>
                  </div>
                </div>

                {/* Layout & Paper Size */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Paper Size</label>
                    <select
                      value={selectedDoc.config.paperSize}
                      onChange={(e) => updateSelectedDocConfig({ paperSize: e.target.value as any })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                    >
                      <option value="A4">A4 (Standard)</option>
                      <option value="A3">A3 (Large Poster)</option>
                      <option value="A5">A5 (Compact)</option>
                      <option value="LETTER">US Letter</option>
                      <option value="LEGAL">Legal Document</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Orientation</label>
                    <select
                      value={selectedDoc.config.orientation}
                      onChange={(e) => updateSelectedDocConfig({ orientation: e.target.value as any })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                    >
                      <option value="PORTRAIT">Portrait</option>
                      <option value="LANDSCAPE">Landscape</option>
                      <option value="AUTO">Auto Detect</option>
                    </select>
                  </div>
                </div>

                {/* Pages Per Sheet (N-up Imposition) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Pages Per Sheet (Multi-Up)</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 4, 6].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => updateSelectedDocConfig({ nUp: num })}
                        className={`py-2 px-1 rounded-xl border text-xs font-bold text-center transition ${
                          selectedDoc.config.nUp === num
                            ? 'border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600'
                            : 'border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {num === 1 ? '1-up' : `${num}-up`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Page Range & Copies */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Page Selection</label>
                    <input
                      type="text"
                      placeholder="e.g. 1-5, 8"
                      value={selectedDoc.config.pageRange}
                      onChange={(e) => updateSelectedDocConfig({ pageRange: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Copies</label>
                    <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                      <button
                        type="button"
                        onClick={() => updateSelectedDocConfig({ copies: Math.max(1, selectedDoc.config.copies - 1) })}
                        className="px-3 py-2 text-slate-600 hover:bg-slate-200 font-bold text-xs"
                      >
                        -
                      </button>
                      <span className="flex-1 text-center font-bold text-xs text-slate-800">
                        {selectedDoc.config.copies}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateSelectedDocConfig({ copies: selectedDoc.config.copies + 1 })}
                        className="px-3 py-2 text-slate-600 hover:bg-slate-200 font-bold text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Optional Customer Information */}
            {documents.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Customer Details (Optional)
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Your Name (for pickup)"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="tel"
                    placeholder="Mobile (for SMS update)"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Special instructions (e.g. spiral binding, staple top left)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>
            )}

            {/* Dynamic Live Price Breakdown & Checkout Action */}
            <LivePriceSummary
              documents={documents}
              rates={pricingRates}
              onProceedToCheckout={handleCheckout}
              isSubmitting={isSubmitting}
            />
          </div>
        </div>
      </main>

      {/* Customer Footer */}
      <footer className="border-t bg-white py-6 mt-12 text-center text-xs text-slate-400">
        <p>© 2026 Print Bro. Dedicated Xerox Tenant for {shopData.name}. All prints processed securely.</p>
      </footer>
    </div>
  );
}
