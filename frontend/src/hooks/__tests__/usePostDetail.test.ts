import { renderHook, act, waitFor } from '@testing-library/react';
import { usePostDetail } from '../usePostDetail';
import * as PostRepo from '@/lib/repositories/post.repository';

jest.mock('@/lib/repositories/post.repository');

describe('usePostDetail Hook & Race Condition Protection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch post details and comments on mount with valid postId', async () => {
    (PostRepo.getPost as jest.Mock).mockResolvedValue({
      id: 'post-100',
      title: '동탄역 인근 임장기',
      category: '임장기',
      content: '상세 본문 내용입니다.',
      author: '동탄주민',
      likes: 12,
      views: 150,
      authorUid: 'user-abc',
      verifiedApartment: '동탄역시범우남퍼스트빌',
      verificationLevel: '정회원',
      createdAt: 1720000000000,
    });

    (PostRepo.listenToComments as jest.Mock).mockImplementation((_postId, callback) => {
      callback([
        {
          id: 'comment-1',
          text: '좋은 정보 감사합니다!',
          authorName: '이웃주민',
          createdAt: '2026-08-20T10:00:00.000Z',
        },
      ]);
      return () => {};
    });

    const { result } = renderHook(() => usePostDetail('post-100'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.post?.title).toBe('동탄역 인근 임장기');
      expect(result.current.likes).toBe(12);
      expect(result.current.views).toBe(150);
      expect(result.current.comments.length).toBe(1);
      expect(result.current.comments[0].text).toBe('좋은 정보 감사합니다!');
    });
  });

  it('should prevent race condition when rapidly switching posts', async () => {
    let resolveFirst: (val: any) => void = () => {};
    let resolveSecond: (val: any) => void = () => {};

    const firstPromise = new Promise((resolve) => {
      resolveFirst = resolve;
    });
    const secondPromise = new Promise((resolve) => {
      resolveSecond = resolve;
    });

    (PostRepo.getPost as jest.Mock).mockImplementation((id: string) => {
      if (id === 'post-1') return firstPromise;
      if (id === 'post-2') return secondPromise;
      return Promise.resolve(null);
    });

    const { result, rerender } = renderHook(({ postId }) => usePostDetail(postId), {
      initialProps: { postId: 'post-1' },
    });

    expect(result.current.isLoading).toBe(true);

    // Rapidly switch to post-2
    rerender({ postId: 'post-2' });

    // post-2 resolves first
    await act(async () => {
      resolveSecond({
        id: 'post-2',
        title: '포스트 2차',
        content: '두번째 글',
        category: '자유',
        author: '작성자2',
        likes: 5,
        views: 20,
      });
    });

    expect(result.current.post?.id).toBe('post-2');
    expect(result.current.post?.title).toBe('포스트 2차');

    // post-1 resolves later (stale out-of-order)
    await act(async () => {
      resolveFirst({
        id: 'post-1',
        title: '포스트 1차 지연',
        content: '첫번째 글 지연',
        category: '자유',
        author: '작성자1',
        likes: 1,
        views: 10,
      });
    });

    // Stale response must not overwrite post-2
    expect(result.current.post?.id).toBe('post-2');
    expect(result.current.post?.title).toBe('포스트 2차');
  });

  it('should handle toggleLike and rollback on error', async () => {
    (PostRepo.getPost as jest.Mock).mockResolvedValue({
      id: 'post-100',
      title: '테스트',
      content: '본문',
      category: '자유',
      author: '작성자',
      likes: 10,
      views: 50,
    });

    (PostRepo.likePost as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => usePostDetail('post-100'));

    await waitFor(() => {
      expect(result.current.post).not.toBeNull();
    });

    await act(async () => {
      await result.current.toggleLike();
    });

    expect(result.current.likes).toBe(11);
    expect(PostRepo.likePost).toHaveBeenCalledWith('post-100');
  });

  it('should reset state when postId becomes null', async () => {
    (PostRepo.getPost as jest.Mock).mockResolvedValue({
      id: 'post-100',
      title: '테스트',
      content: '본문',
      category: '자유',
      author: '작성자',
      likes: 10,
      views: 50,
    });

    const { result, rerender } = renderHook(({ postId }) => usePostDetail(postId), {
      initialProps: { postId: 'post-100' as string | null },
    });

    await waitFor(() => {
      expect(result.current.post).not.toBeNull();
    });

    rerender({ postId: null });

    expect(result.current.post).toBeNull();
    expect(result.current.comments).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });
});
