/**
 * Image Compression Utility
 * Compresses images to stay under provider size limits
 */

import { toast } from "sonner";

/**
 * Target max size for images AFTER base64 encoding
 * Amazon Bedrock and other providers have a 5MB limit on base64 images
 * Base64 encoding adds ~33% overhead, so we target 3.5MB raw to get ~4.6MB encoded
 */
const TARGET_MAX_SIZE = 3.5 * 1024 * 1024; // 3.5MB

/**
 * Maximum dimension for images (width or height)
 * Prevents absurdly large images while maintaining quality
 */
const MAX_DIMENSION = 4096;

/**
 * Initial quality for compression
 */
const INITIAL_QUALITY = 0.9;

/**
 * Minimum quality to maintain visual fidelity
 */
const MIN_QUALITY = 0.6;

/**
 * Compress an image file to meet size requirements
 * Uses Canvas API to resize and compress
 */
export async function compressImage(file: File): Promise<File> {
  // If image is already under target size, return as-is
  if (file.size <= TARGET_MAX_SIZE) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Failed to get canvas context"));
      return;
    }

    img.onload = async () => {
      try {
        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = img;

        // Reduce dimensions if either exceeds MAX_DIMENSION
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);
        }

        // If file is way too big, reduce dimensions further
        if (file.size > TARGET_MAX_SIZE * 2) {
          const reductionRatio = Math.sqrt(TARGET_MAX_SIZE / file.size);
          width = Math.floor(width * reductionRatio);
          height = Math.floor(height * reductionRatio);
        }

        canvas.width = width;
        canvas.height = height;

        // Draw image on canvas with better quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        // Try compressing with different quality levels until under target
        let quality = INITIAL_QUALITY;
        let compressedBlob: Blob | null = null;

        while (quality >= MIN_QUALITY) {
          compressedBlob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
          });

          if (!compressedBlob) {
            reject(new Error("Failed to compress image"));
            return;
          }

          // Check if we're under target size
          if (compressedBlob.size <= TARGET_MAX_SIZE) {
            break;
          }

          // Reduce quality and try again
          quality -= 0.1;
        }

        if (!compressedBlob) {
          reject(new Error("Failed to compress image"));
          return;
        }

        // Show toast notification
        const originalSizeMB = (file.size / (1024 * 1024)).toFixed(2);
        const compressedSizeMB = (compressedBlob.size / (1024 * 1024)).toFixed(
          2
        );

        toast.info("Image compressed", {
          description: `Reduced from ${originalSizeMB}MB to ${compressedSizeMB}MB for upload`,
        });

        // Convert blob to file - use original extension if it's already JPEG
        const isJpeg = file.type === "image/jpeg" || file.type === "image/jpg";
        const newFilename = isJpeg
          ? file.name
          : file.name.replace(/\.[^.]+$/, ".jpg");

        const compressedFile = new File([compressedBlob], newFilename, {
          type: "image/jpeg",
          lastModified: Date.now(),
        });

        // Clean up the object URL
        URL.revokeObjectURL(img.src);

        resolve(compressedFile);
      } catch (error) {
        URL.revokeObjectURL(img.src);
        reject(error);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error("Failed to load image"));
    };

    // Load the image
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Check if a file needs compression
 */
export function needsCompression(file: File): boolean {
  return file.size > TARGET_MAX_SIZE;
}

/**
 * Get compression info for display
 */
export function getCompressionInfo(fileSize: number): {
  needsCompression: boolean;
  estimatedSize: string;
  warning?: string;
} {
  const needsCompression = fileSize > TARGET_MAX_SIZE;
  const estimatedSizeMB = (fileSize / (1024 * 1024)).toFixed(2);

  if (needsCompression) {
    return {
      needsCompression: true,
      estimatedSize: estimatedSizeMB,
      warning: "Image will be compressed for upload",
    };
  }

  return {
    needsCompression: false,
    estimatedSize: estimatedSizeMB,
  };
}
