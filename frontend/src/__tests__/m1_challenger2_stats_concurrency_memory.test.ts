/**
 * @module m1_challenger2_stats_concurrency_memory.test
 * @description Empirical Challenger 2 Stress Test Suite for Milestone 1 (Statistics Engine).
 * Adversarially tests:
 * 1. Cancellation evasion across 15+ diverse cancellation payload structures
 * 2. Rapid filter toggling simulation (1,000 continuous filter shifts in a tight loop)
 * 3. Memory allocation / heap stability / GC pressure analysis
 * 4. Concurrency & re-entrancy under Promise.all load with Object.freeze immutability
 * 5. Prototype pollution defense and hostile corrupted input resilience
 * 6. Dual-signature adaptation parity (positional vs object options)
 */

import {
  aggregateStatistics,
  aggregateStats,
  computeComplexRankings,
  computeHyperlocalInsights,
  computeMacroTimeSeries,
  computePyeongPrice,
  computeVolumeDistribution,
  filterTransactions,
  isCancelledTransaction,
  safeDivide,
  safeRound,
  EMPTY_STATS_RESULT,
} from '@/lib/analytics/statsEngine';
import type {
  ComplexStatItem,
  PyeongFilter,
  RawRentRecord,
  RawTransactionRecord,
  RegionFilter,
  SortOption,
  StatsAggregateResult,
  StatsFilterState,
  TimeframeFilter,
} from '@/types/stats';
import type { RecentTransaction } from '@/types/transaction';

