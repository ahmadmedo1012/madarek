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
 * Notes / limitations (deliberate, documented in the audit contract):
 *   - One shared browser context per (role × theme); viewport is
 *     switched per capture via page.setViewportSize. Login happens
 *     exactly once per role through the real /auth/login API and the
 *     session is seeded into localStorage (mdrk-auth / madarek-theme).
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

import { AUDIT_ROUTES, DIRS, THEMES, VIEWPORTS } from './routes';
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
    ROUTE_PARAMS[name] ?? PARAM_DEFAULTS[name] ?? '1',
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
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: Exclude<SweepRole, 'guest'>;
  };
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
const COLOR_SAMPLES: ReadonlyArray<[string, string]> = [
  ['body', 'body'],
  ['page-title', 'h1.page-title'],
  ['page-subtitle', '.page-subtitle'],
  ['metric-value', '.metric-value'],
  ['metric-label', '.metric-label'],
  ['card', '.card'],
  ['sidebar-item', '.sidebar-item'],
  ['text-subtle', '.text-subtle'],
];

interface RawCapture {
  illustrations: Array<{ name: string; decorative: boolean; altResolved: string | null; svg: string }>;
  overlays: Array<{ type: string; elevToken: string; glass: boolean; zIndex: number }>;
  roleAccent: string | null;
  collegeAccent: string | null;
  collegeAccentFallback: boolean;
  motion: Array<{ selector: string; durationMs: number; easing: string }>;
  colors: Array<{ selector: string; background: string; color: string }>;
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

      /* illustrations — [data-illustration] is set by <Illustration> */
      const illustrations = Array.from(
        document.querySelectorAll<HTMLElement>('[data-illustration]'),
      ).map((el) => ({
        name: el.getAttribute('data-illustration') ?? '<unknown>',
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
      const colors = [] as Array<{ selector: string; background: string; color: string }>;
      for (const [name, selector] of cfg.colorSamples as Array<[string, string]>) {
        const el = document.querySelector<HTMLElement>(selector);
        if (!el) continue;
        const cs = getComputedStyle(el);
        colors.push({ selector: name, background: cs.backgroundColor, color: cs.color });
      }

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
    // off-token heuristic: neither the resolved fg nor bg matches any
    // literal shipped in src/styles. colour-mix blends may trip this —
    // the drift report is human-reviewed before a baseline promotion.
    const offToken =
      corpus.size > 0 &&
      ((fg !== null && !corpus.has(toHex(fg))) || (bg !== null && !corpus.has(toHex(bg))));
    out.push({
      selector: offToken ? `off-token: ${c.selector} fg=${c.color} bg=${c.background}` : c.selector,
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

  // Login once per guarded role.
  const sessions = new Map<string, Session>();
  for (const role of ['STUDENT', 'TEACHER', 'ADMIN', 'QUALITY', 'OWNER'] as const) {
    sessions.set(role, await login(request, role));
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

  for (const route of AUDIT_ROUTES) {
    const role = roleForRoute(route);
    const url = resolveRoute(route);
    for (const viewport of VIEWPORTS) {
      for (const theme of THEMES) {
        for (const dir of DIRS) {
          const page = await pageFor(role, theme);
          await page.setViewportSize({ width: viewport, height: 800 });
          await page.goto(url, { waitUntil: 'networkidle' });
          await page.waitForTimeout(SETTLE_MS);

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
  const outPath = resolve(here, 'surface-inventory.json');
  writeFileSync(outPath, `${JSON.stringify(inventory, null, 2)}\n`, 'utf8');

  const expected =
    AUDIT_ROUTES.length * VIEWPORTS.length * THEMES.length * DIRS.length;
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
