/**
 * @file apartment_canonical_slug_unification.test.tsx
 * @description Empirical verification suite for Apartment Detail URL Slug & Canonical Unification.
 *
 * Verifies:
 * 1. Exact GA4 fragmented pairs ('동탄역 시범 리슈빌' vs '동탄역시범리슈빌아파트',
 *    '동탄역 푸르지오' vs '동탄역푸르지오', radical aliases) converge to identical
 *    canonical URLs across alternates.canonical, openGraph.url, Schema.org JSON-LD,
 *    and SSR ApartmentPage ReportShareBar canonicalPath + scoped txSummary keys.
 * 2. Full real-data corpus verification across 100% of apartments-by-dong.json (183 entries)
 *    and tx-summary.json (184 entries) — idempotence, whitespace/parenthesis/Roman-numeral
 *    freedom, and exact MOLIT tx-summary key alignment.
 * 3. SSR internal links on /zone/[id] and /explore, plus /api/indexing/apartment Google
 *    Indexing API payload unification.
 * 4. Client shallow routing (ApartmentModal + recirculationEngine), direct SSR landing
 *    hydration (zero URL overwrite & zero duplicate virtual page_view), in-place replaceState
 *    normalization on legacy non-canonical URLs, and share URL unification (copyAptSummaryToClipboard).
 * 5. Adversarial & boundary inputs (empty, null/undefined, multi-encoded, malformed %ZZ URI,
 *    ghost complexes, XSS payloads).
 */

import React from 'react';
import fs from 'fs';
import path from 'path';
import { render, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NextRequest } from 'next/server';
import {
  resolveCanonicalAptSlug,
  sanitizeAptKey,
  stripApartmentNoiseQueryParams,
  type CanonicalAptSlugItem,
} from '@/lib/utils/apartmentMapping';
import {
  decodeAptName,
  getApartmentPageData,
  buildApartmentSeoMetadata,
  buildApartmentJsonLd,
  getDefaultApartmentMetadata,
} from '@/lib/services/apartmentPageService';
import {
  decodeSafeAptParam,
  resetVirtualPageViewLedger,
  getVirtualPageViewLedger,
  getVirtualPageViewCount,
  syncShallowApartmentOpen,
  syncShallowModalCloseToDashboard,
} from '@/lib/ads/recirculationEngine';
import { copyAptSummaryToClipboard } from '@/lib/utils/kakaoShare';
import { generateValuationJsonLd } from '@/lib/analytics/valuationModels';
import { recommendDviewSeoAction } from '@/lib/services/searchConsoleCtr';
import { MBTI_PROFILES } from '@/lib/data/mbtiData';
import sitemap from '@/app/sitemap';
import { proxy } from '@/proxy';
import ApartmentModal from '@/components/apartment/ApartmentModal';
import { buildInitialApartments, type DongApartment } from '@/lib/dong-apartments';
import type { AptTxSummary } from '@/lib/types/transaction';
import type { FieldReportData } from '@/lib/types/report.types';

// --- Mocks for Client & SSR Shell Wrappers ---
jest.mock('@/components/pwa/PWAProvider', () => ({
  usePWA: () => ({
    showToast: jest.fn(),
    triggerCustomA2HSModal: jest.fn(),
  }),
}));

jest.mock('@/contexts/SettingsContext', () => ({
  useSettingsValues: () => ({
    areaUnit: 'm2',
  }),
}));

jest.mock('@/hooks/usePreventElasticBounce', () => ({
  usePreventElasticBounce: jest.fn(),
}));

jest.mock('@/hooks/useSwipeNavigation', () => ({
  useSwipeNavigation: jest.fn(),
}));

jest.mock('@/hooks/useApartmentDetails', () => ({
  useApartmentDetails: (report: FieldReportData) => ({
    txSummaryData: {},
    fullReportData: report,
    modalTransactions: [],
    isLoadingDetail: false,
    isTxLoading: false,
    resolvedReport: report,
    aptTxSummary: undefined,
    loadAllTransactions: jest.fn(),
  }),
}));

jest.mock('@/components/DashboardClient', () => {
  return function MockDashboardClient(props: {
    preselectedAptName?: string;
    initialDashboardData?: { txSummary?: Record<string, unknown> };
  }) {
    const txKeys = Object.keys(props.initialDashboardData?.txSummary || {});
    return (
      <div
        data-testid="mock-dashboard-client"
        data-preselected-apt={props.preselectedAptName || ''}
        data-tx-keys={txKeys.join(',')}
      />
    );
  };
});

jest.mock('@/app/zone/[id]/ZoneDetailClient', () => {
  return function MockZoneDetailClient() {
    return <div data-testid="mock-zone-detail-client" />;
  };
});

jest.mock('@/app/explore/ExploreClient', () => {
  return function MockExploreClient() {
    return <div data-testid="mock-explore-client" />;
  };
});

jest.mock('@/components/LoungeHeader', () => {
  return function MockLoungeHeader() {
    return <header data-testid="mock-lounge-header" />;
  };
});

jest.mock('@/components/pwa/MobileDock', () => {
  return function MockMobileDock() {
    return <nav data-testid="mock-mobile-dock" />;
  };
});

jest.mock('@/components/common/ReportShareBar', () => {
  return function MockReportShareBar(props: { canonicalPath: string; title: string }) {
    return (
      <div
        data-testid="mock-report-share-bar"
        data-canonical-path={props.canonicalPath}
        data-title={props.title}
      />
    );
  };
});

const mockRequestGoogleIndexing = jest.fn().mockResolvedValue({
  ok: true,
  status: 200,
  urlNotificationMetadata: {},
});

jest.mock('@/lib/utils/server/googleIndexing', () => ({
  requestGoogleIndexing: (...args: unknown[]) => mockRequestGoogleIndexing(...args),
}));

jest.mock('@/lib/firebaseAdmin', () => ({
  adminDb: null,
}));

jest.mock('@/lib/redis', () => ({
  redis: null,
  rawRedis: null,
}));

// Load 100% real public datasets once
const apartmentsByDongRaw = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'public/data/apartments-by-dong.json'), 'utf-8')
) as { byDong: Record<string, DongApartment[]> };
const REAL_BY_DONG: Record<string, DongApartment[]> = apartmentsByDongRaw.byDong;

const txSummaryRaw = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'public/data/tx-summary.json'), 'utf-8')
) as { summary: Record<string, AptTxSummary> };
const REAL_TX_SUMMARY: Record<string, AptTxSummary> = txSummaryRaw.summary;

