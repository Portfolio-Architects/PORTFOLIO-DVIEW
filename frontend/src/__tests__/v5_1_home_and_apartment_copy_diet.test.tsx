import React from 'react';
import fs from 'fs';
import path from 'path';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SWRConfig } from 'swr';
import HomePage from '../app/page';
import OverviewPage from '../app/overview/page';
import ApartmentPage from '../app/apartment/[aptName]/page';
import { MacroHeader } from '../components/macro/components/MacroHeader';
import { HighCpcFinanceSection } from '../components/finance/HighCpcFinanceSection';
import { MortgageLdiSentinelCard } from '../components/apartment/chapters/MortgageLdiSentinelCard';
import { ApartmentModalTransactionsTable } from '../components/apartment/ApartmentModalTransactionsTable';
import JeonseSafetyReport from '../components/apartment-modal/JeonseSafetyReport';
import EducationAnalysisSection from '../components/apartment-modal/EducationAnalysisSection';
import InfraAnalysisSection from '../components/apartment-modal/InfraAnalysisSection';
import ScoutingReportDetailSection from '../components/apartment-modal/ScoutingReportDetailSection';
import AdvancedValuationMetrics from '../components/consumer/AdvancedValuationMetrics';
import { BUILD_VERSION } from '../lib/build-version';
import type { FieldReportData } from '../lib/DashboardFacade';
import * as dashboardDataService from '../lib/services/dashboardData';
import * as apartmentPageService from '../lib/services/apartmentPageService';
import {
  auditSeoSemanticContainer,
  checkCopyBudget,
  measureCopyLength,
} from '../lib/design-system/copyDiet';

