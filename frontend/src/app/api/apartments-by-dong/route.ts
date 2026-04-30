import { NextResponse } from 'next/server';
import { fetchSheetApartmentsByDong } from '@/lib/services/googleSheets';

export const revalidate = 0; // force-dynamic

export async function GET() {
  try {
    const result = await fetchSheetApartmentsByDong();
    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error('[apartments-by-dong] Error:', (err as Error).message);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
