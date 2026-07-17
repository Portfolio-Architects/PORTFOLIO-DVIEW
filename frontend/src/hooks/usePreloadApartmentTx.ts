import { useCallback, useMemo } from 'react';
import { preload } from 'swr';
import type { DongApartment } from '@/lib/dong-apartments';
import type { AptTxSummary } from '@/lib/types/transaction';
import { normalizeAptName, isSameApartment, findTxKey, HARDCODED_MAPPING } from '@/lib/utils/apartmentMapping';
import { BUILD_VERSION } from '@/lib/build-version';

const fetcher = (url: string) => fetch(url).then(res => res.ok ? res.json() : []);

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
    if (!apartmentName) return;
    const normalizedName = normalizeAptName(apartmentName);
    let rawApt = apartmentsMap.get(normalizedName) || null;
    if (!rawApt) {
      rawApt = flatApartments.find(a => isSameApartment(a.name, apartmentName, nameMapping, a.dong, dong)) || null;
    }
    const overrideKey = HARDCODED_MAPPING[normalizedName];
    const rawTxKey = overrideKey || (rawApt as { txKey?: string })?.txKey || findTxKey(apartmentName, txSummaryData, nameMapping, false, dong);
    const txKey = rawTxKey ? normalizeAptName(rawTxKey) : '';
    const fileKey = txKey || normalizedName;

    if (fileKey) {
      const buildId = BUILD_VERSION;
      const recentUrl = `/tx-data/${encodeURIComponent(fileKey)}-recent.json?v=${buildId}`;
      const fullUrl = `/tx-data/${encodeURIComponent(fileKey)}.json?v=${buildId}`;
      
      try {
        preload(recentUrl, fetcher);
      } catch (e) {
        fetch(recentUrl).catch(() => {});
      }
      
      try {
        preload(fullUrl, fetcher);
      } catch (e) {
        fetch(fullUrl).catch(() => {});
      }
    }
  }, [flatApartments, apartmentsMap, txSummaryData, nameMapping]);

  return preloadApartmentTx;
}
