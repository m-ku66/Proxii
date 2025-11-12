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
      }),
    }
  )
);
