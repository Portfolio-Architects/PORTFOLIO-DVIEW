import {
  staticDataService,
  formatPriceEok,
  parsePriceEokToMan,
  updateSaleAveragesWithNewTx,
  mergeTransactions,
  mergeRecentTransactions,
  computeRecent7DaysVolume,
  FirestoreTransaction,
} from '../staticDataService';
import type { AptTxSummary, RecentTransaction, Recent7DaysVolume } from '@/types/transaction';

describe('staticDataService & Domain Logic Unit Tests', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    staticDataService.clearCache();
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  describe('Price Formatter & Parser', () => {
    it('should format numbers in 만원 to Korean 억 strings correctly', () => {
      expect(formatPriceEok(150000)).toBe('15억');
      expect(formatPriceEok(154500)).toBe('15억4,500');
      expect(formatPriceEok(8500)).toBe('8,500만');
      expect(formatPriceEok(0)).toBe('0만');
    });

    it('should parse Korean 억 price strings to integers in 만원 accurately', () => {
      expect(parsePriceEokToMan('15억')).toBe(150000);
      expect(parsePriceEokToMan('15억 4,500')).toBe(154500);
      expect(parsePriceEokToMan('8,500만')).toBe(8500);
      expect(parsePriceEokToMan('')).toBe(0);
      expect(parsePriceEokToMan('12억 / 50만')).toBe(120000);
    });
  });

  describe('Weighted Average Updates', () => {
    it('should update 1M and 3M averages when new transaction is within time windows', () => {
      const summary: AptTxSummary = {
        latestPrice: 100000,
        latestPriceEok: '10억',
        latestArea: 84,
        latestFloor: 10,
        latestDate: '20260820',
        maxPrice: 120000,
        maxPriceEok: '12억',
        minPrice: 90000,
        minPriceEok: '9억',
        txCount: 10,
        avg1MPrice: 100000,
        avg1MPriceEok: '10억',
        avg1MTxCount: 1,
        avg3MPrice: 100000,
        avg3MPriceEok: '10억',
        avg3MTxCount: 2,
        recent: [],
      };

      const txDate = new Date(2026, 7, 15); // 2026-08-15 (within 1 month)
      updateSaleAveragesWithNewTx(summary, 120000, txDate);

      expect(summary.avg1MTxCount).toBe(2);
      expect(summary.avg1MPrice).toBe(110000);
      expect(summary.avg1MPriceEok).toBe('11억');

      expect(summary.avg3MTxCount).toBe(3);
      expect(summary.avg3MPrice).toBe(106700);
    });
  });

  describe('Transaction Merging Logic', () => {
    it('should merge new sale transactions into static summary properly', () => {
      const staticSummary: Record<string, AptTxSummary> = {
        목동신시가지14단지: {
          latestPrice: 140000,
          latestPriceEok: '14억',
          latestArea: 84,
          latestFloor: 10,
          latestDate: '20260801',
          maxPrice: 150000,
          maxPriceEok: '15억',
          minPrice: 100000,
          minPriceEok: '10억',
          txCount: 5,
          recent: [],
        },
      };

      const newTxs: FirestoreTransaction[] = [
        {
          aptName: '목동신시가지14단지',
          dealType: '매매',
          contractYm: '202608',
          contractDay: '15',
          contractDate: '20260815',
          price: 160000,
          deposit: 0,
          monthlyRent: 0,
          area: 84.5,
          areaPyeong: 25.5,
          floor: 12,
        },
      ];

      const merged = mergeTransactions(staticSummary, newTxs);

      expect(merged.목동신시가지14단지.txCount).toBe(6);
      expect(merged.목동신시가지14단지.maxPrice).toBe(160000);
      expect(merged.목동신시가지14단지.maxPriceEok).toBe('16억');
      expect(merged.목동신시가지14단지.latestPrice).toBe(160000);
      expect(merged.목동신시가지14단지.latestDate).toBe('20260815');
      expect(merged.목동신시가지14단지.latestFloor).toBe(12);
    });

    it('should merge and deduplicate recent transactions', () => {
      const staticRecent: RecentTransaction[] = [
        {
          aptName: '목동신시가지14단지',
          txKey: '목동신시가지14단지',
          date: '08.01',
          contractDate: '20260801',
          priceVal: 14,
          priceEok: '14억',
          area: 84,
          areaPyeong: 25.5,
          floor: 5,
          dealType: '매매',
        },
      ];

      const newTxs: FirestoreTransaction[] = [
        {
          aptName: '목동신시가지14단지',
          dealType: '매매',
          contractYm: '202608',
          contractDay: '18',
          contractDate: '20260818',
          price: 155000,
          deposit: 0,
          monthlyRent: 0,
          area: 84,
          areaPyeong: 25.5,
          floor: 8,
        },
      ];

      const merged = mergeRecentTransactions(staticRecent, newTxs);
      expect(merged.length).toBe(2);
      expect(merged[0].contractDate).toBe('20260818');
      expect(merged[0].priceVal).toBe(15.5);
    });

    it('should calculate 7-day rolling volume trend when new transactions arrive', () => {
      const activeVolume: Recent7DaysVolume = {
        currentCount: 10,
        prevCount: 5,
        trendText: '상승 (+100.0%)',
        trendColor: '#ff4b5c',
        badge: '+5건 (+100%)',
      };

      const activeSummary: Record<string, AptTxSummary> = {
        목동14단지: {
          latestPrice: 150000,
          latestPriceEok: '15억',
          latestArea: 84,
          latestFloor: 5,
          latestDate: '20260810',
          maxPrice: 150000,
          maxPriceEok: '15억',
          minPrice: 100000,
          minPriceEok: '10억',
          txCount: 5,
          recent: [],
        },
      };

      const newTxs: FirestoreTransaction[] = [
        {
          aptName: '목동14단지',
          dealType: '매매',
          contractYm: '202608',
          contractDay: '12',
          contractDate: '20260812',
          price: 155000,
          deposit: 0,
          monthlyRent: 0,
          area: 84,
          areaPyeong: 25.5,
          floor: 8,
        },
      ];

      const result = computeRecent7DaysVolume(activeVolume, activeSummary, newTxs);
      expect(result?.currentCount).toBe(11);
      expect(result?.trendText).toContain('상승');
    });
  });

  describe('Static JSON Fetchers & In-Memory Caching', () => {
    it('should fetch static data files correctly', async () => {
      global.fetch = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({ summary: {}, recent7DaysVolume: { currentCount: 0, prevCount: 0, trendText: '', trendColor: '', badge: '' } }), {
          status: 200,
        })
      );

      const res = await staticDataService.fetchTxSummary('1.0.0');
      expect(res.summary).toBeDefined();
    });

    it('should throw error when static fetch returns non-200', async () => {
      global.fetch = jest.fn().mockResolvedValue(
        new Response('Not Found', { status: 404, statusText: 'Not Found' })
      );

      await expect(staticDataService.fetchTxSummary('1.0.0')).rejects.toThrow('HTTP error! status: 404');
    });
  });
});
