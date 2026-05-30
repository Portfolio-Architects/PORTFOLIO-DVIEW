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
      .limit(30);

    const snapshot = await query.get();
    
    if (snapshot.empty) {
      return NextResponse.json({ notices: [] });
    }

    let notices = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as NoticeData[];

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
