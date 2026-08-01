# Handoff Report: DVIEW Mobile UI Refactoring - Feed & Card Abstraction Strategy (Explorer 3)

## Executive Summary
Comprehensive investigation of real estate card renders, transaction feeds, timeline items, and apartment item lists across the entire DVIEW application reveals **no unified component abstraction (`AptCard`, `TransactionCard`) is currently used**. Card rendering is fragmented and duplicated inline across multiple key client components (`MacroDashboardClient.tsx`, `AptRow.tsx`, `ChopoomaCuration.tsx`, `HotComplexRanking.tsx`, `GapInvestmentExplorer.tsx`, `OfficeExplorerClient.tsx`). To satisfy Requirement 3 (R3: 100% UI consistency across all feed components), a unified 3-phase refactoring strategy centered around a shared `AptCard` & `TransactionCard` component library is proposed.

---

## 1. Observation

Direct observations from codebase inspection across `frontend/src`:

1. **`MacroDashboardClient.tsx`** (`frontend/src/components/MacroDashboardClient.tsx`):
   - Lines 386–517: Defines `TimelineItemCard` as a local `React.memo` function component inside `MacroDashboardClient.tsx`.
   - Layout: Renders apartment name, dong, price, area, floor, `type === 'high'` pulse badge ("신고가"), delta change badge ("▲/▼"), and details button.
   - Price formatting: Duplicates `formatEokWithUnit` (lines 305–315), `formatGapPrice` (lines 317–323), and `formatDeltaPrice` (lines 325–335).

2. **`TossApartmentExploreClient.tsx` & `AptRow.tsx`** (`frontend/src/components/explore/AptRow.tsx`):
   - Lines 87–253: Defines `AptRow` inside `components/explore/AptRow.tsx`.
   - Layout: Renders rank badge (styled per index), apartment name, `InteractiveHeart`, dong tag, year built tag, household tag, camera photo count tag, likes count tag, horizontal summary chips (pyeong price, jeonse, 3-month volume/turnover), right metric (total price / pyeong price / ratio / turnover / views), and '상세 분석' button.

3. **`ChopoomaCuration.tsx`** (`frontend/src/components/ChopoomaCuration.tsx`):
   - Lines 305–366: Duplicates real estate card layout inline using raw `button`/`div` elements.
   - Layout: Card displays apartment name, dong, household count, closeness badge ("초인접 학군" / "안심 통학"), elementary school distance highlight box with a progress bar (`dist`m, walk time), and price/jeonse average comparison row.

4. **`HotComplexRanking.tsx`** (`frontend/src/components/HotComplexRanking.tsx`):
   - Lines 286–320: Duplicates real estate transaction card layout inline using raw `button`/`div` elements.
   - Layout: Grid cards displaying transaction date badge, apartment name, dong, latest price in Eok (`latestPriceEok`), area label, and floor.

5. **`GapInvestmentExplorer.tsx`** (`frontend/src/components/GapInvestmentExplorer.tsx`):
   - Lines 43–246: Defines `GapComplexCard` as a local `React.memo` function component inside `GapInvestmentExplorer.tsx`.
   - Layout: Displays apartment name, dong, household count, grade badge ("🔥 S등급" / "✅ A등급" / "⚠️ B등급"), stability score, gap investment highlight box with jeonse rate progress bar, sales/jeonse average row, and 3-risk diagnosis collapsible drawer (reverse jeonse, liquidity, price volatility).

6. **`OfficeExplorerClient.tsx`** (`frontend/src/components/OfficeExplorerClient.tsx`):
   - Lines 306–356: Defines `OfficeBuildingCard` as a local `React.memo` function component inside `OfficeExplorerClient.tsx`.
   - Layout: Displays rank badge, building name, type tag, drive-in tag, description, total units, vacancy rate, rent per pyeong, and details button.

7. **Existing Tests (`TimelineItemCardRender.test.tsx`)**:
   - `frontend/src/components/TimelineItemCardRender.test.tsx` (lines 11–58): Extracts `TimelineItemCard`, `formatEokWithUnit`, and `formatDeltaPrice` dynamically from `MacroDashboardClient.tsx` via regex string matching to run memoization re-render tests.

---

## 2. Logic Chain

1. **Premise 1**: Each page/curation currently implements its own card layout, HTML hierarchy, Tailwind CSS class definitions, and price formatting functions independently.
2. **Premise 2**: Visual inconsistencies are widespread:
   - Container border radii differ: `rounded-xl` (`MacroDashboardClient`), `rounded-2xl` (`AptRow`, `ChopoomaCuration`, `HotComplexRanking`), `rounded-[20px]` (`GapInvestmentExplorer`).
   - Hover and transition styles differ (`hover:bg-slate-50`, `hover:scale-[1.01]`, `hover-tilt-card`, `hover:shadow-md`).
   - Price formatting is re-implemented in 4 separate files (`MacroDashboardClient.tsx`, `TossApartmentExploreClient.tsx`, `ChopoomaCuration.tsx`, `GapInvestmentExplorer.tsx`).
   - Tag chips (dong, yearBuilt, household, badges) use varying background opacity and font sizes (`text-[9px]` to `text-[12px]`).
