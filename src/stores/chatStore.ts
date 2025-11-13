import { create } from "zustand";
import { calculateMessageMetrics } from "@/utils/tokenUtils";
import {
  sendChatCompletion,
  calculateCostFromUsage,
} from "@/services/apiService";

// Types
export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  model?: string;
  tokens?: number;
  cost?: number;
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
  sendMessage: (
    conversationId: string,
    content: string,
    model: string,
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
  cost?: number
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

  /**
   * Send a message to OpenRouter and add the response to the conversation
   */
  sendMessage: async (conversationId, content, model, options = {}) => {
    const { temperature = 0.7, max_tokens = 4000 } = options;

    // Set loading state
    set({ isLoading: true, error: null });

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

      // Prepare messages for API (convert to API format)
      const apiMessages = [
        ...conversation.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        {
          role: "user" as const,
          content,
        },
      ];

      // Call OpenRouter API
      const response = await sendChatCompletion({
        model,
        messages: apiMessages,
        temperature,
        max_tokens,
      });

      // Extract response and usage data
      const assistantMessage = response.choices[0]?.message.content;
      const usage = response.usage;

      if (!assistantMessage) {
        throw new Error("No response from API");
      }

      // Calculate cost using actual token usage from API
      // We'll need to import pricing data - for now using approximate
      const inputCost = (usage.prompt_tokens / 1_000_000) * 3.0; // Approximate
      const outputCost = (usage.completion_tokens / 1_000_000) * 15.0; // Approximate
      const totalCost = inputCost + outputCost;

      // Add assistant message with REAL token counts from API
      get().addMessage(
        conversationId,
        assistantMessage,
        "assistant",
        model,
        usage.completion_tokens, // Real tokens from API
        totalCost // Real cost based on actual usage
      );

      set({ isLoading: false });
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
