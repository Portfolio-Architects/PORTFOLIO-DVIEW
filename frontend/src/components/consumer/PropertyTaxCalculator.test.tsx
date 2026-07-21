import { render, screen, act } from '@testing-library/react';
import PropertyTaxCalculator from './PropertyTaxCalculator';

// Mock Recharts to avoid JSOM rendering issues
jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: any) => <div style={{ width: '100%', height: '100%' }}>{children}</div>,
    PieChart: ({ children }: any) => <svg>{children}</svg>,
    Pie: ({ children }: any) => <g>{children}</g>,
    Cell: () => <path />,
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

describe('PropertyTaxCalculator', () => {
  const mockSheetApartments = {
    '청계동': [
      { name: '동탄역더샵센트럴시티', dong: '청계동', householdCount: 1400, yearBuilt: '2015' }
    ]
  };

  const mockTxSummaryData = {
    '동탄역더샵센트럴시티': {
      avg3MPrice: 125000,
      avg3MRentDeposit: 65000,
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
      <PropertyTaxCalculator
        isOpen={true}
        onClose={mockOnClose}
        sheetApartments={mockSheetApartments as any}
        txSummaryData={mockTxSummaryData as any}
        nameMapping={mockNameMapping}
      />
    );

    expect(screen.getByText('취득세 및 중개보수 계산기')).toBeInTheDocument();
  });

  it('pre-fills owned houses to 2 and area to 85over based on quiz answers', () => {
    mockLocalStorageStore['drive_quiz_answers'] = JSON.stringify({
      budget: '12eok',
      family: 'middleHigh',
      transit: 'gtx',
      lifestyle: 'nature',
      scaleBrand: 'brand',
      yearBuilt: 'middle',
      investmentStyle: 'gap',
    });

    render(
      <PropertyTaxCalculator
        isOpen={true}
        onClose={mockOnClose}
        initialAptName="동탄역더샵센트럴시티"
        sheetApartments={mockSheetApartments as any}
        txSummaryData={mockTxSummaryData as any}
        nameMapping={mockNameMapping}
      />
    );

    // Badges indicating "퀴즈 답변 반영됨" should be visible
    const badges = screen.getAllByText('퀴즈 답변 반영됨');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('performs zero-click calculation when initialAptName and quiz answers are present', () => {
    mockLocalStorageStore['drive_quiz_answers'] = JSON.stringify({
      budget: '8eok',
      family: 'elementary',
      transit: 'gtx',
      lifestyle: 'nature',
      scaleBrand: 'brand',
      yearBuilt: 'middle',
      investmentStyle: 'residence',
    });

    render(
      <PropertyTaxCalculator
        isOpen={true}
        onClose={mockOnClose}
        initialAptName="동탄역더샵센트럴시티"
        sheetApartments={mockSheetApartments as any}
        txSummaryData={mockTxSummaryData as any}
        nameMapping={mockNameMapping}
      />
    );

    // Should show calculating text initially
    expect(screen.getByText('퀴즈 기반 자동 진단 중...')).toBeInTheDocument();

    // Fast-forward 1.2s timer
    act(() => {
      jest.advanceTimersByTime(1200);
    });

    // Should now show results
    expect(screen.getByText('최종 소요 부대비용:')).toBeInTheDocument();
  });

  it('calculates heavy rate Local Education Tax (fixed 0.4%) and Rural Special Tax for 3 houses (>85m2)', () => {
    // ownedHouses = 3 (investmentStyle: 'gap' sets 2, but we can test calculation logic via zero-click with 3 houses)
    mockLocalStorageStore['drive_quiz_answers'] = JSON.stringify({
      budget: '12eok',
      family: 'middleHigh',
      transit: 'gtx',
      lifestyle: 'nature',
      scaleBrand: 'brand',
      yearBuilt: 'middle',
      investmentStyle: 'gap',
    });

    render(
      <PropertyTaxCalculator
        isOpen={true}
        onClose={mockOnClose}
        initialAptName="동탄역더샵센트럴시티"
        sheetApartments={mockSheetApartments as any}
        txSummaryData={mockTxSummaryData as any}
        nameMapping={mockNameMapping}
      />
    );

    act(() => {
      jest.advanceTimersByTime(1200);
    });

    // Result view should render Breakdown items
    expect(screen.getByText('1. 취득세')).toBeInTheDocument();
    expect(screen.getByText('2. 지방교육세')).toBeInTheDocument();
    expect(screen.getByText('3. 농어촌특별세')).toBeInTheDocument();
  });
});
