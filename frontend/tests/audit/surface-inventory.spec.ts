/**
 * surface-inventory.spec.ts — the inventory PRODUCER half of the audit
 * harness (the consumer halves — drift.ts / run-drift.ts / promote-baseline.ts —
 * already existed; this file was declared in
 * specs/012-design-graphics-uplift/contracts/audit-script.md but never
 * shipped, so every baseline run until now had nothing to read).
 *
 * What it does
 * ────────────
 * Sweeps every route in AUDIT_ROUTES × VIEWPORTS × THEMES × DIRS, waits
 * for network idle plus a settle delay, captures the budget metrics
 * defined in inventory-types.ts (illustrations incl. gzipped size,
 * overlays incl. resolved elevation + z-index, role/college accents,
 * motion treatments, computed colours + WCAG contrast, CLS, FCP,
 * transferred bytes) and writes tests/audit/surface-inventory.json in
 * exactly the SurfaceInventory shape consumed by run-drift.ts /
 * promote-baseline.ts.
 *
 * Why it cannot run here
 * ──────────────────────
 * ~90 % of the route table sits behind role guards, so the sweep needs
 * the Vite dev server (or a built preview) AND a seeded database with
 * fixture users for all five roles. It is therefore opt-in: the test
 * skips unless AUDIT_BASELINE=1, so `npx playwright test` / CI never
 * picks it up by accident.
 *
 * Local run (from frontend/)
 * ────────────────────────
 *   # 1. start the stack (DB seeded):
 *   #      backend  → npm run dev     (port 4000)
 *   #      frontend → npm run dev     (port 5173)
 *   # 2. export fixture credentials (any seeded users of each role):
 *   export AUDIT_BASELINE=1
 *   export AUDIT_STUDENT_EMAIL=…  AUDIT_STUDENT_PASSWORD=…
 *   export AUDIT_TEACHER_EMAIL=…  AUDIT_TEACHER_PASSWORD=…
 *   export AUDIT_ADMIN_EMAIL=…    AUDIT_ADMIN_PASSWORD=…
 *   export AUDIT_QUALITY_EMAIL=…  AUDIT_QUALITY_PASSWORD=…
 *   export AUDIT_OWNER_EMAIL=…    AUDIT_OWNER_PASSWORD=…
 *   # optional — concrete ids/slugs for :param routes (defaults: '1',
 *   # slug 'intro', filename 'sample.pdf'):
 *   export AUDIT_ROUTE_PARAMS='{"offeringId":"<cuid>","slug":"<track>"}'
 *   # optional — where the app/API live:
 *   export MADAREK_E2E_BASE_URL=http://localhost:5173
 *   export MADAREK_API_BASE_URL=http://localhost:4000/api/v1
 *   # 3. produce the inventory (~1–2 s per capture; 96 routes × 3
 *   #    viewports × 2 themes ≈ 576 captures → plan for ~30 min):
 *   npm run test:audit
 *   # 4. gate the result against the committed baseline:
 *   npm run test:audit:drift
 *   # 5. accept an intentional design change (through PR review):
 *   npm run audit:baseline
 *
 * DB-less capture (AUDIT_API_MOCK=1 — r164-k)
 * ───────────────────────────────────────
 * export AUDIT_BASELINE=1 AUDIT_API_MOCK=1
 * npm run audit:capture:mock
 *
 * The e2e mock transport (tests/e2e/fixtures/mock-transport.ts) is
 * installed on every sweep context, so the sweep runs against the
 * production build via vite preview with NO backend and NO database:
 * sessions come from the fixture users (one per guarded role), the
 * baselined student surfaces get the real fixture payloads (param
 * routes resolve to the transport's fixture IDs — see
 * MOCK_PARAM_DEFAULTS), and every unfixed endpoint answers 501
 * MOCK_NOT_IMPLEMENTED so unfixtured pages render their honest
 * error/empty states. r293 settles the protocol: the COMMITTED
 * baseline is captured this way, because the CI drift job
 * re-captures in this exact mode on every push — a baseline promoted
 * from any other environment (e.g. a seeded-DB capture, richer but
 * machine-bound) cannot reproduce on CI and trips the r291 coverage
 * floors, which is precisely how the r292 baseline failed. The
 * seeded-DB sweep above remains the deeper local exploration pass;
 * baseline promotion is mock-mode only. Optional knobs for this
 * mode:
 *   AUDIT_INVENTORY_OUT=<path>  write the JSON somewhere else (temp)
 *   AUDIT_ROUTE_LIMIT=<n>       sweep only the first n routes (smoke)
 *   AUDIT_ROUTES_FROM=<n>       skip the first n routes (slice sweeps)
 *
 * Notes / limitations (deliberate, documented in the audit contract):
 *   - One shared browser context per (role × theme); viewport is
 *     switched per capture via page.setViewportSize. Login happens
 *     exactly once per role through the real /auth/login API (or is
 *     fixture-seeded in AUDIT_API_MOCK mode) and the session is
 *     seeded into localStorage (mdrk-auth / madarek-theme).
 *   - Overlays are captured only when they are mounted in the DOM —
 *     most routes render none closed; the sweep does not interact to
 *     open them.
 *   - off-token colour sentinels are heuristic: sampled computed
 *     colours are compared against the hex/rgb literal corpus of
 *     src/styles/*.css. colour-mix() blends can still trip it — the
 *     drift report is reviewed by a human before promoting a baseline.
 */
