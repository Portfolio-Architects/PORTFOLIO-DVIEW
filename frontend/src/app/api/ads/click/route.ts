import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { adId, apartmentName, dong, clickedAt } = body;

    // 실무 비즈니스 로깅 시뮬레이션
    console.log(`[AD-CLICK-LOG] AdId: ${adId} | Apartment: ${apartmentName} | Dong: ${dong} | Time: ${clickedAt}`);

    return NextResponse.json({ success: true, message: 'Click logged successfully' }, { status: 200 });
  } catch (error) {
    console.error('[AD-CLICK-ERROR]', error);
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }
}
