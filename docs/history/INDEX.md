# Redesign rounds — history index (R331 pass 1)

Collapsed by the R331 repo-hygiene pass (2026-11-02). The full text record
(REPORT/HANDOFF/BOARD/BRIEF + JSON ledgers) of rounds **r312–r330** lives in
[`redesign-rounds.tar.gz`](redesign-rounds.tar.gz) (404KB, PNG evidence
excluded). Every removed file — including all PNG shots — is preserved in the
GitHub Release `evidence-r331` (`removed-from-tree/`, staged locally at
`/home/z/evidence-r331/`) and remains recoverable from git history (no
history was rewritten).

Heavy round evidence (`audits/evidence/`, 271MB, rounds r304–r327: webm
screencasts, full-page PNG/JPG censuses, frame sheets, probe JSONs) moved out
of the tree wholesale in the same pass — same Release, same recovery story.
Round harnesses that re-read their evidence (`scripts/r314`, `r316`, `r319`,
`r321`, `r323`, `r325`, `r327`, …) now require the Release copy downloaded
back into `audits/evidence/` (gitignored) before a re-run.

| Round | One-line decision / outcome |
|---|---|
| r312 | Frame-by-frame transition evidence (Phase 4 §R R2) — closed the "no per-transition reference comparison" gap; evidence frames + method notes for every route transition (webm + 10fps sheets in audits/evidence/r312). |
| r313 | «Parity Closure» — Madarek made visually/behaviourally identical to heronaiapp.com: Heron grammar end-to-end (paper #F6F6EE, radius 0, Lenis 1.1.5, 9-section landing within 1% of reference height); all gates green; two external incidents logged (leaked PAT to revoke, demo-account lockout). OVERRIDE-LEDGER.md + NOTES-D15.md stay in-tree (live provenance for DESIGN.md/AGENTS.md). |
| r314 | «Visual truth» cycle 1 — established the judge fleet (section-relative alignment, pixel judge worst-region-first, adversarial VLM) and closed the largest visual gaps; first scored baseline 43.9/100. |
| r315 | Judge-cycle round — VLM re-verdicts (27 stale verdicts re-judged), FooterArt extraction, census re-measurement; dispatched cycle 4 (artwork/composition re-work + CI-debt repair for red e2e/design-gates). |
| r318 | «No more excuses» — gate-first defect programme (defect-gate.mjs written and committed FIRST, runs on every push): quick strikes → smoothness → composition → phone/tablet bands → red team; phone perf ratchets set (p95 16.8ms @390 4×CPU). |
| r319 | «The whole product, not just the landing» — every authenticated screen (student/teacher/admin/owner) brought to Heron grade; iOS WebKit harness added to CI; docH ratchet ladder + leak rules pinned. |
| r320 | «Complete, clean, consistent» — every role's screens in the sheet system, missing pages built, admin-role label renamed to «المسجل العام» everywhere a human reads it, one test account per job (@test.ly). rename-keep.json + RENAME-LEDGER.md + LEGAL-TODO.md stay in-tree (live CI-test + ledger contracts). |
| r321 | «Final programme: finish Madarek» — public pages + all roles + all devices; standing gates only extend (rename-ledger-scan promoted into CI design-gates); student sweep closed. |
| r322 | «Design director edition» — method reset after the owner's "not even 10%" verdict: unit of work became the section/component judged by three independent reviewers ≥9/10 on side-by-side shots; Heron structure transplanted rather than approximated. |
| r323 | «Beauty + brand + launch» — wordmark/brand system built (BRAND.md contract — brand/ folder stays in-tree), perf-gate + contrast-gate + clean-gate added; landing/brand evidence shots in the Release. |
| r324 | «Finish the beauty» — continuation waves with a mandatory local Postgres; height-gate added; Heron section extraction ledgers (map-*.json) in the Release. |
| r325 | «The app, the last defects, the feel» — defect mop-up + feel pass; ink-island probe family (routes/ledger-findings.json read by scripts/r325 + r327 — Release copy needed to re-run); before/after legal/help shots in the Release. |
| r326 | «One project: web + app, one main» — mobile folded into the main repo (apps/mobile), one-branch policy, mobile gates (typecheck/expo lint/contract-check/export) + generated-token drift gate (tokens:check) wired in. |
| r327 | «Native beauty · proof · finish» — native-grade polish with proof: scroll screencasts (heron/madarek webm), ink-island reprobe, invite-bulk proof; shots-R1/R2 landing/privacy/help/terms census in the Release. |
| r328 | «Pixel craft» (حرفية البكسل) — S→H sections completed + H7 first cycle; committee scores desktop light+dark 9/9, mobile dark 9/9, mobile light 8 with one delivered fix pending R2 confirmation; full shot ladders (H1–H7) in the Release. |
| r329 | «One cascade, one reference» (طبقة واحدة، مرجع واحد) — main turned green (parity + 6 red e2e specs fixed), CSS budget set 51,329 → ≤33k lines, gate:clean uproot + workflow bypass sweep + r321 gate repair ticketed. |
| r330 | «Madarek signature» (توقيع مدارك) — first visual batch shipped; clean demo data (seed-demo-r330.ts, zero technical strings); CI fully green at e025a2f2; ≤991 pin-ink paint finding promoted to R331 next actions. |

Rounds before r312 that remain in-tree (small, still referenced):
`docs/redesign/r305-heron-reference-spec.md`, `r306-heron-exclusivity-spec.md`
(landing-sheet tests cite them), `r308/`, `r310/`, `r311/` (stack/route
contracts cited by scripts), plus `assets/` and `handoff/` (r305/r306 era
art + handoff docs — pass-2 collapse candidates). r316/r317 kept no
docs/redesign folder (scripts + audits evidence only). `docs/redesign/r331/`
is the live round — untouched by the collapse.
