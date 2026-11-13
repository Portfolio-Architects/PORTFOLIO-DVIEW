import { adminDb } from '@/lib/firebaseAdmin';
import { redis } from '@/lib/redis';
import { logger } from '@/lib/services/logger';
import { readJsonFileCached } from '@/lib/utils/server/fileReader';
import { serverLruCache } from '@/lib/utils/server/lruCache';
import {
  formatPriceEok,
  mergeTransactions,
  computeRecent7DaysVolume,
} from '@/lib/services/staticDataService';
import { getTodayYmdKST, type MarketStatsInput } from '@/lib/todayUpdateEvaluator';
import type { RecentTransaction, AptTxSummary } from '@/types/transaction';
import type { InitialPageDataWithScores } from '@/lib/services/dashboardData';
import type {
  LiveDeltaRawRecord,
  LiveTransactionDeltaResponse,
} from '@/hooks/useLiveTransactionDelta';

export type { LiveDeltaRawRecord, LiveTransactionDeltaResponse };

const LRU_DELTA_TTL_MS = 180 * 1000; // 3 minutes L1 cache
const REDIS_DELTA_TTL_SEC = 300; // 5 minutes L2 cache
const FIRESTORE_QUERY_TIMEOUT_MS = 2500;
const REDIS_LATEST_DELTA_KEYS_SET = 'dview:live-tx-delta:active-keys';

const trackedLruKeys = new Set<string>();
const trackedRedisKeys = new Set<string>();

declare global {
  var _initialPageDataCache: { data: InitialPageDataWithScores; timestamp: number } | undefined;
  var _activeFreshDataPromise: Promise<InitialPageDataWithScores> | null | undefined;
}

export function isLiveTxDeltaEnabled(): boolean {
  if (process.env.NODE_ENV === 'test') {
    return process.env.ENABLE_LIVE_TX_DELTA_IN_TEST === '1';
  }
  return true;
}

