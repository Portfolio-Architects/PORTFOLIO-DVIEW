---
name: dview-design-compliance
description: "디뷰(DVIEW) Ad Money v5.1(토스 퓨어 파이낸셜 캔버스) 디자인 시스템, 소프트 서피스 콘텐츠-광고 동형화, 동심원 컨트롤, Zero-CLS 기하학, Pretendard + tabular-nums 폰트 불변식 및 Copy Diet · SEO 아코디언 규격을 검증하는 표준 스킬입니다. 프론트엔드 UI 컴포넌트 생성·수정, 대시보드·모달·카드·토글 스타일 작업, 문구 압축, 또는 디자인·접근성·CLS 감사 시 반드시 이 스킬을 우선 호출해 적용합니다."
enforces:
  - .agent/rules/DVIEW_DRSP.md
  - .agent/rules/DVIEW_strict-real-data-only.md
  - DVIEW_DESIGN.md
---

# DVIEW Ad Money v5.1 Design Compliance Skill (`dview-design-compliance`)

본 스킬은 [`DVIEW_DESIGN.md`](../../../DVIEW_DESIGN.md)와 [`DVIEW_DRSP.md`](../../rules/DVIEW_DRSP.md)에 정의된 **Ad Money v5.1** 불변식을 프론트엔드 코드에 일관되게 관철하여, 시각적 몰입감(PV·Viewability), 배너 맹목성 제거(CTR), 고단가 금융 신뢰도(CPC) 및 검색엔진 100% SSR 색인을 동시에 달성하기 위한 검증 기준과 코드 SSOT 결합 절차를 정의합니다.

---

## 1. 코드 단일 진실 공급원 (Design-System Code SSOT)

UI 컴포넌트를 작성하거나 수정할 때는 임의의 유틸리티 클래스를 중복 조합하지 않고 아래 4대 SSOT 모듈을 직접 import해 사용합니다.

| 영역 | SSOT 파일 경로 | 필수 사용 헬퍼 / 상수 토큰 |
|:---|:---|:---|
| **전역 토글 · 필터 컨트롤** | [`frontend/src/lib/design-system/controls.ts`](../../../frontend/src/lib/design-system/controls.ts) | `DVIEW_CONTROL_CLASSES`, `getToggleTrackClass`, `getToggleBtnClass`, `getControlSelectClass`, `getControlInputClass`, `getControlPillClass` |
| **카피 다이어트 · 시각 시그널 · SEO 아코디언** | [`frontend/src/lib/design-system/copyDiet.ts`](../../../frontend/src/lib/design-system/copyDiet.ts) | `DVIEW_COPY_BUDGETS`, `SINGLE_CARD_SIGNAL_CAP`, `SEO_FORBIDDEN_CLOAKING_CLASSES`, `checkCopyBudget`, `truncateToCopyBudget`, `getVisualSignalPillClass`, `getSeoAccordionClass`, `getSeoAccordionSummaryClass`, `getSeoAccordionChevronClass`, `getSeoAccordionBodyClass`, `auditSeoSemanticContainer` |
| **광고 슬롯 Zero-CLS 높이 예약** | [`frontend/src/components/ads/core/adSlotGeometry.ts`](../../../frontend/src/components/ads/core/adSlotGeometry.ts) | `getAdSlotMinHeightClass(format)` (`in-feed`, `banner`, `rectangle`, `horizontal-strip`, `auto`) |
| **전역 컬러 · 폰트 · 레이어 스타일** | [`frontend/src/app/globals.css`](../../../frontend/src/app/globals.css) | `--font-pretendard`, `--bg-surface`, `--bg-elevated`, `--border-hairline`, `.dview-toggle-*`, `.dview-seo-accordion*` |

---

## 2. Ad Money v5.1 7대 필수 검증 체크리스트

