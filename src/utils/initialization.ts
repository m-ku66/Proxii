/**
 * App Initialization Utilities
 *
 * Functions to initialize the app on startup, including:
 * - Loading pricing data from OpenRouter
 * - Fetching available models
 * - Setting up stores
 * - Checking for updates
 */

import { initializePricing } from "./tokenUtils";
import { useSettingsStore } from "@/stores/settingsStore";
import { useModelStore } from "@/stores/modelStore";

/**
 * Initialize the app
 * Call this once on app startup (in your main App component)
 */
export async function initializeApp(): Promise<void> {
  console.log("Initializing Proxii...");

  try {
    // Get API key from settings
    const apiKey = useSettingsStore.getState().openRouterApiKey;

    if (apiKey) {
      console.log("API key found, fetching model pricing...");
      await initializePricing(apiKey);
      console.log("✓ Pricing initialized successfully");

      // Also fetch models on startup
      console.log("Fetching available models...");
      try {
        await useModelStore.getState().fetchModels(apiKey);
        console.log("✓ Models loaded successfully");
      } catch (error) {
        console.error("Failed to fetch models on startup:", error);
        console.log("⚠ Models can be loaded manually in Settings");
      }
    } else {
      console.log("⚠ No API key found, using fallback pricing");
      await initializePricing(); // Will use fallback
      console.log(
        "⚠ Models unavailable - add API key in Settings to load models"
      );
    }

    console.log("✓ App initialized successfully");
  } catch (error) {
    console.error("Error during app initialization:", error);
    // Continue with fallback pricing
    console.log("⚠ Continuing with fallback pricing");
  }
}

/**
 * Refresh pricing data
 * Call this when user updates their API key or manually refreshes
 */
export async function refreshAppPricing(): Promise<void> {
  const apiKey = useSettingsStore.getState().openRouterApiKey;

  if (!apiKey) {
    throw new Error(
      "No API key found. Please set your OpenRouter API key in settings."
    );
  }

  console.log("Refreshing pricing data...");
  await initializePricing(apiKey);
  console.log("✓ Pricing refreshed successfully");
}