function normalizeAptKey(name: string): string {
  if (!name) return '';
  return name
    .normalize('NFC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\[.*?\]\s*/g, '')
    .replace(/\s+/g, '')
    .replace(/[()（）]/g, '')
    .trim();
}

function cleanYmd(val: unknown): string {
  if (val === null || val === undefined) return '';
  const digits = String(val).replace(/[^0-9]/g, '').slice(0, 8);
  return digits.length === 8 ? digits : '';
}

function isCancelledDoc(doc: Record<string, unknown>): boolean {
  if (!doc) return false;
  if (doc.cdealType === 'O' || doc.cdealType === '해제') return true;
  const isValidCancelStr = (v: unknown) => {
    if (v === null || v === undefined) return false;
    const s = String(v).trim().toLowerCase();
    return s !== '' && s !== '-' && s !== 'null' && s !== 'undefined' && s !== 'nan';
  };
  return isValidCancelStr(doc.cancelDate) || isValidCancelStr(doc.cdealDay);
}

function normalizeDocToRawRecord(doc: Record<string, unknown>): LiveDeltaRawRecord | null {
  const aptName = typeof doc.aptName === 'string' ? doc.aptName.trim() : '';
  if (!aptName) return null;

  const contractYmRaw = String(doc.contractYm || '').replace(/[^0-9]/g, '').slice(0, 6);
  const contractDayRaw = String(doc.contractDay || '').replace(/[^0-9]/g, '').padStart(2, '0').slice(-2);
  const contractDateClean = cleanYmd(doc.contractDate) || (contractYmRaw.length === 6 && contractDayRaw.length === 2 ? `${contractYmRaw}${contractDayRaw}` : '');
  const contractYm = contractYmRaw.length === 6 ? contractYmRaw : contractDateClean.slice(0, 6);
  const contractDay = contractDayRaw.length === 2 ? contractDayRaw : contractDateClean.slice(6, 8);
  if (contractYm.length !== 6 || contractDay.length !== 2) return null;

  const regDate = cleanYmd(doc.registeredDate) || cleanYmd(doc.registrationDate);
  const regLabel = regDate
    ? `${regDate.slice(4, 6)}.${regDate.slice(6, 8)}`
    : typeof doc.registeredDateLabel === 'string'
      ? doc.registeredDateLabel
      : undefined;

  const area = Number(doc.area) || 0;
  const areaPyeong = Number(doc.areaPyeong) || Math.round(area * 0.3025 * 1.33 * 10) / 10;
  const price = Number(doc.price) || 0;
  const deposit = Number(doc.deposit) || 0;
  const monthlyRent = Number(doc.monthlyRent) || 0;
  const floor = Number(doc.floor) || 0;
  const dealType = typeof doc.dealType === 'string' && doc.dealType.trim() ? doc.dealType.trim() : '매매';

  return {
    ...(typeof doc.dong === 'string' ? { dong: doc.dong } : {}),
    ...(typeof doc.sigungu === 'string' ? { sigungu: doc.sigungu } : {}),
    aptName,
    dealType,
    contractYm,
    contractDay,
    contractDate: contractDateClean || `${contractYm}${contractDay}`,
    ...(regDate ? { registeredDate: regDate } : {}),
    ...(regLabel ? { registeredDateLabel: regLabel } : {}),
    ...(typeof doc.registrationDate === 'string' ? { registrationDate: doc.registrationDate } : {}),
    price,
    deposit,
    monthlyRent,
    area,
    areaPyeong,
    floor,
    ...(doc.buildYear !== undefined ? { buildYear: Number(doc.buildYear) || 0 } : {}),
    ...(typeof doc.buyer === 'string' ? { buyer: doc.buyer } : {}),
    ...(typeof doc.seller === 'string' ? { seller: doc.seller } : {}),
    ...(typeof doc.reqGb === 'string' ? { reqGb: doc.reqGb } : {}),
    ...(typeof doc.rnuYn === 'string' ? { rnuYn: doc.rnuYn } : {}),
  };
}

async function queryFirestorePostBaseline(baselineRegisteredDate: string): Promise<LiveDeltaRawRecord[]> {
  if (!adminDb || typeof adminDb.collection !== 'function' || baselineRegisteredDate.length !== 8) {
    return [];
  }

  let timerId: ReturnType<typeof setTimeout> | undefined;
  try {
    const queryPromise = adminDb
      .collection('transactions')
      .where('registeredDate', '>', baselineRegisteredDate)
      .get();

    const timeoutPromise = new Promise<null>((resolve) => {
      timerId = setTimeout(() => resolve(null), FIRESTORE_QUERY_TIMEOUT_MS);
    });

    const snapshot = await Promise.race([
      queryPromise.finally(() => {
        if (timerId) clearTimeout(timerId);
      }),
      timeoutPromise,
    ]);

    if (!snapshot || !Array.isArray(snapshot.docs)) {
      return [];
    }

    const records: LiveDeltaRawRecord[] = [];
    for (const d of snapshot.docs) {
      const data = typeof d.data === 'function' ? d.data() : (d as unknown as Record<string, unknown>);
      if (!data || typeof data !== 'object') continue;
      if (isCancelledDoc(data as Record<string, unknown>)) continue;
      const normalized = normalizeDocToRawRecord(data as Record<string, unknown>);
      if (normalized) {
        records.push(normalized);
      }
    }
    return records;
  } catch (err) {
    logger.warn('LiveTransactionOverlay.queryFirestore', 'Post-baseline Firestore query failed', { baselineRegisteredDate }, err as Error);
    return [];
  }
}

async function loadCachedDeltaDocs(baselineRegisteredDate: string): Promise<LiveDeltaRawRecord[]> {
  if (baselineRegisteredDate.length !== 8) return [];

  const lruKey = `liveTxDelta:${baselineRegisteredDate}`;
  const redisKey = `dview:live-tx-delta:${baselineRegisteredDate}`;
  trackedLruKeys.add(lruKey);
  trackedRedisKeys.add(redisKey);

  const l1 = serverLruCache.get<LiveDeltaRawRecord[]>(lruKey);
  if (Array.isArray(l1)) {
    return l1;
  }

  if (redis && typeof redis.get === 'function') {
    try {
      const l2 = await redis.get<LiveDeltaRawRecord[]>(redisKey);
      if (Array.isArray(l2)) {
        serverLruCache.set(lruKey, l2, LRU_DELTA_TTL_MS);
        return l2;
      }
    } catch (err) {
      logger.warn('LiveTransactionOverlay.redisGet', 'Redis get failed cleanly', { redisKey }, err as Error);
    }
  }

  const freshDocs = await queryFirestorePostBaseline(baselineRegisteredDate);
  serverLruCache.set(lruKey, freshDocs, LRU_DELTA_TTL_MS);

  if (redis && typeof redis.set === 'function') {
    try {
      await redis.set(redisKey, freshDocs, { ex: REDIS_DELTA_TTL_SEC });
      const activeList = (await redis.get<string[]>(REDIS_LATEST_DELTA_KEYS_SET)) || [];
      if (!activeList.includes(redisKey)) {
        await redis.set(REDIS_LATEST_DELTA_KEYS_SET, [...activeList.slice(-9), redisKey], { ex: 86400 });
      }
    } catch (err) {
      logger.warn('LiveTransactionOverlay.redisSet', 'Redis set failed cleanly', { redisKey }, err as Error);
    }
  }

  return freshDocs;
}

/**
 * Computes post-build live transaction delta from Firestore on top of static JSON baselines.
 * Returns zero delta when static files are already up to date.
 */
export async function getLiveTransactionDelta(): Promise<LiveTransactionDeltaResponse> {
  const [baseMarketStats, baseRecentTransactions, sumRaw, byDongRaw] = await Promise.all([
    readJsonFileCached<MarketStatsInput & { saleTxCount?: number }>('public/data/market-stats.json', {
      saleTxCount: 0,
      latestContractDate: null,
      latestRegisteredDate: null,
    }),
    readJsonFileCached<RecentTransaction[]>('public/data/recent-transactions.json', []),
    readJsonFileCached<{ summary?: Record<string, AptTxSummary> } | Record<string, AptTxSummary>>(
      'public/data/tx-summary.json',
      {}
    ),
    readJsonFileCached<{ byDong?: Record<string, Array<{ name: string; txKey?: string }>> } | null>(
      'public/data/apartments-by-dong.json',
      null
    ),
  ]);

  const baseSummary: Record<string, AptTxSummary> =
    sumRaw && 'summary' in sumRaw && sumRaw.summary
      ? (sumRaw.summary as Record<string, AptTxSummary>)
      : ((sumRaw || {}) as Record<string, AptTxSummary>);

  let baselineRegisteredDate = cleanYmd(baseMarketStats?.latestRegisteredDate);
  if (!baselineRegisteredDate && Array.isArray(baseRecentTransactions)) {
    for (const tx of baseRecentTransactions) {
      const reg = cleanYmd(tx?.registeredDate);
      if (reg > baselineRegisteredDate) baselineRegisteredDate = reg;
    }
  }

  const byDong = byDongRaw?.byDong;
  const rawAptCountFromMarketStats = Number(baseMarketStats?.apartmentCount || 0);
  const aggregatedAptCount =
    byDong && typeof byDong === 'object'
      ? Object.values(byDong).reduce((n, list) => n + (Array.isArray(list) ? list.length : 0), 0)
      : 0;
  const derivedApartmentCount =
    rawAptCountFromMarketStats > 0
      ? rawAptCountFromMarketStats
      : aggregatedAptCount > 0
        ? aggregatedAptCount
        : undefined;

  const rawSaleTxCount = Number(baseMarketStats?.saleTxCount || 0);
  const baseSaleTxCount =
    rawSaleTxCount > 0
      ? rawSaleTxCount
      : Object.values(baseSummary).reduce((n, s) => n + (Number(s?.txCount) || 0), 0);

  const rawDocs = await loadCachedDeltaDocs(baselineRegisteredDate);

  // Build apartment name -> canonical txKey lookup
  const nameToTxKey = new Map<string, string>();
  if (byDong && typeof byDong === 'object') {
    for (const apts of Object.values(byDong)) {
      if (!Array.isArray(apts)) continue;
      for (const a of apts) {
        if (a?.name) {
          const normName = normalizeAptKey(a.name);
          const normTxKey = normalizeAptKey(a.txKey || a.name);
          if (normName && normTxKey) {
            nameToTxKey.set(normName, normTxKey);
          }
        }
      }
    }
  }

  const targetAptKeys = new Set(Object.keys(baseSummary));
  const resolveTxKey = (aptName: string): string | null => {
    const direct = normalizeAptKey(aptName);
    if (!direct) return null;
    if (baseSummary[direct]) return direct;
    const mapped = nameToTxKey.get(direct);
    if (mapped && (targetAptKeys.size === 0 || targetAptKeys.has(mapped))) {
      return mapped;
    }
    if (targetAptKeys.size === 0 || targetAptKeys.has(direct)) {
      return direct;
    }
    return null;
  };

  // Deduplicate existing static recent-transactions
  const seenRecentKeys = new Set<string>();
  if (Array.isArray(baseRecentTransactions)) {
    for (const r of baseRecentTransactions) {
      const k = normalizeAptKey(r.txKey || r.aptName);
      const areaFixed = Number(r.area || 0).toFixed(2);
      const priceFixed = Number(r.priceVal || 0).toFixed(4);
      seenRecentKeys.add(`${k}|${r.contractDate}|${areaFixed}|${String(r.floor ?? 0)}|${priceFixed}`);
    }
  }

  const enrichedRawDocs: LiveDeltaRawRecord[] = [];
  const saleCandidates: Array<{ raw: LiveDeltaRawRecord; txKey: string; contractDate: string; regDate: string }> = [];

  for (const doc of rawDocs) {
    const txKey = resolveTxKey(doc.aptName);
    if (!txKey) continue;

    enrichedRawDocs.push({ ...doc, txKey });

    const isSale = doc.dealType !== '전세' && doc.dealType !== '월세';
    if (!isSale || doc.price <= 0) continue;

    const contractDate = doc.contractDate || `${doc.contractYm}${doc.contractDay}`;
    const regDate = cleanYmd(doc.registeredDate) || cleanYmd(doc.registrationDate);
    saleCandidates.push({ raw: doc, txKey, contractDate, regDate });
  }

  // Evaluate sequential highs in chronological order
  saleCandidates.sort(
    (a, b) => a.regDate.localeCompare(b.regDate) || a.contractDate.localeCompare(b.contractDate)
  );

  const runningMaxByArea = new Map<string, number>();
  const deltaTransactions: RecentTransaction[] = [];

  for (const { raw, txKey, contractDate, regDate } of saleCandidates) {
    const priceVal = Math.round((raw.price / 10000) * 10000) / 10000;
    const areaFixed = Number(raw.area || 0).toFixed(2);
    const dedupKey = `${txKey}|${contractDate}|${areaFixed}|${String(raw.floor ?? 0)}|${priceVal.toFixed(4)}`;
    if (seenRecentKeys.has(dedupKey)) continue;
    seenRecentKeys.add(dedupKey);

    const summaryEntry = baseSummary[txKey];
    const maxAreaLookupKey = `${txKey}::${areaFixed}`;
    const baselineMaxForArea = runningMaxByArea.has(maxAreaLookupKey)
      ? runningMaxByArea.get(maxAreaLookupKey)!
      : (summaryEntry?.maxPriceByArea?.[areaFixed] || 0);
    const isNewHigh = baselineMaxForArea > 0 && raw.price > baselineMaxForArea;
    if (raw.price > baselineMaxForArea) {
      runningMaxByArea.set(maxAreaLookupKey, raw.price);
    }

    // Find most recent prior sale of similar area for price delta
    let prevPriceVal: number | undefined;
    if (Array.isArray(baseRecentTransactions)) {
      const priorMatch = baseRecentTransactions.find(
        (r) =>
          normalizeAptKey(r.txKey || r.aptName) === txKey &&
          Math.abs(Number(r.area || 0) - raw.area) < 1.0 &&
          Number(r.priceVal || 0) > 0
      );
      if (priorMatch) {
        prevPriceVal = priorMatch.priceVal;
      }
    }

    const delta =
      prevPriceVal && prevPriceVal > 0
        ? Math.round((priceVal - prevPriceVal) * 100) / 100
        : 0;
    const deltaPercent =
      prevPriceVal && prevPriceVal > 0
        ? Math.round(((priceVal - prevPriceVal) / prevPriceVal) * 1000) / 10
        : 0;

    deltaTransactions.push({
      aptName: raw.aptName,
      txKey,
      date: `${contractDate.slice(4, 6)}.${contractDate.slice(6, 8)}`,
      contractDate,
      ...(regDate ? { registeredDate: regDate, registeredDateLabel: `${regDate.slice(4, 6)}.${regDate.slice(6, 8)}` } : {}),
      priceVal,
      priceEok: formatPriceEok(raw.price),
      area: raw.area,
      areaPyeong: raw.areaPyeong || Math.round(raw.area * 0.3025 * 1.33 * 10) / 10,
      floor: raw.floor,
      dealType: raw.dealType || '매매',
      isNewHigh,
      ...(prevPriceVal !== undefined ? { prevPriceVal } : {}),
      delta,
      deltaPercent,
    });
  }

  deltaTransactions.sort(
    (a, b) =>
      String(b.registeredDate || '').localeCompare(String(a.registeredDate || '')) ||
      b.contractDate.localeCompare(a.contractDate)
  );

  const todayYmd = getTodayYmdKST();
  const maxDeltaSaleReg = deltaTransactions.reduce(
    (max, t) => ((t.registeredDate || '') > max ? String(t.registeredDate) : max),
    ''
  );
  const maxDeltaAnyReg = enrichedRawDocs.reduce(
    (max, d) => ((d.registeredDate || '') > max ? String(d.registeredDate) : max),
    ''
  );
  const maxDeltaReg = maxDeltaSaleReg || maxDeltaAnyReg;
  const latestRegisteredDate =
    maxDeltaReg && maxDeltaReg > baselineRegisteredDate
      ? maxDeltaReg
      : (baseMarketStats?.latestRegisteredDate ?? (baselineRegisteredDate || null));

  const maxDeltaContract = deltaTransactions.reduce(
    (max, t) => (t.contractDate > max ? t.contractDate : max),
    ''
  );
  let baseContract = cleanYmd(baseMarketStats?.latestContractDate);
  if (!baseContract && Array.isArray(baseRecentTransactions)) {
    for (const tx of baseRecentTransactions) {
      const cDate = cleanYmd(tx?.contractDate);
      if (cDate > baseContract) baseContract = cDate;
    }
  }
  const latestContractDate =
    maxDeltaContract && maxDeltaContract > baseContract
      ? maxDeltaContract
      : (baseContract || null);

  const combinedTodaySales = [
    ...deltaTransactions.filter((t) => cleanYmd(t.registeredDate) === todayYmd),
    ...(Array.isArray(baseRecentTransactions)
      ? baseRecentTransactions.filter((t) => cleanYmd(t.registeredDate) === todayYmd)
      : []),
  ];
  const uniqueTodayKeys = new Set<string>();
  let todayRegisteredCount = 0;
  let todayNewHighCount = 0;

  for (const t of combinedTodaySales) {
    const k = `${normalizeAptKey(t.txKey || t.aptName)}|${t.contractDate}|${Number(t.area).toFixed(2)}|${String(t.floor)}|${Number(t.priceVal).toFixed(4)}`;
    if (uniqueTodayKeys.has(k)) continue;
    uniqueTodayKeys.add(k);
    todayRegisteredCount += 1;
    if (t.isNewHigh) todayNewHighCount += 1;
  }

  if (todayRegisteredCount === 0 && latestRegisteredDate === todayYmd) {
    todayRegisteredCount =
      typeof baseMarketStats?.todayRegisteredCount === 'number'
        ? baseMarketStats.todayRegisteredCount
        : enrichedRawDocs.filter((d) => cleanYmd(d.registeredDate) === todayYmd).length || 1;
    todayNewHighCount =
      typeof baseMarketStats?.todayNewHighCount === 'number'
        ? baseMarketStats.todayNewHighCount
        : 0;
  }

  const hasDelta = deltaTransactions.length > 0 || enrichedRawDocs.length > 0;

  return {
    hasDelta,
    baselineRegisteredDate,
    marketStats: {
      apartmentCount: derivedApartmentCount,
      saleTxCount: baseSaleTxCount + deltaTransactions.length,
      latestContractDate,
      latestRegisteredDate,
      todayRegisteredCount,
      todayNewHighCount,
      lastSyncTime: baseMarketStats?.lastSyncTime || '07:00 KST',
    },
    deltaTransactions,
    rawDeltaDocs: enrichedRawDocs,
  };
}

/**
 * Merges post-build Firestore delta into SSR InitialPageDataWithScores in-place.
 */
export async function applyLiveOverlayToDashboardData(result: InitialPageDataWithScores): Promise<void> {
  if (!isLiveTxDeltaEnabled()) return;

  try {
    const delta = await getLiveTransactionDelta();
    if (!delta.hasDelta) return;

    if (delta.deltaTransactions.length > 0) {
      const existingRecent = Array.isArray(result.recentTransactions) ? result.recentTransactions : [];
      const existingKeys = new Set(
        existingRecent.map(
          (r) =>
            `${normalizeAptKey(r.txKey || r.aptName)}|${r.contractDate}|${Number(r.area || 0).toFixed(2)}|${String(r.floor ?? 0)}|${Number(r.priceVal || 0).toFixed(4)}`
        )
      );

      const additions = delta.deltaTransactions.filter((t) => {
        const k = `${normalizeAptKey(t.txKey || t.aptName)}|${t.contractDate}|${Number(t.area || 0).toFixed(2)}|${String(t.floor ?? 0)}|${Number(t.priceVal || 0).toFixed(4)}`;
        if (existingKeys.has(k)) return false;
        existingKeys.add(k);
        return true;
      });

      if (additions.length > 0) {
        const mergedRecent = [...additions, ...existingRecent];
        mergedRecent.sort((a, b) => String(b.contractDate || '').localeCompare(String(a.contractDate || '')));
        result.recentTransactions = mergedRecent as InitialPageDataWithScores['recentTransactions'];
      }
    }

    if (delta.rawDeltaDocs.length > 0 && result.txSummary) {
      const mergedSummary = mergeTransactions(
        result.txSummary as Record<string, AptTxSummary>,
        delta.rawDeltaDocs
      );
      result.txSummary = mergedSummary as InitialPageDataWithScores['txSummary'];
      result.recent7DaysVolume = computeRecent7DaysVolume(
        result.recent7DaysVolume as Parameters<typeof computeRecent7DaysVolume>[0],
        mergedSummary,
        delta.rawDeltaDocs
      ) as InitialPageDataWithScores['recent7DaysVolume'];
    }
  } catch (err) {
    logger.warn('LiveTransactionOverlay.applyLiveOverlay', 'Failed to apply live overlay cleanly', {}, err as Error);
  }
}

/**
 * Invalidates in-memory SSR, LRU, and Redis delta caches immediately after cron Firestore writes.
 */
export async function invalidateLiveTransactionOverlayCache(): Promise<void> {
  globalThis._initialPageDataCache = undefined;
  globalThis._activeFreshDataPromise = null;

  for (const key of trackedLruKeys) {
    serverLruCache.delete(key);
  }
  trackedLruKeys.clear();

  const keysToDelete = new Set<string>(trackedRedisKeys);
  const now = new Date();
  keysToDelete.add(`dview:live-tx-delta:${getTodayYmdKST(now)}`);
  keysToDelete.add(`dview:live-tx-delta:${getTodayYmdKST(new Date(now.getTime() - 24 * 3600000))}`);
  trackedRedisKeys.clear();

  if (redis && typeof redis.get === 'function' && typeof redis.del === 'function') {
    try {
      const persistedKeys = await redis.get<string[]>(REDIS_LATEST_DELTA_KEYS_SET);
      if (Array.isArray(persistedKeys)) {
        for (const k of persistedKeys) {
          if (typeof k === 'string' && k) keysToDelete.add(k);
        }
      }
      if (keysToDelete.size > 0) {
        await redis.del(...Array.from(keysToDelete));
      }
      await redis.del(REDIS_LATEST_DELTA_KEYS_SET);
    } catch (err) {
      logger.warn('LiveTransactionOverlay.invalidate', 'Redis invalidation failed cleanly', {}, err as Error);
    }
  }
}
