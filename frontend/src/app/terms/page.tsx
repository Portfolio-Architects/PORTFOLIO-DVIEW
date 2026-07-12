import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: '이용약관 | D-VIEW',
  description: 'D-VIEW 서비스 이용약관',
  alternates: {
    canonical: 'https://dongtanview.com/terms',
  },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-body font-sans">
      {/* Breadcrumb List JSON-LD for Search Engine Optimization */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: '홈',
                item: 'https://dongtanview.com',
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: '이용약관',
                item: 'https://dongtanview.com/terms',
              },
            ],
          }),
        }}
      />

      <div className="bg-surface border-b border-border sticky top-0 z-50">
        <div className="max-w-[800px] mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="font-extrabold text-primary text-lg">서비스 이용약관</h1>
          <Link href="/" className="text-emerald-600 dark:text-emerald-400 font-bold text-sm hover:underline">
            메인으로 돌아가기
          </Link>
        </div>
      </div>

      <main className="max-w-[800px] mx-auto p-4 sm:p-8 mt-4 mb-20 bg-surface rounded-2xl shadow-sm border border-border">
        <article className="prose prose-sm sm:prose-base max-w-none text-secondary">
          <h2 className="text-xl font-bold text-primary mb-4">제1조 (목적)</h2>
          <p>
            본 약관은 D-VIEW(이하 &quot;회사&quot;)가 제공하는 부동산 데이터 분석 및 관련 서비스(이하 &quot;서비스&quot;)의 이용조건 및 절차, 회사와 회원 간의 권리, 의무 및 책임사항 등을 규정함을 목적으로 합니다.
          </p>

          <h2 className="text-xl font-bold text-primary mt-8 mb-4">제2조 (약관의 효력 및 변경)</h2>
          <ol className="list-decimal pl-5 space-y-2">
            <li>본 약관은 서비스를 이용하고자 하는 모든 이용자에게 효력을 발생합니다.</li>
            <li>회사는 관련 법령을 위배하지 않는 범위 내에서 본 약관을 개정할 수 있으며, 변경된 약관은 적용일자 7일 전부터 서비스 내 공지사항을 통해 공지합니다.</li>
          </ol>

          <h2 className="text-xl font-bold text-primary mt-8 mb-4">제3조 (서비스의 제공 및 변경)</h2>
          <ol className="list-decimal pl-5 space-y-2">
            <li>회사는 이용자에게 다음과 같은 서비스를 제공합니다.</li>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li>동탄 테크노밸리 지식산업센터 공실 정보 및 실거래 데이터 분석</li>
              <li>지방세 및 조례 기반 법인세 감면/세제 혜택 시뮬레이션</li>
              <li>배후 주거 아파트 가치 평가(실거주 PER, 입지 스코어, 학군) 리포트</li>
              <li>라운지 커뮤니티 및 소형 오피스 공동임차(공유오피스 메이트) 구인 매칭</li>
              <li>관심 단지 신규 거래 신고가 및 댓글 등록 실시간 알림 서비스(웹 푸시)</li>
            </ul>
            <li>서비스는 현재 기본적으로 전면 무료로 제공됩니다. 다만, 향후 고급 분석 리포트나 프리미엄 매칭 등 일부 기능이 유료로 전환될 경우, 요금 정책 및 결제 규정은 사전에 별도로 공지하고 동의 절차를 거칩니다.</li>
          </ol>

          <h2 className="text-xl font-bold text-primary mt-8 mb-4">제4조 (투자에 대한 면책 및 책임 제한)</h2>
          <div className="bg-amber-500/[0.03] dark:bg-amber-950/10 p-4 rounded-xl border border-amber-500/20 my-4 text-secondary">
            <h3 className="text-base font-bold text-amber-700 dark:text-amber-400 mb-2">⚠️ 투자 판단에 대한 면책 고지</h3>
            <p className="text-sm leading-relaxed">
              D-VIEW에서 제공하는 실거래 데이터, 입지 등급, 공실 지수, AI 밸류에이션 및 예상 세제 혜택 시뮬레이션 등은 공공데이터 및 독자적 알고리즘에 기초한 통계적 참고용 자료입니다. 
              <strong>회사는 정보의 실시간 무결성, 정확성 및 보증 책임을 지지 않으며, 본 서비스를 매개로 이루어지는 어떠한 매매/임대 계약이나 투자 결정에 대해서도 어떠한 법적 책임을 지지 않습니다. 최종 거래 책임은 이용자 본인에게 있습니다.</strong>
            </p>
          </div>

          <h2 className="text-xl font-bold text-primary mt-8 mb-4">제5조 (커뮤니티 및 라운지 이용 수칙)</h2>
          <ol className="list-decimal pl-5 space-y-2">
            <li>이용자는 라운지 커뮤니티(자유 게시판, 오피스 공동임차 구인 등) 이용 시 상호 존중해야 하며, 다음 각 호에 해당하는 행위를 해서는 안 됩니다.</li>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li>특정 단지, 빌딩 또는 개인을 비방하여 명예를 훼손하거나 유언비어를 유포하는 행위</li>
              <li>회사의 사전 승인 없는 상업적 광고 게시, 스팸, 불법 마케팅 행위</li>
              <li>타인의 명의나 로그인 계정을 도용하여 글을 작성하는 행위</li>
              <li>기타 사회 상규나 현행법을 위반하는 게시물을 등록하는 행위</li>
            </ul>
            <li>회사는 위 사항을 위반한 게시물을 사전 통보 없이 삭제할 수 있으며, 해당 이용자의 서비스 사용을 영구 제한할 수 있습니다.</li>
          </ol>

          <h2 className="text-xl font-bold text-primary mt-8 mb-4">제6조 (알림 서비스 수신 등)</h2>
          <ol className="list-decimal pl-5 space-y-2">
            <li>이용자는 관심 단지의 실거래 신고 소식 및 본인 게시물의 댓글 알림을 받기 위해 웹 푸시 알림 수신에 동의할 수 있습니다.</li>
            <li>알림 서비스는 브라우저 설정 또는 서비스 내 마이페이지/설정 메뉴를 통해 언제든지 자유롭게 해제(수신 거부)할 수 있습니다.</li>
          </ol>

          <h2 className="text-xl font-bold text-primary mt-8 mb-4">제7조 (관할법원)</h2>
          <p>서비스 이용과 관련하여 회사와 회원 간에 발생한 분쟁에 대해서는 회사의 본점 소재지를 관할하는 법원을 합의관할로 합니다.</p>

          <div className="mt-12 text-sm text-tertiary">
            <p>공고일자: 2026년 7월 12일</p>
            <p>시행일자: 2026년 7월 12일</p>
            <p className="mt-2">상호: D-VIEW | 이메일: ocs5672@gmail.com</p>
          </div>
        </article>
      </main>
    </div>
  );
}
