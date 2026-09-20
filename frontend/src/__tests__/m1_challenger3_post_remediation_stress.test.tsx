import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import fs from 'fs';
import path from 'path';
import { match } from 'next/dist/compiled/path-to-regexp';
import { getRedirectStatusCodeFromError, getURLFromRedirectError } from 'next/dist/client/components/redirect';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { permanentRedirect, redirect, RedirectType } from 'next/navigation';
import StatsPage from '@/app/stats/page';
import LoungeHeader from '@/components/LoungeHeader';
import MobileDock, { TABS } from '@/components/pwa/MobileDock';

// Mock Next.js navigation hooks for React component rendering
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

describe('Milestone 1 Challenger 3: Empirical Post-Remediation Stress & Adversarial Test Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // Dimension 1: Next.js Runtime Redirect Digest & Status Code Oracle
  // =========================================================================
  describe('Dimension 1: Next.js Runtime Redirect Digest & Status Code Oracle', () => {
    it('empirically proves Next.js permanentRedirect("/") generates error digest with status 308', () => {
      let thrownError: any;
      try {
        permanentRedirect('/');
      } catch (err: any) {
        thrownError = err;
      }

      expect(thrownError).toBeDefined();
      expect(thrownError.message).toBe('NEXT_REDIRECT');
      expect(thrownError.digest).toBeDefined();

      // The canonical Next.js digest format is: NEXT_REDIRECT;action;url;statusCode;
      const parts = thrownError.digest.split(';');
      expect(parts[0]).toBe('NEXT_REDIRECT');
      expect(parts[1]).toBe('replace');
      expect(parts[2]).toBe('/');
      expect(parts[3]).toBe('308');

      const statusCode = Number(parts[3]);
      expect(statusCode).toBe(308);
    });

    it('empirically proves StatsPage() invokes permanentRedirect("/") throwing HTTP 308 digest', () => {
      let thrownError: any;
      try {
        StatsPage();
      } catch (err: any) {
        thrownError = err;
      }

      expect(thrownError).toBeDefined();
      expect(thrownError.message).toBe('NEXT_REDIRECT');
      expect(thrownError.digest).toBe('NEXT_REDIRECT;replace;/;308;');

      const parts = thrownError.digest.split(';');
      expect(Number(parts[3])).toBe(308);
      expect(parts[2]).toBe('/');
    });

    it('empirically proves native RedirectType exports ONLY { push, replace } and lacks permanent', () => {
      expect(RedirectType).toBeDefined();
      expect(Object.keys(RedirectType).sort()).toEqual(['push', 'replace']);
      expect((RedirectType as any).permanent).toBeUndefined();

      // Proves that the previous implementation redirect('/', (RedirectType as any).permanent)
      // evaluated to redirect('/', undefined) which produces HTTP 307 (Temporary Redirect)
      let oldBugError: any;
      try {
        redirect('/', (RedirectType as any).permanent);
      } catch (err: any) {
        oldBugError = err;
      }
      expect(oldBugError).toBeDefined();
      const oldParts = oldBugError.digest.split(';');
      expect(oldParts[3]).toBe('307'); // Old bug was 307!
    });
  });

  // =========================================================================
  // Dimension 2: Server-Side next.config.ts Redirects Robustness & Path-to-Regexp Oracle
  // =========================================================================
  describe('Dimension 2: Server-Side next.config.ts Redirects Robustness & Path-to-Regexp Oracle', () => {
    let redirects: Array<{ source: string; destination: string; permanent: boolean }>;

    beforeAll(() => {
      const configPath = path.resolve(process.cwd(), 'next.config.ts');
      const rawContent = fs.readFileSync(configPath, 'utf-8');
      const arrayMatch = rawContent.match(/async\s+redirects\s*\(\)\s*\{\s*return\s*(\[[\s\S]*?\]);\s*\}/);
      expect(arrayMatch).toBeTruthy();

      const fn = new Function(`return ${arrayMatch![1]};`);
      redirects = fn();
    });

    it('contains exact /stats and wildcard /stats/:path* rules with permanent: true', () => {
      const exactStats = redirects.find((r) => r.source === '/stats');
      expect(exactStats).toBeDefined();
      expect(exactStats?.destination).toBe('/');
      expect(exactStats?.permanent).toBe(true);

      const wildcardStats = redirects.find((r) => r.source === '/stats/:path*');
      expect(wildcardStats).toBeDefined();
      expect(wildcardStats?.destination).toBe('/');
      expect(wildcardStats?.permanent).toBe(true);
    });

    it('accurately matches diverse adversarial and nested paths via Next.js match engine', () => {
      const exactRule = redirects.find((r) => r.source === '/stats')!;
      const wildcardRule = redirects.find((r) => r.source === '/stats/:path*')!;

      const matchExact = match(exactRule.source);
      const matchWildcard = match(wildcardRule.source);

      // Exact matches
      expect(Boolean(matchExact('/stats'))).toBe(true);

      // Wildcard matches
      expect(Boolean(matchWildcard('/stats/'))).toBe(true);
      expect(Boolean(matchWildcard('/stats/overview'))).toBe(true);
      expect(Boolean(matchWildcard('/stats/report/2026'))).toBe(true);
      expect(Boolean(matchWildcard('/stats/a/b/c/d/e'))).toBe(true);

      // False positive defense: paths that start with "stat" but are not /stats
      expect(Boolean(matchExact('/status'))).toBe(false);
      expect(Boolean(matchWildcard('/status'))).toBe(false);
      expect(Boolean(matchExact('/statistics'))).toBe(false);
      expect(Boolean(matchWildcard('/statistics'))).toBe(false);
      expect(Boolean(matchExact('/stats-new'))).toBe(false);
      expect(Boolean(matchWildcard('/stats-new'))).toBe(false);
      expect(Boolean(matchExact('/api/stats'))).toBe(false);
      expect(Boolean(matchWildcard('/api/stats'))).toBe(false);
    });
  });

  // =========================================================================
  // Dimension 3: LoungeHeader and MobileDock Synchronized 3-Tab Architecture
  // =========================================================================
  describe('Dimension 3: LoungeHeader and MobileDock Synchronized 3-Tab Architecture', () => {
    const canonicalOrder = [
      { id: 'overview', label: '아파트 랩', href: '/' },
      { id: 'imjang', label: '아파트 탐색', href: '/explore' },
      { id: 'mbti', label: '단지 MBTI', href: '/mbti' },
    ];

    it('confirms MobileDock exported TABS matches canonical spec in exact order', () => {
      expect(TABS).toHaveLength(3);
      canonicalOrder.forEach((expected, i) => {
        expect(TABS[i].id).toBe(expected.id);
        expect(TABS[i].label).toBe(expected.label);
        expect(TABS[i].href).toBe(expected.href);
      });
    });

    it('confirms LoungeHeader and MobileDock render identical 3 tabs with zero obsolete routes', () => {
      const { container: headerContainer } = render(<LoungeHeader activeTab="overview" />);
      const { container: dockContainer } = render(<MobileDock activeTab="overview" />);

      const headerLinks = within(headerContainer).getAllByRole('link');
      const dockLinks = within(dockContainer).getAllByRole('link');

      expect(headerLinks).toHaveLength(3);
      expect(dockLinks).toHaveLength(3);

      for (let i = 0; i < 3; i++) {
        expect(headerLinks[i]).toHaveAttribute('href', canonicalOrder[i].href);
        expect(dockLinks[i]).toHaveAttribute('href', canonicalOrder[i].href);
        expect(headerLinks[i]).toHaveTextContent(canonicalOrder[i].label);
        expect(dockLinks[i]).toHaveTextContent(canonicalOrder[i].label);
      }

      // Ensure obsolete routes are absent
      const obsoleteRoutes = ['/stats', '/technovalley', '/techno', '/lounge', '/admin'];
      obsoleteRoutes.forEach((route) => {
        expect(within(headerContainer).queryByRole('link', { name: new RegExp(route) })).toBeNull();
        expect(within(dockContainer).queryByRole('link', { name: new RegExp(route) })).toBeNull();
      });
    });

    it('confirms active tab styling transitions cleanly across all 3 tabs without layout breaks', () => {
      const tabIds = ['overview', 'imjang', 'mbti'];
      tabIds.forEach((tabId) => {
        const { unmount: unmountHeader, container: headerContainer } = render(
          <LoungeHeader activeTab={tabId} />
        );
        const { unmount: unmountDock, container: dockContainer } = render(
          <MobileDock activeTab={tabId} />
        );

        const currentExpected = canonicalOrder.find((t) => t.id === tabId)!;
        const activeHeaderLink = within(headerContainer).getByRole('link', {
          name: new RegExp(currentExpected.label),
        });
        const activeDockLink = within(dockContainer).getByRole('link', {
          name: new RegExp(currentExpected.label),
        });

        expect(activeHeaderLink).toHaveClass('text-hs-orange');
        expect(activeDockLink).toHaveClass('text-hs-orange');

        unmountHeader();
        unmountDock();
      });
    });
  });

  // =========================================================================
  // Dimension 4: Next.js Redirect Helper Oracle Verification
  // =========================================================================
  describe('Dimension 4: Next.js Redirect Helper Oracle Verification', () => {
    it('verifies Next.js isRedirectError identifies StatsPage() thrown redirect', () => {
      let thrown: any;
      try {
        StatsPage();
      } catch (e: any) {
        thrown = e;
      }

      expect(thrown).toBeDefined();
      expect(isRedirectError(thrown)).toBe(true);
      expect(getURLFromRedirectError(thrown)).toBe('/');
      expect(getRedirectStatusCodeFromError(thrown)).toBe(308);
    });

    it('verifies non-redirect errors are strictly rejected by isRedirectError', () => {
      expect(isRedirectError(new Error('Regular error'))).toBe(false);
      expect(isRedirectError({ message: 'NEXT_REDIRECT' })).toBe(false);
      expect(isRedirectError({ digest: 'SOME_OTHER_DIGEST' })).toBe(false);
      expect(isRedirectError(null)).toBe(false);
      expect(isRedirectError(undefined)).toBe(false);
    });
  });

  // =========================================================================
  // Dimension 5: Adversarial activeTab Values & Resilience in Header and Dock
  // =========================================================================
  describe('Dimension 5: Adversarial activeTab Values & Resilience in Header and Dock', () => {
    const maliciousTabProps = [
      undefined,
      '',
      'null',
      'undefined',
      'non-existent-tab',
      'stats',
      'admin',
      'lounge',
      'technovalley',
      '"><script>alert(1)</script>',
      '__proto__',
    ];

    it.each(maliciousTabProps)(
      'renders exactly 3 canonical tabs without crashing when activeTab is "%s"',
      (tabProp) => {
        const { unmount: unmountH, container: headerContainer } = render(
          <LoungeHeader activeTab={tabProp as any} />
        );
        const { unmount: unmountD, container: dockContainer } = render(
          <MobileDock activeTab={tabProp as any} />
        );

        const headerLinks = within(headerContainer).getAllByRole('link');
        const dockLinks = within(dockContainer).getAllByRole('link');

        expect(headerLinks).toHaveLength(3);
        expect(dockLinks).toHaveLength(3);

        unmountH();
        unmountD();
      }
    );
  });
});

