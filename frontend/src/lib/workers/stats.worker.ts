/**
 * @module stats.worker
 * @description Dedicated High-Performance Web Worker for Statistical Estimation and Mortgage Amortization Vectorization.
 * Operates on IEEE 754 Float32Array/Int32Array buffers with zero-copy Transferable Objects protocol.
 * All price calculations adhere to 10,000 KRW (만원) precision invariants to eliminate mantissa truncation up to 10B+ KRW.
 *
 * Epistemic Invariants:
 * 1. Precision Domain: Prices represented in 10,000 KRW units. 24-bit mantissa allows exact integer representation up to 16,777,216 (167.7B KRW).
 * 2. Singularity Defense: N <= 1 => isValid = false, s = 0.
 * 3. Sample Mean: mu = (1 / N) * sum_{i=0}^{N-1} x_i
 * 4. Bessel-corrected Sample Variance: s^2 = max(0, (1 / (N - 1)) * sum_{i=0}^{N-1} (x_i - mu)^2) (N >= 2)
 * 5. Bollinger Band: upper2SD = mu + 2*s, lower2SD = max(0, mu - 2*s)
 * 6. Closed-form Mortgage PMT: PMT = P * [r(1+r)^n] / [(1+r)^n - 1], with r <= 1e-7 guard yielding P / n.
 * 7. Zero-Copy Transfer: postMessage(response, [monthlyPayments.buffer, amortizationSchedule.buffer])
 */

export const RATE_EPSILON = 1e-7;
export const DEFAULT_LOAN_PERIOD_MONTHS = 360;
export const DEFAULT_ANNUAL_RATE_PERCENT = 4.2;
export const DEFAULT_LTV_RATIO = 1.0;

export type StatsWorkerActionType =
  | 'CALCULATE_STATS_AND_MORTGAGE'
  | 'CALCULATE_TWO_SIGMA'
  | 'CALCULATE_MORTGAGE_VECTOR'
  | 'PING';

export interface StatsWorkerRequestPayload {
  prices: Float32Array; // 만원(10,000 KRW) 단위 실거래가 배열
  timestamps?: Int32Array; // YYYYMMDD 정수 타임스탬프 배열
  annualRatePercent?: number; // 주담대 연이율 (%)
  loanPeriodMonths?: number; // 대출 기간 (개월)
  loanToValueRatio?: number; // LTV 비율 (기본값 1.0)
}

export interface StatsWorkerRequest {
  id: string;
  type?: StatsWorkerActionType;
  payload: StatsWorkerRequestPayload | any;
}

export interface TwoSigmaWorkerMetrics {
  isValid: boolean;
  count: number;
  mean: number;
  sd: number;
  upper2SD: number;
  lower2SD: number;
  min: number;
  max: number;
}

export interface StatsWorkerResponsePayload {
  stats: TwoSigmaWorkerMetrics;
  baseMortgagePmt: number; // 표본평균 기준 월 상환액 (만원)
  monthlyPayments: Float32Array; // 각 거래가별 월 상환액 벡터 (만원)
  amortizationSchedule: Float32Array; // n개월 잔여 원금 궤적 벡터 (만원)
}

export interface StatsWorkerResponse {
  id: string;
  type?: StatsWorkerActionType;
  success: boolean;
  error?: string;
  data?: any;
  payload: StatsWorkerResponsePayload | any;
}

/**
 * Calculates the closed-form monthly mortgage amortization factor k.
 * PMT = P * k
 *
 * @param annualRatePercent Annual interest rate in percent (e.g., 4.2)
 * @param loanPeriodMonths Total repayment period in months (e.g., 360)
 * @returns Amortization multiplier k
 */
