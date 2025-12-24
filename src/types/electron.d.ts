// Global type declarations for the Electron API exposed via preload script
import type { MessageFileAttachment } from "./multimodal";

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
    delete: (conversationId: string) => Promise<void>;
    export: (
      conversation: Conversation,
      format: "json" | "markdown" | "txt"
    ) => Promise<string | null>;
  };

  app: {
    getConversationsPath: () => Promise<string>;
    openConversationsFolder: () => Promise<void>;
  };

  assets: {
    save: (
      conversationId: string,
      filename: string,
      buffer: ArrayBuffer
    ) => Promise<void>;
    load: (conversationId: string, filename: string) => Promise<ArrayBuffer>;
    delete: (conversationId: string, filename: string) => Promise<void>;
    deleteAll: (conversationId: string) => Promise<void>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
