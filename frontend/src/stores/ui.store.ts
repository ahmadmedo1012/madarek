import { create } from 'zustand';

interface UiState {
  sidebarOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
  oasisOpen: boolean;
  toggleOasis: () => void;
  openOasis: () => void;
  closeOasis: () => void;
}

export const useUiStore = create<UiState>()((set) => ({
  sidebarOpen: false,
  openSidebar: () => set({ sidebarOpen: true }),
  closeSidebar: () => set({ sidebarOpen: false }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  oasisOpen: false,
  toggleOasis: () => set((s) => ({ oasisOpen: !s.oasisOpen })),
  openOasis: () => set({ oasisOpen: true }),
  closeOasis: () => set({ oasisOpen: false }),
}));
