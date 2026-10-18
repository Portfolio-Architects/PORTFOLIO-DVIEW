# DVIEW Design System Specification (DESIGN.md)

## 1. Axioms & Guiding Principles

### 1.1 Single Source of Truth (SSOT) 공리
- DVIEW 플랫폼 전역 UI/UX, 컴포넌트, 스타일링, 레이아웃, 아이콘, 타이포그래피, 광고 배치의 단일 진실 공급원(SSOT) 확립
- 모든 프론트엔드 변경 작업 시 본 명세서 사전 참조 및 불변식 준수 의무 강제
- HODEP v2.2 공리계 기반의 무채색적·실증적 설계 및 결정론적 인터페이스 상태 전이 유지

### 1.2 Zero-Emoji 공리
- 유니코드 서브 이모티콘(이모지, 특수 그림문자)의 UI 렌더링 전면 배제
- 본문, 배지, 카드 헤더, 버튼, 툴팁, 탭 네비게이션, 알림 메시지 내 이모티콘 사용 금지
- 시각적 인디케이터 필요 시 `lucide-react` SVG 벡터 아이콘 및 정규 타이포그래피 계층으로 100% 일원화

### 1.3 Slate + Emerald/Blue 토큰 불변성 공리
- 무채색 베이스: Tailwind CSS `slate-*` 단일 팔레트(Slate-50 ~ Slate-950) 강제 (`zinc`, `neutral`, `gray`, `stone` 전면 차단)
- 1차 브랜드 시맨틱(Primary): `emerald-*` (상승, 신고가, 긍정, 핵심 액션, 신뢰)
- 2차 데이터 시맨틱(Secondary/Data): `blue-*` (기준선, 통계 지표, 분석 메트릭, 정보 링크)
- 3차 경고/하락 시맨틱(Negative/Alert): `red-*` (하락, 리스크, 역전세, DSR 초과 경고, `rose` 완전 대체)
- 비표준 난색/과채도/임의 그라데이션(`pink`, `purple`, `fuchsia`, `violet`, `neon`, `amber`, `orange`, `yellow`) 전면 배제

### 1.4 Native Monetization & Zero-CLS 공리
- Cumulative Layout Shift(CLS) 엄격 통제: $CLS < 0.001$ 불변식 준수
- 광고 슬롯 컨테이너의 뷰포트별 최소 높이(`min-h`) 사전 예약 바운딩 박스 강제
- 메인 대시보드 히어로 2열(좌측 도넛/KPI vs 우측 시계열 차트) 높이 편차 $\Delta H = [0, \pm 0, \text{px}]$ (`lg:h-[566px]`) 영구 보존
- 과잉 연산형 위젯 배제 및 핵심 탐색 흐름(실거래가 궤적, 챕터 간격, 단지 비교) 결합형 간결한 1st-party 네이티브 카드/CTA 구조 유지

---

## 2. Color Tokens & Palette Mapping

### 2.1 무채색 베이스 토큰 (Neutral Base: Slate)

