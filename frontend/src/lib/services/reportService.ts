import { ScoutingReport } from '@/lib/types/scoutingReport';
import type { ReportSections } from '@/lib/types/report.types';
import * as UserRepo from '@/lib/repositories/user.repository';
import * as ReportRepo from '@/lib/repositories/report.repository';
import { logger } from '@/lib/services/logger';
import {
  ScoutingReportInputSchema,
  CreateFieldReportInputSchema,
} from '@/lib/validation/facade.schemas';

export class ReportService {
  constructor(
    private reportRepo: typeof ReportRepo = ReportRepo,
    private userRepo: typeof UserRepo = UserRepo
  ) {}

  async createScoutingReport(
    reportData: Omit<ScoutingReport, 'id' | 'createdAt' | 'updatedAt'>
  ) {
    const validated = ScoutingReportInputSchema.safeParse(reportData);
    if (!validated.success) {
      logger.error('ReportService.createScoutingReport', 'Validation failed', { errors: validated.error.format() as unknown });
      throw new Error(`검증 실패: ${validated.error.issues[0]?.message}`);
    }

    try {
      return await this.reportRepo.saveScoutingReport(validated.data);
    } catch (error) {
      logger.error("ReportService.createScoutingReport", "Error adding scouting report document via repository", undefined, error);
      throw error;
    }
  }

  async updateScoutingReport(
    reportId: string,
    updateData: Partial<Omit<ScoutingReport, 'id' | 'createdAt' | 'updatedAt'>>
  ) {
    const validated = ScoutingReportInputSchema.partial().safeParse(updateData);
    if (!validated.success) {
      logger.error('ReportService.updateScoutingReport', 'Validation failed', { errors: validated.error.format() as unknown });
      throw new Error(`검증 실패: ${validated.error.issues[0]?.message}`);
    }

    try {
      await this.reportRepo.updateScoutingReport(reportId, validated.data);
    } catch (error) {
      logger.error("ReportService.updateScoutingReport", "Error updating scouting report document via repository", undefined, error);
      throw error;
    }
  }

  async createFieldReport(
    apartmentName: string,
    sections: ReportSections,
    premiumScores: Record<string, number> | null,
    authorUid: string,
    imageEntries: {file: File, category: string}[],
    onProgress?: (done: number, total: number) => void
  ): Promise<void> {
    const validated = CreateFieldReportInputSchema.safeParse({
      apartmentName,
      sections,
      premiumScores,
      authorUid,
      imageEntries,
    });
    if (!validated.success) {
      const errorMsg = validated.error.issues[0]?.message || '입력값 검증에 실패했습니다.';
      logger.error('ReportService.createFieldReport', 'Validation failed', { errors: validated.error.format() as unknown });
      throw new Error(errorMsg);
    }

    const profile = await this.userRepo.getOrCreateProfile(validated.data.authorUid);
    const total = validated.data.imageEntries.length;
    let done = 0;

    const BATCH_SIZE = 5;
    const uploadedImages: {url: string, category: string}[] = [];

    for (let i = 0; i < total; i += BATCH_SIZE) {
      const batch = validated.data.imageEntries.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(batch.map(async ({ file, category }) => {
        try {
          const { uploadImage } = await import('@/lib/services/storage.service');
          const downloadUrl = await uploadImage(file, 'field_reports');
          done++;

          onProgress?.(done, total);
          return { url: downloadUrl, category };
        } catch (storageError) {
          logger.error('ReportService.createFieldReport', `Upload failed for ${file.name}`, undefined, storageError);
          done++;
          onProgress?.(done, total);
          return null;
        }
      }));
      uploadedImages.push(...results.filter(Boolean) as {url: string, category: string}[]);
    }

    const images = uploadedImages.map(img => ({
      url: img.url,
      caption: '',
      locationTag: img.category,
    }));

    const mergedSections = JSON.parse(JSON.stringify(validated.data.sections)) as ReportSections;
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

    await this.reportRepo.saveFieldReport({
      apartmentName: validated.data.apartmentName,
      sections: mergedSections,
      images,
      premiumScores: validated.data.premiumScores || null,
      authorName: profile?.nickname || '익명',
      authorUid: validated.data.authorUid,
      likes: 0,
      commentCount: 0,
    });
    logger.info('ReportService.createFieldReport', 'Field report created via repository', { apartmentName: validated.data.apartmentName, imageCount: images.length });
  }
}

// Export default service instance
export const reportService = new ReportService();

export async function createScoutingReport(
  reportData: Omit<ScoutingReport, 'id' | 'createdAt' | 'updatedAt'>
) {
  return reportService.createScoutingReport(reportData);
}

export async function updateScoutingReport(
  reportId: string,
  updateData: Partial<Omit<ScoutingReport, 'id' | 'createdAt' | 'updatedAt'>>
) {
  return reportService.updateScoutingReport(reportId, updateData);
}

export async function createFieldReport(
  apartmentName: string,
  sections: ReportSections,
  premiumScores: Record<string, number> | null,
  authorUid: string,
  imageEntries: {file: File, category: string}[],
  onProgress?: (done: number, total: number) => void
): Promise<void> {
  return reportService.createFieldReport(apartmentName, sections, premiumScores, authorUid, imageEntries, onProgress);
}
