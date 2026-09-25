# 4-A4 — Student Learning Surfaces Audit (سيادة المظهر · Campaign 4, Wave 19)

**Scope:** ExamsPage · OnlineExamsPages (list + taker entry) · MatrixPage · MoocPage · TrainingPages (catalog/track/lesson) · WebinarsPage · LivePage · LabsPage · ArVrPage · styles/training.css
**Method:** 30 screenshots (a4-*: desktop 1440, mobile 390, dark 1280), 16 playwright probes (DOM measurements, contrast math, interaction traces, a MutationObserver + setInterval instrumentation + an isolated React repro), 6 VLM passes. Every VLM claim was re-measured before filing — ~60% of VLM claims were disproved (details inline). No exam was started or submitted; no source edits.

## Scores per surface

| Surface | Route | Score | One-line verdict |
|---|---|---|---|
| Exam analysis hub | /student/exams | **7.0** | Honest redirect-to-real-pages landing with the real cumulative average as its anchor; 3 identical CTA cards are the whole page. |
| Online exams list | /student/online-exams | **7.0** | Window-honest cards («يفتح/أغلق باب التسليم»), resumable-attempt badges; counted-noun slip «1 اختبار» + card-in-card nesting. |
| Exam taker · entry state | /student/online-exams/:id | **8.0** | The best state craft in scope — resume-aware copy, window-error Arabic enrichment, 40px CTA; tab title lies («اختبار جارٍ» before start). |
| Knowledge matrix | /student/matrix | **7.5 d / 7 m / 8 dark** | Working signature moment (filter dimming, 6 cells dimmed live-measured), every level class AA (7.88–17.59:1); 5 of 6 course cards are the same empty state. |
| MOOC | /student/mooc | **7.0 d / 7 m** | bdi/ar-LY numeral discipline everywhere + honest no-CTA cards; 4 cards in a 3-col grid orphan the last one. |
| Training catalog | /training | **7.5 d / 7.5 m / 8 dark** | Best page in scope — counted nouns, level band, live-count pills; KPI skeleton shows 3 tiles where 4 cards land. |
| Track detail | /training/:slug | **8.0** | Tinted hero (no stripe), locked/next/done lesson grammar, real progress; rows have no rest-state separators. |
| Lesson | /training/:slug/lesson/:id | **7.5** | 68ch measured prose, reward-feedback authored moment, RTL arrows; quiz input is placeholder-only. |
| Webinars | /student/webinars | **7.5** | One pulse on the page (LIVE rows only), honest KPI error-retry, useful destination tiles. |
| Live | /student/live | **6.0** | Zero wall: 0/0/0 KPIs **plus three stacked «nothing» cards** when the list is empty (measured). |
| Labs | /student/labs (+runner) | **6.0 d / 6.5 m** | Runner chrome is solid (role=log terminal, step states, reduced-motion path) — but the typewriter **corrupts the output of every step** (P1). |
| AR/VR | /student/ar | **6.0** | Honest read-only cards (dead button removed, per comment); thin page, raw Latin AR/VR badges. |

**RTL/bidi verdict:** No P0 RTL leakage. Every Latin run in scope is `<bdi>`-wrapped or `dir="ltr"`-scoped (timer digits `OnlineExamsPages.tsx:733`, course codes, platform names, points, ranks). Terminal Latin lines verified glyph-position-by-glyph: internal order preserved under RTL (`"I = 14.89 mA"` visual = logical). The classic math trap `"I = (9 - 2) / 470"` never renders — because the terminal bug (P1-1) drops it.

**Counts: P0 0 · P1 1 · P2 5 · P3 8.**

---

## P1 — Major defects

