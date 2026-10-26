# DVIEW Design System Specification (v5.0 — "Ad Money" Toss Pure Financial Canvas & Soft-Surface Isomorphism)

> **Single Source of Truth (SSOT)**: 본 문서는 DVIEW(디뷰) 프론트엔드 아키텍처의 공식 디자인 시스템인 **Ad Money (애드 머니 v5.0)**의 명세서입니다. **Ad Money** 디자인 시스템의 최상위 존재 목적은 단순한 심미적 구성을 넘어 **구글 애드센스 수익률(Google AdSense Monetization Yield — RPM, eCPM, CTR, Active Viewability, High-CPC 전환율)을 극대화**하는 것입니다.

---

## 0. Ultimate Design Purpose: Google AdSense Yield Maximization (디자인 시스템의 최상위 목적)

**Ad Money (애드 머니)** 디자인 시스템의 모든 시각적 요소(보더리스 단일 캔버스, 소프트 서피스 동형화, 헤어라인 구분선, 컬러 토큰, 고정 바운딩 박스)는 다음의 애드센스 수익 방정식을 극대화하기 위한 **수익 공학(Monetization Engineering) 도구**로 작동합니다:

$$\text{Max } \mathcal{Y}_{\text{AdSense}} = \sum_{s \in \text{Slots}} \Big[ \text{PV} \times \text{AdDensity}(s) \times \text{Viewability}(s) \times \text{CTR}(s) \times \text{CPC}(s) \times (1 - \text{AdBlockRate}) \Big] + \text{Yield}_{\text{NativeCPA}}$$

모든 UI/UX 설계와 컴포넌트 수정은 **"이 디자인이 시각적 분절감을 없애 체류 시간(PV/Viewability)을 늘리고, 배너 맹목성(Banner Blindness)을 낮춰 광고 클릭률(CTR)을 높이며, 고단가 금융·부동산 광고주(High-CPC)의 입찰 가치와 수익 전환을 극대화하는가?"**를 최우선 기준으로 삼습니다.

---

## 1. Core Design Concepts of "Ad Money v5.0" (애드 머니 5대 핵심 디자인 컨셉)

### 1.1 Toss Pure Financial Canvas (토스증권형 보더리스 단일 캔버스 — 몰입감 & 체류 시간 극대화)
- 기존의 무거운 외곽 라운디드 테두리 박스(`border`, `shadow`)와 반투명 블러(글래스모피즘)가 만드는 단절·분절감을 전면 제거하고, 페이지 전체를 **단일 화이트 캔버스(`#ffffff`, Dark: `#101013`)**로 통합합니다.
- 좌측 실거래 비중 도넛차트(`AptDonutSection`)와 우측 아파트 시세 추이 그래프(`MacroChartSection`), 하단 실거래 타임라인 및 랭킹 섹션은 외곽 박스 테두리 없이 **`1px solid #f2f4f6` (Dark: `#202027`) 헤어라인 구분선과 여백**만으로 유기적으로 연결되어 장시간 탐색 몰입도를 극대화합니다.

### 1.2 Soft-Surface Content-Ad Isomorphism (소프트 서피스 콘텐츠-광고 동형화 — 배너 맹목성 차단 & CTR 극대화)
- 만약 콘텐츠는 모두 흰 바탕에 실선으로만 두고 **광고 슬롯에만 회색 배경(`#f9fafb`)**을 깔면, 사용자는 곧바로 *"배경이 깔린 블록 = 광고"*라고 학습하여 배너 맹목성(Banner Blindness)이 발생합니다.
- 이를 원천 차단하기 위해 사용자가 가장 빈번하게 클릭하는 **핵심 인터랙티브 블록(도넛 하단 4대 핵심 지표·대표 실거래 카드 `AptMetricCards`, 상단 금융 퀵 액션 바, 교통·인프라 인사이트 콜아웃)**과 **인피드 광고/CPA 슬롯(`AdSlot`, `MidFeedAdBanner`, `RankingBreakAdBanner`)**에 동일한 **보더리스 소프트 서피스(`bg-[#f9fafb] hover:bg-[#f2f4f6] dark:bg-[#17171c] dark:hover:bg-[#202027] rounded-2xl`, 테두리·그림자 없음)**를 1:1로 동형화합니다.
- 사용자는 `#f9fafb` 소프트 서피스 블록을 **"클릭하면 유용한 상세 리포트와 금융 계산기가 열리는 핵심 알짜 영역"**으로 인지하게 되어 광고 주목도와 클릭률(CTR)이 극대화됩니다.

