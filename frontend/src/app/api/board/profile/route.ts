import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiSuccess, apiError } from '@/lib/api/apiResponse';
import { checkRateLimit } from '@/lib/api/rateLimiter';
import { getBoardRepository } from '@/lib/board/boardRepository';
import {
  extractAuthorToken,
  getOrCreateAuthorToken,
  hashAuthorToken,
  AUTHOR_TOKEN_COOKIE_NAME,
} from '@/lib/board/boardAuth';
import {
  getAllSelectableTitles,
  getComplexData,
  checkTitleLock,
  TITLE_LOCK_DURATION_MS,
  BoardAuthorProfile,
} from '@/lib/board/boardEngine';
import { logger } from '@/lib/services/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SetProfileTitleSchema = z.object({
  selectedTitle: z.string().trim().min(1, '선택할 단지명 또는 타이틀을 입력해주세요.'),
  authorToken: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const rateLimit = await checkRateLimit(request, {
      prefix: 'ratelimit_board_profile_get',
      requestsPerLimit: 60,
    });
    if (!rateLimit.success) {
      return (
        rateLimit.response ||
        apiError('RATE_LIMIT_EXCEEDED', 'Too Many Requests', 429)
      );
    }

    const token = extractAuthorToken(request);
    if (!token) {
      return apiSuccess({
        profile: null,
        isLocked: false,
        daysRemaining: 0,
      });
    }

    const authorTokenHash = hashAuthorToken(token);
    const repo = getBoardRepository();
    const profile = await repo.getAuthorProfile(authorTokenHash);

    if (!profile) {
      return apiSuccess({
        profile: null,
        isLocked: false,
        daysRemaining: 0,
      });
    }

    const now = Date.now();
    const isLocked = Boolean(profile.titleExpiresAt && now < profile.titleExpiresAt);
    const daysRemaining = isLocked
      ? Math.max(1, Math.ceil((profile.titleExpiresAt - now) / (24 * 60 * 60 * 1000)))
      : 0;

    return apiSuccess({
      profile: {
        selectedTitle: profile.selectedTitle,
        dong: profile.dong,
        titleSetAt: profile.titleSetAt,
        titleExpiresAt: profile.titleExpiresAt,
        isGpsVerified: profile.isGpsVerified,
        gpsVerifiedComplex: profile.gpsVerifiedComplex,
        gpsVerifiedAt: profile.gpsVerifiedAt,
        isLocked,
        daysRemaining,
      },
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('BoardProfileAPI.GET', 'Error fetching author profile', {}, err);
    return apiError(
      'INTERNAL_ERROR',
      '작성자 프로필 조회 중 오류가 발생했습니다.',
      500
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const rateLimit = await checkRateLimit(request, {
      prefix: 'ratelimit_board_profile_post',
      requestsPerLimit: 20,
      window: '1 m',
    });
    if (!rateLimit.success) {
      return (
        rateLimit.response ||
        apiError('RATE_LIMIT_EXCEEDED', 'Too Many Requests', 429)
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return apiError('MALFORMED_JSON', 'Malformed JSON body payload', 400);
    }

    const parsed = SetProfileTitleSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        'INVALID_PARAMETERS',
        '프로필 설정 요청 양식이 올바르지 않습니다.',
        400,
        parsed.error.issues
      );
    }

    const { selectedTitle } = parsed.data;

    // Validate title belongs to 184 selectable titles
    const allTitles = getAllSelectableTitles();
    if (!allTitles.includes(selectedTitle)) {
      return apiError(
        'INVALID_TITLE',
        '동탄 183개 아파트 단지 또는 동탄 예비입주민 타이틀만 선택 가능합니다.',
        400
      );
    }

    const { token, isNew } = getOrCreateAuthorToken(
      request,
      typeof body.authorToken === 'string' ? body.authorToken : null
    );
    const authorTokenHash = hashAuthorToken(token);

    const repo = getBoardRepository();
    const existingProfile = await repo.getAuthorProfile(authorTokenHash);
    const now = Date.now();

    // Check 30-day anti-impersonation lock
    const lockCheck = checkTitleLock(existingProfile, selectedTitle, now);
    if (!lockCheck.allowed) {
      return apiError(
        'TITLE_LOCKED_30_DAYS',
        '30일 동안 단지 타이틀을 변경할 수 없습니다.',
        400,
        { daysRemaining: lockCheck.daysRemaining }
      );
    }

    // Determine metadata and GPS verification state
    const complexData = getComplexData(selectedTitle);
    const isSameTitle = Boolean(existingProfile && existingProfile.selectedTitle === selectedTitle);
    const isGpsVerified = isSameTitle ? Boolean(existingProfile?.isGpsVerified) : false;
    const gpsVerifiedComplex = isSameTitle ? existingProfile?.gpsVerifiedComplex : undefined;
    const gpsVerifiedAt = isSameTitle ? existingProfile?.gpsVerifiedAt : undefined;

    const titleExpiresAt = now + TITLE_LOCK_DURATION_MS;

    const updatedProfile: BoardAuthorProfile = {
      authorTokenHash,
      selectedTitle,
      dong: complexData?.dong || existingProfile?.dong,
      titleSetAt: now,
      titleExpiresAt,
      isGpsVerified,
      gpsVerifiedComplex,
      gpsVerifiedAt,
    };

    await repo.saveAuthorProfile(updatedProfile);

    const response = apiSuccess(
      {
        profile: {
          selectedTitle: updatedProfile.selectedTitle,
          dong: updatedProfile.dong,
          titleSetAt: updatedProfile.titleSetAt,
          titleExpiresAt: updatedProfile.titleExpiresAt,
          isGpsVerified: updatedProfile.isGpsVerified,
          gpsVerifiedComplex: updatedProfile.gpsVerifiedComplex,
          gpsVerifiedAt: updatedProfile.gpsVerifiedAt,
          isLocked: true,
          daysRemaining: 30,
        },
      },
      { authorToken: token }
    );

    response.cookies.set(AUTHOR_TOKEN_COOKIE_NAME, token, {
      path: '/',
      maxAge: 365 * 24 * 60 * 60,
      httpOnly: true,
      sameSite: 'lax',
    });

    return response;
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('BoardProfileAPI.POST', 'Error updating author profile', {}, err);
    return apiError(
      'INTERNAL_ERROR',
      '작성자 프로필 저장 중 오류가 발생했습니다.',
      500
    );
  }
}
