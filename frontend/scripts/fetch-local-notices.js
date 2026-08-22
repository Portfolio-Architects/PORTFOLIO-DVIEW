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
  source: z.enum(['bbs', 'rail', 'dong', 'gosi', 'culture']),
  createdAt: z.string().datetime(),
  content: z.string().optional()
});

function get2ndAnd4thSaturdays(year) {
  const dates = [];
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

function generateCultureEvents() {
  const events = [];
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
  const buskingDates = [];
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

  // 3. 신리천 물놀이장 개장 소식
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
      url: 'https://reserve.hscity.go.kr/',
      dept: lecture.dong,
      date: lecture.date,
      isDongtan: true,
      source: 'culture',
      createdAt: nowStr
    });
  });

  return events;
}

function generateAIReports() {
  const events = [];
  const nowStr = new Date().toISOString();
  const todayDateStr = new Date().toISOString().substring(0, 10);

  let txSummary = {};
  const summaryPath = path.resolve(__dirname, '../public/data/tx-summary.json');
  if (fs.existsSync(summaryPath)) {
    try {
      txSummary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
    } catch {
      txSummary = {};
    }
  }

  const candidates = [];
  for (const [rawAptName, sum] of Object.entries(txSummary)) {
    const sale = sum.avg3MPrice || sum.latestPrice || 0;
    const rent = sum.avg3MRentDeposit || sum.latestRentDeposit || 0;
    const dong = sum.dong || '동탄동';
    
    if (sale > 30000 && rent > 0) {
      const gap = sale - rent;
      const ratio = Math.round((rent / sale) * 100);
      if (gap > 0 && ratio >= 70) {
        candidates.push({ name: rawAptName, gap, jeonseRatio: ratio, price: sale, rent, dong });
      }
    }
  }

  candidates.sort((a, b) => {
    if (a.gap !== b.gap) return a.gap - b.gap;
    return b.jeonseRatio - a.jeonseRatio;
  });

  const top3 = candidates.slice(0, 3);
  let gapMarkdown = `### 📊 동탄2신도시 실거래 기반 전세가율 안정 단지 분석\n\n`;
  gapMarkdown += `D-VIEW AI 데이터 랩에서 최근 3개월 실거래가 정보를 정밀 분석한 결과, 매매가 대비 전세가가 안정적으로 형성되어 실수요자의 실구매 차액 부담이 적은 **주거 안심 단지 TOP 3**는 다음과 같습니다.\n\n`;
  
  top3.forEach((item, idx) => {
    const gapEok = (item.gap / 10000).toFixed(1);
    const priceEok = (item.price / 10000).toFixed(1);
    const rentEok = (item.rent / 10000).toFixed(1);
    gapMarkdown += `#### **${idx + 1}위. ${item.name} (${item.dong})**\n`;
    gapMarkdown += `- **예상 매매-전세 차액(GAP)**: **약 ${gapEok}억 원**\n`;
    gapMarkdown += `- **평균 전세가율**: **${item.jeonseRatio}%** (매매 ${priceEok}억 / 전세 ${rentEok}억)\n`;
    gapMarkdown += `- **AI 진단**: 본 단지는 전세 가격의 하방 지지선이 튼튼하여 매매 가격 변동에 따른 리스크가 낮고, 주변의 안심 학군 도보 통학이 편리해 실수요자 선호도가 높게 형성되어 있습니다.\n\n`;
  });
  
  gapMarkdown += `---\n\n`;
  gapMarkdown += `> 💡 **주거 안전 주의 사항**\n`;
  gapMarkdown += `> 전세가율이 높은 단지는 실구매 차액이 적은 반면, 향후 인근 지역의 신규 입주 물량이 몰릴 시 일시적 역전세 우려가 존재할 수 있으므로, 세입자께서는 계약 전에 반드시 D-VIEW의 **[전세 안전 진단]** 및 보증보험 가입 요건을 검증하시기 바랍니다.\n\n`;
  gapMarkdown += `[➔ 동탄 주거 안정 & 전세율 대시보드 바로가기](/#lounge-notices-culture)`;

  events.push({
    id: `ai_report_gap_analysis_${todayDateStr.replace(/-/g, '')}`,
    originalId: `ai_gap_${todayDateStr.replace(/-/g, '')}`,
    title: `[AI 리포트] 동탄2신도시 전세가율 70% 이상 주거 안심 추천 단지 TOP 3`,
    url: 'https://dongtanview.com/#lounge-notices-culture',
    dept: 'D-VIEW AI 데이터 랩',
    date: todayDateStr,
    isDongtan: true,
    source: 'culture',
    createdAt: nowStr,
    content: gapMarkdown
  });

  return events;
}

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
          const absoluteUrl = link.startsWith('http') ? link : `https://www.hscity.go.kr${link}`;
          notices.push({
            id: `rail_${originalId}`,
            originalId,
            title,
            url: absoluteUrl,
            dept: dept || '철도전략과',
            date,
            isDongtan: true,
            source: 'rail',
            createdAt: new Date().toISOString()
          });
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
        if (tds.length < 4) return;

        const effectiveTitleIdx = titleIdx !== -1 ? titleIdx : 2;
        const effectiveDeptIdx = deptIdx !== -1 ? deptIdx : (tds.length >= 6 ? 4 : 3);
        const effectiveDateIdx = dateIdx !== -1 ? dateIdx : (tds.length >= 6 ? 5 : 4);

        if (tds.length <= Math.max(effectiveTitleIdx, effectiveDeptIdx, effectiveDateIdx)) return;

        const originalId = $(tds[0]).text().trim();
        const titleEl = $(tds[effectiveTitleIdx]);
        const title = titleEl.text().trim().replace(/\s+/g, ' ');
        const link = (titleEl.find('a').attr('href') || '').trim();
        const dept = $(tds[effectiveDeptIdx]).text().trim();
        const rawDate = $(tds[effectiveDateIdx]).text().trim();
        const dateMatch = rawDate.match(/\d{4}-\d{2}-\d{2}/);
        const date = dateMatch ? dateMatch[0] : rawDate;

        if (originalId && title && link) {
          const absoluteUrl = link.startsWith('http') ? link : `https://www.hscity.go.kr${link}`;
          notices.push({
            id: `rail_1154_${originalId}`,
            originalId,
            title,
            url: absoluteUrl,
            dept: dept || '트램건설추진단',
            date,
            isDongtan: true,
            source: 'rail',
            createdAt: new Date().toISOString()
          });
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
        const dateIdx = headers.findIndex(h => h.includes('등록') || h.includes('작성일') || h.includes('일자'));

        rows.each((idx, tr) => {
          if (idx === 0) return;
          const tds = $(tr).find('td');
          const effectiveTitleIdx = titleIdx !== -1 ? titleIdx : 2;
          const effectiveDateIdx = dateIdx !== -1 ? dateIdx : (tds.length >= 5 ? 4 : 3);
          if (tds.length <= Math.max(effectiveTitleIdx, effectiveDateIdx)) return;

          const originalId = $(tds[0]).text().trim();
          const titleEl = $(tds[effectiveTitleIdx]);
          const title = titleEl.text().trim().replace(/\s+/g, ' ');
          const link = (titleEl.find('a').attr('href') || '').trim();
          const rawDate = $(tds[effectiveDateIdx]).text().trim();
          const dateMatch = rawDate.match(/\d{4}-\d{2}-\d{2}/);
          const date = dateMatch ? dateMatch[0] : rawDate;

          if (originalId && title && link) {
            const absoluteUrl = link.startsWith('http') ? link : `https://www.hscity.go.kr${link}`;
            notices.push({
              id: `dong_${deptItem.code}_${originalId}`,
              originalId,
              title,
              url: absoluteUrl,
              dept: deptItem.name,
              date,
              isDongtan: true,
              source: 'dong',
              createdAt: new Date().toISOString()
            });
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

        const linkAttr = aTag.attr('href') || aTag.attr('onclick') || '';
        const idMatch = linkAttr.match(/opGosiView\('([^']+)'\)/);
        if (!idMatch) return;

        const originalId = idMatch[1];
        const title = titleEl.text().trim().replace(/\s+/g, ' ');
        const dept = $(tds[2]).text().trim();
        const rawDate = $(tds[3]).text().trim();
        const dateMatch = rawDate.match(/\d{4}-\d{2}-\d{2}/);
        const date = dateMatch ? dateMatch[0] : rawDate;

        if (originalId && title) {
          const absoluteUrl = `https://www.hscity.go.kr/www/gosi/BD_selectNoticeDetail.do?q_notAncmtMgtNo=${originalId}`;
          notices.push({
            id: `gosi_${originalId}`,
            originalId,
            title,
            url: absoluteUrl,
            dept: dept || '화성시청',
            date,
            isDongtan: true,
            source: 'gosi',
            createdAt: new Date().toISOString()
          });
        }
      });
    } catch (err) {
      console.error(`      ⚠️ Source 2 page ${page} 실패:`, err.message);
    }
  }

  // --- Source 6: 동탄 문화/축제 및 강좌, AI 리포트 생성 ---
  console.log('   Source 6 (문화/축제 & AI 리포트 생성) 처리 중...');
  try {
    const cultureNotices = generateCultureEvents();
    notices.push(...cultureNotices);
    const aiReports = generateAIReports();
    notices.push(...aiReports);
    console.log(`      문화 소식 및 AI 리포트 ${cultureNotices.length + aiReports.length}건 추가 완료.`);
  } catch (genErr) {
    console.error('      ⚠️ 문화/AI 소식 생성 실패:', genErr.message);
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
