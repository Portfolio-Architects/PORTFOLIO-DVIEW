---
description: 로컬 개발 서버 실행 및 AGENT.md, 엔지니어링 리포트 페이지 동시 오픈
---

# 로컬 개발 환경 및 문서 자동 오픈 워크플로우

사용자가 "로컬호스트 오픈" 또는 이와 유사한 프롬프트를 입력하면 다음 단계를 실행합니다.

1. **개발 서버 상태 확인 및 실행**:
   - `manage_task` 도구를 통해 `npm run dev` 태스크가 이미 실행 중인지 확인합니다.
   - 실행 중이지 않다면 `frontend` 디렉토리에서 `npm run dev`를 백그라운드 태스크로 실행합니다.
   ```powershell
   # frontend 디렉토리에서 실행
   npm run dev
   ```

2. **에이전트 가이드(AGENT.md) 및 엔지니어링 리포트 페이지 오픈**:
   - 개발 서버가 구동되면(또는 이미 구동 중이면), `run_command` 도구를 사용하여 에이전트 가이드 파일과 로컬 엔지니어링 리포트 페이지를 동시에 오픈합니다.
   - 작업 디렉토리: 프로젝트 루트 디렉토리
   ```powershell
   # 에이전트 가이드(AGENT.md) 오픈
   start AGENT.md

   # 엔지니어링 리포트 페이지 오픈 (Next.js 로컬 서버)
   start http://localhost:5000/engineering
   ```
