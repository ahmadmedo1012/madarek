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
  isRemoteConfigDisabled,
  FALLBACK_ORIGINS,
  __resetForTests,
} from "./remote-config";

const setItem = jest.spyOn(AsyncStorage, "setItem").mockResolvedValue(undefined);
const getItem = jest.spyOn(AsyncStorage, "getItem").mockResolvedValue(null);

/* ── R352 R1 — the hermetic pin ────────────────────────────────────────
 * Run 43596707814: the live config asset steered the CI emulator's app
 * to production, and the hermetic smoke logged in against Vercel while
 * its own backend sat idle. The pin law: a baked NON-production base
 * (or EXPO_PUBLIC_DISABLE_REMOTE_CONFIG) freezes the origin list. */
describe("R352 R1 — the hermetic pin", () => {
  const ORIGINAL_BASE = process.env.EXPO_PUBLIC_API_BASE_URL;
  const ORIGINAL_DISABLE = process.env.EXPO_PUBLIC_DISABLE_REMOTE_CONFIG;

  afterEach(() => {
    if (ORIGINAL_BASE === undefined) delete process.env.EXPO_PUBLIC_API_BASE_URL;
    else process.env.EXPO_PUBLIC_API_BASE_URL = ORIGINAL_BASE;
    if (ORIGINAL_DISABLE === undefined) delete process.env.EXPO_PUBLIC_DISABLE_REMOTE_CONFIG;
    else process.env.EXPO_PUBLIC_DISABLE_REMOTE_CONFIG = ORIGINAL_DISABLE;
    jest.resetModules();
    __resetForTests();
  });

  function freshModule() {
    // Re-import so the module-scope BAKED_API_BASE picks up the env.
    let mod: typeof import("./remote-config");
    jest.isolateModules(() => {
      mod = require("./remote-config");
    });
    return mod!;
  }

  it("pins a hermetic baked base (10.0.2.2) and never consults the wire or cache", async () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = "http://10.0.2.2:4000/api/v1";
    const mod = freshModule();
    expect(mod.isRemoteConfigDisabled()).toBe(true);
    expect(mod.getActiveOrigin()).toBe("http://10.0.2.2:4000");
    const fetchMock = jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ apiOrigins: ["https://madarek-nine.vercel.app"] }), { status: 200 }),
    );
    getItem.mockResolvedValueOnce(JSON.stringify({ apiOrigins: ["https://cached.example"] }));
    const loaded = await mod.loadRemoteConfig();
    expect(loaded.apiOrigins).toEqual(["http://10.0.2.2:4000"]);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(getItem).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  it("EXPO_PUBLIC_DISABLE_REMOTE_CONFIG pins even a production-shaped baked base", async () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = "https://madarek-nine.vercel.app/api/v1";
    process.env.EXPO_PUBLIC_DISABLE_REMOTE_CONFIG = "1";
    const mod = freshModule();
    expect(mod.isRemoteConfigDisabled()).toBe(true);
    const fetchMock = jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ apiOrigins: ["https://elsewhere.example"] }), { status: 200 }),
    );
    const loaded = await mod.loadRemoteConfig();
    expect(loaded.apiOrigins).toEqual(["https://madarek-nine.vercel.app"]);
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  it("a localhost baked base is pinned too (the iOS simulator smoke)", () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = "http://localhost:4000/api/v1";
    const mod = freshModule();
    expect(mod.isRemoteConfigDisabled()).toBe(true);
    expect(mod.getApiOrigins()).toEqual(["http://localhost:4000"]);
  });

  it("a production baked base KEEPS the remote config enabled", () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = "https://madarek-nine.vercel.app/api/v1";
    const mod = freshModule();
    expect(mod.isRemoteConfigDisabled()).toBe(false);
    expect(mod.getApiOrigins()).toEqual([...FALLBACK_ORIGINS]);
  });
});

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
