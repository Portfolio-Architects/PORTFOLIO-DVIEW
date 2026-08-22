/**
 * @file m2_challenger_adversarial.test.ts
 * @description Empirical Challenger tests for Milestone 2:
 * 1. Missing PUBLIC_DATA_PORTAL_KEY handling in fetchOfficeXmlFromPublicPortal & fetchEnergyJsonFromPublicPortal
 * 2. Malformed / Partial Firestore document resilience in report.repository & post.repository
 * 3. traffic.repository direct methods (incrementWebsiteVisitDirect, incrementContentViewDirect, getDailyVisitStats, getDailyContentViews)
 */

import { fetchOfficeXmlFromPublicPortal } from '@/lib/repositories/officeTx.repository';
import { fetchEnergyJsonFromPublicPortal } from '@/lib/repositories/energy.repository';
import { MOLIT_API_CONFIG } from '@/lib/config/api.config';
import * as ReportRepo from '@/lib/repositories/report.repository';
import * as PostRepo from '@/lib/repositories/post.repository';
import * as TrafficRepo from '@/lib/repositories/traffic.repository';
import * as firestore from 'firebase/firestore';

// Mock dependencies
const mockAdminSet = jest.fn().mockResolvedValue(undefined);
const mockAdminDoc = jest.fn().mockReturnValue({
  set: mockAdminSet,
  collection: jest.fn().mockReturnValue({
    doc: jest.fn().mockReturnValue({ set: mockAdminSet }),
  }),
});
const mockAdminCollection = jest.fn().mockReturnValue({
  doc: mockAdminDoc,
  get: jest.fn().mockResolvedValue({ docs: [] }),
});

jest.mock('@/lib/firebaseAdmin', () => ({
  adminDb: null,
  FieldValue: {
    increment: (n: number) => ({ _increment: n }),
  },
}));

jest.mock('@/lib/redis', () => ({
  redis: null,
}));

jest.mock('@/lib/firebaseConfig', () => ({
  db: { __mockDb: true },
}));

const createMockDocSnap = (data: any, exists = true, id = 'test-doc-id') => ({
  id,
  exists: () => exists,
  data: () => data,
  ref: {
    parent: {
      parent: {
        id: 'parent-id-123',
        parent: { id: 'field_reports' }
      }
    }
  }
});

const createMockQuerySnap = (docs: any[]) => ({
  empty: docs.length === 0,
  docs,
  forEach: (fn: any) => docs.forEach(fn),
});

jest.mock('firebase/firestore', () => {
  const original = jest.requireActual('firebase/firestore');
  return {
    ...original,
    collection: jest.fn(() => ({
      type: 'collection',
      withConverter: jest.fn(() => ({ type: 'collection_with_converter' })),
    })),
    collectionGroup: jest.fn(() => ({ type: 'collectionGroup' })),
    doc: jest.fn(() => ({
      type: 'doc',
      withConverter: jest.fn(() => ({ type: 'doc_with_converter' })),
    })),
    query: jest.fn(() => ({ type: 'query' })),
    where: jest.fn(),
    orderBy: jest.fn(),
    limit: jest.fn(),
    getDoc: jest.fn(),
    getDocs: jest.fn(),
    addDoc: jest.fn(() => Promise.resolve({ id: 'new-doc-id' })),
    updateDoc: jest.fn(() => Promise.resolve()),
    deleteDoc: jest.fn(() => Promise.resolve()),
    increment: jest.fn((n) => n),
    serverTimestamp: jest.fn(() => 1700000000000),
    onSnapshot: jest.fn(),
  };
});

