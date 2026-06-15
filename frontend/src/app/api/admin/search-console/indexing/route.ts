import { NextResponse } from 'next/server';
import { requestGoogleIndexing } from '@/lib/utils/googleIndexing';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';

const IndexingInputSchema = z.object({
  url: z.string().url(),
  action: z.enum(['URL_UPDATED', 'URL_DELETED']).optional().default('URL_UPDATED'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = IndexingInputSchema.safeParse(body);
    
    if (!parsed.success) {
      logger.warn('IndexingAPI.POST', 'Invalid indexing request payload', { errors: parsed.error.format() });
      return NextResponse.json({ success: false, error: 'Invalid request payload', details: parsed.error.issues }, { status: 400 });
    }

    const { url, action } = parsed.data;

    const result = await requestGoogleIndexing(url, action);
    logger.info('IndexingAPI.POST', 'Successfully requested Google Indexing', { url, action, result });
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    logger.error('IndexingAPI.POST', 'Error during Google Indexing request', {}, error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
