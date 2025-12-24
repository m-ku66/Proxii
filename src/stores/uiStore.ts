import React from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type Screen = "home" | "chats" | "chatRoom" | "projects" | "projectDetail" | "settings";

interface ModalState {
  isOpen: boolean;
  content: React.ReactNode | null;
  title?: string;
}

interface UIState {
  // Screen navigation
  activeScreen: Screen;
  setActiveScreen: (screen: Screen) => void;

  // Modal management
  modal: ModalState;
  openModal: (content: React.ReactNode, title?: string) => void;
  closeModal: () => void;

  // UI preferences
  sidebarOpen: boolean;
  toggleSidebar: () => void;

  // Theme
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Screen state (not persisted - always start on home)
      activeScreen: "home",
      setActiveScreen: (screen) => set({ activeScreen: screen }),

      // Modal state (not persisted - always start closed)
      modal: {
        isOpen: false,
        content: null,
        title: undefined,
      },
      openModal: (content, title) =>
        set({
          modal: { isOpen: true, content, title },
        }),
      closeModal: () =>
        set({
          modal: { isOpen: false, content: null, title: undefined },
        }),

      // Sidebar (not persisted - always start open)
      sidebarOpen: true,
      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      // Theme (PERSISTED - user's preference)
      theme: "light",
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: "proxii-ui", // localStorage key
      // Only persist theme - everything else is ephemeral UI state
      partialize: (state) => ({
        theme: state.theme,
      }),
    }
  )
);
