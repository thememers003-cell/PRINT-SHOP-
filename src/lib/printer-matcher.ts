export interface PrinterCandidate {
  id: string;
  name: string;
  supportsColor: boolean;
  supportsDuplex?: boolean;
  paperSizes: string; // "A4,Letter"
  status?: string;
  isDefault?: boolean;
}

export interface JobRequirements {
  colorMode: 'BW' | 'COLOR';
  paperSize: string; // 'A4' | 'A3' | 'A5' | 'LETTER' | 'LEGAL'
}

/**
 * Matches a print job to the most appropriate online printer.
 */
export function matchPrinterForJob(
  job: JobRequirements,
  printers: PrinterCandidate[]
): PrinterCandidate | null {
  if (!printers || printers.length === 0) return null;

  // 1. Try to find an exact match (Color capability + Paper Size support)
  const exactMatches = printers.filter((p) => {
    // If job needs color, printer MUST support color
    if (job.colorMode === 'COLOR' && !p.supportsColor) {
      return false;
    }
    // Check paper size compatibility
    const sizes = p.paperSizes.split(',').map((s) => s.trim().toUpperCase());
    return sizes.includes(job.paperSize.toUpperCase());
  });

  if (exactMatches.length > 0) {
    // If multiple, prefer dedicated B&W printer for B&W jobs to save color toner
    if (job.colorMode === 'BW') {
      const dedicatedBw = exactMatches.find((p) => !p.supportsColor);
      if (dedicatedBw) return dedicatedBw;
    }
    // Return default or first match
    return exactMatches.find((p) => p.isDefault) || exactMatches[0];
  }

  // 2. Fallback: Default printer if available, else first printer
  return printers.find((p) => p.isDefault) || printers[0] || null;
}
