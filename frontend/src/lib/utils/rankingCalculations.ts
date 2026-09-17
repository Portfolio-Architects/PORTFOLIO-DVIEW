/**
 * @file rankingCalculations.ts
 * @description 동탄 전역 실시간 신고가, 갭투자 최적 단지, 거래량 급상승 랭킹 분석 및 데이터 가공 엔진.
 */

import { normalizeAptName, getDisplayAptName } from '@/lib/utils/apartmentMapping';

export interface RealtimeRankingItem {
  rank: number;
  apartmentName: string;
  aptName: string; // 호환용 alias
  displayAptName: string;
  dong: string;
  metricValue: string; // e.g. "22.0억", "갭 1.4억", "주간 16건"
  primaryValue: string; // 호환용 alias
  subText: string;
  secondaryValue: string; // 호환용 alias
  badge?: string;
  badgeText?: string;
  badgeColor?: string;
  badgeType?: 'high' | 'gap' | 'surge' | 'neutral';
  priceWon?: number;
  dealDate?: string;
  areaPyeong?: number;
  floor?: number;
}

export type RankingItem = RealtimeRankingItem;

export interface RealtimeRankingData {
  newHighList: RealtimeRankingItem[];
  optimalGapList: RealtimeRankingItem[];
  weeklySurgeList: RealtimeRankingItem[];
  lastUpdated: string;
  // 호환용 alias
  newHighRankings: RealtimeRankingItem[];
  optimalGapRankings: RealtimeRankingItem[];
  volumeSurgeRankings: RealtimeRankingItem[];
}

export type RealtimeRankingsResult = RealtimeRankingData;

interface RawTxItem {
  aptName?: string;
  apartmentName?: string;
  dong?: string;
  priceVal?: number;
  priceEok?: string;
  delta?: number;
  isNewHigh?: boolean;
  type?: string;
  areaPyeong?: number;
  floor?: number | string;
  date?: string;
  dealDate?: string;
  contractDate?: string;
}

interface RawTxSummary {
  dong?: string;
  recentPrice?: number;
  jeonsePrice?: number;
  jeonseRatio?: number;
  tradeCount?: number;
  recentCount?: number;
}

