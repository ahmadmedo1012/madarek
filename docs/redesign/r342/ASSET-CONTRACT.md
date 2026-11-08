# R342 ASSET-CONTRACT — the original architectural illustration package

Owner: **R342-01** (Visual Art Director / Asset Pipeline Engineer) — exclusive owner of
`frontend/public/media/illustrations/r342/**` and this file. No other agent may edit
these paths; consumption is via the public URLs below.

Status: **PUBLISHED — consume freely.** Filenames are stable; any future replacement is
announced in §10 (change log) with the new commit SHA.

Base: `origin/main` @ `620a31e`. Branch: `wip/r342-assets`.

---

## 0. One-line summary

19 original architectural ink illustrations (light + dark twins, exact token colors,
WebP) covering hero, intro, the four academic problems, the journey map, the
why-cycle, five role vignettes, and the footer skyline — a single commissioned visual
identity for the homepage in the Heron-referenced language (monochrome architectural
line drawing, thin rules, technical marks, one orange accent), drawn as **original
Madarek work** for an **imagined** contemporary Libyan learning environment.

## 1. Art direction (binding for every asset)

- Monochrome architectural ink line drawing: thin uniform pen lines, fine
  cross-hatching, graphite washes, generous negative space.
- Baked paper = the page's own paper. Light theme paper `#F6F6EE`
  (`--neutral-50`/`--bg` light), ink `#282828` (`--neutral-900`), accent `#FA3600`
  (`--accent`). Dark theme paper `#282828`, ink `#F6F6EE`, accent `#FF5A1F`.
  Colors are **pixel-exact token values** (post-processed duotone remap), so an image
  placed on `--bg` shows **no rectangle edge** in either theme.
- Exactly one flat burnt-orange accent element per illustration (never decoration for
  its own sake — it marks the pedagogical subject of the piece).
- Small plain technical marks (ticks, dimension lines, registration crosses) —
  **no digits, no letters, no pseudo-text baked into pixels**. All Arabic copy stays
  real HTML text beside/below the art.
- No people, no logos, no real university depictions, no institutional implications.
- All assets are **original works generated for Madarek (R342)** via the sanctioned
  ZCode image tool + deterministic post-processing; no third-party artwork, fonts,
  or photos are embedded. License: same as the repo (project-internal original work).

## 2. Directory layout & naming law

```text
frontend/public/media/illustrations/r342/
  hero/        hero-campus-{light,dark}[@2x].webp · hero-campus-mobile-{light,dark}.webp
  statement/   statement-courtyard-{light,dark}.webp
  problems/    problem-01-lecture · problem-02-feedback · problem-03-mastery ·
               problem-04-research  (each -{light,dark}.webp)
  journey/     journey-{lecture,assessment,library,mastery}-{light,dark}.webp
               journey-route-{light,dark}.webp
  why/         why-cycle-{light,dark}.webp
  product/     (intentionally empty — see §6; README documents the decision)
  roles/       role-{student,teacher,registrar,quality,owner}-{light,dark}.webp
  footer/      footer-skyline-{light,dark}[@2x].webp
```

- Suffix law: `-light` / `-dark` theme twins, `@2x` where a retina rendition exists.
- Theme pairing: pick by `html[data-theme]` — e.g.
  `hero-campus-light.webp` ↔ `hero-campus-dark.webp`.
- Filenames are **stable once published**. Replacements change bytes, never names
  (renames are announced in §10).

## 3. Asset register (exact paths · dimensions · seats · alt)

Every entry: WebP, aspect as generated, intrinsic size as exported. "Informative"
images need their `alt` on the `<img>`; "decorative" images must be served with
`alt=""` + `aria-hidden` on the frame.

### 3.1 hero/

