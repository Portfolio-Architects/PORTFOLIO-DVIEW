/**
 * @jest-environment jsdom
 *
 * Verification suite for Vercel Origin Transfer & ISR Read Optimization (/boost):
 * 1. Global `<Link prefetch={false}>` enforcement & zero background `.rsc` auto-downloads
 * 2. Initial RSC serialization payload slimming on `/`, `/overview`, `/explore` (~1.76MB -> ~200KB)
 *    with Static CDN (`/data/*.json`) client upgrade & zero Serverless `/api/dashboard-init` hits
 * 3. Edge CDN `s-maxage` headers on read APIs (`type-map`, `technovalley/center-specs`, `proxy-image`)
 */

import React from 'react';
import fs from 'fs';
import path from 'path';
import ts from 'typescript';
import { render, fireEvent, renderHook, act } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { NextRequest } from 'next/server';

const mockPrefetch = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    prefetch: mockPrefetch,
    push: mockPush,
    replace: mockReplace,
    back: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('@/lib/api/rateLimiter', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('@/lib/repositories/favorite.repository', () => ({
  fetchFavoriteCounts: jest.fn().mockResolvedValue({ 동탄역롯데캐슬: 12, zeroApt: 0 }),
}));

jest.mock('@/lib/repositories/apartment.repository', () => ({
  ...jest.requireActual('@/lib/repositories/apartment.repository'),
  fetchApartmentMeta: jest.fn().mockResolvedValue({}),
  fetchApartmentNames: jest.fn().mockResolvedValue([]),
}));

jest.mock('@/lib/repositories/report.repository', () => ({
  ...jest.requireActual('@/lib/repositories/report.repository'),
  listenToReports: jest.fn(() => () => {}),
  getFullReportByApartmentName: jest.fn().mockResolvedValue(null),
  fetchRecentScoutingReports: jest.fn().mockResolvedValue([
    {
      id: 'rep-1',
      apartmentName: '동탄역 롯데캐슬',
      dong: '여울동',
      author: 'tester',
      comment: 'A'.repeat(2000),
      premiumContent: 'P'.repeat(4000),
      pros: 'P'.repeat(4000),
      premiumScores: { totalPremiumScore: 92, reasoning: 'R'.repeat(1500) },
      metrics: { householdCount: 940, brand: '롯데캐슬' },
      viewCount: 321,
      images: [
        { url: 'https://firebasestorage.googleapis.com/v0/b/test/o/1.jpg', caption: '정문', locationTag: 'gate', isPremium: false },
        { url: 'https://firebasestorage.googleapis.com/v0/b/test/o/2.jpg', caption: '조경', locationTag: 'park', isPremium: false },
      ],
      likes: 5,
      commentCount: 2,
      createdAt: '2026-11-01T00:00:00Z',
    },
  ]),
}));

import MobileDock from '@/components/pwa/MobileDock';
import LoungeHeader from '@/components/LoungeHeader';
import { getInitialData } from '@/lib/services/dashboardData';
import {
  toSlimDashboardInitialData,
  toSlimExploreInitialData,
} from '@/lib/services/slimInitialPayload';
import { useDashboardMeta } from '@/hooks/useDashboardMeta';
import { useApartmentDetails } from '@/hooks/useApartmentDetails';
import { useTxData, usePeriodTransactions } from '@/hooks/useStaticData';
import { findTypeMapEntry } from '@/lib/utils/apartmentMapping';
import { calculateOptimalGapRankings } from '@/lib/utils/rankingCalculations';
import { serverLruCache } from '@/lib/utils/server/lruCache';
import { GET as typeMapGet } from '@/app/api/type-map/route';
import { GET as centerSpecsGet } from '@/app/api/technovalley/center-specs/route';
import { GET as proxyImageGet } from '@/app/api/proxy-image/route';
import { checkRateLimit } from '@/lib/api/rateLimiter';

function walkTsxFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__') continue;
      results.push(...walkTsxFiles(fullPath));
    } else if (/\.tsx$/.test(entry.name) && !/\.(test|spec)\.tsx$/.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

const createSwrWrapper = () => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>{children}</SWRConfig>
  );
  return Wrapper;
};

