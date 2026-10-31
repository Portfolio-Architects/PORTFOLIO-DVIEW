/**
 * @module searchConsoleCtr
 * @description Domain service for parsing Google Search Console query exports,
 * fetching live query performance rows, classifying zero-click / low-CTR opportunities,
 * and mapping queries to actionable D-VIEW route & metadata optimizations.
 */
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import {
  fetchSearchConsoleQueryRows,
  type GscQueryFetchResult,
  type RawGscQueryRow,
} from '@/lib/repositories/searchConsole.repository';
import { GUIDE_ARTICLES, normalizeGuideAptName } from '@/lib/data/guides';

export const GscQueryMetricSchema = z.object({
  query: z.string().trim().min(1),
  page: z.string().trim().min(1).optional(),
  clicks: z.number().int().nonnegative(),
  impressions: z.number().int().nonnegative(),
  ctr: z.number().min(0).max(100),
  position: z.number().nonnegative(),
});

export type GscQueryMetric = z.infer<typeof GscQueryMetricSchema>;

export type CtrOpportunityBucket =
  | 'ZERO_CLICK_IMPRESSION'
  | 'LOW_CTR_PAGE_1'
  | 'STRIKING_DISTANCE_PAGE_2'
  | 'DEEP_RANKING'
  | 'HEALTHY_PERFORMER';

export interface CtrOpportunityItem extends GscQueryMetric {
  bucket: CtrOpportunityBucket;
  expectedCtr: number;
  ctrGap: number;
  opportunityScore: number;
  targetRoute: string;
  recommendedAction: string;
}

export interface CtrOpportunityReport {
  totalQueries: number;
  totalClicks: number;
  totalImpressions: number;
  overallCtr: number;
  zeroClickOpportunities: CtrOpportunityItem[];
  lowCtrPage1Opportunities: CtrOpportunityItem[];
  strikingDistanceOpportunities: CtrOpportunityItem[];
  allClassified: CtrOpportunityItem[];
}

/**
 * Expected Google SERP organic CTR (%) benchmark curve by average position.
 */
export function expectedCtrForPosition(position: number): number {
  if (!Number.isFinite(position) || position <= 0) return 2.0;
  if (position <= 1.5) return 25.0;
  if (position <= 2.5) return 14.0;
  if (position <= 3.5) return 9.5;
  if (position <= 5.5) return 6.0;
  if (position <= 8.5) return 3.5;
  if (position <= 10.5) return 2.2;
  if (position <= 20.5) return 1.0;
  return 0.5;
}

type GscDelimiter = ',' | '\t' | ';';

function detectDelimiter(headerLine: string): GscDelimiter {
  if (headerLine.includes('\t')) return '\t';
  let commaCount = 0;
  let semicolonCount = 0;
  let inQuotes = false;
  for (let i = 0; i < headerLine.length; i++) {
    const ch = headerLine[i];
    if (ch === '"') {
      if (inQuotes && headerLine[i + 1] === '"') {
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (!inQuotes) {
      if (ch === ',') commaCount++;
      else if (ch === ';') semicolonCount++;
    }
  }
  return semicolonCount >= 2 && semicolonCount > commaCount ? ';' : ',';
}

function splitDelimitedLine(line: string, delimiter: GscDelimiter): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

function parseNumericCell(raw: string | undefined, delimiter: GscDelimiter = ','): number {
  if (!raw) return 0;
  let cleaned = raw.replace(/%/g, '').trim();
  if (delimiter === ';' && /^\d+,\d{1,2}$/.test(cleaned)) {
    cleaned = cleaned.replace(',', '.');
  } else {
    cleaned = cleaned.replace(/,/g, '');
  }
  const num = Number(cleaned);
  return Number.isFinite(num) && num >= 0 ? num : 0;
}

/**
 * Parses Google Search Console Queries CSV (comma or semicolon, Korean or English headers) or UI-copied TSV text.
 */
export function parseGscQueriesInput(rawText: string): GscQueryMetric[] {
  if (!rawText || typeof rawText !== 'string') return [];

  const cleanedText = rawText.replace(/^\uFEFF/, '').trim();
  if (!cleanedText) return [];

  const lines = cleanedText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) return [];

  const delimiter = detectDelimiter(lines[0]);
  const firstCells = splitDelimitedLine(lines[0], delimiter);
  const normalizedHeader = firstCells.map((c) => c.toLowerCase().replace(/\s+/g, ''));

  const isHeaderRow = normalizedHeader.some((h) =>
    [
      '인기검색어',
      '검색어',
      'topqueries',
      'query',
      'queries',
      '인기페이지',
      '페이지',
      '상위페이지',
      'toppages',
      'pages',
      '클릭수',
      'clicks',
      '노출수',
      'impressions',
    ].includes(h)
  );

  let queryIdx = isHeaderRow ? -1 : 0;
  let pageIdx = -1;
  let clicksIdx = 1;
  let impressionsIdx = 2;
  let ctrIdx = 3;
  let positionIdx = 4;

  if (isHeaderRow) {
    normalizedHeader.forEach((col, idx) => {
      if (['인기검색어', '검색어', 'topqueries', 'query', 'queries'].includes(col)) queryIdx = idx;
      else if (['인기페이지', '페이지', '상위페이지', 'page', 'pages', 'toppages', 'url'].includes(col)) pageIdx = idx;
      else if (['클릭수', '클릭', 'clicks'].includes(col)) clicksIdx = idx;
      else if (['노출수', '노출', 'impressions'].includes(col)) impressionsIdx = idx;
      else if (['ctr', '클릭률'].includes(col)) ctrIdx = idx;
      else if (['게재순위', '평균게재순위', 'position', 'averageposition'].includes(col)) positionIdx = idx;
    });

    if (queryIdx < 0) {
      if (pageIdx >= 0) {
        queryIdx = pageIdx;
      } else {
        return [];
      }
    }
  }

  const dataLines = isHeaderRow ? lines.slice(1) : lines;
  const results: GscQueryMetric[] = [];

  for (const line of dataLines) {
    const cells = splitDelimitedLine(line, delimiter);
    if (cells.length < 3) continue;

    const query = (cells[queryIdx] || '').trim();
    if (!query) continue;

    const pageVal = pageIdx >= 0 ? (cells[pageIdx] || '').trim() : '';
    const clicks = Math.round(parseNumericCell(cells[clicksIdx], delimiter));
    const impressions = Math.max(clicks, Math.round(parseNumericCell(cells[impressionsIdx], delimiter)));
    const rawCtrStr = (cells[ctrIdx] || '').trim();
    const expectedComputedCtr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    let ctr = rawCtrStr ? parseNumericCell(rawCtrStr, delimiter) : expectedComputedCtr;

    // Detect raw decimal ratio exports (e.g. 0.0588 instead of 5.88%) when '%' is absent
    if (
      rawCtrStr &&
      !rawCtrStr.includes('%') &&
      ctr > 0 &&
      ctr <= 1 &&
      clicks > 0 &&
      impressions > 0 &&
      Math.abs(ctr * 100 - expectedComputedCtr) < Math.abs(ctr - expectedComputedCtr)
    ) {
      ctr = ctr * 100;
    }

    if (ctr > 100) ctr = 100;
    ctr = parseFloat(ctr.toFixed(2));
    const position = parseFloat(parseNumericCell(cells[positionIdx], delimiter).toFixed(1));

    const parsed = GscQueryMetricSchema.safeParse({
      query,
      ...(pageVal ? { page: pageVal } : {}),
      clicks,
      impressions,
      ctr,
      position,
    });
    if (parsed.success) {
      results.push(parsed.data);
    }
  }

  return results;
}

function normalizeLookupKey(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '').replace(/아파트$/g, '');
}

