import { renderHook, act } from '@testing-library/react';
import { useAptComparison, getEffectiveMetrics } from './hooks/useAptComparison';
import type { DongApartment } from '@/lib/dong-apartments';
import type { AptTxSummary, LocationScoreItem } from '@/lib/types/transaction';
import type { FieldReportData } from '@/lib/types/report.types';

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

describe('useAptComparison Empirical Stress & Boundary Harness', () => {
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

  const mockSheetApartments: Record<string, DongApartment[]> = {
    '오산동': [aptAlpha],
    '청계동': [aptBeta],
    '송동': [aptGamma],
  };

  const mockTxSummary: Record<string, AptTxSummary> = {
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
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(mockLocalStorageStore).forEach(k => delete mockLocalStorageStore[k]);
  });

  describe('1. Concurrency, Rapid Apartment Switching & AbortController Cancellation', () => {
    it('1.1 Superseded fetches do not overwrite the latest apartment data', async () => {
      let resolveAlpha: (val: any) => void = () => {};
      let resolveBeta: (val: any) => void = () => {};
      let signalAlpha: AbortSignal | null = null;
      let signalBeta: AbortSignal | null = null;

      const mockFetch = jest.fn((url: string, init?: RequestInit) => {
        const decoded = decodeURIComponent(url);
        if (decoded.includes('화성동탄알파단지') || decoded.includes('알파')) {
          signalAlpha = init?.signal ?? null;
          return new Promise(resolve => {
            resolveAlpha = () =>
              resolve({
                ok: true,
                json: () =>
                  Promise.resolve([
                    { contractYm: '202501', price: 100000, dealType: '매매', areaPyeong: 33 },
                  ]),
              });
          });
        }
        if (decoded.includes('화성동탄베타단지') || decoded.includes('베타')) {
          signalBeta = init?.signal ?? null;
          return new Promise(resolve => {
            resolveBeta = () =>
              resolve({
                ok: true,
                json: () =>
                  Promise.resolve([
                    { contractYm: '202502', price: 80000, dealType: '매매', areaPyeong: 33 },
                  ]),
              });
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      });

      global.fetch = mockFetch as any;

      const { result } = renderHook(() =>
        useAptComparison({
          isOpen: true,
          sheetApartments: mockSheetApartments,
          txSummaryData: mockTxSummary,
        })
      );

      // Trigger selection of aptAlpha
      act(() => {
        result.current.setApt1(aptAlpha);
      });
      expect(result.current.isTxLoading1).toBe(true);

      // Immediately switch to aptBeta before aptAlpha resolves
      act(() => {
        result.current.setApt1(aptBeta);
      });

      // Signal of superseded fetch should be aborted
      expect(signalAlpha?.aborted).toBe(true);

      // Resolve beta first (fast response)
      await act(async () => {
        resolveBeta(null);
      });

      expect(result.current.txData1).toEqual([
        { contractYm: '202502', price: 80000, dealType: '매매', areaPyeong: 33 },
      ]);

      // Resolve alpha later (stale response)
      await act(async () => {
        resolveAlpha(null);
      });

      // State MUST NOT be clobbered by stale alpha
      expect(result.current.txData1).toEqual([
        { contractYm: '202502', price: 80000, dealType: '매매', areaPyeong: 33 },
      ]);
      expect(result.current.isTxLoading1).toBe(false);
    });

    it('1.2 AbortError rejection does not pollute error state', async () => {
      const mockFetch = jest.fn(() => {
        const err = new Error('The user aborted a request.');
        err.name = 'AbortError';
        return Promise.reject(err);
      });
      global.fetch = mockFetch as any;

      const { result } = renderHook(() =>
        useAptComparison({
          isOpen: true,
          initialAptName: '화성동탄알파단지',
          sheetApartments: mockSheetApartments,
        })
      );

      await act(async () => {});

      // AbortError should be silently discarded and error should remain null
      expect(result.current.error).toBeNull();
    });

    it('1.3 Non-abort network failures populate error state and clear txData', async () => {
      const mockFetch = jest.fn(() => Promise.reject(new Error('Connection timed out')));
      global.fetch = mockFetch as any;

      const { result } = renderHook(() =>
        useAptComparison({
          isOpen: true,
          initialAptName: '화성동탄알파단지',
          sheetApartments: mockSheetApartments,
        })
      );

      await act(async () => {});

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Connection timed out');
      expect(result.current.txData1).toEqual([]);
      expect(result.current.isTxLoading1).toBe(false);
    });

    it('1.4 Setting apt to null while fetch is pending cleans up cleanly without unhandled rejection', async () => {
      let signal: AbortSignal | null = null;
      const mockFetch = jest.fn((_url: string, init?: RequestInit) => {
        signal = init?.signal ?? null;
        return new Promise(() => {}); // never resolves
      });
      global.fetch = mockFetch as any;

      const { result } = renderHook(() =>
        useAptComparison({
          isOpen: true,
          sheetApartments: mockSheetApartments,
        })
      );

      act(() => {
        result.current.setApt1(aptAlpha);
      });

      act(() => {
        result.current.setApt1(null);
      });

      expect(signal?.aborted).toBe(true);
      expect(result.current.txData1).toEqual([]);
    });
  });

  describe('2. Empty, Sparse & Corrupted Transaction Data and NaN Guards', () => {
    it('2.1 Both apartments have empty transaction lists', () => {
      global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) })) as any;

      const { result } = renderHook(() =>
        useAptComparison({
          isOpen: true,
          initialAptIds: ['화성동탄알파단지', '화성동탄베타단지'],
          sheetApartments: mockSheetApartments,
        })
      );

      expect(result.current.combinedChartData).toEqual([]);
      expect(result.current.yAxisDomain).toEqual([0, 'auto']);
    });

    it('2.2 Single-transaction dataset carries forward without NaN and generates valid yAxisDomain', async () => {
      const singleTx = [
        { contractYm: '202501', price: 90000, dealType: '매매', areaPyeong: 30 },
      ];
      global.fetch = jest.fn((url: string) => {
        const decoded = decodeURIComponent(url);
        if (decoded.includes('화성동탄알파단지') || decoded.includes('알파')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(singleTx) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }) as any;

      const { result } = renderHook(() =>
        useAptComparison({
          isOpen: true,
          initialAptIds: ['화성동탄알파단지', '화성동탄베타단지'],
          sheetApartments: mockSheetApartments,
        })
      );

      await act(async () => {});

      const chartData = result.current.combinedChartData;
      expect(chartData.length).toBeGreaterThan(0);

      // Verify no NaN values in chart points
      chartData.forEach(pt => {
        const val1 = pt['화성동탄알파단지'];
        const val2 = pt['화성동탄베타단지'];
        if (val1 !== null) {
          expect(Number.isNaN(val1)).toBe(false);
          expect(typeof val1).toBe('number');
        }
        expect(val2).toBeNull();
      });

      // Verify yAxisDomain is valid non-infinite numbers
      const domain = result.current.yAxisDomain;
      expect(typeof domain[0]).toBe('number');
      expect(typeof domain[1]).toBe('number');
      expect(Number.isFinite(domain[0])).toBe(true);
      expect(Number.isFinite(domain[1])).toBe(true);
      expect((domain[0] as number) <= (domain[1] as number)).toBe(true);
    });

    it('2.3 Corrupted transaction attributes (areaPyeong=0, NaN price, malformed dates) are guarded', async () => {
      const dirtyTxs = [
        null,
        {},
        { contractYm: '202501', price: 0, dealType: '매매' }, // zero price
        { contractYm: '202501', price: NaN, dealType: '매매' }, // NaN price
        { contractYm: '202502', price: 100000, dealType: '매매', areaPyeong: 0 }, // areaPyeong 0 fallback
        { contractYm: '202503', price: 120000, dealType: '매매', areaPyeong: NaN }, // areaPyeong NaN fallback
        { contractYm: '20', price: 90000, dealType: '매매' }, // short date
      ];

      global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(dirtyTxs) })) as any;

      const { result } = renderHook(() =>
        useAptComparison({
          isOpen: true,
          initialAptIds: ['화성동탄알파단지', '화성동탄베타단지'],
          sheetApartments: mockSheetApartments,
        })
      );

      await act(async () => {});

      // Switch to perPyeong mode to stress division
      act(() => {
        result.current.setPriceMetric('perPyeong');
      });

      const chartData = result.current.combinedChartData;
      chartData.forEach(pt => {
        const val = pt['화성동탄알파단지'];
        if (val !== null) {
          expect(Number.isNaN(val)).toBe(false);
          expect(Number.isFinite(val)).toBe(true);
        }
      });
    });

    it('2.4 Missing Firestore & summary metrics fall back to deterministic values without NaN', () => {
      const bareApt: DongApartment = {
        name: '미등록단지',
        dong: '알수없음',
      };

      const metrics = getEffectiveMetrics(bareApt, undefined, {}, {});
      expect(metrics.householdCount).toBe(800);
      expect(metrics.parkingPerHousehold).toBe(1.25);
      expect(metrics.yearBuilt).toBe(2018);
      expect(metrics.distanceToSubway).toBe(2000);
      expect(metrics.distanceToElementary).toBe(350);
      expect(metrics.distanceToMiddle).toBe(600);
      expect(metrics.distanceToHigh).toBe(800);
      expect(metrics.distanceToPark).toBe(500);
      expect(metrics.distanceToStarbucks).toBe(800);
      expect(metrics.distanceToOliveYoung).toBe(600);
      expect(metrics.distanceToIndeokwon).toBe(2000);
      expect(metrics.distanceToTram).toBe(1000);

      Object.values(metrics).forEach(v => {
        if (typeof v === 'number') {
          expect(Number.isNaN(v)).toBe(false);
        }
      });
    });
  });

  describe('3. 16 Comparison Metric Win-Loss Evaluations & Lifestyle Quiz Weighting', () => {
    it('3.1 All 16 metrics evaluate win/loss directions accurately', () => {
      const reports = new Map<string, FieldReportData>();
      // Apt A is strictly superior in infrastructure & scale
      reports.set('화성동탄알파단지', {
        metrics: {
          brand: '자이',
          householdCount: 2000, // win
          parkingPerHousehold: 1.8, // win
          yearBuilt: 2024, // win
          distanceToSubway: 300, // win (lower)
          distanceToElementary: 150, // win (lower)
          distanceToMiddle: 200, // win (lower)
          distanceToHigh: 300, // win (lower)
          distanceToPark: 100, // win (lower)
          distanceToStarbucks: 200, // win (lower)
          distanceToOliveYoung: 150, // win (lower)
          distanceToIndeokwon: 400, // win (lower)
          distanceToTram: 200, // win (lower)
        },
      });

      // Apt B is inferior in infra, but we set higher price in summary
      reports.set('화성동탄베타단지', {
        metrics: {
          brand: '더샵',
          householdCount: 500,
          parkingPerHousehold: 1.1,
          yearBuilt: 2010,
          distanceToSubway: 1500,
          distanceToElementary: 600,
          distanceToMiddle: 800,
          distanceToHigh: 1000,
          distanceToPark: 700,
          distanceToStarbucks: 900,
          distanceToOliveYoung: 800,
          distanceToIndeokwon: 2000,
          distanceToTram: 1200,
        },
      });

      const txSummaryWithPrices: Record<string, AptTxSummary> = {
        '화성동탄알파단지': {
          avg3MPrice: 150000, // win
          avg3MRentDeposit: 75000, // win
          avg3MPerPyeong: 4500, // win
          dong: '오산동',
        },
        '화성동탄베타단지': {
          avg3MPrice: 80000,
          avg3MRentDeposit: 40000,
          avg3MPerPyeong: 2400,
          dong: '청계동',
        },
      };

      const { result } = renderHook(() =>
        useAptComparison({
          isOpen: true,
          initialAptIds: ['화성동탄알파단지', '화성동탄베타단지'],
          sheetApartments: mockSheetApartments,
          txSummaryData: txSummaryWithPrices,
          fieldReportsMap: reports,
        })
      );

      const wins = result.current.wins;
      // 12 infra + 4 market = 16 metrics
      expect(wins.subway).toBe(true);
      expect(wins.elementary).toBe(true);
      expect(wins.middle).toBe(true);
      expect(wins.high).toBe(true);
      expect(wins.starbucks).toBe(true);
      expect(wins.oliveYoung).toBe(true);
      expect(wins.indeokwon).toBe(true);
      expect(wins.tram).toBe(true);
      expect(wins.park).toBe(true);
      expect(wins.households).toBe(true);
      expect(wins.year).toBe(true);
      expect(wins.parking).toBe(true);
      expect(wins.price).toBe(true);
      expect(wins.rent).toBe(true);
      expect(wins.perPyeong).toBe(true);

      // Score tally: Apt 1 should have 15 or 16 wins
      expect(result.current.score.apt1).toBeGreaterThanOrEqual(15);
      expect(result.current.score.apt2).toBe(0);
    });

    it('3.2 Identical metrics produce null (tie) across all 16 categories', () => {
      const { result } = renderHook(() =>
        useAptComparison({
          isOpen: true,
          initialAptIds: ['화성동탄알파단지', '화성동탄알파단지'], // Compare with self
          sheetApartments: mockSheetApartments,
          txSummaryData: mockTxSummary,
        })
      );

      const wins = result.current.wins;
      const metricKeys = [
        'subway', 'elementary', 'middle', 'high', 'starbucks', 'oliveYoung',
        'indeokwon', 'tram', 'park', 'households', 'year', 'parking',
        'price', 'rent', 'ratio', 'perPyeong',
      ];

      metricKeys.forEach(k => {
        expect(wins[k]).toBeNull();
      });

      expect(result.current.score.apt1).toBe(0);
      expect(result.current.score.apt2).toBe(0);
    });

    it('3.3 Lifestyle quiz weighting applies correctly and sums to max 100 points', () => {
      // Mock quiz answer cache
      mockLocalStorageStore['drive_quiz_answers'] = JSON.stringify({
        transit: 'gtx', // +30 for distanceToSubway
        family: 'elementary', // +25 for elementary, +15 for park
        lifestyle: 'nature', // +30 for park
      });

      const reports = new Map<string, FieldReportData>();
      reports.set('화성동탄알파단지', {
        metrics: {
          distanceToSubway: 300, // Alpha wins (+30)
          distanceToElementary: 200, // Alpha wins (+25)
          distanceToPark: 100, // Alpha wins (+15 + 30)
        },
      });
      reports.set('화성동탄베타단지', {
        metrics: {
          distanceToSubway: 1200,
          distanceToElementary: 600,
          distanceToPark: 500,
        },
      });

      const { result } = renderHook(() =>
        useAptComparison({
          isOpen: true,
          initialAptIds: ['화성동탄알파단지', '화성동탄베타단지'],
          sheetApartments: mockSheetApartments,
          fieldReportsMap: reports,
        })
      );

      expect(result.current.aiFitScores.score1).toBe(100); // 30 + 25 + 15 + 30
      expect(result.current.aiFitScores.score2).toBe(0);
      expect(result.current.aiFitScores.winner).toBe('apt1');
    });
  });

  describe('4. 5-Axis Radar Chart Boundaries and Invariants', () => {
    it('4.1 Extreme metric values remain strictly within [0, 100] range', () => {
      const extremeReports = new Map<string, FieldReportData>();
      // Extreme worst case: astronomical distances, 0 households, ancient year
      extremeReports.set('화성동탄알파단지', {
        metrics: {
          distanceToSubway: 99999,
          distanceToTram: 99999,
          distanceToElementary: 99999,
          distanceToMiddle: 99999,
          distanceToStarbucks: 99999,
          distanceToOliveYoung: 99999,
          householdCount: 0,
          parkingPerHousehold: 0,
          yearBuilt: 1900,
        },
      });

      // Extreme best case: 0m distances, gigantic households, futuristic year
      extremeReports.set('화성동탄베타단지', {
        metrics: {
          distanceToSubway: 50,
          distanceToTram: 50,
          distanceToElementary: 50,
          distanceToMiddle: 50,
          distanceToStarbucks: 50,
          distanceToOliveYoung: 50,
          householdCount: 50000,
          parkingPerHousehold: 5.0,
          yearBuilt: 2040,
        },
      });

      const { result } = renderHook(() =>
        useAptComparison({
          isOpen: true,
          initialAptIds: ['화성동탄알파단지', '화성동탄베타단지'],
          sheetApartments: mockSheetApartments,
          fieldReportsMap: extremeReports,
        })
      );

      const radarData = result.current.radarDataPoints;
      expect(radarData.length).toBe(5);

      radarData.forEach(axis => {
        expect(axis.fullMark).toBe(100);
        expect(axis.A).toBeGreaterThanOrEqual(0);
        expect(axis.A).toBeLessThanOrEqual(100);
        expect(axis.B).toBeGreaterThanOrEqual(0);
        expect(axis.B).toBeLessThanOrEqual(100);
      });
    });

    it('4.2 Missing apartments yield empty radar data sets', () => {
      const { result } = renderHook(() =>
        useAptComparison({
          isOpen: true,
          initialAptName: '화성동탄알파단지', // only 1 apartment
          sheetApartments: mockSheetApartments,
        })
      );

      expect(result.current.radarChartData).toEqual([]);
      expect(result.current.radarDataPoints).toEqual([]);
    });
  });

  describe('5. Modal Interactions & Helpers', () => {
    it('5.1 formatYearBuilt correctly handles 4-digit and 6-digit representations', () => {
      const { result } = renderHook(() => useAptComparison());
      const currentYear = new Date().getFullYear();

      expect(result.current.formatYearBuilt('201506', 2015)).toBe(`2015년 6월 (${currentYear - 2015}년차)`);
      expect(result.current.formatYearBuilt('2018', 2018)).toBe(`2018년 (${currentYear - 2018}년차)`);
      expect(result.current.formatYearBuilt(undefined, 2018)).toBe('-');
    });

    it('5.2 displayPrice formats Korean currency correctly', () => {
      const { result } = renderHook(() => useAptComparison());

      expect(result.current.displayPrice(125000)).toBe('12억 5,000');
      expect(result.current.displayPrice(100000)).toBe('10억');
      expect(result.current.displayPrice(8500)).toBe('8,500');
      expect(result.current.displayPrice(0)).toBe('-');
    });

    it('5.3 addApartment and removeApartment maintain invariants', () => {
      const { result } = renderHook(() =>
        useAptComparison({
          isOpen: true,
          sheetApartments: mockSheetApartments,
        })
      );

      act(() => {
        result.current.addApartment('화성동탄알파단지');
      });
      expect(result.current.apartments.length).toBe(1);
      expect(result.current.apt1?.name).toBe('화성동탄알파단지');

      act(() => {
        result.current.addApartment('화성동탄베타단지');
      });
      expect(result.current.apartments.length).toBe(2);
      expect(result.current.apt2?.name).toBe('화성동탄베타단지');

      act(() => {
        result.current.removeApartment('화성동탄알파단지');
      });
      expect(result.current.apartments.length).toBe(1);
      expect(result.current.apt1).toBeNull();
      expect(result.current.apt2?.name).toBe('화성동탄베타단지');
    });
  });
});
