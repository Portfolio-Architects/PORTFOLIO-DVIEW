# DVIEW Design System Specification (v5.1 — "Ad Money" Toss Pure Financial Canvas, Visual-First Copy Diet & Semantic SEO Dual-Layer)

> **Single Source of Truth (SSOT)**: 본 문서는 DVIEW(디뷰) 프론트엔드 아키텍처의 공식 디자인 시스템인 **Ad Money (애드 머니 v5.1)**의 명세서이며, 에이전트 행동 강령([`DVIEW_AGENT.md`](./DVIEW_AGENT.md)) 및 응답·폰트 프로토콜([`.agent/rules/DVIEW_DRSP.md`](./.agent/rules/DVIEW_DRSP.md))과 상호 연계됩니다. **Ad Money** 디자인 시스템의 최상위 존재 목적은 단순한 심미적 구성을 넘어 **직관적 시각 탐색 경험(3-Second Visual Scan)과 구글 검색 노출(100% SSR Semantic Indexing)을 동시에 달성하여 구글 애드센스 수익률(Google AdSense Monetization Yield — RPM, eCPM, CTR, Active Viewability, High-CPC 전환율)을 극대화**하는 것입니다.

---

## 0. Ultimate Design Purpose: Google AdSense Yield Maximization (디자인 시스템의 최상위 목적)

**Ad Money (애드 머니)** 디자인 시스템의 모든 시각적 요소(보더리스 단일 캔버스, 소프트 서피스 동형화, 헤어라인 구분선, 컬러 토큰, 고정 바운딩 박스)는 다음의 애드센스 수익 방정식을 극대화하기 위한 **수익 공학(Monetization Engineering) 도구**로 작동합니다:

$$\text{Max } \mathcal{Y}_{\text{AdSense}} = \sum_{s \in \text{Slots}} \Big[ \text{PV} \times \text{AdDensity}(s) \times \text{Viewability}(s) \times \text{CTR}(s) \times \text{CPC}(s) \times (1 - \text{AdBlockRate}) \Big] + \text{Yield}_{\text{NativeCPA}}$$

모든 UI/UX 설계와 컴포넌트 수정은 **"이 디자인이 시각적 분절감을 없애 체류 시간(PV/Viewability)을 늘리고, 배너 맹목성(Banner Blindness)을 낮춰 광고 클릭률(CTR)을 높이며, 고단가 금융·부동산 광고주(High-CPC)의 입찰 가치와 수익 전환을 극대화하는가?"**를 최우선 기준으로 삼습니다.

---

## 1. Core Design Concepts of "Ad Money v5.1" (애드 머니 6대 핵심 디자인 컨셉)

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
- 모든 차트, 히어로 2열 대칭 레이아웃(`lg:h-[526px]`, $\Delta H = 0\text{px}$), 광고 슬롯(`AdSlot`)은 마운트 전부터 포맷별 물리적 최소 높이를 사전 예약하고 GPU 가속 Shimmer 스켈레톤을 렌더링하여 **$\text{CLS} < 0.001$을 보장하고 광고 계정의 품질 점수와 유효 CPC를 보호**합니다.

### 1.5 Zero-Leakage Fallback Continuity (수익 누수 0% 폴백 연속성)
- 애드블록(`isAdBlockActive`) 환경이나 애드센스 입찰 미채결(Unfilled) 발생 시에도 빈 공간이나 깨진 박스를 노출하지 않고, 동일한 `#f9fafb` 소프트 서피스 규격의 **1st-Party 고단가 CPA 네이티브 카드**를 즉시 렌더링하여 모든 방문 트래픽을 빈틈없이 수익으로 전환합니다.

