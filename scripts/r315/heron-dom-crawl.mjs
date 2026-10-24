#!/usr/bin/env node
/**
 * R315 · Task 1-b (agent E-crawl) — Heron DOM/geometry GRAMMAR crawler.
 *
 * For a given URL + viewport this loads https://heronaiapp.com/ ONCE, waits
 * out the loader (poll `.loading` until it disappears, minimum 11 s from
 * navigation — the loader is network-driven, ~5.6–7.2 s observed), then
 * walks every rendered element and dumps a durable JSON grammar record:
 *
 *   · selector:  `sel` (tag + classes) and `path` (chain from body,
 *                nth-of-type disambiguated) — stable class paths builders
 *                and the DOM-geometry judge can code against.
 *   · geometry:  x/y/w/h relative to the `.main-inner` scroller origin —
 *                PHYSICAL coordinates, x measured from the LEFT edge.
 *                Heron is LTR; the RTL mirror for Madarek happens later in
 *                the judge/builders, never inside this capture.
 *   · styles:    font (family/size/weight/line-height/letter-spacing/
 *                transform/color), box (bg, bg-image, 4 border sides,
 *                radius, shadow, opacity), layout (position/display/z/margin/
 *                padding/gap/overflow/transform/object-fit…), plus
 *                ::before/::after paint when present.
 *   · text:      the element's OWN text (direct text nodes, whitespace
 *                collapsed) so specs can quote exact labels.
 *
 * Never-skipped (forced) even when tiny or hidden: header/footer subtrees,
 * headings, p, links, buttons, inputs, lists, tables, svg/img, custom
 * web-component wrappers (HOME-*-WRAP), anything with a data-* attr, and
 * any class carrying a grammar keyword (btn/cta/menu/banner/cookie/ticker/
 * marquee/ruler/tick/frame/deco/logo/dot/mark/hero/card/form/…).
 *
 * Usage (from repo root /home/z/madarek):
 *   node scripts/r315/heron-dom-crawl.mjs --pages landing --viewport 1440x900
 *   node scripts/r315/heron-dom-crawl.mjs --viewport 1440x900        # every page @1440
 *   node scripts/r315/heron-dom-crawl.mjs --all                      # full 24-pass matrix
 *   node scripts/r315/heron-dom-crawl.mjs --url https://heronaiapp.com/foo \
 *        --page-key probe --viewport 1024x768                        # one-off URL
 *
 * Output: _local/heron-dom/<page>-<WxH>.json  (+ shots/<page>-<WxH>-top.png,
 * -footer.png, crawl-log.json). All gitignored local evidence.
 *
 * Politeness: ONE pass per page+viewport. On failure: ONE retry, then the
 * pass is recorded failed and the run moves on. Sequential, 1.5 s gap.
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

/* ── config ──────────────────────────────────────────────────────────── */
const EXE = process.env.HOME + '/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome'; // repo pattern — never `playwright install`
const BASE = 'https://heronaiapp.com';
const OUT_DEFAULT = '_local/heron-dom';
const MIN_WAIT_MS = 11000;      // ≥11 s before measuring (loader + exit + entrance)
const POST_SETTLE_MS = 1600;    // settle after the loader is gone
const LOADER_TIMEOUT_MS = 15000;
const GAP_MS = 1500;            // between passes

const PAGES = {
  landing: '/',
  'contact-us': '/contact-us',
  'about-us': '/about-us',
  pricing: '/pricing',
  'heron-chat-widget': '/heron-chat-widget',
  'heron-dashboard': '/heron-dashboard',
  resources: '/resources',
  'privacy-policy': '/privacy-policy',
  'terms-and-conditions': '/terms-and-conditions',
  'cookie-policy': '/cookie-policy',
  'not-found': '/r315-missing-page', // 404 probe
};
const LANDING_VPS = ['1440x900', '390x844', '768x1024', '1024x768'];
const PAGE_VPS = ['1440x900', '390x844'];

/* ── CLI ─────────────────────────────────────────────────────────────── */
const args = process.argv.slice(2);
const get = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const OUT = path.resolve(process.cwd(), get('out', OUT_DEFAULT));
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(path.join(OUT, 'shots'), { recursive: true });

