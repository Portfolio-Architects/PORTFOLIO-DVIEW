# Execution Plan — DVIEW Mobile Apt Card UI Refactoring

## Objectives
1. **R1. Mobile Apt Card 2-Row Vertical Layout Refactoring**
   - In mobile viewports (< 480px), refactor apt card text layout into 2 rows:
     - Row 1: [New High Badge (신고가 뱃지)] + [Dong / Pyeong / Floor (동 / 평형 / 층수)]
     - Row 2: [Full Apt Name (아파트 Full Name)] (maximizing horizontal space to minimize text truncation)
2. **R2. Price & Detail Button Alignment Optimization**
   - Adjust vertical alignment and padding for the right price display (transaction price, change amount/rate) and [Detail (상세)] button.
3. **R3. Feed UI Consistency**
   - Apply consistent design specifications across all components rendering real transaction / new high timeline cards (`MacroDashboardClient.tsx`, `RealtimeClient.tsx`, and any other feed components).

## Milestones & Workflow

### Milestone 1: Codebase Exploration & Analysis
- **Goal**: Identify all components rendering apt transaction cards (e.g., `MacroDashboardClient.tsx`, `RealtimeClient.tsx`, reusable card components like `AptCard`, `TimelineCard`, etc.) and document current layout structure and styling (Tailwind CSS classes, flex/grid layouts).
- **Subagent**: Spawn 3 `teamwork_preview_explorer` instances for broad analysis.

### Milestone 2: Implementation & Refactoring
- **Goal**: Refactor the card layout to 2-row structure, optimize price and detail button alignment, and ensure all feed components share the updated layout or updated reusable component.
- **Subagent**: Spawn 1 `teamwork_preview_worker` to implement changes and verify build/type-check locally.

### Milestone 3: Multi-layer Verification & Hardening
- **Goal**: Rigorous review, empirical validation, and forensic integrity audit.
- **Subagents**:
  - 2 `teamwork_preview_reviewer` (Review correctness, UI consistency, code cleanliness)
  - 2 `teamwork_preview_challenger` (Test responsiveness across mobile viewports 360px ~ 430px)
  - 1 `teamwork_preview_auditor` (Forensic integrity verification)

### Milestone 4: Final Acceptance & Sentinel Reporting
- **Goal**: Confirm build/type-check status (`npx tsc --noEmit` and `npm run build`), verify acceptance criteria, and claim victory to Sentinel.
