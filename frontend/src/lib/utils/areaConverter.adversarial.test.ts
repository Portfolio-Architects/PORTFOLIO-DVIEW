import { getSupplyPyeong as esmGetSupply } from './areaConverter';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const areaConverterCjs = require('./areaConverter.js');
import fs from 'fs';
import path from 'path';

describe('areaConverter Adversarial & Empirical Stress Harness', () => {
  const cjsGetSupply = areaConverterCjs.getSupplyPyeong;

  describe('1. Adversarial & Edge Inputs (null, undefined, NaN, 0, strings)', () => {
    it('returns 0 for falsy / invalid / zero area', () => {
      expect(esmGetSupply(undefined as unknown as string, undefined as unknown as number)).toBe(0);
      expect(cjsGetSupply(undefined, undefined)).toBe(0);
      expect(esmGetSupply(null as unknown as string, null as unknown as number)).toBe(0);
      expect(cjsGetSupply(null, null)).toBe(0);
      expect(esmGetSupply('동탄역롯데캐슬', NaN)).toBe(0);
      expect(cjsGetSupply('동탄역롯데캐슬', NaN)).toBe(0);
      expect(esmGetSupply('', 0)).toBe(0);
      expect(cjsGetSupply('', 0)).toBe(0);
      expect(esmGetSupply('AnyApartment', -0)).toBe(0);
      expect(cjsGetSupply('AnyApartment', -0)).toBe(0);
    });

    it('falls back to formula when apartment is null/undefined/empty but area is valid', () => {
      const area = 84.95;
      const expected = Math.round(84.95 * 0.3025 * 1.33 * 10) / 10;
      expect(esmGetSupply(null as unknown as string, area)).toBe(expected);
      expect(cjsGetSupply(null, area)).toBe(expected);
      expect(esmGetSupply(undefined as unknown as string, area)).toBe(expected);
      expect(cjsGetSupply(undefined, area)).toBe(expected);
      expect(esmGetSupply('', area)).toBe(expected);
      expect(cjsGetSupply('', area)).toBe(expected);
    });

    it('handles negative areas consistently using formula fallback', () => {
      const negArea = -50;
      const expectedNeg = Math.round(-50 * 0.3025 * 1.33 * 10) / 10;
      expect(esmGetSupply('동탄역롯데캐슬', negArea)).toBe(expectedNeg);
      expect(cjsGetSupply('동탄역롯데캐슬', negArea)).toBe(expectedNeg);
    });
  });

  describe('2. Prototype Keys & Security Boundaries', () => {
    it('safely handles Object prototype property names as apartment names without throwing or crashing', () => {
      const protoKeys = ['toString', 'valueOf', '__proto__', 'constructor', 'hasOwnProperty', 'isPrototypeOf'];
      const area = 84.95;
      const expected = Math.round(84.95 * 0.3025 * 1.33 * 10) / 10;

      for (const key of protoKeys) {
        const esmRes = esmGetSupply(key, area);
        const cjsRes = cjsGetSupply(key, area);
        expect(esmRes).toBe(expected);
        expect(cjsRes).toBe(expected);
      }
    });
  });

  describe('3. Unicode, Normalization & Complex Apartment Name Handling', () => {
    it('normalizes NFD decomposed Hangul to NFC matching dataset', () => {
      const nfdApt = '동탄역롯데캐슬'.normalize('NFD');
      const nfcApt = '동탄역롯데캐슬'.normalize('NFC');
      expect(esmGetSupply(nfdApt, 84.95)).toBe(esmGetSupply(nfcApt, 84.95));
      expect(cjsGetSupply(nfdApt, 84.95)).toBe(cjsGetSupply(nfcApt, 84.95));
    });

    it('strips bracket prefixes, fullwidth/halfwidth parentheses punctuation, whitespace, and zero-width chars', () => {
      // Test complex apartment name with danji in parens: "그린힐 반도유보라 아이비파크 10(1단지)"
      const baseVal = esmGetSupply('그린힐 반도유보라 아이비파크 10(1단지)', 59.7731);
      expect(baseVal).toBe(24.5); // 81 * 0.3025 = 24.5025 -> 24.5

      // Bracket prefix removal
      expect(esmGetSupply('[동탄2신도시] 그린힐 반도유보라 아이비파크 10(1단지)', 59.7731)).toBe(baseVal);
      // Fullwidth parens normalization
      expect(esmGetSupply('그린힐 반도유보라 아이비파크 10（1단지）', 59.7731)).toBe(baseVal);
      // Whitespace and tab variance
      expect(esmGetSupply('  그린힐   반도유보라 \t 아이비파크  10  ( 1단지 ) ', 59.7731)).toBe(baseVal);
      // Zero-width characters
      expect(esmGetSupply('\u200B그린힐\u200D반도유보라\uFEFF아이비파크 10(1단지)', 59.7731)).toBe(baseVal);

      // CJS parity on all normalization variants
      expect(cjsGetSupply('[동탄2신도시] 그린힐 반도유보라 아이비파크 10(1단지)', 59.7731)).toBe(baseVal);
      expect(cjsGetSupply('그린힐 반도유보라 아이비파크 10（1단지）', 59.7731)).toBe(baseVal);
      expect(cjsGetSupply('  그린힐   반도유보라 \t 아이비파크  10  ( 1단지 ) ', 59.7731)).toBe(baseVal);
      expect(cjsGetSupply('\u200B그린힐\u200D반도유보라\uFEFF아이비파크 10(1단지)', 59.7731)).toBe(baseVal);
    });
  });

  describe('4. Floating Point Precision & Tolerance Boundary Checks', () => {
    it('matches exact and near-exact floating point numbers within 0.11 m² for isolated area entry', () => {
      // METAPOLIS area: 96.22, typeM2: 135 -> 135 * 0.3025 = 40.8375 -> 40.8
      const baseVal = esmGetSupply('METAPOLIS', 96.22);
      expect(baseVal).toBe(40.8);

      // IEEE 754 float epsilon drift
      expect(esmGetSupply('METAPOLIS', 96.22000000000002)).toBe(baseVal);
      expect(cjsGetSupply('METAPOLIS', 96.22000000000002)).toBe(baseVal);

      // Within < 0.11 tolerance boundary
      expect(esmGetSupply('METAPOLIS', 96.22 + 0.10)).toBe(baseVal);
      expect(esmGetSupply('METAPOLIS', 96.22 - 0.10)).toBe(baseVal);
      expect(esmGetSupply('METAPOLIS', 96.22 + 0.1099)).toBe(baseVal);
      expect(esmGetSupply('METAPOLIS', 96.22 - 0.1099)).toBe(baseVal);

      expect(cjsGetSupply('METAPOLIS', 96.22 + 0.10)).toBe(baseVal);
      expect(cjsGetSupply('METAPOLIS', 96.22 - 0.10)).toBe(baseVal);
      expect(cjsGetSupply('METAPOLIS', 96.22 + 0.1099)).toBe(baseVal);
      expect(cjsGetSupply('METAPOLIS', 96.22 - 0.1099)).toBe(baseVal);
    });

    it('falls back to formula when outside tolerance (diff >= 0.11 m²)', () => {
      // METAPOLIS has 96.22, next entry is 107.778.
      // Query 96.22 + 0.111 (diff = 0.111 >= 0.11)
      const areaOutside = 96.22 + 0.111;
      const expectedFormula = Math.round(areaOutside * 0.3025 * 1.33 * 10) / 10;
      expect(esmGetSupply('METAPOLIS', areaOutside)).toBe(expectedFormula);
      expect(cjsGetSupply('METAPOLIS', areaOutside)).toBe(expectedFormula);
    });
  });

  describe('5. Fuzzing & 10,000 Iteration ESM vs CJS 1:1 Parity Oracle', () => {
    it('maintains 100% output parity across 10,000 randomized inputs', () => {
      const typeMapPath = path.join(process.cwd(), 'public', 'data', 'type-map.json');
      const typeMap = JSON.parse(fs.readFileSync(typeMapPath, 'utf8'));
      const aptNames = typeMap.map((t: { aptName?: string }) => t.aptName).filter(Boolean) as string[];

      const protoKeys = ['toString', 'valueOf', '__proto__', 'constructor', 'hasOwnProperty', 'isPrototypeOf'];
      let discrepancies = 0;

      for (let i = 0; i < 10000; i++) {
        let apt: unknown;
        const rand = Math.random();
        if (rand < 0.35) {
          const sample = aptNames[Math.floor(Math.random() * aptNames.length)];
          apt = Math.random() < 0.5 ? `[화성] ${sample}` : sample;
        } else if (rand < 0.55) {
          apt = `UnknownApt_${Math.random().toString(36).substring(2, 7)}`;
        } else if (rand < 0.7) {
          apt = protoKeys[Math.floor(Math.random() * protoKeys.length)];
        } else if (rand < 0.8) {
          apt = '';
        } else if (rand < 0.9) {
          apt = null;
        } else {
          apt = undefined;
        }

        let area: unknown;
        const areaRand = Math.random();
        if (areaRand < 0.35) {
          const baseAreas = [59.95, 84.01, 84.95, 96.22, 102.5, 134.2];
          area = baseAreas[Math.floor(Math.random() * baseAreas.length)] + (Math.random() * 0.2 - 0.1);
        } else if (areaRand < 0.6) {
          area = Math.random() * 250;
        } else if (areaRand < 0.7) {
          area = 0;
        } else if (areaRand < 0.8) {
          area = -Math.random() * 100;
        } else if (areaRand < 0.9) {
          area = NaN;
        } else if (areaRand < 0.95) {
          area = null;
        } else {
          area = undefined;
        }

        const esmVal = esmGetSupply(apt as string, area as number);
        const cjsVal = cjsGetSupply(apt, area);

        if (esmVal !== cjsVal) {
          discrepancies++;
        }
      }

      expect(discrepancies).toBe(0);
    });
  });
});
