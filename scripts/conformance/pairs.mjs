/**
 * r368 T0 — the pair-validity law for the fidelity scorecard (pure functions).
 *
 * The audit's root cause #1 was that the instrument's manifest SAID "section
 * root top at viewport top" while capture.json recorded offsets of 8–670 px,
 * and the scorer still counted those rows as matched pairs (T=100 % was file
 * coverage, never state coverage). This module is the extracted, testable law
 * that closes it; fidelity.mjs only obeys it. Every rule has a failing
 * fixture in pairs.test.mjs — the audit's demand ("add failing fixtures").
 *
 * THE LAW
 *   · A side's ACHIEVED state is only ever one of:
 *       entry        — the section root's top is at its declared top (the
 *                      viewport top, ±LANDING_TOL_PX, for scrollable seats;
 *                      the measured resting top for fixed chrome — the
 *                      declared top travels with the record, so "entry" is
 *                      always "at the declared geometry", never a guess);
 *       end-clamped  — the scroller is at ITS OWN maximum (document end or
 *                      stage end) and the section root still sits below the
 *                      viewport top: the nearest achievable state, recorded
 *                      with its exact top and the maximum it hit;
 *       unlanded     — captured but landed nowhere (invalid).
 *   · A PAIR is matched only when both sides satisfy the pair's DECLARED
 *     state within tolerance:
 *       entry  both sides' achieved tops within ±2 px of their declared tops;
 *       end    both sides at their own scroller maximum (tops may differ by
 *              design — the reference footer's 183 px vs our own end
 *              geometry; the named state is "END", not "top at zero");
 *       mid/exit (position states) both sides' achieved scroll within ±2 px
 *              of their own declared targets (each side's target scales with
 *              its own section height — validity is about landing on the
 *              declared position, never absolute-pixel equality).
 *   · T = valid matched pairs / required pairs. Invalid pairs are never
 *     counted as passes; they are listed with their reason. A reference that
 *     cannot be captured at all is a BLOCKER reason on T, not a 0 % score
 *     ("unmeasured" may never be read as "measured and bad").
 *   · The manifest validator rejects (exit 1): a scored row without both
 *     sides' coordinate provenance, an invalid pair not carried in the
 *     invalid list, and a capture without its motion traces.
 */

export const LANDING_TOL_PX = 2;
export const POSITION_TOL_PX = 2;

const atOwnMax = (rec) => typeof rec.atStageEnd === "boolean"
  ? rec.atStageEnd === true
  : typeof rec.scrollY === "number" && typeof rec.maxScroll === "number"
    ? Math.abs(rec.scrollY - rec.maxScroll) <= LANDING_TOL_PX
    : false;

/**
 * Classify one side's achieved state from its capture record. `declaredTop`
 * (default 0 — the viewport top) is the geometry the pair declared: fixed
 * chrome declares its measured resting top instead of 0, so the same ±2 px
 * law governs it without a special case.
 */
export function classifySide(rec) {
  if (!rec || rec.ok !== true) {
    return { valid: false, state: null, reason: rec?.reason ?? "not captured" };
  }
  const top = rec.top;
  if (typeof top !== "number" || !Number.isFinite(top)) {
    return { valid: false, state: null, reason: "root top unmeasured — no coordinate provenance" };
  }
  const declared = typeof rec.declaredTop === "number" ? rec.declaredTop : 0;
  if (Math.abs(top - declared) <= LANDING_TOL_PX) {
    return { valid: true, state: "entry", top };
  }
  if (atOwnMax(rec) && top > declared + LANDING_TOL_PX) {
    return {
      valid: true,
      state: "end-clamped",
      top,
      limit: "document/stage end — this section cannot reach its declared top; the nearest achievable state is END and the exact top is recorded",
    };
  }
  return {
    valid: false,
    state: "unlanded",
    reason: `root top ${top} px vs declared ${declared} px with the scroller NOT at its maximum — neither the entry state nor the end state`,
  };
}

/**
 * Validate a pair against its DECLARED state ("entry" or "end").
 * entry: both sides must classify as entry (at their declared tops).
 * end:   both sides must be at their own scroller maximum; the tops are
 *        recorded and may differ by design (the reference stage ends before
 *        its footer can reach the viewport top; our document may not).
 */
export function validatePair(localRec, referenceRec, declared = "entry") {
  if (declared === "end") {
    if (!localRec || localRec.ok !== true) return { valid: false, status: "invalid-local", reason: `local: ${localRec?.reason ?? "not captured"}` };
    if (!referenceRec || referenceRec.ok !== true) return { valid: false, status: "invalid-reference", reason: `reference: ${referenceRec?.reason ?? "not captured"}` };
    const lOk = atOwnMax(localRec);
    const rOk = atOwnMax(referenceRec);
    if (!lOk || !rOk) {
      return {
        valid: false,
        status: "end-mismatch",
        reason: `END pair with local ${lOk ? "at" : "NOT at"} its maximum and reference ${rOk ? "at" : "NOT at"} the stage end — at least one side is not at its own end`,
      };
    }
    return {
      valid: true,
      status: "scored",
      state: "end-clamped",
      note: "matched END state — both sides at their own maximum with their exact tops recorded (tops differ by design)",
    };
  }
  const L = classifySide(localRec);
  const R = classifySide(referenceRec);
  if (!L.valid) return { valid: false, status: "invalid-local", reason: `local: ${L.reason}` };
  if (!R.valid) return { valid: false, status: "invalid-reference", reason: `reference: ${R.reason}` };
  if (L.state !== "entry" || R.state !== "entry") {
    return {
      valid: false,
      status: "state-mismatch",
      reason: `local state "${L.state}" vs reference state "${R.state}" for an entry-declared pair — an END geometry must be declared END by the protocol, never scored as entry (audit root cause #1)`,
    };
  }
  return { valid: true, status: "scored", state: "entry" };
}

