import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/authUtils';
import { getAdminAnalyticsLKG } from '@/lib/analytics-service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const data = await getAdminAnalyticsLKG();
    return NextResponse.json({ data });
  } catch (error: unknown) {
    console.error('[GA4 API] Fetch Error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: (error as Error)?.message }, { status: 500 });
  }
}
