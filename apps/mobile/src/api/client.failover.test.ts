/**
 * R351 X3 — the mobile origin failover, pinned.
 *
 * The law (src/api/client.ts + src/lib/remote-config.ts): after the
 * wake budget, a transport-faulted GET (the origin never answered — a
 * dead origin, not a waking one) or a 502/503/504 (the proxy answered,
 * the app never processed it — any verb) switches ONCE to the next
 * healthy origin from the remote config. An answered refusal (4xx/5xx
 * from the app itself) never fails over.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as client from "./client";
import { __resetForTests, FALLBACK_ORIGINS } from "../lib/remote-config";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const realFetch = globalThis.fetch;

beforeEach(() => {
  __resetForTests();
});

afterEach(() => {
  globalThis.fetch = realFetch;
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe("R351 X3 — origin failover", () => {
  it("a transport-faulted GET exhausts the wake budget then switches origin and resolves", async () => {
    jest.useFakeTimers();
    let calls = 0;
    const fetchMock = jest.fn(async () => {
      calls += 1;
      // Origin #1 (Render) faults on transport for the whole wake budget.
      if (calls <= 4) throw new TypeError("Network request failed");
      // The failover retry lands on origin #2 and answers.
      return jsonResponse({ data: { ok: 2 } });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const p = client.get<{ ok: number }>("/status");
    const assertion = p.then((d) => {
      expect(d.ok).toBe(2);
      // 4 attempts on origin #1 (initial + 3 wake retries) + 1 on origin #2.
      expect(calls).toBe(5);
    });
    await jest.advanceTimersByTimeAsync(30_000);
    await assertion;
  });

  it("a 503 from the platform (any verb) fails over — the app never processed the request", async () => {
    let calls = 0;
    const urls: string[] = [];
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      calls += 1;
      urls.push(String(input));
      if (calls === 1) return jsonResponse({ error: { code: "UNAVAILABLE", message: "waking" } }, 503);
      return jsonResponse({ data: { done: true } });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const res = await client.post<{ done: boolean }>("/announcements", { title: "x" });
    expect(res.done).toBe(true);
    expect(urls[0]).toContain(FALLBACK_ORIGINS[0]);
    expect(urls[1]).toContain(FALLBACK_ORIGINS[1]);
  });

  it("an answered refusal (404 from the app) NEVER fails over", async () => {
    const fetchMock = jest.fn(async () => jsonResponse({ error: { code: "NOT_FOUND", message: "لا يوجد" } }, 404));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    await expect(client.get("/status")).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("one switch per request — the second failure surfaces honestly", async () => {
    jest.useFakeTimers();
    const fetchMock = jest.fn(async () => {
      throw new TypeError("Network request failed");
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const p = client.get("/status");
    const assertion = p.then(
      () => {
        throw new Error("should not resolve");
      },
      (err: { code?: string }) => {
        expect(err.code).toBe("NETWORK");
      },
    );
    await jest.advanceTimersByTimeAsync(90_000);
    await assertion;
    // 4 on origin #1 (the wake budget) + 1 on origin #2 (the switch
    // retry inherits the spent wake budget — the TOTAL window stays
    // bounded ≈40 s; never an infinite origin loop) — then the honest
    // NETWORK error.
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });
});
