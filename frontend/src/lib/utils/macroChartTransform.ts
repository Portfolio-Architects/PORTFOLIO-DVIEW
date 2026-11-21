import type {
  ChartGranularity,
  CompactMacroTrendTuple,
  DongtanMacroTrendPoint,
  MacroTrendSeriesPayload,
} from "@/types/transaction";

export interface FormattedMacroPoint extends Record<string, unknown> {
  name: string;
  "동탄 아파트 전체": number | null;
  "동탄 아파트 전세 평균": number | null;
  saleCount?: number;
  rentCount?: number;
}

/**
 * Process macro trend line data to filter zero/null values for jeonse average
 * so line charts do not dip to zero.
 */
export function processMacroTrendData(
  lineData?: Array<{
    name?: string;
    "동탄 아파트 전체"?: number | null;
    "동탄 아파트 전세 평균"?: number | null;
    saleCount?: number | null;
    rentCount?: number | null;
    [key: string]: unknown;
  }> | null
): FormattedMacroPoint[] {
  if (!lineData || !Array.isArray(lineData)) return [];
  return lineData.map((d) => {
    const {
      saleCount: rawSaleCount,
      rentCount: rawRentCount,
      ...rest
    } = d;
    const rawJeonse = d["동탄 아파트 전세 평균"];
    const jeonseVal = (typeof rawJeonse === "number" && rawJeonse > 0) ? rawJeonse : null;
    const rawSale = d["동탄 아파트 전체"];
    const saleVal = (typeof rawSale === "number" && rawSale > 0) ? rawSale : null;

    const point: FormattedMacroPoint = {
      ...rest,
      name: d.name || "",
      "동탄 아파트 전체": saleVal,
      "동탄 아파트 전세 평균": jeonseVal,
    };

    if (typeof rawSaleCount === "number" && Number.isFinite(rawSaleCount) && rawSaleCount >= 0) {
      point.saleCount = Math.round(rawSaleCount);
    }
    if (typeof rawRentCount === "number" && Number.isFinite(rawRentCount) && rawRentCount >= 0) {
      point.rentCount = Math.round(rawRentCount);
    }

    return point;
  });
}

const KOREAN_WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

/**
 * Format X-axis tick from YY.MM / YYYY.MM -> YY년 MM월, or YY.MM.DD -> YY.MM.DD
 */
export function formatXAxisTick(value: string, granularity?: ChartGranularity): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    const ymdMatch = trimmed.match(/^(\d{2}|\d{4})\.(\d{2})\.(\d{2})$/);
    if (ymdMatch) {
      const yy = ymdMatch[1].slice(-2);
      const mm = ymdMatch[2];
      const dd = ymdMatch[3];
      return `${yy}.${mm}.${dd}`;
    }
    const ymMatch = trimmed.match(/^(\d{2}|\d{4})\.(\d{2})$/);
    if (ymMatch) {
      const yy = ymMatch[1].slice(-2);
      const mm = ymMatch[2];
      return `${yy}년 ${mm}월`;
    }
    void granularity;
  }
  return value || "";
}

/**
 * Format human-readable period label for chart tooltips across daily, weekly, and monthly granularities
 */
