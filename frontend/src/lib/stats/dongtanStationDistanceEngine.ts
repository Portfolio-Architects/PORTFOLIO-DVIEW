/**
 * @module stats/dongtanStationDistanceEngine
 * @description Deterministic mathematical & statistical analysis engine for
 * Issue #1: "The Impact of Distance to Dongtan Station on Apartment Prices"
 * (동탄역과의 거리가 아파트 가격에 미치는 영향).
 *
 * STRICT REAL DATA ONLY:
 * - 127 verified geocoded complexes in Dongtan New Town.
 * - 8,288 real verified transactions mapped directly from transactions-1y.json.
 * - Exact spherical Haversine distance to Dongtan Station (37.200092, 127.095514).
 * - Pure deterministic OLS linear regression, Pearson correlation r, R^2, and distance-tier aggregation.
 * - Complete numerical safety: zero NaN, zero Infinity, safe empty & degenerate edge case handling.
 */

import { STATS_TOPICS } from '@/types/statsTopic';
import type {
  ApartmentStatRecord,
  DistanceTierSummary,
  RegressionAnalysisResult,
  StatsFilterOptions,
  Issue1AnalysisPayload,
  DistanceTierId,
  StatsDatasetMeta,
} from './types';

// Pre-computed Compact Station Analysis Cache (~45KB, decoupled from 3.29MB transactions-1y.json - P2-1 & Guardrail D)
import statsStationCacheStatic from '../../../public/data/stats-station-cache.json';

/**
 * GTX-A / SRT Dongtan Station WGS84 Reference Coordinates
 */
export const DONGTAN_STATION_COORDS = { lat: 37.200092, lng: 127.095514 };

/**
 * Standard Spherical Haversine Distance (Earth Radius = 6,371,000 meters)
 * Calculates exact distance between two WGS84 points.
 * Default destination is Dongtan Station.
 */
export function calculateHaversineDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number = DONGTAN_STATION_COORDS.lat,
  lng2: number = DONGTAN_STATION_COORDS.lng
): number {
  if (!Number.isFinite(lat1) || !Number.isFinite(lng1) || !Number.isFinite(lat2) || !Number.isFinite(lng2)) {
    return 0;
  }
  if (lat1 === 0 && lng1 === 0) return 0;
  if (lat1 === lat2 && lng1 === lng2) return 0;

  const R = 6371e3; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;

  return Number.isFinite(d) ? Math.round(d) : 0;
}

/**
 * String normalizer for matching transaction records to apartment complexes
 */
export function cleanApartmentName(str: string): string {
  if (!str) return '';
  return str
    .replace(/\s+/g, '')
    .replace(/아파트/g, '')
    .replace(/[()]/g, '')
    .replace(/[-_.]/g, '')
    .toLowerCase();
}

/**
 * Pure builder for compiling the 127 geocoded apartment records from raw repository datasets
 * (used by pipeline cache generation and empirical parity verification).
 */
