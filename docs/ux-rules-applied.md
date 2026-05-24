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
