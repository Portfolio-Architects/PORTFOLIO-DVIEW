import { GET as syncTransactionsGet } from '../sync-transactions/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export const preferredRegion = 'icn1';

export const GET = syncTransactionsGet;
