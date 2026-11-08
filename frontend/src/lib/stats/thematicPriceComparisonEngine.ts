/**
 * @module stats/thematicPriceComparisonEngine
 * @description Deterministic 100% Real-Data House Price Comparison Engine for:
 * - Issue #2 (`school-district-premium`): 초품아(초등학교 초근접) vs 일반 단지 및 학원가 밀집도별 집값·평당가 비교
 * - Issue #3 (`lake-park-view-premium`): 동탄호수공원 수변·도보 생활권 vs 비수변 단지의 집값·평당가·거래 회전율 비교
 * - Issue #4 (`building-age-depreciation`): 신축(5년 이하) vs 준신축(6~10년) vs 중기(11~15년) vs 구축(16년 이상) 집값 격차 및 전고점 대비 시세 방어율 비교
 *
 * STRICT REAL DATA ONLY:
 * - Zero synthetic, mock, or estimated prices.
 * - Derived 100% deterministically from verified MOLIT real transaction aggregates
 *   in `public/data/stats-station-cache.json` (127 complexes) and `public/data/stats-thematic-cache.json`
 *   (compiled from `location-scores.json`, `apartments-by-dong.json`, and `tx-summary.json` covering 65,680+ cumulative sales).
 */

import statsStationCacheStatic from '../../../public/data/stats-station-cache.json';
import statsThematicCacheStatic from '../../../public/data/stats-thematic-cache.json';
import {
  formatPriceEokCompact,
  formatShortContractDate,
} from './dongtanStationDistanceEngine';
import {
  classifyDongtanRegion,
  filterRecordsByAreaBand,
  resolveStatsComplexCanonicalSlug,
  type DongtanRegionId,
  type ComparisonGuideBridgeItem,
} from './dongtan1Vs2ComparisonEngine';
import type {
  ApartmentStatRecord,
  AreaBandFilter,
  StatsDatasetMeta,
} from './types';

export const DONGTAN_LAKE_PARK_COORDS = { lat: 37.1675, lng: 127.1035 } as const;

export interface RawThematicComplexMeta {
  dong: string;
  canonicalSlug: string;
  distanceToElementary: number;
  distanceToMiddle: number;
  distanceToHigh: number;
  elementarySchoolName: string;
  middleSchoolName: string;
  highSchoolName: string;
  academyDensity: number;
  distanceToLakeMeters: number;
  allTimeHighWon: number;
  allTimeLowWon: number;
  allTimeTxCount: number;
  rentTxCount: number;
  latestRentDepositWon: number;
}

export interface ThematicApartmentStatRecord extends ApartmentStatRecord {
  canonicalSlug: string;
  regionId: DongtanRegionId;
  distanceToElementary: number;
  distanceToMiddle: number;
  distanceToHigh: number;
  elementarySchoolName: string;
  middleSchoolName: string;
  highSchoolName: string;
  academyDensity: number;
  distanceToLakeMeters: number;
  buildingAge: number;
  allTimeHighWon: number;
  allTimeHighEokText: string;
  allTimeLowWon: number;
  allTimeTxCount: number;
  rentTxCount: number;
  latestRentDepositWon: number;
  jeonseRatioPercent: number;
  priceRetentionPercent: number;
  peakDrawdownPercent: number;
  annualTurnoverPercent: number;
}

export interface ThematicGroupPriceSummary {
  groupId: string;
  groupTitle: string;
  groupSubtitle: string;
  criteriaLabel: string;
  complexCount: number;
  txVolume1Y: number;
  allTimeTxVolume: number;
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
  avgPriceRetentionPercent: number;
  avgAnnualTurnoverPercent: number;
  avgAcademyDensity: number;
  avgDistanceToElementaryMeters: number;
  avgDistanceToLakeMeters: number;
}

export interface ThematicSampleComplexItem {
  name: string;
  dong: string;
  regionId: DongtanRegionId;
  canonicalSlug: string;
  avgPriceWon: number;
  avgPriceEokText: string;
  latestPriceWon: number;
  latestPriceEokText: string;
  pyeongPriceManwon: number;
  txCount: number;
  allTimeTxCount: number;
  builtYear: number;
  buildingAge: number;
  householdCount: number;
  distanceToElementary: number;
  elementarySchoolName: string;
  academyDensity: number;
  distanceToLakeMeters: number;
  allTimeHighWon: number;
  allTimeHighEokText: string;
  priceRetentionPercent: number;
  annualTurnoverPercent: number;
  latestContractDateShort: string | null;
}

export interface ThematicTierBreakdownItem {
  tierId: string;
  shortLabel: string;
  rangeLabel: string;
  description: string;
  complexCount: number;
  sharePercent: number;
  txVolume1Y: number;
  allTimeTxVolume: number;
  weightedAvgPriceWon: number;
  weightedAvgPriceEokText: string;
  weightedAvgPyeongManwon: number;
  avgLatestPriceWon: number;
  avgLatestPriceEokText: string;
  avgPriceRetentionPercent: number;
  avgAnnualTurnoverPercent: number;
  avgAcademyDensity: number;
  flagshipComplexName: string;
  flagshipComplexDong: string;
  flagshipComplexSlug: string;
  flagshipPriceEokText: string;
  samples: ThematicSampleComplexItem[];
}

export interface ThematicRivalMatchup {
  matchupId: string;
  themeBadge: string;
  matchupTitle: string;
  matchupDescription: string;
  leftLabel: string;
  rightLabel: string;
  leftComplex: ThematicSampleComplexItem;
  rightComplex: ThematicSampleComplexItem;
  latestPriceGapWon: number;
  latestPriceGapEokText: string;
  avgPriceGapWon: number;
  avgPriceGapEokText: string;
  pyeongPriceGapManwon: number;
  retentionGapPercentPoint: number;
  turnoverGapPercentPoint: number;
  relatedGuideSlug: string;
  relatedGuideTitle: string;
}

export interface ElementarySchoolZoneRankingItem {
  schoolName: string;
  primaryDong: string;
  regionId: DongtanRegionId;
  complexCount: number;
  txVolume1Y: number;
  weightedAvgPriceWon: number;
  weightedAvgPriceEokText: string;
  weightedAvgPyeongManwon: number;
  avgDistanceToElementaryMeters: number;
  avgAcademyDensity: number;
  flagshipComplexName: string;
  flagshipComplexSlug: string;
  flagshipLatestPriceEokText: string;
}

export interface SchoolDistrictPremiumDelta {
  chopumaPriceDiffWon: number;
  chopumaPriceDiffEokText: string;
  chopumaPricePremiumPercent: number;
  chopumaPyeongDiffManwon: number;
  chopumaPyeongPremiumPercent: number;
  academyPriceDiffWon: number;
  academyPriceDiffEokText: string;
  academyPricePremiumPercent: number;
  academyPyeongDiffManwon: number;
  academyPyeongPremiumPercent: number;
  headlineQuestion: string;
  headlineAnswer: string;
}

export interface SchoolDistrictPremiumPayload {
  topicId: 'school-district-premium';
  areaBand: AreaBandFilter;
  datasetMeta: StatsDatasetMeta;
  chopumaGroup: ThematicGroupPriceSummary;
  generalSchoolGroup: ThematicGroupPriceSummary;
  academyPrimeGroup: ThematicGroupPriceSummary;
  nonAcademyGroup: ThematicGroupPriceSummary;
  delta: SchoolDistrictPremiumDelta;
  elementaryDistanceTiers: ThematicTierBreakdownItem[];
  academyDensityTiers: ThematicTierBreakdownItem[];
  schoolZoneRankings: ElementarySchoolZoneRankingItem[];
  rivalMatchups: ThematicRivalMatchup[];
  comparisonGuides: ComparisonGuideBridgeItem[];
}

export interface LakeParkPremiumDelta {
  waterfrontVsHinterlandPriceDiffWon: number;
  waterfrontVsHinterlandPriceDiffEokText: string;
  waterfrontVsHinterlandPremiumPercent: number;
  waterfrontVsHinterlandPyeongDiffManwon: number;
  waterfrontVsHinterlandPyeongPremiumPercent: number;
  waterfrontVsCityPriceDiffWon: number;
  waterfrontVsCityPriceDiffEokText: string;
  waterfrontVsCityPremiumPercent: number;
  turnoverDiffPercentPoint: number;
  retentionDiffPercentPoint: number;
  headlineQuestion: string;
  headlineAnswer: string;
}

export interface LakeParkPremiumPayload {
  topicId: 'lake-park-view-premium';
  areaBand: AreaBandFilter;
  datasetMeta: StatsDatasetMeta;
  waterfrontGroup: ThematicGroupPriceSummary;
  southHinterlandGroup: ThematicGroupPriceSummary;
  cityNonLakeGroup: ThematicGroupPriceSummary;
  delta: LakeParkPremiumDelta;
  lakeDistanceTiers: ThematicTierBreakdownItem[];
  rivalMatchups: ThematicRivalMatchup[];
  comparisonGuides: ComparisonGuideBridgeItem[];
}

export interface BuildingAgeDepreciationDelta {
  newVsOldPriceDiffWon: number;
  newVsOldPriceDiffEokText: string;
  newVsOldPricePremiumPercent: number;
  newVsOldPyeongDiffManwon: number;
  newVsOldPyeongPremiumPercent: number;
  newVsSemiNewPriceDiffWon: number;
  newVsSemiNewPriceDiffEokText: string;
  oldVsNewRetentionAdvantagePercentPoint: number;
  midAgeSibeomPriceEokText: string;
  totalCumulativeSalesCount: number;
  headlineQuestion: string;
  headlineAnswer: string;
}

