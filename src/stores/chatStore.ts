import { create } from "zustand";
import { calculateMessageMetrics } from "@/utils/tokenUtils";
import { sendChatCompletionStream } from "@/services/apiService";
import { useModelStore } from "@/stores/modelStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { calculateCost } from "@/utils/tokenUtils";
import { conversationPersistence } from "../services/conversationPersistenceService";
import type { LocalConversation } from "../types/electron";
import type { MessageContent } from "@/types/multimodal";

// Thinking capability types
type ThinkingCapability =
  | "always" // Always thinks, can't be toggled (DeepSeek)
  | "reasoning_effort" // Uses reasoning_effort parameter (OpenAI o1)
  | "thinking" // Uses thinking parameter (Claude extended thinking)
  | "max_reasoning_tokens" // Uses max reasoning tokens (Gemini 2.5)
  | false; // No thinking support

// Models that support extended thinking and how to enable it
const THINKING_MODELS: Record<string, Exclude<ThinkingCapability, false>> = {
  // OpenAI o1 models - use reasoning_effort parameter
  "openai/o1": "reasoning_effort",
  "openai/o1-mini": "reasoning_effort",
  "openai/o1-preview": "reasoning_effort",

  // DeepSeek models - always think, can't be toggled
  "deepseek/deepseek-chat": "always",
  "deepseek/deepseek-chat-v3.1:free": "always",
  "deepseek/deepseek-r1": "always",
  "tngtech/deepseek-r1t2-chimera": "always",

  // Claude models with extended thinking
  "anthropic/claude-haiku-4.5": "thinking",
  "anthropic/claude-sonnet-4.5": "thinking",

  // Gemini models with reasoning tokens
  "google/gemini-2.5-flash": "max_reasoning_tokens",
  "google/gemini-2.5-pro": "max_reasoning_tokens",
};

// Helper function to check if model supports thinking
export const supportsThinking = (modelId: string): ThinkingCapability => {
  // Check exact match first
  if (THINKING_MODELS[modelId]) {
    return THINKING_MODELS[modelId];
  }

  // Check partial matches (e.g. "openai/o1-2024-12-17" matches "openai/o1")
  for (const [key, value] of Object.entries(THINKING_MODELS)) {
    if (modelId.includes(key)) {
      return value;
    }
  }

  return false;
};

// Helper function to Normalize message content to string for token calculation
// Extracts all text from multimodal content
export function extractTextFromContent(content: MessageContent): string {
  if (typeof content === "string") {
    return content;
  }

  // Extract text from multimodal content array
  return content
    .filter((block) => block.type === "text")
    .map((block) => (block as any).text)
    .join("\n");
}

// Helper function to normalize content for API submission
// Converts both string and multimodal to API format
function normalizeContentForAPI(content: MessageContent): MessageContent {
  // If it's already an array, return as-is (already in multimodal format)
  if (Array.isArray(content)) {
    return content;
  }

  // If it's a string, convert to array format for consistency
  return [{ type: "text", text: content }];
}

// Types
export interface Message {
  id: string;
  role: "user" | "assistant";
  content: MessageContent;
  timestamp: Date;
  model?: string;
  tokens?: number;
  cost?: number;
  thinkingTokens?: string; // Thinking/reasoning content (for models that support it)
  isStreaming?: boolean; // Currently streaming?
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  starred?: boolean;
}

interface ChatStore {
  conversations: Conversation[];
  activeConversationId: string | null;
  isLoading: boolean;
  error: string | null;

  setActiveConversation: (id: string) => void;
  createNewChat: (title: string, firstMessage?: Message) => void;
  addMessage: (
    conversationId: string,
    content: MessageContent,
    role: "user" | "assistant",
    model?: string,
    tokens?: number,
    cost?: number
  ) => void;
  updateMessageContent: (
    conversationId: string,
    messageId: string,
    content: string
  ) => void;
  updateMessageThinking: (
    conversationId: string,
    messageId: string,
    thinking: string
  ) => void;
  finalizeMessage: (
    conversationId: string,
    messageId: string,
    tokens: number,
    cost: number
  ) => void;
  sendMessage: (
    conversationId: string,
    content: string,
    model: string,
    thinkingEnabled?: boolean,
    options?: {
      temperature?: number;
      max_tokens?: number;
    },
    files?: File[]
  ) => Promise<void>;
  toggleStar: (conversationId: string) => void;
  deleteConversation: (conversationId: string) => Promise<void>;
  renameConversation: (conversationId: string, newTitle: string) => void;
  clearError: () => void;

