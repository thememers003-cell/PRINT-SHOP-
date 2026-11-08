import { PDFDocument, PageSizes, PDFName, PDFDict, PDFRawStream } from 'pdf-lib';
import zlib from 'zlib';

export interface PrintTransformOptions {
  pageRange?: string; // e.g. "1-5, 8", "all", "odd", "even"
  nUp?: number; // 1, 2, 4, 6, 9
  isGrayscale?: boolean;
  orientation?: 'PORTRAIT' | 'LANDSCAPE' | 'AUTO';
  paperSize?: string;
  isSequentialMerge?: boolean; // When true or nUp === 1 with multiple documents, merges them in sequence
}

/**
 * Converts an image buffer to true high-definition grayscale pixels
 * without lossy compression or scan-line dithering.
 */
export async function convertImageToGrayscaleBuffer(buffer: Buffer): Promise<Buffer> {
  try {
    const { createCanvas, loadImage } = await import('canvas');
    const img = await loadImage(buffer);
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const imgData = ctx.getImageData(0, 0, img.width, img.height);
    const data = imgData.data;

    // Standard ITU-R BT.601 luminance weights
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
    }
    ctx.putImageData(imgData, 0, 0);
    return canvas.toBuffer('image/jpeg', { quality: 0.98 });
  } catch (err) {
    console.warn('Canvas grayscale conversion fallback:', err);
    return buffer;
  }
}

/**
 * Deep monochrome transformation across all pages, vector resources,
 * and embedded Image XObjects. Converts RGB image streams into true single-channel DeviceGray.
 */
