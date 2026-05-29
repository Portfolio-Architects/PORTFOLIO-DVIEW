import { NextResponse } from 'next/server';
import { getSearchConsoleStatus } from '@/lib/services/searchConsole';

export const revalidate = 60; // 60초 캐싱 적용

export async function GET() {
  try {
    const status = await getSearchConsoleStatus();
    return NextResponse.json(status, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
