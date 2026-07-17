/**
 * @module report.types
 * @description Type definitions for Field Reports, Report Sections, and Comments.
 * Architecture Layer: Types (zero dependencies)
 */
import type { ObjectiveMetrics, ImageMeta } from './scoutingReport';

/** 임장기 섹션별 상세 데이터 */
export interface ReportSections {
  specs: { builtYear: string; scale: string; farBuild: string; parkingRatio: string; };
  infra: {
    gateText: string; gateImgs?: string[]; gateRating?: number;
    landscapeText: string; landscapeImgs?: string[]; landscapeRating?: number;
    parkingText: string; parkingImgs?: string[]; parkingRating?: number;
    maintenanceText: string; maintenanceImgs?: string[]; maintenanceRating?: number;
    // Legacy single-image compat
    gateImg?: string; landscapeImg?: string; parkingImg?: string; maintenanceImg?: string;
  };
  ecosystem: {
    communityText: string; communityImgs?: string[]; communityRating?: number;
    schoolText: string; schoolImgs?: string[]; schoolRating?: number;
    commerceText: string; commerceImgs?: string[]; commerceRating?: number;
    // Legacy single-image compat
    communityImg?: string; schoolImg?: string; commerceImg?: string;
  };
  location: {
    trafficText: string; trafficRating?: number;
    developmentText: string; developmentRating?: number;
  };
  assessment: { alphaDriver: string; systemicRisk: string; synthesis: string; probability: string; autoGrade?: string; };
}

/** 댓글 데이터 */
export interface CommentData {
  /** Firestore document ID */
  id: string;
  /** 댓글 본문 */
  text: string;
  /** 작성자 닉네임 */
  author: string;
  /** 작성자 고유 UID */
  authorUid?: string;
  /** 작성 시각 */
  createdAt?: unknown;
}

/** 현장 임장기 리포트 데이터 */
export interface FieldReportData {
  /** Firestore document ID */
  id: string;
  /** 행정동 (e.g., '오산동') */
  dong?: string;
  /** 아파트명 */
  apartmentName: string;
  /** 섹션별 상세 데이터 */
  sections?: ReportSections;
  /** 프리미엄 점수 (서버 계산) */
  premiumScores?: import('../utils/scoring').PremiumScores;
  /** 객관적 지표 (거리/밀집도 등) */
  metrics?: ObjectiveMetrics;
  /** 프리미엄 콘텐츠 텍스트 */
  premiumContent?: string;

  /** 작성자 닉네임 */
  author: string;
  /** 좋아요 수 */
  likes: number;
  /** 댓글 수 */
  commentCount: number;
  /** 조회수 (IP당 일 1회, 관리자 제외) */
  viewCount?: number;
  /** 댓글 목록 */
  comments?: CommentData[];

  /** 썸네일 이미지 URL */
  thumbnail?: string;
  /** 구버전 썸네일 이미지 URL 호환성 필드 */
  thumbnailUrl?: string;
  /** 이미지 배열 (New Schema) */
  images?: (Required<Pick<ImageMeta, 'url' | 'caption' | 'locationTag' | 'isPremium'>> & Pick<ImageMeta, 'uploaderName' | 'capturedAt'>)[];
  /** 현장 촬영/임장 일자 (YYYY-MM-DD) */
  scoutingDate?: string;
  /** 작성 시각 */
  createdAt?: unknown;
}
