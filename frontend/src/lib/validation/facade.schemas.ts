import { z } from 'zod';

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
  area: z.number().default(0),
  areaPyeong: z.number().default(0),
  contractYm: z.string().default(''),
  contractDay: z.string().default(''),
  price: z.number().default(0),
  priceEok: z.string().default(''),
  deposit: z.number().optional(),
  monthlyRent: z.number().optional(),
  floor: z.number().default(0),
  buildYear: z.number().default(0),
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
