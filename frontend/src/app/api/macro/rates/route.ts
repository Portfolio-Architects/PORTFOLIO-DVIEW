import { NextResponse } from 'next/server';
import { MACRO_CONFIG } from '@/lib/macro-summary';

// ECOS API: 시장금리(일일) - 817Y002 (국고채 3년: 010200000)
// ECOS API: 예금은행 대출금리(신규취급액 기준, 월별) - 121Y006 (주택담보대출: BECBLA0302)

export async function GET() {
  const ECOS_API_KEY = process.env.ECOS_API_KEY;
  const FALLBACK_RISK_FREE_RATE = MACRO_CONFIG.macroEnvironment.riskFreeRate;
  const FALLBACK_FUNDING_COST = MACRO_CONFIG.macroEnvironment.fundingCost;

  // 1. API 키가 없으면 바로 Fallback 반환
  if (!ECOS_API_KEY || ECOS_API_KEY === 'pending') {
    return NextResponse.json({
      success: true,
      data: {
        riskFreeRate: FALLBACK_RISK_FREE_RATE,
        fundingCost: FALLBACK_FUNDING_COST,
        source: 'fallback_no_key',
        date: MACRO_CONFIG.macroEnvironment.baseDate
      }
    });
  }

  try {
    const today = new Date();
    
    // [1] 국고채 금리 (일일 데이터, 최근 7일 중 가장 최신)
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    const formatYMD = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}${month}${day}`;
    };

    const startDateDaily = formatYMD(sevenDaysAgo);
    const endDateDaily = formatYMD(today);
    const riskFreeUrl = `https://ecos.bok.or.kr/api/StatisticSearch/${ECOS_API_KEY}/json/kr/1/10/817Y002/D/${startDateDaily}/${endDateDaily}/010200000`;

    // [2] 주택담보대출 금리 (월별 데이터, 최근 6개월 중 가장 최신)
    const sixMonthsAgo = new Date(today);
    sixMonthsAgo.setMonth(today.getMonth() - 6);
    
    const formatYM = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      return `${year}${month}`;
    };

    const startDateMonthly = formatYM(sixMonthsAgo);
    const endDateMonthly = formatYM(today);
    const fundingCostUrl = `https://ecos.bok.or.kr/api/StatisticSearch/${ECOS_API_KEY}/json/kr/1/10/121Y006/M/${startDateMonthly}/${endDateMonthly}/BECBLA0302`;

    // 병렬로 API 호출 (24시간 동안 Next.js 자체 Data Cache 유지)
    const [riskFreeRes, fundingCostRes] = await Promise.all([
      fetch(riskFreeUrl, { cache: 'no-store' }),
      fetch(fundingCostUrl, { cache: 'no-store' })
    ]);

    let riskFreeRate = FALLBACK_RISK_FREE_RATE;
    let fundingCost = FALLBACK_FUNDING_COST;
    let riskFreeDateStr = MACRO_CONFIG.macroEnvironment.baseDate.replace(/-/g, '');
    let isLive = false;

    if (riskFreeRes.ok) {
      const riskData = await riskFreeRes.json();
      if (riskData.StatisticSearch && riskData.StatisticSearch.row && riskData.StatisticSearch.row.length > 0) {
        const latest = riskData.StatisticSearch.row[riskData.StatisticSearch.row.length - 1];
        riskFreeRate = parseFloat(latest.DATA_VALUE);
        riskFreeDateStr = latest.TIME; // YYYYMMDD
        isLive = true;
      }
    }

    if (fundingCostRes.ok) {
      const fundingData = await fundingCostRes.json();
      if (fundingData.StatisticSearch && fundingData.StatisticSearch.row && fundingData.StatisticSearch.row.length > 0) {
        const latest = fundingData.StatisticSearch.row[fundingData.StatisticSearch.row.length - 1];
        fundingCost = parseFloat(latest.DATA_VALUE);
        isLive = true;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        riskFreeRate,
        fundingCost,
        source: isLive ? 'ecos_live' : 'fallback_error',
        date: riskFreeDateStr.length >= 8 
          ? `${riskFreeDateStr.substring(0,4)}-${riskFreeDateStr.substring(4,6)}-${riskFreeDateStr.substring(6,8)}`
          : MACRO_CONFIG.macroEnvironment.baseDate
      }
    });

  } catch (error) {
    console.error('Failed to fetch from ECOS API:', error);
    // 호출 실패 시 서버 다운을 막기 위한 Fallback
    return NextResponse.json({
      success: true,
      data: {
        riskFreeRate: FALLBACK_RISK_FREE_RATE,
        fundingCost: FALLBACK_FUNDING_COST,
        source: 'fallback_error',
        date: MACRO_CONFIG.macroEnvironment.baseDate
      }
    });
  }
}
