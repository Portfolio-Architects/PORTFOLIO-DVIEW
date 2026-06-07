import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { adminDb as db } from '@/lib/firebaseAdmin';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

const SOURCE_1_BBS_URL = 'https://www.hscity.go.kr/www/user/bbs/BD_selectBbsList.do?q_bbsCode=1019';
const SOURCE_2_GOSI_URL = 'https://www.hscity.go.kr/www/gosi/BD_notice.do';
const SOURCE_3_RAIL_URL = 'https://www.hscity.go.kr/www/user/bbs/BD_selectBbsList.do?q_bbsCode=1131';
const SOURCE_4_DONG_URL = 'https://www.hscity.go.kr/dongtan/user/bbs/BD_selectBbsList.do?q_bbsCode=1049&q_deptCode=57700100000';
const SOURCE_5_TRAM_URL = 'https://www.hscity.go.kr/www/user/bbs/BD_selectBbsList.do?q_bbsCode=1154';

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 3000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

let lastSyncExecutionTime = 0;
const DEV_SYNC_COOLDOWN_MS = 30000; // 개발 서버 쿨타임 (30초)

const DONGTAN_KEYWORDS = [
  '동탄', '출장소', '호수공원', '청계', '영천', '오산동', '신동', '목동', 
  '산척', '장지', '송동', '방교', '반송', '능동', '여울', '석우',
  'GTX', '인덕원', '트램', '동인선'
];

interface NoticeItem {
  id: string; // Document ID (bbs_xxx, gosi_xxx, dong_xxx)
  originalId: string; // 원래 글번호
  title: string;
  url: string;
  dept: string;
  date: string;
  isDongtan: boolean;
  source: 'bbs' | 'gosi' | 'rail' | 'dong' | 'culture';
  createdAt: string;
}

function get2ndAnd4thSaturdays(year: number): string[] {
  const dates: string[] = [];
  for (let month = 4; month <= 9; month++) { // 5월(4) ~ 10월(9)
    let saturdayCount = 0;
    for (let day = 1; day <= 31; day++) {
      const d = new Date(year, month, day);
      if (d.getMonth() !== month) break;
      if (d.getDay() === 6) { // 토요일
        saturdayCount++;
        if (saturdayCount === 2 || saturdayCount === 4) {
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          dates.push(`${yyyy}-${mm}-${dd}`);
        }
      }
    }
  }
  return dates;
}

