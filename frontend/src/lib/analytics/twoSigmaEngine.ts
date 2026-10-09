/**
 * @module twoSigmaEngine
 * @description Pure Functional Mathematical Statistics Engine for Two-Sigma Confidence Bands.
 * Computes sample mean, Bessel-corrected variance/standard deviation, and +/- 2SD intervals
 * with non-negative lower bound clamping and singularity defense (N < 2).
 *
 * Epistemic Invariants:
 * 1. Sanitization: S = { x in values | x != null & x != undefined & typeof x === 'number' & !isNaN(x) & isFinite(x) & x > 0 }
 * 2. Singularity Defense: N = |S| < 2 => { isValid: false, mean: null, sd: null, upper2SD: null, lower2SD: null }
 * 3. Sample Mean: mu = (1/N) * sum_{i=1}^N x_i
 * 4. Bessel-corrected Variance: s^2 = max(0, (1 / (N - 1)) * sum_{i=1}^N (x_i - mu)^2)
 * 5. Sample Standard Deviation: s = sqrt(s^2)
 * 6. Upper Bound: upper2SD = mu + 2*s
 * 7. Lower Bound: lower2SD = max(0, mu - 2*s)
 */

export interface TwoSigmaStats {
  isValid: boolean;
  mean: number | null;
  sd: number | null;
  upper2SD: number | null;
  lower2SD: number | null;
}

/**
 * Calculates two-sigma statistical parameters for an array of values.
 *
 * @param values Array containing numeric values, null, or undefined
 * @returns TwoSigmaStats containing validity flag and computed statistical metrics
 */
export function calculateTwoSigma(
  values: Array<number | null | undefined> | null | undefined
): TwoSigmaStats {
  if (!values || !Array.isArray(values)) {
    return {
      isValid: false,
      mean: null,
      sd: null,
      upper2SD: null,
      lower2SD: null,
    };
  }

  // Pass 0: Sanitization - isolate strictly positive finite numbers
  const sanitized: number[] = [];
  const len = values.length;
  for (let i = 0; i < len; i++) {
    const v = values[i];
    if (
      v !== null &&
      v !== undefined &&
      typeof v === 'number' &&
      !Number.isNaN(v) &&
      Number.isFinite(v) &&
      v > 0
    ) {
      sanitized.push(v);
    }
  }

  const n = sanitized.length;

  // Singularity defense: sample size N < 2 cannot support degrees of freedom (N - 1)
  if (n < 2) {
    return {
      isValid: false,
      mean: null,
      sd: null,
      upper2SD: null,
      lower2SD: null,
    };
  }

  // Pass 1: Compute sample mean mu
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += sanitized[i];
  }
  const mean = sum / n;

  // Pass 2: Compute Bessel-corrected sample variance s^2
  let sumSquaredDiff = 0;
  for (let i = 0; i < n; i++) {
    const diff = sanitized[i] - mean;
    sumSquaredDiff += diff * diff;
  }

  // Clamping to non-negative domain to counteract float cancellation
  const variance = Math.max(0, sumSquaredDiff / (n - 1));
  const sd = Math.sqrt(variance);

  const upper2SD = mean + 2 * sd;
  const lower2SD = Math.max(0, mean - 2 * sd);

  return {
    isValid: true,
    mean,
    sd,
    upper2SD,
    lower2SD,
  };
}
