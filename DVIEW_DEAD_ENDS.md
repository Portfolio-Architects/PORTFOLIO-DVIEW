# Dead Ends — DVIEW Architecture Refactoring

| Iteration | Approach Tried | Why It Failed | Files Touched |
|-----------|---------------|---------------|---------------|
| 4 (M3 R1) | 코드 수정 전 베이스라인 스트레스 테스트 선행 실행 | `useAptComparison.ts` 원본 무한 리렌더 루프로 인해 Jest 워커 힙 OOM 및 수십만 행 로그 발생으로 테스트 태스크 행 유발 | `frontend/src/components/consumer/hooks/useAptComparison.ts` |
| 5 (M3 R2) | 동결 싱글톤 및 단순 setter 가드만 적용 후 다중 단지 순차 saveToRecent 방치 | `initialAptIds.length >= 2` 시 `saveToRecent(A)` 후 `saveToRecent(B)` 순차 호출로 인해 `recentApts` 배열 순서가 교번 핑퐁 진동($S_0 \to S_1 \to S_2$)하여 `Maximum update depth exceeded` 유발. 또한 `useValuationMetrics.ts` SWR 콜백 내 동일성 가드 부재로 무한 갱신 루프 발생 | `frontend/src/components/consumer/hooks/useAptComparison.ts`, `frontend/src/lib/hooks/useValuationMetrics.ts` |
