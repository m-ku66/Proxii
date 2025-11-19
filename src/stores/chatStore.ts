import { create } from "zustand";
import { calculateMessageMetrics } from "@/utils/tokenUtils";
import { sendChatCompletionStream } from "@/services/apiService";
import { useModelStore } from "@/stores/modelStore";
import { useSettingsStore } from "@/stores/settingsStore";

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

// Types
export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
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
    content: string,
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
    }
  ) => Promise<void>;
  toggleStar: (conversationId: string) => void;
  deleteConversation: (conversationId: string) => void;
  clearError: () => void;
}

// Helper function to create a message with calculated tokens/cost
function createMessage(
  content: string,
  role: "user" | "assistant",
  model?: string,
  tokens?: number,
  cost?: number,
  isStreaming?: boolean
): Message {
  // If tokens/cost are provided (from API), use those
  // Otherwise calculate estimates
  const metrics =
    tokens !== undefined && cost !== undefined
      ? { tokens, cost }
      : calculateMessageMetrics(content, role, model);

  return {
    id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    role,
    content,
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
      const { tokens, cost } = calculateMessageMetrics(
        msg.content,
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
                  ? { ...msg, content: msg.content + contentChunk }
                  : msg
              ),
              updatedAt: new Date(),
            }
          : conv
      ),
    }));
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
  },

  /**
   * Send a message to OpenRouter with streaming support
   */
  sendMessage: async (
    conversationId,
    content,
    model,
    thinkingEnabled = false,
    options = {}
  ) => {
    const { temperature = 0.7, max_tokens = 4000 } = options;

    // Set loading state
    set({ isLoading: true, error: null });

    // Create a unique ID for the assistant message
    const assistantMessageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Get the conversation
      const conversation = get().conversations.find(
        (conv) => conv.id === conversationId
      );

      if (!conversation) {
        throw new Error(`Conversation ${conversationId} not found`);
      }

      // Add user message first
      get().addMessage(conversationId, content, "user");

      // Get system prompt from settings
      const systemPrompt = useSettingsStore.getState().systemPrompt;

      // Prepare messages for API (convert to API format)
      const apiMessages: Array<{
        role: "system" | "user" | "assistant";
        content: string;
      }> = [
        ...conversation.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        {
          role: "user" as const,
          content,
        },
      ];

      // Prepend system prompt if it exists (only for the first message in conversation)
      if (
        systemPrompt &&
        systemPrompt.trim() &&
        conversation.messages.length === 0
      ) {
        apiMessages.unshift({
          role: "system" as const,
          content: systemPrompt,
        });
      }

      // Create an empty assistant message that we'll stream into
      const streamingMessage: Message = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        model,
        isStreaming: true,
        thinkingTokens: "",
      };

      // Add the streaming message to the conversation
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
        temperature,
        max_tokens,
      };

      // Check if model supports thinking and apply appropriate parameters
      const thinkingCapability = supportsThinking(model);

      if (thinkingEnabled && thinkingCapability) {
        switch (thinkingCapability) {
          case "reasoning_effort":
            // OpenAI o1 models
            requestParams.reasoning_effort = "high";
            break;

          case "thinking":
            // Claude models with extended thinking
            requestParams.thinking = {
              type: "enabled",
              budget_tokens: 10000, // Max thinking tokens
            };
            break;

          case "max_reasoning_tokens":
            // Gemini 2.5 models
            requestParams.thinking = {
              max_tokens_for_reasoning: 8000, // Configurable reasoning depth
            };
            break;

          case "always":
            // DeepSeek - always thinks, no parameters needed
            break;
        }
      }

      // Stream the response
      await sendChatCompletionStream(requestParams, {
        // Handle each content chunk
        onContent: (chunk) => {
          get().updateMessageContent(conversationId, assistantMessageId, chunk);
        },

        // Handle thinking tokens (for models that support it)
        onThinking: (thinking) => {
          get().updateMessageThinking(
            conversationId,
            assistantMessageId,
            thinking
          );
        },

        // Handle completion with usage stats
        onComplete: (usage) => {
          // Calculate cost using ACTUAL pricing from OpenRouter
          const modelData = useModelStore
            .getState()
            .availableModels.find((m) => m.id === model);

          let totalCost = 0;

          if (modelData?.pricing) {
            // Parse pricing strings to numbers (e.g. "0" → 0, "0.000003" → 0.000003)
            const promptPrice = parseFloat(modelData.pricing.prompt);
            const completionPrice = parseFloat(modelData.pricing.completion);

            // Calculate actual cost
            const inputCost = (usage.prompt_tokens / 1_000_000) * promptPrice;
            const outputCost =
              (usage.completion_tokens / 1_000_000) * completionPrice;
            totalCost = inputCost + outputCost;
          } else {
            // Fallback if model not found
            console.warn(
              `Model ${model} not found in availableModels, using fallback pricing`
            );
            const inputCost = (usage.prompt_tokens / 1_000_000) * 3.0;
            const outputCost = (usage.completion_tokens / 1_000_000) * 15.0;
            totalCost = inputCost + outputCost;
          }

          // Finalize the message with real token counts and cost
          get().finalizeMessage(
            conversationId,
            assistantMessageId,
            usage.completion_tokens,
            totalCost
          );

          set({ isLoading: false });
        },

        // Handle errors
        onError: (error) => {
          set({
            isLoading: false,
            error: error.message,
          });
          console.error("Streaming error:", error);
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      set({
        isLoading: false,
        error: errorMessage,
      });
      console.error("Error sending message:", error);
      throw error;
    }
  },

  toggleStar: (conversationId) => {
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.id === conversationId ? { ...conv, starred: !conv.starred } : conv
      ),
    }));
  },

  deleteConversation: (conversationId) => {
    set((state) => ({
      conversations: state.conversations.filter(
        (conv) => conv.id !== conversationId
      ),
      activeConversationId:
        state.activeConversationId === conversationId
          ? null
          : state.activeConversationId,
    }));
  },

  clearError: () => set({ error: null }),
}));
