import fs from "fs/promises";
import path from "path";
import { app } from "electron";
import type { Conversation } from "../preload";

export class ConversationFileService {
  private conversationsPath: string;
  private projectsPath: string;

  constructor() {
    // Use the user's Documents folder for conversations
    // ~/Documents/Proxii/conversations/
    this.conversationsPath = path.join(
      app.getPath("documents"),
      "Proxii",
      "conversations"
    );

    // Projects path for project-scoped conversations
    // ~/Documents/Proxii/projects/
    this.projectsPath = path.join(
      app.getPath("documents"),
      "Proxii",
      "projects"
    );
  }

  /**
   * Get the path where conversations are stored
   */
  getConversationsPath(): string {
    return this.conversationsPath;
  }

  /**
   * Get the conversation directory path based on projectId
   * - If projectId is null: /conversations/[conversationId]/
   * - If projectId exists: /projects/[projectId]/conversations/[conversationId]/
   */
  private getConversationDir(
    conversationId: string,
    projectId?: string | null
  ): string {
    if (projectId) {
      // Project-scoped conversation
      return path.join(
        this.projectsPath,
        projectId,
        "conversations",
        conversationId
      );
    } else {
      // Global conversation
      return path.join(this.conversationsPath, conversationId);
    }
  }

  /**
   * Get the base conversations directory for a project (or global)
   * - If projectId is null: /conversations/
   * - If projectId exists: /projects/[projectId]/conversations/
   */
  private getConversationsBaseDir(projectId?: string | null): string {
    if (projectId) {
      return path.join(this.projectsPath, projectId, "conversations");
    } else {
      return this.conversationsPath;
    }
  }

