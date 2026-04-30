import { useState, useEffect } from 'react';
import { logger } from '@/lib/services/logger';
import { buildInitialApartments, type DongApartment } from '@/lib/dong-apartments';
import { normalizeAptName, getDisplayAptName } from '@/lib/utils/apartmentMapping';
export interface DashboardInitialDataLocal {
  typeMap?: { aptName: string; area: number | string; typeM2: string; typePyeong: string }[];
  apartmentMeta?: Record<string, { dong?: string; txKey?: string; isPublicRental?: boolean }>;
  favoriteCounts?: Record<string, number>;
  sheetApartments?: Record<string, any[]>;
}

export function useDashboardMeta(initialDashboardData?: DashboardInitialDataLocal) {
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
  const [typeMap, setTypeMap] = useState<Record<string, Record<string, { typeM2: string; typePyeong: string }>>>({});
  const [nameMapping, setNameMapping] = useState<Record<string, string> | undefined>(undefined);
  const [publicRentalSet, setPublicRentalSet] = useState<Set<string>>(new Set());

  // Fetch sheet apartments only if not provided by server
  useEffect(() => {
    if (initialDashboardData?.sheetApartments && Object.keys(initialDashboardData.sheetApartments).length > 0) return;
    
    let unmounted = false;
    fetch('/api/apartments-by-dong')
      .then(r => r.json())
      .then(data => {
        if (!unmounted && data.byDong && Object.keys(data.byDong).length > 0) {
          const updatedByDong = Object.fromEntries(
            Object.entries(data.byDong).map(([dong, apts]) => {
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
          setSheetApartments(updatedByDong);
        }
      })
      .catch((err) => { logger.warn('Dashboard', 'Failed to fetch apartments', {}, err); });

      return () => { unmounted = true; };
  }, []);

  // Fetch init map (or use SSR props)
  useEffect(() => {
    if (initialDashboardData) {
      if (initialDashboardData.typeMap) {
        const map: Record<string, Record<string, { typeM2: string; typePyeong: string }>> = {};
        for (const e of initialDashboardData.typeMap) {
          const key = normalizeAptName(e.aptName);
          if (!map[key]) map[key] = {};
          map[key][String(Number(e.area))] = { typeM2: e.typeM2, typePyeong: e.typePyeong };
        }
        setTypeMap(map);
      }
      if (initialDashboardData.apartmentMeta) {
        const mapping: Record<string, string> = {};
        const rentals = new Set<string>();
        for (const [name, meta] of Object.entries(initialDashboardData.apartmentMeta)) {
          if (!meta || typeof meta !== 'object' || !(meta as Record<string, unknown>).dong) continue;
          if ((meta as Record<string, string>).txKey) mapping[name] = (meta as Record<string, string>).txKey;
          if ((meta as Record<string, unknown>).isPublicRental) rentals.add(name);
        }
        setNameMapping(mapping);
        setPublicRentalSet(rentals);
      } else {
        setNameMapping({});
      }
      return;
    }

    let unmounted = false;
    fetch('/api/dashboard-init').then(r => r.json()).then(data => {
      if (unmounted) return;
      if (data.typeMap) {
        const map: Record<string, Record<string, { typeM2: string; typePyeong: string }>> = {};
        for (const e of data.typeMap) {
          const key = normalizeAptName(e.aptName);
          if (!map[key]) map[key] = {};
          map[key][String(Number(e.area))] = { typeM2: e.typeM2, typePyeong: e.typePyeong };
        }
        setTypeMap(map);
      }
      if (data.apartmentMeta) {
        const mapping: Record<string, string> = {};
        const rentals = new Set<string>();
        for (const [name, meta] of Object.entries(data.apartmentMeta)) {
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
  }, [initialDashboardData]);

  return {
    sheetApartments,
    typeMap,
    nameMapping,
    publicRentalSet
  };
}
