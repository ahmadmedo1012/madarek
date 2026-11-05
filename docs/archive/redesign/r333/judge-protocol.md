# R333 — Judge Protocol (reviewer runbook)

Audience: the 3 independent reviewers, and the lead who runs the machinery.
Bindings: `rubric.md` (criteria, anchors, pass rule). Machinery: `scripts/r333/judge/`.
Evidence root: `/home/z/evidence-r333/`. Repo copy of this doc: `docs/redesign/r333/judge-protocol.md`.

---

## 0. Evidence directory layout (what the lead prepares)

```
/home/z/evidence-r333/
├── twin/run-<t>/                      # Twin capture frames (input; scripts/twin/capture.py)
│   └── <vp>/<section>/<side>-p<pct>.png + <side>-records.jsonl
└── judge/
    ├── keys/run-<t>.json              # SEALED A/B key (mode 600, outside the repo)
    └── run-<t>/                       # REVIEWERS SEE ONLY THIS SUBTREE
        ├── sheets/<vp>/<section>.png  # A/B filmstrip grids (blinded)
        ├── calibration/<vp>/<section>.png  # Heron-only strips (open label)
        ├── first10s/<engine>-<vp>-<side>-first10s.webm
        ├── sheets-index.json          # side-blind manifest
        └── forms/reviewer-{1,2,3}.json
```

Reviewer-facing `run-<t>/` is side-blind in the artifacts that matter: `sheets/`,
`sheets-index.json` and the `blind` blocks of the forms never name the sides
(`--verify` enforces this). Open-label by design: the forms' `heron` calibration
block, `calibration/` strips, and `first10s/` filenames.

---

## 1. Reviewer session — exact steps, in order (~90–120 min)

**Before you start:** you are reviewer 1, 2, or 3. You work alone. You do not open another
reviewer's form at any time before your form is locked. You do not open
`/home/z/evidence-r333/judge/keys/` (it is sealed; the lead unbinds after all forms lock).

1. **Copy your form.**
   `cp /home/z/evidence-r333/judge/run-<t>/forms/reviewer-<N>.json ~/form-r<NNN>.json`
   All edits happen in YOUR copy. Do not edit anything under `forms/` in place.
2. **Calibration pass (Heron first — open label).**
   Open `calibration/` in vp order 1920 → 1440 → 1024 → 768 → 390 → 360. For each
   `<vp>/<section>.png` strip (these are Heron-only progress sequences), study it, then record
   Heron's score for each of the 12 rubric criteria into `form.heron[criterion]`, plus per
   criterion the anchor bracket and the limiting viewport:
   `form.heron_notes[criterion] = {"anchors": "3↔6", "limiting_vp": "390", "evidence": "calibration/390/hero.png"}`.
   You may pause here. Do **not** open `sheets/` yet — the calibration must be locked in your
   head/form first.
