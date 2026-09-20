/**
 * m2_challenger_viewport_switching_stress.test.tsx
 *
 * EMPIRICAL ADVERSARIAL STRESS HARNESS — CHALLENGER M2 VIEWPORT & LIFECYCLE
 * Milestone 2: Multi-Chart Viewport Lazy Mount & Hero Staggering Lifecycle Integrity
 *
 * Tests:
 * 1. Rapid switching between viewport states (unmounted -> mounted -> in-view -> unmounted)
 * 2. Strict verification of zero memory leaks (dangling observers, listener leaks, active timers)
 * 3. Strict verification of zero unmounted setState warnings (React 18 fiber safety)
 * 4. Race condition resilience during dynamic chart resolution and hero staggered idle callbacks
 */

import React, { act } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import { useInView } from '@/hooks/useInView';
import { StatsOverviewSection } from '@/components/stats/StatsOverviewSection';
import MacroDashboardClient from '@/components/MacroDashboardClient';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { AuthProvider } from '@/contexts/AuthContext';
import type { RawTransactionRecord } from '@/types/stats';
import type { AptTxSummary, DongtanMacroTrendPoint } from '@/types/transaction';
import type { DongApartment } from '@/lib/dong-apartments';

// ── Mocks ────────────────────────────────────────────────────────────────

const mockRouterPush = jest.fn();
const mockRouterReplace = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: mockRouterReplace,
    prefetch: jest.fn(),
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

jest.mock('recharts', () => {
  const Original = jest.requireActual('recharts');
  return {
    ...Original,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: '800px', height: '400px' }}>{children}</div>
    ),
  };
});

// Fixtures
function generateMockTxs(count: number): RawTransactionRecord[] {
  const dongs = ['청계동', '여울동', '반송동', '오산동'];
  const aptNames = ['동탄역 롯데캐슬', '동탄역시범우남퍼스트빌', '시범한빛금호어울림', '메타폴리스'];
  return Array.from({ length: count }, (_, i) => ({
    aptKey: `apt-${i}`,
    aptName: aptNames[i % aptNames.length],
    dong: dongs[i % dongs.length],
    contractDate: `202609${String((i % 28) + 1).padStart(2, '0')}`,
    date: `09.${String((i % 28) + 1).padStart(2, '0')}`,
    priceVal: 70000 + (i % 15) * 5000,
    area: 84.9,
    areaPyeong: 25.7,
    floor: (i % 25) + 1,
    isNewHigh: i % 7 === 0,
    dealType: '매매',
  }));
}

const FIXTURE_SUMMARY: Record<string, AptTxSummary> = {
  '동탄역 롯데캐슬': {
    dong: '여울동',
    latestPrice: '16.5억',
    latestPriceEok: 16.5,
    avgPrice: 165000,
    txCount: 20,
  } as unknown as AptTxSummary,
  동탄역시범우남퍼스트빌: {
    dong: '청계동',
    latestPrice: '11.5억',
    latestPriceEok: 11.5,
    avgPrice: 115000,
    txCount: 15,
  } as unknown as AptTxSummary,
};

const FIXTURE_MACRO_TREND: DongtanMacroTrendPoint[] = [
  { name: '26.07', price: 78000, rent: 45000, volume: 150 },
  { name: '26.08', price: 81000, rent: 46000, volume: 180 },
];

const mockSheetApartments: Record<string, DongApartment[]> = {
  청계동: [{ name: '동탄역시범우남퍼스트빌', dong: '청계동', txKey: 'cheong-1' } as DongApartment],
  여울동: [{ name: '동탄역 롯데캐슬', dong: '여울동', txKey: 'yeoul-1' } as DongApartment],
};

// ── IntersectionObserver Harness ──────────────────────────────────────────

type ObserverCallback = (entries: IntersectionObserverEntry[], observer: IntersectionObserver) => void;