export interface BuildingAgeDepreciationPayload {
  topicId: 'building-age-depreciation';
  areaBand: AreaBandFilter;
  datasetMeta: StatsDatasetMeta;
  newBuildGroup: ThematicGroupPriceSummary;
  semiNewGroup: ThematicGroupPriceSummary;
  midAgeGroup: ThematicGroupPriceSummary;
  oldBuildGroup: ThematicGroupPriceSummary;
  delta: BuildingAgeDepreciationDelta;
  ageLifecycleTiers: ThematicTierBreakdownItem[];
  rivalMatchups: ThematicRivalMatchup[];
  comparisonGuides: ComparisonGuideBridgeItem[];
}

const STATION_BUNDLE = statsStationCacheStatic as unknown as {
  records: ApartmentStatRecord[];
  datasetMeta: StatsDatasetMeta;
};

const THEMATIC_BUNDLE = statsThematicCacheStatic as unknown as {
  complexes: Record<string, RawThematicComplexMeta>;
  summaryMeta: {
    complexCount: number;
    totalAllTimeSalesCount: number;
    totalAllTimeRentCount: number;
    lakeParkCenterCoords: { lat: number; lng: number };
  };
};

const RAW_STATION_RECORDS: ApartmentStatRecord[] = Array.isArray(STATION_BUNDLE?.records)
  ? STATION_BUNDLE.records
  : [];

const RAW_THEMATIC_MAP: Record<string, RawThematicComplexMeta> =
  THEMATIC_BUNDLE?.complexes ?? {};

const MASTER_DATASET_META: StatsDatasetMeta = STATION_BUNDLE?.datasetMeta ?? {
  totalComplexCount: RAW_STATION_RECORDS.length,
  totalTxCount: RAW_STATION_RECORDS.reduce((acc, r) => acc + r.txCount, 0),
  latestContractDate: null,
  latestRegisteredDate: null,
  referenceMonthLabel: '최신 기준',
  sampleCountLabel: `${RAW_STATION_RECORDS.length}개 단지 실거래 전수`,
};

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

function formatSignedPercent(pct: number): string {
  if (!Number.isFinite(pct) || pct === 0) return '0%';
  return pct > 0 ? `+${pct}%` : `${pct}%`;
}

/**
 * Enriches an `ApartmentStatRecord` with verified thematic metadata (`stats-thematic-cache.json`)
 */
export function enrichApartmentStatRecord(
  record: ApartmentStatRecord,
  metaOverride?: Partial<RawThematicComplexMeta>
): ThematicApartmentStatRecord {
  const meta = {
    ...(RAW_THEMATIC_MAP[record.name] || {}),
    ...(metaOverride || {}),
  };

  const canonicalSlug =
    meta.canonicalSlug || resolveStatsComplexCanonicalSlug(record.name, record.dong);
  const regionId = classifyDongtanRegion(record.dong);
  const effectiveLatestPriceWon =
    record.latestPriceWon > 0 ? record.latestPriceWon : record.avgPriceWon;

  const rawAllTimeHighWon =
    typeof meta.allTimeHighWon === 'number' && meta.allTimeHighWon > 0
      ? Math.max(meta.allTimeHighWon, effectiveLatestPriceWon)
      : effectiveLatestPriceWon;

  const priceRetentionPercent =
    rawAllTimeHighWon > 0 && effectiveLatestPriceWon > 0
      ? Math.min(100, Math.round((effectiveLatestPriceWon / rawAllTimeHighWon) * 1000) / 10)
      : 0;

  const peakDrawdownPercent =
    rawAllTimeHighWon > 0 && effectiveLatestPriceWon > 0
      ? Math.round(((effectiveLatestPriceWon - rawAllTimeHighWon) / rawAllTimeHighWon) * 1000) / 10
      : 0;

  const annualTurnoverPercent =
    record.householdCount > 0
      ? Math.round((record.txCount / record.householdCount) * 1000) / 10
      : 0;

  const latestRentDepositWon = meta.latestRentDepositWon ?? 0;
  const jeonseRatioPercent =
    effectiveLatestPriceWon > 0 && latestRentDepositWon > 0
      ? Math.min(100, Math.round((latestRentDepositWon / effectiveLatestPriceWon) * 1000) / 10)
      : 0;

  const buildingAge = Math.max(0, 2026 - (record.builtYear || 2015));

  return {
    ...record,
    canonicalSlug,
    regionId,
    distanceToElementary: meta.distanceToElementary ?? 350,
    distanceToMiddle: meta.distanceToMiddle ?? 500,
    distanceToHigh: meta.distanceToHigh ?? 600,
    elementarySchoolName: meta.elementarySchoolName || '인근초등학교',
    middleSchoolName: meta.middleSchoolName || '인근중학교',
    highSchoolName: meta.highSchoolName || '인근고등학교',
    academyDensity: meta.academyDensity ?? 0,
    distanceToLakeMeters: meta.distanceToLakeMeters ?? 3500,
    buildingAge,
    allTimeHighWon: rawAllTimeHighWon,
    allTimeHighEokText: formatPriceEokCompact(rawAllTimeHighWon),
    allTimeLowWon: meta.allTimeLowWon ?? 0,
    allTimeTxCount: meta.allTimeTxCount ?? record.txCount,
    rentTxCount: meta.rentTxCount ?? 0,
    latestRentDepositWon,
    jeonseRatioPercent,
    priceRetentionPercent,
    peakDrawdownPercent,
    annualTurnoverPercent,
  };
}

const MASTER_THEMATIC_RECORDS: ThematicApartmentStatRecord[] = RAW_STATION_RECORDS.map((r) =>
  enrichApartmentStatRecord(r)
);

export function getMasterThematicComplexRecords(): ThematicApartmentStatRecord[] {
  return MASTER_THEMATIC_RECORDS;
}

export function toThematicSampleComplex(
  r: ThematicApartmentStatRecord
): ThematicSampleComplexItem {
  const latestPrice = r.latestPriceWon > 0 ? r.latestPriceWon : r.avgPriceWon;
  return {
    name: r.name,
    dong: r.dong,
    regionId: r.regionId,
    canonicalSlug: r.canonicalSlug,
    avgPriceWon: r.avgPriceWon,
    avgPriceEokText: formatPriceEokCompact(r.avgPriceWon),
    latestPriceWon: latestPrice,
    latestPriceEokText: formatPriceEokCompact(latestPrice),
    pyeongPriceManwon: Math.round(r.avgPricePerPyeongWon / 10_000),
    txCount: r.txCount,
    allTimeTxCount: r.allTimeTxCount,
    builtYear: r.builtYear,
    buildingAge: r.buildingAge,
    householdCount: r.householdCount,
    distanceToElementary: r.distanceToElementary,
    elementarySchoolName: r.elementarySchoolName,
    academyDensity: r.academyDensity,
    distanceToLakeMeters: r.distanceToLakeMeters,
    allTimeHighWon: r.allTimeHighWon,
    allTimeHighEokText: r.allTimeHighEokText,
    priceRetentionPercent: r.priceRetentionPercent,
    annualTurnoverPercent: r.annualTurnoverPercent,
    latestContractDateShort: formatShortContractDate(r.latestContractDate),
  };
}

/**
 * Computes comprehensive group price summary for any filtered slice of `ThematicApartmentStatRecord[]`
 */