function stripQueryIntentSuffixes(normQuery: string): string {
  let current = normQuery;
  const suffixPattern =
    /(?:[0-9]+평형?|[0-9]+㎡|실거래가|실거래|매매가|매매|전세가율|전세가|전월세|전세|월세|시세|평당가|분양가|학군|초품아|호재|임장|분석|리포트|가격|추천|순위|랭킹|비교|차이|맞대결|아파트)+$/g;
  for (let i = 0; i < 3; i++) {
    const next = current.replace(suffixPattern, '');
    if (next === current || next.length < 2) break;
    current = next;
  }
  return current;
}

function decodeUriPathSafely(rawPath: string): string {
  let current = rawPath;
  for (let i = 0; i < 3; i++) {
    try {
      const next = decodeURIComponent(current);
      if (next === current) break;
      current = next;
    } catch {
      break;
    }
  }
  return current;
}

const BROAD_REGIONAL_QUERY_TOKENS = new Set([
  '동탄',
  '동탄역',
  '동탄1',
  '동탄2',
  '1동탄',
  '2동탄',
  '동탄1신도시',
  '동탄2신도시',
  '1신도시',
  '2신도시',
  '호수공원',
  '동탄호수공원',
  '시범단지',
  '동탄시범단지',
  '동탄역시범단지',
  '커뮤니티시범단지',
  '테크노밸리',
  '동탄테크노밸리',
  '광비콤',
  '광역비즈니스콤플렉스',
  '문화디자인밸리',
  '워터프론트콤플렉스',
  '신주거문화타운',
  '동탄신주거문화타운',
  '여울동',
  '청계동',
  '반송동',
  '능동',
  '목동',
  '산척동',
  '송동',
  '오산동',
  '영천동',
  '장지동',
  '신동',
  '석우동',
  '북동탄',
  '중동탄',
  '남동탄',
  '서동탄',
  '디뷰',
  '동뷰',
  '동탄뷰',
  'd-view',
  'dview',
]);

function hasStandaloneSongdong(qLower: string): boolean {
  return qLower.replace(/반송동/g, '').includes('송동');
}

function hasStandaloneSindong(qLower: string): boolean {
  return qLower.replace(/신동탄|신동아|한신동/g, '').includes('신동');
}

function hasComparisonSignal(qLower: string): boolean {
  return (
    qLower.includes('vs') ||
    qLower.includes('비교') ||
    qLower.includes('차이') ||
    qLower.includes('맞대결')
  );
}

