export interface ShopPricingRates {
  bwSingle: number;
  bwDuplex: number;
  colorSingle: number;
  colorDuplex: number;
  a3Multiplier: number;
  a5Multiplier: number;
  letterMultiplier: number;
  legalMultiplier: number;
  minOrderAmount: number;
  serviceFee?: number;
}

export interface PrintConfig {
  pageCount: number;
  copies: number;
  colorMode: 'BW' | 'COLOR';
  sides: 'SINGLE' | 'DUPLEX';
  paperSize: 'A4' | 'A3' | 'A5' | 'LETTER' | 'LEGAL';
  nUp?: number; // 1, 2, 4, 6, 9
}

export interface JobPriceBreakdown {
  originalPages: number;
  impositionFactor: number;
  printedSides: number;
  printedSheets: number;
  unitRatePerSide: number;
  paperMultiplier: number;
  copies: number;
  subtotalBeforeCopies: number;
  total: number;
}

export interface OrderPriceBreakdown {
  jobBreakdowns: JobPriceBreakdown[];
  subtotal: number;
  serviceFee: number;
  minOrderFloorApplied: boolean;
  finalAmount: number;
}

export function getPaperMultiplier(paperSize: string, rates: ShopPricingRates): number {
  switch (paperSize.toUpperCase()) {
    case 'A3':
      return rates.a3Multiplier;
    case 'A5':
      return rates.a5Multiplier;
    case 'LETTER':
      return rates.letterMultiplier;
    case 'LEGAL':
      return rates.legalMultiplier;
    case 'A4':
    default:
      return 1.0;
  }
}

export function calculateJobPrice(
  config: PrintConfig,
  rates: ShopPricingRates
): JobPriceBreakdown {
  const nUp = config.nUp && config.nUp > 0 ? config.nUp : 1;
  const copies = config.copies && config.copies > 0 ? config.copies : 1;
  const pageCount = Math.max(1, config.pageCount);

  // Number of content pages after N-up imposition
  const effectiveContentSides = Math.ceil(pageCount / nUp);

  let printedSheets = 0;
  let printedSides = 0;

  if (config.sides === 'DUPLEX') {
    // 2 content sides per physical sheet
    printedSheets = Math.ceil(effectiveContentSides / 2);
    printedSides = effectiveContentSides;
  } else {
    // 1 content side per physical sheet
    printedSheets = effectiveContentSides;
    printedSides = effectiveContentSides;
  }

  // Determine base unit rate per side based on color & sides
  let unitRate = 0;
  if (config.colorMode === 'COLOR') {
    unitRate = config.sides === 'DUPLEX' ? rates.colorDuplex : rates.colorSingle;
  } else {
    unitRate = config.sides === 'DUPLEX' ? rates.bwDuplex : rates.bwSingle;
  }

  const paperMultiplier = getPaperMultiplier(config.paperSize, rates);
  const subtotalBeforeCopies = printedSides * unitRate * paperMultiplier;
  const total = Number((subtotalBeforeCopies * copies).toFixed(2));

  return {
    originalPages: pageCount,
    impositionFactor: nUp,
    printedSides,
    printedSheets,
    unitRatePerSide: unitRate,
    paperMultiplier,
    copies,
    subtotalBeforeCopies: Number(subtotalBeforeCopies.toFixed(2)),
    total,
  };
}

export function calculateOrderTotal(
  jobs: PrintConfig[],
  rates: ShopPricingRates,
  serviceFee = 0
): OrderPriceBreakdown {
  const jobBreakdowns = jobs.map((job) => calculateJobPrice(job, rates));
  const subtotal = Number(
    jobBreakdowns.reduce((sum, item) => sum + item.total, 0).toFixed(2)
  );

  let finalBaseAmount = subtotal;
  let minOrderFloorApplied = false;

  if (rates.minOrderAmount && finalBaseAmount < rates.minOrderAmount) {
    finalBaseAmount = rates.minOrderAmount;
    minOrderFloorApplied = true;
  }

  const finalAmount = Number((finalBaseAmount + (serviceFee || 0)).toFixed(2));

  return {
    jobBreakdowns,
    subtotal,
    serviceFee,
    minOrderFloorApplied,
    finalAmount,
  };
}
