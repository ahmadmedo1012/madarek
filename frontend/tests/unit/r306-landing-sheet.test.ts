/**
 * r306 — the landing drawing-sheet contract («لوحة مدارك»).
 *
 * r306 rebuilds the landing page in the single Heron canon
 * (docs/redesign/r306-heron-exclusivity-spec.md): the OPTIKKA
 * editorial poster (the 3D knowledge world, the copper climax, the
 * --poster-* namespace, the alternating spreads, the giant wordmark)
 * is retired. This sheet pins the new contract that interaction
 * tests cannot see cheaply:
 *   · the poster namespace is GONE from the active runtime scope;
 *   · the world layer / scroll-conductor vocabulary is gone (no
 *     canvas, no data-cam, no story hooks, no useScrollStage);
 *   · the drawing-sheet grammar ships: the sheet frame, the mono
 *     bracketed indices, the hairline ledger rows, the flat
 *     fragments (no elevation, no browser chrome);
 *   · the blueprint hotspot semantics: real buttons, aria-pressed,
 *     a polite live-region panel, keyboard/pointer parity;
 *   · the honest ledger is a hairline TABLE (no inverted slab);
 *   · hygiene: one dark re-point block, the RM belt, zero keyframes,
 *     hover washes guarded to real pointers.
 *
 * Pure fs assertions (landing-scrollspy-grain.test.ts convention):
 * comments are stripped so tombstone prose quoting OLD values can
 * never satisfy a pin.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p: string) => readFileSync(path.join(root, p), 'utf8');
/** Drop /* … *‌/ blocks so comments quoting old values can't satisfy pins. */
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '');

const css = read('src/styles/landing.css');
const live = stripComments(css);
const tsx = read('src/pages/LandingPage.tsx');
/* Strip BOTH comment forms: block comments AND line-start // prose —
 * tombstone narration quoting retired values must neither satisfy a
 * positive pin nor trip a not-contain pin (the landing-funnel
 * convention, extended to line comments; URLs live inside string
 * literals mid-line, never at line start, so the anchored pattern
 * is safe). */
const stripLineComments = (src: string) => src.replace(/^\s*\/\/.*$/gm, '');
const liveTsx = stripLineComments(stripComments(tsx));

describe('r306 — the poster world is retired', () => {
  it('no --poster-* consumer remains anywhere in the landing sheet or page', () => {
    expect(live).not.toMatch(/--poster-/);
    expect(liveTsx).not.toMatch(/--poster-/);
  });

  it('the 3D world vocabulary is gone: no canvas layer, no data-cam, no story hooks, no conductor', () => {
    expect(liveTsx).not.toContain('MadarekWorld');
    expect(liveTsx).not.toContain('data-cam');
    expect(liveTsx).not.toContain('data-story-');
    expect(liveTsx).not.toContain('useScrollStage');
    expect(liveTsx).not.toContain("from 'three'");
    expect(live).not.toContain('.world-layer');
    expect(live).not.toContain('.lv-slab');
    /* R313 override (WP-B2 · D14): `.fo-footer-mark` returns — the
     * measured reference footer carries a giant 215×215 line-logo
     * block (digest.footer), so the r306 giant-WORDMARK retirement
     * is superseded for the MARK (the brand symbol, not the poster
     * wordmark). The rest of the poster vocabulary stays dead. */
  });

  it('the OPTIKKA editorial devices stay retired (dotted grid, paper veil, copper climax)', () => {
    expect(live).not.toContain('fo-hero-gridlines');
    expect(live).not.toMatch(/\.fo-hero-copy::before|\.st-spread::before/);
    expect(live).not.toContain('COPPER CLIMAX');
    expect(liveTsx).not.toContain('fo-scroll-cue');
  });
});