export function buildMasterApartmentStatRecordsFromRaw(
  aptsByDongInput: unknown,
  locScoresInput: unknown,
  tx1yInput: unknown
): {
  records: ApartmentStatRecord[];
  datasetMeta: StatsDatasetMeta;
} {
  const locMap = (locScoresInput || {}) as Record<
    string,
    { distanceToSubway: number; nearestStationName: string; nearestStationCoords: string }
  >;
  const rawByDong = ((aptsByDongInput as { byDong?: Record<string, unknown[]> })?.byDong ||
    aptsByDongInput ||
    {}) as Record<
    string,
    Array<{
      name: string;
      txKey?: string;
      dong?: string;
      lat: number;
      lng: number;
      yearBuilt?: string | number;
      householdCount?: number;
    }>
  >;

  interface BaseComplex {
    name: string;
    txKey?: string;
    dong: string;
    lat: number;
    lng: number;
    distMeters: number;
    yearBuilt: number;
    householdCount: number;
  }

  const baseComplexes: BaseComplex[] = [];

  for (const [dongName, list] of Object.entries(rawByDong)) {
    if (!Array.isArray(list)) continue;
    for (const apt of list) {
      if (apt.lat && apt.lat > 0 && locMap[apt.name]) {
        const computedDist = calculateHaversineDistanceMeters(apt.lat, apt.lng);
        const dist = computedDist > 0 ? computedDist : locMap[apt.name].distanceToSubway;
        const year = apt.yearBuilt
          ? parseInt(String(apt.yearBuilt).substring(0, 4), 10)
          : 2015;

        baseComplexes.push({
          name: apt.name,
          txKey: apt.txKey,
          dong: dongName,
          lat: apt.lat,
          lng: apt.lng,
          distMeters: dist,
          yearBuilt: Number.isFinite(year) && year > 1990 ? year : 2015,
          householdCount: apt.householdCount || 0,
        });
      }
    }
  }

  const cleanIndex = new Map<string, BaseComplex>();
  for (const c of baseComplexes) {
    cleanIndex.set(cleanApartmentName(c.name), c);
    if (c.txKey) cleanIndex.set(cleanApartmentName(c.txKey), c);
  }

  type RawTxItem = {
    aptName: string;
    txKey?: string;
    priceVal: number;
    area?: number;
    areaPyeong?: number;
    contractDate?: string;
    registeredDate?: string;
  };

  const txByComplex = new Map<string, RawTxItem[]>();
  for (const c of baseComplexes) {
    txByComplex.set(c.name, []);
  }

  const rawTransactions = (Array.isArray(tx1yInput) ? tx1yInput : []) as RawTxItem[];

  let maxMatchedContractDate = '';
  let maxRegisteredDate = '';

  for (const t of rawTransactions) {
    if (t.registeredDate && /^\d{8}$/.test(t.registeredDate) && t.registeredDate > maxRegisteredDate) {
      maxRegisteredDate = t.registeredDate;
    }

    const cName = cleanApartmentName(t.aptName);
    let matched = cleanIndex.get(cName);
    if (!matched && t.txKey) {
      matched = cleanIndex.get(cleanApartmentName(t.txKey));
    }
    if (!matched) {
      for (const [k, c] of cleanIndex.entries()) {
        if (k.includes(cName) || cName.includes(k)) {
          matched = c;
          break;
        }
      }
    }

    if (matched) {
      txByComplex.get(matched.name)!.push(t);
      if (t.contractDate && /^\d{8}$/.test(t.contractDate) && t.contractDate > maxMatchedContractDate) {
        maxMatchedContractDate = t.contractDate;
      }
    }
  }

  const records: ApartmentStatRecord[] = [];
  let totalMappedTxCount = 0;

  for (const c of baseComplexes) {
    const txs = txByComplex.get(c.name) || [];
    let totalPriceWon = 0;
    let totalPyeongPriceWon = 0;
    let totalAreaM2 = 0;
    let validPyeongCount = 0;

    const sortedTxs = [...txs].sort(
      (a, b) =>
        (b.contractDate || '').localeCompare(a.contractDate || '') ||
        (b.registeredDate || '').localeCompare(a.registeredDate || '')
    );
    const latestTx = sortedTxs[0];
    const latestPriceWon = latestTx ? Math.round(latestTx.priceVal * 100_000_000) : 0;
    const latestPyeong = latestTx
      ? latestTx.areaPyeong || (latestTx.area ? latestTx.area / 3.30578 : 0)
      : 0;
    const latestPricePerPyeongWon =
      latestTx && latestPyeong > 0 ? Math.round(latestPriceWon / latestPyeong) : 0;
    const latestContractDate =
      latestTx?.contractDate && /^\d{8}$/.test(latestTx.contractDate)
        ? latestTx.contractDate
        : undefined;

    for (const t of txs) {
      const priceWon = Math.round(t.priceVal * 100_000_000);
      totalPriceWon += priceWon;
      const pyeong = t.areaPyeong || (t.area ? t.area / 3.30578 : 0);
      if (pyeong > 0) {
        totalPyeongPriceWon += priceWon / pyeong;
        validPyeongCount++;
      }
      totalAreaM2 += t.area || 0;
    }

    const txCount = txs.length;
    totalMappedTxCount += txCount;
    const avgPriceWon = txCount > 0 ? Math.round(totalPriceWon / txCount) : 0;
    const avgPricePerPyeongWon =
      validPyeongCount > 0 ? Math.round(totalPyeongPriceWon / validPyeongCount) : 0;
    const exclusiveAreaAvgM2 =
      txCount > 0 ? Math.round((totalAreaM2 / txCount) * 100) / 100 : 84;

    records.push({
      id: c.name,
      name: c.name,
      dong: c.dong,
      distanceToStationMeters: c.distMeters,
      avgPriceWon,
      avgPricePerPyeongWon,
      latestPriceWon,
      latestPricePerPyeongWon,
      latestContractDate,
      txCount,
      builtYear: c.yearBuilt,
      householdCount: c.householdCount,
      exclusiveAreaAvgM2,
    });
  }

  const refDate = maxRegisteredDate || maxMatchedContractDate;
  const referenceMonthLabel =
    refDate && /^\d{6,8}$/.test(refDate)
      ? `${refDate.slice(0, 4)}.${refDate.slice(4, 6)} 기준`
      : STATS_TOPICS[0].publishedAt;

  const datasetMeta: StatsDatasetMeta = {
    totalComplexCount: records.length,
    totalTxCount: totalMappedTxCount,
    latestContractDate: maxMatchedContractDate || null,
    latestRegisteredDate: maxRegisteredDate || null,
    referenceMonthLabel,
    sampleCountLabel: `${records.length.toLocaleString('ko-KR')}개 단지 · ${totalMappedTxCount.toLocaleString('ko-KR')}건 실거래 전수`,
  };

  return { records, datasetMeta };
}

