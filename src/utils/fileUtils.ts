/**
 * File Utilities
 *
 * Helper functions for processing, validating, and encoding files
 * for multimodal content following the OpenRouter API format.
 */

import {
  MultimodalContent,
  FileCategory,
  SUPPORTED_MIME_TYPES,
  FILE_SIZE_LIMITS,
  MAX_FILES_PER_MESSAGE,
  AudioFormat,
  AttachedFile,
  // MessageFileAttachment,
} from "@/types/multimodal";

import { compressImage } from "./imageCompression";

/**
 * Validation result for file checks
 */
export interface FileValidationResult {
  valid: boolean;
  error?: string;
  category?: FileCategory;
}

/**
 * Get the file category based on MIME type
 */
export function getFileCategory(mimeType: string): FileCategory {
  if (SUPPORTED_MIME_TYPES.image.includes(mimeType as any)) {
    return "image";
  }
  if (SUPPORTED_MIME_TYPES.document.includes(mimeType as any)) {
    return "document";
  }
  if (SUPPORTED_MIME_TYPES.audio.includes(mimeType as any)) {
    return "audio";
  }
  if (SUPPORTED_MIME_TYPES.video.includes(mimeType as any)) {
    return "video";
  }
  return "unknown";
}

/**
 * Get the appropriate file size limit based on category
 */
export function getFileSizeLimit(category: FileCategory): number {
  // Handle unknown category explicitly
  if (category === "unknown") {
    return FILE_SIZE_LIMITS.default;
  }

  // TypeScript now knows category is one of: 'image' | 'document' | 'audio' | 'video'
  return FILE_SIZE_LIMITS[category];
}

/**
 * Validate a file for upload
 * Checks MIME type and file size
 */
export function validateFile(file: File): FileValidationResult {
  const category = getFileCategory(file.type);

  // Check if file type is supported
  if (category === "unknown") {
    return {
      valid: false,
      error: `Unsupported file type: ${file.type}. Supported types: images (jpg, png, gif, webp), PDFs, audio (wav, mp3, etc.), and video (mp4, mpeg, mov, webm).`,
    };
  }

  // Check file size
  const sizeLimit = getFileSizeLimit(category);
  if (file.size > sizeLimit) {
    const limitMB = Math.round(sizeLimit / (1024 * 1024));
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `File "${file.name}" is too large (${fileSizeMB}MB). Maximum size for ${category}s is ${limitMB}MB.`,
      category,
    };
  }

  return { valid: true, category };
}

/**
 * Validate multiple files for batch upload
 */
export function validateFiles(files: File[]): FileValidationResult {
  // Check file count
  if (files.length > MAX_FILES_PER_MESSAGE) {
    return {
      valid: false,
      error: `Too many files. Maximum ${MAX_FILES_PER_MESSAGE} files per message.`,
    };
  }

  // Validate each file
  for (const file of files) {
    const result = validateFile(file);
    if (!result.valid) {
      return result;
    }
  }

  return { valid: true };
}

/**
 * Encode a file to base64
 * Returns ONLY the base64 string (without data URI prefix)
 */
