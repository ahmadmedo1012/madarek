# 4-A9 — Overlays & Primitives Platform Audit (Wave 19)

**Scope:** `components/overlays/*` (Modal, Sheet, Toast/ToastStack, Tooltip, Popover, Dropdown, Lightbox, NotificationPanel, CommandPalette + hooks), `components/primitives/*`, `components/charts/ChartFrame.tsx`, `components/pdf/*`, `components/curriculum/*`, `components/onboarding/*`, `lib/{scrollLock,overlayStack,toast}.ts`, `components/owner/{ToggleSwitch,ConfirmDialog}.tsx`.
**Method:** code-first audit + live Playwright probes (teacher + student, desktop 1440×900 + mobile 390×844) + VLM critique of 16 captured states (`/tmp/madarek-shots/a9-*.png`) with every VLM claim re-verified against DOM/CSS measurements (several VLM claims were disproven and dismissed — noted inline).
**Runtime:** FE :5173 · BE :4000 · logins student@/teacher@zu.edu.ly.

---

## Verdict

The overlay **platform layer is genuinely excellent** — overlayStack (one-Escape-one-layer with `stopImmediatePropagation`), ref-counted scrollLock (single body class, idempotent holders), two-phase anchored positioning with rAF-throttled repositioning, exit animations driven by `animationend` with token-duration safety nets, reduced-motion off-switches everywhere, and RTL-logical placement in the anchored layer. Live probes confirmed every platform promise: focus trap (12×Tab stayed inside), initial focus in modal, Esc one-layer-at-a-time (dirty-draft guard stacked exactly 2 layers), scroll-lock acquire/release symmetry, focus restore to the topbar trigger, RTL toast anchoring (hugs the LEFT/inline-end edge, clears the right-docked sidebar), pause-on-hover, dropdown arrow/Home/End/Tab semantics.

The two real problems sit at the **consumption edges**: (1) the PdfViewer's file fetch sends no Bearer token → **every research PDF 401s in the live app** (P0); (2) the premium primitives **Sheet / Popover / Lightbox / CommandPalette have zero app consumers** (self-documented in `overlays/index.ts:5-13`), so pages hand-roll their own surfaces and one latent RTL defect (Sheet entrance direction) ships unexercised.

## Scores (0–10)

