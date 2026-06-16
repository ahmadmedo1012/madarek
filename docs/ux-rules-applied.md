# UX rules applied — lineage from `ui-ux-pro-max-skill`

This polish pass adopts specific rules from the
[ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)
toolkit. The toolkit is a **CLI-driven database of UX best practices** queried
via Python (`search.py`), not a component library. We cherry-picked rules that
fit the platform and applied them manually.

## Rules adopted

| Rule | Source category | Applied where |
|---|---|---|
| Debounced fetch + dropdown autocomplete (don't reload page) | Search › Autocomplete | `GlobalSearch` component (300ms debounce) |
| "No results" → suggestions, never blank | Search › No Results | `GlobalSearch` empty state with tip pills |
| Loading shimmer instead of spinner | Feedback › Empty States (extension) | `GlobalSearch` 3-line skeleton while fetching |
| Predictable back navigation | Navigation › Back Button | `auth-back-home` link on `/auth`, brand-mark click navigates home |
| Active state highlight in nav | Navigation › Active State | Already in place; verified in nav |
| Keyboard navigation for all interactive elements | Accessibility › Keyboard Navigation | `GlobalSearch` ↑/↓/Enter/Esc + `/` shortcut |
| Touch target ≥ 36-44px on mobile | Touch › Touch Target Size | `auth-back-home` `min-height: 36px`; demo buttons full width |
| 8px gap minimum between adjacent touch targets | Touch › Touch Spacing | search-row padding 10px, demo grid gap-2 |
| Hover feedback on all clickable elements | Interaction › Hover States | search-row `:hover { background }`, brand-header cursor:pointer |
| Form submit feedback (loading → success/error) | Forms › Submit Feedback | Already in place via TanStack Query mutations |
| Error recovery path | Feedback › Error Recovery | Search empty state offers tip pills; auth-error has Retry semantics |
| Sticky nav doesn't obscure content | Navigation › Sticky Navigation | exam-bar (`position: sticky; top: 0; z-index: 10`) with proper margin |

## Not adopted (intentionally)

- **Heading hierarchy / breadcrumbs**: platform is mostly 2-level deep —
  breadcrumbs would be visual noise. Page titles + back links suffice.
- **Lazy loading images**: not relevant — we don't have image-heavy pages.
  `pdfjs-dist` is already lazy-loaded on the document viewer route.
- **Deep linking with query params for state**: would over-complicate the
  search dropdown; the dropdown itself is ephemeral by design.

## Verification of adoption

Run the toolkit locally to re-derive the rules:

```bash
git clone https://github.com/nextlevelbuilder/ui-ux-pro-max-skill.git /tmp/uxkit
cd /tmp/uxkit
python3 src/ui-ux-pro-max/scripts/search.py "live search instant results" --domain ux
python3 src/ui-ux-pro-max/scripts/search.py "login signup back navigation" --domain ux
python3 src/ui-ux-pro-max/scripts/search.py "empty state loading skeleton" --domain ux
```

Each rule above is traceable to the corresponding toolkit query.


## Refinement pass (commit after `83bae4c`)

A second wave of rules adopted in `frontend/src/styles/refinement.css`,
loaded after `components.css` so it overrides without rewriting any
existing styles. Every rule below is traceable to a toolkit query.

| Rule | Toolkit category | Applied in `refinement.css` |
|---|---|---|
| Buttons ≥ 40px tall on mobile | Touch › Touch Friendly | `.btn` height 40 / `.btn.sm` 36 / `.btn.lg` 48 below 600px |
| 8px gap minimum between adjacent touch targets | Touch › Touch Spacing | `.card-actions { gap: var(--sp-2) }`, `.tabs { wrap }` |
| Body text ≥ 15px on mobile | Responsive › Readable Font Size | `body { font-size: 15px }` below 600px |
| Tables: horizontal scroll on mobile | Responsive › Table Handling | `.card > table` becomes overflow-x:auto with min-width:560px |
| Mobile-first stack for grids | Responsive › Mobile First | `.grid-2 / .grid-3 / .grid-4 → 1fr` below 720px |
| Page header stacks on mobile | Layout › Page Header | `flex-direction: column` below 720px |
| Reduced-motion respect | Accessibility › Animations | `@media (prefers-reduced-motion: reduce)` block |
| Visible focus ring | Accessibility › Keyboard Nav | `:focus-visible { outline: 2px var(--accent) }` global |
| Hover states on all interactive elements | Interaction › Hover States | `.btn:active { translateY(1px) }`, `.icon-btn:active { scale(0.94) }` |
| Reduced-motion respect | Accessibility › Animations | `@media (prefers-reduced-motion: reduce)` block |
| Charts never overflow card | Responsive › Table Handling (extension) | `.card canvas { max-width: 100%; max-height: 240px (mobile) }` |
| Modular type scale | Typography › Font Size Scale | Tokens already aligned to 11/12/13/14/15/17/20/24/30 |
| Auth brand pane hidden on small mobile | Responsive › Mobile First | `.auth-brand { display: none }` below 600px |

Build cost: **+1.3 KB gz** total (95→101 KB gzipped).
No JS changes for the refinement layer — pure CSS overlay.


## Evolution pass (commit after `bb6c061`)

Premium polish layer — `frontend/src/styles/evolution.css`, loaded
last after refinement. Inspired by Linear, Vercel, Raycast, Stripe
Dashboard, Notion. Single motion language, layered surfaces, refined
typography.

### What changed

**Motion system (single easing across the platform)**
- `--ease-expo: cubic-bezier(0.16, 1, 0.3, 1)` — Linear/Vercel signature
- `--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)` for accents
- `--t-page: 360ms` for page entrance
- `--t-hover: 140ms` for hovers
- `--t-press: 80ms` for button feedback
- Page enter: `opacity 0→1, translateY(8px)→0` over 360ms
- Card hover-lift: `translateY(-1px)` + `shadow-md`
- Dropdown entrance: scale + opacity from 0.98 over 140ms
- Modal entrance: scale 0.96→1 over 200ms

**Layered surfaces**
- New `--surface-overlay` token for floating panels (search dropdown,
  user menu) with frosted-glass backdrop
- `--inner-highlight` (1px white at 4% alpha at top) gives cards
  Linear/Apple depth signal in dark mode
- `--shadow-glow-blue` for primary-button hover (subtle accent halo)

**Typography refinement**
- `font-feature-settings: "ss01", "kern", "liga"` (IBM Plex
  stylistic alternates)
- `font-variant-numeric: tabular-nums` on all numeric chrome
  (metrics, leaderboard, stats, kbd hints)
- `letter-spacing: -0.018em` on display sizes (h1–h4, page-title,
  hero text) for tighter feel
- Page title: very subtle text gradient (text → text-muted) for depth
- AI tag: gradient fill (accent → purple) for premium feel

**Sidebar nav: Linear-style active bar**
- 3px-wide accent bar slides in from inline-start when item activates
- 220ms ease-expo transform — feels intentional, not flashy

**Topbar scroll shadow**
- Topbar starts borderless
- AppShell tracks `.content` scrollTop via rAF-throttled listener
- `.topbar.scrolled` adds 1px border-bottom + tiny shadow
- Resets on route change so each page starts clean

**Theme switch animation**
- Surfaces and key components transition `background-color`,
  `border-color`, `color`, `box-shadow` over 240ms ease-expo
- Hover transitions stay snappy at 140ms (override)

**Skeleton + scrollbar**
- Shimmer slowed to 1.8s ease-in-out (was 1.4s linear) — calmer
- Scrollbar 8px, thumb is `border-strong`, hover lifts to `text-subtle`

**Accessibility / motion safety**
- `prefers-reduced-motion`: disables backdrop-filter (avoids stutter
  on browsers that otherwise reduce motion but keep blur)
- `:focus-visible`: 2px solid accent + 2px offset, slightly more
  offset on buttons (3px) for tactile feedback

### Cost

| | Before | After | Δ |
|---|---|---|---|
| CSS gz | 16.43 KB | **17.70 KB** | +1.27 KB |
| JS gz | 132.43 KB | **132.62 KB** | +0.19 KB (scroll listener) |
| New files | — | `evolution.css` | 1 |
| Modified | — | `main.tsx`, `AppShell.tsx`, `Topbar.tsx` | 3 |

### Lineage

- Active-bar nav indicator pattern → Linear/Vercel
- Frosted-glass dropdown surface → Raycast/macOS
- Page enter ease-expo → Linear, Vercel, Stripe
- Card inner-highlight 1px top → Apple, modern macOS apps
- Tabular numerals on metrics → Stripe Dashboard
- Slow shimmer (1.8s) → Notion / Linear
- Topbar scroll shadow → GitHub, Linear, Vercel dashboards
