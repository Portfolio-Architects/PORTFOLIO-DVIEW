import { NextRequest, NextResponse } from 'next/server';
import { requestGoogleIndexing } from '@/lib/utils/server/googleIndexing';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';
import { redis } from '@/lib/redis';
import { buildInitialApartments } from '@/lib/dong-apartments';

export const dynamic = 'force-dynamic';

const IndexingInputSchema = z.object({
  apartmentName: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = IndexingInputSchema.safeParse(body);
    
    if (!parsed.success) {
      logger.warn('ApartmentIndexingAPI.POST', 'Invalid indexing payload', { errors: parsed.error.format() });
      return NextResponse.json({ success: false, error: 'Invalid request payload' }, { status: 400 });
    }

    const { apartmentName } = parsed.data;

    // Validate that the apartment exists in our database
    const apartmentsData = buildInitialApartments();
    const allApartments = Object.values(apartmentsData).flat();
    const isValidApartment = allApartments.some(apt => apt.name === apartmentName);

    if (!isValidApartment) {
      logger.warn('ApartmentIndexingAPI.POST', 'Attempted to index non-existent apartment', { apartmentName });
      return NextResponse.json({ success: false, error: 'Apartment not found in database' }, { status: 404 });
    }


    // Redis Throttling to protect daily quota (max 1 request per hour per apartment)
    const throttleKey = `dtdls:indexing:throttle:${encodeURIComponent(apartmentName)}`;
    
    if (redis) {
      try {
        const isThrottled = await redis.get(throttleKey);
        if (isThrottled) {
          logger.info('ApartmentIndexingAPI.POST', 'Throttling active for apartment. Skipping Search Console API call.', { apartmentName });
          return NextResponse.json({ 
            success: true, 
            message: 'Bypassed: Throttling active to prevent daily quota exhaustion', 
            throttled: true 
          }, { status: 200 });
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
    
    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    logger.error('ApartmentIndexingAPI.POST', 'Error during Google Indexing request', {}, error as Error);
    return NextResponse.json(
      { success: false, error: 'Failed to request indexing' },
      { status: 500 }
    );
  }
}
