#!/usr/bin/env node
/**
 * r327/scroll-rules-probe.mjs — THE APP SCROLL RULES, PROVEN LIVE (P3).
 *
 * The authenticated app's scroll contract (DESIGN.md §R325/R327 · D6)
 * measured on the running stack, not asserted from source:
 *
 *   A  the guest Lenis engine mounts EXACTLY on guest window-scrolled
 *      surfaces (D6) and never on documents (/legal/*) or the shell;
 *   B  the scrollbar disappears while the engine is live and returns
 *      to the thin token thumb on native surfaces;
 *   C  the authenticated shell scrolls `.content` natively — the window
 *      never scrolls, PUSH resets to top, POP restores (the
 *      useScrollRestoration contract);
 *   D  the scroller is keyboard-operable (arrow/Page keys) and focus
 *      scrolls it into view (scrollable-region-focusable);
 *   E  sticky seats inside `.content` pin against the scroller (the
 *      lecture aside) and inside their own capped scrollports (the
 *      sticky thead);
 *   F  RTL scroll geometry — vertical scroller rests at scrollLeft 0,
 *      no horizontal overflow, and the horizontal strips move toward
 *      NEGATIVE scrollLeft (the CSSOM inline-start convention);
 *   G  prefers-reduced-motion: the engine NEVER inits (native wheel
 *      moves immediately), the duration tokens collapse, reveals fade
 *      without spatial movement;
 *   H  ZERO React commits per scroll tick on the landing (the
 *      imperative-chrome contract) — counted through a fake DevTools
 *      hook installed before app boot;
 *   I  an idle page holds ZERO awake frames (the conductor sleep
 *      contract — `__sheetConductor.running === false` + a real rAF
 *      census over 1s).
 *
 * Evidence: audits/evidence/r327/p3/scroll-rules.json (+ console
 * table). Exit 0 only when every HARD rule holds; SOFT rows are
 * recorded honestly (measured value + verdict) without failing the
 * run — the DESIGN.md section quotes them with their probe numbers.
 *
 * Auth: one real /auth/login per role, cached in /tmp for 12 min
 * (the backend's AUTH_RATE limiter is 10 logins/15min/IP and sibling
 * agents share the IP). Runs with a dead cache skip the authed rows
 * and say so — they never fake them.
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const BASE = (process.env.VITE_URL || 'http://localhost:5173/').replace(/\/$/, '');
const API = process.env.API_URL || 'http://localhost:4000';
const EXEC = process.env.CHROME_BIN || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const OUT = process.env.OUT || path.join(ROOT, 'audits', 'evidence', 'r327', 'p3', 'scroll-rules.json');
const SESSION_CACHE = '/tmp/madarek-r327-sessions.json';
const SESSION_TTL_MS = 12 * 60 * 1000;

/* ── hard/soft verdict bookkeeping ─────────────────────────────────── */
const results = [];
const record = (r) => { results.push(r); console.log(`${r.pass === false ? '✗' : r.pass === true ? '✓' : '·'} ${r.id} ${r.rule}\n    expect: ${r.expect}\n    got:    ${JSON.stringify(r.measured)}${r.note ? `\n    note:   ${r.note}` : ''}`); return r; };
const hard = (id, rule, expect, pass, measured, note) => record({ id, rule, expect, kind: 'hard', pass: Boolean(pass), measured, note });
const soft = (id, rule, expect, measured, note) => record({ id, rule, expect, kind: 'soft', pass: null, measured, note });

