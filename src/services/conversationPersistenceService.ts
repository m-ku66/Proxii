import type { LocalConversation } from "../types/electron";

/**
 * Service for managing conversation persistence through Electron IPC
 * This acts as a bridge between the React app and the file system
 */
export class ConversationPersistenceService {
  private isDirty = new Set<string>(); // Track conversations that need saving

  /**
   * Initialize the persistence service
   */
  async initialize(): Promise<void> {
    // Set up cleanup on page unload
    window.addEventListener("beforeunload", () => {
      // Save any pending dirty conversations before closing
      console.log("💾 App closing, ensuring all conversations are saved");
    });
  }

  /**
   * Load all conversations from disk
   */
  async loadAllConversations(): Promise<LocalConversation[]> {
    try {
      if (!window.electronAPI) {
        console.warn("Electron API not available, running in browser mode");
        return [];
      }

      const conversations = await window.electronAPI.conversations.loadAll();
      console.log(`Loaded ${conversations.length} conversations from disk`);
      return conversations;
    } catch (error) {
      console.error("Failed to load conversations:", error);
      return [];
    }
  }

  /**
   * Save a conversation to disk
   */
  async saveConversation(conversation: LocalConversation): Promise<void> {
    try {
      if (!window.electronAPI) {
        console.warn(
          "Electron API not available, saving to localStorage as fallback"
        );
        this.saveToLocalStorage(conversation);
        return;
      }

      await window.electronAPI.conversations.save(conversation);
      this.isDirty.delete(conversation.id);
      console.log(`Saved conversation: ${conversation.title}`);
    } catch (error) {
      console.error("Failed to save conversation:", error);
      throw error;
    }
  }

  /**
   * Delete a conversation from disk
   */
  async deleteConversation(conversation: LocalConversation): Promise<void> {
    try {
      if (!window.electronAPI) {
        console.warn(
          "Electron API not available, deleting from localStorage as fallback"
        );
        this.deleteFromLocalStorage(conversation.id);
        return;
      }

      await window.electronAPI.conversations.delete(
        conversation.id,
        conversation.projectId
      );
      this.isDirty.delete(conversation.id);
      console.log(`Deleted conversation: ${conversation.id}`);
    } catch (error) {
      console.error("Failed to delete conversation:", error);
      throw error;
    }
  }

  /**
   * Export a conversation
   */
  async exportConversation(
    conversation: LocalConversation,
    format: "json" | "markdown" | "txt"
  ): Promise<string | null> {
    try {
      if (!window.electronAPI) {
        console.warn(
          "Electron API not available, export not supported in browser mode"
        );
        return null;
      }

      const filePath = await window.electronAPI.conversations.export(
        conversation,
        format
      );
      if (filePath) {
        console.log(`Exported conversation to: ${filePath}`);
      }
      return filePath;
    } catch (error) {
      console.error("Failed to export conversation:", error);
      throw error;
    }
  }

  /**
   * Get the conversations directory path
   */
  async getConversationsPath(): Promise<string | null> {
    try {
      if (!window.electronAPI) {
        return null;
      }

      return await window.electronAPI.app.getConversationsPath();
    } catch (error) {
      console.error("Failed to get conversations path:", error);
      return null;
    }
  }

  /**
   * Open the conversations folder in the file manager
   */
  async openConversationsFolder(): Promise<void> {
    try {
      if (!window.electronAPI) {
        console.warn(
          "Electron API not available, cannot open folder in browser mode"
        );
        return;
      }

      await window.electronAPI.app.openConversationsFolder();
    } catch (error) {
      console.error("Failed to open conversations folder:", error);
    }
  }

  /**
   * Mark a conversation as dirty (needs saving)
   */
  markDirty(conversationId: string): void {
    this.isDirty.add(conversationId);
  }

  /**
   * Save all dirty conversations
   */
  async saveAllDirty(conversations: LocalConversation[]): Promise<void> {
    const dirtyConversations = conversations.filter((conv) =>
      this.isDirty.has(conv.id)
    );

    if (dirtyConversations.length === 0) return;

    console.log(
      `Auto-saving ${dirtyConversations.length} dirty conversations...`
    );

    const savePromises = dirtyConversations.map(async (conversation) => {
      try {
        await this.saveConversation(conversation);
      } catch (error) {
        console.error(
          `Failed to auto-save conversation ${conversation.id}:`,
          error
        );
      }
    });

    await Promise.allSettled(savePromises);
  }

  /**
   * Save a conversation immediately (event-based)
   */
  async saveConversationImmediately(
    conversation: LocalConversation
  ): Promise<void> {
    try {
      if (!window.electronAPI) {
        console.warn(
          "Electron API not available, saving to localStorage as fallback"
        );
        this.saveToLocalStorage(conversation);
        return;
      }

      await window.electronAPI.conversations.save(conversation);
      this.isDirty.delete(conversation.id);
      console.log(`💾 Saved conversation immediately: ${conversation.title}`);
    } catch (error) {
      console.error("Failed to save conversation immediately:", error);
      throw error;
    }
  }

  /**
   * Fallback: Save to localStorage when Electron API is not available
   */
  private saveToLocalStorage(conversation: LocalConversation): void {
    try {
      const key = `proxii-conversation-${conversation.id}`;
      localStorage.setItem(key, JSON.stringify(conversation));
    } catch (error) {
      console.error("Failed to save to localStorage:", error);
    }
  }

  /**
   * Fallback: Delete from localStorage
   */
  private deleteFromLocalStorage(conversationId: string): void {
    try {
      const key = `proxii-conversation-${conversationId}`;
      localStorage.removeItem(key);
    } catch (error) {
      console.error("Failed to delete from localStorage:", error);
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.isDirty.clear();
  }
}

// Create singleton instance
export const conversationPersistence = new ConversationPersistenceService();
