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
  maxPriceByArea?: Record<string, number>;
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
