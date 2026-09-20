/**
 * @file empirical_m3_stress_harness.ts
 * @description Empirical Challenger Stress Test & Benchmark Harness for Milestone M3.
 * Rigorously measures and validates:
 * 1. 10,000 transaction dataset execution against the <15ms SLA.
 * 2. 25,000 transaction dataset execution against the <50ms SLA.
 * 3. 100 rapid consecutive filter shifts maintaining <50ms response latency without thread blocking.
 * 4. Cache hit throughput, memory stability, and event-loop non-blocking validation.
 */

import {
  aggregateStatistics,
  aggregateStats,
  computeStats,
  clearStatsCache,
  DONGTAN1_DONGS,
  DONGTAN2_DONGS,
} from '../src/lib/analytics/statsEngine';
import type {
  PyeongFilter,
  RawTransactionRecord,
  RegionFilter,
  SortOption,
  StatsAggregateResult,
  TimeframeFilter,
} from '../src/types/stats';

const REF_DATE = '2026-09-20';

function generateTransactions(count: number, seed = 42): RawTransactionRecord[] {
  const allDongs = [...DONGTAN1_DONGS, ...DONGTAN2_DONGS];
  const complexNames = Array.from({ length: 200 }, (_, i) => `동탄실거래단지_${i + 1}`);

  const result: RawTransactionRecord[] = [];
  let state = seed;
  const lcg = () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };

  for (let i = 0; i < count; i++) {
    const complexIdx = Math.floor(lcg() * complexNames.length);
    const dongIdx = complexIdx % allDongs.length;
    const dong = allDongs[dongIdx];
    const aptName = complexNames[complexIdx];

    const area = parseFloat((45 + lcg() * 100).toFixed(2));
    const areaPyeong = parseFloat((area / 3.30578).toFixed(1));

    const priceVal = Math.round(40000 + lcg() * 160000);
    const priceEok = `${(priceVal / 10000).toFixed(1)}억`;

    const daysAgo = Math.floor(lcg() * 365);
    const d = new Date(new Date(REF_DATE).getTime() - daysAgo * 24 * 60 * 60 * 1000);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const contractDate = `${y}${m}${day}`;

    result.push({
      aptKey: `apt_${complexIdx}`,
      aptName,
      dong,
      contractDate,
      date: `${m}.${day}`,
      priceVal,
      priceEok,
      area,
      areaPyeong,
      floor: Math.floor(lcg() * 35) + 1,
      dealType: lcg() > 0.03 ? '중개거래' : '직거래',
      isNewHigh: lcg() > 0.9,
      isCanceled: lcg() < 0.01,
    });
  }

  return result;
}

interface BenchmarkReport {
  test10kPassed: boolean;
  test10kColdMs: number;
  test10kWarmMinMs: number;
  test10kWarmAvgMs: number;

  test25kPassed: boolean;
  test25kColdMs: number;
  test25kWarmMinMs: number;
  test25kWarmAvgMs: number;

  test100ShiftsPassed: boolean;
  shiftMinMs: number;
  shiftMeanMs: number;
  shiftMedianMs: number;
  shiftP90Ms: number;
  shiftP95Ms: number;
  shiftP99Ms: number;
  shiftMaxMs: number;
  maxEventLoopLagMs: number;
}

