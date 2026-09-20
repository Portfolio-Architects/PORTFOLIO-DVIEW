import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import MacroTrendChart from './MacroTrendChart';

// Unmock recharts specifically for this test suite because it verifies real SVG circles and paths
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

  it('renders single data point scenario with visible circles for both series', () => {
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
    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBe(2);
    // Sale circle with brand orange
    expect(Array.from(circles).some(c => c.getAttribute('stroke') === '#ea6100')).toBe(true);
    // Rent circle with brand yellow
    expect(Array.from(circles).some(c => c.getAttribute('stroke') === '#f9a825')).toBe(true);
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

  it('renders isolated single rent transaction with a dot when multiple sales exist under timeframe ALL', () => {
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
    // nonNullSaleCount is 3 (so sale has NO dots under ALL), but nonNullRentCount is 1 (so rent HAS a dot)
    const rentCircle = container.querySelector('circle[stroke="#f9a825"]');
    expect(rentCircle).toBeInTheDocument();
    expect(rentCircle).toHaveAttribute('r', '3.5');
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
    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBe(2);
  });
});
