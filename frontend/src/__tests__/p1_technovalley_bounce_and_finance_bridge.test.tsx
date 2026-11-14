import React from 'react';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import {
  selectPeerTechnoValleyJisans,
  computeJisanQuickTaxSummary,
  matchJisanSaleTransactionsPure,
} from '@/lib/utils/technovalleyPeerUtils';
import TechnoValleyBounceDefenseBridge from '@/components/technovalley/TechnoValleyBounceDefenseBridge';
import RelocationTaxSimulator from '@/components/macro/RelocationTaxSimulator';
import InlineMortgageDsrBridge, {
  computeStatutoryResidentialAcquisitionTax,
} from '@/components/finance/InlineMortgageDsrBridge';
import {
  calculateEqualPrincipalAndInterest,
  calculateDsrMaxLoan,
} from '@/lib/services/mortgage/mortgageEngine';
import {
  getTechnoValleyJisanList,
  resolveTechnoValleyJisan,
  type JisanOfficeTransactionItem,
} from '@/lib/services/apartmentPageService';
import * as analyticsModule from '@/lib/utils/analytics';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/technovalley',
  useSearchParams: () => new URLSearchParams(),
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  redirect: jest.fn(),
  permanentRedirect: jest.fn(),
}));

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

jest.mock('@/components/ads/AdSlot', () => ({
  AdSlot: ({ refreshSlotId }: { refreshSlotId?: string }) => (
    <div data-testid="mock-ad-slot" data-slot={refreshSlotId || ''} />
  ),
}));

