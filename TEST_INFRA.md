# E2E Test Infrastructure: D-VIEW Architectural Refactoring (F1~F7)

## 1. Test Philosophy & Epistemic Invariants
- **Opaque-Box Requirement-Driven**: Verification strictly against specifications defined in `PROJECT.md` and `ORIGINAL_REQUEST.md` (§2026-10-10T07:34:40Z), decoupled from ephemeral internal implementation details.
- **4-Tier Verification Architecture**:
  1. **Tier 1 (Feature Coverage)**: Category-partition coverage validating baseline happy paths and interface contracts ($\ge 5$ test cases per feature).
  2. **Tier 2 (Boundary & Corner Cases)**: Boundary Value Analysis (BVA), mathematical singularity defense, floating-point extremes, malformed inputs ($\ge 5$ test cases per feature).
  3. **Tier 3 (Cross-Feature Combinations)**: Multi-module interoperability, reactive data propagation, cross-layer contract synchronization ($\ge 5$ complex interaction suites).
  4. **Tier 4 (Real-World Application Scenarios)**: High-fidelity end-to-end user and pipeline execution flows under production-grade conditions ($\ge 5$ scenario suites).
- **Anti-Cheat & Strict Integrity Invariant**: Prohibition of facade mock assertions, trivial passes, or hardcoded constants. All tests verify computed values, schema transformations, and DOM states against authoritative specifications.

---

## 2. Feature Inventory & Test Coverage Matrix

| Feature ID | Feature Name | Specification Anchor | Tier 1 (Feature) | Tier 2 (Boundary) | Tier 3 (Cross) | Tier 4 (Scenario) |
|---|---|---|:---:|:---:|:---:|:---:|
| **F1** | ESLint Zero-Error & React Hook/Ref Compliance | `PROJECT.md` §F1, `ORIGINAL_REQUEST` §R3 | $\ge 5$ | $\ge 5$ | ✓ | ✓ |
| **F2** | Legacy Bridge & Dead Code Elimination | `PROJECT.md` §F2, `ORIGINAL_REQUEST` §R1 | $\ge 5$ | $\ge 5$ | ✓ | ✓ |
| **F3** | Domain Decoupling & Modularization | `PROJECT.md` §F3, `ORIGINAL_REQUEST` §R1 | $\ge 5$ | $\ge 5$ | ✓ | ✓ |
| **F4** | Data Pipeline Consolidation & Core Normalizer | `PROJECT.md` §F4, `ORIGINAL_REQUEST` §R2 | $\ge 5$ | $\ge 5$ | ✓ | ✓ |
| **F5** | Firestore Collection & JSON Output Unification | `PROJECT.md` §F5, `ORIGINAL_REQUEST` §R2 | $\ge 5$ | $\ge 5$ | ✓ | ✓ |
| **F6** | Test Suite Regression Remediation | `PROJECT.md` §F6, `ORIGINAL_REQUEST` §R4 | $\ge 5$ | $\ge 5$ | ✓ | ✓ |
| **F7** | Static Type Hardening & Build Verification | `PROJECT.md` §F7, `ORIGINAL_REQUEST` §R3, §R4 | $\ge 5$ | $\ge 5$ | ✓ | ✓ |
| **Total** | **F1 ~ F7 Full Inventory** | **M1 ~ M6 Scope** | **$\ge 35$** | **$\ge 35$** | **$\ge 5$** | **$\ge 5$** |

---

## 3. Tier Breakdown & Detailed Verification Specifications

### Tier 1: Feature Coverage (Category-Partition)
- **F1 (Lint & Hook/Ref Compliance)**:
  - F1.1: `ApartmentChapterNavBar` mounts and renders all 8 canonical chapters (`01` through `08`) with exact title/subtitle metadata.
  - F1.2: `ApartmentChapterNavBar` invokes `onSelectChapter` callback with expected chapter ID on tab click.
  - F1.3: `ApartmentChapterNavBar` mounts and unmounts without throwing React ref/hook errors or leaking event listeners.
  - F1.4: `MacroTrendChart` displays 2SD confidence band ReferenceArea and Mean ReferenceLine computed by `twoSigmaEngine`.
  - F1.5: `MacroTrendChart` renders diamond vertex markers with valid polygon points coordinates.
