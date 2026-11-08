/**
 * @module analyticsUtils
 * @description Pure domain calculation and analytics utilities for apartment pricing,
 * pyeong aggregations, AI briefings, and percentiles.
 * Architecture Layer: Domain Utilities (`src/lib/utils/`)
 */

import type { AptTxSummary } from '@/types/transaction';
import type { LocationScore } from '@/types/apartment';

export interface TransactionRecord {
  contractYm: string;
  contractDay: string | number;
  contractDate?: string;
  cancelDate?: string;
  price: number;
  priceEok?: string;
  deposit?: number;
  monthlyRent?: number;
  area: number;
  areaPyeong: number;
  floor: number;
  dealType: string;
}

export interface PyeongSummary {
  pyeong: number;
  areaM2: number;
  salesCount: number;
  rentCount: number;
  latestPrice: number;
  latestPriceStr: string;
  maxPrice: number;
  maxPriceStr: string;
  avgPrice: number;
  avgPriceStr: string;
  latestDeposit: number;
  latestDepositStr: string;
  avgDeposit: number;
  avgDepositStr: string;
  jeonseRatio: number;
  latestDealDate?: string;
  prevSalePrice?: number;
  priceDelta?: number;
  perPyeongPrice?: number;
}

export interface MolitLatestTradeSummary {
  latestDealDateStr: string | null;
  latestSalePriceManwon: number;
  latestSalePriceStr: string | null;
  latestPyeong: number | null;
  maxSalePriceManwon: number;
  maxSalePriceStr: string | null;
  priceDeltaManwon: number | null;
  priceDeltaStr: string | null;
  perPyeongManwon: number;
  perPyeongStr: string | null;
}

export interface PriceAnalytics {
  minSalePrice: number;
  maxSalePrice: number;
  salesVal: number;
  jeonseVal: number;
  ratioPercent: number;
  isHigh: boolean;
  statusStr: string;
  offers?: {
    '@type': string;
    priceCurrency: string;
    lowPrice: number;
    highPrice: number;
    offerCount: number;
  };
}

/**
 * URL 디코딩 방어 헬퍼 (반복 인코딩된 문자열 해제)
 */
export function decodeAptName(name: string): string {
  if (typeof name !== 'string') return '';
  let decoded = name;
  for (let i = 0; i < 3; i++) {
    if (!/%[0-9A-Fa-f]{2}/.test(decoded)) break;
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      break;
    }
  }
  return decoded.normalize('NFC');
}

/**
 * 만원 단위 숫자를 "X억 Y,YYY만" 형식의 한국어 가격 문자열로 포맷팅
 */
export function formatPriceEok(priceMan: number): string {
  if (!priceMan || isNaN(priceMan) || priceMan <= 0) return '0만';
  const eok = Math.floor(priceMan / 10000);
  const remainder = priceMan % 10000;
  if (eok === 0) return `${priceMan.toLocaleString()}만`;
  if (remainder === 0) return `${eok}억`;
  return `${eok}억 ${remainder.toLocaleString()}`;
}

function toSortableContractDateNum(tx: TransactionRecord): number {
  const ym = parseInt(String(tx.contractYm || 0), 10);
  const day = typeof tx.contractDay === 'number' ? tx.contractDay : parseInt(String(tx.contractDay || 0), 10);
  if (Number.isFinite(ym) && ym > 0) {
    return ym * 100 + (Number.isFinite(day) && day > 0 ? day : 0);
  }
  return 0;
}

