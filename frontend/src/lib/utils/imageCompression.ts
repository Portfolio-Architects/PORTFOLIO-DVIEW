/**
 * @module imageCompression
 * @description Client-side image compression utility.
 * Compresses images before Firebase Storage upload to reduce bandwidth and loading times.
 * Uses browser-image-compression library with Canvas API under the hood.
 */
import imageCompression from 'browser-image-compression';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';

// Isomorphic Zod Schema for File instance check to prevent ReferenceError during SSR
export const ImageFileSchema = z.custom<any>((val) => {
  if (typeof File === 'undefined') return true; // Safe fallback during Node SSR
  return val instanceof File;
}, 'Input must be a valid File object');

export const CompressionOptionsSchema = z.object({
  maxSizeMB: z.number().positive().catch(1),
  maxWidthOrHeight: z.number().int().positive().catch(1920),
  useWebWorker: z.boolean().catch(true),
  fileType: z.enum(['image/jpeg', 'image/png', 'image/webp']).catch('image/jpeg'),
  initialQuality: z.number().min(0).max(1).catch(0.82),
});

/** Compression options — FHD max, optimized for mobile */
const COMPRESSION_OPTIONS = {
  maxSizeMB: 1,                // Target max ~1MB per image
  maxWidthOrHeight: 1920,      // FHD — sharp on mobile & most displays
  useWebWorker: true,          // Non-blocking compression
  fileType: 'image/jpeg' as const,
  initialQuality: 0.82,        // High visual quality, smaller file
};

/**
 * Compresses a File (image) before upload.
 * Non-image files are returned unchanged.
 * @param file - The original File object
 * @returns Compressed File object (or original if not an image)
 */
export async function compressImage(file: File): Promise<File> {
  // 1. Validate File parameter using safe Zod custom schema
  const fileValidation = ImageFileSchema.safeParse(file);
  if (!fileValidation.success) {
    logger.warn('imageCompression.compressImage', 'Invalid file parameter provided', {
      error: String(fileValidation.error)
    });
    return file;
  }

  // Skip non-image files safely checking type property
  if (!file || typeof file.type !== 'string' || !file.type.startsWith('image/')) {
    return file;
  }

  // 2. Validate Compression options configuration using Zod
  const optionsValidation = CompressionOptionsSchema.safeParse(COMPRESSION_OPTIONS);
  const validatedOptions = optionsValidation.success ? optionsValidation.data : COMPRESSION_OPTIONS;
  if (!optionsValidation.success) {
    logger.warn('imageCompression.compressImage', 'Compression options validation failed, using defaults', {
      error: String(optionsValidation.error)
    });
  }

  try {
    const compressed = await imageCompression(file, validatedOptions);
    return compressed;
  } catch (error: any) {
    logger.warn('imageCompression.compressImage', 'Compression failed, using original file', {
      fileName: file.name,
      fileSize: file.size,
      error: error.message || String(error)
    });
    return file;
  }
}
