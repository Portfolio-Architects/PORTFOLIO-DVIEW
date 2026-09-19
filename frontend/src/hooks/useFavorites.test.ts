import { renderHook, act } from '@testing-library/react';
import { useFavorites } from './useFavorites';
import type { User } from 'firebase/auth';

const originalFetch = global.fetch;

describe('useFavorites Hook & Decoupled Local Storage Operation', () => {
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

  it('should operate correctly using localStorage and custom events', async () => {
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

  it('should operate 100% locally with zero network calls to /api/favorite even when user is provided', async () => {
    localStorage.setItem(
      'dview_guest_favorites',
      JSON.stringify(['목동신시가지14단지'])
    );

    const { result } = renderHook(() => useFavorites(mockUser, { '목동신시가지14단지': 10 }));

    expect(result.current.isFavoritesLoading).toBe(false);
    expect(result.current.isFavorited('목동신시가지14단지')).toBe(true);

    // Toggle remove
    await act(async () => {
      await result.current.handleToggleFavorite('목동신시가지14단지');
    });

    expect(result.current.isFavorited('목동신시가지14단지')).toBe(false);
    expect(result.current.favoriteCounts['목동신시가지14단지']).toBe(9);
    expect(JSON.parse(localStorage.getItem('dview_guest_favorites') || '[]')).not.toContain('목동신시가지14단지');

    // Assert that /api/favorite was NEVER called
    const fetchCalls = (global.fetch as jest.Mock).mock.calls;
    const favoriteApiCall = fetchCalls.find(([url]: [string]) => url === '/api/favorite' || url.startsWith('/api/favorite?'));
    expect(favoriteApiCall).toBeUndefined();
  });

  it('should update favorite order locally in localStorage without remote syncing', async () => {
    const { result } = renderHook(() => useFavorites(mockUser));

    const newOrder = ['목동신시가지13단지', '목동신시가지14단지'];
    await act(async () => {
      await result.current.updateFavoriteOrder(newOrder);
    });

    expect(JSON.parse(localStorage.getItem('dview_guest_favorites') || '[]')).toEqual(newOrder);
    expect(Array.from(result.current.userFavorites)).toEqual(newOrder);

    // Assert that /api/favorite PUT was NEVER called
    const fetchCalls = (global.fetch as jest.Mock).mock.calls;
    const favoriteApiCall = fetchCalls.find(([url]: [string]) => url === '/api/favorite');
    expect(favoriteApiCall).toBeUndefined();
  });

  it('should expose canonical alias signatures matching interface contracts', async () => {
    localStorage.setItem('dview_guest_favorites', JSON.stringify(['동탄역 롯데캐슬']));

    const { result } = renderHook(() => useFavorites());

    expect(result.current.favorites).toEqual(['동탄역 롯데캐슬']);
    expect(result.current.favoritesCount).toBe(1);
    expect(result.current.isFavorite('동탄역 롯데캐슬')).toBe(true);
    expect(result.current.isFavorite('동탄역 린스트라우스')).toBe(false);

    await act(async () => {
      await result.current.toggleFavorite('동탄역 린스트라우스');
    });

    expect(result.current.favoritesCount).toBe(2);
    expect(result.current.isFavorite('동탄역 린스트라우스')).toBe(true);
    expect(result.current.favorites).toContain('동탄역 린스트라우스');
  });
});
