import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Model {
  id: string;
  name: string;
  description: string;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
  };
  architecture?: {
    input_modalities: string[];
    output_modalities: string[];
  };
  top_provider?: {
    max_completion_tokens: number;
  };
}

interface ModelStore {
  // All available models from OpenRouter
  availableModels: Model[];

  // User's selected model IDs (persisted)
  userModelIds: string[];

  // Currently selected model
  selectedModelId: string | null;

  // Loading state
  loading: boolean;
  error: string | null;
  lastFetched: number | null;

  // Actions
  fetchModels: (apiKey: string) => Promise<void>;
  addToCollection: (modelId: string) => void;
  removeFromCollection: (modelId: string) => void;
  isInCollection: (modelId: string) => boolean;
  getUserModels: () => Model[];
  clearError: () => void;
  resetToDefaults: () => void;
  setSelectedModel: (modelId: string) => void;
}

export const useModelStore = create<ModelStore>()(
  persist(
    (set, get) => ({
      availableModels: [],
      userModelIds: [
        // Default models
        "anthropic/claude-4.5-sonnet",
        "anthropic/claude-4.5-haiku",
        "kwaipilot/kat-coder-pro:free",
        "deepseek/deepseek-chat-v3.1:free",
      ],
      selectedModelId: null,
      loading: false,
      error: null,
      lastFetched: null,

      fetchModels: async (apiKey: string) => {
        set({ loading: true, error: null });

        try {
          const response = await fetch("https://openrouter.ai/api/v1/models", {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch models: ${response.status}`);
          }

          const data = await response.json();

          // Transform API response to our Model type
          const models: Model[] = data.data.map((model: any) => ({
            id: model.id,
            name: model.name,
            description: model.description || "",
            context_length: model.context_length,
            pricing: {
              prompt: model.pricing.prompt,
              completion: model.pricing.completion,
            },
            architecture: model.architecture,
            top_provider: model.top_provider,
          }));

          set({
            availableModels: models,
            loading: false,
            lastFetched: Date.now(),
          });

          console.log(`✓ Loaded ${models.length} models from OpenRouter`);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          set({
            error: errorMessage,
            loading: false,
          });
          console.error("Error fetching models:", error);
        }
      },

      addToCollection: (modelId: string) => {
        set((state) => ({
          userModelIds: [...state.userModelIds, modelId],
        }));
      },

      removeFromCollection: (modelId: string) => {
        set((state) => ({
          userModelIds: state.userModelIds.filter((id) => id !== modelId),
        }));
      },

      isInCollection: (modelId: string) => {
        return get().userModelIds.includes(modelId);
      },

      getUserModels: () => {
        const { availableModels, userModelIds } = get();
        return availableModels.filter((model) =>
          userModelIds.includes(model.id)
        );
      },

      clearError: () => set({ error: null }),

      // Reset to default models (useful for debugging or fresh start)
      resetToDefaults: () => {
        set({
          userModelIds: [
            "anthropic/claude-3.5-sonnet",
            "anthropic/claude-3-opus",
            "openai/gpt-4",
            "openai/gpt-3.5-turbo",
          ],
        });
      },

      setSelectedModel: (modelId: string) => {
        set({ selectedModelId: modelId });
      },
    }),
    {
      name: "proxii-models",
      partialize: (state) => ({
        userModelIds: state.userModelIds,
        lastFetched: state.lastFetched,
        selectedModelId: state.selectedModelId,
      }),
    }
  )
);
