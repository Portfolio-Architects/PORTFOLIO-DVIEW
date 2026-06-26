import { adminDb } from '@/lib/firebaseAdmin';
import { createInitialKPIs } from '@/lib/services/kpi.service';
import { fetchSheetApartmentsByDong, fetchSheetTypeMap } from '@/lib/services/googleSheets';
import { redis } from '@/lib/redis';
import { logger } from '@/lib/services/logger';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { readJsonFileCached } from '@/lib/utils/server/fileReader';
import { serverLruCache } from '@/lib/utils/server/lruCache';
import { formatTimestamp, parseTimestampToMillis } from '@/lib/utils/date';



const PAGE_DATA_CACHE_TTL = 3600; // 1 hour in-memory cache for Firestore + Sheets merge

let isRefreshingPageData = false;

const TypeMapItemSchema = z.object({
  aptName: z.string(),
  area: z.string(),
  typeM2: z.string(),
  typePyeong: z.string(),
});

const ApartmentMetaItemSchema = z.object({
  dong: z.string().optional(),
  txKey: z.string().optional(),
  isPublicRental: z.boolean().optional(),
});

const ApartmentMetaSchema = z.record(z.string(), ApartmentMetaItemSchema);

const FieldReportSchema = z.object({
  id: z.string(),
  dong: z.string().optional(),
  apartmentName: z.string(),
  premiumScores: z.any().optional(),
  premiumContent: z.string().optional(),
  pros: z.string().optional(),
  cons: z.string().optional(),
  rating: z.number().int().nonnegative().optional(),
  author: z.string(),
  likes: z.number().int().nonnegative().default(0),
  viewCount: z.number().int().nonnegative().optional(),
  commentCount: z.number().int().nonnegative().default(0),
  imageUrl: z.string().optional(),
  thumbnail: z.string().optional(),
  images: z.array(z.any()).optional(),
  metrics: z.any().optional(),
  scoutingDate: z.string().optional(),
  createdAt: z.any().optional(),
  _rawTimestamp: z.number().optional(),
});

const DongtanMacroTrendPointSchema = z.object({
  name: z.string(),
  '동탄 아파트 전체': z.number(),
  '동탄 아파트 전세 평균': z.number(),
});

export const InitialPageDataSchema = z.object({
  favoriteCounts: z.record(z.string(), z.number().int().nonnegative()),
  typeMap: z.array(TypeMapItemSchema).optional(),
  apartmentMeta: ApartmentMetaSchema,
  sheetApartments: z.record(z.string(), z.array(z.any())).optional(),
  fieldReports: z.array(FieldReportSchema),
  kpis: z.array(z.any()).optional(),
  macroTrend: z.array(DongtanMacroTrendPointSchema).optional(),
  txSummary: z.record(z.string(), z.any()).optional(),
  recent7DaysVolume: z.any().optional(),
  recentTransactions: z.array(z.any()).optional(),
});

export type InitialPageData = z.infer<typeof InitialPageDataSchema>;

export async function getInitialData(): Promise<InitialPageData> {
  const now = Date.now();
  const cache = (globalThis as any)._initialPageDataCache;

  if (cache) {
    const isStale = (now - cache.timestamp) > PAGE_DATA_CACHE_TTL * 1000;
    if (isStale && !isRefreshingPageData) {
      isRefreshingPageData = true;
      logger.info('DashboardData', 'Cache is stale, starting background revalidation.');
      
      // Promise Coalescing 적용하여 백그라운드 리밸리데이션도 단 1회만 구동되도록 병합
      let fetchPromise = (globalThis as any)._activeFreshDataPromise;
      if (!fetchPromise) {
        fetchPromise = fetchFreshData()
          .then((freshData) => {
            (globalThis as any)._initialPageDataCache = { data: freshData, timestamp: Date.now() };
            return freshData;
          })
          .finally(() => {
            isRefreshingPageData = false;
            (globalThis as any)._activeFreshDataPromise = null;
          });
        (globalThis as any)._activeFreshDataPromise = fetchPromise;
      }

      fetchPromise
        .then(() => {
          logger.info('DashboardData', 'Background revalidation completed successfully.');
        })
        .catch((err: any) => {
          logger.error('DashboardData', 'Background revalidation failed', {}, err);
        });
    }
    return cache.data;
  }

  // 캐시 미스 상태에서 최초 1회만 fetchFreshData가 실행되도록 Promise Coalescing 적용 (Thundering Herd 완치)
  let fetchPromise = (globalThis as any)._activeFreshDataPromise;
  if (fetchPromise) {
    logger.info('DashboardData', 'Cache miss, joining active in-progress data fetch.');
    return fetchPromise;
  }

  logger.info('DashboardData', 'Cache miss, performing initial synchronous fetch.');
  fetchPromise = fetchFreshData()
    .then((freshData) => {
      (globalThis as any)._initialPageDataCache = { data: freshData, timestamp: Date.now() };
      return freshData;
    })
    .finally(() => {
      (globalThis as any)._activeFreshDataPromise = null;
    });
  
  (globalThis as any)._activeFreshDataPromise = fetchPromise;
  return fetchPromise;
}

