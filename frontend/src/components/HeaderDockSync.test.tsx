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
