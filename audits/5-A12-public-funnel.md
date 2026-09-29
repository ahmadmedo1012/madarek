# 5-A12 — The public funnel at the 9+ bar (الحرفة الختامية · Campaign 5)

**Agent:** 5-A12 · **Scope:** the GUEST→REGISTERED journey and the craft of the university's social face — `/student/social` (feed/composer/reactions), `/community` ×4 role mounts (announcements/competitions/events + RSVP), `/competitions` + `/:id` + enter flow, `/colleges` + `/:id` + `/leaderboard` (guest journey), `/vision` + `/:slug`, and the cross-surface layer (timestamps, avatars, empty states, titles/SEO, a11y) — + `App.tsx` routing/`CollegesLayout`, `backend/social.routes.ts` where the funnel's data contract lives.

**Method:** code pass over 6 scope files (CollegePages 871 · CommunityPages 725 · CompetitionsPages 753 · VisionPages 304 · MorePages SocialPage ~280 · social.routes.ts 704 + routing/layout) · **live probes p1–p13** (`/tmp/a12-probes/*.mjs`, data JSONs `data-p*.json`, shots `/tmp/madarek-shots/a12/` ×22) with global playwright 1.63 · guest = no storageState, registered = `/tmp/madarek-states/student.json` (refresh-cookie path) · **clock probes** (`page.clock.setFixedTime`) for exact deadline-boundary behavior — no DB time-travel needed · RSVP + competition-enter flows exercised live (2 documented DB touches, §8) · 3 VLM batches × 3 images = 9 screenshots, **every claim re-measured in DOM** (ledger §7). AUDIT-ONLY — zero source edits, zero git ops.

**Sibling cross-refs (NOT duplicated here):** A8 P1-1 vision invented statistics ×30 · A8 P1-2 college-detail dead-campus empty sections · A8 P2-5 vision disclaimer overpromise · A8 P2-6 public zero-chips on gallery cards · A8 P3-1 leaderboard mobile phone-book (10,307px — re-measured identical) · A8 §7.7 competitions «0 مشترك» hero meta (extends to the community tab here, noted in P2-3 evidence only) · A5 P1-1 colleges toolbar overflow @390 (**re-verified still open**: toolbar 317px + doc overflow 174px measured today) · A9 states P1s (notif error branch, bare spinners incl. community×3) · A10 P2-3 unwired create-modal errors (competitions create/enter) · A10 P1-1 student authoring discard-guard gap · A11 P2-2 accent-as-text family (my P2-5 is a new instance, cross-filed) · A4 P2-7 pattern-generic docTitles (my P3-6 adds funnel evidence).

---

## 1. Journey map — where the funnel leaks

