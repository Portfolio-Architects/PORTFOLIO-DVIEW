/* eslint-disable @typescript-eslint/no-require-imports */
import fs from 'fs';
import path from 'path';

const {
  isCancelledTransaction: isCancelledSummarizer,
  calculateApartmentSummary,
  formatRecentTransactions,
  normalizeAptName: normalizeSummarizer
} = require('../../scripts/pipeline/apartmentSummarizer');

const {
  isCancelledTransaction: isCancelledMacro,
  accumulateMacroTrend,
  initMacroTrendData,
  generateMacroTrendSeries
} = require('../../scripts/pipeline/macroTrendCalculator');

const {
  isCancelledTransaction: isCancelledOutlier
} = require('../../scripts/pipeline/outlierFilters');

const {
  isCancelledTransaction: isCancelledValidator,
  validateTransactions
} = require('../../scripts/validate-transactions');

const { writeApartmentChunks } = require('../../scripts/pipeline/fileGenerators');

describe('Final Adversarial Verification Suite: Empirical Re-challenge', () => {

  // ──────────────────────────────────────────────────────────────────────────
  // Objective 1: Numeric cancellation dates
  // ──────────────────────────────────────────────────────────────────────────
  describe('Objective 1: Numeric cancellation dates', () => {
    const numericTestCases = [
      { label: 'numeric cancelDate 20260401', tx: { cancelDate: 20260401 } },
      { label: 'numeric cdealDay 20250620', tx: { cdealDay: 20250620 } },
      { label: 'numeric cancelDate float 20260401.0', tx: { cancelDate: 20260401.0 } },
      { label: 'both numeric cancelDate 20260401 and cdealDay 20250620', tx: { cancelDate: 20260401, cdealDay: 20250620 } },
      { label: 'numeric cancelDate 20260401 with string null cdealDay', tx: { cancelDate: 20260401, cdealDay: 'null' } },
      { label: 'string undefined cancelDate with numeric cdealDay 20250620', tx: { cancelDate: 'undefined', cdealDay: 20250620 } },
      { label: 'numeric cancelDate 20260401 with hyphen cdealDay', tx: { cancelDate: 20260401, cdealDay: '-' } },
    ];

    numericTestCases.forEach(({ label, tx }) => {
      it(`should recognize ${label} as cancelled across all modules`, () => {
        expect(isCancelledSummarizer(tx)).toBe(true);
        expect(isCancelledMacro(tx)).toBe(true);
        expect(isCancelledOutlier(tx)).toBe(true);
        expect(isCancelledValidator(tx)).toBe(true);
      });
    });

    it('should not leak numeric cancelled transactions into calculateApartmentSummary', () => {
      const baseActiveTxs = [
        { aptName: '동탄역 롯데캐슬', contractYm: '202605', contractDay: '05', contractDate: '20260505', price: 150000, area: 84.82, areaPyeong: 34, floor: 10, dealType: '매매' },
        { aptName: '동탄역 롯데캐슬', contractYm: '202605', contractDay: '10', contractDate: '20260510', price: 155000, area: 84.82, areaPyeong: 34, floor: 15, dealType: '매매' },
        { aptName: '동탄역 롯데캐슬', contractYm: '202605', contractDay: '15', contractDate: '20260515', price: 160000, area: 84.82, areaPyeong: 34, floor: 20, dealType: '매매' },
        { aptName: '동탄역 롯데캐슬', contractYm: '202605', contractDay: '20', contractDate: '20260520', price: 152000, area: 84.82, areaPyeong: 34, floor: 12, dealType: '매매' },
        { aptName: '동탄역 롯데캐슬', contractYm: '202605', contractDay: '25', contractDate: '20260525', price: 158000, area: 84.82, areaPyeong: 34, floor: 25, dealType: '매매' },
      ];

      const adversarialCancelledNumeric = [
        { aptName: '동탄역 롯데캐슬', contractYm: '202605', contractDay: '28', contractDate: '20260528', price: 9999999, area: 84.82, areaPyeong: 34, floor: 30, dealType: '매매', cancelDate: 20260601 },
        { aptName: '동탄역 롯데캐슬', contractYm: '202605', contractDay: '01', contractDate: '20260501', price: 10, area: 84.82, areaPyeong: 34, floor: 1, dealType: '매매', cdealDay: 20250620 },
        { aptName: '동탄역 롯데캐슬', contractYm: '202605', contractDay: '29', contractDate: '20260529', price: 8888888, area: 84.82, areaPyeong: 34, floor: 28, dealType: '매매', cancelDate: 20260602, cdealDay: 'null' },
      ];

      const pureSummary = calculateApartmentSummary('동탄역 롯데캐슬', baseActiveTxs, [], {}, new Date(2026, 4, 30));
      const pollutedSummary = calculateApartmentSummary('동탄역 롯데캐슬', [...baseActiveTxs, ...adversarialCancelledNumeric], [], {}, new Date(2026, 4, 30));

      expect(pollutedSummary.maxPrice).toBe(160000);
      expect(pollutedSummary.minPrice).toBe(150000);
      expect(pollutedSummary.txCount).toBe(5);
      expect(pollutedSummary.maxPrice).toBe(pureSummary.maxPrice);
      expect(pollutedSummary.minPrice).toBe(pureSummary.minPrice);
      expect(pollutedSummary.txCount).toBe(pureSummary.txCount);

      const pureRecent = formatRecentTransactions(baseActiveTxs, new Date(2026, 4, 30));
      const pollutedRecent = formatRecentTransactions([...baseActiveTxs, ...adversarialCancelledNumeric], new Date(2026, 4, 30));
      expect(pollutedRecent.length).toBe(pureRecent.length);
    });

    it('should not leak numeric cancelled transactions into accumulateMacroTrend', () => {
      const baseActiveTxs = [
        { aptName: '동탄역 롯데캐슬', contractYm: '202605', contractDay: '05', contractDate: '20260505', price: 150000, area: 84.82, areaPyeong: 34, floor: 10, dealType: '매매' },
        { aptName: '동탄역 롯데캐슬', contractYm: '202605', contractDay: '25', contractDate: '20260525', price: 158000, area: 84.82, areaPyeong: 34, floor: 25, dealType: '매매' },
      ];
      const cancelledTx = {
        aptName: '동탄역 롯데캐슬', contractYm: '202605', contractDay: '30', contractDate: '20260530', price: 9999999, area: 84.82, areaPyeong: 34, floor: 30, dealType: '매매', cancelDate: 20260601
      };

      const { macroTrendData: pureMacro, trendMonths: tmPure } = initMacroTrendData(12, 0, new Date(2026, 4, 30));
      const { macroTrendData: pollutedMacro, trendMonths: tmPolluted } = initMacroTrendData(12, 0, new Date(2026, 4, 30));

      accumulateMacroTrend(pureMacro, tmPure, baseActiveTxs, []);
      accumulateMacroTrend(pollutedMacro, tmPolluted, [...baseActiveTxs, cancelledTx], []);

      const pureSeries = generateMacroTrendSeries(pureMacro, tmPure);
      const pollutedSeries = generateMacroTrendSeries(pollutedMacro, tmPolluted);

      const pureMay = pureSeries.find(s => s.name === '26.05');
      const pollutedMay = pollutedSeries.find(s => s.name === '26.05');

      expect(pollutedMay?.['동탄 아파트 전체']).toBe(pureMay?.['동탄 아파트 전체']);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Objective 2: String literal null/undefined guards
  // ──────────────────────────────────────────────────────────────────────────
  describe('Objective 2: String literal null/undefined guards', () => {
    const pseudoNullVariants = [
      { label: "cancelDate: 'null'", tx: { cancelDate: 'null' } },
      { label: "cancelDate: 'undefined'", tx: { cancelDate: 'undefined' } },
      { label: "cancelDate: 'NULL'", tx: { cancelDate: 'NULL' } },
      { label: "cancelDate: 'UNDEFINED'", tx: { cancelDate: 'UNDEFINED' } },
      { label: "cancelDate: 'nan'", tx: { cancelDate: 'nan' } },
      { label: "cancelDate: 'NaN'", tx: { cancelDate: 'NaN' } },
      { label: "cancelDate: ''", tx: { cancelDate: '' } },
      { label: "cancelDate: '   '", tx: { cancelDate: '   ' } },
      { label: "cancelDate: '-'", tx: { cancelDate: '-' } },
      { label: "cdealDay: 'null'", tx: { cdealDay: 'null' } },
      { label: "cdealDay: 'undefined'", tx: { cdealDay: 'undefined' } },
      { label: "cdealDay: 'NULL'", tx: { cdealDay: 'NULL' } },
      { label: "cdealDay: 'UNDEFINED'", tx: { cdealDay: 'UNDEFINED' } },
      { label: "cdealDay: 'nan'", tx: { cdealDay: 'nan' } },
      { label: "cdealDay: '-'", tx: { cdealDay: '-' } },
      { label: "cdealDay: '   '", tx: { cdealDay: '   ' } },
      { label: "both cancelDate: 'null' & cdealDay: 'undefined'", tx: { cancelDate: 'null', cdealDay: 'undefined' } },
      { label: "both cancelDate: '-' & cdealDay: 'null'", tx: { cancelDate: '-', cdealDay: 'null' } },
    ];

    pseudoNullVariants.forEach(({ label, tx }) => {
      it(`should NOT flag ${label} as cancelled`, () => {
        expect(isCancelledSummarizer(tx)).toBe(false);
        expect(isCancelledMacro(tx)).toBe(false);
        expect(isCancelledOutlier(tx)).toBe(false);
        expect(isCancelledValidator(tx)).toBe(false);
      });
    });

    it('should include active records with string nulls in calculations', () => {
      const activeRecords = [
        { aptName: '동탄역 롯데캐슬', contractYm: '202605', contractDay: '12', contractDate: '20260512', price: 170000, area: 84.82, areaPyeong: 34, floor: 35, dealType: '매매', cancelDate: 'null' },
        { aptName: '동탄역 롯데캐슬', contractYm: '202605', contractDay: '18', contractDate: '20260518', price: 145000, area: 84.82, areaPyeong: 34, floor: 5, dealType: '매매', cancelDate: 'undefined', cdealDay: '-' },
      ];
      const summary = calculateApartmentSummary('동탄역 롯데캐슬', activeRecords, [], {}, new Date(2026, 4, 30));
      expect(summary.txCount).toBe(2);
      expect(summary.maxPrice).toBe(170000);
      expect(summary.minPrice).toBe(145000);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Objective 3: Complex key normalization
  // ──────────────────────────────────────────────────────────────────────────
  describe('Objective 3: Complex key normalization', () => {
    function getCanonicalAptKey(name: string) {
      let key = normalizeSummarizer(name);
      if (key === '금호어울림레이크1차' || key === '장지동금호어울림레이크1차' || key.includes('금호어울림레이크1차')) {
        key = '금호어울림레이크';
      }
      return key;
    }

    it('should map fresh records for "금호어울림 레이크 1차" to "금호어울림레이크"', () => {
      const names = [
        '금호어울림 레이크 1차',
        '금호어울림레이크 1차',
        '금호어울림레이크1차',
        '  장지동 금호어울림 레이크 1차  ',
        '장지동금호어울림레이크1차',
        '동탄호수공원 금호어울림 레이크 1차',
        '금호어울림레이크'
      ];
      for (const n of names) {
        expect(getCanonicalAptKey(n)).toBe('금호어울림레이크');
      }
      expect(getCanonicalAptKey('금호어울림 레이크 2차')).not.toBe('금호어울림레이크');
    });

    it('should consolidate byApt chunks without dual split keys or data loss', () => {
      const testDir = path.resolve(__dirname, '../../scratch/jest-final-chunks');
      if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true });

      const mockByApt = {
        '금호어울림레이크': [
          { contractYm: '202605', contractDay: '05', contractDate: '20260505', price: 68000, area: 74.5, areaPyeong: 29, floor: 12, dealType: '매매' }
        ],
        '금호어울림레이크1차': [
          { contractYm: '202605', contractDay: '10', contractDate: '20260510', price: 65000, area: 74.5, areaPyeong: 29, floor: 10, dealType: '매매' }
        ],
        '장지동금호어울림레이크1차': [
          { contractYm: '202605', contractDay: '15', contractDate: '20260515', price: 67000, area: 74.5, areaPyeong: 29, floor: 14, dealType: '매매' }
        ],
        '금호어울림 레이크 1차': [
          { contractYm: '202605', contractDay: '20', contractDate: '20260520', price: 69000, area: 74.5, areaPyeong: 29, floor: 18, dealType: '매매' }
        ]
      };

      writeApartmentChunks(testDir, ['금호어울림 레이크 1차'], mockByApt, false);

      const indexData = JSON.parse(fs.readFileSync(path.join(testDir, '_index.json'), 'utf8'));
      expect(indexData).toContain('금호어울림레이크');
      expect(indexData).not.toContain('금호어울림레이크1차');

      const chunkFile = path.join(testDir, '금호어울림레이크.json');
      expect(fs.existsSync(chunkFile)).toBe(true);

      const splitChunk = path.join(testDir, '금호어울림레이크1차.json');
      expect(fs.existsSync(splitChunk)).toBe(false);

      const mergedRecords = JSON.parse(fs.readFileSync(chunkFile, 'utf8'));
      expect(mergedRecords.length).toBe(4);

      fs.rmSync(testDir, { recursive: true });
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Objective 4: Validation schema error resilience
  // ──────────────────────────────────────────────────────────────────────────
  describe('Objective 4: Validation schema error resilience', () => {
    it('should safely handle invalid and malformed records without throwing TypeError', () => {
      const malformedInputs = [
        null,
        undefined,
        "not-a-record",
        12345,
        true,
        [],
        {},
        { aptName: '' },
        { contractDate: '20260901', price: 100000, area: 84.0 },
        { aptName: '동탄역 롯데캐슬', contractDate: '20260901', price: 'invalid_price', area: 84.0 },
        { aptName: '동탄역 롯데캐슬', contractDate: '20260901', price: 100000, area: -10 },
        { aptName: '동탄역 롯데캐슬', contractDate: '20260901', price: 100000, area: 84.0, floor: 1.5 },
        { aptName: '동탄역 롯데캐슬', contractDate: 'invalid_date', price: 100000, area: 84.0, floor: 10 },
        { aptName: '동탄역 롯데캐슬', contractDate: '20260901', price: 150000, area: 84.82, floor: 10, dealType: '매매' }
      ];

      expect(() => {
        const result = validateTransactions(malformedInputs);
        expect(result.valid.length).toBe(1);
        expect(result.errors.length).toBeGreaterThanOrEqual(10);
        const zodErrors = result.errors.filter((e: any) => e.issue && e.issue.startsWith('Zod 검증 실패'));
        expect(zodErrors.length).toBeGreaterThanOrEqual(9);
      }).not.toThrow();
    });
  });
});
