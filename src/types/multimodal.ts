/**
 * Multimodal Content Types
 *
 * Type definitions for supporting rich content (images, files, audio, video)
 * in messages following the OpenRouter multimodal format.
 *
 * @see https://openrouter.ai/docs/guides/overview/multimodal/overview
 */

/**
 * Text content block
 */
export interface TextContent {
  type: "text";
  text: string;
}

/**
 * Image content block (supports URLs and base64 data URIs)
 * @see https://openrouter.ai/docs/guides/overview/multimodal/images
 */
export interface ImageContent {
  type: "image_url";
  image_url: {
    url: string; // Can be a URL or data:image/jpeg;base64,... format
    detail?: "low" | "high" | "auto"; // Optional: controls image resolution/cost
  };
}

/**
 * PDF/Document file content block
 * Works with any model - OpenRouter handles parsing automatically
 * @see https://openrouter.ai/docs/guides/overview/multimodal/pdfs
 */
export interface FileContent {
  type: "file";
  file: {
    filename: string; // e.g., "document.pdf"
    file_data: string; // URL or data:application/pdf;base64,... format
  };
}

/**
 * Audio content block (base64 only - URLs not supported)
 * @see https://openrouter.ai/docs/guides/overview/multimodal/audio
 */
export interface AudioContent {
  type: "input_audio";
  input_audio: {
    data: string; // Base64 encoded audio (without data URI prefix)
    format:
      | "wav"
      | "mp3"
      | "aiff"
      | "aac"
      | "ogg"
      | "flac"
      | "m4a"
      | "pcm16"
      | "pcm24";
  };
}

/**
 * Video content block (supports URLs and base64)
 * Note: URL support is provider-specific (e.g., Gemini AI Studio only accepts YouTube links)
 * @see https://openrouter.ai/docs/guides/overview/multimodal/videos
 */
export interface VideoContent {
  type: "video_url";
  video_url: {
    url: string; // Can be YouTube URL, regular URL, or data:video/mp4;base64,... format
  };
}

/**
 * Union of all supported content types
 */
export type MultimodalContent =
  | TextContent
  | ImageContent
  | FileContent
  | AudioContent
  | VideoContent;

/**
 * Message content can be either:
 * - A simple string (backwards compatible)
 * - An array of multimodal content blocks (rich content)
 */
export type MessageContent = string | MultimodalContent[];

/**
 * File metadata for tracking attached files before encoding
 * Used for managing files in the UI before they're encoded into messages
 */
export interface AttachedFile {
  file: File; // The actual File object
  id: string; // Unique identifier for the attachment
  preview?: string; // Optional preview URL for images (blob URL)
}

/**
 * File attachment metadata for messages
 * Stores display information without the actual File object
 */
export interface MessageFileAttachment {
  name: string;
  type: string; // MIME type
  size: number;
  url: string; // Asset path (persisted to disk)
  blobUrl?: string; // Blob URL (in-memory only, for display)
}

/**
 * File type categories for validation and UI
 */
export type FileCategory = "image" | "document" | "audio" | "video" | "unknown";

/**
 * Supported MIME types by category
 * Based on OpenRouter documentation
 */
export const SUPPORTED_MIME_TYPES = {
  image: [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
  ] as const,
  document: ["application/pdf"] as const,
  audio: [
    "audio/wav",
    "audio/mp3",
    "audio/mpeg",
    "audio/aiff",
    "audio/aac",
    "audio/ogg",
    "audio/flac",
    "audio/m4a",
  ] as const,
  video: ["video/mp4", "video/mpeg", "video/mov", "video/webm"] as const,
} as const;

/**
 * File size limits (in bytes)
 * Based on common practices and OpenRouter recommendations
 */
export const FILE_SIZE_LIMITS = {
  image: 10 * 1024 * 1024, // 10MB
  document: 20 * 1024 * 1024, // 20MB (PDFs)
  audio: 25 * 1024 * 1024, // 25MB
  video: 50 * 1024 * 1024, // 50MB
  default: 10 * 1024 * 1024, // 10MB fallback
} as const;

/**
 * Maximum number of files per message
 */
export const MAX_FILES_PER_MESSAGE = 5;

/**
 * Audio format type
 */
export type AudioFormat = AudioContent["input_audio"]["format"];

/**
 * Get MIME type from audio format
 */
export function getAudioMimeType(format: AudioFormat): string {
  const mimeMap: Record<AudioFormat, string> = {
    wav: "audio/wav",
    mp3: "audio/mp3",
    aiff: "audio/aiff",
    aac: "audio/aac",
    ogg: "audio/ogg",
    flac: "audio/flac",
    m4a: "audio/m4a",
    pcm16: "audio/pcm",
    pcm24: "audio/pcm",
  };
  return mimeMap[format] || "audio/wav";
}