| 용도 및 계층 | 라이트 모드 (Light) | 다크 모드 (Dark) | 16진수 코드 (Light / Dark) | 치환 대상 비표준 클래스 |
|---|---|---|---|---|
| 페이지 최외곽 배경 | `bg-slate-50` | `dark:bg-slate-950` | `#f8fafc` / `#020617` | `bg-zinc-950`, `bg-neutral-900`, `bg-neutral-50` |
| 카드/서피스 기본 배경 | `bg-white` | `dark:bg-slate-900` | `#ffffff` / `#0f172a` | `bg-zinc-900`, `bg-neutral-800`, `bg-zinc-900/95` |
| 보조 서피스/인풋 배경 | `bg-slate-100` | `dark:bg-slate-800` | `#f1f5f9` / `#1e293b` | `bg-zinc-100`, `bg-neutral-100`, `bg-zinc-800` |
| 3차 서피스/호버 배경 | `bg-slate-200/60` | `dark:bg-slate-800/60` | `#e2e8f0` (60%) / `#1e293b` (60%) | `bg-zinc-200`, `bg-neutral-200` |
| 기본 경계선 (Default Border) | `border-slate-200` | `dark:border-slate-800` | `#e2e8f0` / `#1e293b` | `border-zinc-200`, `border-neutral-200`, `border-zinc-800` |
| 미세 경계선 (Subtle Border) | `border-slate-100` | `dark:border-slate-800/60` | `#f1f5f9` / `#1e293b` (60%) | `border-zinc-100`, `border-neutral-100` |
| 강조 경계선 (Active/Focus Border) | `border-slate-300` | `dark:border-slate-700` | `#cbd5e1` / `#334155` | `border-zinc-300`, `border-neutral-300` |
| 주 텍스트 (Primary Text) | `text-slate-900` | `dark:text-slate-50` | `#0f172a` / `#f8fafc` | `text-zinc-900`, `text-neutral-900`, `text-zinc-100` |
| 보조 텍스트 (Secondary Text) | `text-slate-600` | `dark:text-slate-400` | `#475569` / `#94a3b8` | `text-zinc-600`, `text-neutral-600`, `text-zinc-400` |
| 3차/뮤트 텍스트 (Muted Text) | `text-slate-400` | `dark:text-slate-500` | `#94a3b8` / `#64748b` | `text-zinc-400`, `text-neutral-400`, `text-gray-400` |
| 스켈레톤 로딩 펄스 (Pulse Base) | `bg-slate-200` | `dark:bg-slate-800` | `#e2e8f0` / `#1e293b` | `bg-zinc-200`, `bg-neutral-200`, `bg-teal-600/30` |

### 2.2 브랜드 시맨틱 토큰 (Primary: Emerald, Secondary/Data: Blue)

| 토큰 명칭 | 라이트 모드 (Light) | 다크 모드 (Dark) | 16진수 코드 (Light / Dark) | 용도 및 규칙 |
|---|---|---|---|---|
| **Brand Primary (기본)** | `bg-emerald-600` | `dark:bg-emerald-500` | `#059669` / `#10b981` | 주요 CTA 버튼, 활성 탭 캡슐, 브랜드 시그니처 |
| **Brand Primary Hover** | `hover:bg-emerald-700` | `dark:hover:bg-emerald-400` | `#047857` / `#34d399` | 버튼 및 인터랙티브 엘리먼트 호버 상태 |
| **Brand Primary Surface** | `bg-emerald-50` | `dark:bg-emerald-950/40` | `#ecfdf5` / `#064e3b` (40%) | 브랜드 강조 카드 배경, 상태 칩 배경 |
| **Brand Primary Border** | `border-emerald-200` | `dark:border-emerald-800/50` | `#a7f3d0` / `#065f46` (50%) | 브랜드 카드 경계선, 활성 인풋 경계선 |
| **Brand Primary Text** | `text-emerald-700` | `dark:text-emerald-400` | `#047857` / `#34d399` | 브랜드 강조 텍스트, 상승률 수치 표기 |
| **Brand Data / Action** | `bg-blue-600` | `dark:bg-blue-500` | `#2563eb` / `#3b82f6` | 2열 차트 기준선, 거시 지표, 2차 액션 버튼 |
| **Brand Data Hover** | `hover:bg-blue-700` | `dark:hover:bg-blue-400` | `#1d4ed8` / `#60a5fa` | 데이터 액션 인터랙션 호버 상태 |
| **Brand Data Surface** | `bg-blue-50` | `dark:bg-blue-950/40` | `#eff6ff` / `#172554` (40%) | 통계/분석 하이라이트 서피스 |
| **Brand Data Border** | `border-blue-200` | `dark:border-blue-800/50` | `#bfdbfe` / `#1e40af` (50%) | 분석 카드 및 비교 뷰 경계선 |
| **Brand Data Text** | `text-blue-700` | `dark:text-blue-400` | `#1d4ed8` / `#60a5fa` | 통계 메트릭 라벨, 정보성 링크 텍스트 |

### 2.3 캘리브레이션 상태/인텐트 채널 (Calibrated Status Channels)

