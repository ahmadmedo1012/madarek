/**
 * r183-B5 — owner/admin/quality implementer pins (wave B).
 *
 * Source-level contract pins for the fixes whose regression risk lives
 * in markup/shape rather than rendered output (the r166e actions-column
 * pattern: stripComments so tombstone prose can't satisfy a selector
 * pin), plus direct unit tests for the one new pure function:
 *
 *  · [fix 1, A8 P2] the admin courses/students rosters carry the
 *    ≤1024px compact-band column diet (useCompactRosterBand + the
 *    `!compact &&` folds) — no more 162px/57px sideways scroll @768;
 *  · [fix 5, A9 P2] OwnerContentPage resolves its brand swatches at
 *    runtime from the live design tokens — the reference university's
 *    ZU palette (#003461…) can never come back while the copy says
 *    «ألوان علامة مدارك الرسميّة»;
 *  · [fix 6, A10 P2] the owner institution-detail pagination follows
 *    the MessagesInbox RTL convention («السابق» rightward = ChevronRight,
 *    «التالي» leftward = ChevronLeft) — no per-instance scaleX(-1)
 *    mirror that swapped the semantics;
 *  · [fix 7, A9 P3/P1] the course-credits submit gate mirrors the
 *    backend zod bounds, and the faculty census folds duplicate empty
 *    seed rows (name+city key) instead of rendering N identical cards.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { dedupeFacultyCensus } from '../../src/pages/owner/OwnerInstitutionDetailPage';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p: string) => readFileSync(path.join(root, p), 'utf8');
/** Drop /* … *‌/ blocks so tombstone prose can't satisfy a selector pin. */
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '');

/* ── [fix 1] the admin compact-roster band ──────────────────────── */

describe('r183-B5 [A8 P2] — admin rosters carry the ≤1024 compact-band diet', () => {
  it('AdminPages exports the band hook and the courses table folds «تسجيلات»+«الفصول» into the meta line', () => {
    const page = stripComments(read('src/pages/admin/AdminPages.tsx'));
    expect(page).toContain('export function useCompactRosterBand()');
    // The diet: both lowest-priority columns render only above the band…
    expect(page).toContain('{!compact && <th scope="col" className="admin-table-num" style={{ width: 110 }}>تسجيلات</th>}');
    expect(page).toContain('{!compact && <th scope="col" className="admin-table-num" style={{ width: 100 }}>الفصول</th>}');
    // …and the counts ride the name cell's meta line inside it.
    expect(page).toContain('{compact && (');
    expect(page).toContain("countAr(c.offeringCount, ['فصل واحد', 'فصلان', 'فصول', 'فصلاً'])");
    // The skeleton advertises the dieted column count (6), not 8.
    expect(page).toContain('const courseCols = compact ? 6 : 8;');
  });

  it('AdminExtraPages students roster folds «السنة»+«المستوى» through the shared hook', () => {
    const page = stripComments(read('src/pages/admin/AdminExtraPages.tsx'));
    // The shared copy lives in AdminPages (same contract as the family).
    expect(page).toContain('useCompactRosterBand()');
    expect(page).toContain('{!compact && <th scope="col">السنة</th>}');
    expect(page).toContain('{!compact && <th scope="col">المستوى</th>}');
    expect(page).toContain('const studentCols = compact ? 6 : 8;');
  });
});

/* ── [fix 5] the identity card reads the live tokens ────────────── */

describe('r183-B5 [A9 P2] — OwnerContentPage swatches resolve from the live design tokens', () => {
  // Stripped of comments: the fix's own docblock names the old hexes as
  // history — the pin guards executable code, not tombstone prose.
  const page = stripComments(read('src/pages/owner/OwnerContentPage.tsx'));

  it('the reference university palette is gone (the copy says مدارك, the chips must too)', () => {
    expect(page).not.toContain('#003461');
    expect(page).not.toContain('#fed65b');
    expect(page).not.toContain('#a3c9ff');
    expect(page).not.toContain('University of Zawiya');
  });

  it('the swatches read the applied theme at runtime and label the token names', () => {
    expect(page).toContain('getComputedStyle(document.documentElement)');
    expect(page).toContain("token: '--accent'");
    expect(page).toContain("token: '--gold'");
    expect(page).toContain("token: '--accent-soft'");
    // The applied-skin re-resolve: <html data-theme> is watched.
    expect(page).toContain("attributeFilter: ['data-theme']");
    // The token's own name rides the label (the label names WHAT it reads).
    expect(page).toContain('<bdi className="font-mono" dir="ltr">{s.token}</bdi>');
  });
});

