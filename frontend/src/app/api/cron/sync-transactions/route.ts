/**
 * GET /api/cron/sync-transactions
 * 
 * 국토교통부 실거래가 API → Firestore 'transactions' 신규 거래 동기화
 * Vercel Cron에서 매일 1회 호출 (vercel.json에서 설정)
 * 수동 호출도 가능: fetch('/api/cron/sync-transactions')
 */
import { NextResponse } from 'next/server';
import { adminDb as db } from '@/lib/firebaseAdmin';
import { sendMail } from '@/lib/mailService';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';

export const dynamic = 'force-dynamic';

const API_KEY = process.env.BUILDING_API_KEY || '';
const LAWD_CDS = ['41590', '41597']; // 화성시(기존) 및 동탄구(신설) 모두 스캔
const API_BASE_TRADE = 'https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev';
const API_BASE_RENT = 'https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent';

interface GovApiItem {
  aptNm: string;
  dealAmount: string;
  dealDay: string;
  dealMonth: string;
  dealYear: string;
  excluUseAr: string;
  floor: string;
  buildYear: string;
  umdNm: string;
  roadNm: string;
  buyerGbn: string;
  slerGbn: string;
  cdealDay: string;
  cdealType: string;
  dealingGbn: string;
  estateAgentSggNm: string;
  rgstDate: string;
  sggCd: string;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += c;
    }
  }
  result.push(current.trim());
  return result;
}

