# Madarek — Comprehensive Design Polish Plan

**Goal:** Lift every page, every primitive, every screen size to a Notion-grade polish — calm, rich, restrained motion that makes the platform feel alive without ever shouting.

**Method:** CSS-led polish layers (`polish-v14.css`, etc.) on top of existing primitives. Touch the React tree only where structural changes matter (hero photo, filters animation). No regressions to existing functionality.

**Phasing:** Each phase ships independently and can be deployed without waiting for the next. Each phase has a single commit.

---

## Phase 0 — restore + foundation (this commit)

- Restore the hero cursor spotlight that polish-v12 shadowed. The orbs added there duplicated what `landing.css` already had; remove the duplicate `.landing-hero::before/::after` rules so the v7 cursor radial wins.
- Drop `main_photo.png` into `frontend/public/` and integrate it as a hero side-panel illustration with a parallax + reveal — the campus shot anchors the brand.
- Add `polish-v14.css` covering the most-visible surfaces: sidebar collapse easing, dropdown spring-pop, chart fade-in tightening, bottom-nav active dot, table row hover lift, focus-visible accent ring tuning.

## Phase 1 — primitives polish

- **Card**: hover gradient border (subtle accent fade), elevation token system, press scale-down, focus ring.
- **Button**: ripple-on-press, primary gets ambient gradient sheen, ghost gains accent border on hover.
- **MetricCard**: value count-up on first paint, accent stripe on the leading edge, hover ring.
- **Badge / Pill**: spring-bounce on toggle, soft glow on `.on`.
- **Input / Select**: floating label, focus ring with accent halo, validation state animation.
- **Tabs**: animated underline that slides between options.
- **Tooltip**: spring-up with arrow.
- **Skeleton**: directional shimmer (LTR vs RTL aware), gentler color stops.

## Phase 2 — layout shell

- **Sidebar**: smoother collapse easing, group section spacers with a hairline, active item gets accent rail + 4px dot, nav-icon micro-rotate on press.
- **Topbar**: glass background that gains shadow when page scrolls, search input hover state, user menu spring-pop.
- **Bottom nav (mobile)**: active item gets a 3px accent dot under the icon, scale-up on tap, safe-area respected.
- **Drawer**: backdrop blur ramp, RTL-aware slide easing.
- **Mobile sheet**: bottom-anchored sheet pattern for filters/actions.

## Phase 3 — pages

### Landing
- Hero: photo on the start side, headline on the other; magnetic spotlight following cursor across both panels (restored).
- Word-by-word title reveal (already exists, tighten timing).
- Stats counter: animate on viewport enter.
- Mockup: tilt + parallax on scroll.
- Sections: stripe coloring (peach / lavender / mint / sky) for visual rhythm.
- Footer: ministry strip subtle gradient.

### Dashboards
- **Student**: welcome card gets photo overlay tint (low opacity), KPI stagger, agenda items slide in, doughnut center number transitions when data changes.
- **Teacher**: feed items slide in from the start side, KPI delta arrows pulse.
- **Admin**: chart line-trace animation, faculty cards lift on hover.
- **Owner**: realtime tile dots pulse with heartbeat, alert tile glow when count > 0.
- **Quality**: heatmap cells transition between shades, badges count-up.

### Lists / tables / detail pages
- Table rows: zebra-on-hover, action button reveal on hover (right side).
- List rows: leading dot animates between states.
- Detail pages: section headers get a leading colored bar that draws in.

## Phase 4 — charts

- Custom Chart.js theme: rounded line caps, gradient line fill (accent fade), tooltip with brand styling.
- Doughnut: stroke-dash animation on first render.
- Bar charts: bars grow up from baseline with stagger.
- Line charts: line trace animation on first render, point markers fade in after.

## Phase 5 — overlays

- **Notification dropdown**: items stagger in, unread dot pulses, mark-all-read sweep animation.
- **Global search**: results slide in, keyboard nav highlight glides.
- **User menu**: spring-pop, arrow points to trigger.
- **Modals**: backdrop blur ramp, content scale-fade entrance.
- **Toast**: slide-up from bottom, auto-dismiss bar, swipe-to-dismiss on mobile.

## Phase 6 — empty / loading / error states

- Empty states: icon idle wiggle every 6s.
- Loading skeletons: shape-matching everywhere (already done dashboards).
- Error states: shake on retry button click.

## Phase 7 — accessibility & motion

- `prefers-reduced-motion`: every animation honored.
- Focus-visible: every interactive surface has a clear accent ring.
- High contrast pass: ensure 4.5:1 on body text in both themes.
- Keyboard nav: skip-to-content link, focus trap on modals, escape closes overlays.

## Phase 8 — mobile-specific

- Bottom nav clearance audit (already done).
- Tap targets ≥44px (already done).
- Sheet patterns for filter/action toolbars on phones.
- Thumb-reachable primary CTAs at the bottom.
- Wide tables → collapse to cards (already done).

## Phase 9 — polish micro-pass

- Selection color matches brand.
- Cursor pointer on every interactive element (audit).
- Hover states on every clickable surface (audit).
- Sound design hooks ready (out of scope, but tokens reserved).

---

## Token system additions (polish-v14)

- `--elevation-1` … `--elevation-5` (6-step shadow scale).
- `--spring-bounce`, `--spring-soft` motion easings.
- `--gradient-accent`, `--gradient-warm`, `--gradient-cool` for backgrounds.
- `--ring-focus` standardized focus halo.
- `--blur-glass-1`, `--blur-glass-2` for backdrop layers.

## Execution rule

Every phase ships its own commit. CSS-only when possible. Verify build + visual smoke before push. Honor reduced motion. Test in both themes. Test at 320px / 768px / 1280px / 1920px.
