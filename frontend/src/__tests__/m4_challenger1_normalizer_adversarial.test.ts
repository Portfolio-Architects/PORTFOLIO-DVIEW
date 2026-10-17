/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * @file m4_challenger1_normalizer_adversarial.test.ts
 * @description Empirical Challenger 1 Adversarial Test Harness for Milestone 4 Normalizer Core.
 * Tests all 6 core functions across extreme edge cases, unicode normalization,
 * zero-width characters, cancellation multi-flag tuples, number vs string idempotence,
 * supply pyeong reverse calculations, and chunk filename sanitization.
 * 
 * Strict Compliance: HODEP v2.2 Deterministic Epistemic Protocol.
 */

import {
  normalizeAptName as normalizeAptNameTs,
  isCancelledTransaction as isCancelledTransactionTs,
  generateCanonicalTxKey as generateCanonicalTxKeyTs,
  getSupplyPyeong as getSupplyPyeongTs,
  sanitizeAptKey as sanitizeAptKeyTs,
  sanitizeAptChunkFileName as sanitizeAptChunkFileNameTs,
} from '../../pipeline/core/normalizer';

const {
  normalizeAptName: normalizeAptNameCjs,
  isCancelledTransaction: isCancelledTransactionCjs,
  generateCanonicalTxKey: generateCanonicalTxKeyCjs,
  getSupplyPyeong: getSupplyPyeongCjs,
  sanitizeAptKey: sanitizeAptKeyCjs,
  sanitizeAptChunkFileName: sanitizeAptChunkFileNameCjs,
} = require('../../pipeline/core/normalizer');

