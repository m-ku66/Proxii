/**
 * Date & Time Tool
 * Provides the current date, time, and timezone information to the LLM
 */

import type {
  ToolExecutor,
  DateTimeParams,
  DateTimeResult,
} from "@/types/tools";

export const dateTimeTool: ToolExecutor<DateTimeParams, DateTimeResult> = {
  metadata: {
    id: "date_time",
    name: "Date & Time",
    description: "Get the current date, time, and timezone",
    category: "system",
    enabled: true, // Enabled by default
  },

  definition: {
    type: "function",
    function: {
      name: "date_time",
      description:
        "Get the current date, time, timezone, and day of the week. Use this when the user asks about/references the current time, date, or day.",
      parameters: {
        type: "object",
        properties: {}, // No parameters needed
        required: [],
      },
    },
  },

  execute: async (_params: DateTimeParams): Promise<DateTimeResult> => {
    const now = new Date();

    // Format date as MM/DD/YYYY
    const date = now.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });

    // Format time as 12-hour with AM/PM
    const time = now.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    // Get ISO string
    const iso = now.toISOString();

    // Get timezone
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Get day of week
    const dayOfWeek = now.toLocaleDateString("en-US", {
      weekday: "long",
    });

    return {
      date,
      time,
      iso,
      timezone,
      day_of_week: dayOfWeek,
    };
  },
};
