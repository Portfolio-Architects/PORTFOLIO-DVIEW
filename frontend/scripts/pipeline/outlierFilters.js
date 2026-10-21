/**
 * 📊 Outlier Filters Module
 * 
 * - filterOutliersRolling: 11-point rolling window local mean/stdDev filter
 * - applyIqrOutlierDetection: IQR-based lower bounding outlier detection
 */

const { isCancelledTransaction } = require('../../pipeline/core/normalizer');

/**
 * 직거래 여부 판별 유틸리티
 * @param {Object} t - 실거래 레코드
 * @returns {boolean} 직거래 여부
 */
function isDirectDeal(t) {
  if (!t || typeof t !== 'object') return false;
  return t.dealType === '직거래' || t.dealingGbn === '직거래' || t.isDirectDeal === true;
}

function parseTxDateMs(t) {
  if (!t || typeof t !== 'object') return null;
  const raw = String(
    t.contractDate || `${t.contractYm || ''}${String(t.contractDay || '').padStart(2, '0')}`
  ).replace(/\D/g, '');
  if (raw.length < 6) return null;
  const y = parseInt(raw.slice(0, 4), 10);
  const m = parseInt(raw.slice(4, 6), 10) - 1;
  const d = raw.length >= 8 ? parseInt(raw.slice(6, 8), 10) || 1 : 1;
  const ms = Date.UTC(y, m, d);
  return Number.isNaN(ms) ? null : ms;
}

/**
 * 롤링 윈도우 기반 시계열 이상치 필터링 (최근 11건 및 180일 시계열 호라이즌 기준 국소적 평균/표준편차 적용, 현재 거래 배제)
 * 직거래 및 취소 거래는 일반 시장 시세 왜곡 및 최저가 왜곡을 방지하기 위해 필터링됩니다.
 * @param {Array<Object>} txs - 거래 레코드 배열
 * @returns {Array<Object>} 이상치가 제거된 거래 레코드 배열
 */
function filterOutliersRolling(txs) {
  if (!Array.isArray(txs) || txs.length === 0) {
    return [];
  }

  // 직거래 플래그 표기
  txs.forEach(t => {
    if (isDirectDeal(t)) {
      t.isDirectDeal = true;
    }
  });

  // 취소 거래 및 직거래는 요약 통계 및 매크로 트렌드 롤링 윈도우 왜곡 방지를 위해 제외
  const cleanTxs = txs.filter(t => !isCancelledTransaction(t) && !isDirectDeal(t));
  if (cleanTxs.length === 0) {
    return [];
  }

  const sortedTxs = [...cleanTxs].sort((a, b) => {
    const d1 = parseInt(`${a.contractYm || ''}${String(a.contractDay || '').padStart(2, '0')}`, 10) || 0;
    const d2 = parseInt(`${b.contractYm || ''}${String(b.contractDay || '').padStart(2, '0')}`, 10) || 0;
    return d1 - d2;
  });

  const byArea = {};
  sortedTxs.forEach(t => {
    const a = Math.floor(t.area || 0);
    if (!byArea[a]) byArea[a] = [];
    byArea[a].push(t);
  });

  const getTxPrice = (t) => {
    return (t.dealType === '전세' || t.dealType === '월세')
      ? (t.deposit || 0) + Math.round((t.monthlyRent || 0) * 12 / 0.055)
      : (t.price || 0);
  };

  const MAX_HORIZON_MS = 180 * 86400000;
  const validTxs = [];
  Object.values(byArea).forEach(group => {
    const groupLen = group.length;
    const dateMsArr = group.map(parseTxDateMs);
    for (let idx = 0; idx < groupLen; idx++) {
      const t = group[idx];
      const tMs = dateMsArr[idx];
      const start = Math.max(0, idx - 5);
      const end = Math.min(groupLen, idx + 6);
      
      let sum = 0;
      let count = 0;
      const neighborPrices = [];
      for (let w = start; w < end; w++) {
        const item = group[w];
        if (w !== idx && item) {
          const itemMs = dateMsArr[w];
          if (tMs !== null && itemMs !== null && Math.abs(tMs - itemMs) > MAX_HORIZON_MS) {
            continue;
          }
          const wp = getTxPrice(item);
          sum += wp;
          count++;
          neighborPrices.push(wp);
        }
      }
      
      if (count < 3) {
        validTxs.push(t);
        continue;
      }
      
      const mean = sum / count;
      let sumSqDiff = 0;
      for (let k = 0; k < neighborPrices.length; k++) {
        sumSqDiff += Math.pow(neighborPrices[k] - mean, 2);
      }
      const variance = sumSqDiff / count;
      const stdDev = Math.sqrt(variance);
      const p = getTxPrice(t);
      
      if (p < mean) {
        if ((mean - p) <= 2.5 * Math.max(stdDev, mean * 0.10)) {
          validTxs.push(t);
        }
      } else {
        if ((p - mean) <= 3.5 * Math.max(stdDev, mean * 0.12)) {
          validTxs.push(t);
        }
      }
    }
  });
  return validTxs;
}

