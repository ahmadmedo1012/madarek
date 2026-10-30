# 4-A13 — Entry & Edge Surfaces Audit (Auth · Register · Onboarding · 404 · DocumentViewer · HydrationSplash)

Campaign 4 «سيادة المظهر» · Wave 19 · audit-only (no source edits, no git, no user creation).
**Scope:** `pages/{AuthPage,RegisterPage,NotFoundPage,DocumentViewerPage}.tsx`, `components/onboarding/{OnboardingFlow,MilestoneScene}.tsx`, `components/HydrationSplash.tsx`, `styles/auth.css`.
**Method:** 19 own screenshots (`/tmp/madarek-shots/a13-*`, 14:47–14:56) + 9 Playwright probes (empty-submit/validation, password toggle, demo hover, CDP-throttled loading state with a **correct-credentials** login — 1 real form submission used of the 3 allowed; a 429 state was captured by **intercepting** the login response so the rate limiter was never touched; RTL field-order geometry; focus-trap/ESC/arrows on onboarding; /me-intercepted auto-start proof on deep routes; touch-target sweep; dark-contrast math; hydration first-paint with a forced 1.2s storage delay). 7 VLM critique batches (21 images); **every VLM claim re-measured — 13 of 18 claims disproven** (documented inline). Probes kept at `/home/z/a13-probes/`.
**Note:** ~35 stale `a13-*` shots (14:14–14:37) from an earlier dead 4-A13 attempt exist in /tmp/madarek-shots; this audit cites only shots and probes produced by the current run (14:47+). The earlier run's wrong-password test is what exhausted the shared IP rate-limit bucket that blocked live research-API probes at 14:5x (429s in console).

---

## Scores

| Surface | Score /10 | One-line verdict |
|---|---|---|
| /auth login · desktop | **7.5** | Excellent form plumbing (RHF focus-first-error, aria wiring, deep-link resume, honest loading) — dinged by lockout-oblivious error copy and silent loading state. |
| /auth login · mobile 390 | **7.5** | All targets ≥44px, zero overflow, card fits 844px; dev demo panel pushes card 65px past the fold. |
| /auth login · dark | **8** | Token-clean; measured 5.32–8.85:1 on every muted text; copper-on-ink submit. |
| /auth/register · step 1 (roles) | **7** | Clean role cards + appointment note; step-indicator done/current states read inverted; top bar swaps contents between steps. |
| /auth/register · step 2 (forms) | **3** | **P0: the faculties lookup 401s for every anonymous visitor → the select never renders → registration can never succeed.** |
| 404 (/404 + wildcard) | **8** | The best surface in scope — witty copy, bespoke illustration, two real recovery CTAs, sr-only 404, dark verified; tab title never says "not found". |
| OnboardingFlow (frames/keyboard/a11y) | **8** | Focus trap, Esc+focus-restore, RTL arrows, CTA refocus, dot progression all verified live; skip target under touch floor, frames silent for SR (A9 P3-2). |
| Onboarding auto-start policy | **5** | Fires on EVERY authed route (proved over /student/library and /student/research) — blocks deep-linked tasks and contaminated 5 sibling audits; comment says "dashboard", code says everywhere. |
| DocumentViewerPage | **6** | Working lazy chunk + skeleton + annotations side panel; `?back=` flows unvalidated into an off-app href; no-filename state is a bare dead-end header. |
| HydrationSplash / first paint | **7** | Does its job by never painting (verified unreachable with sync storage); pre-CSS paint is browser-default (white flash for forced-dark users in dev). |

**Audit Health (impeccable rubric):** A11y **3** · Performance **3** · Theming **4** · Responsive **3** · Implementation Integrity **2** (public-catalog comment vs auth-gated route; dashboard comment vs everywhere effect) → **15/20 (Good — address weak dimensions: integrity + a11y noise).**

**Counts: P0 ×1 · P1 ×1 · P2 ×5 · P3 ×14.**

