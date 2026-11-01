import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MacroChartSection } from './MacroChartSection';
import { clearRecentApartments, addRecentApartment, getRecentApartments } from '@/lib/utils/recentApartments';

describe('MacroChartSection Test Suite', () => {
  const mockDefaultApts = [
    '동탄역 롯데캐슬',
    '동탄역 시범 우남퍼스트빌',
    '동탄역 시범 더샵 센트럴시티',
    '동탄역 시범 한화꿈에그린 프레스티지',
  ];

  const mockSheetApartments = {
    '청계동': [
      { name: '동탄역 시범 더샵 센트럴시티', dong: '청계동' },
      { name: '동탄역 시범 우남퍼스트빌', dong: '청계동' },
      { name: '동탄역 시범 한화꿈에그린 프레스티지', dong: '청계동' },
    ],
    '오산동': [
      { name: '동탄역 롯데캐슬', dong: '오산동' },
      { name: '동탄역 린스트라우스', dong: '오산동' },
    ],
    '영천동': [
      { name: '동탄역 푸르지오', dong: '영천동' },
      { name: '힐스테이트 동탄역', dong: '영천동', txKey: '힐스테이트동탄역' },
    ],
  };

  const mockTxSummaryData = {
    동탄역롯데캐슬: {
      dong: '오산동',
      latestPrice: 162000,
    },
    힐스테이트동탄역: {
      dong: '영천동',
      latestPrice: 98000,
    },
    동탄역린스트라우스: {
      dong: '오산동',
      latestPrice: 115000,
    },
  };

  const defaultProps = {
    isDefaultAptSettingUp: false,
    mounted: true,
    selectedTimelineApt: '동탄역 롯데캐슬',
    setSelectedTimelineApt: jest.fn(),
    preloadApartmentModal: jest.fn(),
    defaultTimelineApts: mockDefaultApts,
    sheetApartments: mockSheetApartments as any,
    txSummaryData: mockTxSummaryData as any,
    onSelectApt: jest.fn(),
    onHoverApt: jest.fn(),
    timeframe: '3Y' as const,
    setTimeframe: jest.fn(),
    isAptTxLoading: false,
    aptRealTxData: [{ contractYm: '202603', price: 160000 }],
    mainLineData: [{ name: '26.03', '동탄 아파트 전체': 16.0 }],
    mainXTicks: ['26.03'],
    mainYTicks: [10, 15, 20],
    renderChart: () => <div data-testid="mock-chart">차트 렌더링 영역</div>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    clearRecentApartments();
    localStorage.removeItem('dview_guest_favorites');
  });

  it('renders title, detail button, timeframe, and chart properly', () => {
    render(<MacroChartSection {...defaultProps} />);

    expect(screen.getByText('동탄역 롯데캐슬 시세 추이')).toBeInTheDocument();
    expect(screen.getByTestId('chart-header-detail-cta')).toHaveTextContent('상세 리포트 보기');
    expect(screen.getByTestId('mock-chart')).toBeInTheDocument();
    expect(screen.getByText('3Y')).toBeInTheDocument();
  });

  it('shows recent apartments and representative recommendations when search input is focused', () => {
    addRecentApartment({ name: '동탄역 린스트라우스', dong: '오산동' });

    render(<MacroChartSection {...defaultProps} />);

    const searchInput = screen.getByLabelText('단지명 실시간 검색');
    fireEvent.focus(searchInput);

    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByText('최근 조회한 단지')).toBeInTheDocument();
    expect(screen.getByText('동탄 대표 단지')).toBeInTheDocument();
    expect(screen.getAllByText('동탄역 린스트라우스').length).toBeGreaterThan(0);
    expect(screen.getAllByText('11억 5,000만').length).toBeGreaterThan(0);
  });

  it('opens autocomplete results immediately on typing, supporting reversed word order, chosung, dong tags, and real prices', () => {
    render(<MacroChartSection {...defaultProps} />);

    const searchInput = screen.getByLabelText('단지명 실시간 검색');

    // Reversed word order: "동탄역 힐스테이트" -> matches "힐스테이트 동탄역"
    fireEvent.change(searchInput, { target: { value: '동탄역 힐스테이트' } });

    const listbox = screen.getByRole('listbox');
    expect(listbox).toBeInTheDocument();
    expect(listbox).toHaveTextContent('힐스테이트 동탄역');
    expect(listbox).toHaveTextContent('영천동');
    expect(listbox).toHaveTextContent('9억 8,000만');

    // Chosung query: "ㅎㅅㅌㅇㅌ"
    fireEvent.change(searchInput, { target: { value: 'ㅎㅅㅌㅇㅌ' } });
    expect(screen.getByRole('listbox')).toHaveTextContent('힐스테이트 동탄역');

    // Clear search button
    const clearBtn = screen.getByLabelText('검색어 지우기');
    fireEvent.click(clearBtn);
    expect(searchInput).toHaveValue('');
  });

  it('selects the top matching apartment immediately on pressing Enter after typing', () => {
    render(<MacroChartSection {...defaultProps} />);

    const searchInput = screen.getByLabelText('단지명 실시간 검색');
    fireEvent.change(searchInput, { target: { value: '힐스테이트 동탄역' } });
    fireEvent.keyDown(searchInput, { key: 'Enter' });

    expect(defaultProps.setSelectedTimelineApt).toHaveBeenCalledWith('힐스테이트 동탄역');
    expect(getRecentApartments()[0]?.name).toBe('힐스테이트 동탄역');
  });

  it('invokes setSelectedTimelineApt when an apartment option is clicked in the combobox dropdown', () => {
    render(<MacroChartSection {...defaultProps} />);

    const searchInput = screen.getByLabelText('단지명 실시간 검색');
    fireEvent.change(searchInput, { target: { value: '린스트라우스' } });

    const option = screen.getByRole('option', { name: /동탄역 린스트라우스/i });
    fireEvent.click(option);

    expect(defaultProps.setSelectedTimelineApt).toHaveBeenCalledWith('동탄역 린스트라우스');
  });

  it('invokes setSelectedTimelineApt(null) when "전체 추이 보기" option is selected', () => {
    render(<MacroChartSection {...defaultProps} />);

    const searchInput = screen.getByLabelText('단지명 실시간 검색');
    fireEvent.focus(searchInput);

    const macroAllOption = screen.getByTestId('combobox-option-macro-all');
    fireEvent.click(macroAllOption);

    expect(defaultProps.setSelectedTimelineApt).toHaveBeenCalledWith(null);
  });

  it('filters browsing list by dong when dong select is changed, while still finding cross-dong apartments when searched', () => {
    render(<MacroChartSection {...defaultProps} />);

    const dongSelect = screen.getByLabelText('아파트 지역 필터 선택');
    fireEvent.change(dongSelect, { target: { value: '청계동' } });

    const searchInput = screen.getByLabelText('단지명 실시간 검색');
    fireEvent.focus(searchInput);

    expect(screen.getByRole('listbox')).toHaveTextContent('동탄역 시범 더샵 센트럴시티');

    // Even when 청계동 is selected, typing "힐스테이트 동탄역" (영천동) still finds it instead of dead-ending
    fireEvent.change(searchInput, { target: { value: '힐스테이트 동탄역' } });
    expect(screen.getByRole('listbox')).toHaveTextContent('힐스테이트 동탄역');
  });

  it('invokes onSelectApt with apartment name and dong when detail button is clicked', () => {
    render(<MacroChartSection {...defaultProps} />);

    const detailBtn = screen.getByTestId('chart-header-detail-cta');
    fireEvent.click(detailBtn);

    expect(defaultProps.onSelectApt).toHaveBeenCalledWith('동탄역 롯데캐슬', '오산동');
  });

  it('invokes setTimeframe when a timeframe button is clicked', () => {
    render(<MacroChartSection {...defaultProps} />);

    const oneYearBtn = screen.getByText('1Y');
    fireEvent.click(oneYearBtn);

    expect(defaultProps.setTimeframe).toHaveBeenCalledWith('1Y');
  });

  it('does not render duplicate mortgage CTA button in chart header when onOpenMortgageModal is omitted', () => {
    render(<MacroChartSection {...defaultProps} />);
    expect(screen.queryByTestId('chart-header-mortgage-cta')).not.toBeInTheDocument();
  });

  it('toggles favorite state from chart header button and persists to localStorage', () => {
    render(<MacroChartSection {...defaultProps} />);

    const favCta = screen.getByTestId('chart-header-favorite-cta');
    expect(favCta).toHaveTextContent('관심단지');
    expect(favCta).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(favCta);

    expect(favCta).toHaveTextContent('관심단지 저장됨');
    expect(favCta).toHaveAttribute('aria-pressed', 'true');
    expect(JSON.parse(localStorage.getItem('dview_guest_favorites') || '[]')).toContain(
      '동탄역 롯데캐슬'
    );

    // Clicking again removes it
    fireEvent.click(favCta);
    expect(favCta).toHaveTextContent('관심단지');
    expect(favCta).toHaveAttribute('aria-pressed', 'false');
  });

  it('allows starring an apartment directly inside the search combobox and surfaces 내 관심단지 section', () => {
    render(<MacroChartSection {...defaultProps} />);

    const searchInput = screen.getByLabelText('단지명 실시간 검색');
    fireEvent.change(searchInput, { target: { value: '힐스테이트' } });

    const comboboxStarBtn = screen.getByTestId('combobox-fav-toggle-힐스테이트 동탄역');
    fireEvent.click(comboboxStarBtn);

    // Dropdown stays open and localStorage saves the apartment
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('dview_guest_favorites') || '[]')).toContain(
      '힐스테이트 동탄역'
    );

    // Clearing search query reveals "내 관심단지 (1)" group at the top of the combobox
    fireEvent.change(searchInput, { target: { value: '' } });
    expect(screen.getByText('내 관심단지 (1)')).toBeInTheDocument();
  });
});
