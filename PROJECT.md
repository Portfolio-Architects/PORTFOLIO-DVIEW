# Project: DVIEW Landing Page & Navigation UX Optimization

## Architecture
- React / Next.js app directory structure in `frontend/src`.
- Global CSS in `frontend/src/app/globals.css` with CSS variables for colors.
- Desktop layout header in `frontend/src/components/LoungeHeader.tsx`.
- PWA Mobile bottom dock in `frontend/src/components/pwa/MobileDock.tsx`.
- Page hero headers in `frontend/src/components/PageHeroHeader.tsx`.
- Playwright E2E and UI/UX test suites in `frontend/tests/`.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Exploration | Analyze codebase layout, styling, and navigation | none | DONE (Report: .agents/explorer_1/analysis.md) |
| 2 | R1: Theme & Landing | Implement Hwaseong BI Colors and landing page Above the Fold sections | M1 | DONE (Report: .agents/worker_1/handoff.md) |
| 3 | R2: Navigation | Align desktop, mobile and hero menus, add active state styles | M2 | DONE (Report: .agents/worker_1/handoff.md) |
| 4 | R3: CLS & Skeletons | Eliminate Layout Shifts, fix transitions | M3 | DONE (Report: .agents/worker_1/handoff.md) |
| 5 | Verification | Run all UI/UX tests, npm run audit, npm run build | M4 | DONE (Report: .agents/auditor_m5/audit_report.md) |

## Interface Contracts
### LoungeHeader ↔ MobileDock
- Active routes and labels must be structurally aligned (e.g., matching tabs, items, paths).
- Same visual feedback indicators (background, font weight, border/underline).

## Code Layout
- Frontend project root: `frontend/`
- Navigation: `frontend/src/components/`
- Pages: `frontend/src/app/`
- Tests: `frontend/tests/`
