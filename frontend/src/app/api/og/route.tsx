import { ImageResponse as NextImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { logger } from '@/lib/services/logger';

let fontBoldBuffer: ArrayBuffer | null = null;
let fontRegularBuffer: ArrayBuffer | null = null;

class ImageResponse extends NextImageResponse {
  constructor(...args: ConstructorParameters<typeof NextImageResponse>) {
    const [element, options] = args;
    const cacheHeaders = {
      'Cache-Control': 'public, max-age=86400, s-maxage=31536000, stale-while-revalidate=60',
    };
    
    // Assemble fonts configuration if buffers are hydrated
    const fontsOption = fontBoldBuffer && fontRegularBuffer ? [
      {
        name: 'Pretendard',
        data: fontBoldBuffer,
        weight: 700 as const,
        style: 'normal' as const,
      },
      {
        name: 'Pretendard',
        data: fontRegularBuffer,
        weight: 400 as const,
        style: 'normal' as const,
      }
    ] : undefined;

    super(element, {
      ...options,
      fonts: options?.fonts || fontsOption,
      headers: {
        ...cacheHeaders,
        ...options?.headers,
      },
    });
  }
}

export const runtime = 'nodejs';

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
  apt1: z.string().nullable().optional().catch(null),
  apt2: z.string().nullable().optional().catch(null),
  apt3: z.string().nullable().optional().catch(null),
  score1: z.string().nullable().optional().catch(null),
  score2: z.string().nullable().optional().catch(null),
  score3: z.string().nullable().optional().catch(null),
  valStatus: z.string().nullable().optional().catch(null),
  valAmount: z.string().nullable().optional().catch(null),
});

