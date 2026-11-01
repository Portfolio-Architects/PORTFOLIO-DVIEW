import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PersonalWatchlistBar } from './PersonalWatchlistBar';
import { trackEvent } from '@/lib/utils/analytics';

// Configurable mocks for useFavorites and recentApartments
let mockUserFavorites = new Set<string>();
let mockFavoriteCounts: Record<string, number> = {};
const mockHandleToggleFavorite = jest.fn(async (aptName: string) => {
  if (mockUserFavorites.has(aptName)) {
    mockUserFavorites.delete(aptName);
  } else {
    mockUserFavorites.add(aptName);
  }
});

jest.mock('@/hooks/useFavorites', () => ({
  useFavorites: () => ({
    userFavorites: mockUserFavorites,
    favoriteCounts: mockFavoriteCounts,
    handleToggleFavorite: mockHandleToggleFavorite,
    isFavorited: (aptName: string) => mockUserFavorites.has(aptName),
    favorites: Array.from(mockUserFavorites),
    favoritesCount: mockUserFavorites.size,
  }),
}));

let mockRecentApartments: { name: string; dong: string; timestamp: number }[] = [];
const mockAddRecentApartment = jest.fn((apt: { name: string; dong: string }) => {
  mockRecentApartments = [
    { name: apt.name, dong: apt.dong || '', timestamp: Date.now() },
    ...mockRecentApartments.filter((a) => a.name !== apt.name),
  ];
  return mockRecentApartments;
});

jest.mock('@/lib/utils/recentApartments', () => ({
  getRecentApartments: jest.fn(() => mockRecentApartments),
  addRecentApartment: (apt: { name: string; dong: string }) => mockAddRecentApartment(apt),
  removeRecentApartment: jest.fn(),
  clearRecentApartments: jest.fn(() => {
    mockRecentApartments = [];
  }),
}));

jest.mock('@/lib/utils/analytics', () => ({
  trackEvent: jest.fn(),
}));