function matchTopicGuideAction(
  qLower: string,
  options?: { allowGenericComparisonFallback?: boolean }
): { targetRoute: string; recommendedAction: string } | null {
  const allowGenericComparisonFallback = options?.allowGenericComparisonFallback ?? true;
  const isComp = hasComparisonSignal(qLower);

  const hasExplicitB2bSignal =
    qLower.includes('지식산업센터') ||
    qLower.includes('지산') ||
    qLower.includes('섹션오피스') ||
    qLower.includes('기업 리스트') ||
    qLower.includes('기업리스트') ||
    (qLower.includes('테크노밸리') &&
      (qLower.includes('법인') ||
        qLower.includes('사무실') ||
        qLower.includes('오피스') ||
        qLower.includes('입주기업'))) ||
    (!qLower.includes('아파트') && qLower.includes('법인'));

  const hasResidentialOrCommuterOnTechno =
    qLower.includes('아파트') ||
    qLower.includes('전세') ||
    qLower.includes('매매') ||
    qLower.includes('학군') ||
    qLower.includes('초품아') ||
    qLower.includes('직주근접') ||
    qLower.includes('출퇴근') ||
    qLower.includes('통근') ||
    qLower.includes('북동탄') ||
    qLower.includes('중동탄') ||
    isComp;

  if (hasExplicitB2bSignal || (qLower.includes('테크노밸리') && !hasResidentialOrCommuterOnTechno)) {
    return {
      targetRoute: '/technovalley',
      recommendedAction: '동탄테크노밸리 56개 지식산업센터 세제 혜택(취득세·재산세 35% 감면) 및 실거래 스펙 타이틀 훅 강화',
    };
  }
  if (
    qLower.includes('1신도시') ||
    qLower.includes('2신도시') ||
    qLower.includes('동탄1') ||
    qLower.includes('동탄2') ||
    qLower.includes('1동탄') ||
    qLower.includes('2동탄')
  ) {
    return {
      targetRoute: '/guide/dongtan-1-vs-2-comparison',
      recommendedAction: '1동탄 vs 2동탄 차이(동탄1신도시·동탄2신도시) 대표 대장 단지 1:1 실거래 비교표 및 FAQ 스니펫 강화',
    };
  }
  if (qLower.includes('호수공원') || hasStandaloneSongdong(qLower) || qLower.includes('산척동') || qLower.includes('레이크')) {
    return {
      targetRoute: '/guide/dongtan-lake-vs-station-comparison',
      recommendedAction: '동탄역 vs 동탄호수공원 실거래가·전세가율 1:1 맞대결 표 및 FAQ 리치 스니펫 보강',
    };
  }
  if (
    qLower.includes('주상복합') ||
    qLower.includes('4대장') ||
    (qLower.includes('광비콤') && (qLower.includes('시범') || isComp)) ||
    (qLower.includes('여울동') && (qLower.includes('청계동') || isComp)) ||
    ((qLower.includes('시범단지') || (qLower.includes('동탄역') && qLower.includes('시범'))) && isComp) ||
    (qLower.includes('롯데캐슬') &&
      (qLower.includes('더샵센트럴') || qLower.includes('시범단지') || qLower.includes('동탄역 시범') || qLower.includes('동탄역시범'))) ||
    (qLower.includes('예미지시그너스') && qLower.includes('리슈빌'))
  ) {
    return {
      targetRoute: '/guide/dongtan-station-gbcx-vs-sibeom-comparison',
      recommendedAction: '동탄역 광비콤 주상복합(여울동) vs 청계동 시범단지 4대장 실거래가·용적률·초품아 1:1 비교표 및 FAQ 스니펫 강화',
    };
  }
  if (
    qLower.includes('직주근접') ||
    qLower.includes('삼성전자') ||
    qLower.includes('삼성반도체') ||
    qLower.includes('기흥캠퍼스') ||
    qLower.includes('화성캠퍼스') ||
    qLower.includes('나노시티') ||
    qLower.includes('11자상가') ||
    qLower.includes('북동탄') ||
    qLower.includes('중동탄') ||
    qLower.includes('석우동') ||
    ((qLower.includes('출퇴근') || qLower.includes('통근')) &&
      (qLower.includes('삼성') ||
        qLower.includes('기흥') ||
        qLower.includes('화성') ||
        qLower.includes('반도체') ||
        qLower.includes('판교') ||
        qLower.includes('강남') ||
        qLower.includes('테크노밸리'))) ||
    (qLower.includes('테크노밸리') && (qLower.includes('출퇴근') || qLower.includes('통근') || isComp)) ||
    (qLower.includes('영천동') && (qLower.includes('목동') || qLower.includes('능동') || qLower.includes('석우동') || isComp)) ||
    (qLower.includes('힐스테이트동탄') && (qLower.includes('푸르지오') || qLower.includes('포레너스') || isComp)) ||
    (qLower.includes('포레너스') && qLower.includes('우미린'))
  ) {
    return {
      targetRoute: '/guide/dongtan-job-proximity-commuter-comparison',
      recommendedAction: '북동탄(영천동) vs 중동탄(목동) vs 삼성반도체·동인선 축(석우·능동) 직주근접 실거래가·전세가율 1:1 맞대결 및 FAQ 강화',
    };
  }
  if (qLower.includes('학군') || qLower.includes('초품아') || qLower.includes('학원가') || qLower.includes('중학교') || qLower.includes('초등학교')) {
    return {
      targetRoute: '/guide/dongtan-school-zone-top-apartments',
      recommendedAction: '동탄 학군지 TOP 4(청계 시범·솔빛·나루·호수 에듀타운) 배정 학교 및 실거래가 비교 타이틀·FAQ 강화',
    };
  }
  if (/[0-9]+억/.test(qLower) || qLower.includes('예산') || qLower.includes('대장') || qLower.includes('순위') || qLower.includes('랭킹') || qLower.includes('갈아타기')) {
    return {
      targetRoute: '/guide/dongtan-budget-tier-ranking',
      recommendedAction: '예산 구간별(6억·9억·12억대) 실거래 랭킹 타이틀 숫자 훅 및 단지 비교표 강화',
    };
  }
  if (qLower.includes('gtx') || qLower.includes('트램') || qLower.includes('동인선') || qLower.includes('인덕원선')) {
    return {
      targetRoute: '/guide/gtx-a-tram-rail-network',
      recommendedAction: 'GTX-A 수서 20분·동탄 트램 1·2호선 정거장 반경 수혜 단지 비교 메타 및 FAQ 보강',
    };
  }
  if (qLower.includes('dsr') || qLower.includes('대출') || qLower.includes('주담대') || qLower.includes('역전세') || qLower.includes('전세가율') || qLower.includes('per')) {
    return {
      targetRoute: '/guide/stress-dsr-valuation-guide',
      recommendedAction: '스트레스 DSR 40% 한도 축소액 및 실거주 PER 저평가 단지 선별 표·FAQ 스니펫 강화',
    };
  }
  if (allowGenericComparisonFallback && isComp) {
    return {
      targetRoute: '/guide/dongtan-1-vs-2-comparison',
      recommendedAction: '1동탄 vs 2동탄 차이(동탄1신도시·동탄2신도시) 대표 대장 단지 1:1 실거래 비교표 및 FAQ 스니펫 강화',
    };
  }
  return null;
}

function extractNonOverlappingMatchedApartments(
  qNorm: string,
  aptEntries: Array<{ aptKey: string; aptNorm: string }>
): string[] {
  const occurrences: Array<{ aptKey: string; aptNorm: string; start: number; end: number }> = [];
  for (const { aptKey, aptNorm } of aptEntries) {
    if (aptNorm.length < 4) continue;
    let searchFrom = 0;
    while (searchFrom <= qNorm.length - aptNorm.length) {
      const idx = qNorm.indexOf(aptNorm, searchFrom);
      if (idx === -1) break;
      occurrences.push({ aptKey, aptNorm, start: idx, end: idx + aptNorm.length });
      searchFrom = idx + 1;
    }
  }

  occurrences.sort((a, b) => {
    const lenDiff = b.end - b.start - (a.end - a.start);
    if (lenDiff !== 0) return lenDiff;
    return a.start - b.start;
  });

  const accepted: Array<{ aptKey: string; start: number; end: number }> = [];
  const acceptedKeys = new Set<string>();
  for (const occ of occurrences) {
    if (acceptedKeys.has(occ.aptKey)) continue;
    const overlaps = accepted.some((s) => occ.start < s.end && occ.end > s.start);
    if (!overlaps) {
      accepted.push({ aptKey: occ.aptKey, start: occ.start, end: occ.end });
      acceptedKeys.add(occ.aptKey);
    }
  }

  accepted.sort((a, b) => a.start - b.start);
  return accepted.map((a) => a.aptKey);
}

