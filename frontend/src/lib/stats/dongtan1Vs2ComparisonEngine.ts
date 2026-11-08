/**
 * @module stats/dongtan1Vs2ComparisonEngine
 * @description Deterministic 100% Real-Data House Price Comparison Engine for
 * "Dongtan 1 New Town vs Dongtan 2 New Town" (동탄1신도시 vs 동탄2신도시 집값·실거래 비교 분석).
 *
 * STRICT REAL DATA ONLY:
 * - Zero synthetic, mock, or estimated prices.
 * - Derived 100% deterministically from verified MOLIT real transaction aggregates
 *   in `public/data/stats-station-cache.json` (127 complexes, 8,288 1Y transactions)
 *   and canonical slug catalog (`canonicalAptCatalog.ts`).
 */

import statsStationCacheStatic from '../../../public/data/stats-station-cache.json';
import { lookupCanonicalTxKeyForDongApt } from '@/lib/utils/canonicalAptCatalog';
import { resolveCanonicalAptSlug } from '@/lib/utils/apartmentMapping';
import {
  formatPriceEokCompact,
  formatShortContractDate,
} from './dongtanStationDistanceEngine';
import type {
  ApartmentStatRecord,
  AreaBandFilter,
  StatsDatasetMeta,
} from './types';

export const DONGTAN_1_LEGAL_DONGS = ['반송동', '석우동', '능동'] as const;
export const DONGTAN_2_LEGAL_DONGS = [
  '청계동',
  '여울동',
  '영천동',
  '목동',
  '산척동',
  '송동',
  '신동',
  '장지동',
] as const;

export type DongtanRegionId = '동탄1' | '동탄2';

export interface DongtanRegionPriceSummary {
  regionId: DongtanRegionId;
  regionTitle: string;
  regionSubtitle: string;
  dongsLabel: string;
  complexCount: number;
  txVolume1Y: number;
  totalHouseholds: number;
  weightedAvgPriceWon: number;
  weightedAvgPriceEokText: string;
  simpleAvgPriceWon: number;
  simpleAvgPriceEokText: string;
  weightedAvgPyeongWon: number;
  weightedAvgPyeongManwon: number;
  avgLatestPriceWon: number;
  avgLatestPriceEokText: string;
  medianLatestPriceWon: number;
  medianLatestPriceEokText: string;
  maxLatestPriceWon: number;
  maxLatestPriceEokText: string;
  maxPriceComplexName: string;
  maxPriceComplexDong: string;
  maxPriceComplexSlug: string;
  minLatestPriceWon: number;
  minLatestPriceEokText: string;
  minPriceComplexName: string;
  minPriceComplexDong: string;
  minPriceComplexSlug: string;
  avgBuiltYear: number;
  avgBuildingAge: number;
  avgDistanceToStationMeters: number;
}

export interface Dongtan1Vs2PriceDelta {
  weightedPriceDiffWon: number;
  weightedPriceDiffEokText: string;
  weightedPricePremiumPercent: number;
  latestPriceDiffWon: number;
  latestPriceDiffEokText: string;
  latestPricePremiumPercent: number;
  medianPriceDiffWon: number;
  medianPriceDiffEokText: string;
  pyeongPriceDiffManwon: number;
  pyeongPricePremiumPercent: number;
  maxPriceDiffWon: number;
  maxPriceDiffEokText: string;
  builtYearDiffYears: number;
  headlineQuestion: string;
  headlineAnswer: string;
}

export type PriceBracketId = 'under6' | '6to9' | '9to12' | '12to15' | 'over15';

export interface BracketSampleComplex {
  name: string;
  dong: string;
  latestPriceWon: number;
  latestPriceEokText: string;
  pyeongPriceManwon: number;
  canonicalSlug: string;
}

export interface PriceBracketComparisonItem {
  bracketId: PriceBracketId;
  shortLabel: string;
  rangeLabel: string;
  minWon: number;
  maxWon: number;
  dongtan1Count: number;
  dongtan1SharePercent: number;
  dongtan1Samples: BracketSampleComplex[];
  dongtan2Count: number;
  dongtan2SharePercent: number;
  dongtan2Samples: BracketSampleComplex[];
}

export interface LegalDongPriceSummary {
  dong: string;
  regionId: DongtanRegionId;
  complexCount: number;
  txVolume1Y: number;
  weightedAvgPriceWon: number;
  weightedAvgPriceEokText: string;
  weightedAvgPyeongManwon: number;
  avgLatestPriceWon: number;
  avgLatestPriceEokText: string;
  maxLatestPriceWon: number;
  maxLatestPriceEokText: string;
  flagshipComplexName: string;
  flagshipComplexSlug: string;
}

export interface RivalComplexSide {
  name: string;
  dong: string;
  regionId: DongtanRegionId;
  canonicalSlug: string;
  avgPriceWon: number;
  avgPriceEokText: string;
  latestPriceWon: number;
  latestPriceEokText: string;
  pyeongPriceManwon: number;
  latestPyeongPriceManwon: number;
  txCount: number;
  builtYear: number;
  householdCount: number;
  exclusiveAreaAvgM2: number;
  distanceToStationMeters: number;
  latestContractDateShort: string | null;
}

