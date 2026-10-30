# 4-A5 — Student Life Surfaces Audit (Campaign 4 «سيادة المظهر»)

Agent: 4-A5 · Scope: student life / social identity — `MorePages.tsx` (Social, Gamification, Results, Schedule, Skills, Alerts, Downloads, UniversityInfo), `AiAssistantPage.tsx`, `CampusMapPage.tsx`, `PaymentPage.tsx`, `ProfilePage.tsx`, `JobsPage.tsx`, `community/CommunityPages.tsx`, `TrainingPages.tsx` (AchievementsPage) + their CSS in `student.css` / `polish.css` / `training.css` / `colleges.css`.
Method: 12 scoped routes × (desktop 1440 · mobile 390 where budgeted · dark 1280) + 4 "More" pages desktop — **26 full-page screenshots** (`/tmp/madarek-shots/a5-desktop-*`, `a5-mobile-*`, `a5-dark-*`, `a5-probe-*`) via own playwright probes with student storageState + instant scroll/settle; **9 VLM critique batches** with every consequential claim re-measured in-page (12 VLM claims **disproven** by geometry/computed styles — see §VLM ledger); interaction probes: like optimistic flow, job apply end-to-end, profile link-edit validation + save, AI send→typing→reply, map city filter, community tablist keyboard + RSVP, focus rings, WCAG contrast math on 28 text pairs (both themes), touch-target measurements.
Cross-refs (not re-filed): A4 lab terminal P1 / counted-noun P2 · A10 15px-input iOS-zoom P1 + sub-44 P2 family · A12 avatar-contrast P1 + DB-color gating · A13 register P0 · A14 `/competitions/:id` crash P0 (index verified rendering here: h1 «المسابقات الأكاديمية» + 3 open KPIs, zero page errors).

## Scores per surface

