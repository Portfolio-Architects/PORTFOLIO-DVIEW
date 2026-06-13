/**
 * Generate ticker CSV for Google Sheets apartments tab
 * Run: node scripts/generate-tickers.js
 */

const { z } = require('zod');

// Zod schemas for ticker metadata and prefix verification
const DongPrefixSchema = z.record(
  z.string().min(2, '동 이름은 최소 2글자 이상이어야 합니다.'),
  z.string().regex(/^[A-Z]{2}$/, '동 프리픽스는 2글자 대문자 영문이어야 합니다.')
);

const FullDongDataSchema = z.record(
  z.string().min(2, '동 이름은 최소 2글자 이상이어야 합니다.'),
  z.array(z.string().min(1, '아파트 이름은 최소 1글자 이상이어야 합니다.'))
);

const TickerEntrySchema = z.object({
  name: z.string().min(1, '아파트명이 누락되었습니다.'),
  dong: z.string().min(2, '법정동명이 누락되었습니다.'),
  priceChangeRate: z.number().optional(), // 실거래 가격 상승률
  landmarkText: z.string().optional()     // 랜드마크 텍스트
});

const TickersMapSchema = z.record(
  z.string().regex(/^[A-Z]{2}\d{2,3}$/, '티커 규격은 대문자 2자리 + 숫자 2~3자리 포맷이어야 합니다.'),
  TickerEntrySchema
);

const DONG_PREFIXES = {
  '능동': 'ND',
  '청계동': 'CG',
  '송동': 'SD',
  '여울동': 'YU',
  '장지동': 'JJ',
  '신동': 'SN',
  '목동': 'MD',
  '산척동': 'SC',
  '영천동': 'YC',
  '반송동': 'BS',
  '석우동': 'SW',
};

const FULL_DONG_DATA = {
  '능동': [
    '숲속마을 동탄 모아미래도 1단지', '숲속마을 동탄 광명메이루즈', '숲속마을 동탄 모아미래도 2단지',
    '푸른마을 포스코더샵 2차', '능동역 센트럴 경남아너스빌', '숲속마을 동탄 자연앤데시앙',
    '능동역 이지더원', '능동역 경남아너스빌', '동탄푸른마을 두산위브',
    '동탄숲속마을 능동역 리체더포레스트', '푸른마을 동탄 모아미래도', '푸른마을 동탄 신일해피트리',
    '에스원 스마트빌', '동탄능동마을 상록예가', '능동마을 주공 7단지', '능동마을 주공',
  ].sort(),
  '청계동': [
    '동탄역 시범 더샵 센트럴시티', '동탄역 시범 금강펜테리움 센트럴파크 3차',
    '동탄역 시범 한화꿈에그린 프레스티지', '동탄역 시범 우남퍼스트빌', '동탄역 시범 대원칸타빌',
    '동탄역 시범 리슈빌', '동탄역 시범 반도유보라 아이비파크 1.0', '동탄역 시범 호반써밋',
    '동탄역 시범 반도유보라 아이비파크 4.0', '동탄역 시범 예미지', '동탄역 롯데캐슬 알바트로스',
    '동탄역 신안인스빌리베라 1차', '동탄역 센트럴 푸르지오', '동탄역 모아미래도',
    '동탄역 KCC스위콈', '동탄역 호반써밋', '동탄역 대원칸타빌 포레지움',
    '동탄역 신안인스빌리베라 2차', '동탄역 더힐',
  ].sort(),
  '송동': [
    '동탄린스트라우스 더레이크', '동탄2신도시 하우스디 더레이크', '동탄2 LH 26단지', '동탄 레이크자이 더테라스',
  ].sort(),
  '여울동': [
    '동탄역 롯데캐슬', '동탄역 에미지 시그너스', '동탄역 린스트라우스',
    '동탄역 반도유보라 아이비파크 8.0', '동탄역 반도유보라 아이비파크 7.0', '동탄역 유림노르웨이숲',
    '동탄역 반도유보라 아이비파크 6.0', '동탄역 삼정그린코아 더베스트',
    '동탄역 반도유보라 아이비파크 5.0', '동탄역 파라곤', '동탄역 동원로얄듀크 비스타',
    '동탄역 헤리엇', '중흥S클래스 더테라스 리치', '중흥S클래스 더테라스 리비에르',
    '동탄역 더샵 센트럴시티 2차', '동탄역 에일린의뜨', '동탄역 중흥S클래스',
    '반도유보라 아이비파크 3.0', '동탄2신도시 금강펜테리움', '동탄역 남해오네띄 더테라스',
    '동탄역 신미주', '센트럴힐조 동탄', '중흥S클래스 더테라스 리에스',
    '동탄2신도시 동탄역 디에트르', '동탄2신도시 동탄역 대방엘리움',
    'e편한세상 동탄역 어반원', '힐스테이트 동탄역',
  ].sort(),
  '장지동': [
    '동탄 레이크 자연앤푸르지오', '한화포레나 동탄호수', '동탄호수 자이파밀리에',
    '금호어울림 레이크 2차', '동탄호수 하우스디', '금호어울림 레이크 1차',
    '레이크 반도유보라 아이비파크 9.0', '동탄2 아이파크 1단지', '동탄2 아이파크 2단지',
    '제일풍경채 에듀앤파크', '동탄2신도시 호반베르디움', '동탄호수공원 아이파크',
    '동탄호수공원 계룡리슈빌', '동탄 레이크파크 자연앤e편한세상', '동탄2 롯데캐슬',
  ].sort(),
  '신동': [
    'e편한세상 동탄 파크아너스', '동탄2 디에트르포레', '힐스테이트 동탄포레',
    '화성동탄2 제일풍경채 퍼스트', '호반써밋 동탄', '아테라 파밀리에', '숨마데시앙',
    '동탄파크릭스 A55BL', '동탄파크릭스 A52BL', '동탄파크릭스 A51-2BL', '동탄파크릭스 A51-1BL',
    '동탄 파라곤 3차', '동탄신도시 금강펜테리움 7차', '동탄신도시 금강펜테리움 6차',
    '동탄 GWEN160', '동탄2신도시 C29BL 우성더르네상스', '동탄2신도시 C27BL',
  ].sort(),
  '목동': [
    '힐스테이트 동탄', '한신더휴', '동탄 동원로얄듀크 2차', '금강펜테리움 센트럴파크 4차',
    '호반베르디움 센트럴포레', 'e편한세상 동탄', '동탄2신도시 호반베르디움 2차',
    '동탄2신도시 베라체', '르파비스',
  ].sort(),
  '산척동': [
    '동탄 더레이크팰리스', '동탄 더샵 레이크에듀타운', '호수공원역 센트럴시티',
    '호수공원역 센트리체', '더레이크시티 부영 2단지', '중흥에스클래스 에듀하이',
    '서희스타힐스 엔에이치에프', '더레이크파크뷰', '동탄호수공원 금강펜테리움 센트럴파크 2차',
    '레이크힐 반도유보라 아이비파크 10.0', '동탄호수공원역 레이크시티',
    '그린힐 반도유보라 아이비파크 10.0', '동탄 포레파크 자연앤푸르지오', '동탄 꿈의숲 자연앤데시앙',
  ].sort(),
  '영천동': [
    '동탄역 센트럴자이', '동탄역 센트럴예미지', '동탄역 푸르지오', '동탄역 센트럴상록',
    '동탄역 경남아너스빌', '동탄역 대방디엠시티 더센텀', '동탄 파크자이',
    '동탄역 원로얄듀크 1차', '동탄역 포레너스', '동탄역 반도유보라 아이비파크 2.0',
    '동탄역 이지더원', '동탄 중흥에스클래스 파크뷰', '동탄 파크푸르지오',
    '힐스테이트 동탄역', '동탄2신도시 동원로얄듀크', '동탄 퍼스트파크',
    '동탄 파크한양수자인', '동탄 행복마을 푸르지오', '동탄역 금강펜테리움 더시티',
  ].sort(),
  '반송동': [
    '메타폴리스', '동탄파라곤', '솔빛마을 경남아너스빌', '시범한빛마을 동탄아이파크',
    '솔빛마을 서해그랑블', '동탄 금호어울림', '동탄나루마을 한화꿈에그린',
    '동탄나루마을 신도브래뉴', '시범한빛마을 한화꿈에그린', '솔빛마을 동탄쌍용예가',
    '반탄솔빛마을 신도브래뉴', '시범다은마을 삼성래미안', '동탄나루마을 동탄역 유보라',
    '시범다은마을 동탄포스코더샵', '동탄파라곤 II', '동탄시범다은마을 메타역세권',
    '동탄나루마을 동탄한화꿈에그린', '시범한빛마을 동탄삼부르네상스',
    '동탄시범한빛마을 KCC스위콈', '동탄시범다은마을 월드메르디앙',
    '시범다은마을 우남퍼스트빌', '시범나루마을 동탄역 UBO', '동탄플래티넘',
    '동탄현대 하이페리온', '서해더블루', '서해더블루 90-2번지', '동탄센트럴포레스트',
    '동탄시범다은마을 센트럴힐', '동탄우림필유 타운하우스', '동탄스카이뷰',
    '센트럴SE타운', '에스원센트로벨', '엔터프라임빌딩', '서해더블루 93-8번지',
    '새강마을 휴먼시아 5단지2', '동탄위버폴리스',
  ].sort(),
  '석우동': [
    '예당마을 푸르지오', '예당마을 우미린 제일풍경채', '예당마을 롯데캐슬', '예당마을 신일유토빌',
  ].sort(),
};

