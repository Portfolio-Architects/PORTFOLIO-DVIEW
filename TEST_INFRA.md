# E2E Test Infra: D-VIEW Hybrid Dashboard Integration

## Test Philosophy
- Opaque-box, requirement-driven, and regression-resistant.
- Methodology: Category-Partition + Boundary Value Analysis (BVA) + Pairwise Combinatorial Testing + Real-World Workload Testing.
- Zero tolerance for cheating, facade implementations, or hardcoded strings.

## Feature Inventory & Test Matrix
| # | Feature | Source (requirement) | Tier 1 (Feature) | Tier 2 (Boundary) | Tier 3 (Cross) |
|---|---------|---------------------|:----------------:|:-----------------:|:--------------:|
| F1 | Canonical 3-Tab Global Navigation | R3, LoungeHeader/MobileDock | 5 | 5 | ✓ |
| F2 | `/stats` 301 Permanent Redirect | R3, next.config.ts / stats route | 5 | 5 | ✓ |
| F3 | Navigation Test Synchronization | R3, HeaderDockSync/Challengers | 5 | 5 | ✓ |
| F4 | Modular `StatsOverviewSection` | R1, StatsOverviewSection.tsx | 5 | 5 | ✓ |
| F5 | 4 Core KPIs & 5D Filter Reactivity | R1, R2, 300ms SLA | 5 | 5 | ✓ |
| F6 | Visual Charts & Hyperlocal Insight Cards | R1, TimeTrend, PyeongRanking, Donut | 5 | 5 | ✓ |
| F7 | In-Page Modal & Complex Selection Wiring | R1, FieldReportModal triggers | 5 | 5 | ✓ |
| F8 | Single-Page Vertical Transition | R1, MacroDashboardClient | 5 | 5 | ✓ |
| F9 | Inline AdSense Optimization | R3, AdSlot in-feed | 5 | 5 | ✓ |
| F10 | Zero-CLS Bounding Box Guarantee | R3, CLS < 0.01 min-height | 5 | 5 | ✓ |
| F11 | End-to-End Verification & Coverage | Acceptance Criteria | 5 | 5 | ✓ |

## Test Architecture
- **Test Runner**: Jest (`npx jest`) & Playwright (`npx playwright test`).
- **Commands**:
  - `npm run test` (or targeted Jest commands)
  - `npx tsc --noEmit`
  - `npm run lint`
  - `npm run build`
- **Location**: `frontend/src/__tests__/`, `frontend/src/components/`, `frontend/src/lib/analytics/`.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | First-time visitor visits `/`, views 4 KPIs, changes region to 동탄2 and pyeong to 중소형, verifies charts update in <300ms. | F4, F5, F6 | Medium |
| 2 | Visitor clicks on #1 ranked complex in TOP 20 pyeong price leaderboard; `FieldReportModal` opens in-page without navigation. | F6, F7, F8 | High |
| 3 | Visitor visits legacy URL `/stats` (or with query `/stats?region=DONGTAN1`), gets 301 redirected to `/` (preserving queries). | F2, F3 | Medium |
| 4 | Mobile user on 320px viewport scrolls past macro stats, sees zero layout shift (CLS = 0) around the inline ad slot, and taps between 3 navigation tabs in `MobileDock`. | F1, F9, F10 | High |
| 5 | Investor explores both macro time-series trends and micro complex line charts on the same page, verifying zero Firestore calls ($0). | F4, F5, F6, F8 | High |

## Coverage Thresholds
- Tier 1: ≥5 per feature
- Tier 2: ≥5 per feature
- Tier 3: pairwise coverage of major feature interactions
- Tier 4: ≥5 realistic application scenarios
- Tier 5: white-box adversarial coverage hardening
