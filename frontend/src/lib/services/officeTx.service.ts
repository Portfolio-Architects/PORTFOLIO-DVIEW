import * as cheerio from 'cheerio';
import { logger } from './logger';
import { redis, rawRedis } from '@/lib/redis';
import * as OfficeTxRepo from '@/lib/repositories/officeTx.repository';

export const OFFICE_TX_CACHE_TTL_SECONDS = 24 * 60 * 60; // 24 hours (86,400s)
export const RECENT_OFFICE_MONTHS_COUNT = 6;

function shouldUseRedisCache(): boolean {
  if (!redis) return false;
  if (process.env.NODE_ENV === 'test') {
    const isMocked = Boolean(
      (redis.get as unknown as { _isMockFunction?: boolean })?._isMockFunction ||
      (redis.set as unknown as { _isMockFunction?: boolean })?._isMockFunction
    );
    return isMocked || rawRedis !== null;
  }
  return true;
}

/**
 * Generates an array of recent YYYYMM strings (default: last 6 months from baseDate, descending).
 * Uses day=1 to prevent month-end overflow bugs (e.g., March 31 -> Feb 1).
 */
export function getRecentMonths(
  count: number = RECENT_OFFICE_MONTHS_COUNT,
  baseDate: Date = new Date()
): string[] {
  if (!Number.isFinite(count)) return [];
  const safeCount = Math.floor(count);
  if (safeCount <= 0) return [];
  const validBase =
    baseDate instanceof Date && !Number.isNaN(baseDate.getTime())
      ? baseDate
      : new Date();
  const months: string[] = [];
  for (let i = 0; i < safeCount; i++) {
    const d = new Date(validBase.getFullYear(), validBase.getMonth() - i, 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    months.push(`${yyyy}${mm}`);
  }
  return months;
}

export interface OfficeTransaction {
  readonly date: string;
  readonly type: '매매' | '임대';
  readonly sizeSqM: number;
  readonly floor: number;
  readonly price: string;
  readonly buildingName: string;
  readonly priceRaw?: number;
  readonly jibun?: string;
}

export function safeParseInt(val: string | null | undefined, fallback: number = 0): number {
  if (!val) return fallback;
  const cleaned = val.replace(/,/g, '').trim();
  if (!cleaned) return fallback;
  const parsed = parseInt(cleaned, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export function safeParseFloat(val: string | null | undefined, fallback: number = 0): number {
  if (!val) return fallback;
  const cleaned = val.replace(/,/g, '').trim();
  if (!cleaned) return fallback;
  const parsed = parseFloat(cleaned);
  return Number.isNaN(parsed) ? fallback : parsed;
}

/**
 * Format string price to client-friendly wording
 * e.g., "41,000" (10000 KRW unit) -> "4억 1,000만원"
 */
export function formatPrice(type: '매매' | '임대', priceRaw: string, depositRaw?: string): string {
  if (type === '임대') {
    const depVal = safeParseInt(depositRaw, 0);
    const rentVal = safeParseInt(priceRaw, 0);
    const depStr = depVal >= 10000 
      ? `${Math.floor(depVal / 10000)}억 ${depVal % 10000 > 0 ? (depVal % 10000).toLocaleString() + '만' : ''}`.trim() 
      : `${depVal.toLocaleString()}만`;
    return `보증금 ${depStr} / 월세 ${rentVal.toLocaleString()}만`;
  }

  const priceVal = safeParseInt(priceRaw, 0);
  if (priceVal <= 0) {
    return '0원';
  }
  if (priceVal >= 10000) {
    const bill = Math.floor(priceVal / 10000);
    const remain = priceVal % 10000;
    return `${bill}억 ${remain > 0 ? remain.toLocaleString() + '만' : ''}원`;
  }
  return `${priceVal.toLocaleString()}만원`;
}

/**
 * Parses Public Office XML data using Cheerio
 */
export function parseOfficeXml(xml: string): OfficeTransaction[] {
  if (!xml || typeof xml !== 'string') return [];
  const $ = cheerio.load(xml, { xmlMode: true });
  const list: OfficeTransaction[] = [];

  $('item').each((_, elem) => {
    const $item = $(elem);
    const buildingName = $item.find('건물명').text().trim() || '미상 건물';
    const type = ($item.find('구분').text().trim() || '매매') as '매매' | '임대';
    const priceRaw = $item.find('거래금액').text().trim();
    const depositRaw = $item.find('보증금액').text().trim();
    const priceVal = safeParseInt(priceRaw, 0);
    const year = $item.find('년').text().trim() || '1970';
    const monthRaw = $item.find('월').text().trim() || '01';
    const dayRaw = $item.find('일').text().trim() || '01';
    const sizeSqM = safeParseFloat($item.find('전용면적').text().trim(), 0);
    const floor = safeParseInt($item.find('층').text().trim(), 1);
    const jibun = $item.find('지번').text().trim() || $item.find('jibun').text().trim() || '';

    const month = monthRaw.length === 1 ? `0${monthRaw}` : monthRaw;
    const day = dayRaw.length === 1 ? `0${dayRaw}` : dayRaw;
    const date = `${year}-${month}-${day}`;

    const price = formatPrice(type, priceRaw, depositRaw);

    list.push({
      date,
      type,
      sizeSqM,
      floor,
      price,
      buildingName,
      priceRaw: priceVal,
      jibun
    });
  });

  return list;
}

/**
 * Fetches office transaction data from public portal API.
 * Supports multi-month fetching (recent 6 months) when dealYmd is 'all' or omitted,
 * backed by Upstash Redis 24-hour caching.
 */
export async function getOfficeTransactions(lawdCd: string = '41591', dealYmd: string = 'all'): Promise<OfficeTransaction[]> {
  try {
    const targetLawdCd = lawdCd === '41590' ? '41591' : lawdCd;
    const useCache = shouldUseRedisCache();

    if (dealYmd !== 'all') {
      const singleCacheKey = `DTDLS:cache:officeTx:${targetLawdCd}:${dealYmd}`;
      if (useCache) {
        try {
          const cached = await redis.get<OfficeTransaction[]>(singleCacheKey);
          if (Array.isArray(cached)) {
            return cached;
          }
        } catch (cacheErr) {
          logger.warn('OfficeTxService.getOfficeTransactions', 'Redis cache read failed, falling back to public portal API', {
            cacheKey: singleCacheKey,
            error: cacheErr instanceof Error ? cacheErr.message : String(cacheErr),
          });
        }
      }

      const xml = await OfficeTxRepo.fetchOfficeXmlFromPublicPortal(targetLawdCd, dealYmd);
      const parsed = parseOfficeXml(xml);

      if (useCache && parsed.length > 0) {
        try {
          await redis.set(singleCacheKey, parsed, { ex: OFFICE_TX_CACHE_TTL_SECONDS });
        } catch (cacheErr) {
          logger.warn('OfficeTxService.getOfficeTransactions', 'Redis cache write failed', {
            cacheKey: singleCacheKey,
            error: cacheErr instanceof Error ? cacheErr.message : String(cacheErr),
          });
        }
      }
      return parsed;
    }

    const recentMonths = getRecentMonths(RECENT_OFFICE_MONTHS_COUNT);
    const allCacheKey = `DTDLS:cache:officeTx:${targetLawdCd}:all:${recentMonths[0] || 'latest'}`;

    if (useCache) {
      try {
        const cached = await redis.get<OfficeTransaction[]>(allCacheKey);
        if (Array.isArray(cached)) {
          return cached;
        }
      } catch (cacheErr) {
        logger.warn('OfficeTxService.getOfficeTransactions', 'Redis cache read failed, falling back to public portal API', {
          cacheKey: allCacheKey,
          error: cacheErr instanceof Error ? cacheErr.message : String(cacheErr),
        });
      }
    }

    const results = await Promise.all(
      recentMonths.map(async (ym) => {
        try {
          const xml = await OfficeTxRepo.fetchOfficeXmlFromPublicPortal(targetLawdCd, ym);
          return parseOfficeXml(xml);
        } catch {
          return [];
        }
      })
    );

    const flattened = results.flat();
    const sorted = flattened.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (useCache && sorted.length > 0) {
      try {
        await redis.set(allCacheKey, sorted, { ex: OFFICE_TX_CACHE_TTL_SECONDS });
      } catch (cacheErr) {
        logger.warn('OfficeTxService.getOfficeTransactions', 'Redis cache write failed', {
          cacheKey: allCacheKey,
          error: cacheErr instanceof Error ? cacheErr.message : String(cacheErr),
        });
      }
    }

    return sorted;
  } catch (err) {
    logger.error('OfficeTxService.getOfficeTransactions', 'Error fetching or parsing office transactions.', { error: err instanceof Error ? err.message : String(err) });
    return [];
  }
}


