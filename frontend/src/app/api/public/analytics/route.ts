import { NextResponse } from 'next/server';
import { getPublicAnalyticsLKG } from '@/lib/analytics-service';

export const dynamic = 'force-dynamic'; // LKG handles caching explicitly now

export async function GET() {
  const data = await getPublicAnalyticsLKG();
  return NextResponse.json(data);
}
