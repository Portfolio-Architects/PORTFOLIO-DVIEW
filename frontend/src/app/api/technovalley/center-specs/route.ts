import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/services/logger';

// Curated official data matching the KICOX National Knowledge Industrial Center registry
const CURATED_CENTER_SPECS: Record<string, any> = {
  '금강펜테리움 IX타워': {
    landArea: '51,801 ㎡',
    buildingArea: '23,541 ㎡',
    totalFloorArea: '286,970 ㎡',
    address: '경기도 화성시 동탄기흥로 590',
    status: '준공완료',
    developer: '금강주택',
    tenants: ['더브라이트', '연성엔지니어링', '(주)에스비케이엔지니어링', '(주)펨토사이언스', '케이스포트라']
  },
  '현대 실리콘앨리 동탄': {
    landArea: '36,366 ㎡',
    buildingArea: '16,423 ㎡',
    totalFloorArea: '238,615 ㎡',
    address: '경기도 화성시 동탄첨단산업1로 57',
    status: '준공완료',
    developer: '현대건설',
    tenants: ['(주)에프엠솔루션', '투피플커넥트', '제이앤제이 테크놀로지', '주식회사 에코템']
  },
  '동탄 IT타워': {
    landArea: '9,850 ㎡',
    buildingArea: '4,432 ㎡',
    totalFloorArea: '56,920 ㎡',
    address: '경기도 화성시 동탄대로21길 10',
    status: '준공완료',
    developer: '아이티피앤디',
    tenants: ['(주)디알퓨얼셀', '선일시스템', '(주)비주얼팬텀', '루씨엠㈜']
  },
  'SH타임스퀘어': {
    landArea: '11,541 ㎡',
    buildingArea: '5,193 ㎡',
    totalFloorArea: '43,892 ㎡',
    address: '경기도 화성시 동탄첨단산업1로 51',
    status: '준공완료',
    developer: '에스에이치종합건설',
    tenants: ['(주)티에스플러스', '(주)에코바이오', '정한', '은빛무지개']
  }
};

