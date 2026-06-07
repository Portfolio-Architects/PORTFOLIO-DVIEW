// Mock global fetch before importing any modules (prevents Firebase SDK fetch reference error)
if (typeof global.fetch === 'undefined') {
  global.fetch = jest.fn().mockImplementation(() => Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  }));
}

// Mock IntersectionObserver for JSDOM
class MockIntersectionObserver {
  observe = jest.fn();
  disconnect = jest.fn();
  unobserve = jest.fn();
}
Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
});

import { render, screen, fireEvent, act } from '@testing-library/react';
import LoungeFeedClient from './LoungeFeedClient';

// Mock LoungeDetailClient to prevent importing Firebase Auth SDK during test
jest.mock('@/components/LoungeDetailClient', () => {
  const LoungeDetailClientMock = () => <div>Lounge Detail Mock</div>;
  LoungeDetailClientMock.displayName = 'LoungeDetailClientMock';
  return LoungeDetailClientMock;
});

// Mock react-markdown and remark-gfm to avoid ESM export SyntaxError in Jest
jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children }: any) => <div>{children}</div>,
}));
jest.mock('remark-gfm', () => ({
  __esModule: true,
  default: () => {},
}));

// Mock useSWRInfinite as it is used for regular lounge posts
jest.mock('swr/infinite', () => {
  return jest.fn().mockReturnValue({
    data: [[]],
    error: null,
    size: 1,
    setSize: jest.fn(),
    isValidating: false,
  });
});

// Mock PWA provider context
jest.mock('@/components/pwa/PWAProvider', () => ({
  usePWA: () => ({
    showToast: jest.fn(),
  }),
}));

// Mock Kakao SDK share function
jest.mock('@/lib/utils/kakaoShare', () => ({
  shareLocalNoticeToKakao: jest.fn(),
}));

describe('LoungeFeedClient Notice & Event Curation', () => {
  const mockNotices = [
    {
      id: 'culture_luna_20260610',
      title: '[루나쇼] 2026 동탄호수공원 루나 분수쇼 (6월 1회차)',
      url: 'https://www.hscity.go.kr/www/user/bbs/BD_selectBbsList.do?q_bbsCode=1019',
      dept: '동탄호수공원',
      date: '2026-06-10', // today is 2026-06-07 -> D-3
      isDongtan: true,
      source: 'culture'
    },
    {
      id: 'culture_waterpark_20260701',
      title: '[축제] 2026 동탄 신리천 어린이 물놀이장 무료 개장',
      url: 'https://www.hscity.go.kr/www/user/bbs/BD_selectBbsList.do?q_bbsCode=1019',
      dept: '신리천 어린이공원',
      date: '2026-07-01',
      isDongtan: true,
      source: 'culture'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock fetch for notices
    window.fetch = jest.fn().mockImplementation((url) => {
      if (url === '/api/local-notices') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ notices: mockNotices, lastUpdated: '2026-06-07T15:00:00.000Z' }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ posts: [] }),
      });
    });
  });

  it('renders "동탄구 소식" tab correctly and switches sub-categories', async () => {
    await act(async () => {
      render(
        <LoungeFeedClient
          initialPosts={[]}
          currentTab="동탄구 소식"
        />
      );
    });

    // Check if sub-category filters are rendered
    expect(screen.getByText('시정공고')).toBeInTheDocument();
    expect(screen.getByText('교통·철도')).toBeInTheDocument();
    expect(screen.getByText('동네행정')).toBeInTheDocument();
    expect(screen.getByText('문화·행사')).toBeInTheDocument();
  });

  it('calculates D-Day correctly and displays culture event card components', async () => {
    await act(async () => {
      render(
        <LoungeFeedClient
          initialPosts={[]}
          currentTab="동탄구 소식"
        />
      );
    });

    // Switch to '문화·행사' tab
    const cultureTab = screen.getByText('문화·행사');
    await act(async () => {
      fireEvent.click(cultureTab);
    });

    // Verify D-Day calculation and badge
    // 2026-06-10 is target, current mock today is 2026-06-07 -> D-3
    expect(screen.getByText('D-3')).toBeInTheDocument();
    expect(screen.getByText('[루나쇼] 2026 동탄호수공원 루나 분수쇼 (6월 1회차)')).toBeInTheDocument();

    // Verify metadata values
    expect(screen.getByText('동탄호수공원')).toBeInTheDocument();
    expect(screen.getByText('행사일: 2026-06-10')).toBeInTheDocument();

    // Verify actions buttons exist
    const shareButtons = screen.getAllByText('카카오톡 공유');
    expect(shareButtons.length).toBeGreaterThan(0);
    const copyButtons = screen.getAllByText('링크 복사');
    expect(copyButtons.length).toBeGreaterThan(0);
  });
});
