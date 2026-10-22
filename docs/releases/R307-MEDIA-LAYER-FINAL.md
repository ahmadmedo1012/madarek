# R307 — The Documentary Media Layer · FINAL RELEASE REPORT

**«لوحة مدارك» تكتسب طبقتها التوثيقية — الجامعات الليبية الحقيقية، ولقطات المنصّة نفسها، وفيديوهات القنوات الرسمية.**

---

## A. Git and release identity

| Item | Value |
|---|---|
| Verified baseline `main` at mission start | `ec4621fcb3c5…` (production buildId `ec4621fcb3c5` — byte-identical landing captures, light+dark, 1440×900) |
| **Final released `main`** | **`361fada4e4bb…`** (production health buildId `361fada4e4bb` — verified live) |
| Commits (direct to `main`) | 5: `6b407161` media layer → `39b4839b` landing rebuild → `1a49dcfc` app polish → `c4c5da33` gates/docs → `361fada4` student-seat fix |
| Pull requests created | **0** (main-only delivery; no PR was used as a workaround) |
| Permanent feature branches created | **0** (no local or remote branch was created at any point) |
| Push result | `ec4621fc..c4c5da33` then `c4c5da33..361fada4` → `origin/main` — no force, no history rewrite |
| CI on the final tree | **9/9 jobs success** (Lint · Typecheck · Build · Test-frontend · Test-backend · DB-integration · E2E · Design-gates · Surface-drift) — the 6 required status checks green |
| Production deployment | Render autoDeploy verified; `dbLatencyMs 65`; smoke `3 pass / 0 fail / 2 skip` (the login + second-institution probes are env-gated by design) |
| Production cold start | One transient 503 interstitial observed during baseline (free-tier spin-down) — recovers on request; noted honestly, not a code defect |

## B. Design and UX

