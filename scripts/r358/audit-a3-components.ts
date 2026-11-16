/**
 * R358-UI A3 — measured component-consistency audit.
 *
 * Probes the REAL built app (vite preview + seeded dev API) and records
 * computed geometry/state numbers for the shared component families the
 * checklist names (buttons, inputs, checkbox/switch, tabs/segmented,
 * pills/badges, cards, tables, dialog/palette chrome) in BOTH themes at
 * 1440 and 390. Also computes WCAG contrast for the labeled text pairs
 * it meets. Output: one JSON + one Markdown table into
 * docs/redesign/r358-ui/evidence/web/.
 *
 * Usage:
 *   node backend/dist/server.js &           # seeded dev API on :4000
 *   cd frontend && npx vite preview --port 4173 --strictPort &
 *   npx tsx scripts/r358/audit-a3-components.ts
 */
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { TEST_ACCOUNTS, TEST_PASSWORD } from '../../shared/testAccounts';

const base = 'http://localhost:4173';

/* ── pages to sweep (component families each carries) ─────────────── */
const PAGES = [
  { name: 'auth', route: '/auth', role: null },
  { name: 'student-dashboard', route: '/student/dashboard', role: 'STUDENT' },
  { name: 'settings', route: '/settings', role: 'STUDENT' },
  { name: 'student-results', route: '/student/results', role: 'STUDENT' },
];

const VIEWPORTS = [
  { key: '1440', width: 1440, height: 900 },
  { key: '390', width: 390, height: 844 },
];
const THEMES = ['light', 'dark'];

/* ── in-page probe: shapes computed data for the selectors given ──── */
const PROBE_SRC = `function probe() {

  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height) };
  };
  const cs = (el) => {
    if (!el) return null;
    const c = getComputedStyle(el);
    return {
      h: Math.round(el.getBoundingClientRect().height),
      paddingX: c.paddingInlineStart || c.paddingLeft,
      paddingY: c.paddingTop,
      radius: c.borderRadius,
      border: c.borderWidth,
      bg: c.backgroundColor,
      color: c.color,
      fontSize: c.fontSize,
      fontWeight: c.fontWeight,
      opacity: c.opacity,
      outline: \`\${c.outlineWidth} \${c.outlineStyle} \${c.outlineColor}\`,
      outlineOffset: c.outlineOffset,
      textAlign: c.textAlign,
      overflowX: c.overflowX,
      position: c.position,
      top: c.top,
      caretColor: c.caretColor,
      minHeight: c.minHeight,
    };
  };
  const first = (sel) => cs(document.querySelector(sel));
  const all = (sel) => Array.from(document.querySelectorAll(sel)).slice(0, 6).map(cs);
  const focusFirst = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    el.focus();
    return cs(el);
  };
  return {
    url: location.pathname,
    theme: document.documentElement.getAttribute('data-theme'),
    buttons: {
      primary: first('.btn.primary, .btn.accent'),
      all: all('.btn').slice(0, 4),
      disabled: all('.btn:disabled').slice(0, 2),
      loading: first('.btn[data-loading="true"]'),
      iconOnly: all('.icon-btn').slice(0, 2),
    },
    inputs: {
      text: all('input[type="email"], input[type="password"], input[type="text"], input[type="search"]').slice(0, 4),
      select: first('select'),
      textarea: first('textarea'),
      fieldLabel: first('.field-label, label'),
    },
    choices: {
      checkbox: all('input[type="checkbox"]').slice(0, 2),
      radio: all('input[type="radio"]').slice(0, 2),
      switch: all('[role="switch"], .switch').slice(0, 2),
    },
    tabs: all('.tab').slice(0, 4),
    pills: all('.pill').slice(0, 4),
    cards: all('.card').slice(0, 3),
    table: (() => {
      const wrap = document.querySelector('.table-wrap');
      const th = document.querySelector('.table thead th');
      const td = document.querySelector('.table tbody td');
      const numeric = document.querySelector('.table td.num, .table td[data-num], .table .tbl-num');
      return {
        wrap: wrap ? cs(wrap) : null,
        wrapBox: box(wrap),
        headSticky: th ? cs(th) : null,
        rowCell: td ? cs(td) : null,
        numericCell: numeric ? cs(numeric) : null,
        emptyState: first('.empty, .empty-state, [data-empty]'),
      };
    })(),
    dialog: (() => {
      const d = document.querySelector('.modal-card, .cmd-palette-card, [role="dialog"]');
      return d ? cs(d) : null;
    })(),
    skeleton: all('[data-skeleton], .skeleton').slice(0, 2),
    focusProbe: {
      button: focusFirst('.btn:not(:disabled)'),
      input: focusFirst('input:not([type="hidden"])'),
    },
  };

}`;


