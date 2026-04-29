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

  // 2. Type map (Google Sheets CSV — no auth needed)
  try {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_TABS.TYPE_MAP)}`;
    const res = await fetch(csvUrl, { cache: 'no-store' });
    if (res.ok) {
      const csvText = await res.text();
      const lines = csvText.split('\n').filter(l => l.trim());
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]);
        if (cols.length < 3) continue;
        const aptName = cols[1]?.trim();
        const area = cols[2]?.trim();
        const typeM2 = cols[3]?.trim() || '';
        const typePyeong = cols[5]?.trim() || '';
        if (aptName && area && (typeM2 || typePyeong)) {
          result.typeMap.push({ aptName, area, typeM2, typePyeong });
        }
      }
    }
  } catch (e) {
    console.warn('[dashboard-init] typeMap error:', e);
  }

  // 3. Apartment meta (Firebase Admin — name mapping + public rental)
  try {
    if (adminDb) {
      const metaDoc = await withTimeout(adminDb.doc('settings/apartmentMeta').get(), 5000);
      if (metaDoc.exists) {
        result.apartmentMeta = metaDoc.data() || {};
      }
    }
  } catch (e) {
    console.warn('[dashboard-init] apartmentMeta error:', e);
  }

  return NextResponse.json(result);
}