The genuinely public surface set is `/colleges*` only (App.tsx:354-358, ruling #9). `/vision*`, `/competitions*` sit behind a bare `ProtectedRoute` (App.tsx:342-350); `/community` is role-mounted (student/teacher/admin/quality); `/student/social` is STUDENT-only. Verified live: a guest hitting any of them lands on `/auth` (wall confirmed ×4), and the **return-to works** (guest → `/vision` → login → landed back on `/vision` — verified good).

```
LANDING (9, A1) ──«ابدأ الآن/أنشئ حسابك الجامعي»──► /auth ──► /auth/register «من أنت؟»→8-field form ✓
   │  «تصفّح الكلّيّات 25» trigger measured at 912px — BELOW the 900px fold (p12b)
   │  footer «الكليّات» link — the other entry
   ▼
/colleges (guest, chrome-less) ── L1: entry below-fold + footer-only
   │  25 cards, URL-synced filters ✓, skeleton ✓ — but 24/25 zero-chips (A8 P2-6)
   │  L2: two card height classes 223/260px (P3-2); toolbar 317px @390 (A5 P1-1)
   ▼
/colleges/:id ── L3: THE BIGGEST LEAK — 0 auth links on the page (measured);
   │  a prospective student who found their faculty has NO «سجّل الآن» moment;
   │  5 empty sections on data-thin colleges (A8 P1-2); hero = emoji+eyebrow+title;
   │  L4: competitions/events/announcements render as NON-LINK divs/li (CollegePages.tsx:660-675, 615-630, 589-604)
   │  — the college detail is a dead-end hub: nothing onward is clickable
   ▼
/colleges/leaderboard (guest ✓) ── L5: NO link back to /colleges gallery (measured link census:
   │  only "/" + 25 college rows); sort/medals/dead-columns all verified working;
   │  no top-3 podium/highlight; mobile = 10,307px (A8 P3-1)
   ▼
/auth wall (for community/vision/competitions) ── L6: student life invisible pre-registration
   │  (product decision — but the funnel pays for it: the university's "social face"
   │  has no public preview at all)
   ▼ REGISTERED (student)
/student/social — feed works; L7: draft lost on reload AND SPA-nav (measured); no emoji affordance;
   │  no un-like (known hand-off); no replies (removed dead control — no thread surface exists)
/community — L8: RSVP state invisible after reload (P2-2); RSVP count includes «لن أحضر» (P2-1);
   │  past-deadline competition shows FALSE «تم التحكيم» badge (P2-3); mobile: 396px KPI stack (P2-4)
/competitions/:id — L9: «تعديل مشاركتي» opens an EMPTY create-form (P1-1) — the entrant journey's
      payoff is broken one click after registration; no withdrawal path (P3-5 note)
```

**Funnel verdict:** the wall-to-wall journey works mechanically (all links resolve, return-to honors `state.from`, register form complete with 34-option faculty select), but the *persuasion* layer leaks at every branch: the public pages don't ask for the registration they exist to serve, the social proof surfaces are login-walled, and two of the three post-registration payoffs (RSVP reflection, entry editing) are broken.

---

## 2. Per-surface verdict table

| Surface | Score | Verdict (measured) |
|---|---|---|
| **Guest journey (funnel-level)** | **6.0** | Mechanically sound, persuasively empty: 0 auth CTAs on all public pages (×3 measured), colleges entry below fold (912px), one-directional links (leaderboard ↮ gallery), college detail = dead-end hub (0 outbound content links), social life 100% login-walled. |
| /student/social | **7.5** | Honest states (skeleton/error/empty ✓), viewerReacted seeding ✓, optimistic like with rollback (A9-verified), trending rail hugs content. But: draft lost on reload+nav (measured), no emoji affordance (every other authoring surface has an icon picker), hashtag accent 3.8:1 @11px (P2-5), feed = N identical 184px cards — no conversation depth (no replies exist). |
| /community (student mount) | **8.0** | Tabs ARIA-complete (RTL arrows/Home/End), pinned-first server order verified, pinned card accent treatment, honest KPI trio, discard-guarded create modals. Open wounds: RSVP count semantics (P2-1), RSVP reflection (P2-2), false past-deadline label (P2-3), 396px mobile KPI stack (P2-4). C4's 8.5 assumed the RSVP flow worked; it half-doesn't. |
| /competitions | **8.0** | Honest KPIs («تنتهي قريباً=0» measured true), status pills with counts grammar, filter-empty reset action ✓, backend order sensible (OPEN→deadline). No sort affordance; no category facet (7 categories exist in data). |
| /competitions/:id (entrant) | **7.5** | Enter flow: validation ✓ → success → count 0→1 ✓ → button flips ✓. But the edit modal is a broken empty create-form (P1-1), no withdrawal, boundary contradiction (P2-3), 111px of air over the empty-entries state, generic docTitle. |
| /competitions/:id (organizer) | **8.5** | (A8's verdict — confirm dialogs with unscored-count copy, score input with inline retry, rank pulse; out of my deeper scope, unchanged.) |
| /colleges (guest) | **7.5** | A8's verdict stands; my additions: two card height classes (P3-2), no per-page title for guests (P2-6), funnel context (§1). Toolbar still 317px/174px @390. |
| /colleges/leaderboard (guest) | **8.0** | Sort `aria-sort` + re-order re-verified live (papers → IT first); 4 medals on 4 live columns, 50 dead cells muted; 25 rows. Missing: podium/top-3 emphasis, gallery back-link, per-page guest title. |
| /colleges/:id (guest) | **7.0** | A8 P1-2 dominates; my additions: 0 auth CTAs, 0 outbound content links, generic guest title. The university's front door neither converts nor navigates. |
| /vision | **7.5** | Honest status KPIs (2/3/5/2 from data), honest empty guard. But 12 perfectly uniform 164px cards in a flat grid — statuses interleave (نموذج أولي، نموذج أولي، تخطيط…) with no grouping and no lead story (P3-4). |
| /vision/:slug | **7.0** | Beyond A8's invented-stats P1: the reading experience itself — sole prose is 13px muted at 1134px measure (P2-7), 0 h2s, 0 images, no TOC/read-time, generic title. A spec sheet, not an article. |

---

## 3. P1 — Major

### P1-1 · «تعديل مشاركتي» opens an EMPTY create-form — the edit flow is broken for every non-organizer entrant
- **Where:** `frontend/src/pages/competitions/CompetitionsPages.tsx:433` (`existing={myEntry?.body !== undefined ? { title, body } : undefined}`) × `backend/src/http/routes/social.routes.ts:82-83` (`toPublicEntryView` strips `body`/`fileUrl` from every entry for non-organizers, :420).
- **Evidence (live, student, p4b):** entered the hackathon (modal validated ✓, submitted ✓, hero flipped to «تعديل مشاركتي» ✓, count 0→1 ✓) → clicked «تعديل مشاركتي» → modal renders **h2 «تقديم مشاركة», prefilled title "", body length 0, submit «إرسال»** (should be «تعديل مشاركتي»/prefilled/«حفظ التعديلات»). `myEntry` IS found (the button label proves it — name-fallback :258-262 matched), but the public payload never ships `body`, so `existing` is always `undefined` for the only roles that can enter. A student who submits from this blind form silently **overwrites their entry** (backend upserts on `competitionId_userId`, :470-477 — no duplication, but no preservation either: the previous text is unrecoverable and invisible).
- **Impact:** the entrant journey's payoff — submit, then refine — is broken for 100% of non-organizer users. One click after registration, the funnel hands back a form that lies about what it will do.
- **Fix sketch:** BE (preferred, ~6 lines): in `/competitions/:id`, map the requester's own entry through a `mine`-flagged view (`isOrg ? e : (e.userId === req.user.id ? e : toPublicEntryView(e))` — the full row is already selected; only the view function gates it. The FE comment :254-257 already asks for `userId`). FE: build `existing` from the un-gated own-entry, and the modal title/ariaLabel/submit label correct themselves.

### P1-2 · The public funnel has no forward path — zero auth CTAs on the university's public pages, links point one direction only
- **Where:** `frontend/src/App.tsx:172-183` (`CollegesLayout` guest container renders ONE back-link to `/` and nothing else) × `CollegePages.tsx` (no auth link anywhere on gallery/detail/leaderboard) × `LandingPage.tsx:380-387` (colleges trigger at 912px, below a 900px fold; footer :948 the other entry).
- **Evidence (measured, guest):** `/colleges` auth links = **0** (link census p1c); `/colleges/:id` auth links = **0**, register-mention count = **0**; leaderboard's only non-college link is `/`; landing's «تصفّح الكلّيّات» trigger top = **912px** in a 900px viewport. A prospective student who finds كلية تقنية المعلومات and wants in must: notice the footer link → go back to the landing → find /auth → register. No page in the public set says «انضم» anywhere.
- **Impact:** the funnel's conversion moment — "I found my faculty, now I sign up" — simply doesn't exist. The public pages inform but never ask.
- **Fix sketch (FE-only, ~½ day):** (a) guest `CollegesLayout` gets a slim chrome: brand mark + «تسجيل الدخول» ghost + «أنشئ حسابك» primary (the landing's own button grammar — the auth pages already accept the traffic); (b) cross-links: leaderboard header ↔ gallery (one Link each way); (c) college detail: a closing band «هل هذه كلّيتك؟ أنشئ حسابك الجامعي» (auth-link card, honest — registration is genuinely open). Optional (product ruling): a public read-only preview of community/competitions would close L6, but that's a bigger decision than this wave.

---

## 4. P2 — Minor

### P2-1 · RSVP display count includes declines against capacity — «لن أحضر» inflates «N / capacity»
- **Where:** `backend/src/http/routes/social.routes.ts:630` (`_count: { select: { rsvps: true } }` — ALL statuses) vs `:684` (capacity check counts `status: 'GOING'` only) × `CommunityPages.tsx:341` (`{e._count.rsvps} / {e.capacity}`) and `CollegePages.tsx:624` (same pair on college detail).
- **Evidence (live, p3):** clicked «لن أحضر» on the 60-capacity workshop → count went **«0 / 60» → «1 / 60»** while goingCount = 0. Ten NO-replies on a 10-capacity event render «10 / 10» — a "full" event nobody is attending.
- **Fix sketch:** filtered relation count (Prisma ≥4.16 GA): `_count: { select: { rsvps: { where: { status: 'GOING' } } } }` — or ship `goingCount` explicitly; FE unchanged (display the GOING number; MAYBE/NO can ride a tooltip if ever needed).

### P2-2 · RSVP state invisible after reload — the pressed state is session-local only
- **Where:** `CommunityPages.tsx:296-320` (`mine` is `useState`, seeded `null`; the comment admits "the event row carries no 'my RSVP' field from the API").
- **Evidence (live, p3):** after RSVP'ing NO (and the pre-existing seeded GOING on event 1), a reload renders **all three buttons `aria-pressed="false"` on every event** — the user's earlier answers leave no trace. A returning student cannot tell which events they already answered; re-answering is an upsert so no data corruption, but the UI silently forgets them.
- **Fix sketch:** BE: include `myRsvp` in `/events` rows (the `viewerReacted` pattern on posts already ships per-viewer truth — MorePages.tsx:771-778 consumes it; the same 4-line include does it). FE: seed `mine` from the field, keep the local optimistic toggle on top.

### P2-3 · Past-deadline OPEN competition shows contradictory labels — and a FALSE «تم التحكيم» on the community tab
- **Where:** detail: `CompetitionsPages.tsx:57` (`formatDeadline` → «انتهى») beside `:284` (Badge = `STATUS_COLOR[c.status]` → green «مفتوحة») with `:263` `canEnter=false` removing every action; community tab: `CommunityPages.tsx:278` (`c.status === 'CLOSED' ? 'مغلقة' : 'تم التحكيم'` — the else branch assumes CLOSED|JUDGED, but `isOpen` at :251 also fails for past-deadline OPEN).
- **Evidence (live, clock probe at deadline T+1s, p6b):** detail hero renders **green «مفتوحة» + «انتهى» + zero buttons**; the same competition on `/community`'s competitions tab renders **amber «تم التحكيم»** — a status the competition does not have. Two surfaces, two wrong labels for the same state. (12h-before probe: «ينتهي اليوم» + edit button — the 15-h P1-4 floor semantics verified correct.)
- **Fix sketch:** one derived display-status helper (`status === 'OPEN' && deadline <= now → 'ended'`), consumed by both surfaces: neutral grey «انتهى التقديم» badge, deadline label «انتهى», and (organizer-side, FE-only) a «إغلاق المسابقة» nudge since the backend is still accepting the organizer's close action.

### P2-4 · /community mobile: 396px of stacked single-number KPI tiles push every real card below the fold
- **Where:** `CommunityPages.tsx:135-139` (`.grid-3` KPI trio) × `grid-3` doesn't reflow at ≤640 (components.css grid family).
- **Evidence (measured @390, p8/p11):** three full-width 132px tiles stack (396px total); the tabs land at **679px** and the first announcement/event card starts below **700px** on an 844px screen — the community's actual content is entirely below the fold. (VLM batch-3 independently flagged it; re-measured and confirmed.)
- **Fix sketch:** at ≤640 the trio collapses to one horizontal stat strip (3 inline chips, ~40px — the `.metric` family already has a compact form on the student dashboard) or a 3-col mini-grid of small tiles; the same rule serves the competitions index trio.

### P2-5 · Social hashtags render accent-on-white at 11px — 3.8:1 (AA fail)
- **Where:** `frontend/src/pages/student/MorePages.tsx:958` (`<span className="text-xxs font-mono" style={{ color: 'var(--accent)' }}>#{t}</span>`).
- **Evidence:** computed `#B57438` on `#FFFFFF` at 11px = **3.8:1** (dev-axe fired it live; re-measured in DOM, settled state — not the transient class). Same family as A11 P2-2 (accent-as-text on profile).
- **Fix sketch:** one token swap — `var(--accent-ink)` is the designed text-on-accent pair (A11's own fix for the sibling instance).

### P2-6 · The only crawlable pages carry no per-page document title for guests
- **Where:** `frontend/src/components/layout/AppShell.tsx:272-284` (the docTitle effect is mounted inside the shell) × `App.tsx:172-183` (guests on `/colleges*` never get the shell). `PAGE_TITLES` **already contains** `/colleges: 'كلّيّات الجامعة'`, `/colleges/leaderboard: 'منافسة الكلّيّات'`, and the `كلّيّة` pattern (AppShell.tsx:72-73,107) — they simply never execute for guests.
- **Evidence (measured):** guest `/colleges`, `/colleges/:id`, `/colleges/leaderboard` all ship the static `index.html` title «مدارك · منصة التعليم الذكي · جامعة الزاوية»; the authed surfaces all get dynamic titles. h1s are correct on all three — only the title layer is missing.
- **Fix sketch:** hoist the title effect out of the shell (a tiny `useDocumentTitle(pathname)` at router level, or set it inside `CollegesLayout` for the guest branch — the map already exists, this is a 5-line move).

### P2-7 · Vision article reading experience: the only prose is 13px muted at a 1134px measure — a spec sheet, not an article
- **Where:** `frontend/src/pages/vision/VisionPages.tsx:158-162` (description: `<p className="text-sm" style={{ color: 'var(--text-muted)' }}>` inside a full-width `Card`) × `lib/vision.ts` (long-form content: descriptions 130-200 chars, 4 features, 3 steps, use-cases).
- **Evidence (measured @1440):** description renders **13px / rgb(110,108,101) / 1134px wide** (~130+ chars per line — taste.md's measure band is 45-75ch), while the page's *numbers* render 30px/700 (metric grammar). The page has **0 h2s, 0 images, no TOC, no read-time** (all measured) — the only typographic hierarchy on the "article" page is chip → h1 → small muted paragraph. The subtitle carries `maxInlineSize: 580` (:154) but the body doesn't.
- **Fix sketch:** article treatment for the description: body-size (`--type-body-*`), 65-70ch measure (`maxInlineSize: '68ch'`), `--text` not `--text-muted`, drop the Card chrome for plain reading space, and let `features`/`steps` titles carry h2s (the data already has them). TOC/read-time only if articles grow past ~600 words — today they don't; the measure + size fix is the whole story.

---

## 5. P3 — Polish

### P3-1 · Five date grammars tell time five ways across one funnel
- **Where (live census):** social posts «منذ 7 ساعات» (`timeAgoAr`) · /community announcements «25 سبتمبر» (absolute `formatDate`) · college-detail announcements «اليوم/غداً» (`formatRelative`, CollegePages.tsx:140-149) · competitions «بعد أسبوعين / ينتهي اليوم / 13 يوماً متبقياً» (`formatDeadline` + community-tab variant) · events «الاثنين، 28 سبتمبر 10:49 م» (`formatDate+formatTime`).
- **Evidence:** every formatter is individually correct and the ar-LY counted nouns are exemplary («يومان متبقيان») — but the same event's story changes grammar 3 times between surfaces, and announcements show an absolute date on /community and a relative one on the college page *for the same row*.
- **Fix sketch:** no code change required day-one — write the contract down (a surface→grammar table in `lib/format.ts`'s header), then align announcements to one grammar (relative ≤7d, then absolute) — the post-feed's `timeAgoAr` already implements it.

### P3-2 · Colleges gallery cards come in two heights (223 / 260px) — long English subtitles wrap
- **Where:** `CollegePages.tsx:340` (`.college-card-sub` renders `nameEn` un-clamped) × seeded long names («Physical Education & Sports», «Information Technology»).
- **Evidence (measured):** first 8 cards = heights [223×4, 260×4]; all 25 cards carry an English sub (VLM batch-1 flagged the visual raggedness; re-measured — CONFIRMED). The English sub is also the C4 "metadata noise" note: on an Arabic-first prospective-student surface, the second line of every card is English metadata.
- **Fix sketch:** single-line the sub (`text-overflow: ellipsis` + `title` attr — the craft floor's truncation rule) and fix the sub's block height; longer term, the Arabic-first card could demote `nameEn` to a `title` tooltip entirely (ruling needed — same family as A8 P2-6's public-chip ruling).

### P3-3 · Social composer: draft lost on reload AND SPA nav; the only authoring surface without an affordance palette
- **Where:** `MorePages.tsx:769` (`const [draft, setDraft] = useState('')`) — no persistence; no emoji/icon picker (every sibling authoring surface has `comp-icon-picker`: announcements `ANN_ICONS`, events `EVENT_ICONS`, competitions `ICON_CHOICES`).
- **Evidence (measured):** typed draft survives neither reload (before «مسودة اختبار 5-A12» → after `""`) nor SPA nav-away-back (`""`). The hashtag placeholder invites markup the composer gives no help for.
- **Fix sketch:** `sessionStorage` draft key (debounced `useEffect`, ~8 lines) + adopt the existing icon-picker pattern (sticker-flavored spots are EmojiIcon's stated purpose). Discard-guard not needed for an inline composer, but a «مسودة محفوظة» hint is.

### P3-4 · Vision hub: 12 perfectly uniform 164px cards, statuses interleaved, no grouping, no lead story
- **Where:** `VisionPages.tsx:95-112` (flat `VISION_CONCEPTS.map` in `.grid-3`) — the `grouped` object (:51-56) feeds only the KPI counts (:87-90), never the grid.
- **Evidence (measured):** all 12 cards exactly 164px, one height class; DOM order = array order («نموذج أولي، نموذج أولي، قيد التخطيط، نموذج أولي…») — the hub tells no status story; the story lives only in the 4 KPI tiles. VLM batch-2's "software list, not roadmap" read is directionally fair (its specific card-missing claims were disproven — §7).
- **Fix sketch:** group the grid by status (beta → prototype → planning → research) with 4 section headers, or lead with a «جرّبها الآن» band over the 2 beta concepts and keep the rest as the grid — the data is already in `grouped`; it's a render-order change plus 4 headers.

### P3-5 · Competition empty-entries card carries 111px of air over a 3-line message; no withdrawal path for entrants
- **Where:** `CompetitionsPages.tsx:350-361` (EmptyState inside a full-width Card) · no withdrawal endpoint exists (searched — `withdraw` measured `false` in DOM and no route in social.routes.ts).
- **Evidence (measured):** entries card = 387px tall for the 251px empty state, 111px blank above; VLM's "40-50% blank" claim measured down to 28% — real but smaller.
- **Fix sketch:** compact EmptyState variant (or rules/prize recap beside it while empty). Withdrawal: a product decision, not a bug — an entrant who misclicks can only overwrite (P1-1 makes even that blind); if the fix wave touches P1-1's BE, a `DELETE /competitions/:id/entries/mine` while OPEN is a 10-line sibling.

### P3-6 · Pattern-generic docTitles on funnel detail pages (A4 P2-7 extended with funnel evidence)
- **Where:** `AppShell.tsx:92,107-108` — `/competitions/:id` → «مسابقة · مدارك» (every competition), `/vision/:slug` → «ابتكار قادم · مدارك» (every article) while both h1s carry real names («هاكاثون منصة الزاوية الأول»).
- **Fix sketch:** title-from-payload once data lands (one `useEffect` per page, both already have the data at render).

---

## 6. «To 9+» plans (ordered, effort-tagged)

### Community 8.0 → 9.5
1. **P2-1 + P2-2 (the RSVP truth pair, ~½ day incl. BE):** filtered GOING count + `myRsvp` field. These two fix the only dishonest surfaces left on the page — counts honesty is the platform's stated religion.
2. **P2-4 mobile KPI strip (~1h CSS):** the community's first paint on a phone becomes content, not tiles.
3. **P2-3 display-status helper (~1h):** kills the false «تم التحكيم» and the green-«مفتوحة»-after-«انتهى» contradiction in one place.
4. **Feed rhythm (design, ~½ day):** the announcements tab deserves ONE featured treatment — the pinned card rendered larger (accent band already exists) instead of a uniform 156px×4 stack; events deserve a date-block card (day number + month chip on the inline-start edge) instead of emoji-square + text — the data (startsAt) already carries the hierarchy.
5. **P3-3 composer package (~2h):** draft persistence + icon picker = the student's cheapest "this platform cares" moment.
6. The 9.5 ceiling needs product: replies/threads (no post-comment API exists — the dead comment button was removed honestly in 22-c). Until then the feed is a notice board, not a network.

### Colleges (guest funnel) 7.0-8.0 → 9
1. **P1-2 guest chrome (~½ day):** brand + login + register on every public page — the single highest-leverage FE change in this audit.
2. **P2-6 titles (~1h):** the map exists; mount it where guests live.
3. **A8 P1-2 + P2-6 (already filed, one ruling):** collapse empty sections on the public mount + suppress zero chips. Nothing else moves the guest's first impression further.
4. **Dead-end hub → cross-links (~1h):** comp cards on college detail become `<Link to={/competitions/:id}>` (they already render for authed users too); leaderboard ↔ gallery header links ride P1-2.
5. **Leaderboard podium (~½ day):** top-3 rows get rank emphasis (larger name, medal chip inline-start, subtle accent wash) — the data and medal components exist; it's a row-class change. Mobile condensation is A8 P3-1's fix (chosen-metric-only cards).
6. **P3-2 card sub (~15min):** single-line the English names; the grid stops ragged.

### Competitions 8.0 → 9
1. **P1-1 own-entry view (~½ day incl. BE):** the entrant journey's spine.
2. **P2-3 boundary truth (~rides the helper).**
3. **Index craft (~½ day):** sort affordance (deadline/entries — both in payload), category facet (7 categories, counts grammar via `countAr`), and «كونك أول المشاركين» copy where `_count.entries === 0` (A8 §7.7's fix, one conditional).
4. **P3-5 compact empty (~15min)** + optional withdrawal (product).

### Vision 7.0-7.5 → 9
1. **A8 P1-1 + P2-5 copy truth pass (already filed, ~1h):** targets, not measurements.
2. **P2-7 article typography (~2h):** body-size prose at 68ch, real `--text`, h2s from data — the page becomes readable before it becomes believable.
3. **P3-4 status-grouped grid (~1h):** `grouped` already computed; render it.
4. **P3-6 + P2-6 title-from-payload.**
5. Long-term (product): one real image per beta concept (2 concepts) — «الترجمة الفورية» and «المساعد البحثي» are live; a screenshot is honest content the invented metrics never were.

---

## 7. VLM claim ledger (3 batches, 9 images; every claim re-measured)

| # | Claim | Verdict | Measurement |
|---|---|---|---|
| 1 | Gallery chips "don't follow a grid, uneven spacing" | **DISPROVEN** | all chip gaps exactly 8px (computed + measured ×6) |
| 2 | Sports college card 2 lines vs 1 — ragged grid | **CONFIRMED** → P3-2 | two height classes 223/260px |
| 3 | Arrow icon "dominates over data" | Discounted | 18px icon vs 18px/700 name — standard sizes |
| 4 | Zero chips read as dead platform | **CONFIRMED** (cross-ref A8 P2-6) | 24/25 cards studentCount=0 |
| 5 | Back button "floating, no context" | Discounted | 173px ghost, the A14 idiom |
| 6 | KPI "6" bold vs muted texts imbalance | Discounted | 30px/700 metric grammar by design (but see P2-7 for where it IS wrong) |
| 7 | KPI→sections gap "too big" | **DISPROVEN** | 60px = the page's 40px rhythm + standard offset |
| 8 | Social "30/70 imbalance, right side empty" | Partial | grid-2-1 by design (773/387px); thin content is data (2 posts) |
| 9 | Comment text "very light gray" | **DISPROVEN** | post-time = ink rgb(25,25,24) |
| 10 | "AI black button at top" | Discounted | app-shell sidebar nav, misattributed to the page |
| 11 | Event cards "asymmetric heights" | **DISPROVEN** | all exactly 210px |
| 12 | Event meta "crowded one line" + «مقعد متبقي للطلاب» | Partial / fabricated quote | one-line meta real (29px); quoted copy does not exist |
| 13 | Title→KPI gap vs KPI→tabs "illogical" | **DISPROVEN** | 80/60px — the taste-correct direction (more above the group boundary) |
| 14 | Community reads "admin dashboard, not social hub" | Confirmed (direction) | folded into §6.4 design plan |
| 15 | Vision cards "some missing badge/description" | **DISPROVEN** | 12/12 have both, all 164px |
| 16 | KPI numbers "misaligned" | **DISPROVEN** | grid MetricCards, uniform |
| 17 | Subtitle "wall of text" | **DISPROVEN** | 1 line, 23px |
| 18 | Vision h1 "too heavy" | Discounted | 40px page-title system |
| 19 | "Huge gap" description→metrics | **DISPROVEN** | 60px standard |
| 20 | "89% dominant vs قائم weak" | Partial | scale real (30px vs 12px labels); «قائم» fabricated → folded into P2-7 |
| 21 | Sections «المحاور»/«كود نموذج» exist | **FABRICATED** | real: المميزات، كيف تعمل، الاستخدامات المحتملة |
| 22 | Entries area "40-50% blank" | Partial → P3-5 | 28% measured (111px of 387px) |
| 23 | Send icon "confusing" | Discounted | standard submit affordance |
| 24 | Hero "unstable tilted axis" | **DISPROVEN** | start-aligned RTL, `justify-content: normal` |
| 25 | Mobile college h1 "same weight as subtitles" | **DISPROVEN** | h1 30px/700 vs eyebrow 11px/400 |
| 26 | Mobile KPI cards "crammed" | **DISPROVEN** | 12px gaps, 132px tiles |
| 27 | Mobile KPI stack "wastes a third of the screen" | **CONFIRMED** → P2-4 | 3×132px = 396px; tabs at 679px |
| 28 | Active tab "too weak" | Discounted | border + weight 600 + ink-color tri-signal |
| 29 | «إبدأ المشاركة...» faint text on events | **FABRICATED** | no such string on the events tab |
| 30 | «المرافق / كتابة الملاحظات» texts | **FABRICATED** | no such strings on college detail |

**Score: 4 fully confirmed + 5 partial / 30 — the C4/C5 base rate (~50-70% wrong) holds; every filed finding carries DOM evidence.** Also documented: the recurring dev-axe contrast hits on `/colleges` load (#76746d / #797770 / #797771 — three *different* values across runs, zero matches in settled DOM) are the A8 P3-6 transient-skeleton noise class; the settled 12px muted text (#6E6C65) measures 5.04:1 — pass.

---

## 8. Verified-good (do not regress) + disclosures

- **Return-to honors the wall:** guest → `/vision` → login → back on `/vision` (live-verified with a fresh login; `AuthPage.tsx:85-112` reads `state.from` safely — in-app paths only).
- **Enter-flow mechanics:** empty-submit zod errors («العنوان قصير»، «الوصف قصير»), pending-disabled submit, success → count 0→1, hero button flip, reload-stable — all measured. Double-enter protection is server-side upsert (sound); the *edit* experience is what's broken (P1-1).
- **Deadline floor semantics:** «ينتهي اليوم» at 12h-out (clock probe) — the 15-h P1-4 fix verified live.
- **Leaderboard:** sort `aria-sort` + re-order (papers → كلية تقنية المعلومات first), 4 medals on 4 live columns only, 50 dead cells muted — all C4/C5 fixes surviving.
- **Community chrome:** tabs ARIA-complete with RTL arrow contract; pinned-first server ordering (`orderBy: [{pinned: 'desc'}, {publishedAt: 'desc'}]`, social.routes.ts:198/241); pinned card accent treatment; discard-guarded create modals (15-e contract); RSVP 44px touch targets @390 (measured).
- **Honesty family:** KPI ellipsis/dash degradation, «تنتهي قريباً=0» true, competitions filter-empty reset action, gallery URL-synced filters + polite live region + no-result reset, events `endsAt >= now` filtering.
- **Cross-surface:** avatars initials-only everywhere (consistent, honest — no fake photos); guest college anonymization «أحمد ز.» still intact; ar-LY counted nouns exemplary throughout («طالب واحد · أستاذ واحد»).
- **DB touches (for the orchestrator — both reversible via psql if undesired):** (1) one competition entry on «هاكاثون منصة الزاوية الأول» as the seeded student — title «مشاركة اختبار التدقيق 5-A12» (CompetitionEntry row); (2) the student's RSVP on «ورشة عمل: مهارات البحث العلمي» — final state GOING (probed NO first to measure P2-1, then switched to GOING). Both are plausible demo data; the competitions KPI now reads «إجمالي المشاركات=1».

## 9. Files to touch (fix wave)

- `backend/src/http/routes/social.routes.ts` — P1-1 (own-entry view), P2-1 (filtered GOING count), P2-2 (`myRsvp`), (optional P3-5 withdrawal)
- `frontend/src/pages/competitions/CompetitionsPages.tsx` — P1-1 FE, P2-3, P3-5, P3-6, §6.3
- `frontend/src/App.tsx` (`CollegesLayout`) + `pages/colleges/CollegePages.tsx` — P1-2, P2-3 community-part rides CommunityPages, P3-2, §6-colleges (cross-links, podium)
- `frontend/src/components/layout/AppShell.tsx` — P2-6 (title effect hoist)
- `frontend/src/pages/community/CommunityPages.tsx` — P2-2 FE seed, P2-3, §6.4 design
- `frontend/src/pages/student/MorePages.tsx` — P2-5 (one token), P3-3
- `frontend/src/pages/vision/VisionPages.tsx` — P2-7, P3-4, P3-6
- `frontend/src/styles/components.css` (or student.css) — P2-4 mobile KPI strip
- `frontend/src/lib/format.ts` — P3-1 (documentation contract)
