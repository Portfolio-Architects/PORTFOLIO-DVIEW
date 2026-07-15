# D-VIEW Frontend UX and Performance Audit Report

**Date**: 2026-07-15
**Auditor**: Codebase Auditor (Teamwork Explorer)
**Scope**: 
- `TechnoValleyClient.tsx`
- `TechnoValleyDashboard.tsx`
- `ApartmentModal.tsx`
- `SettingsModal.tsx`
- `MacroTrendChart.tsx`
- `globals.css` (Tailwind CSS v4 Configuration)
- `package.json`

---

## 1. Executive Summary
The D-VIEW frontend implements a highly interactive, responsive, and aesthetically pleasing interface styled after modern design systems (Toss-like clean interfaces and Apple Human Interface Guidelines). 

From a performance standpoint, the application is already highly optimized in several areas, employing Next.js dynamic imports, client-side caching (`swr`), custom scroll-lock mechanism, debounced resize observers, and localized skeleton loaders to suppress Layout Shifts (CLS). However, significant optimization opportunities exist—particularly in reducing React component render thrashing, bundling overhead from heavy libraries (like Recharts and Lucide Icons), and refactoring large component architectures (e.g., `ApartmentModal.tsx` with ~2,800 lines of code).

---

## 2. Button Labels & Visual Styling
**Target Files**: `TechnoValleyClient.tsx` & `TechnoValleyDashboard.tsx`

### 2.1 Emojis and Text Alignment
* **Labels**: Buttons utilize intuitive emojis inline with the Korean text, reinforcing visual cues:
  - `💼 법인 세제 감면 계산기`
  - `🤝 소형 공동임차 매칭 보드`
  - `상세보기`
* **Interaction**: Emojis are wrapped within standard `<span>` tags next to the text. While visually descriptive, screen readers might announce them literally unless configured. Text styling is set to `font-extrabold` or `font-black` to establish strong visual hierarchy.

### 2.2 Glassmorphism & Visual Tokens
* **Container Cards**: Use a subtle glassmorphic effect (`bg-surface/50` or `bg-surface/80` combined with `backdrop-blur-md` or `backdrop-blur-xl`).
* **Borders**: Thin, semi-transparent hair-lines (`border border-border/80` or `border border-white/20`) outline panels, creating crisp depth separations characteristic of modern glass UI.

### 2.3 Interactive Hover, Transition & Active Feedback
* **Transitions**: Elements consistently use `transition-all duration-300` or `transition-colors` combined with default transition ease curves.
* **Hover Scaling**: Interactive cards scale slightly on hover (`hover:scale-[1.01] hover:shadow-md`) to highlight focus.
* **Active Press Scaling**: Interactive links/buttons implement a tactile press effect (`active:scale-[0.98]`) that mimics native iOS/Android tap reactions.
* **Control Bars**: Tab selectors (e.g., timeframe `ALL/3Y/1Y` and metric selectors) use a recessed background (`bg-body/80 border border-border/40 shadow-inner`) containing flat buttons that pop out into a card (`bg-surface text-primary shadow-sm`) when selected. This replicates native segmented controller widgets.

---

## 3. Apple HIG (Human Interface Guidelines) Styling
**Target Files**: `ApartmentModal.tsx`, `SettingsModal.tsx`, `MacroTrendChart.tsx`

The styling across these components strongly aligns with Apple's design philosophy:

### 3.1 Corners & Border Radii
* **Layouts**: The design relies on large, organic corner radii to cluster content:
  - Main Apartment Modal Container: `md:rounded-[24px]` (desktop card viewport) and `rounded-none` (fullscreen layout on mobile to utilize maximum screen real estate).
  - Settings Modal: `sm:rounded-2xl rounded-t-2xl` (creating a native mobile "bottom-sheet" or drawer UI that slides from the bottom).
  - Chart Tooltip & Sub-containers: `rounded-2xl` or `rounded-[20px]`.
  - These values map back to the Tailwind CSS v4 variables defined in `globals.css` (`--border-radius-xl: 24px`, `--border-radius-lg: 16px`, `--border-radius-md: 12px`).