export function formatTooltipPeriodLabel(value: string, granularity: ChartGranularity = "monthly"): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();

  const ymdMatch = trimmed.match(/^(\d{2}|\d{4})\.(\d{2})\.(\d{2})$/);
  if (ymdMatch) {
    const rawY = parseInt(ymdMatch[1], 10);
    const fullY = ymdMatch[1].length === 4 ? rawY : (rawY < 50 ? 2000 : 1900) + rawY;
    const yy = String(fullY).slice(-2);
    const mm = ymdMatch[2];
    const dd = ymdMatch[3];
    const dt = new Date(Date.UTC(fullY, parseInt(mm, 10) - 1, parseInt(dd, 10)));

    if (granularity === "weekly" && !isNaN(dt.getTime())) {
      const endDt = new Date(dt.getTime() + 6 * 24 * 60 * 60 * 1000);
      const endYy = String(endDt.getUTCFullYear()).slice(-2);
      const endMm = String(endDt.getUTCMonth() + 1).padStart(2, "0");
      const endDd = String(endDt.getUTCDate()).padStart(2, "0");
      const endLabel = endYy !== yy ? `${endYy}.${endMm}.${endDd}` : `${endMm}.${endDd}`;
      return `${yy}.${mm}.${dd} ~ ${endLabel} (주간)`;
    }

    const weekday = !isNaN(dt.getTime()) ? ` (${KOREAN_WEEKDAYS[dt.getUTCDay()]})` : "";
    return `${yy}년 ${mm}월 ${dd}일${weekday}`;
  }

  return formatXAxisTick(trimmed, granularity);
}

/**
 * Calculate gap price and jeonse ratio between sale and rent prices
 */
export function calculateMacroGapAndRatio(salePrice: number, rentPrice: number) {
  let ratio = 0;
  if (salePrice > 0 && rentPrice > 0) {
    ratio = (rentPrice / salePrice) * 100;
  }
  const gapPrice = salePrice > 0 && rentPrice > 0 ? salePrice - rentPrice : 0;
  const gapPriceStr = gapPrice > 0 ? `${gapPrice.toFixed(1)}억` : null;

  return {
    ratio: Math.round(ratio * 10) / 10,
    gapPrice,
    gapPriceStr,
  };
}

export interface ApartmentTxRecordLike {
  contractYm?: string | number | null;
  contractDay?: string | number | null;
  contractDate?: string | number | null;
  date?: string | number | null;
  dealType?: string | null;
  price?: number | string | null;
  deposit?: number | string | null;
  monthlyRent?: number | string | null;
  cancelDate?: string | number | null;
}

/**
 * Robust Year-Month extraction supporting:
 * - Delimited: '2024.1', '2024-01', '2024/1/15', '24.1', '24.01'
 * - Pure digits: '202401', '20240115', '2401', 202401
 */
export function extractYearMonth(raw: unknown): { ymNum: number; monthKey: string } | null {
  if (raw == null) return null;
  const str = String(raw).trim();
  if (!str) return null;

  // Case 1: delimited by non-digits (e.g. '2024.1', '2024-01', '2024/1/15', '24.1', '24.01')
  const parts = str.split(/\D+/).filter(Boolean);
  if (parts.length >= 2) {
    let y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(y) || isNaN(m) || m < 1 || m > 12) return null;
    if (parts[0].length === 2 || y < 100) {
      y = (y < 50 ? 2000 : 1900) + y;
    }
    if (y < 1900 || y > 2100) return null;
    const yyStr = String(y).slice(-2).padStart(2, '0');
    const mmStr = String(m).padStart(2, '0');
    return {
      ymNum: y * 100 + m,
      monthKey: `${yyStr}.${mmStr}`,
    };
  }

  // Case 2: pure digits (e.g. '202401', '20240115', '2401', 202401)
  const digits = str.replace(/\D/g, '');
  if (digits.length === 4) {
    const rawY = parseInt(digits.slice(0, 2), 10);
    const m = parseInt(digits.slice(2, 4), 10);
    if (isNaN(rawY) || isNaN(m) || m < 1 || m > 12) return null;
    const y = (rawY < 50 ? 2000 : 1900) + rawY;
    const yyStr = String(y).slice(-2).padStart(2, '0');
    const mmStr = String(m).padStart(2, '0');
    return {
      ymNum: y * 100 + m,
      monthKey: `${yyStr}.${mmStr}`,
    };
  } else if (digits.length >= 6) {
    const y = parseInt(digits.slice(0, 4), 10);
    const m = parseInt(digits.slice(4, 6), 10);
    if (isNaN(y) || isNaN(m) || m < 1 || m > 12 || y < 1900 || y > 2100) return null;
    const yyStr = String(y).slice(-2).padStart(2, '0');
    const mmStr = String(m).padStart(2, '0');
    return {
      ymNum: y * 100 + m,
      monthKey: `${yyStr}.${mmStr}`,
    };
  }

  return null;
}

