import { NextRequest, NextResponse } from 'next/server';
import { adminDb as db } from '@/lib/firebaseAdmin';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';
import { rateLimiter } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const unsubscribeQuerySchema = z.object({
  email: z.string().email('유효한 이메일 주소를 입력해주세요.').max(100).trim().toLowerCase(),
});

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function GET(request: NextRequest) {
  try {
    // 1. IP 속도 제한 (Rate Limiting) 가드
    if (rateLimiter) {
      const forwarded = request.headers.get('x-forwarded-for');
      const realIp = request.headers.get('x-real-ip');
      const rawIp = realIp || forwarded?.split(',')[0]?.trim() || '127.0.0.1';
      const { success } = await rateLimiter.limit(`ratelimit_unsubscribe_${rawIp}`);
      if (!success) {
        logger.warn('UnsubscribeAPI.GET', 'Rate limit exceeded', { ip: rawIp });
        return new NextResponse(
          `<html>
            <head>
              <title>요청 제한 - D-VIEW</title>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #f9fafb; color: #1f2937; }
                .card { background: white; padding: 40px; border-radius: 24px; text-align: center; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px rgba(0,0,0,0.05); max-width: 400px; width: 90%; }
                h1 { font-size: 20px; font-weight: 800; color: #ef4444; margin-top: 0; }
                p { font-size: 14px; color: #4b5563; line-height: 1.6; margin-bottom: 24px; }
                .btn { background-color: #3b82f6; color: white; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-size: 14px; font-weight: bold; display: inline-block; }
              </style>
            </head>
            <body>
              <div class="card">
                <h1>너무 많은 요청</h1>
                <p>단기간에 너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해 주세요.</p>
                <a href="/" class="btn">D-VIEW 홈으로 이동</a>
              </div>
            </body>
          </html>`,
          { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 429 }
        );
      }
    }

    const { searchParams } = new URL(request.url);
    const emailParam = searchParams.get('email');

    const parsed = unsubscribeQuerySchema.safeParse({ email: emailParam });

    if (!parsed.success) {
      logger.warn('UnsubscribeAPI.GET', 'Invalid unsubscribe parameters', {
        email: emailParam,
        errors: parsed.error.format(),
      });
      return new NextResponse(
        `<html>
          <head>
            <title>구독 해지 오류 - D-VIEW</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #f9fafb; color: #1f2937; }
              .card { background: white; padding: 40px; border-radius: 24px; text-align: center; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px rgba(0,0,0,0.05); max-width: 400px; width: 90%; }
              h1 { font-size: 20px; font-weight: 800; color: #ef4444; margin-top: 0; }
              p { font-size: 14px; color: #4b5563; line-height: 1.6; margin-bottom: 24px; }
              .btn { background-color: #3b82f6; color: white; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-size: 14px; font-weight: bold; display: inline-block; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>잘못된 접근</h1>
              <p>유효하지 않은 이메일 주소이거나 비정상적인 접근 경로입니다. 구독 해지 링크를 다시 한번 확인해 주세요.</p>
              <a href="/" class="btn">D-VIEW 홈으로 이동</a>
            </div>
          </body>
        </html>`,
        { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 400 }
      );
    }

    const { email } = parsed.data;

    if (!db) {
      logger.error('UnsubscribeAPI.GET', 'Database is offline', {});
      throw new Error('Database is offline');
    }

    const docRef = db.collection('subscriptions').doc(email);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      logger.warn('UnsubscribeAPI.GET', 'Subscription not found', { email });
      return new NextResponse(
        `<html>
          <head>
            <title>구독 정보 없음 - D-VIEW</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #f9fafb; color: #1f2937; }
              .card { background: white; padding: 40px; border-radius: 24px; text-align: center; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px rgba(0,0,0,0.05); max-width: 400px; width: 90%; }
              h1 { font-size: 20px; font-weight: 800; color: #f59e0b; margin-top: 0; }
              p { font-size: 14px; color: #4b5563; line-height: 1.6; margin-bottom: 24px; }
              .btn { background-color: #3b82f6; color: white; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-size: 14px; font-weight: bold; display: inline-block; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>정보를 찾을 수 없음</h1>
              <p>구독자로 등록되지 않은 이메일 주소(${escapeHtml(email)})입니다. 이미 구독이 해지되었거나 잘못된 메일 주소일 수 있습니다.</p>
              <a href="/" class="btn">D-VIEW 홈으로 이동</a>
            </div>
          </body>
        </html>`,
        { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 404 }
      );
    }

    // 상태를 unsubscribed로 변경
    await docRef.update({
      status: 'unsubscribed',
      updatedAt: new Date()
    });

    return new NextResponse(
      `<html>
        <head>
          <title>구독 해지 완료 - D-VIEW</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #f9fafb; color: #1f2937; }
            .card { background: white; padding: 40px; border-radius: 24px; text-align: center; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px rgba(0,0,0,0.05); max-width: 420px; width: 90%; }
            .icon { width: 48px; height: 48px; background-color: #fef2f2; color: #ef4444; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px auto; font-size: 24px; font-weight: bold; }
            h1 { font-size: 22px; font-weight: 950; color: #111827; margin-top: 0; margin-bottom: 8px; letter-spacing: -0.5px; }
            p { font-size: 14px; color: #4b5563; line-height: 1.6; margin-bottom: 28px; }
            .email-badge { background-color: #f3f4f6; color: #374151; font-weight: 600; padding: 4px 10px; border-radius: 8px; font-size: 13px; }
            .btn { background-color: #3b82f6; color: white; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-size: 14px; font-weight: bold; display: inline-block; box-shadow: 0 4px 10px rgba(59, 130, 246, 0.2); transition: background-color 0.2s; }
            .btn:hover { background-color: #2563eb; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">✓</div>
            <h1>알림 구독이 해지되었습니다</h1>
            <p><span class="email-badge">${escapeHtml(email)}</span> 계정으로 발송되던 D-VIEW 실거래 소식 및 리포트 발송이 정상적으로 중단되었습니다.</p>
            <a href="/" class="btn">D-VIEW 데이터 랩 가기</a>
          </div>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 200 }
    );
  } catch (error: any) {
    logger.error('UnsubscribeAPI.GET', 'Unsubscribe API Error', {}, error as Error);
    return new NextResponse(
      `<html>
        <head>
          <title>서버 오류 - D-VIEW</title>
          <meta charset="utf-8">
          <style>
            body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #f9fafb; }
            .card { background: white; padding: 40px; border-radius: 20px; text-align: center; border: 1px solid #e5e7eb; max-width: 400px; }
            h1 { color: #ef4444; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>서비스 오류</h1>
            <p>구독 해지 처리 중 내부 서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.</p>
            <p style="font-size: 12px; color: #94a3b8;">Internal Server Error</p>
          </div>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 500 }
    );
  }
}
