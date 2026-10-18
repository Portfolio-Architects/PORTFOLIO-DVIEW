import React from 'react';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import fs from 'fs';
import path from 'path';
import { match } from 'next/dist/compiled/path-to-regexp';
import { getRedirectStatusCodeFromError, getURLFromRedirectError } from 'next/dist/client/components/redirect';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import LoungeHeader from '@/components/LoungeHeader';
import MobileDock, { TABS } from '@/components/pwa/MobileDock';
import StatsPage from '@/app/stats/page';

// ---------------------------------------------------------------------------
// Mocks for Navigation Components
// ---------------------------------------------------------------------------

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

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
  }),
}));


jest.mock('@/contexts/SettingsContext', () => ({
  useSettingsUi: () => ({
    isSettingsModalOpen: false,
    setIsSettingsModalOpen: jest.fn(),
  }),
  useSettingsValues: () => ({
    areaUnit: 'm2',
    setAreaUnit: jest.fn(),
    theme: 'light',
    setTheme: jest.fn(),
  }),
  useSettings: () => ({
    areaUnit: 'm2',
    setAreaUnit: jest.fn(),
    theme: 'light',
    setTheme: jest.fn(),
    isSettingsModalOpen: false,
    setIsSettingsModalOpen: jest.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// Test Suite: Challenger M1_2 Empirical Stress & Redirect Verification
// ---------------------------------------------------------------------------

describe('Milestone 1 Challenger 2: Empirical Redirects & Navigation Sync Challenge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // Dimension 1: next.config.ts Redirects & Path Matching Oracles
  // =========================================================================
  describe('Dimension 1: next.config.ts Redirects & Path Matching Oracles', () => {
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

    it('defines permanent redirect for exact /stats to /', () => {
      expect(statsRule).toBeDefined();
      expect(statsRule.destination).toBe('/');
      expect(statsRule.permanent).toBe(true);
    });

    it('defines permanent redirect for wildcard /stats/:path* to /', () => {
      expect(statsWildcardRule).toBeDefined();
      expect(statsWildcardRule.destination).toBe('/');
      expect(statsWildcardRule.permanent).toBe(true);
    });

    it('matches exact /stats via Next.js path-to-regexp engine', () => {
      const matcher = match('/stats', { decode: decodeURIComponent });
      const result = matcher('/stats');
      expect(result).not.toBe(false);
      if (result) {
        expect(result.path).toBe('/stats');
      }
    });

    it('matches nested and deep paths via Next.js path-to-regexp wildcard matcher', () => {
      const matcher = match('/stats/:path*', { decode: decodeURIComponent });

      // Root with trailing slash
      const rSlash = matcher('/stats/');
      expect(rSlash).not.toBe(false);

      // Single nested segment
      const rNested = matcher('/stats/nested');
      expect(rNested).not.toBe(false);
      if (rNested) {
        expect(rNested.params).toEqual({ path: ['nested'] });
      }

      // Deep multi-tier nested segment
      const rDeep = matcher('/stats/nested/deep/report/2026');
      expect(rDeep).not.toBe(false);
      if (rDeep) {
        expect(rDeep.params).toEqual({ path: ['nested', 'deep', 'report', '2026'] });
      }
    });

    it('ensures query parameter URLs (/stats/nested?query=123) correctly extract base path and match redirect', () => {
      const matcher = match('/stats/:path*', { decode: decodeURIComponent });

      // In Next.js router, pathname is parsed before path matching:
      const testUrls = [
        '/stats?query=123',
        '/stats/nested?query=123',
        '/stats/nested/report?foo=bar&baz=456#hash',
      ];

      testUrls.forEach((fullUrl) => {
        const urlObj = new URL(fullUrl, 'https://dview.kr');
        const pathname = urlObj.pathname;
        const result = matcher(pathname);
        expect(result).not.toBe(false);
        expect(urlObj.searchParams.has('query') || urlObj.searchParams.has('foo')).toBe(true);
      });
    });

    it('strictly avoids false positive matches on non-stats prefixes', () => {
      const matcher1 = match('/stats', { decode: decodeURIComponent });
      const matcher2 = match('/stats/:path*', { decode: decodeURIComponent });

      const negativePaths = [
        '/statistics',
        '/status',
        '/stat',
        '/stats-report',
        '/mystats',
        '/api/stats',
      ];

      negativePaths.forEach((negPath) => {
        expect(matcher1(negPath)).toBe(false);
        expect(matcher2(negPath)).toBe(false);
      });
    });
  });

  // =========================================================================
  // Dimension 2: Server-Side Page Redirection (src/app/stats/page.tsx)
  // =========================================================================
  describe('Dimension 2: Server-Side Page Redirection Execution', () => {
    it('executes StatsPage() and throws Next.js redirect targeting "/"', () => {
      let thrownError: any;
      try {
        StatsPage();
      } catch (err: any) {
        thrownError = err;
      }

      expect(thrownError).toBeDefined();
      expect(isRedirectError(thrownError)).toBe(true);
      expect(getURLFromRedirectError(thrownError)).toBe('/');
    });

    it('observes and records the redirect status code in the thrown error digest', () => {
      let thrownError: any;
      try {
        StatsPage();
      } catch (err: any) {
        thrownError = err;
      }

      expect(thrownError).toBeDefined();
      const statusCode = getRedirectStatusCodeFromError(thrownError);
      // HTTP 308 Permanent Redirect verified: StatsPage invokes permanentRedirect('/')
      expect(statusCode).toBe(308);
      expect(thrownError.digest).toContain('NEXT_REDIRECT');
      expect(thrownError.digest).toContain('/');
    });
  });

  // =========================================================================
  // Dimension 3: Canonical 3-Tab Desktop & Mobile Navigation Integrity
  // =========================================================================
  describe('Dimension 3: Canonical Desktop & Mobile Navigation Sync', () => {
    const canonicalHeaderTabs = [
      { id: 'overview', label: '아파트 랩', href: '/' },
      { id: 'imjang', label: '아파트 탐색', href: '/explore' },
      { id: 'mbti', label: '단지 MBTI', href: '/mbti' },
      { id: 'guide', label: '부동산 가이드', href: '/guide' },
    ];
    const canonicalDockTabs = [
      { id: 'overview', label: '아파트 랩', href: '/' },
      { id: 'imjang', label: '아파트 탐색', href: '/explore' },
      { id: 'mbti', label: '단지 MBTI', href: '/mbti' },
    ];

    it('confirms LoungeHeader renders 4 canonical tabs and MobileDock renders 3 canonical tabs', () => {
      // 1. MobileDock TABS export
      expect(TABS).toHaveLength(3);
      canonicalDockTabs.forEach((expected, i) => {
        expect(TABS[i].id).toBe(expected.id);
        expect(TABS[i].label).toBe(expected.label);
        expect(TABS[i].href).toBe(expected.href);
      });

      // 2. LoungeHeader DOM links
      const { container: headerContainer } = render(<LoungeHeader activeTab="overview" />);
      const headerNav = within(headerContainer).getByRole('navigation', { name: '메인 메뉴' });
      const headerLinks = within(headerNav).getAllByRole('link');
      expect(headerLinks).toHaveLength(4);
      canonicalHeaderTabs.forEach((expected, i) => {
        expect(headerLinks[i]).toHaveTextContent(expected.label);
        expect(headerLinks[i]).toHaveAttribute('href', expected.href);
      });

      // 3. MobileDock DOM links
      const { container: dockContainer } = render(<MobileDock activeTab="overview" />);
      const dockNav = dockContainer.querySelector('nav');
      expect(dockNav).toBeInTheDocument();
      const dockLinks = within(dockNav!).getAllByRole('link');
      expect(dockLinks).toHaveLength(3);
      canonicalDockTabs.forEach((expected, i) => {
        expect(dockLinks[i]).toHaveTextContent(expected.label);
        expect(dockLinks[i]).toHaveAttribute('href', expected.href);
      });
    });

    it('verifies obsolete routes (/stats, /technovalley, /lounge, /admin) are 100% absent from navigation', () => {
      const { container: headerContainer } = render(<LoungeHeader activeTab="overview" />);
      const { container: dockContainer } = render(<MobileDock activeTab="overview" />);

      [headerContainer, dockContainer].forEach((container) => {
        const links = within(container).getAllByRole('link');
        const hrefs = links.map((l) => l.getAttribute('href') || '');

        expect(hrefs.some((h) => h.includes('stats'))).toBe(false);
        expect(hrefs.some((h) => h.includes('techno'))).toBe(false);
        expect(hrefs.some((h) => h.includes('lounge'))).toBe(false);
        expect(hrefs.some((h) => h.includes('admin'))).toBe(false);

        expect(within(container).queryByText(/통계/)).toBeNull();
        expect(within(container).queryByText(/테크노/)).toBeNull();
        expect(within(container).queryByText(/라운지/)).toBeNull();
        expect(within(container).queryByText(/관리자/)).toBeNull();
      });
    });

    it('simulates rapid tab clicks across all tabs on both LoungeHeader and MobileDock', () => {
      const onHeaderTabChange = jest.fn();
      const onDockTabClick = jest.fn();

      const { container: headerContainer } = render(<LoungeHeader activeTab="overview" onTabChange={onHeaderTabChange} />);
      const { container: dockContainer } = render(<MobileDock activeTab="overview" onTabClick={onDockTabClick} />);

      const headerNav = within(headerContainer).getByRole('navigation', { name: '메인 메뉴' });
      const headerLinks = within(headerNav).getAllByRole('link');
      const dockNav = dockContainer.querySelector('nav')!;
      const dockLinks = within(dockNav).getAllByRole('link');

      act(() => {
        for (let i = 0; i < 30; i++) {
          const headerTabIdx = i % headerLinks.length;
          const dockTabIdx = i % dockLinks.length;
          fireEvent.click(headerLinks[headerTabIdx]);
          fireEvent.click(dockLinks[dockTabIdx]);
        }
      });

      expect(onHeaderTabChange).toHaveBeenCalledTimes(30);
      expect(onDockTabClick).toHaveBeenCalledTimes(30);
    });

    it('verifies dynamic active tab visual indication across all states', () => {
      const tabs: Array<'overview' | 'imjang' | 'mbti' | 'guide'> = ['overview', 'imjang', 'mbti', 'guide'];

      tabs.forEach((tab) => {
        const { unmount, container } = render(<LoungeHeader activeTab={tab} />);
        const headerNav = within(container).getByRole('navigation', { name: '메인 메뉴' });
        const links = within(headerNav).getAllByRole('link');

        const activeLinkIndex = tabs.indexOf(tab);
        expect(links[activeLinkIndex]).toHaveClass('text-emerald-700');
        expect(links[activeLinkIndex]).toHaveClass('bg-emerald-50');

        // Other links should not have active background
        links.forEach((link, idx) => {
          if (idx !== activeLinkIndex) {
            expect(link).not.toHaveClass('bg-emerald-50');
          }
        });
        unmount();
      });
    });
  });
});
