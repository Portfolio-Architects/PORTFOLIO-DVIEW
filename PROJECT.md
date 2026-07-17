# Project: D-VIEW Performance Optimization Phase

## Architecture
- React / Next.js app directory structure in `frontend/src`.
- Global CSS in `frontend/src/app/globals.css`.
- Main dashboard client: `frontend/src/components/DashboardClient.tsx`.
- Macro dashboard client: `frontend/src/components/MacroDashboardClient.tsx`.
- Playwright E2E and Jest unit test suites in `frontend/tests/` and other test files.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Exploration | Analyze codebase layout, styling, and navigation | none | DONE |
| 2 | R1: Theme & Landing | Hwaseong BI Colors and landing page sections | M1 | DONE |
| 3 | R2: Navigation | Align menus and active states | M2 | DONE |
| 4 | R3: CLS & Skeletons | Eliminate Layout Shifts, fix transitions | M3 | DONE |
| 5 | Verification | Run all UI/UX tests, npm run audit, npm run build | M4 | DONE |
| 6 | Performance Analysis | Profile overview page rendering bottlenecks | M5 | PLANNED |
| 7 | Memoization & Lazy | React.memo, useMemo, useCallback, Lazy Rendering | M6 | PLANNED |
| 8 | Code Splitting | Dynamic loading in MacroDashboardClient | M7 | PLANNED |
| 9 | Final Verification | Run Playwright, Jest, npm run build, integrity checks | M8 | PLANNED |

## Interface Contracts
### LoungeHeader ↔ MobileDock
- Active routes and labels must be structurally aligned (e.g., matching tabs, items, paths).
- Same visual feedback indicators (background, font weight, border/underline).

## Code Layout
- Frontend project root: `frontend/`
- Navigation: `frontend/src/components/`
- Pages: `frontend/src/app/`
- Tests: `frontend/tests/`

