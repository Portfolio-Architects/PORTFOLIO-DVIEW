import {
  extractChosung,
  foldSearchText,
  matchesApartmentSearch,
  scoreApartmentMatch,
  filterAndRankApartments,
  getHighlightSegments,
} from './apartmentSearch';
import { buildInitialApartments } from '@/lib/dong-apartments';

const SAMPLE_APTS = [
  { name: '힐스테이트 동탄역', dong: '영천동' },
  { name: '힐스테이트 동탄', dong: '목동' },
  { name: '힐스테이트 동탄포레', dong: '신동' },
  { name: '동탄역 롯데캐슬', dong: '여울동' },
  { name: '동탄역 롯데캐슬 알바트로스', dong: '청계동' },
  { name: '동탄역 시범 우남퍼스트빌', dong: '청계동' },
  { name: '동탄역 시범 더샵 센트럴시티', dong: '청계동' },
  { name: '시범다은마을 삼성래미안', dong: '반송동' },
  { name: 'e편한세상 동탄역 어반원', dong: '여울동' },
  { name: '중흥S클래스 더테라스 리치', dong: '여울동' },
  { name: '동탄2 LH 26단지', dong: '송동' },
  { name: '시범한빛마을 KCC스위첸', dong: '반송동' },
  { name: '동탄파라곤 II', dong: '반송동' },
  { name: '호수공원역 레이크시티', dong: '산척동', txKey: '더레이크시티부영6단지' },
];

