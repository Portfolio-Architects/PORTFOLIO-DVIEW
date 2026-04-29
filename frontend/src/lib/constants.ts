/**
 * @module constants
 * @description Shared constants and environment variable accessors.
 * Single source of truth for configuration values used across API routes.
 */

/** Google Sheets Spreadsheet ID — used by transactions + type-map APIs */
export const SHEET_ID = process.env.SHEET_ID || '1rKMt-B2FdN5nGaxaU0y2Pqv1WqnEv1AGnY7XXE7pCEE';

/** Sheet tab names */
export const SHEET_TABS = {
  TRANSACTIONS: 'DTDLS',
  TYPE_MAP: 'TYPE_MAP',
  ACADEMIES: 'academies',
  SCHOOLS: 'schools',
  STATIONS: 'stations',
  APARTMENTS: 'apartments',
  RESTAURANTS: 'restaurants',
  SBOYDS: 'SBOYDS',
  MACRO_DATA: 'MACRO_DATA',
} as const;

/** CSV line parser (shared between transaction and type-map routes) */
export function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += c;
    }
  }
  result.push(current.trim());
  return result;
}
