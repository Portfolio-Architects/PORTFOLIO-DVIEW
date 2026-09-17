# DISPATCH — worker_m1_1

## Identity
- Role: Worker
- Type: teamwork_preview_worker
- Working Directory: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\worker_m1_1

## Scope & Authoritative References
- Authoritative User Request: `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\ORIGINAL_REQUEST.md` (Section `## 2026-09-16T15:20:16Z`)
- Project Scope Document: `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\orchestrator_adsense_main\PROJECT.md`

## Exclusively Owned Files
- `frontend/src/lib/utils/policyLoanCalculators.ts`
- `frontend/src/lib/utils/jeonseSafetyCalculators.ts`
- `frontend/src/components/finance/PolicyLoanQuickWidget.tsx`
- `frontend/src/components/finance/JeonseGuaranteeQuickPreview.tsx`
- `frontend/src/components/finance/HighCpcFinanceSection.tsx`

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Detailed Requirements (M1: High-CPC Finance Section)
1. Implement `policyLoanCalculators.ts`:
   - Functions: `calculatePolicyLoan(params)` supporting:
     - `NEWBORN` (신생아 특례대출): Home price <= 9억, Income <= 1.3억 (맞벌이 2억), max limit 5억, interest rate 1.6% ~ 3.3%, monthly payment estimate.
     - `DIDIMDOL` (디딤돌대출): Home price <= 5억 (신혼/다자녀 6억), Income <= 6000만 (신혼 8500만), max limit 2.5억 ~ 4억, interest rate 2.65% ~ 3.95%.
     - `BOGEUMJARI` (보금자리론): Home price <= 6억, Income <= 7000만 (신혼 8500만, 다자녀 1억), max limit 3.6억 ~ 4.2억, interest rate 3.9% ~ 4.2%.
   - Full TypeScript types as defined in `PROJECT.md § Interface Contracts`.

2. Implement `jeonseSafetyCalculators.ts`:
   - Function: `evaluateJeonseSafety(params)` supporting:
     - HUG 126% rule: `guaranteeLimitWon = officialPrice * 1.4 * 0.9` (or `estimatedPrice * 0.9` when officialPrice not given).
     - `debtRatioPercent = ((seniorMortgage + jeonseDeposit) / guaranteeLimitWon) * 100`.
     - Risk levels:
       - `SAFE` (안전, ratio <= 70%, green theme, "전세보증보험 100% 안전 가입 가능")
       - `CAUTION` (주의, 70% < ratio <= 90%, yellow theme, "보증가입 가능하나 선순위 근저당 감액 확인 필요")
       - `DANGER` (위험, ratio > 90%, red theme, "126% 기준 초과 위험! 전세보증금 반환 거절 우려")

3. Implement `PolicyLoanQuickWidget.tsx`:
   - Responsive, elegant card with loan type tabs (신생아 특례 / 디딤돌 / 보금자리론).
   - Fast interactive presets for house price (5억, 7억, 9억) and income (5천만, 8천만, 1.3억).
   - Dynamic real-time calculation of max limit, lowest interest rate, and monthly payment.
   - Deep-link button: "상세 대출 시뮬레이터 열기" calling optional `onOpenMortgageModal` or custom callback.

4. Implement `JeonseGuaranteeQuickPreview.tsx`:
   - Interactive quick diagnosis inputs: House price / deposit / mortgage sliders or numeric inputs.
   - Visual safety status pill / badge, calculated debt ratio, and HUG guarantee eligibility indicator.
   - Deep-link button: "전세 안심진단 상세 리포트" calling optional `onOpenJeonseSafetyModal` or custom callback.

5. Implement `HighCpcFinanceSection.tsx`:
   - Dual-card grid container hosting `PolicyLoanQuickWidget` and `JeonseGuaranteeQuickPreview`.
   - Responsive: single column on mobile, 2-column grid on desktop (`grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6`).
   - High-CPC keyword badges and clear typography.

6. Verification Requirements:
   - Run `npx tsc --noEmit` -> MUST pass with 0 errors.
   - Run `npx jest` -> MUST pass with 0 regressions.
   
## 2026-09-16T15:44:17Z
You are worker_m1_1 (M1 Worker).
Working directory: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\worker_m1_1
Read your instructions in: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\worker_m1_1\DISPATCH.md
Authoritative User Request: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\ORIGINAL_REQUEST.md
Scope Document: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\orchestrator_adsense_main\PROJECT.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Exclusively Owned Files:
- frontend/src/lib/utils/policyLoanCalculators.ts
- frontend/src/lib/utils/jeonseSafetyCalculators.ts
- frontend/src/components/finance/PolicyLoanQuickWidget.tsx
- frontend/src/components/finance/JeonseGuaranteeQuickPreview.tsx
- frontend/src/components/finance/HighCpcFinanceSection.tsx

Mission:
Implement all M1 components and calculations with genuine logic and full interactive state.
1. Implement `policyLoanCalculators.ts` with authentic 2025/2026 Korean policy loan formulas (신생아 특례, 디딤돌, 보금자리론).
2. Implement `jeonseSafetyCalculators.ts` with authentic HUG 126% rule and risk assessment formulas.
3. Implement `PolicyLoanQuickWidget.tsx`, `JeonseGuaranteeQuickPreview.tsx`, and `HighCpcFinanceSection.tsx`.
4. Run `npx tsc --noEmit` and `npx jest` in frontend directory and verify 0 errors and 0 regressions.
5. Write handoff.md and send a completion message to the caller.