### 3.2 Shadows & Depth
* **Lighting Model**: Shadows represent layers of elevations:
  - Settings/Apartment Modals: `shadow-2xl` to establish modal precedence.
  - Hovering elements and Tooltips: `shadow-[0_12px_40px_rgba(0,0,0,0.12)]` (soft, dispersed shadows representing high elevation).
  - Ambient Cards: `shadow-sm` or `var(--shadow-card)` representing low elevation.

### 3.3 Borders & Separation
* **Hairline Dividers**: Instead of solid borders, components use low-opacity dividers:
  - `border-border/40` or `border-white/10` (creating a high-precision, subtle separator on dark mode backgrounds).
  - In dark mode, borders shift to `border-color: #374151` (`border-border/60`).

### 3.4 HSL Typography & Color Palette
* **Color Customization**: The theme operates on Tailwind v4 CSS variables defined under `@layer base` in `globals.css`:
  - Primary text: `var(--text-primary)` (High contrast, `#191f28` in light / `#f9fafb` in dark).
  - Secondary text: `var(--text-secondary)` (Medium contrast, `#4e5968` / `#d1d5db`).
  - Tertiary text: `var(--text-tertiary)` (Low contrast captions, `#5d6d7e` / `#9ca3af`).
  - Brand accents: Toss Blue (`#ea6100`, which functions as a energetic corporate orange tone) and Hwaseong City BI colors (Hwaseong Blue `#004696`, Hwaseong Orange `#dc6e2d`).
* **Charts**: Uses vibrant area fills fading via linear gradients:
  - Sale Price Area: stroke `#ea6100` with fill gradient from 22% opacity to 0% opacity.
  - Jeonse Price Area: stroke `#f9a825` with fill gradient from 18% opacity to 0% opacity.

### 3.5 Smooth Transitions & Animations
* **Touch Device Support**: Charts use CSS property `touch-pan-y` and disable Recharts default outline focus triggers (`svg:focus { outline: none !important }`) to prevent ugly outline artifacts on mobile touch.
* **Spring Animations**: Tooltips animate using custom spring bezier curves (`animate-tooltip-spring` using `cubic-bezier(0.34, 1.56, 0.64, 1)`).
* **Modal Overlay Animation**: Overlay fades in with `animate-in fade-in duration-150`, while the dialog scales with `zoom-in-98 duration-150`.

---

## 4. Analysis of Existing Optimization Patterns
The developers have already implemented several advanced UX and performance strategies in these files:

| Pattern | Implementation Details | Target Files |
|---|---|---|
| **Next.js Dynamic Imports** | Dynamically loads heavy components with `ssr: false` to shrink main bundle and prevent hydration mismatch. | `TechnoValleyClient.tsx` (loads `TechnoValleyDashboard`), `ApartmentModal.tsx` (loads `CommentSection`, `TransactionTable`, `JeonseSafetyReport`, etc.). |
| **Skeleton UI** | Inline skeleton layouts and shimmer cards mimic the actual layout shape to avoid Content Layout Shifts (CLS). | `TechnoValleyClient.tsx`, `ApartmentModal.tsx` (defines 8 different skeleton components). |
| **Idle Preloading** | Utilizes `requestIdleCallback` (fallback to `setTimeout`) to download dynamic chunks *after* the modal slide-in animation finishes, eliminating transition stuttering. | `ApartmentModal.tsx` (preloads all 11 dynamically imported sub-modules). |
| **Lazy Rendering** | Uses a custom `LazyRender` container backed by `IntersectionObserver` to defer mounting heavy sections (like chart containers) until they scroll near the viewport. | `ApartmentModal.tsx` (wraps heavy sub-components below the fold). |
| **Recharts Performance Adjustments** | Sets `isAnimationActive={false}` in SVG areas/tooltips to prevent frame drops during touch panning. | `MacroTrendChart.tsx`. |
| **Smart ResizeObserver** | Custom resize hook suppresses chart width calculations when the modal is active (`body.overflow === 'hidden'`) and ignores minor changes (<= 2px width/height diff). | `MacroTrendChart.tsx`. |
| **State Deferred Values** | Employs `useDeferredValue` for heavy filter parameters (`selectedAreaFilter`, `filterOutliers`) to decouple text input rendering from data calculation. | `ApartmentModal.tsx`. |
| **React Caching** | Broad usage of `useMemo` to cache calculations (KPIs, location scores, average rates). Wraps modal exports in `React.memo`. | `TechnoValleyDashboard.tsx`, `ApartmentModal.tsx`, `SettingsModal.tsx`, `MacroTrendChart.tsx`. |

