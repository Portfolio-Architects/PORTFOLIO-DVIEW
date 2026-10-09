import { calculateTwoSigma, TwoSigmaStats } from './twoSigmaEngine';

describe('twoSigmaEngine (수리 통계 모듈 R1)', () => {
  describe('1. Singularity Defense & Sanitization (N < 2)', () => {
    it('returns invalid state when input is null or undefined', () => {
      const nullResult: TwoSigmaStats = calculateTwoSigma(null);
      expect(nullResult).toEqual({
        isValid: false,
        mean: null,
        sd: null,
        upper2SD: null,
        lower2SD: null,
      });

      const undefinedResult: TwoSigmaStats = calculateTwoSigma(undefined);
      expect(undefinedResult).toEqual({
        isValid: false,
        mean: null,
        sd: null,
        upper2SD: null,
        lower2SD: null,
      });
    });

    it('returns invalid state when array is empty (N = 0)', () => {
      const result: TwoSigmaStats = calculateTwoSigma([]);
      expect(result).toEqual({
        isValid: false,
        mean: null,
        sd: null,
        upper2SD: null,
        lower2SD: null,
      });
    });

    it('returns invalid state when array contains single positive element (N = 1)', () => {
      const result: TwoSigmaStats = calculateTwoSigma([42]);
      expect(result).toEqual({
        isValid: false,
        mean: null,
        sd: null,
        upper2SD: null,
        lower2SD: null,
      });
    });

    it('filters out non-positive, non-finite, and nullish values', () => {
      const noisySample: Array<number | null | undefined> = [
        null,
        undefined,
        NaN,
        Infinity,
        -Infinity,
        0,
        -10,
        -0.0001,
      ];
      const result: TwoSigmaStats = calculateTwoSigma(noisySample);
      expect(result).toEqual({
        isValid: false,
        mean: null,
        sd: null,
        upper2SD: null,
        lower2SD: null,
      });
    });

    it('returns invalid state when valid positive sample count after filtering is 1', () => {
      const singleValidSample = [null, 0, -5, 100, undefined, NaN];
      const result: TwoSigmaStats = calculateTwoSigma(singleValidSample);
      expect(result).toEqual({
        isValid: false,
        mean: null,
        sd: null,
        upper2SD: null,
        lower2SD: null,
      });
    });
  });

  describe('2. Two-Pass Bessel-Corrected Variance & Mean (N >= 2)', () => {
    it('computes exact mean, Bessel-corrected sd, and intervals for N = 2', () => {
      // Sample: [10, 20]
      // mu = 15
      // s^2 = ((10-15)^2 + (20-15)^2) / (2 - 1) = (25 + 25) / 1 = 50
      // s = sqrt(50) = 5 * sqrt(2) ~ 7.0710678118654755
      // upper2SD = 15 + 2 * sqrt(50) ~ 29.14213562373095
      // lower2SD = max(0, 15 - 2 * sqrt(50)) ~ 0.857864376269049
      const result: TwoSigmaStats = calculateTwoSigma([10, 20]);

      expect(result.isValid).toBe(true);
      expect(result.mean).toBeCloseTo(15, 10);
      expect(result.sd).toBeCloseTo(Math.sqrt(50), 10);
      expect(result.upper2SD).toBeCloseTo(15 + 2 * Math.sqrt(50), 10);
      expect(result.lower2SD).toBeCloseTo(15 - 2 * Math.sqrt(50), 10);
    });

    it('handles identical values resulting in zero variance (s = 0)', () => {
      const result: TwoSigmaStats = calculateTwoSigma([50, 50, 50, 50]);

      expect(result.isValid).toBe(true);
      expect(result.mean).toBe(50);
      expect(result.sd).toBe(0);
      expect(result.upper2SD).toBe(50);
      expect(result.lower2SD).toBe(50);
    });

    it('computes correct statistics on standard integer dataset (N = 8)', () => {
      // Sample: [2, 4, 4, 4, 5, 5, 7, 9]
      // sum = 40, N = 8, mu = 5
      // sum((x_i - mu)^2) = 9 + 1 + 1 + 1 + 0 + 0 + 4 + 16 = 32
      // s^2 = 32 / (8 - 1) = 32 / 7 ~ 4.5714285714
      // s = sqrt(32 / 7) ~ 2.1380899353
      const sample = [2, 4, 4, 4, 5, 5, 7, 9];
      const result: TwoSigmaStats = calculateTwoSigma(sample);

      const expectedMean = 5;
      const expectedVariance = 32 / 7;
      const expectedSd = Math.sqrt(expectedVariance);

      expect(result.isValid).toBe(true);
      expect(result.mean).toBeCloseTo(expectedMean, 10);
      expect(result.sd).toBeCloseTo(expectedSd, 10);
      expect(result.upper2SD).toBeCloseTo(expectedMean + 2 * expectedSd, 10);
      expect(result.lower2SD).toBeCloseTo(expectedMean - 2 * expectedSd, 10);
    });
  });

  describe('3. Non-Negative Lower Bound Clamping (lower2SD = max(0, mu - 2s))', () => {
    it('clamps lower2SD to 0 when mu - 2s is strictly negative', () => {
      // Sample: [1, 100]
      // mu = 50.5
      // s^2 = ((1 - 50.5)^2 + (100 - 50.5)^2) / 1 = 2 * 2450.25 = 4900.5
      // s = sqrt(4900.5) ~ 70.00357
      // mu - 2s = 50.5 - 140.00714 < 0
      // lower2SD must clamp to 0
      const result: TwoSigmaStats = calculateTwoSigma([1, 100]);

      expect(result.isValid).toBe(true);
      expect(result.mean).toBeCloseTo(50.5, 10);
      expect(result.sd).toBeCloseTo(Math.sqrt(4900.5), 10);
      expect(result.upper2SD).toBeCloseTo(50.5 + 2 * Math.sqrt(4900.5), 10);
      expect(result.lower2SD).toBe(0);
    });

    it('retains exact lower2SD when mu - 2s is positive', () => {
      // Sample: [90, 100, 110]
      // mu = 100
      // s^2 = (100 + 0 + 100) / 2 = 100
      // s = 10
      // mu - 2s = 100 - 20 = 80 > 0
      const result: TwoSigmaStats = calculateTwoSigma([90, 100, 110]);

      expect(result.isValid).toBe(true);
      expect(result.mean).toBe(100);
      expect(result.sd).toBe(10);
      expect(result.upper2SD).toBe(120);
      expect(result.lower2SD).toBe(80);
    });
  });

  describe('4. Noise Resilience & Interleaved Data Sanitization', () => {
    it('accurately sanitizes interleaved nulls, negative values, and non-numbers', () => {
      const noisyList: Array<number | null | undefined> = [
        undefined,
        100,
        null,
        -50,
        200,
        NaN,
        0,
        Infinity,
        300,
        -Infinity,
      ];

      // Sanitized list is [100, 200, 300]
      // N = 3
      // mu = 200
      // s^2 = ((100-200)^2 + 0 + (300-200)^2) / 2 = 20000 / 2 = 10000
      // s = 100
      // upper2SD = 400
      // lower2SD = max(0, 200 - 200) = 0
      const result: TwoSigmaStats = calculateTwoSigma(noisyList);

      expect(result.isValid).toBe(true);
      expect(result.mean).toBe(200);
      expect(result.sd).toBe(100);
      expect(result.upper2SD).toBe(400);
      expect(result.lower2SD).toBe(0);
    });
  });

  describe('5. Numerical Stability with Floating-Point and Scale Extremes', () => {
    it('handles decimal precision and small values', () => {
      const sample = [0.001, 0.002, 0.003];
      const result = calculateTwoSigma(sample);

      expect(result.isValid).toBe(true);
      expect(result.mean).toBeCloseTo(0.002, 8);
      expect(result.sd).toBeCloseTo(0.001, 8);
      expect(result.upper2SD).toBeCloseTo(0.004, 8);
      expect(result.lower2SD).toBeCloseTo(0, 8);
    });

    it('maintains stability for large financial magnitudes (10^8 ~ 10^9 scale)', () => {
      const realEstatePrices = [800000000, 850000000, 900000000, 950000000, 1000000000];
      const result = calculateTwoSigma(realEstatePrices);

      // N = 5, mu = 900,000,000
      // differences: -100M, -50M, 0, 50M, 100M
      // sum(diff^2) = 10^16 + 2.5*10^15 + 0 + 2.5*10^15 + 10^16 = 2.5 * 10^16
      // s^2 = 2.5 * 10^16 / 4 = 6.25 * 10^15
      // s = 79,056,941.50420948
      const expectedMean = 900000000;
      const expectedVariance = 2.5e16 / 4;
      const expectedSd = Math.sqrt(expectedVariance);

      expect(result.isValid).toBe(true);
      expect(result.mean).toBe(expectedMean);
      expect(result.sd).toBeCloseTo(expectedSd, 4);
      expect(result.upper2SD).toBeCloseTo(expectedMean + 2 * expectedSd, 4);
      expect(result.lower2SD).toBeCloseTo(expectedMean - 2 * expectedSd, 4);
    });
  });
});
