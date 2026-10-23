/**
 * GET /api/cron/sync-transactions
 * 
 * 국토교통부 실거래가 API → Firestore 'transactions' 신규 거래 동기화
 * Vercel Cron에서 매일 1회 호출 (vercel.json에서 설정)
 * 수동 호출도 가능: fetch('/api/cron/sync-transactions')
 */
import { NextRequest } from 'next/server';
import { adminDb as db } from '@/lib/firebaseAdmin';
import { sendMail } from '@/lib/utils/server/mailService';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';
import { checkRateLimit } from '@/lib/api/rateLimiter';
import { apiSuccess, apiError } from '@/lib/api/apiResponse';
import { resilientFetch, resilientFetchText } from '@/lib/api/resilientFetch';
import { getSupplyPyeong } from '@/lib/utils/areaConverter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export const preferredRegion = 'icn1';

export const DEFAULT_BUILDING_API_KEY = '4611c02045e69b5e6c0bf50b9ecbee6de92e7ee0351eb8a7d529253340f755ff';
export const DEFAULT_CRON_SECRET = 'dview-default-cron-secret-2026';

const API_KEY = process.env.BUILDING_API_KEY || DEFAULT_BUILDING_API_KEY;
const LAWD_CDS = ['41590', '41597']; // 화성시(기존) 및 동탄구(신설) 모두 스캔
const API_BASE_TRADE = 'https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev';
const API_BASE_RENT = 'https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent';

export function parseGovApiXmlEnvelope(text: string): {
  isError: boolean;
  resultCode: string;
  resultMsg: string;
  isGatewayError: boolean;
} {
  const resultCodeMatch =
    text.match(/<resultCode>([^<]*)<\/resultCode>/i) ||
    text.match(/<returnReasonCode>([^<]*)<\/returnReasonCode>/i);
  const resultMsgMatch =
    text.match(/<resultMsg>([^<]*)<\/resultMsg>/i) ||
    text.match(/<returnAuthMsg>([^<]*)<\/returnAuthMsg>/i) ||
    text.match(/<errMsg>([^<]*)<\/errMsg>/i);
  const resultCode = resultCodeMatch ? resultCodeMatch[1].trim() : '';
  const resultMsg = resultMsgMatch ? resultMsgMatch[1].trim() : '';
  const isGatewayError =
    text.includes('<OpenAPI_ServiceResponse>') || text.includes('<cmmMsgHeader>');
  const isError =
    isGatewayError || (resultCode !== '' && resultCode !== '00' && resultCode !== '000');
  return { isError, resultCode, resultMsg, isGatewayError };
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
    const csvText = await resilientFetchText(csvUrl, { timeoutMs: 2500, retries: 0 });
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
          typeMap[aptName][area] = Math.round(parseFloat(match[0]) * 0.3025 * 10) / 10;
        }
      }
    }
  } catch (e) {
    logger.error('SyncTransactionsAPI.fetchTypeMap', 'Failed to fetch typeMap in cron sync', {}, e as Error);
  }
  return typeMap;
}

function resolveAreaPyeong(
  aptName: string,
  area: number,
  typeMap: Record<string, Record<string, number>>
): number {
  return getSupplyPyeong(aptName, area, typeMap);
}

export function isCancelledRecord(record: {
  cancelDate?: string | number | null;
  cdealDay?: string | number | null;
  cdealType?: string | null;
}): boolean {
  if (!record) return false;
  if (record.cdealType === 'O' || record.cdealType === '해제') return true;
  const isValidCancelStr = (v?: string | number | null) => {
    if (v === null || v === undefined) return false;
    const s = String(v).trim().toLowerCase();
    return s !== '' && s !== '-' && s !== 'null' && s !== 'undefined' && s !== 'nan';
  };
  return isValidCancelStr(record.cancelDate) || isValidCancelStr(record.cdealDay);
}

function getTag(map: Map<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    const val = map.get(k);
    if (val !== undefined && val !== null && val !== '') return val;
  }
  return '';
}

export const authHeaderSchema = z.string().refine(
  (val) => {
    const configuredSecret = process.env.CRON_SECRET?.trim() || DEFAULT_CRON_SECRET;
    return val === `Bearer ${configuredSecret}`;
  },
  { message: 'Invalid authorization token' }
);

