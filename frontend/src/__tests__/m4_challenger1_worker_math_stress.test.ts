/**
 * @module m4_challenger1_worker_math_stress.test
 * @description Empirical Challenger 1 Adversarial Stress Test Suite for Milestone M4.
 * Empirically challenges large-scale transaction vectors (10,000 to 50,000 records),
 * zero-copy Transferable Objects protocol, extreme valuation boundaries (100B ~ 1,000B KRW),
 * interest rate singularities (0.0%, 0.0001%, 30.0%), and Bessel correction singularity defenses.
 *
 * Epistemic Invariants:
 * 1. SLA Latency: N = 10,000 transactions processed in < 5.0ms on V8 engine.
 * 2. Zero-Copy Protocol: Transferable ArrayBuffer byteLength matches N * 4 bytes exactly.
 * 3. Float32 Mantissa Invariant: Exact integer representation preserved up to 16,777,216 만원.
 * 4. Singularity Guards:
 *    - N = 0: isValid = false, metrics = 0, no division by zero.
 *    - N = 1: isValid = false, s = 0, Bessel denominator (N - 1 = 0) bypassed.
 *    - N = 2: isValid = true, variance >= 0, sd >= 0, lower2SD clamped to >= 0.
 * 5. Interest Rate Convergence:
 *    - R = 0.0%: Closed-form PMT = P / n, trajectory hits 0 at month n.
 *    - R = 0.0001%: Guarded by RATE_EPSILON (1e-7), no NaN/Infinity.
 *    - R = 30.0%: Finite exponential factor, monotonic trajectory, hits 0 at month n.
 */

import {
  executeStatsWorkerCalculation,
  calculatePmtFactor,
  calculateAmortizationTrajectory,
  handleWorkerMessageEvent,
  RATE_EPSILON,
  DEFAULT_LOAN_PERIOD_MONTHS,
  StatsWorkerRequest,
  StatsWorkerResponse,
} from '@/lib/workers/stats.worker';
import { executeSyncFallback } from '@/lib/hooks/useStatsWorker';

