import { NextRequest } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';
import { apiSuccess, apiError } from '@/lib/api/apiResponse';
import { checkRateLimit } from '@/lib/api/rateLimiter';
import { Coord, haversineDistance, findNearest } from '@/lib/utils/haversine';
import { loadAllCached, resolveApartment, filterByBBox, clearCache, StationPOI } from '@/lib/services/locationService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const locationScoresQuerySchema = z.object({
  apartment: z.string().min(1, 'apartment parameter is required'),
  refresh: z.string().optional().transform((v) => v === '1'),
});

export async function GET(request: NextRequest) {
  const rateLimit = await checkRateLimit(request, {
    prefix: 'ratelimit_locationscores',
    requestsPerLimit: 60,
  });
  if (!rateLimit.success) {
    logger.warn('LocationScoresAPI.GET', 'Rate limit exceeded');
    return rateLimit.response || apiError('RATE_LIMIT_EXCEEDED', 'Too Many Requests', 429);
  }

  const { searchParams } = request.nextUrl;
  const parsedQuery = locationScoresQuerySchema.safeParse({
    apartment: searchParams.get('apartment'),
    refresh: searchParams.get('refresh'),
  });

  if (!parsedQuery.success) {
    logger.warn('LocationScoresAPI.GET', 'Invalid query parameters', {
      errors: parsedQuery.error.format(),
    });
    return apiError('INVALID_QUERY', 'apartment parameter is required', 400);
  }

  const { apartment, refresh: forceRefresh } = parsedQuery.data;

  try {
    if (forceRefresh) {
      clearCache();
    }

    const { apartments, schools, stations, academies, restaurants, sboyds } = await loadAllCached(forceRefresh);

    const apt = resolveApartment(apartment, apartments);
    if (!apt) {
      logger.warn('LocationScoresAPI.GET', 'Unknown apartment requested', {
        apartment,
        totalAvailable: apartments.length,
      });
      return apiError('NOT_FOUND', `Unknown apartment: ${apartment}`, 404, {
        hint: `총 ${apartments.length}개 아파트 중 좌표가 있는 항목만 로드됩니다. Google Sheets '좌표' 컬럼을 확인하세요.`,
        availableApartments: apartments.map((a) => a.name),
      });
    }

    const aptCoord: Coord = { lat: apt.lat, lng: apt.lng };

    const elementary = schools.filter((s) => s.type.includes('초'));
    const middle = schools.filter((s) => s.type.includes('중'));
    const high = schools.filter((s) => s.type.includes('고'));

    const nearestElementary = findNearest(aptCoord, elementary);
    const nearestMiddle = findNearest(aptCoord, middle);
    const nearestHigh = findNearest(aptCoord, high);

    const gtxSrtLine = stations.filter((s) => s.line.includes('GTX') || s.line.includes('SRT'));
    const indeokwonLine = stations.filter((s) => s.line.includes('인덕원') || s.line.includes('동탄인덕원'));
    const tramLine = stations.filter((s) => s.line.includes('트램') || s.line.includes('동탄트램') || s.line.includes('도시철도'));
    logger.info('LocationScoresAPI.GET', 'Filter tram lines status', { count: tramLine.length });
    const nearestStationBase = gtxSrtLine.length > 0 ? findNearest(aptCoord, gtxSrtLine) : findNearest(aptCoord, stations);
    const nearestIndeokwonBase = indeokwonLine.length > 0 ? findNearest(aptCoord, indeokwonLine) : null;
    const nearestTramBase = tramLine.length > 0 ? findNearest(aptCoord, tramLine) : null;
    logger.info('LocationScoresAPI.GET', 'Nearest tram base status', { nearestTramBase: nearestTramBase?.name || null });

    const findStationLine = (name: string | undefined, pool: StationPOI[]) => pool.find((s) => s.name === name)?.line || null;
    const nearestStation = nearestStationBase ? { ...nearestStationBase, line: findStationLine(nearestStationBase.name, gtxSrtLine.length > 0 ? gtxSrtLine : stations) } : null;
    const nearestIndeokwon = nearestIndeokwonBase ? { ...nearestIndeokwonBase, line: findStationLine(nearestIndeokwonBase.name, indeokwonLine) } : null;
    const nearestTram = nearestTramBase ? { ...nearestTramBase, line: findStationLine(nearestTramBase.name, tramLine) } : null;

    const candidateAcademies = filterByBBox(aptCoord, academies);
    const nearbyAcademies = candidateAcademies.filter((a) => haversineDistance(aptCoord, a) <= 500);
    const academyDensity = nearbyAcademies.length;
    const academyCategories: Record<string, number> = {};
    for (const a of nearbyAcademies) {
      academyCategories[a.category] = (academyCategories[a.category] || 0) + 1;
    }

    const candidateRestaurants = filterByBBox(aptCoord, restaurants);
    const nearbyRestaurants = candidateRestaurants.filter((r) => haversineDistance(aptCoord, r) <= 500);
    const restaurantDensity = nearbyRestaurants.length;
    const restaurantCategories: Record<string, number> = {};
    for (const r of nearbyRestaurants) {
      restaurantCategories[r.category] = (restaurantCategories[r.category] || 0) + 1;
    }

    const findAnchor = (keywords: string[]) => {
      const sboydsMatches = sboyds.filter((r) => keywords.some((k) => r.name.includes(k)));
      const restMatches = restaurants.filter((r) => keywords.some((k) => r.name.includes(k)));
      const combined = [...sboydsMatches, ...restMatches];
      return combined.length > 0 ? findNearest(aptCoord, combined) : null;
    };

    const nearestStarbucks = findAnchor(['스타벅스']);
    const nearestMcDonalds = findNearest(aptCoord, restaurants.filter((r) => ['배스킨라빈스', '베스킨라빈스'].some((k) => r.name.includes(k))));
    const nearestOliveYoung = findAnchor(['올리브영']);
    const nearestDaiso = findAnchor(['다이소']);
    const nearestSupermarket = findAnchor(['이마트', '홈플러스', '롯데마트', '노브랜드']);

    const parkingPerHousehold = (
      apt.householdCount !== undefined &&
      apt.householdCount !== null &&
      apt.parkingCount !== undefined &&
      apt.parkingCount !== null &&
      Number(apt.householdCount) > 0
    )
      ? Math.round((Number(apt.parkingCount) / Number(apt.householdCount)) * 100) / 100
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
      distanceToStarbucks: nearestStarbucks?.distance ?? null,
      starbucksName: nearestStarbucks?.name ?? null,
      starbucksAddress: nearestStarbucks?.address ?? null,
      starbucksCoordinates: nearestStarbucks ? `${nearestStarbucks.lat}, ${nearestStarbucks.lng}` : null,

      distanceToMcDonalds: nearestMcDonalds?.distance ?? null,
      mcdonaldsName: nearestMcDonalds?.name ?? null,
      mcdonaldsAddress: nearestMcDonalds?.address ?? null,
      mcdonaldsCoordinates: nearestMcDonalds ? `${nearestMcDonalds.lat}, ${nearestMcDonalds.lng}` : null,

      distanceToOliveYoung: nearestOliveYoung?.distance ?? null,
      oliveYoungName: nearestOliveYoung?.name ?? null,
      oliveYoungAddress: nearestOliveYoung?.address ?? null,
      oliveYoungCoordinates: nearestOliveYoung ? `${nearestOliveYoung.lat}, ${nearestOliveYoung.lng}` : null,

      distanceToDaiso: nearestDaiso?.distance ?? null,
      daisoName: nearestDaiso?.name ?? null,
      daisoAddress: nearestDaiso?.address ?? null,
      daisoCoordinates: nearestDaiso ? `${nearestDaiso.lat}, ${nearestDaiso.lng}` : null,

      distanceToSupermarket: nearestSupermarket?.distance ?? null,
      supermarketName: nearestSupermarket?.name ?? null,
      supermarketAddress: nearestSupermarket?.address ?? null,
      supermarketCoordinates: nearestSupermarket ? `${nearestSupermarket.lat}, ${nearestSupermarket.lng}` : null,

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

    return apiSuccess(result, result, {
      headers: {
        'Cache-Control': forceRefresh
          ? 'no-store, no-cache, must-revalidate, max-age=0'
          : 'public, s-maxage=3600, stale-while-revalidate=600',
      },
    });
  } catch (error: unknown) {
    logger.error('LocationScoresAPI.GET', 'Failed to calculate location scores', {}, error as Error);
    return apiError('LOCATION_SCORES_ERROR', 'Failed to calculate location scores', 500);
  }
}
