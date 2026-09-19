/**
 * @module DashboardFacade
 * @description Thin orchestration layer implementing the Facade pattern.
 * Architecture Layer: Facade (delegates to repositories and services)
 * 
 * Rationale: The original 702-line monolith has been decomposed into:
 * - Types: @/lib/types/*
 * - Config: @/lib/config/*
 * - Repositories: @/lib/repositories/*
 * - Services: @/lib/services/*
 * 
 * This facade preserves the same public API for backward compatibility
 * while delegating all operations to the appropriate layer.
 */
// Removed static Firebase Storage imports to defer loading

// Types (re-export for backward compatibility)
export type { KPIData, NewsItemData, AdBannerData } from '@/lib/types/dashboard.types';
export type { FieldReportData, ReportSections } from '@/lib/types/report.types';
export type { UserReview } from '@/lib/types/review.types';

// Internal imports
import type { KPIData, NewsItemData, AdBannerData } from '@/lib/types/dashboard.types';
import type { FieldReportData, ReportSections } from '@/lib/types/report.types';
import type { UserReview } from '@/lib/types/review.types';

import * as ReportRepo from '@/lib/repositories/report.repository';
import * as ReviewRepo from '@/lib/repositories/review.repository';
import * as UserRepo from '@/lib/repositories/user.repository';
import * as ApartmentRepo from '@/lib/repositories/apartment.repository';
import * as ReportService from '@/lib/services/reportService';
import { createInitialKPIs, startKPISimulation } from '@/lib/services/kpi.service';
import { logger } from '@/lib/services/logger';


// Import validation schemas from facade.schemas.ts
import {
  AddFieldReportInputSchema,
  AddUserReviewInputSchema,
  UpdateNicknameInputSchema,
  UpdatePhotoURLInputSchema,
  GetFullReportInputSchema,
  GetFullReportByApartmentNameInputSchema,
  DeleteReviewInputSchema,
  IncrementFieldReportViewInputSchema,
  IncrementFieldReportLikeInputSchema,
  IncrementReviewLikeInputSchema,
} from '@/lib/validation/facade.schemas';


// --- Strategy Interface (preserved for extensibility) ---

export interface DashboardDataStrategy {
  getKPIs(): KPIData[];
  getNewsFeed(): NewsItemData[];
  getFieldReports?(): FieldReportData[];
  getFullReport?(reportId: string): Promise<FieldReportData | null>;
  getFullReportByApartmentName?(apartmentName: string): Promise<FieldReportData | null>;
  getAdBanner(): AdBannerData;
  subscribe?(callback: () => void): () => void;
  addFieldReport?(apartmentName: string, sections: ReportSections, premiumScores: Record<string, number> | null, authorUid: string, imageEntries: {file: File, category: string}[], onProgress?: (done: number, total: number) => void): Promise<void>;
  incrementFieldReportView?(reportId: string, title?: string): Promise<void>;
  incrementFieldReportLike?(reportId: string): Promise<void>;
  incrementReviewLike?(reviewId: string): Promise<void>;
  deleteReview?(reviewId: string): Promise<void>;
  getUserProfile?(uid: string): Promise<import('@/lib/types/user.types').UserProfile>;
  getUserReviews?(): UserReview[];
  addUserReview?(apartmentName: string, rating: number, content: string, authorUid: string, imageFile?: File): Promise<void>;
  getDongtanApartments?(): string[];
  subscribeTo?(key: 'kpis' | 'newsFeed' | 'fieldReports' | 'userReviews' | 'dongtanApartments', callback: () => void): () => void;
  destroy?(): void;
}

import { Subscribable } from '@/lib/utils/subscribable';


// --- Firebase Strategy (delegates to repositories/services) ---

class FirebaseDashboardDataStrategy implements DashboardDataStrategy {
  private stores = {
    kpis: new Subscribable<KPIData[]>(createInitialKPIs()),
    newsFeed: new Subscribable<NewsItemData[]>([]),
    fieldReports: new Subscribable<FieldReportData[]>([]),
    userReviews: new Subscribable<UserReview[]>([]),
    dongtanApartments: new Subscribable<string[]>([])
  };
  private cleanupFns: (() => void)[] = [];
  private initialized = false;

