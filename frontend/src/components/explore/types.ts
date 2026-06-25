import { DongApartment } from '@/lib/dong-apartments';

export interface EnrichedApt {
  apt: DongApartment;
  pyeongPrice: number;
  totalPrice: number;
  jeonsePrice: number;
  ratio: number;
  dropRatio: number;
  maxPrice: number;
  avg1MPrice: number;
  volume3M: number;
  volume1M: number;
  turnoverRate: number;
  hasTx: boolean;
  
  formattedYearBuilt: string;
  formattedPrice: string;
  formattedJeonse: string;
  formattedRatio: string;
  formattedPyeong: string;
  formattedHousehold: string;
  formattedVolume: string;
  formattedTurnover: string;
}
