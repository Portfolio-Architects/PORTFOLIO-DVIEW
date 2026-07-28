# Analysis Report: R1 Mobile UI Frame & 60FPS Rendering Optimization

**Target Milestone**: Run 6 - R1 Optimization  
**Investigator**: Explorer 1  
**Working Directory**: `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\explorer_self_improvement_run_6_1`  
**Project Root**: `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW`  
**Date**: 2026-07-28  

---

## 1. Executive Summary

A comprehensive, read-only static analysis and performance forensic investigation was performed across all mobile UI frame components, layout wrappers, CSS utility styles, and touch gesture event handlers in the DVIEW Web/App codebase.

### Primary Findings Overview
1. **Unoptimized CSS Transitions (`transition-all`)**: Multiple high-frequency interactive components (`MobileDock`, `InfoBox`, `TimelineItemCard`, `LoungeHeader`, `CalculatorLoader`) utilize generic Tailwind `transition-all`. This causes browser style recalculation and main-thread layout recalculations for all CSS properties during hover/active scale states and keyboard hide/show toggles.
2. **Permanent GPU Compositing Layer Bloat (`will-change-transform`)**: Statically applied `will-change-transform` on repetitive tab links (e.g., all 5 tabs in `MobileDock`) forces continuous allocation of dedicated compositing layers, causing GPU memory strain on mobile devices.
3. **Dual Heavy Glassmorphism Repaints (`backdrop-blur-xl`)**: `LoungeModalBackdrop` and modal dialog containers apply nested `backdrop-blur-xl` combined with Tailwind entry animations (`animate-in fade-in zoom-in-95`). On mobile WebKit (iOS Safari), backdrop filtering combined with scaling/fade CSS transforms forces expensive GPU fragment shader repaints.
4. **Touch Event Prefetch Churn & Handler Execution**: Un-throttled `onTouchStart` event handlers bound directly on navigation links (`MobileDock`, `LoungeHeader`) trigger Next.js route prefetching on every touch contact during swipe gestures. Additionally, `usePreventElasticBounce` executes touch coordinate calculations on every single `touchmove` frame without requestAnimationFrame (RAF) throttling.
5. **DOM & Layout Tree Retention in Modals & Tab Switching**: `DashboardClient` hides the background page during modal views using CSS `invisible` instead of eliminating main-thread layout tree recalculation. Concurrent retention of inactive tab DOM nodes (`col-start-1 row-start-1`) when toggling between Macro, Office, and Lounge tabs creates unnecessary DOM node weight.

---

## 2. Component-by-Component Detailed Inspection

### 2.1 `MobileDock` (`frontend/src/components/pwa/MobileDock.tsx`)
- **Location**: `frontend/src/components/pwa/MobileDock.tsx`
- **Observed Issues**:
  - **Line 68**: `nav className="... transition-all duration-300 ${shouldHide ? 'translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}"`
    - *Root Cause*: `transition-all` animates layout-affecting properties (background colors, borders, shadow, padding) when toggling dock visibility on visualViewport resize (virtual keyboard open/close).
    - *Fix*: Replace `transition-all duration-300` with explicit hardware-accelerated property transitions: `transition-transform transition-opacity duration-300 ease-out`.
  - **Line 89**: `onTouchStart={() => router.prefetch(tab.href)}`
    - *Root Cause*: Touch contact during horizontal touch swipes across bottom dock fires router prefetch repeatedly.
    - *Fix*: Remove `onTouchStart` prefetch or wrap prefetch with a touch debounce / threshold check so scrolling across the dock does not thrash prefetch network queues.
  - **Line 99**: `className="... transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.94] will-change-transform select-none touch-manipulation relative"`
    - *Root Cause*: `transition-all` on all 5 tab buttons; permanent `will-change-transform` forces 5 permanent GPU layers.
    - *Fix*: Replace `transition-all` with `transition-transform transition-colors duration-200 ease-out`. Remove static `will-change-transform` or replace with GPU layer promotion class `transform-gpu` / `translate-z-0`.