  // Dependencies
  private reportRepo = ReportRepo;
  private reviewRepo = ReviewRepo;
  private userRepo = UserRepo;
  private apartmentRepo = ApartmentRepo;
  private reportService = ReportService.reportService;

  constructor(deps?: {
    reportRepo?: typeof ReportRepo;
    reviewRepo?: typeof ReviewRepo;
    userRepo?: typeof UserRepo;
    apartmentRepo?: typeof ApartmentRepo;
    reportService?: ReportService.ReportService;
  }) {
    if (deps) {
      if (deps.reportRepo) this.reportRepo = deps.reportRepo;
      if (deps.reviewRepo) this.reviewRepo = deps.reviewRepo;
      if (deps.userRepo) this.userRepo = deps.userRepo;
      if (deps.apartmentRepo) this.apartmentRepo = deps.apartmentRepo;
      if (deps.reportService) this.reportService = deps.reportService;
    }
    // Only init Firestore listeners on the client side
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  public destroy() {
    this.cleanupFns.forEach((fn) => {
      try { fn(); } catch (err) { logger.error('FirebaseDashboardDataStrategy.destroy', 'Failed to run cleanup fn', {}, err); }
    });
    this.cleanupFns = [];
    this.initialized = false;
  }

  private init() {
    if (this.initialized) return;
    this.initialized = true;

    // KPI simulation
    const stopKPI = startKPISimulation(this.stores.kpis.get(), () => {
      this.stores.kpis.set([...this.stores.kpis.get()]);
    });
    this.cleanupFns.push(stopKPI);

    // External API
    this.apartmentRepo.fetchApartmentNames().then((apts) => {
      this.stores.dongtanApartments.set(apts);
    });
  }

  subscribeTo(key: 'kpis' | 'newsFeed' | 'fieldReports' | 'userReviews' | 'dongtanApartments', callback: () => void) {
    if (!this.initialized && typeof window !== 'undefined') {
      this.init();
    }
    return this.stores[key].subscribe(callback);
  }

  getKPIs(): KPIData[] { return this.stores.kpis.get(); }
  getNewsFeed(): NewsItemData[] { return this.stores.newsFeed.get(); }
  getFieldReports(): FieldReportData[] { return this.stores.fieldReports.get(); }
  getUserReviews(): UserReview[] { return this.stores.userReviews.get(); }

  async getFullReport(reportId: string): Promise<FieldReportData | null> {
    return this.reportRepo.getFullReport(reportId);
  }

  async getFullReportByApartmentName(apartmentName: string): Promise<FieldReportData | null> {
    return this.reportRepo.getFullReportByApartmentName(apartmentName);
  }
  getDongtanApartments(): string[] { return this.stores.dongtanApartments.get(); }

  getAdBanner(): AdBannerData {
    return {
      title: '동탄센트럴파크 앞 프리미엄 치과 오픈!',
      description: '최첨단 장비와 분야별 전문의 협진. 첫 방문 고객 스케일링 이벤트 중',
      buttonText: '예약하기',
    };
  }

  async addFieldReport(apartmentName: string, sections: ReportSections, premiumScores: Record<string, number> | null, authorUid: string, imageEntries: {file: File, category: string}[], onProgress?: (done: number, total: number) => void) {
    try {
      await this.reportService.createFieldReport(apartmentName, sections, premiumScores, authorUid, imageEntries, onProgress);
    } catch (e: unknown) {
      logger.error('DashboardFacade.addFieldReport', 'Field report creation failed', { apartmentName }, e);
      throw e;
    }
  }

  async getUserProfile(uid: string): Promise<import('@/lib/types/user.types').UserProfile> {
    return this.userRepo.getOrCreateProfile(uid);
  }

  async incrementFieldReportView(reportId: string, title?: string) {
    try { await this.reportRepo.incrementReportView(reportId, title); }
    catch (e: unknown) { logger.error('DashboardFacade.incrementFieldReportView', 'View update failed', { reportId }, e); }
  }

  async incrementFieldReportLike(reportId: string) {
    try { await this.reportRepo.incrementReportLike(reportId); }
    catch (e: unknown) { logger.error('DashboardFacade.incrementFieldReportLike', 'Like failed', { reportId }, e); }
  }

  async addUserReview(apartmentName: string, rating: number, content: string, authorUid: string, imageFile?: File) {
    try {
      const profile = await this.userRepo.getOrCreateProfile(authorUid);
      const displayName = profile.nickname || '익명';
      await this.reviewRepo.addReview(
        apartmentName, rating, content, displayName, authorUid,
        profile.verifiedApartment, profile.verificationLevel, imageFile
      );
    } catch (e: unknown) {
      logger.error('DashboardFacade.addUserReview', 'Review failed', { apartmentName }, e);
      throw e;
    }
  }

  async incrementReviewLike(reviewId: string) {
    try { await this.reviewRepo.incrementReviewLike(reviewId); }
    catch (e: unknown) { logger.error('DashboardFacade.incrementReviewLike', 'Like failed', { reviewId }, e); }
  }

  async deleteReview(reviewId: string) {
    try { await this.reviewRepo.deleteReview(reviewId); }
    catch (e: unknown) { logger.error('DashboardFacade.deleteReview', 'Delete failed', { reviewId }, e); throw e; }
  }
}


// --- Facade ---

export class DashboardFacade {
  private strategy: DashboardDataStrategy;

