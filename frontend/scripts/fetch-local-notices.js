#!/usr/bin/env node
/**
 * 🔄 화성시청/동탄구청 행정망 고시공고 및 철도교통 소식 크롤러 (GitHub Actions용)
 * 
 * 사용법: node scripts/fetch-local-notices.js [--full]
 */

require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const { Redis } = require('@upstash/redis');
const { z } = require('zod');

// Zod schema for administrative local notices validation
const NoticeSchema = z.object({
  id: z.string().min(1),
  originalId: z.string().min(1),
  title: z.string().min(1),
  url: z.string().url(),
  dept: z.string().default(''),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Invalid date format" }),
  isDongtan: z.boolean().default(true),
  source: z.enum(['bbs', 'rail', 'dong', 'gosi']),
  createdAt: z.string().datetime()
});

const SOURCE_1_BBS_URL = 'https://www.hscity.go.kr/www/user/bbs/BD_selectBbsList.do?q_bbsCode=1019';
const SOURCE_2_GOSI_URL = 'https://www.hscity.go.kr/www/gosi/BD_notice.do';
const SOURCE_3_RAIL_URL = 'https://www.hscity.go.kr/www/user/bbs/BD_selectBbsList.do?q_bbsCode=1131';
const SOURCE_4_DONG_URL = 'https://www.hscity.go.kr/dongtan/user/bbs/BD_selectBbsList.do?q_bbsCode=1049&q_deptCode=57700100000';
const SOURCE_5_TRAM_URL = 'https://www.hscity.go.kr/www/user/bbs/BD_selectBbsList.do?q_bbsCode=1154';

const DONGTAN_KEYWORDS = [
  '동탄', '출장소', '호수공원', '청계', '영천', '오산동', '신동', '목동', 
  '산척', '장지', '송동', '방교', '반송', '능동', '여울', '석우',
  'GTX', '인덕원', '트램', '동인선'
];

