# Contract — Illustration System

**Phase**: 1 | **Branch**: `012-design-graphics-uplift`

## Surface

A bespoke SVG illustration family + a single React component (`<Illustration>`) that renders any registered scene with theme + RTL awareness. All scenes are inline TSX (no `<img src>`, no PNG/JPG), share a strict family rule set, and are consumed via the wrapper — never hand-written into pages.

---

## Family rules (binding for every scene)

| Rule | Value |
|------|-------|
| Vector format | inline SVG, returned from a TSX component |
| Stroke width | `1.5` device-independent units, `stroke-linecap="round"`, `stroke-linejoin="round"` |
| Palette | only `--ill-hue-1` … `--ill-hue-6`, `--ill-stroke`, `--ill-paper`, `--ill-shadow`. **No raw hex inside an SVG path or `fill`/`stroke` attribute.** |
| Perspective | front-facing OR 30° isometric. Mixing in one scene is forbidden. |
| Character archetype | optional. If present, must use the same head proportions, hand size and clothing palette across all scenes that include a character. |
| Motif library | re-use only registered motifs (book, screen, lamp, leaf, arrow, plant, page, badge, mug, headphones, paper-stack, chair). New motifs require a registry update. |
| Filesize | each scene ≤ 8 KB gzipped (validated by audit). |
| Rasterisation | forbidden. PNG/JPG only allowed for photographic content on marketing surfaces; products and product-empty-states use SVG. |
| Stroke under `prefers-contrast: more` | thickens to `2.0`; `--ill-shadow` becomes transparent (handled by token cascade). |

---

## Component API

```tsx
type IllustrationName =
  | 'homepage-hero'
  | 'error-404'
  | 'empty-notifs'
  | 'empty-search'
  | 'milestone-section'
  | 'onboarding-frame-1'
  | 'onboarding-frame-2'
  | 'onboarding-frame-3'
  | 'onboarding-role-intro'

interface IllustrationProps {
  name: IllustrationName
  /** required when name === 'onboarding-role-intro' */
  role?: 'STUDENT' | 'FACULTY' | 'DEPARTMENT_HEAD' | 'DEAN' | 'ADMIN' | 'QUALITY' | 'OWNER'
  /** when true, the SVG is hidden from the accessibility tree (aria-hidden); altKey must NOT be set */
  decorative?: boolean
  /** required when decorative !== true; passed to the i18n layer */
  altKey?: string
  className?: string
}

declare function Illustration(props: IllustrationProps): JSX.Element
```

### Component behaviour

1. Reads `document.documentElement.dataset.theme` (Light / Dark) at render time via the `useTheme()` hook. Theme changes do NOT cause the component to re-render — the SVG body uses CSS variables, so the cascade handles theme/contrast transitions automatically.
2. Reads `dir` from the document or via `useTranslation().i18n.dir()`. RTL-sensitive scenes load their RTL composition; symmetric scenes ignore.
3. Lazy-loads non-critical scenes via `React.lazy()`. Only `homepage-hero` is eager (it is the first paint).
4. If `decorative === true` → emits `aria-hidden="true"` and no `role="img"`.
5. If `decorative !== true` → emits `role="img"` and `aria-label={t(altKey)}`.
6. Falls back to the in-family icon-and-copy state on chunk load failure (within-family fallback — never a broken-image icon).

---

## Scene registry (V1)

| Name | Critical? | LTR/RTL | Variants |
|------|-----------|---------|----------|
| `homepage-hero` | yes (eager) | composed (no mirror) | Light, Dark |
| `error-404` | no | composed | Light, Dark |
| `empty-notifs` | no | symmetric | Light, Dark |
| `empty-search` | no | composed (mirrors arrow direction) | Light, Dark |
| `milestone-section` | no | composed | Light, Dark |
| `onboarding-frame-1` | no | composed | Light, Dark |
| `onboarding-frame-2` | no | composed | Light, Dark |
| `onboarding-frame-3` | no | composed | Light, Dark |
| `onboarding-role-intro` | no | composed | Light, Dark, × 7 roles |

V2 follow-up surfaces (NOT in V1; documented in spec FR-010): `500`, `auth-locked`, `session-expired`, `no-courses`, `milestone-course-complete`, `success-after-submit`, `error-recoverable`. They MUST be added through the same registry, family rules, and audit.

---

## Audit gate

The `surface-inventory.spec.ts` Playwright audit fails CI if:
- An `<svg>` in the inventory is NOT served by `<Illustration>` AND has bespoke characters / paths (raw inline SVG that should have been a registered scene).
- A scene's gzipped size exceeds the 8 KB ceiling.
- A scene's SVG body contains a hex / rgb literal (must use the variables).
- An RTL composition is missing for a scene marked "composed" in the registry.

---

## Test surface

| Test | What it asserts |
|------|-----------------|
| `illustration.test.tsx: registry covers all 9 V1 names` | All listed names import without throwing. |
| `illustration.test.tsx: decorative=true emits aria-hidden` | Accessibility contract. |
| `illustration.test.tsx: altKey resolves via i18n when present` | `aria-label` matches `t(altKey)`. |
| `illustration.test.tsx: theme change does NOT re-render` | Mount once, change `data-theme`, assert no re-render via test renderer counter. |
| `illustration.test.tsx: missing chunk falls back within family` | Mocked `import` rejects → fallback rendered. |
| `surface-inventory.spec.ts: every scene ≤ 8 KB gz` | Audit asserts size budget. |
| `surface-inventory.spec.ts: no raw hex in scenes` | Static check via parser. |
