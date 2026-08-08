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
      const m202405 = res.find((item) => item.ym === 202405);
      expect(m202405).toBeDefined();
      expect(m202405?.saleAvg).toBe(8.5);
      expect(m202405?.jeonseAvg).toBe(5);
    });

    it('carries over June price (202606) to July (202607) when July transactions are missing', () => {
      const mockTxs = [
        {
          price: 222500,
          contractYm: '202606',
          contractDay: '04',
          dealType: '매매',
          area: 114,
          floor: 33,
        },
        {
          price: 73500,
          deposit: 73500,
          contractYm: '202607',
          contractDay: '10',
          dealType: '전세',
          area: 114,
          floor: 12,
        },
      ];

      const byMonthTier = new Map();
      byMonthTier.set(202606, { all: [22.25] }); // June has sale average 22.25억

      // July (202607) has no sale transactions in byMonthTier
      const res = calculateMonthlyAverages(mockTxs as any, 'sale', 202601, byMonthTier);

      const junePoint = res.find((d) => d.ym === 202606);
      const julyPoint = res.find((d) => d.ym === 202607);

      expect(junePoint).toBeDefined();
      expect(junePoint?.saleAvg).toBe(22.25);
      expect(junePoint?.isSaleCarriedOver).toBe(false);

      expect(julyPoint).toBeDefined();
      expect(julyPoint?.saleAvg).toBe(22.25); // Carried over June price!
      expect(julyPoint?.isSaleCarriedOver).toBe(true);
      expect(julyPoint?.jeonseAvg).toBe(7.35); // July rent price
    });
  });
});
