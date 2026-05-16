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
import { compressImage } from '@/lib/utils/imageCompression';

// Types (re-export for backward compatibility)
export type { KPIData, NewsItemData, AdBannerData } from '@/lib/types/dashboard.types';
export type { FieldReportData, ReportSections, CommentData } from '@/lib/types/report.types';
export type { UserReview } from '@/lib/types/review.types';

// Internal imports
import type { KPIData, NewsItemData, AdBannerData } from '@/lib/types/dashboard.types';
import type { FieldReportData, ReportSections, CommentData } from '@/lib/types/report.types';
import type { UserReview } from '@/lib/types/review.types';

import { isAdmin as checkAdmin } from '@/lib/config/admin.config';
import * as PostRepo from '@/lib/repositories/post.repository';
import * as ReportRepo from '@/lib/repositories/report.repository';
import * as CommentRepo from '@/lib/repositories/comment.repository';
import * as ReviewRepo from '@/lib/repositories/review.repository';
import * as UserRepo from '@/lib/repositories/user.repository';
import * as ApartmentRepo from '@/lib/repositories/apartment.repository';
import * as PostService from '@/lib/services/post.service';
import { createInitialKPIs, startKPISimulation } from '@/lib/services/kpi.service';
import { logger } from '@/lib/services/logger';

// --- Strategy Interface (preserved for extensibility) ---

export interface DashboardDataStrategy {
  getKPIs(): KPIData[];
  getNewsFeed(): NewsItemData[];
  getFieldReports?(): FieldReportData[];
  getFullReport?(reportId: string): Promise<FieldReportData | null>;
  getFullReportByApartmentName?(apartmentName: string): Promise<FieldReportData | null>;
  getAdBanner(): AdBannerData;
  subscribe?(callback: () => void): () => void;
  addPost?(title: string, content: string, category: string, authorUid: string, imageFile?: File, authorEmail?: string | null): Promise<void>;
  incrementPostView?(postId: string, title?: string): Promise<void>;
  addFieldReport?(apartmentName: string, sections: ReportSections, premiumScores: Record<string, number> | null, authorUid: string, imageEntries: {file: File, category: string}[], onProgress?: (done: number, total: number) => void): Promise<void>;
  incrementFieldReportView?(reportId: string, title?: string): Promise<void>;
  addFieldReportComment?(reportId: string, text: string, authorUid: string): Promise<void>;
  incrementLike?(postId: string): Promise<void>;
  incrementFieldReportLike?(reportId: string): Promise<void>;
  incrementReviewLike?(reviewId: string): Promise<void>;
  deleteReview?(reviewId: string): Promise<void>;
  deletePost?(postId: string): Promise<void>;
  listenToComments?(reportId: string, callback: (comments: CommentData[]) => void): () => void;
  getUserProfile?(uid: string): Promise<import('@/lib/types/user.types').UserProfile>;
  getUserReviews?(): UserReview[];
  addUserReview?(apartmentName: string, rating: number, content: string, authorUid: string, imageFile?: File): Promise<void>;
  getDongtanApartments?(): string[];
  isAdmin(email: string | null | undefined): boolean;
  subscribeTo?(key: 'kpis' | 'newsFeed' | 'fieldReports' | 'userReviews' | 'dongtanApartments', callback: () => void): () => void;
}