jest.mock('../components/DashboardClient', () => {
  return function MockDashboardClient({
    preselectedAptName,
    hideHeader,
  }: {
    preselectedAptName?: string;
    hideHeader?: boolean;
  }) {
    return (
      <div data-testid="mock-dashboard-client" data-apt={preselectedAptName || ''}>
        {!hideHeader && <h1>D-VIEW 동탄 아파트 랩</h1>}
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
  usePathname: () => '/',
  redirect: jest.fn(),
  permanentRedirect: jest.fn(),
}));

const EMOJI_REGEX = /\p{Extended_Pictographic}/u;
const PROHIBITED_PALETTE_CLASS_REGEX =
  /\b(?:bg|text|border|ring)-(?:indigo|purple|violet|fuchsia|pink|rose|orange|amber|yellow|lime|teal|cyan|sky)-/i;
const SIGNAL_PILL_SELECTOR =
  'span.inline-flex.font-extrabold.tabular-nums.whitespace-nowrap.shrink-0.select-none';

async function renderResolvedHomePage() {
  const homeRootEl = (await HomePage()) as React.ReactElement<{
    children: React.ReactNode[];
  }>;
  const childrenArray = React.Children.toArray(homeRootEl.props.children);
  const resolvedNodes: React.ReactNode[] = [];

  for (const child of childrenArray) {
    if (
      React.isValidElement<{ children?: React.ReactElement }>(child) &&
      child.type === React.Suspense &&
      React.isValidElement(child.props.children) &&
      typeof child.props.children.type === 'function'
    ) {
      const loaderEl = child.props.children as React.ReactElement<Record<string, unknown>>;
      const loaderFn = loaderEl.type as (props: Record<string, unknown>) => Promise<React.ReactNode>;
      const resolvedChild = await loaderFn(loaderEl.props || {});
      resolvedNodes.push(<React.Fragment key="resolved-loader">{resolvedChild}</React.Fragment>);
    } else {
      resolvedNodes.push(child);
    }
  }

  return render(<>{resolvedNodes}</>);
}

async function renderResolvedOverviewPage() {
  const overviewRootEl = (await OverviewPage()) as React.ReactElement<{
    children: React.ReactNode[];
  }>;
  const childrenArray = React.Children.toArray(overviewRootEl.props.children);
  const resolvedNodes: React.ReactNode[] = [];

  for (const child of childrenArray) {
    if (
      React.isValidElement<{ children?: React.ReactElement }>(child) &&
      child.type === React.Suspense &&
      React.isValidElement(child.props.children) &&
      typeof child.props.children.type === 'function'
    ) {
      const loaderEl = child.props.children as React.ReactElement<Record<string, unknown>>;
      const loaderFn = loaderEl.type as (props: Record<string, unknown>) => Promise<React.ReactNode>;
      const resolvedChild = await loaderFn(loaderEl.props || {});
      resolvedNodes.push(<React.Fragment key="resolved-loader">{resolvedChild}</React.Fragment>);
    } else {
      resolvedNodes.push(child);
    }
  }

  return render(<>{resolvedNodes}</>);
}

describe('Ad Money v5.1: Main Home, Hero & Apartment Detail Copy Diet + Semantic SEO Dual-Layer', () => {
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
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_ADSENSE_CLIENT_ID: 'ca-pub-7704550771011130',
      NEXT_PUBLIC_ADSENSE_SLOT_GAP_EXPLORER: '2222222222',
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env = originalEnv;
  });

  describe('1. Top Hero & High-CPC Finance Micro-Copy Budgets', () => {
    it('enforces pageH1 (<=32) and sectionSubtitle (<=40) budgets on MacroHeader (with mounted MarketStats) and HighCpcFinanceSection', () => {
      const marketStatsKey = `/data/market-stats.json?v=${BUILD_VERSION}`;
      const { container: heroContainer, unmount: unmountHero } = render(
        <SWRConfig
          value={{
            provider: () => new Map(),
            fallback: {
              [marketStatsKey]: {
                apartmentCount: 185,
                saleTxCount: 65500,
                latestContractDate: '20261112',
                latestRegisteredDate: '20261113',
              },
            },
          }}
        >
          <MacroHeader macroTrendJsonLd={null} />
        </SWRConfig>
      );
      const h1 = heroContainer.querySelector('h1');
      expect(h1).not.toBeNull();
      const h1Check = checkCopyBudget(h1?.textContent || '', 'pageH1');
      expect(h1Check.withinBudget).toBe(true);
      expect(h1Check.hasVerboseEnding).toBe(false);

      // Verify mounted subtitle clauses fit sectionSubtitle (<=40 chars) with zero verbose endings or AI slogans
      expect(heroContainer.textContent).toContain('동탄 185개 단지 · 국토부 매매 실거래 65,500건');
      expect(heroContainer.textContent).toContain('11월 13일 국토부 등록 반영');
      expect(heroContainer.textContent).not.toContain('내 한도로 살 수 있는');
      expect(heroContainer.textContent).not.toContain('한도 매수 · 갈아타기 손익');
      expect(heroContainer.textContent).not.toContain('—');
      const strongSubtitleCheck = checkCopyBudget(
        '동탄 185개 단지 · 국토부 매매 실거래 65,500건',
        'sectionSubtitle'
      );
      expect(strongSubtitleCheck.withinBudget).toBe(true);
      expect(strongSubtitleCheck.hasVerboseEnding).toBe(false);

      const lightSubtitleWorstCaseCheck = checkCopyBudget(
        '오늘 신규 120건 · 신고가 45건 (12.31 07:00)',
        'sectionSubtitle'
      );
      expect(lightSubtitleWorstCaseCheck.withinBudget).toBe(true);
      expect(lightSubtitleWorstCaseCheck.hasVerboseEnding).toBe(false);
      unmountHero();

      const { container: finContainer, unmount: unmountFin } = render(
        <HighCpcFinanceSection apartmentName="동탄역롯데캐슬" defaultPriceWon={1_450_000_000} />
      );
      const finH2 = finContainer.querySelector('h2');
      const finSubtitle = finH2?.closest('div')?.parentElement?.querySelector('p');
      expect(finH2).not.toBeNull();
      expect(finSubtitle).not.toBeNull();

      const finTitleCheck = checkCopyBudget(finH2?.textContent || '', 'sectionTitle');
      expect(finTitleCheck.withinBudget).toBe(true);
      expect(finTitleCheck.hasVerboseEnding).toBe(false);

      const finSubCheck = checkCopyBudget(finSubtitle?.textContent || '', 'sectionSubtitle');
      expect(finSubCheck.withinBudget).toBe(true);
      expect(finSubCheck.hasVerboseEnding).toBe(false);
      expect(finContainer.querySelectorAll('.font-mono').length).toBe(0);
      unmountFin();
    });
  });

  describe('2. Main Home (page.tsx & overview/page.tsx) Dual-Layer Architecture & Edge Cases', () => {
    it('passes auditSeoSemanticContainer, collapses SSR prose into <details>, and enforces Layer 1 copy budgets on HomePage', async () => {
      const { container, unmount } = await renderResolvedHomePage();

      const audit = auditSeoSemanticContainer(container, { requireSingleH1: true });
      expect(audit.valid).toBe(true);
      expect(audit.violations).toEqual([]);
      expect(audit.accordionCount).toBeGreaterThanOrEqual(2);
      expect(audit.adSlotsInsideAccordionCount).toBe(0);
      expect(audit.illegalSrOnlyCount).toBe(0);
      expect(audit.illegalProseCloakingCount).toBe(0);

      // Every <details> on HomePage is collapsed by default and uses dview-seo-accordion
      const detailsList = Array.from(container.querySelectorAll('details'));
      for (const detailsEl of detailsList) {
        expect(detailsEl.hasAttribute('open')).toBe(false);
        expect(detailsEl.className).toContain('dview-seo-accordion');
        const summary = detailsEl.querySelector('summary');
        expect(summary).not.toBeNull();
        const summaryCheck = checkCopyBudget(summary?.textContent || '', 'accordionSummary');
        expect(summaryCheck.withinBudget).toBe(true);
        expect(summaryCheck.hasVerboseEnding).toBe(false);
      }

      // Catalog Layer 1 checks + canonical apartment anchors preserved inside Layer 2 <details>
      const catalog = container.querySelector('#home-ssr-semantic-catalog') as HTMLElement;
      expect(catalog).not.toBeNull();
      const catalogH2 = catalog.querySelector('header h2');
      const catalogSub = catalog.querySelector('header p');
      expect(checkCopyBudget(catalogH2?.textContent || '', 'sectionTitle').withinBudget).toBe(true);
      expect(checkCopyBudget(catalogSub?.textContent || '', 'sectionSubtitle').withinBudget).toBe(true);
      expect(catalog.querySelectorAll('details a[href^="/apartment/"]').length).toBeGreaterThanOrEqual(20);

      // Editorial Layer 1 headings & zone card descriptions obey copy budgets
      const editorial = container.querySelector('#home-ssr-market-editorial') as HTMLElement;
      expect(editorial).not.toBeNull();
      const layer1H3s = Array.from(editorial.querySelectorAll('h3')).filter(
        (el) => !el.closest('details')
      );
      expect(layer1H3s.length).toBeGreaterThanOrEqual(4);
      for (const h3 of layer1H3s) {
        const res = checkCopyBudget(h3.textContent || '', 'sectionTitle');
        expect(res.withinBudget).toBe(true);
        expect(res.hasVerboseEnding).toBe(false);
      }

      const zoneDescNodes = Array.from(editorial.querySelectorAll('a[href^="/zone/"] p'));
      expect(zoneDescNodes.length).toBe(7);
      for (const p of zoneDescNodes) {
        expect(checkCopyBudget(p.textContent || '', 'cardDescription').withinBudget).toBe(true);
      }

      const notifP = editorial.querySelector('#notification p');
      expect(checkCopyBudget(notifP?.textContent || '', 'sectionSubtitle').withinBudget).toBe(true);

      // Every signal pill (getVisualSignalPillClass) on HomePage obeys signalBadge (<=10 chars)
      const homeSignalPills = Array.from(container.querySelectorAll(SIGNAL_PILL_SELECTOR));
      expect(homeSignalPills.length).toBeGreaterThan(0);
      for (const pill of homeSignalPills) {
        const pillCheck = checkCopyBudget(pill.textContent || '', 'signalBadge');
        expect(pillCheck.withinBudget).toBe(true);
      }

      // Zero emojis, zero font-mono, zero prohibited palettes
      expect(EMOJI_REGEX.test(container.textContent || '')).toBe(false);
      expect(container.querySelectorAll('.font-mono').length).toBe(0);
      for (const el of Array.from(container.querySelectorAll('*'))) {
        if (typeof el.className === 'string') {
          expect(PROHIBITED_PALETTE_CLASS_REGEX.test(el.className)).toBe(false);
        }
      }

      unmount();
    });

    it('handles empty leaderboard and empty recentTransactions gracefully on BOTH HomePage and OverviewPage', async () => {
      const emptyData = {
        txSummary: {},
        recentTransactions: [],
        sheetApartments: {},
        macroTrend: [],
        fieldReports: [],
        railNotices: [],
        tramNotices: [],
        dongtanNotices: [],
      } as unknown as Awaited<ReturnType<typeof dashboardDataService.getInitialData>>;

      jest.spyOn(dashboardDataService, 'getInitialData').mockResolvedValueOnce(emptyData);

      const { container: emptyHomeContainer, unmount: unmountEmpty } = await renderResolvedHomePage();
      const emptyCatalog = emptyHomeContainer.querySelector('#home-ssr-semantic-catalog');
      expect(emptyCatalog).not.toBeNull();
      expect(emptyCatalog?.textContent).toContain('최근 등록 0건');
      expect(emptyCatalog?.textContent).toContain('등록된 실거래 내역이 없습니다.');
      expect(emptyCatalog?.textContent).not.toContain('NaN');
      expect(emptyCatalog?.textContent).not.toContain('undefined');
      unmountEmpty();

      jest.spyOn(dashboardDataService, 'getInitialData').mockResolvedValueOnce(emptyData);
      const { container: emptyOverviewContainer, unmount: unmountEmptyOverview } =
        await renderResolvedOverviewPage();
      const emptyOverviewCatalog = emptyOverviewContainer.querySelector(
        '#overview-ssr-semantic-catalog'
      );
      expect(emptyOverviewCatalog).not.toBeNull();
      expect(emptyOverviewCatalog?.textContent).toContain('등록된 실거래 내역이 없습니다.');
      unmountEmptyOverview();

      const { container: overviewContainer, unmount: unmountOverview } = await renderResolvedOverviewPage();
      const overviewAudit = auditSeoSemanticContainer(overviewContainer, { requireSingleH1: true });
      expect(overviewAudit.valid).toBe(true);
      expect(overviewContainer.querySelectorAll('#overview-ssr-semantic-catalog details').length).toBe(1);
      for (const pill of Array.from(overviewContainer.querySelectorAll(SIGNAL_PILL_SELECTOR))) {
        expect(checkCopyBudget(pill.textContent || '', 'signalBadge').withinBudget).toBe(true);
      }
      unmountOverview();
    });
  });

  describe('3. Apartment Detail Page (apartment/[aptName]/page.tsx) Dual-Layer, Visual Signals & Boundary Edge Cases', () => {
    it('passes auditSeoSemanticContainer, renders 3-second visual signal strip, and enforces Layer 1 copy budgets', async () => {
      const jsx = await ApartmentPage({
        params: Promise.resolve({ aptName: encodeURIComponent('동탄역롯데캐슬') }),
      });
      const { container, unmount } = render(jsx);

      const report = container.querySelector('#apt-ssr-comprehensive-report') as HTMLElement;
      expect(report).not.toBeNull();

      // Full page audit (ignoring MockDashboardClient H1 since hideHeader=true omits it, leaving ApartmentPage's single H1)
      const audit = auditSeoSemanticContainer(container, { requireSingleH1: true });
      expect(audit.valid).toBe(true);
      expect(audit.violations).toEqual([]);
      expect(audit.h1Count).toBe(1);
      expect(audit.h1InsideCollapsedAccordion).toBe(false);
      expect(audit.adSlotsInsideAccordionCount).toBe(0);
      expect(audit.illegalSrOnlyCount).toBe(0);
      expect(audit.illegalProseCloakingCount).toBe(0);
      expect(audit.accordionCount).toBeGreaterThanOrEqual(3);

      // Visual Signal Strip check
      const signalStrip = report.querySelector('[data-testid="apt-visual-signal-strip"]') as HTMLElement;
      expect(signalStrip).not.toBeNull();
      expect(signalStrip.children.length).toBe(4);
      const kpiLabels = ['최근 실거래', '전세가율 진단', '교통 · 초등학군', '세대 · 준공연식'];
      for (const label of kpiLabels) {
        expect(signalStrip.textContent).toContain(label);
        expect(checkCopyBudget(label, 'kpiLabel').withinBudget).toBe(true);
      }

      // Every <details> is collapsed by default and <summary> fits accordionSummary (<=30 chars)
      const detailsList = Array.from(report.querySelectorAll('details'));
      expect(detailsList.length).toBeGreaterThanOrEqual(3);
      for (const detailsEl of detailsList) {
        expect(detailsEl.hasAttribute('open')).toBe(false);
        expect(detailsEl.className).toContain('dview-seo-accordion');
        const summary = detailsEl.querySelector('summary');
        expect(summary).not.toBeNull();
        const summaryCheck = checkCopyBudget(summary?.textContent || '', 'accordionSummary');
        expect(summaryCheck.withinBudget).toBe(true);
        expect(summaryCheck.hasVerboseEnding).toBe(false);
      }

      // Every Layer 1 <h2> inside #apt-ssr-comprehensive-report fits sectionTitle (<=22 chars)
      const layer1H2s = Array.from(report.querySelectorAll('h2')).filter(
        (h2) => !h2.closest('details')
      );
      expect(layer1H2s.length).toBeGreaterThanOrEqual(5);
      for (const h2 of layer1H2s) {
        const res = checkCopyBudget(h2.textContent || '', 'sectionTitle');
        expect(res.withinBudget).toBe(true);
        expect(res.hasVerboseEnding).toBe(false);
      }

      // Mortgage inline notice fits inlineNotice (<=80 chars) without verbose prose ending
      const ch05Notice = report.querySelector('#chapter-05-mortgage-ssr > div > p');
      expect(ch05Notice).not.toBeNull();
      const ch05NoticeCheck = checkCopyBudget(ch05Notice?.textContent || '', 'inlineNotice');
      expect(ch05NoticeCheck.withinBudget).toBe(true);
      expect(ch05NoticeCheck.hasVerboseEnding).toBe(false);

      // Chapter 06 subtitle fits sectionSubtitle (<=40 chars)
      const ch06Sub = report.querySelector('#chapter-06-neighborhood-links-ssr > div > div > p');
      expect(ch06Sub).not.toBeNull();
      const ch06SubCheck = checkCopyBudget(ch06Sub?.textContent || '', 'sectionSubtitle');
      expect(ch06SubCheck.withinBudget).toBe(true);
      expect(ch06SubCheck.hasVerboseEnding).toBe(false);

      // Every signal pill (getVisualSignalPillClass) on ApartmentPage obeys signalBadge (<=10 chars)
      const aptSignalPills = Array.from(report.querySelectorAll(SIGNAL_PILL_SELECTOR));
      expect(aptSignalPills.length).toBeGreaterThanOrEqual(6);
      for (const pill of aptSignalPills) {
        const pillCheck = checkCopyBudget(pill.textContent || '', 'signalBadge');
        expect(pillCheck.withinBudget).toBe(true);
      }

      // Zero emojis, zero font-mono, zero prohibited palettes
      expect(EMOJI_REGEX.test(report.textContent || '')).toBe(false);
      expect(report.querySelectorAll('.font-mono').length).toBe(0);
      for (const el of Array.from(report.querySelectorAll('*'))) {
        if (typeof el.className === 'string') {
          expect(PROHIBITED_PALETTE_CLASS_REGEX.test(el.className)).toBe(false);
        }
      }

      unmount();
    });

    it('verifies longest 23-char complex name keeps all 5 table captions within tableCaption budget (<=60 chars)', async () => {
      const longestName = '산척동동탄호수공원금강펜테리움센트럴파크2';
      const jsx = await ApartmentPage({
        params: Promise.resolve({ aptName: encodeURIComponent(longestName) }),
      });
      const { container, unmount } = render(jsx);

      const audit = auditSeoSemanticContainer(container, { requireSingleH1: true });
      expect(audit.valid).toBe(true);

      const captions = Array.from(container.querySelectorAll('caption.sr-only'));
      expect(captions.length).toBe(5);
      for (const cap of captions) {
        expect(measureCopyLength(cap.textContent || '')).toBeLessThanOrEqual(60);
      }
      unmount();
    });

    it('verifies jeonse ratio 3-step visual gauge boundary values (0%, 59.9%, 60.0%, 70.0%) accurately', async () => {
      const realData = await apartmentPageService.getApartmentPageData('동탄역롯데캐슬');
      const boundaryCases = [
        { ratio: 0, expectedLabel: '산출 대기', activeBars: 0 },
        { ratio: 59.9, expectedLabel: '안전 구간', activeBars: 1 },
        { ratio: 60.0, expectedLabel: '적정 구간', activeBars: 2 },
        { ratio: 70.0, expectedLabel: '주의 구간', activeBars: 3 },
      ];

      for (const tc of boundaryCases) {
        const spy = jest.spyOn(apartmentPageService, 'getApartmentPageData').mockResolvedValueOnce({
          ...realData,
          analytics: {
            ...(realData.analytics || {
              salesVal: 145000,
              jeonseVal: 70000,
              gapManwon: 75000,
              gapStr: '7억 5,000만',
            }),
            ratioPercent: tc.ratio,
          },
        });

        const jsx = await ApartmentPage({
          params: Promise.resolve({ aptName: encodeURIComponent('동탄역롯데캐슬') }),
        });
        const { container, unmount } = render(jsx);

        const strip = container.querySelector('[data-testid="apt-visual-signal-strip"]') as HTMLElement;
        expect(strip.textContent).toContain(tc.expectedLabel);

        const gauge = container.querySelector('[data-testid="apt-jeonse-3step-gauge"]') as HTMLElement;
        const segments = Array.from(gauge.querySelectorAll('span'));
        expect(segments.length).toBe(3);
        const litCount = segments.filter((s) => !s.className.includes('bg-slate-200')).length;
        expect(litCount).toBe(tc.activeBars);

        unmount();
        spy.mockRestore();
      }
    });

    it('enforces Ad Money v5.1 Copy Diet, zero font-mono, zero raw ** markdown, and zero prohibited hex tokens on inline Apartment Detail chapter components', () => {
      const prohibitedInlineHexRegex =
        /#(?:fdf2f8|db2777|fbcfe8|fce7f3|fffbeb|fde68a|f59e0b|fefce8|ca8a04|fff7ed|ea580c|ffedd5)\b/i;

      const sampleReport: FieldReportData = {
        id: 'lot-1',
        dong: '오산동',
        apartmentName: '동탄역 롯데캐슬',
        author: 'D-VIEW',
        createdAt: '2026-11-01',
        likes: 12,
        commentCount: 3,
        metrics: {
          brand: '롯데캐슬',
          householdCount: 940,
          far: 450,
          bcr: 40,
          parkingPerHousehold: 1.54,
          yearBuilt: 2021,
          distanceToElementary: 240,
          distanceToMiddle: 480,
          distanceToHigh: 650,
          distanceToSubway: 180,
          nearestStationName: '동탄',
          nearestStationLine: 'GTX-A / SRT',
          nearestSchoolNames: {
            elementary: '청계초등학교',
            middle: '청계중학교',
            high: '동탄중앙고등학교',
          },
          academyDensity: 64,
          academyCategories: {
            입시보습: 34,
            음악미술: 18,
            태권도: 12,
          },
          restaurantDensity: 120,
          restaurantCategories: {
            한식: 50,
            카페: 40,
            일식: 30,
          },
        },
        sections: {
          specs: {
            builtYear: '2021년 07월 (5년차)',
            scale: '940세대 / 4개동',
            farBuild: '450% / 40%',
            parkingRatio: '1.54대 (지하 100%)',
          },
          infra: {
            gateText: '동탄역 직결 보행 통로와 맞닿은 대형 문주 설계로 보행 동선이 매우 쾌적합니다.',
            landscapeText: '지상 차 없는 공원형 단지 조경으로 단차가 없는 평지 지형입니다.',
            parkingText: '전 세대 지하주차장 직결 엘리베이터 및 광폭 주차구획이 확보되어 있습니다.',
            maintenanceText: '단지 외관 및 공용부 관리 상태 양호',
          },
          ecosystem: {
            schoolText: '단지 출입구에서 스쿨존 보행로를 통해 초등학교까지 안전하게 도보 통학이 가능합니다.',
            commerceText: '백화점 및 대형 스트리트 상권을 슬리퍼 생활권으로 누리는 핵심 입지입니다.',
            communityText: '피트니스 · 실내골프 · 작은도서관 등 커뮤니티 시설 운영',
          },
          location: {
            trafficText: 'GTX-A 및 SRT 동탄역 초역세권으로 강남·수서 접근성이 압도적입니다.',
            developmentText: '경부고속도로 지하화 상부 공원 연결 수혜가 직접 기대되는 권역입니다.',
          },
          assessment: {
            alphaDriver: 'GTX-A · SRT 복합환승센터 직결 역세권',
            systemicRisk: '광역 금리 변동에 따른 고가 단지 거래량 민감도',
            synthesis: '동탄2신도시 교통·상권 대장 단지로서 실거주 만족도와 환금성 모두 최상위 수준을 유지합니다.',
            probability: '광역 철도망 확충에 따른 탄탄한 대기 수요 기반 시세 방어 우수',
          },
        },
      };

      const { container, unmount } = render(
        <div>
          <MortgageLdiSentinelCard
            aptName="동탄역 롯데캐슬"
            dong="오산동"
            latestSalePrice={160000}
            latestDepositPrice={75000}
            jeonseRatio={46.9}
            householdCount={940}
            inline={true}
          />
          <JeonseSafetyReport
            aptName="동탄역 롯데캐슬"
            dong="오산동"
            ratio={0.68}
            latestPrice={160000}
            latestDeposit={108800}
            volume3M={8}
            householdCount={940}
          />
          <EducationAnalysisSection
            report={sampleReport}
            inline={true}
            copiedStatus={null}
            handleShareSection={jest.fn()}
            displayAptName="동탄역 롯데캐슬"
          />
          <InfraAnalysisSection
            report={sampleReport}
            inline={true}
            copiedStatus={null}
            handleShareSection={jest.fn()}
          />
          <ScoutingReportDetailSection report={sampleReport} inline={true} />
        </div>
      );

      // 1. Zero legacy font-mono classes
      expect(container.querySelectorAll('.font-mono').length).toBe(0);

      // 2. Zero raw Markdown **...** artifacts in rendered UI text
      expect(container.textContent).not.toContain('**');

      // 3. Zero prohibited pink/amber/yellow/orange hex tokens in class attributes
      expect(prohibitedInlineHexRegex.test(container.innerHTML)).toBe(false);

      // 4. Long prose blocks are cleanly collapsed inside native <details class="... dview-seo-accordion">
      const accordions = Array.from(container.querySelectorAll('details.dview-seo-accordion'));
      expect(accordions.length).toBeGreaterThanOrEqual(8);
      for (const acc of accordions) {
        expect(acc.hasAttribute('open')).toBe(false);
        const summary = acc.querySelector('summary');
        expect(summary).not.toBeNull();
        const summaryCheck = checkCopyBudget(summary?.textContent || '', 'accordionSummary');
        expect(summaryCheck.withinBudget).toBe(true);
        expect(summaryCheck.hasVerboseEnding).toBe(false);
      }

      unmount();
    });

    it('binds 100% real MOLIT recent-transactions.json prices, names, formatted dates, and canonical links on both HomePage and OverviewPage without emitting "정보 없음"', async () => {
      const homeRender = await renderResolvedHomePage();
      const homeCatalog = homeRender.container.querySelector('#home-ssr-semantic-catalog');
      expect(homeCatalog).not.toBeNull();
      const homeTables = homeCatalog!.querySelectorAll('table');
      expect(homeTables.length).toBe(2);
      const homeRecentRows = Array.from(homeTables[1].querySelectorAll('tbody tr'));
      expect(homeRecentRows.length).toBe(15);
      for (const row of homeRecentRows) {
        const text = row.textContent || '';
        expect(text).not.toContain('정보 없음');
        expect(text).toMatch(/억|만원/);
        expect(text).toMatch(/\d{4}\.\d{2}\.\d{2}/);
        const link = row.querySelector('a[href^="/apartment/"]');
        expect(link).not.toBeNull();
        expect(link?.getAttribute('href')).not.toContain('%20');
        expect(link?.textContent?.trim()).not.toBe('아파트');
      }
      homeRender.unmount();

      const overviewRender = await renderResolvedOverviewPage();
      const overviewCatalog = overviewRender.container.querySelector('#overview-ssr-semantic-catalog');
      expect(overviewCatalog).not.toBeNull();
      const overviewAccordion = overviewCatalog!.querySelector('details.dview-seo-accordion');
      expect(overviewAccordion).not.toBeNull();
      expect(overviewAccordion?.hasAttribute('open')).toBe(false);
      const top10Items = Array.from(overviewCatalog!.querySelectorAll('ol li'));
      const recent15Items = Array.from(overviewCatalog!.querySelectorAll('ul li'));
      expect(top10Items.length).toBe(10);
      expect(recent15Items.length).toBe(15);
      for (const li of recent15Items) {
        const text = li.textContent || '';
        expect(text).not.toContain('정보 없음');
        expect(text).toMatch(/억|만원/);
        expect(text).toMatch(/\(\d{4}\.\d{2}\.\d{2}\)/);
        const link = li.querySelector('a[href^="/apartment/"]');
        expect(link).not.toBeNull();
        expect(link?.getAttribute('href')).not.toContain('%20');
        expect(link?.textContent?.trim()).not.toBe('아파트');
      }
      overviewRender.unmount();
    });

    it('enforces Ad Money v5.1 Copy Diet, zero #f59e0b amber hexes, zero fabricated ad copy, and semantic <details> accordions on AdvancedValuationMetrics (including empty boundary)', () => {
      const prohibitedAmberRegex = /#f59e0b|amber-|orange-|yellow-/i;
      const fullReport: FieldReportData = {
        apartmentName: '동탄역 롯데캐슬 [여울동]',
        metrics: {
          brand: '롯데캐슬',
          householdCount: 940,
          parkingPerHousehold: 1.54,
          yearBuilt: 2021,
          distanceToSubway: 180,
          distanceToElementary: 240,
          distanceToMiddle: 480,
          distanceToHigh: 650,
          distanceToPark: 300,
          distanceToStarbucks: 150,
          distanceToOliveYoung: 180,
          distanceToTram: 220,
        },
      };
      const txs = [
        { price: 160000, dealType: '매매', contractYm: '202610', contractDay: '15' },
        { price: 158000, dealType: '매매', contractYm: '202609', contractDay: '20' },
        { price: 78000, dealType: '전세', deposit: 78000, contractYm: '202610', contractDay: '10' },
        { price: 76000, dealType: '전세', deposit: 76000, contractYm: '202609', contractDay: '12' },
      ];

      const { container, unmount } = render(
        <AdvancedValuationMetrics report={fullReport} transactions={txs} />
      );
      expect(container.querySelectorAll('.font-mono').length).toBe(0);
      expect(prohibitedAmberRegex.test(container.innerHTML)).toBe(false);
      expect(container.textContent).not.toContain('단독 제휴 우대상품');
      expect(container.textContent).not.toContain('[광고] D-VIEW 주택금융 파트너스');
      expect(container.querySelector('a[href="/guide/stress-dsr-valuation-guide"]')).not.toBeNull();

      const accordions = Array.from(container.querySelectorAll('details.dview-seo-accordion'));
      expect(accordions.length).toBeGreaterThanOrEqual(5);
      for (const acc of accordions) {
        expect(acc.hasAttribute('open')).toBe(false);
        const summary = acc.querySelector('summary');
        expect(summary).not.toBeNull();
        const summaryCheck = checkCopyBudget(summary?.textContent || '', 'accordionSummary');
        expect(summaryCheck.withinBudget).toBe(true);
        expect(summaryCheck.hasVerboseEnding).toBe(false);
      }
      unmount();

      // Empty transactions boundary
      const emptyRender = render(
        <AdvancedValuationMetrics report={{ apartmentName: '무거래테스트단지' }} transactions={[]} />
      );
      expect(emptyRender.container.textContent).toContain('가치평가 데이터 부족');
      expect(prohibitedAmberRegex.test(emptyRender.container.innerHTML)).toBe(false);
      emptyRender.unmount();
    });

    it('guards rent-only and non-existent ApartmentPage boundaries with zero NaN, zero 0만, zero illegal .sr-only, and zero AdSlot inside <details>', async () => {
      const rentOnlyJsx = await ApartmentPage({
        params: Promise.resolve({ aptName: '동탄파크릭스A51-1BL아파트' }),
      });
      const rentRender = render(rentOnlyJsx);
      const rentAudit = auditSeoSemanticContainer(rentRender.container, { requireSingleH1: true });
      expect(rentAudit.valid).toBe(true);
      expect(rentAudit.illegalSrOnlyCount).toBe(0);
      expect(rentAudit.illegalProseCloakingCount).toBe(0);
      expect(rentAudit.adSlotsInsideAccordionCount).toBe(0);
      expect(rentRender.container.textContent).not.toContain('NaN');
      expect(rentRender.container.textContent).not.toMatch(/(?:^|[^\d.,])0만/);
      rentRender.unmount();

      const ghostJsx = await ApartmentPage({
        params: Promise.resolve({ aptName: '존재하지않는유령단지_999' }),
      });
      const ghostRender = render(ghostJsx);
      const ghostAudit = auditSeoSemanticContainer(ghostRender.container, { requireSingleH1: true });
      expect(ghostAudit.valid).toBe(true);
      expect(ghostAudit.illegalSrOnlyCount).toBe(0);
      expect(ghostAudit.illegalProseCloakingCount).toBe(0);
      expect(ghostAudit.adSlotsInsideAccordionCount).toBe(0);
      expect(ghostRender.container.textContent).not.toContain('NaN');
      expect(ghostRender.container.textContent).not.toMatch(/(?:^|[^\d.,])0만/);
      ghostRender.unmount();
    });
  });

  describe('4. Challenger Regression Guards (Modal Markdown, Theme Tokens, Severity Tiers & Arbitrary Hex Purge)', () => {
    it('defines --color-toss-red and --color-toss-blue-light in globals.css @theme inline so utility classes resolve deterministically', () => {
      const globalsCss = fs.readFileSync(
        path.resolve(__dirname, '../app/globals.css'),
        'utf-8'
      );
      expect(globalsCss).toContain('--color-toss-red: var(--brand-red);');
      expect(globalsCss).toContain('--color-toss-blue-light: var(--brand-blue-light);');
    });

    it('renders AdvancedValuationMetrics modal without raw ** markdown, ASCII brackets, or legacy teal/mint hexes', () => {
      const legacyHexRegex = /#(?:046c66|04635e|e6f3f0|e6f7f3|fbbf24|042820|063b2f)\b/i;
      const report: FieldReportData = {
        apartmentName: '동탄역 롯데캐슬 [여울동]',
        metrics: {
          brand: '롯데캐슬',
          householdCount: 940,
          parkingPerHousehold: 1.54,
          yearBuilt: 2021,
          distanceToSubway: 180,
          distanceToElementary: 240,
          distanceToMiddle: 480,
          distanceToHigh: 650,
          distanceToPark: 300,
          distanceToStarbucks: 150,
          distanceToOliveYoung: 180,
          distanceToTram: 220,
        },
      };
      const txs = [
        { price: 160000, dealType: '매매', contractYm: '202610', contractDay: '15' },
        { price: 78000, dealType: '전세', deposit: 78000, contractYm: '202610', contractDay: '10' },
      ];

      const { container, getByRole, unmount } = render(
        <AdvancedValuationMetrics report={report} transactions={txs} />
      );
      expect(container.textContent).not.toContain('[ 가치평가 상세분석 및 계산법 보기 ]');
      expect(legacyHexRegex.test(container.innerHTML)).toBe(false);

      const modalTrigger = getByRole('button', { name: /가치평가 상세분석 및 계산법 보기/ });
      fireEvent.click(modalTrigger);

      expect(container.textContent).toContain('종합 가치평가 상세 분석');
      expect(container.textContent).not.toContain('**');
      expect(legacyHexRegex.test(container.innerHTML)).toBe(false);
      unmount();
    });

    it('differentiates moderate (+1.0%p/+1.5%p) vs severe (+2.0%p/+3.0%p) rate shock cards in MortgageLdiSentinelCard', () => {
      const { getByTestId, unmount } = render(
        <MortgageLdiSentinelCard
          aptName="동탄역 롯데캐슬"
          dong="오산동"
          latestSalePrice={160000}
          latestDepositPrice={75000}
          jeonseRatio={46.9}
          householdCount={940}
          inline={true}
        />
      );
      const cardModerate = getByTestId('rate-shock-card-1');
      const cardSevere = getByTestId('rate-shock-card-2');
      expect(cardModerate.className).toContain('bg-slate-50/90');
      expect(cardSevere.className).toContain('bg-red-50/60');
      expect(cardModerate.className).not.toBe(cardSevere.className);
      unmount();
    });

    it('enforces Zero-CLS geometry in ApartmentModalTransactionsTable during isTxLoading (pre-reserved chart skeleton, pinned filter order, zero phantom summary collapse)', () => {
      const mockRenderChart = jest.fn(() => <div data-testid="live-chart">Chart</div>);
      const { container, unmount } = render(
        <ApartmentModalTransactionsTable
          inline={true}
          isAnimationFinished={true}
          isTxLoading={true}
          filteredTransactions={[]}
          typeMap={{}}
          chartType="sale"
          setChartType={jest.fn()}
          normalizeAptName={(n) => n}
          displayAptName="동탄역롯데캐슬"
          dong="여울동"
          apartmentName="동탄역롯데캐슬"
          filterOutliers={false}
          handleToggleFilter={jest.fn()}
          areaFilterChips={[]}
          selectedAreaFilter="전체"
          setSelectedAreaFilter={jest.fn()}
          renderTransactionTable={() => <div data-testid="live-table">Table</div>}
          renderTransactionChart={mockRenderChart}
        />
      );

      // While isTxLoading && filteredTransactions.length === 0, chart renders pre-reserved 580px loading skeleton instead of premature empty message
      expect(mockRenderChart).not.toHaveBeenCalled();
      expect(container.textContent).toContain('실거래 시세 차트 불러오는 중...');
      // When renderTransactionSummaryMetrics is omitted, no phantom h-[460px] skeleton is rendered below section
      expect(container.innerHTML).not.toContain('h-[460px]');
      unmount();
    });
  });
});