---

## 5. Performance & UX Optimization Opportunities

Despite the existing optimizations, several critical gaps remain:

### 5.1 Missing `useCallback` on Interactive Event Handlers
* **Issue**: Event handlers like `handleScrollToTaxSimulator` (in `TechnoValleyClient.tsx`) and accordion toggles `handleToggleSector`, `handleExpandAll`, `handleCollapseAll`, `handleShowMore` (in `TechnoValleyDashboard.tsx`) are recreated on every render.
* **Impact**: While minor for native elements, the recreation of these functions in `TechnoValleyDashboard` triggers unnecessary re-renders of the large sector list and sub-accordion buttons during search input updates (`searchQuery` state changes).
* **Fix**: Wrap these handlers in `React.useCallback`.

### 5.2 Heavy Static Imports inside Dynamic Components
* **Issue**: In `TechnoValleyDashboard.tsx`, Recharts elements (`PieChart`, `Pie`, `LineChart`, `Line`, `Tooltip`, etc.) are imported statically. Even though `TechnoValleyDashboard` is dynamically imported with `ssr: false` in `TechnoValleyClient`, Recharts is bundled directly into the dashboard's chunk.
* **Optimization**:
  1. The `RelocationTaxSimulator` component is currently imported statically inside `TechnoValleyDashboard.tsx` (line 18). Because the simulator is a heavy form located at the very bottom, it should be loaded dynamically inside `TechnoValleyDashboard`:
     ```typescript
     const RelocationTaxSimulator = dynamic(
       () => import('@/components/macro/RelocationTaxSimulator'),
       { ssr: false, loading: () => <div className="h-48 animate-pulse bg-surface/5" /> }
     );
     ```
  2. The parent page of `MacroTrendChart.tsx` should ensure it loads the chart dynamically to avoid Recharts inflating the initial critical JS bundle.

### 5.3 Lack of List Item Memoization
* **Issue**: In `TechnoValleyDashboard.tsx`, when users type in the search bar to filter companies, the entire accordion tree re-evaluates. The individual company elements mapping in lines 1387-1420 are anonymous nodes.
* **Fix**: Separate the company rows or list entries into a sub-component (e.g., `CompanyListItem`) and wrap it in `React.memo` to prevent re-rendering matched rows when typing unrelated query keys.

### 5.4 High Code Density & Component Bloat
* **Issue**: `ApartmentModal.tsx` contains **2,874 lines of code**. It handles state for galleries, comments, PDF print formats, transaction outlines, share actions, local storage preferences, and Firestore fetching logic.
* **Impact**: Difficult codebase maintainability, elevated compiler/bundler parser times, and potential for memory leaks from scattered `useEffect` triggers.
* **Fix**: Refactor `ApartmentModal.tsx` by extracting the sub-layouts, Kakao/Clipboard share helper logic, and Firestore manager post-fetching hooks into separate modular hooks (`useAptShare`, `useAptManagerPost`) and sub-components.

---

## 6. Audit Summary Checklist

- [x] **Button labels and visuals in TechnoValley Client & Dashboard**
  - Emojis utilized correctly; high tactile feedback active scaling (`active:scale-[0.98]`) implemented.
- [x] **Apple HIG styling in Modals & Chart**
  - High-radius curved borders (`rounded-[24px]` and `rounded-t-2xl` sheets), depth lighting (`shadow-2xl`), HSL typography styling, and spring easing curves verified.
- [x] **Optimization opportunities mapped**
  - Identified: `useCallback` implementation gaps, static inclusion of `RelocationTaxSimulator` inside dashboard chunk, lack of list item memoization, and file size bloat.
- [x] **Verify existing optimization patterns**
  - Confirmed: Active usage of `dynamic` imports (13 instances in modal), `LazyRender` via observer, chunk preloading on idle, `useDeferredValue`, and scroll locks.
