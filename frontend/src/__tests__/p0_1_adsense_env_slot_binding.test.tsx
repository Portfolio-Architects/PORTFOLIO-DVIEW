import fs from 'fs';
import path from 'path';
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

import { AdSlot, resolveDefaultAdSenseSlotId } from '@/components/ads/AdSlot';
import * as AdBlockDetectorHook from '@/hooks/useAdBlockDetector';
import { adRefreshManager } from '@/lib/ads/adRefreshManager';
import {
  FilterBottomAdBanner,
  MidFeedAdBanner,
  RankingBreakAdBanner,
  BottomAnchorAdBanner,
} from '@/components/stats/StatsAdBanners';
import ApartmentModal from '@/components/apartment/ApartmentModal';
import MacroDashboardClient from '@/components/MacroDashboardClient';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { AuthProvider } from '@/contexts/AuthContext';
import type { FieldReportData } from '@/lib/DashboardFacade';
import type { TransactionRecord } from '@/hooks/useApartmentDetails';
import type { DongApartment } from '@/lib/dong-apartments';
import type { AptTxSummary, DongtanMacroTrendPoint } from '@/types';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

jest.mock('@/hooks/useSwipeNavigation', () => ({
  useSwipeNavigation: jest.fn(),
}));

jest.mock('@/hooks/usePreventElasticBounce', () => ({
  usePreventElasticBounce: jest.fn(),
}));