export interface FlagshipRivalMatchup {
  matchupId: string;
  themeBadge: string;
  matchupTitle: string;
  matchupDescription: string;
  dongtan1Complex: RivalComplexSide;
  dongtan2Complex: RivalComplexSide;
  latestPriceGapWon: number;
  latestPriceGapEokText: string;
  avgPriceGapWon: number;
  avgPriceGapEokText: string;
  pyeongPriceGapManwon: number;
  relatedGuideSlug: string;
  relatedGuideTitle: string;
}

export interface ComparisonGuideBridgeItem {
  slug: string;
  badge: string;
  category: string;
  title: string;
  summary: string;
  highlightStatLabel: string;
  isPrimaryComparison: boolean;
}

export interface Dongtan1Vs2ComparisonPayload {
  areaBand: AreaBandFilter;
  datasetMeta: StatsDatasetMeta;
  dongtan1: DongtanRegionPriceSummary;
  dongtan2: DongtanRegionPriceSummary;
  delta: Dongtan1Vs2PriceDelta;
  priceBrackets: PriceBracketComparisonItem[];
  dongRankings: LegalDongPriceSummary[];
  rivalMatchups: FlagshipRivalMatchup[];
  comparisonGuides: ComparisonGuideBridgeItem[];
}

const MASTER_BUNDLE = statsStationCacheStatic as unknown as {
  records: ApartmentStatRecord[];
  datasetMeta: StatsDatasetMeta;
};

const MASTER_RECORDS: ApartmentStatRecord[] = Array.isArray(MASTER_BUNDLE?.records)
  ? MASTER_BUNDLE.records
  : [];

const MASTER_DATASET_META: StatsDatasetMeta = MASTER_BUNDLE?.datasetMeta ?? {
  totalComplexCount: MASTER_RECORDS.length,
  totalTxCount: MASTER_RECORDS.reduce((acc, r) => acc + r.txCount, 0),
  latestContractDate: null,
  latestRegisteredDate: null,
  referenceMonthLabel: '최신 기준',
  sampleCountLabel: `${MASTER_RECORDS.length}개 단지 실거래 전수`,
};

/**
 * Resolves canonical apartment slug synchronously from dong & complex name
 */
export function resolveStatsComplexCanonicalSlug(name: string, dong?: string): string {
  if (!name) return '';
  if (dong) {
    const directKey = lookupCanonicalTxKeyForDongApt(dong, name);
    if (directKey) return directKey;
  }
  const resolved = resolveCanonicalAptSlug(name, dong ? { dong } : undefined);
  return resolved || name;
}

/**
 * Classifies a legal dong into '동탄1' or '동탄2' (normalizes legacy '오산동' to '여울동' -> '동탄2')
 */
export function classifyDongtanRegion(dong: string): DongtanRegionId {
  const normalized = (dong || '').trim() === '오산동' ? '여울동' : (dong || '').trim();
  if ((DONGTAN_1_LEGAL_DONGS as readonly string[]).includes(normalized)) {
    return '동탄1';
  }
  return '동탄2';
}

/**
 * Filters records by area band ('all' | 'small' | 'medium' | 'large')
 */
export function filterRecordsByAreaBand(
  records: ApartmentStatRecord[],
  areaBand: AreaBandFilter = 'all'
): ApartmentStatRecord[] {
  if (!Array.isArray(records) || records.length === 0) return [];
  if (!areaBand || areaBand === 'all') return records;

  return records.filter((r) => {
    const area = r.exclusiveAreaAvgM2;
    if (areaBand === 'small') return area < 60;
    if (areaBand === 'medium') return area >= 60 && area <= 85;
    if (areaBand === 'large') return area > 85;
    return true;
  });
}

function computeMedian(values: number[]): number {
  const valid = values.filter((v) => Number.isFinite(v) && v > 0).sort((a, b) => a - b);
  if (valid.length === 0) return 0;
  const mid = Math.floor(valid.length / 2);
  if (valid.length % 2 === 1) {
    return valid[mid];
  }
  return Math.round((valid[mid - 1] + valid[mid]) / 2);
}

function formatSignedPriceEok(diffWon: number): string {
  if (!Number.isFinite(diffWon) || diffWon === 0) return '0억원';
  const sign = diffWon > 0 ? '+' : '-';
  return `${sign}${formatPriceEokCompact(Math.abs(diffWon))}`;
}

/**
 * Computes comprehensive house price summary for a single region ('동탄1' or '동탄2')
 */
