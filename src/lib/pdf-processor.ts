import { PDFDocument, PageSizes } from 'pdf-lib';

export interface PrintTransformOptions {
  pageRange?: string; // e.g. "1-5, 8", "all", "odd", "even"
  nUp?: number; // 1, 2, 4, 6, 9
  isGrayscale?: boolean;
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
 * Generates a clean, print-ready PDF buffer with page slicing and N-up grid imposition applied.
 */
export async function generatePrintReadyPdf(
  inputBuffer: Buffer,
  options: PrintTransformOptions = {}
): Promise<Buffer> {
  const srcDoc = await PDFDocument.load(inputBuffer);
  const totalPages = srcDoc.getPageCount();
  const selectedIndices = parsePageRanges(options.pageRange, totalPages);

  if (selectedIndices.length === 0) {
    throw new Error('No valid pages selected for print job.');
  }

  const nUp = options.nUp && options.nUp > 0 ? options.nUp : 1;

  // Simple 1-up passthrough or page slice
  if (nUp === 1) {
    const destDoc = await PDFDocument.create();
    const copiedPages = await destDoc.copyPages(srcDoc, selectedIndices);
    copiedPages.forEach((page) => destDoc.addPage(page));

    const resultBytes = await destDoc.save();
    return Buffer.from(resultBytes);
  }

  // N-up Imposition (e.g., 2, 4, 6, 9 pages per destination sheet)
  const destDoc = await PDFDocument.create();

  // Grid dimensions
  let cols = 1;
  let rows = 1;
  let isLandscapeSheet = false;

  if (nUp === 2) {
    cols = 2;
    rows = 1;
    isLandscapeSheet = true; // Landscape A4 accommodates two side-by-side portrait pages well
  } else if (nUp === 4) {
    cols = 2;
    rows = 2;
    isLandscapeSheet = false;
  } else if (nUp === 6) {
    cols = 3;
    rows = 2;
    isLandscapeSheet = true;
  } else if (nUp === 9) {
    cols = 3;
    rows = 3;
    isLandscapeSheet = false;
  }

  // Destination sheet size: standard A4 (595.28 x 841.89 pt)
  const sheetWidth = isLandscapeSheet ? PageSizes.A4[1] : PageSizes.A4[0];
  const sheetHeight = isLandscapeSheet ? PageSizes.A4[0] : PageSizes.A4[1];

  const cellWidth = sheetWidth / cols;
  const cellHeight = sheetHeight / rows;

  const margin = 10; // Cell margin in points

  // Group selected pages into chunks of size nUp
  for (let i = 0; i < selectedIndices.length; i += nUp) {
    const chunkIndices = selectedIndices.slice(i, i + nUp);
    const newPage = destDoc.addPage([sheetWidth, sheetHeight]);

    for (let c = 0; c < chunkIndices.length; c++) {
      const pageIndex = chunkIndices[c];
      const [embedded] = await destDoc.embedPdf(srcDoc, [pageIndex]);

      const col = c % cols;
      const row = Math.floor(c / cols);

      // In PDF coordinate space, (0,0) is bottom-left
      const cellX = col * cellWidth;
      const cellY = sheetHeight - (row + 1) * cellHeight;

      const availWidth = cellWidth - margin * 2;
      const availHeight = cellHeight - margin * 2;

      // Scale to fit maintaining aspect ratio
      const scaleX = availWidth / embedded.width;
      const scaleY = availHeight / embedded.height;
      const scale = Math.min(scaleX, scaleY);

      const scaledW = embedded.width * scale;
      const scaledH = embedded.height * scale;

      const posX = cellX + margin + (availWidth - scaledW) / 2;
      const posY = cellY + margin + (availHeight - scaledH) / 2;

      newPage.drawPage(embedded, {
        x: posX,
        y: posY,
        width: scaledW,
        height: scaledH,
      });
    }
  }

  const resultBytes = await destDoc.save();
  return Buffer.from(resultBytes);
}

