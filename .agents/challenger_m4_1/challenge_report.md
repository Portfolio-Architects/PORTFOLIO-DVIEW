# Adversarial Challenge Report — Challenger 1

**Target Component**: D-VIEW Frontend (`tests/performance-ux.spec.ts`, `tests/ui-ux-audit.spec.ts`)  
**Auditor**: Challenger 1 (Empirical Verification of Sub-100ms Navigation, Tab Switching & CLS)  
**Date**: 2026-07-21  

---

## Challenge Summary

**Overall risk assessment**: **LOW**

All performance and UX criteria specified for Milestone 4 were empirically validated using automated Playwright E2E test suites and dedicated browser runtime timing probes:
- **Tab Switching Latency**: Toggling between Data Lab ("사무실 탐색") and Apartment Lab ("아파트 랩") completes in **35ms - 39ms** (in-browser frame latency), comfortably satisfying the **< 100ms** threshold.
- **Cumulative Layout Shift (CLS)**: Measured at **0.0441** during Lounge Modal open transitions and **0.0365** during Apartment Detail Modal open transitions, remaining strictly within the **< 0.05** target (and Google Web Vitals < 0.1 limit).
- **Accordion Lazy Rendering**: DOM footprint reduction verified — collapsed company grids are fully unmounted from the DOM tree.
- **CSS-only Micro-Interactions**: Donut chart slice hover uses pure CSS scale transform (`transform-origin: 50% 50%`) with zero JS reflows.
- **Offline / Unavailable Dependency Resilience**: Lounge Modal handles Firestore client disconnection gracefully, replacing the loading spinner with fallback text (`글을 찾을 수 없습니다`) without unhandled React crashes or layout shifts.

---

## Challenges

### [Low] Challenge 1: Cold Initial Tab Switch Chunk Loading Delay

- **Assumption challenged**: Tab switching speed is uniform across all user interactions regardless of browser cache or initial bundle state.
- **Attack scenario**: When a user accesses `/overview` for the first time without prewarming or preloading, clicking on "사무실 탐색" requires Next.js to dynamically fetch the `OfficeExplorerClient` bundle via `dynamic(() => import(...))`. On slow mobile network connections (3G/4G), initial chunk loading can take > 1s before the keep-alive state is established.
- **Blast radius**: Low. Only affects the initial load of a tab on first click. Subsequent switches are instant keep-alive CSS toggles (**35ms - 39ms**).
- **Mitigation**: Implement hover-triggered or idle-callback dynamic chunk preloading (`preloadDashboardFeatures`) on header navigation items.

### [Low] Challenge 2: Minor Color Contrast Violation on Navigation Badges

- **Assumption challenged**: All UI text elements meet WCAG 2 AA accessibility contrast ratio thresholds.
- **Attack scenario**: Axe-Core automated audit flagged `.shadow-[0_2px_12px_rgba(0,0,0,0.06)] > span` ("아파트 탐색") for a minor color contrast shortfall between text foreground and shadow-effect background under specific theme settings.
- **Blast radius**: Low. Visual legibility is slightly impaired for low-vision users on specific monitor color profiles.
- **Mitigation**: Adjust text font weight or increase contrast token brightness for `.shadow-[0_2px_12px_rgba(0,0,0,0.06)] > span`.

---

## Stress Test Results

| Test Scenario | Target Metric | Measured Empirical Result | Status |
| :--- | :--- | :--- | :--- |
| **Keep-Alive Tab Switching** (Apartment Lab ↔ Data Lab) | Latency < 100ms | **35ms - 39ms** (In-browser frame timing) | **PASS** |
| **Lounge Modal Open Transition** | CLS < 0.05 | **0.0441** | **PASS** |
| **Apartment Modal & Overview Audit** | CLS < 0.05 | **0.0365** | **PASS** |
| **Accordion Lazy Rendering** | DOM Node Detached when Collapsed | Company grid fully unmounted (`.not.toBeAttached()`) | **PASS** |
| **Donut Chart Hover Animation** | CSS-only Transform (No Reflow) | Class: `hover:scale-105 transition-transform duration-300 origin-center`<br/>Style: `transform-origin: 50% 50%; will-change: transform` | **PASS** |
| **Offline Firestore Disconnection** | Graceful UI Fallback & No Layout Shift | Fallback `글을 찾을 수 없습니다` rendered, spinner cleared, CLS = 0.0441 | **PASS** |

---

## Unchallenged Areas

- **Production API Server Latency under High Concurrency**: Tested using local Next.js dev/production build server; actual production network latency under database load was out of scope for local E2E run.
