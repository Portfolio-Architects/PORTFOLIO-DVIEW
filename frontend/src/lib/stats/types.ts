/**
 * @module stats/types
 * @description Type definitions and data contracts for the DVIEW Apartment Statistics Engine.
 * Matches specifications defined in PROJECT.md.
 */

import type { StatsTopic } from '@/types/statsTopic';

export type DistanceTierId = '<500m' | '500m-1km' | '1km-2km' | '2km-3km' | '3km+';

export interface ApartmentStatRecord {
  id: string;
  name: string;
  dong: string;
  distanceToStationMeters: number;
  avgPriceWon: number; // in KRW (원)
  avgPricePerPyeongWon: number; // in KRW (원/평)
  latestPriceWon: number;
  txCount: number;
  builtYear: number;
  householdCount: number;
  exclusiveAreaAvgM2: number;
}

export interface DistanceTierSummary {
  tierId: DistanceTierId;
  tierLabel: string;
  distanceRangeMeters: [number, number];
  complexCount: number;
  txVolume: number;
  avgPriceWon: number;
  avgPricePerPyeongWon: number;
  premiumVsAveragePercent: number;
}

export interface RegressionAnalysisResult {
  slopeWonPerKm: number; // Price per pyeong change per 1km (negative, in KRW 원/평 per km)
  interceptWon: number; // Intercept at Dongtan Station (in KRW 원/평)
  pearsonR: number; // Pearson correlation coefficient r
  rSquared: number; // R^2 coefficient of determination
  sampleSize: number; // Sample size n
  stationPremiumRatePercent: number; // Station premium rate (<1km vs >2km)
  isStatisticallySignificant: boolean;
  // Dual-unit convenience fields (in 만원)
  slopeManwonPerKm?: number;
  interceptManwon?: number;
}

export interface StatsFilterOptions {
  areaBand: 'all' | 'small' | 'medium' | 'large'; // small: <60m2, medium: 60-85m2, large: >85m2
  buildingAge: 'all' | 'under5' | '5to10' | 'over10';
  dong: string; // 'all' or legal dong name
  sortBy: 'distance' | 'pyeongPriceDesc' | 'priceDesc' | 'volumeDesc' | 'latestYear';
}

export interface Issue1AnalysisPayload {
  topic: StatsTopic;
  allRecords: ApartmentStatRecord[];
  filteredRecords: ApartmentStatRecord[];
  distanceTiers: DistanceTierSummary[];
  regression: RegressionAnalysisResult;
  filters: StatsFilterOptions;
}
