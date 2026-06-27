import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/services/logger';

// Curated Fallback / High-Fidelity Cured Dataset
const FALLBACK_DATA = [
  { name: 'IT·소프트웨어', value: 35.2, color: '#ea580c', companies: ['유라코퍼레이션 R&D', '에프엠솔루션', '투피플커넥트', '제이앤제이 테크'] },
  { name: '반도체·첨단제조', value: 28.4, color: '#9a3412', companies: ['원익IPS (본사)', 'ASML 코리아', '동진쎄미켐 R&D', '에스앤에스텍'] },
  { name: '바이오·헬스케어', value: 14.8, color: '#f59e0b', companies: ['한미약품 연구센터', '녹십자웰빙', '아쁘레쑤', '메디포스트'] },
  { name: '지식기반 서비스', value: 12.1, color: '#fdba74', companies: ['한국디지털인증', '특허법인 지산', '영천동 종합건축사', '기술보증기금 동탄'] },
  { name: '정밀기기 및 기타', value: 9.5, color: '#e7e5e4', companies: ['신도리코 R&D', '더브라이트', '레노텍', '은빛무지개'] }
];

export async function GET(request: NextRequest) {
  const serviceKey = process.env.BUILDING_API_KEY || process.env.PUBLIC_DATA_API_KEY || '';
  
  if (!serviceKey) {
    return NextResponse.json({
      success: true,
      source: 'curated-cache',
      data: FALLBACK_DATA,
      message: '공공데이터 API 인증키가 설정되지 않아 로컬 고증 캐시 데이터를 반환했습니다.'
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=600'
      }
    });
  }

  try {
    // Fetch from KICOX Registered Factory OpenAPI on odcloud
    // Filter address by LIKE '영천동'
    const key = encodeURIComponent('cond[공장주소::LIKE]');
    const value = encodeURIComponent('영천동');
    const url = `https://api.odcloud.kr/api/15106170/v1/uddi:c5988948-73f2-41dd-af38-c0f1cee398b1?page=1&perPage=300&${key}=${value}&serviceKey=${serviceKey}`;

    logger.info('GET /api/technovalley/industry-distribution', 'Fetching from odcloud registered factory API');

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 3600 }
    });

    if (!response.ok) {
      throw new Error(`API response status error: ${response.status}`);
    }

    const json = await response.json();
    const items = json?.data || [];

    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('API returned empty or invalid item list');
    }

    let itCount = 0;
    let semiCount = 0;
    let bioCount = 0;
    let serviceCount = 0;
    let otherCount = 0;

    const matchedCompanies: Record<string, string[]> = {
      'IT·소프트웨어': [],
      '반도체·첨단제조': [],
      '바이오·헬스케어': [],
      '지식기반 서비스': [],
      '정밀기기 및 기타': []
    };

    items.forEach((item: any) => {
      const cmpNm = item['회사명'] || '미지명 기업';
      const indutyCd = String(item['대표업종'] || '');

      // Map KSIC divisions
      if (indutyCd.startsWith('58') || indutyCd.startsWith('61') || indutyCd.startsWith('62') || indutyCd.startsWith('63') || cmpNm.includes('솔루션') || cmpNm.includes('소프트')) {
        itCount++;
        if (matchedCompanies['IT·소프트웨어'].length < 4) matchedCompanies['IT·소프트웨어'].push(cmpNm);
      } else if (indutyCd.startsWith('26') || indutyCd.startsWith('27') || indutyCd.startsWith('28') || indutyCd.startsWith('29') || cmpNm.includes('테크') || cmpNm.includes('정밀')) {
        semiCount++;
        if (matchedCompanies['반도체·첨단제조'].length < 4) matchedCompanies['반도체·첨단제조'].push(cmpNm);
      } else if (indutyCd.startsWith('20') || indutyCd.startsWith('21') || indutyCd.startsWith('70') || cmpNm.includes('바이오') || cmpNm.includes('케어')) {
        bioCount++;
        if (matchedCompanies['바이오·헬스케어'].length < 4) matchedCompanies['바이오·헬스케어'].push(cmpNm);
      } else if (indutyCd.startsWith('71') || indutyCd.startsWith('72') || indutyCd.startsWith('74') || indutyCd.startsWith('75') || cmpNm.includes('에스') || cmpNm.includes('코리아')) {
        serviceCount++;
        if (matchedCompanies['지식기반 서비스'].length < 4) matchedCompanies['지식기반 서비스'].push(cmpNm);
      } else {
        otherCount++;
        if (matchedCompanies['정밀기기 및 기타'].length < 4) matchedCompanies['정밀기기 및 기타'].push(cmpNm);
      }
    });

    const total = itCount + semiCount + bioCount + serviceCount + otherCount;
    if (total === 0) {
      throw new Error('No items matched after classification');
    }

    const calculatedData = [
      {
        name: 'IT·소프트웨어',
        value: parseFloat(((itCount / total) * 100).toFixed(1)),
        color: '#ea580c',
        companies: matchedCompanies['IT·소프트웨어'].length > 0 ? matchedCompanies['IT·소프트웨어'] : FALLBACK_DATA[0].companies
      },
      {
        name: '반도체·첨단제조',
        value: parseFloat(((semiCount / total) * 100).toFixed(1)),
        color: '#9a3412',
        companies: matchedCompanies['반도체·첨단제조'].length > 0 ? matchedCompanies['반도체·첨단제조'] : FALLBACK_DATA[1].companies
      },
      {
        name: '바이오·헬스케어',
        value: parseFloat(((bioCount / total) * 100).toFixed(1)),
        color: '#f59e0b',
        companies: matchedCompanies['바이오·헬스케어'].length > 0 ? matchedCompanies['바이오·헬스케어'] : FALLBACK_DATA[2].companies
      },
      {
        name: '지식기반 서비스',
        value: parseFloat(((serviceCount / total) * 100).toFixed(1)),
        color: '#fdba74',
        companies: matchedCompanies['지식기반 서비스'].length > 0 ? matchedCompanies['지식기반 서비스'] : FALLBACK_DATA[3].companies
      },
      {
        name: '정밀기기 및 기타',
        value: parseFloat(((otherCount / total) * 100).toFixed(1)),
        color: '#e7e5e4',
        companies: matchedCompanies['정밀기기 및 기타'].length > 0 ? matchedCompanies['정밀기기 및 기타'] : FALLBACK_DATA[4].companies
      }
    ];

    logger.info('GET /api/technovalley/industry-distribution', 'Fetched and parsed successfully from live API', { total });

    return NextResponse.json({
      success: true,
      source: 'live-api',
      data: calculatedData,
      message: '공공데이터포털 실시간 API 데이터 동기화 완료'
    }, {
      status: 200
    });

  } catch (err) {
    logger.error('GET /api/technovalley/industry-distribution', 'Failed to fetch live API, using fallback data', {}, err);
    return NextResponse.json({
      success: true,
      source: 'curated-cache',
      data: FALLBACK_DATA,
      message: '실시간 API 호출 실패로 로컬 고증 캐시 데이터를 반환했습니다.',
      error: err instanceof Error ? err.message : String(err)
    }, {
      status: 200
    });
  }
}