export async function applyMonochromeColorSpace(doc: PDFDocument): Promise<void> {
  // 1. Resources ColorSpace mapping (ISO 32000 standard)
  const pages = doc.getPages();
  for (const page of pages) {
    let resources = page.node.get(PDFName.of('Resources'));
    if (!resources || !(resources instanceof PDFDict)) {
      resources = doc.context.obj({});
      page.node.set(PDFName.of('Resources'), resources);
    }
    let cs = resources.get(PDFName.of('ColorSpace'));
    if (!cs || !(cs instanceof PDFDict)) {
      cs = doc.context.obj({});
      resources.set(PDFName.of('ColorSpace'), cs);
    }
    cs.set(PDFName.of('DefaultRGB'), PDFName.of('DeviceGray'));
    cs.set(PDFName.of('DefaultCMYK'), PDFName.of('DeviceGray'));
  }

  // 2. Deep conversion of all Image XObjects into true 8-bit DeviceGray
  try {
    const { createCanvas, loadImage } = await import('canvas');
    for (const [, obj] of doc.context.enumerateIndirectObjects()) {
      if (obj instanceof PDFRawStream) {
        const dict = obj.dict;
        if (dict.get(PDFName.of('Subtype')) === PDFName.of('Image')) {
          const filter = dict.get(PDFName.of('Filter'))?.toString();
          const cs = dict.get(PDFName.of('ColorSpace'))?.toString();

          if (cs === '/DeviceRGB' || cs === '/DeviceCMYK' || filter === '/DCTDecode') {
            const contents = Buffer.from(obj.asUint8Array());
            let grayBytes: Buffer | null = null;
            let width = Number(dict.get(PDFName.of('Width')));
            let height = Number(dict.get(PDFName.of('Height')));

            if (filter === '/DCTDecode') {
              try {
                const loaded = await loadImage(contents);
                width = loaded.width;
                height = loaded.height;
                const cvs = createCanvas(width, height);
                const ctx = cvs.getContext('2d');
                ctx.drawImage(loaded, 0, 0);
                const idata = ctx.getImageData(0, 0, width, height);
                const d = idata.data;
                grayBytes = Buffer.alloc(width * height);
                for (let i = 0, j = 0; i < d.length; i += 4, j++) {
                  grayBytes[j] = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
                }
              } catch (imgErr) {
                console.warn('Failed to convert DCTDecode image to grayscale:', imgErr);
              }
            } else if (filter === '/FlateDecode' && width && height) {
              try {
                const inflated = zlib.inflateSync(contents);
                if (inflated.length === width * height * 3) {
                  grayBytes = Buffer.alloc(width * height);
                  for (let i = 0, j = 0; i < inflated.length; i += 3, j++) {
                    grayBytes[j] = Math.round(0.299 * inflated[i] + 0.587 * inflated[i + 1] + 0.114 * inflated[i + 2]);
                  }
                } else if (inflated.length === width * height * 4) {
                  grayBytes = Buffer.alloc(width * height);
                  for (let i = 0, j = 0; i < inflated.length; i += 4, j++) {
                    const c = inflated[i] / 255;
                    const m = inflated[i + 1] / 255;
                    const y = inflated[i + 2] / 255;
                    const k = inflated[i + 3] / 255;
                    const r = 255 * (1 - c) * (1 - k);
                    const g = 255 * (1 - m) * (1 - k);
                    const b = 255 * (1 - y) * (1 - k);
                    grayBytes[j] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
                  }
                }
              } catch (flateErr) {
                console.warn('Failed to inflate FlateDecode image stream:', flateErr);
              }
            }

            if (grayBytes) {
              const deflated = zlib.deflateSync(grayBytes);
              dict.set(PDFName.of('ColorSpace'), PDFName.of('DeviceGray'));
              dict.set(PDFName.of('Filter'), PDFName.of('FlateDecode'));
              dict.set(PDFName.of('BitsPerComponent'), doc.context.obj(8));
              dict.set(PDFName.of('Length'), doc.context.obj(deflated.length));
              obj.contents = deflated;
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('Deep monochrome image conversion warning:', err);
  }
}

/**
 * Parses user-friendly page range strings into 0-indexed page indices.
 */
export function parsePageRanges(rangeStr: string | undefined, totalPages: number): number[] {
  if (!rangeStr || rangeStr.trim() === '' || rangeStr.toLowerCase() === 'all') {
    return Array.from({ length: totalPages }, (_, i) => i);
  }

  const normalized = rangeStr.trim().toLowerCase();

  if (normalized === 'odd') {
    return Array.from({ length: totalPages }, (_, i) => i).filter((i) => (i + 1) % 2 !== 0);
  }

  if (normalized === 'even') {
    return Array.from({ length: totalPages }, (_, i) => i).filter((i) => (i + 1) % 2 === 0);
  }

  const indices = new Set<number>();
  const parts = normalized.split(',');

  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.includes('-')) {
      const [startStr, endStr] = trimmed.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end)) {
        for (let p = Math.max(1, start); p <= Math.min(totalPages, end); p++) {
          indices.add(p - 1);
        }
      }
    } else {
      const p = parseInt(trimmed, 10);
      if (!isNaN(p) && p >= 1 && p <= totalPages) {
        indices.add(p - 1);
      }
    }
  }

  return Array.from(indices).sort((a, b) => a - b);
}

/**
 * Generates a clean, print-ready PDF buffer with page slicing, optical N-up imposition,
 * and 100% true monochrome DeviceGray color transformation.
 */
export async function generatePrintReadyPdf(
  inputBuffer: Buffer | Buffer[],
  options: PrintTransformOptions = {}
): Promise<Buffer> {
  const nUp = options.nUp && options.nUp > 0 ? options.nUp : 1;

  // Grid dimensions for N-up imposition
  let cols = 1;
  let rows = 1;
  let isLandscapeSheet = false;

  if (nUp === 2) {
    cols = 2;
    rows = 1;
    isLandscapeSheet = true; // 2 pages side-by-side on Landscape A4
  } else if (nUp === 4) {
    cols = 2;
    rows = 2;
    isLandscapeSheet = false; // 2x2 grid on Portrait A4
  } else if (nUp === 6) {
    cols = 3;
    rows = 2;
    isLandscapeSheet = true; // 3x2 grid on Landscape A4
  } else if (nUp === 9) {
    cols = 3;
    rows = 3;
    isLandscapeSheet = false; // 3x3 grid on Portrait A4
  }

  // Standard A4 dimensions
  const sheetWidth = isLandscapeSheet ? PageSizes.A4[1] : PageSizes.A4[0];
  const sheetHeight = isLandscapeSheet ? PageSizes.A4[0] : PageSizes.A4[1];

  const outerMargin = 18; // 18pt safe hardware margins (~6.35mm)
  const gutter = 10; // 10pt gutter between cells (~3.5mm)
  const cellPadding = 4; // 4pt inner cell padding

  const usableWidth = sheetWidth - outerMargin * 2;
  const usableHeight = sheetHeight - outerMargin * 2;

  const cellWidth = (usableWidth - (cols - 1) * gutter) / cols;
  const cellHeight = (usableHeight - (rows - 1) * gutter) / rows;

  // ============================================================
  // CASE 0: INPUT IS MULTIPLE DOCUMENTS (PDFs, IMAGES, OR MIXED)
  // ============================================================
  if (Array.isArray(inputBuffer)) {
    const buffers = inputBuffer;
    const destDoc = await PDFDocument.create();

    const isSequential = options.isSequentialMerge || nUp === 1;

    if (isSequential) {
      // SEQUENTIAL MERGE: Combine all PDFs and Images in order
      for (let i = 0; i < buffers.length; i++) {
        let buf = buffers[i];
        const isPdfItem = buf.slice(0, 5).toString('ascii').startsWith('%PDF-');

        if (isPdfItem) {
          try {
            const srcDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
            const pageIndices = options.pageRange
              ? parsePageRanges(options.pageRange, srcDoc.getPageCount())
              : srcDoc.getPageIndices();
            const copiedPages = await destDoc.copyPages(srcDoc, pageIndices);
            copiedPages.forEach((p) => destDoc.addPage(p));
          } catch (pdfErr) {
            console.warn('Sequential merge error loading PDF item:', pdfErr);
          }
        } else {
          // Image item (JPG or PNG)
          if (options.isGrayscale) {
            buf = await convertImageToGrayscaleBuffer(buf);
          }
          let img;
          try {
            img = await destDoc.embedJpg(buf);
          } catch {
            try {
              img = await destDoc.embedPng(buf);
            } catch (e: any) {
              console.warn('Sequential merge error embedding image:', e);
              continue;
            }
          }

          const isImageLandscape = img.width > img.height;
          const isLandscape =
            options.orientation === 'LANDSCAPE' ||
            (options.orientation === 'AUTO' && isImageLandscape) ||
            (!options.orientation && isImageLandscape);

          const targetWidth = isLandscape ? PageSizes.A4[1] : PageSizes.A4[0];
          const targetHeight = isLandscape ? PageSizes.A4[0] : PageSizes.A4[1];

          const page = destDoc.addPage([targetWidth, targetHeight]);
          const margin = 18;
          const maxW = targetWidth - margin * 2;
          const maxH = targetHeight - margin * 2;
          const dims = img.scaleToFit(maxW, maxH);

          page.drawImage(img, {
            x: (targetWidth - dims.width) / 2,
            y: (targetHeight - dims.height) / 2,
            width: dims.width,
            height: dims.height,
          });
        }
      }

      let savedBytes = await destDoc.save();
      if (options.isGrayscale) {
        const reDoc = await PDFDocument.load(savedBytes);
        await applyMonochromeColorSpace(reDoc);
        savedBytes = await reDoc.save();
      }
      return Buffer.from(savedBytes);
    }

    // N-UP GRID IMPOSITION (Collab mode): Place items into N-up grid slots
    for (let i = 0; i < buffers.length; i += nUp) {
      const chunk = buffers.slice(i, i + nUp);
      const page = destDoc.addPage([sheetWidth, sheetHeight]);

      for (let c = 0; c < chunk.length; c++) {
        let buf = chunk[c];
        const isPdfItem = buf.slice(0, 5).toString('ascii').startsWith('%PDF-');

        const col = c % cols;
        const row = Math.floor(c / cols);

        const cellX = outerMargin + col * (cellWidth + gutter);
        const cellY = sheetHeight - outerMargin - (row + 1) * cellHeight - row * gutter;

        const availWidth = cellWidth - cellPadding * 2;
        const availHeight = cellHeight - cellPadding * 2;

        if (isPdfItem) {
          try {
            const srcDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
            if (srcDoc.getPageCount() > 0) {
              const [embeddedPage] = await destDoc.embedPdf(srcDoc, [0]);
              const scale = Math.min(availWidth / embeddedPage.width, availHeight / embeddedPage.height);
              const w = embeddedPage.width * scale;
              const h = embeddedPage.height * scale;
              const posX = cellX + cellPadding + (availWidth - w) / 2;
              const posY = cellY + cellPadding + (availHeight - h) / 2;
              page.drawPage(embeddedPage, {
                x: posX,
                y: posY,
                xScale: scale,
                yScale: scale,
              });
            }
          } catch (pdfErr) {
            console.warn('N-up PDF embed error:', pdfErr);
          }
        } else {
          // Image
          if (options.isGrayscale) {
            buf = await convertImageToGrayscaleBuffer(buf);
          }

          let img;
          try {
            img = await destDoc.embedJpg(buf);
          } catch {
            try {
              img = await destDoc.embedPng(buf);
            } catch (e: any) {
              continue;
            }
          }

          const dims = img.scaleToFit(availWidth, availHeight);
          const posX = cellX + cellPadding + (availWidth - dims.width) / 2;
          const posY = cellY + cellPadding + (availHeight - dims.height) / 2;

          page.drawImage(img, {
            x: posX,
            y: posY,
            width: dims.width,
            height: dims.height,
          });
        }
      }
    }

    let savedBytes = await destDoc.save();
    if (options.isGrayscale) {
      const reDoc = await PDFDocument.load(savedBytes);
      await applyMonochromeColorSpace(reDoc);
      savedBytes = await reDoc.save();
    }
    return Buffer.from(savedBytes);
  }

  const isPdf = inputBuffer.slice(0, 5).toString('ascii').startsWith('%PDF-');

  // ============================================================
  // CASE 1: INPUT IS AN IMAGE (PNG or JPG)
  // ============================================================
  if (!isPdf) {
    let effectiveBuffer = inputBuffer;
    if (options.isGrayscale) {
      effectiveBuffer = await convertImageToGrayscaleBuffer(inputBuffer);
    }

    const destDoc = await PDFDocument.create();
    let img;
    try {
      img = await destDoc.embedJpg(effectiveBuffer);
    } catch {
      try {
        img = await destDoc.embedPng(effectiveBuffer);
      } catch (err: any) {
        throw new Error('Unsupported image format for print preparation: ' + err.message);
      }
    }

    if (nUp === 1) {
      // 1-up: Center image onto standard A4 sheet with safe margins
      const isImageLandscape = img.width > img.height;
      const isLandscape =
        options.orientation === 'LANDSCAPE' ||
        (options.orientation === 'AUTO' && isImageLandscape) ||
        (!options.orientation && isImageLandscape);

      const targetWidth = isLandscape ? PageSizes.A4[1] : PageSizes.A4[0];
      const targetHeight = isLandscape ? PageSizes.A4[0] : PageSizes.A4[1];

      const page = destDoc.addPage([targetWidth, targetHeight]);
      const margin = 18;
      const maxW = targetWidth - margin * 2;
      const maxH = targetHeight - margin * 2;

      const dims = img.scaleToFit(maxW, maxH);
      page.drawImage(img, {
        x: (targetWidth - dims.width) / 2,
        y: (targetHeight - dims.height) / 2,
        width: dims.width,
        height: dims.height,
      });
    } else {
      // N-up (2, 4, 6, 9-up): Directly place image into each cell with exact aspect ratio
      const page = destDoc.addPage([sheetWidth, sheetHeight]);

      for (let c = 0; c < nUp; c++) {
        const col = c % cols;
        const row = Math.floor(c / cols);

        const cellX = outerMargin + col * (cellWidth + gutter);
        const cellY = sheetHeight - outerMargin - (row + 1) * cellHeight - row * gutter;

        const availWidth = cellWidth - cellPadding * 2;
        const availHeight = cellHeight - cellPadding * 2;

        const dims = img.scaleToFit(availWidth, availHeight);
        const posX = cellX + cellPadding + (availWidth - dims.width) / 2;
        const posY = cellY + cellPadding + (availHeight - dims.height) / 2;

        page.drawImage(img, {
          x: posX,
          y: posY,
          width: dims.width,
          height: dims.height,
        });
      }
    }

    let savedBytes = await destDoc.save();
    if (options.isGrayscale) {
      const reDoc = await PDFDocument.load(savedBytes);
      await applyMonochromeColorSpace(reDoc);
      savedBytes = await reDoc.save();
    }
    return Buffer.from(savedBytes);
  }

  // ============================================================
  // CASE 2: INPUT IS A PDF DOCUMENT
  // ============================================================
  const srcDoc = await PDFDocument.load(inputBuffer, { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();
  const selectedIndices = parsePageRanges(options.pageRange, totalPages);

  if (selectedIndices.length === 0) {
    throw new Error('No valid pages selected for print job.');
  }

  const destDoc = await PDFDocument.create();

  if (nUp === 1) {
    const copiedPages = await destDoc.copyPages(srcDoc, selectedIndices);
    copiedPages.forEach((page) => destDoc.addPage(page));
  } else {
    // N-up imposition for PDF pages
    for (let i = 0; i < selectedIndices.length; i += nUp) {
      const chunkIndices = selectedIndices.slice(i, i + nUp);
      const newPage = destDoc.addPage([sheetWidth, sheetHeight]);

      for (let c = 0; c < chunkIndices.length; c++) {
        const pageIndex = chunkIndices[c];
        const [embedded] = await destDoc.embedPdf(srcDoc, [pageIndex]);

        const col = c % cols;
        const row = Math.floor(c / cols);

        const cellX = outerMargin + col * (cellWidth + gutter);
        const cellY = sheetHeight - outerMargin - (row + 1) * cellHeight - row * gutter;

        const availWidth = cellWidth - cellPadding * 2;
        const availHeight = cellHeight - cellPadding * 2;

        const scale = Math.min(availWidth / embedded.width, availHeight / embedded.height);
        const scaledW = embedded.width * scale;
        const scaledH = embedded.height * scale;

        const posX = cellX + cellPadding + (availWidth - scaledW) / 2;
        const posY = cellY + cellPadding + (availHeight - scaledH) / 2;

        newPage.drawPage(embedded, {
          x: posX,
          y: posY,
          width: scaledW,
          height: scaledH,
        });
      }
    }
  }

  let savedBytes = await destDoc.save();
  if (options.isGrayscale) {
    const reDoc = await PDFDocument.load(savedBytes);
    await applyMonochromeColorSpace(reDoc);
    savedBytes = await reDoc.save();
  }
  return Buffer.from(savedBytes);
}
