import { NextRequest, NextResponse } from 'next/server';
import { MACRO_CONFIG } from '@/lib/macro-summary';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';
import { rateLimiter } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// ECOS API: 시장금리(일일) - 817Y002 (국고채 3년: 010200000)
// ECOS API: 예금은행 대출금리(신규취급액 기준, 월별) - 121Y006 (주택담보대출: BECBLA0302)

const macroRatesQuerySchema = z.object({
  refresh: z.string().optional().transform((v) => v === '1'),
});

const ecosRowSchema = z.object({
  DATA_VALUE: z.string(),
  TIME: z.string().optional(),
});

const ecosResponseSchema = z.object({
  StatisticSearch: z.object({
    row: z.array(ecosRowSchema),
  }),
});

async function fetchWithTimeout(url: string, timeoutMs: number = 3000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      cache: 'no-store',
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

export async function GET(request: NextRequest) {
  const ECOS_API_KEY = process.env.ECOS_API_KEY;
  const FALLBACK_RISK_FREE_RATE = MACRO_CONFIG.macroEnvironment.riskFreeRate;
  const FALLBACK_FUNDING_COST = MACRO_CONFIG.macroEnvironment.fundingCost;

  // 1. IP 속도 제한 (Rate Limiting) 가드
  if (rateLimiter) {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const rawIp = realIp || forwarded?.split(',')[0]?.trim() || '127.0.0.1';
    const { success } = await rateLimiter.limit(`ratelimit_macrorates_${rawIp}`);
    if (!success) {
      logger.warn('MacroRatesAPI.GET', 'Rate limit exceeded', { ip: rawIp });
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
    }
  }

  const { searchParams } = request.nextUrl;
  const parsedQuery = macroRatesQuerySchema.safeParse({
    refresh: searchParams.get('refresh') || undefined,
  });

  if (!parsedQuery.success) {
    logger.warn('MacroRatesAPI.GET', 'Invalid query parameters', {
      errors: parsedQuery.error.format(),
    });
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
  }

  // 2. API 키가 없으면 바로 Fallback 반환
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

    let riskFreeRate = FALLBACK_RISK_FREE_RATE;
    let fundingCost = FALLBACK_FUNDING_COST;
    let riskFreeDateStr = MACRO_CONFIG.macroEnvironment.baseDate.replace(/-/g, '');
    let isLiveRiskFree = false;
    let isLiveFundingCost = false;

    // 국고채 금리 개별 fetch (예외 격리)
    try {
      const riskFreeRes = await fetchWithTimeout(riskFreeUrl, 3000);
      if (riskFreeRes.ok) {
        const riskData = await riskFreeRes.json();
        const parsedRisk = ecosResponseSchema.safeParse(riskData);
        if (parsedRisk.success) {
          const rows = parsedRisk.data.StatisticSearch.row;
          const latest = rows[rows.length - 1];
          if (latest && latest.DATA_VALUE) {
            const val = parseFloat(latest.DATA_VALUE);
            if (!isNaN(val)) {
              riskFreeRate = val;
              riskFreeDateStr = latest.TIME || riskFreeDateStr; // YYYYMMDD
              isLiveRiskFree = true;
            }
          }
        } else {
          logger.warn('MacroRatesAPI.GET', 'Invalid risk-free rate ECOS response structure', {
            errors: parsedRisk.error.format()
          });
        }
      } else {
        logger.warn('MacroRatesAPI.GET', 'Risk-free rate ECOS API returned non-ok status', { status: riskFreeRes.status });
      }
    } catch (err) {
      logger.warn('MacroRatesAPI.GET', 'Failed to fetch risk-free rate from ECOS', {}, err as Error);
    }

    // 주택담보대출 금리 개별 fetch (예외 격리)
    try {
      const fundingCostRes = await fetchWithTimeout(fundingCostUrl, 3000);
      if (fundingCostRes.ok) {
        const fundingData = await fundingCostRes.json();
        const parsedFunding = ecosResponseSchema.safeParse(fundingData);
        if (parsedFunding.success) {
          const rows = parsedFunding.data.StatisticSearch.row;
          const latest = rows[rows.length - 1];
          if (latest && latest.DATA_VALUE) {
            const val = parseFloat(latest.DATA_VALUE);
            if (!isNaN(val)) {
              fundingCost = val;
              isLiveFundingCost = true;
            }
          }
        } else {
          logger.warn('MacroRatesAPI.GET', 'Invalid funding cost ECOS response structure', {
            errors: parsedFunding.error.format()
          });
        }
      } else {
        logger.warn('MacroRatesAPI.GET', 'Funding cost ECOS API returned non-ok status', { status: fundingCostRes.status });
      }
    } catch (err) {
      logger.warn('MacroRatesAPI.GET', 'Failed to fetch funding cost from ECOS', {}, err as Error);
    }

    const isLive = isLiveRiskFree || isLiveFundingCost;
    const source = isLiveRiskFree && isLiveFundingCost 
      ? 'ecos_live' 
      : isLive ? 'ecos_partial_live' : 'fallback_error';

    return NextResponse.json({
      success: true,
      data: {
        riskFreeRate,
        fundingCost,
        source,
        date: riskFreeDateStr.length >= 8 
          ? `${riskFreeDateStr.substring(0,4)}-${riskFreeDateStr.substring(4,6)}-${riskFreeDateStr.substring(6,8)}`
          : MACRO_CONFIG.macroEnvironment.baseDate
      }
    });

  } catch (error) {
    logger.error('MacroRatesAPI.GET', 'Failed to execute macro rates API process', {}, error as Error);
    // 전체 프로세스 오류 시 Fallback 반환
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