### 1) 보더리스 단일 캔버스 & 헤어라인 구분선
- 메인 섹션에 무거운 외곽 라운디드 테두리(`border`), 그림자(`shadow-md` 이상), 반투명 글래스모피즘(`backdrop-blur`) 박스 분할을 적용하지 않습니다.
- 페이지 전체를 단일 화이트 캔버스(`#ffffff`, Dark `#101013`)로 통합하고, 인접 섹션과 행은 **`border-[#f2f4f6] dark:border-[#202027]`** 1px 헤어라인과 여백으로만 구분합니다.

### 2) 소프트 서피스 콘텐츠-광고 1:1 동형화 (`#f9fafb`)
- 배너 맹목성(Banner Blindness)을 원천 차단하기 위해 핵심 인터랙티브 블록(`AptMetricCards`, 금융 퀵 액션 바, 교통·인프라 콜아웃)과 광고·CPA 슬롯(`AdSlot`, `MidFeedAdBanner`, `RankingBreakAdBanner`) 모두 동일한 보더리스 소프트 서피스 규격을 유지합니다:
  - 클래스 규격: `bg-[#f9fafb] hover:bg-[#f2f4f6] dark:bg-[#17171c] dark:hover:bg-[#202027] rounded-2xl transition-colors` (외곽 `border` 및 `shadow` 무적용)

### 3) 동심원 곡률 공식 ($R_{\text{outer}} - P = R_{\text{inner}}$)
- 세그먼트 토글은 외곽 트랙 곡률 `rounded-[10px]`($10\text{px}$)에서 내부 패딩 `p-[3px]`($3\text{px}$)을 뺀 내부 버튼 곡률 **`rounded-[7px]`($7\text{px}$)** 공식을 엄수합니다.
- `getToggleTrackClass('grid grid-cols-...')`처럼 그리드 레이아웃 오버라이드 시 `inline-flex`가 자동 생략되어 반응형 그리드와 충돌 없이 동작합니다.

### 4) Zero-CLS 바운딩 박스 ($\text{CLS} < 0.001$) & 히어로 대칭
- 모든 `AdSlot`은 마운트 전부터 포맷별 최소 높이를 예약해야 합니다:
  - `in-feed`: `min-h-[140px] sm:min-h-[160px]`
  - `banner` / `rectangle` / `auto`: `min-h-[250px]`
  - `horizontal-strip`: `min-h-[90px] sm:min-h-[100px]`
- 매크로 대시보드 좌·우 히어로 2열(`AptDonutSection` + `AptMetricCards` vs `MacroChartSection`)은 **`lg:h-[526px]`**($\Delta H = 0\text{px}$) 대칭을 유지합니다.

### 5) 타이포그래피(`Pretendard` + `tabular-nums`) & 아이콘 불변식
- **레거시 고정폭 폰트 전면 금지**: 굴림체(`Gulim`, `GulimChe`), 돋움체(`DotumChe`), 바탕체(`BatangChe`), `Consolas`, `Courier New`, `ui-monospace`, `monospace` 및 `font-mono` 유틸리티를 절대 사용하지 않습니다.
- 모든 텍스트·단위는 **Pretendard Variable (`var(--font-pretendard)`)** 단일 서체를 사용하며, 가격·면적·변동률·순위·거래량·날짜 등 모든 숫자에는 **`tabular-nums`**를 지정해 1px 흔들림 없이 정렬합니다.
- **유니코드 이모티콘 전면 금지**: UI 내 모든 아이콘은 `lucide-react` SVG 컴포넌트로만 렌더링합니다.

### 6) 고단가 금융 시맨틱 컬러 팔레트 & 금지 색상 차단
- **허용 시맨틱 토큰**: Toss Ink(`#191f28` / `#4e5968` / `#8b95a1`), Slate 무채색(`slate-50`~`slate-950`), Toss Action Blue(`#3182f6` / `blue-600`), Value Emerald(`#059669` / `emerald-600`), Toss Up Red(`#f04452`).
- **사용 금지 클래스 및 HEX**: `pink-*`, `purple-*`, `fuchsia-*`, `violet-*`, `indigo-*`, `yellow-*`, `orange-*`, `amber-*`, `rose-*`, `teal-*`, `cyan-*`, `sky-*`, `green-*`, `zinc-*`, `neutral-*`, `stone-*`, `gray-*` (`bg`/`text`/`border`/`ring`/`fill`/`stroke`/`from`/`to`/`via` 전 유틸리티 포함) 및 `#ff8f00`, `#7c3aed`, `#f9ce3f`, `#e1306c`, `#833ab4`.