---

## P0 — Blocks a core workflow

### P0-1 · Self-serve registration is impossible: faculties lookup 401s for anonymous visitors
- **Where:** `backend/src/http/routes/catalog.routes.ts:518` (`GET /faculties`) behind `router.use(authMiddleware)` at `:12`; consumed by `frontend/src/hooks/useResources.ts:495` on `RegisterPage` (anonymous surface).
- **Evidence:** live probe (stageC2): `FACULTIES_RESP 401 http://localhost:5173/api/v1/faculties` on `/auth/register`; `facultySelectExists: false`, department select `disabled: true`, error banner «تعذّر تحميل الكلّيّات — تحقّق من اتصالك بالشبكة». With **every other field valid**, submit still fails `["اختر الكلّيّة","اختر القسم"]` → no anonymous visitor can ever create an account. `curl /api/v1/faculties` (anon) → `401 UNAUTHENTICATED`. The route's own section comment says **"FACULTIES & DEPARTMENTS (public catalog)"** — the intent was public; the router-level middleware (added for the rest of the catalog) swallowed it. Secondary copy defect: the error blames the **network** («تحقّق من اتصالك بالشبكة») and offers a retry that can never succeed — a permanent lie to a would-be student.
- **VLM:** corroborated the dead-end verdict ("Faculties error state blocks progress… The user is stuck") while mis-reading the retry link as absent — the link exists (`RegisterPage.tsx:306`) and loops forever.
- **Fix sketch:** register `/faculties` on a public router (or move its declaration above the `authMiddleware` line), projecting only `{id, name, departments: {id, name}[]}`. Then the existing skeleton/error/retry states (which are genuinely well-built) become live paths. ~6 lines.

---

## P1 — Major defects

### P1-1 · Onboarding auto-starts over EVERY authed route, not just the dashboard (the cross-cutting finding)
- **Where:** `frontend/src/components/layout/AppShell.tsx:218-224` — the auto-start effect runs on shell mount with no route condition; `hooks/useOnboardingState.ts` docblock promises "mount on **first dashboard** render".
- **Evidence:** student session + `/me` intercepted to `onboardingCompletedAt: null` (POST complete route-blocked, DB untouched): navigating **directly** to `/student/library` → overlay + `أهلاً بك في مدارك` + body scroll-locked (`mdrk-scroll-locked`); same on `/student/research` (both logged `AUTOSTART_DEEP_ROUTE`/`AUTOSTART_SECOND_ROUTE` true). Sibling corroboration: 4-A6 ("covered every page until server-side completion", first shoot round discarded), 4-A7 (all 20 shots re-taken), 4-A11 (blocked complete-POSTs for the same reason).
- **Evaluation — everywhere vs dashboard-only:** the *benefit* of everywhere (a user who lands mid-app still sees the tour once) is real but marginal — the tour's own copy is dashboard-centric ("لوحة يومك"), and the sidebar replay («عرض الجولة», `Sidebar.tsx:189-194`) already provides a durable re-entry. The *cost* is concrete: a deep-linked task (shared lecture URL, emailed exam link) is greeted by a focus-trapped modal + scroll lock before the user can do the one thing they came for; once-per-account softens but doesn't justify it. **Recommendation: auto-start only when `location.pathname === ROLE_HOME[role]`; elsewhere render nothing (the sidebar item remains the invitation).** Also fix the stale comment. ~4 lines + comment.
- **Not P0** because it's once per account, Esc/skip-dismissible, and the store's once-guard prevents reopen loops.

---

## P2 — Noticeable problems, workaround exists

