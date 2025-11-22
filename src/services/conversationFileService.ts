import fs from "fs/promises";
import path from "path";
import { app } from "electron";
import type { Conversation, Message } from "../preload";

export class ConversationFileService {
  private conversationsPath: string;

  constructor() {
    // Use the user's Documents folder for conversations
    // ~/Documents/Proxii/conversations/
    this.conversationsPath = path.join(
      app.getPath("documents"),
      "Proxii",
      "conversations"
    );
  }

  /**
   * Get the path where conversations are stored
   */
  getConversationsPath(): string {
    return this.conversationsPath;
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
   */
  async loadAllConversations(): Promise<Conversation[]> {
    try {
      await this.ensureConversationsDirectory();

      const files = await fs.readdir(this.conversationsPath);
      const jsonFiles = files.filter((file) => path.extname(file) === ".json");

      const conversations: Conversation[] = [];

      for (const file of jsonFiles) {
        try {
          const filePath = path.join(this.conversationsPath, file);
          const content = await fs.readFile(filePath, "utf-8");
          const conversation = JSON.parse(content);

          // Convert date strings back to Date objects
          conversation.createdAt = new Date(conversation.createdAt);
          conversation.updatedAt = new Date(conversation.updatedAt);
          conversation.messages = conversation.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }));

          conversations.push(conversation);
        } catch (fileError) {
          console.error(`Failed to load conversation from ${file}:`, fileError);
          // Skip corrupted files but continue loading others
        }
      }

      // Sort by updatedAt (most recent first)
      conversations.sort(
        (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
      );

      console.log(`Loaded ${conversations.length} conversations`);
      return conversations;
    } catch (error) {
      console.error("Failed to load conversations:", error);
      return [];
    }
  }

  /**
   * Save a conversation to disk
   */
  async saveConversation(conversation: Conversation): Promise<void> {
    try {
      await this.ensureConversationsDirectory();

      const filePath = path.join(
        this.conversationsPath,
        `${conversation.id}.json`
      );
      const content = JSON.stringify(conversation, null, 2);

      await fs.writeFile(filePath, content, "utf-8");
      console.log(`Saved conversation: ${conversation.id}`);
    } catch (error) {
      console.error(`Failed to save conversation ${conversation.id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a conversation file
   */
  async deleteConversation(conversationId: string): Promise<void> {
    try {
      const filePath = path.join(
        this.conversationsPath,
        `${conversationId}.json`
      );
      await fs.unlink(filePath);
      console.log(`Deleted conversation: ${conversationId}`);
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
}
