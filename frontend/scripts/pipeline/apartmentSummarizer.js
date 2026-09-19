/**
 * 🏢 Apartment Summarizer Module
 * 
 * - calculateApartmentSummary: generates price metrics, 1M/3M averages, min/max, rent summaries
 * - formatRecentTransactions: generates flat 90-day recent transactions array
 * - formatPriceEok / parseYYYYMMDD / normalizeAptName helper utilities
 */

/**
 * 만원 단위 가격을 'X억 Y만' 포맷 문자열로 변환
 * @param {number} priceMan - 만원 단위 가격
 * @returns {string}
 */
function formatPriceEok(priceMan) {
  if (typeof priceMan !== 'number' || isNaN(priceMan)) return '0';
  const eok = Math.floor(priceMan / 10000);
  const remainder = priceMan % 10000;
  if (eok === 0) return `${priceMan.toLocaleString()}만`;
  if (remainder === 0) return `${eok}억`;
  return `${eok}억${remainder.toLocaleString()}`;
}

/**
 * 8자리 문자열(YYYYMMDD)을 Date 객체로 변환
 * @param {string} str - YYYYMMDD 형태 문자열
 * @returns {Date|null}
 */
function parseYYYYMMDD(str) {
  if (!str || str.length !== 8) return null;
  const y = parseInt(str.substring(0, 4), 10);
  const m = parseInt(str.substring(4, 6), 10) - 1;
  const d = parseInt(str.substring(6, 8), 10);
  const dt = new Date(y, m, d);
  return isNaN(dt.getTime()) ? null : dt;
}

/**
 * 아파트명 정규화 (공백·괄호·[동이름] 제거)
 * @param {string} name - 아파트 원본명
 * @returns {string}
 */
function normalizeAptName(name) {
  if (!name) return '';
  return name
    .replace(/\[.*?\]\s*/g, '')
    .replace(/\s+/g, '')
    .replace(/[()（）]/g, '')
    .trim();
}

/**
 * 거래 취소/해제 여부 판별 유틸리티
 * @param {Object} t - 실거래 레코드
 * @returns {boolean} 취소/해제 거래 여부
 */
function isCancelledTransaction(t) {
  if (!t) return false;
  if (t.isCanceled === true) return true;
  if (t.cdealType === 'O' || t.cdealType === '해제') return true;
  
  const isInvalidDate = (v) => {
    if (v === null || v === undefined) return true;
    const s = String(v).trim().toLowerCase();
    return !s || s === '-' || s === 'null' || s === 'undefined' || s === 'nan';
  };

  if (!isInvalidDate(t.cancelDate)) return true;
  if (!isInvalidDate(t.cdealDay)) return true;

  return false;
}

/**
 * 단일 아파트 단지의 매매/전월세 통합 요약 통계 계산
 * 계약 해제/취소 거래는 통계 산출에서 전면 배제됩니다.
 * @param {string|Array<Object>} aptName - 아파트명 또는 거래 목록
 * @param {Array<Object>|string} saleTxs - 아파트 매매 거래 목록 또는 아파트명
 * @param {Array<Object>} [rentTxs] - 아파트 전월세 거래 목록
 * @param {Object} [dongMap={}] - 법정동 매핑 테이블
 * @param {Date} [now=new Date()] - 기준 일자
 * @returns {Object} 아파트 통계 요약 객체
 */