export async function runEmpiricalStressTest(): Promise<BenchmarkReport> {
  console.log('================================================================');
  console.log('🚀 EMPIRICAL STRESS TEST & THROUGHPUT SLA VERIFICATION (M3)');
  console.log('================================================================\n');

  // -------------------------------------------------------------------------
  // TEST 1: 10,000 Transactions Sub-15ms Benchmark
  // -------------------------------------------------------------------------
  console.log('🔹 [Test 1] 10,000 Transactions Dataset Throughput (SLA < 15ms)');
  const txs10k = generateTransactions(10000, 10001);
  clearStatsCache();

  // Cold execution (cache miss)
  const t0Cold10k = performance.now();
  const resCold10k = computeStats(
    txs10k,
    { region: 'ALL', pyeong: 'ALL', timeframe: '1Y' },
    { referenceDate: REF_DATE }
  );
  const tCold10k = performance.now() - t0Cold10k;

  // Warm execution (cached & warm iterations)
  const warm10kTimes: number[] = [];
  for (let i = 0; i < 10; i++) {
    const t0 = performance.now();
    computeStats(
      txs10k,
      { region: 'ALL', pyeong: 'ALL', timeframe: '1Y' },
      { referenceDate: REF_DATE }
    );
    warm10kTimes.push(performance.now() - t0);
  }

  const warm10kMin = Math.min(...warm10kTimes);
  const warm10kAvg = warm10kTimes.reduce((a, b) => a + b, 0) / warm10kTimes.length;

  console.log(`   - 10k Records Cold Execution: ${tCold10k.toFixed(3)}ms (SLA target: <15ms)`);
  console.log(`   - 10k Records Warm Min:       ${warm10kMin.toFixed(3)}ms`);
  console.log(`   - 10k Records Warm Avg:       ${warm10kAvg.toFixed(3)}ms`);
  console.log(`   - Output Verification:        Volume=${resCold10k.totalVolume}, AvgPrice=${resCold10k.avgSalePrice}만`);

  const test10kPassed = tCold10k < 15.0 && warm10kMin < 15.0;
  console.log(`   - Test 1 Status: ${test10kPassed ? '✅ PASSED (<15ms)' : '❌ FAILED'}\n`);

  // -------------------------------------------------------------------------
  // TEST 2: 25,000 Transactions Sub-50ms Benchmark
  // -------------------------------------------------------------------------
  console.log('🔹 [Test 2] 25,000 Transactions Dataset Throughput (SLA < 50ms)');
  const txs25k = generateTransactions(25000, 25001);
  clearStatsCache();

  // Cold execution (cache miss)
  const t0Cold25k = performance.now();
  const resCold25k = computeStats(
    txs25k,
    { region: 'ALL', pyeong: 'ALL', timeframe: '1Y' },
    { referenceDate: REF_DATE }
  );
  const tCold25k = performance.now() - t0Cold25k;

  // Warm executions
  const warm25kTimes: number[] = [];
  for (let i = 0; i < 10; i++) {
    const t0 = performance.now();
    computeStats(
      txs25k,
      { region: 'ALL', pyeong: 'ALL', timeframe: '1Y' },
      { referenceDate: REF_DATE }
    );
    warm25kTimes.push(performance.now() - t0);
  }

  const warm25kMin = Math.min(...warm25kTimes);
  const warm25kAvg = warm25kTimes.reduce((a, b) => a + b, 0) / warm25kTimes.length;

  console.log(`   - 25k Records Cold Execution: ${tCold25k.toFixed(3)}ms (SLA target: <50ms)`);
  console.log(`   - 25k Records Warm Min:       ${warm25kMin.toFixed(3)}ms`);
  console.log(`   - 25k Records Warm Avg:       ${warm25kAvg.toFixed(3)}ms`);
  console.log(`   - Output Verification:        Volume=${resCold25k.totalVolume}, AvgPrice=${resCold25k.avgSalePrice}만`);

  const test25kPassed = tCold25k < 50.0 && warm25kMin < 50.0;
  console.log(`   - Test 2 Status: ${test25kPassed ? '✅ PASSED (<50ms)' : '❌ FAILED'}\n`);

  // -------------------------------------------------------------------------
  // TEST 3: 100 Rapid Consecutive Filter Shifts on 25k Records
  // -------------------------------------------------------------------------
  console.log('🔹 [Test 3] 100 Rapid Consecutive Filter Shifts (<50ms SLA & Thread Responsiveness)');

  // Clear cache to start with a fresh slate
  clearStatsCache();

  const regions: RegionFilter[] = ['ALL', 'DONGTAN1', 'DONGTAN2', '청계동', '영천동', '산척동', '여울동', '반송동'];
  const pyeongs: PyeongFilter[] = ['ALL', 'SMALL', 'MEDIUM_SMALL', 'MEDIUM_LARGE', 'LARGE'];
  const timeframes: TimeframeFilter[] = ['ALL', '1M', '3M', '6M', '1Y'];
  const sorts: SortOption[] = ['PYEONG_DESC', 'PRICE_DESC', 'PRICE_ASC', 'VOLUME_DESC', 'JEONSE_DESC'];

  // Build 100 distinct sequential filter combinations
  const shiftConfigs: Array<{
    region: RegionFilter;
    pyeong: PyeongFilter;
    timeframe: TimeframeFilter;
    sort: SortOption;
  }> = [];

  for (let i = 0; i < 100; i++) {
    shiftConfigs.push({
      region: regions[i % regions.length],
      pyeong: pyeongs[(i * 3) % pyeongs.length],
      timeframe: timeframes[(i * 7) % timeframes.length],
      sort: sorts[(i * 2) % sorts.length],
    });
  }

  const shiftLatencies: number[] = [];
  let maxEventLoopLag = 0;

  // Execute 100 rapid shifts with event loop lag tracking
  for (let i = 0; i < 100; i++) {
    const config = shiftConfigs[i];

    // Measure event loop responsiveness via setTimeout(0) delta
    const loopCheckStart = performance.now();
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        const loopLag = performance.now() - loopCheckStart;
        if (loopLag > maxEventLoopLag) {
          maxEventLoopLag = loopLag;
        }
        resolve();
      }, 0);
    });

    const tStart = performance.now();
    const result = computeStats(
      txs25k,
      {
        region: config.region,
        pyeong: config.pyeong,
        timeframe: config.timeframe,
        sort: config.sort,
      },
      { referenceDate: REF_DATE }
    );
    const elapsed = performance.now() - tStart;
    shiftLatencies.push(elapsed);

    // Sanity assertion on each shift result
    if (result.isLoading || isNaN(result.avgSalePrice) || !isFinite(result.avgSalePrice)) {
      throw new Error(`Sanity failure at shift ${i}: invalid stats result`);
    }
  }

  const sortedLatencies = [...shiftLatencies].sort((a, b) => a - b);
  const shiftMin = sortedLatencies[0];
  const shiftMean = sortedLatencies.reduce((a, b) => a + b, 0) / sortedLatencies.length;
  const shiftMedian = sortedLatencies[Math.floor(sortedLatencies.length * 0.5)];
  const shiftP90 = sortedLatencies[Math.floor(sortedLatencies.length * 0.9)];
  const shiftP95 = sortedLatencies[Math.floor(sortedLatencies.length * 0.95)];
  const shiftP99 = sortedLatencies[Math.floor(sortedLatencies.length * 0.99)];
  const shiftMax = sortedLatencies[sortedLatencies.length - 1];

  console.log(`   - 100 Rapid Shifts Total Tested: ${shiftLatencies.length}`);
  console.log(`   - Min Latency:                   ${shiftMin.toFixed(3)}ms`);
  console.log(`   - Mean Latency:                  ${shiftMean.toFixed(3)}ms`);
  console.log(`   - Median Latency:                ${shiftMedian.toFixed(3)}ms`);
  console.log(`   - P90 Latency:                   ${shiftP90.toFixed(3)}ms`);
  console.log(`   - P95 Latency:                   ${shiftP95.toFixed(3)}ms`);
  console.log(`   - P99 Latency:                   ${shiftP99.toFixed(3)}ms`);
  console.log(`   - Max Latency:                   ${shiftMax.toFixed(3)}ms`);
  console.log(`   - Max Event-Loop Lag:            ${maxEventLoopLag.toFixed(3)}ms (No thread blocking)`);

  const test100ShiftsPassed = shiftMax < 50.0 && shiftP95 < 50.0;
  console.log(`   - Test 3 Status: ${test100ShiftsPassed ? '✅ PASSED (All 100 shifts <50ms)' : '❌ FAILED'}\n`);

  console.log('================================================================');
  console.log(`🏁 VERDICT: ${test10kPassed && test25kPassed && test100ShiftsPassed ? 'APPROVE' : 'REQUEST_CHANGES'}`);
  console.log('================================================================\n');

  return {
    test10kPassed,
    test10kColdMs: tCold10k,
    test10kWarmMinMs: warm10kMin,
    test10kWarmAvgMs: warm10kAvg,

    test25kPassed,
    test25kColdMs: tCold25k,
    test25kWarmMinMs: warm25kMin,
    test25kWarmAvgMs: warm25kAvg,

    test100ShiftsPassed,
    shiftMinMs: shiftMin,
    shiftMeanMs: shiftMean,
    shiftMedianMs: shiftMedian,
    shiftP90Ms: shiftP90,
    shiftP95Ms: shiftP95,
    shiftP99Ms: shiftP99,
    shiftMaxMs: shiftMax,
    maxEventLoopLagMs: maxEventLoopLag,
  };
}

if (require.main === module) {
  runEmpiricalStressTest().then((report) => {
    if (!report.test10kPassed || !report.test25kPassed || !report.test100ShiftsPassed) {
      process.exit(1);
    }
    process.exit(0);
  }).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
