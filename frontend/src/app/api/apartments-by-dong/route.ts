import { NextRequest, NextResponse } from 'next/server';
import { fetchSheetApartmentsByDong } from '@/lib/services/googleSheets';
import { rateLimiter } from '@/lib/rate-limit';

export const revalidate = 0; // force-dynamic

export async function GET(request: NextRequest) {
  try {
    if (rateLimiter) {
      const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1';
      const { success } = await rateLimiter.limit(`ratelimit_${ip}`);
      if (!success) {
        return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
      }
    }

    const result = await fetchSheetApartmentsByDong();
    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error('[apartments-by-dong] Error:', (err as Error).message);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
