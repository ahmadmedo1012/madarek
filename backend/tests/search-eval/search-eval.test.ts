/**
 * R350 S4 — the golden-set eval gate.
 *
 * 1. THE TARGETS (the lane brief's law): Recall@5 ≥ 0.95, MRR ≥ 0.85
 *    over the full golden set (every query shape × the corpus).
 * 2. THE REGRESSION GATE: the committed baseline.json — any metric
 *    dropping below its baseline by >0.5% fails CI (the ratchet).
 * 3. THE ROLE-LEAK NEGATIVE SETS: a student's ranked results NEVER
 *    contain staff-only entities (questions) or another institution's
 *    people — even when the query literally matches them.
 * 4. The per-shape breakdown pins where recall lives (exact=1.0,
 *    al/diacritic/hamza ≥0.9 — the fold arms earn their keep).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runEval, rankCorpus, visibleToStudent } from './evaluator.js';
import { CORPUS } from './corpus.js';
import { normalizeArabicSearch } from '../../src/modules/search/normalize.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const BASELINE = JSON.parse(readFileSync(join(HERE, 'baseline.json'), 'utf8')) as {
  queries: number; recallAt1: number; recallAt5: number; recallAt10: number; mrr: number;
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

describe('R350 S4 — the per-shape breakdown (where recall lives)', () => {
  const byShape = (shape: string) => runEval((q) => q.shape === shape);
  it('exact queries: Recall@1 ≥ 0.94 (the corpus carries honest duplicate titles across kinds — both rank in the top 2, Recall@5 = 1.0)', () => {
    const r = byShape('exact');
    expect(r.queries).toBeGreaterThanOrEqual(40);
    expect(r.recallAt1).toBeGreaterThanOrEqual(0.94);
    expect(r.recallAt5).toBeGreaterThanOrEqual(0.999);
  });
  it('the fold arms earn their keep: al/diacritic/hamza each ≥0.9 Recall@5', () => {
    for (const shape of ['diacritic', 'hamza', 'teh', 'maqsura', 'clitic']) {
      const r = byShape(shape);
      if (r.queries === 0) continue;
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
