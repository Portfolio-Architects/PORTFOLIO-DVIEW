/**
 * @file m5_r1_r2_adversarial_empirical.challenger.test.tsx
 * @description Adversarial empirical stress-test suite for Milestone M5:
 *   - Requirement R1: twoSigmaEngine.ts (mathematical statistics, Bessel correction, clamping, numerical stability)
 *   - Requirement R2: MacroTrendChart.tsx & DiamondVertex (Recharts reference bands, diamond vertices, geometry)
 *
 * Epistemic Standards: HODEP v2.2, zero mocks for computation, strict mathematical assertions.
 */

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { calculateTwoSigma, TwoSigmaStats } from '../lib/analytics/twoSigmaEngine';
import MacroTrendChart, { DiamondVertex } from '../components/macro/MacroTrendChart';

// Unmock recharts to test actual SVG polygon, line, and reference area DOM generation
jest.unmock('recharts');

describe('Milestone M5 Challenger 1: Adversarial Empirical Stress Test Suite', () => {
  // =========================================================================
  // Dimension 1: Extreme Sample Sizes & Probability Distributions
  // =========================================================================
  describe('Dimension 1: Extreme Sample Sizes & Distributions', () => {
    it('enforces singularity defense on N = 0 (empty, null, undefined, non-array)', () => {
      const inputs: any[] = [[], null, undefined, {}, 'not-an-array', 12345, true];
      for (const input of inputs) {
        const res: TwoSigmaStats = calculateTwoSigma(input);
        expect(res.isValid).toBe(false);
        expect(res.mean).toBeNull();
        expect(res.sd).toBeNull();
        expect(res.upper2SD).toBeNull();
        expect(res.lower2SD).toBeNull();
      }
    });

    it('enforces singularity defense on N = 1 with arbitrary magnitude', () => {
      const singletons = [[0.000001], [1], [42], [999999999], [Number.MAX_SAFE_INTEGER]];
      for (const arr of singletons) {
        const res = calculateTwoSigma(arr);
        expect(res.isValid).toBe(false);
        expect(res.mean).toBeNull();
        expect(res.sd).toBeNull();
        expect(res.upper2SD).toBeNull();
        expect(res.lower2SD).toBeNull();
      }
    });

    it('empirically verifies N = 2 minimal degrees of freedom (N - 1 = 1)', () => {
      const a = 12.5;
      const b = 27.5;
      const res = calculateTwoSigma([a, b]);
      const expectedMean = (a + b) / 2; // 20.0
      const diffA = a - expectedMean; // -7.5
      const diffB = b - expectedMean; // 7.5
      const expectedVariance = (diffA * diffA + diffB * diffB) / (2 - 1); // 112.5
      const expectedSd = Math.sqrt(expectedVariance); // 10.606601717798213

      expect(res.isValid).toBe(true);
      expect(res.mean).toBeCloseTo(expectedMean, 12);
      expect(res.sd).toBeCloseTo(expectedSd, 12);
      expect(res.upper2SD).toBeCloseTo(expectedMean + 2 * expectedSd, 12);
      expect(res.lower2SD).toBeCloseTo(Math.max(0, expectedMean - 2 * expectedSd), 12);
    });

    it('empirically verifies N = 1000 identical elements produces variance near zero (floating point epsilon)', () => {
      const N = 1000;
      const identicalValue = 888.88;
      const data = new Array(N).fill(identicalValue);

      const res = calculateTwoSigma(data);
      expect(res.isValid).toBe(true);
      expect(res.mean).toBeCloseTo(identicalValue, 10);
      // Empirically observes IEEE 754 float summation roundoff error: s ~ 4.2085e-12
      expect(res.sd).toBeCloseTo(0, 10);
      expect(res.upper2SD).toBeCloseTo(identicalValue, 10);
      expect(res.lower2SD).toBeCloseTo(identicalValue, 10);
    });

    it('empirically verifies integer identical elements produces exact s = 0', () => {
      const N = 1000;
      const integerVal = 50;
      const data = new Array(N).fill(integerVal);

      const res = calculateTwoSigma(data);
      expect(res.isValid).toBe(true);
      expect(res.mean).toBe(integerVal);
      expect(res.sd).toBe(0);
      expect(res.upper2SD).toBe(integerVal);
      expect(res.lower2SD).toBe(integerVal);
    });

    it('empirically verifies N = 1000 uniform distribution matching population moments', () => {
      // Deterministic uniform sequence on [10, 110]
      const N = 1000;
      const data: number[] = [];
      let manualSum = 0;
      for (let i = 0; i < N; i++) {
        const val = 10 + (100 * i) / (N - 1);
        data.push(val);
        manualSum += val;
      }
      const manualMean = manualSum / N;
      let manualSumSq = 0;
      for (let i = 0; i < N; i++) {
        const diff = data[i] - manualMean;
        manualSumSq += diff * diff;
      }
      const manualSd = Math.sqrt(manualSumSq / (N - 1));

      const res = calculateTwoSigma(data);
      expect(res.isValid).toBe(true);
      expect(res.mean).toBeCloseTo(manualMean, 10);
      expect(res.sd).toBeCloseTo(manualSd, 10);
      expect(res.upper2SD).toBeCloseTo(manualMean + 2 * manualSd, 10);
      expect(res.lower2SD).toBeCloseTo(Math.max(0, manualMean - 2 * manualSd), 10);
    });

    it('empirically verifies Fat-Tailed / Power-law distribution with massive outlier', () => {
      // 999 values at 1.0, 1 outlier at 1,000,000
      const N = 1000;
      const data = new Array(N - 1).fill(1.0);
      data.push(1000000.0);

      const res = calculateTwoSigma(data);
      expect(res.isValid).toBe(true);

      const trueMean = (999 * 1.0 + 1000000.0) / 1000; // 1000.999
      expect(res.mean).toBeCloseTo(trueMean, 6);
      expect(res.sd!).toBeGreaterThan(31000); // Massive dispersion
      // Lower bound mu - 2s is heavily negative, so lower2SD MUST clamp to 0
      expect(res.mean! - 2 * res.sd!).toBeLessThan(0);
      expect(res.lower2SD).toBe(0);
      expect(res.upper2SD!).toBeGreaterThan(60000);
    });
  });

  // =========================================================================
  // Dimension 2: Numerical Stability, Type Sanitization & Catastrophic Cancellation
  // =========================================================================
  describe('Dimension 2: Numerical Stability & Sanitization', () => {
    it('sanitizes NaN, Infinity, -Infinity, negative numbers, 0, and null/undefined interleaving', () => {
      const noisy = [
        NaN,
        null,
        -100,
        undefined,
        0,
        -0,
        -Infinity,
        Infinity,
        15.0,
        null,
        NaN,
        25.0,
        -9999,
        undefined,
      ];
      // Only [15.0, 25.0] are valid strictly positive finite numbers
      const res = calculateTwoSigma(noisy);
      expect(res.isValid).toBe(true);
      expect(res.mean).toBe(20.0);
      // variance = ((15-20)^2 + (25-20)^2) / 1 = 50 => sd = sqrt(50)
      expect(res.sd).toBeCloseTo(Math.sqrt(50), 10);
      expect(res.upper2SD).toBeCloseTo(20 + 2 * Math.sqrt(50), 10);
      expect(res.lower2SD).toBeCloseTo(Math.max(0, 20 - 2 * Math.sqrt(50)), 10);
    });

    it('filters non-number types passed via JS loose typing', () => {
      const mixed: any[] = ['20', 'abc', true, false, {}, [], () => {}, 10, 30];
      const res = calculateTwoSigma(mixed);
      expect(res.isValid).toBe(true);
      expect(res.mean).toBe(20);
      expect(res.sd).toBeCloseTo(Math.sqrt(200), 10);
    });

    it('counteracts catastrophic cancellation on large shifted coordinates (10^12 scale)', () => {
      // Offset C = 10^12, differences = [-10, 0, 10]
      const C = 1_000_000_000_000;
      const data = [C - 10, C, C + 10];

      const res = calculateTwoSigma(data);
      expect(res.isValid).toBe(true);
      expect(res.mean).toBe(C);
      // Sum of squared diffs: (-10)^2 + 0 + 10^2 = 200. Bessel variance = 200 / 2 = 100. sd = 10.
      expect(res.sd).toBeCloseTo(10, 5);
      expect(res.upper2SD).toBeCloseTo(C + 20, 5);
      expect(res.lower2SD).toBeCloseTo(C - 20, 5);
    });

    it('counteracts catastrophic cancellation on large shifted coordinates (10^14 scale)', () => {
      // Offset C = 10^14, differences = [-1, 0, 1]
      const C = 100_000_000_000_000;
      const data = [C - 1, C, C + 1];

      const res = calculateTwoSigma(data);
      expect(res.isValid).toBe(true);
      expect(res.mean).toBe(C);
      // Variance = (1 + 0 + 1) / 2 = 1 => sd = 1
      expect(res.sd).toBeCloseTo(1, 4);
      expect(res.upper2SD).toBeCloseTo(C + 2, 4);
      expect(res.lower2SD).toBeCloseTo(C - 2, 4);
    });

    it('maintains micro-precision on small decimal inputs (10^-6 scale)', () => {
      const data = [0.000001, 0.000002, 0.000003];
      const res = calculateTwoSigma(data);

      expect(res.isValid).toBe(true);
      expect(res.mean).toBeCloseTo(0.000002, 10);
      expect(res.sd).toBeCloseTo(0.000001, 10);
      expect(res.upper2SD).toBeCloseTo(0.000004, 10);
      expect(res.lower2SD).toBeCloseTo(0, 10);
    });
  });

  // =========================================================================
  // Dimension 3: Lower-Bound Zero Clamping (mu - 2s < 0)
  // =========================================================================
  describe('Dimension 3: Lower-Bound Zero Clamping Invariant', () => {
    it('strictly clamps lower2SD to 0 when mu - 2s is strictly negative', () => {
      // Highly skewed 3-point sample: [1, 2, 100]
      // Mean = 103 / 3 = 34.3333333333
      // Diff: [ -33.3333, -32.3333, +65.6667 ]
      // Variance = (1111.11 + 1045.44 + 4312.11) / 2 = 6468.66 / 2 = 3234.33
      // SD ~ 56.87
      // mu - 2s = 34.33 - 113.74 = -79.41 < 0
      const res = calculateTwoSigma([1, 2, 100]);
      expect(res.isValid).toBe(true);
      expect(res.mean! - 2 * res.sd!).toBeLessThan(0);
      expect(res.lower2SD).toBe(0);
      expect(Object.is(res.lower2SD, 0)).toBe(true);
      expect(Object.is(res.lower2SD, -0)).toBe(false); // No negative zero
    });

    it('preserves exact positive value when mu - 2s > 0', () => {
      const res = calculateTwoSigma([100, 102, 98]);
      // mean = 100, variance = (0 + 4 + 4) / 2 = 4, sd = 2
      // mu - 2s = 100 - 4 = 96 > 0
      expect(res.isValid).toBe(true);
      expect(res.mean).toBe(100);
      expect(res.sd).toBe(2);
      expect(res.lower2SD).toBe(96);
      expect(res.upper2SD).toBe(104);
    });

    it('preserves exact boundary when mu - 2s == 0', () => {
      // Find sample where mu = 2s:
      // For [0, 4] with mean 2, variance 8, sd = sqrt(8) ~ 2.82
      // For [2, 6]: mean = 4, diffs = [-2, 2], var = (4+4)/1 = 8, sd = sqrt(8) ~ 2.828, mu - 2s = 4 - 5.65 < 0
      // Constructing N=3: mu = 2*s
      // Let x = [c*(2 - sqrt(3)), c*(2), c*(2 + sqrt(3))]
      // Test with exact synthetic values:
      const s = 10;
      const mu = 20; // mu - 2s = 0
      // Sample [20 - 10*sqrt(2), 20, 20 + 10*sqrt(2)]:
      // sum diffs = 200 + 0 + 200 = 400. Bessel var = 400 / 2 = 200. sd = sqrt(200) = 14.14 != 10.
      // Bessel var with N=2: diff = [ -s/sqrt(2), s/sqrt(2) ] => var = 2*(s^2/2)/1 = s^2.
      // So for N=2: [ mu - s, mu + s ] has mean mu, variance 2*s^2 / 1 = 2*s^2, sd = s*sqrt(2).
      // When N=2 and mu = 2*s*sqrt(2):
      const sigma = 10;
      const mean = 2 * sigma;
      // If mu - 2*s = 0, lower2SD must equal 0
      const synthetic = [mean - sigma / Math.SQRT2, mean + sigma / Math.SQRT2];
      const res = calculateTwoSigma(synthetic);
      expect(res.isValid).toBe(true);
      expect(res.lower2SD).toBe(0);
    });
  });

  // =========================================================================
  // Dimension 4: DiamondVertex Polygon Coordinate Calculations & SVG Rendering
  // =========================================================================
  describe('Dimension 4: DiamondVertex Coordinate Invariants & SVG Rendering', () => {
    it('computes exact polygon points for standard radius (r = 3.6)', () => {
      const cx = 150;
      const cy = 75;
      const { container } = render(
        <svg>
          <DiamondVertex cx={cx} cy={cy} radius={3.6} fill="#057e77" stroke="#ffffff" />
        </svg>
      );
      const polygon = container.querySelector('polygon');
      expect(polygon).toBeInTheDocument();
      // Points: cx,cy-r  cx+r,cy  cx,cy+r  cx-r,cy
      // 150, 71.4   153.6, 75   150, 78.6   146.4, 75
      expect(polygon).toHaveAttribute('points', '150,71.4 153.6,75 150,78.6 146.4,75');
      expect(polygon).toHaveAttribute('fill', '#057e77');
      expect(polygon).toHaveAttribute('stroke', '#ffffff');
      expect(polygon).toHaveAttribute('stroke-width', '1.5');
    });

    it('computes exact polygon points for active/hover radius (r = 6.0)', () => {
      const cx = 200;
      const cy = 100;
      const { container } = render(
        <svg>
          <DiamondVertex cx={cx} cy={cy} radius={6.0} fill="#f9a825" stroke="#ffffff" strokeWidth={2} />
        </svg>
      );
      const polygon = container.querySelector('polygon');
      expect(polygon).toBeInTheDocument();
      // 200, 94   206, 100   200, 106   194, 100
      expect(polygon).toHaveAttribute('points', '200,94 206,100 200,106 194,100');
      expect(polygon).toHaveAttribute('stroke-width', '2');
    });

    it('returns null (no DOM element) when cx or cy are non-finite or invalid', () => {
      const invalidCoords = [
        { cx: NaN, cy: 50 },
        { cx: 50, cy: NaN },
        { cx: Infinity, cy: 50 },
        { cx: 50, cy: -Infinity },
        { cx: undefined, cy: 50 },
        { cx: 50, cy: undefined },
        { cx: '100' as any, cy: 50 },
      ];

      for (const coords of invalidCoords) {
        const { container } = render(
          <svg>
            <DiamondVertex cx={coords.cx} cy={coords.cy} />
          </svg>
        );
        expect(container.querySelector('polygon')).toBeNull();
      }
    });

    it('investigates prop precedence between radius and r', () => {
      // When radius is explicitly passed, it is respected
      const { container: explicitRadius } = render(
        <svg>
          <DiamondVertex cx={100} cy={100} radius={5} />
        </svg>
      );
      expect(explicitRadius.querySelector('polygon')).toHaveAttribute(
        'points',
        '100,95 105,100 100,105 95,100'
      );

      // When only r is passed without radius prop:
      // Note: DiamondVertex destructuring has radius = 3.6 as default parameter.
      // Therefore, if radius is omitted, JS defaults radius = 3.6 before body execution.
      const { container: onlyR } = render(
        <svg>
          <DiamondVertex cx={100} cy={100} r={6.0} />
        </svg>
      );
      const polyOnlyR = onlyR.querySelector('polygon');
      expect(polyOnlyR).toBeInTheDocument();
      const pointsOnlyR = polyOnlyR?.getAttribute('points');
      // Empirically confirms that passing r=6.0 without radius evaluates to radius=3.6 due to parameter destructuring default
      expect(pointsOnlyR).toBe('100,96.4 103.6,100 100,103.6 96.4,100');
    });

    it('supports string radius values via Number coercion', () => {
      const { container } = render(
        <svg>
          <DiamondVertex cx={100} cy={100} radius="4.5" />
        </svg>
      );
      expect(container.querySelector('polygon')).toHaveAttribute(
        'points',
        '100,95.5 104.5,100 100,104.5 95.5,100'
      );
    });
  });

  // =========================================================================
  // Integration: MacroTrendChart End-to-End Stress Verification
  // =========================================================================
  describe('MacroTrendChart Integration Stress', () => {
    it('renders safely under massive N = 1000 dataset without crashing or NaN paths', () => {
      const massiveData = Array.from({ length: 1000 }, (_, i) => ({
        name: `2024.${String(i).padStart(4, '0')}`,
        '동탄 아파트 전체': 8.0 + Math.sin(i / 10),
        '동탄 아파트 전세 평균': 4.0 + Math.cos(i / 10),
      }));

      const { container } = render(
        <MacroTrendChart
          lineData={massiveData}
          xTicks={['2024.0000', '2024.0500', '2024.0999']}
          yTicks={[0, 5, 10]}
          timeframe="ALL"
        />
      );

      expect(container.querySelector('[data-testid="macro-trend-chart-container"]')).toBeInTheDocument();
      const refArea = container.querySelector('.recharts-reference-area-rect');
      expect(refArea).toBeInTheDocument();
      const lines = container.querySelectorAll('line.recharts-reference-line-line');
      expect(lines.length).toBe(3);
    });

    it('falls back to rent series when sale series has N < 2 but rent has N >= 2', () => {
      const mixedData = [
        { name: '26.01', '동탄 아파트 전체': 9.0, '동탄 아파트 전세 평균': 4.0 },
        { name: '26.02', '동탄 아파트 전체': null, '동탄 아파트 전세 평균': 5.0 },
      ];

      const { container } = render(
        <MacroTrendChart
          lineData={mixedData}
          xTicks={['26.01', '26.02']}
          yTicks={[0, 5, 10]}
          timeframe="3M"
        />
      );

      // Rent has 2 valid points [4.0, 5.0], mean = 4.5, sd = sqrt(0.5) ~ 0.7071
      // lower2SD = 4.5 - 2*0.7071 = 3.0857
      // upper2SD = 4.5 + 2*0.7071 = 5.9142
      const refArea = container.querySelector('.recharts-reference-area-rect');
      expect(refArea).toBeInTheDocument();
      const lines = container.querySelectorAll('line.recharts-reference-line-line');
      expect(lines.length).toBe(3);
    });

    it('renders NO reference areas or lines when both series have N < 2', () => {
      const sparseData = [
        { name: '26.01', '동탄 아파트 전체': 8.5, '동탄 아파트 전세 평균': null },
        { name: '26.02', '동탄 아파트 전체': null, '동탄 아파트 전세 평균': 4.5 },
      ];

      const { container } = render(
        <MacroTrendChart
          lineData={sparseData}
          xTicks={['26.01', '26.02']}
          yTicks={[0, 5, 10]}
          timeframe="3M"
        />
      );

      const refArea = container.querySelector('.recharts-reference-area-rect');
      expect(refArea).not.toBeInTheDocument();
      const lines = container.querySelectorAll('line.recharts-reference-line-line');
      expect(lines.length).toBe(0);
    });
  });
});
