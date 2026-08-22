# Survey Handoff Report: R1. Rendering Runtime & Memory Leak Optimization

## 1. Observation

### 1.1 Top-Level Dashboards & Monolithic Component Rendering
* **`frontend/src/components/macro/TechnoValleyDashboard.tsx` (Line 618)**:
  ```tsx
  export default function TechnoValleyDashboard() {
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);
    const [expandedSectors, setExpandedSectors] = useState<Set<string>>(new Set(['it_sw']));
    const [searchQuery, setSearchQuery] = useState('');
    // ...
  ```
  - *Observation*: Main export is a raw function component **without `React.memo`**.
  - *State Churn*: The search query input (`searchQuery`), sector toggle (`expandedSectors`), building pagination (`visibleBuildings`), and category filter (`selectedCategory`) all reside at the root level of this 1,915-line component.
  - *Impact*: Every keystroke in the company search bar (lines 1421-1430) triggers full evaluation and re-rendering of the entire component tree, including the Recharts LineChart (`ResponsiveContainer`, `LineChart`, lines 1308-1407), metric summary cards, and all accordion listings.

* **`frontend/src/components/MacroDashboardClient.tsx` (Lines 1815-1845)**:
  - *Observation*: Unstable inline callback and object reference creation passed down into memoized children:
    ```tsx
    // Line 1817 & 1823: Inline fallback evaluation
    nameMapping={nameMapping || EMPTY_OBJECT}
    locationScores={locationScores || EMPTY_OBJECT}

    // Line 1820: Inline function creation on every render
    onSelectApt={onSelectApt || (() => {})}

    // Line 1822: Inline closure passed to AptFitFinder
    onClose={() => setIsQuizOpen(false)}

    // Lines 1836-1840: Inline arrow closures passed to MacroUtilityCards
    onOpenJeonseSafety={() => setIsJeonseSafetyModalOpen(true)}
    onOpenMortgage={() => setIsMortgageModalOpen(true)}
    onOpenPropertyTax={() => setIsPropertyTaxModalOpen(true)}
    onOpenSellTiming={() => setIsSellTimingModalOpen(true)}
    onOpenAptFitFinder={() => setIsQuizOpen(true)}
    ```
  - *Impact*: Even though `AptFitFinder`, `MacroUtilityCards`, and `MacroTimelineView` are wrapped in `React.memo`, passing freshly allocated inline arrow functions (`() => ...`) and fallback closures breaks reference equality (`prevProps !== nextProps`), causing redundant re-renders whenever `MacroDashboardClient` re-renders.

* **`frontend/src/components/DashboardClient.tsx` (Lines 873, 923)**:
  - *Observation*: Inline callback handlers passed to header and dock navigation:
    ```tsx
    // Line 873: Passing unmemoized callback to LoungeHeader
    onTabChange={(tab) => {
      setSelectedTab(tab);
      // ...
    }}

    // Line 923: Passing unmemoized callback to MobileDock
    onTabClick={(tab) => {
      setSelectedTab(tab);
      // ...
    }}
    ```

### 1.2 Selector & Filter Derivation Memoization
* **`frontend/src/components/MacroDashboardClient.tsx` (Lines 1081-1260 & Lines 1359-1599)**:
  - `selectedAptChartData` (Lines 1081-1260) and `filteredTimelineData` (Lines 1458-1599) are already wrapped in `useMemo`.
  - However, in `dailyTimelineData` (Lines 1359-1456), multi-level map and sort loops run across the full transaction dataset. High-frequency filter toggles (such as rapidly switching price ranges or area tags in `MacroControls`) cause heavy array derivations.
* **`frontend/src/components/TossApartmentExploreClient.tsx` (Lines 377-515)**:
  - `enrichedApts` (Lines 377-434) and `sortedApts` (Lines 436-515) are memoized with `useMemo` and rely on a global cache (`APTS_CACHE`).
  - Mobile category buttons in `TossApartmentExploreClient.tsx` (Line 863: `onClick={() => setCurrentCategory(cat.id)}`) allocate new closure references per item, but the parent container is memoized.

### 1.3 Lifecycle Hooks & Memory Leak Audit
A comprehensive codebase scan of all `addEventListener`, `ResizeObserver`, `IntersectionObserver`, `setInterval`, `setTimeout`, and custom hooks revealed:

