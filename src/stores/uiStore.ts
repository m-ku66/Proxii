import React from "react";
import { create } from "zustand";

type Screen = "home" | "chats" | "chatRoom" | "projects" | "settings";

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

  // Theme (for later)
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
}

export const useUIStore = create<UIState>((set) => ({
  // Screen state
  activeScreen: "home",
  setActiveScreen: (screen) => set({ activeScreen: screen }),

  // Modal state
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

  // Sidebar
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  // Theme
  theme: "dark",
  setTheme: (theme) => set({ theme }),
}));
