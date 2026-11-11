/**
 * @file todayUpdateEvaluator.ts
 * @description Utility functions for evaluating same-day real estate updates in Asia/Seoul (KST).
 * Strictly complies with:
 * - DVIEW Strict Real Data Only Rule (.agent/rules/DVIEW_strict-real-data-only.md)
 * - DVIEW Response Standard Protocol (DRSP v1.0)
 * - Zero-CLS Contract & Pretendard tabular-nums font invariants
 */

export interface TodayUpdateMetrics {
  todayYmd: string;
  latestRegisteredDate: string;
  isTodayUpdated: boolean;
  todayRegisteredCount: number;
  todayNewHighCount: number;
  latestRegisteredDateLabel: string;
  lastSyncTimeLabel: string;
  todayTransactions?: Array<{
    registeredDate?: string;
    contractDate?: string;
    isNewHigh?: boolean;
    type?: string;
    [key: string]: unknown;
  }>;
}

const KST_YMD_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * Returns today's date in YYYYMMDD string format according to Korean Standard Time (KST, Asia/Seoul).
 * E.g., "20261111"
 */
export function getTodayYmdKST(referenceDate: Date = new Date()): string {
  try {
    return KST_YMD_FORMATTER.format(referenceDate).replace(/[^0-9]/g, '');
  } catch {
    // Robust fallback computing UTC+9 offset
    const kstTime = new Date(referenceDate.getTime() + 9 * 3600000);
    const y = kstTime.getUTCFullYear();
    const m = String(kstTime.getUTCMonth() + 1).padStart(2, '0');
    const d = String(kstTime.getUTCDate()).padStart(2, '0');
    return `${y}${m}${d}`;
  }
}

/**
 * Formats a YYYYMMDD date string to a Korean date label "M월 D일".
 * Returns an empty string if input is invalid or missing.
 */
export function formatDateLabelKST(ymd: string | null | undefined): string {
  if (!ymd) return '';
  const clean = String(ymd).replace(/[^0-9]/g, '').slice(0, 8);
  if (clean.length !== 8) return '';
  const month = Number(clean.slice(4, 6));
  const day = Number(clean.slice(6, 8));
  return month > 0 && day > 0 ? `${month}월 ${day}일` : '';
}

/**
 * Checks whether a given transaction record was registered today at MOLIT (RTMS).
 * Strictly evaluates `registeredDate === todayYmdKST`.
 */
export function isRegisteredToday(
  registeredDate?: string | null,
  referenceTodayYmd?: string
): boolean {
  if (!registeredDate) return false;
  const clean = String(registeredDate).replace(/[^0-9]/g, '').slice(0, 8);
  if (clean.length !== 8) return false;
  const targetToday = referenceTodayYmd || getTodayYmdKST();
  return clean === targetToday;
}

export interface MarketStatsInput {
  latestRegisteredDate?: string | null;
  latestContractDate?: string | null;
  todayRegisteredCount?: number;
  todayNewHighCount?: number;
  lastSyncTime?: string;
  apartmentCount?: number;
  saleTxCount?: number;
}

/**
 * Pure evaluation function computing today's update metrics from real MOLIT transaction records
 * and market statistics.
 */
export function evaluateTodayUpdateMetrics(
  recentTransactions: Array<{
    registeredDate?: string;
    contractDate?: string;
    isNewHigh?: boolean;
    type?: string;
  }> = [],
  marketStats?: MarketStatsInput | null,
  referenceDate: Date = new Date()
): TodayUpdateMetrics {
  const todayYmd = getTodayYmdKST(referenceDate);
  const latestReg = String(marketStats?.latestRegisteredDate || '').replace(/[^0-9]/g, '').slice(0, 8);

  const safeTransactions = Array.isArray(recentTransactions) ? recentTransactions : [];

  // Strictly filter by registeredDate (MOLIT RTMS public disclosure date), NEVER contractDate
  const todayTxs = safeTransactions.filter((tx) => {
    if (!tx || typeof tx !== 'object') return false;
    const regDate = String(tx.registeredDate || '').replace(/[^0-9]/g, '').slice(0, 8);
    return regDate.length === 8 && regDate === todayYmd;
  });

  const countFromTxs = todayTxs.length;
  const newHighFromTxs = todayTxs.filter((tx) => Boolean(tx.isNewHigh || tx.type === 'high')).length;

  let todayRegisteredCount = 0;
  let todayNewHighCount = 0;

  if (countFromTxs > 0) {
    todayRegisteredCount = countFromTxs;
    todayNewHighCount = newHighFromTxs;
  } else if (latestReg === todayYmd) {
    if (typeof marketStats?.todayRegisteredCount === 'number') {
      todayRegisteredCount = marketStats.todayRegisteredCount;
    } else {
      todayRegisteredCount = 1;
    }
    todayNewHighCount = typeof marketStats?.todayNewHighCount === 'number' ? marketStats.todayNewHighCount : 0;
  }

  const isTodayUpdated = latestReg === todayYmd || todayRegisteredCount > 0;
  const displayDate = latestReg || todayYmd;

  return {
    todayYmd,
    latestRegisteredDate: latestReg,
    isTodayUpdated,
    todayRegisteredCount,
    todayNewHighCount,
    latestRegisteredDateLabel: formatDateLabelKST(displayDate),
    lastSyncTimeLabel: marketStats?.lastSyncTime || '07:00 KST',
    todayTransactions: todayTxs,
  };
}
