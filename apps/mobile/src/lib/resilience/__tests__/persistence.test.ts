/**
 * R334 B8 — persistence wiring tests: the local asyncStorage persister
 * (round-trip, corrupt payloads, throttle) and persistQueryClient
 * (save → restore → hydrate, maxAge expiry, buster mismatch).
 */
import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient } from "@tanstack/react-query";
import {
  QUERY_CACHE_BUSTER,
  createAsyncStoragePersister,
  persistQueryClient,
  type PersistedClient,
} from "../persistence";

/** Every client made by a test — cleared in afterEach so TanStack's
 * per-query gcTime timers (scheduled on `new Query`, i.e. every
 * setQueryData/hydrate) don't hold the Jest event loop open. */
const clients: QueryClient[] = [];
const newClient = () => {
  const c = new QueryClient();
  clients.push(c);
  return c;
};

afterEach(() => {
  clients.forEach((c) => c.clear());
  clients.length = 0;
});

const KEY = "test-query-cache";

beforeEach(async () => {
  await AsyncStorage.removeItem(KEY);
  await AsyncStorage.removeItem("madarek-mobile-query-cache");
});

describe("createAsyncStoragePersister", () => {
  it("round-trips a persisted client through AsyncStorage", async () => {
    const persister = createAsyncStoragePersister({ key: KEY, throttleTime: 0 });
    const client: PersistedClient = {
      buster: QUERY_CACHE_BUSTER,
      timestamp: Date.now(),
      clientState: { queries: [], mutations: [] } as never,
    };
    await persister.persistClient(client);
    const restored = await persister.restoreClient();
    expect(restored).toEqual(client);
  });

  it("deletes corrupt payloads instead of restoring them", async () => {
    const persister = createAsyncStoragePersister({ key: KEY, throttleTime: 0 });
    await AsyncStorage.setItem(KEY, "{not json");
    expect(await persister.restoreClient()).toBeUndefined();
    expect(await AsyncStorage.getItem(KEY)).toBeNull();

    await AsyncStorage.setItem(KEY, JSON.stringify({ no: "shape" }));
    expect(await persister.restoreClient()).toBeUndefined();
    expect(await AsyncStorage.getItem(KEY)).toBeNull();
  });

  it("removeClient clears the key and cancels pending writes", async () => {
    const persister = createAsyncStoragePersister({ key: KEY, throttleTime: 0 });
    await persister.persistClient({
      buster: "b",
      timestamp: 1,
      clientState: {} as never,
    });
    await persister.removeClient();
    expect(await AsyncStorage.getItem(KEY)).toBeNull();
  });
});

describe("persistQueryClient", () => {
  it("saves live cache data and restores it into a fresh client", async () => {
    const source = newClient();
    const persisted = persistQueryClient({
      queryClient: source,
      persister: createAsyncStoragePersister({ key: KEY, throttleTime: 0 }),
    });

    source.setQueryData(["courses"], [{ id: "c1", name: "مقدمة في الرياضيات" }]);
    await persisted.persistQueryClientSave();

    const fresh = newClient();
    const restore = persistQueryClient({
      queryClient: fresh,
      persister: createAsyncStoragePersister({ key: KEY, throttleTime: 0 }),
    });
    const restored = await restore.persistQueryClientRestore();
    expect(restored?.buster).toBe(QUERY_CACHE_BUSTER);
    expect(fresh.getQueryData(["courses"])).toEqual([
      { id: "c1", name: "مقدمة في الرياضيات" },
    ]);
    persisted.unsubscribe();
    restore.unsubscribe();
  });

  it("DISCARDS caches older than maxAge (24h honesty rule) and deletes them", async () => {
    const day = 24 * 60 * 60 * 1000;
    const persister = createAsyncStoragePersister({ key: KEY, throttleTime: 0 });
    await persister.persistClient({
      buster: QUERY_CACHE_BUSTER,
      timestamp: Date.now() - (day + 60_000), // 24h + 1min ago
      clientState: { queries: [], mutations: [] } as never,
    });

    const client = newClient();
    const wiring = persistQueryClient({ queryClient: client, persister });
    expect(await wiring.persistQueryClientRestore()).toBeUndefined();
    expect(await AsyncStorage.getItem(KEY)).toBeNull();
    wiring.unsubscribe();
  });

  it("DISCARDS caches persisted under a different buster", async () => {
    const persister = createAsyncStoragePersister({ key: KEY, throttleTime: 0 });
    await persister.persistClient({
      buster: "ancient-r330",
      timestamp: Date.now(),
      clientState: { queries: [], mutations: [] } as never,
    });
    const client = newClient();
    const wiring = persistQueryClient({ queryClient: client, persister });
    expect(await wiring.persistQueryClientRestore()).toBeUndefined();
    expect(await AsyncStorage.getItem(KEY)).toBeNull();
    wiring.unsubscribe();
  });

  it("the cache subscription saves as data arrives (throttled)", async () => {
    const client = newClient();
    const wiring = persistQueryClient({
      queryClient: client,
      persister: createAsyncStoragePersister({ key: KEY, throttleTime: 0 }),
    });
    client.setQueryData(["grades"], [{ id: "g1", score: 92 }]);
    // the subscription fires synchronously; the throttled write lands async
    await new Promise((r) => setTimeout(r, 10));
    const raw = await AsyncStorage.getItem(KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw as string) as PersistedClient;
    expect(parsed.buster).toBe(QUERY_CACHE_BUSTER);
    wiring.unsubscribe();
  });
});
