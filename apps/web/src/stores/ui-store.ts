/**
 * UI store — ephemeral, client-only view state for the workspace shell
 * (ADR-035): sidebar collapse, assistant rail, command palette, and theme.
 * Server/domain data is owned by TanStack Query, never here.
 */
'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'dark' | 'light';

interface UIState {
  sidebarCollapsed: boolean;
  assistantOpen: boolean;
  commandPaletteOpen: boolean;
  theme: Theme;
  /** A prompt queued for the assistant rail by another surface (dashboard,
   * command palette). The rail consumes and clears it. */
  pendingAssistantPrompt: string | null;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleAssistant: () => void;
  setAssistantOpen: (open: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  /** Open the assistant and queue a prompt for it to send. */
  askAssistant: (prompt: string) => void;
  consumeAssistantPrompt: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      assistantOpen: true,
      commandPaletteOpen: false,
      theme: 'dark',
      pendingAssistantPrompt: null,
      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      toggleAssistant: () => set((s) => ({ assistantOpen: !s.assistantOpen })),
      setAssistantOpen: (assistantOpen) => set({ assistantOpen }),
      setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
      toggleCommandPalette: () =>
        set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),
      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      askAssistant: (prompt) =>
        set({ assistantOpen: true, pendingAssistantPrompt: prompt }),
      consumeAssistantPrompt: () => set({ pendingAssistantPrompt: null }),
    }),
    {
      name: 'gabriel.ui',
      partialize: (s) => ({
        sidebarCollapsed: s.sidebarCollapsed,
        assistantOpen: s.assistantOpen,
        theme: s.theme,
      }),
    },
  ),
);
