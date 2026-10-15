/**
 * Backend unit test — r167 (WS-1): StorageReachabilityCache, the memo
 * that finally wires probeStorage into /owner/system truthfully.
 *
 * The r166d deferral (storage.ts wiring note) was explicit: folding the
 * probe into the route would put a network call — worst case the S3
 * driver's 30s read timeout — inside the page's latency contract. The
 * cache buys that contract back with two guarantees, each pinned here:
 *
 *   1. NEVER blocks long: fresh memo → zero IO; stale memo → instant
 *      answer while ONE refresh flight runs (stale-while-revalidate);
 *      only the first-ever reader may wait, and only up to raceMs.
 *   2. NEVER rejects: a crashing probe folds into reachable:false (or
 *      null before any answer exists) — the route can await bare.
 *
 * DB-free, network-free AND timer-free (the repo canon): the probe, the
 * clock and the race sleep are all injected — tests resolve deferreds
 * by hand so there are no real waits and no fake-timer scheduling.
 */
import { describe, expect, it, vi } from 'vitest';
import {
  STORAGE_PROBE_RACE_MS,
  STORAGE_PROBE_TTL_MS,
  StorageReachabilityCache,
  getStorageReachability,
  type StorageProbe,
} from '../../src/lib/storage.js';

/** A hand-resolved promise — the test decides when "the network" lands. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Flush every pending microtask (the probe chain is ~3 hops deep). */
const flushMicrotasks = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** A promise that never settles — the race timeout that never fires. */
const never = () => new Promise<void>(() => {});

interface Harness {
  cache: StorageReachabilityCache;
  probe: ReturnType<typeof vi.fn<() => Promise<StorageProbe>>>;
  sleep: ReturnType<typeof vi.fn<(ms: number) => Promise<void>>>;
  advance: (ms: number) => void;
}

/** Cache + injected IO/clock/sleep at a fixed, controlled epoch. */
function makeHarness(opts: { ttlMs?: number; raceMs?: number } = {}): Harness {
  let clock = 1_700_000_000_000; // a fixed, deterministic epoch ms
  const probe = vi.fn<() => Promise<StorageProbe>>();
  const sleep = vi.fn<(ms: number) => Promise<void>>();
  const cache = new StorageReachabilityCache({
    probe,
    now: () => clock,
    sleep,
    ttlMs: opts.ttlMs ?? 60_000,
    raceMs: opts.raceMs ?? 2_500,
  });
  return { cache, probe, sleep, advance: (ms) => { clock += ms; } };
}

// ─── The TTL memo ─────────────────────────────────────────────────

describe('StorageReachabilityCache — TTL memoization (no store hammering)', () => {
  it('within the TTL a second read serves the memo with ZERO probe calls', async () => {
    const { cache, probe, sleep, advance } = makeHarness();
    const flight = deferred<StorageProbe>();
    const timeout = deferred<void>();
    probe.mockReturnValue(flight.promise);
    sleep.mockReturnValue(timeout.promise);

    const first = cache.get();
    flight.resolve({ ok: true }); // the probe wins the race
    await expect(first).resolves.toEqual({
      reachable: true,
      checkedAt: new Date(1_700_000_000_000).toISOString(),
    });

    advance(30_000); // < TTL
    const second = await cache.get();
    expect(second).toEqual({ reachable: true, checkedAt: new Date(1_700_000_000_000).toISOString() });
    expect(probe).toHaveBeenCalledTimes(1); // the memo answered, not the store
    expect(sleep).toHaveBeenCalledTimes(1); // only the first read ever raced
    timeout.resolve(); // release the dangling race timeout
  });

  it('the exported defaults are the documented 60s TTL / 2.5s race', () => {
    expect(STORAGE_PROBE_TTL_MS).toBe(60_000);
    expect(STORAGE_PROBE_RACE_MS).toBe(2_500);
  });

  it('after the TTL the stale answer still serves INSTANTLY while one refresh flight runs (stale-while-revalidate)', async () => {
    const { cache, probe, sleep, advance } = makeHarness();
    // Seed a fresh answer first.
    let flight = deferred<StorageProbe>();
    probe.mockReturnValueOnce(flight.promise);
    sleep.mockReturnValue(never());
    const seed = cache.get();
    flight.resolve({ ok: true });
    await seed;

    // TTL expires; the refresh flight is SLOW (never lands here).
    advance(60_001);
    const refresh = deferred<StorageProbe>();
    probe.mockReturnValueOnce(refresh.promise);

    const stale = await cache.get(); // returns without awaiting anything
    expect(stale).toEqual({ reachable: true, checkedAt: new Date(1_700_000_000_000).toISOString() });
    expect(probe).toHaveBeenCalledTimes(2); // the refresh DID start
    expect(sleep).toHaveBeenCalledTimes(1); // and no NEW race was entered

    // The refresh lands later → the NEXT reader gets the fresh answer.
    advance(1_000);
    refresh.resolve({ ok: false });
    await flushMicrotasks();
    const fresh = await cache.get();
    expect(fresh).toEqual({
      reachable: false,
      checkedAt: new Date(1_700_000_061_001).toISOString(),
    });
    expect(probe).toHaveBeenCalledTimes(2); // still one refresh, no third
  });

  it('concurrent readers share the single in-flight probe (no probe storm)', async () => {
    const { cache, probe, sleep } = makeHarness();
    const flight = deferred<StorageProbe>();
    probe.mockReturnValue(flight.promise);
    sleep.mockReturnValue(never());

    const readers = [cache.get(), cache.get(), cache.get()];
    flight.resolve({ ok: true });
    const answers = await Promise.all(readers);
    for (const answer of answers) {
      expect(answer).toEqual({ reachable: true, checkedAt: new Date(1_700_000_000_000).toISOString() });
    }
    expect(probe).toHaveBeenCalledTimes(1);
  });
});

