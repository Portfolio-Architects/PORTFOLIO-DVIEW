import { renderHook, act } from '@testing-library/react';
import { useAptComparison } from './hooks/useAptComparison';
import type { DongApartment } from '@/lib/dong-apartments';
import type { AptTxSummary } from '@/lib/types/transaction';

// Mock localStorage
const mockLocalStorageStore: Record<string, string> = {};
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: jest.fn((key: string) => mockLocalStorageStore[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      mockLocalStorageStore[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete mockLocalStorageStore[key];
    }),
    clear: jest.fn(() => {
      Object.keys(mockLocalStorageStore).forEach(key => delete mockLocalStorageStore[key]);
    }),
  },
  writable: true,
});

describe('useAptComparison Empirical Challenger Stress Suite', () => {
  const apt1: DongApartment = {
    name: '동탄역반도유보라아이비파크',
    dong: '오산동',
    brand: '반도유보라',
    householdCount: 900,
    yearBuilt: '2017',
  };

  const apt2: DongApartment = {
    name: '동탄역린스트라우스',
    dong: '청계동',
    brand: '린스트라우스',
    householdCount: 1100,
    yearBuilt: '2019',
  };

  const apt3: DongApartment = {
    name: '동탄더샵레이크에듀타운',
    dong: '산척동',
    brand: '더샵',
    householdCount: 1538,
    yearBuilt: '2021',
  };

  const mockSheet: Record<string, DongApartment[]> = {
    '오산동': [apt1],
    '청계동': [apt2],
    '산척동': [apt3],
  };

  const mockTx: Record<string, AptTxSummary> = {
    '동탄역반도유보라아이비파크': {
      avg3MPrice: 105000,
      avg3MRentDeposit: 52000,
      avg3MPerPyeong: 3100,
      dong: '오산동',
    },
    '동탄역린스트라우스': {
      avg3MPrice: 120000,
      avg3MRentDeposit: 60000,
      avg3MPerPyeong: 3600,
      dong: '청계동',
    },
    '동탄더샵레이크에듀타운': {
      avg3MPrice: 95000,
      avg3MRentDeposit: 48000,
      avg3MPerPyeong: 2800,
      dong: '산척동',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(mockLocalStorageStore).forEach(k => delete mockLocalStorageStore[k]);
  });

  describe('EC-1: Rapid Apartment Switching & Concurrent Invariants', () => {
    it('handles 100 rapid consecutive apartment switches without unhandled rejections or race condition leaks', async () => {
      const abortSignals: AbortSignal[] = [];
      const fetchResolvers: Array<() => void> = [];

      global.fetch = jest.fn((url: string, init?: RequestInit) => {
        if (init?.signal) {
          abortSignals.push(init.signal);
        }
        return new Promise(resolve => {
          fetchResolvers.push(() =>
            resolve({
              ok: true,
              json: () =>
                Promise.resolve([
                  { contractYm: '202601', price: 100000, dealType: '매매', areaPyeong: 33 },
                ]),
            } as Response)
          );
        });
      }) as any;

      const { result } = renderHook(() =>
        useAptComparison({
          isOpen: true,
          sheetApartments: mockSheet,
          txSummaryData: mockTx,
        })
      );

      // Perform 100 rapid alternations between apt1, apt2, apt3, null
      const aptSequence = [apt1, apt2, apt3, null];
      for (let i = 0; i < 100; i++) {
        act(() => {
          result.current.setApt1(aptSequence[i % 4]);
        });
      }

      // Final selection is explicitly set to apt3
      act(() => {
        result.current.setApt1(apt3);
      });

      // Verify that all prior fetch calls except the last one have aborted signals
      const abortedCount = abortSignals.filter(s => s.aborted).length;
      expect(abortedCount).toBeGreaterThanOrEqual(abortSignals.length - 1);

      // Resolve the final fetch
      await act(async () => {
        if (fetchResolvers.length > 0) {
          fetchResolvers[fetchResolvers.length - 1]();
        }
      });

      expect(result.current.apt1?.name).toBe('동탄더샵레이크에듀타운');
      expect(result.current.isTxLoading1).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('EC-2: Empty Initial Options & Extreme Boundary Invariants', () => {
    it('executes useAptComparison() with undefined options safely', () => {
      const { result } = renderHook(() => useAptComparison());
      expect(result.current.apartments).toEqual([]);
      expect(result.current.apt1).toBeNull();
      expect(result.current.apt2).toBeNull();
      expect(result.current.radarDataPoints).toEqual([]);
      expect(result.current.combinedChartData).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('executes useAptComparison({}) with empty object safely', () => {
      const { result } = renderHook(() => useAptComparison({}));
      expect(result.current.apartments).toEqual([]);
      expect(result.current.apt1).toBeNull();
      expect(result.current.apt2).toBeNull();
    });

    it('handles isOpen: false gracefully without loading recent apartments or quiz', () => {
      mockLocalStorageStore['dview_compare_recent'] = JSON.stringify(['동탄역반도유보라아이비파크']);
      const { result } = renderHook(() =>
        useAptComparison({
          isOpen: false,
          sheetApartments: mockSheet,
        })
      );
      expect(result.current.recentApts).toEqual([]);
      expect(result.current.quizAnswers).toBeNull();
    });

    it('handles completely empty sheetApartments record', () => {
      const { result } = renderHook(() =>
        useAptComparison({
          isOpen: true,
          sheetApartments: {},
          txSummaryData: {},
          nameMapping: {},
        })
      );
      expect(result.current.apartments).toEqual([]);
      expect(result.current.dropdownOptions1).toEqual([]);
      expect(result.current.radarDataPoints).toEqual([]);
    });

    it('handles initialAptIds with empty array []', () => {
      const { result } = renderHook(() =>
        useAptComparison({
          isOpen: true,
          initialAptIds: [],
          sheetApartments: mockSheet,
        })
      );
      expect(result.current.apt1).toBeNull();
      expect(result.current.apt2).toBeNull();
    });

    it('handles initialAptIds with invalid/non-existent IDs', () => {
      const { result } = renderHook(() =>
        useAptComparison({
          isOpen: true,
          initialAptIds: ['존재하지않는단지1', '존재하지않는단지2'],
          sheetApartments: mockSheet,
        })
      );
      expect(result.current.apt1).toBeNull();
      expect(result.current.apt2).toBeNull();
      expect(result.current.apartments).toEqual([]);
    });

    it('handles initialAptIds with mixed valid and invalid IDs', () => {
      const { result } = renderHook(() =>
        useAptComparison({
          isOpen: true,
          initialAptIds: ['동탄역린스트라우스', '미존재단지'],
          sheetApartments: mockSheet,
        })
      );
      expect(result.current.apt1?.name).toBe('동탄역린스트라우스');
      expect(result.current.apt2).toBeNull();
      expect(result.current.apartments.length).toBe(1);
    });

    it('handles non-existent initialAptName', () => {
      const { result } = renderHook(() =>
        useAptComparison({
          isOpen: true,
          initialAptName: '환상의단지',
          sheetApartments: mockSheet,
        })
      );
      expect(result.current.apt1).toBeNull();
      expect(result.current.apt2).toBeNull();
    });
  });

  describe('EC-3: Re-render Loop & Maximum Update Depth Stress', () => {
    it('survives parent re-renders when sheetApartments is memoized with 2 initial apartments', () => {
      let renderCount = 0;
      const { result, rerender } = renderHook(
        ({ tick }) => {
          renderCount++;
          return useAptComparison({
            isOpen: true,
            sheetApartments: mockSheet,
            txSummaryData: mockTx,
            initialAptIds: ['동탄역반도유보라아이비파크', '동탄역린스트라우스'],
          });
        },
        { initialProps: { tick: 0 } }
      );

      for (let i = 1; i <= 20; i++) {
        rerender({ tick: i });
      }

      expect(renderCount).toBeGreaterThanOrEqual(21);
      expect(result.current.apt1?.name).toBe('동탄역반도유보라아이비파크');
      expect(result.current.apt2?.name).toBe('동탄역린스트라우스');
    });

    it('survives unmemoized sheetApartments when single initialAptName is provided', () => {
      let renderCount = 0;
      const { result, rerender } = renderHook(
        ({ tick }) => {
          renderCount++;
          return useAptComparison({
            isOpen: true,
            sheetApartments: { ...mockSheet },
            txSummaryData: mockTx,
            initialAptName: '동탄역반도유보라아이비파크',
          });
        },
        { initialProps: { tick: 0 } }
      );

      for (let i = 1; i <= 20; i++) {
        rerender({ tick: i });
      }

      expect(renderCount).toBeGreaterThanOrEqual(21);
      expect(result.current.apt1?.name).toBe('동탄역반도유보라아이비파크');
    });

    it('mathematically demonstrates the ping-pong oscillation vulnerability in saveToRecent with >=2 initial apartments', () => {
      // Simulation of saveToRecent updater sequence in effect 415
      const simulateSaveToRecent = (prev: string[], apt: string) => {
        const filtered = prev.filter(a => a !== apt);
        const updated = [apt, ...filtered].slice(0, 5);
        const isEqual = prev.length === updated.length && prev.every((p, idx) => p === updated[idx]);
        return { updated, isEqual, stateChanged: !isEqual };
      };

      const state0 = ['동탄역린스트라우스', '동탄역반도유보라아이비파크'];

      // Step 1: saveToRecent(firstApt)
      const step1 = simulateSaveToRecent(state0, '동탄역반도유보라아이비파크');
      expect(step1.updated).toEqual(['동탄역반도유보라아이비파크', '동탄역린스트라우스']);
      expect(step1.stateChanged).toBe(true); // Equality guard bypassed!

      // Step 2: saveToRecent(secondApt)
      const step2 = simulateSaveToRecent(step1.updated, '동탄역린스트라우스');
      expect(step2.updated).toEqual(['동탄역린스트라우스', '동탄역반도유보라아이비파크']);
      expect(step2.stateChanged).toBe(true); // Equality guard bypassed!

      // Step 3: Next render under unmemoized sheetApartments re-triggers effect 415
      const step3 = simulateSaveToRecent(step2.updated, '동탄역반도유보라아이비파크');
      expect(step3.updated).toEqual(['동탄역반도유보라아이비파크', '동탄역린스트라우스']);
      expect(step3.stateChanged).toBe(true); // Permanent oscillation confirmed!
    });
  });

  describe('EC-4: Input Sanitization & Special Characters in Autocomplete', () => {
    it('safely filters options with regex meta-characters without throwing SyntaxError', () => {
      const { result } = renderHook(() =>
        useAptComparison({
          isOpen: true,
          sheetApartments: mockSheet,
        })
      );

      const maliciousQueries = [
        '[a-z]+',
        '.*',
        '(.*)',
        '\\',
        '?+*',
        '^$|',
        '{1,3}',
        '<script>alert("xss")</script>',
        "' OR '1'='1",
      ];

      maliciousQueries.forEach(query => {
        act(() => {
          result.current.setSearchQuery1(query);
        });
        expect(Array.isArray(result.current.dropdownOptions1)).toBe(true);
      });
    });
  });

  describe('EC-5: Keyboard Navigation Boundary Resilience', () => {
    it('guards against division by zero in ArrowDown/ArrowUp when options are empty', () => {
      const { result } = renderHook(() =>
        useAptComparison({
          isOpen: true,
          sheetApartments: {},
        })
      );

      act(() => {
        result.current.setIsFocused1(true);
      });

      const mockEventDown = {
        key: 'ArrowDown',
        preventDefault: jest.fn(),
      } as unknown as React.KeyboardEvent<HTMLInputElement>;

      const mockEventUp = {
        key: 'ArrowUp',
        preventDefault: jest.fn(),
      } as unknown as React.KeyboardEvent<HTMLInputElement>;

      expect(() => {
        act(() => {
          result.current.handleKeyDown1(mockEventDown);
          result.current.handleKeyDown1(mockEventUp);
        });
      }).not.toThrow();

      expect(result.current.activeIndex1).toBe(-1);
    });

    it('correctly cycles through single-option dropdown with ArrowDown and ArrowUp', () => {
      const singleSheet = { '오산동': [apt1] };
      const { result } = renderHook(() =>
        useAptComparison({
          isOpen: true,
          sheetApartments: singleSheet,
        })
      );

      act(() => {
        result.current.setIsFocused1(true);
      });

      const mockEventDown = {
        key: 'ArrowDown',
        preventDefault: jest.fn(),
      } as unknown as React.KeyboardEvent<HTMLInputElement>;

      act(() => {
        result.current.handleKeyDown1(mockEventDown);
      });
      // (-1 + 1) % 1 = 0
      expect(result.current.activeIndex1).toBe(0);

      act(() => {
        result.current.handleKeyDown1(mockEventDown);
      });
      // (0 + 1) % 1 = 0
      expect(result.current.activeIndex1).toBe(0);
    });
  });

  describe('EC-6: Lifecycle Cleanup & Event Detachment', () => {
    it('mounts and unmounts 50 hook instances cleanly without event listener accumulation', () => {
      const addSpy = jest.spyOn(window, 'addEventListener');
      const removeSpy = jest.spyOn(window, 'removeEventListener');

      for (let i = 0; i < 50; i++) {
        const { unmount } = renderHook(() =>
          useAptComparison({
            isOpen: true,
            sheetApartments: mockSheet,
          })
        );
        unmount();
      }

      const added = addSpy.mock.calls.filter(c => c[0] === 'drive_quiz_answers_changed').length;
      const removed = removeSpy.mock.calls.filter(c => c[0] === 'drive_quiz_answers_changed').length;

      expect(added).toBe(50);
      expect(removed).toBe(50);

      addSpy.mockRestore();
      removeSpy.mockRestore();
    });
  });
});
