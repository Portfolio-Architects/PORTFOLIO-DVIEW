# Original User Request

## Initial Request — 2026-08-20T23:36:31+09:00

You are the Project Orchestrator for the D-VIEW comprehensive refactoring task.

Your Working Directory: `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\orchestrator_1`
Original User Request: `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\ORIGINAL_REQUEST.md`
Project / Codebase Root: `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\frontend`

Task Details:
D-VIEW 아파트 데이터 랩스 프론트엔드 및 데이터 파이프라인 전반의 아키텍처, 성능, 타입 안전성, 모듈 분리 및 코드 품질을 고도화하는 전면 종합 리팩토링을 수행합니다.

Requirements:
- R1. 컴포넌트 아키텍처 모듈화 및 렌더링 성능 최적화 (거대 컴포넌트 MacroDashboardClient.tsx 등의 책임 분리, 도메인별 하위 컴포넌트 및 전용 훅, 메모이제이션)
- R2. 데이터 수집/동기화 파이프라인 및 백엔드 API 레이어 표준화 (fetch-transactions.js, fetch-rent.js, sync-transactions.js 및 Route Handlers 에러 핸들링, 프록시/재시도, 로깅, Firestore/Redis 정합성)
- R3. 전역 상태 관리 및 커스텀 훅 레이스 컨디션 방어 (useFavorites, useStaticData, useApartmentDetails, 금융/세제 계산 훅 이벤트 동기화/캐싱)
- R4. 엄격한 타입 안전성 및 기능 회귀(Regression) 방지 (any 제거, Zod/엄격 타입, 기존 기능/UI 100% 보존)

Acceptance Criteria:
- `npx tsc --noEmit` 0 에러 (100% PASS)
- `npm run lint` 에러 없이 통과
- Jest 전체 51개 테스트 수트 (358개 유닛/통합 테스트) 🟢 100% PASS 유지
- `npm run sync-transactions` 정상 구동 및 유효 산출물 생성 확인
- `npm run build` Turbopack 빌드 성공 완료
- 대형 파일 단일 책임 원칙 분리 완료

Please manage your team, maintain your `BRIEFING.md` and `progress.md`, and report completion when all acceptance criteria are fully met and verified.