import { test, expect, type Page, type Browser, type APIRequestContext } from '@playwright/test';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { installMockApi } from '../e2e/fixtures/mock-transport';
import {
  LECTURE_ID,
  OFFERING_ID,
  ROLE_USERS,
  type FixtureUser,
} from '../e2e/fixtures/api-fixtures';

import { AUDIT_ROUTES, BASELINE_ROUTES, DIRS, THEMES, VIEWPORTS } from './routes';
import type {
  ColorCapture,
  DirKey,
  IllustrationCapture,
  MotionCapture,
  OverlayCapture,
  OverlayKind,
  SurfaceCapture,
  SurfaceInventory,
  ThemeKey,
  ViewportKey,
} from './inventory-types';

const here = dirname(fileURLToPath(import.meta.url));

// Opt-in gate — evaluated at collection time, BEFORE the browser /
// webServer fixtures launch, so `npx playwright test` and CI only ever
// see a skipped test (no dev server, no executable requirement).
// Run it for real with AUDIT_BASELINE=1 — see the header comment.
test.skip(
  !process.env.AUDIT_BASELINE,
  'needs AUDIT_BASELINE=1 + running app + seeded DB (see file header)',
);

const APP_BASE_URL = process.env.MADAREK_E2E_BASE_URL ?? 'http://localhost:5173';
const API_BASE_URL = process.env.MADAREK_API_BASE_URL ?? 'http://localhost:4000/api/v1';

/** DB-less mode (see header): the e2e mock transport serves the app. */
const MOCK_API = !!process.env.AUDIT_API_MOCK;
/** Where the inventory lands; tests/audit/surface-inventory.json is
 * gitignored, and an explicit path lets a verification run write to a
 * temp location instead (r164-k deliverable). */
const INVENTORY_OUT = process.env.AUDIT_INVENTORY_OUT
  ? resolve(process.env.AUDIT_INVENTORY_OUT)
  : resolve(here, 'surface-inventory.json');
/** Cap the sweep to the first N routes (AUDIT_API_MOCK smoke runs). */
const ROUTE_LIMIT = process.env.AUDIT_ROUTE_LIMIT
  ? Math.max(1, Number.parseInt(process.env.AUDIT_ROUTE_LIMIT, 10) || 1)
  : null;
/** Skip the first N routes (pair with AUDIT_ROUTE_LIMIT to sweep a
 * middle slice — the sandboxed verification runs, which cannot host a
 * single ~30 min sweep, cover the matrix in consecutive slices). */
const ROUTES_FROM = process.env.AUDIT_ROUTES_FROM
  ? Math.max(0, Number.parseInt(process.env.AUDIT_ROUTES_FROM, 10) || 0)
  : 0;
/** Curated allow-list (r164 integration): comma-separated route
 * paths — when set, ONLY these routes sweep (in table order). Used
 * for the committed CI drift slice: routes whose surfaces the hermetic
 * fixtures render with real data. AUDIT_BASELINE_SLICE=1 selects the
 * committed BASELINE_ROUTES set (single source of truth in routes.ts).
 * Positional FROM/LIMIT slices keep working for full-sweep
 * verification runs. */
const ROUTES_ONLY = process.env.AUDIT_ROUTES_ONLY
  ? new Set(
      process.env.AUDIT_ROUTES_ONLY.split(',').map((r) => r.trim()).filter(Boolean),
    )
  : process.env.AUDIT_BASELINE_SLICE === '1'
    ? new Set<string>(BASELINE_ROUTES)
    : null;