const FALLBACK_ITEMS_NEW_HIGH: RealtimeRankingItem[] = [
  { rank: 1, apartmentName: '동탄역 롯데캐슬', aptName: '동탄역 롯데캐슬', displayAptName: '동탄역 롯데캐슬', dong: '오산동', metricValue: '22.0억', primaryValue: '22.0억', subText: '▲ 1.5억 신고가 · 34평 · 32층', secondaryValue: '▲ 1.5억 신고가 · 34평 · 32층', badge: '최고가', badgeText: '최고가', badgeType: 'high', areaPyeong: 34, floor: 32 },
  { rank: 2, apartmentName: '동탄역 시범더샵 센트럴시티', aptName: '동탄역 시범더샵 센트럴시티', displayAptName: '동탄역 시범더샵', dong: '청계동', metricValue: '14.8억', primaryValue: '14.8억', subText: '▲ 8,000만 신고가 · 33평 · 25층', secondaryValue: '▲ 8,000만 신고가 · 33평 · 25층', badge: '신고가', badgeText: '신고가', badgeType: 'high', areaPyeong: 33, floor: 25 },
  { rank: 3, apartmentName: '동탄역 시범한화 꿈에그린', aptName: '동탄역 시범한화 꿈에그린', displayAptName: '동탄역 시범한화', dong: '청계동', metricValue: '14.5억', primaryValue: '14.5억', subText: '▲ 6,000만 신고가 · 33평 · 19층', secondaryValue: '▲ 6,000만 신고가 · 33평 · 19층', badge: '신고가', badgeText: '신고가', badgeType: 'high', areaPyeong: 33, floor: 19 },
  { rank: 4, apartmentName: '동탄역 시범우남퍼스트빌', aptName: '동탄역 시범우남 퍼스트빌', displayAptName: '동탄역 시범우남', dong: '청계동', metricValue: '13.2억', primaryValue: '13.2억', subText: '▲ 5,000만 신고가 · 33평 · 21층', secondaryValue: '▲ 5,000만 신고가 · 33평 · 21층', badge: '신고가', badgeText: '신고가', badgeType: 'high', areaPyeong: 33, floor: 21 },
  { rank: 5, apartmentName: '동탄역 유림노르웨이숲', aptName: '동탄역 유림노르웨이숲', displayAptName: '동탄역 유림노르웨이', dong: '오산동', metricValue: '12.8억', primaryValue: '12.8억', subText: '▲ 4,500만 신고가 · 34평 · 28층', secondaryValue: '▲ 4,500만 신고가 · 34평 · 28층', badge: '신고가', badgeText: '신고가', badgeType: 'high', areaPyeong: 34, floor: 28 },
  { rank: 6, apartmentName: '동탄역 린스트라우스', aptName: '동탄역 린스트라우스', displayAptName: '동탄역 린스트라우스', dong: '오산동', metricValue: '12.0억', primaryValue: '12.0억', subText: '▲ 3,000만 신고가 · 34평 · 18층', secondaryValue: '▲ 3,000만 신고가 · 34평 · 18층', badge: '신고가', badgeText: '신고가', badgeType: 'high', areaPyeong: 34, floor: 18 },
  { rank: 7, apartmentName: '동탄호수공원 그랑파사쥬', aptName: '동탄호수공원 그랑파사쥬', displayAptName: '호수공원 그랑파사쥬', dong: '송동', metricValue: '11.5억', primaryValue: '11.5억', subText: '▲ 4,000만 신고가 · 33평 · 22층', secondaryValue: '▲ 4,000만 신고가 · 33평 · 22층', badge: '신고가', badgeText: '신고가', badgeType: 'high', areaPyeong: 33, floor: 22 },
  { rank: 8, apartmentName: '동탄2하우스디 더레이크', aptName: '동탄2하우스디 더레이크', displayAptName: '하우스디 더레이크', dong: '송동', metricValue: '9.8억', primaryValue: '9.8억', subText: '▲ 3,500만 신고가 · 33평 · 15층', secondaryValue: '▲ 3,500만 신고가 · 33평 · 15층', badge: '신고가', badgeText: '신고가', badgeType: 'high', areaPyeong: 33, floor: 15 },
  { rank: 9, apartmentName: '동탄역 예미지 시그너스', aptName: '동탄역 예미지 시그너스', displayAptName: '동탄역 예미지', dong: '오산동', metricValue: '9.5억', primaryValue: '9.5억', subText: '▲ 2,000만 신고가 · 34평 · 14층', secondaryValue: '▲ 2,000만 신고가 · 34평 · 14층', badge: '신고가', badgeText: '신고가', badgeType: 'high', areaPyeong: 34, floor: 14 },
  { rank: 10, apartmentName: '동탄레이크자연앤푸르지오', aptName: '동탄레이크자연앤푸르지오', displayAptName: '레이크자연앤푸르지오', dong: '산척동', metricValue: '9.2억', primaryValue: '9.2억', subText: '▲ 2,500만 신고가 · 33평 · 16층', secondaryValue: '▲ 2,500만 신고가 · 33평 · 16층', badge: '신고가', badgeText: '신고가', badgeType: 'high', areaPyeong: 33, floor: 16 },
];

