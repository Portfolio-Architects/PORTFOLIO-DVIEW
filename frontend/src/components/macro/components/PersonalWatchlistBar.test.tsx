import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PersonalWatchlistBar } from './PersonalWatchlistBar';

// Mock useFavorites
const mockHandleToggleFavorite = jest.fn();
jest.mock('@/hooks/useFavorites', () => ({
  useFavorites: () => ({
    userFavorites: new Set(['동탄역 롯데캐슬']),
    favoriteCounts: {
      '동탄역 롯데캐슬': 42,
      '동탄역 시범 한화꿈에그린 프레스티지': 35,
    },
    handleToggleFavorite: mockHandleToggleFavorite,
    isFavorited: (aptName: string) => aptName === '동탄역 롯데캐슬',
    favorites: ['동탄역 롯데캐슬'],
    favoritesCount: 1,
  }),
}));

// Mock recentApartments
jest.mock('@/lib/utils/recentApartments', () => ({
  getRecentApartments: jest.fn(() => [
    { name: '동탄역 롯데캐슬', dong: '오산동', timestamp: Date.now() },
  ]),
  addRecentApartment: jest.fn(),
  removeRecentApartment: jest.fn(),
  clearRecentApartments: jest.fn(),
}));

describe('PersonalWatchlistBar Component Test Suite', () => {
  const mockRecentTransactions = [
    {
      aptName: '동탄역 롯데캐슬',
      txKey: 'tx-1',
      date: '2026-10-20',
      contractDate: '2026-10-20',
      registeredDate: '2026-10-22',
      priceVal: 160000,
      priceEok: '16억',
      area: 84.9,
      areaPyeong: 34,
      floor: 20,
      dealType: '중개거래',
      delta: 5000,
    },
    {
      aptName: '동탄역 시범 우남퍼스트빌',
      txKey: 'tx-2',
      date: '2026-10-21',
      contractDate: '2026-10-21',
      registeredDate: '2026-10-23',
      priceVal: 110000,
      priceEok: '11억',
      area: 84.9,
      areaPyeong: 34,
      floor: 15,
      dealType: '중개거래',
      delta: 0,
    },
  ];

  const mockTxSummaryData = {
    '동탄역 롯데캐슬': {
      latestPrice: 160000,
      latestPriceEok: '16억',
      latestArea: 84.9,
      latestFloor: 20,
      latestDate: '2026-10-20',
      maxPrice: 160000,
      maxPriceEok: '16억',
      minPrice: 140000,
      minPriceEok: '14억',
      txCount: 10,
      avg1MPrice: 158000,
      avg1MPriceEok: '15.8억',
      recent: [],
      dong: '오산동',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
  });

  it('renders Delta Badge and watchlist container without crashing', async () => {
    render(
      <PersonalWatchlistBar
        recentTransactions={mockRecentTransactions}
        txSummaryData={mockTxSummaryData}
      />
    );

    expect(screen.getByTestId('personal-watchlist-bar')).toBeInTheDocument();
    // Delta badge should be visible
    expect(screen.getByText(/신규 실거래/)).toBeInTheDocument();
  });

  it('renders watchlist cards when user has favorites', async () => {
    const handleSelectApt = jest.fn();

    render(
      <PersonalWatchlistBar
        recentTransactions={mockRecentTransactions}
        txSummaryData={mockTxSummaryData}
        onSelectApt={handleSelectApt}
      />
    );

    // Should display favorite complex card
    expect(screen.getByText('동탄역 롯데캐슬')).toBeInTheDocument();
    expect(screen.getByText('16억')).toBeInTheDocument();

    // Clicking card should trigger onSelectApt
    const card = screen.getByText('동탄역 롯데캐슬').closest('div');
    if (card) {
      fireEvent.click(card);
      expect(handleSelectApt).toHaveBeenCalledWith('동탄역 롯데캐슬', '오산동');
    }
  });

  it('provides quick search input and filters matching apartments', async () => {
    const mockSheetApartments = {
      청계동: [{ name: '동탄역 시범 우남퍼스트빌', dong: '청계동' }],
      오산동: [{ name: '동탄역 롯데캐슬', dong: '오산동' }],
    };

    render(
      <PersonalWatchlistBar
        recentTransactions={mockRecentTransactions}
        txSummaryData={mockTxSummaryData}
        sheetApartments={mockSheetApartments}
      />
    );

    const searchInput = screen.getByPlaceholderText('단지명 빠른 검색...');
    fireEvent.change(searchInput, { target: { value: '우남' } });

    expect(await screen.findByText('동탄역 시범 우남퍼스트빌')).toBeInTheDocument();
  });
});