// ─── The race timeout (the route's latency contract) ──────────────

describe('StorageReachabilityCache — first-read race timeout', () => {
  it('a slow first probe loses the race: the reader gets null (honest unknown), the flight keeps running', async () => {
    const { cache, probe, sleep } = makeHarness();
    const flight = deferred<StorageProbe>();
    const timeout = deferred<void>();
    probe.mockReturnValue(flight.promise);
    sleep.mockReturnValue(timeout.promise);

    const first = cache.get();
    timeout.resolve(); // the 2.5s race fires before the store answered
    await expect(first).resolves.toBeNull(); // degraded, NOT blocked

    // The background flight lands later and memoizes for the next poll.
    flight.resolve({ ok: true });
    await flushMicrotasks();
    await expect(cache.get()).resolves.toEqual({
      reachable: true,
      checkedAt: new Date(1_700_000_000_000).toISOString(),
    });
  });

  it('a fast first probe WINS the race — the reader gets the real answer', async () => {
    const { cache, probe, sleep } = makeHarness();
    const flight = deferred<StorageProbe>();
    probe.mockReturnValue(flight.promise);
    sleep.mockReturnValue(never()); // timeout never fires

    const first = cache.get();
    flight.resolve({ ok: true });
    await expect(first).resolves.toEqual({
      reachable: true,
      checkedAt: new Date(1_700_000_000_000).toISOString(),
    });
  });

  it('checkedAt is the ISO stamp of the injected clock at completion time (not wall time)', async () => {
    const { cache, probe, sleep, advance } = makeHarness();
    const flight = deferred<StorageProbe>();
    probe.mockReturnValue(flight.promise);
    sleep.mockReturnValue(never());

    const pending = cache.get();
    advance(5_000); // the probe answered 5s after the read started
    flight.resolve({ ok: true });
    await expect(pending).resolves.toEqual({
      reachable: true,
      checkedAt: new Date(1_700_000_005_000).toISOString(),
    });
  });
});

// ─── Never throws into the route ──────────────────────────────────

describe('StorageReachabilityCache — never rejects', () => {
  it('a probe that REJECTS folds into reachable:false (the belt beyond probeStorage)', async () => {
    const { cache, probe, sleep } = makeHarness();
    probe.mockRejectedValue(new Error('boom'));
    sleep.mockReturnValue(never());

    await expect(cache.get()).resolves.toEqual({
      reachable: false,
      checkedAt: new Date(1_700_000_000_000).toISOString(),
    });
  });

  it('a probe that throws SYNCHRONOUSLY resolves null (get never rethrows)', async () => {
    const { cache, probe, sleep } = makeHarness();
    probe.mockImplementation(() => {
      throw new Error('sync boom');
    });
    sleep.mockReturnValue(never());

    await expect(cache.get()).resolves.toBeNull();
  });

  it('a rejected refresh flight still releases the slot — the next reader can retry', async () => {
    const { cache, probe, sleep, advance } = makeHarness();
    const T0 = 1_700_000_000_000;
    // Seed an answer first.
    const seedFlight = deferred<StorageProbe>();
    probe.mockReturnValueOnce(seedFlight.promise);
    sleep.mockReturnValueOnce(never());
    const seed = cache.get();
    seedFlight.resolve({ ok: true });
    await seed;

    // A refresh that CRASHES: the belt folds it into an answer and the
    // flight slot is released either way.
    advance(60_001);
    const crash = deferred<StorageProbe>();
    probe.mockReturnValueOnce(crash.promise);
    sleep.mockReturnValueOnce(never());
    const stale = cache.get(); // serves the stale answer instantly…
    crash.reject(new Error('refresh crash'));
    await expect(stale).resolves.toEqual({ reachable: true, checkedAt: new Date(T0).toISOString() });
    await flushMicrotasks(); // …while the crash folds into reachable:false

    // The slot is free: the next expired read starts a NEW flight and
    // (stale-while-revalidate) serves the crashed answer instantly…
    advance(60_001);
    const retry = deferred<StorageProbe>();
    probe.mockReturnValueOnce(retry.promise);
    sleep.mockReturnValueOnce(never());
    const third = cache.get();
    await expect(third).resolves.toEqual({
      reachable: false,
      checkedAt: new Date(T0 + 60_001).toISOString(),
    });

    // …whose refresh lands for the FOURTH reader.
    retry.resolve({ ok: true });
    await flushMicrotasks();
    await expect(cache.get()).resolves.toEqual({
      reachable: true,
      checkedAt: new Date(T0 + 120_002).toISOString(),
    });
    expect(probe).toHaveBeenCalledTimes(3);
  });
});

// ─── The production singleton's local short-circuit ───────────────

describe('getStorageReachability — the /owner/system wiring entry', () => {
  it('short-circuits to null for the LOCAL driver (no cache, no IO — env is local under NODE_ENV=test)', async () => {
    // Test env defaults STORAGE_DRIVER=local: the singleton must never
    // even build a cache. (The s3 path is exercised by the route-level
    // owner-system-storage tests with the module boundary mocked.)
    await expect(getStorageReachability()).resolves.toBeNull();
  });
});
