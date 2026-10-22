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
    expect(live).not.toContain('.fo-footer-mark');
  });

  it('the OPTIKKA editorial devices stay retired (dotted grid, paper veil, copper climax)', () => {
    expect(live).not.toContain('fo-hero-gridlines');
    expect(live).not.toMatch(/\.fo-hero-copy::before|\.st-spread::before/);
    expect(live).not.toContain('COPPER CLIMAX');
    expect(liveTsx).not.toContain('fo-scroll-cue');
  });
});

describe('r306 — the drawing sheet ships', () => {
  it('the sheet frame: fixed corner registration marks + mono coordinates, decorative + desktop-only', () => {
    expect(liveTsx).toContain('sheet-frame');
    expect(liveTsx).toContain('aria-hidden="true"'); // the frame never floods the a11y tree
    expect(live).toMatch(/\.sheet-frame\s*\{[^}]*position:\s*fixed/);
    expect(live).toMatch(/\.sheet-frame\s*\{[^}]*pointer-events:\s*none/);
    // desktop-only: the frame appears ≥992 and never below
    const mq = live.match(/@media \(min-width: 992px\)\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
    expect(mq).toMatch(/\.sheet-frame\s*\{[^}]*display:\s*block/);
    expect(live).toMatch(/\.sheet-frame\s*\{[^}]*display:\s*none/);
  });

  it('the header is the 56px hairline bar with the guarded charcoal-cell nav wash', () => {
    expect(live).toMatch(/\.fo-header-inner\s*\{[^}]*min-block-size:\s*56px/);
    expect(live).toMatch(/\.fo-header\s*\{[^}]*border-block-end:\s*1px solid var\(--grid-line\)/);
    const hoverBlock = live.match(
      /@media \(hover: hover\) and \(pointer: fine\)\s*\{([\s\S]*?)\n\}\s*\n@media/,
    )?.[1] ?? '';
    expect(hoverBlock).toMatch(/\.fo-nav-link:hover\s*\{[^}]*background:\s*var\(--text\)/);
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
    expect(live).toMatch(/\.lv-list\s*\{[^}]*border:\s*1px solid var\(--rule\)/);
    expect(live).toMatch(/\.lv-row\s*\{[^}]*border-block-end:\s*1px solid var\(--rule\)/);
    expect(live).not.toContain('.lv-window');
    expect(liveTsx).not.toContain('lv-window');
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

  it('the colleges registry keeps the accessible chip contract (buttons + pressed + live panel)', () => {
    expect(liveTsx).toMatch(/className="cg-chip"/);
    expect(liveTsx).toMatch(/aria-pressed=\{selectedCollege === c\.slug\}/);
    expect(liveTsx).toMatch(/className="cg-panel" role="status" aria-live="polite"/);
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
      'jt-ring-crawl', // the walkthrough ring's dash crawl
      'vs-tag-snap', // the vision rows' hold-plateau snap
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
      '.vs-status-tag', // vs-tag-snap
    ];
    for (const sel of RM_COLLAPSED) {
      expect(rmBelt, `RM belt must collapse ${sel}`).toContain(sel);
    }
  });
});
