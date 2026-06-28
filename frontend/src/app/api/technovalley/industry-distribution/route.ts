import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/services/logger';
import { fetchCsv } from '@/lib/services/googleSheets';

// Curated Fallback / High-Fidelity Cured Dataset with Center Suffixes (100% Geolocated to Yeongcheon-dong, No Revenue)
const FALLBACK_DATA = [
  { name: 'IT·소프트웨어', value: 35.2, color: '#ea580c', count: 681, companies: ['한국아이티에스 - 자사빌딩', '에프엠솔루션 - 금강펜테리움 IX타워', '위즈코리아 - SH타임스퀘어', '제이앤제이 테크 - SH타임스퀘어'] },
  { name: '반도체·첨단제조', value: 28.4, color: '#9a3412', count: 549, companies: ['에이에스엠코리아 - 자사빌딩', '케이씨텍 - 자사빌딩', '서플러스글로벌 - 자사빌딩', '에스앤에스텍 - 금강펜테리움 IX타워'] },
  { name: '바이오·헬스케어', value: 14.8, color: '#f59e0b', count: 286, companies: ['우정바이오 - 자사빌딩', '한미약품 연구센터 - 자사연구소', '서린바이오 - 서린바이오 글로벌센터', '녹십자웰빙 - 금강펜테리움 IX타워'] },
  { name: '지식기반 서비스', value: 12.1, color: '#fdba74', count: 234, companies: ['기술보증기금 동탄 - SH타임스퀘어', '한국디지털인증 - 금강펜테리움 IX타워', '특허법인 지산 - 금강펜테리움 IX타워', '영천동 종합건축사 - 현대실리콘앨리'] },
  { name: '정밀기기 및 기타', value: 9.5, color: '#e7e5e4', count: 183, companies: ['신도리코 R&D - 자사빌딩', '더브라이트 - 현대실리콘앨리', '레노텍 - SH타임스퀘어', '은빛무지개 - 금강펜테리움 IX타워'] }
];

// Major geolocated anchor tenants physically located in Yeongcheon-dong (Techno Valley)
// but whose NPS/Industrial Complex registered head offices are elsewhere.
const ANCHOR_COMPANIES: Record<string, string[]> = {
  'IT·소프트웨어': [
    '한국아이티에스 - 경기도 화성시 동탄대로22길 17, 자사빌딩',
    '위즈코리아 - 경기도 화성시 동탄대로21길 26, SH타임스퀘어',
    '제이앤제이 테크 - 경기도 화성시 동탄대로21길 26, SH타임스퀘어'
  ],
  '반도체·첨단제조': [
    '도쿄일렉트론코리아 - 경기도 화성시 동탄첨단산업1로 27, 금강펜테리움 IX타워',
    '어플라이드 머티리얼즈 코리아 - 경기도 화성시 동탄기흥로 614-26, 자사빌딩',
    '에이에스엠코리아 - 경기도 화성시 동탄기흥로 635, 자사빌딩',
    '케이씨텍 - 경기도 화성시 동탄기흥로 642, 자사빌딩',
    '서플러스글로벌 - 경기도 화성시 동탄대로22길 32, 자사빌딩',
    '에스앤에스텍 - 경기도 화성시 동탄첨단산업1로 27, 금강펜테리움 IX타워'
  ],
  '바이오·헬스케어': [
    '우정바이오 - 경기도 화성시 동탄기흥로 593-8, 우정바이오 신약클러스터',
    '한미약품 연구센터 - 경기도 화성시 동탄대로22길 125, 한미약품 연구센터',
    '서린바이오 - 경기도 화성시 동탄대로21길 15, 서린바이오 글로벌센터',
    '녹십자웰빙 - 경기도 화성시 동탄첨단산업1로 27, 금강펜테리움 IX타워'
  ],
  '지식기반 서비스': [
    '기술보증기금 동탄 - 경기도 화성시 동탄대로21길 26, SH타임스퀘어',
    '특허법인 지산 - 경기도 화성시 동탄첨단산업1로 27, 금강펜테리움 IX타워'
  ],
  '정밀기기 및 기타': [
    '신도리코 R&D - 경기도 화성시 동탄기흥로 568, 자사빌딩'
  ]
};

function cleanCompanyName(name: string): string {
  return name.replace(/\(주\)|주식회사/g, '').trim();
}

