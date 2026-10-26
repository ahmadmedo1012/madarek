# R320 PAGES-GAP — the missing-pages inventory + build map (§D precondition)

Agent GAP · Task c1-GAP · crawled at head `5ce0bf04` (R320 C1, worktree r320-gap).
DOCS-ONLY deliverable: no code touched. Every claim carries a `file:line` reference.

Sources of truth, read completely:

- `frontend/src/App.tsx` — the route table (**115 `<Route>` rows: 113 single-line
  `path=` rows at lines 305-551 + the two multi-line rows `/campus` (519) and
  `/capabilities` (527)**). Cross-checked against `docs/redesign/r319/ROUTES.md`
  (the R319 inventory) — **zero drift**: all 115 rows, all guards, all redirects
  match the R319 ledger exactly. The R319 inventory remains authoritative for the
  existing 115; this file owns the DELTA (what must be added).
- `frontend/src/lib/nav.ts` — NAV_BY_ROLE + ROLE_HOME (settings seat at line 269)
- `frontend/index.html` — head/meta (canonical :33 + OG/Twitter :27-49 +
  JSON-LD :53-63; **no `<link rel="manifest">`**)
- `frontend/public/` — **contains only** `brand/`, `favicon.svg`, `fonts/`,
  `lectures/`, `media/`, `pdfjs/` — **no robots.txt · no sitemap.xml · no
  manifest.webmanifest · no apple-touch-icon** (public assets only; `brand/`
  holds `madarek-mark.svg` + `madarek-og.jpg`)
- `frontend/src/components/landing/chrome/ConsentBanner.tsx` — the storage-consent
  gate + its REAL key registry
- `frontend/src/pages/LandingPage.tsx` — the footer (lines 1310-1493)
- `backend/src/http/routes/auth.routes.ts` — the full auth surface
- `backend/prisma/schema.prisma`, `backend/src/env.ts`, `backend/src/lib/ai.ts`,
  `backend/scripts/migrate-deploy.mjs` — the legal-facts sources

---

## 0 · Router-crawl verdict on the confirmed-missing list (verify, don't trust)

Every item from the R320 brief, verified against the actual router:

| # | Brief's claim | Verdict | Evidence |
|---|---|---|---|
| 1 | privacy policy | **MISSING** — no route, no link anywhere in the app | App.tsx has no `/legal/*`/`/privacy` row; footer legal row (LandingPage.tsx:1488-1491) carries only `© مدارك` + the demo-data line |
| 2 | terms of use | **MISSING** — no route; RegisterPage has NO consent acknowledgment at all (no checkbox, no «توافق» text, no links — verified: zero matches for الشروط/سياسة/خصوصية/توافق in RegisterPage.tsx + AuthPage.tsx) | RegisterPage.tsx:655 (the submit button — the seat where the consent line belongs) |
| 3 | cookie/local-storage policy | **MISSING** — the consent banner's «اعرف أكثر» links to `/capabilities` (the capability ledger), NOT a policy page | ConsentBanner.tsx:234 `<Link to="/capabilities" className="cb-more">اعرف أكثر</Link>` |
| 4 | accessibility statement | **MISSING** — no route | App.tsx (no row) |
| 5 | contact/early-access channel page | **MISSING** — the footer contact cell is honest text saying the landing's registration form IS the only channel today («التسجيل المبكر من هذه الصفحة هو قناة التواصل المتاحة حاليًا… لا بريد عام») | LandingPage.tsx:1424-1428 |
| 6 | about/«عن مدارك» | **MISSING** as a page — the landing has an in-page `#statement` section + the honest identity paragraph, but no standalone route | LandingPage.tsx:1346-1350 (about paragraph), footer «الرحلة» column → `#statement` (1398) |
| 7 | help/FAQ | **MISSING** — no route; the nearest honest surface is `/capabilities`'s «ما يعمل اليوم» ledger (live vs simulated) | CapabilityPages.tsx:53-61 |
| 8 | security & responsible-disclosure | **MISSING** — no route, no security.txt | App.tsx (no row); public/ (no `.well-known/`) |
| 9 | data & demo-data disclosure | **THIN** — real honest disclosure copy EXISTS (landing about paragraph «مؤسسة اصطناعية بالكامل لأغراض العرض» LandingPage.tsx:1349; footer bottom «بيانات العرض اصطناعية بالكامل» 1490; JSON-LD index.html:53-63) but is scattered — no dedicated page a visitor can cite/link | LandingPage.tsx:1346-1350, 1488-1491; index.html:50-63 |
| 10 | forgot-password/reset flow | **MISSING** — the «نسيت كلمة المرور؟» button opens a one-line notice («يرجى التواصل مع المرشد الأكاديميّ في كليّتك…») and nothing else; the backend has NO forgot/reset endpoint at all (auth routes = register · login · select-institution · change-password · refresh · logout · me) | AuthPage.tsx:410-414 (button), 465-469 (notice); auth.routes.ts:38-184 (all 7 endpoints) |
| 11 | email/phone verification states | **MISSING** — `User.emailVerifiedAt DateTime?` exists in the schema and is returned by `/me`, but NO flow ever sets it outside `prisma/seed.ts`; there is NO phone field on User at all | schema.prisma:337; learning.routes.ts:573,610; seed.ts:285-391 (seed-only writes) |
| 12 | user settings (student/teacher): language · numerals · theme · notification prefs · sessions/devices · change password · data export/delete | **THIN** — change-password EXISTS for students (ProfilePage §[04]) and WORKS for every authed user at the API level, but has NO teacher UI; theme toggle EXISTS (Sidebar + landing mobile); language/numerals/notification-prefs/sessions/devices/data-export-delete have NO page anywhere. Only `/admin/settings` exists — and it is read-only PLATFORM info (identity, DB health, rate limits), not user settings | ProfilePage.tsx:518-519 (`SectionBar index="04" title="تغيير كلمة المرور"`), hooks/useChangePassword.ts:57; Sidebar.tsx:427 (ThemeToggle); AdminExtraPages.tsx:574-686 (AdminSettingsPage — read-only); nav.ts:269 (the only «الإعدادات» nav entry, ADMIN) |
| 13 | 500/maintenance/offline pages | **THIN** — a real route-level `RouteErrorBoundary` exists with offline-aware chunk-failure copy («انقطع الاتصال بالشبكة» / «تعذّر تحميل هذا القسم»), but it is an inline fallback, NOT a routed page; no maintenance mode exists | ErrorBoundary.tsx:149-190 (offline/chunk surface), App.tsx:677-679 (boundary mount) |
| 14 | 403 unauthorized page | **THIN** — component-level states exist (`ErrorState` HTTP-403 branch + `PermissionDenied`), and the wrong-role guard toasts + redirects to the role home; there is NO standalone `/403` route | States.tsx:168-190 (403 branch), 240-280 (PermissionDenied); AppShell.tsx `ProtectedRoute` (guard semantics per ROUTES.md §0) |
| 15 | sitemap/robots/manifest | **MISSING** — `frontend/public/` holds no robots.txt / sitemap.xml / manifest.webmanifest; `index.html` links no manifest | `ls frontend/public/` (6 asset dirs only); index.html:23-69 (the head) |

