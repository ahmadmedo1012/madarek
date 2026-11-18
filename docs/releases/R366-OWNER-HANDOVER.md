# R366 — OWNER HANDOVER (what you own after the merge)

Read with `R366-FINAL-UNIFICATION-REPORT.md` (the evidence ledger). This file is
only what needs a human decision or a scheduled follow-up.

## 1 · Do these three things first

1. **Re-dispatch the soak workflow on the new main.** The multi-membership picker
   fix (read login response → detect multiple memberships → `POST
   /auth/select-institution`) is merged; the soak run 44141889441 failed with
   `search answered=false` because main did not have it. Actions → soak → Run
   workflow. Expected: `search answered=true`.
2. **Re-run the mobile evidence pipeline on the new main SHA** (build-android +
   ui-screens). The after-set sheets in `docs/redesign/r366/agent5-mobile/sheets/`
   were recompressed for the size gate (17.6MB → 2.7MB, q72, 800px) — they remain
   readable evidence, but the pipeline's fresh captures will be the canonical
   proof for the merged SHA.
3. **Verify the deployment** (Vercel promotes automatically on main): the five
   security headers, `/` 200, and the splash/landing. A read-only checklist is
   in §7 of the unification report; the R365 closeout's §1 method still applies.

## 2 · The ratchets that moved (all monotonic — they only got better)

| Ratchet | Before | After | Note |
|---|---|---|---|
| knip.unusedFiles | 64 | **62** | 4 orphan landing components deleted |
| jscpd.duplicateBlocks | 191 | **181** | real dedup (hero-plate 4×→1, shared seats in Calendar/GlobalSearch/tokens) |
| knip.unusedExports | 45 | 43 | pinned by the prior session, verified in-tree |
| copy budgets | — | unchanged | web 11887 under 10770 enforced sum; mobile exactly at 10419 |
| CSS !important | 41 | 41 | unchanged |

## 3 · Decisions only you can make

- **Per-section conformance targets (60%/section, 65% overall)** — the gated
  floor is 91.6% on the section set and total coverage is 52.7%. If you want the
  lane's aspirational targets enforced, they need a funded ratchet plan (raising
  the floor is a product decision, not a merge blocker).
- **The `wip/r358-ui` branch** — kept per the standing policy (rejected work,
  never deleted without an explicit owner order). Delete it when you are sure.
- **iOS on real WebKit** — needs a macOS runner (self-hosted or a paid macOS
  larger runner) to stop being `skipped`. The job is wired and waiting.

## 4 · The evidence map

- Verification matrix + repair ledger: `docs/releases/R366-FINAL-UNIFICATION-REPORT.md`
- Lane programs: `docs/redesign/r366/agent{1..5}-*/` (CHECKLIST/RESUME/DELIVERY)
- Mobile after-set sheets: `docs/redesign/r366/agent5-mobile/sheets/{before,after}/`
- Copy budgets: `docs/QA/copy-budget.json` + `copy-budget-mobile.json`
- Deadcode baselines: `scripts/deadcode/baseline.json`
- Conformance: `scripts/conformance/ratchet.json` + `results.json`

## 5 · Security note

Five credentials were pasted in plaintext during the handover (GitHub PAT, Vercel
token, Neon key + connection string, Resend key). They were used only for this
session's pushes/API calls and were never written to any file, commit, or report.
**Rotate all five now** — the chat transport is not a credential store.
