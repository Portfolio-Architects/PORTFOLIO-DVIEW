'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import type { RecentTransaction } from '@/types/transaction';
import { getTodayYmdKST, type MarketStatsInput } from '@/lib/todayUpdateEvaluator';

export interface LiveDeltaRawRecord {
  txKey?: string;
  dong?: string;
  sigungu?: string;
  aptName: string;
  dealType: string;
  contractYm: string;
  contractDay: string;
  contractDate?: string;
  registeredDate?: string;
  registeredDateLabel?: string;
  registrationDate?: string;
  price: number;
  deposit: number;
  monthlyRent: number;
  area: number;
  areaPyeong: number;
  floor: number;
  buildYear?: number;
  buyer?: string;
  seller?: string;
  reqGb?: string;
  rnuYn?: string;
}

export interface LiveTransactionDeltaResponse {
  hasDelta: boolean;
  baselineRegisteredDate: string;
  marketStats: (MarketStatsInput & { saleTxCount: number }) | null;
  deltaTransactions: RecentTransaction[];
  rawDeltaDocs: LiveDeltaRawRecord[];
}

export function isClientLiveTxDeltaEnabled(): boolean {
  if (process.env.NODE_ENV === 'test') {
    return process.env.ENABLE_LIVE_TX_DELTA_IN_TEST === '1';
  }
  return true;
}

const liveDeltaFetcher = async (url: string): Promise<LiveTransactionDeltaResponse | null> => {
  if (typeof fetch !== 'function') return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as LiveTransactionDeltaResponse;
  } catch {
    return null;
  }
};

/**
 * Client SWR hook fetching the CDN-cached post-build Firestore transaction delta.
 * Ensures newly disclosed 05:xx~06:xx KST MOLIT records appear immediately without waiting for a full static rebuild.
 */
export function useLiveTransactionDelta(enabled: boolean = true) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const canFetch = enabled && mounted && isClientLiveTxDeltaEnabled();
  const swrKey = canFetch ? `/api/transactions/live-delta?d=${getTodayYmdKST()}` : null;

  return useSWR<LiveTransactionDeltaResponse | null>(swrKey, liveDeltaFetcher, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 60000,
    shouldRetryOnError: false,
  });
}

function normalizeAptKeyClient(name: string): string {
  if (!name) return '';
  return name
    .normalize('NFC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\[.*?\]\s*/g, '')
    .replace(/\s+/g, '')
    .replace(/[()（）]/g, '')
    .trim();
}

function buildRecentTxDedupKey(tx: {
  txKey?: string;
  aptName?: string;
  contractDate?: string;
  area?: number;
  floor?: number | string;
  priceVal?: number;
}): string {
  const key = normalizeAptKeyClient(String(tx.txKey || tx.aptName || ''));
  const cDate = String(tx.contractDate || '').replace(/[^0-9]/g, '').slice(0, 8);
  const areaNum = Number(tx.area || 0);
  const areaFixed = Number.isFinite(areaNum) ? areaNum.toFixed(2) : '0.00';
  const floorStr = String(tx.floor ?? 0).trim();
  const priceNum = Number(tx.priceVal || 0);
  const priceFixed = Number.isFinite(priceNum) ? priceNum.toFixed(4) : '0.0000';
  return `${key}|${cDate}|${areaFixed}|${floorStr}|${priceFixed}`;
}

/**
 * Idempotently merges post-build delta transactions onto a base RecentTransaction array.
 * Preserves array reference when no unseen records are added.
 */
export function mergeLiveDeltaRecentTransactions(
  base: RecentTransaction[],
  deltaTxs?: RecentTransaction[]
): RecentTransaction[] {
  if (!deltaTxs || deltaTxs.length === 0) return base;

  const existingKeys = new Set(base.map(buildRecentTxDedupKey));
  const additions: RecentTransaction[] = [];

  for (const tx of deltaTxs) {
    const key = buildRecentTxDedupKey(tx);
    if (!existingKeys.has(key)) {
      existingKeys.add(key);
      additions.push(tx);
    }
  }

  if (additions.length === 0) return base;

  const combined = [...additions, ...base];
  combined.sort((a, b) => String(b.contractDate || '').localeCompare(String(a.contractDate || '')));
  return combined;
}

/**
 * Checks whether all delta transactions are already present in the SSR-provided baseline list
 * to prevent double-counting txCount in mergeTransactions().
 */
export function hasDeltaAlreadyInRecent(
  base: RecentTransaction[] | undefined,
  deltaTxs?: RecentTransaction[]
): boolean {
  if (!base || base.length === 0 || !deltaTxs || deltaTxs.length === 0) return false;
  const baseKeys = new Set(base.map(buildRecentTxDedupKey));
  return deltaTxs.every((tx) => baseKeys.has(buildRecentTxDedupKey(tx)));
}

function buildRawRecordDedupKey(r: Record<string, unknown>): string {
  const ym = String(r.contractYm || '');
  const day = String(r.contractDay || '').replace(/[^0-9]/g, '').padStart(2, '0');
  const cDate = String(r.contractDate || `${ym}${day}`).replace(/[^0-9]/g, '').slice(0, 8);
  const areaNum = Number(r.area || 0);
  const areaFixed = Number.isFinite(areaNum) ? areaNum.toFixed(2) : '0.00';
  const floorStr = String(r.floor ?? 0).trim();
  const deal = String(r.dealType || '매매').trim();
  const priceVal = Number(r.price || 0);
  const depVal = Number(r.deposit || 0);
  return `${cDate}|${areaFixed}|${floorStr}|${deal}|${priceVal}|${depVal}`;
}

/**
 * Merges matching raw delta records from Firestore into an apartment detail record array.
 */
export function mergeLiveDeltaIntoApartmentRecords<T extends Record<string, unknown>>(
  records: T[],
  fileKey: string,
  rawDeltaDocs?: LiveDeltaRawRecord[]
): T[] {
  if (!fileKey || !rawDeltaDocs || rawDeltaDocs.length === 0) return records;

  const targetKey = normalizeAptKeyClient(fileKey);
  if (!targetKey) return records;

  const existingKeys = new Set(records.map(buildRawRecordDedupKey));
  const additions: T[] = [];

  for (const doc of rawDeltaDocs) {
    const matchesTxKey = doc.txKey ? normalizeAptKeyClient(doc.txKey) === targetKey : false;
    const matchesAptName = normalizeAptKeyClient(doc.aptName || '') === targetKey;
    if (!matchesTxKey && !matchesAptName) continue;

    const recordObj = {
      ...doc,
      contractDay: String(doc.contractDay || '').replace(/[^0-9]/g, '').padStart(2, '0'),
    } as unknown as T;

    const dedupKey = buildRawRecordDedupKey(recordObj);
    if (!existingKeys.has(dedupKey)) {
      existingKeys.add(dedupKey);
      additions.push(recordObj);
    }
  }

  if (additions.length === 0) return records;

  const combined = [...additions, ...records];
  combined.sort((a, b) => {
    const aYm = String(a.contractYm || '');
    const aDay = String(a.contractDay || '').replace(/[^0-9]/g, '').padStart(2, '0');
    const aDate = String(a.contractDate || `${aYm}${aDay}`);
    const bYm = String(b.contractYm || '');
    const bDay = String(b.contractDay || '').replace(/[^0-9]/g, '').padStart(2, '0');
    const bDate = String(b.contractDate || `${bYm}${bDay}`);
    return bDate.localeCompare(aDate);
  });
  return combined;
}