### 1.6 Visual-First Copy Diet & Semantic SEO Dual-Layer (글자 수 상한선 · 시각 시그널 우선 · SEO 시맨틱 분리 — 인지 피로도 제거 & 검색 유입·체류 수익 동시 극대화)
- 화면 전반에 장문 해설 텍스트가 과밀해지면 사용자의 인지 피로도가 급증해 조기 이탈($\downarrow \text{PV}$, $\downarrow \text{Viewability}$)이 발생하고, `#f9fafb` 소프트 서피스 블록의 행동 유도 주목도($\downarrow \text{CTR}$)가 희석됩니다.
- 이를 근본적으로 해결하기 위해 페이지를 **Layer 1 (Visual Decision Canvas — 3초 안에 스캔되는 수치·차트·시각 시그널 중심 주 화면)**과 **Layer 2 (Semantic SEO Archive — 초기 SSR HTML에 100% 수록되는 네이티브 `<details>` 아코디언 · 시맨틱 `<table>` · JSON-LD 구조화 데이터)**로 엄격히 이원화합니다.
- 사용자는 불필요한 줄글 없이 직관적인 시각 시그널로 핵심 가치를 즉시 파악하고, 구글 검색봇(Googlebot 모바일 우선 인덱싱)은 불법 클로킹 없이 100% 색인 가중치를 부여받아 **사용자 친화성과 검색 유입·광고 수익률을 동시에 극대화**합니다.

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

## 3. Ad Money v5.1 Layout & Surface Archetypes

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

### 3.4 Progressive SEO Disclosure Accordion (네이티브 `<details>` 기반 시맨틱 아코디언 블록)
- **SSOT 모듈**: [`frontend/src/lib/design-system/copyDiet.ts`](frontend/src/lib/design-system/copyDiet.ts) 및 [`frontend/src/app/globals.css`](frontend/src/app/globals.css) (`@layer components`)
- **규격**: 외곽 `<details className="group dview-seo-accordion">` (`bg-[#f9fafb] dark:bg-[#17171c] rounded-2xl overflow-hidden`, 외곽 `border`·`shadow` 무적용) + 헤더 `<summary className="dview-seo-accordion-summary">` (최소 높이 `48px`, 기본 브라우저 삼각형 마커 및 모바일 탭 하이라이트 제거, `[open]` 시 `group-open:text-primary` 전환, 우측 `lucide-react` `ChevronDown` `.dview-seo-accordion-chevron` `[open]` 시 `180deg` 회전 및 `group-open:text-brand` 전환) + 본문 `<div className="dview-seo-accordion-body">` (`border-t border-[#f2f4f6] dark:border-[#202027]`).
- **적용 대상**: 밸류에이션 산출 방법론, 단지별 입지·학군·임장 정성 평가 산문, 스트레스 DSR·세무 가정 해설, FAQ 및 롱테일 분석 브리핑 등 **구글 크롤러 색인에는 필수적이나 주 화면 스캔을 방해하는 80자 초과 텍스트 블록 전량**.

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
- **Hero Symmetry**: 매크로 대시보드 좌·우 히어로 컬럼은 `lg:h-[526px]`(`AptDonutSection` `360px` + `gap-3.5` `14px` + `AptMetricCards` `152px`)로 대칭 정렬되어 높이 편차($\Delta H = 0\text{px}$)를 엄격히 유지합니다.
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

---

## 7. Copy Diet, Visual-First Signal & Semantic SEO Dual-Layer Specification (글자 수 상한선 · 시각 시그널 우선 · SEO 아코디언/시맨틱 분리 규칙)

본 섹션은 화면 내 정보 과밀로 인한 텍스트 비대화(Text Bloat)를 원천 차단하고, **사용자에게는 3초 안에 직관적으로 읽히는 시각 대시보드**를 제공하면서 **구글 검색엔진(Googlebot)에는 100% 손실 없는 시맨틱 색인 데이터**를 공급하기 위한 단일 진실 공급원(`frontend/src/lib/design-system/copyDiet.ts` + `frontend/src/app/globals.css`) 규격입니다.

### 7.1 Copy Diet Budgets (컴포넌트별 글자 수 상한선 및 체언·수치 종결 원칙)

1. **서술형 어미 제거 및 명사·수치 종결 원칙 (Zero Verbose Predicate Rule)**:
   - Layer 1(주 화면) 내 타이틀, 서브타이틀, 카드 레이블, 배지, 인사이트 요약에서는 `~를 계측합니다`, `~를 산출하여 진단합니다`, `~를 확인할 수 있습니다`, `~를 제공합니다` 등 장문 서술어를 전면 금지하고 **`[핵심 지표/명사] + [실제 수치·단위] + [상태/변동 시그널]`** 구조로 압축합니다.
