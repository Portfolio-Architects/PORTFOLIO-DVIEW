/**
 * 실거래가 및 전월세 요약 데이터 — 빌드 타임에 포함, API 호출 0
 * 
 * ⚠️ 이 파일은 자동 생성됩니다. 직접 수정하지 마세요!
 * 동기화: npm run sync-transactions
 * 마지막 동기화: 2026-05-12
 */

export interface RecentTx {
  date: string;
  priceEok: string;
  areaPyeong: number;
  floor: number;
  area: number;
}

export interface AptTxSummary {
  // 매매 (Sale)
  latestPrice: number;
  latestPriceEok: string;
  latestArea: number;
  latestFloor: number;
  latestDate: string;
  maxPrice: number;
  maxPriceEok: string;
  minPrice: number;
  minPriceEok: string;
  txCount: number;
  avg1MPrice: number;
  avg1MPriceEok: string;
  avg1MPerPyeong?: number;
  avg1MTxCount?: number;
  avg3MPrice?: number;
  avg3MPriceEok?: string;
  avg3MPerPyeong?: number;
  avg3MTxCount?: number;
  recent: RecentTx[];
  
  // 전월세 (Rent/Jeonse)
  rentTxCount?: number;
  latestRentDeposit?: number;
  latestRentDepositEok?: string;
  latestRentMonthly?: number;
  latestRentDate?: string;
  avg1MRentDeposit?: number;
  avg1MRentDepositEok?: string;
  avg3MRentDeposit?: number;
  avg3MRentDepositEok?: string;

  // 법정동
  dong?: string;
}

export interface DongtanMacroTrendPoint {
  name: string;
  '동탄 아파트 전체': number;
  '동탄 아파트 전세 평균': number;
}

export const DONGTAN_MACRO_TREND: DongtanMacroTrendPoint[] = [
  {
    "name": "16.04",
    "동탄 아파트 전체": 3.7,
    "동탄 아파트 전세 평균": 2.8
  },
  {
    "name": "16.05",
    "동탄 아파트 전체": 3.7,
    "동탄 아파트 전세 평균": 2.8
  },
  {
    "name": "16.06",
    "동탄 아파트 전체": 3.8,
    "동탄 아파트 전세 평균": 2.8
  },
  {
    "name": "16.07",
    "동탄 아파트 전체": 3.8,
    "동탄 아파트 전세 평균": 2.9
  },
  {
    "name": "16.08",
    "동탄 아파트 전체": 3.8,
    "동탄 아파트 전세 평균": 3
  },
  {
    "name": "16.09",
    "동탄 아파트 전체": 3.9,
    "동탄 아파트 전세 평균": 3
  },
  {
    "name": "16.10",
    "동탄 아파트 전체": 4,
    "동탄 아파트 전세 평균": 3.1
  },
  {
    "name": "16.11",
    "동탄 아파트 전체": 4.1,
    "동탄 아파트 전세 평균": 3.2
  },
  {
    "name": "16.12",
    "동탄 아파트 전체": 4.1,
    "동탄 아파트 전세 평균": 3.2
  },
  {
    "name": "17.01",
    "동탄 아파트 전체": 4.1,
    "동탄 아파트 전세 평균": 3.1
  },
  {
    "name": "17.02",
    "동탄 아파트 전체": 4,
    "동탄 아파트 전세 평균": 3
  },
  {
    "name": "17.03",
    "동탄 아파트 전체": 4,
    "동탄 아파트 전세 평균": 3
  },
  {
    "name": "17.04",
    "동탄 아파트 전체": 4,
    "동탄 아파트 전세 평균": 2.9
  },
  {
    "name": "17.05",
    "동탄 아파트 전체": 4,
    "동탄 아파트 전세 평균": 2.8
  },
  {
    "name": "17.06",
    "동탄 아파트 전체": 4,
    "동탄 아파트 전세 평균": 2.8
  },
  {
    "name": "17.07",
    "동탄 아파트 전체": 4,
    "동탄 아파트 전세 평균": 2.7
  },
  {
    "name": "17.08",
    "동탄 아파트 전체": 4,
    "동탄 아파트 전세 평균": 2.7
  },
  {
    "name": "17.09",
    "동탄 아파트 전체": 4,
    "동탄 아파트 전세 평균": 2.6
  },
  {
    "name": "17.10",
    "동탄 아파트 전체": 4,
    "동탄 아파트 전세 평균": 2.6
  },
  {
    "name": "17.11",
    "동탄 아파트 전체": 3.9,
    "동탄 아파트 전세 평균": 2.6
  },
  {
    "name": "17.12",
    "동탄 아파트 전체": 4,
    "동탄 아파트 전세 평균": 2.6
  },
  {
    "name": "18.01",
    "동탄 아파트 전체": 4,
    "동탄 아파트 전세 평균": 2.5
  },
  {
    "name": "18.02",
    "동탄 아파트 전체": 4.1,
    "동탄 아파트 전세 평균": 2.5
  },
  {
    "name": "18.03",
    "동탄 아파트 전체": 4.2,
    "동탄 아파트 전세 평균": 2.5
  },
  {
    "name": "18.04",
    "동탄 아파트 전체": 4.2,
    "동탄 아파트 전세 평균": 2.5
  },
  {
    "name": "18.05",
    "동탄 아파트 전체": 4.2,
    "동탄 아파트 전세 평균": 2.6
  },
  {
    "name": "18.06",
    "동탄 아파트 전체": 4.3,
    "동탄 아파트 전세 평균": 2.6
  },
  {
    "name": "18.07",
    "동탄 아파트 전체": 4.3,
    "동탄 아파트 전세 평균": 2.6
  },
  {
    "name": "18.08",
    "동탄 아파트 전체": 4.4,
    "동탄 아파트 전세 평균": 2.6
  },
  {
    "name": "18.09",
    "동탄 아파트 전체": 4.5,
    "동탄 아파트 전세 평균": 2.6
  },
  {
    "name": "18.10",
    "동탄 아파트 전체": 4.6,
    "동탄 아파트 전세 평균": 2.6
  },
  {
    "name": "18.11",
    "동탄 아파트 전체": 4.6,
    "동탄 아파트 전세 평균": 2.5
  },
  {
    "name": "18.12",
    "동탄 아파트 전체": 4.6,
    "동탄 아파트 전세 평균": 2.4
  },
  {
    "name": "19.01",
    "동탄 아파트 전체": 4.5,
    "동탄 아파트 전세 평균": 2.4
  },
  {
    "name": "19.02",
    "동탄 아파트 전체": 4.5,
    "동탄 아파트 전세 평균": 2.3
  },
  {
    "name": "19.03",
    "동탄 아파트 전체": 4.5,
    "동탄 아파트 전세 평균": 2.2
  },
  {
    "name": "19.04",
    "동탄 아파트 전체": 4.4,
    "동탄 아파트 전세 평균": 2.1
  },
  {
    "name": "19.05",
    "동탄 아파트 전체": 4.4,
    "동탄 아파트 전세 평균": 2.1
  },
  {
    "name": "19.06",
    "동탄 아파트 전체": 4.4,
    "동탄 아파트 전세 평균": 2.1
  },
  {
    "name": "19.07",
    "동탄 아파트 전체": 4.4,
    "동탄 아파트 전세 평균": 2.2
  },
  {
    "name": "19.08",
    "동탄 아파트 전체": 4.5,
    "동탄 아파트 전세 평균": 2.3
  },
  {
    "name": "19.09",
    "동탄 아파트 전체": 4.6,
    "동탄 아파트 전세 평균": 2.3
  },
  {
    "name": "19.10",
    "동탄 아파트 전체": 4.8,
    "동탄 아파트 전세 평균": 2.4
  },
  {
    "name": "19.11",
    "동탄 아파트 전체": 4.9,
    "동탄 아파트 전세 평균": 2.5
  },
  {
    "name": "19.12",
    "동탄 아파트 전체": 5.1,
    "동탄 아파트 전세 평균": 2.5
  },
  {
    "name": "20.01",
    "동탄 아파트 전체": 5.3,
    "동탄 아파트 전세 평균": 2.5
  },
  {
    "name": "20.02",
    "동탄 아파트 전체": 5.7,
    "동탄 아파트 전세 평균": 2.7
  },
  {
    "name": "20.03",
    "동탄 아파트 전체": 5.8,
    "동탄 아파트 전세 평균": 2.7
  },
  {
    "name": "20.04",
    "동탄 아파트 전체": 5.9,
    "동탄 아파트 전세 평균": 2.7
  },
  {
    "name": "20.05",
    "동탄 아파트 전체": 5.9,
    "동탄 아파트 전세 평균": 2.8
  },
  {
    "name": "20.06",
    "동탄 아파트 전체": 6.2,
    "동탄 아파트 전세 평균": 2.9
  },
  {
    "name": "20.07",
    "동탄 아파트 전체": 6.4,
    "동탄 아파트 전세 평균": 3.2
  },
  {
    "name": "20.08",
    "동탄 아파트 전체": 6.6,
    "동탄 아파트 전세 평균": 3.4
  },
  {
    "name": "20.09",
    "동탄 아파트 전체": 6.7,
    "동탄 아파트 전세 평균": 3.5
  },
  {
    "name": "20.10",
    "동탄 아파트 전체": 6.8,
    "동탄 아파트 전세 평균": 3.6
  },
  {
    "name": "20.11",
    "동탄 아파트 전체": 7,
    "동탄 아파트 전세 평균": 3.7
  },
  {
    "name": "20.12",
    "동탄 아파트 전체": 7.1,
    "동탄 아파트 전세 평균": 3.6
  },
  {
    "name": "21.01",
    "동탄 아파트 전체": 7.4,
    "동탄 아파트 전세 평균": 3.6
  },
  {
    "name": "21.02",
    "동탄 아파트 전체": 7.6,
    "동탄 아파트 전세 평균": 3.5
  },
  {
    "name": "21.03",
    "동탄 아파트 전체": 7.7,
    "동탄 아파트 전세 평균": 3.6
  },
  {
    "name": "21.04",
    "동탄 아파트 전체": 7.7,
    "동탄 아파트 전세 평균": 3.6
  },
  {
    "name": "21.05",
    "동탄 아파트 전체": 7.9,
    "동탄 아파트 전세 평균": 3.8
  },
  {
    "name": "21.06",
    "동탄 아파트 전체": 8.1,
    "동탄 아파트 전세 평균": 3.7
  },
  {
    "name": "21.07",
    "동탄 아파트 전체": 8.3,
    "동탄 아파트 전세 평균": 3.9
  },
  {
    "name": "21.08",
    "동탄 아파트 전체": 8.5,
    "동탄 아파트 전세 평균": 4
  },
  {
    "name": "21.09",
    "동탄 아파트 전체": 8.7,
    "동탄 아파트 전세 평균": 4
  },
  {
    "name": "21.10",
    "동탄 아파트 전체": 8.6,
    "동탄 아파트 전세 평균": 4.1
  },
  {
    "name": "21.11",
    "동탄 아파트 전체": 8.5,
    "동탄 아파트 전세 평균": 4
  },
  {
    "name": "21.12",
    "동탄 아파트 전체": 8.3,
    "동탄 아파트 전세 평균": 3.9
  },
  {
    "name": "22.01",
    "동탄 아파트 전체": 8.1,
    "동탄 아파트 전세 평균": 3.8
  },
  {
    "name": "22.02",
    "동탄 아파트 전체": 8.1,
    "동탄 아파트 전세 평균": 3.8
  },
  {
    "name": "22.03",
    "동탄 아파트 전체": 8,
    "동탄 아파트 전세 평균": 3.9
  },
  {
    "name": "22.04",
    "동탄 아파트 전체": 7.9,
    "동탄 아파트 전세 평균": 3.7
  },
  {
    "name": "22.05",
    "동탄 아파트 전체": 7.8,
    "동탄 아파트 전세 평균": 3.9
  },
  {
    "name": "22.06",
    "동탄 아파트 전체": 7.8,
    "동탄 아파트 전세 평균": 3.7
  },
  {
    "name": "22.07",
    "동탄 아파트 전체": 7.6,
    "동탄 아파트 전세 평균": 3.8
  },
  {
    "name": "22.08",
    "동탄 아파트 전체": 7.4,
    "동탄 아파트 전세 평균": 3.8
  },
  {
    "name": "22.09",
    "동탄 아파트 전체": 7.3,
    "동탄 아파트 전세 평균": 3.7
  },
  {
    "name": "22.10",
    "동탄 아파트 전체": 7,
    "동탄 아파트 전세 평균": 3.6
  },
  {
    "name": "22.11",
    "동탄 아파트 전체": 6.7,
    "동탄 아파트 전세 평균": 3.5
  },
  {
    "name": "22.12",
    "동탄 아파트 전체": 6.5,
    "동탄 아파트 전세 평균": 3.3
  },
  {
    "name": "23.01",
    "동탄 아파트 전체": 6.2,
    "동탄 아파트 전세 평균": 3.1
  },
  {
    "name": "23.02",
    "동탄 아파트 전체": 6.4,
    "동탄 아파트 전세 평균": 2.9
  },
  {
    "name": "23.03",
    "동탄 아파트 전체": 6.5,
    "동탄 아파트 전세 평균": 3
  },
  {
    "name": "23.04",
    "동탄 아파트 전체": 6.6,
    "동탄 아파트 전세 평균": 3
  },
  {
    "name": "23.05",
    "동탄 아파트 전체": 6.8,
    "동탄 아파트 전세 평균": 3.2
  },
  {
    "name": "23.06",
    "동탄 아파트 전체": 7,
    "동탄 아파트 전세 평균": 3.3
  },
  {
    "name": "23.07",
    "동탄 아파트 전체": 7,
    "동탄 아파트 전세 평균": 3.4
  },
  {
    "name": "23.08",
    "동탄 아파트 전체": 7.2,
    "동탄 아파트 전세 평균": 3.6
  },
  {
    "name": "23.09",
    "동탄 아파트 전체": 7.3,
    "동탄 아파트 전세 평균": 3.6
  },
  {
    "name": "23.10",
    "동탄 아파트 전체": 7.3,
    "동탄 아파트 전세 평균": 3.7
  },
  {
    "name": "23.11",
    "동탄 아파트 전체": 7.3,
    "동탄 아파트 전세 평균": 3.7
  },
  {
    "name": "23.12",
    "동탄 아파트 전체": 7.2,
    "동탄 아파트 전세 평균": 3.9
  },
  {
    "name": "24.01",
    "동탄 아파트 전체": 7.3,
    "동탄 아파트 전세 평균": 3.8
  },
  {
    "name": "24.02",
    "동탄 아파트 전체": 7.3,
    "동탄 아파트 전세 평균": 3.8
  },
  {
    "name": "24.03",
    "동탄 아파트 전체": 7.3,
    "동탄 아파트 전세 평균": 3.8
  },
  {
    "name": "24.04",
    "동탄 아파트 전체": 7.3,
    "동탄 아파트 전세 평균": 3.8
  },
  {
    "name": "24.05",
    "동탄 아파트 전체": 7.3,
    "동탄 아파트 전세 평균": 3.8
  },
  {
    "name": "24.06",
    "동탄 아파트 전체": 7.3,
    "동탄 아파트 전세 평균": 3.8
  },
  {
    "name": "24.07",
    "동탄 아파트 전체": 7.4,
    "동탄 아파트 전세 평균": 3.8
  },
  {
    "name": "24.08",
    "동탄 아파트 전체": 7.5,
    "동탄 아파트 전세 평균": 3.8
  },
  {
    "name": "24.09",
    "동탄 아파트 전체": 7.4,
    "동탄 아파트 전세 평균": 3.9
  },
  {
    "name": "24.10",
    "동탄 아파트 전체": 7.4,
    "동탄 아파트 전세 평균": 3.9
  },
  {
    "name": "24.11",
    "동탄 아파트 전체": 7.5,
    "동탄 아파트 전세 평균": 3.9
  },
  {
    "name": "24.12",
    "동탄 아파트 전체": 7.4,
    "동탄 아파트 전세 평균": 3.8
  },
  {
    "name": "25.01",
    "동탄 아파트 전체": 7.4,
    "동탄 아파트 전세 평균": 3.7
  },
  {
    "name": "25.02",
    "동탄 아파트 전체": 7.4,
    "동탄 아파트 전세 평균": 3.6
  },
  {
    "name": "25.03",
    "동탄 아파트 전체": 7.3,
    "동탄 아파트 전세 평균": 3.6
  },
  {
    "name": "25.04",
    "동탄 아파트 전체": 7.4,
    "동탄 아파트 전세 평균": 3.7
  },
  {
    "name": "25.05",
    "동탄 아파트 전체": 7.4,
    "동탄 아파트 전세 평균": 3.8
  },
  {
    "name": "25.06",
    "동탄 아파트 전체": 7.4,
    "동탄 아파트 전세 평균": 3.8
  },
  {
    "name": "25.07",
    "동탄 아파트 전체": 7.4,
    "동탄 아파트 전세 평균": 3.8
  },
  {
    "name": "25.08",
    "동탄 아파트 전체": 7.3,
    "동탄 아파트 전세 평균": 3.8
  },
  {
    "name": "25.09",
    "동탄 아파트 전체": 7.4,
    "동탄 아파트 전세 평균": 3.9
  },
  {
    "name": "25.10",
    "동탄 아파트 전체": 7.5,
    "동탄 아파트 전세 평균": 4
  },
  {
    "name": "25.11",
    "동탄 아파트 전체": 7.7,
    "동탄 아파트 전세 평균": 4.1
  },
  {
    "name": "25.12",
    "동탄 아파트 전체": 7.8,
    "동탄 아파트 전세 평균": 4.1
  },
  {
    "name": "26.01",
    "동탄 아파트 전체": 7.9,
    "동탄 아파트 전세 평균": 4.2
  },
  {
    "name": "26.02",
    "동탄 아파트 전체": 7.9,
    "동탄 아파트 전세 평균": 4.1
  },
  {
    "name": "26.03",
    "동탄 아파트 전체": 8.1,
    "동탄 아파트 전세 평균": 4.3
  }
];