// Master in-memory static cache loaded from precomputed stats-station-cache.json (~45KB)
const MASTER_BUNDLE = statsStationCacheStatic as unknown as {
  records: ApartmentStatRecord[];
  datasetMeta: StatsDatasetMeta;
};
const MASTER_RECORDS: ApartmentStatRecord[] = MASTER_BUNDLE.records;
const MASTER_DATASET_META: StatsDatasetMeta = MASTER_BUNDLE.datasetMeta;

/**
 * Returns live dataset metadata for Issue #1 (complex count, mapped 1Y transaction count, and latest reference month/date).
 */
export function getIssue1DatasetMeta(): StatsDatasetMeta {
  return MASTER_DATASET_META;
}

/**
 * Formats KRW (원) price in compact 억 notation without losing 500만/100만 precision (e.g. 7.1억원, 5.85억원).
 */
export function formatPriceEokCompact(priceWon: number, unit = '억원'): string {
  if (!Number.isFinite(priceWon) || priceWon <= 0) return '-';
  const eok = priceWon / 100_000_000;
  const rounded2 = Math.round(eok * 100) / 100;
  const formatted = Number.isInteger(Math.round(rounded2 * 100) % 10 === 0 ? 1 : 0.5)
    ? rounded2.toFixed(1)
    : rounded2.toFixed(2);
  return `${formatted}${unit}`;
}

/**
 * Formats an 8-digit YYYYMMDD contract/registered date into compact YY.MM.DD (e.g. '20261013' -> '26.10.13').
 */
export function formatShortContractDate(yyyymmdd?: string | null): string | null {
  if (!yyyymmdd || !/^\d{8}$/.test(yyyymmdd)) return null;
  return `${yyyymmdd.slice(2, 4)}.${yyyymmdd.slice(4, 6)}.${yyyymmdd.slice(6, 8)}`;
}

/**
 * 5 Standard Distance Tiers configuration
 */
export const DISTANCE_TIER_CONFIGS: Array<{
  tierId: DistanceTierId;
  tierLabel: string;
  range: [number, number];
}> = [
  { tierId: '<500m', tierLabel: '500m 이내 (초역세권)', range: [0, 500] },
  { tierId: '500m-1km', tierLabel: '500m ~ 1km (역세권)', range: [500, 1000] },
  { tierId: '1km-2km', tierLabel: '1km ~ 2km (준역세권)', range: [1000, 2000] },
  { tierId: '2km-3km', tierLabel: '2km ~ 3km (근접생활권)', range: [2000, 3000] },
  { tierId: '3km+', tierLabel: '3km 이상 (외곽권역)', range: [3000, Infinity] },
];