describe('apartmentSearch smart Korean real-estate search engine', () => {
  describe('extractChosung', () => {
    it('extracts Hangul initial consonants while keeping numbers and Latin chars', () => {
      expect(extractChosung('힐스테이트 동탄역')).toBe('ㅎㅅㅌㅇㅌㄷㅌㅇ');
      expect(extractChosung('동탄2 LH 26단지')).toBe('ㄷㅌ2lh26ㄷㅈ');
    });
  });

  describe('foldSearchText', () => {
    it('normalizes Korean/English brand aliases, symbols, and Roman numerals', () => {
      expect(foldSearchText('e편한세상 동탄')).toBe(foldSearchText('이편한세상 동탄'));
      expect(foldSearchText('중흥S클래스')).toBe(foldSearchText('중흥에스클래스'));
      expect(foldSearchText('동탄2 LH')).toBe(foldSearchText('동탄2 엘에이치'));
      expect(foldSearchText('KCC스위첸')).toBe(foldSearchText('케이씨씨스위첸'));
      expect(foldSearchText('자연&자이')).toBe(foldSearchText('자연앤자이'));
      expect(foldSearchText('동탄파라곤 II')).toBe(foldSearchText('동탄파라곤 2'));
    });
  });

  describe('matchesApartmentSearch & filterAndRankApartments', () => {
    it('matches exact and space-omitted queries', () => {
      const results = filterAndRankApartments(SAMPLE_APTS, '힐스테이트동탄역');
      expect(results[0]?.name).toBe('힐스테이트 동탄역');
    });

    it('matches reversed word order and omitted middle words (multi-token)', () => {
      const reversed = filterAndRankApartments(SAMPLE_APTS, '동탄역 힐스테이트');
      expect(reversed.map((a) => a.name)).toContain('힐스테이트 동탄역');
      expect(reversed[0]?.name).toBe('힐스테이트 동탄역');

      const omittedMiddle = filterAndRankApartments(SAMPLE_APTS, '동탄역 우남');
      expect(omittedMiddle.map((a) => a.name)).toEqual(['동탄역 시범 우남퍼스트빌']);

      const daeunRaemian = filterAndRankApartments(SAMPLE_APTS, '다은 래미안');
      expect(daeunRaemian.map((a) => a.name)).toEqual(['시범다은마을 삼성래미안']);
    });

    it('matches compound no-space reversed or abbreviated queries', () => {
      expect(filterAndRankApartments(SAMPLE_APTS, '동탄역힐스테이트')[0]?.name).toBe('힐스테이트 동탄역');
      expect(filterAndRankApartments(SAMPLE_APTS, '동탄역우남')[0]?.name).toBe('동탄역 시범 우남퍼스트빌');
      expect(filterAndRankApartments(SAMPLE_APTS, '시범더샵')[0]?.name).toBe('동탄역 시범 더샵 센트럴시티');
    });

    it('matches dong + apartment combined queries including historical 오산동 -> 여울동 alias', () => {
      const yeongcheon = filterAndRankApartments(SAMPLE_APTS, '영천동 힐스테이트');
      expect(yeongcheon.map((a) => a.name)).toEqual(['힐스테이트 동탄역']);

      const osanAlias = filterAndRankApartments(SAMPLE_APTS, '오산동 롯데캐슬');
      expect(osanAlias.map((a) => a.name)).toContain('동탄역 롯데캐슬');
    });

    it('matches Korean phonetic equivalents of English brands and HARDCODED_MAPPING aliases', () => {
      expect(filterAndRankApartments(SAMPLE_APTS, '이편한세상 어반원')[0]?.name).toBe('e편한세상 동탄역 어반원');
      expect(filterAndRankApartments(SAMPLE_APTS, '중흥에스클래스 더테라스')[0]?.name).toBe('중흥S클래스 더테라스 리치');
      expect(filterAndRankApartments(SAMPLE_APTS, '동탄2 엘에이치')[0]?.name).toBe('동탄2 LH 26단지');
      expect(filterAndRankApartments(SAMPLE_APTS, '한빛 케이씨씨')[0]?.name).toBe('시범한빛마을 KCC스위첸');
      expect(filterAndRankApartments(SAMPLE_APTS, '동탄파라곤2')[0]?.name).toBe('동탄파라곤 II');
      expect(filterAndRankApartments(SAMPLE_APTS, '부영 6단지')[0]?.name).toBe('호수공원역 레이크시티');
    });

    it('matches pure chosung, mixed chosung, and in-progress Korean IME typing without flicker', () => {
      // Pure chosung
      const chosungHillstate = filterAndRankApartments(SAMPLE_APTS, 'ㅎㅅㅌㅇㅌ ㄷㅌㅇ');
      expect(chosungHillstate[0]?.name).toBe('힐스테이트 동탄역');

      // Mixed word + chosung
      const mixedLotte = filterAndRankApartments(SAMPLE_APTS, '동탄역 ㄹㄷㅋㅅ');
      expect(mixedLotte[0]?.name).toBe('동탄역 롯데캐슬');

      // Live Korean IME mid-typing (syllable + trailing consonant jamo)
      expect(matchesApartmentSearch(SAMPLE_APTS[0], '힐ㅅ')).toBe(true);
      expect(matchesApartmentSearch(SAMPLE_APTS[0], '힐스테ㅇ')).toBe(true);
      expect(matchesApartmentSearch(SAMPLE_APTS[3], '동탄역 롯ㄷ')).toBe(true);
    });

    it('ranks exact matches ahead of longer prefix matches', () => {
      const lotteResults = filterAndRankApartments(SAMPLE_APTS, '동탄역 롯데캐슬');
      expect(lotteResults[0]?.name).toBe('동탄역 롯데캐슬');
      expect(lotteResults[1]?.name).toBe('동탄역 롯데캐슬 알바트로스');

      const hillstateResults = filterAndRankApartments(SAMPLE_APTS, '힐스테이트 동탄');
      expect(hillstateResults[0]?.name).toBe('힐스테이트 동탄');
      expect(scoreApartmentMatch(SAMPLE_APTS[1], '힐스테이트 동탄')).toBeGreaterThan(
        scoreApartmentMatch(SAMPLE_APTS[0], '힐스테이트 동탄')
      );
    });
  });

  describe('getHighlightSegments', () => {
    it('preserves original display text while marking matched substrings and chosung ranges', () => {
      const segs = getHighlightSegments('힐스테이트 동탄역', '동탄역 힐스');
      expect(segs.map((s) => s.text).join('')).toBe('힐스테이트 동탄역');
      const highlightedText = segs.filter((s) => s.highlighted).map((s) => s.text);
      expect(highlightedText).toContain('힐스');
      expect(highlightedText).toContain('동탄역');

      const chosungSegs = getHighlightSegments('동탄역 롯데캐슬', 'ㄹㄷㅋㅅ');
      expect(chosungSegs.map((s) => s.text).join('')).toBe('동탄역 롯데캐슬');
      expect(chosungSegs.filter((s) => s.highlighted).map((s) => s.text).join('')).toBe('롯데캐슬');
    });
  });

  describe('real Dongtan apartment catalog verification', () => {
    it('finds 힐스테이트 동탄역 as top match for normal, reversed, space-less, and chosung queries on real catalog', () => {
      const realCatalog = Object.values(buildInitialApartments()).flat();
      expect(realCatalog.length).toBeGreaterThan(150);

      expect(filterAndRankApartments(realCatalog, '힐스테이트 동탄역')[0]?.name).toBe('힐스테이트 동탄역');
      expect(filterAndRankApartments(realCatalog, '동탄역 힐스테이트')[0]?.name).toBe('힐스테이트 동탄역');
      expect(filterAndRankApartments(realCatalog, '힐스테이트동탄역')[0]?.name).toBe('힐스테이트 동탄역');
      expect(filterAndRankApartments(realCatalog, 'ㅎㅅㅌㅇㅌ ㄷㅌㅇ')[0]?.name).toBe('힐스테이트 동탄역');
    });
  });
});
