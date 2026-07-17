import fs from 'fs';
import { NextRequest } from 'next/server';

// Polyfill Response.json if it is missing in the testing environment (due to node-fetch polyfills in jest.setup.ts)
if (!Response.json) {
  Response.json = (data: any, init?: any) => {
    const res = new Response(JSON.stringify(data), init);
    res.headers.set('Content-Type', 'application/json');
    return res;
  };
}

import { GET } from './route';
import { getOfficeTransactions } from '@/lib/services/officeTx.service';

jest.mock('@/lib/services/officeTx.service', () => ({
  getOfficeTransactions: jest.fn(),
}));

jest.mock('fs', () => {
  const actualFs = jest.requireActual('fs');
  return {
    ...actualFs,
    existsSync: jest.fn(),
    readFileSync: jest.fn(),
    mkdirSync: jest.fn(),
    writeFileSync: jest.fn(),
  };
});

const realFs = jest.requireActual('fs');

const mockBuildings = [
  { id: '금강 IX', name: '금강펜테리움 IX타워', jibun: '823-6', totalUnits: 2701, gfa: 287343, baselineVacancy: 21.8, yearBuilt: 2021 },
  { id: '실리콘앨리', name: '현대 실리콘앨리 동탄', jibun: '844-1', totalUnits: 2470, gfa: 238615, baselineVacancy: 29.8, yearBuilt: 2023 },
  { id: 'SH타임', name: '동탄 SH타임스퀘어', jibun: '741-2', totalUnits: 369, gfa: 42358, baselineVacancy: 12.5, yearBuilt: 2018 },
  { id: '더퍼스트', name: '동탄 더퍼스트타워', jibun: '656-11', totalUnits: 460, gfa: 58490, baselineVacancy: 8.7, yearBuilt: 2018 },
  { id: 'SK V1', name: '동탄 SK V1 center', jibun: '853-1', totalUnits: 776, gfa: 89300, baselineVacancy: 13.2, yearBuilt: 2019 },
  { id: '에이팩시티', name: '에이팩시티', jibun: '823', totalUnits: 618, gfa: 72000, baselineVacancy: 7.2, yearBuilt: 2017 },
  { id: '테라타워', name: '동탄 테라타워', jibun: '823-1', totalUnits: 824, gfa: 96200, baselineVacancy: 16.2, yearBuilt: 2020 },
  { id: 'IT타워', name: '동탄 IT타워', jibun: '823-2', totalUnits: 320, gfa: 38900, baselineVacancy: 7.2, yearBuilt: 2017 },
  { id: '메가비즈타워', name: '동탄 메가비즈타워 A동', jibun: '823-3', totalUnits: 168, gfa: 34200, baselineVacancy: 15.2, yearBuilt: 2019 },
  { id: '비즈타워', name: '동탄 비즈타워', jibun: '851-1', totalUnits: 276, gfa: 33100, baselineVacancy: 15.6, yearBuilt: 2018 }
];

let mockNpsStats = {
  stats: {
    yeongcheonDong: {
      companiesCount: 1917,
      totalEmployees: 25257,
      newHires: 918,
      departures: 809
    }
  }
};

