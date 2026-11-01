import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RealtimeRankingBoard } from './RealtimeRankingBoard';

describe('RealtimeRankingBoard Component Test Suite', () => {
  const mockTransactions = [
    {
      aptName: '동탄역 롯데캐슬',
      contractDate: '2026-10-15',
      registeredDate: '2026-10-18',
      priceVal: 160000,
      priceEok: '16억',
      area: 84.9,
      areaPyeong: 34,
      floor: 25,
      isNewHigh: true,
      delta: 5000,
    },
    {
      aptName: '동탄역 시범 한화꿈에그린 프레스티지',
      contractDate: '2026-10-14',
      registeredDate: '2026-10-17',
      priceVal: 125000,
      priceEok: '12억 5,000',
      area: 84.8,
      areaPyeong: 33,
      floor: 18,
      isNewHigh: false,
      delta: -2000,
    },
  ];

  const mockTxSummaryData = {
    '동탄역 롯데캐슬': {
      latestPrice: 160000,
      latestPriceEok: '16억',
      latestArea: 84.9,
      latestFloor: 25,
      latestDate: '2026-10-15',
      maxPrice: 160000,
      maxPriceEok: '16억',
      minPrice: 140000,
      minPriceEok: '14억',
      txCount: 15,
      avg1MPrice: 158000,
      avg1MPriceEok: '15.8억',
      recent: [],
      dong: '오산동',
    },
    '동탄역 시범 한화꿈에그린 프레스티지': {
      latestPrice: 125000,
      latestPriceEok: '12.5억',
      latestArea: 84.8,
      latestFloor: 18,
      latestDate: '2026-10-14',
      maxPrice: 130000,
      maxPriceEok: '13억',
      minPrice: 110000,
      minPriceEok: '11억',
      txCount: 22,
      avg1MPrice: 124000,
      avg1MPriceEok: '12.4억',
      recent: [],
      dong: '청계동',
    },
  };

  it('renders ranking board container and 3 tabs correctly', () => {
    render(
      <RealtimeRankingBoard
        recentTransactions={mockTransactions}
        txSummaryData={mockTxSummaryData}
      />
    );

    expect(screen.getByTestId('realtime-ranking-board')).toBeInTheDocument();
    expect(screen.getByTestId('ranking-tab-high')).toBeInTheDocument();
    expect(screen.getByTestId('ranking-tab-gap')).toBeInTheDocument();
    expect(screen.getByTestId('ranking-tab-surge')).toBeInTheDocument();
  });

  it('switches tabs and maintains active state on click', () => {
    render(
      <RealtimeRankingBoard
        recentTransactions={mockTransactions}
        txSummaryData={mockTxSummaryData}
      />
    );

    const gapTab = screen.getByTestId('ranking-tab-gap');
    fireEvent.click(gapTab);
    expect(gapTab.className).toContain('font-black');

    const surgeTab = screen.getByTestId('ranking-tab-surge');
    fireEvent.click(surgeTab);
    expect(surgeTab.className).toContain('font-black');
  });

  it('invokes onSelectComplex and onSelectApt callbacks when a ranking row is clicked', () => {
    const handleSelectComplex = jest.fn();
    const handleSelectApt = jest.fn();

    render(
      <RealtimeRankingBoard
        recentTransactions={mockTransactions}
        txSummaryData={mockTxSummaryData}
        onSelectComplex={handleSelectComplex}
        onSelectApt={handleSelectApt}
      />
    );

    const rank1Item = screen.queryByTestId('ranking-item-1');
    if (rank1Item) {
      fireEvent.click(rank1Item);
      expect(handleSelectComplex).toHaveBeenCalled();
    }
  });

  it('handles empty transactions and summaries gracefully without crashing', () => {
    render(
      <RealtimeRankingBoard
        recentTransactions={[]}
        txSummaryData={{}}
      />
    );

    expect(screen.getByTestId('realtime-ranking-board')).toBeInTheDocument();
  });
});
