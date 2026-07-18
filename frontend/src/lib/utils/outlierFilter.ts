/**
 * IQR (Interquartile Range) 기반으로 실거래가 데이터의 이상치를 필터링합니다.
 * @param data 필터링 대상 배열
 * @param getPrice 각 데이터 객체에서 가격(숫자)을 추출하는 함수
 * @param multiplier IQR 곱셈 계수 (기본값: 1.5)
 * @returns 이상치가 제거된 필터링된 배열
 */
export function filterOutliersIQR<T>(
  data: T[], 
  getPrice: (item: T) => number,
  multiplier: number = 1.5,
  upperMultiplier: number = 3.0
): T[] {
  if (!data || data.length < 4) return data;
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
  return data.filter(item => {
    const price = getPrice(item);
    return price >= lowerBound && price <= upperBound;
  });
}
