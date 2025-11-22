// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from "electron";

// Define conversation type (matching your existing store)
export interface Conversation {
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

// Define the types for our API
export interface ElectronAPI {
  // Conversation file operations
  conversations: {
    loadAll: () => Promise<Conversation[]>;
    save: (conversation: Conversation) => Promise<void>;
    delete: (conversationId: string) => Promise<void>;
    export: (
      conversation: Conversation,
      format: "json" | "markdown" | "txt"
    ) => Promise<string | null>;
  };

  // App lifecycle
  app: {
    getConversationsPath: () => Promise<string>;
    openConversationsFolder: () => Promise<void>;
  };
}

// Expose the API to the renderer process securely
contextBridge.exposeInMainWorld("electronAPI", {
  conversations: {
    loadAll: () => ipcRenderer.invoke("conversations:load-all"),
    save: (conversation: Conversation) =>
      ipcRenderer.invoke("conversations:save", conversation),
    delete: (conversationId: string) =>
      ipcRenderer.invoke("conversations:delete", conversationId),
    export: (conversation: Conversation, format: "json" | "markdown" | "txt") =>
      ipcRenderer.invoke("conversations:export", conversation, format),
  },

  app: {
    getConversationsPath: () =>
      ipcRenderer.invoke("app:get-conversations-path"),
    openConversationsFolder: () =>
      ipcRenderer.invoke("app:open-conversations-folder"),
  },
} satisfies ElectronAPI);
