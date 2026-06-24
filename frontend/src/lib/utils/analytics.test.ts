import { trackEvent } from './analytics';
import { sendGAEvent } from '@next/third-parties/google';
import { logger } from '@/lib/services/logger';

// Mock sendGAEvent
jest.mock('@next/third-parties/google', () => ({
  sendGAEvent: jest.fn(),
}));

// Mock logger
jest.mock('@/lib/services/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe('analytics.trackEvent Utility', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let consoleSpy: jest.SpyInstance;
  let originalWindow: any;

  beforeEach(() => {
    originalEnv = { ...process.env };
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    localStorage.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    consoleSpy.mockRestore();
  });

  it('should log to console in development mode', () => {
    (process.env as any).NODE_ENV = 'development';
    trackEvent('test_event', { key: 'value' });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Analytics Event] test_event'),
      expect.any(String),
      { key: 'value' }
    );
    expect(sendGAEvent).not.toHaveBeenCalled();
  });

  it('should not track anything if the user is an admin', () => {
    (process.env as any).NODE_ENV = 'development';
    localStorage.setItem('dview_is_admin', 'true');

    trackEvent('test_event', { key: 'value' });

    expect(consoleSpy).not.toHaveBeenCalled();
    expect(sendGAEvent).not.toHaveBeenCalled();
  });

  it('should call sendGAEvent in production if NEXT_PUBLIC_GA_ID is set', () => {
    (process.env as any).NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_GA_ID = 'G-TEST';

    trackEvent('prod_event', { foo: 'bar' });

    expect(consoleSpy).not.toHaveBeenCalled();
    expect(sendGAEvent).toHaveBeenCalledWith({
      event: 'prod_event',
      foo: 'bar',
    });
  });

  it('should not call sendGAEvent in production if NEXT_PUBLIC_GA_ID is missing', () => {
    (process.env as any).NODE_ENV = 'production';
    delete process.env.NEXT_PUBLIC_GA_ID;

    trackEvent('prod_event', { foo: 'bar' });

    expect(consoleSpy).not.toHaveBeenCalled();
    expect(sendGAEvent).not.toHaveBeenCalled();
  });

  it('should log an error if sendGAEvent throws an exception', () => {
    (process.env as any).NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_GA_ID = 'G-TEST';

    const testError = new Error('GA Network Error');
    (sendGAEvent as jest.Mock).mockImplementationOnce(() => {
      throw testError;
    });

    trackEvent('error_event', { data: 123 });

    expect(logger.error).toHaveBeenCalledWith(
      'analytics.trackEvent',
      'Failed to send GA event',
      undefined,
      testError
    );
  });
});