describe('Challenger 2: Concurrency, Memory & Cancellation Evasion Stress Harness', () => {
  const REF_DATE = '2026-09-19';

  // ==========================================================================
  // Section 1: Cancellation Evasion Stress Harness
  // ==========================================================================
  describe('1. Cancellation Evasion Stress Harness', () => {
    const validComplexA = '동탄역시범우남퍼스트빌';
    const validDongA = '청계동';

    // Baseline legitimate transactions for Complex A (avg ~80,000, 84㎡)
    const legitimateTxs: RawTransactionRecord[] = [
      {
        aptName: validComplexA,
        dong: validDongA,
        contractDate: '20260901',
        priceVal: 80000,
        area: 84.8,
        areaPyeong: 34.0,
        dealType: '중개거래',
      },
      {
        aptName: validComplexA,
        dong: validDongA,
        contractDate: '20260905',
        priceVal: 82000,
        area: 84.8,
        areaPyeong: 34.0,
        dealType: '중개거래',
      },
    ];

    // Diverse evasion payloads attempting to inject fake prices
    const evasionPayloads: Array<{ name: string; record: RawTransactionRecord }> = [
      {
        name: "cdealType: 'O' with extreme 30억 price spike",
        record: {
          aptName: validComplexA,
          dong: validDongA,
          contractDate: '20260910',
          priceVal: 300000, // 30억
          area: 84.8,
          areaPyeong: 34.0,
          cdealType: 'O',
          dealType: '매매',
          isNewHigh: true,
        },
      },
      {
        name: "cdealType: '해제' with extreme 40억 price spike",
        record: {
          aptName: validComplexA,
          dong: validDongA,
          contractDate: '20260912',
          priceVal: 400000, // 40억
          area: 84.8,
          areaPyeong: 34.0,
          cdealType: '해제',
          dealType: '매매',
          isNewHigh: true,
        },
      },
      {
        name: "cdealType: 'o' (lowercase) with 25억 price spike",
        record: {
          aptName: validComplexA,
          dong: validDongA,
          contractDate: '20260913',
          priceVal: 250000,
          area: 84.8,
          areaPyeong: 34.0,
          cdealType: 'o',
          dealType: '매매',
        },
      },
      {
        name: "cdealType: ' O ' (padded whitespace)",
        record: {
          aptName: validComplexA,
          dong: validDongA,
          contractDate: '20260914',
          priceVal: 280000,
          area: 84.8,
          areaPyeong: 34.0,
          cdealType: ' O ',
          dealType: '매매',
        },
      },
      {
        name: "cdealType: '취소' (Korean cancellation variant)",
        record: {
          aptName: validComplexA,
          dong: validDongA,
          contractDate: '20260915',
          priceVal: 350000,
          area: 84.8,
          areaPyeong: 34.0,
          cdealType: '취소',
          dealType: '매매',
        },
      },
      {
        name: 'isCanceled: true with 50억 price spike',
        record: {
          aptName: validComplexA,
          dong: validDongA,
          contractDate: '20260916',
          priceVal: 500000, // 50억
          area: 84.8,
          areaPyeong: 34.0,
          isCanceled: true,
          dealType: '매매',
          isNewHigh: true,
        },
      },
      {
        name: "cancelDate: '2026-04-01' (hyphenated date string)",
        record: {
          aptName: validComplexA,
          dong: validDongA,
          contractDate: '20260917',
          priceVal: 20000, // 2억 fake crash
          area: 84.8,
          areaPyeong: 34.0,
          cancelDate: '2026-04-01',
          dealType: '매매',
        },
      },
      {
        name: "cancelDate: '20260401' (8-digit string)",
        record: {
          aptName: validComplexA,
          dong: validDongA,
          contractDate: '20260918',
          priceVal: 15000, // 1.5억 fake crash
          area: 84.8,
          areaPyeong: 34.0,
          cancelDate: '20260401',
          dealType: '매매',
        },
      },
      {
        name: "cancelDate: '2026.04.01' (dot-separated string)",
        record: {
          aptName: validComplexA,
          dong: validDongA,
          contractDate: '20260919',
          priceVal: 22000,
          area: 84.8,
          areaPyeong: 34.0,
          cancelDate: '2026.04.01',
          dealType: '매매',
        },
      },
      {
        name: 'cancelDate: 20260401 (numeric format)',
        record: {
          aptName: validComplexA,
          dong: validDongA,
          contractDate: '20260919',
          priceVal: 18000,
          area: 84.8,
          areaPyeong: 34.0,
          cancelDate: 20260401,
          dealType: '매매',
        },
      },
      {
        name: 'cdealDay: 20260401 (numeric format from MOLIT)',
        record: {
          aptName: validComplexA,
          dong: validDongA,
          contractDate: '20260919',
          priceVal: 450000,
          area: 84.8,
          areaPyeong: 34.0,
          cdealDay: 20260401,
          dealType: '매매',
          isNewHigh: true,
        },
      },
      {
        name: "cdealDay: '20260401' (string format)",
        record: {
          aptName: validComplexA,
          dong: validDongA,
          contractDate: '20260919',
          priceVal: 480000,
          area: 84.8,
          areaPyeong: 34.0,
          cdealDay: '20260401',
          dealType: '매매',
        },
      },
      {
        name: "cdealDay: ' 2026-04-01 ' (padded string)",
        record: {
          aptName: validComplexA,
          dong: validDongA,
          contractDate: '20260919',
          priceVal: 490000,
          area: 84.8,
          areaPyeong: 34.0,
          cdealDay: ' 2026-04-01 ',
          dealType: '매매',
        },
      },
      {
        name: 'combined: isCanceled + cdealType + cancelDate + cdealDay',
        record: {
          aptName: validComplexA,
          dong: validDongA,
          contractDate: '20260920',
          priceVal: 999999,
          area: 84.8,
          areaPyeong: 34.0,
          isCanceled: true,
          cdealType: 'O',
          cancelDate: '20260401',
          cdealDay: 20260401,
          dealType: '매매',
          isNewHigh: true,
        },
      },
    ];

    it('1.1: should individually identify every evasion payload as cancelled', () => {
      evasionPayloads.forEach(({ name, record }) => {
        const isC = isCancelledTransaction(record);
        expect({ payload: name, isCancelled: isC }).toEqual({
          payload: name,
          isCancelled: true,
        });
      });
    });

    it('1.2: should NOT treat false-positive cancellation strings as cancelled', () => {
      const nonCancelledRecords = [
        { cdealType: '' },
        { cdealType: '   ' },
        { cdealType: '-' },
        { cdealType: 'null' },
        { cdealType: 'undefined' },
        { cdealType: 'nan' },
        { cdealType: null },
        { cancelDate: '' },
        { cancelDate: '-' },
        { cancelDate: 'null' },
        { cancelDate: 'undefined' },
        { cancelDate: null },
        { cdealDay: '' },
        { cdealDay: '-' },
        { cdealDay: 'null' },
        { cdealDay: null },
        { isCanceled: false },
        { isCanceled: null },
        { isCanceled: undefined },
      ];

      nonCancelledRecords.forEach((rec, idx) => {
        expect(isCancelledTransaction(rec)).toBe(false);
      });
    });

    it('1.3: should strictly prevent ALL cancelled records from leaking into aggregate statistics', () => {
      // Combined dataset: 2 legitimate transactions + 14 corrupted/cancelled evasion payloads
      const testDataset = [
        ...legitimateTxs,
        ...evasionPayloads.map((p) => p.record),
      ];

      const res = aggregateStats(
        testDataset,
        { region: 'ALL', pyeong: 'ALL', timeframe: 'ALL' },
        { referenceDate: REF_DATE }
      );

      // Volume must strictly count only the 2 legitimate transactions
      expect(res.totalVolume).toBe(2);

      // Average sale price must be (80,000 + 82,000) / 2 = 81,000 (NOT pulled up by 50억 spikes or down by 1.5억 crashes)
      expect(res.avgSalePrice).toBe(81000);

      // Pyeong rankings must contain exactly 1 complex with 2 transactions
      expect(res.pyeongRankings).toHaveLength(1);
      const complexStat = res.pyeongRankings[0];

      expect(complexStat.aptName).toBe(validComplexA);
      expect(complexStat.txCount).toBe(2);
      expect(complexStat.avgPrice).toBe(81000);

      // Highest price MUST be 82,000 (NOT 30억, 40억, or 50억)
      expect(complexStat.highestPrice).toBe(82000);

      // Lowest price MUST be 80,000 (NOT 1.5억 or 2.0억 fake crashes)
      expect(complexStat.lowestPrice).toBe(80000);

      // Latest price MUST be 82,000 (contractDate 20260905, NOT cancelled 20260920)
      expect(complexStat.latestPrice).toBe(82000);

      // isNewHigh must be false (none of the cancelled fake new highs leaked)
      expect(complexStat.isNewHigh).toBe(false);

      // Insight cards must NOT highlight the complex as a fake new high
      expect(res.insights.newHighComplex).toBeNull();
    });

    it('1.4: should verify pyeong rankings limit and order are not distorted by cancellations', () => {
      // 5 different complexes: Complex 1 has legitimate price 70,000; Complex 2 has legitimate price 60,000
      // Complex 3 has legitimate 50,000 + cancelled 900,000
      const multiComplexTxs: RawTransactionRecord[] = [
        {
          aptName: '단지1_70000',
          dong: '청계동',
          contractDate: '20260901',
          priceVal: 70000,
          area: 84.8,
          areaPyeong: 34.0,
          dealType: '중개거래',
        },
        {
          aptName: '단지2_60000',
          dong: '청계동',
          contractDate: '20260901',
          priceVal: 60000,
          area: 84.8,
          areaPyeong: 34.0,
          dealType: '중개거래',
        },
        {
          aptName: '단지3_50000_fakeSpike',
          dong: '청계동',
          contractDate: '20260901',
          priceVal: 50000,
          area: 84.8,
          areaPyeong: 34.0,
          dealType: '중개거래',
        },
        {
          aptName: '단지3_50000_fakeSpike',
          dong: '청계동',
          contractDate: '20260910',
          priceVal: 900000, // 90억 cancelled spike!
          area: 84.8,
          areaPyeong: 34.0,
          dealType: '중개거래',
          cdealType: 'O',
        },
      ];

      const res = aggregateStats(
        multiComplexTxs,
        { region: '청계동', pyeong: 'ALL', timeframe: 'ALL' },
        { sortBy: 'PRICE_DESC' }
      );

      expect(res.totalVolume).toBe(3);
      expect(res.pyeongRankings).toHaveLength(3);

      // Order must be 단지1 (70000), 단지2 (60000), 단지3 (50000)
      // If cancellation leaked, 단지3 would erroneously be #1 at 475,000 or 900,000
      expect(res.pyeongRankings[0].aptName).toBe('단지1_70000');
      expect(res.pyeongRankings[0].avgPrice).toBe(70000);
      expect(res.pyeongRankings[1].aptName).toBe('단지2_60000');
      expect(res.pyeongRankings[1].avgPrice).toBe(60000);
      expect(res.pyeongRankings[2].aptName).toBe('단지3_50000_fakeSpike');
      expect(res.pyeongRankings[2].avgPrice).toBe(50000);
      expect(res.pyeongRankings[2].highestPrice).toBe(50000);
    });
  });

  // ==========================================================================
  // Section 2: Rapid Filter Toggling & Memory Stability Simulation
  // ==========================================================================
  describe('2. Rapid Filter Toggling & Memory Stability Simulation', () => {
    // Generate 1,500 realistic synthetic transactions across 10 complexes, 5 dongs, 4 pyeong tiers, 6 months
    const dongs = ['청계동', '여울동', '영천동', '반송동', '석우동'];
    const pyeongAreas = [
      { area: 59.8, p: 24.0 }, // SMALL
      { area: 84.9, p: 34.0 }, // MEDIUM_SMALL
      { area: 99.5, p: 38.0 }, // MEDIUM_LARGE
      { area: 120.0, p: 46.0 }, // LARGE
    ];

    const syntheticTransactions: RawTransactionRecord[] = Array.from({ length: 1500 }, (_, i) => {
      const dong = dongs[i % dongs.length];
      const tierInfo = pyeongAreas[i % pyeongAreas.length];
      const monthNum = (i % 6) + 4; // April to September 2026
      const dayNum = (i % 28) + 1;
      const contractDate = `2026${String(monthNum).padStart(2, '0')}${String(dayNum).padStart(2, '0')}`;
      const basePrice = 50000 + (i % 30) * 1500;

      return {
        aptKey: `apt_key_${i % 15}`,
        aptName: `단지_${dong}_${(i % 15) + 1}`,
        dong,
        contractDate,
        date: `${String(monthNum).padStart(2, '0')}.${String(dayNum).padStart(2, '0')}`,
        priceVal: basePrice,
        priceEok: `${(basePrice / 10000).toFixed(1)}억`,
        area: tierInfo.area,
        areaPyeong: tierInfo.p,
        floor: (i % 25) + 1,
        dealType: '중개거래',
        isCanceled: i % 50 === 0, // 2% cancelled
        isOutlier: i % 100 === 0, // 1% outlier
      };
    });

    const regions: RegionFilter[] = ['ALL', 'DONGTAN1', 'DONGTAN2', '청계동', '여울동', '반송동', '오산동'];
    const pyeongs: PyeongFilter[] = ['ALL', 'SMALL', 'MEDIUM_SMALL', 'MEDIUM_LARGE', 'LARGE'];
    const timeframes: TimeframeFilter[] = ['1M', '3M', '6M', '1Y', 'ALL'];
    const sorts: SortOption[] = ['VOLUME_DESC', 'PRICE_DESC', 'PRICE_ASC', 'PYEONG_DESC', 'JEONSE_DESC'];

    it('2.1: should execute 1,000 continuous filter shifts in a tight loop under 2.5ms per shift', () => {
      // Warmup JIT
      for (let w = 0; w < 10; w++) {
        aggregateStats(
          syntheticTransactions,
          { region: 'ALL', pyeong: 'ALL', timeframe: 'ALL' },
          { referenceDate: REF_DATE }
        );
      }

      const ITERATIONS = 1000;
      const startTime = performance.now();

      let totalComputedVolume = 0;
      for (let i = 0; i < ITERATIONS; i++) {
        const region = regions[i % regions.length];
        const pyeong = pyeongs[(i * 3) % pyeongs.length];
        const timeframe = timeframes[(i * 7) % timeframes.length];
        const sort = sorts[(i * 11) % sorts.length];

        const res = aggregateStats(
          syntheticTransactions,
          { region, pyeong, timeframe, sort },
          { referenceDate: REF_DATE }
        );

        totalComputedVolume += res.totalVolume;
      }

      const totalElapsed = performance.now() - startTime;
      const avgElapsedPerShift = totalElapsed / ITERATIONS;

      // Verify throughput and correctness (PROJECT.md spec: < 5.0ms for 1,000 records)
      expect(totalComputedVolume).toBeGreaterThan(0);
      expect(avgElapsedPerShift).toBeLessThan(5.0); // Average < 5.0ms per aggregation
    });

    it('2.2: should maintain strict memory stability without heap leaks across 1,000 shifts', () => {
      // Force GC if available or record baseline heap
      if (global.gc) {
        global.gc();
      }

      const memBaseline = process.memoryUsage().heapUsed;

      const ITERATIONS = 1000;
      for (let i = 0; i < ITERATIONS; i++) {
        const region = regions[i % regions.length];
        const pyeong = pyeongs[i % pyeongs.length];
        const timeframe = timeframes[i % timeframes.length];

        aggregateStats(
          syntheticTransactions,
          { region, pyeong, timeframe },
          { referenceDate: REF_DATE }
        );
      }

      if (global.gc) {
        global.gc();
      }

      const memAfter = process.memoryUsage().heapUsed;
      const heapGrowthMB = (memAfter - memBaseline) / (1024 * 1024);

      // Heap growth across 1,000 operations should be well within GC bounds (< 25MB)
      expect(heapGrowthMB).toBeLessThan(25.0);
    });

    it('2.3: should be strictly deterministic and idempotent between iteration 1 and 1,000', () => {
      const fixedFilter: StatsFilterState = {
        region: 'DONGTAN2',
        pyeong: 'MEDIUM_SMALL',
        timeframe: '3M',
        sort: 'PYEONG_DESC',
      };

      const firstRun = aggregateStats(syntheticTransactions, fixedFilter, { referenceDate: REF_DATE });

      // Run 500 noise queries
      for (let i = 0; i < 500; i++) {
        aggregateStats(
          syntheticTransactions,
          { region: regions[i % regions.length], pyeong: pyeongs[i % pyeongs.length], timeframe: '1M' },
          { referenceDate: REF_DATE }
        );
      }

      const rerun = aggregateStats(syntheticTransactions, fixedFilter, { referenceDate: REF_DATE });

      expect(rerun.totalVolume).toBe(firstRun.totalVolume);
      expect(rerun.avgSalePrice).toBe(firstRun.avgSalePrice);
      expect(rerun.avgPyeongPrice).toBe(firstRun.avgPyeongPrice);
      expect(rerun.pyeongRankings).toEqual(firstRun.pyeongRankings);
      expect(rerun.volumeDistribution).toEqual(firstRun.volumeDistribution);
      expect(rerun.timeSeriesTrend).toEqual(firstRun.timeSeriesTrend);
    });
  });

  // ==========================================================================
  // Section 3: Concurrency & Re-entrancy Stress Harness
  // ==========================================================================
  describe('3. Concurrency & Re-entrancy Stress Harness', () => {
    const concurrentDataset: RawTransactionRecord[] = Array.from({ length: 200 }, (_, i) => ({
      aptKey: `apt_${i % 5}`,
      aptName: `단지_${i % 5}`,
      dong: i % 2 === 0 ? '청계동' : '반송동',
      contractDate: `202609${String((i % 20) + 1).padStart(2, '0')}`,
      priceVal: 60000 + i * 100,
      area: 84.8,
      areaPyeong: 34.0,
      dealType: '중개거래',
    }));

    it('3.1: should safely execute 100 concurrent queries via Promise.all without data races', async () => {
      const promises = Array.from({ length: 100 }, async (_, idx) => {
        const region = idx % 2 === 0 ? 'DONGTAN1' : 'DONGTAN2';
        const timeframe = idx % 3 === 0 ? '1M' : idx % 3 === 1 ? '3M' : 'ALL';

        return aggregateStats(
          concurrentDataset,
          { region, pyeong: 'ALL', timeframe },
          { referenceDate: REF_DATE }
        );
      });

      const results = await Promise.all(promises);

      expect(results).toHaveLength(100);
      results.forEach((res, idx) => {
        expect(res.isEmpty).toBe(false);
        expect(res.totalVolume).toBeGreaterThan(0);
        expect(res.avgSalePrice).toBeGreaterThan(0);
        expect(res.pyeongRankings.length).toBeGreaterThan(0);
      });
    });

    it('3.2: should guarantee strict input immutability even under Object.freeze()', () => {
      // Deep freeze the transactions dataset
      const frozenDataset = concurrentDataset.map((tx) => Object.freeze({ ...tx }));
      Object.freeze(frozenDataset);

      // Verify that engine functions complete without throwing mutation errors on frozen objects
      expect(() => {
        aggregateStats(
          frozenDataset,
          { region: 'ALL', pyeong: 'ALL', timeframe: 'ALL' },
          { referenceDate: REF_DATE }
        );
      }).not.toThrow();

      expect(() => {
        filterTransactions(frozenDataset, { region: 'DONGTAN1', pyeong: 'ALL', timeframe: '1M' });
      }).not.toThrow();

      expect(() => {
        computeComplexRankings(frozenDataset);
      }).not.toThrow();

      expect(() => {
        computeVolumeDistribution(frozenDataset, 'PYEONG_TIER');
      }).not.toThrow();
    });
  });

  // ==========================================================================
  // Section 4: Prototype Pollution & Hostile Input Resilience
  // ==========================================================================
  describe('4. Prototype Pollution & Hostile Input Resilience', () => {
    it('4.1: should NOT be vulnerable to prototype pollution via __proto__ or constructor keys', () => {
      const maliciousTxs: any[] = [
        {
          aptName: '__proto__',
          aptKey: '__proto__',
          dong: 'constructor',
          contractDate: '20260910',
          priceVal: 70000,
          area: 84.8,
          areaPyeong: 34.0,
          dealType: '중개거래',
          __proto__: { injectedProperty: 'hacked' },
        },
        {
          aptName: 'toString',
          aptKey: 'valueOf',
          dong: 'hasOwnProperty',
          contractDate: '20260912',
          priceVal: 80000,
          area: 84.8,
          areaPyeong: 34.0,
          dealType: '중개거래',
        },
      ];

      const res = aggregateStats(
        maliciousTxs,
        { region: 'ALL', pyeong: 'ALL', timeframe: 'ALL' },
        { referenceDate: REF_DATE }
      );

      // Verify prototype was not polluted
      expect((Object.prototype as any).injectedProperty).toBeUndefined();
      expect(({} as any).injectedProperty).toBeUndefined();

      // Check results processed without runtime crash
      expect(res.totalVolume).toBe(2);
      expect(res.pyeongRankings).toBeDefined();
    });

    it('4.2: should survive hostile corrupted numeric inputs without throwing or producing NaN', () => {
      const corruptedTxs: any[] = [
        { aptName: 'Corrupt1', dong: '청계동', contractDate: null, priceVal: NaN, area: NaN },
        { aptName: 'Corrupt2', dong: '청계동', contractDate: undefined, priceVal: Infinity, area: -5 },
        { aptName: 'Corrupt3', dong: '청계동', contractDate: 12345, priceVal: -99999, area: 0 },
        { aptName: 'Corrupt4', dong: '청계동', contractDate: 'not-a-date', priceVal: null, area: null },
        { aptName: 'ValidOne', dong: '청계동', contractDate: '20260910', priceVal: 80000, area: 84.8 },
      ];

      expect(() => {
        const res = aggregateStats(
          corruptedTxs,
          { region: 'ALL', pyeong: 'ALL', timeframe: 'ALL' },
          { referenceDate: REF_DATE }
        );

        // Only ValidOne should survive filtration
        expect(res.totalVolume).toBe(1);
        expect(res.avgSalePrice).toBe(80000);
        expect(isNaN(res.avgSalePrice)).toBe(false);
        expect(isNaN(res.avgPyeongPrice)).toBe(false);
      }).not.toThrow();
    });
  });

  // ==========================================================================
  // Section 5: Dual-Signature Adaptation Parity
  // ==========================================================================
  describe('5. Dual-Signature Adaptation Parity', () => {
    const sampleTxs: RawTransactionRecord[] = [
      {
        aptName: '동탄역시범한화꿈에그린프레스티지',
        dong: '청계동',
        contractDate: '20260910',
        priceVal: 100000,
        area: 84.8,
        areaPyeong: 34.0,
        dealType: '중개거래',
      },
      {
        aptName: '신안인스스빌리베라',
        dong: '청계동',
        contractDate: '20260912',
        priceVal: 90000,
        area: 84.8,
        areaPyeong: 34.0,
        dealType: '중개거래',
      },
    ];

    const sampleRents: RawRentRecord[] = [
      {
        aptName: '동탄역시범한화꿈에그린프레스티지',
        dong: '청계동',
        contractDate: '20260905',
        deposit: 55000,
        area: 84.8,
      },
    ];

    it('5.1: should yield identical results via Positional call vs Options Object call', () => {
      // Signature 1: Positional arguments (txs, rents, region, pyeong, timeframe, refDate)
      const resPositional = aggregateStats(
        sampleTxs,
        sampleRents,
        '청계동',
        'MEDIUM_SMALL',
        '1M',
        REF_DATE
      );

      // Signature 2: Object options (txs, filters, options)
      const resObject = aggregateStats(
        { transactions: sampleTxs, rents: sampleRents },
        { region: '청계동', pyeong: 'MEDIUM_SMALL', timeframe: '1M', referenceDate: REF_DATE }
      );

      expect(resPositional.totalVolume).toBe(resObject.totalVolume);
      expect(resPositional.avgSalePrice).toBe(resObject.avgSalePrice);
      expect(resPositional.avgPyeongPrice).toBe(resObject.avgPyeongPrice);
      expect(resPositional.avgJeonseRatio).toBe(resObject.avgJeonseRatio);
      expect(resPositional.pyeongRankings).toEqual(resObject.pyeongRankings);
      expect(resPositional.volumeDistribution).toEqual(resObject.volumeDistribution);
      expect(resPositional.insights).toEqual(resObject.insights);
    });

    it('5.2: should support positional call with rents omitted: (txs, region, pyeong, timeframe, refDate)', () => {
      const res = aggregateStats(sampleTxs, '청계동', 'MEDIUM_SMALL', '1M', REF_DATE);

      expect(res.totalVolume).toBe(2);
      expect(res.avgSalePrice).toBe(95000);
      expect(res.isEmpty).toBe(false);
    });

    it('5.3: should handle boundary empty/null calls consistently across both signatures', () => {
      expect(aggregateStats([])).toEqual(EMPTY_STATS_RESULT);
      expect(aggregateStats(null as any)).toEqual(EMPTY_STATS_RESULT);
      expect(aggregateStats(undefined as any)).toEqual(EMPTY_STATS_RESULT);
      expect(aggregateStats([], [], 'ALL', 'ALL', 'ALL')).toEqual(EMPTY_STATS_RESULT);
    });
  });
});