### 1.3 High-CPC Financial Trust Psychology (고단가 금융·자산 신뢰 컬러 심리학 — CPC & 전환율 극대화)
- 주택담보대출, 대환대출, 양도세·취득세 절세, 부동산 밸류에이션 등 **고단가(High-CPC) 금융 광고주 섹터**의 브랜드 톤앤매너와 가장 완벽하게 부합하는 **Toss Action Blue (`#3182f6` / `#2563eb`)**와 **Value Emerald (`#059669` / `#10b981`)**, **Bullish Up Red (`#f04452`)**를 핵심 시맨틱 컬러로 사용합니다.
- 자극적이거나 산만한 난색·과채도 유채색을 전면 배제하고 **토스 잉크 스케일(`#191f28` ~ `#8b95a1`)**을 유지함으로써, 전문 금융 터미널 수준의 신뢰감을 부여해 고단가 금융 광고 및 CPA 캠페인의 클릭 전환율을 높입니다.

### 1.4 Zero-CLS Bounding Box Contract ($\text{CLS} < 0.001$ — 정책 준수 및 유효 수익 보호)
- 비동기 광고 로드 과정에서 발생하는 레이아웃 시프트(Layout Shift)는 사용자의 오클릭(Accidental Click)을 유발하여 구글 애드센스 무효 트래픽 감점 및 단가 하락(Smart Pricing)의 원인이 됩니다.
- 모든 차트, 히어로 2열 대칭 레이아웃(`lg:h-[566px]`, $\Delta H = 0\text{px}$), 광고 슬롯(`AdSlot`)은 마운트 전부터 포맷별 물리적 최소 높이를 사전 예약하고 GPU 가속 Shimmer 스켈레톤을 렌더링하여 **$\text{CLS} < 0.001$을 보장하고 광고 계정의 품질 점수와 유효 CPC를 보호**합니다.

### 1.5 Zero-Leakage Fallback Continuity (수익 누수 0% 폴백 연속성)
- 애드블록(`isAdBlockActive`) 환경이나 애드센스 입찰 미채결(Unfilled) 발생 시에도 빈 공간이나 깨진 박스를 노출하지 않고, 동일한 `#f9fafb` 소프트 서피스 규격의 **1st-Party 고단가 CPA 네이티브 카드**를 즉시 렌더링하여 모든 방문 트래픽을 빈틈없이 수익으로 전환합니다.

---

## 2. Color System & High-CPC Theme Palette (토스 퓨어 파이낸셜 캔버스 팔레트)

### 2.1 Base Seamless Canvas & Ink Palette
- **Light Mode**:
  - Unified Body & Section Canvas (`--bg-body`, `--bg-surface`): `#ffffff` (단일 보더리스 화이트 캔버스)
  - Interactive Soft Surface (`--bg-elevated`): `#f9fafb` / Hover `#f2f4f6` (핵심 지표 카드, 금융 퀵 바, 네이티브 광고/CPA 동형 표면)
  - Hairline Divider (`--border-color`, `--border-hairline`): `#f2f4f6` (섹션 및 리스트 행을 나누는 미세 구분선)
  - Primary Ink (`--text-primary`): `#191f28` (토스 차콜 잉크 — 타이틀 및 핵심 가격 숫자)
  - Secondary Ink (`--text-secondary`): `#4e5968` (본문 및 보조 레이블)
  - Tertiary Ink (`--text-tertiary`): `#8b95a1` (단위, 날짜, 캡션)
