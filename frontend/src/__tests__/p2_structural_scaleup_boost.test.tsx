/**
 * @jest-environment jsdom
 *
 * Phase 2 (P2: 구조적 장기 개선 및 스케일업 — Week 2~3) Verification Suite
 * Covers:
 * - P2-1 + Guardrail D + B9: stats-station-cache.json (45KB vs 3.29MB), atomic pipeline hook, /stats SSR precomputation & Dataset JSON-LD
 * - P2-2 + B12: transactions-all.json yearly chunking (tx-2026, tx-2025, tx-2024, tx-historical) & progressive chunked fetch service
 * - P2-3 + B2 + B5: CPA affiliate attribution (partnerCode, envOverrideKey, buildCpaAttributedTargetUrl) & Ad Money v5.0 soft-surface tokens
 * - P2-4 + B15: /api/dashboard-init Cache-Control & /api/macro/rates parallel ECOS Promise.all + 6h Upstash Redis cache
 * - P2-5 + B10: 183/183 Apartment GeoCoordinates 100% coverage, /technovalley/[slug] static B2B route, & Schema.org cleanup
 */

import React from 'react';
import fs from 'fs';
import path from 'path';
import { render } from '@testing-library/react';

// Mock next/navigation for SSR components rendering LoungeHeader
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/technovalley',
  useSearchParams: () => new URLSearchParams(),
  notFound: jest.fn(),
}));

// Mock AdSlot for SSR page tests (both default and named export)
jest.mock('@/components/ads/AdSlot', () => {
  const MockAdSlot = ({
    refreshSlotId,
    minHeightClass,
    cpaCampaignId,
  }: {
    refreshSlotId?: string;
    minHeightClass?: string;
    cpaCampaignId?: string;
  }) => (
    <div
      data-testid={`mock-adslot-${refreshSlotId || 'default'}`}
      data-cpa={cpaCampaignId || ''}
      className={minHeightClass || 'min-h-[250px]'}
    />
  );
  return {
    __esModule: true,
    default: MockAdSlot,
    AdSlot: MockAdSlot,
  };
});

// Mock StatsPageClient to inspect SSR initialPayload prop without full Recharts canvas overhead
jest.mock('@/app/stats/StatsPageClient', () => {
  const MockStatsPageClient = ({
    initialPayload,
  }: {
    initialPayload?: { datasetMeta?: { totalComplexCount?: number; totalTxCount?: number } };
  }) => (
    <div
      data-testid="mock-stats-page-client"
      data-has-initial-payload={initialPayload ? 'true' : 'false'}
      data-total-apartments={String(initialPayload?.datasetMeta?.totalComplexCount ?? 0)}
      data-total-tx={String(initialPayload?.datasetMeta?.totalTxCount ?? 0)}
    />
  );
  return {
    __esModule: true,
    default: MockStatsPageClient,
    StatsPageClient: MockStatsPageClient,
  };
});

// Mock TechnoValleyClient for SSR /technovalley/[slug] page test
jest.mock('@/app/technovalley/TechnoValleyClient', () => ({
  __esModule: true,
  default: ({ selectedJisan }: { selectedJisan?: { name?: string } | null }) => (
    <div
      data-testid="mock-technovalley-client"
      data-selected-jisan={selectedJisan?.name || ''}
    />
  ),
}));

