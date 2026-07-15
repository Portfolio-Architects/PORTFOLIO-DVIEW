# Project Context

## Overview
- Project Name: DVIEW 2nd-Phase UX Environment Enhancement
- Directory: `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW`
- Goal: Apply Apple HIG styling (acrylic/glassmorphism, fine borders, focus states) and perform React performance optimization (memoization, dynamic import) across Lounge feed, Lounge detail, Lounge compose, comments, news, office explorer, and gap investment explorer.

## Target Files
- `frontend/src/components/LoungeFeedClient.tsx`
- `frontend/src/components/LoungeDetailClient.tsx`
- `frontend/src/components/LoungeComposeClient.tsx`
- `frontend/src/components/CommentSection.tsx`
- `frontend/src/app/news/NewsClient.tsx`
- `frontend/src/components/OfficeExplorerClient.tsx`
- `frontend/src/components/GapInvestmentExplorer.tsx`

## Verification Tests & Commands
- Unit/E2E Tests: `frontend/tests/ui-ux-audit.spec.ts`
- Build Check: `npm run build` inside `frontend`
- Audit Pipeline: `npm run audit` inside `frontend`