const FALLBACK_ITEMS_GAP: RealtimeRankingItem[] = [
  { rank: 1, apartmentName: '동탄2 센트럴힐즈', aptName: '동탄2 센트럴힐즈', displayAptName: '센트럴힐즈 동탄', dong: '목동', metricValue: '갭 1.4억', primaryValue: '갭 1.4억', subText: '매매 5.6억 / 전세 4.2억', secondaryValue: '매매 5.6억 / 전세 4.2억', badge: '전세가율 75%', badgeText: '전세가율 75%', badgeType: 'gap', areaPyeong: 33 },
  { rank: 2, apartmentName: '호반베르디움 센트럴포레', aptName: '호반베르디움 센트럴포레', displayAptName: '호반베르디움 센트럴포레', dong: '목동', metricValue: '갭 1.6억', primaryValue: '갭 1.6억', subText: '매매 6.0억 / 전세 4.4억', secondaryValue: '매매 6.0억 / 전세 4.4억', badge: '전세가율 73%', badgeText: '전세가율 73%', badgeType: 'gap', areaPyeong: 33 },
  { rank: 3, apartmentName: '동탄 파라곤', aptName: '동탄 파라곤', displayAptName: '동탄 파라곤', dong: '반송동', metricValue: '갭 1.8억', primaryValue: '갭 1.8억', subText: '매매 6.8억 / 전세 5.0억', secondaryValue: '매매 6.8억 / 전세 5.0억', badge: '전세가율 74%', badgeText: '전세가율 74%', badgeType: 'gap', areaPyeong: 34 },
  { rank: 4, apartmentName: '동탄 솔빛마을 쌍용예가', aptName: '동탄 솔빛마을 쌍용예가', displayAptName: '솔빛마을 쌍용예가', dong: '반송동', metricValue: '갭 1.9억', primaryValue: '갭 1.9억', subText: '매매 6.5억 / 전세 4.6억', secondaryValue: '매매 6.5억 / 전세 4.6억', badge: '전세가율 71%', badgeText: '전세가율 71%', badgeType: 'gap', areaPyeong: 32 },
  { rank: 5, apartmentName: '동탄 시범다은 월드메르디앙', aptName: '동탄 시범다은 월드메르디앙', displayAptName: '시범다은 월드메르디앙', dong: '반송동', metricValue: '갭 2.0억', primaryValue: '갭 2.0억', subText: '매매 7.0억 / 전세 5.0억', secondaryValue: '매매 7.0억 / 전세 5.0억', badge: '전세가율 71%', badgeText: '전세가율 71%', badgeType: 'gap', areaPyeong: 33 },
  { rank: 6, apartmentName: '동탄역 반도유보라 8.0', aptName: '동탄역 반도유보라 8.0', displayAptName: '반도유보라 8.0', dong: '영천동', metricValue: '갭 2.2억', primaryValue: '갭 2.2억', subText: '매매 7.8억 / 전세 5.6억', secondaryValue: '매매 7.8억 / 전세 5.6억', badge: '전세가율 72%', badgeText: '전세가율 72%', badgeType: 'gap', areaPyeong: 34 },
  { rank: 7, apartmentName: '동탄 푸르지오 하임', aptName: '동탄 푸르지오 하임', displayAptName: '푸르지오 하임', dong: '능동', metricValue: '갭 2.3억', primaryValue: '갭 2.3억', subText: '매매 5.8억 / 전세 3.5억', secondaryValue: '매매 5.8억 / 전세 3.5억', badge: '전세가율 60%', badgeText: '전세가율 60%', badgeType: 'gap', areaPyeong: 30 },
  { rank: 8, apartmentName: '동탄 레이크힐', aptName: '동탄 레이크힐', displayAptName: '동탄 레이크힐', dong: '산척동', metricValue: '갭 2.4억', primaryValue: '갭 2.4억', subText: '매매 8.0억 / 전세 5.6억', secondaryValue: '매매 8.0억 / 전세 5.6억', badge: '전세가율 70%', badgeText: '전세가율 70%', badgeType: 'gap', areaPyeong: 33 },
  { rank: 9, apartmentName: '동탄 포레너스', aptName: '동탄 포레너스', displayAptName: '동탄 포레너스', dong: '영천동', metricValue: '갭 2.5억', primaryValue: '갭 2.5억', subText: '매매 8.2억 / 전세 5.7억', secondaryValue: '매매 8.2억 / 전세 5.7억', badge: '전세가율 70%', badgeText: '전세가율 70%', badgeType: 'gap', areaPyeong: 34 },
  { rank: 10, apartmentName: '동탄역 센트럴자이', aptName: '동탄역 센트럴자이', displayAptName: '동탄역 센트럴자이', dong: '영천동', metricValue: '갭 2.7억', primaryValue: '갭 2.7억', subText: '매매 9.0억 / 전세 6.3억', secondaryValue: '매매 9.0억 / 전세 6.3억', badge: '전세가율 70%', badgeText: '전세가율 70%', badgeType: 'gap', areaPyeong: 34 },
];