/**
 * Aggregate apartment records into 5 distance tiers
 * Computes complex count, transaction volume, weighted average price, weighted average pyeong price,
 * and premium rate vs overall average.
 */
export function computeDistanceTiers(records: ApartmentStatRecord[]): DistanceTierSummary[] {
  const totalTx = records.reduce((sum, r) => sum + r.txCount, 0);
  const totalComplexes = records.length;

  // Calculate overall weighted average price per pyeong
  let overallAvgPyeongWon = 0;
  if (totalTx > 0) {
    const sumPyeong = records.reduce((sum, r) => sum + r.avgPricePerPyeongWon * r.txCount, 0);
    overallAvgPyeongWon = sumPyeong / totalTx;
  } else if (totalComplexes > 0) {
    overallAvgPyeongWon =
      records.reduce((sum, r) => sum + r.avgPricePerPyeongWon, 0) / totalComplexes;
  }

  return DISTANCE_TIER_CONFIGS.map((cfg) => {
    const [minM, maxM] = cfg.range;
    const comps = records.filter(
      (r) => r.distanceToStationMeters >= minM && (maxM === Infinity ? true : r.distanceToStationMeters < maxM)
    );

    const complexCount = comps.length;
    const txVolume = comps.reduce((sum, r) => sum + r.txCount, 0);

    let avgPriceWon = 0;
    let avgPricePerPyeongWon = 0;

    if (txVolume > 0) {
      const sumPrice = comps.reduce((sum, r) => sum + r.avgPriceWon * r.txCount, 0);
      const sumPyeong = comps.reduce((sum, r) => sum + r.avgPricePerPyeongWon * r.txCount, 0);
      avgPriceWon = Math.round(sumPrice / txVolume);
      avgPricePerPyeongWon = Math.round(sumPyeong / txVolume);
    } else if (complexCount > 0) {
      avgPriceWon = Math.round(comps.reduce((sum, r) => sum + r.avgPriceWon, 0) / complexCount);
      avgPricePerPyeongWon = Math.round(
        comps.reduce((sum, r) => sum + r.avgPricePerPyeongWon, 0) / complexCount
      );
    }

    const premiumVsAveragePercent =
      overallAvgPyeongWon > 0 && avgPricePerPyeongWon > 0
        ? Math.round(((avgPricePerPyeongWon - overallAvgPyeongWon) / overallAvgPyeongWon) * 1000) / 10
        : 0;

    return {
      tierId: cfg.tierId,
      tierLabel: cfg.tierLabel,
      distanceRangeMeters: cfg.range,
      complexCount,
      txVolume,
      avgPriceWon,
      avgPricePerPyeongWon,
      premiumVsAveragePercent,
    };
  });
}

/**
 * Ordinary Least Squares (OLS) Linear Regression Analysis
 * Regresses Price per Pyeong (Y) against Distance in km (X)
 * Y = alpha + beta * X
 *
 * Output units:
 * - slopeWonPerKm: in 만원/평 per km (standard real estate unit, e.g. -382.65 ~ -382.67)
 * - interceptWon: in 만원/평 (e.g. 3413.04 ~ 3413.13)
 * - slopeFullWonPerKm: full KRW 원/평 per km (e.g. -3,826,453)
 * - interceptFullWon: full KRW 원/평 (e.g. 34,130,392)
 * - pearsonR: Pearson correlation coefficient r (e.g. -0.6645)
 * - rSquared: Coefficient of determination R^2 (e.g. 0.4416)
 * - stationPremiumRatePercent: Premium rate of <1km vs >2km (e.g. +67.4%)
 */
