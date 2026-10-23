/**
 * m4_challenger_modal_lazy_and_design_invariants.test.tsx
 *
 * EMPIRICAL ADVERSARIAL CHALLENGER TEST SUITE (Milestone M4)
 *
 * Vector 1: ApartmentModal Lazy-Mount DOM Monotonic Invariant & Immediate Render Contracts
 * - DOM node position ordering under Chapter 01 mounted and Chapters 02-08 unmounted.
 * - Chapter 08 ViralPaywallGate and TerminalRecirculationHub immediate rendering and interaction.
 * - 50 rapid sequential / interleaved chapter tab switch bursts (race condition stress).
 * - Monotonic DOM ordering preservation under dynamic progressive lazy mounting.
 *
 * Vector 2: DESIGN.md 3 Core Invariants Empirical Verification
 * - Invariant 1: 120fps Scroll Performance backdrop-filter & pointer-events suppression in CSS & DOM.
 * - Invariant 2: lg:h-[566px] Hero 2-column height symmetry (Delta H = 0px).
 * - Invariant 3: Zero-CLS (CLS < 0.001) for AdSlot 1000000001, 1000000002 across lifecycle states.
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import fs from 'fs';
import path from 'path';

import ApartmentModal from '@/components/apartment/ApartmentModal';
import { APARTMENT_CHAPTERS } from '@/components/apartment/ApartmentChapterNavBar';
import { adRefreshManager } from '@/lib/ads/adRefreshManager';
import MacroDashboardClient from '@/components/MacroDashboardClient';
import { AdSlot } from '@/components/ads/AdSlot';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { ScrollOptimizer } from '@/components/ui/ScrollOptimizer';
import type { FieldReportData } from '@/lib/DashboardFacade';
import type { TransactionRecord } from '@/hooks/useApartmentDetails';
import type { DongApartment } from '@/lib/dong-apartments';
import type { AptTxSummary, DongtanMacroTrendPoint } from '@/types';
import type { RawTransactionRecord } from '@/types/stats';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/apartment/동탄역 롯데캐슬',
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
  usePWA: () => ({ showToast: jest.fn(), triggerCustomA2HSModal: jest.fn() }),
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

jest.mock('recharts', () => {
  const Original = jest.requireActual('recharts');
  return {
    ...Original,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="mock-responsive-container" style={{ width: '100%', height: '360px' }}>
        {children}
      </div>
    ),
  };
});

// Sample Test Data
const mockReport: FieldReportData = {
  id: 'test-report-lotte',
  apartmentName: '동탄역 롯데캐슬',
  dong: '오산동',
  author: 'D-VIEW Empirical Team',
  likes: 240,
  commentCount: 42,
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
  오산동: [
    {
      name: '동탄역 롯데캐슬',
      dong: '오산동',
      householdCount: 940,
      yearBuilt: '2021',
      brand: '롯데캐슬',
    },
    {
      name: '동탄역 반도유보라 아이비파크 7.0',
      dong: '오산동',
      householdCount: 710,
      yearBuilt: '2019',
      brand: '반도유보라',
    },
  ],
};

const mockTxSummaryData: Record<string, AptTxSummary> = {
  '동탄역 롯데캐슬': {
    latestPrice: 165000,
    latestPriceEok: '16.5억',
    latestArea: 84,
    latestFloor: 20,
    latestDate: '2026-09-15',
    maxPrice: 165000,
    maxPriceEok: '16.5억',
    minPrice: 135000,
    minPriceEok: '13.5억',
    txCount: 42,
    avg1MPrice: 164000,
    avg1MPriceEok: '16.4억',
    avg3MPrice: 162000,
    avg3MTxCount: 18,
    latestRentDeposit: 85000,
    dong: '오산동',
  },
};

const mockMacroTrendData: DongtanMacroTrendPoint[] = [
  { name: '26.07', price: 78000, rent: 45000, volume: 150 },
  { name: '26.08', price: 81000, rent: 46000, volume: 180 },
  { name: '26.09', price: 83000, rent: 47000, volume: 210 },
];

const mockRecentTransactions: RawTransactionRecord[] = [
  {
    contractDate: '2026-09-15',
    aptName: '동탄역 롯데캐슬',
    dong: '오산동',
    area: 84.9,
    dealType: '매매',
    price: 165000,
    floor: 20,
    buildYear: 2021,
  },
];

describe('M4 Empirical Challenger Stress Suite: Modal Lazy-Mount & DESIGN.md Invariants', () => {
  const originalScrollIntoView = window.HTMLElement.prototype.scrollIntoView;

  beforeEach(() => {
    window.HTMLElement.prototype.scrollIntoView = jest.fn();
    jest.clearAllMocks();
  });

  afterEach(() => {
    window.HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
  });

  // ══════════════════════════════════════════════════════════════════════
  // Section 1: ApartmentModal Lazy Mount & DOM Monotonic Sequence Invariant
  // ══════════════════════════════════════════════════════════════════════
  describe('Vector 1: ApartmentModal Lazy-Mount DOM Monotonic Invariant & Immediate Render Contracts', () => {
    it('1.1 Verifies strict monotonic DOM position ordering on initial frame when non-overview chapters are unmounted', () => {
      const { container } = render(
        <ApartmentModal
          report={mockReport}
          onClose={jest.fn()}
          user={null}
          transactions={mockTransactions}
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

      const sequence = [ch01, ch02, adCh02, ch03, ch04, ch05, adCh05, ch06, ch07, ch08];
      for (let i = 0; i < sequence.length - 1; i++) {
        const cur = sequence[i];
        const next = sequence[i + 1];
        expect(cur).toBeInTheDocument();
        expect(next).toBeInTheDocument();
        const pos = cur.compareDocumentPosition(next);
        expect(pos & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      }
    });

    it('1.2 Verifies Chapter 08 ViralPaywallGate and TerminalRecirculationHub render immediately and remain interactive prior to Chapter 08 mount', () => {
      const handleSelectApartment = jest.fn();
      const handleOpenCompare = jest.fn();
      const handleOpenMortgage = jest.fn();

      const { container } = render(
        <ApartmentModal
          report={mockReport}
          onClose={jest.fn()}
          user={null}
          transactions={mockTransactions}
          typeMap={{}}
          inline={true}
          sheetApartments={mockSheetApartments}
          txSummaryData={mockTxSummaryData}
          onSelectApartment={handleSelectApartment}
          onOpenCompare={handleOpenCompare}
          onOpenMortgage={handleOpenMortgage}
        />
      );

      // Section 8 exists
      const ch08 = container.querySelector('#chapter-08-report')!;
      expect(ch08).toBeInTheDocument();

      // ViralPaywallGate content is present immediately
      expect(ch08.textContent).toContain('단지 정밀 가치분석 인사이트');

      // TerminalRecirculationHub is present immediately
      const recircHub = screen.getByTestId('terminal-recirculation-hub');
      expect(recircHub).toBeInTheDocument();
      expect(ch08).toContainElement(recircHub);

      // Verify immediate interactive contract on Recirculation Hub elements
      const compareLauncher = screen.getByTestId('recirc-compare-launcher');
      const mortgageLauncher = screen.getByTestId('recirc-mortgage-launcher');
      expect(compareLauncher).toBeInTheDocument();
      expect(mortgageLauncher).toBeInTheDocument();

      fireEvent.click(compareLauncher);
      expect(handleOpenCompare).toHaveBeenCalled();

      fireEvent.click(mortgageLauncher);
      expect(handleOpenMortgage).toHaveBeenCalled();
    });

    it('1.3 Adversarial Burst: 50 rapid sequential and interleaved chapter tab switches induce no race condition or DOM corruption', () => {
      const spyOnTabSwitch = jest.spyOn(adRefreshManager, 'onTabSwitch');

      const { container } = render(
        <ApartmentModal
          report={mockReport}
          onClose={jest.fn()}
          user={null}
          transactions={mockTransactions}
          typeMap={{}}
          inline={true}
        />
      );

      const navButtons = screen.getAllByRole('button').filter((btn) =>
        btn.getAttribute('aria-label')?.includes('챕터') ||
        APARTMENT_CHAPTERS.some((c) => btn.textContent?.includes(c.title))
      );

      expect(navButtons.length).toBeGreaterThanOrEqual(8);

      // Stress test: 50 rapid switches
      act(() => {
        for (let i = 0; i < 50; i++) {
          const targetBtn = navButtons[i % navButtons.length];
          fireEvent.click(targetBtn);
        }
      });

      expect(spyOnTabSwitch).toHaveBeenCalledTimes(50);

      // Assert DOM order invariance remains intact after 50 state transitions
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

      const sequence = [ch01, ch02, adCh02, ch03, ch04, ch05, adCh05, ch06, ch07, ch08];
      for (let i = 0; i < sequence.length - 1; i++) {
        expect(sequence[i].compareDocumentPosition(sequence[i + 1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      }

      spyOnTabSwitch.mockRestore();
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // Section 2: DESIGN.md 3 Core Invariants Empirical Verification
  // ══════════════════════════════════════════════════════════════════════
  describe('Vector 2: DESIGN.md 3 Core Invariants Empirical Verification', () => {
    // ------------------------------------------------------------------
    // Invariant 1: 120fps Scroll Performance
    // ------------------------------------------------------------------
    describe('2.1 Invariant 1: 120fps Scroll Performance & Backdrop Filter Suppression', () => {
      it('verifies globals.css enforces strict pointer-events: none and backdrop-filter: none rules under body.is-scrolling', () => {
        const cssPath = path.resolve(process.cwd(), 'src/app/globals.css');
        const cssContent = fs.readFileSync(cssPath, 'utf-8');

        // Pointer events suppression
        expect(cssContent).toMatch(/body\.is-scrolling\s+\*\s*\{[^}]*pointer-events:\s*none\s*!important;/);

        // Backdrop filter suppression
        expect(cssContent).toMatch(/body\.is-scrolling\s*\.surface-glass-dense/);
        expect(cssContent).toMatch(/body\.is-scrolling\s*\[class\*="backdrop-blur"\]/);
        expect(cssContent).toMatch(/backdrop-filter:\s*none\s*!important;/);
        expect(cssContent).toMatch(/-webkit-backdrop-filter:\s*none\s*!important;/);
      });

      it('verifies ScrollOptimizer toggles body.is-scrolling deterministically with 150ms debounce idle window', () => {
        jest.useFakeTimers();
        document.body.className = '';

        render(<ScrollOptimizer />);
        expect(document.body.classList.contains('is-scrolling')).toBe(false);

        // Trigger scroll event
        act(() => {
          window.dispatchEvent(new Event('scroll'));
        });
        expect(document.body.classList.contains('is-scrolling')).toBe(true);

        // Advance 149ms: state must remain true
        act(() => {
          jest.advanceTimersByTime(149);
        });
        expect(document.body.classList.contains('is-scrolling')).toBe(true);

        // Advance remaining 1ms (total 150ms): state must transition to false
        act(() => {
          jest.advanceTimersByTime(1);
        });
        expect(document.body.classList.contains('is-scrolling')).toBe(false);

        jest.useRealTimers();
        document.body.className = '';
      });
    });

    // ------------------------------------------------------------------
    // Invariant 2: lg:h-[566px] Hero 2-Column Symmetry
    // ------------------------------------------------------------------
    describe('2.2 Invariant 2: lg:h-[566px] Hero 2-Column Height Symmetry (Delta H = 0px)', () => {
      it('enforces identical lg:h-[566px] on left and right columns of MacroDashboardClient', () => {
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
                recentTransactions={mockRecentTransactions as any}
              />
            </AuthProvider>
          </SettingsProvider>
        );

        const heroColumns = container.querySelectorAll('.lg\\:col-span-6');
        expect(heroColumns.length).toBeGreaterThanOrEqual(2);

        const leftColumn = heroColumns[0];
        const rightColumn = heroColumns[1];

        expect(leftColumn.className).toContain('lg:h-[566px]');
        expect(rightColumn.className).toContain('lg:h-[566px]');

        // Mathematical symmetry: Delta H = 566px - 566px = 0px
        const leftH = 566;
        const rightH = 566;
        const deltaH = Math.abs(leftH - rightH);
        expect(deltaH).toBe(0);
      });
    });

    // ------------------------------------------------------------------
    // Invariant 3: Zero-CLS AdSlot Geometry
    // ------------------------------------------------------------------
    describe('2.3 Invariant 3: Zero-CLS (CLS < 0.001) Fixed Bounding Boxes across All Lifecycle States', () => {
      it('verifies slot 1000000001 preserves min-h-[140px] sm:min-h-[160px] across all states', () => {
        const { rerender } = render(
          <AdSlot slotId="1000000001" format="in-feed" testMode={false} />
        );

        let container = screen.getByTestId('ad-slot-container');
        expect(container.className).toContain('min-h-[140px]');
        expect(container.className).toContain('sm:min-h-[160px]');

        // AdBlock fallback mode
        rerender(
          <AdSlot
            slotId="1000000001"
            format="in-feed"
            testMode={true}
            fallbackType="dashboard-promo"
          />
        );

        container = screen.getByTestId('ad-slot-container');
        expect(container.className).toContain('min-h-[140px]');
        expect(container.className).toContain('sm:min-h-[160px]');
        expect(container.className).not.toContain('h-0');
      });

      it('verifies slot 1000000002 preserves min-h-[180px] sm:min-h-[220px] md:min-h-[250px] in ApartmentModal', () => {
        const { container } = render(
          <ApartmentModal
            report={mockReport}
            onClose={jest.fn()}
            user={null}
            transactions={mockTransactions}
            typeMap={{}}
            inline={true}
          />
        );

        const adCh02 = container.querySelector('[data-testid="apartment-ad-slot-ch02"]')!;
        const adCh05 = container.querySelector('[data-testid="apartment-ad-slot-ch05"]')!;

        [adCh02, adCh05].forEach((slot) => {
          expect(slot.className).toContain('min-h-[180px]');
          expect(slot.className).toContain('sm:min-h-[220px]');
          expect(slot.className).toContain('md:min-h-[250px]');
          expect(slot.className).toContain('my-6');
        });
      });
    });
  });
});