function resolveBestGuideForApartments(
  qNorm: string,
  qLower: string,
  matchedAptKeys: string[]
): { targetRoute: string; recommendedAction: string } {
  const specificTopic = matchTopicGuideAction(qLower, { allowGenericComparisonFallback: false });
  const matchedNorms = matchedAptKeys.map((k) => normalizeGuideAptName(k)).filter(Boolean);
  const matchedNormSet = new Set(matchedNorms);

  const guideAptMatchesQuery = (guideAptKey: string): boolean => {
    const gNorm = normalizeGuideAptName(guideAptKey);
    if (!gNorm) return false;
    if (matchedNormSet.has(gNorm)) return true;

    if (gNorm.length >= 7) {
      if (!gNorm.startsWith('동탄역') && !gNorm.startsWith('동탄2')) {
        const prefix6 = gNorm.slice(0, 6);
        if (
          qNorm.includes(prefix6) &&
          !matchedNorms.some((m) => m.includes(prefix6) || prefix6.includes(m))
        ) {
          return true;
        }
      }
      const suffix5 = gNorm.slice(-5);
      if (
        suffix5.length === 5 &&
        !/^[0-9.a-z-]+$/.test(suffix5) &&
        qNorm.includes(suffix5) &&
        !matchedNorms.some((m) => m.includes(suffix5))
      ) {
        return true;
      }
    }
    return false;
  };

  let bestSlug: string | null = null;
  let bestScore = 0;

  for (const article of GUIDE_ARTICLES) {
    let score = 0;
    const h2hPairs = article.headToHeadComparisons || [];
    const h2hKeys = h2hPairs.flatMap((m) => [m.leftApt, m.rightApt]);
    const featuredKeys = article.featuredApartments || [];

    const hasExactPair = h2hPairs.some(
      (m) =>
        m.leftApt !== m.rightApt &&
        guideAptMatchesQuery(m.leftApt) &&
        guideAptMatchesQuery(m.rightApt)
    );
    if (hasExactPair) {
      score += 140;
    }

    const uniqueH2hMatched = new Set(
      h2hKeys.filter((k) => guideAptMatchesQuery(k)).map((k) => normalizeGuideAptName(k))
    );
    const uniqueAllMatched = new Set(
      [...h2hKeys, ...featuredKeys]
        .filter((k) => guideAptMatchesQuery(k))
        .map((k) => normalizeGuideAptName(k))
    );

    score += uniqueH2hMatched.size * 45;
    score += uniqueAllMatched.size * 25;

    if (specificTopic?.targetRoute === `/guide/${article.slug}`) {
      score += 90;
    }

    if (score > bestScore) {
      bestScore = score;
      bestSlug = article.slug;
    }
  }

  const label = matchedAptKeys.join(' vs ');
  if (bestSlug && bestScore > 0) {
    return {
      targetRoute: `/guide/${bestSlug}`,
      recommendedAction: `'${label}' 포함 단지 1:1 실거래가·전세가율 맞대결 비교 섹션 및 내부 링크 보강`,
    };
  }

  if (specificTopic) {
    return specificTopic;
  }

  return {
    targetRoute: '/guide/dongtan-1-vs-2-comparison',
    recommendedAction: `'${label}' 포함 단지 1:1 실거래가·전세가율 맞대결 비교 섹션 및 내부 링크 보강`,
  };
}

let cachedVerifiedJisanNames: string[] | null = null;

function getDefaultVerifiedJisanNames(): string[] {
  if (cachedVerifiedJisanNames) return cachedVerifiedJisanNames;
  try {
    const candidates = [
      path.join(process.cwd(), 'public', 'data', 'jisan-status-list.json'),
      path.join(process.cwd(), 'frontend', 'public', 'data', 'jisan-status-list.json'),
    ];
    for (const filePath of candidates) {
      if (fs.existsSync(filePath)) {
        const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Array<{ name?: string }>;
        if (Array.isArray(parsed)) {
          cachedVerifiedJisanNames = parsed
            .map((item) => (typeof item?.name === 'string' ? item.name.trim() : ''))
            .filter(Boolean);
          return cachedVerifiedJisanNames;
        }
      }
    }
  } catch {
    // Graceful fallback when filesystem is unavailable
  }
  cachedVerifiedJisanNames = [];
  return cachedVerifiedJisanNames;
}

function normalizeJisanPhoneticSearchKey(input: string): string {
  return input
    .replace(/[\u2162\u2172]/g, '3')
    .replace(/[\u2161\u2171]/g, '2')
    .replace(/[\u2160\u2170]/g, '1')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/지식산업센터/g, '')
    .replace(/주식회사|\(주\)/g, '')
    .replace(/타임스퀘어/g, 'timesquare')
    .replace(/스퀘어/g, 'square')
    .replace(/타워/g, 'tower')
    .replace(/센터/g, 'center')
    .replace(/아이티/g, 'it')
    .replace(/쓰리/g, '3')
    .replace(/투$/g, '2')
    .replace(/[^a-z0-9가-힣]/g, '')
    .replace(/iii$/g, '3')
    .replace(/ii$/g, '2')
    .replace(/(square|tower|center)i$/g, '$11');
}

function stripJisanSearchIntentSuffixes(raw: string): string {
  let current = raw.trim();
  const suffixPattern =
    /(?:\s*(?:지식산업센터|지산|입주\s*가능\s*업종|입주\s*업종|입주업종|세제\s*감면|세제\s*혜택|취득세|재산세|법인세|감면|연면적|호실수|호실|분양가|분양|임대료|임대|공실률|공실|매매|시세|실거래가|주소|위치|스펙))+$/gi;
  for (let i = 0; i < 3; i++) {
    const next = current.replace(suffixPattern, '').trim();
    if (next === current || next.length < 2) break;
    current = next;
  }
  return current;
}

