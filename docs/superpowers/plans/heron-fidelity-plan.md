# Heron fidelity implementation plan

**Status:** Proposed; implementation has not started  
**Specification:** [`docs/specs/heron-fidelity.md`](../../specs/heron-fidelity.md)  
**Audit:** [`docs/audit/project-audit.md`](../../audit/project-audit.md)

This sequence is gated: resolve the measurement result discrepancy and pin a reproducible environment before visual work. Keep every implementation task in its own worktree/branch as required by the repo guide. Shared conformance tooling, baselines, ceilings, global tokens and workflows remain lead-owned. Section tasks must follow the active `docs/redesign/r341/OWNERSHIP.md` and mapping files; that ownership file supersedes this plan if it changes.

## Completion contract

Do not call the program complete until the spec's acceptance criteria pass: E ≥90 overall and ≥88 per section at both primary viewports; T ≥95 overall and ≥90 per section; Q ≥90 overall and ≥85 per measured family; zero responsive collisions/overflow across six stress sizes; accessibility and performance gates pass; no source/reference assets or copy are copied; all evidence and raw outputs are committed.

Before implementation, make a reviewed decision on SSIM tooling and masks, explain/fix the current conformance threshold/result mismatch, and record a pinned supported Node/browser profile. If those gates are not satisfied, stop at measurement work and return the concrete blocker to the lead for a decision.

## Task 1 — Make the conformance contract truthful

**Objective:** Resolve why the recorded report shows intro/map below the 40% coverage floor and platform heuristic share above the 50% cap while `gateFailures` is empty. Establish a supported runtime and fresh reproducible run.

**Owned files:** Lead only: `scripts/conformance/run.mjs`, `scripts/conformance/pages.mjs`, `scripts/conformance/ratchet.json` only if the existing documented policy requires a monotonic update; focused tests under `scripts/conformance/` if needed; `docs/audit/evidence/manifest.json` for environment/run metadata. Never lower a floor or ratchet.

**Changes:** Inspect result generation and failure checks; add/repair a focused regression check for each threshold; ensure report `PASS` is impossible when an unreviewed threshold fails; make reviewed exceptions and owners visible in output. Normalize local Node to the repo-supported range (`>=20 <25`), resolve dependency/client generation without touching production credentials or database, and document the exact browser build/profile. Keep generated outputs outside committed ratchet changes until reviewed.

**Checks and expected result:**

- `node --version` → supported major 20–24.
- Focused conformance threshold tests → all pass, including fixtures for low coverage and over-cap heuristics.
- Start a task-owned Vite server on its assigned 53NN port; `node scripts/conformance/run.mjs --url http://localhost:53NN --gate` → result provenance records current SHA/profile; gate outcome agrees with every emitted failure.
- `node -e ...` or report parser → all nine content sections plus chrome have coverage and no contradictory `PASS`/failure state.

**Completion:** 100% of documented limits have a corresponding failing fixture; no report says PASS with an unreviewed below-floor coverage or above-cap heuristic; fresh run is reproducible twice, with summary pass rate within 0.2 points and per-section coverage within 1 point.

**Tools/skills:** systematic debugging, root-cause tracing, specify; Node test runner, conformance runner, Playwright browser.  
**Dependencies:** none.  
**Parallel work:** no; this task changes shared lead-controlled instrumentation.  
**Rollback:** revert only the task commit. Preserve ratchet monotonicity; do not restore an older/lower baseline. Keep failed run JSON in evidence for diagnosis.

## Task 2 — Lock the visual and motion evidence baseline

**Objective:** Produce complete comparable evidence and calculate initial E/T/Q without changing product UI.

**Owned files:** `docs/audit/evidence/manifest.json`, `docs/audit/evidence/visual/`, `docs/audit/evidence/motion/`, and (if required) one small comparison script under `scripts/conformance/` owned by lead. Do not edit section source or mapping without a separate ownership task.

**Changes:** Define fixed capture states, viewport, browser, DPR, font-ready/settle condition, masks and motion checkpoints. Capture all 9 content sections plus chrome at 1440×900 and 390×844; run stress observations at 320, 360, 412, 640×360 and 844×390. Save matched screenshots, motion traces, raw per-target results, tool versions and mask rationale. Measure reference only from approved public/frozen observation sources; mark unverified reference values explicitly.