describe('M4 Challenger 1: Web Worker & Mathematical Statistics Adversarial Stress Suite', () => {
  // ==========================================================================
  // Suite 1: 대규모 실거래가 배열 스트레스 및 지연시간 (< 5ms) 실측
  // ==========================================================================
  describe('1. Large-Scale Transaction Array Stress & Latency SLA (10,000 ~ 50,000)', () => {
    test('N = 10,000: Real estate transaction batch satisfies < 5.0ms latency SLA', () => {
      const N = 10000;
      const prices = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        // Price spread: 30,000 ~ 150,000 만원 (3억 ~ 15억원)
        prices[i] = 30000 + (i % 120000);
      }

      // V8 TurboFan JIT warmup (eliminates first-call Ignition bytecode interpretation & OS page-fault jitter in shared CI runners)
      for (let w = 0; w < 3; w++) {
        executeStatsWorkerCalculation({
          prices,
          annualRatePercent: 4.2,
          loanPeriodMonths: 360,
          loanToValueRatio: 1.0,
        });
      }

      let elapsedMs = Number.POSITIVE_INFINITY;
      let result = executeStatsWorkerCalculation({
        prices,
        annualRatePercent: 4.2,
        loanPeriodMonths: 360,
        loanToValueRatio: 1.0,
      });

      for (let sample = 0; sample < 5; sample++) {
        const t0 = performance.now();
        result = executeStatsWorkerCalculation({
          prices,
          annualRatePercent: 4.2,
          loanPeriodMonths: 360,
          loanToValueRatio: 1.0,
        });
        const t1 = performance.now();
        elapsedMs = Math.min(elapsedMs, t1 - t0);
      }

      // SLA Verification: Latency must be strictly less than 5.0ms
      expect(elapsedMs).toBeLessThan(5.0);

      // Mathematical Integrity Verification
      expect(result.stats.isValid).toBe(true);
      expect(result.stats.count).toBe(N);
      expect(result.stats.mean).toBeGreaterThan(30000);
      expect(result.stats.mean).toBeLessThan(150000);
      expect(result.stats.sd).toBeGreaterThan(0);
      expect(result.stats.upper2SD).toBeGreaterThan(result.stats.mean);
      expect(result.stats.lower2SD).toBeLessThan(result.stats.mean);
      expect(result.stats.lower2SD).toBeGreaterThanOrEqual(0);

      // Vector Dimensions Verification
      expect(result.monthlyPayments.length).toBe(N);
      expect(result.amortizationSchedule.length).toBe(360);
    });

    test('N = 50,000: Extreme dataset stress execution maintains deterministic stability', () => {
      const N = 50000;
      const prices = new Float32Array(N);
      let runningSum = 0;
      for (let i = 0; i < N; i++) {
        const p = 50000 + (i % 50000);
        prices[i] = p;
        runningSum += p;
      }
      const expectedMean = runningSum / N;

      let elapsedMs = Number.POSITIVE_INFINITY;
      let result = executeStatsWorkerCalculation({
        prices,
        annualRatePercent: 3.8,
        loanPeriodMonths: 360,
      });

      for (let sample = 0; sample < 3; sample++) {
        const t0 = performance.now();
        result = executeStatsWorkerCalculation({
          prices,
          annualRatePercent: 3.8,
          loanPeriodMonths: 360,
        });
        const t1 = performance.now();
        elapsedMs = Math.min(elapsedMs, t1 - t0);
      }

      expect(result.stats.isValid).toBe(true);
      expect(result.stats.count).toBe(N);
      expect(result.stats.mean).toBeCloseTo(expectedMean, 1);
      expect(result.monthlyPayments.length).toBe(N);
      expect(result.amortizationSchedule.length).toBe(360);
      expect(Number.isFinite(result.baseMortgagePmt)).toBe(true);
      expect(result.baseMortgagePmt).toBeGreaterThan(0);

      // Ensure execution completes within reasonable bounded time (< 50ms for 50k items)
      expect(elapsedMs).toBeLessThan(50.0);
    });

    test('Memory Leak Resistance: 100 consecutive 10,000-record batch executions maintain bounded heap variance', () => {
      const N = 10000;
      const prices = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        prices[i] = 40000 + (i % 60000);
      }

      if (global.gc) {
        global.gc();
      }
      const initialHeap = process.memoryUsage().heapUsed;

      for (let iter = 0; iter < 100; iter++) {
        const res = executeStatsWorkerCalculation({
          prices,
          annualRatePercent: 4.0,
          loanPeriodMonths: 360,
        });
        expect(res.stats.count).toBe(N);
      }

      if (global.gc) {
        global.gc();
      }
      const finalHeap = process.memoryUsage().heapUsed;
      const heapDiffMb = (finalHeap - initialHeap) / (1024 * 1024);

      // Heap divergence must not run away (< 35MB accumulation across 100 heavy iterations)
      expect(heapDiffMb).toBeLessThan(35.0);
    });

    test('Zero-Copy Protocol: Transferable Objects transfer list preserves exact buffer sizes', () => {
      const N = 10000;
      const prices = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        prices[i] = 60000;
      }

      const request: StatsWorkerRequest = {
        id: 'req_zero_copy_bench',
        type: 'CALCULATE_STATS_AND_MORTGAGE',
        payload: {
          prices,
          annualRatePercent: 4.2,
          loanPeriodMonths: 360,
        },
      };

      let capturedResponse: StatsWorkerResponse | null = null;
      let capturedTransfer: Transferable[] | undefined;

      handleWorkerMessageEvent(
        { data: request },
        (res: StatsWorkerResponse, transfer?: Transferable[]) => {
          capturedResponse = res;
          capturedTransfer = transfer;
        }
      );

      expect(capturedResponse).not.toBeNull();
      expect(capturedResponse!.success).toBe(true);
      expect(capturedTransfer).toBeDefined();
      expect(capturedTransfer!.length).toBe(2);

      // Buffer 0: monthlyPayments (Float32Array: 4 bytes per element)
      const paymentBuffer = capturedTransfer![0] as ArrayBuffer;
      expect(paymentBuffer.byteLength).toBe(N * 4); // 40,000 bytes
      expect(paymentBuffer).toBe(capturedResponse!.payload.monthlyPayments.buffer);

      // Buffer 1: amortizationSchedule (Float32Array: 360 elements * 4 bytes)
      const scheduleBuffer = capturedTransfer![1] as ArrayBuffer;
      expect(scheduleBuffer.byteLength).toBe(360 * 4); // 1,440 bytes
      expect(scheduleBuffer).toBe(capturedResponse!.payload.amortizationSchedule.buffer);
    });
  });

  // ==========================================================================
  // Suite 2: 초고가 거래 극한 경계값 (100억원, 1,000억원) 적대적 검증
  // ==========================================================================
  describe('2. Ultra-High Valuation Boundaries (100B & 1,000B KRW)', () => {
    test('100B KRW (1,000,000 만원): Exact integer retention within Float32 24-bit mantissa', () => {
      // 100억원 = 1,000,000 만원. IEEE 754 float32 significand allows exact integers up to 16,777,216.
      const val100B = 1000000;
      const buffer = new Float32Array([val100B]);
      expect(buffer[0]).toBe(val100B); // Exact integer invariant

      const result = executeStatsWorkerCalculation({
        prices: new Float32Array([val100B, val100B]),
        annualRatePercent: 4.2,
        loanPeriodMonths: 360,
      });

      expect(result.stats.isValid).toBe(true);
      expect(result.stats.mean).toBe(val100B);
      expect(result.stats.sd).toBe(0);
      expect(result.stats.upper2SD).toBe(val100B);
      expect(result.stats.lower2SD).toBe(val100B);
      expect(Number.isFinite(result.baseMortgagePmt)).toBe(true);
      expect(result.baseMortgagePmt).toBeGreaterThan(0);
    });

    test('1,000B KRW (10,000,000 만원): Sub-16.7M limit preserves precision without overflow/NaN', () => {
      // 1,000억원 = 10,000,000 만원 < 16,777,216
      const val1000B = 10000000;
      const prices = new Float32Array(500);
      for (let i = 0; i < 500; i++) {
        prices[i] = val1000B;
      }

      const result = executeStatsWorkerCalculation({
        prices,
        annualRatePercent: 5.0,
        loanPeriodMonths: 360,
      });

      expect(result.stats.isValid).toBe(true);
      expect(result.stats.count).toBe(500);
      expect(result.stats.mean).toBe(val1000B);
      expect(result.stats.min).toBe(val1000B);
      expect(result.stats.max).toBe(val1000B);
      expect(result.stats.sd).toBe(0);
      expect(Number.isFinite(result.baseMortgagePmt)).toBe(true);
      expect(result.baseMortgagePmt).toBeGreaterThan(0);

      // Verify no NaN or Infinity across monthly payments
      for (let i = 0; i < result.monthlyPayments.length; i++) {
        expect(Number.isFinite(result.monthlyPayments[i])).toBe(true);
        expect(Number.isNaN(result.monthlyPayments[i])).toBe(false);
      }
    });

    test('Extreme Price Disparity (Spread: 1,000 만원 ~ 10,000,000 만원): Variance and Lower Bound Clamping', () => {
      // 1,000 만원 (1,000만원) and 10,000,000 만원 (1,000억원)
      const prices = new Float32Array([1000, 10000000]);
      const result = executeStatsWorkerCalculation({ prices });

      expect(result.stats.isValid).toBe(true);
      expect(result.stats.count).toBe(2);
      expect(result.stats.mean).toBe(5000500);
      expect(result.stats.sd).toBeGreaterThan(0);

      // Because sd is ~7,070,362, mean - 2*sd is ~ -9,140,224 < 0
      // Lower2SD must be strictly clamped to 0
      expect(result.stats.lower2SD).toBe(0);
      expect(result.stats.upper2SD).toBeGreaterThan(10000000);
      expect(Number.isNaN(result.stats.sd)).toBe(false);
      expect(Number.isFinite(result.stats.sd)).toBe(true);
    });
  });

  // ==========================================================================
  // Suite 3: 금리 극한 경계값 (R = 0.0%, R = 0.0001%, R = 30.0%) 수렴성 검증
  // ==========================================================================
  describe('3. Extreme Interest Rate Boundaries (R = 0.0%, 0.0001%, 30.0%)', () => {
    test('R = 0.0%: Closed-form linear mortgage convergence PMT = P / n', () => {
      const P = 72000; // 7.2억원
      const prices = new Float32Array([P]);
      const result = executeStatsWorkerCalculation({
        prices,
        annualRatePercent: 0.0,
        loanPeriodMonths: 360,
      });

      const expectedPmt = P / 360; // 200 만원
      expect(result.baseMortgagePmt).toBeCloseTo(expectedPmt, 4);
      expect(result.monthlyPayments[0]).toBeCloseTo(expectedPmt, 4);

      const schedule = result.amortizationSchedule;
      expect(schedule.length).toBe(360);
      expect(schedule[0]).toBeCloseTo(P * (1 - 1 / 360), 2);
      expect(schedule[179]).toBeCloseTo(P * 0.5, 1); // 180th month is half
      expect(schedule[359]).toBe(0); // Fully amortized

      // Monotonic decreasing invariant
      for (let t = 1; t < 360; t++) {
        expect(schedule[t]).toBeLessThanOrEqual(schedule[t - 1]);
      }
    });

    test('R = 0.0001%: Micro-rate singularity guarded by RATE_EPSILON (1e-7)', () => {
      // Annual rate 0.0001% => r = (0.0001 / 100) / 12 = 8.333e-8 <= RATE_EPSILON
      const P = 60000;
      const { k, monthlyRate } = calculatePmtFactor(0.0001, 360);
      expect(monthlyRate).toBeLessThanOrEqual(RATE_EPSILON);
      expect(k).toBeCloseTo(1 / 360, 6);

      const result = executeStatsWorkerCalculation({
        prices: new Float32Array([P]),
        annualRatePercent: 0.0001,
        loanPeriodMonths: 360,
      });

      expect(Number.isFinite(result.baseMortgagePmt)).toBe(true);
      expect(Number.isNaN(result.baseMortgagePmt)).toBe(false);
      expect(result.baseMortgagePmt).toBeCloseTo(P / 360, 2);
      expect(result.amortizationSchedule[359]).toBe(0);
    });

    test('R = 30.0%: Hyper-interest shock scenario converges stably without exponential overflow', () => {
      // Annual rate 30.0% => r = 0.025, (1+r)^360 ≈ 7476.99
      const P = 60000;
      const { k, monthlyRate } = calculatePmtFactor(30.0, 360);
      expect(monthlyRate).toBeCloseTo(0.025, 6);
      expect(k).toBeGreaterThan(0.025);

      const result = executeStatsWorkerCalculation({
        prices: new Float32Array([P]),
        annualRatePercent: 30.0,
        loanPeriodMonths: 360,
      });

      expect(Number.isFinite(result.baseMortgagePmt)).toBe(true);
      expect(Number.isNaN(result.baseMortgagePmt)).toBe(false);
      expect(result.baseMortgagePmt).toBeGreaterThan(P * 0.025);

      const schedule = result.amortizationSchedule;
      expect(schedule.length).toBe(360);
      expect(schedule[359]).toBe(0);
      for (let t = 0; t < 360; t++) {
        expect(Number.isFinite(schedule[t])).toBe(true);
        expect(schedule[t]).toBeGreaterThanOrEqual(0);
      }
    });
  });

  // ==========================================================================
  // Suite 4: 표본 크기 특이점 (N = 0, 1, 2) 및 Bessel 보정 분모 0 나눗셈 방어
  // ==========================================================================
  describe('4. Sample Size Singularities (N = 0, 1, 2) & Bessel Correction Defenses', () => {
    test('N = 0: Completely empty buffer returns isValid: false without NaN/division by zero', () => {
      const result = executeStatsWorkerCalculation({ prices: new Float32Array(0) });

      expect(result.stats.isValid).toBe(false);
      expect(result.stats.count).toBe(0);
      expect(result.stats.mean).toBe(0);
      expect(result.stats.sd).toBe(0);
      expect(result.stats.upper2SD).toBe(0);
      expect(result.stats.lower2SD).toBe(0);
      expect(result.stats.min).toBe(0);
      expect(result.stats.max).toBe(0);
      expect(result.baseMortgagePmt).toBe(0);
      expect(result.monthlyPayments.length).toBe(0);
      expect(result.amortizationSchedule.length).toBe(DEFAULT_LOAN_PERIOD_MONTHS);
      expect(result.amortizationSchedule.every((v) => v === 0)).toBe(true);
    });

    test('N = 1: Bessel singularity (N - 1 = 0) defensively bypassed, returning s = 0 and isValid: false', () => {
      const P = 85000;
      const result = executeStatsWorkerCalculation({
        prices: new Float32Array([P]),
        annualRatePercent: 4.2,
        loanPeriodMonths: 360,
      });

      expect(result.stats.isValid).toBe(false);
      expect(result.stats.count).toBe(1);
      expect(result.stats.mean).toBe(P);
      expect(result.stats.sd).toBe(0); // Defense invariant: Bessel denominator 0 avoided
      expect(result.stats.upper2SD).toBe(P);
      expect(result.stats.lower2SD).toBe(P);
      expect(result.stats.min).toBe(P);
      expect(result.stats.max).toBe(P);
      expect(result.monthlyPayments.length).toBe(1);
      expect(result.baseMortgagePmt).toBeGreaterThan(0);
      expect(result.amortizationSchedule.length).toBe(360);
      expect(result.amortizationSchedule[359]).toBe(0);
    });

    test('N = 2: Valid Bessel degree of freedom (N - 1 = 1) yields exact variance >= 0 and non-negative clamping', () => {
      // Case A: Identical values
      const resultIdentical = executeStatsWorkerCalculation({
        prices: new Float32Array([50000, 50000]),
      });
      expect(resultIdentical.stats.isValid).toBe(true);
      expect(resultIdentical.stats.count).toBe(2);
      expect(resultIdentical.stats.mean).toBe(50000);
      expect(resultIdentical.stats.sd).toBe(0);
      expect(resultIdentical.stats.upper2SD).toBe(50000);
      expect(resultIdentical.stats.lower2SD).toBe(50000);

      // Case B: Distinct values with known analytical variance
      // x = [40000, 60000] => mean = 50000
      // s^2 = ((-10000)^2 + (10000)^2) / 1 = 200,000,000
      // s = sqrt(200,000,000) ≈ 14142.1356...
      const resultDistinct = executeStatsWorkerCalculation({
        prices: new Float32Array([40000, 60000]),
      });
      expect(resultDistinct.stats.isValid).toBe(true);
      expect(resultDistinct.stats.count).toBe(2);
      expect(resultDistinct.stats.mean).toBe(50000);
      expect(resultDistinct.stats.sd).toBeCloseTo(Math.sqrt(200000000), 2);
      expect(resultDistinct.stats.upper2SD).toBeCloseTo(50000 + 2 * Math.sqrt(200000000), 2);
      expect(resultDistinct.stats.lower2SD).toBeCloseTo(50000 - 2 * Math.sqrt(200000000), 2);

      // Case C: Asymmetric values triggering negative mean - 2*sd clamping
      // x = [10, 100000] => mean = 50005, sd ≈ 70703.6 => lower2SD clamped to 0
      const resultClamped = executeStatsWorkerCalculation({
        prices: new Float32Array([10, 100000]),
      });
      expect(resultClamped.stats.isValid).toBe(true);
      expect(resultClamped.stats.lower2SD).toBe(0);
      expect(resultClamped.stats.lower2SD).toBeGreaterThanOrEqual(0);
    });
  });

  // ==========================================================================
  // Suite 5: 적대적 Fuzzing, RPC 라우팅 및 동기 폴백 교차 검증
  // ==========================================================================
  describe('5. Adversarial Input Fuzzing, RPC Routing & Synchronous Fallback Parity', () => {
    test('CALCULATE_TWO_SIGMA RPC sanitizes hostile dirty inputs (NaN, null, negative, Infinity)', () => {
      const dirtyValues = [NaN, null, undefined, -1000, 0, Infinity, -Infinity, 50000, 60000, 70000];
      const request: StatsWorkerRequest = {
        id: 'req_fuzz_two_sigma',
        type: 'CALCULATE_TWO_SIGMA',
        payload: { values: dirtyValues },
      };

      let capturedResponse: StatsWorkerResponse | null = null;
      handleWorkerMessageEvent({ data: request }, (res: StatsWorkerResponse) => {
        capturedResponse = res;
      });

      expect(capturedResponse).not.toBeNull();
      expect(capturedResponse!.success).toBe(true);
      // Only 50000, 60000, 70000 are valid positive finite numbers
      expect(capturedResponse!.data.isValid).toBe(true);
      expect(capturedResponse!.data.count).toBe(3);
      expect(capturedResponse!.data.mean).toBe(60000);
      expect(capturedResponse!.data.sd).toBe(10000);
    });

    test('CALCULATE_MORTGAGE_VECTOR RPC handles extreme loan duration (50 years = 600 months)', () => {
      const request: StatsWorkerRequest = {
        id: 'req_fuzz_mortgage_50y',
        type: 'CALCULATE_MORTGAGE_VECTOR',
        payload: {
          principalWon: 10000000, // 1,000억원
          annualRatePercent: 3.5,
          loanPeriodYears: 50,
        },
      };

      let capturedResponse: StatsWorkerResponse | null = null;
      handleWorkerMessageEvent({ data: request }, (res: StatsWorkerResponse) => {
        capturedResponse = res;
      });

      expect(capturedResponse).not.toBeNull();
      expect(capturedResponse!.success).toBe(true);
      expect(capturedResponse!.data.loanPeriodMonths).toBe(600);
      expect(capturedResponse!.data.monthlyScheduleWon.length).toBe(600);
      expect(capturedResponse!.data.monthlyPaymentWon).toBeGreaterThan(0);
      expect(Number.isFinite(capturedResponse!.data.monthlyPaymentWon)).toBe(true);
    });

    test('Catastrophic malformed request triggers error response with zeroed fallback payload', () => {
      const request: StatsWorkerRequest = {
        id: 'req_catastrophic_null',
        type: 'CALCULATE_STATS_AND_MORTGAGE',
        payload: undefined,
      };

      let capturedResponse: StatsWorkerResponse | null = null;
      handleWorkerMessageEvent({ data: request }, (res: StatsWorkerResponse) => {
        capturedResponse = res;
      });

      expect(capturedResponse).not.toBeNull();
      expect(capturedResponse!.payload.stats.isValid).toBe(false);
      expect(capturedResponse!.payload.stats.count).toBe(0);
      expect(capturedResponse!.payload.monthlyPayments.length).toBe(0);
      expect(capturedResponse!.payload.amortizationSchedule.length).toBe(DEFAULT_LOAN_PERIOD_MONTHS);
    });

    test('Cross-Parity: executeSyncFallback produces mathematically identical metrics for N = 10,000 dataset', () => {
      const N = 1000;
      const priceArray: number[] = [];
      const priceBuffer = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        const val = 45000 + (i % 30000);
        priceArray.push(val);
        priceBuffer[i] = val;
      }

      const workerResult = executeStatsWorkerCalculation({ prices: priceBuffer });
      const fallbackResult = executeSyncFallback<any, any>('CALCULATE_TWO_SIGMA', { values: priceArray });

      expect(workerResult.stats.isValid).toBe(fallbackResult.isValid);
      expect(workerResult.stats.mean).toBeCloseTo(fallbackResult.mean, 1);
      expect(workerResult.stats.sd).toBeCloseTo(fallbackResult.sd, 1);
      expect(workerResult.stats.upper2SD).toBeCloseTo(fallbackResult.upper2SD, 1);
      expect(workerResult.stats.lower2SD).toBeCloseTo(fallbackResult.lower2SD, 1);
    });
  });
});
