import { adminDb } from '@/lib/firebaseAdmin';
import { createInitialKPIs } from '@/lib/services/kpi.service';
import { fetchSheetApartmentsByDong, fetchSheetTypeMap } from '@/lib/services/googleSheets';
import { redis } from '@/lib/redis';
import { logger } from '@/lib/services/logger';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';

interface StaticDataCacheEntry<T> {
  data: T;
  mtimeMs: number;
}

const getGlobalStaticDataCache = (): Record<string, StaticDataCacheEntry<any>> => {
  if (!(globalThis as any)._globalStaticDataCache) {
    (globalThis as any)._globalStaticDataCache = {};
  }
  return (globalThis as any)._globalStaticDataCache;
};

async function readJsonFileCached<T>(relativePath: string, fallback: T): Promise<T> {
  const filePath = path.resolve(process.cwd(), relativePath);
  try {
    const stats = await fs.promises.stat(filePath);
    const mtimeMs = stats.mtimeMs;
    const cache = getGlobalStaticDataCache();
    
    if (cache[relativePath] && cache[relativePath].mtimeMs === mtimeMs) {
      return cache[relativePath].data;
    }
    
    const fileContent = await fs.promises.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(fileContent);
    cache[relativePath] = { data: parsed, mtimeMs };
    return parsed;
  } catch (e) {
    logger.warn('DashboardData', `Failed to read or parse cached JSON file: ${relativePath}`, {}, e);
    return fallback;
  }
}

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
  typeMap: z.array(TypeMapItemSchema),
  apartmentMeta: ApartmentMetaSchema,
  sheetApartments: z.record(z.string(), z.array(z.any())).optional(),
  fieldReports: z.array(FieldReportSchema),
  kpis: z.array(z.any()).optional(),
  macroTrend: z.array(DongtanMacroTrendPointSchema).optional(),
  txSummary: z.record(z.string(), z.any()).optional(),
  recent7DaysVolume: z.any().optional(),
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
      fetchFreshData()
        .then((freshData) => {
          (globalThis as any)._initialPageDataCache = { data: freshData, timestamp: Date.now() };
          isRefreshingPageData = false;
          logger.info('DashboardData', 'Background revalidation completed successfully.');
        })
        .catch((err) => {
          logger.error('DashboardData', 'Background revalidation failed', {}, err);
          isRefreshingPageData = false;
        });
    }
    return cache.data;
  }

  logger.info('DashboardData', 'Cache miss, performing initial synchronous fetch.');
  const freshData = await fetchFreshData();
  (globalThis as any)._initialPageDataCache = { data: freshData, timestamp: Date.now() };
  return freshData;
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
  };

  const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> =>
    Promise.race([
      promise,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Firebase timeout')), ms))
    ]);

  const fetchFavCounts = async () => {
    if (redis) {
      try {
        const cachedCounts = await redis.hgetall('DTDLS:cache:favoriteCounts');
        if (cachedCounts && Object.keys(cachedCounts).length > 0) {
          result.favoriteCounts = cachedCounts as Record<string, number>;
          return;
        }
      } catch (e) {
        logger.warn('DashboardData', 'Redis favCounts read error, falling back to Firebase', {}, e);
      }
    }
    if (adminDb) {
      const snap = await withTimeout(adminDb.collection('favoriteCounts').get(), 1500);
      snap.docs.forEach((doc) => {
        const data = doc.data();
        if (data.count > 0) result.favoriteCounts[data.aptName || doc.id] = data.count;
      });
    }
  };

  const fetchMeta = async () => {
    if (redis) {
      try {
        const cachedMeta = await redis.get('DTDLS:cache:apartmentMeta');
        if (cachedMeta && typeof cachedMeta === 'object') {
          result.apartmentMeta = cachedMeta as Record<string, { dong?: string; txKey?: string; isPublicRental?: boolean }>;
          return;
        }
      } catch (e) {
        logger.warn('DashboardData', 'Redis meta read error', {}, e);
      }
    }
    if (adminDb) {
      const metaDoc = await withTimeout(adminDb.doc('settings/apartmentMeta').get(), 1500);
      if (metaDoc.exists) {
        const metaData = (metaDoc.data() || {}) as Record<string, { dong?: string; txKey?: string; isPublicRental?: boolean }>;
        result.apartmentMeta = metaData;
        if (redis && Object.keys(metaData).length > 0) {
          redis.set('DTDLS:cache:apartmentMeta', metaData, { ex: 86400 }).catch(e => logger.warn('DashboardData', 'Redis meta write error', {}, e));
        }
      }
    }
  };

  const fetchReports = async () => {
    if (redis) {
      try {
        const cachedReports = await redis.get('DTDLS:cache:fieldReports');
        if (cachedReports && Array.isArray(cachedReports)) {
          result.fieldReports = cachedReports;
          return;
        }
      } catch (e) {
        logger.warn('DashboardData', 'Redis reports read error', {}, e);
      }
    }
    if (adminDb) {
      const snap = await withTimeout(adminDb.collection('scoutingReports').orderBy('createdAt', 'desc').limit(30).get(), 1500);
      const reports = snap.docs.map(doc => {
        const data = doc.data();
        let createdAtStr = '방금 전';
        let rawTimestamp = 0;
        if (data.createdAt) {
          if (typeof data.createdAt.toDate === 'function') {
            const d = data.createdAt.toDate();
            createdAtStr = d.toLocaleDateString('ko-KR');
            rawTimestamp = d.getTime();
          } else if (data.createdAt.seconds) {
            const d = new Date(data.createdAt.seconds * 1000);
            createdAtStr = d.toLocaleDateString('ko-KR');
            rawTimestamp = d.getTime();
          }
        }
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

  const fetchTxSummary = async () => {
    const parsed = await readJsonFileCached<any>('public/data/tx-summary.json', null);
    if (parsed) {
      result.txSummary = parsed.summary || parsed;
      result.recent7DaysVolume = parsed.recent7DaysVolume;
    } else {
      result.txSummary = {};
      result.recent7DaysVolume = undefined;
    }
  };

  await Promise.allSettled([
    fetchFavCounts().catch(e => logger.warn('DashboardData', 'favCounts error', {}, e)),
    fetchMeta().catch(e => logger.warn('DashboardData', 'meta error', {}, e)),
    fetchReports().catch(e => logger.warn('DashboardData', 'reports error', {}, e)),
    fetchTypeMap().catch(e => logger.warn('DashboardData', 'typeMap error', {}, e)),
    fetchApts().catch(e => logger.warn('DashboardData', 'apts error', {}, e)),
    fetchMacroTrend().catch(e => logger.warn('DashboardData', 'macroTrend error', {}, e)),
    fetchTxSummary().catch(e => logger.warn('DashboardData', 'txSummary error', {}, e)),
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
