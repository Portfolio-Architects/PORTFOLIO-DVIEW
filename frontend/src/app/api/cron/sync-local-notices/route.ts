import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { adminDb as db } from '@/lib/firebaseAdmin';
import { redis } from '@/lib/redis';
import { sendMail } from '@/lib/utils/server/mailService';
import { TX_SUMMARY, AptTxSummary } from '@/lib/transaction-summary';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';
import { rateLimiter } from '@/lib/rate-limit';

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
  content?: string; // AI 분석 본문 마크다운 (신설)
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

function generateAIReports(txSummary: Record<string, AptTxSummary>): NoticeItem[] {
  const events: NoticeItem[] = [];
  const nowStr = new Date().toISOString();
  const todayDateStr = new Date().toISOString().substring(0, 10);

  // 1. 주거 안심 & 전세가율 안정 단지 TOP 3 추출 연산
  const candidates: { name: string; gap: number; jeonseRatio: number; price: number; rent: number; dong: string }[] = [];
  
  for (const [rawAptName, sum] of Object.entries(txSummary)) {
    const sale = sum.avg3MPrice || sum.latestPrice || 0;
    const rent = sum.avg3MRentDeposit || sum.latestRentDeposit || 0;
    const dong = sum.dong || '동탄동';
    
    if (sale > 30000 && rent > 0) { // 3억 초과 정상단지 대상
      const gap = sale - rent;
      const ratio = Math.round((rent / sale) * 100);
      if (gap > 0 && ratio >= 70) { // 전세가율 70% 이상
        candidates.push({ name: rawAptName, gap, jeonseRatio: ratio, price: sale, rent, dong });
      }
    }
  }

  // 갭 금액이 가장 적고 전세가율이 높은 순으로 정렬
  candidates.sort((a, b) => {
    if (a.gap !== b.gap) return a.gap - b.gap;
    return b.jeonseRatio - a.jeonseRatio;
  });

  const top3 = candidates.slice(0, 3);
  
  // 1-1. 주거 안심 및 전세율 분석 리포트 본문 작성
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
    title: `[AI 주거시황] 동탄2신도시 전세가율 안정 단지 및 안심 주거 TOP 3 분석`,
    url: 'https://dongtanview.com/',
    dept: 'AI 데이터 랩',
    date: todayDateStr,
    isDongtan: true,
    source: 'bbs', // '동탄구 소식' -> '화성시 소식' 탭에 렌더링되도록
    createdAt: nowStr,
    content: gapMarkdown
  });

  // 2. 고비율 전세가율 역전세 리스크 진단 리포트
  const riskCandidates = candidates.filter(c => c.jeonseRatio >= 80).slice(0, 3);
  let riskMarkdown = `### 🚨 동탄 아파트 전세가율 80% 돌파 단지 역전세 위험 진단\n\n`;
  riskMarkdown += `최근 전세 가격 하방 지지력이 튼튼한 반면 매매 가격 조정으로 인해 전세가율이 **80% 이상**으로 높게 형성된 단지가 일부 나타나고 있습니다. 전세보증금 미반환 리스크를 최소화하기 위해 세입자 및 임차인이 반드시 확인해야 할 주택 리포트입니다.\n\n`;
  
  if (riskCandidates.length > 0) {
    riskCandidates.forEach((item) => {
      const priceEok = (item.price / 10000).toFixed(1);
      const rentEok = (item.rent / 10000).toFixed(1);
      riskMarkdown += `#### **• ${item.name} (${item.dong})**\n`;
      riskMarkdown += `- **전세가율**: **${item.jeonseRatio}%** (매매 ${priceEok}억 / 전세 ${rentEok}억)\n`;
      riskMarkdown += `- **진단 의견**: 매매 가격과 전세 가격의 갭이 ${Math.round(item.gap / 1000) / 10}천만 원 수준으로 좁혀져 있습니다. 임대차 계약 갱신 시점 혹은 매도 시점에 역전세가 발생할 우려가 있으므로 **HUG 보증보험 가입 여부**를 사전에 반드시 체크하시기 바랍니다.\n\n`;
    });
  } else {
    riskMarkdown += `현재 동탄 주요 단지 중 전세가율 80%를 넘어서는 역전세 우려 단지는 실거래가 통계상 검출되지 않았으며, 평균 62% ~ 70% 선의 안정적인 비율을 유지 중입니다.\n\n`;
  }
  
  riskMarkdown += `---\n\n`;
  riskMarkdown += `> 🔒 **보증금 보호 세무 가이드**\n`;
  riskMarkdown += `> 임차보증금이 매매 시세의 70%를 상회할 경우 보증보험 승인 한도를 미리 확인해야 하며, 양도소득세 비과세 가이드와 맞물려 임대인의 주택 매도 계획을 사전에 확인하는 것이 안전합니다.\n\n`;
  riskMarkdown += `[➔ 내 아파트 지금 팔면 호구일까? AI 매도 진단기 실행하기](/#lounge-notices-culture)`;

  events.push({
    id: `ai_report_ltv_risk_${todayDateStr.replace(/-/g, '')}`,
    originalId: `ai_ltv_${todayDateStr.replace(/-/g, '')}`,
    title: `[AI 리스크] 동탄 아파트 전세가율 80% 돌파 단지 역전세 경보 진단`,
    url: 'https://dongtanview.com/',
    dept: 'AI 데이터 랩',
    date: todayDateStr,
    isDongtan: true,
    source: 'bbs',
    createdAt: nowStr,
    content: riskMarkdown
  });

  return events;
}

