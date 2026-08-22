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
      area: 84.9,
      areaPyeong: 34.2,
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
      area: 84.5,
      areaPyeong: 33.5,
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
      area: 84.7,
      areaPyeong: 33.6,
      floor: 10,
      isNewHigh: false,
      delta: -0.3,
      deltaPercent: -2.5,
    },
  ];

  const mockSummary = {
    동탄역롯데캐슬: { dong: '오산동' },
    동탄역시범우남퍼스트빌: { dong: '청계동' },
    동탄역시범더샵센트럴시티: { dong: '청계동' },
    동탄역시범한화꿈에그린: { dong: '청계동' },
  };

  it('renders all 4 energy categories with exact 100% total percentage sum', () => {
    render(
      <AptDonutSection
        mounted={true}
        recentTransactions={mockRecentTransactions}
        txSummaryData={mockSummary as any}
      />
    );

    expect(screen.getByText('실거래 시장 에너지 분포')).toBeInTheDocument();
    expect(screen.getByText('최근 실거래 4건 전수 분석')).toBeInTheDocument();

    // 4 items: each 1 count -> 25.0% each
    expect(screen.getByText('신고가🔥')).toBeInTheDocument();
    expect(screen.getByText('상승거래')).toBeInTheDocument();
    expect(screen.getByText('보합')).toBeInTheDocument();
    expect(screen.getByText('하락거래')).toBeInTheDocument();

    const percentageElements = screen.getAllByText('25.0%');
    expect(percentageElements.length).toBeGreaterThanOrEqual(4);
  });

  it('toggles category selection and displays representative apartment list', () => {
    const mockOnSelectApt = jest.fn();
    const mockPreload = jest.fn();

    render(
      <AptDonutSection
        mounted={true}
        recentTransactions={mockRecentTransactions}
        txSummaryData={mockSummary as any}
        onSelectApt={mockOnSelectApt}
        preloadApartmentTx={mockPreload}
      />
    );

    // Click '신고가🔥' category row
    const highCategoryRow = screen.getByLabelText(/신고가🔥 1건/i);
    fireEvent.click(highCategoryRow);

    // Should display representative list title
    expect(screen.getByText(/신고가🔥 대표 실거래 단지 리스트/i)).toBeInTheDocument();
    expect(screen.getByText('동탄역 롯데캐슬')).toBeInTheDocument();
    expect(screen.getByText('16억 5,000만')).toBeInTheDocument();

    // Hover on apartment item
    const aptCard = screen.getByText('동탄역 롯데캐슬').closest('div[role="button"]');
    expect(aptCard).toBeInTheDocument();
    if (aptCard) {
      fireEvent.mouseEnter(aptCard);
      expect(mockPreload).toHaveBeenCalledWith('동탄역 롯데캐슬', '오산동');
      expect(preloadApartmentModal).toHaveBeenCalled();

      // Click on apartment item
      fireEvent.click(aptCard);
      expect(mockOnSelectApt).toHaveBeenCalledWith('동탄역 롯데캐슬', '오산동');
    }

    // Reset selection button should be available
    const resetBtn = screen.getByText('선택 초기화');
    fireEvent.click(resetBtn);
    expect(screen.queryByText(/신고가🔥 대표 실거래 단지 리스트/i)).not.toBeInTheDocument();
  });

  it('handles empty transactions without crashing or NaN', () => {
    render(
      <AptDonutSection
        mounted={true}
        recentTransactions={[]}
      />
    );

    expect(screen.getByText('최근 실거래 0건 전수 분석')).toBeInTheDocument();
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
      />
    );

    expect(screen.getByText('실거래 시장 에너지 분포')).toBeInTheDocument();
    expect(screen.getByText('최근 실거래 1건 전수 분석')).toBeInTheDocument();
  });

  it('filters out public rental apartments when publicRentalSet is provided', () => {
    const publicRentalSet = new Set(['동탄역 롯데캐슬']);

    render(
      <AptDonutSection
        mounted={true}
        recentTransactions={mockRecentTransactions}
        publicRentalSet={publicRentalSet}
      />
    );

    // Out of 4 transactions, '동탄역 롯데캐슬' (high) is filtered -> 3 remaining
    expect(screen.getByText('최근 실거래 3건 전수 분석')).toBeInTheDocument();
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
      />
    );

    // Click '상승거래'
    const risingCategoryRow = screen.getByLabelText(/상승거래 1건/i);
    fireEvent.click(risingCategoryRow);

    expect(onActiveChange).toHaveBeenCalledWith('상승거래');
    expect(screen.getByText(/상승거래 대표 실거래 단지 리스트/i)).toBeInTheDocument();
    expect(screen.getByText('동탄역 시범 우남퍼스트빌')).toBeInTheDocument();
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

    render(
      <AptDonutSection
        mounted={true}
        recentTransactions={txWithAlias}
        txSummaryData={mockSummary as any}
        nameMapping={nameMapping}
      />
    );

    const risingRow = screen.getByLabelText(/상승거래 1건/i);
    fireEvent.click(risingRow);

    // Should resolve dong '청계동'
    expect(screen.getByText('청계동')).toBeInTheDocument();
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
      />
    );

    expect(screen.getByText('최근 실거래 3건 전수 분석')).toBeInTheDocument();
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
      />
    );

    // 1 item with delta 0.00001 -> classified as 보합 (flat) 100.0%
    const flatRow = screen.getByLabelText(/보합 1건/i);
    expect(flatRow).toBeInTheDocument();
    fireEvent.click(flatRow);

    expect(screen.getByText('동탄 미세변동 단지')).toBeInTheDocument();
    const bohapElements = screen.getAllByText('보합');
    expect(bohapElements.length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText(/▲/)).not.toBeInTheDocument();
    expect(screen.queryByText(/▼/)).not.toBeInTheDocument();
  });

  it('calls preloadApartmentTx with empty string fallback when dong is undefined', () => {
    const mockPreload = jest.fn();
    const txWithoutDong = [
      { aptName: '단지무동', priceVal: 10, delta: 0.5 },
    ];

    render(
      <AptDonutSection
        mounted={true}
        recentTransactions={txWithoutDong}
        preloadApartmentTx={mockPreload}
      />
    );

    const risingRow = screen.getByLabelText(/상승거래 1건/i);
    fireEvent.click(risingRow);

    const aptCard = screen.getByText('단지무동').closest('div[role="button"]');
    if (aptCard) {
      fireEvent.mouseEnter(aptCard);
      expect(mockPreload).toHaveBeenCalledWith('단지무동', '');
    }
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
      />
    );

    const risingRow = screen.getByLabelText(/상승거래 1건/i);
    fireEvent.click(risingRow);

    expect(screen.getByText('동탄역롯데캐슬')).toBeInTheDocument();
    expect(screen.getByText('16억 5,000만')).toBeInTheDocument();

    const card = screen.getByLabelText(/동탄역롯데캐슬 16억 5,000만 실거래 상세 리포트 열기/i);
    expect(card).toBeInTheDocument();
  });
});


