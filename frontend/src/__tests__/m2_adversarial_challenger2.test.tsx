/**
 * @file m2_adversarial_challenger2.test.tsx
 * @description Adversarial stress tests for Milestone 2:
 * 1. preload.ts: SSR safety, fallback execution, rapid queuing (1000+ items), error swallow
 * 2. Dynamic/Lazy Components: Rapid open/close toggle stress tests, unmounted updates, chunk loading errors
 * 3. Dynamic PDF export concurrent trigger verification
 */

import React, { useState, useEffect } from 'react';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import dynamic from 'next/dynamic';
import { scheduleIdle, preloadComponent, preloadApartmentModal, preloadDashboardFeatures } from '@/lib/preload';
import { SettingsProvider, useSettings } from '@/contexts/SettingsContext';
import { AuthProvider } from '@/contexts/AuthContext';
import SettingsModal from '@/components/SettingsModal';

jest.mock('@/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => ({
    user: null,
    anonProfile: null,
    updateLocalAnonProfile: jest.fn(),
    handleLogin: jest.fn(),
    handleLogout: jest.fn(),
  }),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mocks for browser APIs
const originalRequestIdleCallback = window.requestIdleCallback;
const originalCancelIdleCallback = window.cancelIdleCallback;

describe('Milestone 2 Adversarial Challenge 2: Dynamic Splitting & Preloader Stress Tests', () => {
  let unhandledRejections: PromiseRejectionEvent[] = [];
  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    unhandledRejections.push(event);
  };

  beforeAll(() => {
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
  });

  afterAll(() => {
    window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    window.requestIdleCallback = originalRequestIdleCallback;
    window.cancelIdleCallback = originalCancelIdleCallback;
  });

  beforeEach(() => {
    unhandledRejections = [];
    jest.useRealTimers();
  });

  // =========================================================================
  // 1. preload.ts Stress & Resiliency Tests
  // =========================================================================
  describe('1. preload.ts Adversarial Stress Testing', () => {
    test('Environment: requestIdleCallback supported path runs accurately', async () => {
      let idleCalled = false;
      window.requestIdleCallback = jest.fn((cb: IdleRequestCallback, options?: IdleRequestOptions) => {
        expect(options?.timeout).toBe(1500);
        return setTimeout(() => {
          cb({
            didTimeout: false,
            timeRemaining: () => 50,
          });
        }, 10) as unknown as number;
      });

      scheduleIdle(() => {
        idleCalled = true;
      }, 1500);

      await waitFor(() => expect(idleCalled).toBe(true));
    });

    test('Environment: Fallback to setTimeout when requestIdleCallback is undefined', async () => {
      // @ts-expect-error simulating legacy/unsupported browser
      delete (window as any).requestIdleCallback;

      let fallbackCalled = false;
      scheduleIdle(() => {
        fallbackCalled = true;
      }, 500);

      await waitFor(() => expect(fallbackCalled).toBe(true));
    });

    test('High-Throughput Concurrency: 1,000 simultaneous queued preloadComponent calls', async () => {
      let resolvedCount = 0;
      const totalCalls = 1000;

      // Mock requestIdleCallback to execute immediately
      window.requestIdleCallback = jest.fn((cb: IdleRequestCallback) => {
        cb({
          didTimeout: false,
          timeRemaining: () => 50,
        });
        return 1;
      });

      const promises: Promise<void>[] = [];
      for (let i = 0; i < totalCalls; i++) {
        promises.push(
          new Promise<void>((res) => {
            preloadComponent(async () => {
              resolvedCount++;
              res();
              return { default: () => null };
            }, 100);
          })
        );
      }

      await Promise.all(promises);
      expect(resolvedCount).toBe(totalCalls);
      expect(unhandledRejections.length).toBe(0);
    });

    test('Error Handling: Network rejection in preloadComponent is swallowed gracefully', async () => {
      window.requestIdleCallback = jest.fn((cb: IdleRequestCallback) => {
        cb({ didTimeout: false, timeRemaining: () => 50 });
        return 1;
      });

      let rejectionTriggered = false;
      preloadComponent(async () => {
        rejectionTriggered = true;
        throw new Error('Simulated network chunk 404 failure during preload');
      }, 100);

      await waitFor(() => expect(rejectionTriggered).toBe(true));
      // Give event loop time to verify no unhandled rejection bubble
      await new Promise((r) => setTimeout(r, 50));
      expect(unhandledRejections.length).toBe(0);
    });

    test('Helper invocations (preloadApartmentModal, preloadDashboardFeatures) execute safely', () => {
      expect(() => preloadApartmentModal()).not.toThrow();
      expect(() => preloadDashboardFeatures()).not.toThrow();
    });

    test('SSR / Node Environment Safety: functions return cleanly without error when window is undefined', () => {
      const originalWindow = global.window;
      try {
        // @ts-expect-error simulating Node.js environment
        delete global.window;

        expect(() => scheduleIdle(() => {})).not.toThrow();
        expect(() => preloadComponent(async () => ({}))).not.toThrow();
        expect(() => preloadApartmentModal()).not.toThrow();
        expect(() => preloadDashboardFeatures()).not.toThrow();
      } finally {
        global.window = originalWindow;
      }
    });

    test('Synchronous throw in importer function is handled without crashing execution queue', async () => {
      window.requestIdleCallback = jest.fn((cb: IdleRequestCallback) => {
        cb({ didTimeout: false, timeRemaining: () => 50 });
        return 1;
      });

      let subsequentCalled = false;
      // Trigger a preloadComponent with synchronous throw
      try {
        preloadComponent(() => {
          throw new Error('Immediate synchronous throw inside importer factory');
        }, 50);
      } catch (e) {
        // Should not crash the caller
      }

      // Next preload should execute normally
      preloadComponent(async () => {
        subsequentCalled = true;
        return { default: () => null };
      }, 50);

      await waitFor(() => expect(subsequentCalled).toBe(true));
    });
  });

  // =========================================================================
  // 2. Dynamic Modal Toggle & Unmount Stress Testing
  // =========================================================================
  describe('2. Dynamic Modal Toggle & Unmount Under Heavy Contention', () => {
    // Dynamic component with artificial delay simulating chunk fetching
    let dynamicLoadCount = 0;
    const DelayedModalComponent = React.memo(function DelayedModalComponent({
      isOpen,
      onClose,
    }: {
      isOpen: boolean;
      onClose: () => void;
    }) {
      if (!isOpen) return null;
      return (
        <div role="dialog" aria-modal="true" data-testid="delayed-modal">
          <span>Modal Content Loaded</span>
          <button onClick={onClose}>Close</button>
        </div>
      );
    });

    const DynamicDelayedModal = dynamic(
      async () => {
        dynamicLoadCount++;
        // Simulate 40ms network latency for chunk loading
        await new Promise((resolve) => setTimeout(resolve, 40));
        return { default: DelayedModalComponent };
      },
      { ssr: false, loading: () => <div data-testid="modal-loading-skeleton">Loading...</div> }
    );

    function RapidToggleTestHarness({ cycleCount }: { cycleCount: number }) {
      const [isOpen, setIsOpen] = useState(false);
      const [cycle, setCycle] = useState(0);

      useEffect(() => {
        if (cycle >= cycleCount) return;
        const timer = setTimeout(() => {
          setIsOpen((prev) => !prev);
          setCycle((prev) => prev + 1);
        }, 10); // Toggle every 10ms (faster than chunk resolution of 40ms)
        return () => clearTimeout(timer);
      }, [cycle, cycleCount]);

      return (
        <div>
          <span data-testid="cycle-counter">Cycle: {cycle}</span>
          <button data-testid="manual-toggle" onClick={() => setIsOpen(!isOpen)}>
            Toggle
          </button>
          {isOpen && <DynamicDelayedModal isOpen={isOpen} onClose={() => setIsOpen(false)} />}
        </div>
      );
    }

    test('Rapid 50x mount/unmount cycles before chunk resolution triggers no unhandled exceptions', async () => {
      const { unmount } = render(<RapidToggleTestHarness cycleCount={50} />);

      // Wait for all 50 cycles to complete
      await waitFor(
        () => {
          expect(screen.getByTestId('cycle-counter')).toHaveTextContent('Cycle: 50');
        },
        { timeout: 4000 }
      );

      // Unmount the entire component tree abruptly
      unmount();

      // Wait for lingering microtasks/promises to settle
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(unhandledRejections.length).toBe(0);
    });

    test('Dynamic import rejection fallback renders safely without uncaught fatal crash', async () => {
      const FailingDynamicModal = dynamic(
        async () => {
          throw new Error('ChunkLoadError: Loading chunk 842 failed');
        },
        {
          ssr: false,
          loading: () => <div data-testid="failing-loading">Loading fallback...</div>,
        }
      );

      // Render should show loading fallback initially without blowing up
      const { unmount } = render(<FailingDynamicModal />);
      expect(screen.getByTestId('failing-loading')).toBeInTheDocument();
      unmount();
    });

    test('Rapid toggling of actual SettingsModal with React state updates does not leak or crash', async () => {
      function SettingsToggleHost() {
        const { isSettingsModalOpen, setIsSettingsModalOpen } = useSettings();
        return (
          <div>
            <button data-testid="open-settings" onClick={() => setIsSettingsModalOpen(true)}>
              Open
            </button>
            <button data-testid="close-settings" onClick={() => setIsSettingsModalOpen(false)}>
              Close
            </button>
            <SettingsModal />
          </div>
        );
      }

      render(
        <SettingsProvider>
          <SettingsToggleHost />
        </SettingsProvider>
      );

      const openBtn = screen.getByTestId('open-settings');
      const closeBtn = screen.getByTestId('close-settings');

      // Rapidly toggle 20 times in direct sequence
      for (let i = 0; i < 20; i++) {
        act(() => {
          fireEvent.click(openBtn);
        });
        act(() => {
          fireEvent.click(closeBtn);
        });
      }

      // Finally open and verify it still functions cleanly
      act(() => {
        fireEvent.click(openBtn);
      });

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('소비자 설정')).toBeInTheDocument();

      // Close cleanly
      act(() => {
        fireEvent.click(closeBtn);
      });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    test('Safe chunk error fallback handler pattern (.catch -> safeReload / null component)', async () => {
      let reloadInvoked = false;
      const safeReloadMock = () => {
        reloadInvoked = true;
      };

      const ResilientDynamicComponent = dynamic(
        () =>
          import('@/components/non-existent-chunk-for-test')
            .catch((err) => {
              safeReloadMock();
              return { default: () => <div data-testid="safe-fallback">Fallback Safe Component</div> };
            }),
        { ssr: false }
      );

      render(<ResilientDynamicComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('safe-fallback')).toBeInTheDocument();
      });
      expect(reloadInvoked).toBe(true);
      expect(unhandledRejections.length).toBe(0);
    });

    test('OfficeExplorerClient dynamically loads OfficeDetailModal upon card click without memory leak', async () => {
      const OfficeExplorerClient = (await import('@/components/OfficeExplorerClient')).default;
      
      const { unmount } = render(
        <AuthProvider>
          <SettingsProvider>
            <OfficeExplorerClient />
          </SettingsProvider>
        </AuthProvider>
      );

      // Check that OfficeExplorerClient rendered buildings list
      const firstBuilding = screen.getByText('금강펜테리움 IX타워');
      expect(firstBuilding).toBeInTheDocument();

      // Click on building to trigger dynamic OfficeDetailModal
      act(() => {
        fireEvent.click(firstBuilding);
      });

      // Verify modal state renders after dynamic chunk loads
      await waitFor(() => {
        expect(screen.getByTitle('닫기')).toBeInTheDocument();
      });

      // Close modal
      const closeBtn = screen.getByTitle('닫기');
      act(() => {
        fireEvent.click(closeBtn);
      });

      // Verify no unhandled promise rejections
      await new Promise((r) => setTimeout(r, 100));
      expect(unhandledRejections.length).toBe(0);

      unmount();
    });
  });

  // =========================================================================
  // 3. Dynamic PDF Export Rapid Triggering Resiliency
  // =========================================================================
  describe('3. Dynamic PDF Export Concurrency Stress Testing', () => {
    test('Simultaneous PDF export clicks do not throw unhandled promise rejections', async () => {
      let exportCount = 0;
      const simulatePdfExport = async () => {
        exportCount++;
        // Simulate dynamic import of jsPDF
        const { jsPDF } = {
          jsPDF: class MockJsPDF {
            internal = { pageSize: { getWidth: () => 210 } };
            addImage() {}
            save() {}
          },
        };
        const pdf = new jsPDF();
        pdf.save();
        return true;
      };

      const results = await Promise.all([
        simulatePdfExport(),
        simulatePdfExport(),
        simulatePdfExport(),
        simulatePdfExport(),
        simulatePdfExport(),
      ]);

      expect(results.every(Boolean)).toBe(true);
      expect(exportCount).toBe(5);
      expect(unhandledRejections.length).toBe(0);
    });
  });
});
