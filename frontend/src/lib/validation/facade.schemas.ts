import { z } from 'zod';
import { KPIDataSchema } from '@/lib/services/kpi.service';
import { PremiumScoresSchema } from '@/lib/utils/scoring';
import { ObjectiveMetricsSchema } from '@/lib/services/reportService';

// Isomorphic Zod custom guard for File type to prevent ReferenceError in Node SSR
export const IsomorphicFileSchema = z.custom<any>((val) => {
  if (typeof File === 'undefined') return true;
  return val instanceof File;
}, 'Must be a valid File object').optional();

export const AddPostInputSchema = z.object({
  title: z.string().min(1, '제목은 필수 입력 사항입니다.'),
  content: z.string().min(1, '본문은 필수 입력 사항입니다.'),
  category: z.string().min(1, '카테고리는 필수 입력 사항입니다.'),
  authorUid: z.string().min(1, '사용자 UID는 필수 입력 사항입니다.'),
  imageFile: IsomorphicFileSchema,
  authorEmail: z.string().nullable().optional(),
  customNickname: z.string().optional(),
});

export const AddFieldReportInputSchema = z.object({
  apartmentName: z.string().min(1, '아파트 명칭은 필수 입력 사항입니다.'),
  sections: z.record(z.string(), z.any()), // ReportSections
  premiumScores: z.record(z.string(), z.number()).nullable(),
  authorUid: z.string().min(1, '사용자 UID는 필수 입력 사항입니다.'),
  imageEntries: z.array(
    z.object({
      file: IsomorphicFileSchema,
      category: z.string(),
    })
  ),
});

export const AddFieldReportCommentInputSchema = z.object({
  reportId: z.string().min(1, '보고서 ID는 필수 입력 사항입니다.'),
  text: z.string().min(1, '댓글 내용은 필수 입력 사항입니다.'),
  authorUid: z.string().min(1, '사용자 UID는 필수 입력 사항입니다.'),
  apartmentName: z.string().optional(),
});

export const AddUserReviewInputSchema = z.object({
  apartmentName: z.string().min(1, '아파트 명칭은 필수 입력 사항입니다.'),
  rating: z.number().min(1).max(5, '평점은 1에서 5 사이여야 합니다.'),
  content: z.string().min(1, '리뷰 내용은 필수 입력 사항입니다.'),
  authorUid: z.string().min(1, '사용자 UID는 필수 입력 사항입니다.'),
  imageFile: IsomorphicFileSchema,
});

export const UpdateNicknameInputSchema = z.object({
  uid: z.string().min(1, '사용자 UID는 필수 입력 사항입니다.'),
  nickname: z.string().min(1, '닉네임은 필수 입력 사항입니다.'),
});

export const UpdatePhotoURLInputSchema = z.object({
  uid: z.string().min(1, '사용자 UID는 필수 입력 사항입니다.'),
  photoURL: z.string().url('유효한 URL이어야 합니다.').or(z.string().min(1)),
});

export const GetFullReportInputSchema = z.string().min(1, '보고서 ID는 필수 입력 사항입니다.');
export const GetFullReportByApartmentNameInputSchema = z.string().min(1, '아파트 명칭은 필수 입력 사항입니다.');
export const DeleteReviewInputSchema = z.string().min(1, '리뷰 ID는 필수 입력 사항입니다.');
export const DeletePostInputSchema = z.string().min(1, '게시글 ID는 필수 입력 사항입니다.');
export const IncrementLikeInputSchema = z.string().min(1, '게시글 ID는 필수 입력 사항입니다.');
export const IncrementPostViewInputSchema = z.object({
  postId: z.string().min(1, '게시글 ID는 필수 입력 사항입니다.'),
  title: z.string().optional(),
});
export const IncrementFieldReportViewInputSchema = z.object({
  reportId: z.string().min(1, '보고서 ID는 필수 입력 사항입니다.'),
  title: z.string().optional(),
});
export const IncrementFieldReportLikeInputSchema = z.string().min(1, '보고서 ID는 필수 입력 사항입니다.');
export const IncrementReviewLikeInputSchema = z.string().min(1, '리뷰 ID는 필수 입력 사항입니다.');

export const TransactionRecordSchema = z.object({
  dong: z.string().default(''),
  aptName: z.string().default(''),
  area: z.coerce.number().default(0),
  areaPyeong: z.coerce.number().default(0),
  contractYm: z.string().default(''),
  contractDay: z.string().default(''),
  price: z.coerce.number().default(0),
  priceEok: z.string().default(''),
  deposit: z.coerce.number().optional(),
  monthlyRent: z.coerce.number().optional(),
  floor: z.coerce.number().default(0),
  buildYear: z.coerce.number().default(0),
  dealType: z.string().default('매매'),
  reqGb: z.string().optional(),
  rnuYn: z.string().optional(),
  cancelDate: z.string().optional(),
  isOutlier: z.boolean().optional(),
  areaLabelM2: z.string().optional(),
  areaLabelPyeong: z.string().optional(),
});

