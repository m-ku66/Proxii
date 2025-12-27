/**
 * OpenRouter API Service
 * Handles chat completion requests to OpenRouter API
 * Now with streaming support!
 */

import { useSettingsStore } from "@/stores/settingsStore";
import { sanitizeMessageContent } from "@/utils/messageUtils";
import type { MessageContent } from "@/types/multimodal";
import type { ToolCall, ToolCallDelta } from "@/types/tools";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: MessageContent;
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
      tool_calls?: ToolCallDelta[]; // Tool call deltas during streaming
      reasoning_details?: any[]; // 🆕 OpenRouter's normalized reasoning format (for Gemini thought_signature)
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
  onToolCalls?: (
    toolCalls: ToolCall[],
    finishReason: string,
    reasoningDetails?: any[] // 🆕 Pass reasoning_details to callback
  ) => void;
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
  callbacks: StreamCallbacks,
  signal?: AbortSignal // Abort signal parameter
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
          stream: true,
          route: "fallback",
        }),
        signal, // Pass the abort signal to fetch
      }
    );

    if (!response.ok) {
      const errorData: ChatCompletionError = await response.json();

      console.error("❌ OpenRouter API Error:", {
        status: response.status,
        statusText: response.statusText,
        errorMessage: errorData.error?.message, // ✨ Explicit error message
        errorType: errorData.error?.type, // ✨ Error type
        errorCode: errorData.error?.code, // ✨ Error code
        fullErrorData: errorData, // Full error object
        requestPayloadSize: JSON.stringify(request).length,
      });

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

    // 🔧 Accumulate tool calls as they stream in
    // OpenRouter sends tool calls incrementally with an 'index' field
    // We build up partial tool calls and convert to complete ToolCall[] at the end
    let accumulatedToolCalls: Map<number, Partial<ToolCall>> = new Map();

    // 🆕 Accumulate reasoning_details (for Gemini thought_signature support)
    let accumulatedReasoningDetails: any[] = [];

    // 🛡️ Guard to prevent duplicate onToolCalls firing
    let toolCallsHandled = false;

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
          const data = trimmed.slice(6);

          // Check for stream end
          if (data === "[DONE]") {
            continue;
          }

          try {
            const chunk: StreamChunk = JSON.parse(data);

            // Extract content and thinking from delta
            const delta = chunk.choices[0]?.delta;
            const finishReason = chunk.choices[0]?.finish_reason;

            // 🆕 Capture reasoning_details for Gemini thought_signature support
            if (
              delta?.reasoning_details &&
              Array.isArray(delta.reasoning_details)
            ) {
              accumulatedReasoningDetails.push(...delta.reasoning_details);
              console.log(
                "🧠 Reasoning details received:",
                delta.reasoning_details
              );
            }

            // 🔧 Handle tool calls
            if (delta?.tool_calls) {
              // 🛡️ DEFENSIVE CHECK: Validate tool_calls is an array
              if (Array.isArray(delta.tool_calls)) {
                // OpenRouter streams tool calls incrementally using 'index'
                // We need to merge each delta into our accumulated map
                for (const toolCallDelta of delta.tool_calls as ToolCallDelta[]) {
                  const index = toolCallDelta.index ?? 0;
                  const existing = accumulatedToolCalls.get(index) || {
                    id: "",
                    type: "function" as const,
                    function: { name: "", arguments: "" },
                  };

                  // Merge the delta into the existing tool call
                  if (toolCallDelta.id) existing.id = toolCallDelta.id;
                  if (toolCallDelta.type) existing.type = toolCallDelta.type;
                  if (toolCallDelta.function) {
                    if (toolCallDelta.function.name) {
                      existing.function != undefined
                        ? (existing.function.name = toolCallDelta.function.name)
                        : "undefined";
                    }
                    if (toolCallDelta.function.arguments) {
                      existing.function != undefined
                        ? (existing.function.arguments +=
                            toolCallDelta.function.arguments)
                        : "undefined";
                    }
                  }

                  accumulatedToolCalls.set(index, existing);
                }
                console.log("🔧 Tool call delta received:", delta.tool_calls);
              } else {
                console.error(
                  "❌ Invalid tool_calls format (not an array):",
                  delta.tool_calls
                );
              }
            }

            // 🔧 If finish_reason is "tool_calls", the model wants to use tools
            if (
              finishReason === "tool_calls" &&
              accumulatedToolCalls.size > 0 &&
              !toolCallsHandled // 🛡️ Only fire once per stream
            ) {
              toolCallsHandled = true; // 🛡️ Set flag to prevent duplicates

              // Convert Map to array of tool calls (should be complete by now)
              const toolCallsArray = Array.from(
                accumulatedToolCalls.values()
              ) as ToolCall[];

              console.log(
                `🔧 Model requested ${toolCallsArray.length} tool(s):`,
                toolCallsArray
                  .map((tc) => tc.function?.name || "[null]")
                  .join(", ")
              );
              console.log(
                "🔍 Full tool call structure:",
                JSON.stringify(toolCallsArray, null, 2)
              );

              // 🛡️ Filter out any malformed tool calls before passing to executor
              const validToolCalls = toolCallsArray.filter((tc) => {
                const isValid = tc.id && tc.function && tc.function.name;
                if (!isValid) {
                  console.warn("⚠️ Skipping malformed tool call:", tc);
                  console.warn("⚠️ Missing: ", {
                    id: !tc.id,
                    function: !tc.function,
                    name: !tc.function?.name,
                  });
                }
                return isValid;
              });

              if (validToolCalls.length > 0) {
                callbacks.onToolCalls?.(
                  validToolCalls,
                  finishReason,
                  accumulatedReasoningDetails.length > 0
                    ? accumulatedReasoningDetails
                    : undefined // 🆕 Pass reasoning_details for Gemini
                );
              } else {
                console.error(
                  "❌ All tool calls were malformed! Original:",
                  toolCallsArray
                );
              }
            }

            // Handle different thinking formats based on model type:

            // FORMAT 1: OpenAI o1 / Gemini - thinking in delta.reasoning
            if (delta?.reasoning) {
              callbacks.onThinking?.(delta.reasoning);
            }

            // FORMAT 2: Claude - thinking/content as array of blocks
            if (delta?.content) {
              // If content is an array of content blocks (Claude multimodal format)
              if (Array.isArray(delta.content)) {
                for (const block of delta.content) {
                  // Thinking block - route to onThinking
                  if (block.type === "thinking" && block.thinking) {
                    callbacks.onThinking?.(block.thinking);
                  }
                  // Text block - route to onContent
                  else if (block.type === "text" && block.text) {
                    callbacks.onContent?.(block.text);
                  }
                }
              }
              // If content is a string (legacy/simple format - backwards compatibility)
              else if (typeof delta.content === "string") {
                callbacks.onContent?.(delta.content);
              }
            }

            // Check for usage data (sent in final chunk)
            if (chunk.usage) {
              callbacks.onComplete?.(chunk.usage);
            }
          } catch (parseError) {
            console.error("Failed to parse SSE chunk:", data, parseError);
          }
        }
      }
    }
  } catch (error) {
    // Handle abort gracefully
    if (error instanceof Error && error.name === "AbortError") {
      console.log("🛑 Stream aborted by user");
      // Don't call onError for user-initiated stops
      return;
    }

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
