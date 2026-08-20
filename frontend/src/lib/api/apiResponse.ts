import { NextResponse } from 'next/server';

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  source?: string;
  message?: string;
  [key: string]: unknown;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  message?: string;
  code?: string;
  details?: unknown;
  [key: string]: unknown;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * 표준 성공 응답 생성 헬퍼
 * @param data - 응답 본문 데이터
 * @param meta - 부가 메타데이터 (source, message, pagination 등)
 * @param init - ResponseInit 설정 (status, headers 등)
 */
export function apiSuccess<T>(
  data: T,
  meta?: Record<string, unknown>,
  init?: ResponseInit
): NextResponse<ApiSuccessResponse<T>> {
  const payload: ApiSuccessResponse<T> = {
    success: true,
    data,
    ...(meta || {}),
  };

  return NextResponse.json(payload, init);
}

/**
 * 표준 에러 응답 생성 헬퍼
 * @param code - 에러 코드 식별자 (예: 'UNAUTHORIZED', 'NOT_FOUND', 'Too Many Requests')
 * @param message - 사용자/디버그용 에러 메시지
 * @param status - HTTP 상태 코드 (기본값 400)
 * @param details - 추가 상세 에러 정보
 * @param init - ResponseInit 설정 (headers 등)
 */
export function apiError(
  code: string,
  message: string = code,
  status: number = 400,
  details?: unknown,
  init?: ResponseInit
): NextResponse<ApiErrorResponse> {
  const payload: ApiErrorResponse = {
    success: false,
    error: code,
    code,
    message,
    ...(details !== undefined ? { details } : {}),
  };

  return NextResponse.json(payload, {
    ...init,
    status: init?.status ?? status,
  });
}