- **Dark Mode (`.dark`)**:
  - Unified Body & Section Canvas (`--bg-body`, `--bg-surface`): `#101013` (Deep Financial Terminal Charcoal)
  - Interactive Soft Surface (`--bg-elevated`): `#17171c` / Hover `#202027`
  - Hairline Divider (`--border-color`, `--border-hairline`): `#202027`
  - Primary Ink (`--text-primary`): `#f9fafb` (`slate-50`)
  - Secondary Ink (`--text-secondary`): `#cbd5e1` (`slate-300`)
  - Tertiary Ink (`--text-tertiary`): `#94a3b8` (`slate-400`)

### 2.2 Brand & Semantic Accent Tokens
1. **Primary Brand & High-CPC Action Theme (Toss Blue — `#3182f6` / `blue-600`)**:
   - `--brand-primary`: `#3182f6` (Hover: `#1b64da`)
   - `--brand-primary-light`: `#e8f3ff` (Dark: `rgba(49, 130, 246, 0.16)`)
2. **Positive / Safe / Valuation & CPA Accent (Value Emerald — `emerald-600`)**:
   - `--brand-green`: `#059669` (Dark: `#10b981`, Light Tint: `#ecfdf5`)
   - 안전 진단(`SAFE`), 국평 평균가, 도넛 차트 핵심 섹터 및 긍정 가치 시그널에 사용합니다.
3. **Alert / New High / Upward Surge (Toss Up Red — `#f04452`)**:
   - `--brand-red`: `#f04452` (Dark: `#ff5c6a`, Light Tint: `#ffeeee`)
   - 신고가 경신(`신고가`), 상승 변동률(`+`), 전세 위험 경고(`DANGER`)에 사용합니다.

### 2.3 Prohibited Color Tokens (사용 금지 색상)
- 시선을 분산시키고 금융 신뢰감 및 광고 주목도를 저해하는 비표준 난색 및 과채도 유채색 클래스 사용을 전면 금지합니다:
  - **금지 목록**: `pink-*`, `purple-*`, `fuchsia-*`, `violet-*`, `indigo-*`, `yellow-*`, `orange-*`, `amber-*`, `rose-*`, `teal-*`, `cyan-*`, `sky-*`, `green-*`, `zinc-*`, `neutral-*`, `stone-*`, `gray-*`

---

## 3. Ad Money v5.0 Layout & Surface Archetypes

### 3.1 Seamless Canvas Section (메인 데이터 섹션 — 보더리스 헤어라인 구획)
- **규격**: 외곽 박스 테두리(`border`)와 그림자(`shadow`) 없이 `bg-transparent` 또는 `bg-surface` 단일 캔버스 위에 배치하며, 인접 섹션과는 `border-b border-[#f2f4f6] dark:border-[#202027]` 또는 `lg:border-r lg:border-[#f2f4f6] dark:lg:border-[#202027]` 헤어라인으로만 구분합니다.

### 3.2 Interactive Soft-Surface Block (핵심 지표 · 금융 바 · 네이티브 광고 1:1 동형 블록)
- **규격**: `bg-[#f9fafb] hover:bg-[#f2f4f6] dark:bg-[#17171c] dark:hover:bg-[#202027] rounded-2xl transition-colors` (외곽 `border` 및 `shadow` 무적용 원칙)
- **적용 대상**:
  - 도넛 하단 4대 핵심 지표 및 대표 실거래 4건 카드 (`AptMetricCards`)
  - 상단 금융 퀵 액션 바 4종 버튼 (`hero-finance-quick-bar`)
  - 교통·인프라 소식 콜아웃 (`TrafficNoticeBoard`)
  - 인피드 광고 슬롯 및 네이티브 CPA 폴백 카드 (`AdSlot`, `MidFeedAdBanner`, `RankingBreakAdBanner`)

