import { createInitialKPIs } from '@/lib/services/kpi.service';
import { fetchSheetApartmentsByDong, fetchSheetTypeMap } from '@/lib/services/googleSheets';
import { redis } from '@/lib/redis';
import { logger } from '@/lib/services/logger';
import { readJsonFileCached } from '@/lib/utils/server/fileReader';
import { serverLruCache } from '@/lib/utils/server/lruCache';
import {
  InitialPageDataSchema,
  ApartmentMetaSchema,
  FieldReportSchema,
  DongtanMacroTrendPointSchema,
  RecentTransactionSchema,
  TypeMapItemSchema,
} from '@/lib/validation/facade.schemas';
import type { InitialPageData } from '@/lib/validation/facade.schemas';
import * as FavoriteRepo from '@/lib/repositories/favorite.repository';
import * as ApartmentRepo from '@/lib/repositories/apartment.repository';
import * as ReportRepo from '@/lib/repositories/report.repository';
import { z } from 'zod';

const PAGE_DATA_CACHE_TTL = 3600; // 1 hour in-memory cache for Firestore + Sheets merge

let isRefreshingPageData = false;

export interface InitialPageDataWithScores extends InitialPageData {
  locationScores?: Record<string, any>;
}

declare global {
  var _initialPageDataCache: { data: InitialPageDataWithScores; timestamp: number } | undefined;
  var _activeFreshDataPromise: Promise<InitialPageDataWithScores> | null | undefined;
}


export async function getInitialData(): Promise<InitialPageDataWithScores> {
  const now = Date.now();
  const cache = globalThis._initialPageDataCache;

  if (cache) {
    const isStale = (now - cache.timestamp) > PAGE_DATA_CACHE_TTL * 1000;
    if (isStale && !isRefreshingPageData) {
      isRefreshingPageData = true;
      logger.info('DashboardData', 'Cache is stale, starting background revalidation.');
      
      // Promise Coalescing 적용하여 백그라운드 리밸리데이션도 단 1회만 구동되도록 병합
      let fetchPromise = globalThis._activeFreshDataPromise;
      if (!fetchPromise) {
        fetchPromise = fetchFreshData()
          .then((freshData) => {
            globalThis._initialPageDataCache = { data: freshData, timestamp: Date.now() };
            return freshData;
          })
          .finally(() => {
            isRefreshingPageData = false;
            globalThis._activeFreshDataPromise = null;
          });
        globalThis._activeFreshDataPromise = fetchPromise;
      }

      fetchPromise
        .then(() => {
          logger.info('DashboardData', 'Background revalidation completed successfully.');
        })
        .catch((err: unknown) => {
          logger.error('DashboardData', 'Background revalidation failed', {}, err as Error);
        });
    }
    return cache.data;
  }

  // 캐시 미스 상태에서 최초 1회만 fetchFreshData가 실행되도록 Promise Coalescing 적용 (Thundering Herd 완치)
  let fetchPromise = globalThis._activeFreshDataPromise;
  if (fetchPromise) {
    logger.info('DashboardData', 'Cache miss, joining active in-progress data fetch.');
    return fetchPromise;
  }

  logger.info('DashboardData', 'Cache miss, performing initial synchronous fetch.');
  fetchPromise = fetchFreshData()
    .then((freshData) => {
      globalThis._initialPageDataCache = { data: freshData, timestamp: Date.now() };
      return freshData;
    })
    .finally(() => {
      globalThis._activeFreshDataPromise = null;
    });
  
  globalThis._activeFreshDataPromise = fetchPromise;
  return fetchPromise;
}

