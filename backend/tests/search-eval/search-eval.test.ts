/**
 * R350 S4 + r353-F — the golden-set eval gate.
 *
 * 1. THE TARGETS (the lane brief's law): Recall@5 ≥ 0.95, MRR ≥ 0.85
 *    over the full golden set (every query shape × the corpus).
 * 2. THE REGRESSION GATE: the committed baseline.json — any metric
 *    dropping below its baseline by >0.5% fails CI (the ratchet). The
 *    r353-F corpus expansion re-pinned the baseline in the same commit
 *    that changed the corpus and the engine (the ratchet law).
 * 3. THE FETCH-STAGE GATE (r353-F): the golden set used to exercise
 *    ONLY the pure rank stage — the SQL/plan stage (planGlobalQuery's
 *    variants) was never measured, which is exactly why the
 *    reverse-fold fetch gap (typed «احمد» never fetching a stored
 *    «أحمد») survived. Every non-typo golden query's expected row must
 *    now be inside the fetch model's candidate set (the typo shapes
 *    are exempt by design — a contains scan cannot fuzzy-match, and
 *    trigram-similarity SQL is a documented non-goal of this pass).
 * 4. THE ROLE-LEAK NEGATIVE SETS: a student's ranked results NEVER
 *    contain staff-only entities (questions) or another institution's
 *    people — even when the query literally matches them.
 * 5. The per-shape breakdown pins where recall lives (exact=1.0,
 *    al/diacritic/hamza ≥0.9 — the fold arms earn their keep; the
 *    r353-F registrar shapes — student numbers, phones, emails — at
 *    1.0 R@5).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runEval, rankCorpus, fetchCandidates, visibleToStudent } from './evaluator.js';
import { CORPUS } from './corpus.js';
import { buildGoldenSet, FETCH_EXEMPT_SHAPES } from './golden-set.js';
import { normalizeArabicSearch } from '../../src/modules/search/normalize.js';
import { planGlobalQuery } from '../../src/modules/search/global.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const BASELINE = JSON.parse(readFileSync(join(HERE, 'baseline.json'), 'utf8')) as {
  queries: number; recallAt1: number; recallAt5: number; recallAt10: number; mrr: number; fetchRecall: number;
};

const full = runEval();

describe('R350 S4 — the golden-set targets', () => {
  it(`the full set carries ≥250 queries (measured: ${full.queries})`, () => {
    expect(full.queries).toBeGreaterThanOrEqual(250);
  });

  it(`Recall@5 ≥ 0.95 (measured: ${full.recallAt5.toFixed(3)})`, () => {
    expect(full.recallAt5).toBeGreaterThanOrEqual(0.95);
  });

  it(`MRR ≥ 0.85 (measured: ${full.mrr.toFixed(3)})`, () => {
    expect(full.mrr).toBeGreaterThanOrEqual(0.85);
  });

  it(`Recall@10 ≥ 0.98 (measured: ${full.recallAt10.toFixed(3)})`, () => {
    expect(full.recallAt10).toBeGreaterThanOrEqual(0.98);
  });
});

describe('R350 S4 — the regression ratchet (baseline.json)', () => {
  it('the corpus size is pinned (a silently-shrunk corpus is a silently-weakened gate)', () => {
    expect(full.queries).toBe(BASELINE.queries);
  });
  it('no metric regresses >0.5% below the committed baseline', () => {
    expect(full.recallAt1).toBeGreaterThanOrEqual(BASELINE.recallAt1 - 0.005);
    expect(full.recallAt5).toBeGreaterThanOrEqual(BASELINE.recallAt5 - 0.005);
    expect(full.recallAt10).toBeGreaterThanOrEqual(BASELINE.recallAt10 - 0.005);
    expect(full.mrr).toBeGreaterThanOrEqual(BASELINE.mrr - 0.005);
    expect(full.fetchRecall).toBeGreaterThanOrEqual(BASELINE.fetchRecall - 0.005);
  });
});

describe('r353-F — the FETCH-stage gate (the plan/SQL half the old eval never measured)', () => {
  it(`every non-typo golden query's expected row is inside the fetch candidate set (measured: ${full.fetchRecall.toFixed(3)})`, () => {
    // The gate that would have caught the reverse-fold gap: with the
    // pre-r353-F variants ([raw, normalized] only) this measures 0.559
    // on the same corpus — 44% of realistic registrar queries never
    // reached the ranker at all.
    expect(full.fetchRecall).toBeGreaterThanOrEqual(0.98);
  });

  it('the reverse-fold witness: a plain-alif query fetches the hamza-bearing row', () => {
    const fetched = fetchCandidates(CORPUS, 'احمد');
    expect(fetched.some((e) => e.id === 'st-2')).toBe(true); // stored «أحمد الطاهر»
  });

  it('the ال witness: «الشبكات» fetches «شبكات الحاسب المتقدمة» AND «شبكات» fetches «أساسيات الشبكات»', () => {
    expect(fetchCandidates(CORPUS, 'الشبكات').some((e) => e.id === 'co-6')).toBe(true);
    expect(fetchCandidates(CORPUS, 'شبكات').some((e) => e.id === 'co-1')).toBe(true);
  });

  it('the digit-fold witness: «CS٣١٠» fetches the Latin-coded course; «٢٠٢٤» fetches the student number', () => {
    expect(fetchCandidates(CORPUS, 'CS٣١٠').some((e) => e.id === 'co-2')).toBe(true);
    expect(fetchCandidates(CORPUS, '٢٠٢٤').some((e) => e.id === 'st-1')).toBe(true);
  });

  it('the multiword-order witness: «المهدي محمد» fetches «محمد المهدي»', () => {
    expect(fetchCandidates(CORPUS, 'المهدي محمد').some((e) => e.id === 'st-1')).toBe(true);
  });

  it('the plan is bounded: the variants list never exceeds its cap, whatever the query', () => {
    for (const q of ['اسامه العبار', 'احمد ابراهيم', 'اًلهندسة الكهربائية', 'UZ-2024-00001', 'الخوارزميات المتقطعة الهندسية']) {
      expect(planGlobalQuery(q).variants.length, q).toBeLessThanOrEqual(40);
    }
  });

  it('the typo shapes are the only fetch-exempt class (documented: contains cannot fuzzy-match)', () => {
    const shapes = new Set(buildGoldenSet().map((g) => g.shape));
    for (const exempt of FETCH_EXEMPT_SHAPES) expect(shapes.has(exempt)).toBe(true);
    expect(FETCH_EXEMPT_SHAPES).toEqual(['typo-transpose', 'typo-sub', 'typo-insert', 'typo-delete']);
  });
});

describe('R350 S4 — the role-leak negative sets (the student law)', () => {
  it('a student NEVER sees staff-only entities — even on a query that literally matches them', () => {
    const studentCorpus = visibleToStudent(CORPUS);
    // queries that match the question bank verbatim
    for (const q of ['ما هو بروتوكول TCP', 'عرّف الاستعلام المتشعب', 'OSI']) {
      const ranked = rankCorpus(studentCorpus, q, normalizeArabicSearch(q));
      expect(ranked.filter((e) => e.staffOnly === true)).toHaveLength(0);
    }
  });

  it('a student NEVER sees another institution\'s people', () => {
    const studentCorpus = visibleToStudent(CORPUS);
    for (const q of ['فاطمة', 'عمر المفتي', 'Ibrahim']) {
      const ranked = rankCorpus(studentCorpus, q, normalizeArabicSearch(q));
      expect(ranked.filter((e) => e.institution === 'b' && (e.kind === 'student' || e.kind === 'teacher'))).toHaveLength(0);
    }
  });
});

describe('R350 S4 + r353-F — the per-shape breakdown (where recall lives)', () => {
  const byShape = (shape: string) => runEval((q) => q.shape === shape);
  it('exact queries: Recall@1 ≥ 0.94 (the corpus carries honest duplicate titles across kinds — both rank in the top 2, Recall@5 = 1.0)', () => {
    const r = byShape('exact');
    expect(r.queries).toBeGreaterThanOrEqual(40);
    expect(r.recallAt1).toBeGreaterThanOrEqual(0.94);
    expect(r.recallAt5).toBeGreaterThanOrEqual(0.999);
  });
  it('the fold arms earn their keep: al/diacritic/hamza each ≥0.9 Recall@5 — BOTH directions', () => {
    for (const shape of ['diacritic', 'hamza', 'hamza-reverse', 'teh', 'maqsura', 'clitic', 'keyboard', 'al-reverse']) {
      const r = byShape(shape);
      if (r.queries === 0) continue;
      expect(r.queries, `${shape} carries queries`).toBeGreaterThan(0);
      expect(r.recallAt5, `${shape} recall@5`).toBeGreaterThanOrEqual(0.9);
    }
  });
  it('the registrar shapes answer at 1.0 Recall@5 — student numbers, phones, emails', () => {
    for (const shape of [
      'student-number', 'student-number-tail', 'student-number-lc', 'student-number-ar',
      'phone-trunk', 'phone-intl', 'phone-ar',
      'email', 'email-local', 'email-upper',
    ]) {
      const r = byShape(shape);
      expect(r.queries, `${shape} carries queries`).toBeGreaterThan(0);
      expect(r.recallAt5, `${shape} recall@5`).toBeGreaterThanOrEqual(0.999);
      expect(r.recallAt1, `${shape} recall@1`).toBeGreaterThanOrEqual(0.9);
    }
  });
  it('multiword name order is free («المهدي محمد» finds «محمد المهدي»)', () => {
    const r = byShape('multiword-reversed');
    expect(r.queries).toBeGreaterThanOrEqual(40);
    expect(r.recallAt5).toBeGreaterThanOrEqual(0.99);
  });
  it('1-edit typos answer at the rank tier (the fetch stage is exempt by design)', () => {
    for (const shape of ['typo-transpose', 'typo-sub', 'typo-insert', 'typo-delete']) {
      const r = byShape(shape);
      expect(r.queries, `${shape} carries queries`).toBeGreaterThan(0);
      expect(r.recallAt5, `${shape} recall@5`).toBeGreaterThanOrEqual(0.9);
    }
  });
  it('Eastern-digit course codes hit (the digit fold)', () => {
    const r = byShape('digits');
    expect(r.queries).toBeGreaterThanOrEqual(4);
    expect(r.recallAt5).toBeGreaterThanOrEqual(0.99);
  });
  it('the rank pass stays sub-millisecond at corpus scale (p95 measured)', () => {
    expect(full.rankPassP95Ms).toBeLessThan(5);
  });
});
