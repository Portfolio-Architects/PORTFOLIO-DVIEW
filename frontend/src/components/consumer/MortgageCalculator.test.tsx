import { render, screen, fireEvent, act } from '@testing-library/react';
import MortgageCalculator from './MortgageCalculator';

// Mock Recharts to avoid jsdom issues
jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: any) => <div style={{ width: '100%', height: '100%' }}>{children}</div>,
    AreaChart: ({ children }: any) => <svg>{children}</svg>,
    Area: () => <path />,
    XAxis: () => <g />,
    YAxis: () => <g />,
    Tooltip: () => <div />,
  };
});

// Mock localStorage
const mockLocalStorageStore: Record<string, string> = {};
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: jest.fn((key: string) => mockLocalStorageStore[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      mockLocalStorageStore[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete mockLocalStorageStore[key];
    }),
    clear: jest.fn(() => {
      Object.keys(mockLocalStorageStore).forEach(key => delete mockLocalStorageStore[key]);
    }),
  },
  writable: true,
});

describe('MortgageCalculator', () => {
  const mockSheetApartments = {
    '청계동': [
      { name: '동탄역더샵센트럴시티', dong: '청계동', householdCount: 1400, yearBuilt: '2015' }
    ]
  };

  const mockTxSummaryData = {
    '동탄역더샵센트럴시티': {
      avg3MPrice: 85000,
      avg3MRentDeposit: 45000,
      dong: '청계동'
    }
  };

  const mockFieldReportsMap = new Map();
  const mockNameMapping = {};
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(mockLocalStorageStore).forEach(key => delete mockLocalStorageStore[key]);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders correctly when open', () => {
    render(
      <MortgageCalculator
        isOpen={true}
        onClose={mockOnClose}
        sheetApartments={mockSheetApartments as any}
        txSummaryData={mockTxSummaryData as any}
        nameMapping={mockNameMapping}
        fieldReportsMap={mockFieldReportsMap}
      />
    );

    expect(screen.getByText('내 집 마련 대출 자가진단')).toBeInTheDocument();
  });

  it('pre-fills household, income, and assets based on quiz answers', () => {
    mockLocalStorageStore['dview_quiz_answers'] = JSON.stringify({
      budget: '8eok',
      family: 'baby',
      transit: 'gtx',
      lifestyle: 'nature',
      scaleBrand: 'brand',
      yearBuilt: 'middle',
      investmentStyle: 'residence',
    });

    render(
      <MortgageCalculator
        isOpen={true}
        onClose={mockOnClose}
        initialAptName="동탄역더샵센트럴시티"
        sheetApartments={mockSheetApartments as any}
        txSummaryData={mockTxSummaryData as any}
        nameMapping={mockNameMapping}
        fieldReportsMap={mockFieldReportsMap}
      />
    );

    // Click "다음 단계 (가구 요건)" to view Step 2
    fireEvent.click(screen.getByText('다음 단계 (가구 요건)'));

    // Check if the "신생아 출산 가구" button is selected (it has green check icon or similar styling)
    expect(screen.getByText('신생아 출산 가구')).toBeInTheDocument();
    expect(screen.getByText('퀴즈 답변 반영됨')).toBeInTheDocument();

    // Click "다음 단계 (소득/자산)" to view Step 3
    fireEvent.click(screen.getByText('다음 단계 (소득/자산)'));

    // In Step 3, the fields should be prefilled and badges should show
    expect(screen.getAllByText('설문 기반 자동 입력됨').length).toBeGreaterThan(0);
  });

  it('allows skipping straight to results with one-click diagnosis button', () => {
    mockLocalStorageStore['dview_quiz_answers'] = JSON.stringify({
      budget: '5eok',
      family: 'baby',
      transit: 'gtx',
      lifestyle: 'nature',
      scaleBrand: 'brand',
      yearBuilt: 'middle',
      investmentStyle: 'residence',
    });

    render(
      <MortgageCalculator
        isOpen={true}
        onClose={mockOnClose}
        initialAptName="동탄역더샵센트럴시티"
        sheetApartments={mockSheetApartments as any}
        txSummaryData={mockTxSummaryData as any}
        nameMapping={mockNameMapping}
        fieldReportsMap={mockFieldReportsMap}
      />
    );

    // One-click diagnosis button should render on Step 1
    const skipBtn = screen.getByText('퀴즈 결과로 바로 진단하기 (원클릭)');
    expect(skipBtn).toBeInTheDocument();

    // Click the skip button
    fireEvent.click(skipBtn);

    // Calculations start
    expect(screen.getByText('퀴즈 기반 자동 진단 중...')).toBeInTheDocument();

    // Fast-forward 1.2s
    act(() => {
      jest.advanceTimersByTime(1200);
    });

    // Should render results (Step 4)
    expect(screen.getByText('최적 정책금융 상품 매칭 완료')).toBeInTheDocument();
    expect(screen.getByText('추천:')).toBeInTheDocument();
  });
});
