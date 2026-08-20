import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import AptCompareModal from './AptCompareModal';

// Mock Recharts to avoid layout / DOM measurement issues in JSDOM
jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: any) => <div style={{ width: '100%', height: '100%' }}>{children}</div>,
    RadarChart: ({ children }: any) => <svg data-testid="radar-chart">{children}</svg>,
    PolarGrid: () => <g />,
    PolarAngleAxis: () => <g />,
    PolarRadiusAxis: () => <g />,
    Radar: () => <path />,
    Legend: () => <div />,
    LineChart: ({ children }: any) => <svg data-testid="line-chart">{children}</svg>,
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
      Object.keys(mockLocalStorageStore).forEach((key) => delete mockLocalStorageStore[key]);
    }),
  },
  writable: true,
});

describe('Adversarial & Stress Tests: AptCompareModal', () => {
  const mockSheetApartments = {
    청계동: [
      { name: '동탄역더샵센트럴시티', dong: '청계동', brand: '더샵', householdCount: 1400, yearBuilt: '2015' },
    ],
    반송동: [
      { name: '시범다은삼성래미안', dong: '반송동', brand: '삼성래미안', householdCount: 1000, yearBuilt: '2007' },
    ],
    산척동: [
      { name: '동탄레이크자연앤푸르지오', dong: '산척동' }, // missing brand, householdCount, yearBuilt
    ],
  };

  const mockTxSummaryData = {
    동탄역더샵센트럴시티: {
      avg3MPrice: 125000,
      avg3MRentDeposit: 65000,
      dong: '청계동',
    },
    시범다은삼성래미안: {
      avg3MPrice: 65000,
      avg3MRentDeposit: 42000,
      dong: '반송동',
    },
  };

  const mockFieldReportsMap = new Map();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(mockLocalStorageStore).forEach((key) => delete mockLocalStorageStore[key]);
    window.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      })
    );
  });

  it('Scenario 1: 1 apartment selected (apt1 only, apt2 empty) displays placeholder without crash', async () => {
    render(
      <AptCompareModal
        isOpen={true}
        onClose={mockOnClose}
        initialAptName="동탄역더샵센트럴시티"
        sheetApartments={mockSheetApartments as any}
        txSummaryData={mockTxSummaryData as any}
        nameMapping={{}}
        fieldReportsMap={mockFieldReportsMap}
        typeMap={{}}
      />
    );

    // Initial apartment 1 is set, but apt2 is not selected
    expect(screen.getByText('비교할 단지를 모두 선택해주세요')).toBeInTheDocument();
    expect(screen.queryByText('1:1 지표 매트릭스 비교')).not.toBeInTheDocument();
  });

  it('Scenario 2: Identical apartments selected (apt1 === apt2) results in tie verdict and clean rendering', async () => {
    render(
      <AptCompareModal
        isOpen={true}
        onClose={mockOnClose}
        sheetApartments={mockSheetApartments as any}
        txSummaryData={mockTxSummaryData as any}
        nameMapping={{}}
        fieldReportsMap={mockFieldReportsMap}
        typeMap={{}}
      />
    );

    // Select apt1: 동탄역더샵센트럴시티
    await act(async () => {
      const input1 = screen.getByPlaceholderText('1번 단지 검색...');
      fireEvent.focus(input1);
      fireEvent.change(input1, { target: { value: '더샵' } });
    });
    await act(async () => {
      const option1 = screen.getByText('동탄역더샵센트럴시티');
      fireEvent.click(option1);
    });

    // Select apt2: same apartment (동탄역더샵센트럴시티)
    await act(async () => {
      const input2 = screen.getByPlaceholderText('2번 단지 검색...');
      fireEvent.focus(input2);
      fireEvent.change(input2, { target: { value: '더샵' } });
    });
    await act(async () => {
      const options = screen.getAllByText('동탄역더샵센트럴시티');
      fireEvent.click(options[options.length - 1]);
    });

    // When both are identical, score is 0 vs 0 and tie text is rendered
    expect(screen.getByText('두 단지가 팽팽한 균형을 이룹니다.')).toBeInTheDocument();
    expect(screen.getByText('1:1 지표 매트릭스 비교')).toBeInTheDocument();
  });

  it('Scenario 3: Apartment with missing specs (no household, yearBuilt, or report) gracefully falls back', async () => {
    render(
      <AptCompareModal
        isOpen={true}
        onClose={mockOnClose}
        sheetApartments={mockSheetApartments as any}
        txSummaryData={mockTxSummaryData as any}
        nameMapping={{}}
        fieldReportsMap={mockFieldReportsMap}
        typeMap={{}}
      />
    );

    // Select apt1: 동탄역더샵센트럴시티 (complete)
    await act(async () => {
      const input1 = screen.getByPlaceholderText('1번 단지 검색...');
      fireEvent.focus(input1);
      fireEvent.change(input1, { target: { value: '더샵' } });
    });
    await act(async () => {
      fireEvent.click(screen.getByText('동탄역더샵센트럴시티'));
    });

    // Select apt2: 동탄레이크자연앤푸르지오 (missing specs)
    await act(async () => {
      const input2 = screen.getByPlaceholderText('2번 단지 검색...');
      fireEvent.focus(input2);
      fireEvent.change(input2, { target: { value: '푸르지오' } });
    });
    await act(async () => {
      fireEvent.click(screen.getByText('동탄레이크자연앤푸르지오'));
    });

    // Should render successfully with fallback defaults (e.g. 800세대, 2018년)
    expect(screen.getByText('1:1 지표 매트릭스 비교')).toBeInTheDocument();
    expect(screen.getByText(/단지가 최종 우세합니다/)).toBeInTheDocument();
  });

  it('Scenario 4: Missing or failed transaction data shows empty state gracefully', async () => {
    // Mock fetch failure (e.g. 404 or network abort)
    window.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: false,
        status: 404,
      })
    );

    render(
      <AptCompareModal
        isOpen={true}
        onClose={mockOnClose}
        sheetApartments={mockSheetApartments as any}
        txSummaryData={mockTxSummaryData as any}
        nameMapping={{}}
        fieldReportsMap={mockFieldReportsMap}
        typeMap={{}}
      />
    );

    await act(async () => {
      const input1 = screen.getByPlaceholderText('1번 단지 검색...');
      fireEvent.focus(input1);
      fireEvent.change(input1, { target: { value: '더샵' } });
    });
    await act(async () => {
      fireEvent.click(screen.getByText('동탄역더샵센트럴시티'));
    });

    await act(async () => {
      const input2 = screen.getByPlaceholderText('2번 단지 검색...');
      fireEvent.focus(input2);
      fireEvent.change(input2, { target: { value: '삼성' } });
    });
    await act(async () => {
      fireEvent.click(screen.getByText('시범다은삼성래미안'));
    });

    // Transactions failed to load -> empty notice should be displayed
    expect(screen.getByText('시계열 거래 정보가 없습니다.')).toBeInTheDocument();
  });
});
