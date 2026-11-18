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
    registeredTime?: string;
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

const KST_HM_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Seoul',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/**
 * Extracts a normalized 24-hour "HH:mm" KST time string (e.g., "06:33") from
 * "06:33", "06:33 KST", or a valid ISO-8601 timestamp. Returns null when absent or invalid.
 */
export function extractSyncTimeHm(syncTime?: string | null): string | null {
  if (!syncTime || typeof syncTime !== 'string') return null;
  const trimmed = syncTime.trim();
  if (!trimmed) return null;

  const directHm = trimmed.match(/^([01]\d|2[0-3]):([0-5]\d)(?:\s*KST)?$/i);
  if (directHm) {
    return `${directHm[1]}:${directHm[2]}`;
  }

  if (trimmed.includes('T') || /^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      try {
        const formatted = KST_HM_FORMATTER.format(parsed);
        const m = formatted.match(/^(\d{2}):(\d{2})$/);
        if (m) {
          const hh = m[1] === '24' ? '00' : m[1];
          return `${hh}:${m[2]}`;
        }
      } catch {
        const kst = new Date(parsed.getTime() + 9 * 3600000);
        return `${String(kst.getUTCHours()).padStart(2, '0')}:${String(kst.getUTCMinutes()).padStart(2, '0')}`;
      }
    }
  }

  return null;
}

/**
 * Formats a sync time input into "HH:mm KST", or returns an empty string when unknown
 * (never fabricating a placeholder time).
 */
export function formatSyncTimeLabelKST(syncTime?: string | null): string {
  const hm = extractSyncTimeHm(syncTime);
  return hm ? `${hm} KST` : '';
}

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
    registeredTime?: string;
    contractDate?: string;
    isNewHigh?: boolean;
    type?: string;
    dealType?: string;
  }> = [],
  marketStats?: MarketStatsInput | null,
  referenceDate: Date = new Date()
): TodayUpdateMetrics {
  const todayYmd = getTodayYmdKST(referenceDate);
  const latestReg = String(marketStats?.latestRegisteredDate || '').replace(/[^0-9]/g, '').slice(0, 8);

  const safeTransactions = Array.isArray(recentTransactions) ? recentTransactions : [];

  // Strictly filter sale records by registeredDate (MOLIT RTMS public disclosure date), NEVER contractDate
  const todayTxs = safeTransactions.filter((tx) => {
    if (!tx || typeof tx !== 'object') return false;
    if (tx.dealType === '전세' || tx.dealType === '월세') return false;
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

  const txLatestHm =
    todayTxs
      .map((tx) => extractSyncTimeHm(tx.registeredTime))
      .filter((v): v is string => Boolean(v))
      .sort()
      .pop() || null;
  const statsHm =
    !isTodayUpdated || !latestReg || latestReg === todayYmd
      ? extractSyncTimeHm(marketStats?.lastSyncTime)
      : null;
  const resolvedHm =
    [txLatestHm, statsHm]
      .filter((v): v is string => Boolean(v))
      .sort()
      .pop() || null;

  return {
    todayYmd,
    latestRegisteredDate: latestReg,
    isTodayUpdated,
    todayRegisteredCount,
    todayNewHighCount,
    latestRegisteredDateLabel: formatDateLabelKST(displayDate),
    lastSyncTimeLabel: resolvedHm ? `${resolvedHm} KST` : '',
    todayTransactions: todayTxs,
  };
}