function checkIfDongtan(title, dept) {
  const t = title || '';
  const d = dept || '';
  return DONGTAN_KEYWORDS.some(k => t.includes(k) || d.includes(k));
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
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

async function main() {
  console.log('📡 행정망 고시공고 및 철도교통 소식 수집 중...');

  // 1. Initialize Firebase Admin
  let serviceAccount;

  const envKey = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'portfolio-dtdls';

  // Paths to check for serviceAccountKey.json
  const pathsToCheck = [
    path.resolve(__dirname, '../../serviceAccountKey.json'), // Workspace Root
    path.resolve(__dirname, '../serviceAccountKey.json'),   // frontend/
    path.resolve(process.cwd(), 'serviceAccountKey.json'),
    path.resolve(process.cwd(), 'frontend/serviceAccountKey.json'),
  ];

  let resolvedPath = null;
  for (const p of pathsToCheck) {
    if (fs.existsSync(p)) {
      resolvedPath = p;
      break;
    }
  }

  if (resolvedPath) {
    try {
      console.log(`Found serviceAccountKey.json at: ${resolvedPath}`);
      serviceAccount = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
    } catch (err) {
      console.error(`❌ Failed to parse serviceAccountKey.json at ${resolvedPath}:`, err.message);
    }
  }

  if (!serviceAccount && envKey) {
    try {
      serviceAccount = JSON.parse(envKey);
    } catch (e) {
      console.error('❌ FIREBASE_SERVICE_ACCOUNT 환경 변수 파싱 실패', e);
    }
  } else if (!serviceAccount && privateKey && clientEmail) {
    serviceAccount = {
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/^"|"$/g, '').replace(/\\n/g, '\n'),
    };
  }

  if (!admin.apps.length) {
    const config = serviceAccount ? { credential: admin.credential.cert(serviceAccount) } : { projectId };
    admin.initializeApp(config);
  }
  const db = admin.firestore();

  // Initialize Redis
  const redis = (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN
      })
    : null;

  const isFull = process.argv.includes('--full');
  const pages = isFull ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] : [1, 2, 3, 4];
  const notices = [];

  // --- Source 1: 타기관 고시공고 (BBS 1019) ---
  console.log('   Source 1 (타기관 고시공고) 크롤링 중...');
  for (const page of pages) {
    const url = `${SOURCE_1_BBS_URL}&q_currPage=${page}`;
    try {
      const res = await fetchWithTimeout(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      if (!res.ok) continue;

      const arrayBuffer = await res.arrayBuffer();
      const decoder = new TextDecoder('utf-8');
      const decodedHtml = decoder.decode(arrayBuffer);
      const $ = cheerio.load(decodedHtml);
      const rows = $('table').first().find('tr');
      if (rows.length === 0) continue;

      // 동적 헤더 파싱
      const headers = [];
      rows.first().find('th, td').each((_, el) => {
        headers.push($(el).text().trim().replace(/\s+/g, ''));
      });
      const titleIdx = headers.findIndex(h => h.includes('제목'));
      const deptIdx = headers.findIndex(h => h.includes('부서') || h.includes('작성자') || h.includes('기관'));
      const dateIdx = headers.findIndex(h => h.includes('등록') || h.includes('작성일') || h.includes('일자'));

      rows.each((idx, tr) => {
        if (idx === 0) return;
        const tds = $(tr).find('td');
        if (tds.length <= Math.max(titleIdx, deptIdx, dateIdx)) return;

        const originalId = $(tds[0]).text().trim();
        const titleEl = $(tds[titleIdx]);
        const title = titleEl.text().trim().replace(/\s+/g, ' ');
        const link = (titleEl.find('a').attr('href') || '').trim();
        const dept = $(tds[deptIdx]).text().trim();
        const date = $(tds[dateIdx]).text().trim();

        if (originalId && title && link) {
          const isDongtan = checkIfDongtan(title, dept);
          if (isDongtan) {
            const absoluteUrl = link.startsWith('http') ? link : `https://www.hscity.go.kr${link}`;
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
      console.error(`      ⚠️ Source 1 page ${page} 실패:`, err.message);
    }
  }

  // --- Source 3: 철도사업 추진현황 (BBS 1131) ---
  console.log('   Source 3 (철도사업 추진현황) 크롤링 중...');
  for (const page of pages) {
    const url = `${SOURCE_3_RAIL_URL}&q_currPage=${page}`;
    try {
      const res = await fetchWithTimeout(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      if (!res.ok) continue;

      const arrayBuffer = await res.arrayBuffer();
      const decoder = new TextDecoder('utf-8');
      const decodedHtml = decoder.decode(arrayBuffer);
      const $ = cheerio.load(decodedHtml);
      const rows = $('table').first().find('tr');
      if (rows.length === 0) continue;

      // 동적 헤더 파싱
      const headers = [];
      rows.first().find('th, td').each((_, el) => {
        headers.push($(el).text().trim().replace(/\s+/g, ''));
      });
      const titleIdx = headers.findIndex(h => h.includes('제목'));
      const deptIdx = headers.findIndex(h => h.includes('부서') || h.includes('작성자') || h.includes('기관'));
      const dateIdx = headers.findIndex(h => h.includes('등록') || h.includes('작성일') || h.includes('일자'));

      rows.each((idx, tr) => {
        if (idx === 0) return;
        const tds = $(tr).find('td');
        if (tds.length <= Math.max(titleIdx, deptIdx, dateIdx)) return;

        const originalId = $(tds[0]).text().trim();
        const titleEl = $(tds[titleIdx]);
        const title = titleEl.text().trim().replace(/\s+/g, ' ');
        const link = (titleEl.find('a').attr('href') || '').trim();
        const dept = $(tds[deptIdx]).text().trim();
        const date = $(tds[dateIdx]).text().trim();

        if (originalId && title && link) {
          const isDongtan = checkIfDongtan(title, dept);
          if (isDongtan) {
            const absoluteUrl = link.startsWith('http') ? link : `https://www.hscity.go.kr${link}`;
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
      console.error(`      ⚠️ Source 3 page ${page} 실패:`, err.message);
    }
  }

  // --- Source 5: 동탄트램 추진현황 (BBS 1154) ---
  console.log('   Source 5 (동탄트램 추진현황) 크롤링 중...');
  for (const page of pages) {
    const url = `${SOURCE_5_TRAM_URL}&q_currPage=${page}`;
    try {
      const res = await fetchWithTimeout(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      if (!res.ok) continue;

      const arrayBuffer = await res.arrayBuffer();
      const decoder = new TextDecoder('utf-8');
      const decodedHtml = decoder.decode(arrayBuffer);
      const $ = cheerio.load(decodedHtml);
      const rows = $('table').first().find('tr');
      if (rows.length === 0) continue;

      // 동적 헤더 파싱
      const headers = [];
      rows.first().find('th, td').each((_, el) => {
        headers.push($(el).text().trim().replace(/\s+/g, ''));
      });
      const titleIdx = headers.findIndex(h => h.includes('제목'));
      const deptIdx = headers.findIndex(h => h.includes('부서') || h.includes('작성자') || h.includes('기관'));
      const dateIdx = headers.findIndex(h => h.includes('등록') || h.includes('작성일') || h.includes('일자'));

      rows.each((idx, tr) => {
        if (idx === 0) return;
        const tds = $(tr).find('td');
        if (tds.length <= Math.max(titleIdx, deptIdx, dateIdx)) return;

        const originalId = $(tds[0]).text().trim();
        const titleEl = $(tds[titleIdx]);
        const title = titleEl.text().trim().replace(/\s+/g, ' ');
        const link = (titleEl.find('a').attr('href') || '').trim();
        const dept = $(tds[deptIdx]).text().trim();
        const date = $(tds[dateIdx]).text().trim();

        if (originalId && title && link) {
          const isDongtan = checkIfDongtan(title, dept);
          if (isDongtan) {
            const absoluteUrl = link.startsWith('http') ? link : `https://www.hscity.go.kr${link}`;
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
      console.error(`      ⚠️ Source 5 page ${page} 실패:`, err.message);
    }
  }

  // --- Source 4: 동탄구청 동별 공지사항 (동탄1동 ~ 동탄9동) ---
  console.log('   Source 4 (동탄 1~9동 공지사항) 크롤링 중...');
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
          }
        });
        if (!res.ok) continue;

        const arrayBuffer = await res.arrayBuffer();
        const decoder = new TextDecoder('utf-8');
        const decodedHtml = decoder.decode(arrayBuffer);
        const $ = cheerio.load(decodedHtml);
        const rows = $('table').first().find('tr');
        if (rows.length === 0) continue;

        // 동적 헤더 파싱
        const headers = [];
        rows.first().find('th, td').each((_, el) => {
          headers.push($(el).text().trim().replace(/\s+/g, ''));
        });
        const titleIdx = headers.findIndex(h => h.includes('제목'));
        const deptIdx = headers.findIndex(h => h.includes('부서') || h.includes('작성자') || h.includes('기관'));
        const dateIdx = headers.findIndex(h => h.includes('등록') || h.includes('작성일') || h.includes('일자'));

        rows.each((idx, tr) => {
          if (idx === 0) return;
          const tds = $(tr).find('td');
          if (tds.length <= Math.max(titleIdx, deptIdx, dateIdx)) return;

          const originalId = $(tds[0]).text().trim();
          const titleEl = $(tds[titleIdx]);
          const title = titleEl.text().trim().replace(/\s+/g, ' ');
          const link = (titleEl.find('a').attr('href') || '').trim();
          const dept = $(tds[deptIdx]).text().trim();
          const date = $(tds[dateIdx]).text().trim();

          if (originalId && title && link) {
            const isDongtan = checkIfDongtan(title, dept);
            if (isDongtan) {
              const absoluteUrl = link.startsWith('http') ? link : `https://www.hscity.go.kr${link}`;
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
        console.error(`      ⚠️ Source 4 (${deptItem.name}) page ${page} 실패:`, err.message);
      }
    }
  }

  // --- Source 2: 화성시 공식 고시공고 (Gosi BD_notice) ---
  console.log('   Source 2 (화성시 고시공고) 크롤링 중...');
  for (const page of pages) {
    const url = `${SOURCE_2_GOSI_URL}?q_currPage=${page}&q_cp=${page}`;
    try {
      const res = await fetchWithTimeout(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      if (!res.ok) continue;

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
      console.error(`      ⚠️ Source 2 page ${page} 실패:`, err.message);
    }
  }

  // 3. Batch save to Firestore
  if (notices.length === 0) {
    console.log('⏭️ 수집된 새 소식이 없습니다.');
    process.exit(0);
  }

  // Zod validation filter
  const validNotices = [];
  for (const rawNotice of notices) {
    const parsed = NoticeSchema.safeParse(rawNotice);
    if (parsed.success) {
      validNotices.push(parsed.data);
    } else {
      console.warn(`⚠️ [Fetch Notices] Skipping invalid notice payload (id: ${rawNotice.id}):`, parsed.error.format());
    }
  }

  if (validNotices.length === 0) {
    console.log('⏭️ 유효한 새 소식이 없습니다 (Zod 검증 탈락).');
    process.exit(0);
  }

  console.log(`💾 Firestore에 수집된 ${validNotices.length}건 저장 중...`);
  const collRef = db.collection('local_notices');
  let written = 0;

  for (let i = 0; i < validNotices.length; i += 500) {
    const chunk = validNotices.slice(i, i + 500);
    const batch = db.batch();
    
    for (const item of chunk) {
      const docRef = collRef.doc(item.id);
      batch.set(docRef, item, { merge: true });
      written++;
    }
    
    await batch.commit();
  }

  console.log(`✅ Firestore 저장 완료: ${written}건`);

  // 4. Invalidate Redis Cache
  if (redis) {
    try {
      await Promise.all([
        redis.del('DTDLS:cache:localNotices:filterDongtan:true'),
        redis.del('DTDLS:cache:localNotices:filterDongtan:false')
      ]);
      console.log('⚡ Redis localNotices 캐시 무효화 완료.');
    } catch (err) {
      console.warn('⚠️ Redis 캐시 무효화 실패:', err.message);
    }
  }

  process.exit(0);
}

main().catch(err => {
  console.error('❌ 크롤러 동기화 실패:', err.message);
  process.exit(1);
});