/**
 * IQR 아웃라이어 빌드 타임 선 연산 (클라이언트 CPU 부하 0ms 최적화)
 * 상한/하한 양방향 이상치 탐지 (Two-Sided IQR Outlier Detection)
 * @param {Array<Object>} records - 거래 레코드 배열
 * @returns {Array<Object>} isOutlier 플래그가 주입된 레코드 배열
 */
function applyIqrOutlierDetection(records) {
  if (!Array.isArray(records)) {
    return [];
  }

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

  const computeBounds = (prices) => {
    const sortedPrices = [...prices].sort((a, b) => a - b);
    const q1 = getPercentile(sortedPrices, 0.25);
    const q3 = getPercentile(sortedPrices, 0.75);
    const median = getPercentile(sortedPrices, 0.5);
    const iqr = q3 - q1;
    return {
      lower: q1 - 1.5 * iqr,
      upper: Math.max(q3 + 1.5 * iqr, Math.round(median * 1.35)),
      iqr,
      count: prices.length
    };
  };

  const groups = {};
  const yearGroups = {};
  records.forEach(r => {
    const isRent = r.dealType === '전세' || r.dealType === '월세';
    const evaluatedPrice = isRent
      ? (r.deposit || 0) + (r.monthlyRent ? Math.round(r.monthlyRent * 12 / 0.055) : 0)
      : (r.price || 0);
    const areaKey = Math.floor(r.area || 0);
    const typeKey = isRent ? 'rent' : 'sale';
    const groupKey = `${areaKey}_${typeKey}`;
    const rawYm = String(r.contractYm || r.contractDate || '');
    const yearKey = rawYm.length >= 4 ? `${groupKey}_${rawYm.slice(0, 4)}` : '';
    
    r.evaluatedPrice = evaluatedPrice;
    r.groupKey = groupKey;
    r.yearGroupKey = yearKey;

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(evaluatedPrice);

    if (yearKey) {
      if (!yearGroups[yearKey]) {
        yearGroups[yearKey] = [];
      }
      yearGroups[yearKey].push(evaluatedPrice);
    }
  });

  const iqrBounds = {};
  Object.entries(groups).forEach(([groupKey, prices]) => {
    iqrBounds[groupKey] = computeBounds(prices);
  });

  const yearIqrBounds = {};
  Object.entries(yearGroups).forEach(([yearKey, prices]) => {
    if (prices.length >= 4) {
      yearIqrBounds[yearKey] = computeBounds(prices);
    }
  });

  records.forEach(r => {
    const bounds = iqrBounds[r.groupKey];
    const yearBound = r.yearGroupKey ? yearIqrBounds[r.yearGroupKey] : undefined;
    const effectiveUpper = bounds
      ? (yearBound ? Math.max(bounds.upper, yearBound.upper) : bounds.upper)
      : 0;
    const isOutlier = !!(
      bounds &&
      bounds.count >= 4 &&
      bounds.iqr > 0 &&
      (r.evaluatedPrice < bounds.lower || r.evaluatedPrice > effectiveUpper)
    );
    r.isOutlier = isOutlier;
    if (isDirectDeal(r)) {
      r.isDirectDeal = true;
    }
    
    delete r.evaluatedPrice;
    delete r.groupKey;
    delete r.yearGroupKey;
  });

  return records;
}

module.exports = {
  isCancelledTransaction,
  isDirectDeal,
  filterOutliersRolling,
  applyIqrOutlierDetection
};
