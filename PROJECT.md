# Project: D-VIEW Apartment Lab 'MacroTimelineView' UX & Architecture Upgrade

## Architecture
D-VIEW Apartment Lab (`frontend/src/components/MacroDashboardClient.tsx`) provides high-frequency real estate transaction intelligence for Dongtan.
The 'MacroTimelineView' component displays recent transaction history grouped by date.
This project refactors and upgrades the timeline architecture into a modular, high-performance, responsive system with smart filter chips, inline search, 4-way multi-sort, dual view modes (Card vs Compact List), sticky date summary headers with highest price highlights, favorite bookmarking, and modal deep-linking.

### Data Flow & Component Hierarchy
```
DashboardClient
  └── MacroDashboardClient (Manages transactions, favorites, active modal)
        ├── MacroControls (Smart Filter Chips, Search, Multi-Sort, View Mode Toggle)
        │     └── uses useMacroFilters hook
        └── MacroTimelineView
              ├── Sticky Date Header (Count, Average Price, 👑 Highest Price Badge)
              ├── [View Mode = 'card'] -> TimelineItemCard (3-column responsive grid)
              │     └── Favorite Heart, Price, Pyeong Price, Delta, Modal Trigger
              └── [View Mode = 'list'] -> TimelineItemRow (Dense compact table row)
                    └── Favorite Heart, Truncated Name, Area/Floor, Price/Delta, Detail Button
```

## Feature Inventory
| # | Feature | Description | Milestone | Status |
|---|---------|-------------|-----------|--------|
| 1 | F1. Smart One-Touch Filter Chip Bar | [전체, 동탄1, 동탄2, 신고가🔥, 30평대 국평, 10억 클럽, 대장단지] chips synced with region/dong dropdowns | M1 | DONE (Verified) |
| 2 | F2. Real-Time Inline Search | Instant debounce search by complex name with clear button | M1 | DONE (Verified) |
| 3 | F3. Multi-Sort Engine | 4-way sort: 최신 계약순, 실거래가 높은순, 상승률 높은순, 전용면적순 | M1 | DONE (Verified) |
| 4 | F4. View Mode Controller State | State and toggle for Card Grid vs Compact List view modes | M1 | DONE (Verified) |
| 5 | F5. Sticky Date Summary Header | Date header with total count, average price, and 👑 최고가 [단지명] [가격] badge | M2 | DONE (Verified) |
| 6 | F6. Card Grid View Layout | 3-column responsive card layout with zero CLS | M2 | DONE (Verified) |
| 7 | F7. Compact List View Layout | Dense table/row layout for rapid scanning with full info | M2 | DONE (Verified) |
| 8 | F8. Favorite Bookmark Heart Toggle | Optimistic heart toggle on cards/rows with event isolation (`stopPropagation`) | M3 | DONE (Verified) |
| 9 | F9. Price per Pyeong & Delta Info | Formatted `평당 N만` and `+X.X%` / `-X.X%` delta comparison | M3 | DONE (Verified) |
| 10 | F10. Modal Deep-Linking | One-touch navigation to `FieldReportModal` / `AptModal` on item click | M3 | DONE (Verified) |
| 11 | F11. Legacy Regex Compatibility | Maintain exported signatures & anchors in `MacroDashboardClient.tsx` | M3 | DONE (Verified) |
| 12 | F12. E2E Test Suite & Adversarial Verification | Comprehensive Jest/RTL tests across all 4 tiers + CLS/performance check | M4 | DONE (Verified) |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Filter & State Engine | `useMacroFilters.ts`, `MacroControls.tsx` (Chips, Search, Sort, ViewMode) | None | DONE |
| M2 | Timeline Presentation & Views | `MacroTimelineView.tsx` (Card Grid, Compact List, Sticky Header + 👑 Badge) | M1 | DONE |
| M3 | Interactive Items & Integration | `MacroDashboardClient.tsx` (Card/Row components, Favorite, Modal, Regex compatibility) | M1, M2 | DONE |
| M4 | E2E Testing & Verification | Comprehensive test suites, `TEST_READY.md`, type check, 100% green tests | M1, M2, M3 | DONE |

## Code Layout
- `frontend/src/components/macro/hooks/useMacroFilters.ts`: Filter state hook.
- `frontend/src/components/macro/components/MacroControls.tsx`: Smart chip bar, search box, sort & view mode controls.
- `frontend/src/components/macro/components/MacroTimelineView.tsx`: Timeline grouped view, sticky headers, card/list rendering.
- `frontend/src/components/MacroDashboardClient.tsx`: Data grouping, highest price calculation, `TimelineItemCard`, `TimelineItemRow`, modal handlers.
- `frontend/src/components/__tests__/MacroTimelineViewE2E.test.tsx`: Comprehensive 4-tier E2E test suite.
