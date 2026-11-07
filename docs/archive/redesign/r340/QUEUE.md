# R340 QUEUE — finish everything on a single main (lead-maintained; agents do NOT edit)

Legend: `[ ]` todo · `[~]` running · `[x]` done (result) · `[!]` blocked (reason)
Rules in force: 1–2 heavy agents at a time (never >3); tasks ≤15 min; commit+push ≤5 min (WIP commits fine); every brief self-contained (a respawn continues from the last commit); `verify.sh --fast` before every push, NEVER piped; tests are law — never raise a ceiling / re-pin a baseline / weaken an assertion / add continue-on-error; avoid branch names matching `r338/t13*`; CI owner-dead unless Actions billing fixed (local verify = evidence). A task that overruns its box twice is split, never dropped.

## P0 — one branch only (lead)
- [ ] T-S0a DONE · merge r339/t31 (dead-rule deletion, 7 commits) after verify --fast + section conformance green on it.
- [ ] T-S0b DONE · merge r339/t16 (T-16-PANEL.md doc — the §5 baseline).
- [ ] T-S0c DONE · scripts/branch-sweep.sh created + run → `git ls-remote --heads origin` = only `main`; worktrees pruned. Re-run at end of every wave + at round end.

## P1 — instrument: turn the panel's findings into assertions (T-P1, owns scripts/conformance/*)
- [ ] T-P1a scroll-progress mechanic assertion (element count, scrub range, colour) + implement scroll-scrubbed progress/annotation layer to satisfy it.
- [ ] T-P1b dead-void detector @390/768/1440 (longest empty vertical run ≤ 0.6 viewport height per section).
- [ ] T-P1c horizontal-clipping check (no text node cut mid-word by viewport edge except designed marquees).
- [ ] T-P1d cookie-banner bbox test (dismissible; never overlaps primary CTA/footer).
- [ ] T-P1e design-language census extension (product cards adopt paper/hairline/[tag]); CTA hover secondary affordance; [01]–[03] index ≥11px + AA@390; one type-tier ladder.
- [ ] T-P1f re-run panel assertions; fix what they flag on the landing.

## P2 — T-17 hero off-book (T-H, owns hero css/tsx + mapping)
- [ ] T-H1 map the 94.8% off-book elements → add counterparts or justified excusals; cap 5% off-book; coverage floor 40% green.

## P3 — rebuild pages on the pattern library, delete legacy sheets wholesale (order: auth → about → help → app → legal/404 → student shell → teacher → registrar → quality → owner → colleges → notifications/pdf)
Each task: rewrite TSX+CSS in layers, no !important, tokens only (stylelint gate), delete the legacy sheet it replaces, per-page conformance row ≥90, vitest green, bundle ≤770, css-counts budget ratcheted DOWN.
- [ ] T-D1 auth (login/register/forgot) → delete auth.css family
- [ ] T-D2 about → legacy rules deleted
- [ ] T-D3 help → legacy rules deleted
- [ ] T-D4 app/download → legacy rules deleted
- [ ] T-D5 legal + 404/500 → legacy rules deleted
- [ ] T-D6 student shell + top screens → student.css + student/* collapse
- [ ] T-D7 teacher shell → teacher/* collapse
- [ ] T-D8 registrar/campus → campus.css collapse
- [ ] T-D9 quality → teacher-quality.css collapse
- [ ] T-D10 owner → owner.css collapse
- [ ] T-D11 colleges → colleges.css collapse
- [ ] T-D12 notifications/pdf → notifications.css/pdf.css collapse
- [ ] T-D13 lightningcss dedupe + folder moves (base/ layout/ components/ pages/, landing → pages/landing/) + rNNN-/wave-/patch- name removal

## P4 — honest re-baseline + ratchet
- [ ] T-R1 chunked full matrix (sections + chrome + tween + dark-ink + 390 + new panel assertions) → ratchet re-pinned UP to the honest number (never down).

## P5 — blind panel (arbiter)
- [ ] T-B1 blind panel after the P1/P3 major batches; target ≥76/84, no criterion <6. Top-5 list becomes the next queue if below target.

## P6 — mobile (apps/mobile only; 1 agent at a time)
- [ ] T-M1 exams chip hierarchy + live CTA competition.
- [ ] T-M2 settings grouping + profile 30-row grouping.
- [ ] T-M3 transcript virtualization (R1 T9).
- [ ] T-M4 muted-ink AA audit.
- [ ] T-M5 scripts/build-android-local.sh + docs/mobile/ANDROID-LOCAL.md + expo-navigation-bar (LR-001); try in sandbox if SDK fetches.
- [ ] T-M6 OTA update ids recorded (eas update from sandbox if the eas-ota job cannot run).
- [ ] T-M7 mobile review panel ≥9 (once, at the end).

## P7 — hygiene
- [ ] T-Y1 ponytail audit applied to non-landing code (cleanup/CSS agents load it).
- [ ] T-Y2 single source of truth for copy/tokens/routes (T-24/T-25).
- [ ] T-Y3 knip/jscpd/depcruise ratchets only improving.
- [ ] T-Y4 AGENTS.md + docs INDEX updated.
- [ ] T-Y5 final branch-sweep + REPORT.md (§7 exit table).
