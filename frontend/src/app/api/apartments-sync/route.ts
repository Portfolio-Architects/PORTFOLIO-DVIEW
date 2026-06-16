import { NextRequest, NextResponse } from 'next/server';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { SHEET_ID, SHEET_TABS } from '@/lib/constants';
import { verifyAdmin } from '@/lib/authUtils';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';

export const dynamic = 'force-dynamic';

const ApartmentsSyncInputSchema = z.object({
  updates: z.array(z.object({
    ticker: z.string().optional(),
    name: z.string().optional(),
    updates: z.record(z.string(), z.any()),
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

export async function POST(req: NextRequest) {
  try {
    const isAdmin = await verifyAdmin(req);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const rawBody = await req.json();
    const parsed = ApartmentsSyncInputSchema.safeParse(rawBody);
    
    if (!parsed.success) {
      logger.warn('ApartmentsSyncAPI.POST', 'Invalid sync request payload', { errors: parsed.error.format() });
      return NextResponse.json({ error: 'Invalid request payload', details: parsed.error.issues }, { status: 400 });
    }

    const { updates, adds, deletes } = parsed.data;

    const { GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY } = process.env;
    if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
      return NextResponse.json({ error: 'Server is missing Google Service Account credentials' }, { status: 500 });
    }

    const formattedKey = GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/"/g, '');
    const serviceAccountAuth = new JWT({
      email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: formattedKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle[SHEET_TABS.APARTMENTS];
    if (!sheet) return NextResponse.json({ error: `Sheet tab '${SHEET_TABS.APARTMENTS}' not found` }, { status: 500 });

    const rows = await sheet.getRows();
    const headers = sheet.headerValues.map(h => h.toLowerCase().trim());
    
    // Find column indices
    const col = (names: string[]) => sheet.headerValues[headers.findIndex(h => names.includes(h))] || names[0];
    const tickerCol = col(['ticker', '티커']);
    const nameCol = col(['아파트명', 'name', '이름']);
    const dongCol = col(['dong', '동']);
    
    let updatedCount = 0;
    let addedCount = 0;
    let deletedCount = 0;

    // 1. Deletes (Delete rows matching exact names)
    if (deletes.length > 0) {
      for (let i = rows.length - 1; i >= 0; i--) {
        const rName = rows[i].get(nameCol)?.trim();
        if (rName && deletes.includes(rName)) {
          await rows[i].delete();
          deletedCount++;
        }
      }
    }

    // Refresh rows after delete
    const currentRows = await sheet.getRows();

    // 2. Updates — Batch Cell updates to prevent timeouts and quota limits
    if (updates.length > 0) {
      // Load all cells into memory at once
      await sheet.loadCells({
        startRowIndex: 0,
        endRowIndex: rows.length + 1,
        startColumnIndex: 0,
        endColumnIndex: sheet.headerValues.length
      });

      for (const updateObj of updates) {
        // Try finding by ticker first, then by name
        let targetRow = null;
        if (updateObj.ticker) {
          targetRow = currentRows.find(r => r.get(tickerCol)?.trim() === updateObj.ticker);
        }
        if (!targetRow && updateObj.name) {
          targetRow = currentRows.find(r => r.get(nameCol)?.trim() === updateObj.name);
        }

        if (targetRow) {
          const rowIndex = currentRows.indexOf(targetRow) + 1; // 0-based sheet row index (offset by 1 for header)
          let dirty = false;

          for (const key of Object.keys(updateObj.updates)) {
            const headerIdx = sheet.headerValues.findIndex(
              h => h === key || h.toLowerCase().trim() === key.toLowerCase().trim()
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
        await sheet.saveUpdatedCells();
      }
    }

    // 3. Adds — Batch row insertions
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
        await sheet.addRows(newRowsArray);
      }
    }

    logger.info('ApartmentsSyncAPI.POST', 'Apartments data synced successfully', { updatedCount, addedCount, deletedCount });

    return NextResponse.json({ success: true, updatedCount, addedCount, deletedCount });

  } catch (err: unknown) {
    logger.error('ApartmentsSyncAPI.POST', 'Google Sheets Sync Error', {}, err as Error);
    return NextResponse.json({ error: 'Failed to sync apartments data' }, { status: 500 });
  }
}
// Force Turbopack recompile
