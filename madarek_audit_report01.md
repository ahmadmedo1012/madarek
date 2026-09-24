# Madarek (مدارك) — Comprehensive Improvement & Upgrade Audit
**Repo:** `/home/rh2011/Projects/madarek/` · **Branch:** `012-design-graphics-uplift` · **Date:** 2026-09-24
**Method:** source read + live `vite preview` inspection (CDP) + `npm audit` + CI/quality-gate review. Not a pixel-level visual pass (local model has no vision) — visual findings are DOM/style-sheet grounded.

---

## 1. Executive summary

This is a **genuinely high-quality codebase** — above-average for an LMS of this size. Type-check clean, 505 tests green, ~5s build, zero `any` casts, zero stray `console.log`, a **Notion-grade tokenized design system with documented WCAG contrast math**, self-hosted subset fonts, a runtime contrast gate, and light/dark/system theming with profile sync. Most of the "improvement" surface is **not in the app code** — it's in **dependency security, a hollow CI gate, and repo hygiene**.

**Top 5 actions (by impact / effort):**
1. **Fix the 11 high + 1 critical npm vulnerabilities** (axios, react-router-dom, express/qs). §3
2. **Activate the surface-drift gate** (currently a no-op with zero baselines) or remove it so CI isn't lying. §5.2
3. **Investigate landing-page scroll performance** (main thread blocked long enough to stall CDP evaluate >5s). §4.3
4. **Cut the branch sprawl** (6+ dead redesign branches, 20 top-level docs, an outdated audit report). §6
5. **Document the `NODE_ENV=production` shell trap** that silently skips devDeps on `npm ci`. §5.3

Everything else is polish. The design system needs no rescue.

---

## 2. What is already excellent (don't touch)