  constructor(strategy?: DashboardDataStrategy) {
    this.strategy = strategy || new FirebaseDashboardDataStrategy();
  }

  public destroy() {
    if (this.strategy.destroy) {
      this.strategy.destroy();
    }
  }
  public setStrategy(strategy: DashboardDataStrategy) { this.strategy = strategy; }
  public subscribeTo(key: 'kpis' | 'newsFeed' | 'fieldReports' | 'userReviews' | 'dongtanApartments', callback: () => void) {
    return this.strategy.subscribeTo ? this.strategy.subscribeTo(key, callback) : () => {};
  }
  public getKPIs(): KPIData[] { return this.strategy.getKPIs(); }
  public getNewsFeed(): NewsItemData[] { return this.strategy.getNewsFeed(); }
  public getFieldReports(): FieldReportData[] { return this.strategy.getFieldReports ? this.strategy.getFieldReports() : []; }
  
  public async getFullReport(reportId: string): Promise<FieldReportData | null> {
    const validation = GetFullReportInputSchema.safeParse(reportId);
    if (!validation.success) {
      logger.warn('DashboardFacade.getFullReport', 'Invalid reportId provided', { error: validation.error.format(), reportId });
      return null;
    }
    return this.strategy.getFullReport ? await this.strategy.getFullReport(reportId) : null;
  }
  
  public async getFullReportByApartmentName(apartmentName: string): Promise<FieldReportData | null> {
    const validation = GetFullReportByApartmentNameInputSchema.safeParse(apartmentName);
    if (!validation.success) {
      logger.warn('DashboardFacade.getFullReportByApartmentName', 'Invalid apartmentName provided', { error: validation.error.format(), apartmentName });
      return null;
    }
    return this.strategy.getFullReportByApartmentName ? await this.strategy.getFullReportByApartmentName(apartmentName) : null;
  }
  
  public getUserReviews(): UserReview[] { return this.strategy.getUserReviews ? this.strategy.getUserReviews() : []; }
  public getAdBanner(): AdBannerData { return this.strategy.getAdBanner(); }
  
  public async addFieldReport(apartmentName: string, sections: ReportSections, premiumScores: Record<string, number> | null, authorUid: string, imageEntries: {file: File, category: string}[], onProgress?: (done: number, total: number) => void) {
    const validation = AddFieldReportInputSchema.safeParse({ apartmentName, sections, premiumScores, authorUid, imageEntries });
    if (!validation.success) {
      const errorMsg = validation.error.issues.map(err => err.message).join(', ');
      logger.warn('DashboardFacade.addFieldReport', 'Validation failed', { error: validation.error.format() });
      throw new Error('임장기 저장 실패: 입력값이 유효하지 않습니다. (' + errorMsg + ')');
    }
    if (this.strategy.addFieldReport) await this.strategy.addFieldReport(apartmentName, sections, premiumScores, authorUid, imageEntries, onProgress);
  }
  
