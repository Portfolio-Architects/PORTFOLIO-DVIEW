import { renderHook, act } from '@testing-library/react';
import { useAptComparison } from './hooks/useAptComparison';
import type { DongApartment } from '@/lib/dong-apartments';
import type { AptTxSummary, LocationScoreItem } from '@/lib/types/transaction';

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

describe('useAptComparison Adversarial Empirical Stress Harness', () => {
  const aptAlpha: DongApartment = {
    name: '화성동탄알파단지',
    dong: '오산동',
    brand: '알파자이',
    householdCount: 1200,
    yearBuilt: '2020',
  };

  const aptBeta: DongApartment = {
    name: '화성동탄베타단지',
    dong: '청계동',
    brand: '베타더샵',
    householdCount: 900,
    yearBuilt: '2016',
  };

  const aptGamma: DongApartment = {
    name: '화성동탄감마단지',
    dong: '송동',
    brand: '감마푸르지오',
    householdCount: 1500,
    yearBuilt: '2023',
  };

  const mockSheet: Record<string, DongApartment[]> = {
    '오산동': [aptAlpha],
    '청계동': [aptBeta],
    '송동': [aptGamma],
  };

  const mockTx: Record<string, AptTxSummary> = {
    '화성동탄알파단지': {
      avg3MPrice: 110000,
      avg3MRentDeposit: 55000,
      avg3MPerPyeong: 3300,
      dong: '오산동',
    },
    '화성동탄베타단지': {
      avg3MPrice: 85000,
      avg3MRentDeposit: 45000,
      avg3MPerPyeong: 2600,
      dong: '청계동',
    },
    '화성동탄감마단지': {
      avg3MPrice: 130000,
      avg3MRentDeposit: 70000,
      avg3MPerPyeong: 3900,
      dong: '송동',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(mockLocalStorageStore).forEach(k => delete mockLocalStorageStore[k]);
  });

  describe('1. Unmemoized sheetApartments & Multiple Initial Apartments Stress', () => {
    it('survives 100 consecutive parent re-renders with unmemoized sheetApartments and 2 initial apartments', () => {
      let renderCount = 0;
      const { result, rerender } = renderHook(
        ({ tick }) => {
          renderCount++;
          return useAptComparison({
            isOpen: true,
            // Unmemoized sheetApartments object regenerated on every render
            sheetApartments: {
              '오산동': [{ ...aptAlpha }],
              '청계동': [{ ...aptBeta }],
              '송동': [{ ...aptGamma }],
            },
            txSummaryData: { ...mockTx },
            initialAptIds: ['화성동탄알파단지', '화성동탄베타단지'],
          });
        },
        { initialProps: { tick: 0 } }
      );

      for (let i = 1; i <= 100; i++) {
        rerender({ tick: i });
      }

      expect(renderCount).toBeGreaterThanOrEqual(101);
      expect(result.current.apt1?.name).toBe('화성동탄알파단지');
      expect(result.current.apt2?.name).toBe('화성동탄베타단지');
      expect(result.current.apartments.length).toBe(2);
      expect(result.current.error).toBeNull();
    });

    it('survives unmemoized empty sheetApartments on initial render and subsequent async population', () => {
      const { result, rerender } = renderHook(
        ({ loaded }) => {
          return useAptComparison({
            isOpen: true,
            sheetApartments: loaded ? mockSheet : {},
            txSummaryData: mockTx,
            initialAptIds: ['화성동탄알파단지', '화성동탄베타단지'],
          });
        },
        { initialProps: { loaded: false } }
      );

      // On initial empty render, neither apartment should be matched yet
      expect(result.current.apt1).toBeNull();
      expect(result.current.apt2).toBeNull();

      // Async data arrives
      rerender({ loaded: true });

      // After data loaded, both apartments must be properly resolved
      expect(result.current.apt1?.name).toBe('화성동탄알파단지');
      expect(result.current.apt2?.name).toBe('화성동탄베타단지');
      expect(result.current.apartments.length).toBe(2);
    });

    it('handles dynamic initialAptIds changes cleanly without infinite loops', () => {
      const { result, rerender } = renderHook(
        ({ ids }) => {
          return useAptComparison({
            isOpen: true,
            sheetApartments: mockSheet,
            txSummaryData: mockTx,
            initialAptIds: ids,
          });
        },
        { initialProps: { ids: ['화성동탄알파단지', '화성동탄베타단지'] } }
      );

      expect(result.current.apt1?.name).toBe('화성동탄알파단지');
      expect(result.current.apt2?.name).toBe('화성동탄베타단지');

      // Switch to gamma and alpha
      rerender({ ids: ['화성동탄감마단지', '화성동탄알파단지'] });

      expect(result.current.apt1?.name).toBe('화성동탄감마단지');
      expect(result.current.apt2?.name).toBe('화성동탄알파단지');
    });

    it('resets initialization lock on modal close and re-initializes on modal reopen', () => {
      const { result, rerender } = renderHook(
        ({ open }) => {
          return useAptComparison({
            isOpen: open,
            sheetApartments: mockSheet,
            txSummaryData: mockTx,
            initialAptIds: ['화성동탄알파단지', '화성동탄베타단지'],
          });
        },
        { initialProps: { open: true } }
      );

      expect(result.current.apt1?.name).toBe('화성동탄알파단지');

      // Close modal
      rerender({ open: false });

      // Reopen modal
      rerender({ open: true });

      expect(result.current.apt1?.name).toBe('화성동탄알파단지');
      expect(result.current.apt2?.name).toBe('화성동탄베타단지');
    });
  });

  describe('2. Rapid Apartment Selection, Deselection & High-Frequency Switching', () => {
    it('executes 200 rapid alternating selections and deselections without unhandled errors', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        } as Response)
      ) as any;

      const { result } = renderHook(() =>
        useAptComparison({
          isOpen: true,
          sheetApartments: mockSheet,
          txSummaryData: mockTx,
        })
      );

      for (let i = 0; i < 200; i++) {
        act(() => {
          if (i % 3 === 0) {
            result.current.setApt1(aptAlpha);
            result.current.setApt2(aptBeta);
          } else if (i % 3 === 1) {
            result.current.setApt1(aptGamma);
            result.current.setApt2(null);
          } else {
            result.current.setApt1(null);
            result.current.setApt2(aptAlpha);
          }
        });
      }

      // Final stable state
      act(() => {
        result.current.setApt1(aptAlpha);
        result.current.setApt2(aptGamma);
      });

      expect(result.current.apt1?.name).toBe('화성동탄알파단지');
      expect(result.current.apt2?.name).toBe('화성동탄감마단지');
      expect(result.current.apartments.length).toBe(2);
    });

    it('addApartment and removeApartment maintain maxApartments cap and idempotency', () => {
      const { result } = renderHook(() =>
        useAptComparison({
          isOpen: true,
          sheetApartments: mockSheet,
          txSummaryData: mockTx,
          maxApartments: 2,
        })
      );

      act(() => {
        result.current.addApartment('화성동탄알파단지');
      });
      expect(result.current.apartments.length).toBe(1);
      expect(result.current.apt1?.name).toBe('화성동탄알파단지');

      // Add second apartment fills slot 2
      act(() => {
        result.current.addApartment('화성동탄베타단지');
      });
      expect(result.current.apartments.length).toBe(2);
      expect(result.current.apt2?.name).toBe('화성동탄베타단지');

      // Add third apartment replaces slot 2 (maintains 2-slot comparison invariant)
      act(() => {
        result.current.addApartment('화성동탄감마단지');
      });
      expect(result.current.apartments.length).toBe(2);
      expect(result.current.apt2?.name).toBe('화성동탄감마단지');

      // Remove apartment
      act(() => {
        result.current.removeApartment('화성동탄알파단지');
      });
      expect(result.current.apartments.length).toBe(1);
      expect(result.current.apt1).toBeNull();
      expect(result.current.apt2?.name).toBe('화성동탄감마단지');
    });
  });

  describe('3. Extreme Boundaries, Corrupted Objects & Fuzzing', () => {
    it('handles identical apartment IDs in initialAptIds without crashing', () => {
      const { result } = renderHook(() =>
        useAptComparison({
          isOpen: true,
          sheetApartments: mockSheet,
          txSummaryData: mockTx,
          initialAptIds: ['화성동탄알파단지', '화성동탄알파단지'],
        })
      );

      expect(result.current.apt1?.name).toBe('화성동탄알파단지');
      expect(result.current.apt2?.name).toBe('화성동탄알파단지');
      expect(result.current.error).toBeNull();
    });

    it('handles initialAptIds with more than 2 elements gracefully', () => {
      const { result } = renderHook(() =>
        useAptComparison({
          isOpen: true,
          sheetApartments: mockSheet,
          txSummaryData: mockTx,
          initialAptIds: ['화성동탄알파단지', '화성동탄베타단지', '화성동탄감마단지'],
        })
      );

      // First two are mapped to apt1 and apt2
      expect(result.current.apt1?.name).toBe('화성동탄알파단지');
      expect(result.current.apt2?.name).toBe('화성동탄베타단지');
    });

    it('handles 100 consecutive calls to saveToRecent without memory leak or cache overflow', () => {
      const { result } = renderHook(() =>
        useAptComparison({
          isOpen: true,
          sheetApartments: mockSheet,
          txSummaryData: mockTx,
        })
      );

      for (let i = 0; i < 100; i++) {
        act(() => {
          result.current.saveToRecent({
            name: `테스트단지_${i}`,
            dong: '테스트동',
            brand: '테스트브랜드',
            householdCount: 100 + i,
            yearBuilt: '2020',
          });
        });
      }

      // Must be capped at 5
      expect(result.current.recentApts.length).toBeLessThanOrEqual(5);
      expect(result.current.recentApts[0].name).toBe('테스트단지_99');
    });

    it('handles extreme and malicious query strings without crashing autocomplete', () => {
      const { result } = renderHook(() =>
        useAptComparison({
          isOpen: true,
          sheetApartments: mockSheet,
          txSummaryData: mockTx,
        })
      );

      const extremeInputs = [
        'A'.repeat(5000), // Huge string
        'ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ', // Korean consonants
        'ㅏㅑㅓㅕㅗㅛㅜㅠㅡㅣ', // Korean vowels
        '   \t\n\r   ', // Pure whitespace
        '🚀🔥✨💯🎉', // Emojis
        'null',
        'undefined',
        '[object Object]',
        '__proto__',
        'constructor',
      ];

      extremeInputs.forEach(input => {
        act(() => {
          result.current.setSearchQuery1(input);
          result.current.setSearchQuery2(input);
        });
        expect(Array.isArray(result.current.dropdownOptions1)).toBe(true);
        expect(Array.isArray(result.current.dropdownOptions2)).toBe(true);
      });
    });
  });
});
