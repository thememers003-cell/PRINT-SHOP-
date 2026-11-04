'use client';

import React, { useRef } from 'react';
import { UploadCloud, FileText, Image as ImageIcon, Trash2, Plus } from 'lucide-react';

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
}

export function DocumentDropzone({
  documents,
  onDocumentsChange,
  selectedDocId,
  onSelectDoc,
}: DropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newDocs: UploadedDoc[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const previewUrl = URL.createObjectURL(file);

      // Estimate initial page count: for images = 1, for PDFs default to 4 (or read buffer)
      let initialPages = 1;
      if (file.type === 'application/pdf') {
        initialPages = 4; // Estimated or client parsed
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
    const filtered = documents.filter((d) => d.id !== id);
    onDocumentsChange(filtered);
    if (selectedDocId === id && filtered.length > 0) {
      onSelectDoc(filtered[0].id);
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Box */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }}
        className="border-2 border-dashed border-blue-200 hover:border-blue-500 bg-blue-50/50 hover:bg-blue-50 rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition group"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition">
          <UploadCloud className="w-7 h-7" />
        </div>
        <h3 className="mt-4 text-base font-bold text-slate-800">
          Drop your files here, or <span className="text-blue-600 underline">browse</span>
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Supports PDF, DOCX, JPG, and PNG documents up to 50 MB
        </p>
      </div>

      {/* Uploaded Documents List */}
      {documents.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 px-1">
            <span>Uploaded Files ({documents.length})</span>
            <span>Click a file to configure settings</span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {documents.map((doc) => {
              const isSelected = doc.id === selectedDocId;
              const isPdf = doc.type.includes('pdf');
              return (
                <div
                  key={doc.id}
                  onClick={() => onSelectDoc(doc.id)}
                  className={`p-3 rounded-xl border flex items-center justify-between transition cursor-pointer ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/40 shadow-sm ring-1 ring-blue-500'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <div className={`p-2 rounded-lg ${isPdf ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                      {isPdf ? <FileText className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-sm font-semibold text-slate-800 truncate">{doc.name}</p>
                      <p className="text-[11px] text-slate-400">
                        {(doc.size / (1024 * 1024)).toFixed(2)} MB • {doc.pageCount} page{doc.pageCount > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {doc.config.colorMode} • {doc.config.sides === 'DUPLEX' ? 'Duplex' : 'Single'}
                    </span>
                    <button
                      onClick={(e) => handleRemove(doc.id, e)}
                      className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition"
                      title="Remove file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

