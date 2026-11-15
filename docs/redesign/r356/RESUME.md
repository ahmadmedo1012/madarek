# R356 — RESUME (the master record)

Agent: continuation of the R355 program (R356 master brief). Session start: main = `f35adc30`.
Owner-facing summary: the Arabic final report (§J of the brief) — this file is the evidence.

Rules restated: evidence over claims (command + real output / run URL); unverified = UNVERIFIED;
small Conventional Commits; `bash scripts/verify.sh --fast` before every push; ONE push at a
time, wait for CI + Deploy; never weaken tests/ratchets; Groq/Gemini/Expo live checks ride
GitHub workflows (sandbox edge-blocks Groq); the display eats `[m` sequences — verify bytes
with `od -c`/base64 before "fixing" anything that looks corrupted (re-confirmed this session:
`branches: [main]` in deploy-vercel.yml displays as `ain]`, bytes verified `5b 6d 61 69 6e 5d`).

## LANE 1 — make HEAD green and stay green

### 1.1 The red HEAD: root cause (PROVEN, not theorized)

CI run `43759156058` on `f35adc30` (docs-only commit) — `Test (frontend)` failed:

```
FAIL tests/unit/useScrollRestoration.test.tsx > useScrollRestoration — POP restores
     through the late content height (r305-A4) > re-applies the stored offset once the
     destination height arrives
AssertionError: expected 'go-detailbacklate list tall' to contain 'late list short'
Expected: "late list short"
Received: "go-detailbacklate list tall"
Test Files  1 failed | 245 passed (246) — Tests  1 failed | 3071 passed (3072)
```

Mechanism: the harness's `LateHeightPage` flipped short→tall on a wall-clock
`setTimeout(20ms)`; the assertion right after POP observes the SHORT state through a
one-rAF flush (~16ms nominal) — a ~4ms margin that loses under worker load (jsdom's rAF
resolves after the flip fires).

**Flake proof (local, this session):** with 2 CPU hogs saturating the box, the UNMODIFIED
test file failed 3/10 runs with the byte-identical assertion:

```
=== run 4 (rc=1): AssertionError: expected 'go-detailbacklate list tall' to contain 'late list short'
=== run 6 (rc=1): (same)
=== run 7 (rc=1): (same)
RESULT: pass=7 fail=3
```

The same stress loop AFTER the fix: `RESULT: pass=12 fail=0` (12/12 green).

**The fix (test harness only; every assertion unchanged):** the payload landing is now
TEST-CONTROLLED — `land()` flips the page tall exactly when the test says the payload
arrived; no clock. The two r305-A4 tests keep the identical expected states (POP lands
SHORT + scrollTop 0 → restore completes to 800 once the height arrives; user scroll at
120 stands the watcher down). Full-suite runs ×5 (evidence in §1.2).

### 1.2 Full-suite stability (local, ≥5× per the brief)

(being recorded below as runs complete — /tmp/fullsuite-run-{1..5}.log)

### 1.3 The flake detector (nightly, CI)

`.github/workflows/flake-detector.yml` — nightly 03:17 UTC + manual dispatch: frontend
unit suite ×3 on main; pass/fail DIVERGENCE = flake → rolling `flake-detector` issue +
red run; all-3-green auto-closes episodes; all-3-fail = red-main (also loud). Same
rolling-issue law as release-freshness/tick-watch. First dispatch evidence: (pending)

### 1.4 Production / deploy truth at session start

- `GET /api/v1/health` → `{"ok":true,"dbLatencyMs":801,"env":"production","buildId":"f35adc309de3"}`
- `GET /api/v1/status` → `buildId: f35adc309de3`, storage vercel-blob, aiMode chain,
  mail resend — **buildId == main HEAD** (the Vercel git integration deployed the
  docs-only commit; Deploy Vercel workflow #49 (f3adf91c) green — the 7c19b386 deploy
  failure was already recovered; f35adc30 didn't match its path filter).
- `release-freshness` #1 (99dfe800) and `tick`/`tick-watch` runs: green at hand-over.

### 1.5 Final-SHA all-green evidence

(pending — the fix push's CI / Deploy Vercel / Android / Size gate / deadcode + watches)

## LANE 2..9 — (not started)
