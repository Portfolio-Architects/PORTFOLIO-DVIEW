# Project: D-VIEW Major Revamp

## Architecture
D-VIEW is a Next.js 16 (React 19, Turbopack, Tailwind CSS v4) hyper-local proptech platform for Dongtan New Town. This major revamp transitions the application from a competition-oriented Techno Valley vacancy dashboard to a consumer-centric real estate intelligence platform featuring:
1. **Clean Navigation & Safe Route Retirement**: Decommissioning `/technovalley` and office search with zero-404 server redirects, slimming client bundles by removing heavy unneeded modules from the main bundle tree.
2. **Interactive Housing MBTI & Viral Quiz**: A 7-question lifestyle diagnostic quiz, 16 curated Dongtan landmark apartment profiles, 4-temperament encyclopedia browsing, Recharts radar charts, Kakao/SNS viral sharing, and dynamic OpenGraph image generation.
3. **Monetization Engine (Google AdSense)**: `next/script` injection keyed on `NEXT_PUBLIC_ADSENSE_CLIENT_ID`, zero-CLS responsive `AdSlot` components with shimmer skeletons, ad-blocker fallback promos, and dev placeholders.
4. **Core Apartment Feature Preservation & Verification**: 100% preservation of 179 apartment complexes, historical transaction data, price trend graphs, valuation metrics, financial calculators, and full test suite pass rate.

```
                  ┌───────────────────────────────┐
                  │          Root Layout          │
                  │  (next/script AdSense + OG)   │
                  └──────────────┬────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   LoungeHeader   │    │    MobileDock    │    │  Redirect Guard  │
│  (3-tab: 랩/탐색/ │    │  (3-tab: 랩/탐색/ │    │ (/technovalley   │
│   단지 MBTI)     │    │   단지 MBTI)     │    │  -> / via 307)   │
└──────────────────┘    └──────────────────┘    └──────────────────┘
         │                       │
         └───────────┬───────────┘
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
┌──────────────────┐    ┌──────────────────┐
│  Apartment Core  │    │  MBTI Platform   │
│  (Feed, Charts,  │    │ (/mbti, Quiz,    │
│   Modals, Calc)  │    │  16 Profiles,    │
│  + AdSlot Banner │    │  Catalog, OG)    │
└──────────────────┘    └──────────────────┘
```

---

## Feature Inventory
Every feature identified in the survey is assigned to a milestone:

| # | Feature | Description | Milestone | Source |
|---|---|---|---|---|
| F1 | Navigation Overhaul | Replace `technovalley` & `office` tabs with `단지 MBTI` (`/mbti`) in `LoungeHeader` & `MobileDock` | M1 | Survey 1 |
| F2 | Route Redirection | Add 307 server redirects for `/technovalley`, `/techno`, and `tab=office` in `next.config.ts` | M1 | Survey 1 |
| F3 | Page Level Redirection | Replace `src/app/technovalley/page.tsx` with server `redirect('/')` | M1 | Survey 1 |
| F4 | Dashboard Decoupling | Remove `OfficeExplorerClient` dynamic import & office section from `DashboardClient.tsx` | M1 | Survey 1 |
| F5 | Navigation Test Sync | Update `HeaderDockSync.test.tsx` and challenger tests to match the 3-tab navigation contract | M1 | Survey 1 |
| F6 | Sitemap & Feed Cleanup | Update `sitemap.ts` to include `/mbti` and sanitize feed badges | M1 | Survey 1 |
| F7 | MBTI Domain Types | Declare `MbtiType`, `MbtiApartmentProfile`, `QuizQuestion`, `RadarMetrics` in `src/types/mbti.ts` | M2 | Survey 2 |
| F8 | 16 MBTI Dataset | Author rich 16 Dongtan apartment curation profiles in `src/lib/data/mbtiData.ts` | M2 | Survey 2 |
| F9 | Quiz Diagnostic Engine | 7-question lifestyle/housing diagnostic quiz with scoring in `src/lib/utils/mbtiScoring.ts` | M2 | Survey 2 |
| F10 | MBTI Quiz UI Stepper | Smooth 60fps 7-question stepper component (`MBTIQuizStepper.tsx`) | M2 | Survey 2 |
| F11 | MBTI Result Screen | Matched apartment card, 5-axis radar chart, reasoning, CTA to `ApartmentModal` (`MBTIResultView.tsx`) | M2 | Survey 2 |
| F12 | MBTI Encyclopedia View | 16-type catalog with 4-temperament filter tabs (`MBTIEncyclopedia.tsx`) | M2 | Survey 2 |
| F13 | Viral Share System | KakaoTalk SDK share, 2-tier clipboard copy with toast in `src/lib/utils/kakaoShare.ts` | M2 | Survey 2 |
| F14 | Dynamic OG Image Route | Add `type === 'mbti'` in `src/app/api/og/route.tsx` for 1200x630 card generation | M2 | Survey 2 |
| F15 | MBTI Route Pages | Create `src/app/mbti/page.tsx` and `src/app/mbti/[type]/page.tsx` with SSR metadata | M2 | Survey 2 |
| F16 | AdSense Script Injection | Root layout script injection via `next/script` `strategy="afterInteractive"` in `src/app/layout.tsx` | M3 | Survey 3 |
| F17 | AdSense Env Documentation| Add `NEXT_PUBLIC_ADSENSE_CLIENT_ID` documentation in `frontend/.env.example` | M3 | Survey 3 |
| F18 | Zero-CLS AdSlot Component | Reusable `AdSlot.tsx` with fixed min-heights, skeleton shimmer, dev placeholder, and SPA push guard | M3 | Survey 3 |
| F19 | Ad-Blocker Fallback Promo | Integration with `useAdBlockDetector` to show tasteful cross-promotions when blocked | M3 | Survey 3 |
| F20 | Ad Placement Integration | Insert responsive `AdSlot` into Feed stream, MBTI Result view, and `ApartmentModal` | M3 | Survey 3 |
| F21 | TypeScript Verification | Full compilation with 0 errors via `npx tsc --noEmit` | M4 | Survey 3 |
| F22 | Test Suite Verification | All unit, integration, and regression test suites passing (100% Green) | M4 | Survey 3 |
| F23 | Production Build Verification | `npm run build` completes successfully with all static/dynamic routes generated | M4 | Survey 3 |
| F24 | Core Feature Hardening | Verify 0% regression on apartment transactions, charts, modals, and dongs | M4 | Survey 3 |
| F25 | Objective Function Re-anchoring | Re-anchor system & agent ultimate objective function to AdSense Yield Maximization ($\mathcal{Y}_{\text{AdSense}}$) | M5 | User Request |
| F26 | High-CPC Intent Matrix | Semantic alignment of 5 domains to high-CPC advertisers ($1.50~$5.00+ CPC) | M5 | User Request |
| F27 | Active Viewability Engine | Active View > 75% protocol, Zero-CLS container reservation, 30s smart refresh | M5 | User Request |
| F28 | 10-Cycle Recursive Self-Improvement | Execute 10+ cycles of self-improvement documented in `IMPROVEMENT_REPORT.md` | M5 | User Request |

