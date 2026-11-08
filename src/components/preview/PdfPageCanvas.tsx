'use client';

import React, { useEffect, useRef, useState } from 'react';

// In-memory document cache to avoid re-parsing the same PDF for each grid cell
const docCache = new Map<string, Promise<any>>();

export function getCachedPdf(url: string, fileData?: ArrayBuffer) {
  if (docCache.has(url)) {
    return docCache.get(url)!;
  }

  const promise = (async () => {
    const pdfjsLib = await import('pdfjs-dist');
    if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
    }

    if (fileData) {
      return pdfjsLib.getDocument({ data: new Uint8Array(fileData) }).promise;
    }
    return pdfjsLib.getDocument(url).promise;
  })();

  docCache.set(url, promise);
  return promise;
}

interface PdfPageCanvasProps {
  url: string;
  file?: File;
  pageNum: number;
  totalPages?: number;
  isGrayscale?: boolean;
  className?: string;
  fitWidth?: number;
}

export function PdfPageCanvas({
  url,
  file,
  pageNum,
  totalPages,
  isGrayscale = false,
  className = '',
  fitWidth = 320,
}: PdfPageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function renderPage() {
      if (!url) return;
      if (totalPages && pageNum > totalPages) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        let arrayBuffer: ArrayBuffer | undefined;
        if (file) {
          try {
            arrayBuffer = await file.arrayBuffer();
          } catch {
            // fallback to url
          }
        }

        const pdfDoc = await getCachedPdf(url, arrayBuffer);
        if (isCancelled) return;

        const safePageNum = Math.min(Math.max(1, pageNum), pdfDoc.numPages);
        const page = await pdfDoc.getPage(safePageNum);
        if (isCancelled) return;

        const rawViewport = page.getViewport({ scale: 1.0 });
        const scale = fitWidth / rawViewport.width;
        const viewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        if (!canvas) return;

        // Support crisp rendering on high-DPI (Retina) screens
        const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
        };

        await page.render(renderContext).promise;

        if (!isCancelled) {
          setLoading(false);
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.warn('PdfPageCanvas render error:', err);
          setError(err.message || 'Preview unavailable');
          setLoading(false);
        }
      }
    }

    renderPage();

    return () => {
      isCancelled = true;
    };
  }, [url, file, pageNum, totalPages, fitWidth]);

  return (
    <div className={`relative flex items-center justify-center overflow-hidden ${className}`}>
      {loading && (
        <div className="absolute inset-0 bg-slate-100/90 animate-pulse flex flex-col items-center justify-center text-[10px] text-slate-400 rounded">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-1"></div>
          <span className="font-mono">Page {pageNum}</span>
        </div>
      )}
      {error ? (
        <div className="text-[10px] text-slate-400 p-2 text-center font-mono">
          Page {pageNum}
        </div>
      ) : (
        <canvas
          ref={canvasRef}
          style={{
            filter: isGrayscale ? 'grayscale(100%) contrast(115%)' : 'none',
            WebkitFilter: isGrayscale ? 'grayscale(100%) contrast(115%)' : 'none',
          }}
          className={`max-w-full max-h-full object-contain rounded shadow-2xs transition-all duration-200 ${
            isGrayscale ? 'grayscale contrast-125' : ''
          }`}
        />
      )}
    </div>
  );
}
