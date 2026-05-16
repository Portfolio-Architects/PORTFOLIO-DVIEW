import { NextResponse } from 'next/server';
import txSummaryDataRaw from '../../../../public/data/tx-summary.json';
const TX_SUMMARY = (txSummaryDataRaw as any).summary;
export const dynamic = 'force-static';

export async function GET() {
  return NextResponse.json(TX_SUMMARY);
}
