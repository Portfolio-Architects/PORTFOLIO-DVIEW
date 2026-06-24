import { logger } from './logger';

describe('Structured Logger Service', () => {
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let debugSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
    debugSpy.mockRestore();
  });

  it('should log structured info messages with timestamp, level, context and message', () => {
    logger.info('TestContext', 'Hello Info', { foo: 'bar' });

    expect(logSpy).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(logSpy.mock.calls[0][0]);
    expect(parsed.level).toBe('INFO');
    expect(parsed.context).toBe('TestContext');
    expect(parsed.message).toBe('Hello Info');
    expect(parsed.data).toEqual({ foo: 'bar' });
    expect(parsed.timestamp).toBeDefined();
  });

  it('should log structured warn messages with optional error details', () => {
    const error = new Error('Test Warning Error');
    logger.warn('TestContext', 'Hello Warn', { hello: 'world' }, error);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(warnSpy.mock.calls[0][0]);
    expect(parsed.level).toBe('WARN');
    expect(parsed.context).toBe('TestContext');
    expect(parsed.message).toBe('Hello Warn');
    expect(parsed.data).toEqual({ hello: 'world' });
    expect(parsed.error).toBeDefined();
    expect(parsed.error.name).toBe('Error');
    expect(parsed.error.message).toBe('Test Warning Error');
    expect(parsed.error.stack).toBeDefined();
  });

  it('should log structured error messages with raw string errors', () => {
    logger.error('TestContext', 'Hello Error', undefined, 'Something went wrong');

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(errorSpy.mock.calls[0][0]);
    expect(parsed.level).toBe('ERROR');
    expect(parsed.context).toBe('TestContext');
    expect(parsed.message).toBe('Hello Error');
    expect(parsed.error).toEqual({ message: 'Something went wrong' });
  });

  it('should handle debug logging correctly in development environment', () => {
    const originalEnv = process.env.NODE_ENV;
    
    // Set development
    (process.env as any).NODE_ENV = 'development';
    logger.debug('TestContext', 'Debug message');
    expect(debugSpy).toHaveBeenCalledTimes(1);

    debugSpy.mockClear();

    // Set production
    (process.env as any).NODE_ENV = 'production';
    logger.debug('TestContext', 'Debug message');
    expect(debugSpy).not.toHaveBeenCalled();

    // Restore original
    (process.env as any).NODE_ENV = originalEnv;
  });
});
