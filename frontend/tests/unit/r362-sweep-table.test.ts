/**
 * R362 (Agent 5) — sweep-table ↔ router parity gate.
 *
 * tests/r362/sweep-routes.ts is the Agent-5 route-coverage table for
 * the real-stack sweep. This suite pins it against the REAL route map
 * (src/App.tsx) with the same static-source convention as
 * route-titles-coverage.test.tsx — but with a parser that also sees
 * the multi-line <Route> rows (path= and element on separate lines)
 * the single-line regex cannot match (the /capabilities + /legal/* +
 * /about + /help + /contact + /app family — 11 public sheets the
 * title-coverage regex still skips; see the note in the last test).
 *
 * Pins, in both directions:
 *   1. every renderable route in App.tsx has exactly one sweep row;
 *   2. every sweep row exists in App.tsx (nothing invented);
 *   3. no duplicate paths;
 *   4. per-role ownership matches the guard block each row sits in
 *      (wrapper-<Route> stack: ProtectedRoute allow=[…] / bare
 *      ProtectedRoute / GuestRoute / CollegesLayout);
 *   5. the table's param names match the route literals;
 *   6. the recalculated inventory totals (the numbers the R362
 *      inventory doc quotes).
 *
 * Documented carve-outs (fail loudly here if they change):
 *   - redirect rows (Navigate / ParamRedirect / HomeRedirect bodies)
 *     are not sweepable surfaces — their destinations are. The ONE
 *     exception is the root `/` (HomeRedirect): for a GUEST it RENDERS
 *     the landing, so the sweep visits it signed-out and the table
 *     carries it explicitly.
 *   - `*` (the catch-all) renders the same NotFoundPage as /404;
 *   - the double-underscore dev plates (/__brand, /__design, /__plates)
 *     are design-governance surfaces, not product routes — the audit
 *     table (tests/audit/routes.ts) makes the same carve-out;
 *   - /admin/analysis renders AdminAnalysisPage, whose body is an
 *     in-page redirect to /admin/reports (5-B4) — it stays in the table
 *     (the sweep asserts the bounce destination).
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
  SWEEP_ROUTES,
  IN_PAGE_REDIRECTS,
} from '../r362/sweep-routes';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p: string) => readFileSync(path.join(root, p), 'utf8');

const APP_SOURCE = read('src/App.tsx');
const ROUTES_CONST_SOURCE = read('src/lib/routes.ts');
const ROUTE_CONSTS = new Map(
  [...ROUTES_CONST_SOURCE.matchAll(/^\s{2}(\w+):\s*'([^']+)'/gm)].map((m) => [m[1]!, m[2]!]),
);

/* ── parse the real table (single-line AND multi-line rows) ─────── */

interface ParsedRow {
  path: string;
  /** The element component (multi-line GuestReveal rows report the
   * wrapper — they are renderable public sheets by construction). */
  element: string;
  /** Guard context via the wrapper-<Route> stack; top-level rows are
   * GUEST (public — including the chrome-less GuestReveal sheets and
   * the routed error sheets mounted after every guarded block). */
  role: 'GUEST' | 'STUDENT' | 'TEACHER' | 'ADMIN' | 'QUALITY' | 'OWNER' | 'ANY' | 'STUDENT_AND_TEACHER';
}

const REDIRECT_ELEMENTS = new Set(['Navigate', 'ParamRedirect', 'HomeRedirect']);
/** Rows the sweep deliberately does not visit (see the header). */
const EXCLUDED_PATHS = new Set(['*', '/__brand', '/__design', '/__plates']);

