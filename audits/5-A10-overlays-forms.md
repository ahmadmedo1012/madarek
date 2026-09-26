# Audit 5-A10 — Overlay Platform + Forms Craft (الحرفة الختامية, Campaign 5)

**Scope:** `components/overlays/**` (Modal, Sheet, Toast, Dropdown, Popover, Tooltip,
CommandPalette, Lightbox, NotificationPanel + the shared hooks), `components/primitives/**`
(Form/Button/Input/FormField, States cross-ref), `components/owner/ToggleSwitch.tsx`, and the
app forms (auth, register, profile, assignment submission, research upload, exam authoring,
grading modals, community composer, competitions, filters).
**Method:** live at http://localhost:5173 (playwright 1.63 global, chromium), 1440×900 +
768×1024 + 390×844 (mobile+touch contexts), storageStates from /tmp/madarek-states. This run
audited a **prior interrupted 5-A10 run** (probe scripts + 12 data files at /tmp/a10-probes/,
03:10–03:32, no screenshots/no audit written) — all of its load-bearing claims were re-verified
live; 1 was **disproven** (§Corrections). New probes V1–V9 + data files `v1v2-data.json`,
`v3v4v6-data.json`, `v6b-v7-v8-data.json`, `v4-data.json`, `v9-data.json`; shots
/tmp/madarek-shots/a10/. Zero source edits, zero git operations.

**Severity counts: P0×0 / P1×1 / P2×6 / P3×8.**

---

## 1. Per-component verdict table

| Component | Consumers | Verdict | Evidence (measured @1440/768/390 unless noted) |
|---|---|---|---|
| **Modal** | 9+ (community ×2, competitions ×2, ConfirmDialog, grade modal, exam bank ×3, onboarding, submission, upload) | **9.0** | Entrance `madarek-pop` 0.24s decelerate; exit `madarek-modal-out` plays before unmount; **reopen-mid-exit works** (data-closing null, entrance restarts); focus trap cycles (Tab path ×3 viewports); focus restores to trigger («تسليم») on Esc; scroll lock `mdrk-scroll-locked` + `.content` scrollTop preserved (524/2097 constant); backdrop click closes at **1440 + 390 both** (V1 forensics: elementFromPoint = modal-overlay → click → unmounted, lock released); aria role=dialog + aria-modal + aria-label; z 400. |
| **Sheet** | 1 (library filter, ≤640px) | **7.5** | RTL entrance/exit correct: panel docked inline-end = LEFT edge in RTL (x0 w390), mid-entrance transform `matrix(1,0,0,1,−0.96,0)`, exit `−4.58` toward its own edge; focus → «إغلاق التصفية», Esc → trigger, reopen mid-exit OK; scroll lock OK. Held back by mobile ergonomics (P2-2). |
| **Toast / ToastStack** | 12 call sites, app-root mount | **9.0** | role=status/alert + aria-live polite/assertive; z 500; entrance translateY 12px (direction-neutral, stack docked inset-inline-end = bottom-LEFT in RTL, x20 @1440); pause-on-hover (still open after 6.2s hover, dismissed 4649ms after leave); auto-dismiss closing@4801ms/gone@5004ms; error = manual dismiss; RM: duration 1e-05s (global belt); @390 clears bottom-nav by 4px (stack bottom 768 vs nav top 772) + `env(safe-area-inset-bottom)`; swipe-to-dismiss dismisses (goneAfter true); MAX_VISIBLE=4 cap in store. |
| **Dropdown** | topbar user menu (all roles) | **9.0** | z 100 → **promoted 410/415/420 above modal while a blocking layer is open** (scroll-locked body class = signal); first menuitem auto-focused (@390 re-verified: «ملفي الشخصي»); ArrowDown ×2 wraps 3 items, End/Home correct; Tab dismisses + focus returns to trigger (aria «ملف المستخدم»); Esc one-layer via overlayStack; aria-expanded/haspopup synced on trigger. |
| **Popover** | **0 in-app** (unit tests only) | **8.5 platform / n-a product** | Full viewport intelligence (flip/clamp/maxHeight, two-phase measure + rAF refine) — code-audited; no consumer exercises it live. |
| **Tooltip** | sidebar (collapsed desktop) | **9.0** | Hover intent 339ms (300 + jitter); viewport clamp both edges (x1345..1430 in 1440); pointer-events none; aria-describedby merged not replaced; focus shows instantly; Esc closes only when overlayStack empty; gone on leave. @390/768: no tooltips (drawer shows full labels) — correct, no false-hover taps. |
| **CommandPalette** | AppShell (⌘K/Ctrl+K) | **8.5** | Combobox ARIA (role/expanded/controls/activedescendant) + visually-hidden polite count region («خيار واحد»); keyboard-only journey navigates (Ctrl+K → type → Enter → /document/…); RTL Home lands logical-start (dir rtl, pos 0); input 16px; card content-height with 76dvh cap (not fixed); list scrolls internally (overscroll-contain). Held back by matching (P2-4) + no recents (P3-5). |
| **Lightbox** | **0 in-app** (unit tests only) | **6.0 platform** | Bare shell: portal + focus trap + Esc + backdrop + close button. **No zoom, no prev/next arrows, no RTL arrow nav, no loading state** — the API is `children` only. The zoom/keyboard/arrows/loading audit items do not exist to test. |
| **NotificationPanel** | topbar bell (all roles) | **8.5** | Anchored inline-end (RTL-aware): @390 x40..382 (8px clamp), maxH 540, list scrolls internally (sH605/cH415 @390); Esc + focus returns to bell; aria role=dialog + label; trigger aria-expanded/haspopup. Error-branch gap is A9 P1-1 (cross-ref, not re-filed). |
| **Form primitives** (Button/Input/FormField) | Button/Input: RHF forms; FormField: grade modal + curriculum builders | **9.0 / adoption 6.5** | Button loading swaps spinner + keeps accessible name in visually-hidden span + aria-busy + disabled; Input error/loading classes; FormField carries the full association contract (label htmlFor + role=alert error + aria-invalid + aria-describedby injected, measured live in grade modal wiring `:r…-error`). **But 4 form surfaces still hand-roll errors without wiring** (P2-3). |
| **ToggleSwitch** | owner system (seed: 0 flags render 0 switches), exam template builder | **9.0** | Measured inside builder: role=switch, aria-checked, label «ترتيب عشوائي للأسئلة», hit 44×44; CSS thumb travels `translateX(calc(var(--motion-direction) * 18px))` (composited, RTL-correct — C4 21-b hardening confirmed); focus-visible ring; disabled opacity+cursor; described-by id unique per instance (useId). |

