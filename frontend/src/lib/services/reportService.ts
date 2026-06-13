import { db, storage } from '@/lib/firebaseConfig';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ScoutingReport } from '@/lib/types/scoutingReport';
import { compressImage } from '@/lib/utils/imageCompression';

/**
 * Uploads an image file to Firebase Storage and returns its download URL.
 */
export async function uploadImage(file: File, folderPath: string): Promise<string> {
  const ext = file.name.split('.').pop();
  const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;
  const storageRef = ref(storage, `${folderPath}/${uniqueName}`);

  const compressed = await compressImage(file);
  const snapshot = await uploadBytes(storageRef, compressed);
  const downloadURL = await getDownloadURL(snapshot.ref);
  return downloadURL;
}

/**
 * Saves the fully constructed Scouting Report to Firestore.
 */
export async function createScoutingReport(
  reportData: Omit<ScoutingReport, 'id' | 'createdAt' | 'updatedAt'>
) {
  try {
    const docRef = await addDoc(collection(db, 'scoutingReports'), {
      ...reportData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding scouting report document: ", error);
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
  try {
    const docRef = doc(db, 'scoutingReports', reportId);
    await updateDoc(docRef, {
      ...updateData,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating scouting report document: ", error);
    throw error;
  }
}

import type { ReportSections } from '@/lib/types/report.types';
import * as UserRepo from '@/lib/repositories/user.repository';
import { logger } from '@/lib/services/logger';

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
  const profile = await UserRepo.getOrCreateProfile(authorUid);
  const total = imageEntries.length;
  let done = 0;

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
  logger.info('ReportService.createFieldReport', 'Field report created', { apartmentName, imageCount: images.length });
}
