import { NextRequest } from 'next/server';
import { fetchSheetJisanStatus } from '@/lib/services/googleSheets';
import { logger } from '@/lib/services/logger';
import { apiSuccess, apiError } from '@/lib/api/apiResponse';
import { checkRateLimit } from '@/lib/api/rateLimiter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const rateLimit = await checkRateLimit(request, {
      prefix: 'ratelimit_jisanstatus',
      requestsPerLimit: 60,
    });
    if (!rateLimit.success) {
      logger.warn('JisanStatusAPI.GET', 'Rate limit exceeded');
      return rateLimit.response || apiError('RATE_LIMIT_EXCEEDED', 'Too Many Requests', 429);
    }

    const { searchParams } = request.nextUrl;
    const bypassCache = searchParams.get('refresh') === 'true';
    const statusFilter = searchParams.get('status')?.trim() || '';
    const query = searchParams.get('q')?.trim().toLowerCase() || '';
    const dongFilter = searchParams.get('dong')?.trim() || '';

    let centers = await fetchSheetJisanStatus(bypassCache);

    const total = centers.length;
    const completedCount = centers.filter((c) => c.buildingStatus === '건축완료').length;
    const underConstructionCount = centers.filter((c) => c.buildingStatus === '건축중').length;
    const notStartedCount = centers.filter((c) => c.buildingStatus === '미착공').length;

    // Apply filtering if query params are present
    if (statusFilter) {
      centers = centers.filter((c) => c.buildingStatus === statusFilter);
    }

    if (dongFilter) {
      centers = centers.filter((c) => c.roadAddress.includes(dongFilter) || c.jibunAddress.includes(dongFilter));
    }

    if (query) {
      centers = centers.filter((c) =>
        c.name.toLowerCase().includes(query) ||
        c.companyName.toLowerCase().includes(query) ||
        c.developer.toLowerCase().includes(query) ||
        c.builder.toLowerCase().includes(query) ||
        c.roadAddress.toLowerCase().includes(query) ||
        c.jibunAddress.toLowerCase().includes(query)
      );
    }

    return apiSuccess(
      centers,
      {
        total,
        completedCount,
        underConstructionCount,
        notStartedCount,
        filteredTotal: centers.length,
        centers,
        source: 'google-sheets-ssot',
        message: '화성시 동탄 지식산업센터 현황 (구글 시트 SSOT) 조회가 완료되었습니다.',
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=3600, stale-while-revalidate=600',
        },
      }
    );
  } catch (error: unknown) {
    logger.error('JisanStatusAPI.GET', 'Failed to fetch 지식산업센터_현황', {}, error as Error);
    return apiError('JISAN_STATUS_FAILED', 'Failed to fetch Jisan Status', 500, { centers: [] });
  }
}
