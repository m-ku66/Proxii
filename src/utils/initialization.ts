/**
 * App Initialization Utilities
 *
 * Functions to initialize the app on startup, including:
 * - Loading pricing data from OpenRouter
 * - Fetching available models
 * - Setting up stores
 * - Loading conversations from disk
 * - Setting up auto-save system
 */

import { initializePricing } from "./tokenUtils";
import { useSettingsStore } from "@/stores/settingsStore";
import { useModelStore } from "@/stores/modelStore";
import { useChatStore } from "@/stores/chatStore";
import { useProjectStore } from "@/stores/projectStore";
import { conversationPersistence } from "@/services/conversationPersistenceService";
import { projectPersistence } from "@/services/projectPersistenceService";

/**
 * Initialize the app
 * Call this once on app startup (in your main App component)
 */
export async function initializeApp(): Promise<void> {
  console.log("Initializing Proxii...");

  try {
    // ✨ STEP 1: Initialize projects first (they exist independently)
    console.log("Initializing projects...");
    await initializeProjects();
    console.log("✓ Projects initialized");

    // ✨ STEP 2: Initialize conversation persistence (depends on projects for scoping)
    console.log("Initializing conversation persistence...");
    await initializeConversations();
    console.log("✓ Conversation persistence initialized");

    // ✨ STEP 3: Get API key and initialize pricing/models
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

    // ✨ STEP 4: Set up auto-save system
    setupAutoSave();
    console.log("✓ Auto-save system initialized");

    console.log("✓ App initialized successfully");
  } catch (error) {
    console.error("Error during app initialization:", error);
    // Continue with fallback pricing
    console.log("⚠ Continuing with fallback pricing");

    // Still try to initialize persistence even if other stuff fails
    try {
      await initializeProjects();
      await initializeConversations();
      setupAutoSave();
      console.log("✓ Persistence system initialized despite other errors");
    } catch (persistError) {
      console.error("Failed to initialize persistence:", persistError);
    }
  }
}

/**
 * Initialize conversation persistence and load saved conversations
 */
async function initializeConversations(): Promise<void> {
  try {
    // Initialize the persistence service
    await conversationPersistence.initialize();

    // Load all conversations from disk
    const savedConversations =
      await conversationPersistence.loadAllConversations();

    if (savedConversations.length > 0) {
      // Load conversations into the store
      useChatStore.getState().setConversationsFromDisk(savedConversations);

      // Set the most recent conversation as active if none is currently active
      const { activeConversationId, setActiveConversation } =
        useChatStore.getState();
      if (!activeConversationId && savedConversations.length > 0) {
        setActiveConversation(savedConversations[0].id);
      }

      console.log(
        `Loaded ${savedConversations.length} conversations from disk`
      );
    } else {
      console.log("No saved conversations found");
    }
  } catch (error) {
    console.error("Failed to initialize conversations:", error);
    // Don't throw - let the app continue without persistence
  }
}

/**
 * Initialize project persistence and load saved projects
 */
async function initializeProjects(): Promise<void> {
  try {
    // Initialize the persistence service
    await projectPersistence.initialize();

    // Load all projects from disk
    const savedProjects = await projectPersistence.loadAllProjects();

    if (savedProjects.length > 0) {
      // Load projects into the store
      useProjectStore.getState().setProjectsFromDisk(savedProjects);

      console.log(`📂 Loaded ${savedProjects.length} projects from disk`);
    } else {
      console.log("📂 No saved projects found");
    }
  } catch (error) {
    console.error("Failed to initialize projects:", error);
    // Don't throw - let the app continue without persistence
  }
}

/**
 * Set up auto-save functionality
 */