3. **Watch the first-10-seconds recordings, both sides.**
   Open `first10s/`. Watch in this fixed order: `chromium-1440-heron`, `chromium-1440-madarek`,
   `chromium-390-heron`, `chromium-390-madarek`, then any `webkit-*` recordings. Watch each
   at least twice (once for load choreography #6, once for polish/jank #12). Overlay chrome
   (consent/badges) is shown **as-is on both sides** — include what you see in #9/#12 judgements
   and note asymmetries in `form.first10s.notes`.
4. **Blind A/B pass — the only place Madarek is scored.**
   Open `sheets/` in vp order 1920 → 1440 → 1024 → 768 → 390 → 360. Each
   `sheets/<vp>/<section>.png` is a filmstrip: header row = progress %, row **A** and row **B**
   = the two sides' frame sequences at identical progress steps. You do NOT know which row is
   which side. For **each strip**, score **A and B separately** on all 12 criteria
   (`form.blind[<vp>][<section>] = {"A": {...}, "B": {...}}` — schema below).
   - Motion criteria (#6 motion quality, #7 scroll feel, #8 micro-interactions) MUST be judged
     from the sequence rows (left→right = progress order) — never from a single cell.
   - Record the limiting viewport per criterion in the top-level `form.limiting_vp`.
   - If a cell says `MISSING p=NN`, record it in `form.blind[...].missing_frames` — missing
     evidence is a defect of that row, not something to ignore.
5. **Dark mode check** (only contrast & harmony). The lead provides dark-theme capture sheets
   at 1440 + 390 (`sheets/<vp>-dark/<section>.png` when present). Score `form.dark.contrast`
   and `form.dark.harmony` 0–10 for each row; these gate criteria #9/#10 per rubric §2.
6. **WebKit spot-check.** For any provided `webkit-*` first10s recordings, add one line each to
   `form.webkit_notes` on scroll feel (#7) and polish (#12). Absence of WebKit evidence = note
   `NOT_EVALUATED` — it gates the round, not your form.
7. **Attest.** Set all four `form.attestations` flags to `true` (they assert: heron-first
   order respected, sequences-not-stills, overlays seen as-is on both sides, no peer scores
   seen). A form with `false`/missing flags is void.
8. **Lock.** Deliver `~/form-r<NNN>.json` to the lead (file share, not chat text). Timestamp
   `completedAt`. After lock, do not amend — amendments go through the lead and are logged in
   `REPORT.md`.

**Aggregation (lead, post-lock, mechanical):**
1. Verify all 3 forms parse and attestations are true; verify each reviewer's calibration
   Heron score vs that reviewer's blind-sheet Heron row: per criterion |Δ| ≤ 1.5, else flag
   the session `MISCALIBRATED` and re-run that reviewer on fresh sheets (new seed).
2. Open the sealed key `keys/run-<t>.json` ONLY after all forms lock. Map A/B → sides.
3. Per criterion: verdict = median across reviewers of (madarek_row − heron_row). Criterion
   passes iff median madarek ≥ median heron − 0.5 AND ≥ 2/3 reviewers pass it.
4. Apply absolute gates (≥9 typography/spacing/polish) and dark gates (≥8 contrast/harmony).
5. Fill `forms` ticket IDs for every lost point into `REPORT.md` (rubric §4). Publish
   `REPORT.md` rubric tables + the unblinded per-reviewer table.

---

## 2. Score form schema (`forms/reviewer-{1,2,3}.json`)

Templates are generated by `make_sheets.py`. Field names are exact; tooling depends on them.

```jsonc
{
  "schema": "madarek-r333-judge-form/1",
  "run": "run-<t>",                      // must match sheets-index.json
  "reviewer": 1,                         // 1|2|3 — set by you
  "engine": "chromium",
  "startedAt": null, "completedAt": null,

  // Step 2 — calibration (Heron, open label). Keys = the 12 rubric criterion keys.
  "heron": { "composition": 0, "typography_craft": 0, "spacing_rhythm": 0, "imagery": 0,
             "storytelling": 0, "motion_quality": 0, "scroll_feel": 0, "micro_interactions": 0,
             "density_contrast_legibility": 0, "consistency": 0, "arabic_rtl_craft": 0,
             "polish_finish": 0 },
  "heron_notes": { "<criterion>": { "anchors": "3↔6", "limiting_vp": "390", "evidence": "path" } },

  // Step 3 — first-10-seconds
  "first10s": { "viewed": [], "notes": "" },

  // Step 4 — blind A/B. For every vp × section × row:
  "blind": {
    "<vp>": {
      "<section>": {
        "A": { "composition": 0, "typography_craft": 0, "spacing_rhythm": 0, "imagery": 0,
               "storytelling": 0, "motion_quality": 0, "scroll_feel": 0, "micro_interactions": 0,
               "density_contrast_legibility": 0, "consistency": 0, "arabic_rtl_craft": 0,
               "polish_finish": 0 },
        "B": { "...same keys...": 0 },
        "missing_frames": []            // e.g. ["390/journey A p=020"]
      }
    }
  },
  "limiting_vp": { "<criterion>": "390" },

  // Step 5 — dark (contrast & harmony only), per row at each dark vp
  "dark": { "contrast": 0, "harmony": 0, "notes": "" },

  // Step 6 — WebKit spot checks
  "webkit_notes": { "scroll_feel": "", "polish_finish": "" },

  // Reason fields — REQUIRED wherever you score a row < 9 or where a row loses to the other
  // row on a criterion. "reason" must reference evidence paths. "ticket" is left null by you;
  // the lead stamps it from the round ledger (rubric §4).
  "reasons": [ { "scope": "blind/1440/journey", "criterion": "motion_quality", "row": "A",
                 "reason": "…", "evidence": "sheets/1440/journey.png", "ticket": null } ],

  // Step 7 — attestations (all must be true)
  "attestations": { "heronFirst": false, "sequencesNotStills": false,
                    "overlaysAsIsBothSides": false, "noPeerScoresSeen": false }
}
```

The 12 criterion keys are exactly those in `rubric.md` §1 — never rename, never add, never drop.

---

## 3. Anti-gaming rules (reviewers)

1. **No threshold talk.** Reviewers score against anchors only. Nobody sees or negotiates the
   −0.5 tolerance; the lead applies it mechanically after lock.
2. **No filtered frames.** You score the strips as generated. You may not re-capture, re-crop,
   re-step, or ask for different progress steps. `MISSING` cells are scored as defects.
3. **Both-sides chrome.** If a first10s recording shows consent/badge chrome and its pair does
   not, that asymmetry is itself evidence — record it; the lead treats overlay asymmetry as a
   #12 polish defect and a protocol violation by whoever produced the capture.
4. **Heron-first is a physical ordering rule.** If `startedAt`/notes indicate sheets were opened
   before calibration was written, the form is void.
5. **Independence.** No peer scores, no discussion of criteria between calibration and lock.
6. **Integers 0–10.** No 7.5s. The mechanical tolerance lives in the aggregation, not the form.
7. **Score what you see, not what you know.** If you believe you identified a row's side, do not
   let it move your score; note your guess in `form.blind[...].guessed_side` if you must.

## 4. Anti-gaming rules (lead & machinery)

1. Key lives at `/home/z/evidence-r333/judge/keys/run-<t>.json` (mode 600, outside the repo).
   It is opened exactly once, after all forms lock, and the unbind is logged in `REPORT.md`.
2. `make_sheets.py --verify` must pass on the exact run the reviewers scored; the lead archives
   the verify output. Threshold/anchor edits after sheets exist invalidate the run.
3. Sheets are generated from a Twin capture run with **fixed evenly-spaced progress steps** and
   sealed-seed A/B assignment; regeneration with a new seed invalidates prior forms.
4. Missing evidence fails verification — it can never silently pass.
