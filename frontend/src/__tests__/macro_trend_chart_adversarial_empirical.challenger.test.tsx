/**
 * @file macro_trend_chart_adversarial_empirical.challenger.test.tsx
 * @description Empirical Challenger M1-2 Adversarial Stress Test Harness for MacroTrendChart.tsx
 * 
 * Target Verification Scope:
 * 1. Timeframe Toggles: '3M', '1Y', '3Y', 'ALL' behavior under varied data densities.
 * 2. Boundary & Singularity Defense: 0 data points, 1 data point (sale-only, rent-only, dual-series), N < 2 statistics defense.
 * 3. Extreme Outliers & Float Invariants: Huge numbers (10^8), microscopic decimals (0.0001), NaN, Infinity, negative values.
 * 4. Diamond Vertex Geometry: Mathematical precision of polygon coordinates, standard (r=3.6) vs active (r=6.0), non-finite cx/cy rejection.
 * 5. Recharts Rendering & Console Integrity: Spy on console.error / console.warn for missing keys, display-name errors, SVG crashes.
 */

import React from 'react';
import { render, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import MacroTrendChart, {
  DiamondVertex,
  SaleDiamondDot,
  SaleActiveDiamondDot,
  RentDiamondDot,
  RentActiveDiamondDot,
} from '../components/macro/MacroTrendChart';

// Unmock recharts to test actual SVG polygon, line, path, rect elements and coordinates
jest.unmock('recharts');

describe('MacroTrendChart Adversarial Empirical Challenge Suite', () => {
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error');
    consoleWarnSpy = jest.spyOn(console, 'warn');
  });

  afterEach(() => {
    cleanup();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  // =========================================================================
  // 1. Timeframe Toggles: 3M, 1Y, 3Y, ALL
  // =========================================================================
  describe('1. Timeframe Toggles Stress Test', () => {
    const multiPointData = [
      { name: '26.01', '동탄 아파트 전체': 8.5, '동탄 아파트 전세 평균': 4.5 },
      { name: '26.02', '동탄 아파트 전체': 8.7, '동탄 아파트 전세 평균': 4.6 },
      { name: '26.03', '동탄 아파트 전체': 8.9, '동탄 아파트 전세 평균': 4.7 },
      { name: '26.04', '동탄 아파트 전체': 9.1, '동탄 아파트 전세 평균': 4.8 },
    ];
    const xTicks = ['26.01', '26.02', '26.03', '26.04'];
    const yTicks = [0, 5, 10, 15];

    it.each(['3M', '1Y', '3Y'] as const)(
      'renders diamond vertices on both series under low-to-medium timeframe "%s"',
      (tf) => {
        const { container } = render(
          <MacroTrendChart
            lineData={multiPointData}
            xTicks={xTicks}
            yTicks={yTicks}
            timeframe={tf}
          />
        );
        const polygons = container.querySelectorAll('polygon');
        expect(polygons.length).toBeGreaterThan(0);

        const salePolys = Array.from(polygons).filter(
          (p) => p.getAttribute('fill') === '#2563eb'
        );
        const rentPolys = Array.from(polygons).filter(
          (p) => p.getAttribute('fill') === '#059669'
        );
        expect(salePolys.length).toBe(multiPointData.length);
        expect(rentPolys.length).toBe(multiPointData.length);
      }
    );

    it('suppresses regular diamond dots under timeframe "ALL" for multi-point series', () => {
      const { container } = render(
        <MacroTrendChart
          lineData={multiPointData}
          xTicks={xTicks}
          yTicks={yTicks}
          timeframe="ALL"
        />
      );
      const polygons = container.querySelectorAll('polygon');
      // When points > 1 under 'ALL', dots should be suppressed (length === 0)
      expect(polygons.length).toBe(0);

      // Lines / paths should still exist for the area/line series
      const paths = container.querySelectorAll('path.recharts-curve');
      expect(paths.length).toBeGreaterThan(0);
    });

    it('preserves single-point diamond vertex even under timeframe "ALL"', () => {
      const singlePoint = [
        { name: '26.04', '동탄 아파트 전체': 9.5, '동탄 아파트 전세 평균': 5.2 },
      ];
      const { container } = render(
        <MacroTrendChart
          lineData={singlePoint}
          xTicks={['26.04']}
          yTicks={[0, 5, 10]}
          timeframe="ALL"
        />
      );
      const polygons = container.querySelectorAll('polygon');
      expect(polygons.length).toBe(2);
      expect(
        Array.from(polygons).some((p) => p.getAttribute('fill') === '#2563eb')
      ).toBe(true);
      expect(
        Array.from(polygons).some((p) => p.getAttribute('fill') === '#059669')
      ).toBe(true);
    });

    it('supports rapid re-renders across all timeframes without crashing or memory leaks', () => {
      const { container, rerender } = render(
        <MacroTrendChart
          lineData={multiPointData}
          xTicks={xTicks}
          yTicks={yTicks}
          timeframe="3M"
        />
      );
      expect(container.querySelectorAll('polygon').length).toBe(8);

      rerender(
        <MacroTrendChart
          lineData={multiPointData}
          xTicks={xTicks}
          yTicks={yTicks}
          timeframe="1Y"
        />
      );
      expect(container.querySelectorAll('polygon').length).toBe(8);

      rerender(
        <MacroTrendChart
          lineData={multiPointData}
          xTicks={xTicks}
          yTicks={yTicks}
          timeframe="ALL"
        />
      );
      expect(container.querySelectorAll('polygon').length).toBe(0);

      rerender(
        <MacroTrendChart
          lineData={multiPointData}
          xTicks={xTicks}
          yTicks={yTicks}
          timeframe="3Y"
        />
      );
      expect(container.querySelectorAll('polygon').length).toBe(8);
    });
  });

  // =========================================================================
  // 2. Boundary & Singularity Defense: 0 and 1 Data Point Edge Cases
  // =========================================================================
  describe('2. Boundary & Singularity Defense (0 and 1 Data Points)', () => {
    it('renders zero crash when lineData is empty array []', () => {
      const { container } = render(
        <MacroTrendChart
          lineData={[]}
          xTicks={[]}
          yTicks={[0, 2, 4]}
          timeframe="3M"
        />
      );
      expect(
        container.querySelector('[data-testid="macro-trend-chart-container"]')
      ).toBeInTheDocument();
      expect(container.querySelectorAll('polygon').length).toBe(0);
      expect(container.querySelectorAll('line.recharts-reference-line-line').length).toBe(0);
    });

    it('renders zero crash when lineData is null or undefined (runtime defensive boundary)', () => {
      const { container: c1 } = render(
        <MacroTrendChart
          // @ts-expect-error Testing adversarial runtime null input
          lineData={null}
          xTicks={[]}
          yTicks={[0, 5]}
          timeframe="ALL"
        />
      );
      expect(c1.querySelector('[data-testid="macro-trend-chart-container"]')).toBeInTheDocument();

      const { container: c2 } = render(
        <MacroTrendChart
          // @ts-expect-error Testing adversarial runtime undefined input
          lineData={undefined}
          xTicks={[]}
          yTicks={[0, 5]}
          timeframe="ALL"
        />
      );
      expect(c2.querySelector('[data-testid="macro-trend-chart-container"]')).toBeInTheDocument();
    });

    it('defends against Bessel singularity (N=1 < 2): suppresses ReferenceArea and ReferenceLines', () => {
      const singlePoint = [
        { name: '26.04', '동탄 아파트 전체': 12.0, '동탄 아파트 전세 평균': 6.0 },
      ];
      const { container } = render(
        <MacroTrendChart
          lineData={singlePoint}
          xTicks={['26.04']}
          yTicks={[0, 10, 20]}
          timeframe="3M"
        />
      );
      // N < 2: No variance or +/- 2SD can be computed
      expect(container.querySelector('.recharts-reference-area-rect')).not.toBeInTheDocument();
      expect(container.querySelectorAll('line.recharts-reference-line-line').length).toBe(0);

      // But single point vertices must exist
      const polygons = container.querySelectorAll('polygon');
      expect(polygons.length).toBe(2);
    });

    it('renders exactly 1 polygon when data contains sale-only single point', () => {
      const saleOnly = [
        { name: '26.04', '동탄 아파트 전체': 9.8, '동탄 아파트 전세 평균': null },
      ];
      const { container } = render(
        <MacroTrendChart
          lineData={saleOnly}
          xTicks={['26.04']}
          yTicks={[0, 5, 10]}
          timeframe="ALL"
        />
      );
      const polygons = container.querySelectorAll('polygon');
      expect(polygons.length).toBe(1);
      expect(polygons[0].getAttribute('fill')).toBe('#2563eb');
    });

    it('renders exactly 1 polygon when data contains rent-only single point', () => {
      const rentOnly = [
        { name: '26.04', '동탄 아파트 전체': null, '동탄 아파트 전세 평균': 4.9 },
      ];
      const { container } = render(
        <MacroTrendChart
          lineData={rentOnly}
          xTicks={['26.04']}
          yTicks={[0, 5, 10]}
          timeframe="ALL"
        />
      );
      const polygons = container.querySelectorAll('polygon');
      expect(polygons.length).toBe(1);
      expect(polygons[0].getAttribute('fill')).toBe('#059669');
    });

    it('handles asymmetric series counts correctly under timeframe "ALL": 1 sale + 3 rents', () => {
      const asymmetric = [
        { name: '26.01', '동탄 아파트 전체': null, '동탄 아파트 전세 평균': 4.0 },
        { name: '26.02', '동탄 아파트 전체': null, '동탄 아파트 전세 평균': 4.2 },
        { name: '26.03', '동탄 아파트 전체': 8.5, '동탄 아파트 전세 평균': 4.4 },
      ];
      const { container } = render(
        <MacroTrendChart
          lineData={asymmetric}
          xTicks={['26.01', '26.02', '26.03']}
          yTicks={[0, 5, 10]}
          timeframe="ALL"
        />
      );
      // Sale has 1 point -> renders 1 polygon. Rent has 3 points -> 0 polygons under ALL.
      const polygons = container.querySelectorAll('polygon');
      expect(polygons.length).toBe(1);
      expect(polygons[0].getAttribute('fill')).toBe('#2563eb');

      // Rent has N=3 >= 2, so twoSigmaStats falls back to rent series and renders ReferenceLines!
      const lines = container.querySelectorAll('line.recharts-reference-line-line');
      expect(lines.length).toBe(3);
    });
  });

  // =========================================================================
  // 3. Extreme Outliers, Float Stress & Malformed Values
  // =========================================================================
  describe('3. Extreme Numbers & Float Stress', () => {
    it('handles astronomical values without crashing or producing NaN SVG attributes', () => {
      const extremeValues = [
        { name: '26.01', '동탄 아파트 전체': 100000.0, '동탄 아파트 전세 평균': 50000.0 },
        { name: '26.02', '동탄 아파트 전체': 120000.0, '동탄 아파트 전세 평균': 60000.0 },
      ];
      const { container } = render(
        <MacroTrendChart
          lineData={extremeValues}
          xTicks={['26.01', '26.02']}
          yTicks={[0, 50000, 100000, 150000]}
          timeframe="3M"
        />
      );
      expect(container.querySelector('[data-testid="macro-trend-chart-container"]')).toBeInTheDocument();
      const polygons = container.querySelectorAll('polygon');
      expect(polygons.length).toBe(4);
      polygons.forEach((poly) => {
        const points = poly.getAttribute('points');
        expect(points).toBeTruthy();
        expect(points).not.toContain('NaN');
        expect(points).not.toContain('undefined');
      });
    });

    it('handles microscopic sub-penny decimals safely', () => {
      const microscopicValues = [
        { name: '26.01', '동탄 아파트 전체': 0.0001, '동탄 아파트 전세 평균': 0.00005 },
        { name: '26.02', '동탄 아파트 전체': 0.0002, '동탄 아파트 전세 평균': 0.0001 },
      ];
      const { container } = render(
        <MacroTrendChart
          lineData={microscopicValues}
          xTicks={['26.01', '26.02']}
          yTicks={[0, 0.0001, 0.0002]}
          timeframe="3M"
        />
      );
      const polygons = container.querySelectorAll('polygon');
      expect(polygons.length).toBe(4);
    });

    it('sanitizes negative values and zero prices to null without crashing', () => {
      const negativeAndZero = [
        { name: '26.01', '동탄 아파트 전체': -10.5, '동탄 아파트 전세 평균': 0 },
        { name: '26.02', '동탄 아파트 전체': 0, '동탄 아파트 전세 평균': -5.0 },
      ];
      const { container } = render(
        <MacroTrendChart
          lineData={negativeAndZero}
          xTicks={['26.01', '26.02']}
          yTicks={[0, 5, 10]}
          timeframe="3M"
        />
      );
      // All values are non-positive, so sanitized to null => no polygons
      const polygons = container.querySelectorAll('polygon');
      expect(polygons.length).toBe(0);
      expect(container.querySelectorAll('line.recharts-reference-line-line').length).toBe(0);
    });

    it('safely filters NaN, undefined, and non-numeric inputs', () => {
      const malformedData = [
        // @ts-expect-error Adversarial non-numeric test
        { name: '26.01', '동탄 아파트 전체': NaN, '동탄 아파트 전세 평균': 'invalid' },
        { name: '26.02', '동탄 아파트 전체': undefined, '동탄 아파트 전세 평균': null },
      ];
      const { container } = render(
        <MacroTrendChart
          lineData={malformedData}
          xTicks={['26.01', '26.02']}
          yTicks={[0, 5, 10]}
          timeframe="3M"
        />
      );
      expect(container.querySelector('[data-testid="macro-trend-chart-container"]')).toBeInTheDocument();
      expect(container.querySelectorAll('polygon').length).toBe(0);
    });
  });

  // =========================================================================
  // 4. Diamond Vertex Geometry & Mathematical Invariants
  // =========================================================================
  describe('4. Diamond Vertex Geometry & Mathematical Invariants', () => {
    it('verifies exact equilateral rhombus geometry for standard radius r = 3.6', () => {
      const cx = 150;
      const cy = 75;
      const r = 3.6;
      const { container } = render(
        <svg>
          <DiamondVertex cx={cx} cy={cy} radius={r} fill="#2563eb" stroke="#ffffff" />
        </svg>
      );
      const polygon = container.querySelector('polygon');
      expect(polygon).toBeInTheDocument();

      const pointsAttr = polygon?.getAttribute('points');
      const expectedPoints = `${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`;
      expect(pointsAttr).toBe(expectedPoints);

      // Verify mathematical symmetry: 4 vertices
      const vertices = (pointsAttr || '').split(' ').map((coord) => {
        const [x, y] = coord.split(',').map(Number);
        return { x, y };
      });
      expect(vertices.length).toBe(4);
      const [top, right, bottom, left] = vertices;
      expect(top).toEqual({ x: 150, y: 71.4 });
      expect(right).toEqual({ x: 153.6, y: 75 });
      expect(bottom).toEqual({ x: 150, y: 78.6 });
      expect(left).toEqual({ x: 146.4, y: 75 });

      // Side length invariant: all 4 sides equal sqrt(r^2 + r^2)
      const sideLengths = [
        Math.hypot(right.x - top.x, right.y - top.y),
        Math.hypot(bottom.x - right.x, bottom.y - right.y),
        Math.hypot(left.x - bottom.x, left.y - bottom.y),
        Math.hypot(top.x - left.x, top.y - left.y),
      ];
      const expectedSideLength = Math.sqrt(r * r + r * r);
      sideLengths.forEach((len) => {
        expect(len).toBeCloseTo(expectedSideLength, 5);
      });
    });

    it('verifies exact geometry for active/hover radius r = 6.0', () => {
      const cx = 200;
      const cy = 100;
      const r = 6.0;
      const { container } = render(
        <svg>
          <DiamondVertex cx={cx} cy={cy} radius={r} fill="#059669" stroke="#ffffff" />
        </svg>
      );
      const polygon = container.querySelector('polygon');
      expect(polygon).toBeInTheDocument();
      expect(polygon).toHaveAttribute('points', '200,94 206,100 200,106 194,100');
    });

    it('rejects invalid or non-finite cx/cy coordinates and returns null (zero garbage SVG)', () => {
      const invalidProps = [
        { cx: undefined, cy: 50 },
        { cx: 50, cy: undefined },
        { cx: NaN, cy: 50 },
        { cx: 50, cy: NaN },
        { cx: Infinity, cy: 50 },
        { cx: 50, cy: -Infinity },
        // @ts-expect-error Adversarial string input
        { cx: '50', cy: 50 },
      ];

      invalidProps.forEach((props) => {
        const { container } = render(
          <svg>
            <DiamondVertex {...props} />
          </svg>
        );
        expect(container.querySelector('polygon')).toBeNull();
      });
    });

    it('validates Sale and Rent DiamondDot presets maintain exact styling contracts', () => {
      const { container: saleCont } = render(
        <svg>
          <SaleDiamondDot cx={100} cy={50} />
          <SaleActiveDiamondDot cx={100} cy={50} />
        </svg>
      );
      const salePolys = saleCont.querySelectorAll('polygon');
      expect(salePolys.length).toBe(2);
      expect(salePolys[0]).toHaveAttribute('fill', '#2563eb');
      expect(salePolys[0]).toHaveAttribute('stroke-width', '1.5');
      expect(salePolys[1]).toHaveAttribute('fill', '#2563eb');
      expect(salePolys[1]).toHaveAttribute('stroke-width', '2');

      const { container: rentCont } = render(
        <svg>
          <RentDiamondDot cx={100} cy={50} />
          <RentActiveDiamondDot cx={100} cy={50} />
        </svg>
      );
      const rentPolys = rentCont.querySelectorAll('polygon');
      expect(rentPolys.length).toBe(2);
      expect(rentPolys[0]).toHaveAttribute('fill', '#059669');
      expect(rentPolys[0]).toHaveAttribute('stroke-width', '1.5');
      expect(rentPolys[1]).toHaveAttribute('fill', '#059669');
      expect(rentPolys[1]).toHaveAttribute('stroke-width', '2');
    });
  });

  // =========================================================================
  // 5. Recharts Console Warnings & DisplayName Compliance
  // =========================================================================
  describe('5. Console Audit & DisplayName Compliance', () => {
    it('verifies all dot components expose valid displayName to prevent ESLint react/display-name errors', () => {
      expect(MacroTrendChart.displayName).toBe('MacroTrendChart');
      expect(DiamondVertex.displayName).toBe('DiamondVertex');
      expect(SaleDiamondDot.displayName).toBe('SaleDiamondDot');
      expect(SaleActiveDiamondDot.displayName).toBe('SaleActiveDiamondDot');
      expect(RentDiamondDot.displayName).toBe('RentDiamondDot');
      expect(RentActiveDiamondDot.displayName).toBe('RentActiveDiamondDot');
    });

    it('emits ZERO React key warnings during multi-point rendering', () => {
      const testData = [
        { name: '26.01', '동탄 아파트 전체': 8.0, '동탄 아파트 전세 평균': 4.0 },
        { name: '26.02', '동탄 아파트 전체': 8.5, '동탄 아파트 전세 평균': 4.5 },
        { name: '26.03', '동탄 아파트 전체': 9.0, '동탄 아파트 전세 평균': 5.0 },
      ];
      render(
        <MacroTrendChart
          lineData={testData}
          xTicks={['26.01', '26.02', '26.03']}
          yTicks={[0, 5, 10]}
          timeframe="3M"
        />
      );

      const errorCalls = consoleErrorSpy.mock.calls
        .map((c) => c.join(' '))
        .filter((msg) => msg.includes('key'));
      expect(errorCalls.length).toBe(0);
    });
  });

  // =========================================================================
  // 6. Responsive Layout & BottomSheet Invariants
  // =========================================================================
  describe('6. Layout & BottomSheet Invariants', () => {
    it('enforces min-h-[220px] on bottomSheet and min-h-[330px] on standard mode', () => {
      const { container: bsCont } = render(
        <MacroTrendChart
          lineData={[]}
          xTicks={[]}
          yTicks={[0, 5]}
          timeframe="ALL"
          isBottomSheet={true}
        />
      );
      const bsWrapper = bsCont.querySelector('[data-testid="macro-trend-chart-container"]');
      expect(bsWrapper).toHaveClass('min-h-[220px]');

      const { container: stdCont } = render(
        <MacroTrendChart
          lineData={[]}
          xTicks={[]}
          yTicks={[0, 5]}
          timeframe="ALL"
          isBottomSheet={false}
        />
      );
      const stdWrapper = stdCont.querySelector('[data-testid="macro-trend-chart-container"]');
      expect(stdWrapper).toHaveClass('min-h-[330px]');
    });

    it('suppresses multi-point dots when isBottomSheet is true', () => {
      const multiPoint = [
        { name: '26.01', '동탄 아파트 전체': 8.0, '동탄 아파트 전세 평균': 4.0 },
        { name: '26.02', '동탄 아파트 전체': 8.5, '동탄 아파트 전세 평균': 4.5 },
      ];
      const { container } = render(
        <MacroTrendChart
          lineData={multiPoint}
          xTicks={['26.01', '26.02']}
          yTicks={[0, 5, 10]}
          timeframe="3M"
          isBottomSheet={true}
        />
      );
      // Under bottom sheet, multi-point dots are suppressed
      expect(container.querySelectorAll('polygon').length).toBe(0);
    });
  });
});
