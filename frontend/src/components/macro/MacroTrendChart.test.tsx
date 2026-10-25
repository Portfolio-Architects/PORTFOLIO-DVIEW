import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import MacroTrendChart, { DiamondVertex } from './MacroTrendChart';

// Unmock recharts specifically for this test suite because it verifies real SVG polygons, lines, and rects
jest.unmock('recharts');

describe('MacroTrendChart Component', () => {
  it('renders without crashing with empty data', () => {
    const { container } = render(
      <MacroTrendChart
        lineData={[]}
        xTicks={[]}
        yTicks={[0, 2, 4]}
        timeframe="ALL"
      />
    );
    expect(container).toBeInTheDocument();
  });

  it('renders single data point scenario with visible diamond vertex polygons for both series', () => {
    const singlePointData = [
      { name: '26.04', '동탄 아파트 전체': 8.5, '동탄 아파트 전세 평균': 4.2 }
    ];
    const { container } = render(
      <MacroTrendChart
        lineData={singlePointData}
        xTicks={['26.04']}
        yTicks={[0, 5, 10]}
        timeframe="ALL"
      />
    );
    const polygons = container.querySelectorAll('polygon');
    expect(polygons.length).toBe(2);
    // Sale diamond vertex with trust blue fill and white stroke
    expect(Array.from(polygons).some(p => p.getAttribute('fill') === '#2563eb')).toBe(true);
    // Rent diamond vertex with brand yellow fill and white stroke
    expect(Array.from(polygons).some(p => p.getAttribute('fill') === '#059669')).toBe(true);
    // Both vertices have white stroke
    expect(Array.from(polygons).every(p => p.getAttribute('stroke') === '#ffffff')).toBe(true);
  });

  it('renders multiple points scenario with continuous line and area', () => {
    const multiPointData = [
      { name: '26.03', '동탄 아파트 전체': 8.5, '동탄 아파트 전세 평균': 4.2 },
      { name: '26.04', '동탄 아파트 전체': 8.7, '동탄 아파트 전세 평균': 4.3 }
    ];
    const { container } = render(
      <MacroTrendChart
        lineData={multiPointData}
        xTicks={['26.03', '26.04']}
        yTicks={[0, 5, 10]}
        timeframe="ALL"
      />
    );
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBeGreaterThan(0);
  });

  it('renders isolated single rent transaction with a diamond vertex when multiple sales exist under timeframe ALL', () => {
    const isolatedRentData = [
      { name: '26.01', '동탄 아파트 전체': 8.0, '동탄 아파트 전세 평균': null },
      { name: '26.02', '동탄 아파트 전체': 8.2, '동탄 아파트 전세 평균': null },
      { name: '26.03', '동탄 아파트 전체': 8.4, '동탄 아파트 전세 평균': 4.5 },
    ];
    const { container } = render(
      <MacroTrendChart
        lineData={isolatedRentData}
        xTicks={['26.01', '26.03']}
        yTicks={[0, 5, 10]}
        timeframe="ALL"
      />
    );
    // nonNullSaleCount is 3 (so sale has NO dots under ALL), but nonNullRentCount is 1 (so rent HAS a diamond vertex)
    const rentPolygon = container.querySelector('polygon[fill="#059669"]');
    expect(rentPolygon).toBeInTheDocument();
    expect(rentPolygon).toHaveAttribute('points');
    expect(rentPolygon).toHaveAttribute('stroke', '#ffffff');
  });

  it('renders bottomSheet chart correctly with single point', () => {
    const singlePointData = [
      { name: '26.04', '동탄 아파트 전체': 9.0, '동탄 아파트 전세 평균': 5.0 }
    ];
    const { container } = render(
      <MacroTrendChart
        lineData={singlePointData}
        xTicks={['26.04']}
        yTicks={[0, 5, 10]}
        timeframe="ALL"
        isBottomSheet={true}
      />
    );
    const polygons = container.querySelectorAll('polygon');
    expect(polygons.length).toBe(2);
  });

  it('projects Recharts ReferenceArea with two-sigma bounds when sample size N >= 2', () => {
    const multiPointData = [
      { name: '26.01', '동탄 아파트 전체': 8.0, '동탄 아파트 전세 평균': 4.0 },
      { name: '26.02', '동탄 아파트 전체': 9.0, '동탄 아파트 전세 평균': 4.5 },
      { name: '26.03', '동탄 아파트 전체': 10.0, '동탄 아파트 전세 평균': 5.0 },
    ];
    const { container } = render(
      <MacroTrendChart
        lineData={multiPointData}
        xTicks={['26.01', '26.02', '26.03']}
        yTicks={[0, 5, 10, 15]}
        timeframe="3M"
      />
    );
    // ReferenceArea renders a path with .recharts-reference-area-rect, fill="var(--brand-primary)", and fill-opacity="0.06"
    const refArea = container.querySelector('.recharts-reference-area-rect') || container.querySelector('path[fill="var(--brand-primary)"]');
    expect(refArea).toBeInTheDocument();
    expect(refArea).toHaveAttribute('fill', 'var(--brand-primary)');
    expect(refArea).toHaveAttribute('fill-opacity', '0.06');
  });

  it('projects 3 ReferenceLines (+2SD, Mean, -2SD) with correct stroke dasharrays when stats are valid', () => {
    const multiPointData = [
      { name: '26.01', '동탄 아파트 전체': 8.0, '동탄 아파트 전세 평균': 4.0 },
      { name: '26.02', '동탄 아파트 전체': 9.0, '동탄 아파트 전세 평균': 4.5 },
      { name: '26.03', '동탄 아파트 전체': 10.0, '동탄 아파트 전세 평균': 5.0 },
    ];
    const { container } = render(
      <MacroTrendChart
        lineData={multiPointData}
        xTicks={['26.01', '26.02', '26.03']}
        yTicks={[0, 5, 10, 15]}
        timeframe="3M"
      />
    );
    const lines = container.querySelectorAll('line.recharts-reference-line-line');
    expect(lines.length).toBe(3);
    // +2SD line and -2SD line have strokeDasharray="3 3"
    const dash33Lines = Array.from(lines).filter(l => l.getAttribute('stroke-dasharray') === '3 3');
    expect(dash33Lines.length).toBe(2);
    // Mean line has strokeDasharray="5 5"
    const dash55Lines = Array.from(lines).filter(l => l.getAttribute('stroke-dasharray') === '5 5');
    expect(dash55Lines.length).toBe(1);
  });

  it('does NOT render ReferenceArea or ReferenceLines when sample size N < 2 (singularity defense)', () => {
    const singlePointData = [
      { name: '26.04', '동탄 아파트 전체': 8.5, '동탄 아파트 전세 평균': 4.2 }
    ];
    const { container } = render(
      <MacroTrendChart
        lineData={singlePointData}
        xTicks={['26.04']}
        yTicks={[0, 5, 10]}
        timeframe="ALL"
      />
    );
    const refArea = container.querySelector('.recharts-reference-area-rect') || container.querySelector('path[fill="var(--brand-primary)"]');
    expect(refArea).not.toBeInTheDocument();

    const refLines = container.querySelectorAll('line.recharts-reference-line-line');
    expect(refLines.length).toBe(0);
  });

  it('renders DiamondVertex polygon points with exact mathematical radius calculation', () => {
    const { container: r36Container } = render(
      <svg>
        <DiamondVertex cx={100} cy={50} radius={3.6} fill="#2563eb" stroke="#ffffff" />
      </svg>
    );
    const poly36 = r36Container.querySelector('polygon');
    expect(poly36).toBeInTheDocument();
    expect(poly36).toHaveAttribute('points', '100,46.4 103.6,50 100,53.6 96.4,50');
    expect(poly36).toHaveAttribute('fill', '#2563eb');
    expect(poly36).toHaveAttribute('stroke', '#ffffff');

    const { container: r60Container } = render(
      <svg>
        <DiamondVertex cx={100} cy={50} radius={6.0} fill="#059669" stroke="#ffffff" />
      </svg>
    );
    const poly60 = r60Container.querySelector('polygon');
    expect(poly60).toBeInTheDocument();
    expect(poly60).toHaveAttribute('points', '100,44 106,50 100,56 94,50');
    expect(poly60).toHaveAttribute('fill', '#059669');
  });

  it('verifies canonical macro/MacroTrendChart module export integrity', async () => {
    const MacroModule = await import('./MacroTrendChart');
    expect(MacroModule.default).toBeDefined();
    expect(MacroModule.default).toBe(MacroTrendChart);
    expect(MacroModule.DiamondVertex).toBe(DiamondVertex);
  });

  it('preserves chart container geometry and supports className customization', () => {
    const { container } = render(
      <MacroTrendChart
        lineData={[]}
        xTicks={[]}
        yTicks={[0, 5, 10]}
        timeframe="1Y"
        className="custom-chart-wrapper"
      />
    );
    const chartWrapper = container.querySelector('[data-testid="macro-trend-chart-container"]');
    expect(chartWrapper).toBeInTheDocument();
    expect(chartWrapper).toHaveClass('custom-chart-wrapper');
    expect(chartWrapper).toHaveClass('flex-1');
  });
});