describe('Vercel Origin Transfer & Payload Optimization (/boost)', () => {
  const origFetch = global.fetch;
  const origEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...origEnv };
    globalThis._initialPageDataCache = undefined;
    globalThis._activeFreshDataPromise = null;
  });

  afterEach(() => {
    global.fetch = origFetch;
    process.env = { ...origEnv };
  });

  // =========================================================================
  // 1. Global <Link prefetch={false}> & Background .rsc Suppression
  // =========================================================================
  describe('1. Global <Link prefetch={false}> & Zero Background .rsc Auto-Download', () => {
    it('1.1 enforces prefetch={false} on 100% of next/link <Link> elements across src/', () => {
      const srcRoot = path.resolve(__dirname, '..');
      const tsxFiles = walkTsxFiles(srcRoot);
      const violations: string[] = [];
      let totalLinksChecked = 0;

      for (const filePath of tsxFiles) {
        const code = fs.readFileSync(filePath, 'utf8');
        if (!code.includes('<Link')) continue;

        const sf = ts.createSourceFile(
          filePath,
          code,
          ts.ScriptTarget.Latest,
          true,
          ts.ScriptKind.TSX
        );

        let importsNextLink = false;
        sf.forEachChild((node) => {
          if (
            ts.isImportDeclaration(node) &&
            ts.isStringLiteral(node.moduleSpecifier) &&
            node.moduleSpecifier.text === 'next/link'
          ) {
            importsNextLink = true;
          }
        });
        if (!importsNextLink) continue;

        const visit = (node: ts.Node) => {
          if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
            if (node.tagName.getText(sf) === 'Link') {
              totalLinksChecked++;
              const prefetchAttr = node.attributes.properties.find(
                (p) => ts.isJsxAttribute(p) && p.name.getText(sf) === 'prefetch'
              );
              if (!prefetchAttr || prefetchAttr.getText(sf) !== 'prefetch={false}') {
                const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
                violations.push(
                  `${path.relative(srcRoot, filePath)}:${line + 1} (${
                    prefetchAttr ? prefetchAttr.getText(sf) : 'missing prefetch'
                  })`
                );
              }
            }
          }
          ts.forEachChild(node, visit);
        };
        visit(sf);
      }

      expect(totalLinksChecked).toBeGreaterThanOrEqual(160);
      expect(violations).toEqual([]);
    });

    it('1.2 MobileDock and LoungeHeader never invoke router.prefetch on mount or hover', () => {
      const { container: dockContainer } = render(<MobileDock activeTab="overview" />);
      const { container: headerContainer } = render(<LoungeHeader activeTab="overview" />);

      expect(mockPrefetch).not.toHaveBeenCalled();

      // Open MobileDock "더보기" drawer and hover every link/button
      const moreBtn = dockContainer.querySelector('[data-testid="mobile-dock-more-button"]');
      if (moreBtn) {
        fireEvent.click(moreBtn);
      }

      dockContainer.querySelectorAll('a, button').forEach((el) => {
        fireEvent.mouseEnter(el);
      });
      headerContainer.querySelectorAll('a, button').forEach((el) => {
        fireEvent.mouseEnter(el);
      });

      expect(mockPrefetch).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 2. Slim Initial RSC Payload & Static JSON Upgrade
  // =========================================================================
  describe('2. Slim RSC Initial Payload (/ , /overview , /explore) & Static CDN Upgrade', () => {
    it('2.1 slims 1MB+ raw initialData down to <65KB for Dashboard and <4KB for Explore while preserving first-screen seeds, gap rankings, and compact fieldReports', async () => {
      const fullData = await getInitialData();
      const fullBytes = Buffer.byteLength(JSON.stringify(fullData), 'utf8');
      expect(fullBytes).toBeGreaterThan(800 * 1024);

      const slimDashboard = toSlimDashboardInitialData(fullData);
      const slimDashboardBytes = Buffer.byteLength(JSON.stringify(slimDashboard), 'utf8');

      expect(slimDashboard.isSlimmedSsr).toBe(true);
      expect(slimDashboard.locationScores).toBeUndefined();
      expect(slimDashboard.sheetApartments).toBeUndefined();
      expect(slimDashboard.apartmentMeta).toBeUndefined();
      if (fullData.typeMap && fullData.typeMap.length > 0) {
        expect((slimDashboard.typeMap?.length || 0)).toBeGreaterThan(0);
        expect((slimDashboard.typeMap?.length || 0)).toBeLessThan(fullData.typeMap.length);
      }

      // Compact fieldReports preserves real ID, viewCount, and photoCount while stripping heavy prose & image arrays
      expect(slimDashboard.fieldReports).toHaveLength(1);
      expect(slimDashboard.fieldReports?.[0]).toMatchObject({
        id: 'rep-1',
        apartmentName: '동탄역 롯데캐슬',
        dong: '여울동',
        likes: 5,
        commentCount: 2,
        viewCount: 321,
        photoCount: 2,
      });
      expect((slimDashboard.fieldReports?.[0] as Record<string, unknown>).premiumContent).toBeUndefined();
      expect((slimDashboard.fieldReports?.[0] as Record<string, unknown>).pros).toBeUndefined();
      expect((slimDashboard.fieldReports?.[0] as Record<string, unknown>).comment).toBeUndefined();
      expect(slimDashboard.fieldReports?.[0]?.premiumScores).toBeUndefined();
      expect(slimDashboard.fieldReports?.[0]?.metrics).toBeUndefined();
      expect(slimDashboard.fieldReports?.[0]?.images).toBeUndefined();

      // Optimal gap top-10 rankings are identical before and after full tx-summary hydration
      expect(calculateOptimalGapRankings(slimDashboard.txSummary)).toEqual(
        calculateOptimalGapRankings(fullData.txSummary)
      );

      expect(slimDashboard.macroTrend?.length).toBe(fullData.macroTrend.length);
      expect((slimDashboard.recentTransactions?.length || 0)).toBeGreaterThan(0);
      expect((slimDashboard.recentTransactions?.length || 0)).toBeLessThanOrEqual(40);
      expect(Object.keys(slimDashboard.txSummary || {}).length).toBeGreaterThan(0);
      expect(slimDashboard.favoriteCounts).toEqual({ 동탄역롯데캐슬: 12 });
      expect(slimDashboardBytes).toBeLessThan(65 * 1024);

      const slimExplore = toSlimExploreInitialData(fullData);
      const slimExploreBytes = Buffer.byteLength(JSON.stringify(slimExplore), 'utf8');
      expect(slimExplore.isSlimmedSsr).toBe(true);
      expect(slimExplore.txSummary).toBeUndefined();
      expect(slimExplore.recentTransactions).toBeUndefined();
      expect(slimExplore.sheetApartments).toBeUndefined();
      expect(slimExplore.fieldReports?.[0]).toMatchObject({
        id: 'rep-1',
        apartmentName: '동탄역 롯데캐슬',
        viewCount: 321,
        photoCount: 2,
      });
      expect(slimExploreBytes).toBeLessThan(4096);
    });

    it('2.2 handles empty, undefined, and >40 single-day bulk transaction edge cases cleanly', () => {
      expect(toSlimDashboardInitialData(undefined)).toEqual({
        isSlimmedSsr: true,
        kpis: [],
        macroTrend: [],
        txSummary: {},
        recentTransactions: [],
        fieldReports: [],
      });

      const bulkSameDay = Array.from({ length: 75 }, (_, idx) => ({
        aptName: `테스트단지${idx}`,
        txKey: `테스트단지${idx}`,
        date: '11.14',
        contractDate: '20261114',
        registeredDate: '2026-11-14',
        priceVal: 8.5,
        priceEok: '8.5억',
        area: 84,
        areaPyeong: 33,
        floor: 10,
        dealType: '매매',
      }));

      const slimBulk = toSlimDashboardInitialData({
        favoriteCounts: {},
        typeMap: [],
        apartmentMeta: {},
        fieldReports: [],
        kpis: [],
        macroTrend: [],
        txSummary: {},
        recentTransactions: bulkSameDay as any,
      });

      expect(slimBulk.recentTransactions?.length).toBe(40);
    });

    it('2.3 useDashboardMeta(slimData) skips /api/dashboard-init and loads static /data/*.json on triggerFetch()', async () => {
      const requestedUrls: string[] = [];
      global.fetch = jest.fn().mockImplementation((url: string) => {
        requestedUrls.push(String(url));
        if (String(url).includes('/data/apartments-by-dong.json')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                byDong: {
                  여울동: [
                    {
                      name: '동탄역 롯데캐슬',
                      dong: '여울동',
                      txKey: '동탄역롯데캐슬',
                      householdCount: 940,
                      lat: 37.2,
                      lng: 127.09,
                    },
                  ],
                },
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            )
          );
        }
        if (String(url).includes('/data/type-map.json')) {
          return Promise.resolve(
            new Response(
              JSON.stringify([
                { aptName: '동탄역 롯데캐슬', area: 84, typeM2: '84A', typePyeong: '34평형' },
              ]),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            )
          );
        }
        return Promise.resolve(new Response('{}', { status: 200 }));
      });

      const slimData = toSlimExploreInitialData();
      const { result } = renderHook(() => useDashboardMeta(slimData), {
        wrapper: createSwrWrapper(),
      });

      expect(requestedUrls.some((u) => u.includes('/api/dashboard-init'))).toBe(false);

      await act(async () => {
        result.current.triggerFetch();
        await new Promise((r) => setTimeout(r, 30));
      });

      expect(requestedUrls.some((u) => u.includes('/api/dashboard-init'))).toBe(false);
      expect(requestedUrls.some((u) => u.includes('/api/explore/search-data'))).toBe(false);
      expect(requestedUrls.some((u) => u.includes('/data/apartments-by-dong.json?v='))).toBe(true);
      expect(requestedUrls.some((u) => u.includes('/data/type-map.json?v='))).toBe(true);
      expect(result.current.typeMap['동탄역롯데캐슬']?.['84']).toEqual({
        typeM2: '84A',
        typePyeong: '34평형',
      });
      expect(result.current.nameMapping?.['동탄역 롯데캐슬']).toBe('동탄역롯데캐슬');
    });

    it('2.4 useTxData and usePeriodTransactions upgrade slimmed SSR seed from /data/*.json when revalidateStaticOnMount=true', async () => {
      const requestedUrls: string[] = [];
      global.fetch = jest.fn().mockImplementation((url: string) => {
        requestedUrls.push(String(url));
        if (String(url).includes('/data/tx-summary.json')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                summary: {
                  단지A: { latestPrice: 120000, dong: '여울동' },
                  단지B_정적전체: { latestPrice: 95000, dong: '청계동' },
                },
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            )
          );
        }
        if (String(url).includes('/data/recent-transactions.json')) {
          return Promise.resolve(
            new Response(
              JSON.stringify([
                {
                  aptName: '단지A',
                  txKey: '단지A',
                  date: '11.14',
                  contractDate: '20261114',
                  registeredDate: '2026-11-14',
                  priceVal: 12,
                  priceEok: '12억',
                  area: 84,
                  areaPyeong: 34,
                  floor: 20,
                  dealType: '매매',
                },
                {
                  aptName: '단지B_정적전체',
                  txKey: '단지B_정적전체',
                  date: '11.10',
                  contractDate: '20261110',
                  registeredDate: '2026-11-10',
                  priceVal: 9.5,
                  priceEok: '9.5억',
                  area: 84,
                  areaPyeong: 33,
                  floor: 12,
                  dealType: '매매',
                },
              ]),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            )
          );
        }
        return Promise.resolve(
          new Response(JSON.stringify({ hasDelta: false }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      });

      const slimSummary = { 단지A: { latestPrice: 120000, dong: '여울동' } } as any;
      const slimRecent = [
        {
          aptName: '단지A',
          txKey: '단지A',
          date: '11.14',
          contractDate: '20261114',
          registeredDate: '2026-11-14',
          priceVal: 12,
          priceEok: '12억',
          area: 84,
          areaPyeong: 34,
          floor: 20,
          dealType: '매매',
        },
      ] as any;

      const wrapper = createSwrWrapper();
      const { result: txHook } = renderHook(
        () =>
          useTxData([{ ym: '202611', avgPrice: 90000 } as any], slimSummary, undefined, slimRecent, {
            revalidateStaticOnMount: true,
          }),
        { wrapper }
      );
      const { result: periodHook } = renderHook(
        () => usePeriodTransactions('30d', slimRecent, { chunked: true, revalidateStaticOnMount: true }),
        { wrapper }
      );

      await act(async () => {
        await new Promise((r) => setTimeout(r, 40));
      });

      expect(requestedUrls.some((u) => u.includes('/data/tx-summary.json?v='))).toBe(true);
      expect(requestedUrls.some((u) => u.includes('/data/recent-transactions.json?v='))).toBe(true);
      expect(txHook.current.txSummary?.단지B_정적전체?.latestPrice).toBe(95000);
      expect(periodHook.current.transactions.length).toBe(2);
    });

    it('2.5 prevents stub-report 0 defaults from clobbering async static JSON metrics, keeps findTypeMapEntry WeakMap coherent, and eliminates /api/apartments-by-dong client fetches', () => {
      // 1) WeakMap coherence when typeMap upgrades from seed (84㎡ only) -> full static JSON (84㎡ + 102㎡)
      const seedMap = {
        동탄역롯데캐슬: { '84': { typeM2: '84A', typePyeong: '34A' } },
      };
      const fullMap = {
        동탄역롯데캐슬: {
          '84': { typeM2: '84A', typePyeong: '34A' },
          '102': { typeM2: '102A', typePyeong: '41A' },
        },
      };
      expect(findTypeMapEntry(seedMap, '동탄역 롯데캐슬', 84)?.typeM2).toBe('84A');
      expect(findTypeMapEntry(seedMap, '동탄역 롯데캐슬', 102)).toBeNull();
      expect(findTypeMapEntry(fullMap, '동탄역 롯데캐슬', 102)?.typeM2).toBe('102A');

      // 2) #apt= deep-link / early click stub report upgrades cleanly once static JSON arrives
      global.fetch = jest.fn().mockResolvedValue(
        new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } })
      );
      const stubReport = {
        id: 'stub-동탄역롯데캐슬',
        apartmentName: '동탄역 롯데캐슬',
        dong: '여울동',
        author: '',
        likes: 0,
        commentCount: 0,
        metrics: {
          brand: '',
          householdCount: 0,
          far: 0,
          bcr: 0,
          parkingPerHousehold: 0,
          yearBuilt: 0,
          distanceToElementary: 0,
          distanceToMiddle: 0,
          distanceToHigh: 0,
          distanceToSubway: 0,
          academyDensity: 0,
        },
      } as any;

      const wrapper = createSwrWrapper();
      const { result, rerender } = renderHook(
        ({
          sheets,
          locScores,
        }: {
          sheets: Record<string, any[]>;
          locScores: Record<string, any>;
        }) => useApartmentDetails(stubReport, sheets, undefined, null, {}, locScores),
        {
          wrapper,
          initialProps: {
            sheets: { 여울동: [{ name: '동탄역 롯데캐슬', dong: '여울동' }] },
            locScores: {},
          },
        }
      );

      expect(result.current.resolvedReport?.metrics.householdCount).toBe(0);

      rerender({
        sheets: {
          여울동: [
            {
              name: '동탄역 롯데캐슬',
              dong: '여울동',
              householdCount: 940,
              yearBuilt: '2021',
              far: 499,
              bcr: 48,
              parkingPerHousehold: 1.54,
            },
          ],
        },
        locScores: {
          동탄역롯데캐슬: {
            distanceToSubway: 120,
            distanceToElementary: 380,
            academyDensity: 45,
          },
        },
      });

      expect(result.current.resolvedReport?.metrics.householdCount).toBe(940);
      expect(result.current.resolvedReport?.metrics.yearBuilt).toBe(2021);
      expect(result.current.resolvedReport?.metrics.far).toBe(499);
      expect(result.current.resolvedReport?.metrics.distanceToSubway).toBe(120);
      expect(result.current.resolvedReport?.metrics.academyDensity).toBe(45);

      // 3) DashboardClient uses static /data/apartments-by-dong.json instead of Serverless /api/apartments-by-dong
      const dashboardClientSrc = fs.readFileSync(
        path.resolve(__dirname, '../components/DashboardClient.tsx'),
        'utf8'
      );
      expect(dashboardClientSrc).not.toMatch(/fetch\s*\(\s*['"`]\/api\/apartments-by-dong/);
      expect(dashboardClientSrc).toContain('/data/apartments-by-dong.json');
    });
  });

  // =========================================================================
  // 3. Read API s-maxage Cache Headers & Error Non-Caching
  // =========================================================================
  describe('3. Read API s-maxage Edge Caching (type-map, center-specs, proxy-image)', () => {
    it('3.1 /api/type-map emits s-maxage on normal GET, bypasses with no-store on ?refresh=1, short-caches fallback, and never caches 429', async () => {
      const csvBody = [
        '"no","aptName","area","typeM2","unused","typePyeong"',
        '"1","동탄역롯데캐슬","84.57","84A","","34A"',
      ].join('\n');

      let upstreamUrl = '';
      global.fetch = jest.fn().mockImplementation((url: string) => {
        upstreamUrl = String(url);
        return Promise.resolve(new Response(csvBody, { status: 200 }));
      });

      const normalRes = await typeMapGet(new NextRequest('https://dongtanview.com/api/type-map'));
      expect(normalRes.status).toBe(200);
      expect(normalRes.headers.get('cache-control')).toContain('s-maxage=3600');
      expect(normalRes.headers.get('cache-control')).toContain('stale-while-revalidate=86400');
      expect(upstreamUrl).not.toContain('&_t=');

      const refreshRes = await typeMapGet(
        new NextRequest('https://dongtanview.com/api/type-map?refresh=1')
      );
      expect(refreshRes.status).toBe(200);
      expect(refreshRes.headers.get('cache-control')).toContain('no-store');
      expect(upstreamUrl).toContain('&_t=');

      // Fallback on upstream error
      global.fetch = jest.fn().mockRejectedValueOnce(new Error('Google Sheets timeout'));
      const fallbackRes = await typeMapGet(new NextRequest('https://dongtanview.com/api/type-map'));
      expect(fallbackRes.status).toBe(200);
      expect(fallbackRes.headers.get('cache-control')).toContain('s-maxage=300');

      // 429 rate-limited response must NOT contain s-maxage
      (checkRateLimit as jest.Mock).mockResolvedValueOnce({ success: false });
      const rateLimitRes = await typeMapGet(new NextRequest('https://dongtanview.com/api/type-map'));
      expect(rateLimitRes.status).toBe(429);
      expect(rateLimitRes.headers.get('cache-control') || '').not.toContain('s-maxage');
    });

    it('3.2 /api/technovalley/center-specs emits s-maxage across curated, live-api, and fallback paths', async () => {
      // Branch A: curated-cache (!serviceKey)
      delete process.env.BUILDING_API_KEY;
      delete process.env.PUBLIC_DATA_API_KEY;
      global.fetch = jest.fn().mockResolvedValue(new Response('', { status: 200 }));

      const curatedRes = await centerSpecsGet(
        new NextRequest('https://dongtanview.com/api/technovalley/center-specs')
      );
      expect(curatedRes.status).toBe(200);
      expect(curatedRes.headers.get('cache-control')).toContain('s-maxage=3600');

      // Branch B: live-api (serviceKey present + upstream 200 JSON)
      process.env.PUBLIC_DATA_API_KEY = 'test-odcloud-key';
      global.fetch = jest.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ data: [] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        )
      );

      const liveRes = await centerSpecsGet(
        new NextRequest('https://dongtanview.com/api/technovalley/center-specs')
      );
      expect(liveRes.status).toBe(200);
      const liveBody = await liveRes.json();
      expect(liveBody.source).toBe('live-api');
      expect(liveRes.headers.get('cache-control')).toContain('s-maxage=3600');
      expect(liveRes.headers.get('cache-control')).toContain('stale-while-revalidate=86400');

      // Branch C: live-api upstream failure fallback
      global.fetch = jest.fn().mockImplementation(() =>
        Promise.resolve(new Response('Bad Gateway', { status: 502 }))
      );

      const catchRes = await centerSpecsGet(
        new NextRequest('https://dongtanview.com/api/technovalley/center-specs')
      );
      expect(catchRes.status).toBe(200);
      expect(catchRes.headers.get('cache-control')).toContain('s-maxage=600');

      // Branch D: ?refresh=1 bypasses cache with no-store on 200 live-api, and production serverLruCache coalesces warm hits
      global.fetch = jest.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ data: [] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        )
      );
      const refreshRes = await centerSpecsGet(
        new NextRequest('https://dongtanview.com/api/technovalley/center-specs?refresh=1')
      );
      expect(refreshRes.status).toBe(200);
      expect(refreshRes.headers.get('cache-control')).toContain('no-store');

      serverLruCache.clear();
      (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
      let prodUpstreamCalls = 0;
      global.fetch = jest.fn().mockImplementation(() => {
        prodUpstreamCalls += 1;
        return Promise.resolve(
          new Response(JSON.stringify({ data: [] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      });
      const warmFirst = await centerSpecsGet(
        new NextRequest('https://dongtanview.com/api/technovalley/center-specs')
      );
      const callsAfterFirst = prodUpstreamCalls;
      expect(warmFirst.status).toBe(200);
      expect(callsAfterFirst).toBeGreaterThan(0);

      const warmSecond = await centerSpecsGet(
        new NextRequest('https://dongtanview.com/api/technovalley/center-specs')
      );
      expect(warmSecond.status).toBe(200);
      expect(prodUpstreamCalls).toBe(callsAfterFirst);
      serverLruCache.clear();
    }, 15000);

    it('3.3 /api/proxy-image emits s-maxage + immutable + security headers on 200 raster images and omits s-maxage on 4xx/500 errors', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce(
        new Response(new Uint8Array([137, 80, 78, 71]), {
          status: 200,
          headers: { 'content-type': 'image/png' },
        })
      );

      const okRes = await proxyImageGet(
        new NextRequest(
          'https://dongtanview.com/api/proxy-image?url=' +
            encodeURIComponent('https://firebasestorage.googleapis.com/v0/b/portfolio-dtdls/o/a.png')
        )
      );
      expect(okRes.status).toBe(200);
      expect(okRes.headers.get('cache-control')).toContain('s-maxage=31536000');
      expect(okRes.headers.get('cache-control')).toContain('stale-while-revalidate=86400');
      expect(okRes.headers.get('cache-control')).toContain('immutable');
      expect(okRes.headers.get('x-content-type-options')).toBe('nosniff');
      expect(okRes.headers.get('content-security-policy')).toContain("default-src 'none'");

      // Error responses must never carry public s-maxage
      const badReqRes = await proxyImageGet(
        new NextRequest('https://dongtanview.com/api/proxy-image')
      );
      expect(badReqRes.status).toBe(400);
      expect(badReqRes.headers.get('cache-control') || '').not.toContain('s-maxage');

      const forbiddenRes = await proxyImageGet(
        new NextRequest(
          'https://dongtanview.com/api/proxy-image?url=' +
            encodeURIComponent('https://evil.example.com/a.png')
        )
      );
      expect(forbiddenRes.status).toBe(403);
      expect(forbiddenRes.headers.get('cache-control') || '').not.toContain('s-maxage');

      // proxy.ts exempts /api/proxy-image from duplicate Edge rate-limiting
      const proxySrc = fs.readFileSync(path.resolve(__dirname, '../proxy.ts'), 'utf8');
      expect(proxySrc).toContain("'/api/proxy-image'");
    });
  });
});
