# Frontend UI/UX, Glassmorphism & CLS Performance Analysis

**Project**: D-VIEW Refactoring — Milestone 1  
**Target Path**: `frontend/`  
**Investigator**: Explorer 2 (`.agents/explorer_m1_v6_2`)  
**Date**: 2026-07-22  

---

## Executive Summary

This report provides a comprehensive analysis of the Frontend UI/UX, Glassmorphism visual polish, responsive design, and Cumulative Layout Shift (CLS) performance across the `frontend/` codebase. 

The investigation included static code audits of `frontend/src/app/globals.css`, core container clients (`DashboardClient.tsx`, `MacroDashboardClient.tsx`, `LoungeFeedClient.tsx`), modals (`ApartmentModal.tsx`, `LoungeModalBackdrop.tsx`), and automated Playwright browser test executions (`performance-ux.spec.ts`, `ui-ux-audit.spec.ts`, `dashboard.spec.ts`).

### Key Audit Metrics
- **CLS (Cumulative Layout Shift)**: **0.0365** (Passes strict target `< 0.05` and Google Core Web Vitals target `< 0.1`).
- **LCP (Largest Contentful Paint)**: **1172 ms** (Passes target `< 2500 ms`).
- **Layout Overflows**: **0** horizontal overflow violations detected across viewport sizes.
- **Glassmorphism & Theme Polish**: Modern translucent backdrops (`backdrop-blur-xl`), custom radial hover glows, GPU-accelerated micro-interactions, and full dark/light theme variable mappings.
- **Playwright Test Suite**: 16 out of 17 tests passed (100% of UI/UX, CLS, performance, accessibility, and E2E dashboard specs passed; 1 version-string mismatch in `swr-preload-audit.spec.ts` due to dynamic `BUILD_VERSION` timestamp regeneration during `npm run dev`).

---

## 1. CLS & Core Web Vitals Performance Audit

### 1.1 Measured Web Vitals
During automated browser diagnostics (`scratch/ui-ux-audit-results.json` and `tests/performance-ux.spec.ts`), real-time Web Vitals were captured:
- **LCP**: `1172 ms`
- **CLS**: `0.03648` (well under the 0.05 benchmark)
- **Navigation Timings**: DNS `0ms`, TCP `1.2ms`, TTFB `196.5ms`, DOM Load `349.8ms`, Full Load `529.6ms`

### 1.2 Layout Stability & Reflow Mitigations in Codebase
1. **Tab Switching Mechanics (`DashboardClient.tsx`)**:
   - Tab switching uses CSS visibility toggles (`block` vs `hidden`) via `memoizedTabContents`. Inactive tabs remain attached to the DOM after initial mount, preventing tab re-render reflows.
   - For unmounted dynamic tabs (`OfficeExplorerClient`, `LoungeContainerClient`, `MacroDashboardClient`), skeleton fallbacks (`MacroDashboardSkeleton`, `LoungeSkeleton`) pre-allocate approximate vertical height.
2. **Modal Backdrop Stability (`globals.css` & `LoungeModalBackdrop.tsx`)**:
   - `body { transform: none !important; }` in `globals.css` prevents `body` from creating containing blocks for `fixed` overlays, avoiding modal positioning offsets.
   - `scrollbar-gutter: stable;` on `body` prevents layout reflows when document scrollbars lock/unlock during modal toggles.
3. **Chart Reflow Prevention (`MacroDashboardClient.tsx` & `globals.css`)**:
   - Recharts SVG hover scales use CSS-only transforms (`hover:scale-105 transition-transform duration-300 origin-center style="transform-origin: 50% 50%; will-change: transform"`), ensuring hover states run on the GPU without triggering document reflow.

### 1.3 Identified CLS Bottlenecks & Risk Vectors
- **Dynamic Metadata Backfilling in `ApartmentModal.tsx`**:
  - When opening `ApartmentModal`, detailed metrics (e.g., `householdCount`, year built) are backfilled asynchronously via `/api/apartments-by-dong` if missing from initial stub data. If spec table rows do not have fixed `min-height` constraints, text content pop-in causes minor micro-shifts (0.01–0.02).
- **Accordion Expand/Collapse Jumps**:
  - `MacroDashboardClient.tsx` unmounts collapsed sector cards to reduce DOM node count. When expanded, new cards mount immediately, pushing lower content downward. While user-triggered shifts within 500ms are excluded from Google CWV scoring, adding smooth `grid-template-rows` height transitions improves perceptual smooth quality.
- **Dynamic Feed Images (`LoungeFeedClient.tsx`)**:
  - Dynamic user-uploaded images or news preview images require strict `aspect-[16/9]` container constraints to guarantee height reservation before image assets finish downloading over slow network connections.

---

## 2. Glassmorphism, Visual Polish & Dark/Light Theme Assessment

