#!/usr/bin/env node
/**
 * R313 baseline digest builder — assembles digest.json (reference-schema) from
 * the census + probe outputs in this directory. Run after all captures.
 */
import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const j = (p) => JSON.parse(fs.readFileSync(path.join(HERE, p), 'utf8'));

const landing = j('primary/meta.json');
const landingStyles = j('primary/styles.json');
const telemetry = j('telemetry.json');
const loaderProbe = j('loader-probe.json');
const transition = j('transition-probe.json');
const probe = j('primary/probe-scroll.json');

const vpHeight = {};
const vpRoot = {};
for (const vp of ['1440x900', '1440x700', '1280x800', '1024x768', '768x1024', '390x844', '360x800']) {
  try { const m = j(`viewports/${vp}/meta.json`); vpHeight[vp] = m.totalHeight; vpRoot[vp.split('x')[0]] = m.rootFontSize; } catch (_) {}
}

// sections: semantic landing sections (exclude wrapper main/canvas rows)
const sections = landing.sections
  .filter(s => s.kind === 'semantic')
  .map((s, i) => ({ n: i + 1, cls: String(s.cls).slice(0, 60), id: s.id || '', height: s.height, pct: Math.round((1000 * s.height) / landing.totalHeight) / 10 }));

// typography samples
const rec = (fn) => landingStyles.records.find(fn);
const h1 = rec(r => r.selector === 'h1') || rec(r => /fo-hero-title/.test(r.className));
const body = rec(r => r.selector === 'p' && /hero-sub|st-line|um-lede/.test(r.className)) || rec(r => r.selector === 'p' && r.styles['font-size'] === '16px');
const microMono = rec(r => /fo-mono/.test(r.className) && r.selector === 'p') || rec(r => /fo-mono/.test(String(r.className)));
const trec = (r) => ({ fontFamily: r.styles['font-family'], fontSize: r.styles['font-size'], fontWeight: r.styles['font-weight'], lineHeight: r.styles['line-height'], color: r.styles['color'], text: (r.text || '').slice(0, 30) });

const cta = telemetry.buttons[0];

// loader timeline (relative to .sl mount)
const thin = loaderProbe.samplesThin;
const mount = thin.find(s => s.present)?.t ?? 0;
const pct100 = thin.find(s => s.pct === '100%')?.t ?? null;
const exitClip = thin.find(s => (s.clipPath || '').includes('polygon'))?.t ?? null;
const detach = [...thin].reverse().find(s => s.present === false)?.t ?? null;

// probe tail: ms from last movement to end of probe
const pts = probe.wheelCurve;
let lastMove = 0;
for (const [t, y] of pts) { if (y !== pts[0][1] && t > lastMove && y !== (pts.find(p => p[0] === lastMove) || [0, -1])[1]) lastMove = t; }
const tailMs = pts.length ? pts[pts.length - 1][0] - lastMove : null;

// roles
const roles = {};
const loginOutcomes = {};
for (const role of ['student', 'teacher', 'quality', 'admin', 'owner']) {
  try {
    const m = j(`roles/${role}/primary/meta.json`);
    const s = j(`roles/${role}/primary/styles.json`);
    roles[role] = { sampled: s.surfaceSweep.sampled, radiusNonZero: s.surfaceSweep.radiusNonZero, shadowNonNone: s.surfaceSweep.shadowNonNone };
    loginOutcomes[role] = { landedUrl: m.url, title: m.title, totalHeight: m.totalHeight, ok: !/\/auth$/.test(new URL(m.url).pathname) };
  } catch (_) { roles[role] = null; loginOutcomes[role] = { ok: false, note: 'not captured' }; }
}

const digest = {
  site: 'madarek-baseline',
  capturedAt: new Date().toISOString(),
  paper: { bodyBg: landing.bodyBg, htmlBg: landing.htmlBg, themeColor: landing.themeColor },
  pageHeight: vpHeight,
  rootFontSize: vpRoot,
  scroller: { type: landing.scroller.type, cls: landing.scroller.cls || '' },
  sections,
  header: {
    height: telemetry.headerStates.atTop.height,
    position: telemetry.headerStates.atTop.position,
    hideShow: null,
    classes: { top: telemetry.headerStates.atTop.cls, scrolled: telemetry.headerStates.scrolledDown1.cls },
  },
  typography: { h1: trec(h1), body: trec(body), microMono: trec(microMono) },
  buttons: [{
    name: 'landing-primary-cta',
    selector: cta.selector,
    text: cta.text,
    default: { ...cta.default.styles, rect: cta.default.rect },
    hover: { ...cta.hover.styles, rect: cta.hover.rect },
  }],
  radius: { policy: 'token ladder --r-* 2/4/6/8/12/16/20/pill (reference is radius-0)', violationsCount: landingStyles.surfaceSweep.radiusNonZero },
  shadows: { policy: 'elev-1..5 charcoal-tinted + accent CTA glow; reference keeps ~1 shadow', violationsCount: landingStyles.surfaceSweep.shadowNonNone },
  loader: {
    visibleMs: detach != null && mount ? detach - mount : null,
    mountAfterNavMs: mount,
    pct100AfterMountMs: pct100 != null && mount ? pct100 - mount : null,
    holdMs: exitClip != null && pct100 != null ? exitClip - pct100 : null,
    logLines: 5,
    exitMs: detach != null && exitClip != null ? detach - exitClip : null,
    exitDesignedMs: 650,
    exitNote: 'exit animation cancelled ~15-21ms in (hard cut) — see NOTES.md D5 + loader-diag.json',
    gating: 'session (sessionStorage madarek-intro-seen)',
  },
  routeTransition: {
    durationMs: transition.summary.sxSweep.durationObserved,
    totalPerceivedMs: transition.summary.totalPerceived,
    clickToUrlChangeMs: transition.summary.clickToUrlChange,
    geometry: 'concurrent: .sx center-out two-band polygon clip (721ms) + GuestReveal top-down inset sweep (500ms token) + 1px traveling rule',
  },
  scroll: { engine: 'native window', probeTailMs: tailMs, note: '3x240px wheel impulses land stepwise 240/480/720, no glide' },
  surfaceSweepPerRole: roles,
  fonts: landingStyles.fonts,
};

fs.writeFileSync(path.join(HERE, 'digest.json'), JSON.stringify(digest, null, 1));
console.log('[digest] written. sections:', sections.length, '| loader visibleMs:', digest.loader.visibleMs, '| roles:', Object.keys(roles).filter(k => roles[k]).join(','));
console.log('[digest] loginOutcomes:', JSON.stringify(loginOutcomes));
