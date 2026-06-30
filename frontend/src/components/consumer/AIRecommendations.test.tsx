import { render, screen, fireEvent, act } from '@testing-library/react';
import AIRecommendations from './AIRecommendations';

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

describe('AIRecommendations', () => {
  const mockSheetApartments = {
    '청계동': [
      { name: '동탄역더샵센트럴시티', dong: '청계동', householdCount: 1400, yearBuilt: '2015' },
      { name: '동탄역시범우남퍼스트빌', dong: '청계동', householdCount: 1400, yearBuilt: '2015' }
    ],
    '송동': [
      { name: '동탄호수공원하우스디더레이크', dong: '송동', householdCount: 1550, yearBuilt: '2018' },
      { name: '동탄호수공원자이더테라스', dong: '송동', householdCount: 500, yearBuilt: '2018' }
    ]
  };

  const mockTxSummaryData = {
    '동탄역더샵센트럴시티': {
      avg3MPrice: 125000,
      avg3MRentDeposit: 65000,
      dong: '청계동'
    },
    '동탄역시범우남퍼스트빌': {
      avg3MPrice: 105000,
      avg3MRentDeposit: 55000,
      dong: '청계동'
    },
    '동탄호수공원하우스디더레이크': {
      avg3MPrice: 65000,
      avg3MRentDeposit: 45000,
      dong: '송동'
    },
    '동탄호수공원자이더테라스': {
      avg3MPrice: 85000,
      avg3MRentDeposit: 50000,
      dong: '송동'
    }
  };

  const mockFieldReportsMap = new Map();
  const mockPublicRentalSet = new Set<string>();
  const mockUserFavorites = new Set<string>();
  const mockOnSelectApt = jest.fn();
  const mockOnOpenTaxCalculator = jest.fn();
  const mockOnOpenMortgage = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(mockLocalStorageStore).forEach(key => delete mockLocalStorageStore[key]);
  });

  it('renders fallback popular apartments when history and quiz are empty', () => {
    render(
      <AIRecommendations
        sheetApartments={mockSheetApartments as any}
        txSummaryData={mockTxSummaryData as any}
        publicRentalSet={mockPublicRentalSet}
        fieldReportsMap={mockFieldReportsMap}
        userFavorites={mockUserFavorites}
        onSelectApt={mockOnSelectApt}
        onOpenTaxCalculator={mockOnOpenTaxCalculator}
        onOpenMortgage={mockOnOpenMortgage}
      />
    );

    // Check title and popular status badge
    expect(screen.getByText('AI 맞춤 아파트 추천')).toBeInTheDocument();
    expect(screen.getByText('인기단지')).toBeInTheDocument();

    // Check fallback complexes rendering
    expect(screen.getByText('동탄역더샵센트럴시티')).toBeInTheDocument();
    expect(screen.getByText('동탄역시범우남퍼스트빌')).toBeInTheDocument();
    expect(screen.getByText('동탄호수공원하우스디더레이크')).toBeInTheDocument();

    // Check fallback banner text
    expect(screen.getByText('나만의 라이프스타일 퀴즈 풀기')).toBeInTheDocument();
    expect(screen.getByText('7가지 질문에 답하고 내 맞춤형 아파트를 찾아보세요')).toBeInTheDocument();
  });

  it('renders quiz-based recommendations when quiz answers exist but history is empty', () => {
    // Set mock quiz answers in localStorage (Budget: 5억대)
    mockLocalStorageStore['drive_quiz_answers'] = JSON.stringify({
      budget: '5eok',
      family: 'elementary',
      transit: 'tram',
      lifestyle: 'nature',
      scaleBrand: 'mega',
      yearBuilt: 'middle',
      investmentStyle: 'gap',
    });

    render(
      <AIRecommendations
        sheetApartments={mockSheetApartments as any}
        txSummaryData={mockTxSummaryData as any}
        publicRentalSet={mockPublicRentalSet}
        fieldReportsMap={mockFieldReportsMap}
        userFavorites={mockUserFavorites}
        onSelectApt={mockOnSelectApt}
        onOpenTaxCalculator={mockOnOpenTaxCalculator}
        onOpenMortgage={mockOnOpenMortgage}
      />
    );

    // Badge should change to '퀴즈분석'
    expect(screen.getByText('퀴즈분석')).toBeInTheDocument();
    expect(screen.getByText('라이프스타일 퀴즈 결과를 분석하여 매칭된 단지입니다')).toBeInTheDocument();

    // With 5억 budget, 동탄호수공원하우스디더레이크 (6억 5천)가 다른 10억대 단지보다 더 맞춤 매치될 것임
    // Check if suggested complex reason is adapted for budget/family
    expect(screen.getByText('동탄호수공원하우스디더레이크')).toBeInTheDocument();

    // Banner should suggest mortgage calculation since we now have recommended complexes
    expect(screen.getByText(/최적 대출 한도 조회/)).toBeInTheDocument();
  });

  it('renders history-based recommendations when viewed history exists but quiz is empty', () => {
    // Set mock viewed history in localStorage
    mockLocalStorageStore['dview_viewed_apts'] = JSON.stringify(['동탄역더샵센트럴시티']);

    render(
      <AIRecommendations
        sheetApartments={mockSheetApartments as any}
        txSummaryData={mockTxSummaryData as any}
        publicRentalSet={mockPublicRentalSet}
        fieldReportsMap={mockFieldReportsMap}
        userFavorites={mockUserFavorites}
        onSelectApt={mockOnSelectApt}
        onOpenTaxCalculator={mockOnOpenTaxCalculator}
        onOpenMortgage={mockOnOpenMortgage}
      />
    );

    // Badge should be '조회분석'
    expect(screen.getByText('조회분석')).toBeInTheDocument();
    expect(screen.getByText('최근 조회 및 즐겨찾기 이력을 분석하여 추출한 최적의 단지입니다')).toBeInTheDocument();
  });

  it('renders hybrid recommendations when both viewed history and quiz exist', () => {
    // Set both
    mockLocalStorageStore['dview_viewed_apts'] = JSON.stringify(['동탄역더샵센트럴시티']);
    mockLocalStorageStore['drive_quiz_answers'] = JSON.stringify({
      budget: '8eok',
      family: 'elementary',
      transit: 'gtx',
      lifestyle: 'nature',
      scaleBrand: 'brand',
      yearBuilt: 'middle',
      investmentStyle: 'value',
    });

    render(
      <AIRecommendations
        sheetApartments={mockSheetApartments as any}
        txSummaryData={mockTxSummaryData as any}
        publicRentalSet={mockPublicRentalSet}
        fieldReportsMap={mockFieldReportsMap}
        userFavorites={mockUserFavorites}
        onSelectApt={mockOnSelectApt}
        onOpenTaxCalculator={mockOnOpenTaxCalculator}
        onOpenMortgage={mockOnOpenMortgage}
      />
    );

    // Badge should be '하이브리드'
    expect(screen.getByText('하이브리드')).toBeInTheDocument();
    expect(screen.getByText('최근 조회 이력과 라이프스타일 퀴즈 결과를 종합 분석한 단지입니다')).toBeInTheDocument();
  });

  it('updates state dynamically on drive_quiz_answers_changed window event', () => {
    render(
      <AIRecommendations
        sheetApartments={mockSheetApartments as any}
        txSummaryData={mockTxSummaryData as any}
        publicRentalSet={mockPublicRentalSet}
        fieldReportsMap={mockFieldReportsMap}
        userFavorites={mockUserFavorites}
        onSelectApt={mockOnSelectApt}
        onOpenTaxCalculator={mockOnOpenTaxCalculator}
        onOpenMortgage={mockOnOpenMortgage}
      />
    );

    // Initially fallback popular
    expect(screen.getByText('인기단지')).toBeInTheDocument();

    // Programmatically simulate quiz complete by setting localStorage and dispatching event
    act(() => {
      mockLocalStorageStore['drive_quiz_answers'] = JSON.stringify({
        budget: '5eok',
        family: 'elementary',
        transit: 'tram',
        lifestyle: 'nature',
        scaleBrand: 'mega',
        yearBuilt: 'middle',
        investmentStyle: 'gap',
      });
      window.dispatchEvent(new Event('drive_quiz_answers_changed'));
    });

    // Rerender and expect state update
    expect(screen.getByText('퀴즈분석')).toBeInTheDocument();
  });

  it('penalizes high-risk jeonse complexes when user selects gap investment style', () => {
    // Set quiz answers in localStorage with gap investment style
    mockLocalStorageStore['drive_quiz_answers'] = JSON.stringify({
      budget: '8eok',
      family: 'elementary',
      transit: 'gtx',
      lifestyle: 'nature',
      scaleBrand: 'brand',
      yearBuilt: 'middle',
      investmentStyle: 'gap',
    });

    // Set mock data so that '동탄호수공원자이더테라스' has 80%+ jeonse ratio (e.g. 50000 rent vs 60000 price = 83.3%)
    const customTxSummaryData = {
      ...mockTxSummaryData,
      '동탄호수공원자이더테라스': {
        avg3MPrice: 60000,
        avg3MRentDeposit: 50000, // Ratio: 83.3%
        avg3MTxCount: 1, // Low liquidity penalty too
        dong: '송동'
      }
    };

    render(
      <AIRecommendations
        sheetApartments={mockSheetApartments as any}
        txSummaryData={customTxSummaryData as any}
        publicRentalSet={mockPublicRentalSet}
        fieldReportsMap={mockFieldReportsMap}
        userFavorites={mockUserFavorites}
        onSelectApt={mockOnSelectApt}
        onOpenTaxCalculator={mockOnOpenTaxCalculator}
        onOpenMortgage={mockOnOpenMortgage}
      />
    );

    // Risks badges for '역전세' and '유동성' should exist in the document
    expect(screen.getAllByText('역전세').length).toBeGreaterThan(0);
    expect(screen.getAllByText('유동성').length).toBeGreaterThan(0);
  });
});