export const TransactionListSchema = z.array(TransactionRecordSchema);

export const QuizAnswerSchema = z.object({
  budget: z.string().default(''),
  family: z.string().default(''),
  transit: z.string().default(''),
  lifestyle: z.string().default(''),
  scaleBrand: z.string().default(''),
  yearBuilt: z.string().default(''),
  investmentStyle: z.string().default(''),
});

export const ViewedAptsSchema = z.array(z.string());

// Unified Lounge Post Validation Schemas
export const PostDataSchema = z.object({
  title: z.string().default(''),
  category: z.string().default('자유'),
  content: z.string().default(''),
  authorName: z.string().default('익명'),
  authorUid: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  verifiedApartment: z.string().nullable().optional(),
  verificationLevel: z.string().nullable().optional(),
  likes: z.number().default(0),
  views: z.number().default(0),
  commentCount: z.number().default(0),
}).passthrough();

export const CreatePostSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요.').max(100, '제목은 100자 이내여야 합니다.'),
  content: z.string().min(1, '내용을 입력해주세요.'),
  category: z.string(),
  authorUid: z.string(),
  authorEmail: z.string().email().nullable().optional(),
  customNickname: z.string().max(10, '닉네임은 10자 이내여야 합니다.').optional(),
});

export const SyncManagerPostSchema = z.object({
  title: z.string(),
  content: z.string(),
  category: z.string(),
  authorEmail: z.string().email().nullable().optional(),
  providedApartments: z.array(z.string()).optional(),
});

// Dashboard & Report schemas consolidated for architecture refactoring
export const TypeMapItemSchema = z.object({
  aptName: z.string(),
  area: z.string(),
  typeM2: z.string(),
  typePyeong: z.string(),
});

export const ApartmentMetaItemSchema = z.object({
  dong: z.string().optional(),
  txKey: z.string().optional(),
  isPublicRental: z.boolean().optional(),
});

export const ApartmentMetaSchema = z.record(z.string(), ApartmentMetaItemSchema);

export const DongApartmentSchema = z.object({
  name: z.string(),
  dong: z.string(),
  householdCount: z.number().optional(),
  yearBuilt: z.string().optional(),
  brand: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  txKey: z.string().optional(),
});

export const Recent7DaysVolumeSchema = z.object({
  currentCount: z.number(),
  prevCount: z.number(),
  trendText: z.string(),
  trendColor: z.string(),
  badge: z.string(),
});

export const RecentTransactionSchema = z.object({
  aptName: z.string(),
  txKey: z.string(),
  date: z.string(),
  contractDate: z.string(),
  priceVal: z.number(),
  priceEok: z.string(),
  area: z.number(),
  areaPyeong: z.number(),
  floor: z.union([z.number(), z.string()]),
  dealType: z.string(),
  isNewHigh: z.boolean().optional(),
  prevPriceVal: z.number().optional(),
  delta: z.number().optional(),
  deltaPercent: z.number().optional(),
  dateLabel: z.string().optional(),
});

export const RecentTxSchema = z.object({
  date: z.string(),
  priceEok: z.string(),
  areaPyeong: z.number(),
  floor: z.number(),
  area: z.number(),
  priceVal: z.number().optional(),
  dealType: z.string().optional(),
  isNewHigh: z.boolean().optional(),
  newHighDelta: z.number().optional(),
  prevPriceVal: z.number().optional(),
  delta: z.number().optional(),
  deltaPercent: z.number().optional(),
  contractDate: z.string().optional(),
  dateLabel: z.string().optional(),
});

export const AptTxSummarySchema = z.object({
  latestPrice: z.number(),
  latestPriceEok: z.string(),
  latestArea: z.number(),
  latestFloor: z.number(),
  latestDate: z.string(),
  maxPrice: z.number(),
  maxPriceEok: z.string(),
  maxPriceByArea: z.record(z.string(), z.number()).optional(),
  minPrice: z.number(),
  minPriceEok: z.string(),
  txCount: z.number(),
  avg1MPrice: z.number(),
  avg1MPriceEok: z.string(),
  avg1MPerPyeong: z.number().optional(),
  avg1MTxCount: z.number().optional(),
  avg3MPrice: z.number().optional(),
  avg3MPriceEok: z.string().optional(),
  avg3MPerPyeong: z.number().optional(),
  avg3MTxCount: z.number().optional(),
  recent: z.array(RecentTxSchema),
  rentTxCount: z.number().optional(),
  latestRentDeposit: z.number().optional(),
  latestRentDepositEok: z.string().optional(),
  latestRentMonthly: z.number().optional(),
  latestRentDate: z.string().optional(),
  avg1MRentDeposit: z.number().optional(),
  avg1MRentDepositEok: z.string().optional(),
  avg3MRentDeposit: z.number().optional(),
  avg3MRentDepositEok: z.string().optional(),
  dong: z.string().optional(),
});