export function computeRegionPriceSummary(
  records: ApartmentStatRecord[],
  regionId: DongtanRegionId
): DongtanRegionPriceSummary {
  const regionRecords = records.filter((r) => classifyDongtanRegion(r.dong) === regionId);
  const complexCount = regionRecords.length;
  const txVolume1Y = regionRecords.reduce((sum, r) => sum + (r.txCount || 0), 0);
  const totalHouseholds = regionRecords.reduce((sum, r) => sum + (r.householdCount || 0), 0);

  const isDongtan1 = regionId === '동탄1';
  const regionTitle = isDongtan1 ? '동탄1신도시' : '동탄2신도시';
  const regionSubtitle = isDongtan1
    ? '완성형 인프라 · 센트럴파크 · 메타폴리스 생활권'
    : 'GTX-A 동탄역세권 · 호수공원 · 신축 대단지 생활권';
  const dongsLabel = isDongtan1
    ? '반송동 · 석우동 · 능동'
    : '청계 · 여울 · 영천 · 목동 · 산척 · 송동 · 신동 · 장지동';

  if (complexCount === 0) {
    return {
      regionId,
      regionTitle,
      regionSubtitle,
      dongsLabel,
      complexCount: 0,
      txVolume1Y: 0,
      totalHouseholds: 0,
      weightedAvgPriceWon: 0,
      weightedAvgPriceEokText: '-',
      simpleAvgPriceWon: 0,
      simpleAvgPriceEokText: '-',
      weightedAvgPyeongWon: 0,
      weightedAvgPyeongManwon: 0,
      avgLatestPriceWon: 0,
      avgLatestPriceEokText: '-',
      medianLatestPriceWon: 0,
      medianLatestPriceEokText: '-',
      maxLatestPriceWon: 0,
      maxLatestPriceEokText: '-',
      maxPriceComplexName: '-',
      maxPriceComplexDong: '-',
      maxPriceComplexSlug: '',
      minLatestPriceWon: 0,
      minLatestPriceEokText: '-',
      minPriceComplexName: '-',
      minPriceComplexDong: '-',
      minPriceComplexSlug: '',
      avgBuiltYear: 0,
      avgBuildingAge: 0,
      avgDistanceToStationMeters: 0,
    };
  }

  const simpleAvgPriceWon = Math.round(
    regionRecords.reduce((sum, r) => sum + r.avgPriceWon, 0) / complexCount
  );

  const weightedAvgPriceWon =
    txVolume1Y > 0
      ? Math.round(
          regionRecords.reduce((sum, r) => sum + r.avgPriceWon * r.txCount, 0) / txVolume1Y
        )
      : simpleAvgPriceWon;

  const simpleAvgPyeongWon = Math.round(
    regionRecords.reduce((sum, r) => sum + r.avgPricePerPyeongWon, 0) / complexCount
  );

  const weightedAvgPyeongWon =
    txVolume1Y > 0
      ? Math.round(
          regionRecords.reduce((sum, r) => sum + r.avgPricePerPyeongWon * r.txCount, 0) / txVolume1Y
        )
      : simpleAvgPyeongWon;

  const weightedAvgPyeongManwon = Math.round(weightedAvgPyeongWon / 10_000);

  const effectiveLatestPrices = regionRecords.map((r) =>
    r.latestPriceWon > 0 ? r.latestPriceWon : r.avgPriceWon
  );
  const avgLatestPriceWon = Math.round(
    effectiveLatestPrices.reduce((sum, p) => sum + p, 0) / complexCount
  );
  const medianLatestPriceWon = computeMedian(effectiveLatestPrices);

  // Max & Min complex by latest transaction price
  let maxRecord = regionRecords[0];
  let minRecord = regionRecords[0];

  for (const r of regionRecords) {
    const rPrice = r.latestPriceWon > 0 ? r.latestPriceWon : r.avgPriceWon;
    const maxPrice = maxRecord.latestPriceWon > 0 ? maxRecord.latestPriceWon : maxRecord.avgPriceWon;
    const minPrice = minRecord.latestPriceWon > 0 ? minRecord.latestPriceWon : minRecord.avgPriceWon;

    if (rPrice > maxPrice) maxRecord = r;
    if (rPrice > 0 && (minPrice <= 0 || rPrice < minPrice)) minRecord = r;
  }

  const maxLatestPriceWon =
    maxRecord.latestPriceWon > 0 ? maxRecord.latestPriceWon : maxRecord.avgPriceWon;
  const minLatestPriceWon =
    minRecord.latestPriceWon > 0 ? minRecord.latestPriceWon : minRecord.avgPriceWon;

  const avgBuiltYear = Math.round(
    regionRecords.reduce((sum, r) => sum + (r.builtYear || 2015), 0) / complexCount
  );
  const avgBuildingAge = Math.max(0, 2026 - avgBuiltYear);
  const avgDistanceToStationMeters = Math.round(
    regionRecords.reduce((sum, r) => sum + r.distanceToStationMeters, 0) / complexCount
  );

  return {
    regionId,
    regionTitle,
    regionSubtitle,
    dongsLabel,
    complexCount,
    txVolume1Y,
    totalHouseholds,
    weightedAvgPriceWon,
    weightedAvgPriceEokText: formatPriceEokCompact(weightedAvgPriceWon),
    simpleAvgPriceWon,
    simpleAvgPriceEokText: formatPriceEokCompact(simpleAvgPriceWon),
    weightedAvgPyeongWon,
    weightedAvgPyeongManwon,
    avgLatestPriceWon,
    avgLatestPriceEokText: formatPriceEokCompact(avgLatestPriceWon),
    medianLatestPriceWon,
    medianLatestPriceEokText: formatPriceEokCompact(medianLatestPriceWon),
    maxLatestPriceWon,
    maxLatestPriceEokText: formatPriceEokCompact(maxLatestPriceWon),
    maxPriceComplexName: maxRecord.name,
    maxPriceComplexDong: maxRecord.dong,
    maxPriceComplexSlug: resolveStatsComplexCanonicalSlug(maxRecord.name, maxRecord.dong),
    minLatestPriceWon,
    minLatestPriceEokText: formatPriceEokCompact(minLatestPriceWon),
    minPriceComplexName: minRecord.name,
    minPriceComplexDong: minRecord.dong,
    minPriceComplexSlug: resolveStatsComplexCanonicalSlug(minRecord.name, minRecord.dong),
    avgBuiltYear,
    avgBuildingAge,
    avgDistanceToStationMeters,
  };
}

