# Feature Specification: Heron Fidelity

**Feature Branch**: `wip/r368-t0` → `wip/r368-t1`… (task branches; program root: `plan/r368-heron-fidelity` @ `3b8eba04`)

**Created**: 2026-11-18 (from the approved `docs/specs/heron-fidelity.md`)

**Status**: In execution — Task 0 (repair measurement) closed at `wip/r368-t0` @ `6ee606e3`; Task 1 measurement foundation landed, product tuning in progress; Tasks 2–10 not started. (الحالة المرجعية: `docs/SPECS-REFERENCE.md`)

**Input**: Owner authorization to execute the full heron-fidelity program (Tasks 0–10) against `docs/specs/heron-fidelity.md` + `docs/superpowers/plans/heron-fidelity-plan.md`, with `docs/audit/project-audit.md` as the measurement baseline. This SpecKit package is the feature-form view of those two approved documents — **their scope and numeric criteria are unchanged here**; any conflict resolves to them.

## Overview

Bring Madarek close to the measured visual and interaction quality of Heron's public experience — scroll feel, reveals and transitions, cursor and loading sequence where appropriate, layered pre-rendered artwork, SVG geometry, color, typography, spacing and responsive composition — while keeping Madarek's Arabic-first identity, its own brand, original artwork and educational content. The language is established on the landing page, extended to public pages, applied to every authenticated web role (visual only), and adapted to the Expo app with native interaction conventions. Copy is reduced ≥20% and measured CSS ≥10% only after behavior and ownership are proven safe.

The reference (`heronaiapp.com`) informs craft only: measured parameters (geometry, type, colour, durations, easings, triggers) are reproduced in Madarek-owned code and assets; no Heron source, text, images, logo or fonts are ever copied.

## Clarifications

### Session 2026-11-18 (owner authorization)

1. Q: Pause between tasks for approval? → A: No — execute continuously to the acceptance criteria, recording real measurements only; the final delivery lists completed/remaining items, concrete numbers, branch/commit links, and any unmet criteria.
2. Q: Baseline branches? → A: `main` @ `347e2508` or newer; Task 0 on `wip/r368-t0`, Task 1 on `wip/r368-t1`; continue landed work, never re-branch or erase prior evidence.
3. Q: Use stored results as current? → A: No — re-measure when source or instrument changes; raw outputs, run commands, versions and failures are stored as-is.
4. Q: Measurement gaps? → A: Prove impossibility with reviewable evidence; never lower a threshold, change a denominator, or exclude rows outside the pre-existing correct definitions.
5. Q: Production? → A: Out of reach — no production DB, secrets, config or deploys; pushes to task branches only (never `main`, never force-push).

### Implementation Reality (measured during Task 0)

1. The original E=56.7/T=100% scorecard was invalid (3/20 aligned roots); the repaired instrument (Task 0) re-baselined to **E 53.0 · T 98.3% (57/58) · Q 95** on true named states at 1440+390.
2. `footer@390:mid60` is impossible on BOTH sides (local live end 13992 < needed 14219; reference stage end 11075 < needed 11404) — the spec's documented-limitation path applies; the row stays in the denominator with its proof.
3. Two non-entry frames (`home-hero-wrap@390:mid60`, `home-map-wrap@390:exit`) are E-refused by the preregistered 55% mask-share cap (74.9%/63.7% text) — covered evidence, unscored E.
4. The reference's trigger-table starts are NOT its visible onsets (measured: problem −0.34×H vs table −1.8; why −0.78 vs −1.2; intro/platform/usecase have NO pre-entry motion while their table rows read −1.2/−1.9/−3.5). Tuning must use `docs/audit/evidence/ref-onsets.json`, never the table alone.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — A visitor experiences reference-grade landing craft (Priority: P1)

Scroll, reveal, transition, preloader and pointer behavior match the measured reference families within Q tolerances; artwork depth/layering/crop match within E tolerances; keyboard, touch and reduced-motion paths each work.

**Why this priority**: The landing page is the program's measurable core; every later story composes on this language. **Test**: paired E/T/Q scorecard per section (≥90/≥95/≥90 gates, ≥88/≥90/≥85 per section/family), mouse/touch/keyboard/reduced-motion traces, LoAF <50 ms, bundle ≤770 KB gzip.

### User Story 2 — Public and authenticated surfaces share the language (Priority: P1)

Every public route and every role's pages/shells/states (dashboard/list/detail/form/empty/loading/error) carry the same hierarchy, tokens, density and responsive quality — with zero behavior change.