describe('r306 — the drawing sheet ships', () => {
  it('the sheet frame: fixed corner registration marks + mono coordinates, decorative + visible at every breakpoint', () => {
    /* R313 override (WP-A1 · D9): the reference keeps its full-page
     * drafting frame at EVERY viewport (measured 7px inset @1440/768/390
     * — the 390×844 census shows it); the old desktop-only gate
     * (display:none base + the ≥992 block) is superseded. The frame is
     * now a fixed 1px --border-strong rectangle at the 7px inset, with
     * 10×10 corner plus marks + the mono coordinates. */
    expect(liveTsx).toContain('sheet-frame');
    expect(liveTsx).toContain('aria-hidden="true"'); // the frame never floods the a11y tree
    expect(live).toMatch(/\.sheet-frame\s*\{[^}]*position:\s*fixed/);
    expect(live).toMatch(/\.sheet-frame\s*\{[^}]*pointer-events:\s*none/);
    expect(live).toMatch(/\.sheet-frame\s*\{[^}]*border:\s*1px solid var\(--border-strong\)/);
    // all-breakpoint: the old display:none / ≥992 display:block gates are GONE
    expect(live).not.toMatch(/\.sheet-frame\s*\{[^}]*display:\s*none/);
    expect(live).not.toMatch(/@media \(min-width: 992px\)\s*\{\s*\.sheet-frame/);
  });

  it('the header is the 56px hairline bar with the guarded charcoal-cell nav wash', () => {
    /* R313 override (WP-B2 · D8): the bar keeps the 56px height + the
     * bottom hairline, but now rides the reference's own seat — FIXED
     * at the 7px frame inset, transparent at rest (the old blurred
     * glass is gone — Heron has no backdrop-filter). The nav hover is
     * the reference's fill-WIPE recipe: the charcoal slab is the
     * ::before layer (never a background swap on the cell), the label
     * rolls one row (the dual-label track), and the 5×5 mark pair
     * swaps chevron→signal square. */
    expect(live).toMatch(/\.fo-header-inner\s*\{[^}]*min-block-size:\s*56px/);
    expect(live).toMatch(/\.fo-header\s*\{[^}]*border-block-end:\s*1px solid var\(--grid-line\)/);
    expect(live).toMatch(/\.fo-header\s*\{[^}]*position:\s*fixed/);
    expect(live).not.toMatch(/\.fo-header\s*\{[^}]*backdrop-filter/);
    const hoverBlock = live.match(
      /@media \(hover: hover\) and \(pointer: fine\)\s*\{([\s\S]*?)\n\}\s*\n(?=@media|\/\*|\.)/,
    )?.[1] ?? '';
    expect(hoverBlock).toMatch(/\.fo-nav-link:hover\s*\{[^}]*color:\s*var\(--bg\)/);
    expect(hoverBlock).toMatch(/\.fo-nav-link:hover::before\s*\{[^}]*transform:\s*translateY\(0\)/);
    // the wipe slab itself is the charcoal token
    expect(live).toMatch(/\.fo-nav-link::before\s*\{[^}]*background:\s*var\(--text\)/);
    // the dropdown panel: the reference's fold — grid-rows + opacity, no shadow
    expect(live).toMatch(/\.fo-drop\s*\{[^}]*grid-template-rows:\s*0fr/s);
    expect(live).toMatch(/\.fo-nav-item\[data-open='true'\]\s*\.fo-drop\s*\{[^}]*grid-template-rows:\s*1fr/s);
  });

  it('the mono bracketed indices carry the drafting voice (Latin, dir=ltr, tabular)', () => {
    expect(liveTsx).toMatch(/fo-mono[^>]*dir="ltr">\[01\]/);
    for (const n of ['[02]', '[03]', '[04]', '[05]', '[06]', '[07]']) {
      expect(liveTsx).toContain(n);
    }
    expect(live).toMatch(/\.fo-mono\s*\{[^}]*font-variant-numeric:\s*tabular-nums/);
  });
});

describe('r306 → r310 — the elevation illustration (the honest interactive)', () => {
  // The artwork lives in its own module (components/landing/ — the
  // icon-gate's illustrative-diagram authoring zone). R310 promotes
  // the r306 five-pictogram blueprint to the drafted university
  // ELEVATION — same narrative, real architectural drawing.
  const art = read('src/components/landing/ElevationDrawing.tsx');

  it('the SVG artwork is original line work on the token system (no raster, no canvas)', () => {
    expect(liveTsx).toContain('ElevationDrawing');
    // the frame is the exported constant — ONE source shared by the
    // pins, the stations and the geometry (R310 §6)
    expect(art).toContain('export const ELEVATION_VB = { w: 1440, h: 640 } as const;');
    expect(art).toMatch(/viewBox=\{`0 0 \$\{ELEVATION_VB\.w\} \$\{ELEVATION_VB\.h\}`\}/);
    expect(art).not.toContain('<picture>');
    expect(art).not.toContain('<canvas');
    // the ink classes ride the canonical tokens — the artwork follows both themes
    for (const cls of ['.bp-ink', '.bp-hair', '.bp-signal', '.bp-fill']) {
      expect(live).toContain(cls);
    }
    expect(live).toMatch(/\.bp-hair\s*\{[^}]*stroke:\s*var\(--grid-line\)/);
    expect(live).toMatch(/\.bp-signal\s*\{[^}]*stroke:\s*var\(--accent\)/);
    // R310: every drawn element carries the .bp-drawable class — the
    // ink-in selectors NEVER use [pathLength] (Chromium's style
    // invalidation for class changes does not reach SVG elements
    // matched via that attribute selector — documented + reproduced
    // in audits/evidence/r310/repro/; the R308/R309 ink-in was
    // silently stuck hidden by it)
    const pathCount = (art.match(/pathLength=\{1\}/g) ?? []).length;
    const drawableCount = (art.match(/bp-drawable/g) ?? []).length;
    expect(pathCount).toBeGreaterThan(90);
    expect(drawableCount).toBeGreaterThanOrEqual(pathCount);
    expect(live).not.toMatch(/\[pathLength\]/);
    expect(live).not.toMatch(/\.bp-stage \[pathLength\]/);
  });

  it('the hotspots are real buttons with pressed-state semantics over the drawing', () => {
    expect(liveTsx).toMatch(/className="bp-hotspot"/);
    expect(liveTsx).toMatch(/aria-pressed=\{activeStage === i\}/);
    expect(liveTsx).toContain('role="group"');
  });

  it('the details panel is a polite live region — same information with or without the pointer', () => {
    expect(liveTsx).toMatch(/className="bp-panel" role="status" aria-live="polite"/);
    // the panel seeds with stage 01 (informative at zero interaction)
    expect(liveTsx).toContain('useState(0)');
    // every stage's description is present in the source (the honest copy)
    for (const s of ['المحاضرات التفاعلية', 'نقاط الفحص', 'الاختبارات الإلكترونية', 'دورة البحوث والمكتبة', 'مصفوفة الإتقان']) {
      expect(liveTsx).toContain(s);
    }
  });

  it('the mobile flow: the hotspots leave the overlay below 760px (44px chip row, labels carried)', () => {
    const mq = live.match(/@media \(max-width: 760px\)\s*\{([\s\S]*?)\n\}\s*\n@media/)?.[1] ?? '';
    expect(mq).toMatch(/\.bp-hotspots\s*\{[^}]*position:\s*static/s);
    // the SVG micro-labels drop in the flow — nothing renders tiny
    // (grouped selector: .bp-name, .bp-tag, .bp-micro → display:
    // none; the [NN] indices live on the HTML markers, never in the
    // SVG; R310 also drops the mono micro voice at flow widths)
    expect(mq).toContain('.bp-name');
    expect(mq).toContain('.bp-tag');
    expect(mq).toContain('.bp-micro');
    expect(mq).toMatch(/\.bp-micro[\s,\S]*?\{[\s\S]*?display:\s*none/s);
    expect(live).not.toContain('.bp-num');
  });

  it('the SVG carries a full Arabic description (the drawing is informative, not decorative clutter)', () => {
    expect(art).toMatch(/role="img"/);
    expect(art).toContain('aria-label="واجهة معمارية لمبنى التعلّم');
  });

  it('R310 — the elevation is richly drawn: five layered volumes + the drafting furniture', () => {
    // the purpose layers exist (the ink-in schedule consumes data-ink)
    for (const layer of ['bp-l-frame', 'bp-l-grid', 'bp-l-ground', 'bp-l-dims', 'bp-l-journey', 'bp-l-labels']) {
      expect(art).toContain(layer);
    }
    // the five stage volumes exist and carry the active-stage classes
    for (const vol of ['bp-vol-0', 'bp-vol-1', 'bp-vol-2', 'bp-vol-3', 'bp-vol-4']) {
      expect(art).toContain(vol);
    }
    // the drafting furniture: dimension ticks, windows, trees, the clock
    for (const detail of ['DimTick', 'Window', 'bp-stipple', 'bp-hatch', 'bp-micro']) {
      expect(art).toContain(detail);
    }
    // the drawing shares ONE frame with the pins + stations (the
    // exported viewBox constant is the single source)
    expect(art).toContain('export const ELEVATION_VB');
    expect(liveTsx).toContain('data-vx={s.vx}');
  });
});

describe('r306 — the honest ledger is a hairline table', () => {
  it('the capability matrix reads as ruled rows — no inverted slab, no window device', () => {
    /* R313 override (WP-A1 · D7): the capability matrix moved OFF the
     * landing onto /capabilities (the 9-section re-composition); the
     * hairline-table contract is unchanged and now pinned against
     * campus.css (the sub-pages' sheet). The landing's problem cards
     * (.pm-*) carry the same ruled-row grammar. */
    const campusCss = stripComments(read('src/styles/campus.css'));
    expect(campusCss).toMatch(/\.lv-list\s*\{[^}]*border:\s*1px solid var\(--rule\)/);
    expect(campusCss).toMatch(/\.lv-row\s*\{[^}]*border-block-end:\s*1px solid var\(--rule\)/);
    expect(live).not.toContain('.lv-window');
    expect(liveTsx).not.toContain('lv-window');
    // the landing's own ruled family: the four pain cards
    expect(live).toMatch(/\.pm-card\s*\{[^}]*border:\s*1px solid var\(--rule\)/);
    expect(liveTsx).toContain('className="pm-card"');
  });

  it('the chapter rows are one consistent ledger grammar (no alternating poster layouts)', () => {
    expect(live).toMatch(/\.ch\s*\{[^}]*grid-template-columns:/s);
    expect(liveTsx).not.toContain('ch--split');
    expect(liveTsx).not.toContain('ch--bleed');
    expect(liveTsx).not.toContain('ch--offset');
  });

  it('the interface fragments are FLAT — hairline frame, no elevation, no browser chrome', () => {
    expect(live).toMatch(/\.mini\s*\{[^}]*border:\s*1px solid var\(--border-strong\)/);
    expect(live).toMatch(/\.mini\s*\{[^}]*border-radius:\s*var\(--r-xs\)/);
    const miniBlock = live.match(/\.mini\s*\{[^}]*\}/)?.[0] ?? '';
    expect(miniBlock).not.toContain('box-shadow');
    expect(liveTsx).not.toContain('mini-dots');
    expect(liveTsx).toContain('mini-chrome-tag');
    expect(liveTsx).toContain('عرض توضيحي');
  });
});

describe('r306 — the funnel/a11y contracts carried forward', () => {
  it('every chapter keeps its numbered anchor + heading contract', () => {
    for (const id of ['statement', 'chapters', 'live', 'roles', 'colleges', 'vision']) {
      expect(liveTsx).toContain(`id="${id}"`);
    }
    // the chapter headings compose their ids from the registry
    // (ch-${ch.num}-title) — pin the template, not six literals
    expect(liveTsx).toContain('ch-${ch.num}-title');
  });

  it('the colleges registry keeps the accessible strip contract (the #colleges anchor + the public link + the disclosure)', () => {
    /* R313 override (WP-A1 · D7): the interactive chip registry moved
     * off the landing — the registry itself lives on /colleges and the
     * capability/status ledgers on /capabilities. The #colleges anchor
     * survives as the ruled registry strip at the sheet's close: the
     * 25-college count + the demo-data disclosure + the public
     * /colleges link + the login affordance (the funnel's 5th). */
    expect(liveTsx).toMatch(/className="cg-strip"/);
    expect(liveTsx).toContain('id="colleges"');
    expect(liveTsx).toContain('to="/colleges"');
    expect(liveTsx).toContain('formatInt(colleges.length)');
    // the demo-data disclosure rides the strip (never a tooltip)
    expect(liveTsx).toContain('اصطناعية بالكامل');
  });

  it('the honest numbers still compute from the registry (no invented adoption)', () => {
    expect(liveTsx).toContain("from '../data/colleges.config'");
    expect(liveTsx).toContain('LIVE_CAPABILITIES');
    expect(liveTsx).toContain('formatInt(colleges.length)');
  });
});

describe('r306 hygiene — the sheet stays clean', () => {
  it('no duplicated [data-theme="dark"] .landing blocks', () => {
    const count = (live.match(/\[data-theme="dark"\] \.landing\s*\{/g) ?? []).length;
    expect(count).toBe(1);
  });

  it('hover washes are guarded to real pointers (the r283 convention)', () => {
    expect(live).toMatch(/@media \(hover: hover\) and \(pointer: fine\)/);
  });

  it('the reduced-motion static sheet covers every mover', () => {
    expect(live).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.reveal-up\s*\{\s*opacity:\s*1/,
    );
  });

  it('r308 — continuous instruments are SCOPED keyframes, every one collapsed under reduced motion', () => {
    /* The r306 «zero keyframes» policy is superseded by R308's
     * continuous-instrument grammar (the reference's marquee, pulsing
     * markers, scan line, ring crawl, tag snap — parity-matrix §D/E).
     * The contract that survives: every @keyframes is one of the
     * whitelisted instruments, and the reduced-motion belt collapses
     * each of them to its resolved static state. */
    const names = [...live.matchAll(/@keyframes\s+([a-z0-9-]+)/g)].map((m) => m[1]);
    const ALLOWED = new Set([
      'hi-pulse', // the inspection stations' idle pulse
      'fo-ticker-rtl', // the capabilities crawl
      'sl-scan', // the loader's scan sweep
      'wy-snap', // R313: the why-stage verb snap (the 74%-hold plateau — supersedes vs-tag-snap, which moved to campus.css with the status rows)
    ]);
    for (const n of names) {
      expect(ALLOWED.has(n ?? ''), `unexpected @keyframes ${n}`).toBe(true);
    }
    /* every instrument's ANIMATED SELECTOR is collapsed by the RM belt
     * (animation: none → the resolved static state stands) */
    const rmBelt = live.slice(live.indexOf('@media (prefers-reduced-motion: reduce)'));
    const RM_COLLAPSED = [
      '.hi-marker-dot', // hi-pulse
      '.fo-ticker-track', // fo-ticker-rtl
      '.sl-scan', // sl-scan
      '.jt-plan .bp-drawable', // R310: the plan's staged build collapses to the complete plan
      '.pl-zone', // R310: the zone wash highlight
      '.pm-art .pm-draw', // R313: the pain cards' draw-in collapses to the complete drawing
      '.wy-capture', // R313: the why cross-fade collapses to the fully readable stack
      '.wy[data-wy-stage=\'0\'] .wy-rail .wy-stage:nth-child(1) .wy-stage-verb', // R313: the wy-snap
    ];
    for (const sel of RM_COLLAPSED) {
      expect(rmBelt, `RM belt must collapse ${sel}`).toContain(sel);
    }
  });
});
