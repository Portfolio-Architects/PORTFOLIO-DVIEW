import { render, screen, fireEvent, act } from '@testing-library/react';
import AptCompareModal from './AptCompareModal';

// Mock Recharts to avoid layout issues in JSDOM
jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: any) => <div style={{ width: '100%', height: '100%' }}>{children}</div>,
    RadarChart: ({ children }: any) => <svg>{children}</svg>,
    PolarGrid: () => <g />,
    PolarAngleAxis: () => <g />,
    PolarRadiusAxis: () => <g />,
    Radar: () => <path />,
    Legend: () => <div />,
    LineChart: ({ children }: any) => <svg>{children}</svg>,
    Line: () => <g />,
    XAxis: () => <g />,
    YAxis: () => <g />,
    CartesianGrid: () => <g />,
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

// Mock fetch
window.fetch = jest.fn().mockImplementation(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve([]),
  })
);

describe('AptCompareModal', () => {
  const mockSheetApartments = {
    '청계동': [
      { name: '동탄역더샵센트럴시티', dong: '청계동', brand: '더샵', householdCount: 1400, yearBuilt: '2015' }
    ],
    '반송동': [
      { name: '시범다은삼성래미안', dong: '반송동', brand: '삼성래미안', householdCount: 1000, yearBuilt: '2007' }
    ]
  };

  const mockTxSummaryData = {
    '동탄역더샵센트럴시티': {
      avg3MPrice: 125000,
      avg3MRentDeposit: 65000,
      dong: '청계동'
    },
    '시범다은삼성래미안': {
      avg3MPrice: 65000,
      avg3MRentDeposit: 42000,
      dong: '반송동'
    }
  };

  const mockNameMapping = {};
  const mockFieldReportsMap = new Map();
  // Mock field reports to return correct metrics for Apt1 and Apt2
  mockFieldReportsMap.set('동탄역더샵센트럴시티', {
    metrics: {
      brand: '더샵',
      householdCount: 1400,
      parkingPerHousehold: 1.4,
      yearBuilt: 2015,
      distanceToSubway: 500,
      distanceToElementary: 200,
      distanceToMiddle: 400,
      distanceToHigh: 600,
      distanceToPark: 300,
      distanceToStarbucks: 400,
      distanceToOliveYoung: 300,
      distanceToIndeokwon: 1500,
      distanceToTram: 500,
    }
  });
  mockFieldReportsMap.set('시범다은삼성래미안', {
    metrics: {
      brand: '삼성래미안',
      householdCount: 1000,
      parkingPerHousehold: 1.1,
      yearBuilt: 2007,
      distanceToSubway: 2000,
      distanceToElementary: 450,
      distanceToMiddle: 800,
      distanceToHigh: 1000,
      distanceToPark: 600,
      distanceToStarbucks: 1000,
      distanceToOliveYoung: 800,
      distanceToIndeokwon: 2500,
      distanceToTram: 1200,
    }
  });

  const mockTypeMap = {};
  const mockLocationScores = {};
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(mockLocalStorageStore).forEach(key => delete mockLocalStorageStore[key]);
  });

  it('renders correctly when open', () => {
    render(
      <AptCompareModal
        isOpen={true}
        onClose={mockOnClose}
        sheetApartments={mockSheetApartments as any}
        txSummaryData={mockTxSummaryData as any}
        nameMapping={mockNameMapping}
        fieldReportsMap={mockFieldReportsMap}
        typeMap={mockTypeMap}
        locationScores={mockLocationScores}
      />
    );

    expect(screen.getByText('1:1 아파트 단지 비교 분석기')).toBeInTheDocument();
  });

  it('calculates AI Fit Scorecard and renders Winner Badge based on quiz answers', async () => {
    // Set quiz preferences where transit is gtx, family is elementary, lifestyle is nature
    mockLocalStorageStore['drive_quiz_answers'] = JSON.stringify({
      budget: '12eok',
      family: 'elementary',
      transit: 'gtx',
      lifestyle: 'nature',
    });

    render(
      <AptCompareModal
        isOpen={true}
        onClose={mockOnClose}
        sheetApartments={mockSheetApartments as any}
        txSummaryData={mockTxSummaryData as any}
        nameMapping={mockNameMapping}
        fieldReportsMap={mockFieldReportsMap}
        typeMap={mockTypeMap}
        locationScores={mockLocationScores}
      />
    );

    // Type and select Apartment 1 inside act
    await act(async () => {
      const input1 = screen.getByPlaceholderText('1번 단지 검색...');
      fireEvent.focus(input1);
      fireEvent.change(input1, { target: { value: '더샵' } });
    });
    
    await act(async () => {
      const option1 = screen.getByText('동탄역더샵센트럴시티');
      fireEvent.click(option1);
    });

    // Type and select Apartment 2 inside act
    await act(async () => {
      const input2 = screen.getByPlaceholderText('2번 단지 검색...');
      fireEvent.focus(input2);
      fireEvent.change(input2, { target: { value: '삼성' } });
    });
    
    await act(async () => {
      const option2 = screen.getByText('시범다은삼성래미안');
      fireEvent.click(option2);
    });

    // AI Fit Scorecard check:
    // Apt1 has distanceToSubway (500m < 2000m) -> +30 points
    // Apt1 has distanceToElementary (200m < 450m) -> +25 points
    // Apt1 has distanceToPark (300m < 600m) -> +15 points (from family) + 30 points (from lifestyle = nature) -> +45 points
    // Total: Apt1 gets 100 points. Apt2 gets 0 points.
    // Apt1 should be the AI Winner
    expect(screen.getByText('AI 맞춤 위너')).toBeInTheDocument();
    expect(screen.getByText('AI 적합도 100점')).toBeInTheDocument();
    expect(screen.getByText('AI 적합도 0점')).toBeInTheDocument();

    // Verify highlighted rows by looking for bg-emerald-500/10 classes
    // GTX-A row (transit is gtx)
    const gtxRow = screen.getByText('GTX-A / SRT역 거리').closest('.grid');
    expect(gtxRow).toHaveClass('bg-emerald-500/10');

    // Elementary row (family is elementary)
    const elemRow = screen.getByText('초등학교 도보 통학 거리').closest('.grid');
    expect(elemRow).toHaveClass('bg-emerald-500/10');

    // Park row (lifestyle is nature)
    const parkRow = screen.getByText('공원 도보 거리').closest('.grid');
    expect(parkRow).toHaveClass('bg-emerald-500/10');
  });
});
