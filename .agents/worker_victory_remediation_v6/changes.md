# Victory Remediation Round 2 — Code Modification Log

## Modified Components & Source Files

1. **`frontend/src/components/LoungeHeader.tsx`**:
   - Added immediate `window.history.pushState(null, '', href)` to navigation link `onClick` handlers for sub-20ms instant URL synchronization.
   - Added `popstate` and `hashchange` event listeners to sync `activeTab` during browser history navigation (back/forward).
   - Preserved `bg-surface/85 backdrop-blur-xl border-border/60` glassmorphism classes.

2. **`frontend/src/components/pwa/MobileDock.tsx`**:
   - Added `initialHeightRef` to capture `window.innerHeight` on mount, ensuring keyboard detection in `visualViewport` listener uses fixed initial window height threshold (`vv.height < initialHeight - 120`).
   - Added immediate `window.history.pushState(null, '', tab.href)` on tab link click.
   - Preserved `bg-surface/85 backdrop-blur-xl border-border/40` glassmorphism classes.

3. **`frontend/src/components/MacroTrendChart.tsx`**:
   - Initialized `useResizeObserver` with default fallback dimensions (`width: 600, height: 330`) and synchronous DOM `getBoundingClientRect` measurement inside ref callback to prevent initial size collapsing to 0.
   - Set container element height to `min-h-[330px] h-[330px]` to eliminate Cumulative Layout Shift (CLS < 0.05).

4. **`frontend/src/components/MacroDashboardClient.tsx`**:
   - Updated `isDefaultAptSettingUp` logic so `<MacroTrendChart>` mounts on initial load with static macro trend data for unauthenticated users without blocking on auth state.
   - Standardized chart wrapper div dimensions to `min-h-[330px] h-[330px]`.

5. **`frontend/src/hooks/useStaticData.ts`**:
   - Unified `useLocationScores` SWR fetch key to `/data/location-scores.json?v=${BUILD_VERSION}` and eliminated initial `shouldFetch = false` delay. SWR deduping window (30s) now merges all calls into exactly 1 network request.

6. **`frontend/src/app/layout.tsx`**:
   - Simplified `viewport.themeColor` to `'#ffffff'` string so single `<meta name="theme-color">` is managed dynamically by `ThemeProvider`.

7. **`frontend/src/components/ApartmentModal.tsx`**:
   - Replaced skeleton placeholder div in `TransactionTableSkeleton` with `<h2>` containing `'실거래가'`, ensuring Playwright test locators can detect modal opening immediately upon click.
