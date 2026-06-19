/**
 * @file task-autogenerator.js
 * @description Automatically scans the codebase and generates 20 new micro-refactoring tasks 
 * when the loop reaches intervals of ~50 completed tasks.
 */

const fs = require('fs');
const path = require('path');

const BRAIN_DIR = 'C:\\Users\\ocs56\\.gemini\\antigravity\\brain\\05d86d13-327f-465d-b1bc-6c8b812512a4';
const TASK_MD_PATH = path.join(BRAIN_DIR, 'task.md');
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const FRONTEND_SRC = path.join(PROJECT_ROOT, 'frontend/src');

// 1. Predefined high-quality refactoring candidates template pool
// These are matched with actual files in the codebase to verify validity before proposing.
const CANDIDATE_POOL = [
  {
    targetFile: 'src/components/ApartmentModal.tsx',
    check: (content) => content.includes('const [') && !content.includes('useDeferredValue'),
    taskText: 'ApartmentModal.tsx 내의 대형 데이터 리스트 필터링 시 UI 블로킹 방지를 위해 useTransition 또는 useDeferredValue 적용'
  },
  {
    targetFile: 'src/components/DashboardClient.tsx',
    check: (content) => content.includes('window.addEventListener') && !content.includes('passive: true'),
    taskText: 'DashboardClient.tsx 내 전역 이벤트 리스너(scroll, resize 등)에 passive: true 옵션 적용 여부 전수 검사 및 누락분 이식'
  },
  {
    targetFile: 'src/components/LoungeComposeClient.tsx',
    check: (content) => content.includes('textarea') && !content.includes('aria-label'),
    taskText: 'LoungeComposeClient.tsx 내 게시글 작성 텍스트 영역(textarea) 및 버튼 컴포넌트에 스크린 리더용 aria-label 보강'
  },
  {
    targetFile: 'src/components/ui/AdSense.tsx',
    check: (content) => content && !content.includes('try-catch'),
    taskText: 'AdSense.tsx 컴포넌트 내의 window.adsbygoogle.push 호출 시 광고 차단 프로그램 활성화 환경을 고려한 try-catch 예외 방어 가드 강화'
  },
  {
    targetFile: 'src/components/pwa/MobileDock.tsx',
    check: (content) => content.includes('Link') && !content.includes('prefetch={false}'),
    taskText: 'MobileDock.tsx 모바일 하단 네비게이션 내 잦은 호버/터치로 인한 Next.js Link 백그라운드 프리패치 부하 경감을 위해 prefetch={false} 명시적 최적화'
  },
  {
    targetFile: 'src/components/LoungeDetailClient.tsx',
    check: (content) => content.includes('comment') && !content.includes('useCallback'),
    taskText: 'LoungeDetailClient.tsx 댓글 렌더링 리스트 내의 각 자식 컴포넌트 콜백 함수에 useCallback 적용으로 불필요한 가비지 콜렉터 루프 제거'
  },
  {
    targetFile: 'src/lib/services/logger.ts',
    check: (content) => content && !content.includes('console.debug'),
    taskText: 'logger.ts 서비스 내에 개발 환경(development) 전용 경량 로그 레벨(debug) 필터 추가 적용 및 릴리즈 컴파일 타임 최적화'
  },
  {
    targetFile: 'src/components/apartment-modal/AdvancedValuationMetrics.tsx',
    check: (content) => content && !content.includes('Math.round'),
    taskText: 'AdvancedValuationMetrics.tsx 내 밸류에이션 연산 과정 중 소수점 나눗셈 정밀도 유실(Javascript Floating Point error) 방지를 위한 이중 보정 연산자 도입'
  },
  {
    targetFile: 'src/components/apartment-modal/JeonseSafetyReport.tsx',
    check: (content) => content.includes('safe') && !content.includes('aria-describedby'),
    taskText: 'JeonseSafetyReport.tsx 내 안전성 등급 지표 링에 시각 장애인용 설명 레이블(aria-describedby) 및 색상 대조 접근성(WCAG AA 가이드라인) 강화'
  },
  {
    targetFile: 'src/components/apartment-modal/PhotoUploadModal.tsx',
    check: (content) => content.includes('FileReader') && !content.includes('revokeObjectURL'),
    taskText: 'PhotoUploadModal.tsx 내 이미지 프리뷰 생성 시 발생할 수 있는 메모리 누수 방지를 위해 URL.createObjectURL 사용 후 URL.revokeObjectURL 메모리 해제 로직 탑재'
  },
  {
    targetFile: 'src/components/consumer/AnchorTenantCard.tsx',
    check: (content) => content.includes('shadow-') && !content.includes('will-change'),
    taskText: 'AnchorTenantCard.tsx 마우스 호버 및 클릭 시 트랜지션 애니메이션 떨림 방지를 위해 will-change: transform 속성 추가 적용'
  },
  {
    targetFile: 'src/components/apartment-modal/InfraAnalysisSection.tsx',
    check: (content) => content.includes('map') && !content.includes('key={'),
    taskText: 'InfraAnalysisSection.tsx 입지 정보 컴포넌트 내 map 루프의 key 속성이 고유한 ID 대신 index로 되어 있는 부분 전수 조사 및 유니크 ID 바인딩으로 변경'
  },
  {
    targetFile: 'src/components/apartment-modal/EducationAnalysisSection.tsx',
    check: (content) => content.includes('school') && !content.includes('React.memo'),
    taskText: 'EducationAnalysisSection.tsx 내 학군 리스트 컴포넌트에 React.memo 적용하여 잦은 탭 전환 시의 렌더 트리 무효화 부하 최적화'
  },
  {
    targetFile: 'src/components/pwa/PushSubscriptionModal.tsx',
    check: (content) => content.includes('subscribe') && !content.includes('error'),
    taskText: 'PushSubscriptionModal.tsx 수신 동의 액션 시 모바일 크롬 브라우저에서 발생할 수 있는 Notification.permission 거부 에러(Promise Rejection) 예외 분기 처리 구현'
  },
  {
    targetFile: 'src/lib/contexts/SettingsContext.tsx',
    check: (content) => content.includes('localStorage') && !content.includes('try-catch'),
    taskText: 'SettingsContext.tsx 내 로컬 스토리지 데이터 마운팅 시 브라우저 쿠키/보안 정책에 의한 Storage 거부 런타임 크래시 방어용 try-catch 안전 래핑 보강'
  },
  {
    targetFile: 'src/app/globals.css',
    check: (content) => content.includes('font-') && !content.includes('font-display: swap'),
    taskText: 'globals.css 내 로컬 정의 폰트(@font-face) 영역에 font-display: swap 선언 누락 여부 검사 및 성능 향상을 위한 전체 스와핑 적용'
  },
  {
    targetFile: 'src/components/VerificationBadge.tsx',
    check: (content) => content && !content.includes('memo'),
    taskText: 'VerificationBadge.tsx 인증 마크 컴포넌트가 부모 모달 리렌더링에 휩쓸리지 않도록 React.memo 경량화 래핑 선언 추가'
  },
  {
    targetFile: 'src/lib/utils/scoring.ts',
    check: (content) => content && !content.includes('try'),
    taskText: 'scoring.ts 내 입지 점수 연산 메커니즘 도중 일부 데이터 필드가 빈 값(null/undefined)으로 입력될 시 연산 오버플로우가 나지 않도록 방어 타입 가드 장착'
  },
  {
    targetFile: 'src/components/ui/NativeAdPlaceholder.tsx',
    check: (content) => content && !content.includes('will-change'),
    taskText: 'NativeAdPlaceholder.tsx 스켈레톤 로더 컴포넌트 내 Shimmer 무한 로테이션 애니메이션 오버헤드를 줄이기 위해 will-change: background-position 레이어 명시'
  },
  {
    targetFile: 'src/app/manifest.ts',
    check: (content) => content.includes('icons') && !content.includes('purpose'),
    taskText: 'manifest.ts 내 PWA 마크 아이콘 정의부에 purpose: "any maskable" 속성을 명시하여 모바일 기기별 런처 아이콘 찌그러짐 방지 표준 규격 탑재'
  }
];

