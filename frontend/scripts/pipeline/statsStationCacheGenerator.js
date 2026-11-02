/**
 * @module statsStationCacheGenerator
 * @description Pre-computes the Dongtan Station Distance Analysis dataset (`stats-station-cache.json`)
 * from `apartments-by-dong.json`, `location-scores.json`, and `transactions-1y.json`.
 * Eliminates the 3.29MB `transactions-1y.json` static import from client bundles (P2-1 & Guardrail D).
 */

const fs = require('fs');
const path = require('path');

const DONGTAN_STATION_COORDS = { lat: 37.200092, lng: 127.095514 };

function calculateHaversineDistanceMeters(
  lat1,
  lng1,
  lat2 = DONGTAN_STATION_COORDS.lat,
  lng2 = DONGTAN_STATION_COORDS.lng
) {
  if (!Number.isFinite(lat1) || !Number.isFinite(lng1) || !Number.isFinite(lat2) || !Number.isFinite(lng2)) {
    return 0;
  }
  if (lat1 === 0 && lng1 === 0) return 0;
  if (lat1 === lat2 && lng1 === lng2) return 0;

  const R = 6371e3;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;

  return Number.isFinite(d) ? Math.round(d) : 0;
}

function cleanApartmentName(str) {
  if (!str) return '';
  return String(str)
    .replace(/\s+/g, '')
    .replace(/아파트/g, '')
    .replace(/[()]/g, '')
    .replace(/[-_.]/g, '')
    .toLowerCase();
}

/**
 * Normalizes `tx1yRaw` (either an Array of objects or compact `{ fields, data }` tuple format)
 * into a flat array of transaction objects.
 */
function normalizeTx1yRows(tx1yRaw) {
  if (!tx1yRaw) return [];
  if (Array.isArray(tx1yRaw)) return tx1yRaw;
  if (typeof tx1yRaw === 'object' && Array.isArray(tx1yRaw.fields) && Array.isArray(tx1yRaw.data)) {
    const fields = tx1yRaw.fields;
    const rows = tx1yRaw.data;
    const aptNameIdx = fields.indexOf('aptName') >= 0 ? fields.indexOf('aptName') : 0;
    const txKeyIdx = fields.indexOf('txKey') >= 0 ? fields.indexOf('txKey') : 1;
    const contractDateIdx = fields.indexOf('contractDate') >= 0 ? fields.indexOf('contractDate') : 3;
    const priceValIdx = fields.indexOf('priceVal') >= 0 ? fields.indexOf('priceVal') : 4;
    const areaIdx = fields.indexOf('area') >= 0 ? fields.indexOf('area') : 6;
    const areaPyeongIdx = fields.indexOf('areaPyeong') >= 0 ? fields.indexOf('areaPyeong') : 7;
    const registeredDateIdx = fields.indexOf('registeredDate');

    return rows
      .filter((r) => Array.isArray(r))
      .map((r) => ({
        aptName: String(r[aptNameIdx] || ''),
        txKey: String(r[txKeyIdx] || ''),
        contractDate: String(r[contractDateIdx] || ''),
        priceVal: Number(r[priceValIdx]) || 0,
        area: Number(r[areaIdx]) || 0,
        areaPyeong: Number(r[areaPyeongIdx]) || 0,
        ...(registeredDateIdx >= 0 && r[registeredDateIdx]
          ? { registeredDate: String(r[registeredDateIdx]) }
          : {}),
      }));
  }
  return [];
}

/**
 * Builds the exact `{ records, datasetMeta }` station analysis cache matching `dongtanStationDistanceEngine.ts`.
 */
