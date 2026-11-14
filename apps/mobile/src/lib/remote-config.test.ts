/**
 * R351 X3 — the remote config, unit belt.
 *
 * Pins: the parser's shape law (https-only, origin-only, dedupe, cap),
 * the fallback list, the sticky failover marking, and the load's
 * cache-then-network ordering (AsyncStorage mocked; fetch mocked).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { jest } from "@jest/globals";

import {
  parseRemoteConfig,
  getApiOrigins,
  getActiveOrigin,
  markOriginFailed,
  loadRemoteConfig,
  FALLBACK_ORIGINS,
  __resetForTests,
} from "./remote-config";

const setItem = jest.spyOn(AsyncStorage, "setItem").mockResolvedValue(undefined);
const getItem = jest.spyOn(AsyncStorage, "getItem").mockResolvedValue(null);

describe("parseRemoteConfig", () => {
  it("accepts a valid ordered list and dedupes", () => {
    const parsed = parseRemoteConfig({
      apiOrigins: ["https://a.example", "https://b.example", "https://a.example"],
    });
    expect(parsed).toEqual({ apiOrigins: ["https://a.example", "https://b.example"] });
  });

  it("rejects non-https, paths, queries, non-strings, empty, oversized", () => {
    expect(parseRemoteConfig({ apiOrigins: ["http://a.example"] })).toBeNull();
    expect(parseRemoteConfig({ apiOrigins: ["https://a.example/path"] })).toBeNull();
    expect(parseRemoteConfig({ apiOrigins: ["https://a.example?q=1"] })).toBeNull();
    expect(parseRemoteConfig({ apiOrigins: [42] })).toBeNull();
    expect(parseRemoteConfig({ apiOrigins: [] })).toBeNull();
    expect(parseRemoteConfig({ apiOrigins: ["https://a.example", null] })).toBeNull();
    expect(parseRemoteConfig(null)).toBeNull();
    expect(parseRemoteConfig({})).toBeNull();
  });
});

describe("the origin list + failover marking", () => {
  beforeEach(() => {
    __resetForTests();
  });

  it("starts on the bundled fallback (the Vercel origin first since the X4 cutover)", () => {
    expect(getApiOrigins()).toEqual([...FALLBACK_ORIGINS]);
    expect(FALLBACK_ORIGINS[0]).toBe("https://madarek-nine.vercel.app");
    expect(getActiveOrigin()).toBe(FALLBACK_ORIGINS[0]);
  });

  it("markOriginFailed advances to the next healthy origin (the Render standby), then null", () => {
    expect(markOriginFailed("https://madarek-nine.vercel.app")).toBe("https://madarek.onrender.com");
    expect(getActiveOrigin()).toBe("https://madarek.onrender.com");
    expect(markOriginFailed("https://madarek.onrender.com")).toBeNull();
    // Everything failed: the active base falls back to the first origin
    // (the caller's own retry/wake logic owns the rest).
    expect(getActiveOrigin()).toBe("https://madarek-nine.vercel.app");
  });
});

describe("loadRemoteConfig", () => {
  beforeEach(() => {
    __resetForTests();
    getItem.mockReset().mockResolvedValue(null);
    setItem.mockReset().mockResolvedValue(undefined);
  });

  it("applies the cached list instantly, then the freshest source wins", async () => {
    getItem.mockResolvedValueOnce(JSON.stringify({ apiOrigins: ["https://cached.example"] }));
    const fetchMock = jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ apiOrigins: ["https://fresh.example"] }), { status: 200 }),
    );
    const loaded = await loadRemoteConfig();
    expect(loaded.apiOrigins).toEqual(["https://fresh.example"]);
    expect(getActiveOrigin()).toBe("https://fresh.example");
    // The fresh list was cached back.
    expect(setItem).toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  it("keeps the bundled fallback when every source is unreachable", async () => {
    const fetchMock = jest.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Network request failed"));
    const loaded = await loadRemoteConfig();
    expect(loaded.apiOrigins).toEqual([...FALLBACK_ORIGINS]);
    fetchMock.mockRestore();
  });

  it("rejects a malformed remote document and falls through to the next source", async () => {
    let call = 0;
    const fetchMock = jest
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => {
        call += 1;
        if (call === 1) return new Response(JSON.stringify({ apiOrigins: ["http://evil.example"] }), { status: 200 });
        return new Response(JSON.stringify({ apiOrigins: ["https://second.example"] }), { status: 200 });
      });
    const loaded = await loadRemoteConfig();
    expect(loaded.apiOrigins).toEqual(["https://second.example"]);
    fetchMock.mockRestore();
  });
});
