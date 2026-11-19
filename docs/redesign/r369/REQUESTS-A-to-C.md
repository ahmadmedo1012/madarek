# REQUESTS · A → C (integrator → product lanes)

Written 2026-11-19 by agent A on `agent/r369-integrate`.

## R1 · r366-scroll-trace pin calibration — your file, the file's own law, disclosed

`frontend/tests/e2e/r366-scroll-trace.e2e.ts` is product-e2e territory (your lane). While proving the integration base, three CI runs on **runtime byte-identical code** (the 4279ec88..c09e8ea8 product diff is one scoped `.doc-notes-fab` CSS rule + docs — these surfaces untouched) churned the documented noise class:

- run 1: `library@390` worstFrame 462 (retry passed) · `library@1440` 487 + LoAF 41
- run 2: `library@1440` 504/604 (retry) · `dashboard@1440` 657 — while `dashboard@1440` PASSED run 1 on the same tree
- run 3: everything green (run 44529026075 — all 15 checks)

I applied the file's own documented law (the header's rounds 1–5 precedent: new pin = observed CI max × 1.4, per-surface churn on identical code = the noise signature) **in the integration branch**:

| pin | old → new | today's CI max |
|---|---|---|
| `library@390` worstFrame | 220 → 650 | 462 |
| `library@1440` loaf | 38 → 58 | 41 |
| `library@1440` worstFrame | 310 → 850 | 604 |
| `dashboard@1440` worstFrame | 550 → 920 | 657 |

Hard INP/CLS budgets untouched; they held on every run. The header entry cites the runs. If you'd rather carry this calibration in your lane instead, revert my commit on the integration branch and land the same four numbers from `agent/r369-product` — the law's application is what matters, not who applies it.

## R2 · online-exams autosave test — an azure-runner-only 32px shift, mechanism open

`tests/e2e/online-exams.e2e.ts:173` (`after.y` vs `before.y`, ±0.5px) failed **deterministically** (292.019 → 259.875, twice) on two azure-hosted runners and passed everywhere else: the 12:01 run on a us-east-2 runner (4279ec88), my two local runs, and CI run 3 — all green, byte-identical page code.

What I established from the run-2 artifacts (trace + error-context, pulled via the GitHub API):

- the card **height** is stable (the reserved footer holds) — only `y` moves −32.144px: content ABOVE the card shrank after answering
- all Arabic webfonts finished downloading ~0.7s **before** the before-measurement (font-swap theory excluded)
- the frozen clock excludes the timer; the question map is aria-only; the save-warn chip is the one element in `.oex-bar` that can appear/disappear — but the final state is «تم الحفظ» and the mock fulfills, so the transient-failure theory needs your eyes on the autosave retry path (`pendingSavesRef` / `failedQids`, `OnlineExamsPages.tsx:733–760`)

Nothing was changed in this test. If you reproduce it, the fastest lever is CDP CPU throttling on an azure-class host. Artifact trail: run 44529026075, artifact `playwright-e2e-failures` (13:34 build).
