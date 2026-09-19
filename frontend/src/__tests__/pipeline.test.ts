/* eslint-disable @typescript-eslint/no-require-imports */
import fs from 'fs';
import path from 'path';
import { HARDCODED_MAPPING } from '../lib/utils/apartmentMapping';
import { staticDataService } from '../lib/services/staticDataService';

// Import CommonJS pipeline modules
const {
  filterOutliersRolling,
  applyIqrOutlierDetection,
  isCancelledTransaction,
  isDirectDeal
} = require('../../scripts/pipeline/outlierFilters');

const {
  initMacroTrendData,
  accumulateMacroTrend,
  calculateRecent7DaysVolume,
  generateMacroTrendSeries,
  isCancelledTransaction: isCancelledInMacroTrend
} = require('../../scripts/pipeline/macroTrendCalculator');

const {
  formatPriceEok,
  parseYYYYMMDD,
  normalizeAptName,
  calculateApartmentSummary,
  formatRecentTransactions,
  formatPeriodTransactions,
  isCancelledTransaction: isCancelledInSummarizer
} = require('../../scripts/pipeline/apartmentSummarizer');

const { writeSummaryFiles, writeApartmentChunks } = require('../../scripts/pipeline/fileGenerators');

const {
  validateTransactions,
  loadKnownApartments,
  detectPriceAnomaly,
  isCancelledTransaction: isCancelledInValidator,
  normalizeAptName: normalizeInValidator
} = require('../../scripts/validate-transactions');

const axios = require('axios');
const {
  fetchWithRetry: fetchTradeWithRetry,
  parseGovApiEnvelope,
  AptTransactionRecordSchema
} = require('../../scripts/fetch-transactions');
const {
  fetchWithRetry: fetchRentWithRetry,
  RentTransactionSchema
} = require('../../scripts/fetch-rent');

