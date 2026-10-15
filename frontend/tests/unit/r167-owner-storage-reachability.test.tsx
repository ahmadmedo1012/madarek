/**
 * r167 (WS-1 storage truthfulness) — the OwnerSystemPage storage card
 * consumes the /owner/system reachability fields HONESTLY.
 *
 * The backend (r167) folds a memoized, race-bounded probeStorage answer
 * into `storage` (additive, s3-only): reachable:true / reachable:false /
 * fields absent (not verified yet). The card's durability claim is now
 * GATED on that answer — the r166d-era lie (s3 configured but the store
 * dead → green «دائمة») is closed on the surface too:
 *
 *   - s3 + reachable=true  → green «دائمة» + a connected note carrying
 *     WHEN the store last answered («آخر تحقّق: …»).
 *   - s3 + reachable=false → RED «مهيَّأ لكن يتعذّر الوصول الآن» + an alert
 *     naming the damage (new uploads fail) and the documented fix —
 *     never a green durability claim.
 *   - s3 + fields absent   → amber «لم يُتحقق بعد» (the honest unknown).
 *   - local                → the r164-i amber ephemeral warning, byte
 *     for byte unchanged (regression pin).
 *
 * Harness: the r164i pattern — lib/api mocked at the module boundary
 * with per-URL fixtures, a real QueryClient, MemoryRouter.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { OwnerSystemPage } from '../../src/pages/owner/OwnerSystemPage';

const { FIXTURES } = vi.hoisted(() => ({
  FIXTURES: {} as Record<string, unknown>,
}));

vi.mock('../../src/lib/api', () => ({
  api: {
    get: (url: string) => {
      const data = FIXTURES[url];
      if (data === undefined) return Promise.reject(new Error(`unexpected GET ${url}`));
      return Promise.resolve({ data: { data } });
    },
  },
  unwrap: (p: Promise<{ data: { data: unknown } }>) => p.then((r) => r.data.data),
}));

/* ── Shared fixtures ─────────────────────────────────────────── */

const SYSTEM_BASE = {
  sync: { lastRunAt: null, recent: [] },
  alerts: { open: [], openCount: 0, criticalCount: 0 },
  activity: { recentEventsLast7Days: 0 },
};

const CHECKED_AT = new Date(Date.now() - 60_000).toISOString();

function resetFixtures() {
  for (const k of Object.keys(FIXTURES)) delete FIXTURES[k];
  FIXTURES['/owner/system'] = { ...SYSTEM_BASE };
  FIXTURES['/owner/feature-flags'] = [];
  FIXTURES['/owner/settings'] = [];
}

function renderPage(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  resetFixtures();
});

/* ════════════════════════════════════════════════════════════════
   s3 + reachable:true — the verified-durable state
   ════════════════════════════════════════════════════════════════ */

describe('OwnerSystemPage — storage card, s3 + reachable:true', () => {
  it('green «دائمة» + the connected note carrying WHEN the store last answered', async () => {
    FIXTURES['/owner/system'] = {
      ...SYSTEM_BASE,
      storage: { driver: 's3', persistent: true, reachable: true, checkedAt: CHECKED_AT },
    };
    renderPage(<OwnerSystemPage />);

    expect(await screen.findByText('تخزين كائنات (S3-متوافق)')).toBeInTheDocument();
    expect(screen.getByText('دائمة')).toBeInTheDocument();
    // The note names the probe, not a permanent promise.
    expect(screen.getByText(/آخر تحقّق:/)).toBeInTheDocument();
    expect(screen.getByText(/المخزن متاح/)).toBeInTheDocument();
    // No warning rows of either family.
    expect(screen.queryByText(/لا تنجو من إعادة النشر/)).toBeNull();
    expect(screen.queryByText(/لا يستجيب/)).toBeNull();
  });

  it('the connected note degrades to «—» when checkedAt is absent (defensive read)', async () => {
    FIXTURES['/owner/system'] = {
      ...SYSTEM_BASE,
      storage: { driver: 's3', persistent: true, reachable: true },
    };
    renderPage(<OwnerSystemPage />);

    expect(await screen.findByText('دائمة')).toBeInTheDocument();
    expect(screen.getByText(/آخر تحقّق: —/)).toBeInTheDocument();
  });
});

/* ════════════════════════════════════════════════════════════════
   s3 + reachable:false — the honest outage state (the r166d lie closed)
   ════════════════════════════════════════════════════════════════ */