function buildStatsStationCachePayload({
  apartmentsByDongRaw,
  locationScoresRaw,
  tx1yRaw,
}) {
  const locMap = locationScoresRaw || {};
  const rawByDong =
    apartmentsByDongRaw && typeof apartmentsByDongRaw === 'object' && apartmentsByDongRaw.byDong
      ? apartmentsByDongRaw.byDong
      : apartmentsByDongRaw || {};

  const baseComplexes = [];

  for (const [dongName, list] of Object.entries(rawByDong)) {
    if (!Array.isArray(list)) continue;
    for (const apt of list) {
      if (apt.lat && apt.lat > 0 && locMap[apt.name]) {
        const computedDist = calculateHaversineDistanceMeters(apt.lat, apt.lng);
        const dist = computedDist > 0 ? computedDist : locMap[apt.name].distanceToSubway;
        const year = apt.yearBuilt
          ? parseInt(String(apt.yearBuilt).substring(0, 4), 10)
          : 2015;

        baseComplexes.push({
          name: apt.name,
          txKey: apt.txKey,
          dong: dongName,
          lat: apt.lat,
          lng: apt.lng,
          distMeters: dist,
          yearBuilt: Number.isFinite(year) && year > 1990 ? year : 2015,
          householdCount: apt.householdCount || 0,
        });
      }
    }
  }

  const cleanIndex = new Map();
  for (const c of baseComplexes) {
    cleanIndex.set(cleanApartmentName(c.name), c);
    if (c.txKey) cleanIndex.set(cleanApartmentName(c.txKey), c);
  }

  const txByComplex = new Map();
  for (const c of baseComplexes) {
    txByComplex.set(c.name, []);
  }

  const rawTransactions = normalizeTx1yRows(tx1yRaw);

  let maxMatchedContractDate = '';
  let maxRegisteredDate = '';

  for (const t of rawTransactions) {
    if (t.registeredDate && /^\d{8}$/.test(t.registeredDate) && t.registeredDate > maxRegisteredDate) {
      maxRegisteredDate = t.registeredDate;
    }

    const cName = cleanApartmentName(t.aptName);
    let matched = cleanIndex.get(cName);
    if (!matched && t.txKey) {
      matched = cleanIndex.get(cleanApartmentName(t.txKey));
    }
    if (!matched) {
      for (const [k, c] of cleanIndex.entries()) {
        if (k.includes(cName) || cName.includes(k)) {
          matched = c;
          break;
        }
      }
    }

    if (matched) {
      txByComplex.get(matched.name).push(t);
      if (t.contractDate && /^\d{8}$/.test(t.contractDate) && t.contractDate > maxMatchedContractDate) {
        maxMatchedContractDate = t.contractDate;
      }
    }
  }

  const records = [];
  let totalMappedTxCount = 0;

  for (const c of baseComplexes) {
    const txs = txByComplex.get(c.name) || [];
    let totalPriceWon = 0;
    let totalPyeongPriceWon = 0;
    let totalAreaM2 = 0;
    let validPyeongCount = 0;

    const sortedTxs = [...txs].sort(
      (a, b) =>
        (b.contractDate || '').localeCompare(a.contractDate || '') ||
        (b.registeredDate || '').localeCompare(a.registeredDate || '')
    );
    const latestTx = sortedTxs[0];
    const latestPriceWon = latestTx ? Math.round(latestTx.priceVal * 100_000_000) : 0;
    const latestPyeong = latestTx
      ? latestTx.areaPyeong || (latestTx.area ? latestTx.area / 3.30578 : 0)
      : 0;
    const latestPricePerPyeongWon =
      latestTx && latestPyeong > 0 ? Math.round(latestPriceWon / latestPyeong) : 0;
    const latestContractDate =
      latestTx && latestTx.contractDate && /^\d{8}$/.test(latestTx.contractDate)
        ? latestTx.contractDate
        : undefined;

    for (const t of txs) {
      const priceWon = Math.round(t.priceVal * 100_000_000);
      totalPriceWon += priceWon;
      const pyeong = t.areaPyeong || (t.area ? t.area / 3.30578 : 0);
      if (pyeong > 0) {
        totalPyeongPriceWon += priceWon / pyeong;
        validPyeongCount++;
      }
      totalAreaM2 += t.area || 0;
    }

    const txCount = txs.length;
    totalMappedTxCount += txCount;
    const avgPriceWon = txCount > 0 ? Math.round(totalPriceWon / txCount) : 0;
    const avgPricePerPyeongWon =
      validPyeongCount > 0 ? Math.round(totalPyeongPriceWon / validPyeongCount) : 0;
    const exclusiveAreaAvgM2 =
      txCount > 0 ? Math.round((totalAreaM2 / txCount) * 100) / 100 : 84;

    records.push({
      id: c.name,
      name: c.name,
      dong: c.dong,
      distanceToStationMeters: c.distMeters,
      avgPriceWon,
      avgPricePerPyeongWon,
      latestPriceWon,
      latestPricePerPyeongWon,
      ...(latestContractDate ? { latestContractDate } : {}),
      txCount,
      builtYear: c.yearBuilt,
      householdCount: c.householdCount,
      exclusiveAreaAvgM2,
    });
  }

  const refDate = maxRegisteredDate || maxMatchedContractDate;
  const referenceMonthLabel =
    refDate && /^\d{6,8}$/.test(refDate)
      ? `${refDate.slice(0, 4)}.${refDate.slice(4, 6)} 기준`
      : '2026.04 기준';

  const datasetMeta = {
    totalComplexCount: records.length,
    totalTxCount: totalMappedTxCount,
    latestContractDate: maxMatchedContractDate || null,
    latestRegisteredDate: maxRegisteredDate || null,
    referenceMonthLabel,
    sampleCountLabel: `${records.length.toLocaleString('ko-KR')}개 단지 · ${totalMappedTxCount.toLocaleString('ko-KR')}건 실거래 전수`,
  };

  return { records, datasetMeta };
}

