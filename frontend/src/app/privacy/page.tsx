import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: '개인정보처리방침 | D-VIEW',
  description: 'D-VIEW 개인정보처리방침',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-body font-sans">
      <div className="bg-surface border-b border-border sticky top-0 z-50">
        <div className="max-w-[800px] mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="font-extrabold text-primary text-lg">개인정보처리방침</h1>
          <Link href="/" className="text-toss-blue font-bold text-sm hover:underline">
            메인으로 돌아가기
          </Link>
        </div>
      </div>

      <main className="max-w-[800px] mx-auto p-4 sm:p-8 mt-4 mb-20 bg-surface rounded-2xl shadow-sm border border-border">
        <article className="prose prose-sm sm:prose-base max-w-none text-secondary">
          <h2 className="text-xl font-bold text-primary mb-4">제1조 (목적)</h2>
          <p>
            D-VIEW(이하 &quot;회사&quot;)는 이용자의 개인정보를 중요시하며, 「정보통신망 이용촉진 및 정보보호 등에 관한 법률」 및 「개인정보 보호법」 등 관련 법령을 준수하고 있습니다.
            본 방침을 통하여 회사가 이용자로부터 제공받는 개인정보를 어떠한 용도와 방식으로 이용하고 있으며, 개인정보보호를 위해 어떠한 조치를 취하고 있는지 알려드립니다.
          </p>

          <h2 className="text-xl font-bold text-primary mt-8 mb-4">제2조 (수집하는 개인정보 항목 및 수집 방법)</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>수집 항목 (이메일 및 소셜 로그인):</strong> 이메일 주소, 이름(닉네임), 프로필 사진, 암호화된 식별자(UID)</li>
            <li><strong>자동 수집 항목 (Google Analytics 4 등):</strong> IP 주소, 쿠키, 기기 정보, 위치 정보(대략적인 지역), 서비스 이용 기록(방문 페이지, 체류 시간, 즐겨찾기 클릭 등 트래픽 데이터)</li>
            <li><strong>수집 방법:</strong> 서비스 가입 및 이용 시 수집, 생성정보 수집 툴(Google Analytics)을 통한 자동 수집</li>
          </ul>

          <h2 className="text-xl font-bold text-primary mt-8 mb-4">제3조 (개인정보의 수집 및 이용 목적)</h2>
          <p>회사는 수집한 개인정보를 다음의 목적을 위해 활용합니다.</p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li><strong>서비스 제공:</strong> 부동산 분석 데이터 및 리포트 제공, 개인화된 맞춤형 단지 추천 및 즐겨찾기 연동</li>
            <li><strong>회원 관리:</strong> 본인 확인, 개인 식별, 불량 회원의 부정 이용 방지, 가입 의사 확인, 고객 상담(CS)</li>
            <li><strong>서비스 분석 및 고도화:</strong> 사용자 행동 패턴(페이지 조회수, 체류 시간 등) 및 트래픽 분석을 통한 UI/UX 개선 및 서비스 최적화</li>
          </ul>

          <h2 className="text-xl font-bold text-primary mt-8 mb-4">제4조 (개인정보의 보유 및 이용 기간)</h2>
          <p>원칙적으로, 개인정보 수집 및 이용 목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다. 단, 관련 법령의 규정에 의하여 보존할 필요가 있는 경우 다음과 같이 일정한 기간 동안 보존합니다.</p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li>소비자의 불만 또는 분쟁처리에 관한 기록: 3년 (전자상거래 등에서의 소비자보호에 관한 법률)</li>
            <li>웹사이트 방문 기록 및 트래픽 분석 로그: 3개월 (통신비밀보호법)</li>
          </ul>

          <h2 className="text-xl font-bold text-primary mt-8 mb-4">제5조 (개인정보의 파기절차 및 방법)</h2>
          <p>이용자가 회원 탈퇴를 요청하거나 개인정보 보유 기간이 경과된 경우, 지체 없이 해당 정보를 복구할 수 없는 방법으로 파기합니다. 전자적 파일 형태의 정보는 기술적 방법을 사용하여 영구 삭제합니다.</p>

          <h2 className="text-xl font-bold text-primary mt-8 mb-4">제6조 (이용자의 권리와 그 행사방법)</h2>
          <p>
            이용자는 언제든지 등록되어 있는 자신의 개인정보를 조회하거나 수정할 수 있으며, 가입 해지(회원 탈퇴)를 요청할 수 있습니다. 
            회원 탈퇴를 원하시는 경우, 서비스 내 &apos;마이페이지&apos; 또는 관리자 이메일을 통해 요청하시면 본인 확인 절차를 거친 후 지체 없이 처리합니다.
          </p>

          <h2 className="text-xl font-bold text-primary mt-8 mb-4">제7조 (개인정보 보호책임자)</h2>
          <p>회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 관련 고충 처리 및 피해 구제를 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.</p>
          <div className="bg-[#f8f9fa] p-4 rounded-lg border border-border mt-2">
            <p className="font-bold text-primary">개인정보 보호 담당부서</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>담당자: D-VIEW 팀</li>
              <li>이메일: ocs5672@gmail.com</li>
            </ul>
          </div>

          <div className="mt-12 text-sm text-tertiary">
            <p>공고일자: 2026년 5월 21일</p>
            <p>시행일자: 2026년 5월 21일</p>
          </div>
        </article>
      </main>
    </div>
  );
}
