# R343 IMAGERY — the complete image inventory (task C1, analysis only)

Owner: **C1** (analysis-only; zero asset/component edits). Base `b8755850`, branch `wip/r343-C1`.
Method: static crawl — `find` + `du -b` over every image extension (`png/jpg/jpeg/webp/svg/avif/ico`), `git grep` (tracked files) for every basename and every dynamic template (`/media/${…}`, `assets/product`, `og:`, app.json entries), read of every consumer file. No browser, no edits. `apps/mobile` app.json = `app.config.ts`. Email templates = `backend/src/lib/mail.ts` (`renderEmailShell`: **no images by design** — "no images (they break in locked-down inboxes)"; zero image refs).

## 0. Verdict table (counts · bytes · runtime consumers · R343 verdict)

| directory / group | image files | bytes | runtime consumers (web) | runtime consumers (mobile) | verdict |
|---|---|---|---|---|---|
| `public/media/renders/` (+README = 7 files) | 6 webp | 821,006 | Footer ×3, Statement crawl ×2 | — | **DELETABLE after replacement** (r342 art + typographic cards) |
| `public/media/universities/` | 29 webp | 2,278,824 | CampusPages gallery, Statement media cell | **campus.tsx loads all 9 `-800` renditions remotely** | **DELETABLE after replacement** (SVG typographic cards) — mobile must port first |
| `public/media/product/` | 16 webp | 437,928 | Roles deck, WhyScene gallery, ProductFrame ladder | — | **DELETABLE after replacement** (Playwright product plates) |
| `public/media/app/` | 1 svg | 1,980 | AppDownloadPage QR | — | **DELETABLE after replacement** (regenerated identity QR) |
| `public/media/textures/` | 3 | 37,054 | 3 CSS files (grain + micro-grid, light/dark) | — | **DELETABLE after replacement** (CSS/SVG-native grain) |
| `public/media/illustrations/r342/` (+product/README = 43 files) | 42 webp | 5,305,633 | WhyScene (why-cycle only, wired) | — | **STAY** (published contract `docs/redesign/r342/ASSET-CONTRACT.md`) |
| `src/assets/product/` | 6 webp | 532,802 | 3 wired (Product ×2, WhyScene ×1) | — | **DELETABLE after replacement**; 3 are orphans (deletable NOW) |
| `public/brand/` + `public/favicon.svg` | 10 | 53,662 | icons/manifest/sw/seeds/OG | owner/content register (text) | **STAY** (R323 brand system; `madarek-og.jpg` = replace bytes IN PLACE) |
| `apps/mobile/assets/images/` | 7 png | 45,767 | app.config.ts entries | icon/splash/adaptive/favicon/notification | **STAY** (regenerated from `mark.ts` by `scripts/brand/build-app-icons.mjs`) |
| `apps/mobile/assets/brand/mark.svg` | 1 svg | 761 | — | — (app draws its own `BrandMark`) | **orphan — deletable** |
| `apps/mobile/assets/expo.icon/` | 2 | 54,289 | — | — (Expo icon-designer artifact) | **orphan — deletable** (verify w/ Phase F) |
| `shared/brand/mark.svg` | 1 svg | 302 | generated + CI byte-checked | — | **STAY** (canonical generated SVG) |

Total image files inventoried: **124** (web 113 · mobile 10 · shared 1). Unconsumed at runtime: **7** (`hero-ink-2200.webp`, `src/assets/product/{student-dashboard,owner-dashboard,teacher-grading}.webp`, `apps/mobile/assets/brand/mark.svg`, `expo.icon/` 2 files). Referenced = 117.

---

## 1. `public/media/renders/` — R314 ink-render programme (6 webp, 802 KB)

Generator: `scripts/r314/ink-render.mjs` (deterministic photo→ink pipeline; Commons-licensed sources, `adapted: true`, ShareAlike honoured — `renders/README.md`, `manifest.json renders[]`). **Latent defect 1:** the shipped crops are `-640` but the script's JOBS table (ink-render.mjs:751–783) emits `hero-ink-{1100,2200}` + `crop-*-960` — re-running today does NOT reproduce the shipped bytes. **Latent defect 2:** `crop-uob-garden-640.webp` is referenced at runtime but NEVER existed in git (404 — see below).

