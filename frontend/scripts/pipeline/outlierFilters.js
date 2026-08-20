/**
 * 📊 Outlier Filters Module
 * 
 * - filterOutliersRolling: 11-point rolling window local mean/stdDev filter
 * - applyIqrOutlierDetection: IQR-based lower bounding outlier detection
 */

/**
 * 롤링 윈도우 기반 시계열 이상치 필터링 (최근 11건 기준 국소적 평균/표준편차 적용, 현재 거래 배제)
 * @param {Array<Object>} txs - 거래 레코드 배열
 * @returns {Array<Object>} 이상치가 제거된 거래 레코드 배열
 */
function filterOutliersRolling(txs) {
  if (!Array.isArray(txs) || txs.length === 0) {
    return [];
  }

  const sortedTxs = [...txs].sort((a, b) => {
    const d1 = parseInt(`${a.contractYm || ''}${String(a.contractDay || '').padStart(2, '0')}`, 10) || 0;
    const d2 = parseInt(`${b.contractYm || ''}${String(b.contractDay || '').padStart(2, '0')}`, 10) || 0;
    return d1 - d2;
  });

  const byArea = {};
  sortedTxs.forEach(t => {
    const a = Math.round(t.area || 0);
    if (!byArea[a]) byArea[a] = [];
    byArea[a].push(t);
  });

  const getTxPrice = (t) => {
    return (t.dealType === '전세' || t.dealType === '월세')
      ? (t.deposit || 0) + Math.round((t.monthlyRent || 0) * 12 / 0.055)
      : (t.price || 0);
  };

  const validTxs = [];
  Object.values(byArea).forEach(group => {
    const groupLen = group.length;
    for (let idx = 0; idx < groupLen; idx++) {
      const t = group[idx];
      const start = Math.max(0, idx - 5);
      const end = Math.min(groupLen, idx + 6);
      
      let sum = 0;
      let count = 0;
      for (let w = start; w < end; w++) {
        const item = group[w];
        if (w !== idx && item) {
          sum += getTxPrice(item);
          count++;
        }
      }
      
      if (count < 3) {
        validTxs.push(t);
        continue;
      }
      
      const mean = sum / count;
      let sumSqDiff = 0;
      for (let w = start; w < end; w++) {
        const item = group[w];
        if (w !== idx && item) {
          sumSqDiff += Math.pow(getTxPrice(item) - mean, 2);
        }
      }
      const variance = sumSqDiff / count;
      const stdDev = Math.sqrt(variance);
      const p = getTxPrice(t);
      
      if (p < mean) {
        if ((mean - p) <= 2 * Math.max(stdDev, mean * 0.05)) {
          validTxs.push(t);
        }
      } else {
        if ((p - mean) <= 3 * Math.max(stdDev, mean * 0.05)) {
          validTxs.push(t);
        }
      }
    }
  });
  return validTxs;
}

/**
 * IQR 아웃라이어 빌드 타임 선 연산 (클라이언트 CPU 부하 0ms 최적화)
 * @param {Array<Object>} records - 거래 레코드 배열
 * @returns {Array<Object>} isOutlier 플래그가 주입된 레코드 배열
 */
function applyIqrOutlierDetection(records) {
  if (!Array.isArray(records)) {
    return [];
  }

  const groups = {};
  records.forEach(r => {
    const isRent = r.dealType === '전세' || r.dealType === '월세';
    const evaluatedPrice = isRent
      ? (r.deposit || 0) + (r.monthlyRent ? Math.round(r.monthlyRent * 12 / 0.055) : 0)
      : (r.price || 0);
    const areaKey = Math.round(r.area || 0);
    const typeKey = isRent ? 'rent' : 'sale';
    const groupKey = `${areaKey}_${typeKey}`;
    
    r.evaluatedPrice = evaluatedPrice;
    r.groupKey = groupKey;

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(evaluatedPrice);
  });

  const iqrBounds = {};
  Object.entries(groups).forEach(([groupKey, prices]) => {
    const sortedPrices = [...prices].sort((a, b) => a - b);
    const getPercentile = (arr, val) => {
      if (arr.length === 0) return 0;
      const idx = (arr.length - 1) * val;
      const base = Math.floor(idx);
      const rest = idx - base;
      if (arr[base + 1] !== undefined) {
        return arr[base] + rest * (arr[base + 1] - arr[base]);
      } else {
        return arr[base];
      }
    };
    const q1 = getPercentile(sortedPrices, 0.25);
    const q3 = getPercentile(sortedPrices, 0.75);
    const iqr = q3 - q1;
    iqrBounds[groupKey] = {
      lower: q1 - 1.5 * iqr,
      count: prices.length
    };
  });

  records.forEach(r => {
    const bounds = iqrBounds[r.groupKey];
    r.isOutlier = !!(bounds && bounds.count >= 4 && (r.evaluatedPrice < bounds.lower));
    
    delete r.evaluatedPrice;
    delete r.groupKey;
  });

  return records;
}

module.exports = {
  filterOutliersRolling,
  applyIqrOutlierDetection
};
