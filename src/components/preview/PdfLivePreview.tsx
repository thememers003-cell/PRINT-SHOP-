'use client';

import React, { useState } from 'react';
import { UploadedDoc } from '../upload/DocumentDropzone';
import { 
  FileText, 
  RotateCw, 
  Layers, 
  Grid, 
  Eye, 
  BookOpen, 
  ZoomIn, 
  ZoomOut,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface PreviewProps {
  document: UploadedDoc | null;
  onConfigChange: (updatedConfig: UploadedDoc['config']) => void;
}

export function PdfLivePreview({ document, onConfigChange }: PreviewProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [activeSide, setActiveSide] = useState<'FRONT' | 'BACK'>('FRONT');

  if (!document) {
    return (
      <div className="h-96 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-slate-400 p-6 text-center">
        <Eye className="w-10 h-10 mb-3 text-slate-300" />
        <p className="text-sm font-semibold">No document selected</p>
        <p className="text-xs text-slate-400 mt-1">Upload and select a document to inspect live preview</p>
      </div>
    );
  }

  const { config, pageCount } = document;
  const isLandscape = config.orientation === 'LANDSCAPE';
  const isGrayscale = config.colorMode === 'BW';
  const isDuplex = config.sides === 'DUPLEX';
  const nUp = config.nUp || 1;

  // Grid styling for N-up preview
  let gridColsClass = 'grid-cols-1';
  if (nUp === 2) gridColsClass = 'grid-cols-2';
  if (nUp === 4) gridColsClass = 'grid-cols-2';
  if (nUp === 6) gridColsClass = 'grid-cols-3';
  if (nUp === 9) gridColsClass = 'grid-cols-3';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Top Preview Controls Toolbar */}
      <div className="p-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-slate-800 truncate max-w-[150px] sm:max-w-xs">{document.name}</span>
          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
            Page {currentPage} of {pageCount}
          </span>
        </div>

        {/* Duplex Front/Back Switcher */}
        {isDuplex && (
          <div className="flex items-center space-x-1 bg-slate-200/80 p-0.5 rounded-lg text-[11px] font-semibold">
            <button
              onClick={() => setActiveSide('FRONT')}
              className={`px-2 py-1 rounded-md transition ${activeSide === 'FRONT' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Sheet Front
            </button>
            <button
              onClick={() => setActiveSide('BACK')}
              className={`px-2 py-1 rounded-md transition ${activeSide === 'BACK' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Sheet Back
            </button>
          </div>
        )}
      </div>

      {/* Interactive Sheet Canvas Viewport */}
      <div className="p-6 sm:p-10 bg-slate-100 flex items-center justify-center min-h-[380px] overflow-hidden relative">
        {/* Physical Paper Sheet Mockup */}
        <div
          className={`bg-white shadow-2xl rounded-sm transition-all duration-300 relative border border-slate-200 flex flex-col justify-between overflow-hidden ${
            isLandscape ? 'w-[340px] sm:w-[460px] h-[240px] sm:h-[320px]' : 'w-[240px] sm:w-[320px] h-[340px] sm:h-[460px]'
          } ${isGrayscale ? 'grayscale contrast-110' : ''}`}
        >
          {/* Duplex watermark indicator */}
          {isDuplex && (
            <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-slate-900/10 backdrop-blur rounded text-[9px] font-mono font-bold text-slate-600 uppercase">
              {activeSide === 'FRONT' ? 'Side 1 (Front)' : 'Side 2 (Back)'}
            </div>
          )}

          {/* N-up Grid Simulator */}
          <div className={`p-4 h-full grid ${gridColsClass} gap-2 items-center justify-items-center`}>
            {Array.from({ length: nUp }).map((_, idx) => {
              const displayPageNum = (currentPage - 1) * nUp + idx + 1;
              const hasPage = displayPageNum <= pageCount;

              return (
                <div
                  key={idx}
                  className={`w-full h-full rounded border border-slate-200/80 bg-slate-50/60 p-2 flex flex-col justify-between shadow-2xs ${
                    hasPage ? 'opacity-100' : 'opacity-20 border-dashed'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="h-2 w-3/4 bg-slate-300 rounded-sm"></div>
                    <div className="h-1.5 w-full bg-slate-200 rounded-sm"></div>
                    <div className="h-1.5 w-5/6 bg-slate-200 rounded-sm"></div>
                    <div className="h-1.5 w-4/6 bg-slate-200 rounded-sm"></div>
                  </div>

                  <div className="flex items-center justify-center">
                    <FileText className={`w-6 h-6 ${isGrayscale ? 'text-slate-400' : 'text-blue-500'}`} />
                  </div>

                  <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono">
                    <span>{hasPage ? `Page ${displayPageNum}` : 'Empty'}</span>
                    <span className="uppercase">{config.paperSize}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Paper Edge Bind indicator */}
          <div className="h-1 bg-gradient-to-r from-transparent via-slate-300 to-transparent"></div>
        </div>
      </div>

      {/* Pagination Footer */}
      <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <button
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage <= 1}
          className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition flex items-center space-x-1"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Prev Page</span>
        </button>

        <span className="font-medium text-slate-700">
          Viewing sheet {currentPage} of {Math.ceil(pageCount / nUp)}
        </span>

        <button
          onClick={() => setCurrentPage((p) => Math.min(Math.ceil(pageCount / nUp), p + 1))}
          disabled={currentPage >= Math.ceil(pageCount / nUp)}
          className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition flex items-center space-x-1"
        >
          <span>Next Page</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

