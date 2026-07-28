# Context & Requirements Summary

## Overview
D-VIEW (디뷰) mobile layout and chart rendering defense project.
Target: Fix and prevent mobile view content outline overflows/breaks and chart rendering errors across 320px~768px (portrait/landscape), modularize chart logic, optimize mobile rendering performance, and establish automated regression test coverage.

## Core Requirements

### R1. Mobile Layout & Outline Defense Refactoring
- Prevent content elements from breaking outside viewports or overlapping outlines across mobile devices (320px ~ 768px, portrait & landscape).
- Apply `min-width: 0`, overflow management, and responsive CSS (vw, %, rem) to Flexbox/Grid containers.

### R2. Graph/Chart Rendering Pipeline Defense Logic & Modularization
- Guarantee chart canvas/SVG dimensions & timing during dynamic mobile resize (ResizeObserver / orientationchange).
- Harden exception handling for chart data (null, undefined, empty array, abnormal viewport widths) to safely show Fallback UI without console errors.
- Separate chart calculation logic from UI DOM/Canvas drawing logic.

### R3. Mobile Performance Optimization & Regression Verification
- Minimize unnecessary re-renders and layout thrashing (reflow) on mobile devices.
- Create unit/integration test code and checklist verifying mobile content outline defense and chart output robustness.

## Working Directory
`c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\orchestrator_mobile_fix`