/** Optional focused viewport list for complete route/role checks at a
 * shared desktop size. The normal inventory keeps its full responsive
 * matrix; this only narrows it when explicitly requested. */
const SWEEP_VIEWPORTS = process.env.AUDIT_VIEWPORTS
  ? process.env.AUDIT_VIEWPORTS.split(',')
      .map((value) => Number.parseInt(value.trim(), 10))
      .filter((value): value is (typeof VIEWPORTS)[number] =>
        VIEWPORTS.includes(value as (typeof VIEWPORTS)[number]),
      )
  : [...VIEWPORTS];
if (!SWEEP_VIEWPORTS.length) {
  throw new Error(
    `AUDIT_VIEWPORTS must include one of the supported widths: ${VIEWPORTS.join(', ')}`,
  );
}
const SWEEP_ROUTES = AUDIT_ROUTES.slice(
  ROUTES_FROM,
  ROUTES_FROM + (ROUTE_LIMIT ?? AUDIT_ROUTES.length - ROUTES_FROM),
).filter((r) => !ROUTES_ONLY || ROUTES_ONLY.has(r));

/** Extra settle time after networkidle (charts, skeletons → content). */
const SETTLE_MS = 400;
/** Max DOM elements scanned for motion treatments per capture. */
const MOTION_SCAN_LIMIT = 1500;
/** Max motion treatments recorded per capture. */
const MOTION_CAPTURE_LIMIT = 40;

/* ── :param resolution ─────────────────────────────────────────── */

const PARAM_DEFAULTS: Record<string, string> = {
  offeringId: '1',
  lectureId: '1',
  lessonId: '1',
  id: '1',
  slug: 'intro',
  filename: 'sample.pdf',
};

/* r293: mock-mode param defaults — the mock transport pins its
 * offering fixtures to literal fixture IDs (only /lectures/:id is
 * parametric), so :offeringId='1' answered 501 and the course-detail
 * route rendered its error state in every DB-less capture — the CI
 * drift job re-captures in mock mode, and the r291 coverage floors
 * correctly failed the r292 baseline (captured against the real
 * seeded DB, which could never reproduce in CI). With the fixture
 * IDs wired here, mock-mode sweeps land on pages the transport
 * actually serves — the same single source of truth the e2e
 * journeys use. An explicit AUDIT_ROUTE_PARAMS still wins (the
 * seeded-DB lead pass overrides per capture run). */
const MOCK_PARAM_DEFAULTS: Record<string, string> = {
  offeringId: OFFERING_ID,
  lectureId: LECTURE_ID,
};

const ROUTE_PARAMS: Record<string, string> = (() => {
  if (!process.env.AUDIT_ROUTE_PARAMS) return {};
  try {
    const parsed = JSON.parse(process.env.AUDIT_ROUTE_PARAMS) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed).filter(([, v]): v is string => typeof v === 'string'),
    );
  } catch {
    return {};
  }
})();

function resolveRoute(route: string): string {
  return route.replace(/:([a-zA-Z]+)/g, (_m, name: string) =>
    ROUTE_PARAMS[name] ??
      (MOCK_API ? MOCK_PARAM_DEFAULTS[name] : undefined) ??
      PARAM_DEFAULTS[name] ??
      '1',
  );
}

/* ── role routing ──────────────────────────────────────────────── */

type SweepRole = 'guest' | 'STUDENT' | 'TEACHER' | 'ADMIN' | 'QUALITY' | 'OWNER';

/** Guarding role for a route (App.tsx route map). Guest routes → null seeding. */
function roleForRoute(route: string): SweepRole {
  if (route.startsWith('/student/') || route.startsWith('/training') || route.startsWith('/achievements') || route.startsWith('/community')) return 'STUDENT';
  if (route.startsWith('/teacher/')) return 'TEACHER';
  if (route.startsWith('/admin/')) return 'ADMIN';
  if (route.startsWith('/quality/')) return 'QUALITY';
  if (route.startsWith('/owner/')) return 'OWNER';
  // Shared, any-authenticated surfaces — swept as STUDENT.
  if (route.startsWith('/vision') || route.startsWith('/document') || route.startsWith('/colleges') || route.startsWith('/competitions')) return 'STUDENT';
  return 'guest'; // '/', '/auth', '/auth/register', '/404'
}

interface Session {
  // The wire user shape — identical to the e2e fixture user (the real
  // login response carries the same fields; the cast below is the
  // trust boundary, as before).
  user: FixtureUser;
  accessToken: string;
}