/**
 * Position states (mid30/mid60/exit): the named state is the SCROLL POSITION
 * (contentTop + delta), not the section top — a mid-scroll section is above
 * the viewport top by definition, so the top rule does not apply. Each side's
 * own declared target travels with its record; the ±2 px law applies to
 * achieved-vs-target on both sides.
 */
export function validatePositionPair(localRow, referenceRow) {
  if (!localRow || localRow.ok !== true) return { valid: false, status: "invalid-local", reason: `local: ${localRow?.reason ?? "not captured"}` };
  if (!referenceRow || referenceRow.ok !== true) return { valid: false, status: "invalid-reference", reason: `reference: ${referenceRow?.reason ?? "not captured"}` };
  const l = typeof localRow.scrollY === "number" && typeof localRow.targetY === "number"
    ? Math.abs(localRow.scrollY - localRow.targetY) : null;
  const r = typeof referenceRow.offset === "number" && typeof referenceRow.targetOffset === "number"
    ? Math.abs(referenceRow.offset - referenceRow.targetOffset) : null;
  if (l == null) return { valid: false, status: "invalid-local", reason: "local achieved/target position unmeasured — no state provenance" };
  if (r == null) return { valid: false, status: "invalid-reference", reason: "reference achieved/target position unmeasured — no state provenance" };
  if (l > POSITION_TOL_PX || r > POSITION_TOL_PX) {
    return { valid: false, status: "position-mismatch", reason: `local landed ${l} px from its declared target, reference ${r} px — at least one side is not at the named state (tolerance ±${POSITION_TOL_PX} px)` };
  }
  return { valid: true, status: "scored", state: `${referenceRow.stateId ?? "position"} (position-matched)` };
}

/**
 * T over the pair verdicts: valid pairs only, invalid pairs listed, never
 * silently absorbed. A wholly unavailable reference reports T=null with the
 * blocker reason instead of 0.
 */
export function aggregateT(pairRows) {
  const required = pairRows.length;
  const valid = pairRows.filter((p) => p.verdict.valid);
  const invalid = pairRows.filter((p) => !p.verdict.valid);
  const referenceBlocked = required > 0 && pairRows.every(
    (p) => p.verdict.status === "invalid-reference" || (p.verdict.status === "invalid-local" && /reference/.test(p.verdict.reason ?? "")),
  );
  return {
    required,
    valid: valid.length,
    invalid: invalid.length,
    T: required && !referenceBlocked ? Math.round((100 * valid.length) / required * 10) / 10 : null,
    T_reason: referenceBlocked
      ? "reference evidence unavailable — pairs cannot be verified and are NOT counted as failures"
      : null,
    invalidPairs: invalid.map((p) => ({ target: `${p.key}@${p.bp}`, status: p.verdict.status, reason: p.verdict.reason })),
  };
}

/**
 * The manifest validator's rejection rules — the properties a trustworthy
 * baseline must hold. Each false here is a REJECT (the audit: "no validator
 * accepts the current offset error").
 */
export function manifestRejections(rows, motion) {
  const rejections = [];
  for (const r of rows) {
    if (r.status === "scored") {
      for (const side of ["local", "reference"]) {
        const top = r[side]?.top;
        const state = r[side]?.state;
        const declaredTop = typeof r[side]?.declaredTop === "number" ? r[side].declaredTop : 0;
        if (typeof top !== "number") rejections.push(`${r.section ?? r.key}@${r.bp}: scored row has no ${side} root top (coordinate provenance missing)`);
        else if (state === "entry" && Math.abs(top - declaredTop) > LANDING_TOL_PX) rejections.push(`${r.section ?? r.key}@${r.bp}: scored as entry with ${side} top ${top} px vs declared ${declaredTop} px — outside ±${LANDING_TOL_PX} px`);
        else if (state !== "entry" && state !== "end-clamped" && state !== "position") rejections.push(`${r.section ?? r.key}@${r.bp}: scored row carries unnamed state "${state}"`);
      }
    } else if (r.status !== "missing" && r.status !== "invalid-local" && r.status !== "invalid-reference" && r.status !== "state-mismatch" && r.status !== "invalid-mask-share" && r.status !== "position-mismatch" && r.status !== "end-mismatch" && r.status !== "coincident") {
      rejections.push(`${r.section ?? r.key}@${r.bp}: row status "${r.status}" is not a declared outcome`);
    }
  }
  if (!motion || !motion.byBp || Object.keys(motion.byBp).length === 0) {
    rejections.push("motion traces missing — a capture without its Q traces is not a baseline (audit root cause #2)");
  }
  return rejections;
}
