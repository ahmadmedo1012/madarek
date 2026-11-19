# REQUESTS · A → B (integrator → landing art & motion)

Written 2026-11-19 by agent A on `agent/r369-integrate`.

## R1 · The 5 invalid T pairs are INSTRUMENT-side structural limits — documented, not product defects

The scorecard's `invalidRows` (committed `docs/audit/evidence/scorecard.json`) are:

| pair | reason (both sides recorded) |
|---|---|
| `footer@390:mid60` | local needs scroll 14225 > live end 13998 · reference needs stage offset 11404 > reference stage end 11075 |
| `footer@768:mid30` | local 15445 > 15345 · reference 12196 > 11983 |
| `footer@768:mid60` | local 15729 > 15345 · reference 12487 > 11983 |
| `home-cta-wrap@1024:mid30` | reference 11548 > stage end 11507 |
| `home-cta-wrap@1024:mid60` | reference 11697 > stage end 11507 |

Root cause (measured, from the T0/T3 waves): position targets derive from
each side's OWN live entry offset + 0.3h/0.6h deltas using the reference's
own heights — when the reference stage ends before those offsets, the state
is unreachable ON THE REFERENCE, and when our document is shorter, also
locally. Per-target T is therefore structurally ≤ 6/9 = 66.7 % (footer) and
≤ 13/15 = 86.7 % (cta@1024), both under the 90 % floor. This is the spec's
acceptance-#1 escape case (progress ledger, "T-floor structural finding").

**Ask of B:** nothing to fix in landing pixels for THESE rows — they are
carried as named limitations with the row reasons as proof. BUT: any change
that grows our footer/cta section heights (closing the recorded 390-height
gaps: cta +409 px, footer +192 px) may bring the LOCAL side into reach —
after your height-gap work, re-run the scoped scorecard and the rows may
flip to scored. The reference-side ceiling stays.

## R2 · The stress collision (1 recorded) is in your lane

`docs/audit/evidence/stress.json` records one text-on-text collision at
1440: the wordmark/contact overlap (wave-3 note: "6/7 clean; @1440
wordmark/contact overlap recorded"). `accept.mjs` FAILs on it until it is
fixed or evidenced as a designed overlap.

## R3 · Judging: fill `docs/audit/evidence/judge-ledger.json`

30 primary sheets (390/768/1440) are committed under
`docs/audit/evidence/judge-sheets/` (1,457 KB total, budget law held). Rate
every `primary: true` row 1–5 per the amended criterion (≥4 passes; defects
listed seat → width → what → target; re-judge after each fix). The full 50-sheet
set incl. 1024/1920 is in `docs/audit/evidence/.local/judge/` (regenerate
with `node scripts/fidelity/judge-sheets.mjs` if missing). `accept.mjs`
turns green on this axis when every primary row is rated ≥4.

## R4 · Token/motion requests

If you need `layout.contentMaxWidth`, motion/ease tokens, or shadow/depth
steps minted for the landing art rebuild, append the exact token + value +
reason here; A seats them within the hour (tokens add/value-tune only).
