/* eslint-disable @typescript-eslint/no-require-imports */
import fs from 'fs';
import path from 'path';

// Import CommonJS pipeline modules
const { filterOutliersRolling, applyIqrOutlierDetection } = require('../../scripts/pipeline/outlierFilters');
const {
  initMacroTrendData,
  accumulateMacroTrend,
  calculateRecent7DaysVolume,
  generateMacroTrendSeries
} = require('../../scripts/pipeline/macroTrendCalculator');
const {
  formatPriceEok,
  parseYYYYMMDD,
  normalizeAptName,
  calculateApartmentSummary,
  formatRecentTransactions
} = require('../../scripts/pipeline/apartmentSummarizer');
const { writeSummaryFiles, writeApartmentChunks } = require('../../scripts/pipeline/fileGenerators');

describe('Pipeline Modularization Tests', () => {
  describe('Outlier Filters (outlierFilters.js)', () => {
    it('should filter out extreme price spikes using 11-point rolling window', () => {
      // 10 normal transactions of price ~80000 and 1 massive outlier of 250000
      const txs = [
        { contractYm: '202501', contractDay: '01', price: 80000, area: 84.9, dealType: '매매' },
        { contractYm: '202501', contractDay: '05', price: 81000, area: 84.9, dealType: '매매' },
        { contractYm: '202501', contractDay: '10', price: 79000, area: 84.9, dealType: '매매' },
        { contractYm: '202501', contractDay: '15', price: 80500, area: 84.9, dealType: '매매' },
        { contractYm: '202501', contractDay: '20', price: 82000, area: 84.9, dealType: '매매' },
        { contractYm: '202501', contractDay: '22', price: 250000, area: 84.9, dealType: '매매' }, // OUTLIER!
        { contractYm: '202501', contractDay: '25', price: 80000, area: 84.9, dealType: '매매' },
        { contractYm: '202501', contractDay: '28', price: 81500, area: 84.9, dealType: '매매' },
        { contractYm: '202502', contractDay: '01', price: 79500, area: 84.9, dealType: '매매' },
        { contractYm: '202502', contractDay: '05', price: 80200, area: 84.9, dealType: '매매' },
        { contractYm: '202502', contractDay: '10', price: 81000, area: 84.9, dealType: '매매' },
      ];

      const filtered = filterOutliersRolling(txs);
      expect(filtered.length).toBe(10);
      expect(filtered.some((t: { price: number }) => t.price === 250000)).toBe(false);
    });

    it('should flag IQR lower outliers accurately with applyIqrOutlierDetection', () => {
      const records = [
        { contractYm: '202501', contractDay: '01', price: 100000, area: 84.9, dealType: '매매' },
        { contractYm: '202501', contractDay: '05', price: 102000, area: 84.9, dealType: '매매' },
        { contractYm: '202501', contractDay: '10', price: 98000, area: 84.9, dealType: '매매' },
        { contractYm: '202501', contractDay: '15', price: 101000, area: 84.9, dealType: '매매' },
        { contractYm: '202501', contractDay: '20', price: 99000, area: 84.9, dealType: '매매' },
        { contractYm: '202501', contractDay: '25', price: 10000, area: 84.9, dealType: '매매' }, // Extreme lower outlier (1억)
      ];

      const processed = applyIqrOutlierDetection(records);
      const outlierItem = processed.find((r: { price: number }) => r.price === 10000);
      expect(outlierItem.isOutlier).toBe(true);

      const normalItem = processed.find((r: { price: number }) => r.price === 100000);
      expect(normalItem.isOutlier).toBe(false);
    });
  });

  describe('Macro Trend Calculator (macroTrendCalculator.js)', () => {
    it('should initialize macro trend buckets for 18 years (216 months)', () => {
      const baseDate = new Date(2026, 4, 1); // 2026-05
      const { macroTrendData, trendMonths } = initMacroTrendData(216, 2, baseDate);

      expect(trendMonths.length).toBe(216);
      expect(trendMonths[trendMonths.length - 1]).toBe('202603'); // 2026-05 minus 2 months
      expect(macroTrendData['202603']).toBeDefined();
      expect(macroTrendData['202603'].name).toBe('26.03');
    });

    it('should accumulate standard 30~36 pyeong transactions and generate smoothed series', () => {
      const { macroTrendData, trendMonths } = initMacroTrendData(3, 0, new Date(2026, 2, 1)); // 3 months: 202601, 202602, 202603
      
      const saleTxs = [
        { aptName: '아파트A', contractYm: '202601', contractDate: '20260115', price: 90000, areaPyeong: 34 },
        { aptName: '아파트B', contractYm: '202602', contractDate: '20260210', price: 92000, areaPyeong: 33 },
      ];
      const rentTxs = [
        { aptName: '아파트A', contractYm: '202601', contractDate: '20260112', deposit: 50000, monthlyRent: 0, areaPyeong: 34 },
      ];

      accumulateMacroTrend(macroTrendData, trendMonths, saleTxs, rentTxs);

      const series = generateMacroTrendSeries(macroTrendData, trendMonths);
      expect(series.length).toBe(3);
      expect(series[0]['동탄 아파트 전체']).toBe(9.0); // 90000 -> 9.0억
      expect(series[0]['동탄 아파트 전세 평균']).toBe(5.0); // 50000 -> 5.0억
    });

    it('should calculate recent 7 days volume and WoW trend rate', () => {
      const parseDate = (d: string) => {
        if (!d) return null;
        return new Date(parseInt(d.slice(0, 4), 10), parseInt(d.slice(4, 6), 10) - 1, parseInt(d.slice(6, 8), 10));
      };

      const saleTxs = [
        { contractDate: '20260515' },
        { contractDate: '20260514' },
        { contractDate: '20260513' },
        { contractDate: '20260507' }, // prev window
        { contractDate: '20260506' }, // prev window
      ];

      const volume = calculateRecent7DaysVolume(saleTxs, parseDate);
      expect(volume.currentCount).toBe(3);
      expect(volume.prevCount).toBe(2);
      expect(volume.trendText).toContain('상승');
      expect(volume.trendColor).toBe('#ff4b5c');
    });
  });

  describe('Apartment Summarizer (apartmentSummarizer.js)', () => {
    it('should format price in Eok correctly', () => {
      expect(formatPriceEok(125000)).toBe('12억5,000');
      expect(formatPriceEok(90000)).toBe('9억');
      expect(formatPriceEok(5400)).toBe('5,400만');
      expect(formatPriceEok(0)).toBe('0만');
    });

    it('should parse YYYYMMDD date correctly', () => {
      const dt = parseYYYYMMDD('20260515');
      expect(dt).not.toBeNull();
      expect(dt?.getFullYear()).toBe(2026);
      expect(dt?.getMonth()).toBe(4);
      expect(dt?.getDate()).toBe(15);
      expect(parseYYYYMMDD('')).toBeNull();
      expect(parseYYYYMMDD('invalid')).toBeNull();
    });

    it('should normalize apartment names', () => {
      expect(normalizeAptName('동탄역시범우남퍼스트빌 [청계동] (1단지)')).toBe('동탄역시범우남퍼스트빌1단지');
      expect(normalizeAptName('  더 레이크  시티  ')).toBe('더레이크시티');
    });

    it('should calculate comprehensive apartment summary', () => {
      const saleTxs = [
        {
          contractYm: '202605',
          contractDay: '10',
          contractDate: '20260510',
          price: 98000,
          priceEok: '9억8,000',
          area: 84.9,
          areaPyeong: 33.5,
          floor: 15,
          dong: '청계동',
          dealType: '매매'
        },
        {
          contractYm: '202604',
          contractDay: '05',
          contractDate: '20260405',
          price: 95000,
          priceEok: '9억5,000',
          area: 84.9,
          areaPyeong: 33.5,
          floor: 12,
          dong: '청계동',
          dealType: '매매'
        }
      ];

      const rentTxs = [
        {
          contractYm: '202605',
          contractDay: '02',
          contractDate: '20260502',
          deposit: 55000,
          monthlyRent: 0,
          area: 84.9,
          areaPyeong: 33.5,
          floor: 10,
          dong: '청계동',
          dealType: '전세'
        }
      ];

      const summary = calculateApartmentSummary('시범우남퍼스트빌', saleTxs, rentTxs, { '시범우남퍼스트빌': '청계동' }, new Date(2026, 4, 15));
      expect(summary.dong).toBe('청계동');
      expect(summary.latestPrice).toBe(98000);
      expect(summary.maxPrice).toBe(98000);
      expect(summary.minPrice).toBe(95000);
      expect(summary.txCount).toBe(2);
      expect(summary.rentTxCount).toBe(1);
      expect(summary.latestRentDeposit).toBe(55000);
    });

    it('should format recent 90-day transactions', () => {
      const now = new Date(2026, 4, 20);
      const saleTxs = [
        {
          aptName: '시범우남퍼스트빌',
          contractYm: '202605',
          contractDay: '10',
          contractDate: '20260510',
          price: 98000,
          priceEok: '9억8,000',
          area: 84.9,
          areaPyeong: 33.5,
          floor: 15,
          dealType: '매매'
        }
      ];

      const recentList = formatRecentTransactions(saleTxs, now, 10);
      expect(recentList.length).toBe(1);
      expect(recentList[0].aptName).toBe('시범우남퍼스트빌');
      expect(recentList[0].priceVal).toBe(9.8);
      expect(recentList[0].dateLabel).toBe('5월 10일');
    });
  });

  describe('File Generators (fileGenerators.js)', () => {
    const testDataDir = path.resolve(__dirname, '../../scratch/test-tx-data');

    afterAll(() => {
      if (fs.existsSync(testDataDir)) {
        fs.rmSync(testDataDir, { recursive: true });
      }
    });

    it('should write summary files properly', () => {
      const summaryFile = path.join(testDataDir, 'test-summary.json');
      const recentTxFile = path.join(testDataDir, 'test-recent.json');
      const macroTrendFile = path.join(testDataDir, 'test-trend.json');

      writeSummaryFiles({
        summaryPath: summaryFile,
        recentTxPath: recentTxFile,
        macroTrendPath: macroTrendFile
      }, {
        summary: { '아파트1': { latestPrice: 10000 } },
        recent7DaysVolume: { currentCount: 5, prevCount: 3, trendText: '상승', trendColor: '#ff4b5c', badge: '+2' },
        recentTransactions: [{ aptName: '아파트1', priceVal: 1.0 }],
        dongtanMacroTrend: [{ name: '26.05', '동탄 아파트 전체': 10.0, '동탄 아파트 전세 평균': 5.0 }]
      });

      expect(fs.existsSync(summaryFile)).toBe(true);
      expect(fs.existsSync(recentTxFile)).toBe(true);
      expect(fs.existsSync(macroTrendFile)).toBe(true);

      const parsedSummary = JSON.parse(fs.readFileSync(summaryFile, 'utf8'));
      expect(parsedSummary.summary['아파트1'].latestPrice).toBe(10000);
      expect(parsedSummary.recent7DaysVolume.currentCount).toBe(5);
    });

    it('should write chunk files and _index.json properly', () => {
      const targetApts = ['단지A', '단지B'];
      const byApt = {
        '단지A': [
          { contractYm: '202605', contractDay: '01', price: 90000, area: 84.9, dealType: '매매' }
        ],
        '단지B': [
          { contractYm: '202605', contractDay: '02', price: 80000, area: 59.9, dealType: '매매' }
        ]
      };

      const result = writeApartmentChunks(testDataDir, targetApts, byApt, false);
      expect(result.chunkCount).toBe(2);
      expect(result.totalRecords).toBe(2);
      expect(fs.existsSync(path.join(testDataDir, '단지A.json'))).toBe(true);
      expect(fs.existsSync(path.join(testDataDir, '단지A-recent.json'))).toBe(true);
      expect(fs.existsSync(path.join(testDataDir, '_index.json'))).toBe(true);
    });
  });
});
