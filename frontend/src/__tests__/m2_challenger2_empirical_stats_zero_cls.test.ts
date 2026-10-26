/**
 * @file m2_challenger2_empirical_stats_zero_cls.test.ts
 * @description Adversarial empirical challenge suite for Challenger 2:
 * 1. Mathematical edge cases on getDongtanStationAnalysisData() & engine:
 *    - Empty slices (impossible filters) -> no crashes, no NaN, no Infinity
 *    - Single-complex slices -> slope defaults to 0, intercept equals point price
 *    - Collinear & zero-variance inputs -> no crash, no NaN
 *    - Extreme coordinates & Haversine bounds
 * 2. Empirical OLS regression metrics on 127 Dongtan complexes:
 *    - Negative slope, negative Pearson r (-0.66), positive Station Premium (+67.4%)
 * 3. Zero-CLS layout invariants:
 *    - Chart min-heights (min-h-[380px], h-[400px])
 *    - Table row fixed height (h-[52px])
 *    - AdSlot pre-reserved bounding boxes
 */

import fs from 'fs';
import path from 'path';
import {
  calculateHaversineDistanceMeters,
  computeDistanceTiers,
  computeOLSLinearRegression,
  filterAndSortApartmentRecords,
  getDongtanStationAnalysisData,
  DONGTAN_STATION_COORDS,
} from '@/lib/stats/dongtanStationDistanceEngine';
import type { ApartmentStatRecord, StatsFilterOptions } from '@/lib/stats/types';
import { getAdSlotMinHeightClass } from '@/components/ads/core/adSlotGeometry';