/**
 * Computes head-to-head house price delta between Dongtan 1 and Dongtan 2
 */
export function computeDongtan1Vs2Delta(
  dongtan1: DongtanRegionPriceSummary,
  dongtan2: DongtanRegionPriceSummary
): Dongtan1Vs2PriceDelta {
  const headlineQuestion = '동탄1 vs 동탄2, 실제 집값은 얼마이고 얼마나 차이 날까?';

  if (dongtan1.complexCount === 0 || dongtan2.complexCount === 0) {
    const bothEmpty = dongtan1.complexCount === 0 && dongtan2.complexCount === 0;
    const emptyDiffText = bothEmpty ? '0억원' : '-';

    let headlineAnswer = '선택한 조건에 해당하는 실거래 표본 단지가 없습니다.';
    if (!bothEmpty) {
      if (dongtan1.complexCount === 0) {
        headlineAnswer = `선택한 평형 구간에는 동탄1신도시 해당 단지가 없으며(단지 평균 전용 63.4㎡ 이상), 동탄2신도시(${dongtan2.complexCount}개 단지) 1년 평균 집값은 ${dongtan2.weightedAvgPriceEokText}(평당 ${dongtan2.weightedAvgPyeongManwon.toLocaleString('ko-KR')}만)입니다.`;
      } else {
        headlineAnswer = `선택한 평형 구간에는 동탄2신도시 해당 단지가 없으며, 동탄1신도시(${dongtan1.complexCount}개 단지) 1년 평균 집값은 ${dongtan1.weightedAvgPriceEokText}(평당 ${dongtan1.weightedAvgPyeongManwon.toLocaleString('ko-KR')}만)입니다.`;
      }
    }

    return {
      weightedPriceDiffWon: 0,
      weightedPriceDiffEokText: emptyDiffText,
      weightedPricePremiumPercent: 0,
      latestPriceDiffWon: 0,
      latestPriceDiffEokText: emptyDiffText,
      latestPricePremiumPercent: 0,
      medianPriceDiffWon: 0,
      medianPriceDiffEokText: emptyDiffText,
      pyeongPriceDiffManwon: 0,
      pyeongPricePremiumPercent: 0,
      maxPriceDiffWon: 0,
      maxPriceDiffEokText: emptyDiffText,
      builtYearDiffYears: 0,
      headlineQuestion,
      headlineAnswer,
    };
  }

  const weightedPriceDiffWon = dongtan2.weightedAvgPriceWon - dongtan1.weightedAvgPriceWon;
  const weightedPricePremiumPercent =
    dongtan1.weightedAvgPriceWon > 0
      ? Math.round((weightedPriceDiffWon / dongtan1.weightedAvgPriceWon) * 1000) / 10
      : 0;

  const latestPriceDiffWon = dongtan2.avgLatestPriceWon - dongtan1.avgLatestPriceWon;
  const latestPricePremiumPercent =
    dongtan1.avgLatestPriceWon > 0
      ? Math.round((latestPriceDiffWon / dongtan1.avgLatestPriceWon) * 1000) / 10
      : 0;

  const medianPriceDiffWon = dongtan2.medianLatestPriceWon - dongtan1.medianLatestPriceWon;
  const pyeongPriceDiffManwon =
    dongtan2.weightedAvgPyeongManwon - dongtan1.weightedAvgPyeongManwon;
  const pyeongPricePremiumPercent =
    dongtan1.weightedAvgPyeongManwon > 0
      ? Math.round((pyeongPriceDiffManwon / dongtan1.weightedAvgPyeongManwon) * 1000) / 10
      : 0;

  const maxPriceDiffWon = dongtan2.maxLatestPriceWon - dongtan1.maxLatestPriceWon;
  const builtYearDiffYears = dongtan2.avgBuiltYear - dongtan1.avgBuiltYear;

  const absGapText = formatPriceEokCompact(Math.abs(weightedPriceDiffWon));
  const higherRegion = weightedPriceDiffWon >= 0 ? '동탄2신도시' : '동탄1신도시';

  return {
    weightedPriceDiffWon,
    weightedPriceDiffEokText: formatSignedPriceEok(weightedPriceDiffWon),
    weightedPricePremiumPercent,
    latestPriceDiffWon,
    latestPriceDiffEokText: formatSignedPriceEok(latestPriceDiffWon),
    latestPricePremiumPercent,
    medianPriceDiffWon,
    medianPriceDiffEokText: formatSignedPriceEok(medianPriceDiffWon),
    pyeongPriceDiffManwon,
    pyeongPricePremiumPercent,
    maxPriceDiffWon,
    maxPriceDiffEokText: formatSignedPriceEok(maxPriceDiffWon),
    builtYearDiffYears,
    headlineQuestion,
    headlineAnswer: `동탄1 1년 평균 ${dongtan1.weightedAvgPriceEokText}(평당 ${dongtan1.weightedAvgPyeongManwon.toLocaleString('ko-KR')}만) vs 동탄2 ${dongtan2.weightedAvgPriceEokText}(평당 ${dongtan2.weightedAvgPyeongManwon.toLocaleString('ko-KR')}만)으로 ${higherRegion}가 평균 ${absGapText} 높게 형성되어 있습니다.`,
  };
}

