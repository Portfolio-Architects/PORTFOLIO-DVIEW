import React from 'react';
import { render, within } from '@testing-library/react';
import LoungeHeader from './LoungeHeader';
import MobileDock from './pwa/MobileDock';

// Mock Next.js navigation and contexts
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
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

describe('LoungeHeader & MobileDock Route & Contract Synchronization', () => {
  const expectedRoutes = [
    { id: 'overview', label: '아파트 랩', href: '/' },
    { id: 'imjang', label: '아파트 탐색', href: '/explore' },
    { id: 'mbti', label: '단지 MBTI', href: '/mbti' },
    { id: 'guide', label: '부동산 가이드', href: '/guide' },
    { id: 'stats', label: '아파트 통계', href: '/stats' },
  ];

  it('renders all 5 main navigation links with identical labels and hrefs in LoungeHeader', () => {
    const { container } = render(<LoungeHeader activeTab="overview" />);

    expectedRoutes.forEach((route) => {
      const link = within(container).getByRole('link', { name: new RegExp(route.label) });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', route.href);
    });
  });

  it('splits LoungeHeader in wide view into 4 left tabs and 1 right-aligned stats tab (4 --- 1 layout)', () => {
    const { container } = render(<LoungeHeader activeTab="overview" />);
    const nav = within(container).getByRole('navigation', { name: '메인 메뉴' });
    expect(nav).toHaveClass('justify-between');
    expect(nav).toHaveClass('w-full');

    const leftGroup = within(nav).getByTestId('nav-left-group');
    const rightGroup = within(nav).getByTestId('nav-right-group');

    const leftLinks = within(leftGroup).getAllByRole('link');
    expect(leftLinks).toHaveLength(4);
    expect(leftLinks.map((l) => l.textContent?.trim())).toEqual([
      '아파트 랩',
      '아파트 탐색',
      '단지 MBTI',
      '부동산 가이드',
    ]);

    const rightLinks = within(rightGroup).getAllByRole('link');
    expect(rightLinks).toHaveLength(1);
    expect(rightLinks[0]).toHaveTextContent('아파트 통계');
    expect(rightLinks[0]).toHaveAttribute('href', '/stats');
  });

  it('renders all 5 main navigation links with identical labels and hrefs in MobileDock', () => {
    const { container } = render(<MobileDock activeTab="overview" />);

    expectedRoutes.forEach((route) => {
      const link = within(container).getByRole('link', { name: new RegExp(route.label) });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', route.href);
    });
  });

  it.each([
    ['overview', '아파트 랩', 'bg-white', 'text-blue-600'],
    ['imjang', '아파트 탐색', 'bg-white', 'text-blue-600'],
    ['mbti', '단지 MBTI', 'bg-white', 'text-blue-600'],
    ['guide', '부동산 가이드', 'bg-white', 'text-blue-600'],
    ['stats', '아파트 통계', 'bg-white', 'text-blue-600'],
  ])('highlights activeTab "%s" correctly with expected visual feedback in LoungeHeader and MobileDock', (activeTab, label, expectedBg, expectedText) => {
    const { container: headerContainer } = render(
      <LoungeHeader activeTab={activeTab as any} />
    );
    const headerLink = within(headerContainer).getByRole('link', { name: new RegExp(label) });
    expect(headerLink).toHaveClass(expectedBg);
    expect(headerLink).toHaveClass(expectedText);

    const { container: dockContainer } = render(
      <MobileDock activeTab={activeTab as any} />
    );
    const dockLink = within(dockContainer).getByRole('link', { name: new RegExp(label) });
    expect(dockLink).toHaveClass(expectedText);
  });
});