describe('Milestone 4 Challenger 1: Empirical Adversarial Test Harness for Normalizer Core', () => {

  // ==========================================================================
  // 1. normalizeAptName Adversarial Stress Suite
  // ==========================================================================
  describe('1. normalizeAptName Invariants & Edge Cases', () => {
    it('should recompose NFD decomposed Korean jamo into identical NFC syllables', () => {
      const canonicalNames = [
        '동탄역롯데캐슬',
        '동탄시범다은포스코더샵',
        '동탄숲속마을자연앤경남아너스빌1115-0',
        '동탄역센트럴자이A-10',
        '휴먼시아7단지아파트',
        '동탄역유보라아이비파크',
      ];

      for (const name of canonicalNames) {
        const nfd = name.normalize('NFD');
        expect(nfd).not.toBe(name); // Verify actual Unicode decomposition
        expect(normalizeAptNameTs(nfd)).toBe(name);
        expect(normalizeAptNameCjs(nfd)).toBe(name);
      }
    });

    it('should eliminate all zero-width characters (\\u200B, \\u200C, \\u200D, \\uFEFF)', () => {
      const contaminated = [
        '동\u200B탄\u200B역\u200B롯\u200B데\u200B캐\u200B슬',
        '동\u200C탄\u200D역\uFEFF롯데캐슬',
        '\uFEFF\u200B동탄역롯데캐슬\u200C\u200D',
        '동\u200B\u200C\u200D\uFEFF탄역롯데캐슬',
      ];

      for (const input of contaminated) {
        expect(normalizeAptNameTs(input)).toBe('동탄역롯데캐슬');
        expect(normalizeAptNameCjs(input)).toBe('동탄역롯데캐슬');
      }
    });

    it('should strip bracketed dong prefixes deterministically', () => {
      const testCases = [
        { input: '[오산동] 동탄역 롯데캐슬', expected: '동탄역롯데캐슬' },
        { input: '[반송동]  시범한빛 금호어울림', expected: '시범한빛금호어울림' },
        { input: '[청계동]   동탄역 시범 우남퍼스트빌', expected: '동탄역시범우남퍼스트빌' },
        { input: '[목동] 동탄2 호반베르디움', expected: '동탄2호반베르디움' },
        { input: '[산척동] [동탄2] 더레이크시티 부영', expected: '더레이크시티부영' },
      ];

      for (const { input, expected } of testCases) {
        expect(normalizeAptNameTs(input)).toBe(expected);
        expect(normalizeAptNameCjs(input)).toBe(expected);
      }
    });

    it('should remove halfwidth and fullwidth parentheses without corrupting inner content', () => {
      const testCases = [
        { input: '동탄숲속마을자연앤경남아너스빌(1115-0)', expected: '동탄숲속마을자연앤경남아너스빌1115-0' },
        { input: '동탄숲속마을자연앤경남아너스빌（1124-0）', expected: '동탄숲속마을자연앤경남아너스빌1124-0' },
        { input: '동탄역센트럴자이(A-10)', expected: '동탄역센트럴자이A-10' },
        { input: '동탄역센트럴자이（A-10）', expected: '동탄역센트럴자이A-10' },
        { input: '신안인스빌리베라(A32블록)', expected: '신안인스빌리베라A32블록' },
      ];

      for (const { input, expected } of testCases) {
        expect(normalizeAptNameTs(input)).toBe(expected);
        expect(normalizeAptNameCjs(input)).toBe(expected);
      }
    });

    it('should collapse consecutive dots and remove trailing dots while preserving legal decimal numbers', () => {
      const testCases = [
        { input: '휴먼시아7단지아파트...', expected: '휴먼시아7단지아파트' },
        { input: '휴먼시아7단지아파트..', expected: '휴먼시아7단지아파트' },
        { input: '휴먼시아7단지아파트.', expected: '휴먼시아7단지아파트' },
        { input: '휴먼시아...7단지', expected: '휴먼시아7단지' },
        { input: '동탄역유보라1.0단지', expected: '동탄역유보라1.0단지' }, // Interior single decimal preserved
        { input: '동탄역유보라10.2단지', expected: '동탄역유보라10.2단지' },
      ];

      for (const { input, expected } of testCases) {
        expect(normalizeAptNameTs(input)).toBe(expected);
        expect(normalizeAptNameCjs(input)).toBe(expected);
      }
    });

    it('should handle null, undefined, empty string, and non-string types safely', () => {
      expect(normalizeAptNameTs(null)).toBe('');
      expect(normalizeAptNameTs(undefined)).toBe('');
      expect(normalizeAptNameTs('')).toBe('');
      expect(normalizeAptNameTs('   \t\n  ')).toBe('');
      expect(normalizeAptNameCjs(null)).toBe('');
      expect(normalizeAptNameCjs(undefined)).toBe('');
      expect(normalizeAptNameCjs('')).toBe('');
      expect(normalizeAptNameCjs('   \t\n  ')).toBe('');
    });
  });

  // ==========================================================================
  // 2. isCancelledTransaction Adversarial Matrix Suite
  // ==========================================================================
  describe('2. isCancelledTransaction Multi-Flag Matrix & Edge Cases', () => {
    it('should correctly identify cancelDealDay across diverse date formats and numbers', () => {
      const positiveCases = [
        { cancelDealDay: '20260401' },
        { cancelDealDay: 20260401 },
        { cancelDealDay: '2026-04-01' },
        { cancelDealDay: '2026.04.01' },
        { cancelDealDay: ' 20260401 ' },
      ];

      for (const tx of positiveCases) {
        expect(isCancelledTransactionTs(tx)).toBe(true);
        expect(isCancelledTransactionCjs(tx)).toBe(true);
      }
    });

    it('should reject invalid or pseudo-empty cancelDealDay values', () => {
      const negativeCases = [
        { cancelDealDay: '-' },
        { cancelDealDay: '' },
        { cancelDealDay: '   ' },
        { cancelDealDay: 'null' },
        { cancelDealDay: 'undefined' },
        { cancelDealDay: 'nan' },
        { cancelDealDay: null },
        { cancelDealDay: undefined },
      ];

      for (const tx of negativeCases) {
        expect(isCancelledTransactionTs(tx)).toBe(false);
        expect(isCancelledTransactionCjs(tx)).toBe(false);
      }
    });

    it('should evaluate full 5-tuple combination matrix for cancellation indicators', () => {
      const matrix = [
        // Tuple: [isCanceled, cdealType, cdealDay, cancelDate, cancelDealDay, expected]
        { tuple: { isCanceled: true, cdealType: null, cdealDay: null, cancelDate: null, cancelDealDay: null }, expected: true },
        { tuple: { isCanceled: false, cdealType: 'O', cdealDay: null, cancelDate: null, cancelDealDay: null }, expected: true },
        { tuple: { isCanceled: false, cdealType: '해제', cdealDay: null, cancelDate: null, cancelDealDay: null }, expected: true },
        { tuple: { isCanceled: false, cdealType: '정상', cdealDay: '20260101', cancelDate: null, cancelDealDay: null }, expected: true },
        { tuple: { isCanceled: false, cdealType: '정상', cdealDay: '-', cancelDate: 20260101, cancelDealDay: null }, expected: true },
        { tuple: { isCanceled: false, cdealType: '정상', cdealDay: '-', cancelDate: '-', cancelDealDay: '20260101' }, expected: true },
        { tuple: { isCanceled: false, cdealType: '정상', cdealDay: '-', cancelDate: '-', cancelDealDay: '-' }, expected: false },
        { tuple: { isCanceled: null, cdealType: '', cdealDay: 'null', cancelDate: 'undefined', cancelDealDay: 'nan' }, expected: false },
        { tuple: {}, expected: false },
      ];

      for (const { tuple, expected } of matrix) {
        expect(isCancelledTransactionTs(tuple)).toBe(expected);
        expect(isCancelledTransactionCjs(tuple)).toBe(expected);
      }
    });

    it('should defend against non-object or null/undefined inputs gracefully', () => {
      expect(isCancelledTransactionTs(null)).toBe(false);
      expect(isCancelledTransactionTs(undefined)).toBe(false);
      // @ts-expect-error - adversarial type injection
      expect(isCancelledTransactionTs('cancelled')).toBe(false);
      // @ts-expect-error - adversarial type injection
      expect(isCancelledTransactionTs(12345)).toBe(false);
      // @ts-expect-error - adversarial type injection
      expect(isCancelledTransactionTs(true)).toBe(false);
    });
  });

  // ==========================================================================
  // 3. generateCanonicalTxKey Idempotence & Formatting Invariants
  // ==========================================================================
  describe('3. generateCanonicalTxKey Idempotence & Boundary Format', () => {
    it('should maintain strict idempotence across Number vs String representations', () => {
      const numTx = {
        aptName: '동탄역 롯데캐슬',
        dealDate: 20260515,
        area: 84.5,
        floor: 15,
        price: 165000,
        dealType: '매매',
      };

      const strTx = {
        aptName: '[오산동] 동탄역 롯데캐슬',
        dealDate: '2026-05-15',
        area: '84.500',
        floor: '15',
        price: '165000',
        dealType: '매매',
      };

      const dotDateTx = {
        aptName: '동탄역롯데캐슬',
        dealDate: '2026.05.15',
        area: 84.50,
        floor: 15,
        price: 165000,
        dealType: '매매',
      };

      const expectedKey = 'TX_동탄역롯데캐슬_20260515_84.50_15_165000_매매';

      expect(generateCanonicalTxKeyTs(numTx)).toBe(expectedKey);
      expect(generateCanonicalTxKeyTs(strTx)).toBe(expectedKey);
      expect(generateCanonicalTxKeyTs(dotDateTx)).toBe(expectedKey);

      expect(generateCanonicalTxKeyCjs(numTx)).toBe(expectedKey);
      expect(generateCanonicalTxKeyCjs(strTx)).toBe(expectedKey);
      expect(generateCanonicalTxKeyCjs(dotDateTx)).toBe(expectedKey);
    });

    it('should format float area to fixed 2 decimal places deterministically', () => {
      const cases = [
        { area: 84.908, expected: '84.91' },
        { area: 84.904, expected: '84.90' },
        { area: 84, expected: '84.00' },
        { area: '102.5', expected: '102.50' },
        { area: 0, expected: '0.00' },
        { area: 'invalid', expected: '0.00' },
      ];

      for (const { area, expected } of cases) {
        const key = generateCanonicalTxKeyTs({
          aptName: '동탄역롯데캐슬',
          dealDate: '20260515',
          area,
          floor: 10,
          price: 100000,
        });
        expect(key).toBe(`TX_동탄역롯데캐슬_20260515_${expected}_10_100000_매매`);
      }
    });

    it('should normalize dealType and fallback to "매매" for non-rent types', () => {
      const dealTypeCases = [
        { dealType: '전세', expected: '전세' },
        { dealType: '월세', expected: '월세' },
        { dealType: '매매', expected: '매매' },
        { dealType: '  전세  ', expected: '전세' },
        { dealType: '  월세  ', expected: '월세' },
        { dealType: '직거래', expected: '매매' },
        { dealType: '', expected: '매매' },
        { dealType: null, expected: '매매' },
        { dealType: undefined, expected: '매매' },
      ];

      for (const { dealType, expected } of dealTypeCases) {
        const key = generateCanonicalTxKeyTs({
          aptName: '동탄역롯데캐슬',
          dealDate: '20260515',
          area: 84.5,
          floor: 10,
          price: 100000,
          dealType,
        });
        expect(key).toBe(`TX_동탄역롯데캐슬_20260515_84.50_10_100000_${expected}`);
      }
    });

    it('should handle dealDate padding and slice to 8 characters', () => {
      const dateCases = [
        { dealDate: '202605', expectedDate: '20260500' },
        { dealDate: '202605152359', expectedDate: '20260515' },
        { dealDate: '', expectedDate: '00000000' },
        { dealDate: 0, expectedDate: '00000000' },
      ];

      for (const { dealDate, expectedDate } of dateCases) {
        const key = generateCanonicalTxKeyTs({
          aptName: '동탄역롯데캐슬',
          dealDate,
          area: 84.5,
          floor: 1,
          price: 50000,
        });
        expect(key).toBe(`TX_동탄역롯데캐슬_${expectedDate}_84.50_1_50000_매매`);
      }
    });

    it('should return empty string for null or non-object input', () => {
      // @ts-expect-error - adversarial null test
      expect(generateCanonicalTxKeyTs(null)).toBe('');
      // @ts-expect-error - adversarial undefined test
      expect(generateCanonicalTxKeyTs(undefined)).toBe('');
    });
  });

  // ==========================================================================
  // 4. getSupplyPyeong Adversarial Suite
  // ==========================================================================
  describe('4. getSupplyPyeong Exact Match, Tolerance & Formula Fallback', () => {
    it('should return 0 for zero, NaN, or negative areas', () => {
      expect(getSupplyPyeongTs('동탄역롯데캐슬', 0)).toBe(0);
      expect(getSupplyPyeongTs('동탄역롯데캐슬', NaN)).toBe(0);
      expect(getSupplyPyeongCjs('동탄역롯데캐슬', 0)).toBe(0);
      expect(getSupplyPyeongCjs('동탄역롯데캐슬', NaN)).toBe(0);
    });

    it('should resolve exact match from type-map.json', () => {
      // KCC스위첸아파트 area 84.01 has typeM2 108A -> 108 * 0.3025 = 32.67 -> 32.7 pyeong
      const pyeong = getSupplyPyeongTs('KCC스위첸아파트', 84.01);
      expect(pyeong).toBe(32.7);
      expect(getSupplyPyeongCjs('KCC스위첸아파트', 84.01)).toBe(32.7);
    });

    it('should resolve tolerance match (< 0.11 m²) when exact float differs slightly', () => {
      // 84.01 +- 0.05
      const pyeongTolerance = getSupplyPyeongTs('KCC스위첸아파트', 84.05);
      expect(pyeongTolerance).toBe(32.7);
      expect(getSupplyPyeongCjs('KCC스위첸아파트', 84.05)).toBe(32.7);
    });

    it('should calculate deterministic formula fallback for unknown complexes or areas', () => {
      // Formula: Math.round(area * 0.3025 * 1.33 * 10) / 10
      const area = 84.9;
      const expectedPyeong = Math.round(area * 0.3025 * 1.33 * 10) / 10; // 34.2
      const result = getSupplyPyeongTs('가상미존재아파트단지', area);
      expect(result).toBe(expectedPyeong);
      expect(getSupplyPyeongCjs('가상미존재아파트단지', area)).toBe(expectedPyeong);
    });

    it('should normalize complex name before looking up in type-map', () => {
      // [오산동] KCC스위첸아파트 should normalize to KCC스위첸아파트 and match
      const pyeongUnnormalized = getSupplyPyeongTs('[반송동] KCC 스위첸 아파트', 84.01);
      expect(pyeongUnnormalized).toBe(32.7);
    });
  });

  // ==========================================================================
  // 5. sanitizeAptKey Special Characters & Invariants
  // ==========================================================================
  describe('5. sanitizeAptKey Roman Numerals, & and Illegal Characters', () => {
    it('should normalize Roman numerals (Ⅰ, Ⅱ, Ⅲ, Ⅳ) to Arabic numerals', () => {
      const cases = [
        { input: '시범다은포스코더샵Ⅰ', expected: '시범다은포스코더샵1' },
        { input: '동탄더샵Ⅱ단지', expected: '동탄더샵2단지' },
        { input: '신안인스빌Ⅲ', expected: '신안인스빌3' },
        { input: '호반베르디움Ⅳ', expected: '호반베르디움4' },
      ];

      for (const { input, expected } of cases) {
        expect(sanitizeAptKeyTs(input)).toBe(expected);
        expect(sanitizeAptKeyCjs(input)).toBe(expected);
      }
    });

    it('should replace ampersand (&) with Korean "앤"', () => {
      const cases = [
        { input: '자연&데시앙', expected: '자연앤데시앙' },
        { input: '동탄&아이파크', expected: '동탄앤아이파크' },
        { input: '자연 & 데시앙', expected: '자연앤데시앙' },
      ];

      for (const { input, expected } of cases) {
        expect(sanitizeAptKeyTs(input)).toBe(expected);
        expect(sanitizeAptKeyCjs(input)).toBe(expected);
      }
    });

    it('should remove commas and convert illegal filesystem characters to hyphens', () => {
      const input = '동탄역,더샵:퍼스트*뷰?1<2>3|4/5\\6';
      const expected = '동탄역더샵-퍼스트-뷰-1-2-3-4-5-6';

      expect(sanitizeAptKeyTs(input)).toBe(expected);
      expect(sanitizeAptKeyCjs(input)).toBe(expected);
    });

    it('should strip parentheses and consecutive/trailing dots', () => {
      const input = '동탄(숲속)마을...7단지..';
      const expected = '동탄숲속마을7단지';

      expect(sanitizeAptKeyTs(input)).toBe(expected);
      expect(sanitizeAptKeyCjs(input)).toBe(expected);
    });

    it('should return empty string for null, undefined, or empty string', () => {
      expect(sanitizeAptKeyTs(null)).toBe('');
      expect(sanitizeAptKeyTs(undefined)).toBe('');
      expect(sanitizeAptKeyTs('')).toBe('');
      expect(sanitizeAptKeyCjs(null)).toBe('');
      expect(sanitizeAptKeyCjs(undefined)).toBe('');
      expect(sanitizeAptKeyCjs('')).toBe('');
    });
  });

  // ==========================================================================
  // 6. sanitizeAptChunkFileName File System Safety Suite
  // ==========================================================================
  describe('6. sanitizeAptChunkFileName Pathological Filename Invariants', () => {
    it('should sanitize pathological full chunk filenames', () => {
      const testCases = [
        { input: '동탄숲속마을자연앤경남아너스빌(1115-0).json', expected: '동탄숲속마을자연앤경남아너스빌1115-0.json' },
        { input: '동탄숲속마을자연앤경남아너스빌(1124-0).json', expected: '동탄숲속마을자연앤경남아너스빌1124-0.json' },
        { input: '동탄역센트럴자이(A-10).json', expected: '동탄역센트럴자이A-10.json' },
        { input: '휴먼시아7단지아파트...json', expected: '휴먼시아7단지아파트.json' },
        { input: '휴먼시아7단지아파트..json', expected: '휴먼시아7단지아파트.json' },
        { input: '휴먼시아7단지아파트.json', expected: '휴먼시아7단지아파트.json' },
        { input: '동탄역 롯데캐슬.json', expected: '동탄역롯데캐슬.json' },
      ];

      for (const { input, expected } of testCases) {
        expect(sanitizeAptChunkFileNameTs(input)).toBe(expected);
        expect(sanitizeAptChunkFileNameCjs(input)).toBe(expected);
      }
    });

    it('should sanitize pathological recent chunk filenames (-recent.json)', () => {
      const testCases = [
        { input: '동탄숲속마을자연앤경남아너스빌(1115-0)-recent.json', expected: '동탄숲속마을자연앤경남아너스빌1115-0-recent.json' },
        { input: '동탄숲속마을자연앤경남아너스빌(1124-0)-recent.json', expected: '동탄숲속마을자연앤경남아너스빌1124-0-recent.json' },
        { input: '동탄역센트럴자이(A-10)-recent.json', expected: '동탄역센트럴자이A-10-recent.json' },
        { input: '휴먼시아7단지아파트..-recent.json', expected: '휴먼시아7단지아파트-recent.json' },
        { input: '휴먼시아7단지아파트.-recent.json', expected: '휴먼시아7단지아파트-recent.json' },
        { input: '휴먼시아7단지아파트-recent.json', expected: '휴먼시아7단지아파트-recent.json' },
        { input: '동탄역 롯데캐슬-recent.json', expected: '동탄역롯데캐슬-recent.json' },
      ];

      for (const { input, expected } of testCases) {
        expect(sanitizeAptChunkFileNameTs(input)).toBe(expected);
        expect(sanitizeAptChunkFileNameCjs(input)).toBe(expected);
      }
    });

    it('should automatically append .json when extension is omitted', () => {
      expect(sanitizeAptChunkFileNameTs('동탄역 롯데캐슬')).toBe('동탄역롯데캐슬.json');
      expect(sanitizeAptChunkFileNameCjs('동탄역 롯데캐슬')).toBe('동탄역롯데캐슬.json');
    });

    it('should return empty string for null, undefined, or empty string', () => {
      expect(sanitizeAptChunkFileNameTs('')).toBe('');
      // @ts-expect-error - adversarial null test
      expect(sanitizeAptChunkFileNameTs(null)).toBe('');
      // @ts-expect-error - adversarial undefined test
      expect(sanitizeAptChunkFileNameTs(undefined)).toBe('');
    });
  });

  // ==========================================================================
  // 7. Full CJS/TS Parity & Fuzzing Suite
  // ==========================================================================
  describe('7. CJS and TS Implementation Parity Fuzzing', () => {
    it('should produce identical outputs between TypeScript and CommonJS for 100 fuzzed inputs', () => {
      const specialChars = [' ', '\t', '\n', '\u200B', '(', ')', '（', '）', '.', '[오산동]', '&', 'Ⅰ', 'Ⅱ', ',', ':'];
      const words = ['동탄', '역', '롯데', '캐슬', '1115-0', '자연', '경남', '아너스빌', '7단지'];

      for (let i = 0; i < 100; i++) {
        // Construct pseudo-random dirty string
        const w1 = words[i % words.length];
        const s1 = specialChars[i % specialChars.length];
        const w2 = words[(i * 3 + 1) % words.length];
        const s2 = specialChars[(i * 7 + 2) % specialChars.length];
        const testStr = `${s1}${w1}${s2}${w2}`;

        const normTs = normalizeAptNameTs(testStr);
        const normCjs = normalizeAptNameCjs(testStr);
        expect(normTs).toBe(normCjs);

        const keyTs = sanitizeAptKeyTs(testStr);
        const keyCjs = sanitizeAptKeyCjs(testStr);
        expect(keyTs).toBe(keyCjs);

        const fileTs = sanitizeAptChunkFileNameTs(`${testStr}.json`);
        const fileCjs = sanitizeAptChunkFileNameCjs(`${testStr}.json`);
        expect(fileTs).toBe(fileCjs);
      }
    });
  });
});