2. **고유명사 중복 생략 원칙 (Entity De-duplication Rule)**:
   - 페이지 최상위 `<h1>`에 이미 단지명(실제 단지 데이터 최장 22자, 예: `동탄역 시범 금강펜테리움 센트럴파크 3차` · `tx-summary` 키 최장 21자 `산척동동탄호수공원금강펜테리움센트럴파크2`)이나 권역명이 명시된 경우, **Layer 1(주 화면)** 하위 `<h2>`·`<h3>`·카드 타이틀에는 동일한 단지명을 반복 삽입하지 않습니다. 검색엔진 패시지 인덱싱(Passage Indexing)을 위한 `{단지명} + 세부 키워드` 문맥 결합은 `<h1>`, JSON-LD, `<table>` 내부 `<caption className="sr-only">`, 그리고 **Layer 2 `<details>` 아코디언 본문**에서 전담합니다.
3. **데이터 출처 단일 표기 원칙 (Single Attribution Rule)**:
   - `국토교통부 실거래가 공개시스템 공식 데이터 기반`과 같은 출처 문구는 페이지 상단 배지 또는 하단 시맨틱 푸터에 **페이지당 단 1회**만 표기하며, 개별 카드마다 반복 기재를 금지합니다.
4. **컴포넌트 슬롯별 글자 수·줄 수 상한선 (`DVIEW_COPY_BUDGETS`, 공백 포함 한국어 그래핌 기준)**:

| 슬롯 키 (`CopySlotType`) | 대상 UI 요소 | 글자 수 상한선 (`maxChars`) | 최대 줄 수 (`maxLines`) | 표준 말줄임 토큰 | 작성 기준 (`[금지]` -> `[권장]`) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `pageH1` | 페이지 대표 타이틀 (`h1`, Layer 1) | **32자** | `2줄` (데스크톱 `1줄`) | `line-clamp-2 sm:line-clamp-1` | `[금지]` `동탄역시범우남퍼스트빌 아파트 실거래가 및 입지 심층 분석 리포트` (35자)<br>`[권장]` `동탄역롯데캐슬 실거래 · 입지` (16자, 최장 22자 단지명 결합 시 31자) |
| `sectionTitle` | 섹션 타이틀 (`h2`, Layer 1 단지명 생략) | **22자** | `1줄` | `truncate` | `[금지]` `동탄역롯데캐슬 주택담보대출 상환 시뮬레이션 및 스트레스 DSR 진단` (37자)<br>`[권장]` `주담대 상환 · DSR 한도 진단` (18자) |
| `sectionSubtitle` | 섹션 보조 리드 카피 (자명하면 생략) | **40자** | `1줄` | `line-clamp-1` | `[금지]` `국토교통부 실거래가 공개시스템 공식 데이터 기반 동탄 1·2신도시 시세 분석 리포트` (46자)<br>`[권장]` `국토부 매매·전월세 실거래 매일 자동 동기화` (24자) |
| `kpiLabel` | KPI · 핵심 지표 카드 레이블 | **10자** | `1줄` | `whitespace-nowrap truncate` | `[금지]` `최근 1개월 실거래 평균 매매가격` (18자)<br>`[권장]` `1개월 평균 매매` (9자) |
| `kpiCaption` | KPI 카드 보조 변동·비교 캡션 | **18자** | `1줄` | `truncate` | `[금지]` `전월 대비 실거래 평균가가 3.2% 상승했습니다` (26자)<br>`[권장]` `+3.2% · 전월 대비` (13자) |
| `signalBadge` | 상태 · 등급 · 시그널 배지 (`Pill`) | **10자** | `1줄` | `whitespace-nowrap` | `[금지]` `전세가율 안전 구간 진입` (13자)<br>`[권장]` `전세 안전 68%` (9자) |
| `keyTakeaway` | 핵심 인사이트 불릿 (섹션당 최대 3개) | **45자** | `2줄` | `line-clamp-2` | `[금지]` `동탄역 500m 이내 초역세권 단지는 2km 외곽 단지 대비 높은 프리미엄을 기록 중입니다.` (51자)<br>`[권장]` `동탄역 500m 이내 평당가가 2km+ 외곽 대비 +67.4% 높음` (37자) |
| `cardDescription` | 가이드 · 권역 · 탐색 카드 요약문 | **50자** | `2줄` | `line-clamp-2` | `[금지]` `청계동 대장 아파트 두 곳의 평형별 실거래 가격 차이와 전세가율 및 학군을 상세히 비교해 드립니다.` (55자)<br>`[권장]` `청계동 대장 2개 단지의 84㎡ 실거래 격차·전세가율·배정초 1:1 비교` (40자) |
| `accordionSummary` | Layer 2 SEO 아코디언 헤더 (`<summary>`) | **30자** | `1줄` | `truncate` | `[금지]` `이 단지의 상세한 실거래 밸류에이션 산출 근거와 입지 분석 리포트 펼쳐보기` (41자)<br>`[권장]` `밸류에이션 산출 기준 · 입지 해설 더보기` (23자) |
| `inlineNotice` | 불가피한 기준·산식 각주 (Layer 1) | **80자** | `2줄` | `line-clamp-2` | `[금지]` `본 대출 상환액 계산 결과는 원금 6억 원 및 30년 만기 원리금균등상환과 연 4.0% 금리를 가정하여 산출한 참고용 수치이므로 실제 금융기관 심사 한도를 별도로 확인하실 수 있습니다.` (103자)<br>`[권장]` `원금 6억·30년 만기·금리 4.0% 기준 시뮬레이션이며 차주별 한도는 상이함` (43자) |
| `layer1ProseParagraph` | Layer 1 주 화면 장문 해설 문단 (`<p>`) | **0자 (배치 금지)** | `0줄` | Layer 2 이관 | `[금지]` `주 화면 카드 내부에 80자 초과 산문 문단 직접 노출`<br>`[권장]` Layer 1에서는 시각 시그널·표로 치환하고 원문은 Layer 2 `<details>`로 분리 |

