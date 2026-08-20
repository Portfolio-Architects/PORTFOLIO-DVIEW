import { resilientFetch, resilientFetchJson, resilientFetchText } from '../resilientFetch';

// Mock global fetch
const originalFetch = global.fetch;

describe('resilientFetch Helper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('should return response on first successful attempt', async () => {
    const mockResponse = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    global.fetch = jest.fn().mockResolvedValue(mockResponse);

    const res = await resilientFetch('https://api.example.com/data', { timeoutMs: 1000 });
    expect(res.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('should retry when 500 error occurs and succeed on subsequent attempt', async () => {
    const errorResponse = new Response('Server Error', { status: 503 });
    const successResponse = new Response(JSON.stringify({ recovered: true }), { status: 200 });

    global.fetch = jest.fn()
      .mockResolvedValueOnce(errorResponse)
      .mockResolvedValueOnce(successResponse);

    const onRetry = jest.fn();
    const res = await resilientFetch('https://api.example.com/flake', {
      retries: 2,
      retryDelayMs: 10,
      onRetry
    });

    expect(res.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('should retry on network throw and succeed', async () => {
    const successResponse = new Response(JSON.stringify({ success: true }), { status: 200 });

    global.fetch = jest.fn()
      .mockRejectedValueOnce(new Error('Network connection reset'))
      .mockResolvedValueOnce(successResponse);

    const res = await resilientFetch('https://api.example.com/network', {
      retries: 1,
      retryDelayMs: 10
    });

    expect(res.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('should throw when all retries are exhausted', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Fatal connection refused'));

    await expect(
      resilientFetch('https://api.example.com/fail', {
        retries: 2,
        retryDelayMs: 10
      })
    ).rejects.toThrow('Fatal connection refused');

    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it('should parse json correctly with resilientFetchJson', async () => {
    const data = { hello: 'world', count: 42 };
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify(data), { status: 200 })
    );

    const result = await resilientFetchJson<{ hello: string; count: number }>('https://api.example.com/json');
    expect(result).toEqual(data);
  });

  it('should fetch text correctly with resilientFetchText', async () => {
    const rawXml = '<root><item>value</item></root>';
    global.fetch = jest.fn().mockResolvedValue(
      new Response(rawXml, { status: 200 })
    );

    const result = await resilientFetchText('https://api.example.com/xml');
    expect(result).toBe(rawXml);
  });

  it('should abort immediately when signal is pre-aborted', async () => {
    const controller = new AbortController();
    controller.abort(new Error('Pre-aborted test'));

    global.fetch = jest.fn().mockImplementation((_url, init) => {
      if (init?.signal?.aborted) {
        return Promise.reject(init.signal.reason || new Error('Aborted'));
      }
      return Promise.resolve(new Response('ok', { status: 200 }));
    });

    await expect(
      resilientFetch('https://api.example.com/aborted', {
        signal: controller.signal,
        retries: 0,
      })
    ).rejects.toThrow('Pre-aborted test');
  });

  it('should abort during fetch when signal aborts', async () => {
    const controller = new AbortController();

    global.fetch = jest.fn().mockImplementation((_url, init) => {
      return new Promise((_, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(init.signal.reason || new Error('Aborted during flight'));
        });
      });
    });

    const fetchPromise = resilientFetch('https://api.example.com/in-flight', {
      signal: controller.signal,
      retries: 0,
    });

    setTimeout(() => {
      controller.abort(new Error('Canceled by user'));
    }, 20);

    await expect(fetchPromise).rejects.toThrow('Canceled by user');
  });
});