function getCompanyScore(name: string): number {
  const clean = name.replace(/\(주\)|주식회사/g, '').trim().toLowerCase();
  
  // 1. Semiconductor & Electronics Leaders (High Market Cap / Revenue / Global Brand)
  if (clean.includes('어플라이드') || clean.includes('applied materials')) return 1000;
  if (clean.includes('도쿄일렉') || clean.includes('tokyo electron')) return 980;
  if (clean.includes('한미약품') || clean.includes('hanmi')) return 960;
  if (clean.includes('asm') || clean.includes('에이에스엠')) return 940;
  if (clean.includes('신도리코')) return 900;
  if (clean.includes('케이씨텍') || clean.includes('kc tech')) return 880;
  if (clean.includes('에스앤에스텍') || clean.includes('s&s')) return 860;
  
  // 2. Global Subsidiaries / Well-known public brands / Institutions
  if (clean.includes('기술보증기금')) return 840;
  if (clean.includes('서린바이오')) return 820;
  if (clean.includes('녹십자')) return 800;
  if (clean.includes('우정바이오')) return 780;
  if (clean.includes('서플러스글로벌')) return 760;
  
  // 3. Anchor IT/Tech companies
  if (clean.includes('한국아이티에스')) return 700;
  if (clean.includes('위즈코리아')) return 680;
  if (clean.includes('제이앤제이')) return 660;
  if (clean.includes('특허법인 지산')) return 640;
  if (clean.includes('에너시스')) return 600;

  // 4. Global subsidiary keywords
  if (clean.includes('코리아') || clean.includes('korea') || clean.includes('인터내셔널') || clean.includes('global') || clean.includes('글로벌')) {
    return 300;
  }
  
  // 5. General value keywords
  if (clean.includes('화학') || clean.includes('정밀') || clean.includes('머티리얼즈') || clean.includes('반도체') || clean.includes('제약') || clean.includes('바이오') || clean.includes('엔지니어링') || clean.includes('테크') || clean.includes('솔루션') || clean.includes('시스템')) {
    return 100;
  }
  
  return 0;
}

function extractCenterFromAddress(address: string): string {
  if (!address) return '';
  
  if (address.includes('금강펜테리움 IX') || address.includes('금강펜테리움IX') || address.includes('금강IX')) {
    return '금강펜테리움 IX타워';
  }
  if (address.includes('실리콘앨리') || address.includes('현대실리콘앨리')) {
    return '현대실리콘앨리';
  }
  if (address.includes('타임스퀘어') || address.includes('SH타임') || address.includes('SH 타임')) {
    return 'SH타임스퀘어';
  }
  if (address.includes('더퍼스트타워')) {
    if (address.includes('더퍼스트타워3') || address.includes('더퍼스트타워 3')) {
      return '더퍼스트타워 3차';
    }
    if (address.includes('더퍼스트타워2') || address.includes('더퍼스트타워 2')) {
      return '더퍼스트타워 2차';
    }
    return '더퍼스트타워';
  }
  if (address.includes('동탄비즈타워')) {
    return '동탄비즈타워';
  }
  if (address.includes('메가비즈타워')) {
    return '동탄메가비즈타워';
  }
  if (address.includes('테라타워')) {
    return '동탄테라타워';
  }
  if (address.includes('IT타워') || address.includes('아이티타워')) {
    return '동탄IT타워';
  }
  if (address.includes('에이팩시티')) {
    return '동탄에이팩시티';
  }
  if (address.includes('SK V1') || address.includes('SKV1')) {
    return '동탄 SK V1';
  }
  
  return '';
}

function simplifyAddress(address: string): string {
  if (!address) return '자사빌딩';
  
  // Remove province and city prefixes
  let clean = address
    .replace(/^경기도\s+화성시\s+동탄구\s+/, '')
    .replace(/^경기도\s+화성시\s+/, '')
    .replace(/^서울특별시\s+서대문구\s+/, '')
    .trim();
    
  // Strip parentheses like (영천동) or (동탄구 영천동)
  clean = clean.replace(/\(.*?\)/g, '').trim();

  // Split by comma to separate road and building details
  const parts = clean.split(',');
  const roadPart = parts[0].trim();
  const roadName = roadPart.replace(/\s+/g, ' ');
  
  // If there's a prominent center name in parts[1], wrap it in parentheses for clarity
  const buildingName = parts[1] ? parts[1].trim() : '';
  const isFamousCenter = ['금강', '실리콘앨리', '타임스퀘어', '더퍼스트타워', '비즈타워', '메가비즈타워', '테라타워', 'IT타워', '에이팩시티', 'SK V1', '서린바이오', '우정바이오', '한미약품', '연구센터'].some(c => buildingName.includes(c));
  
  if (isFamousCenter) {
    const center = extractCenterFromAddress(buildingName);
    return `${roadName} (${center || buildingName})`;
  }
  
  return roadName;
}