### P2-1 · Rate-limited logins show "check your email and password" advice
- **Where:** `frontend/src/pages/AuthPage.tsx:198-206` — one generic banner for every `login.isError`.
- **Evidence:** intercepted `POST /auth/login` → 429 `RATE_LIMITED`; UI shows «تعذَّر تسجيل الدخول. تحقَّق من البريد وكلمة المرور وتأكَّد من اتصالك بالشبكة، ثم أعد المحاولة.» — actively misleading during the 10/15min lockout (the shared bucket is easy to trip; this audit's IP was 429ing research endpoints). Screenshot `a13-auth-429-state.png`.
- **Fix sketch:** branch on `login.error.status === 429` → «محاولات كثيفة — انتظر بضع دقائق ثم أعد المحاولة» (no retry button, or disabled-with-countdown).

### P2-2 · Focus falls to `<body>` when the register step panel remounts
- **Where:** `frontend/src/pages/RegisterPage.tsx:145` (`key={role ?? 'role'}` remounts the panel; the clicked role-card button unmounts with it).
- **Evidence:** probe: click role card → `activeElement === BODY`. Keyboard/SR users lose their place at the exact moment the screen changes; nothing announces «تسجيل طالب جديد».
- **Fix sketch:** focus the new step's `h1` (`tabIndex={-1}` + effect on `role`), or an `aria-live="polite"` step announcement. Mirrors what OnboardingFlow already does for its CTA.

### P2-3 · Register form data is destroyed by changing/leaving the role step
- **Where:** `frontend/src/pages/RegisterPage.tsx:86-89` (`backToRoles`) + keyed remount at `:145` — forms live inside the remounted subtree.
- **Evidence:** probe `DATA_LOSS_AFTER_BACK: {email:"(EMPTY)", firstName:"(EMPTY)"}` after filling 5 valid fields → back → forward. A student who picked the wrong role (or tapped the top-bar «تسجيل الدخول» and came back) retypes everything.
- **Fix sketch:** lift form values into page-level state (or keep both step panels mounted, hidden with `inert`/`hidden` — the slide animation is keyed anyway).

### P2-4 · Validation failure fires 7–8 assertive `role="alert"` live regions at once
- **Where:** `frontend/src/pages/RegisterPage.tsx:485` (every `Field` error is `role="alert"` = assertive) + the faculties `auth-error` banner(s) `:303,404`.
- **Evidence:** probe `VALIDATION: errs[7], alerts: 8` on empty submit. Screen-reader users get an unintelligible burst; sighted users get a wall of red (VLM: "excessive validation noise… overwhelming" — the one corroborated claim in that batch).
- **Fix sketch:** per-field errors become plain text wired via `aria-describedby` (already done — `Field` wires it, `RegisterPage.tsx:475-479`), and ONE polite summary region announces «٧ حقول تحتاج مراجعة»; keep `role="alert"` for submit-level banners only.

### P2-5 · `?back=` in the document viewer flows unvalidated into an off-app link href
- **Where:** `frontend/src/pages/DocumentViewerPage.tsx:31` (`search.get('back')`) → `Link to={back}` at `:56-63`.
- **Evidence:** `/document/test.pdf?back=https://evil.example.com` → `.document-viewer-back` renders `href="https://evil.example.com"` (probe `DOCVIEWER_BACK_HREF`). Middle-click/open-in-new-tab leaves the app; the crafted link is shareable. The codebase already solved this pattern — `AuthPage.tsx:61-64 readFromPath` rejects anything not an in-app path.
- **Fix sketch:** reuse the same guard (`startsWith('/') && !startsWith('//')`) before defaulting to `/student/library?tab=research`.

---

## P3 — Polish

1. **P3-1 · No per-route `document.title` outside the shell** — `/auth`, `/auth/register`, `/404`, `/document/*` keep the landing title forever (probe: title identical on all four; only `AppShell.tsx:239` writes titles). Tabs/history give no signal. Fix: tiny `useDocumentTitle(hook)` in the four pages.
2. **P3-2 · Empty email says «الحقل قصير جداً»** — `AuthPage.tsx:20` `min(3)` fires before "required" semantics; an untouched field should say «مطلوب» (probe `EMPTY_SUBMIT`). One-line zod reorder (`.min(1,'مطلوب')` + email refine).
3. **P3-3 · No caps-lock hint on any password field** — `AuthPage.tsx:159-178`, `RegisterPage.tsx:280-289, 389-398` (method checklist item; absence verified in code + live). `keydown/getModifierState('CapsLock')` hint chip.
4. **P3-4 · No password strength meter on register** — `RegisterPage.tsx:44,278` (label promises only length). The backend also rejects common passwords (`auth.dto.ts` `password-policy`), which today surfaces only as the generic banner — a meter would pre-empt that.
5. **P3-5 · Loading state is silent for AT** — `AuthPage.tsx:208-220`: no `aria-busy`, spinner `aria-hidden`, text swap unannounced (VLM flagged; code confirms — the primitives' Button gets this right but has zero consumers, 4-A9). Add `aria-busy={login.isPending}` + visually-hidden polite status.
6. **P3-6 · `auth-top`/`auth-bottom` sit outside landmarks** — `AuthPage.tsx:104-112, 271-273`; live axe warning ×2 on /auth ("content not contained by landmarks"). Wrap in `<nav aria-label>` / `<footer>` (or `contentinfo`).
7. **P3-7 · No confirm-password field** — `RegisterPage.tsx:44` — with no self-serve reset (P3-9), one fat-fingered password bricks the account until an advisor intervenes. The show/hide toggle mitigates; still cheap insurance.
8. **P3-8 · Register step-2 top bar renders two identical pills** — «تغيير نوع الحساب» + «تسجيل الدخول» both `.auth-back-home` (`RegisterPage.tsx:94-113`); the VLM itself confused the login link for a back button. Demote the login link to the quiet `.auth-context` style.
9. **P3-9 · Step indicator states read inverted** — done = solid black dot, current = copper fill (`auth.css:241-252`); black reads more "final" than the accent. Swap: current gets the ink pill, done gets accent-check.
10. **P3-10 · 404 offers two exits but no "go back"** — `NotFoundPage.tsx:32-41`; a `history.back()` ghost CTA is the natural first instinct for a mistyped deep link (taxonomy: dead ends). Copy/title otherwise exemplary.
11. **P3-11 · DocumentViewer no-filename state is a bare header** — `DocumentViewerPage.tsx:38-46` renders only «المستند غير محدّد» inside the shell (probe; VLM hallucinated a full 404 scene here — disproven). Add a line of cause + a back CTA (the 404 page is the in-house pattern to copy).
12. **P3-12 · Onboarding skip button is 33px tall on mobile** — `components.css:1493-1503` (`padding: var(--sp-1) var(--sp-2)`, no `min-block-size`, no ≤640px bump). Probe `ONB_MOBILE: skip 50×33`. The escape hatch is the smallest target on the screen — 44px floor + larger tap padding.
13. **P3-13 · `auth-card:hover` deepens elevation on a non-interactive card** — `auth.css:134` — hover implies clickability the card doesn't have (craft-floor: hover states are for action targets). Drop it or scope to the demo buttons only.
14. **P3-14 · Forgot-password notice is a cul-de-sac** — `AuthPage.tsx:186-196` tells the user to "contact your academic advisor" with no link/directory — the only recovery path in the whole auth surface. Link the colleges/advisor directory when it exists.

**Observations (no action / cross-referenced):**
- **HydrationSplash never paints** — two capture attempts with a forced 1.2s `localStorage.getItem` stall never produced a frame (sync-storage rehydrate completes before first commit); the component is a dead path in practice, which is the *intended* no-flash outcome. Pre-CSS paint is browser-default (`a13-prepaint-*`: black in dark colorScheme, would be white for forced-dark users on a light OS — dev-only; the prod CSS `<link>` covers it).
- **VLM honesty log (13/18 claims disproven):** icon side is RTL-correct by construction (inline-start = right; LTR email input mirrors its gutter, `auth.css:340-347` — measured icon x=778, padEnd 40px); ArrowLeft-on-submit is the platform's RTL forward (consistent with OnboardingFlow/PdfViewer, 4-A9); dark demo-panel text measures **5.32:1** (AA pass, not the claimed failure); 404 dark subhead **9.9:1** (not "potentially failing"); role-card icons sit at RTL leading edge; field errors render *below* inputs; "دسار" was VLM OCR garble; the dot color "inconsistency" frame1-copper→frame4-blue is the **designed role-accent handoff** (`components.css:3536-3538`); skip exists on every frame (its quietness corroborates A3's "weak skip affordance"). Verified-correct VLM claims: faculties dead-end effect, validation noise, mobile onboarding CTA reach (A9 P3-9 geometry re-confirmed: CTA x=41, physical left), docviewer icon genericness (moot).
- **MilestoneScene** — code review only (no live trigger without DB writes): queue-behind-onboarding gate + exit-window handoff are genuinely considered (agrees with 4-A9's 9/10); auto-dismiss HOLD_MS 4000 with gate-aware arming is correct. No new findings.
- **Verified-good (do-not-regress):** RHF focuses the first invalid field on both forms (probe `activeName:"firstName"`); deep-link resume with in-app-path guard (`readFromPath`); demo panel is dev-only (`import.meta.env.DEV`, dead-code-eliminated) and honest (fills, never auto-submits; disabled while pending); faculties skeleton/error/retry states exist (awaiting P0-1 to ever be seen); 44px touch floors hold on every mobile control measured (toggle 44×44, forgot 103×44, demo 44px, submit 300×48); zero horizontal overflow at 390px on every audited route; dark mode token-clean end-to-end; the 404's copy is the best microcopy in the platform («هذه الصفحة تغيّبت عن الحضور»).

---

## Top-10 quick wins (fix-wave candidates, effort-ordered)

1. **P0-1:** expose `GET /faculties` publicly (move above `authMiddleware` / public router, project id+name+departments) — unblocks the entire registration funnel.
2. **P1-1:** gate onboarding auto-start to `ROLE_HOME[role]` routes only (+ fix the stale "dashboard" comment) — ends the every-route contamination five audits fought.
3. **P2-1:** 429-aware login error copy («محاولات كثيفة…») — 5 lines.
4. **P2-2 + P2-3:** keep register step state alive + focus the new step's `h1` — one structural change fixes both.
5. **P2-5:** validate the docviewer `back` param with the existing `readFromPath` guard.
6. **P2-4:** single polite error summary; demote per-field `role="alert"` to describedby-only text.
7. **P3-1:** `useDocumentTitle` for /auth, /auth/register, /404, /document/*.
8. **P3-2 + P3-5:** «مطلوب» for empty email + `aria-busy`/visually-hidden status on the submit button.
9. **P3-12:** 44px + padding for the onboarding skip on ≤640px (`components.css`).
10. **P3-9 + P3-13:** swap step-indicator done/current fills; drop the decorative card hover elevation.

## Files to touch

- `backend/src/http/routes/catalog.routes.ts` (P0-1)
- `frontend/src/components/layout/AppShell.tsx` (P1-1)
- `frontend/src/pages/AuthPage.tsx` (P2-1, P3-2/3/5/6/14)
- `frontend/src/pages/RegisterPage.tsx` (P2-2/3/4, P3-3/4/7/8)
- `frontend/src/pages/NotFoundPage.tsx` (P3-1, P3-10)
- `frontend/src/pages/DocumentViewerPage.tsx` (P2-5, P3-11)
- `frontend/src/styles/auth.css` (P3-9, P3-13)
- `frontend/src/styles/components.css` (P3-12; onboarding step announcement belongs to 4-A9 P3-2)
- `frontend/src/components/onboarding/OnboardingFlow.tsx` (only if folding A9's P3-2/P3-9 into the same wave)