import {
  buildMasterApartmentStatRecordsFromRaw,
  getIssue1DatasetMeta,
  getDongtanStationAnalysisData,
} from '@/lib/stats/dongtanStationDistanceEngine';
import StatsPage from '@/app/stats/page';
import { staticDataService } from '@/lib/services/staticDataService';
import {
  CPA_CAMPAIGN_CATALOG,
  buildCpaAttributedTargetUrl,
  resolveNativeCpaFallbackPayload,
} from '@/lib/ads/cascadeFallback';
import AdSlotSkeletonView from '@/components/ads/views/AdSlotSkeletonView';
import AdSlotCascadeFallbackView from '@/components/ads/views/AdSlotCascadeFallbackView';
import {
  buildApartmentJsonLd,
  resolveComplexGeoCoordinates,
  getApartmentsByDongData,
  getTechnoValleyJisanList,
  formatTechnoValleyJisanSlug,
} from '@/lib/services/apartmentPageService';
import TechnoValleyDetailPage, {
  generateStaticParams as generateTechnoValleyDetailStaticParams,
  generateMetadata as generateTechnoValleyDetailMetadata,
} from '@/app/technovalley/[slug]/page';
import { getMainPageSchema, getApartmentSchema } from '@/lib/utils/structuredData';
import { getUnmappedComplexes } from '@/lib/board/boardEngine';
import { MACRO_DASHBOARD_CACHE_CONTROL } from '@/app/api/dashboard-init/route';
import {
  MACRO_RATES_REDIS_KEY,
  MACRO_RATES_REDIS_TTL_SEC,
  MACRO_RATES_CACHE_CONTROL,
} from '@/app/api/macro/rates/route';

const DATA_DIR = path.resolve(__dirname, '../../public/data');

