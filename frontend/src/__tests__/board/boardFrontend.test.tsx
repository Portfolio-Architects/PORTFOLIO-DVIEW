import React from 'react';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { useBoardAuthor, AUTHOR_TOKEN_STORAGE_KEY } from '@/hooks/useBoardAuthor';
import { ApartmentTitleSelectorModal } from '@/components/board/ApartmentTitleSelectorModal';
import { GpsVerificationModal } from '@/components/board/GpsVerificationModal';
import { BoardPostCard } from '@/components/board/BoardPostCard';
import { BoardPostList } from '@/components/board/BoardPostList';
import { BoardPostWriteModal } from '@/components/board/BoardPostWriteModal';
import { BoardPostDetailModal } from '@/components/board/BoardPostDetailModal';
import { LoungeBoardView } from '@/components/board/LoungeBoardView';
import LoungePage from '@/app/lounge/page';
import { BoardPostDto, BoardCommentDto } from '@/types/board';
import {
  getAllSelectableTitles,
  isGeocodedComplex,
  isUnmappedComplex,
} from '@/lib/board/boardEngine';

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

// Mock AdSlot to render lightweight container
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

describe('Milestone 3: Anonymous Board Frontend UI & Service Integration', () => {
  const originalFetch = global.fetch;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    localStorage.clear();
    mockFetch = jest.fn();
    global.fetch = mockFetch;

    // Default mock response for /api/board/profile
    mockFetch.mockImplementation((url: string, init?: RequestInit) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/board/profile')) {
        if (init?.method === 'POST') {
          const body = JSON.parse(init.body as string);
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              data: {
                profile: {
                  selectedTitle: body.selectedTitle,
                  dong: '청계동',
                  titleSetAt: Date.now(),
                  titleExpiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
                  isGpsVerified: false,
                  isLocked: true,
                  daysRemaining: 30,
                },
              },
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              profile: null,
              isLocked: false,
              daysRemaining: 0,
            },
          }),
        });
      }

      if (urlStr.includes('/api/board/posts')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              posts: [],
              total: 0,
              page: 1,
              limit: 30,
            },
          }),
        });
      }

      if (urlStr.includes('/api/board/verify-location')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              verified: true,
              distanceMeters: 120,
              message: '단지 위치 인증이 완료되었습니다 (300m 이내).',
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
  // 1. Client Author State Hook (useBoardAuthor)
  // ============================================================================
  describe('useBoardAuthor Hook', () => {
    it('generates a 64-hex client author token if missing in localStorage', async () => {
      expect(localStorage.getItem(AUTHOR_TOKEN_STORAGE_KEY)).toBeNull();

      const { result } = renderHook(() => useBoardAuthor());

      await waitFor(() => {
        expect(result.current.authorToken).toBeTruthy();
      });

      expect(result.current.authorToken).toMatch(/^[0-9a-f]{64}$/);
      expect(localStorage.getItem(AUTHOR_TOKEN_STORAGE_KEY)).toBe(
        result.current.authorToken
      );
    });

    it('reuses existing author token from localStorage', async () => {
      const existingToken = 'a'.repeat(64);
      localStorage.setItem(AUTHOR_TOKEN_STORAGE_KEY, existingToken);

      const { result } = renderHook(() => useBoardAuthor());

      await waitFor(() => {
        expect(result.current.authorToken).toBe(existingToken);
      });
    });

    it('manages 30-day locked title status and D-Day remaining calculation', async () => {
      const fakeToken = 'b'.repeat(64);
      localStorage.setItem(AUTHOR_TOKEN_STORAGE_KEY, fakeToken);

      const futureExpiresAt = Date.now() + 25 * 24 * 60 * 60 * 1000; // 25 days left

      mockFetch.mockImplementation((url: string) => {
        if (String(url).includes('/api/board/profile')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              data: {
                profile: {
                  selectedTitle: '동탄역 롯데캐슬',
                  dong: '여울동',
                  titleSetAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
                  titleExpiresAt: futureExpiresAt,
                  isGpsVerified: true,
                  gpsVerifiedComplex: '동탄역 롯데캐슬',
                  isLocked: true,
                  daysRemaining: 25,
                },
              },
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true }),
        });
      });

      const { result } = renderHook(() => useBoardAuthor());

      await waitFor(() => {
        expect(result.current.selectedTitle).toBe('동탄역 롯데캐슬');
      });

      expect(result.current.isLocked).toBe(true);
      expect(result.current.daysRemaining).toBe(25);
      expect(result.current.isGpsVerified).toBe(true);
      expect(result.current.gpsVerifiedComplex).toBe('동탄역 롯데캐슬');
    });

    it('setLockedTitle calls POST /api/board/profile and updates state', async () => {
      const { result } = renderHook(() => useBoardAuthor());

      await waitFor(() => {
        expect(result.current.authorToken).toBeTruthy();
      });

      let res: any;
      await act(async () => {
        res = await result.current.setLockedTitle('동탄역 롯데캐슬');
      });

      expect(res.success).toBe(true);
      expect(result.current.selectedTitle).toBe('동탄역 롯데캐슬');
      expect(result.current.isLocked).toBe(true);
      expect(result.current.daysRemaining).toBe(30);
    });

    it('verifyLocation calls POST /api/board/verify-location and updates GPS state on success', async () => {
      const { result } = renderHook(() => useBoardAuthor());

      await waitFor(() => {
        expect(result.current.authorToken).toBeTruthy();
      });

      let verifyRes: any;
      await act(async () => {
        verifyRes = await result.current.verifyLocation('동탄역 롯데캐슬', 37.199, 127.098);
      });

      expect(verifyRes.verified).toBe(true);
      expect(verifyRes.distanceMeters).toBe(120);
      expect(result.current.isGpsVerified).toBe(true);
      expect(result.current.gpsVerifiedComplex).toBe('동탄역 롯데캐슬');
    });
  });

  // ============================================================================
  // 2. ApartmentTitleSelectorModal (184 Titles & 30-Day Lock Warning)
  // ============================================================================
  describe('ApartmentTitleSelectorModal', () => {
    it('renders all 184 selectable titles and allows real-time search filtering', () => {
      const onSelectTitle = jest.fn();
      const onClose = jest.fn();

      render(
        <ApartmentTitleSelectorModal
          isOpen={true}
          onClose={onClose}
          currentTitle={null}
          isLocked={false}
          daysRemaining={0}
          onSelectTitle={onSelectTitle}
        />
      );

      // Verify total 184 titles are available
      const titles = getAllSelectableTitles();
      expect(titles).toHaveLength(184);
      expect(screen.getByText('검색 결과: 184개')).toBeInTheDocument();

      // Search for specific apartment
      const searchInput = screen.getByPlaceholderText(/단지명 검색/);
      fireEvent.change(searchInput, { target: { value: '시범우남퍼스트빌' } });

      expect(screen.getByText('동탄역 시범 우남퍼스트빌')).toBeInTheDocument();
      expect(screen.queryByText('동탄역 롯데캐슬')).not.toBeInTheDocument();
    });

    it('displays 30-day lock warning confirmation modal upon selecting a title', async () => {
      const onSelectTitle = jest.fn().mockResolvedValue(true);
      const onClose = jest.fn();

      render(
        <ApartmentTitleSelectorModal
          isOpen={true}
          onClose={onClose}
          currentTitle={null}
          isLocked={false}
          daysRemaining={0}
          onSelectTitle={onSelectTitle}
        />
      );

      // Search for '동탄역 시범 우남퍼스트빌'
      const searchInput = screen.getByPlaceholderText(/단지명 검색/);
      fireEvent.change(searchInput, { target: { value: '시범우남퍼스트빌' } });

      const titleBtn = screen.getByRole('button', { name: /동탄역 시범 우남퍼스트빌/ });
      fireEvent.click(titleBtn);

      // Warning modal dialog must appear
      const warningModal = screen.getByTestId('lock-warning-modal');
      expect(warningModal).toBeInTheDocument();
      expect(
        screen.getByText(/단지 타이틀은 설정 후 30일간 변경할 수 없습니다\. 확정하시겠습니까\?/)
      ).toBeInTheDocument();

      // Click 취소 -> warning disappears
      fireEvent.click(screen.getByRole('button', { name: '취소' }));
      expect(screen.queryByTestId('lock-warning-modal')).not.toBeInTheDocument();
      expect(onSelectTitle).not.toHaveBeenCalled();

      // Click again and click 확정 -> onSelectTitle is called
      fireEvent.click(titleBtn);
      fireEvent.click(screen.getByRole('button', { name: '확정' }));

      await waitFor(() => {
        expect(onSelectTitle).toHaveBeenCalledWith('동탄역 시범 우남퍼스트빌');
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('disables title change and displays active lock banner when author is locked', () => {
      const onSelectTitle = jest.fn();
      const onClose = jest.fn();

      render(
        <ApartmentTitleSelectorModal
          isOpen={true}
          onClose={onClose}
          currentTitle="동탄역 롯데캐슬"
          isLocked={true}
          daysRemaining={28}
          onSelectTitle={onSelectTitle}
        />
      );

      // Active lock banner displayed
      const banner = screen.getByTestId('title-locked-banner');
      expect(banner).toBeInTheDocument();
      expect(within(banner).getByText('D-28')).toBeInTheDocument();
      expect(
        within(banner).getByText(/입주민 사칭 방지 규정에 따라 현재 설정된 \[동탄역 롯데캐슬\] 타이틀은 30일간 변경할 수 없습니다\./)
      ).toBeInTheDocument();

      // Search input is disabled
      const searchInput = screen.getByPlaceholderText(/단지명 검색/);
      expect(searchInput).toBeDisabled();

      // Clicking a title does nothing
      const otherTitleBtn = screen.getByRole('button', { name: /동탄 예비입주민/ });
      expect(otherTitleBtn).toBeDisabled();
      fireEvent.click(otherTitleBtn);
      expect(screen.queryByTestId('lock-warning-modal')).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // 3. GpsVerificationModal (56 Unmapped Guidance vs 127 Geocoded Verification)
  // ============================================================================
  describe('GpsVerificationModal', () => {
    it('displays polite unmapped guidance for 56 unmapped complexes and disables verification', () => {
      const onVerify = jest.fn();
      const onClose = jest.fn();

      // '능동마을 주공' is one of the 56 unmapped complexes (lat: 0, lng: 0)
      expect(isUnmappedComplex('능동마을 주공')).toBe(true);

      render(
        <GpsVerificationModal
          isOpen={true}
          onClose={onClose}
          selectedComplex="능동마을 주공"
          isGpsVerified={false}
          onVerify={onVerify}
        />
      );

      const unmappedGuidance = screen.getByTestId('gps-unmapped-guidance');
      expect(unmappedGuidance).toBeInTheDocument();
      expect(
        within(unmappedGuidance).getByText(
          '해당 단지는 공식 위치 좌표가 등록되지 않아 GPS 인증이 지원되지 않습니다. 단지 타이틀은 정상 표출되니 안심하고 소통에 참여해 주세요.'
        )
      ).toBeInTheDocument();

      // Verification trigger button must NOT be present
      expect(
        screen.queryByRole('button', { name: '내 단지 위치 인증하기' })
      ).not.toBeInTheDocument();
      expect(onVerify).not.toHaveBeenCalled();
    });

    it('displays guidance for virtual title "동탄 예비입주민" and disables verification', () => {
      const onVerify = jest.fn();
      const onClose = jest.fn();

      render(
        <GpsVerificationModal
          isOpen={true}
          onClose={onClose}
          selectedComplex="동탄 예비입주민"
          isGpsVerified={false}
          onVerify={onVerify}
        />
      );

      const virtualGuidance = screen.getByTestId('gps-virtual-guidance');
      expect(virtualGuidance).toBeInTheDocument();
      expect(
        within(virtualGuidance).getByText(
          '동탄 예비입주민 타이틀은 특정 단지 위치 인증 대상이 아닙니다. 인증 뱃지 없이도 자유롭게 글과 댓글을 작성하실 수 있습니다.'
        )
      ).toBeInTheDocument();

      expect(
        screen.queryByRole('button', { name: '내 단지 위치 인증하기' })
      ).not.toBeInTheDocument();
    });

    it('allows GPS verification for 127 geocoded complexes with privacy guarantee and verifies <=300m', async () => {
      const onVerify = jest.fn().mockResolvedValue({
        verified: true,
        distanceMeters: 150,
        message: '단지 위치 인증이 완료되었습니다 (300m 이내).',
      });
      const onClose = jest.fn();

      // '동탄역 롯데캐슬' is one of the 127 geocoded complexes
      expect(isGeocodedComplex('동탄역 롯데캐슬')).toBe(true);

      // Mock navigator.geolocation
      const mockGetCurrentPosition = jest.fn((success) => {
        success({
          coords: {
            latitude: 37.1994,
            longitude: 127.0984,
          },
        });
      });

      Object.defineProperty(global.navigator, 'geolocation', {
        value: { getCurrentPosition: mockGetCurrentPosition },
        configurable: true,
        writable: true,
      });

      render(
        <GpsVerificationModal
          isOpen={true}
          onClose={onClose}
          selectedComplex="동탄역 롯데캐슬"
          isGpsVerified={false}
          onVerify={onVerify}
        />
      );

      // Privacy statement must be strictly displayed
      expect(
        screen.getByText(/사용자의 실시간 GPS 좌표는 서버에 저장되지 않습니다/)
      ).toBeInTheDocument();

      // Click "내 단지 위치 인증하기" button
      const verifyBtn = screen.getByRole('button', { name: '내 단지 위치 인증하기' });
      fireEvent.click(verifyBtn);

      await waitFor(() => {
        expect(mockGetCurrentPosition).toHaveBeenCalled();
        expect(onVerify).toHaveBeenCalledWith('동탄역 롯데캐슬', 37.1994, 127.0984);
      });

      // Success banner displayed
      const successBanner = screen.getByTestId('gps-success-banner');
      expect(successBanner).toBeInTheDocument();
      expect(within(successBanner).getByText('인증 완료 (300m 이내)')).toBeInTheDocument();
      expect(within(successBanner).getByText(/약 150m 위치 확인되었습니다/)).toBeInTheDocument();
    });

    it('displays polite out-of-range guidance when distance > 300m', async () => {
      const onVerify = jest.fn().mockResolvedValue({
        verified: false,
        distanceMeters: 850,
        code: 'OUT_OF_RANGE',
        message: '단지 반경 300m 이내에 위치하지 않습니다.',
      });
      const onClose = jest.fn();

      const mockGetCurrentPosition = jest.fn((success) => {
        success({
          coords: {
            latitude: 37.15,
            longitude: 127.05,
          },
        });
      });

      Object.defineProperty(global.navigator, 'geolocation', {
        value: { getCurrentPosition: mockGetCurrentPosition },
        configurable: true,
        writable: true,
      });

      render(
        <GpsVerificationModal
          isOpen={true}
          onClose={onClose}
          selectedComplex="동탄역 롯데캐슬"
          isGpsVerified={false}
          onVerify={onVerify}
        />
      );

      const verifyBtn = screen.getByRole('button', { name: '내 단지 위치 인증하기' });
      fireEvent.click(verifyBtn);

      await waitFor(() => {
        expect(onVerify).toHaveBeenCalled();
      });

      const failureBanner = screen.getByTestId('gps-failure-banner');
      expect(failureBanner).toBeInTheDocument();
      expect(
        within(failureBanner).getByText('단지 반경 300m 이내에 위치하지 않습니다.')
      ).toBeInTheDocument();
      expect(within(failureBanner).getByText(/현재 확인된 거리: 약 850m/)).toBeInTheDocument();
    });
  });

  // ============================================================================
  // 4. BoardPostCard (Author-only Delete & GPS Badge)
  // ============================================================================
  describe('BoardPostCard Component', () => {
    const mockPostMine: BoardPostDto = {
      id: 'post-1',
      title: '동탄역 인근 편의시설 문의드립니다',
      content: '롯데백화점 지하 통로 연결이 편리한가요?',
      authorTitle: '동탄역 롯데캐슬',
      authorDong: '여울동',
      isGpsVerified: true,
      likeCount: 12,
      commentCount: 4,
      viewCount: 150,
      createdAt: Date.now() - 1000 * 60 * 5, // 5 min ago
      updatedAt: Date.now() - 1000 * 60 * 5,
      canDelete: true,
      isMine: true,
    };

    const mockPostOthers: BoardPostDto = {
      id: 'post-2',
      title: '청계동 단지 주변 공원 산책로 어떤가요?',
      content: '저녁 산책하기 좋은 코스 추천 부탁드립니다.',
      authorTitle: '동탄역시범우남퍼스트빌',
      authorDong: '청계동',
      isGpsVerified: false,
      likeCount: 5,
      commentCount: 2,
      viewCount: 80,
      createdAt: Date.now() - 1000 * 60 * 60 * 3, // 3 hours ago
      updatedAt: Date.now() - 1000 * 60 * 60 * 3,
      canDelete: false,
      isMine: false,
    };

    it('renders author-only delete button when canDelete is true', async () => {
      const onDelete = jest.fn();
      const onClick = jest.fn();

      render(
        <BoardPostCard post={mockPostMine} onClick={onClick} onDelete={onDelete} />
      );

      // Trash button must be visible for author's post
      const trashBtn = screen.getByTestId('delete-post-btn-post-1');
      expect(trashBtn).toBeInTheDocument();

      // GPS badge is rendered
      expect(screen.getByTestId('gps-verified-badge')).toBeInTheDocument();

      // My post badge is rendered
      expect(screen.getByTestId('my-post-badge')).toBeInTheDocument();

      // Click delete button -> shows confirmation modal
      fireEvent.click(trashBtn);
      const confirmDialog = screen.getByTestId('delete-confirm-dialog');
      expect(confirmDialog).toBeInTheDocument();

      // Click confirm delete -> calls onDelete
      const confirmActionBtn = screen.getByTestId('confirm-delete-action-btn');
      fireEvent.click(confirmActionBtn);

      await waitFor(() => {
        expect(onDelete).toHaveBeenCalledWith('post-1');
      });
    });

    it('does NOT render delete button when canDelete is false', () => {
      const onDelete = jest.fn();
      const onClick = jest.fn();

      render(
        <BoardPostCard post={mockPostOthers} onClick={onClick} onDelete={onDelete} />
      );

      // Trash button must NOT exist for other users' posts
      expect(screen.queryByTestId('delete-post-btn-post-2')).toBeNull();

      // GPS verified badge is NOT rendered
      expect(screen.queryByTestId('gps-verified-badge')).toBeNull();

      // My post badge is NOT rendered
      expect(screen.queryByTestId('my-post-badge')).toBeNull();
    });
  });

  // ============================================================================
  // 5. BoardPostDetailModal (Like Toggle & Comment Author Delete)
  // ============================================================================
  describe('BoardPostDetailModal Component', () => {
    const mockPost: BoardPostDto = {
      id: 'post-100',
      title: '상세 게시글 테스트 제목',
      content: '본문 내용이 아주 풍부하게 들어있습니다.',
      authorTitle: '동탄역 롯데캐슬',
      authorDong: '여울동',
      isGpsVerified: true,
      likeCount: 7,
      commentCount: 2,
      viewCount: 210,
      createdAt: Date.now() - 1000 * 60 * 30,
      updatedAt: Date.now() - 1000 * 60 * 30,
      canDelete: true,
      isMine: true,
      isLiked: false,
    };

    const mockComments: BoardCommentDto[] = [
      {
        id: 'comm-1',
        postId: 'post-100',
        content: '첫 번째 유용한 댓글입니다.',
        authorTitle: '동탄역 유림노르웨이숲',
        isGpsVerified: true,
        createdAt: Date.now() - 1000 * 60 * 20,
        canDelete: false,
        isMine: false,
      },
      {
        id: 'comm-2',
        postId: 'post-100',
        content: '제가 작성한 본인 댓글입니다.',
        authorTitle: '동탄역 롯데캐슬',
        isGpsVerified: true,
        createdAt: Date.now() - 1000 * 60 * 10,
        canDelete: true,
        isMine: true,
      },
    ];

    it('toggles like button optimistically and calls onToggleLike', async () => {
      const onToggleLike = jest.fn().mockResolvedValue(true);
      const onClose = jest.fn();

      render(
        <BoardPostDetailModal
          isOpen={true}
          onClose={onClose}
          post={mockPost}
          comments={mockComments}
          selectedAuthorTitle="동탄역 롯데캐슬"
          isAuthorGpsVerified={true}
          onToggleLike={onToggleLike}
          onCreateComment={jest.fn()}
        />
      );

      const likeBtn = screen.getByTestId('detail-like-btn');
      expect(likeBtn).toHaveTextContent('7');

      // Click like -> optimistic increment to 8
      fireEvent.click(likeBtn);
      expect(likeBtn).toHaveTextContent('8');
      expect(onToggleLike).toHaveBeenCalledWith('post-100');
    });

    it('renders delete button only on author own comment', async () => {
      const onDeleteComment = jest.fn().mockResolvedValue(true);

      render(
        <BoardPostDetailModal
          isOpen={true}
          onClose={jest.fn()}
          post={mockPost}
          comments={mockComments}
          selectedAuthorTitle="동탄역 롯데캐슬"
          isAuthorGpsVerified={true}
          onToggleLike={jest.fn()}
          onCreateComment={jest.fn()}
          onDeleteComment={onDeleteComment}
        />
      );

      // comm-1 belongs to other author -> no delete button
      expect(screen.queryByTestId('delete-comment-btn-comm-1')).toBeNull();

      // comm-2 belongs to user -> delete button visible
      const comm2DeleteBtn = screen.getByTestId('delete-comment-btn-comm-2');
      expect(comm2DeleteBtn).toBeInTheDocument();

      fireEvent.click(comm2DeleteBtn);
      await waitFor(() => {
        expect(onDeleteComment).toHaveBeenCalledWith('comm-2');
      });
    });
  });

  // ============================================================================
  // 6. LoungeBoardView & Sort Tabs Integration
  // ============================================================================
  describe('LoungeBoardView & Sort Tabs Integration', () => {
    it('renders board header, sort tabs, and switches between latest and popular', async () => {
      const mockPostsLatest: BoardPostDto[] = [
        {
          id: 'p-latest',
          title: '최신순 1번 게시글',
          content: '방금 작성된 글입니다.',
          authorTitle: '동탄역 롯데캐슬',
          isGpsVerified: true,
          likeCount: 1,
          commentCount: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          canDelete: false,
          isMine: false,
        },
      ];

      const mockPostsPopular: BoardPostDto[] = [
        {
          id: 'p-popular',
          title: '추천순 1위 게시글',
          content: '많은 추천을 받은 글입니다.',
          authorTitle: '동탄역시범더샵센트럴시티',
          isGpsVerified: true,
          likeCount: 45,
          commentCount: 12,
          createdAt: Date.now() - 1000 * 60 * 60,
          updatedAt: Date.now() - 1000 * 60 * 60,
          canDelete: false,
          isMine: false,
        },
      ];

      mockFetch.mockImplementation((url: string) => {
        const urlStr = String(url);
        if (urlStr.includes('/api/board/posts?sort=popular')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              data: { posts: mockPostsPopular, total: 1 },
            }),
          });
        }
        if (urlStr.includes('/api/board/posts')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              data: { posts: mockPostsLatest, total: 1 },
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, data: {} }),
        });
      });

      render(<LoungeBoardView />);

      expect(screen.getByText('동탄 입주민 라운지')).toBeInTheDocument();
      expect(screen.getByTestId('board-write-btn')).toBeInTheDocument();

      // Check default sort is latest
      await waitFor(() => {
        expect(screen.getByText('최신순 1번 게시글')).toBeInTheDocument();
      });

      // Switch to popular tab
      const popularTabBtn = screen.getByTestId('sort-tab-popular');
      fireEvent.click(popularTabBtn);

      await waitFor(() => {
        expect(screen.getByText('추천순 1위 게시글')).toBeInTheDocument();
      });
    });

    it('renders empty state when there are no posts and triggers write modal', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (String(url).includes('/api/board/posts')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              data: { posts: [], total: 0 },
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, data: {} }),
        });
      });

      render(<LoungeBoardView />);

      await waitFor(() => {
        expect(screen.getByTestId('board-post-list-empty')).toBeInTheDocument();
      });

      expect(screen.getByText('아직 등록된 이야기가 없습니다.')).toBeInTheDocument();

      // Click "첫 이야기 쓰기"
      fireEvent.click(screen.getByRole('button', { name: '첫 이야기 쓰기' }));

      // Write modal opens
      expect(screen.getByRole('dialog', { name: '새 이야기 작성' })).toBeInTheDocument();
    });
  });

  // ============================================================================
  // 7. /lounge Page Entry Point & Pre-reserved Zero-CLS AdSlot
  // ============================================================================
  describe('/lounge Page Component Integration', () => {
    it('renders LoungeHeader (activeTab="lounge"), Breadcrumb, LoungeBoardView, Pre-reserved AdSlot, and MobileDock', async () => {
      render(<LoungePage />);

      // LoungeHeader navigation rendered with active lounge button
      expect(screen.getByRole('banner')).toBeInTheDocument();
      const headerLoungeBtn = screen.getByTestId('header-lounge-link');
      expect(headerLoungeBtn).toHaveAttribute('aria-current', 'page');
      expect(headerLoungeBtn).toHaveTextContent('실시간 입주민 라운지');

      // Breadcrumb rendered
      expect(screen.getByText('입주민 라운지')).toBeInTheDocument();

      // Pre-reserved Zero-CLS AdSlot Container rendered
      const adContainer = screen.getByTestId('lounge-footer-ad-slot-container');
      expect(adContainer).toBeInTheDocument();
      expect(adContainer).toHaveClass('min-h-[140px]');

      // MobileDock rendered with 더보기 lounge entry
      const moreBtn = screen.getByTestId('mobile-dock-more-button');
      expect(moreBtn).toBeInTheDocument();
      fireEvent.click(moreBtn);
      expect(screen.getByTestId('mobile-dock-lounge-link')).toHaveAttribute('href', '/lounge');
    });
  });
});
