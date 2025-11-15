/**
 * OpenRouter API Service
 * Handles chat completion requests to OpenRouter API
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

/**
 * Send a chat completion request to OpenRouter
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
