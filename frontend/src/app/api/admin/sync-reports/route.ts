import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { calculatePremiumScores } from '@/lib/utils/scoring';
import { ObjectiveMetrics } from '@/lib/types/scoutingReport';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!adminDb) {
    return NextResponse.json({ error: 'No admin db configured' }, { status: 500 });
  }

  // A basic safety check (e.g. only run locally or when explicitly allowed, but we'll allow it for this manual run)
  const baseUrl = request.nextUrl.origin;

  try {
    const snapshot = await adminDb.collection('scoutingReports').get();
    let updatedCount = 0;
    const results: string[] = [];
    
    // Refresh cache once at the beginning
    await fetch(`${baseUrl}/api/location-scores?apartment=dummy&refresh=1`, { cache: 'no-store' });
    
    for (const doc of snapshot.docs) {
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
          restaurantDensity: scoreData.restaurantDensity || 0,
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
        
        updatedCount++;
        results.push(`Success: ${aptName}`);
      } catch (err: any) {
        results.push(`Error on ${aptName}: ${err.message}`);
      }
    }
    
    return NextResponse.json({ success: true, updatedCount, results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
