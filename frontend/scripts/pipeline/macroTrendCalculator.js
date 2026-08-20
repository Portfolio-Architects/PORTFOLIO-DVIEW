/**
 * 📈 Macro Trend Calculator Module
 * 
 * - initMacroTrendData: initializes 18-year (216 months) trend buckets
 * - accumulateMacroTrend: accumulates standard basket transactions into buckets
 * - calculateRecent7DaysVolume: computes WoW volume and trend direction
 * - generateMacroTrendSeries: produces smoothed 18-year macro trend series
 */

/**
 * 18년(216개월) 거시 트렌드 수집용 객체 초기화
 * @param {number} [monthsToSync=216] - 동기화 월 수 (기본 18년 = 216개월)
 * @param {number} [reportingLagMonths=2] - 실거래 신고 지연 보정 오프셋 (기본 2개월)
 * @param {Date} [baseDate=new Date()] - 기준 일자
 * @returns {{ macroTrendData: Object, trendMonths: string[] }}
 */
function initMacroTrendData(monthsToSync = 216, reportingLagMonths = 2, baseDate = new Date()) {
  const macroTrendData = {};
  const trendMonths = [];

  for (let i = monthsToSync - 1; i >= 0; i--) {
    const d = new Date(baseDate.getFullYear(), baseDate.getMonth() - reportingLagMonths - i, 1);
    const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
    const yy = String(d.getFullYear()).slice(-2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const label = `${yy}.${mm}`; // 23.01 형식
    macroTrendData[ym] = { name: label, sumPrice: 0, aptCount: 0, sumJeonse: 0, jeonseCount: 0 };
    trendMonths.push(ym);
  }

  return { macroTrendData, trendMonths };
}

/**
 * 상수 바스켓 지수(Constant Basket Index): 국민평형(30~36평) 단지들의 각 월별 최신 실거래가를 누적
 * @param {Object} macroTrendData - 트렌드 데이터 객체
 * @param {string[]} trendMonths - 트렌드 연월 배열
 * @param {Array<Object>} saleTxs - 매매 거래 목록
 * @param {Array<Object>} rentTxs - 전월세 거래 목록
 */
function accumulateMacroTrend(macroTrendData, trendMonths, saleTxs, rentTxs) {
  // 동탄 전체 매매 가격 지수
  const standardTxs = saleTxs.filter(t => 
    t.areaPyeong >= 30 && 
    t.areaPyeong <= 36 &&
    t.contractYm &&
    t.contractYm.length === 6 &&
    /^\d{6}$/.test(t.contractYm)
  );
  standardTxs.sort((a, b) => (b.contractDate || '').localeCompare(a.contractDate || ''));

  if (standardTxs.length > 0) {
    trendMonths.forEach(ym => {
      const latestTx = standardTxs.find(t => t.contractYm <= ym);
      if (latestTx && typeof latestTx.price === 'number') {
        macroTrendData[ym].sumPrice += latestTx.price;
        macroTrendData[ym].aptCount += 1;
      }
    });
  }

  // 동탄 전체 전세 가격 지수
  const standardJeonseTxs = rentTxs.filter(t => 
    t.areaPyeong >= 30 && 
    t.areaPyeong <= 36 && 
    (t.deposit || 0) > 0 && 
    (!t.monthlyRent || t.monthlyRent === 0) &&
    t.contractYm &&
    t.contractYm.length === 6 &&
    /^\d{6}$/.test(t.contractYm)
  );
  standardJeonseTxs.sort((a, b) => (b.contractDate || '').localeCompare(a.contractDate || ''));

  if (standardJeonseTxs.length > 0) {
    trendMonths.forEach(ym => {
      const latestTx = standardJeonseTxs.find(t => t.contractYm <= ym);
      if (latestTx && typeof latestTx.deposit === 'number') {
        macroTrendData[ym].sumJeonse += latestTx.deposit;
        macroTrendData[ym].jeonseCount += 1;
      }
    });
  }
}

/**
 * 최근 7일 거래량 및 WoW 추세 계산 (전체 매매 거래 기준)
 * @param {Array<Object>} allSaleTxs - 전체 매매 거래 목록
 * @param {Function} parseDateFn - YYYYMMDD 파싱 함수
 * @returns {Object} { currentCount, prevCount, trendText, trendColor, badge }
 */
function calculateRecent7DaysVolume(allSaleTxs, parseDateFn) {
  let maxDateTime = 0;
  allSaleTxs.forEach(t => {
    const dt = parseDateFn(t.contractDate);
    if (dt) {
      const time = dt.getTime();
      if (time > maxDateTime) {
        maxDateTime = time;
      }
    }
  });

  if (maxDateTime === 0) {
    maxDateTime = new Date().getTime(); // fallback
  }

  const limit7 = 7 * 24 * 60 * 60 * 1000;
  const cutoff7 = maxDateTime - limit7;
  const cutoff14 = maxDateTime - 2 * limit7;
  let currentCount = 0;
  let prevCount = 0;

  allSaleTxs.forEach(t => {
    const dt = parseDateFn(t.contractDate);
    if (dt) {
      const time = dt.getTime();
      if (time >= cutoff7) {
        currentCount++;
      } else if (time >= cutoff14) {
        prevCount++;
      }
    }
  });

  const diff = currentCount - prevCount;
  const rate = prevCount > 0 ? (diff / prevCount) * 100 : 0;
  const isUp = diff > 0;
  const isDown = diff < 0;
  let trendText = "보합 (0%)";
  let trendColor = "#94a3b8";

  if (isUp) {
    trendText = `상승 (+${rate.toFixed(1)}%)`;
    trendColor = "#ff4b5c";
  } else if (isDown) {
    trendText = `하락 (${rate.toFixed(1)}%)`;
    trendColor = "#2e7cf6";
  }

  return {
    currentCount,
    prevCount,
    trendText,
    trendColor,
    badge: `${diff >= 0 ? "+" : ""}${diff}건 (${diff >= 0 ? "+" : ""}${rate.toFixed(0)}%)`,
  };
}

/**
 * 억 단위 변환 및 폴백 처리를 거친 거시 트렌드 시계열 배열 생성
 * @param {Object} macroTrendData - 트렌드 데이터 객체
 * @param {string[]} trendMonths - 트렌드 연월 배열
 * @returns {Array<{ name: string, '동탄 아파트 전체': number, '동탄 아파트 전세 평균': number }>}
 */
function generateMacroTrendSeries(macroTrendData, trendMonths) {
  let lastValidPrice = 0;
  let lastValidJeonse = 0;

  return trendMonths.map(ym => {
    const data = macroTrendData[ym] || { name: ym, aptCount: 0, sumPrice: 0, jeonseCount: 0, sumJeonse: 0 };
    let avgPriceMan = data.aptCount > 0 ? data.sumPrice / data.aptCount : 0;
    let avgJeonseMan = data.jeonseCount > 0 ? data.sumJeonse / data.jeonseCount : 0;
    
    if (avgPriceMan === 0 && lastValidPrice > 0) {
      avgPriceMan = lastValidPrice; // 거래가 아직 없는 최근 월은 직전 월 데이터로 폴백
    } else if (avgPriceMan > 0) {
      lastValidPrice = avgPriceMan;
    }

    if (avgJeonseMan === 0 && lastValidJeonse > 0) {
      avgJeonseMan = lastValidJeonse; // 거래가 아직 없는 최근 월은 직전 월 데이터로 폴백
    } else if (avgJeonseMan > 0) {
      lastValidJeonse = avgJeonseMan;
    }
    
    // 억 단위 변환 (예: 53200 만원 -> 53.2 억 -> 5.3)
    const avgPriceEok = Math.round(avgPriceMan / 1000) / 10;
    const avgJeonseEok = Math.round(avgJeonseMan / 1000) / 10;
    return {
      name: data.name,
      '동탄 아파트 전체': avgPriceEok,
      '동탄 아파트 전세 평균': avgJeonseEok
    };
  });
}

module.exports = {
  initMacroTrendData,
  accumulateMacroTrend,
  calculateRecent7DaysVolume,
  generateMacroTrendSeries
};
