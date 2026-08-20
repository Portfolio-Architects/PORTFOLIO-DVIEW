import { useCallback, useMemo } from 'react';
import { preload } from 'swr';
import type { DongApartment } from '@/lib/dong-apartments';
import type { AptTxSummary } from '@/lib/types/transaction';
import { normalizeAptName, isSameApartment, findTxKey, HARDCODED_MAPPING } from '@/lib/utils/apartmentMapping';
import { BUILD_VERSION } from '@/lib/build-version';

const fetcher = (url: string) => fetch(url).then(res => res.ok ? res.json() : []);

export function getApartmentFileKey(
  apartmentName: string,
  dong?: string,
  apartmentsMap?: Map<string, DongApartment>,
  flatApartments?: DongApartment[],
  nameMapping?: Record<string, string>,
  txSummaryData: Record<string, AptTxSummary> = {}
): string {
  if (!apartmentName) return '';
  const normalizedName = normalizeAptName(apartmentName);
  let rawApt = apartmentsMap?.get(normalizedName) || null;
  if (!rawApt && flatApartments) {
    rawApt = flatApartments.find(a => isSameApartment(a.name, apartmentName, nameMapping, a.dong, dong)) || null;
  }
  const overrideKey = HARDCODED_MAPPING[normalizedName];
  const rawTxKey = overrideKey || (rawApt as { txKey?: string })?.txKey || findTxKey(apartmentName, txSummaryData, nameMapping, false, dong);
  const txKey = rawTxKey ? normalizeAptName(rawTxKey) : '';
  return txKey || normalizedName;
}

export function preloadApartmentTxData(fileKey: string): void {
  if (!fileKey) return;
  const buildId = BUILD_VERSION;
  const recentUrl = `/tx-data/${encodeURIComponent(fileKey)}-recent.json?v=${buildId}`;
  const fullUrl = `/tx-data/${encodeURIComponent(fileKey)}.json?v=${buildId}`;
  
  try {
    preload(recentUrl, fetcher);
  } catch {
    fetch(recentUrl).catch(() => {});
  }
  
  try {
    preload(fullUrl, fetcher);
  } catch {
    fetch(fullUrl).catch(() => {});
  }
}

export function usePreloadApartmentTx(
  sheetApartments: Record<string, DongApartment[]>,
  nameMapping: Record<string, string> | undefined,
  txSummaryData: Record<string, AptTxSummary> = {}
) {
  const flatApartments = useMemo(() => {
    if (!sheetApartments) return [];
    return Object.values(sheetApartments).flat();
  }, [sheetApartments]);

  const apartmentsMap = useMemo(() => {
    const map = new Map<string, DongApartment>();
    if (!sheetApartments) return map;
    Object.values(sheetApartments).flat().forEach(apt => {
      map.set(normalizeAptName(apt.name), apt);
    });
    return map;
  }, [sheetApartments]);

  const preloadApartmentTx = useCallback((apartmentName: string, dong: string) => {
    const fileKey = getApartmentFileKey(apartmentName, dong, apartmentsMap, flatApartments, nameMapping, txSummaryData);
    if (fileKey) {
      preloadApartmentTxData(fileKey);
    }
  }, [flatApartments, apartmentsMap, txSummaryData, nameMapping]);

  return preloadApartmentTx;
}

