import { preloadImage, preloadJson } from './preloadHelpers';

describe('preloadHelpers Pure Asset Preloader Suite', () => {
  const originalImage = global.Image;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    global.Image = originalImage;
  });

  describe('preloadImage', () => {
    it('returns immediately if window is undefined or src is empty', async () => {
      await expect(preloadImage('')).resolves.toBeUndefined();
    });

    it('loads image and marks asset as preloaded', async () => {
      class MockImage {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        set src(_val: string) {
          setTimeout(() => {
            if (this.onload) this.onload();
          }, 10);
        }
      }
      global.Image = MockImage as unknown as typeof Image;

      const promise = preloadImage('https://example.com/test.png');
      await expect(promise).resolves.toBeUndefined();
    });
  });

  describe('preloadJson', () => {
    it('returns null if window is undefined or url is empty', async () => {
      const result = await preloadJson('');
      expect(result).toBeNull();
    });

    it('fetches JSON with low priority and returns parsed data', async () => {
      const mockData = { test: 123 };
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockData,
      });

      const result = await preloadJson('https://example.com/data.json');
      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith('https://example.com/data.json', expect.objectContaining({
        priority: 'low',
      }));
    });

    it('handles fetch failures gracefully and returns null', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      const result = await preloadJson('https://example.com/failed.json');
      expect(result).toBeNull();
    });
  });
});