* **Event Listeners (`addEventListener` / `removeEventListener`)**:
  - `MacroDashboardClient.tsx` (Line 777): Window resize listener with debounced timeout has full matching cleanup on line 782 (`removeEventListener` + `clearTimeout`).
  - `DashboardClient.tsx` (Lines 500-501, 559, 623): `hashchange` and `popstate` listeners have matching `removeEventListener` in all `useEffect` returns (Lines 504-505, 563, 627).
  - `TossApartmentExploreClient.tsx` (Lines 182-184): Mousemove, mouseup, and blur resize listeners are explicitly unregistered in `handleMouseUp` (Lines 193-197) and unmount cleanup.
  - `MindMap3D.tsx` (Lines 442, 458, 481): `visibilitychange`, `resize`, and `wheel` listeners on canvas are properly removed (Lines 485-491) along with `cancelAnimationFrame(animationFrameId)`.
  - `FloatingUserBar.tsx` (Lines 57, 136): Scroll listener uses `requestAnimationFrame` + cleanup (Lines 59-64); escape key listener is removed on unmount (Line 139).
  - `useSwipeNavigation.ts` (Lines 92-95): Touch event listeners (`touchstart`, `touchmove`, `touchend`, `touchcancel`) are all removed (Lines 98-101).
  - `useNetworkStatus.ts` (Lines 9-10): `online` and `offline` listeners properly removed in `useSyncExternalStore` subscribe cleanup.

* **Observers (`ResizeObserver` / `IntersectionObserver`)**:
  - `MacroTrendChart.tsx` (Lines 183-193): `ResizeObserver` observes container; calls `observer.disconnect()` and clears debounce timer in cleanup (Lines 191-193).
  - `TransactionChartSection.tsx` (Lines 255-259 & Lines 311-314): Callback ref pattern with `resizeObserverRef.current.disconnect()` properly unbinds and clears timers.
  - `LoungeFeedClient.tsx` (Lines 702-711): `IntersectionObserver` disconnects in cleanup (Line 711).
  - `MindMap3D.tsx` (Lines 412-425, 493): `IntersectionObserver` disconnects in cleanup (Line 493).
  - `ApartmentModal.tsx` (Lines 287-293): `IntersectionObserver` disconnects in cleanup.

* **Timers & Asynchronous Subscriptions**:
  - `HotComplexRanking.tsx` (Lines 142, 172): `setInterval` auto-roller has `clearInterval` on unmount and pauses on document `visibilitychange === 'hidden'`.
  - `app/write-report/page.tsx` (Lines 234, 243): Auto-save `setInterval` cleans up with `clearInterval`.
  - `AptFitFinder.tsx` (Lines 244, 253): Rolling text `setInterval` and transition `setTimeout` have matching cleanups.
  - `useApartmentDetails.ts` (Lines 262, 338): Uses `AbortController` and `controller.abort()` on report change or unmount.
  - `useFavorites.ts` (Lines 89, 117, 239): `AbortController` cancellation on unmount and network requests.
  - `useComments.ts` (Lines 54, 67): Real-time Firestore comment listener returns `unsubscribe()` which executes on unmount or ID change.

---

## 2. Logic Chain

1. **Step 1 (Root & Component Memoization)**:
   - *Observation*: `TechnoValleyDashboard.tsx` is exported directly without `React.memo` (Line 618).
   - *Reasoning*: As a top-level tab component embedded within `DashboardClient`, any state change in `DashboardClient` (such as background metadata updates or tab state evaluation) will trigger a full re-render of `TechnoValleyDashboard`.
   - *Observation*: Inside `TechnoValleyDashboard`, the search query input (`searchQuery`) triggers instant state updates on `onChange`.
   - *Reasoning*: Because the Recharts LineChart and complex DOM nodes are co-located in the same component body without subcomponent boundaries, user typing incurs high layout recalculation overhead and frame drops (jank).

2. **Step 2 (Prop Reference Stability & Breaking Memo)**:
   - *Observation*: In `MacroDashboardClient.tsx`, child components (`AptFitFinder`, `MacroUtilityCards`, `MacroTimelineView`) are wrapped with `React.memo`, but receive inline arrow callbacks (Lines 1820, 1822, 1836-1840) and dynamic fallback objects (Lines 1817, 1823).
   - *Reasoning*: React's `React.memo` uses shallow equality (`Object.is`) to compare previous and next props. An inline arrow function `() => setIsQuizOpen(false)` creates a new object reference on every render cycle of `MacroDashboardClient`, causing `prevProps.onClose !== nextProps.onClose`. This completely defeats `React.memo`, forcing child components to re-render needlessly.

