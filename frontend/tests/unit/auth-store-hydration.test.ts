/**
 * auth.store hydration tests (audit P2-13).
 *
 * The store is imported FRESH in every test (vi.resetModules + dynamic
 * import) so the persist middleware re-hydrates against whatever
 * localStorage state / environment we arrange for that test.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '../../src/stores/auth.store';

const USER_A: AuthUser = {
  id: 'u1',
  email: 'a@zu.edu.ly',
  firstName: 'أحمد',
  lastName: 'المبروك',
  role: 'STUDENT',
};

async function importAuthStore() {
  vi.resetModules();
  return import('../../src/stores/auth.store');
}

/** Zustand 5 rehydrates synchronously for sync storage, but flush a
 *  couple of microtasks so the assertion does not depend on that. */
async function flush() {
  await Promise.resolve();
  await Promise.resolve();
}

afterEach(() => {
  localStorage.clear();
});

describe('auth store hydration (P2-13)', () => {
  it('rehydrates a persisted session and marks hydration complete', async () => {
    localStorage.setItem(
      'mdrk-auth',
      JSON.stringify({ state: { user: USER_A, accessToken: 'tok-1' }, version: 0 }),
    );
    const { useAuthStore } = await importAuthStore();
    await flush();

    expect(useAuthStore.getState().isHydrated).toBe(true);
    expect(useAuthStore.getState().user?.id).toBe('u1');
    expect(useAuthStore.getState().accessToken).toBe('tok-1');
  });

  it('marks hydration complete when storage access throws (blocked webview)', async () => {
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('SecurityError: storage denied');
      },
    });
    try {
      const { useAuthStore } = await importAuthStore();
      await flush();

      // Old code: createJSONStorage got undefined → hydrate() early
      // returned → callback never fired → splash screen forever.
      expect(useAuthStore.getState().isHydrated).toBe(true);
      expect(useAuthStore.getState().user).toBeNull();

      // The in-memory fallback keeps the store fully usable.
      useAuthStore.getState().setSession(USER_A, 'tok-mem');
      expect(useAuthStore.getState().accessToken).toBe('tok-mem');
      useAuthStore.getState().clear();
      expect(useAuthStore.getState().user).toBeNull();
    } finally {
      if (original) Object.defineProperty(window, 'localStorage', original);
    }
  });

  it('marks hydration complete when the persisted payload is corrupted', async () => {
    localStorage.setItem('mdrk-auth', '{not-valid-json');
    const { useAuthStore } = await importAuthStore();
    await flush();

    // JSON.parse fails inside the storage adapter — the safe adapter
    // reports "nothing persisted" so the store boots on defaults AND
    // flips isHydrated. The old code left isHydrated false forever
    // (splash-screen hang).
    expect(useAuthStore.getState().isHydrated).toBe(true);
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it('falls back to in-memory storage when writes are blocked (quota 0)', async () => {
    // getItem works, setItem throws — the probe in resolveStringStorage
    // detects this and degrades to memory instead of throwing later
    // during session persistence.
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage');
    const mem = new Map<string, string>();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        get length() {
          return mem.size;
        },
        clear: () => mem.clear(),
        getItem: (k: string) => mem.get(k) ?? null,
        key: (i: number) => Array.from(mem.keys())[i] ?? null,
        removeItem: (k: string) => {
          mem.delete(k);
        },
        setItem: (k: string, v: string) => {
          throw new Error('QuotaExceededError');
        },
      },
    });
    try {
      const { useAuthStore } = await importAuthStore();
      await flush();

      expect(useAuthStore.getState().isHydrated).toBe(true);
      // Must not throw despite the poisoned setItem.
      useAuthStore.getState().setSession(USER_A, 'tok-q');
      expect(useAuthStore.getState().user?.id).toBe('u1');
    } finally {
      if (original) Object.defineProperty(window, 'localStorage', original);
    }
  });

  it('hydrates with defaults when nothing was persisted', async () => {
    const { useAuthStore } = await importAuthStore();
    await flush();

    expect(useAuthStore.getState().isHydrated).toBe(true);
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('still marks hydration complete if rehydration itself throws (deferred safety net)', async () => {
    const { useAuthStore } = await importAuthStore();
    await flush();
    expect(useAuthStore.getState().isHydrated).toBe(true);

    // Simulate an unexpected rehydration failure (bad custom storage):
    // the hardened onRehydrateStorage callback must still flip the flag.
    useAuthStore.setState({ isHydrated: false });
    useAuthStore.persist.setOptions({
      storage: {
        getItem: () => {
          throw new Error('storage exploded');
        },
        setItem: () => undefined,
        removeItem: () => undefined,
      },
    });
    useAuthStore.persist.rehydrate();
    await flush();

    expect(useAuthStore.getState().isHydrated).toBe(true);
  });
});
