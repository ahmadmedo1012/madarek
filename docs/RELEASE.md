# RELEASE — how Madarek ships (web + app, one repo, one branch)

> R326 M0.6. One branch (`main`), one project. Every change lands on main
> in small verified commits; automation decides what deploys where.

## What triggers what

| You push to `main`… | Render (web) | GitHub Actions | EAS |
|---|---|---|---|
| `backend/**` | ✅ deploys | CI + **deploy-smoke** (waits for buildId == SHA, then health + 3 logins + dashboard + live-vs-committed OpenAPI additive check; failure opens an issue) | — |
| `frontend/**`, `shared/**` (web side) | ✅ deploys | CI | — (unless `apps/mobile/**`/`shared/**` also changed → see below) |
| `apps/mobile/**` or `shared/**` | ❌ never (render.yaml `buildFilter`) | **Mobile** workflow: gates (typecheck · expo lint · contract-check · `expo export` android+ios · bundle ≤ 8 MB) | **EAS Update** (`--auto`) to `production` **and** `preview` branches — reaches every installed build whose runtime fingerprint matches |
| …and the change **affects the installed app** (anything under `apps/mobile/**` — app/screens/src/assets/config — plus `shared/**`, `scripts/tokens/**`, `scripts/brand/**`, `docs/api/openapi.json`) | ❌ | same gates **+ `Android — release APK/AAB`** (build → independent verify → publish the rolling `android-latest` release: APK · AAB · build-info.json · SHA256SUMS.txt · verify.json) — the official public download | EAS Build stays manual-only (explicit preview/store cuts) |
| `docs/**`, `audits/**`, `*.md` | ❌ | CI only | — |

Channels: `development` (dev-client) · `preview` (internal APK/simulator) ·
`production` (store). `runtimeVersion` policy = **fingerprint** — any
native dependency/plugin/config change silently produces a new fingerprint:
OTA updates then wait for the matching build (the workflow queues it
automatically).

## Keep-warm (free tier)

Render's free plan sleeps the web service after ~15 idle minutes;
`.github/workflows/keep-warm.yml` pings `GET /api/v1/health` (which also
round-trips a `SELECT 1` on Neon — `dbLatencyMs` in the body) and `/`
every **5** minutes, retry-aware: a 502/503 «Application loading» during
a cold boot counts as *waking*, and the run only goes green once both
endpoints answer. Upgrading the Render service to **Starter** removes
the sleep behaviour entirely — then delete the workflow.

### The honest limits, and the two reliable fixes (R350 H3)

GitHub's cron is **best-effort and starved on quiet repos** — measured
~4 fired runs/day at `*/10` (the scheduler deprioritises repos without
recent activity; the delay is unbounded). A 5-minute cron therefore
does **not** guarantee a 5-minute ping. The workflow stays as the
zero-cost net; the reliable fixes:

**1) An external pinger (free, 5 minutes, owner-side — recommended):**

عندك طريقتان مجانيتان، اختر واحدة:
١. من https://uptimerobot.com أنشئ حسابًا مجانيًا.
٢. أضف «Monitor» جديدًا من نوع HTTP(s) والعنوان: https://madarek.onrender.com/api/v1/health
٣. اجعل فترة الفحص كل 5 دقائق (الحساب المجاني يسمح بها).
٤. فعِّل تنبيه البريد حين يتوقف الخادم عن الاستجابة.
٥. اتركه يعمل — هذا يمنع الخادم من النوم أصلًا ويخبرك عند أي توقف حقيقي.

(البديل: https://cron-job.org بنفس العنوان كل 5 دقائق.)

**2) Render Starter (the only guaranteed fix — owner decision, ≈$7/mo):**

Render → Dashboard → madarek → Settings → Instance Type → **Starter**.
The equivalent `render.yaml` change, ready to apply when you decide:

```yaml
services:
  - type: web
    name: madarek
    plan: starter   # free → starter: no sleep, no cold boots, 2× RAM
```

Until either is in place, first visitors after ~15 idle minutes pay the
cold boot; the web app shows «الخادم يستيقظ…» honestly while it wakes.

## Mail (Resend) — activation is owner-side

See **docs/MAIL-SETUP-AR.md** (Arabic): domain verification + the 3
Render env fields + the live-send proof. The backend provider layer
is already merged; `MAIL_PROVIDER` stays `none` until the domain is
verified (the honest-off default).