**Checks and expected result:** manifest validator → all required targets named, no missing counterpart at primary widths, every mask reviewed and linked; repeat capture of 10 representative states → E variation ≤1 point; baseline report emits E/T/Q separately, never only F.

**Completion:** 100% of primary section/viewport pairs have reference and local evidence; T calculated from rows and ≥95% or remaining missing states are listed as a release blocker; 100% of trace samples cite source and measurement status.

**Tools/skills:** Firecrawl for current public source checks; browser capture tooling; image comparison/SSIM tool after approval; writing-plans/specify acceptance checklist.  
**Dependencies:** Task 1.  
**Parallel work:** no product sections in parallel; evidence profile must be stable first. A second reviewer may inspect masks without editing owned files.  
**Rollback:** remove only newly generated evidence/comparator outputs; never rewrite frozen reference data. Keep prior audit captures unchanged.

## Task 3 — Bring landing motion within measured behavior and frame budget

**Objective:** Match verified scroll/reveal/transition curves while reducing page-content long frames and preserving reduced-motion behavior.

**Owned files:** Lead/shared motion owner: `frontend/src/lib/motion/sheetLenis.ts`, `frontend/src/lib/motion/sheetConductor.ts`, `frontend/src/lib/reveals.ts`, and directly related motion styles only if assigned; tests `frontend/tests/unit/r313-lenis.test.ts`, relevant reveal tests, `frontend/tests/e2e/r366-scroll-parity.e2e.ts`, `frontend/tests/e2e/r366-scroll-trace.e2e.ts`.

**Changes:** Use Task 2's verified checkpoints. First remove duplicate scroll reads/writes or listeners only where traces attribute them; preserve existing shared clock and native reduced-motion path. Adjust only measured deltas in trigger, easing, duration, displacement and settle behavior. Do not add or replace an animation library without a separately reviewed performance and bundle case.

**Checks and expected result:** focused motion unit/e2e tests pass; matched Q ≥90 overall and ≥85 per measured family; primary states have no missing motion sample; production trace reports browser/CPU/hardware and meets the current frame/LoAF target; INP p75 and CLS stay within the spec's accepted baseline.

**Completion:** all approved motion families reach their Q threshold; reduced-motion never initializes smooth scrolling or hides content; no >50 ms LoAF and no dropped-frame regression in the declared production trace; no bundle ceiling regression.

**Tools/skills:** systematic debugging, root-cause tracing, Playwright, CDP performance trace, review-animations.  
**Dependencies:** Tasks 1–2.  
**Parallel work:** no; shared clock and scroll machinery has one owner.  
**Rollback:** revert the motion task commit if any scroll, restoration, reduced-motion or frame acceptance regresses; preserve the evidence trace showing the regression.

## Task 4 — Recompose the hero and intro

**Objective:** Reduce the observed hero plate density/crop gap and match the hero-to-intro scale and whitespace without borrowing reference imagery or copy.

**Owned files:** `frontend/src/components/landing/sections/Hero.tsx`, `frontend/src/components/landing/sections/Statement.tsx`, `frontend/src/styles/landing/hero.css`, `hero-mechanics.css`, `hero-plate.css`, `statement.css`; only corresponding section mapping JSON if the lead explicitly assigns it.

**Changes:** Tune owned illustration composition, scale/crop, label count/placement, line weight, spacing and Arabic text hierarchy against the measured reference and accepted visual masks. Keep interactions operable by touch and keyboard; keep any section-specific measured color override local to its section sheet.

**Checks and expected result:** focused landing/browser capture at primary viewports; E ≥88 for each of hero/intro at both primary widths; no plate-label collision at 320, 360, 390, 412, 640×360 or 844×390; related interaction and reduced-motion checks pass.

**Completion:** both seats meet their section E floors, each required state has a counterpart, and reviewers accept all six stress captures with zero clipping/collision. No new external asset or reference copy.