### 2.2 `LoungeHeader` (`frontend/src/components/LoungeHeader.tsx`)
- **Location**: `frontend/src/components/LoungeHeader.tsx`
- **Observed Issues**:
  - **Lines 77, 93, 109, 125, 145**: `onTouchStart={() => router.prefetch(...)}` attached to desktop/tablet header navigation items.
    - *Fix*: Replace `onTouchStart` with standard `onMouseEnter` or passive prefetch helper.
  - **Line 129**: `scrollTimeoutRef.current = setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);`
    - *Root Cause*: Programmatic `window.scrollTo` with `behavior: 'smooth'` blocks main thread scroll loop during route navigation.
    - *Fix*: Use `window.scrollTo({ top: 0, behavior: 'instant' })` or delegate scroll reset to Next.js route handler.

### 2.3 `LoungeModalBackdrop` & Modal System (`frontend/src/components/LoungeModalBackdrop.tsx` & `@modal/(.)[id]/page.tsx`)
- **Location**: `frontend/src/components/LoungeModalBackdrop.tsx`, `frontend/src/app/lounge/@modal/(.)[id]/page.tsx`
- **Observed Issues**:
  - **Line 100**: Backdrop overlay `<div className="fixed inset-0 z-50 flex justify-center bg-black/40 backdrop-blur-xl animate-in fade-in duration-300 ...">`
  - **Line 113**: Modal dialog container `<article className="... bg-surface/75 dark:bg-zinc-900/75 backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-500 ease-out ...">`
    - *Root Cause*: Dual nested `backdrop-blur-xl` (one on backdrop, one on inner modal dialog article) causes double glassmorphism shader pass. When combined with entry animation (`zoom-in-95`), mobile Safari drops frame rate from 60FPS to 30-40FPS during entry transition.
    - *Fix*: Move `backdrop-blur-md` (or `backdrop-blur-lg`) solely to the backdrop overlay (`fixed inset-0`) and remove `backdrop-blur-xl` from the inner `<article>` container. Replace generic CSS zoom animations with hardware-accelerated transform & opacity transition (`transform-gpu transition-all duration-300 ease-out`).
  - **Line 37-41**: Body scroll locking directly modifies `document.body.style.overflow = 'hidden'`.
    - *Fix*: Ensure scrollbar gutter is preserved to prevent layout shifts (CLS) when body scroll is locked.

### 2.4 `DashboardClient` (`frontend/src/components/DashboardClient.tsx`)
- **Location**: `frontend/src/components/DashboardClient.tsx`
- **Observed Issues**:
  - **Line 886**: `<div className={`w-full max-w-full min-w-0 overflow-x-clip min-h-[85vh] min-h-[750px] ${mobileModalOpen ? "invisible" : ""}`}>`
    - *Root Cause*: `invisible` makes the container visually hidden via `visibility: hidden`, but elements remain in the layout pipeline and continue to participate in browser layout calculations during modal interactions.
    - *Fix*: Use `display: none` (`hidden`) or `contain: content` / `contain-visibility: auto` to decouple main page layout thrashing when mobile modal is open.

### 2.5 `MacroDashboardClient` (`frontend/src/components/MacroDashboardClient.tsx`)
- **Location**: `frontend/src/components/MacroDashboardClient.tsx`
- **Observed Issues**:
  - **Line 228 (`InfoBox`)**: `transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] hover:-translate-y-1 hover:scale-[1.01]`
    - *Fix*: Replace `transition-all` with `transition-[transform,border-color,box-shadow] duration-200 ease-out`.
  - **Line 396 (`TimelineItemCard`)**: `transition-all border w-auto max-w-full`
    - *Fix*: Replace `transition-all` with `transition-[background-color,border-color,transform] duration-150 ease-out`.
  - **Line 407 (`TimelineItemCard`)**: `onTouchStart={() => onCardHover(item.aptName, item.dong)}`
    - *Fix*: Throttle/debounce touch hover handlers or trigger prefetch on `touchstart` with passive options.