3. **Step 3 (Lifecycle Hook Robustness)**:
   - *Observation*: All lifecycle hooks (`useEffect`, `useLayoutEffect`, custom hooks) implement matching cleanup functions for DOM listeners, observers, timers, and abort controllers.
   - *Reasoning*: There are no critical dangling memory leaks in existing event listeners or observer subscriptions. The primary performance gains for R1 lie in **rendering runtime optimization, prop stability, and subcomponent extraction**.

---

## 3. Caveats

1. **Synthetic & Benchmark Caveat**: Re-renders in development mode with React StrictMode run twice by design. Measurements should be verified in production builds (`npm run build && npm run start`) or with React DevTools Profiler recording "Why did this render?".
2. **Tab Pre-mounting vs. Lazy Rendering**: `DashboardClient` pre-mounts tab contents in `memoizedTabContents` for instantaneous tab switching. This design trade-off is beneficial for UX provided that individual tab components (`MacroDashboardClient`, `TechnoValleyDashboard`, `LoungeContainerClient`) strictly honor `React.memo` and do not re-render when inactive.
3. **Data Immutability Assumption**: Calculations in `useMemo` (e.g. `filteredTimelineData`, `sortedApts`) assume incoming props (`sheetApartments`, `txSummaryData`, `recentTransactions`) maintain immutable references between SWR revalidations.

---

## 4. Conclusion & Actionable Optimization Roadmap

To achieve 60fps interaction and zero memory leaks for R1:

1. **Wrap `TechnoValleyDashboard` with `React.memo` and Extract Heavy Subcomponents**:
   - Wrap `export default React.memo(TechnoValleyDashboard);`.
   - Extract the Recharts LineChart into a memoized subcomponent (`TechnoTrendChartSection.tsx`).
   - Extract the company accordion list and search bar into `TechnoCompanySection.tsx`.
   - Apply `useDeferredValue` or `startTransition` to `searchQuery` to keep the input responsive while filtering 200+ company records.

2. **Stabilize Callback Handlers with `useCallback` and Global Constants in `MacroDashboardClient.tsx`**:
   - Define a static `const NOOP_FN = () => {};` and `const EMPTY_OBJECT = Object.freeze({});` at module scope.
   - Memoize modal toggle handlers with `useCallback`:
     ```tsx
     const handleCloseQuiz = useCallback(() => setIsQuizOpen(false), []);
     const handleOpenJeonseSafety = useCallback(() => setIsJeonseSafetyModalOpen(true), []);
     const handleOpenMortgage = useCallback(() => setIsMortgageModalOpen(true), []);
     const handleOpenPropertyTax = useCallback(() => setIsPropertyTaxModalOpen(true), []);
     const handleOpenSellTiming = useCallback(() => setIsSellTimingModalOpen(true), []);
     const handleOpenAptFitFinder = useCallback(() => setIsQuizOpen(true), []);
     ```
   - Pass these stable callbacks to `MacroUtilityCards` and `AptFitFinder`.

3. **Stabilize Navigation Callbacks in `DashboardClient.tsx`**:
   - Wrap `onTabChange` and `onTabClick` handlers passed to `LoungeHeader` and `MobileDock` in `useCallback`.

4. **Verify Zero Memory Leaks Standard**:
   - Retain and enforce the existing pattern of `useEffect` cleanups (`controller.abort()`, `observer.disconnect()`, `clearTimeout`/`clearInterval`, `removeEventListener`).

---

## 5. Verification Method

To independently verify these findings and confirm the resolution during the implementation phase:

1. **Type Safety & Build Verification**:
   ```bash
   cd "c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\frontend"
   npx tsc --noEmit
   npm run build
   ```

2. **Test Suite Execution**:
   ```bash
   cd "c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\frontend"
   npm test -- --runInBand
   ```

3. **React DevTools Profiler Inspection**:
   - Open Chrome DevTools > Profiler.
   - Check "Record why each component rendered while profiling".
   - Type rapidly into the TechnoValley company search bar -> verify Recharts LineChart and Donut section do NOT re-render.
   - Click timeline filter chips in Macro Dashboard -> verify `MacroUtilityCards` and `AptFitFinder` do NOT re-render.

4. **Memory Leak / Heap Snapshot Verification**:
   - Open Chrome DevTools > Memory > Take Heap Snapshot.
   - Navigate repeatedly between Overview (`MacroDashboard`), TechnoValley (`Office`), and Explore tabs 20 times.
   - Take second Heap Snapshot and compare -> confirm detached DOM nodes, uncleaned `ResizeObserver` instances, and dangling closures remain at 0.
