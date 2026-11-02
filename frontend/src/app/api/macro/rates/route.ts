import { NextRequest } from 'next/server';
import { MACRO_CONFIG } from '@/lib/macro-summary';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';
import { apiSuccess, apiError } from '@/lib/api/apiResponse';
import { checkRateLimit } from '@/lib/api/rateLimiter';
import { resilientFetchJson } from '@/lib/api/resilientFetch';
import { redis } from '@/lib/redis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const MACRO_RATES_REDIS_KEY = 'DTDLS:cache:macroRates';
export const MACRO_RATES_REDIS_TTL_SEC = 21600; // 6 hours
export const MACRO_RATES_CACHE_CONTROL = 'public, s-maxage=3600, stale-while-revalidate=21600';

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

export interface MacroRatesPayload {
  riskFreeRate: number;
  fundingCost: number;
  fundingCostRate?: number;
  source: string;
  date: string;
}

export async function GET(request: NextRequest) {
  const ECOS_API_KEY = process.env.ECOS_API_KEY;
  const FALLBACK_RISK_FREE_RATE = MACRO_CONFIG.macroEnvironment.riskFreeRate;
  const FALLBACK_FUNDING_COST = MACRO_CONFIG.macroEnvironment.fundingCost;

  // 1. IP 속도 제한 (Rate Limiting) 가드
  const rateLimit = await checkRateLimit(request, {
    prefix: 'ratelimit_macro_rates',
    requestsPerLimit: 60,
  });
  if (!rateLimit.success) {
    logger.warn('MacroRatesAPI.GET', 'Rate limit exceeded');
    return rateLimit.response || apiError('RATE_LIMIT_EXCEEDED', 'Too Many Requests', 429);
  }

  const { searchParams } = request.nextUrl;
  const parsedQuery = macroRatesQuerySchema.safeParse({
    refresh: searchParams.get('refresh') || undefined,
  });

  if (!parsedQuery.success) {
    logger.warn('MacroRatesAPI.GET', 'Invalid query parameters', {
      errors: parsedQuery.error.format(),
    });
    return apiError('BAD_REQUEST', 'Bad Request', 400);
  }

  const bypassCache = parsedQuery.data.refresh;

  // 2. Check 6-hour Upstash Redis cache first unless refresh=1 (P2-4 & B15)
  if (!bypassCache && redis) {
    try {
      const cached = await redis.get<MacroRatesPayload>(MACRO_RATES_REDIS_KEY);
      if (
        cached &&
        typeof cached === 'object' &&
        typeof cached.riskFreeRate === 'number' &&
        typeof cached.fundingCost === 'number'
      ) {
        return apiSuccess(
          {
            ...cached,
            source: 'BOK_ECOS_REDIS_CACHE',
          },
          { cached: true },
          {
            headers: {
              'Cache-Control': MACRO_RATES_CACHE_CONTROL,
            },
          }
        );
      }
    } catch (cacheErr) {
      logger.warn('MacroRatesAPI.GET', 'Redis cache read failed; falling back to ECOS API', {
        error: cacheErr instanceof Error ? cacheErr.message : String(cacheErr),
      });
    }
  }

  // 3. API 키가 없으면 바로 Fallback 반환
  if (!ECOS_API_KEY || ECOS_API_KEY === 'pending') {
    return apiSuccess(
      {
        riskFreeRate: FALLBACK_RISK_FREE_RATE,
        fundingCost: FALLBACK_FUNDING_COST,
        fundingCostRate: FALLBACK_FUNDING_COST,
        source: 'fallback_no_key',
        date: MACRO_CONFIG.macroEnvironment.baseDate,
      },
      undefined,
      {
        headers: {
          'Cache-Control': MACRO_RATES_CACHE_CONTROL,
        },
      }
    );
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

    // P2-4 & B15: Parallelize both ECOS fetches via Promise.all with individual exception isolation
    const [riskData, fundingData] = await Promise.all([
      resilientFetchJson<unknown>(riskFreeUrl, { timeoutMs: 3000, retries: 1 }).catch((err) => {
        logger.warn('MacroRatesAPI.GET', 'Failed to fetch risk-free rate from ECOS', {}, err as Error);
        return null;
      }),
      resilientFetchJson<unknown>(fundingCostUrl, { timeoutMs: 3000, retries: 1 }).catch((err) => {
        logger.warn('MacroRatesAPI.GET', 'Failed to fetch funding cost from ECOS', {}, err as Error);
        return null;
      }),
    ]);

    if (riskData !== null) {
      const parsedRisk = ecosResponseSchema.safeParse(riskData);
      if (parsedRisk.success) {
        const rows = parsedRisk.data.StatisticSearch.row;
        const latest = rows[rows.length - 1];
        if (latest && latest.DATA_VALUE) {
          const val = parseFloat(latest.DATA_VALUE);
          if (!isNaN(val)) {
            riskFreeRate = val;
            riskFreeDateStr = latest.TIME || riskFreeDateStr;
            isLiveRiskFree = true;
          }
        }
      } else {
        logger.warn('MacroRatesAPI.GET', 'Invalid risk-free rate ECOS response structure', {
          errors: parsedRisk.error.format(),
        });
      }
    }

    if (fundingData !== null) {
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
          errors: parsedFunding.error.format(),
        });
      }
    }

    const isLive = isLiveRiskFree || isLiveFundingCost;
    const source =
      isLiveRiskFree && isLiveFundingCost
        ? 'ecos_live'
        : isLive
          ? 'ecos_partial_live'
          : 'fallback_error';

    const payload: MacroRatesPayload = {
      riskFreeRate,
      fundingCost,
      fundingCostRate: fundingCost,
      source,
      date:
        riskFreeDateStr.length >= 8
          ? `${riskFreeDateStr.substring(0, 4)}-${riskFreeDateStr.substring(4, 6)}-${riskFreeDateStr.substring(6, 8)}`
          : MACRO_CONFIG.macroEnvironment.baseDate,
    };

    if (isLive && redis) {
      try {
        await redis.set(MACRO_RATES_REDIS_KEY, payload, { ex: MACRO_RATES_REDIS_TTL_SEC });
      } catch (setErr) {
        logger.warn('MacroRatesAPI.GET', 'Redis cache write failed', {
          error: setErr instanceof Error ? setErr.message : String(setErr),
        });
      }
    }

    return apiSuccess(payload, undefined, {
      headers: {
        'Cache-Control': MACRO_RATES_CACHE_CONTROL,
      },
    });
  } catch (error) {
    logger.error('MacroRatesAPI.GET', 'Failed to execute macro rates API process', {}, error as Error);
    return apiSuccess(
      {
        riskFreeRate: FALLBACK_RISK_FREE_RATE,
        fundingCost: FALLBACK_FUNDING_COST,
        fundingCostRate: FALLBACK_FUNDING_COST,
        source: 'fallback_error',
        date: MACRO_CONFIG.macroEnvironment.baseDate,
      },
      undefined,
      {
        headers: {
          'Cache-Control': MACRO_RATES_CACHE_CONTROL,
        },
      }
    );
  }
}