- **The hero** gained its documentary media band: three Commons-licensed university photographs, baseline-aligned like a skyline under the copy/blueprint row (desktop two-column; mobile re-composed — never a naive scale-down). The lead is the single eager seat (fetchpriority high); everything else lazy.
- **New scene sequence** (all in the existing Heron canon — no second visual system, no new namespace): `[01]` hero → `[02]` البيان → `[03]` **الحياة الجامعية** (panorama band + asymmetric mosaic) → `[04]` الفصول (unchanged ledger, renumbered) → `[05]` **المنصّة فعليًا** (real captures) → `[06]` **مشاهد جامعية** (facades) → `[07]` ما يعمل اليوم → `[08]` **الأدوار** (interactive selector over the five REAL dashboards) → `[09]` الكليات → `[10]` إلى أين → CTA + footer.
- **Navigation/motion repairs** (audit 1-C, all browser-verified): window scroll reset on PUSH for public routes; `--p`/`.scrolled` reconciled on load/resize/fonts-ready (tested against late-media reflow); rAF cancel by id; mobile-menu outside-tap close; landing-owned `scroll-margin` (lands at exactly 72px); `useReveal` `once:false` no longer pins entries in-view (the scroll-linked-scene trap).
- **Typography**: every display headline joined the canon floor `--type-display-line-height` (1.28) — audit 1-B #1 (the stale 1.05/1.15 values are gone).
- **Authenticated app**: expandable book details (availability math, category, rating, the 14-day borrow term — the backend's own rule), today-list urgency triage (future-opening exams read `soon`), the research-search floor is announced instead of silently listing the archive, and the auth submit joined the button canon (charcoal primary slab).

## C. Media

| Metric | Value |
|---|---|
| Photographs integrated | **9** — across **3 identifiable universities**: جامعة بنغازي (6), جامعة طرابلس (2), جامعة عمر المختار (1) |
| Videos | **2** — official channels: **جامعة مصراتة** (أجواء الاختبارات، 5:11) + **جامعة سبها** (حفل الخريجين الدفعة 40، 3:13 — double evidence: embedded on the university's own /video-gallery/) |
| Distinct institutions on the page | **5** (photos + videos) — hero meta carries the computed count |
| Licence validation | Every asset re-verified by the principal from the Commons API (`imageinfo.extmetadata`): PD ×3, CC BY-SA 4.0 ×4, CC BY 2.0 ×1, PD videos via official-channel embeds; per-image attribution (author + institution) rendered in the caption, full provenance in the manifest |
| Rejected honestly | `uob-trees` (3/10 art-direction score, litter + 432KB tier); «جامعة بنغازي الأهلية» (private — public-university-only story); Taipei-UOT files (wrong country, caught by the search agent); all site galleries (all-rights-reserved → link-only, never rehosted) |
| Manifest | `frontend/public/media/manifest.json` — 9 photos + 8 products + 2 videos, each with source page, licence + deed URL, attribution, dimensions, verification command |
| Where media renders | hero band (3) · campus-life rail (6: panorama + mosaic) · product grid (4) · role selector (1 live swap) · video facades (2) |
| Asset-size strategy | WebP derivatives (480/800/1000/1200/1600 by seat), ~2.5MB on disk, **~500KB transferred** at 1440/DPR1 — every image has explicit intrinsic dimensions (CLS 0 by construction) |
| Pipeline | `scripts/media/build-media-derivatives.mjs` (ffmpeg + libwebp, **zero new dependencies**) + the committed `.r307-capture-archive/` (re-derivable, never re-fabricated) |

## D. Test evidence

| Group | Result |
|---|---|
| Lint | **PASS** — 0 errors, 15 documented warnings (exhaustive-deps) |
| Typecheck (src + tests, both workspaces) | **PASS ×4** + `validate:colleges` |
| Production build (both workspaces) | **PASS** — bundle gate **applied 700KB gz** (measured 668.8; the r306-planned tighten, r307 applied) |
| Frontend unit | **2460 passed** (212 files + the new r307 suite: 10 specs) |
| Backend unit | **1783 passed** (76 files) |
| DB integration (CI) | **PASS** (disposable Postgres) |
| E2E (hermetic) | **57 passed** |
| r305 QA belt | **73 passed** |
| Design gates | **7/7** (icons · motion · CSP-hash · parity · colors-strict · raw-css-strict + self-test) |
| Surface drift | **clean across 72 captures** — baseline re-captured fresh on this tree (one Chromium crash mid-sweep retried successfully; the final sweep passed) |
| '/' metrics | CLS **0**, FCP **188–244ms** — budget 2,000,000B (documented raise, ≤2MB charter), measured ≈1.3MB |
| Pre-existing failures | **None** — the baseline at `ec4621fc` was all-green before any change (2450+1783+57+73); every failure found during the mission was fixed at its root (including one found live in production: the student role panel's missing capture) |

## E. Visual evidence (committed to the release folder + captured live)

Production (live-verified, `361fada4e4bb`): desktop homepage light + dark (full), mobile 390 light + dark, register step-2 flow, the video iframe mounting on click. Local seeded (parity-proven — the pre-change tree was byte-identical to production): student dashboard, library (+ the expanded detail row), lecture player **with the checkpoint card live**, matrix, the five role dashboards, mobile menu, footer. VLM reviews: the pre-change sheet was judged «a dry technical document, too skeletal»; the per-section post-change review judged the hero «strong and professional», the rail «good use of scale», the product grid «excellent, presentation feel», the video cards «very clean, no defects».

## F. Repository cleanup

| Item | Result |
|---|---|
| Remote branches before cleanup | **1** (`main` only — the R305/R306 missions had already converged the repository; nothing to delete, nothing invented) |
| Remote branches deleted | 0 (none needed — verified by `git ls-remote --heads` against the API, not the UI) |
| Final remote inventory | **`refs/heads/main` is the sole remote branch** — acceptance condition met |
| Archive | `/home/z/madarek-archive/r307-20261021-234018/` — bundle (26 refs, `git bundle verify` → *okay*), branch inventory, main SHA, tags list (20 `archive/*` tags preserve all retired-branch history) — kept **outside** the repository, no secrets in it |
| Branch-protection blockers | **None** — `enforce_admins` disabled (admins may push directly; the 6 required checks were nonetheless run and are green on the final tree) |

## G. Honest limitations (known, not hidden)

1. **Library categories** stay the five curated pills — the `Book` model carries no category taxonomy (no Arabic label source); a facet endpoint is the right fix (deferred as a product-data gap, documented — no cosmetic workaround shipped).
2. The **book detail** shows honest metadata only (the model has no description field) — nothing was invented to fill the seat.
3. **Production free-tier cold starts** (transient 503 interstitial after idle) — an infrastructure characteristic, observed and reported, not a code defect.
4. Audit findings **deliberately deferred** (documented in the audit reports, not silently dropped): spinner consolidation (4 implementations), the z-index token migration on landing chrome, `--hr-ember` re-seating, exams-page PageFrame unification, the dead `shared-design-system.css` deletion.
5. Commons has **zero freely-licensed photos** for Sebha/Misrata/Zawiya campuses — those universities appear via their official channels' videos instead (labeled exactly as what they are); no generic stock was substituted to hit a number.
