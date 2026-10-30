# 4-A12 — Typography · Color · Dark-Mode System Audit (Campaign 4 «سيادة المظهر»)

Scope: `frontend/src/styles/{tokens,base,fonts}.css` (the system) + sweep of all 15 stylesheets.
Surfaces measured (both themes): `/` · `/auth` · `/student/dashboard` · `/student/courses` · `/teacher/dashboard` · `/owner/realtime`.
Method: playwright text-node contrast probe (fg/bg composite walk, WCAG 2.1) × 12 runs, pixel-verification of suspect regions, static token/literal inventory, 6 VLM light-vs-dark pair critiques. **Audit only — no source edits.**

---

## 1 · Type system audit

### 1.1 Scale inventory (tokens.css:50–77)

| Token | Value | Role | Usage count (CSS+TSX) | Observed line-heights |
|---|---|---|---|---|
| `--fs-mega` | clamp(48–104px) | hero display | 1 (via role) | `calc(display-lh + .05)` |
| `--fs-display-xl` | clamp(40–72px) | display | 2 | **1.05** (Latin-tuned) |
| `--fs-display-lg/md` | clamp(34–56 / 28–40px) | display | 3 | 1.05 / **1.1** (Arabic patch, base.css:262) |
| `--fs-h1` | 30px | page title | 2 + h1 | 1.12 |
| `--fs-h2` | 22px | section title | 4 + h2 | 1.2 |
| `--fs-h3` | 18px | card title | 3 + h3 | 1.2–1.3 |
| `--fs-body(-lg/-md)` | 15/17px | body | 10+roles | 1.45–1.65 ✓ |
| `--fs-sm` | 13px | label | **97** | 1 · 1.2 · 1.25 · 1.35 · 1.4 · 1.5 · 1.55 · 1.75 · 1.85 (**9 values**) |
| `--fs-xs` | 12px | caption | **78** | 1.3 · 1.4 · 1.5 · 1.6 … |
| `--fs-xxs` | 11px | micro | **68** | 1–1.5 |
| `--fs-metric-*` | 22/30/44px | KPI | roles | 1.10 + tnum/lnum ✓ |

**Findings**
- **Label-heavy system:** the three smallest sizes carry 243 of 272 raw `--fs-*` uses (89%). `--fs-xxs` 11px × 68 uses on Arabic copy — the codebase itself rules «never below `--fs-xs`» for official copy (landing.css:112 comment) yet ships 68 `--fs-xxs` + raw 10px/10.5px/11px instances (polish.css:1356, 1550; notifications.css:153, 234, 304). Arabic script + 11px = clipped descenders (ج/ع/ي) — the exact failure that comment documents.
- **Line-height drift at label sizes:** `--fs-sm` pairs with 9 different leadings across stylesheets; the label role token (`--type-label-line-height: 1.5`) is bypassed in ~60% of label blocks. No leading discipline per role.
- **Arabic display leading is Latin-tuned:** `--type-display-line-height: var(--lh-tight) = 1.05` (tokens.css:85, 207). base.css:259–263 explicitly parks Arabic display at 1.1 «until the P1-12 Arabic-leading study lands» — **that study never landed** (only mention is the TODO itself). Diacritic stacks (شدة+تنوين on «تعلّم», «الزّاوية») risk clipping at 1.05–1.1.
- **Weights are honest** (no phantom/faux-bold): fonts.css ships Plex Sans Arabic 400/500/600/700 (12 woff2, ~322 KB); wave 2-a re-pointed `--fw-black → 700`. 7 raw `fontWeight: 600` literals in TSX bypass tokens (minor). Fallback stack names `Tajawal` which is never shipped — phantom fallback family (falls to system-ui).
- **Mono/tabular numerals: good.** `--font-mono` ×34 consumers; `tabular-nums` + `'tnum' 1, 'lnum' 1` on all metric roles (student.css:107-108, colleges.css:615-616…); html-level `tnum` default. Caveat: Arabic-Indic digits (U+0660–0669) aren't in Plex Mono's latin unicode-range → fall to ui-monospace in mono runs (ASCII digits dominate today — latent only).
- **Phantom serif identity:** the stated signature «Plex Serif italic accent» (tokens.css:6) is applied to **Arabic** words at all 5 sites (landing.css:429 `.landing-title em` «التعليم», 711, 817, 1045; polish.css:3008 «منذ 1988» line). IBM Plex Serif ships **latin-only** unicode-range (fonts.css:106–122) and Georgia has no Arabic — so every Arabic `em` falls to an OS-dependent system naskh face, slanted by synthetic italic (faux-italic on cursive Arabic). The 2 italic woff2 files can only ever paint «Oasis» and the digits «1988». The design's typographic voice is uncontrolled on its flagship accent.

