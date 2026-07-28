# Self-Improvement Run 6 Decomposition Plan & Contracts

## Overview
This run executes the 2nd Recursive Self-Improvement Loop for DVIEW Web/App based on requirements R1 - R4 in `ORIGINAL_REQUEST.md`.

## Architecture & Scope Boundaries
- Scope: Frontend App (`frontend/src/`, `frontend/public/`, `frontend/tests/`, `frontend/scripts/`)
- Language: TypeScript / Next.js App Router / React / Tailwind / Chart libraries (ECharts / Chart.js / Canvas) / SWR / Service Worker

## Milestones

| # | Name | Scope | Key Contracts & Criteria | Dependencies | Status |
|---|------|-------|--------------------------|--------------|--------|
| 1 | Baseline Exploration & Codebase Analysis | `frontend/` source, build, test baseline analysis | Comprehensive report on existing mobile UI touch handlers, chart streaming, memory cleanup, network status handling, and existing test suites | none | IN_PROGRESS |
| 2 | R1: Mobile 60FPS UI & Zero CLS Optimization | Touch handlers, dynamic layout transforms, mobile modal/dock/tab transitions | 60FPS interactive scroll/tabs/modals, main thread blocking elimination, CLS < 0.01, GPU-accelerated CSS transform/opacity | 1 | PLANNED |
| 3 | R2: High-Volume Chart Streaming & Memory Leak Defense | Chart data streams, canvas/SVG rendering, lifecycle RAF & event listener cleanup | Zero memory leak after 10 continuous re-renders (Heap growth < 5%), GC pressure reduction, strict unmount RAF & listener cancellation | 1 | PLANNED |
| 4 | R3: Network Latency / Offline Defense & Auto-Sync | Offline detectors, SWR fallback UI, Skeleton components, reconnection auto-sync | Instant Skeleton / Stale UI on 3G/Slow/Offline, auto-reconnection data sync pipeline without crash or loss | 1 | PLANNED |
| 5 | R4: Automated Performance Benchmark & Final Verification | `frontend/scripts/benchmark.ts`, Playwright E2E benchmarks, Jest unit/integration suite, Forensic Audit | 100% Jest & Playwright tests passing, automated FPS/CLS/Heap benchmark runner operational, Clean Forensic Integrity Audit | 2, 3, 4 | PLANNED |

## Interface Contracts & Guidelines
- **Mobile Touch & GPU**: Use passive event listeners, touch-action CSS, transform/opacity for animations, React.memo and dynamic imports where appropriate to guarantee 60FPS and 0 layout shifts.
- **Chart Lifecycle**: All RAF callbacks and window/element listeners must be registered with cleanup tokens in `useEffect`/`useLayoutEffect` hooks. Disposing chart instances on component unmount is strictly enforced.
- **Network Resilience**: Network status state machine with `navigator.onLine` listener, SWR fallback data structures, and graceful Skeleton placeholders.

## Verification Criteria
- `npm run build` succeeds with exit code 0 and 0 compiler warnings.
- `npm test` passes 100% of unit/integration tests.
- Benchmark script confirms FPS >= 60, CLS < 0.01, Heap growth <= 5%.
- Forensic Auditor confirms zero hardcoding, zero facade implementations, clean integrity audit.