### 2.1 Glassmorphism & Backdrop Blur Implementation
- **Modal Backdrops**: Implemented using Tailwind utility classes `bg-black/40 backdrop-blur-xl` and `bg-surface/75 dark:bg-zinc-900/75 backdrop-blur-xl border border-white/20 dark:border-white/5`.
- **Card Micro-Interactions**: Card components (`InfoBox` in `MacroDashboardClient.tsx`) feature dynamic radial gradient glows (`--card-bg-gradient`, `--card-glow`) that transition smoothly on hover (`hover:-translate-y-1 hover:scale-[1.01] hover:shadow-[0_12px_24px_...]`).
- **Aurora Mesh Background (`aurora-bg`)**: Uses GPU-accelerated radial background gradients (`background-image: radial-gradient(at 0% 0%, rgba(220, 110, 45, 0.05) 0%, transparent 60%)`) to create ambient color depth in both light and dark themes.

### 2.2 Theme Mappings & Accessibility Findings
- **Theme Mappings (`globals.css`)**: Theme colors rely on CSS custom properties (`--bg-body`, `--bg-surface`, `--brand-orange`, `--border-color`), enabling instantaneous dark/light class toggles without visual flicker.
- **Accessibility Color Contrast Finding**:
  - **Violation**: `axe-core` accessibility audit flagged 1 serious color contrast warning in light mode on `.shadow-[0_2px_12px_rgba(0,0,0,0.06)] > span` ("아파트 탐색" tab label). The contrast ratio between `--text-tertiary` (#5d6d7e) and the surface background was slightly below the WCAG 2.1 AA 4.5:1 ratio threshold.

---

## 3. Responsive Layout & Mobile/Desktop UX

### 3.1 Mobile & Desktop Layout Adaptability
- Responsive grid systems adapt seamlessly from mobile single column (`grid-cols-1`) to multi-column desktop layouts (`md:grid-cols-2 lg:grid-cols-4`).
- Mobile safe areas are handled via `pb-[env(safe-area-inset-bottom)]` and integrated PWA navigation dock (`MobileDock.tsx`).
- Touch & Inertial Scrolling: Applied custom scrollbars (`custom-scrollbar`, `custom-h-scrollbar`, `hide-scrollbar`) with `-webkit-overflow-scrolling: touch` for momentum scrolling on iOS devices.

---

## 4. Baseline Playwright Test Execution Summary

The Playwright test suite (`npx playwright test`) was executed on the `frontend/` codebase. 16 out of 17 test specs passed:

| Spec File | Test Objectives | Status / Findings |
|---|---|---|
| `performance-ux.spec.ts` | Donut Chart CSS hover scale, Accordion DOM node reduction, Modal card padding/scrolling, Tab switching keep-alive & URL sync, Lounge modal CLS & Firebase offline recovery | **PASSED (5/5)**. Reflow-free hover scale & CLS < 0.1 verified. |
| `ui-ux-audit.spec.ts` | Automated LCP/CLS measurement, horizontal layout overflow scan, Axe-core accessibility scan | **PASSED (1/1)**. LCP 1172ms, CLS 0.0365, 0 overflow errors, 1 contrast warning flagged. |
| `dashboard.spec.ts` | E2E dashboard loading, virtual list interaction, modal opening, filter switching, MacroTrendChart render | **PASSED (2/2)**. Modal opens reliably, type filters update transaction count dynamically. |
| `badge-accessibility.spec.ts` | Keyboard focus & badge navigation | **PASSED (1/1)**. Focus rings and tab indexes validated. |
| `login-e2e.spec.ts` | Auth flow e2e mock login/logout | **PASSED (1/1)**. |
| `routing-bug.spec.ts` | Navigation mismatch & routing popstate handling | **PASSED (1/1)**. |
| `swr-preload-audit.spec.ts` | SWR preloading targets and version key audit | **PASSED (5/6)**. 1 test failed due to dynamic `BUILD_VERSION` timestamp regeneration during `npm run dev` (`v=1784704896692` vs `v=1784704940275`). |

---

## 5. Recommended UI/UX Enhancements

1. **Fix Color Contrast on Active/Inactive Tab Badges**:
   - Update text styling on tab badges from `--text-tertiary` (`#5d6d7e`) to `--text-secondary` (`#4e5968`) or `--text-primary` in light mode to meet WCAG 2.1 AA 4.5:1 contrast requirements.
2. **Apply Grid Height Transitions on Accordion Expansion**:
   - Wrap sector card accordion panels in CSS grid transition containers (`grid-template-rows: 0fr` to `grid-template-rows: 1fr`, `transition: grid-template-rows 0.3s ease-out`) to convert height jumps into smooth expansion animations.
3. **Explicit Height/Ratio Constraints for Async Images**:
   - Ensure all image containers in `LoungeFeedClient.tsx` and `ApartmentGallery.tsx` carry explicit `aspect-[16/9]` or pre-rendered skeleton boxes to prevent image download reflows.
4. **Reserve Spec Table Cell Min-Heights**:
   - Add `min-h-[24px]` on spec values in `ApartmentModal.tsx` so backfilled apartment metrics do not shift surrounding text during async fetch.
5. **Update `BUILD_VERSION` Assertion in SWR Test**:
   - In `tests/swr-preload-audit.spec.ts:87`, assert URL version parameter format with regex `/v=\d+/` rather than hardcoded timestamp equality to handle live SW script updates during development.
