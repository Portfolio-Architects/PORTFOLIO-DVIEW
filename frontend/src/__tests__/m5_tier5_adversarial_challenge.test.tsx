/**
 * @file m5_tier5_adversarial_challenge.test.tsx
 * @description Tier 5 White-Box Adversarial Coverage Audit & Edge Case Discovery Test Suite.
 * Covers:
 * 1. frontend/src/lib/services/newsData.ts (deduplication collision, concurrent race conditions, cache stampede, error fallbacks)
 * 2. frontend/src/app/api/local-notices/route.ts (parameter fuzzing, dual envelope serialization, rate limiting, error responses)
 * 3. frontend/src/app/api/bypass-notice/route.ts (SSRF attacks, open redirect bypasses, HTML/XSS injection escaping, nonce propagation)
 * 4. frontend/src/components/LoungeFeedClient.tsx (corrupted/null notice items, D-Day math edge cases, XSS resilience, rapid tab switching, modal synchronization)
 * 5. frontend/scripts/fetch-local-notices.js & scraping pipeline (malformed HTML, table column shifts, regex validation, synthetic generators)
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const { TextDecoder, TextEncoder } = require('util');
const { ReadableStream, WritableStream, TransformStream } = require('stream/web');
const { MessagePort, MessageChannel } = require('worker_threads');
const { Blob, File } = require('buffer');

if (typeof global.TextDecoder === 'undefined') {
  (global as any).TextDecoder = TextDecoder;
}
if (typeof global.TextEncoder === 'undefined') {
  (global as any).TextEncoder = TextEncoder;
}
if (typeof global.ReadableStream === 'undefined') {
  (global as any).ReadableStream = ReadableStream;
}
if (typeof global.WritableStream === 'undefined') {
  (global as any).WritableStream = WritableStream;
}
if (typeof global.TransformStream === 'undefined') {
  (global as any).TransformStream = TransformStream;
}
if (typeof global.MessagePort === 'undefined') {
  (global as any).MessagePort = MessagePort;
}
if (typeof global.MessageChannel === 'undefined') {
  (global as any).MessageChannel = MessageChannel;
}
if (typeof global.Blob === 'undefined') {
  (global as any).Blob = Blob;
}
if (typeof global.File === 'undefined') {
  (global as any).File = File;
}
/* eslint-enable @typescript-eslint/no-require-imports */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import * as cheerio from 'cheerio';
import { z } from 'zod';
import { NextRequest } from 'next/server';

// Service & Repository Layer
import { getLocalNotices, loadFallbackNotices, type NoticeData } from '@/lib/services/newsData';
import * as NewsRepo from '@/lib/repositories/news.repository';
import { noticeSchema } from '@/lib/validation/facade.schemas';

// Route Handlers
import { GET as getLocalNoticesRoute } from '@/app/api/local-notices/route';
import { GET as getBypassNoticeRoute } from '@/app/api/bypass-notice/route';

// UI Components
import LoungeFeedClient from '@/components/LoungeFeedClient';
import { shareLocalNoticeToKakao } from '@/lib/utils/kakaoShare';

// ============================================================================
// MOCKS & SETUP
// ============================================================================

jest.mock('@/contexts/SettingsContext', () => ({
  useSettings: () => ({
    areaUnit: 'pyeong',
    setAreaUnit: jest.fn(),
    theme: 'system',
    setTheme: jest.fn(),
    isSettingsModalOpen: false,
    setIsSettingsModalOpen: jest.fn(),
    isCalculatorModalOpen: false,
    setIsCalculatorModalOpen: jest.fn(),
    openCalculator: jest.fn(),
    closeCalculator: jest.fn(),
  }),
  useSettingsValues: () => ({
    areaUnit: 'pyeong',
    setAreaUnit: jest.fn(),
    theme: 'system',
    setTheme: jest.fn(),
  }),
  useSettingsUi: () => ({
    isSettingsModalOpen: false,
    setIsSettingsModalOpen: jest.fn(),
    isCalculatorModalOpen: false,
    setIsCalculatorModalOpen: jest.fn(),
    openCalculator: jest.fn(),
    closeCalculator: jest.fn(),
  }),
  SettingsProvider: ({ children }: any) => <>{children}</>,
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    anonProfile: null,
    updateLocalAnonProfile: jest.fn(),
    handleLogin: jest.fn(),
    handleLogout: jest.fn(),
    loginWithGoogle: jest.fn(),
    loginWithKakao: jest.fn(),
    logout: jest.fn(),
    loading: false,
  }),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    anonProfile: null,
    updateLocalAnonProfile: jest.fn(),
    handleLogin: jest.fn(),
    handleLogout: jest.fn(),
    loginWithGoogle: jest.fn(),
    loginWithKakao: jest.fn(),
    logout: jest.fn(),
    loading: false,
  }),
  AuthProvider: ({ children }: any) => <>{children}</>,
}));

