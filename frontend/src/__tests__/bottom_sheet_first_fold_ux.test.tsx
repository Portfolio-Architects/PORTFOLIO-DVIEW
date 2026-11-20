import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import ApartmentModal from '@/components/apartment/ApartmentModal';
import { APARTMENT_CHAPTERS } from '@/components/apartment/ApartmentChapterNavBar';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { PWAProvider } from '@/components/pwa/PWAProvider';
import * as analyticsModule from '@/lib/utils/analytics';
import type { FieldReportData } from '@/lib/DashboardFacade';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/',
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
  TransactionTable: ({ filteredTransactions }: { filteredTransactions: unknown[] }) => (
    <div data-testid="mock-chapter1-tx-table">실거래가 {filteredTransactions.length}건</div>
  ),
}));

jest.mock('@/components/apartment-modal/TransactionChartSection', () => ({
  TransactionChartSection: () => (
    <div data-testid="mock-chapter1-tx-chart">실거래 시세 추이 차트</div>
  ),
}));

const baseReport: FieldReportData = {
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

function renderModal(props: Partial<React.ComponentProps<typeof ApartmentModal>> = {}) {
  return render(
    <SettingsProvider>
      <AuthProvider>
        <PWAProvider>
          <ApartmentModal
            report={baseReport}
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

describe('방안 A: 1단 바텀시트(!inline) First-Fold Data-First UX & inline SEO 보존 검증', () => {
  let trackEventSpy: jest.SpyInstance;

  beforeEach(() => {
    trackEventSpy = jest.spyOn(analyticsModule, 'trackEvent').mockImplementation(() => {});
    if (typeof window !== 'undefined') {
      window.localStorage.clear();
    }
  });

  afterEach(() => {
    trackEventSpy.mockRestore();
  });

  it('1단 바텀시트(!inline)에서 초슬림 헤더, 1줄 콤팩트 내비(영문 제외), 챕터 01 최우선 배치 및 중복 관심단지 버튼 제거를 만족한다', () => {
    const onOpenTaxCalculator = jest.fn();
    const { container } = renderModal({ inline: false, onOpenTaxCalculator });

    // 1. Ultra-slim header (!inline)
    const slimHeader = screen.getByTestId('apt-modal-slim-header');
    expect(slimHeader).toBeInTheDocument();
    expect(slimHeader.querySelector('h1')).toHaveTextContent('동탄역롯데캐슬');
    expect(slimHeader).toHaveTextContent('오산동');
    expect(slimHeader).toHaveTextContent('지도보기');
    expect(screen.getByTestId('apt-detail-favorite-btn')).toHaveTextContent('관심단지 저장');

    // Close button stays strictly above slim header (z-[80] > z-[65])
    const closeBtn = screen.getByRole('button', { name: '닫기' });
    expect(closeBtn.className).toContain('z-[80]');

    // Toolkit button retains aria-label="분석 및 금융 도구" and dropdown opens cleanly inside slim header
    const toolTrigger = within(slimHeader).getByRole('button', { name: /분석 및 금융 도구/i });
    expect(toolTrigger).toHaveTextContent('금융 도구');
    fireEvent.click(toolTrigger);
    const taxBtn = within(slimHeader).getByRole('button', { name: '취득세 계산기' });
    fireEvent.click(taxBtn);
    expect(onOpenTaxCalculator).toHaveBeenCalledWith('동탄역롯데캐슬');

    // 2. Compact 1-line chapter pill nav bar omits English subtitles in !inline
    const nav = container.querySelector('nav[aria-label="아파트 단지 분석 챕터 내비게이션"]');
    expect(nav).toHaveAttribute('data-compact', 'true');
    APARTMENT_CHAPTERS.forEach((chapter) => {
      expect(screen.queryByText(chapter.subtitle)).toBeNull();
    });

    // 3. First-fold Data-First ordering: Chapter 01 strictly precedes Retention Strip,
    //    and duplicate bridge / quick-pill / sticky-retention strips are eliminated in !inline drawer
    const chapter1 = screen.getByTestId('chapter-01-overview');
    const retentionStrip = screen.getByTestId('apartment-landing-retention-strip');

    expect(
      chapter1.compareDocumentPosition(retentionStrip) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(screen.queryByTestId('inline-mortgage-dsr-bridge')).toBeNull();
    expect(screen.queryByTestId('chapter-nav-sticky-retention')).toBeNull();
    expect(screen.queryByTestId('apt-header-quick-mortgage-btn')).toBeNull();
    expect(screen.queryByTestId('apt-header-quick-tax-btn')).toBeNull();

    // 4. Duplicate favorite button in retention strip is suppressed in !inline
    expect(screen.queryByTestId('landing-retention-action-btn')).toBeNull();
    expect(screen.getByTestId('apt-detail-favorite-btn')).toBeInTheDocument();
  });

  it('!inline 초슬림 헤더에서 dong이 빈 문자열이면 기본값 "동탄"으로 안전하게 폴백한다', () => {
    renderModal({
      inline: false,
      report: { ...baseReport, dong: '' },
    });

    const slimHeader = screen.getByTestId('apt-modal-slim-header');
    expect(slimHeader).toHaveTextContent('동탄');
  });

  it('상세 페이지(inline=true)에서는 2줄 챕터 내비, 상단 브릿지 선행 배치 및 SEO/H2 규칙을 온전히 유지한다', () => {
    const onBack = jest.fn();
    const { container } = renderModal({ inline: true, onClose: onBack });

    // Slim header is NOT used in inline mode; header preserves H2 + back button (Kakao share card offscreen <h1> excluded)
    expect(screen.queryByTestId('apt-modal-slim-header')).toBeNull();
    const backBtn = screen.getByTestId('apt-inline-back-btn');
    const inlineHeaderEl = backBtn.closest('div.bg-surface');
    expect(inlineHeaderEl).not.toBeNull();
    expect(inlineHeaderEl?.querySelector('h1')).toBeNull();
    expect(inlineHeaderEl?.querySelector('h2')).toHaveTextContent('동탄역롯데캐슬');
    expect(backBtn).toBeInTheDocument();

    // Chapter nav keeps full 2-line layout with natural Korean subtitles
    const nav = container.querySelector('nav[aria-label="아파트 단지 분석 챕터 내비게이션"]');
    expect(nav).toHaveAttribute('data-compact', 'false');
    expect(screen.getByText('실거래 추이')).toBeInTheDocument();

    // Retention Strip + Mortgage Bridge remain above Chapter 01 on inline page
    const chapter1 = screen.getByTestId('chapter-01-overview');
    const retentionStrip = screen.getByTestId('apartment-landing-retention-strip');
    const mortgageBridge = screen.getByTestId('inline-mortgage-dsr-bridge');

    expect(
      retentionStrip.compareDocumentPosition(chapter1) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      mortgageBridge.compareDocumentPosition(chapter1) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(mortgageBridge).toHaveAttribute('data-surface', 'apartment_inline_top');

    // Inline mode keeps retention strip action button
    expect(screen.getByTestId('landing-retention-action-btn')).toBeInTheDocument();
  });
});
