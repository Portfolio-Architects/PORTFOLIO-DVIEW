import { render, screen, act } from '@testing-library/react';
import JeonseSafetyCalculator from './JeonseSafetyCalculator';

// Mock Recharts and other packages if needed
jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: any) => <div style={{ width: '100%', height: '100%' }}>{children}</div>,
    LineChart: ({ children }: any) => <svg>{children}</svg>,
    Line: () => <g />,
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

describe('JeonseSafetyCalculator', () => {
  const mockSheetApartments = {
    '청계동': [
      { name: '동탄역더샵센트럴시티', dong: '청계동', brand: '더샵', householdCount: 1400, yearBuilt: '2015' }
    ]
  };

  const mockTxSummaryData = {
    '동탄역더샵센트럴시티': {
      avg3MPrice: 125000,
      avg3MRentDeposit: 65000, // 6.5억
      dong: '청계동'
    }
  };

  const mockNameMapping = {};
  const mockFieldReportsMap = new Map();
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
      <JeonseSafetyCalculator
        isOpen={true}
        onClose={mockOnClose}
        sheetApartments={mockSheetApartments as any}
        txSummaryData={mockTxSummaryData as any}
        nameMapping={mockNameMapping}
        fieldReportsMap={mockFieldReportsMap}
      />
    );

    expect(screen.getByText('전세금 깡통전세 안전진단기')).toBeInTheDocument();
  });

  it('renders budget warning badge when jeonse amount exceeds quiz budget limit', () => {
    // 5eok matches 63000 (6.3억)
    mockLocalStorageStore['drive_quiz_answers'] = JSON.stringify({
      budget: '5eok',
      family: 'elementary',
      transit: 'gtx',
      lifestyle: 'nature',
    });

    render(
      <JeonseSafetyCalculator
        isOpen={true}
        onClose={mockOnClose}
        initialAptName="동탄역더샵센트럴시티"
        sheetApartments={mockSheetApartments as any}
        txSummaryData={mockTxSummaryData as any}
        nameMapping={mockNameMapping}
        fieldReportsMap={mockFieldReportsMap}
      />
    );

    // Matches '유저 설정 예산(6.3억) 초과 단지' warning badge since rent deposit is 6.5억 (65000)
    expect(screen.getByText('유저 설정 예산(6.3억) 초과 단지')).toBeInTheDocument();
  });

  it('renders budget integration success badge when jeonse amount is within budget limit', () => {
    // 8eok matches 93000 (9.3억)
    mockLocalStorageStore['drive_quiz_answers'] = JSON.stringify({
      budget: '8eok',
      family: 'elementary',
      transit: 'gtx',
      lifestyle: 'nature',
    });

    render(
      <JeonseSafetyCalculator
        isOpen={true}
        onClose={mockOnClose}
        initialAptName="동탄역더샵센트럴시티"
        sheetApartments={mockSheetApartments as any}
        txSummaryData={mockTxSummaryData as any}
        nameMapping={mockNameMapping}
        fieldReportsMap={mockFieldReportsMap}
      />
    );

    // Matches '퀴즈 예산 연동됨' success badge since 6.5억 is within 9.3억
    expect(screen.getByText('퀴즈 예산 연동됨')).toBeInTheDocument();
  });

  it('triggers zero-click simulation when initialAptName and quiz answers exist', () => {
    mockLocalStorageStore['drive_quiz_answers'] = JSON.stringify({
      budget: '8eok',
      family: 'elementary',
      transit: 'gtx',
      lifestyle: 'nature',
    });

    render(
      <JeonseSafetyCalculator
        isOpen={true}
        onClose={mockOnClose}
        initialAptName="동탄역더샵센트럴시티"
        sheetApartments={mockSheetApartments as any}
        txSummaryData={mockTxSummaryData as any}
        nameMapping={mockNameMapping}
        fieldReportsMap={mockFieldReportsMap}
      />
    );

    // Should display calculating text immediately
    expect(screen.getByText('퀴즈 기반 자동 진단 중...')).toBeInTheDocument();

    // Fast-forward 1.2s
    act(() => {
      jest.advanceTimersByTime(1200);
    });

    // Should render results details (like '진단 결과:')
    expect(screen.getByText(/진단 결과:/)).toBeInTheDocument();
    expect(screen.getByText('부채비율(LTV)')).toBeInTheDocument();
  });
});
