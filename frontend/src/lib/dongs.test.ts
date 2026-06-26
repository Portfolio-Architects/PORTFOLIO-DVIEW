import { getDongByName, getDongById, getDongColor, getAllDongNames, DONGS } from './dongs';
import { getBrandMultiplier } from './utils/scoring';

describe('Dongs Utilities', () => {
  describe('DONGS data integrity', () => {
    it('should have exactly 11 법정동', () => {
      expect(DONGS).toHaveLength(11);
    });

    it('should have unique IDs and names', () => {
      const ids = DONGS.map(d => d.id);
      const names = DONGS.map(d => d.name);
      expect(new Set(ids).size).toBe(11);
      expect(new Set(names).size).toBe(11);
    });
  });

  describe('getDongByName()', () => {
    it('should find 청계동', () => {
      const dong = getDongByName('청계동');
      expect(dong).toBeDefined();
      expect(dong!.id).toBe('cheonggyedong');
    });

    it('should return undefined for non-existent dong', () => {
      expect(getDongByName('강남구')).toBeUndefined();
    });
  });

  describe('getDongById()', () => {
    it('should find by ID', () => {
      const dong = getDongById('yeoul');
      expect(dong).toBeDefined();
      expect(dong!.name).toBe('여울동');
    });
  });

  describe('getDongColor()', () => {
    it('should return color for known dong', () => {
      expect(getDongColor('청계동')).toBe('#ea6100');
    });

    it('should return fallback for unknown dong', () => {
      expect(getDongColor('없는동')).toBe('#8b95a1');
    });
  });

  describe('getAllDongNames()', () => {
    it('should return sorted 가나다 list', () => {
      const names = getAllDongNames();
      expect(names).toHaveLength(11);
      // Verify sorted order
      for (let i = 1; i < names.length; i++) {
        expect(names[i - 1].localeCompare(names[i], 'ko')).toBeLessThanOrEqual(0);
      }
    });
  });
});

describe('Brand Multiplier (μ)', () => {
  it('should return correct μ for Tier 2 brand (힐스테이트)', () => {
    expect(getBrandMultiplier('힐스테이트')).toBe(1.09);
  });

  it('should return correct μ for Tier 3 brand (자이)', () => {
    expect(getBrandMultiplier('자이')).toBe(1.06);
  });

  it('should return default μ for unknown brand', () => {
    expect(getBrandMultiplier('알수없는브랜드')).toBe(0.925);
  });

  it('should return default μ for undefined', () => {
    expect(getBrandMultiplier(undefined)).toBe(0.925);
  });
});
