# DVIEW Design System Specification (v3.1 — Ad-Astra Soft Modernism & AdSense Yield Optimization)

> **Single Source of Truth (SSOT)**: 본 문서는 DVIEW(디뷰) 프론트엔드 아키텍처의 공식 디자인 시스템 명세서입니다. 애드-아스트라(Ad-Astra) 모더니즘의 깔끔한 정량 데이터 위계를 계승하되, **장시간 열람 시 눈의 피로도를 낮추는 아이컴포트(Eye-Comfort) 캔버스**와 **애드센스(AdSense) 및 고단가 금융(CPC/CPA) 수익률을 극대화하는 소프트 모더니즘 카드 아키텍처**를 결합합니다.

---

## 1. Design Philosophy: Soft Modernism & AdSense Yield Engineering

1. **Eye-Comfort Soft Canvas (장기 체류를 위한 시각적 편안함)**:
   - 극단적인 순백색(`#ffffff`) 배경과 무여백 직각 격자(`0px`)는 장시간 시세·실거래 데이터를 탐색할 때 눈부심과 인지 피로를 유발해 체류 시간(Dwell Time)을 단축시킵니다.
   - 이를 해결하기 위해 **은은한 소프트 슬레이트 배경(`#f8fafc`, Dark: `#0b1120`)** 위에 **깨끗한 화이트 소프트 카드(`#ffffff`, Dark: `#111827`, `rounded-2xl`, `border-slate-200/80`, `shadow-xs`)**를 배치하여, 과도한 글래스모피즘 블러 없이도 눈이 편안하게 쉬어갈 수 있는 시선 정류장(Visual Stopping Point)을 제공합니다.
2. **AdSense & High-CPC Native Blending (애드센스 수익률 & CTR 극대화)**:
   - 콘텐츠 섹션들이 편안한 `16px`(`rounded-2xl`) 곡률과 `1px` 소프트 보더 카드로 그룹화되면, 피드 중간에 배치된 인피드 광고(`MidFeedAdBanner`, `RankingBreakAdBanner`)와 고단가 금융 위젯(`PolicyLoanQuickWidget`, `JeonseGuaranteeQuickPreview`)이 이질적인 배너가 아닌 **네이티브 정보 카드**로 자연스럽게 동화되어 광고 가시성(Viewability)과 클릭률(CTR)이 극대화됩니다.
3. **Zero-CLS Geometry ($\text{CLS} < 0.001$)**:
   - 모든 차트, KPI 그리드, 광고 슬롯(`AdSlot`)은 마운트 전후 동일한 바운딩 박스를 유지하여 오클릭을 방지하고 쾌적한 스크롤 경험을 보장합니다.

---

## 2. Color System & Universal Theme Palette (아이컴포트 트러스트 블루 & 소프트 슬레이트)

대중적인 호감도와 금융·부동산 플랫폼 신뢰도가 가장 높은 **Trust Blue (`#2563eb` / `#3182f6`)**를 메인 테마 컬러로 사용하며, 장시간 봐도 눈이 시리지 않은 채도와 명도 대비를 유지합니다.

### 2.1 Base Eye-Comfort Palette (Slate Spectrum)
- **Light Mode**:
  - Body Background (`--bg-body`): `#f8fafc` (`slate-50` — 눈부심을 방지하는 소프트 캔버스)
  - Card Surface (`--bg-surface`): `#ffffff` (콘텐츠 및 네이티브 광고를 또렷하게 받쳐주는 카드 표면)
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
1. **Primary Brand Theme (Comfortable Trust Blue — `blue-600`)**:
   - `--brand-primary`: `#2563eb` (Dark: `#3b82f6`)
   - `--brand-primary-hover`: `#1d4ed8` (Dark: `#60a5fa`)
   - `--brand-primary-light`: `#eff6ff` (Dark: `rgba(59, 130, 246, 0.16)`)
2. **Positive / Safe / Valuation Accent (`emerald-600`)**:
   - 안전 진단(`SAFE`), 국평 평균가, 보조 금융 액션 및 긍정 시그널에 사용합니다.
3. **Alert / New High / Upward Surge (`red-500` / `red-600`)**:
   - 신고가 경신(`신고가`), 상승 변동률(`+`), 전세 위험 경고(`DANGER`)에 사용합니다.

### 2.3 Prohibited Color Tokens (사용 금지 색상)
- 눈의 피로를 유발하는 비표준 난색 및 과채도 유채색 클래스 사용을 전면 금지합니다:
  - **금지 목록**: `pink-*`, `purple-*`, `fuchsia-*`, `violet-*`, `indigo-*`, `yellow-*`, `orange-*`, `amber-*`, `rose-*`, `teal-*`, `cyan-*`, `sky-*`, `green-*`, `zinc-*`, `neutral-*`, `stone-*`, `gray-*`

---

## 3. Soft Modernist Card & Control Archetypes

### 3.1 Soft Modernist Card Container (기본 섹션 및 네이티브 광고 컨테이너)
- **규격**: `bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-xs`
- 내부 보조 요약 블록이나 리스트 행은 중복 그림자 없이 `bg-slate-50/80 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700/60` 또는 부드러운 헤어라인 디바이더(`divide-y divide-slate-100 dark:divide-slate-800/70`)로 정돈합니다.

### 3.2 Soft Segmented Pill Track (소프트 세그먼트 컨트롤)
- **외곽 트랙**: `inline-flex items-center bg-slate-100/90 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60`
- **내부 버튼**:
  - Active: `bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-extrabold shadow-xs rounded-lg` (또는 강조형 `bg-blue-600 text-white rounded-lg shadow-xs`)
  - Inactive: `text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg`

---

## 4. Typography, Iconography & Real Data Invariants

- **Tabular Numerals**: 모든 가격, 면적, 비율, 거래량, 순위 숫자에 `tabular-nums`를 적용합니다.
- **Zero-Emoji Policy**: 유니코드 이모티콘을 일체 사용하지 않으며 `lucide-react` SVG 아이콘만 사용합니다.
- **Strict Real Data Only**: 국토교통부 실거래가 등 100% 실제 검증된 공공 데이터만 표시하며, 추정치나 Mock 데이터는 일체 생성하거나 표시하지 않습니다.
