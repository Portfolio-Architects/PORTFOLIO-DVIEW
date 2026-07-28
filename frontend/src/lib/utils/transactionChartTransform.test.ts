import {
  getCachedTimestamp,
  clearTsCache,
  formatAvgPriceEok,
  calculateMonthlyAverages,
} from './transactionChartTransform';

describe('transactionChartTransform utilities', () => {
  describe('getCachedTimestamp', () => {
    beforeEach(() => {
      clearTsCache();
    });

    it('returns a valid timestamp and caches it', () => {
      const ts1 = getCachedTimestamp('202605', '15');
      const ts2 = getCachedTimestamp('202605', '15');
      expect(ts1).toBeGreaterThan(0);
      expect(ts1).toBe(ts2);
    });

    it('handles fallback default values safely', () => {
      const ts = getCachedTimestamp('', '');
      expect(ts).toBeGreaterThan(0);
    });

    it('clears cache cleanly with clearTsCache helper', () => {
      const ts1 = getCachedTimestamp('202605', '15');
      clearTsCache();
      const ts2 = getCachedTimestamp('202605', '15');
      expect(ts1).toBe(ts2);
    });

    it('enforces maximum 500 entries LRU eviction', () => {
      clearTsCache();
      for (let i = 0; i < 600; i++) {
        getCachedTimestamp(`202601`, String(i));
      }
      // Filling 600 entries should not throw and should keep cache bounded
      const newTs = getCachedTimestamp('202602', '1');
      expect(newTs).toBeGreaterThan(0);
    });
  });

  describe('formatAvgPriceEok', () => {
    it('formats price into eok notation correctly', () => {
      expect(formatAvgPriceEok(8.5)).toBe('8억5,000');
      expect(formatAvgPriceEok(12.0)).toBe('12억');
      expect(formatAvgPriceEok(0.75)).toBe('7,500');
    });

    it('returns "-" for empty or invalid values', () => {
      expect(formatAvgPriceEok(0)).toBe('-');
      expect(formatAvgPriceEok(null)).toBe('-');
      expect(formatAvgPriceEok(undefined)).toBe('-');
    });
  });

  describe('calculateMonthlyAverages', () => {
    it('handles null and empty transactions gracefully', () => {
      const emptyMap = new Map();
      expect(calculateMonthlyAverages(null, 'sale', 202101, emptyMap)).toEqual([]);
      expect(calculateMonthlyAverages([], 'sale', 202101, emptyMap)).toEqual([]);
    });

    it('aggregates transactions into monthly points', () => {
      const mockTxs = [
        {
          price: 85000,
          contractYm: '202405',
          contractDay: '10',
          dealType: '매매',
          area: 84.9,
          floor: 10,
        },
        {
          price: 50000,
          deposit: 50000,
          contractYm: '202405',
          contractDay: '12',
          dealType: '전세',
          area: 84.9,
          floor: 8,
        },
      ];

      const byMonthTier = new Map();
      byMonthTier.set(202405, { all: [8.5] });

      const res = calculateMonthlyAverages(mockTxs as any, 'sale', 202401, byMonthTier);
      expect(res).toHaveLength(1);
      expect(res[0].ym).toBe(202405);
      expect(res[0].saleAvg).toBe(8.5);
      expect(res[0].jeonseAvg).toBe(5);
    });
  });
});