---

### 7.2 Visual Signal First Matrix (3초 스캔 법칙 및 산문 -> 시각 시그널 1:1 치환 규격)

> **3-Second Visual Scan Rule**: 수치·비율·방향·거리·등급으로 표현 가능한 정보는 절대 줄글 문장으로 서술하지 않고, **숫자(`tabular-nums`) + 시맨틱 컬러 칩 + 마이크로 게이지/아이콘**으로 즉시 치환합니다 (표준 레퍼런스: `AptMetricCards`의 `동 · 34평`, `06.30`, `14.5억` 마이크로 포맷).

1. **데이터 카드 3단 시각 위계 (3-Tier Card Micro-Hierarchy)**:
   - **1순위 — Hero Metric**: `18px ~ 24px font-black text-primary tabular-nums` (가격·비율·점수 등 핵심 결론 숫자)
   - **2순위 — Semantic Signal Pill (`getVisualSignalPillClass`)**: 방향성·안전도·핵심 스펙 칩 (`up`: `bg-brand-red-light text-brand-red`, `down`: `bg-brand-blue-light text-brand-blue`, `safe`: `bg-brand-green-light text-brand-green`, `neutral`: `bg-[#f2f4f6] dark:bg-[#202027] text-secondary` — `#f9fafb` 소프트 서피스 카드 내부에서도 명도 대비가 확보되는 트랙 서피스 토큰 사용)
   - **3순위 — Micro Label**: `11px ~ 12px font-bold text-tertiary` (10자 이내 보조 레이블)
   - **단일 카드 밀도 상한선**: 소프트 서피스 카드 1개 내부에는 **핵심 수치 1개 + 보조 시그널 최대 2개**까지만 배치합니다.

2. **5대 산문 -> 시각 시그널 1:1 치환 매트릭스**:

| 정보 유형 | 기존의 장문 서술 방식 (배제 대상) | 표준 시각 시그널 치환 규격 (필수 적용) | 허용 시맨틱 토큰 (`lucide-react` + Color) |
| :--- | :--- | :--- | :--- |
| **가격·거래 변동률** | "전월 대비 실거래 평균가가 5,000만 원(3.4%) 상승하며 강세를 기록 중입니다." | `TrendingUp` 아이콘 + `+3.4% (+0.5억)` `Delta Pill` (`tabular-nums`) | 상승(`up`): `#f04452` / `#ffeeee`<br>하락(`down`): `#3182f6` / `#e8f3ff`<br>보합(`neutral`): `#4e5968` / `#f2f4f6` (Dark: `#202027`) |
| **전세가율·DSR 안전도** | "전세가율이 68% 수준으로 실수요 지지력이 견고하며 반환보증 안전 구간입니다." | `68%` 대표 숫자 + `h-1.5 rounded-full` 3단계 게이지 바 + `안전` 배지 | 안전(`safe`): `#059669` (`emerald-600`)<br>적정(`down`/`blue`): `#3182f6` (`blue-600`)<br>주의(`up`/`red`): `#f04452` |
| **역세권·학군 도보 거리** | "단지에서 GTX-A 동탄역까지 약 420m 거리로 도보 약 6분이 소요됩니다." | `TrainFront` / `GraduationCap` 아이콘 + `동탄역 420m · 도보 6분` 단일 스펙 칩 | `bg-[#f2f4f6] dark:bg-[#202027] text-secondary tabular-nums` |
| **단지·권역 1:1 우열 비교** | 두 단지의 평당가·세대수·입지 차이를 3~4문장 줄글로 비교 서술 | 좌우 대칭 스플릿 비교 바 또는 컴팩트 시맨틱 `<table>` 우위 셀 강조 | 우위 항목: `text-emerald-600 dark:text-emerald-400 font-black` |
| **시계열 추세·분위수** | "최근 6개월간 거래량이 꾸준히 증가하며 동탄 상위 10% 시세를 형성합니다." | 인라인 미니 스파크라인 SVG + `상위 10%` `safe` 시그널 칩 | `stroke="#3182f6"` 또는 `#059669` + `bg-brand-green-light` |

---

### 7.3 Semantic SEO Dual-Layer & Native `<details>` Accordion Rules (SEO 아코디언 및 시맨틱 분리 규칙)

사용자 화면의 텍스트 다이어트와 구글 검색 상위 노출(E-E-A-T, 롱테일 키워드, Featured Snippet)을 동시에 달성하기 위해 모든 페이지를 **2계층 시맨틱 분리 아키텍처(Dual-Layer Semantic Architecture)**로 설계합니다.

1. **Layer 1 (Visual Decision Canvas) vs Layer 2 (Semantic SEO Archive) 역할 분리**:
   - **Layer 1 (상단 주 탐색 흐름)**: 인터랙티브 차트, 도넛, 4대 KPI 카드, 실시간 랭킹/타임라인, 수치 중심 비교 `<table>`, 그리고 고유효 `AdSlot`만 배치합니다. 80자를 초과하는 해설 산문 배치를 금지합니다.
   - **Layer 2 (하단 시맨틱 분리 영역)**: 밸류에이션 방법론 해설, 단지별 입지·학군·임장 정성 분석, 스트레스 DSR·세무 가정 설명, FAQ, 내부 링크 브리핑 허브는 삭제하지 않고 **주 인터랙션 하단의 시맨틱 섹션 및 네이티브 `<details>` 아코디언**에 구조화하여 수용합니다.

