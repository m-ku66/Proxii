// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from "electron";
import { MessageFileAttachment } from "./types/multimodal";
import type { LocalProject } from "./types/project";

// Define conversation type (matching your existing store)
export interface Conversation {
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

  // Project file operations
  projects: {
    loadAll: () => Promise<LocalProject[]>;
    save: (project: LocalProject) => Promise<void>;
    delete: (projectId: string) => Promise<void>;
  };

  // App lifecycle
  app: {
    getConversationsPath: () => Promise<string>;
    openConversationsFolder: () => Promise<void>;
    getProjectsPath: () => Promise<string>;
    openProjectsFolder: () => Promise<void>;
  };

  // Asset management
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

// Expose the API to the renderer process securely
contextBridge.exposeInMainWorld("electronAPI", {
  conversations: {
    loadAll: () => ipcRenderer.invoke("conversations:load-all"),
    save: (conversation: Conversation) =>
      ipcRenderer.invoke("conversations:save", conversation),
    delete: (conversationId: string, projectId?: string | null) =>
      ipcRenderer.invoke("conversations:delete", conversationId, projectId),
    export: (conversation: Conversation, format: "json" | "markdown" | "txt") =>
      ipcRenderer.invoke("conversations:export", conversation, format),
  },

  projects: {
    loadAll: () => ipcRenderer.invoke("projects:load-all"),
    save: (project: LocalProject) =>
      ipcRenderer.invoke("projects:save", project),
    delete: (projectId: string) =>
      ipcRenderer.invoke("projects:delete", projectId),
  },

  app: {
    getConversationsPath: () =>
      ipcRenderer.invoke("app:get-conversations-path"),
    openConversationsFolder: () =>
      ipcRenderer.invoke("app:open-conversations-folder"),
    getProjectsPath: () =>
      ipcRenderer.invoke("app:get-projects-path"),
    openProjectsFolder: () =>
      ipcRenderer.invoke("app:open-projects-folder"),
  },

  assets: {
    save: (conversationId: string, filename: string, buffer: ArrayBuffer, projectId?: string | null) =>
      ipcRenderer.invoke("assets:save", conversationId, filename, buffer, projectId),
    load: (conversationId: string, filename: string, projectId?: string | null) =>
      ipcRenderer.invoke("assets:load", conversationId, filename, projectId),
    delete: (conversationId: string, filename: string, projectId?: string | null) =>
      ipcRenderer.invoke("assets:delete", conversationId, filename, projectId),
    deleteAll: (conversationId: string, projectId?: string | null) =>
      ipcRenderer.invoke("assets:delete-all", conversationId, projectId),
  },
} satisfies ElectronAPI);