---

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| M1 | Navigation & Technovalley Cleanup | F1, F2, F3, F4, F5, F6 | none | DONE |
| M2 | MBTI Recommendation & Viral Quiz Platform | F7, F8, F9, F10, F11, F12, F13, F14, F15 | M1 (interface contract defined) | DONE |
| M3 | Google AdSense Integration & Responsive Ad Slots | F16, F17, F18, F19, F20 | M2 (for result placement) | DONE |
| M4 | Build Integrity, Verification & Hardening | F21, F22, F23, F24 | M1, M2, M3 | DONE |
| M5 | AdSense Yield Maximization & 10-Cycle Self-Improvement | F25, F26, F27, F28 | M1, M2, M3, M4 | DONE |

---

## Interface Contracts

### M1 ↔ M2 (Navigation & Routing Contract)
- **Route Path**: `/mbti` (hub), `/mbti/[type]` (direct viral result).
- **Navigation Tab Identifier**: `id: 'mbti'`, `label: '단지 MBTI'`, `href: '/mbti'`, `icon: Sparkles`.
- **Active Tab State in DashboardClient**: `'overview' | 'imjang' | 'lounge' | 'mbti'`.
- **Header & Dock Sync**:
  ```typescript
  export const TABS = [
    { id: 'overview', label: '아파트 랩', href: '/' },
    { id: 'imjang', label: '아파트 탐색', href: '/explore' },
    { id: 'mbti', label: '단지 MBTI', href: '/mbti' },
  ];
  ```

### M2 ↔ M3 (Ad Placement Contract in MBTI Result View)
- `src/components/ads/AdSlot.tsx` props:
  ```typescript
  export interface AdSlotProps {
    slotId?: string;
    format?: 'in-feed' | 'banner' | 'rectangle' | 'horizontal-strip' | 'auto';
    responsive?: boolean;
    className?: string;
    testMode?: boolean;
    fallbackType?: 'mbti-promo' | 'dashboard-promo' | 'minimal';
  }
  ```
- MBTI Result View will mount:
  ```tsx
  <AdSlot format="banner" className="my-6 max-w-xl mx-auto" fallbackType="minimal" />
  ```

### M2 ↔ Existing Core (Apartment Data Contract)
- MBTI profiles map directly to existing normalized apartment keys:
  ```typescript
  import { normalizeAptName, findTxKey } from '@/lib/utils/apartmentMapping';
  import { APARTMENTS_BY_DONG } from '@/lib/apartment-data';
  import { TX_SUMMARY } from '@/lib/transaction-summary';
  ```
- Clicking "실거래 상세 리포트" in MBTI card dispatches the existing custom event or modal hash: `#apt=${encodeURIComponent(aptName)}`.

---

## Code Layout
- `src/app/layout.tsx`: Root layout with AdSense `<Script>` injection.
- `src/app/technovalley/page.tsx`: 307 server redirect to `/`.
- `src/app/mbti/page.tsx`: MBTI quiz and encyclopedia hub page.
- `src/app/mbti/[type]/page.tsx`: MBTI viral result page with SSR OpenGraph tags.
- `src/app/api/og/route.tsx`: Dynamic OpenGraph 1200x630 image generator.
- `src/components/LoungeHeader.tsx`: Desktop top navigation bar.
- `src/components/pwa/MobileDock.tsx`: Mobile bottom navigation dock.
- `src/components/DashboardClient.tsx`: Client-side tab coordinator.
- `src/components/mbti/*`: MBTI UI components (Container, Stepper, ResultView, Encyclopedia, RadarChart, ShareButtons).
- `src/components/ads/AdSlot.tsx`: Zero-CLS responsive AdSense slot component.
- `src/lib/data/mbtiData.ts`: 16 MBTI curated apartment datasets.
- `src/lib/utils/mbtiScoring.ts`: 7-question lifestyle scoring algorithm.
- `src/lib/utils/kakaoShare.ts`: Kakao SDK viral share and clipboard fallback.
- `src/types/mbti.ts`: MBTI domain type definitions.
- `next.config.ts`: Next.js routing, redirects, headers, and security policies.
- `frontend/.env.example`: AdSense environment variable documentation.