function formatRawDateToDots(raw?: string | number | null): string | null {
  if (raw === undefined || raw === null) return null;
  const str = String(raw).trim();
  if (/^\d{8}$/.test(str)) {
    return `${str.slice(0, 4)}.${str.slice(4, 6)}.${str.slice(6, 8)}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str.replace(/-/g, '.');
  }
  if (/^\d{4}\.\d{2}\.\d{2}$/.test(str)) {
    return str;
  }
  return null;
}

function formatTxContractDate(tx?: TransactionRecord | null): string | null {
  if (!tx) return null;
  if (tx.contractDate) {
    const formatted = formatRawDateToDots(tx.contractDate);
    if (formatted) return formatted;
  }
  const ym = String(tx.contractYm || '').trim();
  const day = String(tx.contractDay ?? '').trim().padStart(2, '0');
  if (/^\d{6}$/.test(ym) && /^\d{2}$/.test(day) && day !== '00') {
    return `${ym.slice(0, 4)}.${ym.slice(4, 6)}.${day}`;
  }
  return null;
}

function isCancelledTx(tx?: TransactionRecord | null): boolean {
  if (!tx || !tx.cancelDate) return false;
  const trimmed = String(tx.cancelDate).trim();
  return trimmed.length > 0 && trimmed !== '-';
}

export function formatPriceDeltaManwon(deltaManwon: number | null | undefined): string | null {
  if (deltaManwon === null || deltaManwon === undefined || !Number.isFinite(deltaManwon)) {
    return null;
  }
  const rounded = Math.round(deltaManwon);
  if (rounded === 0) {
    return '보합(변동 없음)';
  }
  const absFormatted = formatPriceEok(Math.abs(rounded));
  if (absFormatted === '0만') {
    return '보합(변동 없음)';
  }
  return rounded > 0 ? `+${absFormatted} 상승` : `-${absFormatted} 하락`;
}

/**
 * 실거래가 레코드 목록을 평형별로 그룹화 및 통계 요약
 */
export function getPyeongSummaries(txs: TransactionRecord[]): PyeongSummary[] {
  if (!Array.isArray(txs) || txs.length === 0) return [];

  const groups: Record<number, TransactionRecord[]> = {};

  for (let i = 0; i < txs.length; i++) {
    const t = txs[i];
    if (isCancelledTx(t)) continue;
    const pyeong = Math.round(t.areaPyeong);
    if (!pyeong || pyeong <= 0) continue;
    let bucket = groups[pyeong];
    if (!bucket) {
      bucket = [];
      groups[pyeong] = bucket;
    }
    bucket.push(t);
  }

  const summaries: PyeongSummary[] = [];

  for (const [pyeongKey, groupTxs] of Object.entries(groups)) {
    const pyeong = parseInt(pyeongKey, 10);
    const sortedTxs = [...groupTxs].sort((a, b) => {
      const numDiff = toSortableContractDateNum(b) - toSortableContractDateNum(a);
      if (numDiff !== 0) return numDiff;
      const dateA = String(a.contractYm) + String(a.contractDay).padStart(2, '0');
      const dateB = String(b.contractYm) + String(b.contractDay).padStart(2, '0');
      return dateB.localeCompare(dateA);
    });

    let areaSum = 0;
    let salesCount = 0;
    let rentCount = 0;
    let latestSale: TransactionRecord | undefined;
    let prevSale: TransactionRecord | undefined;
    let latestJeonse: TransactionRecord | undefined;
    let maxPrice = 0;
    let salePriceSum = 0;
    let salePriceValidCount = 0;
    let jeonseDepositSum = 0;
    let jeonseDepositValidCount = 0;

    for (let i = 0; i < sortedTxs.length; i++) {
      const t = sortedTxs[i];
      areaSum += t.area || 0;
      if (t.dealType !== '전세' && t.dealType !== '월세') {
        salesCount++;
        const p = t.price || 0;
        if (!latestSale) {
          latestSale = t;
        } else if (!prevSale && p > 0 && !isCancelledTx(t)) {
          prevSale = t;
        }
        if (p > 0) {
          if (p > maxPrice) maxPrice = p;
          salePriceSum += p;
          salePriceValidCount++;
        }
      } else if (t.dealType === '전세' && (t.deposit || 0) > 0) {
        rentCount++;
        if (!latestJeonse) latestJeonse = t;
        const d = t.deposit || 0;
        if (d > 0) {
          jeonseDepositSum += d;
          jeonseDepositValidCount++;
        }
      }
    }

    if (salesCount === 0 && rentCount === 0) continue;

    const avgArea = areaSum / sortedTxs.length;
    const latestPrice = latestSale ? (latestSale.price || 0) : 0;
    const latestPriceStr = latestSale ? (latestSale.priceEok || formatPriceEok(latestPrice)) : '정보 없음';
    const maxPriceStr = maxPrice > 0 ? formatPriceEok(maxPrice) : '정보 없음';
    const avgPrice = salePriceValidCount > 0 ? Math.round(salePriceSum / salePriceValidCount) : 0;
    const avgPriceStr = avgPrice > 0 ? formatPriceEok(avgPrice) : '정보 없음';

    const latestDeposit = latestJeonse ? (latestJeonse.deposit || 0) : 0;
    const latestDepositStr = latestJeonse ? (latestJeonse.priceEok || formatPriceEok(latestDeposit)) : '정보 없음';
    const avgDeposit = jeonseDepositValidCount > 0 ? Math.round(jeonseDepositSum / jeonseDepositValidCount) : 0;
    const avgDepositStr = avgDeposit > 0 ? formatPriceEok(avgDeposit) : '정보 없음';

    let jeonseRatio = 0;
    if (avgDeposit > 0 && avgPrice > 0) {
      jeonseRatio = Math.round((avgDeposit / avgPrice) * 100);
    } else if (latestDeposit > 0 && latestPrice > 0) {
      jeonseRatio = Math.round((latestDeposit / latestPrice) * 100);
    }

    const latestDealDate = formatTxContractDate(latestSale || latestJeonse) || undefined;
    const prevSalePrice = prevSale?.price && prevSale.price > 0 ? prevSale.price : undefined;
    const priceDelta =
      latestPrice > 0 && prevSalePrice !== undefined ? latestPrice - prevSalePrice : undefined;
    const perPyeongPrice =
      latestPrice > 0 && pyeong > 0 ? Math.round(latestPrice / pyeong) : undefined;

    summaries.push({
      pyeong,
      areaM2: Math.round(avgArea * 100) / 100,
      salesCount,
      rentCount,
      latestPrice,
      latestPriceStr,
      maxPrice,
      maxPriceStr,
      avgPrice,
      avgPriceStr,
      latestDeposit,
      latestDepositStr,
      avgDeposit,
      avgDepositStr,
      jeonseRatio,
      ...(latestDealDate ? { latestDealDate } : {}),
      ...(prevSalePrice !== undefined ? { prevSalePrice } : {}),
      ...(priceDelta !== undefined ? { priceDelta } : {}),
      ...(perPyeongPrice !== undefined ? { perPyeongPrice } : {}),
    });
  }

  return summaries.sort((a, b) => a.pyeong - b.pyeong);
}

/**
 * 국토교통부 실거래 레코드 및 요약본으로부터 최신 거래일·최고가·직전 대비 변동액·평당가 산출
 */
export function computeMolitLatestTradeSummary(
  txs?: TransactionRecord[],
  aptSummary?: AptTxSummary,
  pyeongSummaries: PyeongSummary[] = []
): MolitLatestTradeSummary {
  const validSales = Array.isArray(txs)
    ? txs
        .filter(
          (t) =>
            t &&
            t.dealType !== '전세' &&
            t.dealType !== '월세' &&
            typeof t.price === 'number' &&
            Number.isFinite(t.price) &&
            t.price > 0 &&
            !isCancelledTx(t)
        )
        .sort((a, b) => {
          const numDiff = toSortableContractDateNum(b) - toSortableContractDateNum(a);
          if (numDiff !== 0) return numDiff;
          const dateA = String(a.contractYm) + String(a.contractDay).padStart(2, '0');
          const dateB = String(b.contractYm) + String(b.contractDay).padStart(2, '0');
          return dateB.localeCompare(dateA);
        })
    : [];

  const summaryDotsDate = formatRawDateToDots(aptSummary?.latestDate);
  const matchedSummaryIdx =
    aptSummary?.latestPrice && aptSummary.latestPrice > 0
      ? validSales.findIndex(
          (t) =>
            t.price === aptSummary.latestPrice &&
            (!summaryDotsDate || formatTxContractDate(t) === summaryDotsDate)
        )
      : -1;
  const fallbackPriceIdx =
    matchedSummaryIdx >= 0
      ? matchedSummaryIdx
      : aptSummary?.latestPrice && aptSummary.latestPrice > 0
        ? validSales.findIndex((t) => t.price === aptSummary.latestPrice)
        : 0;
  const anchorIdx = fallbackPriceIdx >= 0 ? fallbackPriceIdx : 0;
  const latestSaleTx = validSales.length > 0 ? validSales[anchorIdx] : undefined;

  const summaryDealDates = pyeongSummaries
    .map((p) => p.latestDealDate)
    .filter((d): d is string => Boolean(d))
    .sort((a, b) => b.localeCompare(a));

  const latestDealDateStr =
    summaryDotsDate ||
    formatTxContractDate(latestSaleTx) ||
    summaryDealDates[0] ||
    formatRawDateToDots(aptSummary?.latestRentDate) ||
    null;

  const dominantSalePyeong = [...pyeongSummaries]
    .filter((p) => p.latestPrice > 0)
    .sort((a, b) => b.salesCount - a.salesCount)[0];

  const latestSalePriceManwon =
    (aptSummary?.latestPrice && aptSummary.latestPrice > 0 ? aptSummary.latestPrice : 0) ||
    (latestSaleTx?.price && latestSaleTx.price > 0 ? latestSaleTx.price : 0) ||
    (dominantSalePyeong?.latestPrice && dominantSalePyeong.latestPrice > 0
      ? dominantSalePyeong.latestPrice
      : 0);

  const latestSalePriceStr =
    latestSalePriceManwon > 0 ? formatPriceEok(latestSalePriceManwon) : null;

  const latestPyeong =
    (latestSaleTx?.areaPyeong && latestSaleTx.areaPyeong > 0
      ? Math.round(latestSaleTx.areaPyeong)
      : null) ||
    (aptSummary?.latestArea && aptSummary.latestArea > 0
      ? Math.round(aptSummary.latestArea)
      : null) ||
    (dominantSalePyeong?.pyeong && dominantSalePyeong.pyeong > 0
      ? dominantSalePyeong.pyeong
      : null);

  const pyeongMaxPrice = pyeongSummaries.reduce(
    (max, p) => (p.maxPrice && p.maxPrice > max ? p.maxPrice : max),
    0
  );
  const txMaxPrice = validSales.reduce(
    (max, t) => (t.price && t.price > max ? t.price : max),
    0
  );
  const maxSalePriceManwon = Math.max(
    aptSummary?.allTimeHigh || 0,
    aptSummary?.maxPrice || 0,
    pyeongMaxPrice,
    txMaxPrice,
    latestSalePriceManwon
  );
  const maxSalePriceStr = maxSalePriceManwon > 0 ? formatPriceEok(maxSalePriceManwon) : null;

  let priceDeltaManwon: number | null = null;
  if (validSales.length >= 2 && latestSaleTx) {
    const targetPyeong = Math.round(latestSaleTx.areaPyeong || 0);
    const olderSales = validSales.slice(anchorIdx + 1);
    const prevSamePyeong =
      targetPyeong > 0
        ? olderSales.find((t) => Math.round(t.areaPyeong || 0) === targetPyeong)
        : olderSales.find((t) => Math.round(t.areaPyeong || 0) === 0);
    if (prevSamePyeong && prevSamePyeong.price > 0) {
      priceDeltaManwon = latestSaleTx.price - prevSamePyeong.price;
    }
  } else {
    const matchingPyeongWithDelta =
      (latestPyeong
        ? pyeongSummaries.find((p) => p.pyeong === latestPyeong && typeof p.priceDelta === 'number')
        : undefined) ||
      pyeongSummaries.find((p) => typeof p.priceDelta === 'number');

    if (matchingPyeongWithDelta && typeof matchingPyeongWithDelta.priceDelta === 'number') {
      priceDeltaManwon = matchingPyeongWithDelta.priceDelta;
    } else if (
      validSales.length === 0 &&
      aptSummary?.latestPrice &&
      aptSummary.latestPrice > 0 &&
      aptSummary?.avg3MPrice &&
      aptSummary.avg3MPrice > 0
    ) {
      priceDeltaManwon = aptSummary.latestPrice - aptSummary.avg3MPrice;
    }
  }

  const priceDeltaStr = formatPriceDeltaManwon(priceDeltaManwon);

  const rawPerPyeong =
    (aptSummary?.avg1MPerPyeong && aptSummary.avg1MPerPyeong > 0
      ? Math.round(aptSummary.avg1MPerPyeong)
      : 0) ||
    (aptSummary?.avg3MPerPyeong && aptSummary.avg3MPerPyeong > 0
      ? Math.round(aptSummary.avg3MPerPyeong)
      : 0) ||
    (latestSalePriceManwon > 0 && latestPyeong && latestPyeong > 0
      ? Math.round(latestSalePriceManwon / latestPyeong)
      : 0) ||
    (dominantSalePyeong?.perPyeongPrice && dominantSalePyeong.perPyeongPrice > 0
      ? dominantSalePyeong.perPyeongPrice
      : 0);

  const perPyeongManwon = Number.isFinite(rawPerPyeong) && rawPerPyeong > 0 ? rawPerPyeong : 0;
  const perPyeongStr = perPyeongManwon > 0 ? formatPriceEok(perPyeongManwon) : null;

  return {
    latestDealDateStr,
    latestSalePriceManwon,
    latestSalePriceStr,
    latestPyeong,
    maxSalePriceManwon,
    maxSalePriceStr,
    priceDeltaManwon,
    priceDeltaStr,
    perPyeongManwon,
    perPyeongStr,
  };
}

/**
 * 단지 요약 및 평형별 시세로부터 종합 가격 지표 및 메트릭 산출
 */
export function calculatePriceAnalytics(
  pyeongSummaries: PyeongSummary[],
  aptSummary?: AptTxSummary
): PriceAnalytics {
  const salePrices = pyeongSummaries.map((p) => p.latestPrice).filter((p) => p > 0);
  const minSalePrice = salePrices.length > 0 ? Math.min(...salePrices) : 0;
  const maxSalePrice = salePrices.length > 0 ? Math.max(...salePrices) : 0;

  const salesVal = aptSummary ? (aptSummary.avg1MPrice || aptSummary.avg3MPrice || aptSummary.latestPrice || 0) : 0;
  const jeonseVal = aptSummary ? (aptSummary.avg1MRentDeposit || aptSummary.avg3MRentDeposit || aptSummary.latestRentDeposit || 0) : 0;
  const rawRatioPercent = salesVal > 0 && jeonseVal > 0 ? Math.round((jeonseVal / salesVal) * 100) : 0;
  const fallbackPyeongRatio =
    [...pyeongSummaries]
      .sort((a, b) => b.salesCount + b.rentCount - (a.salesCount + a.rentCount))
      .find((p) => p.jeonseRatio > 0 && p.jeonseRatio <= 100)?.jeonseRatio || 0;
  const ratioPercent =
    rawRatioPercent > 0 && rawRatioPercent <= 100 ? rawRatioPercent : fallbackPyeongRatio;

  const maxPriceVal = aptSummary?.maxPrice || 0;
  const latestPriceVal = aptSummary?.latestPrice || 0;
  const isHigh = latestPriceVal > 0 && maxPriceVal > 0 && latestPriceVal >= maxPriceVal - 500;
  const statusStr = isHigh ? '신고가' : (ratioPercent >= 75 && ratioPercent <= 100 ? '실수요안심' : '인기단지');

  const offers = salePrices.length > 0 ? {
    '@type': 'AggregateOffer',
    priceCurrency: 'KRW',
    lowPrice: minSalePrice * 10000,
    highPrice: maxSalePrice * 10000,
    offerCount: pyeongSummaries.reduce((sum, p) => sum + p.salesCount, 0),
  } : undefined;

  return {
    minSalePrice,
    maxSalePrice,
    salesVal,
    jeonseVal,
    ratioPercent,
    isHigh,
    statusStr,
    offers,
  };
}

/**
 * SEO 및 메타데이터용 AI 단지 브리핑 텍스트 생성
 */
export function generateAiBriefing(
  aptName: string,
  aptSummary: AptTxSummary | undefined,
  pyeongSummaries: PyeongSummary[],
  locationScore?: LocationScore | null,
  txs?: TransactionRecord[]
): string {
  const defaultBrief = `동탄 ${aptName} 실거래가, 평당가, 매매가, 전세가율, 배정 초등학교 학군, 호갱노노 비교, 국토교통부 최근 거래일·최고가·직전 대비 변동액 요약 및 적정 가치 분석. D-VIEW에서 실제 데이터 기반의 프리미엄 분석을 확인하세요.`;

  let brief = '';
  const pyeongListStr = pyeongSummaries.map((p) => `${p.pyeong}평`).join(', ');
  const dongPrefix = aptSummary?.dong ? ` ${aptSummary.dong}` : '';
  const aptDisplay = aptName.endsWith('아파트') ? aptName : `${aptName} 아파트`;
  const tradeSummary = computeMolitLatestTradeSummary(txs, aptSummary, pyeongSummaries);

  const buildTradeHighlightClause = (): string => {
    const parts: string[] = [];
    if (tradeSummary.perPyeongStr) {
      parts.push(`평당가 ${tradeSummary.perPyeongStr}`);
    }
    if (tradeSummary.latestDealDateStr) {
      parts.push(`최근 거래일 ${tradeSummary.latestDealDateStr}`);
    }
    if (tradeSummary.maxSalePriceStr) {
      parts.push(`최고가 ${tradeSummary.maxSalePriceStr}`);
    } else if (tradeSummary.latestDealDateStr) {
      parts.push('매매 최고가 집계 중');
    }
    if (tradeSummary.priceDeltaStr) {
      parts.push(`직전 대비 변동액 ${tradeSummary.priceDeltaStr}`);
    } else if (tradeSummary.maxSalePriceStr || tradeSummary.latestDealDateStr) {
      parts.push('직전 대비 변동액 집계 중');
    }
    return parts.length > 0
      ? ` [${parts.join(' · ')}]`
      : ' [최근 거래일 · 최고가 · 직전 대비 변동액 집계 중]';
  };

  if (pyeongSummaries.length === 0) {
    if (!aptSummary) return defaultBrief;
    if (aptSummary.latestPrice && aptSummary.latestPrice > 0) {
      const latestStr = formatPriceEok(aptSummary.latestPrice);
      const txBadge = aptSummary.txCount && aptSummary.txCount > 0 ? ` (누적 ${aptSummary.txCount.toLocaleString()}건)` : '';
      brief = `동탄${dongPrefix} ${aptName} 국토교통부 최신 실거래 매매가 ${latestStr}${txBadge}${buildTradeHighlightClause()} — 평당가, 전세가율, 배정 초등학교 학군, 호갱노노 비교 및 스트레스 DSR 대출 한도 분석 리포트를 D-VIEW에서 확인하세요.`;
    } else {
      const rawAvgEok = aptSummary.avg1MPriceEok?.trim();
      const hasValidAvgEok = Boolean(
        rawAvgEok && rawAvgEok !== '0' && rawAvgEok !== '0만' && rawAvgEok !== '0억' && rawAvgEok !== '정보 없음'
      );
      if (aptSummary.avg1MPrice && aptSummary.avg1MPrice > 0) {
        const avg1MPrice = formatPriceEok(aptSummary.avg1MPrice);
        brief = `${aptName}의 최근 1개월 평균 매매가는 ${avg1MPrice}원${buildTradeHighlightClause()}이며, D-VIEW에서 평당가, 전세가율, 배정 초등학교 학군, 호갱노노 비교 및 교통 인프라 분석 리포트를 확인해보세요.`;
      } else if (hasValidAvgEok && rawAvgEok) {
        const avg1MPrice = /[억만]/.test(rawAvgEok) ? rawAvgEok : `${rawAvgEok}억`;
        brief = `${aptName}의 최근 1개월 평균 매매가는 ${avg1MPrice}원${buildTradeHighlightClause()}이며, D-VIEW에서 평당가, 전세가율, 배정 초등학교 학군, 호갱노노 비교 및 교통 인프라 분석 리포트를 확인해보세요.`;
      } else if (aptSummary.latestRentDeposit && aptSummary.latestRentDeposit > 0) {
        const rentStr = formatPriceEok(aptSummary.latestRentDeposit);
        const txBadge = aptSummary.txCount && aptSummary.txCount > 0 ? ` (누적 ${aptSummary.txCount.toLocaleString()}건)` : '';
        brief = `동탄${dongPrefix} ${aptName} 국토교통부 최신 전월세 보증금 실거래가 ${rentStr}${txBadge}${buildTradeHighlightClause()} — 평당가, 전세가율, 배정 초등학교 학군, 호갱노노 비교 및 스트레스 DSR 대출 한도 분석 리포트를 D-VIEW에서 확인하세요.`;
      } else {
        brief = `${aptName}의 최근 1개월 평균 매매가는 정보 없음${buildTradeHighlightClause()}이며, D-VIEW에서 평당가, 전세가율, 배정 초등학교 학군, 호갱노노 비교 및 교통 인프라 분석 리포트를 확인해보세요.`;
      }
    }
  } else {
    const majorDetails = pyeongSummaries.slice(0, 2).map((p) => {
      const saleStr = p.latestPriceStr !== '정보 없음' ? `최근 매매가 ${p.latestPriceStr}` : '';
      const jeonseStr = p.latestDepositStr !== '정보 없음' ? `전세가 ${p.latestDepositStr}` : '';
      const ratioStr = p.jeonseRatio > 0 && p.jeonseRatio <= 100 ? `전세가율 ${p.jeonseRatio}%` : '';
      const parts = [saleStr, jeonseStr, ratioStr].filter(Boolean);
      return `${p.pyeong}평형(${parts.join(', ')})`;
    }).join(' 및 ');
    const txBadge =
      aptSummary?.txCount && aptSummary.txCount > 0
        ? ` (누적 실거래 ${aptSummary.txCount.toLocaleString()}건)`
        : '';
    brief = `동탄${dongPrefix} ${aptDisplay}(${pyeongListStr}) 국토교통부 실거래가 요약${txBadge}: ${majorDetails}${buildTradeHighlightClause()}. 평당가·전세가율·배정 초등학교·호갱노노 비교 분석 및 스트레스 DSR 40% 대출 한도를 D-VIEW에서 제공합니다.`;
  }

  if (locationScore) {
    const schools: string[] = [];
    if (locationScore.nearestSchoolNames?.elementary) {
      schools.push(`배정 초등학교는 ${locationScore.nearestSchoolNames.elementary}(도보 약 ${Math.round((locationScore.distanceToElementary || 0) / 70) || 1}분)`);
    }
    if (locationScore.nearestStationName) {
      schools.push(`가장 가까운 역은 ${locationScore.nearestStationName}역(${locationScore.nearestStationLine || '지하철'}, 약 ${locationScore.distanceToSubway || 0}m)`);
    }
    if (schools.length > 0) {
      brief += ` 입지 여건을 보면 ${schools.join(' 이며, ')}가 위치하고 있습니다.`;
    }
  }

  return brief;
}

