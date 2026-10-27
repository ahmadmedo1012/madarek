# R321 §A10 — Production proof — https://madarek.onrender.com

**Run:** 2026-10-27T22:38:22.461Z · **buildId proven:** `ff7aeed688ae` · **engine:** chromium 148.0.7778.96 (playwright-core) · **harness:** `scripts/r321/prod-proof.ts`

**Overall: PASS** — 0 FAIL row(s).

## 1 · Health

| endpoint | status | latency | db | env | buildId | result |
|---|---|---|---|---|---|---|
| /api/v1/health | 200 | 674 ms | 57 | production | `ff7aeed688ae` | PASS |
| /health | 200 | 203 ms | — | — | `—` | PASS |

## 2 · Accounts (all 10, API + UI @390)

Demo panel: PASS — openByDefault=true rows=10 · close→chip→reopen cycle: works (reopen→rows=10) · demo-panel-390.jpg

> NOTE (recorded, not fixed here): since r321 §A8 the demo panel is open BY DEFAULT on every build that does not set `VITE_SHOW_TEST_ACCOUNTS=0` — production included: every visitor sees the 10 demo credentials expanded.

| job | email | role | API | token | api ms | route | h1 | shot | result |
|---|---|---|---|---|---|---|---|---|---|
| طالب | student@test.ly | STUDENT | 200 | ✓ | 888 | /student/dashboard | لوحة التحكم | student.jpg | PASS |
| طالب ثانٍ (للرسائل/المجتمع) | student2@test.ly | STUDENT | 200 | ✓ | 886 | /student/dashboard | لوحة التحكم | student2.jpg | PASS |
| أستاذ | teacher@test.ly | TEACHER | 200 | ✓ | 1094 | /teacher/dashboard | لوحة الأستاذ | teacher.jpg | PASS |
| رئيس قسم | head@test.ly | TEACHER · DEPARTMENT_HEAD | 200 | ✓ | 862 | /teacher/dashboard | لوحة الأستاذ | head.jpg | PASS |
| عميد | dean@test.ly | TEACHER · DEAN | 200 | ✓ | 646 | /teacher/dashboard | لوحة الأستاذ | dean.jpg | PASS |
| نائب عميد | vicedean@test.ly | TEACHER · ASSOCIATE_DEAN | 200 | ✓ | 638 | /teacher/dashboard | لوحة الأستاذ | vicedean.jpg | PASS |
| المسجل العام | registrar@test.ly | ADMIN | 200 | ✓ | 801 | /admin/dashboard | لوحة المسجل العام | registrar.jpg | PASS |
| مسجل كلية (نطاق كلية) | faculty@test.ly | ADMIN | 200 | ✓ | 566 | /admin/dashboard | لوحة المسجل العام | faculty.jpg | PASS |
| أخصائي جودة | quality@test.ly | QUALITY | 200 | ✓ | 1059 | /quality/dashboard | لوحة الجودة | quality.jpg | PASS |
| مالك المنصة | owner@test.ly | OWNER | 200 | ✓ | 957 | /owner/dashboard | لوحة التحكم الرئيسية | owner.jpg | PASS |

**10/10 accounts fully proven** (API 200 + token + role home + h1). Logins spaced ≥500 ms; the auth limiter counts failures only.

## 3 · Public pages (the R321 gate list, @390)

| route | http | h1 | ms | console | page | failed | result |
|---|---|---|---|---|---|---|---|
| / | 200 | رحلة تعلم واحدةمن المحاضرة إلى الإتقان | 3501 | 0 | 0 | 0 | PASS |
| /legal/privacy | 200 | سياسة الخصوصية | 3206 | 0 | 0 | 0 | PASS |
| /legal/terms | 200 | شروط الاستخدام | 2698 | 0 | 0 | 0 | PASS |
| /legal/cookies | 200 | ملفات تعريف الارتباط والتخزين المحلي | 2693 | 0 | 0 | 0 | PASS |
| /legal/accessibility | 200 | بيان إمكانية الوصول | 2482 | 0 | 0 | 0 | PASS |
| /legal/security | 200 | الأمن والإفصاح المسؤول | 2735 | 0 | 0 | 0 | PASS |
| /legal/data | 200 | البيانات وبيانات العرض | 2761 | 0 | 0 | 0 | PASS |
| /about | 200 | عن مدارك | 2879 | 0 | 0 | 0 | PASS |
| /help | 200 | المساعدة والأسئلة الشائعة | 3584 | 0 | 0 | 0 | PASS |
| /contact | 200 | التواصل والتسجيل المبكر | 2686 | 0 | 0 | 0 | PASS |
| /auth | 200 | مرحبا بعودتك | 3662 | 0 | 0 | 0 | PASS |
| /auth/forgot-password | 200 | استعادة كلمة المرور | 2818 | 0 | 0 | 0 | PASS |
| /colleges | 200 | البنية الأكاديمية التجريبية — جامعة مدار | 3312 | 0 | 0 | 0 | PASS |
| /campus | 200 | من داخل الجامعات الليبية | 3120 | 0 | 0 | 0 | PASS |
| /capabilities | 200 | قدرات موثَّقة، لا ادّعاءات | 2716 | 0 | 0 | 0 | PASS |
| /404 | 200 | هذه الصفحة تغيّبت عن الحضور | 2934 | 0 | 0 | 0 | PASS |
| /403 | 200 | هذه الصفحة خارج نطاق صلاحياتك | 2946 | 0 | 0 | 0 | PASS |
| /500 | 200 | خللٌ من جانبنا — لا من جانبك | 2899 | 0 | 0 | 0 | PASS |
| /maintenance | 200 | مدارك في صيانة قصيرة | 2902 | 0 | 0 | 0 | PASS |