export function calculatePmtFactor(
  annualRatePercent: number,
  loanPeriodMonths: number
): { k: number; monthlyRate: number } {
  const n = loanPeriodMonths > 0 ? loanPeriodMonths : DEFAULT_LOAN_PERIOD_MONTHS;
  const R = Number.isFinite(annualRatePercent) ? annualRatePercent : DEFAULT_ANNUAL_RATE_PERCENT;
  const r = (R / 100) / 12;

  if (r <= RATE_EPSILON) {
    return { k: 1 / n, monthlyRate: r };
  }

  const factor = Math.pow(1 + r, n);
  if (!Number.isFinite(factor) || factor === Infinity) {
    return { k: r, monthlyRate: r };
  }

  const k = (r * factor) / (factor - 1);
  return { k, monthlyRate: r };
}

/**
 * Computes remaining principal trajectory vector for n months.
 *
 * @param principal Initial base principal in 10,000 KRW
 * @param monthlyRate Monthly interest rate r
 * @param loanPeriodMonths Total months n
 * @param monthlyPayment Monthly payment PMT in 10,000 KRW
 * @returns Float32Array of length n containing remaining principal at end of each month
 */
export function calculateAmortizationTrajectory(
  principal: number,
  monthlyRate: number,
  loanPeriodMonths: number,
  monthlyPayment: number
): Float32Array {
  const n = loanPeriodMonths > 0 ? loanPeriodMonths : DEFAULT_LOAN_PERIOD_MONTHS;
  const schedule = new Float32Array(n);

  if (principal <= 0 || n <= 0) {
    return schedule;
  }

  if (monthlyRate <= RATE_EPSILON) {
    for (let t = 1; t <= n; t++) {
      if (t === n) {
        schedule[t - 1] = 0;
      } else {
        schedule[t - 1] = Math.max(0, principal * (1 - t / n));
      }
    }
    return schedule;
  }

  for (let t = 1; t <= n; t++) {
    if (t === n) {
      schedule[t - 1] = 0;
    } else {
      const factorT = Math.pow(1 + monthlyRate, t);
      const remainingBalance = principal * factorT - monthlyPayment * ((factorT - 1) / monthlyRate);
      schedule[t - 1] = Math.max(0, remainingBalance);
    }
  }

  return schedule;
}

/**
 * Pure mathematical computation engine executing closed-form statistics and mortgage vectorization.
 * Supports execution in Web Worker threads and Node.js/Jest unit tests.
 *
 * Complexity: O(N) time, O(N) space.
 * Side-effects: none.
 *
 * @param payload StatsWorkerRequestPayload containing Float32Array price buffer and loan parameters
 * @returns StatsWorkerResponsePayload containing two-sigma metrics, monthly payments vector, and amortization trajectory
 */