async function login(request: APIRequestContext, role: Exclude<SweepRole, 'guest'>): Promise<Session> {
  const email = process.env[`AUDIT_${role}_EMAIL`];
  const password = process.env[`AUDIT_${role}_PASSWORD`];
  if (!email || !password) {
    throw new Error(
      `AUDIT_BASELINE run needs credentials for ${role}: export AUDIT_${role}_EMAIL / AUDIT_${role}_PASSWORD (see spec header).`,
    );
  }
  const res = await request.post(`${API_BASE_URL}/auth/login`, { data: { email, password } });
  if (!res.ok()) {
    throw new Error(`login failed for ${role} (${res.status()}): ${await res.text()}`);
  }
  const body = (await res.json()) as { data: Session };
  return body.data;
}

/* ── in-page collectors ─────────────────────────────────────────── */

/** Overlay primitive → DOM selector (components/overlays/*). */
const OVERLAY_SELECTORS: ReadonlyArray<[OverlayKind, string]> = [
  ['modal', '.modal-card'],
  ['sheet', '.sheet-panel'],
  ['popover', '.popover'],
  ['dropdown', '.dropdown'],
  ['toast', '[data-toast]'],
  ['tooltip', '.tooltip'],
  ['lightbox', '.lightbox-content'],
  ['commandPalette', '.cmd-palette-card'],
  ['notificationPanel', '.notification-panel'],
];

/**
 * Key text/surface samples per the audit contract ("header, sidebar
 * active, KPI tile, body text"). Selector names feed the drift
 * detector's numeric-KPI heuristic (metric-value → 7:1 budget).
 */
const COLOR_SAMPLES: ReadonlyArray<[string, string, boolean]> = [
  /* r291 (§10 repair): the selectors were pinned to the retired legacy
   * anatomy (h1.page-title / .metric-* / .sidebar-item — the sidebar
   * family has been .nav-item since the shell reskin), so pattern-era
   * routes matched NOTHING and 48/72 baseline captures shipped empty
   * color arrays that drift passed over vacuously. Each sample is now
   * «current-anatomy-first, legacy-fallback» and carries a flag: does
   * it require DIRECT text (contrast samples) or is it a surface row
   * (body ground / surfaces where the computed pair is meaningful
   * without a direct text node). hasDirectText(body) was ALWAYS false
   * — the ground sample never shipped; it no longer gates. */
  ['body', 'body', false],
  ['page-title', 'h1.pf-page-title, h1.page-title, h1.fo-hero-title, h1.auth-form-title, h1.nf-title', true],
  ['page-subtitle', '.pf-page-desc, .page-subtitle', true],
  ['metric-value', '.pf-stat-value, .metric-value', true],
  ['metric-label', '.pf-stat-label, .metric-label', true],
  ['card', '.card', false],
  ['sidebar-item', '.nav-item.on, .sidebar .nav-item', true],
  ['text-subtle', '.text-subtle', true],
];

interface RawCapture {
  illustrations: Array<{ name: string; decorative: boolean; altResolved: string | null; svg: string }>;
  overlays: Array<{ type: string; elevToken: string; glass: boolean; zIndex: number }>;
  roleAccent: string | null;
  collegeAccent: string | null;
  collegeAccentFallback: boolean;
  motion: Array<{ selector: string; durationMs: number; easing: string }>;
  colors: Array<{ selector: string; background: string; color: string }>;
  /* r291: the coverage probe + state-mount counts (see ColorProbe). */
  colorMatched: string[];
  colorNotFound: string[];
  stateSurfaces: number;
  cls: number;
  fcpMs: number;
  bytesTransferred: number;
  actualTheme: string | null;
  actualDir: string | null;
}

