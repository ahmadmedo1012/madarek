/**
 * R350 S4 — the eval harness: runs the REAL pure engine (planGlobalQuery
 * + rankHit + matchesNormalizedQuery — the exact tiers the route uses)
 * over the corpus for every golden query, then scores Recall@1/5/10,
 * MRR, and the rank-pass latency percentiles. DB-free, deterministic.
 */
import { performance } from 'node:perf_hooks';
import { rankHit, RANK_NONE } from '../../src/modules/search/global.js';
import { normalizeArabicSearch, matchesNormalizedQuery } from '../../src/modules/search/normalize.js';
import { CORPUS, type CorpusEntity } from './corpus.js';
import { buildGoldenSet, type GoldenQuery } from './golden-set.js';

export interface EvalResult {
  queries: number;
  recallAt1: number;
  recallAt5: number;
  recallAt10: number;
  mrr: number;
  rankPassP50Ms: number;
  rankPassP95Ms: number;
}

/** The route's rank law, corpus-shaped: tier over the haystacks, the
 * raw-arm fallback, then the title/id tie-break (rankAndPaginate). */
export function rankCorpus(entities: readonly CorpusEntity[], q: string, qN: string): CorpusEntity[] {
  return entities
    .map((e) => {
      let best = Math.min(...e.haystacks.map((h) => rankHit(normalizeArabicSearch(h), qN)));
      if (best === RANK_NONE && e.haystacks.some((h) => matchesNormalizedQuery(h, q))) best = 2;
      return { e, best };
    })
    .filter((r) => r.best !== RANK_NONE)
    .sort((a, b) => a.best - b.best || (a.e.title < b.e.title ? -1 : a.e.title > b.e.title ? 1 : 0) || (a.e.id < b.e.id ? -1 : 1))
    .map((r) => r.e);
}

/** Role-filter the corpus the way the scope matrix would (student law). */
export function visibleToStudent(entities: readonly CorpusEntity[]): CorpusEntity[] {
  return entities.filter((e) => e.studentVisible && e.institution !== 'b');
}

export function runEval(filter?: (q: GoldenQuery) => boolean): EvalResult {
  const golden = filter === undefined ? buildGoldenSet() : buildGoldenSet().filter(filter);
  let hit1 = 0;
  let hit5 = 0;
  let hit10 = 0;
  let rrSum = 0;
  const times: number[] = [];
  for (const g of golden) {
    const t0 = performance.now();
    const ranked = rankCorpus(CORPUS, g.q, normalizeArabicSearch(g.q));
    times.push(performance.now() - t0);
    const pos = ranked.findIndex((e) => e.id === g.expectedId);
    if (pos >= 0 && pos < 1) hit1 += 1;
    if (pos >= 0 && pos < 5) hit5 += 1;
    if (pos >= 0 && pos < 10) hit10 += 1;
    rrSum += pos >= 0 ? 1 / (pos + 1) : 0;
  }
  times.sort((a, b) => a - b);
  const p = (f: number) => times[Math.min(times.length - 1, Math.floor(times.length * f))] ?? 0;
  return {
    queries: golden.length,
    recallAt1: hit1 / golden.length,
    recallAt5: hit5 / golden.length,
    recallAt10: hit10 / golden.length,
    mrr: rrSum / golden.length,
    rankPassP50Ms: p(0.5),
    rankPassP95Ms: p(0.95),
  };
}
