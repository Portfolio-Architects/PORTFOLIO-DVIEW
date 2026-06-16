import { NextRequest, NextResponse } from 'next/server';
import { getSearchConsoleStatus } from '@/lib/services/searchConsole';
import { verifyAdmin } from '@/lib/authUtils';
import { logger } from '@/lib/services/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Admin Authorization Check
    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) {
      logger.warn('SearchConsoleAPI.GET', 'Unauthorized attempt to fetch Search Console status');
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const status = await getSearchConsoleStatus();
    return NextResponse.json(status, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error: any) {
    logger.error('SearchConsoleAPI.GET', 'Failed to fetch Search Console status', {}, error as Error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch search console status' },
      { status: 500 }
    );
  }
}
