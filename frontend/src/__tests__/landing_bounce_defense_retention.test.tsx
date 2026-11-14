/**
 * landing_bounce_defense_retention.test.tsx
 *
 * Tests for GA4 Action Item #1:
 * - Zone 1 PersonalWatchlistBar cold-start & returning-user bounce defense
 * - MacroDashboardClient mounting & Zero-CLS MacroDashboardSkeleton parity (lg:h-[526px] preserved)
 * - ApartmentLandingRetentionStrip early-viewport peer comparison & favorite -> push bridge
 * - Strict Real Data Only price enforcement & GA4 funnel telemetry
 */

import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

import { PersonalWatchlistBar } from '@/components/macro/components/PersonalWatchlistBar';
import MacroDashboardClient from '@/components/MacroDashboardClient';
import { MacroDashboardSkeleton } from '@/components/DashboardClient';
import { ApartmentLandingRetentionStrip } from '@/components/apartment/ApartmentLandingRetentionStrip';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { AuthProvider } from '@/contexts/AuthContext';
import * as analytics from '@/lib/utils/analytics';
import type { DongApartment } from '@/lib/dong-apartments';
import type { AptTxSummary, DongtanMacroTrendPoint, RecentTransaction } from '@/types';
import type { RecirculationTargetApt } from '@/lib/ads/recirculationEngine';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

jest.mock('@/lib/firebaseConfig', () => ({
  db: { __mockDb: true },
}));

jest.mock('@/lib/repositories/apartment.repository', () => ({
  ApartmentRepository: {
    fetchApartmentNames: jest.fn().mockResolvedValue([]),
    fetchApartments: jest.fn().mockResolvedValue([]),
  },
  fetchApartmentNames: jest.fn().mockResolvedValue([]),
  fetchAllApartments: jest.fn().mockResolvedValue([]),
}));

const mockSheetApartments: Record<string, DongApartment[]> = {
  여울동: [
    { name: '동탄역 롯데캐슬', dong: '여울동', txKey: '동탄역롯데캐슬' } as DongApartment,
  ],
  청계동: [
    { name: '동탄역시범더샵센트럴시티', dong: '청계동', txKey: '동탄역시범더샵센트럴시티' } as DongApartment,
    { name: '동탄역 시범 우남퍼스트빌', dong: '청계동', txKey: '동탄역시범우남퍼스트빌' } as DongApartment,
  ],
};

const mockTxSummaryData: Record<string, AptTxSummary> = {
  '동탄역 롯데캐슬': {
    dong: '여울동',
    latestPrice: 165000,
    latestPriceEok: '16.5억',
    latestArea: 84,
    latestFloor: 20,
    latestDate: '2026-11-01',
    maxPrice: 170000,
    maxPriceEok: '17.0억',
    minPrice: 150000,
    minPriceEok: '15.0억',
    avg1MPrice: 165000,
    avg1MPriceEok: '16.5억',
    txCount: 15,
    recent: [],
  },
  동탄역시범더샵센트럴시티: {
    dong: '청계동',
    latestPrice: 128000,
    latestPriceEok: '12.8억',
    latestArea: 84,
    latestFloor: 17,
    latestDate: '2026-11-02',
    maxPrice: 140000,
    maxPriceEok: '14.0억',
    minPrice: 115000,
    minPriceEok: '11.5억',
    avg1MPrice: 128000,
    avg1MPriceEok: '12.8억',
    txCount: 18,
    recent: [],
  },
};

const mockRecentTransactions: RecentTransaction[] = [
  {
    aptName: '동탄역 롯데캐슬',
    txKey: '동탄역롯데캐슬',
    date: '11.10',
    contractDate: '20261110',
    priceVal: 16.5,
    priceEok: '16.5억',
    area: 84.9,
    areaPyeong: 25.7,
    floor: 20,
    dealType: '매매',
    dong: '여울동',
    isNewHigh: true,
  },
];

const mockMacroTrendData: DongtanMacroTrendPoint[] = [
  { name: '26.09', '동탄 아파트 전체': 81000, '동탄 아파트 전세 평균': 46000 },
  { name: '26.10', '동탄 아파트 전체': 83000, '동탄 아파트 전세 평균': 47000 },
];

const mockPeerTargets: RecirculationTargetApt[] = [
  {
    aptName: '동탄역시범더샵센트럴시티',
    dong: '청계동',
    latestPriceWon: 1_280_000_000,
    jeonseRatio: 0.58,
    jeonseRatioPercent: 58,
    similarityScore: 0.91,
    clusterTag: 'SAME_PRICE_BAND',
  },
  {
    aptName: '동탄역시범한화꿈에그린프레스티지',
    dong: '여울동',
    latestPriceWon: 1_150_000_000,
    jeonseRatio: 0.57,
    jeonseRatioPercent: 57,
    similarityScore: 0.88,
    clusterTag: 'SAME_DONG',
  },
  {
    aptName: '동탄린스트라우스더레이크',
    dong: '송동',
    latestPriceWon: 1_180_000_000,
    jeonseRatio: 0.56,
    jeonseRatioPercent: 56,
    similarityScore: 0.79,
    clusterTag: 'TOP_VOLUME',
  },
];

