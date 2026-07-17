# Handoff Report — teamwork_preview_challenger (Milestone 4, Instance 2)

## 1. Observation

- **Target Component**: `<TimelineItemCard>` in `frontend/src/components/MacroDashboardClient.tsx` (lines 404 to 523).
- **React.memo wrapping**:
  ```typescript
  const TimelineItemCard = React.memo(function TimelineItemCard({
    item,
    isSelected,
    areaUnit,
    onCardHover,
    onCardClick,
    onDetailsClick,
    onDetailsHover,
  }: TimelineItemCardProps) {
  ```
- **Stable Callback Props** defined in the parent component `MacroDashboardClient.tsx`:
  - `handleCardHover` (line 763):
    ```typescript
    const handleCardHover = useCallback((aptName: string, dong: string) => {
      preloadApartmentTx?.(aptName, dong);
      import('@/components/ApartmentModal').catch(() => {});
      import('@/components/apartment-modal/TransactionChartSection').catch(() => {});
    }, [preloadApartmentTx]);
    ```
  - `handleCardClick` (line 769):
    ```typescript
    const handleCardClick = useCallback((aptName: string) => {
      setSelectedTimelineApt(aptName);
      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
        setIsBottomSheetOpen(true);
      }
    }, [setSelectedTimelineApt, setIsBottomSheetOpen]);
    ```
  - `handleDetailsClick` (line 776):
    ```typescript
    const handleDetailsClick = useCallback((aptName: string) => {
      if (onSelectApt) {
        onSelectApt(aptName);
      }
    }, [onSelectApt]);
    ```
  - `handleDetailsHover` (line 782):
    ```typescript
    const handleDetailsHover = useCallback((aptName: string, dong: string) => {
      preloadApartmentTx?.(aptName, dong);
      preloadApartmentModal();
    }, [preloadApartmentTx]);
    ```
- **TypeScript Verification Command & Result**:
  - Running `npx tsc --noEmit` in `frontend` completed successfully:
    ```
    The command completed successfully.
    Stdout:
    Stderr:
    ```
- **Production Build Command & Result**:
  - Running `npm run build` in `frontend` completed successfully:
    ```
    The command completed successfully.
    ...
    ✓ Generating static pages using 15 workers (181/181) in 11.9s
    Finalizing page optimization ...
    ```
- **Jest Render Memoization Verification Command & Result**:
  - Created a custom rendering test at `frontend/src/components/TimelineItemCardRender.test.tsx` to assert re-render counts of `<TimelineItemCard>` when the parent selected state changes.
  - Running `npm run test -- src/components/TimelineItemCardRender.test.tsx` outputs:
    ```
    PASS src/components/TimelineItemCardRender.test.tsx
      TimelineItemCard Memoization Render Test
        ✓ verifies that only the changed cards re-render when switching selected items with stable callbacks (64 ms)

    Test Suites: 1 passed, 1 total
    Tests:       1 passed, 1 total
    Snapshots:   0 total
    Time:        2.036 s
    ```

## 2. Logic Chain

- **Step 1**: The props interface of `TimelineItemCard` specifies primitive fields (`isSelected: boolean`, `areaUnit: string`), memoized callbacks (`onCardHover`, `onCardClick`, `onDetailsClick`, `onDetailsHover`), and the data item (`item: TimelineItem`).
- **Step 2**: The data item `item` is a reference originating from `filteredTimelineData` which only changes when its source dependencies (`dailyTimelineData`, `timelineDongFilter`, `timelineAptFilter`) update. Changing `selectedTimelineApt` (the state driving the selected timeline card) does NOT trigger a recalculation of `filteredTimelineData`.
- **Step 3**: The callbacks passed to `<TimelineItemCard>` are memoized with `useCallback` in `MacroDashboardClient.tsx` using stable states (`setSelectedTimelineApt`, `setIsBottomSheetOpen`, `preloadApartmentTx`, `onSelectApt`), ensuring their references are stable across renders.
- **Step 4**: When `selectedTimelineApt` changes, the parent `MacroDashboardClient` re-renders. During reconciliation, React compares the new props for all `<TimelineItemCard>` instances.
- **Step 5**: Because the props `item`, `areaUnit`, and the callback functions are referentially identical:
  - For cards where `isSelected` did not change (e.g. they remain unselected), all props are identical. `React.memo` successfully blocks re-renders for these cards.
  - For the previously selected card, `isSelected` changes from `true` to `false` (re-renders).
  - For the newly selected card, `isSelected` changes from `false` to `true` (re-renders).
- **Step 6**: The Jest test explicitly verifies this by tracking rendering counts of each card. The count increments only for the old and new selected cards, proving that only changed cards re-render.

## 3. Caveats

- No caveats. The behavior was confirmed via both structural static inspection and dynamic runtime testing inside the Jest/JSDOM testing environment.

## 4. Conclusion

- The React.memo optimization on `<TimelineItemCard>` works perfectly on the D-VIEW Overview page. Switching selected timeline items triggers exactly two card re-renders (one to unselect the old card, one to select the new card). All other cards in the list bypass rendering, minimizing DOM workload.
- The transpilation of `<TimelineItemCard>` is completely clean, passing type-checking and the full production build.

## 5. Verification Method

- Run the following type-check command to verify compilation:
  ```powershell
  npx tsc --noEmit
  ```
- Run the memoization test suite to verify render counts:
  ```powershell
  npm run test -- src/components/TimelineItemCardRender.test.tsx
  ```
- Run the full build command:
  ```powershell
  npm run build
  ```
