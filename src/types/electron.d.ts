// Global type declarations for the Electron API exposed via preload script
import type { MessageFileAttachment } from "./multimodal";
import type { LocalProject } from "./project";

export interface LocalConversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  starred?: boolean;
  projectId?: string | null; // Links to a project (optional for backward compatibility)
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  model?: string;
  tokens?: number;
  cost?: number;
  thinkingTokens?: string;
  isStreaming?: boolean;
  files?: MessageFileAttachment[];
}

interface ElectronAPI {
  conversations: {
    loadAll: () => Promise<Conversation[]>;
    save: (conversation: Conversation) => Promise<void>;
    delete: (conversationId: string, projectId?: string | null) => Promise<void>;
    export: (
      conversation: Conversation,
      format: "json" | "markdown" | "txt"
    ) => Promise<string | null>;
  };

  projects: {
    loadAll: () => Promise<LocalProject[]>;
    save: (project: LocalProject) => Promise<void>;
    delete: (projectId: string) => Promise<void>;
  };

  app: {
    getConversationsPath: () => Promise<string>;
    openConversationsFolder: () => Promise<void>;
    getProjectsPath: () => Promise<string>;
    openProjectsFolder: () => Promise<void>;
  };

  assets: {
    save: (
      conversationId: string,
      filename: string,
      buffer: ArrayBuffer,
      projectId?: string | null
    ) => Promise<void>;
    load: (conversationId: string, filename: string, projectId?: string | null) => Promise<ArrayBuffer>;
    delete: (conversationId: string, filename: string, projectId?: string | null) => Promise<void>;
    deleteAll: (conversationId: string, projectId?: string | null) => Promise<void>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