export function computeOLSLinearRegression(records: ApartmentStatRecord[]): RegressionAnalysisResult {
  const n = records.length;

  if (n === 0) {
    return {
      slopeWonPerKm: 0,
      interceptWon: 0,
      pearsonR: 0,
      rSquared: 0,
      sampleSize: 0,
      stationPremiumRatePercent: 0,
      isStatisticallySignificant: false,
      slopeManwonPerKm: 0,
      interceptManwon: 0,
    };
  }

  // Convert pyeong price to 만원 for standard linear regression scale
  // Handles both 원 (e.g. 26,200,000) and 만원 (e.g. 2,620) inputs
  const points = records.map((r) => {
    const distKm = r.distanceToStationMeters / 1000;
    const pyeongPriceMan =
      r.avgPricePerPyeongWon > 100_000
        ? r.avgPricePerPyeongWon / 10_000
        : r.avgPricePerPyeongWon;
    return {
      x: distKm,
      y: pyeongPriceMan,
      txCount: r.txCount,
      distMeters: r.distanceToStationMeters,
    };
  });

  if (n === 1) {
    const singlePrice = Math.round(points[0].y * 100) / 100;
    return {
      slopeWonPerKm: 0,
      interceptWon: singlePrice,
      pearsonR: 0,
      rSquared: 0,
      sampleSize: 1,
      stationPremiumRatePercent: 0,
      isStatisticallySignificant: false,
      slopeManwonPerKm: 0,
      interceptManwon: singlePrice,
    };
  }

  const sumX = points.reduce((acc, p) => acc + p.x, 0);
  const sumY = points.reduce((acc, p) => acc + p.y, 0);
  const meanX = sumX / n;
  const meanY = sumY / n;

  let ssXX = 0;
  let ssYY = 0;
  let ssXY = 0;

  for (const p of points) {
    const dx = p.x - meanX;
    const dy = p.y - meanY;
    ssXX += dx * dx;
    ssYY += dy * dy;
    ssXY += dx * dy;
  }

  // Collinear distance (Sxx = 0) or zero variance in price (Syy = 0)
  if (ssXX <= 1e-9 || ssYY <= 1e-9 || !Number.isFinite(ssXX) || !Number.isFinite(ssYY)) {
    const safeIntercept = Math.round(meanY * 100) / 100;
    return {
      slopeWonPerKm: 0,
      interceptWon: safeIntercept,
      pearsonR: 0,
      rSquared: 0,
      sampleSize: n,
      stationPremiumRatePercent: 0,
      isStatisticallySignificant: false,
      slopeManwonPerKm: 0,
      interceptManwon: safeIntercept,
    };
  }

  const rawSlope = ssXY / ssXX;
  const rawIntercept = meanY - rawSlope * meanX;
  const denom = Math.sqrt(ssXX * ssYY);
  const rawR = denom > 0 ? ssXY / denom : 0;
  const rawR2 = rawR * rawR;

  // Station Premium Rate: (<1km vs >2km)
  const under1km = points.filter((p) => p.distMeters < 1000);
  const over2km = points.filter((p) => p.distMeters >= 2000);

  const txUnder1km = under1km.reduce((acc, p) => acc + p.txCount, 0);
  const txOver2km = over2km.reduce((acc, p) => acc + p.txCount, 0);

  let pyeongUnder1km = 0;
  let pyeongOver2km = 0;

  if (txUnder1km > 0) {
    pyeongUnder1km = under1km.reduce((acc, p) => acc + p.y * p.txCount, 0) / txUnder1km;
  } else if (under1km.length > 0) {
    pyeongUnder1km = under1km.reduce((acc, p) => acc + p.y, 0) / under1km.length;
  }

  if (txOver2km > 0) {
    pyeongOver2km = over2km.reduce((acc, p) => acc + p.y * p.txCount, 0) / txOver2km;
  } else if (over2km.length > 0) {
    pyeongOver2km = over2km.reduce((acc, p) => acc + p.y, 0) / over2km.length;
  }

  const stationPremiumRatePercent =
    pyeongOver2km > 0 && pyeongUnder1km > 0
      ? Math.round(((pyeongUnder1km - pyeongOver2km) / pyeongOver2km) * 1000) / 10
      : 0;

  // Statistical significance check (t-statistic at alpha = 0.05)
  let isStatisticallySignificant = false;
  if (n >= 3 && Math.abs(rawR) > 0 && rawR2 < 1) {
    const tStat = (Math.abs(rawR) * Math.sqrt(n - 2)) / Math.sqrt(1 - rawR2);
    isStatisticallySignificant = tStat > 1.96;
  }

  const slopeRounded = Math.round(rawSlope * 100) / 100;
  const interceptRounded = Math.round(rawIntercept * 100) / 100;
  const rRounded = Math.round(rawR * 10000) / 10000;
  const r2Rounded = Math.round(rawR2 * 10000) / 10000;

  return {
    slopeWonPerKm: slopeRounded,
    interceptWon: interceptRounded,
    pearsonR: rRounded,
    rSquared: r2Rounded,
    sampleSize: n,
    stationPremiumRatePercent,
    isStatisticallySignificant,
    slopeManwonPerKm: slopeRounded,
    interceptManwon: interceptRounded,
  };
}

