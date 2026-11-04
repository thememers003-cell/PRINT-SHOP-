/**
 * Generates a standard Job ID: PB-YYYY-XXXXXX (e.g. PB-2026-000001)
 */
export function generateJobId(sequenceNum: number, year = new Date().getFullYear()): string {
  const padded = String(sequenceNum).padStart(6, '0');
  return `PB-${year}-${padded}`;
}