### 7) Copy Diet & Semantic SEO Dual-Layer (3초 스캔 + 반클로킹 수칙)
- **Layer 1 카피 압축**: 주 화면에서 `~를 계측합니다`, `~를 확인할 수 있습니다`, `~를 제공합니다` 등 서술형 어미와 80자 초과 산문(`<p>`)을 금지합니다 (`DVIEW_COPY_BUDGETS`: `pageH1` 32자, `sectionTitle` 22자, `kpiLabel` 10자, `kpiCaption` 18자, `signalBadge` 10자, `keyTakeaway` 45자, `cardDescription` 50자, `accordionSummary` 30자, `inlineNotice` 80자).
- **단일 카드 밀도 상한선 (`SINGLE_CARD_SIGNAL_CAP = 2`)**: 소프트 서피스 카드 1개에는 **핵심 수치(Hero Metric) 1개 + 보조 시각 시그널(`getVisualSignalPillClass`) 최대 2개**까지만 배치합니다.
- **Layer 2 SSR `<details>` 분리 및 3대 반클로킹 가드 (`auditSeoSemanticContainer`)**:
  1. 장문 해설은 클라이언트 조건부 마운트(`isOpen && ...`) 대신 초기 SSR HTML에 본문이 100% 포함되는 네이티브 `<details className={getSeoAccordionClass()}>` (`getSeoAccordionSummaryClass` / `getSeoAccordionChevronClass` / `getSeoAccordionBodyClass`)로 수용합니다.
  2. 페이지당 유일한 `<h1>`은 반드시 Layer 1 상단에 시각적으로 노출하며, 본문 컨테이너에 `.sr-only`(`<table>` 내부 `<caption>` 및 40자 이하 컨트롤 레이블 제외), `hidden`, `invisible`, `opacity-0`, 화면 밖 음수 좌표 은닉(`SEO_FORBIDDEN_CLOAKING_CLASSES`)을 금지합니다.
  3. **`<details>` 내부에는 어떠한 경우에도 `AdSlot`을 배치하지 않으며**, 마운트 후 스크립트/타이머에 의한 자동 개폐를 금지합니다.

---

## 3. 정적 스캔 및 테스트 검증 절차 (Verification & Exit Criteria)

UI 변경 후 커밋 전 아래 명령을 실행하여 디자인 가드레일 위반이 0건임을 실증합니다.

1. **변경 파일 대상 금지 토큰 빠른 점검 (PowerShell)**:
   ```powershell
   Select-String -Path "frontend/src/<변경경로>" -Pattern "font-mono|ui-monospace|Gulim|Dotum|Batang|Consolas|Courier|#(?:ff8f00|7c3aed|f9ce3f|e1306c|833ab4)\b|(?:bg|text|border|ring|fill|stroke|from|to|via)-(?:pink|purple|fuchsia|violet|indigo|yellow|orange|amber|rose|teal|cyan|sky|green|zinc|neutral|stone|gray)-"
   ```
2. **TypeScript 컴파일 무결성 검사 (에러 0건 필수)**:
   ```powershell
   Set-Location frontend; npx tsc --noEmit
   ```
3. **디자인 시스템 단위 및 적대적 가드레일 테스트 실행**:
   ```powershell
   Set-Location frontend; npx jest src/lib/design-system/controls.test.ts src/lib/design-system/copyDiet.test.tsx src/__tests__/design_system_guardrails.challenger.test.ts
   ```
   (메인·단지 상세 카피 다이어트 변경이 포함된 경우 `src/__tests__/v5_1_home_and_apartment_copy_diet.test.tsx`를 함께 실행합니다.)
