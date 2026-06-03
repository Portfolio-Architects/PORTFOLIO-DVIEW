import { NextResponse } from 'next/server';
import { adminDb as db } from '@/lib/firebaseAdmin';
import { z } from 'zod';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

const noticeSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  url: z.string().optional(),
  dept: z.string().optional(),
  date: z.string(),
  isDongtan: z.boolean(),
  source: z.enum(['bbs', 'gosi', 'rail', 'dong']).optional(),
  createdAt: z.string().optional(),
});

type NoticeData = z.infer<typeof noticeSchema>;

const localNoticesResponseSchema = z.object({
  notices: z.array(noticeSchema),
  lastUpdated: z.string().nullable().optional(),
});

export async function GET(request: Request) {
  try {
    if (!db) {
      return NextResponse.json({ error: 'Firebase DB not initialized' }, { status: 500 });
    }
    const localDb = db;

    const { searchParams } = new URL(request.url);
    const filterDongtan = searchParams.get('dongtan') !== 'false';

    const cacheKey = `DTDLS:cache:localNotices:filterDongtan:${filterDongtan}`;
    if (redis) {
      try {
        const cached = await redis.get<any>(cacheKey);
        if (cached) {
          return NextResponse.json(cached, {
            headers: {
              'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=300'
            }
          });
        }
      } catch (err) {
        console.warn('[Server] Redis localNotices read error:', err);
      }
    }

    // 각 카테고리별로 개별 쿼리하여 최대 100개씩 독립적(Composite Index 회피를 위해 limit 150 후 메모리 정렬) 수집
    // filterDongtan이 true일 때는 쿼리 단계에서 isDongtan == true 필터링을 함께 태워 데이터 손실을 원천 방지
    let cityQuery = localDb.collection('local_notices').where('source', 'in', ['gosi', 'bbs']);
    let railQuery = localDb.collection('local_notices').where('source', '==', 'rail');

    if (filterDongtan) {
      cityQuery = cityQuery.where('isDongtan', '==', true);
      railQuery = railQuery.where('isDongtan', '==', true);
    }

    cityQuery = cityQuery.limit(150);
    railQuery = railQuery.limit(150);

    // 3. 동네행정 (동탄 1동~9동의 9개 행정복지센터 부서별 병렬 쿼리로 특정 동 누락을 완전히 방지)
    const dongs = ['동탄1동', '동탄2동', '동탄3동', '동탄4동', '동탄5동', '동탄6동', '동탄7동', '동탄8동', '동탄9동'];
    const dongQueries = dongs.map(dong => {
      let q = localDb.collection('local_notices')
        .where('source', '==', 'dong')
        .where('dept', '==', dong);
      if (filterDongtan) {
        q = q.where('isDongtan', '==', true);
      }
      return q.limit(100);
    });

    const [citySnapshot, railSnapshot, ...dongSnapshots] = await Promise.all([
      cityQuery.get(),
      railQuery.get(),
      ...dongQueries.map(q => q.get())
    ]);

    const getTop100 = (snapshot: any) => {
      const validItems: NoticeData[] = [];
      snapshot.docs.forEach((doc: any) => {
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
            } else {
              console.warn(`[Local Notices API] Skipping invalid notice (ID: ${doc.id}):`, parsed.error.format());
            }
          }
        } catch (itemErr) {
          console.error(`[Local Notices API] Error parsing doc ${doc.id}:`, itemErr);
        }
      });
      return validItems
        .sort((a: NoticeData, b: NoticeData) => b.date.localeCompare(a.date))
        .slice(0, 100);
    };

    const cityItems = getTop100(citySnapshot);
    const railItems = getTop100(railSnapshot);
    const dongItems = dongSnapshots.flatMap(snap => getTop100(snap));

    const allItems = [...cityItems, ...railItems, ...dongItems];

    if (allItems.length === 0) {
      return NextResponse.json({ notices: [] });
    }

    const uniqueMap = new Map<string, NoticeData>();
    const urlToKey = new Map<string, string>();

    allItems.forEach(item => {
      const titleKey = `${(item.title || '').trim()}_${(item.date || '').trim()}`;
      const urlKey = item.url ? item.url.trim() : '';

      // Check if duplicate exists by title+date or by URL
      let duplicateKey = uniqueMap.has(titleKey) ? titleKey : null;
      if (!duplicateKey && urlKey && urlToKey.has(urlKey)) {
        duplicateKey = urlToKey.get(urlKey) || null;
      }

      if (duplicateKey) {
        const existing = uniqueMap.get(duplicateKey);
        if (existing) {
          const currentIsPrefixed = item.id.includes('_');
          const existingIsPrefixed = existing.id.includes('_');
          // Prefer new prefixed IDs over legacy numeric IDs
          if (currentIsPrefixed && !existingIsPrefixed) {
            uniqueMap.set(duplicateKey, item);
            if (urlKey) urlToKey.set(urlKey, duplicateKey);
          }
        }
      } else {
        uniqueMap.set(titleKey, item);
        if (urlKey) urlToKey.set(urlKey, titleKey);
      }
    });

    let notices = Array.from(uniqueMap.values());

    // If filterDongtan is true, return only dongtan related notices
    if (filterDongtan) {
      notices = notices.filter((n: NoticeData) => n.isDongtan);
      notices.sort((a: NoticeData, b: NoticeData) => b.date.localeCompare(a.date));
    } else {
      // Sort: dongtan related ones first, then by date desc
      notices.sort((a: NoticeData, b: NoticeData) => {
        if (a.isDongtan && !b.isDongtan) return -1;
        if (!a.isDongtan && b.isDongtan) return 1;
        return b.date.localeCompare(a.date);
      });
    }

    // Find the latest sync timestamp
    let lastUpdated: string | null = null;
    allItems.forEach(item => {
      if (item.createdAt) {
        if (!lastUpdated || item.createdAt > lastUpdated) {
          lastUpdated = item.createdAt;
        }
      }
    });

    const parsedResponse = localNoticesResponseSchema.safeParse({ notices, lastUpdated });
    const responseData = parsedResponse.success ? parsedResponse.data : { notices: [], lastUpdated: null };

    if (redis) {
      redis.set(cacheKey, responseData, { ex: 3600 }).catch(e => console.warn('[Server] Redis localNotices write error:', e));
    }

    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=300'
      }
    });

  } catch (error: unknown) {
    console.error('Error fetching local notices:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