| file | bytes | used where (file:line · component · role) | replacement plan |
|---|---|---|---|
| `hero-ink-1100.webp` | 107,672 | `sections/Footer.tsx:377` (`.fo-mark-img` 0-height caption stub, decorative) · `Footer.tsx:400` (`.fo-strip-img` — the footer strip band, hero role) · `Footer.tsx:424` (`<svg><image>` grayscale twin, decorative) | **r342 `footer/footer-skyline-{light,dark}[@2x].webp`** (ASSET-CONTRACT §3.8 explicitly replaces this seat — removes the last photo-derived raster from the homepage) |
| `hero-ink-2200.webp` | 347,816 | **no runtime consumer** (only `ink-render.mjs:751` generator row) — the superseded V2 hero @2x | delete with the directory (unconsumed) |
| `crop-garyounis-1-640.webp` | 98,624 | `sections/Statement.tsx:279` (crawl cell 2 `<img>`) + `:295` (`--crawl-img` bg tile) — dynamic `crop-${CRAWL_CAPTURES[i]}-640` | per-university **SVG typographic cards** (the crawl strip becomes type, not photos) |
| `crop-omu-agri-640.webp` | 106,798 | Statement.tsx:279/295 (cell 3) | same |
| `crop-fateh-science-640.webp` | 46,070 | Statement.tsx:279/295 (cell 4) | same |
| `crop-garyounis-classic-640.webp` | 114,026 | Statement.tsx:279/295 (cell 5) | same |
| ~~`crop-uob-garden-640.webp`~~ | **MISSING** | Statement.tsx:279/295 (cell 1 — `CRAWL_CAPTURES[0]='uob-garden'`) | **404 defect**: the intro crawl's FIRST cell img + bg tile load a file that has never shipped (verified: never in git history). The typographic-card replacement fixes it; note for any interim fix. |

## 2. `public/media/universities/` — R307 Commons photo rail (29 webp, 2.2 MB)

Registry: `src/data/university-media.ts` (`HERO_PHOTOS` 3 + `RAIL_PHOTOS` 6) ←→ `public/media/manifest.json photos[]` (9 ids). Loader: `MediaFrame.tsx:54` (`src` = `${id}-${widths[0]}`) + `university-media.ts:55` (srcset). Rebuilder: `scripts/media/build-media-derivatives.mjs` (fetches Commons 1600px → ffmpeg/libwebp). Parity pins: `tests/unit/r307-landing-media.test.tsx:83`, `r306-landing-sheet.test.ts:217`. Consumer page: `pages/campus/CampusPages.tsx:87–100` (the campus gallery — NOT the landing).

| id (widths on disk) | bytes (sum) | seats | replacement plan |
|---|---|---|---|
| `uob-wide` 480/800/1200/1600 | 156,812 | campus hero-lead (CampusPages:87) | per-university **SVG typographic card** |
| `uob-science` 480/800/1200 | 323,040 | campus hero-mid (:88) | same |
| `tripoli-science` 480/800/1000 | 373,578 | campus hero-tall (:89) | same |
| `uob-garden` 800/1200/1600 | 135,734 | campus panorama (:94) + **Statement.tsx:102** (intro media cell, hero role, 1600) | card + **r342 `statement/statement-courtyard-{light,dark}.webp`** for the intro cell (ASSET-CONTRACT §3.2/§5 names this exact replacement) |
| `garyounis-classic` 480/800/1200 | 422,126 | campus rail-large (:96, InkSketch overlay) | card |
| `garyounis-1` 480/800/1200 | 183,976 | campus rail (:97) | card |
| `omu-agri` 480/800/1200 | 295,172 | campus rail (:98) | card |
| `fateh-science` 480/800/1200 | 53,524 | campus rail (:99) | card |
| `uob` 480/800/1200/1600 | 334,862 | campus rail-detail (:100) | card |

**Mobile dependency (deletability blocker until Phase F):** `apps/mobile/app/campus.tsx:160` `photoUrl(id)` = `${WEB_ORIGIN}/media/universities/${id}-800.webp` — all **9** `-800` files are fetched at runtime by shipped mobile builds. Deleting the directory breaks the mobile campus page (and older OTA builds) until the mobile page ports to the same SVG cards (PLAN.md W4+ "29 university SVG cards … mobile copy").