| file (public path) | px | aspect | seat / intended use | kind | alt (ar) |
|---|---|---|---|---|---|
| `/media/illustrations/r342/hero/hero-campus-light.webp` | 1440×704 | 2.045:1 | full-bleed hero art layer (desktop ≥992) | informative | المنظور الأكسونومتري المقطوع لمجمّع التعلّم في مدارك: قاعة محاضرات مدرّجة، فناء داخلي بشجرة المعرفة، معارض مكتبة على طابقين، وأروقة مقوسة — بمدخلٍ بلون العلامة النحاسي |
| `…/hero-campus-dark.webp` | 1440×704 | 2.045:1 | same, `[data-theme=dark]` | informative | (same as light twin) |
| `…/hero-campus-light@2x.webp` | 2880×1408 | 2.045:1 | retina `srcset` 2x | informative | — |
| `…/hero-campus-dark@2x.webp` | 2880×1408 | 2.045:1 | retina `srcset` 2x dark | informative | — |
| `…/hero-campus-mobile-light.webp` | 768×1440 | 1:1.875 | dedicated mobile hero composition (≤991), NOT a crop of the desktop art | informative | تركيب رأسي مخصّص للجوّال من مجمّع التعلّم: قاعة المحاضرات أعلى، معرض المكتبة في الوسط، وفناء الأروقة بأسفل — رسم حبر معماري أصلي |
| `…/hero-campus-mobile-dark.webp` | 768×1440 | 1:1.875 | same, dark | informative | — |

`srcset` suggestion (desktop seat):
`/…/hero-campus-light.webp 1440w, /…/hero-campus-light@2x.webp 2880w`,
`sizes="100vw"` (mobile swaps to the dedicated portrait file).

### 3.2 statement/  (intro band — replaces the photographic cell, see §5)

| file | px | aspect | seat | kind | alt (ar) |
|---|---|---|---|---|---|
| `/…/statement/statement-courtyard-light.webp` | 1200×1200 | 1:1 | `.st-media` square art cell (all breakpoints; desktop full band height) | informative | المقطع المعماري لقلب الحرم الجامعي: فناء داخلي تُحيط به أروقة مقوسة وفي مركزه شجرة المعرفة — رسم حبر أصلي لمنصّة مدارك |
| `…/statement-courtyard-dark.webp` | 1200×1200 | 1:1 | same, dark | informative | — |

### 3.3 problems/  (the four academic problems — square art zone ~36rem)

Each is a **distinct composition and silhouette** (no shared-source crops):

| file | px | aspect | depicts | kind | alt (ar) |
|---|---|---|---|---|---|
| `/…/problems/problem-01-lecture-light.webp` | 1200×1200 | 1:1 | a lecture without measurable understanding: raked hall, waves dissolving before the back rows | informative | مقطع قاعة محاضرات مدرّجة: موجات الشرح تتلاشى قبل الصفوف الأخيرة — لا قياس للفهم داخل القاعة |
| `…/problem-01-lecture-dark.webp` | 1200×1200 | 1:1 | dark twin | informative | — |
| `…/problems/problem-02-feedback-light.webp` | 1200×1200 | 1:1 | delayed/disconnected feedback: two pavilions, a broken bridge, papers falling in the gap | informative | جناحان بينهما جسر مكسور: أوراق الاختبارات تتساقط في الفجوة — تغذية راجعة متأخرة أو منفصلة |
| `…/problem-02-feedback-dark.webp` | 1200×1200 | 1:1 | dark twin | informative | — |
| `…/problems/problem-03-mastery-light.webp` | 1200×1200 | 1:1 | missing mastery visibility: progress tower with two ghost floors, sightlines passing through | informative | برج التقدّم: طابقان شبحان بخطوط متقطعة تمرّ منها خطوط النظر — إتقان غير مرئي |
| `…/problem-03-mastery-dark.webp` | 1200×1200 | 1:1 | dark twin | informative | — |
| `…/problems/problem-04-research-light.webp` | 1200×1200 | 1:1 | submitted but unindexed research: chute feeding a maze of closed archive drawers | informative | خزانة أرشيف متاهية: رسالة بحثية تُدفن خلف أدراج مغلقة — بحث مُودَع لا يُعثر عليه |
| `…/problem-04-research-dark.webp` | 1200×1200 | 1:1 | dark twin | informative | — |

