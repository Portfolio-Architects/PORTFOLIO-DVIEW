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

jest.mock('@/lib/contexts/SettingsContext', () => ({
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
    { id: 'technovalley', label: '테크노 랩', href: '/', colorGroup: 'blue' },
    { id: 'office', label: '사무실 탐색', href: '/overview?tab=office', colorGroup: 'blue' },
    { id: 'lounge', label: '동탄 라운지', href: '/lounge', colorGroup: 'blue' },
    { id: 'overview', label: '아파트 랩', href: '/overview', colorGroup: 'orange' },
    { id: 'imjang', label: '아파트 탐색', href: '/explore', colorGroup: 'orange' },
  ];

  it('renders all 5 main navigation links with identical labels and hrefs in LoungeHeader', () => {
    const { container } = render(<LoungeHeader activeTab="lounge" />);

    expectedRoutes.forEach((route) => {
      const link = within(container).getByRole('link', { name: new RegExp(route.label) });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', route.href);
    });
  });

  it('renders all 5 main navigation links with identical labels and hrefs in MobileDock', () => {
    const { container } = render(<MobileDock activeTab="lounge" />);

    expectedRoutes.forEach((route) => {
      const link = within(container).getByRole('link', { name: new RegExp(route.label) });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', route.href);
    });
  });

  it.each([
    ['technovalley', '테크노 랩', 'bg-hs-blue-light', 'text-hs-blue'],
    ['office', '사무실 탐색', 'bg-hs-blue-light', 'text-hs-blue'],
    ['lounge', '동탄 라운지', 'bg-hs-blue-light', 'text-hs-blue'],
    ['overview', '아파트 랩', 'bg-hs-orange-light', 'text-hs-orange'],
    ['imjang', '아파트 탐색', 'bg-hs-orange-light', 'text-hs-orange'],
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