/* ── contrast (WCAG 2.x relative luminance) ───────────────────────── */
function lum(rgb: number[]): number {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function parseColor(s: string): number[] | null {
  const m = s.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
  if (!m) return null;
  if (m[4] !== undefined && Number(m[4]) === 0) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}
function ratio(fgS: string, bgS: string): number | null {
  const fg = parseColor(fgS);
  const bg = parseColor(bgS);
  if (!fg || !bg) return null;
  const l1 = lum(fg);
  const l2 = lum(bg);
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
}

/* ── run ──────────────────────────────────────────────────────────── */
async function login(role: string, password: string): Promise<unknown> {
  const res = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: emailFor(role), password }),
  });
  if (!res.ok) throw new Error(`login failed for ${role}: ${res.status}`);
  return (await res.json()).data;
}
function emailFor(role: string): string {
  const acct = TEST_ACCOUNTS.find((a) => a.role === role && !a.scoped && !a.position);
  if (!acct) throw new Error(`no plain account for ${role}`);
  return acct.email;
}

const sessions = new Map();
async function sessionFor(role: string): Promise<unknown> {
  if (!sessions.has(role)) sessions.set(role, await login(role, TEST_PASSWORD));
  return sessions.get(role);
}

console.log('A3 audit written: A3-audit-captures.json + A3-audit.md');
async function main(): Promise<void> {
  const browser = await chromium.launch();
  mkdirSync('docs/redesign/r358-ui/evidence/web', { recursive: true });
  const captures: unknown[] = [];

  for (const v of VIEWPORTS) {
    for (const theme of THEMES) {
      for (const p of PAGES) {
        const context = await browser.newContext({
          viewport: { width: v.width, height: v.height },
          deviceScaleFactor: 1,
          locale: 'ar',
        });
        const session = p.role ? await sessionFor(p.role) : null;
        await context.addInitScript(
          ([sessionArg, mode]) => {
            try {
              localStorage.setItem(
                'madarek-theme',
                JSON.stringify({ state: { mode, modeUpdatedAt: Date.now() }, version: 2 }),
              );
              sessionStorage.setItem('madarek-intro-skip', '1');
            } catch { /* ignore */ }
            if (sessionArg) {
              try {
                localStorage.setItem(
                  'mdrk-auth',
                  JSON.stringify({
                    state: { user: sessionArg.user, accessToken: sessionArg.accessToken },
                    version: 0,
                  }),
                );
              } catch { /* ignore */ }
            }
          },
          [session, theme] as const,
        );
        const page = await context.newPage();
        await page.goto(base + p.route, { waitUntil: 'load', timeout: 45_000 });
        await page.waitForLoadState('networkidle', { timeout: 12_000 }).catch(() => undefined);
        await page.waitForTimeout(1_800);
        for (let i = 0; i < 4; i++) {
          if (!(await page.locator('.onboarding-flow').isVisible().catch(() => false))) break;
          await page.keyboard.press('Escape');
          await page.waitForTimeout(700);
        }
        const data = await page.evaluate(`(${PROBE_SRC})()`) as typeof data;
        captures.push({ page: p.name, viewport: v.key, theme, data });

        // auth page extra: submit empty → error state probe
        if (p.name === 'auth') {
          await page.locator('button[type="submit"], .btn.primary').first().click({ timeout: 3_000 }).catch(() => undefined);
          await page.waitForTimeout(600);
          const err = await page.evaluate(() => {
            const el = document.querySelector('[role="alert"], .field-error, .error-text, .form-error');
            if (!el) return null;
            const c = getComputedStyle(el);
            const parent = el.parentElement;
            const pc = parent ? getComputedStyle(parent) : null;
            return { color: c.color, bg: c.backgroundColor, parentBg: pc?.backgroundColor, text: (el.textContent || '').slice(0, 40) };
          });
          captures.push({ page: 'auth-error', viewport: v.key, theme, data: err });
        }
        await context.close();
      }
    }
  }
  await browser.close();

  /* ── summarize: consistency + contrast tables ─────────────────────── */
  const outDir = 'docs/redesign/r358-ui/evidence/web';
  writeFileSync(path.join(outDir, 'A3-audit-captures.json'), JSON.stringify(captures, null, 1));

  const lines: string[] = ['# A3 — measured component audit', ''];
  const key = (c: { page: string; viewport: string; theme: string }) => `${c.theme}-${c.viewport}`;

  /* button heights across pages/themes — consistency check */
  const btnHeights: string[] = [];
  for (const cap of captures as { page: string; viewport: string; theme: string; data: { buttons?: { primary?: { h?: number } } } }[]) {
    const h = cap.data?.buttons?.primary?.h;
    if (h) btnHeights.push(`${cap.page}/${key(cap)}: ${h}px`);
  }
  lines.push('## Primary button rendered heights', '', ...btnHeights, '');

  /* contrast pairs */
  lines.push('## Contrast pairs (WCAG 2.x)', '');
  const seen = new Set<string>();
  for (const cap of captures as { page: string; viewport: string; theme: string; data: Record<string, unknown> }[]) {
    if (!cap.data || typeof cap.data !== 'object' || Array.isArray(cap.data)) continue;
  const d = cap.data as Record<string, unknown>;
    const pairs: Array<[string, string, string]> = [];
    const pushPair = (name: string, fg: string | undefined, bg: string | undefined) => {
      if (!fg || !bg) return;
      const r = ratio(fg, bg);
      if (r === null) return;
      const id = `${name}@${cap.theme}`;
      if (seen.has(id)) return;
      seen.add(id);
      pairs.push([name, String(r), r >= 4.5 ? 'AA' : r >= 3 ? 'AA-large' : 'FAIL']);
    };
    const b = d.buttons as { primary?: { color?: string; bg?: string } } | undefined;
    if (b?.primary) pushPair('btn.primary text/bg', b.primary.color, b.primary.bg);
    const tabs = d.tabs as Array<{ color?: string; bg?: string }> | undefined;
    if (tabs?.[0]) pushPair('tab text/bg', tabs[0].color, tabs[0].bg);
    const pills = d.pills as Array<{ color?: string; bg?: string }> | undefined;
    if (pills?.[0]) pushPair('pill text/bg', pills[0].color, pills[0].bg);
    const cards = d.cards as Array<{ color?: string; bg?: string }> | undefined;
    if (cards?.[0]) pushPair('card text/bg', cards[0].color, cards[0].bg);
    const inp = d.inputs as { text?: Array<{ color?: string; bg?: string }> } | undefined;
    if (inp?.text?.[0]) pushPair('input text/bg', inp.text[0].color, inp.text[0].bg);
    const th = (d.table as { headSticky?: { color?: string; bg?: string } } | undefined)?.headSticky;
    if (th) pushPair('table th text/bg', th.color, th.bg);
    const err = (d as { color?: string; bg?: string; parentBg?: string });
    if (err.color && err.bg) pushPair('auth error text/bg', err.color, err.bg);
    for (const [name, r, verdict] of pairs) {
      lines.push(`| ${cap.theme} | ${cap.page} | ${name} | ${r} | ${verdict} |`);
    }
  }
  lines.unshift('| theme | page | pair | ratio | verdict |', '|---|---|---|---|---|');

  writeFileSync(path.join(outDir, 'A3-audit.md'), lines.join('\n') + '\n');
}

main().catch((e)=>{ console.error(e); process.exit(1); });