---

## 2. Forms census (15 sampled)

| Form | Labels | Error wiring | Timing | Submit machine | Discard guard |
|---|---|---|---|---|---|
| Login (AuthPage) | persistent, 16px | ✅ aria-invalid+described (measured `auth-email-error`) | onSubmit only (blur shows nothing — measured) | pending+focus-first-invalid ✅ | n/a |
| Register student | persistent | ✅ all 7 fields (`:r…-error` measured) | onSubmit | «إنشاء الحساب» (pending verified A9) | n/a (page) |
| Register teacher | persistent | ✅ | onSubmit | ✅ | n/a |
| Profile link editor | persistent | ✅ (`:r4h:-err`) | **onBlur** (measured «أدخل رابطاً كاملاً يبدأ بـ https://») | save disabled until valid ✅ | inline edit |
| Assignment submission (student) | persistent | role=alert ✅ but no aria-invalid | onSubmit (local) | pending «جارٍ التسليم…» ✅ | ❌ **P1-1** |
| Research upload (student) | persistent ✅ | role=alert ✅ no aria-invalid | submit | pending ✅ | ❌ **P1-1** |
| Grade submission (teacher) | FormField ✅ | ✅ full | submit | pending ✅ + done state | ✅ |
| Exam template builder (teacher) | persistent ✅ | role=alert ✅, **no describedby** | submit | pending ✅ | ✅ (code 1144 + prior live) |
| Question form (bank) | persistent ✅ | aria-invalid on 5 fields, no describedby | submit | pending ✅ | ✅ (790) |
| Community announcement | persistent ✅ 16px | ❌ **no wiring** (P2-3) | onSubmit | pending ✅ | ✅ (measured stacked «تعديلات غير محفوظة») |
| Community event | persistent ✅ | ❌ no wiring | onSubmit | pending ✅ | ✅ |
| Competitions create | persistent ✅ | ❌ **no wiring** (measured invalid:null described:null on العنوان/الوصف/الموعد) | onSubmit | «جارٍ الإنشاء…» ✅ + error role=alert | ✅ |
| Competitions enter | persistent ✅ | ✅ score input wired (`${inputId}-err`) | submit | ✅ | ✅ |
| Social composer (MorePages) | aria-label + placeholder (composer-acceptable) | role=alert ✅ draft preserved + retry ✅ | — | disabled-until-text + counter ✅ | page-level |
| Attendance date (teacher) | persistent | ✅ (`att-date-error`) | submit | ✅ | ✅ |

**Craft observations.** Required-field indication follows the correct convention — optional
fields are suffixed «(اختياري)» (الجائزة، رابط الملف، الملاحظات، الملخّص), requirements are
named inside labels («كلمة المرور (8 أحرف على الأقل)», «المدة … بين 5 و 480 دقيقة»), no `*`
noise anywhere. The 16px iOS-zoom floor holds everywhere measured (login, register, composer
selects/textareas 16px; cmd-input 16px; **the two documented hand-offs are resolved**:
social composer student.css:1969-1973 and pdf.css:117/144 both read `max(16px, …)`).

---

## 3. Findings

### P1-1 — Unguarded destructive closes on the two student authoring modals
**Files:** `pages/student/CoursesPage.tsx:335` (submission modal: textarea ≤8000 chars + file
URL), `pages/student/ResearchPage.tsx:377` (research upload: title + abstract + picked file).
**Evidence (live, prior run + code re-verified):** typed a submission answer, pressed Esc →
`modalCount: 0, anyConfirm: false` — the draft is gone with zero confirmation. Same for the
upload modal (`onClose={onClose}` direct, no `useDiscardGuard` import in either file — rg
exit 1). Meanwhile **every teacher-side equivalent guards** (11 `useDiscardGuard` sites:
grade modal TeacherPages.tsx:977 — whose own comment calls feedback "the teacher's longest
unsaved prose" — exam bank ×3, research review, competitions ×2, curriculum ×4). A student's
8000-character answer is the same class of prose. The guard confirm dialog is already the
platform pattern («تعديلات غير محفوظة» + `.btn.danger`, focus lands on «متابعة التحرير» —
measured live in the announcement composer and lecture authoring).
**Fix sketch (~12 lines/consumer):** wrap both modals in
`useDiscardGuard({ dirty: !done && (textAnswer !== '' || fileUrl !== ''), pending: submit.isPending, onClose })`,
route `onClose`/X/Esc through `requestClose`, pass `closeOnEscape={!escapeLocked}`, render
`{guard}`. No new API needed.

### P2-1 — Initial focus lands on the close (X) button in every blocking overlay
**Files:** `overlays/useFocusTrap.ts:53-56` (first `FOCUSABLE_SELECTOR` match), so Modal.tsx /
Sheet.tsx / Lightbox.tsx / CommandPalette.tsx all do it.
**Evidence (live):** modal open → focus = `icon-btn aria-label="إغلاق"` (1440/768/390);
Sheet open → «إغلاق التصفية»; lecture authoring → «إغلاق». A keyboard/SR user's first context
inside a dialog is therefore *“إغلاق, button”* — one stray Enter on open closes the layer
(data-loss-free only where a guard exists; P1-1's two modals have none).
**Fix sketch:** prefer the first **form control** (`input, select, textarea`) over any button,
else focus the card itself (`tabIndex={-1}` on `.modal-card`/`.sheet-panel`) — one change in
`useFocusTrap`'s focus effect, all four primitives inherit it.

### P2-2 — Sheet on mobile: full-height void, no drag affordance, no scrollable body, no safe-area (adoption blockers)
**Files:** `styles/components.css:1304-1331` (`.sheet-panel { overflow: clip }`,
`.sheet-panel-end { block-size: 100% }`, `.sheet-panel-bottom` no inset), `overlays/Sheet.tsx`.
**Evidence (live @390, library filter sheet):** panel 390×844 full-bleed while content ends at
y=273 — **571px empty void (content fills 32%)**; `grabbers: []` (no drag handle anywhere);
**zero scrollable descendants** (`contentScrollers: []`) + panel `overflow: clip` → any
consumer whose content exceeds 100% of the viewport is silently clipped with no way to scroll
(latent today only because the single consumer fits); `.sheet-panel-bottom` carries no
`env(safe-area-inset-bottom)` padding (contrast: `.toast-stack` does — notifications.css:429).
**Fix sketch:** (a) at ≤640 auto-switch side sheets to a `bottom` presentation or add a
`size: 'fit' | 'full'` prop; (b) add `.sheet-body { overflow-y: auto; min-block-size: 0 }`
slot semantics like `.modal-body`; (c) optional drag-to-dismiss grabber (the Toast already
ships pointer-capture swipe logic to copy); (d) `padding-block-end: env(safe-area-inset-bottom)`
on the bottom variant.

### P2-3 — Four form surfaces ship errors with no ARIA wiring (FormField migration unfinished)
**Files:** `pages/competitions/CompetitionsPages.tsx:611,616,628` (+ enter modal 729-739),
`pages/community/CommunityPages.tsx:500,515,520,670` (announcement + event),
`pages/teacher/ExamAuthorPages.tsx:1005-1030` (local `Field` — role=alert but no
`aria-describedby` injection).
**Evidence (live):** competitions create after empty submit — العنوان/الوصف/الموعد النهائي all
`aria-invalid: null, described: null` while visible errors «العنوان قصير جدّاً» render;
announcement composer identical (all 4 controls unwired). The platform `FormField`
(primitives/Form.tsx:207-258) exists precisely for this contract (A9 P2-4 / wave 21-b) and is
proven in the grade modal + curriculum builders — these are the remaining hand-rolled copies.
SR users get one role=alert announcement (where present) but nothing on re-focus.
**Fix sketch:** replace the local field markup with `<FormField label error>` (or port the
describedby injection into ExamAuthorPages' `Field`); competitions/community are direct
drop-ins (~6 sites).

### P2-4 — CommandPalette matching: FE quick-actions miss the Arabic normalization the BE already has; multiword fails everywhere
**Files:** `components/layout/GlobalSearch.tsx:544` (`all.filter((a) => a.label.includes(q))`),
backend `http/routes/search.routes.ts` (normalizeArabicSearch + `ال` tolerance — good),
`pages/colleges/filter-colleges.ts` (a frontend normalizer already exists, unused here).
**Evidence (live, teacher):** «امتحان» → empty «لم نعثر على أوامر تطابق…» (synonym of
«الاختبارات» — acceptable), **«الاختبارات بنك» (word order) → empty, «امتحنات» (typo) →
empty, «درجات الطالب» (multiword) → 0 rows**; positives: «هند»/«برمج»/«بنك»/«واجب»/«بحث»
substring + subtitle matches work, «SE» hits course codes (SEC301/SE301). Realistic teacher
queries fail on word order; the FE filter would also miss hamza/ة/ى variants the BE folds.
**Fix sketch:** reuse the colleges-page normalizer (extract to lib) in the quick-action
filter; for multiword, score by word-set intersection (each query word must `includes`-match
some token of the label) — both FE-only, no schema work (pg_trgm fuzzy stays the documented
backend workstream).

### P2-5 — Validation timing is inconsistent across the app (onSubmit-only vs onBlur)
**Files:** `pages/AuthPage.tsx:98`, `RegisterPage.tsx:88-93`, `CompetitionsPages.tsx:570,688`,
`CommunityPages.tsx:416,622` (RHF default mode = onSubmit) vs `pages/student/ProfilePage.tsx`
(hand-rolled blur validation).
**Evidence (live):** login — type `not-an-email`, blur → no error (`invalid: "false"`,
nothing visible); profile — blur → immediate «أدخل رابطاً كاملاً يبدأ بـ https://»». Both are
defensible policies, but they differ per surface, and the RHF forms never pre-validate a
field the user has already left (error only appears after a failed submit — measured login
focus-then-submit flow: focus jumps to first invalid ✅).
**Fix sketch:** one ruling + one line per form: `useForm({ mode: 'onBlur' })` on the RHF
forms (keeps submit-time re-check), or document onSubmit-only as the platform policy and
drop the profile blur. Either way, make it uniform.

### P2-6 — CollegesPopover (landing) bypasses the overlay platform with a native `<dialog>`
**Files:** `components/CollegesPopover.tsx` (native `showModal`), vs `overlays/Popover.tsx`
(zero consumers).
**Evidence (live):** dialog opens in top layer, Esc + backdrop close, focus to close button —
but **`bodyOverflow: visible`, `bodyCls: ""`** (no scroll lock; the page behind scrolls while
the "modal-ish" college browser is open) and it never registers in `overlayStack` (Esc
coordination / ⌘K guard blind to it). The platform Popover/Modal both solve this.
**Fix sketch:** either migrate CollegesPopover onto Modal (it already behaves like one) or add
the ref-counted scrollLock to the native dialog's open/close. Low urgency (landing page, no
stacked overlays there) but it is the one overlay-shaped surface outside the elevation
language.

### P3-1 — Lightbox + Popover are zero-consumer; Lightbox's API cannot host a gallery yet
**Evidence:** rg across src — no imports outside overlays/ + tests (Lightbox.test.tsx /
Popover.test.tsx keep them contract-pinned). Lightbox renders `children` + close button only:
no zoom, no prev/next, no RTL arrows, no loading. Before the first real consumer (gallery,
competition media), it needs a media-aware extension. Keep + document, or extend on first
adoption.

### P3-2 — Toast action buttons exist but no call site uses them
**Evidence:** `lib/toast.ts` `action?: ToastAction` + full CSS (`.toast-action`, 44px touch
target) — rg of all 12 `toast.*` call sites: zero pass an action. Natural candidates: like/RSVP
optimistic rollback «تراجع», notification toasts «عرض».

### P3-3 — Three modal forms have no `<form>` element → no Enter-to-submit
**Files:** CoursesPage.tsx:421-435 (submission), TeacherPages.tsx:1082-1096 (grade),
ResearchPage.tsx:455-473 (upload) — buttons are `type="button"` with onClick handlers.
(Competitions/community modals *do* use `<form onSubmit>` ✅.)
**Fix sketch:** wrap in `<form onSubmit={onSubmit}>` + `type="submit"` — also restores
browser-native Enter semantics and implicit submission validation.

### P3-4 — Error-copy nits (wording quality)
Login password error is the bare «مطلوب» (vs profile's exemplary actionable copy); register
password error «8 أحرف على الأقل» duplicates its own label verbatim; exam builder renders
«اختر المقرّر الذي يُخصَّص له الاختبار.» **twice** (scope + offering fields, measured).
**Fix sketch:** «أدخل كلمة المرور» / drop the duplicated rule where the label already states
it / suppress the scope error when the offering error carries the same message.

### P3-5 — No recents in CommandPalette; no typeahead in Dropdown
Both are 9-bar amenities for high-frequency surfaces. Recents: persist last N `run()` ids in
the ui store, render a «الأخيرة» section above quick actions. Typeahead: optional — arrow
navigation already covers the 3-item menus in use.

### P3-6 — Research upload's file picker is a labeled mock
`ResearchPage.tsx:433-447` — clicking sets a hardcoded filename, copy says «محاكاة للعرض»,
submit would produce `example.invalid/…`. Honest labeling, but it is a product gap on a
student-facing form (backend upload exists for papers per the /document/ viewer).

### P3-7 — «تثبيت» checkbox: duplicate label association + 12px font
`CommunityPages.tsx:540-546` — two `<label htmlFor={pinnedId}>` elements (the field label
«تثبيت» and the wrapping label) produce a concatenated accessible name; the checkbox's
computed font-size is 12px (harmless for zoom — checkbox box size is what matters — but the
double label should collapse to one).

### P3-8 — Stale zero-consumer inventory comments
`overlays/index.ts:9-16` still lists Sheet + CommandPalette as consumer-less (Sheet has the
library filter since 23-a; CommandPalette has AppShell since 21-a); `primitives/index.tsx:11-17`
says Button/Input/FormField have "no app consumers yet" (RHF forms use Button/Input; FormField
has the grade modal + curriculum builders). Update the comments so the next wave trusts them.

---

## 4. §Corrections to the prior interrupted run's data
- **DISPROVEN — "backdrop click does not close the Modal at 390"** (prior `p1b-scrolllock.json:
  backdrop390.mounted: true / gone: false`). V1 re-ran with elementFromPoint forensics: at
  (8,400) and (190,800) the top element is `.modal-overlay` (true backdrop, outside the card
  x16..374) and **both clicks close the modal immediately** (count 0, scroll lock released).
  The prior probe's click point (likely the 6px right strip inside the card, or a point
  covered by `.modal-body`) was invalid. Same for its Sheet "backdrop doesn't close" claim —
  at 390 the `end` panel covers 100% of the overlay width (`at375 = sheet-panel`, `at385 =
  null`), so **no backdrop exists to click**; dismissal there is Esc/X only (both verified
  working).
- Prior dropdown @390 "focus lands on «الوضع الفاتح» (2nd item)" — not reproduced; V3 measures
  first-item focus («ملفي الشخصي»). Prior reading was a state artifact (theme label differs
  per resolved theme).
- All other load-bearing prior claims re-verified and **confirmed**: scroll-lock preservation,
  reopen-mid-exit, Esc one-layer (stacked authoring + confirm), z-promotion 410/415/420,
  toast timings/RM/swipe, tooltip intent/clamp/Esc, palette aria + keyboard journey + RTL
  Home, submission-modal unguarded Esc, authoring guard stack.

## 5. Verified-good (do-not-regress)
overlayStack Esc arbitration (one press = one layer, consumed even when Esc-dismiss disabled);
ref-counted scrollLock surviving stacked layers with scroll position preserved; delayed-unmount
exit animations on every primitive incl. direction-aware Sheet keyframes; interruptible
entrances (reopen mid-exit ×3 viewports); Dropdown full menu keyboard grammar + trigger aria
sync + Tab-dismiss-with-focus-return; anchored-position two-phase measurement + rAF refine
(4-A2 fix alive); Tooltip hover-intent + describedby merge + passive stack posture; toast
pause-on-hover/focus + swipe + RM + bottom-nav clearance + error-manual-dismiss;
CommandPalette combobox pattern + live count + content-height card; useDiscardGuard (11 sites,
beforeunload included, `.btn.danger` ink, focus on the safe action); FormField association
contract; 16px input floor incl. the two resolved hand-offs; ToggleSwitch composited RTL
thumb travel; optional-fields-marked required-field convention; honest pending/done state
machines across sampled forms.

## 6. Ordered fix plan (overlay platform + forms to 9+)
1. **P1-1** — useDiscardGuard on submission + upload modals (FE-only, ~½ day incl. tests).
2. **P2-3** — FormField migration: competitions create/enter, community announcement/event,
   ExamAuthorPages Field describedby (FE-only, ~1 day; update the 4 affected unit tests).
3. **P2-1** — useFocusTrap initial-focus policy (first control → else card; one hook change).
4. **P2-2** — Sheet mobile package (fit-size/bottom-switch + .sheet-body scroll + safe-area;
   grabber optional) — also unblocks adoption by the filters/detail panels named in the
   elevation contract.
5. **P2-5** — pick the validation-timing ruling; `mode: 'onBlur'` one-liner ×6 RHF forms.
6. **P2-4** — shared Arabic normalizer + word-set matching in the palette quick-actions.
7. P3-3 `<form>` wrappers; P3-4 copy pass; P3-8 comment refresh (ride any wave).

**Environment notes:** repo-root playwright 1.60 cannot launch (chromium-1223 missing) — used
global 1.63 (as A6-A9); seeded tokens expire ~15 min (page-load refresh works); seed has **0
feature flags** → OwnerSystemPage renders no ToggleSwitch (verified the switch live inside
the exam template builder instead); seed has 0 pending submissions (grading modal audited by
code + unit tests, same hand-off A7 filed); the owner-state settings list is also empty.
**Cross-refs (filed, not duplicated):** A9 P1-1 NotificationPanel error branch; A9 skeleton
grammar (States); A7 P2 grade-modal «تقييم التالي» + no-Enter; A6 exam-taker findings.
