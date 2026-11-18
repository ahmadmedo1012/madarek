/**
 * r368 T1 — one failing fixture per documented limit. The audit's finding was
 * that the committed artifact reported intro 38.2% (below the printed 40%
 * floor) and platform 58.5% heuristic (above the printed 50% cap) with an empty
 * failure list. The gate was right (R347 re-keys) and the disclosure was wrong.
 * These tests pin BOTH properties:
 *   · every documented limit produces a failure when breached, and
 *   · the emitted policy block reports the effective limit, never the base.
 *
 * Run: node --test scripts/conformance/gates.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  COVERAGE_FLOOR, OFF_BOOK_CAP, HEURISTIC_CAP,
  COVERAGE_FLOORS, HEURISTIC_CAPS,
  coverageFloorFor, heuristicCapFor,
  evaluateGates, effectiveThresholds, applyGateVerdict,
} from "./gates.mjs";

const agg = (coverage, offBookPct = 0, heurPct = 0) => ({ coverage, offBookPct, heurPct });
const review = { section: "s", reason: "written reason of sufficient length", owner: "T-999" };

test("coverage below the base floor fails FAIL(coverage)", () => {
  const { gateFailures } = evaluateGates({ s: agg(39.9) });
  assert.equal(gateFailures.length, 1);
  assert.equal(gateFailures[0].gate, "coverage");
  assert.match(gateFailures[0].threshold, /< 40%/);
});

test("coverage exactly at the floor passes (the rule is < floor, not ≤)", () => {
  assert.deepEqual(evaluateGates({ s: agg(COVERAGE_FLOOR) }).gateFailures, []);
});

test("heuristic at the cap fails, one tenth under it passes", () => {
  assert.equal(evaluateGates({ s: agg(90, 0, HEURISTIC_CAP) }).gateFailures[0].gate, "heuristic");
  assert.deepEqual(evaluateGates({ s: agg(90, 0, HEURISTIC_CAP - 0.1) }).gateFailures, []);
});

test("off-book at the cap fails without a review", () => {
  // coverage kept well above the floor so this fixture isolates the off-book limit
  const { gateFailures, reviewedEscapes } = evaluateGates({ s: agg(95, OFF_BOOK_CAP) });
  assert.equal(gateFailures.length, 1);
  assert.equal(gateFailures[0].gate, "off-book");
  assert.deepEqual(reviewedEscapes, []);
});

test("a written review suppresses the off-book label and is listed, never silent", () => {
  const { gateFailures, reviewedEscapes } = evaluateGates({ s: agg(95, OFF_BOOK_CAP) }, { s: review });
  assert.deepEqual(gateFailures, []);
  assert.equal(reviewedEscapes.length, 1);
  assert.equal(reviewedEscapes[0].owner, "T-999");
});

test("a review does NOT lift the coverage floor (no paperwork escape)", () => {
  const { gateFailures } = evaluateGates({ s: agg(20, OFF_BOOK_CAP) }, { s: review });
  assert.deepEqual(gateFailures.map((f) => f.gate), ["coverage"]);
});

test("R347 re-keyed sections judge against their own effective floor", () => {
  // the audit's exact numbers: intro 38.2 / map 35.4 / platform heur 58.5
  const measured = { "home-intro-wrap": agg(38.2), "home-map-wrap": agg(35.4), "home-platform-wrap": agg(22.5, 0, 58.5) };
  assert.deepEqual(evaluateGates(measured).gateFailures, []);
  assert.equal(coverageFloorFor("home-intro-wrap"), 37);
  assert.equal(coverageFloorFor("home-map-wrap"), 30);
  assert.equal(heuristicCapFor("home-platform-wrap"), 65);
  // and one point below each re-key still fails — the re-key is a limit, not an exemption
  assert.deepEqual(evaluateGates({ "home-intro-wrap": agg(36.9) }).gateFailures.map((f) => f.gate), ["coverage"]);
  assert.deepEqual(evaluateGates({ "home-platform-wrap": agg(90, 0, 65) }).gateFailures.map((f) => f.gate), ["heuristic"]);
});

test("every re-key carries a written reason into the emitted policy", () => {
  const policy = effectiveThresholds({ "home-intro-wrap": agg(38), "home-hero-wrap": agg(12), "home-platform-wrap": agg(23), "home-map-wrap": agg(31), footer: agg(95) });
  for (const key of Object.keys(COVERAGE_FLOORS)) assert.ok(policy.sections[key].coverageRekey, `${key} coverage re-key reason missing`);
  for (const key of Object.keys(HEURISTIC_CAPS)) assert.ok(policy.sections[key].heuristicRekey, `${key} heuristic re-key reason missing`);
  assert.equal(policy.sections.footer.coverageFloor, COVERAGE_FLOOR);
  assert.equal(policy.sections.footer.coverageRekey, null);
  assert.equal(policy.base.coverageFloor, COVERAGE_FLOOR);
});

test("PASS is impossible whenever a limit fails — including scoped runs", () => {
  const { gateFailures } = evaluateGates({ s: agg(10), t: agg(90, 75) });
  assert.ok(gateFailures.length >= 2);
  const failParts = [...new Set(gateFailures.map((f) => f.gate))].join("+") + ":" + [...new Set(gateFailures.map((f) => f.section))].join(",");
  const verdict = applyGateVerdict("PASS", [failParts]);
  assert.match(verdict, /^FAIL\(/);
  assert.doesNotMatch(verdict, /PASS/);
});

test("an empty breach list keeps the ratchet verdict untouched", () => {
  assert.equal(applyGateVerdict("PASS", []), "PASS");
  assert.equal(applyGateVerdict("FAIL", []), "FAIL");
});