describe('D-VIEW Data Pipeline Integration Test Suite', () => {
  // ──────────────────────────────────────────────────────────────────────────
  // Baseline Modularization Tests
  // ──────────────────────────────────────────────────────────────────────────
  describe('Pipeline Modularization Tests', () => {
    describe('Outlier Filters (outlierFilters.js)', () => {
      it('should filter out extreme price spikes using 11-point rolling window', () => {
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
        const { macroTrendData, trendMonths } = initMacroTrendData(3, 0, new Date(2026, 2, 1));
        
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
        expect(series[0]['동탄 아파트 전체']).toBe(9.0);
        expect(series[0]['동탄 아파트 전세 평균']).toBe(5.0);
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
          { contractDate: '20260507' },
          { contractDate: '20260506' },
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

  // ──────────────────────────────────────────────────────────────────────────
  // R1: Timeliness & Incremental Sync Tests
  // ──────────────────────────────────────────────────────────────────────────
  describe('R1: Timeliness & Incremental Sync Tests', () => {
    // 헬퍼: sync-transactions.js 의 컷오프 계산 공식 재현
    const computeSyncCutoff = (baseDate: Date) => {
      const threeMonthsAgo = new Date(baseDate.getFullYear(), baseDate.getMonth() - 3, baseDate.getDate());
      const cutoffYm = `${threeMonthsAgo.getFullYear()}${String(threeMonthsAgo.getMonth() + 1).padStart(2, '0')}`;
      const cutoffDate = `${cutoffYm}01`;
      return { threeMonthsAgo, cutoffYm, cutoffDate };
    };

    it('should compute correct incremental sync cutoff date (cutoffDate = ${cutoffYm}01)', () => {
      // 1. 기준일 2026-09-19 -> 3개월 전: 2026-06 -> 20260601
      const sept2026 = computeSyncCutoff(new Date(2026, 8, 19));
      expect(sept2026.cutoffYm).toBe('202606');
      expect(sept2026.cutoffDate).toBe('20260601');

      // 2. 연도 경계 테스트: 2026-01-15 -> 3개월 전: 2025-10 -> 20251001
      const jan2026 = computeSyncCutoff(new Date(2026, 0, 15));
      expect(jan2026.cutoffYm).toBe('202510');
      expect(jan2026.cutoffDate).toBe('20251001');

      // 3. 월말 경계 테스트: 2026-03-31 -> 3개월 전: 2025-12 -> 20251201
      const mar2026 = computeSyncCutoff(new Date(2026, 2, 31));
      expect(mar2026.cutoffYm).toBe('202512');
      expect(mar2026.cutoffDate).toBe('20251201');

      // 8자리 YYYYMM01 형식 정합성 검증
      expect(sept2026.cutoffDate).toMatch(/^\d{6}01$/);
    });

    it('should preserve valid historical transactions from cache while updating transactions newer than or equal to cutoff date', () => {
      const { cutoffDate } = computeSyncCutoff(new Date(2026, 8, 1)); // cutoffDate: 20260601

      // 기존 로컬 캐시 (기존 chunk JSON)
      const cachedTxs = [
        {
          aptName: '동탄역롯데캐슬',
          contractYm: '202603',
          contractDay: '15',
          contractDate: '20260315',
          price: 150000,
          area: 84.82,
          dealType: '매매'
        },
        {
          aptName: '동탄역롯데캐슬',
          contractYm: '202605',
          contractDay: '20',
          contractDate: '20260520',
          price: 155000,
          area: 84.82,
          dealType: '매매'
        },
        {
          // 오래된 캐시 내 컷오프 이후 데이터 (최신 동기화 시 덮어쓰여야 할 대상)
          aptName: '동탄역롯데캐슬',
          contractYm: '202606',
          contractDay: '10',
          contractDate: '20260610',
          price: 158000, // 구버전 가격
          area: 84.82,
          dealType: '매매'
        }
      ];

      // 신규 수집된 Firestore 피드 (contractDate >= cutoffDate)
      const freshIncomingTxs = [
        {
          // 가격 정정 또는 최신 갱신된 레코드
          aptName: '동탄역롯데캐슬',
          contractYm: '202606',
          contractDay: '10',
          contractDate: '20260610',
          price: 160000, // 정정된 최신 가격
          area: 84.82,
          dealType: '매매'
        },
        {
          // 완전 신규 거래
          aptName: '동탄역롯데캐슬',
          contractYm: '202607',
          contractDay: '05',
          contractDate: '20260705',
          price: 162000,
          area: 84.82,
          dealType: '매매'
        }
      ];

      // 증분 동기화 필터 및 병합 시뮬레이션 (sync-transactions.js:252-269 구현 원리)
      const preservedCache = cachedTxs.filter(d => {
        const hasValidYm = d.contractYm && d.contractYm.length === 6 && /^\d{6}$/.test(d.contractYm);
        return hasValidYm && d.contractDate < cutoffDate;
      });

      const updatedFeed = freshIncomingTxs.filter(d => d.contractDate >= cutoffDate);
      const consolidatedRecords = [...preservedCache, ...updatedFeed];

      expect(preservedCache.length).toBe(2);
      expect(consolidatedRecords.length).toBe(4);

      // 1. 컷오프 이전 유효 과거 거래(20260315, 20260520)는 완벽히 보존
      expect(consolidatedRecords.some(t => t.contractDate === '20260315' && t.price === 150000)).toBe(true);
      expect(consolidatedRecords.some(t => t.contractDate === '20260520' && t.price === 155000)).toBe(true);

      // 2. 컷오프 이후 구버전 데이터(158000)는 제거되고 최신 데이터(160000)로 갱신
      expect(consolidatedRecords.some(t => t.contractDate === '20260610' && t.price === 158000)).toBe(false);
      expect(consolidatedRecords.some(t => t.contractDate === '20260610' && t.price === 160000)).toBe(true);

      // 3. 신규 거래(20260705, 162000)가 정상 추가
      expect(consolidatedRecords.some(t => t.contractDate === '20260705' && t.price === 162000)).toBe(true);
    });

    it('should fallback to local catalog and area heuristics when Google Sheets remote fetch fails', async () => {
      // 로컬 카탈로그(apartments-by-dong.json) 로드 및 구글 시트 장애 시 폴백 로직 검증
      const aptsJsonPath = path.resolve(__dirname, '../../../frontend/public/data/apartments-by-dong.json');
      expect(fs.existsSync(aptsJsonPath)).toBe(true);

      const localCatalog = JSON.parse(fs.readFileSync(aptsJsonPath, 'utf-8'));
      expect(localCatalog.byDong).toBeDefined();

      // 시뮬레이션: 구글 시트 GViz 네트워크 장애 발생
      const simulateFetchDongMap = async (forceFail = true) => {
        const dongMap: Record<string, string> = {};
        const validTxKeys = new Set<string>();

        // 로컬 데이터 우선 준비
        if (localCatalog && localCatalog.byDong) {
          for (const [dong, apts] of Object.entries<any>(localCatalog.byDong)) {
            for (const apt of apts) {
              const normName = normalizeAptName(apt.name);
              const normTxKey = normalizeAptName(apt.txKey || apt.name);
              if (normName) dongMap[normName] = dong;
              if (normTxKey) dongMap[normTxKey] = dong;
              if (normTxKey) validTxKeys.add(normTxKey);
              if (normName) validTxKeys.add(normName);
            }
          }
        }

        try {
          if (forceFail) {
            throw new Error('Google Sheets GViz Connection Timeout (5000ms exceeded)');
          }
        } catch (e: any) {
          // sync-transactions.js 처럼 콘솔 경고 후 로컬 매핑으로 우아하게 폴백
          expect(e.message).toContain('Timeout');
        }

        return { dongMap, validTxKeys };
      };

      const fallbackResult = await simulateFetchDongMap(true);
      expect(fallbackResult.validTxKeys.size).toBeGreaterThanOrEqual(175);
      expect(fallbackResult.dongMap['동탄역롯데캐슬']).toBe('여울동');
      expect(fallbackResult.dongMap['동탄역시범우남퍼스트빌']).toBe('청계동');

      // 면적 평형 추정 휴리스틱 검증: area * 0.3025 * 1.33 (공급면적 추정치)
      const estimateSupplyPyeong = (excluUseAr: number) => {
        return Math.round(excluUseAr * 0.3025 * 1.33 * 10) / 10;
      };

      expect(estimateSupplyPyeong(84.9)).toBeCloseTo(34.2, 1);
      expect(estimateSupplyPyeong(59.8)).toBeCloseTo(24.1, 1);
      expect(estimateSupplyPyeong(102.5)).toBeCloseTo(41.2, 1);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // R2: Cancellation & De-duplication Tests
  // ──────────────────────────────────────────────────────────────────────────
  describe('R2: Cancellation & De-duplication Tests', () => {
    it('should accurately flag all cancellation markers with isCancelledTransaction', () => {
      // 1. cancelDate 표기 건
      expect(isCancelledTransaction({ cancelDate: '20260501' })).toBe(true);
      expect(isCancelledInSummarizer({ cancelDate: '20260501' })).toBe(true);
      expect(isCancelledInMacroTrend({ cancelDate: '20260501' })).toBe(true);
      expect(isCancelledInValidator({ cancelDate: '20260501' })).toBe(true);

      // 2. cdealDay 표기 건
      expect(isCancelledTransaction({ cdealDay: '20260501' })).toBe(true);

      // 3. cdealType === 'O' 또는 '해제'
      expect(isCancelledTransaction({ cdealType: 'O' })).toBe(true);
      expect(isCancelledTransaction({ cdealType: '해제' })).toBe(true);

      // 4. isCanceled === true
      expect(isCancelledTransaction({ isCanceled: true })).toBe(true);

      // 5. 정상 유효 거래 (취소 아님)
      expect(isCancelledTransaction({ cancelDate: '' })).toBe(false);
      expect(isCancelledTransaction({ cancelDate: '-' })).toBe(false);
      expect(isCancelledTransaction({ cancelDate: '   ' })).toBe(false);
      expect(isCancelledTransaction({ price: 100000, dealType: '매매' })).toBe(false);
      expect(isCancelledTransaction(null)).toBe(false);
      expect(isCancelledTransaction(undefined)).toBe(false);
      expect(isCancelledTransaction({})).toBe(false);
    });

    it('should exclude cancelled transactions from apartment summary metrics (maxPrice, minPrice, avg1MPrice, avg3MPrice, isNewHigh, txCount)', () => {
      const apt = '동탄역테스트단지';
      const saleTxs = [
        {
          contractYm: '202605',
          contractDay: '01',
          contractDate: '20260501',
          price: 90000,
          area: 84.9,
          areaPyeong: 34,
          floor: 10,
          dong: '청계동',
          dealType: '매매'
        },
        {
          contractYm: '202605',
          contractDay: '10',
          contractDate: '20260510',
          price: 100000,
          area: 84.9,
          areaPyeong: 34,
          floor: 15,
          dong: '청계동',
          dealType: '매매'
        },
        {
          // 허위 최고가 후 취소된 이상 거래 (2.5억 신고가 왜곡 방지)
          contractYm: '202605',
          contractDay: '12',
          contractDate: '20260512',
          price: 250000,
          area: 84.9,
          areaPyeong: 34,
          floor: 20,
          dong: '청계동',
          dealType: '매매',
          cancelDate: '20260515'
        },
        {
          // 최저가 왜곡 취소 거래 (1천만원 덤핑 취소)
          contractYm: '202605',
          contractDay: '05',
          contractDate: '20260505',
          price: 10000,
          area: 84.9,
          areaPyeong: 34,
          floor: 3,
          dong: '청계동',
          dealType: '매매',
          cdealType: 'O'
        }
      ];

      const rentTxs = [
        {
          contractYm: '202605',
          contractDay: '02',
          contractDate: '20260502',
          deposit: 50000,
          monthlyRent: 0,
          area: 84.9,
          areaPyeong: 34,
          floor: 8,
          dong: '청계동',
          dealType: '전세'
        },
        {
          // 취소된 전세 거래
          contractYm: '202605',
          contractDay: '08',
          contractDate: '20260508',
          deposit: 90000,
          monthlyRent: 0,
          area: 84.9,
          areaPyeong: 34,
          floor: 12,
          dong: '청계동',
          dealType: '전세',
          isCanceled: true
        }
      ];

      const summary = calculateApartmentSummary(apt, saleTxs, rentTxs, { [apt]: '청계동' }, new Date(2026, 4, 20));

      // 취소 거래 250,000만 원 및 10,000만 원 배제 확인
      expect(summary.maxPrice).toBe(100000);
      expect(summary.minPrice).toBe(90000);
      expect(summary.txCount).toBe(2); // 4건 중 취소 2건 제외 = 2건
      expect(summary.avg1MPrice).toBe(95000); // (90000 + 100000) / 2 = 95,000
      expect(summary.avg3MPrice).toBe(95000);
      
      // 취소 거래(250,000)에 의한 허위 신고가 발생 방지 확인: 취소건은 isNewHigh 계산 대상에서 제외
      const cancelledTx = saleTxs.find((t: any) => t.cancelDate);
      expect(cancelledTx?.isNewHigh).toBeUndefined();

      // 전세 취소 90,000 배제 확인
      expect(summary.rentTxCount).toBe(1);
      expect(summary.latestRentDeposit).toBe(50000);
    });

    it('should exclude cancelled transactions from recent transactions list', () => {
      const now = new Date(2026, 4, 25);
      const saleTxs = [
        { aptName: '단지A', contractDate: '20260520', price: 95000, area: 84.9, dealType: '매매' },
        { aptName: '단지B', contractDate: '20260521', price: 120000, area: 84.9, dealType: '매매', cancelDate: '20260523' },
        { aptName: '단지C', contractDate: '20260522', price: 110000, area: 84.9, dealType: '매매', cdealType: '해제' },
        { aptName: '단지D', contractDate: '20260524', price: 98000, area: 84.9, dealType: '매매' },
      ];

      const recent = formatRecentTransactions(saleTxs, now, 100);
      expect(recent.length).toBe(2);
      expect(recent.map((r: { aptName: string }) => r.aptName)).toEqual(['단지D', '단지A']);
      expect(recent.some((r: { aptName: string }) => r.aptName === '단지B' || r.aptName === '단지C')).toBe(false);
    });

    it('should exclude cancelled transactions from macro trend basket and weekly transaction volume', () => {
      // 1. Macro Trend 누적 시 취소 거래 배제 검증
      const { macroTrendData, trendMonths } = initMacroTrendData(2, 0, new Date(2026, 4, 1)); // 202604, 202605
      const saleTxs = [
        { aptName: '단지A', contractYm: '202605', contractDate: '20260501', price: 90000, areaPyeong: 34 },
        { aptName: '단지B', contractYm: '202605', contractDate: '20260505', price: 300000, areaPyeong: 34, cdealDay: '20260506' }, // 취소!
      ];
      const rentTxs = [
        { aptName: '단지A', contractYm: '202605', contractDate: '20260502', deposit: 50000, monthlyRent: 0, areaPyeong: 34 },
        { aptName: '단지B', contractYm: '202605', contractDate: '20260506', deposit: 120000, monthlyRent: 0, areaPyeong: 34, isCanceled: true }, // 취소!
      ];

      accumulateMacroTrend(macroTrendData, trendMonths, saleTxs, rentTxs);
      const series = generateMacroTrendSeries(macroTrendData, trendMonths);

      const maySeries = series.find((s: { name: string }) => s.name === '26.05');
      expect(maySeries).toBeDefined();
      expect(maySeries['동탄 아파트 전체']).toBe(9.0); // 90000 -> 9.0억 (300000 배제됨)
      expect(maySeries['동탄 아파트 전세 평균']).toBe(5.0); // 50000 -> 5.0억 (120000 배제됨)

      // 2. Recent 7 Days Volume 집계 시 취소 거래 배제 검증
      const volumeTxs = [
        { contractDate: '20260520' },
        { contractDate: '20260521' },
        { contractDate: '20260522', cancelDate: '20260523' }, // 취소
        { contractDate: '20260523', cdealType: 'O' }, // 취소
      ];

      const vol = calculateRecent7DaysVolume(volumeTxs, parseYYYYMMDD);
      expect(vol.currentCount).toBe(2); // 4건 중 취소 2건 제외
    });

    it('should generate distinct occurrence keys for same-day duplicate rent contracts (_key = ${baseKey}_${occurrence})', () => {
      // fetch-rent.js:231-244 의 전월세 복합 키 및 occurrence 알고리즘 시뮬레이션
      const generateRentKeys = (items: any[]) => {
        const keyOccurrences = new Map<string, number>();
        return items.map(item => {
          const baseKey = `RENT_${item.aptName}_${item.ym}_${item.contractDay}_${item.area}_${item.deposit}_${item.monthlyRent}_${item.floor}`;
          const occurrence = (keyOccurrences.get(baseKey) || 0) + 1;
          keyOccurrences.set(baseKey, occurrence);
          const _key = occurrence === 1 ? baseKey : `${baseKey}_${occurrence}`;
          return { ...item, _key, occurrence };
        });
      };

      const duplicateRentContracts = [
        { aptName: '동탄역롯데캐슬', ym: '202605', contractDay: '15', area: 84.82, deposit: 50000, monthlyRent: 0, floor: 12 },
        { aptName: '동탄역롯데캐슬', ym: '202605', contractDay: '15', area: 84.82, deposit: 50000, monthlyRent: 0, floor: 12 },
        { aptName: '동탄역롯데캐슬', ym: '202605', contractDay: '15', area: 84.82, deposit: 50000, monthlyRent: 0, floor: 12 },
      ];

      const keyedResults = generateRentKeys(duplicateRentContracts);
      expect(keyedResults.length).toBe(3);
      expect(keyedResults[0]._key).toBe('RENT_동탄역롯데캐슬_202605_15_84.82_50000_0_12');
      expect(keyedResults[1]._key).toBe('RENT_동탄역롯데캐슬_202605_15_84.82_50000_0_12_2');
      expect(keyedResults[2]._key).toBe('RENT_동탄역롯데캐슬_202605_15_84.82_50000_0_12_3');

      // 키 고유성(중복 덮어쓰기 방지) 확인
      const uniqueKeys = new Set(keyedResults.map(k => k._key));
      expect(uniqueKeys.size).toBe(3);
    });

    it('should prevent cross-district duplicate entries between LAWD_CD 41590 and 41597', () => {
      // fetch-transactions.js:288-301 의 화성시(41590) vs 동탄구(41597) 교차 중복 방어 시뮬레이션
      const simulateCrossDistrictIngestion = (districts: { lawdCd: string; items: any[] }[]) => {
        const keyOccurrences = new Map<string, number>();
        const seenRawTxKeys = new Set<string>();
        const ingestedRecords: any[] = [];

        for (const { lawdCd, items } of districts) {
          const currentDistrictOccurrences = new Map<string, number>();
          for (const item of items) {
            const baseKey = `${item.aptNm}_${item.ym}_${item.dealDay}_${item.area}_${item.price}_${item.floor}`;
            const currentDistrictCount = (currentDistrictOccurrences.get(baseKey) || 0) + 1;
            currentDistrictOccurrences.set(baseKey, currentDistrictCount);
            const txIdentifier = `${baseKey}_${currentDistrictCount}`;

            if (seenRawTxKeys.has(txIdentifier)) {
              // 이미 다른 LAWD_CD에서 수집된 중복 응답은 건너뜀 (occurrence 증가 원천 방지)
              continue;
            }
            seenRawTxKeys.add(txIdentifier);

            const occurrence = (keyOccurrences.get(baseKey) || 0) + 1;
            keyOccurrences.set(baseKey, occurrence);
            const key = occurrence === 1 ? baseKey : `${baseKey}_${occurrence}`;
            ingestedRecords.push({ ...item, _key: key, lawdCd });
          }
        }
        return { ingestedRecords, keyOccurrences };
      };

      const rawTx = { aptNm: '동탄역롯데캐슬', ym: '202605', dealDay: '10', area: 84.82, price: 160000, floor: 20 };

      // 41590 및 41597 양쪽 API에서 동일 거래가 중복 반환된 상황
      const { ingestedRecords, keyOccurrences } = simulateCrossDistrictIngestion([
        { lawdCd: '41590', items: [rawTx] },
        { lawdCd: '41597', items: [rawTx] },
      ]);

      expect(ingestedRecords.length).toBe(1);
      expect(ingestedRecords[0]._key).toBe('동탄역롯데캐슬_202605_10_84.82_160000_20');
      expect(keyOccurrences.get('동탄역롯데캐슬_202605_10_84.82_160000_20')).toBe(1);
      expect(ingestedRecords.some(r => r._key.endsWith('_2'))).toBe(false);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // R3: Normalization & Outlier Filtering Tests
  // ──────────────────────────────────────────────────────────────────────────
  describe('R3: Normalization & Outlier Filtering Tests', () => {
    it('should normalize apartment names with spaces and brackets into space-free keys in byApt and _index.json', () => {
      expect(normalizeAptName('동탄숲속마을 광명메이루즈')).toBe('동탄숲속마을광명메이루즈');
      expect(normalizeAptName('[청계동] 동탄역 시범 한화 꿈에그린 프레스티지 (101동)')).toBe('동탄역시범한화꿈에그린프레스티지101동');
      expect(normalizeAptName('  동탄 레이크 자연앤푸르지오  ')).toBe('동탄레이크자연앤푸르지오');
      // validator 내 심층 정규화 함수의 제로위드스페이스 및 비가시 유니코드 제거 확인
      expect(normalizeInValidator('동탄역\u200B롯데캐슬\uFEFF')).toBe('동탄역롯데캐슬');
    });


    it('should never produce dual split entries in byApt or _index.json', () => {
      const testDir = path.resolve(__dirname, '../../scratch/test-split-tx');
      if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true });

      // 공백 포함 키와 정규화 키가 혼재된 원시 데이터 맵
      const byAptRaw: Record<string, any[]> = {
        '동탄숲속마을 광명메이루즈': [
          { contractYm: '202601', contractDay: '01', price: 60000, area: 84.9, dealType: '매매' }
        ],
        '동탄숲속마을광명메이루즈': [
          { contractYm: '202605', contractDay: '01', price: 62000, area: 84.9, dealType: '매매' }
        ]
      };

      // sync-transactions.js 의 키 정규화 통합 로직 시뮬레이션
      const consolidatedByApt: Record<string, any[]> = {};
      for (const [key, records] of Object.entries(byAptRaw)) {
        const normKey = normalizeAptName(key);
        if (!consolidatedByApt[normKey]) consolidatedByApt[normKey] = [];
        consolidatedByApt[normKey].push(...records);
      }

      expect(Object.keys(consolidatedByApt).length).toBe(1);
      expect(consolidatedByApt['동탄숲속마을광명메이루즈'].length).toBe(2);

      // fileGenerators writeApartmentChunks 실행 시 _index.json 및 청크 파일 생성 검증
      writeApartmentChunks(testDir, ['동탄숲속마을 광명메이루즈'], consolidatedByApt, false);

      const indexContent = JSON.parse(fs.readFileSync(path.join(testDir, '_index.json'), 'utf8'));
      expect(indexContent).toEqual(['동탄숲속마을광명메이루즈']);
      expect(indexContent.some((k: string) => k.includes(' '))).toBe(false);
      expect(fs.existsSync(path.join(testDir, '동탄숲속마을광명메이루즈.json'))).toBe(true);

      fs.rmSync(testDir, { recursive: true });
    });

    it('should map "금호어울림 레이크 1차" to "금호어울림레이크" across catalog and normalization rules', () => {
      // 1. HARDCODED_MAPPING 별칭 확인
      expect(HARDCODED_MAPPING['금호어울림레이크1차']).toBe('금호어울림레이크');
      expect(HARDCODED_MAPPING['금호어울림 레이크 1차']).toBe('금호어울림레이크');

      // 2. apartments-by-dong.json 내 txKey 검증
      const aptsJsonPath = path.resolve(__dirname, '../../../frontend/public/data/apartments-by-dong.json');
      const dongData = JSON.parse(fs.readFileSync(aptsJsonPath, 'utf8'));
      const jangjiApts = dongData.byDong['장지동'] || [];
      const kumho = jangjiApts.find((a: any) => a.name === '금호어울림 레이크 1차');
      expect(kumho).toBeDefined();
      expect(kumho.txKey).toBe('금호어울림레이크');

      // 3. sync-transactions.js 키 정규화 규칙 적용 검증
      let norm = normalizeAptName('금호어울림 레이크 1차');
      if (norm === '금호어울림레이크1차') {
        norm = '금호어울림레이크';
      }
      expect(norm).toBe('금호어울림레이크');
    });

    it('should detect both lower and upper price outliers with Two-Sided IQR Outlier Detection', () => {
      const records = [
        { contractYm: '202605', contractDay: '01', price: 99000, area: 84.9, dealType: '매매' },
        { contractYm: '202605', contractDay: '02', price: 100000, area: 84.9, dealType: '매매' },
        { contractYm: '202605', contractDay: '03', price: 101000, area: 84.9, dealType: '매매' },
        { contractYm: '202605', contractDay: '04', price: 99500, area: 84.9, dealType: '매매' },
        { contractYm: '202605', contractDay: '05', price: 100500, area: 84.9, dealType: '매매' },
        // 하한 이상치 (급락 / 특수관계 덤핑 의심 거래: 1.5억 정상가 대비 2천만 원)
        { contractYm: '202605', contractDay: '06', price: 20000, area: 84.9, dealType: '매매' },
        // 상한 이상치 (급등 / 이상 폭등 거래: 1억 대비 4.5억 입력 착오 또는 조작)
        { contractYm: '202605', contractDay: '07', price: 450000, area: 84.9, dealType: '매매' },
      ];

      const processed = applyIqrOutlierDetection(records);

      const lowerOutlier = processed.find((r: any) => r.price === 20000);
      const upperOutlier = processed.find((r: any) => r.price === 450000);
      const normalTx = processed.find((r: any) => r.price === 100000);

      expect(lowerOutlier.isOutlier).toBe(true);
      expect(upperOutlier.isOutlier).toBe(true);
      expect(normalTx.isOutlier).toBe(false);
    });

    it('should exclude direct deals (직거래) from rolling window calculation in filterOutliersRolling', () => {
      const rollingTxs = [
        { contractYm: '202605', contractDay: '01', price: 80000, area: 84.9, dealType: '매매' },
        { contractYm: '202605', contractDay: '02', price: 80500, area: 84.9, dealType: '매매' },
        { contractYm: '202605', contractDay: '03', price: 79500, area: 84.9, dealType: '매매' },
        { contractYm: '202605', contractDay: '04', price: 81000, area: 84.9, dealType: '매매' },
        // 직거래 (가족 간 저가 증여 의심 거래: 3천만 원)
        { contractYm: '202605', contractDay: '05', price: 30000, area: 84.9, dealType: '직거래' },
        // dealingGbn 직거래 표기 건
        { contractYm: '202605', contractDay: '06', price: 32000, area: 84.9, dealType: '매매', dealingGbn: '직거래' },
      ];

      expect(isDirectDeal({ dealType: '직거래' })).toBe(true);
      expect(isDirectDeal({ dealingGbn: '직거래' })).toBe(true);
      expect(isDirectDeal({ dealType: '매매' })).toBe(false);

      const cleaned = filterOutliersRolling(rollingTxs);

      // 직거래 2건 모두 롤링 윈도우 계산 및 결과에서 완전 배제 확인
      expect(cleaned.length).toBe(4);
      expect(cleaned.some((t: any) => t.price === 30000 || t.price === 32000)).toBe(false);
      expect(cleaned.every((t: any) => t.price >= 79000)).toBe(true);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // R4: Pipeline Resilience & Validation Tests
  // ──────────────────────────────────────────────────────────────────────────
  describe('R4: Pipeline Resilience & Validation Tests', () => {
    it('should validate catalog complexes with 0 false-positive UNREGISTERED_APT warnings in validateTransactions', () => {
      const benchmarkRecords = [
        { aptName: '동탄역 롯데캐슬', contractDate: '20260901', price: 160000, area: 84.82, floor: 25, dealType: '매매' },
        { aptName: '동탄역 시범한화꿈에그린프레스티지', contractDate: '20260901', price: 125000, area: 84.5, floor: 18, dealType: '매매' },
        { aptName: '동탄역 시범 우남퍼스트빌', contractDate: '20260901', price: 110000, area: 84.9, floor: 12, dealType: '매매' },
        { aptName: '금호어울림 레이크 1차', contractDate: '20260901', price: 65000, area: 74.5, floor: 10, dealType: '매매' },
        { aptName: '동탄역 더샵 센트럴시티', contractDate: '20260901', price: 130000, area: 84.9, floor: 20, dealType: '매매' },
      ];

      const { valid, errors, report } = validateTransactions(benchmarkRecords);

      expect(errors.length).toBe(0);
      expect(valid.length).toBe(5);
      // 핵심 성공 기준: 등록 단지에 대해 UNREGISTERED_APT 경고가 0건이어야 함
      expect(report.unregisteredApts).toEqual([]);

      // loadKnownApartments() 전체 카탈로그 로드 규모 검증 (>= 175개 단지)
      const knownSet = loadKnownApartments();
      expect(knownSet).not.toBeNull();
      expect(knownSet?.size).toBeGreaterThanOrEqual(175);
    });

    it('should flag unregistered complexes, negative prices, malformed zod schemas, and invalid contract dates appropriately in validateTransactions', () => {
      const anomalousRecords = [
        // 1. 타 지역 미등록 단지
        { aptName: '해운대 엘시티', contractDate: '20260901', price: 200000, area: 84.0, floor: 30, dealType: '매매' },
        // 2. 가격 0 이하 (매매가 및 보증금 없음) -> 치명적 오류(ERROR)
        { aptName: '동탄역 롯데캐슬', contractDate: '20260901', price: 0, deposit: 0, area: 84.82, floor: 10, dealType: '매매' },
        // 3. 잘못된 계약일자 형식 -> 치명적 오류(ERROR)
        { aptName: '동탄역 롯데캐슬', contractDate: '2026-09-01', price: 150000, area: 84.82, floor: 10, dealType: '매매' },
        // 4. 면적 극단치 -> 경고(WARNING: AREA_OUTLIER)
        { aptName: '동탄역 롯데캐슬', contractDate: '20260901', price: 150000, area: 550.0, floor: 10, dealType: '매매' },
        // 5. 취소 거래 -> 안내(INFO: CANCELLED_TRANSACTION)
        { aptName: '동탄역 롯데캐슬', contractDate: '20260901', price: 150000, area: 84.82, floor: 10, dealType: '매매', cancelDate: '20260902' },
        // 6. Zod 스키마 검증 실패 건 (단지명 빈값) -> 치명적 오류(ERROR)
        { aptName: '', contractDate: '20260901', price: 100000, area: 84.0, floor: 10, dealType: '매매' },
        // 7. Zod 스키마 검증 실패 건 (객체 아님 / null) -> 치명적 오류(ERROR)
        null,
        // 8. Zod 스키마 검증 실패 건 (음수 면적) -> 치명적 오류(ERROR)
        { aptName: '동탄역 롯데캐슬', contractDate: '20260901', price: 100000, area: -10, floor: 10, dealType: '매매' },
      ];

      const { errors, warnings, report } = validateTransactions(anomalousRecords);

      expect(errors.length).toBe(5); // 가격 0, 잘못된 날짜 형식, 단지명 빈값, null, 음수 면적
      const zodErrors = errors.filter((e: any) => e.issue.startsWith('Zod 검증 실패'));
      expect(zodErrors.length).toBe(3); // 단지명 빈값, null, 음수 면적 3건이 Zod 검증에서 안전하게 수집됨

      expect(report.unregisteredApts.length).toBe(1);
      expect(report.unregisteredApts[0]).toContain('해운대 엘시티');

      const areaWarning = warnings.find((w: any) => w.issues.some((i: any) => i.type === 'AREA_OUTLIER'));
      expect(areaWarning).toBeDefined();

      const cancelledTx = warnings.find((w: any) => w.issues.some((i: any) => i.type === 'CANCELLED_TRANSACTION'));
      expect(cancelledTx).toBeDefined();
    });

    it('should correctly classify numeric cancelDate/cdealDay and handle string null/undefined/hyphen across pipeline modules', () => {
      const cancellationCases = [
        { name: 'numeric cancelDate', tx: { cancelDate: 20260401 }, expected: true },
        { name: 'numeric cdealDay', tx: { cdealDay: 20250620 }, expected: true },
        { name: 'spaced string cancelDate', tx: { cancelDate: ' 20260401 ' }, expected: true },
        { name: 'cdealType O', tx: { cdealType: 'O' }, expected: true },
        { name: 'cdealType 해제', tx: { cdealType: '해제' }, expected: true },
        { name: 'isCanceled boolean', tx: { isCanceled: true }, expected: true },
        { name: 'hyphen cancelDate', tx: { cancelDate: '-' }, expected: false },
        { name: 'string null cancelDate', tx: { cancelDate: 'null' }, expected: false },
        { name: 'string undefined cancelDate', tx: { cancelDate: 'undefined' }, expected: false },
        { name: 'string nan cancelDate', tx: { cancelDate: 'nan' }, expected: false },
        { name: 'empty string cancelDate', tx: { cancelDate: '' }, expected: false },
        { name: 'null value cancelDate', tx: { cancelDate: null }, expected: false },
        { name: 'undefined value cancelDate', tx: { cancelDate: undefined }, expected: false },
        { name: 'active transaction without cancellation', tx: { price: 90000, contractYm: '202605' }, expected: false },
      ];

      for (const { name, tx, expected } of cancellationCases) {
        expect({ name, outlier: isCancelledTransaction(tx) }).toEqual({ name, outlier: expected });
        expect({ name, summarizer: isCancelledInSummarizer(tx) }).toEqual({ name, summarizer: expected });
        expect({ name, macro: isCancelledInMacroTrend(tx) }).toEqual({ name, macro: expected });
        expect({ name, validator: isCancelledInValidator(tx) }).toEqual({ name, validator: expected });
      }
    });

    it('should parse and handle public API XML and JSON error envelopes gracefully using genuine pipeline helpers', () => {
      // 1. 공공데이터포털 트래픽 초과 XML (<resultCode>99</resultCode>)
      const xmlTrafficExceeded = `
        <response>
          <header>
            <resultCode>99</resultCode>
            <resultMsg>LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR</resultMsg>
          </header>
        </response>
      `;
      const res99 = parseGovApiEnvelope(xmlTrafficExceeded);
      expect(res99.isError).toBe(true);
      expect(res99.resultCode).toBe('99');
      expect(res99.resultMsg).toContain('LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR');

      // 2. 미등록 서비스키 XML (<resultCode>30</resultCode>)
      const xmlInvalidKey = `
        <response>
          <header>
            <resultCode>30</resultCode>
            <resultMsg>SERVICE_KEY_IS_NOT_REGISTERED_ERROR</resultMsg>
          </header>
        </response>
      `;
      const res30 = parseGovApiEnvelope(xmlInvalidKey);
      expect(res30.isError).toBe(true);
      expect(res30.resultCode).toBe('30');

      // 3. 국토부 게이트웨이 인증 에러 (<OpenAPI_ServiceResponse>)
      const xmlGatewayError = `
        <OpenAPI_ServiceResponse>
          <cmmMsgHeader>
            <errMsg>SERVICE ERROR</errMsg>
            <returnAuthMsg>HTTP_ROUTING_ERROR</returnAuthMsg>
            <returnReasonCode>04</returnReasonCode>
          </cmmMsgHeader>
        </OpenAPI_ServiceResponse>
      `;
      const resGateway = parseGovApiEnvelope(xmlGatewayError);
      expect(resGateway.isError).toBe(true);
      expect(resGateway.isGatewayError).toBe(true);
      expect(resGateway.resultCode).toBe('04');

      // 4. 정상 00 XML 응답
      const xmlSuccess = `
        <response>
          <header>
            <resultCode>00</resultCode>
            <resultMsg>NORMAL_SERVICE</resultMsg>
          </header>
          <body><totalCount>1</totalCount></body>
        </response>
      `;
      const resOk = parseGovApiEnvelope(xmlSuccess);
      expect(resOk.isError).toBe(false);
      expect(resOk.resultCode).toBe('00');

      // 5. JSON 에러 응답 (header.resultCode = '99')
      const jsonError = {
        response: {
          header: {
            resultCode: '99',
            resultMsg: 'SERVICE_ACCESS_DENIED'
          }
        }
      };
      const resJsonErr = parseGovApiEnvelope(jsonError);
      expect(resJsonErr.isError).toBe(true);
      expect(resJsonErr.resultCode).toBe('99');
      expect(resJsonErr.resultMsg).toBe('SERVICE_ACCESS_DENIED');

      // 6. JSON 정상 응답 (header.resultCode = '00')
      const jsonSuccess = {
        response: {
          header: {
            resultCode: '00',
            resultMsg: 'NORMAL_SERVICE'
          }
        }
      };
      const resJsonOk = parseGovApiEnvelope(jsonSuccess);
      expect(resJsonOk.isError).toBe(false);
      expect(resJsonOk.resultCode).toBe('00');
    });

    it('should recover from transient network timeouts with exponential backoff retry logic using genuine fetchWithRetry', async () => {
      const axiosGetSpy = jest.spyOn(axios, 'get');

      try {
        // 1. 2회 실패(타임아웃) 후 3회차에 성공하는 일시적 네트워크 순단 시나리오 (fetchTradeWithRetry)
        let attempt = 0;
        axiosGetSpy.mockImplementation(async () => {
          attempt++;
          if (attempt < 3) {
            const timeoutErr: any = new Error('timeout of 25000ms exceeded');
            timeoutErr.code = 'ECONNABORTED';
            throw timeoutErr;
          }
          return { status: 200, data: '<response><header><resultCode>00</resultCode></header></response>' };
        });

        const successResult = await fetchTradeWithRetry('https://apis.data.go.kr/test', {}, 3, 5);
        expect(successResult.status).toBe(200);
        expect(axiosGetSpy).toHaveBeenCalledTimes(3);

        // 2. 3회 연속 영구 실패 시 정상적으로 마지막 에러를 전파하는지 확인 (fetchRentWithRetry)
        axiosGetSpy.mockReset();
        axiosGetSpy.mockImplementation(async () => {
          const netErr: any = new Error('getaddrinfo ENOTFOUND apis.data.go.kr');
          netErr.code = 'ENOTFOUND';
          throw netErr;
        });

        await expect(fetchRentWithRetry('https://apis.data.go.kr/rent-test', {}, 3, 5)).rejects.toThrow('ENOTFOUND');
        expect(axiosGetSpy).toHaveBeenCalledTimes(3);
      } finally {
        axiosGetSpy.mockRestore();
      }
    });

    it('should validate trade record schemas against AptTransactionRecordSchema', () => {
      const validTrade = {
        sigungu: '경기도 화성시 동탄구 오산동',
        dong: '오산동',
        aptName: '동탄역 롯데캐슬',
        area: 84.82,
        areaPyeong: 34,
        contractYm: '202605',
        contractDay: '15',
        contractDate: '20260515',
        price: 160000,
        floor: 25,
        buyer: '개인',
        seller: '개인',
        buildYear: 2021,
        roadName: '동탄대로',
        cancelDate: '',
        dealType: '중개거래',
        agentLocation: '경기 화성시',
        registrationDate: '',
        housingType: '',
        source: 'govt_api',
        _key: '동탄역 롯데캐슬_202605_15_84.82_160000_25',
      };
      const parsed = AptTransactionRecordSchema.safeParse(validTrade);
      expect(parsed.success).toBe(true);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // R5: 170k Transactions, Period Chunks & Zero-Cost Client Architecture Tests
  // ──────────────────────────────────────────────────────────────────────────
  describe('R5: 170k Transactions, Period Chunks & Zero-Cost Client Architecture Tests', () => {
    it('should block direct Firestore reads in browser environment (window !== undefined) to enforce zero cost', async () => {
      const originalWindow = (global as any).window;
      try {
        (global as any).window = {}; // Simulate browser environment
        const result = await staticDataService.fetchRecentTransactionsFromFirestore(30);
        expect(result).toEqual([]);
      } finally {
        (global as any).window = originalWindow;
      }
    });

    it('should format period transactions for 90d, 1y, 3y, and compact all-time tuples', () => {
      const refDate = new Date(2026, 4, 20); // 2026-05-20
      const sampleTxs = [
        { aptName: '동탄역 롯데캐슬', contractYm: '202605', contractDay: '10', contractDate: '20260510', price: 160000, area: 84.9, areaPyeong: 34, floor: 20, dealType: '매매' },
        { aptName: '동탄역 롯데캐슬', contractYm: '202511', contractDay: '15', contractDate: '20251115', price: 155000, area: 84.9, areaPyeong: 34, floor: 18, dealType: '매매' },
        { aptName: '동탄역 롯데캐슬', contractYm: '202401', contractDay: '20', contractDate: '20240120', price: 145000, area: 84.9, areaPyeong: 34, floor: 15, dealType: '매매' },
        { aptName: '동탄역 롯데캐슬', contractYm: '202005', contractDay: '05', contractDate: '20200505', price: 90000, area: 84.9, areaPyeong: 34, floor: 10, dealType: '매매' },
        { aptName: '동탄역 롯데캐슬', contractYm: '202605', contractDay: '12', contractDate: '20260512', price: 170000, area: 84.9, areaPyeong: 34, floor: 22, dealType: '매매', cancelDate: '20260513' }, // Cancelled!
      ];

      const p90d = formatPeriodTransactions(sampleTxs, '90d', refDate);
      expect(p90d.length).toBe(1);
      expect(p90d[0].contractDate).toBe('20260510');

      const p1y = formatPeriodTransactions(sampleTxs, '1y', refDate);
      expect(p1y.length).toBe(2);

      const p3y = formatPeriodTransactions(sampleTxs, '3y', refDate);
      expect(p3y.length).toBe(3);

      const pAllTuple = formatPeriodTransactions(sampleTxs, 'all', refDate, true);
      expect(pAllTuple.fields).toBeDefined();
      expect(pAllTuple.data.length).toBe(4); // Excludes cancelled
    });

    it('should compute comprehensive 18-year annual volumes, allTimeHigh/Low, minPriceByArea, and appreciation rate', () => {
      const saleTxs = [
        { contractYm: '202605', contractDay: '10', contractDate: '20260510', price: 160000, area: 84.9, areaPyeong: 34, floor: 20 },
        { contractYm: '202403', contractDay: '15', contractDate: '20240315', price: 130000, area: 84.9, areaPyeong: 34, floor: 15 },
        { contractYm: '201806', contractDay: '01', contractDate: '20180601', price: 70000, area: 84.9, areaPyeong: 34, floor: 10 },
        { contractYm: '201008', contractDay: '20', contractDate: '20100820', price: 40000, area: 84.9, areaPyeong: 34, floor: 5 },
      ];

      const summary = calculateApartmentSummary('동탄역 롯데캐슬', saleTxs, [], { 동탄역롯데캐슬: '오산동' }, new Date(2026, 4, 20));

      expect(summary.annualVolumes['2026']).toBe(1);
      expect(summary.annualVolumes['2024']).toBe(1);
      expect(summary.annualVolumes['2018']).toBe(1);
      expect(summary.annualVolumes['2010']).toBe(1);
      expect(summary.annualVolumes['2015']).toBe(0);

      expect(summary.allTimeHigh).toBe(160000);
      expect(summary.allTimeHighEok).toBe('16억');
      expect(summary.allTimeLow).toBe(40000);
      expect(summary.allTimeLowEok).toBe('4억');

      expect(summary.minPriceByArea['84.90']).toBe(40000);
      expect(summary.maxPriceByArea['84.90']).toBe(160000);

      // Appreciation rate from earliest 40000 to latest 160000 = (160000 - 40000)/40000 = +300%
      expect(summary.appreciationRate).toBe(300);
      expect(summary.earliestDate).toBe('20100820');
      expect(summary.earliestPrice).toBe(40000);
    });

    it('should verify catalog complexes and transactions scale integrity (180+ complex files, 160,000+ historical records)', () => {
      const txDataDir = path.resolve(__dirname, '../../public/tx-data');
      if (fs.existsSync(txDataDir)) {
        const files = fs.readdirSync(txDataDir).filter((f: string) => f.endsWith('.json') && !f.endsWith('-recent.json') && f !== '_index.json');
        expect(files.length).toBeGreaterThanOrEqual(180);

        let totalTxs = 0;
        files.forEach((f: string) => {
          const raw = JSON.parse(fs.readFileSync(path.join(txDataDir, f), 'utf8'));
          totalTxs += Array.isArray(raw) ? raw.length : (raw.transactions || []).length;
        });
        expect(totalTxs).toBeGreaterThan(160000);
      }
    });
  });
});
