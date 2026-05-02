import { SHEET_ID, SHEET_TABS, parseCsvLine } from '@/lib/constants';

function parseCoordString(s: string): { lat: number; lng: number } | null {
  if (!s) return null;
  const parts = s.split(',').map(p => parseFloat(p.trim().replace(/"/g, '')));
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
  return { lat: parts[0], lng: parts[1] };
}

export interface SheetApartment {
  ticker?: string;
  name: string;
  dong: string;
  lat: number;
  lng: number;
  householdCount?: number;
  yearBuilt?: string;
  far?: number;
  bcr?: number;
  parkingCount?: number;
  brand?: string;
  maxFloor?: number;
  minFloor?: number;
  txKey?: string;
  isPublicRental?: boolean;
  starbucksName?: string;
  starbucksAddress?: string;
  starbucksCoordinates?: string;
  distanceToStarbucks?: number;
  mcdonaldsName?: string;
  mcdonaldsAddress?: string;
  mcdonaldsCoordinates?: string;
  distanceToMcDonalds?: number;
  oliveYoungName?: string;
  oliveYoungAddress?: string;
  oliveYoungCoordinates?: string;
  distanceToOliveYoung?: number;
  daisoName?: string;
  daisoAddress?: string;
  daisoCoordinates?: string;
  distanceToDaiso?: number;
  supermarketName?: string;
  supermarketAddress?: string;
  supermarketCoordinates?: string;
  distanceToSupermarket?: number;
}

async function fetchCsv(sheetName: string): Promise<string[][]> {
  const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}&headers=1&_t=${Date.now()}`;
  const res = await fetch(csvUrl, { cache: 'no-store' });
  if (!res.ok) return [];
  const text = await res.text();
  return text.split('\n').filter(l => l.trim()).map(parseCsvLine).map(row => row.map(v => v.replace(/^"|"$/g, '').trim()));
}

function findColIndex(headers: string[], possibleNames: string[]): number {
  for (const name of possibleNames) {
    const normalized = name.replace(/\s+/g, '').toLowerCase();
    const idx = headers.findIndex(h => h.replace(/\s+/g, '').toLowerCase() === normalized);
    if (idx !== -1) return idx;
  }
  return -1;
}

export async function fetchSheetApartmentsByDong() {
  const [aptRows, sboydsRows, restRows] = await Promise.all([
    fetchCsv(SHEET_TABS.APARTMENTS),
    fetchCsv(SHEET_TABS.SBOYDS),
    fetchCsv(SHEET_TABS.RESTAURANTS)
  ]);

  if (aptRows.length < 2) throw new Error(`Sheet tab '${SHEET_TABS.APARTMENTS}' not found or empty`);

  const aptHeaders = aptRows[0];
  const apartments: SheetApartment[] = [];

  const getVal = (row: string[], keys: string[]) => {
    const idx = findColIndex(aptHeaders, keys);
    if (idx !== -1 && row[idx]) return row[idx];
    return undefined;
  };

  for (let i = 1; i < aptRows.length; i++) {
    const row = aptRows[i];
    const name = getVal(row, ['아파트명', 'name', '이름']);
    const dong = getVal(row, ['dong', '동']);
    if (!name || !dong) continue;

    const coordStr = getVal(row, ['좌표', 'coordinates', 'coord']);
    const coord = coordStr ? parseCoordString(coordStr) : null;
    
    const hh = getVal(row, ['세대수', 'householdcount', 'households']);
    const year = getVal(row, ['시공&준공인', '사용승인', '준공연도', 'yearbuilt', '준공']);
    const farStr = getVal(row, ['용적률', 'far']);
    const bcrStr = getVal(row, ['건폐율', 'bcr']);
    const parkStr = getVal(row, ['주차대수', 'parkingcount', '주차']);
    const brand = getVal(row, ['시공사', 'brand', '브랜드']);
    const floorStr = getVal(row, ['최고층', 'maxfloor', 'floors', '층수', '층']);
    const minFloorStr = getVal(row, ['최저층', 'minfloor']);
    const txKey = getVal(row, ['txkey', '실거래키']);
    const rentalStr = getVal(row, ['공공임대', 'public', 'rental', 'ispublicrental']);
    const ticker = getVal(row, ['ticker', '티커']);

    const householdCount = hh ? parseInt(hh.replace(/,/g, '')) : undefined;
    const parkingCount = parkStr ? parseInt(parkStr.replace(/,/g, '')) : undefined;
    const maxFloor = floorStr ? parseInt(floorStr.replace(/,/g, '')) : undefined;
    const minFloor = minFloorStr ? parseInt(minFloorStr.replace(/,/g, '')) : undefined;

    apartments.push({
      ticker, name, dong,
      lat: coord?.lat || 0,
      lng: coord?.lng || 0,
      householdCount: isNaN(householdCount as number) ? undefined : householdCount,
      yearBuilt: year,
      far: farStr ? parseFloat(farStr.replace(/,/g, '')) || undefined : undefined,
      bcr: bcrStr ? parseFloat(bcrStr.replace(/,/g, '')) || undefined : undefined,
      parkingCount: isNaN(parkingCount as number) ? undefined : parkingCount,
      brand,
      maxFloor: isNaN(maxFloor as number) ? undefined : maxFloor,
      minFloor: isNaN(minFloor as number) ? undefined : minFloor,
      txKey,
      isPublicRental: ['y', 'yes', 'true', 'o', '공공'].includes((rentalStr || '').toLowerCase()),
    });
  }

  const tenants: Record<string, { name: string, lat: number, lng: number, address: string }[]> = {
    starbucks: [], oliveyoung: [], daiso: [], mcdonalds: [], supermarket: []
  };

  if (sboydsRows.length > 1) {
    const h = sboydsRows[0];
    const nIdx = findColIndex(h, ['상호명']);
    const latIdx = findColIndex(h, ['위도']);
    const lngIdx = findColIndex(h, ['경도']);
    const addrIdx = findColIndex(h, ['주소']);
    for (let i = 1; i < sboydsRows.length; i++) {
      const row = sboydsRows[i];
      const name = nIdx !== -1 ? row[nIdx] : '';
      if (!name) continue;
      const latStr = latIdx !== -1 ? row[latIdx] : '';
      const lngStr = lngIdx !== -1 ? row[lngIdx] : '';
      const address = addrIdx !== -1 ? row[addrIdx] : '';
      
      if (latStr && lngStr) {
        const entry = { name: name.trim(), lat: parseFloat(latStr), lng: parseFloat(lngStr), address: address.trim() };
        if (name.includes('스타벅스')) tenants.starbucks.push(entry);
        else if (name.includes('올리브영')) tenants.oliveyoung.push(entry);
        else if (name.includes('다이소')) tenants.daiso.push(entry);
      }
    }
  }

  if (restRows.length > 1) {
    const h = restRows[0];
    const nIdx = findColIndex(h, ['상호명']);
    const latIdx = findColIndex(h, ['위도']);
    const lngIdx = findColIndex(h, ['경도']);
    const addrIdx = findColIndex(h, ['지번주소', '도로명주소', '주소']);
    for (let i = 1; i < restRows.length; i++) {
      const row = restRows[i];
      const name = nIdx !== -1 ? row[nIdx] : '';
      if (!name) continue;
      const latStr = latIdx !== -1 ? row[latIdx] : '';
      const lngStr = lngIdx !== -1 ? row[lngIdx] : '';
      const address = addrIdx !== -1 ? row[addrIdx] : '';
      
      if (latStr && lngStr) {
        const cleanName = name.replace(/^(?:\(주\)|주식회사\s*|유한회사\s*)/, '').trim();
        const entry = { name: cleanName, lat: parseFloat(latStr), lng: parseFloat(lngStr), address: address.trim() };
        
        if (cleanName.includes('맥도날드')) {
          tenants.mcdonalds.push(entry);
        } else {
          const isSupermarketMatch = /^(이마트|홈플러스|롯데마트|하나로마트|코스트코|트레이더스|노브랜드|스타필드마켓)/.test(cleanName) || /^[가-힣]*농협.*하나로마트/.test(cleanName);
          const isSupermarket = isSupermarketMatch && !cleanName.includes('이마트24') && !cleanName.includes('버거') && !cleanName.includes('피자');
          if (isSupermarket) tenants.supermarket.push(entry);
        }
      }
    }
  }

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const p1 = lat1 * Math.PI/180;
    const p2 = lat2 * Math.PI/180;
    const dp = (lat2-lat1) * Math.PI/180;
    const dl = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(dp/2) * Math.sin(dp/2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl/2) * Math.sin(dl/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  for (const apt of apartments) {
    if (apt.lat && apt.lng) {
      const findNearest = (list: typeof tenants.starbucks) => {
        let nearestDist = Infinity, nearestItem = null;
        for (const item of list) {
          const dist = getDistance(apt.lat, apt.lng, item.lat, item.lng);
          if (dist < nearestDist) { nearestDist = dist; nearestItem = item; }
        }
        return { item: nearestItem, dist: nearestDist };
      };

      const sb = findNearest(tenants.starbucks);
      if (sb.item) { apt.distanceToStarbucks = Math.round(sb.dist); apt.starbucksName = sb.item.name; apt.starbucksAddress = sb.item.address; apt.starbucksCoordinates = `${sb.item.lat}, ${sb.item.lng}`; }
      
      const oy = findNearest(tenants.oliveyoung);
      if (oy.item) { apt.distanceToOliveYoung = Math.round(oy.dist); apt.oliveYoungName = oy.item.name; apt.oliveYoungAddress = oy.item.address; apt.oliveYoungCoordinates = `${oy.item.lat}, ${oy.item.lng}`; }
      
      const ds = findNearest(tenants.daiso);
      if (ds.item) { apt.distanceToDaiso = Math.round(ds.dist); apt.daisoName = ds.item.name; apt.daisoAddress = ds.item.address; apt.daisoCoordinates = `${ds.item.lat}, ${ds.item.lng}`; }
      
      const mc = findNearest(tenants.mcdonalds);
      if (mc.item) { apt.distanceToMcDonalds = Math.round(mc.dist); apt.mcdonaldsName = mc.item.name; apt.mcdonaldsAddress = mc.item.address; apt.mcdonaldsCoordinates = `${mc.item.lat}, ${mc.item.lng}`; }
      
      const sm = findNearest(tenants.supermarket);
      if (sm.item) { apt.distanceToSupermarket = Math.round(sm.dist); apt.supermarketName = sm.item.name; apt.supermarketAddress = sm.item.address; apt.supermarketCoordinates = `${sm.item.lat}, ${sm.item.lng}`; }
    }
  }

  const byDong: Record<string, SheetApartment[]> = {};
  apartments.forEach(apt => {
    if (!byDong[apt.dong]) byDong[apt.dong] = [];
    byDong[apt.dong].push(apt);
  });

  Object.values(byDong).forEach(list => list.sort((a, b) => a.name.localeCompare(b.name, 'ko')));

  return { total: apartments.length, dongCount: Object.keys(byDong).length, byDong };
}
