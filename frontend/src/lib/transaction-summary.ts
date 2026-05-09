/**
 * 실거래가 및 전월세 요약 데이터 — 빌드 타임에 포함, API 호출 0
 * 
 * ⚠️ 이 파일은 자동 생성됩니다. 직접 수정하지 마세요!
 * 동기화: npm run sync-transactions
 * 마지막 동기화: 2026-05-09
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
    "동탄 아파트 전세 평균": 2.9
  },
  {
    "name": "16.09",
    "동탄 아파트 전체": 3.9,
    "동탄 아파트 전세 평균": 3
  },
  {
    "name": "16.10",
    "동탄 아파트 전체": 4,
    "동탄 아파트 전세 평균": 3
  },
  {
    "name": "16.11",
    "동탄 아파트 전체": 4.1,
    "동탄 아파트 전세 평균": 3.1
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
    "동탄 아파트 전세 평균": 2.7
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
    "동탄 아파트 전체": 4.1,
    "동탄 아파트 전세 평균": 2.5
  },
  {
    "name": "18.04",
    "동탄 아파트 전체": 4.1,
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
    "동탄 아파트 전세 평균": 2.5
  },
  {
    "name": "18.07",
    "동탄 아파트 전체": 4.3,
    "동탄 아파트 전세 평균": 2.5
  },
  {
    "name": "18.08",
    "동탄 아파트 전체": 4.3,
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
    "동탄 아파트 전세 평균": 2.2
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
    "동탄 아파트 전체": 4.7,
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
    "동탄 아파트 전세 평균": 2.6
  },
  {
    "name": "20.01",
    "동탄 아파트 전체": 5.4,
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
    "동탄 아파트 전체": 6.5,
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
    "동탄 아파트 전세 평균": 3.8
  },
  {
    "name": "20.12",
    "동탄 아파트 전체": 7.1,
    "동탄 아파트 전세 평균": 3.6
  },
  {
    "name": "21.01",
    "동탄 아파트 전체": 7.4,
    "동탄 아파트 전세 평균": 3.7
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
    "동탄 아파트 전세 평균": 3.6
  },
  {
    "name": "21.07",
    "동탄 아파트 전체": 8.2,
    "동탄 아파트 전세 평균": 3.9
  },
  {
    "name": "21.08",
    "동탄 아파트 전체": 8.5,
    "동탄 아파트 전세 평균": 4
  },
  {
    "name": "21.09",
    "동탄 아파트 전체": 8.6,
    "동탄 아파트 전세 평균": 4
  },
  {
    "name": "21.10",
    "동탄 아파트 전체": 8.6,
    "동탄 아파트 전세 평균": 4
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
    "동탄 아파트 전체": 8,
    "동탄 아파트 전세 평균": 3.7
  },
  {
    "name": "22.05",
    "동탄 아파트 전체": 7.9,
    "동탄 아파트 전세 평균": 3.9
  },
  {
    "name": "22.06",
    "동탄 아파트 전체": 7.8,
    "동탄 아파트 전세 평균": 3.7
  },
  {
    "name": "22.07",
    "동탄 아파트 전체": 7.7,
    "동탄 아파트 전세 평균": 3.8
  },
  {
    "name": "22.08",
    "동탄 아파트 전체": 7.5,
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
    "동탄 아파트 전체": 6.8,
    "동탄 아파트 전세 평균": 3.5
  },
  {
    "name": "22.12",
    "동탄 아파트 전체": 6.5,
    "동탄 아파트 전세 평균": 3.2
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
    "동탄 아파트 전체": 6.7,
    "동탄 아파트 전세 평균": 3
  },
  {
    "name": "23.05",
    "동탄 아파트 전체": 6.9,
    "동탄 아파트 전세 평균": 3.2
  },
  {
    "name": "23.06",
    "동탄 아파트 전체": 7.1,
    "동탄 아파트 전세 평균": 3.3
  },
  {
    "name": "23.07",
    "동탄 아파트 전체": 7.1,
    "동탄 아파트 전세 평균": 3.4
  },
  {
    "name": "23.08",
    "동탄 아파트 전체": 7.3,
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
    "동탄 아파트 전체": 7.4,
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
    "동탄 아파트 전체": 7.5,
    "동탄 아파트 전세 평균": 3.9
  },
  {
    "name": "24.11",
    "동탄 아파트 전체": 7.5,
    "동탄 아파트 전세 평균": 3.9
  },
  {
    "name": "24.12",
    "동탄 아파트 전체": 7.5,
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
    "동탄 아파트 전체": 7.4,
    "동탄 아파트 전세 평균": 3.6
  },
  {
    "name": "25.04",
    "동탄 아파트 전체": 7.4,
    "동탄 아파트 전세 평균": 3.6
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
    "동탄 아파트 전체": 7.4,
    "동탄 아파트 전세 평균": 3.8
  },
  {
    "name": "25.09",
    "동탄 아파트 전체": 7.5,
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
    "동탄 아파트 전체": 7.7,
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
    "동탄 아파트 전세 평균": 4.2
  },
  {
    "name": "26.03",
    "동탄 아파트 전체": 8.1,
    "동탄 아파트 전세 평균": 4.3
  }
];

/** 아파트명 → 거래 요약 */
export const TX_SUMMARY: Record<string, AptTxSummary> = {
  "제일풍경채에듀앤파크": {
    "dong": "",
    "latestPrice": 45700,
    "latestPriceEok": "4억5,700",
    "latestArea": 23.969115362500002,
    "latestFloor": 4,
    "latestDate": "20260506",
    "maxPrice": 72200,
    "maxPriceEok": "7억2,200",
    "minPrice": 27300,
    "minPriceEok": "2억7,300",
    "txCount": 210,
    "avg1MPrice": 48400,
    "avg1MPriceEok": "4억8,400",
    "avg1MPerPyeong": 1854,
    "avg1MTxCount": 9,
    "avg3MPrice": 49300,
    "avg3MPriceEok": "4억9,300",
    "avg3MPerPyeong": 1855,
    "avg3MTxCount": 22,
    "recent": [
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
      },
      {
        "date": "04.23",
        "priceEok": "4억7,000",
        "areaPyeong": 23.969115362500002,
        "floor": 15,
        "area": 59.5765
      }
    ],
    "rentTxCount": 461,
    "latestRentDeposit": 30000,
    "latestRentDepositEok": "3억",
    "latestRentMonthly": 0,
    "latestRentDate": "20260402",
    "avg1MRentDeposit": 30000,
    "avg1MRentDepositEok": "3억",
    "avg3MRentDeposit": 33200,
    "avg3MRentDepositEok": "3억3,200"
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
    "avg1MPrice": 61300,
    "avg1MPriceEok": "6억1,300",
    "avg1MPerPyeong": 1824,
    "avg1MTxCount": 11,
    "avg3MPrice": 60000,
    "avg3MPriceEok": "6억",
    "avg3MPerPyeong": 1854,
    "avg3MTxCount": 28,
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
    "rentTxCount": 629,
    "latestRentDeposit": 42000,
    "latestRentDepositEok": "4억2,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260409",
    "avg1MRentDeposit": 42000,
    "avg1MRentDepositEok": "4억2,000",
    "avg3MRentDeposit": 37800,
    "avg3MRentDepositEok": "3억7,800"
  },
  "산척동,동탄호수공원금강펜테리움센트럴파크Ⅱ": {
    "dong": "",
    "latestPrice": 56400,
    "latestPriceEok": "5억6,400",
    "latestArea": 34.19746407,
    "latestFloor": 9,
    "latestDate": "20260506",
    "maxPrice": 61500,
    "maxPriceEok": "6억1,500",
    "minPrice": 40000,
    "minPriceEok": "4억",
    "txCount": 229,
    "avg1MPrice": 55800,
    "avg1MPriceEok": "5억5,800",
    "avg1MPerPyeong": 1722,
    "avg1MTxCount": 11,
    "avg3MPrice": 55300,
    "avg3MPriceEok": "5억5,300",
    "avg3MPerPyeong": 1708,
    "avg3MTxCount": 35,
    "recent": [
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
      },
      {
        "date": "04.29",
        "priceEok": "5억7,750",
        "areaPyeong": 34.19746407,
        "floor": 25,
        "area": 84.9996
      }
    ],
    "rentTxCount": 299,
    "latestRentDeposit": 40000,
    "latestRentDepositEok": "4억",
    "latestRentMonthly": 0,
    "latestRentDate": "20260323",
    "avg1MRentDeposit": 40000,
    "avg1MRentDepositEok": "4억",
    "avg3MRentDeposit": 37300,
    "avg3MRentDepositEok": "3억7,300"
  },
  "동탄퍼스트파크": {
    "dong": "영천동",
    "latestPrice": 38200,
    "latestPriceEok": "3억8,200",
    "latestArea": 26.9225,
    "latestFloor": 1,
    "latestDate": "20260504",
    "maxPrice": 55800,
    "maxPriceEok": "5억5,800",
    "minPrice": 11400,
    "minPriceEok": "1억1,400",
    "txCount": 832,
    "avg1MPrice": 41800,
    "avg1MPriceEok": "4억1,800",
    "avg1MPerPyeong": 1551,
    "avg1MTxCount": 7,
    "avg3MPrice": 41400,
    "avg3MPriceEok": "4억1,400",
    "avg3MPerPyeong": 1539,
    "avg3MTxCount": 18,
    "recent": [
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
      },
      {
        "date": "04.27",
        "priceEok": "4억1,500",
        "areaPyeong": 26.9225,
        "floor": 13,
        "area": 72.5957
      }
    ],
    "rentTxCount": 551,
    "latestRentDeposit": 4000,
    "latestRentDepositEok": "4,000만",
    "latestRentMonthly": 120,
    "latestRentDate": "20260407",
    "avg1MRentDeposit": 30200,
    "avg1MRentDepositEok": "3억200",
    "avg3MRentDeposit": 31000,
    "avg3MRentDepositEok": "3억1,000"
  },
  "동탄2디에트르포레": {
    "dong": "",
    "latestPrice": 38400,
    "latestPriceEok": "3억8,400",
    "latestArea": 19.965,
    "latestFloor": 4,
    "latestDate": "20260505",
    "maxPrice": 47000,
    "maxPriceEok": "4억7,000",
    "minPrice": 33000,
    "minPriceEok": "3억3,000",
    "txCount": 86,
    "avg1MPrice": 41700,
    "avg1MPriceEok": "4억1,700",
    "avg1MPerPyeong": 1809,
    "avg1MTxCount": 11,
    "avg3MPrice": 42000,
    "avg3MPriceEok": "4억2,000",
    "avg3MPerPyeong": 1784,
    "avg3MTxCount": 40,
    "recent": [
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
      },
      {
        "date": "04.30",
        "priceEok": "4억3,000",
        "areaPyeong": 24.2,
        "floor": 6,
        "area": 55.97
      }
    ],
    "rentTxCount": 582,
    "latestRentDeposit": 1220,
    "latestRentDepositEok": "1,220만",
    "latestRentMonthly": 47,
    "latestRentDate": "20260407",
    "avg1MRentDeposit": 11500,
    "avg1MRentDepositEok": "1억1,500",
    "avg3MRentDeposit": 23100,
    "avg3MRentDepositEok": "2억3,100"
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
    "avg1MPrice": 58000,
    "avg1MPriceEok": "5억8,000",
    "avg1MPerPyeong": 1873,
    "avg1MTxCount": 17,
    "avg3MPrice": 57700,
    "avg3MPriceEok": "5억7,700",
    "avg3MPerPyeong": 1836,
    "avg3MTxCount": 42,
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
    "rentTxCount": 461,
    "latestRentDeposit": 41000,
    "latestRentDepositEok": "4억1,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260411",
    "avg1MRentDeposit": 40000,
    "avg1MRentDepositEok": "4억",
    "avg3MRentDeposit": 35700,
    "avg3MRentDepositEok": "3억5,700"
  },
  "더레이크시티부영1단지": {
    "dong": "",
    "latestPrice": 60000,
    "latestPriceEok": "6억",
    "latestArea": 25.107499999999998,
    "latestFloor": 15,
    "latestDate": "20260505",
    "maxPrice": 94800,
    "maxPriceEok": "9억4,800",
    "minPrice": 30200,
    "minPriceEok": "3억200",
    "txCount": 270,
    "avg1MPrice": 63700,
    "avg1MPriceEok": "6억3,700",
    "avg1MPerPyeong": 2336,
    "avg1MTxCount": 14,
    "avg3MPrice": 63600,
    "avg3MPriceEok": "6억3,600",
    "avg3MPerPyeong": 2319,
    "avg3MTxCount": 23,
    "recent": [
      {
        "date": "05.05",
        "priceEok": "6억",
        "areaPyeong": 25.107499999999998,
        "floor": 15,
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
        "date": "05.03",
        "priceEok": "6억",
        "areaPyeong": 25.107499999999998,
        "floor": 8,
        "area": 59.9912
      },
      {
        "date": "04.28",
        "priceEok": "5억8,000",
        "areaPyeong": 25.107499999999998,
        "floor": 17,
        "area": 59.9912
      }
    ],
    "rentTxCount": 638,
    "latestRentDeposit": 38000,
    "latestRentDepositEok": "3억8,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260410",
    "avg1MRentDeposit": 38000,
    "avg1MRentDepositEok": "3억8,000",
    "avg3MRentDeposit": 37500,
    "avg3MRentDepositEok": "3억7,500"
  },
  "한화포레나동탄호수": {
    "dong": "장지동",
    "latestPrice": 78700,
    "latestPriceEok": "7억8,700",
    "latestArea": 33.81541625,
    "latestFloor": 9,
    "latestDate": "20260502",
    "maxPrice": 85000,
    "maxPriceEok": "8억5,000",
    "minPrice": 40000,
    "minPriceEok": "4억",
    "txCount": 143,
    "avg1MPrice": 75100,
    "avg1MPriceEok": "7억5,100",
    "avg1MPerPyeong": 2362,
    "avg1MTxCount": 8,
    "avg3MPrice": 74700,
    "avg3MPriceEok": "7억4,700",
    "avg3MPerPyeong": 2365,
    "avg3MTxCount": 16,
    "recent": [
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
      },
      {
        "date": "04.23",
        "priceEok": "7억2,500",
        "areaPyeong": 29.856538249999996,
        "floor": 7,
        "area": 74.21
      },
      {
        "date": "04.22",
        "priceEok": "7억8,900",
        "areaPyeong": 33.80736975,
        "floor": 22,
        "area": 84.03
      }
    ],
    "rentTxCount": 300,
    "latestRentDeposit": 45000,
    "latestRentDepositEok": "4억5,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260412",
    "avg1MRentDeposit": 45000,
    "avg1MRentDepositEok": "4억5,000",
    "avg3MRentDeposit": 38700,
    "avg3MRentDepositEok": "3억8,700"
  },
  "푸른마을모아미래도": {
    "dong": "",
    "latestPrice": 42000,
    "latestPriceEok": "4억2,000",
    "latestArea": 23.8144214,
    "latestFloor": 17,
    "latestDate": "20260502",
    "maxPrice": 61000,
    "maxPriceEok": "6억1,000",
    "minPrice": 16570,
    "minPriceEok": "1억6,570",
    "txCount": 1429,
    "avg1MPrice": 43900,
    "avg1MPriceEok": "4억3,900",
    "avg1MPerPyeong": 1741,
    "avg1MTxCount": 12,
    "avg3MPrice": 44900,
    "avg3MPriceEok": "4억4,900",
    "avg3MPerPyeong": 1706,
    "avg3MTxCount": 27,
    "recent": [
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
      },
      {
        "date": "04.30",
        "priceEok": "4억3,300",
        "areaPyeong": 23.752865675000002,
        "floor": 3,
        "area": 59.039
      }
    ],
    "rentTxCount": 1862,
    "latestRentDeposit": 31000,
    "latestRentDepositEok": "3억1,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260402",
    "avg1MRentDeposit": 31000,
    "avg1MRentDepositEok": "3억1,000",
    "avg3MRentDeposit": 27100,
    "avg3MRentDepositEok": "2억7,100"
  },
  "중흥에스클래스에듀하이": {
    "dong": "",
    "latestPrice": 67000,
    "latestPriceEok": "6억7,000",
    "latestArea": 33.3973603425,
    "latestFloor": 3,
    "latestDate": "20260507",
    "maxPrice": 74500,
    "maxPriceEok": "7억4,500",
    "minPrice": 54766,
    "minPriceEok": "5억4,766",
    "txCount": 68,
    "avg1MPrice": 67200,
    "avg1MPriceEok": "6억7,200",
    "avg1MPerPyeong": 2011,
    "avg1MTxCount": 6,
    "avg3MPrice": 67600,
    "avg3MPriceEok": "6억7,600",
    "avg3MPerPyeong": 2023,
    "avg3MTxCount": 13,
    "recent": [
      {
        "date": "05.07",
        "priceEok": "6억7,000",
        "areaPyeong": 33.3973603425,
        "floor": 3,
        "area": 83.0109
      },
      {
        "date": "05.04",
        "priceEok": "6억6,500",
        "areaPyeong": 33.3973603425,
        "floor": 3,
        "area": 83.0109
      },
      {
        "date": "05.02",
        "priceEok": "6억4,800",
        "areaPyeong": 33.3973603425,
        "floor": 3,
        "area": 83.0109
      },
      {
        "date": "04.28",
        "priceEok": "6억4,000",
        "areaPyeong": 33.3973603425,
        "floor": 18,
        "area": 83.0109
      }
    ],
    "rentTxCount": 460,
    "latestRentDeposit": 45000,
    "latestRentDepositEok": "4억5,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260327",
    "avg1MRentDeposit": 45000,
    "avg1MRentDepositEok": "4억5,000",
    "avg3MRentDeposit": 40500,
    "avg3MRentDepositEok": "4억500"
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
    "avg1MPrice": 56700,
    "avg1MPriceEok": "5억6,700",
    "avg1MPerPyeong": 1659,
    "avg1MTxCount": 6,
    "avg3MPrice": 56200,
    "avg3MPriceEok": "5억6,200",
    "avg3MPerPyeong": 1711,
    "avg3MTxCount": 22,
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
    "rentTxCount": 397,
    "latestRentDeposit": 5000,
    "latestRentDepositEok": "5,000만",
    "latestRentMonthly": 170,
    "latestRentDate": "20260406",
    "avg1MRentDeposit": 42100,
    "avg1MRentDepositEok": "4억2,100",
    "avg3MRentDeposit": 37900,
    "avg3MRentDepositEok": "3억7,900"
  },
  "동탄역포레너스": {
    "dong": "영천동",
    "latestPrice": 69300,
    "latestPriceEok": "6억9,300",
    "latestArea": 34.004589465,
    "latestFloor": 9,
    "latestDate": "20260508",
    "maxPrice": 79500,
    "maxPriceEok": "7억9,500",
    "minPrice": 27500,
    "minPriceEok": "2억7,500",
    "txCount": 930,
    "avg1MPrice": 67700,
    "avg1MPriceEok": "6억7,700",
    "avg1MPerPyeong": 2054,
    "avg1MTxCount": 11,
    "avg3MPrice": 66200,
    "avg3MPriceEok": "6억6,200",
    "avg3MPerPyeong": 2020,
    "avg3MTxCount": 37,
    "recent": [
      {
        "date": "05.08",
        "priceEok": "6억9,300",
        "areaPyeong": 34.004589465,
        "floor": 9,
        "area": 84.5202
      },
      {
        "date": "05.02",
        "priceEok": "6억7,000",
        "areaPyeong": 34.0130785225,
        "floor": 9,
        "area": 84.5413
      },
      {
        "date": "04.28",
        "priceEok": "6억4,000",
        "areaPyeong": 34.01424526500001,
        "floor": 15,
        "area": 84.5442
      },
      {
        "date": "04.27",
        "priceEok": "5억8,000",
        "areaPyeong": 24.29109606,
        "floor": 6,
        "area": 60.3768
      }
    ],
    "rentTxCount": 1410,
    "latestRentDeposit": 37000,
    "latestRentDepositEok": "3억7,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260411",
    "avg1MRentDeposit": 41800,
    "avg1MRentDepositEok": "4억1,800",
    "avg3MRentDeposit": 42800,
    "avg3MRentDepositEok": "4억2,800"
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
    "avg1MPrice": 68500,
    "avg1MPriceEok": "6억8,500",
    "avg1MPerPyeong": 2395,
    "avg1MTxCount": 12,
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
    "latestRentDeposit": 39000,
    "latestRentDepositEok": "3억9,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260409",
    "avg1MRentDeposit": 39000,
    "avg1MRentDepositEok": "3억9,000",
    "avg3MRentDeposit": 37400,
    "avg3MRentDepositEok": "3억7,400"
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
    "rentTxCount": 386,
    "latestRentDeposit": 8000,
    "latestRentDepositEok": "8,000만",
    "latestRentMonthly": 174,
    "latestRentDate": "20260409",
    "avg1MRentDeposit": 46000,
    "avg1MRentDepositEok": "4억6,000",
    "avg3MRentDeposit": 57200,
    "avg3MRentDepositEok": "5억7,200"
  },
  "동탄역센트럴푸르지오": {
    "dong": "청계동",
    "latestPrice": 82500,
    "latestPriceEok": "8억2,500",
    "latestArea": 25.107499999999998,
    "latestFloor": 12,
    "latestDate": "20260506",
    "maxPrice": 94500,
    "maxPriceEok": "9억4,500",
    "minPrice": 31000,
    "minPriceEok": "3억1,000",
    "txCount": 1164,
    "avg1MPrice": 84000,
    "avg1MPriceEok": "8억4,000",
    "avg1MPerPyeong": 3222,
    "avg1MTxCount": 7,
    "avg3MPrice": 81300,
    "avg3MPriceEok": "8억1,300",
    "avg3MPerPyeong": 3151,
    "avg3MTxCount": 23,
    "recent": [
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
      },
      {
        "date": "04.25",
        "priceEok": "8억3,000",
        "areaPyeong": 24.805,
        "floor": 16,
        "area": 59.4313
      },
      {
        "date": "04.23",
        "priceEok": "8억3,500",
        "areaPyeong": 24.805,
        "floor": 15,
        "area": 59.4313
      }
    ],
    "rentTxCount": 1616,
    "latestRentDeposit": 30000,
    "latestRentDepositEok": "3억",
    "latestRentMonthly": 40,
    "latestRentDate": "20260412",
    "avg1MRentDeposit": 38700,
    "avg1MRentDepositEok": "3억8,700",
    "avg3MRentDeposit": 40400,
    "avg3MRentDepositEok": "4억400"
  },
  "동탄역센트럴상록아파트": {
    "dong": "영천동",
    "latestPrice": 94000,
    "latestPriceEok": "9억4,000",
    "latestArea": 24.805,
    "latestFloor": 7,
    "latestDate": "20260502",
    "maxPrice": 115000,
    "maxPriceEok": "11억5,000",
    "minPrice": 44800,
    "minPriceEok": "4억4,800",
    "txCount": 630,
    "avg1MPrice": 94200,
    "avg1MPriceEok": "9억4,200",
    "avg1MPerPyeong": 3790,
    "avg1MTxCount": 8,
    "avg3MPrice": 94100,
    "avg3MPriceEok": "9억4,100",
    "avg3MPerPyeong": 3640,
    "avg3MTxCount": 22,
    "recent": [
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
      },
      {
        "date": "04.27",
        "priceEok": "9억3,500",
        "areaPyeong": 25.107499999999998,
        "floor": 17,
        "area": 59.96
      }
    ],
    "rentTxCount": 926,
    "latestRentDeposit": 36750,
    "latestRentDepositEok": "3억6,750",
    "latestRentMonthly": 0,
    "latestRentDate": "20260411",
    "avg1MRentDeposit": 36800,
    "avg1MRentDepositEok": "3억6,800",
    "avg3MRentDeposit": 44200,
    "avg3MRentDepositEok": "4억4,200"
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
    "avg1MPrice": 71700,
    "avg1MPriceEok": "7억1,700",
    "avg1MPerPyeong": 2073,
    "avg1MTxCount": 14,
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
    "avg1MRentDeposit": 44300,
    "avg1MRentDepositEok": "4억4,300",
    "avg3MRentDeposit": 42500,
    "avg3MRentDepositEok": "4억2,500"
  },
  "능동마을이지더원": {
    "dong": "",
    "latestPrice": 53800,
    "latestPriceEok": "5억3,800",
    "latestArea": 30.25,
    "latestFloor": 3,
    "latestDate": "20260506",
    "maxPrice": 68000,
    "maxPriceEok": "6억8,000",
    "minPrice": 23300,
    "minPriceEok": "2억3,300",
    "txCount": 642,
    "avg1MPrice": 56900,
    "avg1MPriceEok": "5억6,900",
    "avg1MPerPyeong": 1830,
    "avg1MTxCount": 7,
    "avg3MPrice": 55800,
    "avg3MPriceEok": "5억5,800",
    "avg3MPerPyeong": 1801,
    "avg3MTxCount": 15,
    "recent": [
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
      },
      {
        "date": "04.19",
        "priceEok": "5억5,000",
        "areaPyeong": 31.7625,
        "floor": 16,
        "area": 83.5573
      }
    ],
    "rentTxCount": 853,
    "latestRentDeposit": 38000,
    "latestRentDepositEok": "3억8,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260413",
    "avg1MRentDeposit": 38000,
    "avg1MRentDepositEok": "3억8,000",
    "avg3MRentDeposit": 33500,
    "avg3MRentDepositEok": "3억3,500"
  },
  "힐스테이트동탄역": {
    "dong": "영천동",
    "latestPrice": 53750,
    "latestPriceEok": "5억3,750",
    "latestArea": 23.2925,
    "latestFloor": 9,
    "latestDate": "20260506",
    "maxPrice": 61000,
    "maxPriceEok": "6억1,000",
    "minPrice": 39000,
    "minPriceEok": "3억9,000",
    "txCount": 153,
    "avg1MPrice": 53100,
    "avg1MPriceEok": "5억3,100",
    "avg1MPerPyeong": 2260,
    "avg1MTxCount": 8,
    "avg3MPrice": 52700,
    "avg3MPriceEok": "5억2,700",
    "avg3MPerPyeong": 2242,
    "avg3MTxCount": 20,
    "recent": [
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
      },
      {
        "date": "04.13",
        "priceEok": "5억2,700",
        "areaPyeong": 23.595,
        "floor": 20,
        "area": 54.4202
      }
    ],
    "rentTxCount": 342,
    "latestRentDeposit": 39000,
    "latestRentDepositEok": "3억9,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260404",
    "avg1MRentDeposit": 39000,
    "avg1MRentDepositEok": "3억9,000",
    "avg3MRentDeposit": 37600,
    "avg3MRentDepositEok": "3억7,600"
  },
  "호반베르디움센트럴포레": {
    "dong": "",
    "latestPrice": 62700,
    "latestPriceEok": "6억2,700",
    "latestArea": 39.4880780525,
    "latestFloor": 5,
    "latestDate": "20260506",
    "maxPrice": 85000,
    "maxPriceEok": "8억5,000",
    "minPrice": 35000,
    "minPriceEok": "3억5,000",
    "txCount": 652,
    "avg1MPrice": 62100,
    "avg1MPriceEok": "6억2,100",
    "avg1MPerPyeong": 1779,
    "avg1MTxCount": 13,
    "avg3MPrice": 61900,
    "avg3MPriceEok": "6억1,900",
    "avg3MPerPyeong": 1779,
    "avg3MTxCount": 29,
    "recent": [
      {
        "date": "05.06",
        "priceEok": "6억2,700",
        "areaPyeong": 39.4880780525,
        "floor": 5,
        "area": 98.1497
      },
      {
        "date": "05.02",
        "priceEok": "6억900",
        "areaPyeong": 34.132770210000004,
        "floor": 10,
        "area": 84.8388
      },
      {
        "date": "05.01",
        "priceEok": "6억9,500",
        "areaPyeong": 39.4880780525,
        "floor": 8,
        "area": 98.1497
      },
      {
        "date": "04.29",
        "priceEok": "5억8,800",
        "areaPyeong": 34.064455425,
        "floor": 1,
        "area": 84.669
      }
    ],
    "rentTxCount": 901,
    "latestRentDeposit": 5000,
    "latestRentDepositEok": "5,000만",
    "latestRentMonthly": 160,
    "latestRentDate": "20260411",
    "avg1MRentDeposit": 39900,
    "avg1MRentDepositEok": "3억9,900",
    "avg3MRentDeposit": 36700,
    "avg3MRentDepositEok": "3억6,700"
  },
  "자연앤데시앙": {
    "dong": "",
    "latestPrice": 53500,
    "latestPriceEok": "5억3,500",
    "latestArea": 34.133253,
    "latestFloor": 3,
    "latestDate": "20260507",
    "maxPrice": 67000,
    "maxPriceEok": "6억7,000",
    "minPrice": 15900,
    "minPriceEok": "1억5,900",
    "txCount": 2070,
    "avg1MPrice": 53000,
    "avg1MPriceEok": "5억3,000",
    "avg1MPerPyeong": 1731,
    "avg1MTxCount": 15,
    "avg3MPrice": 51700,
    "avg3MPriceEok": "5억1,700",
    "avg3MPerPyeong": 1740,
    "avg3MTxCount": 40,
    "recent": [
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
      },
      {
        "date": "04.30",
        "priceEok": "5억6,800",
        "areaPyeong": 34.02462525,
        "floor": 10,
        "area": 84.57
      },
      {
        "date": "04.28",
        "priceEok": "5억4,800",
        "areaPyeong": 34.133253,
        "floor": 4,
        "area": 84.84
      }
    ],
    "rentTxCount": 2172,
    "latestRentDeposit": 27780,
    "latestRentDepositEok": "2억7,780",
    "latestRentMonthly": 0,
    "latestRentDate": "20260412",
    "avg1MRentDeposit": 27800,
    "avg1MRentDepositEok": "2억7,800",
    "avg3MRentDeposit": 31600,
    "avg3MRentDepositEok": "3억1,600"
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
    "rentTxCount": 687,
    "latestRentDeposit": 43000,
    "latestRentDepositEok": "4억3,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260321",
    "avg1MRentDeposit": 43000,
    "avg1MRentDepositEok": "4억3,000",
    "avg3MRentDeposit": 27200,
    "avg3MRentDepositEok": "2억7,200"
  },
  "동탄역신안인스빌리베라2차": {
    "dong": "청계동",
    "latestPrice": 78000,
    "latestPriceEok": "7억8,000",
    "latestArea": 24.805,
    "latestFloor": 20,
    "latestDate": "20260501",
    "maxPrice": 95000,
    "maxPriceEok": "9억5,000",
    "minPrice": 30416,
    "minPriceEok": "3억416",
    "txCount": 496,
    "avg1MPrice": 79900,
    "avg1MPriceEok": "7억9,900",
    "avg1MPerPyeong": 2988,
    "avg1MTxCount": 7,
    "avg3MPrice": 78400,
    "avg3MPriceEok": "7억8,400",
    "avg3MPerPyeong": 2824,
    "avg3MTxCount": 17,
    "recent": [
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
      },
      {
        "date": "04.22",
        "priceEok": "7억4,500",
        "areaPyeong": 24.805,
        "floor": 19,
        "area": 59.968
      }
    ],
    "rentTxCount": 805,
    "latestRentDeposit": 31500,
    "latestRentDepositEok": "3억1,500",
    "latestRentMonthly": 0,
    "latestRentDate": "20260404",
    "avg1MRentDeposit": 31500,
    "avg1MRentDepositEok": "3억1,500",
    "avg3MRentDeposit": 37600,
    "avg3MRentDepositEok": "3억7,600"
  },
  "동탄역신안인스빌리베라1차": {
    "dong": "청계동",
    "latestPrice": 77500,
    "latestPriceEok": "7억7,500",
    "latestArea": 33.5775,
    "latestFloor": 20,
    "latestDate": "20260501",
    "maxPrice": 97000,
    "maxPriceEok": "9억7,000",
    "minPrice": 39500,
    "minPriceEok": "3억9,500",
    "txCount": 425,
    "avg1MPrice": 75800,
    "avg1MPriceEok": "7억5,800",
    "avg1MPerPyeong": 2258,
    "avg1MTxCount": 4,
    "avg3MPrice": 76800,
    "avg3MPriceEok": "7억6,800",
    "avg3MPerPyeong": 2163,
    "avg3MTxCount": 9,
    "recent": [
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
      },
      {
        "date": "04.15",
        "priceEok": "7억1,800",
        "areaPyeong": 33.5775,
        "floor": 5,
        "area": 84.9814
      }
    ],
    "rentTxCount": 753,
    "latestRentDeposit": 54000,
    "latestRentDepositEok": "5억4,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260411",
    "avg1MRentDeposit": 54000,
    "avg1MRentDepositEok": "5억4,000",
    "avg3MRentDeposit": 50500,
    "avg3MRentDepositEok": "5억500"
  },
  "동탄역시범호반써밋": {
    "dong": "청계동",
    "latestPrice": 119400,
    "latestPriceEok": "11억9,400",
    "latestArea": 32.67,
    "latestFloor": 7,
    "latestDate": "20260507",
    "maxPrice": 120000,
    "maxPriceEok": "12억",
    "minPrice": 45000,
    "minPriceEok": "4억5,000",
    "txCount": 674,
    "avg1MPrice": 114600,
    "avg1MPriceEok": "11억4,600",
    "avg1MPerPyeong": 3497,
    "avg1MTxCount": 11,
    "avg3MPrice": 113400,
    "avg3MPriceEok": "11억3,400",
    "avg3MPerPyeong": 3457,
    "avg3MTxCount": 22,
    "recent": [
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
      },
      {
        "date": "05.01",
        "priceEok": "11억5,000",
        "areaPyeong": 32.9725,
        "floor": 16,
        "area": 84.9698
      }
    ],
    "rentTxCount": 1063,
    "latestRentDeposit": 65000,
    "latestRentDepositEok": "6억5,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260404",
    "avg1MRentDeposit": 65000,
    "avg1MRentDepositEok": "6억5,000",
    "avg3MRentDeposit": 55800,
    "avg3MRentDepositEok": "5억5,800"
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
    "txCount": 229,
    "avg1MPrice": 64000,
    "avg1MPriceEok": "6억4,000",
    "avg1MPerPyeong": 1905,
    "avg1MTxCount": 6,
    "avg3MPrice": 62300,
    "avg3MPriceEok": "6억2,300",
    "avg3MPerPyeong": 1917,
    "avg3MTxCount": 15,
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
    "rentTxCount": 313,
    "latestRentDeposit": 18000,
    "latestRentDepositEok": "1억8,000",
    "latestRentMonthly": 100,
    "latestRentDate": "20260406",
    "avg1MRentDeposit": 39800,
    "avg1MRentDepositEok": "3억9,800",
    "avg3MRentDeposit": 37200,
    "avg3MRentDepositEok": "3억7,200"
  },
  "더레이크시티부영6단지": {
    "dong": "",
    "latestPrice": 49600,
    "latestPriceEok": "4억9,600",
    "latestArea": 25.107499999999998,
    "latestFloor": 2,
    "latestDate": "20260506",
    "maxPrice": 83500,
    "maxPriceEok": "8억3,500",
    "minPrice": 30100,
    "minPriceEok": "3억100",
    "txCount": 367,
    "avg1MPrice": 52500,
    "avg1MPriceEok": "5억2,500",
    "avg1MPerPyeong": 2022,
    "avg1MTxCount": 9,
    "avg3MPrice": 52700,
    "avg3MPriceEok": "5억2,700",
    "avg3MPerPyeong": 2053,
    "avg3MTxCount": 27,
    "recent": [
      {
        "date": "05.06",
        "priceEok": "4억9,600",
        "areaPyeong": 25.107499999999998,
        "floor": 2,
        "area": 59.9912
      },
      {
        "date": "05.05",
        "priceEok": "6억5,000",
        "areaPyeong": 33.275,
        "floor": 10,
        "area": 84.5413
      },
      {
        "date": "05.01",
        "priceEok": "5억2,800",
        "areaPyeong": 25.107499999999998,
        "floor": 19,
        "area": 59.9912
      },
      {
        "date": "04.30",
        "priceEok": "5억3,000",
        "areaPyeong": 25.107499999999998,
        "floor": 15,
        "area": 59.9912
      }
    ],
    "rentTxCount": 846,
    "latestRentDeposit": 38850,
    "latestRentDepositEok": "3억8,850",
    "latestRentMonthly": 0,
    "latestRentDate": "20260411",
    "avg1MRentDeposit": 38900,
    "avg1MRentDepositEok": "3억8,900",
    "avg3MRentDeposit": 35200,
    "avg3MRentDepositEok": "3억5,200"
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
    "rentTxCount": 702,
    "latestRentDeposit": 51450,
    "latestRentDepositEok": "5억1,450",
    "latestRentMonthly": 0,
    "latestRentDate": "20260404",
    "avg1MRentDeposit": 51500,
    "avg1MRentDepositEok": "5억1,500",
    "avg3MRentDeposit": 53100,
    "avg3MRentDepositEok": "5억3,100"
  },
  "그린힐반도유보라아이비파크101단지": {
    "dong": "",
    "latestPrice": 40500,
    "latestPriceEok": "4억500",
    "latestArea": 24.502499999999998,
    "latestFloor": 15,
    "latestDate": "20260505",
    "maxPrice": 65000,
    "maxPriceEok": "6억5,000",
    "minPrice": 26000,
    "minPriceEok": "2억6,000",
    "txCount": 629,
    "avg1MPrice": 43900,
    "avg1MPriceEok": "4억3,900",
    "avg1MPerPyeong": 1636,
    "avg1MTxCount": 12,
    "avg3MPrice": 43700,
    "avg3MPriceEok": "4억3,700",
    "avg3MPerPyeong": 1639,
    "avg3MTxCount": 36,
    "recent": [
      {
        "date": "05.05",
        "priceEok": "4억500",
        "areaPyeong": 24.502499999999998,
        "floor": 15,
        "area": 59.8742
      },
      {
        "date": "05.04",
        "priceEok": "4억1,000",
        "areaPyeong": 24.502499999999998,
        "floor": 12,
        "area": 59.8742
      },
      {
        "date": "05.01",
        "priceEok": "5억1,500",
        "areaPyeong": 29.645,
        "floor": 17,
        "area": 74.1263
      },
      {
        "date": "04.29",
        "priceEok": "4억4,800",
        "areaPyeong": 29.645,
        "floor": 9,
        "area": 74.1263
      }
    ],
    "rentTxCount": 886,
    "latestRentDeposit": 32000,
    "latestRentDepositEok": "3억2,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260408",
    "avg1MRentDeposit": 32000,
    "avg1MRentDepositEok": "3억2,000",
    "avg3MRentDeposit": 31200,
    "avg3MRentDepositEok": "3억1,200"
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
    "avg1MPrice": 88300,
    "avg1MPriceEok": "8억8,300",
    "avg1MPerPyeong": 2681,
    "avg1MTxCount": 10,
    "avg3MPrice": 88300,
    "avg3MPriceEok": "8억8,300",
    "avg3MPerPyeong": 2650,
    "avg3MTxCount": 30,
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
    "rentTxCount": 769,
    "latestRentDeposit": 58000,
    "latestRentDepositEok": "5억8,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260411",
    "avg1MRentDeposit": 58000,
    "avg1MRentDepositEok": "5억8,000",
    "avg3MRentDeposit": 47100,
    "avg3MRentDepositEok": "4억7,100"
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
    "avg1MPrice": 44700,
    "avg1MPriceEok": "4억4,700",
    "avg1MPerPyeong": 1727,
    "avg1MTxCount": 14,
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
    "rentTxCount": 387,
    "latestRentDeposit": 30500,
    "latestRentDepositEok": "3억500",
    "latestRentMonthly": 0,
    "latestRentDate": "20260403",
    "avg1MRentDeposit": 30500,
    "avg1MRentDepositEok": "3억500",
    "avg3MRentDeposit": 32500,
    "avg3MRentDepositEok": "3억2,500"
  },
  "동탄역호반써밋": {
    "dong": "청계동",
    "latestPrice": 77000,
    "latestPriceEok": "7억7,000",
    "latestArea": 24.2,
    "latestFloor": 11,
    "latestDate": "20260506",
    "maxPrice": 90000,
    "maxPriceEok": "9억",
    "minPrice": 28000,
    "minPriceEok": "2억8,000",
    "txCount": 750,
    "avg1MPrice": 82300,
    "avg1MPriceEok": "8억2,300",
    "avg1MPerPyeong": 2867,
    "avg1MTxCount": 14,
    "avg3MPrice": 80400,
    "avg3MPriceEok": "8억400",
    "avg3MPerPyeong": 2917,
    "avg3MTxCount": 23,
    "recent": [
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
        "priceEok": "8억5,000",
        "areaPyeong": 32.67,
        "floor": 25,
        "area": 84.9805
      },
      {
        "date": "04.30",
        "priceEok": "8억7,800",
        "areaPyeong": 32.67,
        "floor": 4,
        "area": 84.9805
      }
    ],
    "rentTxCount": 947,
    "latestRentDeposit": 39100,
    "latestRentDepositEok": "3억9,100",
    "latestRentMonthly": 0,
    "latestRentDate": "20260411",
    "avg1MRentDeposit": 36300,
    "avg1MRentDepositEok": "3억6,300",
    "avg3MRentDeposit": 35800,
    "avg3MRentDepositEok": "3억5,800"
  },
  "동탄역시범한화꿈에그린프레스티지": {
    "dong": "청계동",
    "latestPrice": 159000,
    "latestPriceEok": "15억9,000",
    "latestArea": 39.6275,
    "latestFloor": 9,
    "latestDate": "20260505",
    "maxPrice": 198000,
    "maxPriceEok": "19억8,000",
    "minPrice": 46000,
    "minPriceEok": "4억6,000",
    "txCount": 777,
    "avg1MPrice": 155900,
    "avg1MPriceEok": "15억5,900",
    "avg1MPerPyeong": 4062,
    "avg1MTxCount": 11,
    "avg3MPrice": 152000,
    "avg3MPriceEok": "15억2,000",
    "avg3MPerPyeong": 3955,
    "avg3MTxCount": 35,
    "recent": [
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
      },
      {
        "date": "04.30",
        "priceEok": "14억3,000",
        "areaPyeong": 33.275,
        "floor": 10,
        "area": 84.51
      },
      {
        "date": "04.29",
        "priceEok": "16억3,000",
        "areaPyeong": 39.6275,
        "floor": 10,
        "area": 101.94
      }
    ],
    "rentTxCount": 1493,
    "latestRentDeposit": 10000,
    "latestRentDepositEok": "1억",
    "latestRentMonthly": 250,
    "latestRentDate": "20260402",
    "avg1MRentDeposit": 64500,
    "avg1MRentDepositEok": "6억4,500",
    "avg3MRentDeposit": 65400,
    "avg3MRentDepositEok": "6억5,400"
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
    "avg1MPrice": 55500,
    "avg1MPriceEok": "5억5,500",
    "avg1MPerPyeong": 1684,
    "avg1MTxCount": 4,
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
    "rentTxCount": 511,
    "latestRentDeposit": 39000,
    "latestRentDepositEok": "3억9,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260314",
    "avg1MRentDeposit": 39000,
    "avg1MRentDepositEok": "3억9,000",
    "avg3MRentDeposit": 39000,
    "avg3MRentDepositEok": "3억9,000"
  },
  "동탄2하우스디더레이크": {
    "dong": "",
    "latestPrice": 77700,
    "latestPriceEok": "7억7,700",
    "latestArea": 24.502499999999998,
    "latestFloor": 19,
    "latestDate": "20260430",
    "maxPrice": 104000,
    "maxPriceEok": "10억4,000",
    "minPrice": 29800,
    "minPriceEok": "2억9,800",
    "txCount": 1072,
    "avg1MPrice": 77900,
    "avg1MPriceEok": "7억7,900",
    "avg1MPerPyeong": 2984,
    "avg1MTxCount": 10,
    "avg3MPrice": 75300,
    "avg3MPriceEok": "7억5,300",
    "avg3MPerPyeong": 2931,
    "avg3MTxCount": 36,
    "recent": [
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
      },
      {
        "date": "04.24",
        "priceEok": "7억1,500",
        "areaPyeong": 24.502499999999998,
        "floor": 2,
        "area": 59.97
      }
    ],
    "rentTxCount": 1120,
    "latestRentDeposit": 15000,
    "latestRentDepositEok": "1억5,000",
    "latestRentMonthly": 95,
    "latestRentDate": "20260410",
    "avg1MRentDeposit": 38900,
    "avg1MRentDepositEok": "3억8,900",
    "avg3MRentDeposit": 39400,
    "avg3MRentDepositEok": "3억9,400"
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
    "avg1MPrice": 80200,
    "avg1MPriceEok": "8억200",
    "avg1MPerPyeong": 1770,
    "avg1MTxCount": 7,
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
    "rentTxCount": 726,
    "latestRentDeposit": 60000,
    "latestRentDepositEok": "6억",
    "latestRentMonthly": 0,
    "latestRentDate": "20260408",
    "avg1MRentDeposit": 60000,
    "avg1MRentDepositEok": "6억",
    "avg3MRentDeposit": 58800,
    "avg3MRentDepositEok": "5억8,800"
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
    "avg1MPrice": 62800,
    "avg1MPriceEok": "6억2,800",
    "avg1MPerPyeong": 1523,
    "avg1MTxCount": 5,
    "avg3MPrice": 63100,
    "avg3MPriceEok": "6억3,100",
    "avg3MPerPyeong": 1528,
    "avg3MTxCount": 11,
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
    "rentTxCount": 321,
    "latestRentDeposit": 47000,
    "latestRentDepositEok": "4억7,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260404",
    "avg1MRentDeposit": 47000,
    "avg1MRentDepositEok": "4억7,000",
    "avg3MRentDeposit": 40000,
    "avg3MRentDepositEok": "4억"
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
    "avg1MPrice": 77700,
    "avg1MPriceEok": "7억7,700",
    "avg1MPerPyeong": 1973,
    "avg1MTxCount": 8,
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
    "rentTxCount": 279,
    "latestRentDeposit": 54000,
    "latestRentDepositEok": "5억4,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260330",
    "avg1MRentDeposit": 54000,
    "avg1MRentDepositEok": "5억4,000",
    "avg3MRentDeposit": 51000,
    "avg3MRentDepositEok": "5억1,000"
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
    "avg3MPrice": 65100,
    "avg3MPriceEok": "6억5,100",
    "avg3MPerPyeong": 1997,
    "avg3MTxCount": 21,
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
    "rentTxCount": 607,
    "latestRentDeposit": 26460,
    "latestRentDepositEok": "2억6,460",
    "latestRentMonthly": 0,
    "latestRentDate": "20260408",
    "avg1MRentDeposit": 26500,
    "avg1MRentDepositEok": "2억6,500",
    "avg3MRentDeposit": 37900,
    "avg3MRentDepositEok": "3억7,900"
  },
  "동탄역대방디엠시티더센텀": {
    "dong": "영천동",
    "latestPrice": 77500,
    "latestPriceEok": "7억7,500",
    "latestArea": 24.502499999999998,
    "latestFloor": 32,
    "latestDate": "20260506",
    "maxPrice": 86000,
    "maxPriceEok": "8억6,000",
    "minPrice": 51000,
    "minPriceEok": "5억1,000",
    "txCount": 134,
    "avg1MPrice": 73700,
    "avg1MPriceEok": "7억3,700",
    "avg1MPerPyeong": 3031,
    "avg1MTxCount": 9,
    "avg3MPrice": 72100,
    "avg3MPriceEok": "7억2,100",
    "avg3MPerPyeong": 2999,
    "avg3MTxCount": 20,
    "recent": [
      {
        "date": "05.06",
        "priceEok": "7억7,500",
        "areaPyeong": 24.502499999999998,
        "floor": 32,
        "area": 59.4656
      },
      {
        "date": "05.05",
        "priceEok": "7억7,000",
        "areaPyeong": 24.502499999999998,
        "floor": 25,
        "area": 59.4656
      },
      {
        "date": "04.29",
        "priceEok": "7억1,000",
        "areaPyeong": 24.502499999999998,
        "floor": 4,
        "area": 59.4656
      },
      {
        "date": "04.28",
        "priceEok": "7억6,000",
        "areaPyeong": 22.99,
        "floor": 26,
        "area": 56.361
      }
    ],
    "rentTxCount": 387,
    "latestRentDeposit": 3000,
    "latestRentDepositEok": "3,000만",
    "latestRentMonthly": 180,
    "latestRentDate": "20260411",
    "avg1MRentDeposit": 42300,
    "avg1MRentDepositEok": "4억2,300",
    "avg3MRentDeposit": 40100,
    "avg3MRentDepositEok": "4억100"
  },
  "금호어울림레이크": {
    "dong": "",
    "latestPrice": 66500,
    "latestPriceEok": "6억6,500",
    "latestArea": 24.805,
    "latestFloor": 17,
    "latestDate": "20260505",
    "maxPrice": 95000,
    "maxPriceEok": "9억5,000",
    "minPrice": 29000,
    "minPriceEok": "2억9,000",
    "txCount": 403,
    "avg1MPrice": 69200,
    "avg1MPriceEok": "6억9,200",
    "avg1MPerPyeong": 2652,
    "avg1MTxCount": 14,
    "avg3MPrice": 69200,
    "avg3MPriceEok": "6억9,200",
    "avg3MPerPyeong": 2689,
    "avg3MTxCount": 33,
    "recent": [
      {
        "date": "05.05",
        "priceEok": "6억6,500",
        "areaPyeong": 24.805,
        "floor": 17,
        "area": 59.96
      },
      {
        "date": "05.02",
        "priceEok": "6억7,000",
        "areaPyeong": 24.502499999999998,
        "floor": 10,
        "area": 59.93
      },
      {
        "date": "05.02",
        "priceEok": "6억4,600",
        "areaPyeong": 24.502499999999998,
        "floor": 5,
        "area": 59.93
      },
      {
        "date": "04.29",
        "priceEok": "7억500",
        "areaPyeong": 24.502499999999998,
        "floor": 13,
        "area": 59.93
      }
    ],
    "rentTxCount": 704,
    "latestRentDeposit": 39000,
    "latestRentDepositEok": "3억9,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260407",
    "avg1MRentDeposit": 39000,
    "avg1MRentDepositEok": "3억9,000",
    "avg3MRentDeposit": 36700,
    "avg3MRentDepositEok": "3억6,700"
  },
  "한신더휴": {
    "dong": "",
    "latestPrice": 72500,
    "latestPriceEok": "7억2,500",
    "latestArea": 33.560422665000004,
    "latestFloor": 21,
    "latestDate": "20260428",
    "maxPrice": 80900,
    "maxPriceEok": "8억900",
    "minPrice": 37465,
    "minPriceEok": "3억7,465",
    "txCount": 319,
    "avg1MPrice": 70800,
    "avg1MPriceEok": "7억800",
    "avg1MPerPyeong": 2182,
    "avg1MTxCount": 5,
    "avg3MPrice": 68800,
    "avg3MPriceEok": "6억8,800",
    "avg3MPerPyeong": 2147,
    "avg3MTxCount": 20,
    "recent": [
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
      },
      {
        "date": "04.18",
        "priceEok": "7억1,000",
        "areaPyeong": 33.560422665000004,
        "floor": 10,
        "area": 83.4162
      }
    ],
    "rentTxCount": 400,
    "latestRentDeposit": 38000,
    "latestRentDepositEok": "3억8,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260330",
    "avg1MRentDeposit": 38000,
    "avg1MRentDepositEok": "3억8,000",
    "avg3MRentDeposit": 36700,
    "avg3MRentDepositEok": "3억6,700"
  },
  "시범한빛마을동탄아이파크": {
    "dong": "",
    "latestPrice": 81700,
    "latestPriceEok": "8억1,700",
    "latestArea": 24.80655485,
    "latestFloor": 10,
    "latestDate": "20260428",
    "maxPrice": 98000,
    "maxPriceEok": "9억8,000",
    "minPrice": 21500,
    "minPriceEok": "2억1,500",
    "txCount": 854,
    "avg1MPrice": 84000,
    "avg1MPriceEok": "8억4,000",
    "avg1MPerPyeong": 3119,
    "avg1MTxCount": 4,
    "avg3MPrice": 88200,
    "avg3MPriceEok": "8억8,200",
    "avg3MPerPyeong": 2801,
    "avg3MTxCount": 16,
    "recent": [
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
      },
      {
        "date": "04.09",
        "priceEok": "9억7,000",
        "areaPyeong": 34.181532,
        "floor": 19,
        "area": 84.96
      }
    ],
    "rentTxCount": 1414,
    "latestRentDeposit": 42000,
    "latestRentDepositEok": "4억2,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260409",
    "avg1MRentDeposit": 42000,
    "avg1MRentDepositEok": "4억2,000",
    "avg3MRentDeposit": 43200,
    "avg3MRentDepositEok": "4억3,200"
  },
  "동탄역시범예미지아파트": {
    "dong": "",
    "latestPrice": 114500,
    "latestPriceEok": "11억4,500",
    "latestArea": 32.9725,
    "latestFloor": 5,
    "latestDate": "20260502",
    "maxPrice": 118000,
    "maxPriceEok": "11억8,000",
    "minPrice": 38375,
    "minPriceEok": "3억8,375",
    "txCount": 328,
    "avg1MPrice": 106800,
    "avg1MPriceEok": "10억6,800",
    "avg1MPerPyeong": 3282,
    "avg1MTxCount": 8,
    "avg3MPrice": 105300,
    "avg3MPriceEok": "10억5,300",
    "avg3MPerPyeong": 3209,
    "avg3MTxCount": 11,
    "recent": [
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
      },
      {
        "date": "04.24",
        "priceEok": "10억4,800",
        "areaPyeong": 32.9725,
        "floor": 5,
        "area": 84.8
      },
      {
        "date": "04.20",
        "priceEok": "11억8,000",
        "areaPyeong": 34.1825,
        "floor": 10,
        "area": 84.9486
      }
    ],
    "rentTxCount": 473,
    "latestRentDeposit": 43860,
    "latestRentDepositEok": "4억3,860",
    "latestRentMonthly": 0,
    "latestRentDate": "20260221",
    "avg1MRentDeposit": 43900,
    "avg1MRentDepositEok": "4억3,900",
    "avg3MRentDeposit": 47400,
    "avg3MRentDepositEok": "4억7,400"
  },
  "힐스테이트동탄": {
    "dong": "",
    "latestPrice": 74200,
    "latestPriceEok": "7억4,200",
    "latestArea": 30.133378082500002,
    "latestFloor": 10,
    "latestDate": "20260506",
    "maxPrice": 96500,
    "maxPriceEok": "9억6,500",
    "minPrice": 40332,
    "minPriceEok": "4억332",
    "txCount": 466,
    "avg1MPrice": 82000,
    "avg1MPriceEok": "8억2,000",
    "avg1MPerPyeong": 2516,
    "avg1MTxCount": 13,
    "avg3MPrice": 78800,
    "avg3MPriceEok": "7억8,800",
    "avg3MPerPyeong": 2474,
    "avg3MTxCount": 45,
    "recent": [
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
      },
      {
        "date": "04.24",
        "priceEok": "7억8,500",
        "areaPyeong": 30.164598502500002,
        "floor": 15,
        "area": 74.9757
      }
    ],
    "rentTxCount": 638,
    "latestRentDeposit": 44000,
    "latestRentDepositEok": "4억4,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260401",
    "avg1MRentDeposit": 44000,
    "avg1MRentDepositEok": "4억4,000",
    "avg3MRentDeposit": 41500,
    "avg3MRentDepositEok": "4억1,500"
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
    "avg3MPrice": 52700,
    "avg3MPriceEok": "5억2,700",
    "avg3MPerPyeong": 1681,
    "avg3MTxCount": 12,
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
    "rentTxCount": 1025,
    "latestRentDeposit": 34000,
    "latestRentDepositEok": "3억4,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260406",
    "avg1MRentDeposit": 34000,
    "avg1MRentDepositEok": "3억4,000",
    "avg3MRentDeposit": 34100,
    "avg3MRentDepositEok": "3억4,100"
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
    "rentTxCount": 681,
    "latestRentDeposit": 50000,
    "latestRentDepositEok": "5억",
    "latestRentMonthly": 0,
    "latestRentDate": "20260321",
    "avg1MRentDeposit": 50000,
    "avg1MRentDepositEok": "5억",
    "avg3MRentDeposit": 45700,
    "avg3MRentDepositEok": "4억5,700"
  },
  "르파비스": {
    "dong": "",
    "latestPrice": 59800,
    "latestPriceEok": "5억9,800",
    "latestArea": 34.1573925,
    "latestFloor": 12,
    "latestDate": "20260427",
    "maxPrice": 63500,
    "maxPriceEok": "6억3,500",
    "minPrice": 39000,
    "minPriceEok": "3억9,000",
    "txCount": 76,
    "avg1MPrice": 51700,
    "avg1MPriceEok": "5억1,700",
    "avg1MPerPyeong": 1978,
    "avg1MTxCount": 4,
    "avg3MPrice": 49200,
    "avg3MPriceEok": "4억9,200",
    "avg3MPerPyeong": 1989,
    "avg3MTxCount": 12,
    "recent": [
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
      },
      {
        "date": "04.17",
        "priceEok": "4억3,800",
        "areaPyeong": 20.91687675,
        "floor": 11,
        "area": 51.99
      }
    ],
    "rentTxCount": 698,
    "latestRentDeposit": 17654,
    "latestRentDepositEok": "1억7,654",
    "latestRentMonthly": 35,
    "latestRentDate": "20260212",
    "avg1MRentDeposit": 25300,
    "avg1MRentDepositEok": "2억5,300",
    "avg3MRentDeposit": 18700,
    "avg3MRentDepositEok": "1억8,700"
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
    "avg1MPrice": 59200,
    "avg1MPriceEok": "5억9,200",
    "avg1MPerPyeong": 1516,
    "avg1MTxCount": 6,
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
    "rentTxCount": 594,
    "latestRentDeposit": 33000,
    "latestRentDepositEok": "3억3,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260305",
    "avg1MRentDeposit": 33000,
    "avg1MRentDepositEok": "3억3,000",
    "avg3MRentDeposit": 34200,
    "avg3MRentDepositEok": "3억4,200"
  },
  "동탄2아이파크2단지": {
    "dong": "",
    "latestPrice": 50400,
    "latestPriceEok": "5억400",
    "latestArea": 33.275,
    "latestFloor": 8,
    "latestDate": "20260427",
    "maxPrice": 83800,
    "maxPriceEok": "8억3,800",
    "minPrice": 35700,
    "minPriceEok": "3억5,700",
    "txCount": 141,
    "avg1MPrice": 51500,
    "avg1MPriceEok": "5억1,500",
    "avg1MPerPyeong": 1546,
    "avg1MTxCount": 2,
    "avg3MPrice": 52900,
    "avg3MPriceEok": "5억2,900",
    "avg3MPerPyeong": 1549,
    "avg3MTxCount": 11,
    "recent": [
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
      },
      {
        "date": "03.27",
        "priceEok": "5억2,100",
        "areaPyeong": 33.275,
        "floor": 10,
        "area": 84.8688
      }
    ],
    "rentTxCount": 260,
    "latestRentDeposit": 35000,
    "latestRentDepositEok": "3억5,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260227",
    "avg1MRentDeposit": 35000,
    "avg1MRentDepositEok": "3억5,000",
    "avg3MRentDeposit": 36500,
    "avg3MRentDepositEok": "3억6,500"
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
    "avg1MPrice": 77900,
    "avg1MPriceEok": "7억7,900",
    "avg1MPerPyeong": 2374,
    "avg1MTxCount": 4,
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
    "rentTxCount": 407,
    "latestRentDeposit": 45000,
    "latestRentDepositEok": "4억5,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260321",
    "avg1MRentDeposit": 45000,
    "avg1MRentDepositEok": "4억5,000",
    "avg3MRentDeposit": 39200,
    "avg3MRentDepositEok": "3억9,200"
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
    "rentTxCount": 1320,
    "latestRentDeposit": 45000,
    "latestRentDepositEok": "4억5,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260412",
    "avg1MRentDeposit": 45000,
    "avg1MRentDepositEok": "4억5,000",
    "avg3MRentDeposit": 44400,
    "avg3MRentDepositEok": "4억4,400"
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
  "시범한빛마을한화꿈에그린": {
    "dong": "",
    "latestPrice": 83500,
    "latestPriceEok": "8억3,500",
    "latestArea": 34.11716,
    "latestFloor": 11,
    "latestDate": "20260425",
    "maxPrice": 92000,
    "maxPriceEok": "9억2,000",
    "minPrice": 28000,
    "minPriceEok": "2억8,000",
    "txCount": 594,
    "avg1MPrice": 80700,
    "avg1MPriceEok": "8억700",
    "avg1MPerPyeong": 2365,
    "avg1MTxCount": 3,
    "avg3MPrice": 80700,
    "avg3MPriceEok": "8억700",
    "avg3MPerPyeong": 2367,
    "avg3MTxCount": 6,
    "recent": [
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
      },
      {
        "date": "03.30",
        "priceEok": "8억1,500",
        "areaPyeong": 34.088997250000006,
        "floor": 21,
        "area": 84.73
      }
    ],
    "rentTxCount": 842,
    "latestRentDeposit": 43000,
    "latestRentDepositEok": "4억3,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260324",
    "avg1MRentDeposit": 43000,
    "avg1MRentDepositEok": "4억3,000",
    "avg3MRentDeposit": 41800,
    "avg3MRentDepositEok": "4억1,800"
  },
  "시범한빛마을삼부르네상스": {
    "dong": "",
    "latestPrice": 74000,
    "latestPriceEok": "7억4,000",
    "latestArea": 34.0817554,
    "latestFloor": 13,
    "latestDate": "20260425",
    "maxPrice": 82000,
    "maxPriceEok": "8억2,000",
    "minPrice": 28000,
    "minPriceEok": "2억8,000",
    "txCount": 779,
    "avg1MPrice": 74000,
    "avg1MPriceEok": "7억4,000",
    "avg1MPerPyeong": 2172,
    "avg1MTxCount": 2,
    "avg3MPrice": 74200,
    "avg3MPriceEok": "7억4,200",
    "avg3MPerPyeong": 2176,
    "avg3MTxCount": 6,
    "recent": [
      {
        "date": "04.25",
        "priceEok": "7억4,000",
        "areaPyeong": 34.0817554,
        "floor": 13,
        "area": 84.712
      },
      {
        "date": "04.23",
        "priceEok": "7억4,000",
        "areaPyeong": 34.073306575000004,
        "floor": 19,
        "area": 84.691
      },
      {
        "date": "04.02",
        "priceEok": "6억6,000",
        "areaPyeong": 34.1042856,
        "floor": 20,
        "area": 84.768
      },
      {
        "date": "02.28",
        "priceEok": "7억",
        "areaPyeong": 34.073306575000004,
        "floor": 18,
        "area": 84.691
      }
    ],
    "rentTxCount": 1090,
    "latestRentDeposit": 5000,
    "latestRentDepositEok": "5,000만",
    "latestRentMonthly": 170,
    "latestRentDate": "20260313",
    "avg1MRentDeposit": 42100,
    "avg1MRentDepositEok": "4억2,100",
    "avg3MRentDeposit": 39300,
    "avg3MRentDepositEok": "3억9,300"
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
    "avg1MPrice": 82800,
    "avg1MPriceEok": "8억2,800",
    "avg1MPerPyeong": 2165,
    "avg1MTxCount": 3,
    "avg3MPrice": 77500,
    "avg3MPriceEok": "7억7,500",
    "avg3MPerPyeong": 2177,
    "avg3MTxCount": 8,
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
    "rentTxCount": 633,
    "latestRentDeposit": 41000,
    "latestRentDepositEok": "4억1,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260311",
    "avg1MRentDeposit": 41000,
    "avg1MRentDepositEok": "4억1,000",
    "avg3MRentDeposit": 45600,
    "avg3MRentDepositEok": "4억5,600"
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
    "avg1MPrice": 91100,
    "avg1MPriceEok": "9억1,100",
    "avg1MPerPyeong": 2834,
    "avg1MTxCount": 5,
    "avg3MPrice": 90700,
    "avg3MPriceEok": "9억700",
    "avg3MPerPyeong": 2795,
    "avg3MTxCount": 19,
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
    "rentTxCount": 589,
    "latestRentDeposit": 5000,
    "latestRentDepositEok": "5,000만",
    "latestRentMonthly": 168,
    "latestRentDate": "20260406",
    "avg1MRentDeposit": 41700,
    "avg1MRentDepositEok": "4억1,700",
    "avg3MRentDeposit": 44500,
    "avg3MRentDepositEok": "4억4,500"
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
    "avg1MPrice": 130000,
    "avg1MPriceEok": "13억",
    "avg1MPerPyeong": 3162,
    "avg1MTxCount": 10,
    "avg3MPrice": 130300,
    "avg3MPriceEok": "13억300",
    "avg3MPerPyeong": 3179,
    "avg3MTxCount": 21,
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
    "rentTxCount": 492,
    "latestRentDeposit": 84500,
    "latestRentDepositEok": "8억4,500",
    "latestRentMonthly": 0,
    "latestRentDate": "20260409",
    "avg1MRentDeposit": 84500,
    "avg1MRentDepositEok": "8억4,500",
    "avg3MRentDeposit": 75000,
    "avg3MRentDepositEok": "7억5,000"
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
    "avg3MPrice": 92400,
    "avg3MPriceEok": "9억2,400",
    "avg3MPerPyeong": 2811,
    "avg3MTxCount": 15,
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
    "rentTxCount": 272,
    "latestRentDeposit": 12000,
    "latestRentDepositEok": "1억2,000",
    "latestRentMonthly": 170,
    "latestRentDate": "20260410",
    "avg1MRentDeposit": 53000,
    "avg1MRentDepositEok": "5억3,000",
    "avg3MRentDeposit": 52500,
    "avg3MRentDepositEok": "5억2,500"
  },
  "시범한빛마을케이씨씨스위첸": {
    "dong": "",
    "latestPrice": 66000,
    "latestPriceEok": "6억6,000",
    "latestArea": 34.09012376,
    "latestFloor": 2,
    "latestDate": "20260424",
    "maxPrice": 75000,
    "maxPriceEok": "7억5,000",
    "minPrice": 26800,
    "minPriceEok": "2억6,800",
    "txCount": 590,
    "avg1MPrice": 67400,
    "avg1MPriceEok": "6억7,400",
    "avg1MPerPyeong": 1977,
    "avg1MTxCount": 2,
    "avg3MPrice": 66200,
    "avg3MPriceEok": "6억6,200",
    "avg3MPerPyeong": 1942,
    "avg3MTxCount": 13,
    "recent": [
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
      },
      {
        "date": "03.13",
        "priceEok": "6억7,700",
        "areaPyeong": 34.0574952025,
        "floor": 15,
        "area": 84.6517
      }
    ],
    "rentTxCount": 688,
    "latestRentDeposit": 39000,
    "latestRentDepositEok": "3억9,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260410",
    "avg1MRentDeposit": 39000,
    "avg1MRentDepositEok": "3억9,000",
    "avg3MRentDeposit": 38900,
    "avg3MRentDepositEok": "3억8,900"
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
    "avg3MPrice": 76300,
    "avg3MPriceEok": "7억6,300",
    "avg3MPerPyeong": 2153,
    "avg3MTxCount": 7,
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
    "rentTxCount": 675,
    "latestRentDeposit": 45000,
    "latestRentDepositEok": "4억5,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260315",
    "avg1MRentDeposit": 45000,
    "avg1MRentDepositEok": "4억5,000",
    "avg3MRentDeposit": 46300,
    "avg3MRentDepositEok": "4억6,300"
  },
  "솔빛마을경남아너스빌": {
    "dong": "",
    "latestPrice": 80000,
    "latestPriceEok": "8억",
    "latestArea": 41.5982726775,
    "latestFloor": 2,
    "latestDate": "20260502",
    "maxPrice": 97000,
    "maxPriceEok": "9억7,000",
    "minPrice": 32000,
    "minPriceEok": "3억2,000",
    "txCount": 606,
    "avg1MPrice": 90200,
    "avg1MPriceEok": "9억200",
    "avg1MPerPyeong": 1870,
    "avg1MTxCount": 3,
    "avg3MPrice": 87800,
    "avg3MPriceEok": "8억7,800",
    "avg3MPerPyeong": 1917,
    "avg3MTxCount": 7,
    "recent": [
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
      },
      {
        "date": "04.07",
        "priceEok": "8억300",
        "areaPyeong": 41.5982726775,
        "floor": 2,
        "area": 103.3947
      }
    ],
    "rentTxCount": 724,
    "latestRentDeposit": 54000,
    "latestRentDepositEok": "5억4,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260404",
    "avg1MRentDeposit": 54000,
    "avg1MRentDepositEok": "5억4,000",
    "avg3MRentDeposit": 56000,
    "avg3MRentDepositEok": "5억6,000"
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
    "avg1MPrice": 125000,
    "avg1MPriceEok": "12억5,000",
    "avg1MPerPyeong": 3597,
    "avg1MTxCount": 8,
    "avg3MPrice": 120400,
    "avg3MPriceEok": "12억400",
    "avg3MPerPyeong": 3548,
    "avg3MTxCount": 22,
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
  "동탄역더힐": {
    "dong": "청계동",
    "latestPrice": 62000,
    "latestPriceEok": "6억2,000",
    "latestArea": 33.275,
    "latestFloor": 2,
    "latestDate": "20260507",
    "maxPrice": 94500,
    "maxPriceEok": "9억4,500",
    "minPrice": 34800,
    "minPriceEok": "3억4,800",
    "txCount": 442,
    "avg1MPrice": 65500,
    "avg1MPriceEok": "6억5,500",
    "avg1MPerPyeong": 1962,
    "avg1MTxCount": 6,
    "avg3MPrice": 65100,
    "avg3MPriceEok": "6억5,100",
    "avg3MPerPyeong": 1950,
    "avg3MTxCount": 14,
    "recent": [
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
      },
      {
        "date": "04.18",
        "priceEok": "6억1,800",
        "areaPyeong": 33.5775,
        "floor": 2,
        "area": 85.1849
      },
      {
        "date": "04.18",
        "priceEok": "6억6,600",
        "areaPyeong": 33.275,
        "floor": 4,
        "area": 84.5202
      }
    ],
    "rentTxCount": 845,
    "latestRentDeposit": 40000,
    "latestRentDepositEok": "4억",
    "latestRentMonthly": 0,
    "latestRentDate": "20260411",
    "avg1MRentDeposit": 40000,
    "avg1MRentDepositEok": "4억",
    "avg3MRentDeposit": 39500,
    "avg3MRentDepositEok": "3억9,500"
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
    "avg1MPrice": 67000,
    "avg1MPriceEok": "6억7,000",
    "avg1MPerPyeong": 2077,
    "avg1MTxCount": 5,
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
    "rentTxCount": 345,
    "latestRentDeposit": 56000,
    "latestRentDepositEok": "5억6,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260407",
    "avg1MRentDeposit": 56000,
    "avg1MRentDepositEok": "5억6,000",
    "avg3MRentDeposit": 43300,
    "avg3MRentDepositEok": "4억3,300"
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
    "rentTxCount": 704,
    "latestRentDeposit": 40000,
    "latestRentDepositEok": "4억",
    "latestRentMonthly": 50,
    "latestRentDate": "20260404",
    "avg1MRentDeposit": 50900,
    "avg1MRentDepositEok": "5억900",
    "avg3MRentDeposit": 54300,
    "avg3MRentDepositEok": "5억4,300"
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
    "avg1MPrice": 72600,
    "avg1MPriceEok": "7억2,600",
    "avg1MPerPyeong": 2597,
    "avg1MTxCount": 5,
    "avg3MPrice": 67100,
    "avg3MPriceEok": "6억7,100",
    "avg3MPerPyeong": 2562,
    "avg3MTxCount": 17,
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
    "avg1MRentDeposit": 39600,
    "avg1MRentDepositEok": "3억9,600",
    "avg3MRentDeposit": 36100,
    "avg3MRentDepositEok": "3억6,100"
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
    "avg1MPrice": 62600,
    "avg1MPriceEok": "6억2,600",
    "avg1MPerPyeong": 2374,
    "avg1MTxCount": 11,
    "avg3MPrice": 56900,
    "avg3MPriceEok": "5억6,900",
    "avg3MPerPyeong": 2348,
    "avg3MTxCount": 32,
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
    "rentTxCount": 898,
    "latestRentDeposit": 40000,
    "latestRentDepositEok": "4억",
    "latestRentMonthly": 30,
    "latestRentDate": "20260411",
    "avg1MRentDeposit": 41900,
    "avg1MRentDepositEok": "4억1,900",
    "avg3MRentDeposit": 35200,
    "avg3MRentDepositEok": "3억5,200"
  },
  "동탄푸른마을신일해피트리": {
    "dong": "",
    "latestPrice": 45300,
    "latestPriceEok": "4억5,300",
    "latestArea": 24.087197749999998,
    "latestFloor": 3,
    "latestDate": "20260423",
    "maxPrice": 68000,
    "maxPriceEok": "6억8,000",
    "minPrice": 15100,
    "minPriceEok": "1억5,100",
    "txCount": 1771,
    "avg1MPrice": 44500,
    "avg1MPriceEok": "4억4,500",
    "avg1MPerPyeong": 1857,
    "avg1MTxCount": 3,
    "avg3MPrice": 46200,
    "avg3MPriceEok": "4억6,200",
    "avg3MPerPyeong": 1739,
    "avg3MTxCount": 10,
    "recent": [
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
      },
      {
        "date": "04.14",
        "priceEok": "4억3,000",
        "areaPyeong": 23.757291249999998,
        "floor": 12,
        "area": 59.05
      },
      {
        "date": "04.03",
        "priceEok": "5억2,400",
        "areaPyeong": 34.149346,
        "floor": 13,
        "area": 84.88
      }
    ],
    "rentTxCount": 1702,
    "latestRentDeposit": 2000,
    "latestRentDepositEok": "2,000만",
    "latestRentMonthly": 115,
    "latestRentDate": "20260409",
    "avg1MRentDeposit": 27100,
    "avg1MRentDepositEok": "2억7,100",
    "avg3MRentDeposit": 28300,
    "avg3MRentDepositEok": "2억8,300"
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
    "txCount": 334,
    "avg1MPrice": 121600,
    "avg1MPriceEok": "12억1,600",
    "avg1MPerPyeong": 3500,
    "avg1MTxCount": 6,
    "avg3MPrice": 121800,
    "avg3MPriceEok": "12억1,800",
    "avg3MPerPyeong": 3436,
    "avg3MTxCount": 11,
    "recent": [
      {
        "date": "05.08",
        "priceEok": "12억3,800",
        "areaPyeong": 33.879999999999995,
        "floor": 19,
        "area": 84.87
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
      },
      {
        "date": "04.16",
        "priceEok": "12억",
        "areaPyeong": 33.879999999999995,
        "floor": 8,
        "area": 84.87
      }
    ],
    "rentTxCount": 536,
    "latestRentDeposit": 55000,
    "latestRentDepositEok": "5억5,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260331",
    "avg1MRentDeposit": 55000,
    "avg1MRentDepositEok": "5억5,000",
    "avg3MRentDeposit": 53600,
    "avg3MRentDepositEok": "5억3,600"
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
    "avg1MPrice": 116000,
    "avg1MPriceEok": "11억6,000",
    "avg1MPerPyeong": 3697,
    "avg1MTxCount": 4,
    "avg3MPrice": 119400,
    "avg3MPriceEok": "11억9,400",
    "avg3MPerPyeong": 3701,
    "avg3MTxCount": 11,
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
    "avg3MPrice": 57200,
    "avg3MPriceEok": "5억7,200",
    "avg3MPerPyeong": 1638,
    "avg3MTxCount": 9,
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
    "rentTxCount": 223,
    "latestRentDeposit": 40000,
    "latestRentDepositEok": "4억",
    "latestRentMonthly": 20,
    "latestRentDate": "20260410",
    "avg1MRentDeposit": 44400,
    "avg1MRentDepositEok": "4억4,400",
    "avg3MRentDeposit": 35300,
    "avg3MRentDepositEok": "3억5,300"
  },
  "동탄2신도시호반베르디움33단지": {
    "dong": "",
    "latestPrice": 53200,
    "latestPriceEok": "5억3,200",
    "latestArea": 34.1825,
    "latestFloor": 15,
    "latestDate": "20260507",
    "maxPrice": 71800,
    "maxPriceEok": "7억1,800",
    "minPrice": 33400,
    "minPriceEok": "3억3,400",
    "txCount": 163,
    "avg1MPrice": 48700,
    "avg1MPriceEok": "4억8,700",
    "avg1MPerPyeong": 1524,
    "avg1MTxCount": 4,
    "avg3MPrice": 48700,
    "avg3MPriceEok": "4억8,700",
    "avg3MPerPyeong": 1503,
    "avg3MTxCount": 10,
    "recent": [
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
      },
      {
        "date": "04.16",
        "priceEok": "4억6,000",
        "areaPyeong": 31.1575,
        "floor": 5,
        "area": 76.4781
      }
    ],
    "rentTxCount": 274,
    "latestRentDeposit": 32000,
    "latestRentDepositEok": "3억2,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260331",
    "avg1MRentDeposit": 32000,
    "avg1MRentDepositEok": "3억2,000",
    "avg3MRentDeposit": 33500,
    "avg3MRentDepositEok": "3억3,500"
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
    "avg3MPrice": 78400,
    "avg3MPriceEok": "7억8,400",
    "avg3MPerPyeong": 2018,
    "avg3MTxCount": 6,
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
    "rentTxCount": 975,
    "latestRentDeposit": 46000,
    "latestRentDepositEok": "4억6,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260413",
    "avg1MRentDeposit": 46000,
    "avg1MRentDepositEok": "4억6,000",
    "avg3MRentDeposit": 46600,
    "avg3MRentDepositEok": "4억6,600"
  },
  "동탄역동원로얄듀크1차": {
    "dong": "영천동",
    "latestPrice": 84900,
    "latestPriceEok": "8억4,900",
    "latestArea": 33.275,
    "latestFloor": 3,
    "latestDate": "20260504",
    "maxPrice": 100000,
    "maxPriceEok": "10억",
    "minPrice": 39000,
    "minPriceEok": "3억9,000",
    "txCount": 152,
    "avg1MPrice": 76600,
    "avg1MPriceEok": "7억6,600",
    "avg1MPerPyeong": 2658,
    "avg1MTxCount": 3,
    "avg3MPrice": 74500,
    "avg3MPriceEok": "7억4,500",
    "avg3MPerPyeong": 2577,
    "avg3MTxCount": 20,
    "recent": [
      {
        "date": "05.04",
        "priceEok": "8억4,900",
        "areaPyeong": 33.275,
        "floor": 3,
        "area": 84.9889
      },
      {
        "date": "04.22",
        "priceEok": "7억3,000",
        "areaPyeong": 24.805,
        "floor": 15,
        "area": 59.7224
      },
      {
        "date": "04.11",
        "priceEok": "7억2,000",
        "areaPyeong": 29.04,
        "floor": 8,
        "area": 73.1098
      },
      {
        "date": "03.11",
        "priceEok": "7억3,250",
        "areaPyeong": 29.04,
        "floor": 16,
        "area": 73.1098
      }
    ],
    "rentTxCount": 355,
    "latestRentDeposit": 45000,
    "latestRentDepositEok": "4억5,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260411",
    "avg1MRentDeposit": 45000,
    "avg1MRentDepositEok": "4억5,000",
    "avg3MRentDeposit": 40200,
    "avg3MRentDepositEok": "4억200"
  },
  "동탄센트럴포레스트": {
    "dong": "",
    "latestPrice": 48700,
    "latestPriceEok": "4억8,700",
    "latestArea": 29.947499999999998,
    "latestFloor": 17,
    "latestDate": "20260422",
    "maxPrice": 63400,
    "maxPriceEok": "6억3,400",
    "minPrice": 19950,
    "minPriceEok": "1억9,950",
    "txCount": 290,
    "avg1MPrice": 51700,
    "avg1MPriceEok": "5억1,700",
    "avg1MPerPyeong": 1679,
    "avg1MTxCount": 5,
    "avg3MPrice": 51700,
    "avg3MPriceEok": "5억1,700",
    "avg3MPerPyeong": 1681,
    "avg3MTxCount": 15,
    "recent": [
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
      },
      {
        "date": "04.13",
        "priceEok": "5억1,700",
        "areaPyeong": 29.947499999999998,
        "floor": 8,
        "area": 74.73
      }
    ],
    "rentTxCount": 527,
    "latestRentDeposit": 5000,
    "latestRentDepositEok": "5,000만",
    "latestRentMonthly": 75,
    "latestRentDate": "20260314",
    "avg1MRentDeposit": 21400,
    "avg1MRentDepositEok": "2억1,400",
    "avg3MRentDeposit": 28100,
    "avg3MRentDepositEok": "2억8,100"
  },
  "동탄2신도시호반베르디움22단지": {
    "dong": "",
    "latestPrice": 57900,
    "latestPriceEok": "5억7,900",
    "latestArea": 23.2925,
    "latestFloor": 15,
    "latestDate": "20260507",
    "maxPrice": 64900,
    "maxPriceEok": "6억4,900",
    "minPrice": 27468,
    "minPriceEok": "2억7,468",
    "txCount": 523,
    "avg1MPrice": 56700,
    "avg1MPriceEok": "5억6,700",
    "avg1MPerPyeong": 2424,
    "avg1MTxCount": 5,
    "avg3MPrice": 55400,
    "avg3MPriceEok": "5억5,400",
    "avg3MPerPyeong": 2375,
    "avg3MTxCount": 37,
    "recent": [
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
      },
      {
        "date": "04.18",
        "priceEok": "5억900",
        "areaPyeong": 23.595,
        "floor": 1,
        "area": 53.788
      },
      {
        "date": "04.14",
        "priceEok": "5억7,300",
        "areaPyeong": 23.2925,
        "floor": 7,
        "area": 53.4754
      }
    ],
    "rentTxCount": 785,
    "latestRentDeposit": 36000,
    "latestRentDepositEok": "3억6,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260411",
    "avg1MRentDeposit": 34200,
    "avg1MRentDepositEok": "3억4,200",
    "avg3MRentDeposit": 32700,
    "avg3MRentDepositEok": "3억2,700"
  },
  "더레이크시티부영5단지": {
    "dong": "",
    "latestPrice": 76000,
    "latestPriceEok": "7억6,000",
    "latestArea": 33.275,
    "latestFloor": 5,
    "latestDate": "20260505",
    "maxPrice": 101000,
    "maxPriceEok": "10억1,000",
    "minPrice": 38500,
    "minPriceEok": "3억8,500",
    "txCount": 266,
    "avg1MPrice": 74800,
    "avg1MPriceEok": "7억4,800",
    "avg1MPerPyeong": 2371,
    "avg1MTxCount": 5,
    "avg3MPrice": 71200,
    "avg3MPriceEok": "7억1,200",
    "avg3MPerPyeong": 2386,
    "avg3MTxCount": 17,
    "recent": [
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
      },
      {
        "date": "04.15",
        "priceEok": "6억3,500",
        "areaPyeong": 25.107499999999998,
        "floor": 11,
        "area": 60.3768
      }
    ],
    "rentTxCount": 564,
    "latestRentDeposit": 5000,
    "latestRentDepositEok": "5,000만",
    "latestRentMonthly": 137,
    "latestRentDate": "20260411",
    "avg1MRentDeposit": 39400,
    "avg1MRentDepositEok": "3억9,400",
    "avg3MRentDeposit": 40000,
    "avg3MRentDepositEok": "4억"
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
    "avg1MPrice": 65400,
    "avg1MPriceEok": "6억5,400",
    "avg1MPerPyeong": 2059,
    "avg1MTxCount": 3,
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
    "rentTxCount": 819,
    "latestRentDeposit": 28300,
    "latestRentDepositEok": "2억8,300",
    "latestRentMonthly": 0,
    "latestRentDate": "20260404",
    "avg1MRentDeposit": 28300,
    "avg1MRentDepositEok": "2억8,300",
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
    "avg1MPrice": 65000,
    "avg1MPriceEok": "6억5,000",
    "avg1MPerPyeong": 2010,
    "avg1MTxCount": 11,
    "avg3MPrice": 63800,
    "avg3MPriceEok": "6억3,800",
    "avg3MPerPyeong": 2007,
    "avg3MTxCount": 25,
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
    "avg1MPrice": 188000,
    "avg1MPriceEok": "18억8,000",
    "avg1MPerPyeong": 5452,
    "avg1MTxCount": 2,
    "avg3MPrice": 179400,
    "avg3MPriceEok": "17억9,400",
    "avg3MPerPyeong": 5583,
    "avg3MTxCount": 10,
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
  "솔빛마을쌍용예가": {
    "dong": "",
    "latestPrice": 78800,
    "latestPriceEok": "7억8,800",
    "latestArea": 34.194004075,
    "latestFloor": 5,
    "latestDate": "20260502",
    "maxPrice": 80800,
    "maxPriceEok": "8억800",
    "minPrice": 24000,
    "minPriceEok": "2억4,000",
    "txCount": 936,
    "avg1MPrice": 78700,
    "avg1MPriceEok": "7억8,700",
    "avg1MPerPyeong": 2302,
    "avg1MTxCount": 3,
    "avg3MPrice": 76600,
    "avg3MPriceEok": "7억6,600",
    "avg3MPerPyeong": 2267,
    "avg3MTxCount": 6,
    "recent": [
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
      },
      {
        "date": "04.04",
        "priceEok": "7억4,500",
        "areaPyeong": 34.189337105,
        "floor": 6,
        "area": 84.9794
      }
    ],
    "rentTxCount": 1373,
    "latestRentDeposit": 45000,
    "latestRentDepositEok": "4억5,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260328",
    "avg1MRentDeposit": 45000,
    "avg1MRentDepositEok": "4억5,000",
    "avg3MRentDeposit": 43800,
    "avg3MRentDepositEok": "4억3,800"
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
    "txCount": 511,
    "avg1MPrice": 110800,
    "avg1MPriceEok": "11억800",
    "avg1MPerPyeong": 3180,
    "avg1MTxCount": 9,
    "avg3MPrice": 109100,
    "avg3MPriceEok": "10억9,100",
    "avg3MPerPyeong": 3133,
    "avg3MTxCount": 27,
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
        "date": "04.29",
        "priceEok": "10억7,800",
        "areaPyeong": 32.9725,
        "floor": 6,
        "area": 84.9885
      }
    ],
    "rentTxCount": 852,
    "latestRentDeposit": 61500,
    "latestRentDepositEok": "6억1,500",
    "latestRentMonthly": 0,
    "latestRentDate": "20260411",
    "avg1MRentDeposit": 58300,
    "avg1MRentDepositEok": "5억8,300",
    "avg3MRentDeposit": 65200,
    "avg3MRentDepositEok": "6억5,200"
  },
  "METAPOLIS": {
    "dong": "",
    "latestPrice": 120000,
    "latestPriceEok": "12억",
    "latestArea": 48.0975,
    "latestFloor": 43,
    "latestDate": "20260419",
    "maxPrice": 232500,
    "maxPriceEok": "23억2,500",
    "minPrice": 41000,
    "minPriceEok": "4억1,000",
    "txCount": 879,
    "avg1MPrice": 115000,
    "avg1MPriceEok": "11억5,000",
    "avg1MPerPyeong": 2463,
    "avg1MTxCount": 3,
    "avg3MPrice": 111300,
    "avg3MPriceEok": "11억1,300",
    "avg3MPerPyeong": 2459,
    "avg3MTxCount": 4,
    "recent": [
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
      },
      {
        "date": "04.09",
        "priceEok": "12억",
        "areaPyeong": 45.98,
        "floor": 35,
        "area": 107.778
      },
      {
        "date": "04.08",
        "priceEok": "10억",
        "areaPyeong": 40.8375,
        "floor": 25,
        "area": 96.22
      }
    ],
    "rentTxCount": 1622,
    "latestRentDeposit": 58000,
    "latestRentDepositEok": "5억8,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260403",
    "avg1MRentDeposit": 58000,
    "avg1MRentDepositEok": "5억8,000",
    "avg3MRentDeposit": 58800,
    "avg3MRentDepositEok": "5억8,800"
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
    "avg1MPrice": 70800,
    "avg1MPriceEok": "7억800",
    "avg1MPerPyeong": 2179,
    "avg1MTxCount": 4,
    "avg3MPrice": 67900,
    "avg3MPriceEok": "6억7,900",
    "avg3MPerPyeong": 2150,
    "avg3MTxCount": 10,
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
    "avg3MRentDeposit": 40400,
    "avg3MRentDepositEok": "4억400"
  },
  "시범반도유보라아이비파크4.0": {
    "dong": "",
    "latestPrice": 125000,
    "latestPriceEok": "12억5,000",
    "latestArea": 38.91621329750001,
    "latestFloor": 14,
    "latestDate": "20260418",
    "maxPrice": 142000,
    "maxPriceEok": "14억2,000",
    "minPrice": 70000,
    "minPriceEok": "7억",
    "txCount": 309,
    "avg1MPrice": 124200,
    "avg1MPriceEok": "12억4,200",
    "avg1MPerPyeong": 3338,
    "avg1MTxCount": 3,
    "avg3MPrice": 121400,
    "avg3MPriceEok": "12억1,400",
    "avg3MPerPyeong": 3332,
    "avg3MTxCount": 10,
    "recent": [
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
      },
      {
        "date": "03.27",
        "priceEok": "12억",
        "areaPyeong": 34.129310215000004,
        "floor": 36,
        "area": 84.8302
      }
    ],
    "rentTxCount": 522,
    "latestRentDeposit": 59850,
    "latestRentDepositEok": "5억9,850",
    "latestRentMonthly": 0,
    "latestRentDate": "20260401",
    "avg1MRentDeposit": 59900,
    "avg1MRentDepositEok": "5억9,900",
    "avg3MRentDeposit": 65900,
    "avg3MRentDepositEok": "6억5,900"
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
    "avg1MPrice": 71900,
    "avg1MPriceEok": "7억1,900",
    "avg1MPerPyeong": 2247,
    "avg1MTxCount": 4,
    "avg3MPrice": 68800,
    "avg3MPriceEok": "6억8,800",
    "avg3MPerPyeong": 2277,
    "avg3MTxCount": 12,
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
    "rentTxCount": 765,
    "latestRentDeposit": 36500,
    "latestRentDepositEok": "3억6,500",
    "latestRentMonthly": 0,
    "latestRentDate": "20260310",
    "avg1MRentDeposit": 36500,
    "avg1MRentDepositEok": "3억6,500",
    "avg3MRentDeposit": 41500,
    "avg3MRentDepositEok": "4억1,500"
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
    "avg1MPrice": 101000,
    "avg1MPriceEok": "10억1,000",
    "avg1MPerPyeong": 2580,
    "avg1MTxCount": 2,
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
    "avg1MPrice": 64500,
    "avg1MPriceEok": "6억4,500",
    "avg1MPerPyeong": 1931,
    "avg1MTxCount": 3,
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
    "avg1MPrice": 116800,
    "avg1MPriceEok": "11억6,800",
    "avg1MPerPyeong": 3446,
    "avg1MTxCount": 2,
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
    "latestPrice": 85000,
    "latestPriceEok": "8억5,000",
    "latestArea": 32.9725,
    "latestFloor": 16,
    "latestDate": "20260418",
    "maxPrice": 138000,
    "maxPriceEok": "13억8,000",
    "minPrice": 46500,
    "minPriceEok": "4억6,500",
    "txCount": 103,
    "avg1MPrice": 84300,
    "avg1MPriceEok": "8억4,300",
    "avg1MPerPyeong": 2495,
    "avg1MTxCount": 5,
    "avg3MPrice": 80300,
    "avg3MPriceEok": "8억300",
    "avg3MPerPyeong": 2395,
    "avg3MTxCount": 11,
    "recent": [
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
      },
      {
        "date": "04.10",
        "priceEok": "8억4,000",
        "areaPyeong": 34.1825,
        "floor": 7,
        "area": 88.025
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
    "avg1MPrice": 108500,
    "avg1MPriceEok": "10억8,500",
    "avg1MPerPyeong": 3947,
    "avg1MTxCount": 3,
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
    "avg1MPrice": 59400,
    "avg1MPriceEok": "5억9,400",
    "avg1MPerPyeong": 1868,
    "avg1MTxCount": 4,
    "avg3MPrice": 59500,
    "avg3MPriceEok": "5억9,500",
    "avg3MPerPyeong": 1879,
    "avg3MTxCount": 18,
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
    "txCount": 141,
    "avg1MPrice": 104900,
    "avg1MPriceEok": "10억4,900",
    "avg1MPerPyeong": 2709,
    "avg1MTxCount": 4,
    "avg3MPrice": 100500,
    "avg3MPriceEok": "10억500",
    "avg3MPerPyeong": 2711,
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
        "date": "04.14",
        "priceEok": "9억8,000",
        "areaPyeong": 38.72,
        "floor": 3,
        "area": 96.9959
      }
    ],
    "rentTxCount": 263,
    "latestRentDeposit": 5000,
    "latestRentDepositEok": "5,000만",
    "latestRentMonthly": 220,
    "latestRentDate": "20260405",
    "avg1MRentDeposit": 53000,
    "avg1MRentDepositEok": "5억3,000",
    "avg3MRentDeposit": 54200,
    "avg3MRentDepositEok": "5억4,200"
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
    "avg3MPrice": 110100,
    "avg3MPriceEok": "11억100",
    "avg3MPerPyeong": 3317,
    "avg3MTxCount": 6,
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
    "avg1MPrice": 85100,
    "avg1MPriceEok": "8억5,100",
    "avg1MPerPyeong": 2580,
    "avg1MTxCount": 3,
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
    "rentTxCount": 477,
    "latestRentDeposit": 45000,
    "latestRentDepositEok": "4억5,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260130",
    "avg1MRentDeposit": 45000,
    "avg1MRentDepositEok": "4억5,000",
    "avg3MRentDeposit": 45000,
    "avg3MRentDepositEok": "4억5,000"
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
    "avg1MTxCount": 1,
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
  "더샵센트럴시티": {
    "dong": "",
    "latestPrice": 159000,
    "latestPriceEok": "15억9,000",
    "latestArea": 34.1825,
    "latestFloor": 9,
    "latestDate": "20260425",
    "maxPrice": 180000,
    "maxPriceEok": "18억",
    "minPrice": 48106,
    "minPriceEok": "4억8,106",
    "txCount": 382,
    "avg1MPrice": 166300,
    "avg1MPriceEok": "16억6,300",
    "avg1MPerPyeong": 4584,
    "avg1MTxCount": 2,
    "avg3MPrice": 163900,
    "avg3MPriceEok": "16억3,900",
    "avg3MPerPyeong": 4344,
    "avg3MTxCount": 11,
    "recent": [
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
      },
      {
        "date": "03.28",
        "priceEok": "15억1,000",
        "areaPyeong": 34.1825,
        "floor": 4,
        "area": 84.796
      }
    ],
    "rentTxCount": 960,
    "latestRentDeposit": 10000,
    "latestRentDepositEok": "1억",
    "latestRentMonthly": 280,
    "latestRentDate": "20260411",
    "avg1MRentDeposit": 75700,
    "avg1MRentDepositEok": "7억5,700",
    "avg3MRentDeposit": 70600,
    "avg3MRentDepositEok": "7억600"
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
    "rentTxCount": 190,
    "latestRentDeposit": 95700,
    "latestRentDepositEok": "9억5,700",
    "latestRentMonthly": 0,
    "latestRentDate": "20260401",
    "avg1MRentDeposit": 95700,
    "avg1MRentDepositEok": "9억5,700",
    "avg3MRentDeposit": 64700,
    "avg3MRentDepositEok": "6억4,700"
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
    "avg3MPrice": 74100,
    "avg3MPriceEok": "7억4,100",
    "avg3MPerPyeong": 2334,
    "avg3MTxCount": 14,
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
    "avg1MPrice": 127800,
    "avg1MPriceEok": "12억7,800",
    "avg1MPerPyeong": 4140,
    "avg1MTxCount": 2,
    "avg3MPrice": 132000,
    "avg3MPriceEok": "13억2,000",
    "avg3MPerPyeong": 3936,
    "avg3MTxCount": 8,
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
    "txCount": 1412,
    "avg1MPrice": 61100,
    "avg1MPriceEok": "6억1,100",
    "avg1MPerPyeong": 1645,
    "avg1MTxCount": 3,
    "avg3MPrice": 57200,
    "avg3MPriceEok": "5억7,200",
    "avg3MPerPyeong": 1731,
    "avg3MTxCount": 19,
    "recent": [
      {
        "date": "05.06",
        "priceEok": "5억4,350",
        "areaPyeong": 30.791380620000005,
        "floor": 22,
        "area": 76.5336
      },
      {
        "date": "04.10",
        "priceEok": "6억5,200",
        "areaPyeong": 40.66749379,
        "floor": 7,
        "area": 101.0812
      },
      {
        "date": "04.10",
        "priceEok": "6억3,700",
        "areaPyeong": 40.66749379,
        "floor": 7,
        "area": 101.0812
      },
      {
        "date": "04.04",
        "priceEok": "5억4,700",
        "areaPyeong": 30.639663862499997,
        "floor": 20,
        "area": 76.1565
      }
    ],
    "rentTxCount": 1456,
    "latestRentDeposit": 37000,
    "latestRentDepositEok": "3억7,000",
    "latestRentMonthly": 0,
    "latestRentDate": "20260204",
    "avg1MRentDeposit": 37000,
    "avg1MRentDepositEok": "3억7,000",
    "avg3MRentDeposit": 37000,
    "avg3MRentDepositEok": "3억7,000"
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
    "avg1MTxCount": 1,
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
    "rentTxCount": 940,
    "latestRentDeposit": 40425,
    "latestRentDepositEok": "4억425",
    "latestRentMonthly": 0,
    "latestRentDate": "20260321",
    "avg1MRentDeposit": 40400,
    "avg1MRentDepositEok": "4억400",
    "avg3MRentDeposit": 39100,
    "avg3MRentDepositEok": "3억9,100"
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
    "avg1MPrice": 66500,
    "avg1MPriceEok": "6억6,500",
    "avg1MPerPyeong": 2341,
    "avg1MTxCount": 2,
    "avg3MPrice": 61300,
    "avg3MPriceEok": "6억1,300",
    "avg3MPerPyeong": 2296,
    "avg3MTxCount": 19,
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
    "avg1MTxCount": 1,
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
    "avg3MRentDeposit": 47700,
    "avg3MRentDepositEok": "4억7,700"
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
    "avg3MPrice": 142800,
    "avg3MPriceEok": "14억2,800",
    "avg3MPerPyeong": 3802,
    "avg3MTxCount": 6,
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
    "avg3MRentDeposit": 59700,
    "avg3MRentDepositEok": "5억9,700"
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
  }
};