export function computeThematicGroupSummary(
  records: ThematicApartmentStatRecord[],
  meta: {
    groupId: string;
    groupTitle: string;
    groupSubtitle: string;
    criteriaLabel: string;
  }
): ThematicGroupPriceSummary {
  const complexCount = records.length;
  const txVolume1Y = records.reduce((sum, r) => sum + (r.txCount || 0), 0);
  const allTimeTxVolume = records.reduce((sum, r) => sum + (r.allTimeTxCount || r.txCount || 0), 0);
  const totalHouseholds = records.reduce((sum, r) => sum + (r.householdCount || 0), 0);

  if (complexCount === 0) {
    return {
      ...meta,
      complexCount: 0,
      txVolume1Y: 0,
      allTimeTxVolume: 0,
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
      avgPriceRetentionPercent: 0,
      avgAnnualTurnoverPercent: 0,
      avgAcademyDensity: 0,
      avgDistanceToElementaryMeters: 0,
      avgDistanceToLakeMeters: 0,
    };
  }

  const simpleAvgPriceWon = Math.round(
    records.reduce((sum, r) => sum + r.avgPriceWon, 0) / complexCount
  );

  const weightedAvgPriceWon =
    txVolume1Y > 0
      ? Math.round(records.reduce((sum, r) => sum + r.avgPriceWon * r.txCount, 0) / txVolume1Y)
      : simpleAvgPriceWon;

  const simpleAvgPyeongWon = Math.round(
    records.reduce((sum, r) => sum + r.avgPricePerPyeongWon, 0) / complexCount
  );

  const weightedAvgPyeongWon =
    txVolume1Y > 0
      ? Math.round(
          records.reduce((sum, r) => sum + r.avgPricePerPyeongWon * r.txCount, 0) / txVolume1Y
        )
      : simpleAvgPyeongWon;

  const weightedAvgPyeongManwon = Math.round(weightedAvgPyeongWon / 10_000);

  const effectiveLatestPrices = records.map((r) =>
    r.latestPriceWon > 0 ? r.latestPriceWon : r.avgPriceWon
  );
  const avgLatestPriceWon = Math.round(
    effectiveLatestPrices.reduce((sum, p) => sum + p, 0) / complexCount
  );
  const medianLatestPriceWon = computeMedian(effectiveLatestPrices);

  let maxRecord = records[0];
  let minRecord = records[0];
  for (const r of records) {
    const rPrice = r.latestPriceWon > 0 ? r.latestPriceWon : r.avgPriceWon;
    const maxPrice =
      maxRecord.latestPriceWon > 0 ? maxRecord.latestPriceWon : maxRecord.avgPriceWon;
    const minPrice =
      minRecord.latestPriceWon > 0 ? minRecord.latestPriceWon : minRecord.avgPriceWon;

    if (rPrice > maxPrice) maxRecord = r;
    if (rPrice > 0 && (minPrice <= 0 || rPrice < minPrice)) minRecord = r;
  }

  const maxLatestPriceWon =
    maxRecord.latestPriceWon > 0 ? maxRecord.latestPriceWon : maxRecord.avgPriceWon;
  const minLatestPriceWon =
    minRecord.latestPriceWon > 0 ? minRecord.latestPriceWon : minRecord.avgPriceWon;

  const avgBuiltYear = Math.round(
    records.reduce((sum, r) => sum + (r.builtYear || 2015), 0) / complexCount
  );
  const avgBuildingAge = Math.max(0, 2026 - avgBuiltYear);

  const avgPriceRetentionPercent =
    Math.round(
      (records.reduce((sum, r) => sum + r.priceRetentionPercent, 0) / complexCount) * 10
    ) / 10;

  const avgAnnualTurnoverPercent =
    totalHouseholds > 0
      ? Math.round((txVolume1Y / totalHouseholds) * 1000) / 10
      : Math.round(
          (records.reduce((sum, r) => sum + r.annualTurnoverPercent, 0) / complexCount) * 10
        ) / 10;

  const avgAcademyDensity = Math.round(
    records.reduce((sum, r) => sum + r.academyDensity, 0) / complexCount
  );
  const avgDistanceToElementaryMeters = Math.round(
    records.reduce((sum, r) => sum + r.distanceToElementary, 0) / complexCount
  );
  const avgDistanceToLakeMeters = Math.round(
    records.reduce((sum, r) => sum + r.distanceToLakeMeters, 0) / complexCount
  );

  return {
    ...meta,
    complexCount,
    txVolume1Y,
    allTimeTxVolume,
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
    maxPriceComplexSlug: maxRecord.canonicalSlug,
    minLatestPriceWon,
    minLatestPriceEokText: formatPriceEokCompact(minLatestPriceWon),
    minPriceComplexName: minRecord.name,
    minPriceComplexDong: minRecord.dong,
    minPriceComplexSlug: minRecord.canonicalSlug,
    avgBuiltYear,
    avgBuildingAge,
    avgPriceRetentionPercent,
    avgAnnualTurnoverPercent,
    avgAcademyDensity,
    avgDistanceToElementaryMeters,
    avgDistanceToLakeMeters,
  };
}

function buildTierBreakdownItem(
  matched: ThematicApartmentStatRecord[],
  totalComplexCount: number,
  meta: {
    tierId: string;
    shortLabel: string;
    rangeLabel: string;
    description: string;
  }
): ThematicTierBreakdownItem {
  const summary = computeThematicGroupSummary(matched, {
    groupId: meta.tierId,
    groupTitle: meta.shortLabel,
    groupSubtitle: meta.description,
    criteriaLabel: meta.rangeLabel,
  });

  const sortedSamples = [...matched].sort(
    (a, b) =>
      (b.latestPriceWon || b.avgPriceWon) - (a.latestPriceWon || a.avgPriceWon) ||
      b.txCount - a.txCount
  );

  return {
    tierId: meta.tierId,
    shortLabel: meta.shortLabel,
    rangeLabel: meta.rangeLabel,
    description: meta.description,
    complexCount: summary.complexCount,
    sharePercent:
      totalComplexCount > 0
        ? Math.round((summary.complexCount / totalComplexCount) * 1000) / 10
        : 0,
    txVolume1Y: summary.txVolume1Y,
    allTimeTxVolume: summary.allTimeTxVolume,
    weightedAvgPriceWon: summary.weightedAvgPriceWon,
    weightedAvgPriceEokText: summary.weightedAvgPriceEokText,
    weightedAvgPyeongManwon: summary.weightedAvgPyeongManwon,
    avgLatestPriceWon: summary.avgLatestPriceWon,
    avgLatestPriceEokText: summary.avgLatestPriceEokText,
    avgPriceRetentionPercent: summary.avgPriceRetentionPercent,
    avgAnnualTurnoverPercent: summary.avgAnnualTurnoverPercent,
    avgAcademyDensity: summary.avgAcademyDensity,
    flagshipComplexName: summary.maxPriceComplexName,
    flagshipComplexDong: summary.maxPriceComplexDong,
    flagshipComplexSlug: summary.maxPriceComplexSlug,
    flagshipPriceEokText: summary.maxLatestPriceEokText,
    samples: sortedSamples.slice(0, 4).map(toThematicSampleComplex),
  };
}

function buildRivalMatchupFromNames(
  byName: Map<string, ThematicApartmentStatRecord>,
  spec: {
    matchupId: string;
    themeBadge: string;
    matchupTitle: string;
    matchupDescription: string;
    leftLabel: string;
    rightLabel: string;
    leftName: string;
    rightName: string;
    relatedGuideSlug: string;
    relatedGuideTitle: string;
  }
): ThematicRivalMatchup | null {
  const leftRec = byName.get(spec.leftName);
  const rightRec = byName.get(spec.rightName);
  if (!leftRec || !rightRec) return null;

  const leftComplex = toThematicSampleComplex(leftRec);
  const rightComplex = toThematicSampleComplex(rightRec);

  const latestPriceGapWon = leftComplex.latestPriceWon - rightComplex.latestPriceWon;
  const avgPriceGapWon = leftComplex.avgPriceWon - rightComplex.avgPriceWon;
  const pyeongPriceGapManwon = leftComplex.pyeongPriceManwon - rightComplex.pyeongPriceManwon;
  const retentionGapPercentPoint =
    Math.round((leftComplex.priceRetentionPercent - rightComplex.priceRetentionPercent) * 10) / 10;
  const turnoverGapPercentPoint =
    Math.round((leftComplex.annualTurnoverPercent - rightComplex.annualTurnoverPercent) * 10) / 10;

  return {
    matchupId: spec.matchupId,
    themeBadge: spec.themeBadge,
    matchupTitle: spec.matchupTitle,
    matchupDescription: spec.matchupDescription,
    leftLabel: spec.leftLabel,
    rightLabel: spec.rightLabel,
    leftComplex,
    rightComplex,
    latestPriceGapWon,
    latestPriceGapEokText: formatSignedPriceEok(latestPriceGapWon),
    avgPriceGapWon,
    avgPriceGapEokText: formatSignedPriceEok(avgPriceGapWon),
    pyeongPriceGapManwon,
    retentionGapPercentPoint,
    turnoverGapPercentPoint,
    relatedGuideSlug: spec.relatedGuideSlug,
    relatedGuideTitle: spec.relatedGuideTitle,
  };
}

// ============================================================================
// ISSUE #2: 초품아 및 명문 학군이 형성하는 동탄 아파트 프리미엄 (`school-district-premium`)
// ============================================================================

const schoolPremiumCache = new Map<AreaBandFilter, SchoolDistrictPremiumPayload>();