2. **SSR Native `<details>` / `<summary>` 아코디언 크롤링 계약 (`getSeoAccordionClass`)**:
   - **Zero-JS SSR 본문 보존**: `useState` 기반 클라이언트 조건부 렌더링(`isOpen && <div>...</div>`)은 초기 서버 HTML에서 본문이 누락되므로 SEO 텍스트 용도로 사용을 금지합니다. 반드시 **서버 컴포넌트(SSR)가 초기 HTML에 `<details className="group dview-seo-accordion">` 내부 텍스트 전체를 렌더링**하도록 구현합니다.
   - **구글 모바일 우선 인덱싱(Mobile-First Indexing) 100% 호환**: 표준 HTML5 `<details>` 디스클로저 요소는 사용자 클릭 한 번으로 즉시 열람 가능한 정식 UI 패턴이므로, 기본 접힘(`open` 미지정, 높이 `48px~52px` 슬림 바) 상태로 두어도 Googlebot이 숨김 텍스트 페널티 없이 본문 전체를 100% 색인합니다.

3. **Machine-First Semantic Offloading (비산문 시맨틱 채널 우선 이관)**:
   - 화면에 줄글로 풀어쓰던 검색 정보는 우선적으로 다음 3대 구조화 채널로 이관합니다:
     1. **JSON-LD 구조화 데이터 (`application/ld+json`)**: `Dataset`, `FAQPage`, `Article`, `BreadcrumbList`, `ApartmentComplex` 스키마에 상세 정의·수치·질의응답을 수록하여 구글 리치 결과 및 AI 검색 인용을 확보합니다.
     2. **시맨틱 데이터 테이블 (`<table>` + `<th scope="col|row">` + `<caption className="sr-only">`)**: 평형별 실거래가, 상환 방식 비교, 단지 스펙 비교는 문장 대신 표준 `<table>` 셀에 배치하여 인간 스캔 속도와 구글 표 스니펫 추출률을 동시에 높입니다.
     3. **동적 메타데이터 (`generateMetadata` + `/api/og`)**: 실제 최신 실거래가·전세가율·지역 키워드는 `<title>`, `<meta name="description">`, 정규화 Canonical URL에서 처리하고 본문 상단 키워드 반복을 제거합니다.

4. **3대 절대 안전장치 (Anti-Cloaking · AdSense Zero-Width 방어 · Zero-CLS 수칙 — `auditSeoSemanticContainer`)**:
   - **수칙 A — 불법 클로킹(Cloaking) 절대 금지**:
     - 페이지 내 유일한 `<h1>`은 반드시 Layer 1 상단에 모든 뷰포트에서 시각적으로 노출되어야 하며(접힌 `<details>` 내부 격리 및 모바일 `hidden` 은닉 금지), `<h1>`~`<h6>`, `<p>`, `<section>`, `<article>`, `<div>`, `<ul>`, `<ol>`, `<dl>` 등 SEO 본문 컨테이너에 `.sr-only`(`!sr-only`), `hidden`(`!hidden`), `invisible`, `opacity-0`, `text-[0px]`, `aria-hidden="true"`, 인라인 은닉 스타일(`display:none`, `visibility:hidden`, `opacity:0`, `font-size:0`), 화면 밖 음수 좌표(`-left-[9999px]` 등)를 적용하는 행위를 엄격히 금지합니다. `.sr-only`는 오직 `<table>` 내부의 `<caption className="sr-only">` 및 40자 이내의 간결한 인라인 컨트롤 접근성 레이블 용도로만 허용합니다.
   - **수칙 B — `<details>` 아코디언 내부 `AdSlot` 배치 절대 금지**:
     - `<details>` 디스클로저 내부에는 어떠한 경우에도 `AdSlot`(`<ins class="adsbygoogle">`, `[data-testid="ad-slot-container"]`)을 배치하지 않습니다 (마운트 시 `availableWidth=0` 애드센스 `TagError` 발생 및 Active Viewability 급락 원천 차단). 모든 광고 슬롯은 반드시 `<details>` 외부의 항상 노출되는 Layer 1 예약 영역(`min-height` 보장)에만 배치합니다.
   - **수칙 C — 사용자 주도 개폐 및 Zero-CLS 유지 ($\text{CLS} < 0.001$)**:
     - `<details>` 아코디언의 열림/닫힘은 오직 사용자의 명시적 클릭·키보드 조작(User-Initiated Interaction)에 의해서만 동작해야 하며, 마운트 직후 타이머나 스크립트로 자동 개폐하여 레이아웃 시프트를 유발하는 행위를 금지합니다.