describe('M2 Empirical Challenger Test Suite', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('1. Public Portal Key Resilience', () => {
    test('fetchOfficeXmlFromPublicPortal returns empty XML response when PUBLIC_DATA_PORTAL_KEY is undefined', async () => {
      delete process.env.PUBLIC_DATA_PORTAL_KEY;

      const result = await fetchOfficeXmlFromPublicPortal('41590', '202605');
      expect(result).toBeDefined();
      expect(result).toContain('<response>');
      expect(result).toContain('<items></items>');
      expect(result).toContain('NORMAL SERVICE');
    });

    test('fetchOfficeXmlFromPublicPortal returns empty XML response when PUBLIC_DATA_PORTAL_KEY is empty string', async () => {
      process.env.PUBLIC_DATA_PORTAL_KEY = '';

      const result = await fetchOfficeXmlFromPublicPortal('41590', '202605');
      expect(result).toContain('<items></items>');
    });

    test('fetchEnergyJsonFromPublicPortal returns valid JSON with error code when PUBLIC_DATA_PORTAL_KEY is undefined', async () => {
      delete process.env.PUBLIC_DATA_PORTAL_KEY;

      const result = await fetchEnergyJsonFromPublicPortal('41590', '202605', '0100', '0000');
      expect(result).toBeDefined();
      const parsed = JSON.parse(result);
      expect(parsed.response).toBeDefined();
      expect(parsed.response.header.resultCode).toBe('99');
      expect(parsed.response.header.resultMsg).toContain('PUBLIC_DATA_PORTAL_KEY is not configured');
      expect(parsed.response.body.items.item).toEqual([]);
    });

    test('MOLIT_API_CONFIG dynamically retrieves serviceKey from process.env without hardcoding', () => {
      delete process.env.PUBLIC_DATA_PORTAL_KEY;
      expect(MOLIT_API_CONFIG.serviceKey).toBe('');

      process.env.PUBLIC_DATA_PORTAL_KEY = 'custom-secret-key-xyz';
      expect(MOLIT_API_CONFIG.serviceKey).toBe('custom-secret-key-xyz');
    });
  });

  describe('2. Malformed / Partial Firestore Document Resilience in Repositories', () => {
    const mockedFirestore = firestore as unknown as {
      getDoc: jest.Mock;
      getDocs: jest.Mock;
    };

    test('report.repository.getFullReport gracefully handles partial / empty data object', async () => {
      mockedFirestore.getDoc.mockResolvedValueOnce(createMockDocSnap({}, true, 'report-empty'));

      const report = await ReportRepo.getFullReport('report-empty');
      expect(report).not.toBeNull();
      expect(report?.id).toBe('report-empty');
      expect(report?.dong).toBe('오산동 (동탄역)');
      expect(report?.likes).toBe(0);
      expect(report?.viewCount).toBe(0);
      expect(report?.commentCount).toBe(0);
      expect(report?.images).toEqual([]);
    });

    test('report.repository.getFullReport handles completely corrupted / unexpected fields', async () => {
      mockedFirestore.getDoc.mockResolvedValueOnce(createMockDocSnap({
        dong: 12345, // invalid type
        apartmentName: null,
        likes: 'not-a-number',
        metrics: 'invalid-structure',
        images: 'not-an-array',
      }, true, 'corrupt-doc-1'));

      const report = await ReportRepo.getFullReport('corrupt-doc-1');
      expect(report).not.toBeNull();
      expect(report?.id).toBe('corrupt-doc-1');
    });

    test('report.repository.getFullReportByApartmentName handles empty result safely', async () => {
      mockedFirestore.getDocs.mockResolvedValueOnce(createMockQuerySnap([]));

      const report = await ReportRepo.getFullReportByApartmentName('NonExistentApartment');
      expect(report).toBeNull();
    });

    test('post.repository.getPost handles null / missing fields safely with fallbacks', async () => {
      mockedFirestore.getDoc.mockResolvedValueOnce(createMockDocSnap({}, true, 'post-empty-1'));

      const post = await PostRepo.getPost('post-empty-1');
      expect(post).not.toBeNull();
      expect(post?.id).toBe('post-empty-1');
      expect(post?.title).toBe('');
      expect(post?.author).toBe('익명');
      expect(post?.likes).toBe(0);
      expect(post?.views).toBe(0);
      expect(post?.createdAt).toBeNull();
    });

    test('post.repository.getRecentPosts handles mixture of malformed and valid docs', async () => {
      const corruptPostDoc = createMockDocSnap({
        title: null,
        category: undefined,
        content: null,
        likes: 'invalid',
        createdAt: null,
      }, true, 'corrupt-post');

      const validPostDoc = createMockDocSnap({
        title: '정상 게시글',
        category: '교통',
        content: '동탄역 인근 소식 ![이미지](https://example.com/img.png)',
        authorName: '작성자1',
        likes: 5,
        views: 10,
        createdAt: { seconds: 1700000000, nanoseconds: 0 },
      }, true, 'valid-post');

      const corruptCommentDoc = createMockDocSnap({
        text: null,
        createdAt: 'invalid-date',
      }, true, 'corrupt-comment');

      const corruptStoryDoc = createMockDocSnap({
        apartmentName: null,
        text: undefined,
      }, true, 'corrupt-story');

      mockedFirestore.getDocs
        .mockResolvedValueOnce(createMockQuerySnap([corruptPostDoc, validPostDoc])) // posts
        .mockResolvedValueOnce(createMockQuerySnap([corruptCommentDoc])) // comments
        .mockResolvedValueOnce(createMockQuerySnap([corruptStoryDoc])) // stories
        .mockResolvedValue(createMockDocSnap({ apartmentName: '동탄역 롯데캐슬' })); // parent doc lookup

      const recentItems = await PostRepo.getRecentPosts(10);
      expect(recentItems).toBeDefined();
      expect(Array.isArray(recentItems)).toBe(true);
      expect(recentItems.length).toBeGreaterThan(0);
      
      const validItem = recentItems.find(item => item.id === 'valid-post');
      expect(validItem).toBeDefined();
      expect(validItem?.title).toBe('정상 게시글');
      expect(validItem?.imageUrl).toBe('https://example.com/img.png');
    });
  });

  describe('3. Traffic Repository Resilience & Direct Operations', () => {
    const mockedFirestore = firestore as unknown as {
      getDocs: jest.Mock;
    };

    test('traffic.repository.getDailyVisitStats parses valid and missing stats gracefully', async () => {
      const statsDocs = [
        createMockDocSnap({ websiteVisits: 142 }, true, '2026-05-01'),
        createMockDocSnap({ websiteVisits: null }, true, '2026-05-02'),
        createMockDocSnap({}, true, '2026-05-03'),
      ];

      mockedFirestore.getDocs.mockResolvedValueOnce(createMockQuerySnap(statsDocs));

      const stats = await TrafficRepo.getDailyVisitStats();
      expect(stats.length).toBe(3);
      expect(stats[0]).toEqual({ date: '2026-05-01', websiteVisits: 142 });
      expect(stats[1]).toEqual({ date: '2026-05-02', websiteVisits: 0 });
      expect(stats[2]).toEqual({ date: '2026-05-03', websiteVisits: 0 });
    });

    test('traffic.repository.getDailyContentViews parses views and handles fallback defaults', async () => {
      const viewsDocs = [
        createMockDocSnap({ title: '리포트 1', type: 'report', views: 50 }, true, 'content-1'),
        createMockDocSnap({ title: null, type: undefined, views: null }, true, 'content-2'),
        createMockDocSnap({}, true, 'content-3'),
      ];

      mockedFirestore.getDocs.mockResolvedValueOnce(createMockQuerySnap(viewsDocs));

      const views = await TrafficRepo.getDailyContentViews('2026-05-01');
      expect(views.length).toBe(3);
      expect(views[0].title).toBe('리포트 1');
      expect(views[0].views).toBe(50);
      expect(views[1].title).toBe('알 수 없음');
      expect(views[1].views).toBe(0);
      expect(views[2].title).toBe('알 수 없음');
      expect(views[2].type).toBe('unknown');
    });

    test('traffic.repository.incrementWebsiteVisit runs in Node environment without browser fetch crash', async () => {
      await expect(TrafficRepo.incrementWebsiteVisit()).resolves.not.toThrow();
    });

    test('traffic.repository.incrementContentView runs in Node environment without browser fetch crash', async () => {
      await expect(TrafficRepo.incrementContentView('test-id', 'test title', 'report')).resolves.not.toThrow();
    });
  });
});