export interface MacroPointLike {
  name: string;
  '동탄 아파트 전체'?: number | null;
  '동탄 아파트 전세 평균'?: number | null;
}

export type ChartTimeframe = '3M' | '6M' | '1Y' | '3Y' | '5Y' | 'ALL';

/**
 * Resolve optimal aggregation granularity automatically from a single timeframe selection:
 * - 3M / 6M / 1Y (1년까지) -> weekly (주차별 집계)
 * - 3Y / 5Y / ALL (3년부터) -> monthly (월별 집계)
 */
export function resolveGranularityForTimeframe(timeframe: ChartTimeframe): ChartGranularity {
  if (timeframe === '3M' || timeframe === '6M' || timeframe === '1Y') return 'weekly';
  return 'monthly';
}

/**
 * Filter chart data points based on timeframe duration.
 * Slices from the end of valid data. For 'ALL', preserves full complex history.
 */
export function filterChartTimeframe<T extends { name: string }>(
  data: T[] | null | undefined,
  timeframe: ChartTimeframe
): T[] {
  if (!data || !Array.isArray(data) || data.length === 0) return [];
  if (timeframe === 'ALL') return data;

  let count = data.length;
  switch (timeframe) {
    case '3M': count = 3; break;
    case '6M': count = 6; break;
    case '1Y': count = 12; break;
    case '3Y': count = 36; break;
    case '5Y': count = 60; break;
    default: count = data.length; break;
  }

  return data.slice(-Math.min(count, data.length));
}

const parseNumericValue = (val: unknown): number => {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.includes('억')) {
      const parts = trimmed.split('억');
      const eok = Number(parts[0].replace(/,/g, '').trim()) || 0;
      const man = parts[1] ? Number(parts[1].replace(/,/g, '').replace(/만(원)?/, '').trim()) || 0 : 0;
      return eok * 10000 + man;
    }
    const cleaned = trimmed.replace(/,/g, '');
    const num = Number(cleaned);
    return isNaN(num) ? 0 : num;
  }
  return 0;
};

const toEok = (val: number): number => {
  if (val <= 0 || isNaN(val)) return 0;
  // Values >= 10,000,000 are in Korean Won (e.g. 500,000,000 KRW = 5억), whereas values in Man-won (e.g. 50,000 = 5억)
  return val >= 10000000 ? val / 100000000 : val / 10000;
};

/**
 * Build macro chart data points for an individual apartment complex.
 * 
 * Rules:
 * 1. R1: Absolutely no backfilling to 2008 before the complex's actual first transaction.
 * 2. Starts from the complex's earliest transaction month (e.g. 2020.12 for 동탄역 힐스테이트).
 * 3. R3: Forward fills missing months between subsequent transactions up to the latest macro month.
 * 4. Series that haven't started yet (e.g. sale before first sale transaction) remain null.
 * 5. Robust against cancelled transactions across all date formats (YY.MM.DD, YYYYMMDD, etc.).
 */
