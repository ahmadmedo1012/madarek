import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/** Most-recently-run command-palette actions, newest first (5-D3 /
 *  5-A10 P3-5). Ids are the palette's stable action ids (`nav:<to>` /
 *  `action:theme`) — resolved against the CURRENT role's action list
 *  at render time, so a stored id from another role simply never
 *  resolves and never renders. */
export const PALETTE_RECENTS_CAP = 4;

interface UiState {
  /** Mobile drawer open state — full overlay on small screens. */
  sidebarOpen: boolean;
  /** Desktop collapsed/expanded state — narrow icon rail vs full width. Persisted. */
  sidebarCollapsed: boolean;
  /** Last-run palette action ids, newest first. Persisted. */
  recentPaletteIds: string[];
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
  toggleSidebarCollapsed: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  /** Records a palette action run: dedupes, moves the id to the front,
   *  keeps the newest PALETTE_RECENTS_CAP entries. */
  pushRecentPalette: (id: string) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarOpen: false,
      // Default collapsed on first visit — user explicitly requested
      // the sidebar fold rather than be permanently visible. Once a user
      // toggles it, their preference is persisted and respected.
      sidebarCollapsed: true,
      recentPaletteIds: [],
      openSidebar: () => set({ sidebarOpen: true }),
      closeSidebar: () => set({ sidebarOpen: false }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      toggleSidebarCollapsed: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (v: boolean) => set({ sidebarCollapsed: v }),
      pushRecentPalette: (id) =>
        set((s) => ({
          recentPaletteIds: [id, ...s.recentPaletteIds.filter((x) => x !== id)].slice(
            0,
            PALETTE_RECENTS_CAP,
          ),
        })),
    }),
    {
      name: 'mdrk-ui',
      storage: createJSONStorage(() => localStorage),
      // Persist the desktop state + the palette recents — the mobile
      // drawer is session-scoped.
      partialize: (s) => ({
        sidebarCollapsed: s.sidebarCollapsed,
        recentPaletteIds: s.recentPaletteIds,
      }),
    },
  ),
);