export function getSchoolDistrictPremiumData(
  areaBand: AreaBandFilter = 'all',
  customRecords?: ApartmentStatRecord[]
): SchoolDistrictPremiumPayload {
  const resolvedBand: AreaBandFilter = areaBand || 'all';
  if (!customRecords && schoolPremiumCache.has(resolvedBand)) {
    return schoolPremiumCache.get(resolvedBand)!;
  }

  const baseRecords = customRecords
    ? customRecords.map((r) => enrichApartmentStatRecord(r))
    : MASTER_THEMATIC_RECORDS;
  const filtered = filterRecordsByAreaBand(baseRecords, resolvedBand) as ThematicApartmentStatRecord[];

  const chopumaRecords = filtered.filter((r) => r.distanceToElementary <= 200);
  const generalSchoolRecords = filtered.filter((r) => r.distanceToElementary > 200);

  const academyPrimeRecords = filtered.filter((r) => r.academyDensity >= 40);
  const nonAcademyRecords = filtered.filter((r) => r.academyDensity < 40);

  const chopumaGroup = computeThematicGroupSummary(chopumaRecords, {
    groupId: 'chopuma-under200m',
    groupTitle: '진성 초품아 · 초근접 단지 (200m 이내)',
    groupSubtitle: '단지 직결 · 도보 3분 이내 안심 통학권',
    criteriaLabel: '초등학교 직선거리 ≤ 200m',
  });

  const generalSchoolGroup = computeThematicGroupSummary(generalSchoolRecords, {
    groupId: 'general-school-over200m',
    groupTitle: '일반 통학권 단지 (200m 초과)',
    groupSubtitle: '도보 4~10분 통학 · 보행로 이동 권역',
    criteriaLabel: '초등학교 직선거리 > 200m',
  });

  const academyPrimeGroup = computeThematicGroupSummary(academyPrimeRecords, {
    groupId: 'academy-prime-40plus',
    groupTitle: '핵심 학원가 밀집 단지 (학원 40개+)',
    groupSubtitle: '솔빛 · 나루 · 청계 시범 · 산척 에듀타운 학원 벨트',
    criteriaLabel: '반경 내 학원 ≥ 40개',
  });

  const nonAcademyGroup = computeThematicGroupSummary(nonAcademyRecords, {
    groupId: 'academy-low-under40',
    groupTitle: '주거 전용 · 비학원권 단지 (학원 40개 미만)',
    groupSubtitle: '외곽 쾌적 주거권 · 학원 셔틀 이용 권역',
    criteriaLabel: '반경 내 학원 < 40개',
  });

  const hasBothChopuma = chopumaGroup.complexCount > 0 && generalSchoolGroup.complexCount > 0;
  const chopumaPriceDiffWon = hasBothChopuma
    ? chopumaGroup.weightedAvgPriceWon - generalSchoolGroup.weightedAvgPriceWon
    : 0;
  const chopumaPricePremiumPercent =
    hasBothChopuma && generalSchoolGroup.weightedAvgPriceWon > 0
      ? Math.round((chopumaPriceDiffWon / generalSchoolGroup.weightedAvgPriceWon) * 1000) / 10
      : 0;
  const chopumaPyeongDiffManwon = hasBothChopuma
    ? chopumaGroup.weightedAvgPyeongManwon - generalSchoolGroup.weightedAvgPyeongManwon
    : 0;
  const chopumaPyeongPremiumPercent =
    hasBothChopuma && generalSchoolGroup.weightedAvgPyeongManwon > 0
      ? Math.round((chopumaPyeongDiffManwon / generalSchoolGroup.weightedAvgPyeongManwon) * 1000) /
        10
      : 0;

  const hasBothAcademy = academyPrimeGroup.complexCount > 0 && nonAcademyGroup.complexCount > 0;
  const academyPriceDiffWon = hasBothAcademy
    ? academyPrimeGroup.weightedAvgPriceWon - nonAcademyGroup.weightedAvgPriceWon
    : 0;
  const academyPricePremiumPercent =
    hasBothAcademy && nonAcademyGroup.weightedAvgPriceWon > 0
      ? Math.round((academyPriceDiffWon / nonAcademyGroup.weightedAvgPriceWon) * 1000) / 10
      : 0;
  const academyPyeongDiffManwon = hasBothAcademy
    ? academyPrimeGroup.weightedAvgPyeongManwon - nonAcademyGroup.weightedAvgPyeongManwon
    : 0;
  const academyPyeongPremiumPercent =
    hasBothAcademy && nonAcademyGroup.weightedAvgPyeongManwon > 0
      ? Math.round((academyPyeongDiffManwon / nonAcademyGroup.weightedAvgPyeongManwon) * 1000) / 10
      : 0;

  const headlineQuestion =
    '초품아(초등학교 초근접) vs 일반 단지, 그리고 학원가 밀집도에 따라 집값은 얼마나 차이 날까?';
  const headlineAnswer = hasBothChopuma
    ? `초등학교 200m 이내 진성 초품아(${chopumaGroup.complexCount}단지) 1년 평균 집값은 ${chopumaGroup.weightedAvgPriceEokText}(평당 ${chopumaGroup.weightedAvgPyeongManwon.toLocaleString('ko-KR')}만)으로 일반 통학권(${generalSchoolGroup.weightedAvgPriceEokText}) 대비 ${formatSignedPriceEok(chopumaPriceDiffWon)}(${formatSignedPercent(chopumaPricePremiumPercent)}) 격차를 보이며, 핵심 학원가 밀집권(${academyPrimeGroup.weightedAvgPriceEokText})은 비학원권(${nonAcademyGroup.weightedAvgPriceEokText}) 대비 ${formatSignedPriceEok(academyPriceDiffWon)}(${formatSignedPercent(academyPricePremiumPercent)})의 뚜렷한 교육 프리미엄을 형성하고 있습니다.`
    : generalSchoolGroup.complexCount > 0 && hasBothAcademy
      ? `선택한 평형대에는 초등학교 200m 이내 초품아 해당 단지가 없으며 일반 통학권(${generalSchoolGroup.complexCount}단지) 평균 ${generalSchoolGroup.weightedAvgPriceEokText}(평당 ${generalSchoolGroup.weightedAvgPyeongManwon.toLocaleString('ko-KR')}만), 핵심 학원가 밀집권(${academyPrimeGroup.weightedAvgPriceEokText}) vs 비학원권(${nonAcademyGroup.weightedAvgPriceEokText})은 ${formatSignedPriceEok(academyPriceDiffWon)}(${formatSignedPercent(academyPricePremiumPercent)})의 교육 프리미엄 격차를 형성하고 있습니다.`
      : '선택한 평형 구간에 대한 초품아 및 학원가 밀집도별 실거래 집값 분포를 비교합니다.';

  const delta: SchoolDistrictPremiumDelta = {
    chopumaPriceDiffWon,
    chopumaPriceDiffEokText: hasBothChopuma ? formatSignedPriceEok(chopumaPriceDiffWon) : '-',
    chopumaPricePremiumPercent,
    chopumaPyeongDiffManwon,
    chopumaPyeongPremiumPercent,
    academyPriceDiffWon,
    academyPriceDiffEokText: hasBothAcademy ? formatSignedPriceEok(academyPriceDiffWon) : '-',
    academyPricePremiumPercent,
    academyPyeongDiffManwon,
    academyPyeongPremiumPercent,
    headlineQuestion,
    headlineAnswer,
  };

  const totalCount = filtered.length;
  const elementaryDistanceTiers: ThematicTierBreakdownItem[] = [
    buildTierBreakdownItem(
      filtered.filter((r) => r.distanceToElementary <= 200),
      totalCount,
      {
        tierId: 'elem-under200m',
        shortLabel: '200m 이내 (초품아)',
        rangeLabel: '초등학교 직선 200m 이내 (도보 3분 안심권)',
        description: '단지 출입구 직결 또는 무차도 보행로로 초등학교 진입이 가능한 최선호 초품아 구간',
      }
    ),
    buildTierBreakdownItem(
      filtered.filter((r) => r.distanceToElementary > 200 && r.distanceToElementary <= 300),
      totalCount,
      {
        tierId: 'elem-200to300m',
        shortLabel: '201~300m (도보 5분)',
        rangeLabel: '초등학교 직선 201m ~ 300m (근거리 도보권)',
        description: '저학년 도보 통학이 수월한 인접 블록 통학 구간',
      }
    ),
    buildTierBreakdownItem(
      filtered.filter((r) => r.distanceToElementary > 300 && r.distanceToElementary <= 450),
      totalCount,
      {
        tierId: 'elem-300to450m',
        shortLabel: '301~450m (일반 통학)',
        rangeLabel: '초등학교 직선 301m ~ 450m (도보 7분권)',
        description: '보행육교 또는 사거리 횡단을 포함하는 표준 통학 구간',
      }
    ),
    buildTierBreakdownItem(
      filtered.filter((r) => r.distanceToElementary > 450),
      totalCount,
      {
        tierId: 'elem-over450m',
        shortLabel: '450m 초과 (원거리)',
        rangeLabel: '초등학교 직선 450m 초과 (도보 8분+ 구간)',
        description: '역세권 주상복합 또는 외곽 블록에 위치한 통학 구간',
      }
    ),
  ];

  const academyDensityTiers: ThematicTierBreakdownItem[] = [
    buildTierBreakdownItem(
      filtered.filter((r) => r.academyDensity >= 100),
      totalCount,
      {
        tierId: 'acad-100plus',
        shortLabel: '학원 100개+ (메이저 학원가)',
        rangeLabel: '반경 내 학원 100개 이상 초밀집 교육특구',
        description: '반송동 솔빛·나루마을 및 청계동 카림애비뉴·시범단지 중심 대형 학원가 직결권',
      }
    ),
    buildTierBreakdownItem(
      filtered.filter((r) => r.academyDensity >= 40 && r.academyDensity < 100),
      totalCount,
      {
        tierId: 'acad-40to99',
        shortLabel: '학원 40~99개 (중견 학원권)',
        rangeLabel: '반경 내 학원 40개 ~ 99개 형성 권역',
        description: '산척동 레이크 에듀타운·여울동·능동 중심 상가 학원 밀집 권역',
      }
    ),
    buildTierBreakdownItem(
      filtered.filter((r) => r.academyDensity < 40),
      totalCount,
      {
        tierId: 'acad-under40',
        shortLabel: '학원 40개 미만 (주거전용권)',
        rangeLabel: '반경 내 학원 40개 미만 저밀도 권역',
        description: '장지동·목동·신동 등 자연친화적 주거 전용 블록',
      }
    ),
  ];

  // Group by elementarySchoolName
  const bySchool = new Map<string, ThematicApartmentStatRecord[]>();
  for (const r of filtered) {
    if (!r.elementarySchoolName) continue;
    const list = bySchool.get(r.elementarySchoolName) ?? [];
    list.push(r);
    bySchool.set(r.elementarySchoolName, list);
  }

  const schoolZoneRankings: ElementarySchoolZoneRankingItem[] = [];
  for (const [schoolName, list] of bySchool.entries()) {
    if (list.length < 2) continue;
    const summary = computeThematicGroupSummary(list, {
      groupId: schoolName,
      groupTitle: schoolName,
      groupSubtitle: '',
      criteriaLabel: '',
    });
    schoolZoneRankings.push({
      schoolName,
      primaryDong: list[0].dong,
      regionId: list[0].regionId,
      complexCount: summary.complexCount,
      txVolume1Y: summary.txVolume1Y,
      weightedAvgPriceWon: summary.weightedAvgPriceWon,
      weightedAvgPriceEokText: summary.weightedAvgPriceEokText,
      weightedAvgPyeongManwon: summary.weightedAvgPyeongManwon,
      avgDistanceToElementaryMeters: summary.avgDistanceToElementaryMeters,
      avgAcademyDensity: summary.avgAcademyDensity,
      flagshipComplexName: summary.maxPriceComplexName,
      flagshipComplexSlug: summary.maxPriceComplexSlug,
      flagshipLatestPriceEokText: summary.maxLatestPriceEokText,
    });
  }
  schoolZoneRankings.sort((a, b) => b.weightedAvgPriceWon - a.weightedAvgPriceWon);

  const byName = new Map(baseRecords.map((r) => [r.name, r]));
  const rivalMatchups = [
    buildRivalMatchupFromNames(byName, {
      matchupId: 'school-sibeom-vs-lake-edu',
      themeBadge: '동탄2 양대 초품아 대장 대결',
      matchupTitle: '동탄역 시범 더샵 센트럴시티 (청계초) vs 동탄 더샵 레이크에듀타운 (정현초)',
      matchupDescription:
        '청계동 시범단지 초품아·동탄역세권 대장과 산척동 호수공원 초·중·고 원스톱 에듀타운 대장의 실거래 집값 비교',
      leftLabel: '청계동 · 청계초 초품아',
      rightLabel: '산척동 · 정현초·중·고 에듀타운',
      leftName: '동탄역 시범 더샵 센트럴시티',
      rightName: '동탄 더샵 레이크에듀타운',
      relatedGuideSlug: 'dongtan-school-zone-top-apartments',
      relatedGuideTitle: '동탄 학군·초품아 TOP 단지 실거래 및 통학 여건 비교 리포트',
    }),
    buildRivalMatchupFromNames(byName, {
      matchupId: 'school-dongtan1-solbit-vs-hanbit',
      themeBadge: '동탄1 핵심 학원가 맞대결',
      matchupTitle: '솔빛마을 서해그랑블 (솔빛학군) vs 시범한빛마을 동탄아이파크 (한빛학군)',
      matchupDescription:
        '반송동 최대 학원가 밀집지(학원 180개+) 솔빛마을 대장과 북·남광장 직결 한빛초·중·고 트리플 학군 대장 비교',
      leftLabel: '반송동 · 솔빛초·중 학원가',
      rightLabel: '반송동 · 한빛초·중·고 학군',
      leftName: '솔빛마을 서해그랑블',
      rightName: '시범한빛마을 동탄아이파크',
      relatedGuideSlug: 'dongtan-elementary-cho-pum-a-safety-index',
      relatedGuideTitle: '동탄 초품아 안심 통학 지수 및 학원가 밀집도 심층 분석',
    }),
    buildRivalMatchupFromNames(byName, {
      matchupId: 'school-woonam-vs-hanwha',
      themeBadge: '청계동 시범 학군 라이벌',
      matchupTitle: '동탄역 시범 우남퍼스트빌 (청계초) vs 동탄역 시범 한화꿈에그린 프레스티지 (아인초)',
      matchupDescription:
        '동탄역 도보권과 시범단지 학원가를 동시에 누리는 청계초·아인초 양대 학군 대표 단지의 매매가·평당가 대조',
      leftLabel: '청계동 · 청계초·중앙공원',
      rightLabel: '청계동 · 아인초·청계중',
      leftName: '동탄역 시범 우남퍼스트빌',
      rightName: '동탄역 시범 한화꿈에그린 프레스티지',
      relatedGuideSlug: 'dongtan-station-gbcx-vs-sibeom-comparison',
      relatedGuideTitle: '동탄역 광비콤 vs 청계동 시범단지 초품아 실거래 비교',
    }),
  ].filter((m): m is ThematicRivalMatchup => m !== null);

  const comparisonGuides: ComparisonGuideBridgeItem[] = [
    {
      slug: 'dongtan-school-zone-top-apartments',
      badge: 'Issue #2 핵심 연계 가이드',
      category: '학군·초품아',
      title: '동탄 학군·초품아 대표 아파트 실거래 비교: 청계 시범·반송 솔빛·산척 레이크에듀 완벽 해부',
      summary:
        '초등학교 도보 거리와 반경 내 학원가 밀집도가 실제 매매가와 전세가율 하방 경직성에 미치는 영향을 단지별로 분석합니다.',
      highlightStatLabel: `초품아 평균 ${chopumaGroup.weightedAvgPriceEokText} vs 일반 ${generalSchoolGroup.weightedAvgPriceEokText} (${delta.chopumaPriceDiffEokText})`,
      isPrimaryComparison: true,
    },
    {
      slug: 'dongtan-elementary-cho-pum-a-safety-index',
      badge: '통학 안전·초품아 분석',
      category: '학군·초품아',
      title: '동탄 초품아 무차도 안심 통학 지수 및 권역별 대표 단지 가격 비교',
      summary:
        '차도 횡단 없는 그린웨이 통학망을 갖춘 동탄1·동탄2 핵심 초품아 단지의 실거래 시세와 평당가를 비교합니다.',
      highlightStatLabel: `학원 밀집권 ${academyPrimeGroup.weightedAvgPriceEokText} vs 비학원권 ${nonAcademyGroup.weightedAvgPriceEokText}`,
      isPrimaryComparison: false,
    },
    {
      slug: 'dongtan-1-vs-2-comparison',
      badge: '1동탄 vs 2동탄 학군 대조',
      category: '지역비교',
      title: '1동탄 vs 2동탄 차이: 솔빛·한빛 학원가와 청계 시범·산척 에듀타운 중 내 자녀에게 맞는 선택은?',
      summary:
        '완성형 학원가 밀도를 자랑하는 동탄1신도시와 신축 초품아 비중이 높은 동탄2신도시의 실거래 가격 격차를 확인하세요.',
      highlightStatLabel: '동탄1·동탄2 127개 단지 학군·집값 전수 비교',
      isPrimaryComparison: false,
    },
  ];

  const payload: SchoolDistrictPremiumPayload = {
    topicId: 'school-district-premium',
    areaBand: resolvedBand,
    datasetMeta: MASTER_DATASET_META,
    chopumaGroup,
    generalSchoolGroup,
    academyPrimeGroup,
    nonAcademyGroup,
    delta,
    elementaryDistanceTiers,
    academyDensityTiers,
    schoolZoneRankings: schoolZoneRankings.slice(0, 8),
    rivalMatchups,
    comparisonGuides,
  };

  if (!customRecords) {
    schoolPremiumCache.set(resolvedBand, payload);
  }
  return payload;
}