/* ── [fix 6] the RTL pagination convention ───────────────────────── */

describe('r183-B5 [A10 P2] — owner institution-detail pagination arrows match MessagesInbox', () => {
  it('«السابق» points right (ChevronRight) and «التالي» points left (ChevronLeft) — no scaleX mirror', () => {
    const page = stripComments(read('src/pages/owner/OwnerInstitutionDetailPage.tsx'));
    expect(page).toContain('<Icon icon={ChevronRight} size={13} />\n                    السابق');
    expect(page).toContain('التالي\n                    <Icon icon={ChevronLeft} size={13} />');
    // The old inverted pair: an ArrowLeft «السابق» + a mirrored «التالي».
    expect(page).not.toContain('scaleX(-1)');
    // The page imports the chevrons it renders.
    expect(page).toContain('ChevronDown, ChevronLeft, ChevronRight');
  });

  it('MessagesInbox keeps the convention this page now follows (the anchor stays put)', () => {
    const inbox = stripComments(read('src/components/messages/MessagesInbox.tsx'));
    expect(inbox).toContain('<Icon icon={ChevronRight} size={14} /> السابق');
    expect(inbox).toContain('التالي <Icon icon={ChevronLeft} size={14} />');
  });
});

/* ── [fix 7] the credits client gate ────────────────────────────── */

describe('r183-B5 [A9 P3] — the course-credits submit gate mirrors the backend bounds', () => {
  it('the submit stays disabled outside 1–10 (Number(\'\')→0 and NaN both fail)', () => {
    const page = stripComments(read('src/pages/owner/OwnerInstitutionDetailPage.tsx'));
    expect(page).toContain('!(courseForm.credits >= 1 && courseForm.credits <= 10)');
  });
});

/* ── [fix 7] the faculty census fold (pure) ─────────────────────── */

const faculty = (over: Partial<Parameters<typeof dedupeFacultyCensus>[0][number]>) => ({
  id: 'fac-x',
  name: 'كلية التربية',
  nameEn: null,
  iconEmoji: null,
  city: 'الزاوية',
  departmentCount: 0,
  studentCount: 0,
  teacherCount: 0,
  courseCount: 0,
  departments: [],
  ...over,
});

describe('r183-B5 [A9 P1] — dedupeFacultyCensus (the duplicate seed fold)', () => {
  it('folds N identical empty rows (same name+city, zero counts) into ONE annotated entry', () => {
    const rows = [
      faculty({ id: 'a', name: 'كلية العلوم', city: 'الزاوية', departmentCount: 2, courseCount: 6, studentCount: 10 }),
      faculty({ id: 'b' }),
      faculty({ id: 'c' }),
      faculty({ id: 'd' }),
      faculty({ id: 'e' }),
    ];
    const census = dedupeFacultyCensus(rows);
    expect(census).toHaveLength(2);
    // The real faculty renders untouched, first (order preserved).
    expect(census[0]).toMatchObject({ faculty: { id: 'a' }, duplicateCount: 1 });
    // The 4 identical empty «كلية التربية» rows fold into one card.
    expect(census[1]).toMatchObject({ faculty: { id: 'b' }, duplicateCount: 4 });
  });

  it('same name in DIFFERENT cities never folds (name+city is the key)', () => {
    const census = dedupeFacultyCensus([
      faculty({ id: 'a', city: 'الزاوية' }),
      faculty({ id: 'b', city: 'طرابلس' }),
    ]);
    expect(census).toHaveLength(2);
    expect(census.every((e) => e.duplicateCount === 1)).toBe(true);
  });

  it('rows with real content are never folded even when name+city match', () => {
    const census = dedupeFacultyCensus([
      faculty({ id: 'a', departmentCount: 3, courseCount: 5, studentCount: 12 }),
      faculty({ id: 'b' }),
    ]);
    expect(census).toHaveLength(2);
    expect(census.every((e) => e.duplicateCount === 1)).toBe(true);
  });

  it('name/city trimming is part of the key, and an empty list stays empty', () => {
    const census = dedupeFacultyCensus([
      faculty({ id: 'a', name: '  كلية العلوم  ', city: ' الزاوية ' }),
      faculty({ id: 'b', name: 'كلية العلوم', city: 'الزاوية' }),
    ]);
    expect(census).toHaveLength(1);
    expect(census[0]?.duplicateCount).toBe(2);
    expect(dedupeFacultyCensus([])).toEqual([]);
  });
});
