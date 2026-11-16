/**
 * r357 L5 — the cross-instance provider-health verdict
 * (lib/ai/provider-health.ts), pinned against a fake telemetry store.
 *
 * The failing-before witness: this module did not exist — the tick had
 * NO all-providers-down detection, /status carried no verdict, and no
 * issue could ever open.
 */
import { describe, expect, it } from 'vitest';
import {
  assessProviderHealth,
  raiseAllProvidersDownAlertIfDown,
  DOWN_THRESHOLD_MS,
  HEALTH_WINDOW_MS,
  type HealthTelemetryStore,
} from '../../src/lib/ai/provider-health.js';

const NOW = new Date('2026-11-16T14:00:00Z');

function fakeStore(rows: { provider: string | null; success: boolean; at: Date }[]): HealthTelemetryStore {
  return {
    aiTelemetry: {
      async findMany() {
        return rows.map((r) => ({ provider: r.provider, success: r.success, createdAt: r.at }));
      },
    },
  };
}

describe('assessProviderHealth (the cross-instance verdict)', () => {
  it('zero real-provider rows = vacuously healthy (a quiet platform is not a down platform)', async () => {
    const v = await assessProviderHealth(fakeStore([]), NOW);
    expect(v).toEqual({ allDown: false, downSince: null, providersFailed: [], rows: 0 });
  });

  it('a success anywhere in the window = healthy', async () => {
    const v = await assessProviderHealth(
      fakeStore([
        { provider: 'gemini', success: false, at: new Date(NOW.getTime() - 60_000) },
        { provider: 'groq', success: true, at: new Date(NOW.getTime() - 120_000) },
      ]),
      NOW,
    );
    expect(v.allDown).toBe(false);
  });

  it('failures younger than the 5-min threshold are NOT down yet (downSince stays null)', async () => {
    const v = await assessProviderHealth(
      fakeStore([{ provider: 'gemini', success: false, at: new Date(NOW.getTime() - 3 * 60_000) }]),
      NOW,
    );
    expect(v.allDown).toBe(false);
    expect(v.downSince).toBeNull();
  });

  it('failures-only ≥ 5 min = DOWN, with the oldest failure as downSince and the provider list', async () => {
    const v = await assessProviderHealth(
      fakeStore([
        { provider: 'gemini', success: false, at: new Date(NOW.getTime() - 6 * 60_000) },
        { provider: 'groq', success: false, at: new Date(NOW.getTime() - 5 * 60_000) },
        { provider: 'gemini', success: false, at: new Date(NOW.getTime() - 30_000) },
      ]),
      NOW,
    );
    expect(v.allDown).toBe(true);
    expect(v.downSince?.toISOString()).toBe(new Date(NOW.getTime() - 6 * 60_000).toISOString());
    expect(v.providersFailed.sort()).toEqual(['gemini', 'groq']);
  });

  it('local-composer rows prove nothing about providers (excluded from the verdict)', async () => {
    const v = await assessProviderHealth(
      fakeStore([
        { provider: 'local', success: true, at: new Date(NOW.getTime() - 60_000) },
        { provider: 'local', success: true, at: new Date(NOW.getTime() - 30_000) },
      ]),
      NOW,
    );
    expect(v).toEqual({ allDown: false, downSince: null, providersFailed: [], rows: 0 });
  });

  it('the constants: a 15-min window, a 5-min down threshold (the brief\'s > 5 min)', () => {
    expect(HEALTH_WINDOW_MS).toBe(15 * 60_000);
    expect(DOWN_THRESHOLD_MS).toBe(5 * 60_000);
  });
});

describe('raiseAllProvidersDownAlertIfDown (the tick guard)', () => {
  it('DOWN → raises the throttled AI_ALL_PROVIDERS_DOWN alert with evidence metadata', async () => {
    const raised: unknown[] = [];
    const v = await raiseAllProvidersDownAlertIfDown(
      fakeStore([{ provider: 'gemini', success: false, at: new Date(NOW.getTime() - 7 * 60_000) }]),
      async (input) => {
        raised.push(input);
      },
      NOW,
    );
    expect(v.allDown).toBe(true);
    expect(raised).toHaveLength(1);
    expect(raised[0]).toMatchObject({ severity: 'critical', code: 'AI_ALL_PROVIDERS_DOWN' });
  });

  it('healthy → no alert; a store outage → fails open, never throws', async () => {
    const raised: unknown[] = [];
    const v1 = await raiseAllProvidersDownAlertIfDown(
      fakeStore([{ provider: 'groq', success: true, at: new Date(NOW.getTime() - 60_000) }]),
      async (input) => {
        raised.push(input);
      },
      NOW,
    );
    expect(v1.allDown).toBe(false);
    expect(raised).toHaveLength(0);
    const broken: HealthTelemetryStore = {
      aiTelemetry: {
        async findMany() {
          throw new Error('db down');
        },
      },
    };
    const v2 = await raiseAllProvidersDownAlertIfDown(broken, async (input) => {
      raised.push(input);
    }, NOW);
    expect(v2.allDown).toBe(false); // failed open — the tick law
    expect(raised).toHaveLength(0);
  });
});
