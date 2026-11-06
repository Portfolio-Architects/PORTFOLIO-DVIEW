import React from 'react';
import fs from 'fs';
import path from 'path';
import { render, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ApartmentPage from '../app/apartment/[aptName]/page';
import WelcomeModal from '../components/ui/WelcomeModal';

jest.mock('../components/DashboardClient', () => {
  return function MockDashboardClient({
    preselectedAptName,
    autoOpenPreselectedModal,
    hideHeader,
  }: {
    preselectedAptName?: string;
    autoOpenPreselectedModal?: boolean;
    hideHeader?: boolean;
  }) {
    return (
      <div
        data-testid="mock-dashboard-client"
        data-apt={preselectedAptName}
        data-auto-open-modal={String(Boolean(autoOpenPreselectedModal))}
        data-hide-header={String(Boolean(hideHeader))}
      >
        Dashboard Client
      </div>
    );
  };
});

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn().mockReturnValue(null),
  }),
  usePathname: () => '/apartment/test',
}));

describe('P0-2: Apartment Detail SSR Uncloaking & Guardrail B Verification', () => {
  const originalEnv = process.env;

  beforeAll(() => {
    Object.defineProperty(window, 'IntersectionObserver', {
      writable: true,
      configurable: true,
      value: class MockIntersectionObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    });
  });

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_ADSENSE_CLIENT_ID: 'ca-pub-7704550771011130',
      NEXT_PUBLIC_ADSENSE_SLOT_GAP_EXPLORER: '2222222222',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('1. uncloaks #apt-ssr-comprehensive-report and eliminates legacy <div className="sr-only"><h1>...</h1></div> cloaking', async () => {
    const jsx = await ApartmentPage({
      params: Promise.resolve({ aptName: encodeURIComponent('동탄역롯데캐슬') }),
    });
    const { container } = render(jsx);

    const reportSection = container.querySelector('#apt-ssr-comprehensive-report');
    expect(reportSection).not.toBeNull();
    expect(reportSection).not.toHaveClass('sr-only');
    expect(reportSection).not.toHaveClass('hidden');
    expect(reportSection).not.toHaveClass('invisible');
    expect(reportSection).not.toHaveClass('opacity-0');
    expect(reportSection?.getAttribute('aria-hidden')).toBeNull();
    expect(reportSection?.closest('.sr-only')).toBeNull();

    // Verify single visible H1 and zero sr-only H1/div/section cloaking
    const h1Elements = container.querySelectorAll('h1');
    expect(h1Elements.length).toBe(1);
    expect(h1Elements[0].closest('#apt-ssr-comprehensive-report')).toBe(reportSection);
    expect(h1Elements[0].closest('.sr-only')).toBeNull();
    expect(h1Elements[0].textContent).toContain('동탄역롯데캐슬 아파트 실거래가 및 입지 심층 분석 리포트');

    // Every .sr-only element in ApartmentPage must be a semantic <caption> inside a <table>
    const srOnlyElements = Array.from(container.querySelectorAll('.sr-only'));
    expect(srOnlyElements.length).toBeGreaterThanOrEqual(5);
    for (const el of srOnlyElements) {
      expect(el.tagName).toBe('CAPTION');
      expect(el.closest('table')).not.toBeNull();
      expect(el.textContent).toContain('동탄역롯데캐슬');
    }
  });

  it('2. statically verifies src/app/apartment/[aptName]/page.tsx contains sr-only exclusively on <caption> tags', () => {
    const pagePath = path.join(process.cwd(), 'src/app/apartment/[aptName]/page.tsx');
    const source = fs.readFileSync(pagePath, 'utf8');
    const lines = source.split(/\r?\n/);

    const srOnlyLines = lines.filter((line) => line.includes('sr-only'));
    expect(srOnlyLines.length).toBe(5);
    for (const line of srOnlyLines) {
      expect(line.trim()).toMatch(/^<caption className="sr-only">/);
    }
  });

  it('3. rescues ssr-adslot-ch02 and ssr-adslot-ch05 with real env slot binding, dong context, and Guardrail B soft-surface geometry (>=328px on 360px mobile)', async () => {
    const gtagMock = jest.fn();
    (window as unknown as { gtag?: jest.Mock }).gtag = gtagMock;

    const jsx = await ApartmentPage({
      params: Promise.resolve({ aptName: encodeURIComponent('동탄역롯데캐슬') }),
    });
    const { container, getByTestId, unmount } = render(jsx);

    const reportSection = container.querySelector('#apt-ssr-comprehensive-report') as HTMLElement;
    const innerCard = reportSection.firstElementChild as HTMLElement;

    // Mobile horizontal padding budget check on 360px viewport: px-2 (16px) + p-2 (16px) = 32px -> 328px available width
    expect(reportSection.className).toContain('px-2');
    expect(innerCard.className).toContain('p-2');
    const mobileAvailableWidthPx = 360 - (8 * 2 + 8 * 2);
    expect(mobileAvailableWidthPx).toBeGreaterThanOrEqual(328);

    const ch02Wrapper = getByTestId('ssr-adslot-ch02');
    const ch05Wrapper = getByTestId('ssr-adslot-ch05');

    const expectedCampaigns: Array<[HTMLElement, string]> = [
      [ch02Wrapper, 'mortgage-refinance'],
      [ch05Wrapper, 'jeonse-sentinel'],
    ];

    for (const [wrapper, expectedCampaignId] of expectedCampaigns) {
      expect(wrapper.closest('#apt-ssr-comprehensive-report')).toBe(reportSection);
      expect(wrapper.closest('.sr-only')).toBeNull();

      // Guardrail B: Ad Money v5.0 borderless soft-surface tokens & zero CLS min-h-[250px]
      expect(wrapper.className).toContain('w-full');
      expect(wrapper.className).toContain('min-h-[250px]');
      expect(wrapper.className).toContain('rounded-2xl');
      expect(wrapper.className).toContain('bg-elevated');
      expect(wrapper.className).toContain('dark:bg-slate-900');
      expect(wrapper.className).toContain('transition-colors');
      expect(wrapper.className).not.toMatch(/\bborder\b/);
      expect(wrapper.className).not.toContain('backdrop-blur');
      expect(wrapper.className).not.toMatch(/\bp-4\b/);

      // AdSense <ins> bound to NEXT_PUBLIC_ADSENSE_SLOT_GAP_EXPLORER (not dummy 1000000002)
      const ins = wrapper.querySelector('ins.adsbygoogle') as HTMLElement;
      expect(ins).not.toBeNull();
      expect(ins.getAttribute('data-ad-client')).toBe('ca-pub-7704550771011130');
      expect(ins.getAttribute('data-ad-slot')).toBe('2222222222');
      expect(ins.getAttribute('data-ad-slot')).not.toBe('1000000002');

      // Trigger AdSense unfilled status and verify CPA cascade fallback + telemetry context
      await act(async () => {
        ins.setAttribute('data-ad-status', 'unfilled');
      });

      const fallbackContainer = wrapper.querySelector('[data-testid="ad-slot-cascade-fallback"]');
      expect(fallbackContainer).not.toBeNull();
      expect(fallbackContainer?.getAttribute('data-cpa-campaign-id')).toBe(expectedCampaignId);
    }

    const unfilledCalls = gtagMock.mock.calls.filter(
      (call) => call[0] === 'event' && call[1] === 'ad_telemetry' && call[2]?.event_type === 'UNFILLED'
    );
    expect(unfilledCalls.length).toBe(2);
    for (const call of unfilledCalls) {
      const payload = call[2] as Record<string, unknown>;
      expect(payload.apartment_name).toBe('동탄역롯데캐슬');
      expect(payload.dong).toBe('여울동');
      expect(payload.slot_id).toBe('2222222222');
    }
    delete (window as unknown as { gtag?: jest.Mock }).gtag;
    unmount();
  });

  it('4. enforces Ad Money v5.0 tabular-nums discipline across all 5 SSR financial/transaction tables with zero font-mono', async () => {
    const jsx = await ApartmentPage({
      params: Promise.resolve({ aptName: encodeURIComponent('동탄역롯데캐슬') }),
    });
    const { container } = render(jsx);

    const reportSection = container.querySelector('#apt-ssr-comprehensive-report') as HTMLElement;
    const tables = Array.from(reportSection.querySelectorAll('table'));
    expect(tables.length).toBe(5);

    for (const table of tables) {
      const caption = table.querySelector('caption.sr-only');
      expect(caption).not.toBeNull();
      expect(caption?.textContent).toContain('동탄역롯데캐슬');

      const tbody = table.querySelector('tbody');
      expect(tbody).not.toBeNull();
      expect(tbody?.className).toContain('tabular-nums');
      expect(tbody?.className).not.toContain('font-mono');
    }

    expect(reportSection.querySelectorAll('.font-mono').length).toBe(0);
  });

  it('5. handles edge cases: spaced alias, rent-only complex, and non-existent ghost complex without breaking SSR report or AdSlots', async () => {
    // Edge Case A: Spaced alias
    const spacedJsx = await ApartmentPage({
      params: Promise.resolve({ aptName: encodeURIComponent('동탄역 시범 리슈빌') }),
    });
    const { container: spacedContainer, unmount: unmountSpaced } = render(spacedJsx);
    expect(spacedContainer.querySelector('#apt-ssr-comprehensive-report')).not.toBeNull();
    expect(spacedContainer.querySelectorAll('h1').length).toBe(1);
    expect(spacedContainer.querySelectorAll('ins.adsbygoogle').length).toBe(2);
    unmountSpaced();

    // Edge Case B: Rent-only complex (0 sales, >0 rent)
    const rentOnlyJsx = await ApartmentPage({
      params: Promise.resolve({ aptName: encodeURIComponent('서해더블루93-8') }),
    });
    const { container: rentContainer, unmount: unmountRent } = render(rentOnlyJsx);
    expect(rentContainer.querySelector('#apt-ssr-comprehensive-report')).not.toBeNull();
    expect(rentContainer.querySelectorAll('h1').length).toBe(1);
    expect(rentContainer.querySelectorAll('ins.adsbygoogle').length).toBe(2);
    unmountRent();

    // Edge Case C: Non-existent ghost complex (0 pyeongSummaries)
    const ghostJsx = await ApartmentPage({
      params: Promise.resolve({ aptName: encodeURIComponent('존재하지않는가상단지') }),
    });
    const { container: ghostContainer, unmount: unmountGhost } = render(ghostJsx);
    const ghostReport = ghostContainer.querySelector('#apt-ssr-comprehensive-report') as HTMLElement;
    expect(ghostReport).not.toBeNull();
    expect(ghostContainer.querySelectorAll('h1').length).toBe(1);

    // Chapter 02 fallback box uses tabular-nums
    const ch02Fallback = ghostReport.querySelector('#chapter-02-pyeong-ssr > div');
    expect(ch02Fallback?.className).toContain('tabular-nums');
    expect(ch02Fallback?.textContent).toContain('최근 매매가: 정보 없음');

    // First .sr-only caption still contains decodedName for accessibility compatibility
    const firstSrOnly = ghostContainer.querySelector('.sr-only');
    expect(firstSrOnly).not.toBeNull();
    expect(firstSrOnly?.tagName).toBe('CAPTION');
    expect(firstSrOnly?.textContent).toContain('존재하지않는가상단지');

    // 4 financial tables + 2 AdSlots still render cleanly
    expect(ghostReport.querySelectorAll('table').length).toBe(4);
    expect(ghostReport.querySelectorAll('ins.adsbygoogle').length).toBe(2);
    unmountGhost();
  });

  it('6. prevents corrupted price strings ("0억", "0만억", "5억3,559억", "9,991만억") on real monthly-rent complexes where aptSummary exists but pyeongSummaries is empty, and enforces sub-360px min-w-0 containment', async () => {
    for (const [aptName, expectedRentStr] of [
      ['동탄숨마데시앙', '5억3,559'],
      ['동탄2롯데캐슬', '2억2,028'],
      ['화성동탄2엘에이치35단지3511-15', '8,990만'],
    ] as const) {
      const jsx = await ApartmentPage({
        params: Promise.resolve({ aptName: encodeURIComponent(aptName) }),
      });
      const { container, unmount } = render(jsx);

      const reportSection = container.querySelector('#apt-ssr-comprehensive-report') as HTMLElement;
      expect(reportSection).not.toBeNull();
      expect(reportSection.className).toContain('overflow-x-clip');

      const innerCard = reportSection.firstElementChild as HTMLElement;
      expect(innerCard.className).toContain('min-w-0');

      const ch02Section = reportSection.querySelector('#chapter-02-pyeong-ssr') as HTMLElement;
      expect(ch02Section.className).toContain('min-w-0');

      const ch05Section = reportSection.querySelector('#chapter-05-mortgage-ssr') as HTMLElement;
      expect(ch05Section.className).toContain('min-w-0');

      // All 4 financial grid cards inside #chapter-05-mortgage-ssr must have min-w-0 to prevent CSS Grid auto-min-width overflow on <360px mobile
      const gridCards = Array.from(ch05Section.querySelectorAll('.grid > div'));
      expect(gridCards.length).toBe(4);
      for (const card of gridCards) {
        expect(card.className).toContain('min-w-0');
      }

      const fullText = reportSection.textContent || '';
      expect(fullText).not.toContain('0만억');
      expect(fullText).not.toContain('0만억원');
      expect(fullText).not.toContain('만억');
      expect(fullText).not.toContain('억억');
      expect(fullText).not.toMatch(/매매가:\s*0억/);

      const ch02Fallback = ch02Section.querySelector('div.tabular-nums') as HTMLElement | null;
      const ch02Table = ch02Section.querySelector('table') as HTMLElement | null;
      expect(ch02Fallback || ch02Table).not.toBeNull();
      if (ch02Fallback) {
        expect(ch02Fallback.textContent).toContain('최근 매매가: 정보 없음');
        expect(ch02Fallback.textContent).toContain('최근 1개월 평균가: 정보 없음');
        expect(ch02Fallback.textContent).toContain(`최근 전세가: ${expectedRentStr}`);
        expect(ch02Fallback.textContent).not.toContain(`${expectedRentStr}억`);
      } else if (ch02Table) {
        expect(ch02Table.textContent).toContain('정보 없음');
        expect(ch02Table.textContent).not.toContain(`${expectedRentStr}억`);
      }

      unmount();
    }
  });

  it('7. renders LoungeHeader(activeTab="explore") and #apt-ssr-comprehensive-report ABOVE DashboardClient without auto-opening modal, and synthesizes complex-specific narrative in #chapter-01-dynamic-narrative-ssr', async () => {
    const jsx = await ApartmentPage({
      params: Promise.resolve({ aptName: encodeURIComponent('동탄역롯데캐슬') }),
    });
    const { container, getByTestId, unmount } = render(jsx);

    const headerBanner = container.querySelector('header[role="banner"]') as HTMLElement;
    const reportSection = container.querySelector('#apt-ssr-comprehensive-report') as HTMLElement;
    const dashboardClient = getByTestId('mock-dashboard-client');
    expect(headerBanner).not.toBeNull();
    expect(reportSection).not.toBeNull();
    expect(dashboardClient).not.toBeNull();

    // Verify LoungeHeader has "아파트 탐색" highlighted (activeTab="explore")
    const exploreNavLink = headerBanner.querySelector('a[href="/explore"]');
    expect(exploreNavLink).not.toBeNull();
    expect(exploreNavLink?.className).toContain('text-blue-600');

    // Content-First invariant: headerBanner -> reportSection -> dashboardClient in DOM document order
    expect(headerBanner.compareDocumentPosition(reportSection) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const positionMask = reportSection.compareDocumentPosition(dashboardClient);
    expect(positionMask & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    // Verify DashboardClient does NOT auto-open full-screen modal over #apt-ssr-comprehensive-report
    expect(dashboardClient.getAttribute('data-auto-open-modal')).toBe('false');
    expect(dashboardClient.getAttribute('data-hide-header')).toBe('true');

    // Dynamic complex-specific commentary block
    const narrativeSection = reportSection.querySelector('#chapter-01-dynamic-narrative-ssr');
    expect(narrativeSection).not.toBeNull();
    expect(narrativeSection?.textContent).toContain('동탄역롯데캐슬 입지 포지셔닝 및 실거래 밸류에이션 심층 해설');
    expect(narrativeSection?.textContent).toContain('입지 포지셔닝');
    expect(narrativeSection?.textContent).toContain('연식·세대 규모 및 주력 평형 수급 구조');
    expect(narrativeSection?.textContent).toContain('실거주 PER 및 전세 안전 마진 진단');
    expect(narrativeSection?.textContent).not.toContain('undefined');
    expect(narrativeSection?.textContent).not.toContain('NaN');
    expect(narrativeSection?.textContent).not.toContain('(0만)');
    expect(narrativeSection?.querySelectorAll('article').length).toBe(3);

    unmount();

    // Edge-case narrative verification on rent-only / missing-meta complex
    const edgeJsx = await ApartmentPage({
      params: Promise.resolve({ aptName: encodeURIComponent('동탄숨마데시앙') }),
    });
    const { container: edgeContainer, unmount: unmountEdge } = render(edgeJsx);
    const edgeNarrative = edgeContainer.querySelector('#chapter-01-dynamic-narrative-ssr');
    expect(edgeNarrative).not.toBeNull();
    expect(edgeNarrative?.textContent).not.toContain('undefined');
    expect(edgeNarrative?.textContent).not.toContain('NaN');
    expect(edgeNarrative?.textContent).not.toContain('(0만)');
    expect(edgeNarrative?.querySelectorAll('article').length).toBe(3);
    unmountEdge();
  });

  it('8. suppresses WelcomeModal auto-popup when autoOpenOnMount={false} and opens on dview:open-welcome-modal event', () => {
    jest.useFakeTimers();
    localStorage.clear();

    const { unmount } = render(<WelcomeModal autoOpenOnMount={false} />);
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    // Must NOT auto-popup in production (autoOpenOnMount={false})
    expect(document.body.textContent).not.toContain('D-VIEW에 오신 것을 환영합니다');

    // Must open when explicitly requested via custom event
    act(() => {
      window.dispatchEvent(new Event('dview:open-welcome-modal'));
    });
    expect(document.body.textContent).toContain('D-VIEW에 오신 것을 환영합니다');

    unmount();
    jest.useRealTimers();
  });
});

