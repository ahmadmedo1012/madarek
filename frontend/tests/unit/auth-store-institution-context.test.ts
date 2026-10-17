/**
 * r178 — auth.store institution session context tests.
 *
 * The persisted session shape was widened deliberately (D4 comment in
 * the store): memberships / currentInstitution / membershipRole now
 * ride alongside {user, accessToken}. These tests pin the three
 * contracts the shell depends on:
 *   1. setSession carries the extras into state (and persists them);
 *   2. setSession WITHOUT extras resets the context — a session
 *      payload that carries no context must never leave a stale
 *      institution chip rendering;
 *   3. the persist migrate folds a pre-r178 v0 payload
 *      ({user, accessToken} only) into the new honest defaults.
 *
 * Same fresh-import harness as auth-store-hydration.test.ts: the store
 * is re-imported per test so the persist middleware re-hydrates
 * against the localStorage we arrange.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AuthUser, MembershipInfo } from '../../src/stores/auth.store';

const USER_A: AuthUser = {
  id: 'u1',
  email: 'student@zu.edu.ly',
  firstName: 'طالب',
  lastName: 'تجريبي',
  role: 'STUDENT',
};

/** The seeded multi-institution demo state (Agent A's seed): a student
 *  member of BOTH zawia-showcase and alandalus-demo. */
const MEMBERSHIPS: MembershipInfo[] = [
  {
    institutionId: 'inst-zawia-showcase',
    name: 'جامعة الزاوية',
    nameEn: 'University of Zawia',
    slug: 'zawia-showcase',
    role: 'STUDENT',
    isActive: true,
  },
  {
    institutionId: 'inst-alandalus-demo',
    name: 'مؤسسة الأندلس التعليمية',
    nameEn: 'Al-Andalus Education Institute',
    slug: 'alandalus-demo',
    role: 'ADMIN',
    isActive: true,
  },
];

const ZAWIA = {
  id: 'inst-zawia-showcase',
  name: 'جامعة الزاوية',
  nameEn: 'University of Zawia',
  slug: 'zawia-showcase',
} as const;

async function importAuthStore() {
  vi.resetModules();
  return import('../../src/stores/auth.store');
}

/** Zustand 5 rehydrates synchronously for sync storage, but flush a
 *  couple of microtasks so assertions don't depend on that. */
async function flush() {
  await Promise.resolve();
  await Promise.resolve();
}

afterEach(() => {
  localStorage.clear();
});

describe('setSession institution context (r178)', () => {
  it('stores memberships + currentInstitution + membershipRole from the extras payload', async () => {
    const { useAuthStore } = await importAuthStore();
    await flush();

    useAuthStore.getState().setSession(USER_A, 'tok-ctx', {
      memberships: MEMBERSHIPS,
      currentInstitution: ZAWIA,
      membershipRole: 'STUDENT',
    });

    const state = useAuthStore.getState();
    expect(state.user?.id).toBe('u1');
    expect(state.accessToken).toBe('tok-ctx');
    expect(state.memberships).toHaveLength(2);
    expect(state.memberships[0]?.slug).toBe('zawia-showcase');
    expect(state.currentInstitution?.id).toBe('inst-zawia-showcase');
    expect(state.membershipRole).toBe('STUDENT');
  });

  it('omitting extras RESETS the context (a payload without context carries no context)', async () => {
    const { useAuthStore } = await importAuthStore();
    await flush();

    // First a contextual session (e.g. multi-membership user that
    // selected an institution)…
    useAuthStore.getState().setSession(USER_A, 'tok-ctx', {
      memberships: MEMBERSHIPS,
      currentInstitution: ZAWIA,
      membershipRole: 'STUDENT',
    });
    // …then a bare {user, token} re-set (a context-less payload).
    useAuthStore.getState().setSession(USER_A, 'tok-bare');

    const state = useAuthStore.getState();
    expect(state.memberships).toEqual([]);
    expect(state.currentInstitution).toBeNull();
    expect(state.membershipRole).toBeNull();
  });

  it('clear() wipes the institution context together with the session', async () => {
    const { useAuthStore } = await importAuthStore();
    await flush();

    useAuthStore.getState().setSession(USER_A, 'tok-ctx', {
      memberships: MEMBERSHIPS,
      currentInstitution: ZAWIA,
      membershipRole: 'STUDENT',
    });
    useAuthStore.getState().clear();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.memberships).toEqual([]);
    expect(state.currentInstitution).toBeNull();
    expect(state.membershipRole).toBeNull();
  });

  it('persists the context across a reload (a fresh module rehydrates it)', async () => {
    const first = await importAuthStore();
    await flush();
    first.useAuthStore.getState().setSession(USER_A, 'tok-ctx', {
      memberships: MEMBERSHIPS,
      currentInstitution: ZAWIA,
      membershipRole: 'STUDENT',
    });

    // Simulated reload: brand-new module graph, same localStorage.
    const reloaded = await importAuthStore();
    await flush();

    const state = reloaded.useAuthStore.getState();
    expect(state.isHydrated).toBe(true);
    expect(state.user?.id).toBe('u1');
    expect(state.accessToken).toBe('tok-ctx');
    expect(state.memberships).toHaveLength(2);
    expect(state.currentInstitution?.slug).toBe('zawia-showcase');
    expect(state.membershipRole).toBe('STUDENT');
  });
});

describe('persist migrate v0 → v1 (r178)', () => {
  it('folds a legacy {user, accessToken} payload into the new defaults', async () => {
    localStorage.setItem(
      'mdrk-auth',
      JSON.stringify({ state: { user: USER_A, accessToken: 'tok-0' }, version: 0 }),
    );
    const { useAuthStore } = await importAuthStore();
    await flush();

    const state = useAuthStore.getState();
    // The legacy session survives…
    expect(state.isHydrated).toBe(true);
    expect(state.user?.id).toBe('u1');
    expect(state.accessToken).toBe('tok-0');
    // …and the institution context resolves to the honest defaults —
    // no fabricated selection the token doesn't carry (the next
    // refresh re-resolves context server-side).
    expect(state.memberships).toEqual([]);
    expect(state.currentInstitution).toBeNull();
    expect(state.membershipRole).toBeNull();
  });

  it('rehydrates a v1 payload with context as-is (no migration path)', async () => {
    localStorage.setItem(
      'mdrk-auth',
      JSON.stringify({
        state: {
          user: USER_A,
          accessToken: 'tok-1',
          memberships: MEMBERSHIPS,
          currentInstitution: ZAWIA,
          membershipRole: 'STUDENT',
        },
        version: 1,
      }),
    );
    const { useAuthStore } = await importAuthStore();
    await flush();

    const state = useAuthStore.getState();
    expect(state.isHydrated).toBe(true);
    expect(state.memberships).toHaveLength(2);
    expect(state.currentInstitution?.slug).toBe('zawia-showcase');
    expect(state.membershipRole).toBe('STUDENT');
  });
});