export function buildApartmentMacroChartData(
  transactions: ApartmentTxRecordLike[] | null | undefined,
  macroTrendList?: MacroPointLike[] | null
): FormattedMacroPoint[] {
  if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
    return [];
  }

  const salesByMonth: Record<string, number[]> = {};
  const rentsByMonth: Record<string, number[]> = {};
  let minContractYm = Infinity;
  let maxContractYm = -Infinity;

  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];
    if (!tx) continue;
    const rawDate = tx.contractYm ?? tx.contractDate ?? tx.date;
    if (rawDate == null) continue;

    // Skip cancelled transactions: strip non-digits to support '26.04.08', '20260129', '2026-01-29', etc.
    // Also skip explicit cancellation markers ('취소', '해제', 'Y', 'true')
    if (tx.cancelDate != null) {
      const cancelStr = String(tx.cancelDate).trim();
      if (/^(y|true|취소|해제)$/i.test(cancelStr) || cancelStr.includes('취소') || cancelStr.includes('해제')) {
        continue;
      }
      const cleanCancel = cancelStr.replace(/\D/g, '');
      if (cleanCancel.length >= 6) continue;
    }

    const parsedYm = extractYearMonth(rawDate);
    if (!parsedYm) continue;

    const { ymNum, monthKey } = parsedYm;

    const cleanDealType = typeof tx.dealType === 'string' ? tx.dealType.trim() : '';
    const depositVal = parseNumericValue(tx.deposit);
    const monthlyRentVal = parseNumericValue(tx.monthlyRent);
    const priceVal = parseNumericValue(tx.price);

    const isRent =
      cleanDealType === '전세' ||
      cleanDealType === '월세' ||
      cleanDealType === '임대' ||
      cleanDealType === '전월세' ||
      (cleanDealType === '' && depositVal > 0 && priceVal <= 0);

    if (isRent) {
      const rawDeposit = cleanDealType === '월세'
        ? (depositVal + Math.round((monthlyRentVal * 12) / 0.055))
        : (depositVal || priceVal || 0);

      const depositEok = toEok(rawDeposit);
      if (depositEok > 0 && !isNaN(depositEok)) {
        if (!rentsByMonth[monthKey]) rentsByMonth[monthKey] = [];
        rentsByMonth[monthKey].push(depositEok);
        if (ymNum < minContractYm) minContractYm = ymNum;
        if (ymNum > maxContractYm) maxContractYm = ymNum;
      }
    } else {
      const priceEok = toEok(priceVal);
      if (priceEok > 0 && !isNaN(priceEok)) {
        if (!salesByMonth[monthKey]) salesByMonth[monthKey] = [];
        salesByMonth[monthKey].push(priceEok);
        if (ymNum < minContractYm) minContractYm = ymNum;
        if (ymNum > maxContractYm) maxContractYm = ymNum;
      }
    }
  }

  if (minContractYm === Infinity || maxContractYm === -Infinity) {
    return [];
  }

  const monthlySaleAverages: Record<string, number> = {};
  for (const [k, prices] of Object.entries(salesByMonth)) {
    if (prices.length > 0) {
      const sum = prices.reduce((a, b) => a + b, 0);
      monthlySaleAverages[k] = Math.round((sum / prices.length) * 100) / 100;
    }
  }

  const monthlyRentAverages: Record<string, number> = {};
  for (const [k, prices] of Object.entries(rentsByMonth)) {
    if (prices.length > 0) {
      const sum = prices.reduce((a, b) => a + b, 0);
      monthlyRentAverages[k] = Math.round((sum / prices.length) * 100) / 100;
    }
  }

  let endContractYm = maxContractYm;
  if (macroTrendList && macroTrendList.length > 0) {
    for (let i = macroTrendList.length - 1; i >= 0; i--) {
      const lastPoint = macroTrendList[i];
      if (lastPoint && typeof lastPoint.name === 'string') {
        const ym = extractYearMonth(lastPoint.name);
        if (ym) {
          endContractYm = Math.max(endContractYm, ym.ymNum);
          break;
        }
      }
    }
  }

  const timelineMonths: string[] = [];
  let cur = minContractYm;
  while (cur <= endContractYm) {
    const y = Math.floor(cur / 100);
    const m = cur % 100;
    const yyStr = String(y).slice(-2).padStart(2, '0');
    const mmStr = String(m).padStart(2, '0');
    timelineMonths.push(`${yyStr}.${mmStr}`);

    let nextM = m + 1;
    let nextY = y;
    if (nextM > 12) {
      nextM = 1;
      nextY += 1;
    }
    cur = nextY * 100 + nextM;
  }

  let firstSaleIdx = -1;
  let firstRentIdx = -1;
  for (let i = 0; i < timelineMonths.length; i++) {
    const m = timelineMonths[i];
    if (firstSaleIdx === -1 && monthlySaleAverages[m] !== undefined) firstSaleIdx = i;
    if (firstRentIdx === -1 && monthlyRentAverages[m] !== undefined) firstRentIdx = i;
  }

  let lastSale: number | null = null;
  let lastRent: number | null = null;
  const result: FormattedMacroPoint[] = [];

  for (let i = 0; i < timelineMonths.length; i++) {
    const m = timelineMonths[i];

    let saleVal: number | null = null;
    if (firstSaleIdx !== -1 && i >= firstSaleIdx) {
      if (monthlySaleAverages[m] !== undefined) {
        lastSale = monthlySaleAverages[m];
        saleVal = lastSale;
      } else {
        saleVal = lastSale;
      }
    }

    let rentVal: number | null = null;
    if (firstRentIdx !== -1 && i >= firstRentIdx) {
      if (monthlyRentAverages[m] !== undefined) {
        lastRent = monthlyRentAverages[m];
        rentVal = lastRent;
      } else {
        rentVal = lastRent;
      }
    }

    result.push({
      name: m,
      '동탄 아파트 전체': saleVal !== null ? Math.round(saleVal * 100) / 100 : null,
      '동탄 아파트 전세 평균': rentVal !== null ? Math.round(rentVal * 100) / 100 : null,
    });
  }

  return result;
}