describe('Phase 2 Structural Scale-Up & Boost Verification (P2-1 ~ P2-5, Guardrail D, B2/B5/B9/B10/B12/B15)', () => {
  describe('P2-1 & Guardrail D & B9: Pre-computed stats-station-cache.json & /stats SSR Dataset JSON-LD', () => {
    it('reduces /stats data payload by >98% via stats-station-cache.json and preserves 100% mathematical parity with raw transactions-1y.json', () => {
      const rawTx1yPath = path.join(DATA_DIR, 'transactions-1y.json');
      const cachePath = path.join(DATA_DIR, 'stats-station-cache.json');
      const aptsByDongPath = path.join(DATA_DIR, 'apartments-by-dong.json');
      const locScoresPath = path.join(DATA_DIR, 'location-scores.json');

      expect(fs.existsSync(cachePath)).toBe(true);
      const rawSize = fs.statSync(rawTx1yPath).size;
      const cacheSize = fs.statSync(cachePath).size;

      // 3.29 MB -> ~45 KB (>98% reduction)
      expect(cacheSize).toBeLessThan(100 * 1024);
      expect(cacheSize / rawSize).toBeLessThan(0.02);

      const rawAptsByDong = JSON.parse(fs.readFileSync(aptsByDongPath, 'utf-8'));
      const rawLocScores = JSON.parse(fs.readFileSync(locScoresPath, 'utf-8'));
      const rawTx1y = JSON.parse(fs.readFileSync(rawTx1yPath, 'utf-8'));
      const fromRaw = buildMasterApartmentStatRecordsFromRaw(
        rawAptsByDong,
        rawLocScores,
        rawTx1y
      );
      const cacheContent = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
      const engineMeta = getIssue1DatasetMeta();

      expect(engineMeta.totalComplexCount).toBe(127);
      expect(engineMeta.totalTxCount).toBe(8055);
      expect(engineMeta).toEqual(fromRaw.datasetMeta);
      expect(cacheContent.records).toHaveLength(fromRaw.records.length);
      expect(cacheContent.records[0]).toEqual(fromRaw.records[0]);
      expect(cacheContent.records[cacheContent.records.length - 1]).toEqual(
        fromRaw.records[fromRaw.records.length - 1]
      );
    });

    it('removes transactions-1y.json import from dongtanStationDistanceEngine.ts and wires writeStatsStationCache into fileGenerators.js (Guardrail D)', () => {
      const engineSrc = fs.readFileSync(
        path.resolve(__dirname, '../lib/stats/dongtanStationDistanceEngine.ts'),
        'utf-8'
      );
      expect(engineSrc).not.toContain("from '../../../public/data/transactions-1y.json'");
      expect(engineSrc).toContain("from '../../../public/data/stats-station-cache.json'");

      const fileGenSrc = fs.readFileSync(
        path.resolve(__dirname, '../../scripts/pipeline/fileGenerators.js'),
        'utf-8'
      );
      expect(fileGenSrc).toContain('writeStatsStationCache');
      expect(fileGenSrc).toContain('writeYearlyTransactionChunks');
    });

    it('precomputes initialPayload on the server in /stats/page.tsx and renders Dataset JSON-LD + #stats-ssr-regression-summary (B9)', () => {
      const payload = getDongtanStationAnalysisData();
      expect(payload.datasetMeta.totalComplexCount).toBe(127);

      const { container, getByTestId } = render(<StatsPage />);

      // Client receives precomputed SSR initialPayload
      const clientNode = getByTestId('mock-stats-page-client');
      expect(clientNode.getAttribute('data-has-initial-payload')).toBe('true');
      expect(clientNode.getAttribute('data-total-apartments')).toBe('127');
      expect(clientNode.getAttribute('data-total-tx')).toBe('8055');

      // Schema.org Dataset + AnalysisNewsArticle JSON-LD
      const ldScript = container.querySelector('script[type="application/ld+json"]');
      expect(ldScript).not.toBeNull();
      const parsedLd = JSON.parse(ldScript?.innerHTML || '{}');
      const graph = parsedLd['@graph'] as Array<Record<string, unknown>>;
      expect(Array.isArray(graph)).toBe(true);
      const datasetNode = graph.find((n) => n['@type'] === 'Dataset');
      expect(datasetNode).toBeDefined();
      expect(String(datasetNode?.name)).toContain('동탄역');
      expect(String(datasetNode?.description)).toContain('기울기 -386만원/km');
      expect(String(datasetNode?.description)).not.toContain('기울기 0만원/km');

      // SSR Regression Summary Section for search crawlers (visible without sr-only cloaking)
      const ssrSummary = container.querySelector('#stats-ssr-regression-summary');
      expect(ssrSummary).not.toBeNull();
      expect(ssrSummary?.className).not.toContain('sr-only');
      expect(ssrSummary?.className).toContain('bg-[#f9fafb]');
      expect(ssrSummary?.className).toContain('dark:bg-[#17171c]');
      expect(ssrSummary?.textContent).toContain('동탄역 거리별 아파트 실거래가 OLS 선형회귀 요약');
      expect(ssrSummary?.textContent).toContain('3,438만원');
      expect(ssrSummary?.textContent).toContain('-386만원');
      expect(ssrSummary?.querySelectorAll('li').length).toBe(5);

      // Verify StatsPageClient isolates useSearchParams inside an inner Suspense child so SSR does not bail out
      const statsClientSrc = fs.readFileSync(
        path.resolve(__dirname, '../app/stats/StatsPageClient.tsx'),
        'utf-8'
      );
      expect(statsClientSrc).toContain('StatsTopicUrlSync');
      expect(statsClientSrc).toContain('<Suspense fallback={null}>');
    });
  });

  describe('P2-2 & B12: Yearly Transaction Chunks & Progressive Fetch Service', () => {
    afterEach(() => {
      staticDataService.clearCache();
      jest.restoreAllMocks();
    });

    it('verifies tx-2026.json, tx-2025.json, tx-2024.json, tx-historical.json, and tx-chunks-manifest.json exist and sum to 100% of transactions-all.json', () => {
      const manifestPath = path.join(DATA_DIR, 'tx-chunks-manifest.json');
      expect(fs.existsSync(manifestPath)).toBe(true);

      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      const chunkFiles = ['tx-2026.json', 'tx-2025.json', 'tx-2024.json', 'tx-historical.json'];

      let sumRows = 0;
      for (const file of chunkFiles) {
        const filePath = path.join(DATA_DIR, file);
        expect(fs.existsSync(filePath)).toBe(true);
        const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        expect(Array.isArray(content.fields)).toBe(true);
        expect(Array.isArray(content.data)).toBe(true);
        sumRows += content.data.length;

        if (file !== 'tx-historical.json') {
          // Recent yearly chunks are each < 1.1 MB (vs 9.42 MB transactions-all.json)
          expect(fs.statSync(filePath).size).toBeLessThan(1.1 * 1024 * 1024);
        }
      }

      const txAll = JSON.parse(
        fs.readFileSync(path.join(DATA_DIR, 'transactions-all.json'), 'utf-8')
      );
      expect(sumRows).toBe(txAll.data.length);
      expect(manifest.totalCount).toBe(txAll.data.length);
    });

    it('resolves minimal yearly chunk files for a given period and progressively merges & caches yearly slices', async () => {
      expect(staticDataService.resolveYearlyChunkFiles('90d')).toEqual([
        'recent-transactions.json',
      ]);
      expect(staticDataService.resolveYearlyChunkFiles('1y')).toEqual([
        'tx-2026.json',
        'tx-2025.json',
      ]);
      expect(staticDataService.resolveYearlyChunkFiles('3y')).toEqual([
        'tx-2026.json',
        'tx-2025.json',
        'tx-2024.json',
      ]);
      expect(staticDataService.resolveYearlyChunkFiles('all')).toEqual([
        'tx-2026.json',
        'tx-2025.json',
        'tx-2024.json',
        'tx-historical.json',
      ]);

      // Mock fetchJson to verify progressive chunk fetching and deduplication cache across 1y -> 3y
      const mockChunk2026 = {
        fields: [
          'aptName',
          'dong',
          'txKey',
          'price',
          'priceEok',
          'priceVal',
          'area',
          'areaPyeong',
          'floor',
          'contractYm',
          'contractDay',
          'contractDate',
          'dealType',
          'deposit',
          'depositEok',
          'monthlyRent',
          'registeredDate',
        ],
        data: [
          [
            '동탄역롯데캐슬',
            '오산동',
            '화성시 오산동_동탄역롯데캐슬',
            150000,
            '15억',
            15.0,
            84.5,
            34,
            25,
            '202605',
            '10',
            '20260510',
            '매매',
            0,
            '',
            0,
            '',
          ],
        ],
      };

      const fetchJsonSpy = jest
        .spyOn(staticDataService, 'fetchJson')
        .mockResolvedValue(mockChunk2026 as unknown as never);

      // 1) Fetch '1y' -> downloads tx-2026.json and tx-2025.json (2 requests)
      const records1y = await staticDataService.fetchPeriodTransactionsChunked('1y', 'v1');
      expect(fetchJsonSpy).toHaveBeenCalledTimes(2);
      expect(records1y).toHaveLength(2);
      expect(records1y[0].aptName).toBe('동탄역롯데캐슬');

      // 2) Expand to '3y' -> reuses cached tx-2026.json and tx-2025.json, only fetches tx-2024.json (+1 request = 3 total)
      const records3y = await staticDataService.fetchPeriodTransactionsChunked('3y', 'v1');
      expect(fetchJsonSpy).toHaveBeenCalledTimes(3);
      expect(records3y).toHaveLength(3);

      // 3) Verify MacroDashboardClient and AptDonutSection wire { chunked: true } into usePeriodTransactions
      const macroDashSrc = fs.readFileSync(
        path.resolve(__dirname, '../components/MacroDashboardClient.tsx'),
        'utf-8'
      );
      expect(macroDashSrc).toContain('{ chunked: true }');

      const donutSrc = fs.readFileSync(
        path.resolve(__dirname, '../components/macro/AptDonutSection.tsx'),
        'utf-8'
      );
      expect(donutSrc).toContain('{ chunked: true }');
    });
  });

  describe('P2-3 & B2 & B5: CPA Affiliate Attribution & Ad Money v5.0 Soft Surface Tokens', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('attaches partnerCode, envOverrideKey, and UTM attribution to all 4 CPA campaigns and supports NEXT_PUBLIC_CPA_URL_* overrides', () => {
      const ids = Object.keys(CPA_CAMPAIGN_CATALOG) as Array<keyof typeof CPA_CAMPAIGN_CATALOG>;
      expect(ids).toHaveLength(4);

      for (const id of ids) {
        const campaign = CPA_CAMPAIGN_CATALOG[id];
        expect(campaign.partnerCode).toBeTruthy();
        expect(campaign.envOverrideKey).toMatch(/^NEXT_PUBLIC_CPA_URL_/);
        expect(campaign.targetUrl).toContain('utm_source=dview_cpa');
        expect(campaign.targetUrl).toContain(`utm_campaign=${id}`);
        expect(campaign.targetUrl).toContain(`partner=${campaign.partnerCode}`);
      }

      const defaultLoanUrl = buildCpaAttributedTargetUrl(
        CPA_CAMPAIGN_CATALOG['mortgage-refinance'],
        {
          slotId: 'slot-ch02',
          apartmentName: '동탄역롯데캐슬',
          dong: '오산동',
          includeContextParams: true,
        }
      );
      expect(defaultLoanUrl).toContain('https://dongtanview.com/guide/stress-dsr-valuation-guide');
      expect(defaultLoanUrl).toContain('utm_campaign=mortgage-refinance');
      expect(defaultLoanUrl).toContain('slot_id=slot-ch02');
      expect(defaultLoanUrl).toContain(encodeURIComponent('동탄역롯데캐슬'));

      // Env override to external affiliate partner URL
      process.env.NEXT_PUBLIC_CPA_URL_MORTGAGE = 'https://partner.example.com/mortgage?aff=1';
      const overriddenUrl = buildCpaAttributedTargetUrl(
        CPA_CAMPAIGN_CATALOG['mortgage-refinance'],
        { slotId: 'slot-ch02', apartmentName: '동탄역롯데캐슬' }
      );
      expect(overriddenUrl).toContain('https://partner.example.com/mortgage');
      expect(overriddenUrl).toContain('aff=1');
      expect(overriddenUrl).toContain('partner=fintech_dsr_compare');
      expect(overriddenUrl).toContain('slot_id=slot-ch02');

      // Security check: blocks javascript: protocol in env override
      process.env.NEXT_PUBLIC_CPA_URL_MORTGAGE = 'javascript:alert(1)';
      const safeFallbackUrl = buildCpaAttributedTargetUrl(
        CPA_CAMPAIGN_CATALOG['mortgage-refinance']
      );
      expect(safeFallbackUrl.startsWith('https://dongtanview.com/')).toBe(true);
    });

    it('enforces Ad Money v5.0 soft-surface tokens (bg-[#f9fafb] dark:bg-[#17171c]) and Pretendard tabular-nums on AdSlotSkeletonView, AdSlotCascadeFallbackView, and AdSlotAdBlockView (B5)', () => {
      const skeletonRender = render(<AdSlotSkeletonView />);
      const skeletonRoot = skeletonRender.getByTestId('ad-slot-skeleton');
      expect(skeletonRoot.className).toContain('bg-[#f9fafb]');
      expect(skeletonRoot.className).toContain('dark:bg-[#17171c]');
      expect(skeletonRender.container.querySelectorAll('.font-mono').length).toBe(0);

      const cpaPayload = resolveNativeCpaFallbackPayload({
        slotId: 'technovalley-b2b-top',
        preferredCampaignId: 'corporate-relocation',
        sourceTrigger: 'UNFILLED_ATTRIBUTE',
      });
      const fallbackRender = render(
        <AdSlotCascadeFallbackView
          cpaPayload={cpaPayload}
          cpaTemplate={CPA_CAMPAIGN_CATALOG['corporate-relocation']}
          cascadeStatus="FALLBACK_ACTIVE"
          lateFillDiscarded={false}
          minHeightClass="min-h-[250px]"
          onCascadeCtaClick={jest.fn()}
        />
      );
      const fallbackRoot = fallbackRender.getByTestId('ad-slot-cascade-fallback');
      expect(fallbackRoot.className).toContain('bg-[#f9fafb]');
      expect(fallbackRoot.className).toContain('dark:bg-[#17171c]');
      expect(fallbackRender.container.querySelectorAll('.font-mono').length).toBe(0);
      const internalCta = fallbackRender.getByTestId('ad-slot-cascade-cta');
      expect(internalCta).not.toHaveAttribute('target', '_blank');

      const adBlockSrc = fs.readFileSync(
        path.resolve(__dirname, '../components/ads/views/AdSlotAdBlockView.tsx'),
        'utf-8'
      );
      expect(adBlockSrc).toContain('bg-[#f9fafb] dark:bg-[#17171c]');
      expect(adBlockSrc).toContain('tabular-nums');
    });
  });

  describe('P2-4 & B15: /api/dashboard-init Cache-Control & /api/macro/rates Parallel ECOS + Redis Cache', () => {
    it('defines public CDN Cache-Control on /api/dashboard-init and parallelizes ECOS requests + 6h Redis cache on /api/macro/rates', () => {
      expect(MACRO_DASHBOARD_CACHE_CONTROL).toBe(
        'public, s-maxage=300, stale-while-revalidate=600'
      );
      expect(MACRO_RATES_REDIS_KEY).toBe('DTDLS:cache:macroRates');
      expect(MACRO_RATES_REDIS_TTL_SEC).toBe(21600);
      expect(MACRO_RATES_CACHE_CONTROL).toBe(
        'public, s-maxage=3600, stale-while-revalidate=21600'
      );

      const dashInitSrc = fs.readFileSync(
        path.resolve(__dirname, '../app/api/dashboard-init/route.ts'),
        'utf-8'
      );
      expect(dashInitSrc).toContain("'Cache-Control': MACRO_DASHBOARD_CACHE_CONTROL");

      const macroRatesSrc = fs.readFileSync(
        path.resolve(__dirname, '../app/api/macro/rates/route.ts'),
        'utf-8'
      );
      expect(macroRatesSrc).toContain('Promise.all([');
      expect(macroRatesSrc).toContain('MACRO_RATES_REDIS_KEY');
      expect(macroRatesSrc).toContain('MACRO_RATES_REDIS_TTL_SEC');
      expect(macroRatesSrc).toContain("'Cache-Control': MACRO_RATES_CACHE_CONTROL");
    });
  });

  describe('P2-5 & B10: 183/183 Apartment GeoCoordinates 100% Coverage, /technovalley/[slug] Route & Schema.org Cleanup', () => {
    it('achieves 100% real-world WGS84 GeoCoordinates coverage across all 183 apartments in apartments-by-dong.json without breaking the 56 GPS fence unmapped complex invariant', async () => {
      const byDong = await getApartmentsByDongData();
      const allApts = Object.values(byDong).flat();
      expect(allApts).toHaveLength(183);

      let validGeoCount = 0;
      for (const apt of allApts) {
        const coords = resolveComplexGeoCoordinates(apt);
        expect(coords).not.toBeNull();
        expect(coords!.lat).toBeGreaterThan(37.14);
        expect(coords!.lat).toBeLessThan(37.24);
        expect(coords!.lng).toBeGreaterThan(127.03);
        expect(coords!.lng).toBeLessThan(127.16);
        expect(coords!.lat === 37.2005 && coords!.lng === 127.0985).toBe(false);

        const jsonLd = buildApartmentJsonLd(
          {
            aptName: apt.name,
            aptSummary: undefined,
            pyeongSummaries: [],
            locationScore: undefined,
            matchedReportData: null,
            matchedDongApt: apt,
            structuredImages: [],
            analytics: {
              minSalePrice: 0,
              maxSalePrice: 0,
              offers: null,
            },
            aiBriefing: `${apt.name} 실거래 분석`,
          },
          'https://dongtanview.com'
        );
        const graph = jsonLd['@graph'] as Array<Record<string, unknown>>;
        const complexNode = graph.find((n) => n['@type'] === 'ApartmentComplex') as Record<
          string,
          unknown
        >;
        const geoNode = complexNode?.geo as {
          '@type': string;
          latitude: number;
          longitude: number;
        };
        expect(geoNode).toBeDefined();
        expect(geoNode['@type']).toBe('GeoCoordinates');
        expect(geoNode.latitude).toBe(coords!.lat);
        expect(geoNode.longitude).toBe(coords!.lng);
        validGeoCount += 1;
      }
      expect(validGeoCount).toBe(183);

      // Verify GPS resident-auth fence invariant (56 complexes with lat=0, lng=0 in boardEngine) remains 100% intact
      const unmappedForGpsFence = getUnmappedComplexes();
      expect(unmappedForGpsFence).toHaveLength(56);

      // Verify TossApartmentExploreClient includes complexes with seoLat/seoLng and explore/page.tsx uncloaks #explore-ssr-semantic-catalog
      const exploreClientSrc = fs.readFileSync(
        path.resolve(__dirname, '../components/TossApartmentExploreClient.tsx'),
        'utf-8'
      );
      expect(exploreClientSrc).toContain('a.seoLat && a.seoLng');

      const explorePageSrc = fs.readFileSync(
        path.resolve(__dirname, '../app/explore/page.tsx'),
        'utf-8'
      );
      expect(explorePageSrc).not.toMatch(/id="explore-ssr-semantic-catalog"[\s\S]{0,180}className="sr-only"/);
    });

    it('generates 56 static params, SEO metadata, and SSR B2B detail view in /technovalley/[slug]/page.tsx', async () => {
      const staticParams = await generateTechnoValleyDetailStaticParams();
      expect(staticParams).toHaveLength(56);

      const jisanList = await getTechnoValleyJisanList();
      const shItem = jisanList.find((i) => i.name === 'SH SQUAREⅡ')!;
      const shSlug = formatTechnoValleyJisanSlug(shItem.name);

      const meta = await generateTechnoValleyDetailMetadata({
        params: Promise.resolve({ slug: shSlug }),
      });
      expect(String(meta.title)).toContain('SH SQUAREⅡ 지식산업센터');
      expect(String(meta.title)).toContain('연면적 35,576.2㎡');
      expect(meta.alternates?.canonical).toBe(
        `https://dongtanview.com/technovalley/${encodeURIComponent(shSlug)}`
      );

      const PageJsx = await TechnoValleyDetailPage({
        params: Promise.resolve({ slug: shSlug }),
      });
      const { container, getByTestId } = render(PageJsx);
      expect(container.querySelector('h1')?.textContent).toContain(
        'SH SQUAREⅡ 지식산업센터'
      );
      expect(container.textContent).toContain('35,576.2㎡');
      expect(container.textContent).toContain('453실');
      expect(container.textContent).toContain('취득세 35% 감면');
      expect(container.querySelectorAll('.font-mono').length).toBe(0);
      expect(getByTestId('technovalley-detail-b2b-adslot').className).not.toContain('p-4');

      const ldScript = container.querySelector('script[type="application/ld+json"]');
      expect(ldScript).not.toBeNull();
      expect(ldScript?.innerHTML).toContain('SH SQUAREⅡ');
    });

    it('aligns WebSite SearchAction urlTemplate with /explore?search={search_term_string} and removes dummy +82-2-000-0000 telephone across JSON-LD schemas (B10)', () => {
      const mainSchema = getMainPageSchema('https://dongtanview.com');
      const websiteNode = mainSchema['@graph'].find(
        (n) => n['@type'] === 'WebSite'
      ) as Record<string, any>;
      expect(websiteNode.potentialAction.target.urlTemplate).toBe(
        'https://dongtanview.com/explore?search={search_term_string}'
      );

      const aptSchema = getApartmentSchema(
        {
          name: '동탄역롯데캐슬',
          dong: '오산동',
          address: '동탄역로 150',
          description: '동탄역 초역세권 단지',
          pyeongs: [],
        },
        'https://dongtanview.com'
      );
      expect(JSON.stringify(aptSchema)).not.toContain('+82-2-000-0000');
    });
  });
});