const PRICE_BRACKET_CONFIGS: ReadonlyArray<{
  bracketId: PriceBracketId;
  shortLabel: string;
  rangeLabel: string;
  minWon: number;
  maxWon: number;
}> = [
  {
    bracketId: 'under6',
    shortLabel: '6억 이하',
    rangeLabel: '6억 이하 (실속 진입권)',
    minWon: 0,
    maxWon: 600_000_000,
  },
  {
    bracketId: '6to9',
    shortLabel: '6억~9억',
    rangeLabel: '6억 초과 ~ 9억 이하 (주력 실수요권)',
    minWon: 600_000_000,
    maxWon: 900_000_000,
  },
  {
    bracketId: '9to12',
    shortLabel: '9억~12억',
    rangeLabel: '9억 초과 ~ 12억 이하 (핵심 상급지)',
    minWon: 900_000_000,
    maxWon: 1_200_000_000,
  },
  {
    bracketId: '12to15',
    shortLabel: '12억~15억',
    rangeLabel: '12억 초과 ~ 15억 이하 (권역 대장급)',
    minWon: 1_200_000_000,
    maxWon: 1_500_000_000,
  },
  {
    bracketId: 'over15',
    shortLabel: '15억 초과',
    rangeLabel: '15억 초과 (초역세권 하이엔드)',
    minWon: 1_500_000_000,
    maxWon: Infinity,
  },
];

function isRecordInPriceBracket(
  record: ApartmentStatRecord,
  minWon: number,
  maxWon: number
): boolean {
  const price = record.latestPriceWon > 0 ? record.latestPriceWon : record.avgPriceWon;
  if (minWon === 0) {
    return price > 0 && price <= maxWon;
  }
  if (maxWon === Infinity) {
    return price > minWon;
  }
  return price > minWon && price <= maxWon;
}

/**
 * Computes 5-tier price bracket distribution comparing Dongtan 1 vs Dongtan 2
 */
export function computePriceBracketDistribution(
  records: ApartmentStatRecord[]
): PriceBracketComparisonItem[] {
  const d1Records = records.filter((r) => classifyDongtanRegion(r.dong) === '동탄1');
  const d2Records = records.filter((r) => classifyDongtanRegion(r.dong) === '동탄2');

  const d1Total = d1Records.length;
  const d2Total = d2Records.length;

  return PRICE_BRACKET_CONFIGS.map((cfg) => {
    const d1Matched = d1Records
      .filter((r) => isRecordInPriceBracket(r, cfg.minWon, cfg.maxWon))
      .sort((a, b) => b.txCount - a.txCount || b.latestPriceWon - a.latestPriceWon);

    const d2Matched = d2Records
      .filter((r) => isRecordInPriceBracket(r, cfg.minWon, cfg.maxWon))
      .sort((a, b) => b.txCount - a.txCount || b.latestPriceWon - a.latestPriceWon);

    const toSample = (r: ApartmentStatRecord): BracketSampleComplex => {
      const price = r.latestPriceWon > 0 ? r.latestPriceWon : r.avgPriceWon;
      return {
        name: r.name,
        dong: r.dong,
        latestPriceWon: price,
        latestPriceEokText: formatPriceEokCompact(price),
        pyeongPriceManwon: Math.round(r.avgPricePerPyeongWon / 10_000),
        canonicalSlug: resolveStatsComplexCanonicalSlug(r.name, r.dong),
      };
    };

    return {
      bracketId: cfg.bracketId,
      shortLabel: cfg.shortLabel,
      rangeLabel: cfg.rangeLabel,
      minWon: cfg.minWon,
      maxWon: cfg.maxWon,
      dongtan1Count: d1Matched.length,
      dongtan1SharePercent:
        d1Total > 0 ? Math.round((d1Matched.length / d1Total) * 1000) / 10 : 0,
      dongtan1Samples: d1Matched.slice(0, 3).map(toSample),
      dongtan2Count: d2Matched.length,
      dongtan2SharePercent:
        d2Total > 0 ? Math.round((d2Matched.length / d2Total) * 1000) / 10 : 0,
      dongtan2Samples: d2Matched.slice(0, 3).map(toSample),
    };
  });
}

/**
 * Computes legal dong house price rankings across Dongtan 1 (3 dongs) and Dongtan 2 (8 dongs)
 */