  // Message actions
  resendMessage: (
    conversationId: string,
    messageId: string,
    options?: {
      temperature?: number;
      max_tokens?: number;
    }
  ) => Promise<void>;
  regenerateMessage: (
    conversationId: string,
    messageId: string,
    options?: {
      temperature?: number;
      max_tokens?: number;
    }
  ) => Promise<void>;
  editMessage: (
    conversationId: string,
    messageId: string,
    newContent: string,
    options?: {
      temperature?: number;
      max_tokens?: number;
    }
  ) => Promise<void>;
  deleteMessage: (conversationId: string, messageId: string) => void;

  // Persistence methods
  setConversationsFromDisk: (conversations: Conversation[]) => void;
  exportConversation: (
    conversation: Conversation,
    format: "json" | "markdown" | "txt"
  ) => Promise<string | null>;
  openConversationsFolder: () => Promise<void>;
  getConversationsPath: () => Promise<string | null>;
  saveAllDirtyConversations: () => Promise<void>;
}

// Helper function to create a message with calculated tokens/cost
function createMessage(
  content: MessageContent,
  role: "user" | "assistant",
  model?: string,
  tokens?: number,
  cost?: number,
  isStreaming?: boolean
): Message {
  // Extract text for token calculation
  const textContent = extractTextFromContent(content);

  // If tokens/cost are provided (from API), use those
  // Otherwise calculate estimates using text content
  const metrics =
    tokens !== undefined && cost !== undefined
      ? { tokens, cost }
      : calculateMessageMetrics(textContent, role, model);

  return {
    id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    role,
    content, // ← Store the original multimodal content
    timestamp: new Date(),
    model,
    tokens: metrics.tokens,
    cost: metrics.cost,
    isStreaming: isStreaming || false,
  };
}

// Calculate tokens for all messages in a conversation
export function calculateConversationTokens(
  conversation: Conversation
): Conversation {
  return {
    ...conversation,
    messages: conversation.messages.map((msg) => {
      if (msg.tokens) return msg;

      // Extract text for token calculation
      const textContent = extractTextFromContent(msg.content);

      const { tokens, cost } = calculateMessageMetrics(
        textContent,
        msg.role,
        msg.model
      );
      return { ...msg, tokens, cost };
    }),
  };
}

// Mock conversations (you can keep these for development)
const mockConversations: Conversation[] = [];