function resolveVerifiedJisanParamName(rawParam: string, jisanNames: string[]): string | null {
  if (!rawParam || jisanNames.length === 0) return null;
  const decoded = decodeUriPathSafely(rawParam).trim();
  if (!decoded || decoded.length > 200) return null;

  const exact = jisanNames.find((n) => n === decoded);
  if (exact) return exact;

  const normalizeCompact = (s: string) =>
    s
      .replace(/[\u2162\u2172]/g, '3')
      .replace(/[\u2161\u2171]/g, '2')
      .replace(/[\u2160\u2170]/g, '1')
      .normalize('NFKC')
      .toLowerCase()
      .replace(/\s+/g, '');

  const qCompact = normalizeCompact(decoded);
  if (!qCompact) return null;

  const compactMatch = jisanNames.find((n) => normalizeCompact(n) === qCompact);
  if (compactMatch) return compactMatch;

  const stripSuffix = (s: string) => s.replace(/지식산업센터$/g, '');
  const qStripped = stripSuffix(qCompact);
  if (qStripped.length >= 2) {
    const strippedMatches = jisanNames.filter((n) => stripSuffix(normalizeCompact(n)) === qStripped);
    if (strippedMatches.length === 1) return strippedMatches[0];

    const qPhonetic = normalizeJisanPhoneticSearchKey(decoded);
    if (qPhonetic.length >= 2) {
      const phoneticMatches = jisanNames.filter(
        (n) => normalizeJisanPhoneticSearchKey(n) === qPhonetic
      );
      if (phoneticMatches.length === 1) return phoneticMatches[0];
    }
  }
  return null;
}

function stripLeadingDongtanRegion(phoneticKey: string): string {
  return phoneticKey.replace(/^(?:신동탄|동탄역|동탄2|동탄)/, '');
}

const GENERIC_JISAN_HUB_PHONETIC_KEYS = new Set([
  '동탄',
  '동탄2',
  '동탄역',
  '신동탄',
  '병점',
  '화성',
  '동탄테크노밸리',
  '테크노밸리',
  '동탄기업리스트',
  '기업리스트',
  '동탄오피스',
  '동탄사무실',
  '동탄법인',
]);

function matchVerifiedJisanFromQuery(rawQuery: string, jisanNames: string[]): string | null {
  if (!rawQuery || jisanNames.length === 0) return null;
  const qLower = rawQuery.toLowerCase().trim();
  if (qLower.includes('아파트')) return null;

  const strippedQuery = stripJisanSearchIntentSuffixes(rawQuery);
  const qPhoneticFull = normalizeJisanPhoneticSearchKey(rawQuery);
  const qPhoneticCore = normalizeJisanPhoneticSearchKey(strippedQuery);
  if (!qPhoneticCore || qPhoneticCore.length < 3) return null;
  if (
    GENERIC_JISAN_HUB_PHONETIC_KEYS.has(qPhoneticFull) ||
    GENERIC_JISAN_HUB_PHONETIC_KEYS.has(qPhoneticCore)
  ) {
    return null;
  }

  const entries = jisanNames
    .map((name) => {
      const phonetic = normalizeJisanPhoneticSearchKey(name);
      return {
        name,
        phonetic,
        withoutRegion: stripLeadingDongtanRegion(phonetic),
      };
    })
    .filter((e) => e.phonetic.length >= 3);

  // 1. Exact phonetic match on full query or intent-stripped core
  const exact = entries.find(
    (e) => e.phonetic === qPhoneticFull || e.phonetic === qPhoneticCore
  );
  if (exact) return exact.name;

  // 2. Exact match on region-stripped building core (e.g. '금강펜테리움 ix타워' -> '동탄금강펜테리움 IX타워', 'g타워' with 동탄 stripped >= 5 chars)
  const qWithoutRegion = stripLeadingDongtanRegion(qPhoneticCore);
  if (qWithoutRegion.length >= 5) {
    const regionStrippedMatches = entries.filter((e) => e.withoutRegion === qWithoutRegion);
    if (regionStrippedMatches.length === 1) return regionStrippedMatches[0].name;
  }

  // 3. Query contains full center phonetic name (prefer longest center name first to disambiguate 더퍼스트타워쓰리 vs 더퍼스트타워)
  const sortedByLen = [...entries].sort((a, b) => b.phonetic.length - a.phonetic.length);
  for (const entry of sortedByLen) {
    if (
      entry.phonetic.length >= 4 &&
      (qPhoneticFull.includes(entry.phonetic) || qPhoneticCore.includes(entry.phonetic))
    ) {
      return entry.name;
    }
  }

  // 4. Unambiguous distinctive building token match (e.g. '동탄 sk v1' -> '동탄 SK V1 center', '현대 실리콘앨리' -> '현대 실리콘앨리 동탄')
  if (qPhoneticCore.length >= 5 && !qPhoneticCore.includes('센트럴파크')) {
    const uniqueSubMatches = entries.filter(
      (e) =>
        e.phonetic.includes(qPhoneticCore) ||
        (qWithoutRegion.length >= 5 && e.withoutRegion.includes(qWithoutRegion))
    );
    if (uniqueSubMatches.length === 1) {
      return uniqueSubMatches[0].name;
    }
  }

  return null;
}

function doesQueryReferToJisan(rawQuery: string, canonicalJisanName: string): boolean {
  const qPhonetic = normalizeJisanPhoneticSearchKey(stripJisanSearchIntentSuffixes(rawQuery));
  if (!qPhonetic || qPhonetic.length < 3) return false;
  if (GENERIC_JISAN_HUB_PHONETIC_KEYS.has(qPhonetic)) return false;

  const jPhonetic = normalizeJisanPhoneticSearchKey(canonicalJisanName);
  const jCore = stripLeadingDongtanRegion(jPhonetic);
  const qCore = stripLeadingDongtanRegion(qPhonetic);

  if (qPhonetic === jPhonetic) return true;
  if (jPhonetic.length >= 4 && qPhonetic.includes(jPhonetic)) return true;
  if (qCore.length >= 3 && jCore.length >= 3 && (jCore.includes(qCore) || qCore.includes(jCore))) {
    return true;
  }
  return false;
}

/**
 * Recommends the most relevant D-VIEW target route and CTR optimization action for a search query.
 */