## The one-time setup that is already done

- `EXPO_TOKEN` is set as the GitHub Actions secret `EXPO_TOKEN`
  (repo → Settings → Secrets and variables → Actions). Rotation: create a
  new token at expo.dev/accounts/rh2011/settings/access-tokens, then
  update the secret.
- `app.config.ts` carries `updates.url` (u.expo.dev/afc4265f-…) +
  `runtimeVersion: { policy: "fingerprint" }` + `checkAutomatically: ON_LOAD`.
- Render `buildFilter` excludes mobile/docs commits.

## R327 D2/D3 — the store-prep state of the world

**The fingerprint moved twice in R327** (C4 removed react-native-reanimated
+ worklets from the tree; C5 flipped `experiments.reactCompiler` on).
Every build before those commits is on a stale runtime fingerprint and can
never receive the current OTA updates — which is fine, none shipped. The
Mobile workflow queues fresh preview builds automatically on every
native-affecting push (see the table above), so the pipeline re-arms
itself the moment its gates are green.

**Pipeline health note (D2/Z14, honest history):** the Mobile workflow was
red from B1 through C5 (~12 runs) — `build-app-icons.mjs` resolved `sharp`
from an ambient `node_modules` that only existed in the dev sandbox, so
CI's icons gate died on every run, and because `eas-ota`/`eas-build`
declare `needs: mobile-gates`, **no OTA update and no build has actually
published since B1**. Fixed in `f242bb78` (sharp now resolves from
`apps/mobile`, and the committed favicon — which the ambient sharp had
generated — was regenerated byte-honest with the pinned toolchain).

### Android keystore (owner key, documented)

- EAS **auto-generates and stores** an upload keystore on the account's
  first `production` Android build if none exists
  (expo.dev → project afc4265f… → Credentials → Android).
- **Back it up once** after that first build: Credentials → the keystore →
  download the `.jks` + note its passwords somewhere safe (password
  manager). A lost keystore means a new app identity on Play (a new
  listing) — Google does not reset upload keys for new accounts easily.
- To use an **own** keystore instead: `eas credentials -p android` →
  "Set up a new keystore" → upload the `.jks`. Either way, `eas submit`
  uses whatever is stored in EAS credentials.
- Play upload key rotation (if ever needed): Play Console → Setup →
  App signing — Google's own key handles store signing; the EAS keystore
  is only the upload key.

### iOS — everything that is already done (no Apple account needed)

- Bundle ID `ly.madarek.mobile`, display name «مدارك», RTL +
  Arabic localization keys, `ITSAppUsesNonExemptEncryption: false`
  (the standard education-app exemption declaration).
- The Face ID usage prompt is **Arabic** (D3): the app-lock's permission
  string rides the `expo-local-authentication` plugin config.
- Android side: `USE_BIOMETRIC` rides the same plugin; the notification
  icon + orange status-bar tint ride `expo-notifications`' plugin config.
- Icons/splash: all 8 assets byte-verified against the one mark in CI
  (`tokens:check` → `icons:check 8/8`).
- Build numbers: `autoIncrement` on both profiles (EAS tracks them).

### iOS — the owner's Apple checklist (when the account exists)

> Until then the internal iOS route is GitHub Actions → `sidestore-latest`
> (unsigned SideStore IPA, re-signed on-device) — the public «قريبًا» on
> the /app page stays until this path is taken.

1. Enroll in Apple Developer (the $99/yr membership).
2. EAS credentials, either path:
   - `npx eas credentials -p ios` and sign in with Apple, or
   - expo.dev → project → Credentials → App Store Connect API key
     (`ASC_KEY_ID` / `ASC_ISSUER_ID` / `ASC_KEY_CONTENT` as EAS secrets).
3. First iOS device build: `npx eas build --profile production --platform
   ios` (EAS generates the distribution certificate + provisioning
   profile, or uses "Let EAS manage" for everything).
4. TestFlight: `npx eas submit --platform ios --profile production`
   (needs the ASC API key from step 2).
5. App Store privacy questionnaire (owner answers in App Store Connect —
   the app posts crash telemetry to its own backend and uses Face ID /
   notifications; no third-party analytics).

