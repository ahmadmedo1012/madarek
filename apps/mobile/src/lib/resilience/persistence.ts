/**
 * resilience/persistence — R334 B8: TanStack Query v5 cache persistence.
 *
 * WHY A LOCAL PERSISTER: `@tanstack/query-async-storage-persister` /
 * `query-persist-client-core` are NOT installed deps (and this mission
 * adds none), so this module implements the SAME contract they publish —
 * `createAsyncStoragePersister()` + `persistQueryClient()` — on top of the
 * `dehydrate`/`hydrate` primitives that ship in @tanstack/react-query and
 * AsyncStorage. Types are structurally identical to the official packages:
 * if the lead ever adds them, this module swaps with zero call-site change.
 *
 * Honesty rules baked in:
 *   · maxAge 24h — older persisted caches are DELETED on restore (stale
 *     offline data would be a lie, not resilience).
 *   · buster — a persisted cache from another app/dehydration shape is
 *     discarded, never hydrated.
 *   · only SUCCESSFUL queries dehydrate (TanStack's default predicate).
 *
 * THE LEAD WIRES THIS AT APP ROOT (Round 2 — app/_layout.tsx is outside
 * this branch's ownership):
 *
 *   const persisted = persistQueryClient({ queryClient, persister: queryCachePersister });
 *   // once on mount:
 *   await persisted.persistQueryClientRestore();
 *   // and keep the subscription for the session:
 *   // persisted.unsubscribe() on teardown (root never tears down).
 *
 * Screen guidance (courses / schedule / grades): persisted data is served
 * offline when queries carry a non-zero staleTime (see
 * docs/mobile/foundations/resilience.md).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { dehydrate, hydrate, type DehydratedState, type QueryClient } from "@tanstack/react-query";

/* ── contract types (mirrors @tanstack/query-persist-client-core) ────── */

/** AsyncStorage-shaped storage (AsyncStorage 2.x satisfies this exactly). */
export interface AsyncStorageLike {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/** The serialized client envelope persisted under `key`. */
export interface PersistedClient {
  buster: string;
  timestamp: number;
  clientState: DehydratedState;
}

/** The persister contract (drop-in for the official async-storage one). */
export interface Persister {
  persistClient(client: PersistedClient): Promise<void>;
  restoreClient(): Promise<PersistedClient | undefined>;
  removeClient(): Promise<void>;
}

/* ── createAsyncStoragePersister ─────────────────────────────────────── */

export interface AsyncStoragePersisterOptions {
  storage?: AsyncStorageLike;
  key?: string;
  /** Coalesces rapid saves (ms); the official default is 1000. */
  throttleTime?: number;
}

/**
 * AsyncStorage-backed persister. `persistClient` throttles writes (a
 * flurry of query events becomes one write), `restoreClient` parses (and
 * deletes corrupt payloads), `removeClient` clears the key.
 */
export function createAsyncStoragePersister(
  options: AsyncStoragePersisterOptions = {},
): Persister {
  const storage: AsyncStorageLike = options.storage ?? AsyncStorage;
  const key = options.key ?? "madarek-mobile-query-cache";
  const throttleTime = options.throttleTime ?? 1000;

  let lastWrite = 0;
  let pending: PersistedClient | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const writeNow = async (): Promise<void> => {
    const client = pending;
    pending = null;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    lastWrite = Date.now();
    if (!client) return;
    try {
      await storage.setItem(key, JSON.stringify(client));
    } catch {
      // Storage failures must never take the app down (quota, transient
      // native errors) — the in-memory cache stays authoritative.
    }
  };

  return {
    async persistClient(client: PersistedClient): Promise<void> {
      pending = client;
      const since = Date.now() - lastWrite;
      if (since >= throttleTime) {
        await writeNow();
        return;
      }
      if (!timer) {
        timer = setTimeout(() => void writeNow(), throttleTime - since);
      }
    },
    async restoreClient(): Promise<PersistedClient | undefined> {
      let raw: string | null = null;
      try {
        raw = await storage.getItem(key);
      } catch {
        return undefined;
      }
      if (raw == null) return undefined;
      try {
        const parsed = JSON.parse(raw) as PersistedClient;
        if (
          !parsed ||
          typeof parsed !== "object" ||
          typeof parsed.buster !== "string" ||
          typeof parsed.timestamp !== "number" ||
          !parsed.clientState
        ) {
          await this.removeClient();
          return undefined;
        }
        return parsed;
      } catch {
        await this.removeClient();
        return undefined;
      }
    },
    async removeClient(): Promise<void> {
      pending = null;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      try {
        await storage.removeItem(key);
      } catch {
        // same policy as writes
      }
    },
  };
}

/* ── persistQueryClient ──────────────────────────────────────────────── */

export interface PersistQueryClientConfig {
  queryClient: QueryClient;
  /** Defaults to the module-level AsyncStorage persister. */
  persister?: Persister;
  /** Cache-shape version; mismatched persisted caches are discarded. */
  buster?: string;
  /** Discard persisted caches older than this (default 24h). */
  maxAge?: number;
}

export interface PersistQueryClientResult {
  /** Restore the persisted cache into the live client (validate first). */
  persistQueryClientRestore(): Promise<PersistedClient | undefined>;
  /** Force an immediate save (the subscription already throttles). */
  persistQueryClientSave(): Promise<void>;
  /** Stop the save subscription (root never calls this). */
  unsubscribe(): void;
}

/**
 * Wire persistence to a live QueryClient: restores once, then subscribes
 * to the query cache and saves (throttled) as data arrives. The helper
 * the lead mounts at the app root in Round 2.
 */
export function persistQueryClient(config: PersistQueryClientConfig): PersistQueryClientResult {
  const { queryClient, persister, buster = QUERY_CACHE_BUSTER, maxAge = QUERY_CACHE_MAX_AGE_MS } = config;
  const client = persister ?? queryCachePersister;

  const save = async (): Promise<void> => {
    await client.persistClient({
      buster,
      timestamp: Date.now(),
      clientState: dehydrate(queryClient),
    });
  };

  const restore = async (): Promise<PersistedClient | undefined> => {
    const persisted = await client.restoreClient();
    if (!persisted) return undefined;
    if (persisted.buster !== buster || Date.now() - persisted.timestamp > maxAge) {
      // foreign shape or older than maxAge — the cache is a lie by then.
      await client.removeClient();
      return undefined;
    }
    hydrate(queryClient, persisted.clientState);
    return persisted;
  };

  const unsubscribe = queryClient.getQueryCache().subscribe(() => {
    void save();
  });

  return { persistQueryClientRestore: restore, persistQueryClientSave: save, unsubscribe };
}

/* ── module-level defaults (the app-root wiring) ─────────────────────── */

/** Storage key for the persisted query cache. */
export const QUERY_CACHE_STORAGE_KEY = "madarek-mobile-query-cache";
/** Persisted cache lifetime — 24h (older caches are deleted on restore). */
export const QUERY_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
/**
 * Cache-shape version. Bump when the dehydrated shape or the persisted
 * key screens' data contract changes incompatibly.
 */
export const QUERY_CACHE_BUSTER = "r334-v1";

/** The preconfigured persister the lead passes at the app root. */
export const queryCachePersister: Persister = createAsyncStoragePersister({
  key: QUERY_CACHE_STORAGE_KEY,
  throttleTime: 1000,
});