export function recommendDviewSeoAction(
  row: Pick<GscQueryMetric, 'query' | 'page' | 'clicks' | 'impressions' | 'ctr' | 'position'>,
  knownApartmentKeys: string[] = [],
  knownJisanNames?: string[]
): { targetRoute: string; recommendedAction: string } {
  const qLower = row.query.toLowerCase().trim();
  const qNorm = normalizeLookupKey(row.query);
  const qCoreNorm = stripQueryIntentSuffixes(qNorm);
  const isComparisonQuery = hasComparisonSignal(qLower);
  const isRankingOrRecQuery =
    qLower.includes('추천') || qLower.includes('순위') || qLower.includes('랭킹');
  const isBroadDiscoveryQuery = isComparisonQuery || isRankingOrRecQuery;
  const verifiedJisanNames = knownJisanNames ?? getDefaultVerifiedJisanNames();

  if (row.page) {
    try {
      const parsedUrl = new URL(row.page, 'https://dongtanview.com');
      if (parsedUrl.pathname && parsedUrl.pathname !== '/') {
        const decodedPath = decodeUriPathSafely(parsedUrl.pathname).replace(/\/+$/, '') || '/';
        if (decodedPath.startsWith('/apartment/')) {
          return {
            targetRoute: decodedPath,
            recommendedAction:
              row.clicks === 0
                ? '단지 상세 타이틀에 최신 실거래가(억)·평형·전세가율 수치를 전면 배치하고 자연어 띄어쓰기 별칭을 디스크립션에 보강'
                : '단지 상세 메타 디스크립션 첫 110자 내 평형별 실거래가·배정 초등학교·동탄역 거리를 압축 노출',
          };
        }
        if (decodedPath === '/guide' || decodedPath.startsWith('/guide/')) {
          return {
            targetRoute: decodedPath,
            recommendedAction:
              '비교 가이드에 단지 1:1 실거래 맞대결(Head-to-Head) 표 및 FAQPage 리치 스니펫 스키마를 강화하여 SERP 점유 면적 확대',
          };
        }
        if (decodedPath.startsWith('/zone/')) {
          return {
            targetRoute: decodedPath,
            recommendedAction:
              '권역 상세 메타 타이틀에 법정동·행정동 병기 및 권역 대장 단지 최근 실거래가 수치를 전면 노출',
          };
        }
        if (decodedPath === '/about') {
          return {
            targetRoute: '/about',
            recommendedAction:
              '소개 페이지 메타 타이틀에 한글 브랜드명(디뷰·동뷰·동탄뷰) 및 동탄 184개 아파트 실거래 시세·전세가율 핵심 가치를 명시',
          };
        }
        if (decodedPath.startsWith('/technovalley')) {
          const queryMatchedJisan = matchVerifiedJisanFromQuery(row.query, verifiedJisanNames);
          if (queryMatchedJisan) {
            return {
              targetRoute: `/technovalley?jisan=${queryMatchedJisan}`,
              recommendedAction: `'${queryMatchedJisan}' 개별 지식산업센터 동적 메타 타이틀에 연면적·제조·IT 입주 업종·취득세 35% 감면 스펙을 명시`,
            };
          }

          const rawJisan = parsedUrl.searchParams.get('jisan')?.trim();
          if (rawJisan) {
            const resolvedPageJisan = resolveVerifiedJisanParamName(rawJisan, verifiedJisanNames);
            if (resolvedPageJisan && doesQueryReferToJisan(row.query, resolvedPageJisan)) {
              return {
                targetRoute: `/technovalley?jisan=${resolvedPageJisan}`,
                recommendedAction: `'${resolvedPageJisan}' 개별 지식산업센터 동적 메타 타이틀에 연면적·제조·IT 입주 업종·취득세 35% 감면 스펙을 명시`,
              };
            }
          }
          return {
            targetRoute: '/technovalley',
            recommendedAction:
              '동탄테크노밸리 56개 지식산업센터 세제 혜택(취득세·재산세 35% 감면) 및 실거래 스펙 타이틀 훅 강화',
          };
        }
      }
    } catch {
      // fall through to keyword matching
    }
  }

  // Match against known 184 apartment names unless query is a broad regional or brand token
  if (knownApartmentKeys.length > 0 && qCoreNorm.length >= 3 && !BROAD_REGIONAL_QUERY_TOKENS.has(qCoreNorm)) {
    const qCoreWithoutDongtan = qCoreNorm.startsWith('동탄') ? qCoreNorm.slice(2) : '';
    const aptEntries = knownApartmentKeys
      .map((aptKey) => ({ aptKey, aptNorm: normalizeLookupKey(aptKey) }))
      .filter((e) => e.aptNorm.length >= 3);

    // 0. Multi-apartment head-to-head detection (2+ distinct non-overlapping complexes in one query, even without 'vs')
    const distinctMatchedApts = extractNonOverlappingMatchedApartments(qNorm, aptEntries);
    if (distinctMatchedApts.length >= 2) {
      return resolveBestGuideForApartments(qNorm, qLower, distinctMatchedApts);
    }

    // 1. Exact match on full normalized query or stripped core complex name
    const exactMatch =
      aptEntries.find((e) => e.aptNorm === qNorm || e.aptNorm === qCoreNorm) ||
      (!isBroadDiscoveryQuery && qCoreWithoutDongtan.length >= 4
        ? aptEntries.find((e) => e.aptNorm === qCoreWithoutDongtan)
        : undefined);

    let bestAptMatch: string | null = exactMatch ? exactMatch.aptKey : null;

    // 2. Query contains full apartment key (prefer longest/most-specific complex name, e.g. '동탄역롯데캐슬' over '롯데캐슬')
    if (!bestAptMatch && distinctMatchedApts.length === 1) {
      const candidateKey = distinctMatchedApts[0];
      const candidateNorm = normalizeLookupKey(candidateKey);
      const superstringCount =
        candidateNorm.length <= 4
          ? aptEntries.filter((other) => other.aptNorm.includes(candidateNorm)).length
          : 1;
      if (!(superstringCount > 1 && isRankingOrRecQuery)) {
        bestAptMatch = candidateKey;
      }
    }

    // 3. Unambiguous reverse substring match (only when >=5 core chars and uniquely matches exactly 1 complex)
    if (!bestAptMatch && qCoreNorm.length >= 5 && !isBroadDiscoveryQuery) {
      const reverseMatches = aptEntries.filter((e) => e.aptNorm.includes(qCoreNorm));
      if (reverseMatches.length === 1) {
        bestAptMatch = reverseMatches[0].aptKey;
      }
    }

    if (bestAptMatch) {
      if (isComparisonQuery) {
        return resolveBestGuideForApartments(qNorm, qLower, [bestAptMatch]);
      }
      return {
        targetRoute: `/apartment/${bestAptMatch}`,
        recommendedAction: `'${bestAptMatch}' 메타 타이틀에 국토부 최신 실거래가·전세가율·대표 평형을 명시하고 띄어쓰기 검색어 변형을 흡수`,
      };
    }
  }

  if (['디뷰', '동뷰', '동탄뷰', 'd-view', 'dview'].includes(qNorm)) {
    return {
      targetRoute: '/about',
      recommendedAction:
        '소개 페이지 메타 타이틀에 한글 브랜드명(디뷰·동뷰·동탄뷰) 및 동탄 184개 아파트 실거래 시세·전세가율 핵심 가치를 명시',
    };
  }

  // Match against verified 56 Knowledge Industry Centers even when GSC row lacks a page URL (e.g. Queries.csv)
  const matchedJisanWithoutPage = matchVerifiedJisanFromQuery(row.query, verifiedJisanNames);
  if (matchedJisanWithoutPage) {
    return {
      targetRoute: `/technovalley?jisan=${matchedJisanWithoutPage}`,
      recommendedAction: `'${matchedJisanWithoutPage}' 개별 지식산업센터 동적 메타 타이틀에 연면적·제조·IT 입주 업종·취득세 35% 감면 스펙을 명시`,
    };
  }

  const topicGuide = matchTopicGuideAction(qLower);
  if (topicGuide) {
    return topicGuide;
  }

  if (
    qLower.includes('집값 그래프') ||
    qLower.includes('집값그래프') ||
    qLower.includes('시세 그래프') ||
    qLower.includes('시세그래프') ||
    qLower.includes('추이 그래프') ||
    qLower.includes('추이그래프') ||
    qNorm === '동탄아파트시세' ||
    qNorm === '동탄집값' ||
    qNorm === '동탄시세'
  ) {
    return {
      targetRoute: '/',
      recommendedAction:
        '메인(/) 타이틀·디스크립션에 동탄 아파트 시세 및 집값 추이 그래프 키워드를 전면 배치하여 홈 노출 CTR 개선',
    };
  }

  if (qLower.includes('동탄역') || qLower.includes('여울동') || qLower.includes('오산동') || qLower.includes('광비콤') || qLower.includes('광역비즈니스')) {
    return {
      targetRoute: '/zone/gbcx',
      recommendedAction: '동탄역 광역비즈니스콤플렉스(여울동·오산동) 대장 단지 실거래가 및 역세권 비교 메타 강화',
    };
  }
  if (qLower.includes('청계동') || qLower.includes('시범단지') || qLower.includes('커뮤니티시범')) {
    return {
      targetRoute: '/zone/community',
      recommendedAction: '커뮤니티시범단지(청계동) 학군·학원가 및 대표 시범단지 실거래 비교 메타 강화',
    };
  }
  if (qLower.includes('영천동') || qLower.includes('테크노밸리')) {
    return {
      targetRoute: '/zone/techno',
      recommendedAction: '동탄테크노밸리(영천동) 직주근접 아파트 실거래가·전세가율 및 11자상가 인프라 비교 메타 강화',
    };
  }
  if (qLower.includes('반송동') || qLower.includes('능동') || qLower.includes('목동') || qLower.includes('메타폴리스')) {
    return {
      targetRoute: '/zone/metropolis',
      recommendedAction: '메타폴리스·솔빛·나루(반송동·능동·목동) 학군 및 대표 대단지 실거래 비교 메타 강화',
    };
  }
  if (qLower.includes('석우동') || qLower.includes('장지동') || qLower.includes('문화디자인밸리')) {
    return {
      targetRoute: '/zone/culture',
      recommendedAction: '문화디자인밸리·남동탄(석우동·장지동) 직주근접 및 대단지 실거래 비교 메타 강화',
    };
  }
  if (hasStandaloneSongdong(qLower) || qLower.includes('산척동') || qLower.includes('워터프론트')) {
    return {
      targetRoute: '/zone/waterfront',
      recommendedAction: '워터프론트콤플렉스(송동·산척동) 호수공원 조망권 단지 실거래가 및 전세가율 비교 메타 강화',
    };
  }
  if (hasStandaloneSindong(qLower) || qLower.includes('신주거문화타운')) {
    return {
      targetRoute: '/zone/newtown',
      recommendedAction: '신주거문화타운(신동) 최신축 입주 단지 분양권·실거래가 및 초품아 입지 메타 강화',
    };
  }

  return {
    targetRoute: '/explore',
    recommendedAction: '184개 단지 실거래가·평당가·전세가율 통합 비교표 타이틀 및 상단 요약 스니펫 보강',
  };
}

