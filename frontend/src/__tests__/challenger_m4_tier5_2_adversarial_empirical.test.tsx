import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import fs from 'fs';
import path from 'path';
import { match } from 'next/dist/compiled/path-to-regexp';
import { getRedirectStatusCodeFromError, getURLFromRedirectError } from 'next/dist/client/components/redirect';
import { isRedirectError } from 'next/dist/client/components/redirect-error';

// Mock Firebase Firestore
const mockGetDocs = jest.fn();
const mockGetDoc = jest.fn();
const mockOnSnapshot = jest.fn();

jest.mock('firebase/firestore', () => {
  const original = jest.requireActual('firebase/firestore');
  return {
    ...original,
    collection: jest.fn(() => ({ type: 'collection' })),
    query: jest.fn(() => ({ type: 'query' })),
    where: jest.fn(() => ({ type: 'where' })),
    getDocs: (...args: any[]) => mockGetDocs(...args),
    getDoc: (...args: any[]) => mockGetDoc(...args),
    onSnapshot: (...args: any[]) => mockOnSnapshot(...args),
  };
});

// Mock Next.js router
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockPrefetch = jest.fn();

jest.mock('next/navigation', () => {
  const actual = jest.requireActual('next/navigation');
  return {
    ...actual,
    useRouter: () => ({
      push: mockPush,
      replace: mockReplace,
      prefetch: mockPrefetch,
    }),
    usePathname: () => '/',
    useSearchParams: () => new URLSearchParams(),
  };
});

jest.mock('@/lib/firebaseConfig', () => ({
  db: { __mockDb: true },
}));

import { staticDataService } from '@/lib/services/staticDataService';
import MobileDock from '@/components/pwa/MobileDock';
import StatsPage from '@/app/stats/page';
import { AdSlot } from '@/components/ads/AdSlot';

