import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { z } from 'zod';

export const runtime = 'edge';

const ogParamsSchema = z.object({
  title: z.preprocess((val) => val || undefined, z.string().default('동탄 아파트 가치분석')).catch('동탄 아파트 가치분석'),
  subtitle: z.preprocess((val) => val || undefined, z.string().default('실거래가 및 전문가 임장 리포트 확인하기')).catch('실거래가 및 전문가 임장 리포트 확인하기'),
  bgUrl: z.string().nullable().optional().catch(null),
  price: z.string().nullable().optional().catch(null),
  ratio: z.string().nullable().optional().catch(null),
  status: z.string().nullable().optional().catch(null),
  type: z.string().nullable().optional().catch(null),
  dept: z.preprocess((val) => val || undefined, z.string().default('동탄구청')).catch('동탄구청'),
  shareType: z.preprocess((val) => (val === 'childcare' || val === 'infra' ? val : null), z.enum(['childcare', 'infra']).nullable().optional()).catch(null),
  grade: z.preprocess((val) => (val === 'S' || val === 'A' || val === 'B' || val === 'C' ? val : undefined), z.enum(['S', 'A', 'B', 'C']).default('C')).catch('C'),
  score: z.preprocess((val) => {
    if (typeof val === 'string' && /^\d+$/.test(val)) return val;
    return undefined;
  }, z.string().default('0')).catch('0'),
  lien: z.string().nullable().optional().catch(null),
  totalDebt: z.string().nullable().optional().catch(null),
  bestProduct: z.string().nullable().optional().catch(null),
  category: z.string().nullable().optional().catch(null),
  date: z.string().nullable().optional().catch(null),
  location: z.string().nullable().optional().catch(null),
  tip: z.string().nullable().optional().catch(null),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    
    // Schema with individual .catch() will guarantee safeParse is always successful and defaults populated
    const parsed = ogParamsSchema.safeParse({
      title: searchParams.get('title'),
      subtitle: searchParams.get('subtitle'),
      bgUrl: searchParams.get('bgUrl'),
      price: searchParams.get('price'),
      ratio: searchParams.get('ratio'),
      status: searchParams.get('status'),
      type: searchParams.get('type'),
      dept: searchParams.get('dept'),
      shareType: searchParams.get('shareType'),
      grade: searchParams.get('grade'),
      score: searchParams.get('score'),
      lien: searchParams.get('lien'),
      totalDebt: searchParams.get('totalDebt'),
      bestProduct: searchParams.get('bestProduct'),
      category: searchParams.get('category'),
      date: searchParams.get('date'),
      location: searchParams.get('location'),
      tip: searchParams.get('tip'),
    });

    const validatedData = parsed.success ? parsed.data : {
      title: '동탄 아파트 가치분석',
      subtitle: '실거래가 및 전문가 임장 리포트 확인하기',
      bgUrl: null,
      price: null,
      ratio: null,
      status: null,
      type: null,
      dept: '동탄구청',
      shareType: null,
      grade: 'C' as const,
      score: '0',
      lien: null,
      totalDebt: null,
      bestProduct: null,
      category: null,
      date: null,
      location: null,
      tip: null,
    };

    const {
      title,
      subtitle,
      bgUrl,
      price,
      ratio,
      status,
      type,
      dept,
      shareType,
      grade,
      score,
      lien,
      totalDebt,
      bestProduct,
      category,
      date,
      location,
      tip,
    } = validatedData;

    if (type === 'event') {
      let categoryBg = 'rgba(13, 148, 136, 0.1)';
      let categoryText = '#0d9488';
      let categoryBorder = 'rgba(13, 148, 136, 0.3)';
      
      if (category === '공연/축제') {
        categoryBg = 'rgba(22, 163, 74, 0.1)';
        categoryText = '#16a34a';
        categoryBorder = 'rgba(22, 163, 74, 0.3)';
      } else if (category === '마켓/플리마켓') {
        categoryBg = 'rgba(219, 39, 119, 0.1)';
        categoryText = '#db2777';
        categoryBorder = 'rgba(219, 39, 119, 0.3)';
      } else if (category === '체험/교육') {
        categoryBg = 'rgba(2, 132, 199, 0.1)';
        categoryText = '#0284c7';
        categoryBorder = 'rgba(2, 132, 199, 0.3)';
      }

      return new ImageResponse(
        (
          <div
            style={{
              height: '100%',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              justifyContent: 'center',
              backgroundColor: '#042f2e',
              backgroundImage: 'linear-gradient(to bottom right, #0f172a, #042f2e)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                padding: '60px 80px',
                color: 'white',
                position: 'relative',
                width: '100%',
                height: '100%',
                justifyContent: 'center',
              }}
            >
              {/* Header Logo Row */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '30px',
                }}
              >
                <div
                  style={{
                    background: '#0d9488',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '24px',
                    letterSpacing: '-0.5px',
                  }}
                >
                  D-VIEW
                </div>
                <span
                  style={{
                    marginLeft: '16px',
                    fontSize: '24px',
                    color: '#2dd4bf',
                    fontWeight: 'bold',
                  }}
                >
                  동탄 로컬 소식 & 일정 큐레이션
                </span>
              </div>

              {/* Title & Category Badge */}
              <div style={{ display: 'flex', alignItems: 'center', width: '100%', marginBottom: '24px' }}>
                <div
                  style={{
                    fontSize: '44px',
                    fontWeight: 800,
                    letterSpacing: '-1.5px',
                    lineHeight: 1.2,
                    color: '#f0fdfa',
                    flex: 1,
                  }}
                >
                  {title}
                </div>
                {category && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '10px 24px',
                      borderRadius: '30px',
                      backgroundColor: categoryBg,
                      border: `2px solid ${categoryBorder}`,
                      marginLeft: '40px',
                    }}
                  >
                    <span style={{ fontSize: '20px', fontWeight: 900, color: categoryText }}>{category}</span>
                  </div>
                )}
              </div>

              {/* Event Info Details */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  padding: '24px 30px',
                  borderRadius: '20px',
                  width: '100%',
                  marginBottom: '20px',
                }}
              >
                <div style={{ display: 'flex', marginBottom: '16px', alignItems: 'center' }}>
                  <span style={{ fontSize: '18px', color: '#9cc3cf', fontWeight: 'bold', width: '80px' }}>일시</span>
                  <span style={{ fontSize: '20px', color: '#ffffff', fontWeight: 600 }}>{date || '미정'}</span>
                </div>
                <div style={{ display: 'flex', marginBottom: '16px', alignItems: 'center' }}>
                  <span style={{ fontSize: '18px', color: '#9cc3cf', fontWeight: 'bold', width: '80px' }}>장소</span>
                  <span style={{ fontSize: '20px', color: '#ffffff', fontWeight: 600 }}>{location || '미정'}</span>
                </div>
                {tip && (
                  <div style={{ display: 'flex', flexDirection: 'column', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '16px' }}>
                    <span style={{ fontSize: '16px', color: '#2dd4bf', fontWeight: 'bold', marginBottom: '6px' }}>D-VIEW 추천 현장 꿀팁</span>
                    <span style={{ fontSize: '18px', color: '#cbd5e1', fontWeight: 500, lineHeight: 1.4 }}>{tip}</span>
                  </div>
                )}
              </div>
              
              <div
                style={{
                  marginTop: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  color: '#2dd4bf',
                  fontSize: '24px',
                  fontWeight: 'bold',
                }}
              >
                dongtanview.com
              </div>
            </div>
          </div>
        ),
        {
          width: 1200,
          height: 630,
        }
      );
    }

    if (type === 'jeonse') {
      let statusColor = '#10b981'; // Green
      let statusBg = 'rgba(16, 185, 129, 0.1)';
      let statusBorder = 'rgba(16, 185, 129, 0.3)';
      if (status?.includes('위험')) {
        statusColor = '#ef4444';
        statusBg = 'rgba(239, 68, 68, 0.1)';
        statusBorder = 'rgba(239, 68, 68, 0.3)';
      } else if (status?.includes('경고')) {
        statusColor = '#f97316';
        statusBg = 'rgba(249, 115, 22, 0.1)';
        statusBorder = 'rgba(249, 115, 22, 0.3)';
      } else if (status?.includes('주의')) {
        statusColor = '#f59e0b';
        statusBg = 'rgba(245, 158, 11, 0.1)';
        statusBorder = 'rgba(245, 158, 11, 0.3)';
      }

      const debtRatioNum = parseFloat(ratio || '0') || 0;

      return new ImageResponse(
        (
          <div
            style={{
              height: '100%',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              justifyContent: 'center',
              backgroundColor: '#022c22',
              backgroundImage: 'linear-gradient(to bottom right, #064e3b, #022c22)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                padding: '60px 80px',
                color: 'white',
                position: 'relative',
                width: '100%',
                height: '100%',
                justifyContent: 'center',
              }}
            >
              {/* Header Logo Row */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '30px',
                }}
              >
                <div
                  style={{
                    background: '#00d29d',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '24px',
                    letterSpacing: '-0.5px',
                  }}
                >
                  D-VIEW
                </div>
                <span
                  style={{
                    marginLeft: '16px',
                    fontSize: '24px',
                    color: '#34d399',
                    fontWeight: 'bold',
                  }}
                >
                  전세 깡통전세 안전진단 리포트
                </span>
              </div>

              {/* Title & Status Badge */}
              <div style={{ display: 'flex', alignItems: 'center', width: '100%', marginBottom: '24px' }}>
                <div
                  style={{
                    fontSize: '48px',
                    fontWeight: 800,
                    letterSpacing: '-1.5px',
                    lineHeight: 1.2,
                    color: '#f0fdf4',
                    flex: 1,
                  }}
                >
                  {title}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '12px 28px',
                    borderRadius: '30px',
                    backgroundColor: statusBg,
                    border: `2px solid ${statusBorder}`,
                    marginLeft: '40px',
                  }}
                >
                  <span style={{ fontSize: '28px', fontWeight: 900, color: statusColor }}>{status || '안전'}</span>
                </div>
              </div>

              {/* LTV ratio bar */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  width: '100%',
                  marginBottom: '24px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                  <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#a7f3d0' }}>부채비율(LTV):</span>
                  <span style={{ fontSize: '26px', fontWeight: 900, color: '#ffffff', marginLeft: '10px' }}>{ratio || '0'}%</span>
                </div>
                <div
                  style={{
                    width: '100%',
                    height: '16px',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    display: 'flex',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min(debtRatioNum, 100)}%`,
                      height: '100%',
                      backgroundColor: statusColor,
                      borderRadius: '8px',
                    }}
                  />
                </div>
              </div>

              {/* Metrics Table Grid */}
              <div
                style={{
                  display: 'flex',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  padding: '20px 30px',
                  borderRadius: '20px',
                  width: '100%',
                  justifyContent: 'space-between',
                  marginBottom: '20px',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '16px', color: '#a7f3d0', fontWeight: 'bold', marginBottom: '4px' }}>매매 평균시세</span>
                  <span style={{ fontSize: '22px', color: '#ffffff', fontWeight: 'black' }}>{price || '0원'}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '16px', color: '#a7f3d0', fontWeight: 'bold', marginBottom: '4px' }}>선순위 융자금</span>
                  <span style={{ fontSize: '22px', color: '#ffffff', fontWeight: 'black' }}>{lien || '0원'}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '16px', color: '#a7f3d0', fontWeight: 'bold', marginBottom: '4px' }}>총 부채액</span>
                  <span style={{ fontSize: '22px', color: '#ff8a9a', fontWeight: 'black' }}>{totalDebt || '0원'}</span>
                </div>
              </div>
              
              <div
                style={{
                  marginTop: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  color: '#34d399',
                  fontSize: '24px',
                  fontWeight: 'bold',
                }}
              >
                dongtanview.com
              </div>
            </div>
          </div>
        ),
        {
          width: 1200,
          height: 630,
        }
      );
    }

    if (type === 'mortgage') {
      return new ImageResponse(
        (
          <div
            style={{
              height: '100%',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              justifyContent: 'center',
              backgroundColor: '#0f172a',
              backgroundImage: 'linear-gradient(to bottom right, #1e1b4b, #0f172a)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                padding: '60px 80px',
                color: 'white',
                position: 'relative',
                width: '100%',
                height: '100%',
                justifyContent: 'center',
              }}
            >
              {/* Header Logo Row */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '30px',
                }}
              >
                <div
                  style={{
                    background: '#3182f6',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '24px',
                    letterSpacing: '-0.5px',
                  }}
                >
                  D-VIEW
                </div>
                <span
                  style={{
                    marginLeft: '16px',
                    fontSize: '24px',
                    color: '#93c5fd',
                    fontWeight: 'bold',
                  }}
                >
                  내 집 마련 자금조달 진단 리포트
                </span>
              </div>

              {/* Title & Best Product Badge */}
              <div style={{ display: 'flex', alignItems: 'center', width: '100%', marginBottom: '24px' }}>
                <div
                  style={{
                    fontSize: '48px',
                    fontWeight: 800,
                    letterSpacing: '-1.5px',
                    lineHeight: 1.2,
                    color: '#f8fafc',
                    flex: 1,
                  }}
                >
                  {title}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '12px 24px',
                    borderRadius: '30px',
                    backgroundColor: 'rgba(49, 130, 246, 0.1)',
                    border: '2px solid rgba(49, 130, 246, 0.3)',
                    marginLeft: '40px',
                  }}
                >
                  <span style={{ fontSize: '22px', fontWeight: 900, color: '#60a5fa' }}>{bestProduct || '추천 상품 없음'}</span>
                </div>
              </div>

              {/* Metrics Grid */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  padding: '24px 30px',
                  borderRadius: '20px',
                  width: '100%',
                  marginBottom: '20px',
                }}
              >
                <div style={{ display: 'flex', width: '50%', flexDirection: 'column', marginBottom: '20px' }}>
                  <span style={{ fontSize: '15px', color: '#93c5fd', fontWeight: 'bold', marginBottom: '4px' }}>추천 대출한도</span>
                  <span style={{ fontSize: '24px', color: '#ffffff', fontWeight: 'black' }}>{price || '0원'}</span>
                </div>
                <div style={{ display: 'flex', width: '50%', flexDirection: 'column', marginBottom: '20px' }}>
                  <span style={{ fontSize: '15px', color: '#93c5fd', fontWeight: 'bold', marginBottom: '4px' }}>적용 금리</span>
                  <span style={{ fontSize: '24px', color: '#38bdf8', fontWeight: 'black' }}>{ratio || '0.0'}%</span>
                </div>
                <div style={{ display: 'flex', width: '50%', flexDirection: 'column' }}>
                  <span style={{ fontSize: '15px', color: '#93c5fd', fontWeight: 'bold', marginBottom: '4px' }}>필요 자기자본</span>
                  <span style={{ fontSize: '24px', color: '#ffffff', fontWeight: 'black' }}>{status || '0원'}</span>
                </div>
                <div style={{ display: 'flex', width: '50%', flexDirection: 'column' }}>
                  <span style={{ fontSize: '15px', color: '#93c5fd', fontWeight: 'bold', marginBottom: '4px' }}>월 예상 상환금</span>
                  <span style={{ fontSize: '24px', color: '#818cf8', fontWeight: 'black' }}>{subtitle || '0원'}</span>
                </div>
              </div>
              
              <div
                style={{
                  marginTop: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  color: '#38bdf8',
                  fontSize: '24px',
                  fontWeight: 'bold',
                }}
              >
                dongtanview.com
              </div>
            </div>
          </div>
        ),
        {
          width: 1200,
          height: 630,
        }
      );
    }

    if (shareType === 'childcare') {
      const scoreColors: Record<string, { bg: string; border: string; glow: string; desc: string }> = {
        S: { bg: '#db2777', border: '#fbcfe8', glow: 'rgba(219, 39, 119, 0.4)', desc: '최상급 초품아 + 대형 학원가 인접 (최고의 자녀 양육 환경)' },
        A: { bg: '#059669', border: '#a7f3d0', glow: 'rgba(5, 150, 105, 0.4)', desc: '안심 도보 통학 및 우수한 학원가 인프라 완비' },
        B: { bg: '#d97706', border: '#fde68a', glow: 'rgba(217, 119, 6, 0.4)', desc: '양호한 통학 거리와 균형 잡힌 근린 교육 환경' },
        C: { bg: '#475569', border: '#e2e8f0', glow: 'rgba(71, 85, 105, 0.4)', desc: '보통 수준의 교육 여건' }
      };
      const colors = scoreColors[grade] || scoreColors.C;
      return new ImageResponse(
        (
          <div
            style={{
              height: '100%',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              justifyContent: 'center',
              backgroundColor: '#022c22',
              backgroundImage: 'linear-gradient(to bottom right, #064e3b, #022c22)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                padding: '80px',
                color: 'white',
                position: 'relative',
                width: '100%',
                height: '100%',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '40px',
                }}
              >
                <div
                  style={{
                    background: '#00d29d',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '24px',
                    letterSpacing: '-0.5px',
                  }}
                >
                  D-VIEW
                </div>
                <span
                  style={{
                    marginLeft: '16px',
                    fontSize: '24px',
                    color: '#34d399',
                    fontWeight: 'bold',
                  }}
                >
                  자녀양육·학군 분석 리포트
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', width: '100%', marginBottom: '32px' }}>
                <div
                  style={{
                    fontSize: '56px',
                    fontWeight: 800,
                    letterSpacing: '-2px',
                    lineHeight: 1.3,
                    color: '#f0fdf4',
                    flex: 1,
                  }}
                >
                  {title}
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '140px',
                    height: '140px',
                    borderRadius: '70px',
                    backgroundColor: colors.bg,
                    border: `6px solid ${colors.border}`,
                    boxShadow: `0 0 20px ${colors.glow}`,
                    marginLeft: '40px',
                  }}
                >
                  <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'rgba(255, 255, 255, 0.8)', letterSpacing: '1px' }}>GRADE</span>
                  <span style={{ fontSize: '54px', fontWeight: 900, color: '#ffffff', lineHeight: 1 }}>{grade}</span>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  padding: '24px 32px',
                  borderRadius: '20px',
                  marginBottom: '24px',
                  width: '100%',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '8px' }}>
                  <span style={{ fontSize: '22px', fontWeight: 'bold', color: '#a7f3d0' }}>종합 육아 환경 지수:</span>
                  <span style={{ fontSize: '36px', fontWeight: 900, color: '#ffffff', marginLeft: '12px', lineHeight: 1 }}>{score}</span>
                  <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#34d399', marginLeft: '4px' }}>/ 100점</span>
                </div>
                <div style={{ fontSize: '20px', color: '#d1fae5', fontWeight: 500, lineHeight: 1.4 }}>
                  {colors.desc}
                </div>
              </div>
              
              <div
                style={{
                  marginTop: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  color: '#34d399',
                  fontSize: '28px',
                  fontWeight: 'bold',
                }}
              >
                dongtanview.com
              </div>
            </div>
          </div>
        ),
        {
          width: 1200,
          height: 630,
        }
      );
    }

    if (shareType === 'infra') {
      const scoreColors: Record<string, { bg: string; border: string; glow: string; desc: string }> = {
        S: { bg: '#3182f6', border: '#cbdcfb', glow: 'rgba(49, 130, 246, 0.4)', desc: '초역세권 및 대형 상권 밀집 (최고 수준의 생활 편의성)' },
        A: { bg: '#0284c7', border: '#bae6fd', glow: 'rgba(2, 132, 199, 0.4)', desc: '역세권 입지와 스타벅스 등 핵심 상권 완비' },
        B: { bg: '#4f46e5', border: '#c7d2fe', glow: 'rgba(79, 70, 229, 0.4)', desc: '안정적인 대중교통망과 풍부한 근린 상권 보유' },
        C: { bg: '#475569', border: '#e2e8f0', glow: 'rgba(71, 85, 105, 0.4)', desc: '보통 수준의 생활 인프라' }
      };
      const colors = scoreColors[grade] || scoreColors.C;
      return new ImageResponse(
        (
          <div
            style={{
              height: '100%',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              justifyContent: 'center',
              backgroundColor: '#0f172a',
              backgroundImage: 'linear-gradient(to bottom right, #1e293b, #0f172a)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                padding: '80px',
                color: 'white',
                position: 'relative',
                width: '100%',
                height: '100%',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '40px',
                }}
              >
                <div
                  style={{
                    background: '#3182f6',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '24px',
                    letterSpacing: '-0.5px',
                  }}
                >
                  D-VIEW
                </div>
                <span
                  style={{
                    marginLeft: '16px',
                    fontSize: '24px',
                    color: '#93c5fd',
                    fontWeight: 'bold',
                  }}
                >
                  단지 입지·생활 인프라 분석 리포트
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', width: '100%', marginBottom: '32px' }}>
                <div
                  style={{
                    fontSize: '56px',
                    fontWeight: 800,
                    letterSpacing: '-2px',
                    lineHeight: 1.3,
                    color: '#f8fafc',
                    flex: 1,
                  }}
                >
                  {title}
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '140px',
                    height: '140px',
                    borderRadius: '70px',
                    backgroundColor: colors.bg,
                    border: `6px solid ${colors.border}`,
                    boxShadow: `0 0 20px ${colors.glow}`,
                    marginLeft: '40px',
                  }}
                >
                  <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'rgba(255, 255, 255, 0.8)', letterSpacing: '1px' }}>GRADE</span>
                  <span style={{ fontSize: '54px', fontWeight: 900, color: '#ffffff', lineHeight: 1 }}>{grade}</span>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  padding: '24px 32px',
                  borderRadius: '20px',
                  marginBottom: '24px',
                  width: '100%',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '8px' }}>
                  <span style={{ fontSize: '22px', fontWeight: 'bold', color: '#93c5fd' }}>종합 생활 인프라 지수:</span>
                  <span style={{ fontSize: '36px', fontWeight: 900, color: '#ffffff', marginLeft: '12px', lineHeight: 1 }}>{score}</span>
                  <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#60a5fa', marginLeft: '4px' }}>/ 100점</span>
                </div>
                <div style={{ fontSize: '20px', color: '#cbd5e1', fontWeight: 500, lineHeight: 1.4 }}>
                  {colors.desc}
                </div>
              </div>
              
              <div
                style={{
                  marginTop: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  color: '#38bdf8',
                  fontSize: '28px',
                  fontWeight: 'bold',
                }}
              >
                dongtanview.com
              </div>
            </div>
          </div>
        ),
        {
          width: 1200,
          height: 630,
        }
      );
    }

    if (type === 'notice') {
      return new ImageResponse(
        (
          <div
            style={{
              height: '100%',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              justifyContent: 'center',
              backgroundColor: '#064e3b',
              backgroundImage: 'linear-gradient(to bottom right, #064e3b, #022c22)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                padding: '80px',
                color: 'white',
                position: 'relative',
                width: '100%',
                height: '100%',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '40px',
                }}
              >
                <div
                  style={{
                    background: '#00d29d',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '24px',
                    letterSpacing: '-0.5px',
                  }}
                >
                  D-VIEW
                </div>
                <span
                  style={{
                    marginLeft: '16px',
                    fontSize: '24px',
                    color: '#a7f3d0',
                    fontWeight: 'bold',
                  }}
                >
                  동탄구 공식 소식
                </span>
              </div>

              <div
                style={{
                  fontSize: '60px',
                  fontWeight: 800,
                  letterSpacing: '-2px',
                  lineHeight: 1.3,
                  marginBottom: '32px',
                  color: '#f0fdf4',
                  maxWidth: '1040px',
                }}
              >
                {title}
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '24px',
                }}
              >
                <div
                  style={{
                    background: '#047857',
                    color: '#ecfdf5',
                    padding: '8px 20px',
                    borderRadius: '30px',
                    fontSize: '24px',
                    fontWeight: 'bold',
                    marginRight: '12px',
                    border: '1px solid #10b981',
                  }}
                >
                  담당 부서: {dept}
                </div>
              </div>

              <div
                style={{
                  fontSize: '32px',
                  color: '#d1fae5',
                  fontWeight: 500,
                  letterSpacing: '-1px',
                }}
              >
                {subtitle || '실시간 화성·동탄 행정망 고시공고 자동 연동'}
              </div>
              
              <div
                style={{
                  marginTop: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  color: '#34d399',
                  fontSize: '28px',
                  fontWeight: 'bold',
                }}
              >
                dongtanview.com
              </div>
            </div>
          </div>
        ),
        {
          width: 1200,
          height: 630,
        }
      );
    }

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'center',
            backgroundColor: '#0f172a',
            backgroundImage: bgUrl
              ? `url(${bgUrl})`
              : 'linear-gradient(to bottom right, #1e293b, #0f172a)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {/* Dark Overlay for readability if there is a background image */}
          {bgUrl && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.7)',
              }}
            />
          )}

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: '80px',
              color: 'white',
              position: 'relative',
              width: '100%',
              height: '100%',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '40px',
              }}
            >
              <div
                style={{
                  background: '#00d29d',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '24px',
                  letterSpacing: '-0.5px',
                }}
              >
                D-VIEW
              </div>
              <span
                style={{
                  marginLeft: '16px',
                  fontSize: '24px',
                  color: '#94a3b8',
                  fontWeight: 500,
                }}
              >
                Dongtan Data Lab
              </span>
            </div>

            <div
              style={{
                fontSize: '72px',
                fontWeight: 800,
                letterSpacing: '-2px',
                lineHeight: 1.2,
                marginBottom: '24px',
                color: '#f8fafc',
                maxWidth: '900px',
              }}
            >
              {title}
            </div>

            {/* Price Info Badges Row */}
            {(price || ratio || status) && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '24px',
                }}
              >
                {price && (
                  <div
                    style={{
                      background: '#f04452',
                      color: 'white',
                      padding: '8px 20px',
                      borderRadius: '30px',
                      fontSize: '26px',
                      fontWeight: 'bold',
                      marginRight: '12px',
                    }}
                  >
                    최근 매매 {price}
                  </div>
                )}
                {ratio && (
                  <div
                    style={{
                      background: '#3182f6',
                      color: 'white',
                      padding: '8px 20px',
                      borderRadius: '30px',
                      fontSize: '26px',
                      fontWeight: 'bold',
                      marginRight: '12px',
                    }}
                  >
                    전세가율 {ratio}%
                  </div>
                )}
                {status && (
                  <div
                    style={{
                      background: status === '신고가' ? '#ffebed' : '#e0fbf4',
                      color: status === '신고가' ? '#ff4b5c' : '#00b386',
                      border: `2px solid ${status === '신고가' ? '#ff4b5c' : '#00b386'}`,
                      padding: '6px 18px',
                      borderRadius: '30px',
                      fontSize: '22px',
                      fontWeight: 'bold',
                    }}
                  >
                    {status}
                  </div>
                )}
              </div>
            )}

            <div
              style={{
                fontSize: '36px',
                color: '#cbd5e1',
                fontWeight: 500,
                letterSpacing: '-1px',
              }}
            >
              {subtitle}
            </div>
            
            <div
              style={{
                marginTop: 'auto',
                display: 'flex',
                alignItems: 'center',
                color: '#38bdf8',
                fontSize: '28px',
                fontWeight: 'bold',
              }}
            >
              dongtanview.com
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: any) {
    console.error('OG Image Generation Error:', e);
    try {
      return new ImageResponse(
        (
          <div
            style={{
              height: '100%',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#022c22',
              backgroundImage: 'linear-gradient(to bottom right, #064e3b, #022c22)',
              color: 'white',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ background: '#00d29d', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', fontSize: '24px' }}>
                D-VIEW
              </div>
            </div>
            <div style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '16px' }}>
              동탄 아파트 가치분석 D-VIEW
            </div>
            <div style={{ fontSize: '24px', color: '#a7f3d0' }}>
              실거래가 및 전문가 임장 리포트 확인하기
            </div>
          </div>
        ),
        {
          width: 1200,
          height: 630,
        }
      );
    } catch (fallbackErr) {
      console.error('OG Fallback Image Generation Error:', fallbackErr);
      return new Response('Failed to generate OG image', { status: 500 });
    }
  }
}