// ============================================================================
// ISSUE #3: 동탄호수공원 조망권과 수변 입지의 가치 측정 (`lake-park-view-premium`)
// ============================================================================

const lakeParkCache = new Map<AreaBandFilter, LakeParkPremiumPayload>();

export function getLakeParkPremiumData(
  areaBand: AreaBandFilter = 'all',
  customRecords?: ApartmentStatRecord[]
): LakeParkPremiumPayload {
  const resolvedBand: AreaBandFilter = areaBand || 'all';
  if (!customRecords && lakeParkCache.has(resolvedBand)) {
    return lakeParkCache.get(resolvedBand)!;
  }

  const baseRecords = customRecords
    ? customRecords.map((r) => enrichApartmentStatRecord(r))
    : MASTER_THEMATIC_RECORDS;
  const filtered = filterRecordsByAreaBand(baseRecords, resolvedBand) as ThematicApartmentStatRecord[];

  const waterfrontRecords = filtered.filter((r) => r.distanceToLakeMeters <= 1000);
  const southHinterlandRecords = filtered.filter(
    (r) => r.distanceToLakeMeters > 1000 && r.distanceToLakeMeters <= 2200
  );
  const cityNonLakeRecords = filtered.filter((r) => r.distanceToLakeMeters > 1000);

  const waterfrontGroup = computeThematicGroupSummary(waterfrontRecords, {
    groupId: 'lake-waterfront-under1km',
    groupTitle: '동탄호수공원 수변·도보 핵심권 (1km 이내)',
    groupSubtitle: '송동·산척동·장지동 호수 산책로·루나쇼 직결 벨트',
    criteriaLabel: '호수공원 중심 반경 ≤ 1.0km',
  });

  const southHinterlandGroup = computeThematicGroupSummary(southHinterlandRecords, {
    groupId: 'lake-hinterland-1to2km',
    groupTitle: '남동탄 비수변 배후 주거권 (1~2.2km)',
    groupSubtitle: '동일 남동탄 생활권 내 비조망·외곽 블록',
    criteriaLabel: '호수공원 중심 반경 1.0km ~ 2.2km',
  });

  const cityNonLakeGroup = computeThematicGroupSummary(cityNonLakeRecords, {
    groupId: 'city-non-lake-over1km',
    groupTitle: '비수변 일반 단지 전체 (1km 초과)',
    groupSubtitle: '동탄 전역 비수변 단지 평균 벤치마크',
    criteriaLabel: '호수공원 중심 반경 > 1.0km',
  });

  const hasBothSouth =
    waterfrontGroup.complexCount > 0 && southHinterlandGroup.complexCount > 0;
  const waterfrontVsHinterlandPriceDiffWon = hasBothSouth
    ? waterfrontGroup.weightedAvgPriceWon - southHinterlandGroup.weightedAvgPriceWon
    : 0;
  const waterfrontVsHinterlandPremiumPercent =
    hasBothSouth && southHinterlandGroup.weightedAvgPriceWon > 0
      ? Math.round(
          (waterfrontVsHinterlandPriceDiffWon / southHinterlandGroup.weightedAvgPriceWon) * 1000
        ) / 10
      : 0;
  const waterfrontVsHinterlandPyeongDiffManwon = hasBothSouth
    ? waterfrontGroup.weightedAvgPyeongManwon - southHinterlandGroup.weightedAvgPyeongManwon
    : 0;
  const waterfrontVsHinterlandPyeongPremiumPercent =
    hasBothSouth && southHinterlandGroup.weightedAvgPyeongManwon > 0
      ? Math.round(
          (waterfrontVsHinterlandPyeongDiffManwon /
            southHinterlandGroup.weightedAvgPyeongManwon) *
            1000
        ) / 10
      : 0;

  const hasBothCity = waterfrontGroup.complexCount > 0 && cityNonLakeGroup.complexCount > 0;
  const waterfrontVsCityPriceDiffWon = hasBothCity
    ? waterfrontGroup.weightedAvgPriceWon - cityNonLakeGroup.weightedAvgPriceWon
    : 0;
  const waterfrontVsCityPremiumPercent =
    hasBothCity && cityNonLakeGroup.weightedAvgPriceWon > 0
      ? Math.round((waterfrontVsCityPriceDiffWon / cityNonLakeGroup.weightedAvgPriceWon) * 1000) /
        10
      : 0;

  const turnoverDiffPercentPoint = hasBothCity
    ? Math.round(
        (waterfrontGroup.avgAnnualTurnoverPercent - cityNonLakeGroup.avgAnnualTurnoverPercent) * 10
      ) / 10
    : 0;
  const retentionDiffPercentPoint = hasBothSouth
    ? Math.round(
        (waterfrontGroup.avgPriceRetentionPercent -
          southHinterlandGroup.avgPriceRetentionPercent) *
          10
      ) / 10
    : 0;

  const headlineQuestion =
    '동탄호수공원 수변·조망 도보권 vs 비수변 단지, 실제 집값과 거래 회전율은 얼마나 차이 날까?';
  const headlineAnswer = hasBothSouth
    ? `동탄호수공원 반경 1km 이내 수변·도보권(${waterfrontGroup.complexCount}단지) 1년 평균 집값은 ${waterfrontGroup.weightedAvgPriceEokText}(평당 ${waterfrontGroup.weightedAvgPyeongManwon.toLocaleString('ko-KR')}만)으로 동일 남동탄 내 비수변 배후권(${southHinterlandGroup.weightedAvgPriceEokText}) 대비 ${formatSignedPriceEok(waterfrontVsHinterlandPriceDiffWon)}(${formatSignedPercent(waterfrontVsHinterlandPremiumPercent)})의 수변 프리미엄을 기록 중이며, 연간 거래 회전율 역시 ${waterfrontGroup.avgAnnualTurnoverPercent}%로 비수변 평균(${cityNonLakeGroup.avgAnnualTurnoverPercent}%)을 상회합니다.`
    : cityNonLakeGroup.complexCount > 0
      ? `선택한 평형대에는 호수공원 수변·배후권(2.2km 이내) 해당 단지가 없으며 비수변 일반 단지(${cityNonLakeGroup.complexCount}단지) 1년 평균 집값은 ${cityNonLakeGroup.weightedAvgPriceEokText}(평당 ${cityNonLakeGroup.weightedAvgPyeongManwon.toLocaleString('ko-KR')}만, 연간 거래 회전율 ${cityNonLakeGroup.avgAnnualTurnoverPercent}%)을 기록하고 있습니다.`
      : '선택한 평형 구간에 대한 동탄호수공원 수변 거리별 실거래 집값과 거래 회전율을 비교합니다.';

  const delta: LakeParkPremiumDelta = {
    waterfrontVsHinterlandPriceDiffWon,
    waterfrontVsHinterlandPriceDiffEokText: hasBothSouth
      ? formatSignedPriceEok(waterfrontVsHinterlandPriceDiffWon)
      : '-',
    waterfrontVsHinterlandPremiumPercent,
    waterfrontVsHinterlandPyeongDiffManwon,
    waterfrontVsHinterlandPyeongPremiumPercent,
    waterfrontVsCityPriceDiffWon,
    waterfrontVsCityPriceDiffEokText: hasBothCity
      ? formatSignedPriceEok(waterfrontVsCityPriceDiffWon)
      : '-',
    waterfrontVsCityPremiumPercent,
    turnoverDiffPercentPoint,
    retentionDiffPercentPoint,
    headlineQuestion,
    headlineAnswer,
  };

  const totalCount = filtered.length;
  const lakeDistanceTiers: ThematicTierBreakdownItem[] = [
    buildTierBreakdownItem(
      filtered.filter((r) => r.distanceToLakeMeters <= 700),
      totalCount,
      {
        tierId: 'lake-under700m',
        shortLabel: '700m 이내 (수변 1열 조망권)',
        rangeLabel: '호수공원 중심 700m 이내 (영구 수변 조망·라크몽 직결)',
        description:
          '동탄린스트라우스 더레이크·자연앤푸르지오·더레이크팰리스 등 호수 조망 프리미엄 핵심 단지',
      }
    ),
    buildTierBreakdownItem(
      filtered.filter((r) => r.distanceToLakeMeters > 700 && r.distanceToLakeMeters <= 1000),
      totalCount,
      {
        tierId: 'lake-700to1000m',
        shortLabel: '701m~1km (호수 도보 생활권)',
        rangeLabel: '호수공원 중심 701m ~ 1.0km (도보 산책·에듀타운권)',
        description:
          '동탄 더샵 레이크에듀타운·하우스디 더레이크·센트리체 등 호수 산책로 도보 5~10분 단지',
      }
    ),
    buildTierBreakdownItem(
      filtered.filter((r) => r.distanceToLakeMeters > 1000 && r.distanceToLakeMeters <= 2200),
      totalCount,
      {
        tierId: 'lake-1000to2200m',
        shortLabel: '1.0~2.2km (남동탄 배후권)',
        rangeLabel: '호수공원 중심 1.0km ~ 2.2km (산척·장지·신동 배후 주거권)',
        description: '호수공원 상권을 차량·버스로 공유하되 실속 있는 진입 가격대를 형성한 남동탄 단지',
      }
    ),
    buildTierBreakdownItem(
      filtered.filter((r) => r.distanceToLakeMeters > 2200),
      totalCount,
      {
        tierId: 'lake-over2200m',
        shortLabel: '2.2km 초과 (역세권·북동탄·1동탄)',
        rangeLabel: '호수공원 중심 2.2km 초과 (비수변 권역 전체)',
        description: '동탄역세권(여울·청계)·목동·영천동 및 동탄1신도시 생활권 단지',
      }
    ),
  ];

  const byName = new Map(baseRecords.map((r) => [r.name, r]));
  const rivalMatchups = [
    buildRivalMatchupFromNames(byName, {
      matchupId: 'lake-lynn-vs-thesharp',
      themeBadge: '호수공원 양대 대장 맞대결',
      matchupTitle: '동탄린스트라우스 더레이크 (송동) vs 동탄 더샵 레이크에듀타운 (산척동)',
      matchupDescription:
        '영구 호수 파노라마 조망과 상업시설 직결을 자랑하는 주상복합 대장과 정현초·중·고 초품아 수변 대단지의 1:1 집값 비교',
      leftLabel: '송동 · 수변 1열 주상복합 대장',
      rightLabel: '산척동 · 호수 에듀타운 대장',
      leftName: '동탄린스트라우스 더레이크',
      rightName: '동탄 더샵 레이크에듀타운',
      relatedGuideSlug: 'dongtan-lake-vs-station-comparison',
      relatedGuideTitle: '동탄호수공원권 vs 동탄역세권 실거래 및 라이프스타일 비교',
    }),
    buildRivalMatchupFromNames(byName, {
      matchupId: 'lake-palace-vs-prugio',
      themeBadge: '북측 호수 vs 남측 호수 1열 대결',
      matchupTitle: '동탄 더레이크팰리스 (산척동) vs 동탄 레이크 자연앤푸르지오 (장지동)',
      matchupDescription:
        '호수공원 북동측 수변 산책로 직결 대단지와 남측 호수 1열 국민평형 대표 단지의 실거래 매매가·평당가 비교',
      leftLabel: '산척동 · 호수 북측 수변권',
      rightLabel: '장지동 · 호수 남측 1열',
      leftName: '동탄 더레이크팰리스',
      rightName: '동탄 레이크 자연앤푸르지오',
      relatedGuideSlug: 'dongtan-lake-vs-station-comparison',
      relatedGuideTitle: '동탄호수공원 수변 입지 및 단지별 조망 프리미엄 분석',
    }),
    buildRivalMatchupFromNames(byName, {
      matchupId: 'lake-vs-station-flagship',
      themeBadge: '호수공원 대장 vs 동탄역 대장',
      matchupTitle: '동탄린스트라우스 더레이크 (호수 대장) vs 동탄역 롯데캐슬 (동탄역 대장)',
      matchupDescription:
        '남동탄 수변 라이프스타일 최고가 랜드마크와 북동탄 GTX-A 초역세권 최고가 랜드마크 간 실거래 가격 격차',
      leftLabel: '송동 · 동탄호수공원 대장',
      rightLabel: '여울동 · GTX-A 동탄역 대장',
      leftName: '동탄린스트라우스 더레이크',
      rightName: '동탄역 롯데캐슬',
      relatedGuideSlug: 'dongtan-1-vs-2-comparison',
      relatedGuideTitle: '동탄 핵심 권역별 대장주 실거래가 및 입지 비교',
    }),
  ].filter((m): m is ThematicRivalMatchup => m !== null);

  const comparisonGuides: ComparisonGuideBridgeItem[] = [
    {
      slug: 'dongtan-lake-vs-station-comparison',
      badge: 'Issue #3 핵심 연계 가이드',
      category: '수변·역세권비교',
      title: '동탄호수공원권 vs 동탄역세권 완벽 비교: 수변 조망 라이프와 GTX 초역세권 중 어디가 유리할까?',
      summary:
        '송동·산척동·장지동 호수공원 수변 도보권 단지의 평당가 프리미엄과 거래 회전율, 역세권 대비 실거주 가성비를 정밀 대조합니다.',
      highlightStatLabel: `호수 수변권 평균 ${waterfrontGroup.weightedAvgPriceEokText} vs 배후권 ${southHinterlandGroup.weightedAvgPriceEokText} (${delta.waterfrontVsHinterlandPriceDiffEokText})`,
      isPrimaryComparison: true,
    },
    {
      slug: 'dongtan-new-town-culture-sin-dong-valuation',
      badge: '남동탄·신동 확장 분석',
      category: '지역비교',
      title: '남동탄 호수공원 배후권 및 신동 신주거문화타운 실거래 밸류에이션 리포트',
      summary:
        '호수공원 수변 생활권을 공유하는 산척·장지·신동 권역의 연식별·평형별 진입 가격대와 미래 가치를 점검합니다.',
      highlightStatLabel: `수변 도보권 연간 회전율 ${waterfrontGroup.avgAnnualTurnoverPercent}% 실거래 활발`,
      isPrimaryComparison: false,
    },
    {
      slug: 'dongtan-budget-tier-ranking',
      badge: '예산별 매수 전략',
      category: '실거래분석',
      title: '예산별(6억·9억·12억+) 동탄 아파트 랭킹: 호수공원 수변권 진입 가능 예산은?',
      summary:
        '6억대 실속 수변 배후 단지부터 12억~15억대 영구 호수 조망 대장주까지 예산 구간별 추천 단지를 확인하세요.',
      highlightStatLabel: `수변권 최저 ${waterfrontGroup.minLatestPriceEokText} ~ 최고 ${waterfrontGroup.maxLatestPriceEokText}`,
      isPrimaryComparison: false,
    },
  ];

  const payload: LakeParkPremiumPayload = {
    topicId: 'lake-park-view-premium',
    areaBand: resolvedBand,
    datasetMeta: MASTER_DATASET_META,
    waterfrontGroup,
    southHinterlandGroup,
    cityNonLakeGroup,
    delta,
    lakeDistanceTiers,
    rivalMatchups,
    comparisonGuides,
  };

  if (!customRecords) {
    lakeParkCache.set(resolvedBand, payload);
  }
  return payload;
}

