/**
 * @module storage.service
 * @description Centralized service for image compression and Firebase Storage operations.
 * Architecture Layer: Service (directly interacts with Firebase Storage and utils)
 */
import { compressImage } from '@/lib/utils/imageCompression';
import { logger } from '@/lib/services/logger';
import * as StorageRepo from '@/lib/repositories/storage.repository';

/**
 * Compresses an image file, uploads it to Firebase Storage under a designated folder path,
 * and returns the public download URL.
 * 
 * @param file - The raw File object from client
 * @param folderPath - Storage folder path (e.g., 'posts', 'scoutingReports')
 * @returns Promise resolving to the download URL string
 */
export async function uploadImage(file: File, folderPath: string): Promise<string> {
  try {
    const ext = file.name.split('.').pop() || 'jpg';
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;
    const filePath = `${folderPath}/${uniqueName}`;

    // Compress client image before upload
    const compressed = await compressImage(file);
    const downloadURL = await StorageRepo.uploadRawBytes(filePath, compressed);

    logger.info('StorageService.uploadImage', 'Image compressed and uploaded successfully', { folderPath, uniqueName });
    return downloadURL;
  } catch (error) {
    logger.error('StorageService.uploadImage', 'Failed to upload image to Firebase Storage', { folderPath, fileName: file.name }, error);
    throw error;
  }
}

/**
 * Deletes a physical file from Firebase Storage given its public download URL.
 * 
 * @param downloadURL - The full public URL of the image
 */
export async function deleteImage(downloadURL: string): Promise<void> {
  try {
    await StorageRepo.deleteRawObject(downloadURL);
    logger.info('StorageService.deleteImage', 'Image deleted from Firebase Storage', { downloadURL });
  } catch (error) {
    logger.error('StorageService.deleteImage', 'Failed to delete image from Firebase Storage', { downloadURL }, error);
    // Silent catch: do not throw to block main document deletions
  }
}