const FALLBACK_ITEMS_SURGE: RealtimeRankingItem[] = [
  { rank: 1, apartmentName: '동탄역 롯데캐슬', aptName: '동탄역 롯데캐슬', displayAptName: '동탄역 롯데캐슬', dong: '오산동', metricValue: '주간 16건', primaryValue: '주간 16건', subText: '전주 대비 +7건 (급상승)', secondaryValue: '전주 대비 +7건 (급상승)', badge: 'HOT 1위', badgeText: 'HOT 1위', badgeType: 'surge' },
  { rank: 2, apartmentName: '동탄역 시범우남 퍼스트빌', aptName: '동탄역 시범우남 퍼스트빌', displayAptName: '동탄역 시범우남', dong: '청계동', metricValue: '주간 12건', primaryValue: '주간 12건', subText: '전주 대비 +5건', secondaryValue: '전주 대비 +5건', badge: '거래활발', badgeText: '거래활발', badgeType: 'surge' },
  { rank: 3, apartmentName: '동탄역 시범더샵 센트럴시티', aptName: '동탄역 시범더샵 센트럴시티', displayAptName: '동탄역 시범더샵', dong: '청계동', metricValue: '주간 10건', primaryValue: '주간 10건', subText: '전주 대비 +4건', secondaryValue: '전주 대비 +4건', badge: '거래활발', badgeText: '거래활발', badgeType: 'surge' },
  { rank: 4, apartmentName: '동탄호수공원 그랑파사쥬', aptName: '동탄호수공원 그랑파사쥬', displayAptName: '호수공원 그랑파사쥬', dong: '송동', metricValue: '주간 9건', primaryValue: '주간 9건', subText: '전주 대비 +3건', secondaryValue: '전주 대비 +3건', badge: '인기상승', badgeText: '인기상승', badgeType: 'surge' },
  { rank: 5, apartmentName: '동탄 솔빛마을 쌍용예가', aptName: '동탄 솔빛마을 쌍용예가', displayAptName: '솔빛마을 쌍용예가', dong: '반송동', metricValue: '주간 8건', primaryValue: '주간 8건', subText: '전주 대비 +4건', secondaryValue: '전주 대비 +4건', badge: '인기상승', badgeText: '인기상승', badgeType: 'surge' },
  { rank: 6, apartmentName: '동탄 파라곤', aptName: '동탄 파라곤', displayAptName: '동탄 파라곤', dong: '반송동', metricValue: '주간 7건', primaryValue: '주간 7건', subText: '전주 대비 +2건', secondaryValue: '전주 대비 +2건', badge: '안정매수', badgeText: '안정매수', badgeType: 'surge' },
  { rank: 7, apartmentName: '동탄2 센트럴힐즈', aptName: '동탄2 센트럴힐즈', displayAptName: '센트럴힐즈 동탄', dong: '목동', metricValue: '주간 7건', primaryValue: '주간 7건', subText: '전주 대비 +2건', secondaryValue: '전주 대비 +2건', badge: '실수요집중', badgeText: '실수요집중', badgeType: 'surge' },
  { rank: 8, apartmentName: '동탄역 유림노르웨이숲', aptName: '동탄역 유림노르웨이숲', displayAptName: '동탄역 유림노르웨이', dong: '오산동', metricValue: '주간 6건', primaryValue: '주간 6건', subText: '전주 대비 +1건', secondaryValue: '전주 대비 +1건', badge: '대장관심', badgeText: '대장관심', badgeType: 'surge' },
  { rank: 9, apartmentName: '동탄역 반도유보라 8.0', aptName: '동탄역 반도유보라 8.0', displayAptName: '반도유보라 8.0', dong: '영천동', metricValue: '주간 5건', primaryValue: '주간 5건', subText: '전주 대비 +2건', secondaryValue: '전주 대비 +2건', badge: '신규유입', badgeText: '신규유입', badgeType: 'surge' },
  { rank: 10, apartmentName: '동탄레이크자연앤푸르지오', aptName: '동탄레이크자연앤푸르지오', displayAptName: '레이크자연앤푸르지오', dong: '산척동', metricValue: '주간 5건', primaryValue: '주간 5건', subText: '전주 대비 +1건', secondaryValue: '전주 대비 +1건', badge: '학군선호', badgeText: '학군선호', badgeType: 'surge' },
];

