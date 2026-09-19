/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * 🧪 Pipeline Challenger 2 Empirical Adversarial Test Suite
 * 
 * Target: Two-Sided IQR Outliers, Rent Key Duplication, and API Resilience
 * Roles: critic, specialist (EMPIRICAL CHALLENGER)
 */

// Import CommonJS pipeline modules
const {
  filterOutliersRolling,
  applyIqrOutlierDetection,
  isCancelledTransaction,
  isDirectDeal
} = require('../../scripts/pipeline/outlierFilters');

describe('Pipeline Challenger 2 — Empirical Adversarial Stress Suite', () => {

  // ==========================================================================
  // 1. Two-Sided IQR Outlier Testing
  // ==========================================================================
  describe('1. Two-Sided IQR Outlier Testing', () => {

    it('should accurately detect severe low-end dumps (5,000만원) when median is 10억', () => {
      // 10억 (100,000만원) 전후의 10개 정상 거래 분포
      const normalPrices = [98000, 99000, 99500, 100000, 100500, 101000, 101500, 102000, 102500, 103000];
      const dumpPrice = 5000; // 5,000만원 (가족간 저가 특수거래 의심 덤핑)

      const records = [
        ...normalPrices.map((price, idx) => ({
          contractYm: '202605',
          contractDay: String(idx + 1).padStart(2, '0'),
          price,
          area: 84.82,
          dealType: '매매'
        })),
        {
          contractYm: '202605',
          contractDay: '25',
          price: dumpPrice,
          area: 84.82,
          dealType: '매매'
        }
      ];

      const processed = applyIqrOutlierDetection(records);

      const dumpTx = processed.find((r: any) => r.price === 5000);
      expect(dumpTx).toBeDefined();
      expect(dumpTx.isOutlier).toBe(true);

      // 정상 범위의 모든 거래는 outlier가 아니어야 함
      const normalTxs = processed.filter((r: any) => r.price !== 5000);
      expect(normalTxs.every((r: any) => r.isOutlier === false)).toBe(true);
    });

    it('should accurately detect extreme high-end spikes (50억) when median is 10억', () => {
      // 10억 (100,000만원) 전후의 정상 거래 분포
      const normalPrices = [97000, 98500, 99000, 100000, 101000, 101500, 102000, 103000];
      const spikePrice = 500000; // 50억 (허위신고, 평형 오입력 등 비정상 폭등)

      const records = [
        ...normalPrices.map((price, idx) => ({
          contractYm: '202606',
          contractDay: String(idx + 1).padStart(2, '0'),
          price,
          area: 84.82,
          dealType: '매매'
        })),
        {
          contractYm: '202606',
          contractDay: '28',
          price: spikePrice,
          area: 84.82,
          dealType: '매매'
        }
      ];

      const processed = applyIqrOutlierDetection(records);

      const spikeTx = processed.find((r: any) => r.price === 500000);
      expect(spikeTx).toBeDefined();
      expect(spikeTx.isOutlier).toBe(true);

      // 정상 거래들은 outlier가 아니어야 함
      const normalTxs = processed.filter((r: any) => r.price !== 500000);
      expect(normalTxs.every((r: any) => r.isOutlier === false)).toBe(true);
    });

    it('should simultaneously catch both low-end dumps and high-end spikes in a bi-directional anomalous dataset', () => {
      const records = [
        { contractYm: '202607', contractDay: '01', price: 95000, area: 84.9, dealType: '매매' },
        { contractYm: '202607', contractDay: '03', price: 98000, area: 84.9, dealType: '매매' },
        { contractYm: '202607', contractDay: '05', price: 100000, area: 84.9, dealType: '매매' },
        { contractYm: '202607', contractDay: '08', price: 102000, area: 84.9, dealType: '매매' },
        { contractYm: '202607', contractDay: '10', price: 105000, area: 84.9, dealType: '매매' },
        { contractYm: '202607', contractDay: '12', price: 4000, area: 84.9, dealType: '매매' },   // 하한 이상치 (4,000만)
        { contractYm: '202607', contractDay: '15', price: 480000, area: 84.9, dealType: '매매' }, // 상한 이상치 (48억)
      ];

      const processed = applyIqrOutlierDetection(records);
      const low = processed.find((r: any) => r.price === 4000);
      const high = processed.find((r: any) => r.price === 480000);
      const med = processed.find((r: any) => r.price === 100000);

      expect(low.isOutlier).toBe(true);
      expect(high.isOutlier).toBe(true);
      expect(med.isOutlier).toBe(false);
    });

    it('should NOT flag outliers when distribution count is less than 4 (N = 1, 2, 3 edge cases)', () => {
      // N = 1
      const recN1 = [{ contractYm: '202608', contractDay: '01', price: 5000, area: 84.9, dealType: '매매' }];
      const resN1 = applyIqrOutlierDetection(recN1);
      expect(resN1[0].isOutlier).toBe(false);

      // N = 2: 10억 vs 5,000만원
      const recN2 = [
        { contractYm: '202608', contractDay: '01', price: 100000, area: 84.9, dealType: '매매' },
        { contractYm: '202608', contractDay: '02', price: 5000, area: 84.9, dealType: '매매' }
      ];
      const resN2 = applyIqrOutlierDetection(recN2);
      expect(resN2.every((r: any) => r.isOutlier === false)).toBe(true);

      // N = 3: 10억, 10.1억 vs 50억
      const recN3 = [
        { contractYm: '202608', contractDay: '01', price: 100000, area: 84.9, dealType: '매매' },
        { contractYm: '202608', contractDay: '02', price: 101000, area: 84.9, dealType: '매매' },
        { contractYm: '202608', contractDay: '03', price: 500000, area: 84.9, dealType: '매매' }
      ];
      const resN3 = applyIqrOutlierDetection(recN3);
      expect(resN3.every((r: any) => r.isOutlier === false)).toBe(true);
    });

    it('should NOT flag outliers when IQR is zero (all identical prices)', () => {
      // 10건 모두 정확히 동일한 가격 (IQR = 0)
      const identicalPrices = [100000, 100000, 100000, 100000, 100000, 100000, 100000, 100000];
      const records = identicalPrices.map((price, idx) => ({
        contractYm: '202609',
        contractDay: String(idx + 1).padStart(2, '0'),
        price,
        area: 84.82,
        dealType: '매매'
      }));

      const processed = applyIqrOutlierDetection(records);
      expect(processed.length).toBe(8);
      // IQR = 0 이므로 bounds.iqr > 0 조건을 만족하지 않아 이상치 플래그가 발생하지 않아야 함
      expect(processed.every((r: any) => r.isOutlier === false)).toBe(true);
    });

    it('should segregate areas and deal types so they do not pollute each others IQR bounds', () => {
      const records = [
        // 84m² 매매 (10억대)
        { contractYm: '202609', contractDay: '01', price: 100000, area: 84.82, dealType: '매매' },
        { contractYm: '202609', contractDay: '02', price: 101000, area: 84.82, dealType: '매매' },
        { contractYm: '202609', contractDay: '03', price: 99000, area: 84.82, dealType: '매매' },
        { contractYm: '202609', contractDay: '04', price: 100500, area: 84.82, dealType: '매매' },
        // 59m² 매매 (6억대 - 84m²와 섞이면 59m²가 하한 이상치로 오판될 위험)
        { contractYm: '202609', contractDay: '01', price: 60000, area: 59.9, dealType: '매매' },
        { contractYm: '202609', contractDay: '02', price: 61000, area: 59.9, dealType: '매매' },
        { contractYm: '202609', contractDay: '03', price: 59500, area: 59.9, dealType: '매매' },
        { contractYm: '202609', contractDay: '04', price: 60500, area: 59.9, dealType: '매매' },
        // 84m² 전세 (5억대 - 매매와 섞이면 전세가 하한 이상치로 오판될 위험)
        { contractYm: '202609', contractDay: '01', deposit: 50000, monthlyRent: 0, area: 84.82, dealType: '전세' },
        { contractYm: '202609', contractDay: '02', deposit: 51000, monthlyRent: 0, area: 84.82, dealType: '전세' },
        { contractYm: '202609', contractDay: '03', deposit: 49000, monthlyRent: 0, area: 84.82, dealType: '전세' },
        { contractYm: '202609', contractDay: '04', deposit: 50500, monthlyRent: 0, area: 84.82, dealType: '전세' },
      ];

      const processed = applyIqrOutlierDetection(records);
      // 그룹별(85_sale, 60_sale, 85_rent)로 각각 계산되므로 아무것도 이상치로 분류되지 않아야 함!
      expect(processed.every((r: any) => r.isOutlier === false)).toBe(true);
    });

    it('should exclude direct deals (dealType === "직거래" / dealingGbn === "직거래") from rolling window mean/std calculations', () => {
      // 10건의 84m² 정상 매매 (10억 근방)
      const marketTxs = [
        { contractYm: '202605', contractDay: '01', price: 100000, area: 84.82, dealType: '매매' },
        { contractYm: '202605', contractDay: '02', price: 100500, area: 84.82, dealType: '매매' },
        { contractYm: '202605', contractDay: '03', price: 99500, area: 84.82, dealType: '매매' },
        { contractYm: '202605', contractDay: '04', price: 101000, area: 84.82, dealType: '매매' },
        { contractYm: '202605', contractDay: '05', price: 100000, area: 84.82, dealType: '매매' },
        { contractYm: '202605', contractDay: '06', price: 99800, area: 84.82, dealType: '매매' },
        { contractYm: '202605', contractDay: '07', price: 100200, area: 84.82, dealType: '매매' },
        { contractYm: '202605', contractDay: '08', price: 100800, area: 84.82, dealType: '매매' },
        { contractYm: '202605', contractDay: '09', price: 99200, area: 84.82, dealType: '매매' },
        { contractYm: '202605', contractDay: '10', price: 100000, area: 84.82, dealType: '매매' },
      ];

      // 2건의 직거래 (5,000만원 및 6,000만원 저가 직거래)
      const directDeals = [
        { contractYm: '202605', contractDay: '05', price: 5000, area: 84.82, dealType: '직거래' },
        { contractYm: '202605', contractDay: '06', price: 6000, area: 84.82, dealType: '매매', dealingGbn: '직거래' },
      ];

      const allTxs = [...marketTxs, ...directDeals];

      // filterOutliersRolling 실행
      const filtered = filterOutliersRolling(allTxs);

      // 1. 반환된 목록에는 직거래 2건이 배제되어 10건이어야 함
      expect(filtered.length).toBe(10);
      expect(filtered.some((t: any) => t.price === 5000 || t.price === 6000)).toBe(false);

      // 2. 만약 직거래가 롤링 윈도우 계산(mean, std)에 포함되었다면 국소 평균이 ~8.4억으로 급락하여
      // 10억대 정상 거래들이 상한 이상치(mean + 3*std)로 오판될 수 있었음.
      // 직거래가 사전 제외되었으므로 모든 정상 거래 10건이 보존되어야 함.
      expect(filtered.every((t: any) => t.price >= 99000)).toBe(true);

      // 원본 레코드의 isDirectDeal 플래그 부여 확인
      expect(directDeals[0].isDirectDeal).toBe(true);
      expect(directDeals[1].isDirectDeal).toBe(true);
    });

    it('should return empty array safely when all transactions are cancelled or direct deals', () => {
      const invalidTxs = [
        { contractYm: '202605', contractDay: '01', price: 100000, area: 84.82, dealType: '직거래' },
        { contractYm: '202605', contractDay: '02', price: 100000, area: 84.82, dealType: '매매', isCanceled: true },
        { contractYm: '202605', contractDay: '03', price: 100000, area: 84.82, dealType: '매매', cancelDate: '20260505' },
        { contractYm: '202605', contractDay: '04', price: 100000, area: 84.82, dealType: '매매', cdealDay: '20260505' },
        { contractYm: '202605', contractDay: '05', price: 100000, area: 84.82, dealType: '매매', cdealType: 'O' }
      ];

      const result = filterOutliersRolling(invalidTxs);
      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // 2. Rent Key Duplication Testing
  // ==========================================================================
  describe('2. Rent Key Duplication Testing', () => {

    // fetch-rent.js:231-244 의 키 생성 알고리즘
    const generateRentKeyMap = (items: any[]) => {
      const keyOccurrences = new Map<string, number>();
      return items.map(item => {
        const baseKey = `RENT_${item.aptName}_${item.ym}_${item.contractDay}_${item.area}_${item.deposit}_${item.monthlyRent}_${item.floor}`;
        const occurrence = (keyOccurrences.get(baseKey) || 0) + 1;
        keyOccurrences.set(baseKey, occurrence);
        const _key = occurrence === 1 ? baseKey : `${baseKey}_${occurrence}`;
        return { ...item, _key, occurrence };
      });
    };

    it('should disambiguate simultaneous identical rental contracts (same day, area, deposit, rent, floor)', () => {
      // 동일 단지, 동일 계약월, 동일 계약일, 동일 전용면적, 동일 보증금, 동일 월세, 동일 층의 5건 동시 체결 계약
      const simultaneousContracts = Array.from({ length: 5 }, () => ({
        aptName: '동탄역롯데캐슬',
        ym: '202605',
        contractDay: '20',
        area: 84.82,
        deposit: 60000,
        monthlyRent: 0,
        floor: 15
      }));

      const keyed = generateRentKeyMap(simultaneousContracts);

      expect(keyed.length).toBe(5);

      // baseKey
      const expectedBaseKey = 'RENT_동탄역롯데캐슬_202605_20_84.82_60000_0_15';

      // 1번째 건은 occurrence 접미사 없음
      expect(keyed[0]._key).toBe(expectedBaseKey);
      expect(keyed[0].occurrence).toBe(1);

      // 2~5번째 건은 _2, _3, _4, _5 접미사 부착
      expect(keyed[1]._key).toBe(`${expectedBaseKey}_2`);
      expect(keyed[1].occurrence).toBe(2);

      expect(keyed[2]._key).toBe(`${expectedBaseKey}_3`);
      expect(keyed[2].occurrence).toBe(3);

      expect(keyed[3]._key).toBe(`${expectedBaseKey}_4`);
      expect(keyed[3].occurrence).toBe(4);

      expect(keyed[4]._key).toBe(`${expectedBaseKey}_5`);
      expect(keyed[4].occurrence).toBe(5);

      // 5개 키 모두 중복 없이 고유(Unique)해야 함
      const uniqueKeys = new Set(keyed.map(k => k._key));
      expect(uniqueKeys.size).toBe(5);
    });

    it('should scale occurrence indices monotonically up to N = 20 without collision', () => {
      const nContracts = Array.from({ length: 20 }, () => ({
        aptName: '동탄역시범한화꿈에그린',
        ym: '202606',
        contractDay: '10',
        area: 84.51,
        deposit: 45000,
        monthlyRent: 30,
        floor: 7
      }));

      const keyed = generateRentKeyMap(nContracts);
      expect(keyed.length).toBe(20);

      const baseKey = 'RENT_동탄역시범한화꿈에그린_202606_10_84.51_45000_30_7';
      expect(keyed[0]._key).toBe(baseKey);

      for (let i = 1; i < 20; i++) {
        expect(keyed[i]._key).toBe(`${baseKey}_${i + 1}`);
        expect(keyed[i].occurrence).toBe(i + 1);
      }

      const uniqueKeys = new Set(keyed.map(k => k._key));
      expect(uniqueKeys.size).toBe(20);
    });

    it('should correctly handle multi-district duplication with legitimate multiple identical contracts', () => {
      // fetch-rent.js 교차 수집 시뮬레이션
      // 41590과 41597에서 동일한 3건의 계약이 각각 반환되었을 때,
      // 최종 Firestore 적재 대상은 정확히 3건이어야 하고 6건으로 증폭되지 않아야 함.
      const rawContract = {
        aptName: '동탄레이크자연앤푸르지오',
        ym: '202607',
        contractDay: '12',
        area: 84.9,
        deposit: 55000,
        monthlyRent: 0,
        floor: 10
      };

      const districts = [
        { lawdCd: '41590', items: [rawContract, rawContract, rawContract] }, // 3건 동일 계약
        { lawdCd: '41597', items: [rawContract, rawContract, rawContract] }  // 행정구역 중복 응답 3건
      ];

      const keyOccurrences = new Map<string, number>();
      const seenRawTxKeys = new Set<string>();
      const savedRecords: any[] = [];

      for (const { items } of districts) {
        const currentDistrictOccurrences = new Map<string, number>();
        for (const item of items) {
          const baseKey = `RENT_${item.aptName}_${item.ym}_${item.contractDay}_${item.area}_${item.deposit}_${item.monthlyRent}_${item.floor}`;
          const currentDistrictCount = (currentDistrictOccurrences.get(baseKey) || 0) + 1;
          currentDistrictOccurrences.set(baseKey, currentDistrictCount);
          const txIdentifier = `${baseKey}_${currentDistrictCount}`;

          if (seenRawTxKeys.has(txIdentifier)) {
            continue; // 다른 LAWD_CD에서 이미 본 동일 건 스킵
          }
          seenRawTxKeys.add(txIdentifier);

          const occurrence = (keyOccurrences.get(baseKey) || 0) + 1;
          keyOccurrences.set(baseKey, occurrence);
          const _key = occurrence === 1 ? baseKey : `${baseKey}_${occurrence}`;
          savedRecords.push({ ...item, _key, occurrence });
        }
      }

      // 두 행정구역 합산 6건 중 정확히 3건만 수집되어야 함!
      expect(savedRecords.length).toBe(3);
      expect(savedRecords.map(r => r._key)).toEqual([
        'RENT_동탄레이크자연앤푸르지오_202607_12_84.9_55000_0_10',
        'RENT_동탄레이크자연앤푸르지오_202607_12_84.9_55000_0_10_2',
        'RENT_동탄레이크자연앤푸르지오_202607_12_84.9_55000_0_10_3'
      ]);
    });
  });

  // ==========================================================================
  // 3. API Resilience & Error Envelopes
  // ==========================================================================
  describe('3. API Resilience & Error Envelopes', () => {

    // 공공 API 응답 파서 (fetch-transactions.js & fetch-rent.js 로직)
    const parseApiResponse = (rawData: any) => {
      const text = typeof rawData === 'string' ? rawData : JSON.stringify(rawData);
      const isXml = typeof rawData === 'string' && rawData.trim().startsWith('<');

      if (isXml) {
        const resultCodeMatch = text.match(/<resultCode>([^<]*)<\/resultCode>/i) ||
                                text.match(/<returnReasonCode>([^<]*)<\/returnReasonCode>/i);
        const resultMsgMatch = text.match(/<resultMsg>([^<]*)<\/resultMsg>/i) ||
                               text.match(/<returnAuthMsg>([^<]*)<\/returnAuthMsg>/i) ||
                               text.match(/<errMsg>([^<]*)<\/errMsg>/i);
        const resultCode = resultCodeMatch ? resultCodeMatch[1].trim() : '';
        const resultMsg = resultMsgMatch ? resultMsgMatch[1].trim() : '';

        const isGatewayError = text.includes('<OpenAPI_ServiceResponse>') || text.includes('<cmmMsgHeader>');
        const isError = isGatewayError || (resultCode !== '' && resultCode !== '00' && resultCode !== '000');

        return {
          type: 'xml',
          isError,
          resultCode,
          resultMsg,
          isGatewayError
        };
      } else {
        const jsonResultCode = rawData?.response?.header?.resultCode ||
                               rawData?.OpenAPI_ServiceResponse?.cmmMsgHeader?.returnReasonCode;
        const jsonResultMsg = rawData?.response?.header?.resultMsg ||
                              rawData?.OpenAPI_ServiceResponse?.cmmMsgHeader?.returnAuthMsg ||
                              rawData?.OpenAPI_ServiceResponse?.cmmMsgHeader?.errMsg;

        const isError = (jsonResultCode && jsonResultCode !== '000' && jsonResultCode !== '00') || false;

        return {
          type: 'json',
          isError,
          resultCode: jsonResultCode || '',
          resultMsg: jsonResultMsg || ''
        };
      }
    };

    it('should intercept XML error code 99 (LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR)', () => {
      const xml = `
        <response>
          <header>
            <resultCode>99</resultCode>
            <resultMsg>LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR</resultMsg>
          </header>
        </response>
      `;
      const res = parseApiResponse(xml);
      expect(res.isError).toBe(true);
      expect(res.resultCode).toBe('99');
      expect(res.resultMsg).toBe('LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR');
    });

    it('should intercept XML error code 30 (SERVICE_KEY_IS_NOT_REGISTERED_ERROR)', () => {
      const xml = `
        <response>
          <header>
            <resultCode>30</resultCode>
            <resultMsg>SERVICE_KEY_IS_NOT_REGISTERED_ERROR</resultMsg>
          </header>
        </response>
      `;
      const res = parseApiResponse(xml);
      expect(res.isError).toBe(true);
      expect(res.resultCode).toBe('30');
      expect(res.resultMsg).toBe('SERVICE_KEY_IS_NOT_REGISTERED_ERROR');
    });

    it('should intercept XML error code 01 (APPLICATION_ERROR / SERVICE_TIMEOUT)', () => {
      const xml = `
        <response>
          <header>
            <resultCode>01</resultCode>
            <resultMsg>APPLICATION_ERROR</resultMsg>
          </header>
        </response>
      `;
      const res = parseApiResponse(xml);
      expect(res.isError).toBe(true);
      expect(res.resultCode).toBe('01');
      expect(res.resultMsg).toBe('APPLICATION_ERROR');
    });

    it('should intercept OpenAPI_ServiceResponse gateway error XML envelope', () => {
      const xml = `
        <OpenAPI_ServiceResponse>
          <cmmMsgHeader>
            <errMsg>SERVICE ERROR</errMsg>
            <returnAuthMsg>HTTP_ROUTING_ERROR</returnAuthMsg>
            <returnReasonCode>04</returnReasonCode>
          </cmmMsgHeader>
        </OpenAPI_ServiceResponse>
      `;
      const res = parseApiResponse(xml);
      expect(res.isError).toBe(true);
      expect(res.isGatewayError).toBe(true);
      expect(res.resultCode).toBe('04');
      expect(res.resultMsg).toBe('HTTP_ROUTING_ERROR');
    });

    it('should safely handle whitespace-padded error codes and multiline tags', () => {
      const xml = `
        <response>
          <header>
            <resultCode>
              99   
            </resultCode>
            <resultMsg>
              LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR
            </resultMsg>
          </header>
        </response>
      `;
      const res = parseApiResponse(xml);
      expect(res.isError).toBe(true);
      expect(res.resultCode).toBe('99');
    });

    it('should recognize normal service codes (00 and 000) as valid non-errors', () => {
      const xml00 = `<response><header><resultCode>00</resultCode><resultMsg>NORMAL_SERVICE</resultMsg></header></response>`;
      const res00 = parseApiResponse(xml00);
      expect(res00.isError).toBe(false);

      const xml000 = `<response><header><resultCode>000</resultCode><resultMsg>SUCCESS</resultMsg></header></response>`;
      const res000 = parseApiResponse(xml000);
      expect(res000.isError).toBe(false);
    });

    it('should handle network timeout (ECONNABORTED) with exponential backoff and safe retry exhaustion', async () => {
      // Exponential backoff simulator adhering to fetch-transactions.js:61-80
      const retryDelays: number[] = [];
      const fetchWithRetryMock = async (
        fn: () => Promise<any>,
        retries = 3,
        baseDelay = 20
      ) => {
        for (let i = 0; i < retries; i++) {
          try {
            return await fn();
          } catch (err: any) {
            const isLast = i === retries - 1;
            if (isLast) throw err;
            const backoffDelay = baseDelay * Math.pow(2, i);
            retryDelays.push(backoffDelay);
            await new Promise(r => setTimeout(r, backoffDelay));
          }
        }
      };

      // 1. ECONNABORTED 타임아웃 발생 후 3회차 성공 검증
      let attempt = 0;
      const transientCall = jest.fn().mockImplementation(async () => {
        attempt++;
        if (attempt <= 2) {
          const err: any = new Error('timeout of 25000ms exceeded');
          err.code = 'ECONNABORTED';
          throw err;
        }
        return { status: 200, data: 'OK' };
      });

      const res = await fetchWithRetryMock(transientCall, 3, 10);
      expect(res.status).toBe(200);
      expect(transientCall).toHaveBeenCalledTimes(3);
      // 백오프 딜레이는 10ms, 20ms (총 2회 대기 후 3회차 성공)
      expect(retryDelays).toEqual([10, 20]);

      // 2. 3회 모두 ECONNABORTED 발생 시 안전하게 에러를 반환/던지고 크래시 없이 포착 가능한지 검증
      const persistentTimeoutCall = jest.fn().mockImplementation(async () => {
        const err: any = new Error('timeout of 25000ms exceeded');
        err.code = 'ECONNABORTED';
        throw err;
      });

      await expect(fetchWithRetryMock(persistentTimeoutCall, 3, 5)).rejects.toThrow('timeout of 25000ms exceeded');
      expect(persistentTimeoutCall).toHaveBeenCalledTimes(3);
    });

    it('should not throw unhandled exception or crash process when API returns completely malformed or empty responses', () => {
      // 빈 문자열
      expect(() => parseApiResponse('')).not.toThrow();
      expect(parseApiResponse('').isError).toBe(false);

      // 불완전한 XML
      expect(() => parseApiResponse('<response><header>')).not.toThrow();

      // null 및 undefined
      expect(() => parseApiResponse(null)).not.toThrow();
      expect(() => parseApiResponse(undefined)).not.toThrow();

      // 비정상 JSON
      expect(() => parseApiResponse({})).not.toThrow();
      expect(() => parseApiResponse({ invalid: true })).not.toThrow();
    });
  });

});