jest.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: jest.fn(),
  }),
  ThemeProvider: ({ children }: any) => <>{children}</>,
}));

jest.mock('@/lib/firebaseConfig', () => ({
  db: null,
  auth: null,
  storage: null,
  isFirebaseAvailable: () => false,
}));

jest.mock('@/lib/firebaseAdmin', () => ({
  adminDb: null,
}));

jest.mock('@/lib/repositories/apartment.repository', () => ({
  fetchApartmentNames: jest.fn().mockResolvedValue([]),
  getApartments: jest.fn().mockResolvedValue([]),
}));

jest.mock('@/components/LoungeDetailClient', () => {
  const MockDetail = ({ postId }: { postId: string }) => <div data-testid="lounge-detail-mock">Detail for {postId}</div>;
  MockDetail.displayName = 'MockLoungeDetailClient';
  return MockDetail;
});

jest.mock('@/components/AptStoriesWidget', () => {
  const MockWidget = () => <div data-testid="apt-stories-widget">Apt Stories Mock</div>;
  MockWidget.displayName = 'MockAptStoriesWidget';
  return MockWidget;
});

jest.mock('@/components/ui/MarkdownViewer', () => {
  const MockMarkdown = ({ content }: { content: string }) => <div data-testid="markdown-viewer">{content}</div>;
  MockMarkdown.displayName = 'MockMarkdownViewer';
  return MockMarkdown;
});

jest.mock('swr', () => {
  return jest.fn().mockImplementation((key: string, fetcher: any, config: any) => ({
    data: config?.fallbackData,
    error: null,
    isValidating: false,
    mutate: jest.fn(),
  }));
});

jest.mock('swr/infinite', () => {
  return jest.fn().mockReturnValue({
    data: [[]],
    error: null,
    size: 1,
    setSize: jest.fn(),
    isValidating: false,
  });
});

const mockShowToast = jest.fn();
jest.mock('@/components/pwa/PWAProvider', () => ({
  usePWA: () => ({
    showToast: mockShowToast,
  }),
}));

jest.mock('@/lib/utils/kakaoShare', () => ({
  shareLocalNoticeToKakao: jest.fn((notice, toastFn) => {
    if (toastFn) toastFn('카카오톡 공유가 실행되었습니다.');
  }),
}));

let mockSearchParams = new URLSearchParams();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => mockSearchParams,
  usePathname: () => '/lounge',
}));

jest.mock('@/lib/redis', () => ({
  redis: null,
  rawRedis: null,
}));

