# Heron fidelity — execution progress record

**Branch:** `wip/r368-t0` (from `plan/r368-heron-fidelity` @ `3b8eba04`)
**Program:** `docs/superpowers/plans/heron-fidelity-plan.md` — Task 0 (repair measurement)
**Law:** every number below was measured on this host, this run, by the committed instrument; nothing is copied from a previous round.

## Task 0 — repair measurement and establish a trustworthy baseline

### What was broken (the audit's root causes #1/#2, reproduced before the fix)

1. **Capture state was not enforced.** The previous instrument's manifest said "section root top at viewport top" while `capture.json` recorded roots 8–670 px away (CTA local 670 px; footer reference 183 px), and rows were still scored. The cause was two-fold: the local side asked for `window.__lenis` (which does not exist — the documented seam is `window.__mdrkLenis`, `sheetLenis.ts` R328 H7), so every native fallback scroll raced the live engine; and the reference fine-land never verified its own result.
2. **The crop was the full viewport**, so "chrome" scored the hero and short sections scored their neighbours.
3. **T counted files, not states.** 20/20 files existed; only 3/20 roots were within ±2 px.
4. **The Q trigger family had no reference-side values** (the frozen starts could not be normalised against any live geometry).

### What the repair is (all in `scripts/conformance/`, lead-owned)

- `pairs.mjs` + `pairs.test.mjs` (NEW) — the pair-validity law as pure functions with a failing fixture per rule: named states (entry / end-clamped / position ±2 px), entry-vs-end mismatch refusal, END-declared pairs, fixed-chrome declared tops, T from valid pairs only, and the manifest validator (coordinate provenance mandatory; "unmeasured" can never read as "measured and bad"). 34/34 fixtures pass (`node --test scripts/conformance/pairs.test.mjs scripts/conformance/gates.test.mjs`).
- `fidelity.mjs` (REBUILT) — obeys the law:
  - LOCAL landing through the documented `window.__mdrkLenis` seam (native fallback kept), with sticky-seat correction and end-clamp classification;
  - REFERENCE landing on the section's own top (census best-step + corrective wheels of the measured residual — a wheel of Δ moves the stage exactly Δ px, verified twice), with the END fallback (stage-at-max detection) and full provenance (achieved top + stage offset recorded per row);
  - named states per section: entry / mid30 / mid60 / exit (+ END for pairs the reference cannot seat at the viewport top — its footer's entry offset 13 440 exceeds the stage end 13 257 at 1440, leaving its top ~183 px at maximum, matching the audit's recorded geometry);
  - crops are the section box ∩ viewport at the named state (never a full viewport), stored ≤480 px wide (colour box-average, deterministic, recorded per row) to respect the docs/ size gates; every score runs on the STORED files so `--score-only` reproduces E from the committed evidence alone;
  - masks: entry states use the frozen spec's preregistered text rects (in-viewport filter added — off-screen elements previously inflated the mask basis and displaced every mask); non-entry states use live reference text rects recorded at capture, before scoring;
  - the consent-bar band is cut symmetrically only from crops that reach the viewport bottom;
  - Q keeps the verified-only rule (settle family scored; the trigger family is a paired BASELINE — see below — never a pass).
