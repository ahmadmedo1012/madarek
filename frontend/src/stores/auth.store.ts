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
 * Acceptance is deliberate; never move the refresh token into storage
 * reachable from JS. `clear()` runs at every session boundary (api.ts
 * refresh failure, login/register/logout hooks) together with a
 * TanStack cache clear, so a stale token never pairs with another
 * user's cached data.
 *
 * r178 (multi-institution foundation): the persisted shape was widened
 * ON PURPOSE — memberships (the user's active institution memberships),
 * currentInstitution (the institution context baked into the access
 * token's `inst` claim) and membershipRole (the effective role inside
 * that institution) now ride alongside {user, accessToken}. These are
 * CONTEXT labels, not secrets: they are derivable from any API
 * response and contain no credential material, so the D4 surface is
 * unchanged (an injected script still learns nothing it could not
 * read from /auth/me). A v0 persisted payload ({user, accessToken}
 * only) migrates to the new defaults via the persist `migrate`
 * function — memberships: [], currentInstitution: null, membershipRole:
 * null — which matches the server's own context resolution on the next
 * refresh (login auto-selects only when exactly one active membership
 * exists, so a re-minted token re-establishes context honestly).
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

/** r178: one of the user's institution memberships (login/register/me
 *  payloads list the ACTIVE memberships of ACTIVE institutions — the
 *  server is the source of truth; the client never synthesizes rows). */
export interface MembershipInfo {
  institutionId: string;
  name: string;
  nameEn?: string | null;
  slug: string;
  /** Effective role INSIDE this institution (from Membership, not the
   *  platform-level User.role). OWNER never appears here — the platform
   * owner holds no membership. */
  role: AppRole;
  isActive: boolean;
}

/** r178: the institution context of the current access token
 *  (JWT `inst` claim), as reported by the auth payloads. Null = no
 *  context (zero memberships, or multiple awaiting selection). */
export interface InstitutionSummary {
  id: string;
  name: string;
  nameEn?: string | null;
  slug: string;
}

/** The institution session context carried by every auth response
 *  (login / register / refresh / /auth/me / select-institution). */
export interface SessionInstitutionExtras {
  memberships: MembershipInfo[];
  currentInstitution: InstitutionSummary | null;
  membershipRole: AppRole | null;
}

/** The partialized slice persisted under the `mdrk-auth` key.
 *  r178: widened deliberately — see the D4 block above. */
type PersistedSession = SessionInstitutionExtras & {
  user: AuthUser | null;
  accessToken: string | null;
};

/** Synchronous string storage — what localStorage and the memory shim expose. */
type SyncStringStorage = {
  getItem: (name: string) => string | null;
  setItem: (name: string, value: string) => void;
  removeItem: (name: string) => void;
};

interface AuthState extends PersistedSession {
  isHydrated: boolean;
  /** r178: extras are optional for call sites holding only a bare
   *  {user, token} pair — omitting them RESETS the institution context
   *  to the defaults (a session payload without context fields carries
   *  no context; stale chips must never outlive their evidence). */
  setSession: (
    user: AuthUser,
    accessToken: string,
    extras?: SessionInstitutionExtras,
  ) => void;
  /** r178: sync the institution context from an authoritative payload
   *  (GET /auth/me) WITHOUT touching the user/token pair — the me read
   *  carries no access token, but it is the freshest truth about
   *  memberships and the current context (revocations, suspensions and
   *  new memberships land there before any refresh). The same
   *  honest-defaults rule as setSession: a payload without context
   *  fields resets the context (the chip must never outlive its
   *  evidence). */
  applySessionExtras: (extras: SessionInstitutionExtras) => void;
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
        memberships: [],
        currentInstitution: null,
        membershipRole: null,
        isHydrated: false,
        setSession: (user, accessToken, extras) =>
          set({
            user,
            accessToken,
            memberships: extras?.memberships ?? [],
            currentInstitution: extras?.currentInstitution ?? null,
            membershipRole: extras?.membershipRole ?? null,
          }),
        applySessionExtras: (extras) =>
          set({
            memberships: extras.memberships,
            currentInstitution: extras.currentInstitution,
            membershipRole: extras.membershipRole,
          }),
        setAccessToken: (accessToken) => set({ accessToken }),
        clear: () =>
          set({
            user: null,
            accessToken: null,
            memberships: [],
            currentInstitution: null,
            membershipRole: null,
          }),
        setHydrated: () => set({ isHydrated: true }),
      };
    },
    {
      name: 'mdrk-auth',
      storage: safeSessionStorage(),
      // r178: version 0 payloads ({user, accessToken}) pre-date the
      // institution context fields. The migrate folds them into the new
      // defaults — memberships: [], currentInstitution: null,
      // membershipRole: null — which is exactly what the server would
      // resolve for a re-minted token, so the next refresh re-establishes
      // context instead of the chip rendering a fabricated selection.
      version: 1,
      migrate: (persisted) => {
        const old = (persisted ?? {}) as Partial<PersistedSession>;
        return {
          user: old.user ?? null,
          accessToken: old.accessToken ?? null,
          memberships: old.memberships ?? [],
          currentInstitution: old.currentInstitution ?? null,
          membershipRole: old.membershipRole ?? null,
        } satisfies PersistedSession;
      },
      partialize: (s) => ({
        user: s.user,
        accessToken: s.accessToken,
        memberships: s.memberships,
        currentInstitution: s.currentInstitution,
        membershipRole: s.membershipRole,
      }),
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

/* r179 (phase-5): the react-query institution-scope selector — the
 * stable key segment every institution-dependent resource query
 * appends (hooks/resources/*). Reading currentInstitution.id from the
 * store means an institution switch (useSelectInstitution) changes the
 * segment, so those queries RE-KEY and fetch under the new context
 * without rendering the previous institution's cached rows first.
 * (The switch-time invalidateQueries sweep in useAuth stays as a
 * complement — it refreshes what is mounted; the key change
 * guarantees the refetched data lands in a NEW cache entry.)
 *
 * null = no institution context (platform OWNER, or a
 * multi-membership session awaiting selection) — also a stable
 * segment: a contextless institution-scoped query 403s fail-closed
 * server-side (INSTITUTION_CONTEXT_REQUIRED) and the shell routes to
 * selection, so nothing stale renders either way. */
export function useInstitutionScope(): string | null {
  return useAuthStore((s) => (s.currentInstitution ? s.currentInstitution.id : null));
}
