import fs from 'fs';
import { NextRequest } from 'next/server';

// Polyfill Response.json if it is missing in the testing environment
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

let mockBuildings: any[] = [];
let mockNpsStats: any = {};

describe('Technovalley Trend API Route - Empirical Challenge Harness', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset default mock data
    mockBuildings = [
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

    mockNpsStats = {
      stats: {
        yeongcheonDong: {
          companiesCount: 1917,
          totalEmployees: 25257,
          newHires: 918,
          departures: 809
        }
      }
    };

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

  // Scenario 1: Extreme Transaction Sizes & Prices
  describe('Extreme Transaction Inputs', () => {
    it('should handle NaN sizes or prices without crashing but may propagate NaN', async () => {
      (getOfficeTransactions as jest.Mock).mockResolvedValue([
        { priceRaw: NaN, sizeSqM: 100, buildingName: '금강펜테리움 IX타워' },
        { priceRaw: 38000, sizeSqM: NaN, buildingName: '금강펜테리움 IX타워' }
      ]);

      const req = new NextRequest('http://localhost/api/technovalley/trend?refresh=true');
      const res = await GET(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);

      // Verify that NaN doesn't crash the server, but let's check if it propagates to output
      // Let's inspect the calculated vacancy/rent values for '금강 IX'
      const firstCalculated = json.data[16];
      console.log('NaN inputs output sample:', firstCalculated);
    });

    it('should filter out extreme sizes (< 15 or > 500) and outlier rents gracefully', async () => {
      (getOfficeTransactions as jest.Mock).mockResolvedValue([
        // Size outlier (< 15)
        { priceRaw: 5000, sizeSqM: 10, buildingName: '금강펜테리움 IX타워' },
        // Size outlier (> 500)
        { priceRaw: 200000, sizeSqM: 600, buildingName: '금강펜테리움 IX타워' },
        // Rent outlier (calculatedRent < 1.5)
        // Rent = (1000 * 3.3058 / 100 * 0.035) / 12 = 0.096 < 1.5
        { priceRaw: 1000, sizeSqM: 100, buildingName: '금강펜테리움 IX타워' },
        // Rent outlier (calculatedRent > 8.0)
        // Rent = (100000 * 3.3058 / 100 * 0.035) / 12 = 9.64 > 8.0
        { priceRaw: 100000, sizeSqM: 100, buildingName: '금강펜테리움 IX타워' }
      ]);

      const req = new NextRequest('http://localhost/api/technovalley/trend?refresh=true');
      const res = await GET(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);

      // Since all transactions are outliers, they should be filtered out.
      // Rent should propagate as default 3.60 for 25.01
      expect(json.data[16]['금강IX_임대료']).toBe(3.60);
    });

    it('should handle zero sizeSqM correctly', async () => {
      (getOfficeTransactions as jest.Mock).mockResolvedValue([
        { priceRaw: 38000, sizeSqM: 0, buildingName: '금강펜테리움 IX타워' }
      ]);

      const req = new NextRequest('http://localhost/api/technovalley/trend?refresh=true');
      const res = await GET(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      // Zero sizeSqM is filtered out by sizeSqM < 15, so no division by zero occurs in pyeong calculation.
    });

    it('should handle negative transaction price or size', async () => {
      (getOfficeTransactions as jest.Mock).mockResolvedValue([
        { priceRaw: -100, sizeSqM: 100, buildingName: '금강펜테리움 IX타워' },
        { priceRaw: 38000, sizeSqM: -50, buildingName: '금강펜테리움 IX타워' }
      ]);

      const req = new NextRequest('http://localhost/api/technovalley/trend?refresh=true');
      const res = await GET(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      // Negative sizes are < 15, so filtered. Negative prices lead to negative calculated rent which is < 1.5, so filtered.
    });
  });

  // Scenario 2: Extreme NPS Values
  describe('Extreme NPS values', () => {
    it('should handle negative companies count or employees count', async () => {
      mockNpsStats = {
        stats: {
          yeongcheonDong: {
            companiesCount: -100,
            totalEmployees: -500,
            newHires: 100,
            departures: 100
          }
        }
      };

      (getOfficeTransactions as jest.Mock).mockResolvedValue([]);

      const req = new NextRequest('http://localhost/api/technovalley/trend?refresh=true');
      const res = await GET(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      console.log('Negative NPS output sample:', json.data[16]);
    });

    it('should handle zero total employees and companiesCount', async () => {
      mockNpsStats = {
        stats: {
          yeongcheonDong: {
            companiesCount: 0,
            totalEmployees: 0,
            newHires: 0,
            departures: 0
          }
        }
      };

      (getOfficeTransactions as jest.Mock).mockResolvedValue([]);

      const req = new NextRequest('http://localhost/api/technovalley/trend?refresh=true');
      const res = await GET(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it('should handle massive total employees and companiesCount (scale testing log functions)', async () => {
      mockNpsStats = {
        stats: {
          yeongcheonDong: {
            companiesCount: 100000000,
            totalEmployees: 1000000000,
            newHires: 50000000,
            departures: 10000000
          }
        }
      };

      (getOfficeTransactions as jest.Mock).mockResolvedValue([]);

      const req = new NextRequest('http://localhost/api/technovalley/trend?refresh=true');
      const res = await GET(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      console.log('Massive NPS output sample:', json.data[16]);
    });
  });

  // Scenario 3: Jisan Building Database Anomalies
  describe('Extreme Building Metadata', () => {
    it('should handle future building built years', async () => {
      // Set future completion year Built to 2030
      mockBuildings[0].yearBuilt = 2030;

      (getOfficeTransactions as jest.Mock).mockResolvedValue([]);

      const req = new NextRequest('http://localhost/api/technovalley/trend?refresh=true');
      const res = await GET(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      // age is Math.max(0, currentDecimalYear - yearBuilt), so it should become 0 and behave normally
      expect(json.data[16]['금강 IX']).toBeDefined();
    });

    it('should handle invalid built years (NaN)', async () => {
      mockBuildings[0].yearBuilt = 'not-a-number';

      (getOfficeTransactions as jest.Mock).mockResolvedValue([]);

      const req = new NextRequest('http://localhost/api/technovalley/trend?refresh=true');
      const res = await GET(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      console.log('NaN yearBuilt output sample:', json.data[16]['금강 IX']);
    });

    it('should handle zero totalUnits and check for division-by-zero', async () => {
      mockBuildings[0].totalUnits = 0;

      // Provide some transactions to trigger the division by totalUnits
      (getOfficeTransactions as jest.Mock).mockResolvedValue([
        { priceRaw: 38000, sizeSqM: 100, buildingName: '금강펜테리움 IX타워' }
      ]);

      const req = new NextRequest('http://localhost/api/technovalley/trend?refresh=true');
      const res = await GET(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      console.log('Zero totalUnits output sample:', json.data[16]['금강 IX']);
    });

    it('should handle NaN GFA and verify building scale factor doesn\'t fail completely', async () => {
      mockBuildings[0].gfa = NaN;

      (getOfficeTransactions as jest.Mock).mockResolvedValue([
        { priceRaw: 38000, sizeSqM: 100, buildingName: '금강펜테리움 IX타워' }
      ]);

      const req = new NextRequest('http://localhost/api/technovalley/trend?refresh=true');
      const res = await GET(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      console.log('NaN GFA output sample:', json.data[16]['금강 IX']);
    });
  });
});
