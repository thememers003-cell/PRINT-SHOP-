'use client';

/**
 * Browser Kiosk Auto-Print Engine
 *
 * Renders customer documents (PDF or Images) reliably onto high-DPI print sheets
 * inside an off-screen same-origin HTML iframe (never popup-blocked via window.open,
 * never defeated by Chrome's 0x0 PDF plugin frame bug).
 * Processes jobs sequentially via a FIFO queue so concurrent uploads never collide.
 */

export interface BrowserPrintJob {
  orderId: string;
  jobId: string;
  printUrl: string;
  fallbackUrl?: string;
  colorMode?: string; // 'BW' | 'COLOR'
  sides?: string; // 'SINGLE' | 'DUPLEX'
  orientation?: string; // 'PORTRAIT' | 'LANDSCAPE' | 'AUTO'
  paperSize?: string; // 'A4' | 'A3' | 'A5' | 'LETTER' | 'LEGAL'
  copies?: number;
  onProgress?: (phase: 'PREPARING' | 'PRINTING' | 'COMPLETED' | 'FAILED', detail?: string) => void;
}

const PAPER_CSS_MAP: Record<string, string> = {
  A4: 'A4',
  A3: 'A3',
  A5: 'A5',
  LETTER: 'letter',
  LEGAL: 'legal',
};

let queueChain: Promise<void> = Promise.resolve();
const inFlightOrders = new Set<string>();

/**
 * Converts RGBA pixels on a canvas to true BT.601 luminance grayscale in-place.
 */
function applyCanvasGrayscale(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }
  ctx.putImageData(imageData, 0, 0);
}

function isPdfMagicBytes(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 5) return false;
  const bytes = new Uint8Array(buffer, 0, 5);
  return (
    bytes[0] === 0x25 && // %
    bytes[1] === 0x50 && // P
    bytes[2] === 0x44 && // D
    bytes[3] === 0x46 && // F
    bytes[4] === 0x2d // -
  );
}

async function fetchDocumentBytes(primaryUrl: string, fallbackUrl?: string): Promise<{ buffer: ArrayBuffer; contentType: string; url: string }> {
  const urls = [primaryUrl, fallbackUrl].filter((u): u is string => Boolean(u));
  let lastError: Error | null = null;

  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} fetching ${url}`);
      }
      const buffer = await res.arrayBuffer();
      const contentType = res.headers.get('Content-Type') || '';
      return { buffer, contentType, url };
    } catch (err: any) {
      lastError = err;
    }
  }

  throw lastError || new Error('Could not fetch printable document.');
}

async function renderPdfPagesToDataUrls(
  buffer: ArrayBuffer,
  isGrayscale: boolean
): Promise<{ pageDataUrls: string[]; detectedLandscape: boolean }> {
  const pdfjsLib = await import('pdfjs-dist');
  if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
  }

  const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
  const totalPages = pdfDoc.numPages;
  const targetWidth = totalPages > 15 ? 1240 : 1654; // Crisp 150-200 DPI print clarity
  const pageDataUrls: string[] = [];
  let detectedLandscape = false;

  for (let p = 1; p <= totalPages; p++) {
    const page = await pdfDoc.getPage(p);
    const rawViewport = page.getViewport({ scale: 1.0 });
    if (p === 1 && rawViewport.width > rawViewport.height) {
      detectedLandscape = true;
    }

    const scale = Math.min(3.0, Math.max(1.5, targetWidth / Math.max(1, rawViewport.width)));
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    const ctx = canvas.getContext('2d', { willReadFrequently: isGrayscale });
    if (!ctx) {
      throw new Error('Canvas 2D context unavailable');
    }

    // White paper base prevents transparent PDF backgrounds printing dark/black
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: ctx, viewport }).promise;

    if (isGrayscale) {
      applyCanvasGrayscale(ctx, canvas.width, canvas.height);
    }

    pageDataUrls.push(canvas.toDataURL('image/png'));

    // Release backing bitmap memory immediately
    canvas.width = 0;
    canvas.height = 0;
  }

  return { pageDataUrls, detectedLandscape };
}

async function renderImageToDataUrl(
  buffer: ArrayBuffer,
  contentType: string,
  isGrayscale: boolean
): Promise<{ dataUrl: string; detectedLandscape: boolean }> {
  const blobUrl = URL.createObjectURL(new Blob([buffer], { type: contentType || 'image/png' }));
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Failed to decode image document'));
      el.src = blobUrl;
    });

    const detectedLandscape = img.naturalWidth > img.naturalHeight;
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: isGrayscale });
    if (!ctx) {
      throw new Error('Canvas 2D context unavailable');
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);

    if (isGrayscale) {
      applyCanvasGrayscale(ctx, canvas.width, canvas.height);
    }

    const dataUrl = canvas.toDataURL('image/png');
    canvas.width = 0;
    canvas.height = 0;
    return { dataUrl, detectedLandscape };
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

function buildPrintableHtml(
  pageDataUrls: string[],
  copies: number,
  paperCss: string,
  orientationCss: 'portrait' | 'landscape'
): string {
  const safeCopies = Math.max(1, Math.min(99, copies || 1));
  const expandedPages: string[] = [];
  for (let c = 0; c < safeCopies; c++) {
    for (const url of pageDataUrls) {
      expandedPages.push(url);
    }
  }

  const pageBlocks = expandedPages
    .map(
      (dataUrl) =>
        `<div class="print-page"><img src="${dataUrl}" alt="Print Sheet" /></div>`
    )
    .join('\n');

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Print Bro Auto-Print</title>
    <style>
      @page {
        size: ${paperCss} ${orientationCss};
        margin: 0;
      }
      @media print {
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }
      * { box-sizing: border-box; }
      html, body {
        margin: 0;
        padding: 0;
        background: #ffffff;
      }
      .print-page {
        width: 100%;
        height: 99vh;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        padding: 4mm;
        page-break-after: always;
        break-after: page;
        page-break-inside: avoid;
        break-inside: avoid;
      }
      .print-page:last-child {
        page-break-after: auto;
        break-after: auto;
      }
      .print-page img {
        max-width: 100%;
        max-height: 100%;
        width: auto;
        height: auto;
        object-fit: contain;
        display: block;
      }
    </style>
  </head>
  <body>
    ${pageBlocks}
  </body>
</html>`;
}