export function computeLegalDongPriceRankings(
  records: ApartmentStatRecord[]
): LegalDongPriceSummary[] {
  const allDongs = [...DONGTAN_1_LEGAL_DONGS, ...DONGTAN_2_LEGAL_DONGS];
  const summaries: LegalDongPriceSummary[] = [];

  for (const dong of allDongs) {
    const dongRecords = records.filter((r) => {
      const normDong = r.dong === '오산동' ? '여울동' : r.dong;
      return normDong === dong;
    });

    if (dongRecords.length === 0) continue;

    const regionId = classifyDongtanRegion(dong);
    const complexCount = dongRecords.length;
    const txVolume1Y = dongRecords.reduce((sum, r) => sum + r.txCount, 0);

    const weightedAvgPriceWon =
      txVolume1Y > 0
        ? Math.round(
            dongRecords.reduce((sum, r) => sum + r.avgPriceWon * r.txCount, 0) / txVolume1Y
          )
        : Math.round(dongRecords.reduce((sum, r) => sum + r.avgPriceWon, 0) / complexCount);

    const weightedAvgPyeongWon =
      txVolume1Y > 0
        ? Math.round(
            dongRecords.reduce((sum, r) => sum + r.avgPricePerPyeongWon * r.txCount, 0) /
              txVolume1Y
          )
        : Math.round(
            dongRecords.reduce((sum, r) => sum + r.avgPricePerPyeongWon, 0) / complexCount
          );

    const avgLatestPriceWon = Math.round(
      dongRecords.reduce(
        (sum, r) => sum + (r.latestPriceWon > 0 ? r.latestPriceWon : r.avgPriceWon),
        0
      ) / complexCount
    );

    let flagship = dongRecords[0];
    for (const r of dongRecords) {
      const p = r.latestPriceWon > 0 ? r.latestPriceWon : r.avgPriceWon;
      const fp = flagship.latestPriceWon > 0 ? flagship.latestPriceWon : flagship.avgPriceWon;
      if (p > fp) flagship = r;
    }

    const maxLatestPriceWon =
      flagship.latestPriceWon > 0 ? flagship.latestPriceWon : flagship.avgPriceWon;

    summaries.push({
      dong,
      regionId,
      complexCount,
      txVolume1Y,
      weightedAvgPriceWon,
      weightedAvgPriceEokText: formatPriceEokCompact(weightedAvgPriceWon),
      weightedAvgPyeongManwon: Math.round(weightedAvgPyeongWon / 10_000),
      avgLatestPriceWon,
      avgLatestPriceEokText: formatPriceEokCompact(avgLatestPriceWon),
      maxLatestPriceWon,
      maxLatestPriceEokText: formatPriceEokCompact(maxLatestPriceWon),
      flagshipComplexName: flagship.name,
      flagshipComplexSlug: resolveStatsComplexCanonicalSlug(flagship.name, flagship.dong),
    });
  }

  return summaries.sort((a, b) => b.weightedAvgPriceWon - a.weightedAvgPriceWon);
}

const RIVAL_MATCHUP_SPECS: ReadonlyArray<{
  matchupId: string;
  themeBadge: string;
  matchupTitle: string;
  matchupDescription: string;
  dongtan1Name: string;
  dongtan2Name: string;
  relatedGuideSlug: string;
  relatedGuideTitle: string;
}> = [
  {
    matchupId: 'landmark-flagship',
    themeBadge: '권역 최고가 랜드마크 대결',
    matchupTitle: '메타폴리스 (동탄1 대장) vs 동탄역 롯데캐슬 (동탄2 대장)',
    matchupDescription:
      '동탄1 센트럴파크·타임테라스 초고층 주상복합 랜드마크와 동탄2 GTX-A 초역세권 백화점 직결 대장주의 실거래 집값 비교',
    dongtan1Name: '메타폴리스',
    dongtan2Name: '동탄역 롯데캐슬',
    relatedGuideSlug: 'dongtan-1-vs-2-comparison',
    relatedGuideTitle: '동탄1신도시 vs 동탄2신도시 전방위 입지·실거래 비교 리포트',
  },
  {
    matchupId: 'sibeom-prime',
    themeBadge: '시범단지 핵심 입지 대결',
    matchupTitle: '솔빛마을 서해그랑블 (동탄1) vs 동탄역 시범 우남퍼스트빌 (동탄2)',
    matchupDescription:
      '동탄1 학원가·솔빛학군 대장주와 동탄2 청계동 시범단지 초역세권 대표 단지의 실거래 매매가·평당가 격차',
    dongtan1Name: '솔빛마을 서해그랑블',
    dongtan2Name: '동탄역 시범 우남퍼스트빌',
    relatedGuideSlug: 'dongtan-station-gbcx-vs-sibeom-comparison',
    relatedGuideTitle: '동탄역 광역비즈니스콤플렉스 vs 시범단지 심층 비교 리포트',
  },
  {
    matchupId: 'school-zone-rival',
    themeBadge: '초품아·명문 학군지 대결',
    matchupTitle: '시범한빛마을 동탄아이파크 (동탄1) vs 동탄역 시범 리슈빌 (동탄2)',
    matchupDescription:
      '반송동 한빛초·중·고 트리플 학군 핵심 단지와 청계동 중앙공원·시범 학군 단지의 30평대 실수요 집값 비교',
    dongtan1Name: '시범한빛마을 동탄아이파크',
    dongtan2Name: '동탄역 시범 리슈빌',
    relatedGuideSlug: 'dongtan-school-zone-top-apartments',
    relatedGuideTitle: '동탄 학군·초품아 핵심 단지 시세 및 통학 입지 분석',
  },
  {
    matchupId: 'park-lake-lifestyle',
    themeBadge: '센트럴파크 vs 호수공원 대결',
    matchupTitle: '시범다은마을 월드메르디앙 반도유보라 (동탄1) vs 동탄 더샵 레이크에듀타운 (동탄2)',
    matchupDescription:
      '동탄1 센트럴파크 평지 대단지와 동탄2 동탄호수공원 초품아 대장주 간 실거주 매매가 및 거래 회전율 비교',
    dongtan1Name: '시범다은마을 월드메르디앙 반도유보라',
    dongtan2Name: '동탄 더샵 레이크에듀타운',
    relatedGuideSlug: 'dongtan-lake-vs-station-comparison',
    relatedGuideTitle: '동탄호수공원권 vs 동탄역세권 실거래 및 라이프스타일 비교',
  },
];

