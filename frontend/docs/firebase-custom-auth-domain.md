# Firebase Auth 커스텀 도메인(Custom Domain) 설정 가이드

본 문서는 로그인 팝업 및 리디렉션 과정에서 Firebase 기본 호스팅 도메인(`[project-id].firebaseapp.com`)이 노출되는 것을 방지하고, 서비스의 신뢰성과 보안성을 강화하기 위해 커스텀 도메인(`auth.yourdomain.com` 또는 `yourdomain.com`)을 Firebase Auth에 매핑하는 방법을 설명합니다.

---

## 1. 개요 및 목적

Firebase Auth의 `signInWithPopup` 또는 `signInWithRedirect` 메서드를 사용하는 소셜 로그인(구글 로그인 등)은 로그인 단계에서 사용자를 인증 공급자 페이지로 보낸 후, Firebase가 관리하는 호스팅 도메인을 통해 인증 토큰을 전달받습니다. 

이때 브라우저 주소창에 `[project-id].firebaseapp.com` 형태의 주소가 노출될 경우, 사용자는 다음과 같은 우려를 할 수 있습니다.
- "내가 접속한 서비스와 주소가 다른데 피싱 사이트가 아닌가?"
- "개인정보나 로그인 세션이 제3의 알 수 없는 도메인으로 넘어가는 것인가?"

이를 해결하기 위해 서비스 고유의 커스텀 도메인을 인증 도메인(`authDomain`)으로 설정하면, 사용자는 본래 서비스의 서브도메인 환경 안에서 안심하고 로그인을 진행할 수 있습니다.

---

## 2. 설정 단계

### 1단계: Firebase Console에 승인된 도메인 추가
1. [Firebase Console](https://console.firebase.google.com/)에 접속하여 프로젝트를 선택합니다.
2. 왼쪽 메뉴에서 **Authentication** > **설정** > **승인된 도메인** 탭으로 이동합니다.
3. **도메인 추가** 버튼을 클릭하고 사용할 커스텀 도메인(예: `auth.yourdomain.com` 혹은 메인 도메인 `yourdomain.com`)을 입력하여 등록합니다.

### 2단계: Firebase Hosting에 서브도메인 연결 및 DNS 레코드 등록
인증 핸들러가 커스텀 도메인 상에서 정상 작동하려면 해당 서브도메인이 Firebase Hosting에 연결되어 인증 서비스 레코드를 처리할 수 있어야 합니다.
1. Firebase Console 메뉴에서 **Hosting**으로 이동합니다.
2. **커스텀 도메인 추가**를 클릭하고, 인증 도메인으로 등록한 서브도메인(예: `auth.yourdomain.com`)을 입력합니다.
3. 제공되는 DNS 설정(A 레코드 또는 TXT 레코드 정보)을 도메인 구입처(가비아, Cloudflare 등)의 DNS 관리 페이지에 등록하여 소유권 인증 및 도메인 연결을 마칩니다.
4. SSL 인증서 발급 및 배포가 완료될 때까지 대기합니다. (보통 수 분 ~ 수 시간 소요)

### 3단계: Google Cloud Console OAuth 리디렉션 URI 등록
구글 로그인과 같은 OAuth 2.0 제공업체는 사전에 등록된 안전한 리디렉션 URI만 허용합니다.
1. [Google Cloud Console](https://console.cloud.google.com/)에 접속하여 DRIVE에 해당하는 Firebase 프로젝트를 선택합니다.
2. **API 및 서비스** > **사용자 인증 정보** 메뉴로 이동합니다.
3. **OAuth 2.0 클라이언트 ID** 섹션에서 웹 애플리케이션 클라이언트 ID를 클릭하여 수정 화면으로 진입합니다.
4. **승인된 리디렉션 URI** 항목에 커스텀 도메인 경로를 추가합니다:
   ```
   https://auth.yourdomain.com/__/auth/handler
   ```
   *(주의: 끝의 `/__/auth/handler` 경로를 정확히 입력해야 합니다.)*
5. 수정을 저장합니다. (반영에 최대 수 분이 소요될 수 있습니다.)

### 4단계: 애플리케이션 환경변수 업데이트
연결이 완료되면 로컬 개발 환경 및 배포 플랫폼(Vercel 등)의 환경변수를 갱신합니다.
1. `.env.local` 파일에서 `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` 변수를 새로 매핑한 커스텀 도메인 주소로 변경합니다.
   ```ini
   # 기존 설정
   # NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=portfolio-dtdls.firebaseapp.com

   # 커스텀 도메인 설정 적용
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=auth.yourdomain.com
   ```
2. 프로덕션 빌드 및 배포를 수행합니다.

---

## 3. 설정 확인 및 테스트 방법

1. 브라우저 캐시를 지우거나 시크릿 창을 엽니다.
2. DRIVE 로그인 버튼(소셜 로그인)을 클릭합니다.
3. 구글 로그인 팝업창 상단의 클라이언트 이름 및 주소창 정보를 확인합니다.
4. 주소창 및 인증 처리가 `auth.yourdomain.com`을 통하고 있는지 확인하고 로그인이 정상 완료되는지 검증합니다.