| Surface | Route | Score | One-liner |
|---|---|---|---|
| Community | `/community` | **4.5/10** | Tabs/KPI/events/competitions solid — but the **default announcements tab renders with zero CSS** (P1) |
| AI assistant | `/student/ai` | 7/10 | Correct RTL chat anatomy + live region; gap-card percent fails AA at 2.13:1 |
| Social | `/student/social` | 7.5/10 | Best-in-class optimistic like flow; trending sidebar stretches to a 352px void; un-like affordance lies |
| Profile | `/student/profile` | 7/10 | Validation + storage-safety + honest completeness; mobile stacks 4 full-width KPI cards above the fold |
| Map | `/student/map` | 7.5/10 | Honest city-footprint filter with authored stagger; count chip fails AA on the selected row (both themes) |
| Gamification | `/student/gamification` | 7.5/10 | Tier orb + XP bar + staggered leaderboard; «L2» Latin label + XP/نقاط unit mix |
| Results | `/student/results` | 8/10 | RTL-correct horizontal bars (verified geometry); honest states; VLM "axis reversed" claims self-refuted |
| Schedule | `/student/schedule` | 7.5/10 | Clean day groups, chrono sort; no today marker (P3) |
| Achievements | `/achievements` | 7.5/10 | Earned/locked badge grammar with contrast-aware rarity mixing; full ARIA tablist |
| Jobs | `/student/jobs` | 8/10 | Server-truth apply + hover-revealed actions with keyboard/touch parity; no defect found |
| Payment | `/student/payment` | 8/10 | Honest no-fees page, bidi contacts, retry toast; one thin CTA card |
| Competitions index | `/competitions` | pass | Renders clean (detail crash is A14's P0) |

**Audit health (impeccable 5-dim, aggregate):** A11y 3/4 (1 AA text failure + 1 lying affordance; focus rings, ARIA tabs, live regions otherwise exemplary) · Perf 3/4 (no thrash found; charts theme-keyed) · Theming 3/4 (2 theme-blind/AA misses; tokens otherwise respected) · Responsive 3/4 (44px floors honored; KPI stack + 13–15px inputs) · Integrity 3/4 (honest-data discipline is the platform's signature; one entire card family lost its CSS).

**Counts: P0 ×0 · P1 ×2 · P2 ×5 (+1 cross-ref) · P3 ×8.**

---

## P1

### P1-1 · Community announcements tab renders with zero styling — the page's default tab
- **Where:** `frontend/src/pages/community/CommunityPages.tsx:202-237` (`AnnouncementCard`) — classes `.announcement-card/-pin/-head/-icon/-title/-meta/-body` have **no CSS anywhere**; only `polish.css:1531-1545` gives the card a border-radius + hover lift, and `polish.css:4358-4365` a hover-bobble keyed to `li:hover` (these cards are not `<li>` — never fires).
- **Evidence (computed, live DOM on `/community`):** `.announcement-card` → `background: rgba(0,0,0,0); padding: 0; border: 0` — **no card surface at all**; `.announcement-head` → `display: block` (the emoji span drops to its own line above the title block instead of a leading icon row); `.announcement-pin` «مثبت» → plain 15px text, no chip; `.announcement-meta` → `display: block`, no flex/gap (badge → author → date run inline on inherited spaces; DOM text shows «كل المنصةإدارة الجامعة» junction). Hovering lifts (`translateY(-1px)`) and draws a shadow around an **invisible box**. VLM corroborates: "flat list directly on the page background… emoji not in a well." Same state in dark theme (no CSS to remap).
- **Impact:** `/community` is a flagship student-life route; its landing tab reads as unstyled HTML — below the campaign's craft floor on the first screen.
- **Fix sketch:** add the missing family in `student.css §misc` (or rebuild on the `Card` primitive): `.announcement-card{background:var(--surface);border:1px solid var(--rule);padding:var(--sp-4)}`, `.announcement-card.pinned` accent start-edge treatment ≤1px + pin chip (`.announcement-pin` pill), `.announcement-head{display:flex;gap:var(--sp-3);align-items:flex-start}`, `.announcement-icon` 40px well (copy `.job-icon-well` grammar), `.announcement-meta{display:flex;flex-wrap:wrap;gap:var(--sp-2);align-items:center}`, `.announcement-body{color:var(--text-secondary);margin-block-start:var(--sp-2)}`.

### P1-2 · AI gap-card percent: gold on light surface = 2.13:1
- **Where:** `frontend/src/styles/student.css:551-558` — `.ai-gap-pct { color: var(--warning) }` on `.ai-gap-card`'s `--surface-2` ground.
- **Evidence:** measured 12px/600 `rgb(214,163,48)` on `rgb(247,246,243)` = **2.13:1** (WCAG AA text needs 4.5). Dark theme passes (9.9:1) — the token is theme-blind for this use.
- **Impact:** the one number each gap card exists to show (mastery %) is the least readable text on the page.
- **Fix:** `color: var(--warning-ink)` (or `color-mix(in srgb, var(--warning) 55%, var(--text))`) — keep dark value; verify ≥4.5 in light.

## P2

### P2-1 · Trending sidebar card stretches into a 352px dead void
- **Where:** `frontend/src/pages/student/MorePages.tsx:975-998` — `<Card>` in the second column of `.grid-2-1`; grid default `stretch`.
- **Evidence:** card box 543px tall (matched to feed column), `.trend-list` content ends at 191px → **352px empty card body (65%)**; the hover-lift rule (`polish.css:1540`) makes the hollow shell interactive-feeling.
- **Fix:** `style={{alignSelf:'start'}}` on the trending Card (or make `.grid-2-1 > .card { align-self: start }` for rail cards).

### P2-2 · «إزالة الإعجاب» affordance lies — clicking does nothing
- **Where:** `frontend/src/pages/student/MorePages.tsx:788-789` (`onLike` early-returns `if (hasReacted(id))`) vs `:945` (`aria-label={reacted ? 'إزالة الإعجاب' : …}`) and the button stays enabled (`:946` disables only in-flight).
- **Evidence:** probed an already-liked post: `aria-pressed=true`, click → count stays 1, no un-like request. Screen-reader users are promised an un-like that does not exist; sighted users get a dead button.
- **Fix:** either implement un-like (`kind:'unlike'` — backend permitting) or change the pressed label to a state description («أعجبك هذا المنشور») + `aria-disabled` semantics so it no longer presents as an action.

### P2-3 · Campus-map count chip fails AA on the selected row (both themes)
- **Where:** `frontend/src/styles/student.css:1709-1714` — `.campus-city-count { color: var(--text-muted) }`; on `.campus-city-row.on` the ground becomes `--accent-soft`.
- **Evidence:** light 12px `rgb(110,108,101)` on `rgb(244,228,210)` = **4.22:1**; dark `rgb(154,150,138)` on `rgb(61,45,27)` = **4.47:1**. Unselected rows pass (5.26). The name gets `.on` treatment (`:1688`) but the count is forgotten.
- **Fix:** `.campus-city-row.on .campus-city-count { color: var(--accent-strong) }` (the WCAG-pinned pair the block comment at `:1680` already documents).

### P2-4 · Profile mobile: four stacked full-width KPI cards bury the page's content
- **Where:** `frontend/src/pages/student/ProfilePage.tsx:198-222` (`.grid-4`) — utility collapses to 1 column ≤640px.
- **Evidence:** 390px: `grid-template-columns: 340px`; four cards 340×132 (kpiTop=386) → tabs + academic info start ≈950px, below the 844px fold. The hero already carries identity; the KPI strip is the least important block on the page.
- **Fix:** 2×2 grid for `.grid-4` at ≤640px (shared utility — coordinate with A10/A12 waves), or a compact single-row metric strip variant for profile.

### P2-5 · Theme flash + write-through: server preference overrules/silently overwrites local after paint
- **Where:** `frontend/src/hooks/useThemeProfileSync.ts:38-77` + `frontend/index.html:88-100` (pre-paint bootstrap reads only localStorage).
- **Evidence (fresh context, local=light, server=dark):** `data-theme` = `light` at paint → flips to `dark` ~1–2s later once the expired token refreshes and `me` resolves (Case-4 pull). Inverse direction (local newer than server) **pushes** a `PUT /me/theme` — any localStorage write with a fresh `modeUpdatedAt` (restored backup, clock skew, probe script) silently overwrites the account preference. During this audit a dark-mode probe script triggered exactly that write-through and flipped the demo student's server preference; restored to LIGHT via the sidebar toggle (verified `PUT {"themePreference":"LIGHT"}`).
- **Fix:** cache `me.themePreference` in localStorage and resolve it in the index.html bootstrap (no flash); restrict the push path to explicit user toggle events (not any hydration discrepancy). Cross-ref A11 (motion/flash) + A12 (dark-mode system).

### P2-X · (cross-ref, not re-filed) inputs <16px → iOS zoom on my surfaces
`social-composer` 13px (`student.css:1900`), `chat-input` 13px (`polish.css:1781`), `profile-link-edit .input` 15px (measured), community modals `.auth-input` 15px (`auth.css:63`). A10 owns the 16px floor fix — these are the impacted files in my scope.

## P3

1. **«L2» Latin tier label** — `MorePages.tsx:220` `<bdi>L{l.level}</bdi>`; an Arabic surface should read «مستوى ٢» (or the tier name already shown beside it).
2. **XP unit inconsistency** — same page mixes «XP» (`:61,99,222`), «نقطة/نقاط» (`pointsAr :133`), and bare «+N» badges (`:173`). Pick one unit voice.
3. **RSVP pressed state is session-local** — `CommunityPages.tsx:298-317`; reload forgets your RSVP visual (API row carries no my-RSVP field — acknowledged in comment). Server field or persist per-event in localStorage.
4. **Trending tags are dead-ends** — `MorePages.tsx:981-996` renders hashtags with no click/filter affordance; a trend list you can't act on is display-only data (either link to a filtered feed or label it as summary).
5. **Announcement title demoted to inline-styled div** — `CommunityPages.tsx:215-223` replicates h3 treatment via 5 inline style props; fragile — belongs in CSS (moot once P1-1 lands, but the pattern shouldn't survive).
6. **Schedule has no "today" semantics** — `MorePages.tsx:456-501` groups by weekday with no today marker, no current/next class highlight, fixed week order regardless of actual day.
7. **Community events KPI counts unfiltered** — `CommunityPages.tsx:77` `upcomingEvents = events.data?.length` — labeled «فعاليات قادمة» but no client-side date filter; verify the endpoint guarantees future-only or filter `startsAt > now`.
8. **Payment's last card is a single CTA** — `PaymentPage.tsx:129-137` «إعلانات الإدارة الماليّة» holds one sentence + one link; fold into the fees-status card (craft-floor: no orphan cards).

## VLM ledger (claims disproven by measurement — do not re-file)

- "User bubble misaligned for RTL / bot on wrong side" (×3 claims) — chat geometry measured: bot bubble anchored inline-start (right offset 44px), user row `row-reverse` anchors at inline-end — the correct RTL chat convention (WhatsApp-AR parity); VLM applied an LTR mental model and self-contradicted.
- "Results chart axis reversed / bars grow wrong way" (×2) — `MorePages.tsx:614-617` `x.reverse + y.position:'right'` anchors 0 at inline-start so bars grow in reading direction; VLM's "should" state described the actual rendered state.
- "Mobile trending removed" — `.trend-list` present at y=899 (below feed).
- "Composer placeholder mixes English" — placeholder is fully Arabic («ماذا يدور في ذهنك؟ (يمكنك استخدام #هاشتاج)»).
- "Dark publish button looks disabled" — it *is* disabled (empty draft); `.btn:disabled` uses `pointer-events:none` so cursor claim is moot.
- "Excessive gap between posts" — measured 12px (`gap-3`), uniform.
- "Payment paragraph left-aligned" — `text-align:start`, `dir:rtl` (right-aligned).
- "Payment mobile truncates fees text" — no clamp/truncation present.
- "Email/badge baseline mismatch" — centers within 0.5px.
- "Event card cramped against buttons" — 55px desc→actions gap.
- "Gamification level card missing on mobile" — both cards + orb present.
- "Bottom payment cards unequal" — 582/582.

## Positive findings (keep + replicate)

- **Optimistic like flow** (MorePages.tsx:788-812): server-truth seeding (`viewerReacted`), snapshot-based `max()` to avoid double-count on invalidation, burst animation on interaction only, rollback + inline retry with `role=alert` — verified live (0→1, aria-pressed flip).
- **Jobs apply** (JobsPage.tsx:55-135): server-truth `appliedJobIds` seeding, optimistic badge, inline error row, hover-revealed actions with `focus-within` + `@media (hover:none)` parity (components.css:789-795) — verified end-to-end.
- **Honest-data discipline**: trending derived + hidden when empty; KPI pending→`…`/error→`—` everywhere; AR/VR dead button removed rather than faked; payment page refuses invented figures; trending subtitle states its sample («آخر 20 منشوراً»).
- **ARIA craft**: community + achievements tablists implement the full pattern (roving tabindex, RTL arrow contract verified, id/aria-controls); chat `role=log` + `aria-live` + sr typing text; gap cards honest skeleton→error→absent ladder.
- **Contrast discipline**: 26/28 measured pairs pass AA in both themes; badge rarity colors contrast-gate via `color-mix(… 60%, var(--text))` (training.css:595-600).
- **Touch floors**: 44px honored on post-action, chat-send/input, quick chips, campus rows, event buttons, composer error buttons (student.css:2061-2072).
- **Focus rings**: 2–3px solid accent-strong (light) / cream (dark) — measured visible on composer + post-action.

## Top-10 quick wins (fix-wave order)

1. Add the missing `.announcement-*` CSS family (P1-1) — biggest visual delta on the page for ~30 lines.
2. `.ai-gap-pct` → `--warning-ink` (P1-2) — one line, AA restored.
3. Trending Card `align-self:start` (P2-1) — one line.
4. `.campus-city-row.on .campus-city-count { color: var(--accent-strong) }` (P2-3) — one line.
5. Un-like affordance: label fix or unlike implementation (P2-2).
6. `.grid-4` 2×2 at ≤640px (P2-4) — coordinate with A10.
7. Theme pre-paint resolution in `index.html` + action-gated push (P2-5) — coordinate with A11/A12.
8. «L2» → «مستوى ٢» + XP unit unification (P3-1/2).
9. Schedule today-marker + today-anchored ordering (P3-6).
10. Trending tags → links to filtered feed (P3-4).

## Files to touch

- `frontend/src/pages/community/CommunityPages.tsx` (P1-1 markup, P3-3/4/5/7)
- `frontend/src/styles/student.css` (announcement family §misc, `.ai-gap-pct`, `.campus-city-count`, trending rail)
- `frontend/src/pages/student/MorePages.tsx` (P2-2, P3-1/2/4/6)
- `frontend/src/pages/student/ProfilePage.tsx` (P2-4)
- `frontend/src/styles/polish.css` (`.grid-4` mobile, `.announcement-*` if placed here)
- `frontend/src/hooks/useThemeProfileSync.ts` + `frontend/index.html` (P2-5 — cross-wave with A11/A12)
- Cross-ref A10 wave: `auth.css`, `components.css` (.input), `student.css:1900`, `polish.css:1781` (16px input floor)

*Audit only — zero source edits, zero git ops. Demo-state side effects from probes (noted for transparency): one job application (تدريب صيفي — برمجة Python), one event RSVP (سأحضر), one post like — all server-persisted; student theme preference restored to LIGHT after the P2-5 incident.*
