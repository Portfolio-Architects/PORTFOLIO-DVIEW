/* eslint-disable @typescript-eslint/no-require-imports */
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import React from 'react';
import { render, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NextRequest } from 'next/server';
import { SWRConfig } from 'swr';
import BuyOrWaitVote from '@/components/apartment-modal/BuyOrWaitVote';
import TechnoValleyClient from '@/app/technovalley/TechnoValleyClient';
import { GET as getVoteRoute } from '@/app/api/apartments/vote/route';
import { GET as getJisanStatusRoute } from '@/app/api/technovalley/jisan-status/route';
import { GET as getTechnoTransactionsRoute } from '@/app/api/technovalley/transactions/route';
import { GET as getLocalNoticesRoute } from '@/app/api/local-notices/route';
import { proxy, config as proxyConfig } from '@/proxy';
import ApartmentPage, { revalidate as apartmentRevalidate } from '@/app/apartment/[aptName]/page';
import { revalidate as homeRevalidate } from '@/app/page';
import { revalidate as overviewRevalidate, dynamic as overviewDynamic } from '@/app/overview/page';
import { revalidate as exploreRevalidate } from '@/app/explore/page';
import { revalidate as newsRevalidate } from '@/app/news/page';
import { revalidate as loungeRevalidate } from '@/app/lounge/page';
import { revalidate as sitemapRevalidate } from '@/app/sitemap';
import {
  revalidate as technoValleyRevalidate,
  dynamic as technoValleyDynamic,
} from '@/app/technovalley/page';
import type { JisanStatusItem } from '@/lib/services/googleSheets';

const mockRedirect = jest.fn((target: string) => {
  const err = new Error(`NEXT_REDIRECT:${target}`);
  (err as Error & { digest?: string }).digest = `NEXT_REDIRECT;replace;${target};307;`;
  throw err;
});
const mockPermanentRedirect = jest.fn((target: string) => {
  const err = new Error(`NEXT_PERMANENT_REDIRECT:${target}`);
  (err as Error & { digest?: string }).digest = `NEXT_REDIRECT;replace;${target};308;`;
  throw err;
});

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/technovalley',
  useSearchParams: () => new URLSearchParams(),
  redirect: (url: string) => mockRedirect(url),
  permanentRedirect: (url: string) => mockPermanentRedirect(url),
}));

jest.mock('@/lib/services/newsData', () => ({
  getLocalNotices: jest.fn().mockResolvedValue({
    notices: [],
    lastUpdated: '2026-11-08T00:00:00.000Z',
    source: 'live',
  }),
  fetchLocalNotices: jest.fn().mockResolvedValue([]),
  loadFallbackNotices: jest.fn().mockReturnValue([]),
  getLocalNews: jest.fn().mockResolvedValue([]),
  getNewsCategorized: jest.fn().mockResolvedValue({
    localNotices: [],
    realEstateNews: [],
    gtxNews: [],
    developmentNews: [],
  }),
  getAllNewsItems: jest.fn().mockResolvedValue([]),
}));