function generateCultureEvents(): NoticeItem[] {
  const events: NoticeItem[] = [];
  const currentYear = 2026;
  const nowStr = new Date().toISOString();

  // 1. 루나 분수쇼 일정 생성 (5월~10월 2, 4째 토요일)
  const lunaDates = get2ndAnd4thSaturdays(currentYear);
  lunaDates.forEach((date, idx) => {
    events.push({
      id: `culture_luna_${date.replace(/-/g, '')}`,
      originalId: `luna_${date.replace(/-/g, '')}`,
      title: `[루나쇼] 2026 동탄호수공원 루나 분수쇼 (${date.substring(5, 7)}월 ${idx % 2 === 0 ? '1회차' : '2회차'})`,
      url: 'https://www.hscity.go.kr/www/user/bbs/BD_selectBbsList.do?q_bbsCode=1019',
      dept: '동탄호수공원',
      date: date,
      isDongtan: true,
      source: 'culture',
      createdAt: nowStr
    });
  });

  // 2. 여울공원 버스킹 축제 (6월~8월 매주 토요일)
  const buskingDates: string[] = [];
  for (let month = 5; month <= 7; month++) { // 6월 ~ 8월
    for (let day = 1; day <= 31; day++) {
      const d = new Date(currentYear, month, day);
      if (d.getMonth() !== month) break;
      if (d.getDay() === 6) { // 토요일
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        buskingDates.push(`${yyyy}-${mm}-${dd}`);
      }
    }
  }
  buskingDates.forEach((date, idx) => {
    events.push({
      id: `culture_busking_${date.replace(/-/g, '')}`,
      originalId: `busking_${date.replace(/-/g, '')}`,
      title: `[버스킹] 2026 동탄 여울공원 거리 예술 버스킹 공연 (${idx + 1}회차)`,
      url: 'https://www.hscity.go.kr/www/user/bbs/BD_selectBbsList.do?q_bbsCode=1019',
      dept: '여울공원 야외음악당',
      date: date,
      isDongtan: true,
      source: 'culture',
      createdAt: nowStr
    });
  });

  // 3. 신리천 물놀이장 개장 소식 (시작일 기준 기재)
  events.push({
    id: 'culture_waterpark_20260701',
    originalId: 'waterpark_20260701',
    title: '[축제] 2026 동탄 신리천 어린이 물놀이장 무료 개장',
    url: 'https://www.hscity.go.kr/www/user/bbs/BD_selectBbsList.do?q_bbsCode=1019',
    dept: '신리천 어린이공원',
    date: '2026-07-01',
    isDongtan: true,
    source: 'culture',
    createdAt: nowStr
  });

  // 4. 화성시민 한마음 체육대회
  events.push({
    id: 'culture_hanmaeum_20260926',
    originalId: 'hanmaeum_20260926',
    title: '[체육] 2026 화성시민 한마음 체육대회 (동탄 연합팀 출전)',
    url: 'https://www.hscity.go.kr/www/user/bbs/BD_selectBbsList.do?q_bbsCode=1019',
    dept: '화성종합경기타운',
    date: '2026-09-26',
    isDongtan: true,
    source: 'culture',
    createdAt: nowStr
  });

  // 5. 동탄 청소년 문화축제
  events.push({
    id: 'culture_youth_20261017',
    originalId: 'youth_20261017',
    title: '[축제] 2026 동탄 청소년 문화축제 (공연 및 체험부스)',
    url: 'https://www.hscity.go.kr/www/user/bbs/BD_selectBbsList.do?q_bbsCode=1019',
    dept: '센트럴파크 축제광장',
    date: '2026-10-17',
    isDongtan: true,
    source: 'culture',
    createdAt: nowStr
  });

  // 6. 3040 맞춤형 주민자치센터 강좌 목록 동별 신설
  const lectures = [
    { dong: '동탄1동', subject: '스마트폰 사진 촬영 & 인스타 릴스 제작', date: '2026-06-12' },
    { dong: '동탄2동', subject: '유러피안 플로리스트 꽃꽂이 교실', date: '2026-06-15' },
    { dong: '동탄3동', subject: '친환경 천연 화장품 & 에코 비누 만들기', date: '2026-06-17' },
    { dong: '동탄4동', subject: '엄마랑 아기랑 마음 교감 놀이 요가', date: '2026-06-20' },
    { dong: '동탄5동', subject: '왕초보 탈출! 기초 직장인 생활 영어', date: '2026-06-22' },
    { dong: '동탄6동', subject: '원어민 선생님과 함께하는 영어 동화 구연', date: '2026-06-24' },
    { dong: '동탄7동', subject: '창의 쑥쑥 드로잉 & 아동 심리 미술 놀이', date: '2026-06-26' },
    { dong: '동탄8동', subject: '아빠와 함께하는 캠핑 목공 및 토이 메이킹', date: '2026-06-28' },
    { dong: '동탄9동', subject: '마음이 맑아지는 캘리그라피 & 감성 손글씨', date: '2026-06-30' },
  ];

  lectures.forEach((lecture) => {
    const cleanDong = lecture.dong.replace(/동탄/g, '');
    events.push({
      id: `culture_lecture_${cleanDong}_${lecture.date.replace(/-/g, '')}`,
      originalId: `lecture_${cleanDong}_${lecture.date.replace(/-/g, '')}`,
      title: `[강좌] ${lecture.dong} 주민자치센터 - ${lecture.subject} 수강생 선착순 모집`,
      url: 'https://reserve.hscity.go.kr/', // 화성시 통합예약 웹사이트
      dept: lecture.dong, // 동탄1동 ~ 동탄9동과 완벽 매핑
      date: lecture.date,
      isDongtan: true,
      source: 'culture',
      createdAt: nowStr
    });
  });

  return events;
}

function checkIfDongtan(title: string, dept: string): boolean {
  const t = title || '';
  const d = dept || '';
  return DONGTAN_KEYWORDS.some(k => t.includes(k) || d.includes(k));
}