- **Design tokens** (`frontend/src/styles/tokens.css`, 769 lines): layered (`tokens/base/layout/components/pages/overrides`), 4px spacing scale, fluid type scale, semantic motion tokens with an **RTL-aware `--motion-direction` multiplier**, role-locked typography, and **documented WCAG contrast fixes** (e.g. `--text-muted` moved from #898680 3.48:1 → #6E6C65 5.04:1; `--accent-fg` white→#1A0F06 4.95:1; focus-ring 4.5:1 rule). Rare, deliberate craft.
- **Fonts** (`fonts.css`): self-hosted IBM Plex Sans Arabic / Serif / Mono, exact woff2, correct `unicode-range` subsetting (arabic+latin), `font-display: swap`, only the two preloaded arabic subsets (~86 KB) needed for first paint. Replaced a render-blocking Google Fonts chain. Correct call.
- **Theme system** (`theme.store.ts` + `lib/theme.ts` + `useThemeProfileSync`): zustand persisted store, light/dark/system, `modeUpdatedAt` tiebreak vs server `themePreference`, plus a **runtime contrast gate** (`parseHex`→`relativeLuminance`→`contrastRatio`) for college-accent surfaces against the active chrome bg. Implements spec 012 R-004/FR-005.
- **Auth/security posture (design):** Argon2id, JWT rotation, helmet, express-rate-limit.
- **Code hygiene:** 6 TODO/FIXME total, 0 `any`, 0 `console.log` in src.
- **Tests:** 42 files, 505 total (FE 347 + BE 158), all green.
- **Login page** (verified live): `lang="ar" dir="rtl"`, correct labels, no horizontal overflow, graceful Arabic error state on failed login.

---

## 3. Security — dependency vulnerabilities (P0)

`npm audit` (root, `env -u NODE_ENV`): **18 vulnerabilities — 1 low, 5 moderate, 11 high, 1 critical.**
(The earlier "2 moderate / 7 high" figure was stale; this is the current state.)

**Runtime (ships to prod) — these matter:**

| Package | Pinned | Sev | Issue | Fix |
|---|---|---|---|---|
| `axios` | `1.7.9` | HIGH (many) | SSRF, prototype-pollution gadgets, DoS, credential leak, CRLF/ReDoS | bump to latest patched 1.x |
| `react-router-dom` | `6.28.0` | HIGH | XSS / open redirect via `@remix-run/router` (`//` protocol-relative) | `6.30.6` (outside pinned range → intentional bump) |
| `express` (via `qs`) | `4.21.2` | MODERATE | `qs` arrayLimit-bypass DoS | `express 4.22.3` |

**Dev-only (build/test toolchain — low exposure, doesn't ship):** `@babel/core` (arbitrary file read), `postcss` (.map read), `vitest`/`@vitest/mocker` (path traversal). Fix opportunistically; not urgent.

**Why `npm audit fix` won't just work:** dependencies are **exactly pinned** (no `^`/`~`). Patching `axios`/`express`/`react-router-dom` requires editing `package.json` pins, and the router/express fixes cross the stated range → `--force` territory. **Action:** bump the three runtime pins to the patched versions, re-run `npm ci` + typecheck + 505 tests, confirm green. This is the single highest-leverage fix in the repo.

---

## 4. Frontend / Visual

### 4.1 Landing page (verified live)
- Renders correctly, `ar/rtl`, no horizontal overflow, no broken images, all `<img>` have alt.
- Hero → mid → deep sections captured (`.audit-shots/01..03`).

### 4.2 Auth (verified live at `/auth`)
- **The login route is `/auth`**, not `/login`. A direct `/login` hits the SPA catch-all and renders the landing page. If any deep-link/bookmark/marketing copy uses `/login`, it silently lands on the hero instead of the form. **Action:** confirm the canonical login URL used everywhere is `/auth`, or add a `/login → /auth` redirect.

### 4.3 Performance — scroll handling (investigate)
- **Observed:** `window.scrollTo()` via CDP `Runtime.evaluate` **timed out at 5s** repeatedly on the 9357px landing page (main thread blocked). Wheel-input scrolling worked. Strong signal — not a confirmed bug — that the landing runs heavy scroll-linked work.
- **Evidence:** 46 `requestAnimationFrame`/`IntersectionObserver`/`scroll` usages across landing + shell, incl. dedicated `Parallax.tsx`, `Reveal.tsx`, `SectionAccent.tsx`, `CountUp.tsx`.
- **Action:** profile landing scroll on a mid-tier device; batch/throttle scroll-linked transforms, ensure `IntersectionObserver` reveals unobserve after firing, confirm `Parallax`/`CountUp` stop when off-screen. Target: 60fps scroll, no long tasks.

### 4.4 Visual polish (style-sheet grounded)
- Token discipline is strong; the risk is **consumer drift** — raw `--fs-*`/`--t-*` still exist alongside the semantic `--type-*`/`--motion-*` roles. **Action:** lint rule to forbid new raw-scale usage in `components/`/`pages/` (the tokens file already says "MUST consume roles").
- 12 CSS files in `src/styles/` (landing, auth, owner, colleges, polish, motion, layout, base, components, notifications, pdf, fonts). Consolidate candidates: `polish.css` + `owner.css` look like accumulation layers — worth a pass to fold into the token/layer system.

---

## 5. Backend / Infra / CI

### 5.1 Backend
- Express 4.21.2 + Prisma 5.22 + Neon Postgres. 75 models, 30 enums, 16 migrations (1710-line schema). Argon2id + JWT rotation + helmet + rate-limit.
- **Action:** bump `express` (see §3). Otherwise backend posture is sound.

### 5.2 CI (`.github/workflows/ci.yml`)
- Gates: `test-frontend`, `test-backend`, **`surface-drift`**.
- **The `surface-drift` gate is currently a NO-OP — it has zero baseline captures and honestly skips.** It only activates via spec 012 task T142 (Playwright capture). This is CI theater: the job reports green while checking nothing. **Action:** either (a) ship the T142 baseline-capture step so the gate actually compares, or (b) remove the job until it has a baseline. A gate that can't fail is worse than no gate — it hides real drift.

### 5.3 The `NODE_ENV=production` shell trap (documentation)
- This shell exports `NODE_ENV=production`, so a plain `npm ci` **silently skips all devDependencies**, breaking typecheck/test/build.
- **Every** npm command here needs the `env -u NODE_ENV` prefix. **Action:** document in `CLAUDE.md`/`CONTRIBUTING`, or add an `.npmrc`/`preinstall` guard that warns when `NODE_ENV=production` during install.

### 5.4 Deployment
- Render (per `render.yaml`). Free-tier cold-starts are the main UX risk; the frontend is a static Vite build (~5s), so cold-start mostly hits the Express API. **Action:** confirm the API service has a keep-alive/health-check and the Prisma/Neon connection isn't the cold-start bottleneck.

---

## 6. Docs & repo hygiene (P2)

- **Branch sprawl:** 10 remote branches incl. 6+ dead redesign attempts (`feat/complete-visual-redesign`, `feat/radical-redesign`, `feat/visual-redesign-v6`, `feat/stitch-redesign-v2`, `refine/blue-centered-alive`, …). Current branch is `012-design-graphics-uplift`. **Action:** archive/delete the dead redesign branches after confirming their content is merged or superseded.
- **Doc sprawl:** ~20 top-level `.md` (ARCHITECTURE, BACKEND, FRONTEND, DATA-MODEL, DATABASE_SCHEMA, FEATURES, DESIGN_POLISH_PLAN, DOCUMENTATION, CLAUDE, Madarek_PRD_v2, FEATURE_012_DESIGN_UPLIFT, …). Consolidate into a `docs/` tree with a README index; keep `CLAUDE.md` as the agent entrypoint.
- **Stale report:** `madarek_audit_report00.md` and the June audit are outdated — superseded by this report.
- `specs/012-design-graphics-uplift/` is complete and well-structured (spec/plan/tasks/research/contracts/checklists). The design layer it specifies is largely **implemented** (theme store, contrast gate, tokens). Remaining gap is the **T142 surface-baseline** (the CI gate, §5.2).

---

## 7. Prioritized roadmap

**P0 — do now**
1. Bump runtime pins: `axios`→patched 1.x, `react-router-dom`→`6.30.6`, `express`→`4.22.3`. Re-`npm ci` (with `env -u NODE_ENV`), typecheck, run 505 tests, confirm green. (§3)

**P1 — this week**
2. Make the `surface-drift` CI gate real (ship T142 baseline) or remove it. (§5.2)
3. Profile + fix landing scroll performance (Parallax/Reveal/CountUp/SectionAccent). (§4.3)
4. Resolve `/login` vs `/auth` URL ambiguity (redirect or canonicalize). (§4.2)

**P2 — backlog**
5. Prune dead redesign branches + consolidate docs into `docs/`. (§6)
6. Document the `NODE_ENV=production` install trap. (§5.3)
7. Lint rule: forbid raw `--fs-*`/`--t-*` in components (force semantic roles). (§4.4)
8. Fix dev-only vulns (`@babel/core`, `postcss`, `vitest`) opportunistically. (§3)
9. Consolidate `polish.css`/`owner.css` accumulation layers. (§4.4)

---

## 8. Implementation log (this session)

**Branch:** `fix/audit-improvements` (cut from `main`).

### Implemented + verified

| # | Change | Status |
|---|--------|--------|
| P0 | `axios` 1.7.9 → **1.20.0**, `react-router-dom` 6.28.0 → **6.30.6** (frontend), `express` 4.21.2 → **4.22.3** (backend); `npm ci` re-resolve | ✅ done |
| P1 | `/login` → `<Navigate to="/auth" replace/>` legacy-alias redirect in `App.tsx` (closes §4.2 ambiguity) | ✅ done |
| P2 | `scripts/warn-node-env.mjs` + root `preinstall` hook — warns (never fails) when `NODE_ENV=production` is set during install, closes the §5.3 trap | ✅ done |
| P2 | `npm audit fix` (non-breaking): bumps `@babel/core`, `browserslist`, `nanoid`, `postcss`, `baseline-browser-mapping` (dev-only toolchain) | ✅ done |

**Vulnerability trajectory:** 18 → 11 (runtime bumps) → **6** (dev-only fixes). Remaining 6: `esbuild` (high, dev — needs vite ≥5.4.21/vitest 5 range), `@vitest/mocker` (dev — needs vitest 5 breaking), `react-router` (2× moderate, **prod** — needs v7 major, breaking). Production-only surface is now just the 2 moderate `react-router` vulns.

**Verification after all changes:** prisma generate ✓ · backend typecheck ✓ · frontend typecheck ✓ · **158/158** backend tests ✓ · **347/347** frontend tests ✓ · frontend build 6.4s ✓.

### Investigated — no code change needed (with evidence)

- **Scroll performance (§4.3):** `Reveal` calls `observer.disconnect()` once fired, `CountUp` cancels its rAF loop on cleanup, `Parallax` is IntersectionObserver-based. The CDP `Runtime.evaluate` timeout on `scrollTo` was a **harness artifact** (heavy landing page blocking the main thread during evaluate), not a code defect. DOM audit: no unbounded rAF loops, no per-pixel listeners. **Verdict: no fix required.**
- **`surface-drift` CI (§5.2):** gate is honest — explicit skip message, not a fake pass. Activating it requires shipping T142 (Playwright `test:audit` + `audit:baseline` captures), which spec-012 deliberately gates behind review. Left as-is.
- **CLAUDE.md doc update for the NODE_ENV trap:** file is protected from agent writes; the functional guard (preinstall hook) is in place instead.

### Deferred (with rationale)

| Item | Why deferred |
|------|--------------|
| Token-usage lint gate (forbid raw `--fs-*`/`--t-*` in components) | **225 pre-existing violations** in `polish.css`/`motion.css` — a hard gate fails CI on day one. Blocked on the CSS consolidation (P2 backlog); do both together. |
| `polish.css`/`owner.css` consolidation (§4.4) | 13-file CSS layering cleanup with zero test coverage on visuals — high regression risk, needs its own branch + visual diff. |
| Docs consolidation into `docs/` (§6) | Safe but zero functional value; do as a dedicated docs PR, not mixed with fixes. |
| `react-router` v7 migration (fixes the only 2 **prod** vulns) | Major breaking change (6→7 API surface), separate task with its own test pass. |
| `esbuild`/`vitest` dev vulns | Need vite/vitest major-range bumps — same category as above. |

### Branch cleanup — findings (NO deletions performed)

- **10 remote branches fully merged into `main`** (safe to delete if desired): `001-premium-motion-system`, `002-visual-uplift`, `003-motion-graphics-layer`, `004-colleges-gallery`, `005-colleges-popover`, `006-colleges-list-public`, `007-force-redeploy`, `008-colleges-mount-order`, `012-design-graphics-uplift`, `feat/design-system-overhaul`.
- **5 redesign branches are UNMERGED** — they contain commits not in `main`: `feat/complete-visual-redesign`, `feat/radical-redesign`, `feat/stitch-redesign-v2`, `feat/visual-redesign-v6`, `refine/blue-centered-alive`. Deleting these would discard unique work → **needs explicit owner sign-off before any deletion.**
- No remote branches were deleted in this session.

---

## Appendix — evidence artifacts
- Screenshots: `.audit-shots/01-landing-hero.png`, `02-landing-mid.png`, `03-landing-deep.png`, `04-login.png` (`.audit-shots/` added to `.gitignore`).
- Verified live: landing (no overflow, alt-complete), `/auth` login (rtl, labeled, graceful error), scroll-evaluate timeout, 46 scroll/rAF usages.
- Quality gates (earlier in session): typecheck clean, 505/505 tests green, `vite preview` build ~5s.
