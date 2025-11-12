/**
 * Model Pricing Utility
 *
 * Fetches real-time pricing from OpenRouter API and caches locally.
 * Falls back to hardcoded pricing if API is unavailable.
 *
 * Cache duration: 24 hours
 * User must provide their OpenRouter API key for dynamic pricing.
 */

export interface ModelPricing {
  id: string;
  name: string;
  pricing: {
    input: number; // per million tokens
    output: number; // per million tokens
  };
  context_length?: number;
  description?: string;
}

interface ModelPricingCache {
  models: Record<string, ModelPricing["pricing"]>;
  lastFetched: number;
}

const CACHE_KEY = "proxii_model_pricing";
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fallback pricing if API fails or no API key provided
 * Updated as of January 2025
 */
export const FALLBACK_PRICING: Record<string, ModelPricing["pricing"]> = {
  // Anthropic Claude models (current pricing)
  "anthropic/claude-opus-4.1": { input: 15.0, output: 75.0 },
  "anthropic/claude-opus-4": { input: 15.0, output: 75.0 },
  "anthropic/claude-sonnet-4.5": { input: 3.0, output: 15.0 },
  "anthropic/claude-sonnet-4": { input: 3.0, output: 15.0 },
  "anthropic/claude-sonnet-3.7": { input: 3.0, output: 15.0 },
  "anthropic/claude-haiku-4.5": { input: 1.0, output: 5.0 },
  "anthropic/claude-haiku-3.5": { input: 0.8, output: 4.0 },
  "anthropic/claude-opus-3": { input: 15.0, output: 75.0 },
  "anthropic/claude-haiku-3": { input: 0.25, output: 1.25 },

  // Shorter model names (for backward compatibility)
  "claude-opus-4.1": { input: 15.0, output: 75.0 },
  "claude-sonnet-4.5": { input: 3.0, output: 15.0 },
  "claude-haiku-4.5": { input: 1.0, output: 5.0 },
  "claude-3.5-sonnet": { input: 3.0, output: 15.0 },
  "claude-3-opus": { input: 15.0, output: 75.0 },
  "claude-3-sonnet": { input: 3.0, output: 15.0 },
  "claude-3-haiku": { input: 0.25, output: 1.25 },

  // OpenAI GPT models
  "openai/gpt-4": { input: 30.0, output: 60.0 },
  "openai/gpt-4-turbo": { input: 10.0, output: 30.0 },
  "openai/gpt-4o": { input: 2.5, output: 10.0 },
  "openai/gpt-4o-mini": { input: 0.15, output: 0.6 },
  "openai/gpt-3.5-turbo": { input: 0.5, output: 1.5 },
  "openai/o1": { input: 15.0, output: 60.0 },
  "openai/o1-mini": { input: 3.0, output: 12.0 },

  // Shorter OpenAI names
  "gpt-4": { input: 30.0, output: 60.0 },
  "gpt-4-turbo": { input: 10.0, output: 30.0 },
  "gpt-4o": { input: 2.5, output: 10.0 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-3.5-turbo": { input: 0.5, output: 1.5 },
};

/**
 * Fetch current pricing from OpenRouter API
 * Requires user's OpenRouter API key
 */
async function fetchModelPricing(
  apiKey: string
): Promise<Record<string, ModelPricing["pricing"]>> {
  if (!apiKey || apiKey.trim() === "") {
    throw new Error("API key is required");
  }

  try {
    console.log("Fetching model pricing from OpenRouter...");

    const response = await fetch("https://openrouter.ai/api/v1/models", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `OpenRouter API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    if (!data.data || !Array.isArray(data.data)) {
      throw new Error("Invalid response format from OpenRouter API");
    }

    // Transform API response to our format
    const pricing: Record<string, ModelPricing["pricing"]> = {};

    data.data.forEach((model: any) => {
      if (model.id && model.pricing) {
        // OpenRouter returns price per token, multiply by 1M for our format
        pricing[model.id] = {
          input: parseFloat(model.pricing.prompt || 0) * 1_000_000,
          output: parseFloat(model.pricing.completion || 0) * 1_000_000,
        };
      }
    });

    console.log(
      `Successfully fetched pricing for ${Object.keys(pricing).length} models`
    );
    return pricing;
  } catch (error) {
    console.error("Error fetching model pricing:", error);
    throw error;
  }
}

/**
 * Get model pricing with caching
 *
 * @param apiKey - User's OpenRouter API key (optional, falls back to hardcoded if not provided)
 * @param forceRefresh - Force refresh from API, bypassing cache
 * @returns Record of model IDs to pricing info
 */
export async function getModelPricing(
  apiKey?: string,
  forceRefresh: boolean = false
): Promise<Record<string, ModelPricing["pricing"]>> {
  // If no API key, use fallback pricing immediately
  if (!apiKey || apiKey.trim() === "") {
    console.warn("No API key provided, using fallback pricing");
    return FALLBACK_PRICING;
  }

  // Check cache first (unless force refresh)
  if (!forceRefresh) {
    const cached = localStorage.getItem(CACHE_KEY);

    if (cached) {
      try {
        const { models, lastFetched }: ModelPricingCache = JSON.parse(cached);
        const now = Date.now();

        // If cache is still fresh, use it
        if (now - lastFetched < CACHE_DURATION) {
          console.log("Using cached model pricing");
          return models;
        } else {
          console.log("Cache expired, fetching fresh pricing");
        }
      } catch (error) {
        console.error("Error reading cache:", error);
        localStorage.removeItem(CACHE_KEY);
      }
    }
  }

  // Fetch fresh pricing
  try {
    const models = await fetchModelPricing(apiKey);

    // Cache it
    const cache: ModelPricingCache = {
      models,
      lastFetched: Date.now(),
    };

    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));

    return models;
  } catch (error) {
    console.error("Failed to fetch pricing, attempting fallback...");

    // If fetch fails and we have old cache, use it
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const { models }: ModelPricingCache = JSON.parse(cached);
        console.warn("Using stale cache due to fetch error");
        return models;
      } catch (parseError) {
        console.error("Error parsing stale cache:", parseError);
      }
    }

    // Fall back to hardcoded pricing
    console.warn("Falling back to hardcoded pricing");
    return FALLBACK_PRICING;
  }
}

/**
 * Force refresh pricing from API
 * Clears cache and fetches fresh data
 *
 * @param apiKey - User's OpenRouter API key
 */
export async function refreshModelPricing(apiKey: string): Promise<void> {
  if (!apiKey || apiKey.trim() === "") {
    throw new Error("API key is required to refresh pricing");
  }

  localStorage.removeItem(CACHE_KEY);
  await getModelPricing(apiKey, true);
}

/**
 * Clear pricing cache
 * Useful for debugging or when user changes API key
 */
export function clearPricingCache(): void {
  localStorage.removeItem(CACHE_KEY);
  console.log("Pricing cache cleared");
}

/**
 * Get cache status
 * Returns info about current cache state
 */
export function getCacheStatus(): {
  exists: boolean;
  age?: number;
  expired?: boolean;
  modelCount?: number;
} {
  const cached = localStorage.getItem(CACHE_KEY);

  if (!cached) {
    return { exists: false };
  }

  try {
    const { models, lastFetched }: ModelPricingCache = JSON.parse(cached);
    const now = Date.now();
    const age = now - lastFetched;
    const expired = age >= CACHE_DURATION;

    return {
      exists: true,
      age,
      expired,
      modelCount: Object.keys(models).length,
    };
  } catch (error) {
    return { exists: false };
  }
}

/**
 * Get pricing for a specific model
 * Returns pricing or null if model not found
 */
export function getModelPricingById(
  modelId: string,
  pricingData: Record<string, ModelPricing["pricing"]>
): ModelPricing["pricing"] | null {
  return pricingData[modelId] || null;
}
