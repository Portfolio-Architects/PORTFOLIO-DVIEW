import {
  processMacroTrendData,
  formatXAxisTick,
  formatTooltipPeriodLabel,
  calculateMacroGapAndRatio,
  buildApartmentMacroChartData,
  buildApartmentGranularChartData,
  filterChartTimeframe,
  filterChartTimeframeByGranularity,
  parseMacroTrendSeriesPayload,
  resolveGranularityForTimeframe,
  computeNonOverlappingXTicks,
  extractYearMonth,
} from './macroChartTransform';

describe('macroChartTransform utilities', () => {
  describe('processMacroTrendData', () => {
    it('returns empty array when lineData is null, undefined, or empty', () => {
      expect(processMacroTrendData(null)).toEqual([]);
      expect(processMacroTrendData(undefined)).toEqual([]);
      expect(processMacroTrendData([])).toEqual([]);
    });

    it('transforms zero or null jeonse/sale prices to null', () => {
      const input = [
        {
          name: '24.01',
          '동탄 아파트 전체': 8.5,
          '동탄 아파트 전세 평균': 0,
        },
        {
          name: '24.02',
          '동탄 아파트 전체': 0,
          '동탄 아파트 전세 평균': null,
        },
        {
          name: '24.03',
          '동탄 아파트 전체': 9.1,
          '동탄 아파트 전세 평균': 5.2,
        },
      ];

      const result = processMacroTrendData(input as any);
      expect(result).toHaveLength(3);
      expect(result[0]['동탄 아파트 전세 평균']).toBeNull();
      expect(result[0]['동탄 아파트 전체']).toBe(8.5);
      expect(result[1]['동탄 아파트 전체']).toBeNull();
      expect(result[1]['동탄 아파트 전세 평균']).toBeNull();
      expect(result[2]['동탄 아파트 전체']).toBe(9.1);
      expect(result[2]['동탄 아파트 전세 평균']).toBe(5.2);
    });
  });

  describe('formatXAxisTick', () => {
    it('formats YY.MM and YYYY.MM to YY년 MM월', () => {
      expect(formatXAxisTick('24.05')).toBe('24년 05월');
      expect(formatXAxisTick('26.12')).toBe('26년 12월');
      expect(formatXAxisTick('2024.05')).toBe('24년 05월');
      expect(formatXAxisTick('2026.12')).toBe('26년 12월');
    });

    it('returns original string when not matching YY.MM or YYYY.MM dot format', () => {
      expect(formatXAxisTick('2024')).toBe('2024');
      expect(formatXAxisTick('2024-05')).toBe('2024-05');
      expect(formatXAxisTick('26-12')).toBe('26-12');
      expect(formatXAxisTick('전체')).toBe('전체');
      expect(formatXAxisTick('')).toBe('');
    });
  });

  describe('extractYearMonth', () => {
    it('extracts year and month from delimited strings including single digits', () => {
      expect(extractYearMonth('2024.1')).toEqual({ ymNum: 202401, monthKey: '24.01' });
      expect(extractYearMonth('2024-05')).toEqual({ ymNum: 202405, monthKey: '24.05' });
      expect(extractYearMonth('2024/1/15')).toEqual({ ymNum: 202401, monthKey: '24.01' });
      expect(extractYearMonth('24.1')).toEqual({ ymNum: 202401, monthKey: '24.01' });
      expect(extractYearMonth('24.01')).toEqual({ ymNum: 202401, monthKey: '24.01' });
    });

    it('extracts year and month from pure digit strings and numbers', () => {
      expect(extractYearMonth('202401')).toEqual({ ymNum: 202401, monthKey: '24.01' });
      expect(extractYearMonth('20240115')).toEqual({ ymNum: 202401, monthKey: '24.01' });
      expect(extractYearMonth(202401)).toEqual({ ymNum: 202401, monthKey: '24.01' });
      expect(extractYearMonth(2209)).toEqual({ ymNum: 202209, monthKey: '22.09' });
      expect(extractYearMonth('2401')).toEqual({ ymNum: 202401, monthKey: '24.01' });
    });

    it('returns null for invalid inputs', () => {
      expect(extractYearMonth(null)).toBeNull();
      expect(extractYearMonth(undefined)).toBeNull();
      expect(extractYearMonth('')).toBeNull();
      expect(extractYearMonth('2024')).toBeNull(); // no month
      expect(extractYearMonth('2024.13')).toBeNull(); // invalid month
      expect(extractYearMonth('1850.01')).toBeNull(); // out of range year
    });
  });

  describe('calculateMacroGapAndRatio', () => {
    it('calculates ratio and gap correctly for valid prices', () => {
      const res = calculateMacroGapAndRatio(10, 6);
      expect(res.ratio).toBe(60);
      expect(res.gapPrice).toBe(4);
      expect(res.gapPriceStr).toBe('4.0억');
    });

    it('returns zero ratio and null gap string when prices are invalid or 0', () => {
      const res = calculateMacroGapAndRatio(0, 0);
      expect(res.ratio).toBe(0);
      expect(res.gapPrice).toBe(0);
      expect(res.gapPriceStr).toBeNull();
    });
  });

  describe('buildApartmentMacroChartData', () => {
    const mockMacroTrend = [
      { name: '08.08', '동탄 아파트 전체': 3.2, '동탄 아파트 전세 평균': 0 },
      { name: '20.10', '동탄 아파트 전체': 7.5, '동탄 아파트 전세 평균': 4.0 },
      { name: '20.11', '동탄 아파트 전체': 7.6, '동탄 아파트 전세 평균': 4.1 },
      { name: '20.12', '동탄 아파트 전체': 7.8, '동탄 아파트 전세 평균': 4.2 },
      { name: '21.01', '동탄 아파트 전체': 7.9, '동탄 아파트 전세 평균': 4.2 },
      { name: '21.02', '동탄 아파트 전체': 8.0, '동탄 아파트 전세 평균': 4.3 },
      { name: '21.03', '동탄 아파트 전체': 8.1, '동탄 아파트 전세 평균': 4.3 },
      { name: '21.04', '동탄 아파트 전체': 8.2, '동탄 아파트 전세 평균': 4.4 },
      { name: '26.07', '동탄 아파트 전체': 9.2, '동탄 아파트 전세 평균': 4.5 },
    ];

    it('returns empty array when transactions is null, undefined, or empty', () => {
      expect(buildApartmentMacroChartData(null, mockMacroTrend)).toEqual([]);
      expect(buildApartmentMacroChartData(undefined, mockMacroTrend)).toEqual([]);
      expect(buildApartmentMacroChartData([], mockMacroTrend)).toEqual([]);
    });

    it('R1 & Acceptance Criteria: 2020-built 동탄역 힐스테이트 starts at 2020.12 without pre-construction 2008 backfill', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const realTxs = require('../../../public/tx-data/힐스테이트동탄역.json');
      const result = buildApartmentMacroChartData(realTxs, mockMacroTrend);

      // 1. Must not be empty
      expect(result.length).toBeGreaterThan(0);

      // 2. Starts precisely at 2020.12 (actual first transaction)
      expect(result[0].name).toBe('20.12');

      // 3. Absolute block of pre-construction data (2008 ~ 2020.11)
      expect(result.some((p) => p.name.startsWith('08.'))).toBe(false);
      expect(result.some((p) => p.name === '20.11')).toBe(false);
      expect(result.some((p) => p.name === '20.10')).toBe(false);

      // 4. Series that has not occurred yet remains null (first sale was 2021.02)
      expect(result[0]['동탄 아파트 전체']).toBeNull();
      expect(result[0]['동탄 아파트 전세 평균']).toBeGreaterThan(0);

      // 2021.01 still has no sale
      const pt2101 = result.find((p) => p.name === '21.01');
      expect(pt2101).toBeDefined();
      expect(pt2101!['동탄 아파트 전체']).toBeNull();
      expect(pt2101!['동탄 아파트 전세 평균']).toBeGreaterThan(0);

      // 2021.02 has first sale transaction
      const pt2102 = result.find((p) => p.name === '21.02');
      expect(pt2102).toBeDefined();
      expect(pt2102!['동탄 아파트 전체']).toBeGreaterThan(0);
      expect(pt2102!['동탄 아파트 전세 평균']).toBeGreaterThan(0);

      // 5. R2: Timeframe 'ALL' starts at 2020.12 and formatXAxisTick renders 20년 12월
      const allFiltered = filterChartTimeframe(result, 'ALL');
      expect(allFiltered[0].name).toBe('20.12');
      expect(formatXAxisTick(allFiltered[0].name)).toBe('20년 12월');
    });

    it('R3: smoothly forward-fills missing transaction months after the first transaction', () => {
      const sparseTransactions = [
        { contractYm: '202301', dealType: '매매', price: 90000 },
        { contractYm: '202301', dealType: '전세', deposit: 50000 },
        // 202302 and 202303 have no transactions
        { contractYm: '202304', dealType: '매매', price: 95000 },
        // 202304 has no rent
      ];

      const result = buildApartmentMacroChartData(sparseTransactions, [
        { name: '23.01', '동탄 아파트 전체': 8.0, '동탄 아파트 전세 평균': 4.0 },
        { name: '23.02', '동탄 아파트 전체': 8.1, '동탄 아파트 전세 평균': 4.1 },
        { name: '23.03', '동탄 아파트 전체': 8.2, '동탄 아파트 전세 평균': 4.2 },
        { name: '23.04', '동탄 아파트 전체': 8.3, '동탄 아파트 전세 평균': 4.3 },
      ]);

      expect(result).toHaveLength(4);
      // 23.01: original prices
      expect(result[0]).toEqual({
        name: '23.01',
        '동탄 아파트 전체': 9,
        '동탄 아파트 전세 평균': 5,
      });
      // 23.02: forward-filled from 23.01
      expect(result[1]).toEqual({
        name: '23.02',
        '동탄 아파트 전체': 9,
        '동탄 아파트 전세 평균': 5,
      });
      // 23.03: forward-filled from 23.01
      expect(result[2]).toEqual({
        name: '23.03',
        '동탄 아파트 전체': 9,
        '동탄 아파트 전세 평균': 5,
      });
      // 23.04: new sale price 9.5, rent still forward-filled at 5
      expect(result[3]).toEqual({
        name: '23.04',
        '동탄 아파트 전체': 9.5,
        '동탄 아파트 전세 평균': 5,
      });
    });

    it('handles complexes with only sale transactions (rent is null throughout)', () => {
      const saleOnly = [
        { contractYm: '202401', dealType: '매매', price: 80000 },
        { contractYm: '202403', dealType: '매매', price: 82000 },
      ];

      const result = buildApartmentMacroChartData(saleOnly, [
        { name: '24.01', '동탄 아파트 전체': 8.0, '동탄 아파트 전세 평균': 4.0 },
        { name: '24.02', '동탄 아파트 전체': 8.0, '동탄 아파트 전세 평균': 4.0 },
        { name: '24.03', '동탄 아파트 전체': 8.0, '동탄 아파트 전세 평균': 4.0 },
      ]);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ name: '24.01', '동탄 아파트 전체': 8, '동탄 아파트 전세 평균': null });
      expect(result[1]).toEqual({ name: '24.02', '동탄 아파트 전체': 8, '동탄 아파트 전세 평균': null });
      expect(result[2]).toEqual({ name: '24.03', '동탄 아파트 전체': 8.2, '동탄 아파트 전세 평균': null });
    });

    it('handles complexes with only rent transactions (sale is null throughout)', () => {
      const rentOnly = [
        { contractYm: '202402', dealType: '전세', deposit: 45000 },
      ];

      const result = buildApartmentMacroChartData(rentOnly, [
        { name: '24.02', '동탄 아파트 전체': 8.0, '동탄 아파트 전세 평균': 4.0 },
        { name: '24.03', '동탄 아파트 전체': 8.0, '동탄 아파트 전세 평균': 4.0 },
      ]);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ name: '24.02', '동탄 아파트 전체': null, '동탄 아파트 전세 평균': 4.5 });
      expect(result[1]).toEqual({ name: '24.03', '동탄 아파트 전체': null, '동탄 아파트 전세 평균': 4.5 });
    });

    it('ignores cancelled transactions with various date formats (dots, hyphens, strings)', () => {
      const txsWithCancel = [
        // Cancelled with dots: '20.10.15' -> should be ignored, NOT set minContractYm to 2020.10
        { contractYm: '202010', dealType: '매매', price: 50000, cancelDate: '20.10.15' },
        // Cancelled with dots: '26.04.08'
        { contractYm: '202301', dealType: '매매', price: 50000, cancelDate: '26.04.08' },
        // Cancelled with hyphens: '2023-02-10'
        { contractYm: '202302', dealType: '매매', price: 50000, cancelDate: '2023-02-10' },
        // Valid transactions (empty string or hyphen)
        { contractYm: '202305', dealType: '매매', price: 60000, cancelDate: '' },
        { contractYm: '202306', dealType: '매매', price: 65000, cancelDate: '-' },
        { contractYm: '202307', dealType: '매매', price: 70000, cancelDate: ' ' },
      ];

      const result = buildApartmentMacroChartData(txsWithCancel, [
        { name: '23.05', '동탄 아파트 전체': 8.0, '동탄 아파트 전세 평균': 4.0 },
      ]);

      // Earliest valid transaction is 202305, NOT 202010 or 202301 or 202302
      expect(result[0].name).toBe('23.05');
      expect(result[0]['동탄 아파트 전체']).toBe(6);
      expect(result.some((p) => p.name === '20.10')).toBe(false);
      expect(result.some((p) => p.name === '23.01')).toBe(false);
      expect(result.some((p) => p.name === '23.02')).toBe(false);
    });

    it('excludes real cancelled transaction (26.04.08) from 힐스테이트동탄역 2026.03 monthly average', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const realTxs = require('../../../public/tx-data/힐스테이트동탄역.json');
      const result = buildApartmentMacroChartData(realTxs);

      const pt2603 = result.find((p) => p.name === '26.03');
      expect(pt2603).toBeDefined();

      // In 202603, valid sales are: [51800, 51500, 49600, 55500, 50000, 55000, 52500, 51800] -> sum 417700 / 8 = 52212.5 -> 5.22억
      // If cancelled tx (53200, cancelDate: '26.04.08') was included, average would be 5.23억
      expect(pt2603!['동탄 아파트 전체']).toBe(5.22);
    });

    it('handles various contractYm formats: numbers, strings with dots/hyphens, 4-digit formats', () => {
      const variedFormats = [
        { contractYm: 202205, dealType: '매매', price: 70000 }, // number
        { contractYm: '2022.06', dealType: '매매', price: 72000 }, // dot string
        { contractYm: '2022-07', dealType: '매매', price: 74000 }, // hyphen string
        { contractYm: '22.08', dealType: '매매', price: 76000 }, // 4-digit dot string
        { contractYm: 2209, dealType: '매매', price: 78000 }, // 4-digit number
      ];

      const result = buildApartmentMacroChartData(variedFormats);
      expect(result).toHaveLength(5);
      expect(result[0].name).toBe('22.05');
      expect(result[0]['동탄 아파트 전체']).toBe(7);
      expect(result[1].name).toBe('22.06');
      expect(result[1]['동탄 아파트 전체']).toBe(7.2);
      expect(result[2].name).toBe('22.07');
      expect(result[2]['동탄 아파트 전체']).toBe(7.4);
      expect(result[3].name).toBe('22.08');
      expect(result[3]['동탄 아파트 전체']).toBe(7.6);
      expect(result[4].name).toBe('22.09');
      expect(result[4]['동탄 아파트 전체']).toBe(7.8);
    });

    it('handles prices with commas and Won vs Man-Won units accurately', () => {
      const variedPrices = [
        // Comma-separated string in Man-won
        { contractYm: '202301', dealType: '매매', price: '85,000' },
        // Raw value in Won (850,000,000 KRW = 8.5억)
        { contractYm: '202302', dealType: '매매', price: 850000000 },
        // Rent with comma string
        { contractYm: '202301', dealType: '전세', deposit: '45,000' },
      ];

      const result = buildApartmentMacroChartData(variedPrices);
      expect(result[0]['동탄 아파트 전체']).toBe(8.5);
      expect(result[0]['동탄 아파트 전세 평균']).toBe(4.5);
      expect(result[1]['동탄 아파트 전체']).toBe(8.5);
    });

    it('handles massive 5-year gap between transactions without gaps or NaNs', () => {
      const massiveGap = [
        { contractYm: '202101', dealType: '매매', price: 90000 },
        { contractYm: '202601', dealType: '매매', price: 110000 },
      ];

      const result = buildApartmentMacroChartData(massiveGap);
      // 2021.01 to 2026.01 = 5 years * 12 months + 1 = 61 months
      expect(result).toHaveLength(61);
      expect(result[0].name).toBe('21.01');
      expect(result[0]['동탄 아파트 전체']).toBe(9);

      // Month 30 (midway) is smoothly forward-filled
      expect(result[30]['동탄 아파트 전체']).toBe(9);

      // Last month updates to 11
      expect(result[60].name).toBe('26.01');
      expect(result[60]['동탄 아파트 전체']).toBe(11);
      expect(result.every((p) => p['동탄 아파트 전체'] !== null)).toBe(true);
    });

    it('returns empty array when all transactions are cancelled or invalid', () => {
      const allCancelled = [
        { contractYm: '202201', dealType: '매매', price: 50000, cancelDate: '20220115' },
        { contractYm: '202202', dealType: '매매', price: 50000, cancelDate: '22.03.01' },
      ];
      expect(buildApartmentMacroChartData(allCancelled)).toEqual([]);
    });

    it('converts monthly rent to jeonse deposit equivalent accurately', () => {
      const monthlyRentTx = [
        { contractYm: '202405', dealType: '월세', deposit: 10000, monthlyRent: 50 },
      ];
      const result = buildApartmentMacroChartData(monthlyRentTx);
      expect(result).toHaveLength(1);
      // deposit equivalent: (10000 + Math.round(50 * 12 / 0.055)) / 10000 = 2.09
      expect(result[0]['동탄 아파트 전세 평균']).toBeCloseTo(2.09, 2);
    });

    it('adversarial: forward-fills single lifetime transaction across all months up to latest macro trend month', () => {
      const singleTx = [
        { contractYm: '202401', dealType: '매매', price: 85000 },
      ];
      const macroTrend = [
        { name: '24.01', '동탄 아파트 전체': 8.0 },
        { name: '24.02', '동탄 아파트 전체': 8.1 },
        { name: '24.03', '동탄 아파트 전체': 8.2 },
        { name: '24.04', '동탄 아파트 전체': 8.3 },
      ];
      const result = buildApartmentMacroChartData(singleTx, macroTrend);
      expect(result).toHaveLength(4);
      expect(result[0]).toEqual({ name: '24.01', '동탄 아파트 전체': 8.5, '동탄 아파트 전세 평균': null });
      expect(result[1]).toEqual({ name: '24.02', '동탄 아파트 전체': 8.5, '동탄 아파트 전세 평균': null });
      expect(result[2]).toEqual({ name: '24.03', '동탄 아파트 전체': 8.5, '동탄 아파트 전세 평균': null });
      expect(result[3]).toEqual({ name: '24.04', '동탄 아파트 전체': 8.5, '동탄 아파트 전세 평균': null });
    });

    it('adversarial: parses Korean 억 price strings correctly', () => {
      const koreanPriceTxs = [
        { contractYm: '202401', dealType: '매매', price: '8.5억' },
        { contractYm: '202402', dealType: '매매', price: '8억 5,000' },
        { contractYm: '202403', dealType: '전세', deposit: '4억 2000만원' },
      ];
      const result = buildApartmentMacroChartData(koreanPriceTxs);
      expect(result).toHaveLength(3);
      expect(result[0]['동탄 아파트 전체']).toBe(8.5);
      expect(result[1]['동탄 아파트 전체']).toBe(8.5);
      expect(result[2]['동탄 아파트 전세 평균']).toBe(4.2);
    });

    it('adversarial: ignores explicit Korean and boolean cancellation markers (취소, 해제, Y, true)', () => {
      const txs = [
        { contractYm: '202301', dealType: '매매', price: 50000, cancelDate: '취소' },
        { contractYm: '202302', dealType: '매매', price: 50000, cancelDate: '해제' },
        { contractYm: '202303', dealType: '매매', price: 50000, cancelDate: 'Y' },
        { contractYm: '202304', dealType: '매매', price: 50000, cancelDate: 'true' },
        { contractYm: '202305', dealType: '매매', price: 70000, cancelDate: '' },
      ];
      const result = buildApartmentMacroChartData(txs);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('23.05');
      expect(result[0]['동탄 아파트 전체']).toBe(7);
    });

    it('adversarial: strictly sorts and builds chronological timeline even with completely shuffled input records', () => {
      const shuffledTxs = [
        { contractYm: '202506', dealType: '매매', price: 95000 },
        { contractYm: '202301', dealType: '매매', price: 80000 },
        { contractYm: '202403', dealType: '전세', deposit: 45000 },
        { contractYm: '202301', dealType: '전세', deposit: 40000 },
        { contractYm: '202401', dealType: '매매', price: 85000 },
      ];
      const result = buildApartmentMacroChartData(shuffledTxs);
      expect(result[0].name).toBe('23.01');
      expect(result[result.length - 1].name).toBe('25.06');
      // Ensure strictly increasing chronological names
      for (let i = 1; i < result.length; i++) {
        const prev = result[i - 1].name.split('.').map(Number);
        const curr = result[i].name.split('.').map(Number);
        const prevNum = prev[0] * 12 + prev[1];
        const currNum = curr[0] * 12 + curr[1];
        expect(currNum).toBe(prevNum + 1);
      }
    });

    it('adversarial: parses YYYY.MM format in macroTrendList properly', () => {
      const txs = [
        { contractYm: '202501', dealType: '매매', price: 80000 },
      ];
      const macroTrend4Digit = [
        { name: '2025.01', '동탄 아파트 전체': 7.5 },
        { name: '2025.03', '동탄 아파트 전체': 7.6 },
      ];
      const result = buildApartmentMacroChartData(txs, macroTrend4Digit);
      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('25.01');
      expect(result[2].name).toBe('25.03');
    });

    it('adversarial: parses single-digit month formats (YYYY.M, YYYY-M, YY.M) without dropping', () => {
      const txs = [
        { contractYm: '2024.1', dealType: '매매', price: 80000 },
        { contractYm: '2024-5', dealType: '매매', price: 82000 },
        { contractYm: '24.9', dealType: '매매', price: 84000 },
      ];
      const result = buildApartmentMacroChartData(txs);
      expect(result[0].name).toBe('24.01');
      expect(result[0]['동탄 아파트 전체']).toBe(8);
      const pt05 = result.find((p) => p.name === '24.05');
      expect(pt05).toBeDefined();
      expect(pt05!['동탄 아파트 전체']).toBe(8.2);
      expect(result[result.length - 1].name).toBe('24.09');
      expect(result[result.length - 1]['동탄 아파트 전체']).toBe(8.4);
    });

    it('adversarial: falls back to contractDate and date when contractYm is null or omitted', () => {
      const txs = [
        { contractDate: '20240315', dealType: '매매', price: 90000 },
        { date: '2024.05.10', dealType: '매매', price: 92000 },
      ];
      const result = buildApartmentMacroChartData(txs);
      expect(result[0].name).toBe('24.03');
      expect(result[0]['동탄 아파트 전체']).toBe(9);
      expect(result[result.length - 1].name).toBe('24.05');
      expect(result[result.length - 1]['동탄 아파트 전체']).toBe(9.2);
    });

    it('adversarial: recognizes rental transactions with whitespace, 임대, 전월세, or implicit rent', () => {
      const txs = [
        { contractYm: '202401', dealType: '전세 ', deposit: 40000 },
        { contractYm: '202402', dealType: '임대', deposit: 42000 },
        { contractYm: '202403', dealType: '전월세', deposit: 44000 },
        { contractYm: '202404', dealType: '', deposit: 46000, price: 0 },
      ];
      const result = buildApartmentMacroChartData(txs);
      expect(result).toHaveLength(4);
      expect(result[0]['동탄 아파트 전세 평균']).toBe(4);
      expect(result[1]['동탄 아파트 전세 평균']).toBe(4.2);
      expect(result[2]['동탄 아파트 전세 평균']).toBe(4.4);
      expect(result[3]['동탄 아파트 전세 평균']).toBe(4.6);
      expect(result.every((p) => p['동탄 아파트 전체'] === null)).toBe(true);
    });

    it('adversarial: handles hyphenated date format in macroTrendList (e.g. 2026-06)', () => {
      const txs = [
        { contractYm: '202601', dealType: '매매', price: 90000 },
      ];
      const macroTrendHyphen = [
        { name: '2026-06', '동탄 아파트 전체': 8.0 },
      ];
      const result = buildApartmentMacroChartData(txs, macroTrendHyphen);
      expect(result).toHaveLength(6);
      expect(result[0].name).toBe('26.01');
      expect(result[5].name).toBe('26.06');
    });
  });

  describe('filterChartTimeframe', () => {
    const mockData = Array.from({ length: 48 }, (_, i) => ({
      name: `point-${i}`,
      val: i,
    }));

    it('returns empty array when data is null, undefined, or empty', () => {
      expect(filterChartTimeframe(null, 'ALL')).toEqual([]);
      expect(filterChartTimeframe(undefined, '1Y')).toEqual([]);
      expect(filterChartTimeframe([], '3M')).toEqual([]);
    });

    it('returns all data when timeframe is ALL', () => {
      const result = filterChartTimeframe(mockData, 'ALL');
      expect(result).toHaveLength(48);
      expect(result[0].name).toBe('point-0');
      expect(result[47].name).toBe('point-47');
    });

    it('slices correct number of elements for 3M, 6M, 1Y, 3Y, 5Y', () => {
      expect(filterChartTimeframe(mockData, '3M')).toHaveLength(3);
      expect(filterChartTimeframe(mockData, '6M')).toHaveLength(6);
      expect(filterChartTimeframe(mockData, '1Y')).toHaveLength(12);
      expect(filterChartTimeframe(mockData, '3Y')).toHaveLength(36);
      // 5Y requested 60, but only 48 exist: returns all 48 without padding pre-construction fake points
      expect(filterChartTimeframe(mockData, '5Y')).toHaveLength(48);
    });

    it('preserves recent slice order', () => {
      const threeM = filterChartTimeframe(mockData, '3M');
      expect(threeM.map((d) => d.name)).toEqual(['point-45', 'point-46', 'point-47']);
    });
  });

  describe('Granular Dongtan Macro Trend Helpers (daily / weekly / monthly + tx counts)', () => {
    it('formats daily, weekly (including year boundary), and monthly tooltip labels accurately', () => {
      expect(formatTooltipPeriodLabel('26.11', 'monthly')).toBe('26년 11월');
      expect(formatTooltipPeriodLabel('26.11.18', 'daily')).toBe('26년 11월 18일 (수)');
      expect(formatTooltipPeriodLabel('26.11.09', 'weekly')).toBe('26.11.09 ~ 11.15 (주간)');
      expect(formatTooltipPeriodLabel('25.12.29', 'weekly')).toBe('25.12.29 ~ 26.01.04 (주간)');
      expect(formatXAxisTick('26.11.18', 'daily')).toBe('26.11.18');
    });

    it('parses compact macro-trend-series payload with saleCount and rentCount', () => {
      const parsed = parseMacroTrendSeriesPayload({
        version: 1,
        generatedAt: '2026-11-21T00:00:00.000Z',
        latestContractDate: '20261118',
        fields: ['name', 'sale', 'rent', 'saleCount', 'rentCount'],
        daily: [['26.11.18', 8.59, 4.83, 15, 22]],
        weekly: [['26.11.09', 9.19, 4.94, 93, 107]],
        monthly: [['26.11', 9.02, 4.83, 230, 248]],
      });

      expect(parsed).not.toBeNull();
      expect(parsed!.daily).toEqual([
        { name: '26.11.18', '동탄 아파트 전체': 8.59, '동탄 아파트 전세 평균': 4.83, saleCount: 15, rentCount: 22 },
      ]);
      expect(parsed!.weekly[0].saleCount).toBe(93);
      expect(parsed!.monthly[0].rentCount).toBe(248);
    });

    it('filters daily and weekly points by exact calendar window relative to latest date', () => {
      const dailyPoints = [
        { name: '25.01.10' },
        { name: '26.06.01' },
        { name: '26.09.01' },
        { name: '26.11.18' },
      ];
      expect(filterChartTimeframeByGranularity(dailyPoints, '3M', 'daily').map((d) => d.name)).toEqual([
        '26.09.01',
        '26.11.18',
      ]);
      expect(filterChartTimeframeByGranularity(dailyPoints, '6M', 'daily').map((d) => d.name)).toEqual([
        '26.06.01',
        '26.09.01',
        '26.11.18',
      ]);
      expect(filterChartTimeframeByGranularity(dailyPoints, 'ALL', 'daily')).toHaveLength(4);
    });

    it('builds individual apartment granular daily/weekly/monthly series with true transaction counts (never faking zero-tx months)', () => {
      const txs = [
        { contractYm: '202609', contractDay: '02', dealType: '매매', price: 150000 },
        { contractYm: '202609', contractDay: '02', dealType: '매매', price: 160000 },
        { contractYm: '202609', contractDay: '04', dealType: '전세', deposit: 70000 },
        { contractYm: '202611', contractDay: '10', dealType: '매매', price: 170000 },
        { contractYm: '202611', contractDay: '11', dealType: '매매', price: 999999, cancelDate: '20261112' },
      ];

      const daily = buildApartmentGranularChartData(txs, 'daily');
      expect(daily.map((d) => d.name)).toEqual(['26.09.02', '26.09.04', '26.11.10']);
      expect(daily[0]['동탄 아파트 전체']).toBe(15.5);
      expect(daily[0].saleCount).toBe(2);
      expect(daily[1].rentCount).toBe(1);
      expect(daily[2].saleCount).toBe(1);

      const weekly = buildApartmentGranularChartData(txs, 'weekly');
      // 2026-09-02 (Wed) & 2026-09-04 (Fri) share week Monday 2026-08-31
      expect(weekly.map((w) => w.name)).toEqual(['26.08.31', '26.11.09']);
      expect(weekly[0].saleCount).toBe(2);
      expect(weekly[0].rentCount).toBe(1);

      const monthly = buildApartmentGranularChartData(txs, 'monthly');
      expect(monthly.map((m) => m.name)).toEqual(['26.09', '26.10', '26.11']);
      expect(monthly[0].saleCount).toBe(2);
      expect(monthly[1].saleCount).toBe(0); // forward-filled price, but TRUE 0 count
      expect(monthly[1]['동탄 아파트 전체']).toBe(15.5);
      expect(monthly[2].saleCount).toBe(1);
    });

    it('resolves weekly granularity up to 1Y (3M/6M/1Y) and monthly from 3Y onward (3Y/5Y/ALL)', () => {
      expect(resolveGranularityForTimeframe('3M')).toBe('weekly');
      expect(resolveGranularityForTimeframe('6M')).toBe('weekly');
      expect(resolveGranularityForTimeframe('1Y')).toBe('weekly');
      expect(resolveGranularityForTimeframe('3Y')).toBe('monthly');
      expect(resolveGranularityForTimeframe('5Y')).toBe('monthly');
      expect(resolveGranularityForTimeframe('ALL')).toBe('monthly');
    });

    it('computes non-overlapping X ticks preserving endpoints cleanly', () => {
      const pts = Array.from({ length: 30 }, (_, i) => ({ name: `d-${i}` }));
      const ticks = computeNonOverlappingXTicks(pts, 6);
      expect(ticks[0]).toBe('d-0');
      expect(ticks[ticks.length - 1]).toBe('d-29');
      expect(ticks.length).toBeLessThanOrEqual(7);
    });
  });
});