## 3. Product captures — `public/media/product/` (16 webp, 438 KB) + `src/assets/product/` (6 webp, 533 KB)

Provenance: REAL seeded-demo captures (R308 archive `.r308-capture-archive` → `build-media-derivatives.mjs:106-118`; R333 2× set documented in `docs/archive/redesign/r333/media-capture.md`). Ladders: 720+1280 (public, `manifest.json products[]` 8 ids) and 1440@1×/2880@2× (src assets, Vite-hashed). ASSET-CONTRACT §3.6/§5: real product proof, "do NOT replace with generated interfaces" — R343's replacement is **Playwright-rendered product plates from the real components** (same surfaces, re-captured in the new system; not fabricated UI).

Public ladder consumers: `sections/Roles.tsx:111` (slideSrcSet 720/1280 — all 8 ids) + `:152` (`src` `-720`); `WhyScene.tsx:156–161` (`capSrc`: student 4 ids + `EXTRA_CAPTURES` teacher/admin/owner/quality at 720); `ProductFrame.tsx:58/:188` (`productSrcset`/`src`); `university-media.ts` `PRODUCT_CAPTURES`; parity pins `r307-landing-media.test.tsx:92`.

| id | public bytes (720+1280) | src asset | bytes | used where | replacement plan |
|---|---|---|---|---|---|
| `student-dashboard` | 61,970 | `student-dashboard.webp` | 34,570 | Roles slide 1 · WhyScene · **src asset = ORPHAN (0 imports)** | Playwright plate @720/1280 (+2× if seated); delete orphan now |
| `teacher-dashboard` | 54,882 | — | — | Roles slide 2 · WhyScene EXTRA | Playwright plate |
| `admin-dashboard` | 44,424 | — | — | Roles slide 3 · WhyScene EXTRA | Playwright plate |
| `quality-dashboard` | 53,348 | — | — | Roles slide 4 · WhyScene EXTRA | Playwright plate |
| `owner-dashboard` | 47,264 | `owner-dashboard.webp` | 33,718 | Roles slide 5 · WhyScene EXTRA · **src asset = ORPHAN** | Playwright plate; delete orphan now |
| `student-library` | 49,314 | — | — | Roles slide 6 · WhyScene (`PRODUCT_CAPTURES`) | Playwright plate |
| `student-matrix` | 61,212 | — | — | Roles slide 7 · WhyScene | Playwright plate |
| `student-lecture-player` | 65,514 | — | — | Roles slide 8 · WhyScene | Playwright plate |
| — | — | `exam-active.webp` | 103,554 | `sections/Product.tsx:28` (platform seat 1, img :90; row :186) | Playwright plate (platform band pair) |
| — | — | `ai-tutor.webp` | 135,026 | `Product.tsx:29` (platform seat 2, img :103) | Playwright plate |
| — | — | `lecture-checkpoint.webp` | 104,492 | `WhyScene.tsx:32` (the 2× lecture seat via `ProductFrame twoXSrc`, @2880×1740) | Playwright plate @2× |
| — | — | `teacher-grading.webp` | 121,442 | **ORPHAN (0 imports — R333 canonical, never wired)** | delete now |

## 4. `public/media/app/` (1 file)

| file | bytes | used where | replacement plan |
|---|---|---|---|
| `qr-app-page.svg` | 1,980 | `pages/AppDownloadPage.tsx:182` (QR to the download page, identity ink-on-paper, no external service; alt provided) | regenerate in the R343 art pass (identity-styled QR re-derived from the deployed URL; keep a QR — it is functional, not decorative). Path may stay `/media/app/` or move to `/brand/` — C-phase owner's call; delete the old file after the swap. |

## 5. `public/media/textures/` (3 files, 37 KB)

Generator: `scripts/r314/make-grain.mjs` (deterministic, spectrum-matched to the Heron reference; records `scripts/r314/grain-measure.json`). Consumers (all CSS):

