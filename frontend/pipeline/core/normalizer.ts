/**
 * @module normalizer
 * @description Single Source of Truth (SSOT) for apartment name normalization,
 * transaction cancellation detection, canonical transaction key generation,
 * supply pyeong conversion, and file name sanitization across pipeline and frontend.
 * 
 * Complies with PROJECT.md Interface Contracts and HODEP v2.2 Deterministic Epistemic Protocol.
 */

import { z } from 'zod';
import typeMapDataJson from '../../public/data/type-map.json';

export interface TypeMapItem {
  aptName?: string;
  area?: string;
  typeM2?: string;
  typePyeong?: string;
}

export interface TransactionCancellationFields {
  isCanceled?: boolean | null;
  cdealType?: string | null;
  cdealDay?: string | number | null;
  cancelDealDay?: string | number | null;
  cancelDate?: string | number | null;
  [key: string]: unknown;
}

export interface CanonicalTxKeyParams {
  aptName: string;
  dealDate: string | number;
  area: number | string;
  floor: number | string;
  price: number | string;
  dealType?: string | null;
}

/**
 * Normalizes an apartment name:
 * 1. Unicode NFC normalization (recombines decomposed Korean jamo)
 * 2. Removes zero-width spaces (\u200B-\u200D\uFEFF)
 * 3. Removes bracketed dong prefixes (e.g. "[오산동]")
 * 4. Removes all whitespace
 * 5. Removes halfwidth and fullwidth parentheses (e.g. "()", "（）")
 * 6. Collapses consecutive dots and strips trailing dots
 * 7. Trims leading/trailing whitespace
 */
