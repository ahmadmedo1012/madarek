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

## LANE N — Push (executed mid-Lane-1: the owner delivered the Firebase files)

The owner supplied both Firebase files mid-session (chat upload). Executed per his
instruction: googleServicesFile in app.config.ts, FCM v1 to EAS via EXPO_TOKEN,
rebuild, real-notification emulator proof, evidence.

### N.1 EAS FCM v1 upload (done, verified from the credentials panel itself)

`eas credentials -p android` (production profile) driven through a scripted pty —
the CLI has no non-interactive FCM v1 path; byte-by-byte and chunked arrow-key
probing established the exact menu route first. The session transcript shows:

```
✔ Uploaded Google Service Account Key.
✔ Google Service Account Key assigned to ly.madarek.mobile for FCM V1
Push Notifications (FCM V1): Google Service Account Key For FCM V1
  Project ID      madarek-20141
  Client Email    firebase-adminsdk-fbsvc@madarek-20141.iam.gserviceaccount.com
  Client ID       107845582703217383885
  Private Key ID  84f9157f5d1eac4b87465f9f49d6f0996584e318
  Updated         0 second ago
```

### N.2 The never-in-repo law (the owner-promise in PUSH-FIREBASE-CHECKLIST)

- `GOOGLE_SERVICES_JSON` repo secret created (GitHub API, libsodium-sealed, HTTP 201)
  from the owner's google-services.json (project `madarek-20141`, package
  `ly.madarek.mobile` — validated).
- `apps/mobile/.gitignore`: google-services.json + service-account patterns ignored.
- `app.config.ts`: `android.googleServicesFile` is CONDITIONAL on the file's
  presence — a bare clone prebuilds fine (verified: config resolves both ways);
  CI worktrees get the file from the secret before any config resolution.

### N.3 The fingerprint law (measured, not assumed)

`npx @expo/fingerprint`: WITH google-services.json
`01825f31be5638b172151452aa5d651143b0bfff`, WITHOUT
`998095c1c40b41bb65287fd1547e0ac6f51e606b` — different. Therefore EVERY job that
resolves the config/prebuild/fingerprint now writes the file from the secret
first: build-android (build + smoke jobs), build-ios-sidestore (build job —
fingerprint parity), mobile.yml eas-ota (`eas update --auto` must target the
new fingerprint or the new binaries get no OTA).

Local prebuild proof (the native wiring, empirically):
`android/app/google-services.json` copied (673 B) +
`apply plugin: 'com.google.gms.google-services'` (app/build.gradle:184) +
`classpath 'com.google.gms:google-services:4.4.4'` (root build.gradle:9).

### N.4 The proof workflow (`.github/workflows/push-firebase-proof.yml`)

google_apis API-34 emulator (the smoke's AOSP `default` image has no Play
services — FCM cannot arrive there). One release-parity x86_64 APK (minified,
production URL, Firebase from the secret; the prebuild step ASSERTS the native
wiring). Then `scripts/ci/push-proof-run.sh`:

1. `pm grant POST_NOTIFICATIONS` (deterministic; the in-app ask is unit-tested)
2. Maestro `push-proof.yaml`: login student@test.ly on PRODUCTION → tab-alerts
3. Server-side registration proof: GET /me/push-devices shows the ANDROID row
4. REAL server event: registrar@test.ly (ADMIN, ANNOUNCE_PLATFORM) →
   POST /api/v1/announcements (PLATFORM) → production fanOutPush → Expo → FCM v1
5. Arrival: dumpsys notification + logcat poll (≤120s) + screenshots
6. In-app inbox row: Maestro `push-inbox.yaml` + screenshot
7. Implicit Expo receipt `ok`: the device row SURVIVES the send (a
   DeviceNotRegistered receipt prunes it — push.ts's receipt pass)

Hard assertions in the workflow (registration ≥1 ANDROID row + row survives +
announcement created + dumpsys carries the posted notification), evidence bundle
artifact (retention 30d). Mobile tests green after the additive testID anchor:
1,250/1,250; tsc clean. (Run URL recorded below once executed.)

### N.5 Evidence — the proof run (GREEN, run 43774275945)

`Push proof (Firebase, real send)` #2 on `c1273d80` — all steps green, ALL assertions
passed. Artifact: `push-proof-evidence-2` (763 KB — dumpsys, logcat, screenshots,
device rows, the announcement). The log's evidence chain, verbatim:

```
google-services.json OK (project madarek-20141)          ← the secret file, validated in CI
native Firebase wiring verified (google-services.json + gradle plugin)
[3/8] Maestro: login to production + open the alerts inbox
student login: ok
{"data":[{"id":"cmwih4nzn0001366m7q9t1lg1","platform":"ANDROID","appVersion":"1.0.0",
 "lastSeenAt":"2026-11-15T23:36:47.219Z","createdAt":"2026-11-15T23:36:47.219Z"}]}
                                                          ← the emulator REGISTERED on production
[5/8] the REAL server event: the registrar posts a PLATFORM announcement
registrar login: ok
{"data":{"id":"cmwih5fnr0006366ms85dbhp0","scope":"PLATFORM",
 "title":"إشعار تجريبي — وصلت الإشعارات الفورية (23:37:22)",
 "body":"اختبار وصول الإشعار الحقيقي من الخادم إلى هذا الجهاز — R356 Lane N", ...}}
attempt 1: the notification is POSTED (dumpsys)           ← ARRIVED=1 on the FIRST poll (~4s)
ANDROID devices registered on production: 1
ANDROID devices after the send: 1                        ← the row SURVIVED = receipt ok
dumpsys: a Madarek notification is POSTED on the emulator
ALL PUSH EVIDENCE ASSERTIONS PASSED
```

Pipeline proven: app (Firebase init via secret google-services.json) → Expo token
mint on a google_apis emulator → registration on production → registrar's real
PLATFORM announcement → production `fanOutPush` → Expo push service → FCM v1 (the
EAS-uploaded service account) → **the emulator's system posted the notification**.
The FCM-tag logcat grep found 0 lines (the pattern doesn't match the google_apis
image's delivery tags) — noted honestly; the OS-posted notification (dumpsys) is
the ground-truth arrival evidence, and the workflow's assertions never gated on
logcat lines. Run: https://github.com/ahmadmedo1012/madarek/actions/runs/43774275945

### N.6 Lane N verdict: CLOSED

The checklist item in §I (owner-only) is done: push delivered to an emulator from
the production server, with the full evidence bundle. docs/PUSH-FIREBASE-CHECKLIST.md
flipped to ✅; docs/HOSTING.md tells the real state; the safe-rollback (delete the
secret → pre-Firebase builds) is documented.

## LANE 2 — copy QUALITY review (in progress)

### 2a/2b — DONE (the editor read the diet, end to end)

`docs/QA/copy-review/pack.md` (63 files, 2,011 − / 1,499 + Arabic source lines from
`git diff e83a3da6~1..HEAD`) + `docs/QA/copy-review/REPORT.md` (the verdict). Result:
the diet was disciplined — grammar clean (it even fixed a pre-existing typo),
terminology consistent, errors still actionable, empty states 1-line+1-button, no
English leftovers, no truncated sentences. ONE real finding, fixed: the privacy
page still named **Render** as the web host (stale before the diet; production is
Vercel) — fixed to Vercel with the real-facts test pin following the same truth
(90/90 legal tests green). Legal substance table (purpose/data/retention/rights/
contact/jurisdiction + the 9-key ledger) verified intact against the pre-diet text.

### 2c — param-route fixtures + ledger re-run (in progress)