// --- Subscribable State Manager ---
class Subscribable<T> {
  private data: T;
  private listeners = new Set<() => void>();
  constructor(initialData: T) { this.data = initialData; }
  get = (): T => this.data;
  set = (newData: T) => {
    this.data = newData;
    this.listeners.forEach(cb => cb());
  };
  subscribe = (callback: () => void) => {
    this.listeners.add(callback);
    return () => { this.listeners.delete(callback); };
  };
}

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

  constructor() {
    // Only init Firestore listeners on the client side
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  private init() {
    if (this.initialized) return;
    this.initialized = true;

    // KPI simulation
    const stopKPI = startKPISimulation(this.stores.kpis.get(), () => {
      this.stores.kpis.set([...this.stores.kpis.get()]);
    });
    this.cleanupFns.push(stopKPI);

    // Firestore listeners (delegated to repositories)
    // DISABLED for RSC Migration: These are now fetched Server-Side to reduce client memory footprint.
    /*
    const stopPosts = PostRepo.listenToPosts((posts) => {
      this.stores.newsFeed.set(posts);
    });
    this.cleanupFns.push(stopPosts);

    const stopReports = ReportRepo.listenToReports((reports) => {
      this.stores.fieldReports.set(reports);
    });
    this.cleanupFns.push(stopReports);

    const stopReviews = ReviewRepo.listenToReviews((reviews) => {
      this.stores.userReviews.set(reviews);
    });
    this.cleanupFns.push(stopReviews);
    */

    // External API
    ApartmentRepo.fetchApartmentNames().then((apts) => {
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
    return ReportRepo.getFullReport(reportId);
  }

  async getFullReportByApartmentName(apartmentName: string): Promise<FieldReportData | null> {
    return ReportRepo.getFullReportByApartmentName(apartmentName);
  }
  getDongtanApartments(): string[] { return this.stores.dongtanApartments.get(); }

  getAdBanner(): AdBannerData {
    return {
      title: '동탄센트럴파크 앞 프리미엄 치과 오픈!',
      description: '최첨단 장비와 분야별 전문의 협진. 첫 방문 고객 스케일링 이벤트 중',
      buttonText: '예약하기',
    };
  }

  async addPost(title: string, content: string, category: string, authorUid: string, imageFile?: File, authorEmail?: string | null) {
    try {
      await PostService.createPost(title, content, category, authorUid, imageFile, authorEmail);
    } catch (e: unknown) {
      const msg = e instanceof Error ? (e as Error).message : String(e);
      logger.error('DashboardFacade.addPost', 'Post creation failed', { title }, e);
      alert("글 저장 실패! 이유: " + msg);
    }
  }

  async addFieldReport(apartmentName: string, sections: ReportSections, premiumScores: Record<string, number> | null, authorUid: string, imageEntries: {file: File, category: string}[], onProgress?: (done: number, total: number) => void) {
    try {
      const profile = await UserRepo.getOrCreateProfile(authorUid);
      const total = imageEntries.length;
      let done = 0;

      // Upload all images — batched 5 at a time to avoid overwhelming Firebase
      const BATCH_SIZE = 5;
      const uploadedImages: {url: string, category: string}[] = [];

      for (let i = 0; i < total; i += BATCH_SIZE) {
        const batch = imageEntries.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(batch.map(async ({ file, category }) => {
          try {
            const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
            const { storage } = await import('@/lib/firebaseConfig');
            
            const compressed = await compressImage(file);
            const storageRef = ref(storage, `field_reports/${Date.now()}_${Math.random().toString(36).slice(2, 7)}_${file.name}`);
            const snapshot = await uploadBytes(storageRef, compressed);
            const downloadUrl = await getDownloadURL(snapshot.ref);
            done++;
            onProgress?.(done, total);
            return { url: downloadUrl, category };
          } catch (storageError) {
            logger.error('DashboardFacade.addFieldReport', `Upload failed for ${file.name}`, undefined, storageError);
            done++;
            onProgress?.(done, total);
            return null;
          }
        }));
        uploadedImages.push(...results.filter(Boolean) as {url: string, category: string}[]);
      }

      // Build ImageMeta array
      const images = uploadedImages.map(img => ({
        url: img.url,
        caption: '',
        locationTag: img.category,
      }));

      // Legacy compat: also set first image per category in sections
      const mergedSections = JSON.parse(JSON.stringify(sections)) as ReportSections;
      const SECTION_MAP: Record<string, [keyof ReportSections, string]> = {
        'gateImg': ['infra', 'gateImg'], 'landscapeImg': ['infra', 'landscapeImg'],
        'parkingImg': ['infra', 'parkingImg'], 'maintenanceImg': ['infra', 'maintenanceImg'],
        'communityImg': ['ecosystem', 'communityImg'], 'schoolImg': ['ecosystem', 'schoolImg'],
        'commerceImg': ['ecosystem', 'commerceImg'],
      };
      for (const img of uploadedImages) {
        const mapping = SECTION_MAP[img.category];
        if (mapping) {
          const [section, field] = mapping;
          if (!(mergedSections[section] as Record<string, string>)[field]) {
            (mergedSections[section] as Record<string, string>)[field] = img.url;
          }
        }
      }

      const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebaseConfig');
      await addDoc(collection(db, 'field_reports'), {
        apartmentName,
        sections: mergedSections,
        images,
        premiumScores: premiumScores || null,
        authorName: profile?.nickname || '익명',
        authorUid,
        likes: 0,
        commentCount: 0,
        createdAt: serverTimestamp(),
      });
      logger.info('DashboardFacade.addFieldReport', 'Field report created', { apartmentName, imageCount: images.length });
    } catch (e: unknown) {
      const msg = e instanceof Error ? (e as Error).message : String(e);
      logger.error('DashboardFacade.addFieldReport', 'Failed', { apartmentName }, e);
      alert('임장기 저장 실패! 이유: ' + msg);
    }
  }

  async addFieldReportComment(reportId: string, text: string, authorUid: string) {
    try {
      const profile = await UserRepo.getOrCreateProfile(authorUid);
      await CommentRepo.addComment(reportId, text, profile.nickname, authorUid);
    } catch (e: unknown) {
      const msg = e instanceof Error ? (e as Error).message : String(e);
      logger.error('DashboardFacade.addFieldReportComment', 'Comment failed', { reportId }, e);
      alert("댓글 저장 실패! 이유: " + msg);
    }
  }

  listenToComments(reportId: string, callback: (comments: CommentData[]) => void) {
    return CommentRepo.listenToComments(reportId, callback);
  }

  async getUserProfile(uid: string): Promise<import('@/lib/types/user.types').UserProfile> {
    return UserRepo.getOrCreateProfile(uid);
  }

  async incrementLike(postId: string) {
    try { await PostRepo.incrementPostLike(postId); }
    catch (e) { logger.error('DashboardFacade.incrementLike', 'Like failed', { postId }, e); }
  }

  async incrementPostView(postId: string, title?: string) {
    try { await PostRepo.incrementPostView(postId, title); }
    catch (e) { logger.error('DashboardFacade.incrementPostView', 'View update failed', { postId }, e); }
  }

  async incrementFieldReportView(reportId: string, title?: string) {
    try { await ReportRepo.incrementReportView(reportId, title); }
    catch (e) { logger.error('DashboardFacade.incrementFieldReportView', 'View update failed', { reportId }, e); }
  }

  async incrementFieldReportLike(reportId: string) {
    try { await ReportRepo.incrementReportLike(reportId); }
    catch (e) { logger.error('DashboardFacade.incrementFieldReportLike', 'Like failed', { reportId }, e); }
  }

  async addUserReview(apartmentName: string, rating: number, content: string, authorUid: string, imageFile?: File) {
    try {
      const profile = await UserRepo.getOrCreateProfile(authorUid);
      const displayName = profile.nickname || '익명';
      await ReviewRepo.addReview(
        apartmentName, rating, content, displayName, authorUid,
        profile.verifiedApartment, profile.verificationLevel, imageFile
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? (e as Error).message : String(e);
      logger.error('DashboardFacade.addUserReview', 'Review failed', { apartmentName }, e);
      alert('리뷰 저장 실패! 이유: ' + msg);
    }
  }

  async incrementReviewLike(reviewId: string) {
    try { await ReviewRepo.incrementReviewLike(reviewId); }
    catch (e) { logger.error('DashboardFacade.incrementReviewLike', 'Like failed', { reviewId }, e); }
  }

  async deleteReview(reviewId: string) {
    try { await ReviewRepo.deleteReview(reviewId); }
    catch (e) { logger.error('DashboardFacade.deleteReview', 'Delete failed', { reviewId }, e); throw e; }
  }

  async deletePost(postId: string) {
    try { await PostRepo.deletePost(postId); }
    catch (e) { logger.error('DashboardFacade.deletePost', 'Delete failed', { postId }, e); throw e; }
  }

  isAdmin(email: string | null | undefined): boolean {
    return checkAdmin(email);
  }
}

// --- Facade ---

export class DashboardFacade {
  private strategy: DashboardDataStrategy;

  constructor(strategy?: DashboardDataStrategy) {
    this.strategy = strategy || new FirebaseDashboardDataStrategy();
  }

  public setStrategy(strategy: DashboardDataStrategy) { this.strategy = strategy; }
  public subscribeTo(key: 'kpis' | 'newsFeed' | 'fieldReports' | 'userReviews' | 'dongtanApartments', callback: () => void) {
    return this.strategy.subscribeTo ? this.strategy.subscribeTo(key, callback) : () => {};
  }
  public getKPIs(): KPIData[] { return this.strategy.getKPIs(); }
  public getNewsFeed(): NewsItemData[] { return this.strategy.getNewsFeed(); }
  public getFieldReports(): FieldReportData[] { return this.strategy.getFieldReports ? this.strategy.getFieldReports() : []; }
  public async getFullReport(reportId: string): Promise<FieldReportData | null> { return this.strategy.getFullReport ? await this.strategy.getFullReport(reportId) : null; }
  public async getFullReportByApartmentName(apartmentName: string): Promise<FieldReportData | null> { return this.strategy.getFullReportByApartmentName ? await this.strategy.getFullReportByApartmentName(apartmentName) : null; }
  public getUserReviews(): UserReview[] { return this.strategy.getUserReviews ? this.strategy.getUserReviews() : []; }
  public getAdBanner(): AdBannerData { return this.strategy.getAdBanner(); }
  public async addPost(title: string, content: string, category: string, authorUid: string, imageFile?: File, authorEmail?: string | null) { if (this.strategy.addPost) await this.strategy.addPost(title, content, category, authorUid, imageFile, authorEmail); }
  public async addFieldReport(apartmentName: string, sections: ReportSections, premiumScores: Record<string, number> | null, authorUid: string, imageEntries: {file: File, category: string}[], onProgress?: (done: number, total: number) => void) { if (this.strategy.addFieldReport) await this.strategy.addFieldReport(apartmentName, sections, premiumScores, authorUid, imageEntries, onProgress); }
  public async addFieldReportComment(reportId: string, text: string, authorUid: string) { if (this.strategy.addFieldReportComment) await this.strategy.addFieldReportComment(reportId, text, authorUid); }
  public async addUserReview(apartmentName: string, rating: number, content: string, authorUid: string, imageFile?: File) { if (this.strategy.addUserReview) await this.strategy.addUserReview(apartmentName, rating, content, authorUid, imageFile); }
  public listenToComments(reportId: string, callback: (comments: CommentData[]) => void) { return this.strategy.listenToComments ? this.strategy.listenToComments(reportId, callback) : () => {}; }
  public async getUserProfile(uid: string) { return this.strategy.getUserProfile ? await this.strategy.getUserProfile(uid) : null; }
  public async updateNickname(uid: string, nickname: string) { await UserRepo.updateNickname(uid, nickname); }
  public async updatePhotoURL(uid: string, photoURL: string) { await UserRepo.updatePhotoURL(uid, photoURL); }
  public async incrementLike(postId: string) { if (this.strategy.incrementLike) await this.strategy.incrementLike(postId); }
  public async incrementPostView(postId: string, title?: string) { if (this.strategy.incrementPostView) await this.strategy.incrementPostView(postId, title); }
  public async incrementFieldReportView(reportId: string, title?: string) { if (this.strategy.incrementFieldReportView) await this.strategy.incrementFieldReportView(reportId, title); }
  public async incrementFieldReportLike(reportId: string) { if (this.strategy.incrementFieldReportLike) await this.strategy.incrementFieldReportLike(reportId); }
  public async incrementReviewLike(reviewId: string) { if (this.strategy.incrementReviewLike) await this.strategy.incrementReviewLike(reviewId); }
  public async deleteReview(reviewId: string) { if (this.strategy.deleteReview) await this.strategy.deleteReview(reviewId); }
  public async deletePost(postId: string) { if (this.strategy.deletePost) await this.strategy.deletePost(postId); }
  public getDongtanApartments(): string[] { return this.strategy.getDongtanApartments ? this.strategy.getDongtanApartments() : []; }
  public isAdmin(email: string | null | undefined): boolean { return this.strategy.isAdmin ? this.strategy.isAdmin(email) : false; }
}

// Prevent multiple instances during Next.js Fast Refresh
const globalForFacade = globalThis as unknown as {
  dashboardFacade: DashboardFacade | undefined;
};

export const dashboardFacade = globalForFacade.dashboardFacade ?? new DashboardFacade();
if (process.env.NODE_ENV !== 'production') {
  globalForFacade.dashboardFacade = dashboardFacade;
}

// --- React Hook (re-exported for backward compatibility) ---
import { useState, useEffect, useSyncExternalStore, useCallback } from 'react';

const EMPTY_ARRAY: any[] = [];

/**
 * React hook providing reactive dashboard data via useSyncExternalStore.
 * Avoids global array spread deep-copies and triggers re-renders ONLY when specific data references change.
 */
export function useDashboardData() {
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => setIsHydrated(true), []);

  const kpis = useSyncExternalStore(
    useCallback((cb) => dashboardFacade.subscribeTo('kpis', cb), []),
    () => dashboardFacade.getKPIs(),
    () => EMPTY_ARRAY as KPIData[]
  );

  const newsFeed = useSyncExternalStore(
    useCallback((cb) => dashboardFacade.subscribeTo('newsFeed', cb), []),
    () => dashboardFacade.getNewsFeed(),
    () => EMPTY_ARRAY as NewsItemData[]
  );

  const fieldReports = useSyncExternalStore(
    useCallback((cb) => dashboardFacade.subscribeTo('fieldReports', cb), []),
    () => dashboardFacade.getFieldReports(),
    () => EMPTY_ARRAY as FieldReportData[]
  );

  const userReviews = useSyncExternalStore(
    useCallback((cb) => dashboardFacade.subscribeTo('userReviews', cb), []),
    () => dashboardFacade.getUserReviews(),
    () => EMPTY_ARRAY as UserReview[]
  );

  const dongtanApartments = useSyncExternalStore(
    useCallback((cb) => dashboardFacade.subscribeTo('dongtanApartments', cb), []),
    () => dashboardFacade.getDongtanApartments(),
    () => EMPTY_ARRAY as string[]
  );

  return { 
    kpis, 
    newsFeed, 
    fieldReports, 
    userReviews, 
    dongtanApartments, 
    adBanner: dashboardFacade.getAdBanner(), 
    isHydrated 
  };
}