| file | bytes | used where | replacement plan |
|---|---|---|---|
| `grain-tile-light.webp` | 16,632 | `styles/landing/chrome.css:121` · `styles/patterns.css:692` · `styles/shell/sheet-frame.css:53` (multiply grain, light) | CSS/SVG-native grain (inline data-URI or token-painted noise) re-wired in exactly these 3 sheets ×2 theme arms; keep the ±5% measured-grain gate if the VLM parity pass still requires it |
| `grain-tile-dark.webp` | 19,970 | chrome.css:131 · patterns.css:702 · sheet-frame.css:56 | same |
| `micro-grid.svg` | 452 | chrome.css:122,132 · patterns.css:693,703 · sheet-frame.css:54,57 (24px dotted film) | inline SVG data-URI in the same 3 sheets |

## 6. `public/media/illustrations/r342/` — STAY (42 webp / 19 compositions, 5.3 MB)

Published contract: `docs/redesign/r342/ASSET-CONTRACT.md` (filenames stable; consume freely). Registered in `manifest.json illustrations.items` (19). Wiring status today: **only `why/why-cycle-{light,dark}.webp` is wired** (`WhyScene.tsx:257/:265`, both theme twins, informative alt). The other 18 compositions are published-but-unwired (their seats are named in ASSET-CONTRACT §3 + §5): hero 6 (`hero-campus-*[@2x]`, `hero-campus-mobile-*`), statement 2, problems 8, journey 10 (incl. `journey-route`), roles 10, footer 4 (`footer-skyline-*[@2x]`). `product/README.md` documents the deliberate no-generated-UI decision. **Plan: keep all 42; wire the unwired seats per the contract (hero agent, statement, problems/journey, footer).**

## 7. Brand + favicon + OG (`public/brand/` 9 files + `public/favicon.svg`)

R323 brand system (`docs/archive/redesign/r323/brand/BRAND.md`); generated by `scripts/r323/brand-assets.mjs`; pinned by `tests/unit/r323-brand-system.test.ts`, `r177-brand-neutrality.test.ts`, `r188-brand-integrity.test.ts`, `r327-pwa-sw.test.ts`, `assets.test.ts`, `legal-pages.test.tsx:601`.

| file | bytes | used where | verdict / plan |
|---|---|---|---|
| `favicon.svg` | 864 | `index.html:22` · `sw.js:47` · r177:261, r323:211 | STAY (clean) |
| `icon-180.png` | 1,812 | `index.html:30` (apple-touch-icon) · legal-pages.test:601 | STAY |
| `icon-192.png` | 2,278 | `manifest.webmanifest:14,26` · `offline.html:7` · `sw.js:40` · r327:68 | STAY |
| `icon-512.png` | 5,069 | manifest:20,32 · sw.js:41 · r327:69 | STAY |
| `mark.svg` | 761 | byte-twin of `madarek-mark.svg` (r323:236) · published register | STAY |
| `madarek-mark.svg` | 761 | `sw.js:39` (precache) · seeds `posterUrl` (`backend/prisma/seed.ts:1053,1069`, `seed-pilot.ts:493`, `seed-demo-r330.ts:521`) · `index.html:68` (ld+json logo) · `curriculum-logic.test.ts:143` · assets.test:196 | STAY |
| `wordmark.svg` | 3,513 | published asset register (mobile `owner/content.tsx:20` lists it; no web runtime `<img>`) | STAY |
| `lockup.svg` | 3,844 | published register (r323:251) | STAY |
| `lockup-stacked.svg` | 6,525 | published register | STAY |
| `madarek-og.jpg` | 28,235 | `index.html:47` (og:image, absolute) · `:55` (twitter:image, absolute) · **`assets.test.ts:196` pins "must remain"** · generator `scripts/r323/brand-assets.mjs:235` | **replace bytes IN PLACE** (new OG art at the same path — the R323 precedent "file regenerated in place"). Free-path deletion would break a pinned test assertion + the absolute social URLs; sub-agents must not move it. |

## 8. Mobile (`apps/mobile`)