jest.mock('@/lib/api/rateLimiter', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('@/lib/services/googleSheets', () => ({
  fetchSheetJisanStatus: jest.fn().mockResolvedValue([
    {
      name: '동탄 SK V1 center',
      buildingStatus: '건축완료',
      companyName: 'SK건설',
      developer: 'SK',
      builder: 'SK에코플랜트',
      roadAddress: '경기도 화성시 동탄첨단산업1로 27',
      jibunAddress: '영천동 853-1',
    },
  ]),
}));

jest.mock('@/lib/services/officeTx.service', () => ({
  getOfficeTransactions: jest.fn().mockResolvedValue([
    {
      date: '2026-10-15',
      type: '매매',
      sizeSqM: 89.42,
      floor: 7,
      price: '3억 2,000만원',
      priceRaw: 32000,
      buildingName: '동탄 SK V1 center',
      jibun: '영천동 853-1',
    },
  ]),
}));

const sampleJisan: JisanStatusItem = {
  no: 1,
  status: '완료',
  buildingStatus: '건축완료',
  companyName: 'SK건설',
  name: '동탄 SK V1 center',
  siteArea: '8,966',
  totalFloorArea: '89,807',
  floors: 'B3 / 20F',
  unitCount: '629',
  completionDate: '2020-07',
  approvalDate: '2018-04',
  roadAddress: '경기도 화성시 동탄첨단산업1로 27',
  jibunAddress: '영천동 853-1',
  developer: 'SK',
  builder: 'SK에코플랜트',
  occupancyRate: 94,
  location: { lat: 37.211, lng: 127.092 },
};

describe('Fluid Active CPU Leak Patch Verification Suite (Priorities 1-5)', () => {
  describe('Priority 1: GitHub Actions duplicate Vercel cron loop removal & direct-first MOLIT retry', () => {
    it('removes the executable curl loop from .github/workflows/sync-transactions.yml while keeping direct runner scripts', () => {
      const workflowPath = path.resolve(process.cwd(), '../.github/workflows/sync-transactions.yml');
      const workflowYaml = fs.readFileSync(workflowPath, 'utf8');

      expect(workflowYaml).not.toMatch(/^\s*for OFFSET in \$OFFSETS; do/m);
      expect(workflowYaml).not.toMatch(/^\s*curl -sS -m 55/m);
      expect(workflowYaml).toContain('node scripts/fetch-transactions.js');
      expect(workflowYaml).toContain('node scripts/fetch-rent.js');
    });

    it('uses 20000ms CI timeout and retries direct MOLIT on attempts 1 & 2 before falling back to Vercel proxy only on final attempt 3 in CI', async () => {
      const { fetchWithRetry: fetchTradeWithRetry } = require('../../scripts/fetch-transactions');
      const { fetchWithRetry: fetchRentWithRetry } = require('../../scripts/fetch-rent');

      const prevCi = process.env.CI;
      const prevJestWorkerId = process.env.JEST_WORKER_ID;
      process.env.CI = 'true';
      delete process.env.JEST_WORKER_ID;
      const spy = jest.spyOn(axios, 'get');

      try {
        const calls: Array<{ url: string; timeout?: number }> = [];
        let callNum = 0;
        spy.mockImplementation(async (targetUrl: string, opts?: { timeout?: number }) => {
          callNum++;
          calls.push({ url: targetUrl, timeout: opts?.timeout });
          if (callNum <= 2) {
            const err: Error & { code?: string } = new Error('timeout');
            err.code = 'ECONNABORTED';
            throw err;
          }
          return {
            status: 200,
            data: {
              response: {
                header: { resultCode: '000' },
                body: { totalCount: 0, items: { item: [] } },
              },
            },
          };
        });

        const molitUrl =
          'https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev?serviceKey=k&LAWD_CD=41590&DEAL_YMD=202610&pageNo=1&numOfRows=100&_type=json';

        // Call 1 (retries = 3): attempt 1 & attempt 2 MUST both hit direct apis.data.go.kr; only attempt 3 hits proxy
        await fetchTradeWithRetry(molitUrl, {}, 3, 1);
        expect(calls[0].url).toContain('apis.data.go.kr');
        expect(calls[0].timeout).toBe(20000);
        expect(calls[1].url).toContain('apis.data.go.kr');
        expect(calls[1].timeout).toBe(20000);
        expect(calls[2].url).toContain('/api/cron/sync-transactions?mode=proxy');

        // Call 2: MUST start with direct apis.data.go.kr (not sticky relay!)
        await fetchTradeWithRetry(molitUrl, {}, 3, 1);
        expect(calls[3].url).toContain('apis.data.go.kr');
        expect(calls[3].timeout).toBe(20000);

        // Rent script also uses 20000ms CI timeout and direct-first
        await fetchRentWithRetry(molitUrl, {}, 3, 1);
        expect(calls[4].url).toContain('apis.data.go.kr');
        expect(calls[4].timeout).toBe(20000);
      } finally {
        spy.mockRestore();
        if (prevCi === undefined) delete process.env.CI;
        else process.env.CI = prevCi;
        if (prevJestWorkerId === undefined) delete process.env.JEST_WORKER_ID;
        else process.env.JEST_WORKER_ID = prevJestWorkerId;
      }
    });
  });

  describe('Priority 2: Static JSON-backed ISR pages revalidate = 86400 (24 hours)', () => {
    it('exports revalidate = 86400 across apartment detail, home, overview, explore, news, lounge, sitemap, and technovalley', () => {
      expect(apartmentRevalidate).toBe(86400);
      expect(homeRevalidate).toBe(86400);
      expect(overviewRevalidate).toBe(86400);
      expect(overviewDynamic).toBe('force-static');
      expect(exploreRevalidate).toBe(86400);
      expect(newsRevalidate).toBe(86400);
      expect(loungeRevalidate).toBe(86400);
      expect(sitemapRevalidate).toBe(86400);
      expect(technoValleyRevalidate).toBe(86400);
      expect(technoValleyDynamic).toBe('force-static');
    });
  });

  describe('Priority 3: BuyOrWaitVote IntersectionObserver lazy fetch, bot blocking, and CDN Cache-Control', () => {
    const origFetch = global.fetch;
    const origIntersectionObserver = global.IntersectionObserver;
    const origUserAgent = navigator.userAgent;

    afterEach(() => {
      global.fetch = origFetch;
      global.IntersectionObserver = origIntersectionObserver;
      Object.defineProperty(navigator, 'userAgent', {
        value: origUserAgent,
        configurable: true,
      });
      Object.defineProperty(navigator, 'webdriver', {
        value: false,
        configurable: true,
      });
    });

    it('defers GET /api/apartments/vote until IntersectionObserver reports viewport intersection', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ buyCount: 12, waitCount: 8 }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      let observerCallback: IntersectionObserverCallback | null = null;
      global.IntersectionObserver = jest.fn((cb: IntersectionObserverCallback) => {
        observerCallback = cb;
        return {
          observe: jest.fn(),
          unobserve: jest.fn(),
          disconnect: jest.fn(),
          takeRecords: () => [],
          root: null,
          rootMargin: '200px 0px',
          thresholds: [0],
        };
      }) as unknown as typeof IntersectionObserver;

      const { unmount } = render(
        <SWRConfig value={{ provider: () => new Map() }}>
          <BuyOrWaitVote aptName="동탄역롯데캐슬" />
        </SWRConfig>
      );

      // Before intersection: zero fetch calls
      expect(fetchMock).not.toHaveBeenCalled();

      // Trigger intersection
      await act(async () => {
        observerCallback?.(
          [{ isIntersecting: true, intersectionRatio: 1 } as IntersectionObserverEntry],
          {} as IntersectionObserver
        );
      });

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          expect.stringContaining('/api/apartments/vote?aptName=%EB%8F%99%ED%83%84%EC%97%AD%EB%A1%AF%EB%8D%B0%EC%BA%90%EC%8A%AC')
        );
      });
      unmount();
    });

    it('blocks automated headless bots/crawlers from auto-fetching GET /api/apartments/vote', () => {
      const fetchMock = jest.fn();
      global.fetch = fetchMock as unknown as typeof fetch;
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        configurable: true,
      });

      const { unmount } = render(
        <SWRConfig value={{ provider: () => new Map() }}>
          <BuyOrWaitVote aptName="동탄역롯데캐슬" />
        </SWRConfig>
      );

      expect(fetchMock).not.toHaveBeenCalled();
      unmount();
    });

    it('attaches Cache-Control: public, s-maxage=300, stale-while-revalidate=600 to GET /api/apartments/vote', async () => {
      const req = new NextRequest('http://localhost/api/apartments/vote?aptName=동탄역롯데캐슬');
      const res = await getVoteRoute(req);
      expect(res.status).toBe(200);
      expect(res.headers.get('Cache-Control')).toBe(
        'public, s-maxage=300, stale-while-revalidate=600'
      );
    });
  });

  describe('Priority 4: TechnoValleyClient duplicate fetch elimination, client ?jisan= resolution & CDN s-maxage headers', () => {
    const origWindowFetch = window.fetch;

    afterEach(() => {
      window.fetch = origWindowFetch;
      window.history.replaceState({}, '', '/technovalley');
    });

    it('does NOT call /api/technovalley/transactions on client mount when initialTransactions=[] is passed from SSR', () => {
      const fetchSpy = jest.fn();
      window.fetch = fetchSpy as unknown as typeof fetch;

      const { unmount } = render(
        <TechnoValleyClient selectedJisan={sampleJisan} initialTransactions={[]} hideHeader />
      );

      expect(fetchSpy).not.toHaveBeenCalled();
      unmount();
    });

    it('fetches /api/technovalley/transactions when initialTransactions is omitted (undefined)', async () => {
      const fetchSpy = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });
      window.fetch = fetchSpy as unknown as typeof fetch;

      const { unmount } = render(
        <TechnoValleyClient selectedJisan={sampleJisan} hideHeader />
      );

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith(
          '/api/technovalley/transactions?lawdCd=41591&dealYmd=all'
        );
      });
      unmount();
    });

    it('resolves ?jisan= query parameter on the client from jisanList when static page passes selectedJisan={null}', async () => {
      const fetchSpy = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });
      window.fetch = fetchSpy as unknown as typeof fetch;
      window.history.replaceState(
        {},
        '',
        `/technovalley?jisan=${encodeURIComponent('동탄 SK V1 center')}`
      );

      const { unmount, getAllByText } = render(
        <TechnoValleyClient selectedJisan={null} jisanList={[sampleJisan]} hideHeader />
      );

      expect(getAllByText(/동탄 SK V1 center/).length).toBeGreaterThan(0);
      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith(
          '/api/technovalley/transactions?lawdCd=41591&dealYmd=all'
        );
      });
      unmount();
    });

    it('sets extended CDN s-maxage on technovalley, local-notices, and og routes', async () => {
      const statusRes = await getJisanStatusRoute(
        new NextRequest('http://localhost/api/technovalley/jisan-status')
      );
      expect(statusRes.headers.get('Cache-Control')).toContain('s-maxage=3600');
      expect(statusRes.headers.get('Cache-Control')).toContain('stale-while-revalidate=86400');

      const txRes = await getTechnoTransactionsRoute(
        new NextRequest('http://localhost/api/technovalley/transactions?lawdCd=41591&dealYmd=all')
      );
      expect(txRes.headers.get('Cache-Control')).toContain('s-maxage=3600');
      expect(txRes.headers.get('Cache-Control')).toContain('stale-while-revalidate=86400');

      const noticesRes = await getLocalNoticesRoute(
        new NextRequest('http://localhost/api/local-notices')
      );
      expect(noticesRes.headers.get('Cache-Control')).toBe(
        'public, s-maxage=3600, stale-while-revalidate=86400'
      );

      const ogRouteSource = fs.readFileSync(
        path.resolve(process.cwd(), 'src/app/api/og/route.tsx'),
        'utf8'
      );
      expect(ogRouteSource).toContain('s-maxage=604800, stale-while-revalidate=86400');
    });
  });

  describe('Priority 5: proxy.ts /apartment/:path* matcher removal & ApartmentPage canonical redirect migration', () => {
    beforeEach(() => {
      mockRedirect.mockClear();
      mockPermanentRedirect.mockClear();
    });

    it('excludes /apartment/:path* and generic /api/:path* from proxy config.matcher while preserving proxy() redirect contract', async () => {
      expect(proxyConfig.matcher).not.toContain('/apartment/:path*');
      expect(proxyConfig.matcher).not.toContain('/api/:path*');
      expect(proxyConfig.matcher).toContain('/api/bypass-notice');

      // Direct calls to proxy() still fast-path canonical URLs and redirect non-canonical URLs
      const canonicalReq = new NextRequest(
        `https://dongtanview.com/apartment/${encodeURIComponent('동탄역롯데캐슬')}`
      );
      const canonicalRes = await proxy(canonicalReq);
      expect(canonicalRes.status).toBe(200);

      const nonCanonicalReq = new NextRequest(
        `https://dongtanview.com/apartment/${encodeURIComponent('동탄역 롯데캐슬')}`
      );
      const nonCanonicalRes = await proxy(nonCanonicalReq);
      expect(nonCanonicalRes.status).toBe(308);
    });

    it('executes permanentRedirect(308) on non-canonical slugs and redirect("/explore") on invalid slugs in ApartmentPage', async () => {
      // 1. Spaced slug -> permanentRedirect to canonical
      await expect(
        ApartmentPage({
          params: Promise.resolve({ aptName: encodeURIComponent('동탄역 롯데캐슬') }),
          enforceCanonicalRedirect: true,
        })
      ).rejects.toThrow(
        `NEXT_PERMANENT_REDIRECT:/apartment/${encodeURIComponent('동탄역롯데캐슬')}`
      );
      expect(mockPermanentRedirect).toHaveBeenCalledWith(
        `/apartment/${encodeURIComponent('동탄역롯데캐슬')}`
      );

      // 2. Alias slug -> permanentRedirect to canonical
      mockPermanentRedirect.mockClear();
      await expect(
        ApartmentPage({
          params: Promise.resolve({ aptName: encodeURIComponent('동탄역 시범 리슈빌') }),
          enforceCanonicalRedirect: true,
        })
      ).rejects.toThrow(
        `NEXT_PERMANENT_REDIRECT:/apartment/${encodeURIComponent('동탄역시범리슈빌아파트')}`
      );

      // 3. NFD decomposed slug -> permanentRedirect to NFC canonical
      mockPermanentRedirect.mockClear();
      const nfdLotte = '동탄역롯데캐슬'.normalize('NFD');
      await expect(
        ApartmentPage({
          params: Promise.resolve({ aptName: encodeURIComponent(nfdLotte) }),
          enforceCanonicalRedirect: true,
        })
      ).rejects.toThrow(
        `NEXT_PERMANENT_REDIRECT:/apartment/${encodeURIComponent('동탄역롯데캐슬')}`
      );

      // 4. Non-existent / invalid slug -> redirect('/explore')
      await expect(
        ApartmentPage({
          params: Promise.resolve({ aptName: encodeURIComponent('존재하지않는단지가짜이름123') }),
          enforceCanonicalRedirect: true,
        })
      ).rejects.toThrow('NEXT_REDIRECT:/explore');
      expect(mockRedirect).toHaveBeenCalledWith('/explore');

      // 5. Canonical NFC slug -> does NOT redirect
      mockRedirect.mockClear();
      mockPermanentRedirect.mockClear();
      const element = await ApartmentPage({
        params: Promise.resolve({ aptName: encodeURIComponent('동탄역롯데캐슬') }),
        enforceCanonicalRedirect: true,
      });
      expect(element).toBeTruthy();
      expect(mockRedirect).not.toHaveBeenCalled();
      expect(mockPermanentRedirect).not.toHaveBeenCalled();
    });
  });
});

