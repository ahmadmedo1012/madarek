/**
 * R350 S4 + r353-F — the eval harness: runs the REAL pure engine
 * (planGlobalQuery + rankHit + matchesNormalizedQuery + the r353-F
 * fetch/rank arms — the exact tiers the route uses) over the corpus
 * for every golden query, then scores Recall@1/5/10, MRR, the
 * rank-pass latency percentiles, and — new in r353-F — FETCH-stage
 * recall: would the SQL contains arms (the plan's variants + the
 * identifier/phone arms) actually FETCH the expected row? The old
 * harness only measured the rank stage, so the reverse-fold fetch gap
 * (typed «احمد» vs stored «أحمد») was invisible to it. DB-free,
 * deterministic.
 */
import { performance } from 'node:perf_hooks';
import {
  RANK_NONE,
  RANK_SUBSTRING,
  identifierHit,
  multiwordHit,
  phoneHit,
  planGlobalQuery,
  rankHit,
  typoHit,
} from '../../src/modules/search/global.js';
import { normalizeArabicSearch, matchesNormalizedQuery } from '../../src/modules/search/normalize.js';
import { CORPUS, type CorpusEntity } from './corpus.js';
import { buildGoldenSet, FETCH_EXEMPT_SHAPES, type GoldenQuery } from './golden-set.js';

const FETCH_EXEMPT: ReadonlySet<string> = new Set(FETCH_EXEMPT_SHAPES);

export interface EvalResult {
  queries: number;
  recallAt1: number;
  recallAt5: number;
  recallAt10: number;
  mrr: number;
  /** r353-F: the share of non-typo golden queries whose expected row the
   * SQL fetch stage would actually have fetched. */
  fetchRecall: number;
  rankPassP50Ms: number;
  rankPassP95Ms: number;
}

/**
 * The route's rank law, corpus-shaped: tier over the haystacks, the
 * raw-arm fallback, the r353-F multiword/typo last resorts, and the
 * identifier/phone tiers (identifierHit/phoneHit — the registrar arms),
 * then the title/id tie-break (rankAndPaginate).
 */
export function rankCorpus(entities: readonly CorpusEntity[], q: string, qN: string): CorpusEntity[] {
  const plan = planGlobalQuery(q);
  const phoneProfile = (e: CorpusEntity) => ({
    studentPhoneNormalized: e.studentPhoneNormalized ?? null,
    guardianPhoneNormalized: e.guardianPhoneNormalized ?? null,
  });
  return entities
    .map((e) => {
      let best = Math.min(...e.haystacks.map((h) => rankHit(normalizeArabicSearch(h), qN)));
      if (best === RANK_NONE && e.haystacks.some((h) => matchesNormalizedQuery(h, q))) best = RANK_SUBSTRING;
      if (best === RANK_NONE && multiwordHit(e.haystacks, plan)) best = RANK_SUBSTRING;
      if (best === RANK_NONE && typoHit(e.haystacks, plan)) best = RANK_SUBSTRING;
      // The registrar tiers: exact student number/email at the exact
      // tier, contains/phone at the substring tier.
      const universityIdRank = identifierHit(e.universityId, plan);
      if (universityIdRank !== RANK_NONE) best = Math.min(best, universityIdRank);
      const emailRank = identifierHit(e.email, plan);
      if (emailRank !== RANK_NONE) best = Math.min(best, emailRank);
      if (phoneHit(phoneProfile(e), plan)) best = Math.min(best, RANK_SUBSTRING);
      return { e, best };
    })
    .filter((r) => r.best !== RANK_NONE)
    .sort((a, b) => a.best - b.best || (a.e.title < b.e.title ? -1 : a.e.title > b.e.title ? 1 : 0) || (a.e.id < b.e.id ? -1 : 1))
    .map((r) => r.e);
}

/**
 * r353-F — the FETCH-stage model: which rows the SQL `contains` arms
 * would return for this query. Mirrors the route's WHERE construction:
 * the plan's variants (raw, normalized, ال/clitic arms, reverse folds,
 * per-word arms) tried case-insensitively against every armed column
 * (name haystacks + email + universityId), plus the E1 phone arm
 * (phoneDigits contains on the normalized phone columns). The typo
 * shapes are exempt by design — a contains scan cannot fuzzy-match,
 * and trigram-similarity SQL is a documented non-goal of this pass.
 */
export function fetchCandidates(entities: readonly CorpusEntity[], q: string): CorpusEntity[] {
  const plan = planGlobalQuery(q);
  const needles = plan.variants.map((v) => v.trim().toLowerCase()).filter((n) => n.length >= 2);
  // Hoisted so the closure below narrows (a `!== null` check in the
  // condition cannot narrow plan.phoneDigits INSIDE the callback).
  const phoneDigits = plan.phoneDigits;
  return entities.filter((e) => {
    const fields = [
      ...e.haystacks,
      e.email ?? '',
      e.universityId ?? '',
      e.studentPhoneNormalized ?? '',
      e.guardianPhoneNormalized ?? '',
    ].map((f) => f.toLowerCase());
    if (needles.some((n) => fields.some((f) => f.includes(n)))) return true;
    if (
      plan.isPhoneQuery &&
      phoneDigits !== null &&
      fields.some((f) => f.includes(phoneDigits))
    ) {
      return true;
    }
    return false;
  });
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
  // The fetch-stage recall (r353-F): every non-exempt golden query's
  // expected row must be inside the SQL fetch's candidate set — the
  // gate that would have caught the reverse-fold gap.
  const fetchMeasured = golden.filter((g) => !FETCH_EXEMPT.has(g.shape));
  const fetchHits = fetchMeasured.filter(
    (g) => fetchCandidates(CORPUS, g.q).some((e) => e.id === g.expectedId),
  ).length;
  times.sort((a, b) => a - b);
  const p = (f: number) => times[Math.min(times.length - 1, Math.floor(times.length * f))] ?? 0;
  return {
    queries: golden.length,
    recallAt1: hit1 / golden.length,
    recallAt5: hit5 / golden.length,
    recallAt10: hit10 / golden.length,
    mrr: rrSum / golden.length,
    fetchRecall: fetchMeasured.length > 0 ? fetchHits / fetchMeasured.length : 1,
    rankPassP50Ms: p(0.5),
    rankPassP95Ms: p(0.95),
  };
}