| asset | bytes | used where | plan |
|---|---|---|---|
| `assets/images/icon.png` | 9,941 | `app.config.ts:16` | STAY — regenerated from `src/brand/mark.ts` by `scripts/brand/build-app-icons.mjs` (`npm run icons`, CI `icons:check`) |
| `assets/images/adaptive-foreground.png` | 7,370 | app.config.ts:35 | STAY (same pipeline) |
| `assets/images/adaptive-background.png` | 11,127 | app.config.ts:36 | STAY |
| `assets/images/adaptive-monochrome.png` | 6,970 | app.config.ts:37 | STAY |
| `assets/images/splash-icon.png` | 9,114 | app.config.ts:58 (expo-splash-screen) | STAY |
| `assets/images/favicon.png` | 606 | app.config.ts:48 (web output) | STAY |
| `assets/images/notification-icon.png` | 639 | app.config.ts:68 (expo-notifications) | STAY |
| `assets/brand/mark.svg` | 761 | **0 references** (app draws `BrandMark` from `src/brand/mark.ts`) | orphan — deletable |
| `assets/expo.icon/icon.json` + `Assets/expo-symbol 2.svg` + `Assets/grid.png` | 54,289 | **0 code references** (Expo icon-designer source artifact) | orphan — deletable (confirm with Phase F) |
| (remote) `/media/universities/{id}-800.webp` ×9 | — | `app/campus.tsx:160` (expo-image, runtime remote) | port to the university SVG cards in Phase F; **blocks universities deletion** until shipped |
| `shared/brand/mark.svg` | 302 | `build-app-icons.mjs:138` (generated, CI byte-checked) | STAY |

Other mobile imagery is code-drawn (vector `BrandMark`, lucide icons); lecture posters (`[offeringId].tsx:124`) only render absolute `https?://` URLs (the relative seeded `/brand/madarek-mark.svg` poster falls back to a vector seat); social post images are user content (`post.imageUrl`), never repo files.

## 9. Non-file imagery (completeness — nothing to delete)

Inline SVG components (no files): `HeroInkWindow`/`ElevationDrawing` (hero art), `PainArt` (problems band), `LearningPlanDrawing`/`journey/*` (map band), `StatementArt`, `Illustration` + `components/illustrations/pieces/*` (15 empty/error states), `brand/Logo.tsx`+`mark.ts`+`lockups.ts`+`wordmark.generated.ts`, footer `MARK_PATHS`. `VideoCard` = youtube-nocookie click-to-load facade (no poster file). Book covers are typographic (r186). Email templates (`backend/src/lib/mail.ts`) ship zero images by design. `public/lectures/*.mp4` and `/api/v1/media/*` are video routes, out of scope.

## 10. Deletability verification (per C1 step 4 — every hit listed, zero unaccounted)

Method: `git grep -n "<basename>"` repo-wide excluding the asset's own directory (docs/archive prose hits collapsed to "docs"). Dynamic references resolved by reading every consumer.

| deletable (after replacement) | every repo hit outside the asset dir | unaccounted |
|---|---|---|
| `renders/hero-ink-1100.webp` | Footer.tsx:377,400,424 · ink-render.mjs:752 · docs (ASSET-CONTRACT §5) | 0 |
| `renders/hero-ink-2200.webp` | ink-render.mjs:751 | 0 |
| `renders/crop-{garyounis-1,omu-agri,fateh-science,garyounis-classic}-640.webp` | Statement.tsx:279,295 (dynamic) · ink-render.mjs:756–783 (source rows + stale `-960` outputs) · renders/README.md | 0 |
| `universities/*` (all 29) | university-media.ts (registry+srcset:55) · MediaFrame.tsx:54 · CampusPages.tsx:87–100 · Statement.tsx:102 · **apps/mobile/app/campus.tsx:160 (−800 ×9, runtime remote)** · manifest.json photos[] · build-media-derivatives.mjs · ink-render.mjs:746–783 (5 source reads) · r307-landing-media.test.tsx:83 · r306-landing-sheet.test.ts:217 · docs | 0 (mobile hit is the deletion blocker) |
| `product/*` (all 16) | Roles.tsx:111,152 · WhyScene.tsx:156–161 · ProductFrame.tsx:58,188 · university-media.ts (PRODUCT_CAPTURES/2X) · manifest.json products[] · build-media-derivatives.mjs:106–118 · r307-landing-media.test.tsx:92 · docs (r333 media-capture) | 0 |
| `app/qr-app-page.svg` | AppDownloadPage.tsx:182 · docs (r333 qa note) | 0 |
| `textures/grain-tile-{light,dark}.webp`, `micro-grid.svg` | chrome.css:121–132 · patterns.css:692–703 · sheet-frame.css:53–57 · make-grain.mjs · grain-measure.json · docs (worklog) | 0 |
| `src/assets/product/exam-active.webp` | Product.tsx:28 | 0 |
| `src/assets/product/ai-tutor.webp` | Product.tsx:29 | 0 |
| `src/assets/product/lecture-checkpoint.webp` | WhyScene.tsx:32 | 0 |
| `src/assets/product/{student-dashboard,owner-dashboard,teacher-grading}.webp` | **none** (teacher-grading hits are an unrelated e2e filename) | 0 — deletable immediately |
| `apps/mobile/assets/brand/mark.svg` | none | 0 — deletable immediately |
| `apps/mobile/assets/expo.icon/**` | none (package-lock "expo-symbols" hits are a different dep) | 0 — deletable immediately |
| `brand/madarek-og.jpg` | index.html:47,55 · assets.test.ts:192–198 (**pin**) · scripts/r323/brand-assets.mjs:235 · CHANGELOG/docs | 0 — but **NOT freely deletable**: pinned test + absolute og URLs → replace bytes in place |