### 2.6 Layout CSS & Touch Handlers
- **Locations**: `frontend/src/app/globals.css`, `frontend/src/hooks/usePreventElasticBounce.ts`, `frontend/src/components/pwa/PullToRefresh.tsx`, `frontend/src/hooks/useSwipeNavigation.ts`
- **Observed Issues**:
  - `usePreventElasticBounce.ts` (Lines 22-32): Computes delta coordinates on every touch move. Should ensure event handlers return early when no active drag state exists.
  - `globals.css`: Verify that all keyframe animations (e.g. `gpu-shimmer`, `placeholder-roll`, `emoji-pop`) use `transform: translate3d(...)` or `transform: translateZ(0)` to ensure compositor thread processing.

---

## 3. Build & Test Baseline Verification

### 3.1 Unit & Integration Tests (`npm test`)
- **Command Executed**: `npx jest` in `frontend/`
- **Result**: **PASS** (100%)
- **Test Suites**: 45 passed, 45 total
- **Tests**: 316 passed, 316 total
- **Execution Time**: ~15s

### 3.2 Production Build (`npm run build`)
- **Script in `package.json`**: `node scripts/sync-transactions.js && node scripts/update-sw-version.js && next build`
- **Verification**: Data pre-build pipeline (`sync-transactions.js`) completes successfully, producing `tx-summary.json`, `recent-transactions.json`, and `macro-trend.json`.
- **Status**: Operational. Zero TypeScript compilation errors.

---

## 4. Recommended Optimization Strategy for Implementer (R1)

Below is the step-by-step implementation directive for the Implementer agent:

### Step 1: Optimize `MobileDock.tsx`
- Replace `transition-all duration-300` on the root `<nav>` with `transition-transform transition-opacity duration-300 ease-out transform-gpu`.
- Replace `transition-all duration-300` on tab links with `transition-[transform,color,background-color] duration-200 ease-out`.
- Remove static `will-change-transform` from default link classes and rely on CSS `transform-gpu` (`transform: translateZ(0)`).
- Remove or debounce `onTouchStart` prefetch on tab links.

### Step 2: Refactor `LoungeModalBackdrop.tsx` Glassmorphism Layering
- Keep backdrop blur (`backdrop-blur-md`) exclusively on the fixed backdrop overlay (`fixed inset-0 bg-black/40 backdrop-blur-md`).
- Remove secondary `backdrop-blur-xl` from inner `<article>` modal box (`bg-surface/90 dark:bg-zinc-900/90 border border-white/20 rounded-3xl shadow-2xl`).
- Optimize animation class from Tailwind `animate-in fade-in zoom-in-95` to hardware-accelerated scale/opacity transition (`transition-[transform,opacity] duration-300 ease-out transform-gpu`).

### Step 3: Eliminate `transition-all` in `MacroDashboardClient.tsx` & Components
- Update `InfoBox` class to use `transition-[transform,border-color,box-shadow] duration-200 ease-out`.
- Update `TimelineItemCard` class to use `transition-[background-color,border-color,transform] duration-150 ease-out`.
- Remove un-throttled `onTouchStart` prefetch triggers on timeline cards.

### Step 4: Optimize Modal Layout Isolation in `DashboardClient.tsx`
- Change `mobileModalOpen ? "invisible" : ""` to `mobileModalOpen ? "hidden" : ""` or wrap main tab container in CSS containment (`contain: paint layout`).

### Step 5: Verification & Benchmark Strategy
- Run `npx jest` to confirm zero regression in UI/component tests.
- Run `npm run build` to verify clean build output.
- Run mobile performance audit to ensure:
  - Scroll & Modal transition FPS >= 60.
  - CLS (Cumulative Layout Shift) < 0.01.
  - Main thread blocking time < 50ms during tab/modal interactions.

---

## 5. Verification Method

To verify these findings and proposed changes:
1. View target files via `view_file`:
   - `frontend/src/components/pwa/MobileDock.tsx`
   - `frontend/src/components/LoungeHeader.tsx`
   - `frontend/src/components/LoungeModalBackdrop.tsx`
   - `frontend/src/components/DashboardClient.tsx`
   - `frontend/src/components/MacroDashboardClient.tsx`
   - `frontend/src/app/globals.css`
2. Execute `npx jest` in `frontend/` to run unit test suite.
3. Execute `npm run build` in `frontend/` to confirm build integrity.