function toRivalComplexSide(record: ApartmentStatRecord): RivalComplexSide {
  const latestPrice = record.latestPriceWon > 0 ? record.latestPriceWon : record.avgPriceWon;
  const rawLatestPyeong = record.latestPricePerPyeongWon ?? 0;
  const latestPyeong =
    rawLatestPyeong > 0 ? rawLatestPyeong : record.avgPricePerPyeongWon;

  return {
    name: record.name,
    dong: record.dong,
    regionId: classifyDongtanRegion(record.dong),
    canonicalSlug: resolveStatsComplexCanonicalSlug(record.name, record.dong),
    avgPriceWon: record.avgPriceWon,
    avgPriceEokText: formatPriceEokCompact(record.avgPriceWon),
    latestPriceWon: latestPrice,
    latestPriceEokText: formatPriceEokCompact(latestPrice),
    pyeongPriceManwon: Math.round(record.avgPricePerPyeongWon / 10_000),
    latestPyeongPriceManwon: Math.round(latestPyeong / 10_000),
    txCount: record.txCount,
    builtYear: record.builtYear,
    householdCount: record.householdCount,
    exclusiveAreaAvgM2: record.exclusiveAreaAvgM2,
    distanceToStationMeters: record.distanceToStationMeters,
    latestContractDateShort: formatShortContractDate(record.latestContractDate),
  };
}

/**
 * Computes 1:1 Flagship Rival Complex Matchups from verified master records
 */
export function computeFlagshipRivalMatchups(
  allRecords: ApartmentStatRecord[] = MASTER_RECORDS
): FlagshipRivalMatchup[] {
  const byName = new Map<string, ApartmentStatRecord>();
  for (const r of allRecords) {
    byName.set(r.name, r);
  }

  const matchups: FlagshipRivalMatchup[] = [];

  for (const spec of RIVAL_MATCHUP_SPECS) {
    const d1Rec = byName.get(spec.dongtan1Name);
    const d2Rec = byName.get(spec.dongtan2Name);
    if (!d1Rec || !d2Rec) continue;

    const d1Side = toRivalComplexSide(d1Rec);
    const d2Side = toRivalComplexSide(d2Rec);

    const latestPriceGapWon = d2Side.latestPriceWon - d1Side.latestPriceWon;
    const avgPriceGapWon = d2Side.avgPriceWon - d1Side.avgPriceWon;
    const pyeongPriceGapManwon = d2Side.pyeongPriceManwon - d1Side.pyeongPriceManwon;

    matchups.push({
      matchupId: spec.matchupId,
      themeBadge: spec.themeBadge,
      matchupTitle: spec.matchupTitle,
      matchupDescription: spec.matchupDescription,
      dongtan1Complex: d1Side,
      dongtan2Complex: d2Side,
      latestPriceGapWon,
      latestPriceGapEokText: formatSignedPriceEok(latestPriceGapWon),
      avgPriceGapWon,
      avgPriceGapEokText: formatSignedPriceEok(avgPriceGapWon),
      pyeongPriceGapManwon,
      relatedGuideSlug: spec.relatedGuideSlug,
      relatedGuideTitle: spec.relatedGuideTitle,
    });
  }

  return matchups;
}

/**
 * Builds bidirectional Comparison Guide Bridge items connecting `/stats` <-> `/guide/[slug]`
 */
