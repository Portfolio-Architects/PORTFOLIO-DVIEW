import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    
    // Fallback values
    const title = searchParams.get('title') || '동탄 아파트 가치분석';
    const subtitle = searchParams.get('subtitle') || '실거래가 및 전문가 임장 리포트 확인하기';
    const bgUrl = searchParams.get('bgUrl');
    const price = searchParams.get('price');
    const ratio = searchParams.get('ratio');
    const status = searchParams.get('status');

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
    return new Response('Failed to generate OG image', { status: 500 });
  }
}