function formatCompanyWithCenter(name: string, address: string): string {
  const cleanName = cleanCompanyName(name);
  
  // Filter out any known non-Techno Valley centers
  if (address.includes('동탄케이티') || address.includes('동탄KT') || address.includes('KT동탄') || address.includes('케이티')) {
    return 'EXCLUDE';
  }
  
  const simpleCenter = extractCenterFromAddress(address);
  if (simpleCenter) {
    return `${cleanName} - ${simpleCenter}`;
  }
  
  // If it's a known anchor tenant that doesn't have center in address, tag as - 자사빌딩 or address
  const knownAnchors = ['에이에스엠코리아', '케이씨텍', '서플러스글로벌', '우정바이오', '아산제약', '신도리코 R&D', '신도리코', '한국아이티에스'];
  if (knownAnchors.some(anchor => cleanName.includes(anchor))) {
    return `${cleanName} - 자사빌딩`;
  }
  
  return cleanName;
}

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const refresh = searchParams.get('refresh') === 'true';

  const serviceKey = process.env.BUILDING_API_KEY || process.env.PUBLIC_DATA_API_KEY || '';
  
  // Initialize dynamic anchors with code hardcoded constants first
  let dynamicAnchors: Record<string, string[]> = { ...ANCHOR_COMPANIES };
  let sheetLoaded = false;
  const tabNames = ['테크노밸리_입주기업', '테크노밸리_앵커기업', '테크노밸리 앵커기업', 'TECHNOVALLEY_COMPANIES'];
  let sheetRows: string[][] = [];

  // Attempt to fetch from Google Sheets
  for (const tab of tabNames) {
    try {
      const rows = await fetchCsv(tab, refresh);
      if (rows && rows.length > 1) {
        sheetRows = rows;
        sheetLoaded = true;
        break;
      }
    } catch (err) {
      logger.warn('GET /api/technovalley/industry-distribution', `Google Sheet tab check failed for: ${tab}`, {}, err);
    }
  }

  // Parse Google Sheet rows if successfully loaded
  if (sheetLoaded && sheetRows.length > 1) {
    const header = sheetRows[0].map(h => h.trim());
    const catIdx = header.findIndex(h => h.includes('구분') || h.includes('분류') || h.includes('Category'));
    const nameIdx = header.findIndex(h => h.includes('회사명') || h.includes('기업명') || h.includes('상호') || h.includes('Name'));
    const bldIdx = header.findIndex(h => h.includes('주소') || h.includes('입주건물') || h.includes('건물명') || h.includes('건물') || h.includes('Building'));

    const cIdx = catIdx !== -1 ? catIdx : 0;
    const nIdx = nameIdx !== -1 ? nameIdx : 1;
    const bIdx = bldIdx !== -1 ? bldIdx : 2;

    const tempAnchors: Record<string, string[]> = {
      'IT·소프트웨어': [],
      '반도체·첨단제조': [],
      '바이오·헬스케어': [],
      '지식기반 서비스': [],
      '정밀기기 및 기타': []
    };

    let validRowsCount = 0;
    for (let i = 1; i < sheetRows.length; i++) {
      const row = sheetRows[i];
      if (row.length > Math.max(cIdx, nIdx, bIdx)) {
        const rawCat = row[cIdx]?.trim() || '';
        const rawName = row[nIdx]?.trim() || '';
        const rawBld = row[bIdx]?.trim() || '자사빌딩';

        if (rawName && rawCat) {
          let mappedCat = '정밀기기 및 기타';
          if (rawCat.includes('IT') || rawCat.includes('소프트웨어') || rawCat.includes('정보통신') || rawCat.includes('개발')) {
            mappedCat = 'IT·소프트웨어';
          } else if (rawCat.includes('반도체') || rawCat.includes('첨단제조') || rawCat.includes('제조') || rawCat.includes('기계')) {
            mappedCat = '반도체·첨단제조';
          } else if (rawCat.includes('바이오') || rawCat.includes('헬스케어') || rawCat.includes('의료') || rawCat.includes('제약')) {
            mappedCat = '바이오·헬스케어';
          } else if (rawCat.includes('지식') || rawCat.includes('서비스') || rawCat.includes('기금') || rawCat.includes('특허')) {
            mappedCat = '지식기반 서비스';
          }

          tempAnchors[mappedCat].push(`${rawName} - ${rawBld}`);
          validRowsCount++;
        }
      }
    }
    if (validRowsCount > 0) {
      dynamicAnchors = tempAnchors;
      logger.info('GET /api/technovalley/industry-distribution', `Successfully parsed ${validRowsCount} companies from Google Sheet.`);
    }
  }

  if (!sheetLoaded) {
    logger.warn('GET /api/technovalley/industry-distribution', 'Google Sheet failed to load, returning curated FALLBACK_DATA.');
    return NextResponse.json({
      success: true,
      source: 'curated-cache',
      data: FALLBACK_DATA,
      message: '구글 스프레드시트 로드 실패로 로컬 고증 캐시 데이터를 반환했습니다.',
      googleSheetSync: 'failed'
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600'
      }
    });
  }

  try {
    const seenNames = new Set<string>();
    const deduplicatedCompanies: { name: string; address: string; indName: string }[] = [];

    // Populate deduplicatedCompanies solely from the parsed Google Sheet data (Single Source of Truth)
    Object.entries(dynamicAnchors).forEach(([cat, list]) => {
      list.forEach(entry => {
        const parts = entry.split(' - ');
        const name = parts[0];
        const addr = parts.slice(1).join(' - ') || '자사빌딩';
        const cleanName = cleanCompanyName(name);

        if (cleanName && !seenNames.has(cleanName)) {
          seenNames.add(cleanName);
          deduplicatedCompanies.push({
            name: name,
            address: addr,
            indName: cat
          });
        }
      });
    });

    let itCount = 0;
    let semiCount = 0;
    let bioCount = 0;
    let serviceCount = 0;
    let otherCount = 0;

    const matchedCompanies: Record<string, { name: string; address: string }[]> = {
      'IT·소프트웨어': [],
      '반도체·첨단제조': [],
      '바이오·헬스케어': [],
      '지식기반 서비스': [],
      '정밀기기 및 기타': []
    };

    deduplicatedCompanies.forEach((c) => {
      const cmpNm = c.name;
      const addr = c.address;
      const indName = c.indName;

      // Skip non-Techno Valley centers
      if (addr.includes('동탄케이티') || addr.includes('동탄KT') || addr.includes('KT동탄') || addr.includes('케이티')) {
        return;
      }

      // Map categories based on industry code name, sheet category, or company name
      if (indName === 'IT·소프트웨어' || indName.includes('소프트웨어') || indName.includes('정보') || indName.includes('통신') || indName.includes('출판') || indName.includes('프로그래밍') || indName.includes('IT') || indName.includes('개발')) {
        itCount++;
        if (matchedCompanies['IT·소프트웨어'].length < 2500) {
          matchedCompanies['IT·소프트웨어'].push({ name: cmpNm, address: addr });
        }
      } else if (indName === '반도체·첨단제조' || indName.includes('반도체') || indName.includes('웨이퍼') || indName.includes('전자부품') || indName.includes('기계') || indName.includes('제조') || indName.includes('장비') || cmpNm.includes('테크') || cmpNm.includes('정밀') || cmpNm.includes('세미') || cmpNm.includes('반도체') || cmpNm.includes('에이이에스엠') || cmpNm.includes('케이씨텍') || cmpNm.includes('어플라이드') || cmpNm.includes('도쿄일렉')) {
        semiCount++;
        if (matchedCompanies['반도체·첨단제조'].length < 2500) {
          matchedCompanies['반도체·첨단제조'].push({ name: cmpNm, address: addr });
        }
      } else if (indName === '바이오·헬스케어' || indName.includes('의료') || indName.includes('의약') || (indName.includes('정밀') && indName !== '정밀기기 및 기타') || indName.includes('바이오') || indName.includes('진단') || cmpNm.includes('바이오') || cmpNm.includes('제약') || cmpNm.includes('우정바이오') || cmpNm.includes('아산제약') || cmpNm.includes('씨티씨바이오')) {
        bioCount++;
        if (matchedCompanies['바이오·헬스케어'].length < 2500) {
          matchedCompanies['바이오·헬스케어'].push({ name: cmpNm, address: addr });
        }
      } else if (indName === '지식기반 서비스' || indName.includes('연구') || indName.includes('전문') || indName.includes('과학') || indName.includes('기술') || indName.includes('서비스') || indName.includes('컨설팅') || cmpNm.includes('에스') || cmpNm.includes('코리아')) {
        serviceCount++;
        if (matchedCompanies['지식기반 서비스'].length < 2500) {
          matchedCompanies['지식기반 서비스'].push({ name: cmpNm, address: addr });
        }
      } else {
        otherCount++;
        if (matchedCompanies['정밀기기 및 기타'].length < 2500) {
          matchedCompanies['정밀기기 및 기타'].push({ name: cmpNm, address: addr });
        }
      }
    });

    const total = itCount + semiCount + bioCount + serviceCount + otherCount;
    if (total === 0) {
      throw new Error('No items matched after classification');
    }

    const getFinalCompanies = (cat: string) => {
      const liveList = matchedCompanies[cat];
      const anchors = dynamicAnchors[cat] || [];
      
      const uniqueLiveList: typeof liveList = [];
      const seen = new Set<string>();
      
      const fullAddressAnchors = anchors.map(a => {
        const parts = a.split(' - ');
        const name = parts[0];
        const addr = parts.slice(1).join(' - ') || '자사빌딩';
        return `${name} - ${addr.trim()}`;
      });
      
      fullAddressAnchors.forEach(a => {
        const cleanName = cleanCompanyName(a.split(' - ')[0]);
        seen.add(cleanName);
      });
      
      liveList.forEach(c => {
        const cleanName = cleanCompanyName(c.name);
        if (!seen.has(cleanName)) {
          seen.add(cleanName);
          uniqueLiveList.push(c);
        }
      });
      
      const formattedLive = uniqueLiveList
        .map(c => {
          const cleanName = cleanCompanyName(c.name);
          return `${cleanName} - ${(c.address || '자사빌딩').trim()}`;
        })
        .filter((c): c is string => c !== null);
      
      const merged = [...fullAddressAnchors, ...formattedLive];
      
      // Sort based on score representing: 1. Brand awareness, 2. Market cap, 3. Revenue
      merged.sort((a, b) => {
        const nameA = a.split(' - ')[0];
        const nameB = b.split(' - ')[0];
        return getCompanyScore(nameB) - getCompanyScore(nameA);
      });

      return merged.slice(0, 2500);
    };

    const calculatedData = [
      {
        name: '반도체·첨단제조',
        value: parseFloat(((semiCount / total) * 100).toFixed(1)),
        color: '#9a3412',
        count: semiCount,
        companies: getFinalCompanies('반도체·첨단제조')
      },
      {
        name: 'IT·소프트웨어',
        value: parseFloat(((itCount / total) * 100).toFixed(1)),
        color: '#ea580c',
        count: itCount,
        companies: getFinalCompanies('IT·소프트웨어')
      },
      {
        name: '바이오·헬스케어',
        value: parseFloat(((bioCount / total) * 100).toFixed(1)),
        color: '#f59e0b',
        count: bioCount,
        companies: getFinalCompanies('바이오·헬스케어')
      },
      {
        name: '지식기반 서비스',
        value: parseFloat(((serviceCount / total) * 100).toFixed(1)),
        color: '#fdba74',
        count: serviceCount,
        companies: getFinalCompanies('지식기반 서비스')
      },
      {
        name: '정밀기기 및 기타',
        value: parseFloat(((otherCount / total) * 100).toFixed(1)),
        color: '#e7e5e4',
        count: otherCount,
        companies: getFinalCompanies('정밀기기 및 기타')
      }
    ];

    logger.info('GET /api/technovalley/industry-distribution', 'Fetched and parsed successfully from Google Sheets (SSOT)', { total });

    return NextResponse.json({
      success: true,
      source: 'google-sheet-ssot',
      data: calculatedData,
      message: '구글 스프레드시트 싱글소스(SSOT) 동기화 성공',
      googleSheetSync: 'active',
      totalCount: total
    }, {
      status: 200
    });

  } catch (err) {
    logger.error('GET /api/technovalley/industry-distribution', 'Failed to fetch live APIs, using fallback data', {}, err);
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
