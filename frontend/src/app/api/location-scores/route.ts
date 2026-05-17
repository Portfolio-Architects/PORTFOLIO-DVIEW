import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';
import { SHEET_ID, SHEET_TABS, parseCsvLine } from '@/lib/constants';
import { Coord, haversineDistance, findNearest, countWithinRadius, parseCoordString } from '@/lib/utils/haversine';

export const revalidate = 0; // force-dynamic

import { loadAllCached, resolveApartment, filterByBBox, clearCache, StationPOI } from '@/lib/services/locationService';

// ── GET Handler ────────────────────────────────────

export async function GET(request: NextRequest) {
  const apartment = request.nextUrl.searchParams.get('apartment');
  const forceRefresh = request.nextUrl.searchParams.get('refresh') === '1';

  if (!apartment) {
    return NextResponse.json({ error: 'apartment parameter is required' }, { status: 400 });
  }

  try {
    // Force cache invalidation when admin requests fresh data
    if (forceRefresh) {
      clearCache();
    }

    // Load from cache (or fetch & cache if stale/empty)
    const { apartments, schools, stations, academies, restaurants, sboyds } = await loadAllCached(forceRefresh);

    const apt = resolveApartment(apartment, apartments);
    if (!apt) {
      return NextResponse.json(
        {
          error: `Unknown apartment: ${apartment}`,
          hint: `총 ${apartments.length}개 아파트 중 좌표가 있는 항목만 로드됩니다. Google Sheets '좌표' 컬럼을 확인하세요.`,
          availableApartments: apartments.map(a => a.name),
        },
        { status: 404 }
      );
    }

    const aptCoord: Coord = { lat: apt.lat, lng: apt.lng };

    // Calculate school distances
    const elementary = schools.filter(s => s.type.includes('초'));
    const middle = schools.filter(s => s.type.includes('중'));
    const high = schools.filter(s => s.type.includes('고'));

    const nearestElementary = findNearest(aptCoord, elementary);
    const nearestMiddle = findNearest(aptCoord, middle);
    const nearestHigh = findNearest(aptCoord, high);

    // Station distances by line type
    const gtxSrtLine = stations.filter(s => s.line.includes('GTX') || s.line.includes('SRT'));
    const indeokwonLine = stations.filter(s => s.line.includes('인덕원') || s.line.includes('동탄인덕원'));
    const tramLine = stations.filter(s => s.line.includes('트램') || s.line.includes('동탄트램') || s.line.includes('도시철도'));
    console.log('[DEBUG] tramLine =>', tramLine);
    const nearestStationBase = gtxSrtLine.length > 0 ? findNearest(aptCoord, gtxSrtLine) : findNearest(aptCoord, stations);
    const nearestIndeokwonBase = indeokwonLine.length > 0 ? findNearest(aptCoord, indeokwonLine) : null;
    const nearestTramBase = tramLine.length > 0 ? findNearest(aptCoord, tramLine) : null;
    console.log('[DEBUG] nearestTramBase =>', nearestTramBase);

    // Enrich with line name from sheet column C
    const findStationLine = (name: string | undefined, pool: StationPOI[]) => pool.find(s => s.name === name)?.line || null;
    const nearestStation = nearestStationBase ? { ...nearestStationBase, line: findStationLine(nearestStationBase.name, gtxSrtLine.length > 0 ? gtxSrtLine : stations) } : null;
    const nearestIndeokwon = nearestIndeokwonBase ? { ...nearestIndeokwonBase, line: findStationLine(nearestIndeokwonBase.name, indeokwonLine) } : null;
    const nearestTram = nearestTramBase ? { ...nearestTramBase, line: findStationLine(nearestTramBase.name, tramLine) } : null;

    // Academy density: bounding box pre-filter → haversine within 500m
    const candidateAcademies = filterByBBox(aptCoord, academies);
    const nearbyAcademies = candidateAcademies.filter(a => haversineDistance(aptCoord, a) <= 500);
    const academyDensity = nearbyAcademies.length;
    const academyCategories: Record<string, number> = {};
    for (const a of nearbyAcademies) {
      academyCategories[a.category] = (academyCategories[a.category] || 0) + 1;
    }

    // Restaurant/cafe density: bounding box pre-filter → haversine within 500m
    const candidateRestaurants = filterByBBox(aptCoord, restaurants);
    const nearbyRestaurants = candidateRestaurants.filter(r => haversineDistance(aptCoord, r) <= 500);
    const restaurantDensity = nearbyRestaurants.length;
    const restaurantCategories: Record<string, number> = {};
    for (const r of nearbyRestaurants) {
      restaurantCategories[r.category] = (restaurantCategories[r.category] || 0) + 1;
    }

    // Anchor Tenants Distance calculations (Search from ALL restaurants/academies, not just 500m)
    const findAnchor = (keywords: string[]) => {
      // SBOYDS(수기 데이터)와 기존 상권(restaurants) 데이터 모두 통합 검색
      const sboydsMatches = sboyds.filter(r => keywords.some(k => r.name.includes(k)));
      const restMatches = restaurants.filter(r => keywords.some(k => r.name.includes(k)));
      
      const combined = [...sboydsMatches, ...restMatches];
      return combined.length > 0 ? findNearest(aptCoord, combined) : null;
    };
    
    const nearestStarbucks = findAnchor(['스타벅스']);
    const nearestMcDonalds = findAnchor(['맥도날드']);
    const nearestOliveYoung = findAnchor(['올리브영']);
    const nearestDaiso = findAnchor(['다이소']);
    const nearestSupermarket = findAnchor(['이마트', '홈플러스', '롯데마트', '노브랜드']);

    // Parking per household
    const parkingPerHousehold = (apt.householdCount && apt.parkingCount)
      ? Math.round((apt.parkingCount / apt.householdCount) * 100) / 100
      : null;

    const result = {
      apartmentName: apartment,
      coordinates: aptCoord,
      distanceToElementary: nearestElementary?.distance ?? null,
      distanceToMiddle: nearestMiddle?.distance ?? null,
      distanceToHigh: nearestHigh?.distance ?? null,
      distanceToSubway: nearestStation?.distance ?? null,
      distanceToIndeokwon: nearestIndeokwon?.distance ?? null,
      distanceToTram: nearestTram?.distance ?? null,
      academyDensity,
      academyCategories,
      restaurantDensity,
      restaurantCategories,
      
      // Anchor Tenants Distances
      distanceToStarbucks: nearestStarbucks?.distance ?? null,
      distanceToMcDonalds: nearestMcDonalds?.distance ?? null,
      distanceToOliveYoung: nearestOliveYoung?.distance ?? null,
      distanceToDaiso: nearestDaiso?.distance ?? null,
      distanceToSupermarket: nearestSupermarket?.distance ?? null,

      // Building info from sheet
      buildingInfo: {
        householdCount: apt.householdCount ?? null,
        yearBuilt: apt.yearBuilt ?? null,
        far: apt.far ?? null,
        bcr: apt.bcr ?? null,
        parkingCount: apt.parkingCount ?? null,
        parkingPerHousehold,
        brand: apt.brand ?? null,
      },
      nearestSchools: {
        elementary: nearestElementary,
        middle: nearestMiddle,
        high: nearestHigh,
      },
      nearestStation,
      nearestIndeokwon,
      nearestTram,
      meta: {
        totalSchools: schools.length,
        totalStations: stations.length,
        totalAcademies: academies.length,
        totalRestaurants: restaurants.length,
        totalApartments: apartments.length,
      },
    };

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? (error as Error).message : 'Unknown error';
    console.error('[LOCATION_SCORES] Error:', msg);
    return NextResponse.json(
      { error: 'Failed to calculate location scores', detail: msg },
      { status: 500 }
    );
  }
}