describe('OwnerSystemPage — storage card, s3 + reachable:false', () => {
  it('NEVER paints «دائمة»: red «مهيَّأ لكن يتعذّر الوصول الآن» + the outage alert with the documented fix', async () => {
    FIXTURES['/owner/system'] = {
      ...SYSTEM_BASE,
      storage: { driver: 's3', persistent: true, reachable: false, checkedAt: CHECKED_AT },
    };
    renderPage(<OwnerSystemPage />);

    expect(await screen.findByText('تخزين كائنات (S3-متوافق)')).toBeInTheDocument();
    // The durability row stops claiming durable.
    expect(screen.getByText('مهيَّأ لكن يتعذّر الوصول الآن')).toBeInTheDocument();
    expect(screen.queryByText('دائمة')).toBeNull();
    // The alert names the damage and the fix path.
    expect(
      screen.getByText('مخزن الكائنات لا يستجيب — الرفعات الجديدة ستفشل حتى يعود'),
    ).toBeInTheDocument();
    expect(screen.getByText(/S3_\*/)).toBeInTheDocument();
    expect(screen.getByText(/docs\/12-deployment\.md/)).toBeInTheDocument();
    // The LOCAL-driver warning family must NOT fire (persistent stays true).
    expect(screen.queryByText(/لا تنجو من إعادة النشر/)).toBeNull();
  });

  it('the red state paints the danger status ink (no raw colors — the .alert.red family)', async () => {
    FIXTURES['/owner/system'] = {
      ...SYSTEM_BASE,
      storage: { driver: 's3', persistent: true, reachable: false, checkedAt: CHECKED_AT },
    };
    renderPage(<OwnerSystemPage />);

    await screen.findByText('مهيَّأ لكن يتعذّر الوصول الآن');
    // The health row's dot is the red variant of the shared class.
    const dot = document.querySelector('.owner-health-dot.red');
    expect(dot).not.toBeNull();
  });
});

/* ════════════════════════════════════════════════════════════════
   s3 + fields absent — the honest unknown
   ════════════════════════════════════════════════════════════════ */

describe('OwnerSystemPage — storage card, s3 unverified (fields absent)', () => {
  it('amber «لم يُتحقق بعد» — never a guessed green «دائمة», never the outage alert', async () => {
    FIXTURES['/owner/system'] = {
      ...SYSTEM_BASE,
      storage: { driver: 's3', persistent: true },
    };
    renderPage(<OwnerSystemPage />);

    expect(await screen.findByText('تخزين كائنات (S3-متوافق)')).toBeInTheDocument();
    expect(screen.getByText('لم يُتحقق بعد')).toBeInTheDocument();
    expect(screen.queryByText('دائمة')).toBeNull();
    expect(screen.queryByText(/لا يستجيب/)).toBeNull();
    expect(screen.queryByText(/لا تنجو من إعادة النشر/)).toBeNull();
    // The amber unknown dot + the explaining note.
    expect(document.querySelector('.owner-health-dot.amber')).not.toBeNull();
    expect(screen.getByText(/تظهر الحالة هنا بعد أوّل فحص/)).toBeInTheDocument();
  });
});

/* ════════════════════════════════════════════════════════════════
   local — the r164-i treatment, unchanged (regression pin)
   ════════════════════════════════════════════════════════════════ */

describe('OwnerSystemPage — storage card, local (unchanged by r167)', () => {
  it('amber «لا تنجو من إعادة النشر» + the documented ephemeral-disk warning, no reachability rows', async () => {
    FIXTURES['/owner/system'] = {
      ...SYSTEM_BASE,
      storage: { driver: 'local', persistent: false },
    };
    renderPage(<OwnerSystemPage />);

    expect(await screen.findByText('محليّ — قرص الخادم')).toBeInTheDocument();
    expect(screen.getByText('لا تنجو من إعادة النشر')).toBeInTheDocument();
    expect(
      screen.getByText('الرفعات لا تنجو من إعادة النشر — يتطلب إعداد تخزين دائم (S3)'),
    ).toBeInTheDocument();
    // The r167 surfaces never appear for local.
    expect(screen.queryByText(/آخر تحقّق:/)).toBeNull();
    expect(screen.queryByText(/لم يُتحقق بعد/)).toBeNull();
    expect(screen.queryByText(/مهيَّأ لكن يتعذّر الوصول الآن/)).toBeNull();
  });
});
