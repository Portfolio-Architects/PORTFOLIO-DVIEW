import { 
  normalizeAptName, 
  isSameApartment, 
  findTxKey, 
  getAreaType 
} from './apartmentMapping';

describe('ApartmentMapping Unit Tests', () => {
  describe('normalizeAptName()', () => {
    it('should remove zero-width characters and spaces', () => {
      // 200B is zero-width space
      const corrupted = '동\u200B탄 역\uFEFF 프 푸 르 지 오 ';
      expect(normalizeAptName(corrupted)).toBe('동탄역프푸르지오');
    });

    it('should strip bracketed dong prefix', () => {
      expect(normalizeAptName('[오산동] 힐스테이트 동탄역')).toBe('힐스테이트동탄역');
      expect(normalizeAptName('[청계동]동탄역 시범 한화 꿈에그린 프레스티지')).toBe('동탄역시범한화꿈에그린프레스티지');
    });

    it('should strip parentheses', () => {
      expect(normalizeAptName('동탄 파크자이(에듀)')).toBe('동탄파크자이에듀');
    });

    it('should handle NFC/NFD normalization correctly', () => {
      // Actually standard NFD for "동탄" is \u1103\u1169\u11bc\u1110\u1161\u11ab
      const decomposed = '\u1103\u1169\u11BC\u1110\u1161\u11AB';
      expect(normalizeAptName(decomposed)).toBe('동탄');
    });
  });

  describe('isSameApartment()', () => {
    it('should return true for identical logical apartments despite formatting', () => {
      expect(isSameApartment('[오산동] 동탄역롯데캐슬', '동 탄 역 롯 데 캐 슬')).toBe(true);
      expect(isSameApartment('동탄역 린스트라우스 (아파트)', '[오산동]동탄역린스트라우스(아파트)')).toBe(true);
    });

    it('should return false for different apartments', () => {
      expect(isSameApartment('동탄 푸르지오', '동탄역 푸르지오')).toBe(false);
      expect(isSameApartment('힐스테이트동탄', '힐스테이트동탄역')).toBe(false);
    });

    it('should safely handle undefined or empty inputs without crashing', () => {
      expect(isSameApartment('', '테스트')).toBe(false);
      expect(isSameApartment(undefined, '테스트')).toBe(false);
    });
  });

  describe('findTxKey() cascading logic', () => {
    const mockTxSummary = {
      '롯데캐슬알바트로스': { count: 1 },
      '금강펜테리움센트럴파크': { count: 2 },
      '동탄호수자이파밀리에': { count: 3 },
      'KCC스위첸': { count: 4 }
    };

    it('Step 1: exact match after normalizer', () => {
      expect(findTxKey('롯데캐슬알바트로스', mockTxSummary)).toBe('롯데캐슬알바트로스');
      expect(findTxKey('[청계동] 롯데캐슬 알바트로스', mockTxSummary)).toBe('롯데캐슬알바트로스');
    });

    it('Step 2: match after stripping long location prefixes', () => {
      // txSummary has "롯데캐슬알바트로스", aptName is "동탄역롯데캐슬알바트로스"
      expect(findTxKey('동탄역 롯데캐슬알바트로스', mockTxSummary)).toBe('롯데캐슬알바트로스');
      expect(findTxKey('동탄2신도시 금강펜테리움센트럴파크', mockTxSummary)).toBe('금강펜테리움센트럴파크');
    });

    it('Step 3: deep normalization fallback', () => {
      // "자이파밀리에" in aptName vs "동탄호수자이파밀리에" in txSummary
      // Wait, deep normalizer strips "동명," or roman numerals.
      
      const mockTxSummary2 = {
        '산척동,동탄호수자이파밀리에': { count: 1 },
        '동탄레이크자연앤푸르지오(주상복합)': { count: 2 },
        '반도유보라아이비파크4.0': { count: 3 },
        '반도유보라아이비파크10차1단지': { count: 4 },
        '영천동,KCC스위콈': { count: 5 }
      };

      // "동명," prefix should be stripped by Deep Normalize.
      // Since "자이파밀리에" is in BRAND_NAMES (generic), we must provide matching dong info.
      expect(findTxKey('동탄호수 자이파밀리에', mockTxSummary2, undefined, false, '산척동')).toBe('산척동,동탄호수자이파밀리에');

      // ".0" and Roman numeral variations
      expect(findTxKey('반도유보라아이비파크 4.0', mockTxSummary2)).toBe('반도유보라아이비파크4.0');
      expect(findTxKey('반도유보라아이비파크 Ⅳ', mockTxSummary2)).toBe('반도유보라아이비파크4.0');
      
      // "N차" variation
      expect(findTxKey('반도유보라 아이비파크 10차 1단지', mockTxSummary2)).toBe('반도유보라아이비파크10차1단지');
      expect(findTxKey('반도유보라 아이비파크 10 1단지', mockTxSummary2)).toBe('반도유보라아이비파크10차1단지');
      
      // "스위콈" alias
      expect(findTxKey('영천동 케이씨씨 스위첸', mockTxSummary2)).toBe('영천동,KCC스위콈');
    });

    it('Step 0: Manual mapping takes absolute precedence over logic', () => {
      const dbKeys = {
        '금강펜테리움': { count: 2 }
      };
      const manualMapping = {
        '동탄역푸르지오': '금강펜테리움' // Absurd mapping to test precedence
      };
      
      expect(findTxKey('[오산동] 동탄역 푸르지오', dbKeys, manualMapping)).toBe('금강펜테리움');
    });

    it('should correctly map Dongtan Station Sibeom Wunam Firstville using hardcoded mapping without matching Sibeom Daeun Town Wunam Firstville', () => {
      const dbKeys = {
        '동탄역시범우남퍼스트빌아파트': { count: 1 },
        '시범다은마을우남퍼스트빌': { count: 2 }
      };
      expect(findTxKey('동탄역 시범 우남퍼스트빌', dbKeys)).toBe('동탄역시범우남퍼스트빌아파트');
      expect(findTxKey('시범다은마을 우남퍼스트빌', dbKeys)).toBe('시범다은마을우남퍼스트빌');
    });
  });

  describe('getAreaType()', () => {
    it('should return correct type for known area size', () => {
      expect(getAreaType('힐스테이트 동탄역', '54.5533')).toBe('78A');
      expect(getAreaType('[오산동]힐스테이트동탄역', '54.4202')).toBe('78B');
    });

    it('should return null for unknown apt or area', () => {
      expect(getAreaType('힐스테이트 동탄역', '99.9999')).toBe(null);
      expect(getAreaType('동탄역 자이', '54.5533')).toBe(null);
    });
  });
});
