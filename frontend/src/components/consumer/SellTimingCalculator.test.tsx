import { render, screen, act } from '@testing-library/react';
import SellTimingCalculator from './SellTimingCalculator';
import { calculateVerdictScore, calculateCapitalGainsTax } from '@/lib/utils/sellTimingEngine';

// Mock Firebase SDK to prevent actual database calls and fetch errors during test imports
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn().mockResolvedValue({ id: 'mock-diagnosis-log-id' }),
  serverTimestamp: jest.fn().mockReturnValue('mock-timestamp'),
}));

jest.mock('@/lib/firebaseConfig', () => ({
  db: {}, // Mock DB object
}));

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

describe('SellTiming Engine Functions', () => {
  it('correctly calculates verdict score (verdictScore)', () => {
    // 🔴 지금 팔면 호구 (보류 권장) 시나리오: 고점 대비 낙폭이 크고 전세가율이 높음
    const result1 = calculateVerdictScore({
      currentPrice: 80000,
      maxPrice3Y: 120000,
      txCount3M: 1,
      totalGenerations: 1000,
      jeonseRatio: 82,
    });
    expect(result1.score).toBeGreaterThanOrEqual(70);
    expect(result1.label).toBe('🔴 지금 팔면 호구 (보류 권장)');

    // 🟢 양호한 매도 기회 시나리오: 낙폭이 거의 없음
    const result2 = calculateVerdictScore({
      currentPrice: 115000,
      maxPrice3Y: 120000,
      txCount3M: 10,
      totalGenerations: 500,
      jeonseRatio: 55,
    });
    expect(result2.score).toBeLessThan(40);
    expect(result2.label).toBe('🟢 양호한 매도 기회 (매도 가능)');
  });

  it('correctly calculates capital gains tax (capitalGainsTax)', () => {
    // 1주택 2년보유 12억 이하 비과세
    const taxFree = calculateCapitalGainsTax({
      transferPrice: 85000,
      acquisitionPrice: 60000,
      holdingYears: 3,
      resideYears: 2,
      isOneHouse: true,
    });
    expect(taxFree.isTaxFree).toBe(true);
    expect(taxFree.totalTax).toBe(0);

    // 1주택 2년보유 12억 초과 고가주택 안분 과세
    const expensiveOneHouse = calculateCapitalGainsTax({
      transferPrice: 150000,
      acquisitionPrice: 90000,
      holdingYears: 5,
      resideYears: 4,
      isOneHouse: true,
    });
    expect(expensiveOneHouse.isTaxFree).toBe(false);
    expect(expensiveOneHouse.transferProfit).toBe(60000);
    expect(expensiveOneHouse.taxableProfit).toBe(12000); // 60000 * (150-120) / 150 = 12000 만원
    expect(expensiveOneHouse.janggiGongje).toBeGreaterThan(0); // 5년 보유 및 4년 거주 -> 장특공 대상
    expect(expensiveOneHouse.totalTax).toBeGreaterThan(0);

    // 다주택자 일반 과세 (비과세 요건 미충족)
    const taxed = calculateCapitalGainsTax({
      transferPrice: 90000,
      acquisitionPrice: 60000,
      holdingYears: 2,
      resideYears: 0,
      isOneHouse: false,
    });
    expect(taxed.isTaxFree).toBe(false);
    expect(taxed.transferProfit).toBe(30000);
    expect(taxed.janggiGongje).toBe(0); // 3년 미만은 장특공 0
    expect(taxed.totalTax).toBeGreaterThan(0);
  });
});

describe('SellTimingCalculator Component', () => {
  const mockSheetApartments = {
    '청계동': [
      { name: '동탄역더샵센트럴시티', dong: '청계동', householdCount: 1400, yearBuilt: '2015' }
    ]
  };

  const mockTxSummaryData = {
    '동탄역더샵센트럴시티': {
      avg3MPrice: 125000,
      maxPrice3Y: 145000,
      jeonseRatio: 72,
      dong: '청계동'
    }
  };

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
      <SellTimingCalculator
        isOpen={true}
        onClose={mockOnClose}
        sheetApartments={mockSheetApartments as any}
        txSummaryData={mockTxSummaryData as any}
        nameMapping={mockNameMapping}
      />
    );

    expect(screen.getByText('AI 주거 자산 안정성 및 세무 진단기')).toBeInTheDocument();
  });

  it('pre-fills states based on quiz answers (e.g. investmentStyle=residence)', () => {
    mockLocalStorageStore['drive_quiz_answers'] = JSON.stringify({
      budget: '12eok',
      family: 'middleHigh',
      transit: 'gtx',
      lifestyle: 'nature',
      scaleBrand: 'brand',
      yearBuilt: 'middle',
      investmentStyle: 'residence',
    });

    render(
      <SellTimingCalculator
        isOpen={true}
        onClose={mockOnClose}
        initialAptName="동탄역더샵센트럴시티"
        sheetApartments={mockSheetApartments as any}
        txSummaryData={mockTxSummaryData as any}
        nameMapping={mockNameMapping}
      />
    );

    expect(screen.getByText('퀴즈 성향 연동됨')).toBeInTheDocument();
  });

  it('triggers auto diagnosis and displays result details', () => {
    mockLocalStorageStore['drive_quiz_answers'] = JSON.stringify({
      budget: '12eok',
      family: 'middleHigh',
      transit: 'gtx',
      lifestyle: 'nature',
      scaleBrand: 'brand',
      yearBuilt: 'middle',
      investmentStyle: 'residence',
    });

    render(
      <SellTimingCalculator
        isOpen={true}
        onClose={mockOnClose}
        initialAptName="동탄역더샵센트럴시티"
        sheetApartments={mockSheetApartments as any}
        txSummaryData={mockTxSummaryData as any}
        nameMapping={mockNameMapping}
      />
    );

    // Initial state shows calculating text due to initialAptName + quiz answers
    expect(screen.getByText('AI 분석 및 양도세 계산 중...')).toBeInTheDocument();

    // Fast-forward 1.2s
    act(() => {
      jest.advanceTimersByTime(1200);
    });

    // Verification of results panels
    expect(screen.getByText('자산 안정성 스코어')).toBeInTheDocument();
    expect(screen.getByText('세무 전략 및 양도소득세 리포트')).toBeInTheDocument();
    expect(screen.getByText('납부할 총 세액 합계')).toBeInTheDocument();
  });
});