function setupAutoSave(): void {
  try {
    // Set up periodic auto-save (every 30 seconds)
    const autoSaveInterval = setInterval(async () => {
      try {
        await Promise.all([
          useChatStore.getState().saveAllDirtyConversations(),
          useProjectStore.getState().saveAllDirtyProjects(),
        ]);
      } catch (error) {
        console.error("Periodic auto-save failed:", error);
      }
    }, 30000); // 30 seconds

    // Clean up interval on page unload
    window.addEventListener("beforeunload", () => {
      clearInterval(autoSaveInterval);
    });

    // Listen for auto-save events triggered by the persistence service
    window.addEventListener("proxii-autosave", async () => {
      try {
        console.log("🔄 Auto-save triggered...");

        // Save both conversations and projects
        await Promise.all([
          useChatStore.getState().saveAllDirtyConversations(),
          useProjectStore.getState().saveAllDirtyProjects(),
        ]);

        console.log("✓ Auto-save completed");
      } catch (error) {
        console.error("Auto-save failed:", error);
      }
    });

    // Save all dirty conversations and projects before page unload
    window.addEventListener("beforeunload", async (event) => {
      try {
        console.log(event, ": 💾 Saving data before app close...");

        // Quick save attempt with timeout
        await Promise.race([
          Promise.all([
            useChatStore.getState().saveAllDirtyConversations(),
            useProjectStore.getState().saveAllDirtyProjects(),
          ]),
          new Promise((resolve) => setTimeout(resolve, 1000)), // Max 1 second
        ]);

        console.log("✓ Pre-close save completed");
      } catch (error) {
        console.error("Failed to save on page unload:", error);
      }
    });

    console.log("Auto-save event listeners registered (30s interval)");
  } catch (error) {
    console.error("Failed to set up auto-save:", error);
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

/**
 * ✨ NEW: Utility functions for conversation management
 */

/**
 * Check if we're running in Electron (vs browser)
 */
export function isElectron(): boolean {
  return typeof window !== "undefined" && !!window.electronAPI;
}

/**
 * Get information about where conversations are stored
 */
export async function getStorageInfo(): Promise<{
  type: "electron" | "browser" | "unknown";
  location: string;
  path: string | null;
}> {
  try {
    if (!isElectron()) {
      return {
        type: "browser",
        location: "localStorage (fallback)",
        path: null,
      };
    }

    const path = await useChatStore.getState().getConversationsPath();
    return {
      type: "electron",
      location: "Local filesystem",
      path: path || "Unknown",
    };
  } catch (error) {
    console.error("Failed to get storage info:", error);
    return {
      type: "unknown",
      location: "Unknown",
      path: null,
    };
  }
}

/**
 * ✨ NEW: Manual save all conversations (useful for testing or manual triggers)
 */
export async function saveAllConversations(): Promise<void> {
  try {
    console.log("💾 Manually saving all conversations...");
    await useChatStore.getState().saveAllDirtyConversations();
    console.log("✓ Manual save completed");
  } catch (error) {
    console.error("Manual save failed:", error);
    throw error;
  }
}

/**
 * ✨ NEW: Open the conversations folder (Electron only)
 */
export async function openConversationsFolder(): Promise<void> {
  try {
    if (!isElectron()) {
      console.warn("Cannot open folder: not running in Electron");
      return;
    }

    await useChatStore.getState().openConversationsFolder();
  } catch (error) {
    console.error("Failed to open conversations folder:", error);
    throw error;
  }
}

/**
 * ✨ NEW: Manual save all projects (useful for testing or manual triggers)
 */
export async function saveAllProjects(): Promise<void> {
  try {
    console.log("💾 Manually saving all projects...");
    await useProjectStore.getState().saveAllDirtyProjects();
    console.log("✓ Manual project save completed");
  } catch (error) {
    console.error("Manual project save failed:", error);
    throw error;
  }
}

/**
 * ✨ NEW: Open the projects folder (Electron only)
 */
export async function openProjectsFolder(): Promise<void> {
  try {
    if (!isElectron()) {
      console.warn("Cannot open folder: not running in Electron");
      return;
    }

    if (!window.electronAPI?.app?.openProjectsFolder) {
      console.warn("Projects folder API not available");
      return;
    }

    await window.electronAPI.app.openProjectsFolder();
  } catch (error) {
    console.error("Failed to open projects folder:", error);
    throw error;
  }
}
