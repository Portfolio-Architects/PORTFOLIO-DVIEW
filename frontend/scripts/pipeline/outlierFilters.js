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
 * 상한/하한 양방향 이상치 탐지 (Two-Sided IQR + 최근 시계열 연속성 가드 + 중개거래 상한 완화)
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
      // 직거래용 엄격 상한선
      upper: Math.max(q3 + 1.5 * iqr, Math.round(median * 1.35)),
      // 중개거래(비직거래)용 완화 상한선
      brokerUpper: Math.max(q3 + 2.5 * iqr, Math.round(median * 1.50)),
      median,
      iqr,
      count: prices.length
    };
  };

  const groups = {};
  const yearGroups = {};
  const groupItems = {};

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
    const dateMs = parseTxDateMs(r);
    const direct = isDirectDeal(r);
    const cancelled = isCancelledTransaction(r);

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

    if (!groupItems[groupKey]) {
      groupItems[groupKey] = [];
    }
    groupItems[groupKey].push({
      record: r,
      evaluatedPrice,
      groupKey,
      yearKey,
      dateMs,
      direct,
      cancelled
    });
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

  const DAY_MS = 86400000;
  const WINDOW_180_MS = 180 * DAY_MS;
  const WINDOW_365_MS = 365 * DAY_MS;
  const WINDOW_5Y_MS = 5 * 365 * DAY_MS;

  Object.entries(groupItems).forEach(([groupKey, items]) => {
    const bounds = iqrBounds[groupKey];

    // 표본이 4건 미만이거나 분산이 0인 경우 이상치 판정 생략
    if (!bounds || bounds.count < 4 || bounds.iqr <= 0) {
      items.forEach(({ record, direct }) => {
        record.isOutlier = false;
        if (direct) {
          record.isDirectDeal = true;
        }
      });
      return;
    }

    // 원본 배열 순서를 유지한 채 시계열 연속성 판정을 위해 그룹 임시 뷰만 계약일 오름차순 정렬
    const sortedItems = [...items].sort((a, b) => {
      const da = a.dateMs ?? -Infinity;
      const db = b.dateMs ?? -Infinity;
      if (da !== db) return da - db;
      return a.evaluatedPrice - b.evaluatedPrice;
    });

    const confirmedNormals = [];
    const hardCap = bounds.median > 0 ? bounds.median * 3.5 : Infinity;

    for (let sIdx = 0; sIdx < sortedItems.length; sIdx++) {
      const item = sortedItems[sIdx];
      const yearBound = item.yearKey ? yearIqrBounds[item.yearKey] : undefined;
      const effectiveUpper = item.direct
        ? (yearBound ? Math.max(bounds.upper, yearBound.upper) : bounds.upper)
        : (yearBound ? Math.max(bounds.brokerUpper, yearBound.brokerUpper) : bounds.brokerUpper);

      let isOutlier = item.evaluatedPrice < bounds.lower || item.evaluatedPrice > effectiveUpper;

      // 상한 초과 비직거래·비취소 거래에 대한 시계열 연속성 및 동시세 지지 가드
      if (
        isOutlier &&
        item.evaluatedPrice > effectiveUpper &&
        item.evaluatedPrice <= hardCap &&
        !item.direct &&
        !item.cancelled &&
        item.dateMs !== null
      ) {
        // 1) 순방향 시계열 연속성 가드: 직전 확정 정상 거래 대비 점진적 계단식 상승 인정
        if (confirmedNormals.length > 0) {
          const recent365 = [];
          for (let i = confirmedNormals.length - 1; i >= 0 && recent365.length < 5; i--) {
            const prev = confirmedNormals[i];
            const gap = item.dateMs - prev.dateMs;
            if (gap >= 0 && gap <= WINDOW_365_MS) {
              recent365.push(prev);
            } else if (gap > WINDOW_365_MS) {
              break;
            }
          }

          const recent180 = recent365.filter(p => (item.dateMs - p.dateMs) <= WINDOW_180_MS);
          if (recent180.length > 0) {
            const prices180 = recent180.map(p => p.evaluatedPrice).sort((a, b) => a - b);
            const max180 = prices180[prices180.length - 1];
            const med180 = getPercentile(prices180, 0.5);
            const withinMax = item.evaluatedPrice <= max180 * 1.25;
            const withinMed = recent180.length < 3 || item.evaluatedPrice <= med180 * 1.40;
            if (withinMax && withinMed) {
              isOutlier = false;
            }
          } else if (recent365.length > 0) {
            const max365 = Math.max(...recent365.map(p => p.evaluatedPrice));
            if (item.evaluatedPrice <= max365 * 1.30) {
              isOutlier = false;
            }
          } else {
            // 희소 대형 평형(1년 초과~5년 공백)의 장기 상승 연속성 보정
            const last = confirmedNormals[confirmedNormals.length - 1];
            const gapMs = item.dateMs - last.dateMs;
            if (gapMs > WINDOW_365_MS && gapMs <= WINDOW_5Y_MS) {
              const yearsGap = gapMs / WINDOW_365_MS;
              const allowedRatio = Math.min(1.80, 1.30 + (yearsGap - 1) * 0.12);
              if (item.evaluatedPrice <= last.evaluatedPrice * allowedRatio) {
                isOutlier = false;
              }
            }
          }
        }

        // 2) 근접 동시세 지지 클러스터 가드 (±365일 이내 다른 계약일, ±15% 가격대 비직거래 실거래 확인 시 정상 인정)
        if (isOutlier) {
          for (let j = 0; j < sortedItems.length; j++) {
            if (j === sIdx) continue;
            const peer = sortedItems[j];
            if (peer.direct || peer.cancelled || peer.dateMs === null || peer.evaluatedPrice <= 0) {
              continue;
            }
            if (peer.dateMs === item.dateMs) {
              continue;
            }
            if (Math.abs(peer.dateMs - item.dateMs) <= WINDOW_365_MS) {
              const ratio = peer.evaluatedPrice / item.evaluatedPrice;
              if (ratio >= 0.85 && ratio <= 1.15) {
                isOutlier = false;
                break;
              }
            }
          }
        }
      }

      item.record.isOutlier = isOutlier;
      if (item.direct) {
        item.record.isDirectDeal = true;
      }

      if (!isOutlier && !item.direct && !item.cancelled && item.dateMs !== null && item.evaluatedPrice > 0) {
        confirmedNormals.push({
          dateMs: item.dateMs,
          evaluatedPrice: item.evaluatedPrice
        });
      }
    }
  });

  return records;
}

module.exports = {
  isCancelledTransaction,
  isDirectDeal,
  filterOutliersRolling,
  applyIqrOutlierDetection
};
