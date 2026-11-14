---
description: DVIEW 프로젝트 코드 변경 후 Git 커밋 & 푸시 워크플로우 (경량화)
enforces:
  - .agent/rules/DVIEW_DRSP.md
  - .agent/rules/DVIEW_strict-real-data-only.md
  - DVIEW_DESIGN.md
---

# DVIEW Git Commit & Push 워크플로우

사용자가 커밋 또는 푸시를 요청하면 [`DVIEW_AGENT.md`](../../DVIEW_AGENT.md)의 토큰 다이어트 수칙 및 전역 불변식([`DVIEW_DRSP.md`](../rules/DVIEW_DRSP.md), [`DVIEW_strict-real-data-only.md`](../rules/DVIEW_strict-real-data-only.md), [`DVIEW_DESIGN.md`](../../DVIEW_DESIGN.md))에 따라 불필요한 대형 리포트 문서([`DVIEW_PORTFOLIO DVIEW - Engineering Report.md`](../../DVIEW_PORTFOLIO%20DVIEW%20-%20Engineering%20Report.md), [`DVIEW_PORTFOLIO DVIEW - Patch History.md`](../../DVIEW_PORTFOLIO%20DVIEW%20-%20Patch%20History.md) 등) 자동 수정을 생략하고 프로젝트 루트 디렉토리 기준으로 다음 순서만 간결하게 수행합니다. (단, 사용자가 패치노트나 리포트 문서 갱신을 명시적으로 함께 요청한 경우에만 해당 문서를 수정합니다.)

1. **변경 파일 스테이징 (프로젝트 루트 기준)**:
   ```powershell
   git add -A
   ```

2. **변경 내역 커밋 (프로젝트 루트 기준)**:
   ```powershell
   git commit -m "<type>: <한글 요약>"
   ```
   - 커밋 타입: `feat`, `fix`, `style`, `refactor`, `docs`, `chore`

3. **원격 저장소 푸시 (명시적 푸시 지시 시에만 실행)**:
   - 사용자가 직접 **"푸시"**(`push`, `git push`)를 요청한 경우에만 실행합니다. "커밋"만 요청한 경우 2단계까지만 수행하고 완료합니다.
   ```powershell
   git push
   ```
