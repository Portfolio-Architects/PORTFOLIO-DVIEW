# Execution Plan

## Milestones and Subtasks

### Milestone 1: Frontend UI/UX & Performance Audit
- **Objective**: Identify layout, classes, imports, and styling of buttons and target components, and analyze Next.js build setup.
- **Agent**: `teamwork_preview_explorer` (Conv ID: TBD)
- **Output**: Detailed audit report listing target files, styles, dynamic loading opportunities, and performance bottlenecks.
- **Verification**: Handoff report with findings.

### Milestone 2: Techno Lab Header Buttons Refactor
- **Objective**: Change header buttons' text to be intuitive and apply Apple HIG styling (Glassmorphism, hover/active scaling, smooth transitions).
- **Agent**: `teamwork_preview_worker` (Conv ID: TBD)
- **Reviewer**: `teamwork_preview_reviewer` (Conv ID: TBD)
- **Verification**: Reviewer confirmation of styling and interactive changes.

### Milestone 3: Service Components Apple HIG Refactor
- **Objective**: Refactor `ApartmentModal.tsx`, `SettingsModal.tsx`, and `MacroTrendChart.tsx` (rounded-[20px]+, minimal shadows, HSL premium colors, smooth transitions).
- **Agent**: `teamwork_preview_worker` (Conv ID: TBD)
- **Reviewer**: `teamwork_preview_reviewer` (Conv ID: TBD)
- **Verification**: Reviewer confirmation of HIG styles.

### Milestone 4: Runtime & Speed Optimizations
- **Objective**: Implement dynamic imports, React.memo/useCallback/useMemo, skeleton UIs to prevent CLS, and ensure no Framer Motion/heavy libraries are added.
- **Agent**: `teamwork_preview_worker` (Conv ID: TBD)
- **Reviewer**: `teamwork_preview_reviewer` (Conv ID: TBD)
- **Verification**: Build speed/bundle size inspection and code review.

### Milestone 5: Build Verification & Final Auditing
- **Objective**: Execute `npm run build` to verify clean build, and run Forensic Auditor.
- **Agent**: `teamwork_preview_worker` (for build) + `teamwork_preview_auditor` (for integrity check)
- **Verification**: Build exit code 0, Clean Auditor report.