3. **Premise 3**: Requirement 3 (R3) mandates 100% UI consistency across all feed components.
4. **Conclusion**: Continuing with local, inline card components will make maintaining R3 UI consistency impossible as new feeds or curations are added. Refactoring requires extracting shared card components (`AptCard`, `TransactionCard`) and shared formatting utilities into a unified directory (`src/components/cards/`).

---

## 3. Caveats

- **Test Coupling Caveat**: `TimelineItemCardRender.test.tsx` currently relies on regex extraction from `MacroDashboardClient.tsx`. When refactoring `TimelineItemCard` into a standalone `TransactionCard` or `AptCard`, `TimelineItemCardRender.test.tsx` must be updated to import directly from the new component path instead of regex matching `MacroDashboardClient.tsx`.
- **Custom Content Slots**: Curation components (such as `ChopoomaCuration` with school distance gauges and `GapInvestmentExplorer` with risk drawers) require slot/prop extensions (e.g. `highlightBox`, `subDrawer`, `badgeTag`) so that domain-specific information can be rendered inside the standard card shell without breaking visual uniformities.

---

## 4. Conclusion & Proposed Refactoring Strategy

### Proposed Component Architecture (`src/components/cards/`)

1. **`src/lib/utils/formatters.ts`** (Unified Formatting Utilities):
   - Consolidate `formatEokWithUnit`, `formatGapPrice`, `formatDeltaPrice`, `formatYearBuilt`, and `formatAreaLabel` into a single, well-tested module.

2. **`src/components/cards/AptCard.tsx`** (Core Real Estate Card):
   - A flexible, memoized base card component with standard props:
     ```typescript
     export interface AptCardProps {
       aptName: string;
       dong: string;
       householdCount?: number;
       yearBuilt?: string | number;
       priceMainLabel: string;
       priceSubLabel?: string;
       tags?: React.ReactNode[];
       badge?: React.ReactNode;
       highlightContent?: React.ReactNode;
       extraDrawer?: React.ReactNode;
       variant?: 'default' | 'compact' | 'row' | 'grid';
       isSelected?: boolean;
       onClick?: () => void;
       onMouseEnter?: () => void;
       onDetailsClick?: () => void;
     }
     ```
   - Enforces uniform container styling (`bg-surface`, `border-border/60`, `rounded-2xl`, `hover:border-brand-orange/40 hover:shadow-md transition-all`).

3. **`src/components/cards/TransactionCard.tsx`** (Feed Transaction Item):
   - Specialized card for timeline feeds and recent transaction lists (used in `MacroDashboardClient` and `HotComplexRanking`).
   - Accepts transaction-specific props (`priceEok`, `prevPriceVal`, `delta`, `floor`, `areaLabel`, `isNewHigh`).

### 3-Phase Implementation Plan

- **Phase 1: Foundation (Explorer/Implementer)**
  - Create `src/lib/utils/formatters.ts` and `src/components/cards/` (`AptCard.tsx`, `TransactionCard.tsx`).
  - Write unit tests for `formatters.ts` and card components.
- **Phase 2: Migration**
  - Migrate `MacroDashboardClient.tsx` (`TimelineItemCard` ➔ `TransactionCard`).
  - Migrate `AptRow.tsx` / `TossApartmentExploreClient.tsx` (➔ `AptCard` row variant).
  - Migrate `ChopoomaCuration.tsx` & `HotComplexRanking.tsx` (➔ `AptCard` grid variant).
  - Migrate `GapInvestmentExplorer.tsx` (➔ `AptCard` with `highlightContent` & `extraDrawer`).
- **Phase 3: Cleanup & Test Alignment**
  - Update `TimelineItemCardRender.test.tsx` to test `TransactionCard`.
  - Run full build and test suite (`npm run build`, `jest`).

---

## 5. Verification Method

1. **Build & Type Checking**:
   - Run `npm run build` from `frontend/` directory to ensure no TypeScript or Next.js build errors.
2. **Jest Unit Tests**:
   - Run `npm test` or `npx jest src/components/TimelineItemCardRender.test.tsx` from `frontend/` to verify memoization re-render efficiency.
3. **Visual & Layout Inspection**:
   - Inspect `/explore`, `/`, `/lounge`, `/technovalley` across mobile viewports (370px, 390px, 430px) and desktop viewports to verify 100% consistent border-radius (`rounded-2xl`), typography, and hover behavior across all feed cards.