export function executeStatsWorkerCalculation(
  payload: StatsWorkerRequestPayload
): StatsWorkerResponsePayload {
  const prices = payload?.prices;
  const n = prices && typeof prices.length === 'number' ? prices.length : 0;

  const annualRate = typeof payload?.annualRatePercent === 'number'
    ? payload.annualRatePercent
    : DEFAULT_ANNUAL_RATE_PERCENT;

  const months = typeof payload?.loanPeriodMonths === 'number' && payload.loanPeriodMonths > 0
    ? payload.loanPeriodMonths
    : DEFAULT_LOAN_PERIOD_MONTHS;

  const ltv = typeof payload?.loanToValueRatio === 'number' && payload.loanToValueRatio > 0
    ? payload.loanToValueRatio
    : DEFAULT_LTV_RATIO;

  const { k, monthlyRate } = calculatePmtFactor(annualRate, months);

  // Singularity Defense 1: N = 0
  if (n === 0) {
    return {
      stats: {
        isValid: false,
        count: 0,
        mean: 0,
        sd: 0,
        upper2SD: 0,
        lower2SD: 0,
        min: 0,
        max: 0,
      },
      baseMortgagePmt: 0,
      monthlyPayments: new Float32Array(0),
      amortizationSchedule: new Float32Array(months),
    };
  }

  // Pass 1: Sum, Min, Max
  let sum = 0;
  let min = prices[0];
  let max = prices[0];

  for (let i = 0; i < n; i++) {
    const val = prices[i];
    sum += val;
    if (val < min) min = val;
    if (val > max) max = val;
  }

  const mean = sum / n;

  // Singularity Defense 2: N = 1 (Bessel degrees of freedom N - 1 = 0 cannot support variance)
  if (n === 1) {
    const singlePrice = prices[0];
    const principal = singlePrice * ltv;
    const basePmt = principal * k;

    const monthlyPayments = new Float32Array(1);
    monthlyPayments[0] = basePmt;

    const amortizationSchedule = calculateAmortizationTrajectory(principal, monthlyRate, months, basePmt);

    return {
      stats: {
        isValid: false,
        count: 1,
        mean,
        sd: 0,
        upper2SD: mean,
        lower2SD: Math.max(0, mean),
        min,
        max,
      },
      baseMortgagePmt: basePmt,
      monthlyPayments,
      amortizationSchedule,
    };
  }

  // Pass 2: Bessel-corrected sample variance
  let sumSquaredDiff = 0;
  for (let i = 0; i < n; i++) {
    const diff = prices[i] - mean;
    sumSquaredDiff += diff * diff;
  }

  const variance = Math.max(0, sumSquaredDiff / (n - 1));
  const sd = Math.sqrt(variance);
  const upper2SD = mean + 2 * sd;
  const lower2SD = Math.max(0, mean - 2 * sd);

  // Mortgage Vector Calculation: SIMD-pipelineable single loop
  const monthlyPayments = new Float32Array(n);
  const priceToPaymentMultiplier = ltv * k;
  for (let i = 0; i < n; i++) {
    monthlyPayments[i] = prices[i] * priceToPaymentMultiplier;
  }

  const basePrincipal = mean * ltv;
  const baseMortgagePmt = basePrincipal * k;
  const amortizationSchedule = calculateAmortizationTrajectory(
    basePrincipal,
    monthlyRate,
    months,
    baseMortgagePmt
  );

  return {
    stats: {
      isValid: true,
      count: n,
      mean,
      sd,
      upper2SD,
      lower2SD,
      min,
      max,
    },
    baseMortgagePmt,
    monthlyPayments,
    amortizationSchedule,
  };
}

/**
 * Message Event Router handling RPC requests and dispatching Transferable Objects.
 *
 * @param event MessageEvent containing StatsWorkerRequest
 * @param postMessageFn Destination transmitter function
 */