function calculateApartmentSummary(aptName, saleTxs, rentTxs = [], dongMap = {}, now = new Date()) {
  let targetAptName = aptName;
  let rawSaleTxs = saleTxs;
  let rawRentTxs = rentTxs;
  let targetDongMap = dongMap;
  let targetNow = now;

  if (Array.isArray(aptName)) {
    // calculateApartmentSummary(txs, targetAptName)
    targetAptName = saleTxs || '';
    rawSaleTxs = aptName.filter(t => t.dealType !== '전세' && t.dealType !== '월세');
    rawRentTxs = aptName.filter(t => t.dealType === '전세' || t.dealType === '월세');
    targetDongMap = rentTxs || {};
    targetNow = dongMap instanceof Date ? dongMap : new Date();
  }

  // 취소/해제 거래 원천 배제
  const validSaleTxs = (rawSaleTxs || []).filter(t => !isCancelledTransaction(t));
  const validRentTxs = (rawRentTxs || []).filter(t => !isCancelledTransaction(t));

  const prices = validSaleTxs.map(t => t.price).filter(p => typeof p === 'number' && p > 0);
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;

  // 면적별 정렬 및 변동성(delta), 신고가(isNewHigh) 선계산
  const saleTxsForDeltas = [...validSaleTxs];
  const areaGroups = {};
  saleTxsForDeltas.forEach(t => {
    const areaKey = t.area ? (Math.round(t.area * 100) / 100).toFixed(2) : 'default';
    if (!areaGroups[areaKey]) areaGroups[areaKey] = [];
    areaGroups[areaKey].push(t);
  });

  Object.values(areaGroups).forEach(group => {
    group.sort((a, b) => {
      const dateComp = (a.contractDate || '').localeCompare(b.contractDate || '');
      if (dateComp !== 0) return dateComp;
      const floorComp = (a.floor || 0) - (b.floor || 0);
      if (floorComp !== 0) return floorComp;
      return (a.price || 0) - (b.price || 0);
    });

    let currentMax = 0;
    group.forEach((item, index) => {
      let isNewHigh = false;
      let newHighDelta = 0;
      let prevPriceVal = 0;
      let delta = 0;
      let deltaPercent = 0;

      if (index === 0) {
        currentMax = item.price || 0;
      } else {
        if ((item.price || 0) > currentMax) {
          isNewHigh = true;
          newHighDelta = (item.price || 0) - currentMax;
          currentMax = item.price || 0;
        }
        const prev = group[index - 1];
        prevPriceVal = prev.price || 0;
        delta = (item.price || 0) - (prev.price || 0);
        deltaPercent = prevPriceVal > 0 ? Math.round(((delta / prevPriceVal) * 100) * 10) / 10 : 0;
      }

      item.isNewHigh = isNewHigh;
      item.newHighDelta = newHighDelta;
      item.prevPriceVal = prevPriceVal;
      item.delta = delta;
      item.deltaPercent = deltaPercent;
    });
  });

  // contractDate 기준으로 내림차순 정렬
  validSaleTxs.sort((a, b) => (b.contractDate || '').localeCompare(a.contractDate || ''));
  const latestTx = validSaleTxs.length > 0 ? validSaleTxs[0] : null;

  let saleBaseDate = targetNow;
  if (latestTx && latestTx.contractDate) {
    const dt = parseYYYYMMDD(latestTx.contractDate);
    if (dt) saleBaseDate = dt;
  }

  const oneMonthAgoSale = new Date(saleBaseDate.getFullYear(), saleBaseDate.getMonth() - 1, saleBaseDate.getDate());
  const threeMonthsAgoSale = new Date(saleBaseDate.getFullYear(), saleBaseDate.getMonth() - 3, saleBaseDate.getDate());

  const recentMonthSale = validSaleTxs.filter(t => {
    if (!t.contractYm || t.contractYm.length < 6) return false;
    const y = parseInt(t.contractYm.slice(0, 4), 10);
    const m = parseInt(t.contractYm.slice(4, 6), 10);
    const d = parseInt(t.contractDay, 10) || 1;
    const txDate = new Date(y, m - 1, d);
    return txDate >= oneMonthAgoSale && (t.price || 0) > 0 && (t.areaPyeong || 0) > 0;
  });

  const recent3MonthSale = validSaleTxs.filter(t => {
    if (!t.contractYm || t.contractYm.length < 6) return false;
    const y = parseInt(t.contractYm.slice(0, 4), 10);
    const m = parseInt(t.contractYm.slice(4, 6), 10);
    const d = parseInt(t.contractDay, 10) || 1;
    const txDate = new Date(y, m - 1, d);
    return txDate >= threeMonthsAgoSale && (t.price || 0) > 0 && (t.areaPyeong || 0) > 0;
  });

  let avg1MPriceRaw = 0;
  if (recentMonthSale.length > 0) {
    avg1MPriceRaw = recentMonthSale.reduce((s, t) => s + (t.price || 0), 0) / recentMonthSale.length;
  } else if (latestTx && (latestTx.price || 0) > 0) {
    avg1MPriceRaw = latestTx.price;
  }
  const avg1MPrice = Math.round(avg1MPriceRaw / 100) * 100;
  
  let avg3MPriceRaw = 0;
  if (recent3MonthSale.length > 0) {
    avg3MPriceRaw = recent3MonthSale.reduce((s, t) => s + (t.price || 0), 0) / recent3MonthSale.length;
  } else if (latestTx && (latestTx.price || 0) > 0) {
    avg3MPriceRaw = latestTx.price;
  }
  const avg3MPrice = Math.round(avg3MPriceRaw / 100) * 100;

  let avg1MPerPyeongRaw = 0;
  if (recentMonthSale.length > 0) {
    avg1MPerPyeongRaw = recentMonthSale.reduce((s, t) => s + (t.price || 0) / t.areaPyeong, 0) / recentMonthSale.length;
  } else if (latestTx && (latestTx.areaPyeong || 0) > 0) {
    avg1MPerPyeongRaw = (latestTx.price || 0) / latestTx.areaPyeong;
  }
  const avg1MPerPyeong = Math.round(avg1MPerPyeongRaw);
  
  let avg3MPerPyeongRaw = 0;
  if (recent3MonthSale.length > 0) {
    avg3MPerPyeongRaw = recent3MonthSale.reduce((s, t) => s + (t.price || 0) / t.areaPyeong, 0) / recent3MonthSale.length;
  } else if (latestTx && (latestTx.areaPyeong || 0) > 0) {
    avg3MPerPyeongRaw = (latestTx.price || 0) / latestTx.areaPyeong;
  }
  const avg3MPerPyeong = Math.round(avg3MPerPyeongRaw);

  // --- 전월세 요약 ---
  validRentTxs.sort((a, b) => (b.contractDate || '').localeCompare(a.contractDate || ''));
  const latestRentTx = validRentTxs.filter(t => (t.deposit || 0) > 0)[0];
  
  let rentBaseDate = targetNow;
  const latestRentForBase = validRentTxs.length > 0 ? validRentTxs[0] : null;
  if (latestRentForBase && latestRentForBase.contractDate) {
    const dt = parseYYYYMMDD(latestRentForBase.contractDate);
    if (dt) rentBaseDate = dt;
  }

  const oneMonthAgoRent = new Date(rentBaseDate.getFullYear(), rentBaseDate.getMonth() - 1, rentBaseDate.getDate());
  const threeMonthsAgoRent = new Date(rentBaseDate.getFullYear(), rentBaseDate.getMonth() - 3, rentBaseDate.getDate());

  const recentMonthRent = validRentTxs.filter(t => {
    if (!t.contractYm || t.contractYm.length < 6) return false;
    const y = parseInt(t.contractYm.slice(0, 4), 10);
    const m = parseInt(t.contractYm.slice(4, 6), 10);
    const d = parseInt(t.contractDay, 10) || 1;
    const txDate = new Date(y, m - 1, d);
    return txDate >= oneMonthAgoRent && (t.deposit || 0) > 0; // 전세 위주
  });
  
  const recent3MonthRent = validRentTxs.filter(t => {
    if (!t.contractYm || t.contractYm.length < 6) return false;
    const y = parseInt(t.contractYm.slice(0, 4), 10);
    const m = parseInt(t.contractYm.slice(4, 6), 10);
    const d = parseInt(t.contractDay, 10) || 1;
    const txDate = new Date(y, m - 1, d);
    return txDate >= threeMonthsAgoRent && (t.deposit || 0) > 0;
  });

  const getConvertedDeposit = (t) => (t.deposit || 0) + (t.monthlyRent ? Math.round(t.monthlyRent * 12 / 0.055) : 0);
  
  let avg1MDepositRaw = 0;
  if (recentMonthRent.length > 0) {
    avg1MDepositRaw = recentMonthRent.reduce((s, t) => s + getConvertedDeposit(t), 0) / recentMonthRent.length;
  } else if (latestRentTx && (latestRentTx.deposit || 0) > 0) {
    avg1MDepositRaw = getConvertedDeposit(latestRentTx);
  }
  const avg1MDeposit = Math.round(avg1MDepositRaw / 100) * 100;
  
  let avg3MDepositRaw = 0;
  if (recent3MonthRent.length > 0) {
    avg3MDepositRaw = recent3MonthRent.reduce((s, t) => s + getConvertedDeposit(t), 0) / recent3MonthRent.length;
  } else if (latestRentTx && (latestRentTx.deposit || 0) > 0) {
    avg3MDepositRaw = getConvertedDeposit(latestRentTx);
  }
  const avg3MDeposit = Math.round(avg3MDepositRaw / 100) * 100;

  const maxPriceByArea = {};
  validSaleTxs.forEach(t => {
    if ((t.price || 0) > 0 && (t.area || 0) > 0) {
      const areaKey = (Math.round(t.area * 100) / 100).toFixed(2);
      if (!maxPriceByArea[areaKey] || t.price > maxPriceByArea[areaKey]) {
        maxPriceByArea[areaKey] = t.price;
      }
    }
  });

  // 18개년(2006~2026) 연도별 거래량 집계
  const annualVolumes = {};
  for (let yr = 2006; yr <= 2026; yr++) {
    annualVolumes[String(yr)] = 0;
  }
  validSaleTxs.forEach(t => {
    const yr = t.contractYm ? t.contractYm.slice(0, 4) : '';
    if (annualVolumes[yr] !== undefined) {
      annualVolumes[yr]++;
    }
  });

  // 면적별 최저가 및 장기 상승률 통계
  const minPriceByArea = {};
  validSaleTxs.forEach(t => {
    if ((t.price || 0) > 0 && (t.area || 0) > 0) {
      const areaKey = (Math.round(t.area * 100) / 100).toFixed(2);
      if (!minPriceByArea[areaKey] || t.price < minPriceByArea[areaKey]) {
        minPriceByArea[areaKey] = t.price;
      }
    }
  });

  const earliestTx = validSaleTxs.length > 0 ? validSaleTxs[validSaleTxs.length - 1] : null;
  const earliestPrice = earliestTx ? (earliestTx.price || 0) : 0;
  const earliestDate = earliestTx ? `${earliestTx.contractYm || ''}${earliestTx.contractDay || ''}` : '';
  const currentLatestPrice = latestTx ? (latestTx.price || 0) : 0;
  const appreciationRate = (earliestPrice > 0 && currentLatestPrice > 0)
    ? Math.round(((currentLatestPrice - earliestPrice) / earliestPrice) * 1000) / 10
    : 0;
  const allTimeAppreciationRate = (minPrice > 0 && maxPrice > 0)
    ? Math.round(((maxPrice - minPrice) / minPrice) * 1000) / 10
    : 0;

  const normKey = normalizeAptName(targetAptName);
  const dong = targetDongMap[normKey] || (validSaleTxs.length > 0 ? validSaleTxs[0].dong : (validRentTxs.length > 0 ? validRentTxs[0].dong : '')) || '';

  return {
    // 법정동
    dong,
    // 매매 데이터
    latestPrice: latestTx ? latestTx.price : 0,
    latestPriceEok: latestTx ? (latestTx.priceEok || formatPriceEok(latestTx.price || 0)) : "0",
    latestArea: latestTx ? latestTx.areaPyeong : 0,
    latestFloor: latestTx ? latestTx.floor : 0,
    latestDate: latestTx ? `${latestTx.contractYm || ''}${latestTx.contractDay || ''}` : "",
    maxPrice,
    maxPriceEok: maxPrice > 0 ? formatPriceEok(maxPrice) : "0",
    maxPriceByArea,
    minPrice,
    minPriceEok: minPrice > 0 ? formatPriceEok(minPrice) : "0",
    minPriceByArea,
    allTimeHigh: maxPrice,
    allTimeHighEok: maxPrice > 0 ? formatPriceEok(maxPrice) : "0",
    allTimeLow: minPrice,
    allTimeLowEok: minPrice > 0 ? formatPriceEok(minPrice) : "0",
    annualVolumes,
    appreciationRate,
    allTimeAppreciationRate,
    earliestDate,
    earliestPrice,
    txCount: validSaleTxs.length,
    avg1MPrice,
    avg1MPriceEok: formatPriceEok(avg1MPrice),
    avg1MPerPyeong,
    avg1MTxCount: recentMonthSale.length,
    avg3MPrice,
    avg3MPriceEok: formatPriceEok(avg3MPrice),
    avg3MPerPyeong,
    avg3MTxCount: recent3MonthSale.length,
    
    // 전월세 데이터
    rentTxCount: validRentTxs.length,
    latestRentDeposit: latestRentTx ? getConvertedDeposit(latestRentTx) : 0,
    latestRentDepositEok: latestRentTx ? formatPriceEok(getConvertedDeposit(latestRentTx)) : "0",
    latestRentMonthly: latestRentTx ? latestRentTx.monthlyRent : 0,
    latestRentDate: latestRentTx ? `${latestRentTx.contractYm || ''}${latestRentTx.contractDay || ''}` : "",
    avg1MRentDeposit: avg1MDeposit,
    avg1MRentDepositEok: formatPriceEok(avg1MDeposit),
    avg3MRentDeposit: avg3MDeposit,
    avg3MRentDepositEok: formatPriceEok(avg3MDeposit),
  };
}