async function printViaSameOriginHtmlIframe(html: string): Promise<void> {
  const existing = document.getElementById('print-bro-active-frame');
  if (existing) existing.remove();

  const iframe = document.createElement('iframe');
  iframe.id = 'print-bro-active-frame';
  iframe.style.position = 'fixed';
  iframe.style.left = '-12000px';
  iframe.style.top = '0';
  iframe.style.width = '794px';
  iframe.style.height = '1123px';
  iframe.style.border = '0';
  iframe.style.opacity = '0.01';
  iframe.style.pointerEvents = 'none';

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const finish = (err?: Error) => {
      if (settled) return;
      settled = true;
      setTimeout(() => {
        iframe.remove();
      }, 1500);
      if (err) reject(err);
      else resolve();
    };

    iframe.onload = async () => {
      try {
        const doc = iframe.contentDocument;
        const win = iframe.contentWindow;
        if (!doc || !win) {
          finish(new Error('Print frame unavailable'));
          return;
        }

        const imgs = Array.from(doc.querySelectorAll('img'));
        await Promise.all(
          imgs.map((img) =>
            typeof img.decode === 'function'
              ? img.decode().catch(() => undefined)
              : Promise.resolve()
          )
        );

        await new Promise((r) => setTimeout(r, 150));

        let afterPrintFired = false;
        const onAfterPrint = () => {
          if (afterPrintFired) return;
          afterPrintFired = true;
          win.removeEventListener('afterprint', onAfterPrint);
          finish();
        };
        win.addEventListener('afterprint', onAfterPrint);

        win.focus();
        win.print();

        // In --kiosk-printing mode or async print spooling, ensure clean completion even if afterprint isn't emitted
        setTimeout(() => {
          onAfterPrint();
        }, 1200);
      } catch (err: any) {
        finish(err);
      }
    };

    iframe.srcdoc = html;
    document.body.appendChild(iframe);
  });
}

async function printPdfViaBlobFallbackIframe(buffer: ArrayBuffer): Promise<void> {
  const existing = document.getElementById('print-bro-active-frame');
  if (existing) existing.remove();

  const blobUrl = URL.createObjectURL(new Blob([buffer], { type: 'application/pdf' }));
  const iframe = document.createElement('iframe');
  iframe.id = 'print-bro-active-frame';
  iframe.style.position = 'fixed';
  iframe.style.left = '-12000px';
  iframe.style.top = '0';
  iframe.style.width = '794px';
  iframe.style.height = '1123px';
  iframe.style.border = '0';
  iframe.style.opacity = '0.01';
  iframe.style.pointerEvents = 'none';

  try {
    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const done = (err?: Error) => {
        if (settled) return;
        settled = true;
        setTimeout(() => {
          iframe.remove();
          URL.revokeObjectURL(blobUrl);
        }, 1800);
        if (err) reject(err);
        else resolve();
      };

      iframe.onload = () => {
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            setTimeout(() => done(), 1200);
          } catch (err: any) {
            done(err);
          }
        }, 900);
      };

      iframe.src = blobUrl;
      document.body.appendChild(iframe);
    });
  } catch (err) {
    URL.revokeObjectURL(blobUrl);
    throw err;
  }
}