describe('Adversarial Stress Test: PersonalWatchlistBar (Zone 1)', () => {
  const now = Date.now();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  // Helper to format Date into YYYY-MM-DD
  const formatDate = (ts: number) => {
    const d = new Date(ts);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const sampleRecentTransactions = [
    {
      aptName: '동탄역 롯데캐슬',
      txKey: 'tx-today',
      date: formatDate(now),
      contractDate: formatDate(now),
      registeredDate: formatDate(now),
      priceVal: 160000,
      priceEok: '16억',
      area: 84.9,
      areaPyeong: 34,
      floor: 20,
      dealType: '중개거래',
      delta: 5000,
    },
    {
      aptName: '동탄역 시범 한화꿈에그린 프레스티지',
      txKey: 'tx-2days-ago',
      date: formatDate(now - 2 * ONE_DAY_MS),
      contractDate: formatDate(now - 2 * ONE_DAY_MS),
      registeredDate: formatDate(now - 2 * ONE_DAY_MS),
      priceVal: 125000,
      priceEok: '12.5억',
      area: 84.9,
      areaPyeong: 34,
      floor: 12,
      dealType: '중개거래',
      delta: -2000,
    },
    {
      aptName: '동탄린스트라우스더레이크',
      txKey: 'tx-10days-ago',
      date: formatDate(now - 10 * ONE_DAY_MS),
      contractDate: formatDate(now - 10 * ONE_DAY_MS),
      registeredDate: formatDate(now - 10 * ONE_DAY_MS),
      priceVal: 130000,
      priceEok: '13억',
      area: 98.0,
      areaPyeong: 38,
      floor: 15,
      dealType: '중개거래',
      delta: 0,
    },
  ];

  const sampleTxSummaryData = {
    '동탄역 롯데캐슬': {
      latestPrice: 160000,
      latestPriceEok: '16억',
      latestArea: 84.9,
      latestFloor: 20,
      latestDate: formatDate(now),
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
      latestArea: 84.9,
      latestFloor: 12,
      latestDate: formatDate(now - 2 * ONE_DAY_MS),
      maxPrice: 130000,
      maxPriceEok: '13억',
      minPrice: 110000,
      minPriceEok: '11억',
      txCount: 20,
      avg1MPrice: 122000,
      avg1MPriceEok: '12.2억',
      recent: [],
      dong: '청계동',
    },
  };

  const sampleSheetApartments = {
    오산동: [{ name: '동탄역 롯데캐슬', dong: '오산동' }],
    청계동: [{ name: '동탄역 시범 한화꿈에그린 프레스티지', dong: '청계동' }],
    송동: [{ name: '동탄린스트라우스더레이크', dong: '송동' }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    mockUserFavorites = new Set<string>();
    mockRecentApartments = [];
    mockFavoriteCounts = {};
  });

  // =========================================================================
  // 1. TIMESTAMP EDGE CASES & DELTA CALCULATION
  // =========================================================================
  describe('1. Timestamp Edge Cases & Delta Calculation', () => {
    it('handles MISSING timestamp (first visit): defaults to 7 days, renders "동탄 최근 7일 신규 실거래 +N건", and updates localStorage', async () => {
      // Ensure no timestamp is in localStorage
      expect(window.localStorage.getItem('dview_last_visit_ts')).toBeNull();

      render(
        <PersonalWatchlistBar
          recentTransactions={sampleRecentTransactions}
          txSummaryData={sampleTxSummaryData}
        />
      );

      // Should render 7-day delta badge
      // In sampleRecentTransactions, tx-today and tx-2days-ago are <= 7 days. tx-10days-ago is 10 days ago.
      // Therefore, totalNewCount should be 2.
      const badgeText = screen.getByText(/동탄 최근 7일 신규 실거래 \+2건/);
      expect(badgeText).toBeInTheDocument();

      // Ensure that localStorage was updated with a valid timestamp
      const savedTs = window.localStorage.getItem('dview_last_visit_ts');
      expect(savedTs).not.toBeNull();
      const parsed = parseInt(savedTs!, 10);
      expect(parsed).toBeGreaterThan(0);
      expect(parsed).toBeLessThanOrEqual(Date.now() + 1000);
    });

    it('handles FAR FUTURE timestamp (adversarial / clock skew): falls back to 7 days, never produces negative counts or NaN', async () => {
      // Far future timestamp: year 2099
      const futureTs = Date.now() + 1000 * 24 * 60 * 60 * 1000;
      window.localStorage.setItem('dview_last_visit_ts', futureTs.toString());

      render(
        <PersonalWatchlistBar
          recentTransactions={sampleRecentTransactions}
          txSummaryData={sampleTxSummaryData}
        />
      );

      // The component should reject futureTs, fallback to 7 days, and report +2건
      expect(screen.getByText(/동탄 최근 7일 신규 실거래 \+2건/)).toBeInTheDocument();
      expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
      expect(screen.queryByText(/-\d+/)).not.toBeInTheDocument();
    });

    it('handles MALFORMED timestamps ("NaN", "undefined", negative, invalid strings): falls back safely without crashing', async () => {
      const adversarialValues = [
        'NaN',
        'undefined',
        'null',
        '-999999999',
        '0',
        '{"corrupted": true}',
        'not-a-number-at-all',
      ];

      for (const malformed of adversarialValues) {
        window.localStorage.clear();
        window.localStorage.setItem('dview_last_visit_ts', malformed);

        const { unmount } = render(
          <PersonalWatchlistBar
            recentTransactions={sampleRecentTransactions}
            txSummaryData={sampleTxSummaryData}
          />
        );

        // All of these should fall back to 7-day mode with 2 transactions
        expect(screen.getByText(/동탄 최근 7일 신규 실거래 \+2건/)).toBeInTheDocument();
        expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();

        unmount();
      }
    });

    it('handles VALID RETURNING timestamp: calculates delta against prior session and reports favorite matches', async () => {
      // Prior session: 3 days ago
      const threeDaysAgo = Date.now() - 3 * ONE_DAY_MS;
      window.localStorage.setItem('dview_last_visit_ts', threeDaysAgo.toString());

      // Set user favorite to "동탄역 롯데캐슬"
      mockUserFavorites = new Set(['동탄역 롯데캐슬']);

      render(
        <PersonalWatchlistBar
          recentTransactions={sampleRecentTransactions}
          txSummaryData={sampleTxSummaryData}
        />
      );

      // Transactions newer than 3 days ago:
      // 1. '동탄역 롯데캐슬' (today) -> In favorites!
      // 2. '동탄역 시범 한화꿈에그린 프레스티지' (2 days ago) -> Not in favorites
      // Total new = 2, favorites new = 1
      expect(
        screen.getByText(/지난 방문 이후 동탄 신규 실거래 \+2건 · 내 관심단지 1건/)
      ).toBeInTheDocument();
    });

    it('handles ADVERSARIAL transaction date formats and corrupted transaction records', async () => {
      const corruptedTransactions: any[] = [
        {
          aptName: '단지A',
          txKey: 'tx-no-date',
          registeredDate: undefined,
          contractDate: undefined,
          date: undefined,
        },
        {
          aptName: '단지B',
          txKey: 'tx-empty-date',
          registeredDate: '',
        },
        {
          aptName: '단지C',
          txKey: 'tx-invalid-string',
          registeredDate: 'garbage-date',
        },
        {
          aptName: '단지D',
          txKey: 'tx-compact-8digits',
          registeredDate: '20261025', // valid 8-digit without hyphens
        },
        {
          aptName: '단지E',
          txKey: 'tx-dotted',
          registeredDate: '2026.10.25', // valid dotted date
        },
        {
          aptName: '단지F',
          txKey: 'tx-iso',
          registeredDate: '2026-10-25T12:00:00Z', // valid ISO format
        },
      ];

      // Missing timestamp (first visit) -> cutoff is 7 days ago
      expect(() => {
        render(
          <PersonalWatchlistBar
            recentTransactions={corruptedTransactions}
            txSummaryData={{}}
          />
        );
      }).not.toThrow();

      // Component should render without crashing
      expect(screen.getByTestId('personal-watchlist-bar')).toBeInTheDocument();
      expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
    });

    it('handles NULL or UNDEFINED recentTransactions gracefully', () => {
      expect(() => {
        render(
          <PersonalWatchlistBar
            recentTransactions={undefined}
            txSummaryData={undefined}
            sheetApartments={undefined}
          />
        );
      }).not.toThrow();

      expect(screen.getByText(/동탄 최근 7일 신규 실거래 \+0건/)).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 2. COLD-START VS RETURNING USER TRANSITIONS & CHIP CLICKS
  // =========================================================================
  describe('2. Cold-Start vs Returning User Transitions', () => {
    it('COLD START (0 favorites & 0 recent): renders onboarding prompt and exactly 5 candidate chips', () => {
      mockUserFavorites = new Set<string>();
      mockRecentApartments = [];

      const mockFavoriteCountsInput = {
        '동탄역 롯데캐슬': 150,
        '동탄역 시범 한화꿈에그린 프레스티지': 120,
        '동탄역 시범 더샵 센트럴시티': 95,
        '동탄역 시범 우남퍼스트빌': 80,
        '동탄린스트라우스더레이크': 75,
        '동탄역 센트럴자이': 50,
      };

      render(
        <PersonalWatchlistBar
          recentTransactions={sampleRecentTransactions}
          txSummaryData={sampleTxSummaryData}
          sheetApartments={sampleSheetApartments}
          favoriteCounts={mockFavoriteCountsInput}
        />
      );

      // Verify Cold Start copy
      expect(
        screen.getByText(/관심 단지를 담아두면 다음 방문부터 새 실거래 변동을 브리핑해 드려요/)
      ).toBeInTheDocument();

      // Top 5 by count: 롯데캐슬, 한화꿈에그린, 더샵 센트럴시티, 우남퍼스트빌, 린스트라우스더레이크
      expect(screen.getByText('동탄역 롯데캐슬')).toBeInTheDocument();
      expect(screen.getByText('동탄역 시범 한화꿈에그린 프레스티지')).toBeInTheDocument();
      expect(screen.getByText('동탄역 시범 더샵 센트럴시티')).toBeInTheDocument();
      expect(screen.getByText('동탄역 시범 우남퍼스트빌')).toBeInTheDocument();
      expect(screen.getByText('동탄린스트라우스더레이크')).toBeInTheDocument();

      // 6th item should not be rendered as onboarding chip
      expect(screen.queryByText('동탄역 센트럴자이')).not.toBeInTheDocument();

      // Watchlist cards (which have star button and price) should NOT exist in cold-start mode
      expect(screen.queryByText('실거래 집계 중')).not.toBeInTheDocument();
    });

    it('COLD START INTERACTION: clicking an onboarding chip invokes toggle favorite, adds to recent apartments, and triggers tracking', async () => {
      mockUserFavorites = new Set<string>();
      mockRecentApartments = [];
      const handleSelectApt = jest.fn();

      render(
        <PersonalWatchlistBar
          recentTransactions={sampleRecentTransactions}
          txSummaryData={sampleTxSummaryData}
          sheetApartments={sampleSheetApartments}
          onSelectApt={handleSelectApt}
        />
      );

      // Find the onboarding chip for "동탄역 롯데캐슬"
      const chip = screen.getByRole('button', { name: /동탄역 롯데캐슬/ });
      expect(chip).toBeInTheDocument();

      // Click the chip
      await act(async () => {
        fireEvent.click(chip);
      });

      // 1. handleToggleFavorite called with the apartment name
      expect(mockHandleToggleFavorite).toHaveBeenCalledWith('동탄역 롯데캐슬');

      // 2. addRecentApartment called
      expect(mockAddRecentApartment).toHaveBeenCalledWith(
        expect.objectContaining({ name: '동탄역 롯데캐슬' })
      );

      // 3. onSelectApt called
      expect(handleSelectApt).toHaveBeenCalledWith('동탄역 롯데캐슬', undefined);

      // 4. GA4 tracking called for chip click and card click
      expect(trackEvent).toHaveBeenCalledWith('watchlist_onboarding_chip_click', {
        apt_name: '동탄역 롯데캐슬',
      });
      expect(trackEvent).toHaveBeenCalledWith('watchlist_card_click', {
        apt_name: '동탄역 롯데캐슬',
        surface: 'zone1_bar',
      });
    });

    it('LIVE TRANSITION: clicking chip immediately transitions UI from Cold Start prompt to Returning User Watchlist Card', async () => {
      mockUserFavorites = new Set<string>();
      mockRecentApartments = [];

      render(
        <PersonalWatchlistBar
          recentTransactions={sampleRecentTransactions}
          txSummaryData={sampleTxSummaryData}
          sheetApartments={sampleSheetApartments}
        />
      );

      // Initially in cold-start mode
      expect(
        screen.getByText(/관심 단지를 담아두면 다음 방문부터 새 실거래 변동을 브리핑해 드려요/)
      ).toBeInTheDocument();

      const chip = screen.getByRole('button', { name: /동탄역 롯데캐슬/ });

      // Click the onboarding chip
      await act(async () => {
        fireEvent.click(chip);
      });

      // After clicking chip, addRecentApartment adds it to mockRecentApartments and setRecentApts updates state.
      // Therefore, the cold-start prompt should DISAPPEAR and the returning watchlist card should APPEAR.
      await waitFor(() => {
        expect(
          screen.queryByText(/관심 단지를 담아두면 다음 방문부터 새 실거래 변동을 브리핑해 드려요/)
        ).not.toBeInTheDocument();
      });

      // Watchlist card should now show the complex with its price from sampleTxSummaryData (16억)
      expect(screen.getByText('16억')).toBeInTheDocument();

      // Card should also have the star button
      expect(screen.getByLabelText(/동탄역 롯데캐슬 관심 단지 해제\/등록/)).toBeInTheDocument();
    });

    it('RETURNING USER: clicking star toggle does NOT trigger card select (stopPropagation verification)', async () => {
      mockUserFavorites = new Set(['동탄역 롯데캐슬']);
      const handleSelectApt = jest.fn();

      render(
        <PersonalWatchlistBar
          recentTransactions={sampleRecentTransactions}
          txSummaryData={sampleTxSummaryData}
          sheetApartments={sampleSheetApartments}
          onSelectApt={handleSelectApt}
        />
      );

      const starButton = screen.getByLabelText(/동탄역 롯데캐슬 관심 단지 해제\/등록/);
      expect(starButton).toBeInTheDocument();

      // Click star button
      await act(async () => {
        fireEvent.click(starButton);
      });

      // handleToggleFavorite should have been called
      expect(mockHandleToggleFavorite).toHaveBeenCalledWith('동탄역 롯데캐슬');

      // onSelectApt should NOT have been called due to e.stopPropagation()
      expect(handleSelectApt).not.toHaveBeenCalled();

      // Now click the card container itself
      const card = screen.getByText('동탄역 롯데캐슬').closest('.cursor-pointer');
      expect(card).not.toBeNull();
      fireEvent.click(card!);

      // Now onSelectApt SHOULD have been called
      expect(handleSelectApt).toHaveBeenCalledWith('동탄역 롯데캐슬', '오산동');
    });

    it('DELTA BADGE CLICK: triggers GA4 telemetry trackEvent with current counts', () => {
      mockUserFavorites = new Set(['동탄역 롯데캐슬']);
      // Returning session 3 days ago
      window.localStorage.setItem('dview_last_visit_ts', (Date.now() - 3 * ONE_DAY_MS).toString());

      render(
        <PersonalWatchlistBar
          recentTransactions={sampleRecentTransactions}
          txSummaryData={sampleTxSummaryData}
        />
      );

      const deltaButton = screen.getByRole('button', { name: /신규 실거래/ });
      fireEvent.click(deltaButton);

      expect(trackEvent).toHaveBeenCalledWith('delta_badge_click', {
        delta_count: 2,
        new_tx_count: 2,
        favorites_tx_count: 1,
      });
    });
  });
});
