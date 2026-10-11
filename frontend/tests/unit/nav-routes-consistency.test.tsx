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

/** Every sidebar destination: `to: '/student/dashboard'` etc. */
const NAV_DESTINATIONS = [...NAV_SOURCE.matchAll(/to:\s*'([^']+)'/g)].map((m) => m[1]!);

/** Every declared route row in the real table. */
const ROUTE_PATHS = [...APP_SOURCE.matchAll(/<Route\s+path="([^"]+)"/g)].map((m) => m[1]!);

/** `<Route path="…" element={<Navigate to="…"` rows (alias/redirects). */
const REDIRECT_ROWS = [...APP_SOURCE.matchAll(
  /<Route\s+path="([^"]+)"\s+element=\{<Navigate\s+to="([^"]+)"/g,
)].map((m) => ({ from: m[1]!, to: m[2]! }));

describe('nav ↔ routes consistency (r141 gate)', () => {
  it('the extractions found the real tables (guards the regexes themselves)', () => {
    // Tripwires so a regex/format drift can't turn every assertion
    // below vacuously green (same convention as route-titles-coverage).
    // (Duplicates across roles are legitimate — /community etc. — the
    // membership check below works on the unique set.)
    expect(NAV_DESTINATIONS.length).toBeGreaterThanOrEqual(70);
    expect(new Set(NAV_DESTINATIONS).size).toBeGreaterThanOrEqual(60);
    expect(ROUTE_PATHS.length).toBeGreaterThanOrEqual(90);
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
