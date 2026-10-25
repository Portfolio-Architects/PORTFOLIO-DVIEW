# DVIEW Design System Specification (v4.0 — "Ad Money" Google AdSense Yield Maximization System)

> **Single Source of Truth (SSOT)**: 본 문서는 DVIEW(디뷰) 프론트엔드 아키텍처의 공식 디자인 시스템인 **Ad Money (애드 머니)**의 명세서입니다. **Ad Money** 디자인 시스템의 최상위 존재 목적은 단순한 심미적 구성을 넘어 **구글 애드센스 수익률(Google AdSense Monetization Yield — RPM, eCPM, CTR, Active Viewability, High-CPC 전환율)을 극대화**하는 것입니다.

---

## 0. Ultimate Design Purpose: Google AdSense Yield Maximization (디자인 시스템의 최상위 목적)

**Ad Money (애드 머니)** 디자인 시스템의 모든 시각적 요소(컬러 토큰, 카드 곡률, 여백 위계, 타이포그래피, 고정 바운딩 박스)는 다음의 애드센스 수익 방정식을 극대화하기 위한 **수익 공학(Monetization Engineering) 도구**로 작동합니다:

$$\text{Max } \mathcal{Y}_{\text{AdSense}} = \sum_{s \in \text{Slots}} \Big[ \text{PV} \times \text{AdDensity}(s) \times \text{Viewability}(s) \times \text{CTR}(s) \times \text{CPC}(s) \times (1 - \text{AdBlockRate}) \Big] + \text{Yield}_{\text{NativeCPA}}$$

모든 UI/UX 설계와 컴포넌트 수정은 **"이 디자인이 체류 시간(PV/Viewability)을 늘리고, 배너 맹목성(Banner Blindness)을 낮춰 광고 클릭률(CTR)을 높이며, 고단가 금융·부동산 광고주(High-CPC)의 입찰 가치와 수익 전환을 극대화하는가?"**를 최우선 기준으로 삼습니다.

---

## 1. Core Design Concepts of "Ad Money" (애드 머니 5대 핵심 디자인 컨셉)

### 1.1 Native Content-Ad Isomorphism (네이티브 콘텐츠-광고 동형화 — CTR 극대화)
- 콘텐츠 섹션과 인피드 광고(`AdSlot`, `MidFeedAdBanner`, `RankingBreakAdBanner`), 고단가 금융 위젯(`PolicyLoanQuickWidget`, `JeonseGuaranteeQuickPreview`, `UnifiedCpaFallbackCard`)의 **외곽 곡률(`rounded-2xl`, `16px`), 테두리(`1px border-slate-200/80`), 카드 배경(`#ffffff`, Dark: `#111827`), 내부 패딩 및 그림자(`shadow-xs`) 규격을 1:1로 동형화**합니다.
- 사용자가 광고를 이질적인 외부 배너로 인식해 무시하는 **배너 맹목성(Banner Blindness)**을 원천 제거하고, 실거래·가치분석 인사이트 카드의 자연스러운 연장선으로 인지하게 만들어 **광고 주목도와 클릭률(CTR)을 극대화**합니다.

### 1.2 High-CPC Financial Trust Psychology (고단가 금융·자산 신뢰 컬러 심리학 — CPC & 전환율 극대화)
- 주택담보대출, 대환대출, 양도세·취득세 절세, 부동산 밸류에이션 등 **고단가(High-CPC) 금융 광고주 섹터**의 브랜드 톤앤매너와 가장 완벽하게 부합하는 **Trust Blue (`#2563eb` / `#3b82f6`)**와 **Value Emerald (`#059669` / `#10b981`)**를 핵심 시맨틱 컬러로 사용합니다.
- 자극적이거나 산만한 난색·과채도 유채색을 전면 배제하고 **정갈한 Slate 무채색 베이스**를 유지함으로써, 사용자에게 프라이빗 뱅킹 및 전문 금융 터미널 수준의 신뢰감을 부여해 **고단가 금융 광고 및 CPA 캠페인의 클릭 전환율**을 높입니다.

### 1.3 Eye-Comfort Dwell-Time Canvas (장기 체류 및 Active Viewability 극대화 캔버스)
- 극단적인 순백색(`#ffffff`) 배경과 무여백 직각 격자(`0px`)는 장시간 시세·실거래 데이터를 탐색할 때 눈부심과 인지 피로를 유발해 이탈률을 높입니다.
- **Ad Money**는 **소프트 슬레이트 캔버스(`#f8fafc`, Dark: `#0b1120`)** 위에 **화이트 엘리베이션 카드(`#ffffff`, Dark: `#111827`)**를 배치하여 장시간 열람 시에도 눈의 피로도를 낮춥니다.
- 이를 통해 사용자의 평균 체류 시간(9분+)과 인당 페이지뷰(PV)를 연장하고, 콘텐츠 카드 사이의 시선 정류장(Visual Stopping Point)에 배치된 광고 슬롯의 **Active View 가시성($\ge 75\%$)과 30초 스마트 리프레시 노출 효율**을 극대화합니다.

### 1.4 Zero-CLS Bounding Box Contract ($\text{CLS} < 0.001$ — 정책 준수 및 유효 수익 보호)
- 비동기 광고 로드 과정에서 발생하는 레이아웃 시프트(Layout Shift)는 사용자의 오클릭(Accidental Click)을 유발하여 구글 애드센스 무효 트래픽 감점 및 단가 하락(Smart Pricing)의 원인이 됩니다.
- 모든 차트, 히어로 2열 대칭 레이아웃(`lg:h-[566px]`, $\Delta H = 0\text{px}$), 광고 슬롯(`AdSlot`)은 마운트 전부터 포맷별 물리적 최소 높이를 사전 예약하고 GPU 가속 Shimmer 스켈레톤을 렌더링하여 **$\text{CLS} < 0.001$을 보장하고 광고 계정의 품질 점수와 유효 CPC를 보호**합니다.

