import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { adminDb as db } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

const SOURCE_1_BBS_URL = 'https://www.hscity.go.kr/www/user/bbs/BD_selectBbsList.do?q_bbsCode=1019';
const SOURCE_2_GOSI_URL = 'https://www.hscity.go.kr/www/gosi/BD_notice.do';
const SOURCE_3_RAIL_URL = 'https://www.hscity.go.kr/www/user/bbs/BD_selectBbsList.do?q_bbsCode=1131';

const DONGTAN_KEYWORDS = [
  '동탄', '출장소', '호수공원', '청계', '영천', '오산동', '신동', '목동', 
  '산척', '장지', '송동', '방교', '반송', '능동', '여울', '석우',
  'GTX', '인덕원', '트램', '동인선'
];

interface NoticeItem {
  id: string; // Document ID (bbs_xxx, gosi_xxx)
  originalId: string; // 원래 글번호
  title: string;
  url: string;
  dept: string;
  date: string;
  isDongtan: boolean;
  source: 'bbs' | 'gosi' | 'rail';
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
    const pages = isFull ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] : [1, 2, 3, 4];
    const notices: NoticeItem[] = [];

    // --- Source 1: 타기관 고시공고 (BBS 1019) ---
    for (const page of pages) {
      const url = `${SOURCE_1_BBS_URL}&q_currPage=${page}`;
      try {
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/120.0.0.0 Safari/537.36'
          },
          cache: 'no-store'
        });

        if (!res.ok) {
          console.error(`Failed to fetch Source 1 board page ${page}: HTTP ${res.status}`);
          continue;
        }

        const arrayBuffer = await res.arrayBuffer();
        const decoder = new TextDecoder('utf-8');
        const decodedHtml = decoder.decode(arrayBuffer);
        const $ = cheerio.load(decodedHtml);
        const rows = $('table').first().find('tr');

        rows.each((idx, tr) => {
          // Skip header row
          if (idx === 0) return;

          const tds = $(tr).find('td');
          if (tds.length < 5) return;

          const originalId = $(tds[0]).text().trim();
          const titleEl = $(tds[2]);
          const title = titleEl.text().trim().replace(/\s+/g, ' ');
          const link = titleEl.find('a').attr('href') || '';
          const dept = $(tds[3]).text().trim();
          const date = $(tds[4]).text().trim();

          if (originalId && title && link) {
            const isDongtan = checkIfDongtan(title, dept);
            if (isDongtan) {
              const absoluteUrl = link.startsWith('http') 
                ? link 
                : `https://www.hscity.go.kr${link}`;

              notices.push({
                id: `bbs_${originalId}`,
                originalId,
                title,
                url: absoluteUrl,
                dept,
                date,
                isDongtan: true,
                source: 'bbs',
                createdAt: new Date().toISOString()
              });
            }
          }
        });
      } catch (err) {
        console.error(`Error scraping Source 1 page ${page}:`, err);
      }
    }

    // --- Source 3: 철도사업 추진현황 (BBS 1131) ---
    for (const page of pages) {
      const url = `${SOURCE_3_RAIL_URL}&q_currPage=${page}`;
      try {
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/120.0.0.0 Safari/537.36'
          },
          cache: 'no-store'
        });

        if (!res.ok) {
          console.error(`Failed to fetch Source 3 board page ${page}: HTTP ${res.status}`);
          continue;
        }

        const arrayBuffer = await res.arrayBuffer();
        const decoder = new TextDecoder('utf-8');
        const decodedHtml = decoder.decode(arrayBuffer);
        const $ = cheerio.load(decodedHtml);
        const rows = $('table').first().find('tr');

        rows.each((idx, tr) => {
          // Skip header row
          if (idx === 0) return;

          const tds = $(tr).find('td');
          if (tds.length < 5) return;

          const originalId = $(tds[0]).text().trim();
          const titleEl = $(tds[2]);
          const title = titleEl.text().trim().replace(/\s+/g, ' ');
          const link = titleEl.find('a').attr('href') || '';
          const dept = $(tds[3]).text().trim();
          const date = $(tds[4]).text().trim();

          if (originalId && title && link) {
            const isDongtan = checkIfDongtan(title, dept);
            if (isDongtan) {
              const absoluteUrl = link.startsWith('http') 
                ? link 
                : `https://www.hscity.go.kr${link}`;

              notices.push({
                id: `rail_${originalId}`,
                originalId,
                title,
                url: absoluteUrl,
                dept,
                date,
                isDongtan: true,
                source: 'rail',
                createdAt: new Date().toISOString()
              });
            }
          }
        });
      } catch (err) {
        console.error(`Error scraping Source 3 page ${page}:`, err);
      }
    }

    // --- Source 2: 화성시 공식 고시공고 (Gosi BD_notice) ---
    for (const page of pages) {
      const url = `${SOURCE_2_GOSI_URL}?q_currPage=${page}&q_cp=${page}`;
      try {
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/120.0.0.0 Safari/537.36'
          },
          cache: 'no-store'
        });

        if (!res.ok) {
          console.error(`Failed to fetch Source 2 board page ${page}: HTTP ${res.status}`);
          continue;
        }

        const arrayBuffer = await res.arrayBuffer();
        const decoder = new TextDecoder('utf-8');
        const decodedHtml = decoder.decode(arrayBuffer);
        const $ = cheerio.load(decodedHtml);
        const rows = $('table tr');

        rows.each((idx, tr) => {
          const tds = $(tr).find('td');
          if (tds.length < 4) return;

          const titleEl = $(tds[1]);
          const aTag = titleEl.find('a');
          if (aTag.length === 0) return;

          const onclick = aTag.attr('onclick') || '';
          const idMatch = onclick.match(/opGosiView\('([^']+)'\)/);
          if (!idMatch) return;

          const originalId = idMatch[1];
          const title = titleEl.text().trim().replace(/\s+/g, ' ');
          const dept = $(tds[2]).text().trim();
          const date = $(tds[3]).text().trim();

          if (originalId && title) {
            const isDongtan = checkIfDongtan(title, dept);
            if (isDongtan) {
              const absoluteUrl = `https://www.hscity.go.kr/www/gosi/BD_selectNoticeDetail.do?q_notAncmtMgtNo=${originalId}`;

              notices.push({
                id: `gosi_${originalId}`,
                originalId,
                title,
                url: absoluteUrl,
                dept,
                date,
                isDongtan: true,
                source: 'gosi',
                createdAt: new Date().toISOString()
              });
            }
          }
        });
      } catch (err) {
        console.error(`Error scraping Source 2 page ${page}:`, err);
      }
    }

    if (notices.length === 0) {
      return NextResponse.json({ success: true, count: 0, message: 'No notices scraped' });
    }

    // 3. Batch save to Firestore (Merge with existing documents)
    const collRef = db.collection('local_notices');
    const batch = db.batch();
    let written = 0;

    for (const item of notices) {
      const docRef = collRef.doc(item.id);
      batch.set(docRef, item, { merge: true });
      written++;
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      scrapedCount: notices.length,
      writtenCount: written,
      notices: notices.slice(0, 5) // Return sample for debug
    });

  } catch (error: unknown) {
    console.error('Error syncing local notices:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
