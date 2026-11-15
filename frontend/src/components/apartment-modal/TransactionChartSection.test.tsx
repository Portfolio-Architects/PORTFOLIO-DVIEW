import React from 'react';
import fs from 'fs';
import path from 'path';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TransactionChartSection } from './TransactionChartSection';
import ChartErrorBoundary from '@/components/common/ChartErrorBoundary';

// Mock recharts ResponsiveContainer to render children in JSDOM
jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container" style={{ width: '500px', height: '300px' }}>
        {children}
      </div>
    ),
  };
});

// Mock settings context
jest.mock('@/contexts/SettingsContext', () => ({
  useSettingsValues: () => ({
    areaUnit: 'm2',
    setAreaUnit: jest.fn(),
  }),
}));

describe('TransactionChartSection Empirical Verification', () => {
  let originalClientWidth: any;
  let originalClientHeight: any;
  let originalResizeObserver: any;

  beforeAll(() => {
    originalClientWidth = Object.getOwnPropertyDescriptor(HTMLDivElement.prototype, 'clientWidth');
    originalClientHeight = Object.getOwnPropertyDescriptor(HTMLDivElement.prototype, 'clientHeight');
    originalResizeObserver = window.ResizeObserver;

    Object.defineProperty(HTMLDivElement.prototype, 'clientWidth', { configurable: true, value: 500 });
    Object.defineProperty(HTMLDivElement.prototype, 'clientHeight', { configurable: true, value: 300 });

    class MockResizeObserver {
      callback: any;
      constructor(callback: any) {
        this.callback = callback;
      }
      observe(target: Element) {
        this.callback([{ contentRect: { width: 500, height: 300 } }]);
      }
      unobserve() {}
      disconnect() {}
    }
    window.ResizeObserver = MockResizeObserver as any;
  });

  afterAll(() => {
    if (originalClientWidth) Object.defineProperty(HTMLDivElement.prototype, 'clientWidth', originalClientWidth);
    if (originalClientHeight) Object.defineProperty(HTMLDivElement.prototype, 'clientHeight', originalClientHeight);
    window.ResizeObserver = originalResizeObserver;
  });

  const mockTransactions = [
    {
      txKey: 'tx1',
      aptSeq: 'seq1',
      aptName: '동탄역 시범한화꿈에그린프레스티지',
      dong: '청계동',
      price: 125000,
      priceEok: '12.5억',
      deposit: 0,
      monthlyRent: 0,
      contractYm: '202505',
      contractDay: '12',
      area: 84.95,
      areaPyeong: 33,
      floor: 15,
      dealType: '매매',
    },
    {
      txKey: 'tx2',
      aptSeq: 'seq1',
      aptName: '동탄역 시범한화꿈에그린프레스티지',
      dong: '청계동',
      price: 65000,
      priceEok: '6.5억',
      deposit: 65000,
      monthlyRent: 0,
      contractYm: '202506',
      contractDay: '20',
      area: 84.95,
      areaPyeong: 33,
      floor: 10,
      dealType: '전세',
    },
  ];

  it('renders TransactionChartSection cleanly without ReferenceError for CustomActiveDot', () => {
    const setChartType = jest.fn();

    expect(() => {
      render(
        <ChartErrorBoundary>
          <TransactionChartSection
            transactions={mockTransactions as any}
            chartType="sale"
            setChartType={setChartType}
            displayAptName="동탄역 시범한화꿈에그린프레스티지"
            dong="청계동"
            typeMap={{}}
            normalizeAptName={(name) => name}
          />
        </ChartErrorBoundary>
      );
    }).not.toThrow();

    expect(screen.getByText(/매매가 추이/i)).toBeInTheDocument();
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('renders empty fallback when transactions array is empty', () => {
    render(
      <TransactionChartSection
        transactions={[]}
        chartType="sale"
        setChartType={jest.fn()}
        displayAptName="동탄역 시범한화꿈에그린프레스티지"
        dong="청계동"
        typeMap={{}}
        normalizeAptName={(name) => name}
      />
    );

    expect(screen.getByText('현재 숨고르기 중인 단지입니다')).toBeInTheDocument();
  });

  it('uses mobile 2x2 momentum grid, solid series colors matching legend, XAxis padding, and Recharts 3 axis scale hooks', () => {
    const source = fs.readFileSync(path.resolve(__dirname, './TransactionChartSection.tsx'), 'utf8');

    expect(source).not.toContain('saleLineGrad');
    expect(source).not.toContain('jeonseLineGrad');
    expect(source).not.toContain('<Customized component=');
    expect(source).toContain('useXAxisScale');
    expect(source).toContain('useYAxisScale');
    expect(source).toContain('padding={{ left: 16, right: 16 }}');

    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const { container } = render(
        <TransactionChartSection
          transactions={mockTransactions as any}
          chartType="sale"
          setChartType={jest.fn()}
          displayAptName="동탄역 시범한화꿈에그린프레스티지"
          dong="청계동"
          typeMap={{}}
          normalizeAptName={(name) => name}
        />
      );

      const gridEl = container.querySelector('.grid.grid-cols-2.sm\\:grid-cols-4');
      expect(gridEl).toBeInTheDocument();
      expect(screen.getByText('1개월 평균')).toBeInTheDocument();
      expect(screen.getByText('3개월 평균')).toBeInTheDocument();
      expect(screen.getByText('6개월 평균')).toBeInTheDocument();
      expect(screen.getByText('1년 평균')).toBeInTheDocument();

      expect(errorSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
      warnSpy.mockRestore();
    }
  });
});

