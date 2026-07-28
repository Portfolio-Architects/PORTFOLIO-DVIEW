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
  lineData?: DongtanMacroTrendPoint[] | FormattedMacroPoint[] | null
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
 * Format X-axis tick from YY.MM format to YY년 MM월
 */
export function formatXAxisTick(value: string): string {
  if (typeof value === "string" && /^\d{2}\.\d{2}$/.test(value)) {
    const parts = value.split(".");
    return `${parts[0]}년 ${parts[1]}월`;
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