| 상태 채널 | 배경 토큰 (Surface) | 텍스트 토큰 (Text) | 경계선 토큰 (Border) | 도메인 적용 대상 |
|---|---|---|---|---|
| **Positive / Safe** | `bg-emerald-50 dark:bg-emerald-950/40` | `text-emerald-700 dark:text-emerald-400` | `border-emerald-200 dark:border-emerald-800/40` | 실거래 상승, 전세가율 안전 구간, 가치 고평가 지표 |
| **Negative / Alert** | `bg-red-50 dark:bg-red-950/40` | `text-red-700 dark:text-red-400` | `border-red-200 dark:border-red-800/40` | 실거래 하락, 역전세 위험, DSR 규제 한도 초과 경고 |
| **Info / Primary Data** | `bg-blue-50 dark:bg-blue-950/40` | `text-blue-700 dark:text-blue-400` | `border-blue-200 dark:border-blue-800/40` | 평균 매매가, 주담대 기준 금리, 회전율 통계, 정보 안내 |
| **Neutral / Muted** | `bg-slate-100 dark:bg-slate-800/60` | `text-slate-700 dark:text-slate-300` | `border-slate-200 dark:border-slate-700/60` | 보조 메트릭 태그, 비활성 챕터, 이전 기준 거래 |

### 2.4 금지 클래스 블랙리스트 (Prohibited Class Blacklist)
- **무채색 금지 목록**: `zinc-*`, `neutral-*`, `gray-*`, `stone-*` (전량 `slate-*` 단일화 강제)
- **브랜드 변종 금지 목록**: `teal-*`, `cyan-*`, `sky-*`, `green-*` (`emerald-*` 및 `blue-*`로 통합)
- **난색/과채도 금지 목록**: `rose-*` (`red-*` 치환), `amber-*` (`slate-*` 또는 정규 상태 채널 치환), `orange-*` (전면 배제), `purple-*`, `indigo-*`, `violet-*`, `pink-*`, `yellow-*` (전면 배제)
- **임의 네온 그라데이션 금지**: Tailwind 내 임의 다채색 `from-*-* to-*-*` 그라데이션 선언 배제

---

## 3. Typography & Micro-Surface Architecture

### 3.1 폰트 패밀리 계층 구조 (Font Family Hierarchy)

| 계층 (Role) | 폰트 패밀리 (Font Family) | CSS 클래스 / 정의 | 적용 컴포넌트 |
|---|---|---|---|
| **Editorial Headline** | Cormorant Garamond / Georgia | `font-serif` | 단지 상세 모달 타이틀, 모노그래프 리포트 헤더, 대시보드 메인 타이틀 |
| **Meta & Body Text** | Outfit / Inter / Pretendard | `font-sans` | 챕터 서브텍스트, 본문 단락, 테이블 컬럼 라벨, 버튼 텍스트, 메타데이터 |
| **Quantitative Data** | JetBrains Mono | `font-mono tabular-nums` | 실거래 금액, 변동률(%), DSR 수치, 날짜(YYYY.MM.DD), Bessel ±2SD 통계량 |

### 3.2 Arctic Lumina 글래스모피즘 표면 규격 (.surface-glass-dense)
- 고밀도 반투명 글래스 서피스 규격 불변식 적용:
```css
/* Arctic Lumina Surface Glass Specification */
.surface-glass-dense {
  background-color: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(226, 232, 240, 0.8); /* border-slate-200/80 */
}

.dark .surface-glass-dense {
  background-color: rgba(15, 23, 42, 0.85); /* bg-slate-900/85 */
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(30, 41, 59, 0.8); /* border-slate-800/80 */
}
```

### 3.3 120fps 스크롤 성능 불변식 (Scroll Performance Invariant)
- 고빈도 스크롤 이벤트 발생 시 백드롭 필터 렌더링 부하 차단:
```css
/* 120fps Scroll Invariant: body.is-scrolling 활성화 시 backdrop-filter 억제 */
body.is-scrolling .surface-glass-dense,
body.is-scrolling [class*="backdrop-blur"] {
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
```

---

## 4. Iconography Standards

### 4.1 단일 라이브러리 및 렌더링 규격
- 아이콘 라이브러리: `lucide-react` 단일 SVG 패키지 전용 강제
- 이모티콘 텍스트(`🔥`, `👑`, `💡`, `📈`, `📉`, `⚠️`, `🏢` 등) 원천 차단
- `<select><option>` 내부는 순수 문자열(Plain Text) 라벨만을 허용하며 아이콘 엘리먼트 및 유니코드 삽입 금지

### 4.2 물리적 크기 표준 규격 (Standard Icon Dimensions)

