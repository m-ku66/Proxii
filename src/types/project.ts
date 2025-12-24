/**
 * Project Types
 *
 * Projects are first-class entities that organize conversations
 * and provide scoped context (instructions, knowledge base)
 */

export interface KnowledgeFile {
  id: string; // Unique identifier for the file
  filename: string; // Original filename
  size: number; // File size in bytes
  mimeType: string; // MIME type (e.g., "application/pdf")
  uploadedAt: Date; // When the file was added
}

export interface Project {
  id: string; // Unique identifier
  name: string; // Display name
  description?: string; // Optional description
  instructions?: string; // Scoped system prompt (overrides global)
  knowledgeFiles: KnowledgeFile[]; // Files for context/reference
  createdAt: Date;
  updatedAt: Date;
  starred?: boolean; // Whether the project is starred/favorited
}

// For persistence (serializable version)
export interface LocalProject {
  id: string;
  name: string;
  description?: string;
  instructions?: string;
  knowledgeFiles: KnowledgeFile[];
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  starred?: boolean;
}
