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
  MessageFileAttachment,
} from "@/types/multimodal";

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
 */
export function encodeFileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result as string;
      // Extract just the base64 data (remove data URI prefix)
      const base64Data = result.split(",")[1];
      resolve(base64Data);
    };

    reader.onerror = () => {
      reject(new Error(`Failed to read file: ${file.name}`));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Convert File objects to MessageFileAttachment for storage
 * Extracts only the display metadata (no File object or base64 data)
 */
export function createMessageFileAttachments(
  files: File[]
): MessageFileAttachment[] {
  return files.map((file) => {
    const category = getFileCategory(file.type);
    let url = "";

    // For images, create a data URI for display
    if (category === "image") {
      try {
        url = createImagePreview(file);
      } catch (error) {
        console.error("Failed to create image preview:", error);
      }
    }

    return {
      name: file.name,
      type: file.type,
      size: file.size,
      url, // Data URI for images, empty for others
    };
  });
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
