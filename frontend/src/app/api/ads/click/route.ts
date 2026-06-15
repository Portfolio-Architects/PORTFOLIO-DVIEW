import { NextResponse } from 'next/server';
import { z } from 'zod';
import { adminDb } from '@/lib/firebaseAdmin';
import { logger } from '@/lib/services/logger';

const AdClickInputSchema = z.object({
  adId: z.string().min(1),
  apartmentName: z.string().min(1),
  dong: z.string().optional().default(''),
  clickedAt: z.string().datetime().or(z.string().min(1)),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Zod schema validation
    const parsed = AdClickInputSchema.safeParse(body);
    if (!parsed.success) {
      logger.warn('AdClick', 'Validation failed for ad click payload', { errors: parsed.error.format() });
      return NextResponse.json({ success: false, error: 'Invalid request payload' }, { status: 400 });
    }

    const { adId, apartmentName, dong, clickedAt } = parsed.data;

    // Log the click event to server console via structured logger
    logger.info('AdClick', `Ad clicked: ${adId} at ${apartmentName}`, { adId, apartmentName, dong, clickedAt });

    // Store in Firestore if adminDb is available
    if (adminDb) {
      await adminDb.collection('ad_clicks').add({
        adId,
        apartmentName,
        dong,
        clickedAt: new Date(clickedAt),
        serverTimestamp: new Date(),
      });
      logger.info('AdClick', `Persisted ad click successfully to Firestore: ${adId}`);
    } else {
      logger.warn('AdClick', 'adminDb is not configured. Click logged only to console.', { adId, apartmentName });
    }

    return NextResponse.json({ success: true, message: 'Click logged successfully' }, { status: 200 });
  } catch (error) {
    logger.error('AdClick', 'Unexpected error during ad click logging', {}, error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
