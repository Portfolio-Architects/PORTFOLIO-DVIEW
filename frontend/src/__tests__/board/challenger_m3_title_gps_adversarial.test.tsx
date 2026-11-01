/**
 * Milestone 3 Adversarial Challenge Test Suite:
 * Title Selection, 30-Day Lock Flow, and GPS Geolocation Privacy
 *
 * Empirical Challenger: challenger_m3_2
 *
 * Scenarios Tested:
 * 1. Title selector search robustness:
 *    - 184 total selectable titles (183 complexes + '동탄 예비입주민')
 *    - Whitespace-insensitive Korean search (e.g. "동탄역시범우남퍼스트빌" matches "동탄역 시범 우남퍼스트빌")
 *    - Special character input, SQL/HTML injection handling, and empty search results
 * 2. 30-Day Title Lock UI defense:
 *    - Confirmation dialog display upon title click ("30일간 변경할 수 없습니다")
 *    - [취소] cancels selection without setting title or invoking onSelectTitle
 *    - [확정] triggers onSelectTitle and locks profile
 *    - Error handling during title locking preserves dialog state
 *    - When locked (isLocked: true), UI disables inputs, blocks other title clicks, and displays active D-Day banner
 * 3. 56 Unmapped complexes fallback guidance:
 *    - Selecting unmapped complexes (lat=0, lng=0) displays exact polite guidance and disables verification action
 *    - '동탄 예비입주민' virtual title displays dedicated non-target guidance and disables verification action
 *    - Modal item tags: "GPS 인증 가능" vs "좌표 미등록" vs "예비입주민"
 * 4. Geolocation API adversarial resilience:
 *    - Geolocation PERMISSION_DENIED -> graceful UI error banner, no unhandled exceptions
 *    - Geolocation TIMEOUT -> graceful retry UI message
 *    - Geolocation POSITION_UNAVAILABLE -> graceful GPS signal error message
 *    - Distance > 300m -> shows distance and out-of-range guidance without assigning verified badge
 *    - Communication failure / network exception handling
 * 5. Strict Zero GPS Coordinate Persistence:
 *    - Direct inspection of localStorage, sessionStorage, and document.cookie
 *    - Absolute guarantee that raw lat/lng values are NEVER persisted anywhere in the browser storage
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { ApartmentTitleSelectorModal } from '@/components/board/ApartmentTitleSelectorModal';
import { GpsVerificationModal } from '@/components/board/GpsVerificationModal';
import {
  useBoardAuthor,
  AUTHOR_TOKEN_STORAGE_KEY,
  AUTHOR_PROFILE_STORAGE_KEY,
} from '@/hooks/useBoardAuthor';
import {
  getAllSelectableTitles,
  getAllComplexes,
  getGeocodedComplexes,
  getUnmappedComplexes,
  isGeocodedComplex,
  isUnmappedComplex,
  VIRTUAL_PROSPECTIVE_RESIDENT_TITLE,
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

describe('Challenger M3-2 Adversarial Suite: Title Selection, 30-Day Lock, & GPS Privacy', () => {
  const originalFetch = global.fetch;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    document.cookie = '';

    mockFetch = jest.fn();
    global.fetch = mockFetch;

    // Default mock response
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
                  dong: '여울동',
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

      if (urlStr.includes('/api/board/verify-location')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              verified: true,
              distanceMeters: 140,
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
  // Scenario 1: Title Selector Search Robustness & Edge Cases
  // ============================================================================
  describe('Scenario 1: Title Selector Search Robustness & Edge Cases', () => {
    it('verifies the 184 total selectable titles registry invariant (183 complexes + 1 virtual title)', () => {
      const titles = getAllSelectableTitles();
      const complexes = getAllComplexes();
      const geocoded = getGeocodedComplexes();
      const unmapped = getUnmappedComplexes();

      // Total counts check
      expect(titles).toHaveLength(184);
      expect(complexes).toHaveLength(183);
      expect(geocoded).toHaveLength(127);
      expect(unmapped).toHaveLength(56);
      expect(geocoded.length + unmapped.length).toBe(183);
      expect(titles).toContain(VIRTUAL_PROSPECTIVE_RESIDENT_TITLE);

      // Render modal and check header count
      const onClose = jest.fn();
      const onSelectTitle = jest.fn();

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

      expect(screen.getByText('동탄 183개 단지 + 예비입주민 (총 184개)')).toBeInTheDocument();
      expect(screen.getByText('검색 결과: 184개')).toBeInTheDocument();
    });

    it('performs whitespace-insensitive Korean search matching with various space permutations', () => {
      const onClose = jest.fn();
      const onSelectTitle = jest.fn();

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

      const searchInput = screen.getByPlaceholderText(/단지명 검색/);

      // 1. No spaces query: "동탄역시범우남퍼스트빌" -> matches "동탄역 시범 우남퍼스트빌"
      fireEvent.change(searchInput, { target: { value: '동탄역시범우남퍼스트빌' } });
      expect(screen.getByText('동탄역 시범 우남퍼스트빌')).toBeInTheDocument();
      expect(screen.getByText('검색 결과: 1개')).toBeInTheDocument();

      // 2. Multiple chaotic spaces query: "  동 탄  역   시  범  우 남 "
      fireEvent.change(searchInput, { target: { value: '  동 탄  역   시  범  우 남 ' } });
      expect(screen.getByText('동탄역 시범 우남퍼스트빌')).toBeInTheDocument();

      // 3. Virtual title query without spaces: "예비입주민" -> matches "동탄 예비입주민"
      fireEvent.change(searchInput, { target: { value: '예비입주민' } });
      expect(screen.getByText('동탄 예비입주민')).toBeInTheDocument();

      // 4. Virtual title with wide spacing: " 동 탄   예 비 입 주 민 "
      fireEvent.change(searchInput, { target: { value: ' 동 탄   예 비 입 주 민 ' } });
      expect(screen.getByText('동탄 예비입주민')).toBeInTheDocument();
      expect(screen.getByText('검색 결과: 1개')).toBeInTheDocument();

      // 5. Common keyword matching multiple complexes: "더샵"
      fireEvent.change(searchInput, { target: { value: '더샵' } });
      const matchingCountText = screen.getByText('검색 결과: 5개');
      expect(matchingCountText).toBeInTheDocument();
      expect(screen.getByText('동탄역 시범 더샵 센트럴시티')).toBeInTheDocument();
      expect(screen.getByText('동탄역 더샵 센트럴시티 2차')).toBeInTheDocument();
      expect(screen.getByText('동탄 더샵 레이크에듀타운')).toBeInTheDocument();

      // 6. Extreme whitespace on compound name
      fireEvent.change(searchInput, { target: { value: '동탄역시범더샵센트럴시티' } });
      expect(screen.getByText('동탄역 시범 더샵 센트럴시티')).toBeInTheDocument();
      expect(screen.getByText('검색 결과: 1개')).toBeInTheDocument();
    });

    it('handles special characters, symbols, and empty search states safely without crashing', () => {
      const onClose = jest.fn();
      const onSelectTitle = jest.fn();

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

      const searchInput = screen.getByPlaceholderText(/단지명 검색/);

      // 1. Regex metacharacters and symbols
      const adversarialInputs = [
        '!@#$%^&*()_+',
        '[{(<>)}\\/?*+.]',
        '"><script>alert(1)</script>',
        "' OR '1'='1",
        '   \t\n   ',
      ];

      for (const query of adversarialInputs) {
        fireEvent.change(searchInput, { target: { value: query } });
        // Empty whitespace query resets to 184, while special characters yield 0 matches
        if (query.trim().length === 0) {
          expect(screen.getByText('검색 결과: 184개')).toBeInTheDocument();
        } else {
          expect(screen.getByText('검색 결과: 0개')).toBeInTheDocument();
          expect(
            screen.getByText('검색된 단지가 없습니다. 단지명을 다시 확인해주세요.')
          ).toBeInTheDocument();
        }
      }

      // 2. Restoring search input restores all 184 titles
      fireEvent.change(searchInput, { target: { value: '' } });
      expect(screen.getByText('검색 결과: 184개')).toBeInTheDocument();
      expect(
        screen.queryByText('검색된 단지가 없습니다. 단지명을 다시 확인해주세요.')
      ).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Scenario 2: 30-Day Title Lock UI Defense
  // ============================================================================
  describe('Scenario 2: 30-Day Title Lock UI Defense', () => {
    it('requires explicit confirmation dialog before locking title and cancels gracefully on [취소]', async () => {
      const onClose = jest.fn();
      const onSelectTitle = jest.fn().mockResolvedValue(true);

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

      // Select '동탄역 시범 우남퍼스트빌'
      const searchInput = screen.getByPlaceholderText(/단지명 검색/);
      fireEvent.change(searchInput, { target: { value: '시범우남퍼스트빌' } });

      const complexBtn = screen.getByRole('button', { name: /동탄역 시범 우남퍼스트빌/ });
      fireEvent.click(complexBtn);

      // Confirmation sub-modal appears
      const warningModal = screen.getByTestId('lock-warning-modal');
      expect(warningModal).toBeInTheDocument();
      expect(within(warningModal).getByText(/단지 타이틀 30일 고정 확정/)).toBeInTheDocument();
      expect(
        within(warningModal).getByText(/단지 타이틀은 설정 후 30일간 변경할 수 없습니다\. 확정하시겠습니까\?/)
      ).toBeInTheDocument();

      // Click [취소] -> confirmation modal disappears, onSelectTitle is NOT called
      const cancelBtn = within(warningModal).getByRole('button', { name: '취소' });
      fireEvent.click(cancelBtn);

      expect(screen.queryByTestId('lock-warning-modal')).not.toBeInTheDocument();
      expect(onSelectTitle).not.toHaveBeenCalled();

      // Select another complex '동탄 예비입주민'
      fireEvent.change(searchInput, { target: { value: '예비입주민' } });
      const virtualBtn = screen.getByRole('button', { name: /동탄 예비입주민/ });
      fireEvent.click(virtualBtn);

      const warningModal2 = screen.getByTestId('lock-warning-modal');
      expect(warningModal2).toBeInTheDocument();
      expect(within(warningModal2).getByText(/\[동탄 예비입주민\]/)).toBeInTheDocument();

      // Click [확정] -> triggers onSelectTitle and closes modal
      const confirmBtn = within(warningModal2).getByRole('button', { name: '확정' });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(onSelectTitle).toHaveBeenCalledWith('동탄 예비입주민');
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('survives API error on lock confirmation and retains confirmation modal with error feedback', async () => {
      const onClose = jest.fn();
      const onSelectTitle = jest.fn().mockRejectedValue(new Error('이미 30일 고정된 타이틀이 존재합니다.'));

      render(
        <ApartmentTitleSelectorModal
          isOpen={true}
          onClose={onClose}
          currentTitle="동탄역 린스트라우스"
          isLocked={false}
          daysRemaining={0}
          onSelectTitle={onSelectTitle}
        />
      );

      const searchInput = screen.getByPlaceholderText(/단지명 검색/);
      fireEvent.change(searchInput, { target: { value: '우남퍼스트빌' } });

      const titleBtn = screen.getByRole('button', { name: /동탄역 시범 우남퍼스트빌/ });
      fireEvent.click(titleBtn);

      const warningModal = screen.getByTestId('lock-warning-modal');
      const confirmBtn = within(warningModal).getByRole('button', { name: '확정' });
      fireEvent.click(confirmBtn);

      // Confirmation modal should NOT close on error, and should display error message
      await waitFor(() => {
        expect(screen.getByText('이미 30일 고정된 타이틀이 존재합니다.')).toBeInTheDocument();
      });

      expect(screen.getByTestId('lock-warning-modal')).toBeInTheDocument();
      expect(onClose).not.toHaveBeenCalled();
    });

    it('strictly locks UI when isLocked is true, disables search and all selection buttons', () => {
      const onClose = jest.fn();
      const onSelectTitle = jest.fn();

      render(
        <ApartmentTitleSelectorModal
          isOpen={true}
          onClose={onClose}
          currentTitle="동탄역 롯데캐슬"
          isLocked={true}
          daysRemaining={23}
          onSelectTitle={onSelectTitle}
        />
      );

      // 1. Lock banner check
      const lockBanner = screen.getByTestId('title-locked-banner');
      expect(lockBanner).toBeInTheDocument();
      expect(within(lockBanner).getByText('D-23')).toBeInTheDocument();
      expect(
        within(lockBanner).getByText(/30일간 변경할 수 없습니다/)
      ).toBeInTheDocument();

      // 2. Search input disabled check
      const searchInput = screen.getByPlaceholderText(/단지명 검색/);
      expect(searchInput).toBeDisabled();

      // 3. Selection buttons disabled check
      const buttons = screen.getAllByRole('button');
      const complexButtons = buttons.filter((btn) => btn.getAttribute('aria-label') !== '닫기');

      expect(complexButtons.length).toBeGreaterThan(0);
      for (const btn of complexButtons) {
        if (btn.textContent?.includes('닫기')) continue;
        expect(btn).toBeDisabled();
      }

      // 4. Clicking disabled button does not trigger lock warning
      const otherComplexBtn = screen.getByRole('button', { name: /동탄 예비입주민/ });
      fireEvent.click(otherComplexBtn);

      expect(screen.queryByTestId('lock-warning-modal')).not.toBeInTheDocument();
      expect(onSelectTitle).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Scenario 3: 56 Unmapped Complexes Fallback Guidance
  // ============================================================================
  describe('Scenario 3: 56 Unmapped Complexes Fallback Guidance', () => {
    it('verifies all 56 unmapped complexes in registry have lat=0, lng=0 and triggers exact polite guidance', () => {
      const unmapped = getUnmappedComplexes();
      expect(unmapped).toHaveLength(56);

      for (const complex of unmapped) {
        expect(complex.lat).toBe(0);
        expect(complex.lng).toBe(0);
        expect(complex.hasCoords).toBe(false);
        expect(isUnmappedComplex(complex.name)).toBe(true);
        expect(isGeocodedComplex(complex.name)).toBe(false);
      }

      // Test multiple unmapped complexes in modal
      const sampleUnmappedNames = [
        unmapped[0].name,
        unmapped[Math.floor(unmapped.length / 2)].name,
        unmapped[unmapped.length - 1].name,
      ];

      for (const sampleName of sampleUnmappedNames) {
        const onVerify = jest.fn();
        const onClose = jest.fn();

        const { unmount } = render(
          <GpsVerificationModal
            isOpen={true}
            onClose={onClose}
            selectedComplex={sampleName}
            isGpsVerified={false}
            onVerify={onVerify}
          />
        );

        // Verification guidance banner check
        const guidance = screen.getByTestId('gps-unmapped-guidance');
        expect(guidance).toBeInTheDocument();
        expect(
          within(guidance).getByText(
            '해당 단지는 공식 위치 좌표가 등록되지 않아 GPS 인증이 지원되지 않습니다. 단지 타이틀은 정상 표출되니 안심하고 소통에 참여해 주세요.'
          )
        ).toBeInTheDocument();

        // Verification action button MUST NOT be present
        expect(
          screen.queryByRole('button', { name: '내 단지 위치 인증하기' })
        ).not.toBeInTheDocument();
        expect(onVerify).not.toHaveBeenCalled();

        unmount();
      }
    });

    it('verifies "동탄 예비입주민" virtual title displays dedicated guidance and disables GPS verification', () => {
      const onVerify = jest.fn();
      const onClose = jest.fn();

      render(
        <GpsVerificationModal
          isOpen={true}
          onClose={onClose}
          selectedComplex={VIRTUAL_PROSPECTIVE_RESIDENT_TITLE}
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
      expect(onVerify).not.toHaveBeenCalled();
    });

    it('verifies TitleSelectorModal displays appropriate metadata tags for geocoded, unmapped, and virtual titles', () => {
      render(
        <ApartmentTitleSelectorModal
          isOpen={true}
          onClose={jest.fn()}
          currentTitle={null}
          isLocked={false}
          daysRemaining={0}
          onSelectTitle={jest.fn()}
        />
      );

      // Check for geocoded complex tag: "GPS 인증 가능"
      expect(screen.getAllByText(/GPS 인증 가능/).length).toBeGreaterThan(0);

      // Check for unmapped complex tag: "좌표 미등록"
      expect(screen.getAllByText('좌표 미등록').length).toBeGreaterThan(0);

      // Check for virtual title tag: "예비입주민"
      expect(screen.getByText('예비입주민')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Scenario 4: Geolocation API Adversarial Resilience
  // ============================================================================
  describe('Scenario 4: Geolocation API Adversarial Resilience', () => {
    it('gracefully handles Geolocation PERMISSION_DENIED (code 1) without uncaught exceptions', async () => {
      const onVerify = jest.fn();
      const onClose = jest.fn();

      const mockGeolocation = {
        getCurrentPosition: jest.fn((_success, error) => {
          error({
            code: 1, // PERMISSION_DENIED
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
            message: 'User denied Geolocation',
          });
        }),
      };

      Object.defineProperty(global.navigator, 'geolocation', {
        value: mockGeolocation,
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
        const failureBanner = screen.getByTestId('gps-failure-banner');
        expect(failureBanner).toBeInTheDocument();
        expect(
          within(failureBanner).getByText(
            '위치 권한이 차단되어 있습니다. 브라우저 설정에서 위치 접근을 허용해 주세요.'
          )
        ).toBeInTheDocument();
      });

      expect(onVerify).not.toHaveBeenCalled();
      // Button returns to retryable state
      expect(screen.getByRole('button', { name: '내 단지 위치 인증하기' })).toBeEnabled();
    });

    it('gracefully handles Geolocation TIMEOUT (code 3) and allows user retry', async () => {
      const onVerify = jest.fn();
      const onClose = jest.fn();

      const mockGeolocation = {
        getCurrentPosition: jest.fn((_success, error) => {
          error({
            code: 3, // TIMEOUT
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
            message: 'Timeout expired',
          });
        }),
      };

      Object.defineProperty(global.navigator, 'geolocation', {
        value: mockGeolocation,
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
        const failureBanner = screen.getByTestId('gps-failure-banner');
        expect(failureBanner).toBeInTheDocument();
        expect(
          within(failureBanner).getByText(
            '위치 정보 수신 시간이 초과되었습니다. 다시 시도해 주세요.'
          )
        ).toBeInTheDocument();
      });

      expect(onVerify).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: '내 단지 위치 인증하기' })).toBeEnabled();
    });

    it('gracefully handles Geolocation POSITION_UNAVAILABLE (code 2)', async () => {
      const onVerify = jest.fn();
      const onClose = jest.fn();

      const mockGeolocation = {
        getCurrentPosition: jest.fn((_success, error) => {
          error({
            code: 2, // POSITION_UNAVAILABLE
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
            message: 'Position unavailable',
          });
        }),
      };

      Object.defineProperty(global.navigator, 'geolocation', {
        value: mockGeolocation,
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
        const failureBanner = screen.getByTestId('gps-failure-banner');
        expect(failureBanner).toBeInTheDocument();
        expect(
          within(failureBanner).getByText(
            '현재 위치 정보를 가져올 수 없습니다. GPS 신호를 확인해주세요.'
          )
        ).toBeInTheDocument();
      });
    });

    it('handles out-of-range (>300m) result gracefully and shows distance without granting verified badge', async () => {
      const onVerify = jest.fn().mockResolvedValue({
        verified: false,
        distanceMeters: 890,
        code: 'OUT_OF_RANGE',
        message: '단지 반경 300m 이내에 위치하지 않습니다.',
      });
      const onClose = jest.fn();

      const mockGeolocation = {
        getCurrentPosition: jest.fn((success) => {
          success({
            coords: {
              latitude: 37.185,
              longitude: 127.085,
            },
          });
        }),
      };

      Object.defineProperty(global.navigator, 'geolocation', {
        value: mockGeolocation,
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
        expect(onVerify).toHaveBeenCalledWith('동탄역 롯데캐슬', 37.185, 127.085);
      });

      const failureBanner = screen.getByTestId('gps-failure-banner');
      expect(failureBanner).toBeInTheDocument();
      expect(
        within(failureBanner).getByText('단지 반경 300m 이내에 위치하지 않습니다.')
      ).toBeInTheDocument();
      expect(
        within(failureBanner).getByText(/현재 확인된 거리: 약 890m \(기준 300m 초과\)/)
      ).toBeInTheDocument();

      // Verified badge must NOT exist
      expect(screen.queryByTestId('gps-success-banner')).not.toBeInTheDocument();
    });

    it('handles unexpected network communication exceptions in onVerify safely', async () => {
      const onVerify = jest.fn().mockRejectedValue(new Error('백엔드 게이트웨이 타임아웃'));
      const onClose = jest.fn();

      const mockGeolocation = {
        getCurrentPosition: jest.fn((success) => {
          success({
            coords: {
              latitude: 37.201,
              longitude: 127.096,
            },
          });
        }),
      };

      Object.defineProperty(global.navigator, 'geolocation', {
        value: mockGeolocation,
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
        const failureBanner = screen.getByTestId('gps-failure-banner');
        expect(failureBanner).toBeInTheDocument();
        expect(
          within(failureBanner).getByText('백엔드 게이트웨이 타임아웃')
        ).toBeInTheDocument();
      });

      expect(screen.queryByTestId('gps-success-banner')).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Scenario 5: Strict Zero GPS Coordinate Persistence
  // ============================================================================
  describe('Scenario 5: Strict Zero GPS Coordinate Persistence', () => {
    it('guarantees navigator.geolocation raw coords are NEVER written to localStorage, sessionStorage, or cookies during successful verification', async () => {
      const sensitiveTestLat = 37.201452987654;
      const sensitiveTestLng = 127.096841234567;
      const sensitiveLatStr = sensitiveTestLat.toString();
      const sensitiveLngStr = sensitiveTestLng.toString();

      // Spy on storage and cookie setters
      const localStorageSetItemSpy = jest.spyOn(Storage.prototype, 'setItem');
      const sessionStorageSetItemSpy = jest.spyOn(Storage.prototype, 'setItem');

      mockFetch.mockImplementation((url: string) => {
        if (String(url).includes('/api/board/verify-location')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              data: {
                verified: true,
                distanceMeters: 75,
                message: '단지 위치 인증 완료 (300m 이내)',
              },
            }),
          });
        }
        if (String(url).includes('/api/board/profile')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              data: {
                profile: {
                  selectedTitle: '동탄역 롯데캐슬',
                  titleSetAt: Date.now(),
                  titleExpiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
                  isGpsVerified: true,
                  gpsVerifiedComplex: '동탄역 롯데캐슬',
                  isLocked: true,
                  daysRemaining: 30,
                },
              },
            }),
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({ success: true }) });
      });

      const { result } = renderHook(() => useBoardAuthor());

      await waitFor(() => {
        expect(result.current.authorToken).toBeTruthy();
      });

      // Execute verification with precise sensitive coordinates
      let verifyResult: any;
      await act(async () => {
        verifyResult = await result.current.verifyLocation(
          '동탄역 롯데캐슬',
          sensitiveTestLat,
          sensitiveTestLng
        );
      });

      expect(verifyResult.verified).toBe(true);

      // 1. Audit all localStorage calls
      for (const [key, value] of Object.entries(localStorage)) {
        expect(key).not.toContain(sensitiveLatStr);
        expect(key).not.toContain(sensitiveLngStr);
        expect(value).not.toContain(sensitiveLatStr);
        expect(value).not.toContain(sensitiveLngStr);
        expect(value).not.toContain('37.201452');
        expect(value).not.toContain('127.09684');
      }

      // Check author profile cached in localStorage
      const cachedProfileRaw = localStorage.getItem(AUTHOR_PROFILE_STORAGE_KEY);
      expect(cachedProfileRaw).toBeTruthy();
      const cachedProfile = JSON.parse(cachedProfileRaw!);

      // Permitted fields only:
      expect(cachedProfile).not.toHaveProperty('lat');
      expect(cachedProfile).not.toHaveProperty('lng');
      expect(cachedProfile).not.toHaveProperty('latitude');
      expect(cachedProfile).not.toHaveProperty('longitude');
      expect(cachedProfile).not.toHaveProperty('coords');
      expect(cachedProfile.isGpsVerified).toBe(true);
      expect(cachedProfile.gpsVerifiedComplex).toBe('동탄역 롯데캐슬');

      // 2. Audit all sessionStorage calls
      for (const [key, value] of Object.entries(sessionStorage)) {
        expect(key).not.toContain(sensitiveLatStr);
        expect(key).not.toContain(sensitiveLngStr);
        expect(value).not.toContain(sensitiveLatStr);
        expect(value).not.toContain(sensitiveLngStr);
      }

      // 3. Audit document.cookie
      expect(document.cookie).not.toContain(sensitiveLatStr);
      expect(document.cookie).not.toContain(sensitiveLngStr);
      expect(document.cookie).not.toContain('37.201452');
      expect(document.cookie).not.toContain('127.09684');

      localStorageSetItemSpy.mockRestore();
      sessionStorageSetItemSpy.mockRestore();
    });

    it('guarantees coords are NEVER written to storage even when verification fails or throws', async () => {
      const failedLat = 37.999888777;
      const failedLng = 127.111222333;
      const failedLatStr = failedLat.toString();
      const failedLngStr = failedLng.toString();

      mockFetch.mockImplementation((url: string) => {
        if (String(url).includes('/api/board/verify-location')) {
          return Promise.resolve({
            ok: false,
            status: 400,
            json: async () => ({
              success: false,
              error: {
                code: 'OUT_OF_RANGE',
                message: '단지 반경 300m 이내에 위치하지 않습니다.',
              },
            }),
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({ success: true }) });
      });

      const { result } = renderHook(() => useBoardAuthor());

      await waitFor(() => {
        expect(result.current.authorToken).toBeTruthy();
      });

      let verifyResult: any;
      await act(async () => {
        verifyResult = await result.current.verifyLocation(
          '동탄역 롯데캐슬',
          failedLat,
          failedLng
        );
      });

      expect(verifyResult.verified).toBe(false);

      // Verify zero storage persistence
      for (const [key, value] of Object.entries(localStorage)) {
        expect(key).not.toContain(failedLatStr);
        expect(value).not.toContain(failedLatStr);
        expect(key).not.toContain(failedLngStr);
        expect(value).not.toContain(failedLngStr);
      }

      for (const [key, value] of Object.entries(sessionStorage)) {
        expect(key).not.toContain(failedLatStr);
        expect(value).not.toContain(failedLatStr);
        expect(key).not.toContain(failedLngStr);
        expect(value).not.toContain(failedLngStr);
      }

      expect(document.cookie).not.toContain(failedLatStr);
      expect(document.cookie).not.toContain(failedLngStr);
    });

    it('verifies GpsVerificationModal explicitly renders the Zero GPS Persistence Guarantee statement', () => {
      render(
        <GpsVerificationModal
          isOpen={true}
          onClose={jest.fn()}
          selectedComplex="동탄역 롯데캐슬"
          isGpsVerified={false}
          onVerify={jest.fn()}
        />
      );

      const privacyStatement = screen.getByText(
        /사용자의 실시간 GPS 좌표는 서버에 저장되지 않습니다\. 300m 거리 판정 연산 즉시 메모리에서 영구 파기됩니다\./
      );
      expect(privacyStatement).toBeInTheDocument();
    });
  });
});
