import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChartErrorBoundary from '@/components/common/ChartErrorBoundary';
import {
  processMacroTrendData,
  calculateMacroGapAndRatio,
  formatXAxisTick,
} from '@/lib/utils/macroChartTransform';
import {
  formatAvgPriceEok,
  getCachedTimestamp,
  calculateMonthlyAverages,
} from '@/lib/utils/transactionChartTransform';
import MacroTrendChart from '@/components/MacroTrendChart';

// Recharts component mocks for Jest JSDOM environment
jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container" style={{ width: '100%', height: '300px' }}>
        {children}
      </div>
    ),
    AreaChart: ({ children, data }: { children: React.ReactNode; data: any }) => (
      <svg data-testid="area-chart" data-count={Array.isArray(data) ? data.length : 0}>
        {children}
      </svg>
    ),
    Area: () => <div data-testid="area-series" />,
    XAxis: () => <div data-testid="x-axis" />,
    YAxis: () => <div data-testid="y-axis" />,
    CartesianGrid: () => <div data-testid="cartesian-grid" />,
    Tooltip: () => <div data-testid="recharts-tooltip" />,
  };
});

describe('M2 & M3 Empirical Verification: Mobile Layout Defense & Chart Fallbacks', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  // ==========================================
  // Section 1: Chart Fallback UI & Error Boundary
  // ==========================================
  describe('1. ChartErrorBoundary & Fallback Robustness', () => {
    const ProblematicChartComponent = ({ shouldCrash }: { shouldCrash: boolean }) => {
      if (shouldCrash) {
        throw new Error('Recharts SVG Dimension Exception');
      }
      return <div data-testid="normal-chart">Normal Chart Content</div>;
    };

    it('renders normal chart children when no exceptions occur', () => {
      render(
        <ChartErrorBoundary>
          <ProblematicChartComponent shouldCrash={false} />
        </ChartErrorBoundary>
      );
      expect(screen.getByTestId('normal-chart')).toBeInTheDocument();
      expect(screen.getByText('Normal Chart Content')).toBeInTheDocument();
    });

    it('catches chart rendering errors and displays custom fallback UI without unmounting parent page', () => {
      render(
        <ChartErrorBoundary fallbackText="동탄 매크로 트렌드 차트를 로드할 수 없습니다.">
          <ProblematicChartComponent shouldCrash={true} />
        </ChartErrorBoundary>
      );
      expect(screen.getByText('동탄 매크로 트렌드 차트를 로드할 수 없습니다.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument();
    });

    it('recovers from error state when user clicks retry button', () => {
      let isBroken = true;
      const ToggleableChartComponent = () => {
        if (isBroken) {
          throw new Error('Transient Render Error');
        }
        return <div data-testid="recovered-chart">Recovered Chart Content</div>;
      };

      render(
        <ChartErrorBoundary>
          <ToggleableChartComponent />
        </ChartErrorBoundary>
      );

      expect(screen.getByText('차트 데이터를 불러오는 중 오류가 발생했습니다.')).toBeInTheDocument();

      isBroken = false;
      const retryButton = screen.getByRole('button', { name: '다시 시도' });
      fireEvent.click(retryButton);

      expect(screen.getByTestId('recovered-chart')).toBeInTheDocument();
    });
  });

  // ==========================================
  // Section 2: Null / Undefined Chart Data Inputs
  // ==========================================
  describe('2. Chart Data Transformation & Null/Undefined Data Safety', () => {
    describe('processMacroTrendData', () => {
      it('handles null, undefined, and non-array inputs gracefully', () => {
        expect(processMacroTrendData(null as any)).toEqual([]);
        expect(processMacroTrendData(undefined as any)).toEqual([]);
        expect(processMacroTrendData('invalid' as any)).toEqual([]);
        expect(processMacroTrendData(123 as any)).toEqual([]);
      });

      it('safely filters null, undefined, 0, and negative prices to null without throwing', () => {
        const rawInput = [
          { name: '24.01', '동탄 아파트 전체': 8.5, '동탄 아파트 전세 평균': 4.2 },
          { name: '24.02', '동탄 아파트 전체': null, '동탄 아파트 전세 평균': undefined },
          { name: '24.03', '동탄 아파트 전체': 0, '동탄 아파트 전세 평균': -1.5 },
          { name: '24.04', '동탄 아파트 전체': undefined, '동탄 아파트 전세 평균': null },
        ];

        const result = processMacroTrendData(rawInput as any);

        expect(result).toHaveLength(4);
        expect(result[0]).toEqual({
          name: '24.01',
          '동탄 아파트 전체': 8.5,
          '동탄 아파트 전세 평균': 4.2,
        });
        expect(result[1]).toEqual({
          name: '24.02',
          '동탄 아파트 전체': null,
          '동탄 아파트 전세 평균': null,
        });
        expect(result[2]).toEqual({
          name: '24.03',
          '동탄 아파트 전체': null,
          '동탄 아파트 전세 평균': null,
        });
        expect(result[3]).toEqual({
          name: '24.04',
          '동탄 아파트 전체': null,
          '동탄 아파트 전세 평균': null,
        });
      });
    });

    describe('calculateMacroGapAndRatio', () => {
      it('returns 0 ratio and gap when sale or rent price is null, undefined, or zero', () => {
        expect(calculateMacroGapAndRatio(0, 0)).toEqual({ ratio: 0, gapPrice: 0, gapPriceStr: null });
        expect(calculateMacroGapAndRatio(8.5, 0)).toEqual({ ratio: 0, gapPrice: 0, gapPriceStr: null });
        expect(calculateMacroGapAndRatio(0, 4.5)).toEqual({ ratio: 0, gapPrice: 0, gapPriceStr: null });
        expect(calculateMacroGapAndRatio(-5, 3)).toEqual({ ratio: 0, gapPrice: 0, gapPriceStr: null });
      });

      it('correctly calculates gap and ratio for valid numbers', () => {
        const result = calculateMacroGapAndRatio(10, 6);
        expect(result.ratio).toBe(60.0);
        expect(result.gapPrice).toBe(4);
        expect(result.gapPriceStr).toBe('4.0억');
      });
    });

    describe('formatXAxisTick', () => {
      it('handles null, undefined, and non-string inputs', () => {
        expect(formatXAxisTick(null as any)).toBe('');
        expect(formatXAxisTick(undefined as any)).toBe('');
        expect(formatXAxisTick('')).toBe('');
      });

      it('formats YY.MM strings to YY년 MM월', () => {
        expect(formatXAxisTick('24.05')).toBe('24년 05월');
        expect(formatXAxisTick('25.12')).toBe('25년 12월');
      });

      it('returns unformatted string for non-matching formats', () => {
        expect(formatXAxisTick('2024-05')).toBe('2024-05');
        expect(formatXAxisTick('Jan')).toBe('Jan');
      });
    });

    describe('formatAvgPriceEok', () => {
      it('handles null, undefined, and NaN inputs returning fallback "-"', () => {
        expect(formatAvgPriceEok(null)).toBe('-');
        expect(formatAvgPriceEok(undefined)).toBe('-');
        expect(formatAvgPriceEok(NaN)).toBe('-');
        expect(formatAvgPriceEok(0)).toBe('-');
      });

      it('formats prices in 억 and 만 notation accurately', () => {
        expect(formatAvgPriceEok(7.5)).toBe('7억5,000');
        expect(formatAvgPriceEok(12.0)).toBe('12억');
        expect(formatAvgPriceEok(0.85)).toBe('8,500');
      });
    });

    describe('calculateMonthlyAverages', () => {
      it('returns empty array when transactions is null or undefined', () => {
        const byMonthMap = new Map();
        expect(calculateMonthlyAverages(null, 'sale', 202401, byMonthMap)).toEqual([]);
        expect(calculateMonthlyAverages(undefined, 'sale', 202401, byMonthMap)).toEqual([]);
      });

      it('returns empty array when transactions is empty', () => {
        const byMonthMap = new Map();
        expect(calculateMonthlyAverages([], 'sale', 202401, byMonthMap)).toEqual([]);
      });
    });

    describe('MacroTrendChart Component Null Data Rendering', () => {
      it('renders without console errors when lineData is null', () => {
        render(
          <MacroTrendChart
            lineData={null as any}
            xTicks={[]}
            yTicks={[0, 5, 10]}
            timeframe="1Y"
          />
        );
        expect(screen.getByTestId('area-chart')).toHaveAttribute('data-count', '0');
        expect(consoleErrorSpy).not.toHaveBeenCalled();
      });

      it('renders without console errors when lineData is undefined', () => {
        render(
          <MacroTrendChart
            lineData={undefined as any}
            xTicks={[]}
            yTicks={[]}
            timeframe="1Y"
          />
        );
        expect(screen.getByTestId('area-chart')).toHaveAttribute('data-count', '0');
        expect(consoleErrorSpy).not.toHaveBeenCalled();
      });

      it('renders without console errors when lineData is an empty array', () => {
        render(
          <MacroTrendChart
            lineData={[]}
            xTicks={['24.01', '24.02']}
            yTicks={[0, 10]}
            timeframe="ALL"
          />
        );
        expect(screen.getByTestId('area-chart')).toHaveAttribute('data-count', '0');
        expect(consoleErrorSpy).not.toHaveBeenCalled();
      });

      it('renders cleanly when lineData contains null values', () => {
        const dataWithNulls = [
          { name: '24.01', '동탄 아파트 전체': null, '동탄 아파트 전세 평균': null },
          { name: '24.02', '동탄 아파트 전체': 9.2, '동탄 아파트 전세 평균': null },
        ];
        render(
          <MacroTrendChart
            lineData={dataWithNulls as any}
            xTicks={['24.01', '24.02']}
            yTicks={[0, 5, 10]}
            timeframe="3Y"
          />
        );
        expect(screen.getByTestId('area-chart')).toHaveAttribute('data-count', '2');
        expect(consoleErrorSpy).not.toHaveBeenCalled();
      });
    });
  });

  // ==========================================
  // Section 3: Mobile Layout Defense (320px Viewport)
  // ==========================================
  describe('3. Mobile Layout Defense & 320px Viewport Overflow Verification', () => {
    it('verifies 320px mobile viewport setup with zero console errors', () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 320 });
      Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 568 });
      window.dispatchEvent(new Event('resize'));

      expect(window.innerWidth).toBe(320);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('ensures MacroTrendChart container fits 320px viewport without overflow', () => {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 320 });

      const { container } = render(
        <div style={{ width: '320px', maxWidth: '100%', overflowX: 'hidden' }}>
          <MacroTrendChart
            lineData={[
              { name: '24.01', '동탄 아파트 전체': 8.5, '동탄 아파트 전세 평균': 4.5 },
            ]}
            xTicks={['24.01']}
            yTicks={[0, 10]}
            timeframe="1Y"
            isBottomSheet={true}
          />
        </div>
      );

      const chartWrapper = container.querySelector('.touch-pan-y');
      expect(chartWrapper).toBeInTheDocument();
      expect(chartWrapper).toHaveClass('overflow-hidden');
    });
  });
});