export async function encodeFileToBase64(file: File): Promise<string> {
  let fileToEncode = file;

  // Compress images if they're too large
  if (file.type.startsWith("image/")) {
    fileToEncode = await compressImage(file);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(fileToEncode);
    reader.onload = () => {
      const result = reader.result as string;
      // Extract ONLY the base64 part (remove "data:image/jpeg;base64," prefix)
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Convert File objects to MessageFileAttachment for storage
 * Extracts only the display metadata (no File object or base64 data)
 */
// export function createMessageFileAttachments(
//   files: File[]
// ): MessageFileAttachment[] {
//   return files.map((file) => {
//     const category = getFileCategory(file.type);
//     let url = "";

//     // For images, create a data URI for display
//     if (category === "image") {
//       try {
//         url = createImagePreview(file);
//       } catch (error) {
//         console.error("Failed to create image preview:", error);
//       }
//     }

//     return {
//       name: file.name,
//       type: file.type,
//       size: file.size,
//       url, // Data URI for images, empty for others
//     };
//   });
// }

/**
 * Generates a unique filename for an asset
 * Format: {timestamp}_{messageId}_{originalName}
 */
export function generateAssetFilename(
  originalName: string,
  messageId: string,
  index?: number // Add index for guaranteed uniqueness
): string {
  const timestamp = Date.now();
  const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, "_");

  // Include index if provided to prevent filename collisions
  if (index !== undefined) {
    return `${timestamp}_${index}_${messageId}_${sanitizedName}`;
  }

  return `${timestamp}_${messageId}_${sanitizedName}`;
}

/**
 * Builds the relative asset path for storage in message JSON
 * Returns: "assets/{filename}"
 */
export function getAssetPath(filename: string): string {
  return `assets/${filename}`;
}

/**
 * Saves a file to the conversation's asset directory
 * Returns the relative path to store in message JSON
 */
export async function saveAsset(
  conversationId: string,
  file: File,
  messageId: string,
  index?: number
): Promise<string> {
  const filename = generateAssetFilename(file.name, messageId, index); // Pass index
  const assetPath = getAssetPath(filename);

  // Convert file to buffer for IPC
  const buffer = await file.arrayBuffer();

  // IPC call to main process to save file
  await window.electronAPI.assets.save(conversationId, filename, buffer);

  return assetPath; // Return relative path like "assets/image_123.jpg"
}

/**
 * Loads an asset from disk and creates a blob URL for display
 */
export async function loadAssetAsBlob(
  conversationId: string,
  assetPath: string
): Promise<string> {
  // Extract filename from path (remove "assets/" prefix)
  const filename = assetPath.replace("assets/", "");

  // IPC call to main process to read file
  const buffer = await window.electronAPI.assets.load(conversationId, filename);

  // Create blob URL from buffer
  const blob = new Blob([buffer]);
  return URL.createObjectURL(blob);
}

/**
 * Deletes a specific asset file
 */
export async function deleteAsset(
  conversationId: string,
  assetPath: string
): Promise<void> {
  const filename = assetPath.replace("assets/", "");
  await window.electronAPI.assets.delete(conversationId, filename);
}

/**
 * Deletes all assets for a conversation
 */
export async function deleteConversationAssets(
  conversationId: string
): Promise<void> {
  await window.electronAPI.assets.deleteAll(conversationId);
}

/**
 * Get audio format from MIME type
 */
function getAudioFormatFromMimeType(mimeType: string): AudioFormat {
  const formatMap: Record<string, AudioFormat> = {
    "audio/wav": "wav",
    "audio/mp3": "mp3",
    "audio/mpeg": "mp3",
    "audio/aiff": "aiff",
    "audio/aac": "aac",
    "audio/ogg": "ogg",
    "audio/flac": "flac",
    "audio/m4a": "m4a",
  };
  return formatMap[mimeType] || "wav";
}

/**
 * Create multimodal content from a single file
 * Handles encoding and format conversion for OpenRouter API
 */
export async function createContentFromFile(
  file: File
): Promise<MultimodalContent> {
  const category = getFileCategory(file.type);
  const base64Data = await encodeFileToBase64(file);

  switch (category) {
    case "image": {
      // Images use data URI format with image_url type
      const dataUri = `data:${file.type};base64,${base64Data}`;
      return {
        type: "image_url",
        image_url: {
          url: dataUri,
        },
      };
    }

    case "document": {
      // PDFs use file type with filename and file_data
      const dataUri = `data:${file.type};base64,${base64Data}`;
      return {
        type: "file",
        file: {
          filename: file.name,
          file_data: dataUri,
        },
      };
    }

    case "audio": {
      // Audio uses raw base64 (no data URI) with format specification
      const format = getAudioFormatFromMimeType(file.type);
      return {
        type: "input_audio",
        input_audio: {
          data: base64Data, // Just the base64, no data URI prefix
          format,
        },
      };
    }

    case "video": {
      // Videos use data URI format with video_url type
      const dataUri = `data:${file.type};base64,${base64Data}`;
      return {
        type: "video_url",
        video_url: {
          url: dataUri,
        },
      };
    }

    default:
      throw new Error(`Unsupported file category: ${category}`);
  }
}

/**
 * Create complete multimodal content array from text and files
 * This is what gets sent to the API
 *
 * @param text - The user's text message
 * @param files - Array of files to attach
 * @returns Array of multimodal content blocks
 */
export async function createMultimodalContent(
  text: string,
  files: File[]
): Promise<MultimodalContent[]> {
  const content: MultimodalContent[] = [];

  // Always add text first (OpenRouter recommendation)
  if (text.trim()) {
    content.push({
      type: "text",
      text: text.trim(),
    });
  }

  // Add all files
  for (const file of files) {
    try {
      const fileContent = await createContentFromFile(file);
      content.push(fileContent);
    } catch (error) {
      console.error(`Failed to process file ${file.name}:`, error);
      throw error;
    }
  }

  return content;
}

/**
 * Create a preview URL for an image file (for UI display)
 */
export function createImagePreview(file: File): string {
  if (!file.type.startsWith("image/")) {
    throw new Error("File is not an image");
  }
  return URL.createObjectURL(file);
}

/**
 * Revoke a preview URL to free up memory
 */
export function revokeImagePreview(previewUrl: string): void {
  URL.revokeObjectURL(previewUrl);
}

/**
 * Format file size for display (e.g., "2.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Get a human-readable file type name
 */
export function getFileTypeName(file: File): string {
  const category = getFileCategory(file.type);

  switch (category) {
    case "image":
      return file.type.replace("image/", "").toUpperCase();
    case "document":
      return "PDF";
    case "audio":
      return file.type.replace("audio/", "").toUpperCase();
    case "video":
      return file.type.replace("video/", "").toUpperCase();
    default:
      return "Unknown";
  }
}

/**
 * Create AttachedFile object from File (for UI state management)
 */
export function createAttachedFile(file: File): AttachedFile {
  const attachedFile: AttachedFile = {
    file,
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  };

  // Create preview for images
  const category = getFileCategory(file.type);
  if (category === "image") {
    try {
      attachedFile.preview = createImagePreview(file);
    } catch (error) {
      console.error("Failed to create image preview:", error);
    }
  }

  return attachedFile;
}

/**
 * Clean up attached files (revoke preview URLs)
 */
export function cleanupAttachedFiles(attachedFiles: AttachedFile[]): void {
  attachedFiles.forEach((attached) => {
    if (attached.preview) {
      revokeImagePreview(attached.preview);
    }
  });
}