### P1-1 · Lab simulator terminal drops the first output line of every step and appends a phantom empty line (wrong educational content, every run)
- **Where:** `pages/student/LabsPage.tsx:267` — `setTerminalLines((prev) => [...prev, lines[i] ?? '']); i += 1;`
- **Evidence (four independent methods):**
  - MutationObserver on the live terminal (eng step 1, source output `"+ Battery: 9V\n+ Resistor: 470Ω\n+ LED: Red, Vf=2.0V\n✔ المكونات جاهزة."`): committed sequence `[] → ["+ Resistor: 470Ω"] → ["+ Resistor: 470Ω","+ LED: Red, Vf=2.0V"] → […,"✔ المكونات جاهزة."] → […,""]`. The first line **never renders**; a blank line is appended at the end.
  - Step 2: the Ohm's-law line `I = (9 - 2) / 470` — the exact formula the step instructions tell the student to verify — is silently dropped; the terminal opens on `I = 14.89 mA` with no derivation.
  - setInterval instrumentation: exactly ONE interval, 5 ticks for a 4-line output — the closure's `lines` behaves as if it were `[l1, l2, l3, '']`.
  - Isolated repro under the app's own React 18.3.1 (in-page `createRoot`): identical corruption **with AND without StrictMode** — i.e. this ships to production.
- **Root cause:** the state updater is impure — it reads the mutable closure variable `i` at *render* time, after `i += 1` has run. React's eager-state optimization invokes the updater once at `setTerminalLines(...)` call time (`i` = current), then the render queue invokes it **again** (`i` = incremented). The render-time result is what commits, so every tick commits `lines[i+1]`, the first line is skipped, and the last guard-passing tick commits `lines[n] ?? ''` = `""`.
- **Fix sketch:** freeze the value before the call:
  ```ts
  const line = lines[i] ?? '';
  setTerminalLines((prev) => [...prev, line]);
  i += 1;
  ```
  (The `reducedMotion` instant-print branch sets the value directly and is unaffected — users with reduced motion currently get *correct* output while everyone else gets corrupted output.)

---

## P2 — Noticeable problems