### 1.5 Zero-Leakage Fallback Continuity (수익 누수 0% 폴백 연속성)
- 애드블록(`isAdBlockActive`) 환경이나 애드센스 입찰 미채움(Unfilled) 발생 시에도 빈 공간이나 깨진 박스를 노출하지 않고, 동일한 **Ad Money** 카드 규격의 **1st-Party 고단가 CPA 네이티브 카드**를 즉시 렌더링하여 모든 방문 트래픽을 빈틈없이 수익으로 전환합니다.

---

## 2. Color System & High-CPC Theme Palette (트러스트 블루 & 아이컴포트 슬레이트)

대중적인 호감도와 금융·부동산 플랫폼 신뢰도가 가장 높은 **Trust Blue (`#2563eb` / `#3182f6`)**를 메인 테마 컬러로 사용하며, 장시간 탐색에도 눈이 편안하고 광고 주목도를 높이는 명도 대비를 유지합니다.

### 2.1 Base Eye-Comfort Palette (Slate Spectrum)
- **Light Mode**:
  - Body Background (`--bg-body`): `#f8fafc` (`slate-50` — 눈부심을 방지하고 체류 시간을 늘리는 소프트 캔버스)
  - Card Surface (`--bg-surface`): `#ffffff` (콘텐츠 및 네이티브 광고 카드를 또렷하게 부각하는 표면)
  - Elevated / Control Track (`--bg-elevated`): `#f1f5f9` (`slate-100`)
  - Soft Border (`--border-color`): `#e2e8f0` (`slate-200/80`)
  - Primary Text (`--text-primary`): `#0f172a` (`slate-900`)
  - Secondary Text (`--text-secondary`): `#475569` (`slate-600`)
  - Tertiary Text (`--text-tertiary`): `#64748b` (`slate-500`)
- **Dark Mode (`.dark`)**:
  - Body Background (`--bg-body`): `#0b1120` (Deep Eye-Comfort Navy Slate)
  - Card Surface (`--bg-surface`): `#111827` / `#0f172a` (`slate-900`)
  - Elevated / Control Track (`--bg-elevated`): `#1e293b` (`slate-800`)
  - Soft Border (`--border-color`): `#1e293b` (`slate-800/80`)
  - Primary Text (`--text-primary`): `#f8fafc` (`slate-50`)
  - Secondary Text (`--text-secondary`): `#cbd5e1` (`slate-300`)
  - Tertiary Text (`--text-tertiary`): `#94a3b8` (`slate-400`)

### 2.2 Brand & Semantic Accent Tokens
1. **Primary Brand & High-CPC Action Theme (Trust Blue — `blue-600`)**:
   - `--brand-primary`: `#2563eb` (Dark: `#3b82f6`)
   - `--brand-primary-hover`: `#1d4ed8` (Dark: `#60a5fa`)
   - `--brand-primary-light`: `#eff6ff` (Dark: `rgba(59, 130, 246, 0.16)`)
2. **Positive / Safe / Valuation & CPA Accent (`emerald-600`)**:
   - 안전 진단(`SAFE`), 국평 평균가, 고단가 금융 보조 액션 및 긍정 가치 시그널에 사용합니다.
3. **Alert / New High / Upward Surge (`red-500` / `red-600`)**:
   - 신고가 경신(`신고가`), 상승 변동률(`+`), 전세 위험 경고(`DANGER`)에 사용합니다.

### 2.3 Prohibited Color Tokens (사용 금지 색상)
- 시선을 분산시키고 금융 신뢰도 및 광고 주목도를 저해하는 비표준 난색 및 과채도 유채색 클래스 사용을 전면 금지합니다:
  - **금지 목록**: `pink-*`, `purple-*`, `fuchsia-*`, `violet-*`, `indigo-*`, `yellow-*`, `orange-*`, `amber-*`, `rose-*`, `teal-*`, `cyan-*`, `sky-*`, `green-*`, `zinc-*`, `neutral-*`, `stone-*`, `gray-*`

---

## 3. Ad Money Card & Control Archetypes

### 3.1 Ad Money Native Card Container (콘텐츠 섹션 및 네이티브 광고 동형 컨테이너)
- **규격**: `bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-xs`
- 내부 보조 요약 블록이나 리스트 행은 중복 그림자 없이 `bg-slate-50/80 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700/60` 또는 부드러운 헤어라인 디바이더(`divide-y divide-slate-100 dark:divide-slate-800/70`)로 정돈합니다.

### 3.2 Ad Money Segmented Pill Track (소프트 세그먼트 컨트롤)
- **외곽 트랙**: `inline-flex items-center bg-slate-100/90 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60`
- **내부 버튼**:
  - Active: `bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-extrabold shadow-xs rounded-lg` (또는 강조형 `bg-blue-600 text-white rounded-lg shadow-xs`)
  - Inactive: `text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg`

---

## 4. Typography, Iconography & Real Data Invariants

- **Tabular Numerals**: 모든 가격, 면적, 비율, 거래량, 순위, 수익률 숫자에 `tabular-nums`를 적용하여 데이터 가독성을 높입니다.
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