export async function GET(req: NextRequest) {
  // Safe load of local Pretendard Fonts via fs.readFileSync for Node.js Serverless runtime
  try {
    if (!fontBoldBuffer) {
      const fontPath = path.join(process.cwd(), 'public/fonts/Pretendard-Bold.otf');
      const buffer = fs.readFileSync(fontPath);
      fontBoldBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
    }
    if (!fontRegularBuffer) {
      const fontPath = path.join(process.cwd(), 'public/fonts/Pretendard-Regular.otf');
      const buffer = fs.readFileSync(fontPath);
      fontRegularBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
    }
  } catch (fontErr) {
    logger.error('OGImageAPI.GET', 'Failed to pre-load local Web Fonts for OG image generator', {}, fontErr as Error);
    // Fail-safe: Fallback gracefully to default Satori system sans-serif fonts
  }

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
      apt1: searchParams.get('apt1'),
      apt2: searchParams.get('apt2'),
      apt3: searchParams.get('apt3'),
      score1: searchParams.get('score1'),
      score2: searchParams.get('score2'),
      score3: searchParams.get('score3'),
      valStatus: searchParams.get('valStatus'),
      valAmount: searchParams.get('valAmount'),
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
      apt1: null,
      apt2: null,
      apt3: null,
      score1: null,
      score2: null,
      score3: null,
      valStatus: null,
      valAmount: null,
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
      apt1,
      apt2,
      apt3,
      score1,
      score2,
      score3,
      valStatus,
      valAmount,
    } = validatedData;

    if (type === 'compare') {
      const s1 = parseInt(score1 || '0') || 0;
      const s2 = parseInt(score2 || '0') || 0;
      
      let winnerText = '두 단지 팽팽한 대조 분석';
      if (s1 > s2) {
        winnerText = `${apt1} 단지가 ${s1}개 지표 우세`;
      } else if (s2 > s1) {
        winnerText = `${apt2} 단지가 ${s2}개 지표 우세`;
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
              backgroundColor: '#0b1329',
              backgroundImage: 'linear-gradient(to bottom right, #1c2541, #0b1329)',
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
                  marginBottom: '20px',
                }}
              >
                <div
                  style={{
                    background: '#008262',
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
                  1:1 아파트 단지 비교 리포트
                </span>
              </div>

              {/* Title / Winner Announcement */}
              <div
                style={{
                  fontSize: '32px',
                  fontWeight: 800,
                  color: '#38bdf8',
                  marginBottom: '30px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  paddingBottom: '12px',
                  width: '100%',
                }}
              >
                {winnerText}
              </div>

              {/* VS Infographic Dual Grid */}
              <div
                style={{
                  display: 'flex',
                  width: '100%',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '20px',
                }}
              >
                {/* Left Apt */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: s1 >= s2 ? 'rgba(0, 210, 157, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                    border: `2px solid ${s1 >= s2 ? 'rgba(0, 210, 157, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                    padding: '24px',
                    borderRadius: '20px',
                    width: '44%',
                    height: '200px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '28px',
                      fontWeight: 800,
                      color: '#ffffff',
                      textAlign: 'center',
                      marginBottom: '16px',
                      maxWidth: '100%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {apt1}
                  </span>
                  <span
                    style={{
                      fontSize: '48px',
                      fontWeight: 900,
                      color: s1 >= s2 ? '#00d29d' : '#94a3b8',
                    }}
                  >
                    {s1}개 우세
                  </span>
                </div>

                {/* VS Badge */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '60px',
                    height: '60px',
                    borderRadius: '30px',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    border: '2px solid rgba(255, 255, 255, 0.2)',
                    fontSize: '24px',
                    fontWeight: 900,
                    color: '#94a3b8',
                  }}
                >
                  VS
                </div>

                {/* Right Apt */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: s2 >= s1 ? 'rgba(65, 150, 247, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                    border: `2px solid ${s2 >= s1 ? 'rgba(65, 150, 247, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                    padding: '24px',
                    borderRadius: '20px',
                    width: '44%',
                    height: '200px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '28px',
                      fontWeight: 800,
                      color: '#ffffff',
                      textAlign: 'center',
                      marginBottom: '16px',
                      maxWidth: '100%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {apt2}
                  </span>
                  <span
                    style={{
                      fontSize: '48px',
                      fontWeight: 900,
                      color: s2 >= s1 ? '#4196f7' : '#94a3b8',
                    }}
                  >
                    {s2}개 우세
                  </span>
                </div>
              </div>

              {/* Bottom Brand */}
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
                    background: '#008262',
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

    if (type === 'sell_timing') {
      const scoreVal = parseInt(score || '0') || 0;
      
      let themeColor = '#10b981'; // Emerald (Default)
      let themeBg = 'rgba(16, 185, 129, 0.1)';
      let themeBorder = 'rgba(16, 185, 129, 0.3)';
      
      if (scoreVal >= 70) {
        themeColor = '#f43f5e'; // Rose
        themeBg = 'rgba(244, 63, 94, 0.1)';
        themeBorder = 'rgba(244, 63, 94, 0.3)';
      } else if (scoreVal >= 40) {
        themeColor = '#eab308'; // Yellow
        themeBg = 'rgba(234, 179, 8, 0.1)';
        themeBorder = 'rgba(234, 179, 8, 0.3)';
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
              backgroundColor: '#022c22',
              backgroundImage: 'linear-gradient(to bottom right, #090d16, #022c22)',
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
                  marginBottom: '26px',
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
                  AI 매도 적합성 및 세무 전략 리포트
                </span>
              </div>

              {/* Main Contents Grid */}
              <div style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                
                {/* Left Area (60%) */}
                <div style={{ display: 'flex', flexDirection: 'column', width: '56%' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', marginBottom: '16px' }}>
                    <span style={{ fontSize: '46px', fontWeight: 800, color: '#ffffff', letterSpacing: '-1.5px', marginRight: '16px' }}>
                      {title}
                    </span>
                    <span style={{ fontSize: '22px', color: '#94a3b8', fontWeight: 'bold' }}>
                      {subtitle || '동탄2'}
                    </span>
                  </div>

                  {/* Pricing and Tax Info Box */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      padding: '24px 30px',
                      borderRadius: '20px',
                      width: '100%',
                    }}
                  >
                    <div style={{ display: 'flex', marginBottom: '14px', alignItems: 'center' }}>
                      <span style={{ fontSize: '18px', color: '#a7f3d0', fontWeight: 'bold', width: '110px' }}>진단 매도가</span>
                      <span style={{ fontSize: '22px', color: '#ffffff', fontWeight: 800 }}>{price || '정보 없음'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '14px' }}>
                      <span style={{ fontSize: '18px', color: '#a7f3d0', fontWeight: 'bold', width: '110px' }}>예상 세액 합계</span>
                      <span style={{ fontSize: '22px', color: ratio?.includes('0') || ratio?.includes('비과세') ? '#00d29d' : '#ff8a9a', fontWeight: 800 }}>
                        {ratio || '계산 오류'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Area (40%) - Infographic Score Display */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    padding: '26px',
                    borderRadius: '24px',
                    width: '38%',
                    height: '270px',
                  }}
                >
                  <span style={{ fontSize: '15px', color: '#94a3b8', fontWeight: 'bold', marginBottom: '10px' }}>
                    지금 팔면 호구 지수
                  </span>
                  
                  {/* Big Score Number */}
                  <span
                    style={{
                      fontSize: '72px',
                      fontWeight: 900,
                      color: themeColor,
                      lineHeight: 1,
                      letterSpacing: '-2px',
                      marginBottom: '14px',
                    }}
                  >
                    {score}%
                  </span>

                  {/* Verdict Badge */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '8px 20px',
                      borderRadius: '30px',
                      backgroundColor: themeBg,
                      border: `1.5px solid ${themeBorder}`,
                    }}
                  >
                    <span style={{ fontSize: '17px', fontWeight: 900, color: themeColor }}>
                      {status || '판정 보류'}
                    </span>
                  </div>
                </div>

              </div>

              {/* Bottom Brand */}
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
        S: { bg: '#008262', border: '#a7f3d0', glow: 'rgba(0, 130, 98, 0.4)', desc: '초역세권 및 대형 상권 밀집 (최고 수준의 생활 편의성)' },
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
                    background: '#008262',
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

    if (type === 'tax') {
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
                  marginBottom: '28px',
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
                  부동산 취득세 및 중개보수 진단 리포트
                </span>
              </div>

              {/* Title / Apartment Name */}
              <div style={{ display: 'flex', alignItems: 'center', width: '100%', marginBottom: '24px' }}>
                <div
                  style={{
                    fontSize: '44px',
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
                    padding: '10px 24px',
                    borderRadius: '30px',
                    backgroundColor: 'rgba(0, 210, 157, 0.1)',
                    border: '2px solid rgba(0, 210, 157, 0.3)',
                    marginLeft: '40px',
                  }}
                >
                  <span style={{ fontSize: '20px', fontWeight: 900, color: '#00d29d' }}>
                    {status || '1주택'} | {bestProduct || '85㎡ 이하'}
                  </span>
                </div>
              </div>

              {/* Summary of Costs */}
              <div
                style={{
                  display: 'flex',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  padding: '24px 32px',
                  borderRadius: '20px',
                  width: '100%',
                  justifyContent: 'space-between',
                  marginBottom: '20px',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '16px', color: '#a7f3d0', fontWeight: 'bold', marginBottom: '4px' }}>매매 가액</span>
                  <span style={{ fontSize: '24px', color: '#ffffff', fontWeight: 'black' }}>{price || '0원'}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '16px', color: '#a7f3d0', fontWeight: 'bold', marginBottom: '4px' }}>취득세 등 세금 합계</span>
                  <span style={{ fontSize: '24px', color: '#ffffff', fontWeight: 'black' }}>{lien || '0원'}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '16px', color: '#a7f3d0', fontWeight: 'bold', marginBottom: '4px' }}>중개수수료 (최대)</span>
                  <span style={{ fontSize: '24px', color: '#ffffff', fontWeight: 'black' }}>{totalDebt || '0원'}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '16px', color: '#ff8a9a', fontWeight: 'bold', marginBottom: '4px' }}>총 부대비용</span>
                  <span style={{ fontSize: '24px', color: '#ff8a9a', fontWeight: 'black' }}>{ratio || '0원'}</span>
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

    if (type === 'recommend') {
      const parsedApt1 = apt1 || '시범단지 대표 아파트';
      const parsedApt2 = apt2 || '호수공원 조경 아파트';
      const parsedApt3 = apt3 || '신축 역세권 아파트';
      const parsedScore1 = score1 || '98';
      const parsedScore2 = score2 || '95';
      const parsedScore3 = score3 || '91';

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
              backgroundImage: 'linear-gradient(to bottom right, #064e3b, #022c22, #021f18)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Background Compass Watermark */}
            <div
              style={{
                position: 'absolute',
                right: '-80px',
                bottom: '-80px',
                display: 'flex',
                opacity: 0.04,
                color: '#ffffff',
              }}
            >
              <svg
                width="360"
                height="360"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              >
                <circle cx="12" cy="12" r="10" />
                <polygon points="16.24,7.76 14.12,14.12 7.76,16.24 9.88,9.88" />
                <line x1="12" y1="2" x2="12" y2="4" />
                <line x1="12" y1="20" x2="12" y2="22" />
                <line x1="2" y1="12" x2="4" y2="12" />
                <line x1="20" y1="12" x2="22" y2="12" />
              </svg>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                padding: '50px 70px',
                color: 'white',
                position: 'relative',
                width: '100%',
                height: '100%',
                justifyContent: 'center',
                zIndex: 10,
              }}
            >
              {/* Header Logo Row */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '24px',
                }}
              >
                <div
                  style={{
                    background: '#00d29d',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '22px',
                    letterSpacing: '-0.5px',
                  }}
                >
                  D-VIEW
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginLeft: '14px',
                  }}
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#00d29d"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ marginRight: '8px' }}
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polygon points="16.24,7.76 14.12,14.12 7.76,16.24 9.88,9.88" fill="rgba(0, 210, 157, 0.2)" />
                  </svg>
                  <span
                    style={{
                      fontSize: '20px',
                      fontWeight: 600,
                      color: 'rgba(255, 255, 255, 0.7)',
                      letterSpacing: '-0.5px',
                    }}
                  >
                    라이프스타일 나침반 분석 리포트
                  </span>
                </div>
              </div>

              {/* Title */}
              <div
                style={{
                  fontSize: '38px',
                  fontWeight: 900,
                  marginBottom: '24px',
                  letterSpacing: '-1.5px',
                  lineHeight: '1.2',
                }}
              >
                나만의 주거 나침반 매칭 결과 TOP 3
              </div>

              {/* Recommendations list */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  width: '100%',
                }}
              >
                {[
                  { name: parsedApt1, score: parsedScore1, rank: 1 },
                  { name: parsedApt2, score: parsedScore2, rank: 2 },
                  { name: parsedApt3, score: parsedScore3, rank: 3 }
                ].map((item) => (
                  <div
                    key={item.rank}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '16px',
                      padding: '16px 28px',
                      width: '100%',
                      boxSizing: 'border-box',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '16px',
                          backgroundColor: item.rank === 1 ? '#00d29d' : 'rgba(255, 255, 255, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '16px',
                          fontWeight: 'bold',
                          marginRight: '16px',
                        }}
                      >
                        {item.rank}
                      </div>
                      <div
                        style={{
                          fontSize: '22px',
                          fontWeight: 'bold',
                          color: '#ffffff',
                          maxWidth: '650px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.name}
                      </div>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                      }}
                    >
                      <span style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 'bold' }}>매칭률</span>
                      <span style={{ fontSize: '24px', fontWeight: 900, color: '#00d29d' }}>{item.score}%</span>
                    </div>
                  </div>
                ))}
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

    if (type === 'apartment') {
      const isUnder = valStatus === 'undervalued';
      const isOver = valStatus === 'overvalued';
      const isFair = valStatus === 'fair';

      let valText = '적정 가격 수준';
      let valBg = '#1e293b';
      let valBorder = '#475569';
      let valColor = '#cbd5e1';

      if (isUnder) {
        valText = `적정가 대비 ${valAmount} 저평가`;
        valBg = '#064e3b';
        valBorder = '#059669';
        valColor = '#34d399';
      } else if (isOver) {
        valText = `적정가 대비 ${valAmount} 고평가`;
        valBg = '#7f1d1d';
        valBorder = '#dc2626';
        valColor = '#fca5a5';
      } else if (isFair) {
        valText = '적정 가격 수준';
        valBg = '#1e3a8a';
        valBorder = '#2563eb';
        valColor = '#93c5fd';
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
              backgroundColor: '#070a13',
              backgroundImage: 'linear-gradient(to bottom right, #0b1529, #022c22)',
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
                  marginBottom: '28px',
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

              {/* Title and Valuation Badge Grid */}
              <div
                style={{
                  display: 'flex',
                  width: '100%',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '32px',
                }}
              >
                <div
                  style={{
                    fontSize: '60px',
                    fontWeight: 950,
                    letterSpacing: '-2px',
                    lineHeight: 1.2,
                    color: '#f8fafc',
                    maxWidth: '650px',
                  }}
                >
                  {title}
                </div>

                {valStatus && (
                  <div
                    style={{
                      background: valBg,
                      border: `2.5px solid ${valBorder}`,
                      color: valColor,
                      padding: '12px 28px',
                      borderRadius: '30px',
                      fontSize: '24px',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                    }}
                  >
                    {valText}
                  </div>
                )}
              </div>

              {/* Price & Ratio Grid */}
              <div
                style={{
                  display: 'flex',
                  gap: '24px',
                  width: '100%',
                  marginBottom: '32px',
                }}
              >
                {/* Price Block */}
                {price && (
                  <div
                    style={{
                      flex: 1,
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1.5px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '20px',
                      padding: '24px 30px',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <span style={{ fontSize: '18px', color: '#94a3b8', fontWeight: 'bold', marginBottom: '8px' }}>
                      최근 매매가 (3M 평균)
                    </span>
                    <span style={{ fontSize: '38px', fontWeight: 'black', color: '#f8fafc' }}>
                      {price}
                    </span>
                  </div>
                )}

                {/* Ratio Block */}
                {ratio && (
                  <div
                    style={{
                      flex: 1,
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1.5px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '20px',
                      padding: '24px 30px',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <span style={{ fontSize: '18px', color: '#94a3b8', fontWeight: 'bold', marginBottom: '8px' }}>
                      전세가율
                    </span>
                    <span style={{ fontSize: '38px', fontWeight: 'black', color: '#00d29d' }}>
                      {ratio}%
                    </span>
                  </div>
                )}
              </div>

              {/* Subtitle */}
              <div
                style={{
                  fontSize: '24px',
                  color: '#94a3b8',
                  fontWeight: 500,
                  letterSpacing: '-0.5px',
                  lineHeight: 1.4,
                }}
              >
                {subtitle || '실거래 배수 및 금리 연동 적정가 분석 리포트'}
              </div>

              {/* Footer */}
              <div
                style={{
                  marginTop: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  color: '#34d399',
                  fontSize: '26px',
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
                      background: '#008262',
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
    logger.error('OGImageAPI.GET', 'OG Image Generation Error', {}, e);
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
      logger.error('OGImageAPI.GET', 'OG Fallback Image Generation Error', {}, fallbackErr as Error);
      return new Response('Failed to generate OG image', { status: 500 });
    }
  }
}
