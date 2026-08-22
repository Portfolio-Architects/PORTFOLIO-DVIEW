import {
  decodeAptName,
  formatPriceEok,
  getPyeongSummaries,
  calculatePriceAnalytics,
  generateAiBriefing,
  type TransactionRecord,
} from './analyticsUtils';

describe('analyticsUtils Domain Logic Tests', () => {
  describe('decodeAptName', () => {
    it('decodes single-encoded URI components', () => {
      expect(decodeAptName('%EB%8F%99%ED%83%84%EC%97%AD%EB%A1%AF%EB%8D%B0%EC%BA%90%EC%8A%AC')).toBe('동탄역롯데캐슬');
    });

    it('decodes double-encoded URI components', () => {
      const doubleEncoded = encodeURIComponent(encodeURIComponent('동탄역시범우남퍼스트빌'));
      expect(decodeAptName(doubleEncoded)).toBe('동탄역시범우남퍼스트빌');
    });

    it('returns raw string when no percent encoding is present', () => {
      expect(decodeAptName('동탄역 린스트라우스')).toBe('동탄역 린스트라우스');
    });
  });

  describe('formatPriceEok', () => {
    it('formats pure eok without remainder', () => {
      expect(formatPriceEok(150000)).toBe('15억');
      expect(formatPriceEok(50000)).toBe('5억');
    });

    it('formats eok with remainder in man won', () => {
      expect(formatPriceEok(154500)).toBe('15억 4,500');
      expect(formatPriceEok(82500)).toBe('8억 2,500');
    });

    it('formats less than 1 eok (under 10,000 man won)', () => {
      expect(formatPriceEok(7500)).toBe('7,500만');
      expect(formatPriceEok(9900)).toBe('9,900만');
    });

    it('handles 0, negative, and NaN values safely', () => {
      expect(formatPriceEok(0)).toBe('0만');
      expect(formatPriceEok(-100)).toBe('0만');
      expect(formatPriceEok(NaN)).toBe('0만');
    });
  });

  describe('getPyeongSummaries', () => {
    it('returns empty array when transactions is empty', () => {
      expect(getPyeongSummaries([])).toEqual([]);
    });

    it('groups transactions by rounded pyeong and calculates prices, deposits, and jeonse ratios', () => {
      const transactions: TransactionRecord[] = [
        {
          contractYm: '202605',
          contractDay: '10',
          price: 150000,
          priceEok: '15억',
          area: 84.9,
          areaPyeong: 33.2,
          floor: 15,
          dealType: '매매',
        },
        {
          contractYm: '202605',
          contractDay: '01',
          price: 140000,
          priceEok: '14억',
          area: 84.9,
          areaPyeong: 33.2,
          floor: 10,
          dealType: '매매',
        },
        {
          contractYm: '202605',
          contractDay: '12',
          price: 0,
          deposit: 90000,
          priceEok: '9억',
          area: 84.9,
          areaPyeong: 33.2,
          floor: 12,
          dealType: '전세',
        },
        {
          contractYm: '202604',
          contractDay: '20',
          price: 95000,
          priceEok: '9억 5,000',
          area: 59.8,
          areaPyeong: 24.1,
          floor: 8,
          dealType: '매매',
        },
      ];

      const summaries = getPyeongSummaries(transactions);
      expect(summaries).toHaveLength(2);

      // Sorted by pyeong ascending: 24평 then 33평
      const p24 = summaries[0];
      expect(p24.pyeong).toBe(24);
      expect(p24.salesCount).toBe(1);
      expect(p24.latestPrice).toBe(95000);
      expect(p24.latestPriceStr).toBe('9억 5,000');

      const p33 = summaries[1];
      expect(p33.pyeong).toBe(33);
      expect(p33.salesCount).toBe(2);
      expect(p33.rentCount).toBe(1);
      expect(p33.latestPrice).toBe(150000);
      expect(p33.maxPrice).toBe(150000);
      expect(p33.avgPrice).toBe(145000);
      expect(p33.latestDeposit).toBe(90000);
      expect(p33.avgDeposit).toBe(90000);
      // Jeonse Ratio: (90,000 / 145,000) * 100 = 62%
      expect(p33.jeonseRatio).toBe(62);
    });
  });

  describe('calculatePriceAnalytics', () => {
    it('correctly derives min/max sale prices, jeonse ratio, and status string', () => {
      const summaries = [
        {
          pyeong: 33,
          areaM2: 84.9,
          salesCount: 5,
          rentCount: 3,
          latestPrice: 150000,
          latestPriceStr: '15억',
          maxPrice: 152000,
          maxPriceStr: '15억 2,000',
          avgPrice: 148000,
          avgPriceStr: '14억 8,000',
          latestDeposit: 90000,
          latestDepositStr: '9억',
          avgDeposit: 90000,
          avgDepositStr: '9억',
          jeonseRatio: 61,
        },
      ];

      const aptSummary = {
        aptName: '동탄역 롯데캐슬',
        dong: '오산동',
        latestPrice: 150000,
        maxPrice: 150000,
        avg1MPrice: 150000,
        avg1MRentDeposit: 90000,
      } as any;

      const analytics = calculatePriceAnalytics(summaries, aptSummary);
      expect(analytics.minSalePrice).toBe(150000);
      expect(analytics.maxSalePrice).toBe(150000);
      expect(analytics.salesVal).toBe(150000);
      expect(analytics.jeonseVal).toBe(90000);
      expect(analytics.ratioPercent).toBe(60);
      expect(analytics.isHigh).toBe(true); // 150,000 >= 150,000 - 500
      expect(analytics.statusStr).toBe('신고가');
      expect(analytics.offers?.lowPrice).toBe(150000 * 10000);
      expect(analytics.offers?.offerCount).toBe(5);
    });
  });

  describe('generateAiBriefing', () => {
    it('generates rich AI briefing when pyeong summaries and location scores are provided', () => {
      const summaries = [
        {
          pyeong: 33,
          areaM2: 84.9,
          salesCount: 2,
          rentCount: 1,
          latestPrice: 150000,
          latestPriceStr: '15억',
          maxPrice: 150000,
          maxPriceStr: '15억',
          avgPrice: 150000,
          avgPriceStr: '15억',
          latestDeposit: 90000,
          latestDepositStr: '9억',
          avgDeposit: 90000,
          avgDepositStr: '9억',
          jeonseRatio: 60,
        },
      ];

      const locationScore = {
        nearestSchoolNames: { elementary: '동탄초등학교' },
        distanceToElementary: 210,
        nearestStationName: '동탄',
        nearestStationLine: 'SRT/GTX-A',
        distanceToSubway: 150,
      };

      const brief = generateAiBriefing('동탄역롯데캐슬', undefined, summaries, locationScore);
      expect(brief).toContain('동탄역롯데캐슬');
      expect(brief).toContain('33평');
      expect(brief).toContain('최근 매매가 15억');
      expect(brief).toContain('전세가 9억');
      expect(brief).toContain('전세가율 60%');
      expect(brief).toContain('배정 초등학교는 동탄초등학교');
      expect(brief).toContain('가장 가까운 역은 동탄역(SRT/GTX-A');
    });
  });
});
