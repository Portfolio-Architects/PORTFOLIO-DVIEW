import { db } from '@/lib/firebaseConfig';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { ScoutingReport } from '@/lib/types/scoutingReport';
import { uploadImage } from '@/lib/services/storage.service';
import type { ReportSections } from '@/lib/types/report.types';
import * as UserRepo from '@/lib/repositories/user.repository';
import { logger } from '@/lib/services/logger';
import { z } from 'zod';


// ── Zod Schemas ─────────────────────────────────────

export const ImageMetaSchema = z.object({
  url: z.string().url('이미지 URL 형식이 올바르지 않습니다.'),
  caption: z.string().default(''),
  locationTag: z.string().optional(),
  isPremium: z.boolean().optional(),
  capturedAt: z.string().optional(),
  uploaderName: z.string().optional(),
});

export const ObjectiveMetricsSchema = z.object({
  brand: z.string(),
  householdCount: z.number().int().nonnegative(),
  far: z.number().nonnegative(),
  bcr: z.number().nonnegative(),
  parkingCount: z.number().optional(),
  parkingPerHousehold: z.number().nonnegative(),
  yearBuilt: z.number().int(),
  minFloor: z.number().optional(),
  maxFloor: z.number().optional(),
  coordinates: z.string().optional(),
  distanceToElementary: z.number().nonnegative(),
  distanceToMiddle: z.number().nonnegative(),
  distanceToHigh: z.number().nonnegative(),
  distanceToSubway: z.number().nonnegative(),
  academyDensity: z.number().nonnegative(),
  academyCategories: z.record(z.string(), z.number()).optional(),
  restaurantDensity: z.number().optional(),
  restaurantCategories: z.record(z.string(), z.number()).optional(),
  distanceToIndeokwon: z.number().optional(),
  distanceToTram: z.number().optional(),
  distanceToStarbucks: z.number().optional(),
  starbucksName: z.string().optional(),
  starbucksAddress: z.string().optional(),
  starbucksCoordinates: z.string().optional(),
  distanceToMcDonalds: z.number().optional(),
  mcdonaldsName: z.string().optional(),
  mcdonaldsAddress: z.string().optional(),
  mcdonaldsCoordinates: z.string().optional(),
  distanceToOliveYoung: z.number().optional(),
  oliveYoungName: z.string().optional(),
  oliveYoungAddress: z.string().optional(),
  oliveYoungCoordinates: z.string().optional(),
  distanceToDaiso: z.number().optional(),
  daisoName: z.string().optional(),
  daisoAddress: z.string().optional(),
  daisoCoordinates: z.string().optional(),
  distanceToSupermarket: z.number().optional(),
  supermarketName: z.string().optional(),
  supermarketAddress: z.string().optional(),
  supermarketCoordinates: z.string().optional(),
  distanceToPark: z.number().optional(),
  nearestSchoolNames: z.object({
    elementary: z.string().optional(),
    middle: z.string().optional(),
    high: z.string().optional(),
  }).optional(),
  nearestStationName: z.string().optional(),
  nearestStationLine: z.string().optional(),
  nearestStationCoords: z.string().optional(),
  nearestIndeokwonStationName: z.string().optional(),
  nearestIndeokwonLine: z.string().optional(),
  nearestIndeokwonCoords: z.string().optional(),
  nearestTramStationName: z.string().optional(),
  nearestTramLine: z.string().optional(),
  nearestTramCoords: z.string().optional(),
});

export const AdSlotSchema = z.object({
  bannerUrl: z.string(),
  targetLink: z.string(),
  isActive: z.boolean(),
});

export const ScoutingReportInputSchema = z.object({
  dong: z.string().min(1, '동 이름을 입력해주세요.'),
  apartmentName: z.string().min(1, '아파트 이름을 입력해주세요.'),
  thumbnailUrl: z.string().url('썸네일 URL 형식이 올바르지 않습니다.'),
  images: z.array(ImageMetaSchema),
  metrics: ObjectiveMetricsSchema,
  premiumContent: z.string().optional(),
  premiumScores: z.any().optional(),
  isPremium: z.boolean().default(false),
  adSlot: AdSlotSchema.optional(),
  authorUid: z.string().min(1),
});

export const CreateFieldReportInputSchema = z.object({
  apartmentName: z.string().min(1, '아파트 이름을 입력해주세요.'),
  sections: z.any(),
  premiumScores: z.record(z.string(), z.number()).nullable().optional(),
  authorUid: z.string().min(1),
  imageEntries: z.array(z.object({
    file: z.any(),
    category: z.string(),
  })),
});



/**
 * Saves the fully constructed Scouting Report to Firestore.
 */
export async function createScoutingReport(
  reportData: Omit<ScoutingReport, 'id' | 'createdAt' | 'updatedAt'>
) {
  const validated = ScoutingReportInputSchema.safeParse(reportData);
  if (!validated.success) {
    logger.error('ReportService.createScoutingReport', 'Validation failed', { errors: validated.error.format() as any });
    throw new Error(`검증 실패: ${validated.error.issues[0]?.message}`);
  }

  try {
    const docRef = await addDoc(collection(db, 'scoutingReports'), {
      ...validated.data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    logger.error("ReportService.createScoutingReport", "Error adding scouting report document", undefined, error);
    throw error;
  }
}

/**
 * Updates an existing Scouting Report in Firestore.
 */
export async function updateScoutingReport(
  reportId: string,
  updateData: Partial<Omit<ScoutingReport, 'id' | 'createdAt' | 'updatedAt'>>
) {
  const validated = ScoutingReportInputSchema.partial().safeParse(updateData);
  if (!validated.success) {
    logger.error('ReportService.updateScoutingReport', 'Validation failed', { errors: validated.error.format() as any });
    throw new Error(`검증 실패: ${validated.error.issues[0]?.message}`);
  }

  try {
    const docRef = doc(db, 'scoutingReports', reportId);
    await updateDoc(docRef, {
      ...validated.data,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    logger.error("ReportService.updateScoutingReport", "Error updating scouting report document", undefined, error);
    throw error;
  }
}

/**
 * Handles uploading images, parsing metadata, and creating a field report document.
 */
export async function createFieldReport(
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
    logger.error('ReportService.createFieldReport', 'Validation failed', { errors: validated.error.format() as any });
    throw new Error(errorMsg);
  }

  const profile = await UserRepo.getOrCreateProfile(validated.data.authorUid);
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

  const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
  const { db } = await import('@/lib/firebaseConfig');
  await addDoc(collection(db, 'field_reports'), {
    apartmentName: validated.data.apartmentName,
    sections: mergedSections,
    images,
    premiumScores: validated.data.premiumScores || null,
    authorName: profile?.nickname || '익명',
    authorUid: validated.data.authorUid,
    likes: 0,
    commentCount: 0,
    createdAt: serverTimestamp(),
  });
  logger.info('ReportService.createFieldReport', 'Field report created', { apartmentName: validated.data.apartmentName, imageCount: images.length });
}