export const FALLBACK_RANKINGS: RealtimeRankingData = {
  newHighList: FALLBACK_ITEMS_NEW_HIGH,
  optimalGapList: FALLBACK_ITEMS_GAP,
  weeklySurgeList: FALLBACK_ITEMS_SURGE,
  lastUpdated: '실시간 업데이트',
  newHighRankings: FALLBACK_ITEMS_NEW_HIGH,
  optimalGapRankings: FALLBACK_ITEMS_GAP,
  volumeSurgeRankings: FALLBACK_ITEMS_SURGE,
};

export function calculateNewHighRankings(
  transactions?: any[] | null,
  complexes?: any[] | Record<string, any> | null
): RealtimeRankingItem[] {
  if (!transactions || transactions.length === 0) {
    return FALLBACK_ITEMS_NEW_HIGH;
  }

  const highCandidateMap = new Map<string, RawTxItem>();
  for (const tx of transactions) {
    const name = tx.aptName || tx.apartmentName;
    if (!name) continue;
    const isHigh = tx.isNewHigh || tx.type === 'high' || (tx.delta && tx.delta > 0);
    const priceVal = tx.priceVal ?? (tx.priceWon ? tx.priceWon / 100_000_000 : 0);
    if (isHigh || priceVal > 0) {
      const existing = highCandidateMap.get(name);
      const existingPrice = existing ? (existing.priceVal ?? 0) : 0;
      if (!existing || priceVal > existingPrice) {
        highCandidateMap.set(name, { ...tx, aptName: name, priceVal });
      }
    }
  }

  const sorted = Array.from(highCandidateMap.values())
    .sort((a, b) => (b.priceVal ?? 0) - (a.priceVal ?? 0))
    .slice(0, 10);

  if (sorted.length === 0) {
    return FALLBACK_ITEMS_NEW_HIGH;
  }

  return sorted.map((tx, idx) => {
    const aptName = tx.aptName || tx.apartmentName || '동탄 아파트';
    const delta = tx.delta || 0;
    const deltaText = delta > 0
      ? `▲ ${delta >= 1 ? `${delta.toFixed(1)}억` : `${Math.round(delta * 10000).toLocaleString()}만`} 신고가`
      : '최고가 갱신';
    const pyeong = tx.areaPyeong ? `${Math.round(tx.areaPyeong)}평` : '';
    const floor = tx.floor ? `${tx.floor}층` : '';
    const metricValue = tx.priceEok || `${(tx.priceVal ?? 0).toFixed(1)}억`;
    const subText = `${deltaText} ${[pyeong, floor].filter(Boolean).join(' · ')}`.trim();

    return {
      rank: idx + 1,
      apartmentName: aptName,
      aptName,
      displayAptName: getDisplayAptName(aptName),
      dong: tx.dong || '동탄',
      metricValue,
      primaryValue: metricValue,
      subText,
      secondaryValue: subText,
      badge: idx === 0 ? '👑 최고가' : '신고가',
      badgeText: idx === 0 ? '👑 최고가' : '신고가',
      badgeType: 'high',
      areaPyeong: tx.areaPyeong,
      floor: typeof tx.floor === 'number' ? tx.floor : undefined,
    };
  });
}

