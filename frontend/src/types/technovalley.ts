/**
 * @module technovalley
 * @description Canonical domain models for Dongtan Techno Valley, Knowledge Industry Centers (지식산업센터), and Office Buildings.
 * Architecture Layer: Domain & Types (zero dependencies, zero logic)
 */

/** Knowledge Industry Center Status Item */
export interface JisanStatusItem {
  seq?: string;
  name: string;
  companyName?: string;
  regType?: string;
  complexName?: string;
  jurisdiction?: string;
  industrialParkType?: string;
  status?: string;
  initialApprovalDate?: string;
  approvalDate?: string;
  constructionStartDate?: string;
  completionDate?: string;
  phone?: string;
  landType?: string;
  landArea?: number;
  totalFloorArea?: number;
  factoryArea?: number;
  auxiliaryArea?: number;
  roadAddress?: string;
  jibunAddress?: string;
  saleType?: string;
  buildingStatus?: string;
  zoning1?: string;
  zoning2?: string;
  installer?: string;
  unitCount?: number;
  developer?: string;
  builder?: string;
}

/** API response payload for Jisan status endpoint */
export interface JisanStatusResponse {
  success: boolean;
  total: number;
  completedCount: number;
  underConstructionCount: number;
  notStartedCount: number;
  centers: JisanStatusItem[];
  message?: string;
}

/** Detailed specification for Techno Valley center */
export interface CenterSpecItem {
  name: string;
  companyName: string;
  regType: string;
  complexName: string;
  landArea: number;
  buildingArea: number;
  totalFloorArea: number;
  roadAddress: string;
  developer: string;
  builder: string;
  baselineVacancy: number;
  unitCount: number;
  tenants: string[];
}

/** Client representation of an Office / Jisan Building */
export interface OfficeBuilding {
  id: string;
  name: string;
  dong: string;
  totalFloorArea: number;
  unitCount: number;
  completionYear: string;
  completionDate?: string;
  builder: string;
  developer: string;
  driveIn: boolean;
  stationDistance: number;
  avgRentPerPy: number;
  avgSalePerPy: number;
  vacancyRate: number;
  description: string;
  features: string[];
  coordinates: [number, number];
  score: number;
  baselineVacancy?: number;
  tenants?: string[];
  buildingStatus?: string;
}

/** Historical price & rent trend entry */
export interface TrendRecord {
  period: string;
  avgSalePrice: number;
  avgDeposit: number;
  avgRent: number;
  volume: number;
  rentPerPyeong: number;
}

/** Hwaseong Enterprise & Employee statistics entry */
export interface HwaseongEnterprise {
  id?: string;
  name?: string;
  category?: string;
  employees?: number | null;
  address?: string;
  statDate?: string;
  stats?: {
    yeongcheonDong?: {
      totalEmployees: number;
      companiesCount: number;
      newHires: number;
      departures: number;
    };
  };
}