### 1.2 Raw px sizes outside the scale (34 declarations)
colleges.css ×8 (14→56px incl. 48/56px display sizes bypassing `--fs-display-*`), notifications.css ×8 (10/10.5/11/12/12.5/13/13.5/14px — half-pixel values), polish.css ×12, components.css ×2 (18/22px icon ladder — intentional), landing.css ×4 (14px), owner.css ×1 (11px), auth.css ×1 (16px icon glyph), layout.css ×1 (14px).

---

## 2 · Contrast violations (probe-measured, WCAG 2.1)

Probe: unique fg/bg/size clusters per surface; thresholds 4.5:1 normal, 3:1 large (≥24px / ≥18.66px bold). Raw: `/tmp/a12-contrast.json`. 366 clusters measured, **32 real failures** (21 light + 11 dark) + 4 false-positives excluded (gradient/photo grounds the compositor can't see: ministry-strip ×2, campus-caption ×2 — both verified compliant by CSS reading + pixel check).

| Route | Theme | Selector | Ratio | Size/weight | Note |
|---|---|---|---|---|---|
| `/` | light | `.landing-final-cta-title` «منصّتك الأكاديميّة» | **1.00** | 72px/700 | invisible — see P0 |
| `/` | light | `.landing-final-cta-btn.ghost` «اكتشف المنصة» | **1.00** | 15px/700 | invisible |
| `/` | light | `.landing-ai-status` «متَّصل الآن» | 3.00 | 11px/600 | mint ink as text (2.46 on its lavender chip) |
| `/` | light | `.landing-pilot-note` ×4 | 4.46 | 12px/400 | muted on sand band, 0.04 under AA |
| `/` | dark | `.landing-final-cta-title` | **1.00** | 72px/700 | invisible (theme-flipped) |
| `/` | dark | `.landing-final-cta-btn.ghost` | **1.00** | 15px/700 | invisible |
| `/` | dark | `.landing-final-cta-title em` «بانتظارك» | 1.87 | 72px/400 | copper on cream band < 3:1 large |
| `/student/dashboard` | both | `.sidebar-user .avatar`, `.topbar-user .avatar` «أح» | 3.21 | 12–13px/600 | white on DB `avatarColor` #4F8EF7 |
| `/student/courses` | light | `.progress-head .font-mono` «60%» ×6 clusters | **1.88–3.60** | 12px/400 | course `themeColor` as text on white |
| `/student/courses` | both | avatars ×2 | 3.21 | — | as above |
| `/teacher/dashboard` | both | `.sidebar/.topbar .avatar` «سب» | **1.88** | 12–13px/600 | white on mint #3DD68C |
| `/teacher/dashboard` | both | `.feed-item .avatar` «أح» | 3.21 | 16px/600 | |
| `/teacher/dashboard` | light | `.pill.on .filter-pill-count` «1» | 3.35 | 12px/600 | light-muted on inverted dark pill |
| `/teacher/dashboard` | dark | `.pill.on .filter-pill-count` «1» | **1.32** | 12px/600 | muted on copper pill |
| `/auth`, `/owner/realtime` | both | — | 0 fails | — | clean |

**CSS-constant violations not rendered on the six surfaces** (shared components, computed from tokens): `.btn.danger` white on `--danger` = **3.19 light / 2.12 dark** (components.css:412); `.topbar-notif-badge` white on `--danger` at **10px** = same ratios (polish.css:1346-1356). The correct pattern already exists in-repo: owner.css:611 pins `#191918` ink on danger (5.51/8.31).

---

## 3 · Dark-mode audit

**Architecture is sound:** complete `[data-theme="dark"]` remap in tokens.css:482–630; overlays/scrims carry explicit dark variants (components.css:1191, 1237, 1610; layout.css:208); `--elev-1..5` dark = fill-led + inset light edge (tokens.css:718-724); `color-scheme: dark` set (base.css:26).

Hardcoded-literal inventory outside tokens.css: **131 hex + 67 rgba = 198**, but triage shows good hygiene: ~40% live in comments/print-block (polish.css:5199+ re-declares the light palette for `@media print` — deliberate); live painted literals are mostly documented both-theme constants (owner.css:611, student.css:1468 ink card, components.css:1472 lightbox-on-scrim, landing.css:524-526 macOS traffic-light dots) or data (PDF annotation palette, LibyaFlag, owner brand swatches). TSX is nearly clean.

**Real theme-blind failures (runtime-observed):** DB-driven colors — `avatarColor` (seed.ts:162-244, auth.service.ts:135) and course `themeColor` — used as fg/bg with no contrast gating (a runtime gate exists for college accents, lib/theme.ts `gateCollegeAccent`, but not for these); `.filter-pill-count` (light-tuned muted that meets neither inverted pill ground); `.landing-final-cta-title/--ghost` (`--text` on a band that always equals `--text`).

**Shadows:** only 5 raw black-alpha shadows bypass tokens (colleges.css:201, polish.css:794/911/1544, owner.css:172). 56% of box-shadows bypass `--shadow-*/--elev-*` but use token-based `color-mix` (rings/halos) — theme-aware. VLM consistently read dark elevation as «flat/shadow death» on 4/6 surfaces: `--shadow-*` dark variants are black-on-black while `--elev-*` dark adds the inset highlight — two elevation languages; card consumers sit on the flatter one. Design observation, not a violation.

**VLM-verified noise (checked, dismissed):** hero illustration white halo in dark (pixel check: 2.7% light pixels — mockup darkens correctly); auth card «golden glow» (none); student-dashboard «photo banner with weak overlay» (no photo — accent-tinted gradient card, subtitle is `--text-secondary` ≥7:1). VLM contrast guesses below probe resolution were all within AA when measured.

---

## 4 · Color-system stats

- tokens.css: 883 lines, ~330 custom properties; light + dark + `prefers-contrast: more` + role-accent (7 roles × 2 themes) + college-accent + elevation + illustration layers.
- `color-mix()` ×242 — consistent modern derivation; alpha overlays kept off text paths (per colorize guidance).
- **Dead legacy aliases:** ~30 definitions with **0 consumers** (`--gold-100/300/500/700/900`, `--green-700`, `--amber-700`, `--red-700`, `--blue-700`, `--paper-*`, `--ink-*`). Live aliases: `--text-subtle` ×38, `--shadow-sm` ×3, `--accent-border` ×1.
- **Two focus-ring systems:** `--focus-ring` (32–36% alpha; 3 consumers, colleges.css:78/935/961) vs canonical `--state-focus-ring` (solid; 17 consumers). Both themes' rings clear 4.5:1 (light #5C3416 10.29:1 / dark #E0A067 7.87:1) — correctness fine, consolidation pending.
- Semantic `-ink` family (T3-F4) passes everywhere; one bypass found: landing.css:1266 paints `--c-mint-ink` as text instead of `--success-ink`.
- Role adoption: `--type-*` roles ×~290 uses vs raw `--fs-*` ×272 — the «roles are mandatory» contract (tokens.css:195-199) is ~50% adopted.

---

## 5 · Findings register

### P0
1. **landing.css:1033-1044 + 1090-1094 — Final-CTA headline & ghost button invisible in BOTH themes.** `.band-dark` (landing.css:687) paints `var(--neutral-900)`; the title/ghost use `color: var(--text)` — which resolves to the *same* neutral-900 in light (#191918 on #191918) and again in dark (#F2EAD8 on #F2EAD8). Evidence: probe 1.00:1 ×4 runs; pixel check — 97% uniform band pixels, zero text pixels. The 0-b «fix» comment (1040) swapped one invisible pair for another. Fix: paint band-scoped ink (e.g. `color: var(--neutral-50)` in light-band terms via the band's own pair, like `-eyebrow/-lede`'s 82/18 oklab mix at 1026/1053), or scope `.band-dark { color }` and let children inherit; ghost button needs the same + a border that survives both bands.

### P1
2. **polish.css:1630-1642 + components/primitives/index.tsx:216-242 + backend seed — avatar initials white on arbitrary DB colors (1.88–3.21:1, both themes, 3 surfaces).** `.avatar { color: #fff; background: var(--accent) }` is overridden inline by `UserAvatar` with `avatarColor` from the DB (seed: #4F8EF7, #3DD68C, #9B6FE8, #D4A537, #6B7280). No luminance gate. Fix: compute fg ink from bg luminance in `UserAvatar` (or route through a contrast gate à la `gateCollegeAccent`); optionally fix seed palette to AA pairs.
3. **components/primitives/index.tsx:157 + pages/student/CoursesPage.tsx:186,204 — progress % painted in course `themeColor` (1.88–3.60:1 in light).** `style={{ color: color ?? 'var(--text-muted)' }}` — DB hex as 12px text on white cards (fails 6 clusters); passes in dark only incidentally. Fix: % value → `var(--text-secondary)` (or `-ink` of the tint); keep the tint for the bar fill only.
4. **student.css:493-499 — `.filter-pill-count` meets neither inverted pill ground (3.35 light / 1.32 dark).** Muted gray tuned for plain surfaces, painted on `.pill.on`'s neutral-900 (light) / copper (dark) ground. Fix: extend the `[aria-pressed='true'] { color: inherit }` rule to `.pill.on`, or give the count its own on-state ink.
5. **components.css:412-418 + polish.css:1346-1360 — white-on-danger family (3.19 light / 2.12 dark, 15px labels; 10px badge).** `.btn.danger --_btn-fg: #fff` and the notif badge `color:#fff; font-size:10px` on `--danger`. The both-theme ink fix is already proven at owner.css:611 (`#191918`: 5.51/8.31). Fix: switch both to the near-black ink (or a `--danger-fg` token), and the badge to `--fs-xxs`+.
6. **fonts.css:106-122 + landing.css:429/711/817/1045 + polish.css:3008 — serif italic accent is a phantom on Arabic.** Latin-only `@font-face` unicode-range can never paint the Arabic `em` words; system-serif + synthetic italic renders instead (OS-dependent, faux-slanted cursive). Fix: either drop `font-family: var(--font-serif)` for Arabic ems and carry the accent via weight+color (keeps the rhythm, kills the uncontrolled fallback), or ship an authored Arabic accent treatment; keep the italic files only where Latin runs exist («Oasis», digits).

### P2
7. **tokens.css:85,207 + base.css:257-269 — Arabic display leading Latin-tuned (1.05), documented study never landed.** Diacritic-bearing display lines risk clipping; dark surfaces additionally want one step more leading per typeset guidance. Fix: `--type-display-line-height: 1.15`–`1.2` for Arabic, re-shoot hero.
8. **landing.css:1264-1271 — `.landing-ai-status` uses `--c-mint-ink` as 11px text (3.0 on white, 2.46 on its lavender chip).** Fix: `var(--success-ink)` (#1F4F30 = 7.78 on the chip) and bump to `--fs-xs`.
9. **landing.css:1045-1050 — final-CTA `em` copper on cream band = 1.87:1 (dark).** Large-text floor is 3:1. Fix: use `--accent-strong` on the cream band (dark) / verify light pair after P0-1 rework.
10. **Scale floor erosion — 68× `--fs-xxs` (11px) + raw 10/10.5/11px on Arabic copy.** Notable: notif badge 10px (polish.css:1356), bottom-nav label 10px (notifications.css:304), notifications half-pixel sizes (12.5/13.5px). Fix: enforce `--fs-xs` floor for Arabic micro-copy; snap half-pixel sizes to the scale.

### P3
11. **Line-height drift at label sizes** — `--fs-sm` ×9 different leadings, `--fs-xs` ×6; role tokens bypassed. Fix: mechanical sweep onto `--type-label-line-height`.
12. **~30 dead legacy token aliases** (0 consumers) — token bloat, invites accidental reuse. Fix: delete in a foundations wave (snapshot test pins role-accent hexes only).
13. **Two focus-ring spellings** — `--focus-ring` (alpha) vs `--state-focus-ring`. Fix: migrate colleges.css's 3 consumers, retire one name.
14. **Two elevation languages in dark** — `--shadow-*` (black-alpha) vs `--elev-*` (fill+inset); VLM reads the shadow family as «flat» in dark on 4/6 surfaces. Fix: consider migrating card shadows to `--elev-*` or adding the inset edge to `--shadow-*` dark variants.
15. **34 raw px font-sizes outside the scale** (colleges.css 48/56px display bypass worst). Fix: map onto `--fs-display-*`/`--fs-*` in the colleges polish wave.
16. **7 raw `fontWeight: 600` in TSX** + phantom `Tajawal` in the fallback stack (never shipped). Fix: `var(--fw-semibold)`; drop Tajawal or ship it.
17. **`.btn::after` ripple `rgba(255,255,255,0.25)`** (polish.css:3234) — invisible on light buttons. Fix: `color-mix(currentColor …)` or theme-aware alpha.

---

## 6 · Top-10 quick wins (highest impact / lowest risk)

1. Final-CTA title + ghost: band-aware ink (P0-1) — one ruleset, flagship page.
2. `.btn.danger` + notif badge → near-black ink (P1-5) — two lines, both themes fixed.
3. `UserAvatar` luminance-gated fg (P1-2) — one component, every surface.
4. ProgressBar % → `--text-secondary` (P1-3) — one line.
5. `.filter-pill-count` on-state inherit (P1-4) — one selector.
6. `.landing-ai-status` → `--success-ink` + `--fs-xs` (P2-8).
7. `.landing-pilot-note` → `--text-secondary` on the sand band (4.46→~7:1).
8. `--type-display-line-height` 1.05 → 1.15 (P2-7) — one token, re-shoot hero.
9. Serif `em` accent: drop the phantom family on Arabic runs (P1-6).
10. notifications.css half-pixel + 10px sizes snapped to the scale (P2-10).

## 7 · Files to touch (fix waves)

`frontend/src/styles/landing.css` · `polish.css` · `components.css` · `student.css` · `notifications.css` · `tokens.css` · `frontend/src/components/primitives/index.tsx` · `frontend/src/pages/student/CoursesPage.tsx` · (optional, coordinated) `backend/prisma/seed.ts` + `backend/src/modules/auth/auth.service.ts` for the avatar palette.

## 8 · Hand-offs

- **4-A13 / 4-A7:** `/owner/realtime` screenshots are intercepted by the onboarding modal (owner first-login). VLM flagged the onboarding primary CTA flipping filled→ghost between themes and a lighter illustration container in dark — needs its own verified pass; the underlying realtime console wasn't directly shot.
- **4-A1 (landing):** VLM palette-rhythm note — cream→white→lavender section banding reads as patchwork in light; final-CTA sits at the end of that rhythm and is the P0 above.
- **4-A11 (motion):** the ripple invisibility (P3-17) borders their scope.

*Probe artifacts: `/tmp/a12-contrast.json`, shots `/tmp/madarek-shots/a12-*.png` (12 surface pairs + 8 evidence crops). No source files were modified.*
