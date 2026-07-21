## 2026-07-21T13:29:16Z
You are an Explorer subagent for the D-VIEW Web Application Data Integrity & Audit Suite project.
Your working directory: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\explorer_audit_1
Project root: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW

Your objective is to conduct a thorough exploration of all data layer services, tax simulation formulas, matching scoring algorithms, data parsers, Zod validation schemas, caching layers, and automated test scripts in the D-VIEW codebase (`frontend/`).

Specifically:
1. Locate and inspect all tax reduction simulation formulas (acquisition tax, property tax, corporate tax reduction rates for Dongtan Techno-Valley migration). Check against local tax ordinances and identify any potential precision errors, floating point rounding drift, or edge-case bugs.
2. Locate and inspect Office FitFinder and Share-Office roommate matching scoring logic. Check scoring algorithms, weighting, normalization, and corner-case handling.
3. Locate and inspect data mapping and Zod validation schemas across:
   - Google Sheets SSOT parser/loader
   - Ministry of Land XML transaction APIs parser
   - Hwaseong enterprise data parser
   - Firestore DB schemas/models
   - Upstash Redis L2 caching and SWR synchronization hooks
4. Inspect `frontend/package.json` and existing test scripts (npm test, npm run audit, etc.). Run baseline build (`npm run build`), unit tests (`npm test`), and audit check (`npm run audit` or check if `audit` script is defined and what it does).
5. Document all file locations, current implementations, identified flaws/bugs, missing tests, and concrete recommendations.

Write your findings to `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\explorer_audit_1\analysis.md` and deliver a handoff report when complete. Send a message to the orchestrator with the link to your report.