/**
 * Generates and writes `stats-station-cache.json` to `outDirData` (`public/data`).
 */
function writeStatsStationCache({
  outDirData,
  tx1yPayload,
  apartmentsByDongPath,
  locationScoresPath,
}) {
  const defaultRootDataDir = path.resolve(__dirname, '../../public/data');
  const defaultSrcLibLocPath = path.resolve(__dirname, '../../src/lib/location-scores.json');

  const resolvedAptsPath =
    apartmentsByDongPath ||
    (fs.existsSync(path.join(outDirData, 'apartments-by-dong.json'))
      ? path.join(outDirData, 'apartments-by-dong.json')
      : path.join(defaultRootDataDir, 'apartments-by-dong.json'));

  const resolvedLocsPath =
    locationScoresPath ||
    (fs.existsSync(defaultSrcLibLocPath)
      ? defaultSrcLibLocPath
      : fs.existsSync(path.join(outDirData, 'location-scores.json'))
        ? path.join(outDirData, 'location-scores.json')
        : path.join(defaultRootDataDir, 'location-scores.json'));

  const resolvedTx1yPath = path.join(outDirData, 'transactions-1y.json');

  const apartmentsByDongRaw = fs.existsSync(resolvedAptsPath)
    ? JSON.parse(fs.readFileSync(resolvedAptsPath, 'utf8'))
    : {};
  const locationScoresRaw = fs.existsSync(resolvedLocsPath)
    ? JSON.parse(fs.readFileSync(resolvedLocsPath, 'utf8'))
    : {};
  const tx1yRaw =
    tx1yPayload ||
    (fs.existsSync(resolvedTx1yPath)
      ? JSON.parse(fs.readFileSync(resolvedTx1yPath, 'utf8'))
      : []);

  const cachePayload = buildStatsStationCachePayload({
    apartmentsByDongRaw,
    locationScoresRaw,
    tx1yRaw,
  });

  if (!fs.existsSync(outDirData)) {
    fs.mkdirSync(outDirData, { recursive: true });
  }
  const outPath = path.join(outDirData, 'stats-station-cache.json');
  fs.writeFileSync(outPath, JSON.stringify(cachePayload), 'utf8');
  return cachePayload;
}

module.exports = {
  DONGTAN_STATION_COORDS,
  calculateHaversineDistanceMeters,
  cleanApartmentName,
  normalizeTx1yRows,
  buildStatsStationCachePayload,
  writeStatsStationCache,
};
