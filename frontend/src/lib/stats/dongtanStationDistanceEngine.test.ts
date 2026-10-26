/**
 * @file dongtanStationDistanceEngine.test.ts
 * @description Comprehensive unit test suite for Dongtan Station Distance Analysis Engine.
 * Tests 100% real data parity, Haversine geometry, 5 distance tiers, OLS linear regression math,
 * multi-dimensional filtering, and exhaustive numerical edge cases.
 */

import {
  DONGTAN_STATION_COORDS,
  calculateHaversineDistanceMeters,
  computeDistanceTiers,
  computeOLSLinearRegression,
  filterAndSortApartmentRecords,
  getDongtanStationAnalysisData,
} from './dongtanStationDistanceEngine';
import { STATS_TOPICS, getActiveStatsTopic, getStatsTopicById } from '@/types/statsTopic';
import type { ApartmentStatRecord, StatsFilterOptions } from './types';

// Direct ground truth inspection from verified public datasets
import locScoresData from '../location-scores.json';

describe('DongtanStationDistanceEngine Unit Test Suite', () => {
  // ==========================================================================
  // 1. Topic Registry & Metadata Contracts
  // ==========================================================================
  describe('1. Topic Registry & Extensible Metadata', () => {
    test('STATS_TOPICS contains Issue #1 as active report with exact title', () => {
      const issue1 = STATS_TOPICS.find((t) => t.issueNumber === 1);
      expect(issue1).toBeDefined();
      expect(issue1?.status).toBe('active');
      expect(issue1?.title).toBe('동탄역과의 거리가 아파트 가격에 미치는 영향');
      expect(issue1?.badge).toBe('Issue #1');
    });

    test('STATS_TOPICS contains extensible upcoming issues for future research', () => {
      const upcoming = STATS_TOPICS.filter((t) => t.status === 'upcoming');
      expect(upcoming.length).toBeGreaterThanOrEqual(3);
      upcoming.forEach((topic) => {
        expect(topic.status).toBe('upcoming');
        expect(topic.issueNumber).toBeGreaterThan(1);
        expect(topic.title.length).toBeGreaterThan(0);
      });
    });

    test('getActiveStatsTopic returns Issue #1 by default', () => {
      const active = getActiveStatsTopic();
      expect(active.issueNumber).toBe(1);
      expect(active.status).toBe('active');
    });

    test('getStatsTopicById finds topic by unique id', () => {
      const topic = getStatsTopicById('dongtan-station-distance');
      expect(topic).toBeDefined();
      expect(topic?.issueNumber).toBe(1);

      const notFound = getStatsTopicById('non-existent-topic');
      expect(notFound).toBeUndefined();
    });
  });

  // ==========================================================================
  // 2. Real Public Data Loading & Parity (100% Real Data Only)
  // ==========================================================================
  describe('2. Real Public Data Loading & Parity (100% Real Data Only)', () => {
    const analysis = getDongtanStationAnalysisData();

    test('Loads exactly 127 geocoded Dongtan apartment complexes in allRecords', () => {
      expect(analysis.allRecords).toHaveLength(127);
      expect(analysis.filteredRecords).toHaveLength(127);
    });

    test('All 127 complexes have strictly positive distance, price, and transaction counts', () => {
      analysis.allRecords.forEach((record) => {
        expect(record.distanceToStationMeters).toBeGreaterThan(0);
        expect(record.avgPriceWon).toBeGreaterThan(0);
        expect(record.avgPricePerPyeongWon).toBeGreaterThan(0);
        expect(record.latestPriceWon).toBeGreaterThan(0);
        expect(record.txCount).toBeGreaterThan(0);
        expect(record.builtYear).toBeGreaterThanOrEqual(2000);
        expect(record.householdCount).toBeGreaterThanOrEqual(0);
        expect(record.exclusiveAreaAvgM2).toBeGreaterThan(0);
      });
    });

    test('Total transaction volume across all 127 complexes matches verified real transactions (>8,000)', () => {
      const totalTx = analysis.allRecords.reduce((sum, r) => sum + r.txCount, 0);
      expect(totalTx).toBeGreaterThan(8000);
      expect(totalTx).toBeLessThan(9000);
      expect(totalTx).toBe(analysis.allRecords.reduce((sum, r) => sum + r.txCount, 0));
    });

    test('Station coordinates strictly equal official GTX-A Dongtan Station WGS84 location', () => {
      expect(DONGTAN_STATION_COORDS.lat).toBe(37.200092);
      expect(DONGTAN_STATION_COORDS.lng).toBe(127.095514);
    });

    test('100% exact distance parity with location-scores.json (Max delta = 0 meters)', () => {
      const locMap = locScoresData as Record<string, { distanceToSubway: number }>;
      let maxDelta = 0;

      analysis.allRecords.forEach((r) => {
        const expectedDist = locMap[r.name]?.distanceToSubway;
        expect(expectedDist).toBeDefined();
        const delta = Math.abs(r.distanceToStationMeters - expectedDist);
        if (delta > maxDelta) maxDelta = delta;
      });

      expect(maxDelta).toBe(0);
    });
  });

  // ==========================================================================
  // 3. Haversine Distance Calculation & Edge Cases
  // ==========================================================================
  describe('3. Haversine Distance Calculation & Geometry', () => {
    test('Calculates distance from Dongtan Station to Dongtan Station as 0 meters', () => {
      const dist = calculateHaversineDistanceMeters(
        DONGTAN_STATION_COORDS.lat,
        DONGTAN_STATION_COORDS.lng,
        DONGTAN_STATION_COORDS.lat,
        DONGTAN_STATION_COORDS.lng
      );
      expect(dist).toBe(0);
    });

    test('Calculates distance to nearest complex (동탄역 롯데캐슬 ~ 192m)', () => {
      // 동탄역 롯데캐슬 exact geocode: lat 37.201452, lng 127.096841
      const dist = calculateHaversineDistanceMeters(37.201452, 127.096841);
      expect(dist).toBe(192);
    });

    test('Preserves spherical symmetry: dist(A, B) === dist(B, A)', () => {
      const latA = 37.21,
        lngA = 127.08;
      const latB = 37.19,
        lngB = 127.11;
      const d1 = calculateHaversineDistanceMeters(latA, lngA, latB, lngB);
      const d2 = calculateHaversineDistanceMeters(latB, lngB, latA, lngA);
      expect(d1).toBe(d2);
      expect(d1).toBeGreaterThan(0);
    });

    test('Handles non-finite or missing coordinates safely with 0 output', () => {
      expect(calculateHaversineDistanceMeters(NaN, 127.0)).toBe(0);
      expect(calculateHaversineDistanceMeters(37.0, Infinity)).toBe(0);
      expect(calculateHaversineDistanceMeters(0, 0)).toBe(0);
    });
  });

  // ==========================================================================
  // 4. Distance Tier Aggregation Accuracy
  // ==========================================================================
  describe('4. Distance Tier Aggregation Accuracy', () => {
    const analysis = getDongtanStationAnalysisData();
    const tiers = analysis.distanceTiers;

    test('Generates exactly 5 non-overlapping distance tiers', () => {
      expect(tiers).toHaveLength(5);
      expect(tiers.map((t) => t.tierId)).toEqual([
        '<500m',
        '500m-1km',
        '1km-2km',
        '2km-3km',
        '3km+',
      ]);
    });

    test('Complex count partitions all 127 complexes: 6 + 15 + 29 + 34 + 43 = 127', () => {
      const counts = tiers.map((t) => t.complexCount);
      expect(counts).toEqual([6, 15, 29, 34, 43]);
      expect(counts.reduce((a, b) => a + b, 0)).toBe(127);
    });

    test('Transaction volume partitions all transactions across 5 tiers without loss', () => {
      const volumes = tiers.map((t) => t.txVolume);
      const totalTx = analysis.allRecords.reduce((sum, r) => sum + r.txCount, 0);
      expect(volumes).toHaveLength(5);
      expect(volumes.every((v) => v > 0)).toBe(true);
      expect(volumes.reduce((a, b) => a + b, 0)).toBe(totalTx);
    });

    test('<500m (초역세권) shows highest average price per pyeong at over 4,000만원/평', () => {
      const tierUnder500 = tiers.find((t) => t.tierId === '<500m')!;
      expect(tierUnder500.avgPricePerPyeongWon).toBeGreaterThan(40_000_000);
      expect(tierUnder500.avgPricePerPyeongWon).toBeLessThan(45_000_000);
    });

    test('Average price per pyeong decreases monotonically from <500m to 2km-3km', () => {
      expect(tiers[0].avgPricePerPyeongWon).toBeGreaterThan(tiers[1].avgPricePerPyeongWon);
      expect(tiers[1].avgPricePerPyeongWon).toBeGreaterThan(tiers[2].avgPricePerPyeongWon);
      expect(tiers[2].avgPricePerPyeongWon).toBeGreaterThan(tiers[3].avgPricePerPyeongWon);
    });

    test('Premium rate vs overall average is highest for <500m (+64%) and 500m-1km (+41%)', () => {
      expect(tiers[0].premiumVsAveragePercent).toBeGreaterThan(60);
      expect(tiers[0].premiumVsAveragePercent).toBeLessThan(70);
      expect(tiers[1].premiumVsAveragePercent).toBeGreaterThan(38);
      expect(tiers[1].premiumVsAveragePercent).toBeLessThan(46);
    });

    test('Empty records input returns 5 zeroed tiers with zero NaN or Infinity', () => {
      const emptyTiers = computeDistanceTiers([]);
      expect(emptyTiers).toHaveLength(5);
      emptyTiers.forEach((t) => {
        expect(t.complexCount).toBe(0);
        expect(t.txVolume).toBe(0);
        expect(t.avgPriceWon).toBe(0);
        expect(t.avgPricePerPyeongWon).toBe(0);
        expect(t.premiumVsAveragePercent).toBe(0);
        expect(Number.isNaN(t.avgPriceWon)).toBe(false);
      });
    });
  });

  // ==========================================================================
  // 5. OLS Linear Regression & Correlation Formula Validation
  // ==========================================================================
  describe('5. OLS Linear Regression & Correlation Math', () => {
    const analysis = getDongtanStationAnalysisData();
    const reg = analysis.regression;

    test('OLS slope is negative (~ -382.65 ~ -383.51 만원/평 per km), confirming negative price gradient with distance', () => {
      expect(reg.slopeWonPerKm).toBeLessThan(-350);
      expect(reg.slopeWonPerKm).toBeGreaterThan(-420);
      expect(reg.slopeWonPerKm).toBeCloseTo(-383.5, 0);
    });

    test('OLS intercept at Dongtan Station center is positive (~ 3,413 ~ 3,418 만원/평)', () => {
      expect(reg.interceptWon).toBeGreaterThan(3200);
      expect(reg.interceptWon).toBeLessThan(3600);
      expect(reg.interceptWon).toBeCloseTo(3417.6, 0);
    });

    test('Pearson correlation r indicates strong negative correlation (r ~ -0.665)', () => {
      expect(reg.pearsonR).toBeLessThan(-0.6);
      expect(reg.pearsonR).toBeGreaterThan(-0.72);
      expect(reg.pearsonR).toBeCloseTo(-0.6645, 2);
    });

    test('Determination coefficient R^2 confirms ~44.2% of price variance explained by distance', () => {
      expect(reg.rSquared).toBeGreaterThan(0.4);
      expect(reg.rSquared).toBeLessThan(0.5);
      expect(reg.rSquared).toBeCloseTo(0.4416, 2);
      // Mathematical consistency: R^2 = r^2
      expect(Math.abs(reg.rSquared - Math.round(reg.pearsonR * reg.pearsonR * 10000) / 10000)).toBeLessThan(0.001);
    });

    test('Station premium rate (<1km vs >2km) is statistically significant at +67.4%', () => {
      expect(reg.stationPremiumRatePercent).toBeGreaterThan(60);
      expect(reg.stationPremiumRatePercent).toBeLessThan(75);
      expect(reg.stationPremiumRatePercent).toBeCloseTo(67.4, 0);
      expect(reg.isStatisticallySignificant).toBe(true);
    });

    test('Regression sampleSize strictly equals total evaluated complexes (127)', () => {
      expect(reg.sampleSize).toBe(127);
    });
  });

  // ==========================================================================
  // 6. Multi-Dimensional Slicing & Sorting
  // ==========================================================================
  describe('6. Multi-Dimensional Slicing & Sorting', () => {
    const all = getDongtanStationAnalysisData().allRecords;

    test('Filters by area band: small (<60m2)', () => {
      const filtered = filterAndSortApartmentRecords(all, {
        areaBand: 'small',
        buildingAge: 'all',
        dong: 'all',
        sortBy: 'distance',
      });
      filtered.forEach((r) => {
        expect(r.exclusiveAreaAvgM2).toBeLessThan(60);
      });
    });

    test('Filters by area band: medium (60~85m2, 국민평형)', () => {
      const filtered = filterAndSortApartmentRecords(all, {
        areaBand: 'medium',
        buildingAge: 'all',
        dong: 'all',
        sortBy: 'distance',
      });
      expect(filtered.length).toBeGreaterThan(50);
      filtered.forEach((r) => {
        expect(r.exclusiveAreaAvgM2).toBeGreaterThanOrEqual(60);
        expect(r.exclusiveAreaAvgM2).toBeLessThanOrEqual(85);
      });
    });

    test('Filters by area band: large (>85m2)', () => {
      const filtered = filterAndSortApartmentRecords(all, {
        areaBand: 'large',
        buildingAge: 'all',
        dong: 'all',
        sortBy: 'distance',
      });
      filtered.forEach((r) => {
        expect(r.exclusiveAreaAvgM2).toBeGreaterThan(85);
      });
    });

    test('Filters by building age: under5 (Built >= 2021)', () => {
      const filtered = filterAndSortApartmentRecords(all, {
        areaBand: 'all',
        buildingAge: 'under5',
        dong: 'all',
        sortBy: 'distance',
      });
      filtered.forEach((r) => {
        expect(r.builtYear).toBeGreaterThanOrEqual(2021);
      });
    });

    test('Filters by region: 동탄1 vs 동탄2', () => {
      const dt1 = filterAndSortApartmentRecords(all, {
        areaBand: 'all',
        buildingAge: 'all',
        dong: '동탄1',
        sortBy: 'distance',
      });
      const dt2 = filterAndSortApartmentRecords(all, {
        areaBand: 'all',
        buildingAge: 'all',
        dong: '동탄2',
        sortBy: 'distance',
      });

      expect(dt1.length + dt2.length).toBe(127);
      dt1.forEach((r) => expect(['반송동', '석우동', '능동']).toContain(r.dong));
      dt2.forEach((r) => expect(['반송동', '석우동', '능동']).not.toContain(r.dong));
    });

    test('Filters by specific legal dong (청계동)', () => {
      const cheonggye = filterAndSortApartmentRecords(all, {
        areaBand: 'all',
        buildingAge: 'all',
        dong: '청계동',
        sortBy: 'distance',
      });
      expect(cheonggye.length).toBeGreaterThan(0);
      cheonggye.forEach((r) => expect(r.dong).toBe('청계동'));
    });

    test('Sorts by distance ascending', () => {
      const sorted = filterAndSortApartmentRecords(all, {
        areaBand: 'all',
        buildingAge: 'all',
        dong: 'all',
        sortBy: 'distance',
      });
      for (let i = 0; i < sorted.length - 1; i++) {
        expect(sorted[i].distanceToStationMeters).toBeLessThanOrEqual(
          sorted[i + 1].distanceToStationMeters
        );
      }
    });

    test('Sorts by price per pyeong descending', () => {
      const sorted = filterAndSortApartmentRecords(all, {
        areaBand: 'all',
        buildingAge: 'all',
        dong: 'all',
        sortBy: 'pyeongPriceDesc',
      });
      for (let i = 0; i < sorted.length - 1; i++) {
        expect(sorted[i].avgPricePerPyeongWon).toBeGreaterThanOrEqual(
          sorted[i + 1].avgPricePerPyeongWon
        );
      }
    });

    test('Sorts by transaction volume descending', () => {
      const sorted = filterAndSortApartmentRecords(all, {
        areaBand: 'all',
        buildingAge: 'all',
        dong: 'all',
        sortBy: 'volumeDesc',
      });
      for (let i = 0; i < sorted.length - 1; i++) {
        expect(sorted[i].txCount).toBeGreaterThanOrEqual(sorted[i + 1].txCount);
      }
    });
  });

  // ==========================================================================
  // 7. Numerical Safety & Edge Cases
  // ==========================================================================
  describe('7. Numerical Safety & Edge Cases (Zero NaN or Infinity)', () => {
    test('n = 0 (Empty dataset) returns safe zeroed metrics without crashing', () => {
      const reg = computeOLSLinearRegression([]);
      expect(reg.sampleSize).toBe(0);
      expect(reg.slopeWonPerKm).toBe(0);
      expect(reg.interceptWon).toBe(0);
      expect(reg.pearsonR).toBe(0);
      expect(reg.rSquared).toBe(0);
      expect(reg.stationPremiumRatePercent).toBe(0);
      expect(reg.isStatisticallySignificant).toBe(false);
      expect(Number.isFinite(reg.slopeWonPerKm)).toBe(true);
      expect(Number.isNaN(reg.slopeWonPerKm)).toBe(false);
    });

    test('n = 1 (Single record) returns slope 0, intercept equal to point price', () => {
      const single: ApartmentStatRecord[] = [
        {
          id: '단일단지',
          name: '단일단지',
          dong: '오산동',
          distanceToStationMeters: 500,
          avgPriceWon: 1_000_000_000,
          avgPricePerPyeongWon: 30_000_000,
          latestPriceWon: 1_000_000_000,
          txCount: 10,
          builtYear: 2020,
          householdCount: 500,
          exclusiveAreaAvgM2: 84,
        },
      ];
      const reg = computeOLSLinearRegression(single);
      expect(reg.sampleSize).toBe(1);
      expect(reg.slopeWonPerKm).toBe(0);
      expect(reg.interceptWon).toBe(3000); // 3,000만원
      expect(reg.pearsonR).toBe(0);
      expect(reg.rSquared).toBe(0);
      expect(reg.isStatisticallySignificant).toBe(false);
      expect(Number.isFinite(reg.interceptWon)).toBe(true);
    });

    test('Collinear distance (Sxx = 0) handles zero distance variance without division by zero', () => {
      const collinear: ApartmentStatRecord[] = [
        {
          id: 'A',
          name: 'A',
          dong: '오산동',
          distanceToStationMeters: 1000,
          avgPriceWon: 800_000_000,
          avgPricePerPyeongWon: 25_000_000,
          latestPriceWon: 800_000_000,
          txCount: 5,
          builtYear: 2018,
          householdCount: 300,
          exclusiveAreaAvgM2: 84,
        },
        {
          id: 'B',
          name: 'B',
          dong: '오산동',
          distanceToStationMeters: 1000,
          avgPriceWon: 1_200_000_000,
          avgPricePerPyeongWon: 35_000_000,
          latestPriceWon: 1_200_000_000,
          txCount: 5,
          builtYear: 2018,
          householdCount: 300,
          exclusiveAreaAvgM2: 84,
        },
      ];
      const reg = computeOLSLinearRegression(collinear);
      expect(reg.slopeWonPerKm).toBe(0);
      expect(reg.interceptWon).toBe(3000); // Mean of 2500 and 3500 만원
      expect(reg.pearsonR).toBe(0);
      expect(reg.rSquared).toBe(0);
      expect(Number.isFinite(reg.slopeWonPerKm)).toBe(true);
      expect(Number.isNaN(reg.slopeWonPerKm)).toBe(false);
    });

    test('Zero price variance (Syy = 0) handles identical prices across all complexes safely', () => {
      const flat: ApartmentStatRecord[] = [
        {
          id: 'A',
          name: 'A',
          dong: '오산동',
          distanceToStationMeters: 500,
          avgPriceWon: 900_000_000,
          avgPricePerPyeongWon: 30_000_000,
          latestPriceWon: 900_000_000,
          txCount: 5,
          builtYear: 2018,
          householdCount: 300,
          exclusiveAreaAvgM2: 84,
        },
        {
          id: 'B',
          name: 'B',
          dong: '영천동',
          distanceToStationMeters: 1500,
          avgPriceWon: 900_000_000,
          avgPricePerPyeongWon: 30_000_000,
          latestPriceWon: 900_000_000,
          txCount: 5,
          builtYear: 2018,
          householdCount: 300,
          exclusiveAreaAvgM2: 84,
        },
        {
          id: 'C',
          name: 'C',
          dong: '송동',
          distanceToStationMeters: 2500,
          avgPriceWon: 900_000_000,
          avgPricePerPyeongWon: 30_000_000,
          latestPriceWon: 900_000_000,
          txCount: 5,
          builtYear: 2018,
          householdCount: 300,
          exclusiveAreaAvgM2: 84,
        },
      ];
      const reg = computeOLSLinearRegression(flat);
      expect(reg.slopeWonPerKm).toBe(0);
      expect(reg.interceptWon).toBe(3000);
      expect(reg.pearsonR).toBe(0);
      expect(reg.rSquared).toBe(0);
      expect(Number.isFinite(reg.slopeWonPerKm)).toBe(true);
    });

    test('Impossible filter slice (Empty result) updates analysis payload safely', () => {
      const impossibleFilters: StatsFilterOptions = {
        areaBand: 'small',
        buildingAge: 'under5',
        dong: '반송동', // BanSongDong is Dongtan 1 (built in 2007~2008, zero under 5 years)
        sortBy: 'distance',
      };
      const result = getDongtanStationAnalysisData(impossibleFilters);
      expect(result.filteredRecords).toHaveLength(0);
      expect(result.regression.sampleSize).toBe(0);
      expect(result.regression.slopeWonPerKm).toBe(0);
      expect(Number.isNaN(result.regression.slopeWonPerKm)).toBe(false);
    });
  });
});
