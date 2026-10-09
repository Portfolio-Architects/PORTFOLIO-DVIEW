# Project: Macro Dashboard Hero Geometry & Two-Sigma Analytics Integration

## Architecture
- **Analytics Core** (`frontend/src/lib/analytics/twoSigmaEngine.ts`):
  Pure functional mathematical statistics module computing sample mean $\mu$, Bessel-corrected standard deviation $s$, and $\pm 2\text{SD}$ bands with $\mathbb{R}_{\ge 0}$ lower-bound clamping and $N < 2$ singularity defense.
- **Visualization Component** (`frontend/src/components/macro/MacroTrendChart.tsx` & `@/components/MacroTrendChart.tsx`):
  Recharts linear interpolation visualization with ReferenceArea confidence bands, 3 ReferenceLines, diamond vertex polygon markers, maintaining `lg:h-[624px]` and `flex-1 min-h-[460px]`.
- **Control Interface** (`frontend/src/components/macro/MacroTimeframeToggle.tsx`):
  Deterministic 4-timeframe selector (`3M`, `1Y`, `3Y`, `ALL`) with $\Delta H = 0\text{px}$ bounding box invariant.
- **Monetization & CLS Invariant** (`frontend/src/components/ads/AdSlot.tsx`):
  AdSense Slot 1000000001 zero-CLS container with `min-h-[140px] sm:min-h-[160px]`, `my-6` margins, pulse skeleton, and 1:1 fallback.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | TwoSigma Mathematical Statistics | Bessel-corrected variance $s^2$, sample mean $\mu$, $\pm 2\text{SD}$ bands, $N < 2$ singularity defense | M1 | ORIGINAL_REQUEST §R1 |
| F2 | MacroTrendChart TwoSigma Visualization | ReferenceArea ($\pm 2\text{SD}$ band), 3 ReferenceLines, `type="linear"`, diamond vertex `<polygon>` | M2 | ORIGINAL_REQUEST §R2 |
| F3 | MacroTimeframeToggle Controller | 4-timeframe filter (`3M`, `1Y`, `3Y`, `ALL`) with $\Delta H = 0\text{px}$ container invariant | M3 | ORIGINAL_REQUEST §R3 |
| F4 | AdSense Slot 1000000001 CLS Guard | `in-feed` format bounding box `min-h-[140px] sm:min-h-[160px]`, `my-6`, skeleton, AdBlock fallback | M4 | ORIGINAL_REQUEST §R4 |
| F5 | Hero 2-Column Symmetrical Layout | Left (388px+14px+222px=624px) vs Right (624px) 1:1 symmetry across 1024px/1280px/1920px viewports | M5 | ORIGINAL_REQUEST §Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | R1 Mathematical Statistics Module | Implement `twoSigmaEngine.ts` and `twoSigmaEngine.test.ts` | None | DONE |
| M2 | R2 MacroTrendChart Visualization | Integrate twoSigma bands, ReferenceLines, diamond vertices, linear interpolation into `MacroTrendChart.tsx` | M1 | DONE |
| M3 | R3 Timeframe Toggle Controller | Implement `MacroTimeframeToggle.tsx` and integrate with Macro chart controls | None | DONE |
| M4 | R4 AdSlot Verification & Integration | Verify Slot 1000000001 zero-CLS invariant preservation | None | DONE |
| M5 | Final Verification & Challenger Testing | Full suite execution: `m2_zero_cls_layout_contract.challenger.test.tsx`, unit tests, `tsc --noEmit`, forensic audit | M1, M2, M3, M4 | DONE |

## Interface Contracts
### twoSigmaEngine ↔ MacroTrendChart
- Signature:
  ```typescript
  export interface TwoSigmaStats {
    isValid: boolean;
    mean: number | null;
    sd: number | null;
    upper2SD: number | null;
    lower2SD: number | null;
  }
  export function calculateTwoSigma(
    values: Array<number | null | undefined> | null | undefined
  ): TwoSigmaStats;
  ```
- MacroTrendChart calls `calculateTwoSigma` over the active series prices, and passes `lower2SD` and `upper2SD` to `ReferenceArea` and `mean`, `upper2SD`, `lower2SD` to `ReferenceLine`.

### MacroTimeframeToggle ↔ MacroTrendChart / Dashboard
- Signature:
  ```typescript
  export type MacroTimeframe = '3M' | '1Y' | '3Y' | 'ALL';
  export interface MacroTimeframeToggleProps {
    currentTimeframe: MacroTimeframe;
    onTimeframeChange: (timeframe: MacroTimeframe) => void;
    className?: string;
  }
  ```

## Code Layout
- `frontend/src/lib/analytics/twoSigmaEngine.ts` (New): TwoSigma statistics engine
- `frontend/src/lib/analytics/twoSigmaEngine.test.ts` (New): TwoSigma unit tests
- `frontend/src/components/macro/MacroTrendChart.tsx` (New/Bridge): TwoSigma visual integration
- `frontend/src/components/MacroTrendChart.tsx` (Updated): Core chart with twoSigma ReferenceArea/Lines and diamond vertices
- `frontend/src/components/macro/MacroTimeframeToggle.tsx` (New): Timeframe toggle component
- `frontend/src/components/ads/AdSlot.tsx` (Existing): Zero-CLS AdSlot component
