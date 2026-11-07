/**
 * r141 — nav ↔ routes consistency gate.
 *
 * The regression this suite pins: commit 761eaf4 rewrote App.tsx and
 * silently dropped the two `/teacher/exams` route rows while nav.ts
 * kept its «بنك الأسئلة والاختبارات» entry — every teacher's click
 * fell through the catch-all `*` to the dashboard. The per-page suites
 * (ExamAuthorPages.test.tsx among them) never noticed because each of
 * them mounts its own routes under a MemoryRouter, so the real table
 * was never under test.
 *
 * Following the repo's static-source convention (assets.test.ts /
 * route-titles-coverage.test.tsx: fs assertions lock in what
 * per-component tests can't see — here, the route table itself):
 *
 *   every `to:` destination declared in src/lib/nav.ts must have a
 *   matching `<Route path="…">` row in src/App.tsx.
 *
 * Nav destinations are static (no `:param` — nav.ts is the single
 * source the sidebar/bottom-nav/command-palette all read from), so a
 * direct set-membership check is exact. Route-table `<Navigate>`
 * redirect destinations are verified too (a nav entry that lands on a
 * redirect must land on a real route, not on the catch-all).
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p: string) => readFileSync(path.join(root, p), 'utf8');

const NAV_SOURCE = read('src/lib/nav.ts');
const APP_SOURCE = read('src/App.tsx');

/* R341 Y2 re-key: nav destinations were single-sourced from string
 * literals to `ROUTES.<name>` references (src/lib/routes.ts — the
 * values are byte-identical). The extraction resolves the constant so
 * the SAME contract is pinned: every sidebar destination must match a
 * real <Route> row. If routes.ts moves again, the tripwire below
 * catches a vacuous regex, exactly as before. */
const ROUTES_SOURCE = read('src/lib/routes.ts');
const ROUTE_CONSTS = new Map(
  [...ROUTES_SOURCE.matchAll(/^\s{2}(\w+):\s*'([^']+)'/gm)].map((m) => [m[1]!, m[2]!]),
);

/** Every sidebar destination: `to: ROUTES.studentDashboard` (resolved)
 * plus any remaining literal `to: '/…'` forms. */
const NAV_DESTINATIONS = [
  ...NAV_SOURCE.matchAll(/to:\s*(?:ROUTES\.(\w+)|'([^']+)')/g),
].map((m) => (m[1] ? ROUTE_CONSTS.get(m[1]) : m[2])).filter((v): v is string => !!v);

/** Every declared route row in the real table — literal `path="…"` and
 * the Y2 single-sourced `path={ROUTES.…}` forms, resolved to values. */
const ROUTE_PATHS = [
  ...APP_SOURCE.matchAll(/<Route\s+path=(?:"([^"]+)"|\{ROUTES\.(\w+)\})/g),
].map((m) => (m[1] ? m[1] : ROUTE_CONSTS.get(m[2]!) ?? '')).filter(Boolean);

/** `<Route path=… element={<Navigate to=…` rows (alias/redirects) —
 * both literal and ROUTES-constant forms, resolved to values. */
const resolveRouteRef = (literal: string | undefined, constName: string | undefined) =>
  literal !== undefined ? literal : (constName !== undefined ? ROUTE_CONSTS.get(constName) : undefined);
const REDIRECT_ROWS = [...APP_SOURCE.matchAll(
  /<Route\s+path=(?:"([^"]+)"|\{ROUTES\.(\w+)\})\s+element=\{<Navigate\s+to=(?:"([^"]+)"|\{ROUTES\.(\w+)\})/g,
)].map((m) => ({
  from: resolveRouteRef(m[1], m[2]) ?? '',
  to: resolveRouteRef(m[3], m[4]) ?? '',
})).filter((r) => r.from && r.to);

describe('nav ↔ routes consistency (r141 gate)', () => {
  it('the extractions found the real tables (guards the regexes themselves)', () => {
    // Tripwires so a regex/format drift can't turn every assertion
    // below vacuously green (same convention as route-titles-coverage).
    // (Duplicates across roles are legitimate — /community etc. — the
    // membership check below works on the unique set.)
    expect(NAV_DESTINATIONS.length).toBeGreaterThanOrEqual(70);
    expect(new Set(NAV_DESTINATIONS).size).toBeGreaterThanOrEqual(60);
    expect(ROUTE_PATHS.length).toBeGreaterThanOrEqual(90);
    // routes.ts tripwire (the Y2 re-key): the constant table itself must
    // be found — a vacuous ROUTE_CONSTS map would silently shrink the
    // destination set to the remaining literals.
    expect(ROUTE_CONSTS.size).toBeGreaterThanOrEqual(90);
  });

  it('every nav destination has a matching <Route> row', () => {
    const routeSet = new Set(ROUTE_PATHS);
    const missing = [...new Set(NAV_DESTINATIONS)].filter((d) => !routeSet.has(d));
    // A nav item whose route row vanished is a dead click for a whole
    // role — exactly the 761eaf4 regression. Fail loudly, list them all.
    expect(missing, `nav entries without route rows: ${missing.join(', ')}`).toEqual([]);
  });

  it('every <Navigate> redirect lands on a declared route', () => {
    const routeSet = new Set(ROUTE_PATHS);
    const broken = REDIRECT_ROWS.filter(({ to }) => to !== '/' && !routeSet.has(to));
    expect(broken, `redirects pointing nowhere: ${broken.map((r) => r.from).join(', ')}`).toEqual([]);
  });
});