/**
 * Aggregates duplicate query rows and classifies them into actionable CTR opportunity buckets.
 */
export function classifyCtrOpportunities(
  rows: RawGscQueryRow[] | GscQueryMetric[],
  options?: {
    minImpressions?: number;
    knownApartmentKeys?: string[];
  }
): CtrOpportunityReport {
  const minImpressions = Math.max(1, options?.minImpressions ?? 2);
  const knownApartmentKeys = options?.knownApartmentKeys ?? [];

  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      totalQueries: 0,
      totalClicks: 0,
      totalImpressions: 0,
      overallCtr: 0,
      zeroClickOpportunities: [],
      lowCtrPage1Opportunities: [],
      strikingDistanceOpportunities: [],
      allClassified: [],
    };
  }

  // Aggregate by normalized query string while preserving primary highest-impression landing page
  const aggregatedMap = new Map<
    string,
    {
      displayQuery: string;
      topPage?: string;
      topPageImpressions: number;
      clicks: number;
      impressions: number;
      weightedPositionSum: number;
    }
  >();

  for (const r of rows) {
    const q = (r?.query || '').trim();
    if (!q) continue;
    const key = q.toLowerCase();
    const clicks = Math.max(0, Math.round(Number(r.clicks) || 0));
    const impressions = Math.max(clicks, Math.round(Number(r.impressions) || 0));
    const position = Math.max(0, Number(r.position) || 0);

    const existing = aggregatedMap.get(key);
    if (!existing) {
      aggregatedMap.set(key, {
        displayQuery: q,
        topPage: r.page,
        topPageImpressions: impressions,
        clicks,
        impressions,
        weightedPositionSum: position * Math.max(1, impressions),
      });
    } else {
      existing.clicks += clicks;
      existing.impressions += impressions;
      existing.weightedPositionSum += position * Math.max(1, impressions);
      if (r.page && (!existing.topPage || impressions > existing.topPageImpressions)) {
        existing.topPage = r.page;
        existing.topPageImpressions = impressions;
      }
    }
  }

  let totalClicks = 0;
  let totalImpressions = 0;
  const allClassified: CtrOpportunityItem[] = [];

  for (const entry of aggregatedMap.values()) {
    totalClicks += entry.clicks;
    totalImpressions += entry.impressions;

    const ctr =
      entry.impressions > 0
        ? parseFloat(((entry.clicks / entry.impressions) * 100).toFixed(2))
        : 0;
    const position =
      entry.impressions > 0
        ? parseFloat((entry.weightedPositionSum / entry.impressions).toFixed(1))
        : 0;

    const expectedCtr = expectedCtrForPosition(position);
    const ctrGap = parseFloat(Math.max(0, expectedCtr - ctr).toFixed(2));

    let bucket: CtrOpportunityBucket = 'HEALTHY_PERFORMER';
    if (entry.impressions >= minImpressions && entry.clicks === 0) {
      bucket = 'ZERO_CLICK_IMPRESSION';
    } else if (entry.impressions >= minImpressions && position > 0 && position <= 10.5 && ctr < expectedCtr) {
      bucket = 'LOW_CTR_PAGE_1';
    } else if (entry.impressions >= minImpressions && position > 10.5 && position <= 20.5) {
      bucket = 'STRIKING_DISTANCE_PAGE_2';
    } else if (position > 20.5) {
      bucket = 'DEEP_RANKING';
    }

    const zeroClickBoost = entry.clicks === 0 ? 1.35 : 1.0;
    const page1Boost = position > 0 && position <= 10.5 ? 1.5 : 1.0;
    const opportunityScore = parseFloat(
      (entry.impressions * Math.max(0.015, ctrGap / 100) * zeroClickBoost * page1Boost).toFixed(2)
    );

    const { targetRoute, recommendedAction } = recommendDviewSeoAction(
      {
        query: entry.displayQuery,
        page: entry.topPage,
        clicks: entry.clicks,
        impressions: entry.impressions,
        ctr,
        position,
      },
      knownApartmentKeys
    );

    allClassified.push({
      query: entry.displayQuery,
      ...(entry.topPage ? { page: entry.topPage } : {}),
      clicks: entry.clicks,
      impressions: entry.impressions,
      ctr,
      position,
      bucket,
      expectedCtr,
      ctrGap,
      opportunityScore,
      targetRoute,
      recommendedAction,
    });
  }

  allClassified.sort((a, b) => b.opportunityScore - a.opportunityScore || b.impressions - a.impressions);

  const overallCtr =
    totalImpressions > 0 ? parseFloat(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0;

  return {
    totalQueries: allClassified.length,
    totalClicks,
    totalImpressions,
    overallCtr,
    zeroClickOpportunities: allClassified.filter((i) => i.bucket === 'ZERO_CLICK_IMPRESSION'),
    lowCtrPage1Opportunities: allClassified.filter((i) => i.bucket === 'LOW_CTR_PAGE_1'),
    strikingDistanceOpportunities: allClassified.filter((i) => i.bucket === 'STRIKING_DISTANCE_PAGE_2'),
    allClassified,
  };
}