- **F2 (Legacy Bridge & Dead Code Elimination)**:
  - F2.1: Canonical `MacroTrendChart` export from `@/components/macro/MacroTrendChart` provides expected interface and renders cleanly.
  - F2.2: Canonical `AptDonutSection` export from `@/components/macro/AptDonutSection` renders donut chart structure and legends.
  - F2.3: Canonical `AptMetricCards` export from `@/components/macro/AptMetricCards` renders 4 core KPI metrics.
  - F2.4: Canonical `ApartmentModal` export from `@/components/apartment/ApartmentModal` renders modal dialog structure.
  - F2.5: `OfflineBanner` renders offline alert on network disconnect and hides on reconnection.
- **F3 (Domain Decoupling & Modularization)**:
  - F3.1: `CompareHeaderSearch` filters and auto-suggests complexes upon user query.
  - F3.2: `CompareInsightCard` computes and displays metric advantage between compared complexes.
  - F3.3: `ComparePriceHistoryChart` displays multi-series price histories across selected complexes.
  - F3.4: `CompareRadarChart` calculates and renders pentagonal/hexagonal score radars.
  - F3.5: `CompareSpecTable` tabulates specs (household count, year built, far, bcr) with winning highlights.
  - F3.6: Dynamic DCF valuation engine calculates implied fair price and undervaluation percentage.
- **F4 (Data Pipeline Consolidation & Core Normalizer)**:
  - F4.1: `normalizeAptName` removes bracketed dong prefixes, spaces, and normalizes Unicode NFC.
  - F4.2: `isCancelledTransaction` detects cancelled transactions via `cdealType` ('O', '해제') and cancel dates.
  - F4.3: `generateCanonicalTxKey` produces deterministic cryptographic/hash keys across identical transaction tuples.
  - F4.4: `getSupplyPyeong` maps exclusive m² to supply pyeong via type-map lookup or calibrated fallback formula.
  - F4.5: Transaction deduplication preserves unique transactions while dropping duplicate hashes.
