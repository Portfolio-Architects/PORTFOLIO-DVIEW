import { Suspense } from 'react';
import { Metadata } from 'next';
import Script from 'next/script';
import TechnoValleyClient from '@/app/technovalley/TechnoValleyClient';
import { safeJsonLd } from '@/lib/utils/structuredData';

function TechnoValleySkeleton() {
  return (
    <div className="w-full max-w-[2000px] mx-auto px-4 sm:px-6 md:px-10 lg:px-16 pt-6 pb-16 flex flex-col gap-8">
      {/* 2 columns layout skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-6 h-[400px] bg-black/5 dark:bg-surface/5 rounded-3xl" />
        <div className="lg:col-span-6 h-[400px] bg-black/5 dark:bg-surface/5 rounded-3xl" />
      </div>
      {/* Cards grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="w-full h-[220px] bg-black/5 dark:bg-surface/5 rounded-3xl" />
        <div className="w-full h-[220px] bg-black/5 dark:bg-surface/5 rounded-3xl" />
      </div>
    </div>
  );
}

export const metadata: Metadata = {
  title: 'D-VIEW 테크노 랩 | 동탄 지식산업센터 공실 매칭 & 혜택 센터',
  description: '동탄 테크노밸리 지식산업센터의 공실 해소를 위한 원스톱 솔루션. 빌딩별 공실 정보, 소형 오피스 공동임차 매칭, 입주 혜택 시뮬레이터 및 맞춤형 오피스 핏파인더를 제공합니다.',
  alternates: {
    canonical: 'https://dongtanview.com',
  },
};

export default async function HomePage() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dongtanview.com';
  const nonce = undefined;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${baseUrl}#webpage`,
        "url": baseUrl,
        "name": "D-VIEW 테크노 랩 | 동탄 지식산업센터 공실 매칭 & 혜택 센터",
        "description": "동탄 테크노밸리 지식산업센터의 공실 해소를 위한 원스톱 솔루션. 빌딩별 공실 정보, 소형 오피스 공동임차 매칭, 입주 혜택 시뮬레이터 및 맞춤형 오피스 핏파인더를 제공합니다.",
        "breadcrumb": {
          "@type": "BreadcrumbList",
          "itemListElement": [
            {
              "@type": "ListItem",
              "position": 1,
              "name": "홈",
              "item": baseUrl
            }
          ]
        }
      },
      {
        "@type": "RealEstateAgent",
        "@id": `${baseUrl}/#agent`,
        "name": "D-VIEW 부동산 데이터 랩스",
        "description": "동탄 전역 아파트 비교 분석 및 AI 매도/전세 안전성 진단 전문 부동산 테크 플랫폼",
        "url": baseUrl,
        "telephone": "+82-2-000-0000",
        "address": {
          "@type": "PostalAddress",
          "addressCountry": "KR",
          "addressRegion": "경기도",
          "addressLocality": "화성시 동탄역로"
        }
      }
    ]
  };

  return (
    <>
      <Script
        id="jsonld-technovalley-schema"
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={safeJsonLd(jsonLd)}
      />
      {/* Search Engine Optimization (SSR Content) */}
      <div className="sr-only" aria-hidden="true">
        <h1>동탄 테크노 랩 지식산업센터 공실 매칭 & 혜택 센터</h1>
        <p>동탄 테크노밸리 지식산업센터의 공실 해소를 위한 원스톱 솔루션. 빌딩별 공실 정보, 소형 오피스 공동임차 매칭, 입주 혜택 시뮬레이터 및 맞춤형 오피스 핏파인더를 제공합니다.</p>
        
        <section>
          <h2>동탄 테크노밸리 대표 지식산업센터 정보</h2>
          <table>
            <thead>
              <tr>
                <th>센터명</th>
                <th>구분</th>
                <th>평당 임대료</th>
                <th>주요 특장점</th>
                <th>드라이브인 여부</th>
                <th>상세 설명</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>금강펜테리움 IX타워</td>
                <td>초대형 지식산업센터</td>
                <td>3.5만 ~ 4.2만원</td>
                <td>드라이브인 (지하 2층 ~ 지상 7층), 동탄역 셔틀버스 상시 운행, 최대 층고 5.8m 제조 특화, 피트니스 & 옥상정원 인프라</td>
                <td>가능 (지하2층~지상7층)</td>
                <td>대규모 입주 기업 네트워킹과 드라이브인 물류 동선이 최적화된 초대형 랜드마크 지산입니다.</td>
              </tr>
              <tr>
                <td>현대 실리콘앨리 동탄</td>
                <td>문화복합형 지식산업센터</td>
                <td>3.8만 ~ 4.5만원</td>
                <td>뉴욕 스트리트형 대형 상권 연계, 섹션 오피스 레이아웃 최적화, 공유 라운지 & 세미나실 제공, 친환경 태양광 발전 및 에너지 절감</td>
                <td>불가능</td>
                <td>세련된 오피스 인테리어와 업무 편의 시설, 다채로운 먹거리 상권이 융합된 문화형 복합 지산입니다.</td>
              </tr>
              <tr>
                <td>동탄 IT타워</td>
                <td>도보 역세권 지식산업센터</td>
                <td>3.2만 ~ 3.7만원</td>
                <td>동탄역 도보 10분권, 소형 사무실(10~15평) 섹션 특화, 합리적인 가성비 임대료, 개별 냉난방 및 조용한 환경</td>
                <td>불가능</td>
                <td>동탄역과의 지리적 접근성이 가장 뛰어나며, 소자본 스타트업이나 소형 오피스에 안성맞춤입니다.</td>
              </tr>
              <tr>
                <td>SH타임스퀘어</td>
                <td>제조/도어투도어 지식산업센터</td>
                <td>3.0만 ~ 3.5만원</td>
                <td>도어투도어 (호실 앞 주차 가능), 하중 설계 평당 4톤 이상, 화물용 엘리베이터 인접, 소형 공장 등록 가능</td>
                <td>가능</td>
                <td>하역 동선과 중장비 설비 안착이 필요한 고부하 제조 및 물류 적재 업종에 최적화된 맞춤형 센터입니다.</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section style={{ marginTop: '20px' }}>
          <h2>실시간 공동 임차 메이트 구인 보드</h2>
          <ul>
            <li>
              <strong>금강 IX타워 실평 20평 분할 메이트 구합니다.</strong>
              <p>작성자: 웹디자인 에이전시 (IT 서비스) | 조건: 전체 40평 중 20평 사용 (보증금 500만원 / 월세 45만원) | 특징: 회의실 공유, 인터넷 무상제공, 여유로운 주차</p>
            </li>
            <li>
              <strong>실리콘앨리 소형 섹션오피스 쉐어할 1인 작가님 계신가요?</strong>
              <p>작성자: 독립 출판 크리에이터 (디자인/미디어) | 조건: 전체 12평 중 책상 1개 구역 분할 (보증금 100만원 / 월세 18만원) | 특징: 조용한 환경, 커피 머신 구비, 단기 가능</p>
            </li>
            <li>
              <strong>제조형 SH타임스퀘어 반 공간 쉐어 임차 구함</strong>
              <p>작성자: (주)하이테크 정밀 (정밀 제조/3D 프린팅) | 조건: 전체 60평 중 적재 창고구역 25평 분할 (보증금 800만원 / 월세 65만원) | 특징: 드라이브인 가능, 지게차 공동 사용, 하역 수월</p>
            </li>
          </ul>
        </section>

        <section style={{ marginTop: '20px' }}>
          <h2>동탄 테크노밸리 과밀억제권역 이전 시 법인세/소득세 감면 세제 혜택 안내</h2>
          <p>서울 및 수도권 과밀억제권역에서 동탄 테크노밸리로 법인 본사 또는 공장 이전 시 다음과 같은 강력한 세제 혜택을 지원합니다.</p>
          <ul>
            <li><strong>소득세 / 법인세 감면</strong>: 이전 후 최초 소득 발생 과세연도부터 4년간 법인세 100% 감면, 이후 2년간 50% 감면 혜택 제공</li>
            <li><strong>취득세 감면</strong>: 본사 또는 공장용 부동산 취득 시 취득세 최대 75%~50% 지방세 특례 감면 지원</li>
            <li><strong>재산세 감면</strong>: 이전 자산에 대해 재산세 최초 5년간 100% 감면, 이후 3년간 50% 감면 (수도권 외 지역은 37.5% 감면 지원)</li>
          </ul>
        </section>
      </div>
      <main id="main-content" className="flex-1 w-full max-w-[2000px] mx-auto relative pb-[100px] sm:pb-12 animate-in fade-in duration-500">
        <Suspense fallback={<TechnoValleySkeleton />}>
          <TechnoValleyClient />
        </Suspense>
      </main>
    </>
  );
}