Companion cleanups when the deletions land (owners: Phase C/D, not C1): `manifest.json` photos/products/renders blocks, `scripts/media/build-media-derivatives.mjs`, `scripts/r314/ink-render.mjs` + `make-grain.mjs` + `grain-measure.json`, `renders/README.md`, tests `r307-landing-media.test.tsx` / `r306-landing-sheet.test.ts` (manifest parity pins — assertion edits are orchestrator-owned per the R343 preamble), and the stale comment `university-media.ts:9` (`scripts/media/verify-media-registry.mjs` does not exist).

## 11. Replacement system summary (R343 Phase C mapping)

1. **Universities 29 → SVG typographic cards** (PLAN.md W4+ "29 university SVG cards") — one authored card per currently-shipped derivative seat; consumers address by `id-width` exactly as today; ports to `apps/mobile/app/campus.tsx` in Phase F.
2. **Product 16+6 → Playwright product plates** rendered from the real components at the same ladder widths (720/1280 + 2× 1440/2880 seats), reusing the R308/R333 seeded-capture method — never fabricated UI (ASSET-CONTRACT §3.6 law).
3. **renders 6 → r342 reuse**: footer strip + mark seat → `footer-skyline-*`; intro media cell photo (`uob-garden-1600`) → `statement-courtyard-*`; crawl strip → typographic cards (fixes the `crop-uob-garden` 404); hero V2 renders dead.
4. **r342 42 → STAY** and wire the 18 unwired compositions per the contract's seat table.
5. **Textures 3 → CSS/SVG-native grain** re-wired in the 3 consuming sheets (both theme arms).
6. **OG → regenerate in place** at `public/brand/madarek-og.jpg` (1200×630, jpg; path pinned).
7. **app/qr → regenerated identity QR**; **mobile PNGs → unchanged** (existing `build-app-icons.mjs` pipeline); delete the 5 orphan files any time.

## 12. Defects & risks found (all recorded; the ≤2 headline ones go in the agent report)

- **404**: Statement crawl cell 1 loads `crop-uob-garden-640.webp` which never existed (Statement.tsx:279/295 vs disk) — fixed by the card replacement.
- **Drift**: ink-render.mjs emits `-960` crops; shipped/consumed are `-640` — the "deterministic, byte-identical" claim in renders/README is stale.
- **Pins**: `assets.test.ts:196` (madarek-og.jpg), `r307-landing-media.test.tsx:83,92` + `r306-landing-sheet.test.ts:217` (manifest↔disk parity), sw.js precache (`r327:68,69`) — replacement PRs must update manifest + seek orchestrator sign-off for the test assertion edits (sub-agents never move goalposts).
- **Blocker**: mobile `campus.tsx` remote `-800` consumption gates `universities/` deletion until the Phase F port ships.
