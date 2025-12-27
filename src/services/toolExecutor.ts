/**
 * Tool Executor Service
 * Handles execution of tools and formatting results for OpenRouter API
 */

import { toolRegistry } from "@/tools/registry";
import type { ToolDefinition, ToolCall, ToolMessage } from "@/types/tools";

export class ToolExecutorService {
  /**
   * Get tool definitions for enabled tools (to send to OpenRouter API)
   */
  getToolDefinitions(enabledToolIds: string[]): ToolDefinition[] {
    return toolRegistry.getToolDefinitions(enabledToolIds);
  }

  /**
   * Execute a tool and format the result as a tool message for OpenRouter
   */
  async executeToolCall(toolCall: ToolCall): Promise<ToolMessage> {
    // 🛡️ DEFENSIVE CHECK 1: Validate tool name (DeepSeek sends null sometimes)
    const toolName = toolCall.function?.name;
    if (!toolName || typeof toolName !== "string") {
      console.error("❌ Invalid tool call - missing or null tool name:", toolCall);
      return {
        role: "tool",
        tool_call_id: toolCall.id || "unknown",
        content: JSON.stringify({
          error: "Invalid tool call: missing or null tool name",
        }),
      };
    }

    try {
      // 🛡️ DEFENSIVE CHECK 2: Handle empty/malformed arguments (Claude sends "{}" sometimes)
      const argsString = toolCall.function.arguments || "{}";
      let params: any;
      
      try {
        params = JSON.parse(argsString);
      } catch (parseError) {
        console.error(`❌ Failed to parse tool arguments for ${toolName}:`, argsString);
        return {
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify({
            error: `Invalid JSON arguments: ${argsString}`,
          }),
        };
      }

      // Empty object is valid for tools with no parameters (like date_time)
      console.log(`🔧 Executing tool: ${toolName}`, params);

      // Execute the tool through the registry
      const result = await toolRegistry.executeTool(toolName, params);

      if (!result.success) {
        console.error(`Tool ${toolName} execution failed:`, result.error);

        // Return error as tool message
        return {
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify({
            error: result.error || "Tool execution failed",
          }),
        };
      }

      console.log(`✅ Tool ${toolName} executed successfully:`, result.data);

      // Return successful result as tool message
      return {
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(result.data),
      };
    } catch (error) {
      console.error(`Failed to execute tool ${toolName}:`, error);

      // Return error as tool message
      return {
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify({
          error:
            error instanceof Error
              ? error.message
              : "Unknown error during tool execution",
        }),
      };
    }
  }

  /**
   * Execute multiple tool calls in parallel
   */
  async executeToolCalls(toolCalls: ToolCall[]): Promise<ToolMessage[]> {
    console.log(`🔧 Executing ${toolCalls.length} tool call(s)...`);
    
    // 🐛 DEBUG: Log raw tool call structure to help debug model differences
    console.log("🔍 Raw tool calls from model:", JSON.stringify(toolCalls, null, 2));

    const results = await Promise.all(
      toolCalls.map((toolCall) => this.executeToolCall(toolCall))
    );

    console.log(`✅ All tools executed, returning results`);
    return results;
  }

  /**
   * Check if a finish reason indicates tool calls
   */
  isToolCallsFinishReason(finishReason: string | undefined): boolean {
    return finishReason === "tool_calls";
  }
}

// Export singleton instance
export const toolExecutor = new ToolExecutorService();
