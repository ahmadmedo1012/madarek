# Madarek Design System — the Heron canon (R306)

> **مدارك** — منصّة تعليم ذكي مستقلّة عربية-أولًا · the design canon as it ships in code.
>
> **The single active authority.** One visual system across the whole product — the public
> landing sheet, the authenticated shell, and every role page family. The reference grammar
> (heronaiapp.com) was reverse-engineered LIVE — every value measured from the DOM and the
> shipped CSS bundle — and adapted for an Arabic-first, RTL, two-theme educational platform.
> Full measured evidence: [`docs/redesign/r305-heron-reference-spec.md`](docs/redesign/r305-heron-reference-spec.md) ·
> the R306 exclusivity decisions + rebuild plan: [`docs/redesign/r306-heron-exclusivity-spec.md`](docs/redesign/r306-heron-exclusivity-spec.md).
> Historical eras (Orbit Ink, Superlist/OPTIKKA, ultramarine, the editorial poster) are
> ARCHIVED in [`docs/archive/DESIGN-history.md`](docs/archive/DESIGN-history.md) — never
> instructions.

---

## 0. R313 — Heron parity canon (owner override)

**The authority statement.** In round R313 the owner ordered **full visual and
behavioural identity with heronaiapp.com**. That order supersedes every prior
adaptation decision — the r306 «adapted, not copied» stance, the r308 §G/§H
non-adoptions, and any earlier canon text that contradicts the parity system below.
It does **not** supersede the hard contracts: accessibility, honest copy, CSP, the
funnel pins, and the no-proprietary-assets rule stand exactly as before. Measured
basis: `audits/evidence/r313/` (live Heron census + production baseline; 3 match /
55 mismatch at base). The complete per-item ledger with commits and evidence:
[`docs/redesign/r313/OVERRIDE-LEDGER.md`](docs/redesign/r313/OVERRIDE-LEDGER.md).

**The override ledger** (old → new, one line per item):

- **D1** paper `#F6F8FA` → `#F6F6EE` (re-pinned at every seat: tokens, metas, boot
  plate, theme.ts, tests, parity gate).
- **D2** radius ladder 2–20px + pill → **0** (`--r-full` kept for circles/dots).
- **D3** elevation shadows (elev-1..5) → **none** (focus rings + forced-colors
  fallbacks kept; zero exceptions).
- **D4** button grammar (oklab brighten + lift + glow) → **fill-wipe + dual-label
  roll** (white-on-accent is a documented AA exception: Arabic labels ride weight
  ≥600); inputs 1px `#B3B3AF` → focus `#ED4C1F` → filled `#FA3600`.
- **D5** fixed px type ladder (root 16px) → **fluid rem root** (`html
  0.5787037037vw` + ≤991/≤767 bands; the 13px Arabic floor kept as a minimum) +
  the **Geist Mono** voice (self-hosted OFL).
- **D6** native scroll → **Lenis 1.1.5, guest pages only** (lerp 0.1,
  conductor-driven, scrollbar hidden while live, `.content` stays native; RM never
  inits).
- **D7** landing 12 sections → **9 Heron sections** (the map/journey pin ≈51% of
  the page; the documentary media band + capability ledger moved to `/campus` +
  `/capabilities`).
- **D8** header 57px sticky no-hide → **56px fixed at the 7px inset** with the
  measured `on-scroll`/`on-hide` states + MENU button <992px.
- **D9** partial sheet-frame marks → the **full fixed page frame** (1px `#B3B3AF`
  at the 7px inset, plus marks + rulers; scales 6/7 by viewport).
- **D10** loader session-gated with a cut-short exit → **asset-gated curve + 10
  log lines + a real 835ms two-band exit, on every full load**.
- **D11** route transition 721ms sweep + 500ms reveal → **1.6s four-edge inset
  wipe**.
- **D12** cursor — already at parity since R310/R311; kept (only the paper fallback
  re-pinned).
- **D13** scrub/plateau choreography re-based onto the new 9-section set.
- **D14** footer → **3 columns + inspection lens** (r 99.09 / pulse 104.04).
- **D15** cookie banner — **intentionally omitted** (Madarek sets no tracking
  cookies; a consent banner would be dishonest copy — see
  [`docs/redesign/r313/NOTES-D15.md`](docs/redesign/r313/NOTES-D15.md)).