describe('Technovalley Trend API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    (fs.existsSync as jest.Mock).mockImplementation((p: string) => {
      if (p.includes('trend-cache.json')) return false; // bypass cache
      if (p.includes('yeongcheon_jisan_units.json') || p.includes('nps_stats.json')) return true;
      return realFs.existsSync(p);
    });

    (fs.readFileSync as jest.Mock).mockImplementation((p: string, encoding?: string) => {
      if (p.includes('yeongcheon_jisan_units.json')) {
        return JSON.stringify(mockBuildings);
      }
      if (p.includes('nps_stats.json')) {
        return JSON.stringify(mockNpsStats);
      }
      return realFs.readFileSync(p, encoding);
    });
  });

  it('should return correct API response structure and backward compatibility', async () => {
    (getOfficeTransactions as jest.Mock).mockResolvedValue([
      { priceRaw: 20000, sizeSqM: 50, buildingName: '금강펜테리움 IX타워' }
    ]);

    const req = new NextRequest('http://localhost/api/technovalley/trend?refresh=true');
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toBeDefined();
    expect(Array.isArray(json.data)).toBe(true);
    // There are 16 static historical records + 6 target months = 22 records
    expect(json.data.length).toBe(22);

    // Verify response structure of the first target month record
    const firstCalculated = json.data[16];
    expect(firstCalculated.date).toBe('25.01');
    expect(firstCalculated['금강 IX']).toBeDefined();
    expect(firstCalculated['금강IX_임대료']).toBeDefined();
    expect(firstCalculated['평균임대료']).toBeDefined();
  });

  it('should compute rents and vacancy rate under normal operation with mocked transactions', async () => {
    // Generate valid transactions within rent limits [1.5, 8.0]
    // Rent = (priceRaw * 3.3058 / sizeSqM * 0.035) / 12
    // For sizeSqM = 100, priceRaw = 38000:
    // Rent = (38000 * 3.3058 / 100 * 0.035) / 12 = (1256.204 * 0.035) / 12 = 43.967 / 12 = 3.66 (Valid!)
    (getOfficeTransactions as jest.Mock).mockResolvedValue([
      { priceRaw: 38000, sizeSqM: 100, buildingName: '금강펜테리움 IX타워' }
    ]);

    const req = new NextRequest('http://localhost/api/technovalley/trend?refresh=true');
    const res = await GET(req);
    const json = await res.json();
    
    // Check if the gold rent changes due to transaction
    const calculatedRent = json.data[16]['금강IX_임대료'];
    expect(calculatedRent).not.toBeNull();
    // EMA Rent smoothing: 0.4 * 3.6639 + 0.6 * 3.60 = 3.6255 -> 3.63
    expect(calculatedRent).toBe(3.63);
  });

  it('should fall back smoothly to previous values and respect minimum floor when transaction volume is zero', async () => {
    (getOfficeTransactions as jest.Mock).mockResolvedValue([]);

    const req = new NextRequest('http://localhost/api/technovalley/trend?refresh=true');
    const res = await GET(req);
    const json = await res.json();

    // Rents should propagate without changing
    expect(json.data[16]['금강IX_임대료']).toBe(3.60);
    expect(json.data[17]['금강IX_임대료']).toBe(3.60);

    // Vacancy rate should respect the convergenceFloor
    // For 금강 IX (yearBuilt: 2021) in Target Month 202605:
    // age = 2026 + (5-1)/12 - 2021 = 2026.333 - 2021 = 5.333 > 3.0 -> convergenceFloor = 4.0
    // The vacancy rate for 금강 IX at 202605 (index 21) must be >= 4.0
    expect(json.data[21]['금강 IX']).toBeGreaterThanOrEqual(4.0);
  });

  it('should handle negative NPS employment growth symmetrically', async () => {
    // Mock negative NPS growth: departures > newHires
    mockNpsStats = {
      stats: {
        yeongcheonDong: {
          companiesCount: 2000,
          totalEmployees: 25000,
          newHires: 100,
          departures: 1100 // netHires = -1000, jobGrowthRate = -0.04
        }
      }
    };
    
    // Clear mock transactions (zero transactions to see macro bonus effect clearly)
    (getOfficeTransactions as jest.Mock).mockResolvedValue([]);

    const req = new NextRequest('http://localhost/api/technovalley/trend?refresh=true');
    const res = await GET(req);
    const jsonNegative = await res.json();

    // Reset NPS stats to positive growth and re-run
    mockNpsStats = {
      stats: {
        yeongcheonDong: {
          companiesCount: 2000,
          totalEmployees: 25000,
          newHires: 1100,
          departures: 100 // netHires = +1000, jobGrowthRate = +0.04
        }
      }
    };

    const res2 = await GET(req);
    const jsonPositive = await res2.json();

    // Compare vacancy rate for SH타임 (an older building) at 202501 (index 16)
    // Negative job growth should result in higher vacancy rate (slower decline or worse increase)
    const vacancyNegative = jsonNegative.data[16]['SH타임'];
    const vacancyPositive = jsonPositive.data[16]['SH타임'];
    expect(vacancyNegative).toBeGreaterThan(vacancyPositive);
  });

  it('should accelerate fill-up for younger buildings and apply decay for older ones', async () => {
    // Reset to base NPS
    mockNpsStats = {
      stats: {
        yeongcheonDong: {
          companiesCount: 2000,
          totalEmployees: 25000,
          newHires: 500,
          departures: 500
        }
      }
    };

    // Mock transactions: same transactions (e.g. 5 transactions of size 100) for Silicon Alley (2023) and SH타임 (2018)
    // Silicon Alley: age <= 2.0 -> turnoverRate = -0.5
    // SH타임: age > 2.0 -> turnoverRate = 0.2, and has a lower decayFactor (age-based) which shrinks transaction impact
    (getOfficeTransactions as jest.Mock).mockResolvedValue([
      { priceRaw: 38000, sizeSqM: 100, buildingName: '현대 실리콘앨리 동탄' },
      { priceRaw: 38000, sizeSqM: 100, buildingName: '현대 실리콘앨리 동탄' },
      { priceRaw: 38000, sizeSqM: 100, buildingName: '동탄 SH타임스퀘어' },
      { priceRaw: 38000, sizeSqM: 100, buildingName: '동탄 SH타임스퀘어' }
    ]);

    const req = new NextRequest('http://localhost/api/technovalley/trend?refresh=true');
    const res = await GET(req);
    const json = await res.json();

    // Silicon Alley (younger building) should experience accelerated reduction
    // SH타임 (older building) should experience smaller reduction / natural churn
    // Let's verify the change in vacancy from baseline (index 15) to index 16
    const siliconAlleyDiff = json.data[15]['실리콘앨리'] - json.data[16]['실리콘앨리'];
    const shTimeDiff = json.data[15]['SH타임'] - json.data[16]['SH타임'];

    // Silicon Alley should have filled up faster (larger reduction in vacancy rate)
    expect(siliconAlleyDiff).toBeGreaterThan(shTimeDiff);
  });
});
