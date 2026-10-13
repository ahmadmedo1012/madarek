/**
 * Nav active-state vocabulary gate (r157, 6A4-5 — the F3 half).
 *
 * The sidebar's active link is exactly ONE boolean: the `on` class
 * (Sidebar.tsx NavLink: `nav-item${isActive ? ' on' : ''}`). The
 * `.active` twins in layout.css were dead selectors — no producer
 * ever wrote them — and the audit found the same twin pattern spread
 * across 24 sites repo-wide. F3 owns layout.css + the TSX producers;
 * polish.css twins are F1's parallel half (deliberately NOT scanned
 * here — a transient fail while both agents land would be a false
 * alarm, the scope comment in the CSS records the hand-off).
 *
 * BottomNav's `bottom-nav-item active` is a separate LIVE family
 * (bottom bar, own CSS rules) — the lookbehind in the scanner keeps
 * it out; likewise `.search-row.active` (palette rows, own family).
 *
 * Tripwires (a broken glob = vacuous pass): the scan must see ≥100
 * TSX files and Sidebar.tsx among them.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(__dirname, '..', '..', 'src');

/* ── comment stripping (same policy as the CI gate scripts) ──────── */
function stripComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '') // /* … */ (CSS + JSDoc)
    .replace(/^\s*\/\/.*$/gm, ''); //   // line comments (TS/TSX)
}

/* ── file discovery ──────────────────────────────────────────────── */
function collectTsxFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...collectTsxFiles(full));
    } else if (entry.endsWith('.tsx')) {
      out.push(full);
    }
  }
  return out;
}

/* ── the scanners ────────────────────────────────────────────────── */

/**
 * A CSS twin line: a selector segment that mentions `.nav-item` and
 * `.active` together (`.nav-item.active`, `.nav-item.on, .nav-item
 * .active`, descendants…). `(?<![\w-])nav-item` keeps the
 * bottom-nav-item family (own live `active` class) out of the match.
 */
const CSS_TWIN = /(?<![\w-])nav-item[^;{}]*\.active\b/;

/**
 * A TSX producer: `nav-item` followed by the literal class token
 * 'active' — either a static `className="nav-item active"` or a
 * template `nav-item${… ' active' …}`. The lookbehind again excludes
 * `bottom-nav-item${isActive ? ' active' : ''}` (live, separate
 * family, own CSS).
 */
const TSX_STATIC_PRODUCER = /(?<![\w-])nav-item[ \t]+active\b/;
const TSX_TEMPLATE_PRODUCER = /(?<![\w-])nav-item\$\{[^}]*['"`] active['"`]/;

describe('nav active-state vocabulary — tripwires (the scan sees the tree)', () => {
  it('discovers ≥100 TSX files under src/ and Sidebar.tsx among them', () => {
    const files = collectTsxFiles(SRC);
    expect(files.length).toBeGreaterThanOrEqual(100);
    const sidebar = files.map((f) => f.replace(/\\/g, '/')).filter((f) =>
      f.endsWith('components/layout/Sidebar.tsx'),
    );
    expect(sidebar).toHaveLength(1);
  });
});

describe('nav active-state vocabulary — layout.css (F3 scope)', () => {
  it('declares no .nav-item+.active twin (comment-stripped)', () => {
    const css = stripComments(
      readFileSync(join(SRC, 'styles', 'layout.css'), 'utf-8'),
    );
    const twinLines = css
      .split('\n')
      .map((line, i) => [i + 1, line] as const)
      .filter(([, line]) => CSS_TWIN.test(line));
    expect(
      twinLines.map(([n, line]) => `${n}: ${line.trim()}`),
      'layout.css still styles a .nav-item .active twin — the sidebar writes `on` only',
    ).toEqual([]);
  });
});

describe('nav active-state vocabulary — TSX producers (F3 scope)', () => {
  it('emits no static or template "nav-item active" class (BottomNav\'s bottom-nav-item is a live separate family)', () => {
    const offenders: string[] = [];
    for (const file of collectTsxFiles(SRC)) {
      const text = stripComments(readFileSync(file, 'utf-8'));
      if (TSX_STATIC_PRODUCER.test(text)) {
        offenders.push(`${file} [static nav-item active]`);
      }
      if (TSX_TEMPLATE_PRODUCER.test(text)) {
        offenders.push(`${file} [template nav-item + ' active']`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