### 3.3 Soft Segmented Pill Track & Filter Chips (토스증권형 소프트 컨트롤 — 동심원 기하학)
- **SSOT 모듈**: [`frontend/src/lib/design-system/controls.ts`](frontend/src/lib/design-system/controls.ts) 및 [`frontend/src/app/globals.css`](frontend/src/app/globals.css) (`@layer components`)
- **동심원 곡률 규칙 (Concentric Radius)**: 외곽 트랙 `rounded-[10px]` ($R_{\text{outer}} = 10\text{px}$) - 내부 패딩 `p-[3px]` ($P = 3\text{px}$) = 내부 버튼 `rounded-[7px]` ($R_{\text{inner}} = 7\text{px}$)
- **세그먼트 트랙 (`getToggleTrackClass`)**: `dview-toggle-track bg-[#f2f4f6] dark:bg-[#202027] p-[3px] rounded-[10px] gap-0.5` (`grid` 전달 시 `inline-flex` 자동 생략으로 반응형 그리드 완벽 호환)
  - Active (`getToggleBtnClass(true)`): `bg-surface dark:bg-[#2c2c35] text-blue-600 dark:text-blue-400 font-black shadow-2xs rounded-[7px]` (또는 `tone: 'emerald' | 'neutral'`)
  - Inactive (`getToggleBtnClass(false)`): `text-secondary hover:text-primary font-extrabold rounded-[7px]`
- **필터 셀렉트 & 칩 (`getControlSelectClass`, `getControlPillClass`)**: 테두리 없이 `bg-elevated hover:bg-[#f2f4f6] dark:bg-[#202027] dark:hover:bg-[#2c2c35] text-secondary hover:text-primary rounded-[10px] h-[34px] sm:h-[36px]`

---

## 4. Typography, Iconography & Real Data Invariants

- **Pretendard Variable Single-Font Discipline & No Legacy Monospace (`GulimChe` / `Consolas` 금지)**:
  - 서비스 전역의 모든 한글·영문·숫자·단위 표기는 로컬 번들 웹폰트인 **Pretendard Variable (`var(--font-pretendard)`, `"Pretendard Variable"`, `Pretendard`)** 단일 서체 체계를 사용합니다.
  - **굴림체(`Gulim`, `GulimChe`), 돋움체(`DotumChe`), 바탕체(`BatangChe`), `Consolas`, `Courier New` 및 브라우저 기본 `ui-monospace` / `monospace` 시스템 고정폭 폴백 폰트의 사용을 전면 금지**합니다.
  - `globals.css`의 `--font-sans`와 `--font-mono` 모두 최상단에 `var(--font-pretendard), "Pretendard Variable"`을 지정하여 어떠한 경우에도 Windows 기본 `Consolas`나 `굴림체`로 폴백되지 않도록 강제합니다.
- **Tabular Numerals (`tabular-nums`)**: 모든 가격, 면적, 비율, 거래량, 순위, 수익률, 날짜 숫자에는 `font-mono` 대신 **`tabular-nums` (`font-variant-numeric: tabular-nums`)**를 적용하여 프리텐다드 서체의 미려함을 유지하면서 숫자 폭을 1px 오차 없이 정렬합니다.
- **Zero-Emoji Policy**: 유니코드 이모티콘을 일체 사용하지 않으며 `lucide-react` SVG 아이콘만 사용하여 전문 금융·부동산 미디어의 품격을 유지합니다.
- **Strict Real Data Only**: 국토교통부 실거래가 등 100% 실제 검증된 공공 데이터만 표시하며, 추정치나 Mock 데이터는 일체 생성하거나 표시하지 않습니다.

---

## 5. AdSense Slot Geometry & Zero-CLS Layout Contracts

### 5.1 Pre-Reserved AdSlot Min-Height Mapping (`getAdSlotMinHeightClass`)
| 슬롯 포맷 (`format`) | 예약 최소 높이 클래스 (`min-height`) | 주요 배치 영역 |
|---|---|---|
| `in-feed` | `min-h-[140px] sm:min-h-[160px]` | 메인 피드 중간, 탐색/뉴스 리스트 인피드 |
| `banner` | `min-h-[250px]` | 단지 상세 모달 챕터 브레이크 배너 |
| `rectangle` | `min-h-[250px]` | MBTI 결과 및 계산기 결과 하단 |
| `horizontal-strip` | `min-h-[90px] sm:min-h-[100px]` | 가로형 띠 배너 및 컴팩트 스트립 |
| `auto` / `undefined` | `min-h-[250px]` | 반응형 기본 슬롯 |