  public async addUserReview(apartmentName: string, rating: number, content: string, authorUid: string, imageFile?: File) {
    const validation = AddUserReviewInputSchema.safeParse({ apartmentName, rating, content, authorUid, imageFile });
    if (!validation.success) {
      const errorMsg = validation.error.issues.map(err => err.message).join(', ');
      logger.warn('DashboardFacade.addUserReview', 'Validation failed', { error: validation.error.format() });
      throw new Error('리뷰 저장 실패: 입력값이 유효하지 않습니다. (' + errorMsg + ')');
    }
    if (this.strategy.addUserReview) await this.strategy.addUserReview(apartmentName, rating, content, authorUid, imageFile);
  }
  
  public async getUserProfile(uid: string) {
    if (!uid || typeof uid !== 'string') {
      logger.warn('DashboardFacade.getUserProfile', 'Invalid uid provided', { uid });
      return null;
    }
    return this.strategy.getUserProfile ? await this.strategy.getUserProfile(uid) : null;
  }
  
  public async updateNickname(uid: string, nickname: string): Promise<boolean> {
    const validation = UpdateNicknameInputSchema.safeParse({ uid, nickname });
    if (!validation.success) {
      logger.warn('DashboardFacade.updateNickname', 'Validation failed', { error: validation.error.format() });
      return false;
    }
    try {
      await UserRepo.updateNickname(uid, nickname);
      return true;
    } catch (error: unknown) {
      logger.error('DashboardFacade.updateNickname', 'Failed to update nickname due to network/timeout', { uid, nickname }, error);
      throw error;
    }
  }
  
  public async updatePhotoURL(uid: string, photoURL: string): Promise<boolean> {
    const validation = UpdatePhotoURLInputSchema.safeParse({ uid, photoURL });
    if (!validation.success) {
      logger.warn('DashboardFacade.updatePhotoURL', 'Validation failed', { error: validation.error.format() });
      return false;
    }
    try {
      await UserRepo.updatePhotoURL(uid, photoURL);
      return true;
    } catch (error: unknown) {
      logger.error('DashboardFacade.updatePhotoURL', 'Failed to update photoURL due to network/timeout', { uid }, error);
      throw error;
    }
  }
  
  public async incrementFieldReportView(reportId: string, title?: string) {
    const validation = IncrementFieldReportViewInputSchema.safeParse({ reportId, title });
    if (!validation.success) {
      logger.warn('DashboardFacade.incrementFieldReportView', 'Validation failed', { error: validation.error.format() });
      return;
    }
    if (this.strategy.incrementFieldReportView) await this.strategy.incrementFieldReportView(reportId, title);
  }
  
  public async incrementFieldReportLike(reportId: string) {
    const validation = IncrementFieldReportLikeInputSchema.safeParse(reportId);
    if (!validation.success) {
      logger.warn('DashboardFacade.incrementFieldReportLike', 'Invalid reportId provided', { error: validation.error.format(), reportId });
      return;
    }
    if (this.strategy.incrementFieldReportLike) await this.strategy.incrementFieldReportLike(reportId);
  }
  
  public async incrementReviewLike(reviewId: string) {
    const validation = IncrementReviewLikeInputSchema.safeParse(reviewId);
    if (!validation.success) {
      logger.warn('DashboardFacade.incrementReviewLike', 'Invalid reviewId provided', { error: validation.error.format(), reviewId });
      return;
    }
    if (this.strategy.incrementReviewLike) await this.strategy.incrementReviewLike(reviewId);
  }
  
  public async deleteReview(reviewId: string) {
    const validation = DeleteReviewInputSchema.safeParse(reviewId);
    if (!validation.success) {
      logger.warn('DashboardFacade.deleteReview', 'Invalid reviewId provided', { error: validation.error.format(), reviewId });
      return;
    }
    if (this.strategy.deleteReview) await this.strategy.deleteReview(reviewId);
  }
  
  public getDongtanApartments(): string[] { return this.strategy.getDongtanApartments ? this.strategy.getDongtanApartments() : []; }
}

// Prevent multiple instances during Next.js Fast Refresh
const globalForFacade = globalThis as unknown as {
  dashboardFacade: DashboardFacade | undefined;
};

export const dashboardFacade = globalForFacade.dashboardFacade ?? new DashboardFacade();
if (process.env.NODE_ENV !== 'production') {
  globalForFacade.dashboardFacade = dashboardFacade;
}

