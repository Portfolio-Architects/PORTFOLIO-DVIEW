import React from 'react';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ApartmentModal from '@/components/apartment/ApartmentModal';
import { ApartmentModalHeader } from '@/components/apartment/ApartmentModalHeader';
import { APARTMENT_CHAPTERS } from '@/components/apartment/ApartmentChapterNavBar';
import MortgageLdiSentinelCard from '@/components/apartment/chapters/MortgageLdiSentinelCard';
import JeonseSafetyReport from '@/components/apartment-modal/JeonseSafetyReport';
import BuyOrWaitVote from '@/components/apartment-modal/BuyOrWaitVote';
import TerminalRecirculationHub from '@/components/apartment/TerminalRecirculationHub';
import ViralPaywallGate from '@/components/apartment-modal/ViralPaywallGate';
import AdvancedValuationMetrics from '@/components/consumer/AdvancedValuationMetrics';
import AnchorTenantCard from '@/components/consumer/AnchorTenantCard';
import ChildcareDetailSection from '@/components/apartment-modal/ChildcareDetailSection';
import { consumePendingCalculatorContext } from '@/lib/utils/pendingCalculatorContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { PWAProvider } from '@/components/pwa/PWAProvider';
import type { FieldReportData } from '@/lib/DashboardFacade';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/explore',
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('@/hooks/useApartmentDetails', () => ({
  useApartmentDetails: () => ({
    transactions: [],
    isLoadingDetail: false,
  }),
}));

jest.mock('@/components/ads/AdSlot', () => ({
  AdSlot: ({ refreshSlotId }: { refreshSlotId?: string }) => (
    <div data-testid="mock-ad-slot" data-slot={refreshSlotId || ''} />
  ),
}));

jest.mock('@/components/apartment-modal/TransactionTable', () => ({
  TransactionTable: () => <div data-testid="mock-tx-table">실거래가 내역</div>,
}));

jest.mock('@/components/apartment-modal/TransactionChartSection', () => ({
  TransactionChartSection: () => <div data-testid="mock-tx-chart">실거래 차트</div>,
}));

const sampleReport: FieldReportData = {
  id: 'apt-동탄역롯데캐슬',
  apartmentName: '동탄역롯데캐슬',
  dong: '오산동',
  author: 'D-VIEW',
  content: '',
  rating: 5,
  metrics: {
    brand: 'A',
    schoolZone: 'S',
    station: 'S',
    commercial: 'S',
    householdCount: 940,
  } as unknown as FieldReportData['metrics'],
  images: [],
  likes: 12,
  commentCount: 3,
  createdAt: new Date('2026-10-01T00:00:00Z'),
};

const sampleTransactions = [
  {
    dong: '오산동',
    aptName: '동탄역롯데캐슬',
    area: 84.9,
    areaPyeong: 34,
    contractYm: '202610',
    contractDay: '15',
    price: 158000,
    priceEok: '15억 8,000만',
    floor: 24,
    buildYear: 2021,
    dealType: '매매',
  },
  {
    dong: '오산동',
    aptName: '동탄역롯데캐슬',
    area: 84.9,
    areaPyeong: 34,
    contractYm: '202610',
    contractDay: '12',
    price: 0,
    deposit: 72000,
    priceEok: '7억 2,000만',
    floor: 18,
    buildYear: 2021,
    dealType: '전세',
  },
];

const sampleTxSummaryData = {
  동탄역롯데캐슬: {
    latestPrice: 158000,
    avg3MPrice: 155000,
    txCount: 18,
    dong: '오산동',
    latestArea: 84.9,
    latestPriceDate: '2026-10-15',
  },
  동탄역시범더샵센트럴시티: {
    latestPrice: 128000,
    avg3MPrice: 126000,
    txCount: 14,
    dong: '청계동',
    latestArea: 84.9,
    latestPriceDate: '2026-10-10',
  },
  동탄역예미지시그너스: {
    latestPrice: 112000,
    avg3MPrice: 110000,
    txCount: 10,
    dong: '오산동',
    latestArea: 84.9,
    latestPriceDate: '2026-10-08',
  },
} as unknown as Record<string, import('@/types/transaction').AptTxSummary>;