/**
 * Filter and sort apartment records across multi-dimensional criteria
 */
export function filterAndSortApartmentRecords(
  records: ApartmentStatRecord[],
  filters: StatsFilterOptions
): ApartmentStatRecord[] {
  if (!Array.isArray(records) || records.length === 0) return [];

  const filtered = records.filter((r) => {
    // 1. Area band filter
    if (filters.areaBand && filters.areaBand !== 'all') {
      const area = r.exclusiveAreaAvgM2;
      if (filters.areaBand === 'small' && area >= 60) return false;
      if (filters.areaBand === 'medium' && (area < 60 || area > 85)) return false;
      if (filters.areaBand === 'large' && area <= 85) return false;
    }

    // 2. Building age filter (Reference year 2026)
    if (filters.buildingAge && filters.buildingAge !== 'all') {
      const age = 2026 - (r.builtYear || 2026);
      if (filters.buildingAge === 'under5' && age > 5) return false;
      if (filters.buildingAge === '5to10' && (age <= 5 || age > 10)) return false;
      if (filters.buildingAge === 'over10' && age <= 10) return false;
    }

    // 3. Dong / Region filter
    if (filters.dong && filters.dong !== 'all') {
      if (filters.dong === '동탄1') {
        if (!['반송동', '석우동', '능동'].includes(r.dong)) return false;
      } else if (filters.dong === '동탄2') {
        if (['반송동', '석우동', '능동'].includes(r.dong)) return false;
      } else if (r.dong !== filters.dong) {
        return false;
      }
    }

    return true;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    switch (filters.sortBy) {
      case 'distance':
        return a.distanceToStationMeters - b.distanceToStationMeters;
      case 'pyeongPriceDesc':
        return b.avgPricePerPyeongWon - a.avgPricePerPyeongWon;
      case 'priceDesc':
        return b.avgPriceWon - a.avgPriceWon;
      case 'latestPriceDesc':
        return b.latestPriceWon - a.latestPriceWon || b.avgPriceWon - a.avgPriceWon;
      case 'volumeDesc':
        return b.txCount - a.txCount;
      case 'latestYear':
        return b.builtYear - a.builtYear;
      default:
        return a.distanceToStationMeters - b.distanceToStationMeters;
    }
  });

  return sorted;
}

/**
 * Main analytical entrypoint for Issue #1 Report
 * Computes all records, filtered records, distance tiers, regression metrics, and live dataset metadata.
 */
export function getDongtanStationAnalysisData(
  filters?: Partial<StatsFilterOptions>
): Issue1AnalysisPayload {
  const resolvedFilters: StatsFilterOptions = {
    areaBand: filters?.areaBand ?? 'all',
    buildingAge: filters?.buildingAge ?? 'all',
    dong: filters?.dong ?? 'all',
    sortBy: filters?.sortBy ?? 'distance',
  };

  const allRecords = MASTER_RECORDS;
  const filteredRecords = filterAndSortApartmentRecords(allRecords, resolvedFilters);
  const distanceTiers = computeDistanceTiers(filteredRecords);
  const regression = computeOLSLinearRegression(filteredRecords);
  const dynamicIssue1Topic = {
    ...STATS_TOPICS[0],
    publishedAt: MASTER_DATASET_META.referenceMonthLabel,
    sampleCount: MASTER_DATASET_META.sampleCountLabel,
  };

  return {
    topic: dynamicIssue1Topic,
    allRecords,
    filteredRecords,
    distanceTiers,
    regression,
    filters: resolvedFilters,
    datasetMeta: MASTER_DATASET_META,
  };
}
