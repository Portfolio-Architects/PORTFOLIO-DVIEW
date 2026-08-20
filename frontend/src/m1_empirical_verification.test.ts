import { renderHook, act } from '@testing-library/react';
import { useAdBlockDetector } from '@/hooks/useAdBlockDetector';
import { getComments } from '@/lib/repositories/comment.repository';

// Mock dependencies
jest.mock('@/lib/firebaseConfig', () => ({
  db: {},
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => ({ withConverter: jest.fn() })),
  query: jest.fn(),
  orderBy: jest.fn(),
  getDocs: jest.fn().mockResolvedValue({
    docs: [
      {
        id: 'doc-1',
        data: () => ({
          text: 'Great report!',
          authorName: 'User1',
          authorUid: 'uid-123',
          createdAt: { toDate: () => new Date('2026-01-01T00:00:00Z') }
        })
      },
      {
        id: 'doc-2',
        data: () => ({
          // Corrupted / missing fields to stress test schema validation fallback
          text: undefined,
          authorName: undefined,
          authorUid: undefined,
          createdAt: null
        })
      }
    ]
  }),
  doc: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  increment: jest.fn(),
  serverTimestamp: jest.fn(),
  getDoc: jest.fn(),
  writeBatch: jest.fn(() => ({
    set: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    commit: jest.fn().mockResolvedValue(undefined)
  })),
  where: jest.fn(),
  onSnapshot: jest.fn()
}));

jest.mock('@/lib/utils/firestoreThrottle', () => ({
  throttle: jest.fn((fn: () => unknown) => fn())
}));

describe('Milestone 1 Empirical Verification Harness', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('1. Global Window Typing & Runtime Behavior', () => {
    it('verifies Window interface extensions compile and resolve at runtime', () => {
      // Test window extension properties exist in TypeScript types without `any`
      window.__E2E_MOCK_AUTH__ = true;
      expect(window.__E2E_MOCK_AUTH__).toBe(true);
      window.__E2E_MOCK_AUTH__ = undefined;

      window.SyncManager = {};
      expect(window.SyncManager).toBeDefined();
      delete (window as Partial<Window>).SyncManager;

      const mockIdle = jest.fn().mockReturnValue(42);
      const mockCancel = jest.fn();
      window.requestIdleCallback = mockIdle;
      window.cancelIdleCallback = mockCancel;

      const id = window.requestIdleCallback?.(() => {}, { timeout: 1000 });
      expect(id).toBe(42);
      expect(mockIdle).toHaveBeenCalled();

      window.cancelIdleCallback?.(id!);
      expect(mockCancel).toHaveBeenCalledWith(42);
    });

    it('handles adsbygoogle as Array, Object with push, and undefined safely', () => {
      // Case A: adsbygoogle is undefined (AdBlock active or script blocked)
      delete (window as Partial<Window>).adsbygoogle;
      const { result: resA } = renderHook(() => useAdBlockDetector());
      act(() => {
        jest.advanceTimersByTime(2100);
      });
      expect(resA.current.isLoading).toBe(false);
      expect(resA.current.isAdBlockActive).toBe(true);

      // Case B: adsbygoogle is Array with dummy push (AdBlock blocked script)
      window.adsbygoogle = [];
      const { result: resB } = renderHook(() => useAdBlockDetector());
      act(() => {
        jest.advanceTimersByTime(2100);
      });
      expect(resB.current.isLoading).toBe(false);
      // Because [].push === Array.prototype.push -> indicates adsbygoogle script was blocked from executing
      expect(resB.current.isAdBlockActive).toBe(true);

      // Case C: adsbygoogle is loaded by Google AdSense with custom push handler
      // In JSDOM, mock non-zero layout dimensions to test scriptBlocked branch in isolation
      const origOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');
      const origClientHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight');
      const origGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;

      Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 10 });
      Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 10 });
      HTMLElement.prototype.getBoundingClientRect = () => ({
        height: 10,
        width: 10,
        top: 0,
        bottom: 10,
        left: 0,
        right: 10,
        x: 0,
        y: 0,
        toJSON: () => {}
      });

      const customPush = jest.fn();
      window.adsbygoogle = { push: customPush };
      const { result: resC } = renderHook(() => useAdBlockDetector());
      act(() => {
        jest.advanceTimersByTime(2100);
      });
      expect(resC.current.isLoading).toBe(false);
      expect(resC.current.isAdBlockActive).toBe(false);

      // Restore layout descriptors
      if (origOffsetHeight) Object.defineProperty(HTMLElement.prototype, 'offsetHeight', origOffsetHeight);
      if (origClientHeight) Object.defineProperty(HTMLElement.prototype, 'clientHeight', origClientHeight);
      HTMLElement.prototype.getBoundingClientRect = origGetBoundingClientRect;
    });
  });

  describe('2. CommentRepository Type Safety & Schema Fallback', () => {
    it('safely parses valid comments and falls back gracefully for corrupted docs without `any` crashes', async () => {
      const comments = await getComments('test-report-id');

      expect(comments).toHaveLength(2);
      
      // Doc 1: Valid
      expect(comments[0]).toEqual({
        id: 'doc-1',
        text: 'Great report!',
        author: 'User1',
        authorUid: 'uid-123',
        createdAt: expect.any(String)
      });

      // Doc 2: Corrupted/missing data falls back to defaults without throwing
      expect(comments[1]).toEqual({
        id: 'doc-2',
        text: '',
        author: '익명',
        authorUid: '',
        createdAt: '방금 전'
      });
    });
  });
});
