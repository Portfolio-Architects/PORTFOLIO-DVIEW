## 2026-08-05T14:43:24Z
<USER_REQUEST>
You are a teamwork_preview_explorer assigned to investigate Requirement R2: Firestore DB Upsert & Data Integrity.
Your working directory is: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\teamwork_preview_explorer_r2_1
You MUST create your working directory if it does not exist, initialize BRIEFING.md and progress.md, and read the original user request at:
c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\ORIGINAL_REQUEST.md

Scope of Investigation:
1. Locate and analyze Firestore DB schema and transaction upsert functions (especially for `transactions` collection).
2. Inspect unique composite key (`_key`) generation logic for rent transactions to prevent duplicates while preventing accidental key collisions across different transaction types ('전세'/'월세' vs '매매').
3. Examine Firestore query filters, composite index definitions (`firestore.indexes.json`), and query logic.
4. Examine unit area and type mapping (`TYPE_MAP`, `areaPyeong` calculation formula, `excluUseAr` conversion).
5. Identify any data corruption, missing key fields, duplicate records, or indexing bugs.
6. Propose precise, actionable fix strategies for Worker implementation.

Constraints:
- You are READ-ONLY. Do NOT modify any source code files.
- Write your complete findings and handoff report to: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\teamwork_preview_explorer_r2_1\handoff.md
- When finished, send a message to the orchestrator with a summary and link to handoff.md.
</USER_REQUEST>