export const FieldReportImageSchema = z.object({
  url: z.string(),
  caption: z.string().default(''),
  locationTag: z.string().default(''),
  isPremium: z.boolean().default(false),
  capturedAt: z.string().optional(),
  uploaderName: z.string().optional(),
});

export const FieldReportSchema = z.object({
  id: z.string(),
  dong: z.string().optional(),
  apartmentName: z.string(),
  premiumScores: PremiumScoresSchema.optional(),
  premiumContent: z.string().optional(),
  pros: z.string().optional(),
  cons: z.string().optional(),
  rating: z.number().int().nonnegative().optional(),
  author: z.string(),
  likes: z.number().int().nonnegative().default(0),
  viewCount: z.number().int().nonnegative().optional(),
  commentCount: z.number().int().nonnegative().default(0),
  imageUrl: z.string().optional(),
  thumbnail: z.string().optional(),
  images: z.array(FieldReportImageSchema).optional(),
  metrics: ObjectiveMetricsSchema.optional(),
  scoutingDate: z.string().optional(),
  createdAt: z.string().optional(),
  _rawTimestamp: z.number().optional(),
});

export const DongtanMacroTrendPointSchema = z.object({
  name: z.string(),
  '동탄 아파트 전체': z.number(),
  '동탄 아파트 전세 평균': z.number(),
});

export const InitialPageDataSchema = z.object({
  favoriteCounts: z.record(z.string(), z.number().int().nonnegative()),
  typeMap: z.array(TypeMapItemSchema).optional(),
  apartmentMeta: ApartmentMetaSchema,
  sheetApartments: z.record(z.string(), z.array(DongApartmentSchema)).optional(),
  fieldReports: z.array(FieldReportSchema),
  kpis: z.array(KPIDataSchema).optional(),
  macroTrend: z.array(DongtanMacroTrendPointSchema).optional(),
  txSummary: z.record(z.string(), AptTxSummarySchema).optional(),
  recent7DaysVolume: Recent7DaysVolumeSchema.optional(),
  recentTransactions: z.array(RecentTransactionSchema).optional(),
});

// Report Repository Schemas
export const ReportSpecsSchema = z.object({
  builtYear: z.string().default(''),
  scale: z.string().default(''),
  farBuild: z.string().default(''),
  parkingRatio: z.string().default(''),
}).passthrough();

export const ReportInfraSchema = z.object({
  gateText: z.string().default(''),
  gateImgs: z.array(z.string()).optional(),
  gateRating: z.number().optional(),
  landscapeText: z.string().default(''),
  landscapeImgs: z.array(z.string()).optional(),
  landscapeRating: z.number().optional(),
  parkingText: z.string().default(''),
  parkingImgs: z.array(z.string()).optional(),
  parkingRating: z.number().optional(),
  maintenanceText: z.string().default(''),
  maintenanceImgs: z.array(z.string()).optional(),
  maintenanceRating: z.number().optional(),
}).passthrough();

export const ReportEcosystemSchema = z.object({
  communityText: z.string().default(''),
  communityImgs: z.array(z.string()).optional(),
  communityRating: z.number().optional(),
  schoolText: z.string().default(''),
  schoolImgs: z.array(z.string()).optional(),
  schoolRating: z.number().optional(),
  commerceText: z.string().default(''),
  commerceImgs: z.array(z.string()).optional(),
  commerceRating: z.number().optional(),
}).passthrough();

export const ReportLocationSchema = z.object({
  trafficText: z.string().default(''),
  trafficRating: z.number().optional(),
  developmentText: z.string().default(''),
  developmentRating: z.number().optional(),
}).passthrough();

export const ReportAssessmentSchema = z.object({
  alphaDriver: z.string().default(''),
  systemicRisk: z.string().default(''),
  synthesis: z.string().default(''),
  probability: z.string().default(''),
  autoGrade: z.string().optional(),
}).passthrough();

export const ReportSectionsSchema = z.object({
  specs: ReportSpecsSchema.optional(),
  infra: ReportInfraSchema.optional(),
  ecosystem: ReportEcosystemSchema.optional(),
  location: ReportLocationSchema.optional(),
  assessment: ReportAssessmentSchema.optional(),
}).passthrough();

export const FieldReportDataSchema = z.object({
  dong: z.string().default('오산동 (동탄역)'),
  apartmentName: z.string(),
  sections: ReportSectionsSchema.optional(),
  premiumScores: z.unknown().optional(),
  metrics: z.unknown().optional(),
  premiumContent: z.string().optional(),
  author: z.string().default('데이터 랩스'),
  likes: z.number().default(0),
  commentCount: z.number().default(0),
  viewCount: z.number().default(0),
  images: z.array(z.unknown()).default([]),
  scoutingDate: z.string().default('')
}).passthrough();

export type InitialPageData = z.infer<typeof InitialPageDataSchema>;