async function collectRaw(page: Page): Promise<RawCapture> {
  return page.evaluate(
    (cfg) => {
      const readVar = (el: Element | null, name: string): string =>
        el ? getComputedStyle(el).getPropertyValue(name).trim() : '';

      /* illustrations — <Illustration> marks its real dispatcher node. */
      const illustrations = Array.from(
        document.querySelectorAll<HTMLElement>('[data-mk-ill]'),
      ).map((el) => ({
        name: el.getAttribute('data-mk-ill') ?? '<unknown>',
        decorative: el.getAttribute('aria-hidden') === 'true',
        altResolved: el.getAttribute('aria-label'),
        svg: el.querySelector('svg')?.outerHTML ?? '',
      }));

      /* overlays — mounted overlay primitives */
      const overlays = [] as Array<{ type: string; elevToken: string; glass: boolean; zIndex: number }>;
      for (const [type, selector] of cfg.overlaySelectors as Array<[string, string]>) {
        for (const el of Array.from(document.querySelectorAll<HTMLElement>(selector))) {
          const cs = getComputedStyle(el);
          overlays.push({
            type,
            elevToken: cs.boxShadow || 'none',
            glass: (cs.backdropFilter && cs.backdropFilter !== 'none') ||
              (cs.getPropertyValue('-webkit-backdrop-filter') !== '' &&
                cs.getPropertyValue('-webkit-backdrop-filter') !== 'none'),
            zIndex: Number.parseInt(cs.zIndex, 10) || 0,
          });
        }
      }

      /* role / college accents */
      const roleAccent = document.body.dataset.role ? readVar(document.body, '--role-accent') || null : null;
      const collegeAccentRaw = readVar(document.body, '--college-accent') ||
        readVar(document.documentElement, '--college-accent');
      const roleAccentRaw = readVar(document.body, '--role-accent');
      const collegeAccent = collegeAccentRaw || null;
      // tokens.css falls --college-accent back to --role-accent — equal
      // values mean "no college tint applied".
      const collegeAccentFallback =
        collegeAccent !== null && roleAccentRaw !== '' && collegeAccent === roleAccentRaw;

      /* motion treatments — first non-zero transition/animation per element */
      const motion = [] as Array<{ selector: string; durationMs: number; easing: string }>;
      const parseMs = (dur: string): number => {
        const first = dur.split(',')[0]?.trim() ?? '0s';
        const n = Number.parseFloat(first);
        return first.endsWith('ms') ? n : n * 1000;
      };
      const describe = (el: Element): string => {
        const cls = el instanceof HTMLElement ? Array.from(el.classList) : [];
        return el.tagName.toLowerCase() + (el.id ? `#${el.id}` : cls[0] ? `.${cls[0]}` : '');
      };
      for (const el of Array.from(document.querySelectorAll<HTMLElement>('*')).slice(
        0,
        cfg.motionScanLimit,
      )) {
        const cs = getComputedStyle(el);
        const tMs = parseMs(cs.transitionDuration);
        const aMs = parseMs(cs.animationDuration);
        const dur = Math.max(tMs, aMs);
        if (!(dur > 0)) continue;
        motion.push({
          selector: describe(el),
          durationMs: Math.round(dur),
          easing: tMs >= aMs ? cs.transitionTimingFunction : cs.animationTimingFunction,
        });
        if (motion.length >= cfg.motionCaptureLimit) break;
      }

      /* computed colours on the key surfaces */
      /* r164 integration: two sampling-truth fixes —
       *   1. only elements with DIRECT non-empty text nodes are real
       *      fg/bg pairs (body/containers inherit colours their own
       *      children override — sampling them produced phantom 1.24
       *      ratios);
       *   2. an element's own transparent background means the pair
       *      sits on an ancestor's surface — walk up to the first
       *      opaque background instead of computing against
       *      rgba(0,0,0,0) (which produced phantom 1.15 ratios). */
      const isTransparent = (bg: string) =>
        !bg || bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent';
      const hasDirectText = (el: Element): boolean =>
        Array.from(el.childNodes).some(
          (n) => n.nodeType === 3 && (n.textContent ?? '').trim().length > 0,
        );
      const effectiveBg = (el: HTMLElement): string => {
        let node: HTMLElement | null = el;
        while (node) {
          const bg = getComputedStyle(node).backgroundColor;
          if (!isTransparent(bg)) return bg;
          node = node.parentElement;
        }
        return 'rgba(0, 0, 0, 0)';
      };
      const colors = [] as Array<{ selector: string; background: string; color: string }>;
      /* r291: the matched/notFound probe — a sample that matched nothing
       * (or a text sample whose element carries no direct text) is
       * RECORDED as notFound instead of silently dropped: drift can then
       * tell «N/A on this route» apart from «the measurement vanished».
       * The 3rd tuple flag = requires direct text (contrast samples);
       * body/card are surface rows and never gate on text. */
      const colorMatched: string[] = [];
      const colorNotFound: string[] = [];
      for (const [name, selector, needsText] of cfg.colorSamples as Array<[string, string, boolean]>) {
        const el = document.querySelector<HTMLElement>(selector);
        if (!el || (needsText && !hasDirectText(el))) {
          colorNotFound.push(name);
          continue;
        }
        const cs = getComputedStyle(el);
        colors.push({ selector: name, background: effectiveBg(el), color: cs.color });
        colorMatched.push(name);
      }
      /* These slots promise an illustration; generic empty states may use an icon. */
      const stateSurfaces = document.querySelectorAll('.state-illustration').length;

      /* CLS (Chromium keeps buffered layout-shift entries) */
      const cls = (performance as Performance & {
        getEntriesByType(type: string): Array<{ value?: number; hadRecentInput?: boolean }>;
      })
        .getEntriesByType('layout-shift')
        .reduce((s, e) => s + (e.hadRecentInput ? 0 : (e.value ?? 0)), 0);

      /* FCP */
      const fcp = performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? 0;

      /* transferred bytes (doc + resources) */
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      const bytes =
        (nav?.transferSize ?? 0) +
        performance
          .getEntriesByType('resource')
          .reduce((s, r) => s + ((r as PerformanceResourceTiming).transferSize ?? 0), 0);

      return {
        illustrations,
        overlays,
        roleAccent,
        collegeAccent,
        collegeAccentFallback,
        motion,
        colors,
        colorMatched,
        colorNotFound,
        stateSurfaces,
        cls,
        fcpMs: fcp,
        bytesTransferred: bytes,
        actualTheme: document.documentElement.dataset.theme ?? null,
        actualDir: document.documentElement.dir || null,
      };
    },
    {
      overlaySelectors: OVERLAY_SELECTORS,
      colorSamples: COLOR_SAMPLES,
      motionScanLimit: MOTION_SCAN_LIMIT,
      motionCaptureLimit: MOTION_CAPTURE_LIMIT,
    },
  );
}