describe('P1 Track 1: /technovalley Bounce Defense & Tax Simulator Bridge', () => {
  let trackEventSpy: jest.SpyInstance;

  beforeEach(() => {
    trackEventSpy = jest.spyOn(analyticsModule, 'trackEvent').mockImplementation(() => {});
    if (typeof window !== 'undefined') {
      window.__dviewPendingRelocationSim = undefined;
      window.history.replaceState({}, '', '/technovalley');
    }
  });

  afterEach(() => {
    trackEventSpy.mockRestore();
  });

  it('selectPeerTechnoValleyJisans excludes target building, prioritizes real MOLIT sales, and strictly rejects commercial rent records', async () => {
    const jisanList = await getTechnoValleyJisanList();
    const targetIx = resolveTechnoValleyJisan(jisanList, '동탄금강펜테리움 IX타워');
    expect(targetIx).not.toBeNull();

    const sampleTxs: JisanOfficeTransactionItem[] = [
      {
        date: '2026-10-18',
        type: '매매',
        sizeSqM: 84.12,
        floor: 11,
        price: '3억 4,000만원',
        priceRaw: 34000,
        buildingName: '동탄 SK V1 center',
        jibun: '영천동 853-1',
      },
      {
        date: '2026-10-20',
        type: '임대',
        sizeSqM: 84.12,
        floor: 5,
        price: '2,000만원',
        priceRaw: 2000,
        buildingName: '현대 실리콘앨리 동탄',
        jibun: '영천동 775',
      },
      {
        date: '2026-10-21',
        type: '매매',
        sizeSqM: 50.0,
        floor: 3,
        price: '0원',
        priceRaw: 0,
        buildingName: '현대 실리콘앨리 동탄',
        jibun: '영천동 775',
      },
    ];

    // Strict Real Data Only: commercial rent ('임대') and '0원' must be excluded
    const siliconJisan = resolveTechnoValleyJisan(jisanList, '현대 실리콘앨리 동탄')!;
    expect(matchJisanSaleTransactionsPure(siliconJisan, sampleTxs)).toHaveLength(0);

    const peers = selectPeerTechnoValleyJisans(targetIx, jisanList, sampleTxs, 4);
    expect(peers).toHaveLength(4);
    expect(peers.some((p) => p.jisan.name === targetIx!.name)).toBe(false);

    // SK V1 center has a verified MOLIT sale transaction and shares 영천동, so it must rank #1
    expect(peers[0].jisan.name).toBe('동탄 SK V1 center');
    expect(peers[0].hasRealSaleTx).toBe(true);
    expect(peers[0].latestSalePrice).toBe('3억 4,000만원');
    expect(peers[0].saleTxCount).toBe(1);

    // Peers without MOLIT sale transactions must have null latestSalePrice (never fabricated)
    const zeroTxPeers = peers.filter((p) => !p.hasRealSaleTx);
    expect(zeroTxPeers.length).toBeGreaterThan(0);
    for (const p of zeroTxPeers) {
      expect(p.latestSalePrice).toBeNull();
      expect(p.saleTxCount).toBe(0);
    }

    // Boundary checks
    expect(selectPeerTechnoValleyJisans(targetIx, [], sampleTxs, 4)).toEqual([]);
    expect(selectPeerTechnoValleyJisans(targetIx, jisanList, sampleTxs, 0)).toEqual([]);
  });

  it('computeJisanQuickTaxSummary calculates statutory 35% acquisition/property tax & corporate relocation savings and guards invalid numbers', () => {
    const overconcentrated5Eok = computeJisanQuickTaxSummary(50000, 'overconcentrated', 5000);
    // 50,000 * 0.046 = 2,300; 35% saved = 805만원
    expect(overconcentrated5Eok.standardAcquisitionTaxManwon).toBe(2300);
    expect(overconcentrated5Eok.savedAcquisitionTaxManwon).toBe(805);
    expect(overconcentrated5Eok.sixYearCorporateTaxSavedManwon).toBe(25000);

    const otherZone5Eok = computeJisanQuickTaxSummary(50000, 'other', 5000);
    expect(otherZone5Eok.savedAcquisitionTaxManwon).toBe(805);
    expect(otherZone5Eok.sixYearCorporateTaxSavedManwon).toBe(0);

    // Boundary inputs (NaN, negative) fall back safely
    const nanFallback = computeJisanQuickTaxSummary(Number.NaN, 'overconcentrated', -100);
    expect(nanFallback.purchasePriceManwon).toBe(30000);
    expect(nanFallback.savedAcquisitionTaxManwon).toBe(483);
    expect(nanFallback.sixYearCorporateTaxSavedManwon).toBe(0);
  });

  it('syncs selected purchase price & relocation zone from TechnoValleyBounceDefenseBridge into RelocationTaxSimulator and emits open_calculator', async () => {
    const jisanList = await getTechnoValleyJisanList();
    const targetJisan = resolveTechnoValleyJisan(jisanList, '이든 앤 스페이스') || jisanList[0];
    const peers = selectPeerTechnoValleyJisans(targetJisan, jisanList, [], 4);

    render(
      <div>
        <TechnoValleyBounceDefenseBridge
          currentJisan={targetJisan}
          hasCurrentRealTx={false}
          initialBenchmarkManwon={30000}
          peers={peers}
          surface="technovalley_detail_ssr"
        />
        <div id="tax-simulator">
          <RelocationTaxSimulator />
        </div>
      </div>
    );

    // Click 10억 preset and 일반 취득
    fireEvent.click(screen.getByRole('button', { name: '10억' }));
    fireEvent.click(screen.getByRole('button', { name: '일반 취득' }));

    expect(trackEventSpy).toHaveBeenCalledWith(
      'finance_quick_interact',
      expect.objectContaining({
        widget_type: 'jisan_tax_quick_bridge',
        surface: 'technovalley_detail_ssr',
        purchase_price_manwon: 100000,
      })
    );

    // Click primary simulator CTA
    fireEvent.click(screen.getByTestId('technovalley-open-tax-simulator-cta'));

    expect(trackEventSpy).toHaveBeenCalledWith(
      'open_calculator',
      expect.objectContaining({
        calculator_type: 'corporate_tax_simulator',
        surface: 'technovalley_detail_ssr',
        trigger: 'technovalley_top_bridge',
        apartment_name: targetJisan.name,
        purchase_price_manwon: 100000,
      })
    );

    // RelocationTaxSimulator should now display 10억 원 purchase price and non-overconcentrated notice
    expect(screen.getByText('10억 원')).toBeInTheDocument();
    expect(
      screen.getByText('과밀억제권역 외 이전 시 법인세 감면 혜택은 대상 외이므로 계산에서 제외됩니다.')
    ).toBeInTheDocument();
  });

  it('handles deferred RelocationTaxSimulator mount via __dviewPendingRelocationSim when dashboard is lazy-loading', async () => {
    const jisanList = await getTechnoValleyJisanList();
    const peers = selectPeerTechnoValleyJisans(null, jisanList, [], 4);

    const { unmount } = render(
      <TechnoValleyBounceDefenseBridge
        currentJisan={null}
        hasCurrentRealTx={false}
        initialBenchmarkManwon={30000}
        peers={peers}
        surface="technovalley_hub_top"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '5억' }));
    fireEvent.click(screen.getByTestId('technovalley-open-tax-simulator-cta'));
    expect(window.__dviewPendingRelocationSim).toEqual({
      purchasePriceManwon: 50000,
      existingLocation: 'overconcentrated',
    });
    unmount();

    // Now mount RelocationTaxSimulator afterwards (simulating dynamic import completion)
    render(<RelocationTaxSimulator />);
    expect(screen.getByText('5억 원')).toBeInTheDocument();
    expect(window.__dviewPendingRelocationSim).toBeUndefined();
  });

  it('renders bounce defense bridge across /technovalley?[jisan], /technovalley/[slug], and client-side ?jisan= query without XSS or duplicate banners', async () => {
    const TechnoValleyPage = (await import('@/app/technovalley/page')).default;
    const TechnoValleyDetailPage = (await import('@/app/technovalley/[slug]/page')).default;
    const TechnoValleyClient = (await import('@/app/technovalley/TechnoValleyClient')).default;
    const jisanList = await getTechnoValleyJisanList();

    // 1. /technovalley/[slug] with 0 transactions
    const zeroTxCenter = jisanList.find((i) => i.name === 'SH SQUAREⅡ') || jisanList[0];
    const DetailJsx = await TechnoValleyDetailPage({
      params: Promise.resolve({ slug: zeroTxCenter.name.replace(/\s+/g, '-') }),
      initialTransactions: [
        {
          date: '2026-10-15',
          type: '매매',
          sizeSqM: 76.4,
          floor: 9,
          price: '3억 2,000만원',
          priceRaw: 32000,
          buildingName: '동탄 SK V1 center',
          jibun: '영천동 853-1',
        },
      ],
    });
    const detailRender = render(DetailJsx);
    expect(detailRender.container.querySelectorAll('h1')).toHaveLength(1);
    expect(
      detailRender.container.querySelector('#technovalley-selected-jisan-real-tx')?.textContent
    ).toContain('등록된 실거래 내역이 없습니다.');
    const detailBridges = detailRender.getAllByTestId('technovalley-bounce-defense-bridge');
    // Only 1 bridge rendered (SSR top; client duplicate suppressed)
    expect(detailBridges).toHaveLength(1);
    expect(detailBridges[0].textContent).toContain('매매 3억 2,000만원');
    detailRender.unmount();

    // 2. Client-side ?jisan= resolution on static /technovalley?jisan=SH%20SQUARE%E2%85%A1
    const origFetch = window.fetch;
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            date: '2026-10-15',
            type: '매매',
            sizeSqM: 76.4,
            floor: 9,
            price: '3억 2,000만원',
            priceRaw: 32000,
            buildingName: '동탄 SK V1 center',
            jibun: '영천동 853-1',
          },
        ],
      }),
    });
    window.fetch = fetchMock as unknown as typeof window.fetch;
    try {
      window.history.replaceState({}, '', `/technovalley?jisan=${encodeURIComponent('SH SQUAREⅡ')}`);

      const clientQueryRender = render(
        <TechnoValleyClient selectedJisan={null} jisanList={jisanList} hideHeader={true} />
      );

      await waitFor(() => {
        const clientTxCalls = fetchMock.mock.calls.filter(
          ([url]) => url === '/api/technovalley/transactions?lawdCd=41591&dealYmd=all'
        );
        expect(clientTxCalls).toHaveLength(1);
        expect(
          clientQueryRender.getByTestId('technovalley-bounce-defense-bridge').textContent
        ).toContain('매매 3억 2,000만원');
      });
      clientQueryRender.unmount();

      // 3. Untrusted XSS ?jisan= query must NOT mount #technovalley-selected-jisan-hero-banner
      window.history.replaceState(
        {},
        '',
        `/technovalley?jisan=${encodeURIComponent('<img src=x onerror=alert(1)>')}`
      );
      const xssRender = render(
        <TechnoValleyClient selectedJisan={null} jisanList={jisanList} hideHeader={true} />
      );
      expect(xssRender.container.querySelector('#technovalley-selected-jisan-hero-banner')).toBeNull();
      xssRender.unmount();
    } finally {
      window.fetch = origFetch;
      window.history.replaceState({}, '', '/technovalley');
    }

    // 4. SSR /technovalley?jisan=... page order invariant
    const HubJsx = await TechnoValleyPage({
      searchParams: Promise.resolve({ jisan: '동탄 SK V1 center' }),
      initialTransactions: [
        {
          date: '2026-10-15',
          type: '매매',
          sizeSqM: 76.4,
          floor: 9,
          price: '3억 2,000만원',
          priceRaw: 32000,
          buildingName: '동탄 SK V1 center',
          jibun: '영천동 853-1',
        },
      ],
    });
    const hubRender = render(HubJsx);
    expect(hubRender.container.querySelectorAll('h1')).toHaveLength(1);
    expect(hubRender.getAllByTestId('technovalley-bounce-defense-bridge')).toHaveLength(1);
    hubRender.unmount();
  }, 20000);

  it('hydrates static /technovalley SSR HTML cleanly under client ?jisan= query with zero React hydration mismatch errors', async () => {
    const TechnoValleyClient = (await import('@/app/technovalley/TechnoValleyClient')).default;
    const jisanList = await getTechnoValleyJisanList();
    const initialPeers = selectPeerTechnoValleyJisans(null, jisanList, [], 4);

    // 1. Force-static SSR renders without ?jisan query
    window.history.replaceState({}, '', '/technovalley');
    const ssrMarkup = renderToString(
      <TechnoValleyClient
        selectedJisan={null}
        jisanList={jisanList}
        initialPeerItems={initialPeers}
        hideHeader={true}
      />
    );

    const host = document.createElement('div');
    host.innerHTML = ssrMarkup;
    document.body.appendChild(host);

    // 2. Client arrives with ?jisan=SH%20SQUARE%E2%85%A1 on the static HTML
    const origFetch = window.fetch;
    window.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    }) as unknown as typeof window.fetch;
    window.history.replaceState({}, '', `/technovalley?jisan=${encodeURIComponent('SH SQUAREⅡ')}`);

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    let root: ReturnType<typeof hydrateRoot> | null = null;
    try {
      await act(async () => {
        root = hydrateRoot(
          host,
          <TechnoValleyClient
            selectedJisan={null}
            jisanList={jisanList}
            initialPeerItems={initialPeers}
            hideHeader={true}
          />
        );
      });

      const hydrationErrors = consoleErrorSpy.mock.calls.filter((args) =>
        args.some((arg) =>
          String(arg).match(/Hydration failed|hydrated|did not match|server rendered HTML/i)
        )
      );
      expect(hydrationErrors).toHaveLength(0);

      await waitFor(() => {
        expect(host.querySelector('#technovalley-selected-jisan-hero-banner')).not.toBeNull();
        expect(host.textContent).toContain('SH SQUAREⅡ');
      });
    } finally {
      await act(async () => {
        root?.unmount();
      });
      host.remove();
      window.fetch = origFetch;
      consoleErrorSpy.mockRestore();
    }
  });

  it('preserves exact non-5000-multiple MOLIT prices (3억 4,000만원), scrolls #tax-simulator on delayed mount, and logs registered GA4 dimensions on peer click', async () => {
    const jisanList = await getTechnoValleyJisanList();
    const skV1 = resolveTechnoValleyJisan(jisanList, '동탄 SK V1 center') || jisanList[0];
    const peers = selectPeerTechnoValleyJisans(skV1, jisanList, [], 4);
    const expectedQuick = computeJisanQuickTaxSummary(34000, 'overconcentrated', 8000);

    const bridgeRender = render(
      <TechnoValleyBounceDefenseBridge
        currentJisan={skV1}
        hasCurrentRealTx={true}
        initialBenchmarkManwon={34000}
        peers={peers}
        surface="technovalley_detail_ssr"
      />
    );

    // Peer card click must emit registered GA4 custom dimensions (apartment_name, selected_apt, dong, trigger, surface)
    const peerCards = bridgeRender.getAllByTestId('technovalley-peer-card');
    peerCards[0].addEventListener('click', (e) => e.preventDefault(), { once: true });
    fireEvent.click(peerCards[0]);
    expect(trackEventSpy).toHaveBeenCalledWith(
      'technovalley_bounce_defense_click',
      expect.objectContaining({
        action: 'select_peer_jisan',
        source_jisan: skV1.name,
        target_jisan: peers[0].jisan.name,
        apartment_name: peers[0].jisan.name,
        selected_apt: peers[0].jisan.name,
        dong: peers[0].dong,
        trigger: 'technovalley_peer_card',
        surface: 'technovalley_detail_ssr',
      })
    );

    // Click simulator CTA BEFORE #tax-simulator exists in DOM (simulating slow dynamic chunk > 280ms)
    fireEvent.click(bridgeRender.getByTestId('technovalley-open-tax-simulator-cta'));
    expect(window.__dviewPendingRelocationSim).toEqual({
      purchasePriceManwon: 34000,
      existingLocation: 'overconcentrated',
    });
    bridgeRender.unmount();

    const scrollSpy = jest.fn();
    const origScrollIntoView = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = scrollSpy;
    try {
      const simRender = render(
        <div id="tax-simulator">
          <RelocationTaxSimulator />
        </div>
      );
      expect(scrollSpy).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
      // Exact 3억 4,000만 원 preserved (never distorted to 3억 5,000만 원!) and tax numbers match 1:1
      expect(simRender.getByText('3억 4,000만 원')).toBeInTheDocument();
      expect(
        simRender.getByText(`${expectedQuick.savedAcquisitionTaxManwon.toLocaleString()}만 원`)
      ).toBeInTheDocument();
      expect(
        simRender.getByText(
          `${expectedQuick.estimatedFiveYearPropertyTaxSavedManwon.toLocaleString()}만 원`
        )
      ).toBeInTheDocument();
      simRender.unmount();
    } finally {
      Element.prototype.scrollIntoView = origScrollIntoView;
    }
  });
});