async function fetchFreshData(): Promise<InitialPageDataWithScores> {
  const result: InitialPageDataWithScores = {
    favoriteCounts: {},
    typeMap: [],
    apartmentMeta: {},
    fieldReports: [],
    kpis: createInitialKPIs(),
    macroTrend: [],
    txSummary: {},
    recent7DaysVolume: undefined,
    recentTransactions: [],
    locationScores: {},
  };

  const fetchFavCounts = async () => {
    try {
      const l1Cache = serverLruCache.get<Record<string, number>>('favCounts');
      if (l1Cache) {
        result.favoriteCounts = l1Cache;
        return;
      }
      const favs = await FavoriteRepo.fetchFavoriteCounts();
      result.favoriteCounts = favs;
      serverLruCache.set('favCounts', favs, 60 * 1000);
    } catch (e) {
      logger.warn('DashboardData', 'favCounts error', {}, e as Error);
    }
  };

  const fetchMeta = async () => {
    try {
      const l1Cache = serverLruCache.get<z.infer<typeof ApartmentMetaSchema>>('apartmentMeta');
      if (l1Cache) {
        result.apartmentMeta = l1Cache;
        return;
      }
      const meta = await ApartmentRepo.fetchApartmentMeta();
      result.apartmentMeta = meta;
      serverLruCache.set('apartmentMeta', meta, 300 * 1000);
    } catch (e) {
      logger.warn('DashboardData', 'meta error', {}, e as Error);
    }
  };

  const fetchReports = async () => {
    try {
      const l1Cache = serverLruCache.get<z.infer<typeof FieldReportSchema>[]>('fieldReports');
      if (l1Cache) {
        result.fieldReports = l1Cache;
        return;
      }
      const reports = await ReportRepo.fetchRecentScoutingReports(30);
      result.fieldReports = reports;
      serverLruCache.set('fieldReports', reports, 120 * 1000);
    } catch (e) {
      logger.warn('DashboardData', 'reports error', {}, e as Error);
    }
  };

  const fetchMacroTrend = async () => {
    result.macroTrend = await readJsonFileCached<z.infer<typeof DongtanMacroTrendPointSchema>[]>('public/data/macro-trend.json', []);
  };

  const fetchRecentTransactions = async () => {
    result.recentTransactions = await readJsonFileCached<z.infer<typeof RecentTransactionSchema>[]>('public/data/recent-transactions.json', []);
  };

  const fetchTxSummary = async () => {
    try {
      const sumRaw = await readJsonFileCached<{ summary?: Record<string, any> } | Record<string, any>>('public/data/tx-summary.json', {});
      if (sumRaw) {
        result.txSummary = ('summary' in sumRaw && sumRaw.summary) ? sumRaw.summary : (sumRaw as any);
      }
    } catch (e) {
      logger.warn('DashboardData', 'txSummary load error', {}, e as Error);
    }
  };

  let apartmentsByDongData: Record<string, any[]> | null = null;

  const fetchApartmentsByDong = async () => {
    try {
      const parsed = await readJsonFileCached<{ byDong?: Record<string, any[]> } | null>('public/data/apartments-by-dong.json', null);
      if (parsed && parsed.byDong) {
        apartmentsByDongData = parsed.byDong;
        result.sheetApartments = parsed.byDong as any;
      }
    } catch (e) {
      logger.warn('DashboardData', 'apartmentsByDong load error', {}, e as Error);
    }
  };

  const fetchTypeMap = async () => {
    try {
      const parsed = await readJsonFileCached<z.infer<typeof TypeMapItemSchema>[]>('public/data/type-map.json', []);
      if (Array.isArray(parsed) && parsed.length > 0) {
        result.typeMap = parsed;
      }
    } catch (e) {
      logger.warn('DashboardData', 'typeMap load error', {}, e as Error);
    }
  };

  const fetchLocationScores = async () => {
    try {
      const parsed = await readJsonFileCached<Record<string, any>>('public/data/location-scores.json', {});
      if (parsed && Object.keys(parsed).length > 0) {
        result.locationScores = parsed;
      }
    } catch (e) {
      logger.warn('DashboardData', 'locationScores load error', {}, e as Error);
    }
  };

  await Promise.allSettled([
    fetchFavCounts(),
    fetchMeta(),
    fetchReports(),
    fetchMacroTrend(),
    fetchRecentTransactions(),
    fetchTxSummary(),
    fetchApartmentsByDong(),
    fetchTypeMap(),
    fetchLocationScores(),
  ]);

  // Derive fallback apartmentMeta from the single apartments-by-dong read if apartmentMeta was not populated from DB/cache
  if (Object.keys(result.apartmentMeta).length === 0) {
    const byDong = apartmentsByDongData || (result.sheetApartments as Record<string, Array<{ name: string; txKey?: string }>> | undefined);
    if (byDong) {
      const fallbackMeta: Record<string, { dong: string; txKey: string }> = {};
      Object.entries(byDong).forEach(([dongName, apts]) => {
        if (Array.isArray(apts)) {
          apts.forEach((a) => {
            if (a && a.name) {
              fallbackMeta[a.name] = { dong: dongName, txKey: a.txKey || a.name };
            }
          });
        }
      });
      result.apartmentMeta = fallbackMeta;
      logger.info('DashboardData', 'Injected fallback apartmentMeta from static json file');
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    const parsed = InitialPageDataSchema.safeParse(result);
    if (!parsed.success) {
      logger.warn('DashboardData', 'Validation failed for initial page data, returning raw result.', {}, parsed.error);
      return result;
    }
    return {
      ...parsed.data,
      ...(result.locationScores ? { locationScores: result.locationScores } : {}),
    } as InitialPageDataWithScores;
  }

  return result;
}

