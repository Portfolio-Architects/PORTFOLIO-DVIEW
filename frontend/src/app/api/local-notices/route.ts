import { NextResponse } from 'next/server';
import { adminDb as db } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

interface NoticeData {
  id: string;
  title?: string;
  url?: string;
  dept?: string;
  date: string;
  isDongtan: boolean;
  source?: 'bbs' | 'gosi' | 'rail' | 'dong';
  createdAt?: string;
}

export async function GET(request: Request) {
  try {
    if (!db) {
      return NextResponse.json({ error: 'Firebase DB not initialized' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const filterDongtan = searchParams.get('dongtan') !== 'false';

    const query = db.collection('local_notices')
      .orderBy('date', 'desc')
      .limit(100);

    const snapshot = await query.get();
    
    if (snapshot.empty) {
      return NextResponse.json({ notices: [] });
    }

    const uniqueMap = new Map<string, NoticeData>();
    const urlToKey = new Map<string, string>();

    snapshot.docs.forEach(doc => {
      const data = doc.data() as NoticeData;
      const id = doc.id;
      const item = { ...data, id };

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
          const currentIsPrefixed = id.includes('_');
          const existingIsPrefixed = existing.id.includes('_');
          // Prefer new prefixed IDs (e.g. bbs_12525) over legacy numeric IDs (e.g. 12525)
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
    } else {
      // Sort: dongtan related ones first, then by date (already sorted by date)
      notices.sort((a: NoticeData, b: NoticeData) => {
        if (a.isDongtan && !b.isDongtan) return -1;
        if (!a.isDongtan && b.isDongtan) return 1;
        return b.date.localeCompare(a.date);
      });
    }

    // Find the latest sync timestamp
    let lastUpdated: string | null = null;
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.createdAt) {
        if (!lastUpdated || data.createdAt > lastUpdated) {
          lastUpdated = data.createdAt;
        }
      }
    });

    return NextResponse.json({ notices, lastUpdated });

  } catch (error: unknown) {
    console.error('Error fetching local notices:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
