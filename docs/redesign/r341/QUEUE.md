# R341 QUEUE — THE SWARM FINISH (queen-maintained; workers do NOT edit)

Legend: `[ ]` todo · `[~]` running · `[x]` done · `[!]` blocked. Task briefs: `tasks/<ID>.md`.
Laws (§0): nothing gets worse; commit+push to `main` after every verified change (`git pull --rebase` first; `verify.sh --fast` before every push, NEVER piped); measured parameters only; the blind panel is the arbiter; ratchet 91.8 only goes up; bundle ≤770; branch names never match `r338/t13*`; work branches `wip/<ID>`, short-lived, swept every wave.

## PHASE 1 — landing perfection + instrument truth (12 concurrent)
- [ ] H1 hero off-book 94.8% → ≤5% (split a/b/c/d by element group: title-cell family, sub-cell family, deco cards, meta/engine chrome) — owns `mapping/home-hero-wrap.json` + `Hero*.tsx` (COORDINATED via single agent at a time on the JSON: a→b→c→d merge order)
- [ ] L1-a gallery/why: no clip, no stray thumbnail, carousel chrome (arrows/dots/snap/edge fade) — owns `styles/landing/why.css` + `components/landing/sections/*Why*`
- [ ] L1-b 390 dead voids all sections (longest empty run ≤0.6vh) + ≥20px gutters + safe-area — owns `styles/landing/*.css` @390 blocks (NOT why.css, NOT cta.css)
- [ ] L1-c cookie banner: dismissible, layout-offset, never over CTA/footer — owns `consent-edge.css` + Consent component
- [ ] L1-d CTA hover secondary affordance (arrow nudge/underline sweep, ≥2 channels) + focus parity — owns `styles/landing/cta.css` + CTA component
- [ ] L1-e type-tier ladder (body/mono/nav distinct rungs, [01]–[03] ≥11px AA@390) — owns type tokens in landing sheets + index components
- [ ] L1-f scroll-progress/boot-log parity: 7 elements live, scrub range + colour assertions — owns `progressRegistry.ts` + boot-log component
- [ ] I1 instrument: add panel's human-visible failure classes as gate axes (sticky-header overlap, orphaned edge marks, mixed-direction caption breaks) — owns `scripts/conformance/panel.mjs`
- [ ] R1 chunked full matrix on merged main → ratchet UP to honest number — owns `ratchet.json` (lead approves)
- [ ] B1 panel #1 (3 independent judges, R333 12-criterion rubric, blind) → `panel-1.md`; target ≥70/84 here, loop to ≥76/84 (gate, not suggestion)

## PHASE 2 — pages rebuilt on the pattern library; legacy sheets deleted wholesale (14 concurrent)
Recipe (proved on /auth): rewrite TSX+CSS in layers (pattern library + Heron rungs/rhythm/hover/reveal), no `!important`, tokens only → per-page row `pages.mjs --routes <r> --bps 1440,390 [--dark]` ≥90 all cells → delete the legacy rules the page no longer uses (coverage probe + codemod; unit pins restored at original position) → `verify.sh --fast` + page E2E → reviewer → merge → css-counts budget DOWN. Preserve every route, form behaviour, test-id, a11y feature.
- [ ] D1 auth register+forgot+reset → delete `auth.css` (1525)
- [ ] D2 about (`PublicPages.tsx` about seat) → legacy rules deleted
- [ ] D3 help → legacy rules deleted
- [ ] D4 app/download (`AppDownloadPage.tsx`) → legacy rules deleted
- [ ] D5 legal + 404/500/403/maintenance (`legal.css` 655 + error pages) → legacy rules deleted
- [ ] D6 student shell/layout (`AppShell`, `student.css` shell rules) → collapse
- [ ] D7a student screens: dashboard/courses/catalog/calendar → `student/*` collapse
- [ ] D7b student screens: exams + online-exams + `student/exams.css` (1083) → collapse
- [ ] D7c student screens: results/schedule/alerts/messages → collapse
- [ ] D7d student screens: assistant/profile/misc/downloads/library/mooc/jobs/skills/gamification/social/ar/university/live/payment/map/matrix/research/webinars → collapse
- [ ] D8 teacher shell + screens (`teacher/*`) → collapse
- [ ] D9 registrar/campus (`campus.css` 815) → collapse
- [ ] D10 quality (`teacher-quality.css` 1145) → collapse
- [ ] D11 owner (`owner.css` 1042) → collapse
- [ ] D12 colleges (`colleges.css` 1342) → collapse
- [ ] D13 notifications/pdf (`notifications.css` 793 + `pdf.css` 865) → collapse

## PHASE 3 — CSS finish (10 concurrent; starts as D-tasks free files)
- [ ] C1 `polish.css` (2946, 36 !important) split by line ranges ×3 agents
- [ ] C2 `components.css` (3178) split ×3 agents
- [ ] C3 `base.css`/`layout.css`/`unified-parity.css` (665+1599+1304)
- [ ] C4 lightningcss dedupe/merge across everything
- [ ] C5 folder moves: `base/ layout/ components/ pages/`, landing → `pages/landing/`; reference sweep + full vitest; remove `rNNN-`/`wave-`/`patch-` names
- [ ] C6 the last `!important` → 0 (specificity causes fixed, layer ordering)
- [ ] C7 stylelint ratchet to new floor. TARGET: ≤33,000 lines (landing ≤13.5k, non-landing ≤19.5k), `!important`=0

## PHASE 4 — mobile (10 concurrent, `apps/mobile/**` only, parallel with 2–3)
- [ ] M1 exams chip hierarchy · [ ] M2 live CTA competition · [ ] M3 settings grouping · [ ] M4 profile grouping · [ ] M5 transcript virtualization · [ ] M6 muted-ink AA audit · [ ] M7–M9 visual-language parity (paper/ink/orange, hairlines, no shadows, `[nn]` numerals) over student screens ×3 groups · [ ] M10 teacher/registrar/quality/owner polish · [ ] M11 native build + OTA (`eas update` ids recorded; APK via EAS or `scripts/build-android-local.sh`) · [ ] M12 mobile review panel ≥9 (3 judges)
Gates per batch: tsc 0, jest green, lint 0 errors, contract-check, tokens:check, expo export.

## PHASE 5 — hygiene (5 concurrent, parallel)
- [ ] Y1 ponytail audit applied to non-landing `frontend/src`, backend, scripts (safe cuts only)
- [ ] Y2 single source of truth for copy/tokens/routes
- [ ] Y3 knip/jscpd/depcruise ratchets only improving
- [ ] Y4 AGENTS.md, scripts/README.md, docs/INDEX.md, archive closed rounds
- [ ] Y5 pre-push/CI config sanity

## PHASE 6 — validation and close (12 reviewers/fixers)
- [ ] V1 full chunked matrix (sections+chrome+tween+dark-ink+390+panel+pages) light/dark
- [ ] V2 final web blind panel ×3 ≥76/84 no criterion <6 (loop until green)
- [ ] V3 mobile panel ≥9
- [ ] V4 final branch-sweep → only main; REPORT.md = §9 exit table; AGENTS.md updated; last retro