**Tools/skills:** impeccable for composition and review; web-design-guidelines/accessibility; browser capture tool.  
**Dependencies:** Tasks 1–2; Task 3 where motion changes affect captures.  
**Parallel work:** can run alongside Task 5 or 6 only in separate worktrees with exclusive ownership; no shared mapping, token or instrument edits.  
**Rollback:** revert only hero/intro-owned files if their E or responsive checks regress; keep the prior approved screenshot set.

## Task 5 — Recompose map and platform

**Objective:** Bring the two lowest-confidence/high-risk spatial sections into the approved geometry and motion contract.

**Owned files:** `frontend/src/components/landing/journey/JourneyScene.tsx` and assigned `frontend/src/components/landing/journey/*.tsx`; `frontend/src/components/landing/sections/Product.tsx`, `Live.tsx`; `frontend/src/styles/landing/journey.css`, `platform.css`; corresponding map/platform conformance mappings only when explicitly assigned. Confirm exact map ownership from the active r341 `OWNERSHIP.md` before starting.

**Changes:** Improve measured map/scene scale and transition continuity; resolve platform annotation and heuristic-only areas with explicitly bound counterparts. Keep copy-driven counts owned by platform `Live.tsx` as project instructions require. Do not change shared geometry rules or mapping plumbing owned by the lead.

**Checks and expected result:** per-section E ≥88 at each primary width; map/platform T ≥90; platform heuristic share ≤50% of pairs; all section/motion states score with zero undocumented exclusions; stress widths have no overlap/clipping.

**Completion:** both sections meet section score floors and the conformance gate; every geometry exclusion has an owner/reason or is measured; map/platform motion meets Q family floor.

**Tools/skills:** impeccable, systematic debugging for measured defects, browser capture tooling.  
**Dependencies:** Tasks 1–3.  
**Parallel work:** yes, separate from Task 4 and Task 6 only after ownership confirmation; journey and platform are disjoint. Do not edit `scripts/conformance/run.mjs` or shared tokens.  
**Rollback:** revert map/platform-owned files only; retain the earlier matched baseline and trace.

## Task 6 — Tune problem, why, use case and CTA/footer seats

**Objective:** Raise remaining section scores and coverage without broad stylistic rewrites.

**Owned files:** `Chapters.tsx` + `pains.css`; `Why.tsx`/`WhyScene.tsx` + `why.css`; `Roles.tsx` + `roles.css`; `Vision.tsx` + `cta.css`/`colleges.css`; `Footer.tsx` + `footer.css`, all under the current landing ownership table. Edit one named seat per task/worktree if parallelized.

**Changes:** Work in score order from Task 2: problem, why, footer, use case, CTA. Correct only measured geometry, density, hierarchy and motion deltas; retain established Arabic copy and accessible controls. Limit section-scoped local vars to measured deviations.

**Checks and expected result:** each assigned section E ≥88 at 1440×900 and 390×844; each T ≥90; no unreviewed low-coverage or heuristic states; primary actions remain reachable at all stress sizes.

**Completion:** all five seats meet individual score and responsive criteria, with complete evidence and no new mapping skips without written reason and owner.

**Tools/skills:** impeccable, accessibility review, browser capture tooling.  
**Dependencies:** Tasks 1–2; Task 3 for states using shared scroll motion.  
**Parallel work:** yes, but one worktree per section seat; never parallel-edit `Footer.tsx`/`footer.css` with chrome work or `Vision.tsx`/`colleges.css` with another CTA task.  
**Rollback:** revert only the failing seat's commit and preserve previous section results.

## Task 7 — Align shared landing chrome and routes

**Objective:** Match measured header, loader, global framing and footer transitions without altering application routes or auth screens.

**Owned files:** lead-assigned `_chrome` files only: `frontend/src/lib/motion/*`, `frontend/src/styles/landing/preloader.css`, `nav.css`, `consent-edge.css`, and the relevant shell components after checking r341 ownership. Shared motion sources remain single-owner as in Task 3.

**Changes:** Compare header state, entry/loader behavior, focus behavior, scroll hide/show, consent edge and transitions to captured reference states. Preserve route strings in `frontend/src/lib/routes.ts`; no route renames. Remove motion only when it has no user value and its removal remains within the measured contract.

