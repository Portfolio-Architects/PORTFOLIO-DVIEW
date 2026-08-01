# Project: DVIEW Mobile Apt Card UI Refactoring

## Architecture
DVIEW is a Next.js / React application with Tailwind CSS for styling.
The target UI is the mobile timeline/feed cards showing real estate transaction cards (신고가 / 실거래가 카드).

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Exploration & Analysis | Identify all components rendering apt timeline cards (`MacroDashboardClient.tsx`, etc.) and document CSS structure | none | DONE |
| 2 | Implementation | Refactor card text layout to 2-row structure (Row 1: [Badge] + [Dong/Pyeong/Floor], Row 2: [Full Apt Name]), align price/button, unify feed cards | M1 | DONE |
| 3 | Verification & Build | Review, challenge, audit integrity, run `npx tsc --noEmit` & `npm run build` | M2 | DONE |
| 4 | Completion | Final handoff & report victory to Sentinel | M3 | DONE |

## Code Layout
- `frontend/src/`
  - Components: `MacroDashboardClient.tsx` (refactored `TimelineItemCard`)
  - Tests: `TimelineItemCardRender.test.tsx`, `TimelineItemCardEmpirical.test.tsx`, `TimelineItemCardStress.test.tsx`

## Interface Contracts
- Mobile viewport breakpoint: `width < 480px` (or `xs:`, `sm:` breakpoints in Tailwind CSS).
- Row 1: Flex layout containing Badge element (if `item.type === 'high'`) + Dong/Pyeong/Floor text. Compact font sizes (`text-[9.5px]` to `text-[11px]`). Max-width dong guard (`max-w-[80px] xs:max-w-[110px] sm:max-w-none truncate`).
- Row 2: Block/flex container for Full Apt Name spanning 100% available horizontal width (`flex-1 min-w-0`).
- Right Section: Price (억/만원 with exact 2-decimal mobile regex formatting), price change (상승/하락), [Detail (상세)] button vertically centered with border separator (`border-l border-border/20`), touch height (`min-h-[32px]`), and explicit `aria-label`.
