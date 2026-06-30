---
description: 로컬 개발 서버 실행 및 AGENT.md, 엔지니어링 리포트 아티팩트 노출
---

# 로컬 개발 환경 및 문서 자동 노출 워크플로우

사용자가 "로컬호스트 오픈" 또는 이와 유사한 프롬프트를 입력하면 다음 단계를 실행합니다.

1. **개발 서버 상태 확인 및 실행**:
   - `manage_task` 도구를 통해 `npm run dev` 태스크가 이미 실행 중인지 확인합니다.
   - 실행 중이지 않다면 `frontend` 디렉토리에서 `npm run dev`를 백그라운드 태스크로 실행합니다.
   ```powershell
   # frontend 디렉토리에서 실행
   npm run dev
   ```

2. **에이전트 가이드(AGENT.md) 오픈**:
   - `AGENT.md`와 `PORTFOLIO DRIVE - Engineering Report.md`를 아티팩트 디렉토리에 파일로 생성하여, 아티팩트 사이드바(Artifact Sidebar) 탭으로 노출합니다.