## Owner-only steps (things automation cannot do)

1. **Rotate the GitHub PAT + Expo token if they were ever exposed** (both
   were pasted in chat during R326 setup):
   - PAT: github.com → Settings → Developer settings → Fine-grained tokens.
   - Expo: expo.dev/accounts/rh2011/settings/access-tokens → then update
     the `EXPO_TOKEN` Actions secret.
2. **Apple side (iOS)**: no Apple Developer account is linked yet. To ship
   TestFlight/App Store the owner must provide an **Apple team id** + an
   **App Store Connect API key** (`eas credentials` → sign in with Apple;
   or set `ASC_KEY_ID`/`ASC_ISSUER_ID`/`ASC_KEY_CONTENT` as EAS secrets —
   expo.dev → project → Credentials). Until then iOS ships simulator
   builds (preview profile) only. `eas device:create` registers ad-hoc
   devices if internal distribution is preferred.
3. **Store submission (Android)**: `npx eas submit --platform android
   --profile production` needs the Play service-account JSON uploaded to
   EAS credentials (one-time, expo.dev → Credentials → Google Play).
4. **Device-matrix pass after the reactCompiler flip (C5)**: install the
   fresh preview APK (the workflow's run summary links it) on real
   Android hardware and walk the five roles. Anything fatal → flip
   `experiments.reactCompiler` back to `false` in `apps/mobile/app.config.ts`
   and push — that is the entire rollback.

## Manual commands (the owner's release console)

```bash
# see what's live
npx eas-cli update:list --branch production
npx eas-cli channel:view production

# roll BACK a bad OTA (users get the previous update on next launch)
npx eas-cli update:republish --branch production <update-id-of-the-good-one>
# or hard-rollback (marks everything after a point as rolled back):
npx eas-cli update:rollback --branch production

# force a store build now (native change or a release)
npx eas-cli build --profile production --platform android --non-interactive
npx eas-cli build --profile preview   --platform all --non-interactive --no-wait

# bump the minimum app version (blocks outdated installs with a blocking
# «يلزم تحديث التطبيق» screen):
#   Render dashboard → madarek → Environment → MIN_APP_VERSION=1.1.0 (+ optional
#   APP_DOWNLOAD_URL). The app reads /api/v1/status minAppVersion on cold start.
```

## Backup & restore — the drill record

The DB backup path is a first-class release surface: `npm run db:backup` →
`db:restore` → `db:verify` (scripts/db-*.mjs, the runbook canon in
docs/12-deployment §2–3). Every drill gets a fill-in entry in
**docs/runbooks/restore-exercise-log.md** — six entries to date: two local
(r167/r169), one from real production (r183, Neon source), a re-run on r187,
an r189 secrets-rotation round, and **r327 P4e** (2026-10-31, the latest
full pass: backup 294 KB / 241 ms → restore into a scratch DB / 379 ms →
`db:verify` PASS (90 tables, 30 migrations, 42 users) → per-table row
counts identical one-to-one (1059 rows, empty diff) → live second backend
on the restored DB (health + login + dashboard 200) → scratch DB dropped.
Raw evidence: `audits/evidence/r327/p4/backup/`).

The one remaining owner act, unchanged since r183: **move dump files
off-site** (backups/ is gitignored — a dump on the same box as the DB is
not a backup). Live-DB restore is refused by default
(`--confirm-live-restore` is the conscious emergency override).

## The min-version gate

`GET /api/v1/status` → `{ minAppVersion, updateUrl }`. The native app
compares semver on cold start + foreground: below `minAppVersion` → the
blocking update screen with the `/app` download link. Unset → no gate.

## Distribution page

`/app` on the website: the primary CTA downloads the official APK directly
from the rolling GitHub Release `android-latest` (built + independently
re-verified + published by `build-android.yml`), with live build metadata
read from the release `build-info.json` (never blocking the download), QR,
iOS «قريبًا» status, and the live min-version readout. Link lives in the
landing footer + help.

## In-app update UX

Cold start + foreground: `expo-updates` checks silently (ON_LOAD) →
downloads → toast «تحديث جاهز — أعد التشغيل» → reload. The feedback
payload and `/client-errors` telemetry carry the running `updateId`, so
the owner inbox shows exactly which OTA a crash came from.