function scanCodebaseAndGetTasks() {
  const generatedTasks = [];

  for (const candidate of CANDIDATE_POOL) {
    const filePath = path.join(PROJECT_ROOT, 'frontend', candidate.targetFile);
    if (fs.existsSync(filePath)) {
      try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        if (candidate.check(fileContent)) {
          generatedTasks.push(candidate.taskText);
        }
      } catch (err) {
        // Skip
      }
    }
  }

  // Fallback / padding if we have fewer than 20 tasks
  let fallbackId = 1;
  while (generatedTasks.length < 20) {
    generatedTasks.push(`마이크로 최적화 추가 과제 #${fallbackId++}: 코드베이스 정적 분석 기준 잠재적인 브라우저 메모리 누수 지점 점검 및 Refactoring`);
  }

  // Keep exactly 20 tasks
  return generatedTasks.slice(0, 20);
}

function main() {
  console.log('🤖 Starting task-autogenerator utility...');

  if (!fs.existsSync(TASK_MD_PATH)) {
    console.error(`❌ task.md not found at path: ${TASK_MD_PATH}`);
    process.exit(1);
  }

  const taskContent = fs.readFileSync(TASK_MD_PATH, 'utf8');
  
  // Count completed tasks
  const completedMatches = taskContent.match(/- \[x\]/g);
  const completedCount = completedMatches ? completedMatches.length : 0;
  
  // Count pending tasks
  const pendingMatches = taskContent.match(/- \[ \]/g);
  const pendingCount = pendingMatches ? pendingMatches.length : 0;

  console.log(`📊 Current Statistics:`);
  console.log(`   - Completed Tasks: ${completedCount}`);
  console.log(`   - Pending Tasks: ${pendingCount}`);

  // Only auto-generate when pending tasks are almost exhausted (e.g., 2 or fewer) 
  // OR completed tasks reach intervals of ~50 (50, 100, 150, 200...) and pending is low.
  const isTriggerRequired = pendingCount <= 2 || (completedCount > 0 && completedCount % 50 === 0 && pendingCount <= 5);

  if (!isTriggerRequired) {
    console.log('ℹ️ Task backlog is still sufficient. Skipping generation.');
    process.exit(0);
  }

  console.log('⛏️ Mining new refactoring targets from the codebase...');
  const newTasks = scanCodebaseAndGetTasks();

  console.log(`🚀 Successfully mined ${newTasks.length} tasks. Injecting to task.md...`);

  let updatedContent = taskContent.trim();
  const nextTaskNumberStart = completedCount + pendingCount + 1;

  updatedContent += '\n';
  newTasks.forEach((task, index) => {
    const taskNum = nextTaskNumberStart + index;
    updatedContent += `- [ ] 태스크 ${taskNum}: ${task}\n`;
  });

  fs.writeFileSync(TASK_MD_PATH, updatedContent + '\n', 'utf8');
  console.log('✅ task.md successfully extended with 20 new micro-tasks.');
}

main();
