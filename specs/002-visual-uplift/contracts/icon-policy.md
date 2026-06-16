# Contract: Icon Policy

**Date**: 2026-06-02
**Owner**: `scripts/check-icons.sh` + grep allowlist

Every icon in Madrak chrome and components is a Lucide glyph. This
contract documents the rule, the allowlist for legitimate exceptions,
and the canonical sizing.

## Rule

Lucide-only across:
- All UI chrome (header, sidebar, topbar, footer, modals, drawers, toasts)
- All component primitives (Button leadingIcon, Card icon, etc.)
- All page-level decoration in `frontend/src/pages/**`

Permitted alternatives:
- **User-supplied content** that legitimately includes emoji
  (notification body text, message body, user-typed comments).
- The brand mark (`<span class="sidebar-brand-mark">م</span>` — Arabic
  letter, not an icon).
- The `LibyaFlag` SVG component (national symbol; deliberate).

## Allowlist (current)

Listed in `scripts/check-icons.sh`. Patterns where emoji or non-Lucide
SVG are allowed:

```
frontend/src/components/EmojiIcon.tsx          # the primitive itself
frontend/src/components/LibyaFlag.tsx          # national flag SVG
frontend/src/lib/notifications/                # user-supplied content
backend/                                       # not user-facing
```

Any new entry to the allowlist requires explicit justification in the
PR description.

## Canonical Sizes

| Use                          | Size  |
|------------------------------|-------|
| Inline with body text        | `14px` |
| Buttons (sm)                 | `14px` |
| Buttons (md)                 | `16px` |
| Buttons (lg)                 | `18px` |
| Card title                   | `14px` |
| KPI tile                     | `20px` |
| Sidebar nav-item             | `17px` (current convention) |
| Topbar action                | `18px` |
| Hero / marketing decoration  | `24px` |

Per-instance overrides require justification. Stroke weight is
consistent (Lucide default 2 px).

## Enforcement

`scripts/check-icons.sh`:
1. Greps `frontend/src/**/*.{ts,tsx}` for emoji presentation Unicode
   ranges (U+1F300–U+1FAFF and surrounding blocks).
2. Greps for `<svg` literals outside the allowlist.
3. Fails CI if any non-allowlisted match is found.

The script mirrors `scripts/check-motion-tokens.sh` from `001-*` —
deterministic, fast, no install.

## Migration Pattern

To replace an emoji with a Lucide icon:

```tsx
// before
<span aria-hidden>📚</span>

// after
import { BookOpen } from 'lucide-react';
import { Icon } from '../components/Icon';
<Icon icon={BookOpen} size={16} aria-hidden="true" />
```

The `Icon` component wraps Lucide for size + className discipline. Use
it everywhere — never reach for `<BookOpen size={16} />` directly.

## Versioning

This contract is **v1.0.0**.

- Adding a new size to the canonical scale: MINOR.
- Removing a size: MAJOR.
- Adding to the allowlist: MINOR.
