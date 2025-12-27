/**
 * Tool Type Definitions
 * Based on OpenRouter's tool calling specification
 * 
 * MODEL COMPATIBILITY:
 * ✅ Claude (all versions) - Full support
 * ✅ DeepSeek (all versions) - Full support
 * ✅ Gemini (all versions) - Full support (via OpenRouter's reasoning_details normalization)
 * 
 * GEMINI THOUGHT_SIGNATURE SUPPORT:
 * Gemini requires "thought signatures" to be preserved during multi-turn tool calling.
 * OpenRouter normalizes this into a unified `reasoning_details` field that we capture
 * and pass back in continuation requests. This allows Gemini to maintain its reasoning
 * state across tool execution steps.
 * 
 * Flow:
 * 1. User: "What time is it?"
 * 2. Model responds with: { tool_calls: [...], reasoning_details: [...] }
 * 3. We capture BOTH tool_calls and reasoning_details
 * 4. We execute tools and build continuation:
 *    { 
 *      messages: [
 *        { role: "assistant", tool_calls: [...], reasoning_details: [...] },  ← Preserve!
 *        { role: "tool", content: "..." }
 *      ]
 *    }
 * 5. Model continues from saved state ✓
 */

// ============================================================================
// OpenRouter Tool Definition Types (what we send to the API)
// ============================================================================

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, ToolParameter>;
      required?: string[];
    };
  };
}

export interface ToolParameter {
  type: "string" | "number" | "boolean" | "array" | "object";
  description?: string;
  enum?: string[];
  items?: {
    type: string;
  };
  default?: any;
}

// ============================================================================
// OpenRouter Tool Call Types (what we receive from the API)
// ============================================================================

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string; // JSON string that needs to be parsed
  };
}

// Streaming delta type - OpenRouter sends incremental updates with an index
export interface ToolCallDelta {
  index?: number; // Position in the tool calls array during streaming
  id?: string;
  type?: "function";
  function?: {
    name?: string;
    arguments?: string; // Streamed incrementally
  };
}

// ============================================================================
// Tool Message Types (what we send back to the API)
// ============================================================================

export interface ToolMessage {
  role: "tool";
  tool_call_id: string;
  content: string; // JSON string of the tool result
}

// ============================================================================
// Internal Tool Types (for our registry and execution)
// ============================================================================

export type ToolCategory = "system" | "project" | "filesystem";

export interface ToolMetadata {
  id: string; // Unique identifier (e.g., "date_time")
  name: string; // Display name (e.g., "Date & Time")
  description: string; // Short description for UI
  category: ToolCategory;
  enabled: boolean; // Whether the tool is enabled by default
}

export interface ToolExecutor<TParams = any, TResult = any> {
  metadata: ToolMetadata;
  definition: ToolDefinition;
  execute: (params: TParams) => Promise<TResult>;
}

// ============================================================================
// Tool Result Types
// ============================================================================

export interface ToolExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
}

// ============================================================================
// Date/Time Tool Specific Types
// ============================================================================

export interface DateTimeParams {
  // No parameters needed for date_time tool
}

export interface DateTimeResult {
  date: string; // e.g., "12/27/2024"
  time: string; // e.g., "2:45 PM"
  iso: string; // e.g., "2024-12-27T19:45:00Z"
  timezone: string; // e.g., "America/New_York"
  day_of_week: string; // e.g., "Friday"
}