### 5.2 Hero 2-Column Symmetry & 120fps Scroll Invariant
- **Hero Symmetry**: 매크로 대시보드 좌·우 히어로 컬럼은 `lg:h-[566px]`로 대칭 정렬되어 높이 편차($\Delta H = 0\text{px}$)를 엄격히 유지합니다.
- **120fps Scroll Optimization**: 스크롤 진행 중(`body.is-scrolling`)에는 불필요한 `backdrop-filter`와 포인터 이벤트를 일시 억제하여 모바일에서도 끊김 없는 120fps 스크롤과 쾌적한 광고 탐색 경험을 보장합니다.

---

## 6. Global Control & Toggle System (전역 토글·필터 컨트롤 일원화 규격)

서비스 전역(상단 도넛·차트 히어로, 하단 일자별 실거래 타임라인, 5차원 통계 필터바, 실시간 시장 랭킹 보드, 성향 진단·백과사전, 환경 설정 모달, 정책 대출 계산기, 단지 상세 모달 등)에서 파편화된 소형 버튼을 배제하고, Next.js 16 Turbopack + Tailwind CSS v4 캐스케이드 레이어(`@layer components` < `@layer utilities`)와 완벽히 호환되는 **단일 진실 공급원(`src/lib/design-system/controls.ts` + `globals.css`)** 규격을 준수합니다.

| 컨트롤 유형 | TS 헬퍼 및 글로벌 클래스 | 높이 및 동심원 곡률 규격 | 타이포그래피 규격 | 서피스 및 상태 토큰 |
| :--- | :--- | :--- | :--- | :--- |
| **Segmented Toggle Track** | `getToggleTrackClass()`<br>`.dview-toggle-track` | `p-[3px] rounded-[10px] gap-0.5` (외곽 높이 `34~36px`) | - | `bg-[#f2f4f6] dark:bg-[#202027]` (보더리스 소프트 트랙, `grid` 레이아웃 오버라이드 허용) |
| **Segmented Toggle Item (`md` / `sm`)** | `getToggleBtnClass(isActive, opts)`<br>`.dview-toggle-btn` | `md`: `min-h-[28px] sm:min-h-[30px] px-2.5 sm:px-3.5 py-1 rounded-[7px]`<br>`sm`: `min-h-[26px] sm:min-h-[28px] px-2 sm:px-2.5 py-0.5 rounded-[7px]` | `md`: `12px ~ 13px`<br>`sm`: `11px ~ 12px`<br>비활성 `font-extrabold`, 활성 `font-black` | 활성(`blue`): `bg-surface dark:bg-[#2c2c35] text-blue-600 dark:text-blue-400 shadow-2xs`<br>활성(`emerald`): `bg-surface dark:bg-[#2c2c35] text-emerald-600 dark:text-emerald-400 shadow-2xs`<br>활성(`neutral`): `bg-surface dark:bg-[#2c2c35] text-primary shadow-2xs`<br>비활성: `text-secondary hover:text-primary` |
| **Filter Select Dropdown** | `getControlSelectClass()`<br>`.dview-control-select` | `h-[34px] sm:h-[36px] px-2.5 sm:px-3 rounded-[10px]` | `12px ~ 13px`, `font-extrabold` | `bg-elevated hover:bg-[#f2f4f6] dark:bg-[#202027] dark:hover:bg-[#2c2c35] text-secondary hover:text-primary` |
| **Filter Search Input** | `getControlInputClass()`<br>`.dview-control-input` | `h-[34px] sm:h-[36px] pl-8 pr-8 rounded-[10px]` | `12px ~ 13px`, `font-bold` | `bg-elevated dark:bg-[#202027] text-primary focus:bg-surface dark:focus:bg-[#2c2c35] focus:ring-2 focus:ring-blue-600/20` |
| **Filter Action / Chip Pill** | `getControlPillClass(isActive)`<br>`.dview-control-pill` | `h-[34px] sm:h-[36px] px-3 sm:px-3.5 rounded-[10px]` | `12px ~ 13px`, `font-extrabold` | 기본: `bg-elevated hover:bg-[#f2f4f6] dark:bg-[#202027] dark:hover:bg-[#2c2c35] text-secondary hover:text-primary`<br>활성: `bg-blue-600 text-white shadow-2xs` |
