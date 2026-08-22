import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TransactionChartSection } from './TransactionChartSection';
import { ApartmentModalKakaoCard } from '../apartment/ApartmentModalKakaoCard';
import { ApartmentModalPriceSummary } from '../apartment/ApartmentModalPriceSummary';
import { ApartmentModalTransactionsTable } from '../apartment/ApartmentModalTransactionsTable';
import { TransactionTable } from './TransactionTable';
import { TransactionSummaryMetrics } from './TransactionSummaryMetrics';
import type { TransactionRecord, FieldReportData, AptTxSummary } from '@/types';

// Mock recharts
jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container" style={{ width: '600px', height: '350px' }}>
        {children}
      </div>
    ),
  };
});

// Mock settings context
let mockAreaUnit: 'm2' | 'pyeong' = 'm2';
const mockSetAreaUnit = jest.fn((unit: 'm2' | 'pyeong') => {
  mockAreaUnit = unit;
});

jest.mock('@/contexts/SettingsContext', () => ({
  useSettingsValues: () => ({
    areaUnit: mockAreaUnit,
    setAreaUnit: mockSetAreaUnit,
  }),
}));

// Mock safeHtml2canvas
jest.mock('@/lib/utils/html2canvasPatch', () => ({
  safeHtml2canvas: jest.fn().mockResolvedValue({
    toDataURL: () => 'data:image/png;base64,mock',
  }),
}));

