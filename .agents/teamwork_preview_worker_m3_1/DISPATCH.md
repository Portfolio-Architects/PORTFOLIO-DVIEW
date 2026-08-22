## 2026-08-22T11:31:36Z

<USER_REQUEST>
You are Worker for Milestone 3 (M3: Interactive Items & Modal Integration) of the D-VIEW MacroTimelineView upgrade.

Your working directory is: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\teamwork_preview_worker_m3_1
Authoritative request file: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\ORIGINAL_REQUEST.md
Project Blueprint: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\PROJECT.md
Frontend directory: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\frontend

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Write Ownership:
You own exclusively:
- `frontend/src/components/MacroDashboardClient.tsx`
- Integration tests in `frontend/src/components/__tests__/TimelineIntegration.test.tsx` (if created)

Implementation Requirements:
1. `MacroDashboardClient.tsx`:
   - Inspect `useMacroFilters` hook call inside `MacroDashboardClient.tsx`. Extract all new state and actions:
     `quickFilter, setQuickFilter, searchQuery, setSearchQuery, sortOrder, setSortOrder, viewMode, setViewMode, resetFilters`.
   - Update filtering and multi-sorting pipeline:
     a. Apply `quickFilter` conditions:
        - `'all'`: no extra filter
        - `'dongtan1'`: item dong in DONGTAN1_DONGS
        - `'dongtan2'`: item dong in DONGTAN2_DONGS
        - `'high'`: `item.type === 'high'` or `item.isNewHigh === true`
        - `'pyeong30'`: `item.areaPyeong >= 30 && item.areaPyeong < 40` (or `item.area >= 74 && item.area < 102`)
        - `'billion10'`: `item.priceVal >= 10.0`
        - `'landmark'`: `LANDMARK_APTS.some(...)` or matches landmark list
     b. Apply `searchQuery`:
        - Case-insensitive, whitespace-trimmed match on `item.aptName` or `item.displayAptName` or `item.dong`.
     c. Apply `sortOrder` inside each date group:
        - `'latest'`: keep standard date / raw order
        - `'price_desc'`: `b.priceVal - a.priceVal`
        - `'delta_desc'`: `(b.deltaPercent || 0) - (a.deltaPercent || 0)` or `b.delta - a.delta`
        - `'area_desc'`: `b.area - a.area`
   - Calculate `highestPriceApt` in `dailyTimelineData`:
     - For each group, find item with highest `priceVal`. Set `highestPriceApt: { aptName: highest.aptName, displayAptName: highest.displayAptName, priceEok: highest.priceEok, priceVal: highest.priceVal }`.
   - Upgrade `TimelineItemCard`:
     - Add Favorite Bookmark Heart button with active red fill (`fill-rose-500 text-rose-500`) and inactive state (`text-slate-300 dark:text-zinc-600 hover:text-rose-400`). Controlled by `isFavorite = userFavorites?.has(item.aptName)`. Clicking MUST call `e.stopPropagation()` and `onToggleFavorite?.(item.aptName)`.
     - Display Price per Pyeong: `평당 ${Math.round((item.priceVal * 10000) / (item.areaPyeong || (item.area / 3.3058))).toLocaleString()}만`.
     - Display Previous price strikethrough and delta percentage badge.
     - "상세" button calling `onDetailsClick?.(item.aptName)` / `onSelectApt(item.aptName)`.
   - Implement `TimelineItemRow` for Compact List View:
     - Export `export const TimelineItemRow = React.memo(function TimelineItemRow(...) { ... });`
     - Dense, clean horizontal layout with favorite button, dong & apt name, area (m2 / pyeong) + floor, price, delta badge, and "상세" button.
   - CRITICAL REGEX AST COMPATIBILITY GUARD:
     - Keep exact export statements:
       `export const formatEokWithUnit = ...`
       `export const formatDeltaPrice = ...`
       `export interface TimelineItemCardProps { ... }`
       `export const TimelineItemCard = React.memo(function TimelineItemCard(...) { ... });`
     - Keep regex anchor string inside `TimelineItemCard`: `const isRising = item.delta > 0;`
   - Pass all new props to `MacroTimelineView`:
     `quickFilter`, `setQuickFilter`, `searchQuery`, `setSearchQuery`, `sortOrder`, `setSortOrder`, `viewMode`, `setViewMode`, `onResetFilters: resetFilters`, `userFavorites`, `onToggleFavorite`, `renderTimelineItemRow: (item, isSelected) => <TimelineItemRow ... />`.

2. Verification:
   - Run `npx tsc --noEmit` and confirm 0 errors.
   - Run `npm test` and confirm 100% green tests across all suites (especially `TimelineItemCardRender.test.tsx`, `TimelineItemCardEmpirical.test.tsx`, `TimelineItemCardStress.test.tsx`).
3. Write your handoff report to `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\teamwork_preview_worker_m3_1\handoff.md` and message parent when complete.
</USER_REQUEST>