**What exists that was assumed missing (do NOT rebuild):**

- **404** — `NotFoundPage` is live, designed, and pinned (`/404` + catch-all `*`,
  App.tsx:546,551; the Heron guest-sheet grammar: frame + grain + `ERR [404]` mono).
- **A storage-consent gate** — `ConsentBanner` (landing-only) with a REAL
  accept/reject contract, gated-key purge, and `window.MadarekConsent` API
  (ConsentBanner.tsx:16-24). The gap is the POLICY PAGE it should link to, not the gate.
- **Change-password (backend + student UI)** — `POST /api/v1/auth/change-password`
  (auth.routes.ts:113-131: argon2-verify current, policy-check new, atomic
  tokenVersion bump = all other devices signed out) + ProfilePage §[04].
- **Theme preference sync** — `GET/PUT /api/v1/me/theme`
  (modules/theme/router.ts:9-14) + `useThemeProfileSync` wired in AppShell.tsx
  + the in-app toggle (Sidebar.tsx:427).
- **Honest capability ledger** — `/capabilities` «ما يعمل اليوم»
  (live vs «محاكاة/قيد التطوير» rows, CapabilityPages.tsx:102) — the seed of the
  help/FAQ page's honesty, not a substitute for it.

**What was assumed fine but is thin (or misleading):**

- The forgot-password notice's copy — «يرجى التواصل مع المرشد الأكاديميّ في كليّتك»
  points at a counsellor that does not exist on an independent demo platform
  (the institution is synthetic — LandingPage.tsx:1349). The P0 flow replaces it.
- `/admin/settings`'s nav label is «الإعدادات» (nav.ts:269) — it reads like
  personal settings but delivers platform read-outs; the new `/settings` route
  takes the personal seat and the admin label should say «إعدادات المنصّة».

---

## 1 · The gap table — every missing page → route → build map

Route naming follows the App.tsx conventions: **lowercase English paths** (the
whole 115-row table uses English slugs; Arabic is the CONTENT voice, RTL),
public pages top-level or under one family segment (`/legal/*`), auth flows under
`/auth/*`, error pages as bare codes (`/404`, `/403`, `/500` — mirroring `/404`).

Columns: **page (Arabic title)** · proposed route · mount/access · content source (what REAL code/data it is written FROM) · wiring points · Heron grammar · priority.

