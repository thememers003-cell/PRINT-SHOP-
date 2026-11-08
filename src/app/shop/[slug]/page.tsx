'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
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
  AlertCircle,
  Grid,
  Layers
} from 'lucide-react';
import { DocumentDropzone, UploadedDoc } from '@/components/upload/DocumentDropzone';
import { PdfLivePreview } from '@/components/preview/PdfLivePreview';
import { LivePriceSummary } from '@/components/pricing/LivePriceSummary';
import { PrintBroLogo } from '@/components/brand/PrintBroLogo';
import { sounds } from '@/lib/sound-effects';

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
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [isCombinedMultiUp, setIsCombinedMultiUp] = useState(false);
  const [isMergedDocument, setIsMergedDocument] = useState(true);

  // Customer optional details
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);

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

  const selectedDoc = documents.find((d) => d.id === selectedDocId) || documents[0] || null;

  const handleDocumentsChange = (newDocs: UploadedDoc[]) => {
    setDocuments(newDocs);
    if (newDocs.length > 0) {
      if (!selectedDocId || !newDocs.some((d) => d.id === selectedDocId)) {
        setSelectedDocId(newDocs[0].id);
      }
      // Keep multi-selection synchronized: select all by default
      setSelectedDocIds(newDocs.map((d) => d.id));
    } else {
      setSelectedDocId(null);
      setSelectedDocIds([]);
    }
  };

  const handleToggleSelectDoc = (id: string) => {
    sounds.playTap();
    setSelectedDocIds((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((dId) => dId !== id);
        return next.length > 0 ? next : [id];
      } else {
        return [...prev, id];
      }
    });
  };

  const handleSelectAll = () => {
    sounds.playTap();
    setSelectedDocIds((prev) => (prev.length === documents.length ? [] : documents.map((d) => d.id)));
  };

  const updateSelectedDocConfig = (partialConfig: Partial<UploadedDoc['config']>) => {
    sounds.playTap();
    const targetIds = selectedDocIds.length > 0 ? selectedDocIds : selectedDocId ? [selectedDocId] : [];
    if (targetIds.length === 0) return;

    setDocuments((prev) =>
      prev.map((doc) => {
        if (targetIds.includes(doc.id)) {
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

      // 1. Upload actual document files to server
      const uploadedJobs = [];
      for (const doc of documents) {
        let storageUrl = `/uploads/${slug}/${doc.name}`;
        let mimeType = doc.type || (doc.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');

        if (doc.file) {
          try {
            setSubmitStatus(`Uploading ${doc.name}...`);
            const formData = new FormData();
            formData.append('file', doc.file);
            formData.append('shopSlug', slug);

            const upRes = await fetch('/api/upload', {
              method: 'POST',
              body: formData,
            });

            if (upRes.ok) {
              const upData = await upRes.json();
              storageUrl = upData.storageUrl;
              if (upData.mimeType) mimeType = upData.mimeType;
            }
          } catch (uploadErr) {
            console.error('File upload error for', doc.name, uploadErr);
          }
        }

        uploadedJobs.push({
          documentName: doc.name,
          pageCount: doc.pageCount,
          fileSize: doc.size,
          storageUrl,
          mimeType,
          copies: doc.config.copies,
          colorMode: doc.config.colorMode,
          sides: doc.config.sides,
          orientation: doc.config.orientation,
          paperSize: doc.config.paperSize,
          pageRange: doc.config.pageRange,
          nUp: doc.config.nUp,
        });
      }

      // Check if multi-document merge or Collab mode is active
      let finalJobs: any[] = uploadedJobs;

      if (isCombinedMultiUp && documents.length > 1) {
        // Collab mode: all photos on 1 sheet in N-up grid
        finalJobs = [
          {
            documentName: `Combined_${documents.length}_Photos_${selectedDoc?.config.nUp || 9}up.pdf`,
            pageCount: Math.ceil(documents.length / (selectedDoc?.config.nUp || 9)),
            fileSize: uploadedJobs.reduce((sum, j) => sum + (j.fileSize || 0), 0),
            storageUrls: uploadedJobs.map((j) => j.storageUrl),
            mimeType: 'application/pdf',
            copies: selectedDoc?.config.copies || 1,
            colorMode: selectedDoc?.config.colorMode || 'BW',
            sides: selectedDoc?.config.sides || 'SINGLE',
            orientation: selectedDoc?.config.orientation || 'PORTRAIT',
            paperSize: selectedDoc?.config.paperSize || 'A4',
            nUp: selectedDoc?.config.nUp || 9,
            pageRange: 'all',
          },
        ];
      } else if (isMergedDocument && documents.length > 1) {
        // Sequential Merge: Combines all uploaded PDFs and photos into 1 continuous multi-page PDF
        const totalPages = uploadedJobs.reduce((sum, j) => sum + (j.pageCount || 1), 0);
        finalJobs = [
          {
            documentName: `Merged_${documents.length}_Documents.pdf`,
            pageCount: totalPages,
            fileSize: uploadedJobs.reduce((sum, j) => sum + (j.fileSize || 0), 0),
            storageUrls: uploadedJobs.map((j) => j.storageUrl),
            isSequentialMerge: true,
            mimeType: 'application/pdf',
            copies: selectedDoc?.config.copies || 1,
            colorMode: selectedDoc?.config.colorMode || 'BW',
            sides: selectedDoc?.config.sides || 'SINGLE',
            orientation: selectedDoc?.config.orientation || 'PORTRAIT',
            paperSize: selectedDoc?.config.paperSize || 'A4',
            nUp: 1,
            pageRange: 'all',
          },
        ];
      }

      // 2. Submit Order Checkout
      const res = await fetch('/api/orders/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopSlug: slug,
          customerName: customerName.trim() || 'Walk-in Customer',
          customerPhone: customerPhone.trim() || undefined,
          notes: notes.trim() || undefined,
          jobs: finalJobs,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Checkout error: ${err.error}`);
        return;
      }

      const { order } = await res.json();
      sounds.playSuccess();
      try {
        confetti({
          particleCount: 90,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#2563eb', '#38bdf8', '#6366f1', '#10b981', '#f59e0b']
        });
      } catch {}
      // Redirect to live order tracking view
      router.push(`/track/${order.jobId}`);
    } catch (err) {
      console.error(err);
      alert('Failed to initiate order. Please try again.');
    } finally {
      setIsSubmitting(false);
      setSubmitStatus(null);
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
    minOrderAmount: 0.0,
    serviceFee: 0.0,
  };

  return (
    <div className="min-h-screen ambient-bg flex flex-col font-sans selection:bg-blue-500 selection:text-white">
      {/* Shop Branding Header */}
      <header className="glass-card sticky top-0 z-40 border-b border-slate-200/80 shadow-2xs">
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
            <PrintBroLogo size="sm" showTagline />
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
              onDocumentsChange={handleDocumentsChange}
              selectedDocId={selectedDocId}
              onSelectDoc={setSelectedDocId}
              selectedDocIds={selectedDocIds}
              onToggleSelectDoc={handleToggleSelectDoc}
              onSelectAll={handleSelectAll}
            />

            {/* Step 2: Live Preview */}
            {documents.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800">WYSIWYG Live Preview</h3>
                  <span className="text-[11px] text-slate-500">
                    {isCombinedMultiUp && documents.length > 1
                      ? `Viewing all ${documents.length} photos combined in 1 sheet`
                      : isMergedDocument && documents.length > 1
                        ? `Viewing all ${documents.length} files merged into 1 continuous document`
                        : 'Updates dynamically with settings'}
                  </span>
                </div>
                <PdfLivePreview
                  document={selectedDoc}
                  onConfigChange={(newCfg) => updateSelectedDocConfig(newCfg)}
                  allDocuments={documents}
                  isCombinedMultiUp={isCombinedMultiUp}
                  isMergedDocument={isMergedDocument}
                />
              </div>
            )}
          </div>

          {/* Right Column: Print Configuration & Price Calculation (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Multi-Document Strategy (Merge vs Collab) */}
            {documents.length > 1 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card rounded-3xl p-5 shadow-xs space-y-3.5 border border-blue-100"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                      {documents.length}
                    </div>
                    <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                      Multi-File Strategy
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200/80 px-2.5 py-0.5 rounded-full flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                    <span>{isCombinedMultiUp ? '✓ Collab Active' : '✓ Merged Active'}</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Mode 1: Merge All into 1 PDF */}
                  <motion.button
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => {
                      sounds.playToggle();
                      setIsMergedDocument(true);
                      setIsCombinedMultiUp(false);
                      updateSelectedDocConfig({ nUp: 1 });
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between cursor-pointer relative overflow-hidden ${
                      isMergedDocument && !isCombinedMultiUp
                        ? 'border-blue-600 bg-gradient-to-b from-blue-50/90 to-sky-50/60 ring-2 ring-blue-500/20 text-blue-900 shadow-xs'
                        : 'border-slate-200/90 hover:border-slate-300 text-slate-700 bg-slate-50/60 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-1.5">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold ${
                        isMergedDocument && !isCombinedMultiUp ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-200 text-slate-700'
                      }`}>
                        <Layers className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-black">Merge All into 1 PDF</span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-snug">
                      Combine all {documents.length} files sequentially in 1 PDF document
                    </p>
                  </motion.button>

                  {/* Mode 2: Collab (Combine Photos on 1 Sheet) */}
                  <motion.button
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => {
                      sounds.playToggle();
                      setIsCombinedMultiUp(true);
                      setIsMergedDocument(false);
                      const optimal = documents.length <= 2 ? 2 : documents.length <= 4 ? 4 : documents.length <= 6 ? 6 : 9;
                      updateSelectedDocConfig({ nUp: optimal });
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between cursor-pointer relative overflow-hidden ${
                      isCombinedMultiUp
                        ? 'border-blue-600 bg-gradient-to-b from-blue-50/90 to-sky-50/60 ring-2 ring-blue-500/20 text-blue-900 shadow-xs'
                        : 'border-slate-200/90 hover:border-slate-300 text-slate-700 bg-slate-50/60 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-1.5">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold ${
                        isCombinedMultiUp ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-200 text-slate-700'
                      }`}>
                        <Grid className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-black">Collab on 1 Sheet</span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-snug">
                      Grid collage on 1 single sheet • Pay only 1 sheet fee
                    </p>
                  </motion.button>
                </div>
              </motion.div>
            )}

            {selectedDoc ? (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="glass-card rounded-3xl p-6 shadow-sm space-y-6"
              >
                <div className="border-b border-slate-100 pb-3 flex items-start justify-between">
                  <div>
                    <h3 className="font-black text-slate-900 text-base tracking-tight">Print Configuration</h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {selectedDocIds.length > 1 ? (
                        <span className="font-bold text-blue-600">
                          Applying settings across all {selectedDocIds.length} selected files
                        </span>
                      ) : (
                        <>Fine-tune settings for <span className="font-bold text-slate-800">{selectedDoc.name}</span></>
                      )}
                    </p>
                  </div>
                  {documents.length > 1 && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      onClick={handleSelectAll}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl transition cursor-pointer shadow-2xs"
                    >
                      {selectedDocIds.length === documents.length ? 'Deselect All' : `Select All (${documents.length})`}
                    </motion.button>
                  )}
                </div>

                {/* Color Mode Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700">Color Mode</label>
                  <div className="grid grid-cols-2 gap-3">
                    <motion.button
                      whileHover={{ scale: 1.015 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={() => updateSelectedDocConfig({ colorMode: 'BW' })}
                      className={`p-3.5 rounded-2xl border text-xs font-bold text-left transition-all duration-200 flex items-center justify-between cursor-pointer ${
                        selectedDoc.config.colorMode === 'BW'
                          ? 'border-slate-900 bg-slate-900 text-white shadow-md ring-2 ring-slate-900/10'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className={`w-3.5 h-3.5 rounded-full border ${selectedDoc.config.colorMode === 'BW' ? 'bg-white border-white' : 'bg-slate-400 border-slate-500'}`}></span>
                        <span>Black &amp; White</span>
                      </div>
                      <span className={`text-[10px] font-semibold font-mono ${selectedDoc.config.colorMode === 'BW' ? 'text-slate-300' : 'text-slate-500'}`}>
                        ₹{pricingRates.bwSingle}/side
                      </span>
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.015 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={() => updateSelectedDocConfig({ colorMode: 'COLOR' })}
                      className={`p-3.5 rounded-2xl border text-xs font-bold text-left transition-all duration-200 flex items-center justify-between cursor-pointer ${
                        selectedDoc.config.colorMode === 'COLOR'
                          ? 'border-blue-600 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md ring-2 ring-blue-500/20'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-500 shadow-2xs"></span>
                        <span>Full Colour</span>
                      </div>
                      <span className={`text-[10px] font-semibold font-mono ${selectedDoc.config.colorMode === 'COLOR' ? 'text-blue-100' : 'text-slate-500'}`}>
                        ₹{pricingRates.colorSingle}/side
                      </span>
                    </motion.button>
                  </div>
                </div>

                {/* Print Sides (Single vs Duplex) */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700">Print Sides</label>
                  <div className="grid grid-cols-2 gap-3">
                    <motion.button
                      whileHover={{ scale: 1.015 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={() => updateSelectedDocConfig({ sides: 'SINGLE' })}
                      className={`p-3.5 rounded-2xl border text-xs font-bold text-left transition-all duration-200 flex items-center justify-between cursor-pointer ${
                        selectedDoc.config.sides === 'SINGLE'
                          ? 'border-blue-600 bg-blue-50/80 text-blue-900 ring-2 ring-blue-500/20 shadow-xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span>Single-Sided</span>
                      <span className="text-[10px] text-slate-500 font-normal">1 page/sheet</span>
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.015 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={() => updateSelectedDocConfig({ sides: 'DUPLEX' })}
                      className={`p-3.5 rounded-2xl border text-xs font-bold text-left transition-all duration-200 flex items-center justify-between cursor-pointer ${
                        selectedDoc.config.sides === 'DUPLEX'
                          ? 'border-blue-600 bg-blue-50/80 text-blue-900 ring-2 ring-blue-500/20 shadow-xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span>Double-Sided</span>
                      <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">Save 50% Paper</span>
                    </motion.button>
                  </div>
                </div>

                {/* Layout & Paper Size */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Paper Size</label>
                    <select
                      value={selectedDoc.config.paperSize}
                      onChange={(e) => updateSelectedDocConfig({ paperSize: e.target.value as any })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    >
                      <option value="A4">A4 (Standard 1.0x)</option>
                      <option value="A3">A3 (Large Poster)</option>
                      <option value="A5">A5 (Compact)</option>
                      <option value="LETTER">US Letter</option>
                      <option value="LEGAL">Legal Document</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Orientation</label>
                    <select
                      value={selectedDoc.config.orientation}
                      onChange={(e) => updateSelectedDocConfig({ orientation: e.target.value as any })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    >
                      <option value="PORTRAIT">Portrait</option>
                      <option value="LANDSCAPE">Landscape</option>
                      <option value="AUTO">Auto Detect</option>
                    </select>
                  </div>
                </div>

                {/* Pages Per Sheet (N-up Imposition) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Pages Per Sheet (Multi-Up)</label>
                  <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                    {[1, 2, 4, 6, 9].map((num) => (
                      <motion.button
                        key={num}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        type="button"
                        onClick={() => updateSelectedDocConfig({ nUp: num })}
                        className={`py-2.5 px-1 rounded-2xl border text-xs font-black text-center transition cursor-pointer ${
                          selectedDoc.config.nUp === num
                            ? 'border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-500/20 shadow-xs'
                            : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {num === 1 ? '1-up' : num === 9 ? 'Collab' : `${num}-up`}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Page Range & Copies */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Page Selection</label>
                    <input
                      type="text"
                      placeholder="e.g. 1-5, 8 (or all)"
                      value={selectedDoc.config.pageRange}
                      onChange={(e) => updateSelectedDocConfig({ pageRange: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Copies</label>
                    <div className="flex items-center border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 p-1">
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        type="button"
                        onClick={() => updateSelectedDocConfig({ copies: Math.max(1, selectedDoc.config.copies - 1) })}
                        className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-black text-sm flex items-center justify-center transition cursor-pointer shadow-2xs"
                      >
                        -
                      </motion.button>
                      <span className="flex-1 text-center font-black text-sm text-slate-900 font-mono">
                        {selectedDoc.config.copies}
                      </span>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        type="button"
                        onClick={() => updateSelectedDocConfig({ copies: selectedDoc.config.copies + 1 })}
                        className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-black text-sm flex items-center justify-center transition cursor-pointer shadow-2xs"
                      >
                        +
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
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
              submittingText={submitStatus}
              isCombinedMultiUp={isCombinedMultiUp}
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

