/**
 * r167 — utility revival pins (fs-level).
 *
 * Two hand-rolled utilities were referenced in TSX but had NO rule in
 * any stylesheet (the r166e dead-utility audit):
 *   - `justify-end` (TeacherLivePage session-form actions) — the
 *     cluster computed justify-content: normal → flex-start, while
 *     every .modal-footer in the design system clusters actions with
 *     justify-content: flex-end. The dead class silently exempted this
 *     one form from the family convention.
 *   - `items-baseline` (ExamAuthorPages label/leader/value row) — its
 *     own source comment promises "Baseline-aligned" rows, but the
 *     computed style was stretch, so the dotted-leader scan line lost
 *     the rhythm the comment describes.
 *
 * r167 defines BOTH utilities in the hand-rolled set (components.css
 * UTILITY HELPERS) and pins the contract on disk:
 *   1. both rules exist (stripComments — tombstone prose can't satisfy
 *      a selector pin);
 *   2. each utility has its live consumer in markup;
 *   3. the .modal-footer flex-end convention is the alignment anchor
 *      justify-end matches (pinned so a future "simplify" can't
 *      silently fork the two edges);
 *   4. the AdminPages actions cluster stays start-packed — the r166e
 *      flip risk is pinned in r166e-actions-column.test.ts (markup
 *      level); this file does not duplicate it.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p: string) => readFileSync(path.join(root, p), 'utf8');
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '');
const styles = readdirSync(path.join(root, 'src/styles'))
  .filter((f) => f.endsWith('.css'))
  .map((f) => stripComments(read(`src/styles/${f}`)));

describe('r167 — revived utilities actually exist', () => {
  it('defines .justify-end and .items-baseline in the hand-rolled set', () => {
    const joined = styles.join('\n');
    expect(joined).toContain('.justify-end { justify-content: flex-end; }');
    expect(joined).toContain('.items-baseline { align-items: baseline; }');
  });

  it('matches the .modal-footer action-cluster convention justify-end mirrors', () => {
    const joined = styles.join('\n');
    expect(joined).toMatch(/\.modal-footer\s*{[^}]*justify-content:\s*flex-end/);
  });
});

describe('r167 — each revived utility has its live consumer', () => {
  it('TeacherLivePage actions cluster carries justify-end (family flex-end edge)', () => {
    const page = stripComments(read('src/pages/teacher/TeacherLivePage.tsx'));
    expect(page).toContain('className="flex justify-end gap-2"');
  });

  it('ExamAuthorPages scan rows carry items-baseline (the documented intent)', () => {
    const page = stripComments(read('src/pages/teacher/ExamAuthorPages.tsx'));
    expect(page).toContain('flex items-baseline gap-2 flex-wrap');
  });
});
