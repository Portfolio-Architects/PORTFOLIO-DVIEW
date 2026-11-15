/**
 * @jest-environment jsdom
 */

import React from 'react';
import fs from 'fs';
import path from 'path';
import ReactDOMServer from 'react-dom/server';
import { render, act } from '@testing-library/react';
import { NextRequest } from 'next/server';

let mockCurrentPathname = '/';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => mockCurrentPathname,
  useSearchParams: () => new URLSearchParams(),
  notFound: jest.fn(() => {
    const err = new Error('NEXT_HTTP_ERROR_FALLBACK;404') as Error & { digest?: string };
    err.digest = 'NEXT_HTTP_ERROR_FALLBACK;404';
    throw err;
  }),
  redirect: jest.fn((target: string) => {
    throw new Error(`NEXT_REDIRECT:${target}`);
  }),
  permanentRedirect: jest.fn((target: string) => {
    throw new Error(`NEXT_PERMANENT_REDIRECT:${target}`);
  }),
}));

jest.mock('@/lib/firebaseAdmin', () => ({
  adminDb: null,
}));

jest.mock('@/lib/redis', () => ({
  redis: null,
  rawRedis: null,
}));

import * as AptRouteModule from '@/app/apartment/[aptName]/page';
import * as TvDetailRouteModule from '@/app/technovalley/[slug]/page';
import * as GuideRouteModule from '@/app/guide/[slug]/page';
import * as ZoneRouteModule from '@/app/zone/[id]/page';
import * as ZoneLayoutModule from '@/app/zone/[id]/layout';
import * as NotFoundModule from '@/app/not-found';
import sitemap from '@/app/sitemap';
import { proxy, config as proxyConfig } from '@/proxy';
import { AdSlot } from '@/components/ads/AdSlot';
import MobileStickyAnchorAd from '@/components/layout/MobileStickyAnchorAd';
import { SettingsProvider } from '@/contexts/SettingsContext';
import {
  getTxSummaryData,
  getTechnoValleyJisanList,
  formatTechnoValleyJisanSlug,
  hasVerifiedApartmentSalePrice,
  buildApartmentSeoMetadata,
  getDefaultApartmentMetadata,
  buildTechnoValleySeoMetadata,
  buildMortgageSsrData,
  resolveCanonicalAptSlug,
} from '@/lib/services/apartmentPageService';
import { resolveTechnoValleyJisanCanonicalSlug } from '@/lib/utils/jisanSlugResolver';
import {
  isNoindexAdExcludedPath,
  documentHasNoindexRobotsMeta,
  buildPreHydrationAdSenseNoindexGuardScript,
} from '@/lib/ads/noindexAdGuard';

