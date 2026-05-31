import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface UiState {
  /** Mobile drawer open state — full overlay on small screens. */
  sidebarOpen: boolean;
  /** Desktop collapsed/expanded state — narrow icon rail vs full width. Persisted. */
  sidebarCollapsed: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
  toggleSidebarCollapsed: () => void;
  setSidebarCollapsed: (v: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarOpen: false,
      // Default collapsed on first visit — user explicitly requested
      // the sidebar fold rather than be permanently visible. Once a user
      // toggles it, their preference is persisted and respected.
      sidebarCollapsed: true,
      openSidebar: () => set({ sidebarOpen: true }),
      closeSidebar: () => set({ sidebarOpen: false }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      toggleSidebarCollapsed: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
    }),
    {
      name: 'mdrk-ui',
      storage: createJSONStorage(() => localStorage),
      // Only persist the desktop state — the mobile drawer is session-scoped.
      partialize: (s) => ({ sidebarCollapsed: s.sidebarCollapsed }),
    },
  ),
);
