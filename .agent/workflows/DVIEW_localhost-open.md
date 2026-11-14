---
description: 로컬 개발 서버(포트 5000) 실행 워크플로우
enforces:
  - .agent/rules/DVIEW_DRSP.md
  - .agent/rules/DVIEW_strict-real-data-only.md
  - DVIEW_DESIGN.md
---

# 로컬 개발 서버 실행 워크플로우

사용자가 "로컬호스트 오픈" 또는 이와 유사한 프롬프트를 입력하면 [`DVIEW_AGENT.md`](../../DVIEW_AGENT.md)의 토큰 다이어트 수칙 및 전역 불변식([`DVIEW_DRSP.md`](../rules/DVIEW_DRSP.md), [`DVIEW_strict-real-data-only.md`](../rules/DVIEW_strict-real-data-only.md), [`DVIEW_DESIGN.md`](../../DVIEW_DESIGN.md))을 준수하며 다음 단계만 간결하게 실행합니다.

1. **개발 서버 상태 확인 및 실행**:
   - `manage_task` 도구(`Action: "list"`)를 통해 `npm run dev` 개발 서버 태스크가 이미 실행 중인지 확인합니다.
   - 실행 중이지 않다면(루트에는 `package.json`이 없고 명령 호출 간 작업 디렉토리가 유지되지 않으므로) 단일 PowerShell 명령으로 `frontend` 디렉토리에서 `npm run dev`(포트 5000)를 백그라운드 데몬(`IsDaemon: true`)으로 실행합니다.
   ```powershell
   Set-Location frontend; npm run dev
   ```
   - 에이전트 가이드([`DVIEW_AGENT.md`](../../DVIEW_AGENT.md))나 대형 리포트 문서([`DVIEW_PORTFOLIO DVIEW - Engineering Report.md`](../../DVIEW_PORTFOLIO%20DVIEW%20-%20Engineering%20Report.md) 등)를 아티팩트 디렉토리에 복제 생성하는 작업은 수행하지 않습니다.
