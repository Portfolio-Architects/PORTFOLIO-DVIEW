# Scope: UX & Performance Refactoring (2026-07-15)

## Architecture
- Techno Lab Page: `frontend/src/app/technovalley/page.tsx` & `TechnoValleyClient.tsx`
- Techno Lab Dashboard: `frontend/src/components/macro/TechnoValleyDashboard.tsx`
- Modals & Charts:
  - `frontend/src/components/ApartmentModal.tsx`
  - `frontend/src/components/SettingsModal.tsx`
  - `frontend/src/components/MacroTrendChart.tsx`
- Global Theme: CSS variables defined in `frontend/src/app/globals.css` (Tailwind CSS v4).

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| 1 | UX/Performance Audit | Conduct initial codebase exploration and identify key optimization targets. | none | DONE |
| 2 | Techno Lab Buttons Refactor | Change labels to be intuitive and apply Apple glassmorphism styling + smooth hover/active scaling. | M1 | DONE |
| 3 | HIG Component Styling | Refactor ApartmentModal, SettingsModal, MacroTrendChart to conform to Apple HIG rules. | M2 | DONE |
| 4 | Runtime Optimizations | Apply dynamic imports, useCallback, useMemo, memoization, and skeleton UI to prevent CLS. | M3 | DONE |
| 5 | Build & Integrity Verification | Run `npm run build` and execute Forensic Auditor checks. | M4 | DONE |

## Interface Contracts
- **Header Buttons**:
  - The buttons in `TechnoValleyClient.tsx` and `TechnoValleyDashboard.tsx` must align visually and behaviorally.
  - Hover states: `hover:scale-[1.02]` or `scale-[1.01]`, active states: `active:scale-[0.98]`, smooth transition duration, glassmorphism border/shadows.
- **Apple HIG Styling**:
  - `rounded-[20px]` or `rounded-[24px]` rounded corners for modals and containers.
  - Use variable tokens like `var(--text-primary)`, `bg-surface`, etc. for colors.
  - Dynamic component loading fallbacks must use skeleton placeholders to prevent CLS.