/* ── Node-side post-processing (gzip, contrast, off-token) ──────── */

function gzipBytes(svg: string): number {
  if (!svg) return 0;
  return gzipSync(Buffer.from(svg, 'utf8')).length;
}

function parseRgb(raw: string): [number, number, number] | null {
  /* r164 integration: modern Chromium serialises some computed colours
   * as `color(srgb r g b[ / a])` — parse that form too (previously it
   * fell to null → bogus 0.00 contrast ratios on card surfaces). */
  const cs = raw.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\s*\)$/);
  if (cs) {
    let r = Number(cs[1]) * 255;
    let g = Number(cs[2]) * 255;
    let b = Number(cs[3]) * 255;
    const a = cs[4] !== undefined ? Number(cs[4]) : 1;
    if (a < 1) {
      r = r * a + 255 * (1 - a);
      g = g * a + 255 * (1 - a);
      b = b * a + 255 * (1 - a);
    }
    return [Math.round(r), Math.round(g), Math.round(b)];
  }
  const m = raw.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\s*\)/);
  if (!m) return null;
  let r = Number(m[1]);
  let g = Number(m[2]);
  let b = Number(m[3]);
  const a = m[4] !== undefined ? Number(m[4]) : 1;
  if (a < 1) {
    // Approximate alpha blending over white (samples sit on light/dark
    // paper tokens; close enough for a budget gate, not an exact claim).
    r = r * a + 255 * (1 - a);
    g = g * a + 255 * (1 - a);
    b = b * a + 255 * (1 - a);
  }
  return [Math.round(r), Math.round(g), Math.round(b)];
}

function luminance(rgb: [number, number, number]): number {
  const lin = (c: number): number => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
}

function contrastRatio(a: [number, number, number], b: [number, number, number]): number {
  const la = luminance(a);
  const lb = luminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

/** Hex/rgb literal corpus of the stylesheet directory. */
function cssColorCorpus(): Set<string> {
  const corpus = new Set<string>();
  const stylesDir = resolve(here, '../../src/styles');
  try {
    for (const file of readdirSync(stylesDir)) {
      if (!file.endsWith('.css')) continue;
      const css = readFileSync(resolve(stylesDir, file), 'utf8');
      for (const hex of css.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []) corpus.add(hex.toLowerCase());
      for (const rgb of css.match(/rgba?\([^)]*\)/g) ?? []) corpus.add(rgb.replace(/\s/g, ''));
    }
  } catch {
    /* styles unreadable → empty corpus → off-token check disabled */
  }
  return corpus;
}

