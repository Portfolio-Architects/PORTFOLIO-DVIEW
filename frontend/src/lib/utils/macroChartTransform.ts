import type { DongtanMacroTrendPoint } from "@/lib/types/transaction";

export interface FormattedMacroPoint extends Record<string, unknown> {
  name: string;
  "동탄 아파트 전체": number | null;
  "동탄 아파트 전세 평균": number | null;
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
    [key: string]: unknown;
  }> | null
): FormattedMacroPoint[] {
  if (!lineData || !Array.isArray(lineData)) return [];
  return lineData.map((d) => {
    const rawJeonse = d["동탄 아파트 전세 평균"];
    const jeonseVal = (typeof rawJeonse === "number" && rawJeonse > 0) ? rawJeonse : null;
    const rawSale = d["동탄 아파트 전체"];
    const saleVal = (typeof rawSale === "number" && rawSale > 0) ? rawSale : null;

    return {
      ...d,
      name: d.name || "",
      "동탄 아파트 전체": saleVal,
      "동탄 아파트 전세 평균": jeonseVal,
    };
  });
}

/**
 * Format X-axis tick from YY.MM or YYYY.MM format to YY년 MM월
 */
export function formatXAxisTick(value: string): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    const match = trimmed.match(/^(\d{2}|\d{4})\.(\d{2})$/);
    if (match) {
      const yy = match[1].slice(-2);
      const mm = match[2];
      return `${yy}년 ${mm}월`;
    }
  }
  return value || "";
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