describe('Landing Bounce Defense & Returning-Visitor Retention', () => {
  let trackEventSpy: jest.SpyInstance;

  beforeEach(() => {
    localStorage.clear();
    trackEventSpy = jest.spyOn(analytics, 'trackEvent').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    trackEventSpy.mockRestore();
  });

  describe('1. PersonalWatchlistBar Cold-Start & Returning Controls', () => {
    it('renders verified txSummaryData price on cold-start chips, omits unverified fallback prices, enforces Zero-CLS height, and fires 1:1 quick compare', () => {
      const onOpenCompare = jest.fn();

      render(
        <PersonalWatchlistBar
          recentTransactions={mockRecentTransactions}
          txSummaryData={mockTxSummaryData}
          sheetApartments={mockSheetApartments}
          favoriteCounts={{ '동탄역 롯데캐슬': 100, 동탄역시범더샵센트럴시티: 80 }}
          onOpenCompare={onOpenCompare}
        />
      );

      const bar = screen.getByTestId('personal-watchlist-bar');
      expect(bar.className).toContain('min-h-[88px]');
      expect(bar.className).toContain('sm:min-h-[96px]');

      // Chip with verified txSummaryData entry shows real price
      const verifiedChip = screen.getByTestId('watchlist-chip-동탄역 롯데캐슬');
      expect(verifiedChip).toHaveTextContent('16.5억');

      // Fallback landmark with no txSummaryData / recentTransactions entry renders name only (no fake price)
      const fallbackChip = screen.getByTestId('watchlist-chip-동탄역 시범 한화꿈에그린 프레스티지');
      expect(fallbackChip).toBeInTheDocument();
      expect(fallbackChip.textContent).not.toMatch(/억|만/);

      // Cold-start 1:1 compare pill
      const quickCompareBtn = screen.getByTestId('watchlist-quick-compare-btn');
      expect(quickCompareBtn).toHaveTextContent('인접 대장단지 1:1 비교');
      fireEvent.click(quickCompareBtn);

      expect(onOpenCompare).toHaveBeenCalledWith('동탄역 롯데캐슬', '동탄역시범더샵센트럴시티');
      expect(trackEventSpy).toHaveBeenCalledWith(
        'landing_bounce_defense_click',
        expect.objectContaining({
          action: 'quick_compare',
          apt_name: '동탄역 롯데캐슬',
          target_apt_name: '동탄역시범더샵센트럴시티',
          surface: 'zone1_watchlist_bar',
          visitor_state: 'cold_start',
        })
      );
    });

    it('exposes compare and push alert trigger pill for returning users with saved favorites', () => {
      localStorage.setItem('dview_guest_favorites', JSON.stringify(['동탄역 롯데캐슬']));
      const onOpenCompare = jest.fn();
      const onOpenPushModal = jest.fn();

      render(
        <PersonalWatchlistBar
          recentTransactions={mockRecentTransactions}
          txSummaryData={mockTxSummaryData}
          sheetApartments={mockSheetApartments}
          userFavoritesProp={new Set(['동탄역 롯데캐슬'])}
          onOpenCompare={onOpenCompare}
          onOpenPushModal={onOpenPushModal}
        />
      );

      expect(screen.getByTestId('watchlist-card-동탄역 롯데캐슬')).toBeInTheDocument();

      const quickCompareBtn = screen.getByTestId('watchlist-quick-compare-btn');
      expect(quickCompareBtn).toHaveTextContent('관심단지 1:1 비교');
      fireEvent.click(quickCompareBtn);
      expect(onOpenCompare).toHaveBeenCalledWith('동탄역 롯데캐슬', expect.any(String));

      const pushBtn = screen.getByTestId('watchlist-push-alert-btn');
      expect(pushBtn).toHaveTextContent('변동 알림');
      fireEvent.click(pushBtn);

      expect(onOpenPushModal).toHaveBeenCalledWith('동탄역 롯데캐슬');
      expect(trackEventSpy).toHaveBeenCalledWith(
        'push_modal_open',
        expect.objectContaining({
          surface: 'zone1_watchlist_bar',
          trigger: 'watchlist_strip',
          apt_name: '동탄역 롯데캐슬',
        })
      );
    });
  });

  describe('2. MacroDashboardClient Hero Direct Layout & Zero-CLS Skeleton Parity', () => {
    it('omits PersonalWatchlistBar above hero-donut-trend-grid while preserving lg:h-[526px] hero symmetry and matching MacroDashboardSkeleton Zero-CLS geometry', () => {
      const { container } = render(
        <SettingsProvider>
          <AuthProvider>
            <MacroDashboardClient
              sheetApartments={mockSheetApartments}
              txSummaryData={mockTxSummaryData}
              macroTrendData={mockMacroTrendData}
              publicRentalSet={new Set()}
              fieldReportsMap={new Map()}
              favoriteCounts={{ '동탄역 롯데캐슬': 100 }}
              recentTransactions={mockRecentTransactions}
            />
          </AuthProvider>
        </SettingsProvider>
      );

      expect(screen.queryByTestId('personal-watchlist-bar')).not.toBeInTheDocument();
      const heroGrid = screen.getByTestId('hero-donut-trend-grid');
      const heroLeftCol = screen.getByTestId('hero-left-donut-col');
      const heroRightCol = screen.getByTestId('hero-right-chart-col');

      expect(heroGrid).toBeInTheDocument();

      // Hero 526px symmetry preserved
      expect(heroLeftCol.className).toContain('lg:h-[526px]');
      expect(heroRightCol.className).toContain('lg:h-[526px]');
      expect(container.querySelectorAll('.font-mono').length).toBe(0);

      cleanup();

      render(<MacroDashboardSkeleton />);
      expect(screen.queryByTestId('skeleton-zone1-watchlist')).not.toBeInTheDocument();
      expect(screen.getByTestId('skeleton-zone2a-hero')).toBeInTheDocument();
    });
  });

  describe('3. ApartmentLandingRetentionStrip Early-Viewport Comparison & Retention Bridge', () => {
    it('renders 3 peer chips with verified real prices only, opens 1:1 compare, and transitions from favorite toggle to push notification nudge', () => {
      const onSelectPeer = jest.fn();
      const onOpenCompare = jest.fn();
      const onOpenPushModal = jest.fn();

      render(
        <ApartmentLandingRetentionStrip
          currentAptName="동탄역 롯데캐슬"
          currentDong="여울동"
          targets={mockPeerTargets}
          txSummaryData={mockTxSummaryData}
          inline={true}
          onSelectPeer={onSelectPeer}
          onOpenCompare={onOpenCompare}
          onOpenPushModal={onOpenPushModal}
        />
      );

      const strip = screen.getByTestId('apartment-landing-retention-strip');
      expect(strip.className).toContain('min-h-[76px]');

      // Chip 0 has txSummaryData entry -> renders real price 12.8억
      const peer0 = screen.getByTestId('landing-peer-chip-0');
      expect(peer0).toHaveTextContent('유사시세');
      expect(peer0).toHaveTextContent('12.8억');

      // Chip 1 has no txSummaryData entry -> omits synthetic fallback price from target.latestPriceWon
      const peer1 = screen.getByTestId('landing-peer-chip-1');
      expect(peer1).toHaveTextContent('동일권역');
      expect(peer1.textContent).not.toMatch(/11\.5|억|만/);

      // Peer selection recirculation click
      fireEvent.click(peer0);
      expect(onSelectPeer).toHaveBeenCalledWith('동탄역시범더샵센트럴시티');
      expect(trackEventSpy).toHaveBeenCalledWith(
        'landing_bounce_defense_click',
        expect.objectContaining({
          action: 'select_peer',
          apt_name: '동탄역 롯데캐슬',
          target_apt_name: '동탄역시범더샵센트럴시티',
          surface: 'apartment_inline_landing',
        })
      );

      // 1:1 compare button
      const compareBtn = screen.getByTestId('landing-quick-compare-btn');
      fireEvent.click(compareBtn);
      expect(onOpenCompare).toHaveBeenCalledWith('동탄역 롯데캐슬', '동탄역시범더샵센트럴시티');

      // Favorite -> Push retention bridge
      const retentionBtn = screen.getByTestId('landing-retention-action-btn');
      expect(retentionBtn).toHaveTextContent('+ 관심단지 담기');
      fireEvent.click(retentionBtn);

      expect(trackEventSpy).toHaveBeenCalledWith(
        'watchlist_toggle_favorite',
        expect.objectContaining({
          apt_name: '동탄역 롯데캐슬',
          is_favorite: true,
          source: 'landing_strip',
          surface: 'apartment_inline_landing',
        })
      );

      // Button immediately transitions into Push alert nudge
      expect(retentionBtn).toHaveTextContent('관심 저장됨 · 변동 알림 켜기');
      fireEvent.click(retentionBtn);

      expect(onOpenPushModal).toHaveBeenCalledTimes(1);
      expect(trackEventSpy).toHaveBeenCalledWith(
        'push_modal_open',
        expect.objectContaining({
          surface: 'apartment_inline_landing',
          trigger: 'post_favorite_nudge',
          apt_name: '동탄역 롯데캐슬',
        })
      );
    });
  });
});
