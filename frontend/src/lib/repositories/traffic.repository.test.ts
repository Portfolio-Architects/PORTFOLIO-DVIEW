import * as TrafficRepo from './traffic.repository';

// Mock dependencies
const mockSet = jest.fn().mockResolvedValue(undefined);
const mockDoc = jest.fn().mockReturnValue({
  set: mockSet,
  collection: jest.fn().mockReturnValue({
    doc: jest.fn().mockReturnValue({ set: mockSet }),
  }),
});
const mockCollection = jest.fn().mockReturnValue({
  doc: mockDoc,
  get: jest.fn().mockResolvedValue({ docs: [] }),
});

jest.mock('@/lib/firebaseAdmin', () => ({
  adminDb: {
    collection: mockCollection,
  },
  FieldValue: {
    increment: (n: number) => ({ _increment: n }),
  },
}));

describe('TrafficRepository Server-Direct Tracking & Fallbacks Suite', () => {
  let originalWindow: typeof global.window;

  beforeEach(() => {
    jest.clearAllMocks();
    originalWindow = global.window;
  });

  afterEach(() => {
    global.window = originalWindow;
  });

  it('increments website visit directly in server context', async () => {
    // Simulate server/node context where window is undefined
    delete (global as Record<string, unknown>).window;

    await TrafficRepo.incrementWebsiteVisitDirect();
    expect(mockCollection).toHaveBeenCalledWith('daily_stats');
    expect(mockSet).toHaveBeenCalled();
  });

  it('increments content view directly in server context', async () => {
    // Simulate server/node context where window is undefined
    delete (global as Record<string, unknown>).window;

    await TrafficRepo.incrementContentViewDirect('test-report-1', '테스트 리포트', 'report');
    expect(mockCollection).toHaveBeenCalledWith('daily_stats');
    expect(mockSet).toHaveBeenCalled();
  });

  it('handles client-side increment via fetch call when window is defined', async () => {
    const mockFetch = jest.fn().mockResolvedValue({ ok: true });
    (global as Record<string, unknown>).window = {};
    global.fetch = mockFetch;

    await TrafficRepo.incrementWebsiteVisit();
    expect(mockFetch).toHaveBeenCalledWith('/api/traffic', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ action: 'websiteVisit' }),
    }));

    await TrafficRepo.incrementContentView('content-123', '테스트 제목', 'lounge');
    expect(mockFetch).toHaveBeenCalledWith('/api/traffic', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ action: 'contentView', contentId: 'content-123', title: '테스트 제목', type: 'lounge' }),
    }));
  });
});