### P2-1 · /student/live is a triple «nothing» wall when the session list is empty
- **Where:** `pages/student/LivePage.tsx:110-160` — the «مباشرة الآن» card keeps a stable EmptyState slot (good, 15-j §3 #10), the «جلسات قادمة» card does the same, **and** `list.length === 0` renders a third full Card «لا توجد بثوث بعد» (`LivePage.tsx:152-160`).
- **Evidence (live DOM):** `emptyStates: ["لا بثّ مباشر الآن", "لا توجد جلسات مجدولة", "لا توجد بثوث بعد"]` with KPIs `0/0/0` — three stacked cards + three zeros all saying the same thing. (Same "zero wall" family A6 docked teacher/live for, different surface.)
- **Fix sketch:** when `list.length === 0`, render the single global empty card and drop the two per-status cards (or vice-versa); keep the stable-slot behavior only when at least one status has content.

### P2-2 · Training catalog KPI skeleton doesn't match the real band (3 tiles / grid-3 vs 4 cards / grid-4)
- **Where:** `pages/student/TrainingPages.tsx:277-291` (`KpiStripSkeleton` renders 3 `.metric` tiles in `grid-3`) vs `TrainingPages.tsx:126-151` (the loaded state is `grid-4` with 4 MetricCards: نقاطك/الأوسمة/مسارات نشطة/الشهادات).
- **Evidence:** code-verified shape mismatch; load → 3-tile skeleton → 4-card band = layout shift + wrong affordance signal, violating the file's own header comment («Shape-matched loading skeletons (catalog)»). (The same skeleton serves AchievementsPage, which really is grid-3 — split it.)
- **Fix sketch:** give the catalog a 4-tile `grid-4` skeleton (or parameterize `KpiStripSkeleton({count})`).

### P2-3 · Online-exams section subtitles break the counted-noun glossary («1 اختبار»)
- **Where:** `pages/exams/OnlineExamsPages.tsx:198, 221, 229` — `subtitle={`${available.length} اختبار`}` (×3 sections).
- **Evidence (live DOM):** the only populated section renders **«1 اختبار»** — Latin digit + wrong noun form; glossary requires «اختبار واحد». The `countAr` helper is already imported in this very file (line 25, used by the timer aria-label).
- **Fix sketch:** `subtitle={countAr(available.length, ['اختبار واحد', 'اختباران', 'اختبارات', 'اختباراً'])}` in the three Card titles.

### P2-4 · Lesson checkpoint quiz input is placeholder-only (no label / aria-label)
- **Where:** `pages/student/TrainingPages.tsx:617-624` — `<input type="text" className="input" placeholder="إجابتك…" />` with no `<label>`, no `aria-label`, no `aria-labelledby` to the question.
- **Evidence:** live DOM — the quiz panel renders question + bare input; VLM independently read it as «no label, placeholder text, or border to confirm its function». A screen reader meets an unnamed graded field. (Same pattern family as A3's library-search finding — different file, still unpatched here.)
- **Fix sketch:** `aria-labelledby` pointing at the `.lesson-quiz-q` node (mirror the exam-taker's pattern at `OnlineExamsPages.tsx:783`).

### P2-5 · Exam taker tab title says «اختبار جارٍ» on the pre-start entry screen (and on the result screen)
- **Where:** `components/layout/AppShell.tsx:113` (route-title map) — labels `/student/online-exams/:id` «اختبار جارٍ» unconditionally.
- **Evidence:** live `document.title` on the entry screen (before any attempt exists, h2 = «هل أنت مستعد للبدء؟»): **«اختبار جارٍ · مدارك»**. The tab asserts a running exam the student hasn't started — anxiety-inducing if they see it mid-review. (Title map is A2/A14 territory; the surface is A4's — filing here for the fix wave to pick up.)
- **Fix sketch:** neutral «الاختبارات الإلكترونية» (or «اختبار»), and let the taker set a live title while an attempt is actually active.

---

## P3 — Polish

- **[P3-1] MOOC grid orphans its 4th card** — `MoocPage.tsx:132` (`grid-3` + 4 items). Measured: 3 cols @381px, second row starts 283px below with a lone card. Fix: switch to the `track-grid` auto-fill recipe (`training.css:33`) or `repeat(auto-fill, minmax(280px,1fr))`.
- **[P3-2] Labs + AR cards are pixel-identical icon tiles** — `LabsPage.tsx:191-227`, `MorePages.tsx:696-717` — same header-block/centered-icon/title/sub/CTA scaffold for every item; only the icon + hex change (craft floor: identical card grids). Fix: differentiate by content (experiment count as a real list, platform strip, live-status row).
- **[P3-3] Labs KPI change line renders «من أصل 0 جلسة»** — `LabsPage.tsx:164` — with `total=0` the metric reads «0 من أصل 0 جلسة». Fix: `change={labStats.data && labStats.data.total > 0 ? … : undefined}`.
- **[P3-4] AR badges leak raw Latin «AR»/«VR» unisolated** — `MorePages.tsx:703` — `<Badge>{e.type}</Badge>` without `<bdi>`; single tokens, low risk, but the file's own convention wraps platform names.
- **[P3-5] Live teacher name not bdi-isolated** — `LivePage.tsx:197` — `الأستاذ: د. {firstName} {lastName}` raw; a transliterated/Latin name would scramble the line. Fix: wrap in `<bdi>` like the course code two lines above.
- **[P3-6] Lab step spine is nearly invisible** — `styles/student.css:1570-1580` — `.step::before` connector is `var(--surface-3)` on a `var(--surface)` card (≈1.1:1 decorative). Same family A7 docked the owner timeline for. Fix: `color-mix(in srgb, var(--border-strong) 60%, var(--surface-3))`.
- **[P3-7] Matrix buries its one heatmap under 5 identical empty course cards** — `MatrixPage.tsx:267-272` — 6 courses, 8 concepts, all in one course; the other 5 render the same «لم تُحدَّد مفاهيم هذا المقرّر بعد» card. Honest, but the page reads as an empty-state directory. Fix: collapse un-mapped courses into one summary row («5 مقرّرات بلا مفاهيم محدَّدة بعد»).
- **[P3-8] Online-exams list nests cards inside cards** — `OnlineExamsPages.tsx:180-215` — the bordered `track-card` grid sits inside a bordered, padded Card; /training renders the same component at page level. Fix: flatten (Card flush + inner cards at page level), or restyle inner rows as list rows.

## VLM claims disproved by measurement (kept out of the findings)
- «Matrix uses only one color / no heatmap» — FALSE: 5 measured cell tints across 4 level classes + 5 legend dots; all AA (5.26–17.59:1).
- «Page header centered» (online-exams) — FALSE: `textAlign:start`, 1184px wide, right-anchored (RTL start).
- «Subtitle/instruction text fails WCAG» (exams hub, exam entry) — FALSE: 8.1:1 measured (`page-subtitle`), grade 8.62:1; buttons 16.88:1.
- «Catastrophic whitespace between KPIs and sessions» (webinars) — FALSE: 60px, the standard section gap (identical on /student/exams).
- «Filter pills last row centered» — FALSE: flex-wrap start-aligned, 2 rows, no justify override.
- «Level progress bar fill transparent/broken» — FALSE: measured element was the head `<span>`; the real `.progress-fill` paints `neutral-900`/tier color inline (`primitives/index.tsx:173`).
- «RTL arrows point the wrong way» (×2) — FALSE: ChevronLeft = forward, ChevronRight = back is the correct RTL convention, used consistently.
- «Terminal code should be LTR / is misaligned» — misleading: Latin runs verified glyph-order-correct under RTL; right-alignment is the deliberate RTL adaptation. The real terminal defect is P1-1.

## Top-10 quick wins
1. **P1-1 fix** — capture `const line = lines[i] ?? ''` before the updater (3 lines, restores correct simulation output).
2. **P2-3** — `countAr` for the three exam-list subtitles (one-liner ×3).
3. **P2-1** — gate the global «لا توجد بثوث بعد» card on `list.length === 0` → render it *instead of* the two status cards.
4. **P2-2** — 4-tile `grid-4` KPI skeleton for the catalog.
5. **P2-4** — `aria-labelledby={quiz-q-id}` on the quiz input (mirror exam-taker pattern).
6. **P2-5** — neutral tab title for the exam route in `AppShell.tsx:113`.
7. **P3-3** — hide the labs «من أصل 0 جلسة» change when `total === 0`.
8. **P3-1** — mooc grid → auto-fill minmax(280px, 1fr).
9. **P3-5 + P3-4** — `<bdi>` around teacher name (LivePage.tsx:197) and AR/VR badge text.
10. **P3-6** — visible step-spine color in `student.css:1576`.

## Files to touch
- `frontend/src/pages/student/LabsPage.tsx` (P1-1, P3-2, P3-3)
- `frontend/src/pages/exams/OnlineExamsPages.tsx` (P2-3, P3-8)
- `frontend/src/pages/student/LivePage.tsx` (P2-1, P3-5)
- `frontend/src/pages/student/TrainingPages.tsx` (P2-2, P2-4)
- `frontend/src/pages/student/MoocPage.tsx` (P3-1)
- `frontend/src/pages/student/MatrixPage.tsx` (P3-7)
- `frontend/src/pages/student/MorePages.tsx` (ArVrPage section — P3-2, P3-4)
- `frontend/src/styles/student.css` (P3-6)
- `frontend/src/components/layout/AppShell.tsx` (P2-5 — coordinate with shell owners)

## Verification notes for the fix wave
- Re-shoot `/student/labs`, click «ابدأ تجربة» → «تشغيل الخطوة», assert the first terminal line equals the step's first output line and no trailing empty line (the MutationObserver probe in `.agents/tmp/a4-probe7.mjs` does exactly this).
- `/student/online-exams` subtitle must read «اختبار واحد» with the current seed.
- Motion gates (`scripts/check-motion-tokens.sh`, `scripts/check-icons.sh`) + `npm run typecheck -w frontend` before handoff; re-run VLM on labs + online-exams — scores must not drop.
