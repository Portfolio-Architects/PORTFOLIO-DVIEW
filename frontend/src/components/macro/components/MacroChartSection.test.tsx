import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MacroChartSection } from './MacroChartSection';

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
    ],
  };

  const defaultProps = {
    isDefaultAptSettingUp: false,
    mounted: true,
    selectedTimelineApt: '동탄역 롯데캐슬',
    setSelectedTimelineApt: jest.fn(),
    preloadApartmentModal: jest.fn(),
    favoritesArray: [],
    defaultTimelineApts: mockDefaultApts,
    sheetApartments: mockSheetApartments as any,
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
    showOrderEditor: false,
    setShowOrderEditor: jest.fn(),
    orderEditorRef: { current: null },
    draggedIndex: null,
    handleDragStart: jest.fn(),
    handleDragOver: jest.fn(),
    handleDragEnd: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders title, detail button, timeframe, and chart properly', () => {
    render(<MacroChartSection {...defaultProps} />);

    // Title reflects current selected apartment
    expect(screen.getByText('동탄역 롯데캐슬 시세 추이')).toBeInTheDocument();

    // Detail button
    expect(screen.getByText('상세 리포트 보기 ➔')).toBeInTheDocument();

    // Chart rendered
    expect(screen.getByTestId('mock-chart')).toBeInTheDocument();

    // Timeframe selector
    expect(screen.getByText('3Y')).toBeInTheDocument();
  });

  it('filters apartments by dong when dong select is changed', () => {
    render(<MacroChartSection {...defaultProps} />);

    const dongSelect = screen.getByLabelText('아파트 지역 필터 선택');
    expect(dongSelect).toBeInTheDocument();

    // Check that dong options are present
    expect(screen.getByRole('option', { name: /청계동/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /오산동/i })).toBeInTheDocument();

    // Switch to 청계동
    fireEvent.change(dongSelect, { target: { value: '청계동' } });

    const aptSelect = screen.getByLabelText('시세 그래프 조회 아파트 선택');
    expect(aptSelect).toBeInTheDocument();

    // Options under 청계동 should be present
    expect(screen.getByRole('option', { name: '동탄역 시범 더샵 센트럴시티' })).toBeInTheDocument();
  });

  it('filters apartments in real-time when searching in the search input', () => {
    render(<MacroChartSection {...defaultProps} />);

    const searchInput = screen.getByLabelText('단지명 실시간 검색');
    fireEvent.change(searchInput, { target: { value: '린스트라우스' } });

    // Option matching 린스트라우스 should be present
    expect(screen.getByRole('option', { name: /린스트라우스/i })).toBeInTheDocument();

    // Clear search button
    const clearBtn = screen.getByLabelText('검색어 지우기');
    fireEvent.click(clearBtn);
    expect(searchInput).toHaveValue('');
  });

  it('invokes setSelectedTimelineApt when a new apartment is selected', () => {
    render(<MacroChartSection {...defaultProps} />);

    const aptSelect = screen.getByLabelText('시세 그래프 조회 아파트 선택');
    fireEvent.change(aptSelect, { target: { value: '동탄역 린스트라우스' } });

    expect(defaultProps.setSelectedTimelineApt).toHaveBeenCalledWith('동탄역 린스트라우스');
  });

  it('invokes setSelectedTimelineApt(null) when "전체 추이 보기" is selected', () => {
    render(<MacroChartSection {...defaultProps} />);

    const aptSelect = screen.getByLabelText('시세 그래프 조회 아파트 선택');
    fireEvent.change(aptSelect, { target: { value: '' } });

    expect(defaultProps.setSelectedTimelineApt).toHaveBeenCalledWith(null);
  });

  it('invokes onSelectApt with apartment name and dong when detail button is clicked', () => {
    render(<MacroChartSection {...defaultProps} />);

    const detailBtn = screen.getByText('상세 리포트 보기 ➔');
    fireEvent.click(detailBtn);

    expect(defaultProps.onSelectApt).toHaveBeenCalledWith('동탄역 롯데캐슬', '오산동');
  });

  it('invokes setTimeframe when a timeframe button is clicked', () => {
    render(<MacroChartSection {...defaultProps} />);

    const oneYearBtn = screen.getByText('1Y');
    fireEvent.click(oneYearBtn);

    expect(defaultProps.setTimeframe).toHaveBeenCalledWith('1Y');
  });

  it('supports user favorites when userFavorites set is provided', () => {
    const userFavorites = new Set(['동탄역 린스트라우스']);
    render(
      <MacroChartSection
        {...defaultProps}
        userFavorites={userFavorites}
        favoritesArray={['동탄역 린스트라우스']}
      />
    );

    const dongSelect = screen.getByLabelText('아파트 지역 필터 선택');
    expect(screen.getByRole('option', { name: /내 관심 단지/i })).toBeInTheDocument();
  });
});
