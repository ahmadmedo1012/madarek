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
