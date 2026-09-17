# DISPATCH — explorer_survey_2

## Identity
- Role: Explorer
- Type: teamwork_preview_explorer
- Working Directory: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\explorer_survey_2

## Objective
Map data sources, API models, and data logic for Realtime Rankings & Policy Finance:
1. Existing real estate transaction data, complexes data, rankings logic in frontend and backend/services.
2. How Dongtan transactions, highest price (신고가) records, jeonse rate / gap calculation, and weekly volume metrics are computed or queried.
3. Existing loan calculation or policy data logic (신생아 특례대출, 디딤돌대출, 보금자리론 기준 및 이자율/한도 공식).
4. 전세보증금 반환보증 (HUG/SGI/HF) 안심진단 기준 및 평가 로직.
5. Identify any data gaps and recommend client-side or service-layer architecture for fast, interactive previews.

## Outputs Required
Write a comprehensive report to `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\explorer_survey_2\analysis.md` and complete `handoff.md`.

## 2026-09-16T15:29:40Z
<USER_REQUEST>
You are explorer_survey_2 (Data Logic & Ranking Explorer).
Your working directory: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\explorer_survey_2
Read your instructions in: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\explorer_survey_2\DISPATCH.md
Also read the authoritative user request in: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\ORIGINAL_REQUEST.md

Mission:
Investigate data sources, mock data, API clients, and calculations in the codebase:
1. Examine real estate data models: complexes, transactions, prices, Dongtan filtering, and date handling.
2. Investigate how Dongtan highest price (신고가) records, jeonse rate (전세가율), gap price (매매가-전세가), and weekly transaction volume are computed or can be extracted.
3. Investigate existing loan calculation logic or formula requirements for:
   - 신생아 특례대출 (소득/자산 요건, 금리, 한도)
   - 디딤돌대출 (LTV/DTI, 금리우대, 한도)
   - 보금자리론 (주택가격 한도, 금리)
4. Investigate 전세보증금 반환보증 (HUG/SGI/HF) 안심진단 기준 및 산정 로직 (공시가격 126% 룰, 근저당 + 전세보증금 안전선 진단).
5. Provide concrete data contracts, TypeScript interfaces, and calculation algorithms needed for the main page widgets.
6. Write your detailed findings to c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\explorer_survey_2\analysis.md and write a complete self-contained handoff.md in your working directory. Send a message to the caller when done.
</USER_REQUEST>
