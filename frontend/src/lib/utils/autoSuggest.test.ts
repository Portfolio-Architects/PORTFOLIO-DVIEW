import { editDistance, stripPrefix, stripSuffix, autoSuggest } from './autoSuggest';

describe('autoSuggest Utility', () => {
  describe('editDistance (Levenshtein Distance)', () => {
    it('should return 0 for identical strings', () => {
      expect(editDistance('동탄역 롯데캐슬', '동탄역 롯데캐슬')).toBe(0);
    });

    it('should calculate edit distance for single char insertions/deletions', () => {
      // 1 deletion: 'abc' -> 'ab'
      expect(editDistance('abc', 'ab')).toBe(1);
      // 1 insertion: 'ab' -> 'abc'
      expect(editDistance('ab', 'abc')).toBe(1);
    });

    it('should calculate edit distance for substitutions', () => {
      // 1 substitution: '동탄역 롯데캐슬' -> '동탄역 롯데케슬' (ㅐ vs ㅔ)
      expect(editDistance('동탄역 롯데캐슬', '동탄역 롯데케슬')).toBe(1);
    });

    it('should handle empty strings correctly', () => {
      expect(editDistance('', 'abc')).toBe(3);
      expect(editDistance('xyz', '')).toBe(3);
      expect(editDistance('', '')).toBe(0);
    });

    it('should return fallback (string lengths max) on invalid types', () => {
      // @ts-expect-error - testing invalid null input
      expect(editDistance(null, 'abc')).toBe(3);
      // @ts-expect-error - testing invalid undefined input
      expect(editDistance('xyz', undefined)).toBe(3);
    });
  });

  describe('stripPrefix', () => {
    it('should strip known location prefixes if it does not leave the string empty', () => {
      expect(stripPrefix('동탄역롯데캐슬')).toBe('롯데캐슬');
      expect(stripPrefix('동탄2시범다은마을')).toBe('시범다은마을'); // matches '동탄2' first
    });

    it('should not strip prefix if prefix is the entire string', () => {
      expect(stripPrefix('동탄')).toBe('동탄');
    });
  });

  describe('stripSuffix', () => {
    it('should strip known apartment suffixes if it does not leave the string empty', () => {
      expect(stripSuffix('롯데캐슬1단지')).toBe('롯데캐슬'); // matches '1단지'
      expect(stripSuffix('자이2단지')).toBe('자이'); // matches '2단지'
    });

    it('should not strip suffix if suffix is the entire string', () => {
      expect(stripSuffix('단지')).toBe('단지');
    });
  });

  describe('autoSuggest', () => {
    const mockTxSummaryData = {
      '동탄역롯데캐슬': {},
      '시범다은마을포스코': {},
      '센트럴상록': {},
      '동탄역삼정그린코아더베스트': {},
    };

    it('should match exact keys successfully', () => {
      expect(autoSuggest('동탄역 롯데캐슬', mockTxSummaryData)).toBe('동탄역롯데캐슬');
    });

    it('should resolve match after normalizing spaces and parentheses', () => {
      expect(autoSuggest('동탄역   롯데캐슬', mockTxSummaryData)).toBe('동탄역롯데캐슬');
    });

    it('should resolve match by prefix stripping', () => {
      // '동탄센트럴상록' -> strip '동탄' -> matches '센트럴상록'
      expect(autoSuggest('동탄센트럴상록', mockTxSummaryData)).toBe('센트럴상록');
    });

    it('should resolve match by suffix stripping', () => {
      // '시범다은마을 포스코 2단지' -> strip '2단지' -> matches '시범다은마을포스코'
      expect(autoSuggest('시범다은마을 포스코 2단지', mockTxSummaryData)).toBe('시범다은마을포스코');
    });

    it('should resolve match using Edit Distance within threshold', () => {
      // '동탄역 롯데케슬' has distance 1 from '동탄역롯데캐슬'.
      // length is 8, threshold is max(2, floor(8 * 0.25)) = 2.
      // So distance 1 <= threshold 2 -> match!
      expect(autoSuggest('동탄역 롯데케슬', mockTxSummaryData)).toBe('동탄역롯데캐슬');
    });

    it('should return null if edit distance is above threshold', () => {
      // '완전 다른 아파트 이름' is way beyond threshold
      expect(autoSuggest('완전 다른 아파트 이름', mockTxSummaryData)).toBeNull();
    });

    it('should return null on parameter validation failure', () => {
      // @ts-expect-error - testing invalid null aptName input
      expect(autoSuggest(null, mockTxSummaryData)).toBeNull();
      // @ts-expect-error - testing invalid null txSummaryData input
      expect(autoSuggest('동탄역 롯데캐슬', null)).toBeNull();
    });
  });
});