/**
 * Fetches live Google Search Console query performance and classifies CTR opportunities.
 * Queries single-dimension `['query']` first to avoid GSC multi-dimension privacy drops and sitelink
 * impression double-counting, then enriches each query with its highest-impression landing page.
 */
export async function analyzeLiveSearchConsoleCtr(options?: {
  days?: number;
  rowLimit?: number;
  minImpressions?: number;
  knownApartmentKeys?: string[];
}): Promise<{
  fetchStatus: GscQueryFetchResult;
  report: CtrOpportunityReport;
}> {
  const days = options?.days ?? 28;
  const rowLimit = options?.rowLimit ?? 250;

  const queryOnlyStatus = await fetchSearchConsoleQueryRows({
    days,
    rowLimit,
    includePageDimension: false,
  });

  if (!queryOnlyStatus.ok || queryOnlyStatus.rows.length === 0) {
    const emptyReport = classifyCtrOpportunities(queryOnlyStatus.rows, {
      minImpressions: options?.minImpressions ?? 1,
      knownApartmentKeys: options?.knownApartmentKeys ?? [],
    });
    return { fetchStatus: queryOnlyStatus, report: emptyReport };
  }

  let mergedRows: RawGscQueryRow[] = queryOnlyStatus.rows;

  try {
    const queryPageStatus = await fetchSearchConsoleQueryRows({
      days,
      rowLimit: Math.min(5000, rowLimit * 2),
      includePageDimension: true,
      siteProperty: queryOnlyStatus.siteProperty,
    });

    if (queryPageStatus.ok && queryPageStatus.rows.length > 0) {
      const topPageByQuery = new Map<string, { page: string; impressions: number }>();
      for (const pairRow of queryPageStatus.rows) {
        if (!pairRow.page) continue;
        const qKey = pairRow.query.trim().toLowerCase();
        const prev = topPageByQuery.get(qKey);
        if (!prev || pairRow.impressions > prev.impressions) {
          topPageByQuery.set(qKey, { page: pairRow.page, impressions: pairRow.impressions });
        }
      }

      mergedRows = queryOnlyStatus.rows.map((r) => {
        const matchedPage = topPageByQuery.get(r.query.trim().toLowerCase())?.page;
        return matchedPage && !r.page ? { ...r, page: matchedPage } : r;
      });
    }
  } catch {
    // Keep queryOnlyStatus.rows if secondary page-enrichment query fails
  }

  const fetchStatus: GscQueryFetchResult = {
    ...queryOnlyStatus,
    rows: mergedRows,
  };

  const report = classifyCtrOpportunities(mergedRows, {
    minImpressions: options?.minImpressions ?? 1,
    knownApartmentKeys: options?.knownApartmentKeys ?? [],
  });

  return { fetchStatus, report };
}