| 크기 명칭 | 치수 (픽셀) | Tailwind 클래스 | Lucide prop | 적용 위치 |
|---|---|---|---|---|
| **Micro / Badge** | 14px $\times$ 14px | `w-3.5 h-3.5` | `size={14}` | 인라인 배지, 상태 칩, 태그 내부 인디케이터 |
| **Small / Body** | 16px $\times$ 16px | `w-4 h-4` | `size={16}` | 본문 텍스트 인라인, 일반 버튼, 탭 네비게이션 항목 |
| **Medium / Header** | 18px $\times$ 18px | `w-4.5 h-4.5` 또는 `w-[18px] h-[18px]` | `size={18}` | 카드 헤더, 섹션 서브타이틀, 필터 컨트롤러 |
| **Large / Modal** | 20px $\times$ 20px | `w-5 h-5` | `size={20}` | 모달 메인 헤더, 히어로 메트릭 대표 아이콘 |

### 4.3 색상 상속 및 시맨틱 매핑 규칙
- 기본 원칙: 부모 텍스트 토큰 상속(`stroke="currentColor"`)
- 상태별 지정:
  * 상승/안전: `text-emerald-600 dark:text-emerald-400`
  * 하락/경고: `text-red-600 dark:text-red-400`
  * 정보/분석: `text-blue-600 dark:text-blue-400`
  * 보조/비활성: `text-slate-400 dark:text-slate-500`

---

## 5. Monetization & Zero-CLS Layout

### 5.1 Zero-CLS 바운딩 박스 계약 (Cumulative Layout Shift < 0.001)

| 슬롯 식별자 | 적용 포맷 (Format) | 사전 예약 최소 높이 (min-h) | 여백 및 래퍼 규격 | 계약 배치 위치 |
|---|---|---|---|---|
| **Slot 1000000001** | `in-feed` | `min-h-[140px] sm:min-h-[160px]` | `div.w-full.my-6` | 메인 대시보드 거시 지표 피드 내부 |
| **Slot 1000000002 (위치 1)** | `in-feed` | `min-h-[180px] sm:min-h-[220px] md:min-h-[250px]` | `surface-glass-dense rounded-[20px] my-6` | 아파트 상세 모달 Chapter 02 (거래량 회전율) 직후 |
| **Slot 1000000002 (위치 2)** | `in-feed` | `min-h-[180px] sm:min-h-[220px] md:min-h-[250px]` | `surface-glass-dense rounded-[20px] my-6` | 아파트 상세 모달 Chapter 05 (주담대 LDI) 직후 |
| **범용 배너 / 사각형** | `rectangle` | `min-h-[250px]` | `div.w-full.flex.justify-center` | 사이드바 및 인라인 리포트 피드 |
| **가로 스트립 배너** | `horizontal-strip`| `min-h-[90px] sm:min-h-[100px]` | `div.w-full.my-4` | 모달 최하단 또는 모바일 고정 바 |

### 5.2 히어로 2열 대칭 지오메트리 보존 불변식
- 메인 대시보드 상단 2열 레이아웃:
  * 좌측: 자산 배분 도넛 차트 및 4대 핵심 KPI 카드
  * 우측: 거시 시계열 분석 차트 (`MacroTrendChart.tsx`)
  * 높이 불변식: 데스크톱 뷰포트(1024px, 1280px, 1920px)에서 좌우 컬럼 높이 편차 $\Delta H = [0, \pm 0, \text{px}]$ (`lg:h-[566px]`) 영구 보존

### 5.3 직관적 네이티브 카드 및 1st-Party 대체 아키텍처
- 과잉 연산형 위젯(복잡한 멀티스텝 바이럴 게이트, 화면 가림형 팝업) 배제
- 실거래가 조회, 단지 비교, 주담대 감응도 분석 등 실제 사용자 탐색 동선 내에 자연스럽게 녹아드는 단일 네이티브 카드 설계
- 애드블록(AdBlock) 감지 시 1:1 대체 뷰:
  * 표면: `bg-slate-50 dark:bg-slate-900`
  * 경계선: `border border-slate-200 dark:border-slate-800`
  * 텍스트: Slate 중립 텍스트 및 Blue/Emerald 단일 직관적 CTA 텍스트 링크
  * 비표준 오렌지색 배지(`bg-orange-100`, `text-orange-700`) 및 점멸 애니메이션 전면 금지
- 개발/테스트 모드 플레이스홀더: Slate 기반의 정갈한 디버그 가이드라인 박스 표준화

