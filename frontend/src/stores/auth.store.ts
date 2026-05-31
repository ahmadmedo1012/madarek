import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type AppRole = 'STUDENT' | 'TEACHER' | 'ADMIN' | 'QUALITY' | 'OWNER';

/**
 * Academic leadership appointment, layered on top of the TEACHER role.
 * A regular teacher has `position: null`; a dean is a teacher with `DEAN`.
 */
export type AcademicPosition = 'DEAN' | 'ASSOCIATE_DEAN' | 'DEPARTMENT_HEAD';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: AppRole;
  avatarColor?: string | null;
  avatarInitials?: string | null;
  /** NULL for university-wide ADMIN/QUALITY; set = scoped to that faculty. */
  scopeFacultyId?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isHydrated: boolean;
  setSession: (user: AuthUser, accessToken: string) => void;
  setAccessToken: (token: string | null) => void;
  clear: () => void;
  setHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isHydrated: false,
      setSession: (user, accessToken) => set({ user, accessToken }),
      setAccessToken: (accessToken) => set({ accessToken }),
      clear: () => set({ user: null, accessToken: null }),
      setHydrated: () => set({ isHydrated: true }),
    }),
    {
      name: 'mdrk-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ user: s.user, accessToken: s.accessToken }),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);