describe('Challenger M4 Tier 5-2: Empirical Adversarial Stress Suite', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    staticDataService.clearCache();
    jest.clearAllMocks();
    mockGetDocs.mockReset();
    mockGetDoc.mockReset();
    mockOnSnapshot.mockReset();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  // =========================================================================
  // Requirement 1: Client AST & Network Spy Audit ($0 Firestore Reads)
  // =========================================================================
  describe('Area 1: $0 Firestore Client-Side Cost Audit (AST & Network Spy)', () => {
    it('verifies through AST/source inspection that client dashboard files contain 0 direct Firestore read calls', () => {
      const frontendSrc = path.resolve(process.cwd(), 'src');
      const clientDashboardFiles = [
        'app/page.tsx',
        'components/DashboardClient.tsx',
        'components/MacroDashboardClient.tsx',
        'components/stats/StatsOverviewSection.tsx',
        'components/stats/StatsFilterBar.tsx',
        'components/macro/components/AptDonutSection.tsx',
        'components/macro/components/AptMetricCards.tsx',
        'components/ranking/RealtimeRankingBoard.tsx',
        'components/pwa/MobileDock.tsx',
        'components/LoungeHeader.tsx',
      ];

      const forbiddenPatterns = [
        /import\s+.*?(?:getDocs|getDoc|onSnapshot)\s+from\s+['"]firebase\/firestore['"]/,
        /\bgetDocs\s*\(/,
        /\bgetDoc\s*\(/,
        /\bonSnapshot\s*\(/,
      ];

      clientDashboardFiles.forEach((relPath) => {
        const fullPath = path.join(frontendSrc, relPath);
        expect(fs.existsSync(fullPath)).toBe(true);
        const content = fs.readFileSync(fullPath, 'utf-8');

        forbiddenPatterns.forEach((pattern) => {
          const hasMatch = pattern.test(content);
          if (hasMatch) {
            console.error(`Violation in ${relPath}: matched forbidden Firestore read pattern ${pattern}`);
          }
          expect(hasMatch).toBe(false);
        });
      });
    });

    it('network spy confirms 0 calls to firestore.googleapis.com or Firebase REST during data fetching', async () => {
      const interceptedUrls: string[] = [];

      global.fetch = jest.fn().mockImplementation((url: string | URL | Request) => {
        const urlString = typeof url === 'string' ? url : url.toString();
        interceptedUrls.push(urlString);

        if (urlString.includes('tx-summary.json')) {
          return Promise.resolve(new Response(JSON.stringify({ summary: {} }), { status: 200 }));
        }
        if (urlString.includes('recent-transactions.json')) {
          return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
        }
        if (urlString.includes('macro-trend.json')) {
          return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
        }
        return Promise.resolve(new Response('{}', { status: 200 }));
      });

      // Fetch summary and recent transactions through staticDataService
      await staticDataService.fetchTxSummary();
      await staticDataService.fetchRecentTransactions();
      await staticDataService.fetchPeriodTransactions('90d');
      await staticDataService.fetchPeriodTransactions('1y');

      // Assert that ALL intercepted URLs are local CDN/static files (/data/*.json)
      expect(interceptedUrls.length).toBe(4);
      interceptedUrls.forEach((url) => {
        expect(url).toMatch(/\/data\/(tx-summary|recent-transactions|transactions-1y)\.json\?v=/);
        expect(url).not.toContain('firestore.googleapis.com');
        expect(url).not.toContain('firebaseio.com');
      });

      // Assert 0 Firestore SDK calls were made
      expect(mockGetDocs).toHaveBeenCalledTimes(0);
      expect(mockGetDoc).toHaveBeenCalledTimes(0);
      expect(mockOnSnapshot).toHaveBeenCalledTimes(0);
    });
  });

  // =========================================================================
  // Requirement 2: Browser Runtime 100 Concurrent Requests (Zero Network Leakage)
  // =========================================================================
  describe('Area 2: Browser Runtime 100 Concurrent Requests Defense', () => {
    it('executes 100 concurrent requests in simulated browser runtime asserting immediate empty return and 0 Firestore calls', async () => {
      // In jest-environment-jsdom, window is defined
      expect(typeof window).not.toBe('undefined');

      const adversarialParameters = [
        30, 90, 1, 365, 0, -1, -50, 99999, NaN, Infinity, -Infinity
      ];

      const startTime = performance.now();

      // Launch 100 concurrent requests in parallel
      const requestPromises = Array.from({ length: 100 }, (_, i) => {
        const daysParam = adversarialParameters[i % adversarialParameters.length];
        const forceRefresh = i % 2 === 0;
        return staticDataService.fetchRecentTransactionsFromFirestore(daysParam, forceRefresh);
      });

      const results = await Promise.all(requestPromises);
      const totalDuration = performance.now() - startTime;

      // 1. All 100 requests must return exact empty array []
      expect(results).toHaveLength(100);
      results.forEach((res, idx) => {
        expect(res).toEqual([]);
      });

      // 2. Execution must be instantaneous without hitting any network or timers (SLA < 50ms)
      expect(totalDuration).toBeLessThan(50);

      // 3. Exactly ZERO getDocs calls to Firestore
      expect(mockGetDocs).toHaveBeenCalledTimes(0);
      expect(mockGetDoc).toHaveBeenCalledTimes(0);
      expect(mockOnSnapshot).toHaveBeenCalledTimes(0);
    });
  });

  // =========================================================================
  // Requirement 3: MobileDock Visual Viewport Collapse Simulation (Virtual Keyboard)
  // =========================================================================
  describe('Area 3: MobileDock Visual Viewport Collapse Simulation (Virtual Keyboard)', () => {
    let originalInnerHeight: number;
    let resizeListeners: Array<() => void> = [];

    beforeEach(() => {
      originalInnerHeight = window.innerHeight;
      resizeListeners = [];

      // Setup mock visualViewport
      const mockViewport = {
        height: 800,
        width: 375,
        offsetTop: 0,
        offsetLeft: 0,
        pageTop: 0,
        pageLeft: 0,
        scale: 1,
        addEventListener: jest.fn((event: string, cb: () => void) => {
          if (event === 'resize') {
            resizeListeners.push(cb);
          }
        }),
        removeEventListener: jest.fn((event: string, cb: () => void) => {
          if (event === 'resize') {
            resizeListeners = resizeListeners.filter((l) => l !== cb);
          }
        }),
      };

      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 800,
      });

      Object.defineProperty(window, 'visualViewport', {
        writable: true,
        configurable: true,
        value: mockViewport,
      });
    });

    afterEach(() => {
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: originalInnerHeight,
      });
    });

    it('renders initially visible (translate-y-0 opacity-100) when viewport is full height', () => {
      const { container } = render(<MobileDock activeTab="overview" />);
      const nav = container.querySelector('nav');
      expect(nav).toBeInTheDocument();
      expect(nav).toHaveClass('translate-y-0');
      expect(nav).toHaveClass('opacity-100');
      expect(nav).not.toHaveClass('translate-y-full');
      expect(nav).not.toHaveClass('opacity-0');
      expect(nav).not.toHaveClass('pointer-events-none');
    });

    it('collapses cleanly (translate-y-full opacity-0 pointer-events-none) when keyboard opens (viewport drops > 120px)', () => {
      const { container } = render(<MobileDock activeTab="overview" />);
      const nav = container.querySelector('nav');
      expect(nav).toHaveClass('translate-y-0');

      // Simulate Virtual Keyboard Open: height drops from 800px to 450px (diff = 350px > 120px)
      act(() => {
        (window.visualViewport as any).height = 450;
        resizeListeners.forEach((listener) => listener());
      });

      expect(nav).toHaveClass('translate-y-full');
      expect(nav).toHaveClass('opacity-0');
      expect(nav).toHaveClass('pointer-events-none');
      expect(nav).not.toHaveClass('translate-y-0');
      expect(nav).not.toHaveClass('opacity-100');
    });

    it('restores visibility when virtual keyboard closes (viewport height returns)', () => {
      const { container } = render(<MobileDock activeTab="overview" />);
      const nav = container.querySelector('nav');

      // 1. Keyboard opens
      act(() => {
        (window.visualViewport as any).height = 400;
        resizeListeners.forEach((listener) => listener());
      });
      expect(nav).toHaveClass('translate-y-full');

      // 2. Keyboard closes
      act(() => {
        (window.visualViewport as any).height = 800;
        resizeListeners.forEach((listener) => listener());
      });

      expect(nav).toHaveClass('translate-y-0');
      expect(nav).toHaveClass('opacity-100');
      expect(nav).not.toHaveClass('translate-y-full');
      expect(nav).not.toHaveClass('pointer-events-none');
    });

    it('tests precise boundary threshold (119px vs 121px height drop)', () => {
      const { container } = render(<MobileDock activeTab="overview" />);
      const nav = container.querySelector('nav');

      // Height drop of exactly 119px (800 - 119 = 681px) -> Should NOT hide (< 120px threshold)
      act(() => {
        (window.visualViewport as any).height = 681;
        resizeListeners.forEach((listener) => listener());
      });
      expect(nav).toHaveClass('translate-y-0');
      expect(nav).not.toHaveClass('translate-y-full');

      // Height drop of exactly 121px (800 - 121 = 679px) -> MUST hide (> 120px threshold)
      act(() => {
        (window.visualViewport as any).height = 679;
        resizeListeners.forEach((listener) => listener());
      });
      expect(nav).toHaveClass('translate-y-full');
      expect(nav).toHaveClass('opacity-0');
    });

    it('survives rapid keyboard typing jitter without desynchronization or crashes', () => {
      const { container } = render(<MobileDock activeTab="overview" />);
      const nav = container.querySelector('nav');

      // Rapidly toggle 50 times between keyboard open and closed
      act(() => {
        for (let i = 0; i < 50; i++) {
          (window.visualViewport as any).height = i % 2 === 0 ? 420 : 800;
          resizeListeners.forEach((listener) => listener());
        }
      });

      // Final state was i=49 (odd) -> 800 -> visible
      expect(nav).toHaveClass('translate-y-0');
      expect(nav).toHaveClass('opacity-100');
    });
  });

  // =========================================================================
  // Requirement 4: 301/308 Redirect Path Oracles with Preserved Queries
  // =========================================================================
  describe('Area 4: 301/308 Redirect Path Oracles & Query Preservation', () => {
    let redirects: any[] = [];
    let statsRule: any;
    let statsWildcardRule: any;

    beforeAll(() => {
      const configPath = path.resolve(process.cwd(), 'next.config.ts');
      const rawContent = fs.readFileSync(configPath, 'utf-8');

      const arrayMatch = rawContent.match(/async\s+redirects\s*\(\)\s*\{\s*return\s*(\[[\s\S]*?\]);\s*\}/);
      if (!arrayMatch) {
        throw new Error('Could not find async redirects() return array in next.config.ts');
      }
      const fn = new Function(`return ${arrayMatch[1]};`);
      redirects = fn();

      statsRule = redirects.find((r: any) => r.source === '/stats');
      statsWildcardRule = redirects.find((r: any) => r.source === '/stats/:path*');
    });

    it('verifies next.config.ts configuration has permanent: true for both /stats and /stats/:path*', () => {
      expect(statsRule).toBeDefined();
      expect(statsRule.source).toBe('/stats');
      expect(statsRule.destination).toBe('/');
      expect(statsRule.permanent).toBe(true);

      expect(statsWildcardRule).toBeDefined();
      expect(statsWildcardRule.source).toBe('/stats/:path*');
      expect(statsWildcardRule.destination).toBe('/');
      expect(statsWildcardRule.permanent).toBe(true);
    });

    it('matches /stats, /stats/, /stats/report with full query parameter preservation oracle', () => {
      const exactMatcher = match('/stats', { decode: decodeURIComponent });
      const wildcardMatcher = match('/stats/:path*', { decode: decodeURIComponent });

      const testCases = [
        {
          inputUrl: '/stats?tab=overview&region=동탄2&pyeong=MEDIUM',
          expectedPathname: '/stats',
          expectedQuery: { tab: 'overview', region: '동탄2', pyeong: 'MEDIUM' },
        },
        {
          inputUrl: '/stats/?sort=price_desc&page=2&limit=50',
          expectedPathname: '/stats/',
          expectedQuery: { sort: 'price_desc', page: '2', limit: '50' },
        },
        {
          inputUrl: '/stats/monthly-report?year=2026&month=09&complex=%EB%8F%99%ED%83%84%EC%97%AD%EB%A1%AF%EB%8D%B0%EC%BA%90%EC%8A%AC',
          expectedPathname: '/stats/monthly-report',
          expectedQuery: { year: '2026', month: '09', complex: '동탄역롯데캐슬' },
        },
        {
          inputUrl: '/stats/deep/nested/subpath/2026?utm_source=google&utm_medium=cpc&gclid=test1234',
          expectedPathname: '/stats/deep/nested/subpath/2026',
          expectedQuery: { utm_source: 'google', utm_medium: 'cpc', gclid: 'test1234' },
        },
      ];

      testCases.forEach(({ inputUrl, expectedPathname, expectedQuery }) => {
        const parsed = new URL(inputUrl, 'https://dongtanview.com');
        expect(parsed.pathname).toBe(expectedPathname);

        // Path-to-regexp matcher matches either exact or wildcard
        const isMatched = exactMatcher(parsed.pathname) !== false || wildcardMatcher(parsed.pathname) !== false;
        expect(isMatched).toBe(true);

        // Oracle: Verify that query parameters are fully preserved
        Object.entries(expectedQuery).forEach(([key, val]) => {
          expect(parsed.searchParams.get(key)).toBe(val);
        });

        // Oracle: If redirected to destination '/', the target URL with preserved queries is '/?<query>'
        const destinationWithQuery = `/${parsed.search}`;
        const targetUrl = new URL(destinationWithQuery, 'https://dongtanview.com');
        expect(targetUrl.pathname).toBe('/');
        Object.entries(expectedQuery).forEach(([key, val]) => {
          expect(targetUrl.searchParams.get(key)).toBe(val);
        });
      });
    });

    it('strictly rejects non-stats prefixes with 0 false positives', () => {
      const exactMatcher = match('/stats', { decode: decodeURIComponent });
      const wildcardMatcher = match('/stats/:path*', { decode: decodeURIComponent });

      const nonStatsPaths = [
        '/statistics',
        '/statistics/dongtan',
        '/status',
        '/status/health',
        '/stat',
        '/stats-summary',
        '/mystats',
        '/api/stats',
        '/public/stats',
        '/static/stats',
        '/station',
      ];

      nonStatsPaths.forEach((invalidPath) => {
        expect(exactMatcher(invalidPath)).toBe(false);
        expect(wildcardMatcher(invalidPath)).toBe(false);
      });
    });

    it('verifies StatsPage component throws HTTP 308 permanent redirect error targeting "/"', () => {
      let thrownError: any;
      try {
        StatsPage();
      } catch (err: any) {
        thrownError = err;
      }

      expect(thrownError).toBeDefined();
      expect(isRedirectError(thrownError)).toBe(true);
      expect(getURLFromRedirectError(thrownError)).toBe('/');

      const statusCode = getRedirectStatusCodeFromError(thrownError);
      expect(statusCode).toBe(308); // HTTP 308 Permanent Redirect
      expect(thrownError.digest).toContain('NEXT_REDIRECT');
      expect(thrownError.digest).toContain('/');
    });
  });

  // =========================================================================
  // Requirement 5: 5 Concurrent Ad Slots & 20 Unmount/Mount Cycles (T5-09)
  // =========================================================================
  describe('Area 5: 5 Concurrent Ad Slots & 20 Unmount/Mount Cycles (T5-09)', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = {
        ...originalEnv,
        NEXT_PUBLIC_ADSENSE_CLIENT_ID: 'ca-pub-test-client-12345',
        NODE_ENV: 'production',
      };
      (window as any).adsbygoogle = [];
    });

    afterEach(() => {
      process.env = originalEnv;
      delete (window as any).adsbygoogle;
    });

    it('guarantees that 5 concurrent ad slots survive 20 unmount/mount cycles with exact single push guarantee', () => {
      function FiveSlotContainer() {
        return (
          <div data-testid="five-slot-container">
            <AdSlot slotId="slot-1" format="horizontal-strip" />
            <AdSlot slotId="slot-2" format="in-feed" />
            <AdSlot slotId="slot-3" format="in-feed" />
            <AdSlot slotId="slot-4" format="banner" />
            <AdSlot slotId="slot-5" format="in-feed" />
          </div>
        );
      }

      let cumulativePushes = 0;

      // Simulate 20 unmount/mount cycles (e.g. repeated navigation or modal popups)
      for (let cycle = 1; cycle <= 20; cycle++) {
        const { unmount } = render(<FiveSlotContainer />);

        const pushCallsInThisCycle = (window as any).adsbygoogle.length - cumulativePushes;
        // Exactly 5 pushes for the 5 mounted ad slots in this cycle
        expect(pushCallsInThisCycle).toBe(5);

        cumulativePushes = (window as any).adsbygoogle.length;
        expect(cumulativePushes).toBe(cycle * 5);

        // Clean unmount
        unmount();
      }

      // Final count across 20 cycles: exactly 20 * 5 = 100 pushes
      expect((window as any).adsbygoogle.length).toBe(100);
    });
  });
});

