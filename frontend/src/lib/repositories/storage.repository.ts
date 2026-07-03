/**
 * @module storage.repository
 * @description Data Access Layer for Firebase Storage operations.
 * Architecture Layer: Repository (Raw SDK file I/O only)
 */
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@/lib/firebaseConfig';
import { logger } from '@/lib/services/logger';

export async function uploadRawBytes(filePath: string, blob: Blob): Promise<string> {
  try {
    const storageRef = ref(storage, filePath);
    const snapshot = await uploadBytes(storageRef, blob);
    return await getDownloadURL(snapshot.ref);
  } catch (error) {
    logger.error('storage.repository.uploadRawBytes', 'Failed to upload bytes to Firebase Storage', { filePath }, error as Error);
    throw error;
  }
}

export async function deleteRawObject(filePathOrUrl: string): Promise<void> {
  try {
    const fileRef = ref(storage, filePathOrUrl);
    await deleteObject(fileRef);
  } catch (error) {
    logger.error('storage.repository.deleteRawObject', 'Failed to delete object from Firebase Storage', { filePathOrUrl }, error as Error);
    throw error;
  }
}