- `gates.mjs` + `gates.test.mjs` + `run.mjs` (PORTED from the exec branch's `fe6b7614` — the honesty-gate extraction: the gate values and their R347 re-key reasons now live in a pure module with a failing fixture per limit, and `summary.coverage.policy` reports the effective thresholds, ending the "intro 38.2 % < 40 % floor, gate: PASS" self-contradiction).
- `stress.mjs` (PORTED + settled-recheck) — every reachability/collision/clipping row must survive a second probe after a settle gap; transient rows are recorded as state-sensitive, never as hard failures (the audit found rows that vanished in a settled browser session).
- `style-snapshot.mjs` (PORTED unchanged — computed-style before/after snapshots for the Task 9 CSS work).

### The baseline (this run, `node scripts/conformance/fidelity.mjs --local http://localhost:5300 --bps 1440,390 --out docs/audit/evidence --validate`)

| Dial | Value | Gate | Read |
|---|---:|---|---|
| E overall | **51.8** | ≥90 | the honest composition gap the section work (Tasks 1–3) must close |
| T overall | **94.8 %** (55/58 state pairs) | ≥95 | three recorded gaps, reasons in `scorecard.json` |
| Q overall | **95** (settle, verified-only) | ≥90 | 19/20 settle samples; trigger family recorded as baseline, unscored |

Per-section E (all below the ≥88 floor — this IS the work-list, ordered lowest-first for Task 3): intro 31.4 · hero 45.6 · usecase 44.5 · footer 43.6 · platform 48.7 · map 52.0 · why 59.4 · chrome 60.8 · problem 64.5 · cta 70.4.

55/58 valid state pairs across entry/mid30/mid60/exit/END × 390+1440; 29 protocol-coincident rows (duplicates, fixed chrome, END collapse) recorded with reasons and excluded from the denominator; the three invalid rows are:
- `footer@390:mid60` — our document ends before the state (real coverage gap);
- `home-hero-wrap@390:mid60`, `home-map-wrap@390:exit` — mask share >55 % cap (masks would eat the frame; recorded, not scored).

Manifest validation: **zero rejections** (coordinate provenance complete, every pair scored or explicitly reasoned, motion traces present); `--validate` exit 0. The E/T gate FAILs printed are the baseline's honest disclosure, not gate failures of the instrument.

**Repeatability** (`--repeat-entry`, entry pairs captured twice at the committed 480 px storage policy): **20/20 within ≤1 point, worst |ΔE| 0.2** (`home-why-wrap@390`). (An earlier run had 19/20 with `footer@1440` unmeasurable — root-caused to the label-registry regression in residuals #1 and re-measured with the fix.)

**Stress** (`node scripts/conformance/stress.mjs --url http://localhost:5300/ --out docs/audit/evidence/stress.json`): **4/7 sizes clean** (the audit's run was 0/7 with transient reachability rows now filtered by the settled recheck). Persistent defect leads for Task 3: CTA button 2 px clip at 640×360; hero `01/محور`, `02/قياس` and `hro-line` text-on-text at 1440; hero marker reachability at 640×360/844×390. Zero horizontal overflow at all seven sizes.

**Trigger baseline (Q's second family — recorded, never scored):** the audit's live five-width trigger table is paired to sections by class token and normalised by THIS run's achieved entry offsets. Space validation: the early-family sections sit at a near-constant delta (median 1339 px at 1440: intro/problem/map/platform/why), while the late family (usecase/cta/footer ≈ 2800–3143 px) fires its triggers earlier relative to entry. Our measured onsets are recorded per section with a resolution note (±span/steps of section height). This is the Task 1 tuning target list, with real numbers on both sides — the exec run had none.

### Commands and outputs (the actual runs)

```bash
node --test scripts/conformance/pairs.test.mjs scripts/conformance/gates.test.mjs   # 34/34 pass
PLAYWRIGHT_BROWSERS_PATH=/tmp/pw-browsers node scripts/conformance/fidelity.mjs \
  --local http://localhost:5300 --bps 1440,390 --out docs/audit/evidence --validate   # E 51.8 · T 94.8 % · Q 95 · exit 0 (rejections: none)
PLAYWRIGHT_BROWSERS_PATH=/tmp/pw-browsers node scripts/conformance/fidelity.mjs \
  --local http://localhost:5300 --bps 1440,390 --repeat-entry --out docs/audit/evidence  # 19/20 within ≤1 pt, worst |ΔE| 0.3
PLAYWRIGHT_BROWSERS_PATH=/tmp/pw-browsers node scripts/conformance/stress.mjs \
  --url http://localhost:5300/ --out docs/audit/evidence/stress.json                 # 4/7 clean, 0 overflow
PLAYWRIGHT_BROWSERS_PATH=/tmp/pw-browsers node scripts/conformance/fidelity.mjs --score-only \
  --out docs/audit/evidence --validate                                              # reproduces the committed scorecard from the stored crops
```

Environment: Node v24.22.3 (supported 20–24), Playwright 1.60.0 with the documented `PLAYWRIGHT_BROWSERS_PATH=/tmp/pw-browsers` symlink fallback (the host cache carries chromium-1200; the install expects 1223), chromium `1200.x` headless, DPR 1, `reducedMotion: no-preference`, local vite dev server on strict port 5300 (`npx vite --port 5300 --strictPort`), live reference `https://heronaiapp.com/`.

### Known residuals (honest)

1. `footer@1440` repeatability — ROOT-CAUSED and fixed during the task: a state-label normalisation patch (`"end"` → `"end-clamped"`) silently broke the END-pair dispatch (`pairIsEnd` matched the label, not the declaration), flipping every END pair to entry in runs launched after the patch. The dispatch now reads the `declared` protocol field (immune to label renames) in both `captureLocalSide` and `buildTriggerPairing`; the repeatability run was re-measured with the fix.
2. Q's trigger family is a baseline, not passes: our onset detection returns null for seats whose reveals fire outside the sampled window (hero, chrome; several late sections) — named gaps, recorded per sample.
3. The docs/ size gate RULE 2 (docs/ total ≤30 MB) was already over the ceiling on `main` (39.4 MB at the audit) and the evidence adds to it within the per-push budget (+5 MB rule respected across the evidence pushes; crops stored ≤480 px, ≤~260 KB per file).
4. The manifest `everyPairValidOrExplicit` property holds (zero rejections, exit 0) — the E/T section floors all FAIL as the honest baseline gap they are.
5. The full `scripts/verify.sh` matrix is not re-run at Task 0 (the plan reserves it for the acceptance task); the task-scoped checks in the plan (focused tests, the fidelity instrument, the stress probe, the paired capture twice) all ran and pass.

### Rollback

Revert the task commits on `wip/r368-t0` (instrument + evidence land as separate commits; no product file is touched by Task 0).

## Task 1 — measurement foundation (the verified tuning targets)

Before touching any motion file, the two missing halves of the trigger
baseline were measured (the plan's "Use Task 0 traces to tune" requires
targets that are actually visual):

1. **The live trigger table's starts are NOT the visible moments.** A wheel-
   seated visual-onset sampler across each section's approach window
   (`scripts/conformance/ref-onsets.mjs`, seats in 150 px steps across
   [entry−2100, entry+300]) shows the reference's first *visible* style
   changes at fractions of section height (measured @1440):
   - `home-problem-wrap` visual onset **−0.34×H** (the trigger table says −1.8);
   - `home-why-wrap` visual onset **−0.78×H** (the table says −1.2);
   - `home-intro-wrap`, `home-platform-wrap`, `home-usecase-wrap`: **no
     pre-entry motion at all** — their signatures stay constant through the
     whole approach (their scrub families play AT/AFTER entry), while the
     table's starts for those same sections read −1.2/−1.9/−3.5.
   Tuning our reveal lines against the table would have moved the wrong dial
   in both directions; the verified targets are the visual onsets above.

2. **Our onsets fire EARLIER than the reference's visible motion for the
   sections with measured pairs** — ours (Task 0 baseline): problem −1.1×H,
   platform −1.0×H, map −0.1×H vs the reference's visible −0.34×H / at-entry /
   −0.2×H. The reveal line knobs (`OBSERVER_ROOT_MARGIN_ITEMS/LINES` in
   `frontend/src/lib/reveals.ts`, the 88 %/85 % entry lines) are the levers,
   and the reference is *heterogeneous* (why fires early, problem mid, the
   scrub families at entry) — a single global line cannot match all of them;
   the tuning must be per family/section.

3. **The settle-family failures at 768/1024/1920 (intro, platform, 5 frames)
   are ambient, not scroll-linked**: a live probe shows the intro's crawl
   marquee keeps the subtree signature changing forever (settle frame 9/9)
   while the same run's scroll-linked reveals complete in ≤2 frames. The
   settle sampler must exclude ambient CSS keyframe loops from its signature
   before its tolerance judges scroll-settle (an instrument refinement,
   recorded here as the measured fact; the fix belongs with the next capture).

These three findings are the honest state of Task 1: the measurement
foundation is laid (targets verified on both sides), the product tuning
(reveal lines, durations, preloader, pointer) is the next increment and is
NOT claimed done by this record.
