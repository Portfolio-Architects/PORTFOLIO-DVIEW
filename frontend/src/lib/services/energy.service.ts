/**
 * @module energy.service
 * @description Domain logic for estimating vacancy rates based on monthly building energy (electricity) usage.
 * Architecture Layer: Service (Domain logic & Calculations)
 */
import { logger } from './logger';
import { fetchEnergyJsonFromPublicPortal } from '@/lib/repositories/energy.repository';

export interface VacancyEstimation {
  readonly [buildingKey: string]: number | null;
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

// Exact parcel parameters (bun, ji) for 10 landmark buildings in Yeongcheon-dong
const BUILDING_PARCEL_MAP: Record<string, { bun: string; ji: string }> = {
  '금강 IX': { bun: '0823', ji: '0006' },
  '실리콘앨리': { bun: '0844', ji: '0001' },
  'SH타임': { bun: '0741', ji: '0002' },
  '더퍼스트': { bun: '0656', ji: '0011' },
  'SK V1': { bun: '0853', ji: '0001' },
  '에이팩시티': { bun: '0823', ji: '0000' },
  '테라타워': { bun: '0823', ji: '0001' },
  'IT타워': { bun: '0823', ji: '0002' },
  '메가비즈타워': { bun: '0823', ji: '0003' },
  '비즈타워': { bun: '0823', ji: '0004' }
};

// Target Standard Monthly Electricity Consumption threshold per ㎡ (kWh) when fully occupied
const STANDARD_KWH_PER_SQM = 0.25;

/**
 * Calculates vacancy rate estimation based on electricity usage
 * Vacancy (%) = 100 - (Actual Electricity Usage / (GFA * Standard Consumption Ratio)) * 100
 */
export async function getEnergyVacancyEstimation(lawdCd: string = '41590', crtnMm: string = '202605'): Promise<VacancyEstimation | null> {
  try {
    const estimation: Record<string, number | null> = {};

    // Query energy data for all 10 landmark buildings in parallel
    await Promise.all(
      Object.keys(BUILDING_GFA_MAP).map(async (key) => {
        const parcel = BUILDING_PARCEL_MAP[key];
        const gfa = BUILDING_GFA_MAP[key];
        
        if (!parcel) {
          estimation[key] = null;
          return;
        }

        try {
          // Fetch real electricity data via the JSON OpenAPI
          const jsonString = await fetchEnergyJsonFromPublicPortal(lawdCd, crtnMm, parcel.bun, parcel.ji);
          const resData = JSON.parse(jsonString);
          
          const items = resData?.response?.body?.items?.item || [];
          // If public DB has no records for the target month, strictly nullify
          if (items.length === 0) {
            estimation[key] = null;
            return;
          }

          // useQty stands for the parsed monthly electricity usage (kWh)
          const actualQty = parseFloat(items[0].useQty) || 0;
          if (actualQty <= 0) {
            estimation[key] = null;
            return;
          }

          // Max capacity for GFA
          const maxCapacityKwh = gfa * STANDARD_KWH_PER_SQM;
          // Occupancy (Usage) Rate: bounded between 35% and 95%
          const usageRate = Math.max(0.35, Math.min(0.95, actualQty / maxCapacityKwh));
          
          // Vacancy Rate = 100 - (UsageRate * 100)
          const vacancyRate = 100 - (usageRate * 100);
          estimation[key] = parseFloat(vacancyRate.toFixed(1));
        } catch (e) {
          logger.warn('energy.service.getEnergyVacancyEstimation', `Failed to estimate vacancy for ${key}, nullifying`, { month: crtnMm, error: String(e) });
          estimation[key] = null;
        }
      })
    );

    logger.info('energy.service.getEnergyVacancyEstimation', 'Vacancy estimated successfully via electricity usage', { month: crtnMm });
    return estimation;
  } catch (err) {
    logger.error('energy.service.getEnergyVacancyEstimation', 'Vacancy estimation failed due to API / network errors', { month: crtnMm }, err);
    return null;
  }
}
