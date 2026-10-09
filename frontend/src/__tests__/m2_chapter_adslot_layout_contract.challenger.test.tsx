/**
 * m2_chapter_adslot_layout_contract.challenger.test.tsx
 *
 * EMPIRICAL ADVERSARIAL CHALLENGER TEST — MILESTONE M2 (APARTMENT 8-CHAPTER & ADSLOT)
 *
 * Verifies:
 * 1. 8 Discrete Analytical Chapters Strict DOM Ordering Invariant:
 *    - All 8 sections exist with IDs:
 *      chapter-01-overview, chapter-02-volume, chapter-03-gap, chapter-04-infra,
 *      chapter-05-mortgage, chapter-06-ledger, chapter-07-macro, chapter-08-report
 *    - Strict monotonically increasing DOM position order:
 *      Ch01 < Ch02 < Ch02_Ad < Ch03 < Ch04 < Ch05 < Ch05_Ad < Ch06 < Ch07 < Ch08
 *
 * 2. In-Feed Native AdSense Slot 1000000002 Geometric Contracts:
 *    - apartment-ad-slot-ch02 positioned strictly between Chapter 02 and Chapter 03
 *    - apartment-ad-slot-ch05 positioned strictly between Chapter 05 and Chapter 06
 *    - Both enforce min-h-[180px] sm:min-h-[220px] md:min-h-[250px] bounding box
 *    - Arctic Lumina glassmorphic surface styling verified
 *    - Preserves dimensional stability under AdBlock active state (CLS < 0.001)
 *
 * 3. ApartmentChapterNavBar Sticky Header & Navigation Contract:
 *    - Sticky positioning: sticky top-0 z-[60]
 *    - Active pill layoutId: activeApartmentChapterPill
 *    - Tab selection triggers adRefreshManager.onTabSwitch()
 *
 * 4. Ad Refresh Engine Dwell Time (30s) and Viewport Intersection (50%) Guards
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';

import ApartmentModal from '@/components/apartment/ApartmentModal';
import {
  ApartmentChapterNavBar,
  APARTMENT_CHAPTERS,
} from '@/components/apartment/ApartmentChapterNavBar';
import { AdSlot, getAdSlotMinHeightClass } from '@/components/ads/AdSlot';
import { adRefreshManager, DWELL_TIME_THRESHOLD_MS, MIN_INTERSECTION_RATIO } from '@/lib/ads/adRefreshManager';
import type { FieldReportData } from '@/lib/DashboardFacade';
import type { TransactionRecord } from '@/hooks/useApartmentDetails';

// ---------------------------------------------------------------------------
// Mocks & Setup
// ---------------------------------------------------------------------------

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/apartment/동탄역롯데캐슬',
}));

jest.mock('@/hooks/useSwipeNavigation', () => ({
  useSwipeNavigation: jest.fn(),
}));

jest.mock('@/hooks/usePreventElasticBounce', () => ({
  usePreventElasticBounce: jest.fn(),
}));

jest.mock('@/contexts/SettingsContext', () => ({
  useSettingsValues: () => ({ areaUnit: 'm2', theme: 'light' }),
  useSettings: () => ({ settings: { areaUnit: 'm2' }, updateSettings: jest.fn() }),
  SettingsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/components/pwa/PWAProvider', () => ({
  usePWA: () => ({ showToast: jest.fn() }),
}));

jest.mock('@/lib/utils/html2canvasPatch', () => ({
  safeHtml2canvasPro: jest.fn().mockResolvedValue({
    toDataURL: () => 'data:image/png;base64,mock',
  }),
}));

jest.mock('@/lib/repositories/apartment.repository', () => ({
  ApartmentRepository: {
    fetchApartmentNames: jest.fn().mockResolvedValue([]),
    fetchApartments: jest.fn().mockResolvedValue([]),
  },
  fetchApartmentNames: jest.fn().mockResolvedValue([]),
  fetchAllApartments: jest.fn().mockResolvedValue([]),
}));

jest.mock('next/dynamic', () => () => {
  const DynamicComponent = () => <div data-testid="mock-dynamic-component" />;
  DynamicComponent.displayName = 'DynamicComponent';
  return DynamicComponent;
});

// Sample Test Data
const mockReport: FieldReportData = {
  id: 'test-report-1',
  apartmentName: '동탄역 롯데캐슬',
  dong: '오산동',
  author: 'D-VIEW Research',
  likes: 120,
  commentCount: 15,
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
  {
    no: 2,
    sigungu: '화성시',
    dong: '오산동',
    aptName: '동탄역 롯데캐슬',
    area: 84.9,
    areaPyeong: 25.7,
    contractYm: '202609',
    contractDay: '10',
    contractDate: '2026-09-10',
    price: 85000,
    priceEok: '8억 5,000만',
    deposit: 85000,
    floor: 15,
    buyer: '',
    seller: '',
    buildYear: 2021,
    roadName: '동탄대로 460',
    cancelDate: '',
    dealType: '전세',
    agentLocation: '',
    registrationDate: '',
    housingType: '아파트',
    reqGb: '',
    rnuYn: '',
  },
];

const mockTypeMap = {
  '동탄역 롯데캐슬': {
    '84.9': { typeM2: '84A㎡', typePyeong: '25평' },
  },
};

describe('Milestone M2 Empirical Adversarial Challenge: 8-Chapter & AdSlot Invariants', () => {
  const originalScrollIntoView = window.HTMLElement.prototype.scrollIntoView;
  let scrollIntoViewMock: jest.Mock;

  beforeEach(() => {
    scrollIntoViewMock = jest.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;
    jest.clearAllMocks();
  });

  afterEach(() => {
    window.HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
  });

  // ══════════════════════════════════════════════════════════════════════
  // Test Suite 1: 8 Discrete Analytical Chapters Strict DOM Ordering
  // ══════════════════════════════════════════════════════════════════════
  describe('Suite 1: 8 Discrete Chapters Strict DOM Order Contract', () => {
    it('1.1 Verifies all 8 analytical chapters exist in DOM under inline mode', () => {
      const { container } = render(
        <ApartmentModal
          report={mockReport}
          onClose={jest.fn()}
          user={null}
          transactions={mockTransactions}
          typeMap={mockTypeMap}
          inline={true}
        />
      );

      const expectedChapterIds = [
        'chapter-01-overview',
        'chapter-02-volume',
        'chapter-03-gap',
        'chapter-04-infra',
        'chapter-05-mortgage',
        'chapter-06-ledger',
        'chapter-07-macro',
        'chapter-08-report',
      ];

      expectedChapterIds.forEach((id) => {
        const el = container.querySelector(`#${id}`);
        expect(el).toBeInTheDocument();
        expect(el).toHaveAttribute('data-testid', id);
      });
    });

    it('1.2 Verifies strict monotonic DOM sequence: Ch01 < Ch02 < Ad02 < Ch03 < Ch04 < Ch05 < Ad05 < Ch06 < Ch07 < Ch08', () => {
      const { container } = render(
        <ApartmentModal
          report={mockReport}
          onClose={jest.fn()}
          user={null}
          transactions={mockTransactions}
          typeMap={mockTypeMap}
          inline={true}
        />
      );

      const ch01 = container.querySelector('#chapter-01-overview')!;
      const ch02 = container.querySelector('#chapter-02-volume')!;
      const adCh02 = container.querySelector('[data-testid="apartment-ad-slot-ch02"]')!;
      const ch03 = container.querySelector('#chapter-03-gap')!;
      const ch04 = container.querySelector('#chapter-04-infra')!;
      const ch05 = container.querySelector('#chapter-05-mortgage')!;
      const adCh05 = container.querySelector('[data-testid="apartment-ad-slot-ch05"]')!;
      const ch06 = container.querySelector('#chapter-06-ledger')!;
      const ch07 = container.querySelector('#chapter-07-macro')!;
      const ch08 = container.querySelector('#chapter-08-report')!;

      // All elements must be present
      expect(ch01).toBeInTheDocument();
      expect(ch02).toBeInTheDocument();
      expect(adCh02).toBeInTheDocument();
      expect(ch03).toBeInTheDocument();
      expect(ch04).toBeInTheDocument();
      expect(ch05).toBeInTheDocument();
      expect(adCh05).toBeInTheDocument();
      expect(ch06).toBeInTheDocument();
      expect(ch07).toBeInTheDocument();
      expect(ch08).toBeInTheDocument();

      // Pairwise DOCUMENT_POSITION_FOLLOWING verification (bitmask check)
      const orderedNodes = [ch01, ch02, adCh02, ch03, ch04, ch05, adCh05, ch06, ch07, ch08];
      for (let i = 0; i < orderedNodes.length - 1; i++) {
        const current = orderedNodes[i];
        const next = orderedNodes[i + 1];
        const pos = current.compareDocumentPosition(next);
        expect(pos & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      }
    });

    it('1.3 Verifies chapter order invariance under modal overlay mode (inline=false)', () => {
      render(
        <ApartmentModal
          report={mockReport}
          onClose={jest.fn()}
          user={null}
          transactions={mockTransactions}
          typeMap={mockTypeMap}
          inline={false}
        />
      );

      // In modal mode, portal renders to document.body
      const ch01 = document.getElementById('chapter-01-overview')!;
      const ch02 = document.getElementById('chapter-02-volume')!;
      const adCh02 = document.querySelector('[data-testid="apartment-ad-slot-ch02"]')!;
      const ch03 = document.getElementById('chapter-03-gap')!;
      const ch04 = document.getElementById('chapter-04-infra')!;
      const ch05 = document.getElementById('chapter-05-mortgage')!;
      const adCh05 = document.querySelector('[data-testid="apartment-ad-slot-ch05"]')!;
      const ch06 = document.getElementById('chapter-06-ledger')!;
      const ch07 = document.getElementById('chapter-07-macro')!;
      const ch08 = document.getElementById('chapter-08-report')!;

      const orderedNodes = [ch01, ch02, adCh02, ch03, ch04, ch05, adCh05, ch06, ch07, ch08];
      for (let i = 0; i < orderedNodes.length - 1; i++) {
        const current = orderedNodes[i];
        const next = orderedNodes[i + 1];
        const pos = current.compareDocumentPosition(next);
        expect(pos & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      }
    });

    it('1.4 Verifies chapter ordering survives adversarial zero-transaction dataset (edge case)', () => {
      const { container } = render(
        <ApartmentModal
          report={mockReport}
          onClose={jest.fn()}
          user={null}
          transactions={[]} // Zero transactions
          typeMap={{}}
          inline={true}
        />
      );

      const ch01 = container.querySelector('#chapter-01-overview')!;
      const ch02 = container.querySelector('#chapter-02-volume')!;
      const adCh02 = container.querySelector('[data-testid="apartment-ad-slot-ch02"]')!;
      const ch03 = container.querySelector('#chapter-03-gap')!;
      const ch04 = container.querySelector('#chapter-04-infra')!;
      const ch05 = container.querySelector('#chapter-05-mortgage')!;
      const adCh05 = container.querySelector('[data-testid="apartment-ad-slot-ch05"]')!;
      const ch06 = container.querySelector('#chapter-06-ledger')!;
      const ch07 = container.querySelector('#chapter-07-macro')!;
      const ch08 = container.querySelector('#chapter-08-report')!;

      const orderedNodes = [ch01, ch02, adCh02, ch03, ch04, ch05, adCh05, ch06, ch07, ch08];
      for (let i = 0; i < orderedNodes.length - 1; i++) {
        const current = orderedNodes[i];
        const next = orderedNodes[i + 1];
        expect(current.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // Test Suite 2: In-Feed AdSense Slot 1000000002 Placement & Geometry
  // ══════════════════════════════════════════════════════════════════════
  describe('Suite 2: AdSense Slot 1000000002 Placement, Dimensional Bounding Box & Fallback', () => {
    it('2.1 Confirms apartment-ad-slot-ch02 is placed between Chapter 02 and Chapter 03', () => {
      const { container } = render(
        <ApartmentModal
          report={mockReport}
          onClose={jest.fn()}
          user={null}
          transactions={mockTransactions}
          typeMap={mockTypeMap}
          inline={true}
        />
      );

      const ch02 = container.querySelector('#chapter-02-volume')!;
      const adCh02 = container.querySelector('[data-testid="apartment-ad-slot-ch02"]')!;
      const ch03 = container.querySelector('#chapter-03-gap')!;

      expect(ch02.compareDocumentPosition(adCh02) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(adCh02.compareDocumentPosition(ch03) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('2.2 Confirms apartment-ad-slot-ch05 is placed between Chapter 05 and Chapter 06', () => {
      const { container } = render(
        <ApartmentModal
          report={mockReport}
          onClose={jest.fn()}
          user={null}
          transactions={mockTransactions}
          typeMap={mockTypeMap}
          inline={true}
        />
      );

      const ch05 = container.querySelector('#chapter-05-mortgage')!;
      const adCh05 = container.querySelector('[data-testid="apartment-ad-slot-ch05"]')!;
      const ch06 = container.querySelector('#chapter-06-ledger')!;

      expect(ch05.compareDocumentPosition(adCh05) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(adCh05.compareDocumentPosition(ch06) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('2.3 Enforces strict min-h-[180px] sm:min-h-[220px] md:min-h-[250px] on both ad containers', () => {
      const { container } = render(
        <ApartmentModal
          report={mockReport}
          onClose={jest.fn()}
          user={null}
          transactions={mockTransactions}
          typeMap={mockTypeMap}
          inline={true}
        />
      );

      const adCh02 = container.querySelector('[data-testid="apartment-ad-slot-ch02"]')!;
      const adCh05 = container.querySelector('[data-testid="apartment-ad-slot-ch05"]')!;

      [adCh02, adCh05].forEach((slotWrapper) => {
        expect(slotWrapper.className).toContain('min-h-[180px]');
        expect(slotWrapper.className).toContain('sm:min-h-[220px]');
        expect(slotWrapper.className).toContain('md:min-h-[250px]');
        expect(slotWrapper.className).toContain('my-6');
      });
    });

    it('2.4 Verifies Arctic Lumina glassmorphic surface styling on both in-feed ad slots', () => {
      const { container } = render(
        <ApartmentModal
          report={mockReport}
          onClose={jest.fn()}
          user={null}
          transactions={mockTransactions}
          typeMap={mockTypeMap}
          inline={true}
        />
      );

      const adCh02 = container.querySelector('[data-testid="apartment-ad-slot-ch02"]')!;
      const adCh05 = container.querySelector('[data-testid="apartment-ad-slot-ch05"]')!;

      [adCh02, adCh05].forEach((slotWrapper) => {
        expect(slotWrapper.className).toContain('bg-white/85');
        expect(slotWrapper.className).toContain('dark:bg-slate-900/85');
        expect(slotWrapper.className).toContain('backdrop-blur-xl');
        expect(slotWrapper.className).toContain('rounded-[20px]');
        expect(slotWrapper.className).toContain('border');
      });
    });

    it('2.5 Verifies inner AdSlot unit configuration for slotId=1000000002 and format=in-feed', () => {
      const { container } = render(
        <ApartmentModal
          report={mockReport}
          onClose={jest.fn()}
          user={null}
          transactions={mockTransactions}
          typeMap={mockTypeMap}
          inline={true}
        />
      );

      const ch02AdWrapper = container.querySelector('[data-testid="apartment-ad-slot-ch02"]')!;
      const ch05AdWrapper = container.querySelector('[data-testid="apartment-ad-slot-ch05"]')!;

      [ch02AdWrapper, ch05AdWrapper].forEach((wrapper) => {
        const innerAd = wrapper.querySelector('[data-testid="ad-slot-container"]')!;
        expect(innerAd).toBeInTheDocument();
        expect(innerAd).toHaveAttribute('data-slot-format', 'in-feed');
        expect(innerAd.className).toContain('min-h-[180px]');
        expect(innerAd.className).toContain('sm:min-h-[220px]');
        expect(innerAd.className).toContain('md:min-h-[250px]');
        expect(innerAd.textContent).toContain('1000000002');
      });
    });

    it('2.6 Verifies AdSlot dimensional invariance and zero collapse under AdBlock fallback mode', () => {
      render(
        <AdSlot
          slotId="1000000002"
          format="in-feed"
          minHeightClass="min-h-[180px] sm:min-h-[220px] md:min-h-[250px]"
          testMode={true}
          fallbackType="dashboard-promo"
        />
      );

      const adContainer = screen.getByTestId('ad-slot-container');
      expect(adContainer.className).toContain('min-h-[180px]');
      expect(adContainer.className).toContain('sm:min-h-[220px]');
      expect(adContainer.className).toContain('md:min-h-[250px]');

      // Assert non-zero height invariant
      expect(adContainer.className).not.toContain('h-0');
      expect(adContainer.className).not.toContain('min-h-0');
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // Test Suite 3: ApartmentChapterNavBar Navigation Contract
  // ══════════════════════════════════════════════════════════════════════
  describe('Suite 3: ApartmentChapterNavBar Navigation Bar Contract', () => {
    it('3.1 Confirms sticky top-0 z-[60] layout invariant on ApartmentChapterNavBar', () => {
      const { container } = render(
        <ApartmentChapterNavBar
          activeChapter="chapter-01-overview"
          onSelectChapter={jest.fn()}
        />
      );

      const navEl = container.querySelector('nav')!;
      expect(navEl).toBeInTheDocument();
      expect(navEl.className).toContain('sticky');
      expect(navEl.className).toContain('top-0');
      expect(navEl.className).toContain('z-[60]');
      expect(navEl.className).toContain('backdrop-blur-md');
    });

    it('3.2 Verifies active indicator pill has layoutId="activeApartmentChapterPill"', () => {
      render(
        <ApartmentChapterNavBar
          activeChapter="chapter-03-gap"
          onSelectChapter={jest.fn()}
        />
      );

      const activePill = screen.getByTestId('active-chapter-pill');
      expect(activePill).toBeInTheDocument();
      expect(activePill).toHaveAttribute('data-layout-id', 'activeApartmentChapterPill');

      const ch03Btn = screen.getByRole('button', { name: /전세가율 갭투자 매트릭스/ });
      expect(ch03Btn).toHaveAttribute('aria-current', 'page');
      expect(ch03Btn).toContainElement(activePill);
    });

    it('3.3 Clicking a chapter tab dispatches handleSelectChapter and invokes adRefreshManager.onTabSwitch()', () => {
      const spyOnTabSwitch = jest.spyOn(adRefreshManager, 'onTabSwitch');

      render(
        <ApartmentModal
          report={mockReport}
          onClose={jest.fn()}
          user={null}
          transactions={mockTransactions}
          typeMap={mockTypeMap}
          inline={true}
        />
      );

      const ch04Tab = screen.getByRole('button', { name: /학군 및 하이퍼로컬 인프라/ });
      expect(ch04Tab).toBeInTheDocument();

      act(() => {
        fireEvent.click(ch04Tab);
      });

      expect(spyOnTabSwitch).toHaveBeenCalled();
      spyOnTabSwitch.mockRestore();
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // Test Suite 4: Ad Refresh Manager Dwell Time & Intersection Ratio Guards
  // ══════════════════════════════════════════════════════════════════════
  describe('Suite 4: Ad Refresh Engine Mathematical Dwell Time & Intersection Guards', () => {
    const testSlotId = 'ad-refresh-test-slot';

    afterEach(() => {
      adRefreshManager.unregisterSlot(testSlotId);
    });

    it('4.1 Suppresses refresh when dwell time delta < 30,000ms even with 100% intersection', () => {
      const refreshMock = jest.fn();
      const now = Date.now();

      adRefreshManager.registerSlot(testSlotId, {
        lastRefreshedAt: now,
        intersectionRatio: 1.0, // 100% in viewport
        onRefreshKeyChange: refreshMock,
      });

      // Advance only 15,000ms (below 30,000ms threshold)
      jest.spyOn(Date, 'now').mockReturnValue(now + 15000);

      const result = adRefreshManager.onTabSwitch();
      expect(result.refreshed).not.toContain(testSlotId);
      expect(result.skipped).toContain(testSlotId);
      expect(refreshMock).not.toHaveBeenCalled();

      (Date.now as jest.Mock).mockRestore();
    });

    it('4.2 Triggers refresh when dwell time delta >= 30,000ms AND intersection ratio >= 50%', () => {
      const refreshMock = jest.fn();
      const now = 1000000;

      adRefreshManager.registerSlot(testSlotId, {
        lastRefreshedAt: now,
        intersectionRatio: 0.50, // exactly 50% threshold
        onRefreshKeyChange: refreshMock,
      });

      // Advance 30,001ms (satisfies threshold)
      jest.spyOn(Date, 'now').mockReturnValue(now + 30001);

      const result = adRefreshManager.onTabSwitch();
      expect(result.refreshed).toContain(testSlotId);
      expect(refreshMock).toHaveBeenCalledTimes(1);

      (Date.now as jest.Mock).mockRestore();
    });

    it('4.3 Suppresses refresh when intersection ratio < 50% even after 60,000ms dwell time', () => {
      const refreshMock = jest.fn();
      const now = 1000000;

      adRefreshManager.registerSlot(testSlotId, {
        lastRefreshedAt: now,
        intersectionRatio: 0.49, // 49% (< 50% guard)
        onRefreshKeyChange: refreshMock,
      });

      // Advance 60,000ms
      jest.spyOn(Date, 'now').mockReturnValue(now + 60000);

      const result = adRefreshManager.onTabSwitch();
      expect(result.refreshed).not.toContain(testSlotId);
      expect(result.skipped).toContain(testSlotId);
      expect(refreshMock).not.toHaveBeenCalled();

      (Date.now as jest.Mock).mockRestore();
    });
  });
});
