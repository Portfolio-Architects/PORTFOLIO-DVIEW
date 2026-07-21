/**
 * M5 Empirical Verification and Stress Testing Suite
 * Created by Challenger 1 for M5 Data Integrity & Audit Suite verification
 */

import { getOfficeTransactions, parseOfficeXml, safeParseInt, safeParseFloat, formatPrice } from '@/lib/services/officeTx.service';
import * as OfficeTxRepo from '@/lib/repositories/officeTx.repository';
import {
  NicknameSchema,
  SheetApartmentSchema,
  ObjectiveMetricsSchema,
  QuizAnswerSchema,
  MolTransactionXmlSchema,
  SearchConsoleStatusSchema
} from '@/lib/validation/facade.schemas';

jest.mock('@/lib/repositories/officeTx.repository');

// Mock cheerio for Jest environment
jest.mock('cheerio', () => {
  return {
    load: (xml: string) => {
      const itemXmls: string[] = [];
      if (xml && typeof xml === 'string') {
        const matches = xml.match(/<item>[\s\S]*?<\/item>/g);
        if (matches) {
          itemXmls.push(...matches);
        }
      }

      const getTagText = (itemXml: string, tag: string): string => {
        const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`);
        const match = itemXml.match(regex);
        return match ? match[1].trim() : '';
      };

      const instance = (selector: string | any) => {
        if (selector === 'item') {
          return {
            each: (cb: (idx: number, elem: any) => void) => {
              itemXmls.forEach((item, idx) => cb(idx, item));
            }
          };
        }
        if (typeof selector === 'string' && selector.startsWith('<item>')) {
          return {
            find: (tag: string) => ({
              text: () => getTagText(selector, tag)
            })
          };
        }
        return {
          text: () => '',
          find: () => ({ text: () => '' })
        };
      };

      return instance;
    }
  };
});

// Pure helper function reflecting PropertyTaxCalculator logic for empirical verification
function calculatePropertyTax(acquisitionPrice: number, ownedHouses: number, exclusiveArea: '85under' | '85over') {
  if (acquisitionPrice <= 0) return null;

  const priceEok = acquisitionPrice / 10000;
  
  let acqTaxRate = 1;
  if (ownedHouses === 1 || ownedHouses === 2) {
    if (priceEok <= 6) {
      acqTaxRate = 1;
    } else if (priceEok <= 9) {
      acqTaxRate = priceEok * (2 / 3) - 3;
    } else {
      acqTaxRate = 3;
    }
  } else if (ownedHouses === 3) {
    acqTaxRate = 8;
  } else {
    acqTaxRate = 12;
  }

  acqTaxRate = Math.round(acqTaxRate * 100) / 100;

  const acquisitionTax = Math.round(acquisitionPrice * (acqTaxRate / 100));
  
  const localEducationTaxRate = ownedHouses >= 3 ? 0.4 : Math.round(acqTaxRate * 0.1 * 100) / 100;
  const localEducationTax = Math.round(acquisitionPrice * (localEducationTaxRate / 100));

  let ruralSpecialTaxRate = 0;
  if (ownedHouses === 3) {
    ruralSpecialTaxRate = exclusiveArea === '85over' ? 0.6 : 0.2;
  } else if (ownedHouses >= 4) {
    ruralSpecialTaxRate = exclusiveArea === '85over' ? 1.0 : 0.4;
  } else {
    ruralSpecialTaxRate = exclusiveArea === '85over' ? 0.2 : 0;
  }
  const ruralSpecialTax = Math.round(acquisitionPrice * (ruralSpecialTaxRate / 100));

  const totalTax = acquisitionTax + localEducationTax + ruralSpecialTax;

  let brokerFeeRate = 0.4;
  let brokerFee = 0;
  if (acquisitionPrice < 5000) {
    brokerFeeRate = 0.6;
    brokerFee = Math.min(acquisitionPrice * 0.006, 25);
  } else if (acquisitionPrice < 20000) {
    brokerFeeRate = 0.5;
    brokerFee = Math.min(acquisitionPrice * 0.005, 80);
  } else if (acquisitionPrice < 90000) {
    brokerFeeRate = 0.4;
    brokerFee = acquisitionPrice * 0.004;
  } else if (acquisitionPrice < 120000) {
    brokerFeeRate = 0.5;
    brokerFee = acquisitionPrice * 0.005;
  } else if (acquisitionPrice < 150000) {
    brokerFeeRate = 0.6;
    brokerFee = acquisitionPrice * 0.006;
  } else {
    brokerFeeRate = 0.7;
    brokerFee = acquisitionPrice * 0.007;
  }

  brokerFee = Math.round(brokerFee);
  const totalCost = totalTax + brokerFee;

  return {
    acqTaxRate,
    localEducationTaxRate: Math.round(localEducationTaxRate * 100) / 100,
    ruralSpecialTaxRate,
    brokerFeeRate,
    acquisitionTax,
    localEducationTax,
    ruralSpecialTax,
    totalTax,
    brokerFee,
    totalCost,
  };
}

// Pure helper function for formatEokMan (PropertyTaxCalculator.tsx version)
function formatEokMan(manWon: number) {
  const rounded = Math.round(manWon);
  const eok = Math.floor(rounded / 10000);
  const remainder = rounded % 10000;
  if (eok > 0) {
    return remainder > 0 ? `${eok}억 ${remainder.toLocaleString()}만원` : `${eok}억원`;
  }
  return `${remainder.toLocaleString()}만원`;
}

// Pure helper function for formatKoreanPrice (RelocationTaxSimulator.tsx version)
function formatKoreanPrice(valueManWon: number) {
  const rounded = Math.round(valueManWon);
  if (rounded === 0) return '0원';
  const eok = Math.floor(rounded / 10000);
  const remainder = rounded % 10000;
  
  if (eok === 0) return `${remainder.toLocaleString()}만 원`;
  if (remainder === 0) return `${eok}억 원`;
  return `${eok}억 ${remainder.toLocaleString()}만 원`;
}

// Pure helper function simulating AptFitFinder score computation for empirical distribution testing
function computeAptFitScore(
  salesPrice: number,
  m: {
    distanceToPark?: number;
    parkingPerHousehold: number;
    householdCount: number;
    distanceToElementary: number;
    academyDensity: number;
    distanceToSubway: number;
    distanceToIndeokwon?: number;
    distanceToTram?: number;
    distanceToStarbucks?: number;
    yearBuilt: number;
  },
  answers: {
    budget: string;
    family: string;
    transit: string;
    lifestyle: string;
    scaleBrand: string;
    yearBuilt: string;
    investmentStyle: string;
  },
  jeonseRatio: number = 65,
  brandMultiplier: number = 1.0
) {
  if (salesPrice <= 0) return null;
  if (answers.budget === '3eok' && salesPrice > 38000) return null;
  if (answers.budget === '5eok' && (salesPrice < 25000 || salesPrice > 68000)) return null;
  if (answers.budget === '8eok' && (salesPrice < 50000 || salesPrice > 98000)) return null;
  if (answers.budget === '12eok' && (salesPrice < 80000 || salesPrice > 165000)) return null;
  if (answers.budget === 'unlimited' && salesPrice < 110000) return null;

  let score = 35; // baseline

  // 1. Budget
  if (answers.budget === '3eok') {
    if (salesPrice <= 33000) score += 25;
    else if (salesPrice <= 40000) score += 10;
    else score -= 15;
  } else if (answers.budget === '5eok') {
    if (salesPrice > 30000 && salesPrice <= 63000) score += 25;
    else if (salesPrice > 25000 && salesPrice <= 70000) score += 12;
    else score -= 10;
  } else if (answers.budget === '8eok') {
    if (salesPrice > 60000 && salesPrice <= 93000) score += 25;
    else if (salesPrice > 50000 && salesPrice <= 105000) score += 12;
    else score -= 10;
  } else if (answers.budget === '12eok') {
    if (salesPrice > 90000 && salesPrice <= 145000) score += 25;
    else if (salesPrice > 80000 && salesPrice <= 165000) score += 12;
    else score -= 10;
  } else if (answers.budget === 'unlimited') {
    if (salesPrice > 140000) score += 25;
    else if (salesPrice > 110000) score += 15;
    else score += 5;
  }

  // 2. Family
  if (answers.family === 'baby') {
    if ((m.distanceToPark ?? 9999) <= 400) score += 10;
    if (m.parkingPerHousehold >= 1.3) score += 5;
    if (m.householdCount >= 1000) score += 5;
  } else if (answers.family === 'elementary') {
    if (m.distanceToElementary <= 250) score += 20;
    else if (m.distanceToElementary <= 450) score += 12;
    else if (m.distanceToElementary <= 800) score += 5;
  } else if (answers.family === 'middleHigh') {
    if (m.academyDensity >= 50) score += 20;
    else if (m.academyDensity >= 25) score += 12;
    else if (m.academyDensity >= 10) score += 5;
  } else if (answers.family === 'none') {
    if (m.distanceToStarbucks && m.distanceToStarbucks <= 500) score += 10;
    if (m.academyDensity <= 25) score += 10;
  }

  // 3. Transit
  if (answers.transit === 'gtx') {
    if (m.distanceToSubway <= 600) score += 20;
    else if (m.distanceToSubway <= 1000) score += 12;
    else if (m.distanceToSubway <= 1500) score += 5;
  } else if (answers.transit === 'indeokwon') {
    if (m.distanceToIndeokwon && m.distanceToIndeokwon <= 600) score += 20;
    else if (m.distanceToIndeokwon && m.distanceToIndeokwon <= 1100) score += 10;
  } else if (answers.transit === 'tram') {
    if (m.distanceToTram && m.distanceToTram <= 400) score += 20;
    else if (m.distanceToTram && m.distanceToTram <= 800) score += 10;
  } else if (answers.transit === 'car') {
    if (m.parkingPerHousehold >= 1.4) score += 12;
    else if (m.parkingPerHousehold >= 1.25) score += 6;
    score += 8;
  }

  // 4. Lifestyle
  if (answers.lifestyle === 'nature') {
    if ((m.distanceToPark ?? 9999) <= 300) score += 15;
    else if ((m.distanceToPark ?? 9999) <= 600) score += 8;
  } else if (answers.lifestyle === 'shop') {
    if (m.distanceToStarbucks && m.distanceToStarbucks <= 500) score += 8;
    if (m.academyDensity + (m.householdCount / 100) >= 30) score += 7;
  } else if (answers.lifestyle === 'quiet') {
    if (m.householdCount >= 1000) score += 5;
    if (m.distanceToSubway >= 800) score += 10;
  }

  // 5. Scale & Brand
  if (answers.scaleBrand === 'mega') {
    if (m.householdCount >= 1500) score += 10;
    else if (m.householdCount >= 1000) score += 6;
    else score += 2;
  } else if (answers.scaleBrand === 'brand') {
    if (brandMultiplier >= 1.05) score += 10;
    else if (brandMultiplier >= 1.01) score += 6;
    else score += 3;
  } else if (answers.scaleBrand === 'costEffective') {
    if (m.householdCount >= 700 && m.householdCount < 1500) score += 10;
    else score += 4;
  }

  // 6. Year Built
  if (answers.yearBuilt === 'new') {
    if (m.yearBuilt >= 2021) score += 10;
    else if (m.yearBuilt >= 2018) score += 6;
    else score += 2;
  } else if (answers.yearBuilt === 'middle') {
    if (m.yearBuilt >= 2015 && m.yearBuilt < 2021) score += 10;
    else score += 4;
  } else if (answers.yearBuilt === 'established') {
    if (m.yearBuilt < 2015) score += 10;
    else if (m.yearBuilt < 2018) score += 6;
    else score += 2;
  }

  // 7. Investment Style
  if (answers.investmentStyle === 'residence') {
    if (m.distanceToStarbucks && m.distanceToStarbucks <= 600) score += 5;
    if (m.distanceToElementary <= 300) score += 5;
  } else if (answers.investmentStyle === 'gap') {
    if (jeonseRatio >= 70) score += 10;
    else if (jeonseRatio >= 64) score += 6;
    else score += 2;
  } else if (answers.investmentStyle === 'value') {
    if ((m.distanceToTram && m.distanceToTram <= 400) || (m.distanceToIndeokwon && m.distanceToIndeokwon <= 500)) score += 10;
    else score += 4;
  }

  const matchPercentage = Math.min(99, Math.max(0, Math.round((score / 145) * 100)));
  return { score, matchPercentage };
}

describe('M5 Empirical Verification & Stress Testing', () => {

  // --- ITEM 1: Property Tax Calculation Formulas ---
  describe('1. Property Tax Calculations (PropertyTaxCalculator.tsx)', () => {
    test('1-1. 1 House & 2 Houses in Non-adjusted Area: Rate tiers at 6억, 7.5억, 9억, 12억', () => {
      // 5억 (50,000만원 <= 6억): acqTaxRate = 1%
      const res5eok = calculatePropertyTax(50000, 1, '85under');
      expect(res5eok).not.toBeNull();
      expect(res5eok!.acqTaxRate).toBe(1);
      expect(res5eok!.acquisitionTax).toBe(500); // 50000 * 0.01
      expect(res5eok!.localEducationTaxRate).toBe(0.1);
      expect(res5eok!.localEducationTax).toBe(50);
      expect(res5eok!.ruralSpecialTaxRate).toBe(0); // <=85m2
      expect(res5eok!.ruralSpecialTax).toBe(0);

      // 7.5억 (75,000만원): 7.5 * (2/3) - 3 = 2%
      const res75eok = calculatePropertyTax(75000, 2, '85under');
      expect(res75eok!.acqTaxRate).toBe(2);
      expect(res75eok!.acquisitionTax).toBe(1500);
      expect(res75eok!.localEducationTaxRate).toBe(0.2);

      // 9억 (90,000만원): 3%
      const res9eok = calculatePropertyTax(90000, 1, '85under');
      expect(res9eok!.acqTaxRate).toBe(3);
      expect(res9eok!.acquisitionTax).toBe(2700);
      expect(res9eok!.localEducationTaxRate).toBe(0.3);

      // 12억 (120,000만원): 3%
      const res12eok = calculatePropertyTax(120000, 1, '85under');
      expect(res12eok!.acqTaxRate).toBe(3);
      expect(res12eok!.acquisitionTax).toBe(3600);
    });

    test('1-2. 3 Houses (Heavy Tax 8%): Education Tax 0.4%, Rural Tax (<=85m2: 0.2%, >85m2: 0.6%)', () => {
      // <=85m2
      const res3hUnder = calculatePropertyTax(80000, 3, '85under');
      expect(res3hUnder!.acqTaxRate).toBe(8);
      expect(res3hUnder!.acquisitionTax).toBe(6400);
      expect(res3hUnder!.localEducationTaxRate).toBe(0.4);
      expect(res3hUnder!.localEducationTax).toBe(320);
      expect(res3hUnder!.ruralSpecialTaxRate).toBe(0.2);
      expect(res3hUnder!.ruralSpecialTax).toBe(160);
      expect(res3hUnder!.totalTax).toBe(6400 + 320 + 160);

      // >85m2
      const res3hOver = calculatePropertyTax(80000, 3, '85over');
      expect(res3hOver!.ruralSpecialTaxRate).toBe(0.6);
      expect(res3hOver!.ruralSpecialTax).toBe(480);
      expect(res3hOver!.totalTax).toBe(6400 + 320 + 480);
    });

    test('1-3. 4+ Houses (Heavy Tax 12%): Education Tax 0.4%, Rural Tax (<=85m2: 0.4%, >85m2: 1.0%)', () => {
      // <=85m2
      const res4hUnder = calculatePropertyTax(100000, 4, '85under');
      expect(res4hUnder!.acqTaxRate).toBe(12);
      expect(res4hUnder!.acquisitionTax).toBe(12000);
      expect(res4hUnder!.localEducationTaxRate).toBe(0.4);
      expect(res4hUnder!.localEducationTax).toBe(400);
      expect(res4hUnder!.ruralSpecialTaxRate).toBe(0.4);
      expect(res4hUnder!.ruralSpecialTax).toBe(400);

      // >85m2
      const res4hOver = calculatePropertyTax(100000, 4, '85over');
      expect(res4hOver!.ruralSpecialTaxRate).toBe(1.0);
      expect(res4hOver!.ruralSpecialTax).toBe(1000);
      expect(res4hOver!.totalTax).toBe(12000 + 400 + 1000);
    });

    test('1-4. Brokerage Fee tier transitions and caps (5000만, 20000만, 90000만, 120000만, 150000만)', () => {
      // < 5,000만원: 0.6% max 25만원 (4,000만원 * 0.006 = 24만원)
      const fee4000 = calculatePropertyTax(4000, 1, '85under')!.brokerFee;
      expect(fee4000).toBe(24);

      // 4,999만원: 4999 * 0.006 = 29.994 -> capped at 25만원
      const fee4999 = calculatePropertyTax(4999, 1, '85under')!.brokerFee;
      expect(fee4999).toBe(25);

      // 19,999만원: 19999 * 0.005 = 99.995 -> capped at 80만원
      const fee19999 = calculatePropertyTax(19999, 1, '85under')!.brokerFee;
      expect(fee19999).toBe(80);

      // 20,000만원 (2억): 0.4% no cap -> 20000 * 0.004 = 80만원
      const fee20000 = calculatePropertyTax(20000, 1, '85under')!.brokerFee;
      expect(fee20000).toBe(80);

      // 89,999만원: 0.4% -> 89999 * 0.004 = 360만원 (359.996)
      const fee89999 = calculatePropertyTax(89999, 1, '85under')!.brokerFee;
      expect(fee89999).toBe(360);

      // 90,000만원 (9억): tier jump to 0.5% -> 90000 * 0.005 = 450만원
      const fee90000 = calculatePropertyTax(90000, 1, '85under')!.brokerFee;
      expect(fee90000).toBe(450);

      // 120,000만원 (12억): tier jump to 0.6% -> 120000 * 0.006 = 720만원
      const fee120000 = calculatePropertyTax(120000, 1, '85under')!.brokerFee;
      expect(fee120000).toBe(720);

      // 150,000만원 (15억): tier jump to 0.7% -> 150000 * 0.007 = 1050만원
      const fee150000 = calculatePropertyTax(150000, 1, '85under')!.brokerFee;
      expect(fee150000).toBe(1050);
    });

    test('1-5. Edge case: Zero or Negative Price', () => {
      expect(calculatePropertyTax(0, 1, '85under')).toBeNull();
      expect(calculatePropertyTax(-5000, 1, '85under')).toBeNull();
    });
  });

  // --- ITEM 2: Currency Formatters Boundary Values ---
  describe('2. Currency Formatters Boundary Stress Test', () => {
    test('2-1. formatEokMan boundary values (9999.6, 19999.6, 10000, 20000)', () => {
      // 9999.6 -> Math.round is 10000 -> 1억원
      expect(formatEokMan(9999.6)).toBe('1억원');

      // 19999.6 -> Math.round is 20000 -> 2억원
      expect(formatEokMan(19999.6)).toBe('2억원');

      // 10000 -> 1억원
      expect(formatEokMan(10000)).toBe('1억원');

      // 20000 -> 2억원
      expect(formatEokMan(20000)).toBe('2억원');

      // Additional boundary tests
      expect(formatEokMan(0)).toBe('0만원');
      expect(formatEokMan(9999.4)).toBe('9,999만원');
      expect(formatEokMan(10000.4)).toBe('1억원');
      expect(formatEokMan(10001)).toBe('1억 1만원');
      expect(formatEokMan(19999.4)).toBe('1억 9,999만원');
    });

    test('2-2. formatKoreanPrice boundary values (9999.6, 19999.6, 10000, 20000)', () => {
      // 0 -> 0원
      expect(formatKoreanPrice(0)).toBe('0원');

      // 9999.6 -> Math.round is 10000 -> 1억 원
      expect(formatKoreanPrice(9999.6)).toBe('1억 원');

      // 19999.6 -> Math.round is 20000 -> 2억 원
      expect(formatKoreanPrice(19999.6)).toBe('2억 원');

      // 10000 -> 1억 원
      expect(formatKoreanPrice(10000)).toBe('1억 원');

      // 20000 -> 2억 원
      expect(formatKoreanPrice(20000)).toBe('2억 원');

      // Additional boundary tests
      expect(formatKoreanPrice(5000)).toBe('5,000만 원');
      expect(formatKoreanPrice(10001)).toBe('1억 1만 원');
      expect(formatKoreanPrice(19999.4)).toBe('1억 9,999만 원');
    });
  });

  // --- ITEM 3: AptFitFinder Match Percentage Distribution ---
  describe('3. AptFitFinder Match Percentage Distribution (No 50% Floor Clamp)', () => {
    test('3-1. Verifies match percentage can fall below 50% for poorly matching options', () => {
      const resultLow = computeAptFitScore(
        115000, // barely passes budget filter (>110k)
        {
          distanceToPark: 2000,
          parkingPerHousehold: 1.0,
          householdCount: 300,
          distanceToElementary: 1500,
          academyDensity: 2,
          distanceToSubway: 3000,
          distanceToIndeokwon: 3000,
          distanceToTram: 3000,
          distanceToStarbucks: 2000,
          yearBuilt: 2010,
        },
        {
          budget: 'unlimited',
          family: 'elementary', // wants elementary <= 250m -> gets 0
          transit: 'gtx', // wants gtx <= 600m -> gets 0
          lifestyle: 'nature', // wants park <= 300m -> gets 0
          scaleBrand: 'mega', // wants > 1500 -> gets +2
          yearBuilt: 'new', // wants >= 2021 -> gets +2
          investmentStyle: 'gap', // jeonseRatio < 64 -> gets +2
        },
        50, // low jeonse ratio
        1.0 // no brand multiplier
      );

      expect(resultLow).not.toBeNull();
      // Baseline 35 + Q1(15) + Q2(0) + Q3(0) + Q4(0) + Q5(2) + Q6(2) + Q7(2) = 56 points
      // 56 / 145 = 38.6% -> rounded to 39%
      expect(resultLow!.matchPercentage).toBeLessThan(50);
      expect(resultLow!.matchPercentage).toBe(39);
    });

    test('3-2. High match scenario reaches upper range (> 85%)', () => {
      const resultHigh = computeAptFitScore(
        150000, // > 140k -> +25
        {
          distanceToPark: 150, // <= 300 -> +15
          parkingPerHousehold: 1.5,
          householdCount: 2000, // mega -> +10
          distanceToElementary: 150, // <= 250 -> +20
          academyDensity: 80,
          distanceToSubway: 300, // gtx <= 600 -> +20
          distanceToStarbucks: 300,
          yearBuilt: 2023, // new >= 2021 -> +10
        },
        {
          budget: 'unlimited',
          family: 'elementary',
          transit: 'gtx',
          lifestyle: 'nature',
          scaleBrand: 'mega',
          yearBuilt: 'new',
          investmentStyle: 'residence', // starbucks <= 600 & elem <= 300 -> +10
        },
        75,
        1.08
      );

      expect(resultHigh).not.toBeNull();
      // Score: 35 + 25 + 20 + 20 + 15 + 10 + 10 + 10 = 145 points (100%) -> clamped to max 99%
      expect(resultHigh!.matchPercentage).toBe(99);
    });

    test('3-3. Empirical distribution simulation over synthetic profiles', () => {
      const matchPercentages: number[] = [];
      const budgets = ['3eok', '5eok', '8eok', '12eok', 'unlimited'];
      const prices = [32000, 45000, 75000, 110000, 160000];

      budgets.forEach((budget, idx) => {
        const price = prices[idx];
        const res = computeAptFitScore(
          price,
          {
            distanceToPark: (idx % 2) * 500 + 200,
            parkingPerHousehold: 1.1 + (idx * 0.1),
            householdCount: 500 + (idx * 300),
            distanceToElementary: 200 + (idx * 150),
            academyDensity: 10 + (idx * 15),
            distanceToSubway: 400 + (idx * 400),
            yearBuilt: 2012 + (idx * 2),
          },
          {
            budget,
            family: idx % 2 === 0 ? 'elementary' : 'baby',
            transit: idx % 2 === 0 ? 'gtx' : 'car',
            lifestyle: idx % 2 === 0 ? 'nature' : 'quiet',
            scaleBrand: 'mega',
            yearBuilt: 'new',
            investmentStyle: 'gap',
          }
        );

        if (res) {
          matchPercentages.push(res.matchPercentage);
        }
      });

      expect(matchPercentages.length).toBeGreaterThan(0);
      const minMatch = Math.min(...matchPercentages);
      const maxMatch = Math.max(...matchPercentages);

      expect(minMatch).toBeGreaterThanOrEqual(0);
      expect(maxMatch).toBeLessThanOrEqual(99);
    });
  });

  // --- ITEM 4: Office Transaction XML Parser (officeTx.service.ts) ---
  describe('4. Office Transaction XML Parser Stress Testing (officeTx.service.ts)', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('4-1. Handles null, empty, or invalid XML strings gracefully', async () => {
      (OfficeTxRepo.fetchOfficeXmlFromPublicPortal as jest.Mock).mockResolvedValue('');
      const resEmpty = await getOfficeTransactions('41590', '202605');
      expect(resEmpty).toEqual([]);
    });

    test('4-2. Handles missing/empty child tags inside <item>', async () => {
      const xmlEmptyTags = `
        <response>
          <body>
            <items>
              <item>
                <!-- Completely empty item -->
              </item>
            </items>
          </body>
        </response>
      `;

      (OfficeTxRepo.fetchOfficeXmlFromPublicPortal as jest.Mock).mockResolvedValue(xmlEmptyTags);
      const result = await getOfficeTransactions('41590', '202605');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        date: '1970-01-01',
        type: '매매',
        sizeSqM: 0,
        floor: 1,
        price: '0원',
        buildingName: '미상 건물',
        priceRaw: 0,
        jibun: '',
      });
    });
    test('4-4. Direct helper functions safeParseInt, safeParseFloat, formatPrice, parseOfficeXml verification', () => {
      expect(safeParseInt('1,500')).toBe(1500);
      expect(safeParseInt(null, 10)).toBe(10);
      expect(safeParseInt('invalid', 5)).toBe(5);

      expect(safeParseFloat('123.45')).toBe(123.45);
      expect(safeParseFloat(undefined, 0)).toBe(0);
      expect(safeParseFloat('bad', 1.5)).toBe(1.5);

      expect(formatPrice('매매', '45,000')).toBe('4억 5,000만원');
      expect(formatPrice('임대', '50', '10,000')).toBe('보증금 1억 / 월세 50만');

      const xml = '<response><body><items><item><건물명>테스트 타워</건물명><거래금액>20,000</거래금액></item></items></body></response>';
      const parsed = parseOfficeXml(xml);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].buildingName).toBe('테스트 타워');
    });
    test('4-3. Handles corrupted numeric strings in tags', async () => {
      const xmlCorrupted = `
        <response>
          <body>
            <items>
              <item>
                <건물명>동탄 팩토리</건물명>
                <구분>매매</구분>
                <거래금액>12,500</거래금액>
                <년>2026</년>
                <월>5</월>
                <일>12</일>
                <전용면적>84.95</전용면적>
                <층>7</층>
              </item>
            </items>
          </body>
        </response>
      `;

      (OfficeTxRepo.fetchOfficeXmlFromPublicPortal as jest.Mock).mockResolvedValue(xmlCorrupted);
      const result = await getOfficeTransactions('41590', '202605');
      expect(result).toHaveLength(1);
      expect(result[0].buildingName).toBe('동탄 팩토리');
      expect(result[0].date).toBe('2026-05-12');
      expect(result[0].priceRaw).toBe(12500);
      expect(result[0].price).toBe('1억 2,500만원');
      expect(result[0].sizeSqM).toBe(84.95);
      expect(result[0].floor).toBe(7);
    });
  });

  // --- ITEM 5: Zod Validation Schemas (facade.schemas.ts) ---
  describe('5. Zod Schemas Validation Testing (facade.schemas.ts)', () => {
    test('5-1. NicknameSchema validation & transformation', () => {
      // Valid nicknames
      expect(NicknameSchema.parse('동탄주민')).toBe('동탄주민');
      expect(NicknameSchema.parse('  User_123  ')).toBe('User_123'); // auto-trimmed
      expect(NicknameSchema.parse('abc_123')).toBe('abc_123');

      // Invalid length (< 2 or > 10)
      expect(() => NicknameSchema.parse('a')).toThrow();
      expect(() => NicknameSchema.parse('  a  ')).toThrow(); // trim -> length 1
      expect(() => NicknameSchema.parse('동탄아파트마스터12345')).toThrow(); // 11 chars

      // Invalid characters (spaces inside, special chars)
      expect(() => NicknameSchema.parse('동탄 주민')).toThrow();
      expect(() => NicknameSchema.parse('User@123')).toThrow();
    });

    test('5-2. SheetApartmentSchema type coercion & optional fields', () => {
      const rawInput = {
        name: '동탄역 시범우남퍼스트빌',
        dong: '오산동',
        lat: '37.2001', // numeric string coercion
        lng: '127.0988',
        householdCount: '1440',
        yearBuilt: '2015',
        brand: '우남',
      };

      const parsed = SheetApartmentSchema.parse(rawInput);
      expect(parsed.lat).toBe(37.2001);
      expect(parsed.lng).toBe(127.0988);
      expect(parsed.householdCount).toBe(1440);
      expect(parsed.brand).toBe('우남');
    });

    test('5-3. ObjectiveMetricsSchema null transforming & default fallbacks', () => {
      const rawNulls = {
        brand: null,
        householdCount: null,
        far: null,
        bcr: null,
        yearBuilt: '2018년', // tests regex year parser
        distanceToElementary: null,
        nearestSchoolNames: null,
      };

      const parsed = ObjectiveMetricsSchema.parse(rawNulls);
      expect(parsed.brand).toBe('');
      expect(parsed.householdCount).toBe(0);
      expect(parsed.far).toBe(0);
      expect(parsed.bcr).toBe(0);
      expect(parsed.yearBuilt).toBe(2018);
      expect(parsed.distanceToElementary).toBe(9999);
      expect(parsed.nearestSchoolNames).toEqual({ elementary: '', middle: '', high: '' });
    });

    test('5-4. QuizAnswerSchema defaults', () => {
      const parsed = QuizAnswerSchema.parse({});
      expect(parsed.budget).toBe('');
      expect(parsed.family).toBe('');
      expect(parsed.transit).toBe('');
    });

    test('5-5. MolTransactionXmlSchema defaults', () => {
      const parsed = MolTransactionXmlSchema.parse({});
      expect(parsed.buildingName).toBe('미상 건물');
      expect(parsed.type).toBe('매매');
      expect(parsed.priceRaw).toBe('0');
      expect(parsed.sizeSqM).toBe(0);
    });

    test('5-6. SearchConsoleStatusSchema strict validation', () => {
      const validSearchConsole = {
        success: true,
        isMock: false,
        siteUrl: 'https://d-view.kr',
        indexStatus: {
          totalIndexed: 150,
          notIndexed: 10,
          crawledNotIndexed: 5,
          discoveredNotIndexed: 5,
          errors: 0,
        },
        searchMetrics: {
          clicks: 1200,
          impressions: 45000,
          ctr: 0.026,
          averagePosition: 4.2,
        },
      };

      expect(() => SearchConsoleStatusSchema.parse(validSearchConsole)).not.toThrow();

      // Invalid URL
      expect(() => SearchConsoleStatusSchema.parse({
        ...validSearchConsole,
        siteUrl: 'not-a-url',
      })).toThrow();
    });
  });
});
