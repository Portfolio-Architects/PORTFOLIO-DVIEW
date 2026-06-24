import { calculatePremiumScores, calculateInfraScore, getBrandMultiplier } from './scoring';

describe('Scoring Engine Utilities', () => {
  describe('getBrandMultiplier()', () => {
    it('should return correct multiplier for Tier 1 brands', () => {
      expect(getBrandMultiplier('아크로')).toBe(1.135);
      expect(getBrandMultiplier('디에이치')).toBe(1.135);
    });

    it('should return correct multiplier for Tier 2 brands', () => {
      expect(getBrandMultiplier('래미안')).toBe(1.09);
      expect(getBrandMultiplier('힐스테이트')).toBe(1.09);
    });

    it('should return correct multiplier for Tier 3 brands', () => {
      expect(getBrandMultiplier('푸르지오')).toBe(1.06);
      expect(getBrandMultiplier('자이')).toBe(1.06);
    });

    it('should return default multiplier for unknown or empty brand', () => {
      expect(getBrandMultiplier('알수없는브랜드')).toBe(0.925);
      expect(getBrandMultiplier('')).toBe(0.925);
      expect(getBrandMultiplier(undefined)).toBe(0.925);
    });
  });

  describe('calculatePremiumScores()', () => {
    it('should return zero scores when metrics are undefined', () => {
      const result = calculatePremiumScores(undefined);
      expect(result.totalScore).toBe(0);
      expect(result.transport).toBe(0);
      expect(result.education).toBe(0);
      expect(result.details!.gtx.score).toBe(0);
    });

    it('should correctly calculate max scores for ideal premium metrics', () => {
      const idealMetrics = {
        brand: '래미안',
        householdCount: 2500, // max tier (>1500)
        far: 180,
        bcr: 15,
        parkingCount: 3750,
        parkingPerHousehold: 1.6, // max parking tier (>=1.6)
        yearBuilt: 2024, // brand new
        minFloor: 1,
        maxFloor: 35,
        coordinates: '37.2005,127.0985',
        distanceToElementary: 100, // <200m
        distanceToMiddle: 300,
        distanceToHigh: 400,
        distanceToSubway: 150, // <300m
        academyDensity: 120, // >80
        academyCategories: {},
        restaurantDensity: 200,
        restaurantCategories: {},
        distanceToIndeokwon: 200, // <300m
        distanceToTram: 100, // <300m
        distanceToStarbucks: 100,
        distanceToSupermarket: 200,
        distanceToPark: 150, // <300m
        distanceToOliveYoung: 100,
        distanceToDaiso: 100,
      };

      const result = calculatePremiumScores(idealMetrics as any);
      // Verify calculations are scaled to reasonable high limits
      expect(result.transport).toBeGreaterThan(100);
      expect(result.education).toBeGreaterThan(15);
      expect(result.livingComfort).toBeGreaterThan(10);
      expect(result.complex).toBeGreaterThan(10);
    });

    it('should return lower scores for poor metrics', () => {
      const poorMetrics = {
        brand: '기타브랜드',
        householdCount: 100,
        far: 300,
        bcr: 25,
        parkingPerHousehold: 0.7,
        yearBuilt: 1990,
        distanceToElementary: 2500,
        distanceToSubway: 5000,
        academyDensity: 0,
        distanceToIndeokwon: 6000,
        distanceToTram: 5000,
        distanceToPark: 3000,
      };

      const result = calculatePremiumScores(poorMetrics as any);
      expect(result.transport).toBeLessThan(30);
      expect(result.education).toBeLessThan(10);
    });
  });

  describe('calculateInfraScore()', () => {
    it('should return fallback result on empty metrics', () => {
      const result = calculateInfraScore(undefined);
      expect(result.score).toBe(0);
      expect(result.grade).toBe('C');
      expect(result.description).toBe('정보 부족');
    });

    it('should calculate top grade (S) for premium infrastructure proximity', () => {
      const infraMetrics = {
        distanceToSubway: 200,
        distanceToIndeokwon: 150,
        distanceToTram: 100,
        distanceToStarbucks: 100,
        distanceToOliveYoung: 150,
        distanceToDaiso: 200,
        distanceToMcDonalds: 250,
        restaurantDensity: 180,
      };

      const result = calculateInfraScore(infraMetrics);
      expect(result.score).toBeGreaterThanOrEqual(90);
      expect(result.grade).toBe('S');
    });

    it('should calculate average grade (B/C) for moderate infrastructure', () => {
      const averageMetrics = {
        distanceToSubway: 900,
        distanceToIndeokwon: 1100,
        distanceToTram: 1000,
        distanceToStarbucks: 800,
        distanceToOliveYoung: 900,
        distanceToDaiso: 800,
        distanceToMcDonalds: 1500,
        restaurantDensity: 20,
      };

      const result = calculateInfraScore(averageMetrics);
      expect(result.score).toBeLessThan(80);
      expect(['B', 'C']).toContain(result.grade);
    });
  });
});
