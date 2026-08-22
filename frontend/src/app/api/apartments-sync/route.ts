import { NextRequest } from 'next/server';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { SHEET_ID, SHEET_TABS } from '@/lib/constants';
import { verifyAdmin } from '@/lib/authUtils';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';
import { apiSuccess, apiError } from '@/lib/api/apiResponse';
import { checkRateLimit } from '@/lib/api/rateLimiter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ApartmentsSyncInputSchema = z.object({
  updates: z.array(z.object({
    ticker: z.string().optional(),
    name: z.string().optional(),
    updates: z.record(z.string(), z.unknown()),
  })).optional().default([]),
  adds: z.array(z.object({
    name: z.string(),
    dong: z.string(),
    txKey: z.string().optional(),
    coordinates: z.string().optional(),
    householdCount: z.union([z.number(), z.string()]).optional(),
    brand: z.string().optional(),
    yearBuilt: z.string().optional(),
    far: z.union([z.number(), z.string()]).optional(),
    bcr: z.union([z.number(), z.string()]).optional(),
    parkingCount: z.union([z.number(), z.string()]).optional(),
    minFloor: z.union([z.number(), z.string()]).optional(),
    maxFloor: z.union([z.number(), z.string()]).optional(),
    isPublicRental: z.boolean().optional(),
    ticker: z.string().optional(),
  })).optional().default([]),
  deletes: z.array(z.string()).optional().default([]),
});

async function runWithRetry<T>(
  fn: () => Promise<T>,
  actionName: string,
  retries = 3,
  delayMs = 1000
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.warn('ApartmentsSyncAPI.runWithRetry', `Attempt ${i + 1}/${retries} failed for action: ${actionName}`, {
        error: errMsg,
      });
      if (i === retries - 1) throw err;

      const jitter = Math.random() * 200;
      const currentDelay = delayMs * Math.pow(2, i) + jitter;
      await new Promise((resolve) => setTimeout(resolve, currentDelay));
    }
  }
  throw new Error(`Action ${actionName} failed after ${retries} attempts`);
}

