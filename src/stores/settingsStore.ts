import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SettingsStore {
  // API Configuration
  openRouterApiKey: string | null;
  setOpenRouterApiKey: (key: string) => void;
  clearApiKey: () => void;

  // App Settings
  theme: "light" | "dark" | "system";
  setTheme: (theme: "light" | "dark" | "system") => void;

  // Prompting Settings
  systemPrompt: string;
  setSystemPrompt: (prompt: string) => void;

  // Context Management
  maxContextMessages: number; // How many total messages to include in API calls (5-50)
  maxMessagesWithImages: number; // How many recent messages can include images (1-10)
  setMaxContextMessages: (value: number) => void;
  setMaxMessagesWithImages: (value: number) => void;

  // Pricing Settings
  lastPricingUpdate: number | null;

  // Helper methods
  hasApiKey: () => boolean;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      // API Configuration
      openRouterApiKey: null,

      setOpenRouterApiKey: (key: string) => {
        const trimmedKey = key.trim();
        if (trimmedKey) {
          set({ openRouterApiKey: trimmedKey });
        }
      },

      clearApiKey: () => {
        set({ openRouterApiKey: null });
      },

      // App Settings
      theme: "system",

      setTheme: (theme) => {
        set({ theme });
      },

      // Prompting Settings
      systemPrompt: "",

      setSystemPrompt: (prompt: string) => {
        set({ systemPrompt: prompt });
      },

      // Context Management
      maxContextMessages: 20, // Default: 20 messages

      maxMessagesWithImages: 5, // Default: 5 messages with images

      setMaxContextMessages: (value: number) => {
        // Clamp value between 5-50
        const clampedValue = Math.max(5, Math.min(50, value));
        set({ maxContextMessages: clampedValue });
      },

      setMaxMessagesWithImages: (value: number) => {
        // Clamp value between 1-10
        const clampedValue = Math.max(1, Math.min(10, value));
        set({ maxMessagesWithImages: clampedValue });
      },

      // Pricing
      lastPricingUpdate: null,

      // Helper methods
      hasApiKey: () => {
        const { openRouterApiKey } = get();
        return !!openRouterApiKey && openRouterApiKey.trim().length > 0;
      },
    }),
    {
      name: "proxii-settings", // localStorage key
      // Only persist certain fields
      partialize: (state) => ({
        openRouterApiKey: state.openRouterApiKey,
        theme: state.theme,
        systemPrompt: state.systemPrompt,
        maxContextMessages: state.maxContextMessages,
        maxMessagesWithImages: state.maxMessagesWithImages,
      }),
    }
  )
);