const sampleSheetApartments = {
  오산동: [
    { name: '동탄역롯데캐슬', dong: '오산동', householdCount: 940 },
    { name: '동탄역예미지시그너스', dong: '오산동', householdCount: 498 },
  ],
  청계동: [
    { name: '동탄역시범더샵센트럴시티', dong: '청계동', householdCount: 874 },
  ],
} as unknown as Record<string, import('@/lib/dong-apartments').DongApartment[]>;

function renderDrawer(props: Partial<React.ComponentProps<typeof ApartmentModal>> = {}) {
  return render(
    <SettingsProvider>
      <AuthProvider>
        <PWAProvider>
          <ApartmentModal
            report={sampleReport}
            onClose={jest.fn()}
            user={null}
            transactions={sampleTransactions}
            typeMap={{}}
            txSummary={sampleTxSummaryData['동탄역롯데캐슬']}
            txSummaryData={sampleTxSummaryData}
            sheetApartments={sampleSheetApartments}
            onOpenCompare={jest.fn()}
            onOpenMortgage={jest.fn()}
            onOpenTaxCalculator={jest.fn()}
            onOpenJeonseSafety={jest.fn()}
            onOpenSellTimingCalculator={jest.fn()}
            suppressAds={true}
            {...props}
          />
        </PWAProvider>
      </AuthProvider>
    </SettingsProvider>
  );
}

