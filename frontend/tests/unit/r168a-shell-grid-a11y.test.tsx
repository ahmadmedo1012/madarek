/**
 * r168a — shell, grid and a11y pins (fs-level).
 *
 * Evidence source: the r168 2-a sweep (worklog Task ID 2-a) — DOM-measured
 * defects fixed in this round, each pinned here so a future "simplify"
 * cannot silently resurrect them:
 *
 *  1. GRID-4 FLIP: `.grid-4` declared `container: grid4` on ITSELF, but a
 *     container is only ever queried by its descendants — the r152i band
 *     could never match the top-level strips it was written for, so mobile
 *     KPI grids stayed 4×~70px with width-0 clipped labels (25 consumer
 *     files). r168a gives the band REAL ancestors: the content column
 *     (base.css .content-inner — app shell AND public main) and
 *     .modal-card for dialog strips. Pins: both ancestors carry the
 *     named container, the band exists, and the self-container stays
 *     (nested grid-in-grid support).
 *
 *  2. SCROLL REGION: `.content` is the app's only scroller (body never
 *     scrolls) with no tabindex/role — keyboard users could not
 *     arrow-scroll (axe scrollable-region-focusable, serious). r168a
 *     makes it a labelled region in the tab order. Pin: the three
 *     attributes on the shell's content div + the universal
 *     :focus-visible ring contract that keeps it visible.
 *
 *  3. LECTURE HEADINGS: the player had ZERO h1–h6 (axe
 *     page-has-heading-one). r168a: lecture title → h1, chapters card →
 *     Card heading="h2" (the pixel-identical heading path the Card
 *     primitive already owned); .lecture-meta-title gains margin:0 so
 *     the tag swap is pixel-identical.
 *
 *  4. DANGEROUS GHOST: the admin table's delete action was the LEAST
 *     visible control (text-subtle muted ink) while being the only
 *     irreversible one. r168a adds .btn.ghost.danger on the semantic
 *     rose tokens and switches the row action to it.
 *
 *  5. STUDENT DASHBOARD IDENTITY: every dashboard's outline leads with
 *     its identity except the student one (h1 was the personal
 *     greeting). r168a: sr-only h1 «لوحة الطالب» + the greeting drops
 *     to h2 — the v8 welcome-card hero pixels stay untouched.
 *
 *  6. ROLE CHOOSER GROUP: the register role cards are commit-actions
 *     (tap = choose + advance); r168a names the group so SR users get
 *     the question context in one place.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p: string) => readFileSync(path.join(root, p), 'utf8');
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '');
// JSX comments can wrap attributes — strip them too before pinning markup.
const stripJsx = (src: string) =>
  stripComments(src).replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

describe('r168a — the grid4 flip has REAL query containers', () => {
  it('the content column (both shells) carries the named container', () => {
    const base = stripComments(read('src/styles/base.css'));
    expect(base).toMatch(/\.content-inner\s*{[^}]*container:\s*grid4\s*\/\s*inline-size/);
  });

  it('the modal card carries the named container (dialog strips)', () => {
    const comps = stripComments(read('src/styles/components.css'));
    expect(comps).toMatch(/\.modal-card\s*{[^}]*container:\s*grid4\s*\/\s*inline-size/);
  });

  it('the 2×2 band + the self-container (nested support) survive', () => {
    const comps = stripComments(read('src/styles/components.css'));
    expect(comps).toMatch(
      /\.grid-4\s*{[^}]*container:\s*grid4\s*\/\s*inline-size[^}]*}/,
    );
    expect(comps).toMatch(
      /@container\s+grid4\s*\(max-width:\s*860px\)\s*{[^}]*\.grid-4\s*{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/,
    );
  });

  it('both ancestors are actually rendered by the shells (not dead CSS)', () => {
    expect(stripJsx(read('src/components/layout/AppShell.tsx'))).toContain(
      '<div className="content-inner">',
    );
    // Public main shares the same column class (App.tsx).
    expect(stripJsx(read('src/App.tsx'))).toContain('className="content-inner"');
  });
});

describe('r168a — the scroll region is keyboard-reachable and named', () => {
  it('AppShell content div: tabindex=0 + role=region + Arabic label', () => {
    const shell = stripJsx(read('src/components/layout/AppShell.tsx'));
    expect(shell).toMatch(
      /className="content"[\s\S]{0,120}tabIndex=\{0\}/,
    );
    expect(shell).toMatch(/className="content"[\s\S]{0,200}role="region"/);
    expect(shell).toContain('aria-label="المحتوى الرئيسي"');
  });

  it('the universal :focus-visible ring covers [tabindex]:not([tabindex="-1"])', () => {
    const motion = stripComments(read('src/styles/motion.css'));
    expect(motion).toMatch(
      /\[tabindex\]:not\(\[tabindex="-1"\]\)/,
    );
    expect(motion).toMatch(
      /:focus-visible\s*{[^}]*outline:\s*var\(--state-focus-ring-width\)\s*solid\s*var\(--state-focus-ring-color\)/,
    );
  });
});

describe('r168a — lecture player owns a heading outline', () => {
  /** r220 (4A redesign): the chapters Card became the unified
   *  attachments panel — the heading OUTLINE contract survives: lecture
   *  title = h1, the panel («داخل المحاضرة») = h2, panel sections
   *  (نقاط التفاعل / فصول المحاضرة) = h3. */
  it('lecture title is the h1; the attachments panel is the h2; its sections are h3', () => {
    const page = stripJsx(read('src/pages/student/LecturePlayerPage.tsx'));
    expect(page).toContain('<h1 className="lecture-meta-title">');
    expect(page).toContain('<h2 className="lecture-panel-title">داخل المحاضرة</h2>');
    expect(page).toContain('<h3 className="lecture-panel-sec-title">');
    expect(page).toContain('فصول المحاضرة</h3>');
  });

  it('the tag swap stays pixel-identical (margin reset at source)', () => {
    const css = stripComments(read('src/styles/student.css'));
    expect(css).toMatch(/\.lecture-meta-title\s*{[^}]*margin:\s*0/);
  });

  it('the Card heading path resets UA styles (font/margin inherit)', () => {
    const comps = stripComments(read('src/styles/components.css'));
    expect(comps).toMatch(
      /\.card-title-text\s*{[^}]*font:\s*inherit[^}]*margin:\s*0/,
    );
  });
});

