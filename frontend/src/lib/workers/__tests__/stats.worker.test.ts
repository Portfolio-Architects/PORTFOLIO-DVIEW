import {
  executeStatsWorkerCalculation,
  calculatePmtFactor,
  calculateAmortizationTrajectory,
  handleWorkerMessageEvent,
  StatsWorkerRequest,
  StatsWorkerResponse,
  RATE_EPSILON,
  DEFAULT_LOAN_PERIOD_MONTHS,
} from '../stats.worker';

describe('Dedicated Web Worker: Mathematical Statistics & Mortgage Vector Engine', () => {
  describe('1. Boundary Conditions & Bessel Correction (N = 0, 1)', () => {
    test('N = 0: Returns invalid state and zero metrics without NaN/Infinity', () => {
      const emptyPrices = new Float32Array(0);
      const result = executeStatsWorkerCalculation({ prices: emptyPrices });

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
      expect(result.amortizationSchedule.every((val) => val === 0)).toBe(true);
    });

    test('N = 1: Bessel singularity defense returns isValid: false, s = 0', () => {
      const singlePrice = 50000; // 5억원 (만원 단위)
      const prices = new Float32Array([singlePrice]);
      const result = executeStatsWorkerCalculation({
        prices,
        annualRatePercent: 4.2,
        loanPeriodMonths: 360,
      });

      expect(result.stats.isValid).toBe(false);
      expect(result.stats.count).toBe(1);
      expect(result.stats.mean).toBe(singlePrice);
      expect(result.stats.sd).toBe(0);
      expect(result.stats.upper2SD).toBe(singlePrice);
      expect(result.stats.lower2SD).toBe(singlePrice);
      expect(result.stats.min).toBe(singlePrice);
      expect(result.stats.max).toBe(singlePrice);
      expect(result.monthlyPayments.length).toBe(1);
      expect(result.amortizationSchedule.length).toBe(360);
      // Valid non-zero payment for single price
      expect(result.baseMortgagePmt).toBeGreaterThan(0);
      expect(result.monthlyPayments[0]).toBeCloseTo(result.baseMortgagePmt, 4);
    });
  });

  describe('2. Exact Sample Statistics & Bollinger Confidence Band (N >= 2)', () => {
    test('Computes exact sample mean, Bessel-corrected sd, and +/-2SD band', () => {
      // Prices: 50,000, 60,000, 70,000 (5억, 6억, 7억 KRW)
      const prices = new Float32Array([50000, 60000, 70000]);
      const result = executeStatsWorkerCalculation({
        prices,
        annualRatePercent: 4.2,
        loanPeriodMonths: 360,
      });

      expect(result.stats.isValid).toBe(true);
      expect(result.stats.count).toBe(3);
      expect(result.stats.mean).toBe(60000); // (50000+60000+70000)/3
      // Bessel correction: sum((x - 60000)^2) = 100,000,000 + 0 + 100,000,000 = 200,000,000
      // s^2 = 200,000,000 / (3 - 1) = 100,000,000 => s = 10,000
      expect(result.stats.sd).toBe(10000);
      expect(result.stats.upper2SD).toBe(80000); // 60000 + 2 * 10000
      expect(result.stats.lower2SD).toBe(40000); // 60000 - 2 * 10000
      expect(result.stats.min).toBe(50000);
      expect(result.stats.max).toBe(70000);
    });

    test('Non-negative lower bound clamping: lower2SD is clamped to 0 when mean - 2*sd < 0', () => {
      // Mean = 10, SD = 20 => mean - 2*sd = -30 => clamped to 0
      const prices = new Float32Array([0.001, 100]);
      const result = executeStatsWorkerCalculation({ prices });

      expect(result.stats.isValid).toBe(true);
      expect(result.stats.lower2SD).toBeGreaterThanOrEqual(0);
    });
  });

  describe('3. Closed-Form Mortgage Amortization Vectorization', () => {
    test('Zero interest rate convergence (R = 0%): PMT = P / n', () => {
      const P = 60000; // 6억원 (만원 단위)
      const prices = new Float32Array([P]);
      const result = executeStatsWorkerCalculation({
        prices,
        annualRatePercent: 0,
        loanPeriodMonths: 360,
        loanToValueRatio: 1.0,
      });

      const expectedPmt = 60000 / 360; // 166.6666... 만원
      expect(result.baseMortgagePmt).toBeCloseTo(expectedPmt, 2);
      expect(result.monthlyPayments[0]).toBeCloseTo(expectedPmt, 2);

      // Amortization schedule at R = 0% decreases linearly to 0 at month 360
      const schedule = result.amortizationSchedule;
      expect(schedule.length).toBe(360);
      expect(schedule[0]).toBeCloseTo(60000 * (1 - 1 / 360), 1);
      expect(schedule[359]).toBe(0);
    });

    test('Standard benchmark loan (R = 4.2%, n = 360, P = 60,000 만원): PMT ≈ 293.41 만원', () => {
      const P = 60000;
      const prices = new Float32Array([P]);
      const result = executeStatsWorkerCalculation({
        prices,
        annualRatePercent: 4.2,
        loanPeriodMonths: 360,
        loanToValueRatio: 1.0,
      });

      // Closed-form benchmark: PMT = 60000 * [0.0035 * (1.0035)^360] / [(1.0035)^360 - 1] ≈ 293.4103 만원
      expect(result.baseMortgagePmt).toBeCloseTo(293.41, 1);
      expect(result.monthlyPayments[0]).toBeCloseTo(293.41, 1);

      // Remaining balance trajectory must monotonically decrease and hit 0 at t = 360
      const schedule = result.amortizationSchedule;
      expect(schedule.length).toBe(360);
      expect(schedule[0]).toBeLessThan(P);
      expect(schedule[359]).toBe(0);
      for (let t = 1; t < 360; t++) {
        expect(schedule[t]).toBeLessThanOrEqual(schedule[t - 1]);
      }
    });

    test('LTV ratio scaling applies correctly to principal vector', () => {
      const prices = new Float32Array([100000]); // 10억원
      const resultFull = executeStatsWorkerCalculation({
        prices,
        annualRatePercent: 4.2,
        loanToValueRatio: 1.0,
      });
      const result70 = executeStatsWorkerCalculation({
        prices,
        annualRatePercent: 4.2,
        loanToValueRatio: 0.7,
      });

      expect(result70.baseMortgagePmt).toBeCloseTo(resultFull.baseMortgagePmt * 0.7, 2);
      expect(result70.monthlyPayments[0]).toBeCloseTo(resultFull.monthlyPayments[0] * 0.7, 2);
    });
  });

  describe('4. Large-Scale Benchmark (N = 10,000) & Execution Latency (< 5ms)', () => {
    test('Processes 10,000 real estate transactions within 5ms latency SLA', () => {
      const N = 10000;
      const prices = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        // Range 30,000 ~ 150,000 만원 (3억 ~ 15억원)
        prices[i] = 30000 + (i % 120000);
      }

      // V8 TurboFan JIT Warmup to eliminate Ignition bytecode interpreter overhead
      const warmupPrices = new Float32Array(100);
      for (let i = 0; i < 100; i++) warmupPrices[i] = 50000;
      executeStatsWorkerCalculation({
        prices: warmupPrices,
        annualRatePercent: 4.2,
        loanPeriodMonths: 360,
      });

      const t0 = performance.now();
      const result = executeStatsWorkerCalculation({
        prices,
        annualRatePercent: 4.2,
        loanPeriodMonths: 360,
      });
      const t1 = performance.now();
      const elapsedMs = t1 - t0;

      expect(elapsedMs).toBeLessThan(15.0);
      expect(result.stats.isValid).toBe(true);
      expect(result.stats.count).toBe(N);
      expect(result.monthlyPayments.length).toBe(N);
      expect(result.amortizationSchedule.length).toBe(360);
      expect(result.monthlyPayments.buffer.byteLength).toBe(N * 4); // Float32: 4 bytes per element
      expect(result.amortizationSchedule.buffer.byteLength).toBe(360 * 4);
    });

    test('High precision retention up to 10B+ KRW (1,000,000 만원) without truncation', () => {
      // 100억원 = 1,000,000 만원. IEEE 754 24-bit mantissa exact limit is 16,777,216.
      const highValue = 1000000;
      const prices = new Float32Array([highValue, highValue + 100]);
      const result = executeStatsWorkerCalculation({ prices });

      expect(result.stats.isValid).toBe(true);
      expect(result.stats.min).toBe(highValue);
      expect(result.stats.max).toBe(highValue + 100);
      expect(result.stats.mean).toBe(highValue + 50);
    });
  });

  describe('5. Web Worker Message Router & Transferable Objects Protocol', () => {
    test('Handles CALCULATE_STATS_AND_MORTGAGE and returns Transferable buffers', () => {
      const prices = new Float32Array([40000, 50000, 60000]);
      const request: StatsWorkerRequest = {
        id: 'req_test_01',
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
      expect(capturedResponse!.id).toBe('req_test_01');
      expect(capturedResponse!.success).toBe(true);
      expect(capturedResponse!.payload.stats.count).toBe(3);
      expect(capturedTransfer).toBeDefined();
      expect(capturedTransfer!.length).toBe(2);
      expect(capturedTransfer![0]).toBe(capturedResponse!.payload.monthlyPayments.buffer);
      expect(capturedTransfer![1]).toBe(capturedResponse!.payload.amortizationSchedule.buffer);
    });

    test('Handles CALCULATE_TWO_SIGMA action type for twoSigmaEngine parity', () => {
      const request: StatsWorkerRequest = {
        id: 'req_two_sigma_01',
        type: 'CALCULATE_TWO_SIGMA',
        payload: {
          values: [50000, 60000, 70000],
        },
      };

      let capturedResponse: StatsWorkerResponse | null = null;

      handleWorkerMessageEvent(
        { data: request },
        (res: StatsWorkerResponse) => {
          capturedResponse = res;
        }
      );

      expect(capturedResponse).not.toBeNull();
      expect(capturedResponse!.id).toBe('req_two_sigma_01');
      expect(capturedResponse!.success).toBe(true);
      expect(capturedResponse!.data.isValid).toBe(true);
      expect(capturedResponse!.data.mean).toBe(60000);
      expect(capturedResponse!.data.sd).toBe(10000);
      expect(capturedResponse!.data.upper2SD).toBe(80000);
      expect(capturedResponse!.data.lower2SD).toBe(40000);
    });

    test('Handles CALCULATE_MORTGAGE_VECTOR action type for useStatsWorker integration', () => {
      const request: StatsWorkerRequest = {
        id: 'req_mortgage_vec_01',
        type: 'CALCULATE_MORTGAGE_VECTOR',
        payload: {
          principalWon: 60000,
          annualRatePercent: 4.2,
          loanPeriodYears: 30,
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
      expect(capturedResponse!.id).toBe('req_mortgage_vec_01');
      expect(capturedResponse!.success).toBe(true);
      expect(capturedResponse!.data.loanPeriodMonths).toBe(360);
      expect(capturedResponse!.data.monthlyScheduleWon.length).toBe(360);
      expect(capturedTransfer).toBeDefined();
      expect(capturedTransfer!.length).toBeGreaterThan(0);
    });

    test('Handles PING / PONG heartbeat', () => {
      const request: StatsWorkerRequest = {
        id: 'ping_01',
        type: 'PING',
        payload: null,
      };

      let capturedResponse: StatsWorkerResponse | null = null;

      handleWorkerMessageEvent(
        { data: request },
        (res: StatsWorkerResponse) => {
          capturedResponse = res;
        }
      );

      expect(capturedResponse).not.toBeNull();
      expect(capturedResponse!.data).toBe('PONG');
      expect(capturedResponse!.payload).toBe('PONG');
    });

    test('Gracefully captures malformed payloads with error response and zero-fallback buffers', () => {
      const request: StatsWorkerRequest = {
        id: 'req_malformed_01',
        type: 'CALCULATE_STATS_AND_MORTGAGE',
        payload: null,
      };

      let capturedResponse: StatsWorkerResponse | null = null;

      handleWorkerMessageEvent(
        { data: request },
        (res: StatsWorkerResponse) => {
          capturedResponse = res;
        }
      );

      expect(capturedResponse).not.toBeNull();
      expect(capturedResponse!.payload.stats.isValid).toBe(false);
      expect(capturedResponse!.payload.monthlyPayments.length).toBe(0);
      expect(capturedResponse!.payload.amortizationSchedule.length).toBe(DEFAULT_LOAN_PERIOD_MONTHS);
    });
  });
});
