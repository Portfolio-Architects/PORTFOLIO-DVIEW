import { NextRequest } from 'next/server';
import { requestGoogleIndexing } from '@/lib/utils/server/googleIndexing';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';
import { redis } from '@/lib/redis';
import { buildInitialApartments } from '@/lib/dong-apartments';
import { apiSuccess, apiError } from '@/lib/api/apiResponse';
import { checkRateLimit } from '@/lib/api/rateLimiter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const IndexingInputSchema = z.object({
  apartmentName: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const rateLimit = await checkRateLimit(request, {
      prefix: 'ratelimit_indexing_apartment',
      requestsPerLimit: 60,
    });
    if (!rateLimit.success) {
      return rateLimit.response || apiError('RATE_LIMIT_EXCEEDED', 'Too Many Requests', 429);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError('BAD_REQUEST', 'Bad Request: Invalid JSON', 400);
    }

    const parsed = IndexingInputSchema.safeParse(body);

    if (!parsed.success) {
      logger.warn('ApartmentIndexingAPI.POST', 'Invalid indexing payload', { errors: parsed.error.format() });
      return apiError('INVALID_PAYLOAD', 'Invalid request payload', 400, parsed.error.issues);
    }

    const { apartmentName } = parsed.data;

    // Validate that the apartment exists in our database
    const apartmentsData = buildInitialApartments();
    const allApartments = Object.values(apartmentsData).flat();
    const isValidApartment = allApartments.some((apt) => apt.name === apartmentName);

    if (!isValidApartment) {
      logger.warn('ApartmentIndexingAPI.POST', 'Attempted to index non-existent apartment', { apartmentName });
      return apiError('NOT_FOUND', 'Apartment not found in database', 404);
    }

    // Redis Throttling to protect daily quota (max 1 request per hour per apartment)
    const throttleKey = `dtdls:indexing:throttle:${encodeURIComponent(apartmentName)}`;

    if (redis) {
      try {
        const isThrottled = await redis.get(throttleKey);
        if (isThrottled) {
          logger.info('ApartmentIndexingAPI.POST', 'Throttling active for apartment. Skipping Search Console API call.', { apartmentName });
          return apiSuccess({
            message: 'Bypassed: Throttling active to prevent daily quota exhaustion',
            throttled: true,
          }, {
            message: 'Bypassed: Throttling active to prevent daily quota exhaustion',
            throttled: true,
          });
        }
      } catch (err) {
        logger.error('ApartmentIndexingAPI.POST', 'Redis read error during throttle check', { apartmentName }, err as Error);
      }
    }

    // Set throttle in Redis (1 hour TTL)
    if (redis) {
      try {
        await redis.set(throttleKey, 'true', { ex: 3600 });
      } catch (err) {
        logger.error('ApartmentIndexingAPI.POST', 'Redis write error during throttle set', { apartmentName }, err as Error);
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dongtanview.com';
    const targetUrl = `${baseUrl}/apartment/${encodeURIComponent(apartmentName)}`;

    const result = await requestGoogleIndexing(targetUrl, 'URL_UPDATED');
    logger.info('ApartmentIndexingAPI.POST', 'Successfully requested Google Indexing for apartment UGC', { apartmentName, targetUrl, result });

    return apiSuccess(result, typeof result === 'object' && result !== null ? (result as Record<string, unknown>) : undefined);
  } catch (error: unknown) {
    logger.error('ApartmentIndexingAPI.POST', 'Error during Google Indexing request', {}, error as Error);
    return apiError('INDEXING_FAILED', 'Failed to request indexing', 500);
  }
}
