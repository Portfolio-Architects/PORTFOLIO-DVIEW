import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NextRequest } from 'next/server';
import { proxy, config as proxyConfig } from '@/proxy';
import { resolveTechnoValleyJisanCanonicalSlug } from '@/lib/utils/jisanSlugResolver';
import { recommendDviewSeoAction } from '@/lib/services/searchConsoleCtr';
import {
  getTechnoValleyJisanList,
  resolveTechnoValleyJisan,
  buildTechnoValleySeoMetadata,
  formatTechnoValleyJisanSlug,
} from '@/lib/services/apartmentPageService';
import TechnoValleyPage from '@/app/technovalley/page';
import TechnoValleyDetailPage from '@/app/technovalley/[slug]/page';
import TechnoValleyClient from '@/app/technovalley/TechnoValleyClient';
import TechnoValleyDashboard from '@/components/macro/TechnoValleyDashboard';
import TechnoValleyBounceDefenseBridge from '@/components/technovalley/TechnoValleyBounceDefenseBridge';
import { CPA_CAMPAIGN_CATALOG } from '@/lib/ads/cascadeFallback';
import * as analyticsModule from '@/lib/utils/analytics';
import { SettingsProvider } from '@/contexts/SettingsContext';

jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: '100%', height: '100%' }}>{children}</div>
    ),
    PieChart: ({ children }: { children: React.ReactNode }) => <svg>{children}</svg>,
    Pie: ({ children }: { children: React.ReactNode }) => <g>{children}</g>,
    Cell: () => <path />,
    LineChart: ({ children }: { children: React.ReactNode }) => <svg>{children}</svg>,
    Line: () => <g />,
    XAxis: () => <g />,
    YAxis: () => <g />,
    CartesianGrid: () => <g />,
    Tooltip: () => <div />,
  };
});

jest.mock('swr', () =>
  jest.fn((key: string) => {
    if (key === '/api/technovalley/industry-distribution') {
      return { data: { success: true, data: [] }, isValidating: false, isLoading: false };
    }
    if (key === '/api/technovalley/trend') {
      return { data: { success: true, data: [] }, isValidating: false, isLoading: false };
    }
    if (key === '/api/technovalley/jisan-status') {
      return {
        data: { total: 0, completedCount: 0, underConstructionCount: 0, notStartedCount: 0, centers: [] },
        isValidating: false,
        isLoading: false,
      };
    }
    return { data: null, isValidating: false, isLoading: false };
  })
);