function normalizeAptName(name: string): string {
  if (!name) return '';
  return name
    .normalize('NFC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\[.*?\]\s*/g, '')
    .replace(/\s+/g, '')
    .replace(/[()（）]/g, '')
    .trim();
}

async function fetchTypeMap(): Promise<Record<string, Record<string, number>>> {
  const typeMap: Record<string, Record<string, number>> = {};
  const SHEET_ID = '1rKMt-B2FdN5nGaxaU0y2Pqv1WqnEv1AGnY7XXE7pCEE';
  try {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=TYPE_MAP`;
    const res = await fetch(csvUrl);
    if (res.ok) {
      const csvText = await res.text();
      const lines = csvText.split('\n').filter(l => l.trim());
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]);
        if (cols.length < 3) continue;
        const aptName = normalizeAptName(cols[1] || '');
        const area = (cols[2] || '').trim();
        const typeM2Str = (cols[3] || '').trim();
        if (aptName && area && typeM2Str) {
          if (!typeMap[aptName]) typeMap[aptName] = {};
          const match = typeM2Str.match(/\d+(\.\d+)?/);
          if (match) {
            typeMap[aptName][area] = parseFloat(match[0]) * 0.3025;
          }
        }
      }
    }
  } catch(e) {
    logger.error('SyncTransactionsAPI.fetchTypeMap', 'Failed to fetch typeMap in cron sync', {}, e as Error);
  }
  return typeMap;
}

function getSupplyPyeong(aptName: string, area: number, typeMap: Record<string, Record<string, number>>): number {
  const normApt = normalizeAptName(aptName);
  const aptEntry = typeMap[normApt];
  if (aptEntry) {
    // 1. Exact match
    const exactKey = String(area);
    if (aptEntry[exactKey]) return aptEntry[exactKey];
    
    // 2. Tolerance match (e.g. 0.1 m²)
    for (const [keyStr, val] of Object.entries(aptEntry)) {
      const keyNum = parseFloat(keyStr);
      if (!isNaN(keyNum) && Math.abs(keyNum - area) < 0.11) {
        return val;
      }
    }
  }
  
  // Fallback
  return area * 0.3025 * 1.33;
}

function extractDong(umdNm: string): string {
  return umdNm || '';
}

const authHeaderSchema = z.string().refine(
  (val) => val === `Bearer ${process.env.CRON_SECRET}`,
  { message: 'Invalid authorization token' }
);

const transactionRecordSchema = z.object({
  sigungu: z.string(),
  dong: z.string(),
  aptName: z.string(),
  area: z.number(),
  areaPyeong: z.number(),
  contractYm: z.string().length(6),
  contractDay: z.string().length(2),
  contractDate: z.string().length(8),
  price: z.number().nonnegative(),
  deposit: z.number().nonnegative(),
  monthlyRent: z.number().nonnegative(),
  floor: z.number(),
  buyer: z.string().optional().nullable(),
  seller: z.string().optional().nullable(),
  buildYear: z.number().nonnegative(),
  roadName: z.string().optional().nullable(),
  cancelDate: z.string().optional().nullable(),
  dealType: z.string(),
  agentLocation: z.string().optional().nullable(),
  registrationDate: z.string().optional().nullable(),
  housingType: z.string().optional().nullable(),
  source: z.string(),
  _key: z.string(),
  reqGb: z.string().optional(),
  rnuYn: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    if (process.env.NODE_ENV !== 'development') {
      const authHeader = request.headers.get('authorization') || '';
      const authResult = authHeaderSchema.safeParse(authHeader);
      if (!authResult.success) {
        logger.warn('SyncTransactionsAPI.GET', 'Unauthorized access attempt', {
          authHeader: authHeader ? 'Present' : 'Missing',
          error: authResult.error.message,
        });
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    if (!API_KEY) {
      logger.error('SyncTransactionsAPI.GET', 'BUILDING_API_KEY is not configured', {});
      return NextResponse.json({ error: 'BUILDING_API_KEY not set' }, { status: 500 });
    }
    if (!db) {
      logger.error('SyncTransactionsAPI.GET', 'Firebase DB not initialized', {});
      return NextResponse.json({ error: 'Firebase DB not initialized' }, { status: 500 });
    }

    const typeMap = await fetchTypeMap();
    const collRef = db.collection('transactions');
    const latestSnap = await collRef.orderBy('contractDate', 'desc').limit(1).get();
    
    let latestYm = '';
    if (!latestSnap.empty) {
      const latestDoc = latestSnap.docs[0].data();
      latestYm = latestDoc.contractYm || '';
    }

    // 2. Determine months to sync (당월, 전월, 전전월 3개월을 항상 동기화하여 실거래 신고 지연 대응)
    const now = new Date();
    const monthsToSync = new Set<string>();
    
    for (let i = 0; i < 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthsToSync.add(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    // 3. Fetch from 국토부 API for each month
    let totalNew = 0;
    const syncLog: string[] = [];
    const allNewTransactions: any[] = [];
    
    const DONGTAN_DONGS = ['반송동', '능동', '청계동', '영천동', '오산동', '신동', '목동', '산척동', '장지동', '송동', '방교동', '금곡동', '여울동'];

    for (const ym of Array.from(monthsToSync).sort()) {
      // 🔥 최적화: 해당 월에 등록된 기존 Firestore 데이터를 단 한번 쿼리하여 메모리 맵 구축
      const existingMap = new Map<string, string>(); // _key -> cancelDate
      try {
        const existingSnap = await collRef
          .where('contractYm', '==', ym)
          .select('cancelDate')
          .get();
        existingSnap.docs.forEach(doc => {
          existingMap.set(doc.id, doc.data().cancelDate || '');
        });
      } catch (err: any) {
        logger.warn('SyncTransactionsAPI.GET', `[${ym}] 기존 데이터 조회 실패`, { message: err.message });
      }

      const monthRecords: any[] = [];
      const newTransactionsOfMonth: any[] = [];

      // 매매 데이터 수집
      for (const currentLawd of LAWD_CDS) {
        let page = 1;
        let totalCount = 0;

        do {
          const url = `${API_BASE_TRADE}?serviceKey=${API_KEY}&LAWD_CD=${currentLawd}&DEAL_YMD=${ym}&pageNo=${page}&numOfRows=1000`;
          const res = await fetch(url);
          if (!res.ok) { 
            syncLog.push(`${ym} (${currentLawd}) page ${page}: HTTP ${res.status}`); 
            logger.error('SyncTransactionsAPI.GET', `Failed to fetch trade data page ${page}`, { ym, currentLawd, status: res.status });
            break; 
          }

          const text = await res.text();
          // Parse XML response
          const totalMatch = text.match(/<totalCount>(\d+)<\/totalCount>/);
          totalCount = totalMatch ? parseInt(totalMatch[1], 10) : 0;

          if (totalCount === 0) break;

          const items = text.match(/<item>([\s\S]*?)<\/item>/g) || [];
          
          for (const itemXml of items) {
            const tagMap = new Map<string, string>();
            const tagRegex = /<([^>]+)>([^<]*)<\/\1>/g;
            let tagMatch;
            while ((tagMatch = tagRegex.exec(itemXml)) !== null) {
              tagMap.set(tagMatch[1], tagMatch[2].trim());
            }
            const get = (tag: string) => tagMap.get(tag) || '';

            const dong = get('umdNm');
            // 동탄 권역 속하는 동 이름만 메모리 필터링
            if (!DONGTAN_DONGS.some(d => dong.includes(d))) continue;

            const aptName = get('aptNm');
            const priceStr = get('dealAmount').replace(/,/g, '').trim();
            const price = parseInt(priceStr, 10) || 0;
            const area = parseFloat(get('excluUseAr')) || 0;
            const contractDay = get('dealDay').padStart(2, '0');
            const floor = parseInt(get('floor'), 10) || 0;
            const key = `${aptName}_${ym}_${contractDay}_${area}_${price}_${floor}`;
            const cancelDate = get('cdealDay') || '';

            // Firestore 쓰기 절감 및 중복 체크: 이미 존재하고 cancelDate가 같으면 제외
            if (existingMap.has(key)) {
              const existingCancelDate = existingMap.get(key);
              if (cancelDate === existingCancelDate) {
                continue;
              }
            }

            const record = {
              sigungu: `경기도 화성시 동탄구 ${dong}`,
              dong,
              aptName,
              area,
              areaPyeong: getSupplyPyeong(aptName, area, typeMap),
              contractYm: ym,
              contractDay,
              contractDate: `${ym}${contractDay}`,
              price,
              deposit: 0,
              monthlyRent: 0,
              floor,
              buyer: get('buyerGbn'),
              seller: get('slerGbn'),
              buildYear: parseInt(get('buildYear'), 10) || 0,
              roadName: get('roadNm'),
              cancelDate,
              dealType: get('cdealType') || get('dealingGbn') || '매매',
              agentLocation: get('estateAgentSggNm'),
              registrationDate: get('rgstDate'),
              housingType: '',
              source: 'govt_api',
              _key: key,
            };

            const parsedRecord = transactionRecordSchema.safeParse(record);
            if (parsedRecord.success) {
              monthRecords.push(parsedRecord.data);
              newTransactionsOfMonth.push(parsedRecord.data);
            } else {
              logger.warn('SyncTransactionsAPI.GET', 'Invalid scraped trade transaction record', {
                errors: parsedRecord.error.format(),
                recordKey: record._key,
              });
            }
          }

          page++;
        } while (page * 1000 <= totalCount + 1000);
      }

      // 전월세 데이터 수집
      for (const currentLawd of LAWD_CDS) {
        let rentPage = 1;
        let rentTotalCount = 0;
        do {
          const url = `${API_BASE_RENT}?serviceKey=${API_KEY}&LAWD_CD=${currentLawd}&DEAL_YMD=${ym}&pageNo=${rentPage}&numOfRows=1000`;
          const res = await fetch(url);
          if (!res.ok) { 
            syncLog.push(`${ym} (${currentLawd}) rent page ${rentPage}: HTTP ${res.status}`); 
            logger.error('SyncTransactionsAPI.GET', `Failed to fetch rent data page ${rentPage}`, { ym, currentLawd, status: res.status });
            break; 
          }

          const text = await res.text();
          const totalMatch = text.match(/<totalCount>(\d+)<\/totalCount>/);
          rentTotalCount = totalMatch ? parseInt(totalMatch[1], 10) : 0;
          if (rentTotalCount === 0) break;

          const items = text.match(/<item>([\s\S]*?)<\/item>/g) || [];
          for (const itemXml of items) {
            const tagMap = new Map<string, string>();
            const tagRegex = /<([^>]+)>([^<]*)<\/\1>/g;
            let tagMatch;
            while ((tagMatch = tagRegex.exec(itemXml)) !== null) {
              tagMap.set(tagMatch[1], tagMatch[2].trim());
            }
            const get = (tag: string) => tagMap.get(tag) || '';

            const dong = get('umdNm');
            // 동탄 권역 속하는 동 이름만 메모리 필터링
            if (!DONGTAN_DONGS.some(d => dong.includes(d))) continue;

            const aptName = get('aptNm');
            const depositStr = get('deposit').replace(/,/g, '').trim();
            const monthlyRentStr = get('monthlyRent') ? get('monthlyRent').replace(/,/g, '').trim() : '0';
            
            const deposit = parseInt(depositStr, 10) || 0;
            const monthlyRent = parseInt(monthlyRentStr, 10) || 0;
            const dealType = monthlyRent > 0 ? '월세' : '전세';

            const area = parseFloat(get('excluUseAr')) || 0;
            const contractDay = get('dealDay').padStart(2, '0');
            const floor = parseInt(get('floor'), 10) || 0;
            const key = `RENT_${aptName}_${ym}_${contractDay}_${area}_${deposit}_${floor}`;

            // 중복 검사
            if (existingMap.has(key)) {
              continue; // 렌트는 취소일이 없으므로 단순 키 존재여부만 체크
            }

            const record = {
              sigungu: `경기도 화성시 동탄구 ${dong}`,
              dong,
              aptName,
              area,
              areaPyeong: getSupplyPyeong(aptName, area, typeMap),
              contractYm: ym,
              contractDay,
              contractDate: `${ym}${contractDay}`,
              price: deposit, // For UI compatibility, use deposit as price
              deposit,
              monthlyRent,
              floor,
              buyer: '',
              seller: '',
              buildYear: parseInt(get('buildYear'), 10) || 0,
              roadName: get('roadNm'),
              cancelDate: '',
              dealType,
              agentLocation: '',
              registrationDate: '',
              housingType: '',
              source: 'govt_api_rent',
              reqGb: get('contractType') || '',
              rnuYn: get('useRRRight') || '',
              _key: key,
            };
            
            const parsedRecord = transactionRecordSchema.safeParse(record);
            if (parsedRecord.success) {
              monthRecords.push(parsedRecord.data);
              newTransactionsOfMonth.push(parsedRecord.data);
            } else {
              logger.warn('SyncTransactionsAPI.GET', 'Invalid scraped rent transaction record', {
                errors: parsedRecord.error.format(),
                recordKey: record._key,
              });
            }
          }
          rentPage++;
        } while (rentPage * 1000 <= rentTotalCount + 1000);
      }

      // Batch write to Firestore
      if (monthRecords.length > 0) {
        allNewTransactions.push(...newTransactionsOfMonth);

        const BATCH_SIZE = 500;
        let written = 0;
        for (let i = 0; i < monthRecords.length; i += BATCH_SIZE) {
          const batch = db.batch();
          const slice = monthRecords.slice(i, i + BATCH_SIZE);
          for (const r of slice) {
            batch.set(collRef.doc(r._key), r, { merge: true });
          }
          await batch.commit();
          written += slice.length;
        }
        totalNew += written;
        syncLog.push(`${ym}: ${written}건 동기화 (매매+전월세), 신규/변경 거래: ${newTransactionsOfMonth.length}건`);
      } else {
        syncLog.push(`${ym}: 0건`);
      }
    }

    // 4.5. Send email notification to active subscribers if there are new transactions
    if (allNewTransactions.length > 0) {
      try {
        const subSnap = await db.collection('subscriptions')
          .where('status', '==', 'active')
          .where('realtime', '==', true)
          .get();

        if (!subSnap.empty) {
          const subscribers = subSnap.docs.map(d => d.data().email).filter(Boolean);
          
          if (subscribers.length > 0) {
            allNewTransactions.sort((a, b) => b.contractDate.localeCompare(a.contractDate));
            const displayTx = allNewTransactions.slice(0, 15);
            
            let txRowsHtml = '';
            for (const tx of displayTx) {
              const priceDisplay = tx.dealType === '매매' 
                ? `${Math.floor(tx.price / 10000) > 0 ? Math.floor(tx.price / 10000) + '억 ' : ''}${(tx.price % 10000).toLocaleString()}만원`
                : `${tx.dealType} 보증금 ${Math.floor(tx.deposit / 10000) > 0 ? Math.floor(tx.deposit / 10000) + '억 ' : ''}${(tx.deposit % 10000).toLocaleString()}만원${tx.monthlyRent ? ' / 월 ' + tx.monthlyRent + '만' : ''}`;
              
              txRowsHtml += `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 12px 8px; font-weight: bold; color: #1e293b; font-size: 13px;">${tx.aptName}</td>
                  <td style="padding: 12px 8px; color: #475569; font-size: 12px;">${tx.areaPyeong}평 (${tx.area}㎡)</td>
                  <td style="padding: 12px 8px; font-weight: 800; color: #3b82f6; font-size: 13px;">${priceDisplay}</td>
                  <td style="padding: 12px 8px; color: #475569; font-size: 12px; text-align: center;">${tx.floor}층</td>
                  <td style="padding: 12px 8px; color: #475569; font-size: 12px; text-align: center;">${tx.contractDate.slice(4, 6)}.${tx.contractDate.slice(6, 8)}</td>
                </tr>
              `;
            }

            const nowStr = new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            
            for (const email of subscribers) {
              const unsubscribeLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5000'}/api/unsubscribe?email=${encodeURIComponent(email)}`;
              
              const alertMailHtml = `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #f9fafb; color: #1f2937; line-height: 1.6;">
                  <div style="background-color: #ffffff; padding: 40px; border-radius: 24px; border: 1px solid #f1f5f9; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                    <div style="margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center;">
                      <span style="font-size: 16px; font-weight: 800; color: #3b82f6; letter-spacing: -0.5px;">D-VIEW 데이터 랩</span>
                      <span style="font-size: 11px; color: #94a3b8;">실시간 알림 (${nowStr})</span>
                    </div>

                    <h2 style="font-size: 19px; font-weight: 900; color: #111827; margin-top: 0; margin-bottom: 8px; letter-spacing: -0.5px;">
                      🛎️ 신규 실거래가 등록 알림
                    </h2>
                    <p style="font-size: 13px; color: #64748b; margin-bottom: 24px; word-break: keep-all;">
                      구독 중이신 동탄 아파트의 국토교통부 신규 실거래가 등록되었습니다.
                    </p>

                    <table style="width: 100%; border-collapse: collapse; text-align: left; margin-bottom: 24px;">
                      <thead>
                        <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                           <th style="padding: 10px 8px; font-size: 11px; color: #475569; font-weight: 700;">단지명</th>
                          <th style="padding: 10px 8px; font-size: 11px; color: #475569; font-weight: 700;">평형/면적</th>
                          <th style="padding: 10px 8px; font-size: 11px; color: #475569; font-weight: 700;">거래 금액</th>
                          <th style="padding: 10px 8px; font-size: 11px; color: #475569; font-weight: 700; text-align: center;">층</th>
                          <th style="padding: 10px 8px; font-size: 11px; color: #475569; font-weight: 700; text-align: center;">계약일</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${txRowsHtml}
                      </tbody>
                    </table>

                    ${allNewTransactions.length > 15 ? `<p style="font-size: 12px; color: #94a3b8; text-align: center; margin-bottom: 24px;">외 ${allNewTransactions.length - 15}건의 신규 거래가 더 등록되었습니다. 전체 내역은 D-VIEW에서 확인해 주세요.</p>` : ''}

                    <div style="text-align: center; margin-bottom: 30px;">
                      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5000'}" style="background-color: #3b82f6; color: white; padding: 12px 28px; border-radius: 12px; text-decoration: none; font-size: 13px; font-weight: bold; display: inline-block; box-shadow: 0 4px 10px rgba(59, 130, 246, 0.2);">전체 거래 정보 보기</a>
                    </div>

                    <div style="border-top: 1px solid #f1f5f9; padding-top: 20px; font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.5;">
                      본 메일은 D-VIEW 실거래 등록 알림 구독자분들께 발송되는 정보 메일입니다.<br />
                      더 이상 알림을 원치 않으시면 언제든지 아래 링크를 통해 구독을 해지하실 수 있습니다.<br />
                      <a href="${unsubscribeLink}" style="color: #64748b; text-decoration: underline; font-weight: 600; display: inline-block; margin-top: 8px;">[구독 해지하기]</a>
                    </div>
                  </div>
                </div>
              `;

              await sendMail({
                to: email,
                subject: `[D-VIEW] 신규 실거래가 등록 알림 (${allNewTransactions.length}건 등록)`,
                html: alertMailHtml
              });
            }
            syncLog.push(`Sent notification emails to ${subscribers.length} active subscribers`);
            logger.info('SyncTransactionsAPI.GET', `Sent notification emails to ${subscribers.length} active subscribers`, { count: subscribers.length });
          }
        }
      } catch (mailErr: any) {
        logger.error('SyncTransactionsAPI.GET', 'Failed to send notification email during sync', {}, mailErr as Error);
        syncLog.push(`Mail Notification Error: ${mailErr.message}`);
      }
    }

    // 5. Trigger Vercel Deploy Hook if there are new transactions
    if (totalNew > 0 && process.env.VERCEL_DEPLOY_HOOK_URL) {
      try {
        const deployRes = await fetch(process.env.VERCEL_DEPLOY_HOOK_URL, { method: 'POST' });
        if (deployRes.ok) {
          syncLog.push('Vercel Deploy Hook Triggered Successfully');
          logger.info('SyncTransactionsAPI.GET', 'Vercel Deploy Hook Triggered Successfully', {});
        } else {
          syncLog.push(`Vercel Deploy Hook Failed: HTTP ${deployRes.status}`);
          logger.warn('SyncTransactionsAPI.GET', 'Vercel Deploy Hook Failed', { status: deployRes.status });
        }
      } catch (err) {
        syncLog.push(`Vercel Deploy Hook Error: ${(err as Error).message}`);
        logger.error('SyncTransactionsAPI.GET', 'Vercel Deploy Hook Error', {}, err as Error);
      }
    }

    // 6. Trigger Web Push Notifications for New Highs if there are new transactions
    if (totalNew > 0) {
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5000';
        const pushRes = await fetch(`${appUrl}/api/push/notify-new-high`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        if (pushRes.ok) {
          const pushResult = await pushRes.json();
          syncLog.push(`Web Push Triggered: ${JSON.stringify(pushResult)}`);
          logger.info('SyncTransactionsAPI.GET', 'Web Push Triggered successfully', { result: pushResult });
        } else {
          syncLog.push(`Web Push Trigger Failed: HTTP ${pushRes.status}`);
          logger.warn('SyncTransactionsAPI.GET', 'Web Push Trigger Failed', { status: pushRes.status });
        }
      } catch (err) {
        syncLog.push(`Web Push Trigger Error: ${(err as Error).message}`);
        logger.error('SyncTransactionsAPI.GET', 'Web Push Trigger Error', {}, err as Error);
      }
    }

    return NextResponse.json({
      success: true,
      synced: totalNew,
      months: Array.from(monthsToSync),
      log: syncLog,
    });
  } catch (error: unknown) {
    logger.error('SyncTransactionsAPI.GET', 'Sync error', {}, error as Error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
