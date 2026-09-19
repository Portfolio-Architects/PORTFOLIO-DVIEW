/* eslint-disable @typescript-eslint/no-require-imports */
import fs from 'fs';
import path from 'path';
import { HARDCODED_MAPPING, normalizeAptName as normalizeAptNameTs } from '../lib/utils/apartmentMapping';

// Pipeline CommonJS modules
const {
  isCancelledTransaction: isCancelledOutlier,
  filterOutliersRolling
} = require('../../scripts/pipeline/outlierFilters');

const {
  initMacroTrendData,
  accumulateMacroTrend,
  generateMacroTrendSeries,
  isCancelledTransaction: isCancelledMacro
} = require('../../scripts/pipeline/macroTrendCalculator');

const {
  formatPriceEok,
  parseYYYYMMDD,
  normalizeAptName: normalizeSummarizer,
  calculateApartmentSummary,
  formatRecentTransactions,
  isCancelledTransaction: isCancelledSummarizer
} = require('../../scripts/pipeline/apartmentSummarizer');

const { writeApartmentChunks } = require('../../scripts/pipeline/fileGenerators');

const {
  isCancelledTransaction: isCancelledValidator,
  normalizeAptName: normalizeValidator
} = require('../../scripts/validate-transactions');

describe('Empirical Adversarial Verification: Cancellation Filtering & Key Normalization', () => {

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Cancellation Variants & Edge Cases Classification
  // ──────────────────────────────────────────────────────────────────────────
  describe('1. Cancellation Filtering Classification', () => {
    const testCases = [
      { name: "spaced cancelDate ' 20260401 '", tx: { cancelDate: ' 20260401 ' }, expected: true },
      { name: "dash cancelDate '-'", tx: { cancelDate: '-' }, expected: false },
      { name: "empty cancelDate ''", tx: { cancelDate: '' }, expected: false },
      { name: "null cancelDate", tx: { cancelDate: null }, expected: false },
      { name: "undefined cancelDate", tx: { cancelDate: undefined }, expected: false },
      { name: "numeric cancelDate 20260401", tx: { cancelDate: 20260401 }, expected: true },
      { name: "dot format cdealDay '2025.06.20'", tx: { cdealDay: '2025.06.20' }, expected: true },
      { name: "numeric cdealDay 20250620", tx: { cdealDay: 20250620 }, expected: true },
      { name: "cdealType 'O'", tx: { cdealType: 'O' }, expected: true },
      { name: "cdealType '해제'", tx: { cdealType: '해제' }, expected: true },
      { name: "isCanceled true", tx: { isCanceled: true }, expected: true },
      { name: "string 'null' cancelDate", tx: { cancelDate: 'null' }, expected: false },
      { name: "string 'undefined' cancelDate", tx: { cancelDate: 'undefined' }, expected: false },
      { name: "normal active transaction", tx: { price: 85000, contractYm: '202605', dealType: '매매' }, expected: false },
      { name: "null transaction object", tx: null, expected: false },
      { name: "undefined transaction object", tx: undefined, expected: false },
    ];

    testCases.forEach(({ name, tx, expected }) => {
      it(`should classify ${name} accurately across all modules`, () => {
        const vResult = isCancelledValidator(tx);
        const sResult = isCancelledSummarizer(tx);
        const mResult = isCancelledMacro(tx);
        const oResult = isCancelledOutlier(tx);

        expect({ variant: name, validator: vResult }).toEqual({ variant: name, validator: expected });
        expect({ variant: name, summarizer: sResult }).toEqual({ variant: name, summarizer: expected });
        expect({ variant: name, macro: mResult }).toEqual({ variant: name, macro: expected });
        expect({ variant: name, outlier: oResult }).toEqual({ variant: name, outlier: expected });
      });
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Cancellation Distortion on Aggregations
  // ──────────────────────────────────────────────────────────────────────────
  describe('2. Cancellation Distortion on Aggregation Functions', () => {
    const activeTransactions = [
      { aptName: '동탄역시범우남퍼스트빌', contractYm: '202605', contractDay: '05', contractDate: '20260505', price: 95000, area: 84.9, areaPyeong: 34, dealType: '매매' },
      { aptName: '동탄역시범우남퍼스트빌', contractYm: '202605', contractDay: '10', contractDate: '20260510', price: 100000, area: 84.9, areaPyeong: 34, dealType: '매매' },
      { aptName: '동탄역시범우남퍼스트빌', contractYm: '202605', contractDay: '15', contractDate: '20260515', price: 105000, area: 84.9, areaPyeong: 34, dealType: '매매' },
      { aptName: '동탄역시범우남퍼스트빌', contractYm: '202605', contractDay: '20', contractDate: '20260520', price: 110000, area: 84.9, areaPyeong: 34, dealType: '매매' },
      { aptName: '동탄역시범우남퍼스트빌', contractYm: '202605', contractDay: '25', contractDate: '20260525', price: 102000, area: 84.9, areaPyeong: 34, dealType: '매매' }
    ];

    const adversarialCancelledTxs = [
      { aptName: '동탄역시범우남퍼스트빌', contractYm: '202605', contractDay: '26', contractDate: '20260526', price: 999999, area: 84.9, areaPyeong: 34, dealType: '매매', cancelDate: '20260601' },
      { aptName: '동탄역시범우남퍼스트빌', contractYm: '202605', contractDay: '02', contractDate: '20260502', price: 1000, area: 84.9, areaPyeong: 34, dealType: '매매', cdealDay: '2026.05.03' },
      { aptName: '동탄역시범우남퍼스트빌', contractYm: '202605', contractDay: '12', contractDate: '20260512', price: 500000, area: 84.9, areaPyeong: 34, dealType: '매매', cdealType: 'O' },
      { aptName: '동탄역시범우남퍼스트빌', contractYm: '202605', contractDay: '18', contractDate: '20260518', price: 400000, area: 84.9, areaPyeong: 34, dealType: '매매', cdealType: '해제' },
      { aptName: '동탄역시범우남퍼스트빌', contractYm: '202605', contractDay: '22', contractDate: '20260522', price: 888888, area: 84.9, areaPyeong: 34, dealType: '매매', isCanceled: true },
      { aptName: '동탄역시범우남퍼스트빌', contractYm: '202605', contractDay: '24', contractDate: '20260524', price: 777777, area: 84.9, areaPyeong: 34, dealType: '매매', cancelDate: 20260601 }, // Numeric cancelDate
      { aptName: '동탄역시범우남퍼스트빌', contractYm: '202605', contractDay: '28', contractDate: '20260528', price: 666666, area: 84.9, areaPyeong: 34, dealType: '매매', cancelDate: ' 20260602 ' },
    ];

    it('should never distort calculateApartmentSummary (maxPrice, minPrice, txCount)', () => {
      const pureSummary = calculateApartmentSummary('동탄역시범우남퍼스트빌', activeTransactions, [], {}, new Date(2026, 4, 30));
      const mixedTransactions = [...activeTransactions, ...adversarialCancelledTxs];
      const mixedSummary = calculateApartmentSummary('동탄역시범우남퍼스트빌', mixedTransactions, [], {}, new Date(2026, 4, 30));

      expect(mixedSummary.maxPrice).toBe(pureSummary.maxPrice);
      expect(mixedSummary.minPrice).toBe(pureSummary.minPrice);
      expect(mixedSummary.txCount).toBe(pureSummary.txCount);
    });

    it('should never distort formatRecentTransactions', () => {
      const pureRecent = formatRecentTransactions(activeTransactions, new Date(2026, 4, 30));
      const mixedTransactions = [...activeTransactions, ...adversarialCancelledTxs];
      const mixedRecent = formatRecentTransactions(mixedTransactions, new Date(2026, 4, 30));

      expect(mixedRecent.length).toBe(pureRecent.length);
    });

    it('should never distort accumulateMacroTrend', () => {
      const mixedWithLatestNumericCancel = [
        ...activeTransactions,
        { aptName: '동탄역시범우남퍼스트빌', contractYm: '202605', contractDay: '30', contractDate: '20260530', price: 999999, area: 84.9, areaPyeong: 34, dealType: '매매', cancelDate: 20260601 }
      ];

      const { macroTrendData: pureData, trendMonths: tm1 } = initMacroTrendData(12, 0, new Date(2026, 4, 30));
      const { macroTrendData: mixedData, trendMonths: tm2 } = initMacroTrendData(12, 0, new Date(2026, 4, 30));

      accumulateMacroTrend(pureData, tm1, activeTransactions, []);
      accumulateMacroTrend(mixedData, tm2, mixedWithLatestNumericCancel, []);

      const pureSeries = generateMacroTrendSeries(pureData, tm1);
      const mixedSeries = generateMacroTrendSeries(mixedData, tm2);

      const pureMay = pureSeries.find(s => s.name === '26.05');
      const mixedMay = mixedSeries.find(s => s.name === '26.05');

      expect(mixedMay?.['동탄 아파트 전체']).toBe(pureMay?.['동탄 아파트 전체']);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Apartment Name Normalization & Chunk Integrity
  // ──────────────────────────────────────────────────────────────────────────
  describe('3. Apartment Name Normalization & Chunk Integrity', () => {
    it('should normalize complex names with whitespace and brackets', () => {
      expect(normalizeSummarizer('  동탄역 시범 한화 꿈에그린 프레스티지  ')).toBe('동탄역시범한화꿈에그린프레스티지');
      expect(normalizeSummarizer('[청계동] 동탄역시범우남퍼스트빌 (1단지)')).toBe('동탄역시범우남퍼스트빌1단지');
      expect(normalizeValidator('동탄역\u200B롯데캐슬\uFEFF')).toBe('동탄역롯데캐슬');
      expect(normalizeAptNameTs('동탄숲속마을\u00A0광명메이루즈')).toBe('동탄숲속마을광명메이루즈');
    });

    it('should map "금호어울림 레이크 1차" to "금호어울림레이크" in catalog and mappings', () => {
      expect(HARDCODED_MAPPING['금호어울림레이크1차']).toBe('금호어울림레이크');
      expect(HARDCODED_MAPPING['금호어울림 레이크 1차']).toBe('금호어울림레이크');

      const aptsPath = path.resolve(__dirname, '../../public/data/apartments-by-dong.json');
      const dongData = JSON.parse(fs.readFileSync(aptsPath, 'utf8'));
      const jangjiApts = dongData.byDong['장지동'] || [];
      const kumho = jangjiApts.find((a: any) => a.name === '금호어울림 레이크 1차');
      expect(kumho).toBeDefined();
      expect(kumho.txKey).toBe('금호어울림레이크');
    });

    it('should consolidate byApt keys for 금호어울림 레이크 1차 without dropping transactions in writeApartmentChunks', () => {
      const testDir = path.resolve(__dirname, '../../scratch/test-adversarial-chunks');
      if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true });

      const mockByApt = {
        '금호어울림레이크1차': [
          { contractYm: '202605', contractDay: '10', contractDate: '20260510', price: 65000, area: 74.5, areaPyeong: 29, floor: 10, dealType: '매매' }
        ],
        '금호어울림레이크': [
          { contractYm: '202605', contractDay: '15', contractDate: '20260515', price: 68000, area: 74.5, areaPyeong: 29, floor: 12, dealType: '매매' }
        ]
      };

      // In writeApartmentChunks with targetApts = ['금호어울림레이크']
      writeApartmentChunks(testDir, ['금호어울림레이크'], mockByApt, false);

      const chunkFile = path.join(testDir, '금호어울림레이크.json');
      expect(fs.existsSync(chunkFile)).toBe(true);

      const records = JSON.parse(fs.readFileSync(chunkFile, 'utf8'));
      // Expect both records (from 금호어울림레이크 and 금호어울림레이크1차) to be present
      expect(records.length).toBe(2);

      fs.rmSync(testDir, { recursive: true });
    });
  });
});
