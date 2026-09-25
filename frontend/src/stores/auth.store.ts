import { create } from 'zustand';
import { persist, type PersistStorage, type StorageValue } from 'zustand/middleware';

/**
 * Session token architecture — orchestrator decision D4 (wave 12).
 *
 * The short-TTL access token is persisted to localStorage while the
 * long-lived refresh token stays in an httpOnly cookie. That keeps
 * reload-as-logged-in silent (no boot-time refresh round-trip) at the
 * cost of a documented XSS surface: any injected script can read the
 * bearer for the remainder of its TTL (minutes). The httpOnly refresh
 * cookie — the actual session secret — remains unreadable to scripts.
 * Acceptance is deliberate; do not widen the persisted shape (below)
 * and never move the refresh token into storage reachable from JS.
 * `clear()` runs at every session boundary (api.ts refresh failure,
 * login/register/logout hooks) together with a TanStack cache clear,
 * so a stale token never pairs with another user's cached data.
 */

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

/** The partialized slice persisted under the `mdrk-auth` key. */
type PersistedSession = { user: AuthUser | null; accessToken: string | null };

/** Synchronous string storage — what localStorage and the memory shim expose. */
type SyncStringStorage = {
  getItem: (name: string) => string | null;
  setItem: (name: string, value: string) => void;
  removeItem: (name: string) => void;
};

interface AuthState extends PersistedSession {
  isHydrated: boolean;
  setSession: (user: AuthUser, accessToken: string) => void;
  setAccessToken: (token: string | null) => void;
  clear: () => void;
  setHydrated: () => void;
}

/**
 * Resolve the underlying string storage (audit P2-13). Embedded
 * webviews and hardened privacy modes can raise a SecurityError on
 * `localStorage` access — or only on write (quota 0). Probe both and
 * fall back to a non-persistent in-memory Map: the app boots
 * normally, the session just doesn't survive a reload.
 */
function resolveStringStorage(): SyncStringStorage {
  try {
    const real = globalThis.localStorage;
    real.setItem('mdrk-auth::probe', '1');
    real.removeItem('mdrk-auth::probe');
    return real;
  } catch {
    const mem = new Map<string, string>();
    return {
      getItem: (name) => mem.get(name) ?? null,
      setItem: (name, value) => {
        mem.set(name, value);
      },
      removeItem: (name) => {
        mem.delete(name);
      },
    };
  }
}

/**
 * PersistStorage that can never fail hydration (audit P2-13): a
 * corrupted payload reads back as "nothing persisted" (defaults) and
 * blocked writes are best-effort instead of crashing sign-in. Without
 * these guards zustand's rehydrate callback is skipped (or invoked
 * with no state), `isHydrated` never flips, and the app would sit on
 * `<HydrationSplash/>` forever.
 */
function safeSessionStorage(): PersistStorage<PersistedSession> {
  const ls = resolveStringStorage();
  return {
    getItem: (name) => {
      try {
        const raw = ls.getItem(name);
        return raw === null ? null : (JSON.parse(raw) as StorageValue<PersistedSession>);
      } catch {
        return null;
      }
    },
    setItem: (name, value) => {
      try {
        ls.setItem(name, JSON.stringify(value));
      } catch {
        // Best-effort — a blocked write must not crash session updates.
      }
    },
    removeItem: (name) => {
      try {
        ls.removeItem(name);
      } catch {
        // Best-effort, same rationale as setItem.
      }
    },
  };
}

// Captured `set` from the store creator. The rehydrate callback can
// run synchronously during `create()` (zustand's sync thenable), so
// the outer `useAuthStore` binding is still in its TDZ there — this
// is the version-proof way to reach the setter from the failure path
// below.
let markHydrated: (() => void) | null = null;

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => {
      markHydrated = () => set({ isHydrated: true });
      return {
        user: null,
        accessToken: null,
        isHydrated: false,
        setSession: (user, accessToken) => set({ user, accessToken }),
        setAccessToken: (accessToken) => set({ accessToken }),
        clear: () => set({ user: null, accessToken: null }),
        setHydrated: () => set({ isHydrated: true }),
      };
    },
    {
      name: 'mdrk-auth',
      storage: safeSessionStorage(),
      partialize: (s) => ({ user: s.user, accessToken: s.accessToken }),
      onRehydrateStorage: () => (state) => {
        // `state` is undefined when rehydration failed before the merge
        // (unexpected error in a custom storage / migrate). The safe
        // storage above makes this unreachable, but if it ever fires we
        // must still mark hydration complete — deferred, because a
        // synchronous `set` here would be overwritten by `create()`'s
        // final initial-state assignment (P2-13).
        if (state) state.setHydrated();
        else queueMicrotask(() => markHydrated?.());
      },
    },
  ),
);