/**
 * 최근 90일간의 전체 매매 실거래 플랫 리스트 생성
 * 계약 해제/취소 거래는 결과 피드에서 전면 배제됩니다.
 * @param {Array<Object>} allSaleTxs - 전체 매매 거래 목록
 * @param {Date|Array<string>|Set<string>} [now=new Date()] - 기준 일자 또는 허용 아파트 목록
 * @param {number} [maxCount=1000] - 최대 산출 건수
 * @returns {Array<Object>} 최근 90일 거래 리스트
 */
function formatRecentTransactions(allSaleTxs, now = new Date(), maxCount = 1000) {
  let activeNow = now instanceof Date ? now : new Date();
  let limit = typeof maxCount === 'number' ? maxCount : 1000;
  let allowedApts = null;

  if (Array.isArray(now) || (now && typeof now.has === 'function')) {
    allowedApts = new Set(Array.from(now));
    activeNow = typeof maxCount === 'object' && maxCount instanceof Date ? maxCount : new Date();
    limit = 1000;
  }

  const ninetyDaysAgo = new Date(activeNow.getFullYear(), activeNow.getMonth(), activeNow.getDate() - 90);

  return (allSaleTxs || [])
    .filter(t => !isCancelledTransaction(t))
    .filter(t => {
      if (allowedApts && t.aptName && !allowedApts.has(t.aptName) && !allowedApts.has(normalizeAptName(t.aptName))) {
        return false;
      }
      const dt = parseYYYYMMDD(t.contractDate);
      return dt && dt >= ninetyDaysAgo;
    })
    .sort((a, b) => (b.contractDate || '').localeCompare(a.contractDate || ''))
    .slice(0, limit)
    .map(t => {
      const dt = parseYYYYMMDD(t.contractDate);
      let dateLabel = '';
      if (dt) {
        const month = dt.getMonth() + 1;
        const dateVal = dt.getDate();
        dateLabel = `${month}월 ${dateVal}일`;
      }
      return {
        aptName: t.aptName,
        txKey: normalizeAptName(t.aptName),
        date: `${(t.contractYm || '').slice(4)}.${t.contractDay || ''}`,
        contractDate: t.contractDate,
        priceVal: (t.price || 0) / 10000,
        priceEok: t.priceEok || formatPriceEok(t.price || 0),
        area: t.area,
        areaPyeong: t.areaPyeong,
        floor: t.floor,
        dealType: t.dealType || '매매',
        isNewHigh: !!t.isNewHigh,
        newHighDelta: t.newHighDelta ? t.newHighDelta / 10000 : undefined,
        prevPriceVal: t.prevPriceVal ? t.prevPriceVal / 10000 : undefined,
        delta: t.delta ? t.delta / 10000 : 0,
        deltaPercent: t.deltaPercent || 0,
        dateLabel
      };
    });
}

