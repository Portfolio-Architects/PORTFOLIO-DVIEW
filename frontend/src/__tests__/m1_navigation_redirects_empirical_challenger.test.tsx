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
  redirect: jest.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT: ${url}`);
  }),
}));

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
// Test Suite: Milestone 1 Empirical Navigation & Redirects Challenge
// ---------------------------------------------------------------------------

describe('Milestone 1 Empirical Challenger: Navigation, Cleanup & Redirect Verification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // Dimension 1: Desktop Navigation (LoungeHeader) Rendering & Click Simulation
  // =========================================================================
  describe('Dimension 1: LoungeHeader 4-Tab Architecture & Interaction', () => {
    const expectedTabs = [
      { id: 'overview', label: '아파트 랩', href: '/' },
      { id: 'imjang', label: '아파트 탐색', href: '/explore' },
      { id: 'mbti', label: '단지 MBTI', href: '/mbti' },
      { id: 'guide', label: '부동산 가이드', href: '/guide' },
    ];

    it('renders exactly the 4 canonical tabs with matching labels and href attributes', () => {
      const { container } = render(<LoungeHeader activeTab="overview" />);
      const navElement = within(container).getByRole('navigation', { name: '메인 메뉴' });
      const links = within(navElement).getAllByRole('link');

      expect(links).toHaveLength(4);
      expectedTabs.forEach((tab, index) => {
        expect(links[index]).toHaveTextContent(tab.label);
        expect(links[index]).toHaveAttribute('href', tab.href);
      });
    });

    it('confirms "테크노 랩" and "사무실 탐색" are 100% removed from LoungeHeader DOM', () => {
      const { container } = render(<LoungeHeader activeTab="overview" />);
      
      // Text assertions
      expect(within(container).queryByText(/테크노/)).toBeNull();
      expect(within(container).queryByText(/사무실/)).toBeNull();
      expect(within(container).queryByText(/technovalley/i)).toBeNull();
      expect(within(container).queryByText(/office/i)).toBeNull();

      // Role/link assertions
      expect(within(container).queryByRole('link', { name: /테크노/i })).toBeNull();
      expect(within(container).queryByRole('link', { name: /사무실/i })).toBeNull();

      // Href pattern assertions
      const allHrefs = within(container)
        .getAllByRole('link')
        .map((el) => el.getAttribute('href'));
      expect(allHrefs.some((h) => h?.includes('techno') || h?.includes('office'))).toBe(false);
    });

    it('simulates click events on all 4 tabs and triggers onTabChange & router.replace correctly', () => {
      const onTabChangeSpy = jest.fn();
      const pushStateSpy = jest.spyOn(window.history, 'pushState').mockImplementation(() => {});

      render(<LoungeHeader activeTab="overview" onTabChange={onTabChangeSpy} />);

      const tab1 = screen.getByRole('link', { name: /아파트 랩/i });
      const tab2 = screen.getByRole('link', { name: /아파트 탐색/i });
      const tab3 = screen.getByRole('link', { name: /단지 MBTI/i });
      const tab4 = screen.getByRole('link', { name: /부동산 가이드/i });

      // Click Tab 1 ('아파트 랩')
      fireEvent.click(tab1);
      expect(onTabChangeSpy).toHaveBeenLastCalledWith('overview');
      expect(mockReplace).toHaveBeenLastCalledWith('/', { scroll: false });
      expect(pushStateSpy).toHaveBeenLastCalledWith(null, '', '/');

      // Click Tab 2 ('아파트 탐색')
      fireEvent.click(tab2);
      expect(onTabChangeSpy).toHaveBeenLastCalledWith('imjang');
      expect(mockReplace).toHaveBeenLastCalledWith('/explore', { scroll: false });
      expect(pushStateSpy).toHaveBeenLastCalledWith(null, '', '/explore');

      // Click Tab 3 ('단지 MBTI')
      fireEvent.click(tab3);
      expect(onTabChangeSpy).toHaveBeenLastCalledWith('mbti');
      expect(mockReplace).toHaveBeenLastCalledWith('/mbti', { scroll: false });
      expect(pushStateSpy).toHaveBeenLastCalledWith(null, '', '/mbti');

      // Click Tab 4 ('부동산 가이드')
      fireEvent.click(tab4);
      expect(onTabChangeSpy).toHaveBeenLastCalledWith('guide');
      expect(mockReplace).toHaveBeenLastCalledWith('/guide', { scroll: false });
      expect(pushStateSpy).toHaveBeenLastCalledWith(null, '', '/guide');

      pushStateSpy.mockRestore();
    });

    it('updates activeTab visual highlighting dynamically across all 4 tabs', () => {
      const { rerender } = render(<LoungeHeader activeTab="overview" />);
      
      let tab1 = screen.getByRole('link', { name: /아파트 랩/i });
      let tab2 = screen.getByRole('link', { name: /아파트 탐색/i });
      let tab3 = screen.getByRole('link', { name: /단지 MBTI/i });
      let tab4 = screen.getByRole('link', { name: /부동산 가이드/i });

      expect(tab1).toHaveClass('text-emerald-700');
      expect(tab1).toHaveClass('bg-emerald-50');
      expect(tab2).not.toHaveClass('bg-emerald-50');
      expect(tab3).not.toHaveClass('bg-emerald-50');
      expect(tab4).not.toHaveClass('bg-emerald-50');

      // Switch to 'imjang'
      rerender(<LoungeHeader activeTab="imjang" />);
      tab1 = screen.getByRole('link', { name: /아파트 랩/i });
      tab2 = screen.getByRole('link', { name: /아파트 탐색/i });
      tab3 = screen.getByRole('link', { name: /단지 MBTI/i });
      tab4 = screen.getByRole('link', { name: /부동산 가이드/i });

      expect(tab2).toHaveClass('text-emerald-700');
      expect(tab2).toHaveClass('bg-emerald-50');
      expect(tab1).not.toHaveClass('bg-emerald-50');
      expect(tab3).not.toHaveClass('bg-emerald-50');
      expect(tab4).not.toHaveClass('bg-emerald-50');

      // Switch to 'mbti'
      rerender(<LoungeHeader activeTab="mbti" />);
      tab1 = screen.getByRole('link', { name: /아파트 랩/i });
      tab2 = screen.getByRole('link', { name: /아파트 탐색/i });
      tab3 = screen.getByRole('link', { name: /단지 MBTI/i });
      tab4 = screen.getByRole('link', { name: /부동산 가이드/i });

      expect(tab3).toHaveClass('text-emerald-700');
      expect(tab3).toHaveClass('bg-emerald-50');
      expect(tab1).not.toHaveClass('bg-emerald-50');
      expect(tab2).not.toHaveClass('bg-emerald-50');
      expect(tab4).not.toHaveClass('bg-emerald-50');

      // Switch to 'guide'
      rerender(<LoungeHeader activeTab="guide" />);
      tab1 = screen.getByRole('link', { name: /아파트 랩/i });
      tab2 = screen.getByRole('link', { name: /아파트 탐색/i });
      tab3 = screen.getByRole('link', { name: /단지 MBTI/i });
      tab4 = screen.getByRole('link', { name: /부동산 가이드/i });

      expect(tab4).toHaveClass('text-emerald-700');
      expect(tab4).toHaveClass('bg-emerald-50');
      expect(tab1).not.toHaveClass('bg-emerald-50');
      expect(tab2).not.toHaveClass('bg-emerald-50');
      expect(tab3).not.toHaveClass('bg-emerald-50');
    });

    it('handles popstate browser navigation events for /mbti and legacy paths', () => {
      const onTabChangeSpy = jest.fn();
      render(<LoungeHeader activeTab="overview" onTabChange={onTabChangeSpy} />);

      // Simulate popstate to /mbti using window.history.pushState
      act(() => {
        window.history.pushState({}, '', '/mbti');
        window.dispatchEvent(new PopStateEvent('popstate'));
      });
      expect(onTabChangeSpy).toHaveBeenLastCalledWith('mbti');

      // Simulate popstate to /explore
      act(() => {
        window.history.pushState({}, '', '/explore');
        window.dispatchEvent(new PopStateEvent('popstate'));
      });
      expect(onTabChangeSpy).toHaveBeenLastCalledWith('imjang');

      // Simulate popstate to /guide
      act(() => {
        window.history.pushState({}, '', '/guide');
        window.dispatchEvent(new PopStateEvent('popstate'));
      });
      expect(onTabChangeSpy).toHaveBeenLastCalledWith('guide');

      // Simulate popstate to legacy route /technovalley -> falls back to 'overview'
      act(() => {
        window.history.pushState({}, '', '/technovalley');
        window.dispatchEvent(new PopStateEvent('popstate'));
      });
      expect(onTabChangeSpy).toHaveBeenLastCalledWith('overview');

      // Reset url back to /
      window.history.pushState({}, '', '/');
    });
  });

  // =========================================================================
  // Dimension 2: Mobile Dock Navigation (MobileDock) Rendering & Click Simulation
  // =========================================================================
  describe('Dimension 2: MobileDock 3-Tab Architecture & Interaction', () => {
    it('declares and renders exactly 3 canonical tabs in MobileDock TABS export', () => {
      expect(TABS).toHaveLength(3);
      expect(TABS.map((t) => t.id)).toEqual(['overview', 'imjang', 'mbti']);
      expect(TABS.map((t) => t.label)).toEqual(['아파트 랩', '아파트 탐색', '단지 MBTI']);
      expect(TABS.map((t) => t.href)).toEqual(['/', '/explore', '/mbti']);
    });

    it('renders all 3 tabs in DOM and confirms "테크노 랩" and "사무실 탐색" are 100% removed', () => {
      const { container } = render(<MobileDock activeTab="overview" />);
      const dockNav = container.querySelector('nav');
      expect(dockNav).toBeInTheDocument();

      const links = within(dockNav!).getAllByRole('link');
      expect(links).toHaveLength(3);

      expect(within(dockNav!).queryByText(/테크노/)).toBeNull();
      expect(within(dockNav!).queryByText(/사무실/)).toBeNull();
      expect(within(dockNav!).queryByText(/technovalley/i)).toBeNull();
      expect(within(dockNav!).queryByText(/office/i)).toBeNull();

      // Role/link assertions
      expect(within(dockNav!).queryByRole('link', { name: /테크노/i })).toBeNull();
      expect(within(dockNav!).queryByRole('link', { name: /사무실/i })).toBeNull();
    });

    it('simulates click events on all MobileDock tabs and calls onTabClick', () => {
      const onTabClickSpy = jest.fn();
      render(<MobileDock activeTab="overview" onTabClick={onTabClickSpy} />);

      const links = screen.getAllByRole('link');
      // Tab 0: 아파트 랩
      fireEvent.click(links[0]);
      expect(onTabClickSpy).toHaveBeenLastCalledWith('overview');
      expect(mockReplace).toHaveBeenLastCalledWith('/', { scroll: false });

      // Tab 1: 아파트 탐색
      fireEvent.click(links[1]);
      expect(onTabClickSpy).toHaveBeenLastCalledWith('imjang');
      expect(mockReplace).toHaveBeenLastCalledWith('/explore', { scroll: false });

      // Tab 2: 단지 MBTI
      fireEvent.click(links[2]);
      expect(onTabClickSpy).toHaveBeenLastCalledWith('mbti');
      expect(mockReplace).toHaveBeenLastCalledWith('/mbti', { scroll: false });
    });

    it('stress tests rapid tab cycling (30 rapid clicks) across MobileDock without errors', () => {
      const onTabClickSpy = jest.fn();
      render(<MobileDock activeTab="overview" onTabClick={onTabClickSpy} />);

      const links = screen.getAllByRole('link');
      act(() => {
        for (let i = 0; i < 30; i++) {
          fireEvent.click(links[i % links.length]);
        }
      });

      expect(onTabClickSpy).toHaveBeenCalledTimes(30);
    });

    it('hides dock when viewport height shrinks significantly (on-screen keyboard)', () => {
      const { container } = render(<MobileDock activeTab="overview" />);
      const nav = container.querySelector('nav');
      expect(nav).not.toHaveClass('translate-y-full');

      // Emulate visualViewport resize
      const fakeViewport = {
        height: 300,
        addEventListener: jest.fn((event, handler) => {
          (fakeViewport as any)._handler = handler;
        }),
        removeEventListener: jest.fn(),
      };

      (window as any).visualViewport = fakeViewport;
      const { container: rerenderedContainer } = render(<MobileDock activeTab="overview" />);
      const activeNav = rerenderedContainer.querySelector('nav');

      act(() => {
        if ((fakeViewport as any)._handler) {
          (fakeViewport as any)._handler();
        }
      });

      expect(activeNav).toHaveClass('translate-y-full');
      delete (window as any).visualViewport;
    });
  });

  // =========================================================================
  // Dimension 3: Server Redirect Configurations in next.config.ts
  // =========================================================================
  describe('Dimension 3: Server Redirect Verification in next.config.ts', () => {
    let redirects: any[] = [];
    let rawContent: string;

    beforeAll(() => {
      const configPath = path.resolve(process.cwd(), 'next.config.ts');
      rawContent = fs.readFileSync(configPath, 'utf-8');

      // Extract and evaluate redirects array literal directly from source
      const arrayMatch = rawContent.match(/async\s+redirects\s*\(\)\s*\{\s*return\s*(\[[\s\S]*?\]);\s*\}/);
      if (!arrayMatch) {
        throw new Error('Could not find async redirects() return array in next.config.ts');
      }
      const fn = new Function(`return ${arrayMatch[1]};`);
      redirects = fn();
    });

    it('next.config.ts contains async redirects() definition returning array', () => {
      expect(rawContent).toContain('async redirects()');
      expect(Array.isArray(redirects)).toBe(true);
      expect(redirects.length).toBeGreaterThanOrEqual(4);
    });

    it('does not redirect /technovalley in next.config.ts (restored as Phase 3 SSR B2B Hub)', () => {
      const technovalleyRule = redirects.find((r: any) => r.source === '/technovalley');
      expect(technovalleyRule).toBeUndefined();
    });

    it('has a 307 temporary redirect rule for /techno -> /', () => {
      const technoRule = redirects.find((r: any) => r.source === '/techno');
      expect(technoRule).toBeDefined();
      expect(technoRule.destination).toBe('/');
      expect(technoRule.permanent).toBe(false); // 307 temporary redirect
    });

    it('has a 307 redirect rule for /overview with query param tab=office -> /', () => {
      const officeRule = redirects.find((r: any) => r.source === '/overview');
      expect(officeRule).toBeDefined();
      expect(officeRule.destination).toBe('/');
      expect(officeRule.permanent).toBe(false);
      expect(officeRule.has).toEqual([
        {
          type: 'query',
          key: 'tab',
          value: 'office',
        },
      ]);
    });

    it('confirms no redirect points to obsolete /technovalley or /techno destinations', () => {
      const invalidDestinations = redirects.filter((r: any) =>
        r.destination.includes('/technovalley') || r.destination.includes('/techno')
      );
      expect(invalidDestinations).toHaveLength(0);
    });
  });

  // =========================================================================
  // Dimension 4: Route-Level & Page-Level SSR B2B Hub (Phase 3)
  // =========================================================================
  describe('Dimension 4: Page-Level SSR Rendering for /technovalley', () => {
    it('renders TechnoValleyPage SSR B2B catalog without executing redirect("/")', async () => {
      const { default: TechnoValleyPage } = await import('@/app/technovalley/page');
      const { redirect } = await import('next/navigation');

      const jsx = await TechnoValleyPage();
      expect(jsx).toBeDefined();
      expect(redirect).not.toHaveBeenCalled();
    });
  });
});
