import { getInitialData } from '@/lib/services/dashboardData';
import { logger } from '@/lib/services/logger';
import { apiSuccess, apiError } from '@/lib/api/apiResponse';

export const MACRO_DASHBOARD_CACHE_CONTROL = 'public, s-maxage=300, stale-while-revalidate=600';

export async function GET() {
  try {
    const data = await getInitialData();
    return apiSuccess(data, undefined, {
      headers: {
        'Cache-Control': MACRO_DASHBOARD_CACHE_CONTROL,
      },
    });
  } catch (err) {
    logger.error('api/dashboard-init', 'Failed to fetch dashboard init data', {}, err as Error);
    return apiError('SERVER_ERROR', 'Failed to fetch dashboard init data', 500);
  }
}
