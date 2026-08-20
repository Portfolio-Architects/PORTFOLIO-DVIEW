import { renderHook, act, waitFor } from '@testing-library/react';
import { useFavorites } from './useFavorites';
import { User } from 'firebase/auth';

const originalFetch = global.fetch;

describe('useFavorites Hook & Concurrent Guest Migration', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/api/favorite-counts')) {
        return Promise.resolve(new Response(JSON.stringify({ counts: {} }), { status: 200 }));
      }
      return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
    });
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  const mockUser = {
    uid: 'user-123',
    getIdToken: jest.fn().mockResolvedValue('mock-token-abc'),
  } as unknown as User;

  it('should operate correctly in guest mode using localStorage and custom events', async () => {
    localStorage.setItem('dview_guest_favorites', JSON.stringify(['목동신시가지14단지']));

    const dispatchSpy = jest.spyOn(window, 'dispatchEvent');

    const { result } = renderHook(() => useFavorites(null, { '목동신시가지14단지': 5 }));

    expect(result.current.userFavorites.has('목동신시가지14단지')).toBe(true);
    expect(result.current.isFavorited('목동신시가지14단지')).toBe(true);
    expect(result.current.isFavorited('목동신시가지13단지')).toBe(false);

    // Toggle favorite (add 13단지)
    await act(async () => {
      await result.current.handleToggleFavorite('목동신시가지13단지');
    });

    expect(result.current.isFavorited('목동신시가지13단지')).toBe(true);
    expect(JSON.parse(localStorage.getItem('dview_guest_favorites') || '[]')).toContain('목동신시가지13단지');
    expect(dispatchSpy).toHaveBeenCalledWith(expect.any(CustomEvent));
  });

  it('should concurrently migrate guest favorites using Promise.allSettled upon login and clear local guest storage', async () => {
    localStorage.setItem(
      'dview_guest_favorites',
      JSON.stringify(['목동신시가지13단지', '목동신시가지12단지'])
    );

    const postUrls: Array<{ url: string; body: string }> = [];

    global.fetch = jest.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes('/api/favorite-counts')) {
        return Promise.resolve(new Response(JSON.stringify({ counts: {} }), { status: 200 }));
      }

      if (url.includes('/api/favorite?userId=')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({ favorites: ['목동신시가지14단지'] }),
            { status: 200 }
          )
        );
      }

      if (url === '/api/favorite' && init?.method === 'POST') {
        postUrls.push({ url, body: init.body as string });
        return Promise.resolve(
          new Response(JSON.stringify({ success: true }), { status: 200 })
        );
      }

      return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
    });

    const { result } = renderHook(() => useFavorites(mockUser));

    await waitFor(() => {
      expect(result.current.isFavoritesLoading).toBe(false);
      expect(result.current.isFavorited('목동신시가지14단지')).toBe(true);
      expect(result.current.isFavorited('목동신시가지13단지')).toBe(true);
      expect(result.current.isFavorited('목동신시가지12단지')).toBe(true);
    });

    // Both missing apartments should have been posted concurrently
    expect(postUrls.length).toBe(2);
    expect(postUrls.some(p => p.body.includes('목동신시가지13단지'))).toBe(true);
    expect(postUrls.some(p => p.body.includes('목동신시가지12단지'))).toBe(true);

    // Guest storage must be cleared
    expect(localStorage.getItem('dview_guest_favorites')).toBeNull();
  });

  it('should toggle favorites and sync with backend for authenticated user', async () => {
    let postBody = '';
    global.fetch = jest.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes('/api/favorite-counts')) {
        return Promise.resolve(new Response(JSON.stringify({ counts: { '목동신시가지14단지': 10 } }), { status: 200 }));
      }
      if (url.includes('/api/favorite?userId=')) {
        return Promise.resolve(
          new Response(JSON.stringify({ favorites: ['목동신시가지14단지'] }), { status: 200 })
        );
      }
      if (url === '/api/favorite' && init?.method === 'POST') {
        postBody = init.body as string;
        return Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }));
      }
      return Promise.resolve(new Response('{}', { status: 200 }));
    });

    const { result } = renderHook(() => useFavorites(mockUser, { '목동신시가지14단지': 10 }));

    await waitFor(() => {
      expect(result.current.isFavorited('목동신시가지14단지')).toBe(true);
    });

    // Toggle remove
    await act(async () => {
      await result.current.handleToggleFavorite('목동신시가지14단지');
    });

    expect(result.current.isFavorited('목동신시가지14단지')).toBe(false);
    expect(result.current.favoriteCounts['목동신시가지14단지']).toBe(9);
    expect(JSON.parse(postBody)).toEqual({
      aptName: '목동신시가지14단지',
      action: 'remove',
    });
  });

  it('should update favorite order via PUT /api/favorite', async () => {
    let putBody = '';
    global.fetch = jest.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url === '/api/favorite' && init?.method === 'PUT') {
        putBody = init.body as string;
        return Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }));
      }
      return Promise.resolve(new Response('{}', { status: 200 }));
    });

    const { result } = renderHook(() => useFavorites(mockUser));

    const newOrder = ['목동신시가지13단지', '목동신시가지14단지'];
    await act(async () => {
      await result.current.updateFavoriteOrder(newOrder);
    });

    expect(JSON.parse(putBody)).toEqual({ favoriteOrder: newOrder });
  });
});
