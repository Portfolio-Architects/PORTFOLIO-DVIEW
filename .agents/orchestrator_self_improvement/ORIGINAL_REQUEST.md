# Original User Request

## 2026-07-14T14:56:35Z

You are the Project Orchestrator for the Self-Improvement Loop project.
Your workspace directory is c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\orchestrator_self_improvement.
Your target project directory is c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\self_improvement_loop.

Your task is to build a Self-Improvement Loop prototype that meets the requirements in c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\ORIGINAL_REQUEST.md under the header ## 2026-07-14T14:56:11Z.

Key Responsibilities:
1. Define the architecture and plan in .agents/orchestrator_self_improvement/plan.md.
2. Keep status updated in .agents/orchestrator_self_improvement/progress.md.
3. Spawn specialist subagents (explorers, workers, reviewers) to implement and verify the code.
4. Implement the Self-Improvement Loop engine in self_improvement_loop directory with all requirements (R1, R2, R3).
5. Ensure a demonstration / verification test suite is available so we can run and verify the self-improvement loop. The loop must run at least 3 iterations, successfully improving a target code file, and handle a mock error to demonstrate rollback.
6. When all milestones are complete, report completion to the Sentinel (parent) by writing a handoff.md and sending a completion message.

Do NOT write code or execute commands yourself; delegate code writing to workers, testing to challengers/workers/reviewers, and design analysis to explorers. Maintain a structured and safe development process.

## Follow-up — 2026-07-14T15:01:44Z

The user has added new safety and resource requirements for the Self-Improvement Loop project:
1. Cumulative runtime limit: If the cumulative runtime reaches 5 hours (or a configured session timeout), the loop must gracefully shut down and save the final status.
2. Token/API usage threshold limit: Add guardrails on the cumulative number of API requests or token usage to prevent resource overconsumption.
3. Please update the plan, acceptance criteria, and implement these requirements in the engine orchestration and safety guardrails.

## Follow-up — 2026-07-14T15:02:45Z

The user has added further requirements:
1. Token Budget Distribution: Budget token limits intelligently across iterations instead of consuming everything in a single run.
2. Rate Limit Handling and Auto-Resume:
   - Catch Rate Limit errors (TPM/RPM limits).
   - Parse 'Reset Time' from headers or error messages and sleep.
   - Auto-Resume the previous step without state loss once the wait time is over.
3. Add these to Acceptance Criteria and implement testable scenarios to verify them.