export interface ParsedMacroTrendSeries {
  daily: FormattedMacroPoint[];
  weekly: FormattedMacroPoint[];
  monthly: FormattedMacroPoint[];
  latestContractDate: string;
}

function tuplesToFormattedPoints(tuples: unknown): FormattedMacroPoint[] {
  if (!Array.isArray(tuples)) return [];
  const points: FormattedMacroPoint[] = [];
  for (let i = 0; i < tuples.length; i++) {
    const row = tuples[i] as CompactMacroTrendTuple;
    if (!Array.isArray(row) || typeof row[0] !== 'string') continue;
    const sale = typeof row[1] === 'number' && row[1] > 0 ? row[1] : null;
    const rent = typeof row[2] === 'number' && row[2] > 0 ? row[2] : null;
    const saleCount = typeof row[3] === 'number' && row[3] >= 0 ? Math.round(row[3]) : 0;
    const rentCount = typeof row[4] === 'number' && row[4] >= 0 ? Math.round(row[4]) : 0;
    points.push({
      name: row[0],
      '동탄 아파트 전체': sale,
      '동탄 아파트 전세 평균': rent,
      saleCount,
      rentCount,
    });
  }
  return points;
}

/**
 * Parse compact macro-trend-series.json payload into FormattedMacroPoint arrays.
 */
export function parseMacroTrendSeriesPayload(raw: unknown): ParsedMacroTrendSeries | null {
  if (!raw || typeof raw !== 'object') return null;
  const payload = raw as Partial<MacroTrendSeriesPayload>;
  if (!Array.isArray(payload.daily) && !Array.isArray(payload.weekly) && !Array.isArray(payload.monthly)) {
    return null;
  }
  return {
    daily: tuplesToFormattedPoints(payload.daily),
    weekly: tuplesToFormattedPoints(payload.weekly),
    monthly: tuplesToFormattedPoints(payload.monthly),
    latestContractDate: typeof payload.latestContractDate === 'string' ? payload.latestContractDate : '',
  };
}

