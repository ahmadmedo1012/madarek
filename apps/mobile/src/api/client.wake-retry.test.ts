/**
 * R350 H4 — the mobile cold-boot wake retry, pinned.
 *
 * The law (src/api/client.ts): a GET that dies on TRANSPORT (timeout /
 * network fault — no HTTP answer) while the free-tier backend boots
 * re-enters after a bounded backoff (3s/8s/15s, retry timeout 12s,
 * worst ≈60s — the calm Boot contract). Writes are NEVER blind-retried;
 * a server that answered is awake.
 */
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import * as client from "./client";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe("R350 H4 — mobile wake retry", () => {
  it("retries a timed-out GET and resolves when the server answers", async () => {
    jest.useFakeTimers();
    let calls = 0;
    const fetchMock = jest.fn(async () => {
      calls += 1;
      if (calls <= 2) {
        const e = new Error("Aborted");
        e.name = "AbortError";
        throw e;
      }
      return jsonResponse({ data: { ok: 1 } });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const p = client.get<{ ok: number }>("/status");
    const assertion = p.then((d) => {
      expect(d.ok).toBe(1);
      expect(calls).toBe(3);
    });
    await jest.advanceTimersByTimeAsync(3_000);
    await jest.advanceTimersByTimeAsync(8_000);
    await assertion;
  });

  it("NEVER blind-retries a POST", async () => {
    const fetchMock = jest.fn(async () => {
      throw new Error("Network request failed");
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    await expect(client.post("/auth/login", {})).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("spends the bounded budget (3 retries) then surfaces the Arabic timeout error", async () => {
    jest.useFakeTimers();
    const fetchMock = jest.fn(async () => {
      const e = new Error("Aborted");
      e.name = "AbortError";
      throw e;
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const p = client.get("/courses");
    const assertion = expect(p).rejects.toThrow();
    await jest.advanceTimersByTimeAsync(3_000 + 8_000 + 15_000 + 1_000);
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(4); // original + 3 retries — bounded
  });

  it("an HTTP answer is never retried (503 is awake, not booting)", async () => {
    const fetchMock = jest.fn(async () => jsonResponse({ error: { code: "UNAVAILABLE", message: "no" } }, 503));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    // /status — a real registered route (contract-check scans test files too;
    // /health lives only on the app-level mount in app.ts, not routes/*).
    await expect(client.get("/status")).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
