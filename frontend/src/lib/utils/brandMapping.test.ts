import { getBrandStyle } from './brandMapping';

describe('brandMapping Utility', () => {
  describe('getBrandStyle', () => {
    it('should map styles based on brand parameter if provided', () => {
      const style = getBrandStyle('어떤 아파트', '푸르지오');
      expect(style).toEqual({ initial: 'P', color: '#6B4EFF' });
    });

    it('should map styles based on brand parameter containing keyword', () => {
      const style = getBrandStyle('아파트', 'e편한세상2차');
      expect(style).toEqual({ initial: 'e', color: '#00ACC1' });
    });

    it('should fall back to mapping by apartment name if brand parameter does not match', () => {
      const style = getBrandStyle('동탄역 롯데캐슬', '동탄건설');
      expect(style).toEqual({ initial: 'L', color: '#AD1457' });
    });

    it('should map styles based on apartment name containing brand keyword', () => {
      // @ts-expect-error - testing null brand parameter
      const style = getBrandStyle('동탄역시범한빛마을 자이', null);
      expect(style).toEqual({ initial: 'X', color: '#00897B' });
    });

    it('should dynamically generate styles for unknown brands based on first character', () => {
      // @ts-expect-error - testing null brand parameter
      const style1 = getBrandStyle('메이저타운', null);
      const style2 = getBrandStyle('메이저타운', undefined);

      expect(style1.initial).toBe('메');
      expect(style1.color).toContain('hsl(');
      
      // Ensure deterministic behavior
      expect(style1).toEqual(style2);

      // Different first characters should produce different hues
      // @ts-expect-error - testing null brand parameter
      const styleDifferent = getBrandStyle('태영', null);
      expect(styleDifferent.initial).toBe('태');
      expect(styleDifferent.color).not.toBe(style1.color);
    });

    it('should return default fallback styling on parameter validation failure', () => {
      // @ts-expect-error - testing invalid null aptName input
      const style = getBrandStyle(null, '푸르지오');
      expect(style).toEqual({ initial: '?', color: '#9E9E9E' });
    });
  });
});
