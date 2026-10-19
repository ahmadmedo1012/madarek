/**
 * r165g — owner-console truthfulness pins (two verified defects).
 *
 * [P1] Feature-flags/settings toggles have ZERO runtime effect while
 * the surfaces promised immediate application. Repo-wide, the ONLY
 * readers of FeatureFlag/PlatformSetting are the owner console's own
 * GET/PUT — no route, middleware, or scheduler gates on either table
 * and no flag keys are seeded. The chosen fix is COPY-ONLY (the lead's
 * sanctioned complete-honest path when the console's keys don't map):
 *   1. OwnerContentPage's «ميزات المنصّة» card no longer claims
 *      «التغييرات تُطبَّق فوراً على جميع المستخدمين».
 *   2. OwnerSystemPage's flags + settings cards carry the honest
 *      caveat: recorded + audited, consumed by nothing.
 *   3. OwnerAiPage's empty state no longer says AI is enabled «عبر
 *      أعلام الميزات وإعدادات المنصّة» and drops the /owner/system
 *      button that sold that story.
 *
 * [P2] «تنبيهات مفتوحة» on the alerts board read the TRUNCATED array
 * length (list capped at take:50). The backend now ships a meta block
 * with the REAL totals; these pins prove the KPI strip reads the meta
 * fields, not alerts.length — and degrades to the visible rows (the
 * previous behavior) when an older payload carries no meta.
 *
 * Harness: the OwnerPages-6A10-pins / r164i pattern — lib/api mocked
 * (page-level queries read res.data, unwrap'd hooks read
 * res.data.data), a real QueryClient, MemoryRouter. OwnerAiPage's
 * empty-state test needs no chart stub (no Bar/Line renders when
 * byFeature is empty).
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { OwnerContentPage } from '../../src/pages/owner/OwnerContentPage';
import { OwnerSystemPage } from '../../src/pages/owner/OwnerSystemPage';
import { OwnerAiPage } from '../../src/pages/owner/OwnerAiPage';
import { OwnerAlertsPage } from '../../src/pages/owner/OwnerAlertsPage';

const { BODIES } = vi.hoisted(() => ({
  // url → the RESPONSE BODY (what axios puts in res.data).
  BODIES: {} as Record<string, unknown>,
}));

vi.mock('../../src/lib/api', () => ({
  api: {
    get: (url: string) => {
      const body = BODIES[url];
      if (body === undefined) return Promise.reject(new Error(`unexpected GET ${url}`));
      // axios response shape: { data: body }. The r165g alerts feed
      // query reads res.data (the whole body incl. meta); every
      // unwrap'd hook reads res.data.data.
      return Promise.resolve({ data: body });
    },
  },
  unwrap: (p: Promise<{ data: { data: unknown } }>) => p.then((r) => r.data.data),
}));

/* ── Shared fixtures ─────────────────────────────────────────── */

const SYSTEM_BASE = {
  sync: { lastRunAt: null, recent: [] },
  alerts: { open: [], openCount: 0, criticalCount: 0 },
  activity: { recentEventsLast7Days: 0 },
  storage: { driver: 's3', persistent: true },
};

const FLAGS_TWO = [
  {
    id: 'f1', slug: 'live-broadcast', name: 'البثّ المباشر',
    description: 'تمكين البثّ المباشر للمحاضرات', enabled: true,
    category: 'features', updatedAt: '2026-01-01T00:00:00.000Z', updatedBy: null,
  },
  {
    id: 'f2', slug: 'practice-labs', name: 'المعامل الافتراضيّة',
    description: null, enabled: false,
    category: 'features', updatedAt: '2026-01-02T00:00:00.000Z', updatedBy: null,
  },
];

const SETTINGS_ONE = [
  {
    id: 's1', key: 'semester.label', value: 'الفصل الخريفيّ 2026',
    category: 'general', updatedAt: '2026-01-01T00:00:00.000Z', updatedBy: null,
  },
];

