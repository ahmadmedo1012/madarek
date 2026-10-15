/**
 * r166e — actions-column regression pin (fs-level).
 *
 * The r166-SMOKE live DOM pass measured the r166b regression on
 * /admin/courses: th «إجراءات» carried the r166b alignment class
 *   (text-align: end → LEFT in RTL) while the td's button cluster kept
 * a justify-end utility that has NO rule in any stylesheet (computed
 * justify-content: normal → flex-start = RIGHT in RTL) — header and
 * buttons on OPPOSITE ends of the column. The sibling /admin/students
 * table is the family pattern (plain th + start-packed cluster, both
 * on the same RIGHT edge in RTL).
 *
 * The contract is pinned on disk (the r166a-student-visual pattern —
 * stripComments so tombstone prose can't satisfy a selector pin):
 *
 * 1. No stylesheet defines the r166b class/rule — it must
 *    not resurrect (it would oppose the start-packed cluster again).
 * 2. The /admin/courses actions th/td are plain and the cluster is
 *    `flex items-center gap-2` — no dead justify-end class left in
 *    the markup for the next source reading to trust.
 * 3. The utility set keeps defining .justify-between but NEVER
 *    .justify-end: defining it would silently flip this cluster (and
 *    the other dead usages, e.g. TeacherLivePage) to flex-end and
 *    re-open the opposite-ends split with the now start-aligned th.
 *
 * The r166b class name is assembled at runtime (`deadClass`) so this
 * pin file keeps the repo-wide sweep grep for the class name
 * empty — the string must not survive anywhere.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p: string) => readFileSync(path.join(root, p), 'utf8');
/** Drop /* … *‌/ blocks so tombstone prose can't satisfy a selector pin. */
const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const styles = readdirSync(path.join(root, 'src/styles'))
  .filter((f) => f.endsWith('.css'))
  .map((f) => stripComments(read(`src/styles/${f}`)));
/** Assembled so this file never spells the dead class out. */
const deadClass = ['admin', 'table', 'actions'].join('-');

describe('r166e — /admin/courses actions column follows the family pattern', () => {
  it('no stylesheet defines the r166b actions-alignment rule (it is gone)', () => {
    for (const css of styles) {
      expect(css).not.toContain(deadClass);
    }
  });

  it('the actions th/td are plain and the cluster carries no dead justify-end', () => {
    const page = stripComments(read('src/pages/admin/AdminPages.tsx'));
    // Plain th/td — the students-table family shape (START edge in RTL).
    expect(page).toContain('<th scope="col">إجراءات</th>');
    expect(page).toContain('<td data-label="الإجراءات">');
    expect(page).not.toContain(deadClass);
    // The cluster is flex items-center gap-2 ONLY: justify-end has no rule
    // (pinned below), so carrying it would be a dead-class trap again.
    expect(page).toContain('<div className="flex items-center gap-2">');
    expect(page).not.toContain('justify-end');
  });

  it('the utility set defines .justify-between but never .justify-end', () => {
    const joined = styles.join('\n');
    expect(joined).toContain('.justify-between {');
    expect(joined).not.toContain('.justify-end');
  });
});