export function isAuthorizedProxyRequest(request: NextRequest, expectedApiKey?: string): boolean {
  const authHeader = (request.headers.get('authorization') || '').trim();
  if (authHeaderSchema.safeParse(authHeader).success) {
    return true;
  }
  const headerApiKey = (request.headers.get('x-building-api-key') || '').trim();
  const targetApiKey = (expectedApiKey?.trim() || process.env.BUILDING_API_KEY?.trim() || DEFAULT_BUILDING_API_KEY);
  if (headerApiKey && headerApiKey === targetApiKey) {
    return true;
  }
  return false;
}

export function isAuthorizedCronRequest(request: NextRequest, expectedApiKey?: string): boolean {
  if (isAuthorizedProxyRequest(request, expectedApiKey)) {
    return true;
  }
  const configuredSecret = process.env.CRON_SECRET?.trim();
  if (!configuredSecret) {
    const ua = (request.headers.get('user-agent') || '').toLowerCase();
    const vercelCron = (request.headers.get('x-vercel-cron') || '').toLowerCase();
    if (ua.startsWith('vercel-cron/') || vercelCron === '1' || vercelCron === 'true') {
      return true;
    }
  }
  return false;
}

export function shouldTriggerDeployHook(
  totalNew: number,
  skipDeployParam?: string | null,
  deployHookUrl: string | undefined = process.env.VERCEL_DEPLOY_HOOK_URL
): boolean {
  if (totalNew <= 0 || !deployHookUrl || !deployHookUrl.trim()) return false;
  const normalized = (skipDeployParam || '').trim().toLowerCase();
  if (normalized === '1' || normalized === 'true' || normalized === 'yes') return false;
  return true;
}

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
  cdealDay: z.string().optional().nullable(),
  cdealType: z.string().optional().nullable(),
  dealType: z.string(),
  agentLocation: z.string().optional().nullable(),
  registrationDate: z.string().optional().nullable(),
  registeredDate: z.string().optional().nullable(),
  registeredDateLabel: z.string().optional().nullable(),
  housingType: z.string().optional().nullable(),
  source: z.string(),
  _key: z.string(),
  reqGb: z.string().optional(),
  rnuYn: z.string().optional(),
});

type TransactionRecord = z.infer<typeof transactionRecordSchema>;

