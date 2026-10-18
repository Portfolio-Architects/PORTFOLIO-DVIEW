import { NextRequest } from 'next/server';
import { z } from 'zod';
import { adminDb } from '@/lib/firebaseAdmin';
import { logger } from '@/lib/services/logger';
import { apiSuccess, apiError } from '@/lib/api/apiResponse';
import { checkRateLimit } from '@/lib/api/rateLimiter';
import {
  AdTelemetryBeaconSchema,
  AdTelemetryEventTypeSchema,
} from '@/lib/ads/cascadeFallback';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ExtendedTelemetryBeaconSchema = AdTelemetryBeaconSchema.extend({
  dong: z.string().optional().default(''),
  dwellTimeMs: z.number().nonnegative().optional().default(0),
  intersectionRatio: z.number().min(0).max(1).optional().default(0),
  userAgentCategory: z
    .enum(['DESKTOP', 'MOBILE_WEB', 'IN_APP_BROWSER'])
    .optional()
    .default('DESKTOP'),
  sourceTrigger: z
    .enum(['UNFILLED_ATTRIBUTE', 'TIMEOUT_FALLBACK', 'ADBLOCK_ACTIVE'])
    .optional(),
});

const LegacyAdClickInputSchema = z.object({
  adId: z.string().min(1),
  apartmentName: z.string().min(1),
  dong: z.string().optional().default(''),
  clickedAt: z.string().datetime().or(z.string().min(1)),
  eventType: AdTelemetryEventTypeSchema.optional().default('CLICK'),
  campaignId: z.string().optional(),
});

export const AdClickInputSchema = z.union([
  ExtendedTelemetryBeaconSchema,
  LegacyAdClickInputSchema,
]);

export async function POST(request: NextRequest) {
  try {
    const rateLimit = await checkRateLimit(request, {
      prefix: 'ratelimit_adclick',
      requestsPerLimit: 60,
    });
    if (!rateLimit.success) {
      return rateLimit.response || apiError('RATE_LIMIT_EXCEEDED', 'Too Many Requests', 429);
    }

    let rawBody: unknown;
    try {
      const text = await request.text();
      if (!text.trim()) {
        logger.warn('AdClick.POST', 'Empty request body', {});
        return apiError('BAD_REQUEST', 'Bad Request: Empty Payload', 400);
      }
      rawBody = JSON.parse(text);
    } catch (jsonErr) {
      logger.warn('AdClick.POST', 'Invalid JSON format', {}, jsonErr as Error);
      return apiError('BAD_REQUEST', 'Bad Request: Invalid JSON', 400);
    }

    const parsed = AdClickInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      logger.warn('AdClick.POST', 'Validation failed for ad click payload', {
        errors: parsed.error.format(),
      });
      return apiError('INVALID_PAYLOAD', 'Invalid request payload', 400, parsed.error.issues);
    }

    const data = parsed.data;
    const isBeaconPayload = 'slotId' in data;
    const slotId = isBeaconPayload ? data.slotId : data.adId;
    const adId = slotId;
    const eventType = data.eventType;
    const campaignId = data.campaignId;
    const apartmentName = data.apartmentName;
    const dong = data.dong;
    const clickedAt = isBeaconPayload ? data.timestamp : data.clickedAt;

    logger.info('AdClick.POST', `Ad telemetry [${eventType}]: ${adId} at ${apartmentName}`, {
      adId,
      slotId,
      eventType,
      campaignId,
      apartmentName,
      dong,
      clickedAt,
    });

    if (adminDb) {
      adminDb
        .collection('ad_clicks')
        .add({
          adId,
          slotId,
          eventType,
          ...(campaignId ? { campaignId } : {}),
          apartmentName,
          dong,
          clickedAt: new Date(clickedAt),
          serverTimestamp: new Date(),
        })
        .then(() => {
          logger.info(
            'AdClick.POST',
            `Persisted ad telemetry [${eventType}] successfully to Firestore: ${adId}`
          );
        })
        .catch((writeErr: unknown) => {
          const err = writeErr instanceof Error ? writeErr : new Error(String(writeErr));
          logger.error('AdClick.POST', 'Failed to persist ad click to Firestore', { adId }, err);
        });
    } else {
      logger.warn('AdClick.POST', 'adminDb is not configured. Click logged only to console.', {
        adId,
        slotId,
        eventType,
        apartmentName,
      });
    }

    return apiSuccess(
      { message: 'Click logged successfully', slotId, eventType, ...(campaignId ? { campaignId } : {}) },
      { message: 'Click logged successfully' }
    );
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('AdClick.POST', 'Unexpected error during ad click logging', {}, err);
    return apiError('SERVER_ERROR', 'Server error', 500);
  }
}