export function normalizeAptName(name: string | undefined | null): string {
  if (name === null || name === undefined) return '';
  const parsed = typeof name === 'string' ? name : (z.string().catch('').parse(name) || '');
  if (!parsed) return '';

  return parsed
    .normalize('NFC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\[.*?\]\s*/g, '')
    .replace(/\s+/g, '')
    .replace(/[()（）]/g, '')
    .replace(/\.{2,}/g, '')
    .replace(/\.+$/, '')
    .trim();
}

/**
 * Evaluates whether a transaction is cancelled or invalid.
 * Exhaustively defends against all cancel indicators:
 * - isCanceled flag
 * - cdealType === 'O' or '해제'
 * - Valid cancelDate, cdealDay, or cancelDealDay values
 */
export function isCancelledTransaction(t: TransactionCancellationFields | null | undefined): boolean {
  if (!t || typeof t !== 'object') return false;
  if (t.isCanceled === true) return true;
  if (t.cdealType === 'O' || t.cdealType === '해제') return true;

  const isInvalidDate = (v: unknown): boolean => {
    if (v === null || v === undefined) return true;
    const s = String(v).trim().toLowerCase();
    return !s || s === '-' || s === 'null' || s === 'undefined' || s === 'nan';
  };

  if (!isInvalidDate(t.cancelDate)) return true;
  if (!isInvalidDate(t.cdealDay)) return true;
  if (!isInvalidDate(t.cancelDealDay)) return true;

  return false;
}

/**
 * Generates a deterministic canonical transaction key.
 * Format: TX_${normApt}_${dealDate8}_${area2dec}_${floor}_${price}_${dealType}
 */
export function generateCanonicalTxKey(tx: CanonicalTxKeyParams): string {
  if (!tx || typeof tx !== 'object') return '';

  const normApt = normalizeAptName(tx.aptName);
  const rawDate = String(tx.dealDate || '').replace(/\D/g, '');
  const cleanDate = rawDate.padEnd(8, '0').slice(0, 8);
  const numArea = Number(tx.area) || 0;
  const cleanArea = numArea.toFixed(2);
  const cleanFloor = Number(tx.floor) || 0;
  const cleanPrice = Number(tx.price) || 0;
  const rawDealType = typeof tx.dealType === 'string' ? tx.dealType.trim() : '';
  const cleanDealType = (rawDealType === '전세' || rawDealType === '월세') ? rawDealType : '매매';

  return `TX_${normApt}_${cleanDate}_${cleanArea}_${cleanFloor}_${cleanPrice}_${cleanDealType}`;
}

// Internal lookup table for supply pyeong conversion
const typeMapLookup: Record<string, Record<string, number>> = {};
const typeMapData = typeMapDataJson as TypeMapItem[];

for (const item of typeMapData) {
  if (!item.aptName || !item.area) continue;
  const normApt = normalizeAptName(item.aptName);
  if (!typeMapLookup[normApt]) {
    typeMapLookup[normApt] = {};
  }

  let pyeong: number | null = null;
  if (item.typeM2) {
    const match = item.typeM2.match(/\d+(\.\d+)?/);
    if (match) {
      pyeong = Math.round(parseFloat(match[0]) * 0.3025 * 10) / 10;
    }
  }
  if (pyeong === null && item.typePyeong) {
    const match = item.typePyeong.match(/\d+(\.\d+)?/);
    if (match) {
      pyeong = Math.round(parseFloat(match[0]) * 10) / 10;
    }
  }
  if (pyeong !== null) {
    typeMapLookup[normApt][item.area] = pyeong;
  }
}

/**
 * Calculates or looks up the supply pyeong (공급평형) for a given apartment and exclusive area.
 * 1. Exact match by aptName & area in type-map.json
 * 2. Fallback tolerance match (< 0.11 m²) in type-map.json
 * 3. Formula fallback: Math.round(area * 0.3025 * 1.33 * 10) / 10
 */
export function getSupplyPyeong(aptName: string, area: number): number {
  if (!area || isNaN(area)) return 0;

  const normApt = normalizeAptName(aptName);
  const aptEntry = typeMapLookup[normApt] || (aptName ? typeMapLookup[aptName] : undefined);

  if (aptEntry) {
    // 1. Exact match
    const exactKey = String(area);
    if (aptEntry[exactKey] !== undefined) {
      return aptEntry[exactKey];
    }

    // 2. Tolerance match (< 0.11 m²)
    for (const [keyStr, val] of Object.entries(aptEntry)) {
      const keyNum = parseFloat(keyStr);
      if (!isNaN(keyNum) && Math.abs(keyNum - area) < 0.11) {
        return val;
      }
    }
  }

  // 3. Formula fallback
  return Math.round(area * 0.3025 * 1.33 * 10) / 10;
}

/**
 * Sanitizes apartment key by stripping parentheses, normalizing Roman numerals,
 * normalizing '&' to '앤', removing commas and illegal OS characters, and stripping trailing dots.
 */
export function sanitizeAptKey(name: string | undefined | null): string {
  if (!name) return '';
  const normalized = normalizeAptName(name);

  return normalized
    .replace(/Ⅰ/g, '1')
    .replace(/Ⅱ/g, '2')
    .replace(/Ⅲ/g, '3')
    .replace(/Ⅳ/g, '4')
    .replace(/&/g, '앤')
    .replace(/,/g, '')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\.{2,}/g, '')
    .replace(/\.+$/, '')
    .trim();
}

/**
 * Sanitizes apartment chunk file names for public/tx-data storage.
 * Handles both standard chunk files (${aptKey}.json) and recent chunks (${aptKey}-recent.json).
 */
export function sanitizeAptChunkFileName(rawFileName: string): string {
  if (!rawFileName) return '';
  const isRecent = rawFileName.endsWith('-recent.json');
  const baseName = isRecent
    ? rawFileName.slice(0, -12)
    : (rawFileName.endsWith('.json') ? rawFileName.slice(0, -5) : rawFileName);

  const cleanBase = sanitizeAptKey(baseName);
  if (!cleanBase) return '';

  return isRecent ? `${cleanBase}-recent.json` : `${cleanBase}.json`;
}