export async function GET(request: NextRequest) {
  try {
    const rateLimitResult = await checkRateLimit(request, {
      prefix: 'cron_sync_transactions',
      requestsPerLimit: 300,
    });
    if (!rateLimitResult.success) {
      return rateLimitResult.response || apiError('RATE_LIMIT_EXCEEDED', 'Too Many Requests', 429);
    }

    const expectedServerApiKey =
      process.env.BUILDING_API_KEY?.trim() ||
      API_KEY?.trim() ||
      DEFAULT_BUILDING_API_KEY;

    const resolvedApiKey =
      process.env.BUILDING_API_KEY?.trim() ||
      request.headers.get('x-building-api-key')?.trim() ||
      API_KEY?.trim() ||
      DEFAULT_BUILDING_API_KEY;

    const mode = (request.nextUrl.searchParams.get('mode') || '').trim().toLowerCase();

    if (process.env.NODE_ENV !== 'development') {
      const authorized =
        mode === 'proxy'
          ? isAuthorizedProxyRequest(request, expectedServerApiKey)
          : isAuthorizedCronRequest(request, expectedServerApiKey);
      if (!authorized) {
        const authHeader = request.headers.get('authorization') || '';
        logger.warn('SyncTransactionsAPI.GET', 'Unauthorized access attempt', {
          authHeader: authHeader ? 'Present' : 'Missing',
          mode: mode || 'sync',
        });
        return apiError('UNAUTHORIZED', 'Unauthorized', 401);
      }
    }

    if (!resolvedApiKey) {
      logger.error('SyncTransactionsAPI.GET', 'BUILDING_API_KEY is not configured', {});
      return apiError('CONFIG_ERROR', 'BUILDING_API_KEY not set', 500);
    }

    // Optional Korean Edge/Serverless relay mode (?mode=proxy&target=trade|rent&lawdCd=...&dealYmd=...)
    if (mode === 'proxy') {
      const target = (request.nextUrl.searchParams.get('target') || 'trade').trim().toLowerCase();
      const lawdCd = (request.nextUrl.searchParams.get('lawdCd') || request.nextUrl.searchParams.get('LAWD_CD') || '').trim();
      const dealYmd = (request.nextUrl.searchParams.get('dealYmd') || request.nextUrl.searchParams.get('DEAL_YMD') || '').trim();
      const pageNo = (request.nextUrl.searchParams.get('pageNo') || '1').trim();
      const numOfRows = (request.nextUrl.searchParams.get('numOfRows') || '1000').trim();
      const respType = (request.nextUrl.searchParams.get('_type') || '').trim().toLowerCase();

      const isValidTarget = target === 'trade' || target === 'rent';
      const isValidLawd = /^\d{5}$/.test(lawdCd);
      const isValidYm = /^(19|20)\d{2}(0[1-9]|1[0-2])$/.test(dealYmd);
      const isValidPage = /^[1-9]\d{0,3}$/.test(pageNo);
      const isValidRows = /^[1-9]\d{0,3}$/.test(numOfRows);
      const isValidType = respType === '' || respType === 'json' || respType === 'xml';

      if (!isValidTarget || !isValidLawd || !isValidYm || !isValidPage || !isValidRows || !isValidType) {
        return apiError('BAD_REQUEST', 'Invalid lawdCd, dealYmd, or proxy query parameters', 400);
      }

      const upstreamBase = target === 'rent' ? API_BASE_RENT : API_BASE_TRADE;
      const upstreamUrl = `${upstreamBase}?serviceKey=${encodeURIComponent(resolvedApiKey)}&LAWD_CD=${encodeURIComponent(lawdCd)}&DEAL_YMD=${encodeURIComponent(dealYmd)}&pageNo=${encodeURIComponent(pageNo)}&numOfRows=${encodeURIComponent(numOfRows)}${respType ? `&_type=${encodeURIComponent(respType)}` : ''}`;
      const upstreamText = await resilientFetchText(upstreamUrl, { timeoutMs: 10000, retries: 1 });
      const isJson = respType === 'json' || upstreamText.trim().startsWith('{');
      return new Response(upstreamText, {
        status: 200,
        headers: {
          'Content-Type': isJson ? 'application/json; charset=utf-8' : 'application/xml; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      });
    }

    // 2. Determine months to sync (supports optional ?ym=YYYYMM or defaults to 3 months M~M-2)
    const now = new Date();
    const monthsToSync = new Set<string>();
    const ymParam = (request.nextUrl.searchParams.get('ym') || '').trim();
    if (ymParam) {
      const tokens = ymParam.split(',').map((s) => s.trim()).filter(Boolean);
      const validTokens = tokens.filter((s) => /^(19|20)\d{2}(0[1-9]|1[0-2])$/.test(s));
      if (validTokens.length === 0 || validTokens.length !== tokens.length) {
        return apiError('BAD_REQUEST', 'Invalid ym parameter (expected YYYYMM)', 400);
      }
      validTokens.forEach((m) => monthsToSync.add(m));
    } else {
      for (let i = 0; i < 3; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        monthsToSync.add(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`);
      }
    }

    if (!db) {
      logger.error('SyncTransactionsAPI.GET', 'Firebase DB not initialized', {});
      return apiError('DATABASE_ERROR', 'Firebase DB not initialized', 500);
    }

    // Preload typeMap
    const typeMap = await fetchTypeMap();
    const collRef = db.collection('transactions');

    // 3. Fetch from 국토부 API for each month
    let totalNew = 0;
    const syncLog: string[] = [];
    const allNewTransactions: TransactionRecord[] = [];
    
    const DONGTAN_DONGS = ['반송동', '능동', '청계동', '영천동', '오산동', '신동', '목동', '산척동', '장지동', '송동', '방교동', '금곡동', '여울동', '석우동'];

    for (const ym of Array.from(monthsToSync).sort()) {
      // 해당 월에 등록된 기존 Firestore 데이터를 단 한번 쿼리하여 메모리 맵 구축
      const existingMap = new Map<string, { cancelDate: string; dealType: string; registeredDate?: string }>();
      try {
        const existingSnap = await collRef
          .where('contractYm', '==', ym)
          .select('cancelDate', 'dealType', 'registeredDate')
          .get();
        existingSnap.docs.forEach(doc => {
          const data = doc.data();
          existingMap.set(doc.id, {
            cancelDate: (data.cancelDate || '').trim(),
            dealType: (data.dealType || '').trim(),
            registeredDate: (data.registeredDate || '').trim(),
          });
        });
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        logger.warn('SyncTransactionsAPI.GET', `[${ym}] 기존 데이터 조회 실패`, { message: errMsg });
      }

      const monthRecords: TransactionRecord[] = [];
      const newTransactionsOfMonth: TransactionRecord[] = [];
      const tradeKeyOccurrences = new Map<string, number>();
      const seenRawTradeKeys = new Set<string>();
      const rentKeyOccurrences = new Map<string, number>();
      const seenRawRentKeys = new Set<string>();

      // 매매 데이터 수집
      for (const currentLawd of LAWD_CDS) {
        let page = 1;
        let totalCount = 0;
        const currentDistrictTradeOccurrences = new Map<string, number>();

        do {
          const url = `${API_BASE_TRADE}?serviceKey=${encodeURIComponent(resolvedApiKey)}&LAWD_CD=${currentLawd}&DEAL_YMD=${ym}&pageNo=${page}&numOfRows=1000`;
          let text = '';
          try {
            text = await resilientFetchText(url, { timeoutMs: 8000, retries: 1 });
          } catch (fetchErr) {
            syncLog.push(`${ym} (${currentLawd}) page ${page}: Fetch Failed`);
            logger.error('SyncTransactionsAPI.GET', `Failed to fetch trade data page ${page}`, { ym, currentLawd }, fetchErr as Error);
            break;
          }

          // 1. Validate Government API Response structure and check for API-level errors (00 and 000 are both normal)
          const { isError, resultCode, resultMsg } = parseGovApiXmlEnvelope(text);

          if (isError) {
            const errMsg = `Government API Error [${resultCode || 'GATEWAY'}]: ${resultMsg || 'Unknown Error'}`;
            logger.error('SyncTransactionsAPI.GET', errMsg, { ym, currentLawd, page });
            syncLog.push(`Gov API Error ${resultCode || 'GATEWAY'} on ${ym} (${currentLawd}) page ${page}: ${resultMsg}`);
            
            // Critical API Error - Send email alert
            try {
              await sendMail({
                to: process.env.ADMIN_EMAIL || 'admin@dongtanview.com',
                subject: `[경보] [D-VIEW] 국토부 실거래가 매매 API 장애 (${resultCode || 'GATEWAY'})`,
                html: `
                  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #f9fafb; color: #1e293b; line-height: 1.6;">
                    <div style="background-color: #ffffff; padding: 40px; border-radius: 24px; border: 1px solid #f1f5f9; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                      <h2 style="font-size: 19px; font-weight: 900; color: #dc2626; margin-top: 0; margin-bottom: 8px;">
                        [경보] 국토교통부 실거래가 매매 API 장애 감지
                      </h2>
                      <p style="font-size: 13px; color: #64748b; margin-bottom: 24px;">
                        실거래가 배치 수집 도중 국토교통부 OpenAPI 서버로부터 정상 응답이 아닌 오류 응답을 수신했습니다.
                      </p>
                      <table style="width: 100%; border-collapse: collapse; text-align: left; margin-bottom: 24px; font-size: 13px;">
                        <tr style="border-bottom: 1px solid #f1f5f9;">
                          <td style="padding: 10px 8px; font-weight: bold; color: #475569; width: 120px;">감지 시각</td>
                          <td style="padding: 10px 8px; color: #1e293b;">${new Date().toLocaleString('ko-KR')}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #f1f5f9;">
                          <td style="padding: 10px 8px; font-weight: bold; color: #475569;">연월 / 지역코드</td>
                          <td style="padding: 10px 8px; color: #1e293b;">${ym} / ${currentLawd} (페이지: ${page})</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #f1f5f9;">
                          <td style="padding: 10px 8px; font-weight: bold; color: #475569;">결과 코드</td>
                          <td style="padding: 10px 8px; font-weight: bold; color: #dc2626;">${resultCode || 'GATEWAY'}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #f1f5f9;">
                          <td style="padding: 10px 8px; color: #1e293b;">${resultMsg}</td>
                        </tr>
                      </table>
                    </div>
                  </div>
                `
              });
            } catch (mailErr) {
              logger.error('SyncTransactionsAPI.GET', 'Failed to send API error email notification', {}, mailErr as Error);
            }
            break;
          }

          // Parse XML response
          const totalMatch = text.match(/<totalCount>(\d+)<\/totalCount>/);
          totalCount = totalMatch ? parseInt(totalMatch[1], 10) : 0;

          if (totalCount === 0) break;

          const items = text.match(/<item>([\s\S]*?)<\/item>/g) || [];
          if (items.length === 0) break;
          
          for (const itemXml of items) {
            const tagMap = new Map<string, string>();
            const tagRegex = /<([^>]+)>([^<]*)<\/\1>/g;
            let tagMatch;
            while ((tagMatch = tagRegex.exec(itemXml)) !== null) {
              tagMap.set(tagMatch[1], tagMatch[2].trim());
            }
            const dong = getTag(tagMap, 'umdNm', '법정동', 'dong');
            if (!DONGTAN_DONGS.some(d => dong.includes(d))) continue;

            const aptName = getTag(tagMap, 'aptNm', '아파트');
            const priceStr = getTag(tagMap, 'dealAmount', '거래금액').replace(/,/g, '').trim();
            const price = parseInt(priceStr, 10) || 0;
            const area = parseFloat(getTag(tagMap, 'excluUseAr', '전용면적')) || 0;
            const contractDay = getTag(tagMap, 'dealDay', '일').padStart(2, '0');
            const floor = parseInt(getTag(tagMap, 'floor', '층'), 10) || 0;
            const baseKey = `${aptName}_${ym}_${contractDay}_${area}_${price}_${floor}`;
            const currentDistrictCount = (currentDistrictTradeOccurrences.get(baseKey) || 0) + 1;
            currentDistrictTradeOccurrences.set(baseKey, currentDistrictCount);
            const txIdentifier = `${baseKey}_${currentDistrictCount}`;

            if (seenRawTradeKeys.has(txIdentifier)) {
              continue;
            }
            seenRawTradeKeys.add(txIdentifier);

            const occurrence = (tradeKeyOccurrences.get(baseKey) || 0) + 1;
            tradeKeyOccurrences.set(baseKey, occurrence);
            const key = occurrence === 1 ? baseKey : `${baseKey}_${occurrence}`;

            const cancelDate = getTag(tagMap, 'cdealDay', '해제사유발생일') || '';
            const cleanDealingGbn = getTag(tagMap, 'dealingGbn', '거래유형');
            const cleanCdealType = getTag(tagMap, 'cdealType', '해제여부');
            const dealType =
              cleanDealingGbn ||
              (cleanCdealType && cleanCdealType !== 'O' && cleanCdealType !== '해제' ? cleanCdealType : '') ||
              '매매';

            if (existingMap.has(key)) {
              const existing = existingMap.get(key);
              if (existing && cancelDate === existing.cancelDate && dealType === existing.dealType) {
                continue;
              }
            }

            const record = {
              sigungu: `경기도 화성시 동탄구 ${dong}`,
              dong,
              aptName,
              area,
              areaPyeong: resolveAreaPyeong(aptName, area, typeMap),
              contractYm: ym,
              contractDay,
              contractDate: `${ym}${contractDay}`,
              price,
              deposit: 0,
              monthlyRent: 0,
              floor,
              buyer: getTag(tagMap, 'buyerGbn', '매수자'),
              seller: getTag(tagMap, 'slerGbn', '매도자'),
              buildYear: parseInt(getTag(tagMap, 'buildYear', '건축년도'), 10) || 0,
              roadName: getTag(tagMap, 'roadNm', '도로명'),
              cancelDate,
              cdealDay: cancelDate,
              cdealType: cleanCdealType,
              dealType,
              agentLocation: getTag(tagMap, 'estateAgentSggNm', '중개사소재지'),
              registrationDate: getTag(tagMap, 'rgstDate', '등기일자'),
              registeredDate: (() => {
                const existingDoc = existingMap.get(key);
                if (existingDoc?.registeredDate) return existingDoc.registeredDate;
                const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
                return `${kstNow.getUTCFullYear()}${String(kstNow.getUTCMonth() + 1).padStart(2, '0')}${String(kstNow.getUTCDate()).padStart(2, '0')}`;
              })(),
              registeredDateLabel: (() => {
                const existingDoc = existingMap.get(key);
                const regDate = existingDoc?.registeredDate || (() => {
                  const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
                  return `${kstNow.getUTCFullYear()}${String(kstNow.getUTCMonth() + 1).padStart(2, '0')}${String(kstNow.getUTCDate()).padStart(2, '0')}`;
                })();
                return `${regDate.slice(4, 6)}.${regDate.slice(6, 8)}`;
              })(),
              housingType: '',
              source: 'govt_api',
              _key: key,
            };

            const parsedRecord = transactionRecordSchema.safeParse(record);
            if (parsedRecord.success) {
              monthRecords.push(parsedRecord.data);
              if (!isCancelledRecord(parsedRecord.data)) {
                newTransactionsOfMonth.push(parsedRecord.data);
              }
            } else {
              logger.warn('SyncTransactionsAPI.GET', 'Invalid scraped trade transaction record', {
                errors: parsedRecord.error.format(),
                recordKey: record._key,
              });
            }
          }

          page++;
        } while ((page - 1) * 1000 < totalCount);
      }

      // 전월세 데이터 수집
      for (const currentLawd of LAWD_CDS) {
        let rentPage = 1;
        let rentTotalCount = 0;
        const currentDistrictRentOccurrences = new Map<string, number>();

        do {
          const url = `${API_BASE_RENT}?serviceKey=${encodeURIComponent(resolvedApiKey)}&LAWD_CD=${currentLawd}&DEAL_YMD=${ym}&pageNo=${rentPage}&numOfRows=1000`;
          let text = '';
          try {
            text = await resilientFetchText(url, { timeoutMs: 8000, retries: 1 });
          } catch (fetchErr) {
            syncLog.push(`${ym} (${currentLawd}) rent page ${rentPage}: Fetch Failed`);
            logger.error('SyncTransactionsAPI.GET', `Failed to fetch rent data page ${rentPage}`, { ym, currentLawd }, fetchErr as Error);
            break;
          }

          const { isError, resultCode, resultMsg } = parseGovApiXmlEnvelope(text);

          if (isError) {
            const errMsg = `Government API Rent Error [${resultCode || 'GATEWAY'}]: ${resultMsg || 'Unknown Error'}`;
            logger.error('SyncTransactionsAPI.GET', errMsg, { ym, currentLawd, rentPage });
            syncLog.push(`Gov API Rent Error ${resultCode || 'GATEWAY'} on ${ym} (${currentLawd}) page ${rentPage}: ${resultMsg}`);
            
            try {
              await sendMail({
                to: process.env.ADMIN_EMAIL || 'admin@dongtanview.com',
                subject: `[경보] [D-VIEW] 국토부 실거래가 전월세 API 장애 (${resultCode || 'GATEWAY'})`,
                html: `
                  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #f9fafb; color: #1e293b; line-height: 1.6;">
                    <div style="background-color: #ffffff; padding: 40px; border-radius: 24px; border: 1px solid #f1f5f9; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                      <h2 style="font-size: 19px; font-weight: 900; color: #dc2626; margin-top: 0; margin-bottom: 8px;">
                        [경보] 국토교통부 실거래가 전월세 API 장애 감지
                      </h2>
                      <p style="font-size: 13px; color: #64748b; margin-bottom: 24px;">
                        실거래가 배치 수집 도중 국토교통부 OpenAPI 서버로부터 정상 응답이 아닌 오류 응답을 수신했습니다.
                      </p>
                      <table style="width: 100%; border-collapse: collapse; text-align: left; margin-bottom: 24px; font-size: 13px;">
                        <tr style="border-bottom: 1px solid #f1f5f9;">
                          <td style="padding: 10px 8px; font-weight: bold; color: #475569; width: 120px;">감지 시각</td>
                          <td style="padding: 10px 8px; color: #1e293b;">${new Date().toLocaleString('ko-KR')}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #f1f5f9;">
                          <td style="padding: 10px 8px; font-weight: bold; color: #475569;">연월 / 지역코드</td>
                          <td style="padding: 10px 8px; color: #1e293b;">${ym} / ${currentLawd} (페이지: ${rentPage})</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #f1f5f9;">
                          <td style="padding: 10px 8px; font-weight: bold; color: #475569;">결과 코드</td>
                          <td style="padding: 10px 8px; font-weight: bold; color: #dc2626;">${resultCode || 'GATEWAY'}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #f1f5f9;">
                          <td style="padding: 10px 8px; color: #1e293b;">${resultMsg}</td>
                        </tr>
                      </table>
                    </div>
                  </div>
                `
              });
            } catch (mailErr) {
              logger.error('SyncTransactionsAPI.GET', 'Failed to send Rent API error email notification', {}, mailErr as Error);
            }
            break;
          }

          const totalMatch = text.match(/<totalCount>(\d+)<\/totalCount>/);
          rentTotalCount = totalMatch ? parseInt(totalMatch[1], 10) : 0;
          if (rentTotalCount === 0) break;

          const items = text.match(/<item>([\s\S]*?)<\/item>/g) || [];
          if (items.length === 0) break;

          for (const itemXml of items) {
            const tagMap = new Map<string, string>();
            const tagRegex = /<([^>]+)>([^<]*)<\/\1>/g;
            let tagMatch;
            while ((tagMatch = tagRegex.exec(itemXml)) !== null) {
              tagMap.set(tagMatch[1], tagMatch[2].trim());
            }
            const dong = getTag(tagMap, 'umdNm', '법정동', 'dong');
            if (!DONGTAN_DONGS.some(d => dong.includes(d))) continue;

            const aptName = getTag(tagMap, 'aptNm', '아파트');
            const depositStr = getTag(tagMap, 'deposit', '보증금액', '보증금').replace(/,/g, '').trim();
            const monthlyRentStr = getTag(tagMap, 'monthlyRent', '월세금액', '월세') ? getTag(tagMap, 'monthlyRent', '월세금액', '월세').replace(/,/g, '').trim() : '0';
            
            const deposit = parseInt(depositStr, 10) || 0;
            const monthlyRent = parseInt(monthlyRentStr, 10) || 0;
            const dealType = monthlyRent > 0 ? '월세' : '전세';

            const area = parseFloat(getTag(tagMap, 'excluUseAr', '전용면적')) || 0;
            const contractDay = getTag(tagMap, 'dealDay', '일').padStart(2, '0');
            const floor = parseInt(getTag(tagMap, 'floor', '층'), 10) || 0;
            const baseKey = `RENT_${aptName}_${ym}_${contractDay}_${area}_${deposit}_${monthlyRent}_${floor}`;
            const currentDistrictCount = (currentDistrictRentOccurrences.get(baseKey) || 0) + 1;
            currentDistrictRentOccurrences.set(baseKey, currentDistrictCount);
            const txIdentifier = `${baseKey}_${currentDistrictCount}`;

            if (seenRawRentKeys.has(txIdentifier)) {
              continue;
            }
            seenRawRentKeys.add(txIdentifier);

            const occurrence = (rentKeyOccurrences.get(baseKey) || 0) + 1;
            rentKeyOccurrences.set(baseKey, occurrence);
            const _key = occurrence === 1 ? baseKey : `${baseKey}_${occurrence}`;

            if (existingMap.has(_key)) {
              continue;
            }

            const record = {
              sigungu: `경기도 화성시 동탄구 ${dong}`,
              dong,
              aptName,
              area,
              areaPyeong: resolveAreaPyeong(aptName, area, typeMap),
              contractYm: ym,
              contractDay,
              contractDate: `${ym}${contractDay}`,
              price: deposit,
              deposit,
              monthlyRent,
              floor,
              buyer: '',
              seller: '',
              buildYear: parseInt(getTag(tagMap, 'buildYear', '건축년도'), 10) || 0,
              roadName: getTag(tagMap, 'roadNm', '도로명'),
              cancelDate: '',
              dealType,
              agentLocation: '',
              registrationDate: '',
              registeredDate: (() => {
                const existingDoc = existingMap.get(_key);
                if (existingDoc?.registeredDate) return existingDoc.registeredDate;
                const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
                return `${kstNow.getUTCFullYear()}${String(kstNow.getUTCMonth() + 1).padStart(2, '0')}${String(kstNow.getUTCDate()).padStart(2, '0')}`;
              })(),
              registeredDateLabel: (() => {
                const existingDoc = existingMap.get(_key);
                const regDate = existingDoc?.registeredDate || (() => {
                  const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
                  return `${kstNow.getUTCFullYear()}${String(kstNow.getUTCMonth() + 1).padStart(2, '0')}${String(kstNow.getUTCDate()).padStart(2, '0')}`;
                })();
                return `${regDate.slice(4, 6)}.${regDate.slice(6, 8)}`;
              })(),
              housingType: '',
              source: 'govt_api_rent',
              reqGb: getTag(tagMap, 'contractType', '계약구분') || '',
              rnuYn: getTag(tagMap, 'useRRRight', '갱신요구권사용여부') || '',
              _key,
            };
            
            const parsedRecord = transactionRecordSchema.safeParse(record);
            if (parsedRecord.success) {
              monthRecords.push(parsedRecord.data);
              if (!isCancelledRecord(parsedRecord.data)) {
                newTransactionsOfMonth.push(parsedRecord.data);
              }
            } else {
              logger.warn('SyncTransactionsAPI.GET', 'Invalid scraped rent transaction record', {
                errors: parsedRecord.error.format(),
                recordKey: record._key,
              });
            }
          }
          rentPage++;
        } while ((rentPage - 1) * 1000 < rentTotalCount);
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
              const isRentTx = tx.dealType === '전세' || tx.dealType === '월세';
              const priceDisplay = !isRentTx
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
                      신규 실거래가 등록 알림
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
      } catch (mailErr: unknown) {
        const err = mailErr instanceof Error ? mailErr : new Error(String(mailErr));
        logger.error('SyncTransactionsAPI.GET', 'Failed to send notification email during sync', {}, err);
        syncLog.push(`Mail Notification Error: ${err.message}`);
      }
    }

    // 5. Trigger Vercel Deploy Hook if there are new transactions (unless suppressed by skipDeploy query param)
    const skipDeployParam = request.nextUrl.searchParams.get('skipDeploy');
    if (shouldTriggerDeployHook(totalNew, skipDeployParam, process.env.VERCEL_DEPLOY_HOOK_URL) && process.env.VERCEL_DEPLOY_HOOK_URL) {
      try {
        const deployRes = await resilientFetch(process.env.VERCEL_DEPLOY_HOOK_URL, { method: 'POST', timeoutMs: 5000, retries: 2 });
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
    } else if (totalNew > 0 && skipDeployParam) {
      syncLog.push('Vercel Deploy Hook Skipped (skipDeploy=1)');
    }

    // 6. Trigger Web Push Notifications for New Highs if there are new transactions
    if (totalNew > 0) {
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5000';
        const pushRes = await resilientFetch(`${appUrl}/api/push/notify-new-high`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
          timeoutMs: 5000,
          retries: 2,
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

    const errorCount = syncLog.filter(line => line.toLowerCase().includes('error') || line.toLowerCase().includes('failed')).length;
    return apiSuccess({
      synced: totalNew,
      months: Array.from(monthsToSync),
      logCount: syncLog.length,
      errorCount,
    });
  } catch (error: unknown) {
    logger.error('SyncTransactionsAPI.GET', 'Sync error', {}, error as Error);
    return apiError('SYNC_ERROR', 'Sync error', 500, error instanceof Error ? error.message : String(error));
  }
}
