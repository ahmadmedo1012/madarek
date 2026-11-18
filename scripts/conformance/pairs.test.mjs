/**
 * r368 T0 — one failing fixture per pair-validity rule. The audit's finding
 * (root cause #1) was that 17 of 20 screenshot pairs were scored as matched
 * states while their section roots sat 8–670 px away from the declared state,
 * and T=100 % counted files. These tests pin the opposite properties:
 *
 *   · an unlanded side can never be a valid state;
 *   · entry-vs-end-clamped is a state mismatch, never a scored pair;
 *   · T is computed from valid pairs only and never counts an invalid pair
 *     as a pass or as a silent skip;
 *   · a scored row without coordinate provenance is a manifest REJECT;
 *   · a capture without motion traces is a manifest REJECT (root cause #2);
 *   · a wholly unavailable reference reports T=null with the blocker reason
 *     instead of 0 % ("unmeasured" is never "measured and bad").
 *
 * Run: node --test scripts/conformance/pairs.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  LANDING_TOL_PX, classifySide, validatePair, aggregateT, manifestRejections,
  POSITION_TOL_PX, validatePositionPair,
} from "./pairs.mjs";

const side = (over = {}) => ({ ok: true, top: 0, scrollY: 0, maxScroll: 10000, ...over });
const pairRow = (key, bp, verdict) => ({ key, bp, verdict });

test("a root within ±2 px of the viewport top is the entry state", () => {
  assert.equal(classifySide(side({ top: LANDING_TOL_PX })).state, "entry");
  assert.equal(classifySide(side({ top: -LANDING_TOL_PX })).state, "entry");
  assert.equal(classifySide(side({ top: 1.5 })).valid, true);
});

test("a root 670 px away with scroll NOT at maximum is unlanded — invalid (the audit's CTA row)", () => {
  const c = classifySide(side({ top: 670, scrollY: 5000, maxScroll: 9000 }));
  assert.equal(c.valid, false);
  assert.equal(c.state, "unlanded");
  assert.match(c.reason, /670/);
});

test("a root off-target at the scroller's own maximum is the end-clamped state (the reference footer)", () => {
  const c = classifySide(side({ top: 183, scrollY: 10000, maxScroll: 10000 }));
  assert.equal(c.valid, true);
  assert.equal(c.state, "end-clamped");
  assert.equal(c.top, 183);
  assert.match(c.limit, /document\/stage end/);
});

test("a captured side with no measured top has no state — provenance is mandatory", () => {
  const c = classifySide(side({ top: null }));
  assert.equal(c.valid, false);
  assert.match(c.reason, /unmeasured/);
});

test("a failed capture is invalid, never a state", () => {
  const c = classifySide({ ok: false, reason: "selector-not-found" });
  assert.equal(c.valid, false);
  assert.match(c.reason, /selector-not-found/);
});

test("entry on both sides is a matched pair", () => {
  const v = validatePair(side({ top: 0 }), side({ top: -1 }));
  assert.equal(v.valid, true);
  assert.equal(v.status, "scored");
  assert.equal(v.state, "entry");
});

test("entry vs end-clamped is a state MISMATCH — the two crops are different states wearing one label", () => {
  const v = validatePair(side({ top: 0 }), side({ top: 183, scrollY: 10000, maxScroll: 10000 }));
  assert.equal(v.valid, false);
  assert.equal(v.status, "state-mismatch");
  assert.match(v.reason, /never scored as entry/);
});

test("an ENTRY-declared pair where BOTH sides clamped is invalid — the protocol must declare END for that pair", () => {
  const v = validatePair(
    side({ top: 120, scrollY: 10000, maxScroll: 10000 }),
    side({ top: 183, scrollY: 10000, maxScroll: 10000 }),
    "entry",
  );
  assert.equal(v.valid, false);
  assert.equal(v.status, "state-mismatch");
});

test("an END-declared pair matches with tops recorded even when they differ by design (reference 183 vs ours 0)", () => {
  const v = validatePair(
    side({ top: 0, scrollY: 10000, maxScroll: 10000 }),
    side({ top: 183, scrollY: 11462, maxScroll: 11462, atStageEnd: true }),
    "end",
  );
  assert.equal(v.valid, true);
  assert.equal(v.state, "end-clamped");
  assert.match(v.note, /END state/);
});

test("an END-declared pair with one side NOT at its maximum is an end-mismatch", () => {
  const v = validatePair(
    side({ top: 120, scrollY: 5000, maxScroll: 10000 }),
    side({ top: 183, scrollY: 11462, maxScroll: 11462, atStageEnd: true }),
    "end",
  );
  assert.equal(v.valid, false);
  assert.equal(v.status, "end-mismatch");
});

test("fixed chrome declares its measured resting top — the same ±2 px law governs it without a special case", () => {
  assert.equal(classifySide(side({ top: 7, declaredTop: 7 })).state, "entry");
  assert.equal(classifySide(side({ top: 10, declaredTop: 7 })).valid, false);
});

test("T counts valid pairs only — the audit's 20/20 file coverage could never happen here", () => {
  const rows = [
    pairRow("a", "1440", validatePair(side(), side())),
    pairRow("b", "1440", validatePair(side(), side())),
    pairRow("c", "1440", validatePair(side({ top: 670, scrollY: 5000, maxScroll: 9000 }), side())),
  ];
  const t = aggregateT(rows);
  assert.equal(t.required, 3);
  assert.equal(t.valid, 2);
  assert.equal(t.T, 66.7);
  assert.equal(t.invalid, 1);
  assert.match(t.invalidPairs[0].reason, /670/);
});

test("a wholly unavailable reference reports T=null with the blocker reason — never 0", () => {
  const rows = [pairRow("a", "1440", validatePair(side(), { ok: false, reason: "reference: net error" }))];
  const t = aggregateT(rows);
  assert.equal(t.T, null);
  assert.match(t.T_reason, /reference evidence unavailable/);
});

test("a scored row without its reference top is a manifest REJECT", () => {
  const rej = manifestRejections([{ section: "a", bp: "1440", status: "scored", local: { top: 0, state: "entry" }, reference: { state: "entry" } }], { byBp: { 1440: {} } });
  assert.equal(rej.length, 1);
  assert.match(rej[0], /reference root top/);
});

test("a scored entry row with a 183 px top is a manifest REJECT — the current offset error is refused", () => {
  const row = { section: "footer", bp: "1440", status: "scored", local: { top: 0, state: "entry" }, reference: { top: 183, state: "entry" } };
  const rej = manifestRejections([row], { byBp: { 1440: {} } });
  assert.ok(rej.some((r) => /outside ±2 px/.test(r)));
});

test("a scored entry row is judged against its DECLARED top — fixed chrome at its own 7 px resting top is NOT a rejection", () => {
  const row = { section: "chrome", bp: "1440", status: "scored", local: { top: 7, declaredTop: 7, state: "entry" }, reference: { top: 7, declaredTop: 7, state: "entry" } };
  assert.deepEqual(manifestRejections([row], { byBp: { 1440: {} } }), []);
});

test("a scored entry row 5 px off its declared 7 px resting top is a REJECT", () => {
  const row = { section: "chrome", bp: "1440", status: "scored", local: { top: 12, declaredTop: 7, state: "entry" }, reference: { top: 7, declaredTop: 7, state: "entry" } };
  const rej = manifestRejections([row], { byBp: { 1440: {} } });
  assert.ok(rej.some((r) => /vs declared 7 px/.test(r)));
});

test("a capture without motion traces is a manifest REJECT (root cause #2)", () => {
  const rej = manifestRejections([{ section: "a", bp: "1440", status: "scored", local: { top: 0, state: "entry" }, reference: { top: 0, state: "entry" } }], null);
  assert.equal(rej.length, 1);
  assert.match(rej[0], /motion traces missing/);
});

test("a complete, provenance-carrying row set with motion traces has no rejections", () => {
  const row = { section: "a", bp: "1440", status: "scored", local: { top: 0, state: "entry" }, reference: { top: 0, state: "entry" } };
  const endRow = { section: "b", bp: "1440", status: "scored", local: { top: 100, state: "end-clamped" }, reference: { top: 183, state: "end-clamped" } };
  assert.deepEqual(manifestRejections([row, endRow], { byBp: { 1440: {} } }), []);
});

test("an undeclared row status is a manifest REJECT — outcomes are enumerated", () => {
  const rej = manifestRejections([{ section: "a", bp: "1440", status: "sort-of-there" }], { byBp: { 1440: {} } });
  assert.equal(rej.length, 1);
  assert.match(rej[0], /not a declared outcome/);
});

// ── position states (mid/exit) — the ±2 px law applied to the scroll seat ──

test("a mid state matched on its declared position is a valid pair (tops need not be zero)", () => {
  const v = validatePositionPair(
    { ok: true, scrollY: 2600, targetY: 2600 },
    { ok: true, offset: 3500, targetOffset: 3500, stateId: "mid30" },
  );
  assert.equal(v.valid, true);
  assert.equal(v.status, "scored");
  assert.match(v.state, /mid30/);
});

test("a side 600 px off its declared position is a position MISMATCH — never scored", () => {
  const v = validatePositionPair(
    { ok: true, scrollY: 2600, targetY: 2600 },
    { ok: true, offset: 4100, targetOffset: 3500 },
  );
  assert.equal(v.valid, false);
  assert.equal(v.status, "position-mismatch");
  assert.match(v.reason, /reference 600 px/);
});

test("position provenance is mandatory — a side without its target is invalid", () => {
  const v = validatePositionPair({ ok: true, scrollY: 2600 }, { ok: true, offset: 3500, targetOffset: 3500 });
  assert.equal(v.valid, false);
  assert.match(v.reason, /unmeasured/);
});

test("the position tolerance is ±2 px, at the floor inclusive", () => {
  assert.equal(validatePositionPair({ ok: true, scrollY: 2602, targetY: 2600 }, { ok: true, offset: 3500, targetOffset: 3500 }).valid, true);
  assert.equal(validatePositionPair({ ok: true, scrollY: 2603, targetY: 2600 }, { ok: true, offset: 3500, targetOffset: 3500 }).valid, false);
});
