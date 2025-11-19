/**
 * OpenRouter API Service
 * Handles chat completion requests to OpenRouter API
 * Now with streaming support!
 */

import { useSettingsStore } from "@/stores/settingsStore";
import { sanitizeMessageContent } from "@/utils/messageUtils";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

export interface ChatCompletionResponse {
  id: string;
  model: string;
  choices: Array<{
    message: {
      role: "assistant";
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ChatCompletionError {
  error: {
    message: string;
    type: string;
    code?: string;
  };
}

// Streaming types
export interface StreamChunk {
  id: string;
  model: string;
  choices: Array<{
    delta: {
      content?: string;
      reasoning?: string; // Some models (like o1) send thinking here
    };
    finish_reason?: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface StreamCallbacks {
  onContent?: (content: string) => void;
  onThinking?: (thinking: string) => void;
  onComplete?: (usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  }) => void;
  onError?: (error: Error) => void;
}

/**
 * Send a chat completion request to OpenRouter (non-streaming)
 */
export async function sendChatCompletion(
  request: ChatCompletionRequest
): Promise<ChatCompletionResponse> {
  const apiKey = useSettingsStore.getState().openRouterApiKey;

  if (!apiKey) {
    throw new Error(
      "No API key found. Please set your OpenRouter API key in settings."
    );
  }

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://proxii.app", // Replace with your actual app URL
        "X-Title": "Proxii",
      },
      body: JSON.stringify({
        ...request,
        // Required for free models - opts into data collection
        // Users can override this in OpenRouter settings
        route: "fallback",
      }),
    }
  );

  if (!response.ok) {
    const errorData: ChatCompletionError = await response.json();
    throw new Error(
      errorData.error?.message || `API request failed: ${response.status}`
    );
  }

  const data: ChatCompletionResponse = await response.json();

  // Clean special tokens from the response content
  if (data.choices && data.choices.length > 0) {
    data.choices[0].message.content = sanitizeMessageContent(
      data.choices[0].message.content
    );
  }

  return data;
}

/**
 * Send a chat completion request with streaming
 * Streams the response in real-time via callbacks
 */
export async function sendChatCompletionStream(
  request: ChatCompletionRequest,
  callbacks: StreamCallbacks
): Promise<void> {
  const apiKey = useSettingsStore.getState().openRouterApiKey;

  if (!apiKey) {
    const error = new Error(
      "No API key found. Please set your OpenRouter API key in settings."
    );
    callbacks.onError?.(error);
    throw error;
  }

  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://proxii.app",
          "X-Title": "Proxii",
        },
        body: JSON.stringify({
          ...request,
          stream: true, // Enable streaming!
          route: "fallback",
        }),
      }
    );

    if (!response.ok) {
      const errorData: ChatCompletionError = await response.json();
      const error = new Error(
        errorData.error?.message || `API request failed: ${response.status}`
      );
      callbacks.onError?.(error);
      throw error;
    }

    // Get the response body as a readable stream
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Response body is not readable");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    // Read the stream
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      // Decode the chunk and add to buffer
      buffer += decoder.decode(value, { stream: true });

      // Split by newlines to process complete SSE messages
      const lines = buffer.split("\n");

      // Keep the last incomplete line in the buffer
      buffer = lines.pop() || "";

      // Process each complete line
      for (const line of lines) {
        const trimmed = line.trim();

        // Skip empty lines and comments
        if (!trimmed || trimmed.startsWith(":")) continue;

        // SSE format: "data: {json}"
        if (trimmed.startsWith("data: ")) {
          const data = trimmed.slice(6); // Remove "data: " prefix

          // Check for stream end
          if (data === "[DONE]") {
            continue;
          }

          try {
            const chunk: StreamChunk = JSON.parse(data);

            // Extract content and thinking from delta
            const delta = chunk.choices[0]?.delta;

            if (delta?.content) {
              // Send content chunks as-is, don't sanitize individual chunks!
              callbacks.onContent?.(delta.content);
            }

            if (delta?.reasoning) {
              // Some models send thinking/reasoning separately
              callbacks.onThinking?.(delta.reasoning);
            }

            // Check for usage data (sent in final chunk)
            if (chunk.usage) {
              callbacks.onComplete?.(chunk.usage);
            }
          } catch (parseError) {
            console.error("Failed to parse SSE chunk:", data, parseError);
            // Continue processing other chunks even if one fails
          }
        }
      }
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error("Unknown error");
    callbacks.onError?.(err);
    throw err;
  }
}

/**
 * Calculate cost from usage data
 * Pricing should be fetched from modelPricing utility
 */
export function calculateCostFromUsage(
  model: string,
  promptTokens: number,
  completionTokens: number,
  pricingData: Record<string, { input: number; output: number }>
): number {
  const pricing = pricingData[model];

  if (!pricing) {
    console.warn(`No pricing data for model: ${model}`);
    return 0;
  }

  const inputCost = (promptTokens / 1_000_000) * pricing.input;
  const outputCost = (completionTokens / 1_000_000) * pricing.output;

  return inputCost + outputCost;
}
