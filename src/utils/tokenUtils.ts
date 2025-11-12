import { Tiktoken } from "js-tiktoken/lite";
import cl100k_base from "js-tiktoken/ranks/cl100k_base";
import {
  getModelPricing,
  FALLBACK_PRICING,
  type ModelPricing,
} from "./modelPricing";

// Cache for pricing data - initialized on first use
let pricingCache: Record<string, ModelPricing["pricing"]> | null = null;
let pricingCachePromise: Promise<
  Record<string, ModelPricing["pricing"]>
> | null = null;

/**
 * Initialize tiktoken encoder
 * Using cl100k_base encoding (works for GPT-4, GPT-3.5, Claude models)
 */
let encoder: Tiktoken | null = null;

function getEncoder(): Tiktoken {
  if (!encoder) {
    encoder = new Tiktoken(cl100k_base);
  }
  return encoder;
}

/**
 * Calculate token count for a given text
 */
export function calculateTokens(text: string): number {
  try {
    const enc = getEncoder();
    const tokens = enc.encode(text);
    return tokens.length;
  } catch (error) {
    console.error("Error calculating tokens:", error);
    // Fallback: rough estimate (1 token ≈ 4 characters)
    return Math.ceil(text.length / 4);
  }
}

/**
 * Initialize pricing cache
 * Call this on app startup with user's API key
 * @param apiKey - User's OpenRouter API key (optional)
 */
export async function initializePricing(apiKey?: string): Promise<void> {
  if (pricingCachePromise) {
    await pricingCachePromise;
    return;
  }

  pricingCachePromise = getModelPricing(apiKey);
  pricingCache = await pricingCachePromise;
  pricingCachePromise = null;

  console.log(
    "Pricing initialized with",
    Object.keys(pricingCache).length,
    "models"
  );
}

/**
 * Get current pricing data (uses cache or fallback)
 */
function getPricingData(): Record<string, ModelPricing["pricing"]> {
  return pricingCache || FALLBACK_PRICING;
}

/**
 * Calculate cost for tokens based on model
 * @param tokens - Number of tokens
 * @param model - Model identifier
 * @param isOutput - Whether these are output tokens (true) or input tokens (false)
 */
export function calculateCost(
  tokens: number,
  model: string,
  isOutput: boolean = true
): number {
  const pricing = getPricingData();
  const modelPricing = pricing[model];

  if (!modelPricing) {
    console.warn(`Unknown model: ${model}, using default pricing`);
    // Default to GPT-3.5 pricing if model not found
    return isOutput ? (tokens / 1_000_000) * 1.5 : (tokens / 1_000_000) * 0.5;
  }

  const pricePerMillion = isOutput ? modelPricing.output : modelPricing.input;
  return (tokens / 1_000_000) * pricePerMillion;
}

/**
 * Format cost as USD string
 */
export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return "<$0.01";
  }
  return `$${cost.toFixed(2)}`;
}

/**
 * Calculate total conversation cost
 */
export function calculateConversationCost(
  messages: Array<{
    tokens?: number;
    cost?: number;
  }>
): number {
  return messages.reduce((total, msg) => total + (msg.cost || 0), 0);
}

/**
 * Get estimated tokens for a message based on content and role
 * Used during Phase 1 before API integration
 */
export function estimateMessageTokens(
  content: string,
  role: "user" | "assistant"
): number {
  const baseTokens = calculateTokens(content);

  // Add overhead for message formatting (role, metadata, etc.)
  const overhead = 4; // Approximate overhead per message

  return baseTokens + overhead;
}

/**
 * Calculate tokens and cost for a new message
 * Returns both values to be stored on the Message object
 */
export function calculateMessageMetrics(
  content: string,
  role: "user" | "assistant",
  model?: string
): { tokens: number; cost: number } {
  const tokens = estimateMessageTokens(content, role);

  // Only assistant messages have cost (that's when the API call happens)
  // User messages contribute to input tokens but cost is tracked on the response
  const cost =
    role === "assistant" && model ? calculateCost(tokens, model, true) : 0;

  return { tokens, cost };
}

/**
 * Cleanup function - free encoder resources; not needed for lite version!
 */
// export function cleanupEncoder(): void {
//   if (encoder) {
//     encoder.free();
//     encoder = null;
//   }
// }