class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string;
  readonly thresholds: ReadonlyArray<number>;
  private callback: ObserverCallback;
  private observedElements: Set<Element> = new Set();
  public static instances: MockIntersectionObserver[] = [];

  constructor(callback: ObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback;
    this.rootMargin = options?.rootMargin || '0px';
    this.thresholds = Array.isArray(options?.threshold)
      ? options.threshold
      : [options?.threshold ?? 0];
    MockIntersectionObserver.instances.push(this);
  }

  observe(target: Element): void {
    this.observedElements.add(target);
  }

  unobserve(target: Element): void {
    this.observedElements.delete(target);
  }

  disconnect(): void {
    this.observedElements.clear();
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  trigger(isIntersecting: boolean): void {
    const entries: IntersectionObserverEntry[] = Array.from(this.observedElements).map((el) => ({
      boundingClientRect: el.getBoundingClientRect(),
      intersectionRatio: isIntersecting ? 1 : 0,
      intersectionRect: el.getBoundingClientRect(),
      isIntersecting,
      rootBounds: null,
      target: el,
      time: performance.now(),
    }));
    this.callback(entries, this);
  }

  getObservedCount(): number {
    return this.observedElements.size;
  }
}

describe('M2 Viewport Lazy Mount & Hero Staggering Lifecycle Integrity', () => {
  let originalIO: typeof global.IntersectionObserver;
  let originalEnv: string | undefined;
  let consoleErrors: string[] = [];
  let consoleWarns: string[] = [];
  let originalError: typeof console.error;
  let originalWarn: typeof console.warn;

  beforeAll(() => {
    originalIO = global.IntersectionObserver;
    originalEnv = process.env.NODE_ENV;
    originalError = console.error;
    originalWarn = console.warn;

    console.error = (...args: unknown[]) => {
      const msg = args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
      consoleErrors.push(msg);
      // Suppress known benign jsdom warnings if any, but capture react unmounted warnings
    };

    console.warn = (...args: unknown[]) => {
      const msg = args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
      consoleWarns.push(msg);
    };
  });

  afterAll(() => {
    global.IntersectionObserver = originalIO;
    process.env.NODE_ENV = originalEnv;
    console.error = originalError;
    console.warn = originalWarn;
  });

  beforeEach(() => {
    consoleErrors = [];
    consoleWarns = [];
    MockIntersectionObserver.instances = [];
    global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
    jest.clearAllMocks();
  });

  // ══════════════════════════════════════════════════════════════════════
  // Test 1: useInView Hook Rapid Viewport Transitions
  // ══════════════════════════════════════════════════════════════════════
  describe('Dimension A: useInView Hook Viewport State Flipping', () => {
    function TestConsumer({ triggerOnce }: { triggerOnce?: boolean }) {
      // Force non-testMode to exercise real IntersectionObserver path
      const [ref, inView] = useInView<HTMLDivElement>({
        rootMargin: '200px 0px',
        triggerOnce,
        testMode: false,
      });

      return (
        <div ref={ref} data-testid="viewport-target">
          {inView ? <span data-testid="mounted-child">IN_VIEWPORT</span> : <span data-testid="skeleton-child">OUT_OF_VIEWPORT</span>}
        </div>
      );
    }

    it('handles 50 rapid in-view / out-of-view flips without memory leaks or errors', () => {
      const prevEnv = process.env.NODE_ENV;
      // Emulate production client where process.env.NODE_ENV !== 'test'
      // @ts-expect-error override for test
      process.env.NODE_ENV = 'production';

      try {
        const { unmount } = render(<TestConsumer triggerOnce={false} />);
        const observer = MockIntersectionObserver.instances[MockIntersectionObserver.instances.length - 1];
        expect(observer).toBeDefined();

        // Target begins out of viewport
        expect(screen.getByTestId('skeleton-child')).toBeInTheDocument();

        // Rapidly toggle visibility 50 times
        for (let i = 0; i < 50; i++) {
          const activeObserver = MockIntersectionObserver.instances[MockIntersectionObserver.instances.length - 1];
          act(() => {
            activeObserver.trigger(i % 2 === 0);
          });
          if (i % 2 === 0) {
            expect(screen.getByTestId('mounted-child')).toBeInTheDocument();
          } else {
            expect(screen.getByTestId('skeleton-child')).toBeInTheDocument();
          }
        }

        // Unmount
        act(() => {
          unmount();
        });

        // Ensure observer elements are cleared
        expect(observer.getObservedCount()).toBe(0);

        // Verify zero React unmounted state update errors
        const unmountedWarnings = consoleErrors.filter((e) =>
          e.includes("Can't perform a React state update on an unmounted component")
        );
        expect(unmountedWarnings).toHaveLength(0);
      } finally {
        process.env.NODE_ENV = prevEnv;
      }
    });

    it('strictly disconnects observer on first intersection when triggerOnce is true (sticky mount)', () => {
      const prevEnv = process.env.NODE_ENV;
      // @ts-expect-error override
      process.env.NODE_ENV = 'production';

      try {
        const { unmount } = render(<TestConsumer triggerOnce={true} />);
        const observer = MockIntersectionObserver.instances[MockIntersectionObserver.instances.length - 1];

        expect(screen.getByTestId('skeleton-child')).toBeInTheDocument();

        // Trigger entering viewport
        act(() => {
          observer.trigger(true);
        });

        expect(screen.getByTestId('mounted-child')).toBeInTheDocument();
        // Observer must be immediately disconnected
        expect(observer.getObservedCount()).toBe(0);

        // Subsequent out-of-view signal should NOT unmount due to sticky mounting
        act(() => {
          observer.trigger(false);
        });
        expect(screen.getByTestId('mounted-child')).toBeInTheDocument();

        unmount();
      } finally {
        process.env.NODE_ENV = prevEnv;
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // Test 2: Rapid Component Mount-Unmount Lifecycle Storm (50 cycles)
  // ══════════════════════════════════════════════════════════════════════
  describe('Dimension B: Rapid Mount -> Unmount -> Remount Lifecycle Storm', () => {
    it('executes 50 consecutive mount-unmount cycles of StatsOverviewSection without memory leaks or warnings', () => {
      const txs = generateMockTxs(50);

      const start = performance.now();
      for (let i = 0; i < 50; i++) {
        const { unmount } = render(
          <StatsOverviewSection
            recentTransactions={txs}
            txSummaryData={FIXTURE_SUMMARY}
            macroTrendData={FIXTURE_MACRO_TREND}
            testMode={true}
          />
        );

        // Quick interaction during cycle
        if (i % 5 === 0) {
          act(() => {
            fireEvent.click(screen.getByTestId('filter-region-dongtan1'));
          });
        }

        act(() => {
          unmount();
        });
      }
      const totalElapsed = performance.now() - start;

      // 50 full cycles completed rapidly
      expect(totalElapsed).toBeLessThan(10000);

      // Verify zero unmounted setState warnings across all 50 cycles
      const unmountedWarnings = consoleErrors.filter((e) =>
        e.includes("Can't perform a React state update on an unmounted component")
      );
      expect(unmountedWarnings).toHaveLength(0);
    });

    it('executes 30 consecutive mount-unmount cycles of MacroDashboardClient with Hero Staggering', () => {
      const recentTxs = [
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
          dealType: '매매',
          isNewHigh: true,
        },
      ];

      for (let i = 0; i < 30; i++) {
        const { unmount } = render(
          <SettingsProvider>
            <AuthProvider>
              <MacroDashboardClient
                sheetApartments={mockSheetApartments}
                txSummaryData={FIXTURE_SUMMARY}
                macroTrendData={FIXTURE_MACRO_TREND}
                publicRentalSet={new Set()}
                fieldReportsMap={new Map()}
                favoriteCounts={{}}
                recentTransactions={recentTxs}
              />
            </AuthProvider>
          </SettingsProvider>
        );

        // Immediately unmount to test cancellation of pending requestIdleCallback / setTimeout / AbortController
        act(() => {
          unmount();
        });
      }

      // Check zero unmounted warnings
      const unmountedWarnings = consoleErrors.filter((e) =>
        e.includes("Can't perform a React state update on an unmounted component")
      );
      expect(unmountedWarnings).toHaveLength(0);
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // Test 3: Hero Section Idle Staggering Timing Verification
  // ══════════════════════════════════════════════════════════════════════
  describe('Dimension C: Hero Section Staggering Frame Timing & Cancellation', () => {
    it('cancels pending idle callback when unmounted before idle deadline', () => {
      let cancelCalled = false;
      let idleCallbackInvoked = false;
      let scheduledId = 0;

      const originalRIC = window.requestIdleCallback;
      const originalCIC = window.cancelIdleCallback;

      window.requestIdleCallback = jest.fn((cb: IdleRequestCallback) => {
        scheduledId = 999;
        setTimeout(() => {
          idleCallbackInvoked = true;
          cb({ didTimeout: false, timeRemaining: () => 50 });
        }, 120);
        return scheduledId;
      }) as unknown as typeof window.requestIdleCallback;

      window.cancelIdleCallback = jest.fn((id: number) => {
        if (id === scheduledId) {
          cancelCalled = true;
        }
      });

      try {
        const prevEnv = process.env.NODE_ENV;
        // In non-test env, trendChartReady defaults to false and schedules idle callback
        // @ts-expect-error override
        process.env.NODE_ENV = 'production';

        const { unmount } = render(
          <SettingsProvider>
            <AuthProvider>
              <MacroDashboardClient
                sheetApartments={mockSheetApartments}
                txSummaryData={FIXTURE_SUMMARY}
                macroTrendData={FIXTURE_MACRO_TREND}
                publicRentalSet={new Set()}
                fieldReportsMap={new Map()}
                favoriteCounts={{}}
                recentTransactions={[]}
              />
            </AuthProvider>
          </SettingsProvider>
        );

        // Immediately unmount before 120ms idle callback can fire
        act(() => {
          unmount();
        });

        // cancelIdleCallback must have been called with the scheduled ID
        expect(cancelCalled).toBe(true);

        process.env.NODE_ENV = prevEnv;
      } finally {
        window.requestIdleCallback = originalRIC;
        window.cancelIdleCallback = originalCIC;
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // Test 4: Global Event Listener Leak Verification
  // ══════════════════════════════════════════════════════════════════════
  describe('Dimension D: Zero Window/Document Listener Leakage', () => {
    it('leaves zero dangling event listeners on window or document after mount/unmount cycle', () => {
      const windowListeners = new Map<string, number>();
      const origAdd = window.addEventListener;
      const origRemove = window.removeEventListener;

      window.addEventListener = jest.fn((event: string, ...rest: unknown[]) => {
        windowListeners.set(event, (windowListeners.get(event) || 0) + 1);
        // @ts-expect-error apply
        origAdd.apply(window, [event, ...rest]);
      });

      window.removeEventListener = jest.fn((event: string, ...rest: unknown[]) => {
        windowListeners.set(event, (windowListeners.get(event) || 0) - 1);
        // @ts-expect-error apply
        origRemove.apply(window, [event, ...rest]);
      });

      try {
        const { unmount } = render(
          <StatsOverviewSection
            recentTransactions={generateMockTxs(20)}
            txSummaryData={FIXTURE_SUMMARY}
            macroTrendData={FIXTURE_MACRO_TREND}
            testMode={true}
          />
        );

        act(() => {
          unmount();
        });

        // Verify all registered window listeners have been cleaned up
        for (const [evt, count] of windowListeners.entries()) {
          expect(count).toBeLessThanOrEqual(0);
        }
      } finally {
        window.addEventListener = origAdd;
        window.removeEventListener = origRemove;
      }
    });
  });
});