function checkIfDongtan(title: string, dept: string): boolean {
  const t = title || '';
  const d = dept || '';
  return DONGTAN_KEYWORDS.some(k => t.includes(k) || d.includes(k));
}

const syncLocalNoticesQuerySchema = z.object({
  full: z.string().optional().transform(v => v === 'true'),
});

const noticeItemSchema = z.object({
  id: z.string(),
  originalId: z.string(),
  title: z.string(),
  url: z.string().url(),
  dept: z.string(),
  date: z.string(),
  isDongtan: z.boolean(),
  source: z.enum(['bbs', 'gosi', 'rail', 'dong', 'culture']),
  createdAt: z.string(),
  content: z.string().optional(),
});

const authHeaderSchema = z.string().refine(
  (val) => {
    const secret = process.env.CRON_SECRET;
    if (!secret || secret.trim() === '') return false;
    return val === `Bearer ${secret}`;
  },
  { message: 'Invalid or unconfigured authorization token' }
);

export async function GET(request: NextRequest) {
  const scrapeErrors: string[] = [];
  try {
    if (rateLimiter) {
      const forwarded = request.headers.get('x-forwarded-for');
      const realIp = request.headers.get('x-real-ip');
      const rawIp = realIp || forwarded?.split(',')[0]?.trim() || '127.0.0.1';
      const { success } = await rateLimiter.limit(`ratelimit_cron_synclocalnotices_get_${rawIp}`);
      if (!success) {
        logger.warn('SyncLocalNoticesAPI.GET', 'Rate limit exceeded', { ip: rawIp });
        return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
      }
    }

    // 개발 모드에서 WAF 차단 방지 (쿨타임)
    if (process.env.NODE_ENV === 'development') {
      const now = Date.now();
      if (now - lastSyncExecutionTime < DEV_SYNC_COOLDOWN_MS) {
        logger.warn('SyncLocalNoticesAPI.GET', 'Dev mode execution throttled to prevent target WAF IP block', {});
        return NextResponse.json({ 
          status: 'skipped', 
          message: 'Sync throttled in dev mode to protect target IP block. Cooldown: 30s.' 
        });
      }
      lastSyncExecutionTime = now;
    }

    // 1. Authorization check
    if (process.env.NODE_ENV !== 'development') {
      const authHeader = request.headers.get('authorization') || '';
      const authResult = authHeaderSchema.safeParse(authHeader);
      if (!authResult.success) {
        logger.warn('SyncLocalNoticesAPI.GET', 'Unauthorized access attempt', {
          authHeader: authHeader ? 'Present' : 'Missing',
          error: authResult.error.message,
        });
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    if (!db) {
      logger.error('SyncLocalNoticesAPI.GET', 'Firebase DB not initialized', {});
      return NextResponse.json({ error: 'Firebase DB not initialized' }, { status: 500 });
    }

    // 2. Fetch pages
    const { searchParams } = request.nextUrl;
    const parsedQuery = syncLocalNoticesQuerySchema.safeParse({
      full: searchParams.get('full'),
    });

    if (!parsedQuery.success) {
      logger.warn('SyncLocalNoticesAPI.GET', 'Invalid query parameters', { errors: parsedQuery.error.format() });
      return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
    }

    const { full: isFull } = parsedQuery.data;
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
          const errMsg = `Failed to fetch Source 1 board page ${page}: HTTP ${res.status}`;
          logger.error('SyncLocalNoticesAPI.GET', errMsg, { status: res.status });
          scrapeErrors.push(errMsg);
          continue;
        }

        const arrayBuffer = await res.arrayBuffer();
        const decoder = new TextDecoder('utf-8');
        const decodedHtml = decoder.decode(arrayBuffer);
        const $ = cheerio.load(decodedHtml);
        const rows = $('table').first().find('tr');

        rows.each((idx, tr) => {
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

              const item = {
                id: `bbs_${originalId}`,
                originalId,
                title,
                url: absoluteUrl,
                dept,
                date,
                isDongtan: true,
                source: 'bbs' as const,
                createdAt: new Date().toISOString()
              };

              const parsedItem = noticeItemSchema.safeParse(item);
              if (parsedItem.success) {
                notices.push(parsedItem.data);
              } else {
                logger.warn('SyncLocalNoticesAPI.GET', 'Invalid scraped notice item (Source 1)', { errors: parsedItem.error.format() });
              }
            }
          }
        });
      } catch (err) {
        const errMsg = `Error scraping Source 1 page ${page}: ${(err as Error).message}`;
        logger.error('SyncLocalNoticesAPI.GET', errMsg, {}, err as Error);
        scrapeErrors.push(errMsg);
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
          const errMsg = `Failed to fetch Source 3 board page ${page}: HTTP ${res.status}`;
          logger.error('SyncLocalNoticesAPI.GET', errMsg, { status: res.status });
          scrapeErrors.push(errMsg);
          continue;
        }

        const arrayBuffer = await res.arrayBuffer();
        const decoder = new TextDecoder('utf-8');
        const decodedHtml = decoder.decode(arrayBuffer);
        const $ = cheerio.load(decodedHtml);
        const rows = $('table').first().find('tr');

        rows.each((idx, tr) => {
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

              const item = {
                id: `rail_${originalId}`,
                originalId,
                title,
                url: absoluteUrl,
                dept,
                date,
                isDongtan: true,
                source: 'rail' as const,
                createdAt: new Date().toISOString()
              };

              const parsedItem = noticeItemSchema.safeParse(item);
              if (parsedItem.success) {
                notices.push(parsedItem.data);
              } else {
                logger.warn('SyncLocalNoticesAPI.GET', 'Invalid scraped notice item (Source 3)', { errors: parsedItem.error.format() });
              }
            }
          }
        });
      } catch (err) {
        const errMsg = `Error scraping Source 3 page ${page}: ${(err as Error).message}`;
        logger.error('SyncLocalNoticesAPI.GET', errMsg, {}, err as Error);
        scrapeErrors.push(errMsg);
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
          const errMsg = `Failed to fetch Source 5 (Tram) board page ${page}: HTTP ${res.status}`;
          logger.error('SyncLocalNoticesAPI.GET', errMsg, { status: res.status });
          scrapeErrors.push(errMsg);
          continue;
        }

        const arrayBuffer = await res.arrayBuffer();
        const decoder = new TextDecoder('utf-8');
        const decodedHtml = decoder.decode(arrayBuffer);
        const $ = cheerio.load(decodedHtml);
        const rows = $('table').first().find('tr');

        rows.each((idx, tr) => {
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

              const item = {
                id: `rail_1154_${originalId}`,
                originalId,
                title,
                url: absoluteUrl,
                dept,
                date,
                isDongtan: true,
                source: 'rail' as const,
                createdAt: new Date().toISOString()
              };

              const parsedItem = noticeItemSchema.safeParse(item);
              if (parsedItem.success) {
                notices.push(parsedItem.data);
              } else {
                logger.warn('SyncLocalNoticesAPI.GET', 'Invalid scraped notice item (Source 5)', { errors: parsedItem.error.format() });
              }
            }
          }
        });
      } catch (err) {
        const errMsg = `Error scraping Source 5 (Tram) page ${page}: ${(err as Error).message}`;
        logger.error('SyncLocalNoticesAPI.GET', errMsg, {}, err as Error);
        scrapeErrors.push(errMsg);
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
            const errMsg = `Failed to fetch Source 4 board page ${page} for ${deptItem.name}: HTTP ${res.status}`;
            logger.error('SyncLocalNoticesAPI.GET', errMsg, { status: res.status });
            scrapeErrors.push(errMsg);
            continue;
          }

          const arrayBuffer = await res.arrayBuffer();
          const decoder = new TextDecoder('utf-8');
          const decodedHtml = decoder.decode(arrayBuffer);
          const $ = cheerio.load(decodedHtml);
          const rows = $('table').first().find('tr');

          rows.each((idx, tr) => {
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

                const item = {
                  id: `dong_${deptItem.code}_${originalId}`,
                  originalId,
                  title,
                  url: absoluteUrl,
                  dept,
                  date,
                  isDongtan: true,
                  source: 'dong' as const,
                  createdAt: new Date().toISOString()
                };

                const parsedItem = noticeItemSchema.safeParse(item);
                if (parsedItem.success) {
                  notices.push(parsedItem.data);
                } else {
                  logger.warn('SyncLocalNoticesAPI.GET', 'Invalid scraped notice item (Source 4)', { errors: parsedItem.error.format() });
                }
              }
            }
          });
        } catch (err) {
          const errMsg = `Error scraping Source 4 page ${page} for ${deptItem.name}: ${(err as Error).message}`;
          logger.error('SyncLocalNoticesAPI.GET', errMsg, {}, err as Error);
          scrapeErrors.push(errMsg);
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
          const errMsg = `Failed to fetch Source 2 board page ${page}: HTTP ${res.status}`;
          logger.error('SyncLocalNoticesAPI.GET', errMsg, { status: res.status });
          scrapeErrors.push(errMsg);
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

              const item = {
                id: `gosi_${originalId}`,
                originalId,
                title,
                url: absoluteUrl,
                dept,
                date,
                isDongtan: true,
                source: 'gosi' as const,
                createdAt: new Date().toISOString()
              };

              const parsedItem = noticeItemSchema.safeParse(item);
              if (parsedItem.success) {
                notices.push(parsedItem.data);
              } else {
                logger.warn('SyncLocalNoticesAPI.GET', 'Invalid scraped notice item (Source 2)', { errors: parsedItem.error.format() });
              }
            }
          }
        });
      } catch (err) {
        const errMsg = `Error scraping Source 2 page ${page}: ${(err as Error).message}`;
        logger.error('SyncLocalNoticesAPI.GET', errMsg, {}, err as Error);
        scrapeErrors.push(errMsg);
      }
    }

    // --- Source 6: 동탄 하이퍼로컬 문화/행사/축제 생성 및 적재 ---
    const cultureEvents = generateCultureEvents();
    cultureEvents.forEach((item) => {
      const parsedItem = noticeItemSchema.safeParse(item);
      if (parsedItem.success) {
        notices.push(parsedItem.data);
      } else {
        logger.warn('SyncLocalNoticesAPI.GET', 'Invalid culture event notice item', { errors: parsedItem.error.format() });
      }
    });

    // --- Source 7: AI 부동산 시황 & 주거 안심 리포트 생성 및 적재 ---
    const aiReports = generateAIReports(TX_SUMMARY);
    aiReports.forEach((item) => {
      const parsedItem = noticeItemSchema.safeParse(item);
      if (parsedItem.success) {
        notices.push(parsedItem.data);
      } else {
        logger.warn('SyncLocalNoticesAPI.GET', 'Invalid AI report notice item', { errors: parsedItem.error.format() });
      }
    });

    if (notices.length === 0) {
      return NextResponse.json({ success: true, count: 0, message: 'No notices scraped' });
    }

    // 3. Batch save to Firestore in chunks of 500
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
        logger.info('SyncLocalNoticesAPI.GET', 'Redis localNotices cache invalidated successfully', {});
      } catch (err) {
        logger.warn('SyncLocalNoticesAPI.GET', 'Redis cache invalidation error', {}, err as Error);
      }
    }

    // 스크래핑 오류가 있을 경우 관리자 이메일 발송
    if (scrapeErrors.length > 0) {
      try {
        await sendMail({
          to: process.env.ADMIN_EMAIL || 'admin@dongtanview.com',
          subject: `🚨 [D-VIEW] 하이퍼로컬 공지사항 동기화 스크래핑 장애 경보 (${scrapeErrors.length}건 발생)`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #f9fafb; color: #1e293b; line-height: 1.6;">
              <div style="background-color: #ffffff; padding: 40px; border-radius: 24px; border: 1px solid #f1f5f9; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                <h2 style="font-size: 19px; font-weight: 900; color: #dc2626; margin-top: 0; margin-bottom: 8px;">
                  🚨 공지사항 동기화 외부 크롤링 장애 감지
                </h2>
                <p style="font-size: 13px; color: #64748b; margin-bottom: 24px;">
                  화성시청 웹사이트 등 하이퍼로컬 소스 스크래핑 과정에서 오류가 검출되었습니다.
                </p>
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; margin-bottom: 24px; font-family: monospace; font-size: 12px; color: #334155; max-height: 250px; overflow-y: auto;">
                  ${scrapeErrors.map(err => `• ${err}`).join('<br />')}
                </div>
                <p style="font-size: 12px; color: #94a3b8; line-height: 1.5;">
                  타깃 사이트의 WAF 차단 정책 변화, 혹은 웹사이트 마크업 변경 여부를 점검하시기 바랍니다.
                </p>
              </div>
            </div>
          `
        });
      } catch (mailErr) {
        logger.error('SyncLocalNoticesAPI.GET', 'Failed to send scraping error email notification', {}, mailErr as Error);
      }
    }

    return NextResponse.json({
      success: true,
      scrapedCount: notices.length,
      writtenCount: written,
      notices: notices.slice(0, 5),
      errorCount: scrapeErrors.length
    });

  } catch (error: unknown) {
    logger.error('SyncLocalNoticesAPI.GET', 'Error syncing local notices', {}, error as Error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