function parsePointDateUtcMs(name: string): number | null {
  if (!name || typeof name !== 'string') return null;
  const trimmed = name.trim();
  const ymd = trimmed.match(/^(\d{2}|\d{4})\.(\d{2})\.(\d{2})$/);
  if (ymd) {
    const rawY = parseInt(ymd[1], 10);
    const fullY = ymd[1].length === 4 ? rawY : (rawY < 50 ? 2000 : 1900) + rawY;
    const m = parseInt(ymd[2], 10) - 1;
    const d = parseInt(ymd[3], 10);
    const ms = Date.UTC(fullY, m, d);
    return Number.isFinite(ms) ? ms : null;
  }
  const ym = trimmed.match(/^(\d{2}|\d{4})\.(\d{2})$/);
  if (ym) {
    const rawY = parseInt(ym[1], 10);
    const fullY = ym[1].length === 4 ? rawY : (rawY < 50 ? 2000 : 1900) + rawY;
    const m = parseInt(ym[2], 10) - 1;
    const ms = Date.UTC(fullY, m, 1);
    return Number.isFinite(ms) ? ms : null;
  }
  return null;
}

/**
 * Granularity-aware timeframe filtering:
 * - monthly: preserves exact month-count slicing (3, 6, 12, 36, 60, ALL)
 * - weekly/daily: filters by exact calendar window relative to latest data point
 */
export function filterChartTimeframeByGranularity<T extends { name: string }>(
  data: T[] | null | undefined,
  timeframe: ChartTimeframe,
  granularity: ChartGranularity = 'monthly'
): T[] {
  if (!data || !Array.isArray(data) || data.length === 0) return [];
  if (timeframe === 'ALL') return data;
  if (granularity === 'monthly') {
    return filterChartTimeframe(data, timeframe);
  }

  let windowDays = 90;
  switch (timeframe) {
    case '3M': windowDays = 90; break;
    case '6M': windowDays = 180; break;
    case '1Y': windowDays = 365; break;
    case '3Y': windowDays = 365 * 3; break;
    case '5Y': windowDays = 365 * 5; break;
    default: return data;
  }

  let maxMs = -Infinity;
  for (let i = data.length - 1; i >= 0; i--) {
    const ms = parsePointDateUtcMs(data[i]?.name || '');
    if (ms !== null && ms > maxMs) {
      maxMs = ms;
      break;
    }
  }

  if (!Number.isFinite(maxMs)) {
    const fallbackCount = granularity === 'weekly' ? Math.ceil(windowDays / 7) : windowDays;
    return data.slice(-Math.min(fallbackCount, data.length));
  }

  const cutoffMs = maxMs - windowDays * 24 * 60 * 60 * 1000;
  const filtered = data.filter((pt) => {
    const ms = parsePointDateUtcMs(pt.name);
    return ms === null || ms >= cutoffMs;
  });

  return filtered.length > 0 ? filtered : data.slice(-1);
}

function extractTxContractDate8(tx: ApartmentTxRecordLike): string | null {
  const directRaw = tx.contractDate ?? tx.date;
  if (directRaw != null) {
    const clean = String(directRaw).replace(/\D/g, '');
    if (clean.length >= 8) {
      const d8 = clean.slice(0, 8);
      const y = parseInt(d8.slice(0, 4), 10);
      const m = parseInt(d8.slice(4, 6), 10);
      const d = parseInt(d8.slice(6, 8), 10);
      if (y >= 1990 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        return d8;
      }
    }
  }
  const ymParsed = extractYearMonth(tx.contractYm ?? tx.contractDate ?? tx.date);
  if (!ymParsed) return null;
  const y = Math.floor(ymParsed.ymNum / 100);
  const m = String(ymParsed.ymNum % 100).padStart(2, '0');
  const rawDay = tx.contractDay != null ? String(tx.contractDay).replace(/\D/g, '') : '';
  const dNum = rawDay ? parseInt(rawDay, 10) : 1;
  const safeDay = String(dNum >= 1 && dNum <= 31 ? dNum : 1).padStart(2, '0');
  return `${y}${m}${safeDay}`;
}