function parseRouteRows(): ParsedRow[] {
  const rows: ParsedRow[] = [];
  const stack: ParsedRow['role'][] = [];
  let pendingPath: string | null = null; // multi-line row, path captured

  for (const line of APP_SOURCE.split('\n')) {
    /* wrapper opener — <Route element={<Guard …/>}> (no path) */
    const wrapper = /^\s*<Route\s+element=\{<(ProtectedRoute|GuestRoute|CollegesLayout|AppShell)/.exec(line);
    if (wrapper) {
      const kind = wrapper[1]!;
      const allow = /allow=\{\[\s*([A-Z'",\s]+?)\s*\]\s*\}\s*\/>/.exec(line);
      let role: ParsedRow['role'];
      if (kind === 'ProtectedRoute') {
        role = allow
          ? allow[1]!.split(',').map((s) => s.trim().replace(/'/g, '')).join('_AND_') as ParsedRow['role']
          : 'ANY';
      } else if (kind === 'GuestRoute' || kind === 'CollegesLayout') {
        role = 'GUEST';
      } else {
        role = stack[stack.length - 1] ?? 'GUEST'; // AppShell inherits
      }
      stack.push(role);
      continue;
    }

    /* closer — </Route> */
    if (/^\s*<\/Route>/.test(line)) {
      stack.pop();
      continue;
    }

    /* single-line row — <Route path=… element={<Component … */
    const single = /<Route\s+path=(?:"([^"]+)"|\{ROUTES\.(\w+)\})\s+element=\{<(\w+)/.exec(line);
    if (single) {
      const p = single[1] !== undefined ? single[1] : ROUTE_CONSTS.get(single[2]!)!;
      rows.push({ path: p, element: single[3]!, role: stack[stack.length - 1] ?? 'GUEST' });
      continue;
    }

    /* multi-line row — <Route alone, then path=, then the element */
    if (/^\s*<Route\s*$/.test(line)) {
      pendingPath = null;
      continue;
    }
    if (pendingPath === null) {
      const p = /^\s*path=(?:"([^"]+)"|\{ROUTES\.(\w+)\}),?$/.exec(line);
      if (p) {
        pendingPath = p[1] !== undefined ? p[1] : ROUTE_CONSTS.get(p[2]!)!;
        continue;
      }
    } else {
      /* the first JSX tag after the path is the element — a plain
       * component (never Navigate; every redirect row is single-line)
       * or the GuestReveal wrapper of a public sheet. */
      const el = /^\s*<(\w+)[\s/>]/.exec(line);
      if (el) {
        rows.push({ path: pendingPath, element: el[1]!, role: stack[stack.length - 1] ?? 'GUEST' });
        pendingPath = null;
      }
    }
  }
  return rows;
}

const parsed = parseRouteRows();
const sweepPaths = SWEEP_ROUTES.map((r) => r.path);
const renderable = parsed.filter(
  (r) => !REDIRECT_ELEMENTS.has(r.element) && !EXCLUDED_PATHS.has(r.path),
);

describe('R362 sweep table ↔ App.tsx route map parity', () => {
  it('the sweep table has no duplicate paths', () => {
    const dupes = sweepPaths.filter((p, i) => sweepPaths.indexOf(p) !== i);
    expect(dupes, `duplicate sweep rows: ${dupes.join(', ')}`).toEqual([]);
  });

  it('every renderable route in App.tsx has a sweep row (nothing ignored)', () => {
    const missing = renderable
      .map((r) => r.path)
      .filter((p) => !sweepPaths.includes(p));
    expect(missing, `renderable routes with no sweep row: ${missing.join(', ')}`).toEqual([]);
  });

  it('every sweep row exists in App.tsx (nothing invented)', () => {
    const routerPaths = parsed.map((r) => r.path);
    const invented = sweepPaths.filter((p) => !routerPaths.includes(p) && p !== '/');
    expect(invented, `sweep rows not in the router: ${invented.join(', ')}`).toEqual([]);
  });

  it('redirect rows are excluded from the sweep table (except the guest root)', () => {
    const redirectPaths = parsed
      .filter((r) => REDIRECT_ELEMENTS.has(r.element))
      .map((r) => r.path)
      .filter((p) => p !== '/'); // the guest root renders the landing
    const offenders = redirectPaths.filter((p) => sweepPaths.includes(p));
    expect(offenders, `redirect rows must not be swept: ${offenders.join(', ')}`).toEqual([]);
  });

  it('per-role ownership matches the guard blocks', () => {
    const mismatches: string[] = [];
    for (const row of renderable) {
      const sweepRow = SWEEP_ROUTES.find((r) => r.path === row.path);
      if (!sweepRow) continue; // covered by the missing-row test
      if (sweepRow.role !== row.role) {
        mismatches.push(`${row.path}: sweep says ${sweepRow.role}, router says ${row.role}`);
      }
    }
    expect(mismatches, mismatches.join(' | ')).toEqual([]);
  });

  it('param names in the table match the route literals', () => {
    for (const row of SWEEP_ROUTES) {
      const routeParams = [...row.path.matchAll(/:([A-Za-z]+)/g)].map((m) => m[1]!);
      const tableParams = Object.keys(row.params ?? {});
      expect(
        tableParams.sort(),
        `${row.path}: table params must match the route literal`,
      ).toEqual(routeParams.sort());
    }
  });

  it('the recalculated totals (the R362 inventory numbers)', () => {
    // The inventory doc (docs/r362/agent5-route-inventory.md) quotes
    // these numbers; this pin keeps them honest. The historical report
    // said "approximately 140 routes and 76 page files" — the 141
    // registrations below include 12 redirect-only rows and 4 dev/carve-
    // out rows; the RENDERABLE product surface is the sweep table.
    expect(parsed.length).toBe(141); // total route registrations
    expect(parsed.filter((r) => REDIRECT_ELEMENTS.has(r.element)).length).toBe(12);
    expect(renderable.length).toBe(125); // minus 12 redirects, minus 4 carve-outs
    expect(SWEEP_ROUTES.length).toBe(126); // renderable + the guest root `/`
    expect(IN_PAGE_REDIRECTS.size).toBe(1);
    // The 11 multi-line public sheets the legacy single-line regex
    // could not see (the parity parser above must keep finding them).
    const multiLineSheets = [
      '/capabilities', '/legal/privacy', '/legal/terms', '/legal/cookies',
      '/legal/accessibility', '/legal/security', '/legal/data',
      '/about', '/help', '/contact', '/app',
    ];
    for (const p of multiLineSheets) {
      expect(parsed.some((r) => r.path === p && r.role === 'GUEST'), `${p} must parse`).toBe(true);
    }
  });
});