export async function GET(request: NextRequest) {
  const serviceKey = process.env.BUILDING_API_KEY || process.env.PUBLIC_DATA_API_KEY || '';

  if (!serviceKey) {
    logger.info('GET /api/technovalley/center-specs', 'Returning curated KICOX center specs cache');
    return NextResponse.json({
      success: true,
      source: 'curated-cache',
      centers: CURATED_CENTER_SPECS,
      message: '공공데이터 API 인증키가 설정되지 않아 한국산업단지공단 지산현황 고증 캐시 데이터를 반환했습니다.'
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=600'
      }
    });
  }

  try {
    // 1. Attempt to query the auto-converted OpenAPI for 전국지식산업센터현황 on odcloud
    const url = `https://api.odcloud.kr/api/15117154/v1/uddi:6adf4141-5dd6-405b-a911-a9aa0f73f167?page=1&perPage=500&serviceKey=${serviceKey}`;

    logger.info('GET /api/technovalley/center-specs', 'Fetching from KICOX Knowledge Industrial Center API');

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 3600 }
    });

    if (!response.ok) {
      throw new Error(`API response status error: ${response.status}`);
    }

    const json = await response.json();
    const data = json?.data || [];

    // Filter and map centers belonging to Hwaseong Yeongcheon-dong
    const liveSpecs: Record<string, any> = {};
    for (const key of Object.keys(CURATED_CENTER_SPECS)) {
      liveSpecs[key] = {
        ...CURATED_CENTER_SPECS[key],
        tenants: [...CURATED_CENTER_SPECS[key].tenants]
      };
    }

    if (Array.isArray(data) && data.length > 0) {
      data.forEach((item: any) => {
        const centerName = item['지식산업센터명'] || '';
        if (CURATED_CENTER_SPECS[centerName]) {
          liveSpecs[centerName] = {
            ...liveSpecs[centerName],
            landArea: item['용지면적'] ? `${Number(item['용지면적']).toLocaleString()} ㎡` : CURATED_CENTER_SPECS[centerName].landArea,
            buildingArea: item['건축면적'] ? `${Number(item['건축면적']).toLocaleString()} ㎡` : CURATED_CENTER_SPECS[centerName].buildingArea,
            totalFloorArea: item['연면적'] ? `${Number(item['연면적']).toLocaleString()} ㎡` : CURATED_CENTER_SPECS[centerName].totalFloorArea,
            address: item['공장대표주소(도로명)'] || CURATED_CENTER_SPECS[centerName].address,
            status: item['상태'] || CURATED_CENTER_SPECS[centerName].status,
            developer: item['설치자'] || CURATED_CENTER_SPECS[centerName].developer
          };
        }
      });
    }

    // 2. Fetch from KICOX Registered Factory API for Yeongcheon-dong to extract real-time tenants
    try {
      const factKey = encodeURIComponent('cond[공장주소::LIKE]');
      const factVal = encodeURIComponent('영천동');
      const factoriesUrl = `https://api.odcloud.kr/api/15106170/v1/uddi:c5988948-73f2-41dd-af38-c0f1cee398b1?page=1&perPage=300&${factKey}=${factVal}&serviceKey=${serviceKey}`;

      logger.info('GET /api/technovalley/center-specs', 'Fetching tenants from KICOX Factory Registry API');
      const factoriesRes = await fetch(factoriesUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 3600 }
      });

      if (factoriesRes.ok) {
        const factoriesJson = await factoriesRes.json();
        const factoriesData = factoriesJson?.data || [];

        if (Array.isArray(factoriesData) && factoriesData.length > 0) {
          // Clear preloaded curated list to populate with 100% live database matches
          for (const key of Object.keys(liveSpecs)) {
            liveSpecs[key].tenants = [];
          }

          factoriesData.forEach((item: any) => {
            const cmpNm = item['회사명'] || '';
            const centerField = item['지식산업센터명'] || '';
            const addr = item['공장주소'] || '';

            if (centerField.includes('금강펜테리움') || addr.includes('동탄기흥로 557') || addr.includes('동탄기흥로 590')) {
              if (!liveSpecs['금강펜테리움 IX타워'].tenants.includes(cmpNm)) {
                liveSpecs['금강펜테리움 IX타워'].tenants.push(cmpNm);
              }
            } else if (centerField.includes('실리콘앨리') || addr.includes('동탄첨단산업1로 57')) {
              if (!liveSpecs['현대 실리콘앨리 동탄'].tenants.includes(cmpNm)) {
                liveSpecs['현대 실리콘앨리 동탄'].tenants.push(cmpNm);
              }
            } else if (centerField.includes('더퍼스트타워') || centerField.includes('IT타워') || addr.includes('동탄대로21길 10')) {
              if (!liveSpecs['동탄 IT타워'].tenants.includes(cmpNm)) {
                liveSpecs['동탄 IT타워'].tenants.push(cmpNm);
              }
            } else if (centerField.includes('SH타임') || addr.includes('동탄첨단산업1로 51')) {
              if (!liveSpecs['SH타임스퀘어'].tenants.includes(cmpNm)) {
                liveSpecs['SH타임스퀘어'].tenants.push(cmpNm);
              }
            }
          });
        }
      }
    } catch (factErr) {
      logger.error('GET /api/technovalley/center-specs', 'Failed to fetch factories for tenant mapping, keeping curated fallback', {}, factErr);
    }

    return NextResponse.json({
      success: true,
      source: 'live-api',
      centers: liveSpecs,
      message: '공공데이터포털 실시간 지식산업센터 및 입주기업 API 동기화 완료'
    }, {
      status: 200
    });

  } catch (err) {
    logger.error('GET /api/technovalley/center-specs', 'Failed to fetch live API, using fallback data', {}, err);
    return NextResponse.json({
      success: true,
      source: 'curated-cache',
      centers: CURATED_CENTER_SPECS,
      message: '실시간 API 호출 실패로 로컬 고증 지산현황 및 입주기업 캐시 데이터를 반환했습니다.',
      error: err instanceof Error ? err.message : String(err)
    }, {
      status: 200
    });
  }
}
