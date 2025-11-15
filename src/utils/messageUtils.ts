/**
 * Message Utilities
 *
 * Helper functions for processing and cleaning message content
 */

/**
 * Strip special tokens from LLM responses
 *
 * Some models (especially DeepSeek) include special tokens like:
 * - <｜begin▁of▁sentence｜>
 * - <｜end▁of▁sentence｜>
 * - <｜fim▁begin｜>
 * - etc.
 *
 * This function removes them to provide clean output.
 */
export function stripSpecialTokens(content: string): string {
  if (!content) return content;

  // Pattern to match special tokens with fullwidth characters
  // Matches: <｜...｜> where ... can be any characters including ▁
  const specialTokenPattern = /<｜[^｜]*｜>/g;

  // Also catch any remaining angle bracket tokens that might slip through
  const angleBracketPattern = /<\|[^|]*\|>/g;

  let cleaned = content;

  // Remove fullwidth special tokens
  cleaned = cleaned.replace(specialTokenPattern, "");

  // Remove standard pipe tokens
  cleaned = cleaned.replace(angleBracketPattern, "");

  // Remove any extra whitespace that might be left over
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * Sanitize message content for display
 * Combines all cleaning operations
 */
export function sanitizeMessageContent(content: string): string {
  let sanitized = content;

  // Strip special tokens
  sanitized = stripSpecialTokens(sanitized);

  // Future: Add more sanitization if needed
  // - Remove excessive newlines
  // - Handle other model-specific quirks

  return sanitized;
}
