/**
 * r166a — student visual fixes: regression pins (fs-level).
 *
 * Five evidence-verified defects from the r166-E1 live DOM pass, each
 * fixed in CSS/TSX where jsdom can't paint — so the CONTRACT is pinned
 * on disk, the landing-scrollspy-grain.test.ts pattern (stripComments
 * so tombstone prose can't satisfy a selector pin):
 *
 * 1. Lecture player SQUARE video stage (E1 P2, DOM-verified live):
 *    a paused <video> sizes itself by its SQUARE poster
 *    (/brand/madarek-mark.svg, viewBox 64×64 → 818×818 live), and as
 *    in-flow content it stretched the aspect-ratio'd .lecture-video-wrap
 *    into a square (the .lecture-main flex item's auto min-content
 *    block-size). The wrap now owns the geometry: the video is pinned
 *    absolutely inside it (player.css .vpc > video + student.css
 *    .lecture-video) — any poster ratio letterboxes instead of sizing
 *    the stage.
 * 2. Colleges grid jagged rows (E1 P2, measured 151/183/223/168 in
 *    one section grid): rows took their own tallest card's height →
 *    grid-auto-rows: 1fr equalizes the multi-column gallery (≥769px;
 *    the 1-column mobile layout keeps natural row heights).
 * 3. Alerts unread rows were badge-only (E1 P3): .alert.unread now
 *    paints a surface-2 wash + 2px accent bar at inline-start —
 *    token-based, theme-flipping, readable without the badge.
 * 4. The 00:00–06:00 greeting said «سهرة سعيدة» (a soirée — wrong
 *    register for 2am) → «ليلة سعيدة».
 * 5. The dashboard agenda's empty state was a ~325–375px card for one
 *    line (the opt-in 160px illustration + breathing padding) →
 *    illustration dropped + scoped sp-5 padding.
 *
 * Pure fs assertions — no jsdom interaction.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p: string) => readFileSync(path.join(root, p), 'utf8');
/** Drop /* … *‌/ blocks so tombstone prose can't satisfy a selector pin. */
const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');

describe('r166a — lecture player 16:9 video stage owns its geometry', () => {
  const player = stripComments(read('src/styles/player.css'));
  const student = stripComments(read('src/styles/student.css'));

  it('.vpc > video is absolutely pinned to the host frame (inset: 0)', () => {
    const rule = player.match(/\.vpc > video \{[^}]*\}/)?.[0] ?? '';
    expect(rule).toContain('position: absolute');
    expect(rule).toContain('inset: 0');
    expect(rule).toContain('object-fit: contain');
  });

  it('.lecture-video is absolutely pinned to the wrap (the poster can never size the stage)', () => {
    const rule = student.match(/\.lecture-video \{[^}]*\}/)?.[0] ?? '';
    expect(rule).toContain('position: absolute');
    expect(rule).toContain('inset: 0');
    // The wrap keeps the fixed 16:9 frame contract.
    const wrap = student.match(/\.lecture-video-wrap \{[^}]*\}/)?.[0] ?? '';
    expect(wrap).toContain('aspect-ratio: 16 / 9');
    expect(wrap).toContain('position: relative');
  });
});

describe('r166a → G final sweep — colleges gallery is a row list (retired card wall)', () => {
  const colleges = stripComments(read('src/styles/colleges.css'));

  it('the .college-card wall stays retired — only the row affordance (.college-card-arrow) survives', () => {
    // The r264 row recomposition renders RowItem rows; the G sweep
    // deleted the dead card anatomy. A regression that re-introduces
    // the card family (or the pre-r264 grid) must fail here.
    expect(colleges).not.toMatch(/\.college-grid \{/);
    expect(colleges).not.toMatch(/\.college-card \{/);
    expect(colleges).not.toMatch(/\.college-card-cta \{/);
    expect(colleges).not.toMatch(/\.comp-index-/);
    // The one survivor still serves the RowItem trailing affordance.
    expect(colleges).toMatch(/\.college-card-arrow \{/);
  });

  it('the campus chip strip keeps its mobile snap + edge fade contract (r183-B8)', () => {
    // G restored the strip to live service inside the FilterBar's
    // filters group (CollegePages renders className="gallery-chip-strip")
    // after the r264 migration left the class without a consumer.
    const strip = colleges.match(/@media \(max-width: 768px\) \{[\s\S]*?\}/)?.[0] ?? '';
    expect(strip).toContain('.gallery-chip-strip');
    expect(strip).toContain('flex-wrap: nowrap');
    expect(strip).toContain('scroll-snap-type: x mandatory');
    expect(colleges).toContain(
      'mask-image: linear-gradient(to left, transparent 0, var(--surface) 24px)',
    );
    // The TSX actually mounts the strip class in the FilterBar filters.
    const tsx = read('src/pages/colleges/CollegePages.tsx');
    expect(tsx).toContain('<div className="gallery-chip-strip" role="group" aria-label=');
  });
});

describe('r166a — alerts: the unread row carries its own visual state', () => {
  const components = stripComments(read('src/styles/components.css'));

  it('.alert.unread paints tokens only — surface-2 wash + accent inline-start bar', () => {
    const rule = components.match(/\.alert\.unread \{[^}]*\}/)?.[0] ?? '';
    expect(rule).not.toBe('');
    expect(rule).toContain('background: var(--surface-2)');
    expect(rule).toContain('border-inline-start: 2px solid var(--accent)');
    // No raw colors smuggled into the state (color-gate hygiene).
    expect(rule).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(rule).not.toMatch(/rgb\(/);
  });
});

describe('r166a — dashboard greeting + agenda empty state', () => {
  /** The TSX carries the OLD word in its r166a tombstone comment —
   *  strip comments so the pin reads the CODE, not the prose. */
  const dash = stripComments(read('src/pages/student/DashboardPage.tsx'));
  const student = stripComments(read('src/styles/student.css'));

  it('the 00:00–06:00 greeting is «ليلة سعيدة» (the soirée word is gone)', () => {
    expect(dash).toContain("'ليلة سعيدة'");
    expect(dash).not.toContain('سهرة');
  });

  it('r190 — the agenda slot is the TODAY ledger now; the dead .dash-agenda family is deleted', () => {
    // r189 rewired the agenda into the TODAY ledger (LedgerPanel rows);
    // r190 Wave F deletes the orphaned .dash-agenda CSS family (zero TSX
    // consumers since r189). The compact-slot intent survives: the
    // dashboard's empty states carry no illustration anywhere.
    expect(dash).not.toContain('illustration=');
    expect(student).not.toContain('.dash-agenda');
  });
});