/**
 * 기간별(90일 / 1년 / 3년 / 전체) 매매 실거래 목록 생성
 * @param {Array<Object>} allSaleTxs - 전체 매매 거래 목록
 * @param {'90d' | '1y' | '3y' | 'all'} [period='90d'] - 대상 기간
 * @param {Date} [now=new Date()] - 기준 일자
 * @param {boolean} [asTuple=false] - 컴팩트 튜플 포맷 여부
 * @returns {Array<Object>|{fields: string[], data: Array<Array>}}
 */
function formatPeriodTransactions(allSaleTxs, period = '90d', now = new Date(), asTuple = false) {
  const activeNow = now instanceof Date ? now : new Date();
  
  let cutoffDate = null;
  if (period === '90d') {
    cutoffDate = new Date(activeNow.getFullYear(), activeNow.getMonth(), activeNow.getDate() - 90);
  } else if (period === '1y') {
    cutoffDate = new Date(activeNow.getFullYear() - 1, activeNow.getMonth(), activeNow.getDate());
  } else if (period === '3y') {
    cutoffDate = new Date(activeNow.getFullYear() - 3, activeNow.getMonth(), activeNow.getDate());
  }

  const filtered = (allSaleTxs || [])
    .filter(t => !isCancelledTransaction(t))
    .filter(t => {
      if (!cutoffDate) return true;
      const dt = parseYYYYMMDD(t.contractDate);
      return dt && dt >= cutoffDate;
    })
    .sort((a, b) => (b.contractDate || '').localeCompare(a.contractDate || ''));

  if (asTuple) {
    const fields = [
      'aptName',
      'txKey',
      'date',
      'contractDate',
      'priceVal',
      'priceEok',
      'area',
      'areaPyeong',
      'floor',
      'dealType',
      'isNewHigh',
      'delta',
      'deltaPercent'
    ];
    const data = filtered.map(t => [
      t.aptName || '',
      normalizeAptName(t.aptName || ''),
      `${(t.contractYm || '').slice(4)}.${t.contractDay || ''}`,
      t.contractDate || '',
      (t.price || 0) / 10000,
      t.priceEok || formatPriceEok(t.price || 0),
      t.area || 0,
      t.areaPyeong || 0,
      t.floor || 0,
      t.dealType || '매매',
      t.isNewHigh ? 1 : 0,
      t.delta ? t.delta / 10000 : 0,
      t.deltaPercent || 0
    ]);
    return { fields, data };
  }

  return filtered.map(t => {
    const dt = parseYYYYMMDD(t.contractDate);
    let dateLabel = '';
    if (dt) {
      const month = dt.getMonth() + 1;
      const dateVal = dt.getDate();
      dateLabel = `${month}월 ${dateVal}일`;
    }
    return {
      aptName: t.aptName,
      txKey: normalizeAptName(t.aptName),
      date: `${(t.contractYm || '').slice(4)}.${t.contractDay || ''}`,
      contractDate: t.contractDate,
      priceVal: (t.price || 0) / 10000,
      priceEok: t.priceEok || formatPriceEok(t.price || 0),
      area: t.area,
      areaPyeong: t.areaPyeong,
      floor: t.floor,
      dealType: t.dealType || '매매',
      isNewHigh: !!t.isNewHigh,
      newHighDelta: t.newHighDelta ? t.newHighDelta / 10000 : undefined,
      prevPriceVal: t.prevPriceVal ? t.prevPriceVal / 10000 : undefined,
      delta: t.delta ? t.delta / 10000 : 0,
      deltaPercent: t.deltaPercent || 0,
      dateLabel
    };
  });
}

module.exports = {
  isCancelledTransaction,
  formatPriceEok,
  parseYYYYMMDD,
  normalizeAptName,
  calculateApartmentSummary,
  formatRecentTransactions,
  formatPeriodTransactions
};
