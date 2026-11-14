# RELEASE — how Madarek ships (web + app, one repo, one branch)

> R326 M0.6. One branch (`main`), one project. Every change lands on main
> in small verified commits; automation decides what deploys where.
>
> R351 X4 — the hosting cutover: **web + API run on Vercel**
> (https://madarek-nine.vercel.app — static SPA on the CDN + the Express
> app as one Fluid function in iad1, co-located with the Neon primary in
> us-east-1; deploys from `.github/workflows/deploy-vercel.yml` after CI
> green; `/config/app.json` carries the ordered `apiOrigins` the apps
> read at launch). **Render is the 14-day suspended standby** — resume
> from the dashboard if the rollback is ever needed (the reverse flip is
> the `apiOrigins` order + `serverlessFunctionRegion` + the workflows'
> URLs). The Render-era `keep-warm.yml` is **deleted** (R352 L3) — see §Liveness & tick below.

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

## الاستضافة والحدود — Vercel Hobby (R351 X5)

الخطة الحالية **Hobby** (مجانية) — حدودها: مليون استدعاء دوالّ شهريًا ·
4 ساعات Active-CPU · 100 غيغابايت نقل سريع · **100 نشر/يوم** (المقاس
الذي يراقبه `vercel-usage-watch.yml` أسبوعيًا — الإثنين 06:00 UTC —
ويفتح issue عند تجاوز 60% من حدّ النشر اليومي أو عند تقادم buildId
الإنتاج). جدول الأسبوع يُخزَّن في `frontend/public/ops/vercel-usage.json`
وتقرؤه بطاقة «الاستضافة والاستخدام» في صفحة إعدادات المسجل. ما لا
يكشفه الـ API بهذا الرمز+الخطة (استدعاءات الدوالّ الفعلية، Active-CPU،
النقل، Blob) يُقرأ من لوحة Vercel أسبوعيًا؛ الوثيقة نفسها تحمل القيد
مكتوبًا — لا تُختلق أرقام.

**تحذير غير التجاري (قرارٌ مطلوب من المالك قبل أي نشر تجاري):** خطة
Hobby للاستخدام الشخصي غير التجاري — ملائمة لمرحلة التطوير والعرض على
الجامعات، ويلزم إعادة القرار قبل أي تشغيل تجاري فعلي. مساران جاهزان:
الترقية إلى **Vercel Pro** (~20$/مقعد شهريًا — ترفع الحدود وتقرّب
الدعم)، أو العودة إلى **Render Starter** (الخدمة المعلّقة تستيقظ
بالخطة المدفوعة بلا sleeps وتُدار من `render.yaml` كما هي؛ التراجع =
عكس `apiOrigins` كما في §القطع أعلاه).

## Liveness & tick (Vercel era — R352 L3)

**`keep-warm.yml` is deleted.** It existed to defeat Render free-tier
sleep (15 idle minutes); on Vercel there is **no always-on instance to
keep warm** — every request lands on the CDN or spins a Function on
demand, so a keep-warm ping buys nothing and would only burn quota.

What keeps the platform's background work (mail outbox, reminders,
imports) flowing now — four triggers, none a single point of failure:

| Trigger | Cadence | Where |
|---|---|---|
| Request-piggyback tick | on real traffic (opportunistic) | `api/index.mjs` |
| GitHub Actions `tick.yml` | `*/5` best-effort (cron is starved on quiet repos — measured; it is a net, never the spine) | `.github/workflows/tick.yml`, guarded by `CRON_SECRET`, targets `TICK_TARGET_URL` |
| Vercel secure cron | daily (Hobby limit) | `vercel.json` |
| Post-enqueue drain | immediately after mail is queued | backend `mail-outbox` |

The **tick watch** (R352 K4): `tick-watch.yml` checks the API's own
tick ledger hourly and opens/updates a GitHub issue when no tick has
landed for > 90 minutes (GitHub cron starvation makes 30 min
untenable — the honest threshold; see the workflow header).

A nightly **freshness assertion** (R352 R3) also rides the mobile
ledger: `build-info.json.commit` must equal main HEAD.

### Render standby note (rollback window only)

The suspended Render service (the 14-day standby from the X4 cutover)
sleeps by design on the free plan. If the rollback is ever exercised,
do **not** resurrect a keep-warm ping: either accept the honest
«الخادم يستيقظ…» cold-boot UX for the standby hours, or upgrade that
service to **Starter** (≈$7/mo, `render.yaml` snippet retained in git
history at the R351 tag). The old window math (750 instance-hours /
month cliff, 450–465 h/month windowed) is preserved in
`docs/redesign/r351/RESUME.md` for that contingency.

External pinger guidance (UptimeRobot/cron-job.org → `/api/v1/health`)
now lives in **docs/HOSTING.md** §Uptime probe — on Vercel it is pure
monitoring, no warm-up semantics.

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
