/**
 * @module news.repository
 * @description Data Access Layer for retrieving local notices from Firestore and caching in Redis.
 * Architecture Layer: Repository (Raw I/O & database calls only)
 */
import { adminDb as db } from '@/lib/firebaseAdmin';
import { redis } from '@/lib/redis';
import { logger } from '@/lib/services/logger';
import { noticeSchema } from '@/lib/validation/facade.schemas';
import type { NoticeData } from '@/lib/services/newsData';
import type * as admin from 'firebase-admin';

export interface RawNoticesFetchResult {
  cityItems: NoticeData[];
  railItems: NoticeData[];
  cultureItems: NoticeData[];
  dongItems: NoticeData[];
}

export async function fetchRawLocalNotices(filterDongtan: boolean = true): Promise<RawNoticesFetchResult> {
  if (!db) {
    logger.warn('news.repository.fetchRawLocalNotices', 'Firebase Admin DB not initialized. Returning empty results.');
    return { cityItems: [], railItems: [], cultureItems: [], dongItems: [] };
  }
  const localDb = db;

  let cityQuery = localDb.collection('local_notices').where('source', 'in', ['gosi', 'bbs']);
  let railQuery = localDb.collection('local_notices').where('source', '==', 'rail');
  let cultureQuery = localDb.collection('local_notices').where('source', '==', 'culture');

  if (filterDongtan) {
    cityQuery = cityQuery.where('isDongtan', '==', true);
    railQuery = railQuery.where('isDongtan', '==', true);
    cultureQuery = cultureQuery.where('isDongtan', '==', true);
  }

  cityQuery = cityQuery.limit(150);
  railQuery = railQuery.limit(150);
  cultureQuery = cultureQuery.limit(150);

  let dongQuery = localDb.collection('local_notices').where('source', '==', 'dong');
  if (filterDongtan) {
    dongQuery = dongQuery.where('isDongtan', '==', true);
  }
  dongQuery = dongQuery.limit(400);

  const isDev = process.env.NODE_ENV === 'development';
  const timeoutMs = isDev ? 10000 : 5000;

  const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
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

  const [citySnapshot, railSnapshot, cultureSnapshot, dongSnapshot] = await Promise.all([
    withTimeout(cityQuery.get(), timeoutMs),
    withTimeout(railQuery.get(), timeoutMs),
    withTimeout(cultureQuery.get(), timeoutMs),
    withTimeout(dongQuery.get(), timeoutMs)
  ]);

  const getTopN = (snapshot: admin.firestore.QuerySnapshot, limitVal = 100) => {
    const validItems: NoticeData[] = [];
    snapshot.docs.forEach((doc: admin.firestore.QueryDocumentSnapshot) => {
      try {
        const data = doc.data();
        if (data && typeof data === 'object') {
          if (data.url) {
            data.url = data.url.trim();
          }
          const rawNotice = { ...data, id: doc.id };
          const parsed = noticeSchema.safeParse(rawNotice);
          if (parsed.success) {
            validItems.push(parsed.data);
          }
        }
      } catch (itemErr) {
        logger.error('news.repository.fetchRawLocalNotices', `Error parsing doc ${doc.id}`, {}, itemErr as Error);
      }
    });
    return validItems
      .sort((a: NoticeData, b: NoticeData) => {
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;
        return b.id.localeCompare(a.id);
      })
      .slice(0, limitVal);
  };

  const cityItems = getTopN(citySnapshot, 100);
  const railItems = getTopN(railSnapshot, 100);
  const cultureItems = getTopN(cultureSnapshot, 100);
  const dongItems = getTopN(dongSnapshot, 300);

  return { cityItems, railItems, cultureItems, dongItems };
}

export async function getCachedNotices(cacheKey: string): Promise<any | null> {
  if (redis) {
    try {
      return await redis.get(cacheKey);
    } catch (err) {
      logger.warn('news.repository.getCachedNotices', 'Redis localNotices read error', { cacheKey }, err as Error);
    }
  }
  return null;
}

export async function setCachedNotices(cacheKey: string, responseData: any): Promise<void> {
  if (redis) {
    redis.set(cacheKey, responseData, { ex: 3600 }).catch(e => 
      logger.warn('news.repository.setCachedNotices', 'Redis localNotices write error', { cacheKey }, e as Error)
    );
  }
}
