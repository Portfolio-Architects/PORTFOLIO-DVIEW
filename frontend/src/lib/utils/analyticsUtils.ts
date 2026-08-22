/**
 * @module analyticsUtils
 * @description Pure domain calculation and analytics utilities for apartment pricing,
 * pyeong aggregations, AI briefings, and percentiles.
 * Architecture Layer: Domain Utilities (`src/lib/utils/`)
 */

import type { AptTxSummary } from '@/lib/types/transaction';
import type { LocationScore } from '@/lib/services/apartmentPageService';

export interface TransactionRecord {
  contractYm: string;
  contractDay: string | number;
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
  try {
    let decoded = name;
    while (decoded.includes('%')) {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    }
    return decoded;
  } catch {
    return name;
  }
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

/**
 * 실거래가 레코드 목록을 평형별로 그룹화 및 통계 요약
 */
export function getPyeongSummaries(txs: TransactionRecord[]): PyeongSummary[] {
  if (!Array.isArray(txs) || txs.length === 0) return [];

  const groups: Record<number, TransactionRecord[]> = {};

  txs.forEach((t) => {
    const pyeong = Math.round(t.areaPyeong);
    if (!pyeong || pyeong <= 0) return;
    if (!groups[pyeong]) groups[pyeong] = [];
    groups[pyeong].push(t);
  });

  const summaries: PyeongSummary[] = [];

  Object.entries(groups).forEach(([pyeongKey, groupTxs]) => {
    const pyeong = parseInt(pyeongKey, 10);
    const sortedTxs = [...groupTxs].sort((a, b) => {
      const dateA = String(a.contractYm) + String(a.contractDay).padStart(2, '0');
      const dateB = String(b.contractYm) + String(b.contractDay).padStart(2, '0');
      return dateB.localeCompare(dateA);
    });

    const avgArea = sortedTxs.reduce((sum, t) => sum + (t.area || 0), 0) / sortedTxs.length;
    const sales = sortedTxs.filter((t) => t.dealType !== '전세' && t.dealType !== '월세');
    const jeonse = sortedTxs.filter((t) => t.dealType === '전세' && (t.deposit || 0) > 0);

    if (sales.length === 0 && jeonse.length === 0) return;

    const latestSale = sales[0];
    const latestPrice = latestSale ? (latestSale.price || 0) : 0;
    const latestPriceStr = latestSale ? (latestSale.priceEok || formatPriceEok(latestPrice)) : '정보 없음';

    const salePrices = sales.map((s) => s.price).filter((p) => p > 0);
    const maxPrice = salePrices.length > 0 ? Math.max(...salePrices) : 0;
    const maxPriceStr = maxPrice > 0 ? formatPriceEok(maxPrice) : '정보 없음';

    const avgPrice = salePrices.length > 0 ? Math.round(salePrices.reduce((sum, p) => sum + p, 0) / salePrices.length) : 0;
    const avgPriceStr = avgPrice > 0 ? formatPriceEok(avgPrice) : '정보 없음';

    const latestJeonse = jeonse[0];
    const latestDeposit = latestJeonse ? (latestJeonse.deposit || 0) : 0;
    const latestDepositStr = latestJeonse ? (latestJeonse.priceEok || formatPriceEok(latestDeposit)) : '정보 없음';

    const jeonseDeposits = jeonse.map((j) => j.deposit || 0).filter((d) => d > 0);
    const avgDeposit = jeonseDeposits.length > 0 ? Math.round(jeonseDeposits.reduce((sum, d) => sum + d, 0) / jeonseDeposits.length) : 0;
    const avgDepositStr = avgDeposit > 0 ? formatPriceEok(avgDeposit) : '정보 없음';

    let jeonseRatio = 0;
    if (avgDeposit > 0 && avgPrice > 0) {
      jeonseRatio = Math.round((avgDeposit / avgPrice) * 100);
    } else if (latestDeposit > 0 && latestPrice > 0) {
      jeonseRatio = Math.round((latestDeposit / latestPrice) * 100);
    }

    summaries.push({
      pyeong,
      areaM2: Math.round(avgArea * 100) / 100,
      salesCount: sales.length,
      rentCount: jeonse.length,
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
    });
  });

  return summaries.sort((a, b) => a.pyeong - b.pyeong);
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
  const ratioPercent = salesVal > 0 && jeonseVal > 0 ? Math.round((jeonseVal / salesVal) * 100) : 0;

  const maxPriceVal = aptSummary?.maxPrice || 0;
  const latestPriceVal = aptSummary?.latestPrice || 0;
  const isHigh = latestPriceVal > 0 && maxPriceVal > 0 && latestPriceVal >= maxPriceVal - 500;
  const statusStr = isHigh ? '신고가' : (ratioPercent >= 75 ? '실수요안심' : '인기단지');

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
  locationScore?: LocationScore | null
): string {
  const defaultBrief = `동탄 ${aptName} 실거래가, 매매가, 전세가율, 학군, 교통 호재, 적정 가치 분석. D-VIEW에서 실제 데이터 기반의 프리미엄 분석을 확인하세요.`;

  let brief = '';
  const pyeongListStr = pyeongSummaries.map((p) => `${p.pyeong}평`).join(', ');

  if (pyeongSummaries.length === 0) {
    if (!aptSummary) return defaultBrief;
    const avg1MPrice = aptSummary.avg1MPriceEok ? `${aptSummary.avg1MPriceEok}억` : '정보 없음';
    brief = `${aptName}의 최근 1개월 평균 매매가는 ${avg1MPrice}원이며, D-VIEW에서 학군, 교통 인프라 및 프리미엄 적정 가치 분석 리포트를 확인해보세요.`;
  } else {
    const majorDetails = pyeongSummaries.slice(0, 2).map((p) => {
      const saleStr = p.latestPriceStr !== '정보 없음' ? `최근 매매가 ${p.latestPriceStr}` : '';
      const jeonseStr = p.latestDepositStr !== '정보 없음' ? `전세가 ${p.latestDepositStr}` : '';
      const ratioStr = p.jeonseRatio > 0 ? `전세가율 ${p.jeonseRatio}%` : '';
      const parts = [saleStr, jeonseStr, ratioStr].filter(Boolean);
      return `${p.pyeong}평형(${parts.join(', ')})`;
    }).join(' 및 ');
    brief = `동탄 ${aptName} 아파트는 ${pyeongListStr} 다양한 평형대를 형성하고 있습니다. ${majorDetails} 등 평형별 정확한 실거래가 시세와 전세가율 변동 추이, 학군 정보, 대중교통 인프라 요약을 D-VIEW에서 제공합니다.`;
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
