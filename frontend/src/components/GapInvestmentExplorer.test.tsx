import { render, screen, fireEvent } from '@testing-library/react';
import GapInvestmentExplorer from './GapInvestmentExplorer';

jest.mock('@/components/ui/NativeAdPlaceholder', () => ({
  NativeAdPlaceholder: () => <div data-testid="native-ad-placeholder">Ad</div>
}));

describe('GapInvestmentExplorer', () => {
  const mockSheetApartments = {
    '청계동': [
      { name: '시범우남퍼스트빌', dong: '청계동', householdCount: 1400 },
      { name: '동탄역린스트라우스', dong: '청계동', householdCount: 600 }
    ],
    '영천동': [
      { name: '동탄반도유보라3.0', dong: '영천동', householdCount: 1000 },
      { name: '동탄센트럴자이', dong: '영천동', householdCount: 200 }
    ]
  };

  const mockTxSummaryData = {
    '시범우남퍼스트빌': {
      avg3MPrice: 80000,
      avg3MRentDeposit: 56000,
      avg3MTxCount: 8,
      avg3MPerPyeong: 2400,
      dong: '청계동'
    },
    '동탄역린스트라우스': {
      avg3MPrice: 90000,
      avg3MRentDeposit: 54000,
      avg3MTxCount: 4,
      avg3MPerPyeong: 2700,
      dong: '청계동'
    },
    '동탄반도유보라3.0': {
      avg3MPrice: 60000,
      avg3MRentDeposit: 45000,
      avg3MTxCount: 12,
      avg3MPerPyeong: 1800,
      dong: '영천동'
    },
    '동탄센트럴자이': {
      avg3MPrice: 50000,
      avg3MRentDeposit: 42000,
      avg3MTxCount: 1,
      avg3MPerPyeong: 1500,
      dong: '영천동'
    }
  };

  const mockNameMapping = {};
  const mockPublicRentalSet = new Set<string>();
  const mockOnSelectApt = jest.fn();
  const mockOnOpenAdModal = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', '/');
    }
  });

  it('renders title and analytics board metrics correctly', () => {
    render(
      <GapInvestmentExplorer
        sheetApartments={mockSheetApartments}
        txSummaryData={mockTxSummaryData as any}
        nameMapping={mockNameMapping}
        publicRentalSet={mockPublicRentalSet}
        onSelectApt={mockOnSelectApt}
        onOpenAdModal={mockOnOpenAdModal}
      />
    );

    // Check header
    expect(screen.getByText('갭투자 큐레이션')).toBeInTheDocument();

    // Check Analytics board stats
    // Average Jeonse Rate: (70+60+75+84)/4 = 72%
    expect(screen.getByText('72%')).toBeInTheDocument();
    
    // Low Gap Complexes count (gap <= 1.5억): 2개
    expect(screen.getByText('2개')).toBeInTheDocument();

    // High Jeonse Rate Complexes ratio (ratio >= 0.7): 3 complexes (75%)
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('filters complexes by Dong selection', () => {
    render(
      <GapInvestmentExplorer
        sheetApartments={mockSheetApartments}
        txSummaryData={mockTxSummaryData as any}
        nameMapping={mockNameMapping}
        publicRentalSet={mockPublicRentalSet}
        onSelectApt={mockOnSelectApt}
        onOpenAdModal={mockOnOpenAdModal}
      />
    );

    // Select '영천동' in dong filter
    const dongSelect = screen.getByLabelText('행정동 필터');
    fireEvent.change(dongSelect, { target: { value: '영천동' } });

    // Under default maxGap (20000), only 영천동 complexes match (동탄반도유보라3.0 and 동탄센트럴자이)
    const cardNames = screen.getAllByTestId('complex-name').map(el => el.textContent);
    expect(cardNames).toContain('동탄반도유보라3.0');
    expect(cardNames).toContain('동탄센트럴자이');
    expect(cardNames).not.toContain('시범우남퍼스트빌');
  });

  it('filters complexes by Minimum Jeonse Rate', () => {
    render(
      <GapInvestmentExplorer
        sheetApartments={mockSheetApartments}
        txSummaryData={mockTxSummaryData as any}
        nameMapping={mockNameMapping}
        publicRentalSet={mockPublicRentalSet}
        onSelectApt={mockOnSelectApt}
        onOpenAdModal={mockOnOpenAdModal}
      />
    );

    // Select '80% 이상' in jeonse filter
    const jeonseSelect = screen.getByLabelText('최소 전세가율');
    fireEvent.change(jeonseSelect, { target: { value: '80' } });

    // Only 동탄센트럴자이 has ratio >= 80% (84%)
    const cardNames = screen.getAllByTestId('complex-name').map(el => el.textContent);
    expect(cardNames).toContain('동탄센트럴자이');
    expect(cardNames).not.toContain('동탄반도유보라3.0');
    expect(cardNames).not.toContain('시범우남퍼스트빌');
  });

  it('sorts complexes according to Sort selection', () => {
    render(
      <GapInvestmentExplorer
        sheetApartments={mockSheetApartments}
        txSummaryData={mockTxSummaryData as any}
        nameMapping={mockNameMapping}
        publicRentalSet={mockPublicRentalSet}
        onSelectApt={mockOnSelectApt}
        onOpenAdModal={mockOnOpenAdModal}
      />
    );

    // Set sorting to gapAsc (필요 투자금 낮은 순)
    const sortSelect = screen.getByLabelText('정렬 기준');
    fireEvent.change(sortSelect, { target: { value: 'gapAsc' } });

    // Under default maxGap (20000), expected order is:
    // 1. 동탄센트럴자이 (8000)
    // 2. 동탄반도유보라3.0 (15000)
    const cardNames = screen.getAllByTestId('complex-name').map(el => el.textContent);
    expect(cardNames[0]).toBe('동탄센트럴자이');
    expect(cardNames[1]).toBe('동탄반도유보라3.0');
  });

  it('expands risk diagnosis when clicked', () => {
    render(
      <GapInvestmentExplorer
        sheetApartments={mockSheetApartments}
        txSummaryData={mockTxSummaryData as any}
        nameMapping={mockNameMapping}
        publicRentalSet={mockPublicRentalSet}
        onSelectApt={mockOnSelectApt}
        onOpenAdModal={mockOnOpenAdModal}
      />
    );

    // Default view shows:
    // 1. 동탄반도유보라3.0 (index 0)
    // 2. 동탄센트럴자이 (index 1)
    
    // Click on 3대 리스크 진단 button for '동탄센트럴자이' (index 1)
    const buttons = screen.getAllByTestId('risk-btn');
    fireEvent.click(buttons[1]);

    // Check if the detailed risk explanations are displayed
    expect(screen.getByText(/보증금 미반환 위험/)).toBeInTheDocument(); // For 동탄센트럴자이 (ratio 84% >= 80% -> 위험)
    expect(screen.getByText(/최근 3개월 실거래가 2건 이하/)).toBeInTheDocument(); // For 동탄센트럴자이 (txCount 1 <= 2 -> 높음)
    expect(screen.getByText(/300세대 미만 소단지/)).toBeInTheDocument(); // For 동탄센트럴자이 (householdCount 200 < 300 -> 높음)
  });
});