describe('P1 Track 2: InlineMortgageDsrBridge & /guide/* + /apartment/* Conversion Funnel', () => {
  let trackEventSpy: jest.SpyInstance;

  beforeEach(() => {
    trackEventSpy = jest.spyOn(analyticsModule, 'trackEvent').mockImplementation(() => {});
    if (typeof window !== 'undefined') {
      window.__dviewPendingCalculatorContext = undefined;
      window.__dviewDashboardCalcHostActive = false;
      window.sessionStorage.clear();
      window.localStorage.clear();
      window.history.replaceState({}, '', '/');
    }
  });

  afterEach(() => {
    trackEventSpy.mockRestore();
  });

  it('matches mortgageEngine closed-form math and statutory acquisition tax brackets including boundary inputs', () => {
    // Statutory acquisition tax brackets
    expect(computeStatutoryResidentialAcquisitionTax(500_000_000, '1house')).toEqual({
      totalTaxWon: 5_500_000,
      effectiveRatePct: 1.1,
      firstHomeSavedWon: 0,
    });
    expect(computeStatutoryResidentialAcquisitionTax(500_000_000, 'first_home')).toEqual({
      totalTaxWon: 3_500_000,
      effectiveRatePct: 1.1,
      firstHomeSavedWon: 2_000_000,
    });
    // 7.5억 -> base rate (7.5 * 2 / 3 - 3) = 2.0% -> with 10% education tax = 2.2% -> 16,500,000원
    expect(computeStatutoryResidentialAcquisitionTax(750_000_000, '1house')).toEqual({
      totalTaxWon: 16_500_000,
      effectiveRatePct: 2.2,
      firstHomeSavedWon: 0,
    });
    // 14.5억 (> 12억: first_home reduction ineligible, rate 3.3%)
    expect(computeStatutoryResidentialAcquisitionTax(1_450_000_000, 'first_home')).toEqual({
      totalTaxWon: 47_850_000,
      effectiveRatePct: 3.3,
      firstHomeSavedWon: 0,
    });
    expect(computeStatutoryResidentialAcquisitionTax(0, '1house').totalTaxWon).toBe(0);
    expect(computeStatutoryResidentialAcquisitionTax(-5000, '1house').totalTaxWon).toBe(0);
    expect(computeStatutoryResidentialAcquisitionTax(Number.NaN, '1house').totalTaxWon).toBe(0);

    // Render InlineMortgageDsrBridge with verified 10억 (100,000만원) MOLIT sale price
    render(
      <InlineMortgageDsrBridge
        apartmentName="동탄더샵레이크에듀타운"
        canonicalSlug="동탄더샵레이크에듀타운"
        dong="산척동"
        benchmarkPriceManwon={100000}
        guideSlug="dongtan-1-vs-2-comparison"
        surface="guide_top_summary"
        trigger="guide_top_takeaways_bridge"
      />
    );

    const expectedAmort = calculateEqualPrincipalAndInterest({
      principalWon: 700_000_000, // LTV 70% of 10억
      annualRatePercent: 4.0,
      loanPeriodYears: 30,
      repaymentType: 'EQUAL_PRINCIPAL_AND_INTEREST',
    });
    const expectedDsr = calculateDsrMaxLoan({
      annualIncomeWon: 80_000_000, // default 8천만
      baseRatePercent: 4.0,
      loanPeriodYears: 30,
      repaymentType: 'EQUAL_PRINCIPAL_AND_INTEREST',
      stressSpreadPercent: 1.2,
      dsrLimitRatio: 0.4,
    });

    const expectedMonthlyManwon = Math.round(expectedAmort.monthlyPaymentWon / 10_000);
    const kpiLine = screen.getByTestId('inline-mortgage-dsr-kpi-line');
    expect(kpiLine.textContent).toContain(`약 ${expectedMonthlyManwon.toLocaleString('ko-KR')}만원`);
    expect(Math.round(expectedDsr.maxLoanWon / 10_000)).toBeGreaterThan(0);

    // Toggling LTV 50% emits finance_quick_interact, NOT open_calculator
    fireEvent.click(screen.getByRole('button', { name: 'LTV 50%' }));
    expect(trackEventSpy).toHaveBeenCalledWith(
      'finance_quick_interact',
      expect.objectContaining({
        widget_type: 'inline_mortgage_dsr_bridge',
        action: 'change_ltv',
        ltv_pct: 50,
      })
    );
    expect(
      trackEventSpy.mock.calls.filter(([name]) => name === 'open_calculator')
    ).toHaveLength(0);

    // Clicking 주담대·DSR 계산기 opens precision drawer and fires open_calculator ONCE
    fireEvent.click(screen.getByTestId('inline-mortgage-dsr-open-btn'));
    expect(screen.getByTestId('inline-precision-calc-drawer')).toBeInTheDocument();
    expect(
      trackEventSpy.mock.calls.filter(([name]) => name === 'open_calculator')
    ).toHaveLength(1);
    expect(trackEventSpy).toHaveBeenCalledWith(
      'open_calculator',
      expect.objectContaining({
        calculator_type: 'mortgage',
        surface: 'guide_top_summary',
        trigger: 'guide_top_takeaways_bridge',
        guide_slug: 'dongtan-1-vs-2-comparison',
      })
    );

    // Collapsing drawer does NOT re-fire open_calculator
    fireEvent.click(screen.getByTestId('inline-mortgage-dsr-open-btn'));
    expect(screen.queryByTestId('inline-precision-calc-drawer')).toBeNull();
    expect(
      trackEventSpy.mock.calls.filter(([name]) => name === 'open_calculator')
    ).toHaveLength(1);

    // Opening tax calculator tab fires open_calculator with property_tax
    fireEvent.click(screen.getByTestId('inline-tax-calc-open-btn'));
    expect(screen.getByTestId('inline-precision-calc-drawer')).toBeInTheDocument();
    expect(trackEventSpy).toHaveBeenCalledWith(
      'open_calculator',
      expect.objectContaining({
        calculator_type: 'property_tax',
        surface: 'guide_top_summary',
        trigger: 'guide_top_takeaways_bridge_tax',
      })
    );
  });

  it('delegates directly to onOpenMortgage / onOpenTaxCalculator without duplicate open_calculator firing when inside ApartmentModal', () => {
    const onOpenMortgage = jest.fn();
    const onOpenTaxCalculator = jest.fn();

    render(
      <InlineMortgageDsrBridge
        apartmentName="동탄역롯데캐슬"
        canonicalSlug="동탄역롯데캐슬"
        dong="오산동"
        benchmarkPriceManwon={145000}
        surface="apartment_inline_top"
        trigger="apartment_inline_top_bridge"
        onOpenMortgage={onOpenMortgage}
        onOpenTaxCalculator={onOpenTaxCalculator}
      />
    );

    fireEvent.click(screen.getByTestId('inline-mortgage-dsr-open-btn'));
    expect(onOpenMortgage).toHaveBeenCalledTimes(1);
    expect(onOpenMortgage).toHaveBeenCalledWith(
      '동탄역롯데캐슬',
      1_450_000_000,
      'apartment_inline_top_bridge'
    );
    // Parent callback (DashboardClient) owns the open_calculator emission — bridge must not double-emit
    expect(
      trackEventSpy.mock.calls.filter(([name]) => name === 'open_calculator')
    ).toHaveLength(0);

    fireEvent.click(screen.getByTestId('inline-tax-calc-open-btn'));
    expect(onOpenTaxCalculator).toHaveBeenCalledTimes(1);
    expect(onOpenTaxCalculator).toHaveBeenCalledWith(
      '동탄역롯데캐슬',
      'apartment_inline_top_bridge_tax'
    );
  });

  it('renders top & mid-article InlineMortgageDsrBridge on high-inflow /guide/[slug] articles including tax guides', async () => {
    const GuideArticlePage = (await import('@/app/guide/[slug]/page')).default;

    const CompGuideJsx = await GuideArticlePage({
      params: Promise.resolve({ slug: 'dongtan-1-vs-2-comparison' }),
    });
    const compRender = render(CompGuideJsx);
    const bridges = compRender.getAllByTestId('inline-mortgage-dsr-bridge');
    expect(bridges.length).toBeGreaterThanOrEqual(2);
    expect(
      bridges.some((el) => el.getAttribute('data-surface') === 'guide_top_summary')
    ).toBe(true);
    expect(
      bridges.some((el) => el.getAttribute('data-surface') === 'guide_mid_conversion')
    ).toBe(true);
    compRender.unmount();

    const TaxGuideJsx = await GuideArticlePage({
      params: Promise.resolve({ slug: 'dongtan-acquisition-property-tax-2026-guide' }),
    });
    const taxRender = render(TaxGuideJsx);
    const taxBridges = taxRender.getAllByTestId('inline-mortgage-dsr-bridge');
    expect(taxBridges.length).toBeGreaterThanOrEqual(2);
    taxRender.unmount();
  });

  it('renders InlineMortgageDsrBridge on /apartment/[aptName] (both inline top and SSR top) and auto-opens calculator via ?calc=mortgage deep link', async () => {
    const ApartmentPage = (await import('@/app/apartment/[aptName]/page')).default;
    const { SettingsProvider } = await import('@/contexts/SettingsContext');
    const { AuthProvider } = await import('@/contexts/AuthContext');

    window.history.replaceState(
      {},
      '',
      `/apartment/${encodeURIComponent('동탄역롯데캐슬')}?calc=mortgage&hl=ko-KR`
    );

    const AptJsx = await ApartmentPage({
      params: Promise.resolve({ aptName: encodeURIComponent('동탄역롯데캐슬') }),
    });
    const aptRender = render(
      <SettingsProvider>
        <AuthProvider>{AptJsx}</AuthProvider>
      </SettingsProvider>
    );

    // ?calc=mortgage&hl=ko-KR triggers open_calculator ONCE with url_query_deep_link and strips both ?calc and ?hl noise,
    // while both SSR top and dynamically mounted InlineFieldReportModal top render InlineMortgageDsrBridge
    await waitFor(() => {
      const bridges = aptRender.getAllByTestId('inline-mortgage-dsr-bridge');
      expect(
        bridges.some((el) => el.getAttribute('data-surface') === 'apartment_ssr_top')
      ).toBe(true);
      expect(
        bridges.some((el) => el.getAttribute('data-surface') === 'apartment_inline_top')
      ).toBe(true);

      const deepLinkCalls = trackEventSpy.mock.calls.filter(
        ([name, params]) =>
          name === 'open_calculator' &&
          params &&
          (params as Record<string, unknown>).trigger === 'url_query_deep_link'
      );
      expect(deepLinkCalls).toHaveLength(1);
      expect(deepLinkCalls[0][1]).toEqual(
        expect.objectContaining({
          calculator_type: 'mortgage',
          surface: 'apartment_inline_page',
          trigger: 'url_query_deep_link',
        })
      );
      expect(window.location.search).toBe('');
    });

    // Re-triggering ?calc=mortgage via popstate after initial cleanup must re-open cleanly (no ref deadlock)
    act(() => {
      window.history.pushState(
        {},
        '',
        `/apartment/${encodeURIComponent('동탄역롯데캐슬')}?calc=mortgage`
      );
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    await waitFor(() => {
      const deepLinkCallsAfterReopen = trackEventSpy.mock.calls.filter(
        ([name, params]) =>
          name === 'open_calculator' &&
          params &&
          (params as Record<string, unknown>).trigger === 'url_query_deep_link'
      );
      expect(deepLinkCallsAfterReopen).toHaveLength(2);
      expect(window.location.search).toBe('');
    });

    // Clicking "전체 시뮬레이터 열기" inside SSR top bridge drawer on /apartment/[aptName]
    // dispatches dview:open_calculator_modal directly (preventing broken same-route soft-nav and duplicate open_calculator)
    const ssrBridge = aptRender
      .getAllByTestId('inline-mortgage-dsr-bridge')
      .find((el) => el.getAttribute('data-surface') === 'apartment_ssr_top')!;
    const ssrOpenBtn = ssrBridge.querySelector(
      '[data-testid="inline-mortgage-dsr-open-btn"]'
    ) as HTMLButtonElement;
    fireEvent.click(ssrOpenBtn);

    const openCallsBeforeDrawerEscalate = trackEventSpy.mock.calls.filter(
      ([name]) => name === 'open_calculator'
    ).length;

    const deepLinkAnchor = ssrBridge.querySelector(
      '[data-testid="inline-calc-deep-link-cta"]'
    ) as HTMLAnchorElement;
    expect(deepLinkAnchor).not.toBeNull();
    const clickEvt = new MouseEvent('click', { bubbles: true, cancelable: true });
    act(() => {
      deepLinkAnchor.dispatchEvent(clickEvt);
    });
    expect(clickEvt.defaultPrevented).toBe(true);

    const openCallsAfterDrawerEscalate = trackEventSpy.mock.calls.filter(
      ([name]) => name === 'open_calculator'
    ).length;
    expect(openCallsAfterDrawerEscalate).toBe(openCallsBeforeDrawerEscalate);

    aptRender.unmount();
  }, 20000);

  it('supports >85㎡ rural special tax toggle, guide budget tier switching, and canonical alias resolution in MortgageCalculator', async () => {
    // 1. >85㎡ statutory rates (농어촌특별세 포함)
    expect(computeStatutoryResidentialAcquisitionTax(500_000_000, '1house', true)).toEqual({
      totalTaxWon: 6_500_000,
      effectiveRatePct: 1.3,
      firstHomeSavedWon: 0,
    });
    expect(computeStatutoryResidentialAcquisitionTax(1_000_000_000, '1house', true)).toEqual({
      totalTaxWon: 35_000_000,
      effectiveRatePct: 3.5,
      firstHomeSavedWon: 0,
    });
    expect(computeStatutoryResidentialAcquisitionTax(1_000_000_000, 'multi_8', true)).toEqual({
      totalTaxWon: 90_000_000,
      effectiveRatePct: 9.0,
      firstHomeSavedWon: 0,
    });
    expect(computeStatutoryResidentialAcquisitionTax(1_000_000_000, 'corp_12', true)).toEqual({
      totalTaxWon: 134_000_000,
      effectiveRatePct: 13.4,
      firstHomeSavedWon: 0,
    });

    // 2. Guide budget tier switching ([실거래 14.5억] -> [9억]) + >85㎡ toggle
    const guideBridge = render(
      <InlineMortgageDsrBridge
        apartmentName="동탄역롯데캐슬"
        canonicalSlug="동탄역롯데캐슬"
        dong="오산동"
        benchmarkPriceManwon={145000}
        guideSlug="dongtan-budget-tier-ranking"
        surface="guide_top_summary"
        trigger="guide_budget_bridge"
      />
    );
    expect(guideBridge.container.textContent).toContain('동탄역롯데캐슬 · 실거래 14.5억');
    fireEvent.click(guideBridge.getByRole('button', { name: '9억' }));
    expect(guideBridge.container.textContent).toContain('예산 기준 9억');

    fireEvent.click(guideBridge.getByTestId('inline-tax-calc-open-btn'));
    const drawer = guideBridge.getByTestId('inline-precision-calc-drawer');
    expect(drawer.className).not.toContain('border-slate-200');
    fireEvent.click(guideBridge.getByRole('button', { name: '85㎡ 초과' }));
    // At 9억 (>85㎡, 1·2주택): base 3.0% + edu 0.3% + rural 0.2% = 3.5% -> 3,150만원
    expect(guideBridge.getByTestId('inline-mortgage-dsr-kpi-line').textContent).toContain(
      '약 3,150만원'
    );
    expect(guideBridge.getByTestId('inline-mortgage-dsr-kpi-line').textContent).toContain(
      '(85㎡↑)'
    );
    guideBridge.unmount();

    // 3. Canonical alias slug resolution & verified price override in MortgageCalculator
    const MortgageCalculator = (await import('@/components/consumer/MortgageCalculator')).default;
    const { PWAProvider } = await import('@/components/pwa/PWAProvider');
    const calcRender = render(
      <PWAProvider>
        <MortgageCalculator
          isOpen={true}
          onClose={() => {}}
          initialAptName="시범한빛마을한화꿈에그린"
          initialPriceManwon={78000}
          initialAnnualIncomeManwon={10000}
          sheetApartments={{}}
          txSummaryData={{
            한화꿈에그린프레스티지: {
              avg3MPrice: 71000,
              latestPrice: 78000,
              txCount: 8,
              dong: '반송동',
            },
          }}
          nameMapping={{}}
          fieldReportsMap={new Map()}
        />
      </PWAProvider>
    );

    await waitFor(() => {
      expect(document.body.textContent).toContain('한화꿈에그린프레스티지');
      expect(document.body.textContent).toContain('7.8억원');
    });
    calcRender.unmount();
  }, 15000);

  it('Round 2 #1 & #2a: enters standalone budget simulation in MortgageCalculator without initialAptName, switches cleanly to MOLIT apartment price, and resets dirty state on close/reopen', async () => {
    const MortgageCalculator = (await import('@/components/consumer/MortgageCalculator')).default;
    const { PWAProvider } = await import('@/components/pwa/PWAProvider');

    const txSummaryFixture = {
      동탄역롯데캐슬: {
        avg3MPrice: 145000,
        latestPrice: 148000,
        txCount: 12,
        dong: '오산동',
      },
    };
    const sheetApartmentsFixture = {
      오산동: [{ name: '동탄역롯데캐슬', dong: '오산동', householdCount: 940 }],
    };

    const calcRender = render(
      <PWAProvider>
        <MortgageCalculator
          isOpen={true}
          onClose={() => {}}
          initialAptName={undefined}
          initialPriceManwon={90000}
          initialAnnualIncomeManwon={10000}
          sheetApartments={sheetApartmentsFixture}
          txSummaryData={txSummaryFixture}
          nameMapping={{}}
          fieldReportsMap={new Map()}
        />
      </PWAProvider>
    );

    // 1. Standalone budget mode renders immediately with LTV / DSR 40% / monthly payment
    await waitFor(() => {
      const basisCard = screen.getByTestId('mortgage-price-basis-card');
      expect(basisCard.textContent).toContain('선택 예산 기준 시뮬레이션 (단지 미선택)');
      expect(basisCard.textContent).toContain('9.0억원');
      expect(basisCard.textContent).toContain('선택 예산 기준');
      expect(basisCard.textContent).not.toContain('D-VIEW 실거래 기준');
    });

    const liveSummary = screen.getByTestId('mortgage-step1-live-summary');
    expect(liveSummary.textContent).toContain('연소득 1억원 기준 즉시 한도·상환 프리뷰');
    // 70% LTV of 9.0억원 = 6.3억원
    expect(liveSummary.textContent).toContain('6.3억원');
    expect(liveSummary.textContent).toContain('DSR 40% 한도');
    expect(liveSummary.textContent).toContain('월 상환액');

    // 2. Selecting a real apartment transitions cleanly to verified MOLIT price (14.5억원 avg3MPrice)
    const dropdown = screen.getByTestId('apt-search-dropdown');
    const lotteBtn = Array.from(dropdown.querySelectorAll('button')).find((btn) =>
      btn.textContent?.includes('동탄역롯데캐슬')
    )!;
    expect(lotteBtn).toBeDefined();
    fireEvent.click(lotteBtn);

    await waitFor(() => {
      const basisCard = screen.getByTestId('mortgage-price-basis-card');
      expect(basisCard.textContent).not.toContain('선택 예산 기준 시뮬레이션 (단지 미선택)');
      expect(basisCard.textContent).toContain('최근 3M 매매 평균시세');
      expect(basisCard.textContent).toContain('D-VIEW 실거래 기준');
      expect(basisCard.textContent).toContain('14.5억원');
      // 70% LTV of 14.5억원 (145,000 * 0.7 = 101,500만원 -> 10.2억원)
      expect(screen.getByTestId('mortgage-step1-live-summary').textContent).toContain('10.2억원');
    });

    // 3. Close modal (!isOpen) and reopen without initial props -> must reset selectedApt, searchQuery, standalone budget, and annualIncome ('7,500')
    calcRender.rerender(
      <PWAProvider>
        <MortgageCalculator
          isOpen={false}
          onClose={() => {}}
          initialAptName={undefined}
          initialPriceManwon={undefined}
          initialAnnualIncomeManwon={undefined}
          sheetApartments={sheetApartmentsFixture}
          txSummaryData={txSummaryFixture}
          nameMapping={{}}
          fieldReportsMap={new Map()}
        />
      </PWAProvider>
    );

    calcRender.rerender(
      <PWAProvider>
        <MortgageCalculator
          isOpen={true}
          onClose={() => {}}
          initialAptName={undefined}
          initialPriceManwon={undefined}
          initialAnnualIncomeManwon={undefined}
          sheetApartments={sheetApartmentsFixture}
          txSummaryData={txSummaryFixture}
          nameMapping={{}}
          fieldReportsMap={new Map()}
        />
      </PWAProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('mortgage-price-basis-card').textContent).toContain(
        '위 목록에서 단지를 선택해 주세요'
      );
      expect(screen.queryByTestId('mortgage-step1-live-summary')).toBeNull();
    });
    const searchInput = screen.getByPlaceholderText(
      '단지명 또는 동 검색 (예: 힐스테이트, 여울동)'
    ) as HTMLInputElement;
    expect(searchInput.value).toBe('');

    // Pick apartment and advance to Step 3 to verify annualIncome reset back to '7,500' (not leaked '10,000')
    const reopenedDropdown = screen.getByTestId('apt-search-dropdown');
    const reopenedLotteBtn = Array.from(reopenedDropdown.querySelectorAll('button')).find((btn) =>
      btn.textContent?.includes('동탄역롯데캐슬')
    )!;
    fireEvent.click(reopenedLotteBtn);
    fireEvent.click(screen.getByRole('button', { name: /다음 단계 \(가구 요건\)/ }));
    fireEvent.click(screen.getByRole('button', { name: /다음 단계 \(소득\/자산\)/ }));

    const incomeInput = screen.getByPlaceholderText('7,500') as HTMLInputElement;
    expect(incomeInput.value).toBe('7,500');

    calcRender.unmount();
  }, 15000);

  it('Round 2 #2b: resets PropertyTaxCalculator exclusiveArea (85㎡ 초과 -> 85㎡ 이하), selectedApt, searchQuery, and acquisitionPrice on close/reopen', async () => {
    const PropertyTaxCalculator = (await import('@/components/consumer/PropertyTaxCalculator'))
      .default;

    const txSummaryFixture = {
      동탄역롯데캐슬: {
        avg3MPrice: 145000,
        latestPrice: 148000,
        txCount: 12,
        dong: '오산동',
      },
    };
    const sheetApartmentsFixture = {
      오산동: [{ name: '동탄역롯데캐슬', dong: '오산동', householdCount: 940 }],
    };

    const taxRender = render(
      <PropertyTaxCalculator
        isOpen={true}
        onClose={() => {}}
        initialAptName={undefined}
        initialPriceManwon={90000}
        initialAreaOver85={true}
        sheetApartments={sheetApartmentsFixture}
        txSummaryData={txSummaryFixture}
        nameMapping={{}}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('tax-standalone-budget-banner').textContent).toContain(
        '선택 예산 기준 시뮬레이션 (단지 미선택)'
      );
    });
    const priceInputOpen1 = screen.getByPlaceholderText('예: 75,000') as HTMLInputElement;
    expect(priceInputOpen1.value).toBe('90,000');
    const over85BtnOpen1 = screen.getByRole('button', { name: '전용 85㎡ 초과 (농특별세 0.2%)' });
    expect(over85BtnOpen1.className).toContain('border-blue-600');

    // Close modal (!isOpen) and reopen with initialAreaOver85={undefined} & no price
    taxRender.rerender(
      <PropertyTaxCalculator
        isOpen={false}
        onClose={() => {}}
        initialAptName={undefined}
        initialPriceManwon={undefined}
        initialAreaOver85={undefined}
        sheetApartments={sheetApartmentsFixture}
        txSummaryData={txSummaryFixture}
        nameMapping={{}}
      />
    );

    taxRender.rerender(
      <PropertyTaxCalculator
        isOpen={true}
        onClose={() => {}}
        initialAptName={undefined}
        initialPriceManwon={undefined}
        initialAreaOver85={undefined}
        sheetApartments={sheetApartmentsFixture}
        txSummaryData={txSummaryFixture}
        nameMapping={{}}
      />
    );

    await waitFor(() => {
      expect(screen.queryByTestId('tax-standalone-budget-banner')).toBeNull();
      expect(screen.queryByPlaceholderText('예: 75,000')).toBeNull();
    });
    const aptSearchInput = screen.getByPlaceholderText(
      '단지명 검색 (예: 동탄역 시범)'
    ) as HTMLInputElement;
    expect(aptSearchInput.value).toBe('');

    // Select an apartment -> exclusiveArea must default cleanly to '85under' (not stuck on '85over')
    fireEvent.click(screen.getByRole('button', { name: /동탄역롯데캐슬/ }));
    const under85BtnReopen = screen.getByRole('button', {
      name: '전용 85㎡ 이하 (농특별세 면제)',
    });
    const over85BtnReopen = screen.getByRole('button', {
      name: '전용 85㎡ 초과 (농특별세 0.2%)',
    });
    expect(under85BtnReopen.className).toContain('border-blue-600');
    expect(over85BtnReopen.className).not.toContain('border-blue-600');

    // Also verify explicit initialAreaOver85={false} overrides cached quiz answers
    window.localStorage.setItem(
      'drive_quiz_answers',
      JSON.stringify({
        value: {
          family: 'middleHigh',
          budget: '12eok',
          workplace: 'gangnam',
          investmentStyle: 'live',
        },
        expiry: Date.now() + 60_000,
      })
    );

    taxRender.rerender(
      <PropertyTaxCalculator
        isOpen={false}
        onClose={() => {}}
        sheetApartments={sheetApartmentsFixture}
        txSummaryData={txSummaryFixture}
        nameMapping={{}}
      />
    );
    taxRender.rerender(
      <PropertyTaxCalculator
        isOpen={true}
        onClose={() => {}}
        initialAptName="동탄역롯데캐슬"
        initialAreaOver85={false}
        sheetApartments={sheetApartmentsFixture}
        txSummaryData={txSummaryFixture}
        nameMapping={{}}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: '전용 85㎡ 이하 (농특별세 면제)' }).className
      ).toContain('border-blue-600');
    });

    taxRender.unmount();
  }, 15000);

  it('Round 2 #4: persists context in sessionStorage (60s TTL + try/catch), deduplicates open_calculator across drawer -> /?calc= escalation, and fires url_query_deep_link on cold /?calc= visits with query overrides', async () => {
    const DashboardClient = (await import('@/components/DashboardClient')).default;
    const { SettingsProvider } = await import('@/contexts/SettingsContext');
    const { AuthProvider } = await import('@/contexts/AuthContext');
    const { PWAProvider } = await import('@/components/pwa/PWAProvider');
    const {
      PENDING_CALC_STORAGE_KEY,
      persistPendingCalculatorContext,
      consumePendingCalculatorContext,
    } = await import('@/lib/utils/pendingCalculatorContext');

    // 1. Storage exception safety (SecurityError in private mode)
    const setItemSpy = jest
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementationOnce(() => {
        throw new Error('QuotaExceededError');
      });
    expect(() =>
      persistPendingCalculatorContext({ priceManwon: 85000, annualIncomeManwon: 9000 })
    ).not.toThrow();
    expect(consumePendingCalculatorContext()?.priceManwon).toBe(85000);
    setItemSpy.mockRestore();

    // 2. Guide surface: select [9억] + [소득 1억], open drawer (fires open_calculator ONCE), then click deepLinkHref (/?calc=mortgage)
    window.history.replaceState({}, '', '/guide/dongtan-budget-tier-ranking');
    const guideBridge = render(
      <InlineMortgageDsrBridge
        apartmentName="동탄역롯데캐슬"
        canonicalSlug="동탄역롯데캐슬"
        dong="오산동"
        benchmarkPriceManwon={145000}
        guideSlug="dongtan-budget-tier-ranking"
        surface="guide_top_summary"
        trigger="guide_budget_bridge"
      />
    );

    fireEvent.click(guideBridge.getByRole('button', { name: '9억' }));
    fireEvent.click(guideBridge.getByRole('button', { name: '소득 1억' }));
    fireEvent.click(guideBridge.getByTestId('inline-mortgage-dsr-open-btn'));

    expect(
      trackEventSpy.mock.calls.filter(([name]) => name === 'open_calculator')
    ).toHaveLength(1);

    const deepLinkAnchor = guideBridge.getByTestId('inline-calc-deep-link-cta') as HTMLAnchorElement;
    // deepLinkHref stays clean without noisy query params
    expect(deepLinkAnchor.getAttribute('href')).toBe('/?calc=mortgage');

    deepLinkAnchor.addEventListener('click', (e) => e.preventDefault(), { once: true });
    fireEvent.click(deepLinkAnchor);

    const rawStored = window.sessionStorage.getItem(PENDING_CALC_STORAGE_KEY);
    expect(rawStored).not.toBeNull();
    const parsedStored = JSON.parse(rawStored!);
    expect(parsedStored).toEqual(
      expect.objectContaining({
        priceManwon: 90000,
        annualIncomeManwon: 10000,
        alreadyTrackedOpen: true,
      })
    );
    expect(parsedStored.aptName).toBeUndefined();
    guideBridge.unmount();

    // Simulate hard/cross-route navigation where window memory is cleared and only sessionStorage survives
    window.__dviewPendingCalculatorContext = undefined;
    window.history.replaceState({}, '', '/?calc=mortgage');

    const dashRender = render(
      <SettingsProvider>
        <AuthProvider>
          <PWAProvider>
            <DashboardClient
              initialDashboardData={{
                txSummary: {
                  동탄역롯데캐슬: {
                    avg3MPrice: 145000,
                    latestPrice: 148000,
                    txCount: 12,
                    dong: '오산동',
                  },
                },
                sheetApartments: {
                  오산동: [{ name: '동탄역롯데캐슬', dong: '오산동', householdCount: 940 }],
                },
              }}
            />
          </PWAProvider>
        </AuthProvider>
      </SettingsProvider>
    );

    // Must NOT emit a second duplicate open_calculator, AND must hydrate standalone 9.0억 + 1억 income from sessionStorage!
    await waitFor(() => {
      expect(screen.getByTestId('mortgage-price-basis-card').textContent).toContain(
        '선택 예산 기준 시뮬레이션 (단지 미선택)'
      );
      expect(screen.getByTestId('mortgage-price-basis-card').textContent).toContain('9.0억원');
      expect(screen.getByTestId('mortgage-step1-live-summary').textContent).toContain(
        '연소득 1억원 기준 즉시 한도·상환 프리뷰'
      );
      expect(window.location.search).toBe('');
      expect(window.sessionStorage.getItem(PENDING_CALC_STORAGE_KEY)).toBeNull();
    });
    expect(
      trackEventSpy.mock.calls.filter(([name]) => name === 'open_calculator')
    ).toHaveLength(1);

    // Close modal before testing cold ?calc= visit with expired sessionStorage + query overrides
    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    await waitFor(() => {
      expect(screen.queryByTestId('mortgage-price-basis-card')).toBeNull();
    });

    // 3. Expired sessionStorage (>60s) must be ignored; cold ?calc=mortgage&price=60000&income=6000 MUST fire url_query_deep_link
    window.sessionStorage.setItem(
      PENDING_CALC_STORAGE_KEY,
      JSON.stringify({
        priceManwon: 150000,
        annualIncomeManwon: 12000,
        alreadyTrackedOpen: true,
        timestamp: Date.now() - 65_000,
      })
    );

    act(() => {
      window.history.pushState({}, '', '/?calc=mortgage&price=60000&income=6000');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('mortgage-price-basis-card').textContent).toContain('6.0억원');
      expect(screen.getByTestId('mortgage-step1-live-summary').textContent).toContain(
        '연소득 6,000만원 기준 즉시 한도·상환 프리뷰'
      );
      expect(window.location.search).toBe('');
    });

    const openCalcCalls = trackEventSpy.mock.calls.filter(([name]) => name === 'open_calculator');
    expect(openCalcCalls).toHaveLength(2);
    expect(openCalcCalls[1][1]).toEqual(
      expect.objectContaining({
        calculator_type: 'mortgage',
        surface: 'dashboard_deep_link',
        trigger: 'url_query_deep_link',
      })
    );

    dashRender.unmount();
  }, 20000);

  it('Round 2 #3: hands off pending calculator context (priceManwon, annualIncomeManwon, areaOver85, trigger) inside ExploreClient split-view ApartmentModal', async () => {
    const ExploreClient = (await import('@/app/explore/ExploreClient')).default;
    const { SettingsProvider } = await import('@/contexts/SettingsContext');
    const { AuthProvider } = await import('@/contexts/AuthContext');
    const { PWAProvider } = await import('@/components/pwa/PWAProvider');
    const { persistPendingCalculatorContext } = await import(
      '@/lib/utils/pendingCalculatorContext'
    );

    window.history.replaceState(
      {},
      '',
      `/explore#apt=${encodeURIComponent('동탄역롯데캐슬')}`
    );

    const exploreRender = render(
      <SettingsProvider>
        <AuthProvider>
          <PWAProvider>
            <ExploreClient
              initialDashboardData={{
                txSummary: {
                  동탄역롯데캐슬: {
                    avg3MPrice: 145000,
                    latestPrice: 148000,
                    txCount: 12,
                    dong: '오산동',
                  },
                },
                sheetApartments: {
                  오산동: [{ name: '동탄역롯데캐슬', dong: '오산동', householdCount: 940 }],
                },
              }}
            />
          </PWAProvider>
        </AuthProvider>
      </SettingsProvider>
    );

    // Wait for split-view ApartmentModal + InlineMortgageDsrBridge to mount
    let modalBridge: HTMLElement | undefined;
    await waitFor(() => {
      modalBridge = screen
        .getAllByTestId('inline-mortgage-dsr-bridge')
        .find((el) => el.getAttribute('data-surface') === 'apartment_modal_top');
      expect(modalBridge).toBeDefined();
    });

    // 1. Select '소득 1억' on modal bridge and click mortgage CTA -> ExploreClient forwards trigger + price + income to MortgageCalculator
    const income1EokBtn = Array.from(modalBridge!.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === '소득 1억'
    )!;
    fireEvent.click(income1EokBtn);

    const openMortgageBtn = modalBridge!.querySelector(
      '[data-testid="inline-mortgage-dsr-open-btn"]'
    ) as HTMLButtonElement;
    fireEvent.click(openMortgageBtn);

    await waitFor(() => {
      expect(trackEventSpy).toHaveBeenCalledWith(
        'open_calculator',
        expect.objectContaining({
          calculator_type: 'mortgage',
          apartment_name: '동탄역롯데캐슬',
          surface: 'explore_modal',
          trigger: 'apartment_modal_top_bridge',
        })
      );
      expect(screen.getByTestId('mortgage-price-basis-card').textContent).toContain('14.8억원');
      expect(screen.getByTestId('mortgage-step1-live-summary').textContent).toContain(
        '연소득 1억원 즉시 프리뷰'
      );
    });

    fireEvent.click(screen.getByRole('button', { name: '주택담보대출 계산기 창 닫기' }));
    await waitFor(() => {
      expect(screen.queryByTestId('mortgage-price-basis-card')).toBeNull();
    });

    // 2. Open PropertyTaxCalculator with pending context (areaOver85: true, priceManwon: 148000) via ExploreClient modal header/bridge
    persistPendingCalculatorContext({
      aptName: '동탄역롯데캐슬',
      priceManwon: 148000,
      areaOver85: true,
    });

    // Trigger header tool menu tax calculator (verifying fallback trigger: 'header_tool_menu' AND pending context consumption)
    const toolMenuTrigger = screen.getByRole('button', { name: /분석 및 금융 도구/i });
    fireEvent.click(toolMenuTrigger);
    const taxButtons = await screen.findAllByRole('button', { name: /^취득세 계산기$/ });
    const headerTaxBtn = taxButtons.find((btn) => !btn.hasAttribute('data-testid'))!;
    expect(headerTaxBtn).toBeDefined();
    fireEvent.click(headerTaxBtn);

    await waitFor(() => {
      expect(trackEventSpy).toHaveBeenCalledWith(
        'open_calculator',
        expect.objectContaining({
          calculator_type: 'property_tax',
          apartment_name: '동탄역롯데캐슬',
          surface: 'explore_modal',
          trigger: 'header_tool_menu',
        })
      );
      const priceInput = screen.getByPlaceholderText('예: 75,000') as HTMLInputElement;
      expect(priceInput.value).toBe('148,000');
      expect(
        screen.getByRole('button', { name: '전용 85㎡ 초과 (농특별세 0.2%)' }).className
      ).toContain('border-blue-600');
    });

    exploreRender.unmount();
  }, 20000);

  it('Round 2 Challenger #1: isolates pendingCalculatorContext against cross-apartment and standalone-budget contamination on DashboardClient and ExploreClient', async () => {
    const DashboardClient = (await import('@/components/DashboardClient')).default;
    const ExploreClient = (await import('@/app/explore/ExploreClient')).default;
    const { SettingsProvider } = await import('@/contexts/SettingsContext');
    const { AuthProvider } = await import('@/contexts/AuthContext');
    const { PWAProvider } = await import('@/components/pwa/PWAProvider');
    const { persistPendingCalculatorContext } = await import(
      '@/lib/utils/pendingCalculatorContext'
    );

    const sharedData = {
      txSummary: {
        동탄역롯데캐슬: {
          avg3MPrice: 145000,
          latestPrice: 148000,
          txCount: 12,
          dong: '오산동',
        },
        동탄역시범더샵센트럴시티: {
          avg3MPrice: 85000,
          latestPrice: 87000,
          txCount: 9,
          dong: '청계동',
        },
      },
      sheetApartments: {
        오산동: [{ name: '동탄역롯데캐슬', dong: '오산동', householdCount: 940 }],
        청계동: [{ name: '동탄역시범더샵센트럴시티', dong: '청계동', householdCount: 874 }],
      },
    };

    // 1. Stale standalone 6억 context (alreadyTrackedOpen: true) in sessionStorage must NOT corrupt Apartment B's 8.5억 MOLIT price or suppress deep-link tracking
    persistPendingCalculatorContext({
      priceManwon: 60000,
      annualIncomeManwon: 6000,
      areaOver85: true,
      alreadyTrackedOpen: true,
    });
    window.__dviewPendingCalculatorContext = undefined;
    window.history.replaceState(
      {},
      '',
      `/apartment/${encodeURIComponent('동탄역시범더샵센트럴시티')}?calc=mortgage`
    );

    const dashAptRender = render(
      <SettingsProvider>
        <AuthProvider>
          <PWAProvider>
            <DashboardClient
              preselectedAptName="동탄역시범더샵센트럴시티"
              isInlineApartmentPage={true}
              initialDashboardData={sharedData}
            />
          </PWAProvider>
        </AuthProvider>
      </SettingsProvider>
    );

    await waitFor(() => {
      const basisCard = screen.getByTestId('mortgage-price-basis-card');
      expect(basisCard.textContent).toContain('8.5억원');
      expect(basisCard.textContent).toContain('D-VIEW 실거래 기준');
      expect(basisCard.textContent).not.toContain('6.0억원');
      expect(screen.getByTestId('mortgage-step1-live-summary').textContent).toContain(
        '연소득 7,500만원 즉시 프리뷰'
      );
    });
    expect(
      trackEventSpy.mock.calls.filter(
        ([name, params]) =>
          name === 'open_calculator' &&
          (params as Record<string, unknown>)?.trigger === 'url_query_deep_link'
      )
    ).toHaveLength(1);
    dashAptRender.unmount();

    // 2. Stale Apartment A context (148,000만원, areaOver85: true) must NOT leak onto Apartment B (85,000만원, 85㎡ 이하) in ExploreClient modal
    persistPendingCalculatorContext({
      aptName: '동탄역롯데캐슬',
      priceManwon: 148000,
      annualIncomeManwon: 10000,
      areaOver85: true,
    });
    window.history.replaceState(
      {},
      '',
      `/explore#apt=${encodeURIComponent('동탄역시범더샵센트럴시티')}`
    );

    const exploreRender = render(
      <SettingsProvider>
        <AuthProvider>
          <PWAProvider>
            <ExploreClient initialDashboardData={sharedData} />
          </PWAProvider>
        </AuthProvider>
      </SettingsProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /분석 및 금융 도구/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /분석 및 금융 도구/i }));
    const taxButtons = await screen.findAllByRole('button', { name: /^취득세 계산기$/ });
    const headerTaxBtn = taxButtons.find((btn) => !btn.hasAttribute('data-testid'))!;
    fireEvent.click(headerTaxBtn);

    await waitFor(() => {
      const priceInput = screen.getByPlaceholderText('예: 75,000') as HTMLInputElement;
      expect(priceInput.value).toBe('85,000');
      expect(
        screen.getByRole('button', { name: '전용 85㎡ 이하 (농특별세 면제)' }).className
      ).toContain('border-blue-600');
    });

    exploreRender.unmount();
  }, 25000);

  it('Round 2 Challenger #2: enforces Strict Real Data Only on 0-tx complexes, displays true commercial DSR 40% limit on policy loans, and syncs 40Y maturity', async () => {
    const MortgageCalculator = (await import('@/components/consumer/MortgageCalculator')).default;
    const { PWAProvider } = await import('@/components/pwa/PWAProvider');

    const sheetApartmentsFixture = {
      오산동: [
        { name: '신규무거래단지', dong: '오산동', householdCount: 500 },
        { name: '동탄역롯데캐슬', dong: '오산동', householdCount: 940 },
      ],
    };
    const txSummaryFixture = {
      동탄역롯데캐슬: {
        avg3MPrice: 145000,
        latestPrice: 148000,
        txCount: 12,
        dong: '오산동',
      },
    };

    // 1. 0-tx complex in 오산동 must NOT fabricate 9.5억 dong Mock price
    const calcRender = render(
      <PWAProvider>
        <MortgageCalculator
          isOpen={true}
          onClose={() => {}}
          sheetApartments={sheetApartmentsFixture}
          txSummaryData={txSummaryFixture}
          nameMapping={{}}
          fieldReportsMap={new Map()}
        />
      </PWAProvider>
    );

    const dropdown = screen.getByTestId('apt-search-dropdown');
    const zeroTxBtn = Array.from(dropdown.querySelectorAll('button')).find((btn) =>
      btn.textContent?.includes('신규무거래단지')
    )!;
    expect(zeroTxBtn).toBeDefined();
    expect(zeroTxBtn.textContent).toContain('실거래 없음');
    expect(zeroTxBtn.textContent).not.toContain('9.5억');

    fireEvent.click(zeroTxBtn);
    await waitFor(() => {
      const basisCard = screen.getByTestId('mortgage-price-basis-card');
      expect(basisCard.textContent).toContain('등록된 실거래 내역이 없습니다.');
      expect(basisCard.textContent).toContain('실거래 미신고');
      expect(basisCard.textContent).not.toContain('D-VIEW 실거래 기준');
      expect(screen.queryByTestId('mortgage-step1-live-summary')).toBeNull();
    });

    // Clicking quick '9억' preset on 0-tx card transitions cleanly into standalone budget mode
    fireEvent.click(
      within(screen.getByTestId('mortgage-price-basis-card')).getByRole('button', { name: '9억' })
    );
    await waitFor(() => {
      expect(screen.getByTestId('mortgage-price-basis-card').textContent).toContain(
        '선택 예산 기준 시뮬레이션 (단지 미선택)'
      );
      expect(screen.getByTestId('mortgage-price-basis-card').textContent).toContain('9.0억원');
    });

    // 2. Policy loan ([6억] + 소득 6,000만) must show true commercial Stress DSR 40% (~4.1억), NOT policy DTI 60% (6.2억)
    calcRender.rerender(
      <PWAProvider>
        <MortgageCalculator
          isOpen={false}
          onClose={() => {}}
          sheetApartments={sheetApartmentsFixture}
          txSummaryData={txSummaryFixture}
          nameMapping={{}}
          fieldReportsMap={new Map()}
        />
      </PWAProvider>
    );
    calcRender.rerender(
      <PWAProvider>
        <MortgageCalculator
          isOpen={true}
          onClose={() => {}}
          initialPriceManwon={60000}
          initialAnnualIncomeManwon={6000}
          sheetApartments={sheetApartmentsFixture}
          txSummaryData={txSummaryFixture}
          nameMapping={{}}
          fieldReportsMap={new Map()}
        />
      </PWAProvider>
    );

    await waitFor(() => {
      const liveSummary = screen.getByTestId('mortgage-step1-live-summary');
      expect(liveSummary.textContent).not.toContain('6.2억원');
      expect(liveSummary.textContent).toContain('4.1억원');
    });

    // 3. 40Y product ([12억] + 소득 8,000만) syncs maturityYears to 40 and exposes '40년' toggle in Step 4
    calcRender.rerender(
      <PWAProvider>
        <MortgageCalculator
          isOpen={false}
          onClose={() => {}}
          sheetApartments={sheetApartmentsFixture}
          txSummaryData={txSummaryFixture}
          nameMapping={{}}
          fieldReportsMap={new Map()}
        />
      </PWAProvider>
    );
    calcRender.rerender(
      <PWAProvider>
        <MortgageCalculator
          isOpen={true}
          onClose={() => {}}
          initialPriceManwon={120000}
          initialAnnualIncomeManwon={8000}
          sheetApartments={sheetApartmentsFixture}
          txSummaryData={txSummaryFixture}
          nameMapping={{}}
          fieldReportsMap={new Map()}
        />
      </PWAProvider>
    );

    fireEvent.click(await screen.findByTestId('mortgage-jump-step4-btn'));
    const maturity40Btn = await screen.findByRole('button', { name: '40년' });
    expect(maturity40Btn.className).toContain('bg-blue-600');

    // Re-targeting initialPriceManwon while Step 4 is open resets modal back to STEP 1 / 4
    calcRender.rerender(
      <PWAProvider>
        <MortgageCalculator
          isOpen={true}
          onClose={() => {}}
          initialPriceManwon={90000}
          initialAnnualIncomeManwon={10000}
          sheetApartments={sheetApartmentsFixture}
          txSummaryData={txSummaryFixture}
          nameMapping={{}}
          fieldReportsMap={new Map()}
        />
      </PWAProvider>
    );
    await waitFor(() => {
      expect(screen.getByText('STEP 1 / 4')).toBeInTheDocument();
      expect(screen.getByTestId('mortgage-price-basis-card').textContent).toContain('9.0억원');
    });

    calcRender.unmount();
  }, 15000);

  it('Round 2 Challenger #3: clears acquisitionPrice without false standalone banner when clearing selectedApt and handles 0-tx complexes in PropertyTaxCalculator', async () => {
    const PropertyTaxCalculator = (await import('@/components/consumer/PropertyTaxCalculator'))
      .default;

    const sheetApartmentsFixture = {
      오산동: [
        { name: '신규무거래단지', dong: '오산동', householdCount: 500 },
        { name: '동탄역롯데캐슬', dong: '오산동', householdCount: 940 },
      ],
    };
    const txSummaryFixture = {
      동탄역롯데캐슬: {
        avg3MPrice: 145000,
        latestPrice: 148000,
        txCount: 12,
        dong: '오산동',
      },
    };

    const taxRender = render(
      <PropertyTaxCalculator
        isOpen={true}
        onClose={() => {}}
        initialAptName="동탄역롯데캐슬"
        sheetApartments={sheetApartmentsFixture}
        txSummaryData={txSummaryFixture}
        nameMapping={{}}
      />
    );

    await waitFor(() => {
      expect((screen.getByPlaceholderText('예: 75,000') as HTMLInputElement).value).toBe('145,000');
    });

    // Clearing the apartment input via 'X' button must reset acquisitionPrice and NOT pop up false standalone budget banner
    fireEvent.click(screen.getByRole('button', { name: '검색어 지우기' }));
    await waitFor(() => {
      expect(screen.queryByTestId('tax-standalone-budget-banner')).toBeNull();
      expect(screen.queryByPlaceholderText('예: 75,000')).toBeNull();
    });

    // Selecting 0-tx complex shows honest notice with empty price input (never fabricated 95,000만원)
    fireEvent.click(screen.getByRole('button', { name: /신규무거래단지/ }));
    await waitFor(() => {
      expect(screen.getByTestId('tax-no-real-tx-banner').textContent).toContain(
        '등록된 실거래 내역이 없습니다.'
      );
      expect((screen.getByPlaceholderText('예: 75,000') as HTMLInputElement).value).toBe('');
    });

    taxRender.unmount();
  }, 15000);

  it('Round 2 Challenger #4: supports /explore?calc= deep links and tracks open_calculator on /explore catalog quick-pills', async () => {
    const ExploreClient = (await import('@/app/explore/ExploreClient')).default;
    const { SettingsProvider } = await import('@/contexts/SettingsContext');
    const { AuthProvider } = await import('@/contexts/AuthContext');
    const { PWAProvider } = await import('@/components/pwa/PWAProvider');

    window.history.replaceState({}, '', '/explore?calc=mortgage&price=90000&income=10000');

    const exploreRender = render(
      <SettingsProvider>
        <AuthProvider>
          <PWAProvider>
            <ExploreClient
              initialDashboardData={{
                txSummary: {
                  동탄역롯데캐슬: {
                    avg3MPrice: 145000,
                    latestPrice: 148000,
                    txCount: 12,
                    dong: '오산동',
                  },
                },
                sheetApartments: {
                  오산동: [{ name: '동탄역롯데캐슬', dong: '오산동', householdCount: 940 }],
                },
              }}
            />
          </PWAProvider>
        </AuthProvider>
      </SettingsProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('mortgage-price-basis-card').textContent).toContain(
        '선택 예산 기준 시뮬레이션 (단지 미선택)'
      );
      expect(screen.getByTestId('mortgage-price-basis-card').textContent).toContain('9.0억원');
      expect(screen.getByTestId('mortgage-step1-live-summary').textContent).toContain(
        '연소득 1억원 기준 즉시 한도·상환 프리뷰'
      );
      expect(window.location.search).toBe('');
    });
    expect(trackEventSpy).toHaveBeenCalledWith(
      'open_calculator',
      expect.objectContaining({
        calculator_type: 'mortgage',
        surface: 'explore_deep_link',
        trigger: 'url_query_deep_link',
      })
    );

    fireEvent.click(screen.getByRole('button', { name: '주택담보대출 계산기 창 닫기' }));
    await waitFor(() => {
      expect(screen.queryByTestId('mortgage-price-basis-card')).toBeNull();
    });

    // Click catalog quick-pill '취득세·중개보수' -> fires open_calculator with surface: 'explore_catalog', trigger: 'explore_quick_pill'
    const taxPill = await screen.findByRole('button', { name: '취득세·중개보수' });
    fireEvent.click(taxPill);

    await waitFor(() => {
      expect(screen.getByText('취득세 및 중개보수 계산기')).toBeInTheDocument();
      expect(trackEventSpy).toHaveBeenCalledWith(
        'open_calculator',
        expect.objectContaining({
          calculator_type: 'property_tax',
          surface: 'explore_catalog',
          trigger: 'explore_quick_pill',
        })
      );
    });

    exploreRender.unmount();
  }, 20000);
});