describe('r168a — destructive row actions are danger-tinted ghosts', () => {
  it('the .btn.ghost.danger variant rides the semantic rose tokens', () => {
    const comps = stripComments(read('src/styles/components.css'));
    expect(comps).toMatch(
      /\.btn\.ghost\.danger\s*{[^}]*--_btn-fg:\s*var\(--danger-ink\)[^}]*--_btn-bg-hover:\s*var\(--danger-soft\)/,
    );
  });

  it('the admin courses delete action uses it (not text-subtle)', () => {
    const page = stripJsx(read('src/pages/admin/AdminPages.tsx'));
    expect(page).toContain('className="btn ghost sm danger"');
    expect(page).not.toContain('btn ghost sm text-subtle');
  });
});

describe('r168a — student dashboard leads its outline with its identity', () => {
  it('R189 re-pin: the visible masthead h1 leads every header state (identity first)', () => {
    const page = stripJsx(read('src/pages/student/DashboardPage.tsx'));
    /* R189 «سجلّ مدارك»: the identity is now the VISIBLE masthead h1 —
       the r168a sr-only + welcome-hero form died with the hero banner
       (the r189 VLM trial: the greeting hero was dead weight). The h1
       must still equal resolveTitle('/student/dashboard')'s nav label
       world («لوحة …»), and every header state (pending/error/preview/
       main) shares it. */
    expect(page).toContain('<h1 className="page-title">لوحة التحكم</h1>');
    expect(page.match(/<h1 className="page-title">لوحة التحكم<\/h1>/g)?.length).toBe(4);
    // The greeting rides the masthead subtitle (never a heading).
    expect(page).not.toMatch(/<h2 className="page-title">/);
    // The welcome-hero is gone: no welcome-card anywhere.
    expect(page).not.toContain('welcome-card');
  });
});

describe('r168a — the register role chooser is a named group', () => {
  it('role-card-grid carries role=group + Arabic label', () => {
    const page = stripJsx(read('src/pages/RegisterPage.tsx'));
    expect(page).toContain('className="role-card-grid" role="group" aria-label="نوع الحساب"');
  });
});