  /**
   * Ensure the conversations directory exists
   */
  async ensureConversationsDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.conversationsPath, { recursive: true });
      console.log(
        `Conversations directory ensured at: ${this.conversationsPath}`
      );
    } catch (error) {
      console.error("Failed to create conversations directory:", error);
      throw error;
    }
  }

  /**
   * Load all conversations from the conversations directory
   * This includes:
   * - Global conversations from /conversations/
   * - Project-scoped conversations from /projects/projectId/conversations/
   */
  async loadAllConversations(): Promise<Conversation[]> {
    try {
      const allConversations: Conversation[] = [];

      // Load global conversations
      const globalConversations = await this.loadConversationsFromDir(
        this.conversationsPath,
        null
      );
      allConversations.push(...globalConversations);

      // Load project-scoped conversations
      try {
        const projectDirs = await fs.readdir(this.projectsPath, {
          withFileTypes: true,
        });
        const projectFolders = projectDirs.filter((entry) =>
          entry.isDirectory()
        );

        for (const projectFolder of projectFolders) {
          const projectId = projectFolder.name;
          const projectConversationsPath = path.join(
            this.projectsPath,
            projectId,
            "conversations"
          );

          // Check if conversations directory exists for this project
          try {
            await fs.access(projectConversationsPath);
            const projectConversations = await this.loadConversationsFromDir(
              projectConversationsPath,
              projectId
            );
            allConversations.push(...projectConversations);
          } catch {
            // No conversations directory for this project, skip
            continue;
          }
        }
      } catch (error) {
        // Projects directory doesn't exist yet, that's fine
        console.log(
          "No projects directory found, skipping project conversations"
        );
      }

      // Sort by updatedAt (most recent first)
      allConversations.sort(
        (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
      );

      console.log(
        `💬 Loaded ${allConversations.length} conversations (global + project-scoped)`
      );
      return allConversations;
    } catch (error) {
      console.error("Failed to load conversations:", error);
      return [];
    }
  }

  /**
   * Helper: Load conversations from a specific directory
   */
  private async loadConversationsFromDir(
    dirPath: string,
    projectId: string | null
  ): Promise<Conversation[]> {
    try {
      await fs.mkdir(dirPath, { recursive: true });

      const entries = await fs.readdir(dirPath, {
        withFileTypes: true,
      });
      const conversationDirs = entries.filter((entry) => entry.isDirectory());

      const conversations: Conversation[] = [];

      for (const dir of conversationDirs) {
        try {
          const conversationPath = path.join(
            dirPath,
            dir.name,
            "conversation.json"
          );
          const content = await fs.readFile(conversationPath, "utf-8");
          const conversation = JSON.parse(content);

          // Convert date strings back to Date objects
          conversation.createdAt = new Date(conversation.createdAt);
          conversation.updatedAt = new Date(conversation.updatedAt);
          conversation.messages = conversation.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }));

          // Ensure projectId is set correctly
          conversation.projectId = projectId;

          conversations.push(conversation);
        } catch (fileError) {
          console.error(
            `Failed to load conversation from ${dir.name}:`,
            fileError
          );
          // Skip corrupted folders but continue loading others
        }
      }

      return conversations;
    } catch (error) {
      console.error(`Failed to load conversations from ${dirPath}:`, error);
      return [];
    }
  }

  /**
   * Save a conversation to disk
   * Routes to correct location based on projectId:
   * - Global (projectId: null) → /conversations/
   * - Project-scoped → /projects/[projectId]/conversations/
   */
  async saveConversation(conversation: Conversation): Promise<void> {
    try {
      // Get the correct directory based on projectId
      const conversationDir = this.getConversationDir(
        conversation.id,
        conversation.projectId
      );

      // Ensure parent directory exists
      await fs.mkdir(conversationDir, { recursive: true });

      // Save JSON inside the folder
      const filePath = path.join(conversationDir, "conversation.json");
      const content = JSON.stringify(conversation, null, 2);

      await fs.writeFile(filePath, content, "utf-8");
      console.log(
        `💾 Saved conversation: ${conversation.id} ${conversation.projectId ? `(project: ${conversation.projectId})` : "(global)"}`
      );
    } catch (error) {
      console.error(`Failed to save conversation ${conversation.id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a conversation file
   * Now accepts optional projectId to know exactly where to delete from
   */
  async deleteConversation(
    conversationId: string,
    projectId?: string | null
  ): Promise<void> {
    try {
      // If projectId is provided, we know exactly where to delete from
      if (projectId) {
        const conversationDir = path.join(
          this.projectsPath,
          projectId,
          "conversations",
          conversationId
        );
        await fs.rm(conversationDir, { recursive: true, force: true });
        console.log(
          `🗑️ Deleted project conversation: ${conversationId} (project: ${projectId})`
        );

        // Clean up empty parent "conversations" folder if it's now empty
        const conversationsDir = path.join(
          this.projectsPath,
          projectId,
          "conversations"
        );
        try {
          const remainingConversations = await fs.readdir(conversationsDir);
          if (remainingConversations.length === 0) {
            await fs.rmdir(conversationsDir);
            console.log(
              `🧺 Cleaned up empty conversations folder for project ${projectId}`
            );
          }
        } catch (error) {
          // Ignore errors when cleaning up parent folder
        }
        return;
      }

      // No projectId - delete from global conversations
      const globalConversationDir = path.join(
        this.conversationsPath,
        conversationId
      );
      await fs.rm(globalConversationDir, { recursive: true, force: true });
      console.log(`🗑️ Deleted global conversation: ${conversationId}`);
    } catch (error) {
      console.error(`Failed to delete conversation ${conversationId}:`, error);
      throw error;
    }
  }

  /**
   * Export a conversation in the specified format
   */
  async exportConversation(
    conversation: Conversation,
    exportPath: string,
    format: "json" | "markdown" | "txt"
  ): Promise<void> {
    try {
      let content: string;

      switch (format) {
        case "json":
          content = JSON.stringify(conversation, null, 2);
          break;

        case "markdown":
          content = this.conversationToMarkdown(conversation);
          break;

        case "txt":
          content = this.conversationToText(conversation);
          break;

        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      await fs.writeFile(exportPath, content, "utf-8");
      console.log(`Exported conversation to: ${exportPath}`);
    } catch (error) {
      console.error(`Failed to export conversation:`, error);
      throw error;
    }
  }

  /**
   * Convert conversation to Markdown format
   */
  private conversationToMarkdown(conversation: Conversation): string {
    let markdown = `# ${conversation.title}\n\n`;
    markdown += `**Created:** ${conversation.createdAt.toLocaleDateString()}\n`;
    markdown += `**Updated:** ${conversation.updatedAt.toLocaleDateString()}\n\n`;

    for (const message of conversation.messages) {
      const sender = message.role === "user" ? "You" : "Assistant";
      const timestamp = message.timestamp.toLocaleString();

      markdown += `## ${sender}\n`;
      markdown += `*${timestamp}*\n\n`;

      if (message.model) {
        markdown += `*Model: ${message.model}*\n\n`;
      }

      // Add thinking tokens if present
      if (message.thinkingTokens && message.thinkingTokens.trim()) {
        markdown += `### Thinking\n\n`;
        markdown += `\`\`\`\n${message.thinkingTokens}\n\`\`\`\n\n`;
      }

      markdown += `${message.content}\n\n`;

      if (message.tokens || message.cost) {
        markdown += `*Tokens: ${message.tokens || "N/A"}, Cost: $${message.cost?.toFixed(6) || "N/A"}*\n\n`;
      }

      markdown += "---\n\n";
    }

    return markdown;
  }

  /**
   * Convert conversation to plain text format
   */
  private conversationToText(conversation: Conversation): string {
    let text = `${conversation.title}\n`;
    text += `${"=".repeat(conversation.title.length)}\n\n`;
    text += `Created: ${conversation.createdAt.toLocaleDateString()}\n`;
    text += `Updated: ${conversation.updatedAt.toLocaleDateString()}\n\n`;

    for (const message of conversation.messages) {
      const sender = message.role === "user" ? "YOU" : "ASSISTANT";
      const timestamp = message.timestamp.toLocaleString();

      text += `${sender} [${timestamp}]\n`;
      if (message.model) {
        text += `Model: ${message.model}\n`;
      }
      text += `${"-".repeat(50)}\n`;

      // Add thinking tokens if present
      if (message.thinkingTokens && message.thinkingTokens.trim()) {
        text += `\n[THINKING]\n${message.thinkingTokens}\n[/THINKING]\n\n`;
      }

      text += `${message.content}\n\n`;

      if (message.tokens || message.cost) {
        text += `Tokens: ${message.tokens || "N/A"}, Cost: $${message.cost?.toFixed(6) || "N/A"}\n`;
      }

      text += "\n";
    }

    return text;
  }

  /**
   * Get the assets directory path for a conversation
   * Searches both global and project locations
   * Returns null if not found
   */
  private async getAssetsDir(conversationId: string): Promise<string | null> {
    // Check global first
    const globalAssetsDir = path.join(
      this.conversationsPath,
      conversationId,
      "assets"
    );
    try {
      await fs.access(globalAssetsDir);
      return globalAssetsDir;
    } catch {
      // Not in global
    }

    // Check in projects
    try {
      const projectDirs = await fs.readdir(this.projectsPath, {
        withFileTypes: true,
      });
      const projectFolders = projectDirs.filter((entry) => entry.isDirectory());

      for (const projectFolder of projectFolders) {
        const projectId = projectFolder.name;
        const projectAssetsDir = path.join(
          this.projectsPath,
          projectId,
          "conversations",
          conversationId,
          "assets"
        );

        try {
          await fs.access(projectAssetsDir);
          return projectAssetsDir;
        } catch {
          // Not in this project
        }
      }
    } catch {
      // Projects directory doesn't exist
    }

    // Not found anywhere
    return null;
  }

  /**
   * Get the assets directory path for a conversation
   * Creates in the correct location based on projectId
   * - If projectId provided: /projects/{projectId}/conversations/{conversationId}/assets/
   * - If no projectId: /conversations/{conversationId}/assets/
   */
  async getOrCreateAssetsDir(
    conversationId: string,
    projectId?: string | null
  ): Promise<string> {
    let assetsDir: string;

    if (projectId) {
      // Project-scoped assets
      assetsDir = path.join(
        this.projectsPath,
        projectId,
        "conversations",
        conversationId,
        "assets"
      );
    } else {
      // Global assets
      assetsDir = path.join(
        this.conversationsPath,
        conversationId,
        "assets"
      );
    }

    // Ensure the directory exists
    await fs.mkdir(assetsDir, { recursive: true });
    return assetsDir;
  }
}