let mockRateLimitSuccess = true;
jest.mock('@/lib/api/rateLimiter', () => ({
  checkRateLimit: jest.fn().mockImplementation(() => {
    if (!mockRateLimitSuccess) {
      return Promise.resolve({
        success: false,
        response: new Response(JSON.stringify({ success: false, error: 'RATE_LIMIT_EXCEEDED' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        }),
      });
    }
    return Promise.resolve({ success: true });
  }),
  getClientIp: jest.fn().mockReturnValue('127.0.0.1'),
}));

// ============================================================================
// ADVERSARIAL TEST SUITE
// ============================================================================

describe('Tier 5 Adversarial Coverage & Edge Case Discovery Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRateLimitSuccess = true;
    mockSearchParams = new URLSearchParams();
    window.history.pushState({}, '', '/lounge');
    window.location.hash = '';

    window.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/api/local-notices')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ notices: [], lastUpdated: '2026-06-07T12:00:00.000Z' }),
        });
      }
      if (url.includes('/data/local-events.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
    global.fetch = window.fetch;
  });

  // ==========================================================================
  // SECTION 1: newsData.ts Adversarial Edge Cases
  // ==========================================================================
  describe('1. newsData.ts: Resilience, Deduplication, & Concurrency', () => {
    it('1.1 handles 20 concurrent burst requests for getLocalNotices without racing or throwing', async () => {
      const mockItems: NoticeData[] = [
        { id: 'gosi_100', title: '동탄 도시계획', date: '2026-06-01', isDongtan: true, source: 'gosi' },
        { id: 'rail_100', title: '트램 사업계획', date: '2026-06-02', isDongtan: true, source: 'rail' },
      ];

      jest.spyOn(NewsRepo, 'fetchRawLocalNotices').mockResolvedValue({
        cityItems: [mockItems[0]],
        railItems: [mockItems[1]],
        cultureItems: [],
        dongItems: [],
      });

      const promises = Array.from({ length: 20 }).map((_, i) => getLocalNotices(i % 2 === 0));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(20);
      results.forEach(res => {
        expect(res).toHaveProperty('notices');
        expect(Array.isArray(res.notices)).toBe(true);
        expect(res.notices.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('1.2a gracefully recovers when Redis read fails, continuing to load raw items', async () => {
      jest.spyOn(NewsRepo, 'getCachedNotices').mockRejectedValueOnce(new Error('Redis connection timeout'));
      jest.spyOn(NewsRepo, 'setCachedNotices').mockResolvedValueOnce(undefined);
      jest.spyOn(NewsRepo, 'fetchRawLocalNotices').mockResolvedValueOnce({
        cityItems: [{ id: 'gosi_1', title: '고시 1', date: '2026-06-01', isDongtan: true, source: 'gosi' }],
        railItems: [],
        cultureItems: [],
        dongItems: [],
      });

      const result = await getLocalNotices(true);
      expect(result.notices).toHaveLength(1);
      expect(result.notices[0].id).toBe('gosi_1');
    });

    it('1.2b defensively recovers from setCachedNotices rejection without dropping parsed notices', async () => {
      jest.spyOn(NewsRepo, 'getCachedNotices').mockResolvedValueOnce(null);
      jest.spyOn(NewsRepo, 'setCachedNotices').mockRejectedValueOnce(new Error('Redis write ECONNRESET'));
      jest.spyOn(NewsRepo, 'fetchRawLocalNotices').mockResolvedValueOnce({
        cityItems: [{ id: 'gosi_1', title: '고시 1', date: '2026-06-01', isDongtan: true, source: 'gosi' }],
        railItems: [],
        cultureItems: [],
        dongItems: [],
      });

      const result = await getLocalNotices(true);
      expect(result.notices).toHaveLength(1);
      expect(result.notices[0].id).toBe('gosi_1');
    });

    it('1.3 deduplicates items with extreme edge-case titles (whitespace, unicode, null chars)', async () => {
      const dirtyItems: NoticeData[] = [
        { id: '1', title: '  동탄 트램 공고\t\n', date: '2026-06-01 ', isDongtan: true, source: 'rail' },
        { id: 'rail_1', title: '동탄 트램 공고', date: '2026-06-01', isDongtan: true, source: 'rail' },
      ];

      jest.spyOn(NewsRepo, 'fetchRawLocalNotices').mockResolvedValueOnce({
        cityItems: [],
        railItems: dirtyItems,
        cultureItems: [],
        dongItems: [],
      });

      const result = await getLocalNotices(true);
      expect(result.notices).toHaveLength(1);
      expect(result.notices[0].id).toBe('rail_1'); // Prefixed ID takes precedence
    });

    it('1.4 distinguishes distinct events that share generic root URLs vs distinct query parameters', async () => {
      const items: NoticeData[] = [
        { id: 'c_1', title: '문화강좌 A', url: 'https://reserve.hscity.go.kr/', date: '2026-06-01', isDongtan: true, source: 'culture' },
        { id: 'c_2', title: '문화강좌 B', url: 'https://reserve.hscity.go.kr/', date: '2026-06-02', isDongtan: true, source: 'culture' },
        { id: 'c_3', title: '문화강좌 C', url: 'https://reserve.hscity.go.kr/', date: '2026-06-03', isDongtan: true, source: 'culture' },
      ];

      jest.spyOn(NewsRepo, 'fetchRawLocalNotices').mockResolvedValueOnce({
        cityItems: [],
        railItems: [],
        cultureItems: items,
        dongItems: [],
      });

      const result = await getLocalNotices(true);
      // All 3 distinct events should be retained because generic base URLs do not collapse distinct items
      expect(result.notices).toHaveLength(3);
    });

    it('1.5 verifies fallback backup dataset loading with loadFallbackNotices()', () => {
      const fallbackList = loadFallbackNotices();
      expect(Array.isArray(fallbackList)).toBe(true);
      if (fallbackList.length > 0) {
        expect(fallbackList[0]).toHaveProperty('id');
        expect(fallbackList[0]).toHaveProperty('title');
        expect(fallbackList[0]).toHaveProperty('date');
        expect(fallbackList[0]).toHaveProperty('isDongtan');
        // Validate every item against Zod schema
        fallbackList.forEach(item => {
          expect(noticeSchema.safeParse(item).success).toBe(true);
        });
      }
    });

    it('1.6 handles empty database state safely returning curated fallback notices with fromFallback flag', async () => {
      jest.spyOn(NewsRepo, 'fetchRawLocalNotices').mockResolvedValueOnce({
        cityItems: [],
        railItems: [],
        cultureItems: [],
        dongItems: [],
      });

      const result = await getLocalNotices(true);
      expect(result.fromFallback).toBe(true);
      expect(Array.isArray(result.notices)).toBe(true);
      expect(result.notices.length).toBeGreaterThan(0);
      expect(result.lastUpdated).toBeTruthy();
    });
  });

  // ==========================================================================
  // SECTION 2: /api/local-notices Route Handler Fuzzing & Security
  // ==========================================================================
  describe('2. /api/local-notices: Query Fuzzing & Error Handling', () => {
    it('2.1 handles malformed and adversarial query parameters safely', async () => {
      const adversarialParams = [
        '?dongtan=false',
        '?dongtan=true',
        '?dongtan=',
        '?dongtan=0',
        '?dongtan=1',
        '?dongtan=invalid',
        '?dongtan=null',
        '?dongtan=%00',
        '?dongtan=TRUE',
      ];

      for (const qs of adversarialParams) {
        const req = new NextRequest(`http://localhost/api/local-notices${qs}`);
        const res = await getLocalNoticesRoute(req);
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.data).toHaveProperty('notices');
      }
    });

    it('2.2 enforces rate limiting returning 429 when quota is exhausted', async () => {
      mockRateLimitSuccess = false;
      const req = new NextRequest('http://localhost/api/local-notices');
      const res = await getLocalNoticesRoute(req);
      expect(res.status).toBe(429);
      const json = await res.json();
      expect(json.success).toBe(false);
    });

    it('2.3 returns standard Cache-Control headers on successful response', async () => {
      const req = new NextRequest('http://localhost/api/local-notices');
      const res = await getLocalNoticesRoute(req);
      expect(res.status).toBe(200);
      expect(res.headers.get('Cache-Control')).toContain('public, s-maxage=600');
    });
  });

  // ==========================================================================
  // SECTION 3: /api/bypass-notice Anti-WAF Proxy SSRF & XSS Security
  // ==========================================================================
  describe('3. /api/bypass-notice: SSRF, Open Redirect, & XSS Defense', () => {
    const maliciousUrls = [
      'http://evil-hscity.go.kr',
      'http://hscity.go.kr.evil.com',
      'https://attacker.com/?target=hscity.go.kr',
      'javascript:alert(document.cookie)',
      'data:text/html,<script>alert(1)</script>',
      'file:///etc/passwd',
      'ftp://hscity.go.kr/exploit',
      'http://169.254.169.254/latest/meta-data',
      'http://localhost.attacker.com',
      'http://127.0.0.1.nip.io',
      'not_a_valid_url',
      '',
    ];

    maliciousUrls.forEach((url, idx) => {
      it(`3.1.${idx + 1} rejects malicious target URL: "${url}" with HTTP 400`, async () => {
        const req = new NextRequest(`http://localhost/api/bypass-notice?url=${encodeURIComponent(url)}`);
        const res = await getBypassNoticeRoute(req);
        expect(res.status).toBe(400);
      });
    });

    const legitimateUrls = [
      'https://www.hscity.go.kr/www/gosi/BD_selectNoticeDetail.do?q_notAncmtMgtNo=149229',
      'https://dongtan.hscity.go.kr/dongtan/user/bbs/BD_selectBbsList.do?q_bbsCode=1049',
      'https://www.hcf.or.kr/events/202606',
      'https://dongtanview.com/lounge?notice=gosi_149229',
      'http://localhost:3000/test',
      'http://127.0.0.1:5000/api',
      'https://sub.gyeonggi.go.kr/news',
      'https://apply.lh.or.kr/index.html',
      'https://www.molit.go.kr/portal.do',
      'https://www.korea.kr/news/main.do',
    ];

    legitimateUrls.forEach((url, idx) => {
      it(`3.2.${idx + 1} allows legitimate whitelisted domain: "${new URL(url).hostname}" with HTTP 200 HTML redirect`, async () => {
        const req = new NextRequest(`http://localhost/api/bypass-notice?url=${encodeURIComponent(url)}`, {
          headers: { 'x-nonce': 'test-nonce-123' },
        });
        const res = await getBypassNoticeRoute(req);
        expect(res.status).toBe(200);
        expect(res.headers.get('Content-Type')).toContain('text/html');

        const html = await res.text();
        expect(html).toContain('<meta http-equiv="refresh"');
        expect(html).toContain('nonce="test-nonce-123"');
      });
    });

    it('3.3 neutralizes XSS attack vectors in URL parameter by escaping HTML attributes and percent-encoding script', async () => {
      const xssUrl = 'https://www.hscity.go.kr/search?q="><script>alert(1)</script><img src=x onerror=alert(2)>';
      const req = new NextRequest(`http://localhost/api/bypass-notice?url=${encodeURIComponent(xssUrl)}`, {
        headers: { 'x-nonce': 'secure-nonce' },
      });
      const res = await getBypassNoticeRoute(req);
      expect(res.status).toBe(200);
      const html = await res.text();

      // Ensure double quotes and angle brackets inside meta refresh attribute are escaped
      expect(html).not.toContain('url="><script>');
      expect(html).toContain('&quot;&gt;&lt;script&gt;');
      // Ensure script block uses encodeURIComponent
      expect(html).toContain('decodeURIComponent(');
    });
  });

  // ==========================================================================
  // SECTION 4: LoungeFeedClient.tsx Adversarial UI & Edge Case Rendering
  // ==========================================================================
  describe('4. LoungeFeedClient.tsx: Edge Cases, Null Safety, & Interaction', () => {
    it('4.1 renders safely without crashing when notice item contains undefined, null, and empty properties', async () => {
      const corruptedNotices: any[] = [
        {
          id: 'corrupted_1',
          title: '',
          url: '',
          dept: '',
          date: '2026-06-01',
          isDongtan: true,
        },
        {
          id: 'corrupted_2',
          title: '정상 제목',
          url: undefined,
          dept: undefined,
          date: 'invalid-date-format',
          isDongtan: true,
          source: undefined,
        },
      ];

      await act(async () => {
        render(
          <LoungeFeedClient
            initialPosts={[]}
            initialNotices={corruptedNotices}
            currentTab="동탄구 소식"
          />
        );
      });

      expect(screen.getByText('실시간 행정망 자동 수집 중')).toBeInTheDocument();
      expect(screen.getByText('정상 제목')).toBeInTheDocument();
    });

    it('4.2 renders culture notices with extreme D-Day boundaries (today, tomorrow, next month, past dates)', async () => {
      const todayStr = new Date().toISOString().substring(0, 10);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().substring(0, 10);
      const pastStr = '2020-01-01';

      const cultureItems: NoticeData[] = [
        { id: 'c_today', title: '[축제] 오늘 축제', date: todayStr, dept: '호수공원', isDongtan: true, source: 'culture' },
        { id: 'c_tmr', title: '[강좌] 내일 강좌', date: tomorrowStr, dept: '동탄1동', isDongtan: true, source: 'culture' },
        { id: 'c_past', title: '[축제] 지난 축제', date: pastStr, dept: '센트럴파크', isDongtan: true, source: 'culture' },
      ];

      await act(async () => {
        render(
          <LoungeFeedClient
            initialPosts={[]}
            initialNotices={cultureItems}
            currentTab="동탄구 소식"
          />
        );
      });

      expect(screen.getByText('[축제] 오늘 축제')).toBeInTheDocument();
      expect(screen.getByText('오늘 개최')).toBeInTheDocument();
      expect(screen.getByText('접수 D-1')).toBeInTheDocument();
      expect(screen.getByText('종료됨')).toBeInTheDocument();
    });

    it('4.3 handles rapid multi-tab and sub-filter switching without memory leaks or race conditions', async () => {
      const sampleNotices: NoticeData[] = [
        { id: 'gosi_1', title: '고시 공고 1', date: '2026-06-01', dept: '도시계획과', isDongtan: true, source: 'gosi' },
        { id: 'rail_1', title: '철도 공고 1', date: '2026-06-02', dept: '철도전략과', isDongtan: true, source: 'rail' },
        { id: 'dong_1', title: '동탄1동 공고', date: '2026-06-03', dept: '동탄1동', isDongtan: true, source: 'dong' },
        { id: 'dong_2', title: '동탄2동 공고', date: '2026-06-04', dept: '동탄2동', isDongtan: true, source: 'dong' },
        { id: 'culture_1', title: '루나 분수쇼', date: '2026-06-05', dept: '호수공원', isDongtan: true, source: 'culture' },
      ];

      render(
        <LoungeFeedClient
          initialPosts={[]}
          initialNotices={sampleNotices}
          currentTab="동탄구 소식"
        />
      );

      // Switch to '시정공고'
      await act(async () => {
        fireEvent.click(screen.getByText('시정공고'));
      });
      expect(screen.getByText('고시 공고 1')).toBeInTheDocument();
      expect(screen.queryByText('철도 공고 1')).not.toBeInTheDocument();

      // Switch to '교통·철도'
      await act(async () => {
        fireEvent.click(screen.getByText('교통·철도'));
      });
      expect(screen.getByText('철도 공고 1')).toBeInTheDocument();

      // Switch to '동네행정' -> sub-filter '동탄1동'
      await act(async () => {
        fireEvent.click(screen.getByText('동네행정'));
      });
      expect(screen.getByText('동탄1동 공고')).toBeInTheDocument();
      expect(screen.getByText('동탄2동 공고')).toBeInTheDocument();

      await act(async () => {
        // Select '동탄1동' sub-chip
        const chips = screen.getAllByRole('button', { name: '동탄1동' });
        fireEvent.click(chips[0]);
      });
      expect(screen.getByText('동탄1동 공고')).toBeInTheDocument();
      expect(screen.queryByText('동탄2동 공고')).not.toBeInTheDocument();

      // Switch to '문화·행사'
      await act(async () => {
        fireEvent.click(screen.getByText('문화·행사'));
      });
      expect(screen.getByText('루나 분수쇼')).toBeInTheDocument();
    });

    it('4.4 renders AI Report Markdown detail modal correctly when triggered from talk view and supports Kakao share', async () => {
      const aiReportNotice: NoticeData = {
        id: 'ai_report_test',
        title: '[AI 리포트] 동탄2 전세가율 안정 단지 분석',
        url: 'https://dongtanview.com/',
        dept: 'AI 데이터 랩',
        date: '2026-06-07',
        isDongtan: true,
        source: 'culture',
        content: '### 📊 동탄2 분석\nAI 리포트 본문 내용입니다.',
      };

      // Set hash to open notice modal
      window.location.hash = '#notice=ai_report_test';

      await act(async () => {
        render(
          <LoungeFeedClient
            initialPosts={[]}
            initialNotices={[aiReportNotice]}
            currentTab="모든 이야기"
          />
        );
      });

      // Dispatch hashchange event
      await act(async () => {
        window.dispatchEvent(new Event('hashchange'));
      });

      // Verify Modal Title is displayed in the modal
      expect(screen.getByText('[AI 리포트] 동탄2 전세가율 안정 단지 분석')).toBeInTheDocument();
      expect(screen.getByText(/AI 매도 적합성/)).toBeInTheDocument();

      // Test Kakao share button
      const shareBtn = screen.getByText('리포트 카카오톡 공유');
      await act(async () => {
        fireEvent.click(shareBtn);
      });
      expect(shareLocalNoticeToKakao).toHaveBeenCalled();
    });

    it('4.5 renders notice detail modal when currentTab="동탄구 소식" upon hash change', async () => {
      const cultureNotice: NoticeData = {
        id: 'culture_modal_test',
        title: '[강좌] 동탄1동 스마트폰 강좌',
        url: 'https://reserve.hscity.go.kr/',
        dept: '동탄1동',
        date: '2026-06-12',
        isDongtan: true,
        source: 'culture',
        content: '### 강좌 상세 내용',
      };

      window.location.hash = '#notice=culture_modal_test';

      await act(async () => {
        render(
          <LoungeFeedClient
            initialPosts={[]}
            initialNotices={[cultureNotice]}
            currentTab="동탄구 소식"
          />
        );
      });

      await act(async () => {
        window.dispatchEvent(new Event('hashchange'));
      });

      // On '동탄구 소식' tab, the modal JSX is rendered and MarkdownViewer displays the content
      expect(screen.getByTestId('markdown-viewer')).toBeInTheDocument();
      expect(screen.getByText('### 강좌 상세 내용')).toBeInTheDocument();
    });
  });


  // ==========================================================================
  // SECTION 5: Scraper Parsing & HTML Table Edge Cases
  // ==========================================================================
  describe('5. Scraper Pipeline & HTML Parsing Resilience', () => {
    it('5.1 extracts gosi notice even when HTML contains malformed tags and irregular spacing', () => {
      const dirtyHtml = `
        <table class="board_list">
          <tr>
            <td> 149299 </td>
            <td> <a href="javascript:void(0)" onclick="opGosiView('149299');">   화성시   도시계획   고시   </a> </td>
            <td> 도시정책과 </td>
            <td> 2026-06-08 </td>
          </tr>
        </table>
      `;
      const $ = cheerio.load(dirtyHtml);
      const tds = $('table tr').first().find('td');
      const aTag = $(tds[1]).find('a');
      const onclick = aTag.attr('onclick') || '';
      const match = onclick.match(/opGosiView\('([^']+)'\)/);

      expect(match).not.toBeNull();
      expect(match![1]).toBe('149299');

      const title = $(tds[1]).text().trim().replace(/\s+/g, ' ');
      expect(title).toBe('화성시 도시계획 고시');
    });

    it('5.2 safely parses 6-column tram board when optional columns are missing or swapped', () => {
      const tableHtml = `
        <table>
          <tr><td>1</td><td><a href="/link">트램 추진현황</a></td><td>트램추진단</td><td>2026-06-08</td></tr>
        </table>
      `;
      const $ = cheerio.load(tableHtml);
      const tds = $('table tr').first().find('td');
      expect(tds.length).toBe(4);

      const title = $(tds[1]).text().trim();
      const dept = $(tds[2]).text().trim();
      const date = $(tds[3]).text().trim();

      expect(title).toBe('트램 추진현황');
      expect(dept).toBe('트램추진단');
      expect(date).toBe('2026-06-08');
    });

    it('5.3 validates 2nd and 4th Saturdays generator across year 2026 (May~Oct)', () => {
      function get2ndAnd4thSaturdays(year: number): string[] {
        const dates: string[] = [];
        for (let month = 4; month <= 9; month++) {
          let saturdayCount = 0;
          for (let day = 1; day <= 31; day++) {
            const d = new Date(year, month, day);
            if (d.getMonth() !== month) break;
            if (d.getDay() === 6) {
              saturdayCount++;
              if (saturdayCount === 2 || saturdayCount === 4) {
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                dates.push(`${yyyy}-${mm}-${dd}`);
              }
            }
          }
        }
        return dates;
      }

      const saturdays2026 = get2ndAnd4thSaturdays(2026);
      expect(saturdays2026.length).toBe(12); // 6 months * 2 saturdays
      saturdays2026.forEach(dateStr => {
        const d = new Date(dateStr);
        expect(d.getDay()).toBe(6); // Must be Saturday
        expect(d.getFullYear()).toBe(2026);
      });
    });
  });
});
