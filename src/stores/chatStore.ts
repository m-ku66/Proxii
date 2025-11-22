import { create } from "zustand";
import { calculateMessageMetrics } from "@/utils/tokenUtils";
import { sendChatCompletionStream } from "@/services/apiService";
import { useModelStore } from "@/stores/modelStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { calculateCost } from "@/utils/tokenUtils";

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

  // Message actions
  resendMessage: (conversationId: string, messageId: string) => Promise<void>;
  regenerateMessage: (
    conversationId: string,
    messageId: string
  ) => Promise<void>;
  editMessage: (
    conversationId: string,
    messageId: string,
    newContent: string
  ) => Promise<void>;
  deleteMessage: (conversationId: string, messageId: string) => void;
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

      // 🐛 DEBUG: Log thinking state
      // console.log("🧠 Thinking Debug:", {
      //   model,
      //   thinkingCapability,
      //   thinkingEnabled,
      //   willAddReasoning: thinkingEnabled && thinkingCapability,
      // });

      if (thinkingEnabled && thinkingCapability) {
        switch (thinkingCapability) {
          case "reasoning_effort":
            // OpenAI o1 models use reasoning.effort
            requestParams.reasoning = {
              effort: "high",
            };
            break;

          case "thinking":
            // Claude models use reasoning.max_tokens
            requestParams.reasoning = {
              max_tokens: 1024,
            };
            break;

          case "max_reasoning_tokens":
            // Gemini models use reasoning.max_tokens
            requestParams.reasoning = {
              max_tokens: 8000,
            };
            break;

          case "always":
            // DeepSeek - always thinks, no parameters needed
            // ⚠️ NOTE: These models think by default and cannot be toggled off!
            // The toggle only controls whether reasoning parameters are sent,
            // but DeepSeek will generate thinking tokens regardless
            break;
        }
      }

      // 🐛 DEBUG: Log final request parameters
      // console.log("📡 Final Request Params:", {
      //   model: requestParams.model,
      //   hasReasoning: !!requestParams.reasoning,
      //   reasoning: requestParams.reasoning,
      //   messageCount: requestParams.messages.length,
      // });

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

          // Calculate cost using proper pricing utilities
          const inputCost = calculateCost(usage.prompt_tokens, model, false); // false = input tokens
          const outputCost = calculateCost(
            usage.completion_tokens,
            model,
            true
          ); // true = output tokens
          totalCost = inputCost + outputCost;

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

  // Resend a user message (resubmit the exact same content)
  resendMessage: async (conversationId, messageId) => {
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

    // Now directly call sendMessage with the original content
    try {
      await get().sendMessage(conversationId, message.content, modelToUse);
    } catch (error) {
      console.error("Failed to resend message:", error);
    }
  },

  // Regenerate an AI response (rerun the conversation up to that point)
  regenerateMessage: async (conversationId, messageId) => {
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
        content: string;
      }> = messagesToKeep.map((msg) => ({
        role: msg.role,
        content: msg.content,
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
          content: systemPrompt,
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
        temperature: 0.7,
        max_tokens: 4000,
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
  editMessage: async (conversationId, messageId, newContent) => {
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
          content: string;
        }> = updatedMessages.map((msg) => ({
          role: msg.role,
          content: msg.content,
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
            content: systemPrompt,
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
          temperature: 0.7,
          max_tokens: 4000,
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
  },
}));