const AI_METRICS_EMPTY = {
  totalRequests: 0, totalTokens: 0, successRate: 0, avgLatencyMs: 0,
  byFeature: [], trend: [],
};

const ALERTS_TWO_ROWS = [
  {
    id: 'a1', severity: 'critical', category: 'db',
    title: 'فشل الاتصال بقاعدة البيانات', message: 'connection timeout',
    metadata: null, resolvedAt: null, resolvedBy: null,
    createdAt: '2026-09-26T08:00:00.000Z',
  },
  {
    id: 'a2', severity: 'warning', category: 'http',
    title: 'بطء في الاستجابة', message: 'p95 above threshold',
    metadata: null, resolvedAt: null, resolvedBy: null,
    createdAt: '2026-09-26T09:00:00.000Z',
  },
];

function resetFixtures() {
  for (const k of Object.keys(BODIES)) delete BODIES[k];
  BODIES['/owner/system'] = { data: { ...SYSTEM_BASE } };
  BODIES['/owner/feature-flags'] = { data: [...FLAGS_TWO] };
  BODIES['/owner/settings'] = { data: [...SETTINGS_ONE] };
  BODIES['/owner/ai-metrics'] = { data: { ...AI_METRICS_EMPTY } };
  BODIES['/ai/config'] = { data: { provider: 'local', model: null } };
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
   [P1] — the flags/settings copy stops promising runtime effect
   ════════════════════════════════════════════════════════════════ */

describe('OwnerContentPage — the flags card claim (r165g)', () => {
  it('no longer promises «تُطبَّق فوراً على جميع المستخدمين»', () => {
    renderPage(<OwnerContentPage />);
    expect(screen.queryByText(/تُطبَّق فوراً/)).toBeNull();
    // The whole owner-content surface carries no immediate-effect claim.
    expect(screen.queryByText(/فوراً/)).toBeNull();
  });

  it('says the honest thing instead: recorded + audited, no runtime consumer yet', () => {
    renderPage(<OwnerContentPage />);
    expect(screen.getByText(/تُسجَّل الحالة وتُوثَّق في سجلّ النشاط/)).toBeInTheDocument();
    expect(screen.getByText(/لا تستهلكها أيّ بوابة تشغيل بعد/)).toBeInTheDocument();
  });
});

describe('OwnerSystemPage — flags + settings honest caveats (r165g)', () => {
  it('the flags card states the toggles change the registry, not platform behavior', async () => {
    renderPage(<OwnerSystemPage />);
    await screen.findByText('البثّ المباشر');
    expect(
      screen.getByText(/تُحفَظ حالة كل علم في قاعدة البيانات وتُوثَّق في سجلّ النشاط/),
    ).toBeInTheDocument();
    expect(screen.getByText(/لا تستهلكها أيّ بوابة تشغيل بعد/)).toBeInTheDocument();
  });

  it('the settings editor carries the same caveat (saving writes the row, nothing consumes it)', async () => {
    renderPage(<OwnerSystemPage />);
    await screen.findByDisplayValue('الفصل الخريفيّ 2026');
    expect(
      screen.getByText(/تُحفَظ القيمة في قاعدة البيانات وتُوثَّق في سجلّ النشاط/),
    ).toBeInTheDocument();
    expect(screen.getByText(/لا يستهلكها مسار تشغيل بعد/)).toBeInTheDocument();
  });

  it('no immediate-effect claim anywhere on the page (toggles, editor, notes)', async () => {
    renderPage(<OwnerSystemPage />);
    await screen.findByText('البثّ المباشر');
    expect(screen.queryByText(/فوراً/)).toBeNull();
    // The editor's save button keeps its honest label (it DOES save).
    expect(screen.getByRole('button', { name: /حفظ الإعدادات/ })).toBeInTheDocument();
  });
});

describe('OwnerAiPage — the empty state stops selling flags (r165g)', () => {
  it('no longer says AI services are enabled «عبر أعلام الميزات وإعدادات المنصّة»', async () => {
    renderPage(<OwnerAiPage />);
    await screen.findByText('لا توجد طلبات لعرضها');
    expect(screen.queryByText(/تُفعَّل خدمات الذكاء الاصطناعيّ/)).toBeNull();
    // The false enabling claim is gone — the new copy MENTIONS the
    // flags registry only to say it is recorded and unconsumed.
    expect(screen.queryByText(/عبر أعلام الميزات وإعدادات المنصّة/)).toBeNull();
  });

  it('drops the «فتح إعدادات النظام» button that pointed at the flags story', async () => {
    renderPage(<OwnerAiPage />);
    await screen.findByText('لا توجد طلبات لعرضها');
    expect(screen.queryByRole('link', { name: /فتح إعدادات النظام/ })).toBeNull();
  });

  it('states the real truth: metrics arrive with the first request; availability is the server provider config', async () => {
    renderPage(<OwnerAiPage />);
    expect(await screen.findByText(/تظهر مؤشّرات الاستخدام هنا فور تسجيل أوّل طلب/)).toBeInTheDocument();
    expect(screen.getByText(/جهوزيّة خدمة الذكاء الاصطناعيّ تحدّدها إعدادات المزوّد على الخادم/)).toBeInTheDocument();
    // ...and flags/settings are recorded but unconsumed.
    expect(screen.getByText(/تُسجَّل ولا يستهلكها أيّ مسار تشغيل بعد/)).toBeInTheDocument();
  });
});

/* ════════════════════════════════════════════════════════════════
   [P2] — the alerts board KPI reads the REAL counts, not the
   truncated array length (list stays capped; counts become truthful)
   ════════════════════════════════════════════════════════════════ */

describe('OwnerAlertsPage — KPI reads meta, not the capped list (r165g)', () => {
  /** The numeric value of the KPI cell carrying the given label.
   * (R190 D4 re-pin: the KPI band is now the StatStrip — the value
   * rides .stat-value inside .stat-cell. Same product contract — the
   * label's counted figure — in the strip's anatomy; was
   * .metric > .metric-value on the icon-tile band.) */
  const tileValue = (label: string) =>
    screen.getByText(label).closest('.stat-cell')!.querySelector('.stat-value')!.textContent;

  it('«تنبيهات مفتوحة» shows the meta total (63), not the array length (2)', async () => {
    BODIES['/owner/alerts'] = {
      data: ALERTS_TWO_ROWS,
      meta: { total: 63, critical: 5, warning: 20 },
    };
    renderPage(<OwnerAlertsPage />);
    // The settled list (two cards) proves the fetch resolved — the KPI
    // strip renders while pending with '…'.
    await screen.findByText('فشل الاتصال بقاعدة البيانات');
    expect(screen.getByText('بطء في الاستجابة')).toBeInTheDocument();

    expect(tileValue('تنبيهات مفتوحة')).toBe('63');
    // The same truth for the severity tiles — server counts, not the
    // two visible rows (array-derived would read 1 / 1).
    expect(tileValue('تنبيهات حرجة')).toBe('5');
    expect(tileValue('تحذيرات')).toBe('20');
  });

  it('the capped list itself is unchanged — only the counts became truthful', async () => {
    BODIES['/owner/alerts'] = {
      data: ALERTS_TWO_ROWS,
      meta: { total: 63, critical: 5, warning: 20 },
    };
    renderPage(<OwnerAlertsPage />);
    expect(await screen.findAllByRole('button', { name: /حلّ التنبيه/ })).toHaveLength(2);
  });

  it('degrades to the visible rows for an OLD payload (no meta block) — no crash, no guess', async () => {
    BODIES['/owner/alerts'] = { data: ALERTS_TWO_ROWS };
    renderPage(<OwnerAlertsPage />);
    await screen.findByText('فشل الاتصال بقاعدة البيانات');
    expect(tileValue('تنبيهات مفتوحة')).toBe('2');
    expect(tileValue('تنبيهات حرجة')).toBe('1');
    expect(tileValue('تحذيرات')).toBe('1');
  });
});