export function handleWorkerMessageEvent(
  event: MessageEvent<StatsWorkerRequest> | { data: StatsWorkerRequest },
  postMessageFn?: (response: StatsWorkerResponse, transfer?: Transferable[]) => void
): void {
  const req = event?.data;
  if (!req || typeof req !== 'object') return;

  const id = req.id || 'req_anonymous';
  const type: StatsWorkerActionType = req.type || 'CALCULATE_STATS_AND_MORTGAGE';

  const transmitter = postMessageFn || (
    typeof self !== 'undefined' && typeof (self as any).postMessage === 'function'
      ? (res: StatsWorkerResponse, transfer?: Transferable[]) => {
          if (transfer && transfer.length > 0) {
            (self as any).postMessage(res, transfer);
          } else {
            (self as any).postMessage(res);
          }
        }
      : undefined
  );

  if (!transmitter) return;

  try {
    if (type === 'PING') {
      transmitter({
        id,
        type: 'PING',
        success: true,
        data: 'PONG',
        payload: 'PONG',
      });
      return;
    }

    if (type === 'CALCULATE_TWO_SIGMA') {
      const rawValues = req.payload?.values ?? req.payload?.prices ?? req.payload;
      let pricesBuffer: Float32Array;

      if (rawValues instanceof Float32Array) {
        pricesBuffer = rawValues;
      } else if (Array.isArray(rawValues)) {
        const sanitized = rawValues.filter(
          (v): v is number => typeof v === 'number' && !Number.isNaN(v) && Number.isFinite(v) && v > 0
        );
        pricesBuffer = new Float32Array(sanitized);
      } else {
        pricesBuffer = new Float32Array(0);
      }

      const result = executeStatsWorkerCalculation({ prices: pricesBuffer });
      const twoSigmaData = {
        isValid: result.stats.isValid,
        count: result.stats.count,
        mean: result.stats.isValid ? result.stats.mean : null,
        sd: result.stats.isValid ? result.stats.sd : null,
        upper2SD: result.stats.isValid ? result.stats.upper2SD : null,
        lower2SD: result.stats.isValid ? result.stats.lower2SD : null,
      };

      transmitter({
        id,
        type: 'CALCULATE_TWO_SIGMA',
        success: true,
        data: twoSigmaData,
        payload: result,
      });
      return;
    }

    if (type === 'CALCULATE_MORTGAGE_VECTOR') {
      const principalWon = Number(req.payload?.principalWon ?? 0);
      const annualRate = Number(req.payload?.annualRatePercent ?? DEFAULT_ANNUAL_RATE_PERCENT);
      const loanYears = Number(req.payload?.loanPeriodYears ?? 30);
      const months = loanYears * 12;

      // Wrap single principal as 1-element buffer (or 10,000 KRW unit if necessary)
      const pricesBuffer = new Float32Array([principalWon]);
      const result = executeStatsWorkerCalculation({
        prices: pricesBuffer,
        annualRatePercent: annualRate,
        loanPeriodMonths: months,
        loanToValueRatio: 1.0,
      });

      const transferList: Transferable[] = [];
      if (result.monthlyPayments?.buffer) {
        transferList.push(result.monthlyPayments.buffer);
      }
      if (result.amortizationSchedule?.buffer) {
        transferList.push(result.amortizationSchedule.buffer);
      }

      transmitter(
        {
          id,
          type: 'CALCULATE_MORTGAGE_VECTOR',
          success: true,
          data: {
            monthlyPaymentWon: Math.round(result.baseMortgagePmt),
            monthlyScheduleWon: result.amortizationSchedule,
            totalPaymentWon: Math.round(result.baseMortgagePmt * months),
            totalInterestWon: Math.max(0, Math.round(result.baseMortgagePmt * months - principalWon)),
            loanPeriodMonths: months,
            monthlyRate: (annualRate / 100) / 12,
          },
          payload: result,
        },
        transferList
      );
      return;
    }

    // Default: 'CALCULATE_STATS_AND_MORTGAGE'
    const resultPayload = executeStatsWorkerCalculation(req.payload as StatsWorkerRequestPayload);

    const response: StatsWorkerResponse = {
      id,
      type: 'CALCULATE_STATS_AND_MORTGAGE',
      success: true,
      data: resultPayload,
      payload: resultPayload,
    };

    const transferList: Transferable[] = [];
    if (resultPayload.monthlyPayments?.buffer) {
      transferList.push(resultPayload.monthlyPayments.buffer);
    }
    if (resultPayload.amortizationSchedule?.buffer) {
      transferList.push(resultPayload.amortizationSchedule.buffer);
    }

    transmitter(response, transferList);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Worker internal execution error';
    const fallbackMonths = req.payload?.loanPeriodMonths || DEFAULT_LOAN_PERIOD_MONTHS;
    const errorResponse: StatsWorkerResponse = {
      id,
      type,
      success: false,
      error: errorMessage,
      data: null,
      payload: {
        stats: {
          isValid: false,
          count: 0,
          mean: 0,
          sd: 0,
          upper2SD: 0,
          lower2SD: 0,
          min: 0,
          max: 0,
        },
        baseMortgagePmt: 0,
        monthlyPayments: new Float32Array(0),
        amortizationSchedule: new Float32Array(fallbackMonths),
      },
    };
    transmitter(errorResponse);
  }
}

// Dedicated Web Worker Context Environment Detection & Auto-Binding
if (
  typeof self !== 'undefined' &&
  typeof (self as any).postMessage === 'function' &&
  (typeof window === 'undefined' || typeof (self as any).importScripts === 'function' || (self as any).constructor?.name === 'DedicatedWorkerGlobalScope')
) {
  self.addEventListener('message', (event: any) => {
    handleWorkerMessageEvent(event);
  });
}
