import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { calculatePremiumScores } from '@/lib/utils/scoring';
import { ObjectiveMetrics } from '@/lib/types/scoutingReport';
import { requestGoogleIndexing } from '@/lib/utils/server/googleIndexing';
import { logger } from '@/lib/services/logger';
import { verifyAdmin } from '@/lib/authUtils';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const syncQuerySchema = z.object({
  offset: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 0)),
  limit: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 10)),
});

export async function GET(request: NextRequest) {
  const isAdmin = await verifyAdmin(request);
  if (!isAdmin) {
    logger.warn('SyncReportsAPI.GET', 'Unauthorized attempts to trigger reports sync');
    return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
  }

  if (!adminDb) {
    return NextResponse.json({ error: 'No admin db configured' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const parsedQuery = syncQuerySchema.safeParse({
    offset: searchParams.get('offset') || undefined,
    limit: searchParams.get('limit') || undefined,
  });

  if (!parsedQuery.success) {
    logger.warn('SyncReportsAPI.GET', 'Invalid query parameters', {
      errors: parsedQuery.error.format(),
    });
    return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 });
  }

  const { offset, limit } = parsedQuery.data;
  const baseUrl = request.nextUrl.origin;

  try {
    const snapshot = await adminDb.collection('scoutingReports').get();
    const allDocs = snapshot.docs;
    const totalCount = allDocs.length;

    // Sort documents consistently to guarantee deterministic pagination
    allDocs.sort((a, b) => a.id.localeCompare(b.id));

    const slicedDocs = allDocs.slice(offset, offset + limit);
    const hasMore = offset + limit < totalCount;

    let updatedCount = 0;
    const results: string[] = [];
    
    // Refresh cache once at the beginning
    if (offset === 0) {
      await fetch(`${baseUrl}/api/location-scores?apartment=dummy&refresh=1`, { cache: 'no-store' }).catch(() => {});
    }
    
    for (const doc of slicedDocs) {
      const data = doc.data();
      const aptName = data.apartmentName;
      
      if (!aptName) continue;
      
      try {
        const res = await fetch(`${baseUrl}/api/location-scores?apartment=${encodeURIComponent(aptName)}`, { cache: 'no-store' });
        if (!res.ok) {
          results.push(`Failed: ${aptName} (Status ${res.status})`);
          continue;
        }
        
        const scoreData = await res.json();
        const existingMetrics = data.metrics || {};
        
        // Merge existing metrics (e.g., minFloor, maxFloor) with fresh API data
        const mergedMetrics: ObjectiveMetrics = {
          ...existingMetrics,
          brand: scoreData.buildingInfo.brand || existingMetrics.brand || '',
          householdCount: scoreData.buildingInfo.householdCount || existingMetrics.householdCount || 0,
          far: scoreData.buildingInfo.far || existingMetrics.far || 0,
          bcr: scoreData.buildingInfo.bcr || existingMetrics.bcr || 0,
          parkingCount: scoreData.buildingInfo.parkingCount || existingMetrics.parkingCount,
          parkingPerHousehold: scoreData.buildingInfo.parkingPerHousehold || existingMetrics.parkingPerHousehold || 0,
          yearBuilt: scoreData.buildingInfo.yearBuilt || existingMetrics.yearBuilt || new Date().getFullYear(),
          coordinates: scoreData.coordinates ? `${scoreData.coordinates.lat}, ${scoreData.coordinates.lng}` : existingMetrics.coordinates,
          distanceToElementary: scoreData.distanceToElementary || 9999,
          distanceToMiddle: scoreData.distanceToMiddle || 9999,
          distanceToHigh: scoreData.distanceToHigh || 9999,
          distanceToSubway: scoreData.distanceToSubway || 9999,
          distanceToIndeokwon: scoreData.distanceToIndeokwon || 9999,
          distanceToTram: scoreData.distanceToTram || 9999,
          academyDensity: scoreData.academyDensity || 0,
          academyCategories: scoreData.academyCategories || existingMetrics.academyCategories || {},
          restaurantDensity: scoreData.restaurantDensity || 0,
          restaurantCategories: scoreData.restaurantCategories || existingMetrics.restaurantCategories || {},
          distanceToStarbucks: scoreData.distanceToStarbucks,
          starbucksName: scoreData.starbucksName || existingMetrics.starbucksName,
          starbucksAddress: scoreData.starbucksAddress || existingMetrics.starbucksAddress,
          starbucksCoordinates: scoreData.starbucksCoordinates || existingMetrics.starbucksCoordinates,

          distanceToMcDonalds: scoreData.distanceToMcDonalds,
          mcdonaldsName: scoreData.mcdonaldsName || existingMetrics.mcdonaldsName,
          mcdonaldsAddress: scoreData.mcdonaldsAddress || existingMetrics.mcdonaldsAddress,
          mcdonaldsCoordinates: scoreData.mcdonaldsCoordinates || existingMetrics.mcdonaldsCoordinates,

          distanceToOliveYoung: scoreData.distanceToOliveYoung,
          oliveYoungName: scoreData.oliveYoungName || existingMetrics.oliveYoungName,
          oliveYoungAddress: scoreData.oliveYoungAddress || existingMetrics.oliveYoungAddress,
          oliveYoungCoordinates: scoreData.oliveYoungCoordinates || existingMetrics.oliveYoungCoordinates,

          distanceToDaiso: scoreData.distanceToDaiso,
          daisoName: scoreData.daisoName || existingMetrics.daisoName,
          daisoAddress: scoreData.daisoAddress || existingMetrics.daisoAddress,
          daisoCoordinates: scoreData.daisoCoordinates || existingMetrics.daisoCoordinates,

          distanceToSupermarket: scoreData.distanceToSupermarket,
          supermarketName: scoreData.supermarketName || existingMetrics.supermarketName,
          supermarketAddress: scoreData.supermarketAddress || existingMetrics.supermarketAddress,
          supermarketCoordinates: scoreData.supermarketCoordinates || existingMetrics.supermarketCoordinates,

          distanceToPark: existingMetrics.distanceToPark,

          // School Names
          nearestSchoolNames: {
            elementary: scoreData.nearestSchools?.elementary?.name || existingMetrics.nearestSchoolNames?.elementary || '',
            middle: scoreData.nearestSchools?.middle?.name || existingMetrics.nearestSchoolNames?.middle || '',
            high: scoreData.nearestSchools?.high?.name || existingMetrics.nearestSchoolNames?.high || '',
          },

          // Station Details
          nearestStationName: scoreData.nearestStation?.name || existingMetrics.nearestStationName || '',
          nearestStationLine: scoreData.nearestStation?.line || existingMetrics.nearestStationLine || '',
          nearestStationCoords: scoreData.nearestStation ? `${scoreData.nearestStation.lat}, ${scoreData.nearestStation.lng}` : existingMetrics.nearestStationCoords || '',

          nearestIndeokwonStationName: scoreData.nearestIndeokwon?.name || existingMetrics.nearestIndeokwonStationName || '',
          nearestIndeokwonLine: scoreData.nearestIndeokwon?.line || existingMetrics.nearestIndeokwonLine || '',
          nearestIndeokwonCoords: scoreData.nearestIndeokwon ? `${scoreData.nearestIndeokwon.lat}, ${scoreData.nearestIndeokwon.lng}` : existingMetrics.nearestIndeokwonCoords || '',

          nearestTramStationName: scoreData.nearestTram?.name || existingMetrics.nearestTramStationName || '',
          nearestTramLine: scoreData.nearestTram?.line || existingMetrics.nearestTramLine || '',
          nearestTramCoords: scoreData.nearestTram ? `${scoreData.nearestTram.lat}, ${scoreData.nearestTram.lng}` : existingMetrics.nearestTramCoords || '',
        };

        const premiumScores = calculatePremiumScores(mergedMetrics);

        // Firestore does not accept undefined values. Deep clean the object to remove undefined fields.
        const cleanUndefined = (obj: any): any => {
          if (obj === undefined) return null; // Convert to null or just delete
          if (obj === null || typeof obj !== 'object') return obj;
          if (Array.isArray(obj)) return obj.map(cleanUndefined).filter(v => v !== undefined);
          return Object.entries(obj).reduce((acc, [key, val]) => {
            if (val !== undefined) acc[key] = cleanUndefined(val);
            return acc;
          }, {} as any);
        };

        const cleanMetrics = cleanUndefined(mergedMetrics);
        const cleanPremiumScores = cleanUndefined(premiumScores);

        await adminDb.collection('scoutingReports').doc(doc.id).update({
          metrics: cleanMetrics,
          premiumScores: cleanPremiumScores
        });
        
        // Trigger Google Search Console Indexing API asynchronously for this apartment details page
        const pageUrl = `${baseUrl}/apartment/${encodeURIComponent(aptName)}`;
        requestGoogleIndexing(pageUrl, 'URL_UPDATED').catch(err => {
          logger.error('SyncReportsAPI.GET', 'Failed indexing for apartment page', { pageUrl }, err as Error);
        });
        
        updatedCount++;
        results.push(`Success: ${aptName}`);
      } catch (err: any) {
        results.push(`Error on ${aptName}: ${err.message}`);
      }
    }
    
    return NextResponse.json({
      success: true,
      updatedCount,
      totalCount,
      hasMore,
      nextOffset: offset + limit,
      results
    });
  } catch (err: any) {
    logger.error('SyncReportsAPI.GET', 'Failed to execute reports sync', {}, err as Error);
    return NextResponse.json({ error: 'Failed to sync reports' }, { status: 500 });
  }
}
