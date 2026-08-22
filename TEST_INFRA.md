# E2E Test Infra: D-VIEW Apartment Lab 'MacroTimelineView'

## Test Philosophy
- Opaque-box and requirement-driven validation based on `ORIGINAL_REQUEST.md`.
- Methodology: 4-Tier Test Matrix (Feature Coverage, Boundary/Corner Cases, Combinatorial Interactions, Real-World Workload Scenarios).

## Feature Inventory & Test Coverage
| # | Feature | Source | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|---|---------|--------|:------:|:------:|:------:|:------:|
| 1 | F1. Smart One-Touch Filter Chips | ORIGINAL_REQUEST §R1 | ✓ (7 tests) | ✓ | ✓ | ✓ |
| 2 | F2. Real-Time Inline Search | ORIGINAL_REQUEST §R1 | ✓ (5 tests) | ✓ | ✓ | ✓ |
| 3 | F3. Multi-Sort Engine | ORIGINAL_REQUEST §R1 | ✓ (5 tests) | ✓ | ✓ | ✓ |
| 4 | F4. View Mode Controller State | ORIGINAL_REQUEST §R2 | ✓ (4 tests) | ✓ | ✓ | ✓ |
| 5 | F5. Sticky Date Summary & 👑 Highlight Badge | ORIGINAL_REQUEST §R3 | ✓ (5 tests) | ✓ | ✓ | ✓ |
| 6 | F6. Card Grid View Layout | ORIGINAL_REQUEST §R2 | ✓ (4 tests) | ✓ | ✓ | ✓ |
| 7 | F7. Compact List View Layout | ORIGINAL_REQUEST §R2 | ✓ (4 tests) | ✓ | ✓ | ✓ |
| 8 | F8. Favorite Bookmark Heart Toggle | ORIGINAL_REQUEST §R4 | ✓ (4 tests) | ✓ | ✓ | ✓ |
| 9 | F9. Price per Pyeong & Delta Info | ORIGINAL_REQUEST §R4 | ✓ (4 tests) | ✓ | ✓ | ✓ |
| 10 | F10. Modal Deep-Linking | ORIGINAL_REQUEST §R4 | ✓ (4 tests) | ✓ | ✓ | ✓ |
| 11 | F11. AST Regex Compatibility | Legacy Test Constraints | ✓ (3 suites) | ✓ | ✓ | ✓ |
| 12 | F12. Zero Layout Shift & Performance | ORIGINAL_REQUEST §R5 | ✓ | ✓ | ✓ | ✓ |

## Test Architecture
- Framework: Jest + React Testing Library (RTL) + TypeScript.
- Location: `frontend/src/components/__tests__/` and `frontend/src/__tests__/`.
- Key Test Suites:
  - `src/components/__tests__/useMacroFilters.test.tsx`
  - `src/components/__tests__/MacroControls.test.tsx`
  - `src/components/__tests__/MacroTimelineView.test.tsx`
  - `src/components/__tests__/TimelineIntegration.test.tsx`
  - `src/components/TimelineItemCardRender.test.tsx`
  - `src/components/TimelineItemCardEmpirical.test.tsx`
  - `src/components/TimelineItemCardStress.test.tsx`
  - `src/__tests__/m1_timeline_filter_adversarial_stress.test.tsx`
  - `src/__tests__/m1_challenger2_macro_controls_stress.test.tsx`
  - `src/components/__tests__/MacroTimelineViewE2E.test.tsx` (Milestone 4 comprehensive 4-tier suite)

## Coverage Thresholds
- Tier 1: ≥5 per feature category
- Tier 2: Boundary conditions, empty datasets, nullish props, extreme price values
- Tier 3: Cross-feature combinations (filter + search + sort + viewMode + favorite)
- Tier 4: Real-world user exploration flows
