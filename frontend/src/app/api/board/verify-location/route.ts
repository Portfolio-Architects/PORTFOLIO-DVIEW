import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiSuccess, apiError } from '@/lib/api/apiResponse';
import { checkRateLimit } from '@/lib/api/rateLimiter';
import { getBoardRepository } from '@/lib/board/boardRepository';
import {
  getOrCreateAuthorToken,
  hashAuthorToken,
  AUTHOR_TOKEN_COOKIE_NAME,
} from '@/lib/board/boardAuth';
import {
  verifyComplexLocation,
  getComplexData,
  checkTitleLock,
  TITLE_LOCK_DURATION_MS,
  BoardAuthorProfile,
} from '@/lib/board/boardEngine';
import { logger } from '@/lib/services/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VerifyLocationSchema = z.object({
  complexName: z.string().trim().min(1, '단지명을 입력해주세요.'),
  lat: z.number().finite('위도(lat)는 유효한 숫자여야 합니다.'),
  lng: z.number().finite('경도(lng)는 유효한 숫자여야 합니다.'),
  authorToken: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const rateLimit = await checkRateLimit(request, {
      prefix: 'ratelimit_board_verify_location_post',
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

    const parsed = VerifyLocationSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        'INVALID_PARAMETERS',
        '위치 인증 요청 양식이 올바르지 않습니다.',
        400,
        parsed.error.issues
      );
    }

    const { complexName, lat, lng } = parsed.data;

    // Token extraction or issuance
    const { token, isNew } = getOrCreateAuthorToken(
      request,
      typeof body.authorToken === 'string' ? body.authorToken : null
    );
    const authorTokenHash = hashAuthorToken(token);

    const repo = getBoardRepository();
    const existingProfile = await repo.getAuthorProfile(authorTokenHash);
    const now = Date.now();

    // If profile exists and is title-locked to a different complex, verification is barred
    if (existingProfile) {
      const lockCheck = checkTitleLock(existingProfile, complexName, now);
      if (!lockCheck.allowed) {
        return apiError(
          'TITLE_LOCKED_30_DAYS',
          '30일 타이틀 고정 기간 중에는 다른 단지 위치 인증을 진행할 수 없습니다.',
          400,
          { daysRemaining: lockCheck.daysRemaining }
        );
      }
    }

    // Perform Haversine 300m verification (transient in-memory, zero GPS persistence)
    const verification = verifyComplexLocation(complexName, lat, lng);

    if (verification.verified) {
      const complexData = getComplexData(complexName);
      const isExpired = !existingProfile || !existingProfile.titleExpiresAt || now >= existingProfile.titleExpiresAt;
      const titleSetAt = isExpired ? now : (existingProfile.titleSetAt || now);
      const titleExpiresAt = isExpired ? now + TITLE_LOCK_DURATION_MS : existingProfile.titleExpiresAt;

      const updatedProfile: BoardAuthorProfile = {
        authorTokenHash,
        selectedTitle: complexName,
        dong: complexData?.dong || existingProfile?.dong,
        titleSetAt,
        titleExpiresAt,
        isGpsVerified: true,
        gpsVerifiedComplex: complexName,
        gpsVerifiedAt: now,
      };

      await repo.saveAuthorProfile(updatedProfile);
    }

    // STRICT ZERO GPS PERSISTENCE: lat and lng are NEVER returned or stored in cookies/headers
    const response = apiSuccess(
      {
        verified: verification.verified,
        distanceMeters: verification.distanceMeters,
        code: verification.code,
        message: verification.message,
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
    logger.error('BoardVerifyLocationAPI.POST', 'Error in GPS verification', {}, err);
    return apiError(
      'INTERNAL_ERROR',
      '위치 인증 처리 중 오류가 발생했습니다.',
      500
    );
  }
}