### P0 — gates real usage (build first)

| # | Page | Route | Mount/access | Content source (real) | Wiring points | Heron grammar | P |
|---|---|---|---|---|---|---|---|
| P0-1 | سياسة الخصوصية | `/legal/privacy` | PUBLIC — the `/colleges` dual-chrome pattern (CollegesLayout, App.tsx:507-511): guests get the chrome-less sheet with skip-link + back-to-home, authed users keep AppShell | The REAL data model: User fields (email, firstName, lastName, role, avatarColor, avatarInitials, emailVerifiedAt, createdAt, argon2 hash — schema.prisma:328-343); student/teacher profiles; messages + notifications (me.routes.ts); AI conversations (ai.routes.ts:679+ institution-scoped, stored); audit log (lib/governance.ts); localStorage inventory (§2 below); hosts: Render + Neon + AI provider (§KNOWN-true, LEGAL-TODO.md) | Footer legal row (LandingPage.tsx:1488-1491); register consent line (RegisterPage.tsx:655 area); footer «الحساب» column; app `/settings` page | Legal sheet: `MADAREK · LEGAL SHEET · [L-01]` mono header line (the `/capabilities` precedent, CapabilityPages.tsx:53); 7px viewport frame + grain (the NotFoundPage grammar, NotFoundPage.tsx:34-62); `[01] ما الذي نجمعه`-style numbered section bars; hairline cells; RTL; dark pair; 390/768/1440; **print stylesheet** (`@media print` hides shell chrome, keeps the policy text) | P0 |
| P0-2 | شروط الاستخدام | `/legal/terms` | PUBLIC — same `/legal/*` dual-chrome mount | The honesty rules (below §4): experimental university-demo platform, seeded demo data («جامعة مدارك التجريبية», seed.ts), test accounts (`@test.ly`, BOARD §C), no accreditation claims; account rules (password policy 12-72 + blocklist, useChangePassword.ts:49-55); content ownership (own content only — the licensed ink renders pattern, FooterLens.tsx:12-14) | Same legal row + **register consent line**: «بإنشاء الحساب أنت توافق على شروط الاستخدام وسياسة الخصوصية» with both links at RegisterPage.tsx:655 | Same legal-sheet grammar, `[L-02]` | P0 |
| P0-3 | طلب إعادة تعيين كلمة المرور | `/auth/forgot-password` | GUEST-ONLY (the GuestRoute block, App.tsx:304-307 — same guard as `/auth`) | The flow spec below §5; the backend surface to be built (no endpoint exists — auth.routes.ts:38-184); honest dev-inbox mode for `@test.ly` (BOARD §C test-account domain) | Replaces the notice: AuthPage.tsx:411 `onClick={() => setForgotNotice(true)}` → `navigate('/auth/forgot-password')`; the notice block 465-469 retires | The auth sheet grammar (auth.css §3 `[MDRK-AUTH] · SHEET 01/01` mono registration line, sheet-code.ts:8-10); numbered `[01] البريد` cell like AuthPage's `[01]/[02]` cells (AuthPage.tsx:340-416) | P0 |
| P0-4 | إعادة تعيين كلمة المرور | `/auth/reset-password` | GUEST-ONLY (same block; token rides `?token=` or `/auth/reset-password?token=…`) | Flow spec §5: token verify (hashed-at-rest, 30-min expiry), new-password form mirroring the change-password policy FE copy (useChangePassword.ts:49-55), success state | Landed on ONLY from the email link (or the dev-inbox on-screen link); after success → `/auth` with a signed-out toast | Same auth-sheet grammar | P0 |

### P1 — trust & discoverability (Cycle 2 legal block)

