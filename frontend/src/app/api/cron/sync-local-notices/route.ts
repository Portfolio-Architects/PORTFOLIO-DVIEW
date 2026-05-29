import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { adminDb as db } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

const BOARD_URL = 'https://www.hscity.go.kr/www/user/bbs/BD_selectBbsList.do?q_bbsCode=1019';
const DONGTAN_KEYWORDS = [
  '동탄', '출장소', '호수공원', '청계', '영천', '오산동', '신동', '목동', 
  '산척', '장지', '송동', '방교', '반송', '능동', '여울'
];

interface NoticeItem {
  id: string;
  title: string;
  url: string;
  dept: string;
  date: string;
  isDongtan: boolean;
  createdAt: string;
}

function checkIfDongtan(title: string, dept: string): boolean {
  const t = title || '';
  const d = dept || '';
  return DONGTAN_KEYWORDS.some(k => t.includes(k) || d.includes(k));
}

export async function GET(request: Request) {
  try {
    // 1. Authorization check for production
    const authHeader = request.headers.get('authorization');
    if (
      process.env.NODE_ENV !== 'development' &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!db) {
      return NextResponse.json({ error: 'Firebase DB not initialized' }, { status: 500 });
    }

    // 2. Fetch pages (we scrape page 1 and page 2 by default, or 1 to 10 if full is true)
    const { searchParams } = new URL(request.url);
    const isFull = searchParams.get('full') === 'true';
    const pages = isFull ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] : [1, 2];
    const notices: NoticeItem[] = [];

    for (const page of pages) {
      const url = `${BOARD_URL}&q_currPage=${page}`;
      const res = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 8000 // 8 seconds timeout
      });

      if (res.status !== 200) {
        console.error(`Failed to fetch Hwaseong board page ${page}: HTTP ${res.status}`);
        continue;
      }

      const $ = cheerio.load(res.data);
      const rows = $('table').first().find('tr');

      rows.each((idx, tr) => {
        // Skip header row
        if (idx === 0) return;

        const tds = $(tr).find('td');
        if (tds.length < 5) return;

        const id = $(tds[0]).text().trim();
        const titleEl = $(tds[2]);
        const title = titleEl.text().trim().replace(/\s+/g, ' ');
        const link = titleEl.find('a').attr('href') || '';
        const dept = $(tds[3]).text().trim();
        const date = $(tds[4]).text().trim();

        if (id && title && link) {
          const isDongtan = checkIfDongtan(title, dept);
          const absoluteUrl = link.startsWith('http') 
            ? link 
            : `https://www.hscity.go.kr${link}`;

          notices.push({
            id,
            title,
            url: absoluteUrl,
            dept,
            date,
            isDongtan,
            createdAt: new Date().toISOString()
          });
        }
      });
    }

    if (notices.length === 0) {
      return NextResponse.json({ success: true, count: 0, message: 'No notices scraped' });
    }

    // 3. Batch save to Firestore
    const collRef = db.collection('local_notices');
    const batch = db.batch();
    let written = 0;

    for (const item of notices) {
      // Check if already exists in memory map or query if exists?
      // Since it's a small volume (20 items max), we can write with merge to preserve fields
      const docRef = collRef.doc(item.id);
      batch.set(docRef, item, { merge: true });
      written++;
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      scrapedCount: notices.length,
      writtenCount: written,
      notices: notices.slice(0, 5) // Return sample
    });

  } catch (error: unknown) {
    console.error('Error syncing local notices:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
