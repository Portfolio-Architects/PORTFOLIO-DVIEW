import { adminDb } from '@/lib/firebaseAdmin';
import { createInitialKPIs } from '@/lib/services/kpi.service';
import { fetchSheetApartmentsByDong, fetchSheetTypeMap } from '@/lib/services/googleSheets';
import { redis } from '@/lib/redis';
import fs from 'fs';
import path from 'path';
import type { DongtanMacroTrendPoint } from '@/lib/types/transaction';

const PAGE_DATA_CACHE_TTL = 300; // 5 minutes in-memory cache for Firestore + Sheets merge

export async function getInitialData() {
  const now = Date.now();
  const cache = (globalThis as any)._initialPageDataCache;
  if (cache && (now - cache.timestamp) < PAGE_DATA_CACHE_TTL * 1000) {
    return cache.data;
  }

  const result: {
    favoriteCounts: Record<string, number>;
    typeMap: { aptName: string; area: string; typeM2: string; typePyeong: string }[];
    apartmentMeta: Record<string, { dong?: string; txKey?: string; isPublicRental?: boolean }>;
    sheetApartments?: Record<string, any[]>;
    fieldReports?: any[];
    kpis?: any[];
    macroTrend?: DongtanMacroTrendPoint[];
    txSummary?: Record<string, any>;
    recent7DaysVolume?: any;
  } = {
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
      const cachedCounts = await redis.hgetall('DTDLS:cache:favoriteCounts');
      if (cachedCounts && Object.keys(cachedCounts).length > 0) {
        result.favoriteCounts = cachedCounts as Record<string, number>;
        return;
      }
    }
    if (adminDb) {
      const snap = await withTimeout(adminDb.collection('favoriteCounts').get(), 5000);
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
        console.warn('[Server] Redis meta read error:', e);
      }
    }
    if (adminDb) {
      const metaDoc = await withTimeout(adminDb.doc('settings/apartmentMeta').get(), 5000);
      if (metaDoc.exists) {
        const metaData = (metaDoc.data() || {}) as Record<string, { dong?: string; txKey?: string; isPublicRental?: boolean }>;
        result.apartmentMeta = metaData;
        if (redis && Object.keys(metaData).length > 0) {
          redis.set('DTDLS:cache:apartmentMeta', metaData, { ex: 86400 }).catch(e => console.warn('[Server] Redis meta write error:', e));
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
        console.warn('[Server] Redis reports read error:', e);
      }
    }
    if (adminDb) {
      const snap = await withTimeout(adminDb.collection('scoutingReports').orderBy('createdAt', 'desc').limit(30).get(), 5000);
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
        redis.set('DTDLS:cache:fieldReports', reports, { ex: 3600 }).catch(e => console.warn('[Server] Redis reports write error:', e));
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
    try {
      const filePath = path.resolve(process.cwd(), 'public/data/macro-trend.json');
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        result.macroTrend = JSON.parse(fileContent);
      } else {
        result.macroTrend = [];
      }
    } catch (e) {
      console.warn('[Server] Failed to read macro-trend.json:', e);
      result.macroTrend = [];
    }
  };

  const fetchTxSummary = async () => {
    try {
      const filePath = path.resolve(process.cwd(), 'public/data/tx-summary.json');
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(fileContent);
        result.txSummary = parsed.summary || parsed;
        result.recent7DaysVolume = parsed.recent7DaysVolume;
      } else {
        result.txSummary = {};
        result.recent7DaysVolume = undefined;
      }
    } catch (e) {
      console.warn('[Server] Failed to read tx-summary.json:', e);
      result.txSummary = {};
      result.recent7DaysVolume = undefined;
    }
  };

  await Promise.allSettled([
    fetchFavCounts().catch(e => console.warn('[Server] favCounts error:', e)),
    fetchMeta().catch(e => console.warn('[Server] meta error:', e)),
    fetchReports().catch(e => console.warn('[Server] reports error:', e)),
    fetchTypeMap().catch(e => console.warn('[Server] typeMap error:', e)),
    fetchApts().catch(e => console.warn('[Server] apts error:', e)),
    fetchMacroTrend().catch(e => console.warn('[Server] macroTrend error:', e)),
    fetchTxSummary().catch(e => console.warn('[Server] txSummary error:', e)),
  ]);

  (globalThis as any)._initialPageDataCache = { data: result, timestamp: Date.now() };
  return result;
}