/* ── sessions (one login per role, cached) ─────────────────────────── */
async function login(role, email) {
  let cache = {};
  try { cache = JSON.parse(fs.readFileSync(SESSION_CACHE, 'utf8')); } catch { /* fresh */ }
  const hit = cache[role];
  if (hit && Date.now() - hit.ts < SESSION_TTL_MS) return hit.session;
  const res = await fetch(`${API}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: process.env.AUDIT_PASSWORD || '12345678' }),
  });
  if (!res.ok) throw new Error(`login ${role} ${res.status}`);
  const envelope = await res.json();
  const session = envelope?.data ?? envelope;
  if (!session?.accessToken) throw new Error(`login ${role}: no token`);
  cache[role] = { ts: Date.now(), session };
  try { fs.writeFileSync(SESSION_CACHE, JSON.stringify(cache)); } catch { /* /tmp full — in-memory only */ }
  return session;
}

/* ── browser lifecycle (the r324 recycling discipline) ────────────── */
const launch = () => chromium.launch({
  executablePath: EXEC,
  args: ['--disable-dev-shm-usage', '--disable-gpu', '--renderer-process-limit=4', '--process-per-site', '--js-flags=--max-old-space-size=256'],
});

/* NB: init scripts are SERIALIZED as source — a closure over another
 * helper (GUEST_INIT) would die as a ReferenceError in the page and
 * silently skip the seeding (caught by the authSeeded diagnostic), so
 * every init script must be fully self-contained. */
const GUEST_INIT = () => {
  try { sessionStorage.setItem('madarek-intro-skip', '1'); } catch { /* hermetic opt-out */ }
  try { localStorage.setItem('madarek-theme', JSON.stringify({ state: { mode: 'light', modeUpdatedAt: Date.now() }, version: 2 })); } catch { /* n/a */ }
};
const AUTH_INIT = (session) => {
  try { sessionStorage.setItem('madarek-intro-skip', '1'); } catch { /* hermetic opt-out */ }
  try {
    localStorage.setItem('madarek-theme', JSON.stringify({ state: { mode: 'light', modeUpdatedAt: Date.now() }, version: 2 }));
    localStorage.setItem('mdrk-auth', JSON.stringify({ state: { user: session.user, accessToken: session.accessToken }, version: 0 }));
  } catch { /* n/a */ }
};
/* The fake DevTools hook — counts React root commits (probe H). Must
 * exist BEFORE react-dom loads, hence addInitScript. */
const COMMIT_HOOK_INIT = () => {
  if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) return;
  window.__reactCommits = 0;
  window.__reactHookInjected = false;
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    renderers: new Map(),
    supportsFiber: true,
    inject(internals) { window.__reactHookInjected = true; const id = this.renderers.size + 1; this.renderers.set(id, internals); return id; },
    onCommitFiberRoot() { window.__reactCommits += 1; },
    onCommitFiberUnmount() {},
  };
};
/* The rAF census (probe I): counting frames by REQUESTING them keeps
 * the loop awake by construction — a census can never observe its own
 * quiet. Instead the patch (installed pre-boot) counts every rAF
 * REQUEST app code makes; an idle second must add ZERO requests. */
const FRAME_PATCH_INIT = () => {
  const native = window.requestAnimationFrame?.bind(window);
  if (!native) return;
  window.__rafRequests = 0;
  window.requestAnimationFrame = (cb) => { window.__rafRequests += 1; return native(cb); };
};

async function settle(page, ms = 700) {
  await page.waitForFunction(() => (document.querySelector('#root')?.childElementCount ?? 0) > 0, null, { timeout: 30000 });
  await page.waitForTimeout(ms);
}
/* Authenticated routes: wait for the SHELL itself — the first authed
 * hit pays Vite's on-demand transform of the whole shell tree (the
 * r324 census note), so a fixed timeout races the mount. */
async function settleShell(page, ms = 900) {
  try {
    await page.waitForSelector('.content', { timeout: 30000 });
  } catch (e) {
    const state = await page.evaluate(() => ({
      url: location.pathname,
      authSeeded: (() => { try { return Boolean(JSON.parse(localStorage.getItem('mdrk-auth') || 'null')?.state?.accessToken); } catch { return false; } })(),
      rootKids: document.querySelector('#root')?.childElementCount ?? 0,
      bodyText: (document.body.innerText || '').slice(0, 120).replace(/\s+/g, ' '),
    })).catch(() => ({}));
    throw new Error(`settleShell: .content never appeared — ${JSON.stringify(state)}`);
  }
  await page.waitForTimeout(ms);
}
const ua = async (page) => page.evaluate(() => navigator.userAgent);

/* ════════════════════════════════════════════════════════════════════ */
async function main() {
  const ONLY = process.env.ONLY || '';
  const run = (id) => !ONLY || ONLY.split(',').includes(id);
  const browser = await launch();
  const meta = { base: BASE, api: API, capturedAt: new Date().toISOString() };

  /* ── A · the guest engine mounts exactly where D6 says ──────────── */
  if (run('guest')) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript(GUEST_INIT);
    const page = await ctx.newPage();
    const GUEST_ON = ['/', '/auth', '/help', '/about', '/contact', '/colleges'];
    const GUEST_OFF = ['/legal/privacy', '/legal/terms'];
    for (const route of GUEST_ON) {
      await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await settle(page);
      let on = false;
      try {
        await page.waitForFunction(() => document.documentElement.hasAttribute('data-lenis-on'), null, { timeout: 6000 });
        on = true;
      } catch { on = false; }
      hard(`A:${route}`, 'guest window surface mounts the Lenis engine (D6)', 'html[data-lenis-on] present', on, { on, url: page.url() });
    }
    for (const route of GUEST_OFF) {
      await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await settle(page, 1200);
      const on = await page.evaluate(() => document.documentElement.hasAttribute('data-lenis-on'));
      hard(`A:${route}`, 'document sheet stays native (R320 §D)', 'html[data-lenis-on] ABSENT', !on, { on });
    }
    /* B1 — the scrollbar is hidden while the engine is live */
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await settle(page);
    await page.waitForFunction(() => document.documentElement.hasAttribute('data-lenis-on'), null, { timeout: 6000 });
    const b1 = await page.evaluate(() => ({
      attr: document.documentElement.hasAttribute('data-lenis-on'),
      scrollbarWidth: getComputedStyle(document.documentElement).scrollbarWidth,
      gutter: getComputedStyle(document.documentElement).scrollbarGutter,
    }));
    hard('B1', 'scrollbar hidden while Lenis is live (base.css html[data-lenis-on])', "scrollbar-width 'none' + gutter 'stable' on guest sheets",
      b1.scrollbarWidth === 'none' && b1.gutter === 'stable', b1);
    await ctx.close();
  }

  /* ── G · reduced motion: the engine NEVER inits ──────────────────── */
  if (run('rm')) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    await ctx.addInitScript(GUEST_INIT);
    const page = await ctx.newPage();
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await settle(page, 1500);
    const g1 = await page.evaluate(() => ({
      attr: document.documentElement.hasAttribute('data-lenis-on'),
      scrollbarWidth: getComputedStyle(document.documentElement).scrollbarWidth,
      durMedium: getComputedStyle(document.documentElement).getPropertyValue('--motion-duration-medium').trim(),
      durPage: getComputedStyle(document.documentElement).getPropertyValue('--motion-duration-page').trim(),
    }));
    hard('G1', 'RM: the engine never inits — native scroll under RM', 'no data-lenis-on, scrollbar visible, durations collapsed',
      !g1.attr && g1.scrollbarWidth !== 'none' && g1.durMedium === '0ms' && g1.durPage === '80ms', g1);
    /* wheel moves IMMEDIATELY (native) — under Lenis the first motion
     * lands ~156ms later (the Heron probe); under RM it is synchronous */
    await page.mouse.move(720, 450);
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(40);
    const at40 = await page.evaluate(() => window.scrollY);
    await page.waitForTimeout(600);
    const at640 = await page.evaluate(() => window.scrollY);
    hard('G2', 'RM: wheel scrolls natively (no glide)', 'scrollY moves within 40ms of the wheel',
      at40 > 200, { at40ms: at40, at640ms: at640 });
    /* reveals stand COMPLETE at rest under RM (landing.css: .reveal-up
     * { opacity:1; transform:none } + useReveal's immediate in-view) —
     * the landing's belt is the CLASS seat (.reveal-up + .in-view from
     * hooks/useReveal.ts), not the [data-reveal] attribute seat */
    const g3 = await page.evaluate(() => {
      const els = [...document.querySelectorAll('.reveal-up')];
      if (els.length === 0) return { count: 0 };
      const reads = els.slice(0, 5).map((el) => {
        const cs = getComputedStyle(el);
        return { inView: el.classList.contains('in-view'), opacity: cs.opacity, transform: cs.transform };
      });
      return {
        count: els.length, samples: reads,
        allVisible: reads.every((r) => Number(r.opacity) >= 0.99),
        /* .reveal-up.in-view's translateY(0) outspecifies the RM block's
         * `none` — computed reads the IDENTITY matrix; both mean "no
         * spatial movement", which is the rule's substance. */
        allNoTransform: reads.every((r) => r.transform === 'none' || r.transform === 'matrix(1, 0, 0, 1, 0, 0)'),
        allRevealed: els.every((el) => el.classList.contains('in-view')),
      };
    });
    soft('G3', 'RM: reveal seats stand complete at rest (no spatial movement)', 'opacity ≈ 1 · transform none/identity on .reveal-up',
      g3, g3.count === 0 ? 'no .reveal-up seats on the landing this run — inconclusive' : undefined);
    await ctx.close();
  }

  /* ── H + I · zero React commits per scroll tick · zero awake frames ─ */
  if (run('commits')) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript(GUEST_INIT);
    await ctx.addInitScript(COMMIT_HOOK_INIT);
    await ctx.addInitScript(FRAME_PATCH_INIT);
    const page = await ctx.newPage();
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await settle(page, 1200);
    const injected = await page.evaluate(() => window.__reactHookInjected === true);
    if (!injected) {
      soft('H', 'zero React commits per scroll tick', 'fake DevTools hook accepted', { injected },
        'react-dom did not call hook.inject — commit counter inconclusive this run');
    } else {
      const before = await page.evaluate(() => window.__reactCommits);
      await page.mouse.move(720, 450);
      for (let i = 0; i < 14; i++) { await page.mouse.wheel(0, 260); await page.waitForTimeout(220); }
      await page.waitForTimeout(1400);
      const after = await page.evaluate(() => window.__reactCommits);
      hard('H', 'zero React commits per scroll tick (imperative chrome contract)', 'commit delta === 0 across a 14-tick wheel run',
        after - before === 0, { before, after, delta: after - before },
        after - before > 0 ? 'commits observed — inspect which component re-renders on scroll before writing this rule as law' : undefined);
    }
    /* I — idle page = zero awake frames (patched-rAF census: the app
     * itself must request ZERO frames while nothing moves) */
    const idleA = await page.evaluate(() => ({ raf: window.__rafRequests, running: window.__sheetConductor?.running ?? null, subscribers: window.__sheetConductor?.subscribers ?? null, y: Math.round(window.scrollY) }));
    await page.waitForTimeout(1000);
    const idleB = await page.evaluate(() => ({ raf: window.__rafRequests, running: window.__sheetConductor?.running ?? null, subscribers: window.__sheetConductor?.subscribers ?? null }));
    hard('I', 'idle page holds zero awake frames (conductor sleep)', 'conductor not running, 0 subscribers, ZERO new rAF requests in the idle second',
      idleA.running === false && idleA.subscribers === 0 && idleB.raf - idleA.raf === 0, { idleSecondStart: idleA, idleSecondEnd: idleB, rafDelta: idleB.raf - idleA.raf });
    await ctx.close();
  }

  /* ── the guest glide (light check; the full curve probe is the
   *     screencast script's job, on both sites) ────────────────────── */
  if (run('glide')) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript(GUEST_INIT);
    const page = await ctx.newPage();
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await settle(page);
    await page.waitForFunction(() => document.documentElement.hasAttribute('data-lenis-on'), null, { timeout: 6000 });
    await page.evaluate(() => { window.scrollTo(0, 0); });
    await page.waitForTimeout(300);
    await page.mouse.move(720, 450);
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(40);
    const early = await page.evaluate(() => window.scrollY);
    await page.waitForTimeout(700);
    const later = await page.evaluate(() => window.scrollY);
    hard('A:glide', 'guest wheel glides (engine live, not native)', 'a fraction of the delta at +40ms (lerp step 1 ≈ 40px), near target by +740ms',
      early < 200 && later > 150, { at40ms: early, at740ms: later });
    await ctx.close();
  }

  /* ── the authenticated app (student + teacher) ───────────────────── */
  let student = null; let teacher = null;
  if (run('student') || run('teacher') || run('sticky')) {
    try { student = await login('student', process.env.AUDIT_STUDENT_EMAIL || 'student@test.ly'); console.log(`· session student: ${student.user.email} (fresh or cached)`); }
    catch (e) { console.error(`⚠ student login failed (${e.message}) — authed rows skipped, not faked`); }
    try { teacher = await login('teacher', process.env.AUDIT_TEACHER_EMAIL || 'teacher@test.ly'); console.log(`· session teacher: ${teacher.user.email} (fresh or cached)`); }
    catch (e) { console.error(`⚠ teacher login failed (${e.message}) — teacher rows skipped, not faked`); }
  }

  if (student && run('student')) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript(AUTH_INIT, student);
    const page = await ctx.newPage();

    /* C1+C2 — engine OFF, .content is the scroller */
    await page.goto(BASE + '/student/library', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await settleShell(page);
    const landed = await page.evaluate(() => location.pathname);
    if (/^\/auth/.test(landed)) {
      soft('C1', 'authenticated shell: Lenis OFF, .content native (D6)', 'lands on the role route, not /auth', { landed }, 'session bounced — rows skipped, not faked');
    }
    const shellOk = !/^\/auth/.test(landed);
    if (shellOk) {
    const c12 = await page.evaluate(() => {
      const html = document.documentElement;
      const content = document.querySelector('.content');
      if (!content) return { missing: true };
      const cs = getComputedStyle(content);
      return {
        lenisAttr: html.hasAttribute('data-lenis-on'),
        gutterHtml: getComputedStyle(html).scrollbarGutter,
        overflowY: cs.overflowY, overflowX: cs.overflowX,
        overscrollY: cs.overscrollBehaviorY,
        scrollbarWidth: cs.scrollbarWidth,
        scrollbarColor: cs.scrollbarColor,
        dir: document.dir,
        scrollHeight: content.scrollHeight, clientHeight: content.clientHeight,
        scrollWidth: content.scrollWidth, clientWidth: content.clientWidth,
        rectWidth: Math.round(content.getBoundingClientRect().width),
        innerLeft: Math.round(document.querySelector('.content-inner')?.getBoundingClientRect().left ?? -1),
        boxLeft: Math.round(content.getBoundingClientRect().left),
      };
    });
    hard('C1', 'authenticated shell: Lenis OFF, .content native (D6)', 'no data-lenis-on; overflow-y auto; overflow-x clip (Chrome serializes the paired value as hidden); overscroll contain',
      !c12.lenisAttr && c12.overflowY === 'auto' && (c12.overflowX === 'clip' || c12.overflowX === 'hidden') && c12.overscrollY === 'contain', c12,
      c12.overflowX === 'hidden' ? 'computed overflow-x reads hidden — Chrome maps the clip axis of overflow:clip auto to hidden in computed style (verified on a bare page: clipOnly→clip, clipAuto→hidden); the shipped rule is overflow: clip auto' : undefined);
    hard('C2', 'PUSH reset + scroll gutter contract (r299)', 'html gutter auto on shell sheets; .content thin token scrollbar',
      c12.gutterHtml === 'auto' && c12.scrollbarWidth === 'thin', c12);
    soft('C3', '.content long enough to scroll (seeded library)', 'scrollHeight > clientHeight',
      { scrollHeight: c12.scrollHeight, clientHeight: c12.clientHeight, scrollable: c12.scrollHeight > c12.clientHeight + 4 });

    /* C4 — the window NEVER scrolls while .content does */
    const c4 = await page.evaluate(() => {
      const content = document.querySelector('.content');
      content.scrollTop = 400;
      return {
        contentTop: content.scrollTop,
        windowY: window.scrollY,
        docScrollable: document.documentElement.scrollHeight > document.documentElement.clientHeight,
      };
    });
    hard('C4', 'the window never scrolls on shell routes (.content is the only scroller)', 'contentTop 400, window.scrollY 0, doc not scrollable',
      c4.contentTop > 300 && c4.windowY === 0 && !c4.docScrollable, c4);

    /* C5 — PUSH resets .content to top (useScrollRestoration) */
    await page.evaluate(() => { document.querySelector('.content').scrollTop = 600; });
    await page.waitForTimeout(150);
    const savedKey = await page.evaluate(() => sessionStorage.length);
    const link = page.locator('.sidebar a[href="/student/dashboard"]').first();
    await link.click();
    await page.waitForURL('**/student/dashboard', { timeout: 15000 });
    await settleShell(page, 600);
    const c5 = await page.evaluate(() => ({
      path: location.pathname,
      contentTop: document.querySelector('.content')?.scrollTop ?? -1,
    }));
    hard('C5', 'PUSH navigation resets .content to top', 'scrollTop 0 on /student/dashboard after a PUSH',
      c5.path === '/student/dashboard' && c5.contentTop === 0, { ...c5, sessionStorageEntries: savedKey });

    /* C6 — POP restores the saved offset */
    await page.goBack();
    await settleShell(page, 1200);
    const c6 = await page.evaluate(() => ({
      path: location.pathname,
      contentTop: document.querySelector('.content')?.scrollTop ?? -1,
    }));
    soft('C6', 'POP restores the outgoing entry\'s .content offset', 'back to /student/library at ≈600',
      c6, Math.abs(c6.contentTop - 600) > 120 ? `restored ${c6.contentTop}px vs saved 600px — the watcher clamps to what the route can hold; recorded as measured` : undefined);

    /* D — keyboard + focus scrolling */
    await page.goto(BASE + '/student/library', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await settleShell(page, 600);
    const d1 = await page.evaluate(() => {
      const c = document.querySelector('.content');
      c.scrollTop = 0; c.focus();
      return { top: c.scrollTop, focused: document.activeElement === c };
    });
    await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(250);
    const d1b = await page.evaluate(() => document.querySelector('.content').scrollTop);
    await page.keyboard.press('PageDown');
    await page.waitForTimeout(250);
    const d2 = await page.evaluate(() => document.querySelector('.content').scrollTop);
    await page.keyboard.press('Home');
    await page.waitForTimeout(250);
    const d2b = await page.evaluate(() => document.querySelector('.content').scrollTop);
    hard('D1', 'keyboard scrolls .content (scrollable-region-focusable, tabindex=0)', 'ArrowDown moves >0, PageDown moves further, Home returns 0',
      d1b > 0 && d2 > d1b && d2b === 0, { arrowDown6: d1b, pageDown: d2, home: d2b, regionFocused: d1.focused });
    const d3 = await page.evaluate(() => {
      const c = document.querySelector('.content');
      c.scrollTop = 0;
      const focusables = [...c.querySelectorAll('button, a[href], [tabindex="0"]')];
      const far = focusables.find((el) => el.getBoundingClientRect().top > 900);
      if (!far) return { found: false };
      far.focus();
      return { found: true };
    });
    await page.waitForTimeout(400);
    const d3b = await page.evaluate(() => document.querySelector('.content').scrollTop);
    soft('D2', 'focusing an off-screen control scrolls it into view', 'scrollTop > 0 after el.focus() on a below-fold control',
      { ...d3, scrollTopAfter: d3b }, d3.found ? undefined : 'no below-fold focusable on this route — inconclusive');

    /* F1 — RTL vertical scroller geometry at 1440 */
    const f1 = await page.evaluate(() => {
      const c = document.querySelector('.content');
      const r = c.getBoundingClientRect();
      const inner = document.querySelector('.content-inner')?.getBoundingClientRect();
      return {
        dir: document.dir,
        scrollLeft: c.scrollLeft, scrollX: window.scrollX,
        noHorizontalOverflow: c.scrollWidth <= c.clientWidth + 1,
        barOccupiesLayout: r.width - c.clientWidth, /* >0 → classic bar takes space */
        barSide: r.width - c.clientWidth > 2 ? (inner.left - r.left > 2 ? 'inline-start (right in RTL)' : (r.right - inner.right > 2 ? 'inline-end (left in RTL)' : 'inset both')) : 'overlay/none (no layout cost)',
      };
    });
    hard('F1', 'RTL: the vertical scroller rests at scrollLeft 0 with no horizontal overflow', 'scrollLeft 0 · scrollX 0 · scrollWidth ≤ clientWidth',
      f1.scrollLeft === 0 && f1.scrollX === 0 && f1.noHorizontalOverflow, f1);
    soft('F2', 'RTL scrollbar side (inline-end = left) + layout occupation', 'classic bar at inline-end when it occupies layout',
      { barOccupiesLayoutPx: f1.barOccupiesLayout, barSide: f1.barSide },
      f1.barOccupiesLayout === 0 ? 'headless renders overlay scrollbars (clientWidth == box width) — side unverifiable here, marked honestly' : undefined);
    } /* shellOk */

    await ctx.close();
  }

  if (teacher && run('teacher')) {
    /* E2 — sticky thead inside its capped scrollport (.table-wrap.sticky) */
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript(AUTH_INIT, teacher);
    const page = await ctx.newPage();
    await page.goto(BASE + '/teacher/grades', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await settleShell(page, 1200);
    const e2 = await page.evaluate(() => {
      const wrap = document.querySelector('.table-wrap.sticky');
      if (!wrap) return { found: false };
      const thead = wrap.querySelector('thead th');
      if (!thead) return { found: true, thead: false };
      const before = thead.getBoundingClientRect().top;
      wrap.scrollTop = 140;
      const during = thead.getBoundingClientRect().top;
      return { found: true, thead: true, before, during, pinned: Math.abs(before - during) <= 1, wrapOverflow: getComputedStyle(wrap).overflowY };
    });
    hard('E2', 'sticky thead pins inside its own capped scrollport', 'thead rect.top unchanged (±1px) while the wrap scrolls 140px',
      e2.found && e2.thead === true && e2.pinned === true, e2,
      e2.found ? undefined : 'no .table-wrap.sticky on /teacher/grades this run — seat moved? investigate before writing the rule');
    await ctx.close();
  }

  if (student && run('sticky')) {
    /* E1 — sticky aside inside .content (the lecture panel). The lecture
     * id is resolved LIVE (matrix → first offering → its first lecture):
     * a hard-coded id died with the last re-seed (the old /1 probe hit
     * the honest «العنصر غير موجود» state). Viewport 1440×700 — at ×900
     * the lecture sheet fits and .content never scrolls (maxScroll 9px,
     * measured), so the sticky clamp can never engage. */
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 700 } });
    await ctx.addInitScript(AUTH_INIT, student);
    const page = await ctx.newPage();
    let lectureRoute = null;
    try {
      const matrix = await (await fetch(`${API}/api/v1/me/matrix`, { headers: { authorization: `Bearer ${student.accessToken}` } })).json();
      const offeringId = (matrix?.data ?? [])[0]?.offeringId;
      const lec = await (await fetch(`${API}/api/v1/offerings/${offeringId}/lectures`, { headers: { authorization: `Bearer ${student.accessToken}` } })).json();
      const lectureId = (lec?.data ?? [])[0]?.id;
      if (lectureId) lectureRoute = `/student/lectures/${lectureId}`;
    } catch { /* resolved below as null — recorded honestly */ }
    if (!lectureRoute) {
      soft('E1', 'sticky seats inside .content pin against the scroller', 'a live lecture route', { resolved: false }, 'no lecture resolvable for the student — row skipped, not faked');
    } else {
      await page.goto(BASE + lectureRoute, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await settleShell(page, 2500);
      const e1 = await page.evaluate(() => {
        const content = document.querySelector('.content');
        const panel = document.querySelector('.lecture-panel');
        if (!content || !panel) return { found: false };
        content.scrollTop = 0;
        const topVar = getComputedStyle(panel).top;
        const contentTop0 = content.getBoundingClientRect().top;
        const before = Math.round(panel.getBoundingClientRect().top - contentTop0);
        const maxScroll = content.scrollHeight - content.clientHeight;
        content.scrollTop = Math.min(500, maxScroll);
        const scrolled = content.scrollTop;
        const contentTop1 = content.getBoundingClientRect().top;
        /* rect.top is VIEWPORT-frame; sticky offsets are SCROLLPORT-frame
         * (.content's own edge) — the topbar (56px) sits above it. */
        const during = Math.round(panel.getBoundingClientRect().top - contentTop1);
        const stillInside = during >= -1 && during < window.innerHeight;
        return { found: true, topVar, before, during, scrolled, maxScroll: Math.round(maxScroll), stillInside, scrollable: maxScroll > 50 };
      });
      hard('E1', 'sticky seats inside .content pin against the scroller (not the window)', 'panel clamps at its sticky offset (scrollport-frame) while .content scrolls',
        e1.found && e1.scrollable && e1.scrolled > 50 && e1.during > 0 && e1.during <= (parseInt(e1.topVar) || 32) + 8 && e1.stillInside, e1,
        e1.found ? undefined : `no .lecture-panel on ${lectureRoute} this run — seat moved? investigate before writing the rule`);
    }
    await ctx.close();
  }

  /* ── F3 — RTL horizontal strip (the /colleges chip strip @390) ───── */
  if (run('rtl')) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await ctx.addInitScript(GUEST_INIT);
    const page = await ctx.newPage();
    await page.goto(BASE + '/colleges', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await settle(page, 1500);
    const f3 = await page.evaluate(() => {
      const strip = document.querySelector('.gallery-chip-strip');
      if (!strip) return { found: false };
      const overflowX = getComputedStyle(strip).overflowX;
      const rest = strip.scrollLeft;
      const maxNeg = strip.scrollWidth - strip.clientWidth;
      strip.scrollLeft = -80;
      const neg = strip.scrollLeft;
      strip.scrollLeft = 80;
      const pos = strip.scrollLeft;
      strip.scrollLeft = 0;
      return { found: true, overflowX, rest, afterMinus80: neg, afterPlus80: pos, overflowPx: maxNeg };
    });
    soft('F3', 'RTL horizontal strips scroll toward NEGATIVE scrollLeft (CSSOM inline-start)', 'rest 0 · -80 sticks · +80 clamps to 0',
      f3, f3.found ? undefined : 'no .gallery-chip-strip on /colleges @390 — seat moved?');
    await ctx.close();
  }

  meta.userAgent = await (async () => { const b = browser; const c = await b.newContext(); const p = await c.newPage(); const v = await ua(p); await c.close(); return v; })();
  await browser.close();

  /* ── write the evidence + exit ───────────────────────────────────── */
  const out = {
    ...meta,
    summary: {
      hard: results.filter((r) => r.kind === 'hard').length,
      hardFailed: results.filter((r) => r.kind === 'hard' && r.pass === false).length,
      soft: results.filter((r) => r.kind === 'soft').length,
    },
    results,
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(`\n── ${out.summary.hard - out.summary.hardFailed}/${out.summary.hard} hard rules hold · ${out.summary.soft} soft rows recorded → ${OUT}`);
  process.exit(out.summary.hardFailed > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
