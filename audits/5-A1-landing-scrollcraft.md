# 5-A1 — Landing Scroll-Journey Audit (scroll-craft methodology, post-Wave-24 tree)

Agent: 5-A1 (audit-only) · Scope: `/` public landing — `frontend/src/pages/LandingPage.tsx` (963 L),
`frontend/src/styles/landing.css` (1531 L), `components/motion/{Reveal,Parallax,SectionAccent}.tsx`,
`hooks/useReveal.ts`, `components/Illustration.tsx`, `lib/illustrations/*` (+ the polish.css/motion.css
blocks the page renders through).

Evidence: 10 probe scripts + JSON in `/tmp/a1-probes/p1..p10`, 47 screenshots in `/tmp/madarek-shots/a1/`
(`d-p00..100` desktop 1440×900 ×15 offsets · `t-*` 768×1024 ×6 · `m-*` 390×844 ×10 · `dk2-*` dark ×4 ·
`hdr-title-y*` header-overlap clips ×7 · `megamenu-rtl`, `close-d`), 5 VLM critique batches (desktop
journey, mobile journey, hero depth light+dark, section/bento/close, banding seams). Every VLM claim
re-measured in the DOM before filing; disproven/nuanced claims noted inline. Protocol follows 4-A1's
lesson: instant scrolls + full pre-scroll reveal pass before every shot.

Baseline context: 4-A1 scored desktop 5.5 / mobile 6 / dark 5. Waves 20–23 fixed the close (P0s),
serif-italic, roles de-templating, eyebrow census, logos contrast, reveal fling-hardening, band flush.
VLM now: hero 9, CTA band 8.5. This audit judges the **scroll journey as an experience** (feel.md /
devices.md / hero-depth.md / uniqueness.md), not the individual sections — most sections are now
individually good; the journey between them is the remaining gap.

---

## 1. The actual feeling curve (walked live, 1440×900, one line per act)