- **F5 (Firestore Collection & JSON Output Unification)**:
  - F5.1: `TransactionListSchema` validates arrays of transaction records matching domain schema contract.
  - F5.2: Pathological filename sanitizer transforms invalid OS characters (`/`, `\`, `:`, `*`, `?`, `"`, `<`, `>`, `|`) into safe hyphens.
  - F5.3: Static JSON outputs (`recent-transactions.json`, `tx-summary.json`, `macro-trend.json`) satisfy Zod runtime schemas.
  - F5.4: Per-apartment chunk data conforms to `TransactionRecord[]` without missing required properties.
  - F5.5: Firestore document IDs follow deterministic canonical format.
- **F6 (Test Suite Regression Remediation)**:
  - F6.1: `LoungeHeader` renders navigation tabs matching canonical route schema (`/`, `/explore`, `/mbti`, `/guide`).
  - F6.2: Browser history popstate synchronizes active tab state across navigation headers.
  - F6.3: `AdSlot` enforces single push to `window.adsbygoogle` without duplicate push exceptions.
  - F6.4: Web Worker `executeStatsWorkerCalculation` returns mathematically equivalent results to sync stats engine.
  - F6.5: Web Worker execution completes within SLA threshold (<50ms for 1,000 samples).
- **F7 (Static Type Hardening & Build Verification)**:
  - F7.1: Hero container preserves 580px/624px min-height constraints across responsive breakpoints.
  - F7.2: AdSense slots enforce strict min-height bounding boxes (`min-h-[140px] sm:min-h-[160px]` for in-feed).
  - F7.3: Runtime type guards reject corrupted transaction records containing `NaN`, `Infinity`, or negative prices.
  - F7.4: Mortgage calculation engine enforces Zod schema validation and finite bounds on loan parameters.
  - F7.5: Two-sigma engine strictly sanitizes non-numeric and non-positive values without type leaks.

---

### Tier 2: Boundary Value Analysis & Singularity Defense
- **B1 (F1 Boundaries)**:
  - B1.1: `ApartmentChapterNavBar` with empty chapters array renders safely without exceptions.
  - B1.2: Selecting non-existent chapter ID falls back gracefully without out-of-bounds errors.
  - B1.3: Detached/null `scrollContainerRef` does not trigger ref read during render or unmount crash.
  - B1.4: `MacroTrendChart` with single data point ($N=1$) handles Bessel variance singularity ($s=0$, band collapse).
  - B1.5: `MacroTrendChart` with all identical prices renders flat mean line without zero-division in Y-axis scaling.
- **B2 (F2 Boundaries)**:
  - B2.1: Canonical presentation components handle null/undefined optional props with clean defaults.
  - B2.2: Rapid online/offline event flapping does not leave `OfflineBanner` in corrupted state.
  - B2.3: `ApartmentModal` receiving unmapped apartment name falls back cleanly to raw name.
  - B2.4: Preload helpers invoked with empty/null keys resolve safely without unhandled promise rejections.
  - B2.5: Unmounted modal handles pending dynamic import resolutions gracefully.
- **B3 (F3 Boundaries)**:
  - B3.1: `CompareHeaderSearch` with empty string or special regex characters does not throw regex parsing exceptions.
  - B3.2: Compare state with 0 apartments renders empty state prompt cleanly.
  - B3.3: Compare state with maximum allowed apartments blocks additional selections.
  - B3.4: DCF valuation with 0 jeonse price or 0 sale price returns fair fallback without division-by-zero.
  - B3.5: Compare spec table with missing optional fields (far, bcr, parking) renders dashes (`-`) safely.
- **B4 (F4 Boundaries)**:
  - B4.1: `normalizeAptName` with null, undefined, whitespace-only, or Korean jamo (NFD) returns sanitized NFC string.
  - B4.2: `isCancelledTransaction` with malformed date strings, null, or undefined flags evaluates safely to boolean.
  - B4.3: `generateCanonicalTxKey` with stringified vs numeric price/area/floor produces consistent deterministic key.
  - B4.4: Extreme exclusive area values (0.1 m², 500 m²) convert to valid non-NaN pyeong values.
  - B4.5: Raw API transaction records missing non-critical fields normalize without runtime exception.
- **B5 (F5 Boundaries)**:
  - B5.1: Filename sanitizer with extreme pathological names (e.g. `../../etc/passwd`, `CON`, `PRN`, `AUX`, `*?:|"<>`) strips traversal and illegal tokens.
  - B5.2: Chunk generator with empty transaction array generates valid empty array JSON payload.
  - B5.3: Massive transaction payload (10,000+ items) validates against schema without stack overflow.
  - B5.4: Corrupted or partial JSON string parsing fails gracefully via safe parse without unhandled exception.
  - B5.5: Document ID containing whitespace and Korean characters normalizes into safe Firestore doc ID.
- **B6 (F6 Boundaries)**:
  - B6.1: Rapid navigation clicking (10+ rapid clicks) does not cause race conditions in tab synchronization.
  - B6.2: AdSlot rendered with AdBlock enabled replaces ad cleanly with fallback card of identical height.
  - B6.3: Web worker statistics calculation on empty Float32Array ($N=0$) returns invalid state with zero metrics without NaN.
  - B6.4: Web worker mortgage amortization with 0% interest rate calculates exact L'Hôpital linear principal division ($P/n$).
  - B6.5: Stats calculation with extreme financial numbers ($10^{11}$ KRW) maintains double-precision arithmetic.
- **B7 (F7 Boundaries)**:
  - B7.1: Layout bounding box verification under extreme mobile viewport (320px) preserves non-zero geometry.
  - B7.2: AdSlot with custom className preserves base min-height bounding box invariants.
  - B7.3: Fast-check property-based fuzzing of mortgage engine with random principal, rate, and period produces 0 NaN and 0 negative values.
  - B7.4: Two-sigma engine fuzzing with random floats including negative, NaN, and Infinity isolates strictly positive finite numbers.
  - B7.5: Schema parser rejects prototype-pollution payloads (`__proto__`, `constructor`).

---

### Tier 3: Cross-Feature Interactions
- **C1 (F1 + F6 + F7: Navigation & Zero-CLS Layout & AdSense Invariance)**:
  User switches between 4 navigation tabs (`/`, `/explore`, `/mbti`, `/guide`), mounts pages containing `AdSlot`, verifying zero layout shift and preserved bounding boxes.
- **C2 (F1 + F2 + F4: MacroTrendChart & Pipeline Normalizer & 2SD Confidence Bands)**:
  `MacroTrendChart` receives data processed through data pipeline normalizer and `twoSigmaEngine`, updates timeframe toggle (3M -> 1Y -> ALL), and renders dynamic 2SD bands without layout displacement.
- **C3 (F3 + F4 + F5: Pipeline Output & Compare Subcomponents Integration)**:
  Raw transaction feeds are normalized by pipeline core, stored into sanitized JSON chunks, and consumed by `ComparePriceHistoryChart` and `CompareInsightCard` to display multi-complex comparisons.
- **C4 (F1 + F3 + F6: Chapter Navigation & DCF Valuation & Ad Refresh Engine)**:
  `ApartmentChapterNavBar` chapter switching synchronizes with `AdvancedValuationMetrics` DCF calculation and triggers ad refresh cycle via `adRefreshManager`.
- **C5 (F2 + F5 + F7: Canonical Presentation Modules & Schema Validation & Type Hardening)**:
  Canonical modal components consume sanitized public transaction chunks, validating runtime schemas and rendering responsive tables without type cast anomalies.

---

### Tier 4: Real-World Application Scenarios
- **S1 (First-Time Homebuyer Exploration Flow)**:
  User lands on D-VIEW home, views macro 2-column hero (donut and 2SD time-series trend), filters timeframe to 1Y, inspects price bands, and scrolls past inline AdSlot with zero layout shift.
- **S2 (Complex Deep-Dive & Chapter Navigation Flow)**:
  User opens apartment detail modal for a premier Dongtan complex, navigates across 8 discrete chapters (`01` to `08`) using `ApartmentChapterNavBar`, observes ad placement between chapters, and inspects mortgage LDI analysis.
- **S3 (Dual-Complex Comparison & Valuation Assessment Flow)**:
  Prospective buyer opens comparison tool, searches and selects two competing complexes via `CompareHeaderSearch`, compares radar scores, specs table, and historical price trajectories, and verifies DCF valuation under-pricing signal.
- **S4 (Data Ingestion & Static JSON Generation Flow)**:
  Data pipeline ingests mixed raw transaction records from MOLIT API, sanitizes apartment names, filters cancelled transactions, generates deterministic hash keys, and outputs validated per-apartment JSON chunks with sanitized filenames.
- **S5 (AdBlock Resilience & Offline Network Flap Flow)**:
  Mobile investor with active ad blocker uses D-VIEW while riding subway through poor network conditions; AdSlots gracefully display fallback cards with exact matching min-height, and `OfflineBanner` alerts user during offline disconnects without crashing active calculations.

---

## 4. Test Suite Execution Architecture
- **Framework**: Jest (`ts-jest`), `@testing-library/react`, `fast-check`
- **Location**: `frontend/src/__tests__/e2e_features/`
- **Target Test Files**:
  - `tier1_feature_coverage.test.tsx`
  - `tier2_boundary_corner.test.tsx`
  - `tier3_cross_feature.test.tsx`
  - `tier4_real_world_scenarios.test.tsx`
- **Test Runner Commands**:
  - Full E2E Suite: `npm test -- src/__tests__/e2e_features/`
  - Type Check: `npx tsc --noEmit`
  - Lint: `npm run lint`
  - Production Build: `npm run build`