export const useChatStore = create<ChatStore>((set, get) => ({
  conversations: mockConversations,
  activeConversationId: null,
  isLoading: false,
  error: null,

  setActiveConversation: (id) => {
    set({ activeConversationId: id });
  },

  createNewChat: (title, firstMessage) => {
    const newConversation: Conversation = {
      id: `conv-${Date.now()}`,
      title,
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: firstMessage ? [firstMessage] : [],
    };

    set((state) => ({
      conversations: [newConversation, ...state.conversations],
      activeConversationId: newConversation.id,
    }));

    //  Only save new conversation if it has messages
    // Empty conversations will be saved when the first message is added
    if (firstMessage) {
      conversationPersistence
        .saveConversation(newConversation as LocalConversation)
        .catch((error) => {
          console.error("Failed to save new conversation:", error);
        });
    }
  },

  addMessage: (conversationId, content, role, model, tokens, cost) => {
    const newMessage = createMessage(content, role, model, tokens, cost);

    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.id === conversationId
          ? {
              ...conv,
              messages: [...conv.messages, newMessage],
              updatedAt: new Date(),
            }
          : conv
      ),
    }));

    //  Mark conversation as dirty for auto-save
    conversationPersistence.markDirty(conversationId);

    // Save immediately when user sends a message
    if (role === "user") {
      const conversation = get().conversations.find(
        (c) => c.id === conversationId
      );
      if (conversation) {
        conversationPersistence
          .saveConversationImmediately(conversation as LocalConversation)
          .catch((error) =>
            console.error("Failed to save user message:", error)
          );
      }
    }
  },

  // Update a streaming message's content (append chunks)
  updateMessageContent: (conversationId, messageId, contentChunk) => {
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.id === conversationId
          ? {
              ...conv,
              messages: conv.messages.map((msg) =>
                msg.id === messageId
                  ? {
                      ...msg,
                      // For streaming, content is always a string being built up
                      content:
                        typeof msg.content === "string"
                          ? msg.content + contentChunk
                          : msg.content, // Don't modify if it's already multimodal
                    }
                  : msg
              ),
              updatedAt: new Date(),
            }
          : conv
      ),
    }));

    // Mark conversation as dirty (streaming updates)
    conversationPersistence.markDirty(conversationId);
  },

  // Update a streaming message's thinking tokens
  updateMessageThinking: (conversationId, messageId, thinkingChunk) => {
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.id === conversationId
          ? {
              ...conv,
              messages: conv.messages.map((msg) =>
                msg.id === messageId
                  ? {
                      ...msg,
                      thinkingTokens:
                        (msg.thinkingTokens || "") + thinkingChunk,
                    }
                  : msg
              ),
              updatedAt: new Date(),
            }
          : conv
      ),
    }));

    //  Mark conversation as dirty (thinking updates)
    conversationPersistence.markDirty(conversationId);
  },

  // Finalize a streaming message with token counts and cost
  finalizeMessage: (conversationId, messageId, tokens, cost) => {
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.id === conversationId
          ? {
              ...conv,
              messages: conv.messages.map((msg) =>
                msg.id === messageId
                  ? { ...msg, tokens, cost, isStreaming: false }
                  : msg
              ),
              updatedAt: new Date(),
            }
          : conv
      ),
    }));

    // Save immediately when AI response is completed
    const conversation = get().conversations.find(
      (c) => c.id === conversationId
    );
    if (conversation) {
      conversationPersistence
        .saveConversationImmediately(conversation as LocalConversation)
        .catch((error) => console.error("Failed to save AI response:", error));
    }
  },

  sendMessage: async (
    conversationId,
    content,
    model,
    thinkingEnabled,
    options,
    files
  ) => {
    set({ isLoading: true, error: null });

    try {
      // Import the multimodal utilities at the top if not already done
      const { createMultimodalContent } = await import("@/utils/fileUtils");

      // Create multimodal content from text + files
      const messageContent: MessageContent =
        files && files.length > 0
          ? await createMultimodalContent(content, files)
          : content; // Plain text if no files

      // Create the user message with multimodal content
      const userMessage = createMessage(messageContent, "user", model);

      // Add user message to conversation
      set((state) => ({
        conversations: state.conversations.map((conv) =>
          conv.id === conversationId
            ? {
                ...conv,
                messages: [...conv.messages, userMessage],
                updatedAt: new Date(),
              }
            : conv
        ),
      }));

      // Mark as dirty immediately after user sends message
      conversationPersistence.markDirty(conversationId);

      // Get system prompt from settings
      const systemPrompt = useSettingsStore.getState().systemPrompt;

      // Get updated conversation for API
      const conversation = get().conversations.find(
        (conv) => conv.id === conversationId
      );
      if (!conversation) throw new Error("Conversation not found");

      // Prepare messages for API - normalize all content to multimodal format
      const apiMessages: Array<{
        role: "system" | "user" | "assistant";
        content: MessageContent;
      }> = conversation.messages.map((msg) => ({
        role: msg.role,
        content: normalizeContentForAPI(msg.content),
      }));

      // Prepend system prompt if it exists (only for the first user message)
      if (
        systemPrompt &&
        systemPrompt.trim() &&
        conversation.messages.length === 1 &&
        conversation.messages[0].role === "user"
      ) {
        apiMessages.unshift({
          role: "system" as const,
          content: [{ type: "text", text: systemPrompt }],
        });
      }

      // Create a unique ID for the assistant message
      const assistantMessageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create streaming message
      const streamingMessage: Message = {
        id: assistantMessageId,
        role: "assistant",
        content: "", // Start with empty string for streaming
        timestamp: new Date(),
        model,
        isStreaming: true,
        thinkingTokens: "",
      };

      // Add streaming message to conversation
      set((state) => ({
        conversations: state.conversations.map((conv) =>
          conv.id === conversationId
            ? {
                ...conv,
                messages: [...conv.messages, streamingMessage],
                updatedAt: new Date(),
              }
            : conv
        ),
      }));

      // Build request parameters
      const requestParams: any = {
        model,
        messages: apiMessages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.max_tokens ?? 4000,
      };

      // Add thinking/reasoning parameters based on model capability
      const thinkingCapability = supportsThinking(model);

      if (thinkingEnabled && thinkingCapability) {
        if (thinkingCapability === "reasoning_effort") {
          requestParams.reasoning_effort = "high";
        } else if (thinkingCapability === "thinking") {
          requestParams.thinking = {
            type: "enabled",
            budget_tokens: 10000,
          };
        } else if (thinkingCapability === "max_reasoning_tokens") {
          requestParams.max_reasoning_tokens = 8000;
        }
      }

      // Stream the response
      await sendChatCompletionStream(requestParams, {
        onContent: (chunk) => {
          get().updateMessageContent(conversationId, assistantMessageId, chunk);
        },
        onThinking: (thinking) => {
          get().updateMessageThinking(
            conversationId,
            assistantMessageId,
            thinking
          );
        },
        onComplete: (usage) => {
          const inputCost = calculateCost(usage.prompt_tokens, model, false);
          const outputCost = calculateCost(
            usage.completion_tokens,
            model,
            true
          );
          const totalCost = inputCost + outputCost;

          get().finalizeMessage(
            conversationId,
            assistantMessageId,
            usage.completion_tokens,
            totalCost
          );
          set({ isLoading: false });

          // Mark as dirty after AI response completes
          conversationPersistence.markDirty(conversationId);
        },
        onError: (error) => {
          set({ isLoading: false, error: error.message });
          console.error("Streaming error:", error);

          // Remove failed streaming message
          set((state) => ({
            conversations: state.conversations.map((conv) =>
              conv.id === conversationId
                ? {
                    ...conv,
                    messages: conv.messages.filter(
                      (msg) => msg.id !== assistantMessageId
                    ),
                    updatedAt: new Date(),
                  }
                : conv
            ),
          }));
        },
      });
    } catch (error) {
      console.error("Failed to send message:", error);
      set({
        isLoading: false,
        error:
          error instanceof Error ? error.message : "Failed to send message",
      });
    }
  },

  toggleStar: (conversationId) => {
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.id === conversationId ? { ...conv, starred: !conv.starred } : conv
      ),
    }));

    //  Mark conversation as dirty when starred/unstarred
    conversationPersistence.markDirty(conversationId);
  },

  deleteConversation: async (conversationId) => {
    try {
      //  Remove from disk first
      await conversationPersistence.deleteConversation(conversationId);

      // Then remove from state
      set((state) => ({
        conversations: state.conversations.filter(
          (conv) => conv.id !== conversationId
        ),
        activeConversationId:
          state.activeConversationId === conversationId
            ? null
            : state.activeConversationId,
      }));
    } catch (error) {
      console.error("Failed to delete conversation from disk:", error);

      // Still remove from state even if disk deletion fails
      set((state) => ({
        conversations: state.conversations.filter(
          (conv) => conv.id !== conversationId
        ),
        activeConversationId:
          state.activeConversationId === conversationId
            ? null
            : state.activeConversationId,
      }));

      // Re-throw so UI can handle the error
      throw error;
    }
  },

  // Rename a conversation
  renameConversation: (conversationId, newTitle) => {
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.id === conversationId
          ? {
              ...conv,
              title: newTitle.trim(),
              updatedAt: new Date(),
            }
          : conv
      ),
    }));

    // Mark as dirty for persistence
    conversationPersistence.markDirty(conversationId);
  },

  clearError: () => set({ error: null }),

  // Resend a user message (resubmit the exact same content)
  resendMessage: async (conversationId, messageId, options) => {
    const state = get();
    const conversation = state.conversations.find(
      (conv) => conv.id === conversationId
    );
    const message = conversation?.messages.find((msg) => msg.id === messageId);

    if (!message || message.role !== "user") {
      console.error("Cannot resend: message not found or not a user message");
      return;
    }

    if (!conversation) return;

    // Find the model used (look at next assistant message or use current selected model)
    const messageIndex = conversation.messages.findIndex(
      (msg) => msg.id === messageId
    );
    const nextAssistantMessage = conversation.messages
      .slice(messageIndex + 1)
      .find((msg) => msg.role === "assistant");

    const modelToUse =
      nextAssistantMessage?.model || useModelStore.getState().selectedModelId;

    if (!modelToUse) {
      console.error("No model available for resend");
      return;
    }

    // Remove all messages from the original message onwards (including the original)
    const messagesToKeep = conversation.messages.slice(0, messageIndex);

    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.id === conversationId
          ? { ...conv, messages: messagesToKeep, updatedAt: new Date() }
          : conv
      ),
    }));

    //  Mark as dirty after truncating conversation
    conversationPersistence.markDirty(conversationId);

    // Extract text from the message content (ignore any files for resend)
    const textContent = extractTextFromContent(message.content);

    // Now directly call sendMessage with the extracted text (no files on resend)
    try {
      await get().sendMessage(
        conversationId,
        textContent, // ✅ Pass text, not full MessageContent
        modelToUse,
        undefined,
        options
        // Note: No files parameter - resend is text only
      );
    } catch (error) {
      console.error("Failed to resend message:", error);
    }
  },

  // Regenerate an AI response (rerun the conversation up to that point)
  regenerateMessage: async (conversationId, messageId, options) => {
    const state = get();
    const conversation = state.conversations.find(
      (conv) => conv.id === conversationId
    );
    const messageIndex = conversation?.messages.findIndex(
      (msg) => msg.id === messageId
    );

    if (messageIndex === undefined || messageIndex === -1) {
      console.error("Message not found for regeneration");
      return;
    }

    if (!conversation) return;

    const targetMessage = conversation.messages[messageIndex];
    if (targetMessage.role !== "assistant") {
      console.error("Cannot regenerate: not an assistant message");
      return;
    }

    const modelToUse =
      targetMessage.model || useModelStore.getState().selectedModelId;
    if (!modelToUse) {
      console.error("No model available for regeneration");
      return;
    }

    // Remove the assistant message and everything after it
    const messagesToKeep = conversation.messages.slice(0, messageIndex);

    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.id === conversationId
          ? { ...conv, messages: messagesToKeep, updatedAt: new Date() }
          : conv
      ),
    }));

    //  Mark as dirty after truncating
    conversationPersistence.markDirty(conversationId);

    // Set loading state
    set({ isLoading: true, error: null });

    // Create a unique ID for the assistant message
    const assistantMessageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Get system prompt from settings
      const systemPrompt = useSettingsStore.getState().systemPrompt;

      // Prepare messages for API (use existing conversation up to this point)
      const apiMessages: Array<{
        role: "system" | "user" | "assistant";
        content: MessageContent;
      }> = messagesToKeep.map((msg) => ({
        role: msg.role,
        content: normalizeContentForAPI(msg.content),
      }));

      // Prepend system prompt if it exists (only for the first message in conversation)
      if (
        systemPrompt &&
        systemPrompt.trim() &&
        messagesToKeep.length === 1 && // Only one user message
        messagesToKeep[0].role === "user"
      ) {
        apiMessages.unshift({
          role: "system" as const,
          content: [{ type: "text", text: systemPrompt }], // ✅ Array format
        });
      }

      // Create an empty assistant message that we'll stream into
      const streamingMessage: Message = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        model: modelToUse,
        isStreaming: true,
        thinkingTokens: "",
      };

      // Add the streaming message to the conversation
      set((state) => ({
        conversations: state.conversations.map((conv) =>
          conv.id === conversationId
            ? {
                ...conv,
                messages: [...messagesToKeep, streamingMessage],
                updatedAt: new Date(),
              }
            : conv
        ),
      }));

      // Build request parameters (preserve thinking from original message)
      const requestParams: any = {
        model: modelToUse,
        messages: apiMessages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.max_tokens ?? 4000,
      };

      // Check if original message had thinking and preserve that setting
      const thinkingCapability = supportsThinking(modelToUse);
      const hadThinking =
        targetMessage.thinkingTokens && targetMessage.thinkingTokens.trim();

      if (hadThinking && thinkingCapability) {
        switch (thinkingCapability) {
          case "reasoning_effort":
            requestParams.reasoning = { effort: "high" };
            break;
          case "thinking":
            requestParams.reasoning = { max_tokens: 1024 };
            break;
          case "max_reasoning_tokens":
            requestParams.reasoning = { max_tokens: 8000 };
            break;
          case "always":
            // DeepSeek - always thinks
            break;
        }
      }

      // Stream the response
      await sendChatCompletionStream(requestParams, {
        onContent: (chunk) => {
          get().updateMessageContent(conversationId, assistantMessageId, chunk);
        },
        onThinking: (thinking) => {
          get().updateMessageThinking(
            conversationId,
            assistantMessageId,
            thinking
          );
        },
        onComplete: (usage) => {
          const inputCost = calculateCost(
            usage.prompt_tokens,
            modelToUse,
            false
          );
          const outputCost = calculateCost(
            usage.completion_tokens,
            modelToUse,
            true
          );
          const totalCost = inputCost + outputCost;

          get().finalizeMessage(
            conversationId,
            assistantMessageId,
            usage.completion_tokens,
            totalCost
          );
          set({ isLoading: false });
        },
        onError: (error) => {
          set({ isLoading: false, error: error.message });
          console.error("Regeneration error:", error);

          // Remove the failed streaming message
          set((state) => ({
            conversations: state.conversations.map((conv) =>
              conv.id === conversationId
                ? {
                    ...conv,
                    messages: conv.messages.filter(
                      (msg) => msg.id !== assistantMessageId
                    ),
                    updatedAt: new Date(),
                  }
                : conv
            ),
          }));
        },
      });
    } catch (error) {
      console.error("Failed to regenerate message:", error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to regenerate",
      });
    }
  },

  // Edit a message and optionally resend
  editMessage: async (conversationId, messageId, newContent, options) => {
    const state = get();
    const conversation = state.conversations.find(
      (conv) => conv.id === conversationId
    );
    const messageIndex = conversation?.messages.findIndex(
      (msg) => msg.id === messageId
    );

    if (messageIndex === undefined || messageIndex === -1) {
      console.error("Message not found for editing");
      return;
    }

    if (!conversation) return;

    const message = conversation.messages[messageIndex];

    // If it's an AI message, just update the content
    if (message.role === "assistant") {
      set((state) => ({
        conversations: state.conversations.map((conv) =>
          conv.id === conversationId
            ? {
                ...conv,
                messages: conv.messages.map((msg, idx) =>
                  idx === messageIndex
                    ? { ...msg, content: newContent, editedAt: new Date() }
                    : msg
                ),
                updatedAt: new Date(),
              }
            : conv
        ),
      }));

      //  Mark as dirty after editing assistant message
      conversationPersistence.markDirty(conversationId);
      return; // Don't resend AI messages
    }

    // For user messages: update content, remove everything after, then resend
    if (message.role === "user") {
      // Remove all messages after the edited message (but keep the edited message)
      const messagesToKeep = conversation.messages.slice(0, messageIndex + 1);

      // Update the message content in the kept messages
      const updatedMessages = messagesToKeep.map((msg, idx) =>
        idx === messageIndex
          ? { ...msg, content: newContent, editedAt: new Date() }
          : msg
      );

      set((state) => ({
        conversations: state.conversations.map((conv) =>
          conv.id === conversationId
            ? {
                ...conv,
                messages: updatedMessages,
                updatedAt: new Date(),
              }
            : conv
        ),
      }));

      //  Mark as dirty after editing user message
      conversationPersistence.markDirty(conversationId);

      // Set loading state
      set({ isLoading: true, error: null });

      // Create a unique ID for the assistant message
      const assistantMessageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      try {
        // Get system prompt from settings
        const systemPrompt = useSettingsStore.getState().systemPrompt;

        // Prepare messages for API (use the updated conversation)
        const apiMessages: Array<{
          role: "system" | "user" | "assistant";
          content: MessageContent;
        }> = updatedMessages.map((msg) => ({
          role: msg.role,
          content: normalizeContentForAPI(msg.content),
        }));

        // Prepend system prompt if it exists (only for the first message)
        if (
          systemPrompt &&
          systemPrompt.trim() &&
          updatedMessages.length === 1 &&
          updatedMessages[0].role === "user"
        ) {
          apiMessages.unshift({
            role: "system" as const,
            content: [{ type: "text", text: systemPrompt }], // ✅ Array format
          });
        }

        // Create streaming message
        const streamingMessage: Message = {
          id: assistantMessageId,
          role: "assistant",
          content: "",
          timestamp: new Date(),
          model: useModelStore.getState().selectedModelId || "",
          isStreaming: true,
          thinkingTokens: "",
        };

        // Add streaming message
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId
              ? {
                  ...conv,
                  messages: [...updatedMessages, streamingMessage],
                  updatedAt: new Date(),
                }
              : conv
          ),
        }));

        // Build request parameters
        const modelToUse = useModelStore.getState().selectedModelId;

        const requestParams: any = {
          model: modelToUse,
          messages: apiMessages,
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.max_tokens ?? 4000,
        };

        // Stream the response (no thinking for edited messages by default)
        await sendChatCompletionStream(requestParams, {
          onContent: (chunk) => {
            get().updateMessageContent(
              conversationId,
              assistantMessageId,
              chunk
            );
          },
          onThinking: (thinking) => {
            get().updateMessageThinking(
              conversationId,
              assistantMessageId,
              thinking
            );
          },
          onComplete: (usage) => {
            const inputCost = calculateCost(
              usage.prompt_tokens,
              modelToUse!, // should not be null here
              false
            );
            const outputCost = calculateCost(
              usage.completion_tokens,
              modelToUse!, // should not be null here
              true
            );
            const totalCost = inputCost + outputCost;

            get().finalizeMessage(
              conversationId,
              assistantMessageId,
              usage.completion_tokens,
              totalCost
            );
            set({ isLoading: false });
          },
          onError: (error) => {
            set({ isLoading: false, error: error.message });
            console.error("Edit resend error:", error);

            // Remove failed streaming message
            set((state) => ({
              conversations: state.conversations.map((conv) =>
                conv.id === conversationId
                  ? {
                      ...conv,
                      messages: conv.messages.filter(
                        (msg) => msg.id !== assistantMessageId
                      ),
                      updatedAt: new Date(),
                    }
                  : conv
              ),
            }));
          },
        });
      } catch (error) {
        console.error("Failed to resend edited message:", error);
        set({
          isLoading: false,
          error: error instanceof Error ? error.message : "Failed to resend",
        });
      }
    }
  },

  // Delete a message
  deleteMessage: (conversationId, messageId) => {
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.id === conversationId
          ? {
              ...conv,
              messages: conv.messages.filter((msg) => msg.id !== messageId),
              updatedAt: new Date(),
            }
          : conv
      ),
    }));

    //  Mark as dirty after deleting message
    conversationPersistence.markDirty(conversationId);
  },

  // ✨ NEW: Persistence methods
  setConversationsFromDisk: (conversations) => {
    set({ conversations });
  },

  exportConversation: async (conversation, format) => {
    try {
      return await conversationPersistence.exportConversation(
        conversation as LocalConversation,
        format
      );
    } catch (error) {
      console.error("Failed to export conversation:", error);
      throw error;
    }
  },

  openConversationsFolder: async () => {
    try {
      await conversationPersistence.openConversationsFolder();
    } catch (error) {
      console.error("Failed to open conversations folder:", error);
      throw error;
    }
  },

  getConversationsPath: async () => {
    try {
      return await conversationPersistence.getConversationsPath();
    } catch (error) {
      console.error("Failed to get conversations path:", error);
      return null;
    }
  },

  saveAllDirtyConversations: async () => {
    try {
      const { conversations } = get();
      await conversationPersistence.saveAllDirty(
        conversations as LocalConversation[]
      );
    } catch (error) {
      console.error("Failed to save dirty conversations:", error);
    }
  },
}));
