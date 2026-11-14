import type { DashboardInitialDataLocal } from '@/hooks/useDashboardMeta';
import type { InitialPageDataWithScores } from '@/lib/services/dashboardData';
import type { FieldReportData } from '@/types/report';
import type { AptTxSummary, RecentTransaction } from '@/types/transaction';
import {
  HARDCODED_MAPPING,
  normalizeAptName,
  sanitizeAptKey,
} from '@/lib/utils/apartmentMapping';

const DEFAULT_LANDMARK_SEED_APTS = [
  '동탄역 롯데캐슬',
  '동탄역롯데캐슬',
  '동탄역 시범 우남퍼스트빌',
  '동탄역시범우남퍼스트빌',
  '동탄역 시범 더샵 센트럴시티',
  '동탄역시범더샵센트럴시티',
  '동탄역 시범 한화꿈에그린 프레스티지',
  '동탄역시범한화꿈에그린프레스티지',
];

const MIN_SEED_RECENT_TXS = 20;
const MAX_SEED_RECENT_TXS = 40;

function extractCleanDate8(tx: Partial<RecentTransaction> | undefined): string {
  if (!tx) return '';
  const raw = String(tx.registeredDate || tx.contractDate || tx.date || '');
  return raw.replace(/[^0-9]/g, '').slice(0, 8);
}

function buildSeedRecentTransactions(allRecent?: RecentTransaction[]): RecentTransaction[] {
  if (!Array.isArray(allRecent) || allRecent.length === 0) return [];

  let maxDateStr = '';
  for (let i = 0; i < allRecent.length; i++) {
    const clean = extractCleanDate8(allRecent[i]);
    if (clean.length === 8 && clean > maxDateStr) {
      maxDateStr = clean;
    }
  }

  const picked: RecentTransaction[] = [];
  const seenIdx = new Set<number>();

  if (maxDateStr.length === 8) {
    for (let i = 0; i < allRecent.length; i++) {
      if (picked.length >= MAX_SEED_RECENT_TXS) break;
      if (extractCleanDate8(allRecent[i]) === maxDateStr) {
        picked.push(allRecent[i]);
        seenIdx.add(i);
      }
    }
  }

  for (let i = 0; i < allRecent.length && picked.length < MIN_SEED_RECENT_TXS; i++) {
    if (!seenIdx.has(i) && allRecent[i]) {
      picked.push(allRecent[i]);
      seenIdx.add(i);
    }
  }

  return picked;
}

function toCompactAptSummary(raw: AptTxSummary): AptTxSummary {
  const rec = raw as AptTxSummary & Record<string, unknown>;
  const compact: Record<string, unknown> = {};
  const scalarKeys = [
    'dong',
    'latestPrice',
    'latestPriceEok',
    'latestArea',
    'latestFloor',
    'latestDate',
    'maxPrice',
    'minPrice',
    'allTimeHigh',
    'txCount',
    'avg1MPrice',
    'avg1MPerPyeong',
    'avg1MTxCount',
    'avg3MPrice',
    'avg3MPerPyeong',
    'avg3MTxCount',
    'latestRentDeposit',
    'avg1MRentDeposit',
    'avg3MRentDeposit',
    'householdCount',
    'yearBuilt',
    'recentPrice',
    'jeonsePrice',
    'jeonseRatio',
    'tradeCount',
    'recentCount',
  ];

  for (const key of scalarKeys) {
    const val = rec[key];
    if (val !== undefined && val !== null && val !== '') {
      compact[key] = val;
    }
  }

  return compact as unknown as AptTxSummary;
}