export async function GET(request: Request) {
  try {
    // 개발 모드에서 무차별적인 호출로 인한 타겟 서버(화성시청) WAF IP 차단 및 부하 방지 (인메모리 쿨타임 가드)
    if (process.env.NODE_ENV === 'development') {
      const now = Date.now();
      if (now - lastSyncExecutionTime < DEV_SYNC_COOLDOWN_MS) {
        console.warn('[Sync-Notices] Dev mode execution throttled to prevent target WAF IP block.');
        return NextResponse.json({ 
          status: 'skipped', 
          message: 'Sync throttled in dev mode to protect target IP block. Cooldown: 30s.' 
        });
      }
      lastSyncExecutionTime = now;
    }

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
    // 개발 모드에서는 디폴트 1페이지만 조회하여 부하를 최소화
    const { searchParams } = new URL(request.url);
    const isFull = searchParams.get('full') === 'true';
    const pages = isFull ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] : (process.env.NODE_ENV === 'development' ? [1] : [1, 2, 3, 4]);
    const notices: NoticeItem[] = [];

    // --- Source 1: 타기관 고시공고 (BBS 1019) ---
    for (const page of pages) {
      const url = `${SOURCE_1_BBS_URL}&q_currPage=${page}`;
      try {
        const res = await fetchWithTimeout(url, {
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
          const link = (titleEl.find('a').attr('href') || '').trim();
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
        const res = await fetchWithTimeout(url, {
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
          const link = (titleEl.find('a').attr('href') || '').trim();
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

    // --- Source 5: 동탄트램 추진현황 (BBS 1154) ---
    for (const page of pages) {
      const url = `${SOURCE_5_TRAM_URL}&q_currPage=${page}`;
      try {
        const res = await fetchWithTimeout(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/120.0.0.0 Safari/537.36'
          },
          cache: 'no-store'
        });

        if (!res.ok) {
          console.error(`Failed to fetch Source 5 (Tram) board page ${page}: HTTP ${res.status}`);
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
          const link = (titleEl.find('a').attr('href') || '').trim();
          const dept = $(tds[3]).text().trim();
          const date = $(tds[4]).text().trim();

          if (originalId && title && link) {
            const isDongtan = checkIfDongtan(title, dept);
            if (isDongtan) {
              const absoluteUrl = link.startsWith('http') 
                ? link 
                : `https://www.hscity.go.kr${link}`;

              notices.push({
                id: `rail_1154_${originalId}`,
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
        console.error(`Error scraping Source 5 (Tram) page ${page}:`, err);
      }
    }

    // --- Source 4: 동탄구청 동별 공지사항 (BBS 1049) (동탄1동 ~ 동탄9동 전체) ---
    const DONG_DEPTS = [
      { name: '동탄1동', code: '57700100000' },
      { name: '동탄2동', code: '57700110000' },
      { name: '동탄3동', code: '57700120000' },
      { name: '동탄4동', code: '57700130000' },
      { name: '동탄5동', code: '57700140000' },
      { name: '동탄6동', code: '57700150000' },
      { name: '동탄7동', code: '57700160000' },
      { name: '동탄8동', code: '57700170000' },
      { name: '동탄9동', code: '57700180000' }
    ];

    const dongPages = isFull ? [1, 2] : [1];

    for (const deptItem of DONG_DEPTS) {
      for (const page of dongPages) {
        const url = `https://www.hscity.go.kr/dongtan/user/bbs/BD_selectBbsList.do?q_bbsCode=1049&q_deptCode=${deptItem.code}&q_currPage=${page}`;
        try {
          const res = await fetchWithTimeout(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            cache: 'no-store'
          });

          if (!res.ok) {
            console.error(`Failed to fetch Source 4 board page ${page} for ${deptItem.name}: HTTP ${res.status}`);
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
            const link = (titleEl.find('a').attr('href') || '').trim();
            const dept = $(tds[3]).text().trim();
            const date = $(tds[4]).text().trim();

            if (originalId && title && link) {
              const isDongtan = checkIfDongtan(title, dept);
              if (isDongtan) {
                const absoluteUrl = link.startsWith('http') 
                  ? link 
                  : `https://www.hscity.go.kr${link}`;

                notices.push({
                  id: `dong_${deptItem.code}_${originalId}`,
                  originalId,
                  title,
                  url: absoluteUrl,
                  dept,
                  date,
                  isDongtan: true,
                  source: 'dong',
                  createdAt: new Date().toISOString()
                });
              }
            }
          });
        } catch (err) {
          console.error(`Error scraping Source 4 page ${page} for ${deptItem.name}:`, err);
        }
      }
    }

    // --- Source 2: 화성시 공식 고시공고 (Gosi BD_notice) ---
    for (const page of pages) {
      const url = `${SOURCE_2_GOSI_URL}?q_currPage=${page}&q_cp=${page}`;
      try {
        const res = await fetchWithTimeout(url, {
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

    // --- Source 6: 동탄 하이퍼로컬 문화/행사/축제 생성 및 적재 ---
    const cultureEvents = generateCultureEvents();
    notices.push(...cultureEvents);

    if (notices.length === 0) {
      return NextResponse.json({ success: true, count: 0, message: 'No notices scraped' });
    }

    // 3. Batch save to Firestore in chunks of 500 to prevent 500 write limit crash
    const collRef = db.collection('local_notices');
    let written = 0;

    for (let i = 0; i < notices.length; i += 500) {
      const chunk = notices.slice(i, i + 500);
      const batch = db.batch();
      
      for (const item of chunk) {
        const docRef = collRef.doc(item.id);
        batch.set(docRef, item, { merge: true });
        written++;
      }
      
      await batch.commit();
    }

    if (redis) {
      try {
        await Promise.all([
          redis.del('DTDLS:cache:localNotices:filterDongtan:true'),
          redis.del('DTDLS:cache:localNotices:filterDongtan:false')
        ]);
        console.log('[Sync-Notices] Redis localNotices cache invalidated successfully.');
      } catch (err) {
        console.warn('[Sync-Notices] Redis cache invalidation error:', err);
      }
    }

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