describe('TechnoValley Track 1 (?jisan= Bounce Defense & SERP CTR) + Track 2 (Desktop B2B Simulator & CPA)', () => {
  const originalFetch = window.fetch;

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
    window.fetch = originalFetch;
    window.history.replaceState({}, '', '/');
    window.__dviewPendingRelocationSim = undefined;
  });

  it('resolves all high-bounce GSC/GA4 aliases deterministically across Edge 308 proxy, SSR metadata, and client resolver while blocking untrusted/oversized inputs', async () => {
    const jisanList = await getTechnoValleyJisanList();

    const aliasExpectations: Array<[string, string]> = [
      ['동탄금강펜테리움 IX타워', '동탄금강펜테리움 IX타워'],
      ['금강펜테리움 IX타워', '동탄금강펜테리움 IX타워'],
      ['금강 IX타워', '동탄금강펜테리움 IX타워'],
      ['동탄테크노밸리 금강펜테리움 IX타워', '동탄금강펜테리움 IX타워'],
      ['금강펜테리움9타워', '동탄금강펜테리움 IX타워'],
      ['에이팩시티', '에이팩시티'],
      ['동탄 에이팩시티', '에이팩시티'],
      ['동탄테크노밸리 에이팩시티', '에이팩시티'],
      ['이든 앤 스페이스', '이든 앤 스페이스'],
      ['이든앤스페이스', '이든 앤 스페이스'],
      ['동탄 이든 앤 스페이스', '이든 앤 스페이스'],
      ['이든 스페이스', '이든 앤 스페이스'],
      ['동탄IT타워', '동탄IT타워'],
      ['동탄 IT타워', '동탄IT타워'],
      ['동탄 아이티타워', '동탄IT타워'],
      ['동탄비즈타워', '동탄비즈타워'],
      ['동탄 비즈타워', '동탄비즈타워'],
      ['(주)유앤미개발', '(주)유앤미개발'],
    ];

    for (const [queryAlias, expectedCanonicalName] of aliasExpectations) {
      const expectedSlug = formatTechnoValleyJisanSlug(expectedCanonicalName);
      expect(resolveTechnoValleyJisan(jisanList, queryAlias)?.name).toBe(expectedCanonicalName);
      expect(resolveTechnoValleyJisanCanonicalSlug(queryAlias)).toBe(expectedSlug);

      const req = new NextRequest(
        `https://dongtanview.com/technovalley?jisan=${encodeURIComponent(queryAlias)}`
      );
      const res = await proxy(req);
      expect(res.status).toBe(308);
      expect(res.headers.get('location')).toBe(
        `https://dongtanview.com/technovalley/${encodeURIComponent(expectedSlug)}`
      );
    }

    // Plus-joined URL parameter (?jisan=이든+앤+스페이스)
    const plusReq = new NextRequest('https://dongtanview.com/technovalley?jisan=%EC%9D%B4%EB%93%A0+%EC%95%A4+%EC%8A%A4%ED%8E%98%EC%9D%B4%EC%8A%A4');
    const plusRes = await proxy(plusReq);
    expect(plusRes.status).toBe(308);
    expect(plusRes.headers.get('location')).toBe(
      `https://dongtanview.com/technovalley/${encodeURIComponent('이든-앤-스페이스')}`
    );

    // Oversized (>200 chars), empty, and XSS payloads safely return null / redirect to clean hub
    for (const badInput of ['', '   ', 'A'.repeat(201), '<script>alert(1)</script>', 'javascript:alert(1)']) {
      expect(resolveTechnoValleyJisan(jisanList, badInput)).toBeNull();
      expect(resolveTechnoValleyJisanCanonicalSlug(badInput)).toBeNull();
    }
  });

  it('resolves parenthesized center names like (주)유앤미개발 on client ?jisan= without false XSS rejection and syncs document.title', async () => {
    const jisanList = await getTechnoValleyJisanList();
    window.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    }) as unknown as typeof fetch;

    window.history.replaceState(
      {},
      '',
      `/technovalley?jisan=${encodeURIComponent('(주)유앤미개발')}`
    );

    const { container, unmount } = render(
      <SettingsProvider>
        <TechnoValleyClient selectedJisan={null} jisanList={jisanList} hideHeader={true} />
      </SettingsProvider>
    );

    const heroBanner = container.querySelector('#technovalley-selected-jisan-hero-banner');
    expect(heroBanner).not.toBeNull();
    expect(heroBanner?.textContent).toContain('(주)유앤미개발');
    expect(document.title).toContain('동탄테크노밸리');
    expect(document.title).toContain('(주)유앤미개발');
    unmount();
  });

  it('optimizes SERP hub title/description and center metadata for 에이팩시티 and 동탄금강펜테리움 IX타워 while keeping noindex/canonical contracts intact', async () => {
    const jisanList = await getTechnoValleyJisanList();

    const hubMeta = buildTechnoValleySeoMetadata(jisanList, undefined, 'https://dongtanview.com');
    expect(String(hubMeta.title)).toContain('실거래가');
    expect(String(hubMeta.title)).toContain('취득세 35% 감면');
    expect(String(hubMeta.description)).toContain('동탄 지식산업센터');
    expect(String(hubMeta.description)).toContain('동탄금강펜테리움 IX타워');
    expect(String(hubMeta.description)).toContain('에이팩시티');
    expect(hubMeta.robots).toBeUndefined();
    expect(hubMeta.alternates?.canonical).toBe('https://dongtanview.com/technovalley');

    const apexMeta = buildTechnoValleySeoMetadata(jisanList, '동탄 에이팩시티', 'https://dongtanview.com');
    expect(String(apexMeta.title)).toContain('에이팩시티 지식산업센터');
    expect(String(apexMeta.description)).toMatch(/^동탄테크노밸리 에이팩시티/);
    expect(String(apexMeta.description)).toContain('실거래가·매매 시세');
    expect(String(apexMeta.keywords)).toContain('동탄 에이팩시티');
    expect(String(apexMeta.keywords)).toContain('에이팩시티 실거래가');
    expect(apexMeta.robots).toEqual({ index: false, follow: true });
    expect(apexMeta.alternates?.canonical).toBe(
      `https://dongtanview.com/technovalley/${encodeURIComponent('에이팩시티')}`
    );

    const ixMeta = buildTechnoValleySeoMetadata(jisanList, '금강펜테리움 IX타워', 'https://dongtanview.com');
    expect(String(ixMeta.keywords)).toContain('금강펜테리움 IX타워');
    expect(String(ixMeta.keywords)).toContain('금강펜테리움 IX타워 실거래가');
    expect(ixMeta.alternates?.canonical).toBe(
      `https://dongtanview.com/technovalley/${encodeURIComponent('동탄금강펜테리움-IX타워')}`
    );
  });

  it('eliminates duplicate #technovalley-selected-jisan-hero-banner on /technovalley/[slug] detail pages (에이팩시티 & 동탄금강펜테리움-IX타워)', async () => {
    for (const slug of ['에이팩시티', '동탄금강펜테리움-IX타워']) {
      const jsx = await TechnoValleyDetailPage({
        params: Promise.resolve({ slug }),
        initialTransactions: [],
      });
      const { container, unmount } = render(<SettingsProvider>{jsx}</SettingsProvider>);

      expect(container.querySelector('#technovalley-selected-jisan-ssr')).not.toBeNull();
      // Client duplicate banner must stay suppressed when SSR #technovalley-selected-jisan-ssr is present
      expect(container.querySelector('#technovalley-selected-jisan-hero-banner')).toBeNull();
      expect(
        container.querySelectorAll('[data-testid="technovalley-bounce-defense-bridge"]')
      ).toHaveLength(1);
      unmount();
    }
  });

  it('renders #tax-simulator above company list in TechnoValleyDashboard and tracks open_calculator from desktop KPI Card 4', () => {
    const trackSpy = jest.spyOn(analyticsModule, 'trackEvent').mockImplementation(() => {});
    const scrollSpy = jest.fn();
    const origScroll = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = scrollSpy;

    try {
      const { container } = render(<TechnoValleyDashboard />);
      const taxSimEl = container.querySelector('#tax-simulator');
      const companyHeading = screen.getByText('업종 구분별 기업 리스트');

      expect(taxSimEl).not.toBeNull();
      // Simulator must precede the large industry/company accordion for desktop discoverability
      expect(
        Boolean(taxSimEl!.compareDocumentPosition(companyHeading) & Node.DOCUMENT_POSITION_FOLLOWING)
      ).toBe(true);

      const kpiBtn = screen.getByTestId('technovalley-kpi-tax-simulator-btn');
      fireEvent.click(kpiBtn);

      expect(trackSpy).toHaveBeenCalledWith(
        'open_calculator',
        expect.objectContaining({
          calculator_type: 'corporate_tax_simulator',
          surface: 'technovalley_kpi_card',
          trigger: 'kpi_tax_card_cta',
        })
      );
      expect(scrollSpy).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    } finally {
      Element.prototype.scrollIntoView = origScroll;
    }
  });

  it('recovers delayed #tax-simulator scroll past 280ms via multi-step retry in TechnoValleyBounceDefenseBridge', () => {
    jest.useFakeTimers();
    const trackSpy = jest.spyOn(analyticsModule, 'trackEvent').mockImplementation(() => {});
    const scrollSpy = jest.fn();
    const origScroll = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = scrollSpy;

    try {
      const { rerender } = render(
        <>
          <TechnoValleyBounceDefenseBridge
            currentJisan={null}
            hasCurrentRealTx={false}
            initialBenchmarkManwon={50000}
            peers={[]}
            surface="technovalley_hub_top"
          />
        </>
      );

      fireEvent.click(screen.getByTestId('technovalley-open-tax-simulator-cta'));
      expect(trackSpy).toHaveBeenCalledWith(
        'open_calculator',
        expect.objectContaining({ calculator_type: 'corporate_tax_simulator' })
      );
      expect(scrollSpy).not.toHaveBeenCalled();

      // Advance past 120ms and 280ms while #tax-simulator is still absent
      act(() => {
        jest.advanceTimersByTime(450);
      });
      expect(scrollSpy).not.toHaveBeenCalled();

      // Mount #tax-simulator before 650ms step resolves
      rerender(
        <>
          <TechnoValleyBounceDefenseBridge
            currentJisan={null}
            hasCurrentRealTx={false}
            initialBenchmarkManwon={50000}
            peers={[]}
            surface="technovalley_hub_top"
          />
          <div id="tax-simulator" tabIndex={-1} />
        </>
      );

      act(() => {
        jest.advanceTimersByTime(700);
      });
      expect(scrollSpy).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
      expect(window.__dviewPendingRelocationSim).toBeUndefined();
    } finally {
      Element.prototype.scrollIntoView = origScroll;
    }
  });

  it('eliminates /technovalley self-loop in corporate-relocation CPA catalog and renders Ad Money v5.1 soft-surface AdSlots on /technovalley', async () => {
    const template = CPA_CAMPAIGN_CATALOG['corporate-relocation'];
    expect(template.targetUrl).toContain('/guide/dongtan-technovalley-corporate-relocation-tax');
    expect(template.targetUrl).not.toMatch(/^https:\/\/dongtanview\.com\/technovalley\?/);

    const prevApproval = process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE;
    delete process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE;

    try {
      const jsx = await TechnoValleyPage({
        searchParams: Promise.resolve({}),
        initialTransactions: [],
      });
      const { getByTestId, unmount } = render(<SettingsProvider>{jsx}</SettingsProvider>);

      for (const testId of [
        'technovalley-b2b-adslot-top',
        'technovalley-b2b-adslot-mid',
        'technovalley-b2b-adslot-bottom',
      ]) {
        const wrapper = getByTestId(testId);
        expect(wrapper.className).toMatch(/bg-elevated|bg-\[#f9fafb\]/);
        expect(wrapper.className).toContain('min-h-[250px]');
        expect(wrapper.className).not.toContain('backdrop-blur-xl');
        expect(wrapper.className).not.toContain('border-slate-200/80');
      }
      unmount();
    } finally {
      if (prevApproval !== undefined) {
        process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE = prevApproval;
      }
    }
  });

  it('redirects trailing-slash /technovalley/?jisan= & plus-encoded queries via proxy/matcher and maps GSC aliases to /technovalley/[slug]', async () => {
    const matcherList = proxyConfig.matcher as Array<unknown>;
    expect(matcherList).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: '/technovalley/',
          has: [{ type: 'query', key: 'jisan' }],
        }),
      ])
    );

    const trailingReq = new NextRequest(
      new URL('https://dongtanview.com/technovalley/?jisan=%EC%97%90%EC%9D%B4%ED%8C%A9%EC%8B%9C%ED%8B%B0')
    );
    const trailingRes = await proxy(trailingReq);
    expect(trailingRes.status).toBe(308);
    expect(decodeURIComponent(trailingRes.headers.get('location') || '')).toBe(
      'https://dongtanview.com/technovalley/에이팩시티'
    );

    const plusReq = new NextRequest(
      new URL('https://dongtanview.com/technovalley?jisan=%EA%B8%88%EA%B0%95%ED%8E%9C%ED%85%8C%EB%A6%AC%EC%9B%80+IX%ED%83%80%EC%9B%8C')
    );
    const plusRes = await proxy(plusReq);
    expect(plusRes.status).toBe(308);
    expect(decodeURIComponent(plusRes.headers.get('location') || '')).toBe(
      'https://dongtanview.com/technovalley/동탄금강펜테리움-IX타워'
    );

    expect(resolveTechnoValleyJisanCanonicalSlug('금강펜테리움+9타워')).toBe('동탄금강펜테리움-IX타워');
    const jisanListForAlias = await getTechnoValleyJisanList();
    expect(resolveTechnoValleyJisan(jisanListForAlias, '금강펜테리움+9타워')?.name).toBe('동탄금강펜테리움 IX타워');

    for (const [query, expectedSlug] of [
      ['금강펜테리움9타워 실거래가', '동탄금강펜테리움-IX타워'],
      ['이든스페이스 지식산업센터', '이든-앤-스페이스'],
      ['동탄테크노밸리 에이팩시티', '에이팩시티'],
    ]) {
      const rec = recommendDviewSeoAction({
        query,
        page: '',
        clicks: 0,
        impressions: 20,
        ctr: 0,
        position: 7.2,
      });
      expect(rec.targetRoute).toBe(`/technovalley/${expectedSlug}`);
    }
  });

  it('renders #tax-simulator and center-attributed CPA CTA directly in SSR HTML without ssr:false skeleton delay', async () => {
    const hubJsx = await TechnoValleyPage({
      searchParams: Promise.resolve({}),
      initialTransactions: [],
    });
    const hubHtml = renderToStaticMarkup(<SettingsProvider>{hubJsx}</SettingsProvider>);
    expect(hubHtml).toContain('id="tax-simulator"');
    expect(hubHtml).toContain('테크노밸리 이전 세금 감면 시뮬레이터');
    expect(hubHtml).toContain('data-testid="technovalley-kpi-tax-simulator-btn"');
    expect(hubHtml).toContain('data-testid="relocation-sim-b2b-cpa-cta"');
    expect(hubHtml).not.toContain('lg:grid-cols-12 gap-6 mb-5 items-stretch animate-pulse');

    const bizTowerJsx = await TechnoValleyDetailPage({
      params: Promise.resolve({ slug: encodeURIComponent('동탄비즈타워') }),
      initialTransactions: [
        {
          id: 'tx-biz-1',
          date: '2026-10-15',
          buildingName: '동탄비즈타워',
          jibun: '443-1',
          dong: '영천동',
          sizeSqM: 52.4,
          floor: '6',
          price: '4억 2,000만원',
          priceRaw: 42000,
          dealType: '매매',
        },
      ],
    });
    const bizHtml = renderToStaticMarkup(<SettingsProvider>{bizTowerJsx}</SettingsProvider>);
    expect(bizHtml).toContain('id="tax-simulator"');
    expect(bizHtml).toContain('4억 2,000만 원');
    expect(bizHtml).toContain('slot_id=technovalley_simulator_cta');
    expect(bizHtml).toContain(`apt=${encodeURIComponent('동탄비즈타워')}`);
  });

  it('restores document.title when ?jisan= query is cleared via popstate navigation', async () => {
    const originalUrl = window.location.href;
    const originalTitle = document.title;
    const jisanList = await getTechnoValleyJisanList();

    try {
      document.title = '동탄테크노밸리 56개 지식산업센터 전수 카탈로그 | D-VIEW';
      window.history.replaceState({}, '', '/technovalley?jisan=' + encodeURIComponent('에이팩시티'));

      render(<TechnoValleyClient jisanList={jisanList} initialTransactions={[]} />);
      expect(document.title).toContain('에이팩시티');

      window.history.replaceState({}, '', '/technovalley');
      act(() => {
        window.dispatchEvent(new PopStateEvent('popstate'));
      });
      expect(document.title).toBe('동탄테크노밸리 56개 지식산업센터 전수 카탈로그 | D-VIEW');
    } finally {
      window.history.replaceState({}, '', originalUrl);
      document.title = originalTitle;
    }
  });
});
