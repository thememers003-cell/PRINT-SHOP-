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
import { PdfPageCanvas } from './PdfPageCanvas';

interface PreviewProps {
  document: UploadedDoc | null;
  onConfigChange: (updatedConfig: UploadedDoc['config']) => void;
  allDocuments?: UploadedDoc[];
  isCombinedMultiUp?: boolean;
  isMergedDocument?: boolean;
}

export function PdfLivePreview({
  document,
  onConfigChange,
  allDocuments = [],
  isCombinedMultiUp = false,
  isMergedDocument = false,
}: PreviewProps) {
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
  const totalSheets = Math.ceil(pageCount / nUp);
  const isSheetLandscape = isLandscape || nUp === 2 || nUp === 6;
  const isMerged = isMergedDocument && !isCombinedMultiUp && allDocuments.length > 1;
  const totalCombinedPages = allDocuments.reduce((sum, d) => sum + (d.pageCount || 1), 0);

  const isImage =
    document.type.startsWith('image/') ||
    document.name.toLowerCase().endsWith('.png') ||
    document.name.toLowerCase().endsWith('.jpg') ||
    document.name.toLowerCase().endsWith('.jpeg');

  // Page range calculations for current sheet
  const startPageNum = (currentPage - 1) * nUp + 1;
  const endPageNum = Math.min(currentPage * nUp, pageCount);

  // Grid styling for N-up preview
  let gridColsClass = 'grid-cols-1';
  let cellFitWidth = 320;
  if (nUp === 2) {
    gridColsClass = 'grid-cols-2';
    cellFitWidth = 190;
  } else if (nUp === 4) {
    gridColsClass = 'grid-cols-2';
    cellFitWidth = 170;
  } else if (nUp === 6) {
    gridColsClass = 'grid-cols-3';
    cellFitWidth = 120;
  } else if (nUp === 9) {
    gridColsClass = 'grid-cols-3';
    cellFitWidth = 90;
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Top Preview Controls Toolbar */}
      <div className="p-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-slate-800 truncate max-w-[150px] sm:max-w-xs">
            {isCombinedMultiUp && allDocuments.length > 1
              ? `Combined (${allDocuments.length} Photos)`
              : isMerged
              ? `Merged (${allDocuments.length} Files)`
              : document.name}
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
            {isCombinedMultiUp && allDocuments.length > 1
              ? `1 Sheet • ${allDocuments.length} photos in ${nUp}-up grid`
              : isMerged
              ? `${totalCombinedPages} Total Pages • Auto-Merged Document`
              : nUp > 1
              ? `Sheet ${currentPage} of ${totalSheets} (Pages ${startPageNum}–${endPageNum})`
              : `Page ${currentPage} of ${pageCount}`}
          </span>
        </div>

        {/* Duplex Front/Back Switcher */}
        {isDuplex && (
          <div className="flex items-center space-x-1 bg-slate-200/80 p-0.5 rounded-lg text-[11px] font-semibold">
            <button
              onClick={() => setActiveSide('FRONT')}
              className={`px-2 py-1 rounded-md transition ${activeSide === 'FRONT' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Front Side
            </button>
            <button
              onClick={() => setActiveSide('BACK')}
              className={`px-2 py-1 rounded-md transition ${activeSide === 'BACK' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Back Side
            </button>
          </div>
        )}
      </div>

      {/* Interactive Sheet Canvas Viewport */}
      <div className="p-6 sm:p-10 bg-slate-100 flex items-center justify-center min-h-[380px] overflow-hidden relative">
        {/* Physical Paper Sheet Mockup */}
        <div
          style={{
            filter: isGrayscale ? 'grayscale(100%) contrast(115%)' : 'none',
            WebkitFilter: isGrayscale ? 'grayscale(100%) contrast(115%)' : 'none',
          }}
          className={`bg-white shadow-2xl rounded-sm transition-all duration-300 relative border border-slate-200 flex flex-col justify-between overflow-hidden ${
            isSheetLandscape ? 'w-[340px] sm:w-[460px] h-[240px] sm:h-[320px]' : 'w-[240px] sm:w-[320px] h-[340px] sm:h-[460px]'
          } ${isGrayscale ? 'grayscale contrast-110' : ''}`}
        >
          {/* Duplex watermark indicator */}
          {isDuplex && (
            <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-slate-900/10 backdrop-blur rounded text-[9px] font-mono font-bold text-slate-600 uppercase z-10">
              {activeSide === 'FRONT' ? 'Side 1 (Front)' : 'Side 2 (Back)'}
            </div>
          )}

          {/* Live Document Renderer / N-up Grid Simulator */}
          <div className="w-full h-full flex flex-col justify-between overflow-hidden relative">
            {nUp === 1 && (!isCombinedMultiUp || allDocuments.length <= 1) ? (
              <div className="w-full h-full flex items-center justify-center p-3 overflow-hidden bg-white">
                {isImage ? (
                  <img
                    src={document.previewUrl}
                    alt={document.name}
                    className={`max-h-full max-w-full object-contain rounded transition-all ${
                      isGrayscale ? 'grayscale contrast-125' : ''
                    }`}
                  />
                ) : (
                  <PdfPageCanvas
                    url={document.previewUrl}
                    file={document.file}
                    pageNum={currentPage}
                    totalPages={pageCount}
                    isGrayscale={isGrayscale}
                    fitWidth={isLandscape ? 440 : 310}
                    className="w-full h-full"
                  />
                )}
              </div>
            ) : (
              <div className={`p-3 h-full grid ${gridColsClass} gap-2 items-center justify-items-center bg-slate-50/40`}>
                {Array.from({ length: nUp }).map((_, idx) => {
                  const targetDoc = isCombinedMultiUp && allDocuments.length > 1 ? allDocuments[idx] : null;
                  const displayPageNum = (currentPage - 1) * nUp + idx + 1;
                  const hasPage = targetDoc ? true : displayPageNum <= pageCount;
                  const activeDoc = targetDoc || document;
                  const isItemImage =
                    activeDoc.type.startsWith('image/') ||
                    activeDoc.name.toLowerCase().endsWith('.png') ||
                    activeDoc.name.toLowerCase().endsWith('.jpg') ||
                    activeDoc.name.toLowerCase().endsWith('.jpeg');

                  return (
                    <div
                      key={idx}
                      className={`w-full h-full rounded border border-slate-200/90 bg-white p-1.5 flex flex-col justify-between shadow-xs overflow-hidden transition-all ${
                        hasPage ? 'opacity-100' : 'opacity-25 border-dashed bg-slate-100'
                      }`}
                    >
                      <div className="flex-1 w-full flex items-center justify-center overflow-hidden min-h-0">
                        {hasPage ? (
                          isItemImage ? (
                            <img
                              src={activeDoc.previewUrl}
                              alt={`Slot ${idx + 1}`}
                              className={`max-h-full max-w-full object-contain ${
                                isGrayscale ? 'grayscale contrast-125' : ''
                              }`}
                            />
                          ) : (
                            <PdfPageCanvas
                              url={activeDoc.previewUrl}
                              file={activeDoc.file}
                              pageNum={targetDoc ? 1 : displayPageNum}
                              totalPages={activeDoc.pageCount}
                              isGrayscale={isGrayscale}
                              fitWidth={cellFitWidth}
                              className="w-full h-full"
                            />
                          )
                        ) : (
                          <div className="flex flex-col items-center justify-center text-slate-300">
                            <span className="text-[10px] font-mono">Empty Slot</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[8px] text-slate-400 font-mono mt-1 pt-0.5 border-t border-slate-100">
                        <span className="font-semibold text-slate-600 truncate max-w-[70px]">
                          {targetDoc ? targetDoc.name : hasPage ? `Page ${displayPageNum}` : 'Empty'}
                        </span>
                        <span className="uppercase text-[7px] text-slate-400">{config.paperSize}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
          <span>Prev Sheet</span>
        </button>

        <span className="font-medium text-slate-700">
          Viewing sheet {currentPage} of {totalSheets}
        </span>

        <button
          onClick={() => setCurrentPage((p) => Math.min(totalSheets, p + 1))}
          disabled={currentPage >= totalSheets}
          className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition flex items-center space-x-1"
        >
          <span>Next Sheet</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