| Component | Score | One-liner |
|---|---|---|
| lib/overlayStack.ts | 10 | Exact, SSR-safe, idempotent under StrictMode; the Escape coordination is best-in-class. |
| lib/scrollLock.ts | 10 | Single-writer, ref-counted, class-based so legacy inline writes can't clobber it. |
| Modal.tsx | 9 | Platform contract complete; initial focus lands on the close button in hand-rolled bodies (P3). |
| Toast.tsx + ToastStack | 9.5 | Pause-on-hover/focus with honest deadline math, swipe-dismiss, MAX_VISIBLE overflow closing oldest-first, correct aria-live per variant. |
| Dropdown.tsx | 9 | Full menu keyboard semantics; header outside `role=menu` (15-g P2-9); trigger aria synced unless owned. |
| NotificationPanel.tsx | 9 | Correct 'end' placement + flip + cap; measured live at (top:52, below topbar). |
| Tooltip.tsx | 8 | Hover-intent 300ms, instant focus show, clamped caret; caret aim drifts when clamped (P3); touch path unhandled (P3). |
| Popover.tsx | 7 | Correct engine, zero consumers; would render **under** a modal scrim (z 200 < 400) if opened from one (P2, latent). |
| Sheet.tsx | 6.5 | Zero consumers + entrance keyframes are LTR-hardcoded → in RTL the sheet enters from the wrong side while its exit correctly returns to its edge (P1, latent). |
| Lightbox.tsx | 6 | Zero consumers; no zoom/nav affordance contract at all — a bare dialog shell. |
| CommandPalette.tsx | 6 | Zero consumers and no exit animation (instant unmount, unlike Modal); superseded in spirit by the topbar GlobalSearch combobox. |
| primitives/Form.tsx (Button/Input) | 8.5 | Loading contract (spinner + visually-hidden label + aria-busy) is right; **zero consumers** — 30+ pages hand-write `className="btn"`. |
| primitives/States.tsx | 9 | Arabic-guarded error extraction, 403/404 branches, actionable empty default, shape-matched skeletons. |
| primitives/index.tsx | 9 | Tabs RTL arrows + roving tabindex; Pill aria-pressed; ProgressBar NaN edge (P3). |
| charts/ChartFrame.tsx | 9.5 | role=img + SR data table + summary — the right a11y shape for canvas charts. |
| pdf/PdfViewer.tsx | 5 | Toolbar/keyboard/search/error-state craft is strong, but the happy path is dead: 401 on every document (P0). |
| pdf/AnnotationsPanel.tsx | 9 | Role-gated composer, failed-save keeps draft, honest empty states, stable hex pen palette. |
| curriculum/* (5 files) | 9.5 | Best forms in the app: htmlFor wiring, onBlur validation, discard guard, delete-confirm with error-toast escape hatch. |
| onboarding/OnboardingFlow.tsx | 9 | Direction-aware slides, 3-beat stagger, RTL arrows, CTA refocus; frame change not announced to SR (P3). |
| onboarding/MilestoneScene.tsx | 9 | Queue-behind-onboarding gate + exit-window handoff are unusually considered. |
| owner/ToggleSwitch.tsx | 9 | role=switch + 44px target + label-row toggle; unique desc ids. |
| owner/ConfirmDialog.tsx | 9 | Async-confirm loading locks all dismiss paths. |

---

## P0 — blocks a core workflow

### P0-1 · Every research PDF 401s — PdfViewer sends no Bearer token
- **Where:** `frontend/src/components/pdf/PdfViewer.tsx:121-128` (getDocument `withCredentials: true`), same root cause for the download affordance `PdfViewer.tsx:582` (`<a href={src} download>`). Backend requires the header: `backend/src/http/middleware/auth.ts:10-15`, mounted at `backend/src/http/routes/files.routes.ts:12`.
- **What:** auth is **header-based** (Bearer access token from the auth store, `lib/api.ts:15-17`); `withCredentials` only forwards cookies, and no cookie carries the access token. pdf.js's own fetch therefore arrives unauthenticated → `401 Unauthorized` → the viewer can never load a document. The `<a download>` link navigates without the header too, so the toolbar Download button 401s as well.
- **Evidence:** live probe on `/document/sample.pdf` (student, from library → بحوث الطلاب): `FAILED_REQUESTS=["401 http://localhost:5173/api/v1/files/papers/sample.pdf"]`; DOM shows the ErrorState branch («تعذّر تحميل المستند»); screenshots `a9-pdf-viewer.png`, `a9-pdf-searchbar.png`. The annotations sidebar (axios, Bearer) loads fine beside it — proving it's the fetch path, not the route.
- **Impact:** the entire PDF reading experience (student library research tab, teacher «قراءة وكتابة ملاحظات») is broken with no workaround. 3 seeded documents, all unopenable.
- **Fix sketch:** pass the token to pdf.js: `getDocument({ url: src, httpHeaders: { Authorization: \`Bearer ${useAuthStore.getState().accessToken}\` }, … })`; for Download, fetch via `api` (authorized) → `URL.createObjectURL` → programmatic anchor, or issue a short-lived signed URL. Also fix the now-false comment «include auth cookies» at `PdfViewer.tsx:123`.

## P1 — major, latent-until-consumed

### P1-1 · Sheet entrance animation is LTR-hardcoded — in RTL the sheet enters from the wrong side
- **Where:** `frontend/src/styles/components.css:1270-1277` — `@keyframes madarek-sheet-slide-end { from { transform: translateX(8%) } }` / `…slide-start { translateX(-8%) }` (physical values), while the exits at `components.css:3337-3342` correctly use `translateX(calc(var(--motion-direction) * ±8%))`.
- **What:** under `dir="rtl"` (`--motion-direction: -1`, `tokens.css:271`) an `end` sheet docks at the **left** edge (`justify-content: flex-end`, components.css:1239 — correct), but enters from `+8%` (screen-center side) and settles leftward — i.e. it slides **out of the page interior** instead of arriving from its own edge. Entrance and exit are directionally mirrored wrongly (asymmetric feel).
- **Evidence:** code + computed CSS (no live consumer exists to screenshot — see P2-1; verified by keyframe math and the exit keyframes' own comment «Direction-aware — `end` docks inline-end (right in LTR, left in RTL)»).
- **Fix sketch:** multiply the entrance offsets by the same `calc(var(--motion-direction) * …)` used by the exits; pin with the existing Sheet unit tests + a headed RTL screenshot.

## P2 — noticeable problems / platform hazards

### P2-1 · Half the overlay platform has zero consumers (Sheet, Popover, Lightbox, CommandPalette, standalone Toast)
- **Where:** self-documented at `frontend/src/components/overlays/index.ts:5-13` («currently have no in-app consumers (rg-verified; only their unit tests)»); re-verified today: only `Modal` (9 pages), `Dropdown`/`Tooltip`/`NotificationPanel` (layout only) are consumed.
- **What:** the elevation language's premium surfaces are dead weight in the bundle path of every page while pages hand-roll equivalents: the topbar `GlobalSearch.tsx` is a bespoke combobox where the CommandPalette was «the designated future home of global search»; library/research images have no Lightbox path at all; no page uses a Sheet for filters/profile (the «student settings/profile sheet» in the audit method **does not exist** — Profile is a full page). Consequences: (a) untested-in-anger code (P1-1 proves the risk), (b) inconsistent overlay craft across pages, (c) bundle cost for unused components.
- **Evidence:** rg consumer census; `a9-library-research.png` (research cards link straight to the inline viewer; no lightbox affordance anywhere).
- **Fix sketch:** either adopt (Wave 21: Library/Lightbox for covers, a Sheet for Profile edit + course filters, CommandPalette behind ⌘K wrapping the existing search API) or split the primitives into a lazy `overlays-unused` chunk. Also give Lightbox a zoom/prev/next API before first consumer (currently a bare shell — no zoom controls, no RTL nav arrows).

### P2-2 · Anchored overlays would render *under* a modal scrim (z-ladder vs. nesting)
- **Where:** `frontend/src/styles/tokens.css:699-705` — `--z-dropdown:100 / --z-popover:200 / --z-tooltip:250` all sit below `--z-modal:400` and `--z-sheet:300`; Dropdown/Popover portal to `document.body` (`Dropdown.tsx:165-188`).
- **What:** any Dropdown/Popover opened from *inside* a Modal or Sheet (a select menu, a date picker, a help popover) paints behind the scrim and is invisible/click-blocked. No current consumer does this (dropdowns live in the topbar only), but the primitives are the documented way to build in-modal pickers — a platform trap.
- **Evidence:** z-token ladder + portal mount points (code); no live repro because no in-modal dropdown exists today.
- **Fix sketch:** when `overlayStack` contains a modal/sheet layer below the anchored one, promote the anchored panel (e.g. toggle a `data-over-modal` class that raises it above `--z-modal`), or render anchored layers into the topmost modal's overlay node instead of body. Keep Escape ranking as-is (already correct via overlayStack).

### P2-3 · Mobile nav drawer opens from the inline-end edge — opposite its trigger and the desktop sidebar
- **Where:** `frontend/src/styles/layout.css:216` (`inset-inline-end: 0`) + `:229` (`[dir="rtl"] .sidebar { transform: translateX(-100%) }`); trigger is the topbar burger at inline-start (`Topbar.tsx:93-101`). *(Sidebar is 4-A2's file — cross-listed here because the drawer is a registered overlay layer.)*
- **What:** in RTL the desktop sidebar docks **right** (inline-start); the mobile drawer docks **left** (inline-end), so the same navigation flips sides between breakpoints, and the drawer opens on the opposite side from the burger that summons it. VLM independently flagged it as P0; measured live: drawer rect `left:0, width:320` on 390px viewport while the trigger sits top-right.
- **Evidence:** `a9-mobile-sidebar-drawer.png`; probe log `mobile drawer state: {"rect":{"left":0,"width":320}}`.
- **Fix sketch:** dock the drawer at `inset-inline-start: 0` with mirrored translateX, matching the desktop sidebar's side and the burger's position (Material RTL drawer convention).

### P2-4 · Grade modal input not aria-wired to its validation error
- **Where:** `frontend/src/pages/teacher/TeacherPages.tsx:941-953` (input `grade-score`) + `:971-975` (error `<p role="alert">`); same pattern in `ResearchReviewPage.tsx:314-325`.
- **What:** when validation fails («أدخل درجة صحيحة.», «الدرجة يجب ألّا تتجاوز …») the input gets no `aria-invalid` and no `aria-describedby` pointing at the message; the alert is announced once but the field's error state is invisible to AT on re-focus. The curriculum `FormField` (`curriculum/AuthoringModal.tsx:94-109`) has the same gap (label ✓, `role=alert` ✓, association ✗) and `TimeInput` styles the invalid border without `aria-invalid` (`AuthoringModal.tsx:160-192`).
- **Evidence:** live probe `a9-teacher-grade-modal-error.png` + code.
- **Fix sketch:** thread `errorId` through FormField/inputs: `aria-invalid={!!error}` + `aria-describedby={errorId}` on the control, `id={errorId}` on the message. Do it once in `FormField`/`TimeInput` and once in the two hand-rolled modal forms.

## P3 — polish

1. **P3-1 · Modal initial focus lands on the close (X) button** — `useFocusTrap.ts:53-56` focuses the first focusable; in `AuthoringModal` and both review modals that is the header X (`AuthoringModal.tsx:62-64`, `TeacherPages.tsx:919`, `ResearchReviewPage.tsx:270`). Enter immediately after open closes the dialog (discard guard saves the draft, but focus should land on the first input or primary CTA — OnboardingFlow already does exactly this, `OnboardingFlow.tsx:126-133`). Fix: optional `initialFocusRef` prop on Modal/AuthoringModal.
2. **P3-2 · Onboarding frame changes are silent for screen readers** — `OnboardingFlow.tsx:226` DotStrip is `aria-hidden` (correct, decorative) but nothing announces the new frame: focus lands on the CTA whose label stays «التالي» across frames 1-3. Fix: focus the headline (`tabIndex={-1}`) or add a visually-hidden `aria-live="polite"` «الخطوة ٢ من ٤».
3. **P3-3 · Tooltip caret aim drifts under clamp** — `Tooltip.tsx:93` clamps `arrowX` to `[12, tw-12]`; measured live: anchor center 20px beyond bubble center after the 8px viewport clamp (tip `left:1328,w:102`, anchor cx 1399), so the caret lands ~20px off the anchor's center. Acceptable; tighten by shifting the bubble (not just clamping) when the anchor sits near the rail edge.
4. **P3-4 · Tooltip has no touch path** — `Tooltip.tsx:165-180` listens to mouse/focus only; the collapsed rail it serves is desktop-only today, but the primitive documents itself as the platform tooltip. Fix: `onPointerDown` toggle for `pointerType === 'touch'`.
5. **P3-5 · CommandPalette lacks the exit animation every other primitive has** — `CommandPalette.tsx:47` unmounts instantly (`if (!open) return null`), while Modal/Sheet/Lightbox/Dropdown/Popover/Toast all play token-driven exits via `useDelayedUnmount`. Fix: adopt the same `useDelayedUnmount('--motion-duration-medium')` + `data-closing` pattern.
6. **P3-6 · `Button`/`Input` primitives have zero consumers** — `primitives/index.tsx:11-14` documents it; pages hand-write `className="btn …"` ~everywhere (182 raw `title=""` native tooltips across 30 files vs the Tooltip primitive used once — Sidebar). Fix: adopt in Wave 21 page batches (mechanical swap) or accept and document as legacy.
7. **P3-7 · ProgressBar NaN edge** — `primitives/index.tsx:149` `Math.max(0, Math.min(100, value))` propagates NaN → `width:"NaN%"`, `aria-valuenow="NaN"`. Fix: `Number.isFinite(value) ? … : 0`.
8. **P3-8 · Skeleton containers inconsistent aria-busy** — `States.tsx:311,336,361` (CardSkeleton/PageSkeleton/DetailSkeleton) carry `aria-busy`+`aria-live`, but `KpiSkeleton`/`ListSkeleton`/`TableSkeleton` (`States.tsx:244-302`) don't. Fix: add the same attributes (cheap consistency win).
9. **P3-9 · Onboarding mobile CTA at far edge** — actions row keeps desktop layout on 390px; the single «التالي» sits at the inline-end (left) edge. VLM flagged one-handed reach. Fix: full-width or centered CTA under the 640px breakpoint (`.onboarding-flow-actions` media query already exists at `components.css:3608`).
10. **P3-10 · Illustration framing differs across onboarding frames** — frame 1's scene reads framed/contained, frames 2-3 float free (VLM, consistent across images). Fix: unify on the floating treatment in `lib/illustrations` (wave-8-c scenes).
11. **P3-11 · Notification timestamps mix formats** — `notif-item-time` (relative) vs date-stamped items in the same list (VLM P3, plausible from seed). Verify and normalize to `timeAgoAr` (already the AnnotationsPanel convention).

### VLM claims verified-and-dismissed (kept here so later waves don't re-chase them)
- «Toast anchored wrong side for RTL» — **false**: `inset-inline-end` = left edge in RTL, which *is* the LTR-bottom-right mirror; measured `left:20` clearing the right-docked sidebar (`notifications.css:327-340`).
- «Search placeholder left-aligned» — **false**: input inherits `dir=rtl`, computed `text-align: start`, icon renders inline-start (right). Measured live.
- «PDF next/prev chevrons backwards for RTL» — **false**: `ChevronRight`=prev at inline-start, `ChevronLeft`=next at inline-end is the deliberate Arabic page-turn convention, consistent app-wide (`PdfViewer.tsx:384-390` and `:537-557`; matches OnboardingFlow's ArrowLeft-advances).
- «Skip link fails contrast» — **false**: `--text-muted #6E6C65` on surface = 5.26:1 (computed).
- «Stacked confirm scrim hides parent modal» — the parent stays visible behind a second scrim (two z-400 overlays, later DOM wins); standard, kept as-is.

## Top-10 quick wins (ordered by impact/effort)

1. **P0-1** — Bearer `httpHeaders` for pdf.js + authorized download (unblocks the whole research library). `PdfViewer.tsx:121-128,582`.
2. **P1-1** — one-line ×2: multiply Sheet entrance keyframes by `var(--motion-direction)` (`components.css:1270-1277`).
3. **P2-4** — wire `aria-invalid`/`aria-describedby` in `FormField`+`TimeInput` and the two grade modals.
4. **P3-1** — `initialFocus` prop on Modal; point AuthoringModal + grade modals at the first input.
5. **P2-3** — flip the mobile drawer to `inset-inline-start` (coordinate with 4-A2/4-A10 — same file).
6. **P3-2** — announce onboarding step changes (`aria-live` step counter).
7. **P3-5** — give CommandPalette the shared exit animation (copy Modal's `useDelayedUnmount` wiring).
8. **P3-7 + P3-8** — ProgressBar NaN guard + aria-busy on the three skeleton families (10 lines total).
9. **P2-2** — decide the anchored-over-modal z policy (data-attr promotion) before the first in-modal Dropdown consumer lands.
10. **P2-1** — Wave-21 adoption plan: Lightbox in Library, Sheet for profile-edit/filters, CommandPalette behind ⌘K (or lazy-chunk the unused primitives).

## Files to touch (fix waves)

- `frontend/src/components/pdf/PdfViewer.tsx` (P0-1)
- `frontend/src/styles/components.css` (P1-1, P3-5, P3-9)
- `frontend/src/components/overlays/Sheet.tsx` (P1-1 test pin), `CommandPalette.tsx` (P3-5), `Modal.tsx`/`useFocusTrap.ts` (P3-1), `Tooltip.tsx` (P3-3, P3-4)
- `frontend/src/components/curriculum/AuthoringModal.tsx` (P2-4, P3-1), `frontend/src/pages/teacher/TeacherPages.tsx` + `ResearchReviewPage.tsx` (P2-4)
- `frontend/src/components/onboarding/OnboardingFlow.tsx` (P3-2), `frontend/src/components/primitives/{States.tsx,index.tsx}` (P3-7, P3-8)
- `frontend/src/styles/layout.css` (P2-3 — **coordinate with 4-A2/4-A10, same file**)

**Counts: P0 ×1 · P1 ×1 · P2 ×4 · P3 ×11.**
