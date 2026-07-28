import {
  processMacroTrendData,
  formatXAxisTick,
  calculateMacroGapAndRatio,
} from './macroChartTransform';

describe('macroChartTransform utilities', () => {
  describe('processMacroTrendData', () => {
    it('returns empty array when lineData is null, undefined, or empty', () => {
      expect(processMacroTrendData(null)).toEqual([]);
      expect(processMacroTrendData(undefined)).toEqual([]);
      expect(processMacroTrendData([])).toEqual([]);
    });

    it('transforms zero or null jeonse/sale prices to null', () => {
      const input = [
        {
          name: '24.01',
          '동탄 아파트 전체': 8.5,
          '동탄 아파트 전세 평균': 0,
        },
        {
          name: '24.02',
          '동탄 아파트 전체': 0,
          '동탄 아파트 전세 평균': null,
        },
        {
          name: '24.03',
          '동탄 아파트 전체': 9.1,
          '동탄 아파트 전세 평균': 5.2,
        },
      ];

      const result = processMacroTrendData(input as any);
      expect(result).toHaveLength(3);
      expect(result[0]['동탄 아파트 전세 평균']).toBeNull();
      expect(result[0]['동탄 아파트 전체']).toBe(8.5);
      expect(result[1]['동탄 아파트 전체']).toBeNull();
      expect(result[1]['동탄 아파트 전세 평균']).toBeNull();
      expect(result[2]['동탄 아파트 전체']).toBe(9.1);
      expect(result[2]['동탄 아파트 전세 평균']).toBe(5.2);
    });
  });

  describe('formatXAxisTick', () => {
    it('formats YY.MM to YY년 MM월', () => {
      expect(formatXAxisTick('24.05')).toBe('24년 05월');
      expect(formatXAxisTick('26.12')).toBe('26년 12월');
    });

    it('returns original string when not matching YY.MM format', () => {
      expect(formatXAxisTick('2024')).toBe('2024');
      expect(formatXAxisTick('전체')).toBe('전체');
      expect(formatXAxisTick('')).toBe('');
    });
  });

  describe('calculateMacroGapAndRatio', () => {
    it('calculates ratio and gap correctly for valid prices', () => {
      const res = calculateMacroGapAndRatio(10, 6);
      expect(res.ratio).toBe(60);
      expect(res.gapPrice).toBe(4);
      expect(res.gapPriceStr).toBe('4.0억');
    });

    it('returns zero ratio and null gap string when prices are invalid or 0', () => {
      const res = calculateMacroGapAndRatio(0, 0);
      expect(res.ratio).toBe(0);
      expect(res.gapPrice).toBe(0);
      expect(res.gapPriceStr).toBeNull();
    });
  });
});
