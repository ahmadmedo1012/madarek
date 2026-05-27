import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface DashboardWidget {
  id: string;
  type: string;
  visible: boolean;
  order: number;
}

interface DashboardState {
  widgets: DashboardWidget[];
  toggleWidget: (id: string) => void;
  reorderWidgets: (ids: string[]) => void;
  resetDefaults: () => void;
}

const DEFAULT_WIDGETS: DashboardWidget[] = [
  { id: 'stats', type: 'stats', visible: true, order: 0 },
  { id: 'gpa', type: 'gpa', visible: true, order: 1 },
  { id: 'progress', type: 'progress', visible: true, order: 2 },
  { id: 'term', type: 'term', visible: true, order: 3 },
  { id: 'agenda', type: 'agenda', visible: true, order: 4 },
];

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      widgets: DEFAULT_WIDGETS,
      toggleWidget: (id: string) =>
        set((state) => ({
          widgets: state.widgets.map((w) =>
            w.id === id ? { ...w, visible: !w.visible } : w,
          ),
        })),
      reorderWidgets: (ids: string[]) =>
        set((state) => ({
          widgets: state.widgets.map((w) => ({
            ...w,
            order: ids.indexOf(w.id),
          })),
        })),
      resetDefaults: () => set({ widgets: DEFAULT_WIDGETS }),
    }),
    { name: 'madarek-dashboard-widgets', storage: createJSONStorage(() => localStorage) },
  ),
);
