import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/services/logger';
import { buildInitialApartments, type DongApartment } from '@/lib/dong-apartments';
import { normalizeAptName, getDisplayAptName } from '@/lib/utils/apartmentMapping';
import type { KPIData } from '@/lib/types/dashboard.types';
import type { FieldReportData } from '@/lib/types/report.types';
import type { DongtanMacroTrendPoint, AptTxSummary, Recent7DaysVolume, RecentTransaction } from '@/lib/types/transaction';
import { z } from 'zod';

const TypeMapEntrySchema = z.object({
  aptName: z.string().catch(''),
  area: z.union([z.string(), z.number()]).catch(''),
  typeM2: z.string().catch(''),
  typePyeong: z.string().catch(''),
});

const ApartmentMetaValueSchema = z.object({
  dong: z.string().optional().catch(undefined),
  txKey: z.string().optional().catch(undefined),
  isPublicRental: z.boolean().optional().catch(undefined),
}).catchall(z.any());

const ApartmentsByDongResponseSchema = z.object({
  byDong: z.record(z.string(), z.array(z.any())).optional().catch(undefined),
}).passthrough();

const DashboardInitResponseSchema = z.object({
  typeMap: z.array(TypeMapEntrySchema).optional().catch(undefined),
  apartmentMeta: z.record(z.string(), ApartmentMetaValueSchema).optional().catch(undefined),
}).passthrough();

export interface DashboardInitialDataLocal {
  typeMap?: { aptName: string; area: number | string; typeM2: string; typePyeong: string }[];
  apartmentMeta?: Record<string, { dong?: string; txKey?: string; isPublicRental?: boolean }>;
  favoriteCounts?: Record<string, number>;
  sheetApartments?: Record<string, DongApartment[]>;
  kpis?: KPIData[];
  fieldReports?: FieldReportData[];
  macroTrend?: DongtanMacroTrendPoint[];
  txSummary?: Record<string, AptTxSummary>;
  recent7DaysVolume?: Recent7DaysVolume;
  recentTransactions?: RecentTransaction[];
}

