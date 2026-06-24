import { NextRequest, NextResponse } from 'next/server';
import { adminDb as db } from '@/lib/firebaseAdmin';
import { sendMail } from '@/lib/utils/server/mailService';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';
import { rateLimiter } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const subscribeSchema = z.object({
  email: z.string().email('유효한 이메일 주소를 입력해주세요.').max(100).trim().toLowerCase(),
  types: z.object({
    realtime: z.boolean().optional(),
    weekly: z.boolean().optional(),
  }).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // 1. IP 속도 제한 (Rate Limiting) 가드
    if (rateLimiter) {
      const forwarded = request.headers.get('x-forwarded-for');
      const realIp = request.headers.get('x-real-ip');
      const rawIp = realIp || forwarded?.split(',')[0]?.trim() || '127.0.0.1';
      const { success } = await rateLimiter.limit(`ratelimit_subscribe_${rawIp}`);
      if (!success) {
        logger.warn('SubscribeAPI.POST', 'Rate limit exceeded', { ip: rawIp });
        return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
      }
    }

    // 2. JSON 파싱 방어 가드
    let rawBody: any;
    try {
      const text = await request.text();
      if (!text.trim()) {
        logger.warn('SubscribeAPI.POST', 'Empty request body', {});
        return NextResponse.json({ error: 'Bad Request: Empty Payload' }, { status: 400 });
      }
      rawBody = JSON.parse(text);
    } catch (jsonErr) {
      logger.warn('SubscribeAPI.POST', 'Invalid JSON format', {}, jsonErr as Error);
      return NextResponse.json({ error: 'Bad Request: Invalid JSON' }, { status: 400 });
    }

    const parsed = subscribeSchema.safeParse(rawBody);
    
    if (!parsed.success) {
      logger.warn('SubscribeAPI.POST', 'Invalid subscription payload', { errors: parsed.error.format() });
      return NextResponse.json({ error: 'Bad Request: Invalid Payload', details: parsed.error.issues }, { status: 400 });
    }

    const { email, types } = parsed.data;

    if (!db) {
      return NextResponse.json({ error: '데이터베이스 연결이 비활성화 상태입니다.' }, { status: 500 });
    }

    const realtime = !!types?.realtime;
    const weekly = false;

    if (!realtime) {
      return NextResponse.json({ error: '최소 한 개 이상의 알림 항목을 선택해주세요.' }, { status: 400 });
    }

    // 3. Firestore 저장 (subscriptions 컬렉션)
    const docRef = db.collection('subscriptions').doc(email);
    
    // 기존 데이터 존재 여부 확인 후 병합
    const docSnap = await docRef.get();
    const now = new Date();
    
    const dataToSave = {
      email,
      realtime,
      weekly,
      status: 'active' as const,
      updatedAt: now,
      ...(docSnap.exists ? {} : { createdAt: now }) // 신규 생성 시에만 createdAt 기록
    };

    await docRef.set(dataToSave, { merge: true });

    // 4. 웰컴 / 확인 이메일 발송 (예외 격리)
    const unsubscribeLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5000'}/api/unsubscribe?email=${encodeURIComponent(email)}`;
    
    const mailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; max-width: 540px; margin: 0 auto; padding: 40px 20px; background-color: #f9fafb; color: #1f2937; line-height: 1.6;">
        <div style="background-color: #ffffff; padding: 40px; border-radius: 24px; border: 1px solid #f1f5f9; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          <!-- Logo / Header -->
          <div style="margin-bottom: 30px;">
            <span style="font-size: 20px; font-weight: 800; color: #3b82f6; letter-spacing: -0.5px;">D-VIEW 데이터 랩</span>
          </div>
          
          <!-- Title -->
          <h2 style="font-size: 22px; font-weight: 900; line-height: 1.3; color: #111827; margin-top: 0; margin-bottom: 16px; letter-spacing: -0.5px;">
            알림 구독 신청이 완료되었습니다.
          </h2>
          
          <!-- Message -->
          <p style="font-size: 14px; color: #4b5563; margin-bottom: 24px;">
            안녕하세요. D-VIEW 부동산 분석 랩입니다.<br />
            요청하신 알림 서비스 구독 등록이 완료되었습니다. 신청하신 내역은 아래와 같습니다:
          </p>
          
          <!-- Subscription Box -->
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; margin-bottom: 30px;">
            <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
               <tr>
                <td style="color: #64748b; width: 90px; padding: 6px 0; font-weight: bold;">이메일</td>
                <td style="color: #334155; padding: 6px 0; font-weight: 600;">${email}</td>
              </tr>
              <tr>
                <td style="color: #64748b; padding: 6px 0; font-weight: bold;">실시간 거래가</td>
                <td style="color: #334155; padding: 6px 0; font-weight: 600;">${realtime ? '🟢 알림 받음' : '⚪ 미선택'}</td>
              </tr>
            </table>
          </div>

          <p style="font-size: 13px; color: #4b5563; margin-bottom: 30px;">
            앞으로 관심 단지의 실거래 소식이 등록되는 즉시 빠르고 정확하게 메일로 전달해 드리겠습니다.
          </p>

          <div style="border-top: 1px solid #f1f5f9; padding-top: 20px; font-size: 12px; color: #94a3b8; text-align: center;">
            본 메일은 발신전용 메일입니다.<br />
            알림을 더 이상 원치 않으시면 언제든지 아래 링크를 통해 해지하실 수 있습니다.<br />
            <a href="${unsubscribeLink}" style="color: #64748b; text-decoration: underline; font-weight: 600; display: inline-block; margin-top: 8px;">[구독 해지하기]</a>
          </div>
        </div>
      </div>
    `;

    try {
      await sendMail({
        to: email,
        subject: '[D-VIEW] 실거래가 알림 구독 신청이 완료되었습니다.',
        html: mailHtml,
      });
    } catch (mailErr) {
      logger.error('SubscribeAPI.POST', 'Welcome email failed to send', { email }, mailErr as Error);
      // 구독은 이미 데이터베이스에 등록되었으므로 성공으로 응답을 내려주고, 에러 로그만 확보한다.
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error('SubscribeAPI.POST', 'Subscription API Error', {}, error as Error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
