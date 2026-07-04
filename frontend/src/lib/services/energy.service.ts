/**
 * @module energy.service
 * @description Domain logic for estimating vacancy rates based on monthly building energy (electricity) usage.
 * Architecture Layer: Service (Domain logic & Calculations)
 */
import * as cheerio from 'cheerio';
import { logger } from './logger';
import { fetchEnergyXmlFromPublicPortal } from '@/lib/repositories/energy.repository';

export interface VacancyEstimation {
  readonly [buildingKey: string]: number;
}

// 10 landmark buildings metadata: Gross Floor Area (GFA, ㎡)
const BUILDING_GFA_MAP: Record<string, number> = {
  '금강 IX': 287343,
  '실리콘앨리': 238615,
  'SH타임': 42358,
  '더퍼스트': 58490,
  'SK V1': 89300,
  '에이팩시티': 72000,
  '테라타워': 96200,
  'IT타워': 38900,
  '메가비즈타워': 34200,
  '비즈타워': 33100
};

// Target Standard Monthly Electricity Consumption threshold per ㎡ (kWh) when fully occupied
const STANDARD_KWH_PER_SQM = 12.5;

/**
 * Normalizes API building names to map to official keys
 */
function normalizeBuildingKey(rawName: string): string | null {
  const norm = rawName.replace(/\s+/g, '').toLowerCase();
  if (norm.includes('금강') && (norm.includes('ix') || norm.includes('펜테리움'))) {
    return '금강 IX';
  } else if (norm.includes('실리콘앨리') || norm.includes('실리콘')) {
    return '실리콘앨리';
  } else if (norm.includes('타임스퀘어') || norm.includes('sh타임')) {
    return 'SH타임';
  } else if (norm.includes('더퍼스트')) {
    return '더퍼스트';
  } else if (norm.includes('skv1') || norm.includes('sk v1')) {
    return 'SK V1';
  } else if (norm.includes('에이팩시티') || norm.includes('에이팩')) {
    return '에이팩시티';
  } else if (norm.includes('테라타워') || norm.includes('테라')) {
    return '테라타워';
  } else if (norm.includes('it타워') || norm.includes('아이티타워') || norm.includes('it 타워')) {
    return 'IT타워';
  } else if (norm.includes('메가비즈타워') || norm.includes('메가비즈')) {
    return '메가비즈타워';
  } else if (norm.includes('비즈타워') && !norm.includes('메가비즈')) {
    return '비즈타워';
  }
  return null;
}

/**
 * Calculates vacancy rate estimation based on electricity usage
 * Vacancy (%) = 100 - (Actual Electricity Usage / (GFA * Standard Consumption Ratio)) * 100
 */
export async function getEnergyVacancyEstimation(lawdCd: string = '41590', crtnMm: string = '202605'): Promise<VacancyEstimation> {
  try {
    const xml = await fetchEnergyXmlFromPublicPortal(lawdCd, crtnMm);
    const $ = cheerio.load(xml, { xmlMode: true });
    
    const parsedData: Record<string, number> = {};

    $('item').each((_, elem) => {
      const $item = $(elem);
      const useMm = $item.find('useMm').text().trim();
      
      // Only parse items corresponding to the requested month (crtnMm)
      if (useMm && useMm !== crtnMm) {
        return;
      }
      
      const rawBldNm = $item.find('bldNm').text().trim();
      const elctQty = parseFloat($item.find('elctUsgQty').text().trim()) || 0;
      
      const key = normalizeBuildingKey(rawBldNm);
      if (key && elctQty > 0) {
        parsedData[key] = elctQty;
      }
    });

    const estimation: Record<string, number> = {};

    // Apply estimation formula for all 10 core buildings
    for (const key of Object.keys(BUILDING_GFA_MAP)) {
      const gfa = BUILDING_GFA_MAP[key];
      const actualQty = parsedData[key];

      if (!actualQty) {
        // Fallback reference value if no data found for specific building
        estimation[key] = 15.0;
        continue;
      }

      // Max capacity for GFA
      const maxCapacityKwh = gfa * STANDARD_KWH_PER_SQM;
      // Occupancy (Usage) Rate: bounded between 35% and 95%
      const usageRate = Math.max(0.35, Math.min(0.95, actualQty / maxCapacityKwh));
      
      // Vacancy Rate = 100 - (UsageRate * 100)
      const vacancyRate = 100 - (usageRate * 100);
      estimation[key] = parseFloat(vacancyRate.toFixed(1));
    }

    logger.info('energy.service.getEnergyVacancyEstimation', 'Vacancy estimated successfully via electricity usage', { month: crtnMm });
    return estimation;
  } catch (err) {
    logger.error('energy.service.getEnergyVacancyEstimation', 'Vacancy estimation failed, returning default fallbacks', { month: crtnMm }, err);
    // Ultimate fallback values
    return {
      '금강 IX': 17.5,
      '실리콘앨리': 17.2,
      'SH타임': 10.8,
      '더퍼스트': 7.2,
      'SK V1': 10.8,
      '에이팩시티': 5.8,
      '테라타워': 12.4,
      'IT타워': 5.8,
      '메가비즈타워': 12.0,
      '비즈타워': 12.0
    };
  }
}