function getMondayKeyFromDate8(date8: string): { sortKey: string; label: string } {
  const y = parseInt(date8.slice(0, 4), 10);
  const m = parseInt(date8.slice(4, 6), 10) - 1;
  const d = parseInt(date8.slice(6, 8), 10);
  const dt = new Date(Date.UTC(y, m, d));
  const day = dt.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  dt.setUTCDate(dt.getUTCDate() + diff);
  const wy = dt.getUTCFullYear();
  const wm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const wd = String(dt.getUTCDate()).padStart(2, '0');
  return {
    sortKey: `${wy}${wm}${wd}`,
    label: `${String(wy).slice(-2)}.${wm}.${wd}`,
  };
}

/**
 * Build granular (daily / weekly / monthly) chart series with real transaction counts
 * for an individual apartment complex.
 * - monthly: preserves price forward-fill continuity while ALWAYS recording true 0+ transaction counts
 * - weekly/daily: emits only actual buckets with real transactions (Strict Real Data Only)
 */
export function buildApartmentGranularChartData(
  transactions: ApartmentTxRecordLike[] | null | undefined,
  granularity: ChartGranularity = 'monthly',
  macroTrendList?: MacroPointLike[] | null
): FormattedMacroPoint[] {
  if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
    return [];
  }

  const bucketMap = new Map<
    string,
    { name: string; saleSum: number; saleCount: number; rentSum: number; rentCount: number }
  >();
  let minContractYm = Infinity;
  let maxContractYm = -Infinity;

  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];
    if (!tx) continue;

    if (tx.cancelDate != null) {
      const cancelStr = String(tx.cancelDate).trim();
      if (/^(y|true|취소|해제)$/i.test(cancelStr) || cancelStr.includes('취소') || cancelStr.includes('해제')) {
        continue;
      }
      const cleanCancel = cancelStr.replace(/\D/g, '');
      if (cleanCancel.length >= 6) continue;
    }

    const date8 = extractTxContractDate8(tx);
    if (!date8) continue;

    const cleanDealType = typeof tx.dealType === 'string' ? tx.dealType.trim() : '';
    const depositVal = parseNumericValue(tx.deposit);
    const monthlyRentVal = parseNumericValue(tx.monthlyRent);
    const priceVal = parseNumericValue(tx.price);

    const isRent =
      cleanDealType === '전세' ||
      cleanDealType === '월세' ||
      cleanDealType === '임대' ||
      cleanDealType === '전월세' ||
      (cleanDealType === '' && depositVal > 0 && priceVal <= 0);

    let sortKey: string;
    let label: string;
    if (granularity === 'daily') {
      sortKey = date8;
      label = `${date8.slice(2, 4)}.${date8.slice(4, 6)}.${date8.slice(6, 8)}`;
    } else if (granularity === 'weekly') {
      const wk = getMondayKeyFromDate8(date8);
      sortKey = wk.sortKey;
      label = wk.label;
    } else {
      sortKey = date8.slice(0, 6);
      label = `${date8.slice(2, 4)}.${date8.slice(4, 6)}`;
    }

    const ymNum = parseInt(date8.slice(0, 6), 10);

    if (isRent) {
      const rawDeposit =
        cleanDealType === '월세'
          ? depositVal + Math.round((monthlyRentVal * 12) / 0.055)
          : depositVal || priceVal || 0;
      const depositEok = toEok(rawDeposit);
      if (depositEok > 0 && !isNaN(depositEok)) {
        let bucket = bucketMap.get(sortKey);
        if (!bucket) {
          bucket = { name: label, saleSum: 0, saleCount: 0, rentSum: 0, rentCount: 0 };
          bucketMap.set(sortKey, bucket);
        }
        bucket.rentSum += depositEok;
        bucket.rentCount += 1;
        if (ymNum < minContractYm) minContractYm = ymNum;
        if (ymNum > maxContractYm) maxContractYm = ymNum;
      }
    } else {
      const priceEok = toEok(priceVal);
      if (priceEok > 0 && !isNaN(priceEok)) {
        let bucket = bucketMap.get(sortKey);
        if (!bucket) {
          bucket = { name: label, saleSum: 0, saleCount: 0, rentSum: 0, rentCount: 0 };
          bucketMap.set(sortKey, bucket);
        }
        bucket.saleSum += priceEok;
        bucket.saleCount += 1;
        if (ymNum < minContractYm) minContractYm = ymNum;
        if (ymNum > maxContractYm) maxContractYm = ymNum;
      }
    }
  }

  if (bucketMap.size === 0) return [];

  if (granularity === 'daily' || granularity === 'weekly') {
    const sortedKeys = Array.from(bucketMap.keys()).sort();
    return sortedKeys.map((k) => {
      const b = bucketMap.get(k)!;
      return {
        name: b.name,
        '동탄 아파트 전체': b.saleCount > 0 ? Math.round((b.saleSum / b.saleCount) * 100) / 100 : null,
        '동탄 아파트 전세 평균': b.rentCount > 0 ? Math.round((b.rentSum / b.rentCount) * 100) / 100 : null,
        saleCount: b.saleCount,
        rentCount: b.rentCount,
      };
    });
  }

  // Monthly: continuous month grid from earliest valid tx to latest macro month, with TRUE counts (never forward-filled)
  let endContractYm = maxContractYm;
  if (macroTrendList && macroTrendList.length > 0) {
    for (let i = macroTrendList.length - 1; i >= 0; i--) {
      const lastPoint = macroTrendList[i];
      if (lastPoint && typeof lastPoint.name === 'string') {
        const ym = extractYearMonth(lastPoint.name);
        if (ym) {
          endContractYm = Math.max(endContractYm, ym.ymNum);
          break;
        }
      }
    }
  }

  const timelineYmKeys: Array<{ ymKey: string; label: string }> = [];
  let cur = minContractYm;
  while (cur <= endContractYm) {
    const y = Math.floor(cur / 100);
    const m = cur % 100;
    const mmStr = String(m).padStart(2, '0');
    timelineYmKeys.push({
      ymKey: `${y}${mmStr}`,
      label: `${String(y).slice(-2)}.${mmStr}`,
    });
    let nextM = m + 1;
    let nextY = y;
    if (nextM > 12) {
      nextM = 1;
      nextY += 1;
    }
    cur = nextY * 100 + nextM;
  }

  let lastSale: number | null = null;
  let lastRent: number | null = null;
  const result: FormattedMacroPoint[] = [];

  for (let i = 0; i < timelineYmKeys.length; i++) {
    const { ymKey, label } = timelineYmKeys[i];
    const b = bucketMap.get(ymKey);

    if (b && b.saleCount > 0) {
      lastSale = Math.round((b.saleSum / b.saleCount) * 100) / 100;
    }
    if (b && b.rentCount > 0) {
      lastRent = Math.round((b.rentSum / b.rentCount) * 100) / 100;
    }

    result.push({
      name: label,
      '동탄 아파트 전체': lastSale,
      '동탄 아파트 전세 평균': lastRent,
      saleCount: b ? b.saleCount : 0,
      rentCount: b ? b.rentCount : 0,
    });
  }

  return result;
}

/**
 * Compute evenly spaced, non-overlapping X-axis tick names for any granularity.
 */
export function computeNonOverlappingXTicks<T extends { name: string }>(
  data: T[] | null | undefined,
  maxTicks = 6
): string[] {
  if (!data || data.length === 0) return [];
  if (data.length <= maxTicks) return data.map((d) => d.name);

  const step = Math.ceil((data.length - 1) / Math.max(1, maxTicks - 1));
  const ticks: string[] = [];
  let lastIdx = -1;

  for (let i = 0; i < data.length; i += step) {
    ticks.push(data[i].name);
    lastIdx = i;
  }

  const finalIdx = data.length - 1;
  if (lastIdx !== finalIdx) {
    if (finalIdx - lastIdx < Math.max(1, Math.floor(step * 0.55)) && ticks.length > 1) {
      ticks[ticks.length - 1] = data[finalIdx].name;
    } else {
      ticks.push(data[finalIdx].name);
    }
  }

  return ticks;
}
