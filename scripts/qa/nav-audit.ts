#!/usr/bin/env node
/**
 * r357-ui A2 — navigation audit (sidebar × bottom bar × mobile tab bar).
 *
 * The three menus are three hand-maintained tables: `lib/nav.ts`
 * (sidebar/drawer, the only one with groups + collapse flags),
 * `layout/BottomNav.tsx` (phone bar) and the mobile app's
 * `shell/roleTabs.ts` (expo-router tabs). Nothing compared them, so a
 * destination could sit in three menus with three different glyphs and
 * three different names, in three different orders — and nobody could
 * see it.
 *
 * This script answers, per role:
 *   · rows  — how many rows the default (un-toggled) sidebar shows
 *             (a collapsed group counts as its ONE toggle row),
 *   · dup   — destinations reachable from more than one menu,
 *   · order — the destination order of each menu, side by side,
 *   · glyph — destinations whose label or icon differ between menus,
 *   · nest  — pairs where one destination is a path prefix of another
 *             (the NavLink prefix-match double-active class).
 *
 * Usage: npx tsx scripts/qa/nav-audit.ts [--json]
 * Writes audits/evidence/r357/nav-audit.md (and .json with --json).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NAV_BY_ROLE } from '../../frontend/src/lib/nav';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT_DIR = path.join(ROOT, 'audits/evidence/r357');

type Row = { to: string; label: string; icon: string; group: string; collapsed: boolean };
type Menu = { menu: string; rows: Row[] };

/** Bottom bar rows, scraped from the per-role tables in BottomNav.tsx —
 *  the file keeps one `const ROLE: BottomItem[]` per role, and importing
 *  the component would drag React + the whole shell into this script. */