**19/19 public pages clean** (200 + h1 + zero console errors + zero failed requests).

## 4 · Static files

| file | http | bytes | checks | result |
|---|---|---|---|---|
| /robots.txt | 200 | 919 | ✓ http 200 (200 (207ms)) · ✓ contains "Sitemap" (found) | PASS |
| /sitemap.xml | 200 | 1469 | ✓ http 200 (200 (200ms)) · ✓ parses as XML (valid) · ✓ ≥1 <url> (16 <url>) | PASS |
| /manifest.webmanifest | 200 | 988 | ✓ http 200 (200 (181ms)) · ✓ parses as JSON (name="مدارك — منصّة التعليم الذكي" short_name="مدارك") | PASS |

## 5 · Landing docH + scroll-perf (intro skipped, no RM override)

| viewport | docH | vs Heron | frames | >33 ms | % >33 | p95 ms | max ms | shot | result |
|---|---|---|---|---|---|---|---|---|---|
| 390x844 | 11357 | -0.7% | 145 | 0 | 0% | 16.7 | 16.8 | landing-390.jpg | PASS |
| 1440x900 | 12530 | 1.4% | 112 | 36 | 32.1% | 33.4 | 66.6 | landing-1440.jpg | PASS |

Protocol: 8 wheel scrolls of 600 px at ~120 ms spacing from the top of `/`, frame deltas sampled via a rAF loop (`scripts/r320/docH-ratchet-probe.mjs` intro-skip key; NO reducedMotion override — the honest R319 protocol). Numbers are raw and honest — they feed the cycle report (§A1 desktop perf ticket owns the target).

## Discovered tickets

None — zero FAIL rows this run.

## Observations (data-driven, recorded — not fixed here)

- **Demo panel open-by-default on PRODUCTION** (r321 §A8 semantic): every visitor sees the 10 demo credentials expanded. §A8 asked for "open by default in development" — the owner should decide whether production should ship collapsed-with-chip (build with `VITE_SHOW_TEST_ACCOUNTS=0`) — RECORDED, not fixed here.
- **§A1 (desktop perf) confirmed OPEN on production**: 32.1% frames >33 ms (p95 33.4 ms · max 66.6 ms over 112 frames) vs the ≤2 % target — the cycle-1 A1 work continues; these rows are the honest production baseline.
- **§A2 (docH ratchet) holds on production** for this deploy: both viewports inside ±1.5% of Heron (390x844: 11357 (-0.7%) · 1440x900: 12530 (1.4%)).

## Honest notes

- **WebKit leg = CI**: this harness runs chromium only — WebKit does not launch in this container (missing system libs, no sudo). The iOS/WebKit leg runs in CI (`e2e-ios` job, pinned ubuntu-24.04).
- The entrance/intro loader is skipped via the standard e2e fixture key (`sessionStorage madarek-intro-skip=1`) on every page so h1 assertions measure the page, not the loader gate.
- UI logins: fresh context per account (390×844, locale ar, light, deviceScaleFactor 2); the registrar goes through the demo panel one-tap flow (تعبئة → دخول); the onboarding tour is best-effort dismissed before each home screenshot (recorded per row).
- Screenshots: JPEG, quality auto-stepped to keep each ≤150 KB; evidence dir total 852 KB (budget 2 MB). No raw PNG dumps.
- docH drift vs the BOARD's Heron column is informational here (the §A2 ratchet gates the local build; production serves its own deploy).
