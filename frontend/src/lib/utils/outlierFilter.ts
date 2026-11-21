export interface OutlierFilterOptions<T> {
  /** 파이프라인에서 사전 계산된 이상치 여부 (true=확정 이상치, false=시계열·중개 검증 통과 정상 거래) */
  isPipelineOutlier?: (item: T) => boolean | undefined;
  /** 직거래 여부 (직거래는 상한 완화를 적용하지 않음) */
  isDirectDeal?: (item: T) => boolean;
}

/**
 * IQR (Interquartile Range) 기반으로 실거래가 데이터의 이상치를 필터링합니다.
 * @param data 필터링 대상 배열
 * @param getPrice 각 데이터 객체에서 가격(숫자)을 추출하는 함수
 * @param multiplier 하한 IQR 곱셈 계수 (기본값: 1.5)
 * @param upperMultiplier 상한 IQR 곱셈 계수 (기본값: 3.0)
 * @param options 파이프라인 사전 검증 플래그 및 직거래 판별 옵션
 * @returns 이상치가 제거된 필터링된 배열
 */
export function filterOutliersIQR<T>(
  data: T[], 
  getPrice: (item: T) => number,
  multiplier: number = 1.5,
  upperMultiplier: number = 3.0,
  options?: OutlierFilterOptions<T>
): T[] {
  if (!data || data.length === 0) return data;
  if (data.length < 4) {
    if (options?.isPipelineOutlier) {
      return data.filter(item => options.isPipelineOutlier!(item) !== true);
    }
    return data;
  }
  const sorted = [...data].sort((a, b) => getPrice(a) - getPrice(b));
  const n = sorted.length;
  const getPercentile = (p: number): number => {
    const idx = (n - 1) * p;
    const base = Math.floor(idx);
    const rest = idx - base;
    const valBase = getPrice(sorted[base]);
    if (base + 1 < n) {
      const valNext = getPrice(sorted[base + 1]);
      return valBase + rest * (valNext - valBase);
    }
    return valBase;
  };
  const q1 = getPercentile(0.25);
  const q3 = getPercentile(0.75);
  const iqr = q3 - q1;
  const lowerBound = q1 - multiplier * iqr;
  const upperBound = q3 + upperMultiplier * iqr;

  // 이상치 제거 (하한선 미만의 비정상 저가 및 상한선 극단적 이탈 오타 거래 제거)
  // 파이프라인의 면적별·시계열 연속성·중개거래 검증을 통과한 정상 상승 거래(pipelineOutlier === false)는 상한 오탐 방지
  return data.filter(item => {
    const pipelineFlag = options?.isPipelineOutlier?.(item);
    if (pipelineFlag === true) return false;

    const price = getPrice(item);
    if (price < lowerBound) return false;
    if (price > upperBound) {
      const isDirect = options?.isDirectDeal?.(item) ?? false;
      if (pipelineFlag === false && !isDirect) {
        return true;
      }
      return false;
    }
    return true;
  });
}
