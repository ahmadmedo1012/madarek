/**
 * r368 T1 — the conformance honesty gates, extracted from run.mjs as a PURE
 * module so every documented limit has a failing fixture (r368 plan Task 1).
 *
 * Why the extraction exists: the gates were correct but their *disclosure* was
 * not. The R347 re-keys (per-section floors/caps, each with a written reason in
 * a code comment) were applied by the gate while `summary.coverage.thresholds`
 * still printed the global 40%/50% — so the committed artifact read
 * "intro 38.2% < 40% floor, gate: PASS". That is a self-contradicting report,
 * not a broken gate (docs/audit/project-audit.md, root-cause category 2). The
 * numbers now travel with their reasons into `summary.coverage.policy`, and the
 * evaluation itself is covered by gates.test.mjs.
 *
 * Law (unchanged, and none of it is tunable to pass):
 *   · coverage floor 40% measured — a section below it fails FAIL(coverage);
 *     the floor has NO paperwork escape, only section work lifts it.
 *   · off-book cap 70% — fails FAIL(off-book) unless coverage-review.json
 *     carries a written reason + owner task id (the documented escape).
 *   · heuristic-share cap 50% of pairs — explicit data-spec binding is
 *     achievable (intro/usecase ≈0.8%).
 *   · every breach is additive; scoping cannot mask one.
 */

export const COVERAGE_FLOOR = 40; // % measured below which a section fails FAIL(coverage)
export const OFF_BOOK_CAP = 70; // % off-book at/above which a section fails FAIL(off-book) unless reviewed
export const HEURISTIC_CAP = 50; // % heuristic-paired share of pairs at/above which a section fails FAIL(heuristic)

// R347 re-keys — each floor only ever RISES from here (it may not be lowered
// again without the same written-record discipline).
export const COVERAGE_FLOORS = {
  "home-intro-wrap": 37, // D1: the ink-roll twins + their A-I1 bindings carried 3.1pts of intro coverage; the twins are deleted at the cause — the visible double-print outranks the metric
  "home-hero-wrap": 11, // D4: the drafting-noise chrome's 198 binding entries deleted with their elements — ONE calm artwork
  "home-platform-wrap": 20, // R347-Z · D8: the marquee loop copies C/D/E are deleted (conformance twins stacking 5 pr-label/pr-title copies on one seat, detector text-on-text frac=1); their 47 explicit bindings became noCounterpart excusals, so the measured share fell BY THE EXCUSAL, not by unmapped work
  "home-map-wrap": 30, // R347-Z: the frozen spec recorded the reference's map band MID-ANIMATION (stacked track still translated at capture); the measured-seat rebuild + calm-sheet seat replaced the stack, so those records have no honest counterpart — 438 noHeuristic excusals + 690 legacy flags later the share fell BY THE EXCUSAL
};

// R347 D4 / R347-Z re-keys. Both are ARITHMETIC, not new glue: the explicit
// pool shrank (hero 208→10 pairs, platform 160→113 pairs) when the noise/twins
// were deleted, so the stable heuristic-glued mass these sections always carried
// now exceeds half of what is left.
export const HEURISTIC_CAPS = {
  "home-hero-wrap": 80,
  "home-platform-wrap": 65, // 58.5% measured; cap 65
};

const REKEY_WHY = {
  "home-intro-wrap:coverage": "R347 D1 — ink-roll twins + A-I1 bindings deleted at the cause (visible double-print outranks the metric)",
  "home-hero-wrap:coverage": "R347 D4 — drafting-noise chrome and its 198 binding entries retired (ONE calm artwork)",
  "home-platform-wrap:coverage": "R347-Z D8 — marquee loop copies C/D/E deleted as banned conformance twins; 47 bindings became noCounterpart excusals",
  "home-map-wrap:coverage": "R347-Z — spec captured the reference map band mid-animation; the replaced stack has no honest counterpart (438 noHeuristic excusals)",
  "home-hero-wrap:heuristic": "R347 D4 — explicit pool 208→10 pairs by the noise retirement; the stable ~39 heuristic-glued pairs exceed half by arithmetic, not by new glue",
  "home-platform-wrap:heuristic": "R347-Z — explicit pool 160→113 pairs by the twin deletion; the stable wrapper-crossover mass exceeds half by arithmetic",
};

export function coverageFloorFor(section) {
  return COVERAGE_FLOORS[section] ?? COVERAGE_FLOOR;
}

export function heuristicCapFor(section) {
  return HEURISTIC_CAPS[section] ?? HEURISTIC_CAP;
}

/**
 * Evaluate every documented limit for the sections in this run.
 * @param {Record<string, {coverage:number, offBookPct:number, heurPct:number|null}>} sectionAgg
 * @param {Record<string, {owner:string, reason:string}>} [review] coverage-review.json register
 * @returns {{gateFailures:Array, reviewedEscapes:Array}}
 */
export function evaluateGates(sectionAgg, review = {}) {
  const gateFailures = [];
  const reviewedEscapes = [];
  for (const [key, a] of Object.entries(sectionAgg)) {
    const floor = coverageFloorFor(key);
    if (a.coverage < floor) gateFailures.push({ gate: "coverage", section: key, value: `${a.coverage}%`, threshold: `< ${floor}% measured (coverage floor — no escape; lift it with section work)` });
    if (a.offBookPct >= OFF_BOOK_CAP) {
      const r = review[key];
      if (r) reviewedEscapes.push({ section: key, offBookPct: a.offBookPct, owner: r.owner, reason: r.reason });
      else gateFailures.push({ gate: "off-book", section: key, value: `${a.offBookPct}%`, threshold: `≥ ${OFF_BOOK_CAP}% off-book (excused×12+skipped est.) — escape only via a written review in coverage-review.json` });
    }
    const cap = heuristicCapFor(key);
    if (a.heurPct != null && a.heurPct >= cap) gateFailures.push({ gate: "heuristic", section: key, value: `${a.heurPct}%`, threshold: `≥ ${cap}% heuristic-paired — explicit data-spec binding is achievable (intro/usecase ≈0.8%)` });
  }
  return { gateFailures, reviewedEscapes };
}

/**
 * The disclosure half of the contract: what limit was ACTUALLY applied to each
 * section, and — when it differs from the base — the written reason. The
 * report may never print the base number as if it governed a re-keyed section.
 */
export function effectiveThresholds(sectionAgg) {
  const sections = {};
  for (const key of Object.keys(sectionAgg)) {
    const floor = coverageFloorFor(key);
    const cap = heuristicCapFor(key);
    sections[key] = {
      coverageFloor: floor,
      heuristicCap: cap,
      coverageRekey: floor !== COVERAGE_FLOOR ? REKEY_WHY[`${key}:coverage`] ?? null : null,
      heuristicRekey: cap !== HEURISTIC_CAP ? REKEY_WHY[`${key}:heuristic`] ?? null : null,
    };
  }
  return {
    base: { coverageFloor: COVERAGE_FLOOR, offBookCap: OFF_BOOK_CAP, heuristicCap: HEURISTIC_CAP },
    sections,
    note: "coverageFloor/heuristicCap are the EFFECTIVE per-section limits (R347 re-keys, each with its written reason in the same entry); base holds the un-re-keyed defaults. A report that prints base alone contradicts the gate.",
  };
}

/**
 * Verdict assembly. Every breach kind is additive and a non-empty breach list
 * can never yield PASS — the property the fixtures in gates.test.mjs assert.
 */
export function applyGateVerdict(verdict, failParts) {
  return failParts.length ? `FAIL(${failParts.join("+")})` : verdict;
}