function buildSlimTxSummary(
  fullSummary: Record<string, AptTxSummary> | undefined,
  seedRecent: RecentTransaction[]
): Record<string, AptTxSummary> {
  if (!fullSummary || typeof fullSummary !== 'object') return {};

  const entries = Object.entries(fullSummary);
  if (entries.length === 0) return {};

  const targetKeys = new Set<string>();
  const normalizedLookup = new Map<string, string>();

  for (const [k] of entries) {
    normalizedLookup.set(k, k);
    normalizedLookup.set(normalizeAptName(k), k);
    normalizedLookup.set(sanitizeAptKey(k), k);
  }

  const addCandidate = (name?: string) => {
    if (!name) return;
    const direct =
      normalizedLookup.get(name) ||
      normalizedLookup.get(normalizeAptName(name)) ||
      normalizedLookup.get(sanitizeAptKey(name));
    if (direct) targetKeys.add(direct);
  };

  for (const tx of seedRecent) {
    addCandidate(tx?.txKey);
    addCandidate(tx?.aptName);
  }

  for (const landmark of DEFAULT_LANDMARK_SEED_APTS) {
    addCandidate(landmark);
  }

  // Top 12 by latestPrice for leaderboard / finance binding parity
  const topByPrice = [...entries]
    .filter(([, v]) => (v?.latestPrice || 0) > 0)
    .sort((a, b) => (b[1]?.latestPrice || 0) - (a[1]?.latestPrice || 0))
    .slice(0, 12);
  for (const [k] of topByPrice) {
    targetKeys.add(k);
  }

  // Top 10 optimal gap complexes so RealtimeRankingBoard gap tab matches post-hydration without visual jump
  type GapSummaryCandidate = AptTxSummary & { recentPrice?: number; jeonsePrice?: number };
  const topByGap = [...entries]
    .filter(([, v]) => {
      const rec = v as GapSummaryCandidate | undefined;
      const sale = rec?.recentPrice || 0;
      const jeonse = rec?.jeonsePrice || 0;
      if (sale <= 0 || jeonse <= 0) return false;
      const gap = sale - jeonse;
      const ratio = Math.round((jeonse / sale) * 100);
      return gap > 0 && gap <= 4.0 && ratio >= 60 && ratio <= 85;
    })
    .sort((a, b) => {
      const recA = a[1] as GapSummaryCandidate | undefined;
      const recB = b[1] as GapSummaryCandidate | undefined;
      const gapA = (recA?.recentPrice || 0) - (recA?.jeonsePrice || 0);
      const gapB = (recB?.recentPrice || 0) - (recB?.jeonsePrice || 0);
      return gapA - gapB;
    })
    .slice(0, 10);
  for (const [k] of topByGap) {
    targetKeys.add(k);
  }

  const slim: Record<string, AptTxSummary> = {};
  for (const k of targetKeys) {
    const raw = fullSummary[k];
    if (raw) {
      slim[k] = toCompactAptSummary(raw);
    }
  }

  return slim;
}

function buildSeedTypeMap(
  fullTypeMap: DashboardInitialDataLocal['typeMap'],
  seedRecent: RecentTransaction[]
): DashboardInitialDataLocal['typeMap'] {
  if (!Array.isArray(fullTypeMap) || fullTypeMap.length === 0) return undefined;

  const seedAreasByApt = new Map<string, number[]>();

  const registerAptArea = (name?: string, area?: number) => {
    if (!name || typeof area !== 'number' || !Number.isFinite(area) || area <= 0) return;
    const keys = [normalizeAptName(name), sanitizeAptKey(name)];
    const mappedAlias = HARDCODED_MAPPING[keys[0]];
    if (mappedAlias) {
      keys.push(normalizeAptName(mappedAlias), sanitizeAptKey(mappedAlias));
    }
    for (const k of keys) {
      if (!k) continue;
      const list = seedAreasByApt.get(k) || [];
      if (!list.some((a) => Math.abs(a - area) < 0.01)) {
        list.push(area);
        seedAreasByApt.set(k, list);
      }
    }
  };

  for (const tx of seedRecent) {
    const areaNum = typeof tx?.area === 'number' ? tx.area : Number(tx?.area || 0);
    registerAptArea(tx?.aptName, areaNum);
    registerAptArea(tx?.txKey, areaNum);
  }

  for (const landmark of DEFAULT_LANDMARK_SEED_APTS) {
    registerAptArea(landmark, 84.5);
  }

  const picked = fullTypeMap.filter((entry) => {
    if (!entry?.aptName) return false;
    const numArea = Number(entry.area);
    if (!Number.isFinite(numArea) || numArea <= 0) return false;
    const areas =
      seedAreasByApt.get(normalizeAptName(entry.aptName)) ||
      seedAreasByApt.get(sanitizeAptKey(entry.aptName));
    if (!areas) return false;
    return areas.some((target) => Math.abs(numArea - target) <= 0.6);
  });

  return picked.length > 0 ? picked : undefined;
}

/**
 * Strips multi-KB prose (`premiumContent`, `pros`, `cons`, `sections`, `comment`, `premiumScores` reasoning)
 * and duplicate `metrics` / `images[]` arrays (loaded on-demand via `getFullReport(id)` and `/data/*.json`),
 * while preserving real report IDs, `viewCount`, `photoCount`, `likes`, `commentCount`, `rating`, and `createdAt`
 * (~140B/report, ~3.9KB for 28 Firestore reports) so popularity sorting, row badges, and modal `getFullReport(id)`
 * continue working seamlessly without bloating RSC HTML.
 */
function toCompactFieldReports(
  reports?: FieldReportData[],
  includeFull?: boolean
): FieldReportData[] {
  if (!Array.isArray(reports) || reports.length === 0) return [];
  if (includeFull) return reports;

  return reports
    .filter((r): r is FieldReportData => Boolean(r && r.id && r.apartmentName))
    .map((r) => {
      const photoCount =
        typeof r.photoCount === 'number'
          ? r.photoCount
          : Array.isArray(r.images)
            ? r.images.length
            : 0;
      const imageUrl = r.imageUrl || r.thumbnailUrl || r.thumbnail;
      const safeThumb = imageUrl && !imageUrl.startsWith('data:') ? imageUrl : undefined;
      return {
        id: r.id,
        apartmentName: r.apartmentName,
        author: r.author || '',
        likes: typeof r.likes === 'number' ? r.likes : 0,
        commentCount: typeof r.commentCount === 'number' ? r.commentCount : 0,
        ...(r.dong ? { dong: r.dong } : {}),
        ...(r.txKey ? { txKey: r.txKey } : {}),
        ...(typeof r.viewCount === 'number' ? { viewCount: r.viewCount } : {}),
        ...(typeof r.rating === 'number' ? { rating: r.rating } : {}),
        ...(photoCount > 0 ? { photoCount } : {}),
        ...(safeThumb ? { imageUrl: safeThumb } : {}),
        ...(r.scoutingDate ? { scoutingDate: r.scoutingDate } : {}),
        ...(r.createdAt !== undefined && r.createdAt !== null ? { createdAt: r.createdAt } : {}),
      };
    });
}

