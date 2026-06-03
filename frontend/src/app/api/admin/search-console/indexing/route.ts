import { NextResponse } from 'next/server';
import { requestGoogleIndexing } from '@/lib/utils/googleIndexing';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url, action = 'URL_UPDATED' } = body;

    if (!url) {
      return NextResponse.json({ success: false, error: 'URL is required' }, { status: 400 });
    }

    if (action !== 'URL_UPDATED' && action !== 'URL_DELETED') {
      return NextResponse.json({ success: false, error: 'Invalid action. Must be URL_UPDATED or URL_DELETED' }, { status: 400 });
    }

    const result = await requestGoogleIndexing(url, action);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('[Indexing-API-Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
