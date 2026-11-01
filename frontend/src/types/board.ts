import { z } from 'zod';

/**
 * 작성자 기기/세션 프로필 엔티티
 * 30일 타이틀 고정 및 GPS 인증 상태 저장
 */
export interface BoardAuthorProfile {
  authorTokenHash: string;
  selectedTitle: string; // 183개 아파트 단지명 또는 '동탄 예비입주민'
  dong?: string;
  titleSetAt: number; // UTC ms
  titleExpiresAt: number; // titleSetAt + 30 * 24 * 60 * 60 * 1000
  isGpsVerified: boolean;
  gpsVerifiedComplex?: string;
  gpsVerifiedAt?: number;
}

/**
 * 게시글 DB 도메인 엔티티
 */
export interface BoardPost {
  id: string;
  title: string;
  content: string;
  authorTitle: string;
  authorDong?: string;
  isGpsVerified: boolean;
  authorTokenHash: string; // 내부용 (공개 DTO에서는 제외)
  likeCount: number;
  commentCount: number;
  viewCount?: number;
  isDeleted?: boolean;
  createdAt: number;
  updatedAt: number;
}

/**
 * 클라이언트 표출용 안전한 게시글 DTO
 */
export interface BoardPostDto {
  id: string;
  title: string;
  content: string;
  authorTitle: string;
  authorDong?: string;
  isGpsVerified: boolean;
  likeCount: number;
  commentCount: number;
  viewCount?: number;
  createdAt: number;
  updatedAt: number;
  canDelete: boolean;
  isMine: boolean;
  isLiked?: boolean;
}

/**
 * 댓글 DB 도메인 엔티티
 */
export interface BoardComment {
  id: string;
  postId: string;
  content: string;
  authorTitle: string;
  authorDong?: string;
  isGpsVerified: boolean;
  authorTokenHash: string;
  isDeleted?: boolean;
  createdAt: number;
}

/**
 * 클라이언트 표출용 안전한 댓글 DTO
 */
export interface BoardCommentDto {
  id: string;
  postId: string;
  content: string;
  authorTitle: string;
  authorDong?: string;
  isGpsVerified: boolean;
  createdAt: number;
  canDelete: boolean;
  isMine: boolean;
}

/**
 * 추천(좋아요) 레코드
 */
export interface BoardLike {
  postId: string;
  authorTokenHash: string;
  createdAt: number;
}

/**
 * 게시글 작성 요청 Zod 검증 스키마
 */
export const PostCreateSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, '제목을 2자 이상 입력해주세요.')
    .max(100, '제목은 100자 이하로 입력해주세요.'),
  content: z
    .string()
    .trim()
    .min(5, '내용을 5자 이상 입력해주세요.')
    .max(3000, '내용은 3000자 이하로 입력해주세요.'),
  authorTitle: z
    .string()
    .trim()
    .min(1, '작성자 타이틀을 선택해주세요.'),
  authorDong: z.string().trim().optional(),
  isGpsVerified: z.boolean().optional().default(false),
});

export type PostCreateInput = z.infer<typeof PostCreateSchema>;

/**
 * 게시글 목록 쿼리 파라미터 Zod 스키마
 */
export const PostQuerySchema = z.object({
  sort: z.enum(['latest', 'popular']).optional().default('latest'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

export type PostQueryInput = z.infer<typeof PostQuerySchema>;

/**
 * 댓글 작성 요청 Zod 검증 스키마
 */
export const CommentCreateSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, '댓글 내용을 1자 이상 입력해주세요.')
    .max(500, '댓글은 500자 이하로 입력해주세요.'),
  authorTitle: z
    .string()
    .trim()
    .min(1, '작성자 타이틀을 선택해주세요.'),
  authorDong: z.string().trim().optional(),
  isGpsVerified: z.boolean().optional().default(false),
});

export type CommentCreateInput = z.infer<typeof CommentCreateSchema>;

/**
 * 추천(좋아요) 토글 Zod 스키마
 */
export const LikeToggleSchema = z.object({
  postId: z.string().min(1).optional(),
});

export type LikeToggleInput = z.infer<typeof LikeToggleSchema>;
