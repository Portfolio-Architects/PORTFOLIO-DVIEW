import React from 'react';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import { LoungeBoardView } from '@/components/board/LoungeBoardView';
import { BoardPostCard } from '@/components/board/BoardPostCard';
import { BoardPostDetailModal } from '@/components/board/BoardPostDetailModal';
import { BoardPostList } from '@/components/board/BoardPostList';
import LoungePage from '@/app/lounge/page';
import { BoardPostDto, BoardCommentDto } from '@/types/board';
import { AUTHOR_TOKEN_STORAGE_KEY } from '@/hooks/useBoardAuthor';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/lounge',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock AdSlot for Zero-CLS container layout verification
jest.mock('@/components/ads/AdSlot', () => ({
  AdSlot: ({ slotId, format, minHeightClass }: any) => (
    <div
      data-testid="mock-ad-slot"
      data-slot-id={slotId}
      data-slot-format={format}
      className={minHeightClass || 'min-h-[140px]'}
    >
      [Mock AdSlot {slotId}]
    </div>
  ),
}));

describe('Empirical Adversarial Test Suite: Milestone 3 Board Feed & Permitted Actions', () => {
  const originalFetch = global.fetch;
  let mockFetch: jest.Mock;

  const mockToken = 'f'.repeat(64);

  const createDummyPost = (overrides: Partial<BoardPostDto> = {}): BoardPostDto => ({
    id: 'post-default',
    title: '동탄역 인근 편의시설 및 상가 질문',
    content: '역세권 상가 입점 현황이 궁금합니다.',
    authorTitle: '동탄역 롯데캐슬',
    authorDong: '여울동',
    isGpsVerified: true,
    likeCount: 5,
    commentCount: 2,
    viewCount: 120,
    createdAt: Date.now() - 1000 * 60 * 15,
    updatedAt: Date.now() - 1000 * 60 * 15,
    canDelete: false,
    isMine: false,
    isLiked: false,
    ...overrides,
  });

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(AUTHOR_TOKEN_STORAGE_KEY, mockToken);
    mockFetch = jest.fn();
    global.fetch = mockFetch;

    // Default mock response handler
    mockFetch.mockImplementation((url: string, init?: RequestInit) => {
      const urlStr = String(url);

      if (urlStr.includes('/api/board/profile')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              profile: {
                selectedTitle: '동탄역 롯데캐슬',
                dong: '여울동',
                titleSetAt: Date.now() - 1000 * 60 * 60,
                titleExpiresAt: Date.now() + 29 * 24 * 60 * 60 * 1000,
                isGpsVerified: true,
                gpsVerifiedComplex: '동탄역 롯데캐슬',
                isLocked: true,
                daysRemaining: 29,
              },
            },
          }),
        });
      }

      if (urlStr.includes('/api/board/posts')) {
        if (init?.method === 'DELETE') {
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              posts: [createDummyPost({ id: 'post-1', title: '기본 게시글' })],
              total: 1,
            },
          }),
        });
      }

      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true, data: {} }),
      });
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  // ============================================================================
  // Scenario 1: Rapid sort toggle between 'latest' and 'popular'
  // ============================================================================
  describe('1. Rapid Sort Toggle State Transitions & Query Parameters', () => {
    it('passes exact sort query parameter to /api/board/posts on toggle', async () => {
      const latestPosts = [
        createDummyPost({ id: 'p-latest', title: '최신 게시글 1위', createdAt: Date.now() }),
      ];
      const popularPosts = [
        createDummyPost({ id: 'p-popular', title: '인기 게시글 1위', likeCount: 88 }),
      ];

      mockFetch.mockImplementation((url: string) => {
        const urlStr = String(url);
        if (urlStr.includes('/api/board/profile')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true, data: { profile: null } }),
          });
        }
        if (urlStr.includes('sort=popular')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              data: { posts: popularPosts, total: 1 },
            }),
          });
        }
        if (urlStr.includes('sort=latest')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              data: { posts: latestPosts, total: 1 },
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, data: { posts: [], total: 0 } }),
        });
      });

      render(<LoungeBoardView />);

      // Verify default sort is latest
      await waitFor(() => {
        expect(screen.getByText('최신 게시글 1위')).toBeInTheDocument();
      });

      // Assert initial fetch called with sort=latest&limit=30
      const initialCall = mockFetch.mock.calls.find((c) =>
        String(c[0]).includes('/api/board/posts')
      );
      expect(initialCall[0]).toContain('sort=latest');
      expect(initialCall[0]).toContain('limit=30');

      // Click popular tab
      const popularTab = screen.getByTestId('sort-tab-popular');
      fireEvent.click(popularTab);

      // Verify popular posts displayed
      await waitFor(() => {
        expect(screen.getByText('인기 게시글 1위')).toBeInTheDocument();
      });

      const popularCall = mockFetch.mock.calls.find((c) =>
        String(c[0]).includes('sort=popular')
      );
      expect(popularCall).toBeDefined();

      // Click latest tab again
      const latestTab = screen.getByTestId('sort-tab-latest');
      fireEvent.click(latestTab);

      await waitFor(() => {
        expect(screen.getByText('최신 게시글 1위')).toBeInTheDocument();
      });
    });

    it('handles rapid burst clicking between tabs without infinite loops or UI crash', async () => {
      let callCount = 0;
      mockFetch.mockImplementation((url: string) => {
        const urlStr = String(url);
        if (urlStr.includes('/api/board/posts')) {
          callCount++;
          const isPopular = urlStr.includes('sort=popular');
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              data: {
                posts: [
                  createDummyPost({
                    id: isPopular ? 'burst-pop' : 'burst-lat',
                    title: isPopular ? '버스트 인기글' : '버스트 최신글',
                  }),
                ],
                total: 1,
              },
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, data: { profile: null } }),
        });
      });

      render(<LoungeBoardView />);

      await waitFor(() => {
        expect(screen.getByText('버스트 최신글')).toBeInTheDocument();
      });

      const popularTab = screen.getByTestId('sort-tab-popular');
      const latestTab = screen.getByTestId('sort-tab-latest');

      // Rapidly toggle 6 times back and forth
      act(() => {
        fireEvent.click(popularTab);
        fireEvent.click(latestTab);
        fireEvent.click(popularTab);
        fireEvent.click(latestTab);
        fireEvent.click(popularTab);
      });

      // Must settle on '버스트 인기글'
      await waitFor(() => {
        expect(screen.getByText('버스트 인기글')).toBeInTheDocument();
      });

      // Verify no runaway infinite loop (callCount must remain reasonable, <= 10)
      expect(callCount).toBeLessThanOrEqual(10);
      expect(callCount).toBeGreaterThanOrEqual(2);
    });
  });

  // ============================================================================
  // Scenario 2: Optimistic like count update & revert resilience
  // ============================================================================
  describe('2. Optimistic Like Count Update, Double-Click Prevention & Revert on Failure', () => {
    it('optimistically increments like count immediately on click', async () => {
      const testPost = createDummyPost({
        id: 'like-p1',
        likeCount: 14,
        isLiked: false,
      });

      let resolveToggle: (val: any) => void;
      const onToggleLike = jest.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          resolveToggle = resolve;
        });
      });

      render(
        <BoardPostDetailModal
          isOpen={true}
          onClose={jest.fn()}
          post={testPost}
          comments={[]}
          selectedAuthorTitle="동탄역 롯데캐슬"
          isAuthorGpsVerified={true}
          onToggleLike={onToggleLike}
          onCreateComment={jest.fn()}
        />
      );

      const likeBtn = screen.getByTestId('detail-like-btn');
      expect(within(likeBtn).getByText('14')).toBeInTheDocument();

      // Click like
      fireEvent.click(likeBtn);

      // Optimistic update: instantly becomes 15
      expect(within(likeBtn).getByText('15')).toBeInTheDocument();
      expect(onToggleLike).toHaveBeenCalledTimes(1);

      // Resolve async server response
      await act(async () => {
        resolveToggle({ liked: true, likeCount: 15 });
      });

      expect(within(likeBtn).getByText('15')).toBeInTheDocument();
    });

    it('prevents multiple clicks in quick succession while request is in-flight', async () => {
      const testPost = createDummyPost({
        id: 'like-p2',
        likeCount: 7,
        isLiked: false,
      });

      let resolveToggle: (val: any) => void;
      const onToggleLike = jest.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          resolveToggle = resolve;
        });
      });

      render(
        <BoardPostDetailModal
          isOpen={true}
          onClose={jest.fn()}
          post={testPost}
          comments={[]}
          selectedAuthorTitle="동탄역 롯데캐슬"
          isAuthorGpsVerified={true}
          onToggleLike={onToggleLike}
          onCreateComment={jest.fn()}
        />
      );

      const likeBtn = screen.getByTestId('detail-like-btn');
      expect(likeBtn).not.toBeDisabled();

      // First click
      fireEvent.click(likeBtn);

      // Button is now disabled and isLiking is true
      expect(likeBtn).toBeDisabled();
      expect(within(likeBtn).getByText('8')).toBeInTheDocument();

      // Rapidly fire multiple consecutive clicks
      fireEvent.click(likeBtn);
      fireEvent.click(likeBtn);
      fireEvent.click(likeBtn);

      // Verify onToggleLike was strictly called only ONCE
      expect(onToggleLike).toHaveBeenCalledTimes(1);

      // Finish the request
      await act(async () => {
        resolveToggle({ liked: true, likeCount: 8 });
      });

      // Button is re-enabled
      await waitFor(() => {
        expect(likeBtn).not.toBeDisabled();
      });
      expect(within(likeBtn).getByText('8')).toBeInTheDocument();
    });

    it('reverts like count and liked state on server/network failure', async () => {
      const testPost = createDummyPost({
        id: 'like-p3',
        likeCount: 20,
        isLiked: false,
      });

      const onToggleLike = jest
        .fn()
        .mockRejectedValue(new Error('Network connection timeout (500)'));

      render(
        <BoardPostDetailModal
          isOpen={true}
          onClose={jest.fn()}
          post={testPost}
          comments={[]}
          selectedAuthorTitle="동탄역 롯데캐슬"
          isAuthorGpsVerified={true}
          onToggleLike={onToggleLike}
          onCreateComment={jest.fn()}
        />
      );

      const likeBtn = screen.getByTestId('detail-like-btn');
      expect(within(likeBtn).getByText('20')).toBeInTheDocument();

      // Click to like
      await act(async () => {
        fireEvent.click(likeBtn);
      });

      // onToggleLike rejected -> state rolled back to original 20
      await waitFor(() => {
        expect(within(likeBtn).getByText('20')).toBeInTheDocument();
        expect(likeBtn).not.toBeDisabled();
      });
    });

    it('correctly decrements on unlike and rolls back on failure', async () => {
      const testPost = createDummyPost({
        id: 'like-p4',
        likeCount: 10,
        isLiked: true,
      });

      const onToggleLike = jest
        .fn()
        .mockRejectedValue(new Error('Internal Server Error'));

      render(
        <BoardPostDetailModal
          isOpen={true}
          onClose={jest.fn()}
          post={testPost}
          comments={[]}
          selectedAuthorTitle="동탄역 롯데캐슬"
          isAuthorGpsVerified={true}
          onToggleLike={onToggleLike}
          onCreateComment={jest.fn()}
        />
      );

      const likeBtn = screen.getByTestId('detail-like-btn');
      expect(within(likeBtn).getByText('10')).toBeInTheDocument();

      // Click to unlike
      await act(async () => {
        fireEvent.click(likeBtn);
      });

      // Failed -> rolled back to 10
      await waitFor(() => {
        expect(within(likeBtn).getByText('10')).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // Scenario 3: Author deletion permission boundary
  // ============================================================================
  describe('3. Author Deletion Permission Boundary Matrix', () => {
    it.each([
      { canDelete: true, isMine: true, expectedVisible: true, label: 'canDelete=true & isMine=true' },
      { canDelete: true, isMine: false, expectedVisible: true, label: 'canDelete=true & isMine=false' },
      { canDelete: false, isMine: true, expectedVisible: true, label: 'canDelete=false & isMine=true' },
      { canDelete: false, isMine: false, expectedVisible: false, label: 'canDelete=false & isMine=false (unowned)' },
      { canDelete: undefined, isMine: undefined, expectedVisible: false, label: 'canDelete=undefined & isMine=undefined' },
    ])(
      'evaluates post deletion button visibility for $label',
      ({ canDelete, isMine, expectedVisible }) => {
        const post = createDummyPost({
          id: `perm-post-${String(canDelete)}-${String(isMine)}`,
          canDelete,
          isMine,
        });

        render(<BoardPostCard post={post} />);

        const deleteBtn = screen.queryByTestId(`delete-post-btn-${post.id}`);
        if (expectedVisible) {
          expect(deleteBtn).toBeInTheDocument();
        } else {
          expect(deleteBtn).toBeNull();
        }
      }
    );

    it('evaluates delete button visibility in BoardPostDetailModal for owned vs unowned posts', () => {
      const ownedPost = createDummyPost({
        id: 'detail-owned',
        canDelete: true,
        isMine: true,
      });

      const { unmount } = render(
        <BoardPostDetailModal
          isOpen={true}
          onClose={jest.fn()}
          post={ownedPost}
          comments={[]}
          selectedAuthorTitle="동탄역 롯데캐슬"
          isAuthorGpsVerified={true}
          onToggleLike={jest.fn()}
          onCreateComment={jest.fn()}
        />
      );

      expect(screen.getByTestId('detail-delete-post-btn')).toBeInTheDocument();
      unmount();

      const unownedPost = createDummyPost({
        id: 'detail-unowned',
        canDelete: false,
        isMine: false,
      });

      render(
        <BoardPostDetailModal
          isOpen={true}
          onClose={jest.fn()}
          post={unownedPost}
          comments={[]}
          selectedAuthorTitle="동탄역 롯데캐슬"
          isAuthorGpsVerified={true}
          onToggleLike={jest.fn()}
          onCreateComment={jest.fn()}
        />
      );

      expect(screen.queryByTestId('detail-delete-post-btn')).toBeNull();
    });

    it('evaluates comment deletion permission boundary for owned vs unowned comments', () => {
      const mockPost = createDummyPost({ id: 'post-with-comments' });
      const comments: BoardCommentDto[] = [
        {
          id: 'c-mine',
          postId: 'post-with-comments',
          content: '내 댓글입니다.',
          authorTitle: '동탄역 롯데캐슬',
          createdAt: Date.now(),
          canDelete: true,
          isMine: true,
        },
        {
          id: 'c-others',
          postId: 'post-with-comments',
          content: '타인의 댓글입니다.',
          authorTitle: '동탄역 시범 우남퍼스트빌',
          createdAt: Date.now(),
          canDelete: false,
          isMine: false,
        },
      ];

      render(
        <BoardPostDetailModal
          isOpen={true}
          onClose={jest.fn()}
          post={mockPost}
          comments={comments}
          selectedAuthorTitle="동탄역 롯데캐슬"
          isAuthorGpsVerified={true}
          onToggleLike={jest.fn()}
          onCreateComment={jest.fn()}
        />
      );

      expect(screen.getByTestId('delete-comment-btn-c-mine')).toBeInTheDocument();
      expect(screen.queryByTestId('delete-comment-btn-c-others')).toBeNull();
    });
  });

  // ============================================================================
  // Scenario 4: Deletion confirmation dialog flow
  // ============================================================================
  describe('4. Deletion Confirmation Dialog Flow & Event Isolation', () => {
    it('opens confirm modal, cancels without deleting, and prevents card click propagation', async () => {
      const onDelete = jest.fn();
      const onCardClick = jest.fn();

      const post = createDummyPost({
        id: 'del-flow-1',
        canDelete: true,
        isMine: true,
      });

      render(
        <BoardPostCard post={post} onClick={onCardClick} onDelete={onDelete} />
      );

      const deleteBtn = screen.getByTestId('delete-post-btn-del-flow-1');

      // Click delete button -> confirmation dialog opens
      fireEvent.click(deleteBtn);
      expect(screen.getByTestId('delete-confirm-dialog')).toBeInTheDocument();
      expect(screen.getByText('게시글 삭제')).toBeInTheDocument();

      // Card onClick must NOT have been called due to e.stopPropagation()
      expect(onCardClick).not.toHaveBeenCalled();

      // Click "취소"
      const cancelBtn = screen.getByRole('button', { name: '취소' });
      fireEvent.click(cancelBtn);

      // Dialog closed, onDelete NOT called, onCardClick NOT called
      expect(screen.queryByTestId('delete-confirm-dialog')).toBeNull();
      expect(onDelete).not.toHaveBeenCalled();
      expect(onCardClick).not.toHaveBeenCalled();
    });

    it('confirms deletion, displays loading state, and fires onDelete callback', async () => {
      let resolveDelete: () => void;
      const onDelete = jest.fn().mockImplementation(() => {
        return new Promise<void>((resolve) => {
          resolveDelete = resolve;
        });
      });
      const onCardClick = jest.fn();

      const post = createDummyPost({
        id: 'del-flow-2',
        canDelete: true,
        isMine: true,
      });

      render(
        <BoardPostCard post={post} onClick={onCardClick} onDelete={onDelete} />
      );

      fireEvent.click(screen.getByTestId('delete-post-btn-del-flow-2'));

      const confirmBtn = screen.getByTestId('confirm-delete-action-btn');
      expect(confirmBtn).toHaveTextContent('삭제');

      // Click confirm
      fireEvent.click(confirmBtn);

      // Deleting state
      expect(confirmBtn).toHaveTextContent('삭제 중...');
      expect(confirmBtn).toBeDisabled();
      expect(onDelete).toHaveBeenCalledWith('del-flow-2');
      expect(onCardClick).not.toHaveBeenCalled();

      // Resolve delete
      await act(async () => {
        resolveDelete();
      });

      // Dialog is closed after deletion finishes
      expect(screen.queryByTestId('delete-confirm-dialog')).toBeNull();
      expect(onCardClick).not.toHaveBeenCalled();
    });

    it('executes full post deletion in LoungeBoardView and removes post from feed', async () => {
      const postToDelete = createDummyPost({
        id: 'post-to-delete',
        title: '삭제 대상 게시글',
        canDelete: true,
        isMine: true,
      });

      let deleteRequested = false;
      mockFetch.mockImplementation((url: string, init?: RequestInit) => {
        const urlStr = String(url);
        if (urlStr.includes('/api/board/profile')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true, data: { profile: null } }),
          });
        }
        if (urlStr.includes('/api/board/posts/post-to-delete') && init?.method === 'DELETE') {
          deleteRequested = true;
          // Verify author token header was forwarded
          expect((init?.headers as any)['x-author-token']).toBe(mockToken);
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true }),
          });
        }
        if (urlStr.includes('/api/board/posts')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              data: {
                posts: deleteRequested ? [] : [postToDelete],
                total: deleteRequested ? 0 : 1,
              },
            }),
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({ success: true }) });
      });

      render(<LoungeBoardView />);

      await waitFor(() => {
        expect(screen.getByText('삭제 대상 게시글')).toBeInTheDocument();
      });

      // Click delete button on post card
      const deleteBtn = screen.getByTestId('delete-post-btn-post-to-delete');
      fireEvent.click(deleteBtn);

      // Click confirmation button
      const confirmActionBtn = screen.getByTestId('confirm-delete-action-btn');
      await act(async () => {
        fireEvent.click(confirmActionBtn);
      });

      // Post should be removed from view
      await waitFor(() => {
        expect(screen.queryByText('삭제 대상 게시글')).toBeNull();
      });
      expect(deleteRequested).toBe(true);
    });
  });

  // ============================================================================
  // Scenario 5: Zero-CLS AdSlot container layout reservation
  // ============================================================================
  describe('5. Zero-CLS AdSlot Container Layout Reservation', () => {
    it('verifies in-feed AdSlot has min-h-[140px] when >= 3 posts', () => {
      const fourPosts = [
        createDummyPost({ id: 'p1', title: '글 1' }),
        createDummyPost({ id: 'p2', title: '글 2' }),
        createDummyPost({ id: 'p3', title: '글 3' }),
        createDummyPost({ id: 'p4', title: '글 4' }),
      ];

      render(
        <BoardPostList
          posts={fourPosts}
          isLoading={false}
          onPostClick={jest.fn()}
        />
      );

      // In-feed ad slot container inserted at index 3
      const inFeedAd = screen.getByTestId('in-feed-ad-slot-container');
      expect(inFeedAd).toBeInTheDocument();
      expect(inFeedAd).toHaveClass('min-h-[140px]');

      // Mock AdSlot inside has min-h-[140px] and in-feed format
      const mockSlot = within(inFeedAd).getByTestId('mock-ad-slot');
      expect(mockSlot).toHaveAttribute('data-slot-format', 'in-feed');
      expect(mockSlot).toHaveAttribute('data-slot-id', '1000000003');
    });

    it('verifies trailing AdSlot has min-h-[140px] when < 3 posts', () => {
      const twoPosts = [
        createDummyPost({ id: 'p1', title: '글 1' }),
        createDummyPost({ id: 'p2', title: '글 2' }),
      ];

      render(
        <BoardPostList
          posts={twoPosts}
          isLoading={false}
          onPostClick={jest.fn()}
        />
      );

      const trailingAd = screen.getByTestId('in-feed-ad-slot-container-trailing');
      expect(trailingAd).toBeInTheDocument();
      expect(trailingAd).toHaveClass('min-h-[140px]');
    });

    it('verifies detail modal and lounge page footer ad containers strictly maintain min-h-[140px]', () => {
      // 1. Detail modal ad slot
      const { unmount } = render(
        <BoardPostDetailModal
          isOpen={true}
          onClose={jest.fn()}
          post={createDummyPost({ id: 'post-detail' })}
          comments={[]}
          selectedAuthorTitle="동탄역 롯데캐슬"
          isAuthorGpsVerified={true}
          onToggleLike={jest.fn()}
          onCreateComment={jest.fn()}
        />
      );

      const detailAdContainer = screen.getByTestId('detail-ad-slot-container');
      expect(detailAdContainer).toBeInTheDocument();
      expect(detailAdContainer).toHaveClass('min-h-[140px]');
      unmount();

      // 2. Lounge page footer ad slot
      render(<LoungePage />);

      const footerAdContainer = screen.getByTestId('lounge-footer-ad-slot-container');
      expect(footerAdContainer).toBeInTheDocument();
      expect(footerAdContainer).toHaveClass('min-h-[140px]');
    });
  });

  // ============================================================================
  // Scenario 6: Empty feed state vs Loading skeleton contrast
  // ============================================================================
  describe('6. Empty Feed State & Loading Skeleton Contrast', () => {
    it('displays empty state illustration and write CTA when feed has 0 posts and isLoading is false', () => {
      const onOpenWriteModal = jest.fn();

      render(
        <BoardPostList
          posts={[]}
          isLoading={false}
          onPostClick={jest.fn()}
          onOpenWriteModal={onOpenWriteModal}
        />
      );

      const emptyContainer = screen.getByTestId('board-post-list-empty');
      expect(emptyContainer).toBeInTheDocument();
      expect(
        screen.getByText('아직 등록된 이야기가 없습니다.')
      ).toBeInTheDocument();
      expect(
        screen.getByText('우리 단지와 동탄 이웃에게 첫 번째 글을 작성해 보세요!')
      ).toBeInTheDocument();

      const writeCta = screen.getByRole('button', { name: '첫 이야기 쓰기' });
      expect(writeCta).toBeInTheDocument();

      fireEvent.click(writeCta);
      expect(onOpenWriteModal).toHaveBeenCalledTimes(1);
    });

    it('displays loading skeleton and does NOT render empty state when isLoading is true with 0 posts', () => {
      render(
        <BoardPostList
          posts={[]}
          isLoading={true}
          onPostClick={jest.fn()}
          onOpenWriteModal={jest.fn()}
        />
      );

      expect(screen.getByTestId('board-post-list-skeleton')).toBeInTheDocument();
      expect(screen.queryByTestId('board-post-list-empty')).toBeNull();
      expect(screen.queryByText('아직 등록된 이야기가 없습니다.')).toBeNull();
    });
  });
});
