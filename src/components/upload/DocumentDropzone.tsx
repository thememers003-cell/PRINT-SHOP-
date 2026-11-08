'use client';

import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UploadCloud, 
  FileText, 
  Image as ImageIcon, 
  Trash2, 
  Bot, 
  Zap, 
  Sparkles, 
  ChevronLeft,
  CheckCircle2,
  Layers,
  Plus
} from 'lucide-react';
import { sounds } from '@/lib/sound-effects';

export interface UploadedDoc {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  pageCount: number;
  previewUrl: string;
  config: {
    copies: number;
    colorMode: 'BW' | 'COLOR';
    sides: 'SINGLE' | 'DUPLEX';
    orientation: 'PORTRAIT' | 'LANDSCAPE' | 'AUTO';
    paperSize: 'A4' | 'A3' | 'A5' | 'LETTER' | 'LEGAL';
    pageRange: string;
    nUp: number;
  };
}

interface DropzoneProps {
  documents: UploadedDoc[];
  onDocumentsChange: (docs: UploadedDoc[]) => void;
  selectedDocId: string | null;
  onSelectDoc: (id: string) => void;
  selectedDocIds?: string[];
  onToggleSelectDoc?: (id: string) => void;
  onSelectAll?: () => void;
  onBack?: () => void;
}