async function fetchFreshData(): Promise<InitialPageData> {
  const result: InitialPageData = {
    favoriteCounts: {},
    typeMap: [],
    apartmentMeta: {},
    fieldReports: [],
    kpis: createInitialKPIs(),
    macroTrend: [],
    txSummary: {},
    recent7DaysVolume: undefined,
    recentTransactions: [],
  };

  // Upstash Redis 파이프라인 일괄 실행을 통해 RTT 네트워크 왕복 최소화 (서버 사이드 레이턴시 절감)
  let pipelineResults: any[] = [null, null, null];
  if (redis) {
    try {
      const p = redis.pipeline();
      p.hgetall('DTDLS:cache:favoriteCounts');
      p.get('DTDLS:cache:apartmentMeta');
      p.get('DTDLS:cache:fieldReports');
      pipelineResults = await p.exec();
    } catch (e) {
      logger.warn('DashboardData', 'Redis pipeline execution failed, falling back to sequential / DB', {}, e);
    }
  }

  const [pipelinedFavs, pipelinedMeta, pipelinedReports] = pipelineResults;

  const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> => {
    let timeoutId: any;
    const timeoutPromise = new Promise<T>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('Firebase timeout')), ms);
    });
    return Promise.race([
      promise.then((val) => {
        clearTimeout(timeoutId);
        return val;
      }).catch((err) => {
        clearTimeout(timeoutId);
        throw err;
      }),
      timeoutPromise
    ]);
  };

  const fetchFavCounts = async () => {
    const l1Cache = serverLruCache.get<Record<string, number>>('favCounts');
    if (l1Cache) {
      result.favoriteCounts = l1Cache;
      return;
    }

    if (pipelinedFavs && Object.keys(pipelinedFavs).length > 0) {
      const castedFavs: Record<string, number> = {};
      Object.entries(pipelinedFavs).forEach(([k, v]) => {
        castedFavs[k] = Number(v) || 0;
      });
      result.favoriteCounts = castedFavs;
      serverLruCache.set('favCounts', castedFavs, 60 * 1000);
      return;
    }
    if (adminDb) {
      const snap = await withTimeout(adminDb.collection('favoriteCounts').get(), 1000);
      snap.docs.forEach((doc) => {
        const data = doc.data();
        if (data.count > 0) result.favoriteCounts[data.aptName || doc.id] = data.count;
      });
      serverLruCache.set('favCounts', result.favoriteCounts, 60 * 1000);
      if (redis && Object.keys(result.favoriteCounts).length > 0) {
        redis.hset('DTDLS:cache:favoriteCounts', result.favoriteCounts).catch(err => 
          logger.warn('DashboardData.fetchFavCounts', 'Redis favoriteCounts write-back failed', {}, err)
        );
      }
    }
  };

  const fetchMeta = async () => {
    const l1Cache = serverLruCache.get<z.infer<typeof ApartmentMetaSchema>>('apartmentMeta');
    if (l1Cache) {
      result.apartmentMeta = l1Cache;
      return;
    }

    let parsedMeta = pipelinedMeta;
    if (typeof pipelinedMeta === 'string') {
      try { parsedMeta = JSON.parse(pipelinedMeta); } catch { parsedMeta = null; }
    }
    if (parsedMeta && typeof parsedMeta === 'object' && Object.keys(parsedMeta).length > 0) {
      result.apartmentMeta = parsedMeta as Record<string, { dong?: string; txKey?: string; isPublicRental?: boolean }>;
      serverLruCache.set('apartmentMeta', result.apartmentMeta, 300 * 1000);
      return;
    }
    if (adminDb) {
      const metaDoc = await withTimeout(adminDb.doc('settings/apartmentMeta').get(), 1000);
      if (metaDoc.exists) {
        const metaData = (metaDoc.data() || {}) as Record<string, { dong?: string; txKey?: string; isPublicRental?: boolean }>;
        result.apartmentMeta = metaData;
        serverLruCache.set('apartmentMeta', metaData, 300 * 1000);
        if (redis && Object.keys(metaData).length > 0) {
          redis.set('DTDLS:cache:apartmentMeta', metaData, { ex: 86400 }).catch(e => logger.warn('DashboardData', 'Redis meta write error', {}, e));
        }
      }
    }
  };

  const fetchReports = async () => {
    const l1Cache = serverLruCache.get<z.infer<typeof FieldReportSchema>[]>('fieldReports');
    if (l1Cache) {
      result.fieldReports = l1Cache;
      return;
    }

    let parsedReports = pipelinedReports;
    if (typeof pipelinedReports === 'string') {
      try { parsedReports = JSON.parse(pipelinedReports); } catch { parsedReports = null; }
    }
    if (parsedReports && Array.isArray(parsedReports) && parsedReports.length > 0) {
      result.fieldReports = parsedReports;
      serverLruCache.set('fieldReports', parsedReports, 120 * 1000);
      return;
    }
    if (adminDb) {
      const snap = await withTimeout(adminDb.collection('scoutingReports').orderBy('createdAt', 'desc').limit(30).get(), 1000);
      const reports = snap.docs.map(doc => {
        const data = doc.data();
        const createdAtStr = formatTimestamp(data.createdAt, '방금 전');
        const rawTimestamp = parseTimestampToMillis(data.createdAt, 0);
        return {
          id: doc.id,
          dong: data.dong || '오산동 (동탄역)',
          apartmentName: data.apartmentName,
          premiumScores: data.premiumScores,
          premiumContent: data.premiumContent,
          pros: data.premiumContent || '포장 싹 뺀 진짜 동네 아파트 리뷰',
          cons: '',
          rating: 5,
          author: '데이터 랩스',
          likes: data.likes || 0,
          viewCount: data.viewCount || 0,
          commentCount: data.commentCount || 0,
          imageUrl: data.thumbnailUrl || data.imageUrl,
          thumbnail: data.thumbnail,
          images: data.images || [],
          metrics: data.metrics,
          scoutingDate: data.scoutingDate || '',
          createdAt: createdAtStr,
          _rawTimestamp: rawTimestamp
        };
      });
      result.fieldReports = reports;
      serverLruCache.set('fieldReports', reports, 120 * 1000);
      if (redis && reports.length > 0) {
        redis.set('DTDLS:cache:fieldReports', reports, { ex: 3600 }).catch(e => logger.warn('DashboardData', 'Redis reports write error', {}, e));
      }
    }
  };

  const fetchTypeMap = async () => {
    const data = await fetchSheetTypeMap();
    result.typeMap = data;
  };

  const fetchApts = async () => {
    const aptData = await fetchSheetApartmentsByDong();
    if (aptData && aptData.byDong) {
      result.sheetApartments = aptData.byDong;
    }
  };

  const fetchMacroTrend = async () => {
    result.macroTrend = await readJsonFileCached<any[]>('public/data/macro-trend.json', []);
  };

  const fetchRecentTransactions = async () => {
    result.recentTransactions = await readJsonFileCached<any[]>('public/data/recent-transactions.json', []);
  };

  await Promise.allSettled([
    fetchFavCounts().catch(e => logger.warn('DashboardData', 'favCounts error', {}, e)),
    fetchMeta().catch(e => logger.warn('DashboardData', 'meta error', {}, e)),
    fetchReports().catch(e => logger.warn('DashboardData', 'reports error', {}, e)),
    // fetchTypeMap().catch(e => logger.warn('DashboardData', 'typeMap error', {}, e)), // Omitted for Lazy Fetching to save HTML serialization size
    // fetchApts().catch(e => logger.warn('DashboardData', 'apts error', {}, e)),       // Omitted for Lazy Fetching to save HTML serialization size
    fetchMacroTrend().catch(e => logger.warn('DashboardData', 'macroTrend error', {}, e)),
    fetchRecentTransactions().catch(e => logger.warn('DashboardData', 'recentTransactions error', {}, e)),
    // fetchTxSummary().catch(e => logger.warn('DashboardData', 'txSummary error', {}, e)), // Omitted to reduce initial HTML serialization size (1.15MB -> 0MB)
  ]);

  if (Object.keys(result.apartmentMeta).length === 0) {
    const parsed = await readJsonFileCached<any>('public/data/apartments-by-dong.json', null);
    if (parsed && parsed.byDong) {
      const fallbackMeta: Record<string, { dong: string; txKey: string }> = {};
      Object.entries(parsed.byDong).forEach(([dongName, apts]: [string, any]) => {
        apts.forEach((a: any) => {
          fallbackMeta[a.name] = { dong: dongName, txKey: a.txKey || a.name };
        });
      });
      result.apartmentMeta = fallbackMeta;
      logger.info('DashboardData', 'Injected fallback apartmentMeta from static json file');
    }
  }

  const parsed = InitialPageDataSchema.safeParse(result);
  if (!parsed.success) {
    logger.warn('DashboardData', 'Validation failed for initial page data, returning raw result.', {}, parsed.error);
    return result;
  }

  return parsed.data;
}
