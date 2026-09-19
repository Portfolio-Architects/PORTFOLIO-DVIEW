import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AptDonutSection, ENERGY_COLORS } from './AptDonutSection';

// Mock Recharts
jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container" style={{ width: '100%', height: '100%' }}>{children}</div>,
    PieChart: ({ children }: any) => <svg data-testid="pie-chart">{children}</svg>,
    Pie: ({ children, onClick, data }: any) => (
      <g data-testid="pie" onClick={() => onClick && data && data[0] && onClick(data[0])}>
        {children}
      </g>
    ),
    Cell: ({ fill, onClick }: any) => <path data-testid="pie-cell" fill={fill} onClick={onClick} />,
    Tooltip: () => <div data-testid="tooltip" />,
  };
});

jest.mock('@/components/common/preload', () => ({
  preloadApartmentModal: jest.fn(),
}));

import { preloadApartmentModal } from '@/components/common/preload';

describe('AptDonutSection Test Suite', () => {
  const mockRecentTransactions = [
    {
      aptName: '동탄역 롯데캐슬',
      txKey: '동탄역롯데캐슬',
      date: '08.18',
      contractDate: '20260818',
      priceVal: 16.5,
      priceEok: '16억 5,000만',
      area: 59.8,
      areaPyeong: 25.1,
      floor: 25,
      isNewHigh: true,
      delta: 0.8,
      deltaPercent: 5.1,
    },
    {
      aptName: '동탄역 시범 우남퍼스트빌',
      txKey: '동탄역시범우남퍼스트빌',
      date: '08.17',
      contractDate: '20260817',
      priceVal: 11.2,
      priceEok: '11억 2,000만',
      area: 84.8,
      areaPyeong: 33.8,
      floor: 18,
      isNewHigh: false,
      delta: 0.4,
      deltaPercent: 3.7,
    },
    {
      aptName: '동탄역 시범 더샵 센트럴시티',
      txKey: '동탄역시범더샵센트럴시티',
      date: '08.16',
      contractDate: '20260816',
      priceVal: 12.0,
      priceEok: '12억',
      area: 98.5,
      areaPyeong: 38.5,
      floor: 12,
      isNewHigh: false,
      delta: 0,
      deltaPercent: 0,
    },
    {
      aptName: '동탄역 시범 한화꿈에그린',
      txKey: '동탄역시범한화꿈에그린',
      date: '08.15',
      contractDate: '20260815',
      priceVal: 11.5,
      priceEok: '11억 5,000만',
      area: 120.5,
      areaPyeong: 46.2,
      floor: 10,
      isNewHigh: false,
      delta: -0.3,
      deltaPercent: -2.5,
    },
  ];

  const mockSummary = {
    '동탄역 롯데캐슬': {
      dong: '오산동',
      avg3MPrice: 16.2,
      avg3MPriceEok: '16억 2,000만',
    },
    '동탄역 시범 우남퍼스트빌': {
      dong: '청계동',
      avg3MPrice: 11.0,
      avg3MPriceEok: '11억',
    },
    '동탄역 시범 더샵 센트럴시티': {
      dong: '청계동',
      avg3MPrice: 12.0,
      avg3MPriceEok: '12억',
    },
    '동탄역 시범 한화꿈에그린': {
      dong: '청계동',
      avg3MPrice: 11.8,
      avg3MPriceEok: '11억 8,000만',
    },
  };

  describe('Pyeong Demand Mode (Default)', () => {
    it('renders pyeong demand tiers by default with exact 100% total percentage sum', () => {
      render(
        <AptDonutSection
          mounted={true}
          recentTransactions={mockRecentTransactions}
          txSummaryData={mockSummary as any}
        />
      );

      // Default mode header
      expect(screen.getByText('실거래 평형대별 수요 분포')).toBeInTheDocument();
      expect(screen.queryByText(/전수 분석/)).not.toBeInTheDocument();

      // 4 pyeong tiers
      expect(screen.getByText('소형 (20평대)')).toBeInTheDocument();
      expect(screen.getByText('59㎡ 이하')).toBeInTheDocument();

      expect(screen.getByText('국민평형 (30평대)')).toBeInTheDocument();
      expect(screen.getByText('84㎡ 주력')).toBeInTheDocument();

      expect(screen.getByText('중대형 (30후~40평)')).toBeInTheDocument();
      expect(screen.getByText('85~115㎡')).toBeInTheDocument();

      expect(screen.getByText('대형 (40평+)')).toBeInTheDocument();
      expect(screen.getByText('115㎡ 초과')).toBeInTheDocument();

      // 4 items: each 1 count -> 25.0% each
      const percentageElements = screen.getAllByText('25.0%');
      expect(percentageElements.length).toBeGreaterThanOrEqual(4);

      // Center overlay badge & toggle button both contain '평형대별 수요'
      expect(screen.getAllByText('평형대별 수요').length).toBeGreaterThanOrEqual(2);
    });

    it('displays representative apartment inline and selects category on card click to connect with KPI cards', () => {
      const mockOnSelectApt = jest.fn();
      const mockOnActiveSectorChange = jest.fn();
      const mockPreload = jest.fn();

      render(
        <AptDonutSection
          mounted={true}
          recentTransactions={mockRecentTransactions}
          txSummaryData={mockSummary as any}
          onSelectApt={mockOnSelectApt}
          onActiveSectorChange={mockOnActiveSectorChange}
          preloadApartmentTx={mockPreload}
        />
      );

      // Simplified card shows category name, badge, and transaction count (without 최다 거래 badge for uniform alignment)
      expect(screen.getByText('소형 (20평대)')).toBeInTheDocument();
      expect(screen.getByText('59㎡ 이하')).toBeInTheDocument();
      expect(screen.queryByText('최다 거래')).not.toBeInTheDocument();
      expect(screen.getAllByText('1건').length).toBeGreaterThanOrEqual(1);

      // Clicking card toggles category selection and notifies onActiveSectorChange without opening modal
      const smallRow = screen.getByLabelText(/소형 \(20평대\) 1건/i);
      fireEvent.click(smallRow);
      expect(mockOnSelectApt).not.toHaveBeenCalled();
      expect(mockOnActiveSectorChange).toHaveBeenCalledWith(
        expect.objectContaining({ name: '소형 (20평대)' })
      );

      // Selection reset button works
      const resetBtn = screen.getByText('선택 초기화');
      fireEvent.click(resetBtn);
      expect(screen.queryByText('선택 초기화')).not.toBeInTheDocument();
    });

    it('switches between pyeong demand mode and energy mode seamlessly via header buttons', () => {
      const onModeChange = jest.fn();

      render(
        <AptDonutSection
          mounted={true}
          recentTransactions={mockRecentTransactions}
          txSummaryData={mockSummary as any}
          onModeChange={onModeChange}
        />
      );

      // Starts in pyeong mode
      expect(screen.getByText('실거래 평형대별 수요 분포')).toBeInTheDocument();
      expect(screen.getByText('소형 (20평대)')).toBeInTheDocument();

      // Switch to energy mode
      const energyBtn = screen.getByText('시장 체감 온도');
      fireEvent.click(energyBtn);

      expect(onModeChange).toHaveBeenCalledWith('energy');
      expect(screen.getByText('실거래 시장 체감 온도')).toBeInTheDocument();
      expect(screen.getByText('신고가')).toBeInTheDocument();
      expect(screen.getByText('상승거래')).toBeInTheDocument();

      // Switch back to pyeong mode
      const pyeongBtn = screen.getByText('평형대별 수요');
      fireEvent.click(pyeongBtn);

      expect(onModeChange).toHaveBeenCalledWith('pyeong');
      expect(screen.getByText('실거래 평형대별 수요 분포')).toBeInTheDocument();
      expect(screen.getByText('소형 (20평대)')).toBeInTheDocument();
    });
  });

  describe('Market Energy Mode', () => {
    it('renders all 4 energy categories with exact 100% total percentage sum', () => {
      render(
        <AptDonutSection
          mounted={true}
          recentTransactions={mockRecentTransactions}
          txSummaryData={mockSummary as any}
          initialMode="energy"
        />
      );

      expect(screen.getByText('실거래 시장 체감 온도')).toBeInTheDocument();
      expect(screen.queryByText(/전수 분석/)).not.toBeInTheDocument();

      // 4 items: each 1 count -> 25.0% each
      expect(screen.getByText('신고가')).toBeInTheDocument();
      expect(screen.getByText('상승거래')).toBeInTheDocument();
      expect(screen.getByText('보합')).toBeInTheDocument();
      expect(screen.getByText('하락거래')).toBeInTheDocument();

      const percentageElements = screen.getAllByText('25.0%');
      expect(percentageElements.length).toBeGreaterThanOrEqual(4);
    });

    it('displays representative apartment inline in energy mode and selects category on click', () => {
      const mockOnSelectApt = jest.fn();
      const mockOnActiveSectorChange = jest.fn();
      const mockPreload = jest.fn();

      render(
        <AptDonutSection
          mounted={true}
          recentTransactions={mockRecentTransactions}
          txSummaryData={mockSummary as any}
          onSelectApt={mockOnSelectApt}
          onActiveSectorChange={mockOnActiveSectorChange}
          preloadApartmentTx={mockPreload}
          initialMode="energy"
        />
      );

      // Simplified card shows category name and count
      expect(screen.getByText('신고가')).toBeInTheDocument();
      expect(screen.getByText('최고가 갱신')).toBeInTheDocument();
      expect(screen.getAllByText('1건').length).toBeGreaterThanOrEqual(1);

      // Clicking '신고가' card activates category and notifies onActiveSectorChange without opening modal
      const highCategoryRow = screen.getByLabelText(/신고가 1건/i);
      fireEvent.click(highCategoryRow);
      expect(mockOnSelectApt).not.toHaveBeenCalled();
      expect(mockOnActiveSectorChange).toHaveBeenCalledWith(
        expect.objectContaining({ name: '신고가' })
      );

      // Reset selection button should be available and clear active category
      const resetBtn = screen.getByText('선택 초기화');
      fireEvent.click(resetBtn);
      expect(screen.queryByText('선택 초기화')).not.toBeInTheDocument();
    });

    it('handles empty transactions without crashing or NaN', () => {
      render(
        <AptDonutSection
          mounted={true}
          recentTransactions={[]}
          initialMode="energy"
        />
      );

      expect(screen.getAllByText('0건').length).toBeGreaterThanOrEqual(4);
      expect(screen.getAllByText('0.0%').length).toBeGreaterThanOrEqual(4);
    });

    it('handles malformed transaction items safely', () => {
      const malformedData = [
        null,
        undefined,
        {},
        { aptName: '이상한 단지', priceVal: undefined, delta: null },
      ];

      render(
        <AptDonutSection
          mounted={true}
          recentTransactions={malformedData as any}
          initialMode="energy"
        />
      );

      expect(screen.getByText('실거래 시장 체감 온도')).toBeInTheDocument();
    });

    it('filters out public rental apartments when publicRentalSet is provided', () => {
      const publicRentalSet = new Set(['동탄역 롯데캐슬']);

      render(
        <AptDonutSection
          mounted={true}
          recentTransactions={mockRecentTransactions}
          publicRentalSet={publicRentalSet}
          initialMode="energy"
        />
      );

      // Out of 4 transactions, '동탄역 롯데캐슬' (high) is filtered -> 3 remaining
      expect(screen.getByText('0.0%')).toBeInTheDocument(); // high is 0%
    });

    it('correctly updates internal state and fires onActiveCategoryChange callback in uncontrolled mode', () => {
      const onActiveChange = jest.fn();

      render(
        <AptDonutSection
          mounted={true}
          recentTransactions={mockRecentTransactions}
          txSummaryData={mockSummary as any}
          onActiveCategoryChange={onActiveChange}
          initialMode="energy"
        />
      );

      // Click '상승거래'
      const risingCategoryRow = screen.getByLabelText(/상승거래 1건/i);
      fireEvent.click(risingCategoryRow);

      expect(onActiveChange).toHaveBeenCalledWith('상승거래');
      expect(screen.getAllByText('상승거래').length).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByText('1건').length).toBeGreaterThanOrEqual(1);
    });

    it('correctly resolves dong and aliases via nameMapping', () => {
      const nameMapping = {
        '우남퍼스트빌': '동탄역시범우남퍼스트빌',
      };
      const txWithAlias = [
        {
          aptName: '우남퍼스트빌',
          priceVal: 11.2,
          area: 84.8,
          delta: 0.4,
        },
      ];
      const onActiveSectorChange = jest.fn();

      render(
        <AptDonutSection
          mounted={true}
          recentTransactions={txWithAlias}
          txSummaryData={mockSummary as any}
          nameMapping={nameMapping}
          onActiveSectorChange={onActiveSectorChange}
          initialMode="energy"
        />
      );

      const risingRow = screen.getByLabelText(/상승거래 1건/i);
      fireEvent.click(risingRow);

      // Should resolve dong '청계동' in activeSector repApt
      expect(onActiveSectorChange).toHaveBeenCalledWith(
        expect.objectContaining({
          repApt: expect.objectContaining({
            dong: '청계동',
          }),
        })
      );
    });

    it('guarantees percentage sum equals exactly 100.0% for odd number of transactions', () => {
      const threeTransactions = [
        { aptName: 'Apt1', priceVal: 10, isNewHigh: true },
        { aptName: 'Apt2', priceVal: 10, delta: 0.5 },
        { aptName: 'Apt3', priceVal: 10, delta: -0.5 },
      ];

      render(
        <AptDonutSection
          mounted={true}
          recentTransactions={threeTransactions}
          initialMode="energy"
        />
      );

      // 33.4% + 33.3% + 33.3% + 0.0% = 100.0%
      expect(screen.getByText('33.4%')).toBeInTheDocument();
      expect(screen.getAllByText('33.3%').length).toBe(2);
    });

    it('correctly categorizes microscopic delta (<10,000 KRW) into flat (보합) and renders 보합 badge', () => {
      const microDeltaTransactions = [
        { aptName: '동탄 미세변동 단지', priceVal: 10.00001, prevPriceVal: 10.0, delta: 0.00001 },
      ];

      render(
        <AptDonutSection
          mounted={true}
          recentTransactions={microDeltaTransactions}
          initialMode="energy"
        />
      );

      // 1 item with delta 0.00001 -> classified as 보합 (flat) 100.0%
      const flatRow = screen.getByLabelText(/보합 1건/i);
      expect(flatRow).toBeInTheDocument();
      fireEvent.click(flatRow);

      const bohapElements = screen.getAllByText('보합');
      expect(bohapElements.length).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByText('1건').length).toBeGreaterThanOrEqual(1);
    });

    it('does not trigger modal or preload when interacting with simplified donut breakdown cards', () => {
      const mockPreload = jest.fn();
      const mockSelectApt = jest.fn();
      const txWithoutDong = [
        { aptName: '단지무동', priceVal: 10, delta: 0.5 },
      ];

      render(
        <AptDonutSection
          mounted={true}
          recentTransactions={txWithoutDong}
          preloadApartmentTx={mockPreload}
          onSelectApt={mockSelectApt}
          initialMode="energy"
        />
      );

      const risingRow = screen.getByLabelText(/상승거래 1건/i);
      fireEvent.mouseEnter(risingRow);
      expect(mockPreload).not.toHaveBeenCalled();

      fireEvent.click(risingRow);
      expect(mockSelectApt).not.toHaveBeenCalled();
    });

    it('formats missing priceEok into eok/man representation and resolves txKey-only transactions', () => {
      const txKeyOnlyData = [
        {
          txKey: '동탄역롯데캐슬',
          priceVal: 16.5,
          delta: 0.5,
        },
      ];

      render(
        <AptDonutSection
          mounted={true}
          recentTransactions={txKeyOnlyData}
          txSummaryData={mockSummary as any}
          initialMode="energy"
        />
      );

      const risingRow = screen.getByLabelText(/상승거래 1건/i);
      fireEvent.click(risingRow);

      expect(screen.getAllByText('상승거래').length).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByText('평균 16.5억').length).toBeGreaterThanOrEqual(1);

      const card = screen.getByLabelText(/상승거래 1건.*하단 대표 실거래 4건 확인/i);
      expect(card).toBeInTheDocument();
    });
  });

  describe('Period Selection (90d / 1y / 3y / all)', () => {
    it('renders all period buttons and default 90d badge and label', () => {
      render(
        <AptDonutSection
          mounted={true}
          recentTransactions={mockRecentTransactions}
          txSummaryData={mockSummary as any}
        />
      );

      expect(screen.getByRole('button', { name: /최근 90일 실거래 보기/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /최근 1년 실거래 보기/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /최근 3년 실거래 보기/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /역대 전수 실거래 보기/i })).toBeInTheDocument();

      // Check header period badge
      expect(screen.getByText('최근 90일')).toBeInTheDocument();
      // Check center overlay period label
      expect(screen.getByText('최근 90일 기준')).toBeInTheDocument();
    });

    it('switches period and invokes onPeriodChange callback when period button is clicked', () => {
      const handlePeriodChange = jest.fn();
      render(
        <AptDonutSection
          mounted={true}
          recentTransactions={mockRecentTransactions}
          txSummaryData={mockSummary as any}
          onPeriodChange={handlePeriodChange}
        />
      );

      const oneYearBtn = screen.getByRole('button', { name: /최근 1년 실거래 보기/i });
      fireEvent.click(oneYearBtn);

      expect(handlePeriodChange).toHaveBeenCalledWith('1y');
      expect(screen.getByText('최근 1년')).toBeInTheDocument();
      expect(screen.getByText('최근 1년 기준')).toBeInTheDocument();

      const allBtn = screen.getByRole('button', { name: /역대 전수 실거래 보기/i });
      fireEvent.click(allBtn);

      expect(handlePeriodChange).toHaveBeenCalledWith('all');
      expect(screen.getByText('역대 전수')).toBeInTheDocument();
      expect(screen.getByText('역대 전수 기준')).toBeInTheDocument();
    });
  });
});


