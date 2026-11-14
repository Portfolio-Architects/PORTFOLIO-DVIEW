export const PENDING_CALC_STORAGE_KEY = 'dview_pending_calc_ctx';
export const PENDING_CALC_TTL_MS = 60_000;

export interface PendingCalculatorContextPayload {
  aptName?: string;
  canonicalSlug?: string;
  priceManwon?: number;
  annualIncomeManwon?: number;
  areaOver85?: boolean;
  alreadyTrackedOpen?: boolean;
  timestamp: number;
}

declare global {
  interface Window {
    __dviewPendingCalculatorContext?: PendingCalculatorContextPayload;
    __dviewDashboardCalcHostActive?: boolean;
  }
}

function normalizePositiveManwon(raw: unknown): number | undefined {
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw <= 0) return undefined;
  return Math.round(raw);
}

function sanitizePayload(raw: unknown): PendingCalculatorContextPayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Record<string, unknown>;
  if (typeof candidate.timestamp !== 'number' || !Number.isFinite(candidate.timestamp)) {
    return null;
  }
  const ageMs = Date.now() - candidate.timestamp;
  if (ageMs > PENDING_CALC_TTL_MS || ageMs < -5_000) {
    return null;
  }

  const aptName =
    typeof candidate.aptName === 'string' && candidate.aptName.trim()
      ? candidate.aptName.trim()
      : undefined;
  const canonicalSlug =
    typeof candidate.canonicalSlug === 'string' && candidate.canonicalSlug.trim()
      ? candidate.canonicalSlug.trim()
      : undefined;
  const priceManwon = normalizePositiveManwon(candidate.priceManwon);
  const annualIncomeManwon = normalizePositiveManwon(candidate.annualIncomeManwon);
  const areaOver85 =
    typeof candidate.areaOver85 === 'boolean' ? candidate.areaOver85 : undefined;
  const alreadyTrackedOpen =
    typeof candidate.alreadyTrackedOpen === 'boolean'
      ? candidate.alreadyTrackedOpen
      : undefined;

  return {
    aptName,
    canonicalSlug,
    priceManwon,
    annualIncomeManwon,
    areaOver85,
    alreadyTrackedOpen,
    timestamp: candidate.timestamp,
  };
}

export function clearPendingCalculatorContext(): void {
  if (typeof window === 'undefined') return;
  window.__dviewPendingCalculatorContext = undefined;
  try {
    window.sessionStorage?.removeItem(PENDING_CALC_STORAGE_KEY);
  } catch {
    // Ignore storage access errors in restricted/private environments
  }
}

export function persistPendingCalculatorContext(
  payload: Omit<PendingCalculatorContextPayload, 'timestamp'> & { timestamp?: number }
): PendingCalculatorContextPayload | null {
  if (typeof window === 'undefined') return null;
  const normalized: PendingCalculatorContextPayload = {
    aptName: payload.aptName?.trim() || undefined,
    canonicalSlug: payload.canonicalSlug?.trim() || undefined,
    priceManwon: normalizePositiveManwon(payload.priceManwon),
    annualIncomeManwon: normalizePositiveManwon(payload.annualIncomeManwon),
    areaOver85: typeof payload.areaOver85 === 'boolean' ? payload.areaOver85 : undefined,
    alreadyTrackedOpen:
      typeof payload.alreadyTrackedOpen === 'boolean'
        ? payload.alreadyTrackedOpen
        : undefined,
    timestamp:
      typeof payload.timestamp === 'number' && Number.isFinite(payload.timestamp)
        ? payload.timestamp
        : Date.now(),
  };

  window.__dviewPendingCalculatorContext = normalized;
  try {
    window.sessionStorage?.setItem(PENDING_CALC_STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // Ignore sessionStorage quota or private-browsing exceptions
  }
  return normalized;
}

export function consumePendingCalculatorContext(): PendingCalculatorContextPayload | null {
  if (typeof window === 'undefined') return null;

  let resolved = sanitizePayload(window.__dviewPendingCalculatorContext);
  if (!resolved) {
    try {
      const rawJson = window.sessionStorage?.getItem(PENDING_CALC_STORAGE_KEY);
      if (rawJson) {
        resolved = sanitizePayload(JSON.parse(rawJson));
      }
    } catch {
      resolved = null;
    }
  }

  clearPendingCalculatorContext();
  return resolved;
}

export function parseCalculatorQueryOverrides(sp: URLSearchParams): {
  priceManwon?: number;
  annualIncomeManwon?: number;
  areaOver85?: boolean;
} {
  let priceManwon: number | undefined;
  const rawPrice = sp.get('price');
  if (rawPrice !== null && rawPrice.trim() !== '') {
    const numPrice = Number(rawPrice);
    if (Number.isFinite(numPrice) && numPrice > 0) {
      priceManwon =
        numPrice >= 10_000_000 ? Math.round(numPrice / 10_000) : Math.round(numPrice);
    }
  }

  let annualIncomeManwon: number | undefined;
  const rawIncome = sp.get('income');
  if (rawIncome !== null && rawIncome.trim() !== '') {
    const numIncome = Number(rawIncome);
    if (Number.isFinite(numIncome) && numIncome > 0) {
      annualIncomeManwon =
        numIncome >= 1_000_000 ? Math.round(numIncome / 10_000) : Math.round(numIncome);
    }
  }

  let areaOver85: boolean | undefined;
  const rawOver85 = sp.get('over85')?.trim().toLowerCase();
  if (rawOver85 === 'true' || rawOver85 === '1') {
    areaOver85 = true;
  } else if (rawOver85 === 'false' || rawOver85 === '0') {
    areaOver85 = false;
  }

  return { priceManwon, annualIncomeManwon, areaOver85 };
}
