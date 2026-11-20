import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import fs from 'fs';
import path from 'path';
import ApartmentModal from '@/components/apartment/ApartmentModal';
import { ApartmentChapterNavBar } from '@/components/apartment/ApartmentChapterNavBar';
import { TransactionTable } from '@/components/apartment-modal/TransactionTable';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { PWAProvider } from '@/components/pwa/PWAProvider';
import {
  acquireBodyScrollLock,
  getActiveBodyScrollLockCount,
  resetBodyScrollLockForTests,
} from '@/lib/utils/bodyScrollLock';
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

jest.mock('@/components/apartment-modal/TransactionChartSection', () => ({
  TransactionChartSection: () => (
    <div data-testid="mock-chapter1-tx-chart">실거래 시세 추이 차트</div>
  ),
}));

const sampleReportA: FieldReportData = {
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

const sampleReportB: FieldReportData = {
  ...sampleReportA,
  id: 'apt-동탄역시범더샵센트럴시티',
  apartmentName: '동탄역시범더샵센트럴시티',
  dong: '청계동',
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

function renderDrawer(props: Partial<React.ComponentProps<typeof ApartmentModal>> = {}) {
  const onClose = props.onClose ?? jest.fn();
  const utils = render(
    <SettingsProvider>
      <AuthProvider>
        <PWAProvider>
          <ApartmentModal
            report={sampleReportA}
            onClose={onClose}
            user={null}
            transactions={sampleTransactions}
            typeMap={{}}
            onOpenMortgage={jest.fn()}
            onOpenTaxCalculator={jest.fn()}
            suppressAds={true}
            inline={false}
            {...props}
          />
        </PWAProvider>
      </AuthProvider>
    </SettingsProvider>
  );
  return { ...utils, onClose };
}

describe('아파트 오버레이 슬라이드 드로어 UX & 스크롤 격리 회귀 검증', () => {
  beforeEach(() => {
    resetBodyScrollLockForTests();
  });

  afterEach(() => {
    resetBodyScrollLockForTests();
  });

  it('고정 상단 크롬(단지명·닫기 X·챕터 내비)을 스크롤 본문 바깥으로 분리하여 스크롤 시 소실/겹침을 차단한다', () => {
    renderDrawer();

    const panel = screen.getByTestId('apartment-inspector-panel');
    const stickyChrome = screen.getByTestId('apartment-drawer-sticky-chrome');
    const scrollBody = screen.getByTestId('apartment-inspector-scroll-body');
    const slimHeader = screen.getByTestId('apt-modal-slim-header');
    const closeBtn = screen.getByRole('button', { name: '닫기' });
    const chapterNav = screen.getByRole('navigation', { name: '아파트 단지 분석 챕터 내비게이션' });
    const chapter1 = screen.getByTestId('chapter-01-overview');

    // Outer panel clips overflow (no scrollbar on panel itself); only scrollBody scrolls
    expect(panel.className).toContain('overflow-hidden');
    expect(panel.className).not.toContain('overflow-y-auto');
    expect(scrollBody.className).toContain('overflow-y-auto');
    expect(scrollBody.className).toContain('overscroll-contain');

    // Sticky chrome holds header, close button, and chapter nav strictly outside scrollBody
    expect(stickyChrome).toContainElement(slimHeader);
    expect(stickyChrome).toContainElement(closeBtn);
    expect(stickyChrome).toContainElement(chapterNav);
    expect(scrollBody).not.toContainElement(closeBtn);
    expect(scrollBody).not.toContainElement(slimHeader);
    expect(scrollBody).toContainElement(chapter1);
  });

  it('ESC 키와 백드롭 외부 클릭으로 드로어를 닫고, 금융 도구 드롭다운 열림 시에는 드롭다운만 우선 닫는다', () => {
    const onClose = jest.fn();
    renderDrawer({ onClose });

    const slimHeader = screen.getByTestId('apt-modal-slim-header');
    const toolTrigger = within(slimHeader).getByRole('button', { name: /분석 및 금융 도구/i });

    // Open tool dropdown -> first Escape closes dropdown only
    fireEvent.click(toolTrigger);
    expect(toolTrigger).toHaveAttribute('aria-expanded', 'true');

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(toolTrigger).toHaveAttribute('aria-expanded', 'false');
    expect(onClose).not.toHaveBeenCalled();

    // Second Escape closes drawer
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    // Backdrop click also dismisses drawer on desktop
    const backdrop = screen.getByTestId('apartment-inspector-backdrop');
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('상위 다이얼로그(계산기 등)가 드로어 위에 열려 있을 때 ESC 키가 드로어를 먼저 닫지 않도록 양보한다', () => {
    const onClose = jest.fn();
    renderDrawer({ onClose });

    const upperDialog = document.createElement('div');
    upperDialog.setAttribute('role', 'dialog');
    upperDialog.setAttribute('aria-modal', 'true');
    document.body.appendChild(upperDialog);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();

    document.body.removeChild(upperDialog);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ref-counted bodyScrollLock으로 바깥 스크롤을 잠그고 중첩 모달 해제 시에도 잠금을 유지한다', () => {
    const { unmount } = renderDrawer();
    expect(getActiveBodyScrollLockCount()).toBe(1);
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.documentElement.style.overscrollBehavior).toBe('none');

    // Simulate child modal acquiring & releasing lock
    const releaseChild = acquireBodyScrollLock();
    expect(getActiveBodyScrollLockCount()).toBe(2);
    releaseChild();
    expect(getActiveBodyScrollLockCount()).toBe(1);
    expect(document.body.style.overflow).toBe('hidden');

    unmount();
    expect(getActiveBodyScrollLockCount()).toBe(0);
    expect(document.body.style.overflow).toBe('');
    expect(document.documentElement.style.overscrollBehavior).toBe('');
  });

  it('다른 단지로 전환하면 드로어 스크롤 위치를 자동으로 최상단(0)으로 초기화한다', () => {
    const { rerender } = renderDrawer({ report: sampleReportA });
    const scrollBody = screen.getByTestId('apartment-inspector-scroll-body');
    const scrollToMock = jest.fn();
    scrollBody.scrollTo = scrollToMock;
    scrollBody.scrollTop = 640;

    rerender(
      <SettingsProvider>
        <AuthProvider>
          <PWAProvider>
            <ApartmentModal
              report={sampleReportB}
              onClose={jest.fn()}
              user={null}
              transactions={sampleTransactions}
              typeMap={{}}
              suppressAds={true}
              inline={false}
            />
          </PWAProvider>
        </AuthProvider>
      </SettingsProvider>
    );

    expect(scrollToMock).toHaveBeenCalledWith({ top: 0, behavior: 'auto' });
  });

  it('TransactionTable은 드로어(compact=true)에서 내부 중첩 스크롤(overscroll-y-contain/overflow-y-auto)을 비활성화한다', () => {
    const { unmount } = render(
      <SettingsProvider>
        <TransactionTable
          transactions={sampleTransactions}
          typeMap={{}}
          chartType="sale"
          normalizeAptName={(n) => n}
          compact={true}
        />
      </SettingsProvider>
    );

    const compactContainer = screen.getByTestId('tx-table-scroll-container');
    expect(compactContainer.className).toContain('overflow-y-visible');
    expect(compactContainer.className).not.toContain('md:overflow-y-auto');
    expect(compactContainer.className).not.toContain('md:overscroll-y-contain');
    unmount();

    render(
      <SettingsProvider>
        <TransactionTable
          transactions={sampleTransactions}
          typeMap={{}}
          chartType="sale"
          normalizeAptName={(n) => n}
          compact={false}
        />
      </SettingsProvider>
    );

    const inlineContainer = screen.getByTestId('tx-table-scroll-container');
    expect(inlineContainer.className).toContain('md:overflow-y-auto');
    expect(inlineContainer.className).toContain('md:overscroll-y-contain');
  });

  it('ApartmentChapterNavBar는 드로어 스크롤 컨테이너(scrollContainerRef) 내부에서만 scrollTo를 호출하고 바깥 scrollIntoView를 유발하지 않는다', () => {
    const scrollContainer = document.createElement('div');
    const targetSection = document.createElement('section');
    targetSection.id = 'chapter-04-infra';

    const containerScrollTo = jest.fn();
    const sectionScrollIntoView = jest.fn();
    scrollContainer.scrollTo = containerScrollTo;
    scrollContainer.scrollTop = 100;
    scrollContainer.getBoundingClientRect = () =>
      ({ top: 120, height: 600, bottom: 720, left: 0, right: 800, width: 800, x: 0, y: 120, toJSON: () => {} }) as DOMRect;
    targetSection.getBoundingClientRect = () =>
      ({ top: 520, height: 300, bottom: 820, left: 0, right: 800, width: 800, x: 0, y: 520, toJSON: () => {} }) as DOMRect;
    targetSection.scrollIntoView = sectionScrollIntoView;

    scrollContainer.appendChild(targetSection);
    document.body.appendChild(scrollContainer);

    const ref = { current: scrollContainer };
    const onSelectChapter = jest.fn();

    const { container } = render(
      <ApartmentChapterNavBar
        activeChapter="chapter-01-overview"
        onSelectChapter={onSelectChapter}
        scrollContainerRef={ref}
        compact={true}
      />
    );

    const btn = container.querySelector('button[data-chapter-id="chapter-04-infra"]')!;
    fireEvent.click(btn);

    expect(onSelectChapter).toHaveBeenCalledWith('chapter-04-infra');
    // 100 + (520 - 120) - 12 = 488
    expect(containerScrollTo).toHaveBeenCalledWith({ top: 488, behavior: 'smooth' });
    expect(sectionScrollIntoView).not.toHaveBeenCalled();

    document.body.removeChild(scrollContainer);
  });

  it('globals.css는 기존 is-scrolling 120fps 불변식을 유지하면서 data-scroll-interactive 고정 크롬 클릭을 보장한다', () => {
    const cssPath = path.resolve(process.cwd(), 'src/app/globals.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');

    expect(cssContent).toMatch(/body\.is-scrolling\s+\*\s*\{[^}]*pointer-events:\s*none\s*!important;/);
    expect(cssContent).toMatch(
      /body\.is-scrolling\s+\[data-scroll-interactive="true"\]\s*,[\s\S]*pointer-events:\s*auto\s*!important;/
    );
  });
});
