/**
 * GET /api/dashboard-init
 * 
 * Consolidated API: replaces 3 separate calls:
 *   /api/favorite-counts  → favoriteCounts
 *   /api/type-map          → typeMap
 *   Firestore settings/apartmentMeta → apartmentMeta
 * 
 * Single serverless cold-start instead of 3.
 */
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { SHEET_ID, SHEET_TABS, parseCsvLine } from '@/lib/constants';
import { redis } from '@/lib/redis';
import fs from 'fs';
import path from 'path';
import typeMapStatic from '../../../../public/data/type-map.json';

export const dynamic = 'force-dynamic'; // Vercel build-time network isolation 대비 (런타임에 동적으로 실행 후 CDN 캐시)

export async function GET() {
  const result: {
    favoriteCounts: Record<string, number>;
    typeMap: { aptName: string; area: string; typeM2: string; typePyeong: string }[];
    apartmentMeta: Record<string, unknown>;
  } = {
    favoriteCounts: {},
    typeMap: [],
    apartmentMeta: {},
  };

  const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> =>
    Promise.race([
      promise,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Firebase timeout')), ms))
    ]);

  // 1. Favorite counts (Redis First -> Firebase Fallback)
  try {
    if (redis) {
      // 1-A. Redis 캐시 우선 조회 (HGETALL은 Firebase 과금을 유발하지 않음)
      const cachedCounts = await redis.hgetall('DTDLS:cache:favoriteCounts');
      if (cachedCounts && Object.keys(cachedCounts).length > 0) {
        result.favoriteCounts = cachedCounts as Record<string, number>;
      } else if (adminDb) {
        // 1-B. 캐시 미스 스 Fallback (1회 한정 Full Scan)
        const snap = await withTimeout(adminDb.collection('favoriteCounts').get(), 5000);
        snap.docs.forEach(doc => {
          const data = doc.data();
          if (data.count > 0) {
            result.favoriteCounts[data.aptName || doc.id] = data.count;
          }
        });
        
        // Background Async: Redis 캐시에 복제 저장
        if (Object.keys(result.favoriteCounts).length > 0) {
          redis.hmset('DTDLS:cache:favoriteCounts', result.favoriteCounts).catch(err => console.warn('Redis HMSET error:', err));
        }
      }
    } else if (adminDb) {
      // 1-C. Redis가 없는 레거시 환경 Fallback
      const snap = await withTimeout(adminDb.collection('favoriteCounts').get(), 5000);
      snap.docs.forEach(doc => {
        const data = doc.data();
        if (data.count > 0) {
          result.favoriteCounts[data.aptName || doc.id] = data.count;
        }
      });
    }
  } catch (e) {
    console.warn('[dashboard-init] favoriteCounts error:', e);
  }

  // 2. Type map (Static JSON Cache first -> Google Sheets Fallback)
  try {
    result.typeMap = typeMapStatic as any;
  } catch (e) {
    console.warn('[dashboard-init] typeMap error:', e);
  }

  // 3. Apartment meta (Redis Cache first -> Firestore Fallback)
  try {
    let cachedMeta = null;
    if (redis) {
      try {
        cachedMeta = await redis.get('DTDLS:cache:apartmentMeta');
        if (cachedMeta && typeof cachedMeta === 'object') {
          result.apartmentMeta = cachedMeta as Record<string, unknown>;
        }
      } catch (e) {
        console.warn('[dashboard-init] Redis meta read error:', e);
      }
    }

    if (!cachedMeta && adminDb) {
      const metaDoc = await withTimeout(adminDb.doc('settings/apartmentMeta').get(), 5000);
      if (metaDoc.exists) {
        const metaData = metaDoc.data() || {};
        result.apartmentMeta = metaData;
        if (redis && Object.keys(metaData).length > 0) {
          redis.set('DTDLS:cache:apartmentMeta', metaData, { ex: 86400 }).catch(e => console.warn('[dashboard-init] Redis meta write error:', e));
        }
      }
    }
  } catch (e) {
    console.warn('[dashboard-init] apartmentMeta error:', e);
  }

  return NextResponse.json(result);
}
