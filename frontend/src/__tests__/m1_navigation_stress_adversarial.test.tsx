import React from 'react';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import fs from 'fs';
import path from 'path';
import LoungeHeader from '@/components/LoungeHeader';
import MobileDock, { TABS } from '@/components/pwa/MobileDock';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockPrefetch = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    prefetch: mockPrefetch,
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  redirect: jest.fn((url: string, type?: any) => {
    throw new Error(`NEXT_REDIRECT:${url}:${type}`);
  }),
  permanentRedirect: jest.fn((url: string) => {
    throw new Error('NEXT_REDIRECT:' + url + ':308');
  }),
  RedirectType: {
    push: 'push',
    replace: 'replace',
  },
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
  }),
}));

describe('Empirical Adversarial Stress Harness: Milestone 1 Navigation & Redirects', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  // =========================================================================
  // Stress Dimension 1: Exact 3-Tab Invariant Under Adversarial Props
  // =========================================================================
  describe('Dimension 1: Exact 3-Tab Invariant Under Adversarial Props', () => {
    const adversarialTabs = [
      'overview',
      'imjang',
      'mbti',
      'stats',
      'admin',
      'lounge',
      'technovalley',
      '',
      '__proto__',
      'undefined',
      'null',
      '12345',
      '<script>alert(1)</script>',
      undefined,
      null as any,
    ];

    it.each(adversarialTabs)(
      'LoungeHeader renders EXACTLY 3 tabs when activeTab is "%s"',
      (activeTab) => {
        const { container } = render(<LoungeHeader activeTab={activeTab} />);
        const nav = container.querySelector('nav');
        expect(nav).toBeInTheDocument();

        const links = within(nav!).getAllByRole('link');
        expect(links).toHaveLength(3);

        const hrefs = links.map((l) => l.getAttribute('href'));
        expect(hrefs).toEqual(['/', '/explore', '/mbti']);

        const labels = links.map((l) => l.textContent?.trim());
        expect(labels).toEqual(['아파트 랩', '아파트 탐색', '단지 MBTI']);

        // Zero trace of obsolete /stats, /techno, /office, /admin, /lounge
        expect(within(container).queryByText(/통계/)).toBeNull();
        expect(within(container).queryByText(/테크노/)).toBeNull();
        expect(within(container).queryByText(/사무실/)).toBeNull();
        expect(within(container).queryByText(/관리자/)).toBeNull();
        expect(within(container).queryByText(/라운지/)).toBeNull();
      }
    );

    it.each(adversarialTabs)(
      'MobileDock renders EXACTLY 3 tabs when activeTab is "%s"',
      (activeTab) => {
        const { container } = render(<MobileDock activeTab={activeTab} />);
        const nav = container.querySelector('nav');
        expect(nav).toBeInTheDocument();

        const links = within(nav!).getAllByRole('link');
        expect(links).toHaveLength(3);

        const hrefs = links.map((l) => l.getAttribute('href'));
        expect(hrefs).toEqual(['/', '/explore', '/mbti']);

        const labels = links.map((l) => l.querySelector('span')?.textContent?.trim());
        expect(labels).toEqual(['아파트 랩', '아파트 탐색', '단지 MBTI']);

        // Zero trace of obsolete tabs
        expect(within(container).queryByText(/통계/)).toBeNull();
        expect(within(container).queryByText(/테크노/)).toBeNull();
        expect(within(container).queryByText(/사무실/)).toBeNull();
      }
    );

    it('confirms TABS constant in MobileDock is strictly frozen to 3 canonical tabs', () => {
      expect(TABS).toHaveLength(3);
      expect(TABS.map((t) => t.id)).toEqual(['overview', 'imjang', 'mbti']);
      expect(TABS.map((t) => t.href)).toEqual(['/', '/explore', '/mbti']);
      expect(TABS.map((t) => t.label)).toEqual(['아파트 랩', '아파트 탐색', '단지 MBTI']);
    });
  });

  // =========================================================================
  // Stress Dimension 2: High-Frequency Rapid Tab Switching & Race Conditions
  // =========================================================================
  describe('Dimension 2: High-Frequency Rapid Tab Switching & Race Conditions', () => {
    it('survives 100 rapid click transitions across LoungeHeader tabs', () => {
      const onTabChangeSpy = jest.fn();
      const pushStateSpy = jest.spyOn(window.history, 'pushState').mockImplementation(() => {});

      render(<LoungeHeader activeTab="overview" onTabChange={onTabChangeSpy} />);

      const tab1 = screen.getByRole('link', { name: /아파트 랩/i });
      const tab2 = screen.getByRole('link', { name: /아파트 탐색/i });
      const tab3 = screen.getByRole('link', { name: /단지 MBTI/i });
      const tabs = [tab1, tab2, tab3];
      const expectedIds = ['overview', 'imjang', 'mbti'];
      const expectedHrefs = ['/', '/explore', '/mbti'];

      act(() => {
        for (let i = 0; i < 100; i++) {
          const tabIndex = i % 3;
          fireEvent.click(tabs[tabIndex]);
          expect(onTabChangeSpy).toHaveBeenLastCalledWith(expectedIds[tabIndex]);
          expect(pushStateSpy).toHaveBeenLastCalledWith(null, '', expectedHrefs[tabIndex]);
          expect(mockReplace).toHaveBeenLastCalledWith(expectedHrefs[tabIndex], { scroll: false });
        }
      });

      expect(onTabChangeSpy).toHaveBeenCalledTimes(100);
      expect(pushStateSpy).toHaveBeenCalledTimes(100);
      pushStateSpy.mockRestore();
    });

    it('survives 100 rapid click transitions across MobileDock tabs', () => {
      const onTabClickSpy = jest.fn();
      render(<MobileDock activeTab="overview" onTabClick={onTabClickSpy} />);

      const links = screen.getAllByRole('link');
      expect(links).toHaveLength(3);

      const expectedIds = ['overview', 'imjang', 'mbti'];
      const expectedHrefs = ['/', '/explore', '/mbti'];

      act(() => {
        for (let i = 0; i < 100; i++) {
          const tabIndex = i % 3;
          fireEvent.click(links[tabIndex]);
          expect(onTabClickSpy).toHaveBeenLastCalledWith(expectedIds[tabIndex]);
          expect(mockReplace).toHaveBeenLastCalledWith(expectedHrefs[tabIndex], { scroll: false });
        }
      });

      expect(onTabClickSpy).toHaveBeenCalledTimes(100);
    });

    it('gracefully handles clicks when onTabChange / onTabClick handlers are undefined', () => {
      const pushStateSpy = jest.spyOn(window.history, 'pushState').mockImplementation(() => {});
      
      const { unmount: unmountHeader } = render(<LoungeHeader activeTab="overview" />);
      const headerLinks = screen.getAllByRole('link');
      expect(() => {
        headerLinks.forEach((link) => fireEvent.click(link));
      }).not.toThrow();
      unmountHeader();

      const { unmount: unmountDock } = render(<MobileDock activeTab="overview" />);
      const dockLinks = screen.getAllByRole('link');
      expect(() => {
        dockLinks.forEach((link) => fireEvent.click(link));
      }).not.toThrow();
      unmountDock();

      pushStateSpy.mockRestore();
    });
  });

  // =========================================================================
  // Stress Dimension 3: Hash Routing (#apt=...) & Popstate Stress Testing
  // =========================================================================
  describe('Dimension 3: Hash Routing & Popstate Event Stress Testing', () => {
    it('processes rapid alternating popstate and hashchange events with apartment hash parameters', () => {
      const onTabChangeSpy = jest.fn();
      render(<LoungeHeader activeTab="overview" onTabChange={onTabChangeSpy} />);

      const scenarios = [
        { path: '/', hash: '#apt=동탄역시범우남퍼스트빌', expected: 'overview' },
        { path: '/explore', hash: '#apt=동탄역린스트라우스', expected: 'imjang' },
        { path: '/mbti', hash: '#result=ENFJ', expected: 'mbti' },
        { path: '/', hash: '#report', expected: 'overview' },
        { path: '/explore', hash: '', expected: 'imjang' },
        { path: '/stats', hash: '', expected: 'overview' }, // Legacy /stats falls back to overview
        { path: '/technovalley', hash: '', expected: 'overview' }, // Legacy /techno falls back to overview
        { path: '/unknown-route', hash: '#something', expected: 'overview' },
      ];

      act(() => {
        scenarios.forEach(({ path, hash, expected }) => {
          window.history.pushState({}, '', `${path}${hash}`);
          window.dispatchEvent(new PopStateEvent('popstate'));
          expect(onTabChangeSpy).toHaveBeenLastCalledWith(expected);

          window.dispatchEvent(new HashChangeEvent('hashchange'));
          expect(onTabChangeSpy).toHaveBeenLastCalledWith(expected);
        } );
      });

      expect(onTabChangeSpy).toHaveBeenCalledTimes(scenarios.length * 2);

      // Clean up URL
      window.history.pushState({}, '', '/');
    });
  });

  // =========================================================================
  // Stress Dimension 4: Viewport Resize & Virtual Keyboard Stress Testing
  // =========================================================================
  describe('Dimension 4: Viewport Resize & Virtual Keyboard Oscillations', () => {
    it('survives 50 rapid keyboard open/close oscillations via visualViewport', () => {
      let currentHeight = 800;
      let registeredHandler: (() => void) | null = null;

      const fakeViewport = {
        get height() {
          return currentHeight;
        },
        addEventListener: jest.fn((event, handler) => {
          if (event === 'resize') registeredHandler = handler;
        }),
        removeEventListener: jest.fn((event) => {
          if (event === 'resize') registeredHandler = null;
        }),
      };

      (window as any).visualViewport = fakeViewport;
      window.innerHeight = 800;

      const { container, unmount } = render(<MobileDock activeTab="overview" />);
      const nav = container.querySelector('nav');
      expect(nav).toBeInTheDocument();
      expect(nav).toHaveClass('translate-y-0');

      act(() => {
        for (let i = 0; i < 50; i++) {
          const isOpen = i % 2 === 0;
          currentHeight = isOpen ? 350 : 800; // Keyboard open = 350px (< 800 - 120), closed = 800px
          if (registeredHandler) registeredHandler();
        }
      });

      // After 50 cycles (even iterations end with closed = 800px)
      currentHeight = 800;
      act(() => {
        if (registeredHandler) registeredHandler();
      });
      expect(nav).toHaveClass('translate-y-0');

      unmount();
      expect(fakeViewport.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
      delete (window as any).visualViewport;
    });

    it('renders gracefully when visualViewport is completely absent (desktop/fallback)', () => {
      delete (window as any).visualViewport;
      const { container, unmount } = render(<MobileDock activeTab="overview" />);
      const nav = container.querySelector('nav');
      expect(nav).toBeInTheDocument();
      expect(nav).toHaveClass('translate-y-0');
      unmount();
    });
  });

  // =========================================================================
  // Stress Dimension 5: Rapid Mount / Unmount Cycle Stress
  // =========================================================================
  describe('Dimension 5: Rapid Mount & Unmount Memory/Listener Leak Stress', () => {
    it('mounts and unmounts LoungeHeader 50 times without memory leak or lingering listeners', () => {
      const removePopStateSpy = jest.spyOn(window, 'removeEventListener');

      for (let i = 0; i < 50; i++) {
        const { unmount } = render(<LoungeHeader activeTab="overview" onTabChange={() => {}} />);
        unmount();
      }

      const popStateRemovals = removePopStateSpy.mock.calls.filter(
        ([event]) => event === 'popstate' || event === 'hashchange'
      );
      // 50 mounts = 100 removals (popstate + hashchange for each)
      expect(popStateRemovals.length).toBeGreaterThanOrEqual(100);
      removePopStateSpy.mockRestore();
    });

    it('mounts and unmounts MobileDock 50 times without error', () => {
      for (let i = 0; i < 50; i++) {
        const { unmount } = render(<MobileDock activeTab="overview" onTabClick={() => {}} />);
        unmount();
      }
    });
  });

  // =========================================================================
  // Stress Dimension 6: Server & Page Redirection Invariant Verification
  // =========================================================================
  describe('Dimension 6: Server & Route-Level Redirection Invariants', () => {
    it('next.config.ts enforces permanent 301/308 redirect for /stats and /stats/:path* to /', () => {
      const configPath = path.resolve(process.cwd(), 'next.config.ts');
      const rawContent = fs.readFileSync(configPath, 'utf-8');

      const arrayMatch = rawContent.match(/async\s+redirects\s*\(\)\s*\{\s*return\s*(\[[\s\S]*?\]);\s*\}/);
      expect(arrayMatch).toBeTruthy();

      const fn = new Function(`return ${arrayMatch![1]};`);
      const redirects: any[] = fn();

      const statsRule = redirects.find((r: any) => r.source === '/stats');
      expect(statsRule).toBeDefined();
      expect(statsRule.destination).toBe('/');
      expect(statsRule.permanent).toBe(true);

      const statsWildcardRule = redirects.find((r: any) => r.source === '/stats/:path*');
      expect(statsWildcardRule).toBeDefined();
      expect(statsWildcardRule.destination).toBe('/');
      expect(statsWildcardRule.permanent).toBe(true);
    });

    it('src/app/stats/page.tsx calls permanentRedirect("/")', async () => {
      const { default: StatsPage } = await import('@/app/stats/page');
      const { permanentRedirect } = await import('next/navigation');

      expect(() => {
        StatsPage();
      }).toThrow('NEXT_REDIRECT:/:308');

      expect(permanentRedirect).toHaveBeenCalledWith('/');
    });
  });
});
