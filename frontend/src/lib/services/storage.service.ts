/**
 * @module storage.service
 * @description Centralized service for image compression and Firebase Storage operations.
 * Architecture Layer: Service (directly interacts with Firebase Storage and utils)
 */
import { compressImage } from '@/lib/utils/imageCompression';
import { logger } from '@/lib/services/logger';
import * as StorageRepo from '@/lib/repositories/storage.repository';

const MAX_UPLOAD_IMAGE_BYTES = 10 * 1024 * 1024;

export const ALLOWED_RASTER_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/heic',
  'image/heif',
]);

const ALLOWED_RASTER_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
  'avif',
  'heic',
  'heif',
]);

const MIME_TO_DEFAULT_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

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
    const normalizedMime = (file?.type || '').split(';')[0].trim().toLowerCase();
    if (!ALLOWED_RASTER_IMAGE_MIME_TYPES.has(normalizedMime)) {
      throw new Error(`Unsupported image MIME type (${normalizedMime || 'unknown'}): only raster images are allowed`);
    }
    if (!Number.isFinite(file.size) || file.size <= 0 || file.size > MAX_UPLOAD_IMAGE_BYTES) {
      throw new Error(`Invalid image file size (${file?.size ?? 0} bytes)`);
    }

    // Compress client image before upload and validate post-compression MIME & size bounds
    const compressed = await compressImage(file);
    const compressedMime = (compressed?.type || '').split(';')[0].trim().toLowerCase();
    if (!ALLOWED_RASTER_IMAGE_MIME_TYPES.has(compressedMime)) {
      throw new Error(`Unsupported compressed image MIME type (${compressedMime || 'unknown'})`);
    }
    if (
      !compressed ||
      !Number.isFinite(compressed.size) ||
      compressed.size <= 0 ||
      compressed.size > MAX_UPLOAD_IMAGE_BYTES
    ) {
      throw new Error(`Invalid compressed image file size (${compressed?.size ?? 0} bytes)`);
    }

    const rawExt = (file.name.split('.').pop() || '').trim().toLowerCase();
    const mappedExt = MIME_TO_DEFAULT_EXTENSION[compressedMime] || 'jpg';
    const ext =
      (compressedMime === 'image/jpeg' || compressedMime === 'image/jpg') && rawExt === 'jpeg'
        ? 'jpeg'
        : ALLOWED_RASTER_EXTENSIONS.has(mappedExt)
          ? mappedExt
          : 'jpg';
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;
    const filePath = `${folderPath}/${uniqueName}`;
    const storageContentType = compressedMime === 'image/jpg' ? 'image/jpeg' : compressedMime;

    const downloadURL = await StorageRepo.uploadRawBytes(filePath, compressed, {
      contentType: storageContentType,
    });

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