async function executeBrowserPrintJob(job: BrowserPrintJob): Promise<void> {
  const isGrayscale = job.colorMode === 'BW';
  const paperCss = PAPER_CSS_MAP[(job.paperSize || 'A4').toUpperCase()] || 'A4';
  const copies = job.copies && job.copies > 0 ? job.copies : 1;

  job.onProgress?.('PREPARING', `Preparing ${job.jobId}...`);

  const { buffer, contentType, url } = await fetchDocumentBytes(
    job.printUrl,
    job.fallbackUrl || `/spooler-output/order_${job.jobId}.pdf`
  );

  const looksLikePdf =
    isPdfMagicBytes(buffer) ||
    contentType.toLowerCase().includes('pdf') ||
    url.toLowerCase().endsWith('.pdf');

  const looksLikeImage =
    !looksLikePdf &&
    (contentType.toLowerCase().startsWith('image/') || /\.(png|jpg|jpeg|webp)$/i.test(url));

  job.onProgress?.('PRINTING', `Sending ${job.jobId} to printer...`);

  if (looksLikePdf) {
    try {
      const { pageDataUrls, detectedLandscape } = await renderPdfPagesToDataUrls(buffer, isGrayscale);
      if (pageDataUrls.length === 0) {
        throw new Error('Rendered PDF had zero pages');
      }
      const orientCss: 'portrait' | 'landscape' =
        job.orientation === 'LANDSCAPE' || (job.orientation === 'AUTO' && detectedLandscape)
          ? 'landscape'
          : 'portrait';

      const html = buildPrintableHtml(pageDataUrls, copies, paperCss, orientCss);
      await printViaSameOriginHtmlIframe(html);
      job.onProgress?.('COMPLETED', `Printed ${job.jobId}`);
      return;
    } catch (pdfRenderErr) {
      console.warn('Canvas PDF render fallback triggered:', pdfRenderErr);
      await printPdfViaBlobFallbackIframe(buffer);
      job.onProgress?.('COMPLETED', `Printed ${job.jobId}`);
      return;
    }
  }

  if (looksLikeImage) {
    const { dataUrl, detectedLandscape } = await renderImageToDataUrl(buffer, contentType, isGrayscale);
    const orientCss: 'portrait' | 'landscape' =
      job.orientation === 'LANDSCAPE' ||
      ((job.orientation === 'AUTO' || !job.orientation) && detectedLandscape)
        ? 'landscape'
        : 'portrait';
    const html = buildPrintableHtml([dataUrl], copies, paperCss, orientCss);
    await printViaSameOriginHtmlIframe(html);
    job.onProgress?.('COMPLETED', `Printed ${job.jobId}`);
    return;
  }

  // Non-PDF/Non-image fallback (e.g., DOCX): request server emergency PDF voucher
  const voucher = await fetchDocumentBytes(`/spooler-output/order_${job.jobId}.pdf`);
  const { pageDataUrls } = await renderPdfPagesToDataUrls(voucher.buffer, isGrayscale);
  const html = buildPrintableHtml(pageDataUrls, copies, paperCss, 'portrait');
  await printViaSameOriginHtmlIframe(html);
  job.onProgress?.('COMPLETED', `Printed ${job.jobId}`);
}

/**
 * Enqueues a print job into the browser's sequential FIFO print pipeline.
 * Deduplicates by orderId while actively printing/queued.
 */
export function enqueueBrowserPrint(job: BrowserPrintJob): Promise<void> {
  if (typeof window === 'undefined' || !job.printUrl) {
    return Promise.resolve();
  }
  if (inFlightOrders.has(job.orderId)) {
    return Promise.resolve();
  }
  inFlightOrders.add(job.orderId);

  const task = queueChain.then(async () => {
    try {
      await executeBrowserPrintJob(job);
    } catch (err: any) {
      console.error('Browser auto-print error:', err);
      job.onProgress?.('FAILED', err?.message || 'Browser print failed');
    } finally {
      inFlightOrders.delete(job.orderId);
      // Pause briefly between jobs so OS spooler registers distinct jobs
      await new Promise((r) => setTimeout(r, 400));
    }
  });

  queueChain = task.catch(() => undefined);
  return task;
}
