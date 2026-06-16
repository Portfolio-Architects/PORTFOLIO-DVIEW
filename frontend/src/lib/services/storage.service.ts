/**
 * @module storage.service
 * @description Centralized service for image compression and Firebase Storage operations.
 * Architecture Layer: Service (directly interacts with Firebase Storage and utils)
 */
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebaseConfig';
import { compressImage } from '@/lib/utils/imageCompression';
import { logger } from '@/lib/services/logger';

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
    const storageRef = ref(storage, `${folderPath}/${uniqueName}`);

    // Compress client image before upload
    const compressed = await compressImage(file);
    const snapshot = await uploadBytes(storageRef, compressed);
    const downloadURL = await getDownloadURL(snapshot.ref);

    logger.info('StorageService.uploadImage', 'Image compressed and uploaded successfully', { folderPath, uniqueName });
    return downloadURL;
  } catch (error) {
    logger.error('StorageService.uploadImage', 'Failed to upload image to Firebase Storage', { folderPath, fileName: file.name }, error);
    throw error;
  }
}