### 3.4 journey/  (map band support assets — plan grammar, legible at 390px)

| file | px | aspect | depicts | kind | alt (ar) |
|---|---|---|---|---|---|
| `/…/journey/journey-lecture-light.webp` | 1200×1200 | 1:1 | plan view: raked lecture hall (curved desk rows + stage) | informative | مخطط قاعة المحاضرات من الأعلى: صفوف متدرجة ومسرح المناقشة |
| `…/journey-lecture-dark.webp` | 1200×1200 | 1:1 | dark twin | informative | — |
| `…/journey/journey-assessment-light.webp` | 1200×1200 | 1:1 | plan view: exam hall (desk grid + invigilator desk) | informative | مخطط قاعة الاختبار من الأعلى: شبكة مكاتب منتظمة ومكتب الملاحظ |
| `…/journey-assessment-dark.webp` | 1200×1200 | 1:1 | dark twin | informative | — |
| `…/journey/journey-library-light.webp` | 1200×1200 | 1:1 | plan view: library floor (stacks + reading tables) | informative | مخطط طابق المكتبة من الأعلى: صفوف الرفوف وطاولات المطالعة |
| `…/journey-library-dark.webp` | 1200×1200 | 1:1 | dark twin | informative | — |
| `…/journey/journey-mastery-light.webp` | 1200×1200 | 1:1 | plan view: mastery room (circular table + segmented progress wall) | informative | مخطط غرفة الإتقان من الأعلى: طاولة دائرية وجدار تقدّم مقسّم |
| `…/journey-mastery-dark.webp` | 1200×1200 | 1:1 | dark twin | informative | — |
| `…/journey/journey-route-light.webp` | 1600×800 | 2:1 | the relationship/progression: the four rooms as equal cutaway boxes along one corridor spine, dashed RTL route | informative | المسار الأكاديمي من اليمين إلى اليسار: قاعة المحاضرات فالاختبار فالمكتبة فالإتقان على ممرّ واحد |
| `…/journey-route-dark.webp` | 1600×800 | 2:1 | dark twin | informative | — |

### 3.5 why/

| file | px | aspect | depicts | kind | alt (ar) |
|---|---|---|---|---|---|
| `/…/why/why-cycle-light.webp` | 1600×800 | 2:1 | the platform cycle in one piece: observe balcony → gap chart wall → practice corridor → rising progress stair, one dashed RTL route | informative | دورة المنصّة من اليمين إلى اليسار: مرصد التعلّم، جدار الفجوات، ممر التدريب، وسلّم التقدّم الصاعد |
| `…/why-cycle-dark.webp` | 1600×800 | 2:1 | dark twin | informative | — |

### 3.6 product/ — intentionally empty

**Decision: no generated imagery in `product/`.** The platform band's seats are REAL
product captures (`/media/product/*`, `assets/product/lecture-checkpoint/ai-tutor`)
of implemented Madarek features. Substituting fictional interfaces for real
screenshots is prohibited by the R342 brief — the folder carries only the README
recording this decision. Keep the real screenshots.

### 3.7 roles/  (use-case band — SUPPLEMENTARY accents, not screenshot replacements)

The roles deck's 8 slides are genuine seeded-demo dashboard captures — they stay
(§5). These five vignettes are offered as optional supplementary art (e.g. band
intro, empty-state chrome, or the three "honest persona" rows if the section owner
wants a visual there):

