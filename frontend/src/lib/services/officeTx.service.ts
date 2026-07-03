import * as cheerio from 'cheerio';
import { logger } from './logger';
import * as OfficeTxRepo from '@/lib/repositories/officeTx.repository';

export interface OfficeTransaction {
  readonly date: string;
  readonly type: '매매' | '임대';
  readonly sizeSqM: number;
  readonly floor: number;
  readonly price: string;
  readonly buildingName: string;
  readonly priceRaw?: number;
  readonly jibun?: string;
}

/**
 * Format string price to client-friendly wording
 * e.g., "41,000" (10000 KRW unit) -> "4억 1,000만원"
 */
function formatPrice(type: '매매' | '임대', priceRaw: string, depositRaw?: string): string {
  if (type === '임대') {
    const depVal = depositRaw ? parseInt(depositRaw.replace(/,/g, ''), 10) : 0;
    const rentVal = parseInt(priceRaw.replace(/,/g, ''), 10);
    const depStr = depVal >= 10000 
      ? `${Math.floor(depVal / 10000)}억 ${depVal % 10000 > 0 ? (depVal % 10000).toLocaleString() : ''}`.trim() + '만' 
      : `${depVal.toLocaleString()}만`;
    return `보증금 ${depStr} / 월세 ${rentVal.toLocaleString()}만`;
  }

  const priceVal = parseInt(priceRaw.replace(/,/g, ''), 10);
  if (priceVal >= 10000) {
    const bill = Math.floor(priceVal / 10000);
    const remain = priceVal % 10000;
    return `${bill}억 ${remain > 0 ? remain.toLocaleString() + '만' : ''}원`;
  }
  return `${priceVal.toLocaleString()}만원`;
}

/**
 * Parses Public Office XML data using Cheerio
 */
function parseOfficeXml(xml: string): OfficeTransaction[] {
  const $ = cheerio.load(xml, { xmlMode: true });
  const list: OfficeTransaction[] = [];

  $('item').each((_, elem) => {
    const $item = $(elem);
    const buildingName = $item.find('건물명').text().trim();
    const type = ($item.find('구분').text().trim() || '매매') as '매매' | '임대';
    const priceRaw = $item.find('거래금액').text().trim();
    const depositRaw = $item.find('보증금액').text().trim();
    const priceVal = parseInt(priceRaw.replace(/,/g, ''), 10) || 0;
    const year = $item.find('년').text().trim();
    const monthRaw = $item.find('월').text().trim();
    const dayRaw = $item.find('일').text().trim();
    const sizeSqM = parseFloat($item.find('전용면적').text().trim() || '0');
    const floor = parseInt($item.find('층').text().trim() || '1', 10);
    const jibun = $item.find('지번').text().trim() || $item.find('jibun').text().trim();

    const month = monthRaw.length === 1 ? `0${monthRaw}` : monthRaw;
    const day = dayRaw.length === 1 ? `0${dayRaw}` : dayRaw;
    const date = `${year}-${month}-${day}`;

    const price = formatPrice(type, priceRaw, depositRaw);

    list.push({
      date,
      type,
      sizeSqM,
      floor,
      price,
      buildingName,
      priceRaw: priceVal,
      jibun
    });
  });

  return list;
}

/**
 * Fetches office transaction data from public portal API.
 * Falls back to mock XML if KEY is missing or server is unreachable.
 */
export async function getOfficeTransactions(lawdCd: string = '41590', dealYmd: string = '202605'): Promise<OfficeTransaction[]> {
  try {
    const xml = await OfficeTxRepo.fetchOfficeXmlFromPublicPortal(lawdCd, dealYmd);
    return parseOfficeXml(xml);
  } catch (err) {
    logger.error('OfficeTxService.getOfficeTransactions', 'Error fetching or parsing office transactions, falling back to mock.', { error: err instanceof Error ? err.message : String(err) });
    return parseOfficeXml(OfficeTxRepo.MOCK_XML_RESPONSE);
  }
}