**Checks and expected result:** guest landing navigation, keyboard focus, reload/back behavior, scroll lock, reduced motion and capture tests pass; chrome E ≥88 at both primary widths and chrome T ≥90.

**Completion:** every agreed chrome state has a matched capture/trace, all actions remain accessible, no route or consent behavior regression.

**Tools/skills:** impeccable, accessibility, Playwright browser checks.  
**Dependencies:** Tasks 1–3; landing section layout stable enough to compare.  
**Parallel work:** no while Task 3 touches shared motion files. May parallelize only disjoint chrome CSS after lead assigns files.  
**Rollback:** revert assigned chrome changes without restoring unrelated section work.

## Task 8 — Reduce CSS debt without changing accepted visuals

**Objective:** Make the accepted landing styles easier to maintain after visual targets are stable.

**Owned files:** Only the landing CSS sheets named in Tasks 4–7; `scripts/gates/stylelint-baseline.json` and shared tokens are lead-only and must not be weakened or updated to hide findings.

**Changes:** Consolidate duplicate selectors and obsolete overrides with before/after computed-style evidence. Remove declarations only when paired captures and interaction behavior remain equivalent. Address current lint errors and warning growth in owned files. Do not perform broad formatting or rename selectors during fidelity work.

**Checks and expected result:** direct CSS lint reaches 0 errors and ≤57 warnings; CSS count checks remain at or below baseline/current values; all affected E/T/Q results remain within 1 point of accepted values; stylelint ratchet passes without baseline changes.

**Completion:** zero lint errors; warnings no greater than 57; no metric increase; every removed override has a before/after evidence reference.

**Tools/skills:** ponytail/minimal-change review, stylelint, CSS count/coverage gates, browser captures.  
**Dependencies:** Tasks 4–7 approved and visually frozen.  
**Parallel work:** yes, one stylesheet owner per worktree; no shared token/gate edits.  
**Rollback:** revert only the CSS cleanup commit if any accepted visual or interaction state changes beyond tolerance.

## Task 9 — Final acceptance and handoff

**Objective:** Produce the reviewable release record for the public landing fidelity program.

**Owned files:** Lead: `docs/audit/evidence/manifest.json`, final raw results under `docs/audit/evidence/`, update `docs/audit/project-audit.md`, `docs/specs/heron-fidelity.md` status/decisions, and this plan's completion record. No product files unless a failed acceptance is routed back to its owner.

**Changes:** Run the full acceptance matrix on the pinned profile; document final E/T/Q per section and family, performance and accessibility outputs, all exclusions, unresolved risks, exact git SHA and commands. Update the audit/spec/planned completion figures from fresh measurements; do not copy prior claims.

**Checks and expected result:** `bash scripts/verify.sh --fast` passes; full `bash scripts/verify.sh` passes on the lead/lander machine; all design and bundle gates pass; production browser traces and primary/stress evidence satisfy spec; no working-tree changes remain outside explicitly retained user files.

**Completion:** every spec criterion passes; evidence manifest is 100% complete; current full-gate run is recorded; audit/spec state the measured outcome and accepted residuals; user receives branch/commit summary for review.

**Tools/skills:** full project verification set, conformance runner, Playwright, writing-plans closeout.  
**Dependencies:** Tasks 1–8.  
**Parallel work:** no; single lead owns final aggregate and report.  
**Rollback:** if any gate fails, do not promote the report as complete. Route the finding to the owning task and retain the failed output as evidence; never lower a threshold to force a pass.

## Suggested parallel ownership after baseline

Once Tasks 1–2 are complete, safe section-level work can overlap only in separate worktrees: hero/intro (Task 4), map/platform (Task 5), and one of problem/why/usecase/CTA seats (Task 6). Each seat has exclusive component and stylesheet ownership. Task 3 shared motion, Task 7 shared chrome, Task 8 consolidation and Task 9 aggregate acceptance are serial. Worktree branch naming, file ownership, and commit/push cadence follow the active repository guide and each task brief.