// Validate inputs using Zod
const prefixParsed = DongPrefixSchema.safeParse(DONG_PREFIXES);
if (!prefixParsed.success) {
  console.error('❌ [Generate Tickers] DONG_PREFIXES Validation Failed:', prefixParsed.error.format());
  process.exit(1);
}

const dongDataParsed = FullDongDataSchema.safeParse(FULL_DONG_DATA);
if (!dongDataParsed.success) {
  console.error('❌ [Generate Tickers] FULL_DONG_DATA Validation Failed:', dongDataParsed.error.format());
  process.exit(1);
}

// Generate tickers
const tickers = {};
let total = 0;

console.log('티커\t아파트명\t동');
console.log('---\t---\t---');

for (const [dong, apts] of Object.entries(FULL_DONG_DATA)) {
  const prefix = DONG_PREFIXES[dong] || 'XX';
  apts.forEach((name, idx) => {
    const ticker = `${prefix}${String(idx + 1).padStart(2, '0')}`;
    tickers[ticker] = { name, dong };
    console.log(`${ticker}\t${name}\t${dong}`);
    total++;
  });
}

// Validate generated tickers map
const tickersParsed = TickersMapSchema.safeParse(tickers);
if (!tickersParsed.success) {
  console.error('❌ [Generate Tickers] Generated Tickers Validation Failed:', tickersParsed.error.format());
  process.exit(1);
}

console.log(`\n✅ Generated tickers validation: PASSED`);
console.log(`\n총 ${total}개 티커 생성 완료`);
console.log('\n--- 동 프리픽스 ---');
for (const [dong, prefix] of Object.entries(DONG_PREFIXES)) {
  const count = FULL_DONG_DATA[dong]?.length || 0;
  console.log(`${prefix} = ${dong} (${count}개)`);
}