- **D16** all authenticated app surfaces re-skinned to the Heron grammar (square
  chips/controls, hairline row rules `#E0E0DA`, structural seams `#B3B3AF`, flat
  tiles, mono headers).
- **D17** dark theme re-derived from the new canon (the shadow-removal policy is
  theme-wide; dark depth = surface step + hairline).

**The permanent exceptions** (owner-ratified — never «fixed» for parity):

1. **BT Grotesk is proprietary** — Alexandria + IBM Plex Sans Arabic stay (OFL,
   Arabic-correct); Geist Mono (OFL) is adopted.
2. **Arabic glyph metrics** — there is no uppercase; hierarchy transfers through
   weight + size, never letter-spacing (joins).
3. **Honest-copy rules unchanged** — «جامعة مدارك التجريبية» disclosure, banned
   marketing wording, real numbers only.
4. **Funnel pins unchanged** — 5 register CTAs + 5 login affordances + the pinned
   section ids (`statement/chapters/live/roles/colleges/vision`), exactly as r306
   froze them.

## 1. The system in one paragraph

An architect's drawing sheet: warm-neutral **paper** grounds, graphite **ink**, fine
**hairlines** and ruled matrices, near-square corners, a drafting voice of **mono
bracketed indices** (`[01]`, coordinates, metadata rows), generous but controlled negative
space, and exactly ONE **orange signal** — spent with restraint on the active interaction,
the key annotation, and the primary CTA. Charcoal slabs carry the primary actions (the
reference's own recipe); dark theme is the charcoal itself as ground — a coherent
complementary system, not an inversion. Original flat SVG line work for illustration;
no 3D canvases, no poster displays, no competing art direction anywhere.

## 2. Color — the token contract (tokens.css)

| Token | Light | Dark | Register |
|---|---|---|---|
| `--bg` | blueprint paper `#F6F8FA` | charcoal `#282828` | the grounds |
| `--surface` | `#FFFFFF` | `#2E2E2E` | 1.06/1.09 elevation step |
| `--text` | graphite `#282828` (13.85 AAA) | paper `#F6F8FA` | primary ink |
| `--text-secondary` / `--text-muted` / `--text-faint` | `#414140` / `#626260` / `#72726F` | `#C9C9C5` / `#B4B4B0` / `#A2A29D` | the ink ramp (9.6 → 4.5) |
| `--accent` | `#FA3600` (3.53 — UI/large only) | `#FF5A1F` | the signal fill |
| `--accent-ink` | `#C72E00` (**5.16 AA text**) | `#FF5A1F` | signal TEXT (links, numerals, emphasis) |
| `--accent-soft` / `--accent-strong` | `#FCE3D9` / `#A32400` | `#432015` / `#FFC5AE` | tint wells / deep ink |
| `--accent-fg` (labels ON the fill) | `--warm-ink #191918` (4.69 — white 3.76 banned) | `--warm-ink` | the fill-label law |
| `--primary` / `--primary-fg` | charcoal slab `#282828` + white (14.74) | white slab + warm-ink | PRIMARY CTAs (the reference recipe) |
| `--border` / `--rule` / `--grid-line` | `#E0E0DA` / `#C8C8C8` / `#B3B3AF` | `#4A4A48` / `#4A4A48` / `#5C5C5A` | the hairline tiers (`--grid-line` decorative on light) |
| `--gold` / `--gold-ink` / `--gold-soft` | `#B57438` / `#8F5A28` / yellow-bg | `#E0A067` / `#F2B782` | **achievements/status gold ONLY** — never a second accent |
| `--state-focus-ring-color` | `#C72E00` (≥3:1 every adjacent surface) | `#FF6B33` | the ONE focus ring (base.css) |

Status families `--c-{mint,yellow,rose,sky,lavender,copper/coral,grey,…}-{bg,ink,deep}`:
computed triads, deep-vs-bg ≥4.5 both themes; danger rhymes with the coral `#F15534`.
`--c-copper-*` is the documented **ember/orange compatibility seat** (it carries the accent
values under a legacy name — brand consumers prefer the `--accent-*` semantic aliases;
**gold semantics use the gold role**, never the copper seat). Role accents (student → owner)
all ≥3.0 vs `--bg`. Charts: series 1 = the signal; square markers; gold = achievement series.

**Forbidden:** retired spellings are FORBIDDEN needles in the parity gate (ultramarine,
teal, warm-paper, the retired night ramp, **`--poster-*`** — the r306 retirement).

## 3. Typography

Self-hosted OFL trio (fonts.css — the reference's proprietary BT Grotesk is NOT reused;
Geist Mono adds no gain over Plex Mono):

| Voice | Face | Use |
|---|---|---|
| Display | **Alexandria** 600/700 | headlines, page titles, the sheet's Arabic display |
| Body | **IBM Plex Sans Arabic** 400–700 | everything readable, incl. Latin runs |
| Technical | **IBM Plex Mono** 400/500 | the drafting voice: `[NN]` indices, coordinates, numerals, Latin micro-labels (`dir="ltr"`, tabular) |

Ladder (`--fs-*`): `xxs/xs/sm 13` · `chrome 14` · `body 16` · `body-lg 18` · `h3 18` ·
`h2 24` · `h1 30` · `display-md clamp(24,3.2vw,38)` · `display-lg clamp(32,5vw,48)` ·
`display-xl clamp(40,6.5vw,64)`. **Arabic floor 13px** (nothing smaller in reading copy —
SVG micro-labels drop in narrow flows rather than shrink). **Zero letter-spacing** on
Arabic (joins; the reference's −0.02em is Latin-only and stays banned). Western digits
(`ar-LY latn`) via `utils/numbers.ts`. UPPERCASE has no Arabic equivalent — hierarchy
transfers through Alexandria weights + the size ladder.

## 4. Motion — the measured register

`--t-micro 80 · --t-fast 200 · --t-base 400 · --t-slow 500 · --t-slower 650 (720 cinema)
on --ease cubic-bezier(.23,1,.32,1)` (the reference's own census: 0.4s ×174) and the roll/
exit curve `--ease-in (.625,.05,0,1)`. Semantic page 400 / reveal 480/520. **Block-level
reveals only** (RevealCssClass / the shared IO belt — per-line splits break Arabic shaping)
with ONE r308 amendment: **word-boundary reveals** (`WordReveal`) split on spaces only —
joining is intra-word in Arabic, so per-WORD masks are shaping-safe where per-LINE masks
are not (the pinned split-integrity contract lives in `tests/unit/r308-interaction.test.ts`).
Imperative scroll chrome writes CSS vars/`classList` on rAF — zero React re-renders per
tick. `prefers-reduced-motion` collapses every duration to 0 (motion.css + base.css belts)
and the content stands complete static. No scrolljacking.
**R308 amendment — the interaction layer** (`docs/redesign/r308/parity-matrix.md`): the
landing sheet carries the reference's connected instrument system — the once-per-session
entrance loader (honest progress, session-gated, skipped under RM), the canvas pointer
instrument (9px signal square, velocity trail, press reticle — fine pointers only, never
under RM), the hero's local inspection instrument (guides + scene-relative readout +
drag-to-inspect with viewBox-remapped stations), the pinned walkthrough (CSS sticky —
still no JS pinning), the ink-mask drawing→photo reveal, the capabilities ticker, the
footer inspection lens, and the landing-exit sweep. All of it rides ONE shared clock
(`lib/motion/sheetConductor.ts`) that unsubscribes when idle — an idle page holds zero
awake frames — and every continuous instrument is a whitelisted `@keyframes` that the
RM belt collapses (`tests/unit/r306-landing-sheet.test.ts` pins the whitelist). The
authenticated app keeps the native cursor and no transitions on task routes.

## 5. The landing sheet — «لوحة مدارك» (r306 → r307)

`LandingPage.tsx` + `landing.css` compose the drawing sheet: the fixed corner registration
marks (desktop, decorative) → the 56px hairline header (nav cells wash to charcoal on
hover) → the hero (the original **SVG blueprint** of the learning system with five
keyboard-operable hotspots + a polite live-region panel, beside the copy column; below
them the **documentary media band** — three Commons-licensed university photographs,
baseline-aligned — then the title-block metadata grid) → the statement → **الحياة
الجامعية** (the documentary rail: a full-width panorama band + an asymmetric mosaic,
every frame carrying institution + author + licence deed) → the six capability **ledger
rows** (flat honest interface fragments — hairline frames, no elevation, no browser
chrome) → **المنصّة فعليًا** (real captures from the running platform, demo data
disclosed on every frame) → **مشاهد جامعية** (official-channel documentaries behind
click-to-load facades — zero third-party bytes until intent) → the capability matrix
(a ruled hairline table) → the interactive **role selector** (aria-pressed chips over
the five roles' REAL dashboards, a polite live-region panel) → the interactive college
registry → the honest status pairs → the coordinates-row CTA → the hairline colophon
footer. The funnel (5 register CTAs / 5 login affordances — exact counts, pinned), the
honest numbers, the integrity strings, and the a11y contracts are pinned by
`landing-funnel` / `r306-landing-sheet` / `landing-scrollspy-grain` / `guest-landing.e2e`
/ the r188-brand gates.

## 6. Components & patterns

Buttons: `.btn.primary` charcoal slab (the default primary — the auth submit joined it in
r307), `.btn.accent` the signal
fill with `--warm-ink` labels, ghosts hairline; 44px landing floor; loading states never
double-submit. Inputs/tables/dialogs/overlays: the shared primitives
(`components/primitives/`) + `patterns.css` (`PageFrame · PageHeader · RowList ·
SplitView · FilterBar…` — the normative signatures in `components/patterns/CONTRACT.md`).
Empty/loading/error states use the **mk-ill illustration kit** (original two-tone SVG,
gold in achievement pieces only). Data tables rule with hairlines, sticky headers where
needed, scoped horizontal scroll on phones. `--gold` = achievements ONLY.

### 6a. MediaFrame — the documentary photo seat (r307)

`components/landing/MediaFrame.tsx` + `.mf-*` in `landing.css`: a flat hairline frame
(radius 0→2, zero elevation) around a Commons-licensed university photograph. The
caption bar carries the Arabic institution + name, the mono credit row (author ·
licence deed link). Engineering: explicit intrinsic dimensions (CLS 0 by construction),
responsive srcset from the manifest derivative widths, deliberate `object-position`
per photo, lazy by default — the hero lead is the ONE eager seat (fetchpriority high).
Provenance: `frontend/public/media/manifest.json` (machine-readable rights + verification
per asset); the display registry mirrors it in `src/data/university-media.ts`; the
derivative pipeline: `scripts/media/build-media-derivatives.mjs` (ffmpeg + libwebp,
zero repo dependencies).

### 6b. VideoCard — the official-channel documentary seat (r307)

`components/landing/VideoCard.tsx` + `.vc-*`: a designed 16:9 facade (drafting marks,
pure CSS — no thumbnails, no third-party bytes) that mounts the youtube-nocookie iframe
ONLY after an explicit click; Escape/close returns focus to the trigger. The kind label
(«فيديو توثيقي من القناة الرسمية للجامعة») tells the truth: a university documentary is
never presented as a product demo. CSP: `frame-src` admits exactly the two embed hosts
(`backend/src/app.ts`); `img-src` stays self-only (no i.ytimg.com hotlinks).

### 6c. ProductFrame — the real-capture seat (r307)

`components/landing/ProductFrame.tsx` + `.prf-*`: a flat frame around an authentic
capture of the running application (seeded demo environment — fully synthetic «جامعة
مدارك التجريبية» data). Every frame carries the mono `real-ui` tag + the demo-data
disclosure; the CTA scrolls to the conversion row (never an extra funnel link — the
5+5 counts stay exact). Captures are re-derivable from the committed
`.r308-capture-archive/` via the pipeline script — never re-fabricated.
**R308 re-capture** (§1.1 defect A): every capture was re-taken with the onboarding
completed through its real supported flow before the shot (method recorded per asset in
`manifest.json` `source.method`) — no welcome modal, no blur, ever.

**Verified facts ledger** (doc-accuracy pins, r177):

- CI census — **9 jobs: lint · typecheck · build · frontend tests · backend tests · db-integration · e2e · design gates** (+ the surface-drift job rides the same pipeline's tail).
- Spinner — 22px · 2px · top arc neutral-900 (light) / accent (dark) · 700ms linear.
- The overrides layer ships as the **Polish Bundle (consolidated v6 → v21)** (`polish.css`).

## 7. RTL & accessibility

Logical properties everywhere (`inline-start/end`, `margin-inline`…); direction-aware
icons flip only when semantics demand (`ArrowLeft` = forward in RTL). `dir="ltr"`
isolation for URLs/emails/IDs/coordinates/commands. WCAG-aligned contrast per the token
ledger above; ONE focus language (base.css universal outline consuming
`--state-focus-ring-color` — no private focus rules in page sheets); 44px touch targets;
semantic landmarks; live regions for async state; the reduced-motion belt. The full a11y
contract is enforced by `r170*`/`r305a7-a11y` test belts + axe in dev.

## 8. Rules for evolving the system

1. **No raw values** — colors/motion/spacing/radii ride `tokens.css`/`motion.css` (CI
   gates: `check-colors` / `check-motion-tokens` / `check-raw-css` — strict).
2. **No new namespaces** — a `--poster-*`-style divergence layer is exactly the failure
   mode R306 removed; extend the canonical tokens instead (the parity gate's FORBIDDEN
   list guards the retired spellings).
3. **Icons**: Lucide via `Icon.tsx` only.
4. **`frontend/index.html` inline script changes** → refresh the CSP pin
   (`scripts/check-csp-hash.sh` + `backend/src/app.ts`).
5. **Token contract changes** → re-pin `verify-parity-export.mjs` in the SAME change.
6. **The illustration voice**: original flat SVG line work on the token system — no
   3D dependencies, no reference assets. **r307 amendment:** exactly three sanctioned
   raster seats exist (the §6a documentary photo, the §6b facade poster composed in CSS,
   the §6c real product capture) — every one of them flat, hairline-framed, honestly
   labelled, and rights-verified in the media manifest. Generic stock imagery, unlicensed
   rehosts, and decorative raster remain banned.
7. Honest copy is permanent («جامعة مدارك التجريبية» synthetic-data disclosure, banned
   marketing wording — r168b/r177/r188 gates).

## 9. Architecture (as it ships)

`main.tsx` cascade: `fonts → tokens → motion → base → components → layout → patterns →
auth → notifications → student → polish` (landing.css rides the LandingPage chunk;
pdf/owner/training/colleges ride their lazy consumers). One token source (tokens.css) +
the synchronized export (unified-parity.css, verified by the parity gate). The patterns
contract owns the page grammar; polish.css remains the overrides layer for the shared
library. No unlayered bolt-on sheets.

## 10. Gates & history

CI design gates: `check-icons` · `check-motion-tokens` · `check-csp-hash` ·
`verify-parity-export` · `check-colors --strict` · `check-raw-css --strict` (+ its
self-test) · `check-bundle-size`. Era history: `docs/archive/DESIGN-history.md` (frozen
R305 copy), `CHANGELOG.md`, the release reports in `docs/releases/`.


---

## R314 «الحقيقة البصرية» — قانون التجاوزات (cycle 1)

أمر المالك يعلو: التطابق البصري مع المرجع (الشكل/الإحساس/التركيب/الحركة)
يتجاوز قواعد r306/r308/r313 أدناه في هذه المقاعد فقط:

1. **البطل**: مقعد raster واحد (رسم حبري مشتق من صورة مرخّصة —
   `manifest.json → renders[]`، ShareAlike محفوظ). مسار إعادة الإنتاج:
   `scripts/r314/ink-render.mjs`.
2. **لافتة الموافقة**: مبنية (عكس تعطيل r313) — بوابة تخزين محلي
   صادقة، `window.MadarekConsent`.
3. **min-block-size للأقسام**: مُقاعد على ≤760px (الأقسام محتوى-القياس
   كالمرجع).
4. **STAGES/bp-panel**: أُقعدا مع الرسم الخطّي؛ النسخة الصادقة في
   محطات `HeroInspect`.
5. **اختبارات r306/assets/funnel**: أُعيد تثبيتها بملاحظات
   `R314 override` في نفس الـ commits (45f8c32…ae70a16).

القضاة (`scripts/r314/*` + `audits/evidence/r314/`) هم وحدهم من يغلق
الصفوف — لا إغلاق ذاتيًا. النتيجة الجارية: `PARITY.md`.
