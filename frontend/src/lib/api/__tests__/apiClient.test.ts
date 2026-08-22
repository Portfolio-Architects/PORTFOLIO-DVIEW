import { ApiClient, ApiClientError } from '../apiClient';

describe('ApiClient Unit & Adversarial Tests', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('should successfully execute GET request with query params', async () => {
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ success: true, data: { name: '목동14단지' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );

    const client = new ApiClient(5000);
    const result = await client.get<{ success: boolean; data: { name: string } }>('/api/test', {
      params: { dong: '신정동', count: 10, empty: null },
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/test?dong=%EC%8B%A0%EC%A0%95%EB%8F%99&count=10',
      expect.objectContaining({
        method: 'GET',
      })
    );
    expect(result.data.name).toBe('목동14단지');
  });

  it('should automatically unwrap envelope when unwrapEnvelope is true', async () => {
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ success: true, data: { apt: '목동13단지' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );

    const client = new ApiClient();
    const data = await client.get<{ apt: string }>('/api/test', { unwrapEnvelope: true });
    expect(data.apt).toBe('목동13단지');
  });

  it('should serialize JSON body on POST/PUT requests', async () => {
    let capturedBody = '';
    let capturedContentType = '';

    global.fetch = jest.fn().mockImplementation((_url: string, init?: RequestInit) => {
      capturedBody = init?.body as string;
      const headers = new Headers(init?.headers);
      capturedContentType = headers.get('Content-Type') || '';
      return Promise.resolve(
        new Response(JSON.stringify({ success: true, id: 'created-123' }), { status: 201 })
      );
    });

    const client = new ApiClient();
    const response = await client.post<{ success: boolean; id: string }>('/api/posts', {
      title: '테스트 글',
      price: 150000,
    });

    expect(JSON.parse(capturedBody)).toEqual({ title: '테스트 글', price: 150000 });
    expect(capturedContentType).toBe('application/json');
    expect(response.id).toBe('created-123');
  });

  it('should throw typed ApiClientError on API error envelope', async () => {
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            success: false,
            error: 'UNAUTHORIZED',
            message: '로그인이 필요한 서비스입니다.',
            code: 'AUTH_REQUIRED',
            details: { redirect: '/login' },
          }),
          { status: 401 }
        )
      )
    );

    const client = new ApiClient();
    await expect(client.get('/api/protected')).rejects.toThrow('로그인이 필요한 서비스입니다.');

    try {
      await client.get('/api/protected');
    } catch (err) {
      expect(err instanceof ApiClientError).toBe(true);
      const apiErr = err as ApiClientError;
      expect(apiErr.status).toBe(401);
      expect(apiErr.code).toBe('AUTH_REQUIRED');
      expect(apiErr.details).toEqual({ redirect: '/login' });
    }
  });

  it('should handle request cancellation via AbortSignal', async () => {
    const controller = new AbortController();

    global.fetch = jest.fn().mockImplementation((_url: string, init?: RequestInit) => {
      return new Promise((_, reject) => {
        if (init?.signal) {
          init.signal.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          });
        }
      });
    });

    const client = new ApiClient(5000);
    const promise = client.get('/api/slow', { signal: controller.signal });

    controller.abort();

    await expect(promise).rejects.toThrow('aborted');
  });

  it('should throw timeout error when request exceeds timeoutMs', async () => {
    global.fetch = jest.fn().mockImplementation((_url: string, init?: RequestInit) => {
      return new Promise((_, reject) => {
        if (init?.signal) {
          init.signal.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          });
        }
      });
    });

    const client = new ApiClient(50); // 50ms timeout
    await expect(client.get('/api/timeout')).rejects.toThrow('timed out');
  });

  it('should retry on 500 server error when retries option is set', async () => {
    let callCount = 0;
    global.fetch = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve(new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 }));
      }
      return Promise.resolve(new Response(JSON.stringify({ success: true, ok: true }), { status: 200 }));
    });

    const client = new ApiClient();
    const result = await client.get<{ ok: boolean }>('/api/flaky', {
      retries: 2,
      retryDelayMs: 10,
    });

    expect(callCount).toBe(2);
    expect(result.ok).toBe(true);
  });
});