describe('Challenger 2 Empirical Challenge: Statistical Engine & Zero-CLS Layout', () => {
  // =========================================================================
  // 1. Mathematical Edge Cases & Numerical Safety
  // =========================================================================
  describe('1. Mathematical Edge Cases on getDongtanStationAnalysisData() & Engine', () => {
    test('Empty filter slices: impossible filter combination yields no crash, no NaN, no Infinity', () => {
      // Impossible combination: Small area (<60m2) + over 10 years old + in non-existent or disjoint dong
      const impossibleFilters: StatsFilterOptions = {
        areaBand: 'small',
        buildingAge: 'over10',
        dong: 'NON_EXISTENT_DONG_TEST_SLICE',
        sortBy: 'distance',
      };

      const result = getDongtanStationAnalysisData(impossibleFilters);

      expect(result.filteredRecords).toEqual([]);
      expect(result.filteredRecords.length).toBe(0);

      // Regression metrics must be well-formed numbers, never NaN or Infinity
      expect(Number.isFinite(result.regression.slopeWonPerKm)).toBe(true);
      expect(Number.isFinite(result.regression.interceptWon)).toBe(true);
      expect(Number.isFinite(result.regression.pearsonR)).toBe(true);
      expect(Number.isFinite(result.regression.rSquared)).toBe(true);
      expect(Number.isFinite(result.regression.stationPremiumRatePercent)).toBe(true);

      expect(result.regression.slopeWonPerKm).toBe(0);
      expect(result.regression.interceptWon).toBe(0);
      expect(result.regression.pearsonR).toBe(0);
      expect(result.regression.rSquared).toBe(0);
      expect(result.regression.sampleSize).toBe(0);
      expect(result.regression.stationPremiumRatePercent).toBe(0);
      expect(result.regression.isStatisticallySignificant).toBe(false);

      // Distance tiers must all have 0 counts and 0 averages, no NaN/Infinity
      result.distanceTiers.forEach((tier) => {
        expect(tier.complexCount).toBe(0);
        expect(tier.txVolume).toBe(0);
        expect(Number.isFinite(tier.avgPriceWon)).toBe(true);
        expect(Number.isFinite(tier.avgPricePerPyeongWon)).toBe(true);
        expect(Number.isFinite(tier.premiumVsAveragePercent)).toBe(true);
        expect(tier.avgPriceWon).toBe(0);
        expect(tier.avgPricePerPyeongWon).toBe(0);
        expect(tier.premiumVsAveragePercent).toBe(0);
      });
    });

    test('Single-complex slice: slope defaults to 0 and intercept equals the point price without crash', () => {
      const singleRecord: ApartmentStatRecord = {
        id: 'test-single-complex',
        name: '단일단지테스트',
        dong: '영천동',
        distanceToStationMeters: 1250,
        avgPriceWon: 850_000_000,
        avgPricePerPyeongWon: 25_000_000,
        latestPriceWon: 850_000_000,
        txCount: 10,
        builtYear: 2020,
        householdCount: 500,
        exclusiveAreaAvgM2: 84.5,
      };

      const regression = computeOLSLinearRegression([singleRecord]);

      expect(regression.sampleSize).toBe(1);
      expect(regression.slopeWonPerKm).toBe(0);
      expect(regression.slopeManwonPerKm).toBe(0);
      // Intercept should equal the single point price in 만원 (2,500만원/평)
      expect(regression.interceptWon).toBe(2500);
      expect(regression.interceptManwon).toBe(2500);
      expect(regression.pearsonR).toBe(0);
      expect(regression.rSquared).toBe(0);
      expect(regression.isStatisticallySignificant).toBe(false);
      expect(regression.stationPremiumRatePercent).toBe(0);
    });

    test('Collinear distance slice (all complexes at identical distance, Sxx = 0): safe fallback to 0 slope', () => {
      const collinearRecords: ApartmentStatRecord[] = [
        {
          id: 'c1',
          name: '단지1',
          dong: '청계동',
          distanceToStationMeters: 1000,
          avgPriceWon: 900_000_000,
          avgPricePerPyeongWon: 30_000_000,
          latestPriceWon: 900_000_000,
          txCount: 5,
          builtYear: 2018,
          householdCount: 400,
          exclusiveAreaAvgM2: 84,
        },
        {
          id: 'c2',
          name: '단지2',
          dong: '청계동',
          distanceToStationMeters: 1000,
          avgPriceWon: 750_000_000,
          avgPricePerPyeongWon: 25_000_000,
          latestPriceWon: 750_000_000,
          txCount: 5,
          builtYear: 2018,
          householdCount: 400,
          exclusiveAreaAvgM2: 84,
        },
      ];

      const regression = computeOLSLinearRegression(collinearRecords);

      expect(regression.sampleSize).toBe(2);
      expect(regression.slopeWonPerKm).toBe(0);
      expect(regression.pearsonR).toBe(0);
      expect(regression.rSquared).toBe(0);
      // Intercept equals mean price in 만원: (3000 + 2500) / 2 = 2750
      expect(regression.interceptWon).toBe(2750);
      expect(Number.isFinite(regression.slopeWonPerKm)).toBe(true);
      expect(Number.isFinite(regression.interceptWon)).toBe(true);
    });

    test('Zero variance in price (all complexes have identical price, Syy = 0): safe fallback to 0 slope', () => {
      const identicalPriceRecords: ApartmentStatRecord[] = [
        {
          id: 'p1',
          name: '단지A',
          dong: '청계동',
          distanceToStationMeters: 500,
          avgPriceWon: 800_000_000,
          avgPricePerPyeongWon: 26_000_000,
          latestPriceWon: 800_000_000,
          txCount: 5,
          builtYear: 2018,
          householdCount: 400,
          exclusiveAreaAvgM2: 84,
        },
        {
          id: 'p2',
          name: '단지B',
          dong: '목동',
          distanceToStationMeters: 2500,
          avgPriceWon: 800_000_000,
          avgPricePerPyeongWon: 26_000_000,
          latestPriceWon: 800_000_000,
          txCount: 5,
          builtYear: 2019,
          householdCount: 400,
          exclusiveAreaAvgM2: 84,
        },
      ];

      const regression = computeOLSLinearRegression(identicalPriceRecords);

      expect(regression.sampleSize).toBe(2);
      expect(regression.slopeWonPerKm).toBe(0);
      expect(regression.pearsonR).toBe(0);
      expect(regression.rSquared).toBe(0);
      expect(regression.interceptWon).toBe(2600);
    });

    test('Extreme coordinates & Haversine bounds: does not overflow or produce negative distances', () => {
      // 1. Identical coordinates -> exact 0
      expect(
        calculateHaversineDistanceMeters(
          DONGTAN_STATION_COORDS.lat,
          DONGTAN_STATION_COORDS.lng
        )
      ).toBe(0);

      // 2. Origin (0, 0)
      const distZero = calculateHaversineDistanceMeters(0, 0);
      expect(distZero).toBe(0);

      // 3. North pole (90, 0)
      const distNorthPole = calculateHaversineDistanceMeters(90, 0);
      expect(distNorthPole).toBeGreaterThan(0);
      expect(Number.isFinite(distNorthPole)).toBe(true);
      expect(distNorthPole).toBeLessThanOrEqual(20_015_000); // Half earth circumference ~20,015km

      // 4. South pole (-90, 0)
      const distSouthPole = calculateHaversineDistanceMeters(-90, 0);
      expect(distSouthPole).toBeGreaterThan(0);
      expect(Number.isFinite(distSouthPole)).toBe(true);
      expect(distSouthPole).toBeLessThanOrEqual(20_015_000);

      // 5. Antipodal point
      const antipodalLat = -DONGTAN_STATION_COORDS.lat;
      const antipodalLng = DONGTAN_STATION_COORDS.lng > 0 ? DONGTAN_STATION_COORDS.lng - 180 : DONGTAN_STATION_COORDS.lng + 180;
      const distAntipodal = calculateHaversineDistanceMeters(antipodalLat, antipodalLng);
      expect(distAntipodal).toBeGreaterThan(19_000_000);
      expect(distAntipodal).toBeLessThanOrEqual(20_037_500); // Max half circumference of earth
      expect(distAntipodal).toBeGreaterThan(0);

      // 6. Non-finite values (NaN, Infinity) -> safe 0 fallback
      expect(calculateHaversineDistanceMeters(NaN, 127.0)).toBe(0);
      expect(calculateHaversineDistanceMeters(37.0, Infinity)).toBe(0);
      expect(calculateHaversineDistanceMeters(-Infinity, 127.0)).toBe(0);
    });
  });

  // =========================================================================
  // 2. Empirical Verification of OLS Regression Metrics on 127 Complexes
  // =========================================================================
  describe('2. Empirically verify OLS regression metrics on the 127 Dongtan complexes', () => {
    const defaultData = getDongtanStationAnalysisData();

    test('Dataset contains exactly 127 complexes', () => {
      expect(defaultData.allRecords.length).toBe(127);
      expect(defaultData.filteredRecords.length).toBe(127);
    });

    test('OLS Slope is strictly negative (price decreases as distance to Dongtan Station increases)', () => {
      // Validated empirical value: ~ -383.5 만원/평 per 1km (negative price gradient)
      expect(defaultData.regression.slopeWonPerKm).toBeLessThan(0);
      expect(defaultData.regression.slopeWonPerKm).toBeLessThan(-300);
      expect(defaultData.regression.slopeWonPerKm).toBeGreaterThan(-450);
      expect(defaultData.regression.slopeWonPerKm).toBeCloseTo(-383.5, 0);
    });

    test('Pearson correlation coefficient r is negative and indicates strong correlation (~ -0.66)', () => {
      // Expected: ~ -0.6645
      expect(defaultData.regression.pearsonR).toBeLessThan(-0.6);
      expect(defaultData.regression.pearsonR).toBeGreaterThan(-0.75);
      expect(defaultData.regression.pearsonR).toBeCloseTo(-0.66, 1);
    });

    test('Coefficient of determination R^2 indicates ~44% variance explained (~ 0.44)', () => {
      // Expected: ~ 0.4416
      expect(defaultData.regression.rSquared).toBeGreaterThan(0.4);
      expect(defaultData.regression.rSquared).toBeLessThan(0.5);
      expect(defaultData.regression.rSquared).toBeCloseTo(0.44, 1);
    });

    test('Station Premium rate is positive (~ +67.4% for <1km vs >2km)', () => {
      // Expected: ~ +67.4%
      expect(defaultData.regression.stationPremiumRatePercent).toBeGreaterThan(60);
      expect(defaultData.regression.stationPremiumRatePercent).toBeLessThan(75);
      expect(defaultData.regression.stationPremiumRatePercent).toBeCloseTo(67.4, 0);
    });

    test('Regression is statistically significant (t > 1.96 at alpha = 0.05)', () => {
      expect(defaultData.regression.isStatisticallySignificant).toBe(true);
    });

    test('Monotonic decrease in average price per pyeong across distance tiers from <500m to 2km-3km', () => {
      const tiers = defaultData.distanceTiers;
      expect(tiers).toHaveLength(5);

      const tier500m = tiers.find((t) => t.tierId === '<500m')!;
      const tier1km = tiers.find((t) => t.tierId === '500m-1km')!;
      const tier2km = tiers.find((t) => t.tierId === '1km-2km')!;
      const tier3km = tiers.find((t) => t.tierId === '2km-3km')!;

      expect(tier500m.avgPricePerPyeongWon).toBeGreaterThan(tier1km.avgPricePerPyeongWon);
      expect(tier1km.avgPricePerPyeongWon).toBeGreaterThan(tier2km.avgPricePerPyeongWon);
      expect(tier2km.avgPricePerPyeongWon).toBeGreaterThan(tier3km.avgPricePerPyeongWon);
    });
  });

  // =========================================================================
  // 3. Zero-CLS Layout Constraints Verification
  // =========================================================================
  describe('3. Verify Zero-CLS Layout Constraints in Source Components', () => {
    const srcDir = path.resolve(__dirname, '..');

    test('DistanceBandComparisonChart.tsx has fixed min-height (min-h-[380px])', () => {
      const filePath = path.join(srcDir, 'components/stats/DistanceBandComparisonChart.tsx');
      const content = fs.readFileSync(filePath, 'utf8');

      expect(content).toContain('min-h-[380px]');
    });

    test('DistanceRegressionScatterPlot.tsx has fixed height (h-[400px])', () => {
      const filePath = path.join(srcDir, 'components/stats/DistanceRegressionScatterPlot.tsx');
      const content = fs.readFileSync(filePath, 'utf8');

      expect(content).toContain('h-[400px]');
    });

    test('ComplexDrillDownTable.tsx table rows have fixed height (h-[52px])', () => {
      const filePath = path.join(srcDir, 'components/stats/ComplexDrillDownTable.tsx');
      const content = fs.readFileSync(filePath, 'utf8');

      expect(content).toContain('h-[52px]');
    });

    test('StatsSkeleton.tsx matches layout bounding boxes (min-h-[380px] & h-[400px])', () => {
      const filePath = path.join(srcDir, 'components/stats/StatsSkeleton.tsx');
      const content = fs.readFileSync(filePath, 'utf8');

      expect(content).toContain('min-h-[380px]');
      expect(content).toContain('h-[400px]');
    });

    test('AdSlot geometry defines pre-reserved bounding boxes for all 4 Ad Money v5.0 formats', () => {
      expect(getAdSlotMinHeightClass('horizontal-strip')).toBe('min-h-[90px] sm:min-h-[100px]');
      expect(getAdSlotMinHeightClass('in-feed')).toBe('min-h-[140px] sm:min-h-[160px]');
      expect(getAdSlotMinHeightClass('rectangle')).toBe('min-h-[250px]');
      expect(getAdSlotMinHeightClass('banner')).toBe('min-h-[250px]');
    });

    test('StatsPageClient.tsx reserves container wrappers for all 4 AdSlots', () => {
      const filePath = path.join(srcDir, 'app/stats/StatsPageClient.tsx');
      const content = fs.readFileSync(filePath, 'utf8');

      // Verify all 4 AdSlots are rendered
      expect(content).toContain('1000000001_stats_top');
      expect(content).toContain('1000000002_stats_mid');
      expect(content).toContain('1000000003_stats_table');
      expect(content).toContain('1000000004_stats_bottom');

      // Verify wrapper styles follow soft-surface rounded-2xl
      expect(content).toContain('rounded-2xl bg-[#f9fafb] dark:bg-[#17171c]');
    });
  });
});