jest.mock('@/components/pwa/PWAProvider', () => ({
  usePWA: () => ({ showToast: jest.fn() }),
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

jest.mock('@/lib/services/logger', () => ({
  logger: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const VERCEL_PROD_ENV = {
  NODE_ENV: 'production' as const,
  NEXT_PUBLIC_ADSENSE_CLIENT_ID: 'ca-pub-7777777777777777',
  NEXT_PUBLIC_ADSENSE_SLOT_LOUNGE_DETAIL: '8100000011',
  NEXT_PUBLIC_ADSENSE_SLOT_APT_MODAL: '8200000022',
  NEXT_PUBLIC_ADSENSE_SLOT_GAP_EXPLORER: '8300000033',
  NEXT_PUBLIC_ADSENSE_SLOT_ANCHOR: '8400000044',
  NEXT_PUBLIC_ADSENSE_SLOT_DASHBOARD_BOTTOM: '8500000055',
};

const mockReport: FieldReportData = {
  id: 'report-1',
  apartmentName: '동탄역 롯데캐슬',
  dong: '오산동',
  author: 'D-VIEW Research',
  likes: 42,
  commentCount: 5,
  metrics: {
    householdCount: 940,
    parkingPerHousehold: 1.45,
    elementarySchool: '청계초등학교',
    middleSchool: '청계중학교',
    highSchool: '동탄고등학교',
    subwayStation: '동탄역 (SRT/GTX-A)',
    subwayDistanceKm: 0.15,
  },
  images: [],
};

const mockTransactions: TransactionRecord[] = [
  {
    no: 1,
    sigungu: '화성시',
    dong: '오산동',
    aptName: '동탄역 롯데캐슬',
    area: 84.9,
    areaPyeong: 25.7,
    contractYm: '202609',
    contractDay: '15',
    contractDate: '2026-09-15',
    price: 165000,
    priceEok: '16억 5,000만',
    floor: 20,
    buyer: '',
    seller: '',
    buildYear: 2021,
    roadName: '동탄대로 460',
    cancelDate: '',
    dealType: '매매',
    agentLocation: '',
    registrationDate: '',
    housingType: '아파트',
    reqGb: '',
    rnuYn: '',
  },
];

const mockSheetApartments: Record<string, DongApartment[]> = {
  여울동: [{ name: '동탄역 롯데캐슬', dong: '여울동', txKey: 'yeoul-1' } as DongApartment],
};

const mockTxSummaryData: Record<string, AptTxSummary> = {
  '동탄역 롯데캐슬': {
    dong: '여울동',
    latestPrice: '16.5억',
    latestPriceEok: 16.5,
    avgPrice: 165000,
    txCount: 15,
  } as unknown as AptTxSummary,
};

const mockMacroTrendData: DongtanMacroTrendPoint[] = [
  { name: '26.07', price: 78000, rent: 45000, volume: 150 },
  { name: '26.08', price: 81000, rent: 46000, volume: 180 },
];

const mockRecentTransactions = [
  {
    aptName: '동탄역 롯데캐슬',
    txKey: 'tx-1',
    date: '09.15',
    contractDate: '20260915',
    priceVal: 16.5,
    priceEok: '16억 5,000만',
    area: 84.9,
    areaPyeong: 25.7,
    floor: 20,
    dong: '여울동',
    dealType: '매매',
    isNewHigh: true,
  },
];

function collectProductionSourceFiles(dirPath: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === '__mocks__') continue;
      results.push(...collectProductionSourceFiles(fullPath));
    } else if (
      (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) &&
      !entry.name.includes('.test.') &&
      !entry.name.includes('.spec.')
    ) {
      results.push(fullPath);
    }
  }
  return results;
}

describe('P0-1 AdSense Dummy Slot ID Removal & Direct Vercel Env Var Binding', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    adRefreshManager.reset();
    process.env = {
      ...originalEnv,
      ...VERCEL_PROD_ENV,
    };
    jest.spyOn(AdBlockDetectorHook, 'useAdBlockDetector').mockReturnValue({
      isAdBlockActive: false,
      isLoading: false,
    });
    (window as unknown as { adsbygoogle?: unknown[] }).adsbygoogle = [];
  });

  afterEach(() => {
    cleanup();
    adRefreshManager.reset();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('1. Format-to-Vercel-Environment-Variable Direct Resolution', () => {
    it('maps all 5 AdSlotFormat types directly to their corresponding NEXT_PUBLIC_ADSENSE_SLOT_* env vars', () => {
      expect(resolveDefaultAdSenseSlotId('in-feed')).toBe('8100000011');
      expect(resolveDefaultAdSenseSlotId('banner')).toBe('8200000022');
      expect(resolveDefaultAdSenseSlotId('rectangle')).toBe('8300000033');
      expect(resolveDefaultAdSenseSlotId('horizontal-strip')).toBe('8400000044');
      expect(resolveDefaultAdSenseSlotId('auto')).toBe('8500000055');
      expect(resolveDefaultAdSenseSlotId(undefined)).toBe('8500000055');
    });

    it('renders <ins class="adsbygoogle" data-ad-slot="..."> with the exact Vercel env var for every format', () => {
      const formatCases = [
        { format: 'in-feed' as const, expectedSlot: '8100000011' },
        { format: 'banner' as const, expectedSlot: '8200000022' },
        { format: 'rectangle' as const, expectedSlot: '8300000033' },
        { format: 'horizontal-strip' as const, expectedSlot: '8400000044' },
        { format: 'auto' as const, expectedSlot: '8500000055' },
      ];

      for (const { format, expectedSlot } of formatCases) {
        const { container, unmount } = render(<AdSlot format={format} />);
        const ins = container.querySelector('ins.adsbygoogle');
        expect(ins).toBeInTheDocument();
        expect(ins).toHaveAttribute('data-ad-client', 'ca-pub-7777777777777777');
        expect(ins).toHaveAttribute('data-ad-slot', expectedSlot);
        unmount();
      }
    });

    it('handles empty, whitespace-only, or unset env vars gracefully without emitting empty data-ad-slot', () => {
      process.env = {
        ...originalEnv,
        NODE_ENV: 'production',
        NEXT_PUBLIC_ADSENSE_CLIENT_ID: 'ca-pub-7777777777777777',
        NEXT_PUBLIC_ADSENSE_SLOT_LOUNGE_DETAIL: '   ',
        NEXT_PUBLIC_ADSENSE_SLOT_APT_MODAL: '',
        NEXT_PUBLIC_ADSENSE_SLOT_GAP_EXPLORER: '\t\n',
        NEXT_PUBLIC_ADSENSE_SLOT_ANCHOR: '',
        NEXT_PUBLIC_ADSENSE_SLOT_DASHBOARD_BOTTOM: '  8500000055  ',
      };

      expect(resolveDefaultAdSenseSlotId('in-feed')).toBe('8500000055');
      expect(resolveDefaultAdSenseSlotId('rectangle')).toBe('8500000055');
      expect(resolveDefaultAdSenseSlotId('horizontal-strip')).toBe('8500000055');

      const { container, unmount } = render(<AdSlot format="in-feed" slotId="   " />);
      const ins = container.querySelector('ins.adsbygoogle');
      expect(ins).toHaveAttribute('data-ad-slot', '8500000055');
      unmount();

      // Ultimate fallback when all 5 slot env vars are unset
      delete process.env.NEXT_PUBLIC_ADSENSE_SLOT_DASHBOARD_BOTTOM;
      expect(resolveDefaultAdSenseSlotId('in-feed')).toBe('6782594447');
    });

    it('normalizes whitespace-only or padded refreshSlotId without breaking AdRefreshManager observation or leaking on unmount', () => {
      const pushMock = jest.fn();
      (window as unknown as { adsbygoogle: { push: jest.Mock } }).adsbygoogle = { push: pushMock };

      // 1. Whitespace-only refreshSlotId should fall back to effectiveSlotId ('8100000011') and trigger initial push
      const { unmount: unmountWhitespace } = render(
        <AdSlot format="in-feed" refreshSlotId="   " />
      );
      expect(adRefreshManager.getState('8100000011')).toBeDefined();
      expect(adRefreshManager.getState('8100000011')?.isPushed).toBe(true);
      expect(pushMock).toHaveBeenCalledTimes(1);
      unmountWhitespace();
      expect(adRefreshManager.getState('8100000011')?.status).toBe('IDLE');

      // 2. Padded refreshSlotId should register and unobserve under trimmed key
      const { unmount: unmountPadded } = render(
        <AdSlot format="in-feed" refreshSlotId="  padded_slot_key  " />
      );
      expect(adRefreshManager.getState('padded_slot_key')).toBeDefined();
      expect(adRefreshManager.getState('padded_slot_key')?.isPushed).toBe(true);
      expect(pushMock).toHaveBeenCalledTimes(2);
      unmountPadded();
      expect(adRefreshManager.getState('padded_slot_key')?.status).toBe('IDLE');
    });
  });

  describe('2. Production Component Live DOM Verification (StatsAdBanners, ApartmentModal, MacroDashboardClient)', () => {
    it('binds all 4 StatsAdBanners directly to Vercel env vars in production while registering distinct refreshSlotId keys', () => {
      const { container } = render(
        <div>
          <FilterBottomAdBanner testMode={false} />
          <MidFeedAdBanner testMode={false} />
          <RankingBreakAdBanner testMode={false} />
          <BottomAnchorAdBanner testMode={false} />
        </div>
      );

      const filterIns = screen
        .getByTestId('ad-placement-filter-bottom')
        .querySelector('ins.adsbygoogle');
      const midIns = screen
        .getByTestId('ad-placement-mid-feed')
        .querySelector('ins.adsbygoogle');
      const rankIns = screen
        .getByTestId('ad-placement-ranking-break')
        .querySelector('ins.adsbygoogle');
      const bottomIns = screen
        .getByTestId('ad-placement-bottom-anchor')
        .querySelector('ins.adsbygoogle');

      expect(filterIns).toHaveAttribute('data-ad-slot', '8400000044');
      expect(midIns).toHaveAttribute('data-ad-slot', '8100000011');
      expect(rankIns).toHaveAttribute('data-ad-slot', '8100000011');
      expect(bottomIns).toHaveAttribute('data-ad-slot', '8200000022');

      expect(container.innerHTML).not.toContain('stat-slot-');
      expect(adRefreshManager.getState('stat-slot-filter-bottom')).toBeDefined();
      expect(adRefreshManager.getState('stat-slot-mid-feed')).toBeDefined();
      expect(adRefreshManager.getState('stat-slot-ranking-break')).toBeDefined();
      expect(adRefreshManager.getState('stat-slot-bottom-anchor')).toBeDefined();
    });

    it('binds ApartmentModal Chapter 02, Chapter 05, and bottom banner AdSlots to Vercel env vars while preserving recirculation refreshSlotId keys', () => {
      const { container } = render(
        <SettingsProvider>
          <ApartmentModal
            report={mockReport}
            onClose={jest.fn()}
            user={null}
            transactions={mockTransactions}
            typeMap={new Map()}
            inline={true}
          />
        </SettingsProvider>
      );

      const ch02Ins = container.querySelector(
        '[data-testid="apartment-ad-slot-ch02"] ins.adsbygoogle'
      );
      const ch05Ins = container.querySelector(
        '[data-testid="apartment-ad-slot-ch05"] ins.adsbygoogle'
      );
      const bottomIns = container.querySelector(
        '[data-testid="apartment-modal-ad-slot"] ins.adsbygoogle'
      );

      expect(ch02Ins).toHaveAttribute('data-ad-slot', '8100000011');
      expect(ch05Ins).toHaveAttribute('data-ad-slot', '8100000011');
      expect(bottomIns).toHaveAttribute('data-ad-slot', '8200000022');

      expect(adRefreshManager.getState('1000000002_ch02')).toBeDefined();
      expect(adRefreshManager.getState('1000000002_ch05')).toBeDefined();
    });

    it('binds MacroDashboardClient Hero, Timeline, and Finance AdSlots directly to Vercel env vars without dummy 1000000001/2/3 IDs', () => {
      const { container } = render(
        <SettingsProvider>
          <AuthProvider>
            <MacroDashboardClient
              sheetApartments={mockSheetApartments}
              txSummaryData={mockTxSummaryData}
              macroTrendData={mockMacroTrendData}
              publicRentalSet={new Set()}
              fieldReportsMap={new Map()}
              favoriteCounts={{}}
              recentTransactions={mockRecentTransactions as never}
            />
          </AuthProvider>
        </SettingsProvider>
      );

      const heroIns = container.querySelector('[data-testid="hero-ad-slot-1"] ins.adsbygoogle');
      const timelineIns = container.querySelector(
        '[data-testid="timeline-infeed-ad-slot"] ins.adsbygoogle'
      );
      const financeIns = container.querySelector(
        '[data-testid="finance-ad-slot-2"] ins.adsbygoogle'
      );

      expect(heroIns).toHaveAttribute('data-ad-slot', '8100000011');
      expect(timelineIns).toHaveAttribute('data-ad-slot', '8100000011');
      expect(financeIns).toHaveAttribute('data-ad-slot', '8100000011');

      const allDataAdSlots = Array.from(container.querySelectorAll('ins.adsbygoogle')).map((el) =>
        el.getAttribute('data-ad-slot')
      );
      expect(allDataAdSlots).not.toContain('1000000001');
      expect(allDataAdSlots).not.toContain('1000000002');
      expect(allDataAdSlots).not.toContain('1000000003');
    });
  });

  describe('3. Repository-Wide Production Source Guardrail', () => {
    it('guarantees zero <AdSlot slotId=...> overrides or dummy slotId props across all non-test files in src/components and src/app', () => {
      const srcRoot = path.resolve(__dirname, '..');
      const prodFiles = [
        ...collectProductionSourceFiles(path.join(srcRoot, 'components')),
        ...collectProductionSourceFiles(path.join(srcRoot, 'app')),
      ];

      expect(prodFiles.length).toBeGreaterThan(50);

      const violations: string[] = [];
      const dummyPatterns = [
        /\bslotId\s*=\s*["']100000000/,
        /\bslotId\s*=\s*["']stat-slot-/,
        /\binFeedAdSlotId\s*=\s*["']100000000/,
        /<AdSlot\b[^>]*\bslotId\s*=/,
      ];

      for (const filePath of prodFiles) {
        const content = fs.readFileSync(filePath, 'utf8');
        for (const pattern of dummyPatterns) {
          if (pattern.test(content)) {
            violations.push(`${path.relative(srcRoot, filePath)} matched ${pattern}`);
          }
        }
      }

      expect(violations).toEqual([]);
    });
  });
});