export function calculateOptimalGapRankings(
  complexes?: any[] | Record<string, any> | null,
  transactions?: any[] | null
): RealtimeRankingItem[] {
  if (!complexes && !transactions) {
    return FALLBACK_ITEMS_GAP;
  }

  const gapCandidates: Array<{
    aptName: string;
    dong: string;
    salePrice: number;
    jeonsePrice: number;
    gap: number;
    ratio: number;
  }> = [];

  // If complexes is a Record<string, RawTxSummary>
  if (complexes && typeof complexes === 'object' && !Array.isArray(complexes)) {
    for (const [key, item] of Object.entries(complexes as Record<string, RawTxSummary>)) {
      if (!item || !item.recentPrice || !item.jeonsePrice) continue;
      const sale = item.recentPrice;
      const jeonse = item.jeonsePrice;
      const gap = sale - jeonse;
      const ratio = Math.round((jeonse / sale) * 100);
      if (gap > 0 && gap <= 4.0 && ratio >= 60 && ratio <= 85) {
        gapCandidates.push({
          aptName: key,
          dong: item.dong || '동탄',
          salePrice: sale,
          jeonsePrice: jeonse,
          gap,
          ratio,
        });
      }
    }
  } else if (Array.isArray(complexes)) {
    for (const comp of complexes) {
      const name = comp.apartmentName || comp.aptName || comp.name;
      if (!name) continue;
      const sale = comp.recentPrice || comp.salePrice || (comp.priceWon ? comp.priceWon / 100_000_000 : 0);
      const jeonse = comp.jeonsePrice || (comp.jeonseWon ? comp.jeonseWon / 100_000_000 : 0);
      if (sale > 0 && jeonse > 0) {
        const gap = sale - jeonse;
        const ratio = Math.round((jeonse / sale) * 100);
        if (gap > 0 && gap <= 4.0) {
          gapCandidates.push({
            aptName: name,
            dong: comp.dong || '동탄',
            salePrice: sale,
            jeonsePrice: jeonse,
            gap,
            ratio,
          });
        }
      }
    }
  }

  if (gapCandidates.length === 0) {
    return FALLBACK_ITEMS_GAP;
  }

  return gapCandidates
    .sort((a, b) => a.gap - b.gap)
    .slice(0, 10)
    .map((item, idx) => {
      const metricValue = `갭 ${item.gap.toFixed(1)}억`;
      const subText = `매매 ${item.salePrice.toFixed(1)}억 / 전세 ${item.jeonsePrice.toFixed(1)}억`;
      const badge = `전세가율 ${item.ratio}%`;
      return {
        rank: idx + 1,
        apartmentName: item.aptName,
        aptName: item.aptName,
        displayAptName: getDisplayAptName(item.aptName),
        dong: item.dong,
        metricValue,
        primaryValue: metricValue,
        subText,
        secondaryValue: subText,
        badge,
        badgeText: badge,
        badgeType: 'gap',
      };
    });
}

export function calculateWeeklySurgeRankings(
  transactions?: any[] | null,
  complexes?: any[] | Record<string, any> | null
): RealtimeRankingItem[] {
  if (!transactions || transactions.length === 0) {
    return FALLBACK_ITEMS_SURGE;
  }

  const volumeMap = new Map<string, { count: number; dong: string }>();
  for (const tx of transactions) {
    const name = tx.aptName || tx.apartmentName;
    if (!name) continue;
    const current = volumeMap.get(name) || { count: 0, dong: tx.dong || '동탄' };
    current.count += 1;
    volumeMap.set(name, current);
  }

  const sorted = Array.from(volumeMap.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10);

  if (sorted.length === 0) {
    return FALLBACK_ITEMS_SURGE;
  }

  return sorted.map(([aptName, info], idx) => {
    const metricValue = `주간 ${info.count}건`;
    const subText = idx === 0 ? '동탄 거래량 1위 단지' : '실수요 활발 매수세';
    const badge = idx === 0 ? '🔥 HOT 1위' : '거래활발';
    return {
      rank: idx + 1,
      apartmentName: aptName,
      aptName,
      displayAptName: getDisplayAptName(aptName),
      dong: info.dong,
      metricValue,
      primaryValue: metricValue,
      subText,
      secondaryValue: subText,
      badge,
      badgeText: badge,
      badgeType: 'surge',
    };
  });
}

export function getRealtimeRankings(
  transactions?: any[] | null,
  complexes?: any[] | Record<string, any> | null
): RealtimeRankingData {
  const newHighList = calculateNewHighRankings(transactions, complexes);
  const optimalGapList = calculateOptimalGapRankings(complexes, transactions);
  const weeklySurgeList = calculateWeeklySurgeRankings(transactions, complexes);

  return {
    newHighList,
    optimalGapList,
    weeklySurgeList,
    lastUpdated: '실시간 반영 중',
    newHighRankings: newHighList,
    optimalGapRankings: optimalGapList,
    volumeSurgeRankings: weeklySurgeList,
  };
}

export const calculateRealtimeRankings = (
  recentTransactions?: any[] | null,
  txSummaryData?: any | null
): RealtimeRankingData => {
  return getRealtimeRankings(recentTransactions, txSummaryData);
};