| file | px | aspect | depicts | kind | alt (ar) |
|---|---|---|---|---|---|
| `/…/roles/role-student-light.webp` | 1200×1200 | 1:1 | study desk + shelf + ascending steps | decorative (if used as accent) / informative with alt | مقعد الطالب: مكتب دراسة ورف كتب ودرج صاعد — رحلة التعلّم الفردية |
| `…/role-student-dark.webp` | 1200×1200 | 1:1 | dark twin | — | — |
| `…/roles/role-teacher-light.webp` | 1200×1200 | 1:1 | podium + gridded board wall + desk rows | decorative | منصّة الأستاذ: لوح شبكي وصفوف مقاعد — بناء المحاضرات والاختبارات |
| `…/role-teacher-dark.webp` | 1200×1200 | 1:1 | dark twin | — | — |
| `…/roles/role-registrar-light.webp` | 1200×1200 | 1:1 | service counter + archive + open ledger | decorative | شبّاك المسجّل العام: أرشيف وسجلّ مفتوح — الكليات والمقرّرات والصلاحيات |
| `…/role-registrar-dark.webp` | 1200×1200 | 1:1 | dark twin | — | — |
| `…/roles/role-quality-light.webp` | 1200×1200 | 1:1 | gauge wall + checklist panel | decorative | جدار ضمان الجودة: مؤشّر دائري ولائحة التزام — مجالس ومؤشرات |
| `…/role-quality-dark.webp` | 1200×1200 | 1:1 | dark twin | — | — |
| `…/roles/role-owner-light.webp` | 1200×1200 | 1:1 | master plan on a drafting table, shaded rooms | decorative | مخطط المالك على طاولة الرسم: غرف مظلّلة وفرجار — الحاكمية وسجلّ التدقيق |
| `…/role-owner-dark.webp` | 1200×1200 | 1:1 | dark twin | — | — |

### 3.8 footer/

| file | px | aspect | seat | kind | alt (ar) |
|---|---|---|---|---|---|
| `/…/footer/footer-skyline-light.webp` | 1440×384 | 3.75:1 | the strip-image cell (replaces the photo-derived `hero-ink-1100.webp` there) | decorative | أفق حرم جامعي متخيّل بخط رفيع: رواق وقاعة وبرج وأشجار على خط أرض واحد |
| `…/footer-skyline-dark.webp` | 1440×384 | 3.75:1 | dark twin | decorative | — |
| `…/footer-skyline-light@2x.webp` | 2880×768 | 3.75:1 | retina | decorative | — |
| `…/footer-skyline-dark@2x.webp` | 2880×768 | 3.75:1 | retina | decorative | — |

## 4. Integration notes (for section agents)

- **Theme switch**: pick the twin by `html[data-theme="dark"]`; both twins share the
  exact same drawing, so no layout shift on theme flip.
- **Background**: paper is baked to the theme's `--bg` value — place the `<img>` on
  the section's `--bg`/paper surface. No blend modes needed; no rectangle edge.
- **Do not** letterbox these images on cards with a different surface tone; if a card
  uses `--surface-0` (white), either use the image on a `--bg` strip or accept the
  subtle paper shift as a design decision (record it in the section task file).
- **RTL**: route/why compositions read right-to-left already (route arrows point
  RTL). Do not mirror the images with CSS transforms.
- **`sizes`/`srcset`**: use the suggested pairs; `@2x` files are 2880-wide; do NOT
  lazy-load the hero desktop `1440w` (above the fold).
- **Alt text**: the Arabic strings in §3 are the contract; keep them on informative
  images, keep `alt=""` + `aria-hidden="true"` frames for decorative ones.
- **Numerals**: any visible dimension-like marks in the drawings are plain ticks —
  the Western-numeral convention `0123456789` remains an HTML-text concern only.

## 5. Homepage image inventory — replace / retain

Current homepage imagery (verified at base SHA `620a31e`) and the R342 verdict:

| current asset | where used today | verdict | replacement path |
|---|---|---|---|
| inline `ElevationDrawing` SVG (hero window) | hero art layer | **retain-or-upgrade decision belongs to the hero agent**; §3.1 offers the raster alternative in the same language | `hero/hero-campus-*` |
| `/media/universities/uob-garden-1600.webp` (photo) | Statement media cell | **replace** — photographic, generic; the drafted square illustration matches the section's drawing grammar | `statement/statement-courtyard-*` |
| inline `PainArt` SVG pictograms ×4 | problem band (`Live.tsx`) | **upgrade option** — the pictograms are original but schematic; §3.3 gives each pain a full authored scene | `problems/problem-0{1..4}-*` |
| inline `LearningPlanDrawing` SVG | journey/map band | **retain** (original plan grammar); §3.4 offers per-zone vignettes as support where the section agent seats them | `journey/*` |
| inline `WhyScene` product captures + line art | why band | **retain captures**; §3.5 offers the cycle overview piece | `why/why-cycle-*` |
| `/media/product/*` + `assets/product/*.webp` captures | platform band, roles deck | **retain — real product proof** (do NOT replace with generated interfaces) | — |
| `/media/renders/hero-ink-1100.webp` (photo-derived ink render, CC BY-SA adapted) | footer strip cell ×3 refs | **replace** with the fully original skyline strip (removes the last photo-derived raster from the homepage) | `footer/footer-skyline-*` |
| `VideoCard` stills (university media) | video cards | **retain** (documentary media outside homepage-art scope) | — |

The consuming agents perform the actual component wiring; this contract + §5 is the
single source they consume. Nothing outside `r342/**` + this file + the manifest
addition (§7) is touched by R342-01.

## 6. Provenance & tooling

- Generation: ZCode sanctioned image tool (GLM image model), prompted per-asset with
  a shared style contract (§1); every output visually reviewed — malformed
  perspective, pseudo-text, stray marks → regenerate.
- Post-processing: deterministic duotone remap (Python/Pillow/numpy) — paper/ink
  anchored to luminance percentiles, accent re-seated in HSV space, paper-gate pins
  near-paper pixels to exact `--bg`, WebP (Pillow/libwebp) q74–80.
- Reproducibility: prompts + pipeline + sizes live in the agent workspace; the
  committed assets are the source of record (WebP twins per theme). No generated
  pseudo-text is baked into any asset; Arabic labels ride real HTML text.

## 7. Manifest addition (asset-only)

`frontend/public/media/manifest.json` gains a top-level `illustrations` array
(R342 block) mirroring the register above — ids `r342/<name>`, per-asset
`altAr`, `intrinsic`, `themeTwins`, `decorative`, `tool: "glm-image+r342-duotone"`,
`license: "original-work-madarek-r342"`. No existing manifest key changes; no
consumer reads arrays blindly (verified: consumers address stable keys).

## 8. Quality gates the package passed

- Inspected at 390 / 768 / 1440 / 1920 widths in the light and dark themes (evidence
  in the R342-01 task report).
- No baked text/letters/numbers; no people; no real-university identity; exactly one
  accent element per piece; one shared style across all 19 compositions.
- Weights: hero 1440 ≈ 159 KB (dark twin ≈ same), @2x ≈ 317 KB; 1200-squares ≈
  80–150 KB; strips ≈ 100–200 KB. No uncompressed sources in `r342/**`.
- The R314 renders, manifest policy, and all Commons attributions remain untouched.

## 9. First-usable commit (for the other nine agents)

The earliest commit on `wip/r342-assets` containing `ASSET-CONTRACT.md` + the hero
pair (`hero-campus-*` 1440/2880 light+dark) is the incorporation point; incorporate
that commit (or any later one — names never change) into your branch via
`git cherry-pick <sha>` of the asset commits ONLY, or fetch the files by path.
The commit SHA is recorded in the R342-01 report and §10.

## 10. Change log (append-only)

| commit | date | change |
|---|---|---|
| (this commit) | 2026-11-08 | contract v1 published; hero pair (light/dark ×1440/2880) available |