const jobs = [];
if (args.includes('--url')) {
  jobs.push({ page: get('page-key', 'probe'), path: null, url: get('url', BASE + '/'), vp: get('viewport', '1440x900') });
} else if (args.includes('--all')) {
  for (const vp of LANDING_VPS) jobs.push({ page: 'landing', path: PAGES.landing, vp });
  for (const [page, p] of Object.entries(PAGES)) {
    if (page === 'landing') continue;
    for (const vp of PAGE_VPS) jobs.push({ page, path: p, vp });
  }
} else {
  const pagesArg = get('pages', null);
  const pages = pagesArg ? pagesArg.split(',').map((s) => s.trim()).filter(Boolean) : Object.keys(PAGES);
  const vpArg = get('viewport', null);
  for (const page of pages) {
    if (!PAGES[page]) { console.error(`unknown page key "${page}" (have: ${Object.keys(PAGES).join(', ')})`); process.exit(1); }
    const vps = vpArg ? [vpArg] : (page === 'landing' ? LANDING_VPS : PAGE_VPS);
    for (const vp of vps) jobs.push({ page, path: PAGES[page], vp });
  }
}

/* ── in-page collector (self-contained; serialized into the page) ────── */
const COLLECT = () => {
  const R = (n) => Math.round(n * 100) / 100;
  const mi = document.querySelector('.main-inner');
  let ox = 0, oy = 0, scrollerInfo = null;
  if (mi) {
    const mr = mi.getBoundingClientRect();
    ox = mr.left; oy = mr.top;
    scrollerInfo = { sel: '.main-inner', cls: String(mi.className), scrollHeight: mi.scrollHeight, clientHeight: mi.clientHeight, w: R(mr.width), h: R(mr.height) };
  }
  const loaderEl = document.querySelector('.loading');
  const loaderHidden = loaderEl ? getComputedStyle(loaderEl).display === 'none' : true;

  const FORCE_TAGS = new Set(['header', 'footer', 'nav', 'main', 'section', 'aside', 'article', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'button', 'input', 'select', 'textarea', 'ul', 'ol', 'li', 'dl', 'dt', 'dd', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'form', 'label', 'fieldset', 'legend', 'details', 'summary', 'blockquote', 'figure', 'figcaption', 'hr', 'img', 'svg', 'video', 'canvas', 'iframe', 'embed', 'object', 'picture']);
  const KW = 'cookie,banner,edge,ticker,marquee,ruler,tick,plus,cross,guide,frame,deco,border,logo,wordmark,menu,nav,cta,btn,form,input,submit,subscribe,footer,drop,accordion,tag,breadcrumb,table,card,list,dot,mark,hero,index,coord,label,link,item,cell,badge,award,progress,tab,theme,lang,radio,check,signup,register,auth,field,heading,title,txt,mono'.split(',');
  const PKW = ['btn', 'cta', 'rule', 'banner', 'cookie', 'item', 'link', 'dot', 'mark', 'tick', 'ruler', 'guide', 'card', 'tab', 'input', 'submit', 'subscribe', 'footer', 'header', 'form'];

  const isForced = (el, tag, clsLc) => {
    if (FORCE_TAGS.has(tag)) return true;
    if (tag.includes('-')) return true; // HOME-HERO-WRAP custom wrappers etc.
    if (el.getAttribute('role')) return true;
    for (const a of el.attributes) if (a.name.startsWith('data-')) return true;
    if (clsLc) { for (let i = 0; i < KW.length; i++) if (clsLc.includes(KW[i])) return true; }
    return !!el.closest('header, footer, #heron-cookie-root');
  };
  const pseudoCandidate = (tag, clsLc) => {
    if (tag === 'a' || tag === 'button' || tag === 'p' || tag === 'li' || tag === 'label' || tag === 'input') return true;
    if (!clsLc) return false;
    for (let i = 0; i < PKW.length; i++) if (clsLc.includes(PKW[i])) return true;
    return false;
  };
  const esc = (s) => s.replace(/([^\w-])/g, '\\$1');
  const segOf = (el) => {
    const t = el.tagName.toLowerCase();
    if (el.id) return t + '#' + esc(el.id);
    const cl = el.classList ? Array.from(el.classList).slice(0, 3).map(esc).join('.') : '';
    return cl ? t + '.' + cl : t;
  };
  const pathOf = (el) => {
    const parts = [];
    let cur = el;
    while (cur && cur !== document.body && parts.length < 8) {
      const parent = cur.parentElement;
      let nth = '';
      if (parent) {
        let total = 0;
        for (const s of parent.children) if (s.tagName === cur.tagName) total++;
        if (total > 1) {
          let n = 0;
          for (const s of parent.children) { if (s.tagName === cur.tagName) { n++; if (s === cur) break; } }
          nth = ':nth-of-type(' + n + ')';
        }
      }
      parts.unshift(segOf(cur) + nth);
      cur = parent;
    }
    return 'body' + (parts.length ? ' > ' + parts.join(' > ') : '');
  };
  const pseudoSnap = (ps) => {
    const o = { content: String(ps.content).slice(0, 200), w: ps.width, h: ps.height, bg: ps.backgroundColor, border: ps.borderTopWidth + ' ' + ps.borderTopStyle + ' ' + ps.borderTopColor, radius: ps.borderRadius, pos: ps.position };
    if (ps.backgroundImage !== 'none') o.bgImage = ps.backgroundImage.slice(0, 200);
    if (ps.boxShadow !== 'none') o.shadow = ps.boxShadow;
    return o;
  };

  const elements = [];
  const all = document.querySelectorAll('*');
  for (const el of all) {
    if (loaderHidden && loaderEl && loaderEl.contains(el)) continue;
    const tag = el.tagName.toLowerCase();
    const r = el.getBoundingClientRect();
    const rendered = r.width > 0.5 || r.height > 0.5;
    const clsRaw = el.getAttribute('class') || '';
    const clsLc = clsRaw.toLowerCase();
    const f = isForced(el, tag, clsLc);
    if (!rendered && !f) continue;
    const area = r.width * r.height;
    let t = '';
    for (const n of el.childNodes) if (n.nodeType === 3) t += n.data;
    t = t.replace(/\s+/g, ' ').trim();
    if (t.length > 160) t = t.slice(0, 157) + '…';
    if (!f && area < 2 && !t) continue; // tiny noise cap
    const cs = getComputedStyle(el);
    const hidden = cs.visibility !== 'visible' || parseFloat(cs.opacity) < 0.05;
    if (hidden && !f && area < 9) continue; // tiny hidden noise cap
    const rec = { i: elements.length, tag, sel: segOf(el), path: pathOf(el) };
    if (clsRaw) rec.cls = clsRaw;
    if (el.id) rec.id = el.id;
    rec.x = R(r.left - ox); rec.y = R(r.top - oy); rec.w = R(r.width); rec.h = R(r.height);
    if (cs.position === 'fixed') rec.fixed = true;
    if (hidden) rec.hidden = true;
    if (t) rec.txt = t;
    const attrs = {};
    for (const a of el.attributes) {
      const n = a.name;
      if (n === 'href' || n === 'src' || n === 'type' || n === 'placeholder' || n === 'alt' || n === 'target' || n === 'aria-label' || n === 'role' || n === 'maxlength' || n === 'action' || n === 'method') attrs[n] = a.value.slice(0, 240);
      else if (n.startsWith('data-') && !n.startsWith('data-wf') && !n.startsWith('data-gtm')) attrs[n] = a.value.slice(0, 140);
    }
    if (Object.keys(attrs).length) rec.attrs = attrs;
    rec.font = { family: cs.fontFamily.split(',')[0].replace(/["']/g, '').trim(), size: cs.fontSize, weight: cs.fontWeight, lineHeight: cs.lineHeight, letterSpacing: cs.letterSpacing, transform: cs.textTransform, color: cs.color };
    const box = { bg: cs.backgroundColor, radius: cs.borderRadius };
    if (cs.backgroundImage !== 'none') box.bgImage = cs.backgroundImage.slice(0, 280);
    box.bt = cs.borderTopWidth + ' ' + cs.borderTopStyle + ' ' + cs.borderTopColor;
    box.br = cs.borderRightWidth + ' ' + cs.borderRightStyle + ' ' + cs.borderRightColor;
    box.bb = cs.borderBottomWidth + ' ' + cs.borderBottomStyle + ' ' + cs.borderBottomColor;
    box.bl = cs.borderLeftWidth + ' ' + cs.borderLeftStyle + ' ' + cs.borderLeftColor;
    if (cs.boxShadow !== 'none') box.shadow = cs.boxShadow;
    if (cs.opacity !== '1') box.opacity = cs.opacity;
    rec.box = box;
    const lay = { display: cs.display };
    if (cs.position !== 'static') lay.position = cs.position;
    if (cs.zIndex !== 'auto') lay.zIndex = cs.zIndex;
    if (cs.margin !== '0px') lay.margin = cs.margin;
    if (cs.padding !== '0px') lay.padding = cs.padding;
    if (cs.gap && cs.gap !== 'normal' && cs.gap !== '0px') lay.gap = cs.gap;
    if (cs.overflow !== 'visible') lay.overflow = cs.overflow;
    if (cs.transform !== 'none') lay.transform = cs.transform;
    if (cs.whiteSpace !== 'normal') lay.whiteSpace = cs.whiteSpace;
    if (cs.textAlign !== 'start') lay.textAlign = cs.textAlign;
    if (tag === 'img' || tag === 'video') lay.objectFit = cs.objectFit;
    if (cs.cursor !== 'auto') lay.cursor = cs.cursor;
    rec.layout = lay;
    if (pseudoCandidate(tag, clsLc)) {
      const pb = getComputedStyle(el, '::before');
      if (pb.content && pb.content !== 'none' && pb.content !== 'normal') rec.before = pseudoSnap(pb);
      const pa = getComputedStyle(el, '::after');
      if (pa.content && pa.content !== 'none' && pa.content !== 'normal') rec.after = pseudoSnap(pa);
    }
    elements.push(rec);
  }

  // section skeleton
  const seen = new Set();
  const sections = [];
  for (const el of document.querySelectorAll('section, footer, header, main, [class*="wrap"], [class*="section"], [class*="home-"], [class*="page-"]')) {
    const r = el.getBoundingClientRect();
    if (r.height < 100 || r.width < 40) continue;
    const cls = el.getAttribute('class') || '';
    const key = el.tagName + '|' + cls + '|' + Math.round(r.height);
    if (seen.has(key)) continue;
    seen.add(key);
    sections.push({ tag: el.tagName.toLowerCase(), cls: cls.slice(0, 90), y: R(r.top - oy), h: R(r.height), w: R(r.width) });
  }
  sections.sort((a, b) => a.y - b.y);

  // depth ≤ 4 tree skeleton
  const tree = [];
  const walkTree = (el, d) => {
    if (d > 4 || tree.length > 150) return;
    for (const c of el.children) {
      const r = c.getBoundingClientRect();
      if (r.height >= 30 || d <= 2) {
        tree.push({ d, tag: c.tagName.toLowerCase(), cls: (c.getAttribute('class') || '').slice(0, 80), x: R(r.left - ox), y: R(r.top - oy), w: R(r.width), h: R(r.height) });
        walkTree(c, d + 1);
      }
    }
  };
  walkTree(document.body, 0);

  // :root custom properties (the token layer)
  const rootCs = getComputedStyle(document.documentElement);
  const vars = {};
  for (const p of rootCs) if (p.startsWith('--')) vars[p] = rootCs.getPropertyValue(p).trim().slice(0, 200);

  const loaderState = loaderEl
    ? { present: true, cls: String(loaderEl.className), display: getComputedStyle(loaderEl).display }
    : { present: false };
  return {
    title: document.title,
    lang: document.documentElement.getAttribute('lang'),
    dir: document.documentElement.getAttribute('dir') || 'ltr',
    rootFontSize: rootCs.fontSize,
    htmlBg: rootCs.backgroundColor,
    bodyBg: getComputedStyle(document.body).backgroundColor,
    scroller: scrollerInfo,
    docHeight: R(Math.max(mi ? mi.scrollHeight : 0, document.documentElement.scrollHeight)),
    maxScroll: mi ? mi.scrollHeight - mi.clientHeight : Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
    loader: loaderState,
    cookieNames: document.cookie ? document.cookie.split(';').map((s) => s.trim().split('=')[0]) : [],
    elementTotal: all.length,
    sections, tree, vars, elements,
  };
};

/* ── in-page state snapshot (used by the forced-state probes) ────────── */
const SNAP_ROOTS = (rootSels) => {
  const R = (n) => Math.round(n * 100) / 100;
  const mi = document.querySelector('.main-inner');
  let ox = 0, oy = 0;
  if (mi) { const mr = mi.getBoundingClientRect(); ox = mr.left; oy = mr.top; }
  const out = [];
  const ownText = (el) => { let t = ''; for (const n of el.childNodes) if (n.nodeType === 3) t += n.data; return t.replace(/\s+/g, ' ').trim().slice(0, 160); };
  for (const sel of rootSels) {
    for (const root of document.querySelectorAll(sel)) {
      const walk = (el) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        const rec = {
          tag: el.tagName.toLowerCase(), cls: el.getAttribute('class') || el.id && '#' + el.id || '',
          x: R(r.left - ox), y: R(r.top - oy), w: R(r.width), h: R(r.height),
          display: cs.display, visibility: cs.visibility, opacity: cs.opacity,
          transform: cs.transform === 'none' ? undefined : cs.transform,
          bg: cs.backgroundColor, color: cs.color,
          bt: cs.borderTopWidth + ' ' + cs.borderTopStyle + ' ' + cs.borderTopColor,
          font: cs.fontFamily.split(',')[0].replace(/["']/g, '').trim() + ' ' + cs.fontSize + '/' + cs.fontWeight + ' ' + cs.letterSpacing + ' ' + cs.textTransform,
        };
        const t = ownText(el); if (t) rec.txt = t;
        const href = el.getAttribute('href'); if (href) rec.href = href;
        out.push(rec);
        for (const c of el.children) walk(c);
      };
      walk(root);
    }
  }
  return out;
};

/* ── loader wait ─────────────────────────────────────────────────────── */
async function waitLoader(page) {
  const t0 = Date.now();
  try {
    await page.waitForFunction(() => {
      const l = document.querySelector('.loading');
      if (!l) return true;
      const cs = getComputedStyle(l);
      if (cs.display === 'none') return true;
      if (l.classList.contains('loaded') && parseFloat(cs.opacity) < 0.05) return true;
      return false;
    }, { timeout: LOADER_TIMEOUT_MS, polling: 250 });
    return { gone: true, ms: Date.now() - t0 };
  } catch {
    return { gone: false, ms: Date.now() - t0 };
  }
}

/* ── forced-state probes (same single load — no extra pass) ──────────── */
async function extraStates(page, pageKey, vp) {
  const states = {};
  // header dropdown (desktop landing): hover the has-submenu nav cell, snapshot panel
  if (pageKey === 'landing' && vp === '1440x900') {
    try {
      const sel = '.header-menu-item.has-submenu';
      if (await page.locator(sel).count()) {
        await page.hover(sel, { timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(1000);
        let open = await page.evaluate(() => {
          const d = document.querySelector('.header-menu-dropdown');
          return !!d && getComputedStyle(d).visibility === 'visible' && getComputedStyle(d).opacity !== '0';
        });
        if (!open) { await page.click(sel, { timeout: 5000 }).catch(() => {}); await page.waitForTimeout(1000); }
        states.headerDropdown = await page.evaluate(SNAP_ROOTS, ['.header-menu-dropdown', '.header-menu-item.has-submenu']);
        await page.mouse.move(680, 450); // unhover
      }
    } catch (e) { states.headerDropdown = [{ error: String(e).slice(0, 200) }]; }
  }
  // mobile menu overlay (390 landing): click the MENU cell, snapshot the overlay
  if (pageKey === 'landing' && vp === '390x844') {
    try {
      const sel = '.header-menu-btn';
      if (await page.locator(sel).count()) {
        await page.click(sel, { timeout: 5000 });
        await page.waitForTimeout(1000);
        states.mobileMenu = await page.evaluate(SNAP_ROOTS, ['.header-menu', '.header-menu-btn']);
      }
    } catch (e) { states.mobileMenu = [{ error: String(e).slice(0, 200) }]; }
  }
  // contact form ladder: focus → filled (live verify #B3B3AF → #ED4C1F → #FA3600) + submit hover
  if (pageKey === 'contact-us' && vp === '1440x900') {
    try {
      const n = await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll('input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=checkbox]):not([type=radio]), textarea, select')).slice(0, 8);
        els.forEach((el, i) => el.setAttribute('data-r315-probe', String(i)));
        const btn = document.querySelector('form button[type="submit"], form button, button[class*="submit"]');
        if (btn) btn.setAttribute('data-r315-hover', '1');
        if (els[0]) els[0].focus();
        els.forEach((el) => {
          if (el.tagName === 'SELECT') { if (el.options.length > 1) el.selectedIndex = 1; el.dispatchEvent(new Event('change', { bubbles: true })); return; }
          const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
          const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
          setter.call(el, el.tagName === 'TEXTAREA' ? 'R315 probe message' : 'probe@madarek.ly');
          el.dispatchEvent(new Event('input', { bubbles: true }));
        });
        return els.length;
      });
      await page.waitForTimeout(900);
      states.contactForm = {
        probedInputs: n,
        records: await page.evaluate(SNAP_ROOTS, ['[data-r315-probe]', '[data-r315-hover]', 'form']),
        activeIsProbe: await page.evaluate(() => { const a = document.activeElement; return a ? (a.getAttribute('data-r315-probe') || a.tagName.toLowerCase()) : null; }),
      };
      await page.hover('[data-r315-hover]', { timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(900);
      states.contactSubmitHover = await page.evaluate(SNAP_ROOTS, ['[data-r315-hover]']);
      await page.mouse.move(680, 450);
    } catch (e) { states.contactForm = [{ error: String(e).slice(0, 200) }]; }
  }
  return Object.keys(states).length ? states : null;
}

/* ── one pass ────────────────────────────────────────────────────────── */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const LOG_PATH = path.join(OUT, 'crawl-log.json');

async function crawlOne(ctx, job) {
  const url = job.url || BASE + job.path;
  const [w, h] = job.vp.split('x').map(Number);
  const outFile = path.join(OUT, `${job.page}-${job.vp}.json`);
  for (let attempt = 1; attempt <= 2; attempt++) {
    const page = await ctx.newPage();
    const t0 = Date.now();
    try {
      const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      const status = resp ? resp.status() : null;
      const loader = await waitLoader(page);
      const elapsed = Date.now() - t0;
      if (elapsed < MIN_WAIT_MS) await page.waitForTimeout(MIN_WAIT_MS - elapsed);
      try { await page.evaluate(() => document.fonts.ready); } catch {}
      await page.waitForTimeout(POST_SETTLE_MS);
      const data = await page.evaluate(COLLECT);
      // at-rest shot, then footer shot (scroll the lenis wrapper, not the window)
      await page.screenshot({ path: path.join(OUT, 'shots', `${job.page}-${job.vp}-top.png`) });
      try {
        await page.evaluate(() => { const mi = document.querySelector('.main-inner'); if (mi) mi.scrollTop = mi.scrollHeight; else window.scrollTo(0, document.documentElement.scrollHeight); });
        await page.waitForTimeout(1300);
        await page.screenshot({ path: path.join(OUT, 'shots', `${job.page}-${job.vp}-footer.png`) });
      } catch {}
      const states = await extraStates(page, job.page, job.vp);
      const payload = {
        meta: {
          site: 'heron', page: job.page, url, finalUrl: page.url(), status,
          viewport: job.vp, capturedAt: new Date().toISOString(),
          loaderWait: loader, totalWaitMs: Date.now() - t0,
          coords: 'physical (x from LEFT), relative to .main-inner origin',
          note: 'single pass; states probed in-page after the at-rest walk',
        },
        ...data,
        states,
      };
      fs.writeFileSync(outFile, JSON.stringify(payload));
      const rec = { page: job.page, viewport: job.vp, ok: true, attempts: attempt, status, loaderGoneMs: loader.ms, totalMs: Date.now() - t0, elements: data.elements.length, bytes: fs.statSync(outFile).size };
      console.log(`✓ ${job.page}-${job.vp}  status=${status} loader=${loader.ms}ms els=${data.elements.length} (${(rec.bytes / 1e6).toFixed(1)}MB)`);
      await page.close();
      return rec;
    } catch (e) {
      await page.close().catch(() => {});
      if (attempt === 1) { console.log(`  ↻ retry ${job.page}-${job.vp}: ${String(e).slice(0, 140)}`); await sleep(2500); }
      else return { page: job.page, viewport: job.vp, ok: false, attempts: 2, error: String(e).slice(0, 300), totalMs: Date.now() - t0 };
    }
  }
}

/* ── run ─────────────────────────────────────────────────────────────── */
const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox', '--force-color-profile=srgb', '--font-render-hinting=none'] });
const vps = [...new Set(jobs.map((j) => j.vp))];
const log = fs.existsSync(LOG_PATH) ? JSON.parse(fs.readFileSync(LOG_PATH, 'utf8')) : [];
console.log(`▸ heron-dom-crawl: ${jobs.length} pass(es) across ${vps.length} viewport(s) → ${OUT}`);
for (const vp of vps) {
  const [w, h] = vp.split('x').map(Number);
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, locale: 'en-US', reducedMotion: 'no-preference' });
  for (const job of jobs.filter((j) => j.vp === vp)) {
    const rec = await crawlOne(ctx, job);
    log.push(rec);
    fs.writeFileSync(LOG_PATH, JSON.stringify(log, null, 1));
    await sleep(GAP_MS);
  }
  await ctx.close();
}
await browser.close();
const fails = log.slice(-jobs.length).filter((r) => !r.ok);
console.log(`✓ done — ${jobs.length - fails.length}/${jobs.length} ok${fails.length ? '; FAILED: ' + fails.map((f) => f.page + '-' + f.viewport).join(', ') : ''}`);