export function buildComparisonGuideBridgeItems(
  dongtan1: DongtanRegionPriceSummary,
  dongtan2: DongtanRegionPriceSummary,
  delta: Dongtan1Vs2PriceDelta,
  allRecords: ApartmentStatRecord[] = MASTER_RECORDS
): ComparisonGuideBridgeItem[] {
  const hasBothRegions = dongtan1.complexCount > 0 && dongtan2.complexCount > 0;
  const masterD1 =
    dongtan1.complexCount > 0 ? dongtan1 : computeRegionPriceSummary(MASTER_RECORDS, '동탄1');
  const masterD2 =
    dongtan2.complexCount > 0 ? dongtan2 : computeRegionPriceSummary(MASTER_RECORDS, '동탄2');
  const masterDelta = hasBothRegions ? delta : computeDongtan1Vs2Delta(masterD1, masterD2);

  // Dynamically derive station vs lake flagship prices from real records
  const stationRecords = allRecords.filter((r) => {
    const d = r.dong === '오산동' ? '여울동' : r.dong;
    return d === '여울동' || d === '청계동';
  });
  const lakeRecords = allRecords.filter(
    (r) => r.dong === '송동' || r.dong === '산척동' || r.dong === '장지동'
  );
  const stationMaxWon = stationRecords.reduce(
    (max, r) => Math.max(max, r.latestPriceWon > 0 ? r.latestPriceWon : r.avgPriceWon),
    0
  );
  const lakeMaxWon = lakeRecords.reduce(
    (max, r) => Math.max(max, r.latestPriceWon > 0 ? r.latestPriceWon : r.avgPriceWon),
    0
  );
  const stationLakeLabel =
    stationMaxWon > 0 && lakeMaxWon > 0
      ? `역세권 대장 ${formatPriceEokCompact(stationMaxWon)} vs 호수권 대장 ${formatPriceEokCompact(lakeMaxWon)} 실거래 비교`
      : '동탄역세권 vs 동탄호수공원권 대장 단지 실거래 비교';

  return [
    {
      slug: 'dongtan-1-vs-2-comparison',
      badge: '핵심 VS 분석글 연동',
      category: '지역비교',
      title: '동탄1신도시 vs 동탄2신도시 전방위 입지·실거래 비교: 내 예산과 라이프스타일에 맞는 선택은?',
      summary:
        '반송·석우·능동 완성형 인프라와 청계·여울·송동·산척 GTX-A 신축 생활권의 실거래 집값, 연식, 학군, 출퇴근 동선을 1:1로 해부한 심층 가이드입니다.',
      highlightStatLabel: `동탄1 평균 ${masterD1.weightedAvgPriceEokText} vs 동탄2 평균 ${masterD2.weightedAvgPriceEokText} (${masterDelta.weightedPriceDiffEokText} 격차)`,
      isPrimaryComparison: true,
    },
    {
      slug: 'dongtan-lake-vs-station-comparison',
      badge: '권역 라이벌 비교',
      category: '지역비교',
      title: '동탄호수공원권 vs 동탄역세권 완벽 비교: 수변 라이프와 GTX 초역세권 중 어디가 유리할까?',
      summary:
        '동탄2 내부에서도 가장 치열하게 대립하는 동탄역 도보권(청계·여울)과 호수공원 수변권(송동·산척·장지)의 집값 및 실거주 만족도를 비교합니다.',
      highlightStatLabel: stationLakeLabel,
      isPrimaryComparison: false,
    },
    {
      slug: 'dongtan-station-gbcx-vs-sibeom-comparison',
      badge: '대장권역 VS 비교',
      category: '지역비교',
      title: '동탄역 광역비즈니스콤플렉스 vs 시범단지 심층 비교: 주상복합과 초품아 학군지의 선택 기준',
      summary:
        '동탄역 초근접 주상복합 벨트와 청계중앙공원 시범단지 간 평당가, 관리비, 대지지분, 초등학교 통학 환경을 객관적 수치로 대조합니다.',
      highlightStatLabel: '여울동·청계동 초역세권 핵심 단지 1:1 시세 대조',
      isPrimaryComparison: false,
    },
    {
      slug: 'dongtan-budget-tier-ranking',
      badge: '예산별 집값 가이드',
      category: '실거래분석',
      title: '예산별(6억·9억·12억+) 동탄 아파트 매수 전략: 자금 규모별 최선호 단지 실거래 집중 분석',
      summary:
        '가용 예산 구간별로 동탄1 실속 대단지와 동탄2 신축 역세권 중 어떤 단지를 선택할 수 있는지 실거래가 분포로 안내합니다.',
      highlightStatLabel: `동탄1 최저 ${masterD1.minLatestPriceEokText}~ vs 동탄2 최저 ${masterD2.minLatestPriceEokText}~ 구간별 분석`,
      isPrimaryComparison: false,
    },
  ];
}

const comparisonCache = new Map<AreaBandFilter, Dongtan1Vs2ComparisonPayload>();

/**
 * Main entrypoint for Dongtan 1 vs Dongtan 2 House Price Comparison Analysis
 */
export function getDongtan1Vs2ComparisonData(
  areaBand: AreaBandFilter = 'all',
  customRecords?: ApartmentStatRecord[]
): Dongtan1Vs2ComparisonPayload {
  const resolvedBand: AreaBandFilter = areaBand || 'all';
  if (!customRecords && comparisonCache.has(resolvedBand)) {
    return comparisonCache.get(resolvedBand)!;
  }

  const sourceRecords = customRecords ?? MASTER_RECORDS;
  const filteredRecords = filterRecordsByAreaBand(sourceRecords, resolvedBand);

  const dongtan1 = computeRegionPriceSummary(filteredRecords, '동탄1');
  const dongtan2 = computeRegionPriceSummary(filteredRecords, '동탄2');
  const delta = computeDongtan1Vs2Delta(dongtan1, dongtan2);
  const priceBrackets = computePriceBracketDistribution(filteredRecords);
  const dongRankings = computeLegalDongPriceRankings(filteredRecords);
  const rivalMatchups = computeFlagshipRivalMatchups(sourceRecords);
  const comparisonGuides = buildComparisonGuideBridgeItems(dongtan1, dongtan2, delta, sourceRecords);

  const payload: Dongtan1Vs2ComparisonPayload = {
    areaBand: resolvedBand,
    datasetMeta: MASTER_DATASET_META,
    dongtan1,
    dongtan2,
    delta,
    priceBrackets,
    dongRankings,
    rivalMatchups,
    comparisonGuides,
  };

  if (!customRecords) {
    comparisonCache.set(resolvedBand, payload);
  }

  return payload;
}