describe('ApartmentModal UX Hierarchy, Deduplication, Natural Naming & Surface Simplification (/boost)', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.clear();
      window.sessionStorage.clear();
    }
  });

  it('Point 1: keeps strictly ONE primary solid blue CTA in the drawer header, zero competing gradients/emerald pills, and manages share/tool popover Escape & mutual exclusion', () => {
    const onClose = jest.fn();
    const { container } = renderDrawer({ onClose });

    const header = screen.getByTestId('apt-modal-slim-header');
    const nav = container.querySelector('nav[aria-label="아파트 단지 분석 챕터 내비게이션"]')!;
    const topChromeControls = [
      ...Array.from(header.querySelectorAll('button, a')),
      ...Array.from(nav.querySelectorAll('button, a')),
    ];

    // Header has at most 5 quiet/primary controls when popovers are closed
    expect(header.querySelectorAll('button, a').length).toBeLessThanOrEqual(5);

    // Strictly ONE solid primary blue CTA (금융 도구) across the entire top chrome
    const primaryAccentControls = topChromeControls.filter((el) =>
      /\bbg-blue-600\b/.test(el.className)
    );
    expect(primaryAccentControls).toHaveLength(1);
    expect(primaryAccentControls[0]).toHaveAttribute('data-testid', 'apt-header-tool-menu-btn');

    // Zero competing gradients or vivid emerald CTA fills in top chrome
    for (const el of topChromeControls) {
      expect(el.className).not.toMatch(/bg-gradient-to-|bg-emerald-[56]00/);
    }

    // Share popover opens, mutually excludes tool menu, closes on Escape WITHOUT closing drawer
    const shareTrigger = screen.getByTestId('apt-header-share-menu-btn');
    const toolTrigger = screen.getByTestId('apt-header-tool-menu-btn');

    fireEvent.click(shareTrigger);
    const shareMenu = screen.getByTestId('apt-header-share-menu');
    expect(within(shareMenu).getByRole('button', { name: '링크 공유' })).toBeInTheDocument();
    expect(within(shareMenu).getByRole('button', { name: '텍스트 요약 복사' })).toBeInTheDocument();
    expect(within(shareMenu).getByRole('button', { name: '요약 이미지 저장' })).toBeInTheDocument();

    // Opening tool menu closes share menu
    fireEvent.click(toolTrigger);
    expect(screen.queryByTestId('apt-header-share-menu')).toBeNull();
    expect(screen.getByTestId('apt-header-tool-menu')).toBeInTheDocument();

    // Opening share menu closes tool menu
    fireEvent.click(shareTrigger);
    expect(screen.queryByTestId('apt-header-tool-menu')).toBeNull();
    expect(screen.getByTestId('apt-header-share-menu')).toBeInTheDocument();

    // 1st Escape closes share popover ONLY (drawer remains open)
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByTestId('apt-header-share-menu')).toBeNull();
    expect(onClose).not.toHaveBeenCalled();

    // Outside mousedown also closes share popover
    fireEvent.click(shareTrigger);
    expect(screen.getByTestId('apt-header-share-menu')).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByTestId('apt-header-share-menu')).toBeNull();

    // 2nd Escape with all popovers closed dismisses drawer
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Point 1 boundary: negative or NaN verifiedSalePriceManwon never forwards fabricated priceWon via unified tool menu', () => {
    const onOpenMortgage = jest.fn();
    const { rerender } = render(
      <ApartmentModalHeader
        report={sampleReport}
        displayAptName="동탄역롯데캐슬"
        inline={false}
        verifiedSalePriceManwon={-50000}
        handleNativeShare={jest.fn()}
        handleCopySummary={jest.fn()}
        handleDownloadShareCard={jest.fn()}
        setIsPushModalOpen={jest.fn()}
        copiedStatus={null}
        isToolDropdownOpen={true}
        setIsToolDropdownOpen={jest.fn()}
        toolDropdownRef={{ current: null }}
        preloadCalculators={jest.fn()}
        onOpenMortgage={onOpenMortgage}
      />
    );

    fireEvent.click(within(screen.getByTestId('apt-header-tool-menu')).getByRole('button', { name: '대출 계산기' }));
    expect(onOpenMortgage).toHaveBeenLastCalledWith('동탄역롯데캐슬', undefined);

    rerender(
      <ApartmentModalHeader
        report={sampleReport}
        displayAptName="동탄역롯데캐슬"
        inline={false}
        verifiedSalePriceManwon={Number.NaN}
        handleNativeShare={jest.fn()}
        handleCopySummary={jest.fn()}
        handleDownloadShareCard={jest.fn()}
        setIsPushModalOpen={jest.fn()}
        copiedStatus={null}
        isToolDropdownOpen={true}
        setIsToolDropdownOpen={jest.fn()}
        toolDropdownRef={{ current: null }}
        preloadCalculators={jest.fn()}
        onOpenMortgage={onOpenMortgage}
        onOpenTaxCalculator={jest.fn()}
      />
    );

    fireEvent.click(within(screen.getByTestId('apt-header-tool-menu')).getByRole('button', { name: '대출 계산기' }));
    expect(onOpenMortgage).toHaveBeenLastCalledWith('동탄역롯데캐슬', undefined);
    fireEvent.click(within(screen.getByTestId('apt-header-tool-menu')).getByRole('button', { name: '취득세 계산기' }));
    expect(consumePendingCalculatorContext()).toBeNull();

    // Boundary: Escape closes the tool menu in inline mode as well, and tax calculator routes cleanly without clobbering pending context
    const onOpenTax = jest.fn();
    const setIsToolDropdownOpen = jest.fn();
    rerender(
      <ApartmentModalHeader
        report={sampleReport}
        displayAptName="동탄역롯데캐슬"
        inline={true}
        verifiedSalePriceManwon={158000}
        handleNativeShare={jest.fn()}
        handleCopySummary={jest.fn()}
        handleDownloadShareCard={jest.fn()}
        setIsPushModalOpen={jest.fn()}
        copiedStatus={null}
        isToolDropdownOpen={true}
        setIsToolDropdownOpen={setIsToolDropdownOpen}
        toolDropdownRef={{ current: null }}
        preloadCalculators={jest.fn()}
        onOpenMortgage={onOpenMortgage}
        onOpenTaxCalculator={onOpenTax}
      />
    );
    fireEvent.click(within(screen.getByTestId('apt-header-tool-menu')).getByRole('button', { name: '취득세 계산기' }));
    expect(onOpenTax).toHaveBeenLastCalledWith('동탄역롯데캐슬');
    expect(consumePendingCalculatorContext()).toBeNull();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(setIsToolDropdownOpen).toHaveBeenCalledWith(false);
  });

  it('Point 2: eliminates duplicate retention strip, duplicate quick pills, duplicate modal mortgage bridge, Chapter 05 rainbow CTA wall, and duplicate Kakao banners', () => {
    const { container } = renderDrawer();

    // No duplicate retention buttons in chapter nav
    expect(screen.queryByTestId('chapter-nav-sticky-retention')).toBeNull();
    // No duplicate calculator quick pills in header
    expect(screen.queryByTestId('apt-header-quick-mortgage-btn')).toBeNull();
    expect(screen.queryByTestId('apt-header-quick-tax-btn')).toBeNull();
    // No duplicate InlineMortgageDsrBridge in overlay drawer
    expect(screen.queryByTestId('inline-mortgage-dsr-bridge')).toBeNull();
    // No duplicate bottom yellow Kakao CTA banner
    expect(screen.queryByText(/카카오톡으로 1초 공유/)).toBeNull();

    // Mount Chapter 05 with animation finished (inline={true}) and verify the 4-button rainbow CTA wall is gone,
    // replaced by the single quiet monochrome 전세 안전 계산기 button
    const { container: ch05Root } = renderDrawer({ inline: true });
    const ch05Tab = ch05Root.querySelector('button[data-chapter-id="chapter-05-mortgage"]')!;
    act(() => {
      fireEvent.click(ch05Tab);
    });
    const ch05Section = within(ch05Root).getByTestId('chapter-05-mortgage');
    expect(within(ch05Section).getByTestId('chapter05-jeonse-safety-cta')).toBeInTheDocument();
    const rainbowButtons = Array.from(ch05Section.querySelectorAll('button')).filter((btn) =>
      /\bbg-(blue|emerald|red)-600\b/.test(btn.className)
    );
    expect(rainbowButtons).toHaveLength(0);

    // JeonseSafetyReport has no sticky yellow pulsing Kakao FAB
    const { container: safetyContainer } = render(
      <JeonseSafetyReport
        aptName="동탄역롯데캐슬"
        dong="오산동"
        ratio={0.55}
        latestPrice={158000}
        latestDeposit={86900}
        volume3M={12}
        householdCount={940}
      />
    );
    expect(safetyContainer.innerHTML).not.toContain('#fee500');
    expect(safetyContainer.innerHTML).not.toContain('animate-pulse');
  });

  it('Point 3: replaces AI-slop jargon with natural human Korean across all 8 chapters and child widgets', () => {
    // Unlock all 8 chapters (including Chapters 04-08 behind ViralPaywallGate) using inline={true}
    // plus drawer mode (!inline) so both surfaces are verified exhaustively
    const { container: drawerContainer } = renderDrawer({ inline: false });
    const { container: unlockedContainer } = renderDrawer({ inline: true });

    // Mount all 8 chapters in both drawer and unlocked inline modes
    for (const root of [drawerContainer, unlockedContainer]) {
      for (const chapter of APARTMENT_CHAPTERS) {
        const btn = root.querySelector(`button[data-chapter-id="${chapter.id}"]`);
        if (btn) {
          act(() => {
            fireEvent.click(btn);
          });
        }
      }
    }

    const sentinelRender = render(
      <MortgageLdiSentinelCard
        aptName="동탄역롯데캐슬"
        latestSalePrice={158000}
        latestDepositPrice={72000}
        onOpenMortgageCalculator={jest.fn()}
      />
    );

    const hubRender = render(
      <TerminalRecirculationHub
        currentAptName="동탄역롯데캐슬"
        currentDong="오산동"
        targets={[]}
        onSelectApartment={jest.fn()}
        onOpenCompare={jest.fn()}
        onOpenMortgage={jest.fn()}
      />
    );

    // Mount voted state for BuyOrWaitVote via localStorage so post-vote copy is also audited
    window.localStorage.setItem('dview-vote-동탄역롯데캐슬', 'buy');
    const voteRender = render(
      <BuyOrWaitVote
        aptName="동탄역롯데캐슬"
        valuationStatus="undervalued"
        valuationAmount="12% 저평가"
      />
    );

    const valuationRender = render(
      <AdvancedValuationMetrics
        report={sampleReport}
        transactions={sampleTransactions}
      />
    );

    const paywallRender = render(<ViralPaywallGate onShare={jest.fn()} />);

    const anchorRender = render(
      <AnchorTenantCard
        distanceToStarbucks={80}
        starbucksName="스타벅스 동탄역점"
        distanceToOliveYoung={150}
        oliveYoungName="올리브영 동탄역점"
      />
    );

    const childcareRender = render(
      <ChildcareDetailSection
        dong="오산동"
        distanceToElementary={200}
        aptName="동탄역롯데캐슬"
      />
    );

    const combinedText = [
      drawerContainer.textContent || '',
      unlockedContainer.textContent || '',
      sentinelRender.container.textContent || '',
      hubRender.container.textContent || '',
      voteRender.container.textContent || '',
      valuationRender.container.textContent || '',
      paywallRender.container.textContent || '',
      anchorRender.container.textContent || '',
      childcareRender.container.textContent || '',
    ].join('\n');

    const bannedAiSlopPhrases = [
      '개요 및 실거래 궤적',
      '전세가율 갭투자 매트릭스',
      '학군 및 하이퍼로컬 인프라',
      '주담대 LDI 및 역전세 센티넬',
      '거시 체제 및 지역 상관도',
      'DCF 밸류에이션 판정',
      '밸류에이션 분석',
      '종합 밸류에이션',
      '우리 단지 첫 번째 앰배서더',
      '실시간 수리 엔진',
      'RECIRCULATION HUB',
      '추가 상환 부담 벡터',
      'AI 매도 진단기',
      'AI 가치 분석 결과',
      '실거래 빅데이터',
      '단지 정밀 가치분석 인사이트',
      'Overview & Price',
    ];

    for (const phrase of bannedAiSlopPhrases) {
      expect(combinedText).not.toContain(phrase);
    }

    // Natural human-readable titles are present
    const expectedNaturalPhrases = [
      '시세·실거래',
      '거래량',
      '전세·갭',
      '학군·입지',
      '대출·전세안전',
      '단지정보',
      '적정가·금리',
      '임장·후기',
      '대출 상환 · DSR 한도 계산',
      '적정가 · 금리 분석',
      '이 단지 핵심 요약 공유',
      '비슷한 단지 더 보기',
      '아직 등록된 단지 사진이 없어요',
    ];

    for (const phrase of expectedNaturalPhrases) {
      expect(combinedText).toContain(phrase);
    }

    // Zero #fee500 loud yellow CTAs, zero spinning/pinging decorative animations, and zero competing bg-blue-600 buttons in chapter widgets
    expect(paywallRender.container.innerHTML.toLowerCase()).not.toContain('#fee500');
    expect(childcareRender.container.innerHTML).not.toMatch(/animate-(spin|ping|pulse)/);
    expect(anchorRender.container.innerHTML).not.toContain('rounded-3xl');
    const valuationBlueButtons = Array.from(valuationRender.container.querySelectorAll('button')).filter((btn) =>
      /\bbg-blue-600\b/.test(btn.className)
    );
    expect(valuationBlueButtons).toHaveLength(0);
  });

  it('Point 4: flattens glass/nested box clutter while preserving Zero-CLS min-heights and clean typography', () => {
    const { container } = renderDrawer();

    // Retention strip preserves Zero-CLS min-height without border clutter
    const retentionStrip = screen.getByTestId('apartment-landing-retention-strip');
    expect(retentionStrip.className).toContain('min-h-[76px]');
    expect(retentionStrip.className).not.toContain('backdrop-blur');

    // TerminalRecirculationHub preserves Zero-CLS min-height without dark badge or glass border
    const { container: hubContainer } = render(
      <TerminalRecirculationHub
        currentAptName="동탄역롯데캐슬"
        currentDong="오산동"
        targets={[]}
        onSelectApartment={jest.fn()}
        onOpenCompare={jest.fn()}
        onOpenMortgage={jest.fn()}
      />
    );
    const hub = within(hubContainer).getByTestId('terminal-recirculation-hub');
    expect(hub.className).toContain('min-h-[320px]');
    expect(hub.className).not.toContain('backdrop-blur');

    // Compact chapter tabs use bottom underline bar without rounded pill box clutter
    const nav = container.querySelector('nav[aria-label="아파트 단지 분석 챕터 내비게이션"]')!;
    expect(nav).toHaveAttribute('data-compact', 'true');
    const indicator = within(nav as HTMLElement).getByTestId('active-chapter-pill');
    expect(indicator.className).toContain('h-[2px]');

    // No font-mono regression anywhere in rendered drawer
    expect(container.innerHTML).not.toContain('font-mono');
  });
});