| # | Act (section) | Emotion on screen | Cause |
|---|---|---|---|
| 0 | ministry strip + glass header | officialdom | dark state ribbon, wordmark «مدارك», one CTA |
| 1 | **hero** (1757 px, 1.95 vh — page's tallest) | welcome → mild curiosity | graduation-cap scene illustration, word-cascaded 104 px title, 3-CTA row, dashboard mockup peeking under the fold |
| 2 | logos strip (225 px) | trust, very quiet | typographic wordmark row «معتمدة من», hairline separators, no motion at all |
| 3 | facts row (268 px) | trust again (repeat of #2's feeling) | 4 centered count-up stats (25 كلّيّة · 4 مدن · 1988 · 3 عضويّات) |
| 4 | campus photo (627 px) | **pride / place — the strongest felt beat** | the only photographic frame; sunlit UoZ entrance, vignette, caption «منذ 1988» |
| 5 | features grid (1001 px) | utility-catalog | 6 identical 341 px icon cards, sway stickers |
| 6 | peach band (627 px) | product-demo | split: lecture checklist widget vs text |
| 7 | lavender band (683 px) | product-demo, warmer | Oasis chat mockup + typing dots (mobile VLM's pick for strongest moment) |
| 8 | bento (712 px) | utility-catalog again (repeat of #5's feeling) | 5 pastel cards spanning 3/3/2/2/2 |
| 9 | roles ledger (884 px) | structure | 4 hairline rows, start-aligned head |
| — | *boundary* | **sag / dead air (VLM caught it)** | 462 px of near-nothing between last roles row and proof title |
| 10 | proof band (790 px) | evidence | 4 count-up stats on sand + milestone illustration |
| 11 | who-for (551 px) | recognition-of-roles **again (repeat of #9's feeling)** | 3 quote cards that paraphrase the roles ledger |
| 12 | final CTA band (755 px) | resolve | hard cut cream→ink, 72 px title, 2 buttons (VLM: "visual full-stop") |
| 13 | footer | metadata | standard 4-col sitemap |

**De-facto peak:** the **hero**, by every structural measure — tallest act (1757 px = 19 % of the
document), most devices (7 reveals + word cascade + spotlight + 13 idle loops), most scroll room. But
its scroll room is spent on a **static** mockup reveal. Both VLM passes picked *different* moments as
the strongest (desktop: campus photo frame 5; mobile: Oasis chat frame 5) — i.e. **the page's budget
and its emotional center are in different sections**. Three moments compete at similar weight: hero
mockup, campus photo, dark CTA (VLM: "you have a peak at Frame 3, another at Frame 5, and a third at
Frame 14").

**Curve diagnosis (feel.md):**
- **No engineered peak.** Budget (hero) ≠ strongest beat (campus/AI) ≠ close (CTA). "A page with
  three peaks has none."
- **Quiet before the peak: accidental.** Facts row (quiet) does sit before campus — but it was
  placed for credibility, not silence, and its 268 px is not enough room to read as authored hush
  against the hero's 1757 px.
- **Three repeated-feeling pairs** violate "two adjacent acts producing the same feeling = one is
  filler": logos(2)+facts(3) both quiet-trust; features(5)+bento(8) both utility-catalog (near-adjacent,
  separated only by the two product bands); roles(9)+who-for(11) both "كل دور يرى أدواته" — the
  who-for cards literally paraphrase the ledger copy (الطالب: ledger «مقرَّرات، مصفوفة معرفية، مساعد
  ذكي…» vs card «محاضرات منظَّمة، حضور وغياب آليّ، تحليل لفجواتك المعرفيّة…»).
- **The ending resolves** (verified-good; VLM: "it arrives somewhere… feels finished"), then a
  standard footer — acceptable close pattern.
- **Mid-page sag**: the 462 px roles→proof boundary + centered head reads as trailing off, not as
  silence-before-anything.

Total length: 9307 px = **10.3 viewports** desktop (inside the 8–14 vh budget), 11178 px = **13.2 vh**
mobile (near the ceiling; features stack alone is 1921 px / 2.3 vh).

## 2. Device inventory (devices.md lens)

| Section | Entrance device | Scroll-linked device | Idle/pointer loops | Verdict |
|---|---|---|---|---|
| ministry + header | none | progress bar scaleX, glass border at 6 px | — | chrome, fine |
| hero | 7× reveal-up stagger (fade+14 px rise) + **word cascade** (the authored moment) | mockup parallax **CONTAINER DEAD** (P1-1); frame ±4 px; badges ±22 px (desktop only) | 13 loops: ambient drift 22 s, dot pulse 2.4 s, chip shimmer 3.2 s, chip sweep 4.5 s, CTA halo 4 s, 7× bar-breathe, 2× badge-float; cursor spotlight | entrance family = fade-rise only |
| logos | **NONE** — the only content section with no entrance | none | none | reads glued-on |
| facts | 4× reveal + 4× CountUp (1988 static — defensible) | none | — | fine |
| campus | 1× reveal | Parallax ≤6 px, **quantized to 11 IO threshold steps** (-6 → -2.71 → -0.03 px — steppy, 30× under the ~200 px perceptibility guidance) | hover tilt (desktop) | the page's "depth" device is invisible |
| features | 6× reveal + scene-paint accent + sticker sway | none | sway ×6 | same family as everything |
| peach band | 2× reveal (halves) | none | — | fine |
| lavender band | 2× reveal | none | typing dots ×3 | fine |
| bento | 5× reveal + scene-paint | none | — | same family |
| roles | 4× reveal | none | — | fine |
| proof | 5× reveal + 4× CountUp + scene-paint | none | — | fine |
| who-for | 3× reveal + scene-paint | none | — | fine |
| final CTA | **NONE** | none | — | static close — defensible as a resolve |
| footer | none | none | — | fine |

**Verdict:** ONE entrance family (fade+rise, 520 ms/14 px, 80–400 ms stagger) serves **all 39 revealed
elements**; `SectionAccent` ships **five** kinds (`underline-draw`, `number-tick`, `scene-paint`,
`quote-fade`, `parallax-shift` — motion.css:359-416) and the page consumes exactly **one**
(scene-paint ×4, itself a fade+6 px lift = the same family). devices.md's variety law (4+ families,
never the same one twice in a row) fails at the page level. No wipe/reveal (clip-path), no pin, no
scrub, no drift. **No true dead scroll exists** (all sections are legitimate `flow` sections; nothing
pins and stalls) — but the scroll journey has **zero perceptible scroll-linked transformation**:
after the one-shot reveals fire, the only things that respond to the wheel are position, a 2 px
progress bar, ≤6 px of steppy photo drift, and badge/frame micro-parallax that is display:none on
mobile (≤920 px).

## 3. Hero depth audit (hero-depth.md lens)

- **Planes exist on paper** — ambient radial (`::before`, 22 s drift), masked dot grid (`::after`),
  scene SVG, text stack, mockup with frame/badge counter-shifts, cursor spotlight — but there is **no
  occlusion and no overlap anywhere**: VLM (light): "single flat stack… a vertical list: Image →
  Breadcrumb → Headline → Subhead… no interaction between the elements"; (dark): "flat, monochromatic
  void… the illustration blob… a faint, low-contrast sticker". The one real depth tool in use is the
  badges' overlap of the mockup frame edge (inset -2 %/-3 %) — and it is desktop-only.
- **Differential movement:** pointer-only (spotlight, desktop) + the 4/22 px badge/frame split. The
  container's own rise+scale parallax is **dead** (P1-1). hero-depth.md's test — "several stacked
  elements moving as one image do not meet this preference" — is currently met only by accident of
  everything moving at exactly 1×.
- **Headline readability:** measured on composited frames — title region ≈ **10:1** light / dark at
  rest (ink #191918 on #FBFAF9; verified at y=380..560 scroll clips). Transiently washed to ~1.15:1
  **under the glass header** while scrolling through (standard glass-chrome behavior, acceptable).
  At 390 px: 42.9 px / 2 authored lines (correct step-down, taste rule satisfied); 768 px: 64.5 px.
- **The 390/768/1440 question:** composition is the same centered column at all three — no
  re-art-direction (badges, sidebar, spotlight all desktop-only). VLM mobile pass still judged the
  hero "works well… not a shrunken desktop" — the stack reads, it just has no depth on mobile.
- **Fold:** scene (240 px) + eyebrow + 2-line title + subtitle push the **primary CTA to y=912** —
  below the fold at 1440×900 (fold 900) and 1366×768 (768). At 1512×982 it lands at 898 (visible).
  taste.md: "CTA visible without scrolling" — violated on the two most common desktop viewports.

## 4. taste.md floor — measured on this render

| Check | Measured | Verdict |
|---|---|---|
| Spacing rhythm (more above heading than below) | section heads 115/48, 72/48; final CTA 230/20; band titles 16/20 (near-parity, sticker above) | ✅ |
| Section contiguity | 0 px inter-section gaps at 390/768/1440; no h-overflow | ✅ |
| Type ramp | hero 104→64.5→42.9 px across breakpoints; subtitle 17 px/62 ch; band lede 56-62 ch; role desc 61.8 ch | ✅ |
| Card copy measure | feature descs **33.3-33.5 ch** (floor 45) | ⚠️ P2-6 |
| Colour: one accent | copper accent locked; **progress bar = 4-hue gradient** (peach→copper→lavender→mint, landing.css:39-43); bento 5 pastel grounds reads cohesive (VLM: "restrained… harmonize") | ⚠️ P2-4 |
| Depth tools | offset shadows ✓ (shadow-mockup/pop), grain ✓ (campus), overlap ✓ (badges, desktop-only), edge light ✗, scale-blur ✗ | partial |
| Scrim discipline | campus caption: bottom band scrim 0.45→0.78, white text — measured legible; VLM: "adequately opaque… but generic overlay" | ✅ |
| Refuse list | scroll cues ✗ · 01/06 ✗ · eyebrow-per-heading ✗ (4 labels / 13 sections) · identical grids **⚠️ features ×6** · gradient text ✗ · em dash **⚠️ ×16 visible** · fake dashboard **⚠️ mockup** · >4 hero text elements **⚠️ 5** | ⚠️ |
| Peak-end | close resolves ✅ (VLM: "visual full-stop"); peak missing ❌ | ⚠️ |

## 5. RTL motion audit — no defects found (verified-good)

Every scroll/entrance transform is Y-axis or rotation (`reveal-up` translateY 14 px; `madark-sway`
rotate; Parallax direction up/down = vertical) — RTL-neutral by construction. Lateral chrome is
correctly flipped: nav underline `::after` + section-title underline flip via `[dir="rtl"]`
(landing.css:51, 849-853); `section-accent-underline-draw` flips transform-origin (motion.css:379-381);
megamenu 720 px panel measured in-viewport at RTL (left 466 / right 1186 @1440). The shimmer sweeps
(`translateX(-110%→110%)`) are physical-X decorative light passes — carry no directional meaning.
`ArrowLeft` = forward in all 13 CTA usages ✓. Badges use logical `inset-inline-end/start` ✓. Campus
caption `inset-inline-start` ✓. **No `--motion-direction` consumer is needed today (no lateral motion
exists); any Wave-25 lateral device must multiply by it.**

## 6. Signature move + tell-someone test (uniqueness.md §3, feel.md §3)

**Tell-someone, honestly:** «إنها الصفحة التي **يظهر عنوانها كلمةً كلمة ثم تعرض صورة حرم الجامعة**» —
the blank fills with a device name (the code itself calls the word cascade "the Notion / Linear /
Stripe trick", polish.css:489-492) plus a photo. Not an experience that happened *to the visitor*.
Current bespoke candidates: cursor spotlight (kit), magnetic card glow (kit), sticker sway
(platform-wide), mockup parallax (kit, and dead per P1-1), returning-visitor calm (genuinely bespoke —
`data-intro-seen` collapses the theatrics on session revisit — but invisible on a first visit and
carries no meaning). **Verdict: the page has no signature move. P1.**

---

## Findings

Severity key: P0 blocks 9+ quality · P1 should fix · P2 polish · P3 taste notes.
"[primtives]" = achievable with existing Reveal/Parallax/SectionAccent/CSS; "[authored]" = needs a
new authored component (no new deps).

### P0 — none
Nothing on the page is broken, invisible, or contradictory. (4-A1's P0 close-color bug verified fixed
live: 15.9–16.6:1 both themes.)

### P1 — should fix (6)

**P1-1 — The hero mockup's scroll parallax is dead code: a transform-property collision with the
reveal system.** `.landing-mockup { transform: translateY(calc(var(--parallax) * -16px)) scale(...) }`
(polish.css:519-524) is permanently overridden by `.reveal-up.in-view { transform: translateY(0) }`
(polish.css:589-592, specificity 0,2,0 > 0,1,0) because `LandingPage.tsx:405` puts both classes on
the same element. Measured live: `--parallax` sweeps 0.74 → −1 while the computed transform stays
`matrix(1,0,0,1,0,0)` for the whole traversal (children survive: frame ±4 px, badges ±22 px — a
differential the container was supposed to anchor). The page's only scroll-linked hero device never
runs after its own entrance. **Fix [primitives]:** move `RevealCssClass` to a wrapper `<div>` and keep
`.landing-mockup` parallax-only, or drive both through one custom-property chain
(`transform: translateY(calc(var(--reveal-y, 0px) + var(--parallax) * -16px))`). 2-line change.

**P1-2 — One entrance family for all 39 revealed elements; the shipped accent variety is unused.**
Every section enters with the same fade+14 px rise (520 ms, 80–400 ms stagger — polish.css:582-597);
all four `SectionAccent` mounts use `scene-paint`, which is the *same family* (fade + 6 px lift,
motion.css:397-407). The component already ships `underline-draw` (RTL-flipped), `number-tick`,
`quote-fade`, `parallax-shift` — zero consumers on this page (or anywhere). devices.md variety law:
"four or more families, never the same one twice in a row." **Fix [primitives]:** per-section kinds —
`underline-draw` on one band title, `quote-fade` on the testimonials, `number-tick` is already
CountUp's twin; vary reveal `distance` (small/medium/large tokens exist) for bands vs grids. Zero new
code beyond JSX props.

**P1-3 — No engineered peak: budget, strongest beat, and close are three different sections.**
Measured: hero 1757 px (19 % of doc) but its scroll room ends on a static mockup; campus 627 px (the
VLM-chosen strongest frame, desktop); dark CTA 755 px (VLM: third competing moment). feel.md: the peak
gets the asset budget, the silence before it, and the most scroll room — currently no act gets all
three. **Fix [primitives + authored]:** pick ONE — recommended: the **campus photo** (only
photographic beat, real place, already the felt center). Give it full-bleed width + the most scroll
room (sticky caption settle or scale-settle), demote the hero mockup (crop/tighten), and let the
346 px quiet boundary before the final CTA become the authored silence for the *resolve*. See §7.

**P1-4 — Primary CTA below the fold on the two most common desktop viewports.** Measured no-scroll
first paint: CTA row top **912 px** at 1440×900 (fold 900) and 1366×768 (fold 768); visible only from
~982 px-tall viewports up (898 < 982 ✓). Cause: the hero stack (scene 240 + eyebrow 36 + 24 + title
266 + 24 + subtitle 56 + 40) consumes the fold. taste.md: "CTA visible without scrolling." **Fix
[primitives]:** shrink the scene clamp (320→~220 px), tighten eyebrow→title gap (sp-6→sp-4), and move
the meta row («بإيميلك الجامعي · دعم RTL · اعتماد رسمي») to just above the mockup — it is below the
fold at ≤900 px anyway (measured top 974).

**P1-5 — `who-for` duplicates the roles beat (feel.md filler rule).** Roles ledger (#9) and who-for
(#11) deliver the same information in two formats, 1.5 viewports apart: ledger «الطالب: مقرَّرات،
مصفوفة معرفية، مساعد ذكي، إنجازات…» vs quote «محاضرات منظَّمة، حضور وغياب آليّ، تحليل لفجواتك
المعرفيّة…» (LandingPage.tsx:780-810 vs 862-875). Two acts producing the same feeling — one is
filler; it also costs 551 px of the 13.2-vh mobile budget. **Fix [primitives]:** cut the section and
fold ONE human line into the proof band (or convert to a single narrative sentence above the CTA).

**P1-6 — No signature move; the tell-someone blank fills with a device name.** See §6. Uniqueness gate
fails honestly: nothing on this page could be described to a friend as something that happened to
them. **Fix [authored]:** see the three concepts in §7 — one must ship in Wave 25 or the page stays
"nice, unmemorable."

### P2 — polish (8)

**P2-1 — Thirteen simultaneous infinite loops in the hero on first paint; five on the money screen.**
Census (live, computed styles): ambient drift 22 s (hero ::before), eyebrow dot pulse 2.4 s, «جديد»
chip shimmer 3.2 s, chip sweep 4.5 s, primary-CTA glow halo 4 s, 7× bar-breathe 3.6 s, 2× badge
floats. The 36 px announcement chip alone runs **three** loops (landing.css:391, polish.css:619,
polish.css:2436) — 4-A1 P3-5, still open, now with an exact census. The offscreen pause (20-a) is
excellent, but everything fires *while visible*. **Fix [primitives]:** keep one chip effect (the
sweep), drop the dot pulse + strong::after shimmer; reconsider the CTA halo (a zero-offset radial
glow is also a craft-floor-adjacent halo). taste: "one thing should be the reason each act exists."

**P2-2 — 462 px near-empty boundary between roles and proof (mid-page sag).** Measured last roles row
→ proof title = 462 px at 1440 (roles bottom pad + band top pad + centered head + 160 px decorative
milestone illustration). VLM unprompted: "the whitespace here is excessive… dead air before the final
push." feel.md: silence must be authored — this reads as trailing off. **Fix [primitives]:** halve
one of the two stacked section paddings at this boundary and move the milestone illustration inline
with the head (or drop it — it is the page's second scene and dilutes the hero's).

**P2-3 — Zero perceptible scroll-linked depth anywhere; campus Parallax is threshold-quantized.**
The campus photo's `--parallax-y` jumps between 11 IO thresholds (-6 → -2.71 → -0.03 px) rather than
tracking scroll — steppy micro-jitter at best, and ≤6 px total is ~30× below the ~200 px at which
differential movement reads as depth (devices.md §6). The platform spec caps parallax at 8 px
(R-010, Parallax.tsx:37) — correct for app surfaces, but it means the landing's only "depth" device
is decorative noise, not depth. **Fix [primitives-or-remove]:** either replace the campus Parallax
with a scale-settle (1.05→1 clip-revealed on entry — transform-only, spec-legal) or honestly remove
the wrapper; do not ship a device that does nothing.

**P2-4 — Progress bar is a 4-hue gradient (confetti on the chrome).** landing.css:39-43:
`peach-ink → accent → lavender-ink → mint-ink`. taste colour roles: one accent owns the page;
scattered tiny accents are confetti — this one runs across the very top of every frame. **Fix
[primitives]:** single-hue accent gradient (accent → accent-strong) or plain accent. 1 line.

**P2-5 — The hero mockup is a div-built fake dashboard with an invented number (refuse list; 4-A1
P2-3, still open).** Skeleton sidebar rows, KPI «3.74 / 92% / 3», decorative bars, plus a floating
badge claiming «+12 طالباً سلَّم الواجب اليوم» (LandingPage.tsx:405-463) — invented precision next to
the page's honestly-sourced facts row. The platform has a real student dashboard; a real screenshot
(2×, framed by the existing chrome) is both honest and more impressive. taste: "fake dashboards…
real markup, always." **Fix [authored, small]:** swap the mockup body for a real dashboard capture;
keep the Oasis badge only if labelled illustrative.

**P2-6 — Features grid remains the AI-tell grid: six identical cards at 341 px, copy at 33 ch.**
All six `.landing-feature-card`s measure exactly 341 px wide (3×2), icon+title+text, same entrance,
same sway — the one grid Wave 20-a left untouched (roles/bento were de-templated), and the VLM's
"formula fatigue" frame. Card copy measures 33.3-33.5 ch against the 45-75 ch body floor. **Fix
[primitives]:** break the symmetry with one wide card (grid-column: span 2 — the bento's own span
classes), or convert two cards into a rail; widen the measure by cutting to 4 cards or a 2-col step.

**P2-7 — Logos strip: no entrance device at all, and it duplicates the facts row's feeling.** The
only content section with zero reveals (census: 0) — it arrives with no transition between the hero's
theatrics and the facts' count-ups — and it is the second quiet-trust act in a row (logos
«معتمدة من» → facts «حسب الموقع الرسميّ»). **Fix [primitives]:** either fold the wordmarks into the
ministry strip (one credibility register, top of page) or give the row a quote-fade entrance and let
the facts row carry trust alone.

**P2-8 — Em dashes ×16 in visible copy (refuse list; needs glossary ruling).** Census (comment-only
lines excluded; verified against the raw file): LandingPage.tsx lines 308, 370, 523 (alt), 538, 555,
572, 580, 596, 641, 651, 675, 691, 735, 757, 776, 825. 4-A1 P3-1 estimated ~14; the exact list is
now pinned. Arabic copy has natural
separators (، · ;) — recommend the platform glossary adopt «— only inside quotes/dialogue» and sweep
the rest.

### P3 — taste notes (6)

**P3-1 — Hero carries 5 stacked text blocks + scene before the CTA** (eyebrow chip, title, subtitle,
CTA row, meta row; taste: >4 text elements). Pairs with P1-4's fold math.

**P3-2 — Global `html { scroll-behavior: smooth }` still unscoped** (base.css:24, polish.css:677) —
4-A1 P1-4 open; tooling-level (poisons programmatic scrollTo campaign-wide). Not re-derived here;
cross-ref for the Wave-25 fix list.

**P3-3 — Four labels for the same /auth intent:** «ابدأ الآن» (header) · «أنشئ حسابك الجامعي» (hero)
· «جرّب المحاضرة» (peach band → also /auth) · «تسجيل الدخول» (close). taste: "one label per intent."
The contextual variation is defensible on a marketing page; the peach band's «جرّب المحاضرة» linking
to /auth (not a lecture) is the one true mismatch.

**P3-4 — Mobile footer tap targets** (4-A1 P3-4 open; VLM re-flagged: "wall of text… tapping those
links would be difficult"). 13 px links, no min-block-size at ≤920 px.

**P3-5 — Dark-theme hero atmosphere is invisible.** Ambient blob = 8-14 % accent mix on #191918;
VLM (real dark shot): "flat, monochromatic void… illustration… a faint, low-contrast sticker."
Consider raising the dark-theme blob mix or dropping the blob in dark (honest emptiness beats a
stain).

**P3-6 — `text-wrap: balance` only on the hero title.** Section/band titles lack it; no
`text-wrap: pretty` on body copy. Free wins; one line each (landing.css:425 pattern).

### VLM claims disproven / nuanced by measurement (ledger)
- "1988 Students" (mobile pass) — misread; 1988 is عام التأسيس, rendered as a plain (non-CountUp) value.
- "Frame D = stats band with founding year, campus count, student body" — frame was the roles ledger;
  the proof-band stats are 40/70/30/90 %. Discounted.
- "Bento reads as confetti of pastel colors" (C4-era concern) — **not** what current VLM says
  ("restrained… harmonize; asymmetric layout… editorial") and the 20-a band-flush fix landed
  (landing.css:695-703). The *section-ground* alternation now reads as "designed rhythm" per VLM —
  the C4 patchwork hand-off is resolved.
- "Dark-theme frame identical to light" (first dark attempt) — probe bug (theme store key), re-shot
  with persisted `madarek-theme` (dk2-*); dark findings above use the corrected shots.

---

## 7. Proposed target for Wave 25 — feeling curve, peak, signature move

### Target curve (7 acts, ~8.5 vh desktop / ≤11 vh mobile; real platform content only)

| # | Feeling | Act | Cause |
|---|---|---|---|
| 1 | وضوح (clarity) | Hero: «منصّة التعليم الذكيّ لجامعة الزاوية» + **real** dashboard, CTA above the fold, ≤4 blocks | the visitor understands what this is in one screen |
| 2 | ثقة (trust, compressed) | Facts row alone (logos folded into the ministry strip) | 25 كلّيّة · 4 مدن · 1988 · sourced numbers |
| 3 | **انتماء (belonging) — THE PEAK** | Campus photo, full-bleed, quiet facts-row before it, most scroll room; caption «منذ 1988»; optional colleges dissolve (option C) | the only photographic beat; the place itself is the argument |
| 4 | قدرة (capability) | Features — varied entrances (underline-draw / quote-fade — kinds already shipped) | tools, not a wall |
| 5 | تجربة (experience) | The two product bands: الفصل المعكوس checklist + Oasis chat (keep — they are the page's best demos) | show, don't tell |
| 6 | دليل (proof) | Roles ledger + pilot stats, one human line folded in (who-for cut) | evidence with a face |
| 7 | عزم (resolve) | Dark close, authored 300-400 px silence before it, journey rail completes (option A) | the page arrives somewhere and stops |

Peak sentence for the brief: «تنزلق صورة حرم جامعتك حتى تملأ الشاشة، ثم تنفتح على كلّيّاتها الخمس
والعشرين واحدةً واحدة» — the campus fills the screen and opens into the twenty-five colleges.

### Signature-move concepts (pick ONE; all RTL-aware, no new deps)

**A. «سجلّ الرحلة» — the journey ledger rail (recommended; cheapest, primitives-compatible).**
A slim fixed rail on the inline-start (right in RTL) edge, present from the hero. Each section passed
stamps a milestone token drawn from the platform's real stages — التسجيل → الكليّات → المحاضرات →
الاختبارات → البحوث → المجتمع → التخرّج. Scroll position is the playhead; tokens stay stamped (a
trace of where the visitor has been — feel.md §4); at the close, the completed rail resolves into the
graduation-cap mark + the CTA. Clickable = navigation. Mobile: collapses to a 2-3 px progress accent
in the accent hue (replacing P2-4's confetti gradient). Built from the page's existing IO pattern
(the `data-offscreen` observer) + tokens; RTL-native (stamps run top→bottom on the reading side).

**B. «الاختبار تحت إصبعك» — the exam scrub (flagship; one authored pinned act).**
One pinned (position: sticky) act in the middle of the page where vertical scroll scrubs a REAL exam
question's lifecycle in the platform's own markup: السؤال يظهر → الطالب يختار → التصحيح التلقائي
يحسب → النتيجة تسقط في المصفوفة المعرفية. Real product surface, labelled demo — the honesty rule
is satisfied because the panels are the actual exams UI (live-surface grammar, uniqueness.md §2.3).
Turns the page's middle from catalog to demonstration; the exams module is the platform's most
concrete differentiator.

**C. «من الحرم إلى الكليّات» — the campus doorway (deepens the peak).**
As the visitor scrolls past the campus photo (the chosen peak), the photograph crossfades —
clip-path wipe, the sanctioned third property — into the 25 real college names as typographic plates
(data already in `data/colleges.config.ts`), ending on «تصفّح الكلّيّات الـ25» wired to the existing
CollegesPopover. The place literally opens into its inventory; ties the peak to a real, checkable
claim.

Recommendation: **A + the P1-1/P1-2/P1-3/P1-4 fixes are Wave 25's core** (all primitives-level);
**B** is the stretch signature move if the wave budget allows one authored component; **C** is the
peak-deepener and composes with either.

## 8. Verified-good — do not regress

- Reduced-motion exemplary: 39/39 reveals visible, CountUps render final values (25/4/1988/3/40%…
  verified), words visible, parallax transform none — re-verified live at 1440.
- Reveal fling-hardening works as shipped: 0/39 stuck after instant jumps at 390/768/1440.
- Band patchwork (C4 hand-off) RESOLVED: bands flush; VLM reads ground alternation as "designed
  rhythm… intentional and musical."
- The close resolves (dark band, 15.9-16.6:1, differentiated solid/outline buttons, VLM: "visual
  full-stop").
- RTL motion: zero defects (§5).
- Eyebrow discipline 4/13; spacing rhythm correct at every measured head; sections contiguous; no
  horizontal overflow at any viewport.
- CountUp honesty contract (starts/ends on the real value, ar-LY, RM-aware).
- Returning-visitor calm (`data-intro-seen`) — genuinely bespoke session choreography; keep.
- Facts row: 1988 deliberately not animated — a year counting up from 0 is meaningless. Right call.

## 9. Files to touch (for the Wave-25 fix map)

- `frontend/src/styles/polish.css` — P1-1 (transform collision, :519-592), P2-1 (loop census), P2-4
  is landing.css, P3-2 (:677)
- `frontend/src/pages/LandingPage.tsx` — P1-2 (accent kinds), P1-4 (hero stack), P1-5 (who-for),
  P2-5 (mockup), P2-6 (features grid), P2-7 (logos), P2-8 (em dashes), P3-1, P3-3
- `frontend/src/styles/landing.css` — P2-4 (:39-43), P2-2 (boundary paddings), P3-6, P3-4
- `frontend/src/components/motion/SectionAccent.tsx` — no change needed (kinds already shipped; the
  page just doesn't use them)
- Authored new (Wave 25 signature): journey-rail component (option A) / exam-scrub act (option B) —
  new files under `components/landing/`, no new dependencies.
