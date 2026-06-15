import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminDb } from '@/lib/firebaseAdmin';
import { logger } from '@/lib/services/logger';
import { verifyAdmin } from '@/lib/authUtils';

export const dynamic = 'force-dynamic';

const debugReportsQuerySchema = z.object({
  limit: z.preprocess(
    (val) => (val ? parseInt(val as string, 10) : undefined),
    z.number().int().positive().optional()
  ),
});

export async function GET(request: NextRequest) {
  try {
    // Admin Authorization Check
    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) {
      logger.warn('DebugReportsAPI.GET', 'Unauthorized attempt to trigger debug reports fetch');
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const parsedQuery = debugReportsQuerySchema.safeParse({
      limit: searchParams.get('limit') || undefined,
    });

    if (!parsedQuery.success) {
      logger.warn('DebugReportsAPI.GET', 'Invalid query parameters', {
        errors: parsedQuery.error.format(),
      });
      return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
    }

    const { limit } = parsedQuery.data;

    if (!adminDb) {
      logger.error('DebugReportsAPI.GET', 'Admin DB not initialized', {});
      return NextResponse.json({ error: 'Admin DB not initialized' }, { status: 500 });
    }

    let query: any = adminDb.collection('scoutingReports');
    if (limit) {
      query = query.limit(limit);
    }
    const snapshot = await query.get();

    const reports = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      apartmentName: doc.data().apartmentName,
      apartmentNameHex: Buffer.from(doc.data().apartmentName || '').toString('hex'),
      dong: doc.data().dong
    }));

    logger.info('DebugReportsAPI.GET', 'Successfully fetched debug reports', {
      count: reports.length,
      limit: limit || 'none',
    });

    return NextResponse.json({ count: reports.length, reports });
  } catch (error: unknown) {
    logger.error('DebugReportsAPI.GET', 'Error fetching debug reports', {}, error as Error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

