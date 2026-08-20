import { getSupplyPyeong } from './areaConverter';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const areaConverterCjs = require('./areaConverter.js');

describe('areaConverter (ESM & CJS compatibility)', () => {
  it('handles invalid or zero area gracefully', () => {
    expect(getSupplyPyeong('KCC스위첸아파트', 0)).toBe(0);
    expect(getSupplyPyeong('KCC스위첸아파트', NaN)).toBe(0);
    expect(getSupplyPyeong('', 0)).toBe(0);
  });

  it('uses formula fallback when apartment or area is not in type-map.json', () => {
    // Formula: Math.round(area * 0.3025 * 1.33 * 10) / 10
    const testArea = 84.95;
    const expected = Math.round(84.95 * 0.3025 * 1.33 * 10) / 10;
    expect(getSupplyPyeong('UnknownApartmentXYZ', testArea)).toBe(expected);
  });

  it('matches exact apartment and area from type-map.json', () => {
    // KCC스위첸아파트, area: 84.01, typeM2: 108A -> 108 * 0.3025 = 32.67 -> 32.7
    const result = getSupplyPyeong('KCC스위첸아파트', 84.01);
    expect(result).toBeGreaterThan(0);
    expect(typeof result).toBe('number');
  });

  it('normalizes apartment name with special characters and whitespace', () => {
    const res1 = getSupplyPyeong('[동탄] KCC 스위첸 아파트', 84.01);
    const res2 = getSupplyPyeong('KCC스위첸아파트', 84.01);
    expect(res1).toBe(res2);
  });

  it('tolerates small area differences (< 0.11 m²)', () => {
    // 84.01 + 0.05 = 84.06
    const resExact = getSupplyPyeong('KCC스위첸아파트', 84.01);
    const resTolerance = getSupplyPyeong('KCC스위첸아파트', 84.01 + 0.03);
    expect(resTolerance).toBe(resExact);
  });

  it('maintains parity between ESM getSupplyPyeong and CJS getSupplyPyeong', () => {
    const testCases: [string, number][] = [
      ['KCC스위첸아파트', 84.01],
      ['METAPOLIS', 96.22],
      ['UnknownApt', 59.95],
      ['동탄역시범우남퍼스트빌', 84.98],
      ['', 0],
    ];

    for (const [apt, area] of testCases) {
      const esmResult = getSupplyPyeong(apt, area);
      const cjsResult = areaConverterCjs.getSupplyPyeong(apt, area);
      expect(esmResult).toBe(cjsResult);
    }
  });
});