function extractPublicRentalNames(data?: InitialPageDataWithScores): string[] {
  const rentals = new Set<string>();
  if (data?.apartmentMeta) {
    for (const [name, meta] of Object.entries(data.apartmentMeta)) {
      if (meta && typeof meta === 'object' && (meta as { isPublicRental?: boolean }).isPublicRental) {
        rentals.add(name);
      }
    }
  }
  if (data?.sheetApartments) {
    for (const apts of Object.values(data.sheetApartments)) {
      if (!Array.isArray(apts)) continue;
      for (const apt of apts) {
        if (apt?.name && (apt as { isPublicRental?: boolean }).isPublicRental) {
          rentals.add(apt.name);
        }
      }
    }
  }
  return Array.from(rentals);
}

function extractNonZeroFavoriteCounts(favs?: Record<string, number>): Record<string, number> {
  if (!favs) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(favs)) {
    if (typeof v === 'number' && v > 0) {
      out[k] = v;
    }
  }
  return out;
}

/**
 * Slims the RSC prop serialized into `/` and `/overview` HTML (`__next_f`) from ~1.4MB to ~45KB,
 * preserving 100% of first-screen SSR rendering (MacroChart, 1d Donut, initial Timeline, KPIs)
 * while offloading full `tx-summary.json`, `recent-transactions.json`, `location-scores.json`,
 * `apartments-by-dong.json`, and `type-map.json` to Vercel Static CDN (`/data/*.json`).
 */
export function toSlimDashboardInitialData(
  data?: InitialPageDataWithScores,
  options?: { includeFieldReports?: boolean }
): DashboardInitialDataLocal {
  if (!data) {
    return {
      isSlimmedSsr: true,
      kpis: [],
      macroTrend: [],
      txSummary: {},
      recentTransactions: [],
      fieldReports: [],
    };
  }

  const seedRecent = buildSeedRecentTransactions(data.recentTransactions as RecentTransaction[] | undefined);
  const slimSummary = buildSlimTxSummary(
    data.txSummary as Record<string, AptTxSummary> | undefined,
    seedRecent
  );
  const seedTypeMap = buildSeedTypeMap(
    data.typeMap as DashboardInitialDataLocal['typeMap'],
    seedRecent
  );
  const publicRentalNames = extractPublicRentalNames(data);
  const favoriteCounts = extractNonZeroFavoriteCounts(data.favoriteCounts);
  const compactReports = toCompactFieldReports(
    data.fieldReports as FieldReportData[] | undefined,
    options?.includeFieldReports
  );

  return {
    isSlimmedSsr: true,
    kpis: data.kpis || [],
    macroTrend: (data.macroTrend || []) as DashboardInitialDataLocal['macroTrend'],
    recent7DaysVolume: data.recent7DaysVolume as DashboardInitialDataLocal['recent7DaysVolume'],
    recentTransactions: seedRecent,
    txSummary: slimSummary,
    ...(seedTypeMap ? { typeMap: seedTypeMap } : {}),
    ...(publicRentalNames.length > 0 ? { publicRentalNames } : {}),
    ...(Object.keys(favoriteCounts).length > 0 ? { favoriteCounts } : {}),
    fieldReports: compactReports,
  };
}

/**
 * Slims the RSC prop serialized into `/explore` HTML (`__next_f`).
 * Because `ExploreDataLoader` renders the full 184-apartment SEO semantic table directly on the server
 * and `TossApartmentExploreClient` is `dynamic(..., { ssr: false })`, the client shell only needs
 * a lightweight hydration marker plus compact scouting report metadata (`viewCount`, `photoCount`, real `id`)
 * and loads all heavy datasets from `/data/*.json` Static CDN.
 */
export function toSlimExploreInitialData(
  data?: InitialPageDataWithScores
): DashboardInitialDataLocal {
  const compactReports = toCompactFieldReports(
    data?.fieldReports as FieldReportData[] | undefined
  );
  return {
    isSlimmedSsr: true,
    ...(data?.recent7DaysVolume
      ? { recent7DaysVolume: data.recent7DaysVolume as DashboardInitialDataLocal['recent7DaysVolume'] }
      : {}),
    ...(compactReports.length > 0 ? { fieldReports: compactReports } : {}),
  };
}