describe('Apartment Canonical URL Slug & Metadata Unification Suite', () => {
  beforeEach(() => {
    resetVirtualPageViewLedger();
    mockRequestGoogleIndexing.mockClear();
    window.history.replaceState(null, '', '/');
  });

  afterEach(() => {
    cleanup();
  });

  // =========================================================================
  // 1. Exact GA4 Fragmented Pairs Reported in Task
  // =========================================================================
  describe('1. Exact GA4 Fragmented Pairs Convergence (Metadata, JSON-LD & SSR Page)', () => {
    it('converges "동탄역 시범 리슈빌" and "동탄역시범리슈빌아파트" to identical canonical URL & JSON-LD graph IDs', async () => {
      const expectedCanonicalSlug = '동탄역시범리슈빌아파트';
      const expectedCanonicalUrl = `https://dongtanview.com/apartment/${encodeURIComponent(expectedCanonicalSlug)}`;

      expect(
        resolveCanonicalAptSlug('동탄역 시범 리슈빌', {
          txMap: REAL_TX_SUMMARY,
          sheetApartments: REAL_BY_DONG as Record<string, CanonicalAptSlugItem[]>,
        })
      ).toBe(expectedCanonicalSlug);

      expect(
        resolveCanonicalAptSlug('동탄역시범리슈빌아파트', {
          txMap: REAL_TX_SUMMARY,
          sheetApartments: REAL_BY_DONG as Record<string, CanonicalAptSlugItem[]>,
        })
      ).toBe(expectedCanonicalSlug);

      // URL-encoded variants
      expect(
        resolveCanonicalAptSlug(encodeURIComponent('동탄역 시범 리슈빌'), {
          txMap: REAL_TX_SUMMARY,
          sheetApartments: REAL_BY_DONG as Record<string, CanonicalAptSlugItem[]>,
        })
      ).toBe(expectedCanonicalSlug);

      const [spacedMeta, canonicalMeta] = await Promise.all([
        buildApartmentSeoMetadata('동탄역 시범 리슈빌', undefined, 'https://dongtanview.com'),
        buildApartmentSeoMetadata('동탄역시범리슈빌아파트', undefined, 'https://dongtanview.com'),
      ]);

      expect(spacedMeta.alternates?.canonical).toBe(expectedCanonicalUrl);
      expect(canonicalMeta.alternates?.canonical).toBe(expectedCanonicalUrl);
      expect(spacedMeta.openGraph?.url).toBe(expectedCanonicalUrl);
      expect(canonicalMeta.openGraph?.url).toBe(expectedCanonicalUrl);

      // Default fallback metadata also canonicalizes known display names
      const fallbackMeta = getDefaultApartmentMetadata(
        'https://dongtanview.com',
        '동탄역 시범 리슈빌'
      );
      expect(fallbackMeta.alternates?.canonical).toBe(expectedCanonicalUrl);
      expect(fallbackMeta.openGraph?.url).toBe(expectedCanonicalUrl);

      // JSON-LD graph @id / url convergence
      const [spacedPageData, canonicalPageData] = await Promise.all([
        getApartmentPageData('동탄역 시범 리슈빌'),
        getApartmentPageData('동탄역시범리슈빌아파트'),
      ]);
      expect(spacedPageData.resolvedTxKey).toBe(expectedCanonicalSlug);
      expect(canonicalPageData.resolvedTxKey).toBe(expectedCanonicalSlug);

      const spacedJsonLd = buildApartmentJsonLd(spacedPageData, 'https://dongtanview.com');
      const canonicalJsonLd = buildApartmentJsonLd(canonicalPageData, 'https://dongtanview.com');

      const spacedGraph = spacedJsonLd['@graph'] as Record<string, unknown>[];
      const canonicalGraph = canonicalJsonLd['@graph'] as Record<string, unknown>[];

      const spacedWebPage = spacedGraph.find((n) => n['@type'] === 'WebPage') as Record<string, unknown>;
      const canonicalWebPage = canonicalGraph.find((n) => n['@type'] === 'WebPage') as Record<string, unknown>;
      expect(spacedWebPage['@id']).toBe(`${expectedCanonicalUrl}#webpage`);
      expect(spacedWebPage.url).toBe(expectedCanonicalUrl);
      expect(spacedWebPage['@id']).toBe(canonicalWebPage['@id']);

      const spacedComplex = spacedGraph.find((n) => n['@type'] === 'ApartmentComplex') as Record<string, unknown>;
      expect(spacedComplex['@id']).toBe(`${expectedCanonicalUrl}#complex`);
      expect(spacedComplex.url).toBe(expectedCanonicalUrl);

      const spacedListing = spacedGraph.find((n) => n['@type'] === 'RealEstateListing') as Record<string, unknown>;
      expect(spacedListing['@id']).toBe(`${expectedCanonicalUrl}#listing`);
      expect(spacedListing.url).toBe(expectedCanonicalUrl);
    });

    it('converges "동탄역 푸르지오" and "동탄역푸르지오" to identical canonical URL & JSON-LD graph IDs', async () => {
      const expectedCanonicalSlug = '동탄역푸르지오';
      const expectedCanonicalUrl = `https://dongtanview.com/apartment/${encodeURIComponent(expectedCanonicalSlug)}`;

      expect(
        resolveCanonicalAptSlug('동탄역 푸르지오', {
          txMap: REAL_TX_SUMMARY,
          sheetApartments: REAL_BY_DONG as Record<string, CanonicalAptSlugItem[]>,
        })
      ).toBe(expectedCanonicalSlug);

      const [spacedMeta, canonicalMeta] = await Promise.all([
        buildApartmentSeoMetadata('동탄역 푸르지오', undefined, 'https://dongtanview.com'),
        buildApartmentSeoMetadata('동탄역푸르지오', undefined, 'https://dongtanview.com'),
      ]);

      expect(spacedMeta.alternates?.canonical).toBe(expectedCanonicalUrl);
      expect(canonicalMeta.alternates?.canonical).toBe(expectedCanonicalUrl);
      expect(spacedMeta.openGraph?.url).toBe(expectedCanonicalUrl);
      expect(canonicalMeta.openGraph?.url).toBe(expectedCanonicalUrl);

      const spacedData = await getApartmentPageData('동탄역 푸르지오');
      const spacedJsonLd = buildApartmentJsonLd(spacedData, 'https://dongtanview.com');
      const spacedGraph = spacedJsonLd['@graph'] as Record<string, unknown>[];
      const webPage = spacedGraph.find((n) => n['@type'] === 'WebPage') as Record<string, unknown>;
      expect(webPage.url).toBe(expectedCanonicalUrl);
    });

    it('renders identical canonical ReportShareBar canonicalPath and clean txSummary keys on SSR ApartmentPage', async () => {
      const ApartmentPage = (await import('@/app/apartment/[aptName]/page')).default;
      const expectedCanonicalPath = `/apartment/${encodeURIComponent('동탄역시범리슈빌아파트')}`;

      const spacedJsx = await ApartmentPage({
        params: Promise.resolve({ aptName: encodeURIComponent('동탄역 시범 리슈빌') }),
      });
      const spacedRender = render(spacedJsx);
      const shareBar = spacedRender.container.querySelector('[data-testid="mock-report-share-bar"]');
      expect(shareBar?.getAttribute('data-canonical-path')).toBe(expectedCanonicalPath);

      const dashClient = spacedRender.container.querySelector('[data-testid="mock-dashboard-client"]');
      // Scoped txSummary must ONLY contain the canonical MOLIT key, never the spaced request alias
      expect(dashClient?.getAttribute('data-tx-keys')).toBe('동탄역시범리슈빌아파트');
      spacedRender.unmount();
    });

    it('converges radical display-vs-MOLIT aliases and prevents cross-complex fuzzy hijacking on 0-tx complexes', async () => {
      const radicalPairs: Array<[string, string]> = [
        ['능동역 경남아너스빌', '동탄숲속마을자연앤경남아너스빌1124-0'],
        ['동탄숲속마을자연앤경남아너스빌(1124-0)', '동탄숲속마을자연앤경남아너스빌1124-0'],
        ['푸른마을 두산위브', '푸른마을두산위브'],
        ['동탄푸른마을 두산위브', '푸른마을두산위브'],
        ['예당마을 푸르지오', '푸르지오'],
        ['푸른마을 포스코더샵 2차', '포스코더샵2차'],
        // 0-tx complex in 신동 must NEVER hijack 반송동 '동탄파라곤'
        ['동탄 파라곤 3차', '동탄파라곤3차'],
      ];

      for (const [alias, expectedSlug] of radicalPairs) {
        const resolved = resolveCanonicalAptSlug(alias, {
          txMap: REAL_TX_SUMMARY,
          sheetApartments: REAL_BY_DONG as Record<string, CanonicalAptSlugItem[]>,
        });
        expect(resolved).toBe(expectedSlug);

        const meta = await buildApartmentSeoMetadata(alias, undefined, 'https://dongtanview.com');
        expect(meta.alternates?.canonical).toBe(
          `https://dongtanview.com/apartment/${encodeURIComponent(expectedSlug)}`
        );
      }
    });
  });

  // =========================================================================
  // 2. Full Real-Data Corpus Verification (183 Dong Apartments + 184 Tx Keys)
  // =========================================================================
  describe('2. Full Real-Data Corpus Verification (183 Dong Apartments & 184 Tx Summary Keys)', () => {
    it('resolves all 183 apartments-by-dong.json entries to sanitized, idempotent canonical slugs matching txKey', () => {
      const allApts = Object.values(REAL_BY_DONG).flat();
      expect(allApts.length).toBeGreaterThanOrEqual(180);

      let txSummaryHitCount = 0;

      for (const apt of allApts) {
        const slugFromDisplayName = resolveCanonicalAptSlug(apt.name, {
          txKey: apt.txKey,
          txMap: REAL_TX_SUMMARY,
          sheetApartments: REAL_BY_DONG as Record<string, CanonicalAptSlugItem[]>,
          dong: apt.dong,
        });

        // Must be non-empty and free of spaces, parentheses, commas, and Roman numerals
        expect(slugFromDisplayName.length).toBeGreaterThan(0);
        expect(slugFromDisplayName).toBe(sanitizeAptKey(slugFromDisplayName));
        expect(slugFromDisplayName).not.toMatch(/[\s(),ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]/);

        // Must match the apartment's sanitized txKey
        if (apt.txKey) {
          expect(slugFromDisplayName).toBe(sanitizeAptKey(apt.txKey));
        }

        // Must be strictly idempotent: resolve(resolve(name)) === resolve(name)
        const secondPass = resolveCanonicalAptSlug(slugFromDisplayName, {
          txMap: REAL_TX_SUMMARY,
          sheetApartments: REAL_BY_DONG as Record<string, CanonicalAptSlugItem[]>,
          dong: apt.dong,
        });
        expect(secondPass).toBe(slugFromDisplayName);

        if (REAL_TX_SUMMARY[slugFromDisplayName]) {
          txSummaryHitCount++;
        }
      }

      // All 167 transacted complexes in apartments-by-dong.json hit tx-summary.json
      expect(txSummaryHitCount).toBeGreaterThanOrEqual(167);
    });

    it('preserves 100% of all 184 tx-summary.json keys as fixed-point canonical slugs', () => {
      const txKeys = Object.keys(REAL_TX_SUMMARY);
      expect(txKeys.length).toBeGreaterThanOrEqual(180);

      for (const key of txKeys) {
        expect(
          resolveCanonicalAptSlug(key, {
            txMap: REAL_TX_SUMMARY,
            sheetApartments: REAL_BY_DONG as Record<string, CanonicalAptSlugItem[]>,
          })
        ).toBe(key);
      }
    });
  });

  // =========================================================================
  // 3. SSR Catalog Links (/zone/[id], /explore) & Google Indexing API
  // =========================================================================
  describe('3. SSR Internal Links & Google Indexing API Unification', () => {
    it('renders canonical whitespace-free /apartment/ links in SSR /zone/community, /zone/techno, and /explore', async () => {
      const ZonePage = (await import('@/app/zone/[id]/page')).default;

      // 청계동 (community): 동탄역시범리슈빌아파트, 동탄역센트럴푸르지오
      const zoneJsx = await ZonePage({ params: Promise.resolve({ id: 'community' }) });
      const { container: zoneContainer, unmount: unmountZone } = render(zoneJsx);

      const zoneAptAnchors = Array.from(
        zoneContainer.querySelectorAll('a[href^="/apartment/"]')
      ) as HTMLAnchorElement[];
      expect(zoneAptAnchors.length).toBeGreaterThan(0);

      const zoneHrefs = zoneAptAnchors.map((a) => a.getAttribute('href') || '');
      expect(zoneHrefs).toContain(
        `/apartment/${encodeURIComponent('동탄역시범리슈빌아파트')}`
      );
      expect(zoneHrefs).toContain(
        `/apartment/${encodeURIComponent('동탄역센트럴푸르지오')}`
      );
      for (const href of zoneHrefs) {
        expect(href).not.toContain('%20');
      }
      unmountZone();

      // 영천동 (techno): 동탄역푸르지오
      const tvJsx = await ZonePage({ params: Promise.resolve({ id: 'techno' }) });
      const { container: tvContainer, unmount: unmountTv } = render(tvJsx);
      const tvHrefs = Array.from(
        tvContainer.querySelectorAll('a[href^="/apartment/"]')
      ).map((a) => a.getAttribute('href') || '');
      expect(tvHrefs).toContain(`/apartment/${encodeURIComponent('동탄역푸르지오')}`);
      for (const href of tvHrefs) {
        expect(href).not.toContain('%20');
        const decodedSlug = decodeURIComponent(href.replace(/^\/apartment\//, ''));
        expect(REAL_TX_SUMMARY[decodedSlug]).toBeDefined();
      }
      unmountTv();

      const ExplorePage = (await import('@/app/explore/page')).default;
      const exploreRootEl = (await ExplorePage()) as React.ReactElement<{
        children: React.ReactElement<{ children: React.ReactElement }>[];
      }>;
      const suspenseChild = exploreRootEl.props.children[1].props.children as React.ReactElement & {
        type: (props: Record<string, unknown>) => Promise<React.ReactElement>;
      };
      const exploreResolvedJsx = await suspenseChild.type(suspenseChild.props || {});
      const { container: exploreContainer, unmount: unmountExplore } = render(exploreResolvedJsx);

      const ssrCatalog = exploreContainer.querySelector('#explore-ssr-semantic-catalog');
      expect(ssrCatalog).not.toBeNull();
      const exploreAnchors = Array.from(
        ssrCatalog!.querySelectorAll('a[href^="/apartment/"]')
      ) as HTMLAnchorElement[];
      expect(exploreAnchors.length).toBe(Object.keys(REAL_TX_SUMMARY).length);

      const exploreHrefs = exploreAnchors.map((a) => a.getAttribute('href') || '');
      expect(exploreHrefs).toContain(
        `/apartment/${encodeURIComponent('동탄역시범리슈빌아파트')}`
      );
      expect(exploreHrefs).toContain(`/apartment/${encodeURIComponent('동탄역푸르지오')}`);
      expect(exploreHrefs).not.toContain(`/apartment/${encodeURIComponent('동탄파라곤3차')}`);
      for (const href of exploreHrefs) {
        expect(href).not.toContain('%20');
        const decodedSlug = decodeURIComponent(href.replace(/^\/apartment\//, ''));
        expect(REAL_TX_SUMMARY[decodedSlug]).toBeDefined();
      }
      unmountExplore();
    });

    it('submits the unified canonical URL to Google Indexing API whether called with display name or MOLIT key', async () => {
      const { POST } = await import('@/app/api/indexing/apartment/route');
      const expectedTargetUrl = `https://dongtanview.com/apartment/${encodeURIComponent('동탄역시범리슈빌아파트')}`;

      const reqSpaced = new NextRequest('http://localhost/api/indexing/apartment', {
        method: 'POST',
        headers: { 'x-forwarded-for': '198.51.100.41' },
        body: JSON.stringify({ apartmentName: '동탄역 시범 리슈빌' }),
      });
      const resSpaced = await POST(reqSpaced);
      expect(resSpaced.status).toBe(200);
      const bodySpaced = await resSpaced.json();
      expect(bodySpaced.success).toBe(true);
      expect(mockRequestGoogleIndexing).toHaveBeenLastCalledWith(
        expectedTargetUrl,
        'URL_UPDATED'
      );

      mockRequestGoogleIndexing.mockClear();

      const reqCanonical = new NextRequest('http://localhost/api/indexing/apartment', {
        method: 'POST',
        headers: { 'x-forwarded-for': '198.51.100.42' },
        body: JSON.stringify({ apartmentName: '동탄역시범리슈빌아파트' }),
      });
      const resCanonical = await POST(reqCanonical);
      expect(resCanonical.status).toBe(200);
      expect(mockRequestGoogleIndexing).toHaveBeenLastCalledWith(
        expectedTargetUrl,
        'URL_UPDATED'
      );
    });
  });

  // =========================================================================
  // 4. Client Shallow Routing, Direct SSR Landing Hydration & Share URLs
  // =========================================================================
  describe('4. Client Shallow Routing, Direct SSR Hydration & Share URL Unification', () => {
    const richevilleReport: FieldReportData = {
      id: 'stub-richeville',
      apartmentName: '동탄역 시범 리슈빌',
      dong: '청계동',
      author: 'D-VIEW',
      likes: 0,
      commentCount: 0,
      createdAt: null,
      metrics: {
        brand: '계룡리슈빌',
        householdCount: 656,
        yearBuilt: '2015',
      } as FieldReportData['metrics'],
    };

    it('pushes canonical /apartment/동탄역시범리슈빌아파트 and fires 1 virtual page_view when opening modal from /', () => {
      window.history.replaceState(null, '', '/');
      resetVirtualPageViewLedger();

      render(
        <ApartmentModal
          report={richevilleReport}
          onClose={jest.fn()}
          user={null}
          sheetApartments={REAL_BY_DONG}
          txSummaryData={REAL_TX_SUMMARY}
        />
      );

      const expectedCanonicalPath = `/apartment/${encodeURIComponent('동탄역시범리슈빌아파트')}`;
      expect(window.location.pathname).toBe(expectedCanonicalPath);
      expect(getVirtualPageViewCount()).toBe(1);
      expect(getVirtualPageViewLedger()[0].path).toBe(expectedCanonicalPath);
    });

    it('does NOT overwrite canonical URL or fire duplicate virtual page_view on direct organic SSR landing', () => {
      const canonicalPath = `/apartment/${encodeURIComponent('동탄역시범리슈빌아파트')}`;
      window.history.replaceState(null, '', canonicalPath);
      resetVirtualPageViewLedger();

      const pushSpy = jest.spyOn(History.prototype, 'pushState');

      render(
        <ApartmentModal
          report={richevilleReport}
          onClose={jest.fn()}
          user={null}
          sheetApartments={REAL_BY_DONG}
          txSummaryData={REAL_TX_SUMMARY}
        />
      );

      // URL must remain canonical (must NOT revert to %EB%8F%99%ED%83%84%EC%97%AD%20%EC%8B%9C%EB%B2%94%20%EB%A6%AC%EC%8A%88%EB%B9%8C)
      expect(window.location.pathname).toBe(canonicalPath);
      expect(pushSpy).not.toHaveBeenCalled();
      expect(getVirtualPageViewCount()).toBe(0);

      pushSpy.mockRestore();
    });

    it('normalizes legacy non-canonical /apartment/동탄역%20시범%20리슈빌 URL in-place via replaceState preserving query & hash without duplicate virtual PV', () => {
      const legacySpacedPath = `/apartment/${encodeURIComponent('동탄역 시범 리슈빌')}`;
      window.history.replaceState(
        null,
        '',
        `${legacySpacedPath}?utm_source=google&utm_medium=organic#overview`
      );
      resetVirtualPageViewLedger();

      const pushSpy = jest.spyOn(History.prototype, 'pushState');

      render(
        <ApartmentModal
          report={richevilleReport}
          onClose={jest.fn()}
          user={null}
          sheetApartments={REAL_BY_DONG}
          txSummaryData={REAL_TX_SUMMARY}
        />
      );

      const expectedCanonicalPath = `/apartment/${encodeURIComponent('동탄역시범리슈빌아파트')}`;
      expect(window.location.pathname).toBe(expectedCanonicalPath);
      expect(window.location.search).toBe('?utm_source=google&utm_medium=organic');
      expect(window.location.hash).toBe('#overview');
      expect(pushSpy).not.toHaveBeenCalled();
      expect(getVirtualPageViewCount()).toBe(0);

      pushSpy.mockRestore();
    });

    it('emits canonical /apartment/ URLs in copyAptSummaryToClipboard while keeping display name in text', async () => {
      let copiedText = '';
      Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
      Object.assign(navigator, {
        clipboard: {
          writeText: jest.fn(async (txt: string) => {
            copiedText = txt;
          }),
        },
      });

      const ok = await copyAptSummaryToClipboard({
        aptName: '동탄역 시범 리슈빌',
        priceEok: 12,
        priceMan: 5000,
        ratio: 42.3,
      });

      expect(ok).toBe(true);
      expect(copiedText).toContain('동탄 동탄역 시범 리슈빌 실거래');
      expect(copiedText).toContain(
        `/apartment/${encodeURIComponent('동탄역시범리슈빌아파트')}?utm_source=clipboard`
      );
      expect(copiedText).not.toContain(encodeURIComponent('동탄역 시범 리슈빌'));
    });
  });

  // =========================================================================
  // 5. Adversarial & Boundary Edge Cases
  // =========================================================================
  describe('5. Adversarial & Boundary Inputs', () => {
    it('handles empty, whitespace, null/undefined inputs safely without throwing', () => {
      expect(resolveCanonicalAptSlug('')).toBe('');
      expect(resolveCanonicalAptSlug('    ')).toBe('');
      expect(resolveCanonicalAptSlug(null as unknown as string)).toBe('');
      expect(resolveCanonicalAptSlug(undefined as unknown as string)).toBe('');
    });

    it('decodes single, double, and triple percent-encoded inputs and survives malformed %ZZ sequences', () => {
      const single = encodeURIComponent('동탄역 푸르지오');
      const double = encodeURIComponent(single);
      const triple = encodeURIComponent(double);

      expect(resolveCanonicalAptSlug(single, { txMap: REAL_TX_SUMMARY })).toBe('동탄역푸르지오');
      expect(resolveCanonicalAptSlug(double, { txMap: REAL_TX_SUMMARY })).toBe('동탄역푸르지오');
      expect(resolveCanonicalAptSlug(triple, { txMap: REAL_TX_SUMMARY })).toBe('동탄역푸르지오');

      // Malformed percent-encoding must never throw URIError
      expect(() => resolveCanonicalAptSlug('%E0%A4%A%ZZ동탄')).not.toThrow();
      expect(resolveCanonicalAptSlug('%E0%A4%A%ZZ동탄')).toBe('%E0%A4%A%ZZ동탄');
    });

    it('preserves unrecognized ghost complexes and XSS payloads verbatim without false-matching real complexes', () => {
      expect(
        resolveCanonicalAptSlug('존재하지않는유령단지_999', {
          txMap: REAL_TX_SUMMARY,
          sheetApartments: REAL_BY_DONG as Record<string, CanonicalAptSlugItem[]>,
        })
      ).toBe('존재하지않는유령단지_999');

      expect(resolveCanonicalAptSlug('시범우남')).toBe('시범우남');

      const xssInput = '<script>alert("xss")</script>';
      expect(
        resolveCanonicalAptSlug(xssInput, {
          txMap: REAL_TX_SUMMARY,
          sheetApartments: REAL_BY_DONG as Record<string, CanonicalAptSlugItem[]>,
        })
      ).toBe(xssInput);
    });
  });

  // =========================================================================
  // 6. Adversarial Regression Suite (All 7 Uncovered Failure Modes)
  // =========================================================================
  describe('6. Adversarial Regression Suite (Cross-Complex Hijacking, Zero-Option Callers, 0-Tx Indexing, NFD, Edge 308 & Modal Restoration)', () => {
    it('prevents cross-complex village hijacking when txKey hint is omitted (e.g. 솔빛마을/시범다은마을/시범한빛마을 vs 나루마을) and converges 183/183 complexes across all 6 option permutations', () => {
      // Explicit regression pairs that previously hijacked '나루마을...' in single-pass .find()
      expect(
        resolveCanonicalAptSlug('솔빛마을 신도브래뉴', {
          txMap: REAL_TX_SUMMARY,
          sheetApartments: REAL_BY_DONG as Record<string, CanonicalAptSlugItem[]>,
          dong: '반송동',
        })
      ).toBe('솔빛마을신도브래뉴');
      expect(
        resolveCanonicalAptSlug('시범다은마을 월드메르디앙 반도유보라', {
          txMap: REAL_TX_SUMMARY,
          sheetApartments: REAL_BY_DONG as Record<string, CanonicalAptSlugItem[]>,
          dong: '반송동',
        })
      ).toBe('동탄시범다은마을월드메르디앙반도유보라');
      expect(
        resolveCanonicalAptSlug('시범한빛마을 한화꿈에그린', {
          txMap: REAL_TX_SUMMARY,
          sheetApartments: REAL_BY_DONG as Record<string, CanonicalAptSlugItem[]>,
          dong: '반송동',
        })
      ).toBe('시범한빛마을한화꿈에그린');

      // Exhaustive 183-apartment × 6-option-permutation matrix
      const initialByDong = buildInitialApartments();
      for (const [dong, apts] of Object.entries(REAL_BY_DONG)) {
        for (const apt of apts) {
          const expected = resolveCanonicalAptSlug(apt.name, {
            txKey: apt.txKey,
            txMap: REAL_TX_SUMMARY,
            sheetApartments: REAL_BY_DONG as Record<string, CanonicalAptSlugItem[]>,
            dong,
          });

          // 1) Full data without explicit txKey (ApartmentModal / AptCompareModal call pattern)
          expect(
            resolveCanonicalAptSlug(apt.name, {
              txMap: REAL_TX_SUMMARY,
              sheetApartments: REAL_BY_DONG as Record<string, CanonicalAptSlugItem[]>,
            })
          ).toBe(expected);

          // 2) Zero options (kakaoShare, getDefaultApartmentMetadata, Edge proxy, ZoneDetailClient)
          expect(resolveCanonicalAptSlug(apt.name)).toBe(expected);

          // 3) Only txMap + dong
          expect(resolveCanonicalAptSlug(apt.name, { txMap: REAL_TX_SUMMARY, dong })).toBe(expected);

          // 4) Only txMap without dong ('동탄 파라곤 3차' must NEVER hijack '동탄파라곤')
          expect(resolveCanonicalAptSlug(apt.name, { txMap: REAL_TX_SUMMARY })).toBe(expected);

          // 5) Initial buildInitialApartments() + txMap
          expect(
            resolveCanonicalAptSlug(apt.name, {
              txMap: REAL_TX_SUMMARY,
              sheetApartments: initialByDong,
              dong,
            })
          ).toBe(expected);

          // 6) Initial buildInitialApartments() before tx-summary.json finishes loading
          expect(
            resolveCanonicalAptSlug(apt.name, {
              txMap: {},
              sheetApartments: initialByDong,
              dong,
            })
          ).toBe(expected);
        }
      }
    });

    it('canonicalizes zero-option callers for "동탄역 푸르지오", all 622 recent-transactions.json entries, and prevents double virtual PV on async ApartmentModal hydration', async () => {
      // 1) copyAptSummaryToClipboard & getDefaultApartmentMetadata for '동탄역 푸르지오' (not in HARDCODED_MAPPING)
      let copiedText = '';
      Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
      Object.assign(navigator, {
        clipboard: {
          writeText: jest.fn(async (txt: string) => {
            copiedText = txt;
          }),
        },
      });
      const ok = await copyAptSummaryToClipboard({
        aptName: '동탄역 푸르지오',
        priceEok: 11,
        priceMan: 8000,
        ratio: 51.2,
      });
      expect(ok).toBe(true);
      expect(copiedText).toContain(
        `/apartment/${encodeURIComponent('동탄역푸르지오')}?utm_source=clipboard`
      );
      expect(copiedText).not.toContain('%20');

      const fallbackMeta = getDefaultApartmentMetadata('https://dongtanview.com', '동탄역 푸르지오');
      expect(fallbackMeta.alternates?.canonical).toBe(
        `https://dongtanview.com/apartment/${encodeURIComponent('동탄역푸르지오')}`
      );

      // 2) All 622 real entries in public/data/recent-transactions.json
      const recentTxsPath = path.join(process.cwd(), 'public', 'data', 'recent-transactions.json');
      const recentTxs = JSON.parse(fs.readFileSync(recentTxsPath, 'utf8')) as Array<{
        aptName: string;
        txKey?: string;
        dong?: string;
      }>;
      expect(recentTxs.length).toBeGreaterThan(500);
      for (const tx of recentTxs) {
        const bareSlug = resolveCanonicalAptSlug(tx.aptName);
        const hintedSlug = resolveCanonicalAptSlug(tx.aptName, {
          txKey: tx.txKey,
          dong: tx.dong,
        });
        expect(bareSlug).not.toMatch(/\s/);
        expect(hintedSlug).not.toMatch(/\s/);
        if (tx.txKey && REAL_TX_SUMMARY[tx.txKey]) {
          expect(hintedSlug).toBe(tx.txKey);
        }
      }

      // 3) Async hydration stability: ApartmentModal rendered with empty txSummaryData={} (or omitted, as in ZoneDetailClient)
      //    then re-rendered with full REAL_TX_SUMMARY must emit ONLY 1 virtual page_view on canonical URL
      window.history.replaceState(null, '', '/zone/techno');
      resetVirtualPageViewLedger();

      const prugioReport: FieldReportData = {
        id: 'stub-prugio',
        apartmentName: '동탄역 푸르지오',
        dong: '영천동',
        author: 'D-VIEW',
        likes: 0,
        commentCount: 0,
        createdAt: null,
      };

      const { rerender, unmount } = render(
        <ApartmentModal report={prugioReport} onClose={jest.fn()} user={null} />
      );

      const expectedPrugioPath = `/apartment/${encodeURIComponent('동탄역푸르지오')}`;
      expect(window.location.pathname).toBe(expectedPrugioPath);
      expect(getVirtualPageViewCount()).toBe(1);

      rerender(
        <ApartmentModal
          report={prugioReport}
          onClose={jest.fn()}
          user={null}
          sheetApartments={REAL_BY_DONG}
          txSummaryData={REAL_TX_SUMMARY}
        />
      );
      expect(window.location.pathname).toBe(expectedPrugioPath);
      expect(getVirtualPageViewCount()).toBe(1);
      unmount();
    });

    it('accepts both spaced display name and canonical slug for 0-tx complexes in POST /api/indexing/apartment while rejecting non-existent complexes', async () => {
      const { POST } = await import('@/app/api/indexing/apartment/route');
      const expectedParagon3Url = `https://dongtanview.com/apartment/${encodeURIComponent('동탄파라곤3차')}`;

      mockRequestGoogleIndexing.mockClear();
      const reqSpaced = new NextRequest('http://localhost/api/indexing/apartment', {
        method: 'POST',
        headers: { 'x-forwarded-for': '198.51.100.51' },
        body: JSON.stringify({ apartmentName: '동탄 파라곤 3차' }),
      });
      const resSpaced = await POST(reqSpaced);
      expect(resSpaced.status).toBe(200);
      expect(mockRequestGoogleIndexing).toHaveBeenLastCalledWith(
        expectedParagon3Url,
        'URL_UPDATED'
      );

      mockRequestGoogleIndexing.mockClear();
      const reqCanonical = new NextRequest('http://localhost/api/indexing/apartment', {
        method: 'POST',
        headers: { 'x-forwarded-for': '198.51.100.52' },
        body: JSON.stringify({ apartmentName: '동탄파라곤3차' }),
      });
      const resCanonical = await POST(reqCanonical);
      expect(resCanonical.status).toBe(200);
      expect(mockRequestGoogleIndexing).toHaveBeenLastCalledWith(
        expectedParagon3Url,
        'URL_UPDATED'
      );

      // Non-existent '동탄 파라곤 99차' must NOT hijack '동탄파라곤' and must return 404
      expect(resolveCanonicalAptSlug('동탄 파라곤 99차', { txMap: REAL_TX_SUMMARY })).toBe(
        '동탄 파라곤 99차'
      );
      const reqGhost = new NextRequest('http://localhost/api/indexing/apartment', {
        method: 'POST',
        headers: { 'x-forwarded-for': '198.51.100.53' },
        body: JSON.stringify({ apartmentName: '동탄 파라곤 99차' }),
      });
      const resGhost = await POST(reqGhost);
      expect(resGhost.status).toBe(404);
    });

    it('normalizes macOS/iOS Unicode NFD Hangul URLs to canonical NFC across resolveCanonicalAptSlug, decodeAptName, decodeSafeAptParam, and buildApartmentSeoMetadata', async () => {
      const nfdSpaced = '동탄역 시범 리슈빌'.normalize('NFD');
      const nfdEncoded = encodeURIComponent(nfdSpaced);
      const nfdPrugioCanonical = encodeURIComponent('동탄역푸르지오'.normalize('NFD'));

      expect(resolveCanonicalAptSlug(nfdSpaced)).toBe('동탄역시범리슈빌아파트');
      expect(resolveCanonicalAptSlug(nfdEncoded)).toBe('동탄역시범리슈빌아파트');
      expect(resolveCanonicalAptSlug(nfdPrugioCanonical)).toBe('동탄역푸르지오');

      expect(decodeAptName(nfdEncoded)).toBe('동탄역 시범 리슈빌');
      expect(decodeSafeAptParam(nfdEncoded)).toBe('동탄역 시범 리슈빌');

      const nfdMeta = await buildApartmentSeoMetadata(
        nfdEncoded,
        undefined,
        'https://dongtanview.com'
      );
      expect(nfdMeta.alternates?.canonical).toBe(
        `https://dongtanview.com/apartment/${encodeURIComponent('동탄역시범리슈빌아파트')}`
      );
    });

    it('issues HTTP 308 permanent redirect in Edge proxy.ts for non-canonical /apartment/ URLs (preserving query params) and executes pre-GA4 inline replaceState on SSR ApartmentPage', async () => {
      // 1) Spaced URL with UTM query string -> HTTP 308 to canonical URL preserving query string
      const spacedReq = new NextRequest(
        `https://dongtanview.com/apartment/${encodeURIComponent('동탄역 시범 리슈빌')}?utm_source=kakaotalk&utm_medium=share`
      );
      const spacedRes = await proxy(spacedReq);
      expect(spacedRes.status).toBe(308);
      expect(spacedRes.headers.get('location')).toBe(
        `https://dongtanview.com/apartment/${encodeURIComponent('동탄역시범리슈빌아파트')}?utm_source=kakaotalk&utm_medium=share`
      );

      // 2) NFD-encoded URL -> HTTP 308 to NFC-encoded canonical URL
      const nfdReq = new NextRequest(
        `https://dongtanview.com/apartment/${encodeURIComponent('동탄역푸르지오'.normalize('NFD'))}`
      );
      const nfdRes = await proxy(nfdReq);
      expect(nfdRes.status).toBe(308);
      expect(nfdRes.headers.get('location')).toBe(
        `https://dongtanview.com/apartment/${encodeURIComponent('동탄역푸르지오')}`
      );

      // 3) Already canonical URL -> NO redirect loop
      const canonicalReq = new NextRequest(
        `https://dongtanview.com/apartment/${encodeURIComponent('동탄역푸르지오')}?utm_source=google`
      );
      const canonicalRes = await proxy(canonicalReq);
      expect(canonicalRes.status).not.toBe(308);
      expect(canonicalRes.headers.get('location')).toBeNull();

      // 3.5) 0-tx complex not in tx-summary.json -> HTTP 307 redirect to /explore (prevents Vercel ISR 500 on un-prerendered Korean slugs)
      const zeroTxReq = new NextRequest(
        `https://dongtanview.com/apartment/${encodeURIComponent('동탄파라곤3차')}`
      );
      const zeroTxRes = await proxy(zeroTxReq);
      expect(zeroTxRes.status).toBe(307);
      expect(zeroTxRes.headers.get('location')).toBe('https://dongtanview.com/explore');

      // 4) SSR ApartmentPage pre-GA4 inline <script> normalizes window.location synchronously before hydration
      const ApartmentPage = (await import('@/app/apartment/[aptName]/page')).default;
      window.history.replaceState(
        { idx: 7 },
        '',
        `/apartment/${encodeURIComponent('동탄역 시범 리슈빌')}?utm_source=kakaotalk#chapter-02`
      );
      const ssrJsx = await ApartmentPage({
        params: Promise.resolve({ aptName: encodeURIComponent('동탄역 시범 리슈빌') }),
      });
      const { container, unmount } = render(ssrJsx);
      const inlineScripts = Array.from(
        container.querySelectorAll('script:not([type="application/ld+json"])')
      );
      expect(inlineScripts.length).toBeGreaterThanOrEqual(1);
      // Execute the synchronous pre-GA4 script in JSDOM
      new Function(inlineScripts[0].innerHTML)();
      expect(window.location.pathname).toBe(
        `/apartment/${encodeURIComponent('동탄역시범리슈빌아파트')}`
      );
      expect(window.location.search).toBe('?utm_source=kakaotalk');
      expect(window.location.hash).toBe('#chapter-02');
      unmount();
    });

    it('emits canonical URLs across generateValuationJsonLd, recommendDviewSeoAction, sitemap.ts, all 16 MBTI_PROFILES, and Homepage SSR recent transactions', async () => {
      // 1) Client JSON-LD in generateValuationJsonLd
      const valJsonStr = generateValuationJsonLd({
        report: {
          id: 'rep-val',
          apartmentName: '동탄역 시범 리슈빌',
          dong: '청계동',
          author: 'D-VIEW',
          likes: 0,
          commentCount: 0,
        },
        impliedValue: 135000,
        realEstatePER: 1.9,
        utilityTotal: 118,
        utilityMaxTotal: 150,
        spread: 0.11,
      });
      const parsedVal = JSON.parse(valJsonStr!);
      expect(parsedVal.url).toBe(
        `https://dongtanview.com/apartment/${encodeURIComponent('동탄역시범리슈빌아파트')}`
      );

      // 2) Search Console CTR recommender unifies legacy spaced GSC page URLs
      const seoRec = recommendDviewSeoAction({
        query: '동탄역 시범 리슈빌 시세',
        page: `https://dongtanview.com/apartment/${encodeURIComponent('동탄역 시범 리슈빌')}`,
        clicks: 0,
        impressions: 50,
        ctr: 0,
        position: 4.1,
      });
      expect(seoRec.targetRoute).toBe('/apartment/동탄역시범리슈빌아파트');

      // 3) sitemap.ts emits 184 canonical /apartment/ URLs with zero '%20'
      const entries = await sitemap();
      const aptSitemapUrls = entries
        .map((e) => e.url)
        .filter((u) => u.includes('/apartment/'));
      expect(aptSitemapUrls.length).toBe(Object.keys(REAL_TX_SUMMARY).length);
      for (const url of aptSitemapUrls) {
        expect(url).not.toContain('%20');
      }

      // 4) All 16 MBTI_PROFILES landmark complexes resolve to identical whitespace-free canonical slugs on /mbti and /mbti/[type]
      const mbtiProfiles = Object.values(MBTI_PROFILES);
      expect(mbtiProfiles).toHaveLength(16);
      for (const profile of mbtiProfiles) {
        const noTxMapSlug = resolveCanonicalAptSlug(profile.aptName, {
          txKey: profile.txKey,
          dong: profile.dong,
        });
        const fullSlug = resolveCanonicalAptSlug(profile.aptName, {
          txKey: profile.txKey,
          txMap: REAL_TX_SUMMARY,
          sheetApartments: REAL_BY_DONG as Record<string, CanonicalAptSlugItem[]>,
          dong: profile.dong,
        });
        expect(noTxMapSlug).not.toMatch(/\s/);
        expect(noTxMapSlug).toBe(fullSlug);
      }

      // 5) Homepage `/` SSR `#home-ssr-semantic-catalog` renders canonical links for recent transactions (`aptName` / `txKey`)
      const HomePage = (await import('@/app/page')).default;
      const homeRootEl = (await HomePage()) as React.ReactElement<{
        children: React.ReactElement[];
      }>;
      const suspenseWrapper = homeRootEl.props.children.find(
        (child) => React.isValidElement(child) && (child as React.ReactElement<{ children?: unknown }>).props?.children
      ) as React.ReactElement<{ children: React.ReactElement }> | undefined;
      if (suspenseWrapper) {
        const loaderEl = suspenseWrapper.props.children as React.ReactElement & {
          type: (props: Record<string, unknown>) => Promise<React.ReactElement>;
        };
        if (typeof loaderEl?.type === 'function') {
          const homeResolvedJsx = await loaderEl.type(loaderEl.props || {});
          const { container: homeContainer, unmount: unmountHome } = render(homeResolvedJsx);
          const homeCatalog = homeContainer.querySelector('#home-ssr-semantic-catalog');
          expect(homeCatalog).not.toBeNull();
          const homeAptAnchors = Array.from(
            homeCatalog!.querySelectorAll('a[href^="/apartment/"]')
          );
          // 10 TOP leaderboard + 15 recent transactions = 25 canonical apartment anchors
          expect(homeAptAnchors.length).toBeGreaterThanOrEqual(20);
          for (const a of homeAptAnchors) {
            expect(a.getAttribute('href')).not.toContain('%20');
          }
          unmountHome();
        }
      }
    });

    it('restores custom returnPath (/explore or /zone/[id]) and resets shallow route signature via syncShallowModalCloseToDashboard', () => {
      window.history.replaceState(null, '', '/explore?dong=영천동');
      resetVirtualPageViewLedger();

      syncShallowApartmentOpen('동탄역 푸르지오', {
        dong: '영천동',
        canonicalSlug: '동탄역푸르지오',
      });
      expect(window.location.pathname).toBe(`/apartment/${encodeURIComponent('동탄역푸르지오')}`);
      expect(getVirtualPageViewCount()).toBe(1);

      // Closing modal from /explore restores /explore?dong=영천동 instead of leaving /apartment/...
      syncShallowModalCloseToDashboard('/explore?dong=영천동');
      expect(window.location.pathname).toBe('/explore');
      expect(decodeURIComponent(window.location.search)).toBe('?dong=영천동');

      // Re-opening the same apartment dispatches a fresh virtual PV (proving signature reset)
      syncShallowApartmentOpen('동탄역 푸르지오', {
        dong: '영천동',
        canonicalSlug: '동탄역푸르지오',
      });
      expect(getVirtualPageViewCount()).toBe(2);

      // Default 0-arg close still restores '/'
      syncShallowModalCloseToDashboard();
      expect(window.location.pathname).toBe('/');
    });

    it('strips crawler/translator noise query parameters (?hl=ko-KR, ?gl=KR) across Edge 308 proxy, PreGaCanonicalSync, and ApartmentModal while preserving legitimate UTM parameters', async () => {
      // 1) Unit verification of stripApartmentNoiseQueryParams
      expect(stripApartmentNoiseQueryParams('')).toBe('');
      expect(stripApartmentNoiseQueryParams('?')).toBe('');
      expect(stripApartmentNoiseQueryParams('?hl=ko-KR')).toBe('');
      expect(stripApartmentNoiseQueryParams('?hl=ko-KR&gl=KR')).toBe('');
      expect(stripApartmentNoiseQueryParams('?HL=en-US&utm_source=google&gl=KR')).toBe(
        '?utm_source=google'
      );
      expect(stripApartmentNoiseQueryParams('?utm_source=naver&shareType=rent')).toBe(
        '?utm_source=naver&shareType=rent'
      );

      // 2) Edge proxy.ts: canonical pathname WITH ?hl=ko-KR -> 308 redirect stripping ?hl=ko-KR
      const canonicalWithHlReq = new NextRequest(
        `https://dongtanview.com/apartment/${encodeURIComponent('동탄역푸르지오')}?hl=ko-KR`
      );
      const canonicalWithHlRes = await proxy(canonicalWithHlReq);
      expect(canonicalWithHlRes.status).toBe(308);
      expect(canonicalWithHlRes.headers.get('location')).toBe(
        `https://dongtanview.com/apartment/${encodeURIComponent('동탄역푸르지오')}`
      );

      // 3) Edge proxy.ts: spaced pathname WITH ?hl=ko-KR -> single-hop 308 redirect to canonical slug without ?hl=ko-KR
      const spacedWithHlReq = new NextRequest(
        `https://dongtanview.com/apartment/${encodeURIComponent('동탄역 푸르지오')}?hl=ko-KR`
      );
      const spacedWithHlRes = await proxy(spacedWithHlReq);
      expect(spacedWithHlRes.status).toBe(308);
      expect(spacedWithHlRes.headers.get('location')).toBe(
        `https://dongtanview.com/apartment/${encodeURIComponent('동탄역푸르지오')}`
      );

      // 4) Edge proxy.ts: spaced pathname WITH ?hl=ko-KR&gl=KR&utm_source=google -> single-hop 308 preserving utm_source
      const mixedQueryReq = new NextRequest(
        `https://dongtanview.com/apartment/${encodeURIComponent('동탄역 푸르지오')}?hl=ko-KR&gl=KR&utm_source=google`
      );
      const mixedQueryRes = await proxy(mixedQueryReq);
      expect(mixedQueryRes.status).toBe(308);
      expect(mixedQueryRes.headers.get('location')).toBe(
        `https://dongtanview.com/apartment/${encodeURIComponent('동탄역푸르지오')}?utm_source=google`
      );

      // 5) PreGaCanonicalSync inline script + useEffect strips ?hl=ko-KR even when pathname is already canonical
      const PreGaCanonicalSync = (await import('@/components/common/PreGaCanonicalSync')).default;
      const canonicalPrugioPath = `/apartment/${encodeURIComponent('동탄역푸르지오')}`;
      window.history.replaceState(
        { idx: 9 },
        '',
        `${canonicalPrugioPath}?hl=ko-KR&utm_source=google#chapter-01`
      );
      const { container: syncContainer, unmount: unmountSync } = render(
        <PreGaCanonicalSync canonicalPath={canonicalPrugioPath} />
      );
      expect(window.location.pathname).toBe(canonicalPrugioPath);
      expect(window.location.search).toBe('?utm_source=google');
      expect(window.location.hash).toBe('#chapter-01');

      // Also verify inline script execution directly on ?hl=ko-KR only
      window.history.replaceState({ idx: 10 }, '', `${canonicalPrugioPath}?hl=ko-KR`);
      const scriptEl = syncContainer.querySelector('#dview-pre-ga-canonical-sync');
      expect(scriptEl).not.toBeNull();
      new Function(scriptEl!.innerHTML)();
      expect(window.location.pathname).toBe(canonicalPrugioPath);
      expect(window.location.search).toBe('');
      unmountSync();

      // 6) ApartmentModal in-place replaceState strips ?hl=ko-KR with zero duplicate virtual pageviews
      window.history.replaceState(
        { __na: 'state-token-1' },
        '',
        `/apartment/${encodeURIComponent('동탄역 푸르지오')}?hl=ko-KR`
      );
      resetVirtualPageViewLedger();
      const { unmount: unmountModal } = render(
        <ApartmentModal
          report={{
            id: 'rep-prugio-hl',
            apartmentName: '동탄역 푸르지오',
            dong: '영천동',
            author: 'D-VIEW',
            likes: 0,
            commentCount: 0,
          }}
          onClose={jest.fn()}
          user={null}
          onAddComment={jest.fn()}
          txSummaryMap={REAL_TX_SUMMARY}
          sheetApartments={REAL_BY_DONG}
        />
      );
      expect(window.location.pathname).toBe(canonicalPrugioPath);
      expect(window.location.search).toBe('');
      expect(window.history.state).toEqual({ __na: 'state-token-1' });
      expect(getVirtualPageViewCount()).toBe(0);
      unmountModal();
    });

    it('preserves query, hash, and history.state without firing a duplicate virtual PV when navigating to a second /apartment/ page after a prior shallow open in the same session', () => {
      resetVirtualPageViewLedger();
      window.history.replaceState(null, '', '/');

      // Step 1: User opens Apartment A from dashboard -> sets lastShallowRouteSignature in recirculationEngine
      syncShallowApartmentOpen('동탄역 푸르지오', {
        dong: '영천동',
        canonicalSlug: '동탄역푸르지오',
      });
      expect(getVirtualPageViewCount()).toBe(1);

      // Step 2: Without resetting the ledger, user is now on /apartment/동탄역 시범 리슈빌?hl=ko-KR&utm_source=google#chapter-02
      const navState = { __na: 'next-router-state-b' };
      window.history.replaceState(
        navState,
        '',
        `/apartment/${encodeURIComponent('동탄역 시범 리슈빌')}?hl=ko-KR&utm_source=google#chapter-02`
      );

      const { unmount } = render(
        <ApartmentModal
          report={{
            id: 'rep-richeville-second',
            apartmentName: '동탄역 시범 리슈빌',
            dong: '청계동',
            author: 'D-VIEW',
            likes: 0,
            commentCount: 0,
          }}
          onClose={jest.fn()}
          user={null}
          onAddComment={jest.fn()}
          txSummaryMap={REAL_TX_SUMMARY}
          sheetApartments={REAL_BY_DONG}
        />
      );

      expect(window.location.pathname).toBe(
        `/apartment/${encodeURIComponent('동탄역시범리슈빌아파트')}`
      );
      expect(window.location.search).toBe('?utm_source=google');
      expect(window.location.hash).toBe('#chapter-02');
      expect(window.history.state).toEqual(navState);
      // Must NOT fire an extra virtual PV on top of the 1 from Step 1
      expect(getVirtualPageViewCount()).toBe(1);
      unmount();
    });

    it('resolves tx-summary.json-only complexes to canonical slugs even when caller passes a partial 1-entry scoped txMap', () => {
      const partialScopedTxMap: Record<string, AptTxSummary> = {
        동탄역푸르지오: REAL_TX_SUMMARY['동탄역푸르지오'],
      };

      expect(
        resolveCanonicalAptSlug('더레이크시티 부영 1단지', {
          txMap: partialScopedTxMap,
          dong: '산척동',
        })
      ).toBe('더레이크시티부영1단지');

      expect(
        resolveCanonicalAptSlug('동탄2신도시 동탄역 디에트르 퍼스티지', {
          txMap: partialScopedTxMap,
          dong: '오산동',
        })
      ).toBe('동탄2신도시동탄역디에트르퍼스티지');

      expect(
        resolveCanonicalAptSlug('동탄 시범다은마을 월드메르디앙 반도유보라', {
          txMap: partialScopedTxMap,
          dong: '반송동',
        })
      ).toBe('동탄시범다은마을월드메르디앙반도유보라');
    });

    it('strips duplicate, mixed-case, and Google Translate (_x_tr_*) noise query parameters across stripApartmentNoiseQueryParams, Edge proxy, PreGaCanonicalSync, and ReportShareBar', async () => {
      const noisyQuery =
        '?hl=ko-KR&hl=en-US&HL=ja&Gl=KR&_x_tr_sl=auto&_x_tr_tl=en&_x_tr_hl=en&_x_tr_pto=wapp&_x_tr_hist=true&utm_source=naver';
      expect(stripApartmentNoiseQueryParams(noisyQuery)).toBe('?utm_source=naver');

      const proxyReq = new NextRequest(
        `https://dongtanview.com/apartment/${encodeURIComponent('동탄역 푸르지오')}${noisyQuery}`
      );
      const proxyRes = await proxy(proxyReq);
      expect(proxyRes.status).toBe(308);
      expect(proxyRes.headers.get('location')).toBe(
        `https://dongtanview.com/apartment/${encodeURIComponent('동탄역푸르지오')}?utm_source=naver`
      );

      const PreGaCanonicalSync = (await import('@/components/common/PreGaCanonicalSync')).default;
      const canonicalPrugioPath = `/apartment/${encodeURIComponent('동탄역푸르지오')}`;
      window.history.replaceState(
        { idx: 42 },
        '',
        `${canonicalPrugioPath}${noisyQuery}#section-tx`
      );
      const { container, unmount } = render(
        <PreGaCanonicalSync canonicalPath={canonicalPrugioPath} />
      );
      const scriptEl = container.querySelector('#dview-pre-ga-canonical-sync');
      expect(scriptEl).not.toBeNull();
      // Reset URL to noisy state and test the inline script directly
      window.history.replaceState(
        { idx: 42 },
        '',
        `${canonicalPrugioPath}${noisyQuery}#section-tx`
      );
      new Function(scriptEl!.innerHTML)();
      expect(window.location.pathname).toBe(canonicalPrugioPath);
      expect(window.location.search).toBe('?utm_source=naver');
      expect(window.location.hash).toBe('#section-tx');
      unmount();
    });

    it('invalidates WeakMap slug cache when a caller mutates custom txMap or sheetApartments in-place and preserves canonicalSlug over sanitizedDongTxKey in buildApartmentSeoMetadata', async () => {
      const mutableTxMap: Record<string, { dong?: string }> = {
        동탄커스텀단지1차: { dong: '영천동' },
      };
      const mutableSheetApts: Record<string, CanonicalAptSlugItem[]> = {
        영천동: [{ name: '동탄 커스텀 단지', dong: '영천동', txKey: '동탄커스텀단지1차' }],
      };

      expect(
        resolveCanonicalAptSlug('동탄 커스텀 단지', {
          txMap: mutableTxMap,
          sheetApartments: mutableSheetApts,
          dong: '영천동',
        })
      ).toBe('동탄커스텀단지1차');

      // Mutate the same object references in-place
      delete mutableTxMap['동탄커스텀단지1차'];
      mutableTxMap['동탄커스텀단지2차'] = { dong: '영천동' };
      mutableSheetApts['영천동'][0].txKey = '동탄커스텀단지2차';

      expect(
        resolveCanonicalAptSlug('동탄 커스텀 단지', {
          txMap: mutableTxMap,
          sheetApartments: mutableSheetApts,
          dong: '영천동',
        })
      ).toBe('동탄커스텀단지2차');

      // Verify buildApartmentSeoMetadata resolves HARDCODED_MAPPING canonicalSlug ('동탄2아이파크1단지')
      // rather than raw sanitizedDongTxKey ('화성동탄2아이파크1단지(A99블록)')
      const iparkMeta = await buildApartmentSeoMetadata('동탄2 아이파크 1단지');
      expect(iparkMeta.alternates?.canonical).toBe(
        `https://dongtanview.com/apartment/${encodeURIComponent('동탄2아이파크1단지')}`
      );
    });
  });
});