export async function POST(req: NextRequest) {
  const TIMEOUT_LIMIT = 25000;

  const syncProcess = async () => {
    const rateLimit = await checkRateLimit(req, {
      prefix: 'ratelimit_apartments_sync',
      requestsPerLimit: 30,
    });
    if (!rateLimit.success) {
      return rateLimit.response || apiError('RATE_LIMIT_EXCEEDED', 'Too Many Requests', 429);
    }

    const isAdmin = await verifyAdmin(req);
    if (!isAdmin) {
      return apiError('UNAUTHORIZED', 'Unauthorized: Admin access required', 403);
    }

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return apiError('BAD_REQUEST', 'Bad Request: Invalid JSON', 400);
    }

    const parsed = ApartmentsSyncInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      logger.warn('ApartmentsSyncAPI.POST', 'Invalid sync request payload', { errors: parsed.error.format() });
      return apiError('INVALID_PAYLOAD', 'Invalid request payload', 400, parsed.error.issues);
    }

    const { updates, adds, deletes } = parsed.data;

    const { GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY } = process.env;
    if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
      return apiError('SERVICE_UNAVAILABLE', 'Server is missing Google Service Account credentials', 500);
    }

    const formattedKey = GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/"/g, '');
    const serviceAccountAuth = new JWT({
      email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: formattedKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(SHEET_ID, serviceAccountAuth);
    await runWithRetry(() => doc.loadInfo(), 'doc.loadInfo');
    const sheet = doc.sheetsByTitle[SHEET_TABS.APARTMENTS];
    if (!sheet) return apiError('NOT_FOUND', `Sheet tab '${SHEET_TABS.APARTMENTS}' not found`, 500);

    const rows = await runWithRetry(() => sheet.getRows(), 'sheet.getRows');
    const headers = sheet.headerValues.map((h) => h.toLowerCase().trim());

    const col = (names: string[]) => sheet.headerValues[headers.findIndex((h) => names.includes(h))] || names[0];
    const tickerCol = col(['ticker', '티커']);
    const nameCol = col(['아파트명', 'name', '이름']);
    const dongCol = col(['dong', '동']);

    let updatedCount = 0;
    let addedCount = 0;
    let deletedCount = 0;

    // 1. Deletes
    if (deletes.length > 0) {
      for (let i = rows.length - 1; i >= 0; i--) {
        const rName = rows[i].get(nameCol)?.trim();
        if (rName && deletes.includes(rName)) {
          await runWithRetry(() => rows[i].delete(), `deleteRow:${rName}`);
          deletedCount++;
        }
      }
    }

    const currentRows = await runWithRetry(() => sheet.getRows(), 'sheet.getRows (refresh)');

    // 2. Updates
    if (updates.length > 0) {
      await runWithRetry(
        () => sheet.loadCells({
          startRowIndex: 0,
          endRowIndex: rows.length + 1,
          startColumnIndex: 0,
          endColumnIndex: sheet.headerValues.length,
        }),
        'sheet.loadCells'
      );

      for (const updateObj of updates) {
        let targetRow = null;
        if (updateObj.ticker) {
          targetRow = currentRows.find((r) => r.get(tickerCol)?.trim() === updateObj.ticker);
        }
        if (!targetRow && updateObj.name) {
          targetRow = currentRows.find((r) => r.get(nameCol)?.trim() === updateObj.name);
        }

        if (targetRow) {
          const rowIndex = currentRows.indexOf(targetRow) + 1;
          let dirty = false;

          for (const key of Object.keys(updateObj.updates)) {
            const headerIdx = sheet.headerValues.findIndex(
              (h) => h === key || h.toLowerCase().trim() === key.toLowerCase().trim()
            );
            if (headerIdx !== -1) {
              const cell = sheet.getCell(rowIndex, headerIdx);
              const newValue = String(updateObj.updates[key]);
              if (cell.value !== newValue) {
                cell.value = newValue;
                dirty = true;
              }
            }
          }
          if (dirty) {
            updatedCount++;
          }
        }
      }

      if (updatedCount > 0) {
        await runWithRetry(() => sheet.saveUpdatedCells(), 'sheet.saveUpdatedCells');
      }
    }

    // 3. Adds
    if (adds.length > 0) {
      const newRowsArray: Record<string, string>[] = [];
      for (const addObj of adds) {
        const newRow: Record<string, string> = {};
        newRow[nameCol] = addObj.name;
        newRow[dongCol] = addObj.dong;
        if (addObj.txKey) newRow[col(['txkey', '실거래키'])] = addObj.txKey;
        if (addObj.coordinates) newRow[col(['좌표', 'coordinates', 'coord'])] = addObj.coordinates;
        if (addObj.householdCount != null) newRow[col(['세대수', 'householdcount'])] = String(addObj.householdCount);
        if (addObj.brand) newRow[col(['시공사', 'brand', '브랜드'])] = addObj.brand;
        if (addObj.yearBuilt) newRow[col(['시공&준공인', '사용승인', '준공연도', 'yearbuilt'])] = addObj.yearBuilt;
        if (addObj.far != null) newRow[col(['용적률', 'far'])] = String(addObj.far);
        if (addObj.bcr != null) newRow[col(['건폐율', 'bcr'])] = String(addObj.bcr);
        if (addObj.parkingCount != null) newRow[col(['주차대수', 'parkingcount'])] = String(addObj.parkingCount);
        if (addObj.minFloor != null) newRow[col(['최저층', 'minfloor'])] = String(addObj.minFloor);
        if (addObj.maxFloor != null) newRow[col(['최고층', 'maxfloor'])] = String(addObj.maxFloor);
        if (addObj.isPublicRental != null) newRow[col(['공공임대', 'ispublicrental'])] = addObj.isPublicRental ? 'Y' : 'N';
        if (addObj.ticker) newRow[col(['ticker', '티커'])] = addObj.ticker;

        newRowsArray.push(newRow);
        addedCount++;
      }

      if (newRowsArray.length > 0) {
        await runWithRetry(() => sheet.addRows(newRowsArray), 'sheet.addRows');
      }
    }

    logger.info('ApartmentsSyncAPI.POST', 'Apartments data synced successfully', { updatedCount, addedCount, deletedCount });

    return apiSuccess({
      updatedCount,
      addedCount,
      deletedCount,
    }, {
      updatedCount,
      addedCount,
      deletedCount,
    });
  };

  let timeoutId: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<ReturnType<typeof apiError>>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Apartment sync execution timed out')), TIMEOUT_LIMIT);
  });

  try {
    return await Promise.race([
      syncProcess().then((res) => {
        if (timeoutId) clearTimeout(timeoutId);
        return res;
      }).catch((err) => {
        if (timeoutId) clearTimeout(timeoutId);
        throw err;
      }),
      timeoutPromise,
    ]);
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('ApartmentsSyncAPI.POST', 'Google Sheets Sync Error', {}, err);
    if (err.message === 'Apartment sync execution timed out') {
      return apiError('GATEWAY_TIMEOUT', 'Gateway Timeout: Google Sheets sync took too long', 504);
    }
    return apiError('INTERNAL_ERROR', 'Failed to sync apartments data', 500, err.message);
  }
}