function bottomBar(): Record<string, Row[]> {
  const src = fs.readFileSync(path.join(ROOT, 'frontend/src/components/layout/BottomNav.tsx'), 'utf8');
  const out: Record<string, Row[]> = {};
  const blockRe = /const (STUDENT|TEACHER|ADMIN|QUALITY|OWNER): BottomItem\[\] = \[([\s\S]*?)\n\];/g;
  for (let m = blockRe.exec(src); m; m = blockRe.exec(src)) {
    const rows: Row[] = [];
    const itemRe = /\{\s*to:\s*'([^']+)',\s*label:\s*'([^']+)',\s*icon:\s*(\w+)/g;
    for (let i = itemRe.exec(m[2]); i; i = itemRe.exec(m[2])) {
      rows.push({ to: i[1], label: i[2], icon: i[3], group: 'bar', collapsed: false });
    }
    out[m[1]] = rows;
  }
  return out;
}

/** Mobile tab rows, scraped from ROLE_TABS in roleTabs.ts. */
function roleTabs(): Record<string, Row[]> {
  const src = fs.readFileSync(path.join(ROOT, 'apps/mobile/src/components/shell/roleTabs.ts'), 'utf8');
  const out: Record<string, Row[]> = {};
  const start = src.indexOf('export const ROLE_TABS');
  const body = src.slice(start);
  const blockRe = /\b(STUDENT|TEACHER|ADMIN|QUALITY|OWNER):\s*\[([\s\S]*?)\n  \],/g;
  for (let m = blockRe.exec(body); m; m = blockRe.exec(body)) {
    const rows: Row[] = [];
    const itemRe = /path:\s*"([^"]+)",\s*label:\s*"([^"]+)",\s*icon:\s*(\w+)/g;
    for (let i = itemRe.exec(m[2]); i; i = itemRe.exec(m[2])) {
      rows.push({ to: i[1], label: i[2], icon: i[3], group: 'tab', collapsed: false });
    }
    out[m[1]] = rows;
  }
  return out;
}

function sidebar(role: string): Menu {
  const groups = NAV_BY_ROLE[role as keyof typeof NAV_BY_ROLE] ?? [];
  const rows: Row[] = [];
  for (const g of groups) {
    for (const it of g.items) {
      rows.push({
        to: it.to,
        label: it.label,
        icon: (it.icon as { displayName?: string }).displayName ?? 'icon',
        group: g.label,
        collapsed: g.collapsed === true,
      });
    }
  }
  return { menu: 'sidebar', rows };
}

/**
 * Glyph identity across packages: the web imports lucide-react components
 * (`UserCircle`, `LayoutDashboard`), the RN app imports lucide-react-native
 * files (`circle-user`, `house`) — same drawing, different names. Normalise
 * to the concept, then compare. The home slot is a documented bar
 * convention (BottomNav: the universal house on every role's first tab),
 * so dashboard rows are exempt from the glyph comparison.
 */
const GLYPH_ALIASES: Record<string, string> = {
  usercircle: 'user', circleuser: 'user', user: 'user',
  house: 'home', home: 'home', layoutdashboard: 'home',
  calendar: 'calendar', calendardays: 'calendar',
  bookopen: 'book', book: 'book',
  network: 'network', filesearch: 'search', search: 'search',
  shieldcheck: 'shield', scale: 'shield',
  chartcolumn: 'chart', barchart3: 'chart', chart: 'chart',
  scaletext: 'scroll', scrolltext: 'scroll',
  clipboardlist: 'list', listchecks: 'list',
  sparkles: 'bot', bot: 'bot',
  linechart: 'brain', brain: 'brain',
  activity: 'activity', radio: 'radio',
  graduationcap: 'cap', school: 'school', filetext: 'file',
  users: 'users', bell: 'bell', landmark: 'landmark',
};
const glyph = (name: string) => GLYPH_ALIASES[name.toLowerCase().replace(/[^a-z0-9]/g, '')] ?? name.toLowerCase();
const HOME_SLOT = /\/dashboard$/;

const bar = bottomBar();
const tabs = roleTabs();
const ROLES = ['STUDENT', 'TEACHER', 'ADMIN', 'QUALITY', 'OWNER'];

const report: Record<string, unknown> = {};
const md: string[] = ['# r357-ui A2 — navigation audit', ''];
md.push('Generated by `scripts/qa/nav-audit.ts`. Rows = default (un-toggled) sidebar rows;');
md.push('a collapsed group counts as ONE toggle row.');
md.push('');

for (const role of ROLES) {
  const side = sidebar(role);
  const groups = NAV_BY_ROLE[role as keyof typeof NAV_BY_ROLE] ?? [];
  const visibleRows =
    groups.reduce((n, g) => n + (g.collapsed ? 1 : g.items.length), 0);
  const dests = side.rows.map((r) => r.to);
  const menus: Menu[] = [side, { menu: 'bottom', rows: bar[role] ?? [] }, { menu: 'tabs', rows: tabs[role] ?? [] }];

  /* duplicates: a destination living in >1 menu */
  const seen = new Map<string, string[]>();
  for (const m of menus) {
    for (const r of m.rows) {
      const list = seen.get(r.to) ?? [];
      list.push(m.menu);
      seen.set(r.to, list);
    }
  }
  const dup = [...seen.entries()].filter(([, where]) => where.length > 1);

  /* icon drift (a route showing two glyphs) vs label shortening (the
     bar's short label, documented as fine in BottomNav/5-B5). */
  const iconDrift: string[] = [];
  const labelVariants: string[] = [];
  for (const [to, where] of dup) {
    const variants = menus
      .filter((m) => where.includes(m.menu))
      .map((m) => m.rows.find((r) => r.to === to))
      .filter((r): r is Row => Boolean(r));
    const labels = new Set(variants.map((v) => v.label));
    const icons = new Set(variants.map((v) => glyph(v.icon)));
    const homeSlot = HOME_SLOT.test(to);
    if (icons.size > 1 && !homeSlot) {
      iconDrift.push(`${to}: ${variants.map((v) => v.icon).join(' · ')}`);
    }
    if (labels.size > 1) {
      labelVariants.push(`${to}: ${variants.map((v) => v.label).join(' · ')}`);
    }
  }

  /* prefix nesting inside one menu (NavLink double-active class) */
  const nest: string[] = [];
  for (const m of menus) {
    for (const a of m.rows) {
      for (const b of m.rows) {
        if (a.to !== b.to && b.to.startsWith(`${a.to}/`)) nest.push(`${m.menu}: ${a.to} ⊃ ${b.to}`);
      }
    }
  }

  report[role] = {
    destinations: dests.length,
    groups: groups.length,
    visibleRows,
    collapsedGroups: groups.filter((g) => g.collapsed).map((g) => g.label),
    duplicateReachability: dup.map(([to, where]) => ({ to, where })),
    iconDrift,
    labelVariants,
    prefixNesting: nest,
    menuOrder: { sidebar: dests, bottom: (bar[role] ?? []).map((r) => r.to), tabs: (tabs[role] ?? []).map((r) => r.to) },
  };

  md.push(`## ${role}`, '');
  md.push(`- destinations: **${dests.length}** · groups: ${groups.length} · **default visible rows: ${visibleRows}**`);
  md.push(`- collapsed groups: ${groups.filter((g) => g.collapsed).map((g) => g.label).join('، ') || '—'}`);
  md.push(`- reachable from more than one menu: **${dup.length}**`);
  for (const [to, where] of dup) md.push(`  - \`${to}\` → ${where.join(' + ')}`);
  if (iconDrift.length) {
    md.push(`- **icon drift across menus: ${iconDrift.length}**`);
    for (const d of iconDrift) md.push(`  - ${d}`);
  } else md.push('- icon drift across menus: **0** (one glyph per destination)');
  if (labelVariants.length) {
    md.push(`- label variants (bar shortens, documented 5-B5): ${labelVariants.length}`);
    for (const d of labelVariants) md.push(`  - ${d}`);
  }
  const driftIcons = side.rows
    .map((r) => r.icon)
    .filter((g, i, a) => a.indexOf(g) !== i);
  md.push(`- duplicate glyphs inside the sidebar: ${driftIcons.length ? [...new Set(driftIcons)].join(', ') : '0'}`);
  if (nest.length) md.push(`- prefix nesting: ${nest.join(' · ')}`);
  md.push('');
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'nav-audit.json'), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(OUT_DIR, 'nav-audit.md'), `${md.join('\n')}\n`);
if (process.argv.includes('--json')) console.log(JSON.stringify(report, null, 2));
else console.log(md.join('\n'));