export function useDashboardMeta(initialDashboardData?: DashboardInitialDataLocal) {
  const [startFetch, setStartFetch] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sheetApartments, setSheetApartments] = useState<Record<string, DongApartment[]>>(() => {
    if (initialDashboardData?.sheetApartments && Object.keys(initialDashboardData.sheetApartments).length > 0) {
      const updatedByDong = Object.fromEntries(
        Object.entries(initialDashboardData.sheetApartments).map(([dong, apts]) => {
          const mappedApts = (apts as DongApartment[]).map(a => ({ ...a, name: getDisplayAptName(a.name) }));
          const dedupedMap = new Map<string, DongApartment>();
          for (const a of mappedApts) {
            const existing = dedupedMap.get(a.name);
            if (!existing || (a.lat !== 0 && existing.lat === 0) || (a.householdCount && !existing.householdCount)) {
              dedupedMap.set(a.name, a);
            }
          }
          return [dong, Array.from(dedupedMap.values())];
        })
      );
      return updatedByDong;
    }
    return buildInitialApartments();
  });
  const [typeMap, setTypeMap] = useState<Record<string, Record<string, { typeM2: string; typePyeong: string }>>>(() => {
    if (initialDashboardData?.typeMap) {
      const map: Record<string, Record<string, { typeM2: string; typePyeong: string }>> = {};
      for (const e of initialDashboardData.typeMap) {
        const key = normalizeAptName(e.aptName);
        if (!map[key]) map[key] = {};
        map[key][String(Number(e.area))] = { typeM2: e.typeM2, typePyeong: e.typePyeong };
      }
      return map;
    }
    return {};
  });
  const [nameMapping, setNameMapping] = useState<Record<string, string> | undefined>(() => {
    if (initialDashboardData?.apartmentMeta) {
      const mapping: Record<string, string> = {};
      for (const [name, meta] of Object.entries(initialDashboardData.apartmentMeta)) {
        if (!meta || typeof meta !== 'object' || !(meta as Record<string, unknown>).dong) continue;
        if ((meta as Record<string, string>).txKey) mapping[name] = (meta as Record<string, string>).txKey;
      }
      return mapping;
    }
    return undefined;
  });
  const [publicRentalSet, setPublicRentalSet] = useState<Set<string>>(() => {
    if (initialDashboardData?.apartmentMeta) {
      const rentals = new Set<string>();
      for (const [name, meta] of Object.entries(initialDashboardData.apartmentMeta)) {
        if (!meta || typeof meta !== 'object' || !(meta as Record<string, unknown>).dong) continue;
        if ((meta as Record<string, unknown>).isPublicRental) rentals.add(name);
      }
      return rentals;
    }
    return new Set();
  });

  const triggerFetch = useCallback(() => {
    setStartFetch(true);
  }, []);

  const hasSheetData = !!(initialDashboardData?.sheetApartments && Object.keys(initialDashboardData.sheetApartments).length > 0);

  // Fetch combined sheet apartments and typeMap on demand (Lazy Fetching)
  useEffect(() => {
    if (hasSheetData || !startFetch) return;
    
    let unmounted = false;
    setIsLoading(true);
    
    fetch('/api/explore/search-data')
      .then(r => r.json())
      .then(data => {
        if (unmounted) return;
        
        if (data.sheetApartments && Object.keys(data.sheetApartments).length > 0) {
          const updatedByDong = Object.fromEntries(
            Object.entries(data.sheetApartments).map(([dong, apts]) => {
              const mappedApts = (apts as DongApartment[]).map(a => ({ ...a, name: getDisplayAptName(a?.name || '') }));
              const dedupedMap = new Map<string, DongApartment>();
              for (const a of mappedApts) {
                if (!a) continue;
                const existing = dedupedMap.get(a.name);
                if (!existing || (a.lat !== 0 && existing.lat === 0) || (a.householdCount && !existing.householdCount)) {
                  dedupedMap.set(a.name, a);
                }
              }
              return [dong, Array.from(dedupedMap.values())];
            })
          );
          setSheetApartments(updatedByDong);
        }

        if (data.typeMap) {
          const map: Record<string, Record<string, { typeM2: string; typePyeong: string }>> = {};
          for (const e of data.typeMap) {
            const key = normalizeAptName(e.aptName);
            if (!map[key]) map[key] = {};
            map[key][String(Number(e.area))] = { typeM2: e.typeM2, typePyeong: e.typePyeong };
          }
          setTypeMap(map);
        }
      })
      .catch((err) => { 
        logger.warn('DashboardMeta', 'Failed to lazy fetch search data', {}, err); 
      })
      .finally(() => {
        if (!unmounted) setIsLoading(false);
      });

      return () => { unmounted = true; };
  }, [hasSheetData, startFetch]);

  // Fetch init map only if not provided by server (and not starting the combined lazy fetch yet)
  useEffect(() => {
    const hasInitialTypeMap = !!(initialDashboardData?.typeMap && initialDashboardData.typeMap.length > 0);
    if (hasInitialTypeMap || startFetch) return;

    let unmounted = false;
    fetch('/api/dashboard-init').then(r => r.json()).then(data => {
      if (unmounted) return;
      const validation = DashboardInitResponseSchema.safeParse(data);
      if (!validation.success) {
        logger.warn('useDashboardMeta.fetchDashboardInit', 'Validation failed for /api/dashboard-init', {
          errors: validation.error.issues.map(e => e.message),
        });
        setNameMapping({});
        return;
      }
      const validatedData = validation.data;
      if (validatedData.typeMap) {
        const map: Record<string, Record<string, { typeM2: string; typePyeong: string }>> = {};
        for (const e of validatedData.typeMap) {
          const key = normalizeAptName(e.aptName);
          if (!map[key]) map[key] = {};
          map[key][String(Number(e.area))] = { typeM2: e.typeM2, typePyeong: e.typePyeong };
        }
        setTypeMap(map);
      }
      if (validatedData.apartmentMeta) {
        const mapping: Record<string, string> = {};
        const rentals = new Set<string>();
        for (const [name, meta] of Object.entries(validatedData.apartmentMeta)) {
          if (!meta || typeof meta !== 'object' || !(meta as Record<string, unknown>).dong) continue;
          if ((meta as Record<string, string>).txKey) mapping[name] = (meta as Record<string, string>).txKey;
          if ((meta as Record<string, unknown>).isPublicRental) rentals.add(name);
        }
        setNameMapping(mapping);
        setPublicRentalSet(rentals);
      } else {
        setNameMapping({});
      }
    }).catch(() => !unmounted && setNameMapping({}));
    return () => { unmounted = true; };
  }, [initialDashboardData, startFetch]);

  return {
    sheetApartments,
    typeMap,
    nameMapping,
    publicRentalSet,
    triggerFetch,
    isLoading
  };
}