---

## 6. Migration Matrix & Guardrail Policy

### 6.1 레거시 클래스 1:1 치환 매핑표 (Migration Matrix)

| 기존 레거시 클래스 패턴 | 정규 표준 클래스 (치환 후) | 분류 및 사유 |
|---|---|---|
| `bg-zinc-950`, `bg-neutral-900` | `bg-slate-950` | 무채색 베이스 Slate 단일화 |
| `bg-zinc-900`, `bg-neutral-800` | `bg-slate-900` | 카드/모달 서피스 단일화 |
| `bg-zinc-100`, `bg-neutral-100` | `bg-slate-100` | 인풋/서브 서피스 단일화 |
| `border-zinc-200`, `border-neutral-200` | `border-slate-200` | 기본 보더 단일화 |
| `border-zinc-800`, `border-neutral-800` | `border-slate-800` | 다크모드 기본 보더 단일화 |
| `text-zinc-900`, `text-neutral-900` | `text-slate-900` | 메인 텍스트 단일화 |
| `text-zinc-600`, `text-neutral-600` | `text-slate-600` | 서브 텍스트 단일화 |
| `text-zinc-400`, `text-neutral-400` | `text-slate-400` | 뮤트 텍스트 단일화 |
| `bg-teal-600`, `bg-teal-500` | `bg-emerald-600` | 1차 브랜드 컬러 단일화 |
| `text-teal-600`, `text-teal-700` | `text-emerald-700` | 1차 브랜드 텍스트 단일화 |
| `border-teal-200`, `border-teal-500` | `border-emerald-200` | 1차 브랜드 보더 단일화 |
| `bg-teal-50` | `bg-emerald-50` | 브랜드 서피스 단일화 |
| `bg-rose-50`, `bg-rose-100` | `bg-red-50` | 음수/경고 서피스 Calibrated Red 단일화 |
| `text-rose-600`, `text-rose-700` | `text-red-700` | 음수/경고 텍스트 Calibrated Red 단일화 |
| `border-rose-200`, `border-rose-300` | `border-red-200` | 음수/경고 보더 Calibrated Red 단일화 |
| `bg-orange-50`, `bg-amber-50` | `bg-slate-100` 또는 `bg-emerald-50` | 난색 배경 배제 및 시맨틱 채널 전환 |
| `text-orange-600`, `text-amber-600` | `text-slate-700` 또는 `text-emerald-700` | 난색 텍스트 배제 및 정규 채널 전환 |
| `border-orange-200`, `border-amber-200` | `border-slate-200` 또는 `border-emerald-200` | 난색 보더 배제 및 정규 채널 전환 |
| `bg-indigo-600`, `bg-sky-600` | `bg-blue-600` | 2차 데이터 액션 컬러 단일화 |
| `text-indigo-600`, `text-sky-600` | `text-blue-700` | 2차 데이터 텍스트 단일화 |
| `border-indigo-200`, `border-sky-200` | `border-blue-200` | 2차 데이터 보더 단일화 |
| `bg-purple-*`, `bg-pink-*`, `bg-violet-*` | `bg-slate-100` 또는 `bg-blue-50` | 과채도 악센트 전면 배제 |

### 6.2 정적 검증 가드레일 정책 (Static Guardrail Policy)
- 정적 검증 테스트 스위트: `frontend/src/__tests__/design_system_guardrails.challenger.test.ts`
- 검증 불변식 항목:
  1. `frontend/src/components/` 및 `frontend/src/app/` 내 유니코드 서브 이모티콘 검출 건수 `[0, ±0, 건]`
  2. `frontend/src/components/` 내 금지 무채색(`zinc`, `neutral`, `stone`, `gray`) 클래스 검출 건수 `[0, ±0, 건]`
  3. `frontend/src/components/` 내 비표준 난색(`orange`, `amber`, `purple`, `pink`, `violet`, `neon`) 클래스 검출 건수 `[0, ±0, 건]`
  4. Core Web Vitals $CLS < 0.001$ 및 슬롯 1000000001, 1000000002 `min-h` 사전 예약 선언 무결성 검증
  5. TypeScript 정적 타입 컴파일(`tsc --noEmit`) 에러 `0건` 및 Next.js 프로덕션 빌드 성공 불변식 유지