**Test**: route/role inventories at 390/768/1440 + stress widths; axe WCAG 2.2 AA; Lighthouse mobile ≥90 on sampled routes; zero overflow/clip/overlap/unreachable primary action across the declared matrix.

### User Story 3 — Mobile keeps native interaction with the same craft (Priority: P2)

The Expo app's ~125 routes/families adopt the visual tokens and owned assets while navigation, gestures, safe areas, keyboard, dark mode, reduced motion and font scaling stay native. Android APK output only; iOS remains "coming soon".

**Test**: mobile typecheck/unit checks, `expo export` validation, representative screenshots per role/size, APK size review.

### User Story 4 — The product says less, better (Priority: P2)

Landing copy is ≥20% shorter with zero lost meaning/legal/help/role instruction; audited landing CSS is ≥10% smaller than the 668,169-byte baseline with zero lint errors and no gate increases.

**Test**: reproducible word/byte counts before/after; affected screenshots; content tests; computed-style snapshots prove no visual regression beyond ±1 point E.

### User Story 5 — The evidence is trustworthy (Priority: P1)

Every claim in the final scorecard is reproducible from committed evidence: raw crops, run commands, tool versions, failure outputs and residuals included; repeated same-state E varies ≤1 point.

**Test**: `--score-only` reproduces the scorecard; manifest validation exit 0; the checklist in `docs/specs/heron-fidelity.md` §Success test checklist.

## Functional Requirements

- **FR-001 (paired evidence)** — Every comparable landing section has named, coordinate-valid reference and local states at 390/768/1024/1440/1920; T = verified matched pairs / required pairs per the `pairs.mjs` law; E-refused rows (mask cap) are covered-but-E-unscored and listed; reference-impossible states carry the documented limitation with both sides' reasons.
- **FR-002 (E composition)** — E = 100 × mean SSIM outside preregistered masks over the section∩viewport crops at the named states; masks derive from the reference side only, never chosen after seeing a score; raw images, coordinates, masks and per-state values are committed.
- **FR-003 (Q motion)** — Q families (scroll/settle, reveal-trigger, route transition, cursor, touch) are measured separately; trigger position within ±2% of section scroll span; displacement/opacity/scale within ±5%; settle ≤2 frames; semantic order/direction matches; unknown reference values stay unscored (recorded gaps).
- **FR-004 (assets)** — Every replaced asset is Madarek-owned with recorded source/license, dimensions, alpha, byte count, and 1×/2× before/after evidence; the R366 ≤60KB policy is re-evaluated per asset where 2× softness is proven.
- **FR-005 (tokens)** — Color/type/spacing flow through the token sheets; measured section exceptions stay section-scoped; generated token files are never hand-edited; design gates (`check-colors/raw-css/motion-tokens/icons`) pass.
- **FR-006 (responsive/a11y)** — The declared matrix (12 widths + 640×360 + foldable + 200% zoom + themes + RTL + reduced motion + 4× CPU) has zero overflow/clipping/overlap/unreachable primary action; WCAG 2.2 AA passes on representative routes.
- **FR-007 (performance)** — Lighthouse mobile ≥90 on `/` and representative public/auth/app routes with LCP/CLS/INP recorded; no >50 ms LoAF on the pinned production trace; dev-server timings are never substituted.
- **FR-008 (safety)** — No change to routes, permissions, APIs, DB schema/data, workflows or production; no Heron-origin asset/text/logo/font; no gate weakened; backend contract tests prove behavior drift is zero.

## Success Criteria

The ten acceptance criteria of `docs/specs/heron-fidelity.md` §Acceptance criteria govern verbatim (E≥90/≥88; T≥95/≥90; Q≥90/≥85 per family; responsive zero-defect matrix; Lighthouse ≥90; WCAG 2.2 AA; copy ≥−20%; CSS ≥−10% of 668,169 bytes; Node 20–24 + all project gates; behavior/originality proven; evidence complete, repeat variance ≤1 point). **This package adds no criterion and relaxes none.**

## Out of Scope

Everything in the approved spec's Excluded list: business logic/roles/permissions/API/DB/production changes; iOS push/release; new capabilities or renames; gate lowering or baseline re-pinning; any Heron proprietary material.

## Dependencies and Assumptions

- **Assumes**: `main` ≥ `347e2508`; the frozen r335 heron-spec; the live reference stays reachable (else the documented-limitation path with frozen measurements applies).
- **Depends**: `docs/redesign/r341/OWNERSHIP.md` file ownership; `AGENTS.md` worktree law (one worktree per task, `wip/<task-id>`); the +5 MB docs/ per-push budget and ≤500 KB tracked-file rule; 2-CPU host (no parallel heavy builds).