describe('Hangul 500 Pure SSG Conversion & 99 Empty Template Unconditional noindex Isolation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      NEXT_PUBLIC_ADSENSE_APPROVAL_MODE: 'false',
      NEXT_PUBLIC_ADSENSE_CLIENT_ID: 'ca-pub-1103228112872356',
      NEXT_PUBLIC_ADSENSE_SLOT_RECTANGLE: '2222222222',
      NEXT_PUBLIC_ADSENSE_SLOT_ANCHOR: '9988776655',
    };
    mockCurrentPathname = '/';
    document.head.innerHTML = '';
    delete (window as Window & { adsbygoogle?: unknown; __DVIEW_NOINDEX_ADS_PAUSED__?: boolean })
      .adsbygoogle;
    delete (window as Window & { __DVIEW_NOINDEX_ADS_PAUSED__?: boolean })
      .__DVIEW_NOINDEX_ADS_PAUSED__;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('1. Pure SSG Route Segment Config (Zero Vercel ISR Hangul 500 & Zero Fallback Lambda)', () => {
    it('exports dynamic="force-static", revalidate=false, and dynamicParams=false on all 4 dynamic routes', () => {
      expect(AptRouteModule.dynamic).toBe('force-static');
      expect(AptRouteModule.revalidate).toBe(false);
      expect(AptRouteModule.dynamicParams).toBe(false);

      expect(TvDetailRouteModule.dynamic).toBe('force-static');
      expect(TvDetailRouteModule.revalidate).toBe(false);
      expect(TvDetailRouteModule.dynamicParams).toBe(false);

      expect(GuideRouteModule.dynamic).toBe('force-static');
      expect(GuideRouteModule.revalidate).toBe(false);
      expect(GuideRouteModule.dynamicParams).toBe(false);

      expect(ZoneRouteModule.dynamic).toBe('force-static');
      expect(ZoneRouteModule.revalidate).toBe(false);
      expect(ZoneRouteModule.dynamicParams).toBe(false);
    });

    it('normalizes all 185 apartment static params and 56 Jisan static params to clean NFC UTF-8 slugs', async () => {
      const aptParams = await AptRouteModule.generateStaticParams();
      expect(aptParams).toHaveLength(185);
      for (const p of aptParams) {
        expect(p.aptName.length).toBeGreaterThan(0);
        expect(p.aptName).toBe(p.aptName.normalize('NFC'));
        expect(p.aptName).not.toMatch(/\s/);
      }

      const tvParams = await TvDetailRouteModule.generateStaticParams();
      expect(tvParams).toHaveLength(56);
      for (const p of tvParams) {
        expect(p.slug.length).toBeGreaterThan(0);
        expect(p.slug).toBe(p.slug.normalize('NFC'));
        expect(p.slug).not.toMatch(/\s/);
      }
    });
  });

  describe('2. Soft-404 Elimination on /zone/[id] and /guide/[slug]', () => {
    it('throws 404 notFound() on unregistered /zone/[id] (ASCII, empty, and Hangul segments) and emits robots noindex,nofollow', async () => {
      for (const invalidId of ['non-existent-zone', '', '존재하지않는권역', '../etc/passwd']) {
        await expect(
          ZoneRouteModule.default({
            params: Promise.resolve({ id: invalidId }),
            enforceNotFound: true,
          })
        ).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');

        const pageMeta = await ZoneRouteModule.generateMetadata({
          params: Promise.resolve({ id: invalidId }),
        });
        expect(pageMeta.robots).toEqual({ index: false, follow: false });
        expect(pageMeta.alternates?.canonical).toBeUndefined();

        const layoutMeta = await ZoneLayoutModule.generateMetadata({
          params: Promise.resolve({ id: invalidId }),
          children: null,
        });
        expect(layoutMeta.robots).toEqual({ index: false, follow: false });
        expect(layoutMeta.alternates?.canonical).toBeUndefined();
      }

      const missingGuideMeta = await GuideRouteModule.generateMetadata({
        params: Promise.resolve({ slug: 'missing-guide-slug' }),
      });
      expect(missingGuideMeta.robots).toEqual({ index: false, follow: false });

      // Global 404 (not-found.tsx) overrides RootLayout's index,follow googleBot & canonical: '/'
      expect(NotFoundModule.metadata.robots).toEqual({
        index: false,
        follow: false,
        googleBot: { index: false, follow: false },
      });
      expect(NotFoundModule.metadata.alternates).toEqual({});
    });
  });

  describe('3. Unconditional 99 Empty Template noindex Isolation (56 Jisan + 43 Zero-Sale Apartments) & Sitemap Parity', () => {
    it('isolates exact 56 Jisan details + 43 zero-sale apartments = 99 templates with noindex even when approval mode is false/unset', async () => {
      delete process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE;

      const jisanList = await getTechnoValleyJisanList();
      expect(jisanList).toHaveLength(56);

      // /technovalley hub remains indexable
      const hubMeta = buildTechnoValleySeoMetadata(jisanList, undefined);
      expect(hubMeta.robots).toBeUndefined();

      // All 56 /technovalley/[slug] detail pages are unconditionally noindex,follow
      const noindexJisanUrls = new Set<string>();
      for (const item of jisanList) {
        const slug = formatTechnoValleyJisanSlug(item.name);
        const detailMeta = buildTechnoValleySeoMetadata(jisanList, slug);
        expect(detailMeta.robots).toEqual({ index: false, follow: true });
        noindexJisanUrls.add(`https://dongtanview.com/technovalley/${encodeURIComponent(slug)}`);
      }
      expect(noindexJisanUrls.size).toBe(56);

      // Partition all 185 canonical apartments into 142 verified-sale and 43 zero-sale
      const txSummary = await getTxSummaryData();
      const canonicalSlugs = Array.from(
        new Set(
          Object.keys(txSummary).map((name) =>
            (resolveCanonicalAptSlug(name, { txMap: txSummary }) || name).normalize('NFC')
          )
        )
      );
      expect(canonicalSlugs).toHaveLength(185);

      const zeroSaleUrls = new Set<string>();
      const verifiedSaleUrls = new Set<string>();
      let sampleZeroSaleSlug = '';

      for (const slug of canonicalSlugs) {
        const summary = txSummary[slug];
        const url = `https://dongtanview.com/apartment/${encodeURIComponent(slug)}`;
        if (hasVerifiedApartmentSalePrice(summary)) {
          verifiedSaleUrls.add(url);
        } else {
          zeroSaleUrls.add(url);
          if (!sampleZeroSaleSlug) sampleZeroSaleSlug = slug;
        }
      }

      expect(verifiedSaleUrls.size).toBe(142);
      expect(zeroSaleUrls.size).toBe(43);
      expect(noindexJisanUrls.size + zeroSaleUrls.size).toBe(99);

      // Verify buildApartmentSeoMetadata emits noindex,follow on zero-sale & fallback, and index,follow on verified-sale
      const zeroSaleMeta = await buildApartmentSeoMetadata(sampleZeroSaleSlug);
      expect(zeroSaleMeta.robots).toEqual({ index: false, follow: true });

      const ghostMeta = await buildApartmentSeoMetadata('존재하지않는미등록단지_테스트');
      expect(ghostMeta.robots).toEqual({ index: false, follow: true });

      const defaultMeta = getDefaultApartmentMetadata('https://dongtanview.com');
      expect(defaultMeta.robots).toEqual({ index: false, follow: true });

      const flagshipMeta = await buildApartmentSeoMetadata('동탄역롯데캐슬');
      expect(flagshipMeta.robots).toEqual({ index: true, follow: true });

      // Sitemap must emit exact 181 indexable URLs (9 + 23 + 7 + 142) with ZERO overlap with the 99 noindex URLs
      const sitemapEntries = await sitemap({ id: 0 });
      expect(sitemapEntries).toHaveLength(181);

      const sitemapUrlSet = new Set(sitemapEntries.map((e) => e.url));
      for (const noindexUrl of noindexJisanUrls) {
        expect(sitemapUrlSet.has(noindexUrl)).toBe(false);
      }
      for (const noindexAptUrl of zeroSaleUrls) {
        expect(sitemapUrlSet.has(noindexAptUrl)).toBe(false);
      }
      for (const validAptUrl of verifiedSaleUrls) {
        expect(sitemapUrlSet.has(validAptUrl)).toBe(true);
      }
    });

    it('never leaks fake 3.5억 (350,000,000원) principal or fake 60% ratio boilerplate in buildMortgageSsrData or SSR ApartmentPage on zero-sale/missing inputs', async () => {
      for (const [label, sale, deposit] of [
        ['전세전용단지', 0, 22000],
        ['완전결측단지', 0, 0],
        ['미정단지', undefined, undefined],
        ['비수치입력단지', Number.NaN, Number.NaN],
      ] as const) {
        const res = buildMortgageSsrData(label, sale, deposit);
        const combinedFaqText = res.faqList.map((f) => f.answer).join(' ');
        expect(combinedFaqText).not.toContain('3.5억');
        expect(combinedFaqText).not.toContain('약 60%');
        expect(combinedFaqText).not.toContain('NaN');
        if (!sale && !deposit) {
          expect(res.principalWon).toBe(0);
          expect(res.jeonseDepositWon).toBe(0);
          expect(res.amortization.equalPi.monthlyPaymentWon).toBe(0);
        }
      }

      // SSR ApartmentPage emits ZERO <ins class="adsbygoogle"> and ZERO 350,000,000원 on zero-sale & ghost complexes (including 동탄파크릭스A55BL아파트 where summary.latestPrice===0)
      for (const zeroSaleApt of [
        '화성동탄상록리슈빌아파트영구임대',
        '동탄파크릭스A55BL아파트',
        '존재하지않는가상단지_무결성검증',
      ]) {
        const jsx = await AptRouteModule.default({
          params: Promise.resolve({ aptName: encodeURIComponent(zeroSaleApt) }),
        });
        const ssrMarkup = ReactDOMServer.renderToStaticMarkup(
          <SettingsProvider>{jsx}</SettingsProvider>
        );
        expect(ssrMarkup).not.toMatch(/<ins[^>]*\badsbygoogle\b/);
        expect(ssrMarkup).not.toContain('data-testid="ssr-adslot-ch02"');
        expect(ssrMarkup).not.toContain('data-testid="ssr-adslot-ch05"');
        expect(ssrMarkup).not.toContain('350,000,000원');
      }

      // Indexed flagship apartment still emits both SSR AdSlots (plus inline modal slots when dynamic is mocked in Jest)
      const flagshipJsx = await AptRouteModule.default({
        params: Promise.resolve({ aptName: encodeURIComponent('동탄역롯데캐슬') }),
      });
      const flagshipMarkup = ReactDOMServer.renderToStaticMarkup(
        <SettingsProvider>{flagshipJsx}</SettingsProvider>
      );
      expect(flagshipMarkup).toContain('data-testid="ssr-adslot-ch02"');
      expect(flagshipMarkup).toContain('data-testid="ssr-adslot-ch05"');
      expect((flagshipMarkup.match(/<ins[^>]*\badsbygoogle\b/g) || []).length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('4. Legacy /technovalley?jisan=... Duplicate URL HTTP 308 Permanent Redirect', () => {
    it('resolves all 56 FactoryOn Jisan names deterministically and redirects /technovalley?jisan=... with HTTP 308', async () => {
      const jisanList = await getTechnoValleyJisanList();
      expect(jisanList).toHaveLength(56);

      for (const item of jisanList) {
        const expectedSlug = formatTechnoValleyJisanSlug(item.name);
        expect(resolveTechnoValleyJisanCanonicalSlug(item.name)).toBe(expectedSlug);
      }

      // Matcher includes /technovalley?jisan=... without catching bare /technovalley
      expect(proxyConfig.matcher).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            source: '/technovalley',
            has: [{ type: 'query', key: 'jisan' }],
          }),
        ])
      );

      // 1) Unicode Roman numeral + spaces -> 308 to /technovalley/SH-SQUARE%E2%85%A1
      const shReq = new NextRequest(
        `https://dongtanview.com/technovalley?jisan=${encodeURIComponent('SH SQUAREⅡ')}&hl=ko-KR&utm_source=google`
      );
      const shRes = await proxy(shReq);
      expect(shRes.status).toBe(308);
      expect(shRes.headers.get('location')).toBe(
        `https://dongtanview.com/technovalley/${encodeURIComponent('SH-SQUAREⅡ')}?utm_source=google`
      );

      // 2) Hangul parentheses name -> 308 to /technovalley/(주)유앤미개발
      const korReq = new NextRequest(
        `https://dongtanview.com/technovalley?jisan=${encodeURIComponent('(주)유앤미개발')}`
      );
      const korRes = await proxy(korReq);
      expect(korRes.status).toBe(308);
      expect(korRes.headers.get('location')).toBe(
        `https://dongtanview.com/technovalley/${encodeURIComponent('(주)유앤미개발')}`
      );

      // 3) Empty or XSS ?jisan=... -> 308 to clean /technovalley hub
      for (const badQuery of ['', '   ', '<script>alert(1)</script>', '존재하지않는가짜지산999']) {
        const badReq = new NextRequest(
          `https://dongtanview.com/technovalley?jisan=${encodeURIComponent(badQuery)}`
        );
        const badRes = await proxy(badReq);
        expect(badRes.status).toBe(308);
        expect(badRes.headers.get('location')).toBe('https://dongtanview.com/technovalley');
      }
    });
  });

  describe('5. Global AdSense & MobileStickyAnchorAd Isolation on noindex Routes (/lounge, /news, /technovalley/[slug], meta noindex)', () => {
    it('identifies noindex ad-excluded paths while preserving indexable hubs (/ and /technovalley)', () => {
      expect(isNoindexAdExcludedPath('/lounge')).toBe(true);
      expect(isNoindexAdExcludedPath('/lounge/post-123')).toBe(true);
      expect(isNoindexAdExcludedPath('/news')).toBe(true);
      expect(isNoindexAdExcludedPath('/news/')).toBe(true);
      expect(isNoindexAdExcludedPath('/technovalley/SH-SQUAREⅡ')).toBe(true);

      expect(isNoindexAdExcludedPath('/')).toBe(false);
      expect(isNoindexAdExcludedPath('/technovalley')).toBe(false);
      expect(isNoindexAdExcludedPath('/technovalley/')).toBe(false);
      expect(isNoindexAdExcludedPath('/guide/stress-dsr-valuation-guide')).toBe(false);
      expect(isNoindexAdExcludedPath('/apartment/동탄역롯데캐슬')).toBe(false);
    });

    it('pauses global adsbygoogle requests via pre-hydration script on /lounge, /news, /technovalley/[slug], and <meta name="robots" content="noindex, follow">', () => {
      const guardCode = buildPreHydrationAdSenseNoindexGuardScript();

      window.history.replaceState({}, '', '/lounge');
      // eslint-disable-next-line no-new-func
      new Function(guardCode)();
      expect(
        (window as unknown as { adsbygoogle: { pauseAdRequests?: number } }).adsbygoogle
          .pauseAdRequests
      ).toBe(1);

      // Navigating back to indexable home resumes ad requests
      window.history.replaceState({}, '', '/');
      // eslint-disable-next-line no-new-func
      new Function(guardCode)();
      expect(
        (window as unknown as { adsbygoogle: { pauseAdRequests?: number } }).adsbygoogle
          .pauseAdRequests
      ).toBe(0);

      // Zero-sale apartment with <meta name="robots" content="noindex, follow"> pauses ad requests
      window.history.replaceState({}, '', `/apartment/${encodeURIComponent('화성동탄상록리슈빌아파트영구임대')}`);
      const meta = document.createElement('meta');
      meta.setAttribute('name', 'robots');
      meta.setAttribute('content', 'noindex, follow');
      document.head.appendChild(meta);
      expect(documentHasNoindexRobotsMeta()).toBe(true);

      // eslint-disable-next-line no-new-func
      new Function(guardCode)();
      expect(
        (window as unknown as { adsbygoogle: { pauseAdRequests?: number } }).adsbygoogle
          .pauseAdRequests
      ).toBe(1);
    });

    it('suppresses AdSlot and MobileStickyAnchorAd DOM mounting on /lounge, /news, /technovalley/[slug], and noindex meta pages', async () => {
      const origMatchMedia = window.matchMedia;
      window.matchMedia = jest.fn().mockImplementation((query: string) => ({
        matches: query.includes('767px'),
        media: query,
        onchange: null,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      try {
        for (const excludedPath of ['/lounge', '/news', '/technovalley/SH-SQUAREⅡ']) {
          mockCurrentPathname = excludedPath;
          const adRender = render(<AdSlot slotId="1234567890" />);
          expect(adRender.container.innerHTML).toBe('');
          adRender.unmount();

          const anchorRender = render(<MobileStickyAnchorAd />);
          expect(anchorRender.container.innerHTML).toBe('');
          anchorRender.unmount();
        }

        // Indexable route with <meta name="robots" content="noindex, follow"> (e.g. 43 zero-sale apartments) unmounts ads cleanly
        mockCurrentPathname = '/apartment/화성동탄상록리슈빌아파트영구임대';
        const meta = document.createElement('meta');
        meta.setAttribute('name', 'robots');
        meta.setAttribute('content', 'noindex, follow');
        document.head.appendChild(meta);

        let noindexAptAd!: ReturnType<typeof render>;
        let noindexAptAnchor!: ReturnType<typeof render>;
        act(() => {
          noindexAptAd = render(<AdSlot slotId="1234567890" />);
          noindexAptAnchor = render(<MobileStickyAnchorAd />);
        });
        expect(noindexAptAd.container.innerHTML).toBe('');
        expect(noindexAptAnchor.container.innerHTML).toBe('');
        noindexAptAd.unmount();
        noindexAptAnchor.unmount();

        // Indexable route without noindex meta mounts MobileStickyAnchorAd & AdSlot normally
        document.head.innerHTML = '';
        mockCurrentPathname = '/';
        let validAnchor!: ReturnType<typeof render>;
        act(() => {
          validAnchor = render(<MobileStickyAnchorAd />);
        });
        expect(validAnchor.queryByTestId('mobile-sticky-anchor-ad')).not.toBeNull();

        // SPA <Link> navigation: landing on /technovalley/SH-SQUAREⅡ pauses ads (1), then soft-navigating to / resumes ads (0)
        mockCurrentPathname = '/technovalley/SH-SQUAREⅡ';
        act(() => {
          validAnchor.rerender(<MobileStickyAnchorAd />);
        });
        expect(validAnchor.container.innerHTML).toBe('');
        expect(
          (window as unknown as { adsbygoogle: { pauseAdRequests?: number } }).adsbygoogle
            .pauseAdRequests
        ).toBe(1);

        mockCurrentPathname = '/';
        act(() => {
          validAnchor.rerender(<MobileStickyAnchorAd />);
        });
        expect(validAnchor.queryByTestId('mobile-sticky-anchor-ad')).not.toBeNull();
        expect(
          (window as unknown as { adsbygoogle: { pauseAdRequests?: number } }).adsbygoogle
            .pauseAdRequests
        ).toBe(0);

        // Async App Router metadata update: <meta name="robots" content="noindex, follow"> injected AFTER pathname commit immediately suppresses anchor & pauses ads
        mockCurrentPathname = '/apartment/서해더블루93-8';
        act(() => {
          validAnchor.rerender(<MobileStickyAnchorAd />);
        });
        await act(async () => {
          const asyncMeta = document.createElement('meta');
          asyncMeta.setAttribute('name', 'robots');
          asyncMeta.setAttribute('content', 'noindex, follow');
          document.head.appendChild(asyncMeta);
          await Promise.resolve();
        });
        expect(validAnchor.container.innerHTML).toBe('');
        expect(
          (window as unknown as { adsbygoogle: { pauseAdRequests?: number } }).adsbygoogle
            .pauseAdRequests
        ).toBe(1);

        validAnchor.unmount();
      } finally {
        window.matchMedia = origMatchMedia;
      }
    });

    it('prevents React 19 SSR hoisting of <script id="google-adsense" async> ahead of #dview-adsense-noindex-guard in <head>', () => {
      const layoutSource = fs.readFileSync(
        path.resolve(__dirname, '../app/layout.tsx'),
        'utf8'
      );
      expect(layoutSource).toContain('itemProp="adsense-loader"');

      const ssrHtml = ReactDOMServer.renderToStaticMarkup(
        <html>
          <head>
            <meta name="robots" content="noindex, follow" />
            <script
              id="dview-adsense-noindex-guard"
              dangerouslySetInnerHTML={{ __html: buildPreHydrationAdSenseNoindexGuardScript() }}
            />
            <script
              id="google-adsense"
              async
              itemProp="adsense-loader"
              src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1103228112872356"
              crossOrigin="anonymous"
            />
          </head>
          <body />
        </html>
      );

      const metaIdx = ssrHtml.indexOf('name="robots"');
      const guardIdx = ssrHtml.indexOf('id="dview-adsense-noindex-guard"');
      const adsIdx = ssrHtml.indexOf('id="google-adsense"');
      expect(metaIdx).toBeGreaterThan(-1);
      expect(guardIdx).toBeGreaterThan(metaIdx);
      expect(adsIdx).toBeGreaterThan(guardIdx);
    });
  });
});