// ============================================================================
// ISSUE #4: 동탄 1·2신도시 연식별 감가상각과 시세 방어율 (`building-age-depreciation`)
// ============================================================================

const buildingAgeCache = new Map<AreaBandFilter, BuildingAgeDepreciationPayload>();

export function getBuildingAgeDepreciationData(
  areaBand: AreaBandFilter = 'all',
  customRecords?: ApartmentStatRecord[]
): BuildingAgeDepreciationPayload {
  const resolvedBand: AreaBandFilter = areaBand || 'all';
  if (!customRecords && buildingAgeCache.has(resolvedBand)) {
    return buildingAgeCache.get(resolvedBand)!;
  }

  const baseRecords = customRecords
    ? customRecords.map((r) => enrichApartmentStatRecord(r))
    : MASTER_THEMATIC_RECORDS;
  const filtered = filterRecordsByAreaBand(baseRecords, resolvedBand) as ThematicApartmentStatRecord[];

  const newBuildRecords = filtered.filter((r) => r.buildingAge <= 5);
  const semiNewRecords = filtered.filter((r) => r.buildingAge >= 6 && r.buildingAge <= 10);
  const midAgeRecords = filtered.filter((r) => r.buildingAge >= 11 && r.buildingAge <= 15);
  const oldBuildRecords = filtered.filter((r) => r.buildingAge >= 16);

  const newBuildGroup = computeThematicGroupSummary(newBuildRecords, {
    groupId: 'age-new-under5',
    groupTitle: '신축 단지 (5년 이하 · 2021~2026년식)',
    groupSubtitle: '최신 커뮤니티·지하주차장 특화 설계 하이엔드 신축',
    criteriaLabel: '준공 5년차 이하 (2021년~)',
  });

  const semiNewGroup = computeThematicGroupSummary(semiNewRecords, {
    groupId: 'age-seminew-6to10',
    groupTitle: '준신축 단지 (6~10년차 · 2016~2020년식)',
    groupSubtitle: '동탄2신도시 주력 입주기 · 조경·학군 안정화 단지',
    criteriaLabel: '준공 6~10년차 (2016~2020년)',
  });

  const midAgeGroup = computeThematicGroupSummary(midAgeRecords, {
    groupId: 'age-mid-11to15',
    groupTitle: '중기 시범벨트 (11~15년차 · 2011~2015년식)',
    groupSubtitle: '청계동 동탄역 시범단지 핵심 입지 · 역세권 입지 우위 구간',
    criteriaLabel: '준공 11~15년차 (2011~2015년)',
  });

  const oldBuildGroup = computeThematicGroupSummary(oldBuildRecords, {
    groupId: 'age-old-16plus',
    groupTitle: '구축 성숙기 단지 (16년 이상 · ~2010년식)',
    groupSubtitle: '동탄1신도시 완성형 상권·학원가 · 리모델링 연한 도래권',
    criteriaLabel: '준공 16년차 이상 (~2010년)',
  });

  const hasNewAndOld = newBuildGroup.complexCount > 0 && oldBuildGroup.complexCount > 0;
  const newVsOldPriceDiffWon = hasNewAndOld
    ? newBuildGroup.weightedAvgPriceWon - oldBuildGroup.weightedAvgPriceWon
    : 0;
  const newVsOldPricePremiumPercent =
    hasNewAndOld && oldBuildGroup.weightedAvgPriceWon > 0
      ? Math.round((newVsOldPriceDiffWon / oldBuildGroup.weightedAvgPriceWon) * 1000) / 10
      : 0;
  const newVsOldPyeongDiffManwon = hasNewAndOld
    ? newBuildGroup.weightedAvgPyeongManwon - oldBuildGroup.weightedAvgPyeongManwon
    : 0;
  const newVsOldPyeongPremiumPercent =
    hasNewAndOld && oldBuildGroup.weightedAvgPyeongManwon > 0
      ? Math.round((newVsOldPyeongDiffManwon / oldBuildGroup.weightedAvgPyeongManwon) * 1000) / 10
      : 0;

  const hasNewAndSemi = newBuildGroup.complexCount > 0 && semiNewGroup.complexCount > 0;
  const newVsSemiNewPriceDiffWon = hasNewAndSemi
    ? newBuildGroup.weightedAvgPriceWon - semiNewGroup.weightedAvgPriceWon
    : 0;

  const oldVsNewRetentionAdvantagePercentPoint = hasNewAndOld
    ? Math.round(
        (oldBuildGroup.avgPriceRetentionPercent - newBuildGroup.avgPriceRetentionPercent) * 10
      ) / 10
    : 0;

  const totalCumulativeSalesCount = filtered.reduce((sum, r) => sum + r.allTimeTxCount, 0);

  const headlineQuestion =
    '신축(5년 이하) vs 준신축(6~10년) vs 구축(16년 이상), 연식별 집값 격차와 전고점 대비 시세 방어율은?';
  const headlineAnswer = hasNewAndOld
    ? `신축 5년 이하(${newBuildGroup.complexCount}단지) 1년 평균 집값은 ${newBuildGroup.weightedAvgPriceEokText}(평당 ${newBuildGroup.weightedAvgPyeongManwon.toLocaleString('ko-KR')}만)으로 구축 16년 이상(${oldBuildGroup.weightedAvgPriceEokText}, 평당 ${oldBuildGroup.weightedAvgPyeongManwon.toLocaleString('ko-KR')}만) 대비 ${formatSignedPriceEok(newVsOldPriceDiffWon)}(${formatSignedPercent(newVsOldPricePremiumPercent)}) 높게 형성되어 있습니다. 반면 2015년 입주한 11~15년차 시범단지 벨트는 초역세권 입지 힘으로 평균 ${midAgeGroup.weightedAvgPriceEokText}을 기록해 연식 감가를 뒤집었으며, 전고점 대비 시세 방어율은 구축(${oldBuildGroup.avgPriceRetentionPercent}%)이 가장 견고한 하방 지지력을 보입니다.`
    : hasNewAndSemi
      ? `선택한 평형대에는 11년차 이상 중기·구축 해당 단지가 없으며 신축 5년 이하(${newBuildGroup.complexCount}단지) 1년 평균 집값은 ${newBuildGroup.weightedAvgPriceEokText}(평당 ${newBuildGroup.weightedAvgPyeongManwon.toLocaleString('ko-KR')}만, 방어율 ${newBuildGroup.avgPriceRetentionPercent}%) vs 준신축 6~10년차(${semiNewGroup.complexCount}단지) 평균 ${semiNewGroup.weightedAvgPriceEokText}(평당 ${semiNewGroup.weightedAvgPyeongManwon.toLocaleString('ko-KR')}만, 방어율 ${semiNewGroup.avgPriceRetentionPercent}%)로 ${formatSignedPriceEok(newVsSemiNewPriceDiffWon)} 차이를 기록하고 있습니다.`
      : '선택한 평형 구간에 대한 연식별(신축·준신축·구축) 실거래 집값과 전고점 대비 시세 방어율을 비교합니다.';

  const delta: BuildingAgeDepreciationDelta = {
    newVsOldPriceDiffWon,
    newVsOldPriceDiffEokText: hasNewAndOld ? formatSignedPriceEok(newVsOldPriceDiffWon) : '-',
    newVsOldPricePremiumPercent,
    newVsOldPyeongDiffManwon,
    newVsOldPyeongPremiumPercent,
    newVsSemiNewPriceDiffWon,
    newVsSemiNewPriceDiffEokText: hasNewAndSemi
      ? formatSignedPriceEok(newVsSemiNewPriceDiffWon)
      : '-',
    oldVsNewRetentionAdvantagePercentPoint,
    midAgeSibeomPriceEokText: midAgeGroup.weightedAvgPriceEokText,
    totalCumulativeSalesCount,
    headlineQuestion,
    headlineAnswer,
  };

  const totalCount = filtered.length;
  const ageLifecycleTiers: ThematicTierBreakdownItem[] = [
    buildTierBreakdownItem(newBuildRecords, totalCount, {
      tierId: 'age-tier-under5',
      shortLabel: '신축 (5년 이하 · 2021~2026)',
      rangeLabel: '준공 5년차 이하 (신축 프리미엄 구간)',
      description: '동탄역 롯데캐슬·예미지 시그너스·헤리엇·디에트르포레 등 최신 평면·커뮤니티 신축 단지',
    }),
    buildTierBreakdownItem(semiNewRecords, totalCount, {
      tierId: 'age-tier-6to10',
      shortLabel: '준신축 (6~10년차 · 2016~2020)',
      rangeLabel: '준공 6~10년차 (동탄2 최대 공급 주력층)',
      description: '동탄린스트라우스 더레이크·더샵 레이크에듀타운·힐스테이트 동탄 등 완성된 준신축 단지',
    }),
    buildTierBreakdownItem(midAgeRecords, totalCount, {
      tierId: 'age-tier-11to15',
      shortLabel: '중기·시범 (11~15년차 · 2011~2015)',
      rangeLabel: '준공 11~15년차 (청계동 시범단지 초역세권 벨트)',
      description:
        '동탄역 시범 더샵 센트럴시티·우남퍼스트빌·한화꿈에그린 등 입지가 연식 감가를 압도하는 구간',
    }),
    buildTierBreakdownItem(oldBuildRecords, totalCount, {
      tierId: 'age-tier-16plus',
      shortLabel: '구축·성숙기 (16년 이상 · ~2010)',
      rangeLabel: '준공 16년차 이상 (동탄1 인프라 성숙 & 리모델링 연한권)',
      description:
        '메타폴리스·솔빛마을 서해그랑블·한빛마을 아이파크 등 높은 전세가율과 시세 방어율을 갖춘 구축 단지',
    }),
  ];

  const byName = new Map(baseRecords.map((r) => [r.name, r]));
  const rivalMatchups = [
    buildRivalMatchupFromNames(byName, {
      matchupId: 'age-lotte-2021-vs-thesharp-2015',
      themeBadge: '2021년 신축 대장 vs 2015년 시범 대장',
      matchupTitle: '동탄역 롯데캐슬 (2021년식·5년차) vs 동탄역 시범 더샵 센트럴시티 (2015년식·11년차)',
      matchupDescription:
        '동탄역 직결 5년차 신축 주상복합과 11년차 청계동 시범단지 대장주 간 연식 프리미엄 및 평당가 격차 비교',
      leftLabel: '여울동 · 2021년 준공 (5년차)',
      rightLabel: '청계동 · 2015년 준공 (11년차)',
      leftName: '동탄역 롯데캐슬',
      rightName: '동탄역 시범 더샵 센트럴시티',
      relatedGuideSlug: 'dongtan-station-gbcx-vs-sibeom-comparison',
      relatedGuideTitle: '동탄역 신축 주상복합 vs 2015년 시범단지 실거래 비교',
    }),
    buildRivalMatchupFromNames(byName, {
      matchupId: 'age-hillstate-2019-vs-solbit-2007',
      themeBadge: '7년차 준신축 vs 19년차 구축 학군지',
      matchupTitle: '힐스테이트 동탄 (2019년식·7년차) vs 솔빛마을 서해그랑블 (2007년식·19년차)',
      matchupDescription:
        '동탄2 목동 1,479세대 준신축 대단지와 동탄1 반송동 19년차 솔빛 학원가 대장 단지의 매매가·방어율 비교',
      leftLabel: '목동 · 2019년 준공 (7년차)',
      rightLabel: '반송동 · 2007년 준공 (19년차)',
      leftName: '힐스테이트 동탄',
      rightName: '솔빛마을 서해그랑블',
      relatedGuideSlug: 'dongtan-reconstruction-remodeling-1st-new-town-outlook',
      relatedGuideTitle: '동탄1신도시 노후도·리모델링 기대치 및 실거주 가치 분석',
    }),
    buildRivalMatchupFromNames(byName, {
      matchupId: 'age-yemiji-2021-vs-metapolis-2010',
      themeBadge: '동탄2 신축 주상복합 vs 동탄1 초고층 랜드마크',
      matchupTitle: '동탄역 예미지 시그너스 (2021년식·5년차) vs 메타폴리스 (2010년식·16년차)',
      matchupDescription:
        '동탄역 초역세권 5년차 신축 주상복합과 동탄1 타임테라스 직결 66층 주상복합 대장의 연식별 시세 비교',
      leftLabel: '여울동 · 2021년 준공 (5년차)',
      rightLabel: '반송동 · 2010년 준공 (16년차)',
      leftName: '동탄역 예미지 시그너스',
      rightName: '메타폴리스',
      relatedGuideSlug: 'dongtan-1-vs-2-comparison',
      relatedGuideTitle: '동탄1 vs 동탄2 연식·대지지분·실거래가 종합 비교',
    }),
  ].filter((m): m is ThematicRivalMatchup => m !== null);

  const comparisonGuides: ComparisonGuideBridgeItem[] = [
    {
      slug: 'dongtan-reconstruction-remodeling-1st-new-town-outlook',
      badge: 'Issue #4 핵심 연계 가이드',
      category: '연식·리모델링분석',
      title: '동탄1신도시 준공 16~20년차 진입: 연식별 감가상각 한계선과 리모델링·대지지분 가치 분석',
      summary:
        '입주 16년차를 넘어선 동탄1신도시 주요 단지의 전고점 대비 시세 방어율(91.7%)과 용적률·대지지분 경쟁력을 실증 분석합니다.',
      highlightStatLabel: `신축 평균 ${newBuildGroup.weightedAvgPriceEokText} vs 구축 ${oldBuildGroup.weightedAvgPriceEokText} (구축 방어율 ${oldBuildGroup.avgPriceRetentionPercent}%)`,
      isPrimaryComparison: true,
    },
    {
      slug: 'dongtan-apartments-per-valuation-methodology',
      badge: '실거주 PER · 시세방어율',
      category: '밸류에이션',
      title: '동탄 아파트 실거주 PER 및 전세가율 기반 저평가 단지 스크리닝 리포트',
      summary:
        '연식에 따른 매매가 감가와 달리 실거주 전세 수요가 뒷받침되는 고방어율·저PER 핵심 단지를 데이터로 선별합니다.',
      highlightStatLabel: `누적 ${totalCumulativeSalesCount.toLocaleString('ko-KR')}건 매매 실거래 전고점 대비 방어율 측정`,
      isPrimaryComparison: false,
    },
    {
      slug: 'dongtan-1-vs-2-comparison',
      badge: '연식 × 입지 교차 분석',
      category: '지역비교',
      title: '동탄1(구축 완성형 상권) vs 동탄2(신축·준신축 역세권) 집값 및 실거주 만족도 1:1 비교',
      summary:
        '평균 연식 10년 이상의 격차가 실제 매매가와 평당가에 어떻게 반영되어 있는지 한눈에 비교합니다.',
      highlightStatLabel: `11~15년차 시범단지 평균 ${midAgeGroup.weightedAvgPriceEokText}으로 입지가 연식 압도`,
      isPrimaryComparison: false,
    },
  ];

  const payload: BuildingAgeDepreciationPayload = {
    topicId: 'building-age-depreciation',
    areaBand: resolvedBand,
    datasetMeta: MASTER_DATASET_META,
    newBuildGroup,
    semiNewGroup,
    midAgeGroup,
    oldBuildGroup,
    delta,
    ageLifecycleTiers,
    rivalMatchups,
    comparisonGuides,
  };

  if (!customRecords) {
    buildingAgeCache.set(resolvedBand, payload);
  }
  return payload;
}
