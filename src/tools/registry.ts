/**
 * Tool Registry
 * Central registry for all available tools in Proxii
 */

import type { ToolExecutor, ToolDefinition } from "@/types/tools";
import { dateTimeTool } from "./executors/dateTime";

// ============================================================================
// Tool Registry
// ============================================================================

class ToolRegistry {
  private tools: Map<string, ToolExecutor> = new Map();

  constructor() {
    // Register all available tools
    this.registerTool(dateTimeTool);

    // Future tools will be registered here:
    // this.registerTool(findReadFileTool);
    // this.registerTool(webSearchTool);
    // etc.
  }

  /**
   * Register a tool in the registry
   */
  private registerTool(tool: ToolExecutor): void {
    this.tools.set(tool.metadata.id, tool);
  }

  /**
   * Get all available tools
   */
  getAllTools(): ToolExecutor[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get a specific tool by ID
   */
  getTool(id: string): ToolExecutor | undefined {
    return this.tools.get(id);
  }

  /**
   * Get tool definitions for enabled tools (to send to OpenRouter)
   */
  getToolDefinitions(enabledToolIds: string[]): ToolDefinition[] {
    return enabledToolIds
      .map((id) => this.tools.get(id))
      .filter((tool): tool is ToolExecutor => tool !== undefined)
      .map((tool) => tool.definition);
  }

  /**
   * Execute a tool by ID
   */
  async executeTool(
    toolId: string,
    params: any
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const tool = this.tools.get(toolId);

    if (!tool) {
      return {
        success: false,
        error: `Tool not found: ${toolId}`,
      };
    }

    try {
      const result = await tool.execute(params);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error(`Error executing tool ${toolId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get tools by category
   */
  getToolsByCategory(category: "system" | "project" | "filesystem"): ToolExecutor[] {
    return this.getAllTools().filter((tool) => tool.metadata.category === category);
  }
}

// Export singleton instance
export const toolRegistry = new ToolRegistry();