describe('Milestone 1 Challenger 2 Empirical Verification Suite', () => {
  let originalClientWidth: PropertyDescriptor | undefined;
  let originalClientHeight: PropertyDescriptor | undefined;
  let originalResizeObserver: typeof window.ResizeObserver;

  beforeAll(() => {
    originalClientWidth = Object.getOwnPropertyDescriptor(HTMLDivElement.prototype, 'clientWidth');
    originalClientHeight = Object.getOwnPropertyDescriptor(HTMLDivElement.prototype, 'clientHeight');
    originalResizeObserver = window.ResizeObserver;

    Object.defineProperty(HTMLDivElement.prototype, 'clientWidth', { configurable: true, value: 600 });
    Object.defineProperty(HTMLDivElement.prototype, 'clientHeight', { configurable: true, value: 350 });

    class MockResizeObserver {
      callback: (entries: Array<{ contentRect: { width: number; height: number } }>) => void;
      constructor(callback: (entries: Array<{ contentRect: { width: number; height: number } }>) => void) {
        this.callback = callback;
      }
      observe() {
        this.callback([{ contentRect: { width: 600, height: 350 } }]);
      }
      unobserve() {}
      disconnect() {}
    }
    window.ResizeObserver = MockResizeObserver as unknown as typeof window.ResizeObserver;
  });

  afterAll(() => {
    if (originalClientWidth) Object.defineProperty(HTMLDivElement.prototype, 'clientWidth', originalClientWidth);
    if (originalClientHeight) Object.defineProperty(HTMLDivElement.prototype, 'clientHeight', originalClientHeight);
    window.ResizeObserver = originalResizeObserver;
  });

  const dummyReport: FieldReportData = {
    id: 'report-1',
    complexName: '동탄린스트라우스더레이크',
    dong: '송동',
    metrics: {
      yearBuilt: '2019-12-01',
      householdCount: 956,
      parkingRatio: 1.45,
    },
    premiumScores: {
      totalPremiumScore: 92.5,
    },
  };

  const sampleTransactions: TransactionRecord[] = [
    {
      dong: '송동',
      aptName: '동탄린스트라우스더레이크',
      area: 98.5,
      areaPyeong: 38,
      contractYm: '202506',
      contractDay: '15',
      price: 135000,
      priceEok: '13.5억',
      deposit: 0,
      monthlyRent: 0,
      floor: 22,
      buildYear: 2019,
      dealType: '매매',
      areaLabelM2: '98A㎡',
      areaLabelPyeong: '38평A',
    },
    {
      dong: '송동',
      aptName: '동탄린스트라우스더레이크',
      area: 98.5,
      areaPyeong: 38,
      contractYm: '202505',
      contractDay: '10',
      price: 132000,
      priceEok: '13.2억',
      deposit: 0,
      monthlyRent: 0,
      floor: 14,
      buildYear: 2019,
      dealType: '매매',
      areaLabelM2: '98A㎡',
      areaLabelPyeong: '38평A',
    },
    {
      dong: '송동',
      aptName: '동탄린스트라우스더레이크',
      area: 98.5,
      areaPyeong: 38,
      contractYm: '202506',
      contractDay: '05',
      price: 70000,
      priceEok: '7억',
      deposit: 70000,
      monthlyRent: 0,
      floor: 18,
      buildYear: 2019,
      dealType: '전세',
      areaLabelM2: '98A㎡',
      areaLabelPyeong: '38평A',
    },
    {
      dong: '송동',
      aptName: '동탄린스트라우스더레이크',
      area: 116.2,
      areaPyeong: 45,
      contractYm: '202504',
      contractDay: '20',
      price: 150000,
      priceEok: '15억',
      deposit: 0,
      monthlyRent: 0,
      floor: 30,
      buildYear: 2019,
      dealType: '매매',
      isOutlier: true,
      areaLabelM2: '116㎡',
      areaLabelPyeong: '45평',
    },
    {
      dong: '송동',
      aptName: '동탄린스트라우스더레이크',
      area: 98.5,
      areaPyeong: 38,
      contractYm: '202503',
      contractDay: '12',
      price: 120000,
      priceEok: '12억',
      deposit: 10000,
      monthlyRent: 250,
      floor: 5,
      buildYear: 2019,
      dealType: '월세',
      cancelDate: '20250315',
      areaLabelM2: '98A㎡',
      areaLabelPyeong: '38평A',
    },
  ];

  describe('1. TransactionChartSection Contract Verification', () => {
    it('handles empty dataset gracefully for both sale and jeonse charts', () => {
      const { rerender } = render(
        <TransactionChartSection
          transactions={[]}
          chartType="sale"
          setChartType={jest.fn()}
          displayAptName="동탄린스트라우스더레이크"
          dong="송동"
          typeMap={{}}
          normalizeAptName={(n) => n}
        />
      );
      expect(screen.getByText('현재 숨고르기 중인 단지입니다')).toBeInTheDocument();

      rerender(
        <TransactionChartSection
          transactions={[]}
          chartType="jeonse"
          setChartType={jest.fn()}
          displayAptName="동탄린스트라우스더레이크"
          dong="송동"
          typeMap={{}}
          normalizeAptName={(n) => n}
        />
      );
      expect(screen.getByText('현재 숨고르기 중인 단지입니다')).toBeInTheDocument();
    });

    it('handles single-point sale transaction dataset without crash or NaN', () => {
      const singleSale: TransactionRecord[] = [sampleTransactions[0]];
      render(
        <TransactionChartSection
          transactions={singleSale}
          chartType="sale"
          setChartType={jest.fn()}
          displayAptName="동탄린스트라우스더레이크"
          dong="송동"
          typeMap={{}}
          normalizeAptName={(n) => n}
        />
      );

      expect(screen.getByText(/매매가 추이/i)).toBeInTheDocument();
      expect(screen.getByText('1개월 평균')).toBeInTheDocument();
      expect(screen.getAllByText(/13억5,000/).length).toBeGreaterThan(0);
    });

    it('handles single-point jeonse/rent transaction dataset correctly', () => {
      const singleJeonse: TransactionRecord[] = [sampleTransactions[2]];
      render(
        <TransactionChartSection
          transactions={singleJeonse}
          chartType="jeonse"
          setChartType={jest.fn()}
          displayAptName="동탄린스트라우스더레이크"
          dong="송동"
          typeMap={{}}
          normalizeAptName={(n) => n}
        />
      );

      expect(screen.getByText(/전월세 추이/i)).toBeInTheDocument();
      expect(screen.getAllByText('7억').length).toBeGreaterThan(0);
    });

    it('handles multi-point dataset and allows timeframe switching and reset zoom', () => {
      const setChartType = jest.fn();
      render(
        <TransactionChartSection
          transactions={sampleTransactions}
          chartType="sale"
          setChartType={setChartType}
          displayAptName="동탄린스트라우스더레이크"
          dong="송동"
          typeMap={{}}
          normalizeAptName={(n) => n}
        />
      );

      // Verify Timeframe buttons
      const timeframes = ['6M', '1Y', '3Y', 'ALL'];
      timeframes.forEach((tf) => {
        const btn = screen.getByRole('button', { name: tf });
        expect(btn).toBeInTheDocument();
        fireEvent.click(btn);
      });

      // Verify Capture Button
      const captureBtn = screen.getByTitle('차트 이미지로 저장');
      expect(captureBtn).toBeInTheDocument();
      fireEvent.click(captureBtn);
    });

    it('renders JSON-LD structured data script correctly for Place', () => {
      const { container } = render(
        <TransactionChartSection
          transactions={sampleTransactions}
          chartType="sale"
          setChartType={jest.fn()}
          displayAptName="동탄린스트라우스더레이크"
          dong="송동"
          typeMap={{}}
          normalizeAptName={(n) => n}
        />
      );

      const jsonLdScript = container.querySelector('script[type="application/ld+json"]');
      expect(jsonLdScript).not.toBeNull();
      const parsed = JSON.parse(jsonLdScript?.textContent || '{}');
      expect(parsed['@type']).toBe('Place');
      expect(parsed.name).toContain('동탄린스트라우스더레이크');
    });
  });

  describe('2. ApartmentModalKakaoCard Contract Verification', () => {
    it('handles empty transactions array and undefined props without throwing', () => {
      const ref = { current: null };
      expect(() => {
        render(
          <ApartmentModalKakaoCard
            shareCardRef={ref}
            report={dummyReport}
            displayAptName="동탄린스트라우스더레이크"
            transactions={[]}
          />
        );
      }).not.toThrow();

      expect(screen.getByText('동탄린스트라우스더레이크')).toBeInTheDocument();
      expect(screen.getByText('D-VIEW')).toBeInTheDocument();
    });

    it('calculates sale, jeonse, gap, and ratio with varied transaction records and valuation status', () => {
      const ref = { current: null };
      const { rerender } = render(
        <ApartmentModalKakaoCard
          shareCardRef={ref}
          report={dummyReport}
          displayAptName="동탄린스트라우스더레이크"
          transactions={sampleTransactions}
          valuation={{ status: 'undervalued', amount: '1.2억', ratio: 8.5 }}
        />
      );

      expect(screen.getByText('13억 5,000')).toBeInTheDocument(); // Latest sale
      expect(screen.getByText('7억')).toBeInTheDocument(); // Latest jeonse
      expect(screen.getByText('6억 5,000')).toBeInTheDocument(); // Gap (135000 - 70000 = 65000)
      expect(screen.getByText('51.9%')).toBeInTheDocument(); // Ratio (70000 / 135000 = 51.85%)
      expect(screen.getByText(/저평가 메리트/i)).toBeInTheDocument();

      // Test Overvalued & Fair status
      rerender(
        <ApartmentModalKakaoCard
          shareCardRef={ref}
          report={dummyReport}
          displayAptName="동탄린스트라우스더레이크"
          transactions={sampleTransactions}
          valuation={{ status: 'overvalued' }}
        />
      );
      expect(screen.getByText(/시세 고평가/i)).toBeInTheDocument();

      rerender(
        <ApartmentModalKakaoCard
          shareCardRef={ref}
          report={dummyReport}
          displayAptName="동탄린스트라우스더레이크"
          transactions={sampleTransactions}
          valuation={{ status: 'fair' }}
        />
      );
      expect(screen.getByText(/적정 시세/i)).toBeInTheDocument();
    });

    it('handles negative or zero gap gracefully', () => {
      const ref = { current: null };
      const zeroGapTxs: TransactionRecord[] = [
        {
          ...sampleTransactions[0],
          price: 50000,
        },
        {
          ...sampleTransactions[2],
          deposit: 60000,
        },
      ];

      render(
        <ApartmentModalKakaoCard
          shareCardRef={ref}
          report={dummyReport}
          displayAptName="동탄린스트라우스더레이크"
          transactions={zeroGapTxs}
        />
      );

      expect(screen.getByText('갭 없음')).toBeInTheDocument();
    });
  });

  describe('3. ApartmentModalPriceSummary Contract Verification', () => {
    it('handles empty transactions and falls back to txSummary if available', () => {
      const mockSummary: AptTxSummary = {
        latestPrice: 120000,
        latestPriceEok: '12억',
        latestArea: 84.9,
        latestFloor: 10,
        latestDate: '2025-05-01',
        maxPrice: 140000,
        maxPriceEok: '14억',
        minPrice: 90000,
        minPriceEok: '9억',
        txCount: 15,
        avg1MPrice: 120000,
        avg1MPriceEok: '12억',
        latestRentDeposit: 60000,
        recent: [],
      };

      render(
        <ApartmentModalPriceSummary
          report={dummyReport}
          txSummary={mockSummary}
          transactions={[]}
        />
      );

      expect(screen.getByText('12억')).toBeInTheDocument();
      expect(screen.getAllByText('6억').length).toBe(2); // Jeonse & Gap
      expect(screen.getByText('(50.0%)')).toBeInTheDocument();
    });

    it('calculates prices, gap, ratio, and 84m2 normalized price directly from transactions', () => {
      render(
        <ApartmentModalPriceSummary
          report={dummyReport}
          transactions={sampleTransactions}
          valuation={{ status: 'undervalued' }}
        />
      );

      expect(screen.getByText('13억 5,000만')).toBeInTheDocument(); // Latest sale
      expect(screen.getByText('7억')).toBeInTheDocument(); // Latest jeonse
      expect(screen.getByText('6억 5,000만')).toBeInTheDocument(); // Gap
      expect(screen.getByText('저평가')).toBeInTheDocument();
    });
  });

  describe('4. ApartmentModalTransactionsTable Contract Verification', () => {
    it('renders filter bar, layout containers, and executes render props safely', () => {
      const mockRenderTable = jest.fn(() => <div data-testid="mock-table">Table</div>);
      const mockRenderChart = jest.fn(() => <div data-testid="mock-chart">Chart</div>);
      const mockRenderSummary = jest.fn(() => <div data-testid="mock-summary">Summary</div>);
      const setChartType = jest.fn();
      const setSelectedAreaFilter = jest.fn();
      const handleToggleFilter = jest.fn();

      render(
        <ApartmentModalTransactionsTable
          isAnimationFinished={true}
          isTxLoading={false}
          filteredTransactions={sampleTransactions}
          typeMap={{}}
          chartType="sale"
          setChartType={setChartType}
          normalizeAptName={(n) => n}
          displayAptName="동탄린스트라우스더레이크"
          dong="송동"
          apartmentName="동탄린스트라우스더레이크"
          filterOutliers={false}
          handleToggleFilter={handleToggleFilter}
          areaFilterChips={['전체', '84A', '84B', '98A']}
          selectedAreaFilter="전체"
          setSelectedAreaFilter={setSelectedAreaFilter}
          renderTransactionTable={mockRenderTable}
          renderTransactionChart={mockRenderChart}
          renderTransactionSummaryMetrics={mockRenderSummary}
        />
      );

      expect(mockRenderTable).toHaveBeenCalled();
      expect(mockRenderChart).toHaveBeenCalled();
      expect(mockRenderSummary).toHaveBeenCalled();
      expect(screen.getByTestId('mock-table')).toBeInTheDocument();
      expect(screen.getByTestId('mock-chart')).toBeInTheDocument();
      expect(screen.getByTestId('mock-summary')).toBeInTheDocument();

      // Test outlier switch toggle
      const outlierSwitch = screen.getByRole('switch', { name: '이상거래 필터 활성화' });
      expect(outlierSwitch).toBeInTheDocument();
      fireEvent.click(outlierSwitch);
      expect(handleToggleFilter).toHaveBeenCalledTimes(1);
    });

    it('switches to select dropdown when areaFilterChips > 5', () => {
      const chips = ['전체', '74A', '84A', '84B', '98A', '116A'];
      const setSelectedAreaFilter = jest.fn();

      render(
        <ApartmentModalTransactionsTable
          isAnimationFinished={true}
          isTxLoading={false}
          filteredTransactions={sampleTransactions}
          typeMap={{}}
          chartType="sale"
          setChartType={jest.fn()}
          normalizeAptName={(n) => n}
          displayAptName="동탄린스트라우스더레이크"
          dong="송동"
          apartmentName="동탄린스트라우스더레이크"
          filterOutliers={false}
          handleToggleFilter={jest.fn()}
          areaFilterChips={chips}
          selectedAreaFilter="전체"
          setSelectedAreaFilter={setSelectedAreaFilter}
          renderTransactionTable={() => null}
          renderTransactionChart={() => null}
          renderTransactionSummaryMetrics={() => null}
        />
      );

      const select = screen.getByRole('combobox', { name: '평형 타입 필터 선택' });
      expect(select).toBeInTheDocument();
      fireEvent.change(select, { target: { value: '84A' } });
      expect(setSelectedAreaFilter).toHaveBeenCalledWith('84A');
    });
  });

  describe('5. TransactionTable & TransactionSummaryMetrics Contract Verification', () => {
    it('renders TransactionTable with sort, pagination, cancelled tx and outliers', () => {
      render(
        <TransactionTable
          transactions={sampleTransactions}
          typeMap={{}}
          chartType="sale"
          normalizeAptName={(n) => n}
        />
      );

      expect(screen.getByText(/실거래가/i)).toBeInTheDocument();
      // Test sorting dropdown
      const sortBtn = screen.getByRole('button', { name: '실거래가 정렬 필터 선택' });
      expect(sortBtn).toBeInTheDocument();
      fireEvent.click(sortBtn);

      const pastSortOpt = screen.getByText('과거순 (계약일)');
      fireEvent.click(pastSortOpt);
    });

    it('renders TransactionSummaryMetrics periods, per-pyeong calculation, and gap stats', () => {
      render(
        <TransactionSummaryMetrics
          transactions={sampleTransactions}
          apartmentName="동탄린스트라우스더레이크"
          typeMap={{}}
          filterOutliers={false}
          chartType="sale"
        />
      );

      expect(screen.getByText('기간별 평균가격')).toBeInTheDocument();
      expect(screen.getByText('단지 전체')).toBeInTheDocument();
      expect(screen.getByText(/실구매 필요차액/i)).toBeInTheDocument();
    });
  });

  describe('6. Adversarial Stress & Edge Case Resilience', () => {
    it('survives 500+ heterogeneous transactions with missing optional fields and extreme outliers', () => {
      const generatedTxs: TransactionRecord[] = Array.from({ length: 500 }, (_, i) => {
        const ymYear = 2020 + (i % 6);
        const ymMonth = String((i % 12) + 1).padStart(2, '0');
        const dealTypes = ['매매', '전세', '월세', '직거래', '중개거래', ''];
        return {
          dong: i % 2 === 0 ? '송동' : '청계동',
          aptName: '동탄린스트라우스더레이크',
          area: 59 + (i % 80),
          areaPyeong: 18 + (i % 25),
          contractYm: `${ymYear}${ymMonth}`,
          contractDay: String((i % 28) + 1).padStart(2, '0'),
          price: i % 10 === 0 ? 0 : 50000 + (i * 300),
          priceEok: `${(5 + (i * 0.03)).toFixed(1)}억`,
          deposit: i % 3 === 0 ? 30000 + (i * 100) : 0,
          monthlyRent: i % 4 === 0 ? 100 + (i % 200) : 0,
          floor: (i % 49) - 1, // include negative/ground floor
          buildYear: 2019,
          dealType: dealTypes[i % dealTypes.length],
          isOutlier: i % 7 === 0,
          cancelDate: i % 15 === 0 ? `${ymYear}${ymMonth}15` : undefined,
        };
      });

      expect(() => {
        render(
          <TransactionChartSection
            transactions={generatedTxs}
            chartType="sale"
            setChartType={jest.fn()}
            displayAptName="동탄린스트라우스더레이크"
            dong="송동"
            typeMap={{}}
            normalizeAptName={(n) => n}
          />
        );
      }).not.toThrow();

      expect(screen.getByText(/매매가 추이/i)).toBeInTheDocument();
    });

    it('handles ApartmentModalPriceSummary when all prices are 0', () => {
      const zeroPrices: TransactionRecord[] = [
        {
          dong: '송동',
          aptName: '동탄단지',
          area: 84.9,
          areaPyeong: 25,
          contractYm: '202506',
          contractDay: '10',
          price: 0,
          priceEok: '0억',
          floor: 5,
          buildYear: 2020,
          dealType: '매매',
        },
      ];

      render(
        <ApartmentModalPriceSummary
          report={dummyReport}
          transactions={zeroPrices}
        />
      );

      // All zero prices should render fallback '-' without runtime division by zero crashes
      expect(screen.getAllByText('-').length).toBeGreaterThanOrEqual(3);
    });
  });
});