export function DocumentDropzone({
  documents,
  onDocumentsChange,
  selectedDocId,
  onSelectDoc,
  selectedDocIds = [],
  onToggleSelectDoc,
  onSelectAll,
  onBack,
}: DropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    sounds.playPop();

    const newDocs: UploadedDoc[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const previewUrl = URL.createObjectURL(file);

      // Fast, non-blocking page count reading:
      let initialPages = 1;
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if (isPdf) {
        try {
          const { PDFDocument } = await import('pdf-lib');
          const arrayBuffer = await file.arrayBuffer();
          const loadedPdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
          initialPages = Math.max(1, loadedPdf.getPageCount());
        } catch (err) {
          initialPages = 1;
        }
      }

      newDocs.push({
        id: `doc_${Date.now()}_${i}`,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        pageCount: initialPages,
        previewUrl,
        config: {
          copies: 1,
          colorMode: 'BW',
          sides: 'SINGLE',
          orientation: 'PORTRAIT',
          paperSize: 'A4',
          pageRange: 'all',
          nUp: 1,
        },
      });
    }

    const updated = [...documents, ...newDocs];
    onDocumentsChange(updated);
    if (!selectedDocId && updated.length > 0) {
      onSelectDoc(updated[0].id);
    }
  };

  const handleRemove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    sounds.playTap();
    const filtered = documents.filter((d) => d.id !== id);
    onDocumentsChange(filtered);
    if (selectedDocId === id && filtered.length > 0) {
      onSelectDoc(filtered[0].id);
    }
  };

  const triggerUploadClick = () => {
    sounds.playTap();
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-6">
      {/* Top Stepper & Back Navigation */}
      <div className="flex items-center justify-between">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          type="button"
          onClick={() => {
            sounds.playTap();
            if (onBack) onBack();
            else if (typeof window !== 'undefined') window.history.back();
          }}
          className="px-4 py-2 rounded-xl bg-white border border-slate-200/90 hover:border-slate-300 text-slate-700 text-xs font-bold transition flex items-center space-x-1.5 shadow-2xs hover:shadow-xs cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4 text-blue-600" />
          <span>Back</span>
        </motion.button>

        {/* Stepper Dots (Active Step 1 of 5) */}
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-sm shadow-blue-500/50"></span>
          <span className="w-2 h-2 rounded-full bg-slate-300"></span>
          <span className="w-2 h-2 rounded-full bg-slate-300"></span>
          <span className="w-2 h-2 rounded-full bg-slate-300"></span>
          <span className="w-2 h-2 rounded-full bg-slate-300"></span>
        </div>
      </div>

      {/* "Printy" AI Assistant Alert Card with subtle shine */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden p-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-50/90 via-sky-50/70 to-indigo-50/60 border border-blue-200/80 shadow-2xs flex items-center space-x-3"
      >
        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/25">
          <Bot className="w-5 h-5" />
        </div>
        <p className="text-xs sm:text-sm text-slate-800 font-medium leading-snug">
          <strong className="text-blue-700 font-bold">Printy:</strong> Drop up to 10 files or photos &amp; I&apos;ll auto-merge &amp; format them for silent print!
        </p>
      </motion.div>

      {/* Header Section */}
      <div className="space-y-1.5">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-blue-50 to-sky-100 border border-blue-200/80 text-[11px] font-extrabold text-blue-700 tracking-wide uppercase shadow-2xs">
          <Zap className="w-3.5 h-3.5 text-blue-600 fill-blue-500" />
          <span>3-Second Fast Upload</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Upload Documents
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 font-medium">
          Select single or multiple files (PDF, DOCX, Word, JPG, PNG)
        </p>
      </div>

      {/* Big Glossy Dashed Dropzone */}
      <motion.div
        whileHover={{ scale: 1.008 }}
        whileTap={{ scale: 0.995 }}
        onClick={triggerUploadClick}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`group relative border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-300 shadow-sm hover:shadow-lg ${
          isDragOver
            ? 'border-blue-600 bg-blue-50/80 scale-[1.01] ring-4 ring-blue-500/20'
            : 'border-sky-300/90 hover:border-blue-500 bg-gradient-to-b from-sky-50/40 via-white to-blue-50/30 hover:from-sky-50/70'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        <div className="flex flex-col items-center justify-center space-y-4">
          {/* Cloud Upload Icon in Soft Blue Circle */}
          <motion.div 
            animate={isDragOver ? { scale: 1.15, y: -5 } : { scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="w-20 h-20 rounded-3xl bg-gradient-to-b from-sky-100 to-sky-200/70 text-blue-600 flex items-center justify-center border border-sky-300/80 shadow-sm group-hover:scale-105 group-hover:shadow-md transition-all duration-300"
          >
            <UploadCloud className="w-10 h-10" />
          </motion.div>

          {/* Call to Action */}
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {isDragOver ? 'Drop your files now!' : 'Tap to select or drop files'}
            </h3>
          </div>

          {/* Glossy Pill Upload Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              triggerUploadClick();
            }}
            className="px-6 py-2.5 rounded-full bg-gradient-to-r from-sky-100 via-blue-100 to-sky-200 text-blue-700 border border-sky-300 hover:border-blue-400 font-bold text-xs uppercase tracking-wider flex items-center space-x-2 shadow-2xs hover:shadow-sm transition-all duration-200 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>Upload up to 10 photos or documents</span>
          </motion.button>

          {/* Format Badges */}
          <p className="text-[11px] font-mono font-medium text-slate-400 tracking-wide">
            PDF • Word DOCX • JPG • PNG (Auto-Merged &amp; Imposed)
          </p>
        </div>
      </motion.div>

      {/* Uploaded Documents List */}
      {documents.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="select-all-docs"
                checked={documents.length > 0 && selectedDocIds.length === documents.length}
                onChange={onSelectAll}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer accent-blue-600"
              />
              <label htmlFor="select-all-docs" className="flex items-center space-x-1.5 cursor-pointer select-none">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>Selected Files ({selectedDocIds.length > 0 ? selectedDocIds.length : 1}/{documents.length})</span>
              </label>
            </div>
            <div className="flex items-center space-x-2">
              {onSelectAll && (
                <button
                  type="button"
                  onClick={onSelectAll}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition cursor-pointer"
                >
                  {selectedDocIds.length === documents.length ? 'Deselect All' : `Select All (${documents.length})`}
                </button>
              )}
              <span className="text-slate-400 font-normal hidden sm:inline">Tap to inspect preview</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            <AnimatePresence>
              {documents.map((doc) => {
                const isSelectedPreview = doc.id === selectedDocId;
                const isChecked = selectedDocIds.length > 0 ? selectedDocIds.includes(doc.id) : isSelectedPreview;
                const isPdf = doc.type.includes('pdf') || doc.name.toLowerCase().endsWith('.pdf');

                return (
                  <motion.div
                    key={doc.id}
                    layout
                    initial={{ opacity: 0, y: 12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    onClick={() => {
                      sounds.playTap();
                      onSelectDoc(doc.id);
                    }}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all duration-200 cursor-pointer ${
                      isSelectedPreview
                        ? 'border-blue-500 bg-gradient-to-r from-blue-50/90 to-sky-50/70 shadow-md ring-2 ring-blue-500/30'
                        : isChecked
                        ? 'border-blue-300 bg-blue-50/30 hover:bg-blue-50/50'
                        : 'border-slate-200/90 bg-white hover:border-slate-300 shadow-2xs hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-center space-x-3 overflow-hidden">
                      {onToggleSelectDoc && (
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            e.stopPropagation();
                            sounds.playTap();
                            onToggleSelectDoc(doc.id);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer accent-blue-600 shrink-0"
                        />
                      )}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isPdf ? 'bg-red-50 text-red-600 border border-red-200/70' : 'bg-blue-50 text-blue-600 border border-blue-200/70'
                      }`}>
                        {isPdf ? <FileText className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-sm font-bold text-slate-900 truncate">{doc.name}</p>
                        <p className="text-[11px] font-mono text-slate-400">
                          {(doc.size / (1024 * 1024)).toFixed(2)} MB • {doc.pageCount} page{doc.pageCount > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        {doc.config.colorMode === 'BW' ? 'B&W' : 'Colour'} • {doc.config.sides === 'DUPLEX' ? 'Duplex' : '1-Side'} • {doc.config.nUp}up
                      </span>
                      <motion.button
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.9 }}
                        type="button"
                        onClick={(e) => handleRemove(doc.id, e)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition cursor-pointer"
                        title="Remove file"
                      >
                        <Trash2 className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
