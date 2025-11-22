// Global type declarations for the Electron API exposed via preload script

export interface LocalConversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  starred?: boolean;
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
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