| # | Page | Route | Mount/access | Content source (real) | Wiring points | Heron grammar | P |
|---|---|---|---|---|---|---|---|
| P1-1 | ملفات تعريف الارتباط والتخزين المحلي | `/legal/cookies` | PUBLIC — `/legal/*` mount | **The REAL storage inventory (§2 below)** — all 8 localStorage keys + the 1 httpOnly cookie, each with its purpose and consent class (essential / preference / user-data), straight from ConsentBanner.tsx:41-81 + the store files | **ConsentBanner «اعرف أكثر»** (ConsentBanner.tsx:234 — retarget from `/capabilities` to `/legal/cookies`); footer legal row | Legal sheet `[L-03]`; a two-column hairline TABLE: المفتاح (dir=ltr mono) · الغرض · يُحذف عند الرفض؟ — the ledger aesthetic | P1 |
| P1-2 | بيان إمكانية الوصول | `/legal/accessibility` | PUBLIC — `/legal/*` mount | What ACTUALLY ships: skip links (AppShell.tsx:411 + CollegesLayout App.tsx:254), aria grammar everywhere (aria-hidden decorative chrome, role=status alerts), the 44px touch floor, reduced-motion paths (useReveal/motion tokens), the contrast gates (gate:r318/r319 state-contrast rows), IBM Plex Arabic + Geist Mono pairing, RTL-first. Known limits stated honestly (no full screen-reader audit yet → `[يُستكمل قبل الإطلاق]`) | Footer legal row; register/login sheet footnotes optional | Legal sheet `[L-04]` | P1 |
| P1-3 | التواصل والتسجيل المبكر | `/contact` | PUBLIC — dual-chrome mount | The honest channel inventory: early-access = the registration form (RegisterPage) — stated plainly (the footer's own copy, LandingPage.tsx:1426-1427); NO public email exists yet (do not invent one); security contact = the disclosure page's channel | Footer «التواصل» cell (LandingPage.tsx:1424-1428 — becomes a link instead of prose); footer legal row; help page CTA | Public sheet, `[C-03]`-style mono header (the `/capabilities` register: LEDGER SHEET `[C-02]`) | P1 |
| P1-4 | عن مدارك | `/about` | PUBLIC — dual-chrome mount | The landing's own honest identity copy, promoted to a page: the independence paragraph (LandingPage.tsx:1346-1350), the demo-data story (seed.ts: جامعة مدارك التجريبية), what the platform is/built by (NO invented company facts — LEGAL-TODO.md), the JSON-LD identity (index.html:53-63) | Footer «الرحلة» column's `#statement` link (LandingPage.tsx:1398) gains the page; footer legal row | Public sheet; the ink-render + wordmark grammar already on the landing | P1 |
| P1-5 | المساعدة والأسئلة الشائعة | `/help` | PUBLIC — dual-chrome mount | The honest FAQ seed: `/capabilities`' live-vs-simulated ledger (CapabilityPages.tsx:24-27,58-102 — "what works today"), the test-account story (BOARD §C), forgot-password door, theme switch, where data lives, print instructions. Every answer cites a real surface | Footer legal row; the AppShell could gain a help link later (nav decision for the foreman) | Public sheet; Q/A as numbered `[01]…` hairline cells | P1 |
| P1-6 | الأمن والإفصاح المسؤول | `/legal/security` | PUBLIC — `/legal/*` mount | The REAL shipped controls: argon2 password hashing (lib/password.ts), 12-72-char + blocklist policy (auth.dto.ts passwordSchema), access JWT 15m / refresh 7d rotation with tokenVersion revocation (env.ts:191-192; auth.routes.ts:23-35), httpOnly+sameSite=strict refresh cookie scoped to `/api/v1/auth` (auth.routes.ts:29-35), per-IP auth limiter 10/15min + per-user lockout (middleware/rateLimit.ts, lockout.ts), 403-capability model (lib/permissions.ts). Responsible disclosure: the contact channel (P1-3) + `[يُستكمل قبل الإطلاق]` for the owner's disclosure policy. **NO ISO/SOC/GDPR claims — none are certified** | Footer legal row; login page footnote; `/contact` CTA | Legal sheet `[L-05]` | P1 |
| P1-7 | البيانات وبيانات العرض | `/legal/data` | PUBLIC — `/legal/*` mount | The demo-data truth in one citable page: the synthetic university (seed.ts), which entities are seeded (colleges, courses, users — seed.ts:285-391), what user input is real, the honest capability rows (محاكاة vs يعمل الآن), the JSON-LD synthetic-data description (index.html:61) | Footer legal row; `/about` link; the consent banner's context | Legal sheet `[L-06]` | P1 |

### P2 — states, resilience, manifest extras

| # | Page / artifact | Route | Mount/access | Content source (real) | Wiring points | Heron grammar | P |
|---|---|---|---|---|---|---|---|
| P2-1 | إعدادات الحساب | `/settings` | ANY-AUTHED (the no-`allow` ProtectedRoute block, App.tsx:536-544 — same as `/vision`) | Sections: المظهر (the existing /me/theme contract + Sidebar toggle), الإشعارات (prefs — needs backend columns; today NONE exist → honest «قريبًا» rows, the footer-subscribe precedent LandingPage.tsx:1351-1383), الأرقام/اللغة (seat only — Arabic-first single language today, ConsentBanner.tsx:56-57 documents the seat), تغيير كلمة المرور (deep-link or lift ProfilePage §[04] — the API serves ALL roles), الجلسات والأجهزة (needs backend session listing — honest «قريبًا»), تصدير بياناتي/حذف الحساب (request-only form → the contact channel; no export endpoint exists) | nav.ts:119 (student حسابي) + 214 (teacher حسابي) + the ADMIN/QUALITY/OWNER حسابي-equivalent groups — one «الإعدادات» entry per role (nav.ts:269 is the ADMIN platform row, retitled «إعدادات المنصّة»); ProfilePage gains a settings door | The AppShell sheet system: `SHEET S-01 · STUDENT` ambient code (sheet-code.ts:27-33), SectionBar `[01]…` numbered bars, hairline cells — the R319 §B2 kit | P1 need / Cycle-3 build per BOARD |
| P2-2 | حالات التحقق (بريد/هاتف) | states inside `/settings` (a `[03] التحقق` section; NOT its own route yet) | ANY-AUTHED | The schema reality: `emailVerifiedAt` exists (schema.prisma:337) but no verification flow sets it; NO phone field exists. Honest states: «بريدك مؤكَّد ضمن بيانات العرض» for seeded users (seed.ts:285+), «التحقق بالبريد قيد الإطلاق» for new accounts — NO fake "verified" badges | `/settings` section + register success screen note | Same sheet grammar | P2 |
| P2-3 | خطأ 500 | `/500` | PUBLIC | The ErrorBoundary's own copy formalized as a routed page (the boundary stays — the route exists so QA/gate can capture it, like `/404`) | App.tsx:546 area (next to `/404`); ErrorBoundary.tsx:187+ fallback links to it | The NotFoundPage grammar, `ERR [500]` mono | P2 |
| P2-4 | صفحة الصيانة | `/maintenance` | PUBLIC | Honest maintenance copy; driven by a real maintenance signal (none exists — needs an env/flag; page ships disabled-by-default) | Only reachable when the flag is on; the gate captures it | The NotFoundPage grammar, `MM [nn]`-style mono | P2 |
| P2-5 | الصفحة غير مصرّح بها | `/403` | PUBLIC (but typically reached authed) | The States.tsx 403/PermissionDenied copy promoted to a sheet + the way-back links (role home / home) | AppShell guard's deny path may link it (keep the toast+redirect as the primary behavior); ErrorState links | The NotFoundPage grammar, `ERR [403]` | P2 |
| P2-6 | robots.txt | `public/robots.txt` (file, not a route) | PUBLIC static | The real public route set: allow `/`, `/auth*`, `/colleges*`, `/campus`, `/capabilities`, the new `/legal/*`, `/about`, `/help`, `/contact`; disallow the five authed trees (`/student`, `/teacher`, `/admin`, `/quality`, `/owner` — App.tsx:625-628 prefixes are the exact list) | frontend/public/ (new file); crawl honesty: no private data is linked | n/a (text file) | P2 |
| P2-7 | sitemap.xml | `public/sitemap.xml` (file) | PUBLIC static | The PUBLIC routes only (7 existing public paths + the 9 new public pages, with the canonical base `https://madarek.onrender.com/` — index.html:33) | frontend/public/ | n/a | P2 |
| P2-8 | manifest + أيقونات | `public/manifest.webmanifest` + `<link rel="manifest">` | PUBLIC static | Real identity: name مدارك, `dir: "rtl"`, `lang: "ar"`, theme colors #282828/#F6F6EE (index.html:23-24), icons derived from `brand/madarek-mark.svg` (needs 192/512 raster exports) | index.html head (~line 17, beside the icon link) | Icons follow the mark as-is (no new art) | P2 |

**Counts: 15 new routes proposed** (4 × P0 · 7 × P1 · 4 × P2 routes) **+ 3 public/
static files** (robots · sitemap · manifest) **+ 1 settings section** (verification
states folded into `/settings`). With the 115 existing rows → **130 route rows**
after the full §D build.

---

## 2 · The REAL localStorage/cookie inventory (the cookie policy's content source)

Enumerated from the code (not invented). These are the ONLY web-storage keys the
app writes today:

| # | Key (dir=ltr) | Writer | What it holds | Consent class | Removed on consent «أرفض»? |
|---|---|---|---|---|---|
| 1 | `madarek.consent` | ConsentBanner.tsx:41,145 | the decision string (`accepted`/`rejected`) | essential (the record of consent itself) | no — it IS the decision |
| 2 | `madarek.consent.record` | ConsentBanner.tsx:42,146-149 | JSON `{decision, ts}` audit twin | essential | no |
| 3 | `madarek-theme` | theme.store.ts:54 (zustand persist) | theme choice + timestamp | essential (pre-consent user choice, R314 spec — ConsentBanner.tsx:52-53) | no |
| 4 | `mdrk-theme-profile` | useThemeProfileSync.ts:46,50 | `{pref, ts}` pre-paint theme cache (read by the index.html bootstrap, index.html:70+) | essential (derived from #3) | no |
| 5 | `mdrk-auth` | auth.store.ts:235 (persist via `safeSessionStorage` → **localStorage** with memory fallback, auth.store.ts:134-152) | user + short-TTL access token + memberships/institution context (v1 shape) | essential (session) | no |
| 6 | `mdrk-ui` | ui.store.ts:51,53-58 (partialized: `sidebarCollapsed`, `recentPaletteIds`) | sidebar fold + palette recents (max 4) | preference | **YES** (GATED_KEYS, ConsentBanner.tsx:78-81) |
| 7 | `mdrk-doc-side-w` | DocumentViewerPage.tsx (SIDE_W_KEY, read 98 / write 113) | document-viewer side-panel width | preference | **YES** (gated) |
| 8 | `mdrk-academic-links` | ProfilePage.tsx:93,114 | the student's own saved links (USER DATA) | user data | **no — deliberately survives** (ConsentBanner.tsx:73-76: a reject must never destroy the user's own content) |
| — | `mdrk-auth::probe` | auth.store.ts:137-138 | storage-availability probe, written and removed in the same tick | transient | self-cleaning |

**Cookies (exactly one):**

| Cookie | Writer | Attributes | Purpose |
|---|---|---|---|
| `mdrk_refresh` | auth.routes.ts:20,28-35 | `httpOnly` · `secure` (env) · `sameSite=strict` · `path=/api/v1/auth` · `maxAge` = refresh TTL (7d default, env.ts:191-192) | the refresh JWT — rotates on every refresh/change-password; killing it (tokenVersion bump) signs the device out |

**No other cookies are set by the app. No analytics/tracking scripts exist**
(index.html loads no third-party scripts — only self-hosted fonts, index.html:65-69).

---

## 3 · Routes that exist but are thin (same columns)

| # | Existing route | What exists | What's missing / thin | Proposal | P |
|---|---|---|---|---|---|
| T-1 | `/student/profile` (S26) | profile fields, saved links (localStorage), **change-password §[04]** (ProfilePage.tsx:518-670), theme sync ambient | No language/numerals seats, no notification prefs, no sessions/devices view, no data export/delete door | becomes ONE tab/door of `/settings` (or keeps change-password + gains a settings link); export/delete = request form → contact channel | P2-1 |
| T-2 | `/teacher/profile` (T18) | profile fields only — **no change-password UI** (verified: zero matches in TeacherProfilePage.tsx) despite the API serving all authed roles (auth.routes.ts:113) | the whole account-settings surface | `/settings` (shared) fixes teachers by construction | P2-1 |
| T-3 | `/admin/settings` (A12, nav.ts:269 «الإعدادات») | honest read-only platform info: identity, DB health, auth TTLs, rate limits (AdminExtraPages.tsx:574-686) | it is NOT user settings; the nav label over-promises | keep as-is (ADMIN platform sheet), retitle nav label → «إعدادات المنصّة» (RENAME ledger follow-up) | P2 |
| T-4 | error surfaces (boundary + `/404`) | RouteErrorBoundary fallback with offline-aware copy (ErrorBoundary.tsx:149-190); designed 404 (NotFoundPage.tsx) | no routed `/500`, `/403`, maintenance; offline copy lives only inside a crashed boundary | P2-3/4/5 above | P2 |
| T-5 | `/capabilities` | the honest live-vs-simulated ledger | it is doing double duty as the consent banner's «اعرف أكثر» target — a capability matrix is not a storage policy | retarget the banner to `/legal/cookies`; `/help` cites the ledger | P1-1 |
| T-6 | the forgot-password notice (AuthPage.tsx:465-469) | an honest one-liner | points to a counsellor that does not exist on an independent demo platform (the university is synthetic, LandingPage.tsx:1349); no flow behind it | replaced by P0-3/P0-4 | P0 |

---

## 4 · Wiring map — exactly WHERE each new page plugs in

| Wiring point | File:line today | Change |
|---|---|---|
| **Footer legal row** | LandingPage.tsx:1488-1491 (`fo-footer-bottom`: `© {year} مدارك` + the cluster line only — board §A5 «no legal/policy links at all») | add the legal row links: سياسة الخصوصية · شروط الاستخدام · التخزين المحلي · إمكانية الوصول · الأمن · عن مدارك · المساعدة — hairline-separated mono-indexed links (the fo-footer grammar) |
| Footer «الحساب» column | LandingPage.tsx:1404-1408 | gains a «سياسة الخصوصية» link under register/login (or stays 2 rows + the legal row carries it — designer's call) |
| Footer «التواصل» cell | LandingPage.tsx:1424-1428 | prose → a link to `/contact` (the honest-channel text moves onto the page) |
| **Register consent line** | RegisterPage.tsx:655 (the `auth-submit` button — currently NO consent text anywhere on the page) | under the submit: «بإنشاء الحساب أنت توافق على شروط الاستخدام وسياسة الخصوصية» — both linked (P0-1, P0-2) |
| **Login forgot link** | AuthPage.tsx:411 (`onClick={() => setForgotNotice(true)}`) → replace; notice block 465-469 → delete | `<Link to="/auth/forgot-password">` (guest context — same surface) |
| **Consent banner «اعرف أكثر»** | ConsentBanner.tsx:234 (`to="/capabilities"`) | retarget → `/legal/cookies` (the honest one-liner stays) |
| **New route rows** | App.tsx:546-551 (`/404` + catch-all) | `/legal/*` family under a `LegalLayout` (the CollegesLayout pattern, App.tsx:238-268/507-511 — skip link + back-to-home for guests, AppShell for authed); `/about` `/help` `/contact` same mount; `/auth/forgot-password` + `/auth/reset-password` INSIDE the GuestRoute block (App.tsx:304-307); `/settings` in the no-allow ProtectedRoute block (App.tsx:536-544); `/403` `/500` beside `/404` |
| **Nav entries** | nav.ts:119 (student حسابي), 214 (teacher حسابي) + the ADMIN/QUALITY/OWNER account groups | one «الإعدادات» entry → `/settings` per role; nav.ts:269 retitled «إعدادات المنصّة» |
| **Manifest link** | index.html:22 (beside `<link rel="icon">`) | `<link rel="manifest" href="/manifest.webmanifest">` |
| **Robots/sitemap** | frontend/public/ (6 asset dirs, no such files) | new static files |
| **GuestLenis surface list** | App.tsx:634-649 (`isGuestWindowSurface`) | the new public pages (`/legal`, `/about`, `/help`, `/contact`) ride the guest engine by default — decide deliberately (documents want plain scrolling; recommend EXCLUDING `/legal/*` from Lenis for print/reading calm — a one-line list edit) |
| **SHELL_SURFACE_PREFIXES** | App.tsx:625-628 | no change (new pages are public; `/settings` is authed shell by prefix — it needs NO entry since it does not start with a listed prefix... verify: `/settings` is not in the list → guests can't reach it anyway (guard); add nothing) |

---

## 5 · Forgot-password flow spec (P0 — the full shape)

**Endpoints (new, backend/src/http/routes/auth.routes.ts):**

1. `POST /api/v1/auth/forgot-password` — body `{ email }`.
   - Always answers the SAME generic 200 Arabic copy («إذا كان البريد مسجلًا فستصلك رسالة خلال دقائق») — **no user enumeration** (existing-or-not indistinguishable, including timing: run the hash path for both).
   - Rate-limited per-IP + per-email (the authRateLimiter register/login class, middleware/rateLimit.ts).
   - If the user exists: mint a single-use token — 32+ bytes random, **store ONLY its hash** (sha-256; do NOT reuse argon2 — 30-min tokens need a fast hash, unlike passwords), `expiresAt = now + 30min`, `usedAt = null`, linked to userId; invalidate any prior outstanding token for that user (one live token per user).
   - **Delivery — no mail provider exists today** (verified: zero nodemailer/smtp/resend/sendgrid/mailgun refs in backend/src + backend/package.json). Two modes:
     - **dev-inbox mode** (default, and the only mode until the owner configures mail): if the target email ends `@test.ly` (the BOARD §C test-account domain) — and ONLY then — the API response includes the reset link (labelled `"mode": "test"`), and the UI shows it on-screen inside a clearly-marked test-mode panel («وضع الاختبار — لا يُرسل بريد فعلي» — the same honesty register as the footer's «قريبًا» subscribe note, LandingPage.tsx:1380-1382). For every other domain: log the event (the existing logger) + answer generic-200 — and the PAGE copy states plainly that email delivery is not configured yet (`[يُستكمل قبل الإطلاق]` → LEGAL-TODO.md) with the contact-channel fallback.
     - **real mail** (when configured): an env-gated transport (`SMTP_*` or provider key — see LEGAL-TODO.md item 7). No code path may silently pretend to send.
2. `POST /api/v1/auth/reset-password` — body `{ token, newPassword }`.
   - Constant-time compare on the hashed token; reject expired (>30min) / used (non-null `usedAt`) / unknown tokens with the SAME error (no token-oracle).
   - `newPassword` reuses the register/change password schema (auth.dto.ts passwordSchema: 12-72, blocklist — the FE mirror copy at useChangePassword.ts:49-55).
   - On success: set the new argon2 hash + **bump tokenVersion in the same atomic write** (the change-password precedent, auth.routes.ts:94-112 — every device, including the requester's, signs out), mark token `usedAt`, answer 200.
   - Rate-limited; failures keyed per-IP.

**Frontend pages:**

- `/auth/forgot-password` (guest): `[01] البريد الإلكتروني` cell → submit → the generic confirmation state + the test-mode panel (only when the API answered `mode:"test"`). Back-to-login link.
- `/auth/reset-password?token=…` (guest): `[01] كلمة المرور الجديدة` + `[02] التأكيد` cells (the AuthPage cell grammar, AuthPage.tsx:340-416) → submit → success state («تمّ تغيير كلمة المرور…») → CTA to `/auth`. Invalid/expired/used token state: ONE identical honest message («الرابط غير صالح أو انتهت صلاحيته») with a re-request door — the three causes are indistinguishable by design (no token-oracle).

**Schema:** a `PasswordResetToken` table (id, userId FK, tokenHash unique, expiresAt, usedAt, createdAt). `[يُستكمل قبل الإطلاق]` items: none for the mechanism — the mail provider + the from-address are the LEGAL-TODO items (7, 8).

**What the owner must configure for real email** (→ LEGAL-TODO.md): a mail provider account (any of SMTP/Resend/SendGrid/etc. — today NOTHING exists in the repo), the sending address + display name, SPF/DKIM on the sending domain, and the choice to keep or retire the @test.ly dev-inbox in production.

---

## 6 · Honesty rules recap (binding for every page above)

From the R320 brief — restated as the checklist each §D page is reviewed against:

1. **The platform says what it is**: an experimental university-demo platform
   («جامعة مدارك التجريبية» — a fully synthetic institution, seed.ts +
   LandingPage.tsx:1349) running seeded demo data. No accreditation, no
   university affiliation claims.
2. **Policies are REAL and SHORT, in good Arabic** — written FROM the code's
   actual behavior (§2's key table, §5's flow, the KNOWN-true provider list in
   LEGAL-TODO.md), never from a template of a company we are not.
3. **Required policy headings** (privacy + data pages): ما الذي نجمعه · لماذا ·
   أين يُخزَّن · مدة الاحتفاظ · حقوقك · الأطراف الثالثة (AI/الاستضافة: only
   what actually exists — Render, Neon, the configured AI provider or the local
   composer) · ملفات تعريف الارتباط/التخزين المحلي (the REAL keys, §2) ·
   التواصل · آخر تحديث.
4. **NO invented legal facts**: no GDPR/ISO/SOC2 certifications claimed, no
   registration numbers, no fake addresses/phones/emails. The footer address is
   the synthetic university + country only (LandingPage.tsx:1414-1418) — keep it
   that way.
5. **Every unknown legal fact is marked `[يُستكمل قبل الإطلاق]`** and mirrored as
   a row in LEGAL-TODO.md with its owner-truth source — the build never blocks
   on them and never guesses them.
6. **Arabic display strings carry no tashkeel** (project canon); Latin runs
   (keys, routes, codes) sit in `dir="ltr"` spans (the `<bdi dir=ltr>` mono
   contract from the R319 kit).

---

## 7 · Heron grammar requirements (every §D page)

- **The 7px frame**: fixed 1px hairline at the 7px viewport inset + mono corner
  marks (`.sheet-frame` grammar — NotFoundPage.tsx:36-50, r313).
- **Grain**: the shared paper-grain film (`--mdrk-grain-image-*` custom
  properties, r319-shell.css:52-74 — do not inline new copies; G2's note).
- **Ruler ticks + `[nn]` mono index bars**: numbered section bars for policy
  headings (the SectionBar kit, components/student — zero new components); mono
  indexes are Geist Mono, LTR, `aria-hidden` with the count-Arabic AT carrier.
- **Hairline cells**: every policy block is a 1px-rule cell (radius 0 — the
  R313 ladder; no shadows).
- **SHEET code**: legal family `MADAREK · LEGAL SHEET · [L-nn]` mono header line
  (the `/capabilities` `[C-02]` precedent); auth-flow pages ride the auth sheet
  (`[MDRK-AUTH] · SHEET 01/01`); `/settings` rides the ambient role code
  (`S-01 · STUDENT` etc., sheet-code.ts:27-33) for free.
- **Footer**: the legal pages close with the same honest colophon cluster
  («منصّة مستقلّة · عربية أولًا · بيانات العرض اصطناعية بالكامل») + آخر تحديث date.
- **RTL first**: `dir="rtl"`, Arabic-first copy; every Latin/mono run wrapped
  `dir="ltr"` (storage keys, routes, codes).
- **Dark pair**: every page verified in both themes (the theme-color pair
  #282828/#F6F6EE, index.html:23-24).
- **390 / 768 / 1440**: captured at all three viewports (the ROUTES.md §2
  coverage grid gains rows for the new pages).
- **Print stylesheet** for legal pages: `@media print` — hide the frame chrome,
  nav, grain; keep the numbered headings + hairline rules in pure black on white;
  page margins + the «آخر تحديث» line visible. Policies must be printable as
  honest one-sheet documents.
