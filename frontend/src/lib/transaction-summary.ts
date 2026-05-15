/**
 * 실거래가 및 전월세 요약 데이터 — 빌드 타임에 포함, API 호출 0
 * 
 * ⚠️ 이 파일은 자동 생성됩니다. 직접 수정하지 마세요!
 * 동기화: npm run sync-transactions
 * 마지막 동기화: 2026-05-15
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
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "16.05",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "16.06",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "16.07",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "16.08",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "16.09",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "16.10",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "16.11",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "16.12",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "17.01",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "17.02",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "17.03",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "17.04",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "17.05",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "17.06",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "17.07",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "17.08",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "17.09",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "17.10",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "17.11",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "17.12",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "18.01",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "18.02",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "18.03",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "18.04",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "18.05",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "18.06",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "18.07",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "18.08",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "18.09",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "18.10",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "18.11",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "18.12",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "19.01",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "19.02",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "19.03",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "19.04",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "19.05",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "19.06",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "19.07",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "19.08",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "19.09",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "19.10",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "19.11",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "19.12",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "20.01",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "20.02",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "20.03",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "20.04",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "20.05",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "20.06",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "20.07",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "20.08",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "20.09",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "20.10",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "20.11",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "20.12",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "21.01",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "21.02",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "21.03",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "21.04",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "21.05",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "21.06",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "21.07",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "21.08",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "21.09",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "21.10",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "21.11",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "21.12",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "22.01",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "22.02",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "22.03",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "22.04",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "22.05",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "22.06",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "22.07",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "22.08",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "22.09",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "22.10",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "22.11",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "22.12",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "23.01",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "23.02",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "23.03",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "23.04",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "23.05",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "23.06",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "23.07",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "23.08",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "23.09",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "23.10",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "23.11",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "23.12",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "24.01",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "24.02",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "24.03",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "24.04",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "24.05",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "24.06",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "24.07",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "24.08",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "24.09",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "24.10",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "24.11",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "24.12",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "25.01",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "25.02",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "25.03",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "25.04",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "25.05",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "25.06",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "25.07",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "25.08",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "25.09",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "25.10",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "25.11",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "25.12",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "26.01",
    "동탄 아파트 전체": 0,
    "동탄 아파트 전세 평균": 0
  },
  {
    "name": "26.02",
    "동탄 아파트 전체": 7.7,
    "동탄 아파트 전세 평균": 4.2
  },
  {
    "name": "26.03",
    "동탄 아파트 전체": 8,
    "동탄 아파트 전세 평균": 4.4
  }
];

/** 아파트명 → 거래 요약 */
export const TX_SUMMARY: Record<string, AptTxSummary> = {
  "산척동,동탄호수공원금강펜테리움센트럴파크Ⅱ": {
    "dong": "",
    "latestPrice": 56000,
    "latestPriceEok": "5억6,000",
    "latestArea": 34.19746407,
    "latestFloor": 21,
    "latestDate": "20260514",
    "maxPrice": 61500,
    "maxPriceEok": "6억1,500",
    "minPrice": 49800,
    "minPriceEok": "4억9,800",
    "txCount": 33,
    "avg1MPrice": 56100,
    "avg1MPriceEok": "5억6,100",
    "avg1MPerPyeong": 1707,
    "avg1MTxCount": 10,
    "avg3MPrice": 55300,
    "avg3MPriceEok": "5억5,300",
    "avg3MPerPyeong": 1713,
    "avg3MTxCount": 33,
    "recent": [
      {
        "date": "05.14",
        "priceEok": "5억6,000",
        "areaPyeong": 34.19746407,
        "floor": 21,
        "area": 84.9996
      },
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
      }
    ],
    "rentTxCount": 10,
    "latestRentDeposit": 42000,
    "latestRentDepositEok": "4억2,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260420",
    "avg1MRentDeposit": 39800,
    "avg1MRentDepositEok": "3억9,800",
    "avg3MRentDeposit": 38200,
    "avg3MRentDepositEok": "3억8,200"
  },
  "반도유보라아이비파크3": {
    "dong": "",
    "latestPrice": 63000,
    "latestPriceEok": "6억3,000",
    "latestArea": 24.134269775000003,
    "latestFloor": 10,
    "latestDate": "20260514",
    "maxPrice": 86000,
    "maxPriceEok": "8억6,000",
    "minPrice": 59500,
    "minPriceEok": "5억9,500",
    "txCount": 19,
    "avg1MPrice": 74200,
    "avg1MPriceEok": "7억4,200",
    "avg1MPerPyeong": 2603,
    "avg1MTxCount": 7,
    "avg3MPrice": 70100,
    "avg3MPriceEok": "7억100",
    "avg3MPerPyeong": 2589,
    "avg3MTxCount": 19,
    "recent": [
      {
        "date": "05.14",
        "priceEok": "6억3,000",
        "areaPyeong": 24.134269775000003,
        "floor": 10,
        "area": 59.987
      },
      {
        "date": "05.12",
        "priceEok": "7억7,800",
        "areaPyeong": 29.93989999,
        "floor": 7,
        "area": 74.4172
      },
      {
        "date": "05.08",
        "priceEok": "8억6,000",
        "areaPyeong": 34.1765834025,
        "floor": 5,
        "area": 84.9477
      },
      {
        "date": "04.24",
        "priceEok": "6억5,900",
        "areaPyeong": 24.134269775000003,
        "floor": 11,
        "area": 59.987
      }
    ],
    "rentTxCount": 15,
    "latestRentDeposit": 38000,
    "latestRentDepositEok": "3억8,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260410",
    "avg1MRentDeposit": 38000,
    "avg1MRentDepositEok": "3억8,000",
    "avg3MRentDeposit": 36400,
    "avg3MRentDepositEok": "3억6,400"
  },
  "이편한세상동탄": {
    "dong": "",
    "latestPrice": 61800,
    "latestPriceEok": "6억1,800",
    "latestArea": 33.875765,
    "latestFloor": 4,
    "latestDate": "20260513",
    "maxPrice": 74000,
    "maxPriceEok": "7억4,000",
    "minPrice": 54000,
    "minPriceEok": "5억4,000",
    "txCount": 32,
    "avg1MPrice": 62900,
    "avg1MPriceEok": "6억2,900",
    "avg1MPerPyeong": 1812,
    "avg1MTxCount": 14,
    "avg3MPrice": 61100,
    "avg3MPriceEok": "6억1,100",
    "avg3MPerPyeong": 1850,
    "avg3MTxCount": 32,
    "recent": [
      {
        "date": "05.13",
        "priceEok": "6억1,800",
        "areaPyeong": 33.875765,
        "floor": 4,
        "area": 84.2
      },
      {
        "date": "05.12",
        "priceEok": "6억6,000",
        "areaPyeong": 33.875765,
        "floor": 6,
        "area": 84.2
      },
      {
        "date": "05.10",
        "priceEok": "6억3,000",
        "areaPyeong": 33.875765,
        "floor": 13,
        "area": 84.2
      },
      {
        "date": "05.08",
        "priceEok": "6억4,500",
        "areaPyeong": 36.14890125,
        "floor": 22,
        "area": 89.85
      }
    ],
    "rentTxCount": 18,
    "latestRentDeposit": 43000,
    "latestRentDepositEok": "4억3,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260501",
    "avg1MRentDeposit": 41600,
    "avg1MRentDepositEok": "4억1,600",
    "avg3MRentDeposit": 40600,
    "avg3MRentDepositEok": "4억600"
  },
  "시범반도유보라아이비파크4.0": {
    "dong": "",
    "latestPrice": 124500,
    "latestPriceEok": "12억4,500",
    "latestArea": 38.91621329750001,
    "latestFloor": 8,
    "latestDate": "20260513",
    "maxPrice": 135000,
    "maxPriceEok": "13억5,000",
    "minPrice": 114700,
    "minPriceEok": "11억4,700",
    "txCount": 13,
    "avg1MPrice": 123700,
    "avg1MPriceEok": "12억3,700",
    "avg1MPerPyeong": 3393,
    "avg1MTxCount": 6,
    "avg3MPrice": 122900,
    "avg3MPriceEok": "12억2,900",
    "avg3MPerPyeong": 3355,
    "avg3MTxCount": 13,
    "recent": [
      {
        "date": "05.13",
        "priceEok": "12억4,500",
        "areaPyeong": 38.91621329750001,
        "floor": 8,
        "area": 96.7283
      },
      {
        "date": "05.12",
        "priceEok": "11억7,500",
        "areaPyeong": 34.129310215000004,
        "floor": 40,
        "area": 84.8302
      },
      {
        "date": "05.12",
        "priceEok": "12억",
        "areaPyeong": 34.185756412500005,
        "floor": 26,
        "area": 84.9705
      },
      {
        "date": "05.07",
        "priceEok": "13억5,000",
        "areaPyeong": 38.91621329750001,
        "floor": 38,
        "area": 96.7283
      }
    ],
    "rentTxCount": 11,
    "latestRentDeposit": 40000,
    "latestRentDepositEok": "4억",
    "latestRentMonthly": 130,
    "latestRentDate": "20260424",
    "avg1MRentDeposit": 65200,
    "avg1MRentDepositEok": "6억5,200",
    "avg3MRentDeposit": 64500,
    "avg3MRentDepositEok": "6억4,500"
  },
  "동탄역푸르지오": {
    "dong": "영천동",
    "latestPrice": 91500,
    "latestPriceEok": "9억1,500",
    "latestArea": 29.645,
    "latestFloor": 18,
    "latestDate": "20260513",
    "maxPrice": 97800,
    "maxPriceEok": "9억7,800",
    "minPrice": 79000,
    "minPriceEok": "7억9,000",
    "txCount": 19,
    "avg1MPrice": 90900,
    "avg1MPriceEok": "9억900",
    "avg1MPerPyeong": 2905,
    "avg1MTxCount": 5,
    "avg3MPrice": 90600,
    "avg3MPriceEok": "9억600",
    "avg3MPerPyeong": 2812,
    "avg3MTxCount": 19,
    "recent": [
      {
        "date": "05.13",
        "priceEok": "9억1,500",
        "areaPyeong": 29.645,
        "floor": 18,
        "area": 74.8664
      },
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
      }
    ],
    "rentTxCount": 11,
    "latestRentDeposit": 50000,
    "latestRentDepositEok": "5억",
    "latestRentMonthly": 0,
    "latestRentDate": "20260429",
    "avg1MRentDeposit": 42600,
    "avg1MRentDepositEok": "4억2,600",
    "avg3MRentDeposit": 40100,
    "avg3MRentDepositEok": "4억100"
  },
  "동탄역에일린의뜰": {
    "dong": "여울동",
    "latestPrice": 73000,
    "latestPriceEok": "7억3,000",
    "latestArea": 32.67,
    "latestFloor": 12,
    "latestDate": "20260513",
    "maxPrice": 73000,
    "maxPriceEok": "7억3,000",
    "minPrice": 57000,
    "minPriceEok": "5억7,000",
    "txCount": 27,
    "avg1MPrice": 67200,
    "avg1MPriceEok": "6억7,200",
    "avg1MPerPyeong": 2076,
    "avg1MTxCount": 12,
    "avg3MPrice": 65400,
    "avg3MPriceEok": "6억5,400",
    "avg3MPerPyeong": 2044,
    "avg3MTxCount": 27,
    "recent": [
      {
        "date": "05.13",
        "priceEok": "7억3,000",
        "areaPyeong": 32.67,
        "floor": 12,
        "area": 84.994
      },
      {
        "date": "05.02",
        "priceEok": "7억1,900",
        "areaPyeong": 32.67,
        "floor": 3,
        "area": 84.994
      },
      {
        "date": "05.02",
        "priceEok": "7억3,000",
        "areaPyeong": 32.67,
        "floor": 12,
        "area": 84.9941
      },
      {
        "date": "05.01",
        "priceEok": "6억3,000",
        "areaPyeong": 29.04,
        "floor": 3,
        "area": 74.9737
      }
    ],
    "rentTxCount": 8,
    "latestRentDeposit": 38000,
    "latestRentDepositEok": "3억8,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260409",
    "avg1MRentDeposit": 38000,
    "avg1MRentDepositEok": "3억8,000",
    "avg3MRentDeposit": 35700,
    "avg3MRentDepositEok": "3억5,700"
  },
  "동탄역시범반도유보라아이비파크1.0": {
    "dong": "청계동",
    "latestPrice": 105000,
    "latestPriceEok": "10억5,000",
    "latestArea": 32.9725,
    "latestFloor": 14,
    "latestDate": "20260513",
    "maxPrice": 119000,
    "maxPriceEok": "11억9,000",
    "minPrice": 99700,
    "minPriceEok": "9억9,700",
    "txCount": 29,
    "avg1MPrice": 110300,
    "avg1MPriceEok": "11억300",
    "avg1MPerPyeong": 3202,
    "avg1MTxCount": 11,
    "avg3MPrice": 109200,
    "avg3MPriceEok": "10억9,200",
    "avg3MPerPyeong": 3147,
    "avg3MTxCount": 29,
    "recent": [
      {
        "date": "05.13",
        "priceEok": "10억5,000",
        "areaPyeong": 32.9725,
        "floor": 14,
        "area": 84.9885
      },
      {
        "date": "05.13",
        "priceEok": "10억5,500",
        "areaPyeong": 32.9725,
        "floor": 3,
        "area": 84.9885
      },
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
      }
    ],
    "rentTxCount": 13,
    "latestRentDeposit": 60000,
    "latestRentDepositEok": "6억",
    "latestRentMonthly": 0,
    "latestRentDate": "20260430",
    "avg1MRentDeposit": 70000,
    "avg1MRentDepositEok": "7억",
    "avg3MRentDeposit": 66800,
    "avg3MRentDepositEok": "6억6,800"
  },
  "동탄숲속마을자연앤경남아너스빌1124-0": {
    "dong": "",
    "latestPrice": 57500,
    "latestPriceEok": "5억7,500",
    "latestArea": 30.5525,
    "latestFloor": 20,
    "latestDate": "20260513",
    "maxPrice": 62500,
    "maxPriceEok": "6억2,500",
    "minPrice": 52800,
    "minPriceEok": "5억2,800",
    "txCount": 13,
    "avg1MPrice": 56200,
    "avg1MPriceEok": "5억6,200",
    "avg1MPerPyeong": 1838,
    "avg1MTxCount": 3,
    "avg3MPrice": 55700,
    "avg3MPriceEok": "5억5,700",
    "avg3MPerPyeong": 1783,
    "avg3MTxCount": 13,
    "recent": [
      {
        "date": "05.13",
        "priceEok": "5억7,500",
        "areaPyeong": 30.5525,
        "floor": 20,
        "area": 76.51
      },
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
      }
    ],
    "rentTxCount": 10,
    "latestRentDeposit": 3000,
    "latestRentDepositEok": "3,000만",
    "latestRentMonthly": 126,
    "latestRentDate": "20260421",
    "avg1MRentDeposit": 33700,
    "avg1MRentDepositEok": "3억3,700",
    "avg3MRentDeposit": 32200,
    "avg3MRentDepositEok": "3억2,200"
  },
  "동탄숲속마을자연앤경남아너스빌1115-0": {
    "dong": "",
    "latestPrice": 58000,
    "latestPriceEok": "5억8,000",
    "latestArea": 33.275,
    "latestFloor": 2,
    "latestDate": "20260513",
    "maxPrice": 65500,
    "maxPriceEok": "6억5,500",
    "minPrice": 54500,
    "minPriceEok": "5억4,500",
    "txCount": 13,
    "avg1MPrice": 59100,
    "avg1MPriceEok": "5억9,100",
    "avg1MPerPyeong": 1868,
    "avg1MTxCount": 5,
    "avg3MPrice": 59600,
    "avg3MPriceEok": "5억9,600",
    "avg3MPerPyeong": 1895,
    "avg3MTxCount": 13,
    "recent": [
      {
        "date": "05.13",
        "priceEok": "5억8,000",
        "areaPyeong": 33.275,
        "floor": 2,
        "area": 84.51
      },
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
      }
    ],
    "rentTxCount": 7,
    "latestRentDeposit": 35000,
    "latestRentDepositEok": "3억5,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260506",
    "avg1MRentDeposit": 35500,
    "avg1MRentDepositEok": "3억5,500",
    "avg3MRentDeposit": 34400,
    "avg3MRentDepositEok": "3억4,400"
  },
  "더레이크시티부영5단지": {
    "dong": "",
    "latestPrice": 76500,
    "latestPriceEok": "7억6,500",
    "latestArea": 33.275,
    "latestFloor": 11,
    "latestDate": "20260513",
    "maxPrice": 83000,
    "maxPriceEok": "8억3,000",
    "minPrice": 58000,
    "minPriceEok": "5억8,000",
    "txCount": 16,
    "avg1MPrice": 74600,
    "avg1MPriceEok": "7억4,600",
    "avg1MPerPyeong": 2346,
    "avg1MTxCount": 6,
    "avg3MPrice": 73900,
    "avg3MPriceEok": "7억3,900",
    "avg3MPerPyeong": 2371,
    "avg3MTxCount": 16,
    "recent": [
      {
        "date": "05.13",
        "priceEok": "7억6,500",
        "areaPyeong": 33.275,
        "floor": 11,
        "area": 84.5442
      },
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
      }
    ],
    "rentTxCount": 17,
    "latestRentDeposit": 40000,
    "latestRentDepositEok": "4억",
    "latestRentMonthly": 0,
    "latestRentDate": "20260504",
    "avg1MRentDeposit": 42000,
    "avg1MRentDepositEok": "4억2,000",
    "avg3MRentDeposit": 41000,
    "avg3MRentDepositEok": "4억1,000"
  },
  "더레이크시티부영2단지": {
    "dong": "",
    "latestPrice": 77300,
    "latestPriceEok": "7억7,300",
    "latestArea": 33.275,
    "latestFloor": 7,
    "latestDate": "20260513",
    "maxPrice": 92500,
    "maxPriceEok": "9억2,500",
    "minPrice": 75500,
    "minPriceEok": "7억5,500",
    "txCount": 16,
    "avg1MPrice": 84800,
    "avg1MPriceEok": "8억4,800",
    "avg1MPerPyeong": 2531,
    "avg1MTxCount": 6,
    "avg3MPrice": 81700,
    "avg3MPriceEok": "8억1,700",
    "avg3MPerPyeong": 2434,
    "avg3MTxCount": 16,
    "recent": [
      {
        "date": "05.13",
        "priceEok": "7억7,300",
        "areaPyeong": 33.275,
        "floor": 7,
        "area": 84.52
      },
      {
        "date": "05.09",
        "priceEok": "9억",
        "areaPyeong": 32.9725,
        "floor": 18,
        "area": 84.5442
      },
      {
        "date": "05.09",
        "priceEok": "7억9,000",
        "areaPyeong": 34.1825,
        "floor": 14,
        "area": 88.0279
      },
      {
        "date": "05.06",
        "priceEok": "8억5,000",
        "areaPyeong": 34.485,
        "floor": 10,
        "area": 88.4828
      }
    ],
    "rentTxCount": 6,
    "latestRentDeposit": 50000,
    "latestRentDepositEok": "5억",
    "latestRentMonthly": 0,
    "latestRentDate": "20260408",
    "avg1MRentDeposit": 50000,
    "avg1MRentDepositEok": "5억",
    "avg3MRentDeposit": 45800,
    "avg3MRentDepositEok": "4억5,800"
  },
  "나루마을신도브래뉴": {
    "dong": "",
    "latestPrice": 97000,
    "latestPriceEok": "9억7,000",
    "latestArea": 48.0975,
    "latestFloor": 18,
    "latestDate": "20260513",
    "maxPrice": 97000,
    "maxPriceEok": "9억7,000",
    "minPrice": 83000,
    "minPriceEok": "8억3,000",
    "txCount": 11,
    "avg1MPrice": 88200,
    "avg1MPriceEok": "8억8,200",
    "avg1MPerPyeong": 2108,
    "avg1MTxCount": 7,
    "avg3MPrice": 87400,
    "avg3MPriceEok": "8억7,400",
    "avg3MPerPyeong": 2124,
    "avg3MTxCount": 11,
    "recent": [
      {
        "date": "05.13",
        "priceEok": "9억7,000",
        "areaPyeong": 48.0975,
        "floor": 18,
        "area": 128.0152
      },
      {
        "date": "05.12",
        "priceEok": "9억1,300",
        "areaPyeong": 41.442499999999995,
        "floor": 21,
        "area": 103.9466
      },
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
      }
    ],
    "rentTxCount": 7,
    "latestRentDeposit": 55000,
    "latestRentDepositEok": "5억5,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260430",
    "avg1MRentDeposit": 53000,
    "avg1MRentDepositEok": "5억3,000",
    "avg3MRentDeposit": 54700,
    "avg3MRentDepositEok": "5억4,700"
  },
  "금호어울림레이크2차": {
    "dong": "",
    "latestPrice": 69300,
    "latestPriceEok": "6억9,300",
    "latestArea": 33.879999999999995,
    "latestFloor": 20,
    "latestDate": "20260513",
    "maxPrice": 70300,
    "maxPriceEok": "7억300",
    "minPrice": 63500,
    "minPriceEok": "6억3,500",
    "txCount": 11,
    "avg1MPrice": 67500,
    "avg1MPriceEok": "6억7,500",
    "avg1MPerPyeong": 2077,
    "avg1MTxCount": 6,
    "avg3MPrice": 67400,
    "avg3MPriceEok": "6억7,400",
    "avg3MPerPyeong": 2080,
    "avg3MTxCount": 11,
    "recent": [
      {
        "date": "05.13",
        "priceEok": "6억9,300",
        "areaPyeong": 33.879999999999995,
        "floor": 20,
        "area": 84.96
      },
      {
        "date": "05.09",
        "priceEok": "6억4,500",
        "areaPyeong": 29.947499999999998,
        "floor": 14,
        "area": 74.99
      },
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
      }
    ],
    "rentTxCount": 12,
    "latestRentDeposit": 49000,
    "latestRentDepositEok": "4억9,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260502",
    "avg1MRentDeposit": 40400,
    "avg1MRentDepositEok": "4억400",
    "avg3MRentDeposit": 42200,
    "avg3MRentDepositEok": "4억2,200"
  },
  "푸른마을모아미래도": {
    "dong": "",
    "latestPrice": 51000,
    "latestPriceEok": "5억1,000",
    "latestArea": 33.689488524999994,
    "latestFloor": 4,
    "latestDate": "20260512",
    "maxPrice": 53000,
    "maxPriceEok": "5억3,000",
    "minPrice": 38000,
    "minPriceEok": "3억8,000",
    "txCount": 28,
    "avg1MPrice": 44200,
    "avg1MPriceEok": "4억4,200",
    "avg1MPerPyeong": 1716,
    "avg1MTxCount": 13,
    "avg3MPrice": 45200,
    "avg3MPriceEok": "4억5,200",
    "avg3MPerPyeong": 1702,
    "avg3MTxCount": 28,
    "recent": [
      {
        "date": "05.12",
        "priceEok": "5억1,000",
        "areaPyeong": 33.689488524999994,
        "floor": 4,
        "area": 83.737
      },
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
      }
    ],
    "rentTxCount": 23,
    "latestRentDeposit": 26460,
    "latestRentDepositEok": "2억6,460",
    "latestRentMonthly": 0,
    "latestRentDate": "20260504",
    "avg1MRentDeposit": 29600,
    "avg1MRentDepositEok": "2억9,600",
    "avg3MRentDeposit": 28500,
    "avg3MRentDepositEok": "2억8,500"
  },
  "시범한빛마을동탄아이파크": {
    "dong": "",
    "latestPrice": 80250,
    "latestPriceEok": "8억250",
    "latestArea": 24.80655485,
    "latestFloor": 9,
    "latestDate": "20260512",
    "maxPrice": 97000,
    "maxPriceEok": "9억7,000",
    "minPrice": 78400,
    "minPriceEok": "7억8,400",
    "txCount": 19,
    "avg1MPrice": 81200,
    "avg1MPriceEok": "8억1,200",
    "avg1MPerPyeong": 3272,
    "avg1MTxCount": 6,
    "avg3MPrice": 86600,
    "avg3MPriceEok": "8억6,600",
    "avg3MPerPyeong": 2907,
    "avg3MTxCount": 19,
    "recent": [
      {
        "date": "05.12",
        "priceEok": "8억250",
        "areaPyeong": 24.80655485,
        "floor": 9,
        "area": 61.658
      },
      {
        "date": "05.12",
        "priceEok": "8억1,800",
        "areaPyeong": 24.80655485,
        "floor": 8,
        "area": 61.658
      },
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
      }
    ],
    "rentTxCount": 14,
    "latestRentDeposit": 10000,
    "latestRentDepositEok": "1억",
    "latestRentMonthly": 140,
    "latestRentDate": "20260418",
    "avg1MRentDeposit": 40500,
    "avg1MRentDepositEok": "4억500",
    "avg3MRentDeposit": 43300,
    "avg3MRentDepositEok": "4억3,300"
  },
  "동탄역포레너스": {
    "dong": "영천동",
    "latestPrice": 66500,
    "latestPriceEok": "6억6,500",
    "latestArea": 34.01424526500001,
    "latestFloor": 11,
    "latestDate": "20260512",
    "maxPrice": 72000,
    "maxPriceEok": "7억2,000",
    "minPrice": 56700,
    "minPriceEok": "5억6,700",
    "txCount": 38,
    "avg1MPrice": 67600,
    "avg1MPriceEok": "6억7,600",
    "avg1MPerPyeong": 2034,
    "avg1MTxCount": 15,
    "avg3MPrice": 66200,
    "avg3MPriceEok": "6억6,200",
    "avg3MPerPyeong": 2018,
    "avg3MTxCount": 38,
    "recent": [
      {
        "date": "05.12",
        "priceEok": "6억6,500",
        "areaPyeong": 34.01424526500001,
        "floor": 11,
        "area": 84.5442
      },
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
      }
    ],
    "rentTxCount": 27,
    "latestRentDeposit": 29400,
    "latestRentDepositEok": "2억9,400",
    "latestRentMonthly": 0,
    "latestRentDate": "20260504",
    "avg1MRentDeposit": 38200,
    "avg1MRentDepositEok": "3억8,200",
    "avg3MRentDeposit": 41000,
    "avg3MRentDepositEok": "4억1,000"
  },
  "동탄역반도유보라아이비파크2.0": {
    "dong": "영천동",
    "latestPrice": 69500,
    "latestPriceEok": "6억9,500",
    "latestArea": 33.5775,
    "latestFloor": 10,
    "latestDate": "20260512",
    "maxPrice": 69500,
    "maxPriceEok": "6억9,500",
    "minPrice": 60000,
    "minPriceEok": "6억",
    "txCount": 21,
    "avg1MPrice": 65800,
    "avg1MPriceEok": "6억5,800",
    "avg1MPerPyeong": 2029,
    "avg1MTxCount": 13,
    "avg3MPrice": 65600,
    "avg3MPriceEok": "6억5,600",
    "avg3MPerPyeong": 2022,
    "avg3MTxCount": 21,
    "recent": [
      {
        "date": "05.12",
        "priceEok": "6억9,500",
        "areaPyeong": 33.5775,
        "floor": 10,
        "area": 84.96
      },
      {
        "date": "05.09",
        "priceEok": "6억3,000",
        "areaPyeong": 29.645,
        "floor": 21,
        "area": 74.364
      },
      {
        "date": "05.07",
        "priceEok": "6억8,700",
        "areaPyeong": 33.275,
        "floor": 10,
        "area": 84.9921
      },
      {
        "date": "05.07",
        "priceEok": "6억7,300",
        "areaPyeong": 33.275,
        "floor": 4,
        "area": 84.9921
      }
    ],
    "rentTxCount": 20,
    "latestRentDeposit": 44000,
    "latestRentDepositEok": "4억4,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260507",
    "avg1MRentDeposit": 41500,
    "avg1MRentDepositEok": "4억1,500",
    "avg3MRentDeposit": 40300,
    "avg3MRentDepositEok": "4억300"
  },
  "동탄역대원칸타빌포레지움": {
    "dong": "청계동",
    "latestPrice": 69000,
    "latestPriceEok": "6억9,000",
    "latestArea": 33.275,
    "latestFloor": 10,
    "latestDate": "20260512",
    "maxPrice": 80000,
    "maxPriceEok": "8억",
    "minPrice": 66500,
    "minPriceEok": "6억6,500",
    "txCount": 21,
    "avg1MPrice": 71600,
    "avg1MPriceEok": "7억1,600",
    "avg1MPerPyeong": 2063,
    "avg1MTxCount": 13,
    "avg3MPrice": 71300,
    "avg3MPriceEok": "7억1,300",
    "avg3MPerPyeong": 2086,
    "avg3MTxCount": 21,
    "recent": [
      {
        "date": "05.12",
        "priceEok": "6억9,000",
        "areaPyeong": 33.275,
        "floor": 10,
        "area": 84.208
      },
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
      }
    ],
    "rentTxCount": 7,
    "latestRentDeposit": 38500,
    "latestRentDepositEok": "3억8,500",
    "latestRentMonthly": 0,
    "latestRentDate": "20260411",
    "avg1MRentDeposit": 38500,
    "avg1MRentDepositEok": "3억8,500",
    "avg3MRentDeposit": 42500,
    "avg3MRentDepositEok": "4억2,500"
  },
  "동탄역반도유보라아이비파크5.0": {
    "dong": "여울동",
    "latestPrice": 108700,
    "latestPriceEok": "10억8,700",
    "latestArea": 29.645,
    "latestFloor": 5,
    "latestDate": "20260512",
    "maxPrice": 115000,
    "maxPriceEok": "11억5,000",
    "minPrice": 96700,
    "minPriceEok": "9억6,700",
    "txCount": 10,
    "avg1MPrice": 102500,
    "avg1MPriceEok": "10억2,500",
    "avg1MPerPyeong": 3859,
    "avg1MTxCount": 4,
    "avg3MPrice": 103700,
    "avg3MPriceEok": "10억3,700",
    "avg3MPerPyeong": 3689,
    "avg3MTxCount": 10,
    "recent": [
      {
        "date": "05.12",
        "priceEok": "10억8,700",
        "areaPyeong": 29.645,
        "floor": 5,
        "area": 74.3629
      },
      {
        "date": "05.04",
        "priceEok": "9억8,000",
        "areaPyeong": 23.8975,
        "floor": 14,
        "area": 59.9206
      },
      {
        "date": "04.24",
        "priceEok": "9억9,400",
        "areaPyeong": 23.8975,
        "floor": 26,
        "area": 59.9206
      },
      {
        "date": "04.16",
        "priceEok": "10억4,000",
        "areaPyeong": 29.645,
        "floor": 4,
        "area": 74.3629
      }
    ],
    "rentTxCount": 6,
    "latestRentDeposit": 59000,
    "latestRentDepositEok": "5억9,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260411",
    "avg1MRentDeposit": 59000,
    "avg1MRentDepositEok": "5억9,000",
    "avg3MRentDeposit": 45500,
    "avg3MRentDepositEok": "4억5,500"
  },
  "동탄역더힐": {
    "dong": "청계동",
    "latestPrice": 67700,
    "latestPriceEok": "6억7,700",
    "latestArea": 33.275,
    "latestFloor": 13,
    "latestDate": "20260512",
    "maxPrice": 70000,
    "maxPriceEok": "7억",
    "minPrice": 61800,
    "minPriceEok": "6억1,800",
    "txCount": 17,
    "avg1MPrice": 65800,
    "avg1MPriceEok": "6억5,800",
    "avg1MPerPyeong": 1971,
    "avg1MTxCount": 9,
    "avg3MPrice": 65600,
    "avg3MPriceEok": "6억5,600",
    "avg3MPerPyeong": 1966,
    "avg3MTxCount": 17,
    "recent": [
      {
        "date": "05.12",
        "priceEok": "6억7,700",
        "areaPyeong": 33.275,
        "floor": 13,
        "area": 84.5202
      },
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
      }
    ],
    "rentTxCount": 15,
    "latestRentDeposit": 38640,
    "latestRentDepositEok": "3억8,640",
    "latestRentMonthly": 0,
    "latestRentDate": "20260507",
    "avg1MRentDeposit": 39800,
    "avg1MRentDepositEok": "3억9,800",
    "avg3MRentDeposit": 39900,
    "avg3MRentDepositEok": "3억9,900"
  },
  "동탄금강펜테리움센트럴파크Ⅳ": {
    "dong": "",
    "latestPrice": 58000,
    "latestPriceEok": "5억8,000",
    "latestArea": 30.5525,
    "latestFloor": 17,
    "latestDate": "20260512",
    "maxPrice": 65000,
    "maxPriceEok": "6억5,000",
    "minPrice": 52000,
    "minPriceEok": "5억2,000",
    "txCount": 38,
    "avg1MPrice": 57900,
    "avg1MPriceEok": "5억7,900",
    "avg1MPerPyeong": 1882,
    "avg1MTxCount": 17,
    "avg3MPrice": 58100,
    "avg3MPriceEok": "5억8,100",
    "avg3MPerPyeong": 1847,
    "avg3MTxCount": 38,
    "recent": [
      {
        "date": "05.12",
        "priceEok": "5억8,000",
        "areaPyeong": 30.5525,
        "floor": 17,
        "area": 74.8709
      },
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
        "date": "05.01",
        "priceEok": "5억8,000",
        "areaPyeong": 30.5525,
        "floor": 12,
        "area": 74.8709
      }
    ],
    "rentTxCount": 22,
    "latestRentDeposit": 37000,
    "latestRentDepositEok": "3억7,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260501",
    "avg1MRentDeposit": 37400,
    "avg1MRentDepositEok": "3억7,400",
    "avg3MRentDeposit": 36100,
    "avg3MRentDepositEok": "3억6,100"
  },
  "동탄2신도시호반베르디움22단지": {
    "dong": "",
    "latestPrice": 59800,
    "latestPriceEok": "5억9,800",
    "latestArea": 23.2925,
    "latestFloor": 21,
    "latestDate": "20260512",
    "maxPrice": 61000,
    "maxPriceEok": "6억1,000",
    "minPrice": 50900,
    "minPriceEok": "5억900",
    "txCount": 35,
    "avg1MPrice": 57800,
    "avg1MPriceEok": "5억7,800",
    "avg1MPerPyeong": 2474,
    "avg1MTxCount": 7,
    "avg3MPrice": 55900,
    "avg3MPriceEok": "5억5,900",
    "avg3MPerPyeong": 2396,
    "avg3MTxCount": 35,
    "recent": [
      {
        "date": "05.12",
        "priceEok": "5억9,800",
        "areaPyeong": 23.2925,
        "floor": 21,
        "area": 53.4754
      },
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
        "date": "05.08",
        "priceEok": "6억1,000",
        "areaPyeong": 23.2925,
        "floor": 10,
        "area": 53.4754
      }
    ],
    "rentTxCount": 15,
    "latestRentDeposit": 31500,
    "latestRentDepositEok": "3억1,500",
    "latestRentMonthly": 0,
    "latestRentDate": "20260507",
    "avg1MRentDeposit": 31800,
    "avg1MRentDepositEok": "3억1,800",
    "avg3MRentDeposit": 31500,
    "avg3MRentDepositEok": "3억1,500"
  },
  "동탄2신도시금강펜테리움센트럴파크Ⅰ": {
    "dong": "",
    "latestPrice": 69500,
    "latestPriceEok": "6억9,500",
    "latestArea": 33.275,
    "latestFloor": 14,
    "latestDate": "20260512",
    "maxPrice": 69500,
    "maxPriceEok": "6억9,500",
    "minPrice": 55000,
    "minPriceEok": "5억5,000",
    "txCount": 22,
    "avg1MPrice": 62600,
    "avg1MPriceEok": "6억2,600",
    "avg1MPerPyeong": 1978,
    "avg1MTxCount": 7,
    "avg3MPrice": 61100,
    "avg3MPriceEok": "6억1,100",
    "avg3MPerPyeong": 1913,
    "avg3MTxCount": 22,
    "recent": [
      {
        "date": "05.12",
        "priceEok": "6억9,500",
        "areaPyeong": 33.275,
        "floor": 14,
        "area": 84.9949
      },
      {
        "date": "05.09",
        "priceEok": "5억8,500",
        "areaPyeong": 33.275,
        "floor": 1,
        "area": 84.9949
      },
      {
        "date": "05.08",
        "priceEok": "6억9,000",
        "areaPyeong": 33.275,
        "floor": 14,
        "area": 84.9949
      },
      {
        "date": "05.02",
        "priceEok": "5억8,900",
        "areaPyeong": 27.83,
        "floor": 13,
        "area": 69.9678
      }
    ],
    "rentTxCount": 4,
    "latestRentDeposit": 38000,
    "latestRentDepositEok": "3억8,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260321",
    "avg1MRentDeposit": 38000,
    "avg1MRentDepositEok": "3억8,000",
    "avg3MRentDeposit": 37200,
    "avg3MRentDepositEok": "3억7,200"
  },
  "동탄더샵레이크에듀타운": {
    "dong": "산척동",
    "latestPrice": 94000,
    "latestPriceEok": "9억4,000",
    "latestArea": 32.67,
    "latestFloor": 10,
    "latestDate": "20260515",
    "maxPrice": 100000,
    "maxPriceEok": "10억",
    "minPrice": 89000,
    "minPriceEok": "8억9,000",
    "txCount": 23,
    "avg1MPrice": 95000,
    "avg1MPriceEok": "9억5,000",
    "avg1MPerPyeong": 2903,
    "avg1MTxCount": 14,
    "avg3MPrice": 95000,
    "avg3MPriceEok": "9억5,000",
    "avg3MPerPyeong": 2901,
    "avg3MTxCount": 23,
    "recent": [
      {
        "date": "05.15",
        "priceEok": "9억4,000",
        "areaPyeong": 32.67,
        "floor": 10,
        "area": 84.9802
      },
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
      }
    ],
    "rentTxCount": 15,
    "latestRentDeposit": 47250,
    "latestRentDepositEok": "4억7,250",
    "latestRentMonthly": 0,
    "latestRentDate": "20260424",
    "avg1MRentDeposit": 48600,
    "avg1MRentDepositEok": "4억8,600",
    "avg3MRentDeposit": 48700,
    "avg3MRentDepositEok": "4억8,700"
  },
  "더레이크시티부영6단지": {
    "dong": "산척동",
    "latestPrice": 52500,
    "latestPriceEok": "5억2,500",
    "latestArea": 25.107499999999998,
    "latestFloor": 9,
    "latestDate": "20260515",
    "maxPrice": 65000,
    "maxPriceEok": "6억5,000",
    "minPrice": 48000,
    "minPriceEok": "4억8,000",
    "txCount": 33,
    "avg1MPrice": 52100,
    "avg1MPriceEok": "5억2,100",
    "avg1MPerPyeong": 2038,
    "avg1MTxCount": 17,
    "avg3MPrice": 52500,
    "avg3MPriceEok": "5억2,500",
    "avg3MPerPyeong": 2052,
    "avg3MTxCount": 33,
    "recent": [
      {
        "date": "05.15",
        "priceEok": "5억2,500",
        "areaPyeong": 25.107499999999998,
        "floor": 9,
        "area": 59.9912
      },
      {
        "date": "05.15",
        "priceEok": "5억1,000",
        "areaPyeong": 25.107499999999998,
        "floor": 18,
        "area": 59.9912
      },
      {
        "date": "05.12",
        "priceEok": "5억",
        "areaPyeong": 25.107499999999998,
        "floor": 9,
        "area": 59.9912
      },
      {
        "date": "05.12",
        "priceEok": "4억9,900",
        "areaPyeong": 25.107499999999998,
        "floor": 2,
        "area": 60.5232
      }
    ],
    "rentTxCount": 17,
    "latestRentDeposit": 36000,
    "latestRentDepositEok": "3억6,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260504",
    "avg1MRentDeposit": 37300,
    "avg1MRentDepositEok": "3억7,300",
    "avg3MRentDeposit": 34700,
    "avg3MRentDepositEok": "3억4,700"
  },
  "힐스테이트동탄역": {
    "dong": "영천동",
    "latestPrice": 55800,
    "latestPriceEok": "5억5,800",
    "latestArea": 23.2925,
    "latestFloor": 32,
    "latestDate": "20260511",
    "maxPrice": 55800,
    "maxPriceEok": "5억5,800",
    "minPrice": 49600,
    "minPriceEok": "4억9,600",
    "txCount": 20,
    "avg1MPrice": 53800,
    "avg1MPriceEok": "5억3,800",
    "avg1MPerPyeong": 2304,
    "avg1MTxCount": 4,
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
    "rentTxCount": 10,
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
    "latestFloor": 20,
    "latestDate": "20260511",
    "maxPrice": 81000,
    "maxPriceEok": "8억1,000",
    "minPrice": 70000,
    "minPriceEok": "7억",
    "txCount": 18,
    "avg1MPrice": 75100,
    "avg1MPriceEok": "7억5,100",
    "avg1MPerPyeong": 2345,
    "avg1MTxCount": 9,
    "avg3MPrice": 75700,
    "avg3MPriceEok": "7억5,700",
    "avg3MPerPyeong": 2363,
    "avg3MTxCount": 18,
    "recent": [
      {
        "date": "05.11",
        "priceEok": "8억500",
        "areaPyeong": 33.80736975,
        "floor": 20,
        "area": 84.03
      },
      {
        "date": "05.10",
        "priceEok": "7억3,500",
        "areaPyeong": 29.856538249999996,
        "floor": 5,
        "area": 74.21
      },
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
      }
    ],
    "rentTxCount": 17,
    "latestRentDeposit": 30000,
    "latestRentDepositEok": "3억",
    "latestRentMonthly": 0,
    "latestRentDate": "20260508",
    "avg1MRentDeposit": 31500,
    "avg1MRentDepositEok": "3억1,500",
    "avg3MRentDeposit": 37000,
    "avg3MRentDepositEok": "3억7,000"
  },
  "푸른마을두산위브": {
    "dong": "",
    "latestPrice": 50000,
    "latestPriceEok": "5억",
    "latestArea": 29.240981000000005,
    "latestFloor": 13,
    "latestDate": "20260511",
    "maxPrice": 66000,
    "maxPriceEok": "6억6,000",
    "minPrice": 46500,
    "minPriceEok": "4억6,500",
    "txCount": 11,
    "avg1MPrice": 49300,
    "avg1MPriceEok": "4억9,300",
    "avg1MPerPyeong": 1676,
    "avg1MTxCount": 3,
    "avg3MPrice": 52600,
    "avg3MPriceEok": "5억2,600",
    "avg3MPerPyeong": 1667,
    "avg3MTxCount": 11,
    "recent": [
      {
        "date": "05.11",
        "priceEok": "5억",
        "areaPyeong": 29.240981000000005,
        "floor": 13,
        "area": 72.68
      },
      {
        "date": "05.06",
        "priceEok": "4억6,500",
        "areaPyeong": 29.50249225,
        "floor": 2,
        "area": 73.33
      },
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
      }
    ],
    "rentTxCount": 10,
    "latestRentDeposit": 10000,
    "latestRentDepositEok": "1억",
    "latestRentMonthly": 110,
    "latestRentDate": "20260425",
    "avg1MRentDeposit": 29000,
    "avg1MRentDepositEok": "2억9,000",
    "avg3MRentDeposit": 33400,
    "avg3MRentDepositEok": "3억3,400"
  },
  "자연앤데시앙": {
    "dong": "",
    "latestPrice": 57000,
    "latestPriceEok": "5억7,000",
    "latestArea": 34.173485500000005,
    "latestFloor": 29,
    "latestDate": "20260511",
    "maxPrice": 61000,
    "maxPriceEok": "6억1,000",
    "minPrice": 43000,
    "minPriceEok": "4억3,000",
    "txCount": 39,
    "avg1MPrice": 53500,
    "avg1MPriceEok": "5억3,500",
    "avg1MPerPyeong": 1759,
    "avg1MTxCount": 13,
    "avg3MPrice": 51800,
    "avg3MPriceEok": "5억1,800",
    "avg3MPerPyeong": 1758,
    "avg3MTxCount": 39,
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
    "rentTxCount": 20,
    "latestRentDeposit": 29400,
    "latestRentDepositEok": "2억9,400",
    "latestRentMonthly": 0,
    "latestRentDate": "20260501",
    "avg1MRentDeposit": 31000,
    "avg1MRentDepositEok": "3억1,000",
    "avg3MRentDeposit": 31200,
    "avg3MRentDepositEok": "3억1,200"
  },
  "시범한빛마을한화꿈에그린": {
    "dong": "",
    "latestPrice": 90000,
    "latestPriceEok": "9억",
    "latestArea": 34.11716,
    "latestFloor": 13,
    "latestDate": "20260511",
    "maxPrice": 90000,
    "maxPriceEok": "9억",
    "minPrice": 78000,
    "minPriceEok": "7억8,000",
    "txCount": 9,
    "avg1MPrice": 83800,
    "avg1MPriceEok": "8억3,800",
    "avg1MPerPyeong": 2457,
    "avg1MTxCount": 6,
    "avg3MPrice": 82800,
    "avg3MPriceEok": "8억2,800",
    "avg3MPerPyeong": 2427,
    "avg3MTxCount": 9,
    "recent": [
      {
        "date": "05.11",
        "priceEok": "9억",
        "areaPyeong": 34.11716,
        "floor": 13,
        "area": 84.8
      },
      {
        "date": "05.08",
        "priceEok": "8억5,000",
        "areaPyeong": 34.11313675,
        "floor": 14,
        "area": 84.79
      },
      {
        "date": "04.27",
        "priceEok": "8억5,750",
        "areaPyeong": 34.088997250000006,
        "floor": 15,
        "area": 84.73
      },
      {
        "date": "04.25",
        "priceEok": "8억3,500",
        "areaPyeong": 34.11716,
        "floor": 11,
        "area": 84.8
      }
    ],
    "rentTxCount": 10,
    "latestRentDeposit": 5000,
    "latestRentDepositEok": "5,000만",
    "latestRentMonthly": 190,
    "latestRentDate": "20260501",
    "avg1MRentDeposit": 41000,
    "avg1MRentDepositEok": "4억1,000",
    "avg3MRentDeposit": 42000,
    "avg3MRentDepositEok": "4억2,000"
  },
  "동탄역센트럴푸르지오": {
    "dong": "청계동",
    "latestPrice": 80000,
    "latestPriceEok": "8억",
    "latestArea": 24.805,
    "latestFloor": 6,
    "latestDate": "20260511",
    "maxPrice": 93500,
    "maxPriceEok": "9억3,500",
    "minPrice": 72000,
    "minPriceEok": "7억2,000",
    "txCount": 25,
    "avg1MPrice": 83800,
    "avg1MPriceEok": "8억3,800",
    "avg1MPerPyeong": 3194,
    "avg1MTxCount": 10,
    "avg3MPrice": 81700,
    "avg3MPriceEok": "8억1,700",
    "avg3MPerPyeong": 3124,
    "avg3MTxCount": 25,
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
    "rentTxCount": 24,
    "latestRentDeposit": 37800,
    "latestRentDepositEok": "3억7,800",
    "latestRentMonthly": 0,
    "latestRentDate": "20260504",
    "avg1MRentDeposit": 39200,
    "avg1MRentDepositEok": "3억9,200",
    "avg3MRentDeposit": 39900,
    "avg3MRentDepositEok": "3억9,900"
  },
  "동탄센트럴포레스트": {
    "dong": "",
    "latestPrice": 51000,
    "latestPriceEok": "5억1,000",
    "latestArea": 29.947499999999998,
    "latestFloor": 4,
    "latestDate": "20260511",
    "maxPrice": 55500,
    "maxPriceEok": "5억5,500",
    "minPrice": 46000,
    "minPriceEok": "4억6,000",
    "txCount": 15,
    "avg1MPrice": 51900,
    "avg1MPriceEok": "5억1,900",
    "avg1MPerPyeong": 1676,
    "avg1MTxCount": 4,
    "avg3MPrice": 51400,
    "avg3MPriceEok": "5억1,400",
    "avg3MPerPyeong": 1671,
    "avg3MTxCount": 15,
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
    "rentTxCount": 8,
    "latestRentDeposit": 42000,
    "latestRentDepositEok": "4억2,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260501",
    "avg1MRentDeposit": 37800,
    "avg1MRentDepositEok": "3억7,800",
    "avg3MRentDeposit": 33300,
    "avg3MRentDepositEok": "3억3,300"
  },
  "더레이크시티부영1단지": {
    "dong": "",
    "latestPrice": 60000,
    "latestPriceEok": "6억",
    "latestArea": 25.107499999999998,
    "latestFloor": 11,
    "latestDate": "20260511",
    "maxPrice": 77500,
    "maxPriceEok": "7억7,500",
    "minPrice": 54300,
    "minPriceEok": "5억4,300",
    "txCount": 26,
    "avg1MPrice": 62700,
    "avg1MPriceEok": "6억2,700",
    "avg1MPerPyeong": 2349,
    "avg1MTxCount": 14,
    "avg3MPrice": 63700,
    "avg3MPriceEok": "6억3,700",
    "avg3MPerPyeong": 2324,
    "avg3MTxCount": 26,
    "recent": [
      {
        "date": "05.11",
        "priceEok": "6억",
        "areaPyeong": 25.107499999999998,
        "floor": 11,
        "area": 59.9912
      },
      {
        "date": "05.09",
        "priceEok": "6억1,900",
        "areaPyeong": 25.107499999999998,
        "floor": 24,
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
      }
    ],
    "rentTxCount": 19,
    "latestRentDeposit": 35000,
    "latestRentDepositEok": "3억5,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260504",
    "avg1MRentDeposit": 35000,
    "avg1MRentDepositEok": "3억5,000",
    "avg3MRentDeposit": 36700,
    "avg3MRentDepositEok": "3억6,700"
  },
  "METAPOLIS": {
    "dong": "",
    "latestPrice": 122000,
    "latestPriceEok": "12억2,000",
    "latestArea": 54.1475,
    "latestFloor": 27,
    "latestDate": "20260511",
    "maxPrice": 125000,
    "maxPriceEok": "12억5,000",
    "minPrice": 100000,
    "minPriceEok": "10억",
    "txCount": 8,
    "avg1MPrice": 113000,
    "avg1MPriceEok": "11억3,000",
    "avg1MPerPyeong": 2349,
    "avg1MTxCount": 6,
    "avg3MPrice": 112200,
    "avg3MPriceEok": "11억2,200",
    "avg3MPerPyeong": 2394,
    "avg3MTxCount": 8,
    "recent": [
      {
        "date": "05.11",
        "priceEok": "12억2,000",
        "areaPyeong": 54.1475,
        "floor": 27,
        "area": 128.44
      },
      {
        "date": "05.10",
        "priceEok": "10억900",
        "areaPyeong": 40.8375,
        "floor": 25,
        "area": 96.22
      },
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
      }
    ],
    "rentTxCount": 16,
    "latestRentDeposit": 10000,
    "latestRentDepositEok": "1억",
    "latestRentMonthly": 250,
    "latestRentDate": "20260430",
    "avg1MRentDeposit": 59700,
    "avg1MRentDepositEok": "5억9,700",
    "avg3MRentDeposit": 60800,
    "avg3MRentDepositEok": "6억800"
  },
  "동탄역중흥에스클래스": {
    "dong": "여울동",
    "latestPrice": 63000,
    "latestPriceEok": "6억3,000",
    "latestArea": 33.3973603425,
    "latestFloor": 12,
    "latestDate": "20260510",
    "maxPrice": 66000,
    "maxPriceEok": "6억6,000",
    "minPrice": 59500,
    "minPriceEok": "5억9,500",
    "txCount": 21,
    "avg1MPrice": 64000,
    "avg1MPriceEok": "6억4,000",
    "avg1MPerPyeong": 1915,
    "avg1MTxCount": 6,
    "avg3MPrice": 62900,
    "avg3MPriceEok": "6억2,900",
    "avg3MPerPyeong": 1884,
    "avg3MTxCount": 21,
    "recent": [
      {
        "date": "05.10",
        "priceEok": "6억3,000",
        "areaPyeong": 33.3973603425,
        "floor": 12,
        "area": 83.0109
      },
      {
        "date": "05.01",
        "priceEok": "6억6,000",
        "areaPyeong": 33.3973603425,
        "floor": 11,
        "area": 83.0109
      },
      {
        "date": "04.28",
        "priceEok": "6억2,000",
        "areaPyeong": 33.3973603425,
        "floor": 3,
        "area": 83.0109
      },
      {
        "date": "04.25",
        "priceEok": "6억1,800",
        "areaPyeong": 33.3973603425,
        "floor": 3,
        "area": 83.0109
      }
    ],
    "rentTxCount": 1,
    "latestRentDeposit": 36500,
    "latestRentDepositEok": "3억6,500",
    "latestRentMonthly": 0,
    "latestRentDate": "20260307",
    "avg1MRentDeposit": 36500,
    "avg1MRentDepositEok": "3억6,500",
    "avg3MRentDeposit": 36500,
    "avg3MRentDepositEok": "3억6,500"
  },
  "힐스테이트동탄": {
    "dong": "",
    "latestPrice": 90000,
    "latestPriceEok": "9억",
    "latestArea": 34.136431367499995,
    "latestFloor": 27,
    "latestDate": "20260509",
    "maxPrice": 90000,
    "maxPriceEok": "9억",
    "minPrice": 60000,
    "minPriceEok": "6억",
    "txCount": 41,
    "avg1MPrice": 83100,
    "avg1MPriceEok": "8억3,100",
    "avg1MPerPyeong": 2543,
    "avg1MTxCount": 11,
    "avg3MPrice": 80000,
    "avg3MPriceEok": "8억",
    "avg3MPerPyeong": 2477,
    "avg3MTxCount": 41,
    "recent": [
      {
        "date": "05.09",
        "priceEok": "9억",
        "areaPyeong": 34.136431367499995,
        "floor": 27,
        "area": 84.8479
      },
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
      }
    ],
    "rentTxCount": 21,
    "latestRentDeposit": 29000,
    "latestRentDepositEok": "2억9,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260507",
    "avg1MRentDeposit": 43000,
    "avg1MRentDepositEok": "4억3,000",
    "avg3MRentDeposit": 41400,
    "avg3MRentDepositEok": "4억1,400"
  },
  "호반베르디움센트럴포레": {
    "dong": "",
    "latestPrice": 61000,
    "latestPriceEok": "6억1,000",
    "latestArea": 34.132770210000004,
    "latestFloor": 25,
    "latestDate": "20260509",
    "maxPrice": 69500,
    "maxPriceEok": "6억9,500",
    "minPrice": 57000,
    "minPriceEok": "5억7,000",
    "txCount": 34,
    "avg1MPrice": 62000,
    "avg1MPriceEok": "6억2,000",
    "avg1MPerPyeong": 1777,
    "avg1MTxCount": 19,
    "avg3MPrice": 61800,
    "avg3MPriceEok": "6억1,800",
    "avg3MPerPyeong": 1781,
    "avg3MTxCount": 34,
    "recent": [
      {
        "date": "05.09",
        "priceEok": "6억1,000",
        "areaPyeong": 34.132770210000004,
        "floor": 25,
        "area": 84.8388
      },
      {
        "date": "05.09",
        "priceEok": "5억8,700",
        "areaPyeong": 34.064455425,
        "floor": 16,
        "area": 84.669
      },
      {
        "date": "05.08",
        "priceEok": "5억9,500",
        "areaPyeong": 34.132770210000004,
        "floor": 4,
        "area": 84.8388
      },
      {
        "date": "05.08",
        "priceEok": "6억6,400",
        "areaPyeong": 39.4880780525,
        "floor": 4,
        "area": 98.1497
      }
    ],
    "rentTxCount": 16,
    "latestRentDeposit": 39900,
    "latestRentDepositEok": "3억9,900",
    "latestRentMonthly": 0,
    "latestRentDate": "20260503",
    "avg1MRentDeposit": 38200,
    "avg1MRentDepositEok": "3억8,200",
    "avg3MRentDeposit": 37200,
    "avg3MRentDepositEok": "3억7,200"
  },
  "중흥에스클래스에듀하이": {
    "dong": "",
    "latestPrice": 69000,
    "latestPriceEok": "6억9,000",
    "latestArea": 33.461128855,
    "latestFloor": 25,
    "latestDate": "20260509",
    "maxPrice": 71800,
    "maxPriceEok": "7억1,800",
    "minPrice": 64000,
    "minPriceEok": "6억4,000",
    "txCount": 16,
    "avg1MPrice": 67800,
    "avg1MPriceEok": "6억7,800",
    "avg1MPerPyeong": 2028,
    "avg1MTxCount": 8,
    "avg3MPrice": 68000,
    "avg3MPriceEok": "6억8,000",
    "avg3MPerPyeong": 2036,
    "avg3MTxCount": 16,
    "recent": [
      {
        "date": "05.09",
        "priceEok": "6억9,000",
        "areaPyeong": 33.461128855,
        "floor": 25,
        "area": 83.1694
      },
      {
        "date": "05.09",
        "priceEok": "7억1,000",
        "areaPyeong": 33.3973603425,
        "floor": 12,
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
        "date": "05.07",
        "priceEok": "6억7,000",
        "areaPyeong": 33.3973603425,
        "floor": 3,
        "area": 83.0109
      }
    ],
    "rentTxCount": 5,
    "latestRentDeposit": 45000,
    "latestRentDepositEok": "4억5,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260416",
    "avg1MRentDeposit": 45000,
    "avg1MRentDepositEok": "4억5,000",
    "avg3MRentDeposit": 41900,
    "avg3MRentDepositEok": "4억1,900"
  },
  "제일풍경채에듀앤파크": {
    "dong": "",
    "latestPrice": 51300,
    "latestPriceEok": "5억1,300",
    "latestArea": 30.7217381625,
    "latestFloor": 3,
    "latestDate": "20260509",
    "maxPrice": 56700,
    "maxPriceEok": "5억6,700",
    "minPrice": 44800,
    "minPriceEok": "4억4,800",
    "txCount": 21,
    "avg1MPrice": 47600,
    "avg1MPriceEok": "4억7,600",
    "avg1MPerPyeong": 1851,
    "avg1MTxCount": 7,
    "avg3MPrice": 49500,
    "avg3MPriceEok": "4억9,500",
    "avg3MPerPyeong": 1854,
    "avg3MTxCount": 21,
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
    "rentTxCount": 15,
    "latestRentDeposit": 3000,
    "latestRentDepositEok": "3,000만",
    "latestRentMonthly": 126,
    "latestRentDate": "20260430",
    "avg1MRentDeposit": 32100,
    "avg1MRentDepositEok": "3억2,100",
    "avg3MRentDeposit": 32700,
    "avg3MRentDepositEok": "3억2,700"
  },
  "시범다은마을포스코더샵": {
    "dong": "",
    "latestPrice": 74500,
    "latestPriceEok": "7억4,500",
    "latestArea": 34.000928307500004,
    "latestFloor": 5,
    "latestDate": "20260509",
    "maxPrice": 93000,
    "maxPriceEok": "9억3,000",
    "minPrice": 70900,
    "minPriceEok": "7억900",
    "txCount": 7,
    "avg1MPrice": 81800,
    "avg1MPriceEok": "8억1,800",
    "avg1MPerPyeong": 2136,
    "avg1MTxCount": 3,
    "avg3MPrice": 78600,
    "avg3MPriceEok": "7억8,600",
    "avg3MPerPyeong": 2196,
    "avg3MTxCount": 7,
    "recent": [
      {
        "date": "05.09",
        "priceEok": "7억4,500",
        "areaPyeong": 34.000928307500004,
        "floor": 5,
        "area": 84.5111
      },
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
      }
    ],
    "rentTxCount": 5,
    "latestRentDeposit": 41000,
    "latestRentDepositEok": "4억1,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260311",
    "avg1MRentDeposit": 41000,
    "avg1MRentDepositEok": "4억1,000",
    "avg3MRentDeposit": 44900,
    "avg3MRentDepositEok": "4억4,900"
  },
  "시범다은마을삼성래미안": {
    "dong": "",
    "latestPrice": 85000,
    "latestPriceEok": "8억5,000",
    "latestArea": 45.7254029925,
    "latestFloor": 21,
    "latestDate": "20260509",
    "maxPrice": 85000,
    "maxPriceEok": "8억5,000",
    "minPrice": 70500,
    "minPriceEok": "7억500",
    "txCount": 8,
    "avg1MPrice": 78400,
    "avg1MPriceEok": "7억8,400",
    "avg1MPerPyeong": 2144,
    "avg1MTxCount": 4,
    "avg3MPrice": 76900,
    "avg3MPriceEok": "7억6,900",
    "avg3MPerPyeong": 2141,
    "avg3MTxCount": 8,
    "recent": [
      {
        "date": "05.09",
        "priceEok": "8억5,000",
        "areaPyeong": 45.7254029925,
        "floor": 21,
        "area": 113.6529
      },
      {
        "date": "04.29",
        "priceEok": "7억6,900",
        "areaPyeong": 34.040637785,
        "floor": 10,
        "area": 84.6098
      },
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
      }
    ],
    "rentTxCount": 7,
    "latestRentDeposit": 51000,
    "latestRentDepositEok": "5억1,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260418",
    "avg1MRentDeposit": 51000,
    "avg1MRentDepositEok": "5억1,000",
    "avg3MRentDeposit": 47000,
    "avg3MRentDepositEok": "4억7,000"
  },
  "르파비스": {
    "dong": "",
    "latestPrice": 51000,
    "latestPriceEok": "5억1,000",
    "latestArea": 24.014779249999997,
    "latestFloor": 13,
    "latestDate": "20260509",
    "maxPrice": 62000,
    "maxPriceEok": "6억2,000",
    "minPrice": 40400,
    "minPriceEok": "4억400",
    "txCount": 13,
    "avg1MPrice": 51500,
    "avg1MPriceEok": "5억1,500",
    "avg1MPerPyeong": 2007,
    "avg1MTxCount": 5,
    "avg3MPrice": 50200,
    "avg3MPriceEok": "5억200",
    "avg3MPerPyeong": 1969,
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
    "rentTxCount": 0,
    "latestRentDeposit": 0,
    "latestRentDepositEok": "0",
    "latestRentMonthly": 0,
    "latestRentDate": "",
    "avg1MRentDeposit": 0,
    "avg1MRentDepositEok": "0만",
    "avg3MRentDeposit": 0,
    "avg3MRentDepositEok": "0만"
  },
  "동탄호수하우스디": {
    "dong": "장지동",
    "latestPrice": 67500,
    "latestPriceEok": "6억7,500",
    "latestArea": 34.18555525,
    "latestFloor": 16,
    "latestDate": "20260509",
    "maxPrice": 68800,
    "maxPriceEok": "6억8,800",
    "minPrice": 60000,
    "minPriceEok": "6억",
    "txCount": 9,
    "avg1MPrice": 66200,
    "avg1MPriceEok": "6억6,200",
    "avg1MPerPyeong": 1975,
    "avg1MTxCount": 6,
    "avg3MPrice": 65000,
    "avg3MPriceEok": "6억5,000",
    "avg3MPerPyeong": 1980,
    "avg3MTxCount": 9,
    "recent": [
      {
        "date": "05.09",
        "priceEok": "6억7,500",
        "areaPyeong": 34.18555525,
        "floor": 16,
        "area": 84.97
      },
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
      }
    ],
    "rentTxCount": 2,
    "latestRentDeposit": 37000,
    "latestRentDepositEok": "3억7,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260313",
    "avg1MRentDeposit": 37000,
    "avg1MRentDepositEok": "3억7,000",
    "avg3MRentDeposit": 36500,
    "avg3MRentDepositEok": "3억6,500"
  },
  "동탄푸른마을신일해피트리": {
    "dong": "",
    "latestPrice": 42000,
    "latestPriceEok": "4억2,000",
    "latestArea": 23.757291249999998,
    "latestFloor": 5,
    "latestDate": "20260509",
    "maxPrice": 52400,
    "maxPriceEok": "5억2,400",
    "minPrice": 40700,
    "minPriceEok": "4억700",
    "txCount": 11,
    "avg1MPrice": 43300,
    "avg1MPriceEok": "4억3,300",
    "avg1MPerPyeong": 1811,
    "avg1MTxCount": 4,
    "avg3MPrice": 44800,
    "avg3MPriceEok": "4억4,800",
    "avg3MPerPyeong": 1760,
    "avg3MTxCount": 11,
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
    "rentTxCount": 23,
    "latestRentDeposit": 5000,
    "latestRentDepositEok": "5,000만",
    "latestRentMonthly": 125,
    "latestRentDate": "20260422",
    "avg1MRentDeposit": 31200,
    "avg1MRentDepositEok": "3억1,200",
    "avg3MRentDeposit": 28900,
    "avg3MRentDepositEok": "2억8,900"
  },
  "동탄퍼스트파크": {
    "dong": "영천동",
    "latestPrice": 41000,
    "latestPriceEok": "4억1,000",
    "latestArea": 26.9225,
    "latestFloor": 6,
    "latestDate": "20260509",
    "maxPrice": 44900,
    "maxPriceEok": "4억4,900",
    "minPrice": 38000,
    "minPriceEok": "3억8,000",
    "txCount": 18,
    "avg1MPrice": 41300,
    "avg1MPriceEok": "4억1,300",
    "avg1MPerPyeong": 1532,
    "avg1MTxCount": 7,
    "avg3MPrice": 41600,
    "avg3MPriceEok": "4억1,600",
    "avg3MPerPyeong": 1545,
    "avg3MTxCount": 18,
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
    "rentTxCount": 6,
    "latestRentDeposit": 32000,
    "latestRentDepositEok": "3억2,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260501",
    "avg1MRentDeposit": 32000,
    "avg1MRentDepositEok": "3억2,000",
    "avg3MRentDeposit": 31200,
    "avg3MRentDepositEok": "3억1,200"
  },
  "동탄역신안인스빌리베라2차": {
    "dong": "청계동",
    "latestPrice": 78000,
    "latestPriceEok": "7억8,000",
    "latestArea": 24.805,
    "latestFloor": 7,
    "latestDate": "20260509",
    "maxPrice": 94000,
    "maxPriceEok": "9억4,000",
    "minPrice": 69000,
    "minPriceEok": "6억9,000",
    "txCount": 18,
    "avg1MPrice": 79900,
    "avg1MPriceEok": "7억9,900",
    "avg1MPerPyeong": 2978,
    "avg1MTxCount": 11,
    "avg3MPrice": 79700,
    "avg3MPriceEok": "7억9,700",
    "avg3MPerPyeong": 2892,
    "avg3MTxCount": 18,
    "recent": [
      {
        "date": "05.09",
        "priceEok": "7억8,000",
        "areaPyeong": 24.805,
        "floor": 7,
        "area": 59.968
      },
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
      }
    ],
    "rentTxCount": 13,
    "latestRentDeposit": 30000,
    "latestRentDepositEok": "3억",
    "latestRentMonthly": 100,
    "latestRentDate": "20260503",
    "avg1MRentDeposit": 48400,
    "avg1MRentDepositEok": "4억8,400",
    "avg3MRentDeposit": 39700,
    "avg3MRentDepositEok": "3억9,700"
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
    "minPrice": 106000,
    "minPriceEok": "10억6,000",
    "txCount": 22,
    "avg1MPrice": 115700,
    "avg1MPriceEok": "11억5,700",
    "avg1MPerPyeong": 3524,
    "avg1MTxCount": 10,
    "avg3MPrice": 113800,
    "avg3MPriceEok": "11억3,800",
    "avg3MPerPyeong": 3469,
    "avg3MTxCount": 22,
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
    "rentTxCount": 17,
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
    "latestPrice": 102000,
    "latestPriceEok": "10억2,000",
    "latestArea": 35.089999999999996,
    "latestFloor": 1,
    "latestDate": "20260509",
    "maxPrice": 118000,
    "maxPriceEok": "11억8,000",
    "minPrice": 97500,
    "minPriceEok": "9억7,500",
    "txCount": 14,
    "avg1MPrice": 106700,
    "avg1MPriceEok": "10억6,700",
    "avg1MPerPyeong": 3236,
    "avg1MTxCount": 10,
    "avg3MPrice": 105300,
    "avg3MPriceEok": "10억5,300",
    "avg3MPerPyeong": 3205,
    "avg3MTxCount": 14,
    "recent": [
      {
        "date": "05.09",
        "priceEok": "10억2,000",
        "areaPyeong": 35.089999999999996,
        "floor": 1,
        "area": 84.9351
      },
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
      }
    ],
    "rentTxCount": 4,
    "latestRentDeposit": 10000,
    "latestRentDepositEok": "1억",
    "latestRentMonthly": 130,
    "latestRentDate": "20260430",
    "avg1MRentDeposit": 50200,
    "avg1MRentDepositEok": "5억200",
    "avg3MRentDeposit": 48100,
    "avg3MRentDepositEok": "4억8,100"
  },
  "동탄역롯데캐슬": {
    "dong": "여울동",
    "latestPrice": 224000,
    "latestPriceEok": "22억4,000",
    "latestArea": 41.745,
    "latestFloor": 19,
    "latestDate": "20260509",
    "maxPrice": 224000,
    "maxPriceEok": "22억4,000",
    "minPrice": 160000,
    "minPriceEok": "16억",
    "txCount": 12,
    "avg1MPrice": 200100,
    "avg1MPriceEok": "20억100",
    "avg1MPerPyeong": 5353,
    "avg1MTxCount": 5,
    "avg3MPrice": 189400,
    "avg3MPriceEok": "18억9,400",
    "avg3MPerPyeong": 5526,
    "avg3MTxCount": 12,
    "recent": [
      {
        "date": "05.09",
        "priceEok": "22억4,000",
        "areaPyeong": 41.745,
        "floor": 19,
        "area": 102.7092
      },
      {
        "date": "04.24",
        "priceEok": "18억9,500",
        "areaPyeong": 34.485,
        "floor": 4,
        "area": 84.7002
      },
      {
        "date": "04.24",
        "priceEok": "22억2,000",
        "areaPyeong": 41.745,
        "floor": 49,
        "area": 102.7092
      },
      {
        "date": "04.22",
        "priceEok": "18억3,000",
        "areaPyeong": 34.485,
        "floor": 6,
        "area": 84.8222
      }
    ],
    "rentTxCount": 10,
    "latestRentDeposit": 45000,
    "latestRentDepositEok": "4억5,000",
    "latestRentMonthly": 55,
    "latestRentDate": "20260403",
    "avg1MRentDeposit": 57000,
    "avg1MRentDepositEok": "5억7,000",
    "avg3MRentDeposit": 72700,
    "avg3MRentDepositEok": "7억2,700"
  },
  "동탄역동원로얄듀크1차": {
    "dong": "영천동",
    "latestPrice": 71000,
    "latestPriceEok": "7억1,000",
    "latestArea": 24.805,
    "latestFloor": 19,
    "latestDate": "20260509",
    "maxPrice": 89000,
    "maxPriceEok": "8억9,000",
    "minPrice": 64000,
    "minPriceEok": "6억4,000",
    "txCount": 14,
    "avg1MPrice": 75900,
    "avg1MPriceEok": "7억5,900",
    "avg1MPerPyeong": 2840,
    "avg1MTxCount": 4,
    "avg3MPrice": 76700,
    "avg3MPriceEok": "7억6,700",
    "avg3MPerPyeong": 2604,
    "avg3MTxCount": 14,
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
    "rentTxCount": 11,
    "latestRentDeposit": 38400,
    "latestRentDepositEok": "3억8,400",
    "latestRentMonthly": 0,
    "latestRentDate": "20260504",
    "avg1MRentDeposit": 41500,
    "avg1MRentDepositEok": "4억1,500",
    "avg3MRentDeposit": 41000,
    "avg3MRentDepositEok": "4억1,000"
  },
  "동탄역더샵센트럴시티2차": {
    "dong": "여울동",
    "latestPrice": 79700,
    "latestPriceEok": "7억9,700",
    "latestArea": 33.879999999999995,
    "latestFloor": 23,
    "latestDate": "20260509",
    "maxPrice": 81700,
    "maxPriceEok": "8억1,700",
    "minPrice": 69000,
    "minPriceEok": "6억9,000",
    "txCount": 20,
    "avg1MPrice": 77600,
    "avg1MPriceEok": "7억7,600",
    "avg1MPerPyeong": 2372,
    "avg1MTxCount": 7,
    "avg3MPrice": 75600,
    "avg3MPriceEok": "7억5,600",
    "avg3MPerPyeong": 2364,
    "avg3MTxCount": 20,
    "recent": [
      {
        "date": "05.09",
        "priceEok": "7억9,700",
        "areaPyeong": 33.879999999999995,
        "floor": 23,
        "area": 84.98
      },
      {
        "date": "05.08",
        "priceEok": "7억3,500",
        "areaPyeong": 29.947499999999998,
        "floor": 4,
        "area": 74.9
      },
      {
        "date": "05.06",
        "priceEok": "7억5,000",
        "areaPyeong": 33.879999999999995,
        "floor": 12,
        "area": 84.98
      },
      {
        "date": "05.05",
        "priceEok": "7억8,000",
        "areaPyeong": 33.879999999999995,
        "floor": 11,
        "area": 84.98
      }
    ],
    "rentTxCount": 5,
    "latestRentDeposit": 36750,
    "latestRentDepositEok": "3억6,750",
    "latestRentMonthly": 0,
    "latestRentDate": "20260411",
    "avg1MRentDeposit": 36800,
    "avg1MRentDepositEok": "3억6,800",
    "avg3MRentDeposit": 42500,
    "avg3MRentDepositEok": "4억2,500"
  },
  "동탄역대방디엠시티더센텀": {
    "dong": "영천동",
    "latestPrice": 75000,
    "latestPriceEok": "7억5,000",
    "latestArea": 22.99,
    "latestFloor": 21,
    "latestDate": "20260509",
    "maxPrice": 78000,
    "maxPriceEok": "7억8,000",
    "minPrice": 68000,
    "minPriceEok": "6억8,000",
    "txCount": 21,
    "avg1MPrice": 74600,
    "avg1MPriceEok": "7억4,600",
    "avg1MPerPyeong": 3087,
    "avg1MTxCount": 10,
    "avg3MPrice": 72900,
    "avg3MPriceEok": "7억2,900",
    "avg3MPerPyeong": 3028,
    "avg3MTxCount": 21,
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
    "rentTxCount": 7,
    "latestRentDeposit": 10000,
    "latestRentDepositEok": "1억",
    "latestRentMonthly": 150,
    "latestRentDate": "20260501",
    "avg1MRentDeposit": 46200,
    "avg1MRentDepositEok": "4억6,200",
    "avg3MRentDeposit": 42300,
    "avg3MRentDepositEok": "4억2,300"
  },
  "동탄역호반써밋": {
    "dong": "청계동",
    "latestPrice": 90000,
    "latestPriceEok": "9억",
    "latestArea": 32.67,
    "latestFloor": 23,
    "latestDate": "20260512",
    "maxPrice": 90000,
    "maxPriceEok": "9억",
    "minPrice": 63000,
    "minPriceEok": "6억3,000",
    "txCount": 25,
    "avg1MPrice": 81800,
    "avg1MPriceEok": "8억1,800",
    "avg1MPerPyeong": 2911,
    "avg1MTxCount": 12,
    "avg3MPrice": 80800,
    "avg3MPriceEok": "8억800",
    "avg3MPerPyeong": 2927,
    "avg3MTxCount": 25,
    "recent": [
      {
        "date": "05.12",
        "priceEok": "9억",
        "areaPyeong": 32.67,
        "floor": 23,
        "area": 84.957
      },
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
      }
    ],
    "rentTxCount": 23,
    "latestRentDeposit": 4000,
    "latestRentDepositEok": "4,000만",
    "latestRentMonthly": 130,
    "latestRentDate": "20260501",
    "avg1MRentDeposit": 38200,
    "avg1MRentDepositEok": "3억8,200",
    "avg3MRentDeposit": 38200,
    "avg3MRentDepositEok": "3억8,200"
  },
  "동탄역신미주": {
    "dong": "여울동",
    "latestPrice": 59990,
    "latestPriceEok": "5억9,990",
    "latestArea": 32.3675,
    "latestFloor": 6,
    "latestDate": "20260509",
    "maxPrice": 64500,
    "maxPriceEok": "6억4,500",
    "minPrice": 52000,
    "minPriceEok": "5억2,000",
    "txCount": 19,
    "avg1MPrice": 61400,
    "avg1MPriceEok": "6억1,400",
    "avg1MPerPyeong": 1896,
    "avg1MTxCount": 4,
    "avg3MPrice": 58400,
    "avg3MPriceEok": "5억8,400",
    "avg3MPerPyeong": 1804,
    "avg3MTxCount": 19,
    "recent": [
      {
        "date": "05.09",
        "priceEok": "5억9,990",
        "areaPyeong": 32.3675,
        "floor": 6,
        "area": 84.896
      },
      {
        "date": "04.28",
        "priceEok": "5억8,000",
        "areaPyeong": 32.3675,
        "floor": 4,
        "area": 84.896
      },
      {
        "date": "04.20",
        "priceEok": "6억4,500",
        "areaPyeong": 32.3675,
        "floor": 7,
        "area": 84.896
      },
      {
        "date": "04.19",
        "priceEok": "6억3,000",
        "areaPyeong": 32.3675,
        "floor": 9,
        "area": 84.896
      }
    ],
    "rentTxCount": 2,
    "latestRentDeposit": 30000,
    "latestRentDepositEok": "3억",
    "latestRentMonthly": 0,
    "latestRentDate": "20260328",
    "avg1MRentDeposit": 30000,
    "avg1MRentDepositEok": "3억",
    "avg3MRentDeposit": 28700,
    "avg3MRentDepositEok": "2억8,700"
  },
  "동탄역시범한화꿈에그린프레스티지": {
    "dong": "청계동",
    "latestPrice": 146000,
    "latestPriceEok": "14억6,000",
    "latestArea": 33.275,
    "latestFloor": 7,
    "latestDate": "20260509",
    "maxPrice": 171000,
    "maxPriceEok": "17억1,000",
    "minPrice": 129000,
    "minPriceEok": "12억9,000",
    "txCount": 39,
    "avg1MPrice": 155300,
    "avg1MPriceEok": "15억5,300",
    "avg1MPerPyeong": 4118,
    "avg1MTxCount": 14,
    "avg3MPrice": 150900,
    "avg3MPriceEok": "15억900",
    "avg3MPerPyeong": 3998,
    "avg3MTxCount": 39,
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
        "date": "05.09",
        "priceEok": "15억3,500",
        "areaPyeong": 33.275,
        "floor": 28,
        "area": 84.89
      },
      {
        "date": "05.05",
        "priceEok": "15억9,000",
        "areaPyeong": 39.6275,
        "floor": 9,
        "area": 101.4
      }
    ],
    "rentTxCount": 35,
    "latestRentDeposit": 56200,
    "latestRentDepositEok": "5억6,200",
    "latestRentMonthly": 0,
    "latestRentDate": "20260430",
    "avg1MRentDeposit": 66400,
    "avg1MRentDepositEok": "6억6,400",
    "avg3MRentDeposit": 65700,
    "avg3MRentDepositEok": "6억5,700"
  },
  "동탄역시범우남퍼스트빌아파트": {
    "dong": "청계동",
    "latestPrice": 125000,
    "latestPriceEok": "12억5,000",
    "latestArea": 28.1325,
    "latestFloor": 6,
    "latestDate": "20260513",
    "maxPrice": 150000,
    "maxPriceEok": "15억",
    "minPrice": 119700,
    "minPriceEok": "11억9,700",
    "txCount": 25,
    "avg1MPrice": 135200,
    "avg1MPriceEok": "13억5,200",
    "avg1MPerPyeong": 4521,
    "avg1MTxCount": 13,
    "avg3MPrice": 131800,
    "avg3MPriceEok": "13억1,800",
    "avg3MPerPyeong": 4509,
    "avg3MTxCount": 25,
    "recent": [
      {
        "date": "05.13",
        "priceEok": "12억5,000",
        "areaPyeong": 28.1325,
        "floor": 6,
        "area": 69.98
      },
      {
        "date": "05.10",
        "priceEok": "15억",
        "areaPyeong": 33.275,
        "floor": 15,
        "area": 84.94
      },
      {
        "date": "05.09",
        "priceEok": "12억6,000",
        "areaPyeong": 25.7125,
        "floor": 16,
        "area": 59.95
      },
      {
        "date": "05.09",
        "priceEok": "14억",
        "areaPyeong": 33.275,
        "floor": 10,
        "area": 84.98
      }
    ],
    "rentTxCount": 35,
    "latestRentDeposit": 54000,
    "latestRentDepositEok": "5억4,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260508",
    "avg1MRentDeposit": 54800,
    "avg1MRentDepositEok": "5억4,800",
    "avg3MRentDeposit": 54200,
    "avg3MRentDepositEok": "5억4,200"
  },
  "동탄역반도유보라아이비파크8.0": {
    "dong": "여울동",
    "latestPrice": 125000,
    "latestPriceEok": "12억5,000",
    "latestArea": 31.46,
    "latestFloor": 35,
    "latestDate": "20260509",
    "maxPrice": 133000,
    "maxPriceEok": "13억3,000",
    "minPrice": 109000,
    "minPriceEok": "10억9,000",
    "txCount": 16,
    "avg1MPrice": 120900,
    "avg1MPriceEok": "12억900",
    "avg1MPerPyeong": 3724,
    "avg1MTxCount": 8,
    "avg3MPrice": 120900,
    "avg3MPriceEok": "12억900",
    "avg3MPerPyeong": 3716,
    "avg3MTxCount": 16,
    "recent": [
      {
        "date": "05.09",
        "priceEok": "12억5,000",
        "areaPyeong": 31.46,
        "floor": 35,
        "area": 73.6524
      },
      {
        "date": "05.09",
        "priceEok": "13억1,300",
        "areaPyeong": 35.9975,
        "floor": 12,
        "area": 86.2318
      },
      {
        "date": "05.02",
        "priceEok": "12억2,000",
        "areaPyeong": 31.46,
        "floor": 10,
        "area": 73.6524
      },
      {
        "date": "05.01",
        "priceEok": "12억",
        "areaPyeong": 31.1575,
        "floor": 10,
        "area": 73.4311
      }
    ],
    "rentTxCount": 6,
    "latestRentDeposit": 2000,
    "latestRentDepositEok": "2,000만",
    "latestRentMonthly": 75,
    "latestRentDate": "20260406",
    "avg1MRentDeposit": 18400,
    "avg1MRentDepositEok": "1억8,400",
    "avg3MRentDeposit": 44100,
    "avg3MRentDepositEok": "4억4,100"
  },
  "동탄숲속마을모아미래도1단지": {
    "dong": "능동",
    "latestPrice": 52800,
    "latestPriceEok": "5억2,800",
    "latestArea": 25.41,
    "latestFloor": 5,
    "latestDate": "20260514",
    "maxPrice": 65000,
    "maxPriceEok": "6억5,000",
    "minPrice": 46500,
    "minPriceEok": "4억6,500",
    "txCount": 24,
    "avg1MPrice": 53400,
    "avg1MPriceEok": "5억3,400",
    "avg1MPerPyeong": 2186,
    "avg1MTxCount": 8,
    "avg3MPrice": 53700,
    "avg3MPriceEok": "5억3,700",
    "avg3MPerPyeong": 2085,
    "avg3MTxCount": 24,
    "recent": [
      {
        "date": "05.14",
        "priceEok": "5억2,800",
        "areaPyeong": 25.41,
        "floor": 5,
        "area": 60.49
      },
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
      }
    ],
    "rentTxCount": 9,
    "latestRentDeposit": 26600,
    "latestRentDepositEok": "2억6,600",
    "latestRentMonthly": 0,
    "latestRentDate": "20260502",
    "avg1MRentDeposit": 27000,
    "avg1MRentDepositEok": "2억7,000",
    "avg3MRentDeposit": 28300,
    "avg3MRentDepositEok": "2억8,300"
  },
  "동탄레이크자연앤푸르지오": {
    "dong": "장지동",
    "latestPrice": 85000,
    "latestPriceEok": "8억5,000",
    "latestArea": 32.3675,
    "latestFloor": 2,
    "latestDate": "20260509",
    "maxPrice": 109000,
    "maxPriceEok": "10억9,000",
    "minPrice": 85000,
    "minPriceEok": "8억5,000",
    "txCount": 14,
    "avg1MPrice": 94300,
    "avg1MPriceEok": "9억4,300",
    "avg1MPerPyeong": 2807,
    "avg1MTxCount": 5,
    "avg3MPrice": 92200,
    "avg3MPriceEok": "9억2,200",
    "avg3MPerPyeong": 2804,
    "avg3MTxCount": 14,
    "recent": [
      {
        "date": "05.09",
        "priceEok": "8억5,000",
        "areaPyeong": 32.3675,
        "floor": 2,
        "area": 84.7984
      },
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
      }
    ],
    "rentTxCount": 14,
    "latestRentDeposit": 20000,
    "latestRentDepositEok": "2억",
    "latestRentMonthly": 119,
    "latestRentDate": "20260508",
    "avg1MRentDeposit": 53000,
    "avg1MRentDepositEok": "5억3,000",
    "avg3MRentDeposit": 52200,
    "avg3MRentDepositEok": "5억2,200"
  },
  "동탄2하우스디더레이크": {
    "dong": "",
    "latestPrice": 79200,
    "latestPriceEok": "7억9,200",
    "latestArea": 24.502499999999998,
    "latestFloor": 15,
    "latestDate": "20260509",
    "maxPrice": 91500,
    "maxPriceEok": "9억1,500",
    "minPrice": 68000,
    "minPriceEok": "6억8,000",
    "txCount": 34,
    "avg1MPrice": 78100,
    "avg1MPriceEok": "7억8,100",
    "avg1MPerPyeong": 2942,
    "avg1MTxCount": 8,
    "avg3MPrice": 76700,
    "avg3MPriceEok": "7억6,700",
    "avg3MPerPyeong": 2980,
    "avg3MTxCount": 34,
    "recent": [
      {
        "date": "05.09",
        "priceEok": "7억9,200",
        "areaPyeong": 24.502499999999998,
        "floor": 15,
        "area": 59.99
      },
      {
        "date": "05.07",
        "priceEok": "7억7,900",
        "areaPyeong": 24.502499999999998,
        "floor": 22,
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
      }
    ],
    "rentTxCount": 27,
    "latestRentDeposit": 2000,
    "latestRentDepositEok": "2,000만",
    "latestRentMonthly": 150,
    "latestRentDate": "20260504",
    "avg1MRentDeposit": 41700,
    "avg1MRentDepositEok": "4억1,700",
    "avg3MRentDeposit": 39800,
    "avg3MRentDepositEok": "3억9,800"
  },
  "동탄2아이파크2단지": {
    "dong": "",
    "latestPrice": 52000,
    "latestPriceEok": "5억2,000",
    "latestArea": 38.115,
    "latestFloor": 2,
    "latestDate": "20260509",
    "maxPrice": 59500,
    "maxPriceEok": "5억9,500",
    "minPrice": 50400,
    "minPriceEok": "5억400",
    "txCount": 10,
    "avg1MPrice": 51600,
    "avg1MPriceEok": "5억1,600",
    "avg1MPerPyeong": 1486,
    "avg1MTxCount": 3,
    "avg3MPrice": 53400,
    "avg3MPriceEok": "5억3,400",
    "avg3MPerPyeong": 1539,
    "avg3MTxCount": 10,
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
    "rentTxCount": 8,
    "latestRentDeposit": 36000,
    "latestRentDepositEok": "3억6,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260427",
    "avg1MRentDeposit": 36200,
    "avg1MRentDepositEok": "3억6,200",
    "avg3MRentDeposit": 34300,
    "avg3MRentDepositEok": "3억4,300"
  },
  "동탄2신도시호반베르디움33단지": {
    "dong": "장지동",
    "latestPrice": 49000,
    "latestPriceEok": "4억9,000",
    "latestArea": 31.1575,
    "latestFloor": 7,
    "latestDate": "20260513",
    "maxPrice": 53200,
    "maxPriceEok": "5억3,200",
    "minPrice": 42900,
    "minPriceEok": "4억2,900",
    "txCount": 13,
    "avg1MPrice": 49000,
    "avg1MPriceEok": "4억9,000",
    "avg1MPerPyeong": 1531,
    "avg1MTxCount": 7,
    "avg3MPrice": 48900,
    "avg3MPriceEok": "4억8,900",
    "avg3MPerPyeong": 1512,
    "avg3MTxCount": 13,
    "recent": [
      {
        "date": "05.13",
        "priceEok": "4억9,000",
        "areaPyeong": 31.1575,
        "floor": 7,
        "area": 76.7676
      },
      {
        "date": "05.09",
        "priceEok": "4억9,000",
        "areaPyeong": 31.1575,
        "floor": 10,
        "area": 76.7676
      },
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
      }
    ],
    "rentTxCount": 3,
    "latestRentDeposit": 5000,
    "latestRentDepositEok": "5,000만",
    "latestRentMonthly": 150,
    "latestRentDate": "20260414",
    "avg1MRentDeposit": 37700,
    "avg1MRentDepositEok": "3억7,700",
    "avg3MRentDeposit": 34900,
    "avg3MRentDepositEok": "3억4,900"
  },
  "동탄2신도시베라체": {
    "dong": "목동",
    "latestPrice": 52500,
    "latestPriceEok": "5억2,500",
    "latestArea": 24.2,
    "latestFloor": 15,
    "latestDate": "20260514",
    "maxPrice": 63000,
    "maxPriceEok": "6억3,000",
    "minPrice": 47300,
    "minPriceEok": "4억7,300",
    "txCount": 28,
    "avg1MPrice": 53600,
    "avg1MPriceEok": "5억3,600",
    "avg1MPerPyeong": 2033,
    "avg1MTxCount": 9,
    "avg3MPrice": 53400,
    "avg3MPriceEok": "5억3,400",
    "avg3MPerPyeong": 1960,
    "avg3MTxCount": 28,
    "recent": [
      {
        "date": "05.14",
        "priceEok": "5억2,500",
        "areaPyeong": 24.2,
        "floor": 15,
        "area": 59.99
      },
      {
        "date": "05.09",
        "priceEok": "5억4,800",
        "areaPyeong": 30.25,
        "floor": 19,
        "area": 74.97
      },
      {
        "date": "05.09",
        "priceEok": "6억3,000",
        "areaPyeong": 34.1825,
        "floor": 15,
        "area": 84.98
      },
      {
        "date": "05.06",
        "priceEok": "5억500",
        "areaPyeong": 24.2,
        "floor": 3,
        "area": 59.99
      }
    ],
    "rentTxCount": 14,
    "latestRentDeposit": 35700,
    "latestRentDepositEok": "3억5,700",
    "latestRentMonthly": 0,
    "latestRentDate": "20260504",
    "avg1MRentDeposit": 32200,
    "avg1MRentDepositEok": "3억2,200",
    "avg3MRentDeposit": 34500,
    "avg3MRentDepositEok": "3억4,500"
  },
  "금호어울림레이크": {
    "dong": "",
    "latestPrice": 70800,
    "latestPriceEok": "7억800",
    "latestArea": 24.502499999999998,
    "latestFloor": 14,
    "latestDate": "20260509",
    "maxPrice": 84000,
    "maxPriceEok": "8억4,000",
    "minPrice": 59700,
    "minPriceEok": "5억9,700",
    "txCount": 38,
    "avg1MPrice": 70800,
    "avg1MPriceEok": "7억800",
    "avg1MPerPyeong": 2663,
    "avg1MTxCount": 18,
    "avg3MPrice": 69700,
    "avg3MPriceEok": "6억9,700",
    "avg3MPerPyeong": 2682,
    "avg3MTxCount": 38,
    "recent": [
      {
        "date": "05.09",
        "priceEok": "7억800",
        "areaPyeong": 24.502499999999998,
        "floor": 14,
        "area": 59.93
      },
      {
        "date": "05.09",
        "priceEok": "8억",
        "areaPyeong": 30.5525,
        "floor": 8,
        "area": 74.97
      },
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
      }
    ],
    "rentTxCount": 22,
    "latestRentDeposit": 40000,
    "latestRentDepositEok": "4억",
    "latestRentMonthly": 0,
    "latestRentDate": "20260506",
    "avg1MRentDeposit": 39200,
    "avg1MRentDepositEok": "3억9,200",
    "avg3MRentDeposit": 36700,
    "avg3MRentDepositEok": "3억6,700"
  },
  "그린힐반도유보라아이비파크101단지": {
    "dong": "산척동",
    "latestPrice": 47300,
    "latestPriceEok": "4억7,300",
    "latestArea": 29.645,
    "latestFloor": 5,
    "latestDate": "20260515",
    "maxPrice": 50200,
    "maxPriceEok": "5억200",
    "minPrice": 39000,
    "minPriceEok": "3억9,000",
    "txCount": 37,
    "avg1MPrice": 43300,
    "avg1MPriceEok": "4억3,300",
    "avg1MPerPyeong": 1631,
    "avg1MTxCount": 16,
    "avg3MPrice": 43600,
    "avg3MPriceEok": "4억3,600",
    "avg3MPerPyeong": 1639,
    "avg3MTxCount": 37,
    "recent": [
      {
        "date": "05.15",
        "priceEok": "4억7,300",
        "areaPyeong": 29.645,
        "floor": 5,
        "area": 74.1263
      },
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
      }
    ],
    "rentTxCount": 17,
    "latestRentDeposit": 3000,
    "latestRentDepositEok": "3,000만",
    "latestRentMonthly": 120,
    "latestRentDate": "20260506",
    "avg1MRentDeposit": 31600,
    "avg1MRentDepositEok": "3억1,600",
    "avg3MRentDeposit": 29900,
    "avg3MRentDepositEok": "2억9,900"
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
    "minPrice": 69500,
    "minPriceEok": "6억9,500",
    "txCount": 8,
    "avg1MPrice": 78800,
    "avg1MPriceEok": "7억8,800",
    "avg1MPerPyeong": 2305,
    "avg1MTxCount": 5,
    "avg3MPrice": 77200,
    "avg3MPriceEok": "7억7,200",
    "avg3MPerPyeong": 2278,
    "avg3MTxCount": 8,
    "recent": [
      {
        "date": "05.08",
        "priceEok": "8억500",
        "areaPyeong": 34.189337105,
        "floor": 6,
        "area": 84.9794
      },
      {
        "date": "05.08",
        "priceEok": "7억7,400",
        "areaPyeong": 34.189337105,
        "floor": 7,
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
      }
    ],
    "rentTxCount": 15,
    "latestRentDeposit": 50000,
    "latestRentDepositEok": "5억",
    "latestRentMonthly": 0,
    "latestRentDate": "20260502",
    "avg1MRentDeposit": 45800,
    "avg1MRentDepositEok": "4억5,800",
    "avg3MRentDeposit": 44500,
    "avg3MRentDepositEok": "4억4,500"
  },
  "레이크힐반도유보라아이비파크10.2": {
    "dong": "",
    "latestPrice": 51900,
    "latestPriceEok": "5억1,900",
    "latestArea": 34.197262907500004,
    "latestFloor": 4,
    "latestDate": "20260508",
    "maxPrice": 59800,
    "maxPriceEok": "5억9,800",
    "minPrice": 49000,
    "minPriceEok": "4억9,000",
    "txCount": 38,
    "avg1MPrice": 53700,
    "avg1MPriceEok": "5억3,700",
    "avg1MPerPyeong": 1479,
    "avg1MTxCount": 13,
    "avg3MPrice": 53500,
    "avg3MPriceEok": "5억3,500",
    "avg3MPerPyeong": 1471,
    "avg3MTxCount": 38,
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
    "rentTxCount": 19,
    "latestRentDeposit": 36000,
    "latestRentDepositEok": "3억6,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260501",
    "avg1MRentDeposit": 36000,
    "avg1MRentDepositEok": "3억6,000",
    "avg3MRentDeposit": 36000,
    "avg3MRentDepositEok": "3억6,000"
  },
  "동탄역헤리엇": {
    "dong": "여울동",
    "latestPrice": 103000,
    "latestPriceEok": "10억3,000",
    "latestArea": 39.1479524975,
    "latestFloor": 5,
    "latestDate": "20260508",
    "maxPrice": 113000,
    "maxPriceEok": "11억3,000",
    "minPrice": 95000,
    "minPriceEok": "9억5,000",
    "txCount": 10,
    "avg1MPrice": 105900,
    "avg1MPriceEok": "10억5,900",
    "avg1MPerPyeong": 2703,
    "avg1MTxCount": 6,
    "avg3MPrice": 102200,
    "avg3MPriceEok": "10억2,200",
    "avg3MPerPyeong": 2606,
    "avg3MTxCount": 10,
    "recent": [
      {
        "date": "05.08",
        "priceEok": "10억3,000",
        "areaPyeong": 39.1479524975,
        "floor": 5,
        "area": 97.3043
      },
      {
        "date": "05.07",
        "priceEok": "10억3,000",
        "areaPyeong": 39.1479524975,
        "floor": 5,
        "area": 97.3043
      },
      {
        "date": "05.01",
        "priceEok": "11억2,000",
        "areaPyeong": 39.1479524975,
        "floor": 10,
        "area": 97.3043
      },
      {
        "date": "04.24",
        "priceEok": "11억3,000",
        "areaPyeong": 39.1479524975,
        "floor": 14,
        "area": 97.3043
      }
    ],
    "rentTxCount": 2,
    "latestRentDeposit": 60000,
    "latestRentDepositEok": "6억",
    "latestRentMonthly": 0,
    "latestRentDate": "20260321",
    "avg1MRentDeposit": 60000,
    "avg1MRentDepositEok": "6억",
    "avg3MRentDeposit": 45000,
    "avg3MRentDepositEok": "4억5,000"
  },
  "동탄역신안인스빌리베라1차": {
    "dong": "청계동",
    "latestPrice": 81800,
    "latestPriceEok": "8억1,800",
    "latestArea": 39.93,
    "latestFloor": 4,
    "latestDate": "20260508",
    "maxPrice": 83800,
    "maxPriceEok": "8억3,800",
    "minPrice": 71800,
    "minPriceEok": "7억1,800",
    "txCount": 8,
    "avg1MPrice": 77000,
    "avg1MPriceEok": "7억7,000",
    "avg1MPerPyeong": 2216,
    "avg1MTxCount": 5,
    "avg3MPrice": 78200,
    "avg3MPriceEok": "7억8,200",
    "avg3MPerPyeong": 2181,
    "avg3MTxCount": 8,
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
    "rentTxCount": 10,
    "latestRentDeposit": 58000,
    "latestRentDepositEok": "5억8,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260429",
    "avg1MRentDeposit": 56500,
    "avg1MRentDepositEok": "5억6,500",
    "avg3MRentDeposit": 51300,
    "avg3MRentDepositEok": "5억1,300"
  },
  "동탄역시범리슈빌아파트": {
    "dong": "",
    "latestPrice": 123800,
    "latestPriceEok": "12억3,800",
    "latestArea": 33.879999999999995,
    "latestFloor": 19,
    "latestDate": "20260508",
    "maxPrice": 127000,
    "maxPriceEok": "12억7,000",
    "minPrice": 116700,
    "minPriceEok": "11억6,700",
    "txCount": 10,
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
    "rentTxCount": 16,
    "latestRentDeposit": 70000,
    "latestRentDepositEok": "7억",
    "latestRentMonthly": 0,
    "latestRentDate": "20260430",
    "avg1MRentDeposit": 60000,
    "avg1MRentDepositEok": "6억",
    "avg3MRentDeposit": 55600,
    "avg3MRentDepositEok": "5억5,600"
  },
  "동탄역센트럴자이A-10": {
    "dong": "",
    "latestPrice": 103000,
    "latestPriceEok": "10억3,000",
    "latestArea": 29.645,
    "latestFloor": 9,
    "latestDate": "20260508",
    "maxPrice": 110000,
    "maxPriceEok": "11억",
    "minPrice": 97500,
    "minPriceEok": "9억7,500",
    "txCount": 11,
    "avg1MPrice": 102600,
    "avg1MPriceEok": "10억2,600",
    "avg1MPerPyeong": 3325,
    "avg1MTxCount": 4,
    "avg3MPrice": 102100,
    "avg3MPriceEok": "10억2,100",
    "avg3MPerPyeong": 3158,
    "avg3MTxCount": 11,
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
    "rentTxCount": 7,
    "latestRentDeposit": 47000,
    "latestRentDepositEok": "4억7,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260506",
    "avg1MRentDeposit": 47100,
    "avg1MRentDepositEok": "4억7,100",
    "avg3MRentDeposit": 45600,
    "avg3MRentDepositEok": "4억5,600"
  },
  "동탄시범다은마을월드메르디앙반도유보라": {
    "dong": "반송동",
    "latestPrice": 92000,
    "latestPriceEok": "9억2,000",
    "latestArea": 35.089999999999996,
    "latestFloor": 20,
    "latestDate": "20260512",
    "maxPrice": 95000,
    "maxPriceEok": "9억5,000",
    "minPrice": 63800,
    "minPriceEok": "6억3,800",
    "txCount": 34,
    "avg1MPrice": 80600,
    "avg1MPriceEok": "8억600",
    "avg1MPerPyeong": 2722,
    "avg1MTxCount": 13,
    "avg3MPrice": 78800,
    "avg3MPriceEok": "7억8,800",
    "avg3MPerPyeong": 2691,
    "avg3MTxCount": 34,
    "recent": [
      {
        "date": "05.12",
        "priceEok": "9억2,000",
        "areaPyeong": 35.089999999999996,
        "floor": 20,
        "area": 84.65
      },
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
      }
    ],
    "rentTxCount": 13,
    "latestRentDeposit": 42000,
    "latestRentDepositEok": "4억2,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260428",
    "avg1MRentDeposit": 44600,
    "avg1MRentDepositEok": "4억4,600",
    "avg3MRentDeposit": 43800,
    "avg3MRentDepositEok": "4억3,800"
  },
  "동탄시범다은마을메타역롯데캐슬": {
    "dong": "",
    "latestPrice": 72000,
    "latestPriceEok": "7억2,000",
    "latestArea": 32.9725,
    "latestFloor": 4,
    "latestDate": "20260508",
    "maxPrice": 84300,
    "maxPriceEok": "8억4,300",
    "minPrice": 70500,
    "minPriceEok": "7억500",
    "txCount": 13,
    "avg1MPrice": 76600,
    "avg1MPriceEok": "7억6,600",
    "avg1MPerPyeong": 2190,
    "avg1MTxCount": 6,
    "avg3MPrice": 76800,
    "avg3MPriceEok": "7억6,800",
    "avg3MPerPyeong": 2206,
    "avg3MTxCount": 13,
    "recent": [
      {
        "date": "05.08",
        "priceEok": "7억2,000",
        "areaPyeong": 32.9725,
        "floor": 4,
        "area": 84.504
      },
      {
        "date": "05.08",
        "priceEok": "7억9,300",
        "areaPyeong": 39.324999999999996,
        "floor": 5,
        "area": 103.295
      },
      {
        "date": "05.07",
        "priceEok": "8억4,300",
        "areaPyeong": 39.324999999999996,
        "floor": 11,
        "area": 103.295
      },
      {
        "date": "05.04",
        "priceEok": "7억5,000",
        "areaPyeong": 32.9725,
        "floor": 5,
        "area": 84.504
      }
    ],
    "rentTxCount": 3,
    "latestRentDeposit": 53000,
    "latestRentDepositEok": "5억3,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260408",
    "avg1MRentDeposit": 53000,
    "avg1MRentDepositEok": "5억3,000",
    "avg3MRentDeposit": 44400,
    "avg3MRentDepositEok": "4억4,400"
  },
  "동탄숲속마을광명메이루즈": {
    "dong": "",
    "latestPrice": 55000,
    "latestPriceEok": "5억5,000",
    "latestArea": 31.7625,
    "latestFloor": 3,
    "latestDate": "20260508",
    "maxPrice": 67700,
    "maxPriceEok": "6억7,700",
    "minPrice": 55000,
    "minPriceEok": "5억5,000",
    "txCount": 7,
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
    "rentTxCount": 4,
    "latestRentDeposit": 37000,
    "latestRentDepositEok": "3억7,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260502",
    "avg1MRentDeposit": 36000,
    "avg1MRentDepositEok": "3억6,000",
    "avg3MRentDeposit": 36000,
    "avg3MRentDepositEok": "3억6,000"
  },
  "동탄2디에트르포레": {
    "dong": "신동",
    "latestPrice": 44400,
    "latestPriceEok": "4억4,400",
    "latestArea": 24.2,
    "latestFloor": 13,
    "latestDate": "20260514",
    "maxPrice": 47000,
    "maxPriceEok": "4억7,000",
    "minPrice": 33000,
    "minPriceEok": "3억3,000",
    "txCount": 41,
    "avg1MPrice": 42100,
    "avg1MPriceEok": "4억2,100",
    "avg1MPerPyeong": 1816,
    "avg1MTxCount": 12,
    "avg3MPrice": 42200,
    "avg3MPriceEok": "4억2,200",
    "avg3MPerPyeong": 1783,
    "avg3MTxCount": 41,
    "recent": [
      {
        "date": "05.14",
        "priceEok": "4억4,400",
        "areaPyeong": 24.2,
        "floor": 13,
        "area": 55.97
      },
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
      }
    ],
    "rentTxCount": 10,
    "latestRentDeposit": 5000,
    "latestRentDepositEok": "5,000만",
    "latestRentMonthly": 120,
    "latestRentDate": "20260506",
    "avg1MRentDeposit": 27500,
    "avg1MRentDepositEok": "2억7,500",
    "avg3MRentDeposit": 25800,
    "avg3MRentDepositEok": "2억5,800"
  },
  "능동마을이지더원": {
    "dong": "",
    "latestPrice": 59500,
    "latestPriceEok": "5억9,500",
    "latestArea": 30.25,
    "latestFloor": 14,
    "latestDate": "20260508",
    "maxPrice": 61500,
    "maxPriceEok": "6억1,500",
    "minPrice": 51000,
    "minPriceEok": "5억1,000",
    "txCount": 14,
    "avg1MPrice": 56900,
    "avg1MPriceEok": "5억6,900",
    "avg1MPerPyeong": 1826,
    "avg1MTxCount": 5,
    "avg3MPrice": 56000,
    "avg3MPriceEok": "5억6,000",
    "avg3MPerPyeong": 1811,
    "avg3MTxCount": 14,
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
    "rentTxCount": 7,
    "latestRentDeposit": 37000,
    "latestRentDepositEok": "3억7,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260416",
    "avg1MRentDeposit": 37000,
    "avg1MRentDepositEok": "3억7,000",
    "avg3MRentDeposit": 34500,
    "avg3MRentDepositEok": "3억4,500"
  },
  "나루마을월드메르디앙반도유보라": {
    "dong": "",
    "latestPrice": 62000,
    "latestPriceEok": "6억2,000",
    "latestArea": 51.425,
    "latestFloor": 8,
    "latestDate": "20260508",
    "maxPrice": 107000,
    "maxPriceEok": "10억7,000",
    "minPrice": 62000,
    "minPriceEok": "6억2,000",
    "txCount": 11,
    "avg1MPrice": 83100,
    "avg1MPriceEok": "8억3,100",
    "avg1MPerPyeong": 1693,
    "avg1MTxCount": 4,
    "avg3MPrice": 80100,
    "avg3MPriceEok": "8억100",
    "avg3MPerPyeong": 1745,
    "avg3MTxCount": 11,
    "recent": [
      {
        "date": "05.08",
        "priceEok": "6억2,000",
        "areaPyeong": 51.425,
        "floor": 8,
        "area": 139.4524
      },
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
      }
    ],
    "rentTxCount": 4,
    "latestRentDeposit": 40000,
    "latestRentDepositEok": "4억",
    "latestRentMonthly": 0,
    "latestRentDate": "20260410",
    "avg1MRentDeposit": 40000,
    "avg1MRentDepositEok": "4억",
    "avg3MRentDeposit": 54100,
    "avg3MRentDepositEok": "5억4,100"
  },
  "동탄파크푸르지오": {
    "dong": "영천동",
    "latestPrice": 59800,
    "latestPriceEok": "5억9,800",
    "latestArea": 34.165439,
    "latestFloor": 7,
    "latestDate": "20260514",
    "maxPrice": 60800,
    "maxPriceEok": "6억800",
    "minPrice": 50300,
    "minPriceEok": "5억300",
    "txCount": 20,
    "avg1MPrice": 57300,
    "avg1MPriceEok": "5억7,300",
    "avg1MPerPyeong": 1677,
    "avg1MTxCount": 6,
    "avg3MPrice": 56400,
    "avg3MPriceEok": "5억6,400",
    "avg3MPerPyeong": 1714,
    "avg3MTxCount": 20,
    "recent": [
      {
        "date": "05.14",
        "priceEok": "5억9,800",
        "areaPyeong": 34.165439,
        "floor": 7,
        "area": 84.92
      },
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
      }
    ],
    "rentTxCount": 20,
    "latestRentDeposit": 40000,
    "latestRentDepositEok": "4억",
    "latestRentMonthly": 0,
    "latestRentDate": "20260508",
    "avg1MRentDeposit": 41600,
    "avg1MRentDepositEok": "4억1,600",
    "avg3MRentDeposit": 39200,
    "avg3MRentDepositEok": "3억9,200"
  },
  "동탄호수자이파밀리에": {
    "dong": "장지동",
    "latestPrice": 47000,
    "latestPriceEok": "4억7,000",
    "latestArea": 20.820318750000002,
    "latestFloor": 9,
    "latestDate": "20260507",
    "maxPrice": 73900,
    "maxPriceEok": "7억3,900",
    "minPrice": 46000,
    "minPriceEok": "4억6,000",
    "txCount": 32,
    "avg1MPrice": 61900,
    "avg1MPriceEok": "6억1,900",
    "avg1MPerPyeong": 2348,
    "avg1MTxCount": 10,
    "avg3MPrice": 56800,
    "avg3MPriceEok": "5억6,800",
    "avg3MPerPyeong": 2335,
    "avg3MTxCount": 32,
    "recent": [
      {
        "date": "05.07",
        "priceEok": "4억7,000",
        "areaPyeong": 20.820318750000002,
        "floor": 9,
        "area": 51.75
      },
      {
        "date": "05.06",
        "priceEok": "7억",
        "areaPyeong": 30.130119250000003,
        "floor": 15,
        "area": 74.89
      },
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
      }
    ],
    "rentTxCount": 34,
    "latestRentDeposit": 31500,
    "latestRentDepositEok": "3억1,500",
    "latestRentMonthly": 0,
    "latestRentDate": "20260507",
    "avg1MRentDeposit": 37200,
    "avg1MRentDepositEok": "3억7,200",
    "avg3MRentDeposit": 35500,
    "avg3MRentDepositEok": "3억5,500"
  },
  "동탄파크한양수자인": {
    "dong": "영천동",
    "latestPrice": 47000,
    "latestPriceEok": "4억7,000",
    "latestArea": 25.41,
    "latestFloor": 4,
    "latestDate": "20260515",
    "maxPrice": 51600,
    "maxPriceEok": "5억1,600",
    "minPrice": 37500,
    "minPriceEok": "3억7,500",
    "txCount": 30,
    "avg1MPrice": 44600,
    "avg1MPriceEok": "4억4,600",
    "avg1MPerPyeong": 1750,
    "avg1MTxCount": 14,
    "avg3MPrice": 44000,
    "avg3MPriceEok": "4억4,000",
    "avg3MPerPyeong": 1711,
    "avg3MTxCount": 30,
    "recent": [
      {
        "date": "05.15",
        "priceEok": "4억7,000",
        "areaPyeong": 25.41,
        "floor": 4,
        "area": 59.73
      },
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
      }
    ],
    "rentTxCount": 11,
    "latestRentDeposit": 33000,
    "latestRentDepositEok": "3억3,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260426",
    "avg1MRentDeposit": 34400,
    "avg1MRentDepositEok": "3억4,400",
    "avg3MRentDeposit": 31100,
    "avg3MRentDepositEok": "3억1,100"
  },
  "한신더휴": {
    "dong": "",
    "latestPrice": 74500,
    "latestPriceEok": "7억4,500",
    "latestArea": 33.6942761925,
    "latestFloor": 6,
    "latestDate": "20260504",
    "maxPrice": 75000,
    "maxPriceEok": "7억5,000",
    "minPrice": 65000,
    "minPriceEok": "6억5,000",
    "txCount": 20,
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
    "rentTxCount": 15,
    "latestRentDeposit": 5000,
    "latestRentDepositEok": "5,000만",
    "latestRentMonthly": 158,
    "latestRentDate": "20260507",
    "avg1MRentDeposit": 40600,
    "avg1MRentDepositEok": "4억600",
    "avg3MRentDeposit": 39500,
    "avg3MRentDepositEok": "3억9,500"
  },
  "레이크반도유보라아이비파크9.0": {
    "dong": "장지동",
    "latestPrice": 59500,
    "latestPriceEok": "5억9,500",
    "latestArea": 41.036345350000005,
    "latestFloor": 12,
    "latestDate": "20260429",
    "maxPrice": 67500,
    "maxPriceEok": "6억7,500",
    "minPrice": 59500,
    "minPriceEok": "5억9,500",
    "txCount": 10,
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
    "rentTxCount": 14,
    "latestRentDeposit": 40000,
    "latestRentDepositEok": "4억",
    "latestRentMonthly": 0,
    "latestRentDate": "20260507",
    "avg1MRentDeposit": 39400,
    "avg1MRentDepositEok": "3억9,400",
    "avg3MRentDeposit": 38700,
    "avg3MRentDepositEok": "3억8,700"
  },
  "호수공원역센트럴시티": {
    "dong": "산척동",
    "latestPrice": 98000,
    "latestPriceEok": "9억8,000",
    "latestArea": 34.004509,
    "latestFloor": 15,
    "latestDate": "20260509",
    "maxPrice": 98000,
    "maxPriceEok": "9억8,000",
    "minPrice": 68800,
    "minPriceEok": "6억8,800",
    "txCount": 30,
    "avg1MPrice": 88500,
    "avg1MPriceEok": "8억8,500",
    "avg1MPerPyeong": 2687,
    "avg1MTxCount": 10,
    "avg3MPrice": 88700,
    "avg3MPriceEok": "8억8,700",
    "avg3MPerPyeong": 2663,
    "avg3MTxCount": 30,
    "recent": [
      {
        "date": "05.09",
        "priceEok": "9억8,000",
        "areaPyeong": 34.004509,
        "floor": 15,
        "area": 84.52
      },
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
      }
    ],
    "rentTxCount": 20,
    "latestRentDeposit": 44100,
    "latestRentDepositEok": "4억4,100",
    "latestRentMonthly": 0,
    "latestRentDate": "20260502",
    "avg1MRentDeposit": 46600,
    "avg1MRentDepositEok": "4억6,600",
    "avg3MRentDeposit": 47300,
    "avg3MRentDepositEok": "4억7,300"
  },
  "포스코더샵2차": {
    "dong": "",
    "latestPrice": 54350,
    "latestPriceEok": "5억4,350",
    "latestArea": 30.791380620000005,
    "latestFloor": 22,
    "latestDate": "20260506",
    "maxPrice": 65600,
    "maxPriceEok": "6억5,600",
    "minPrice": 52500,
    "minPriceEok": "5억2,500",
    "txCount": 21,
    "avg1MPrice": 60100,
    "avg1MPriceEok": "6억100",
    "avg1MPerPyeong": 1859,
    "avg1MTxCount": 4,
    "avg3MPrice": 57800,
    "avg3MPriceEok": "5억7,800",
    "avg3MPerPyeong": 1754,
    "avg3MTxCount": 21,
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
        "date": "04.23",
        "priceEok": "5억6,000",
        "areaPyeong": 30.639663862499997,
        "floor": 23,
        "area": 76.1565
      }
    ],
    "rentTxCount": 4,
    "latestRentDeposit": 5000,
    "latestRentDepositEok": "5,000만",
    "latestRentMonthly": 145,
    "latestRentDate": "20260429",
    "avg1MRentDeposit": 34500,
    "avg1MRentDepositEok": "3억4,500",
    "avg3MRentDeposit": 33500,
    "avg3MRentDepositEok": "3억3,500"
  },
  "시범한빛마을삼부르네상스": {
    "dong": "",
    "latestPrice": 74000,
    "latestPriceEok": "7억4,000",
    "latestArea": 34.1042856,
    "latestFloor": 4,
    "latestDate": "20260506",
    "maxPrice": 82000,
    "maxPriceEok": "8억2,000",
    "minPrice": 66000,
    "minPriceEok": "6억6,000",
    "txCount": 8,
    "avg1MPrice": 73400,
    "avg1MPriceEok": "7억3,400",
    "avg1MPerPyeong": 2154,
    "avg1MTxCount": 5,
    "avg3MPrice": 73100,
    "avg3MPriceEok": "7억3,100",
    "avg3MPerPyeong": 2145,
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
    "rentTxCount": 10,
    "latestRentDeposit": 45000,
    "latestRentDepositEok": "4억5,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260506",
    "avg1MRentDeposit": 42900,
    "avg1MRentDepositEok": "4억2,900",
    "avg3MRentDeposit": 41200,
    "avg3MRentDepositEok": "4억1,200"
  },
  "동탄파크자이": {
    "dong": "",
    "latestPrice": 76000,
    "latestPriceEok": "7억6,000",
    "latestArea": 40.108503435,
    "latestFloor": 5,
    "latestDate": "20260506",
    "maxPrice": 95000,
    "maxPriceEok": "9억5,000",
    "minPrice": 70500,
    "minPriceEok": "7억500",
    "txCount": 21,
    "avg1MPrice": 78700,
    "avg1MPriceEok": "7억8,700",
    "avg1MPerPyeong": 1987,
    "avg1MTxCount": 7,
    "avg3MPrice": 79300,
    "avg3MPriceEok": "7억9,300",
    "avg3MPerPyeong": 1985,
    "avg3MTxCount": 21,
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
    "rentTxCount": 7,
    "latestRentDeposit": 50000,
    "latestRentDepositEok": "5억",
    "latestRentMonthly": 0,
    "latestRentDate": "20260423",
    "avg1MRentDeposit": 50000,
    "avg1MRentDepositEok": "5억",
    "avg3MRentDeposit": 50800,
    "avg3MRentDepositEok": "5억800"
  },
  "동탄역센트럴예미지": {
    "dong": "영천동",
    "latestPrice": 110000,
    "latestPriceEok": "11억",
    "latestArea": 38.72,
    "latestFloor": 25,
    "latestDate": "20260509",
    "maxPrice": 110000,
    "maxPriceEok": "11억",
    "minPrice": 68000,
    "minPriceEok": "6억8,000",
    "txCount": 9,
    "avg1MPrice": 107500,
    "avg1MPriceEok": "10억7,500",
    "avg1MPerPyeong": 2776,
    "avg1MTxCount": 5,
    "avg3MPrice": 98800,
    "avg3MPriceEok": "9억8,800",
    "avg3MPerPyeong": 2625,
    "avg3MTxCount": 9,
    "recent": [
      {
        "date": "05.09",
        "priceEok": "11억",
        "areaPyeong": 38.72,
        "floor": 25,
        "area": 96.9959
      },
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
      }
    ],
    "rentTxCount": 10,
    "latestRentDeposit": 55000,
    "latestRentDepositEok": "5억5,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260430",
    "avg1MRentDeposit": 57400,
    "avg1MRentDepositEok": "5억7,400",
    "avg3MRentDeposit": 54900,
    "avg3MRentDepositEok": "5억4,900"
  },
  "동탄역센트럴상록아파트": {
    "dong": "영천동",
    "latestPrice": 99000,
    "latestPriceEok": "9억9,000",
    "latestArea": 29.645,
    "latestFloor": 21,
    "latestDate": "20260509",
    "maxPrice": 104000,
    "maxPriceEok": "10억4,000",
    "minPrice": 86000,
    "minPriceEok": "8억6,000",
    "txCount": 24,
    "avg1MPrice": 95100,
    "avg1MPriceEok": "9억5,100",
    "avg1MPerPyeong": 3685,
    "avg1MTxCount": 10,
    "avg3MPrice": 94600,
    "avg3MPriceEok": "9억4,600",
    "avg3MPerPyeong": 3640,
    "avg3MTxCount": 24,
    "recent": [
      {
        "date": "05.09",
        "priceEok": "9억9,000",
        "areaPyeong": 29.645,
        "floor": 21,
        "area": 72.35
      },
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
      }
    ],
    "rentTxCount": 24,
    "latestRentDeposit": 5000,
    "latestRentDepositEok": "5,000만",
    "latestRentMonthly": 170,
    "latestRentDate": "20260506",
    "avg1MRentDeposit": 43300,
    "avg1MRentDepositEok": "4억3,300",
    "avg3MRentDeposit": 44300,
    "avg3MRentDepositEok": "4억4,300"
  },
  "동탄역린스트라우스": {
    "dong": "여울동",
    "latestPrice": 145000,
    "latestPriceEok": "14억5,000",
    "latestArea": 37.8125,
    "latestFloor": 39,
    "latestDate": "20260506",
    "maxPrice": 145000,
    "maxPriceEok": "14억5,000",
    "minPrice": 125500,
    "minPriceEok": "12억5,500",
    "txCount": 13,
    "avg1MPrice": 136200,
    "avg1MPriceEok": "13억6,200",
    "avg1MPerPyeong": 3816,
    "avg1MTxCount": 6,
    "avg3MPrice": 134500,
    "avg3MPriceEok": "13억4,500",
    "avg3MPerPyeong": 3873,
    "avg3MTxCount": 13,
    "recent": [
      {
        "date": "05.06",
        "priceEok": "14억5,000",
        "areaPyeong": 37.8125,
        "floor": 39,
        "area": 92.8382
      },
      {
        "date": "05.02",
        "priceEok": "13억",
        "areaPyeong": 34.7875,
        "floor": 10,
        "area": 84.8421
      },
      {
        "date": "05.01",
        "priceEok": "12억9,900",
        "areaPyeong": 30.855,
        "floor": 20,
        "area": 75.0217
      },
      {
        "date": "04.30",
        "priceEok": "13억6,000",
        "areaPyeong": 34.7875,
        "floor": 33,
        "area": 84.8421
      }
    ],
    "rentTxCount": 7,
    "latestRentDeposit": 68000,
    "latestRentDepositEok": "6억8,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260411",
    "avg1MRentDeposit": 68000,
    "avg1MRentDepositEok": "6억8,000",
    "avg3MRentDeposit": 55100,
    "avg3MRentDepositEok": "5억5,100"
  },
  "동탄숲속마을모아미래도2단지": {
    "dong": "",
    "latestPrice": 55000,
    "latestPriceEok": "5억5,000",
    "latestArea": 39.324999999999996,
    "latestFloor": 17,
    "latestDate": "20260506",
    "maxPrice": 58000,
    "maxPriceEok": "5억8,000",
    "minPrice": 52000,
    "minPriceEok": "5억2,000",
    "txCount": 4,
    "avg1MPrice": 55000,
    "avg1MPriceEok": "5억5,000",
    "avg1MPerPyeong": 1399,
    "avg1MTxCount": 1,
    "avg3MPrice": 54800,
    "avg3MPriceEok": "5억4,800",
    "avg3MPerPyeong": 1387,
    "avg3MTxCount": 4,
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
    "rentTxCount": 1,
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
    "maxPrice": 83000,
    "maxPriceEok": "8억3,000",
    "minPrice": 50500,
    "minPriceEok": "5억500",
    "txCount": 11,
    "avg1MPrice": 62400,
    "avg1MPriceEok": "6억2,400",
    "avg1MPerPyeong": 1525,
    "avg1MTxCount": 4,
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
    "rentTxCount": 4,
    "latestRentDeposit": 42000,
    "latestRentDepositEok": "4억2,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260424",
    "avg1MRentDeposit": 42000,
    "avg1MRentDepositEok": "4억2,000",
    "avg3MRentDeposit": 36100,
    "avg3MRentDepositEok": "3억6,100"
  },
  "동탄더레이크팰리스": {
    "dong": "",
    "latestPrice": 120000,
    "latestPriceEok": "12억",
    "latestArea": 48.7025,
    "latestFloor": 20,
    "latestDate": "20260506",
    "maxPrice": 121000,
    "maxPriceEok": "12억1,000",
    "minPrice": 65000,
    "minPriceEok": "6억5,000",
    "txCount": 16,
    "avg1MPrice": 110700,
    "avg1MPriceEok": "11억700",
    "avg1MPerPyeong": 2916,
    "avg1MTxCount": 3,
    "avg3MPrice": 99000,
    "avg3MPriceEok": "9억9,000",
    "avg3MPerPyeong": 2801,
    "avg3MTxCount": 16,
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
    "rentTxCount": 11,
    "latestRentDeposit": 43000,
    "latestRentDepositEok": "4억3,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260427",
    "avg1MRentDeposit": 43000,
    "avg1MRentDepositEok": "4억3,000",
    "avg3MRentDeposit": 50800,
    "avg3MRentDepositEok": "5억800"
  },
  "더샵센트럴시티": {
    "dong": "청계동",
    "latestPrice": 153000,
    "latestPriceEok": "15억3,000",
    "latestArea": 34.1825,
    "latestFloor": 12,
    "latestDate": "20260509",
    "maxPrice": 173500,
    "maxPriceEok": "17억3,500",
    "minPrice": 139000,
    "minPriceEok": "13억9,000",
    "txCount": 10,
    "avg1MPrice": 152900,
    "avg1MPriceEok": "15억2,900",
    "avg1MPerPyeong": 4472,
    "avg1MTxCount": 4,
    "avg3MPrice": 158200,
    "avg3MPriceEok": "15억8,200",
    "avg3MPerPyeong": 4381,
    "avg3MTxCount": 10,
    "recent": [
      {
        "date": "05.09",
        "priceEok": "15억3,000",
        "areaPyeong": 34.1825,
        "floor": 12,
        "area": 84.392
      },
      {
        "date": "05.06",
        "priceEok": "14억4,500",
        "areaPyeong": 34.1825,
        "floor": 1,
        "area": 84.796
      },
      {
        "date": "05.01",
        "priceEok": "15억5,000",
        "areaPyeong": 34.1825,
        "floor": 6,
        "area": 84.796
      },
      {
        "date": "04.25",
        "priceEok": "15억9,000",
        "areaPyeong": 34.1825,
        "floor": 9,
        "area": 84.796
      }
    ],
    "rentTxCount": 22,
    "latestRentDeposit": 10000,
    "latestRentDepositEok": "1억",
    "latestRentMonthly": 280,
    "latestRentDate": "20260411",
    "avg1MRentDeposit": 71100,
    "avg1MRentDepositEok": "7억1,100",
    "avg3MRentDeposit": 71800,
    "avg3MRentDepositEok": "7억1,800"
  },
  "시범다은마을우남퍼스트빌": {
    "dong": "",
    "latestPrice": 69500,
    "latestPriceEok": "6억9,500",
    "latestArea": 26.982368682500006,
    "latestFloor": 11,
    "latestDate": "20260430",
    "maxPrice": 74700,
    "maxPriceEok": "7억4,700",
    "minPrice": 59800,
    "minPriceEok": "5억9,800",
    "txCount": 10,
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
    "rentTxCount": 8,
    "latestRentDeposit": 5000,
    "latestRentDepositEok": "5,000만",
    "latestRentMonthly": 150,
    "latestRentDate": "20260506",
    "avg1MRentDeposit": 37700,
    "avg1MRentDepositEok": "3억7,700",
    "avg3MRentDeposit": 41000,
    "avg3MRentDepositEok": "4억1,000"
  },
  "동탄동원로얄듀크2차": {
    "dong": "목동",
    "latestPrice": 63800,
    "latestPriceEok": "6억3,800",
    "latestArea": 33.5775,
    "latestFloor": 5,
    "latestDate": "20260509",
    "maxPrice": 66700,
    "maxPriceEok": "6억6,700",
    "minPrice": 56500,
    "minPriceEok": "5억6,500",
    "txCount": 17,
    "avg1MPrice": 64500,
    "avg1MPriceEok": "6억4,500",
    "avg1MPerPyeong": 1920,
    "avg1MTxCount": 9,
    "avg3MPrice": 62700,
    "avg3MPriceEok": "6억2,700",
    "avg3MPerPyeong": 1923,
    "avg3MTxCount": 17,
    "recent": [
      {
        "date": "05.09",
        "priceEok": "6억3,800",
        "areaPyeong": 33.5775,
        "floor": 5,
        "area": 84.9889
      },
      {
        "date": "05.08",
        "priceEok": "6억6,000",
        "areaPyeong": 33.5775,
        "floor": 7,
        "area": 84.9889
      },
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
      }
    ],
    "rentTxCount": 9,
    "latestRentDeposit": 50000,
    "latestRentDepositEok": "5억",
    "latestRentMonthly": 0,
    "latestRentDate": "20260506",
    "avg1MRentDeposit": 44800,
    "avg1MRentDepositEok": "4억4,800",
    "avg3MRentDeposit": 41100,
    "avg3MRentDepositEok": "4억1,100"
  },
  "나루마을한화꿈에그린": {
    "dong": "",
    "latestPrice": 74500,
    "latestPriceEok": "7억4,500",
    "latestArea": 36.905,
    "latestFloor": 5,
    "latestDate": "20260423",
    "maxPrice": 86000,
    "maxPriceEok": "8억6,000",
    "minPrice": 74500,
    "minPriceEok": "7억4,500",
    "txCount": 5,
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
    "rentTxCount": 12,
    "latestRentDeposit": 10000,
    "latestRentDepositEok": "1억",
    "latestRentMonthly": 175,
    "latestRentDate": "20260506",
    "avg1MRentDeposit": 47800,
    "avg1MRentDepositEok": "4억7,800",
    "avg3MRentDeposit": 46300,
    "avg3MRentDepositEok": "4억6,300"
  },
  "화성동탄2센트럴힐즈동탄아파트": {
    "dong": "",
    "latestPrice": 57300,
    "latestPriceEok": "5억7,300",
    "latestArea": 34.181532,
    "latestFloor": 14,
    "latestDate": "20260505",
    "maxPrice": 57500,
    "maxPriceEok": "5억7,500",
    "minPrice": 53000,
    "minPriceEok": "5억3,000",
    "txCount": 5,
    "avg1MPrice": 56900,
    "avg1MPriceEok": "5억6,900",
    "avg1MPerPyeong": 1666,
    "avg1MTxCount": 3,
    "avg3MPrice": 55700,
    "avg3MPriceEok": "5억5,700",
    "avg3MPerPyeong": 1671,
    "avg3MTxCount": 5,
    "recent": [
      {
        "date": "05.05",
        "priceEok": "5억7,300",
        "areaPyeong": 34.181532,
        "floor": 14,
        "area": 84.96
      },
      {
        "date": "04.30",
        "priceEok": "5억6,000",
        "areaPyeong": 34.181532,
        "floor": 14,
        "area": 84.96
      },
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
      }
    ],
    "rentTxCount": 2,
    "latestRentDeposit": 5000,
    "latestRentDepositEok": "5,000만",
    "latestRentMonthly": 140,
    "latestRentDate": "20260409",
    "avg1MRentDeposit": 35500,
    "avg1MRentDepositEok": "3억5,500",
    "avg3MRentDeposit": 35500,
    "avg3MRentDepositEok": "3억5,500"
  },
  "서희스타힐스엔에이치에프": {
    "dong": "",
    "latestPrice": 61800,
    "latestPriceEok": "6억1,800",
    "latestArea": 34.18555525,
    "latestFloor": 13,
    "latestDate": "20260505",
    "maxPrice": 63000,
    "maxPriceEok": "6억3,000",
    "minPrice": 55000,
    "minPriceEok": "5억5,000",
    "txCount": 7,
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
    "rentTxCount": 2,
    "latestRentDeposit": 43000,
    "latestRentDepositEok": "4억3,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260321",
    "avg1MRentDeposit": 43000,
    "avg1MRentDepositEok": "4억3,000",
    "avg3MRentDeposit": 40500,
    "avg3MRentDepositEok": "4억500"
  },
  "동탄역이지더원": {
    "dong": "영천동",
    "latestPrice": 70000,
    "latestPriceEok": "7억",
    "latestArea": 24.131131640000003,
    "latestFloor": 6,
    "latestDate": "20260514",
    "maxPrice": 79000,
    "maxPriceEok": "7억9,000",
    "minPrice": 57500,
    "minPriceEok": "5억7,500",
    "txCount": 30,
    "avg1MPrice": 69600,
    "avg1MPriceEok": "6억9,600",
    "avg1MPerPyeong": 2478,
    "avg1MTxCount": 11,
    "avg3MPrice": 66500,
    "avg3MPriceEok": "6억6,500",
    "avg3MPerPyeong": 2437,
    "avg3MTxCount": 30,
    "recent": [
      {
        "date": "05.14",
        "priceEok": "7억",
        "areaPyeong": 24.131131640000003,
        "floor": 6,
        "area": 59.9792
      },
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
      }
    ],
    "rentTxCount": 9,
    "latestRentDeposit": 23000,
    "latestRentDepositEok": "2억3,000",
    "latestRentMonthly": 80,
    "latestRentDate": "20260424",
    "avg1MRentDeposit": 40500,
    "avg1MRentDepositEok": "4억500",
    "avg3MRentDeposit": 39200,
    "avg3MRentDepositEok": "3억9,200"
  },
  "동탄역삼정그린코아": {
    "dong": "",
    "latestPrice": 119000,
    "latestPriceEok": "11억9,000",
    "latestArea": 33.879999999999995,
    "latestFloor": 35,
    "latestDate": "20260505",
    "maxPrice": 129500,
    "maxPriceEok": "12억9,500",
    "minPrice": 112000,
    "minPriceEok": "11억2,000",
    "txCount": 7,
    "avg1MPrice": 120700,
    "avg1MPriceEok": "12억700",
    "avg1MPerPyeong": 3470,
    "avg1MTxCount": 3,
    "avg3MPrice": 118800,
    "avg3MPriceEok": "11억8,800",
    "avg3MPerPyeong": 3426,
    "avg3MTxCount": 7,
    "recent": [
      {
        "date": "05.05",
        "priceEok": "11억9,000",
        "areaPyeong": 33.879999999999995,
        "floor": 35,
        "area": 81.3533
      },
      {
        "date": "04.20",
        "priceEok": "12억5,000",
        "areaPyeong": 36.6025,
        "floor": 5,
        "area": 92.3107
      },
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
  "솔빛마을경남아너스빌": {
    "dong": "",
    "latestPrice": 87500,
    "latestPriceEok": "8억7,500",
    "latestArea": 41.5982726775,
    "latestFloor": 24,
    "latestDate": "20260504",
    "maxPrice": 97000,
    "maxPriceEok": "9억7,000",
    "minPrice": 59500,
    "minPriceEok": "5억9,500",
    "txCount": 8,
    "avg1MPrice": 83500,
    "avg1MPriceEok": "8억3,500",
    "avg1MPerPyeong": 1773,
    "avg1MTxCount": 5,
    "avg3MPrice": 85000,
    "avg3MPriceEok": "8억5,000",
    "avg3MPerPyeong": 1841,
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
        "date": "04.27",
        "priceEok": "5억9,500",
        "areaPyeong": 51.6643637125,
        "floor": 28,
        "area": 128.4145
      },
      {
        "date": "04.24",
        "priceEok": "9억5,250",
        "areaPyeong": 51.6643637125,
        "floor": 25,
        "area": 128.4145
      }
    ],
    "rentTxCount": 6,
    "latestRentDeposit": 62000,
    "latestRentDepositEok": "6억2,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260504",
    "avg1MRentDeposit": 57900,
    "avg1MRentDepositEok": "5억7,900",
    "avg3MRentDeposit": 56900,
    "avg3MRentDepositEok": "5억6,900"
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
    "minPrice": 77500,
    "minPriceEok": "7억7,500",
    "txCount": 8,
    "avg1MPrice": 87000,
    "avg1MPriceEok": "8억7,000",
    "avg1MPerPyeong": 2637,
    "avg1MTxCount": 2,
    "avg3MPrice": 82400,
    "avg3MPriceEok": "8억2,400",
    "avg3MPerPyeong": 2500,
    "avg3MTxCount": 8,
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
    "rentTxCount": 2,
    "latestRentDeposit": 34500,
    "latestRentDepositEok": "3억4,500",
    "latestRentMonthly": 0,
    "latestRentDate": "20260502",
    "avg1MRentDeposit": 34500,
    "avg1MRentDepositEok": "3억4,500",
    "avg3MRentDeposit": 38900,
    "avg3MRentDepositEok": "3억8,900"
  },
  "동탄린스트라우스더레이크": {
    "dong": "",
    "latestPrice": 130800,
    "latestPriceEok": "13억800",
    "latestArea": 42.35,
    "latestFloor": 10,
    "latestDate": "20260501",
    "maxPrice": 167500,
    "maxPriceEok": "16억7,500",
    "minPrice": 110000,
    "minPriceEok": "11억",
    "txCount": 17,
    "avg1MPrice": 129300,
    "avg1MPriceEok": "12억9,300",
    "avg1MPerPyeong": 3125,
    "avg1MTxCount": 3,
    "avg3MPrice": 131200,
    "avg3MPriceEok": "13억1,200",
    "avg3MPerPyeong": 3175,
    "avg3MTxCount": 17,
    "recent": [
      {
        "date": "05.01",
        "priceEok": "13억800",
        "areaPyeong": 42.35,
        "floor": 10,
        "area": 106.9385
      },
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
      }
    ],
    "rentTxCount": 20,
    "latestRentDeposit": 3600,
    "latestRentDepositEok": "3,600만",
    "latestRentMonthly": 360,
    "latestRentDate": "20260504",
    "avg1MRentDeposit": 75100,
    "avg1MRentDepositEok": "7억5,100",
    "avg3MRentDeposit": 74700,
    "avg3MRentDepositEok": "7억4,700"
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
    "minPrice": 68700,
    "minPriceEok": "6억8,700",
    "txCount": 12,
    "avg1MPrice": 77400,
    "avg1MPriceEok": "7억7,400",
    "avg1MPerPyeong": 2354,
    "avg1MTxCount": 3,
    "avg3MPrice": 76400,
    "avg3MPriceEok": "7억6,400",
    "avg3MPerPyeong": 2332,
    "avg3MTxCount": 12,
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
    "rentTxCount": 11,
    "latestRentDeposit": 47000,
    "latestRentDepositEok": "4억7,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260502",
    "avg1MRentDeposit": 45400,
    "avg1MRentDepositEok": "4억5,400",
    "avg3MRentDeposit": 41700,
    "avg3MRentDepositEok": "4억1,700"
  },
  "동탄역시범대원칸타빌아파트": {
    "dong": "청계동",
    "latestPrice": 116000,
    "latestPriceEok": "11억6,000",
    "latestArea": 32.3675,
    "latestFloor": 5,
    "latestDate": "20260505",
    "maxPrice": 125000,
    "maxPriceEok": "12억5,000",
    "minPrice": 107000,
    "minPriceEok": "10억7,000",
    "txCount": 9,
    "avg1MPrice": 113200,
    "avg1MPriceEok": "11억3,200",
    "avg1MPerPyeong": 3484,
    "avg1MTxCount": 5,
    "avg3MPrice": 116700,
    "avg3MPriceEok": "11억6,700",
    "avg3MPerPyeong": 3594,
    "avg3MTxCount": 9,
    "recent": [
      {
        "date": "05.05",
        "priceEok": "11억6,000",
        "areaPyeong": 32.3675,
        "floor": 5,
        "area": 84.786
      },
      {
        "date": "05.02",
        "priceEok": "10억7,000",
        "areaPyeong": 32.67,
        "floor": 2,
        "area": 84.705
      },
      {
        "date": "04.24",
        "priceEok": "11억5,000",
        "areaPyeong": 32.3675,
        "floor": 8,
        "area": 84.786
      },
      {
        "date": "04.24",
        "priceEok": "11억9,000",
        "areaPyeong": 32.67,
        "floor": 16,
        "area": 84.705
      }
    ],
    "rentTxCount": 5,
    "latestRentDeposit": 53550,
    "latestRentDepositEok": "5억3,550",
    "latestRentMonthly": 0,
    "latestRentDate": "20260430",
    "avg1MRentDeposit": 53600,
    "avg1MRentDepositEok": "5억3,600",
    "avg3MRentDeposit": 57200,
    "avg3MRentDepositEok": "5억7,200"
  },
  "동탄역반도유보라아이비파크6.0": {
    "dong": "여울동",
    "latestPrice": 124000,
    "latestPriceEok": "12억4,000",
    "latestArea": 29.645,
    "latestFloor": 21,
    "latestDate": "20260509",
    "maxPrice": 126900,
    "maxPriceEok": "12억6,900",
    "minPrice": 106000,
    "minPriceEok": "10억6,000",
    "txCount": 11,
    "avg1MPrice": 115400,
    "avg1MPriceEok": "11억5,400",
    "avg1MPerPyeong": 4036,
    "avg1MTxCount": 6,
    "avg3MPrice": 112800,
    "avg3MPriceEok": "11억2,800",
    "avg3MPerPyeong": 3923,
    "avg3MTxCount": 11,
    "recent": [
      {
        "date": "05.09",
        "priceEok": "12억4,000",
        "areaPyeong": 29.645,
        "floor": 21,
        "area": 74.3629
      },
      {
        "date": "05.02",
        "priceEok": "11억8,000",
        "areaPyeong": 33.275,
        "floor": 19,
        "area": 84.9885
      },
      {
        "date": "04.25",
        "priceEok": "12억6,900",
        "areaPyeong": 33.275,
        "floor": 21,
        "area": 84.9885
      },
      {
        "date": "04.24",
        "priceEok": "10억8,000",
        "areaPyeong": 23.8975,
        "floor": 20,
        "area": 59.9206
      }
    ],
    "rentTxCount": 8,
    "latestRentDeposit": 57000,
    "latestRentDepositEok": "5억7,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260410",
    "avg1MRentDeposit": 57000,
    "avg1MRentDepositEok": "5억7,000",
    "avg3MRentDeposit": 47800,
    "avg3MRentDepositEok": "4억7,800"
  },
  "솔빛마을서해그랑블": {
    "dong": "",
    "latestPrice": 87500,
    "latestPriceEok": "8억7,500",
    "latestArea": 40.516139125,
    "latestFloor": 20,
    "latestDate": "20260423",
    "maxPrice": 112300,
    "maxPriceEok": "11억2,300",
    "minPrice": 87500,
    "minPriceEok": "8억7,500",
    "txCount": 3,
    "avg1MPrice": 99900,
    "avg1MPriceEok": "9억9,900",
    "avg1MPerPyeong": 2228,
    "avg1MTxCount": 2,
    "avg3MPrice": 96100,
    "avg3MPriceEok": "9억6,100",
    "avg3MPerPyeong": 2213,
    "avg3MTxCount": 3,
    "recent": [
      {
        "date": "04.23",
        "priceEok": "8억7,500",
        "areaPyeong": 40.516139125,
        "floor": 20,
        "area": 100.705
      },
      {
        "date": "04.18",
        "priceEok": "11억2,300",
        "areaPyeong": 48.902603750000004,
        "floor": 10,
        "area": 121.55
      },
      {
        "date": "02.21",
        "priceEok": "8억8,500",
        "areaPyeong": 40.516139125,
        "floor": 7,
        "area": 100.705
      }
    ],
    "rentTxCount": 4,
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
    "dong": "반송동",
    "latestPrice": 57800,
    "latestPriceEok": "5억7,800",
    "latestArea": 32.9725,
    "latestFloor": 27,
    "latestDate": "20260513",
    "maxPrice": 59990,
    "maxPriceEok": "5억9,990",
    "minPrice": 50500,
    "minPriceEok": "5억500",
    "txCount": 8,
    "avg1MPrice": 57200,
    "avg1MPriceEok": "5억7,200",
    "avg1MPerPyeong": 1735,
    "avg1MTxCount": 3,
    "avg3MPrice": 54700,
    "avg3MPriceEok": "5억4,700",
    "avg3MPerPyeong": 1661,
    "avg3MTxCount": 8,
    "recent": [
      {
        "date": "05.13",
        "priceEok": "5억7,800",
        "areaPyeong": 32.9725,
        "floor": 27,
        "area": 81.512
      },
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
      }
    ],
    "rentTxCount": 3,
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
    "maxPrice": 68000,
    "maxPriceEok": "6억8,000",
    "minPrice": 62800,
    "minPriceEok": "6억2,800",
    "txCount": 6,
    "avg1MPrice": 67900,
    "avg1MPriceEok": "6억7,900",
    "avg1MPerPyeong": 1935,
    "avg1MTxCount": 1,
    "avg3MPrice": 66200,
    "avg3MPriceEok": "6억6,200",
    "avg3MPerPyeong": 1984,
    "avg3MTxCount": 6,
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
    "rentTxCount": 7,
    "latestRentDeposit": 5000,
    "latestRentDepositEok": "5,000만",
    "latestRentMonthly": 165,
    "latestRentDate": "20260502",
    "avg1MRentDeposit": 39300,
    "avg1MRentDepositEok": "3억9,300",
    "avg3MRentDeposit": 38000,
    "avg3MRentDepositEok": "3억8,000"
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
    "minPrice": 50000,
    "minPriceEok": "5억",
    "txCount": 5,
    "avg1MPrice": 80700,
    "avg1MPriceEok": "8억700",
    "avg1MPerPyeong": 2367,
    "avg1MTxCount": 2,
    "avg3MPrice": 72900,
    "avg3MPriceEok": "7억2,900",
    "avg3MPerPyeong": 2186,
    "avg3MTxCount": 5,
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
        "date": "03.03",
        "priceEok": "5억",
        "areaPyeong": 32.031949757499994,
        "floor": 8,
        "area": 79.6171
      }
    ],
    "rentTxCount": 8,
    "latestRentDeposit": 59000,
    "latestRentDepositEok": "5억9,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260420",
    "avg1MRentDeposit": 48900,
    "avg1MRentDepositEok": "4억8,900",
    "avg3MRentDeposit": 44600,
    "avg3MRentDepositEok": "4억4,600"
  },
  "롯데캐슬알바트로스": {
    "dong": "청계동",
    "latestPrice": 92500,
    "latestPriceEok": "9억2,500",
    "latestArea": 40.99080216,
    "latestFloor": 2,
    "latestDate": "20260507",
    "maxPrice": 115000,
    "maxPriceEok": "11억5,000",
    "minPrice": 91000,
    "minPriceEok": "9억1,000",
    "txCount": 21,
    "avg1MPrice": 98600,
    "avg1MPriceEok": "9억8,600",
    "avg1MPerPyeong": 2406,
    "avg1MTxCount": 7,
    "avg3MPrice": 101400,
    "avg3MPriceEok": "10억1,400",
    "avg3MPerPyeong": 2384,
    "avg3MTxCount": 21,
    "recent": [
      {
        "date": "05.07",
        "priceEok": "9억2,500",
        "areaPyeong": 40.99080216,
        "floor": 2,
        "area": 101.8848
      },
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
      }
    ],
    "rentTxCount": 23,
    "latestRentDeposit": 65000,
    "latestRentDepositEok": "6억5,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260430",
    "avg1MRentDeposit": 63900,
    "avg1MRentDepositEok": "6억3,900",
    "avg3MRentDeposit": 58400,
    "avg3MRentDepositEok": "5억8,400"
  },
  "나루마을한화꿈에그린우림필유": {
    "dong": "반송동",
    "latestPrice": 80500,
    "latestPriceEok": "8억500",
    "latestArea": 33.5775,
    "latestFloor": 12,
    "latestDate": "20260507",
    "maxPrice": 80500,
    "maxPriceEok": "8억500",
    "minPrice": 72000,
    "minPriceEok": "7억2,000",
    "txCount": 5,
    "avg1MPrice": 80500,
    "avg1MPriceEok": "8억500",
    "avg1MPerPyeong": 2397,
    "avg1MTxCount": 1,
    "avg3MPrice": 74600,
    "avg3MPriceEok": "7억4,600",
    "avg3MPerPyeong": 2224,
    "avg3MTxCount": 5,
    "recent": [
      {
        "date": "05.07",
        "priceEok": "8억500",
        "areaPyeong": 33.5775,
        "floor": 12,
        "area": 84.96
      },
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
      }
    ],
    "rentTxCount": 13,
    "latestRentDeposit": 20000,
    "latestRentDepositEok": "2억",
    "latestRentMonthly": 105,
    "latestRentDate": "20260430",
    "avg1MRentDeposit": 43200,
    "avg1MRentDepositEok": "4억3,200",
    "avg3MRentDeposit": 41300,
    "avg3MRentDepositEok": "4억1,300"
  },
  "시범한빛마을케이씨씨스위첸": {
    "dong": "",
    "latestPrice": 65000,
    "latestPriceEok": "6억5,000",
    "latestArea": 34.0574952025,
    "latestFloor": 3,
    "latestDate": "20260429",
    "maxPrice": 72000,
    "maxPriceEok": "7억2,000",
    "minPrice": 60000,
    "minPriceEok": "6억",
    "txCount": 10,
    "avg1MPrice": 66600,
    "avg1MPriceEok": "6억6,600",
    "avg1MPerPyeong": 1954,
    "avg1MTxCount": 3,
    "avg3MPrice": 66700,
    "avg3MPriceEok": "6억6,700",
    "avg3MPerPyeong": 1958,
    "avg3MTxCount": 10,
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
    "rentTxCount": 8,
    "latestRentDeposit": 43000,
    "latestRentDepositEok": "4억3,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260418",
    "avg1MRentDeposit": 40500,
    "avg1MRentDepositEok": "4억500",
    "avg3MRentDeposit": 39200,
    "avg3MRentDepositEok": "3억9,200"
  },
  "동탄역예미지시그너스": {
    "dong": "여울동",
    "latestPrice": 134500,
    "latestPriceEok": "13억4,500",
    "latestArea": 33.275,
    "latestFloor": 26,
    "latestDate": "20260429",
    "maxPrice": 150000,
    "maxPriceEok": "15억",
    "minPrice": 133000,
    "minPriceEok": "13억3,000",
    "txCount": 8,
    "avg1MPrice": 140000,
    "avg1MPriceEok": "14억",
    "avg1MPerPyeong": 4207,
    "avg1MTxCount": 2,
    "avg3MPrice": 142000,
    "avg3MPriceEok": "14억2,000",
    "avg3MPerPyeong": 3984,
    "avg3MTxCount": 8,
    "recent": [
      {
        "date": "04.29",
        "priceEok": "13억4,500",
        "areaPyeong": 33.275,
        "floor": 26,
        "area": 84.6748
      },
      {
        "date": "04.20",
        "priceEok": "14억5,500",
        "areaPyeong": 33.275,
        "floor": 37,
        "area": 84.6748
      },
      {
        "date": "04.08",
        "priceEok": "13억6,000",
        "areaPyeong": 34.1825,
        "floor": 22,
        "area": 87.5651
      },
      {
        "date": "04.04",
        "priceEok": "13억9,000",
        "areaPyeong": 33.275,
        "floor": 12,
        "area": 84.6397
      }
    ],
    "rentTxCount": 6,
    "latestRentDeposit": 65000,
    "latestRentDepositEok": "6억5,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260316",
    "avg1MRentDeposit": 65000,
    "avg1MRentDepositEok": "6억5,000",
    "avg3MRentDeposit": 59500,
    "avg3MRentDepositEok": "5억9,500"
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
    "minPrice": 77800,
    "minPriceEok": "7억7,800",
    "txCount": 7,
    "avg1MPrice": 80000,
    "avg1MPriceEok": "8억",
    "avg1MPerPyeong": 2350,
    "avg1MTxCount": 1,
    "avg3MPrice": 82000,
    "avg3MPriceEok": "8억2,000",
    "avg3MPerPyeong": 2498,
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
        "priceEok": "7억8,000",
        "areaPyeong": 26.940486650000004,
        "floor": 23,
        "area": 66.962
      },
      {
        "date": "03.27",
        "priceEok": "8억350",
        "areaPyeong": 33.982381125,
        "floor": 11,
        "area": 84.465
      }
    ],
    "rentTxCount": 9,
    "latestRentDeposit": 42000,
    "latestRentDepositEok": "4억2,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260427",
    "avg1MRentDeposit": 40700,
    "avg1MRentDepositEok": "4억700",
    "avg3MRentDeposit": 42300,
    "avg3MRentDepositEok": "4억2,300"
  },
  "동탄역유림노르웨이숲": {
    "dong": "여울동",
    "latestPrice": 154500,
    "latestPriceEok": "15억4,500",
    "latestArea": 39.324999999999996,
    "latestFloor": 15,
    "latestDate": "20260426",
    "maxPrice": 157000,
    "maxPriceEok": "15억7,000",
    "minPrice": 114000,
    "minPriceEok": "11억4,000",
    "txCount": 10,
    "avg1MPrice": 137000,
    "avg1MPriceEok": "13억7,000",
    "avg1MPerPyeong": 3697,
    "avg1MTxCount": 2,
    "avg3MPrice": 136600,
    "avg3MPriceEok": "13억6,600",
    "avg3MPerPyeong": 3791,
    "avg3MTxCount": 10,
    "recent": [
      {
        "date": "04.26",
        "priceEok": "15억4,500",
        "areaPyeong": 39.324999999999996,
        "floor": 15,
        "area": 96.5843
      },
      {
        "date": "04.25",
        "priceEok": "11억9,500",
        "areaPyeong": 34.485,
        "floor": 29,
        "area": 84.4985
      },
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
      }
    ],
    "rentTxCount": 4,
    "latestRentDeposit": 70000,
    "latestRentDepositEok": "7억",
    "latestRentMonthly": 0,
    "latestRentDate": "20260404",
    "avg1MRentDeposit": 70000,
    "avg1MRentDepositEok": "7억",
    "avg3MRentDeposit": 61300,
    "avg3MRentDepositEok": "6억1,300"
  },
  "동탄역파라곤": {
    "dong": "여울동",
    "latestPrice": 105000,
    "latestPriceEok": "10억5,000",
    "latestArea": 32.065,
    "latestFloor": 12,
    "latestDate": "20260425",
    "maxPrice": 128000,
    "maxPriceEok": "12억8,000",
    "minPrice": 105000,
    "minPriceEok": "10억5,000",
    "txCount": 4,
    "avg1MPrice": 105000,
    "avg1MPriceEok": "10억5,000",
    "avg1MPerPyeong": 3275,
    "avg1MTxCount": 1,
    "avg3MPrice": 112500,
    "avg3MPriceEok": "11억2,500",
    "avg3MPerPyeong": 3303,
    "avg3MTxCount": 4,
    "recent": [
      {
        "date": "04.25",
        "priceEok": "10억5,000",
        "areaPyeong": 32.065,
        "floor": 12,
        "area": 79.8807
      },
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
      }
    ],
    "rentTxCount": 4,
    "latestRentDeposit": 59000,
    "latestRentDepositEok": "5억9,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260408",
    "avg1MRentDeposit": 59000,
    "avg1MRentDepositEok": "5억9,000",
    "avg3MRentDeposit": 56800,
    "avg3MRentDepositEok": "5억6,800"
  },
  "동탄역반도유보라아이비파크7.0": {
    "dong": "여울동",
    "latestPrice": 139800,
    "latestPriceEok": "13억9,800",
    "latestArea": 37.8125,
    "latestFloor": 39,
    "latestDate": "20260511",
    "maxPrice": 139800,
    "maxPriceEok": "13억9,800",
    "minPrice": 105000,
    "minPriceEok": "10억5,000",
    "txCount": 25,
    "avg1MPrice": 125000,
    "avg1MPriceEok": "12억5,000",
    "avg1MPerPyeong": 3642,
    "avg1MTxCount": 10,
    "avg3MPrice": 121700,
    "avg3MPriceEok": "12억1,700",
    "avg3MPerPyeong": 3578,
    "avg3MTxCount": 25,
    "recent": [
      {
        "date": "05.11",
        "priceEok": "13억9,800",
        "areaPyeong": 37.8125,
        "floor": 39,
        "area": 86.2318
      },
      {
        "date": "05.06",
        "priceEok": "12억8,000",
        "areaPyeong": 32.67,
        "floor": 26,
        "area": 73.6524
      },
      {
        "date": "04.25",
        "priceEok": "11억8,000",
        "areaPyeong": 32.67,
        "floor": 16,
        "area": 73.4311
      },
      {
        "date": "04.25",
        "priceEok": "11억9,000",
        "areaPyeong": 33.275,
        "floor": 7,
        "area": 76.1872
      }
    ],
    "rentTxCount": 7,
    "latestRentDeposit": 20000,
    "latestRentDepositEok": "2억",
    "latestRentMonthly": 82,
    "latestRentDate": "20260406",
    "avg1MRentDeposit": 37900,
    "avg1MRentDepositEok": "3억7,900",
    "avg3MRentDeposit": 46000,
    "avg3MRentDepositEok": "4억6,000"
  },
  "동탄2아이파크1단지": {
    "dong": "",
    "latestPrice": 62200,
    "latestPriceEok": "6억2,200",
    "latestArea": 38.115,
    "latestFloor": 19,
    "latestDate": "20260423",
    "maxPrice": 62800,
    "maxPriceEok": "6억2,800",
    "minPrice": 54200,
    "minPriceEok": "5억4,200",
    "txCount": 8,
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
    "rentTxCount": 5,
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
    "maxPrice": 50000,
    "maxPriceEok": "5억",
    "minPrice": 40000,
    "minPriceEok": "4억",
    "txCount": 5,
    "avg1MPrice": 46300,
    "avg1MPriceEok": "4억6,300",
    "avg1MPerPyeong": 1935,
    "avg1MTxCount": 2,
    "avg3MPrice": 46400,
    "avg3MPriceEok": "4억6,400",
    "avg3MPerPyeong": 1942,
    "avg3MTxCount": 5,
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
        "date": "04.03",
        "priceEok": "4억",
        "areaPyeong": 23.8975,
        "floor": 14,
        "area": 59.0157
      },
      {
        "date": "03.07",
        "priceEok": "5억",
        "areaPyeong": 23.8975,
        "floor": 32,
        "area": 59.0157
      }
    ],
    "rentTxCount": 3,
    "latestRentDeposit": 33000,
    "latestRentDepositEok": "3억3,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260410",
    "avg1MRentDeposit": 33000,
    "avg1MRentDepositEok": "3억3,000",
    "avg3MRentDeposit": 33700,
    "avg3MRentDepositEok": "3억3,700"
  },
  "우미린제일풍경채": {
    "dong": "",
    "latestPrice": 70000,
    "latestPriceEok": "7억",
    "latestArea": 30.7614878725,
    "latestFloor": 20,
    "latestDate": "20260418",
    "maxPrice": 75000,
    "maxPriceEok": "7억5,000",
    "minPrice": 63800,
    "minPriceEok": "6억3,800",
    "txCount": 7,
    "avg1MPrice": 69300,
    "avg1MPriceEok": "6억9,300",
    "avg1MPerPyeong": 2260,
    "avg1MTxCount": 3,
    "avg3MPrice": 69100,
    "avg3MPriceEok": "6억9,100",
    "avg3MPerPyeong": 2151,
    "avg3MTxCount": 7,
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
    "rentTxCount": 7,
    "latestRentDeposit": 45000,
    "latestRentDepositEok": "4억5,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260315",
    "avg1MRentDeposit": 45000,
    "avg1MRentDepositEok": "4억5,000",
    "avg3MRentDeposit": 41100,
    "avg3MRentDepositEok": "4억1,100"
  },
  "동탄역경남아너스빌": {
    "dong": "영천동",
    "latestPrice": 82000,
    "latestPriceEok": "8억2,000",
    "latestArea": 32.67,
    "latestFloor": 21,
    "latestDate": "20260417",
    "maxPrice": 85000,
    "maxPriceEok": "8억5,000",
    "minPrice": 76300,
    "minPriceEok": "7억6,300",
    "txCount": 8,
    "avg1MPrice": 82000,
    "avg1MPriceEok": "8억2,000",
    "avg1MPerPyeong": 2510,
    "avg1MTxCount": 1,
    "avg3MPrice": 80900,
    "avg3MPriceEok": "8억900",
    "avg3MPerPyeong": 2475,
    "avg3MTxCount": 8,
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
    "rentTxCount": 2,
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
    "maxPrice": 105600,
    "maxPriceEok": "10억5,600",
    "minPrice": 93000,
    "minPriceEok": "9억3,000",
    "txCount": 5,
    "avg1MPrice": 103000,
    "avg1MPriceEok": "10억3,000",
    "avg1MPerPyeong": 3095,
    "avg1MTxCount": 1,
    "avg3MPrice": 100400,
    "avg3MPriceEok": "10억400",
    "avg3MPerPyeong": 3016,
    "avg3MTxCount": 5,
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
    "rentTxCount": 3,
    "latestRentDeposit": 59000,
    "latestRentDepositEok": "5억9,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260404",
    "avg1MRentDeposit": 59000,
    "avg1MRentDepositEok": "5억9,000",
    "avg3MRentDeposit": 48000,
    "avg3MRentDepositEok": "4억8,000"
  },
  "동탄역시범금강펜테리움센트럴파크3": {
    "dong": "",
    "latestPrice": 140000,
    "latestPriceEok": "14억",
    "latestArea": 39.324999999999996,
    "latestFloor": 12,
    "latestDate": "20260406",
    "maxPrice": 140000,
    "maxPriceEok": "14억",
    "minPrice": 128000,
    "minPriceEok": "12억8,000",
    "txCount": 2,
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
      }
    ],
    "rentTxCount": 8,
    "latestRentDeposit": 15000,
    "latestRentDepositEok": "1억5,000",
    "latestRentMonthly": 190,
    "latestRentDate": "20260411",
    "avg1MRentDeposit": 56500,
    "avg1MRentDepositEok": "5억6,500",
    "avg3MRentDeposit": 77500,
    "avg3MRentDepositEok": "7억7,500"
  },
  "푸르지오": {
    "dong": "",
    "latestPrice": 63000,
    "latestPriceEok": "6억3,000",
    "latestArea": 24.805,
    "latestFloor": 8,
    "latestDate": "20260409",
    "maxPrice": 70000,
    "maxPriceEok": "7억",
    "minPrice": 55000,
    "minPriceEok": "5억5,000",
    "txCount": 16,
    "avg1MPrice": 63000,
    "avg1MPriceEok": "6억3,000",
    "avg1MPerPyeong": 2540,
    "avg1MTxCount": 0,
    "avg3MPrice": 61400,
    "avg3MPriceEok": "6억1,400",
    "avg3MPerPyeong": 2309,
    "avg3MTxCount": 16,
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
    "rentTxCount": 7,
    "latestRentDeposit": 45000,
    "latestRentDepositEok": "4억5,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260321",
    "avg1MRentDeposit": 45000,
    "avg1MRentDepositEok": "4억5,000",
    "avg3MRentDeposit": 37500,
    "avg3MRentDepositEok": "3억7,500"
  },
  "신일유토빌": {
    "dong": "",
    "latestPrice": 74600,
    "latestPriceEok": "7억4,600",
    "latestArea": 40.979617525,
    "latestFloor": 17,
    "latestDate": "20260409",
    "maxPrice": 86000,
    "maxPriceEok": "8억6,000",
    "minPrice": 69500,
    "minPriceEok": "6억9,500",
    "txCount": 7,
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
    "rentTxCount": 2,
    "latestRentDeposit": 10000,
    "latestRentDepositEok": "1억",
    "latestRentMonthly": 180,
    "latestRentDate": "20260328",
    "avg1MRentDeposit": 49300,
    "avg1MRentDepositEok": "4억9,300",
    "avg3MRentDeposit": 48100,
    "avg3MRentDepositEok": "4억8,100"
  },
  "롯데캐슬": {
    "dong": "",
    "latestPrice": 77000,
    "latestPriceEok": "7억7,000",
    "latestArea": 35.259763,
    "latestFloor": 10,
    "latestDate": "20260408",
    "maxPrice": 96500,
    "maxPriceEok": "9억6,500",
    "minPrice": 71500,
    "minPriceEok": "7억1,500",
    "txCount": 12,
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
    "rentTxCount": 6,
    "latestRentDeposit": 42000,
    "latestRentDepositEok": "4억2,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260403",
    "avg1MRentDeposit": 42000,
    "avg1MRentDepositEok": "4억2,000",
    "avg3MRentDeposit": 46200,
    "avg3MRentDepositEok": "4억6,200"
  }
};