function toHex(rgb: [number, number, number]): string {
  return `#${rgb.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

function buildComputedColors(
  raw: Array<{ selector: string; background: string; color: string }>,
  corpus: Set<string>,
): ColorCapture[] {
  const out: ColorCapture[] = [];
  for (const c of raw) {
    const bg = parseRgb(c.background);
    const fg = parseRgb(c.color);
    const ratio = bg && fg ? contrastRatio(bg, fg) : 0;
    /* r292: the off-token sentinel now separates PROVABLE literals from
     * token-derived blends. A computed value that serialises as
     * `color(srgb …)` is by construction the result of a color-mix()
     * over CSS custom properties (course-tint washes, the r292 StatLine
     * contrast mixes) — the literal corpus can never contain it and the
     * flag fired on every run for tokens-by-construction values. Blends
     * record with a `blend:` selector prefix so the human review the
     * header documents still SEES them every run; literal rgb()/hex
     * values keep facing the full corpus check unchanged. */
    const isBlend =
      c.color.startsWith('color(srgb') || c.background.startsWith('color(srgb');
    const offToken =
      !isBlend &&
      corpus.size > 0 &&
      ((fg !== null && !corpus.has(toHex(fg))) || (bg !== null && !corpus.has(toHex(bg))));
    const blendNote =
      isBlend && corpus.size > 0
        ? `blend: ${c.selector} fg=${c.color} bg=${c.background}`
        : null;
    out.push({
      selector: offToken
        ? `off-token: ${c.selector} fg=${c.color} bg=${c.background}`
        : blendNote ?? c.selector,
      background: c.background,
      color: c.color,
      contrastRatio: Number(ratio.toFixed(2)),
    });
  }
  return out;
}

/* ── the sweep ──────────────────────────────────────────────────── */

test('sweep AUDIT_ROUTES × viewports × themes × dirs → surface-inventory.json', async ({
  browser,
  request,
}) => {
  // The full sweep is long by design — one capture ≈ 1–2 s × ~576.
  test.setTimeout(2 * 60 * 60 * 1000);

  const corpus = cssColorCorpus();
  const screenshotsDir = resolve(here, 'screenshots');
  mkdirSync(screenshotsDir, { recursive: true });

  // Login once per guarded role — against the real API, or from the
  // fixture users when the mock transport owns the wire (DB-less).
  const sessions = new Map<string, Session>();
  for (const role of ['STUDENT', 'TEACHER', 'ADMIN', 'QUALITY', 'OWNER'] as const) {
    if (MOCK_API) {
      sessions.set(role, {
        user: ROLE_USERS[role],
        accessToken: 'audit-mock-token',
      });
    } else {
      sessions.set(role, await login(request, role));
    }
  }

  // One browser context per (role × theme); viewport switches per capture.
  const contexts = new Map<string, Awaited<ReturnType<Browser['newContext']>>>();
  const pages = new Map<string, Page>();

  async function pageFor(role: SweepRole, theme: ThemeKey): Promise<Page> {
    const key = `${role}:${theme}`;
    const existing = pages.get(key);
    if (existing) return existing;
    const context = await browser.newContext({
      baseURL: APP_BASE_URL,
      viewport: { width: 1280, height: 800 },
      colorScheme: theme,
      locale: 'ar',
    });
    if (MOCK_API) {
      // The transport must own the wire BEFORE the first app request.
      // Mock mode seeds the session user answering /auth/me for every
      // role, so guarded routes stay inside the app (no /auth bounce).
      await installMockApi(context, {
        sessionUser: role === 'guest' ? null : sessions.get(role)!.user,
      });
    }
    const session = role === 'guest' ? null : sessions.get(role);
    // Seed the persisted stores BEFORE any app script runs. Theme gets a
    // fresh modeUpdatedAt so the profile-sync tiebreak keeps the local choice.
    await context.addInitScript(
      ([session, themeMode]) => {
        try {
          localStorage.setItem(
            'madarek-theme',
            JSON.stringify({ state: { mode: themeMode, modeUpdatedAt: Date.now() }, version: 2 }),
          );
        } catch { /* storage unavailable — the sweep asserts the theme below */ }
        // r308: the landing's entrance loader plays once per session —
        // the sweep captures SETTLED product surfaces, so seed the
        // seen-flag exactly like the e2e fixture does (the entrance
        // itself has dedicated coverage in r308-landing-instruments).
        try {
          sessionStorage.setItem('madarek-intro-seen', '1');
        } catch { /* ditto */ }
        if (session) {
          try {
            localStorage.setItem(
              'mdrk-auth',
              JSON.stringify({ state: { user: session.user, accessToken: session.accessToken }, version: 0 }),
            );
          } catch { /* ditto */ }
        }
      },
      [session, theme] as const,
    );
    const page = await context.newPage();
    contexts.set(key, context);
    pages.set(key, page);
    return page;
  }

  const captures: SurfaceCapture[] = [];

  for (const route of SWEEP_ROUTES) {
    const role = roleForRoute(route);
    const url = resolveRoute(route);
    for (const viewport of SWEEP_VIEWPORTS) {
      for (const theme of THEMES) {
        for (const dir of DIRS) {
          const page = await pageFor(role, theme);
          await page.setViewportSize({ width: viewport, height: 800 });
          await page.goto(url, { waitUntil: 'networkidle' });
          await page.waitForTimeout(SETTLE_MS);

          // A successful SPA fallback is not sufficient route evidence:
          // each path must render a heading or an explicit live state (for
          // routes whose API is intentionally unmocked in this DB-less run).
          const main = page.locator('main').first();
          await expect(main, `${route} should render a main landmark`).toBeVisible();
          expect((await main.innerText()).trim(), `${route} main landmark should have content`).not.toBe('');
          const pageSignal = main.locator('h1:visible, h2:visible, [role="alert"]:visible, [role="status"]:visible').first();
          await expect(pageSignal, `${route} should render a heading or explicit state`).toBeVisible();

          // Sweep invariants — fail loudly rather than baseline the
          // wrong surface.
          expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(theme);
          expect(await page.evaluate(() => document.documentElement.dir)).toBe(dir);
          // Guarded routes must not bounce to /auth.
          if (role !== 'guest') {
            expect(page.url(), `${route} should stay inside the app for ${role}`).not.toContain('/auth');
          }

          const raw = await collectRaw(page);

          const illustrations: IllustrationCapture[] = raw.illustrations.map((ill) => ({
            name: ill.name,
            decorative: ill.decorative,
            altResolved: ill.altResolved,
            sizeBytesGz: gzipBytes(ill.svg),
          }));
          const overlays: OverlayCapture[] = raw.overlays.map((ov) => ({
            type: ov.type as OverlayKind,
            elevToken: ov.elevToken,
            glass: ov.glass,
            zIndex: ov.zIndex,
          }));
          const motionTreatments: MotionCapture[] = raw.motion;
          const computedColors = buildComputedColors(raw.colors, corpus);
          /* r291: the coverage probe ships with every capture — the drift
           * detector turns «fewer matched samples than expected» into a
           * coverage-regression finding instead of a vacuous pass. */
          const colorProbe = { matched: raw.colorMatched, notFound: raw.colorNotFound };
          const illustrationMounts = {
            illustrations: illustrations.length,
            stateSurfaces: raw.stateSurfaces,
          };

          captures.push({
            route,
            viewport: viewport as ViewportKey,
            theme: theme as ThemeKey,
            dir: dir as DirKey,
            illustrations,
            overlays,
            roleAccent: raw.roleAccent,
            collegeAccent: raw.collegeAccent,
            collegeAccentFallback: raw.collegeAccentFallback,
            motionTreatments,
            computedColors,
            colorProbe,
            illustrationMounts,
            cls: Number(raw.cls.toFixed(3)),
            fcpMs: Math.round(raw.fcpMs),
            bytesTransferred: raw.bytesTransferred,
          });

          // One reference screenshot per route (light / 1280) — regenerated each run, gitignored, for eyeballing during review.
          if (viewport === 1280 && theme === 'light') {
            const safe = route.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'root';
            await page.screenshot({
              path: resolve(screenshotsDir, `${safe}-1280-light.png`),
              fullPage: false,
            });
          }
        }
      }
    }
  }

  for (const context of contexts.values()) await context.close();

  const inventory: SurfaceInventory = {
    generatedAt: new Date().toISOString(),
    captures,
  };
  const outPath = INVENTORY_OUT;
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(inventory, null, 2)}\n`, 'utf8');

  const expected =
    SWEEP_ROUTES.length * SWEEP_VIEWPORTS.length * THEMES.length * DIRS.length;
  expect(captures).toHaveLength(expected);
  // Every capture must be structurally complete for the drift detector.
  for (const cap of captures) {
    expect(cap.illustrations.every((i) => typeof i.sizeBytesGz === 'number')).toBe(true);
    expect(cap.fcpMs).toBeGreaterThanOrEqual(0);
  }
  console.log(
    `✓ surface inventory: ${captures.length} captures → ${outPath}\n` +
      `  gate with: npm run test:audit:drift`,
  );
});