/** 아파트명 → 거래 요약 */
export const TX_SUMMARY: Record<string, AptTxSummary> = {
  "동탄역포레너스": {
    "dong": "영천동",
    "latestPrice": 67000,
    "latestPriceEok": "6억7,000",
    "latestArea": 34.004589465,
    "latestFloor": 4,
    "latestDate": "20260509",
    "maxPrice": 79500,
    "maxPriceEok": "7억9,500",
    "minPrice": 27500,
    "minPriceEok": "2억7,500",
    "txCount": 934,
    "avg1MPrice": 67300,
    "avg1MPriceEok": "6억7,300",
    "avg1MPerPyeong": 2026,
    "avg1MTxCount": 15,
    "avg3MPrice": 66300,
    "avg3MPriceEok": "6억6,300",
    "avg3MPerPyeong": 2019,
    "avg3MTxCount": 39,
    "recent": [
      {
        "date": "05.09",
        "priceEok": "6억7,000",
        "areaPyeong": 34.004589465,
        "floor": 4,
        "area": 84.5202
      },
      {
        "date": "05.09",
        "priceEok": "6억7,000",
        "areaPyeong": 34.004589465,
        "floor": 12,
        "area": 84.5202
      },
      {
        "date": "05.08",
        "priceEok": "6억9,300",
        "areaPyeong": 34.004589465,
        "floor": 9,
        "area": 84.5202
      },
      {
        "date": "05.06",
        "priceEok": "6억4,000",
        "areaPyeong": 34.004589465,
        "floor": 2,
        "area": 84.5202
      }
    ],
    "rentTxCount": 1421,
    "latestRentDeposit": 29400,
    "latestRentDepositEok": "2억9,400",
    "latestRentMonthly": 0,
    "latestRentDate": "20260504",
    "avg1MRentDeposit": 38200,
    "avg1MRentDepositEok": "3억8,200",
    "avg3MRentDeposit": 41400,
    "avg3MRentDepositEok": "4억1,400"
  },
  "동탄역시범반도유보라아이비파크1.0": {
    "dong": "청계동",
    "latestPrice": 109500,
    "latestPriceEok": "10억9,500",
    "latestArea": 32.9725,
    "latestFloor": 7,
    "latestDate": "20260508",
    "maxPrice": 130000,
    "maxPriceEok": "13억",
    "minPrice": 43501,
    "minPriceEok": "4억3,501",
    "txCount": 513,
    "avg1MPrice": 111500,
    "avg1MPriceEok": "11억1,500",
    "avg1MPerPyeong": 3205,
    "avg1MTxCount": 9,
    "avg3MPrice": 109100,
    "avg3MPriceEok": "10억9,100",
    "avg3MPerPyeong": 3145,
    "avg3MTxCount": 29,
    "recent": [
      {
        "date": "05.08",
        "priceEok": "10억9,500",
        "areaPyeong": 32.9725,
        "floor": 7,
        "area": 84.9885
      },
      {
        "date": "05.07",
        "priceEok": "11억8,500",
        "areaPyeong": 38.72,
        "floor": 4,
        "area": 99.0153
      },
      {
        "date": "05.06",
        "priceEok": "11억",
        "areaPyeong": 32.9725,
        "floor": 12,
        "area": 84.9885
      },
      {
        "date": "05.02",
        "priceEok": "11억1,000",
        "areaPyeong": 32.9725,
        "floor": 11,
        "area": 84.9885
      }
    ],
    "rentTxCount": 855,
    "latestRentDeposit": 60000,
    "latestRentDepositEok": "6억",
    "latestRentMonthly": 0,
    "latestRentDate": "20260430",
    "avg1MRentDeposit": 70000,
    "avg1MRentDepositEok": "7억",
    "avg3MRentDeposit": 66800,
    "avg3MRentDepositEok": "6억6,800"
  },
  "동탄역시범리슈빌아파트": {
    "dong": "",
    "latestPrice": 123800,
    "latestPriceEok": "12억3,800",
    "latestArea": 33.879999999999995,
    "latestFloor": 19,
    "latestDate": "20260508",
    "maxPrice": 149000,
    "maxPriceEok": "14억9,000",
    "minPrice": 45000,
    "minPriceEok": "4억5,000",
    "txCount": 335,
    "avg1MPrice": 120600,
    "avg1MPriceEok": "12억600",
    "avg1MPerPyeong": 3570,
    "avg1MTxCount": 6,
    "avg3MPrice": 121500,
    "avg3MPriceEok": "12억1,500",
    "avg3MPerPyeong": 3477,
    "avg3MTxCount": 10,
    "recent": [
      {
        "date": "05.08",
        "priceEok": "12억3,800",
        "areaPyeong": 33.879999999999995,
        "floor": 19,
        "area": 84.87
      },
      {
        "date": "05.08",
        "priceEok": "11억6,700",
        "areaPyeong": 33.5775,
        "floor": 8,
        "area": 84.65
      },
      {
        "date": "04.23",
        "priceEok": "12억1,000",
        "areaPyeong": 33.879999999999995,
        "floor": 7,
        "area": 84.87
      },
      {
        "date": "04.20",
        "priceEok": "12억1,000",
        "areaPyeong": 33.879999999999995,
        "floor": 15,
        "area": 84.87
      }
    ],
    "rentTxCount": 543,
    "latestRentDeposit": 70000,
    "latestRentDepositEok": "7억",
    "latestRentMonthly": 0,
    "latestRentDate": "20260430",
    "avg1MRentDeposit": 60000,
    "avg1MRentDepositEok": "6억",
    "avg3MRentDeposit": 55600,
    "avg3MRentDepositEok": "5억5,600"
  },
  "동탄역시범우남퍼스트빌아파트": {
    "dong": "청계동",
    "latestPrice": 126000,
    "latestPriceEok": "12억6,000",
    "latestArea": 25.7125,
    "latestFloor": 16,
    "latestDate": "20260509",
    "maxPrice": 148000,
    "maxPriceEok": "14억8,000",
    "minPrice": 32938,
    "minPriceEok": "3억2,938",
    "txCount": 1031,
    "avg1MPrice": 136700,
    "avg1MPriceEok": "13억6,700",
    "avg1MPerPyeong": 4538,
    "avg1MTxCount": 8,
    "avg3MPrice": 130400,
    "avg3MPriceEok": "13억400",
    "avg3MPerPyeong": 4522,
    "avg3MTxCount": 22,
    "recent": [
      {
        "date": "05.09",
        "priceEok": "12억6,000",
        "areaPyeong": 25.7125,
        "floor": 16,
        "area": 59.95
      },
      {
        "date": "05.08",
        "priceEok": "12억5,000",
        "areaPyeong": 25.41,
        "floor": 26,
        "area": 59.98
      },
      {
        "date": "05.07",
        "priceEok": "14억3,000",
        "areaPyeong": 33.275,
        "floor": 10,
        "area": 84.98
      },
      {
        "date": "05.05",
        "priceEok": "14억2,000",
        "areaPyeong": 33.275,
        "floor": 12,
        "area": 84.98
      }
    ],
    "rentTxCount": 2062,
    "latestRentDeposit": 54000,
    "latestRentDepositEok": "5억4,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260508",
    "avg1MRentDeposit": 54800,
    "avg1MRentDepositEok": "5억4,800",
    "avg3MRentDeposit": 54200,
    "avg3MRentDepositEok": "5억4,200"
  },
  "동탄숲속마을광명메이루즈": {
    "dong": "",
    "latestPrice": 55000,
    "latestPriceEok": "5억5,000",
    "latestArea": 31.7625,
    "latestFloor": 3,
    "latestDate": "20260508",
    "maxPrice": 70000,
    "maxPriceEok": "7억",
    "minPrice": 21952,
    "minPriceEok": "2억1,952",
    "txCount": 404,
    "avg1MPrice": 62100,
    "avg1MPriceEok": "6억2,100",
    "avg1MPerPyeong": 1954,
    "avg1MTxCount": 4,
    "avg3MPrice": 60800,
    "avg3MPriceEok": "6억800",
    "avg3MPerPyeong": 1914,
    "avg3MTxCount": 7,
    "recent": [
      {
        "date": "05.08",
        "priceEok": "5억5,000",
        "areaPyeong": 31.7625,
        "floor": 3,
        "area": 84.496
      },
      {
        "date": "05.02",
        "priceEok": "6억7,700",
        "areaPyeong": 31.7625,
        "floor": 9,
        "area": 84.23
      },
      {
        "date": "04.25",
        "priceEok": "6억",
        "areaPyeong": 31.7625,
        "floor": 5,
        "area": 84.23
      },
      {
        "date": "04.24",
        "priceEok": "6억5,500",
        "areaPyeong": 31.7625,
        "floor": 6,
        "area": 84.23
      }
    ],
    "rentTxCount": 386,
    "latestRentDeposit": 37000,
    "latestRentDepositEok": "3억7,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260502",
    "avg1MRentDeposit": 36000,
    "avg1MRentDepositEok": "3억6,000",
    "avg3MRentDeposit": 36000,
    "avg3MRentDepositEok": "3억6,000"
  },
  "힐스테이트동탄역": {
    "dong": "영천동",
    "latestPrice": 55800,
    "latestPriceEok": "5억5,800",
    "latestArea": 23.2925,
    "latestFloor": 32,
    "latestDate": "20260511",
    "maxPrice": 61000,
    "maxPriceEok": "6억1,000",
    "minPrice": 39000,
    "minPriceEok": "3억9,000",
    "txCount": 154,
    "avg1MPrice": 53600,
    "avg1MPriceEok": "5억3,600",
    "avg1MPerPyeong": 2290,
    "avg1MTxCount": 5,
    "avg3MPrice": 52900,
    "avg3MPriceEok": "5억2,900",
    "avg3MPerPyeong": 2248,
    "avg3MTxCount": 20,
    "recent": [
      {
        "date": "05.11",
        "priceEok": "5억5,800",
        "areaPyeong": 23.2925,
        "floor": 32,
        "area": 54.5508
      },
      {
        "date": "05.06",
        "priceEok": "5억3,750",
        "areaPyeong": 23.2925,
        "floor": 9,
        "area": 54.5508
      },
      {
        "date": "05.01",
        "priceEok": "5억2,300",
        "areaPyeong": 23.595,
        "floor": 23,
        "area": 54.9749
      },
      {
        "date": "04.25",
        "priceEok": "5억3,500",
        "areaPyeong": 23.2925,
        "floor": 26,
        "area": 54.5508
      }
    ],
    "rentTxCount": 343,
    "latestRentDeposit": 40000,
    "latestRentDepositEok": "4억",
    "latestRentMonthly": 0,
    "latestRentDate": "20260508",
    "avg1MRentDeposit": 40000,
    "avg1MRentDepositEok": "4억",
    "avg3MRentDeposit": 37800,
    "avg3MRentDepositEok": "3억7,800"
  },
  "한화포레나동탄호수": {
    "dong": "장지동",
    "latestPrice": 80500,
    "latestPriceEok": "8억500",
    "latestArea": 33.80736975,
    "latestFloor": 11,
    "latestDate": "20260509",
    "maxPrice": 85000,
    "maxPriceEok": "8억5,000",
    "minPrice": 40000,
    "minPriceEok": "4억",
    "txCount": 145,
    "avg1MPrice": 74500,
    "avg1MPriceEok": "7억4,500",
    "avg1MPerPyeong": 2323,
    "avg1MTxCount": 7,
    "avg3MPrice": 75500,
    "avg3MPriceEok": "7억5,500",
    "avg3MPerPyeong": 2356,
    "avg3MTxCount": 16,
    "recent": [
      {
        "date": "05.09",
        "priceEok": "8억500",
        "areaPyeong": 33.80736975,
        "floor": 11,
        "area": 84.03
      },
      {
        "date": "05.08",
        "priceEok": "7억1,000",
        "areaPyeong": 33.81541625,
        "floor": 2,
        "area": 84.05
      },
      {
        "date": "05.02",
        "priceEok": "7억8,700",
        "areaPyeong": 33.81541625,
        "floor": 9,
        "area": 84.05
      },
      {
        "date": "04.24",
        "priceEok": "7억",
        "areaPyeong": 29.856538249999996,
        "floor": 5,
        "area": 74.21
      }
    ],
    "rentTxCount": 306,
    "latestRentDeposit": 30000,
    "latestRentDepositEok": "3억",
    "latestRentMonthly": 0,
    "latestRentDate": "20260508",
    "avg1MRentDeposit": 36000,
    "avg1MRentDepositEok": "3억6,000",
    "avg3MRentDeposit": 37800,
    "avg3MRentDepositEok": "3억7,800"
  },
  "동탄파크푸르지오": {
    "dong": "",
    "latestPrice": 58500,
    "latestPriceEok": "5억8,500",
    "latestArea": 34.173485500000005,
    "latestFloor": 10,
    "latestDate": "20260502",
    "maxPrice": 78000,
    "maxPriceEok": "7억8,000",
    "minPrice": 34200,
    "minPriceEok": "3억4,200",
    "txCount": 360,
    "avg1MPrice": 56800,
    "avg1MPriceEok": "5억6,800",
    "avg1MPerPyeong": 1663,
    "avg1MTxCount": 5,
    "avg3MPrice": 56200,
    "avg3MPriceEok": "5억6,200",
    "avg3MPerPyeong": 1710,
    "avg3MTxCount": 20,
    "recent": [
      {
        "date": "05.02",
        "priceEok": "5억8,500",
        "areaPyeong": 34.173485500000005,
        "floor": 10,
        "area": 84.94
      },
      {
        "date": "04.23",
        "priceEok": "5억3,000",
        "areaPyeong": 34.173485500000005,
        "floor": 1,
        "area": 84.94
      },
      {
        "date": "04.18",
        "priceEok": "5억2,800",
        "areaPyeong": 34.173485500000005,
        "floor": 6,
        "area": 84.94
      },
      {
        "date": "04.18",
        "priceEok": "6억800",
        "areaPyeong": 34.165439,
        "floor": 6,
        "area": 84.92
      }
    ],
    "rentTxCount": 407,
    "latestRentDeposit": 40000,
    "latestRentDepositEok": "4억",
    "latestRentMonthly": 0,
    "latestRentDate": "20260508",
    "avg1MRentDeposit": 42400,
    "avg1MRentDepositEok": "4억2,400",
    "avg3MRentDeposit": 39200,
    "avg3MRentDepositEok": "3억9,200"
  },
  "동탄레이크자연앤푸르지오": {
    "dong": "장지동",
    "latestPrice": 90000,
    "latestPriceEok": "9억",
    "latestArea": 32.3675,
    "latestFloor": 4,
    "latestDate": "20260505",
    "maxPrice": 109000,
    "maxPriceEok": "10억9,000",
    "minPrice": 40500,
    "minPriceEok": "4억500",
    "txCount": 146,
    "avg1MPrice": 96600,
    "avg1MPriceEok": "9억6,600",
    "avg1MPerPyeong": 2853,
    "avg1MTxCount": 4,
    "avg3MPrice": 92800,
    "avg3MPriceEok": "9억2,800",
    "avg3MPerPyeong": 2818,
    "avg3MTxCount": 13,
    "recent": [
      {
        "date": "05.05",
        "priceEok": "9억",
        "areaPyeong": 32.3675,
        "floor": 4,
        "area": 84.7984
      },
      {
        "date": "05.04",
        "priceEok": "9억2,500",
        "areaPyeong": 32.3675,
        "floor": 16,
        "area": 84.7984
      },
      {
        "date": "04.25",
        "priceEok": "10억9,000",
        "areaPyeong": 38.4175,
        "floor": 15,
        "area": 99.9758
      },
      {
        "date": "04.20",
        "priceEok": "9억5,000",
        "areaPyeong": 32.3675,
        "floor": 21,
        "area": 84.7984
      }
    ],
    "rentTxCount": 277,
    "latestRentDeposit": 20000,
    "latestRentDepositEok": "2억",
    "latestRentMonthly": 119,
    "latestRentDate": "20260508",
    "avg1MRentDeposit": 53000,
    "avg1MRentDepositEok": "5억3,000",
    "avg3MRentDeposit": 52200,
    "avg3MRentDepositEok": "5억2,200"
  },
  "중흥에스클래스에듀하이": {
    "dong": "",
    "latestPrice": 69000,
    "latestPriceEok": "6억9,000",
    "latestArea": 33.461128855,
    "latestFloor": 25,
    "latestDate": "20260509",
    "maxPrice": 74500,
    "maxPriceEok": "7억4,500",
    "minPrice": 54766,
    "minPriceEok": "5억4,766",
    "txCount": 70,
    "avg1MPrice": 67300,
    "avg1MPriceEok": "6억7,300",
    "avg1MPerPyeong": 2014,
    "avg1MTxCount": 7,
    "avg3MPrice": 67800,
    "avg3MPriceEok": "6억7,800",
    "avg3MPerPyeong": 2030,
    "avg3MTxCount": 15,
    "recent": [
      {
        "date": "05.09",
        "priceEok": "6억9,000",
        "areaPyeong": 33.461128855,
        "floor": 25,
        "area": 83.1694
      },
      {
        "date": "05.07",
        "priceEok": "6억7,000",
        "areaPyeong": 33.3973603425,
        "floor": 3,
        "area": 83.0109
      },
      {
        "date": "05.07",
        "priceEok": "7억",
        "areaPyeong": 33.3973603425,
        "floor": 19,
        "area": 83.0109
      },
      {
        "date": "05.04",
        "priceEok": "6억6,500",
        "areaPyeong": 33.3973603425,
        "floor": 3,
        "area": 83.0109
      }
    ],
    "rentTxCount": 463,
    "latestRentDeposit": 45000,
    "latestRentDepositEok": "4억5,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260416",
    "avg1MRentDeposit": 45000,
    "avg1MRentDepositEok": "4억5,000",
    "avg3MRentDeposit": 41400,
    "avg3MRentDepositEok": "4억1,400"
  },
  "자연앤데시앙": {
    "dong": "능동",
    "latestPrice": 57000,
    "latestPriceEok": "5억7,000",
    "latestArea": 34.173485500000005,
    "latestFloor": 29,
    "latestDate": "20260511",
    "maxPrice": 67000,
    "maxPriceEok": "6억7,000",
    "minPrice": 15900,
    "minPriceEok": "1억5,900",
    "txCount": 2072,
    "avg1MPrice": 53500,
    "avg1MPriceEok": "5억3,500",
    "avg1MPerPyeong": 1759,
    "avg1MTxCount": 13,
    "avg3MPrice": 51800,
    "avg3MPriceEok": "5억1,800",
    "avg3MPerPyeong": 1754,
    "avg3MTxCount": 40,
    "recent": [
      {
        "date": "05.11",
        "priceEok": "5억7,000",
        "areaPyeong": 34.173485500000005,
        "floor": 29,
        "area": 84.94
      },
      {
        "date": "05.09",
        "priceEok": "5억",
        "areaPyeong": 23.946384000000002,
        "floor": 6,
        "area": 59.52
      },
      {
        "date": "05.07",
        "priceEok": "5억3,500",
        "areaPyeong": 34.133253,
        "floor": 3,
        "area": 84.84
      },
      {
        "date": "05.01",
        "priceEok": "5억4,800",
        "areaPyeong": 30.013444999999997,
        "floor": 25,
        "area": 74.6
      }
    ],
    "rentTxCount": 2182,
    "latestRentDeposit": 29400,
    "latestRentDepositEok": "2억9,400",
    "latestRentMonthly": 0,
    "latestRentDate": "20260501",
    "avg1MRentDeposit": 30600,
    "avg1MRentDepositEok": "3억600",
    "avg3MRentDeposit": 31100,
    "avg3MRentDepositEok": "3억1,100"
  },
  "레이크힐반도유보라아이비파크10.2": {
    "dong": "",
    "latestPrice": 51900,
    "latestPriceEok": "5억1,900",
    "latestArea": 34.197262907500004,
    "latestFloor": 4,
    "latestDate": "20260508",
    "maxPrice": 85000,
    "maxPriceEok": "8억5,000",
    "minPrice": 33279,
    "minPriceEok": "3억3,279",
    "txCount": 502,
    "avg1MPrice": 53700,
    "avg1MPriceEok": "5억3,700",
    "avg1MPerPyeong": 1472,
    "avg1MTxCount": 14,
    "avg3MPrice": 53400,
    "avg3MPriceEok": "5억3,400",
    "avg3MPerPyeong": 1473,
    "avg3MTxCount": 40,
    "recent": [
      {
        "date": "05.08",
        "priceEok": "5억1,900",
        "areaPyeong": 34.197262907500004,
        "floor": 4,
        "area": 84.9991
      },
      {
        "date": "05.08",
        "priceEok": "5억3,800",
        "areaPyeong": 38.90466657,
        "floor": 2,
        "area": 96.6996
      },
      {
        "date": "05.07",
        "priceEok": "5억3,700",
        "areaPyeong": 34.197262907500004,
        "floor": 17,
        "area": 84.9991
      },
      {
        "date": "05.05",
        "priceEok": "5억6,000",
        "areaPyeong": 38.90466657,
        "floor": 7,
        "area": 96.6996
      }
    ],
    "rentTxCount": 746,
    "latestRentDeposit": 36000,
    "latestRentDepositEok": "3억6,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260501",
    "avg1MRentDeposit": 37300,
    "avg1MRentDepositEok": "3억7,300",
    "avg3MRentDeposit": 35800,
    "avg3MRentDepositEok": "3억5,800"
  },
  "동탄파크한양수자인": {
    "dong": "영천동",
    "latestPrice": 42000,
    "latestPriceEok": "4억2,000",
    "latestArea": 22.0825,
    "latestFloor": 11,
    "latestDate": "20260507",
    "maxPrice": 71800,
    "maxPriceEok": "7억1,800",
    "minPrice": 23171,
    "minPriceEok": "2억3,171",
    "txCount": 309,
    "avg1MPrice": 44400,
    "avg1MPriceEok": "4억4,400",
    "avg1MPerPyeong": 1742,
    "avg1MTxCount": 13,
    "avg3MPrice": 44200,
    "avg3MPriceEok": "4억4,200",
    "avg3MPerPyeong": 1692,
    "avg3MTxCount": 32,
    "recent": [
      {
        "date": "05.07",
        "priceEok": "4억2,000",
        "areaPyeong": 22.0825,
        "floor": 11,
        "area": 51.79
      },
      {
        "date": "05.05",
        "priceEok": "4억7,500",
        "areaPyeong": 25.41,
        "floor": 12,
        "area": 59.73
      },
      {
        "date": "05.05",
        "priceEok": "5억1,500",
        "areaPyeong": 35.9975,
        "floor": 10,
        "area": 84.65
      },
      {
        "date": "04.30",
        "priceEok": "4억6,500",
        "areaPyeong": 31.7625,
        "floor": 1,
        "area": 74.96
      }
    ],
    "rentTxCount": 390,
    "latestRentDeposit": 33000,
    "latestRentDepositEok": "3억3,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260426",
    "avg1MRentDeposit": 34400,
    "avg1MRentDepositEok": "3억4,400",
    "avg3MRentDeposit": 32500,
    "avg3MRentDepositEok": "3억2,500"
  },
  "동탄역시범호반써밋": {
    "dong": "청계동",
    "latestPrice": 115700,
    "latestPriceEok": "11억5,700",
    "latestArea": 32.9725,
    "latestFloor": 24,
    "latestDate": "20260509",
    "maxPrice": 120000,
    "maxPriceEok": "12억",
    "minPrice": 45000,
    "minPriceEok": "4억5,000",
    "txCount": 675,
    "avg1MPrice": 115400,
    "avg1MPriceEok": "11억5,400",
    "avg1MPerPyeong": 3518,
    "avg1MTxCount": 11,
    "avg3MPrice": 113500,
    "avg3MPriceEok": "11억3,500",
    "avg3MPerPyeong": 3459,
    "avg3MTxCount": 23,
    "recent": [
      {
        "date": "05.09",
        "priceEok": "11억5,700",
        "areaPyeong": 32.9725,
        "floor": 24,
        "area": 84.9698
      },
      {
        "date": "05.07",
        "priceEok": "11억9,400",
        "areaPyeong": 32.67,
        "floor": 7,
        "area": 84.9537
      },
      {
        "date": "05.07",
        "priceEok": "11억8,200",
        "areaPyeong": 32.67,
        "floor": 8,
        "area": 84.9537
      },
      {
        "date": "05.02",
        "priceEok": "11억9,000",
        "areaPyeong": 32.67,
        "floor": 9,
        "area": 84.9537
      }
    ],
    "rentTxCount": 1072,
    "latestRentDeposit": 78200,
    "latestRentDepositEok": "7억8,200",
    "latestRentMonthly": 0,
    "latestRentDate": "20260504",
    "avg1MRentDeposit": 65900,
    "avg1MRentDepositEok": "6억5,900",
    "avg3MRentDeposit": 61100,
    "avg3MRentDepositEok": "6억1,100"
  },
  "동탄역시범예미지아파트": {
    "dong": "",
    "latestPrice": 98000,
    "latestPriceEok": "9억8,000",
    "latestArea": 30.25,
    "latestFloor": 4,
    "latestDate": "20260507",
    "maxPrice": 118000,
    "maxPriceEok": "11억8,000",
    "minPrice": 38375,
    "minPriceEok": "3억8,375",
    "txCount": 331,
    "avg1MPrice": 107300,
    "avg1MPriceEok": "10억7,300",
    "avg1MPerPyeong": 3273,
    "avg1MTxCount": 9,
    "avg3MPrice": 105500,
    "avg3MPriceEok": "10억5,500",
    "avg3MPerPyeong": 3224,
    "avg3MTxCount": 14,
    "recent": [
      {
        "date": "05.07",
        "priceEok": "9억8,000",
        "areaPyeong": 30.25,
        "floor": 4,
        "area": 74.9682
      },
      {
        "date": "05.06",
        "priceEok": "10억4,000",
        "areaPyeong": 34.1825,
        "floor": 2,
        "area": 84.9486
      },
      {
        "date": "05.02",
        "priceEok": "11억4,500",
        "areaPyeong": 32.9725,
        "floor": 5,
        "area": 84.8
      },
      {
        "date": "04.28",
        "priceEok": "10억9,000",
        "areaPyeong": 34.1825,
        "floor": 3,
        "area": 84.9486
      }
    ],
    "rentTxCount": 477,
    "latestRentDeposit": 10000,
    "latestRentDepositEok": "1억",
    "latestRentMonthly": 130,
    "latestRentDate": "20260430",
    "avg1MRentDeposit": 50200,
    "avg1MRentDepositEok": "5억200",
    "avg3MRentDeposit": 48500,
    "avg3MRentDepositEok": "4억8,500"
  },
  "동탄역반도유보라아이비파크2.0": {
    "dong": "영천동",
    "latestPrice": 68700,
    "latestPriceEok": "6억8,700",
    "latestArea": 33.275,
    "latestFloor": 10,
    "latestDate": "20260507",
    "maxPrice": 78500,
    "maxPriceEok": "7억8,500",
    "minPrice": 35000,
    "minPriceEok": "3억5,000",
    "txCount": 676,
    "avg1MPrice": 65600,
    "avg1MPriceEok": "6억5,600",
    "avg1MPerPyeong": 2016,
    "avg1MTxCount": 10,
    "avg3MPrice": 65200,
    "avg3MPriceEok": "6억5,200",
    "avg3MPerPyeong": 2001,
    "avg3MTxCount": 19,
    "recent": [
      {
        "date": "05.07",
        "priceEok": "6억8,700",
        "areaPyeong": 33.275,
        "floor": 10,
        "area": 84.9921
      },
      {
        "date": "05.06",
        "priceEok": "6억8,300",
        "areaPyeong": 33.275,
        "floor": 14,
        "area": 84.9921
      },
      {
        "date": "04.29",
        "priceEok": "6억7,800",
        "areaPyeong": 33.5775,
        "floor": 9,
        "area": 84.96
      },
      {
        "date": "04.26",
        "priceEok": "6억3,000",
        "areaPyeong": 29.645,
        "floor": 8,
        "area": 74.364
      }
    ],
    "rentTxCount": 616,
    "latestRentDeposit": 44000,
    "latestRentDepositEok": "4억4,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260507",
    "avg1MRentDeposit": 41500,
    "avg1MRentDepositEok": "4억1,500",
    "avg3MRentDeposit": 40400,
    "avg3MRentDepositEok": "4억400"
  },
  "동탄역더힐": {
    "dong": "청계동",
    "latestPrice": 67800,
    "latestPriceEok": "6억7,800",
    "latestArea": 33.5775,
    "latestFloor": 7,
    "latestDate": "20260509",
    "maxPrice": 94500,
    "maxPriceEok": "9억4,500",
    "minPrice": 34800,
    "minPriceEok": "3억4,800",
    "txCount": 444,
    "avg1MPrice": 65400,
    "avg1MPriceEok": "6억5,400",
    "avg1MPerPyeong": 1956,
    "avg1MTxCount": 7,
    "avg3MPrice": 65400,
    "avg3MPriceEok": "6억5,400",
    "avg3MPerPyeong": 1958,
    "avg3MTxCount": 15,
    "recent": [
      {
        "date": "05.09",
        "priceEok": "6억7,800",
        "areaPyeong": 33.5775,
        "floor": 7,
        "area": 85.203
      },
      {
        "date": "05.09",
        "priceEok": "6억7,500",
        "areaPyeong": 33.5775,
        "floor": 4,
        "area": 85.203
      },
      {
        "date": "05.07",
        "priceEok": "6억2,000",
        "areaPyeong": 33.275,
        "floor": 2,
        "area": 84.5202
      },
      {
        "date": "04.24",
        "priceEok": "6억7,400",
        "areaPyeong": 33.5775,
        "floor": 7,
        "area": 85.203
      }
    ],
    "rentTxCount": 850,
    "latestRentDeposit": 38640,
    "latestRentDepositEok": "3억8,640",
    "latestRentMonthly": 0,
    "latestRentDate": "20260507",
    "avg1MRentDeposit": 39800,
    "avg1MRentDepositEok": "3억9,800",
    "avg3MRentDeposit": 39900,
    "avg3MRentDepositEok": "3억9,900"
  },
  "동탄숲속마을모아미래도1단지": {
    "dong": "",
    "latestPrice": 56000,
    "latestPriceEok": "5억6,000",
    "latestArea": 23.8975,
    "latestFloor": 9,
    "latestDate": "20260509",
    "maxPrice": 69000,
    "maxPriceEok": "6억9,000",
    "minPrice": 15860,
    "minPriceEok": "1억5,860",
    "txCount": 1254,
    "avg1MPrice": 53500,
    "avg1MPriceEok": "5억3,500",
    "avg1MPerPyeong": 2201,
    "avg1MTxCount": 7,
    "avg3MPrice": 54100,
    "avg3MPriceEok": "5억4,100",
    "avg3MPerPyeong": 2082,
    "avg3MTxCount": 25,
    "recent": [
      {
        "date": "05.09",
        "priceEok": "5억6,000",
        "areaPyeong": 23.8975,
        "floor": 9,
        "area": 59.37
      },
      {
        "date": "05.07",
        "priceEok": "5억5,500",
        "areaPyeong": 25.41,
        "floor": 22,
        "area": 60.49
      },
      {
        "date": "04.27",
        "priceEok": "4억6,500",
        "areaPyeong": 25.41,
        "floor": 1,
        "area": 60.49
      },
      {
        "date": "04.23",
        "priceEok": "5억4,300",
        "areaPyeong": 23.8975,
        "floor": 12,
        "area": 59.37
      }
    ],
    "rentTxCount": 1164,
    "latestRentDeposit": 26600,
    "latestRentDepositEok": "2억6,600",
    "latestRentMonthly": 0,
    "latestRentDate": "20260502",
    "avg1MRentDeposit": 30200,
    "avg1MRentDepositEok": "3억200",
    "avg3MRentDeposit": 28300,
    "avg3MRentDepositEok": "2억8,300"
  },
  "동탄2신도시호반베르디움33단지": {
    "dong": "",
    "latestPrice": 50500,
    "latestPriceEok": "5억500",
    "latestArea": 34.1825,
    "latestFloor": 2,
    "latestDate": "20260509",
    "maxPrice": 71800,
    "maxPriceEok": "7억1,800",
    "minPrice": 33400,
    "minPriceEok": "3억3,400",
    "txCount": 164,
    "avg1MPrice": 49000,
    "avg1MPriceEok": "4억9,000",
    "avg1MPerPyeong": 1515,
    "avg1MTxCount": 5,
    "avg3MPrice": 48800,
    "avg3MPriceEok": "4억8,800",
    "avg3MPerPyeong": 1501,
    "avg3MTxCount": 11,
    "recent": [
      {
        "date": "05.09",
        "priceEok": "5억500",
        "areaPyeong": 34.1825,
        "floor": 2,
        "area": 84.9025
      },
      {
        "date": "05.07",
        "priceEok": "5억3,200",
        "areaPyeong": 34.1825,
        "floor": 15,
        "area": 84.9025
      },
      {
        "date": "04.23",
        "priceEok": "4억7,500",
        "areaPyeong": 31.1575,
        "floor": 3,
        "area": 76.7676
      },
      {
        "date": "04.22",
        "priceEok": "4억8,000",
        "areaPyeong": 31.1575,
        "floor": 14,
        "area": 76.7676
      }
    ],
    "rentTxCount": 276,
    "latestRentDeposit": 5000,
    "latestRentDepositEok": "5,000만",
    "latestRentMonthly": 150,
    "latestRentDate": "20260414",
    "avg1MRentDeposit": 37700,
    "avg1MRentDepositEok": "3억7,700",
    "avg3MRentDeposit": 34300,
    "avg3MRentDepositEok": "3억4,300"
  },
  "동탄2신도시호반베르디움22단지": {
    "dong": "",
    "latestPrice": 59800,
    "latestPriceEok": "5억9,800",
    "latestArea": 23.2925,
    "latestFloor": 11,
    "latestDate": "20260509",
    "maxPrice": 64900,
    "maxPriceEok": "6억4,900",
    "minPrice": 27468,
    "minPriceEok": "2억7,468",
    "txCount": 525,
    "avg1MPrice": 56900,
    "avg1MPriceEok": "5억6,900",
    "avg1MPerPyeong": 2432,
    "avg1MTxCount": 6,
    "avg3MPrice": 55700,
    "avg3MPriceEok": "5억5,700",
    "avg3MPerPyeong": 2385,
    "avg3MTxCount": 35,
    "recent": [
      {
        "date": "05.09",
        "priceEok": "5억9,800",
        "areaPyeong": 23.2925,
        "floor": 11,
        "area": 53.4754
      },
      {
        "date": "05.09",
        "priceEok": "5억5,500",
        "areaPyeong": 23.2925,
        "floor": 7,
        "area": 53.4754
      },
      {
        "date": "05.07",
        "priceEok": "5억7,900",
        "areaPyeong": 23.2925,
        "floor": 15,
        "area": 53.4754
      },
      {
        "date": "04.22",
        "priceEok": "5억9,900",
        "areaPyeong": 23.595,
        "floor": 11,
        "area": 53.788
      }
    ],
    "rentTxCount": 793,
    "latestRentDeposit": 31500,
    "latestRentDepositEok": "3억1,500",
    "latestRentMonthly": 0,
    "latestRentDate": "20260507",
    "avg1MRentDeposit": 32200,
    "avg1MRentDepositEok": "3억2,200",
    "avg3MRentDeposit": 32700,
    "avg3MRentDepositEok": "3억2,700"
  },
  "나루마을월드메르디앙반도유보라": {
    "dong": "",
    "latestPrice": 76500,
    "latestPriceEok": "7억6,500",
    "latestArea": 42.652499999999996,
    "latestFloor": 14,
    "latestDate": "20260507",
    "maxPrice": 109500,
    "maxPriceEok": "10억9,500",
    "minPrice": 34700,
    "minPriceEok": "3억4,700",
    "txCount": 524,
    "avg1MPrice": 82100,
    "avg1MPriceEok": "8억2,100",
    "avg1MPerPyeong": 1842,
    "avg1MTxCount": 5,
    "avg3MPrice": 81900,
    "avg3MPriceEok": "8억1,900",
    "avg3MPerPyeong": 1799,
    "avg3MTxCount": 10,
    "recent": [
      {
        "date": "05.07",
        "priceEok": "7억6,500",
        "areaPyeong": 42.652499999999996,
        "floor": 14,
        "area": 110.7323
      },
      {
        "date": "04.30",
        "priceEok": "10억7,000",
        "areaPyeong": 51.425,
        "floor": 16,
        "area": 139.4524
      },
      {
        "date": "04.24",
        "priceEok": "8억7,000",
        "areaPyeong": 51.425,
        "floor": 4,
        "area": 139.4524
      },
      {
        "date": "04.14",
        "priceEok": "7억",
        "areaPyeong": 38.4175,
        "floor": 9,
        "area": 101.9599
      }
    ],
    "rentTxCount": 727,
    "latestRentDeposit": 40000,
    "latestRentDepositEok": "4억",
    "latestRentMonthly": 0,
    "latestRentDate": "20260410",
    "avg1MRentDeposit": 40000,
    "avg1MRentDepositEok": "4억",
    "avg3MRentDeposit": 53800,
    "avg3MRentDepositEok": "5억3,800"
  },
  "나루마을신도브래뉴": {
    "dong": "",
    "latestPrice": 85700,
    "latestPriceEok": "8억5,700",
    "latestArea": 41.442499999999995,
    "latestFloor": 18,
    "latestDate": "20260507",
    "maxPrice": 100000,
    "maxPriceEok": "10억",
    "minPrice": 32100,
    "minPriceEok": "3억2,100",
    "txCount": 783,
    "avg1MPrice": 85800,
    "avg1MPriceEok": "8억5,800",
    "avg1MPerPyeong": 2107,
    "avg1MTxCount": 5,
    "avg3MPrice": 85900,
    "avg3MPriceEok": "8억5,900",
    "avg3MPerPyeong": 2127,
    "avg3MTxCount": 9,
    "recent": [
      {
        "date": "05.07",
        "priceEok": "8억5,700",
        "areaPyeong": 41.442499999999995,
        "floor": 18,
        "area": 103.9466
      },
      {
        "date": "05.01",
        "priceEok": "8억4,900",
        "areaPyeong": 38.4175,
        "floor": 20,
        "area": 96.4338
      },
      {
        "date": "04.29",
        "priceEok": "8억3,000",
        "areaPyeong": 38.4175,
        "floor": 6,
        "area": 96.4338
      },
      {
        "date": "04.28",
        "priceEok": "8억4,800",
        "areaPyeong": 38.4175,
        "floor": 26,
        "area": 96.4338
      }
    ],
    "rentTxCount": 705,
    "latestRentDeposit": 55000,
    "latestRentDepositEok": "5억5,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260430",
    "avg1MRentDeposit": 56800,
    "avg1MRentDepositEok": "5억6,800",
    "avg3MRentDeposit": 54700,
    "avg3MRentDepositEok": "5억4,700"
  },
  "힐스테이트동탄": {
    "dong": "",
    "latestPrice": 88500,
    "latestPriceEok": "8억8,500",
    "latestArea": 34.136431367499995,
    "latestFloor": 33,
    "latestDate": "20260508",
    "maxPrice": 96500,
    "maxPriceEok": "9억6,500",
    "minPrice": 40332,
    "minPriceEok": "4억332",
    "txCount": 468,
    "avg1MPrice": 81700,
    "avg1MPriceEok": "8억1,700",
    "avg1MPerPyeong": 2531,
    "avg1MTxCount": 11,
    "avg3MPrice": 79200,
    "avg3MPriceEok": "7억9,200",
    "avg3MPerPyeong": 2480,
    "avg3MTxCount": 45,
    "recent": [
      {
        "date": "05.08",
        "priceEok": "8억8,500",
        "areaPyeong": 34.136431367499995,
        "floor": 33,
        "area": 84.8479
      },
      {
        "date": "05.06",
        "priceEok": "7억4,200",
        "areaPyeong": 30.133378082500002,
        "floor": 10,
        "area": 74.8981
      },
      {
        "date": "05.05",
        "priceEok": "8억2,800",
        "areaPyeong": 30.164598502500002,
        "floor": 14,
        "area": 74.9757
      },
      {
        "date": "04.27",
        "priceEok": "8억7,200",
        "areaPyeong": 34.136431367499995,
        "floor": 11,
        "area": 84.8479
      }
    ],
    "rentTxCount": 643,
    "latestRentDeposit": 29000,
    "latestRentDepositEok": "2억9,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260507",
    "avg1MRentDeposit": 43000,
    "avg1MRentDepositEok": "4억3,000",
    "avg3MRentDeposit": 41900,
    "avg3MRentDepositEok": "4억1,900"
  },
  "한신더휴": {
    "dong": "",
    "latestPrice": 74500,
    "latestPriceEok": "7억4,500",
    "latestArea": 33.6942761925,
    "latestFloor": 6,
    "latestDate": "20260504",
    "maxPrice": 80900,
    "maxPriceEok": "8억900",
    "minPrice": 37465,
    "minPriceEok": "3억7,465",
    "txCount": 320,
    "avg1MPrice": 72000,
    "avg1MPriceEok": "7억2,000",
    "avg1MPerPyeong": 2177,
    "avg1MTxCount": 5,
    "avg3MPrice": 69300,
    "avg3MPriceEok": "6억9,300",
    "avg3MPerPyeong": 2154,
    "avg3MTxCount": 20,
    "recent": [
      {
        "date": "05.04",
        "priceEok": "7억4,500",
        "areaPyeong": 33.6942761925,
        "floor": 6,
        "area": 83.7489
      },
      {
        "date": "04.28",
        "priceEok": "7억2,500",
        "areaPyeong": 33.560422665000004,
        "floor": 21,
        "area": 83.4162
      },
      {
        "date": "04.28",
        "priceEok": "7억5,000",
        "areaPyeong": 33.6942761925,
        "floor": 10,
        "area": 83.7489
      },
      {
        "date": "04.18",
        "priceEok": "6억6,900",
        "areaPyeong": 30.7663157725,
        "floor": 6,
        "area": 76.4713
      }
    ],
    "rentTxCount": 407,
    "latestRentDeposit": 5000,
    "latestRentDepositEok": "5,000만",
    "latestRentMonthly": 158,
    "latestRentDate": "20260507",
    "avg1MRentDeposit": 39000,
    "avg1MRentDepositEok": "3억9,000",
    "avg3MRentDeposit": 38800,
    "avg3MRentDepositEok": "3억8,800"
  },
  "레이크반도유보라아이비파크9.0": {
    "dong": "장지동",
    "latestPrice": 59500,
    "latestPriceEok": "5억9,500",
    "latestArea": 41.036345350000005,
    "latestFloor": 12,
    "latestDate": "20260429",
    "maxPrice": 103000,
    "maxPriceEok": "10억3,000",
    "minPrice": 38900,
    "minPriceEok": "3억8,900",
    "txCount": 259,
    "avg1MPrice": 59500,
    "avg1MPriceEok": "5억9,500",
    "avg1MPerPyeong": 1450,
    "avg1MTxCount": 1,
    "avg3MPrice": 63400,
    "avg3MPriceEok": "6억3,400",
    "avg3MPerPyeong": 1534,
    "avg3MTxCount": 10,
    "recent": [
      {
        "date": "04.29",
        "priceEok": "5억9,500",
        "areaPyeong": 41.036345350000005,
        "floor": 12,
        "area": 101.998
      },
      {
        "date": "04.11",
        "priceEok": "6억2,800",
        "areaPyeong": 41.036345350000005,
        "floor": 10,
        "area": 101.998
      },
      {
        "date": "04.11",
        "priceEok": "6억7,500",
        "areaPyeong": 41.9871600225,
        "floor": 5,
        "area": 104.3613
      },
      {
        "date": "04.10",
        "priceEok": "6억2,800",
        "areaPyeong": 41.036345350000005,
        "floor": 18,
        "area": 101.998
      }
    ],
    "rentTxCount": 327,
    "latestRentDeposit": 40000,
    "latestRentDepositEok": "4억",
    "latestRentMonthly": 0,
    "latestRentDate": "20260507",
    "avg1MRentDeposit": 40100,
    "avg1MRentDepositEok": "4억100",
    "avg3MRentDeposit": 38700,
    "avg3MRentDepositEok": "3억8,700"
  },
  "동탄호수자이파밀리에": {
    "dong": "장지동",
    "latestPrice": 71000,
    "latestPriceEok": "7억1,000",
    "latestArea": 34.101067,
    "latestFloor": 20,
    "latestDate": "20260426",
    "maxPrice": 95000,
    "maxPriceEok": "9억5,000",
    "minPrice": 27300,
    "minPriceEok": "2억7,300",
    "txCount": 532,
    "avg1MPrice": 62700,
    "avg1MPriceEok": "6억2,700",
    "avg1MPerPyeong": 2363,
    "avg1MTxCount": 8,
    "avg3MPrice": 56700,
    "avg3MPriceEok": "5억6,700",
    "avg3MPerPyeong": 2339,
    "avg3MTxCount": 31,
    "recent": [
      {
        "date": "04.26",
        "priceEok": "7억1,000",
        "areaPyeong": 34.101067,
        "floor": 20,
        "area": 84.76
      },
      {
        "date": "04.23",
        "priceEok": "6억4,800",
        "areaPyeong": 30.130119250000003,
        "floor": 2,
        "area": 74.89
      },
      {
        "date": "04.20",
        "priceEok": "6억4,000",
        "areaPyeong": 23.994663000000003,
        "floor": 11,
        "area": 59.64
      },
      {
        "date": "04.20",
        "priceEok": "7억3,900",
        "areaPyeong": 34.101067,
        "floor": 9,
        "area": 84.76
      }
    ],
    "rentTxCount": 911,
    "latestRentDeposit": 31500,
    "latestRentDepositEok": "3억1,500",
    "latestRentMonthly": 0,
    "latestRentDate": "20260507",
    "avg1MRentDeposit": 36400,
    "avg1MRentDepositEok": "3억6,400",
    "avg3MRentDeposit": 35600,
    "avg3MRentDepositEok": "3억5,600"
  },
  "호수공원역센트럴시티": {
    "dong": "산척동",
    "latestPrice": 82000,
    "latestPriceEok": "8억2,000",
    "latestArea": 34.0130785225,
    "latestFloor": 1,
    "latestDate": "20260506",
    "maxPrice": 119000,
    "maxPriceEok": "11억9,000",
    "minPrice": 36000,
    "minPriceEok": "3억6,000",
    "txCount": 275,
    "avg1MPrice": 87500,
    "avg1MPriceEok": "8억7,500",
    "avg1MPerPyeong": 2666,
    "avg1MTxCount": 9,
    "avg3MPrice": 88400,
    "avg3MPriceEok": "8억8,400",
    "avg3MPerPyeong": 2656,
    "avg3MTxCount": 29,
    "recent": [
      {
        "date": "05.06",
        "priceEok": "8억2,000",
        "areaPyeong": 34.0130785225,
        "floor": 1,
        "area": 84.5413
      },
      {
        "date": "04.30",
        "priceEok": "8억2,200",
        "areaPyeong": 34.0130785225,
        "floor": 1,
        "area": 84.5413
      },
      {
        "date": "04.28",
        "priceEok": "9억1,500",
        "areaPyeong": 34.0130785225,
        "floor": 27,
        "area": 84.5413
      },
      {
        "date": "04.24",
        "priceEok": "9억3,000",
        "areaPyeong": 34.004509,
        "floor": 23,
        "area": 84.52
      }
    ],
    "rentTxCount": 776,
    "latestRentDeposit": 44100,
    "latestRentDepositEok": "4억4,100",
    "latestRentMonthly": 0,
    "latestRentDate": "20260502",
    "avg1MRentDeposit": 47100,
    "avg1MRentDepositEok": "4억7,100",
    "avg3MRentDeposit": 46600,
    "avg3MRentDepositEok": "4억6,600"
  },
  "호반베르디움센트럴포레": {
    "dong": "",
    "latestPrice": 59500,
    "latestPriceEok": "5억9,500",
    "latestArea": 34.132770210000004,
    "latestFloor": 4,
    "latestDate": "20260508",
    "maxPrice": 85000,
    "maxPriceEok": "8억5,000",
    "minPrice": 35000,
    "minPriceEok": "3억5,000",
    "txCount": 655,
    "avg1MPrice": 62200,
    "avg1MPriceEok": "6억2,200",
    "avg1MPerPyeong": 1788,
    "avg1MTxCount": 15,
    "avg3MPrice": 61900,
    "avg3MPriceEok": "6억1,900",
    "avg3MPerPyeong": 1788,
    "avg3MTxCount": 31,
    "recent": [
      {
        "date": "05.08",
        "priceEok": "5억9,500",
        "areaPyeong": 34.132770210000004,
        "floor": 4,
        "area": 84.8388
      },
      {
        "date": "05.06",
        "priceEok": "6억2,700",
        "areaPyeong": 39.4880780525,
        "floor": 5,
        "area": 98.1497
      },
      {
        "date": "05.05",
        "priceEok": "6억4,800",
        "areaPyeong": 34.132770210000004,
        "floor": 5,
        "area": 84.8388
      },
      {
        "date": "05.05",
        "priceEok": "6억1,500",
        "areaPyeong": 34.064455425,
        "floor": 13,
        "area": 84.669
      }
    ],
    "rentTxCount": 904,
    "latestRentDeposit": 39900,
    "latestRentDepositEok": "3억9,900",
    "latestRentMonthly": 0,
    "latestRentDate": "20260503",
    "avg1MRentDeposit": 38200,
    "avg1MRentDepositEok": "3억8,200",
    "avg3MRentDeposit": 36400,
    "avg3MRentDepositEok": "3억6,400"
  },
  "포스코더샵2차": {
    "dong": "",
    "latestPrice": 54350,
    "latestPriceEok": "5억4,350",
    "latestArea": 30.791380620000005,
    "latestFloor": 22,
    "latestDate": "20260506",
    "maxPrice": 88000,
    "maxPriceEok": "8억8,000",
    "minPrice": 23260,
    "minPriceEok": "2억3,260",
    "txCount": 1413,
    "avg1MPrice": 61500,
    "avg1MPriceEok": "6억1,500",
    "avg1MPerPyeong": 1869,
    "avg1MTxCount": 3,
    "avg3MPrice": 58200,
    "avg3MPriceEok": "5억8,200",
    "avg3MPerPyeong": 1759,
    "avg3MTxCount": 20,
    "recent": [
      {
        "date": "05.06",
        "priceEok": "5억4,350",
        "areaPyeong": 30.791380620000005,
        "floor": 22,
        "area": 76.5336
      },
      {
        "date": "05.04",
        "priceEok": "6억5,600",
        "areaPyeong": 33.805559287499996,
        "floor": 19,
        "area": 84.0255
      },
      {
        "date": "04.30",
        "priceEok": "6억4,500",
        "areaPyeong": 33.9191758675,
        "floor": 17,
        "area": 84.3079
      },
      {
        "date": "04.10",
        "priceEok": "6억5,200",
        "areaPyeong": 40.66749379,
        "floor": 7,
        "area": 101.0812
      }
    ],
    "rentTxCount": 1459,
    "latestRentDeposit": 5000,
    "latestRentDepositEok": "5,000만",
    "latestRentMonthly": 145,
    "latestRentDate": "20260429",
    "avg1MRentDeposit": 34500,
    "avg1MRentDepositEok": "3억4,500",
    "avg3MRentDeposit": 34700,
    "avg3MRentDepositEok": "3억4,700"
  },
  "제일풍경채에듀앤파크": {
    "dong": "",
    "latestPrice": 51300,
    "latestPriceEok": "5억1,300",
    "latestArea": 30.7217381625,
    "latestFloor": 3,
    "latestDate": "20260509",
    "maxPrice": 72200,
    "maxPriceEok": "7억2,200",
    "minPrice": 27300,
    "minPriceEok": "2억7,300",
    "txCount": 211,
    "avg1MPrice": 47600,
    "avg1MPriceEok": "4억7,600",
    "avg1MPerPyeong": 1851,
    "avg1MTxCount": 7,
    "avg3MPrice": 49400,
    "avg3MPriceEok": "4억9,400",
    "avg3MPerPyeong": 1847,
    "avg3MTxCount": 23,
    "recent": [
      {
        "date": "05.09",
        "priceEok": "5억1,300",
        "areaPyeong": 30.7217381625,
        "floor": 3,
        "area": 76.3605
      },
      {
        "date": "05.06",
        "priceEok": "4억5,700",
        "areaPyeong": 23.969115362500002,
        "floor": 4,
        "area": 59.5765
      },
      {
        "date": "05.04",
        "priceEok": "4억5,900",
        "areaPyeong": 23.969115362500002,
        "floor": 8,
        "area": 59.5765
      },
      {
        "date": "04.28",
        "priceEok": "5억2,500",
        "areaPyeong": 30.7217381625,
        "floor": 3,
        "area": 76.3605
      }
    ],
    "rentTxCount": 466,
    "latestRentDeposit": 3000,
    "latestRentDepositEok": "3,000만",
    "latestRentMonthly": 126,
    "latestRentDate": "20260430",
    "avg1MRentDeposit": 32100,
    "avg1MRentDepositEok": "3억2,100",
    "avg3MRentDeposit": 33400,
    "avg3MRentDepositEok": "3억3,400"
  },
  "산척동,동탄호수공원금강펜테리움센트럴파크Ⅱ": {
    "dong": "",
    "latestPrice": 52000,
    "latestPriceEok": "5억2,000",
    "latestArea": 28.159450935000002,
    "latestFloor": 11,
    "latestDate": "20260509",
    "maxPrice": 61500,
    "maxPriceEok": "6억1,500",
    "minPrice": 40000,
    "minPriceEok": "4억",
    "txCount": 230,
    "avg1MPrice": 55700,
    "avg1MPriceEok": "5억5,700",
    "avg1MPerPyeong": 1728,
    "avg1MTxCount": 10,
    "avg3MPrice": 55300,
    "avg3MPriceEok": "5억5,300",
    "avg3MPerPyeong": 1709,
    "avg3MTxCount": 35,
    "recent": [
      {
        "date": "05.09",
        "priceEok": "5억2,000",
        "areaPyeong": 28.159450935000002,
        "floor": 11,
        "area": 69.9918
      },
      {
        "date": "05.06",
        "priceEok": "5억6,400",
        "areaPyeong": 34.19746407,
        "floor": 9,
        "area": 84.9996
      },
      {
        "date": "05.04",
        "priceEok": "5억8,200",
        "areaPyeong": 34.19746407,
        "floor": 15,
        "area": 84.9996
      },
      {
        "date": "05.01",
        "priceEok": "5억6,500",
        "areaPyeong": 34.19746407,
        "floor": 17,
        "area": 84.9996
      }
    ],
    "rentTxCount": 305,
    "latestRentDeposit": 42000,
    "latestRentDepositEok": "4억2,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260420",
    "avg1MRentDeposit": 38500,
    "avg1MRentDepositEok": "3억8,500",
    "avg3MRentDeposit": 38200,
    "avg3MRentDepositEok": "3억8,200"
  },
  "동탄파크자이": {
    "dong": "",
    "latestPrice": 76000,
    "latestPriceEok": "7억6,000",
    "latestArea": 40.108503435,
    "latestFloor": 5,
    "latestDate": "20260506",
    "maxPrice": 115000,
    "maxPriceEok": "11억5,000",
    "minPrice": 54600,
    "minPriceEok": "5억4,600",
    "txCount": 221,
    "avg1MPrice": 78700,
    "avg1MPriceEok": "7억8,700",
    "avg1MPerPyeong": 1987,
    "avg1MTxCount": 7,
    "avg3MPrice": 79400,
    "avg3MPriceEok": "7억9,400",
    "avg3MPerPyeong": 1988,
    "avg3MTxCount": 22,
    "recent": [
      {
        "date": "05.06",
        "priceEok": "7억6,000",
        "areaPyeong": 40.108503435,
        "floor": 5,
        "area": 99.6918
      },
      {
        "date": "04.29",
        "priceEok": "8억5,000",
        "areaPyeong": 40.108503435,
        "floor": 8,
        "area": 99.6918
      },
      {
        "date": "04.29",
        "priceEok": "8억2,000",
        "areaPyeong": 40.108503435,
        "floor": 13,
        "area": 99.6918
      },
      {
        "date": "04.24",
        "priceEok": "8억5,000",
        "areaPyeong": 41.607727315,
        "floor": 3,
        "area": 103.4182
      }
    ],
    "rentTxCount": 280,
    "latestRentDeposit": 50000,
    "latestRentDepositEok": "5억",
    "latestRentMonthly": 0,
    "latestRentDate": "20260423",
    "avg1MRentDeposit": 50000,
    "avg1MRentDepositEok": "5억",
    "avg3MRentDeposit": 50800,
    "avg3MRentDepositEok": "5억800"
  },
  "동탄역센트럴푸르지오": {
    "dong": "청계동",
    "latestPrice": 80000,
    "latestPriceEok": "8억",
    "latestArea": 24.805,
    "latestFloor": 6,
    "latestDate": "20260511",
    "maxPrice": 94500,
    "maxPriceEok": "9억4,500",
    "minPrice": 31000,
    "minPriceEok": "3억1,000",
    "txCount": 1166,
    "avg1MPrice": 84200,
    "avg1MPriceEok": "8억4,200",
    "avg1MPerPyeong": 3245,
    "avg1MTxCount": 8,
    "avg3MPrice": 81600,
    "avg3MPriceEok": "8억1,600",
    "avg3MPerPyeong": 3162,
    "avg3MTxCount": 23,
    "recent": [
      {
        "date": "05.11",
        "priceEok": "8억",
        "areaPyeong": 24.805,
        "floor": 6,
        "area": 59.4313
      },
      {
        "date": "05.09",
        "priceEok": "9억1,500",
        "areaPyeong": 29.645,
        "floor": 13,
        "area": 74.9061
      },
      {
        "date": "05.06",
        "priceEok": "8억2,500",
        "areaPyeong": 25.107499999999998,
        "floor": 12,
        "area": 59.3401
      },
      {
        "date": "05.02",
        "priceEok": "8억4,700",
        "areaPyeong": 24.805,
        "floor": 23,
        "area": 59.4313
      }
    ],
    "rentTxCount": 1625,
    "latestRentDeposit": 37800,
    "latestRentDepositEok": "3억7,800",
    "latestRentMonthly": 0,
    "latestRentDate": "20260504",
    "avg1MRentDeposit": 39100,
    "avg1MRentDepositEok": "3억9,100",
    "avg3MRentDeposit": 40000,
    "avg3MRentDepositEok": "4억"
  },
  "동탄역센트럴예미지": {
    "dong": "영천동",
    "latestPrice": 108000,
    "latestPriceEok": "10억8,000",
    "latestArea": 38.72,
    "latestFloor": 19,
    "latestDate": "20260506",
    "maxPrice": 124000,
    "maxPriceEok": "12억4,000",
    "minPrice": 54000,
    "minPriceEok": "5억4,000",
    "txCount": 142,
    "avg1MPrice": 105100,
    "avg1MPriceEok": "10억5,100",
    "avg1MPerPyeong": 2714,
    "avg1MTxCount": 5,
    "avg3MPrice": 100700,
    "avg3MPriceEok": "10억700",
    "avg3MPerPyeong": 2716,
    "avg3MTxCount": 10,
    "recent": [
      {
        "date": "05.06",
        "priceEok": "10억8,000",
        "areaPyeong": 38.72,
        "floor": 19,
        "area": 96.9959
      },
      {
        "date": "05.05",
        "priceEok": "10억5,500",
        "areaPyeong": 38.72,
        "floor": 22,
        "area": 96.9959
      },
      {
        "date": "04.29",
        "priceEok": "10억8,000",
        "areaPyeong": 38.72,
        "floor": 19,
        "area": 96.9959
      },
      {
        "date": "04.24",
        "priceEok": "10억6,000",
        "areaPyeong": 38.72,
        "floor": 16,
        "area": 96.9959
      }
    ],
    "rentTxCount": 265,
    "latestRentDeposit": 55000,
    "latestRentDepositEok": "5억5,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260430",
    "avg1MRentDeposit": 57400,
    "avg1MRentDepositEok": "5억7,400",
    "avg3MRentDeposit": 54900,
    "avg3MRentDepositEok": "5억4,900"
  },
  "동탄역대방디엠시티더센텀": {
    "dong": "영천동",
    "latestPrice": 75000,
    "latestPriceEok": "7억5,000",
    "latestArea": 22.99,
    "latestFloor": 21,
    "latestDate": "20260509",
    "maxPrice": 86000,
    "maxPriceEok": "8억6,000",
    "minPrice": 51000,
    "minPriceEok": "5억1,000",
    "txCount": 137,
    "avg1MPrice": 74600,
    "avg1MPriceEok": "7억4,600",
    "avg1MPerPyeong": 3081,
    "avg1MTxCount": 11,
    "avg3MPrice": 72500,
    "avg3MPriceEok": "7억2,500",
    "avg3MPerPyeong": 3016,
    "avg3MTxCount": 23,
    "recent": [
      {
        "date": "05.09",
        "priceEok": "7억5,000",
        "areaPyeong": 22.99,
        "floor": 21,
        "area": 56.361
      },
      {
        "date": "05.09",
        "priceEok": "7억8,000",
        "areaPyeong": 24.502499999999998,
        "floor": 36,
        "area": 59.4656
      },
      {
        "date": "05.09",
        "priceEok": "7억2,000",
        "areaPyeong": 24.502499999999998,
        "floor": 10,
        "area": 59.4656
      },
      {
        "date": "05.06",
        "priceEok": "7억7,500",
        "areaPyeong": 24.502499999999998,
        "floor": 32,
        "area": 59.4656
      }
    ],
    "rentTxCount": 389,
    "latestRentDeposit": 10000,
    "latestRentDepositEok": "1억",
    "latestRentMonthly": 150,
    "latestRentDate": "20260501",
    "avg1MRentDeposit": 45400,
    "avg1MRentDepositEok": "4억5,400",
    "avg3MRentDeposit": 41600,
    "avg3MRentDepositEok": "4억1,600"
  },
  "동탄역호반써밋": {
    "dong": "청계동",
    "latestPrice": 81000,
    "latestPriceEok": "8억1,000",
    "latestArea": 24.2,
    "latestFloor": 7,
    "latestDate": "20260509",
    "maxPrice": 90000,
    "maxPriceEok": "9억",
    "minPrice": 28000,
    "minPriceEok": "2억8,000",
    "txCount": 751,
    "avg1MPrice": 81700,
    "avg1MPriceEok": "8억1,700",
    "avg1MPerPyeong": 2907,
    "avg1MTxCount": 12,
    "avg3MPrice": 80400,
    "avg3MPriceEok": "8억400",
    "avg3MPerPyeong": 2935,
    "avg3MTxCount": 24,
    "recent": [
      {
        "date": "05.09",
        "priceEok": "8억1,000",
        "areaPyeong": 24.2,
        "floor": 7,
        "area": 59.8365
      },
      {
        "date": "05.06",
        "priceEok": "7억7,000",
        "areaPyeong": 24.2,
        "floor": 11,
        "area": 59.417
      },
      {
        "date": "04.30",
        "priceEok": "7억9,500",
        "areaPyeong": 24.2,
        "floor": 23,
        "area": 59.8365
      },
      {
        "date": "04.30",
        "priceEok": "8억7,800",
        "areaPyeong": 32.67,
        "floor": 4,
        "area": 84.9805
      }
    ],
    "rentTxCount": 960,
    "latestRentDeposit": 4000,
    "latestRentDepositEok": "4,000만",
    "latestRentMonthly": 130,
    "latestRentDate": "20260501",
    "avg1MRentDeposit": 39600,
    "avg1MRentDepositEok": "3억9,600",
    "avg3MRentDeposit": 37900,
    "avg3MRentDepositEok": "3억7,900"
  },
  "동탄숲속마을모아미래도2단지": {
    "dong": "",
    "latestPrice": 55000,
    "latestPriceEok": "5억5,000",
    "latestArea": 39.324999999999996,
    "latestFloor": 17,
    "latestDate": "20260506",
    "maxPrice": 72000,
    "maxPriceEok": "7억2,000",
    "minPrice": 28000,
    "minPriceEok": "2억8,000",
    "txCount": 386,
    "avg1MPrice": 55000,
    "avg1MPriceEok": "5억5,000",
    "avg1MPerPyeong": 1399,
    "avg1MTxCount": 1,
    "avg3MPrice": 55800,
    "avg3MPriceEok": "5억5,800",
    "avg3MPerPyeong": 1411,
    "avg3MTxCount": 5,
    "recent": [
      {
        "date": "05.06",
        "priceEok": "5억5,000",
        "areaPyeong": 39.324999999999996,
        "floor": 17,
        "area": 101.23
      },
      {
        "date": "04.05",
        "priceEok": "5억4,000",
        "areaPyeong": 39.6275,
        "floor": 2,
        "area": 100.92
      },
      {
        "date": "04.03",
        "priceEok": "5억2,000",
        "areaPyeong": 39.324999999999996,
        "floor": 1,
        "area": 101.23
      },
      {
        "date": "03.09",
        "priceEok": "5억8,000",
        "areaPyeong": 39.6275,
        "floor": 22,
        "area": 100.92
      }
    ],
    "rentTxCount": 402,
    "latestRentDeposit": 31500,
    "latestRentDepositEok": "3억1,500",
    "latestRentMonthly": 0,
    "latestRentDate": "20260315",
    "avg1MRentDeposit": 31500,
    "avg1MRentDepositEok": "3억1,500",
    "avg3MRentDeposit": 31500,
    "avg3MRentDepositEok": "3억1,500"
  },
  "동탄숲속마을능동역리체더포레스트": {
    "dong": "",
    "latestPrice": 57000,
    "latestPriceEok": "5억7,000",
    "latestArea": 35.089999999999996,
    "latestFloor": 14,
    "latestDate": "20260506",
    "maxPrice": 90000,
    "maxPriceEok": "9억",
    "minPrice": 26000,
    "minPriceEok": "2억6,000",
    "txCount": 518,
    "avg1MPrice": 60900,
    "avg1MPriceEok": "6억900",
    "avg1MPerPyeong": 1534,
    "avg1MTxCount": 5,
    "avg3MPrice": 57900,
    "avg3MPriceEok": "5억7,900",
    "avg3MPerPyeong": 1496,
    "avg3MTxCount": 11,
    "recent": [
      {
        "date": "05.06",
        "priceEok": "5억7,000",
        "areaPyeong": 35.089999999999996,
        "floor": 14,
        "area": 87.9844
      },
      {
        "date": "04.27",
        "priceEok": "5억4,500",
        "areaPyeong": 35.3925,
        "floor": 13,
        "area": 90.0519
      },
      {
        "date": "04.20",
        "priceEok": "5억4,900",
        "areaPyeong": 35.089999999999996,
        "floor": 22,
        "area": 87.9844
      },
      {
        "date": "04.17",
        "priceEok": "8억3,000",
        "areaPyeong": 60.5,
        "floor": 19,
        "area": 152.6618
      }
    ],
    "rentTxCount": 595,
    "latestRentDeposit": 42000,
    "latestRentDepositEok": "4억2,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260424",
    "avg1MRentDeposit": 42000,
    "avg1MRentDepositEok": "4억2,000",
    "avg3MRentDeposit": 36100,
    "avg3MRentDepositEok": "3억6,100"
  },
  "동탄금강펜테리움센트럴파크Ⅳ": {
    "dong": "",
    "latestPrice": 59500,
    "latestPriceEok": "5억9,500",
    "latestArea": 30.5525,
    "latestFloor": 9,
    "latestDate": "20260506",
    "maxPrice": 77000,
    "maxPriceEok": "7억7,000",
    "minPrice": 36300,
    "minPriceEok": "3억6,300",
    "txCount": 493,
    "avg1MPrice": 57900,
    "avg1MPriceEok": "5억7,900",
    "avg1MPerPyeong": 1879,
    "avg1MTxCount": 15,
    "avg3MPrice": 58000,
    "avg3MPriceEok": "5억8,000",
    "avg3MPerPyeong": 1842,
    "avg3MTxCount": 37,
    "recent": [
      {
        "date": "05.06",
        "priceEok": "5억9,500",
        "areaPyeong": 30.5525,
        "floor": 9,
        "area": 74.8709
      },
      {
        "date": "05.03",
        "priceEok": "6억800",
        "areaPyeong": 34.485,
        "floor": 12,
        "area": 84.9723
      },
      {
        "date": "04.30",
        "priceEok": "5억8,750",
        "areaPyeong": 30.5525,
        "floor": 8,
        "area": 74.8709
      },
      {
        "date": "04.28",
        "priceEok": "5억7,900",
        "areaPyeong": 30.5525,
        "floor": 13,
        "area": 74.8709
      }
    ],
    "rentTxCount": 470,
    "latestRentDeposit": 37000,
    "latestRentDepositEok": "3억7,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260501",
    "avg1MRentDeposit": 37400,
    "avg1MRentDepositEok": "3억7,400",
    "avg3MRentDeposit": 36100,
    "avg3MRentDepositEok": "3억6,100"
  },
  "동탄2신도시베라체": {
    "dong": "",
    "latestPrice": 54800,
    "latestPriceEok": "5억4,800",
    "latestArea": 30.25,
    "latestFloor": 19,
    "latestDate": "20260509",
    "maxPrice": 72000,
    "maxPriceEok": "7억2,000",
    "minPrice": 29000,
    "minPriceEok": "2억9,000",
    "txCount": 366,
    "avg1MPrice": 52300,
    "avg1MPriceEok": "5억2,300",
    "avg1MPerPyeong": 2051,
    "avg1MTxCount": 8,
    "avg3MPrice": 53100,
    "avg3MPriceEok": "5억3,100",
    "avg3MPerPyeong": 1977,
    "avg3MTxCount": 26,
    "recent": [
      {
        "date": "05.09",
        "priceEok": "5억4,800",
        "areaPyeong": 30.25,
        "floor": 19,
        "area": 74.97
      },
      {
        "date": "05.06",
        "priceEok": "5억500",
        "areaPyeong": 24.2,
        "floor": 3,
        "area": 59.99
      },
      {
        "date": "05.01",
        "priceEok": "5억2,100",
        "areaPyeong": 24.2,
        "floor": 16,
        "area": 59.99
      },
      {
        "date": "05.01",
        "priceEok": "5억3,000",
        "areaPyeong": 24.2,
        "floor": 9,
        "area": 59.99
      }
    ],
    "rentTxCount": 498,
    "latestRentDeposit": 35700,
    "latestRentDepositEok": "3억5,700",
    "latestRentMonthly": 0,
    "latestRentDate": "20260504",
    "avg1MRentDeposit": 32200,
    "avg1MRentDepositEok": "3억2,200",
    "avg3MRentDeposit": 34000,
    "avg3MRentDepositEok": "3억4,000"
  },
  "동탄더레이크팰리스": {
    "dong": "",
    "latestPrice": 120000,
    "latestPriceEok": "12억",
    "latestArea": 48.7025,
    "latestFloor": 20,
    "latestDate": "20260506",
    "maxPrice": 143000,
    "maxPriceEok": "14억3,000",
    "minPrice": 70500,
    "minPriceEok": "7억500",
    "txCount": 172,
    "avg1MPrice": 110700,
    "avg1MPriceEok": "11억700",
    "avg1MPerPyeong": 2916,
    "avg1MTxCount": 3,
    "avg3MPrice": 100600,
    "avg3MPriceEok": "10억600",
    "avg3MPerPyeong": 2829,
    "avg3MTxCount": 14,
    "recent": [
      {
        "date": "05.06",
        "priceEok": "12억",
        "areaPyeong": 48.7025,
        "floor": 20,
        "area": 134.8169
      },
      {
        "date": "05.01",
        "priceEok": "10억4,000",
        "areaPyeong": 33.275,
        "floor": 18,
        "area": 84.52
      },
      {
        "date": "04.18",
        "priceEok": "10억8,000",
        "areaPyeong": 34.1825,
        "floor": 11,
        "area": 88.0279
      },
      {
        "date": "04.11",
        "priceEok": "8억5,500",
        "areaPyeong": 34.1825,
        "floor": 1,
        "area": 88.025
      }
    ],
    "rentTxCount": 361,
    "latestRentDeposit": 43000,
    "latestRentDepositEok": "4억3,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260427",
    "avg1MRentDeposit": 43000,
    "avg1MRentDepositEok": "4억3,000",
    "avg3MRentDeposit": 50800,
    "avg3MRentDepositEok": "5억800"
  },
  "더레이크시티부영6단지": {
    "dong": "산척동",
    "latestPrice": 50000,
    "latestPriceEok": "5억",
    "latestArea": 25.107499999999998,
    "latestFloor": 9,
    "latestDate": "20260512",
    "maxPrice": 83500,
    "maxPriceEok": "8억3,500",
    "minPrice": 30100,
    "minPriceEok": "3억100",
    "txCount": 372,
    "avg1MPrice": 52300,
    "avg1MPriceEok": "5억2,300",
    "avg1MPerPyeong": 2039,
    "avg1MTxCount": 14,
    "avg3MPrice": 52600,
    "avg3MPriceEok": "5억2,600",
    "avg3MPerPyeong": 2054,
    "avg3MTxCount": 31,
    "recent": [
      {
        "date": "05.12",
        "priceEok": "5억",
        "areaPyeong": 25.107499999999998,
        "floor": 9,
        "area": 59.9912
      },
      {
        "date": "05.10",
        "priceEok": "5억1,500",
        "areaPyeong": 25.107499999999998,
        "floor": 22,
        "area": 60.5232
      },
      {
        "date": "05.09",
        "priceEok": "5억3,300",
        "areaPyeong": 25.107499999999998,
        "floor": 22,
        "area": 59.9912
      },
      {
        "date": "05.09",
        "priceEok": "5억2,400",
        "areaPyeong": 25.107499999999998,
        "floor": 16,
        "area": 59.9912
      }
    ],
    "rentTxCount": 849,
    "latestRentDeposit": 36000,
    "latestRentDepositEok": "3억6,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260504",
    "avg1MRentDeposit": 37300,
    "avg1MRentDepositEok": "3억7,300",
    "avg3MRentDeposit": 35000,
    "avg3MRentDepositEok": "3억5,000"
  },
  "능동마을이지더원": {
    "dong": "",
    "latestPrice": 59500,
    "latestPriceEok": "5억9,500",
    "latestArea": 30.25,
    "latestFloor": 14,
    "latestDate": "20260508",
    "maxPrice": 68000,
    "maxPriceEok": "6억8,000",
    "minPrice": 23300,
    "minPriceEok": "2억3,300",
    "txCount": 643,
    "avg1MPrice": 56400,
    "avg1MPriceEok": "5억6,400",
    "avg1MPerPyeong": 1821,
    "avg1MTxCount": 6,
    "avg3MPrice": 56000,
    "avg3MPriceEok": "5억6,000",
    "avg3MPerPyeong": 1812,
    "avg3MTxCount": 16,
    "recent": [
      {
        "date": "05.08",
        "priceEok": "5억9,500",
        "areaPyeong": 30.25,
        "floor": 14,
        "area": 78.2912
      },
      {
        "date": "05.06",
        "priceEok": "5억3,800",
        "areaPyeong": 30.25,
        "floor": 3,
        "area": 78.2912
      },
      {
        "date": "05.02",
        "priceEok": "5억6,500",
        "areaPyeong": 31.7625,
        "floor": 6,
        "area": 83.5573
      },
      {
        "date": "04.19",
        "priceEok": "5억9,500",
        "areaPyeong": 31.7625,
        "floor": 17,
        "area": 83.5573
      }
    ],
    "rentTxCount": 854,
    "latestRentDeposit": 37000,
    "latestRentDepositEok": "3억7,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260416",
    "avg1MRentDeposit": 37500,
    "avg1MRentDepositEok": "3억7,500",
    "avg3MRentDeposit": 34500,
    "avg3MRentDepositEok": "3억4,500"
  },
  "시범한빛마을삼부르네상스": {
    "dong": "",
    "latestPrice": 74000,
    "latestPriceEok": "7억4,000",
    "latestArea": 34.1042856,
    "latestFloor": 4,
    "latestDate": "20260506",
    "maxPrice": 80250,
    "maxPriceEok": "8억250",
    "minPrice": 28000,
    "minPriceEok": "2억8,000",
    "txCount": 781,
    "avg1MPrice": 73400,
    "avg1MPriceEok": "7억3,400",
    "avg1MPerPyeong": 2154,
    "avg1MTxCount": 5,
    "avg3MPrice": 72800,
    "avg3MPriceEok": "7억2,800",
    "avg3MPerPyeong": 2134,
    "avg3MTxCount": 8,
    "recent": [
      {
        "date": "05.06",
        "priceEok": "7억4,000",
        "areaPyeong": 34.1042856,
        "floor": 4,
        "area": 84.768
      },
      {
        "date": "04.30",
        "priceEok": "7억5,000",
        "areaPyeong": 34.073306575000004,
        "floor": 7,
        "area": 84.691
      },
      {
        "date": "04.25",
        "priceEok": "7억4,000",
        "areaPyeong": 34.0817554,
        "floor": 13,
        "area": 84.712
      },
      {
        "date": "04.24",
        "priceEok": "7억",
        "areaPyeong": 34.073306575000004,
        "floor": 4,
        "area": 84.691
      }
    ],
    "rentTxCount": 1095,
    "latestRentDeposit": 45000,
    "latestRentDepositEok": "4억5,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260506",
    "avg1MRentDeposit": 42900,
    "avg1MRentDepositEok": "4억2,900",
    "avg3MRentDeposit": 41200,
    "avg3MRentDepositEok": "4억1,200"
  },
  "시범다은마을우남퍼스트빌": {
    "dong": "",
    "latestPrice": 69500,
    "latestPriceEok": "6억9,500",
    "latestArea": 26.982368682500006,
    "latestFloor": 11,
    "latestDate": "20260430",
    "maxPrice": 77000,
    "maxPriceEok": "7억7,000",
    "minPrice": 22000,
    "minPriceEok": "2억2,000",
    "txCount": 742,
    "avg1MPrice": 71000,
    "avg1MPriceEok": "7억1,000",
    "avg1MPerPyeong": 2262,
    "avg1MTxCount": 3,
    "avg3MPrice": 69100,
    "avg3MPriceEok": "6억9,100",
    "avg3MPerPyeong": 2287,
    "avg3MTxCount": 10,
    "recent": [
      {
        "date": "04.30",
        "priceEok": "6억9,500",
        "areaPyeong": 26.982368682500006,
        "floor": 11,
        "area": 67.0661
      },
      {
        "date": "04.29",
        "priceEok": "7억1,000",
        "areaPyeong": 34.1872852475,
        "floor": 23,
        "area": 84.9743
      },
      {
        "date": "04.18",
        "priceEok": "7억2,500",
        "areaPyeong": 33.967293937499996,
        "floor": 7,
        "area": 84.4275
      },
      {
        "date": "04.11",
        "priceEok": "7억4,700",
        "areaPyeong": 33.967293937499996,
        "floor": 18,
        "area": 84.4275
      }
    ],
    "rentTxCount": 769,
    "latestRentDeposit": 5000,
    "latestRentDepositEok": "5,000만",
    "latestRentMonthly": 150,
    "latestRentDate": "20260506",
    "avg1MRentDeposit": 39900,
    "avg1MRentDepositEok": "3억9,900",
    "avg3MRentDeposit": 39700,
    "avg3MRentDepositEok": "3억9,700"
  },
  "동탄역센트럴자이A-10": {
    "dong": "영천동",
    "latestPrice": 103000,
    "latestPriceEok": "10억3,000",
    "latestArea": 29.645,
    "latestFloor": 9,
    "latestDate": "20260508",
    "maxPrice": 119000,
    "maxPriceEok": "11억9,000",
    "minPrice": 34500,
    "minPriceEok": "3억4,500",
    "txCount": 348,
    "avg1MPrice": 102600,
    "avg1MPriceEok": "10억2,600",
    "avg1MPerPyeong": 3325,
    "avg1MTxCount": 4,
    "avg3MPrice": 102400,
    "avg3MPriceEok": "10억2,400",
    "avg3MPerPyeong": 3153,
    "avg3MTxCount": 12,
    "recent": [
      {
        "date": "05.08",
        "priceEok": "10억3,000",
        "areaPyeong": 29.645,
        "floor": 9,
        "area": 72.8676
      },
      {
        "date": "04.29",
        "priceEok": "10억",
        "areaPyeong": 29.645,
        "floor": 18,
        "area": 72.1539
      },
      {
        "date": "04.23",
        "priceEok": "11억",
        "areaPyeong": 34.7875,
        "floor": 13,
        "area": 84.9103
      },
      {
        "date": "04.21",
        "priceEok": "9억7,500",
        "areaPyeong": 29.645,
        "floor": 3,
        "area": 72.8676
      }
    ],
    "rentTxCount": 447,
    "latestRentDeposit": 47000,
    "latestRentDepositEok": "4억7,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260506",
    "avg1MRentDeposit": 49700,
    "avg1MRentDepositEok": "4억9,700",
    "avg3MRentDeposit": 46600,
    "avg3MRentDepositEok": "4억6,600"
  },
  "동탄역센트럴상록아파트": {
    "dong": "영천동",
    "latestPrice": 86000,
    "latestPriceEok": "8억6,000",
    "latestArea": 25.107499999999998,
    "latestFloor": 3,
    "latestDate": "20260506",
    "maxPrice": 115000,
    "maxPriceEok": "11억5,000",
    "minPrice": 44800,
    "minPriceEok": "4억4,800",
    "txCount": 632,
    "avg1MPrice": 93400,
    "avg1MPriceEok": "9억3,400",
    "avg1MPerPyeong": 3749,
    "avg1MTxCount": 9,
    "avg3MPrice": 93800,
    "avg3MPriceEok": "9억3,800",
    "avg3MPerPyeong": 3658,
    "avg3MTxCount": 23,
    "recent": [
      {
        "date": "05.06",
        "priceEok": "8억6,000",
        "areaPyeong": 25.107499999999998,
        "floor": 3,
        "area": 59.96
      },
      {
        "date": "05.02",
        "priceEok": "9억4,000",
        "areaPyeong": 24.805,
        "floor": 7,
        "area": 59.98
      },
      {
        "date": "05.01",
        "priceEok": "9억5,000",
        "areaPyeong": 24.805,
        "floor": 15,
        "area": 59.98
      },
      {
        "date": "05.01",
        "priceEok": "9억4,500",
        "areaPyeong": 24.805,
        "floor": 11,
        "area": 59.98
      }
    ],
    "rentTxCount": 934,
    "latestRentDeposit": 5000,
    "latestRentDepositEok": "5,000만",
    "latestRentMonthly": 170,
    "latestRentDate": "20260506",
    "avg1MRentDeposit": 43300,
    "avg1MRentDepositEok": "4억3,300",
    "avg3MRentDeposit": 44300,
    "avg3MRentDepositEok": "4억4,300"
  },
  "동탄숲속마을자연앤경남아너스빌1115-0": {
    "dong": "",
    "latestPrice": 61500,
    "latestPriceEok": "6억1,500",
    "latestArea": 30.5525,
    "latestFloor": 6,
    "latestDate": "20260429",
    "maxPrice": 72300,
    "maxPriceEok": "7억2,300",
    "minPrice": 17800,
    "minPriceEok": "1억7,800",
    "txCount": 750,
    "avg1MPrice": 59100,
    "avg1MPriceEok": "5억9,100",
    "avg1MPerPyeong": 1899,
    "avg1MTxCount": 5,
    "avg3MPrice": 59700,
    "avg3MPriceEok": "5억9,700",
    "avg3MPerPyeong": 1912,
    "avg3MTxCount": 13,
    "recent": [
      {
        "date": "04.29",
        "priceEok": "6억1,500",
        "areaPyeong": 30.5525,
        "floor": 6,
        "area": 76.5
      },
      {
        "date": "04.23",
        "priceEok": "5억9,500",
        "areaPyeong": 33.5775,
        "floor": 3,
        "area": 84.55
      },
      {
        "date": "04.20",
        "priceEok": "6억2,000",
        "areaPyeong": 30.5525,
        "floor": 10,
        "area": 76.51
      },
      {
        "date": "04.18",
        "priceEok": "5억4,500",
        "areaPyeong": 30.5525,
        "floor": 2,
        "area": 76.51
      }
    ],
    "rentTxCount": 889,
    "latestRentDeposit": 35000,
    "latestRentDepositEok": "3억5,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260506",
    "avg1MRentDeposit": 34600,
    "avg1MRentDepositEok": "3억4,600",
    "avg3MRentDeposit": 34400,
    "avg3MRentDepositEok": "3억4,400"
  },
  "동탄동원로얄듀크2차": {
    "dong": "",
    "latestPrice": 65900,
    "latestPriceEok": "6억5,900",
    "latestArea": 33.5775,
    "latestFloor": 9,
    "latestDate": "20260501",
    "maxPrice": 77800,
    "maxPriceEok": "7억7,800",
    "minPrice": 34766,
    "minPriceEok": "3억4,766",
    "txCount": 230,
    "avg1MPrice": 64400,
    "avg1MPriceEok": "6억4,400",
    "avg1MPerPyeong": 1917,
    "avg1MTxCount": 7,
    "avg3MPrice": 62600,
    "avg3MPriceEok": "6억2,600",
    "avg3MPerPyeong": 1921,
    "avg3MTxCount": 16,
    "recent": [
      {
        "date": "05.01",
        "priceEok": "6억5,900",
        "areaPyeong": 33.5775,
        "floor": 9,
        "area": 84.9889
      },
      {
        "date": "04.28",
        "priceEok": "6억6,500",
        "areaPyeong": 33.5775,
        "floor": 18,
        "area": 84.9889
      },
      {
        "date": "04.28",
        "priceEok": "6억5,000",
        "areaPyeong": 33.5775,
        "floor": 12,
        "area": 84.9889
      },
      {
        "date": "04.24",
        "priceEok": "6억600",
        "areaPyeong": 33.5775,
        "floor": 2,
        "area": 84.9889
      }
    ],
    "rentTxCount": 317,
    "latestRentDeposit": 50000,
    "latestRentDepositEok": "5억",
    "latestRentMonthly": 0,
    "latestRentDate": "20260506",
    "avg1MRentDeposit": 44800,
    "avg1MRentDepositEok": "4억4,800",
    "avg3MRentDeposit": 41100,
    "avg3MRentDepositEok": "4억1,100"
  },
  "동탄2디에트르포레": {
    "dong": "",
    "latestPrice": 44500,
    "latestPriceEok": "4억4,500",
    "latestArea": 24.2,
    "latestFloor": 19,
    "latestDate": "20260508",
    "maxPrice": 47000,
    "maxPriceEok": "4억7,000",
    "minPrice": 33000,
    "minPriceEok": "3억3,000",
    "txCount": 87,
    "avg1MPrice": 41900,
    "avg1MPriceEok": "4억1,900",
    "avg1MPerPyeong": 1811,
    "avg1MTxCount": 12,
    "avg3MPrice": 42100,
    "avg3MPriceEok": "4억2,100",
    "avg3MPerPyeong": 1786,
    "avg3MTxCount": 41,
    "recent": [
      {
        "date": "05.08",
        "priceEok": "4억4,500",
        "areaPyeong": 24.2,
        "floor": 19,
        "area": 55.97
      },
      {
        "date": "05.05",
        "priceEok": "3억8,400",
        "areaPyeong": 19.965,
        "floor": 4,
        "area": 46.85
      },
      {
        "date": "05.05",
        "priceEok": "4억7,000",
        "areaPyeong": 24.2,
        "floor": 16,
        "area": 55.99
      },
      {
        "date": "05.04",
        "priceEok": "4억4,500",
        "areaPyeong": 24.2,
        "floor": 6,
        "area": 55.99
      }
    ],
    "rentTxCount": 585,
    "latestRentDeposit": 5000,
    "latestRentDepositEok": "5,000만",
    "latestRentMonthly": 120,
    "latestRentDate": "20260506",
    "avg1MRentDeposit": 29000,
    "avg1MRentDepositEok": "2억9,000",
    "avg3MRentDeposit": 25800,
    "avg3MRentDepositEok": "2억5,800"
  },
  "나루마을한화꿈에그린": {
    "dong": "",
    "latestPrice": 74500,
    "latestPriceEok": "7억4,500",
    "latestArea": 36.905,
    "latestFloor": 5,
    "latestDate": "20260423",
    "maxPrice": 86800,
    "maxPriceEok": "8억6,800",
    "minPrice": 22400,
    "minPriceEok": "2억2,400",
    "txCount": 673,
    "avg1MPrice": 74500,
    "avg1MPriceEok": "7억4,500",
    "avg1MPerPyeong": 2019,
    "avg1MTxCount": 1,
    "avg3MPrice": 78800,
    "avg3MPriceEok": "7억8,800",
    "avg3MPerPyeong": 2007,
    "avg3MTxCount": 5,
    "recent": [
      {
        "date": "04.23",
        "priceEok": "7억4,500",
        "areaPyeong": 36.905,
        "floor": 5,
        "area": 96.84
      },
      {
        "date": "03.21",
        "priceEok": "8억6,000",
        "areaPyeong": 42.955,
        "floor": 12,
        "area": 113.18
      },
      {
        "date": "02.26",
        "priceEok": "7억5,000",
        "areaPyeong": 36.905,
        "floor": 6,
        "area": 96.84
      },
      {
        "date": "02.25",
        "priceEok": "7억6,000",
        "areaPyeong": 36.905,
        "floor": 5,
        "area": 97.6
      }
    ],
    "rentTxCount": 983,
    "latestRentDeposit": 10000,
    "latestRentDepositEok": "1억",
    "latestRentMonthly": 175,
    "latestRentDate": "20260506",
    "avg1MRentDeposit": 47500,
    "avg1MRentDepositEok": "4억7,500",
    "avg3MRentDeposit": 46300,
    "avg3MRentDepositEok": "4억6,300"
  },
  "금호어울림레이크": {
    "dong": "장지동",
    "latestPrice": 84000,
    "latestPriceEok": "8억4,000",
    "latestArea": 34.485,
    "latestFloor": 11,
    "latestDate": "20260509",
    "maxPrice": 95000,
    "maxPriceEok": "9억5,000",
    "minPrice": 29000,
    "minPriceEok": "2억9,000",
    "txCount": 405,
    "avg1MPrice": 70600,
    "avg1MPriceEok": "7억600",
    "avg1MPerPyeong": 2668,
    "avg1MTxCount": 16,
    "avg3MPrice": 70000,
    "avg3MPriceEok": "7억",
    "avg3MPerPyeong": 2693,
    "avg3MTxCount": 34,
    "recent": [
      {
        "date": "05.09",
        "priceEok": "8억4,000",
        "areaPyeong": 34.485,
        "floor": 11,
        "area": 84.96
      },
      {
        "date": "05.05",
        "priceEok": "6억6,500",
        "areaPyeong": 24.805,
        "floor": 17,
        "area": 59.96
      },
      {
        "date": "05.04",
        "priceEok": "7억",
        "areaPyeong": 24.805,
        "floor": 7,
        "area": 59.96
      },
      {
        "date": "05.02",
        "priceEok": "6억7,000",
        "areaPyeong": 24.502499999999998,
        "floor": 10,
        "area": 59.93
      }
    ],
    "rentTxCount": 709,
    "latestRentDeposit": 40000,
    "latestRentDepositEok": "4억",
    "latestRentMonthly": 0,
    "latestRentDate": "20260506",
    "avg1MRentDeposit": 39200,
    "avg1MRentDepositEok": "3억9,200",
    "avg3MRentDeposit": 36900,
    "avg3MRentDepositEok": "3억6,900"
  },
  "그린힐반도유보라아이비파크101단지": {
    "dong": "",
    "latestPrice": 41700,
    "latestPriceEok": "4억1,700",
    "latestArea": 24.502499999999998,
    "latestFloor": 16,
    "latestDate": "20260509",
    "maxPrice": 65000,
    "maxPriceEok": "6억5,000",
    "minPrice": 26000,
    "minPriceEok": "2억6,000",
    "txCount": 632,
    "avg1MPrice": 43000,
    "avg1MPriceEok": "4억3,000",
    "avg1MPerPyeong": 1634,
    "avg1MTxCount": 15,
    "avg3MPrice": 43400,
    "avg3MPriceEok": "4억3,400",
    "avg3MPerPyeong": 1638,
    "avg3MTxCount": 38,
    "recent": [
      {
        "date": "05.09",
        "priceEok": "4억1,700",
        "areaPyeong": 24.502499999999998,
        "floor": 16,
        "area": 59.8742
      },
      {
        "date": "05.09",
        "priceEok": "4억1,000",
        "areaPyeong": 24.502499999999998,
        "floor": 4,
        "area": 59.7731
      },
      {
        "date": "05.09",
        "priceEok": "4억1,000",
        "areaPyeong": 24.502499999999998,
        "floor": 2,
        "area": 59.7731
      },
      {
        "date": "05.06",
        "priceEok": "4억6,200",
        "areaPyeong": 29.645,
        "floor": 3,
        "area": 74.1263
      }
    ],
    "rentTxCount": 891,
    "latestRentDeposit": 3000,
    "latestRentDepositEok": "3,000만",
    "latestRentMonthly": 120,
    "latestRentDate": "20260506",
    "avg1MRentDeposit": 31600,
    "avg1MRentDepositEok": "3억1,600",
    "avg3MRentDeposit": 29900,
    "avg3MRentDepositEok": "2억9,900"
  },
  "서희스타힐스엔에이치에프": {
    "dong": "",
    "latestPrice": 61800,
    "latestPriceEok": "6억1,800",
    "latestArea": 34.18555525,
    "latestFloor": 13,
    "latestDate": "20260505",
    "maxPrice": 64800,
    "maxPriceEok": "6억4,800",
    "minPrice": 55000,
    "minPriceEok": "5억5,000",
    "txCount": 31,
    "avg1MPrice": 58900,
    "avg1MPriceEok": "5억8,900",
    "avg1MPerPyeong": 1831,
    "avg1MTxCount": 4,
    "avg3MPrice": 58700,
    "avg3MPriceEok": "5억8,700",
    "avg3MPerPyeong": 1842,
    "avg3MTxCount": 7,
    "recent": [
      {
        "date": "05.05",
        "priceEok": "6억1,800",
        "areaPyeong": 34.18555525,
        "floor": 13,
        "area": 84.97
      },
      {
        "date": "05.01",
        "priceEok": "5억5,800",
        "areaPyeong": 30.150235499999997,
        "floor": 11,
        "area": 74.94
      },
      {
        "date": "04.27",
        "priceEok": "5억5,000",
        "areaPyeong": 30.150235499999997,
        "floor": 5,
        "area": 74.94
      },
      {
        "date": "04.18",
        "priceEok": "6억3,000",
        "areaPyeong": 34.18555525,
        "floor": 15,
        "area": 84.97
      }
    ],
    "rentTxCount": 688,
    "latestRentDeposit": 43000,
    "latestRentDepositEok": "4억3,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260321",
    "avg1MRentDeposit": 43000,
    "avg1MRentDepositEok": "4억3,000",
    "avg3MRentDeposit": 31400,
    "avg3MRentDepositEok": "3억1,400"
  },
  "동탄호수하우스디": {
    "dong": "장지동",
    "latestPrice": 67300,
    "latestPriceEok": "6억7,300",
    "latestArea": 34.18555525,
    "latestFloor": 14,
    "latestDate": "20260505",
    "maxPrice": 69000,
    "maxPriceEok": "6억9,000",
    "minPrice": 54800,
    "minPriceEok": "5억4,800",
    "txCount": 63,
    "avg1MPrice": 64900,
    "avg1MPriceEok": "6억4,900",
    "avg1MPerPyeong": 1978,
    "avg1MTxCount": 6,
    "avg3MPrice": 64700,
    "avg3MPriceEok": "6억4,700",
    "avg3MPerPyeong": 1981,
    "avg3MTxCount": 8,
    "recent": [
      {
        "date": "05.05",
        "priceEok": "6억7,300",
        "areaPyeong": 34.18555525,
        "floor": 14,
        "area": 84.97
      },
      {
        "date": "05.02",
        "priceEok": "6억1,400",
        "areaPyeong": 30.158281999999996,
        "floor": 20,
        "area": 74.96
      },
      {
        "date": "04.30",
        "priceEok": "6억3,500",
        "areaPyeong": 34.18555525,
        "floor": 3,
        "area": 84.97
      },
      {
        "date": "04.26",
        "priceEok": "6억8,500",
        "areaPyeong": 34.18555525,
        "floor": 18,
        "area": 84.97
      }
    ],
    "rentTxCount": 131,
    "latestRentDeposit": 37000,
    "latestRentDepositEok": "3억7,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260313",
    "avg1MRentDeposit": 37000,
    "avg1MRentDepositEok": "3억7,000",
    "avg3MRentDeposit": 36500,
    "avg3MRentDepositEok": "3억6,500"
  },
  "동탄역이지더원": {
    "dong": "영천동",
    "latestPrice": 66300,
    "latestPriceEok": "6억6,300",
    "latestArea": 24.131614430000003,
    "latestFloor": 11,
    "latestDate": "20260505",
    "maxPrice": 80800,
    "maxPriceEok": "8억800",
    "minPrice": 24980,
    "minPriceEok": "2억4,980",
    "txCount": 618,
    "avg1MPrice": 70100,
    "avg1MPriceEok": "7억100",
    "avg1MPerPyeong": 2407,
    "avg1MTxCount": 9,
    "avg3MPrice": 66000,
    "avg3MPriceEok": "6억6,000",
    "avg3MPerPyeong": 2415,
    "avg3MTxCount": 27,
    "recent": [
      {
        "date": "05.05",
        "priceEok": "6억6,300",
        "areaPyeong": 24.131614430000003,
        "floor": 11,
        "area": 59.9804
      },
      {
        "date": "05.02",
        "priceEok": "7억4,400",
        "areaPyeong": 34.1868024575,
        "floor": 14,
        "area": 84.9731
      },
      {
        "date": "05.01",
        "priceEok": "7억",
        "areaPyeong": 34.1868024575,
        "floor": 2,
        "area": 84.9731
      },
      {
        "date": "04.30",
        "priceEok": "7억2,000",
        "areaPyeong": 34.1868024575,
        "floor": 7,
        "area": 84.9731
      }
    ],
    "rentTxCount": 553,
    "latestRentDeposit": 23000,
    "latestRentDepositEok": "2억3,000",
    "latestRentMonthly": 80,
    "latestRentDate": "20260424",
    "avg1MRentDeposit": 40500,
    "avg1MRentDepositEok": "4억500",
    "avg3MRentDeposit": 39200,
    "avg3MRentDepositEok": "3억9,200"
  },
  "동탄역시범한화꿈에그린프레스티지": {
    "dong": "청계동",
    "latestPrice": 146000,
    "latestPriceEok": "14억6,000",
    "latestArea": 33.275,
    "latestFloor": 7,
    "latestDate": "20260509",
    "maxPrice": 198000,
    "maxPriceEok": "19억8,000",
    "minPrice": 46000,
    "minPriceEok": "4억6,000",
    "txCount": 780,
    "avg1MPrice": 156000,
    "avg1MPriceEok": "15억6,000",
    "avg1MPerPyeong": 4046,
    "avg1MTxCount": 12,
    "avg3MPrice": 152100,
    "avg3MPriceEok": "15억2,100",
    "avg3MPerPyeong": 3964,
    "avg3MTxCount": 38,
    "recent": [
      {
        "date": "05.09",
        "priceEok": "14억6,000",
        "areaPyeong": 33.275,
        "floor": 7,
        "area": 84.51
      },
      {
        "date": "05.09",
        "priceEok": "14억1,500",
        "areaPyeong": 33.275,
        "floor": 1,
        "area": 84.51
      },
      {
        "date": "05.05",
        "priceEok": "15억9,000",
        "areaPyeong": 39.6275,
        "floor": 9,
        "area": 101.4
      },
      {
        "date": "05.02",
        "priceEok": "16억3,500",
        "areaPyeong": 39.6275,
        "floor": 22,
        "area": 101.4
      }
    ],
    "rentTxCount": 1505,
    "latestRentDeposit": 56200,
    "latestRentDepositEok": "5억6,200",
    "latestRentMonthly": 0,
    "latestRentDate": "20260430",
    "avg1MRentDeposit": 66400,
    "avg1MRentDepositEok": "6억6,400",
    "avg3MRentDeposit": 65200,
    "avg3MRentDepositEok": "6억5,200"
  },
  "더레이크시티부영5단지": {
    "dong": "",
    "latestPrice": 75500,
    "latestPriceEok": "7억5,500",
    "latestArea": 33.275,
    "latestFloor": 7,
    "latestDate": "20260508",
    "maxPrice": 101000,
    "maxPriceEok": "10억1,000",
    "minPrice": 38500,
    "minPriceEok": "3억8,500",
    "txCount": 267,
    "avg1MPrice": 74900,
    "avg1MPriceEok": "7억4,900",
    "avg1MPerPyeong": 2354,
    "avg1MTxCount": 6,
    "avg3MPrice": 72600,
    "avg3MPriceEok": "7억2,600",
    "avg3MPerPyeong": 2367,
    "avg3MTxCount": 16,
    "recent": [
      {
        "date": "05.08",
        "priceEok": "7억5,500",
        "areaPyeong": 33.275,
        "floor": 7,
        "area": 84.5442
      },
      {
        "date": "05.05",
        "priceEok": "7억6,000",
        "areaPyeong": 33.275,
        "floor": 5,
        "area": 84.52
      },
      {
        "date": "04.25",
        "priceEok": "7억8,800",
        "areaPyeong": 33.275,
        "floor": 9,
        "area": 84.52
      },
      {
        "date": "04.22",
        "priceEok": "7억7,500",
        "areaPyeong": 33.275,
        "floor": 23,
        "area": 84.52
      }
    ],
    "rentTxCount": 573,
    "latestRentDeposit": 40000,
    "latestRentDepositEok": "4억",
    "latestRentMonthly": 0,
    "latestRentDate": "20260504",
    "avg1MRentDeposit": 42000,
    "avg1MRentDepositEok": "4억2,000",
    "avg3MRentDeposit": 41000,
    "avg3MRentDepositEok": "4억1,000"
  },
  "더레이크시티부영1단지": {
    "dong": "산척동",
    "latestPrice": 60000,
    "latestPriceEok": "6억",
    "latestArea": 25.107499999999998,
    "latestFloor": 11,
    "latestDate": "20260511",
    "maxPrice": 94800,
    "maxPriceEok": "9억4,800",
    "minPrice": 30200,
    "minPriceEok": "3억200",
    "txCount": 272,
    "avg1MPrice": 63600,
    "avg1MPriceEok": "6억3,600",
    "avg1MPerPyeong": 2335,
    "avg1MTxCount": 14,
    "avg3MPrice": 63800,
    "avg3MPriceEok": "6억3,800",
    "avg3MPerPyeong": 2318,
    "avg3MTxCount": 25,
    "recent": [
      {
        "date": "05.11",
        "priceEok": "6억",
        "areaPyeong": 25.107499999999998,
        "floor": 11,
        "area": 59.9912
      },
      {
        "date": "05.05",
        "priceEok": "6억1,000",
        "areaPyeong": 25.107499999999998,
        "floor": 13,
        "area": 59.9912
      },
      {
        "date": "05.05",
        "priceEok": "6억",
        "areaPyeong": 25.107499999999998,
        "floor": 15,
        "area": 59.9912
      },
      {
        "date": "05.05",
        "priceEok": "7억3,500",
        "areaPyeong": 32.9725,
        "floor": 16,
        "area": 84.5442
      }
    ],
    "rentTxCount": 645,
    "latestRentDeposit": 35000,
    "latestRentDepositEok": "3억5,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260504",
    "avg1MRentDeposit": 35000,
    "avg1MRentDepositEok": "3억5,000",
    "avg3MRentDeposit": 36700,
    "avg3MRentDepositEok": "3억6,700"
  },
  "이편한세상동탄": {
    "dong": "",
    "latestPrice": 57000,
    "latestPriceEok": "5억7,000",
    "latestArea": 29.949073,
    "latestFloor": 9,
    "latestDate": "20260504",
    "maxPrice": 94000,
    "maxPriceEok": "9억4,000",
    "minPrice": 34500,
    "minPriceEok": "3억4,500",
    "txCount": 562,
    "avg1MPrice": 60700,
    "avg1MPriceEok": "6억700",
    "avg1MPerPyeong": 1822,
    "avg1MTxCount": 10,
    "avg3MPrice": 60100,
    "avg3MPriceEok": "6억100",
    "avg3MPerPyeong": 1851,
    "avg3MTxCount": 27,
    "recent": [
      {
        "date": "05.04",
        "priceEok": "5억7,000",
        "areaPyeong": 29.949073,
        "floor": 9,
        "area": 74.44
      },
      {
        "date": "05.04",
        "priceEok": "5억7,000",
        "areaPyeong": 29.949073,
        "floor": 11,
        "area": 74.44
      },
      {
        "date": "05.01",
        "priceEok": "5억5,800",
        "areaPyeong": 30.041607750000004,
        "floor": 2,
        "area": 74.67
      },
      {
        "date": "05.01",
        "priceEok": "6억4,500",
        "areaPyeong": 33.875765,
        "floor": 20,
        "area": 84.2
      }
    ],
    "rentTxCount": 639,
    "latestRentDeposit": 43000,
    "latestRentDepositEok": "4억3,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260501",
    "avg1MRentDeposit": 40200,
    "avg1MRentDepositEok": "4억200",
    "avg3MRentDeposit": 39200,
    "avg3MRentDepositEok": "3억9,200"
  },
  "동탄퍼스트파크": {
    "dong": "영천동",
    "latestPrice": 41000,
    "latestPriceEok": "4억1,000",
    "latestArea": 26.9225,
    "latestFloor": 6,
    "latestDate": "20260509",
    "maxPrice": 55800,
    "maxPriceEok": "5억5,800",
    "minPrice": 11400,
    "minPriceEok": "1억1,400",
    "txCount": 833,
    "avg1MPrice": 41700,
    "avg1MPriceEok": "4억1,700",
    "avg1MPerPyeong": 1547,
    "avg1MTxCount": 8,
    "avg3MPrice": 41400,
    "avg3MPriceEok": "4억1,400",
    "avg3MPerPyeong": 1538,
    "avg3MTxCount": 19,
    "recent": [
      {
        "date": "05.09",
        "priceEok": "4억1,000",
        "areaPyeong": 26.9225,
        "floor": 6,
        "area": 72.5957
      },
      {
        "date": "05.04",
        "priceEok": "3억8,200",
        "areaPyeong": 26.9225,
        "floor": 1,
        "area": 72.5957
      },
      {
        "date": "04.30",
        "priceEok": "4억2,200",
        "areaPyeong": 26.9225,
        "floor": 12,
        "area": 72.5957
      },
      {
        "date": "04.30",
        "priceEok": "4억2,000",
        "areaPyeong": 26.9225,
        "floor": 7,
        "area": 72.5957
      }
    ],
    "rentTxCount": 553,
    "latestRentDeposit": 32000,
    "latestRentDepositEok": "3억2,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260501",
    "avg1MRentDeposit": 32000,
    "avg1MRentDepositEok": "3억2,000",
    "avg3MRentDeposit": 30900,
    "avg3MRentDepositEok": "3억900"
  },
  "동탄역모아미래도": {
    "dong": "청계동",
    "latestPrice": 89900,
    "latestPriceEok": "8억9,900",
    "latestArea": 32.9725,
    "latestFloor": 18,
    "latestDate": "20260504",
    "maxPrice": 89900,
    "maxPriceEok": "8억9,900",
    "minPrice": 40000,
    "minPriceEok": "4억",
    "txCount": 322,
    "avg1MPrice": 87000,
    "avg1MPriceEok": "8억7,000",
    "avg1MPerPyeong": 2637,
    "avg1MTxCount": 2,
    "avg3MPrice": 82000,
    "avg3MPriceEok": "8억2,000",
    "avg3MPerPyeong": 2487,
    "avg3MTxCount": 10,
    "recent": [
      {
        "date": "05.04",
        "priceEok": "8억9,900",
        "areaPyeong": 32.9725,
        "floor": 18,
        "area": 84.9982
      },
      {
        "date": "04.24",
        "priceEok": "8억4,000",
        "areaPyeong": 32.9725,
        "floor": 24,
        "area": 84.9982
      },
      {
        "date": "04.11",
        "priceEok": "8억1,300",
        "areaPyeong": 32.9725,
        "floor": 5,
        "area": 84.9982
      },
      {
        "date": "03.28",
        "priceEok": "8억1,000",
        "areaPyeong": 32.9725,
        "floor": 24,
        "area": 84.9982
      }
    ],
    "rentTxCount": 478,
    "latestRentDeposit": 4000,
    "latestRentDepositEok": "4,000만",
    "latestRentMonthly": 180,
    "latestRentDate": "20260302",
    "avg1MRentDeposit": 43300,
    "avg1MRentDepositEok": "4억3,300",
    "avg3MRentDeposit": 43300,
    "avg3MRentDepositEok": "4억3,300"
  },
  "동탄역동원로얄듀크1차": {
    "dong": "영천동",
    "latestPrice": 71000,
    "latestPriceEok": "7억1,000",
    "latestArea": 24.805,
    "latestFloor": 19,
    "latestDate": "20260509",
    "maxPrice": 100000,
    "maxPriceEok": "10억",
    "minPrice": 39000,
    "minPriceEok": "3억9,000",
    "txCount": 154,
    "avg1MPrice": 75900,
    "avg1MPriceEok": "7억5,900",
    "avg1MPerPyeong": 2840,
    "avg1MTxCount": 4,
    "avg3MPrice": 74600,
    "avg3MPriceEok": "7억4,600",
    "avg3MPerPyeong": 2603,
    "avg3MTxCount": 19,
    "recent": [
      {
        "date": "05.09",
        "priceEok": "7억1,000",
        "areaPyeong": 24.805,
        "floor": 19,
        "area": 59.7224
      },
      {
        "date": "05.04",
        "priceEok": "8억4,900",
        "areaPyeong": 33.275,
        "floor": 3,
        "area": 84.9889
      },
      {
        "date": "05.01",
        "priceEok": "7억4,500",
        "areaPyeong": 24.805,
        "floor": 13,
        "area": 59.7224
      },
      {
        "date": "04.22",
        "priceEok": "7억3,000",
        "areaPyeong": 24.805,
        "floor": 15,
        "area": 59.7224
      }
    ],
    "rentTxCount": 360,
    "latestRentDeposit": 38400,
    "latestRentDepositEok": "3억8,400",
    "latestRentMonthly": 0,
    "latestRentDate": "20260504",
    "avg1MRentDeposit": 41500,
    "avg1MRentDepositEok": "4억1,500",
    "avg3MRentDeposit": 41000,
    "avg3MRentDepositEok": "4억1,000"
  },
  "동탄시범다은마을메타역롯데캐슬": {
    "dong": "",
    "latestPrice": 75000,
    "latestPriceEok": "7억5,000",
    "latestArea": 32.9725,
    "latestFloor": 5,
    "latestDate": "20260504",
    "maxPrice": 87500,
    "maxPriceEok": "8억7,500",
    "minPrice": 30000,
    "minPriceEok": "3억",
    "txCount": 408,
    "avg1MPrice": 75500,
    "avg1MPriceEok": "7억5,500",
    "avg1MPerPyeong": 2290,
    "avg1MTxCount": 2,
    "avg3MPrice": 76700,
    "avg3MPriceEok": "7억6,700",
    "avg3MPerPyeong": 2235,
    "avg3MTxCount": 9,
    "recent": [
      {
        "date": "05.04",
        "priceEok": "7억5,000",
        "areaPyeong": 32.9725,
        "floor": 5,
        "area": 84.504
      },
      {
        "date": "04.17",
        "priceEok": "7억6,000",
        "areaPyeong": 32.9725,
        "floor": 6,
        "area": 84.504
      },
      {
        "date": "04.08",
        "priceEok": "7억3,000",
        "areaPyeong": 32.9725,
        "floor": 5,
        "area": 84.157
      },
      {
        "date": "04.04",
        "priceEok": "8억4,000",
        "areaPyeong": 39.324999999999996,
        "floor": 11,
        "area": 103.295
      }
    ],
    "rentTxCount": 545,
    "latestRentDeposit": 53000,
    "latestRentDepositEok": "5억3,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260408",
    "avg1MRentDeposit": 53000,
    "avg1MRentDepositEok": "5억3,000",
    "avg3MRentDeposit": 47200,
    "avg3MRentDepositEok": "4억7,200"
  },
  "동탄더샵레이크에듀타운": {
    "dong": "산척동",
    "latestPrice": 92000,
    "latestPriceEok": "9억2,000",
    "latestArea": 32.67,
    "latestFloor": 6,
    "latestDate": "20260512",
    "maxPrice": 121700,
    "maxPriceEok": "12억1,700",
    "minPrice": 51500,
    "minPriceEok": "5억1,500",
    "txCount": 405,
    "avg1MPrice": 95000,
    "avg1MPriceEok": "9억5,000",
    "avg1MPerPyeong": 2905,
    "avg1MTxCount": 13,
    "avg3MPrice": 95000,
    "avg3MPriceEok": "9억5,000",
    "avg3MPerPyeong": 2902,
    "avg3MTxCount": 22,
    "recent": [
      {
        "date": "05.12",
        "priceEok": "9억2,000",
        "areaPyeong": 32.67,
        "floor": 6,
        "area": 84.9802
      },
      {
        "date": "05.06",
        "priceEok": "9억4,800",
        "areaPyeong": 32.67,
        "floor": 10,
        "area": 84.9802
      },
      {
        "date": "05.04",
        "priceEok": "9억2,000",
        "areaPyeong": 32.67,
        "floor": 15,
        "area": 84.9802
      },
      {
        "date": "05.02",
        "priceEok": "9억4,500",
        "areaPyeong": 32.67,
        "floor": 11,
        "area": 84.9802
      }
    ],
    "rentTxCount": 738,
    "latestRentDeposit": 47250,
    "latestRentDepositEok": "4억7,250",
    "latestRentMonthly": 0,
    "latestRentDate": "20260424",
    "avg1MRentDeposit": 48600,
    "avg1MRentDepositEok": "4억8,600",
    "avg3MRentDeposit": 48800,
    "avg3MRentDepositEok": "4억8,800"
  },
  "푸른마을모아미래도": {
    "dong": "",
    "latestPrice": 41000,
    "latestPriceEok": "4억1,000",
    "latestArea": 23.8144214,
    "latestFloor": 21,
    "latestDate": "20260509",
    "maxPrice": 61000,
    "maxPriceEok": "6억1,000",
    "minPrice": 16570,
    "minPriceEok": "1억6,570",
    "txCount": 1430,
    "avg1MPrice": 43600,
    "avg1MPriceEok": "4억3,600",
    "avg1MPerPyeong": 1740,
    "avg1MTxCount": 13,
    "avg3MPrice": 45000,
    "avg3MPriceEok": "4억5,000",
    "avg3MPerPyeong": 1709,
    "avg3MTxCount": 27,
    "recent": [
      {
        "date": "05.09",
        "priceEok": "4억1,000",
        "areaPyeong": 23.8144214,
        "floor": 21,
        "area": 59.192
      },
      {
        "date": "05.02",
        "priceEok": "4억2,000",
        "areaPyeong": 23.8144214,
        "floor": 17,
        "area": 59.192
      },
      {
        "date": "05.02",
        "priceEok": "4억8,500",
        "areaPyeong": 33.689488524999994,
        "floor": 4,
        "area": 83.737
      },
      {
        "date": "05.01",
        "priceEok": "4억1,500",
        "areaPyeong": 23.8144214,
        "floor": 2,
        "area": 59.192
      }
    ],
    "rentTxCount": 1877,
    "latestRentDeposit": 26460,
    "latestRentDepositEok": "2억6,460",
    "latestRentMonthly": 0,
    "latestRentDate": "20260504",
    "avg1MRentDeposit": 29600,
    "avg1MRentDepositEok": "2억9,600",
    "avg3MRentDeposit": 28500,
    "avg3MRentDepositEok": "2억8,500"
  },
  "솔빛마을경남아너스빌": {
    "dong": "",
    "latestPrice": 87500,
    "latestPriceEok": "8억7,500",
    "latestArea": 41.5982726775,
    "latestFloor": 24,
    "latestDate": "20260504",
    "maxPrice": 97000,
    "maxPriceEok": "9억7,000",
    "minPrice": 32000,
    "minPriceEok": "3억2,000",
    "txCount": 607,
    "avg1MPrice": 89500,
    "avg1MPriceEok": "8억9,500",
    "avg1MPerPyeong": 1928,
    "avg1MTxCount": 4,
    "avg3MPrice": 87700,
    "avg3MPriceEok": "8억7,700",
    "avg3MPerPyeong": 1941,
    "avg3MTxCount": 8,
    "recent": [
      {
        "date": "05.04",
        "priceEok": "8억7,500",
        "areaPyeong": 41.5982726775,
        "floor": 24,
        "area": 103.3947
      },
      {
        "date": "05.02",
        "priceEok": "8억",
        "areaPyeong": 41.5982726775,
        "floor": 2,
        "area": 103.3947
      },
      {
        "date": "04.24",
        "priceEok": "9억5,250",
        "areaPyeong": 51.6643637125,
        "floor": 25,
        "area": 128.4145
      },
      {
        "date": "04.18",
        "priceEok": "9억5,250",
        "areaPyeong": 51.6643637125,
        "floor": 24,
        "area": 128.4145
      }
    ],
    "rentTxCount": 728,
    "latestRentDeposit": 62000,
    "latestRentDepositEok": "6억2,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260504",
    "avg1MRentDeposit": 62500,
    "avg1MRentDepositEok": "6억2,500",
    "avg3MRentDeposit": 58600,
    "avg3MRentDepositEok": "5억8,600"
  },
  "동탄린스트라우스더레이크": {
    "dong": "",
    "latestPrice": 122500,
    "latestPriceEok": "12억2,500",
    "latestArea": 42.35,
    "latestFloor": 3,
    "latestDate": "20260425",
    "maxPrice": 185000,
    "maxPriceEok": "18억5,000",
    "minPrice": 90000,
    "minPriceEok": "9억",
    "txCount": 138,
    "avg1MPrice": 132500,
    "avg1MPriceEok": "13억2,500",
    "avg1MPerPyeong": 3183,
    "avg1MTxCount": 6,
    "avg3MPrice": 131400,
    "avg3MPriceEok": "13억1,400",
    "avg3MPerPyeong": 3200,
    "avg3MTxCount": 18,
    "recent": [
      {
        "date": "04.25",
        "priceEok": "12억2,500",
        "areaPyeong": 42.35,
        "floor": 3,
        "area": 106.9474
      },
      {
        "date": "04.24",
        "priceEok": "13억4,500",
        "areaPyeong": 39.6275,
        "floor": 26,
        "area": 98.9373
      },
      {
        "date": "04.13",
        "priceEok": "13억4,000",
        "areaPyeong": 39.6275,
        "floor": 22,
        "area": 98.9612
      },
      {
        "date": "04.13",
        "priceEok": "12억6,500",
        "areaPyeong": 42.35,
        "floor": 15,
        "area": 106.9474
      }
    ],
    "rentTxCount": 497,
    "latestRentDeposit": 30000,
    "latestRentDepositEok": "3억",
    "latestRentMonthly": 166,
    "latestRentDate": "20260418",
    "avg1MRentDeposit": 69800,
    "avg1MRentDepositEok": "6억9,800",
    "avg3MRentDeposit": 74300,
    "avg3MRentDepositEok": "7억4,300"
  },
  "동탄2하우스디더레이크": {
    "dong": "송동",
    "latestPrice": 79200,
    "latestPriceEok": "7억9,200",
    "latestArea": 24.502499999999998,
    "latestFloor": 15,
    "latestDate": "20260509",
    "maxPrice": 104000,
    "maxPriceEok": "10억4,000",
    "minPrice": 29800,
    "minPriceEok": "2억9,800",
    "txCount": 1073,
    "avg1MPrice": 78300,
    "avg1MPriceEok": "7억8,300",
    "avg1MPerPyeong": 2949,
    "avg1MTxCount": 8,
    "avg3MPrice": 75800,
    "avg3MPriceEok": "7억5,800",
    "avg3MPerPyeong": 2950,
    "avg3MTxCount": 35,
    "recent": [
      {
        "date": "05.09",
        "priceEok": "7억9,200",
        "areaPyeong": 24.502499999999998,
        "floor": 15,
        "area": 59.99
      },
      {
        "date": "04.30",
        "priceEok": "7억7,700",
        "areaPyeong": 24.502499999999998,
        "floor": 19,
        "area": 59.99
      },
      {
        "date": "04.29",
        "priceEok": "8억1,800",
        "areaPyeong": 30.5525,
        "floor": 4,
        "area": 74.88
      },
      {
        "date": "04.28",
        "priceEok": "8억5,300",
        "areaPyeong": 30.5525,
        "floor": 8,
        "area": 74.88
      }
    ],
    "rentTxCount": 1132,
    "latestRentDeposit": 2000,
    "latestRentDepositEok": "2,000만",
    "latestRentMonthly": 150,
    "latestRentDate": "20260504",
    "avg1MRentDeposit": 40800,
    "avg1MRentDepositEok": "4억800",
    "avg3MRentDeposit": 39100,
    "avg3MRentDepositEok": "3억9,100"
  },
  "KCC스위첸아파트": {
    "dong": "",
    "latestPrice": 75450,
    "latestPriceEok": "7억5,450",
    "latestArea": 32.67,
    "latestFloor": 5,
    "latestDate": "20260504",
    "maxPrice": 83600,
    "maxPriceEok": "8억3,600",
    "minPrice": 33893,
    "minPriceEok": "3억3,893",
    "txCount": 423,
    "avg1MPrice": 77400,
    "avg1MPriceEok": "7억7,400",
    "avg1MPerPyeong": 2354,
    "avg1MTxCount": 3,
    "avg3MPrice": 76300,
    "avg3MPriceEok": "7억6,300",
    "avg3MPerPyeong": 2330,
    "avg3MTxCount": 13,
    "recent": [
      {
        "date": "05.04",
        "priceEok": "7억5,450",
        "areaPyeong": 32.67,
        "floor": 5,
        "area": 84.06
      },
      {
        "date": "05.02",
        "priceEok": "7억3,000",
        "areaPyeong": 33.275,
        "floor": 19,
        "area": 84.11
      },
      {
        "date": "04.17",
        "priceEok": "8억3,600",
        "areaPyeong": 32.67,
        "floor": 15,
        "area": 84.06
      },
      {
        "date": "04.10",
        "priceEok": "7억9,500",
        "areaPyeong": 32.67,
        "floor": 21,
        "area": 84.01
      }
    ],
    "rentTxCount": 410,
    "latestRentDeposit": 47000,
    "latestRentDepositEok": "4억7,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260502",
    "avg1MRentDeposit": 45400,
    "avg1MRentDepositEok": "4억5,400",
    "avg3MRentDeposit": 40500,
    "avg3MRentDepositEok": "4억500"
  },
  "동탄역신안인스빌리베라2차": {
    "dong": "청계동",
    "latestPrice": 78000,
    "latestPriceEok": "7억8,000",
    "latestArea": 24.805,
    "latestFloor": 16,
    "latestDate": "20260507",
    "maxPrice": 95000,
    "maxPriceEok": "9억5,000",
    "minPrice": 30416,
    "minPriceEok": "3억416",
    "txCount": 500,
    "avg1MPrice": 80100,
    "avg1MPriceEok": "8억100",
    "avg1MPerPyeong": 2962,
    "avg1MTxCount": 10,
    "avg3MPrice": 78500,
    "avg3MPriceEok": "7억8,500",
    "avg3MPerPyeong": 2854,
    "avg3MTxCount": 20,
    "recent": [
      {
        "date": "05.07",
        "priceEok": "7억8,000",
        "areaPyeong": 24.805,
        "floor": 16,
        "area": 59.968
      },
      {
        "date": "05.01",
        "priceEok": "7억8,000",
        "areaPyeong": 24.805,
        "floor": 20,
        "area": 59.968
      },
      {
        "date": "05.01",
        "priceEok": "8억4,800",
        "areaPyeong": 29.645,
        "floor": 19,
        "area": 72.9996
      },
      {
        "date": "04.30",
        "priceEok": "7억7,000",
        "areaPyeong": 24.805,
        "floor": 12,
        "area": 59.968
      }
    ],
    "rentTxCount": 808,
    "latestRentDeposit": 30000,
    "latestRentDepositEok": "3억",
    "latestRentMonthly": 100,
    "latestRentDate": "20260503",
    "avg1MRentDeposit": 48400,
    "avg1MRentDepositEok": "4억8,400",
    "avg3MRentDeposit": 39700,
    "avg3MRentDepositEok": "3억9,700"
  },
  "솔빛마을쌍용예가": {
    "dong": "",
    "latestPrice": 80500,
    "latestPriceEok": "8억500",
    "latestArea": 34.189337105,
    "latestFloor": 6,
    "latestDate": "20260508",
    "maxPrice": 80800,
    "maxPriceEok": "8억800",
    "minPrice": 24000,
    "minPriceEok": "2억4,000",
    "txCount": 937,
    "avg1MPrice": 79200,
    "avg1MPriceEok": "7억9,200",
    "avg1MPerPyeong": 2315,
    "avg1MTxCount": 4,
    "avg3MPrice": 77200,
    "avg3MPriceEok": "7억7,200",
    "avg3MPerPyeong": 2280,
    "avg3MTxCount": 7,
    "recent": [
      {
        "date": "05.08",
        "priceEok": "8억500",
        "areaPyeong": 34.189337105,
        "floor": 6,
        "area": 84.9794
      },
      {
        "date": "05.02",
        "priceEok": "7억8,800",
        "areaPyeong": 34.194004075,
        "floor": 5,
        "area": 84.991
      },
      {
        "date": "05.02",
        "priceEok": "7억6,500",
        "areaPyeong": 34.189337105,
        "floor": 16,
        "area": 84.9794
      },
      {
        "date": "04.19",
        "priceEok": "8억800",
        "areaPyeong": 34.189337105,
        "floor": 5,
        "area": 84.9794
      }
    ],
    "rentTxCount": 1380,
    "latestRentDeposit": 50000,
    "latestRentDepositEok": "5억",
    "latestRentMonthly": 0,
    "latestRentDate": "20260502",
    "avg1MRentDeposit": 45800,
    "avg1MRentDepositEok": "4억5,800",
    "avg3MRentDeposit": 44400,
    "avg3MRentDepositEok": "4억4,400"
  },
  "동탄역시범대원칸타빌아파트": {
    "dong": "",
    "latestPrice": 107000,
    "latestPriceEok": "10억7,000",
    "latestArea": 32.67,
    "latestFloor": 2,
    "latestDate": "20260502",
    "maxPrice": 150000,
    "maxPriceEok": "15억",
    "minPrice": 47000,
    "minPriceEok": "4억7,000",
    "txCount": 212,
    "avg1MPrice": 111700,
    "avg1MPriceEok": "11억1,700",
    "avg1MPerPyeong": 3428,
    "avg1MTxCount": 3,
    "avg3MPrice": 117000,
    "avg3MPriceEok": "11억7,000",
    "avg3MPerPyeong": 3601,
    "avg3MTxCount": 7,
    "recent": [
      {
        "date": "05.02",
        "priceEok": "10억7,000",
        "areaPyeong": 32.67,
        "floor": 2,
        "area": 84.705
      },
      {
        "date": "04.24",
        "priceEok": "11억9,000",
        "areaPyeong": 32.67,
        "floor": 16,
        "area": 84.705
      },
      {
        "date": "04.20",
        "priceEok": "10억9,000",
        "areaPyeong": 32.3675,
        "floor": 3,
        "area": 84.786
      },
      {
        "date": "04.04",
        "priceEok": "11억9,400",
        "areaPyeong": 32.3675,
        "floor": 20,
        "area": 84.786
      }
    ],
    "rentTxCount": 387,
    "latestRentDeposit": 53550,
    "latestRentDepositEok": "5억3,550",
    "latestRentMonthly": 0,
    "latestRentDate": "20260430",
    "avg1MRentDeposit": 53600,
    "avg1MRentDepositEok": "5억3,600",
    "avg3MRentDeposit": 57800,
    "avg3MRentDepositEok": "5억7,800"
  },
  "동탄역대원칸타빌포레지움": {
    "dong": "청계동",
    "latestPrice": 80000,
    "latestPriceEok": "8억",
    "latestArea": 39.6275,
    "latestFloor": 20,
    "latestDate": "20260502",
    "maxPrice": 149000,
    "maxPriceEok": "14억9,000",
    "minPrice": 38000,
    "minPriceEok": "3억8,000",
    "txCount": 373,
    "avg1MPrice": 72000,
    "avg1MPriceEok": "7억2,000",
    "avg1MPerPyeong": 2074,
    "avg1MTxCount": 13,
    "avg3MPrice": 71300,
    "avg3MPriceEok": "7억1,300",
    "avg3MPerPyeong": 2087,
    "avg3MTxCount": 21,
    "recent": [
      {
        "date": "05.02",
        "priceEok": "8억",
        "areaPyeong": 39.6275,
        "floor": 20,
        "area": 106.856
      },
      {
        "date": "05.01",
        "priceEok": "7억3,000",
        "areaPyeong": 33.5775,
        "floor": 19,
        "area": 84.705
      },
      {
        "date": "04.30",
        "priceEok": "6억6,500",
        "areaPyeong": 33.5775,
        "floor": 2,
        "area": 84.705
      },
      {
        "date": "04.24",
        "priceEok": "7억800",
        "areaPyeong": 33.275,
        "floor": 4,
        "area": 84.208
      }
    ],
    "rentTxCount": 409,
    "latestRentDeposit": 38500,
    "latestRentDepositEok": "3억8,500",
    "latestRentMonthly": 0,
    "latestRentDate": "20260411",
    "avg1MRentDeposit": 38500,
    "avg1MRentDepositEok": "3억8,500",
    "avg3MRentDeposit": 42500,
    "avg3MRentDepositEok": "4억2,500"
  },
  "동탄시범다은마을월드메르디앙반도유보라": {
    "dong": "",
    "latestPrice": 94500,
    "latestPriceEok": "9억4,500",
    "latestArea": 35.089999999999996,
    "latestFloor": 7,
    "latestDate": "20260508",
    "maxPrice": 98000,
    "maxPriceEok": "9억8,000",
    "minPrice": 17500,
    "minPriceEok": "1억7,500",
    "txCount": 2362,
    "avg1MPrice": 81300,
    "avg1MPriceEok": "8억1,300",
    "avg1MPerPyeong": 2653,
    "avg1MTxCount": 11,
    "avg3MPrice": 78700,
    "avg3MPriceEok": "7억8,700",
    "avg3MPerPyeong": 2674,
    "avg3MTxCount": 31,
    "recent": [
      {
        "date": "05.08",
        "priceEok": "9억4,500",
        "areaPyeong": 35.089999999999996,
        "floor": 7,
        "area": 84.65
      },
      {
        "date": "05.02",
        "priceEok": "6억8,000",
        "areaPyeong": 24.502499999999998,
        "floor": 12,
        "area": 59.07
      },
      {
        "date": "04.29",
        "priceEok": "7억9,900",
        "areaPyeong": 29.947499999999998,
        "floor": 22,
        "area": 76.78
      },
      {
        "date": "04.25",
        "priceEok": "6억8,000",
        "areaPyeong": 24.502499999999998,
        "floor": 21,
        "area": 59.07
      }
    ],
    "rentTxCount": 2508,
    "latestRentDeposit": 42000,
    "latestRentDepositEok": "4억2,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260428",
    "avg1MRentDeposit": 44600,
    "avg1MRentDepositEok": "4억4,600",
    "avg3MRentDeposit": 43000,
    "avg3MRentDepositEok": "4억3,000"
  },
  "솔빛마을서해그랑블": {
    "dong": "",
    "latestPrice": 87500,
    "latestPriceEok": "8억7,500",
    "latestArea": 40.516139125,
    "latestFloor": 20,
    "latestDate": "20260423",
    "maxPrice": 110000,
    "maxPriceEok": "11억",
    "minPrice": 35000,
    "minPriceEok": "3억5,000",
    "txCount": 700,
    "avg1MPrice": 87500,
    "avg1MPriceEok": "8억7,500",
    "avg1MPerPyeong": 2160,
    "avg1MTxCount": 1,
    "avg3MPrice": 88000,
    "avg3MPriceEok": "8억8,000",
    "avg3MPerPyeong": 2172,
    "avg3MTxCount": 2,
    "recent": [
      {
        "date": "04.23",
        "priceEok": "8억7,500",
        "areaPyeong": 40.516139125,
        "floor": 20,
        "area": 100.705
      },
      {
        "date": "02.21",
        "priceEok": "8억8,500",
        "areaPyeong": 40.516139125,
        "floor": 7,
        "area": 100.705
      },
      {
        "date": "01.27",
        "priceEok": "8억6,500",
        "areaPyeong": 40.516139125,
        "floor": 9,
        "area": 100.705
      },
      {
        "date": "01.25",
        "priceEok": "8억",
        "areaPyeong": 40.516139125,
        "floor": 1,
        "area": 100.705
      }
    ],
    "rentTxCount": 707,
    "latestRentDeposit": 10000,
    "latestRentDepositEok": "1억",
    "latestRentMonthly": 200,
    "latestRentDate": "20260502",
    "avg1MRentDeposit": 53600,
    "avg1MRentDepositEok": "5억3,600",
    "avg3MRentDeposit": 54100,
    "avg3MRentDepositEok": "5억4,100"
  },
  "동탄시범다은마을센트럴파크뷰": {
    "dong": "",
    "latestPrice": 59990,
    "latestPriceEok": "5억9,990",
    "latestArea": 32.9725,
    "latestFloor": 17,
    "latestDate": "20260430",
    "maxPrice": 64000,
    "maxPriceEok": "6억4,000",
    "minPrice": 26500,
    "minPriceEok": "2억6,500",
    "txCount": 469,
    "avg1MPrice": 56900,
    "avg1MPriceEok": "5억6,900",
    "avg1MPerPyeong": 1726,
    "avg1MTxCount": 2,
    "avg3MPrice": 54300,
    "avg3MPriceEok": "5억4,300",
    "avg3MPerPyeong": 1647,
    "avg3MTxCount": 7,
    "recent": [
      {
        "date": "04.30",
        "priceEok": "5억9,990",
        "areaPyeong": 32.9725,
        "floor": 17,
        "area": 81.292
      },
      {
        "date": "04.24",
        "priceEok": "5억3,800",
        "areaPyeong": 32.9725,
        "floor": 7,
        "area": 81.512
      },
      {
        "date": "04.09",
        "priceEok": "5억4,900",
        "areaPyeong": 32.9725,
        "floor": 4,
        "area": 81.292
      },
      {
        "date": "04.09",
        "priceEok": "5억3,400",
        "areaPyeong": 32.9725,
        "floor": 13,
        "area": 80.968
      }
    ],
    "rentTxCount": 513,
    "latestRentDeposit": 8000,
    "latestRentDepositEok": "8,000만",
    "latestRentMonthly": 120,
    "latestRentDate": "20260502",
    "avg1MRentDeposit": 33900,
    "avg1MRentDepositEok": "3억3,900",
    "avg3MRentDeposit": 35600,
    "avg3MRentDepositEok": "3억5,600"
  },
  "동탄나루마을동탄역U.BORA여울숲1.0": {
    "dong": "",
    "latestPrice": 67900,
    "latestPriceEok": "6억7,900",
    "latestArea": 35.089999999999996,
    "latestFloor": 27,
    "latestDate": "20260421",
    "maxPrice": 70800,
    "maxPriceEok": "7억800",
    "minPrice": 25000,
    "minPriceEok": "2억5,000",
    "txCount": 619,
    "avg1MPrice": 67900,
    "avg1MPriceEok": "6억7,900",
    "avg1MPerPyeong": 1935,
    "avg1MTxCount": 1,
    "avg3MPrice": 65000,
    "avg3MPriceEok": "6억5,000",
    "avg3MPerPyeong": 1972,
    "avg3MTxCount": 7,
    "recent": [
      {
        "date": "04.21",
        "priceEok": "6억7,900",
        "areaPyeong": 35.089999999999996,
        "floor": 27,
        "area": 84.6841
      },
      {
        "date": "04.10",
        "priceEok": "6억5,500",
        "areaPyeong": 30.25,
        "floor": 7,
        "area": 76.7822
      },
      {
        "date": "04.10",
        "priceEok": "6억2,800",
        "areaPyeong": 30.25,
        "floor": 4,
        "area": 76.7822
      },
      {
        "date": "04.08",
        "priceEok": "6억8,000",
        "areaPyeong": 35.089999999999996,
        "floor": 19,
        "area": 84.6841
      }
    ],
    "rentTxCount": 824,
    "latestRentDeposit": 5000,
    "latestRentDepositEok": "5,000만",
    "latestRentMonthly": 165,
    "latestRentDate": "20260502",
    "avg1MRentDeposit": 39300,
    "avg1MRentDepositEok": "3억9,300",
    "avg3MRentDeposit": 38000,
    "avg3MRentDepositEok": "3억8,000"
  },
  "금호어울림레이크2차": {
    "dong": "",
    "latestPrice": 66400,
    "latestPriceEok": "6억6,400",
    "latestArea": 33.879999999999995,
    "latestFloor": 3,
    "latestDate": "20260429",
    "maxPrice": 89800,
    "maxPriceEok": "8억9,800",
    "minPrice": 32500,
    "minPriceEok": "3억2,500",
    "txCount": 256,
    "avg1MPrice": 67900,
    "avg1MPriceEok": "6억7,900",
    "avg1MPerPyeong": 2066,
    "avg1MTxCount": 4,
    "avg3MPrice": 67500,
    "avg3MPriceEok": "6억7,500",
    "avg3MPerPyeong": 2075,
    "avg3MTxCount": 9,
    "recent": [
      {
        "date": "04.29",
        "priceEok": "6억6,400",
        "areaPyeong": 33.879999999999995,
        "floor": 3,
        "area": 84.96
      },
      {
        "date": "04.24",
        "priceEok": "6억9,500",
        "areaPyeong": 33.879999999999995,
        "floor": 7,
        "area": 84.97
      },
      {
        "date": "04.22",
        "priceEok": "6억5,500",
        "areaPyeong": 29.947499999999998,
        "floor": 18,
        "area": 74.99
      },
      {
        "date": "04.18",
        "priceEok": "7억",
        "areaPyeong": 33.879999999999995,
        "floor": 20,
        "area": 84.97
      }
    ],
    "rentTxCount": 349,
    "latestRentDeposit": 49000,
    "latestRentDepositEok": "4억9,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260502",
    "avg1MRentDeposit": 40400,
    "avg1MRentDepositEok": "4억400",
    "avg3MRentDeposit": 42200,
    "avg3MRentDepositEok": "4억2,200"
  },
  "솔빛마을신도브래뉴": {
    "dong": "",
    "latestPrice": 79000,
    "latestPriceEok": "7억9,000",
    "latestArea": 34.098250725,
    "latestFloor": 7,
    "latestDate": "20260501",
    "maxPrice": 82400,
    "maxPriceEok": "8억2,400",
    "minPrice": 27500,
    "minPriceEok": "2억7,500",
    "txCount": 685,
    "avg1MPrice": 80700,
    "avg1MPriceEok": "8억700",
    "avg1MPerPyeong": 2367,
    "avg1MTxCount": 2,
    "avg3MPrice": 78700,
    "avg3MPriceEok": "7억8,700",
    "avg3MPerPyeong": 2343,
    "avg3MTxCount": 4,
    "recent": [
      {
        "date": "05.01",
        "priceEok": "7억9,000",
        "areaPyeong": 34.098250725,
        "floor": 7,
        "area": 84.753
      },
      {
        "date": "04.27",
        "priceEok": "8억2,400",
        "areaPyeong": 34.098250725,
        "floor": 6,
        "area": 84.753
      },
      {
        "date": "04.06",
        "priceEok": "7억4,500",
        "areaPyeong": 32.031949757499994,
        "floor": 21,
        "area": 79.6171
      },
      {
        "date": "02.20",
        "priceEok": "7억8,800",
        "areaPyeong": 34.098250725,
        "floor": 21,
        "area": 84.753
      }
    ],
    "rentTxCount": 684,
    "latestRentDeposit": 59000,
    "latestRentDepositEok": "5억9,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260420",
    "avg1MRentDeposit": 48900,
    "avg1MRentDepositEok": "4억8,900",
    "avg3MRentDeposit": 44600,
    "avg3MRentDepositEok": "4억4,600"
  },
  "동탄역신안인스빌리베라1차": {
    "dong": "청계동",
    "latestPrice": 81800,
    "latestPriceEok": "8억1,800",
    "latestArea": 39.93,
    "latestFloor": 4,
    "latestDate": "20260508",
    "maxPrice": 97000,
    "maxPriceEok": "9억7,000",
    "minPrice": 39500,
    "minPriceEok": "3억9,500",
    "txCount": 426,
    "avg1MPrice": 77000,
    "avg1MPriceEok": "7억7,000",
    "avg1MPerPyeong": 2216,
    "avg1MTxCount": 5,
    "avg3MPrice": 77600,
    "avg3MPriceEok": "7억7,600",
    "avg3MPerPyeong": 2180,
    "avg3MTxCount": 9,
    "recent": [
      {
        "date": "05.08",
        "priceEok": "8억1,800",
        "areaPyeong": 39.93,
        "floor": 4,
        "area": 101.9997
      },
      {
        "date": "05.01",
        "priceEok": "7억7,500",
        "areaPyeong": 33.5775,
        "floor": 20,
        "area": 84.9814
      },
      {
        "date": "04.30",
        "priceEok": "7억9,000",
        "areaPyeong": 33.5775,
        "floor": 16,
        "area": 84.9814
      },
      {
        "date": "04.24",
        "priceEok": "7억5,000",
        "areaPyeong": 33.5775,
        "floor": 18,
        "area": 84.9814
      }
    ],
    "rentTxCount": 757,
    "latestRentDeposit": 58000,
    "latestRentDepositEok": "5억8,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260429",
    "avg1MRentDeposit": 53800,
    "avg1MRentDepositEok": "5억3,800",
    "avg3MRentDeposit": 51300,
    "avg3MRentDepositEok": "5억1,300"
  },
  "시범한빛마을한화꿈에그린": {
    "dong": "반송동",
    "latestPrice": 90000,
    "latestPriceEok": "9억",
    "latestArea": 34.11716,
    "latestFloor": 13,
    "latestDate": "20260511",
    "maxPrice": 92000,
    "maxPriceEok": "9억2,000",
    "minPrice": 28000,
    "minPriceEok": "2억8,000",
    "txCount": 595,
    "avg1MPrice": 83000,
    "avg1MPriceEok": "8억3,000",
    "avg1MPerPyeong": 2433,
    "avg1MTxCount": 4,
    "avg3MPrice": 82100,
    "avg3MPriceEok": "8억2,100",
    "avg3MPerPyeong": 2406,
    "avg3MTxCount": 7,
    "recent": [
      {
        "date": "05.11",
        "priceEok": "9억",
        "areaPyeong": 34.11716,
        "floor": 13,
        "area": 84.8
      },
      {
        "date": "04.25",
        "priceEok": "8억3,500",
        "areaPyeong": 34.11716,
        "floor": 11,
        "area": 84.8
      },
      {
        "date": "04.18",
        "priceEok": "8억500",
        "areaPyeong": 34.088997250000006,
        "floor": 17,
        "area": 84.73
      },
      {
        "date": "04.16",
        "priceEok": "7억8,000",
        "areaPyeong": 34.11313675,
        "floor": 7,
        "area": 84.79
      }
    ],
    "rentTxCount": 845,
    "latestRentDeposit": 5000,
    "latestRentDepositEok": "5,000만",
    "latestRentMonthly": 190,
    "latestRentDate": "20260501",
    "avg1MRentDeposit": 41000,
    "avg1MRentDepositEok": "4억1,000",
    "avg3MRentDeposit": 42000,
    "avg3MRentDepositEok": "4억2,000"
  },
  "동탄센트럴포레스트": {
    "dong": "반송동",
    "latestPrice": 51000,
    "latestPriceEok": "5억1,000",
    "latestArea": 29.947499999999998,
    "latestFloor": 4,
    "latestDate": "20260511",
    "maxPrice": 63400,
    "maxPriceEok": "6억3,400",
    "minPrice": 19950,
    "minPriceEok": "1억9,950",
    "txCount": 291,
    "avg1MPrice": 51600,
    "avg1MPriceEok": "5억1,600",
    "avg1MPerPyeong": 1683,
    "avg1MTxCount": 6,
    "avg3MPrice": 51600,
    "avg3MPriceEok": "5억1,600",
    "avg3MPerPyeong": 1682,
    "avg3MTxCount": 16,
    "recent": [
      {
        "date": "05.11",
        "priceEok": "5억1,000",
        "areaPyeong": 29.947499999999998,
        "floor": 4,
        "area": 74.66
      },
      {
        "date": "04.22",
        "priceEok": "4억8,700",
        "areaPyeong": 29.947499999999998,
        "floor": 17,
        "area": 74.66
      },
      {
        "date": "04.19",
        "priceEok": "5억5,500",
        "areaPyeong": 34.1825,
        "floor": 8,
        "area": 84.87
      },
      {
        "date": "04.18",
        "priceEok": "5억2,500",
        "areaPyeong": 29.947499999999998,
        "floor": 6,
        "area": 74.66
      }
    ],
    "rentTxCount": 532,
    "latestRentDeposit": 42000,
    "latestRentDepositEok": "4억2,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260501",
    "avg1MRentDeposit": 36900,
    "avg1MRentDepositEok": "3억6,900",
    "avg3MRentDeposit": 33300,
    "avg3MRentDepositEok": "3억3,300"
  },
  "롯데캐슬알바트로스": {
    "dong": "",
    "latestPrice": 96500,
    "latestPriceEok": "9억6,500",
    "latestArea": 40.99080216,
    "latestFloor": 10,
    "latestDate": "20260430",
    "maxPrice": 175000,
    "maxPriceEok": "17억5,000",
    "minPrice": 47227,
    "minPriceEok": "4억7,227",
    "txCount": 621,
    "avg1MPrice": 99700,
    "avg1MPriceEok": "9억9,700",
    "avg1MPerPyeong": 2431,
    "avg1MTxCount": 6,
    "avg3MPrice": 101200,
    "avg3MPriceEok": "10억1,200",
    "avg3MPerPyeong": 2384,
    "avg3MTxCount": 22,
    "recent": [
      {
        "date": "04.30",
        "priceEok": "9억6,500",
        "areaPyeong": 40.99080216,
        "floor": 10,
        "area": 101.8848
      },
      {
        "date": "04.27",
        "priceEok": "10억5,000",
        "areaPyeong": 40.99080216,
        "floor": 20,
        "area": 101.8848
      },
      {
        "date": "04.27",
        "priceEok": "10억4,500",
        "areaPyeong": 40.99080216,
        "floor": 16,
        "area": 101.8848
      },
      {
        "date": "04.26",
        "priceEok": "10억4,500",
        "areaPyeong": 40.99080216,
        "floor": 3,
        "area": 101.8848
      }
    ],
    "rentTxCount": 958,
    "latestRentDeposit": 65000,
    "latestRentDepositEok": "6억5,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260430",
    "avg1MRentDeposit": 61700,
    "avg1MRentDepositEok": "6억1,700",
    "avg3MRentDeposit": 58600,
    "avg3MRentDepositEok": "5억8,600"
  },
  "나루마을한화꿈에그린우림필유": {
    "dong": "",
    "latestPrice": 73800,
    "latestPriceEok": "7억3,800",
    "latestArea": 33.5775,
    "latestFloor": 8,
    "latestDate": "20260410",
    "maxPrice": 76500,
    "maxPriceEok": "7억6,500",
    "minPrice": 28000,
    "minPriceEok": "2억8,000",
    "txCount": 802,
    "avg1MPrice": 73800,
    "avg1MPriceEok": "7억3,800",
    "avg1MPerPyeong": 2198,
    "avg1MTxCount": 0,
    "avg3MPrice": 73100,
    "avg3MPriceEok": "7억3,100",
    "avg3MPerPyeong": 2181,
    "avg3MTxCount": 4,
    "recent": [
      {
        "date": "04.10",
        "priceEok": "7억3,800",
        "areaPyeong": 33.5775,
        "floor": 8,
        "area": 84.96
      },
      {
        "date": "04.01",
        "priceEok": "7억3,500",
        "areaPyeong": 33.5775,
        "floor": 29,
        "area": 84.96
      },
      {
        "date": "03.29",
        "priceEok": "7억2,000",
        "areaPyeong": 33.275,
        "floor": 18,
        "area": 84.94
      },
      {
        "date": "03.04",
        "priceEok": "7억3,000",
        "areaPyeong": 33.5775,
        "floor": 14,
        "area": 84.96
      }
    ],
    "rentTxCount": 946,
    "latestRentDeposit": 20000,
    "latestRentDepositEok": "2억",
    "latestRentMonthly": 105,
    "latestRentDate": "20260430",
    "avg1MRentDeposit": 43200,
    "avg1MRentDepositEok": "4억3,200",
    "avg3MRentDeposit": 41300,
    "avg3MRentDepositEok": "4억1,300"
  },
  "METAPOLIS": {
    "dong": "반송동",
    "latestPrice": 105000,
    "latestPriceEok": "10억5,000",
    "latestArea": 45.98,
    "latestFloor": 27,
    "latestDate": "20260505",
    "maxPrice": 232500,
    "maxPriceEok": "23억2,500",
    "minPrice": 41000,
    "minPriceEok": "4억1,000",
    "txCount": 881,
    "avg1MPrice": 113800,
    "avg1MPriceEok": "11억3,800",
    "avg1MPerPyeong": 2343,
    "avg1MTxCount": 4,
    "avg3MPrice": 112500,
    "avg3MPriceEok": "11억2,500",
    "avg3MPerPyeong": 2405,
    "avg3MTxCount": 6,
    "recent": [
      {
        "date": "05.05",
        "priceEok": "10억5,000",
        "areaPyeong": 45.98,
        "floor": 27,
        "area": 107.778
      },
      {
        "date": "04.27",
        "priceEok": "12억5,000",
        "areaPyeong": 54.1475,
        "floor": 18,
        "area": 128.44
      },
      {
        "date": "04.19",
        "priceEok": "12억",
        "areaPyeong": 48.0975,
        "floor": 43,
        "area": 112.444
      },
      {
        "date": "04.18",
        "priceEok": "10억5,000",
        "areaPyeong": 45.98,
        "floor": 27,
        "area": 107.778
      }
    ],
    "rentTxCount": 1633,
    "latestRentDeposit": 10000,
    "latestRentDepositEok": "1억",
    "latestRentMonthly": 250,
    "latestRentDate": "20260430",
    "avg1MRentDeposit": 59700,
    "avg1MRentDepositEok": "5억9,700",
    "avg3MRentDeposit": 60800,
    "avg3MRentDepositEok": "6억800"
  },
  "동탄역푸르지오": {
    "dong": "영천동",
    "latestPrice": 95000,
    "latestPriceEok": "9억5,000",
    "latestArea": 33.879999999999995,
    "latestFloor": 23,
    "latestDate": "20260425",
    "maxPrice": 112000,
    "maxPriceEok": "11억2,000",
    "minPrice": 39994,
    "minPriceEok": "3억9,994",
    "txCount": 313,
    "avg1MPrice": 90700,
    "avg1MPriceEok": "9억700",
    "avg1MPerPyeong": 2860,
    "avg1MTxCount": 4,
    "avg3MPrice": 90600,
    "avg3MPriceEok": "9억600",
    "avg3MPerPyeong": 2797,
    "avg3MTxCount": 18,
    "recent": [
      {
        "date": "04.25",
        "priceEok": "9억5,000",
        "areaPyeong": 33.879999999999995,
        "floor": 23,
        "area": 84.6681
      },
      {
        "date": "04.23",
        "priceEok": "9억4,300",
        "areaPyeong": 33.879999999999995,
        "floor": 12,
        "area": 84.6681
      },
      {
        "date": "04.21",
        "priceEok": "8억5,000",
        "areaPyeong": 29.645,
        "floor": 4,
        "area": 74.8664
      },
      {
        "date": "04.15",
        "priceEok": "8억8,500",
        "areaPyeong": 29.645,
        "floor": 7,
        "area": 74.8664
      }
    ],
    "rentTxCount": 594,
    "latestRentDeposit": 50000,
    "latestRentDepositEok": "5억",
    "latestRentMonthly": 0,
    "latestRentDate": "20260429",
    "avg1MRentDeposit": 42600,
    "avg1MRentDepositEok": "4억2,600",
    "avg3MRentDeposit": 42300,
    "avg3MRentDepositEok": "4억2,300"
  },
  "시범한빛마을동탄아이파크": {
    "dong": "",
    "latestPrice": 83500,
    "latestPriceEok": "8억3,500",
    "latestArea": 24.80655485,
    "latestFloor": 18,
    "latestDate": "20260508",
    "maxPrice": 98000,
    "maxPriceEok": "9억8,000",
    "minPrice": 21500,
    "minPriceEok": "2억1,500",
    "txCount": 855,
    "avg1MPrice": 80700,
    "avg1MPriceEok": "8억700",
    "avg1MPerPyeong": 3251,
    "avg1MTxCount": 4,
    "avg3MPrice": 87600,
    "avg3MPriceEok": "8억7,600",
    "avg3MPerPyeong": 2841,
    "avg3MTxCount": 16,
    "recent": [
      {
        "date": "05.08",
        "priceEok": "8억3,500",
        "areaPyeong": 24.80655485,
        "floor": 18,
        "area": 61.658
      },
      {
        "date": "04.28",
        "priceEok": "8억1,700",
        "areaPyeong": 24.80655485,
        "floor": 10,
        "area": 61.658
      },
      {
        "date": "04.24",
        "priceEok": "7억9,000",
        "areaPyeong": 24.80655485,
        "floor": 10,
        "area": 61.658
      },
      {
        "date": "04.14",
        "priceEok": "7억8,400",
        "areaPyeong": 24.80655485,
        "floor": 10,
        "area": 61.658
      }
    ],
    "rentTxCount": 1417,
    "latestRentDeposit": 10000,
    "latestRentDepositEok": "1억",
    "latestRentMonthly": 140,
    "latestRentDate": "20260418",
    "avg1MRentDeposit": 43800,
    "avg1MRentDepositEok": "4억3,800",
    "avg3MRentDeposit": 43500,
    "avg3MRentDepositEok": "4억3,500"
  },
  "푸른마을두산위브": {
    "dong": "",
    "latestPrice": 51400,
    "latestPriceEok": "5억1,400",
    "latestArea": 29.50249225,
    "latestFloor": 27,
    "latestDate": "20260427",
    "maxPrice": 87000,
    "maxPriceEok": "8억7,000",
    "minPrice": 26000,
    "minPriceEok": "2억6,000",
    "txCount": 995,
    "avg1MPrice": 51100,
    "avg1MPriceEok": "5억1,100",
    "avg1MPerPyeong": 1649,
    "avg1MTxCount": 2,
    "avg3MPrice": 53600,
    "avg3MPriceEok": "5억3,600",
    "avg3MPerPyeong": 1672,
    "avg3MTxCount": 9,
    "recent": [
      {
        "date": "04.27",
        "priceEok": "5억1,400",
        "areaPyeong": 29.50249225,
        "floor": 27,
        "area": 73.33
      },
      {
        "date": "04.13",
        "priceEok": "5억800",
        "areaPyeong": 32.636604000000005,
        "floor": 10,
        "area": 81.12
      },
      {
        "date": "03.26",
        "priceEok": "5억3,900",
        "areaPyeong": 29.240981000000005,
        "floor": 4,
        "area": 72.68
      },
      {
        "date": "03.05",
        "priceEok": "5억3,300",
        "areaPyeong": 29.50249225,
        "floor": 28,
        "area": 73.33
      }
    ],
    "rentTxCount": 1027,
    "latestRentDeposit": 10000,
    "latestRentDepositEok": "1억",
    "latestRentMonthly": 110,
    "latestRentDate": "20260425",
    "avg1MRentDeposit": 31700,
    "avg1MRentDepositEok": "3억1,700",
    "avg3MRentDeposit": 34200,
    "avg3MRentDepositEok": "3억4,200"
  },
  "르파비스": {
    "dong": "",
    "latestPrice": 51000,
    "latestPriceEok": "5억1,000",
    "latestArea": 24.014779249999997,
    "latestFloor": 13,
    "latestDate": "20260509",
    "maxPrice": 63500,
    "maxPriceEok": "6억3,500",
    "minPrice": 39000,
    "minPriceEok": "3억9,000",
    "txCount": 77,
    "avg1MPrice": 51500,
    "avg1MPriceEok": "5억1,500",
    "avg1MPerPyeong": 2007,
    "avg1MTxCount": 5,
    "avg3MPrice": 49300,
    "avg3MPriceEok": "4억9,300",
    "avg3MPerPyeong": 2000,
    "avg3MTxCount": 13,
    "recent": [
      {
        "date": "05.09",
        "priceEok": "5억1,000",
        "areaPyeong": 24.014779249999997,
        "floor": 13,
        "area": 59.69
      },
      {
        "date": "04.27",
        "priceEok": "5억9,800",
        "areaPyeong": 34.1573925,
        "floor": 12,
        "area": 84.9
      },
      {
        "date": "04.23",
        "priceEok": "4억4,300",
        "areaPyeong": 20.91687675,
        "floor": 7,
        "area": 51.99
      },
      {
        "date": "04.18",
        "priceEok": "5억8,800",
        "areaPyeong": 30.170351750000002,
        "floor": 12,
        "area": 74.99
      }
    ],
    "rentTxCount": 700,
    "latestRentDeposit": 17654,
    "latestRentDepositEok": "1억7,654",
    "latestRentMonthly": 35,
    "latestRentDate": "20260212",
    "avg1MRentDeposit": 25300,
    "avg1MRentDepositEok": "2억5,300",
    "avg3MRentDeposit": 25300,
    "avg3MRentDepositEok": "2억5,300"
  },
  "동탄2아이파크2단지": {
    "dong": "",
    "latestPrice": 52000,
    "latestPriceEok": "5억2,000",
    "latestArea": 38.115,
    "latestFloor": 2,
    "latestDate": "20260509",
    "maxPrice": 83800,
    "maxPriceEok": "8억3,800",
    "minPrice": 35700,
    "minPriceEok": "3억5,700",
    "txCount": 142,
    "avg1MPrice": 51600,
    "avg1MPriceEok": "5억1,600",
    "avg1MPerPyeong": 1486,
    "avg1MTxCount": 3,
    "avg3MPrice": 52800,
    "avg3MPriceEok": "5억2,800",
    "avg3MPerPyeong": 1534,
    "avg3MTxCount": 12,
    "recent": [
      {
        "date": "05.09",
        "priceEok": "5억2,000",
        "areaPyeong": 38.115,
        "floor": 2,
        "area": 96.9237
      },
      {
        "date": "04.27",
        "priceEok": "5억400",
        "areaPyeong": 33.275,
        "floor": 8,
        "area": 84.8688
      },
      {
        "date": "04.22",
        "priceEok": "5억2,500",
        "areaPyeong": 33.275,
        "floor": 6,
        "area": 84.8688
      },
      {
        "date": "04.08",
        "priceEok": "5억3,000",
        "areaPyeong": 33.275,
        "floor": 8,
        "area": 84.8688
      }
    ],
    "rentTxCount": 257,
    "latestRentDeposit": 36000,
    "latestRentDepositEok": "3억6,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260427",
    "avg1MRentDeposit": 36200,
    "avg1MRentDepositEok": "3억6,200",
    "avg3MRentDeposit": 36000,
    "avg3MRentDepositEok": "3억6,000"
  },
  "시범한빛마을금호어울림": {
    "dong": "",
    "latestPrice": 80000,
    "latestPriceEok": "8억",
    "latestArea": 34.041925225,
    "latestFloor": 3,
    "latestDate": "20260426",
    "maxPrice": 89400,
    "maxPriceEok": "8억9,400",
    "minPrice": 28800,
    "minPriceEok": "2억8,800",
    "txCount": 596,
    "avg1MPrice": 80000,
    "avg1MPriceEok": "8억",
    "avg1MPerPyeong": 2350,
    "avg1MTxCount": 1,
    "avg3MPrice": 83500,
    "avg3MPriceEok": "8억3,500",
    "avg3MPerPyeong": 2454,
    "avg3MTxCount": 7,
    "recent": [
      {
        "date": "04.26",
        "priceEok": "8억",
        "areaPyeong": 34.041925225,
        "floor": 3,
        "area": 84.613
      },
      {
        "date": "04.08",
        "priceEok": "8억4,700",
        "areaPyeong": 34.041925225,
        "floor": 9,
        "area": 84.613
      },
      {
        "date": "03.27",
        "priceEok": "8억350",
        "areaPyeong": 33.982381125,
        "floor": 11,
        "area": 84.465
      },
      {
        "date": "03.26",
        "priceEok": "7억7,800",
        "areaPyeong": 33.982381125,
        "floor": 15,
        "area": 84.465
      }
    ],
    "rentTxCount": 1325,
    "latestRentDeposit": 42000,
    "latestRentDepositEok": "4억2,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260427",
    "avg1MRentDeposit": 41800,
    "avg1MRentDepositEok": "4억1,800",
    "avg3MRentDeposit": 42300,
    "avg3MRentDepositEok": "4억2,300"
  },
  "더샵센트럴시티": {
    "dong": "청계동",
    "latestPrice": 144500,
    "latestPriceEok": "14억4,500",
    "latestArea": 34.1825,
    "latestFloor": 1,
    "latestDate": "20260506",
    "maxPrice": 180000,
    "maxPriceEok": "18억",
    "minPrice": 48106,
    "minPriceEok": "4억8,106",
    "txCount": 383,
    "avg1MPrice": 151800,
    "avg1MPriceEok": "15억1,800",
    "avg1MPerPyeong": 4439,
    "avg1MTxCount": 2,
    "avg3MPrice": 160700,
    "avg3MPriceEok": "16억700",
    "avg3MPerPyeong": 4343,
    "avg3MTxCount": 10,
    "recent": [
      {
        "date": "05.06",
        "priceEok": "14억4,500",
        "areaPyeong": 34.1825,
        "floor": 1,
        "area": 84.796
      },
      {
        "date": "04.25",
        "priceEok": "15억9,000",
        "areaPyeong": 34.1825,
        "floor": 9,
        "area": 84.796
      },
      {
        "date": "04.09",
        "priceEok": "17억3,500",
        "areaPyeong": 38.4175,
        "floor": 22,
        "area": 97.046
      },
      {
        "date": "04.03",
        "priceEok": "16억4,000",
        "areaPyeong": 38.115,
        "floor": 12,
        "area": 97.036
      }
    ],
    "rentTxCount": 961,
    "latestRentDeposit": 10000,
    "latestRentDepositEok": "1억",
    "latestRentMonthly": 280,
    "latestRentDate": "20260411",
    "avg1MRentDeposit": 71100,
    "avg1MRentDepositEok": "7억1,100",
    "avg3MRentDeposit": 71800,
    "avg3MRentDepositEok": "7억1,800"
  },
  "시범다은마을포스코더샵": {
    "dong": "",
    "latestPrice": 93000,
    "latestPriceEok": "9억3,000",
    "latestArea": 48.3700461475,
    "latestFloor": 21,
    "latestDate": "20260425",
    "maxPrice": 110500,
    "maxPriceEok": "11억500",
    "minPrice": 30000,
    "minPriceEok": "3억",
    "txCount": 533,
    "avg1MPrice": 85500,
    "avg1MPriceEok": "8억5,500",
    "avg1MPerPyeong": 2108,
    "avg1MTxCount": 2,
    "avg3MPrice": 78600,
    "avg3MPriceEok": "7억8,600",
    "avg3MPerPyeong": 2194,
    "avg3MTxCount": 7,
    "recent": [
      {
        "date": "04.25",
        "priceEok": "9억3,000",
        "areaPyeong": 48.3700461475,
        "floor": 21,
        "area": 120.2263
      },
      {
        "date": "04.20",
        "priceEok": "7억8,000",
        "areaPyeong": 34.000928307500004,
        "floor": 5,
        "area": 84.5111
      },
      {
        "date": "04.10",
        "priceEok": "7억7,500",
        "areaPyeong": 34.000928307500004,
        "floor": 18,
        "area": 84.5111
      },
      {
        "date": "04.04",
        "priceEok": "7억6,500",
        "areaPyeong": 34.000928307500004,
        "floor": 6,
        "area": 84.5111
      }
    ],
    "rentTxCount": 634,
    "latestRentDeposit": 41000,
    "latestRentDepositEok": "4억1,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260311",
    "avg1MRentDeposit": 41000,
    "avg1MRentDepositEok": "4억1,000",
    "avg3MRentDeposit": 44900,
    "avg3MRentDepositEok": "4억4,900"
  },
  "시범한빛마을케이씨씨스위첸": {
    "dong": "",
    "latestPrice": 65000,
    "latestPriceEok": "6억5,000",
    "latestArea": 34.0574952025,
    "latestFloor": 3,
    "latestDate": "20260429",
    "maxPrice": 75000,
    "maxPriceEok": "7억5,000",
    "minPrice": 26800,
    "minPriceEok": "2억6,800",
    "txCount": 591,
    "avg1MPrice": 66600,
    "avg1MPriceEok": "6억6,600",
    "avg1MPerPyeong": 1954,
    "avg1MTxCount": 3,
    "avg3MPrice": 65900,
    "avg3MPriceEok": "6억5,900",
    "avg3MPerPyeong": 1933,
    "avg3MTxCount": 13,
    "recent": [
      {
        "date": "04.29",
        "priceEok": "6억5,000",
        "areaPyeong": 34.0574952025,
        "floor": 3,
        "area": 84.6517
      },
      {
        "date": "04.24",
        "priceEok": "6억6,000",
        "areaPyeong": 34.09012376,
        "floor": 2,
        "area": 84.7328
      },
      {
        "date": "04.17",
        "priceEok": "6억8,700",
        "areaPyeong": 34.0574952025,
        "floor": 6,
        "area": 84.6517
      },
      {
        "date": "03.31",
        "priceEok": "6억3,500",
        "areaPyeong": 34.0574952025,
        "floor": 2,
        "area": 84.6517
      }
    ],
    "rentTxCount": 691,
    "latestRentDeposit": 43000,
    "latestRentDepositEok": "4억3,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260418",
    "avg1MRentDeposit": 40500,
    "avg1MRentDepositEok": "4억500",
    "avg3MRentDeposit": 39200,
    "avg3MRentDepositEok": "3억9,200"
  },
  "시범다은마을삼성래미안": {
    "dong": "",
    "latestPrice": 76800,
    "latestPriceEok": "7억6,800",
    "latestArea": 34.040637785,
    "latestFloor": 11,
    "latestDate": "20260424",
    "maxPrice": 103500,
    "maxPriceEok": "10억3,500",
    "minPrice": 23000,
    "minPriceEok": "2억3,000",
    "txCount": 537,
    "avg1MPrice": 75900,
    "avg1MPriceEok": "7억5,900",
    "avg1MPerPyeong": 2230,
    "avg1MTxCount": 2,
    "avg3MPrice": 75600,
    "avg3MPriceEok": "7억5,600",
    "avg3MPerPyeong": 2168,
    "avg3MTxCount": 6,
    "recent": [
      {
        "date": "04.24",
        "priceEok": "7억6,800",
        "areaPyeong": 34.040637785,
        "floor": 11,
        "area": 84.6098
      },
      {
        "date": "04.24",
        "priceEok": "7억5,000",
        "areaPyeong": 34.040637785,
        "floor": 10,
        "area": 84.6098
      },
      {
        "date": "04.04",
        "priceEok": "7억500",
        "areaPyeong": 34.040637785,
        "floor": 3,
        "area": 84.6098
      },
      {
        "date": "04.02",
        "priceEok": "8억2,000",
        "areaPyeong": 39.01506455,
        "floor": 17,
        "area": 96.974
      }
    ],
    "rentTxCount": 678,
    "latestRentDeposit": 51000,
    "latestRentDepositEok": "5억1,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260418",
    "avg1MRentDeposit": 51000,
    "avg1MRentDepositEok": "5억1,000",
    "avg3MRentDeposit": 47000,
    "avg3MRentDepositEok": "4억7,000"
  },
  "동탄역반도유보라아이비파크7.0": {
    "dong": "여울동",
    "latestPrice": 130000,
    "latestPriceEok": "13억",
    "latestArea": 37.8125,
    "latestFloor": 45,
    "latestDate": "20260424",
    "maxPrice": 149000,
    "maxPriceEok": "14억9,000",
    "minPrice": 67000,
    "minPriceEok": "6억7,000",
    "txCount": 169,
    "avg1MPrice": 123900,
    "avg1MPriceEok": "12억3,900",
    "avg1MPerPyeong": 3595,
    "avg1MTxCount": 6,
    "avg3MPrice": 121400,
    "avg3MPriceEok": "12억1,400",
    "avg3MPerPyeong": 3559,
    "avg3MTxCount": 19,
    "recent": [
      {
        "date": "04.24",
        "priceEok": "13억",
        "areaPyeong": 37.8125,
        "floor": 45,
        "area": 86.2318
      },
      {
        "date": "04.20",
        "priceEok": "13억9,000",
        "areaPyeong": 37.8125,
        "floor": 43,
        "area": 86.2318
      },
      {
        "date": "04.19",
        "priceEok": "12억5,000",
        "areaPyeong": 32.67,
        "floor": 40,
        "area": 73.6524
      },
      {
        "date": "04.15",
        "priceEok": "11억9,500",
        "areaPyeong": 32.67,
        "floor": 20,
        "area": 73.4311
      }
    ],
    "rentTxCount": 65,
    "latestRentDeposit": 20000,
    "latestRentDepositEok": "2억",
    "latestRentMonthly": 82,
    "latestRentDate": "20260406",
    "avg1MRentDeposit": 37900,
    "avg1MRentDepositEok": "3억7,900",
    "avg3MRentDeposit": 44800,
    "avg3MRentDepositEok": "4억4,800"
  },
  "동탄숲속마을자연앤경남아너스빌1124-0": {
    "dong": "",
    "latestPrice": 55000,
    "latestPriceEok": "5억5,000",
    "latestArea": 30.5525,
    "latestFloor": 10,
    "latestDate": "20260424",
    "maxPrice": 69000,
    "maxPriceEok": "6억9,000",
    "minPrice": 23250,
    "minPriceEok": "2억3,250",
    "txCount": 492,
    "avg1MPrice": 54600,
    "avg1MPriceEok": "5억4,600",
    "avg1MPerPyeong": 1787,
    "avg1MTxCount": 3,
    "avg3MPrice": 55800,
    "avg3MPriceEok": "5억5,800",
    "avg3MPerPyeong": 1772,
    "avg3MTxCount": 13,
    "recent": [
      {
        "date": "04.24",
        "priceEok": "5억5,000",
        "areaPyeong": 30.5525,
        "floor": 10,
        "area": 76.51
      },
      {
        "date": "04.23",
        "priceEok": "5억6,000",
        "areaPyeong": 30.5525,
        "floor": 19,
        "area": 76.51
      },
      {
        "date": "04.13",
        "priceEok": "5억2,800",
        "areaPyeong": 30.5525,
        "floor": 10,
        "area": 76.5
      },
      {
        "date": "04.04",
        "priceEok": "6억2,500",
        "areaPyeong": 33.5775,
        "floor": 20,
        "area": 84.55
      }
    ],
    "rentTxCount": 817,
    "latestRentDeposit": 3000,
    "latestRentDepositEok": "3,000만",
    "latestRentMonthly": 126,
    "latestRentDate": "20260421",
    "avg1MRentDeposit": 33700,
    "avg1MRentDepositEok": "3억3,700",
    "avg3MRentDeposit": 32000,
    "avg3MRentDepositEok": "3억2,000"
  },
  "시범반도유보라아이비파크4.0": {
    "dong": "청계동",
    "latestPrice": 135000,
    "latestPriceEok": "13억5,000",
    "latestArea": 38.91621329750001,
    "latestFloor": 38,
    "latestDate": "20260507",
    "maxPrice": 142000,
    "maxPriceEok": "14억2,000",
    "minPrice": 70000,
    "minPriceEok": "7억",
    "txCount": 310,
    "avg1MPrice": 126900,
    "avg1MPriceEok": "12억6,900",
    "avg1MPerPyeong": 3371,
    "avg1MTxCount": 4,
    "avg3MPrice": 122700,
    "avg3MPriceEok": "12억2,700",
    "avg3MPerPyeong": 3344,
    "avg3MTxCount": 11,
    "recent": [
      {
        "date": "05.07",
        "priceEok": "13억5,000",
        "areaPyeong": 38.91621329750001,
        "floor": 38,
        "area": 96.7283
      },
      {
        "date": "04.18",
        "priceEok": "12억5,000",
        "areaPyeong": 38.91621329750001,
        "floor": 14,
        "area": 96.7283
      },
      {
        "date": "04.15",
        "priceEok": "12억",
        "areaPyeong": 34.024222925000004,
        "floor": 24,
        "area": 84.569
      },
      {
        "date": "04.14",
        "priceEok": "12억7,500",
        "areaPyeong": 38.91621329750001,
        "floor": 27,
        "area": 96.7283
      }
    ],
    "rentTxCount": 524,
    "latestRentDeposit": 40000,
    "latestRentDepositEok": "4억",
    "latestRentMonthly": 130,
    "latestRentDate": "20260424",
    "avg1MRentDeposit": 65200,
    "avg1MRentDepositEok": "6억5,200",
    "avg3MRentDeposit": 65800,
    "avg3MRentDepositEok": "6억5,800"
  },
  "반도유보라아이비파크3": {
    "dong": "",
    "latestPrice": 66500,
    "latestPriceEok": "6억6,500",
    "latestArea": 24.134269775000003,
    "latestFloor": 14,
    "latestDate": "20260423",
    "maxPrice": 95000,
    "maxPriceEok": "9억5,000",
    "minPrice": 29300,
    "minPriceEok": "2억9,300",
    "txCount": 651,
    "avg1MPrice": 75800,
    "avg1MPriceEok": "7억5,800",
    "avg1MPerPyeong": 2621,
    "avg1MTxCount": 2,
    "avg3MPrice": 67500,
    "avg3MPriceEok": "6억7,500",
    "avg3MPerPyeong": 2565,
    "avg3MTxCount": 16,
    "recent": [
      {
        "date": "04.23",
        "priceEok": "6억6,500",
        "areaPyeong": 24.134269775000003,
        "floor": 14,
        "area": 59.987
      },
      {
        "date": "04.20",
        "priceEok": "8억5,000",
        "areaPyeong": 34.1765834025,
        "floor": 9,
        "area": 84.9477
      },
      {
        "date": "04.11",
        "priceEok": "6억2,500",
        "areaPyeong": 24.137166514999997,
        "floor": 11,
        "area": 59.9942
      },
      {
        "date": "04.11",
        "priceEok": "6억4,800",
        "areaPyeong": 24.134269775000003,
        "floor": 7,
        "area": 59.987
      }
    ],
    "rentTxCount": 121,
    "latestRentDeposit": 38000,
    "latestRentDepositEok": "3억8,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260410",
    "avg1MRentDeposit": 38000,
    "avg1MRentDepositEok": "3억8,000",
    "avg3MRentDeposit": 36400,
    "avg3MRentDepositEok": "3억6,400"
  },
  "동탄푸른마을신일해피트리": {
    "dong": "",
    "latestPrice": 42000,
    "latestPriceEok": "4억2,000",
    "latestArea": 23.757291249999998,
    "latestFloor": 5,
    "latestDate": "20260509",
    "maxPrice": 68000,
    "maxPriceEok": "6억8,000",
    "minPrice": 15100,
    "minPriceEok": "1억5,100",
    "txCount": 1773,
    "avg1MPrice": 43300,
    "avg1MPriceEok": "4억3,300",
    "avg1MPerPyeong": 1810,
    "avg1MTxCount": 5,
    "avg3MPrice": 45400,
    "avg3MPriceEok": "4억5,400",
    "avg3MPerPyeong": 1739,
    "avg3MTxCount": 12,
    "recent": [
      {
        "date": "05.09",
        "priceEok": "4억2,000",
        "areaPyeong": 23.757291249999998,
        "floor": 5,
        "area": 59.05
      },
      {
        "date": "05.08",
        "priceEok": "4억700",
        "areaPyeong": 23.757291249999998,
        "floor": 1,
        "area": 59.05
      },
      {
        "date": "04.23",
        "priceEok": "4억5,300",
        "areaPyeong": 24.087197749999998,
        "floor": 3,
        "area": 59.87
      },
      {
        "date": "04.18",
        "priceEok": "4억5,300",
        "areaPyeong": 24.087197749999998,
        "floor": 13,
        "area": 59.87
      }
    ],
    "rentTxCount": 1709,
    "latestRentDeposit": 5000,
    "latestRentDepositEok": "5,000만",
    "latestRentMonthly": 125,
    "latestRentDate": "20260422",
    "avg1MRentDeposit": 31000,
    "avg1MRentDepositEok": "3억1,000",
    "avg3MRentDeposit": 28900,
    "avg3MRentDepositEok": "2억8,900"
  },
  "동탄역반도유보라아이비파크8.0": {
    "dong": "여울동",
    "latestPrice": 112000,
    "latestPriceEok": "11억2,000",
    "latestArea": 31.46,
    "latestFloor": 14,
    "latestDate": "20260423",
    "maxPrice": 144700,
    "maxPriceEok": "14억4,700",
    "minPrice": 60000,
    "minPriceEok": "6억",
    "txCount": 162,
    "avg1MPrice": 112000,
    "avg1MPriceEok": "11억2,000",
    "avg1MPerPyeong": 3560,
    "avg1MTxCount": 1,
    "avg3MPrice": 119900,
    "avg3MPriceEok": "11억9,900",
    "avg3MPerPyeong": 3706,
    "avg3MTxCount": 10,
    "recent": [
      {
        "date": "04.23",
        "priceEok": "11억2,000",
        "areaPyeong": 31.46,
        "floor": 14,
        "area": 73.6524
      },
      {
        "date": "04.11",
        "priceEok": "12억2,000",
        "areaPyeong": 31.1575,
        "floor": 31,
        "area": 73.4311
      },
      {
        "date": "04.10",
        "priceEok": "12억1,000",
        "areaPyeong": 31.46,
        "floor": 19,
        "area": 73.6524
      },
      {
        "date": "04.09",
        "priceEok": "10억9,000",
        "areaPyeong": 31.46,
        "floor": 9,
        "area": 73.6524
      }
    ],
    "rentTxCount": 79,
    "latestRentDeposit": 2000,
    "latestRentDepositEok": "2,000만",
    "latestRentMonthly": 75,
    "latestRentDate": "20260406",
    "avg1MRentDeposit": 18400,
    "avg1MRentDepositEok": "1억8,400",
    "avg3MRentDeposit": 44100,
    "avg3MRentDepositEok": "4억4,100"
  },
  "동탄2아이파크1단지": {
    "dong": "",
    "latestPrice": 62200,
    "latestPriceEok": "6억2,200",
    "latestArea": 38.115,
    "latestFloor": 19,
    "latestDate": "20260423",
    "maxPrice": 85000,
    "maxPriceEok": "8억5,000",
    "minPrice": 38000,
    "minPriceEok": "3억8,000",
    "txCount": 114,
    "avg1MPrice": 62200,
    "avg1MPriceEok": "6억2,200",
    "avg1MPerPyeong": 1632,
    "avg1MTxCount": 1,
    "avg3MPrice": 57900,
    "avg3MPriceEok": "5억7,900",
    "avg3MPerPyeong": 1651,
    "avg3MTxCount": 8,
    "recent": [
      {
        "date": "04.23",
        "priceEok": "6억2,200",
        "areaPyeong": 38.115,
        "floor": 19,
        "area": 96.9237
      },
      {
        "date": "04.03",
        "priceEok": "6억2,800",
        "areaPyeong": 38.115,
        "floor": 19,
        "area": 96.9237
      },
      {
        "date": "03.25",
        "priceEok": "6억2,500",
        "areaPyeong": 38.115,
        "floor": 11,
        "area": 96.9237
      },
      {
        "date": "03.21",
        "priceEok": "5억6,500",
        "areaPyeong": 33.275,
        "floor": 18,
        "area": 84.8688
      }
    ],
    "rentTxCount": 224,
    "latestRentDeposit": 42000,
    "latestRentDepositEok": "4억2,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260416",
    "avg1MRentDeposit": 42000,
    "avg1MRentDepositEok": "4억2,000",
    "avg3MRentDeposit": 36700,
    "avg3MRentDepositEok": "3억6,700"
  },
  "동탄2신도시4차동원로얄듀크포레": {
    "dong": "",
    "latestPrice": 45000,
    "latestPriceEok": "4억5,000",
    "latestArea": 23.8975,
    "latestFloor": 29,
    "latestDate": "20260421",
    "maxPrice": 61000,
    "maxPriceEok": "6억1,000",
    "minPrice": 40000,
    "minPriceEok": "4억",
    "txCount": 56,
    "avg1MPrice": 46300,
    "avg1MPriceEok": "4억6,300",
    "avg1MPerPyeong": 1935,
    "avg1MTxCount": 2,
    "avg3MPrice": 48000,
    "avg3MPriceEok": "4억8,000",
    "avg3MPerPyeong": 2009,
    "avg3MTxCount": 4,
    "recent": [
      {
        "date": "04.21",
        "priceEok": "4억5,000",
        "areaPyeong": 23.8975,
        "floor": 29,
        "area": 59.0157
      },
      {
        "date": "04.17",
        "priceEok": "4억7,500",
        "areaPyeong": 23.8975,
        "floor": 13,
        "area": 59.0157
      },
      {
        "date": "03.07",
        "priceEok": "5억",
        "areaPyeong": 23.8975,
        "floor": 32,
        "area": 59.0157
      },
      {
        "date": "03.07",
        "priceEok": "4억9,500",
        "areaPyeong": 23.8975,
        "floor": 22,
        "area": 59.0157
      }
    ],
    "rentTxCount": 157,
    "latestRentDeposit": 33000,
    "latestRentDepositEok": "3억3,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260410",
    "avg1MRentDeposit": 33000,
    "avg1MRentDepositEok": "3억3,000",
    "avg3MRentDeposit": 33700,
    "avg3MRentDepositEok": "3억3,700"
  },
  "동탄역에일린의뜰": {
    "dong": "여울동",
    "latestPrice": 62500,
    "latestPriceEok": "6억2,500",
    "latestArea": 32.67,
    "latestFloor": 4,
    "latestDate": "20260420",
    "maxPrice": 86000,
    "maxPriceEok": "8억6,000",
    "minPrice": 33720,
    "minPriceEok": "3억3,720",
    "txCount": 248,
    "avg1MPrice": 64400,
    "avg1MPriceEok": "6억4,400",
    "avg1MPerPyeong": 2000,
    "avg1MTxCount": 8,
    "avg3MPrice": 64000,
    "avg3MPriceEok": "6억4,000",
    "avg3MPerPyeong": 2006,
    "avg3MTxCount": 23,
    "recent": [
      {
        "date": "04.20",
        "priceEok": "6억2,500",
        "areaPyeong": 32.67,
        "floor": 4,
        "area": 84.994
      },
      {
        "date": "04.18",
        "priceEok": "7억900",
        "areaPyeong": 32.67,
        "floor": 15,
        "area": 84.994
      },
      {
        "date": "04.18",
        "priceEok": "6억9,500",
        "areaPyeong": 32.67,
        "floor": 9,
        "area": 84.994
      },
      {
        "date": "04.18",
        "priceEok": "6억3,000",
        "areaPyeong": 32.67,
        "floor": 1,
        "area": 84.7918
      }
    ],
    "rentTxCount": 35,
    "latestRentDeposit": 38000,
    "latestRentDepositEok": "3억8,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260409",
    "avg1MRentDeposit": 38000,
    "avg1MRentDepositEok": "3억8,000",
    "avg3MRentDeposit": 35700,
    "avg3MRentDepositEok": "3억5,700"
  },
  "동탄역롯데캐슬": {
    "dong": "여울동",
    "latestPrice": 182000,
    "latestPriceEok": "18억2,000",
    "latestArea": 34.485,
    "latestFloor": 2,
    "latestDate": "20260420",
    "maxPrice": 223000,
    "maxPriceEok": "22억3,000",
    "minPrice": 104000,
    "minPriceEok": "10억4,000",
    "txCount": 168,
    "avg1MPrice": 182000,
    "avg1MPriceEok": "18억2,000",
    "avg1MPerPyeong": 5278,
    "avg1MTxCount": 1,
    "avg3MPrice": 180900,
    "avg3MPriceEok": "18억900",
    "avg3MPerPyeong": 5567,
    "avg3MTxCount": 8,
    "recent": [
      {
        "date": "04.20",
        "priceEok": "18억2,000",
        "areaPyeong": 34.485,
        "floor": 2,
        "area": 84.7002
      },
      {
        "date": "04.10",
        "priceEok": "19억4,000",
        "areaPyeong": 34.485,
        "floor": 23,
        "area": 84.7002
      },
      {
        "date": "04.01",
        "priceEok": "18억4,000",
        "areaPyeong": 34.485,
        "floor": 14,
        "area": 84.8222
      },
      {
        "date": "03.21",
        "priceEok": "16억",
        "areaPyeong": 27.224999999999998,
        "floor": 47,
        "area": 65.9695
      }
    ],
    "rentTxCount": 33,
    "latestRentDeposit": 45000,
    "latestRentDepositEok": "4억5,000",
    "latestRentMonthly": 55,
    "latestRentDate": "20260403",
    "avg1MRentDeposit": 57000,
    "avg1MRentDepositEok": "5억7,000",
    "avg3MRentDeposit": 72700,
    "avg3MRentDepositEok": "7억2,700"
  },
  "동탄역신미주": {
    "dong": "여울동",
    "latestPrice": 64500,
    "latestPriceEok": "6억4,500",
    "latestArea": 32.3675,
    "latestFloor": 7,
    "latestDate": "20260420",
    "maxPrice": 76000,
    "maxPriceEok": "7억6,000",
    "minPrice": 20000,
    "minPriceEok": "2억",
    "txCount": 362,
    "avg1MPrice": 57800,
    "avg1MPriceEok": "5억7,800",
    "avg1MPerPyeong": 1784,
    "avg1MTxCount": 4,
    "avg3MPrice": 57200,
    "avg3MPriceEok": "5억7,200",
    "avg3MPerPyeong": 1767,
    "avg3MTxCount": 16,
    "recent": [
      {
        "date": "04.20",
        "priceEok": "6억4,500",
        "areaPyeong": 32.3675,
        "floor": 7,
        "area": 84.896
      },
      {
        "date": "04.16",
        "priceEok": "5억1,000",
        "areaPyeong": 32.3675,
        "floor": 8,
        "area": 84.896
      },
      {
        "date": "04.14",
        "priceEok": "5억9,500",
        "areaPyeong": 32.3675,
        "floor": 5,
        "area": 84.896
      },
      {
        "date": "04.13",
        "priceEok": "5억6,000",
        "areaPyeong": 32.3675,
        "floor": 3,
        "area": 84.896
      }
    ],
    "rentTxCount": 80,
    "latestRentDeposit": 30000,
    "latestRentDepositEok": "3억",
    "latestRentMonthly": 0,
    "latestRentDate": "20260328",
    "avg1MRentDeposit": 30000,
    "avg1MRentDepositEok": "3억",
    "avg3MRentDeposit": 28700,
    "avg3MRentDepositEok": "2억8,700"
  },
  "화성동탄2센트럴힐즈동탄아파트": {
    "dong": "",
    "latestPrice": 57500,
    "latestPriceEok": "5억7,500",
    "latestArea": 34.181532,
    "latestFloor": 5,
    "latestDate": "20260418",
    "maxPrice": 57500,
    "maxPriceEok": "5억7,500",
    "minPrice": 46500,
    "minPriceEok": "4억6,500",
    "txCount": 16,
    "avg1MPrice": 55300,
    "avg1MPriceEok": "5억5,300",
    "avg1MPerPyeong": 1719,
    "avg1MTxCount": 2,
    "avg3MPrice": 54900,
    "avg3MPriceEok": "5억4,900",
    "avg3MPerPyeong": 1687,
    "avg3MTxCount": 5,
    "recent": [
      {
        "date": "04.18",
        "priceEok": "5억7,500",
        "areaPyeong": 34.181532,
        "floor": 5,
        "area": 84.96
      },
      {
        "date": "04.13",
        "priceEok": "5억3,000",
        "areaPyeong": 30.170351750000002,
        "floor": 16,
        "area": 74.99
      },
      {
        "date": "04.04",
        "priceEok": "5억4,800",
        "areaPyeong": 34.181532,
        "floor": 4,
        "area": 84.96
      },
      {
        "date": "02.13",
        "priceEok": "5억7,000",
        "areaPyeong": 34.181532,
        "floor": 17,
        "area": 84.96
      }
    ],
    "rentTxCount": 10,
    "latestRentDeposit": 5000,
    "latestRentDepositEok": "5,000만",
    "latestRentMonthly": 140,
    "latestRentDate": "20260409",
    "avg1MRentDeposit": 35500,
    "avg1MRentDepositEok": "3억5,500",
    "avg3MRentDeposit": 35500,
    "avg3MRentDepositEok": "3억5,500"
  },
  "우미린제일풍경채": {
    "dong": "",
    "latestPrice": 70000,
    "latestPriceEok": "7억",
    "latestArea": 30.7614878725,
    "latestFloor": 20,
    "latestDate": "20260418",
    "maxPrice": 89000,
    "maxPriceEok": "8억9,000",
    "minPrice": 22850,
    "minPriceEok": "2억2,850",
    "txCount": 1411,
    "avg1MPrice": 69300,
    "avg1MPriceEok": "6억9,300",
    "avg1MPerPyeong": 2260,
    "avg1MTxCount": 3,
    "avg3MPrice": 67900,
    "avg3MPriceEok": "6억7,900",
    "avg3MPerPyeong": 2143,
    "avg3MTxCount": 9,
    "recent": [
      {
        "date": "04.18",
        "priceEok": "7억",
        "areaPyeong": 30.7614878725,
        "floor": 20,
        "area": 76.4593
      },
      {
        "date": "04.16",
        "priceEok": "7억",
        "areaPyeong": 30.7614878725,
        "floor": 20,
        "area": 76.4593
      },
      {
        "date": "04.15",
        "priceEok": "6억8,000",
        "areaPyeong": 30.5239551925,
        "floor": 5,
        "area": 75.8689
      },
      {
        "date": "04.09",
        "priceEok": "7억5,000",
        "areaPyeong": 38.68869851,
        "floor": 17,
        "area": 96.1628
      }
    ],
    "rentTxCount": 1925,
    "latestRentDeposit": 45000,
    "latestRentDepositEok": "4억5,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260315",
    "avg1MRentDeposit": 45000,
    "avg1MRentDepositEok": "4억5,000",
    "avg3MRentDeposit": 41100,
    "avg3MRentDepositEok": "4억1,100"
  },
  "동탄역헤리엇": {
    "dong": "여울동",
    "latestPrice": 104500,
    "latestPriceEok": "10억4,500",
    "latestArea": 39.1479524975,
    "latestFloor": 9,
    "latestDate": "20260418",
    "maxPrice": 106000,
    "maxPriceEok": "10억6,000",
    "minPrice": 92000,
    "minPriceEok": "9억2,000",
    "txCount": 18,
    "avg1MPrice": 104500,
    "avg1MPriceEok": "10억4,500",
    "avg1MPerPyeong": 2669,
    "avg1MTxCount": 1,
    "avg3MPrice": 98200,
    "avg3MPriceEok": "9억8,200",
    "avg3MPerPyeong": 2502,
    "avg3MTxCount": 5,
    "recent": [
      {
        "date": "04.18",
        "priceEok": "10억4,500",
        "areaPyeong": 39.1479524975,
        "floor": 9,
        "area": 97.3043
      },
      {
        "date": "04.11",
        "priceEok": "9억7,500",
        "areaPyeong": 39.1479524975,
        "floor": 2,
        "area": 97.3043
      },
      {
        "date": "04.02",
        "priceEok": "9억8,000",
        "areaPyeong": 39.3841977375,
        "floor": 4,
        "area": 97.8915
      },
      {
        "date": "03.07",
        "priceEok": "9억5,000",
        "areaPyeong": 39.1479524975,
        "floor": 11,
        "area": 97.3043
      }
    ],
    "rentTxCount": 11,
    "latestRentDeposit": 60000,
    "latestRentDepositEok": "6억",
    "latestRentMonthly": 0,
    "latestRentDate": "20260321",
    "avg1MRentDeposit": 60000,
    "avg1MRentDepositEok": "6억",
    "avg3MRentDeposit": 45000,
    "avg3MRentDepositEok": "4억5,000"
  },
  "동탄역중흥에스클래스": {
    "dong": "여울동",
    "latestPrice": 66000,
    "latestPriceEok": "6억6,000",
    "latestArea": 33.3973603425,
    "latestFloor": 14,
    "latestDate": "20260418",
    "maxPrice": 76500,
    "maxPriceEok": "7억6,500",
    "minPrice": 39500,
    "minPriceEok": "3억9,500",
    "txCount": 157,
    "avg1MPrice": 65500,
    "avg1MPriceEok": "6억5,500",
    "avg1MPerPyeong": 1961,
    "avg1MTxCount": 2,
    "avg3MPrice": 62900,
    "avg3MPriceEok": "6억2,900",
    "avg3MPerPyeong": 1883,
    "avg3MTxCount": 17,
    "recent": [
      {
        "date": "04.18",
        "priceEok": "6억6,000",
        "areaPyeong": 33.3973603425,
        "floor": 14,
        "area": 83.0109
      },
      {
        "date": "04.18",
        "priceEok": "6억5,000",
        "areaPyeong": 33.3973603425,
        "floor": 12,
        "area": 83.0109
      },
      {
        "date": "04.09",
        "priceEok": "6억2,500",
        "areaPyeong": 33.3973603425,
        "floor": 9,
        "area": 83.0109
      },
      {
        "date": "04.02",
        "priceEok": "6억700",
        "areaPyeong": 33.3973603425,
        "floor": 2,
        "area": 83.0109
      }
    ],
    "rentTxCount": 18,
    "latestRentDeposit": 36500,
    "latestRentDepositEok": "3억6,500",
    "latestRentMonthly": 0,
    "latestRentDate": "20260307",
    "avg1MRentDeposit": 36500,
    "avg1MRentDepositEok": "3억6,500",
    "avg3MRentDeposit": 36500,
    "avg3MRentDepositEok": "3억6,500"
  },
  "동탄역삼정그린코아": {
    "dong": "",
    "latestPrice": 118000,
    "latestPriceEok": "11억8,000",
    "latestArea": 33.879999999999995,
    "latestFloor": 28,
    "latestDate": "20260418",
    "maxPrice": 129500,
    "maxPriceEok": "12억9,500",
    "minPrice": 50000,
    "minPriceEok": "5억",
    "txCount": 31,
    "avg1MPrice": 118000,
    "avg1MPriceEok": "11억8,000",
    "avg1MPerPyeong": 3483,
    "avg1MTxCount": 1,
    "avg3MPrice": 117500,
    "avg3MPriceEok": "11억7,500",
    "avg3MPerPyeong": 3411,
    "avg3MTxCount": 5,
    "recent": [
      {
        "date": "04.18",
        "priceEok": "11억8,000",
        "areaPyeong": 33.879999999999995,
        "floor": 28,
        "area": 81.3533
      },
      {
        "date": "04.10",
        "priceEok": "11억5,500",
        "areaPyeong": 33.879999999999995,
        "floor": 27,
        "area": 81.3533
      },
      {
        "date": "03.18",
        "priceEok": "12억9,500",
        "areaPyeong": 36.6025,
        "floor": 22,
        "area": 92.3107
      },
      {
        "date": "02.27",
        "priceEok": "11억2,000",
        "areaPyeong": 33.879999999999995,
        "floor": 19,
        "area": 81.3533
      }
    ],
    "rentTxCount": 1,
    "latestRentDeposit": 69000,
    "latestRentDepositEok": "6억9,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260307",
    "avg1MRentDeposit": 69000,
    "avg1MRentDepositEok": "6억9,000",
    "avg3MRentDeposit": 69000,
    "avg3MRentDepositEok": "6억9,000"
  },
  "더레이크시티부영2단지": {
    "dong": "",
    "latestPrice": 92500,
    "latestPriceEok": "9억2,500",
    "latestArea": 33.275,
    "latestFloor": 13,
    "latestDate": "20260425",
    "maxPrice": 138000,
    "maxPriceEok": "13억8,000",
    "minPrice": 46500,
    "minPriceEok": "4억6,500",
    "txCount": 104,
    "avg1MPrice": 88800,
    "avg1MPriceEok": "8억8,800",
    "avg1MPerPyeong": 2679,
    "avg1MTxCount": 2,
    "avg3MPrice": 81300,
    "avg3MPriceEok": "8억1,300",
    "avg3MPerPyeong": 2427,
    "avg3MTxCount": 12,
    "recent": [
      {
        "date": "04.25",
        "priceEok": "9억2,500",
        "areaPyeong": 33.275,
        "floor": 13,
        "area": 84.52
      },
      {
        "date": "04.18",
        "priceEok": "8억5,000",
        "areaPyeong": 32.9725,
        "floor": 16,
        "area": 84.5442
      },
      {
        "date": "04.11",
        "priceEok": "8억3,500",
        "areaPyeong": 34.1825,
        "floor": 11,
        "area": 88.0279
      },
      {
        "date": "04.10",
        "priceEok": "9억",
        "areaPyeong": 33.275,
        "floor": 19,
        "area": 84.52
      }
    ],
    "rentTxCount": 295,
    "latestRentDeposit": 50000,
    "latestRentDepositEok": "5억",
    "latestRentMonthly": 0,
    "latestRentDate": "20260408",
    "avg1MRentDeposit": 50000,
    "avg1MRentDepositEok": "5억",
    "avg3MRentDeposit": 45800,
    "avg3MRentDepositEok": "4억5,800"
  },
  "동탄역경남아너스빌": {
    "dong": "영천동",
    "latestPrice": 82000,
    "latestPriceEok": "8억2,000",
    "latestArea": 32.67,
    "latestFloor": 21,
    "latestDate": "20260417",
    "maxPrice": 90000,
    "maxPriceEok": "9억",
    "minPrice": 45100,
    "minPriceEok": "4억5,100",
    "txCount": 204,
    "avg1MPrice": 82000,
    "avg1MPriceEok": "8억2,000",
    "avg1MPerPyeong": 2510,
    "avg1MTxCount": 1,
    "avg3MPrice": 80500,
    "avg3MPriceEok": "8억500",
    "avg3MPerPyeong": 2465,
    "avg3MTxCount": 9,
    "recent": [
      {
        "date": "04.17",
        "priceEok": "8억2,000",
        "areaPyeong": 32.67,
        "floor": 21,
        "area": 84.0086
      },
      {
        "date": "04.04",
        "priceEok": "8억5,000",
        "areaPyeong": 32.67,
        "floor": 12,
        "area": 84.0086
      },
      {
        "date": "04.01",
        "priceEok": "8억3,000",
        "areaPyeong": 32.67,
        "floor": 7,
        "area": 84.0086
      },
      {
        "date": "03.28",
        "priceEok": "8억1,000",
        "areaPyeong": 32.67,
        "floor": 9,
        "area": 84.0086
      }
    ],
    "rentTxCount": 248,
    "latestRentDeposit": 34728,
    "latestRentDepositEok": "3억4,728",
    "latestRentMonthly": 0,
    "latestRentDate": "20260307",
    "avg1MRentDeposit": 34700,
    "avg1MRentDepositEok": "3억4,700",
    "avg3MRentDeposit": 42400,
    "avg3MRentDepositEok": "4억2,400"
  },
  "동탄역동원로얄듀크비스타3차": {
    "dong": "여울동",
    "latestPrice": 103000,
    "latestPriceEok": "10억3,000",
    "latestArea": 33.275,
    "latestFloor": 29,
    "latestDate": "20260416",
    "maxPrice": 118000,
    "maxPriceEok": "11억8,000",
    "minPrice": 51250,
    "minPriceEok": "5억1,250",
    "txCount": 75,
    "avg1MPrice": 103000,
    "avg1MPriceEok": "10억3,000",
    "avg1MPerPyeong": 3095,
    "avg1MTxCount": 1,
    "avg3MPrice": 100800,
    "avg3MPriceEok": "10억800",
    "avg3MPerPyeong": 3029,
    "avg3MTxCount": 6,
    "recent": [
      {
        "date": "04.16",
        "priceEok": "10억3,000",
        "areaPyeong": 33.275,
        "floor": 29,
        "area": 84.9989
      },
      {
        "date": "04.01",
        "priceEok": "9억7,500",
        "areaPyeong": 33.275,
        "floor": 2,
        "area": 84.9963
      },
      {
        "date": "03.30",
        "priceEok": "10억5,600",
        "areaPyeong": 33.275,
        "floor": 27,
        "area": 84.9963
      },
      {
        "date": "03.24",
        "priceEok": "10억2,700",
        "areaPyeong": 33.275,
        "floor": 24,
        "area": 84.9963
      }
    ],
    "rentTxCount": 17,
    "latestRentDeposit": 59000,
    "latestRentDepositEok": "5억9,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260404",
    "avg1MRentDeposit": 59000,
    "avg1MRentDepositEok": "5억9,000",
    "avg3MRentDeposit": 44500,
    "avg3MRentDepositEok": "4억4,500"
  },
  "동탄역반도유보라아이비파크6.0": {
    "dong": "여울동",
    "latestPrice": 106500,
    "latestPriceEok": "10억6,500",
    "latestArea": 29.645,
    "latestFloor": 2,
    "latestDate": "20260416",
    "maxPrice": 143500,
    "maxPriceEok": "14억3,500",
    "minPrice": 38000,
    "minPriceEok": "3억8,000",
    "txCount": 180,
    "avg1MPrice": 106500,
    "avg1MPriceEok": "10억6,500",
    "avg1MPerPyeong": 3593,
    "avg1MTxCount": 1,
    "avg3MPrice": 109200,
    "avg3MPriceEok": "10억9,200",
    "avg3MPerPyeong": 3756,
    "avg3MTxCount": 6,
    "recent": [
      {
        "date": "04.16",
        "priceEok": "10억6,500",
        "areaPyeong": 29.645,
        "floor": 2,
        "area": 74.3629
      },
      {
        "date": "04.11",
        "priceEok": "10억6,000",
        "areaPyeong": 23.8975,
        "floor": 7,
        "area": 59.9206
      },
      {
        "date": "04.10",
        "priceEok": "11억3,000",
        "areaPyeong": 29.645,
        "floor": 26,
        "area": 74.3629
      },
      {
        "date": "03.06",
        "priceEok": "11억4,000",
        "areaPyeong": 33.275,
        "floor": 18,
        "area": 84.9885
      }
    ],
    "rentTxCount": 67,
    "latestRentDeposit": 57000,
    "latestRentDepositEok": "5억7,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260410",
    "avg1MRentDeposit": 57000,
    "avg1MRentDepositEok": "5억7,000",
    "avg3MRentDeposit": 47800,
    "avg3MRentDepositEok": "4억7,800"
  },
  "동탄2신도시금강펜테리움센트럴파크Ⅰ": {
    "dong": "",
    "latestPrice": 57000,
    "latestPriceEok": "5억7,000",
    "latestArea": 27.83,
    "latestFloor": 4,
    "latestDate": "20260415",
    "maxPrice": 80000,
    "maxPriceEok": "8억",
    "minPrice": 28000,
    "minPriceEok": "2억8,000",
    "txCount": 466,
    "avg1MPrice": 57000,
    "avg1MPriceEok": "5억7,000",
    "avg1MPerPyeong": 2048,
    "avg1MTxCount": 1,
    "avg3MPrice": 59600,
    "avg3MPriceEok": "5억9,600",
    "avg3MPerPyeong": 1885,
    "avg3MTxCount": 17,
    "recent": [
      {
        "date": "04.15",
        "priceEok": "5억7,000",
        "areaPyeong": 27.83,
        "floor": 4,
        "area": 69.5925
      },
      {
        "date": "04.10",
        "priceEok": "5억7,500",
        "areaPyeong": 33.275,
        "floor": 2,
        "area": 84.9949
      },
      {
        "date": "04.09",
        "priceEok": "6억1,500",
        "areaPyeong": 33.275,
        "floor": 6,
        "area": 84.9949
      },
      {
        "date": "04.09",
        "priceEok": "6억1,500",
        "areaPyeong": 33.275,
        "floor": 12,
        "area": 84.9949
      }
    ],
    "rentTxCount": 45,
    "latestRentDeposit": 38000,
    "latestRentDepositEok": "3억8,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260321",
    "avg1MRentDeposit": 38000,
    "avg1MRentDepositEok": "3억8,000",
    "avg3MRentDeposit": 37200,
    "avg3MRentDepositEok": "3억7,200"
  },
  "동탄역파라곤": {
    "dong": "여울동",
    "latestPrice": 128000,
    "latestPriceEok": "12억8,000",
    "latestArea": 41.14,
    "latestFloor": 22,
    "latestDate": "20260412",
    "maxPrice": 173000,
    "maxPriceEok": "17억3,000",
    "minPrice": 79000,
    "minPriceEok": "7억9,000",
    "txCount": 45,
    "avg1MPrice": 128000,
    "avg1MPriceEok": "12억8,000",
    "avg1MPerPyeong": 3111,
    "avg1MTxCount": 1,
    "avg3MPrice": 110700,
    "avg3MPriceEok": "11억700",
    "avg3MPerPyeong": 3313,
    "avg3MTxCount": 5,
    "recent": [
      {
        "date": "04.12",
        "priceEok": "12억8,000",
        "areaPyeong": 41.14,
        "floor": 22,
        "area": 101.6281
      },
      {
        "date": "03.06",
        "priceEok": "10억9,800",
        "areaPyeong": 32.065,
        "floor": 30,
        "area": 79.8807
      },
      {
        "date": "02.23",
        "priceEok": "10억7,000",
        "areaPyeong": 31.46,
        "floor": 18,
        "area": 78.059
      },
      {
        "date": "02.14",
        "priceEok": "10억2,000",
        "areaPyeong": 31.46,
        "floor": 7,
        "area": 78.059
      }
    ],
    "rentTxCount": 20,
    "latestRentDeposit": 59000,
    "latestRentDepositEok": "5억9,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260408",
    "avg1MRentDeposit": 59000,
    "avg1MRentDepositEok": "5억9,000",
    "avg3MRentDeposit": 56800,
    "avg3MRentDepositEok": "5억6,800"
  },
  "동탄역반도유보라아이비파크5.0": {
    "dong": "여울동",
    "latestPrice": 115000,
    "latestPriceEok": "11억5,000",
    "latestArea": 33.275,
    "latestFloor": 24,
    "latestDate": "20260409",
    "maxPrice": 144000,
    "maxPriceEok": "14억4,000",
    "minPrice": 54700,
    "minPriceEok": "5억4,700",
    "txCount": 178,
    "avg1MPrice": 115000,
    "avg1MPriceEok": "11억5,000",
    "avg1MPerPyeong": 3456,
    "avg1MTxCount": 0,
    "avg3MPrice": 103700,
    "avg3MPriceEok": "10억3,700",
    "avg3MPerPyeong": 3542,
    "avg3MTxCount": 7,
    "recent": [
      {
        "date": "04.09",
        "priceEok": "11억5,000",
        "areaPyeong": 33.275,
        "floor": 24,
        "area": 84.9739
      },
      {
        "date": "03.30",
        "priceEok": "10억",
        "areaPyeong": 29.645,
        "floor": 2,
        "area": 74.3629
      },
      {
        "date": "03.26",
        "priceEok": "10억2,500",
        "areaPyeong": 29.645,
        "floor": 15,
        "area": 74.3629
      },
      {
        "date": "03.17",
        "priceEok": "9억8,000",
        "areaPyeong": 23.8975,
        "floor": 12,
        "area": 59.9206
      }
    ],
    "rentTxCount": 33,
    "latestRentDeposit": 59000,
    "latestRentDepositEok": "5억9,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260411",
    "avg1MRentDeposit": 59000,
    "avg1MRentDepositEok": "5억9,000",
    "avg3MRentDeposit": 45500,
    "avg3MRentDepositEok": "4억5,500"
  },
  "동탄역시범금강펜테리움센트럴파크3": {
    "dong": "",
    "latestPrice": 140000,
    "latestPriceEok": "14억",
    "latestArea": 39.324999999999996,
    "latestFloor": 12,
    "latestDate": "20260406",
    "maxPrice": 158000,
    "maxPriceEok": "15억8,000",
    "minPrice": 46800,
    "minPriceEok": "4억6,800",
    "txCount": 81,
    "avg1MPrice": 140000,
    "avg1MPriceEok": "14억",
    "avg1MPerPyeong": 3560,
    "avg1MTxCount": 0,
    "avg3MPrice": 134000,
    "avg3MPriceEok": "13억4,000",
    "avg3MPerPyeong": 3669,
    "avg3MTxCount": 2,
    "recent": [
      {
        "date": "04.06",
        "priceEok": "14억",
        "areaPyeong": 39.324999999999996,
        "floor": 12,
        "area": 99.9736
      },
      {
        "date": "03.03",
        "priceEok": "12억8,000",
        "areaPyeong": 33.879999999999995,
        "floor": 13,
        "area": 84.9855
      },
      {
        "date": "02.05",
        "priceEok": "12억5,500",
        "areaPyeong": 39.324999999999996,
        "floor": 2,
        "area": 99.9262
      },
      {
        "date": "02.02",
        "priceEok": "13억",
        "areaPyeong": 33.275,
        "floor": 9,
        "area": 84.9748
      }
    ],
    "rentTxCount": 193,
    "latestRentDeposit": 15000,
    "latestRentDepositEok": "1억5,000",
    "latestRentMonthly": 190,
    "latestRentDate": "20260411",
    "avg1MRentDeposit": 56500,
    "avg1MRentDepositEok": "5억6,500",
    "avg3MRentDeposit": 61200,
    "avg3MRentDepositEok": "6억1,200"
  },
  "동탄역더샵센트럴시티2차": {
    "dong": "여울동",
    "latestPrice": 73200,
    "latestPriceEok": "7억3,200",
    "latestArea": 30.5525,
    "latestFloor": 10,
    "latestDate": "20260404",
    "maxPrice": 95000,
    "maxPriceEok": "9억5,000",
    "minPrice": 53000,
    "minPriceEok": "5억3,000",
    "txCount": 203,
    "avg1MPrice": 73200,
    "avg1MPriceEok": "7억3,200",
    "avg1MPerPyeong": 2396,
    "avg1MTxCount": 0,
    "avg3MPrice": 73900,
    "avg3MPriceEok": "7억3,900",
    "avg3MPerPyeong": 2339,
    "avg3MTxCount": 13,
    "recent": [
      {
        "date": "04.04",
        "priceEok": "7억3,200",
        "areaPyeong": 30.5525,
        "floor": 10,
        "area": 74.85
      },
      {
        "date": "04.04",
        "priceEok": "7억2,500",
        "areaPyeong": 30.5525,
        "floor": 11,
        "area": 74.85
      },
      {
        "date": "04.04",
        "priceEok": "7억9,500",
        "areaPyeong": 33.879999999999995,
        "floor": 13,
        "area": 84.98
      },
      {
        "date": "04.01",
        "priceEok": "7억4,500",
        "areaPyeong": 29.947499999999998,
        "floor": 14,
        "area": 74.9
      }
    ],
    "rentTxCount": 41,
    "latestRentDeposit": 36750,
    "latestRentDepositEok": "3억6,750",
    "latestRentMonthly": 0,
    "latestRentDate": "20260411",
    "avg1MRentDeposit": 36800,
    "avg1MRentDepositEok": "3억6,800",
    "avg3MRentDeposit": 42500,
    "avg3MRentDepositEok": "4억2,500"
  },
  "동탄역린스트라우스": {
    "dong": "여울동",
    "latestPrice": 128000,
    "latestPriceEok": "12억8,000",
    "latestArea": 30.855,
    "latestFloor": 37,
    "latestDate": "20260409",
    "maxPrice": 162000,
    "maxPriceEok": "16억2,000",
    "minPrice": 76000,
    "minPriceEok": "7억6,000",
    "txCount": 142,
    "avg1MPrice": 128000,
    "avg1MPriceEok": "12억8,000",
    "avg1MPerPyeong": 4148,
    "avg1MTxCount": 0,
    "avg3MPrice": 133100,
    "avg3MPriceEok": "13억3,100",
    "avg3MPerPyeong": 3922,
    "avg3MTxCount": 7,
    "recent": [
      {
        "date": "04.09",
        "priceEok": "12억8,000",
        "areaPyeong": 30.855,
        "floor": 37,
        "area": 75.0217
      },
      {
        "date": "04.09",
        "priceEok": "12억7,500",
        "areaPyeong": 30.855,
        "floor": 21,
        "area": 75.0217
      },
      {
        "date": "04.04",
        "priceEok": "12억9,600",
        "areaPyeong": 30.855,
        "floor": 31,
        "area": 75.0217
      },
      {
        "date": "03.27",
        "priceEok": "12억5,500",
        "areaPyeong": 30.855,
        "floor": 27,
        "area": 75.0217
      }
    ],
    "rentTxCount": 67,
    "latestRentDeposit": 68000,
    "latestRentDepositEok": "6억8,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260411",
    "avg1MRentDeposit": 68000,
    "avg1MRentDepositEok": "6억8,000",
    "avg3MRentDeposit": 55100,
    "avg3MRentDepositEok": "5억5,100"
  },
  "푸르지오": {
    "dong": "",
    "latestPrice": 63000,
    "latestPriceEok": "6억3,000",
    "latestArea": 24.805,
    "latestFloor": 8,
    "latestDate": "20260409",
    "maxPrice": 78000,
    "maxPriceEok": "7억8,000",
    "minPrice": 19500,
    "minPriceEok": "1억9,500",
    "txCount": 1358,
    "avg1MPrice": 63000,
    "avg1MPriceEok": "6억3,000",
    "avg1MPerPyeong": 2540,
    "avg1MTxCount": 0,
    "avg3MPrice": 61000,
    "avg3MPriceEok": "6억1,000",
    "avg3MPerPyeong": 2303,
    "avg3MTxCount": 17,
    "recent": [
      {
        "date": "04.09",
        "priceEok": "6억3,000",
        "areaPyeong": 24.805,
        "floor": 8,
        "area": 57.8
      },
      {
        "date": "04.09",
        "priceEok": "7억",
        "areaPyeong": 32.67,
        "floor": 21,
        "area": 84.065
      },
      {
        "date": "04.07",
        "priceEok": "5억9,700",
        "areaPyeong": 24.2,
        "floor": 5,
        "area": 59.556
      },
      {
        "date": "03.30",
        "priceEok": "5억9,000",
        "areaPyeong": 24.805,
        "floor": 3,
        "area": 57.8
      }
    ],
    "rentTxCount": 1784,
    "latestRentDeposit": 45000,
    "latestRentDepositEok": "4억5,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260321",
    "avg1MRentDeposit": 45000,
    "avg1MRentDepositEok": "4억5,000",
    "avg3MRentDeposit": 37000,
    "avg3MRentDepositEok": "3억7,000"
  },
  "신일유토빌": {
    "dong": "",
    "latestPrice": 74600,
    "latestPriceEok": "7억4,600",
    "latestArea": 40.979617525,
    "latestFloor": 17,
    "latestDate": "20260409",
    "maxPrice": 114000,
    "maxPriceEok": "11억4,000",
    "minPrice": 34000,
    "minPriceEok": "3억4,000",
    "txCount": 550,
    "avg1MPrice": 74600,
    "avg1MPriceEok": "7억4,600",
    "avg1MPerPyeong": 1820,
    "avg1MTxCount": 0,
    "avg3MPrice": 75800,
    "avg3MPriceEok": "7억5,800",
    "avg3MPerPyeong": 1720,
    "avg3MTxCount": 7,
    "recent": [
      {
        "date": "04.09",
        "priceEok": "7억4,600",
        "areaPyeong": 40.979617525,
        "floor": 17,
        "area": 101.857
      },
      {
        "date": "04.07",
        "priceEok": "7억4,300",
        "areaPyeong": 40.979617525,
        "floor": 9,
        "area": 101.857
      },
      {
        "date": "04.04",
        "priceEok": "7억1,900",
        "areaPyeong": 40.979617525,
        "floor": 9,
        "area": 101.857
      },
      {
        "date": "04.04",
        "priceEok": "8억3,000",
        "areaPyeong": 51.650081175,
        "floor": 24,
        "area": 128.379
      }
    ],
    "rentTxCount": 743,
    "latestRentDeposit": 10000,
    "latestRentDepositEok": "1억",
    "latestRentMonthly": 180,
    "latestRentDate": "20260328",
    "avg1MRentDeposit": 49300,
    "avg1MRentDepositEok": "4억9,300",
    "avg3MRentDeposit": 47800,
    "avg3MRentDepositEok": "4억7,800"
  },
  "롯데캐슬": {
    "dong": "",
    "latestPrice": 77000,
    "latestPriceEok": "7억7,000",
    "latestArea": 35.259763,
    "latestFloor": 10,
    "latestDate": "20260408",
    "maxPrice": 125000,
    "maxPriceEok": "12억5,000",
    "minPrice": 29500,
    "minPriceEok": "2억9,500",
    "txCount": 1125,
    "avg1MPrice": 77000,
    "avg1MPriceEok": "7억7,000",
    "avg1MPerPyeong": 2184,
    "avg1MTxCount": 0,
    "avg3MPrice": 82200,
    "avg3MPriceEok": "8억2,200",
    "avg3MPerPyeong": 2032,
    "avg3MTxCount": 12,
    "recent": [
      {
        "date": "04.08",
        "priceEok": "7억7,000",
        "areaPyeong": 35.259763,
        "floor": 10,
        "area": 87.64
      },
      {
        "date": "04.04",
        "priceEok": "9억6,500",
        "areaPyeong": 52.27408725000001,
        "floor": 22,
        "area": 129.93
      },
      {
        "date": "03.29",
        "priceEok": "8억4,000",
        "areaPyeong": 43.982169,
        "floor": 11,
        "area": 109.32
      },
      {
        "date": "03.21",
        "priceEok": "7억1,500",
        "areaPyeong": 35.259763,
        "floor": 13,
        "area": 87.64
      }
    ],
    "rentTxCount": 1385,
    "latestRentDeposit": 42000,
    "latestRentDepositEok": "4억2,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260403",
    "avg1MRentDeposit": 42000,
    "avg1MRentDepositEok": "4억2,000",
    "avg3MRentDeposit": 43200,
    "avg3MRentDepositEok": "4억3,200"
  },
  "동탄역예미지시그너스": {
    "dong": "여울동",
    "latestPrice": 136000,
    "latestPriceEok": "13억6,000",
    "latestArea": 34.1825,
    "latestFloor": 22,
    "latestDate": "20260408",
    "maxPrice": 150000,
    "maxPriceEok": "15억",
    "minPrice": 104000,
    "minPriceEok": "10억4,000",
    "txCount": 56,
    "avg1MPrice": 136000,
    "avg1MPriceEok": "13억6,000",
    "avg1MPerPyeong": 3979,
    "avg1MTxCount": 0,
    "avg3MPrice": 143400,
    "avg3MPriceEok": "14억3,400",
    "avg3MPerPyeong": 3856,
    "avg3MTxCount": 5,
    "recent": [
      {
        "date": "04.08",
        "priceEok": "13억6,000",
        "areaPyeong": 34.1825,
        "floor": 22,
        "area": 87.5651
      },
      {
        "date": "04.03",
        "priceEok": "15억",
        "areaPyeong": 39.6275,
        "floor": 34,
        "area": 101.8228
      },
      {
        "date": "03.08",
        "priceEok": "13억3,000",
        "areaPyeong": 33.275,
        "floor": 18,
        "area": 84.6397
      },
      {
        "date": "02.28",
        "priceEok": "15억",
        "areaPyeong": 39.6275,
        "floor": 24,
        "area": 101.8228
      }
    ],
    "rentTxCount": 91,
    "latestRentDeposit": 65000,
    "latestRentDepositEok": "6억5,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260316",
    "avg1MRentDeposit": 65000,
    "avg1MRentDepositEok": "6억5,000",
    "avg3MRentDeposit": 58000,
    "avg3MRentDepositEok": "5억8,000"
  },
  "동탄역유림노르웨이숲": {
    "dong": "여울동",
    "latestPrice": 157000,
    "latestPriceEok": "15억7,000",
    "latestArea": 39.324999999999996,
    "latestFloor": 42,
    "latestDate": "20260407",
    "maxPrice": 160000,
    "maxPriceEok": "16억",
    "minPrice": 66450,
    "minPriceEok": "6억6,450",
    "txCount": 47,
    "avg1MPrice": 157000,
    "avg1MPriceEok": "15억7,000",
    "avg1MPerPyeong": 3992,
    "avg1MTxCount": 0,
    "avg3MPrice": 132300,
    "avg3MPriceEok": "13억2,300",
    "avg3MPerPyeong": 3720,
    "avg3MTxCount": 10,
    "recent": [
      {
        "date": "04.07",
        "priceEok": "15억7,000",
        "areaPyeong": 39.324999999999996,
        "floor": 42,
        "area": 96.5843
      },
      {
        "date": "04.04",
        "priceEok": "11억6,500",
        "areaPyeong": 34.485,
        "floor": 9,
        "area": 84.4985
      },
      {
        "date": "04.04",
        "priceEok": "13억4,500",
        "areaPyeong": 34.485,
        "floor": 42,
        "area": 84.6065
      },
      {
        "date": "03.28",
        "priceEok": "13억1,500",
        "areaPyeong": 34.485,
        "floor": 17,
        "area": 84.6065
      }
    ],
    "rentTxCount": 19,
    "latestRentDeposit": 70000,
    "latestRentDepositEok": "7억",
    "latestRentMonthly": 0,
    "latestRentDate": "20260404",
    "avg1MRentDeposit": 70000,
    "avg1MRentDepositEok": "7억",
    "avg3MRentDeposit": 61300,
    "avg3MRentDepositEok": "6억1,300"
  }
};
