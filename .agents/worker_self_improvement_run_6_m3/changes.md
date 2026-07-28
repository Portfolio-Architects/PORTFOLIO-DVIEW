# Changes Report — R2: High-Volume Chart Streaming & Memory Leak Defense

## 1. Summary of Changes

### `frontend/src/lib/utils/transactionChartTransform.ts`
- **Refactored `globalTsCache`**: Converted from an unbounded `Map` to a bounded LRU Cache enforcing a maximum capacity of 500 entries.
- **LRU Eviction**: Re-inserts accessed keys to update recency and evicts the oldest entry (`globalTsCache.keys().next().value`) when size exceeds 500.
- **Exported `clearTsCache()`**: Created helper function for cache purging and test isolation.

### `frontend/src/components/apartment-modal/TransactionChartSection.tsx`
- **Disabled Recharts Tooltip Animation**: Set `isAnimationActive={false}` and `animationDuration={0}` on `<RechartsTooltip />` to eliminate animation frame timer accumulation during rapid streaming updates.
- **Memoized Customized Scatter Rendering**: Wrapped scatter rendering callback with `useCallback` (`customizedScatterComponent`) passed into `<Customized component={customizedScatterComponent} />` to prevent inline component re-creation.
- **Memoized Hover Tooltip Content**: Cached formatted scatter dot payload and floor color via `useMemo` (`hoveredDotInfo`).

### `frontend/src/components/MacroTrendChart.tsx`
- **Hardened `useResizeObserver` Cleanup**: Refactored debouncing timeout management to use `timeoutRef` (`useRef<NodeJS.Timeout | null>(null)`).
- **Strict Disconnect & Unbind**: Guaranteed `clearTimeout` executes on both resize re-triggering and component unmount/element nulling.

### `frontend/src/components/MindMap3D.tsx`
- **Hardened Canvas Window Resize Lifecycle**: Added window `resize` event listener (`handleWindowResize`) with passive event registration and clean removal on unmount.
- **Confirmed Viewport / Visibility RAF Pausing**: Verified `IntersectionObserver` (`isVisible.current`) and document `visibilitychange` listeners cleanly pause the RAF loop when the canvas is hidden or scrolled out of view, with full `cancelAnimationFrame` cleanup on unmount.

### `frontend/src/components/pwa/PWAProvider.tsx`
- **Global Click & Touch Tooltip Cleanup**: Updated global interaction guard to listen to `click`, `touchend`, and `touchstart` events.
- **Clean Event Listener Removal**: Ensured orphan `.recharts-tooltip-wrapper` elements are hidden (`opacity: 0`, `pointer-events: none`) without leaking event listeners on component unmount.

---

## 2. Unit & Integration Test Summary
- `transactionChartTransform.test.ts`: Added unit tests verifying `clearTsCache()` behavior and max 500 entry LRU cache eviction.
- Chart test suite: All 6 test suites / 59 tests passed.
